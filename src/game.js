/* ============================================================
   HAGIMON — Core Game Logic
   Saint, Deck, and Battle classes. No dependencies beyond
   the definitions in data.js. Works in the browser and Node.
   ============================================================ */

(function (root) {
  "use strict";

  const data =
    typeof module !== "undefined" && module.exports
      ? require("./data.js")
      : {
          SAINT_DATA: root.SAINT_DATA,
          VIRTUE_NAMES: root.VIRTUE_NAMES,
          RARITY_BONUS: root.RARITY_BONUS,
        };

  const { VIRTUE_NAMES, RARITY_BONUS } = data;

  const MAX_LEVEL = 10;
  const GRACE_TO_LEVEL = 10;
  const DECK_SIZE = 30;
  // "Max 2 duplicates" = one card plus up to two duplicate copies.
  // With 10 saints × 3 copies, a complete 30-card deck is achievable.
  const MAX_COPIES = 3;

  /* ---------------------------------------------------------- */

  class Saint {
    constructor(def, state) {
      state = state || {};
      this.name = def.name;
      this.title = def.title || "";
      this.emblem = def.emblem || "✨";
      this.rarity = def.rarity; // "Common" | "Blessed" | "Canonized"
      this.virtues = Object.assign({}, def.baseStats);
      this.specialAbility = def.ability;
      this.abilityKey = def.abilityKey;
      this.patronage = def.patronage;
      this.level = clamp(state.level || 1, 1, MAX_LEVEL);
      this.gracePoints = clamp(state.gracePoints || 0, 0, GRACE_TO_LEVEL);
    }

    /** Highest base virtue → { name, value } */
    getDominantVirtue() {
      const stats = this.getStatsWithRarity();
      let best = { name: VIRTUE_NAMES[0], value: stats[VIRTUE_NAMES[0]] };
      for (const v of VIRTUE_NAMES) {
        if (stats[v] > best.value) best = { name: v, value: stats[v] };
      }
      return best;
    }

    /** Virtues with the rarity bonus applied (may exceed 10). */
    getStatsWithRarity() {
      const bonus = RARITY_BONUS[this.rarity] || 0;
      const out = {};
      for (const v of VIRTUE_NAMES) {
        out[v] = this.virtues[v] + bonus;
      }
      return out;
    }

    /** Increment level (max 10) and reset grace. Returns new level. */
    levelUp() {
      if (this.level < MAX_LEVEL) this.level += 1;
      this.gracePoints = 0;
      return this.level;
    }

    /**
     * Award Grace (XP). Auto-levels when grace reaches 10.
     * Returns true if the saint leveled up.
     */
    addGrace(points) {
      this.gracePoints += Math.max(0, points);
      if (this.gracePoints >= GRACE_TO_LEVEL) {
        if (this.level < MAX_LEVEL) {
          this.levelUp();
          return true;
        }
        this.gracePoints = GRACE_TO_LEVEL; // level 10 saints rest in fullness of grace
      }
      return false;
    }

    toJSON() {
      return {
        name: this.name,
        rarity: this.rarity,
        level: this.level,
        gracePoints: this.gracePoints,
        virtues: Object.assign({}, this.virtues),
        specialAbility: this.specialAbility,
        patronage: this.patronage,
      };
    }
  }

  /* ---------------------------------------------------------- */

  class Deck {
    constructor(name, owner) {
      this.name = name || "My Deck";
      this.owner = owner || "Pilgrim";
      this.cards = []; // array of Saint references (duplicates allowed, max 2 each)
    }

    /** Add a saint. Returns { ok, error } — max 30 cards, max 2 copies. */
    addCard(saint) {
      if (this.cards.length >= DECK_SIZE) {
        return { ok: false, error: "Deck is full (" + DECK_SIZE + " cards)." };
      }
      if (this.countOf(saint.name) >= MAX_COPIES) {
        return {
          ok: false,
          error: saint.name + " is at the limit (" + MAX_COPIES + " copies — a card plus 2 duplicates).",
        };
      }
      this.cards.push(saint);
      return { ok: true };
    }

    /** Remove one copy of the named saint. Returns true if removed. */
    removeCard(saintName) {
      const i = this.cards.findIndex((c) => c.name === saintName);
      if (i === -1) return false;
      this.cards.splice(i, 1);
      return true;
    }

    countOf(saintName) {
      return this.cards.filter((c) => c.name === saintName).length;
    }

    /** Valid = exactly 30 cards, no saint more than twice. */
    isValid() {
      if (this.cards.length !== DECK_SIZE) return false;
      const counts = {};
      for (const c of this.cards) {
        counts[c.name] = (counts[c.name] || 0) + 1;
        if (counts[c.name] > MAX_COPIES) return false;
      }
      return true;
    }

    /** Draw a random saint from the deck (deck is not consumed). */
    draw() {
      if (this.cards.length === 0) return null;
      return this.cards[Math.floor(Math.random() * this.cards.length)];
    }

    toJSON() {
      return {
        name: this.name,
        owner: this.owner,
        cards: this.cards.map((c) => c.name),
      };
    }

    /**
     * Rebuild a deck from JSON. `collection` maps saint name → Saint,
     * so deck cards share the collection's leveled-up instances.
     */
    static fromJSON(json, collection) {
      const deck = new Deck(json.name, json.owner);
      for (const cardName of json.cards || []) {
        const saint = collection[cardName];
        if (saint) deck.cards.push(saint);
      }
      return deck;
    }
  }

  /* ---------------------------------------------------------- */

  class Battle {
    constructor(saintA, saintB, rng) {
      this.saintA = saintA;
      this.saintB = saintB;
      this.rng = rng || Math.random; // injectable for tests
    }

    /**
     * Resolve the battle.
     * Returns { winner, loser, draw, log[], graceAwarded: {name: pts}, levelUps[] }
     */
    resolve() {
      const a = this.saintA;
      const b = this.saintB;
      const log = [];

      // --- Phase 1: pre-battle virtue adjustments -------------
      const statsA = a.getStatsWithRarity();
      const statsB = b.getStatsWithRarity();

      // St. Cecilia: opponent's dominant virtue -2 (applies for each Cecilia present)
      if (a.abilityKey === "cecilia") {
        const top = topVirtue(statsB);
        statsB[top.name] = Math.max(1, top.value - 2);
        log.push("🎵 " + a.name + "'s Song of Heaven lowers " + b.name + "'s " + top.name + " by 2.");
      }
      if (b.abilityKey === "cecilia") {
        const top = topVirtue(statsA);
        statsA[top.name] = Math.max(1, top.value - 2);
        log.push("🎵 " + b.name + "'s Song of Heaven lowers " + a.name + "'s " + top.name + " by 2.");
      }

      // St. Demetrius: +2 Fortitude vs Canonized saints
      if (a.abilityKey === "demetrius" && b.rarity === "Canonized") {
        statsA.Fortitude += 2;
        log.push("🛡️ " + a.name + " takes a Warrior's Stand against the Canonized: +2 Fortitude.");
      }
      if (b.abilityKey === "demetrius" && a.rarity === "Canonized") {
        statsB.Fortitude += 2;
        log.push("🛡️ " + b.name + " takes a Warrior's Stand against the Canonized: +2 Fortitude.");
      }

      // --- Phase 2: base scores (dominant virtue + level) -----
      const domA = topVirtue(statsA);
      const domB = topVirtue(statsB);
      let scoreA = domA.value + a.level;
      let scoreB = domB.value + b.level;

      log.push(
        "⚖️ " + a.name + " invokes " + domA.name + " " + domA.value +
          " + Level " + a.level + " = " + scoreA + "."
      );
      log.push(
        "⚖️ " + b.name + " invokes " + domB.name + " " + domB.value +
          " + Level " + b.level + " = " + scoreB + "."
      );

      // St. Michael: +3 when Justice is a dominant virtue in the battle
      const justiceBattle = domA.name === "Justice" || domB.name === "Justice";
      if (a.abilityKey === "michael" && justiceBattle) {
        scoreA += 3;
        log.push("⚔️ Justice is at stake — " + a.name + "'s Sword of Justice grants +3 (" + scoreA + ").");
      }
      if (b.abilityKey === "michael" && justiceBattle) {
        scoreB += 3;
        log.push("⚔️ Justice is at stake — " + b.name + "'s Sword of Justice grants +3 (" + scoreB + ").");
      }

      // St. Augustine: +2 vs a higher-level opponent
      if (a.abilityKey === "augustine" && b.level > a.level) {
        scoreA += 2;
        log.push("📖 " + a.name + "'s Restless Heart rises against a greater foe: +2 (" + scoreA + ").");
      }
      if (b.abilityKey === "augustine" && a.level > b.level) {
        scoreB += 2;
        log.push("📖 " + b.name + "'s Restless Heart rises against a greater foe: +2 (" + scoreB + ").");
      }

      // St. Jude: +2 when trailing by 3 or more
      if (a.abilityKey === "jude" && scoreB - scoreA >= 3) {
        scoreA += 2;
        log.push("🕯️ A lost cause! " + a.name + " intercedes for the hopeless: +2 (" + scoreA + ").");
      }
      if (b.abilityKey === "jude" && scoreA - scoreB >= 3) {
        scoreB += 2;
        log.push("🕯️ A lost cause! " + b.name + " intercedes for the hopeless: +2 (" + scoreB + ").");
      }

      // St. Joan: re-roll (surge of +1..+3) if currently losing
      if (a.abilityKey === "joan" && scoreA < scoreB) {
        const surge = 1 + Math.floor(this.rng() * 3);
        scoreA += surge;
        log.push("🚩 " + a.name + " hears her Voices and charges again: +" + surge + " (" + scoreA + ").");
      }
      if (b.abilityKey === "joan" && scoreB < scoreA) {
        const surge = 1 + Math.floor(this.rng() * 3);
        scoreB += surge;
        log.push("🚩 " + b.name + " hears her Voices and charges again: +" + surge + " (" + scoreB + ").");
      }

      // --- Phase 3: decide the winner --------------------------
      let winner = null;
      let loser = null;
      let draw = false;

      // St. Peter: auto-win vs Common (cancels in a mirror match)
      const peterAutoA = a.abilityKey === "peter" && b.rarity === "Common" && b.abilityKey !== "peter";
      const peterAutoB = b.abilityKey === "peter" && a.rarity === "Common" && a.abilityKey !== "peter";
      if (peterAutoA) {
        winner = a; loser = b;
        log.push("🗝️ " + a.name + " holds the Keys of the Kingdom — automatic victory over a Common saint.");
      } else if (peterAutoB) {
        winner = b; loser = a;
        log.push("🗝️ " + b.name + " holds the Keys of the Kingdom — automatic victory over a Common saint.");
      } else if (scoreA > scoreB) {
        winner = a; loser = b;
        log.push("✨ " + a.name + " prevails, " + scoreA + " to " + scoreB + ".");
      } else if (scoreB > scoreA) {
        winner = b; loser = a;
        log.push("✨ " + b.name + " prevails, " + scoreB + " to " + scoreA + ".");
      } else {
        // Tie: St. Catherine wins ties (cancels if both are Catherine)
        const catA = a.abilityKey === "catherine";
        const catB = b.abilityKey === "catherine";
        if (catA && !catB) {
          winner = a; loser = b;
          log.push("☸️ The scores are tied at " + scoreA + " — " + a.name + "'s Unbroken Wheel turns the tie in her favor.");
        } else if (catB && !catA) {
          winner = b; loser = a;
          log.push("☸️ The scores are tied at " + scoreB + " — " + b.name + "'s Unbroken Wheel turns the tie in her favor.");
        } else {
          draw = true;
          log.push("🤝 The scores are tied at " + scoreA + " — the saints part in peace. Each receives 2 Grace.");
        }
      }

      // --- Phase 4: award Grace --------------------------------
      // Tracked per side (not per name) so same-saint matchups stay correct.
      let graceA = 0;
      let graceB = 0;

      if (draw) {
        graceA += 2;
        graceB += 2;
      } else if (winner === a) {
        graceA += 3;
        graceB += 1;
        log.push("🏆 " + a.name + " is awarded 3 Grace; " + b.name + " receives 1 Grace for the struggle.");
      } else {
        graceB += 3;
        graceA += 1;
        log.push("🏆 " + b.name + " is awarded 3 Grace; " + a.name + " receives 1 Grace for the struggle.");
      }

      // St. Theresa: heals the opponent +1 Grace
      if (a.abilityKey === "theresa") {
        graceB += 1;
        log.push("🌹 " + a.name + "'s Little Way heals: " + b.name + " gains +1 Grace.");
      }
      if (b.abilityKey === "theresa") {
        graceA += 1;
        log.push("🌹 " + b.name + "'s Little Way heals: " + a.name + " gains +1 Grace.");
      }

      // St. Francis: +1 bonus Grace for himself, win or lose
      if (a.abilityKey === "francis") {
        graceA += 1;
        log.push("🕊️ " + a.name + " sings the Canticle of Creation: +1 bonus Grace.");
      }
      if (b.abilityKey === "francis") {
        graceB += 1;
        log.push("🕊️ " + b.name + " sings the Canticle of Creation: +1 bonus Grace.");
      }

      // Apply grace (a saint battling itself receives both shares once)
      const levelUps = [];
      const shares = a === b ? [[a, graceA + graceB]] : [[a, graceA], [b, graceB]];
      for (const [saint, grace] of shares) {
        const before = saint.level;
        saint.addGrace(grace);
        if (saint.level > before) {
          levelUps.push(saint.name);
          log.push("⬆️ " + saint.name + " is filled with Grace and rises to Level " + saint.level + "!");
        }
      }

      const graceAwarded = {};
      if (a === b) {
        graceAwarded[a.name] = graceA + graceB; // battling oneself: combined share
      } else {
        graceAwarded[a.name] = graceA;
        graceAwarded[b.name] = graceB; // same-name mirror (distinct instances): side B's share shown
      }

      return {
        winner: winner,
        loser: loser,
        draw: draw,
        reason: log.join(" "),
        log: log,
        graceAwarded: graceAwarded,
        levelUps: levelUps,
        scores: { a: scoreA, b: scoreB },
      };
    }
  }

  /* ---------------------------------------------------------- */

  function topVirtue(stats) {
    let best = { name: VIRTUE_NAMES[0], value: stats[VIRTUE_NAMES[0]] };
    for (const v of VIRTUE_NAMES) {
      if (stats[v] > best.value) best = { name: v, value: stats[v] };
    }
    return best;
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  /* ---------------------------------------------------------- */

  const api = { Saint, Deck, Battle, DECK_SIZE, MAX_COPIES, GRACE_TO_LEVEL, MAX_LEVEL };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    Object.assign(root, api);
  }
})(typeof window !== "undefined" ? window : globalThis);
