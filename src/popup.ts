import { scoreTeam } from "./score.js";

import type { FirebaseAuthRecord, FriendsResponse, FriendsResult, Team } from "./types.js";

const api = (globalThis.browser ?? globalThis.chrome)!;
type PopupElements = {
  refresh: HTMLButtonElement;
  total: HTMLElement;
  date: HTMLElement;
  players: HTMLElement;
  questions: HTMLElement;
  results: HTMLElement;
  status: HTMLElement;
};
const $ = <K extends keyof PopupElements>(id: K): PopupElements[K] =>
  document.getElementById(id) as PopupElements[K];
const format = (value: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
const excludedNames = new Set<string>();
let currentPayload: FriendsResponse | undefined;

// Runs only on explicit popup refresh, in the active site's isolated world.
// Neither the token nor the Firebase record leaves this function.
async function loadFriends(): Promise<FriendsResult> {
  const fail = (error: string): FriendsResult => ({ error });
  if (location.origin !== "https://krillion.io") return fail("Open a Krillion page first.");
  let db: IDBDatabase | undefined;
  try {
    db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("firebaseLocalStorageDb");
      // Firebase normally uses "Db"; also support the "DB" spelling. Never create a database.
      request.onupgradeneeded = () => { request.transaction?.abort(); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("missing"));
    }).catch(() => new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("firebaseLocalStorageDB");
      request.onupgradeneeded = () => { request.transaction?.abort(); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("Sign in to Krillion, then refresh."));
    }));
    const records = await new Promise<FirebaseAuthRecord[]>((resolve, reject) => {
      const tx = db!.transaction("firebaseLocalStorage", "readonly");
      const request = tx.objectStore("firebaseLocalStorage").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("Could not read Krillion sign-in."));
    });
    const users = records.filter(r => r.fbase_key?.startsWith("firebase:authUser:"));
    const user = users.find(r => r.value?.stsTokenManager?.accessToken)?.value;
    const token = user?.stsTokenManager?.accessToken;
    if (!token) return fail("Sign in to Krillion, then refresh.");
    const response = await fetch("https://krillion.io/api/friends", {
      redirect: "error",
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (response.status === 401 || response.status === 403) return fail("Open Krillion and sign in again, then refresh.");
    if (!response.ok) return fail("Krillion returned HTTP " + response.status + ". Try refreshing.");
    return { data: await response.json() as FriendsResponse };
  } catch {
    return fail("Could not load scores. Check your connection and Krillion sign-in, then refresh.");
  } finally { db?.close(); }
}

function render(team: Team): void {
  $("total").textContent = format(team.total);
  $("date").textContent = team.date ?? "";
  $("players").replaceChildren(...team.players.map(player => {
    const li = document.createElement("li");
    const label = document.createElement("label");
    if (!player.self) {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = "include-player-" + player.id;
      checkbox.checked = player.included;
      checkbox.addEventListener("change", () => {
        if (!currentPayload) return;
        if (checkbox.checked) excludedNames.delete(player.name);
        else excludedNames.add(player.name);
        render(scoreTeam(currentPayload, excludedNames));
        document.getElementById(checkbox.id)?.focus();
      });
      label.append(checkbox);
    }
    const name = document.createElement("span");
    name.textContent = player.name + (player.self ? " (you)" : "");
    label.append(name);
    const points = document.createElement("strong");
    points.textContent = player.included ? format(player.contribution) : "—";
    li.classList.toggle("excluded", !player.included);
    li.append(label, points);
    return li;
  }));
  $("questions").replaceChildren(...team.questions.map(question => {
    const li = document.createElement("li");
    const title = document.createElement("div");
    title.textContent = question.prompt + " — " + format(question.score);
    li.append(title);
    for (const winner of question.winners) {
      const line = document.createElement("small");
      line.textContent = winner.name + ": " + (winner.answer ?? "No answer") + " (+" + format(question.score / question.winners.length) + ")";
      li.append(line);
    }
    return li;
  }));
}

async function refresh() {
  $("refresh").disabled = true;
  document.querySelector("main")!.setAttribute("aria-busy", "true");
  $("results").hidden = true;
  $("status").hidden = false;
  $("status").textContent = "Loading Krillion scores…";
  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined || !tab.url || new URL(tab.url).origin !== "https://krillion.io") throw new Error("Open a Krillion page, then refresh.");
    const [result] = await api.scripting.executeScript({ target: { tabId: tab.id }, func: loadFriends });
    if (!result?.result) throw new Error("Could not access this Krillion tab. Reload the page and try again.");
    if ("error" in result.result) throw new Error(result.result.error);
    const payload = result.result.data;
    if (payload?.unlocked === false) throw new Error("Krillion has not unlocked these results yet.");
    const team = scoreTeam(payload);
    if (!team.questions.length) throw new Error("No scores are available yet.");
    currentPayload = payload;
    render(scoreTeam(currentPayload, excludedNames));
    $("status").hidden = true;
    $("results").hidden = false;
  } catch (error) {
    $("status").textContent = error instanceof Error ? error.message : "Could not load scores. Try refreshing.";
  } finally {
    $("refresh").disabled = false;
    document.querySelector("main")!.setAttribute("aria-busy", "false");
  }
}
$("refresh").addEventListener("click", refresh);
refresh();
