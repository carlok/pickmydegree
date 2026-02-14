<script setup>
import { computed } from 'vue';
import { useGameEngine } from '../composables/useGameEngine';
import { useI18n } from 'vue-i18n';

const { state } = useGameEngine();
const { t } = useI18n();

/** Label for bracket phase by size: Final (2), Quarter (4), Octave (8), etc. */
function bracketLevelLabel(size) {
  const n = Math.max(2, size || 2);
  const key = `progress.bracket_level_${n}`;
  const out = t(key);
  return out !== key ? out : t('progress.phase3_bracket');
}

/** Current round size in bracket (for showing current stage in progress bar). */
function currentRoundSize(s) {
  if (s.phase !== 'phase3-bracket' || !s.bracketTotal) return s.bracketTotal || 16;
  const round = s.round || 1;
  return s.bracketTotal / Math.pow(2, round - 1);
}

const progress = computed(() => {
  switch (state.value.phase) {
    case 'welcome': return 0;
    case 'categories': return 10;
    case 'phase1': return 25;
    case 'phase2': return 50;
    case 'phase3-bracket': return 75;
    case 'results': return 100;
    default: return 0;
  }
});

const phaseLabel = computed(() => {
  const s = state.value;
  switch (s.phase) {
    case 'categories':
      return t('progress.categories');
    case 'phase1': {
      const count = s.survivingDegrees.length;
      const total = count + s.eliminatedDegrees.length;
      return total ? t('progress.phase1', { count, total }) : null;
    }
    case 'phase2':
      if (s.phase2TotalPairs > 0) {
        const current = s.phase2TotalPairs - s.phase2Queue.length;
        return t('progress.phase2_pairs', { current, total: s.phase2TotalPairs });
      }
      return bracketLevelLabel(s.bracketTotal);
    case 'phase3-bracket':
      return bracketLevelLabel(currentRoundSize(s));
    case 'results':
      return t('progress.results');
    default:
      return null;
  }
});

const phaseProgress = computed(() => {
  const s = state.value;
  switch (s.phase) {
    case 'categories': {
      const surv = s.survivingDegrees?.length ?? 0;
      const elim = s.eliminatedDegrees?.length ?? 0;
      const total = surv + elim;
      if (!total) return 0;
      return Math.round((elim / total) * 100);
    }
    case 'phase1': {
      const count = s.survivingDegrees.length;
      const total = count + s.eliminatedDegrees.length;
      if (!total) return 0;
      return Math.round((count / total) * 100);
    }
    case 'phase2':
      if (s.phase2TotalPairs > 0) {
        const done = s.phase2TotalPairs - s.phase2Queue.length;
        return Math.round((done / s.phase2TotalPairs) * 100);
      }
      return 0;
    case 'phase3-bracket':
      return 100;
    default:
      return 0;
  }
});
</script>

<template>
  <div class="progress-bar-wrap mb-3">
    <div v-if="phaseLabel" class="small text-secondary mb-1">{{ phaseLabel }}</div>
    <div class="progress mb-1 bg-transparent border border-secondary" style="height: 6px;">
      <div 
        class="progress-bar rounded-pill" 
        role="progressbar" 
        :style="{ width: progress + '%', background: 'linear-gradient(to right, var(--bs-primary), var(--bs-secondary))' }"
      ></div>
    </div>
    <div v-if="phaseProgress > 0 && phaseProgress < 100 && (state.phase === 'categories' || state.phase === 'phase1' || state.phase === 'phase2')" class="progress mb-0 bg-dark border border-secondary opacity-50" style="height: 4px;">
      <div 
        class="progress-bar rounded-pill bg-secondary" 
        role="progressbar" 
        :style="{ width: phaseProgress + '%' }"
      ></div>
    </div>
  </div>
</template>
