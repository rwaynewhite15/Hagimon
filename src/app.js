/* ============================================================
   HAGIMON — UI Layer
   Screen routing, rendering, and localStorage persistence.
   A pilgrimage is one complete game: the pilgrim's build and
   the sin pool live and die together. Only records persist.
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

  let pilgrim = new Pilgrim(); // fresh template until a run starts
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

  function severityBadge(sev) {
    return '<span class="severity severity-' + sev.toLowerCase() + '">' + sev + "</span>";
  }

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
    const canUnlock = locked && pilgrimage && !pilgrimage.outcome;
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
      (canUnlock
        ? '<button class="btn primary unlock-btn" data-unlock="' + esc(saint.name) + '"' +
          (pilgrim.dulia >= saint.unlockCost ? "" : " disabled") +
          ">🔓 Unlock for ✠" + saint.unlockCost + " (you have ✠" + pilgrim.dulia + ")</button>"
        : locked
          ? '<p class="card-patronage locked-note">Begin a pilgrimage to unlock saints.</p>'
          : "") +
      "</div>"
    );
  }

  /* ------------------- home screen ------------------------- */

  function renderHome() {
    const info = document.getElementById("home-pilgrim-info");
    let html =
      '<div class="deck-banner">🏆 Triumphs: <strong>' + records.triumphs + "</strong>" +
      ' &nbsp;·&nbsp; ⚜️ Pilgrimages: <strong>' + records.pilgrimages + "</strong>" +
      ' &nbsp;·&nbsp; 😇 Best: <strong>' + records.bestVanquished + "/7 sins</strong></div>";
    if (pilgrimage && !pilgrimage.outcome) {
      html +=
        '<div class="deck-banner incomplete">🚶 A pilgrimage is underway — Trial ' + pilgrimage.trialNumber +
        ", ❤ " + pilgrimage.resolve +
        ", 😇 " + pilgrimage.vanquishedCount() + "/7 vanquished</div>";
    }
    info.innerHTML = html;
    document.getElementById("home-pilgrimage-btn").textContent =
      pilgrimage && !pilgrimage.outcome ? "🚶 Continue Pilgrimage" : "⚜️ Begin Pilgrimage";
  }

  /* ------------------- saints library ---------------------- */

  let expandedSaint = null;

  function renderLibrary() {
    const list = document.getElementById("library-list");
    document.getElementById("library-dulia").innerHTML =
      pilgrimage && !pilgrimage.outcome
        ? '<div class="deck-banner">✠ Dulia: <strong>' + pilgrim.dulia +
          "</strong> — earned by overcoming trials, spent to unlock and invoke saints</div>"
        : '<div class="deck-banner incomplete">Each pilgrimage begins anew with ' + STARTER_SAINT +
          " and ✠" + STARTING_DULIA + " — unlock the rest along the way.</div>";
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
    const active = pilgrimage && !pilgrimage.outcome;
    document.getElementById("chapel-grace").innerHTML = active
      ? '<div class="deck-banner">☩ Grace to spend: <strong>' + pilgrim.grace + "</strong></div>"
      : '<div class="deck-banner incomplete">Grace is gathered and spent within a single pilgrimage. Begin one to grow in virtue.</div>';

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
        (!active || maxed || pilgrim.grace < cost ? " disabled" : "") + ">+</button>" +
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

  let chosenSaint = undefined; // undefined = nothing chosen yet; null = face alone
  let lastResult = null;

  function startOrContinuePilgrimage() {
    if (!pilgrimage || pilgrimage.outcome) {
      pilgrim = new Pilgrim(); // everything starts over
      pilgrimage = new Pilgrimage(pilgrim);
      records.pilgrimages += 1;
      chosenSaint = undefined;
      lastResult = null;
      saveState();
    }
    show("pilgrimage");
  }

  function renderPilgrimage() {
    if (!pilgrimage) { show("home"); return; }
    renderHud();
    renderPool();
    if (lastResult) {
      renderTrialResult();
    } else {
      renderTrialSetup();
    }
  }

  function renderHud() {
    const pg = pilgrimage;
    document.getElementById("pilgrimage-hud").innerHTML =
      '<span class="hud-item">Trial <strong>' + pg.trialNumber + "</strong></span>" +
      '<span class="hud-item">' + "❤".repeat(pg.resolve) + '<span class="heart-lost">' +
      "♡".repeat(Math.max(0, MAX_RESOLVE - pg.resolve)) + "</span></span>" +
      '<span class="hud-item">😇 <strong>' + pg.vanquishedCount() + "/7</strong></span>" +
      '<span class="hud-item">✠ <strong>' + pilgrim.dulia + "</strong></span>" +
      '<span class="hud-item">☩ <strong>' + pilgrim.grace + "</strong></span>";
  }

  /** The war map: every sin's current Power and Prevalence. */
  function renderPool() {
    const pg = pilgrimage;
    let html = '<div class="pool-panel"><h4 class="picker-title">The Seven Sins — break every power to 0</h4>';
    for (const entry of pg.pool) {
      const def = SIN_DATA.find((d) => d.name === entry.name);
      const vanquished = entry.power <= 0;
      const isCurrent = !pg.outcome && pg.currentSin && !lastResult && pg.currentSin.name === entry.name;
      const sev = severityForPower(entry.power).name;
      html +=
        '<div class="pool-row' + (vanquished ? " vanquished" : "") + (isCurrent ? " current" : "") + '">' +
        '<span class="pool-emblem">' + def.emblem + "</span>" +
        '<span class="pool-name">' + entry.name +
        "<small>" + (vanquished ? "✨ vanquished" : "vs " + def.virtue + " · " + sev.toLowerCase() + (isCurrent ? " · manifesting now" : "")) + "</small></span>" +
        '<span class="pool-track"><span class="pool-fill severity-fill-' + sev.toLowerCase() + '" style="width:' +
        Math.round((entry.power / SIN_POWER_CAP) * 100) + '%"></span></span>' +
        '<span class="pool-power">' + entry.power + "</span>" +
        '<span class="pool-prevalence" title="Prevalence — how likely to be called">' +
        (vanquished ? "—" : "🎲" + entry.prevalence) + "</span>" +
        "</div>";
    }
    html += "</div>";
    document.getElementById("pilgrimage-pool").innerHTML = html;
  }

  function renderTrialSetup() {
    const pg = pilgrimage;
    const sin = pg.currentSin;
    const el = document.getElementById("pilgrimage-body");
    if (!sin) { el.innerHTML = ""; return; }

    let html =
      '<div class="card sin-card severity-border-' + sin.severity.toLowerCase() + '">' +
      '<div class="card-head">' +
      '<span class="card-emblem">' + sin.emblem + "</span>" +
      '<div class="card-id"><h3>' + sin.name + "</h3>" +
      '<p class="card-title">' + esc(sin.flavor) + "</p></div>" +
      severityBadge(sin.severity) +
      "</div>" +
      '<div class="sin-stats">Power <strong>' + sin.power + "</strong>" +
      " · assails your <strong style=\"color:" + VIRTUE_COLORS[sin.virtue] + '">' + sin.virtue +
      "</strong> (yours: " + pilgrim.virtues[sin.virtue] + ")</div>" +
      "</div>";

    html += '<h4 class="picker-title">Whom will you invoke? <small>(✠ ' + pilgrim.dulia + " available)</small></h4>";
    html += '<div class="opponent-picker">';
    for (const s of saints) {
      const unlocked = pilgrim.isUnlocked(s.name);
      const sel = chosenSaint === s;
      if (unlocked) {
        html +=
          '<button class="opponent-chip' + (sel ? " selected" : "") + '" data-invoke="' + esc(s.name) + '"' +
          (pg.canInvoke(s) ? "" : " disabled") + ">" +
          s.emblem + " " + esc(s.name.replace("St. ", "")) +
          ' <small>✠' + s.duliaCost + " · " + sin.virtue.slice(0, 4) + " " + s.intercessionFor(sin.virtue) +
          (s.patronSin === sin.name ? " ✨" : "") + "</small></button>";
      } else {
        html +=
          '<button class="opponent-chip locked" disabled>' +
          "🔒 " + esc(s.name.replace("St. ", "")) +
          ' <small>unlock ✠' + s.unlockCost + " in Library</small></button>";
      }
    }
    html +=
      '<button class="opponent-chip alone' + (chosenSaint === null ? " selected" : "") + '" data-alone="1">' +
      "🚶 Face it alone <small>✠0</small></button>";
    html += "</div>";

    if (chosenSaint) html += saintCard(chosenSaint);

    html += '<button class="btn battle wide" id="face-trial"' +
      (chosenSaint === undefined ? " disabled" : "") + ">🙏 FACE THE TRIAL</button>";

    el.innerHTML = html;

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
    document.getElementById("face-trial").addEventListener("click", function () {
      if (chosenSaint === undefined) return;
      const res = pilgrimage.faceTrial(chosenSaint);
      if (res.error) { toast(res.error); return; }
      lastResult = res;
      chosenSaint = undefined;
      if (res.outcome) {
        // run over — update permanent records
        records.trialsFaced += pilgrimage.trialNumber;
        records.bestVanquished = Math.max(records.bestVanquished, pilgrimage.vanquishedCount());
        if (res.outcome === "triumphant") records.triumphs += 1;
      }
      saveState();
      renderPilgrimage();
    });
  }

  function renderTrialResult() {
    const el = document.getElementById("pilgrimage-body");
    const res = lastResult;

    let verdict;
    if (res.outcome === "triumphant") {
      verdict = '<h3 class="verdict win">🎺 TRIUMPH — all seven sins vanquished!</h3>';
    } else if (res.outcome === "fallen") {
      verdict = '<h3 class="verdict lose">🌑 The pilgrimage has fallen</h3>';
    } else if (res.victory) {
      verdict = '<h3 class="verdict win">✨ The trial is won!</h3>';
    } else {
      verdict = '<h3 class="verdict lose">💔 The trial is lost</h3>';
    }
    let html = '<div class="result-panel">' + verdict + '<ul class="battle-log">';
    for (const line of res.log) html += "<li>" + esc(line) + "</li>";
    html += "</ul>";

    if (res.outcome === "triumphant") {
      html +=
        '<p class="grace-summary">🌟 Every power broken in ' + pilgrimage.trialNumber +
        " trials. Triumphs: " + records.triumphs + "</p>" +
        '<button class="btn primary" id="pilgrimage-done">⛪ Return in Glory</button>';
    } else if (res.outcome === "fallen") {
      html +=
        '<p class="grace-summary">😇 ' + pilgrimage.vanquishedCount() +
        "/7 sins vanquished this pilgrimage. The next begins anew — wiser.</p>" +
        '<button class="btn primary" id="pilgrimage-done">⛪ Return Home</button>';
    } else {
      html += '<button class="btn primary" id="next-trial">🚶 Continue the Road →</button>';
    }
    html += "</div>";
    el.innerHTML = html;

    const next = document.getElementById("next-trial");
    if (next) next.addEventListener("click", function () {
      lastResult = null;
      renderPilgrimage();
    });
    const done = document.getElementById("pilgrimage-done");
    if (done) done.addEventListener("click", function () {
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
    document.getElementById("home-pilgrimage-btn").addEventListener("click", startOrContinuePilgrimage);

    show("home");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
