<script setup>
import { ref, computed, watch, inject, onMounted, onUnmounted } from 'vue';
import { useGameEngine } from '../composables/useGameEngine';
import { useSound } from '../composables/useSound';
import { useLeaveGame } from '../composables/useLeaveGame';
import MatchCard from './MatchCard.vue';
import { useI18n } from 'vue-i18n';

const { state, resolvePhase2Match, resolvePhase2MatchRandomly } = useGameEngine();
const { playTap } = useSound();
const { leaveGame } = useLeaveGame();
const { t, locale } = useI18n();

const TIMER_SECONDS = 10;
const timeLeft = ref(TIMER_SECONDS);
const timeoutKeptMessage = ref(null);
let timer = null;
let timeoutClearId = null;

// The countdown stands still while the degree description is open or the tab is in the background,
// so reading a description never costs a random discard.
const degreeInfoOpen = inject('degreeInfoOpen', ref(false));
const tabHidden = ref(typeof document !== 'undefined' && document.hidden);
const paused = computed(() => degreeInfoOpen.value || tabHidden.value);
const onVisibilityChange = () => { tabHidden.value = document.hidden; };

const startTimer = () => {
  clearInterval(timer);
  timeoutKeptMessage.value = null;
  timeLeft.value = TIMER_SECONDS;
  timer = setInterval(() => {
    if (paused.value) return;
    timeLeft.value--;
    if (timeLeft.value <= 0) {
      clearInterval(timer);
      handleRandom();
    }
  }, 1000);
};

const handleRandom = () => {
  if (state.value.phase !== 'phase2') return;
  playTap();
  const kept = resolvePhase2MatchRandomly();
  const name = kept?.name?.[locale.value] ?? kept?.name?.en ?? '';
  timeoutKeptMessage.value = t('phase2.timeout_kept', { name });
  if (timeoutClearId) clearTimeout(timeoutClearId);
  timeoutClearId = setTimeout(() => {
    timeoutKeptMessage.value = null;
    timeoutClearId = null;
  }, 4000);
};

// A second tap right after a pick lands on the next pair's card (the DOM has already moved on): ignore it.
const PICK_LOCK_MS = 350;
let lastPickAt = 0;

/** id = the degree to KEEP (winner). */
const handleKeep = (id) => {
  if (state.value.phase !== 'phase2') return;
  const now = Date.now();
  if (now - lastPickAt < PICK_LOCK_MS) return;
  if (resolvePhase2Match(id)) {
    lastPickAt = now;
    playTap();
  }
};

// Only run the timer while the game is actually in phase2.
watch(() => [state.value.phase, state.value.currentMatch], ([phase, newVal]) => {
  if (phase === 'phase2' && newVal) startTimer();
  else clearInterval(timer);
}, { immediate: true });

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange);
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange);
  clearInterval(timer);
  if (timeoutClearId) clearTimeout(timeoutClearId);
});
</script>

<template>
  <div class="phase2-root h-100 d-flex flex-column justify-content-center align-items-center text-center">
    <div class="mb-3 w-100 px-2">
      <div class="d-flex align-items-start justify-content-between mb-2">
        <button
          type="button"
          class="btn btn-link link-secondary small text-decoration-none back-link"
          @click="leaveGame"
        >
          ← {{ t('common.back') }}
        </button>
        <span class="invisible">← {{ t('common.back') }}</span>
      </div>
      <h2 class="fw-bold h3 mb-2">{{ t('phase2.title') }}</h2>
      <p class="text-secondary small mb-1">{{ t('phase2.instruction') }}</p>
      <p class="text-secondary small mb-3">{{ t('phase2.minimal_note') }}</p>
      <div class="d-flex flex-column align-items-center gap-2 mb-2">
        <div
          role="timer"
          class="badge rounded-pill px-3 py-2 fs-6 fw-normal shadow-sm transition-colors"
          :class="[timeLeft <= 3 ? 'bg-danger text-white' : 'bg-warning text-dark', { 'animate-pulse': !paused }]"
        >
          {{ t('phase2.timer', { seconds: timeLeft }) }} <span aria-hidden="true">⏳</span>
        </div>
        <p class="small text-secondary mb-0">{{ t('phase2.timeout_explanation') }}</p>
        <p v-if="timeoutKeptMessage" class="small text-info mb-0 fw-bold" role="status">
          {{ timeoutKeptMessage }}
        </p>
        <p v-if="state.phase2TotalPairs > 0" class="small text-secondary mb-0">
          {{ t('progress.phase2_pairs', { current: state.phase2TotalPairs - state.phase2Queue.length, total: state.phase2TotalPairs }) }}
        </p>
      </div>
    </div>

    <!-- Vertical stack: Option A, VS, Option B (one per line, like tournament) -->
    <div v-if="state.currentMatch" class="phase2-options d-flex flex-column align-items-center w-100 px-2 gap-2">
      <p class="small text-success fw-bold mb-1 phase2-tap-label">{{ t('phase2.tap_to_keep') }}</p>
      <!-- Option A: tap to keep -->
      <div class="phase2-option w-100 position-relative">
        <div class="card-hover-effect phase2-pick-keep">
          <MatchCard :degree="state.currentMatch.a" pickable @pick="handleKeep(state.currentMatch.a.id)" />
        </div>
      </div>

      <div class="phase2-vs fw-bold text-secondary user-select-none font-monospace py-1" aria-hidden="true">{{ t('phase2.vs') }}</div>

      <!-- Option B: tap to keep -->
      <div class="phase2-option w-100 position-relative">
        <div class="card-hover-effect phase2-pick-keep">
          <MatchCard :degree="state.currentMatch.b" pickable @pick="handleKeep(state.currentMatch.b.id)" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Allow scroll on small viewports so footer does not block second degree card */
.phase2-root {
  padding-bottom: max(5rem, 80px + env(safe-area-inset-bottom, 0px));
  min-height: min-content;
  box-sizing: border-box;
}
/* Vertical stack: one option per line (like tournament bracket) */
.phase2-options {
  max-width: 360px;
}
.phase2-tap-label {
  letter-spacing: 0.05em;
}
/* Emphasize: tap to KEEP (green tint) */
.phase2-pick-keep {
  background: rgba(var(--bs-success-rgb), 0.12);
  border-radius: 1rem;
  border: 1px solid rgba(var(--bs-success-rgb), 0.35);
}
.phase2-vs {
  font-size: 0.9rem;
}

.card-hover-effect { transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
.card-hover-effect:active { transform: scale(0.95); }

.animate-pulse { animation: pulse 1s infinite; }
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.transition-colors { transition: background-color 0.3s, color 0.3s; }
</style>
