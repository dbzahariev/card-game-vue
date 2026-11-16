import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { ref } from 'vue';

// Execute the current Vue script so this checks the actual app generator.
const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
const script = app.match(/<script setup>([\s\S]*?)<\/script>/)[1]
  .replace(/import \{ ref \} from "vue";/, '');
const { createDeal, suits, ranks } = new Function('ref',
  `${script}\nreturn { createDeal, suits, ranks };`)(ref);

const trials = 1_000_000;
const counts = Object.fromEntries(suits.flatMap(suit => ranks.map(rank => [rank + suit, 0])));
let pairCount = 0;
const points = { A: 4, K: 3, Q: 2, J: 1 };
let totalPoints = 0;
const suitTotals = Object.fromEntries(suits.map(suit => [suit, 0]));
for (let i = 0; i < trials; i++) {
  const hands = createDeal();
  assert.equal(hands.length, 4);
  const dealCards = hands.flatMap(hand => hand.cards.map(card => card.rank + card.suit));
  assert.equal(new Set(dealCards).size, 52, `Deal ${i}: duplicate or missing cards`);
  for (const hand of hands) assert.equal(hand.cards.length, 13);
  // Frequency statistics track North's hand across independent deals.
  const hand = hands[0].cards;
  const cards = hand.map(card => card.rank + card.suit);
  assert.equal(cards.length, 13, `Hand ${i}: incorrect size`);
  assert.equal(new Set(cards).size, 13, `Hand ${i}: duplicate cards`);
  for (const card of hand) {
    totalPoints += points[card.rank] ?? 0;
    suitTotals[card.suit]++;
  }
  for (const card of cards) {
    assert.ok(Object.hasOwn(counts, card), `Unknown card: ${card}`);
    counts[card]++;
  }
  if (cards.includes('A♠') && cards.includes('K♠')) pairCount++;
}

const expected = trials * 13 / 52;
const standardDeviation = Math.sqrt(trials * 0.25 * 0.75);
const pairProbability = (13 / 52) * (12 / 51);
const report = {
  trials,
  invalidHands: 0,
  expectedPerCard: expected,
  standardDeviation,
  highCardPoints: { average: totalPoints / trials, expected: 10 },
  suitAverages: suits.map(suit => ({ suit,
    average: suitTotals[suit] / trials, expected: 3.25 })),
  pair: { cards: ['A♠', 'K♠'], observed: pairCount,
    expected: trials * pairProbability,
    zScore: (pairCount - trials * pairProbability) / Math.sqrt(trials * pairProbability * (1 - pairProbability)) },
  cards: Object.entries(counts).map(([card, count]) => ({ card, count,
    percent: count / trials * 100,
    zScore: (count - expected) / standardDeviation })),
};
writeFileSync(new URL('../randomness-results.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
