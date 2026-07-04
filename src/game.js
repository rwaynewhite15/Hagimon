/* ============================================================
   HAGIMON — Core Game Logic
   Each pilgrimage is a complete, self-contained game. The seven
   deadly sins begin in a pool, each with Power (how strong they
   are) and Prevalence (how likely they are to be called). Each
   turn, up to three sins manifest — the pilgrim chooses which
   to face and which saint to invoke. Win and the sin's power
   breaks by the margin of victory; lose and it grows stronger
   and more prevalent, and costs one of three Resolve. Sin also
   festers with time: every 5th trial, all standing sins grow.
   Drive every sin's power to zero to triumph.

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
  const STARTING_DULIA = 10;
  const STARTER_SAINT = "St. Jude"; // the patron of lost causes walks with every new pilgrim

  // The sin pool
  const SIN_START_POWER = 13;
  const SIN_START_PREVALENCE = 3;
  const SIN_POWER_CAP = 18;
  const SIN_PREVALENCE_CAP = 9;
  const SIN_GROWTH_ON_LOSS = 2; // power gained when the pilgrim falls
  const SIN_SPREAD_ON_LOSS = 2; // prevalence gained when the pilgrim falls
  const DAMAGE_CAP = 4; // max power broken by one victory
  const PETER_DAMAGE = 3; // Keys of the Kingdom auto-success breaks this much

  // The turn structure
  const MANIFEST_COUNT = 3; // sins that crowd around the pilgrim each turn
  const FESTER_INTERVAL = 4; // every Nth trial, sin festers...
  const FESTER_GROWTH = 1; // ...all standing sins gain this much power
  const SPURNED_SPREAD = 1; // manifested sins left unfaced grow this much bolder (prevalence)
  const REST_TRIALS = 1; // a saint who intercedes rests for the next trial
  const PLEAD_COST = 3; // grace to re-roll providence after a losing trial

  const PROVIDENCE_MIN = 1;
  const PROVIDENCE_MAX = 4;
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
     One confrontation, resolved as a PURE computation — nothing
     is applied to the pilgrim or the pool until the pilgrimage
     commits the result. This allows Pleading for Providence.

     opts: { peterBlocked, theresaSpent }                        */

  class Trial {
    constructor(pilgrim, sin, saint, rng, opts) {
      this.pilgrim = pilgrim;
      this.sin = sin;
      this.saint = saint || null; // null = face it alone
      this.rng = rng || Math.random;
      this.opts = opts || {};
    }

    /**
     * Resolve the trial (no side effects).
     * Returns { victory, defense, power, damage, log[], graceEarned,
     *           resolveRestored, providence, peterAuto }
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
        if (this.opts.peterBlocked) {
          log.push("🗝️ The Keys of the Kingdom must rest — they cannot turn twice in a row. The trial is contested.");
        } else {
          log.push(
            "🗝️ " + saint.name + " turns the Keys of the Kingdom — the weakened sin cannot stand. " +
              "Its power breaks by " + PETER_DAMAGE + "."
          );
          return this._finish(true, sin.power, sin.power, PETER_DAMAGE, log, 0, true);
        }
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
      const providence = PROVIDENCE_MIN + Math.floor(this.rng() * (PROVIDENCE_MAX - PROVIDENCE_MIN + 1));
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

      return this._finish(victory, defense, power, damage, log, providence, false);
    }

    /** Tally prizes (computed only — applied at commit). */
    _finish(victory, defense, power, damage, log, providence, peterAuto) {
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
        if (this.opts.theresaSpent) {
          log.push("🌹 " + saint.name + "'s Little Way has already been spent this pilgrimage.");
        } else {
          resolveRestored = 1;
          log.push("🌹 " + saint.name + "'s Little Way restores 1 Resolve — once each pilgrimage.");
        }
      }

      return {
        victory: victory,
        defense: defense,
        power: power,
        damage: damage,
        providence: providence,
        peterAuto: !!peterAuto,
        log: log,
        graceEarned: grace,
        resolveRestored: resolveRestored,
      };
    }
  }

  /* -------------------- Trial preview ------------------------
     The deterministic outlook for invoking `saint` (or null)
     against `sin`, before providence is rolled. Powers the
     odds shown on each chip.                                    */

  function previewTrial(pilgrim, sin, saint, opts) {
    opts = opts || {};

    if (saint && saint.abilityKey === "peter" && sin.severity === "Venial" && !opts.peterBlocked) {
      return { auto: true, winChance: 1, minDamage: PETER_DAMAGE, maxDamage: PETER_DAMAGE, surge: false };
    }

    let power = sin.power;
    if (saint && saint.abilityKey === "cecilia") power = Math.max(1, power - 2);

    let base = pilgrim.virtues[sin.virtue];
    let surge = false;
    if (saint) {
      base += saint.intercessionFor(sin.virtue);
      if (saint.patronSin === sin.name) base += PATRON_BONUS;
      if (saint.abilityKey === "michael" && sin.severity !== "Venial") base += 3;
      if (saint.abilityKey === "augustine" && pilgrim.virtues[sin.virtue] <= 4) base += 2;
      if (saint.abilityKey === "demetrius" && sin.virtue === "Patience") base += 2;
      if (saint.abilityKey === "joan" || saint.abilityKey === "jude") surge = true;
    }

    // Win when base + providence > power (Catherine also wins ties)
    const ties = saint && saint.abilityKey === "catherine";
    let needed = power - base + (ties ? 0 : 1); // minimum providence roll to win
    const rolls = PROVIDENCE_MAX - PROVIDENCE_MIN + 1;
    let winChance;
    if (needed <= PROVIDENCE_MIN) winChance = 1;
    else if (needed > PROVIDENCE_MAX) winChance = 0;
    else winChance = (PROVIDENCE_MAX - needed + 1) / rolls;

    let minDamage = 0;
    let maxDamage = 0;
    if (winChance > 0) {
      const lowRoll = Math.max(PROVIDENCE_MIN, needed);
      minDamage = clamp(base + lowRoll - power, ties && base + lowRoll === power ? 1 : 1, DAMAGE_CAP);
      maxDamage = clamp(base + PROVIDENCE_MAX - power, 1, DAMAGE_CAP);
    }

    return {
      auto: false,
      winChance: winChance,
      neededProvidence: needed,
      minDamage: minDamage,
      maxDamage: maxDamage,
      surge: surge, // Joan/Jude may still rescue a losing tally
    };
  }

  /* ---------------------- Pilgrimage ------------------------
     One complete game. Each turn, up to MANIFEST_COUNT sins
     manifest; the pilgrim chooses which to face. Trials resolve
     as pending results that must be committed — a lost trial
     may first be re-rolled by Pleading for Providence.          */

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
      this.fatigue = {}; // saint name → trial number when available again
      this.theresaSpent = false;
      this.peterAutoLastTrial = false;
      this.pending = null; // { sinName, saintName, pleaded, result }
      this.currentSins = this._drawSins();
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

    /** Weighted draw (by prevalence, without replacement) of the sins that manifest this turn. */
    _drawSins() {
      const active = this.activeSins().slice();
      const drawn = [];
      while (drawn.length < MANIFEST_COUNT && active.length > 0) {
        const total = active.reduce((a, e) => a + e.prevalence, 0);
        let roll = this.rng() * total;
        let idx = active.length - 1;
        for (let i = 0; i < active.length; i++) {
          roll -= active[i].prevalence;
          if (roll < 0) { idx = i; break; }
        }
        drawn.push(active[idx].name);
        active.splice(idx, 1);
      }
      return drawn;
    }

    /** The manifested sins, at their current pool power. */
    manifestedSins() {
      return this.currentSins
        .map((name) => {
          const entry = this.poolEntry(name);
          if (!entry || entry.power <= 0) return null;
          const def = SIN_DATA.find((d) => d.name === name);
          return new Sin(def, entry.power);
        })
        .filter(Boolean);
    }

    /** Trials a resting saint has left before they can serve again. */
    restingFor(saint) {
      const until = this.fatigue[saint.name] || 0;
      return Math.max(0, until - this.trialNumber);
    }

    /** Can this saint be invoked right now? (unlocked + affordable + rested) */
    canInvoke(saint) {
      return (
        this.pilgrim.isUnlocked(saint.name) &&
        saint.duliaCost <= this.pilgrim.dulia &&
        this.restingFor(saint) === 0
      );
    }

    /**
     * Face one of the manifested sins (saint may be null = alone).
     * Resolves the trial as a PENDING result — nothing is applied
     * until commitTrial(). Returns the result or { error }.
     */
    startTrial(sinName, saint) {
      if (this.outcome) throw new Error("The pilgrimage is over.");
      if (this.pending) return { error: "A trial is already underway — accept it or plead." };
      if (this.currentSins.indexOf(sinName) === -1) {
        return { error: sinName + " has not manifested this turn." };
      }
      if (saint && !this.pilgrim.isUnlocked(saint.name)) {
        return { error: saint.name + " has not yet been unlocked (✠" + saint.unlockCost + " in the Library)." };
      }
      if (saint && saint.duliaCost > this.pilgrim.dulia) {
        return { error: "Not enough Dulia to invoke " + saint.name + " (needs ✠" + saint.duliaCost + ")." };
      }
      if (saint && this.restingFor(saint) > 0) {
        return { error: saint.name + " is resting for " + this.restingFor(saint) + " more trial(s)." };
      }

      const entry = this.poolEntry(sinName);
      const def = SIN_DATA.find((d) => d.name === sinName);
      const sin = new Sin(def, entry.power);
      const result = new Trial(this.pilgrim, sin, saint, this.rng, {
        peterBlocked: this.peterAutoLastTrial,
        theresaSpent: this.theresaSpent,
      }).resolve();

      this.pending = { sinName: sinName, saintName: saint ? saint.name : null, pleaded: false, result: result };
      return result;
    }

    canPlead() {
      return !!(
        this.pending &&
        !this.pending.pleaded &&
        !this.pending.result.victory &&
        this.pilgrim.grace >= PLEAD_COST
      );
    }

    /**
     * Plead for Providence: spend Grace to face the same trial
     * again with a fresh roll. Once per trial, only after a loss.
     */
    pleadProvidence(saintLookup) {
      if (!this.canPlead()) return { error: "You cannot plead for providence now." };
      this.pilgrim.grace -= PLEAD_COST;
      const pendingSaint = this.pending.saintName ? saintLookup(this.pending.saintName) : null;
      const entry = this.poolEntry(this.pending.sinName);
      const def = SIN_DATA.find((d) => d.name === this.pending.sinName);
      const sin = new Sin(def, entry.power);
      const result = new Trial(this.pilgrim, sin, pendingSaint, this.rng, {
        peterBlocked: this.peterAutoLastTrial,
        theresaSpent: this.theresaSpent,
      }).resolve();
      result.log.unshift("🙏 You plead for Providence (−" + PLEAD_COST + " Grace) and stand against the sin once more…");
      result.pleaded = true;
      this.pending.result = result;
      this.pending.pleaded = true;
      return result;
    }

    /**
     * Commit the pending trial: apply costs, prizes, pool changes,
     * fatigue, festering, and outcome. Returns the final result.
     */
    commitTrial(saintLookup) {
      if (!this.pending) throw new Error("No trial to commit.");
      const pending = this.pending;
      const result = pending.result;
      const saint = pending.saintName ? saintLookup(pending.saintName) : null;
      const entry = this.poolEntry(pending.sinName);
      const sin = new Sin(SIN_DATA.find((d) => d.name === pending.sinName), entry.power);

      // Costs & prizes
      if (saint) this.pilgrim.dulia -= saint.duliaCost;
      this.pilgrim.addGrace(result.graceEarned);

      if (result.victory) {
        this.pilgrim.addDulia(sin.duliaPrize);
        result.log.push("✠ Your devotion deepens: +" + sin.duliaPrize + " Dulia.");
        entry.power = Math.max(0, entry.power - result.damage);
        entry.prevalence = Math.max(1, entry.prevalence - 1);
        if (entry.power === 0) {
          result.log.push("🌟 " + entry.name + " is VANQUISHED — its power is utterly broken!");
        } else {
          result.log.push(
            "📉 " + entry.name + " retreats: power " + entry.power + ", prevalence " + entry.prevalence + "."
          );
        }
        if (result.resolveRestored && !this.theresaSpent) {
          this.resolve = Math.min(MAX_RESOLVE, this.resolve + result.resolveRestored);
          this.theresaSpent = true;
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

      // Fatigue: the interceding saint rests
      if (saint) {
        this.fatigue[saint.name] = this.trialNumber + 1 + REST_TRIALS;
      }
      this.peterAutoLastTrial = !!result.peterAuto;

      // Sins spurned this turn grow bolder
      for (const name of this.currentSins) {
        if (name === pending.sinName) continue;
        const spurned = this.poolEntry(name);
        if (spurned && spurned.power > 0) {
          spurned.prevalence = Math.min(SIN_PREVALENCE_CAP, spurned.prevalence + SPURNED_SPREAD);
        }
      }

      // Festering: every FESTER_INTERVAL trials, standing sins grow
      if (this.trialNumber % FESTER_INTERVAL === 0 && this.activeSins().length > 0) {
        for (const e of this.activeSins()) {
          e.power = Math.min(SIN_POWER_CAP, e.power + FESTER_GROWTH);
        }
        result.log.push("🕯️ The road wears on — sin festers: every standing sin grows +" + FESTER_GROWTH + " power.");
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
        this.currentSins = this._drawSins();
      }

      this.pending = null;
      result.outcome = this.outcome;
      result.vanquished = this.vanquishedCount();
      return result;
    }

    toJSON() {
      return {
        trialNumber: this.trialNumber,
        resolve: this.resolve,
        pool: this.pool.map((e) => ({ name: e.name, power: e.power, prevalence: e.prevalence })),
        currentSins: this.currentSins.slice(),
        fatigue: Object.assign({}, this.fatigue),
        theresaSpent: this.theresaSpent,
        peterAutoLastTrial: this.peterAutoLastTrial,
        pending: this.pending,
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
      pg.currentSins = (json.currentSins || []).slice();
      pg.fatigue = Object.assign({}, json.fatigue || {});
      pg.theresaSpent = !!json.theresaSpent;
      pg.peterAutoLastTrial = !!json.peterAutoLastTrial;
      pg.pending = json.pending || null;
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
    previewTrial,
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
    MANIFEST_COUNT,
    FESTER_INTERVAL,
    REST_TRIALS,
    PLEAD_COST,
    PATRON_BONUS,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    Object.assign(root, api);
  }
})(typeof window !== "undefined" ? window : globalThis);
