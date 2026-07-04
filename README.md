# ✨ HAGIMON ✨

**Invoke the Saints. Battle for Grace.**

HAGIMON is a Saint-themed trading card game that runs entirely in your browser — no build step, no server, no dependencies. Collect the saints, build a 30-card deck, and battle to earn Grace and level up.

**🎮 Play it live:** https://rwaynewhite15.github.io/Hagimon/

---

## How to Play

### 1. The Saints
Ten saints are available, each defined by the **seven virtues** — Faith, Hope, Charity, Justice, Prudence, Temperance, and Fortitude (rated 1–10) — plus a rarity, a special ability, and a patronage.

Rarity grants a bonus to every virtue at battle time:

| Rarity | Virtue bonus |
|---|---|
| Common | +0 |
| Blessed | +1 |
| Canonized | +2 |

### 2. Build a Deck
Open **📿 Build Deck** and assemble exactly **30 cards**. You may include each saint up to **3 times** (a card plus 2 duplicates). Use **✨ Fill Deck** to top up with random picks. Your deck is saved to your browser's localStorage and survives page reloads.

### 3. Battle
Open **⚡ Battle**, draw a champion from your deck, and pick an opponent from the saint list.

Battle resolution:
1. Each saint's **dominant (highest) virtue** — with rarity bonuses — is added to their **level** to form a score.
2. Special abilities modify the scores (see the table below).
3. The higher score wins. Ties are peaceful draws — unless St. Catherine is fighting.

### 4. Grace & Leveling
- **Winner:** +3 Grace  **Loser:** +1 Grace  **Draw:** +2 Grace each
- At **10 Grace**, a saint levels up (max level 10) and their Grace resets.
- Higher level = higher battle score. Progress is saved automatically.

---

## The Saints

| Saint | Rarity | Special Ability | Patron of |
|---|---|---|---|
| 🕊️ St. Francis | Canonized | **Canticle of Creation** — gains +1 bonus Grace after every battle, win or lose | Animals, ecology, and peace |
| ⚔️ St. Michael | Canonized | **Sword of Justice** — +3 in any battle where Justice is a dominant virtue | Soldiers, police, protection |
| 🗝️ St. Peter | Canonized | **Keys of the Kingdom** — automatically wins against Common saints | Popes, fishermen, locksmiths |
| 🌹 St. Theresa | Blessed | **The Little Way** — her mercy heals: the opponent receives +1 Grace | Missionaries, florists, the sick |
| 🚩 St. Joan of Arc | Blessed | **Voices of Victory** — if losing, re-rolls with a surge of +1 to +3 | France, soldiers, prisoners |
| 📖 St. Augustine | Blessed | **Restless Heart** — +2 when facing a higher-level opponent | Theologians, converts, printers |
| ☸️ St. Catherine | Blessed | **The Unbroken Wheel** — wins any tied battle | Philosophers, students, librarians |
| 🕯️ St. Jude | Common | **Patron of Lost Causes** — +2 when trailing by 3 or more | Hopeless causes |
| 🎵 St. Cecilia | Common | **Song of Heaven** — lowers the opponent's dominant virtue by 2 | Musicians and composers |
| 🛡️ St. Demetrius | Common | **Warrior's Stand** — +2 Fortitude against Canonized saints | Soldiers, Thessaloniki |

---

## Run It Locally

No build step — just open the file:

```bash
git clone https://github.com/rwaynewhite15/Hagimon.git
cd Hagimon
# open index.html in any browser, or serve it:
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Deploy to GitHub Pages

1. **Fork** (or push) this repository to your GitHub account.
2. Go to the repo's **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to *Deploy from a branch*, choose the **main** branch and the **/ (root)** folder, and save.
4. Wait a minute — your game is live at `https://<your-username>.github.io/<repo-name>/`.

That's it. There is no build step; GitHub Pages serves the files as-is.

## Project Structure

```
hagimon/
├── index.html        # Main game entry point (all screens)
├── README.md         # You are here
├── .gitignore
└── src/
    ├── data.js       # The 10 saint definitions (stats, abilities, patronages)
    ├── game.js       # Core game logic: Saint, Deck, Battle classes
    ├── app.js        # UI layer: screens, rendering, localStorage persistence
    └── styles.css    # Mobile-first styling
```

---

*Made with reverence for the tradition of the saints — and a bit of fun.* ☩
