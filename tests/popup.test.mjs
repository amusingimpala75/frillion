import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { scoreTeam } from "../build/score.js";

const source = readFileSync(new URL("../build/popup.js", import.meta.url), "utf8")
  .replace('import { scoreTeam } from "./score.js";', "")
  .replace(/refresh\(\);\s*$/, "");

function popup() {
  let focused;
  class Element {
    children = [];
    listeners = {};
    classList = { toggle() {} };
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    addEventListener(type, handler) { this.listeners[type] = handler; }
    setAttribute() {}
    focus() { focused = this.id; }
  }
  const elements = Object.fromEntries(["total", "date", "players", "questions", "refresh", "results", "status", "main"].map(id => [id, new Element()]));
  const descendants = node => [node, ...node.children.flatMap(descendants)];
  const document = {
    getElementById: id => elements[id] ?? descendants(elements.players).find(node => node.id === id),
    createElement: () => new Element(),
    querySelector: () => elements.main,
  };
  const payload = { leaderboard: [
    { username: "Friend", answers: [{ prompt: "Q", score: 85, answer: "tbilisi" }] },
    { username: "Me", self: true, answers: [{ prompt: "Q", score: 60, answer: "london" }] },
  ] };
  let requests = 0;
  const chrome = {
    tabs: { query: async () => [{ id: 1, url: "https://krillion.io/friends" }] },
    scripting: { executeScript: async () => { requests++; return [{ result: { data: payload } }]; } },
  };
  const context = vm.createContext({ document, chrome, scoreTeam, URL, Intl });
  vm.runInContext(source, context);
  return { document, elements, refresh: () => vm.runInContext("refresh()", context), focused: () => focused, requests: () => requests };
}

test("checkbox changes recalculate locally, preserve focus and survive refresh; reopening resets", async () => {
  const ui = popup();
  await ui.refresh();
  assert.equal(ui.elements.total.textContent, "85");
  const checkbox = ui.document.getElementById("include-player-0");
  assert.equal(checkbox.checked, true);
  assert.equal(ui.document.getElementById("include-player-1"), undefined); // self
  checkbox.checked = false;
  checkbox.listeners.change();
  assert.equal(ui.elements.total.textContent, "60");
  assert.equal(ui.document.getElementById(checkbox.id).checked, false);
  assert.equal(ui.focused(), checkbox.id);
  assert.equal(ui.requests(), 1);
  assert.equal(ui.elements.players.children.find(row => row.children[1].textContent === "—") !== undefined, true);
  await ui.refresh();
  assert.equal(ui.elements.total.textContent, "60");
  const updated = ui.document.getElementById(checkbox.id);
  updated.checked = true;
  updated.listeners.change();
  assert.equal(ui.elements.total.textContent, "85");
  updated.checked = false;
  updated.listeners.change();
  const reopened = popup();
  await reopened.refresh();
  assert.equal(reopened.document.getElementById(checkbox.id).checked, true);
  assert.equal(reopened.elements.total.textContent, "85");
});
