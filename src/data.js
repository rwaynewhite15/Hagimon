/* ============================================================
   HAGIMON — Saint Definitions
   Each saint has seven virtues (5–10), a rarity, a special
   ability, and a patronage. Rarity grants a bonus to all
   virtues at battle time: Common +0, Blessed +1, Canonized +2.
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

const RARITY_COLORS = {
  Common: "#94a3b8",
  Blessed: "#60a5fa",
  Canonized: "#fbbf24",
};

const SAINT_DATA = [
  {
    name: "St. Francis",
    title: "The Poverello of Assisi",
    rarity: "Canonized",
    emblem: "🕊️",
    baseStats: { Faith: 9, Hope: 8, Charity: 10, Justice: 6, Prudence: 7, Temperance: 9, Fortitude: 6 },
    ability: "Canticle of Creation — gains +1 bonus Grace after every battle, win or lose.",
    abilityKey: "francis",
    patronage: "Animals, ecology, and peace",
  },
  {
    name: "St. Michael",
    title: "The Archangel, Prince of the Heavenly Host",
    rarity: "Canonized",
    emblem: "⚔️",
    baseStats: { Faith: 8, Hope: 6, Charity: 5, Justice: 10, Prudence: 6, Temperance: 5, Fortitude: 10 },
    ability: "Sword of Justice — +3 to his score in any battle where Justice is a dominant virtue.",
    abilityKey: "michael",
    patronage: "Soldiers, police, and protection against evil",
  },
  {
    name: "St. Theresa",
    title: "The Little Flower of Lisieux",
    rarity: "Blessed",
    emblem: "🌹",
    baseStats: { Faith: 8, Hope: 9, Charity: 9, Justice: 5, Prudence: 6, Temperance: 8, Fortitude: 5 },
    ability: "The Little Way — her mercy heals: the opponent receives +1 Grace after the battle.",
    abilityKey: "theresa",
    patronage: "Missionaries, florists, and the sick",
  },
  {
    name: "St. Joan of Arc",
    title: "The Maid of Orléans",
    rarity: "Blessed",
    emblem: "🚩",
    baseStats: { Faith: 9, Hope: 7, Charity: 5, Justice: 7, Prudence: 5, Temperance: 5, Fortitude: 10 },
    ability: "Voices of Victory — if she is losing, she re-rolls with a surge of +1 to +3 to her score.",
    abilityKey: "joan",
    patronage: "France, soldiers, and prisoners",
  },
  {
    name: "St. Augustine",
    title: "Doctor of Grace, Bishop of Hippo",
    rarity: "Blessed",
    emblem: "📖",
    baseStats: { Faith: 8, Hope: 6, Charity: 7, Justice: 6, Prudence: 10, Temperance: 6, Fortitude: 5 },
    ability: "Restless Heart — +2 to his score when facing a higher-level opponent.",
    abilityKey: "augustine",
    patronage: "Theologians, converts, and printers",
  },
  {
    name: "St. Catherine",
    title: "The Philosopher of Alexandria",
    rarity: "Blessed",
    emblem: "☸️",
    baseStats: { Faith: 7, Hope: 6, Charity: 6, Justice: 7, Prudence: 9, Temperance: 6, Fortitude: 6 },
    ability: "The Unbroken Wheel — her wisdom prevails: she wins any tied battle.",
    abilityKey: "catherine",
    patronage: "Philosophers, students, and librarians",
  },
  {
    name: "St. Jude",
    title: "Apostle of the Impossible",
    rarity: "Common",
    emblem: "🕯️",
    baseStats: { Faith: 8, Hope: 10, Charity: 7, Justice: 5, Prudence: 5, Temperance: 6, Fortitude: 6 },
    ability: "Patron of Lost Causes — +2 to his score when trailing by 3 or more.",
    abilityKey: "jude",
    patronage: "Hopeless causes and desperate situations",
  },
  {
    name: "St. Peter",
    title: "Keeper of the Keys, First Among Apostles",
    rarity: "Canonized",
    emblem: "🗝️",
    baseStats: { Faith: 10, Hope: 6, Charity: 6, Justice: 6, Prudence: 5, Temperance: 5, Fortitude: 8 },
    ability: "Keys of the Kingdom — automatically wins against Common saints.",
    abilityKey: "peter",
    patronage: "Popes, fishermen, and locksmiths",
  },
  {
    name: "St. Cecilia",
    title: "The Singing Martyr of Rome",
    rarity: "Common",
    emblem: "🎵",
    baseStats: { Faith: 8, Hope: 7, Charity: 7, Justice: 5, Prudence: 7, Temperance: 9, Fortitude: 5 },
    ability: "Song of Heaven — her hymn distracts: the opponent's dominant virtue is lowered by 2.",
    abilityKey: "cecilia",
    patronage: "Musicians and composers",
  },
  {
    name: "St. Demetrius",
    title: "The Great Martyr of Thessaloniki",
    rarity: "Common",
    emblem: "🛡️",
    baseStats: { Faith: 7, Hope: 6, Charity: 5, Justice: 8, Prudence: 6, Temperance: 5, Fortitude: 10 },
    ability: "Warrior's Stand — +2 Fortitude when battling a Canonized saint.",
    abilityKey: "demetrius",
    patronage: "Soldiers and the city of Thessaloniki",
  },
];

// Export for Node (tests) and attach to the global object for browsers —
// top-level `const` in a classic script does not become a window property.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SAINT_DATA, VIRTUE_NAMES, VIRTUE_COLORS, RARITY_BONUS, RARITY_COLORS };
} else {
  Object.assign(globalThis, { SAINT_DATA, VIRTUE_NAMES, VIRTUE_COLORS, RARITY_BONUS, RARITY_COLORS });
}
