# ✨ HAGIMON ✨

**Invoke the Saints. Break the Powers of Sin.**

HAGIMON is a Saint-themed roguelike of virtue and intercession that runs entirely in your browser — no build step, no server, no dependencies. Each pilgrimage is a complete game: the seven deadly sins stand at full power, and you must break every one of them to zero before your Resolve gives out. Nothing carries over — every pilgrimage begins anew.

**🎮 Play it live:** https://rwaynewhite15.github.io/Hagimon/

---

## How to Play

### You Are the Pilgrim
You have the **seven capital virtues** — Humility, Generosity, Chastity, Kindness, Temperance, Patience, and Diligence — each starting at a humble **3**. The saints don't battle each other; they assist *you* against the circumstances of sin.

### The Seven Deadly Sins
Each sin assails its traditional contrary virtue:

| Sin | Assails your… |
|---|---|
| 👑 Pride | Humility |
| 🪙 Greed | Generosity |
| 🥀 Lust | Chastity |
| 🐍 Envy | Kindness |
| 🍷 Gluttony | Temperance |
| 🌋 Wrath | Patience |
| 🕸️ Sloth | Diligence |

### The Sin Pool — how you win
All seven sins begin the pilgrimage with **Power 9** and **Prevalence 3**:

- **Power** is how strong a sin is — your trial is fought against its current power.
- **Prevalence** is how likely it is to be called — the sins that manifest each turn are a weighted draw from the pool.

Every trial moves the pool:

- **Win** → the sin's power breaks by your **margin of victory** (at least 3, up to 8 — decisive wins break far more) and its prevalence falls by 1. At **power 0 the sin is vanquished** — but sin does not die quietly: **its malice flees into the survivors, and every standing sin gains +1 power and +1 prevalence**. The last sins standing are the strongest.
- **Lose** → the sin grows: **+2 power** (cap 18) and **+2 prevalence** (cap 9) — stronger *and* more often in your path — and you lose 1 of your **3 Resolve (❤)**.

**Vanquish all seven sins to triumph. Lose all three Resolve and the pilgrimage falls.** Severity is a live label for a sin's current power — Venial (≤8), Grave (9–12), Mortal (13+) — and sets the prizes for beating it.

### Choose your battle
Each turn, **three sins manifest** — you decide which to face. But temptation resisted is not temptation defeated: the two sins you spurn each grow **+1 prevalence**, crowding your future choices. And **sin festers**: every 5th trial, every standing sin grows — **+1 power the first time, +2 the second, +3 every time after**. The war is a race; turtling loses it.

### The saints tire
A saint who intercedes **rests for the next two trials** — you cannot lean on one champion. Depth of roster is survival. Two abilities are similarly bounded: **St. Theresa restores Resolve once per pilgrimage**, and **St. Peter's Keys cannot turn twice in a row**.

### Know your odds — and plead when they fail
Every invocation chip shows its **live odds and damage range** ("75% · dmg 3–6") before you commit — the game hides nothing but the providence roll (1–4). When a trial is lost, you may **Plead for Providence: ☩3 Grace to face the same sin again with a fresh roll**, once per trial. Keeping a Grace reserve for pleading versus spending it on virtues is one of the run's core tensions.

### Everything starts over
A pilgrimage is one complete game. Virtues, Grace, Dulia, and unlocked saints all reset when a new pilgrimage begins — your build lives and dies with the run. Returning to the main menu ends the run. Only your **records** (pilgrimages, triumphs, best progress) persist. The **📜 Saints** library and **⛪ Chapel** are reached from inside the pilgrimage.

### Dulia — the currency of devotion
You start each pilgrimage with **✠10** and earn more by winning trials: **+2/+3/+4** by the sin's severity band. It has two uses:

| Rarity | Unlock (per run) | Invoke (per trial) | Virtue bonus |
|---|---|---|---|
| Common | ✠6 | ✠1 | +0 |
| Blessed | ✠12 | ✠2 | +1 |
| Canonized | ✠20 | ✠3 | +2 |

You begin with only **St. Jude** — the patron of lost causes — at your side. The other nine saints are **locked** until you unlock them in the Saints library, and one wallet pays for both unlocking and invoking. Run dry and you face sin alone, with nothing but your own virtue.

### Resolving a Trial
Your **defense** = your tested virtue + the saint's matching virtue (with rarity bonus) + **+2 patron bonus** if the saint is invoked against that very sin + special abilities + a providence roll (1–4). Beat the sin's current power and its power breaks by the margin.

### Grace — divine assistance
Grace elevates, heals, and strengthens your natural abilities — for this pilgrimage.

- **Victory:** +3/+4/+5 Grace by severity band · **Defeat:** +1 Grace (even failure teaches)
- Spend Grace in the **⛪ Chapel** to raise a virtue (raising a virtue costs its current value, max 10) — or bank it to plead for Providence

**Every stat explains itself** — hover over (or tap) any number in the HUD, the sin pool, or a sin's card, and open the **❓ glossary** in the run's top bar for the full reference.

An in-progress pilgrimage is saved automatically in your browser, so you can close the tab and pick the run back up.

---

## The Saints

| Saint | Rarity (unlock/invoke) | Special Ability | Invoked against |
|---|---|---|---|
| 🕯️ St. Jude | Common — **your starter** | **Patron of Lost Causes** — +2 when trailing the sin by 3 or more | Sloth |
| 🎵 St. Cecilia | Common ✠6 / ✠1 | **Song of Heaven** — lowers the sin's power by 2 | Gluttony |
| 🛡️ St. Demetrius | Common ✠6 / ✠1 | **Warrior's Stand** — a soldier's endurance: +2 when the trial tests Patience | Wrath |
| 🌹 St. Theresa | Blessed ✠12 / ✠2 | **The Little Way** — a victory with her restores 1 Resolve (once per pilgrimage) | Wrath |
| 🚩 St. Joan of Arc | Blessed ✠12 / ✠2 | **Voices of Victory** — if the trial is being lost, +1 to +3 surge | Sloth |
| 📖 St. Augustine | Blessed ✠12 / ✠2 | **Restless Heart** — +2 when your tested virtue is 4 or less | Lust |
| ☸️ St. Catherine | Blessed ✠12 / ✠2 | **The Unbroken Wheel** — an exactly tied trial becomes a victory | Envy |
| 🕊️ St. Francis | Canonized ✠20 / ✠3 | **Canticle of Creation** — +1 bonus Grace after every trial, won or lost | Greed |
| ⚔️ St. Michael | Canonized ✠20 / ✠3 | **Sword of Justice** — +3 against Grave and Mortal sins (power 9+) | Pride |
| 🗝️ St. Peter | Canonized ✠20 / ✠3 | **Keys of the Kingdom** — trials against Venial sins (power ≤8) succeed outright, but the Keys cannot turn twice in a row | Gluttony |

**Strategy tips:** read the odds on every chip before committing; unlock Commons that cover the virtues your opening draw threatens; fatigue means you need at least two answers for every sin you plan to fight back-to-back; big margins break more power, so overkill is efficiency; the two sins you spurn each turn grow bolder, so don't dodge the same Mortal sin forever; keep ☩3 Grace banked for a plead when you're forced into a coin-flip trial; Theresa's single restore is the only healing in the game — time it; and every invocation delays your next unlock, so spend cheap saints on the sins they counter.

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
    ├── data.js       # 10 saints + 7 sins (stats, abilities, patron matchups)
    ├── game.js       # Core logic: Saint, Sin, Pilgrim, Trial, Pilgrimage
    ├── app.js        # UI layer: screens, rendering, localStorage persistence
    └── styles.css    # Mobile-first styling
```

---

*Made with reverence for the tradition of the saints — dulia is the veneration due to them, and grace is the help that perfects nature.* ☩
