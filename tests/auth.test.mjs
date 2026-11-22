import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../build/popup.js", import.meta.url), "utf8");
const injected = source.slice(source.indexOf("async function loadFriends()"), source.indexOf("\nfunction render("));

function context(origin = "https://krillion.io", records = [], status = 200) {
  let closed = false;
  const calls = [];
  const db = {
    close() { closed = true; },
    transaction(store, mode) {
      assert.equal(store, "firebaseLocalStorage");
      assert.equal(mode, "readonly");
      return { objectStore: () => ({ getAll() {
        const request = {};
        queueMicrotask(() => request.onsuccess());
        request.result = records;
        return request;
      } }) };
    },
  };
  const sandbox = {
    location: { origin }, AbortSignal,
    indexedDB: { open(name) {
      calls.push(name);
      const request = { result: db };
      queueMicrotask(() => request.onsuccess());
      return request;
    } },
    async fetch(url, options) {
      calls.push({ url, options });
      return { status, ok: status === 200, json: async () => ({ leaderboard: [], unlocked: true }) };
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(injected, sandbox);
  return { run: () => sandbox.loadFriends(), calls, closed: () => closed };
}

const record = { fbase_key: "firebase:authUser:test:[DEFAULT]", value: { stsTokenManager: { accessToken: "synthetic-test-token" } } };

test("non-Krillion origins never read IndexedDB or fetch", async () => {
  for (const origin of ["https://example.com", "https://krillion.io.evil.test", "http://krillion.io"]) {
    const ctx = context(origin, [record]);
    assert.ok((await ctx.run()).error);
    assert.equal(ctx.calls.length, 0);
  }
});

test("only API results leave injected function; DB closed; no storage permission needed", async () => {
  const ctx = context(undefined, [record]);
  const result = await ctx.run();
  assert.ok(result.data);
  assert.equal(JSON.stringify(result).includes("synthetic-test-token"), false);
  const request = ctx.calls.find(c => typeof c === "object");
  assert.equal(request.url, "https://krillion.io/api/friends");
  assert.equal(request.options.headers.Authorization, "Bearer synthetic-test-token");
  assert.equal(request.options.redirect, "error");
  assert.equal(ctx.closed(), true);
});

test("no credentials means no fetch", async () => {
  const ctx = context();
  assert.ok((await ctx.run()).error);
  assert.equal(ctx.calls.filter(c => typeof c === "object").length, 0);
  assert.equal(ctx.closed(), true);
});

test("expired auth gives sign-in message and closes DB", async () => {
  const ctx = context(undefined, [record], 401);
  assert.match((await ctx.run()).error, /sign in again/);
  assert.equal(ctx.closed(), true);
});
