<script setup>
import { ref, watch, onUnmounted } from 'vue';
import { useGameEngine } from '../composables/useGameEngine';
import { useSound } from '../composables/useSound';
import MatchCard from './MatchCard.vue';
import { useI18n } from 'vue-i18n';

const { state, resolvePhase2Match, resolvePhase2MatchRandomly, resetGame } = useGameEngine();
const { playTap } = useSound();
const { t, locale } = useI18n();

const timeLeft = ref(10);
const timeoutKeptMessage = ref(null);
let timer = null;
let timeoutClearId = null;

const startTimer = () => {
  clearInterval(timer);
  timeoutKeptMessage.value = null;
  timeLeft.value = 10;
  timer = setInterval(() => {
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

/** id = the degree to KEEP (winner). */
const handleKeep = (id) => {
  if (state.value.phase !== 'phase2') return;
  clearInterval(timer);
  playTap();
  resolvePhase2Match(id);
};

// Only run timer when we're actually in phase2 (KeepAlive keeps this mounted when bracket is shown;
// bracket sets currentMatch too, which would otherwise start the phase2 timer and corrupt state).
watch(() => [state.value.phase, state.value.currentMatch], ([phase, newVal]) => {
  if (phase === 'phase2' && newVal) startTimer();
  else clearInterval(timer);
}, { immediate: true });

onUnmounted(() => {
  clearInterval(timer);
  if (timeoutClearId) clearTimeout(timeoutClearId);
});
</script>

<template>
  <div class="h-100 d-flex flex-column justify-content-center align-items-center text-center">
    <div class="mb-3 w-100 px-2">
      <div class="d-flex align-items-start justify-content-between mb-2">
        <button
          type="button"
          class="btn btn-link link-secondary small text-decoration-none p-0"
          @click="resetGame"
        >
          ← {{ t('common.back') }}
        </button>
        <span class="invisible">← {{ t('common.back') }}</span>
      </div>
      <h2 class="fw-bold h3 mb-2">{{ t('phase2.title') }}</h2>
      <p class="text-secondary small mb-1">{{ t('phase2.instruction') }}</p>
      <p class="text-secondary small opacity-75 mb-3">{{ t('phase2.minimal_note') }}</p>
      <div class="d-flex flex-column align-items-center gap-2 mb-2">
        <div 
          class="badge rounded-pill px-3 py-2 fs-6 fw-normal animate-pulse shadow-sm transition-colors" 
          :class="timeLeft <= 3 ? 'bg-danger text-white' : 'bg-warning text-dark'"
        >
          {{ t('phase2.timer', { seconds: timeLeft }) }} ⏳
        </div>
        <p class="small text-secondary opacity-75 mb-0">{{ t('phase2.timeout_explanation') }}</p>
        <p v-if="timeoutKeptMessage" class="small text-info mb-0 fw-bold">
          {{ timeoutKeptMessage }}
        </p>
        <p v-if="state.phase2TotalPairs > 0" class="small text-secondary mb-0">
          {{ t('progress.phase2_pairs', { current: state.phase2TotalPairs - state.phase2Queue.length, total: state.phase2TotalPairs }) }}
        </p>
      </div>
    </div>

    <!-- Always 2 columns: Option A | VS | Option B, at any mobile width -->
    <div v-if="state.currentMatch" class="phase2-options d-flex flex-row align-items-stretch justify-content-center w-100 px-1 gap-1">
      <!-- Option A: tap the card (degree name) to choose it -->
      <div class="phase2-col phase2-col-left flex-grow-1 min-w-0">
        <div @click="handleKeep(state.currentMatch.a.id)" class="card-hover-effect cursor-pointer h-100 d-flex flex-column">
          <MatchCard :degree="state.currentMatch.a" class="phase2-card" compact />
        </div>
      </div>

      <div class="phase2-vs d-flex align-items-center justify-content-center flex-shrink-0 user-select-none font-monospace">VS</div>

      <!-- Option B: tap the card to choose it -->
      <div class="phase2-col phase2-col-right flex-grow-1 min-w-0">
        <div @click="handleKeep(state.currentMatch.b.id)" class="card-hover-effect cursor-pointer h-100 d-flex flex-column">
          <MatchCard :degree="state.currentMatch.b" class="phase2-card" compact />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Always 2 columns: Option A | VS | Option B at any width */
.phase2-options {
  max-width: 100%;
}
.phase2-vs {
  width: 28px;
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--bs-secondary);
  opacity: 0.8;
}
.phase2-col :deep(.card-body) {
  padding: 0.4rem 0.35rem;
}
.phase2-col :deep(.display-3) {
  font-size: 1.75rem;
}
.phase2-col :deep(.card-title) {
  font-size: 0.7rem;
  margin-bottom: 0.2rem;
}
.phase2-col :deep(.card-text) {
  font-size: 0.6rem;
  margin-bottom: 0.2rem;
  line-height: 1.2;
}
.phase2-col :deep(.badge) {
  font-size: 0.5rem;
  padding: 0.15rem 0.35rem;
}
@media (min-width: 576px) {
  .phase2-vs {
    width: 36px;
    font-size: 0.85rem;
  }
  .phase2-col :deep(.card-body) {
    padding: 0.5rem 0.5rem;
  }
  .phase2-col :deep(.display-3) {
    font-size: 2rem;
  }
  .phase2-col :deep(.card-title) {
    font-size: 0.8rem;
  }
  .phase2-col :deep(.card-text) {
    font-size: 0.65rem;
  }
  .phase2-col :deep(.badge) {
    font-size: 0.55rem;
  }
}
@media (min-width: 768px) {
  .phase2-options {
    gap: 1rem;
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }
  .phase2-vs {
    width: 48px;
    font-size: 1.25rem;
  }
  .phase2-col {
    max-width: 220px;
  }
  .phase2-col :deep(.card-body) {
    padding: 0.75rem 1rem;
  }
  .phase2-col :deep(.display-3) {
    font-size: 2.5rem;
  }
  .phase2-col :deep(.card-title) {
    font-size: 1rem;
  }
  .phase2-col :deep(.card-text) {
    font-size: 0.8rem;
  }
  .phase2-col :deep(.badge) {
    font-size: 0.7rem;
  }
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
