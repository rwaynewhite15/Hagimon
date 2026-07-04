/* ============================================================
   HAGIMON — Core Game Logic
   Each pilgrimage is a complete, self-contained game. The seven
   deadly sins begin in a pool, each with Power (how strong they
   are) and Prevalence (how likely they are to be called). Win a
   trial and the sin's power breaks by your margin of victory;
   lose and it grows stronger and more prevalent — and costs you
   one of three Resolve. Drive every sin's power to zero to
   triumph. Nothing carries over between pilgrimages.

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

  // The sin pool
  const SIN_START_POWER = 12;
  const SIN_START_PREVALENCE = 3;
  const SIN_POWER_CAP = 18;
  const SIN_PREVALENCE_CAP = 9;
  const SIN_GROWTH_ON_LOSS = 2; // power gained when the pilgrim falls
  const SIN_SPREAD_ON_LOSS = 2; // prevalence gained when the pilgrim falls
  const DAMAGE_CAP = 4; // max power broken by one victory
  const PETER_DAMAGE = 3; // Keys of the Kingdom auto-success breaks this much

  const PATRON_BONUS = 2;

  function severityForPower(power) {
    for (const tier of SEVERITY_TIERS) {
      if (power <= tier.maxPower) return tier;
    }
    return SEVERITY_TIERS[SEVERITY_TIERS.length - 1];
  }

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
      this.duliaCost = RARITY_DULIA[def.rarity] || 1;
      this.unlockCost = RARITY_UNLOCK[def.rarity] || 6;
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
        unlockCost: this.unlockCost,
      };
    }
  }

  /* -------------------------- Sin ---------------------------
     A manifestation of a sin from the pool, at its current
     power. Severity is a live label for that power.            */

  class Sin {
    constructor(def, power) {
      this.name = def.name;
      this.emblem = def.emblem;
      this.virtue = def.virtue; // the countering virtue it assails
      this.flavor = def.flavor;
      this.power = Math.max(0, power);
      const tier = severityForPower(this.power);
      this.severity = tier.name; // "Venial" | "Grave" | "Mortal"
      this.gracePrize = tier.grace;
      this.duliaPrize = tier.dulia;
    }

    toJSON() {
      return { name: this.name, power: this.power };
    }

    static fromJSON(json) {
      const def = SIN_DATA.find((d) => d.name === json.name) || SIN_DATA[0];
      return new Sin(def, json.power);
    }
  }

  /* ------------------------ Pilgrim -------------------------
     The pilgrim's build for ONE pilgrimage: virtues, Grace,
     Dulia, and unlocked saints. A new pilgrimage starts fresh.  */

  class Pilgrim {
    constructor(state) {
      state = state || {};
      this.virtues = {};
      for (const v of VIRTUE_NAMES) {
        this.virtues[v] = clamp((state.virtues && state.virtues[v]) || STARTING_VIRTUE, 1, MAX_VIRTUE);
      }
      this.grace = Math.max(0, state.grace || 0);
      this.dulia = typeof state.dulia === "number" ? Math.max(0, state.dulia) : STARTING_DULIA;
      this.unlockedSaints =
        Array.isArray(state.unlockedSaints) && state.unlockedSaints.length > 0
          ? state.unlockedSaints.slice()
          : [STARTER_SAINT];
    }

    isUnlocked(saintName) {
      return this.unlockedSaints.indexOf(saintName) !== -1;
    }

    /** Spend Dulia to unlock a saint for this pilgrimage. Returns { ok, error }. */
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

    /** Grace cost to raise a virtue by one point: its current value. */
    raiseCost(virtueName) {
      return this.virtues[virtueName];
    }

    /** Spend Grace to raise a virtue for this pilgrimage. Returns { ok, error }. */
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
      };
    }
  }

  /* ------------------------- Trial --------------------------
     One confrontation: the pilgrim, assailed by a sin at its
     current power, with (optionally) one saint interceding.     */

  class Trial {
    constructor(pilgrim, sin, saint, rng) {
      this.pilgrim = pilgrim;
      this.sin = sin;
      this.saint = saint || null; // null = face it alone
      this.rng = rng || Math.random;
    }

    /**
     * Resolve the trial.
     * Returns { victory, defense, power, damage, log[],
     *           graceEarned, resolveRestored, providence }
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

      // --- St. Peter: Venial-band sins fall outright ----------
      if (saint && saint.abilityKey === "peter" && sin.severity === "Venial") {
        log.push(
          "🗝️ " + saint.name + " turns the Keys of the Kingdom — the weakened sin cannot stand. " +
            "Its power breaks by " + PETER_DAMAGE + "."
        );
        return this._finish(true, sin.power, sin.power, PETER_DAMAGE, log, 0);
      }

      // --- Sin's effective power for this trial ---------------
      let power = sin.power;
      if (saint && saint.abilityKey === "cecilia") {
        power = Math.max(1, power - 2);
        log.push("🎵 " + saint.name + "'s Song of Heaven weakens the tempter: power falls to " + power + " for this trial.");
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
      let damage = 0;
      if (defense > power) {
        victory = true;
        damage = clamp(defense - power, 1, DAMAGE_CAP);
        log.push(
          "✨ The temptation breaks, " + defense + " to " + power +
            " — " + sin.name + "'s power is broken by " + damage + "."
        );
      } else if (defense === power && saint && saint.abilityKey === "catherine") {
        victory = true;
        damage = 1;
        log.push(
          "☸️ Perfectly matched at " + defense + " — " + saint.name +
            "'s Unbroken Wheel turns the tie to victory. " + sin.name + "'s power is broken by 1."
        );
      } else if (defense === power) {
        victory = false;
        log.push("⚖️ Perfectly matched at " + defense + " — but the sin's grip holds. The trial is lost.");
      } else {
        victory = false;
        log.push("💔 " + sin.name + " prevails, " + power + " to " + defense + ". You stumble, but the road goes on.");
      }

      return this._finish(victory, defense, power, damage, log, providence);
    }

    /** Award grace, apply post-trial abilities. */
    _finish(victory, defense, power, damage, log, providence) {
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

      return {
        victory: victory,
        defense: defense,
        power: power,
        damage: damage,
        providence: providence,
        log: log,
        graceEarned: grace,
        resolveRestored: resolveRestored,
      };
    }
  }

  /* ---------------------- Pilgrimage ------------------------
     One complete game. The pool holds every sin's current Power
     and Prevalence. Trials continue until every sin's power is
     broken to zero (triumphant) or Resolve runs out (fallen).   */

  class Pilgrimage {
    constructor(pilgrim, rng) {
      this.pilgrim = pilgrim;
      this.rng = rng || Math.random;
      this.trialNumber = 1;
      this.resolve = MAX_RESOLVE; // hearts
      this.pool = SIN_DATA.map((d) => ({
        name: d.name,
        power: SIN_START_POWER,
        prevalence: SIN_START_PREVALENCE,
      }));
      this.currentSin = this._manifest();
      this.outcome = null; // null while walking | "triumphant" | "fallen"
    }

    /** Sins still standing (power > 0). */
    activeSins() {
      return this.pool.filter((e) => e.power > 0);
    }

    vanquishedCount() {
      return this.pool.length - this.activeSins().length;
    }

    poolEntry(sinName) {
      return this.pool.find((e) => e.name === sinName);
    }

    /** Weighted draw among standing sins: weight = prevalence. */
    _manifest() {
      const active = this.activeSins();
      if (active.length === 0) return null;
      const total = active.reduce((a, e) => a + e.prevalence, 0);
      let roll = this.rng() * total;
      let entry = active[active.length - 1];
      for (const e of active) {
        roll -= e.prevalence;
        if (roll < 0) { entry = e; break; }
      }
      const def = SIN_DATA.find((d) => d.name === entry.name);
      return new Sin(def, entry.power);
    }

    /** Can this saint be invoked right now? (unlocked + affordable) */
    canInvoke(saint) {
      return this.pilgrim.isUnlocked(saint.name) && saint.duliaCost <= this.pilgrim.dulia;
    }

    /**
     * Face the current sin, optionally with a saint (null = alone).
     * Deducts Dulia, resolves the trial, updates the pool.
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
      const entry = this.poolEntry(this.currentSin.name);
      const result = new Trial(this.pilgrim, this.currentSin, saint, this.rng).resolve();

      if (result.victory) {
        this.pilgrim.addDulia(this.currentSin.duliaPrize);
        result.log.push("✠ Your devotion deepens: +" + this.currentSin.duliaPrize + " Dulia.");
        entry.power = Math.max(0, entry.power - result.damage);
        entry.prevalence = Math.max(1, entry.prevalence - 1);
        if (entry.power === 0) {
          result.log.push("🌟 " + entry.name + " is VANQUISHED — its power is utterly broken!");
        } else {
          result.log.push(
            "📉 " + entry.name + " retreats: power " + entry.power + ", prevalence " + entry.prevalence + "."
          );
        }
      } else {
        this.resolve -= 1;
        result.log.push("❤️ You lose 1 Resolve (" + this.resolve + " remaining).");
        entry.power = Math.min(SIN_POWER_CAP, entry.power + SIN_GROWTH_ON_LOSS);
        entry.prevalence = Math.min(SIN_PREVALENCE_CAP, entry.prevalence + SIN_SPREAD_ON_LOSS);
        result.log.push(
          "📈 Your fall feeds " + entry.name + ": power " + entry.power + ", prevalence " + entry.prevalence + "."
        );
      }
      if (result.resolveRestored) {
        this.resolve = Math.min(MAX_RESOLVE, this.resolve + result.resolveRestored);
      }

      // End states, then the road continues
      if (this.resolve <= 0) {
        this.outcome = "fallen";
        result.log.push("🌑 Your Resolve is spent. This pilgrimage ends — the next begins anew.");
      } else if (this.activeSins().length === 0) {
        this.outcome = "triumphant";
        result.log.push("🎺 ALL SEVEN SINS ARE VANQUISHED — the pilgrimage is TRIUMPHANT!");
      } else {
        this.trialNumber += 1;
        this.currentSin = this._manifest();
      }

      result.outcome = this.outcome;
      result.vanquished = this.vanquishedCount();
      return result;
    }

    toJSON() {
      return {
        trialNumber: this.trialNumber,
        resolve: this.resolve,
        pool: this.pool.map((e) => ({ name: e.name, power: e.power, prevalence: e.prevalence })),
        currentSin: this.currentSin ? this.currentSin.toJSON() : null,
        outcome: this.outcome,
      };
    }

    static fromJSON(json, pilgrim, rng) {
      const pg = Object.create(Pilgrimage.prototype);
      pg.pilgrim = pilgrim;
      pg.rng = rng || Math.random;
      pg.trialNumber = json.trialNumber;
      pg.resolve = json.resolve;
      pg.pool = (json.pool || []).map((e) => ({ name: e.name, power: e.power, prevalence: e.prevalence }));
      pg.currentSin = json.currentSin ? Sin.fromJSON(json.currentSin) : null;
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
    severityForPower,
    MAX_VIRTUE,
    STARTING_VIRTUE,
    MAX_RESOLVE,
    STARTING_DULIA,
    STARTER_SAINT,
    SIN_START_POWER,
    SIN_START_PREVALENCE,
    SIN_POWER_CAP,
    SIN_PREVALENCE_CAP,
    DAMAGE_CAP,
    PATRON_BONUS,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    Object.assign(root, api);
  }
})(typeof window !== "undefined" ? window : globalThis);
