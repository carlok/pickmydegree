<script setup>
import { computed } from 'vue';
import { useGameEngine } from '../composables/useGameEngine';
import { useSound } from '../composables/useSound';
import MatchCard from './MatchCard.vue';
import { useI18n } from 'vue-i18n';

const { state, togglePhase1Selection, undoPhase1, completePhase1, resetGame } = useGameEngine();
const { playTap, playSuccess } = useSound();
const { t, locale } = useI18n();

const count = computed(() => state.value.survivingDegrees.length);
const total = computed(() => state.value.survivingDegrees.length + state.value.eliminatedDegrees.length);
const canContinue = computed(() => count.value >= 2);
const canUndo = computed(() => state.value.eliminatedDegrees.length > 0);

/** Eliminated (skipped) degrees sorted alphabetically by name, stable order. */
const sortedEliminatedDegrees = computed(() => {
  const list = state.value.eliminatedDegrees || [];
  const loc = locale.value || 'en';
  return [...list].sort((a, b) => (a.name?.[loc] ?? a.name?.en ?? '').localeCompare(b.name?.[loc] ?? b.name?.en ?? '', loc));
});

const handleContinue = () => {
  const result = completePhase1();
  if (!result.success) {
    alert(result.message);
    return;
  }
  playSuccess();
};

const handleUndo = () => {
  const result = undoPhase1();
  if (result.success) playTap();
};
</script>

<template>
  <div class="phase1-root d-flex flex-column">
    <div class="phase1-header text-center mb-2 position-relative flex-shrink-0">
      <h2 class="fw-bold h3">{{ t('phase1.title') }}</h2>
      <p class="text-secondary small">{{ t('phase1.instruction') }}</p>
      <button
        type="button"
        class="btn btn-link link-secondary small text-decoration-none p-0 position-absolute start-0 top-0"
        @click="resetGame"
      >
        ← {{ t('common.back') }}
      </button>
    </div>

    <!-- Sticky Header -->
    <div class="phase1-toolbar sticky-top bg-dark bg-opacity-75 backdrop-blur-md py-2 z-10 border-bottom border-white border-opacity-10 mb-2 flex-shrink-0" style="top: 0; margin: 0 -0.75rem; padding: 0.5rem 0.75rem;">
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <span class="badge bg-secondary bg-opacity-25 text-info border border-info border-opacity-25 rounded-pill px-3 py-2">
          {{ t('phase1.remaining_of', { count, total }) }}
        </span>
        <div class="d-flex align-items-center gap-2">
          <button
            type="button"
            class="btn btn-outline-secondary btn-sm rounded-pill px-3"
            :disabled="!canUndo"
            @click="handleUndo"
          >
            ↩ {{ t('phase1.undo') }}
          </button>
          <button
            @click="handleContinue"
            class="btn btn-primary rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2"
            :disabled="!canContinue"
          >
            <span>{{ t('common.next') }}</span>
            <span class="badge bg-white text-primary rounded-pill">{{ count }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Single-column list: one item per line, scrollable -->
    <div class="phase1-list flex-grow-1 min-h-0 overflow-auto">
      <div class="d-flex flex-column gap-2 pb-5">
        <!-- Surviving -->
        <TransitionGroup name="list">
          <div
            v-for="degree in state.survivingDegrees"
            :key="degree.id"
            class="phase1-item"
          >
            <div @click="togglePhase1Selection(degree.id); playTap()" class="cursor-pointer card-hover-effect phase1-line">
              <MatchCard :degree="degree" compact />
            </div>
          </div>
        </TransitionGroup>

        <!-- Eliminated Divider -->
        <div v-if="sortedEliminatedDegrees.length > 0" class="mt-4">
          <hr class="border-secondary opacity-25">
          <h6 class="text-muted text-center small text-uppercase letter-spacing-2 mb-3">Eliminated (Tap to Restore)</h6>
        </div>

        <!-- Eliminated -->
        <TransitionGroup name="list">
          <div
            v-for="degree in sortedEliminatedDegrees"
            :key="degree.id"
            class="phase1-item opacity-50 filter-grayscale"
          >
            <div @click="togglePhase1Selection(degree.id); playTap()" class="cursor-pointer phase1-line">
              <MatchCard :degree="degree" eliminated compact />
            </div>
          </div>
        </TransitionGroup>
      </div>
    </div>
  </div>
</template>

<style scoped>
.phase1-root {
  flex: 1 1 0;
  min-height: 0;
}
.phase1-list {
  -webkit-overflow-scrolling: touch;
  max-height: calc(100vh - 320px);
}
.phase1-item {
  min-width: 0;
  flex-shrink: 0;
}
.phase1-line {
  min-width: 0;
  max-width: 100%;
}
.phase1-line :deep(.card-compact) {
  min-width: 0;
  max-width: 100%;
}
.cursor-pointer { cursor: pointer; }
.filter-grayscale { filter: grayscale(1); transition: filter 0.3s; }
.filter-grayscale:hover { filter: grayscale(0.5); }
.backdrop-blur-md { backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
.card-hover-effect { transition: transform 0.2s; }
.card-hover-effect:active { transform: scale(0.98); }

/* List Transitions */
.list-enter-active,
.list-leave-active {
  transition: all 0.4s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>
