<script setup>
import { ref } from "vue";

const deals = ref([]);
const dealCount = ref(1);
const exporting = ref(false);
const exportError = ref('');
const players = ["N", "E", "S", "W"];
const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];

function createDeal() {
  const deck = suits.flatMap((suit) =>
    ranks.map((rank) => ({ suit, rank }))
  );

  // Разбъркваме едно тесте за цялото раздаване.
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return players.map((player, index) => ({
    player,
    cards: deck.slice(index * 13, (index + 1) * 13).sort((a, b) =>
      suits.indexOf(a.suit) - suits.indexOf(b.suit) ||
      ranks.indexOf(a.rank) - ranks.indexOf(b.rank)
    ),
  }));
}

function createDeals() {
  if (!Number.isInteger(dealCount.value) || dealCount.value < 1) return;
  deals.value = Array.from({ length: dealCount.value }, () => createDeal());
}

async function exportToWord() {
  exporting.value = true;
  exportError.value = '';
  try {
    const { downloadDeals } = await import('./exportDeals.js');
    await downloadDeals(deals.value);
  } catch (error) {
    console.error(error);
    exportError.value = 'Експортът не успя. Опитай отново.';
  } finally {
    exporting.value = false;
  }
}

</script>

<template>
  <div class="page">
    <main class="welcome">
      <section class="bridge-hand" aria-labelledby="hand-title">
        <h2 id="hand-title">Бридж раздаване</h2>
        <form class="deal-controls" @submit.prevent="createDeals">
          <label for="deal-count">Брой раздавания</label>
          <input id="deal-count" v-model.number="dealCount" type="number" min="1" step="1" required>
          <button class="create-hand" type="submit">Създай раздавания</button>
          <button class="create-hand" type="button" :disabled="!deals.length || exporting" @click="exportToWord">
            {{ exporting ? 'Експортиране…' : 'Експорт в Word' }}
          </button>
        </form>
        <p v-if="exportError" role="alert">{{ exportError }}</p>
        <div aria-live="polite">
          <div v-if="deals.length" class="deals">
            <article v-for="(hands, index) in deals" :key="index" class="deal-board" :aria-labelledby="`deal-${index}`">
              <h3 :id="`deal-${index}`">Раздаване {{ index + 1 }}</h3>
              <div class="deal">
            <section v-for="hand in hands" :key="hand.player" class="player-hand" :data-player="hand.player" :style="{ gridArea: hand.player }" :aria-label="hand.player">
              <h3 class="player-label">{{ hand.player }}</h3>
              <div class="suit-rows">
            <div v-for="suit in suits" :key="suit" class="suit-row">
              <span class="suit-label" :class="{ 'card-red': suit === '♥' || suit === '♦' }">{{ suit }}</span>
              <ul class="cards" :aria-label="suit">
                <li
              v-for="card in hand.cards.filter((card) => card.suit === suit)"
              :key="card.suit + card.rank"
              class="card"
              :class="{ 'card-red': card.suit === '♥' || card.suit === '♦' }"
            >
              <span>{{ card.rank }}</span>
                </li>
              </ul>
              <span v-if="!hand.cards.some((card) => card.suit === suit)">—</span>
            </div>
              </div>
            </section>
              </div>
            </article>
          </div>
          <p v-else>Въведи брой и натисни „Създай раздавания“.</p>
        </div>
      </section>
    </main>
  </div>
</template>
