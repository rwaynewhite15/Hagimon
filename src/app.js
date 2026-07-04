/* ============================================================
   HAGIMON — UI Layer
   Screen routing, rendering, and localStorage persistence.
   The main menu holds only records and Begin Pilgrimage; the
   Saints Library and Chapel live inside the game. Leaving to
   the main menu resets the run. Only records persist.
   Depends on data.js (definitions) and game.js (classes).
   ============================================================ */

(function () {
  "use strict";

  const STORAGE_RUN = "hagimon.run"; // active pilgrimage: { pilgrim, pilgrimage }
  const STORAGE_RECORDS = "hagimon.records"; // permanent records
  const LEGACY_KEYS = ["hagimon.collection", "hagimon.deck", "hagimon.pilgrim", "hagimon.pilgrimage"];

  /* ------------------- persistent state -------------------- */

  const saints = SAINT_DATA.map((d) => new Saint(d));
  const saintByName = {};
  for (const s of saints) saintByName[s.name] = s;
  const lookupSaint = (name) => saintByName[name];

  let pilgrim = new Pilgrim(); // placeholder until a run starts
  let pilgrimage = null; // active run, or null
  let records = { pilgrimages: 0, triumphs: 0, bestVanquished: 0, trialsFaced: 0 };

  function loadState() {
    for (const k of LEGACY_KEYS) {
      try { localStorage.removeItem(k); } catch (e) { /* ignore */ }
    }
    try {
      records = Object.assign(records, JSON.parse(localStorage.getItem(STORAGE_RECORDS)) || {});
    } catch (e) { /* fresh records */ }
    try {
      const run = JSON.parse(localStorage.getItem(STORAGE_RUN));
      if (run && run.pilgrimage && !run.pilgrimage.outcome) {
        pilgrim = new Pilgrim(run.pilgrim);
        pilgrimage = Pilgrimage.fromJSON(run.pilgrimage, pilgrim);
      }
    } catch (e) {
      pilgrimage = null;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_RECORDS, JSON.stringify(records));
      if (pilgrimage && !pilgrimage.outcome) {
        localStorage.setItem(STORAGE_RUN, JSON.stringify({ pilgrim: pilgrim.toJSON(), pilgrimage: pilgrimage.toJSON() }));
      } else {
        localStorage.removeItem(STORAGE_RUN);
      }
    } catch (e) { /* storage unavailable — play on without persistence */ }
  }

  /* ------------------- screen routing ---------------------- */

  const SCREENS = ["home", "library", "chapel", "pilgrimage"];

  function show(screen) {
    if (screen !== "home" && !pilgrimage) screen = "home"; // in-game screens require an active run
    for (const s of SCREENS) {
      document.getElementById("screen-" + s).classList.toggle("active", s === screen);
    }
    window.scrollTo(0, 0);
    if (screen === "home") renderHome();
    if (screen === "library") renderLibrary();
    if (screen === "chapel") renderChapel();
    if (screen === "pilgrimage") renderPilgrimage();
  }

  /* ------------------- shared pieces ----------------------- */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function rarityBadge(rarity) {
    return '<span class="rarity rarity-' + rarity.toLowerCase() + '">' + rarity + "</span>";
  }

  function severityBadge(sev, explain) {
    return (
      '<span class="severity severity-' + sev.toLowerCase() + '"' +
      (explain ? ' data-explain="severity" title="' + EXPLAIN.severity + '"' : "") +
      ">" + sev + "</span>"
    );
  }

  /* Stat explanations — shown on hover (title) and on tap (toast). */
  const EXPLAIN = {
    trial: "Trial — how many confrontations you have faced this pilgrimage.",
    resolve: "Resolve ❤ — your endurance. Losing a trial costs 1. At 0 the pilgrimage falls.",
    vanquished: "Vanquished 😇 — sins driven to power 0. Vanquish all 7 to triumph.",
    dulia: "Dulia ✠ — devotion, earned by winning trials. Spend it to unlock saints and to invoke them.",
    grace: "Grace ☩ — divine assistance, earned from every trial. Spend it in the Chapel to raise virtues, or keep " + PLEAD_COST + " to plead for Providence after a lost trial.",
    fester: "Fester 🕯️ — trials until sin festers. Each fester, every standing sin grows in power — and each fester is worse than the last (+1, +2, then +3).",
    power: "Power — the sin's strength. Your defense must beat it. Victory breaks it by your margin (" + DAMAGE_MIN + "–" + DAMAGE_CAP + "); at 0 the sin is vanquished. A loss feeds it +2.",
    prevalence: "Prevalence 🎲 — how likely this sin is to manifest among your choices each turn. Spurning a manifested sin raises it; beating the sin lowers it.",
    severity: "Severity — a label of the sin's current power: Venial ≤8, Grave 9–12, Mortal 13+. Graver sins pay more Grace and Dulia when beaten.",
    odds: "Each choice shows your chance to win (the providence roll of 1–4 is the only unknown) and the power you would break — your margin of victory, at least " + DAMAGE_MIN + ", at most " + DAMAGE_CAP + ". ⚡ means this saint can surge when losing.",
    virtue: "Virtues (1–10) — each sin assails its contrary virtue. Your own virtue is the foundation of every defense; saints add theirs on top.",
    alms: "Almsgiving 🕊️ — give " + ALMS_GRACE + " Grace away to gain ✠1 Dulia. Costly, but it is the way back when your purse runs empty.",
  };

  function virtueBars(stats, dominantName) {
    let html = '<div class="virtues">';
    for (const v of VIRTUE_NAMES) {
      const val = stats[v];
      const isDom = v === dominantName;
      html +=
        '<div class="virtue-row' + (isDom ? " dominant" : "") + '">' +
        '<span class="virtue-name">' + v + (isDom ? " ★" : "") + "</span>" +
        '<span class="virtue-track"><span class="virtue-fill" style="width:' +
        Math.min(100, Math.round((val / 12) * 100)) + "%;background:" + VIRTUE_COLORS[v] + '"></span></span>' +
        '<span class="virtue-val">' + val + "</span>" +
        "</div>";
    }
    return html + "</div>";
  }

  function saintCard(saint) {
    const locked = !pilgrim.isUnlocked(saint.name);
    return (
      '<div class="card rarity-border-' + saint.rarity.toLowerCase() + (locked ? " locked" : "") + '">' +
      '<div class="card-head">' +
      '<span class="card-emblem">' + saint.emblem + "</span>" +
      '<div class="card-id"><h3>' + (locked ? "🔒 " : "") + esc(saint.name) + "</h3>" +
      '<p class="card-title">' + esc(saint.title) + "</p></div>" +
      rarityBadge(saint.rarity) +
      "</div>" +
      '<div class="card-meta">✠ Invoke: ' + saint.duliaCost +
      (locked ? ' · <span class="locked-note">Locked — unlock for ✠' + saint.unlockCost + "</span>" : "") +
      "</div>" +
      virtueBars(saint.getStatsWithRarity(), saint.getDominantVirtue().name) +
      '<p class="card-ability"><strong>Special Ability:</strong> ' + esc(saint.specialAbility) + "</p>" +
      '<p class="card-ability"><strong>Invoked against:</strong> ' + esc(saint.patronSin) +
      " (+" + PATRON_BONUS + " in those trials)</p>" +
      '<p class="card-patronage"><strong>Patron of:</strong> ' + esc(saint.patronage) + "</p>" +
      (locked
        ? '<button class="btn primary unlock-btn" data-unlock="' + esc(saint.name) + '"' +
          (pilgrim.dulia >= saint.unlockCost ? "" : " disabled") +
          ">🔓 Unlock for ✠" + saint.unlockCost + " (you have ✠" + pilgrim.dulia + ")</button>"
        : "") +
      "</div>"
    );
  }

  /* ------------------- home screen ------------------------- */

  function renderHome() {
    // The main menu is a static guide to the game — no past stats.
  }

  /* ------------------- saints library ---------------------- */

  let expandedSaint = null;

  function renderLibrary() {
    const list = document.getElementById("library-list");
    document.getElementById("library-dulia").innerHTML =
      '<div class="deck-banner">✠ Dulia: <strong>' + pilgrim.dulia +
      "</strong> — earned by overcoming trials, spent to unlock and invoke saints</div>";
    let html = "";
    for (const saint of saints) {
      const locked = !pilgrim.isUnlocked(saint.name);
      if (expandedSaint === saint.name) {
        html += '<div class="library-entry" data-saint="' + esc(saint.name) + '">' + saintCard(saint) + "</div>";
      } else {
        const dom = saint.getDominantVirtue();
        html +=
          '<button class="library-entry compact' + (locked ? " locked" : "") + '" data-saint="' + esc(saint.name) + '">' +
          '<span class="card-emblem">' + saint.emblem + "</span>" +
          '<span class="compact-name">' + (locked ? "🔒 " : "") + esc(saint.name) +
          "<small>" +
          (locked ? "Unlock ✠" + saint.unlockCost + " · " : "✠ " + saint.duliaCost + " · ") +
          dom.name + " " + dom.value + " · vs " + esc(saint.patronSin) + "</small></span>" +
          rarityBadge(saint.rarity) +
          "</button>";
      }
    }
    list.innerHTML = html;
    list.querySelectorAll("[data-saint]").forEach(function (el) {
      el.addEventListener("click", function () {
        const name = el.getAttribute("data-saint");
        expandedSaint = expandedSaint === name ? null : name;
        renderLibrary();
      });
    });
    list.querySelectorAll("[data-unlock]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation(); // don't collapse the card
        const saint = saintByName[btn.getAttribute("data-unlock")];
        const res = pilgrim.unlockSaint(saint);
        if (!res.ok) { toast(res.error); return; }
        saveState();
        toast("🔓 " + saint.name + " now walks with you!");
        renderLibrary();
      });
    });
  }

  /* ------------------- chapel (spend Grace) ----------------- */

  function renderChapel() {
    document.getElementById("chapel-grace").innerHTML =
      '<div class="deck-banner">☩ Grace to spend: <strong>' + pilgrim.grace +
      "</strong> · ✠ Dulia: <strong>" + pilgrim.dulia +
      "</strong> — pleading for Providence costs ☩" + PLEAD_COST + "</div>" +
      '<button class="btn small" id="chapel-alms" title="' + EXPLAIN.alms + '"' +
      (pilgrim.grace >= ALMS_GRACE ? "" : " disabled") +
      ">🕊️ Offer alms: give ☩" + ALMS_GRACE + " Grace → gain ✠1 Dulia</button>";
    document.getElementById("chapel-alms").addEventListener("click", function () {
      const res = pilgrim.offerAlms();
      if (!res.ok) { toast(res.error); return; }
      toast("🕊️ Alms given: ☩" + ALMS_GRACE + " → ✠1. Devotion deepens.");
      saveState();
      renderChapel();
    });

    const list = document.getElementById("chapel-list");
    let html = "";
    for (const v of VIRTUE_NAMES) {
      const val = pilgrim.virtues[v];
      const maxed = val >= MAX_VIRTUE;
      const cost = pilgrim.raiseCost(v);
      html +=
        '<div class="builder-row">' +
        '<span class="virtue-dot" style="background:' + VIRTUE_COLORS[v] + '"></span>' +
        '<span class="compact-name">' + v +
        "<small>" + (maxed ? "Perfected" : "Raise to " + (val + 1) + " for " + cost + " Grace") + "</small></span>" +
        '<span class="chapel-track"><span class="virtue-track"><span class="virtue-fill" style="width:' +
        val * 10 + "%;background:" + VIRTUE_COLORS[v] + '"></span></span></span>' +
        '<span class="copy-count">' + val + "</span>" +
        '<button class="ctrl-btn" data-raise="' + v + '"' +
        (maxed || pilgrim.grace < cost ? " disabled" : "") + ">+</button>" +
        "</div>";
    }
    list.innerHTML = html;
    list.querySelectorAll("[data-raise]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const res = pilgrim.raiseVirtue(btn.getAttribute("data-raise"));
        if (!res.ok) toast(res.error);
        saveState();
        renderChapel();
      });
    });
  }

  /* ------------------- pilgrimage -------------------------- */

  let chosenSinName = null;
  let chosenSaint = undefined; // undefined = nothing chosen yet; null = face alone
  let lastResult = null; // last COMMITTED result (aftermath stage)

  function beginPilgrimage() {
    pilgrim = new Pilgrim(); // everything starts over
    pilgrimage = new Pilgrimage(pilgrim);
    records.pilgrimages += 1;
    chosenSinName = null;
    chosenSaint = undefined;
    lastResult = null;
    saveState();
    show("pilgrimage");
  }

  function finishRun() {
    records.trialsFaced += pilgrimage.trialNumber;
    records.bestVanquished = Math.max(records.bestVanquished, pilgrimage.vanquishedCount());
    if (pilgrimage.outcome === "triumphant") records.triumphs += 1;
  }

  function abandonRun() {
    if (!window.confirm("Return to the main menu? This pilgrimage will be lost — every run starts anew.")) return;
    finishRun();
    pilgrimage = null;
    pilgrim = new Pilgrim();
    lastResult = null;
    chosenSinName = null;
    chosenSaint = undefined;
    saveState();
    show("home");
  }

  function renderPilgrimage() {
    if (!pilgrimage) { show("home"); return; }
    renderHud();
    renderPool();
    if (pilgrimage.pending) {
      renderPendingResult();
    } else if (lastResult && lastResult.outcome) {
      renderRunEnd(); // triumph or fall gets its own screen
    } else {
      renderTrialSetup(); // mid-run aftermath appears inline above the next choice
    }
  }

  function renderHud() {
    const pg = pilgrimage;
    const untilFester = FESTER_INTERVAL - ((pg.trialNumber - 1) % FESTER_INTERVAL);
    const item = (key, inner) =>
      '<span class="hud-item" data-explain="' + key + '" title="' + EXPLAIN[key] + '">' + inner + "</span>";
    document.getElementById("pilgrimage-hud").innerHTML =
      item("trial", "Trial <strong>" + pg.trialNumber + "</strong>") +
      item("resolve", "❤".repeat(pg.resolve) + '<span class="heart-lost">' + "♡".repeat(Math.max(0, MAX_RESOLVE - pg.resolve)) + "</span>") +
      item("vanquished", "😇 <strong>" + pg.vanquishedCount() + "/7</strong>") +
      item("dulia", "✠ <strong>" + pilgrim.dulia + "</strong>") +
      item("grace", "☩ <strong>" + pilgrim.grace + "</strong>") +
      item("fester", "🕯️ <strong>" + untilFester + "</strong>");
  }

  /** The war map: every sin's current Power and Prevalence. */
  function renderPool() {
    const pg = pilgrimage;
    let html = '<div class="pool-panel"><h4 class="picker-title">The Seven Sins — break every power to 0</h4>';
    for (const entry of pg.pool) {
      const def = SIN_DATA.find((d) => d.name === entry.name);
      const vanquished = entry.power <= 0;
      const manifested = !pg.outcome && !pg.pending && !lastResult && pg.currentSins.indexOf(entry.name) !== -1;
      const sev = severityForPower(entry.power).name;
      html +=
        '<div class="pool-row' + (vanquished ? " vanquished" : "") + (manifested ? " current" : "") + '">' +
        '<span class="pool-emblem">' + def.emblem + "</span>" +
        '<span class="pool-name">' + entry.name +
        "<small>" + (vanquished ? "✨ vanquished" : "vs " + def.virtue + " · " + sev.toLowerCase() + (manifested ? " · manifesting" : "")) + "</small></span>" +
        '<span class="pool-track"><span class="pool-fill severity-fill-' + sev.toLowerCase() + '" style="width:' +
        Math.round((entry.power / SIN_POWER_CAP) * 100) + '%"></span></span>' +
        '<span class="pool-power" data-explain="power" title="' + EXPLAIN.power + '">' + entry.power + "</span>" +
        '<span class="pool-prevalence" data-explain="prevalence" title="' + EXPLAIN.prevalence + '">' +
        (vanquished ? "—" : "🎲" + entry.prevalence) + "</span>" +
        "</div>";
    }
    html += "</div>";
    document.getElementById("pilgrimage-pool").innerHTML = html;
  }

  /** Compact odds line for invoking `saint` (or going alone) against `sin`. */
  function previewText(sin, saint) {
    const pv = previewTrial(pilgrim, sin, saint, { peterBlocked: pilgrimage.peterAutoLastTrial });
    if (pv.auto) return "✨ certain · dmg " + pv.minDamage;
    const pct = Math.round(pv.winChance * 100);
    if (pv.winChance <= 0) return pct + "%" + (pv.surge ? " ⚡" : "");
    const dmg = pv.minDamage === pv.maxDamage ? String(pv.maxDamage) : pv.minDamage + "–" + pv.maxDamage;
    return pct + "% · dmg " + dmg + (pv.surge ? " ⚡" : "");
  }

  /** Full-sentence hover text for an invocation option. */
  function previewTitle(sin, saint) {
    const pv = previewTrial(pilgrim, sin, saint, { peterBlocked: pilgrimage.peterAutoLastTrial });
    if (pv.auto) return "Keys of the Kingdom: this Venial sin falls outright, breaking " + pv.minDamage + " power.";
    let t = "Win chance " + Math.round(pv.winChance * 100) + "%";
    if (pv.winChance > 0 && pv.winChance < 1) t += " (needs providence " + pv.neededProvidence + "+ of 1–4)";
    if (pv.winChance > 0) t += ". A victory breaks " + pv.minDamage + "–" + pv.maxDamage + " power";
    t += ". " + (pv.surge ? "This saint may still surge when the tally is losing. " : "") +
      "A loss costs 1 Resolve and feeds the sin.";
    return t;
  }

  function renderTrialSetup() {
    const pg = pilgrimage;
    const el = document.getElementById("pilgrimage-body");
    const manifested = pg.manifestedSins();
    if (manifested.length === 0) { el.innerHTML = ""; return; }
    if (!chosenSinName || !manifested.some((s) => s.name === chosenSinName)) {
      chosenSinName = manifested[0].name;
    }
    const sin = manifested.find((s) => s.name === chosenSinName);

    // --- last trial's aftermath, inline ----------------------
    let html = "";
    if (lastResult) {
      const r = lastResult;
      html +=
        '<div class="result-summary ' + (r.victory ? "won" : "lost") + '" id="result-summary">' +
        "<strong>" + (r.victory ? "✨ Trial " + (pg.trialNumber - 1) + " won" : "💔 Trial " + (pg.trialNumber - 1) + " lost") +
        (r.victory ? " — broke " + r.damage + " power" : " — lost 1 Resolve") + ".</strong>" +
        '<details><summary>What happened</summary><ul class="battle-log">' +
        r.log.map((l) => "<li>" + esc(l) + "</li>").join("") +
        "</ul></details></div>";
    }

    // --- which sin to face -----------------------------------
    html += '<h4 class="picker-title">' + manifested.length + " temptations crowd around you — choose your battle</h4>";
    html += '<div class="sin-choices">';
    for (const m of manifested) {
      const sel = m.name === chosenSinName;
      html +=
        '<button class="sin-choice severity-border-' + m.severity.toLowerCase() + (sel ? " selected" : "") + '" data-sin="' + m.name + '">' +
        '<span class="card-emblem">' + m.emblem + "</span>" +
        '<span class="sin-choice-name">' + m.name + "<small>power " + m.power + " · " +
        m.virtue + " " + pilgrim.virtues[m.virtue] + "</small></span>" +
        severityBadge(m.severity) +
        "</button>";
    }
    html += "</div>";

    // --- the chosen sin's card -------------------------------
    html +=
      '<div class="card sin-card severity-border-' + sin.severity.toLowerCase() + '">' +
      '<div class="card-head">' +
      '<span class="card-emblem">' + sin.emblem + "</span>" +
      '<div class="card-id"><h3>' + sin.name + "</h3>" +
      '<p class="card-title">' + esc(sin.flavor) + "</p></div>" +
      severityBadge(sin.severity, true) +
      "</div>" +
      '<div class="sin-stats"><span data-explain="power" title="' + EXPLAIN.power + '">Power <strong>' +
      sin.power + "</strong></span>" +
      ' · assails your <span data-explain="virtue" title="' + EXPLAIN.virtue + '"><strong style="color:' +
      VIRTUE_COLORS[sin.virtue] + '">' + sin.virtue +
      "</strong> (yours: " + pilgrim.virtues[sin.virtue] + ")</span></div>" +
      "</div>";

    // --- whom to invoke --------------------------------------
    html += '<h4 class="picker-title">Whom will you invoke? <small>(✠ ' + pilgrim.dulia +
      ' available · <span data-explain="odds" title="' + EXPLAIN.odds + '">what do the odds mean?</span>)</small></h4>';
    html += '<div class="opponent-picker">';
    for (const s of saints) {
      const unlocked = pilgrim.isUnlocked(s.name);
      const resting = pg.restingFor(s);
      const sel = chosenSaint === s;
      if (!unlocked) {
        html +=
          '<button class="opponent-chip locked" disabled title="Unlock this saint in the Saints menu.">🔒 ' + esc(s.name.replace("St. ", "")) +
          ' <small>unlock ✠' + s.unlockCost + " in Saints</small></button>";
      } else if (resting > 0) {
        html +=
          '<button class="opponent-chip resting" disabled title="A saint who intercedes rests for the next ' + REST_TRIALS + ' trials.">💤 ' + esc(s.name.replace("St. ", "")) +
          ' <small>resting ' + resting + " trial" + (resting === 1 ? "" : "s") + "</small></button>";
      } else {
        html +=
          '<button class="opponent-chip' + (sel ? " selected" : "") + '" data-invoke="' + esc(s.name) + '"' +
          ' title="' + previewTitle(sin, s) + '"' +
          (pg.canInvoke(s) ? "" : " disabled") + ">" +
          s.emblem + " " + esc(s.name.replace("St. ", "")) +
          ' <small>✠' + s.duliaCost + (s.patronSin === sin.name ? " ✨" : "") + " · " + previewText(sin, s) + "</small></button>";
      }
    }
    html +=
      '<button class="opponent-chip alone' + (chosenSaint === null ? " selected" : "") + '" data-alone="1"' +
      ' title="' + previewTitle(sin, null) + '">' +
      "🚶 Face it alone <small>✠0 · " + previewText(sin, null) + "</small></button>";
    html +=
      '<button class="opponent-chip alms" data-alms="1" title="' + EXPLAIN.alms + '"' +
      (pilgrim.grace >= ALMS_GRACE ? "" : " disabled") + ">" +
      "🕊️ Offer alms <small>☩" + ALMS_GRACE + " → ✠1 (have ☩" + pilgrim.grace + ")</small></button>";
    html += "</div>";

    html += '<button class="btn battle wide" id="face-trial"' +
      (chosenSaint === undefined ? " disabled" : "") + ">🙏 FACE THE TRIAL</button>";

    el.innerHTML = html;

    el.querySelectorAll("[data-sin]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        chosenSinName = btn.getAttribute("data-sin");
        renderPilgrimage();
      });
    });
    el.querySelectorAll("[data-invoke]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        chosenSaint = saintByName[btn.getAttribute("data-invoke")];
        renderPilgrimage();
      });
    });
    const aloneBtn = el.querySelector("[data-alone]");
    if (aloneBtn) aloneBtn.addEventListener("click", function () {
      chosenSaint = null;
      renderPilgrimage();
    });
    const almsBtn = el.querySelector("[data-alms]");
    if (almsBtn) almsBtn.addEventListener("click", function () {
      const res = pilgrim.offerAlms();
      if (!res.ok) { toast(res.error); return; }
      toast("🕊️ Alms given: ☩" + ALMS_GRACE + " → ✠1. Devotion deepens.");
      saveState();
      renderPilgrimage();
    });
    document.getElementById("face-trial").addEventListener("click", function () {
      if (chosenSaint === undefined) return;
      const res = pilgrimage.startTrial(chosenSinName, chosenSaint);
      if (res.error) { toast(res.error); return; }
      chosenSaint = undefined;
      lastResult = null;
      if (res.victory) {
        commitPending(); // victories need no decision
      } else {
        saveState(); // pending loss awaits: accept or plead
        renderPilgrimage();
      }
    });
  }

  function commitPending() {
    const res = pilgrimage.commitTrial(lookupSaint);
    lastResult = res;
    if (res.outcome) finishRun();
    saveState();
    renderPilgrimage();
  }

  /** A lost trial awaiting the pilgrim's decision: accept, or plead. */
  function renderPendingResult() {
    const el = document.getElementById("pilgrimage-body");
    const res = pilgrimage.pending.result;
    let html = '<div class="result-panel"><h3 class="verdict lose">💔 The trial is lost…</h3><ul class="battle-log">';
    for (const line of res.log) html += "<li>" + esc(line) + "</li>";
    html += "</ul>";
    if (pilgrimage.canPlead()) {
      html +=
        '<button class="btn primary" id="plead-btn">🙏 Plead for Providence — ☩' + PLEAD_COST +
        " Grace (have " + pilgrim.grace + ")</button> ";
    } else if (!pilgrimage.pending.pleaded && pilgrim.grace < PLEAD_COST) {
      html += '<p class="muted-note">Not enough Grace to plead for Providence (' + PLEAD_COST + " needed).</p>";
    }
    html += '<button class="btn danger" id="accept-btn">Accept the Fall</button></div>';
    el.innerHTML = html;

    const plead = document.getElementById("plead-btn");
    if (plead) plead.addEventListener("click", function () {
      const r = pilgrimage.pleadProvidence(lookupSaint);
      if (r.error) { toast(r.error); return; }
      if (r.victory) {
        commitPending();
      } else {
        saveState();
        renderPilgrimage();
      }
    });
    document.getElementById("accept-btn").addEventListener("click", commitPending);
  }

  /** The end of the run: triumph or fall. */
  function renderRunEnd() {
    const el = document.getElementById("pilgrimage-body");
    const res = lastResult;
    const verdict =
      res.outcome === "triumphant"
        ? '<h3 class="verdict win">🎺 TRIUMPH — all seven sins vanquished!</h3>'
        : '<h3 class="verdict lose">🌑 The pilgrimage has fallen</h3>';
    let html = '<div class="result-panel">' + verdict + '<ul class="battle-log">';
    for (const line of res.log) html += "<li>" + esc(line) + "</li>";
    html += "</ul>";
    if (res.outcome === "triumphant") {
      html +=
        '<p class="grace-summary">🌟 Every power broken in ' + pilgrimage.trialNumber +
        " trials. Triumphs: " + records.triumphs + "</p>" +
        '<button class="btn primary" id="pilgrimage-done">⛪ Return in Glory</button>';
    } else {
      html +=
        '<p class="grace-summary">😇 ' + pilgrimage.vanquishedCount() +
        "/7 sins vanquished this pilgrimage. The next begins anew — wiser.</p>" +
        '<button class="btn primary" id="pilgrimage-done">⛪ Return Home</button>';
    }
    html += "</div>";
    el.innerHTML = html;

    document.getElementById("pilgrimage-done").addEventListener("click", function () {
      pilgrimage = null;
      pilgrim = new Pilgrim();
      lastResult = null;
      saveState();
      show("home");
    });
  }

  /* ------------------- toast ------------------------------- */

  let toastTimer = null;
  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("visible");
    }, 2500);
  }

  /* ------------------- boot -------------------------------- */

  function boot() {
    loadState();

    document.querySelectorAll("[data-nav]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        show(btn.getAttribute("data-nav"));
      });
    });
    document.getElementById("home-pilgrimage-btn").addEventListener("click", beginPilgrimage);
    document.getElementById("abandon-btn").addEventListener("click", abandonRun);

    // Tap any stat to have it explained (hover shows the same via title)
    document.addEventListener("click", function (e) {
      const el = e.target.closest("[data-explain]");
      if (!el || e.target.closest("button")) return; // buttons keep their own action
      const key = el.getAttribute("data-explain");
      if (EXPLAIN[key]) toast(EXPLAIN[key]);
    });

    // The ❓ glossary
    document.getElementById("help-btn").addEventListener("click", function () {
      const panel = document.getElementById("help-panel");
      panel.hidden = !panel.hidden;
      if (!panel.hidden) {
        panel.innerHTML =
          '<h4 class="picker-title">📖 How to read the stats <button class="btn back" id="help-close">✕ close</button></h4>' +
          '<ul class="help-list">' +
          ["trial", "resolve", "vanquished", "dulia", "grace", "fester", "power", "prevalence", "severity", "odds", "virtue", "alms"]
            .map((k) => "<li>" + EXPLAIN[k] + "</li>")
            .join("") +
          "</ul>";
        document.getElementById("help-close").addEventListener("click", function () {
          panel.hidden = true;
        });
      }
    });

    // A pilgrimage in progress resumes directly — the main menu resets the game.
    show(pilgrimage ? "pilgrimage" : "home");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
