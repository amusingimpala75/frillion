import test from "node:test";
import assert from "node:assert/strict";
import { scoreTeam } from "../src/score.mjs";

const answer = (prompt, score, value = "answer") => ({ prompt, score, answer: value });
const player = (username, answers, self = false) => ({ username, answers, self });
const team = (...leaderboard) => scoreTeam({ leaderboard, date: "2026-11-21" });

test("ties split points regardless of answer text, including self", () => {
  const result = team(
    player("John", [answer("Capital", 85, "tbilisi")]),
    player("Jill", [answer("Capital", 85, "cape town")]),
    player("Jake", [answer("Capital", 60, "london")], true),
  );
  assert.equal(result.total, 85);
  assert.deepEqual(result.players.map(p => p.contribution), [42.5, 42.5, 0]);
  assert.deepEqual(result.questions[0].winners.map(w => w.answer), ["tbilisi", "cape town"]);
});

test("questions matched by prompt, not array position; missing results excluded", () => {
  const result = team(
    player("A", [answer("A", 10), answer("B", 60)]),
    player("B", [answer("B", 30), answer("A", 85)], true),
    player("C", null),
  );
  assert.equal(result.total, 145);
  assert.equal(result.players.length, 2);
  assert.equal(result.players.reduce((sum, p) => sum + p.contribution, 0), result.total);
});

test("duplicate prompts cannot inflate contributions; bad scores ignored", () => {
  const result = team(player("A", [answer("A", 30), answer("A", 85), answer("B", NaN), answer("C", -5)]));
  assert.equal(result.total, 85);
  assert.equal(result.players[0].contribution, 85);
});

test("zero scores and absent answers contribute zero", () => {
  const result = team(player("A", [answer("Q", 0, null)]), player("B", [answer("Q", 0, null)]));
  assert.equal(result.total, 0);
  assert.ok(result.players.every(p => p.contribution === 0));
});

test("fractional shares retain precision", () => {
  const result = team(...["A", "B", "C"].map(n => player(n, [answer("Q", 10)])));
  assert.equal(result.players[0].contribution, 10 / 3);
});

test("empty and malformed responses", () => {
  assert.equal(team().total, 0);
  assert.throws(() => scoreTeam({}), /Unexpected/);
});
