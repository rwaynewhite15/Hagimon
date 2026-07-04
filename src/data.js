/* ============================================================
   HAGIMON — Saint & Sin Definitions
   The pilgrim faces the Seven Deadly Sins and invokes the
   saints for intercession. Each sin assails its countering
   virtue; each saint lends their own virtue to the pilgrim's.

   Rarity grants a bonus to a saint's virtues at trial time
   (Common +0, Blessed +1, Canonized +2) and sets the Dulia
   cost of invoking them (Common 2, Blessed 3, Canonized 4).
   ============================================================ */

/* The seven capital virtues — the traditional contraries of the
   seven deadly sins, in the classical pairing order. */
const VIRTUE_NAMES = [
  "Humility",
  "Generosity",
  "Chastity",
  "Kindness",
  "Temperance",
  "Patience",
  "Diligence",
];

const VIRTUE_COLORS = {
  Humility: "#a855f7", // purple
  Generosity: "#f5c542", // gold
  Chastity: "#22d3ee", // cyan
  Kindness: "#ef4444", // red
  Temperance: "#c4b5fd", // lavender
  Patience: "#34d399", // green
  Diligence: "#fb923c", // orange
};

const RARITY_BONUS = { Common: 0, Blessed: 1, Canonized: 2 };
const RARITY_DULIA = { Common: 1, Blessed: 2, Canonized: 3 }; // cost to invoke
const RARITY_UNLOCK = { Common: 6, Blessed: 12, Canonized: 20 }; // cost to unlock

const RARITY_COLORS = {
  Common: "#94a3b8",
  Blessed: "#60a5fa",
  Canonized: "#fbbf24",
};

/* ---------------- The Seven Deadly Sins --------------------
   Each sin assails the virtue that counters it. Severity
   tiers set its base power: Venial 12, Grave 16, Mortal 20
   (plus a visible roll of 1–4 when it manifests).            */

const SIN_DATA = [
  {
    name: "Pride",
    emblem: "👑",
    virtue: "Humility",
    flavor: "A whisper says you have no need of God or neighbor.",
  },
  {
    name: "Greed",
    emblem: "🪙",
    virtue: "Generosity",
    flavor: "The desire to possess grips your heart and closes your hand.",
  },
  {
    name: "Lust",
    emblem: "🥀",
    virtue: "Chastity",
    flavor: "A disordered desire clouds your judgment.",
  },
  {
    name: "Envy",
    emblem: "🐍",
    virtue: "Kindness",
    flavor: "Your neighbor's blessing begins to feel like your own loss.",
  },
  {
    name: "Gluttony",
    emblem: "🍷",
    virtue: "Temperance",
    flavor: "Appetite rules where moderation once reigned.",
  },
  {
    name: "Wrath",
    emblem: "🌋",
    virtue: "Patience",
    flavor: "A burning anger demands to be fed.",
  },
  {
    name: "Sloth",
    emblem: "🕸️",
    virtue: "Diligence",
    flavor: "A heavy despair whispers that nothing is worth doing.",
  },
];

/* Severity is a live label for a sin's CURRENT power in the pool.
   grace/dulia: the prizes for winning a trial in that band. */
const SEVERITY_TIERS = [
  { name: "Venial", maxPower: 8, grace: 3, dulia: 3 },
  { name: "Grave", maxPower: 12, grace: 4, dulia: 4 },
  { name: "Mortal", maxPower: Infinity, grace: 5, dulia: 5 },
];

/* ---------------- The Ten Saints ---------------------------
   patronSin: the sin this saint is especially invoked
   against (+2 to the pilgrim's defense in that trial).       */

const SAINT_DATA = [
  {
    name: "St. Francis",
    title: "The Poverello of Assisi",
    rarity: "Canonized",
    emblem: "🕊️",
    baseStats: { Humility: 9, Generosity: 10, Chastity: 7, Kindness: 9, Temperance: 8, Patience: 7, Diligence: 5 },
    ability: "Canticle of Creation — the pilgrim gains +1 bonus Grace after every trial, won or lost.",
    abilityKey: "francis",
    patronSin: "Greed",
    patronage: "Animals, ecology, and holy poverty",
  },
  {
    name: "St. Michael",
    title: "The Archangel, Prince of the Heavenly Host",
    rarity: "Canonized",
    emblem: "⚔️",
    baseStats: { Humility: 10, Generosity: 5, Chastity: 8, Kindness: 5, Temperance: 5, Patience: 6, Diligence: 10 },
    ability: "Sword of Justice — +3 to the pilgrim's defense against Grave and Mortal sins (power 9+).",
    abilityKey: "michael",
    patronSin: "Pride",
    patronage: "Protection against evil — his very name asks, \"Who is like God?\"",
  },
  {
    name: "St. Theresa",
    title: "The Little Flower of Lisieux",
    rarity: "Blessed",
    emblem: "🌹",
    baseStats: { Humility: 8, Generosity: 6, Chastity: 8, Kindness: 9, Temperance: 5, Patience: 10, Diligence: 5 },
    ability: "The Little Way — when she intercedes in a victory, her gentleness restores 1 Resolve.",
    abilityKey: "theresa",
    patronSin: "Wrath",
    patronage: "Missionaries, florists, and the sick",
  },
  {
    name: "St. Joan of Arc",
    title: "The Maid of Orléans",
    rarity: "Blessed",
    emblem: "🚩",
    baseStats: { Humility: 7, Generosity: 5, Chastity: 9, Kindness: 5, Temperance: 6, Patience: 5, Diligence: 10 },
    ability: "Voices of Victory — if the trial is being lost, she charges again: +1 to +3 to the defense.",
    abilityKey: "joan",
    patronSin: "Sloth",
    patronage: "France, soldiers, and those who must act",
  },
  {
    name: "St. Augustine",
    title: "Doctor of Grace, Bishop of Hippo",
    rarity: "Blessed",
    emblem: "📖",
    baseStats: { Humility: 7, Generosity: 6, Chastity: 10, Kindness: 6, Temperance: 6, Patience: 5, Diligence: 8 },
    ability: "Restless Heart — grace perfects weakness: +2 when the pilgrim's tested virtue is 4 or less.",
    abilityKey: "augustine",
    patronSin: "Lust",
    patronage: "Theologians, converts, and those who struggle",
  },
  {
    name: "St. Catherine",
    title: "The Philosopher of Alexandria",
    rarity: "Blessed",
    emblem: "☸️",
    baseStats: { Humility: 6, Generosity: 6, Chastity: 8, Kindness: 9, Temperance: 6, Patience: 7, Diligence: 6 },
    ability: "The Unbroken Wheel — her wisdom prevails: an exactly tied trial becomes a victory.",
    abilityKey: "catherine",
    patronSin: "Envy",
    patronage: "Philosophers, students, and librarians",
  },
  {
    name: "St. Jude",
    title: "Apostle of the Impossible",
    rarity: "Common",
    emblem: "🕯️",
    baseStats: { Humility: 7, Generosity: 6, Chastity: 5, Kindness: 7, Temperance: 5, Patience: 8, Diligence: 9 },
    ability: "Patron of Lost Causes — +2 to the defense when it trails the sin's power by 3 or more.",
    abilityKey: "jude",
    patronSin: "Sloth",
    patronage: "Hopeless causes and desperate situations",
  },
  {
    name: "St. Peter",
    title: "Keeper of the Keys, First Among Apostles",
    rarity: "Canonized",
    emblem: "🗝️",
    baseStats: { Humility: 10, Generosity: 6, Chastity: 5, Kindness: 6, Temperance: 8, Patience: 5, Diligence: 8 },
    ability: "Keys of the Kingdom — trials against Venial sins (power 8 or less) succeed outright.",
    abilityKey: "peter",
    patronSin: "Gluttony",
    patronage: "Popes, fishermen, and fresh starts after failure",
  },
  {
    name: "St. Cecilia",
    title: "The Singing Martyr of Rome",
    rarity: "Common",
    emblem: "🎵",
    baseStats: { Humility: 7, Generosity: 6, Chastity: 9, Kindness: 7, Temperance: 9, Patience: 6, Diligence: 5 },
    ability: "Song of Heaven — her hymn weakens the tempter: the sin's power is lowered by 2.",
    abilityKey: "cecilia",
    patronSin: "Gluttony",
    patronage: "Musicians and composers",
  },
  {
    name: "St. Demetrius",
    title: "The Great Martyr of Thessaloniki",
    rarity: "Common",
    emblem: "🛡️",
    baseStats: { Humility: 6, Generosity: 5, Chastity: 6, Kindness: 5, Temperance: 7, Patience: 10, Diligence: 8 },
    ability: "Warrior's Stand — a soldier's endurance: +2 when the trial tests Patience.",
    abilityKey: "demetrius",
    patronSin: "Wrath",
    patronage: "Soldiers and the city of Thessaloniki",
  },
];

// Export for Node (tests) and attach to the global object for browsers —
// top-level `const` in a classic script does not become a window property.
const HAGIMON_DATA = {
  SAINT_DATA,
  SIN_DATA,
  SEVERITY_TIERS,
  VIRTUE_NAMES,
  VIRTUE_COLORS,
  RARITY_BONUS,
  RARITY_DULIA,
  RARITY_UNLOCK,
  RARITY_COLORS,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = HAGIMON_DATA;
} else {
  Object.assign(globalThis, HAGIMON_DATA);
}
