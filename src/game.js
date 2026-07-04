/* ============================================================
   HAGIMON — Core Game Logic
   The pilgrim walks a Pilgrimage of seven Trials, one for
   each deadly sin, invoking saints for intercession.

   Classes: Saint, Sin, Pilgrim, Trial, Pilgrimage.
   No dependencies beyond data.js. Works in browser and Node.
   ============================================================ */

(function (root) {
  "use strict";

  const data =
    typeof module !== "undefined" && module.exports
      ? require("./data.js")
      : {
          SAINT_DATA: root.SAINT_DATA,
          SIN_DATA: root.SIN_DATA,
          SEVERITY_TIERS: root.SEVERITY_TIERS,
          VIRTUE_NAMES: root.VIRTUE_NAMES,
          RARITY_BONUS: root.RARITY_BONUS,
          RARITY_DULIA: root.RARITY_DULIA,
        };

  const { SAINT_DATA, SIN_DATA, SEVERITY_TIERS, VIRTUE_NAMES, RARITY_BONUS, RARITY_DULIA } = data;

  const MAX_VIRTUE = 10;
  const STARTING_VIRTUE = 3;
  const MAX_RESOLVE = 3;
  const STARTING_DULIA = 10;
  const DULIA_PER_VICTORY = 2;
  const TRIALS_PER_PILGRIMAGE = 7;
  const COMPLETION_GRACE_BONUS = 7;
  const PATRON_BONUS = 2;

  /* ------------------------- Saint -------------------------- */

  class Saint {
    constructor(def) {
      this.name = def.name;
      this.title = def.title || "";
      this.emblem = def.emblem || "✨";
      this.rarity = def.rarity; // "Common" | "Blessed" | "Canonized"
      this.virtues = Object.assign({}, def.baseStats);
      this.specialAbility = def.ability;
      this.abilityKey = def.abilityKey;
      this.patronSin = def.patronSin;
      this.patronage = def.patronage;
      this.duliaCost = RARITY_DULIA[def.rarity] || 2;
    }

    /** Virtues with the rarity bonus applied (may exceed 10). */
    getStatsWithRarity() {
      const bonus = RARITY_BONUS[this.rarity] || 0;
      const out = {};
      for (const v of VIRTUE_NAMES) out[v] = this.virtues[v] + bonus;
      return out;
    }

    /** Highest rarity-boosted virtue → { name, value } */
    getDominantVirtue() {
      const stats = this.getStatsWithRarity();
      let best = { name: VIRTUE_NAMES[0], value: stats[VIRTUE_NAMES[0]] };
      for (const v of VIRTUE_NAMES) {
        if (stats[v] > best.value) best = { name: v, value: stats[v] };
      }
      return best;
    }

    /** The intercession this saint lends when a given virtue is tested. */
    intercessionFor(virtueName) {
      return this.getStatsWithRarity()[virtueName];
    }

    toJSON() {
      return {
        name: this.name,
        rarity: this.rarity,
        virtues: Object.assign({}, this.virtues),
        specialAbility: this.specialAbility,
        patronSin: this.patronSin,
        patronage: this.patronage,
        duliaCost: this.duliaCost,
      };
    }
  }

  /* -------------------------- Sin --------------------------- */

  class Sin {
    constructor(def, severityName, rng) {
      rng = rng || Math.random;
      this.name = def.name;
      this.emblem = def.emblem;
      this.virtue = def.virtue; // the countering virtue it assails
      this.flavor = def.flavor;
      const tier = SEVERITY_TIERS.find((t) => t.name === severityName) || SEVERITY_TIERS[0];
      this.severity = tier.name; // "Venial" | "Grave" | "Mortal"
      this.gracePrize = tier.grace;
      // Power is rolled when the sin manifests and shown to the player.
      this.power = tier.basePower + 1 + Math.floor(rng() * 4);
    }

    toJSON() {
      return { name: this.name, severity: this.severity, power: this.power };
    }

    static fromJSON(json, rng) {
      const def = SIN_DATA.find((d) => d.name === json.name) || SIN_DATA[0];
      const sin = new Sin(def, json.severity, rng);
      sin.power = json.power;
      return sin;
    }
  }

  /* ------------------------ Pilgrim ------------------------- */

  class Pilgrim {
    constructor(state) {
      state = state || {};
      this.virtues = {};
      for (const v of VIRTUE_NAMES) {
        this.virtues[v] = clamp((state.virtues && state.virtues[v]) || STARTING_VIRTUE, 1, MAX_VIRTUE);
      }
      this.grace = Math.max(0, state.grace || 0);
      this.stats = Object.assign(
        { pilgrimages: 0, completed: 0, sinsBanished: 0, trialsFaced: 0 },
        state.stats || {}
      );
    }

    /** Grace cost to raise a virtue by one point: the value being reached. */
    raiseCost(virtueName) {
      return this.virtues[virtueName] + 1;
    }

    /** Spend Grace to raise a virtue. Returns { ok, error }. */
    raiseVirtue(virtueName) {
      if (!(virtueName in this.virtues)) return { ok: false, error: "Unknown virtue." };
      if (this.virtues[virtueName] >= MAX_VIRTUE) {
        return { ok: false, error: virtueName + " is already perfected (10)." };
      }
      const cost = this.raiseCost(virtueName);
      if (this.grace < cost) {
        return { ok: false, error: "Not enough Grace (need " + cost + ", have " + this.grace + ")." };
      }
      this.grace -= cost;
      this.virtues[virtueName] += 1;
      return { ok: true, cost: cost, value: this.virtues[virtueName] };
    }

    addGrace(points) {
      this.grace += Math.max(0, points);
      return this.grace;
    }

    toJSON() {
      return {
        virtues: Object.assign({}, this.virtues),
        grace: this.grace,
        stats: Object.assign({}, this.stats),
      };
    }
  }

  /* ------------------------- Trial --------------------------
     One confrontation: the pilgrim, assailed by a sin, with
     (optionally) one saint interceding.                        */

  class Trial {
    constructor(pilgrim, sin, saint, rng) {
      this.pilgrim = pilgrim;
      this.sin = sin;
      this.saint = saint || null; // null = face it alone
      this.rng = rng || Math.random;
    }

    /**
     * Resolve the trial.
     * Returns { victory, defense, power, log[], graceEarned,
     *           resolveRestored, providence }
     */
    resolve() {
      const p = this.pilgrim;
      const sin = this.sin;
      const saint = this.saint;
      const log = [];
      const tested = sin.virtue;

      log.push(
        sin.emblem + " " + sin.name + " (" + sin.severity + ", power " + sin.power +
          ") assails your " + tested + "."
      );

      // --- St. Peter: Venial sins are banished outright ------
      if (saint && saint.abilityKey === "peter" && sin.severity === "Venial") {
        log.push("🗝️ " + saint.name + " turns the Keys of the Kingdom — the venial sin is banished outright.");
        return this._finish(true, sin.power, sin.power, log, 0);
      }

      // --- Sin's effective power ------------------------------
      let power = sin.power;
      if (saint && saint.abilityKey === "cecilia") {
        power -= 2;
        log.push("🎵 " + saint.name + "'s Song of Heaven weakens the tempter: power falls to " + power + ".");
      }

      // --- Build the defense ----------------------------------
      let defense = p.virtues[tested];
      log.push("🚶 Your " + tested + " stands at " + defense + ".");

      if (saint) {
        const aid = saint.intercessionFor(tested);
        defense += aid;
        log.push(
          saint.emblem + " " + saint.name + " intercedes, lending " + tested + " " + aid +
            " (defense " + defense + ")."
        );

        if (saint.patronSin === sin.name) {
          defense += PATRON_BONUS;
          log.push(
            "✨ " + saint.name + " is invoked against " + sin.name + " above all — patron bonus +" +
              PATRON_BONUS + " (defense " + defense + ")."
          );
        }

        if (saint.abilityKey === "michael" && sin.severity !== "Venial") {
          defense += 3;
          log.push("⚔️ Against so grave a foe, the Sword of Justice grants +3 (defense " + defense + ").");
        }

        if (saint.abilityKey === "augustine" && p.virtues[tested] <= 4) {
          defense += 2;
          log.push("📖 Grace perfects weakness — " + saint.name + "'s Restless Heart grants +2 (defense " + defense + ").");
        }

        if (saint.abilityKey === "demetrius" && tested === "Fortitude") {
          defense += 2;
          log.push("🛡️ The trial tests Fortitude — " + saint.name + "'s Warrior's Stand grants +2 (defense " + defense + ").");
        }
      } else {
        log.push("⚠️ You face the sin alone, with no intercession.");
      }

      // Providence: an unseen hand (rolled at the end of the tally)
      const providence = 1 + Math.floor(this.rng() * 4);
      defense += providence;
      log.push("🙏 Providence favors you +" + providence + " (defense " + defense + ").");

      // --- Last-hope abilities --------------------------------
      if (saint && saint.abilityKey === "jude" && power - defense >= 3) {
        defense += 2;
        log.push("🕯️ A lost cause! " + saint.name + " intercedes for the hopeless: +2 (defense " + defense + ").");
      }

      if (saint && saint.abilityKey === "joan" && defense < power) {
        const surge = 1 + Math.floor(this.rng() * 3);
        defense += surge;
        log.push("🚩 " + saint.name + " hears her Voices and charges again: +" + surge + " (defense " + defense + ").");
      }

      // --- Verdict ---------------------------------------------
      let victory;
      if (defense > power) {
        victory = true;
        log.push("✨ The temptation breaks — " + sin.name + " is banished, " + defense + " to " + power + ".");
      } else if (defense === power && saint && saint.abilityKey === "catherine") {
        victory = true;
        log.push("☸️ Perfectly matched at " + defense + " — " + saint.name + "'s Unbroken Wheel turns the tie to victory.");
      } else if (defense === power) {
        victory = false;
        log.push("⚖️ Perfectly matched at " + defense + " — but the sin's grip holds. The trial is lost.");
      } else {
        victory = false;
        log.push("💔 " + sin.name + " prevails, " + power + " to " + defense + ". You stumble, but the road goes on.");
      }

      return this._finish(victory, defense, power, log, providence);
    }

    /** Award grace, apply post-trial abilities, update records. */
    _finish(victory, defense, power, log, providence) {
      const p = this.pilgrim;
      const saint = this.saint;
      let grace = victory ? this.sin.gracePrize : 1;
      let resolveRestored = 0;

      if (victory) {
        log.push("☩ You are strengthened: +" + grace + " Grace.");
      } else {
        log.push("☩ Even in defeat there is a lesson: +1 Grace.");
      }

      if (saint && saint.abilityKey === "francis") {
        grace += 1;
        log.push("🕊️ " + saint.name + " sings the Canticle of Creation: +1 bonus Grace.");
      }

      if (victory && saint && saint.abilityKey === "theresa") {
        resolveRestored = 1;
        log.push("🌹 " + saint.name + "'s Little Way restores 1 Resolve.");
      }

      p.addGrace(grace);
      p.stats.trialsFaced += 1;
      if (victory) p.stats.sinsBanished += 1;

      return {
        victory: victory,
        defense: defense,
        power: power,
        providence: providence,
        log: log,
        graceEarned: grace,
        resolveRestored: resolveRestored,
      };
    }
  }

  /* ---------------------- Pilgrimage ------------------------
     A run of seven trials — every deadly sin exactly once, in
     random order, with severity escalating along the road:
     trials 1–3 Venial, 4–5 Grave, 6–7 Mortal.                  */

  class Pilgrimage {
    constructor(pilgrim, rng) {
      this.pilgrim = pilgrim;
      this.rng = rng || Math.random;
      this.trialNumber = 1;
      this.resolve = MAX_RESOLVE; // hearts
      this.dulia = STARTING_DULIA;
      this.sinOrder = shuffle(SIN_DATA.map((s) => s.name), this.rng);
      this.currentSin = this._manifest();
      this.outcome = null; // null while walking | "completed" | "fallen"
      pilgrim.stats.pilgrimages += 1;
    }

    severityFor(trialNumber) {
      if (trialNumber <= 3) return "Venial";
      if (trialNumber <= 5) return "Grave";
      return "Mortal";
    }

    _manifest() {
      const def = SIN_DATA.find((d) => d.name === this.sinOrder[this.trialNumber - 1]);
      return new Sin(def, this.severityFor(this.trialNumber), this.rng);
    }

    /** Saints affordable right now. */
    canAfford(saint) {
      return saint.duliaCost <= this.dulia;
    }

    /**
     * Face the current sin, optionally with a saint (null = alone).
     * Deducts Dulia, resolves the trial, advances the road.
     * Returns the trial result plus pilgrimage bookkeeping.
     */
    faceTrial(saint) {
      if (this.outcome) throw new Error("The pilgrimage is over.");
      if (saint && !this.canAfford(saint)) {
        return { error: "Not enough Dulia to invoke " + saint.name + " (needs " + saint.duliaCost + ")." };
      }

      if (saint) this.dulia -= saint.duliaCost;
      const result = new Trial(this.pilgrim, this.currentSin, saint, this.rng).resolve();

      if (result.victory) {
        this.dulia += DULIA_PER_VICTORY;
        result.log.push("✠ Your devotion deepens: +" + DULIA_PER_VICTORY + " Dulia.");
      } else {
        this.resolve -= 1;
        result.log.push("❤️ You lose 1 Resolve (" + this.resolve + " remaining).");
      }
      if (result.resolveRestored) {
        this.resolve = Math.min(MAX_RESOLVE, this.resolve + result.resolveRestored);
      }

      // Advance the road
      if (this.resolve <= 0) {
        this.outcome = "fallen";
        result.log.push("🌑 Your Resolve is spent. The pilgrimage ends here — but Grace earned is never lost.");
      } else if (this.trialNumber >= TRIALS_PER_PILGRIMAGE) {
        this.outcome = "completed";
        this.pilgrim.addGrace(COMPLETION_GRACE_BONUS);
        this.pilgrim.stats.completed += 1;
        result.log.push(
          "🌟 The seventh trial is past — the pilgrimage is complete! +" +
            COMPLETION_GRACE_BONUS + " bonus Grace."
        );
      } else {
        this.trialNumber += 1;
        this.currentSin = this._manifest();
      }

      result.outcome = this.outcome;
      return result;
    }

    toJSON() {
      return {
        trialNumber: this.trialNumber,
        resolve: this.resolve,
        dulia: this.dulia,
        sinOrder: this.sinOrder.slice(),
        currentSin: this.currentSin.toJSON(),
        outcome: this.outcome,
      };
    }

    static fromJSON(json, pilgrim, rng) {
      const pg = Object.create(Pilgrimage.prototype);
      pg.pilgrim = pilgrim;
      pg.rng = rng || Math.random;
      pg.trialNumber = json.trialNumber;
      pg.resolve = json.resolve;
      pg.dulia = json.dulia;
      pg.sinOrder = json.sinOrder.slice();
      pg.currentSin = Sin.fromJSON(json.currentSin, pg.rng);
      pg.outcome = json.outcome || null;
      return pg;
    }
  }

  /* ---------------------------------------------------------- */

  function shuffle(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  /* ---------------------------------------------------------- */

  const api = {
    Saint,
    Sin,
    Pilgrim,
    Trial,
    Pilgrimage,
    MAX_VIRTUE,
    STARTING_VIRTUE,
    MAX_RESOLVE,
    STARTING_DULIA,
    TRIALS_PER_PILGRIMAGE,
    PATRON_BONUS,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    Object.assign(root, api);
  }
})(typeof window !== "undefined" ? window : globalThis);
