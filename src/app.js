/* ============================================================
   HAGIMON — UI Layer
   Screen routing, rendering, and localStorage persistence.
   Depends on data.js (definitions) and game.js (classes).
   ============================================================ */

(function () {
  "use strict";

  const STORAGE_PILGRIM = "hagimon.pilgrim";
  const STORAGE_PILGRIMAGE = "hagimon.pilgrimage";
  const LEGACY_KEYS = ["hagimon.collection", "hagimon.deck"]; // pre-redesign saves

  /* ------------------- persistent state -------------------- */

  const saints = SAINT_DATA.map((d) => new Saint(d));
  const saintByName = {};
  for (const s of saints) saintByName[s.name] = s;

  let pilgrim = null;
  let pilgrimage = null; // active run, or null

  function loadState() {
    for (const k of LEGACY_KEYS) {
      try { localStorage.removeItem(k); } catch (e) { /* ignore */ }
    }
    try {
      pilgrim = new Pilgrim(JSON.parse(localStorage.getItem(STORAGE_PILGRIM)) || {});
    } catch (e) {
      pilgrim = new Pilgrim();
    }
    try {
      const json = JSON.parse(localStorage.getItem(STORAGE_PILGRIMAGE));
      if (json && !json.outcome) pilgrimage = Pilgrimage.fromJSON(json, pilgrim);
    } catch (e) {
      pilgrimage = null;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_PILGRIM, JSON.stringify(pilgrim.toJSON()));
      if (pilgrimage && !pilgrimage.outcome) {
        localStorage.setItem(STORAGE_PILGRIMAGE, JSON.stringify(pilgrimage.toJSON()));
      } else {
        localStorage.removeItem(STORAGE_PILGRIMAGE);
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
    const info = document.getElementById("home-pilgrim-info");
    const st = pilgrim.stats;
    let html =
      '<div class="deck-banner">☩ Grace: <strong>' + pilgrim.grace + "</strong>" +
      ' &nbsp;·&nbsp; ✠ Dulia: <strong>' + pilgrim.dulia + "</strong>" +
      ' &nbsp;·&nbsp; 😇 Saints: <strong>' + pilgrim.unlockedSaints.length + "/" + saints.length + "</strong>" +
      ' &nbsp;·&nbsp; 🌟 Completed: <strong>' + st.completed + "</strong></div>";
    const haunting = SIN_DATA.filter((d) => pilgrim.dominionOf(d.name) > 0);
    if (haunting.length) {
      html +=
        '<div class="deck-banner incomplete">⛓️ Sins strengthened by your falls: ' +
        haunting.map((d) => d.emblem + " " + d.name + " +" + pilgrim.dominionOf(d.name)).join(" · ") +
        "</div>";
    }
    if (pilgrimage) {
      html +=
        '<div class="deck-banner incomplete">🚶 A pilgrimage is underway — Trial ' +
        pilgrimage.trialNumber + "/" + TRIALS_PER_PILGRIMAGE +
        ", ❤ " + pilgrimage.resolve + "</div>";
    }
    info.innerHTML = html;
    document.getElementById("home-pilgrimage-btn").textContent = pilgrimage
      ? "🚶 Continue Pilgrimage"
      : "⚜️ Begin Pilgrimage";
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
      '<div class="deck-banner">☩ Grace to spend: <strong>' + pilgrim.grace + "</strong></div>";

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

  let chosenSaint = undefined; // undefined = nothing chosen yet; null = face alone
  let lastResult = null;

  function startOrContinuePilgrimage() {
    if (!pilgrimage) {
      pilgrimage = new Pilgrimage(pilgrim);
      chosenSaint = undefined;
      lastResult = null;
      saveState();
    }
    show("pilgrimage");
  }

  function renderPilgrimage() {
    if (!pilgrimage) { show("home"); return; }
    renderHud();
    if (lastResult) {
      renderTrialResult();
    } else {
      renderTrialSetup();
    }
  }

  function renderHud() {
    const pg = pilgrimage;
    document.getElementById("pilgrimage-hud").innerHTML =
      '<span class="hud-item">Trial <strong>' + pg.trialNumber + "/" + TRIALS_PER_PILGRIMAGE + "</strong></span>" +
      '<span class="hud-item">' + "❤".repeat(pg.resolve) + '<span class="heart-lost">' +
      "♡".repeat(Math.max(0, MAX_RESOLVE - pg.resolve)) + "</span></span>" +
      '<span class="hud-item">✠ <strong>' + pilgrim.dulia + "</strong> Dulia</span>" +
      '<span class="hud-item">☩ <strong>' + pilgrim.grace + "</strong> Grace</span>";
  }

  function renderTrialSetup() {
    const pg = pilgrimage;
    const sin = pg.currentSin;
    const el = document.getElementById("pilgrimage-body");

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
      (sin.dominion > 0
        ? '<div class="sin-stats dominion">⛓️ Dominion +' + sin.dominion +
          " — this sin has grown stronger from your falls</div>"
        : "") +
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
      saveState();
      renderPilgrimage();
    });
  }

  function renderTrialResult() {
    const el = document.getElementById("pilgrimage-body");
    const res = lastResult;

    let verdict;
    if (res.victory) {
      verdict = '<h3 class="verdict win">✨ The sin is banished!</h3>';
    } else {
      verdict = '<h3 class="verdict lose">💔 The trial is lost</h3>';
    }
    let html = '<div class="result-panel">' + verdict + '<ul class="battle-log">';
    for (const line of res.log) html += "<li>" + esc(line) + "</li>";
    html += "</ul>";

    if (res.outcome === "completed") {
      html +=
        '<p class="grace-summary">🌟 Pilgrimage complete! All seven sins faced. Total Grace: ' +
        pilgrim.grace + "</p>" +
        '<button class="btn primary" id="pilgrimage-done">⛪ Return in Triumph</button>';
    } else if (res.outcome === "fallen") {
      html +=
        '<p class="grace-summary">🌑 The pilgrimage ends, but nothing is wasted — Grace: ' +
        pilgrim.grace + ". Visit the Chapel to grow stronger.</p>" +
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
