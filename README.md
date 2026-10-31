# Fib Face

A bluffing party game for 3 to 10 players round one phone. One player secretly gets the real ending to a strange-but-true fact; everyone else makes one up. Spot the truth, or fool everyone else.

Play at https://oaks3000.github.io/fib-face/ and add it to your home screen. After the first load it works offline.

## Files
- `facts.json`: the deck. Each card has a setup, the real ending, a supporting detail and a source.
- `app.js`, `styles.css`, `index.html`: the game.
- `sw.js`: offline cache. Bump `VERSION` whenever anything changes so phones pick up the update.
