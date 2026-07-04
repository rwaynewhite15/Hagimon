/* ============================================================
   HAGIMON — UI Layer
   Screen routing, rendering, and localStorage persistence.
   Depends on data.js (definitions) and game.js (classes).
   ============================================================ */

(function () {
  "use strict";

  const STORAGE_COLLECTION = "hagimon.collection";
  const STORAGE_DECK = "hagimon.deck";

  /* ------------------- persistent state -------------------- */

  // collection: name → Saint (holds each saint's level & grace)
  const collection = {};

  function loadCollection() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_COLLECTION)) || {};
    } catch (e) {
      saved = {};
    }
    for (const def of SAINT_DATA) {
      collection[def.name] = new Saint(def, saved[def.name] || {});
    }
  }

  function saveCollection() {
    const out = {};
    for (const name in collection) out[name] = collection[name].toJSON();
    try {
      localStorage.setItem(STORAGE_COLLECTION, JSON.stringify(out));
    } catch (e) { /* storage unavailable — play on without persistence */ }
  }

  let deck = null;

  function loadDeck() {
    try {
      const json = JSON.parse(localStorage.getItem(STORAGE_DECK));
      if (json) deck = Deck.fromJSON(json, collection);
    } catch (e) {
      deck = null;
    }
  }

  function saveDeck() {
    try {
      if (deck) localStorage.setItem(STORAGE_DECK, JSON.stringify(deck.toJSON()));
      else localStorage.removeItem(STORAGE_DECK);
    } catch (e) { /* storage unavailable */ }
  }

  /* ------------------- screen routing ---------------------- */

  const SCREENS = ["home", "library", "builder", "battle"];

  function show(screen) {
    for (const s of SCREENS) {
      document.getElementById("screen-" + s).classList.toggle("active", s === screen);
    }
    window.scrollTo(0, 0);
    if (screen === "home") renderHome();
    if (screen === "library") renderLibrary();
    if (screen === "builder") renderBuilder();
    if (screen === "battle") renderBattleSetup();
  }

  /* ------------------- shared card pieces ------------------ */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function rarityBadge(rarity) {
    return '<span class="rarity rarity-' + rarity.toLowerCase() + '">' + rarity + "</span>";
  }

  function virtueBars(saint) {
    const stats = saint.getStatsWithRarity();
    const dom = saint.getDominantVirtue();
    let html = '<div class="virtues">';
    for (const v of VIRTUE_NAMES) {
      const val = stats[v];
      const isDom = v === dom.name;
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

  function fullCard(saint) {
    return (
      '<div class="card rarity-border-' + saint.rarity.toLowerCase() + '">' +
      '<div class="card-head">' +
      '<span class="card-emblem">' + saint.emblem + "</span>" +
      '<div class="card-id"><h3>' + esc(saint.name) + "</h3>" +
      '<p class="card-title">' + esc(saint.title) + "</p></div>" +
      rarityBadge(saint.rarity) +
      "</div>" +
      '<div class="card-meta">Level ' + saint.level +
      ' <span class="grace-meter" title="Grace toward next level">' +
      "☩ Grace " + saint.gracePoints + "/10</span></div>" +
      virtueBars(saint) +
      '<p class="card-ability"><strong>Special Ability:</strong> ' + esc(saint.specialAbility) + "</p>" +
      '<p class="card-patronage"><strong>Patron of:</strong> ' + esc(saint.patronage) + "</p>" +
      "</div>"
    );
  }

  /* ------------------- home screen ------------------------- */

  function renderHome() {
    const deckInfo = document.getElementById("home-deck-info");
    const battleBtn = document.getElementById("home-battle-btn");
    if (deck && deck.isValid()) {
      deckInfo.innerHTML =
        '<div class="deck-banner">📿 Active deck: <strong>' + esc(deck.name) +
        "</strong> — " + deck.cards.length + " cards, ready for battle</div>";
      battleBtn.style.display = "";
    } else if (deck) {
      deckInfo.innerHTML =
        '<div class="deck-banner incomplete">📿 Deck in progress: <strong>' + esc(deck.name) +
        "</strong> — " + deck.cards.length + "/" + DECK_SIZE + " cards</div>";
      battleBtn.style.display = "none";
    } else {
      deckInfo.innerHTML = "";
      battleBtn.style.display = "none";
    }
  }

  /* ------------------- saints library ---------------------- */

  let expandedSaint = null;

  function renderLibrary() {
    const list = document.getElementById("library-list");
    let html = "";
    for (const def of SAINT_DATA) {
      const saint = collection[def.name];
      if (expandedSaint === saint.name) {
        html += '<div class="library-entry" data-saint="' + esc(saint.name) + '">' + fullCard(saint) + "</div>";
      } else {
        const dom = saint.getDominantVirtue();
        html +=
          '<button class="library-entry compact" data-saint="' + esc(saint.name) + '">' +
          '<span class="card-emblem">' + saint.emblem + "</span>" +
          '<span class="compact-name">' + esc(saint.name) +
          '<small>Lv ' + saint.level + " · " + dom.name + " " + dom.value + "</small></span>" +
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
  }

  /* ------------------- deck builder ------------------------ */

  function renderBuilder() {
    if (!deck) deck = new Deck("My Deck", "Pilgrim");
    document.getElementById("deck-name").value = deck.name;

    const count = deck.cards.length;
    const progress = document.getElementById("deck-progress");
    progress.innerHTML =
      '<div class="progress-label">' + count + " / " + DECK_SIZE + " cards</div>" +
      '<div class="progress-track"><div class="progress-fill" style="width:' +
      Math.round((count / DECK_SIZE) * 100) + '%"></div></div>';

    const list = document.getElementById("builder-list");
    let html = "";
    for (const def of SAINT_DATA) {
      const saint = collection[def.name];
      const copies = deck.countOf(saint.name);
      html +=
        '<div class="builder-row">' +
        '<span class="card-emblem">' + saint.emblem + "</span>" +
        '<span class="compact-name">' + esc(saint.name) +
        "<small>" + saint.rarity + " · Lv " + saint.level + "</small></span>" +
        '<span class="builder-controls">' +
        '<button class="ctrl-btn" data-remove="' + esc(saint.name) + '"' + (copies === 0 ? " disabled" : "") + ">−</button>" +
        '<span class="copy-count">' + copies + "</span>" +
        '<button class="ctrl-btn" data-add="' + esc(saint.name) + '"' +
        (copies >= MAX_COPIES || count >= DECK_SIZE ? " disabled" : "") + ">+</button>" +
        "</span></div>";
    }
    list.innerHTML = html;

    list.querySelectorAll("[data-add]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const res = deck.addCard(collection[btn.getAttribute("data-add")]);
        if (!res.ok) toast(res.error);
        renderBuilder();
      });
    });
    list.querySelectorAll("[data-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        deck.removeCard(btn.getAttribute("data-remove"));
        renderBuilder();
      });
    });

    const hint = document.getElementById("builder-hint");
    const saveBtn = document.getElementById("deck-save");
    if (deck.isValid()) {
      hint.textContent = "Your deck is complete. Save it and go to battle!";
      saveBtn.disabled = false;
    } else if (count < DECK_SIZE) {
      hint.textContent =
        "Add " + (DECK_SIZE - count) + " more card" + (DECK_SIZE - count === 1 ? "" : "s") +
        " — up to " + MAX_COPIES + " copies of each saint. Use ✨ Fill Deck to top up randomly.";
      saveBtn.disabled = true;
    } else {
      hint.textContent = "Deck has an invalid composition.";
      saveBtn.disabled = true;
    }
  }

  // "Fill Deck" tops the deck up with random legal picks;
  // hand-picked cards always stay in the deck.
  function fillDeck() {
    if (!deck) deck = new Deck("My Deck", "Pilgrim");
    let guard = 500;
    while (deck.cards.length < DECK_SIZE && guard-- > 0) {
      const def = SAINT_DATA[Math.floor(Math.random() * SAINT_DATA.length)];
      deck.addCard(collection[def.name]); // silently skips full/duplicate limits
    }
    renderBuilder();
  }

  /* ------------------- battle screen ----------------------- */

  let champion = null;
  let opponent = null;

  function renderBattleSetup() {
    document.getElementById("battle-result").innerHTML = "";
    if (!champion && deck && deck.cards.length > 0) champion = deck.draw();
    renderBattleSides();
    renderOpponentPicker();
  }

  function renderBattleSides() {
    const el = document.getElementById("battle-sides");
    let html = "";
    html += '<div class="battle-side"><h4>Your Champion</h4>';
    html += champion ? fullCard(champion) : '<p class="muted">Draw a champion from your deck.</p>';
    html += '<button class="btn small" id="redraw-btn">🃏 Draw from Deck</button></div>';
    html += '<div class="battle-vs">VS</div>';
    html += '<div class="battle-side"><h4>Opponent</h4>';
    html += opponent ? fullCard(opponent) : '<p class="muted">Choose an opponent below.</p>';
    html += "</div>";
    el.innerHTML = html;

    document.getElementById("redraw-btn").addEventListener("click", function () {
      if (!deck || deck.cards.length === 0) {
        toast("Build a deck first!");
        return;
      }
      champion = deck.draw();
      document.getElementById("battle-result").innerHTML = "";
      renderBattleSides();
      updateBattleButton();
    });
    updateBattleButton();
  }

  function renderOpponentPicker() {
    const el = document.getElementById("opponent-picker");
    let html = "";
    for (const def of SAINT_DATA) {
      const saint = collection[def.name];
      const sel = opponent && opponent.name === saint.name;
      html +=
        '<button class="opponent-chip' + (sel ? " selected" : "") + '" data-opp="' + esc(saint.name) + '">' +
        saint.emblem + " " + esc(saint.name.replace("St. ", "")) + "</button>";
    }
    el.innerHTML = html;
    el.querySelectorAll("[data-opp]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        opponent = collection[btn.getAttribute("data-opp")];
        document.getElementById("battle-result").innerHTML = "";
        renderBattleSides();
        renderOpponentPicker();
      });
    });
  }

  function updateBattleButton() {
    document.getElementById("begin-battle").disabled = !(champion && opponent);
  }

  function runBattle() {
    if (!champion || !opponent) return;
    const result = new Battle(champion, opponent).resolve();
    saveCollection();

    const el = document.getElementById("battle-result");
    let verdict;
    if (result.draw) {
      verdict = '<h3 class="verdict draw">🤝 A Holy Draw</h3>';
    } else {
      const youWon = result.winner === champion;
      verdict =
        '<h3 class="verdict ' + (youWon ? "win" : "lose") + '">' +
        (youWon ? "🏆 " : "💫 ") + esc(result.winner.name) + " is victorious!</h3>";
    }
    let html = '<div class="result-panel">' + verdict + '<ul class="battle-log">';
    for (const line of result.log) html += "<li>" + esc(line) + "</li>";
    html += "</ul>";
    html +=
      '<p class="grace-summary">☩ Grace awarded — ' +
      esc(champion.name) + ": +" + result.graceAwarded[champion.name] +
      (champion === opponent
        ? ""
        : " · " + esc(opponent.name) + ": +" + result.graceAwarded[opponent.name]) +
      "</p>";
    html += '<button class="btn primary" id="battle-again">⚡ Battle Again</button></div>';
    el.innerHTML = html;
    renderBattleSides(); // refresh grace/levels on the cards

    document.getElementById("battle-again").addEventListener("click", function () {
      document.getElementById("battle-result").innerHTML = "";
      champion = deck && deck.cards.length ? deck.draw() : champion;
      renderBattleSides();
    });
    el.scrollIntoView({ behavior: "smooth", block: "start" });
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
    loadCollection();
    loadDeck();

    // nav buttons
    document.querySelectorAll("[data-nav]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        show(btn.getAttribute("data-nav"));
      });
    });

    document.getElementById("deck-name").addEventListener("input", function (e) {
      if (deck) deck.name = e.target.value || "My Deck";
    });
    document.getElementById("deck-fill").addEventListener("click", fillDeck);
    document.getElementById("deck-clear").addEventListener("click", function () {
      deck = new Deck(document.getElementById("deck-name").value || "My Deck", "Pilgrim");
      saveDeck();
      renderBuilder();
    });
    document.getElementById("deck-save").addEventListener("click", function () {
      if (!deck.isValid()) {
        toast("Deck must have exactly " + DECK_SIZE + " cards.");
        return;
      }
      saveDeck();
      saveCollection();
      toast("📿 Deck saved! You are ready for battle.");
      show("home");
    });
    document.getElementById("begin-battle").addEventListener("click", runBattle);

    show("home");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
