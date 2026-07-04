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
          RARITY_UNLOCK: root.RARITY_UNLOCK,
        };

  const { SAINT_DATA, SIN_DATA, SEVERITY_TIERS, VIRTUE_NAMES, RARITY_BONUS, RARITY_DULIA, RARITY_UNLOCK } = data;

  const MAX_VIRTUE = 10;
  const STARTING_VIRTUE = 3;
  const MAX_RESOLVE = 3;
  const STARTING_DULIA = 12;
  const STARTER_SAINT = "St. Jude"; // the patron of lost causes walks with every new pilgrim
  const TRIALS_PER_PILGRIMAGE = 7;
  const COMPLETION_GRACE_BONUS = 7;
  const COMPLETION_DULIA_BONUS = 5;
  const PATRON_BONUS = 2;
  const DOMINION_MAX = 5;

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
      this.unlockCost = RARITY_UNLOCK[def.rarity] || 8;
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
    constructor(def, severityName, dominion, rng) {
      rng = rng || Math.random;
      this.name = def.name;
      this.emblem = def.emblem;
      this.virtue = def.virtue; // the countering virtue it assails
      this.flavor = def.flavor;
      const tier = SEVERITY_TIERS.find((t) => t.name === severityName) || SEVERITY_TIERS[0];
      this.severity = tier.name; // "Venial" | "Grave" | "Mortal"
      this.gracePrize = tier.grace;
      this.duliaPrize = tier.dulia;
      // Dominion: how much stronger this sin has grown from the
      // pilgrim's past falls to it (+1 power per fall).
      this.dominion = Math.max(0, dominion || 0);
      // Power is rolled when the sin manifests and shown to the player.
      this.power = tier.basePower + this.dominion + 1 + Math.floor(rng() * 4);
    }

    toJSON() {
      return { name: this.name, severity: this.severity, power: this.power, dominion: this.dominion };
    }

    static fromJSON(json, rng) {
      const def = SIN_DATA.find((d) => d.name === json.name) || SIN_DATA[0];
      const sin = new Sin(def, json.severity, json.dominion || 0, rng);
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
      // Dulia: persistent devotion, earned by overcoming trials.
      // Spent both to unlock saints and to invoke them.
      this.dulia = typeof state.dulia === "number" ? Math.max(0, state.dulia) : STARTING_DULIA;
      this.unlockedSaints =
        Array.isArray(state.unlockedSaints) && state.unlockedSaints.length > 0
          ? state.unlockedSaints.slice()
          : [STARTER_SAINT];
      // Dominion: per-sin strength grown from the pilgrim's falls.
      this.dominion = {};
      for (const s of SIN_DATA) {
        this.dominion[s.name] = Math.max(0, (state.dominion && state.dominion[s.name]) || 0);
      }
      this.stats = Object.assign(
        { pilgrimages: 0, completed: 0, sinsBanished: 0, trialsFaced: 0 },
        state.stats || {}
      );
    }

    isUnlocked(saintName) {
      return this.unlockedSaints.indexOf(saintName) !== -1;
    }

    /** Spend Dulia to permanently unlock a saint. Returns { ok, error }. */
    unlockSaint(saint) {
      if (this.isUnlocked(saint.name)) return { ok: false, error: saint.name + " already walks with you." };
      if (this.dulia < saint.unlockCost) {
        return {
          ok: false,
          error: "Not enough Dulia to unlock " + saint.name + " (need ✠" + saint.unlockCost + ", have ✠" + this.dulia + ").",
        };
      }
      this.dulia -= saint.unlockCost;
      this.unlockedSaints.push(saint.name);
      return { ok: true };
    }

    addDulia(points) {
      this.dulia += Math.max(0, points);
      return this.dulia;
    }

    dominionOf(sinName) {
      return this.dominion[sinName] || 0;
    }

    /** A fall: the sin grows more powerful and more probable (cap 5). */
    recordFall(sinName) {
      this.dominion[sinName] = Math.min(DOMINION_MAX, this.dominionOf(sinName) + 1);
      return this.dominion[sinName];
    }

    /** A triumph loosens the sin's hold (min 0). */
    easeDominion(sinName) {
      this.dominion[sinName] = Math.max(0, this.dominionOf(sinName) - 1);
      return this.dominion[sinName];
    }

    /** Grace cost to raise a virtue by one point: its current value. */
    raiseCost(virtueName) {
      return this.virtues[virtueName];
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
        dulia: this.dulia,
        unlockedSaints: this.unlockedSaints.slice(),
        dominion: Object.assign({}, this.dominion),
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

        if (saint.abilityKey === "demetrius" && tested === "Patience") {
          defense += 2;
          log.push("🛡️ The trial tests Patience — " + saint.name + "'s Warrior's Stand grants +2 (defense " + defense + ").");
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
      let grace = victory ? this.sin.gracePrize : 2;
      let resolveRestored = 0;

      if (victory) {
        log.push("☩ You are strengthened: +" + grace + " Grace.");
      } else {
        log.push("☩ Even in defeat there is a lesson: +2 Grace.");
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
     A run of seven trials with severity escalating along the
     road: trials 1–3 Venial, 4–5 Grave, 6–7 Mortal. Which sin
     manifests is a weighted draw — sins the pilgrim has fallen
     to carry Dominion, making them more powerful AND more
     probable. Overcoming a sin eases its Dominion.             */

  class Pilgrimage {
    constructor(pilgrim, rng) {
      this.pilgrim = pilgrim;
      this.rng = rng || Math.random;
      this.trialNumber = 1;
      this.resolve = MAX_RESOLVE; // hearts
      // Contrition: setting out anew, every sin's grip loosens a little.
      this.contrition = false;
      for (const s of SIN_DATA) {
        if (pilgrim.dominionOf(s.name) > 0) {
          pilgrim.easeDominion(s.name);
          this.contrition = true;
        }
      }
      this.currentSin = this._manifest();
      this.outcome = null; // null while walking | "completed" | "fallen"
      pilgrim.stats.pilgrimages += 1;
    }

    severityFor(trialNumber) {
      if (trialNumber <= 3) return "Venial";
      if (trialNumber <= 5) return "Grave";
      return "Mortal";
    }

    /** Weighted draw: weight = 2 + the sin's Dominion. */
    _manifest() {
      const weights = SIN_DATA.map((d) => 2 + this.pilgrim.dominionOf(d.name));
      const total = weights.reduce((a, b) => a + b, 0);
      let roll = this.rng() * total;
      let def = SIN_DATA[SIN_DATA.length - 1];
      for (let i = 0; i < SIN_DATA.length; i++) {
        roll -= weights[i];
        if (roll < 0) { def = SIN_DATA[i]; break; }
      }
      return new Sin(def, this.severityFor(this.trialNumber), this.pilgrim.dominionOf(def.name), this.rng);
    }

    /** Can this saint be invoked right now? (unlocked + affordable) */
    canInvoke(saint) {
      return this.pilgrim.isUnlocked(saint.name) && saint.duliaCost <= this.pilgrim.dulia;
    }

    /**
     * Face the current sin, optionally with a saint (null = alone).
     * Deducts Dulia, resolves the trial, advances the road.
     * Returns the trial result plus pilgrimage bookkeeping.
     */
    faceTrial(saint) {
      if (this.outcome) throw new Error("The pilgrimage is over.");
      if (saint && !this.pilgrim.isUnlocked(saint.name)) {
        return { error: saint.name + " has not yet been unlocked (✠" + saint.unlockCost + " in the Library)." };
      }
      if (saint && saint.duliaCost > this.pilgrim.dulia) {
        return { error: "Not enough Dulia to invoke " + saint.name + " (needs ✠" + saint.duliaCost + ")." };
      }

      if (saint) this.pilgrim.dulia -= saint.duliaCost;
      const sinName = this.currentSin.name;
      const result = new Trial(this.pilgrim, this.currentSin, saint, this.rng).resolve();

      if (result.victory) {
        // Overcoming a strengthened sin pays a bounty: +1 Dulia per Dominion.
        const bounty = this.currentSin.dominion;
        this.pilgrim.addDulia(this.currentSin.duliaPrize + bounty);
        result.log.push(
          "✠ Your devotion deepens: +" + this.currentSin.duliaPrize + " Dulia" +
            (bounty > 0 ? " (+" + bounty + " bounty for so mighty a foe)" : "") + "."
        );
        if (this.pilgrim.dominionOf(sinName) > 0) {
          const d = this.pilgrim.easeDominion(sinName);
          result.log.push("⛓️ " + sinName + "'s hold over you weakens (Dominion " + d + ").");
        }
      } else {
        this.resolve -= 1;
        result.log.push("❤️ You lose 1 Resolve (" + this.resolve + " remaining).");
        const d = this.pilgrim.recordFall(sinName);
        result.log.push(
          "⛓️ Your fall feeds " + sinName + " — it grows more powerful and more likely to return (Dominion " + d + ")."
        );
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
        this.pilgrim.addDulia(COMPLETION_DULIA_BONUS);
        this.pilgrim.stats.completed += 1;
        // A completed pilgrimage purifies: every sin's Dominion eases by 1.
        let eased = false;
        for (const s of SIN_DATA) {
          if (this.pilgrim.dominionOf(s.name) > 0) { this.pilgrim.easeDominion(s.name); eased = true; }
        }
        result.log.push(
          "🌟 The seventh trial is past — the pilgrimage is complete! +" +
            COMPLETION_GRACE_BONUS + " bonus Grace, +" + COMPLETION_DULIA_BONUS + " bonus Dulia." +
            (eased ? " The journey purifies: every sin's Dominion eases by 1." : "")
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
      pg.currentSin = Sin.fromJSON(json.currentSin, pg.rng);
      pg.outcome = json.outcome || null;
      return pg;
    }
  }

  /* ---------------------------------------------------------- */

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
    STARTER_SAINT,
    TRIALS_PER_PILGRIMAGE,
    PATRON_BONUS,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    Object.assign(root, api);
  }
})(typeof window !== "undefined" ? window : globalThis);
