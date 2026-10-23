<script setup>
import { computed, ref } from 'vue';
import { useGameEngine } from '../composables/useGameEngine';
import { useSound } from '../composables/useSound';
import { useLeaveGame } from '../composables/useLeaveGame';
import MatchCard from './MatchCard.vue';
import { useI18n } from 'vue-i18n';

const { state, togglePhase1Selection, undoPhase1, completePhase1 } = useGameEngine();
const { playTap, playSuccess } = useSound();
const { leaveGame } = useLeaveGame();
const { t, locale } = useI18n();

const count = computed(() => state.value.survivingDegrees.length);
const total = computed(() => state.value.survivingDegrees.length + state.value.eliminatedDegrees.length);
const canContinue = computed(() => count.value >= 2);
// Degrees dropped with a whole category are restored from the categories screen, not here.
const canUndo = computed(() => state.value.eliminatedDegrees.some((d) => d.round === 'phase1'));
const errorKey = ref(null);

/** Eliminated (skipped) degrees sorted alphabetically by name, stable order. */
const sortedEliminatedDegrees = computed(() => {
  const list = state.value.eliminatedDegrees || [];
  const loc = locale.value || 'en';
  return [...list].sort((a, b) => (a.name?.[loc] ?? a.name?.en ?? '').localeCompare(b.name?.[loc] ?? b.name?.en ?? '', loc));
});

const handleContinue = () => {
  const result = completePhase1();
  if (!result.success) {
    errorKey.value = result.messageKey ?? null;
    return;
  }
  errorKey.value = null;
  playSuccess();
};

const handleUndo = () => {
  const result = undoPhase1();
  if (result.success) playTap();
};

const handleToggle = (id) => {
  togglePhase1Selection(id);
  errorKey.value = null;
  playTap();
};
</script>

<template>
  <div class="phase1-root d-flex flex-column">
    <div class="phase1-header text-center mb-2 position-relative flex-shrink-0">
      <h2 class="fw-bold h3">{{ t('phase1.title') }}</h2>
      <p class="text-secondary small">{{ t('phase1.instruction') }}</p>
      <button
        type="button"
        class="btn btn-link link-secondary small text-decoration-none back-link position-absolute start-0 top-0"
        @click="leaveGame"
      >
        ← {{ t('common.back') }}
      </button>
    </div>

    <!-- Sticky Header -->
    <div class="phase1-toolbar sticky-top bg-dark bg-opacity-75 backdrop-blur-md py-2 z-10 border-bottom border-white border-opacity-10 mb-2 flex-shrink-0" style="top: 0; margin: 0 -0.75rem; padding: 0.5rem 0.75rem;">
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <span class="badge bg-secondary bg-opacity-25 text-info border border-info border-opacity-25 rounded-pill px-3 py-2" aria-live="polite">
          {{ t('phase1.remaining_of', { count, total }) }}
        </span>
        <div class="d-flex align-items-center gap-2">
          <button
            type="button"
            class="btn btn-outline-secondary btn-sm rounded-pill px-3 touch-target"
            :disabled="!canUndo"
            @click="handleUndo"
          >
            <span aria-hidden="true">↩</span> {{ t('phase1.undo') }}
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
      <p v-if="errorKey" class="small text-danger mb-0 mt-2" role="alert">{{ t(errorKey) }}</p>
    </div>

    <!-- Single-column list: one item per line -->
    <div class="phase1-list flex-grow-1">
      <div class="d-flex flex-column gap-2 pb-5">
        <!-- Surviving: tap to REMOVE (emphasized background) -->
        <div class="phase1-section phase1-section-remove rounded-3 p-2 pb-3" role="group" aria-labelledby="phase1-remove-label">
          <p id="phase1-remove-label" class="small text-center mb-2 text-danger fw-bold phase1-section-label">{{ t('phase1.tap_to_remove') }}</p>
          <TransitionGroup name="list" tag="div" class="d-flex flex-column gap-2">
            <div
              v-for="degree in state.survivingDegrees"
              :key="degree.id"
              class="phase1-item"
            >
              <div class="phase1-line">
                <MatchCard :degree="degree" pickable @pick="handleToggle(degree.id)" />
              </div>
            </div>
          </TransitionGroup>
        </div>

        <!-- Eliminated: tap to RESTORE (emphasized background) -->
        <div v-if="sortedEliminatedDegrees.length > 0" class="phase1-section phase1-section-restore rounded-3 p-2 pb-3 mt-3" role="group" aria-labelledby="phase1-restore-label">
          <p id="phase1-restore-label" class="small text-center mb-2 text-secondary fw-bold phase1-section-label">{{ t('phase1.tap_to_restore') }}</p>
          <TransitionGroup name="list" tag="div" class="d-flex flex-column gap-2">
            <div
              v-for="degree in sortedEliminatedDegrees"
              :key="degree.id"
              class="phase1-item opacity-75"
            >
              <div class="phase1-line">
                <MatchCard :degree="degree" eliminated pickable @pick="handleToggle(degree.id)" />
              </div>
            </div>
          </TransitionGroup>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.phase1-root {
  flex: 1 0 auto;
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
/* Emphasize: tap to REMOVE (red tint) */
.phase1-section-remove {
  background: rgba(var(--bs-danger-rgb), 0.12);
  border: 1px solid rgba(var(--bs-danger-rgb), 0.3);
}
/* Emphasize: tap to RESTORE (neutral/secondary tint) */
.phase1-section-restore {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
}
.phase1-section-label {
  letter-spacing: 0.05em;
}
.touch-target {
  min-height: 2.75rem;
}
.backdrop-blur-md { backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }

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
