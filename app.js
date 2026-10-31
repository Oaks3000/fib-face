"use strict";

const STORE = "fibface-game-v1";
const SEEN = "fibface-seen-v1";
const app = document.getElementById("app");

let deck = [];
let S = load(STORE) || null;

function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
function save() { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch {} }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function rand(n) { return Math.floor(Math.random() * n); }

function getSeen() { return new Set(load(SEEN) || []); }
function markSeen(id) {
  const s = getSeen(); s.add(id);
  try { localStorage.setItem(SEEN, JSON.stringify([...s])); } catch {}
}
function drawCard() {
  let seen = getSeen();
  let pool = deck.filter(c => !seen.has(c.id));
  if (!pool.length) { try { localStorage.removeItem(SEEN); } catch {} pool = deck.slice(); }
  const card = pool[rand(pool.length)];
  markSeen(card.id);
  return card;
}

/* ---------- Rendering ---------- */
function render(html, focusSel) {
  app.innerHTML = `<section class="screen">${html}</section>`;
  const f = focusSel && app.querySelector(focusSel);
  if (f) f.focus();
  window.scrollTo(0, 0);
}

function topBar() {
  return `<div class="top"><span>Round ${S.round} · first to ${S.target}</span><button data-act="menu">Scores</button></div>`;
}

function factCard(card, withBlank = true) {
  return `<div class="card">
    <div class="cat">${esc(card.category)}</div>
    <p class="setup">${esc(card.setup)}</p>
    ${withBlank ? '<span class="blank" aria-hidden="true"></span>' : ""}
  </div>`;
}

const screens = {
  home() {
    const left = deck.length - [...getSeen()].filter(id => deck.some(c => c.id === id)).length;
    render(`
      <h1 class="title">Fib<br>Face</h1>
      <p class="tagline">One of you knows how the fact really ends. Everyone else is making it up.</p>
      <div class="grow"></div>
      ${S && S.phase && S.phase !== "end" ? `<button class="btn" data-act="resume">Carry on round ${S.round}</button>` : ""}
      <button class="btn ${S && S.phase && S.phase !== "end" ? "quiet" : ""}" data-act="new">New game</button>
      <button class="btn quiet" data-act="rules">How to play</button>
      <p class="hint" style="text-align:center">${deck.length} facts · ${left} not played yet</p>
    `);
  },

  rules() {
    render(`
      <h2>How to play</h2>
      <div class="rules"><ol>
        <li>Put the phone in the middle and read the start of the fact out loud.</li>
        <li>Pass the phone round. Each person peeks in secret. One of you gets the real ending; everyone else gets told to make one up.</li>
        <li>Go round the table and say your ending out loud, as convincingly as you can.</li>
        <li>Everyone backs who they think has the real one. Argue, plead and change your mind until you lock it in. The truth-holder votes too, as cover, but their vote doesn't count.</li>
        <li>Score 1 point for backing the right person, and 1 point for every vote your ending pulls in. First to the target wins.</li>
      </ol></div>
      <p class="hint">Heard a fact before? Skip it before anyone peeks. Facts you've played won't come up again until you've been through all of them.</p>
      <div class="grow"></div>
      <button class="btn" data-act="home">Back</button>
    `);
  },

  setup() {
    const d = S.draft;
    render(`
      <h2>Who's playing?</h2>
      <form class="row" data-form="add" style="flex:0">
        <input type="text" id="nm" placeholder="Name" maxlength="18" autocomplete="off" enterkeyhint="done">
        <button class="btn" style="flex:0 0 auto;width:auto;padding:0 22px">Add</button>
      </form>
      <ul class="list">${d.players.map((p, i) => `<li><span class="name">${esc(p)}</span><button class="x" aria-label="Remove ${esc(p)}" data-act="rm" data-i="${i}">×</button></li>`).join("")}</ul>
      ${d.players.length < 3 ? `<p class="hint">Add at least ${3 - d.players.length} more ${d.players.length === 2 ? "player" : "players"}. It needs three or more.</p>` : ""}
      <div class="field"><span class="label">Play to</span>
        <div class="seg">${[10, 15, 20, 30].map(n => `<button data-act="target" data-n="${n}" aria-pressed="${d.target === n}">${n} points</button>`).join("")}</div>
      </div>
      <label class="toggle"><input type="checkbox" id="ts" ${d.truthScores ? "checked" : ""}>
        <span>The truth-holder scores for votes too<br><span class="hint">Off is the box rules. On gives them a reason to sell the real one.</span></span></label>
      <div class="grow"></div>
      <button class="btn" data-act="start" ${d.players.length < 3 ? "disabled" : ""}>Start the game</button>
      <button class="link" data-act="home">Back</button>
    `, "#nm");
  },

  fact() {
    render(`
      ${topBar()}
      <p class="hint">${esc(S.players[S.reader])} reads this out:</p>
      ${factCard(S.card)}
      <div class="grow"></div>
      <button class="btn" data-act="deal">Pass the phone round</button>
      <button class="btn quiet" data-act="skip">Someone knows it, skip</button>
    `);
  },

  pass() {
    const who = S.players[S.order[S.dealPos]];
    render(`
      ${topBar()}
      <div class="pass">
        <p class="hint">Hand the phone to</p>
        <div class="who">${esc(who)}</div>
        <p class="hint">Everyone else, look away.</p>
      </div>
      <button class="btn" data-act="peek">I'm ${esc(who)}, show me</button>
    `);
  },

  secret() {
    const me = S.order[S.dealPos];
    const isTruth = me === S.truth;
    const last = S.dealPos === S.order.length - 1;
    render(`
      ${topBar()}
      <div class="card secret">
        ${isTruth ? `
          <div class="big">You have the real one</div>
          <p class="setup-mini">${esc(S.card.setup)}</p>
          <p class="answer">…${esc(S.card.answer)}</p>
          <p class="detail">${esc(S.card.detail)}</p>
        ` : `
          <div class="big">Make it up</div>
          <p class="setup-mini">${esc(S.card.setup)}</p>
          <p class="answer">…invent an ending and sell it.</p>
          <p class="detail">Keep it short and specific. Real facts usually have a name, a number or a place in them.</p>
        `}
      </div>
      <div class="grow"></div>
      <button class="btn" data-act="hide">${last ? "Hide it, everyone's had a look" : "Hide it and pass on"}</button>
    `);
  },

  bluff() {
    const order = S.speakOrder.map(i => S.players[i]);
    render(`
      ${topBar()}
      ${factCard(S.card)}
      <div class="field"><span class="label">Say your endings in this order</span>
        <ul class="list">${order.map(n => `<li><span class="name">${esc(n)}</span></li>`).join("")}</ul>
      </div>
      <div class="grow"></div>
      <button class="btn" data-act="tovote">Everyone's spoken, go to the vote</button>
    `);
  },

  vote() {
    const voters = S.players.map((_, i) => i);
    const allIn = voters.every(i => S.votes[i] !== undefined);
    render(`
      ${topBar()}
      <h2>Who's got the real one?</h2>
      <p class="hint">Everyone backs someone, even the person with the real one, so nobody gives themselves away. Their vote doesn't count.</p>
      ${voters.map(v => `
        <div class="voter">
          <span class="name">${esc(S.players[v])} backs</span>
          <div class="chips">${S.players.map((p, t) => t === v ? "" :
            `<button class="chip" data-act="vote" data-v="${v}" data-t="${t}" aria-pressed="${S.votes[v] === t}">${esc(p)}</button>`).join("")}</div>
        </div>`).join("")}
      <div class="grow"></div>
      <button class="btn" data-act="lock" ${allIn ? "" : "disabled"}>Lock in and reveal</button>
    `);
  },

  reveal() {
    const g = S.gains;
    const ranked = S.players.map((n, i) => ({ n, i, pts: S.scores[i], gain: g[i] })).sort((a, b) => b.pts - a.pts);
    const top = ranked[0].pts;
    const fooled = Object.entries(S.votes).filter(([v, t]) => +v !== S.truth && t !== S.truth).length;
    const winners = ranked.filter(r => r.pts >= S.target && r.pts === top);
    render(`
      ${topBar()}
      <p class="hint">The real ending was ${esc(S.players[S.truth])}'s</p>
      <div class="card flip">
        <div class="cat">${esc(S.card.category)}</div>
        <p class="setup">${esc(S.card.setup)}</p>
        <p class="answer-line">${esc(S.card.answer)}</p>
        <p class="detail">${esc(S.card.detail)}</p>
        ${S.card.source_url ? `<p class="src">Source: <a href="${esc(S.card.source_url)}" target="_blank" rel="noopener">${esc(S.card.source_title || "link")}</a></p>` : ""}
      </div>
      <p class="hint">${fooled === 0 ? "Nobody was fooled this round." : `${fooled} ${fooled === 1 ? "vote went" : "votes went"} to a fake.`}</p>
      <ul class="scores">${ranked.map(r => `<li class="${r.pts === top && top > 0 ? "lead" : ""}"><span class="name">${esc(r.n)}</span><span class="gain">${r.gain ? "+" + r.gain : ""}</span><span class="pts">${r.pts}</span></li>`).join("")}</ul>
      <div class="grow"></div>
      ${winners.length ? `<button class="btn" data-act="finish">See who won</button>` : `<button class="btn" data-act="next">Next fact</button>`}
    `);
  },

  end() {
    const ranked = S.players.map((n, i) => ({ n, pts: S.scores[i] })).sort((a, b) => b.pts - a.pts);
    const top = ranked[0].pts;
    const winners = ranked.filter(r => r.pts === top).map(r => r.n);
    render(`
      <div class="pass">
        <p class="hint">${winners.length > 1 ? "A shared win for" : "The winner is"}</p>
        <div class="who">${winners.map(esc).join(" & ")}</div>
        <p class="hint">${top} points after ${S.round} rounds</p>
      </div>
      <ul class="scores">${ranked.map(r => `<li class="${r.pts === top ? "lead" : ""}"><span class="name">${esc(r.n)}</span><span class="pts">${r.pts}</span></li>`).join("")}</ul>
      <button class="btn" data-act="again">Play again, same players</button>
      <button class="btn quiet" data-act="home">Home</button>
    `);
  },

  menu() {
    const ranked = S.players.map((n, i) => ({ n, pts: S.scores[i] })).sort((a, b) => b.pts - a.pts);
    render(`
      <h2>Scores</h2>
      <ul class="scores">${ranked.map(r => `<li><span class="name">${esc(r.n)}</span><span class="pts">${r.pts}</span></li>`).join("")}</ul>
      <p class="hint">Round ${S.round}, playing to ${S.target}.</p>
      <div class="grow"></div>
      <button class="btn" data-act="closemenu">Back to the game</button>
      <button class="btn quiet" data-act="quit">End this game</button>
    `);
  },
};

function show() {
  if (!S || !S.phase) return screens.home();
  (screens[S.phase] || screens.home)();
}

/* ---------- Game flow ---------- */
function newRound() {
  S.card = drawCard();
  S.truth = rand(S.players.length);
  const n = S.players.length;
  S.order = Array.from({ length: n }, (_, k) => (S.reader + 1 + k) % n);
  const start = rand(n);
  S.speakOrder = Array.from({ length: n }, (_, k) => (start + k) % n);
  S.dealPos = 0;
  S.votes = {};
  S.gains = {};
  S.phase = "fact";
}

function score() {
  const g = {};
  S.players.forEach((_, i) => (g[i] = 0));
  for (const [v, t] of Object.entries(S.votes)) {
    if (+v === S.truth) continue;
    if (t === S.truth) { g[v] += 1; if (S.truthScores) g[t] += 1; }
    else g[t] += 1;
  }
  S.players.forEach((_, i) => (S.scores[i] += g[i]));
  S.gains = g;
}

app.addEventListener("submit", e => {
  e.preventDefault();
  const inp = app.querySelector("#nm");
  const name = inp.value.trim();
  if (name && S.draft.players.length < 10 && !S.draft.players.includes(name)) {
    S.draft.players.push(name);
    save();
  }
  screens.setup();
});

app.addEventListener("change", e => {
  if (e.target.id === "ts") { S.draft.truthScores = e.target.checked; save(); }
});

app.addEventListener("click", e => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const act = b.dataset.act;
  switch (act) {
    case "home": if (S && S.phase === "end") S.phase = null; if (S && (S.phase === "setup" || S.phase === "rules")) S.phase = S.prev || null; save(); return show();
    case "rules": S = S || {}; S.prev = S.phase && S.phase !== "rules" ? S.phase : S.prev; S.phase = "rules"; return show();
    case "resume": return show();
    case "new": {
      const prevPlayers = (S && S.players) || (S && S.draft && S.draft.players) || [];
      S = { draft: { players: prevPlayers.slice(), target: 20, truthScores: true }, phase: "setup" };
      save(); return show();
    }
    case "rm": S.draft.players.splice(+b.dataset.i, 1); save(); return show();
    case "target": S.draft.target = +b.dataset.n; save(); return show();
    case "start":
    case "again": {
      const d = act === "start" ? S.draft : { players: S.players, target: S.target, truthScores: S.truthScores };
      S = { players: d.players.slice(), target: d.target, truthScores: d.truthScores, scores: {}, round: 1, reader: 0, draft: d };
      S.players.forEach((_, i) => (S.scores[i] = 0));
      newRound(); save(); return show();
    }
    case "skip": S.card = drawCard(); save(); return show();
    case "deal": S.phase = "pass"; save(); return show();
    case "peek": S.phase = "secret"; save(); return show();
    case "hide":
      if (S.dealPos < S.order.length - 1) { S.dealPos++; S.phase = "pass"; }
      else S.phase = "bluff";
      save(); return show();
    case "tovote": S.phase = "vote"; save(); return show();
    case "vote": {
      const v = +b.dataset.v, t = +b.dataset.t;
      S.votes[v] = S.votes[v] === t ? undefined : t;
      if (S.votes[v] === undefined) delete S.votes[v];
      save();
      const y = window.scrollY; screens.vote(); window.scrollTo(0, y);
      return;
    }
    case "lock": score(); S.phase = "reveal"; save(); return show();
    case "next": S.round++; S.reader = (S.reader + 1) % S.players.length; newRound(); save(); return show();
    case "finish": S.phase = "end"; save(); return show();
    case "menu": S.back = S.phase; S.phase = "menu"; return show();
    case "closemenu": S.phase = S.back; save(); return show();
    case "quit": S.phase = "end"; save(); return show();
  }
});

/* ---------- Boot ---------- */
fetch("facts.json")
  .then(r => r.json())
  .then(d => { deck = d; show(); })
  .catch(() => { app.innerHTML = `<section class="screen"><h2>The facts didn't load</h2><p>Open the game once with signal so it can save them for offline play.</p></section>`; });

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
