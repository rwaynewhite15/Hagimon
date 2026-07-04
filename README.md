# ✨ HAGIMON ✨

**Invoke the Saints. Conquer the Seven Sins.**

HAGIMON is a Saint-themed game of virtue and intercession that runs entirely in your browser — no build step, no server, no dependencies. You are a pilgrim beset by the seven deadly sins. Invoke the saints to intercede for you, earn Grace, and perfect your virtues.

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

### The Pilgrimage
A pilgrimage is **7 trials**, escalating in severity: trials 1–3 are **Venial** (power 11–14), 4–5 are **Grave** (15–18), 6–7 are **Mortal** (19–22). Which sin manifests at each trial is a weighted draw — sins that have beaten you before come back more often (see Dominion). You carry **3 Resolve (❤)**; losing a trial costs one. At zero, the pilgrimage ends — but everything you earned is kept.

### Dulia — the currency of devotion
Dulia (✠) is **persistent** — you start with 12 and earn more by overcoming trials: **+3/+4/+5** per victory (Venial/Grave/Mortal), **+5** for completing a pilgrimage, plus a **bounty of +1 per Dominion** when you banish a strengthened sin. It has two uses:

| Rarity | Unlock (once) | Invoke (per trial) | Virtue bonus |
|---|---|---|---|
| Common | ✠6 | ✠1 | +0 |
| Blessed | ✠12 | ✠2 | +1 |
| Canonized | ✠20 | ✠3 | +2 |

You begin with only **St. Jude** — the patron of lost causes — at your side. The other nine saints are **locked** until you unlock them in the Library. One wallet pays for both unlocking and invoking, so every invocation delays your next unlock. Run dry and you face sin alone, with nothing but your own virtue.

### Dominion — your falls have consequences
Every trial you lose feeds that sin: **+1 Dominion** (max 5), making it **more powerful** (+1 power per Dominion) *and* **more probable to manifest** in future trials. Dominion is worn down by:

- **Defeating that sin:** −1 (and it pays the bounty above)
- **Completing a pilgrimage:** −1 to every sin — the journey purifies
- **Contrition:** each new pilgrimage begins with every sin's Dominion eased by 1

### Resolving a Trial
Your **defense** = your tested virtue + the saint's matching virtue (with rarity bonus) + **+2 patron bonus** if the saint is invoked against that very sin + special abilities + a providence roll (1–4). If defense beats the sin's power, the sin is banished.

### Grace — divine assistance
Grace elevates, heals, and strengthens your natural abilities.

- **Victory:** +3/+4/+5 Grace (Venial/Grave/Mortal) · **Defeat:** +2 Grace (even failure teaches)
- **Completing all 7 trials:** +7 bonus Grace
- Spend Grace in the **⛪ Chapel** to raise a virtue permanently (raising a virtue costs its current value, max 10)

Your virtues, Grace, Dulia, unlocked saints, Dominion, and any pilgrimage-in-progress are saved automatically in your browser.

---

## The Saints

| Saint | Rarity (unlock/invoke) | Special Ability | Invoked against |
|---|---|---|---|
| 🕯️ St. Jude | Common — **your starter** | **Patron of Lost Causes** — +2 when trailing the sin by 3 or more | Sloth |
| 🎵 St. Cecilia | Common ✠6 / ✠1 | **Song of Heaven** — lowers the sin's power by 2 | Gluttony |
| 🛡️ St. Demetrius | Common ✠6 / ✠1 | **Warrior's Stand** — a soldier's endurance: +2 when the trial tests Patience | Wrath |
| 🌹 St. Theresa | Blessed ✠12 / ✠2 | **The Little Way** — a victory with her restores 1 Resolve | Wrath |
| 🚩 St. Joan of Arc | Blessed ✠12 / ✠2 | **Voices of Victory** — if the trial is being lost, +1 to +3 surge | Sloth |
| 📖 St. Augustine | Blessed ✠12 / ✠2 | **Restless Heart** — +2 when your tested virtue is 4 or less | Lust |
| ☸️ St. Catherine | Blessed ✠12 / ✠2 | **The Unbroken Wheel** — an exactly tied trial becomes a victory | Envy |
| 🕊️ St. Francis | Canonized ✠20 / ✠3 | **Canticle of Creation** — +1 bonus Grace after every trial, won or lost | Greed |
| ⚔️ St. Michael | Canonized ✠20 / ✠3 | **Sword of Justice** — +3 against Grave and Mortal sins | Pride |
| 🗝️ St. Peter | Canonized ✠20 / ✠3 | **Keys of the Kingdom** — banishes Venial sins outright | Gluttony |

**Strategy tips:** unlock the cheap Commons early to cover more virtues; match the saint's strong virtue to the sin's tested virtue; don't let one sin snowball — a high-Dominion sin keeps returning, so spend what it takes to break it (the bounty repays you); save Canonized invocations for Mortal trials; and every invocation delays your next unlock, so face the easiest Venial trials with cheap saints.

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
