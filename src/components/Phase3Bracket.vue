<script setup>
import { ref, computed, onMounted } from 'vue';
import { useGameEngine } from '../composables/useGameEngine';
import { useSound } from '../composables/useSound';
import MatchCard from './MatchCard.vue';
import { useI18n } from 'vue-i18n';

const { state, resolveBracketMatch, resetGame, repairBracketState } = useGameEngine();
const { playAdvance, playTap } = useSound();
const { t } = useI18n();

const introDismissedForRound = ref(null);

onMounted(() => {
  if (state.value.phase === 'phase3-bracket') repairBracketState();
});

/** Bracket level label by size: Final, Quarter, Octave, 16-level, etc. */
function bracketLevelLabel(size) {
  const n = Math.max(2, size || 2);
  const key = `progress.bracket_level_${n}`;
  const out = t(key);
  return out !== key ? out : t('progress.phase3_bracket');
}

/** Current round size (teams at start of this round) for correct stage name. */
const currentRoundSize = computed(() => {
  const total = state.value.bracketTotal || 2;
  const round = state.value.round || 1;
  return total / Math.pow(2, round - 1);
});

const stageName = computed(() => {
  const size = currentRoundSize.value;
  if (size <= 2) return t('bracket.final');
  if (size <= 4) return t('bracket.semi_final');
  if (size <= 8) return t('bracket.quarter_final');
  if (size <= 16) return t('bracket.round_of_16');
  if (size <= 32) return t('bracket.round_of_32');
  if (size <= 64) return t('bracket.round_of_64');
  if (size <= 128) return t('bracket.round_of_128');
  return t('bracket.round_of_16');
});

/** Badge shows current stage (Octave, Quarter, etc.), not initial bracket size. */
const bracketLevelBadge = computed(() => bracketLevelLabel(currentRoundSize.value));

// Per-round progress: matches in this round (e.g. "match 3 of 16" for round of 32)
const nextQueue = computed(() => state.value.nextRoundQueue || []);
const bracketQueue = computed(() => state.value.bracketQueue || []);
// Include current match in total so we never show "17 of 16" (current is shifted off queue)
const totalInRound = computed(() => {
  const base = nextQueue.value.length + bracketQueue.value.length;
  return state.value.currentMatch ? base + 1 : base;
});
const currentMatchInRound = computed(() => nextQueue.value.length + 1);
const toGoInRound = computed(() => {
  const queue = bracketQueue.value.length;
  return state.value.currentMatch ? queue + 1 : queue;
});

/** Total number of bracket rounds (e.g. 16 teams → 4 rounds: 8→4→2→1). */
const totalRounds = computed(() => {
  const total = state.value.bracketTotal || 2;
  return Math.round(Math.log2(total));
});

const matchProgress = computed(() => {
  const totalInR = totalInRound.value;
  if (totalInR < 1) return bracketLevelBadge.value;
  const current = currentMatchInRound.value;
  const toGo = toGoInRound.value;
  const level = bracketLevelBadge.value;
  return t('bracket.match_progress', { current, totalInRound: totalInR, toGo, level });
});

/** Countdown: "Round X of Y". */
const roundCountdown = computed(() => {
  const r = state.value.round;
  const total = totalRounds.value;
  if (r == null || total < 1) return '';
  return t('bracket.round_countdown', { current: r, total });
});

/** Countdown: "N matches left this round" (or "1 match left"). */
const matchesLeftLabel = computed(() => {
  const n = toGoInRound.value;
  return n === 1 ? t('bracket.matches_left', { n: 1 }) : t('bracket.matches_left_plural', { n });
});

/** Before/during round: "remaining X of Y" (X = matches left including current, Y = total in round). */
const remainingInRound = computed(() => {
  const total = totalInRound.value;
  const toGo = toGoInRound.value;
  return { remaining: Math.min(toGo, total), total };
});

/** Binary tree rows for progress: each row = round, dots = matches; filled = done, white = to do. */
const bracketTreeRows = computed(() => {
  const total = state.value.bracketTotal || 2;
  const round = state.value.round || 1;
  const nextLen = nextQueue.value.length;
  const rows = [];
  const numRounds = Math.round(Math.log2(total));
  for (let r = 1; r <= numRounds; r++) {
    const size = total / Math.pow(2, r);
    const filled = round > r ? size : (round === r ? nextLen : 0);
    rows.push({ round: r, size, filled });
  }
  return rows;
});

const showRoundIntro = computed(() => {
  const r = state.value.round;
  if (r == null) return false;
  const total = state.value.bracketTotal || 2;
  if (total <= 2) return false;
  return introDismissedForRound.value !== r;
});

function dismissIntro() {
  playTap();
  introDismissedForRound.value = state.value.round;
}

const handlePickWinner = (winnerId) => {
  playAdvance();
  resolveBracketMatch(winnerId);
};
</script>

<template>
  <div class="phase3-root h-100 d-flex flex-column min-h-0">
    <div class="phase3-scroll flex-grow-1 min-h-0 overflow-auto d-flex flex-column justify-content-center align-items-center text-center py-3">
    <div class="mb-3 w-100 px-2">
      <div class="d-flex align-items-start justify-content-between mb-2">
        <button
          type="button"
          class="btn btn-link link-secondary small text-decoration-none p-0"
          @click="playTap(); resetGame()"
        >
          ← {{ t('common.back') }}
        </button>
        <span class="invisible">← {{ t('common.back') }}</span>
      </div>
      <h2 class="fw-bold h3 mb-2">{{ t('bracket.title') }}</h2>
      <p class="text-secondary small mb-2">{{ t('bracket.instruction') }}</p>
      <span class="badge rounded-pill px-3 py-2 bg-primary bg-opacity-25 border border-primary border-opacity-50">
        {{ bracketLevelBadge }}
      </span>
      <p class="small text-secondary mt-2 mb-0">{{ matchProgress }}</p>
      <div v-if="roundCountdown || toGoInRound > 0" class="small text-secondary mt-1 d-flex flex-wrap justify-content-center gap-2">
        <span v-if="roundCountdown" class="text-primary">{{ roundCountdown }}</span>
        <span v-if="toGoInRound > 0">{{ matchesLeftLabel }}</span>
      </div>
      <!-- Compact tree: done = primary, to do = white -->
      <div v-if="bracketTreeRows.length > 0 && !showRoundIntro" class="bracket-tree bracket-tree-compact mt-2" aria-hidden="true">
        <div
          v-for="(row, rowIdx) in bracketTreeRows"
          :key="'h-' + rowIdx"
          class="bracket-tree-row d-flex justify-content-center gap-1 flex-wrap"
        >
          <span
            v-for="i in row.size"
            :key="i"
            class="bracket-tree-dot rounded-circle"
            :class="i <= row.filled ? 'bracket-tree-dot-done' : 'bracket-tree-dot-pending'"
          />
        </div>
      </div>
    </div>

    <!-- Round intro: intermediate page before matches of this stage -->
    <div v-if="state.currentMatch && showRoundIntro" class="w-100 px-3 py-5">
      <div class="rounded-4 border border-primary border-opacity-50 bg-dark bg-opacity-50 p-5">
        <p class="fs-2 fw-bold text-primary mb-2">{{ stageName }}</p>
        <p class="fs-5 fw-bold text-light mb-2">{{ t('bracket.remaining_of', remainingInRound) }}</p>
        <!-- Binary tree: colored = done, white = to do -->
        <div class="bracket-tree mb-3" aria-hidden="true">
          <div
            v-for="(row, rowIdx) in bracketTreeRows"
            :key="rowIdx"
            class="bracket-tree-row d-flex justify-content-center gap-1 flex-wrap"
          >
            <span
              v-for="i in row.size"
              :key="i"
              class="bracket-tree-dot rounded-circle"
              :class="i <= row.filled ? 'bracket-tree-dot-done' : 'bracket-tree-dot-pending'"
            />
          </div>
        </div>
        <p v-if="roundCountdown" class="small text-primary mb-1">{{ roundCountdown }}</p>
        <p v-if="currentMatchInRound > 1" class="small text-secondary mb-2" :class="{ 'mb-4': toGoInRound === 0 }">{{ matchProgress }}</p>
        <p v-else class="small text-secondary mb-4">{{ t('bracket.remaining_of', remainingInRound) }}</p>
        <p v-if="currentMatchInRound > 1 && toGoInRound > 0" class="small text-secondary mb-4">{{ matchesLeftLabel }}</p>
        <button type="button" class="btn btn-primary rounded-pill px-5 py-3 fw-bold" @click="dismissIntro">
          {{ t('bracket.continue') }}
        </button>
      </div>
    </div>

    <!-- Match: vertical stack (Option A, VS, Option B) -->
    <div v-else-if="state.currentMatch" class="phase3-options d-flex flex-column align-items-center w-100 px-2 gap-2">
      <div class="phase3-option w-100 position-relative">
        <div
          @click="handlePickWinner(state.currentMatch.a.id)"
          class="card-hover-effect cursor-pointer position-relative bracket-pick bracket-pick-keep"
        >
          <MatchCard :degree="state.currentMatch.a" compact />
        </div>
      </div>

      <div class="fw-bold fs-5 text-muted opacity-50 user-select-none py-1 font-monospace">{{ t('phase2.vs') }}</div>

      <div class="phase3-option w-100 position-relative">
        <div
          @click="handlePickWinner(state.currentMatch.b.id)"
          class="card-hover-effect cursor-pointer position-relative bracket-pick bracket-pick-keep"
        >
          <MatchCard :degree="state.currentMatch.b" compact />
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<style scoped>
.phase3-root { }
.phase3-scroll { -webkit-overflow-scrolling: touch; }
.phase3-options {
  max-width: 360px;
}
/* Emphasize: tap to KEEP (choose winner) */
.bracket-pick-keep {
  background: rgba(var(--bs-success-rgb), 0.12);
  border-radius: 1rem;
  border: 1px solid rgba(var(--bs-success-rgb), 0.35);
}
.card-hover-effect { transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
.card-hover-effect:active { transform: scale(0.95); }
.cursor-pointer { cursor: pointer; }
.bracket-tree {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}
.bracket-tree-row {
  display: flex;
  justify-content: center;
  gap: 0.15rem;
  flex-wrap: wrap;
}
.bracket-tree-dot {
  width: 0.4rem;
  height: 0.4rem;
  min-width: 0.4rem;
  min-height: 0.4rem;
  flex-shrink: 0;
  border-radius: 50%;
  aspect-ratio: 1;
}
.bracket-tree-dot-done {
  background: var(--bs-primary);
  opacity: 0.9;
}
.bracket-tree-dot-pending {
  background: rgba(255, 255, 255, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.bracket-tree-compact .bracket-tree-dot {
  width: 0.35rem;
  height: 0.35rem;
  min-width: 0.35rem;
  min-height: 0.35rem;
}
</style>
