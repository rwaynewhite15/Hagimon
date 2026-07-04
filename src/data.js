/* ============================================================
   HAGIMON — Saint & Sin Definitions
   The pilgrim faces the Seven Deadly Sins and invokes the
   saints for intercession. Each sin assails its countering
   virtue; each saint lends their own virtue to the pilgrim's.

   Rarity grants a bonus to a saint's virtues at trial time
   (Common +0, Blessed +1, Canonized +2) and sets the Dulia
   cost of invoking them (Common 2, Blessed 3, Canonized 4).
   ============================================================ */

const VIRTUE_NAMES = [
  "Faith",
  "Hope",
  "Charity",
  "Justice",
  "Prudence",
  "Temperance",
  "Fortitude",
];

const VIRTUE_COLORS = {
  Faith: "#a855f7", // purple
  Hope: "#22d3ee", // cyan
  Charity: "#ef4444", // red
  Justice: "#f5c542", // gold
  Prudence: "#34d399", // green
  Temperance: "#c4b5fd", // lavender
  Fortitude: "#fb923c", // orange
};

const RARITY_BONUS = { Common: 0, Blessed: 1, Canonized: 2 };
const RARITY_DULIA = { Common: 2, Blessed: 3, Canonized: 4 };

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
    virtue: "Faith",
    flavor: "A whisper says you have no need of God or neighbor.",
  },
  {
    name: "Greed",
    emblem: "🪙",
    virtue: "Justice",
    flavor: "The desire to possess grips your heart and closes your hand.",
  },
  {
    name: "Lust",
    emblem: "🥀",
    virtue: "Prudence",
    flavor: "A disordered desire clouds your judgment.",
  },
  {
    name: "Envy",
    emblem: "🐍",
    virtue: "Charity",
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
    virtue: "Fortitude",
    flavor: "A burning anger demands to be fed.",
  },
  {
    name: "Sloth",
    emblem: "🕸️",
    virtue: "Hope",
    flavor: "A heavy despair whispers that nothing is worth doing.",
  },
];

const SEVERITY_TIERS = [
  { name: "Venial", basePower: 12, grace: 3 },
  { name: "Grave", basePower: 16, grace: 4 },
  { name: "Mortal", basePower: 20, grace: 5 },
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
    baseStats: { Faith: 9, Hope: 8, Charity: 10, Justice: 6, Prudence: 7, Temperance: 9, Fortitude: 6 },
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
    baseStats: { Faith: 8, Hope: 6, Charity: 5, Justice: 10, Prudence: 6, Temperance: 5, Fortitude: 10 },
    ability: "Sword of Justice — +3 to the pilgrim's defense against Grave and Mortal sins.",
    abilityKey: "michael",
    patronSin: "Pride",
    patronage: "Protection against evil; he cast down the proudest of angels",
  },
  {
    name: "St. Theresa",
    title: "The Little Flower of Lisieux",
    rarity: "Blessed",
    emblem: "🌹",
    baseStats: { Faith: 8, Hope: 9, Charity: 9, Justice: 5, Prudence: 6, Temperance: 8, Fortitude: 5 },
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
    baseStats: { Faith: 9, Hope: 7, Charity: 5, Justice: 7, Prudence: 5, Temperance: 5, Fortitude: 10 },
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
    baseStats: { Faith: 8, Hope: 6, Charity: 7, Justice: 6, Prudence: 10, Temperance: 6, Fortitude: 5 },
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
    baseStats: { Faith: 7, Hope: 6, Charity: 6, Justice: 7, Prudence: 9, Temperance: 6, Fortitude: 6 },
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
    baseStats: { Faith: 8, Hope: 10, Charity: 7, Justice: 5, Prudence: 5, Temperance: 6, Fortitude: 6 },
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
    baseStats: { Faith: 10, Hope: 6, Charity: 6, Justice: 6, Prudence: 5, Temperance: 5, Fortitude: 8 },
    ability: "Keys of the Kingdom — Venial sins are banished outright, without a contest.",
    abilityKey: "peter",
    patronSin: "Gluttony",
    patronage: "Popes, fishermen, and fresh starts after failure",
  },
  {
    name: "St. Cecilia",
    title: "The Singing Martyr of Rome",
    rarity: "Common",
    emblem: "🎵",
    baseStats: { Faith: 8, Hope: 7, Charity: 7, Justice: 5, Prudence: 7, Temperance: 9, Fortitude: 5 },
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
    baseStats: { Faith: 7, Hope: 6, Charity: 5, Justice: 8, Prudence: 6, Temperance: 5, Fortitude: 10 },
    ability: "Warrior's Stand — +2 to the defense when the trial tests Fortitude.",
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
  RARITY_COLORS,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = HAGIMON_DATA;
} else {
  Object.assign(globalThis, HAGIMON_DATA);
}
