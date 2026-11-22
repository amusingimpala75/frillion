export function scoreTeam(payload) {
  if (!payload || !Array.isArray(payload.leaderboard)) throw new Error("Unexpected response from Krillion.");
  const players = payload.leaderboard
    .filter(p => Array.isArray(p.answers))
    .map((p, id) => ({ id, name: p.username, self: Boolean(p.self), contribution: 0, answers: p.answers }));
  const questions = new Map();
  for (const player of players) {
    // Each player can contribute at most once to a question.
    const answers = new Map();
    for (const answer of player.answers) {
      if (typeof answer.prompt !== "string" || !Number.isFinite(answer.score) || answer.score < 0) continue;
      if (!answers.has(answer.prompt) || answers.get(answer.prompt).score < answer.score) answers.set(answer.prompt, answer);
    }
    for (const [prompt, answer] of answers) {
      if (!questions.has(prompt)) questions.set(prompt, { prompt, score: answer.score, winners: [] });
      const question = questions.get(prompt);
      if (answer.score > question.score) { question.score = answer.score; question.winners = []; }
      if (answer.score === question.score) question.winners.push({ id: player.id, name: player.name, answer: answer.answer });
    }
  }
  let total = 0;
  for (const question of questions.values()) {
    total += question.score;
    for (const winner of question.winners) players[winner.id].contribution += question.score / question.winners.length;
  }
  return {
    total, date: payload.date, questions: [...questions.values()],
    players: players.map(({ answers, ...p }) => p).sort((a, b) => b.contribution - a.contribution || a.name.localeCompare(b.name)),
  };
}
