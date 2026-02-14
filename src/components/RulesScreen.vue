<script setup>
import { useGameEngine } from '../composables/useGameEngine';
import { useSound } from '../composables/useSound';

const { startNewGame, goToWelcome } = useGameEngine();
const { playSuccess } = useSound();

const steps = [
  { icon: '🔍', badge: '1', keyTitle: 'step1_title', keyDesc: 'step1_desc' },
  { icon: '⚔️', badge: '2', keyTitle: 'step2_title', keyDesc: 'step2_desc' },
  { icon: '🏆', badge: '3', keyTitle: 'step3_title', keyDesc: 'step3_desc' },
  { icon: '🎊', badge: '4', keyTitle: 'step4_title', keyDesc: 'step4_desc' },
];
</script>

<template>
  <div class="rules-screen rules-screen-root d-flex flex-column min-h-0">
    <div class="rules-screen-scroll flex-grow-1 min-h-0 overflow-auto text-center py-4">
      <h2 class="h3 fw-bold mb-2">{{ $t('rules.title') }}</h2>
      <p class="text-secondary-emphasis mb-3">{{ $t('rules.subtitle') }}</p>
      <p class="small text-secondary mb-3 opacity-75">📍 {{ $t('rules.your_quest') }}</p>

      <!-- Step progress line: 4 nodes -->
      <div class="rules-progress mb-4" role="presentation" aria-label="Game steps">
        <div class="rules-progress-track d-flex align-items-center justify-content-between">
          <template v-for="(step, index) in steps" :key="index">
            <div class="rules-progress-node rounded-circle d-flex align-items-center justify-content-center">
              <span class="rules-progress-num">{{ step.badge }}</span>
            </div>
            <div v-if="index < steps.length - 1" class="rules-progress-connector" />
          </template>
        </div>
      </div>

      <div class="rules-steps text-start mb-4">
        <div
          v-for="(step, index) in steps"
          :key="index"
          class="rule-step d-flex align-items-start gap-3 mb-3 p-3 rounded-3 bg-dark bg-opacity-25 border border-secondary border-opacity-25"
        >
          <span class="rule-step-icon flex-shrink-0 rounded-circle d-inline-flex align-items-center justify-content-center" aria-hidden="true">
            {{ step.icon }}
          </span>
          <div class="flex-grow-1">
            <div class="d-flex align-items-center gap-2 mb-1">
              <span class="badge rounded-pill bg-primary opacity-75">{{ step.badge }}</span>
              <strong class="text-light">{{ $t(`rules.${step.keyTitle}`) }}</strong>
            </div>
            <p class="mb-0 small text-secondary-emphasis">{{ $t(`rules.${step.keyDesc}`) }}</p>
          </div>
        </div>
      </div>

      <button
        @click="playSuccess(); startNewGame()"
        class="btn btn-primary btn-lg rounded-pill px-5 py-3 shadow-lg"
      >
        {{ $t('rules.lets_go') }} 🚀
      </button>

      <p class="mt-4 mb-0 rules-screen-bottom">
        <button type="button" class="btn btn-link link-secondary small text-decoration-none p-0" @click="goToWelcome">
          ← {{ $t('common.back') }}
        </button>
      </p>
    </div>
  </div>
</template>

<style scoped>
.rules-screen-root {
  height: 100%;
}
.rules-screen-scroll {
  -webkit-overflow-scrolling: touch;
  padding-bottom: env(safe-area-inset-bottom, 0);
}
.rules-screen-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0.5rem);
}
.rules-progress-track {
  max-width: 280px;
  margin: 0 auto;
}
.rules-progress-node {
  width: 2rem;
  height: 2rem;
  background: var(--bs-dark);
  border: 2px solid rgba(var(--bs-secondary-rgb), 0.5);
  color: var(--bs-secondary);
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}
.rules-progress-connector {
  flex: 1;
  height: 2px;
  background: rgba(var(--bs-secondary-rgb), 0.35);
  margin: 0 2px;
}
.rule-step-icon {
  width: 2.5rem;
  height: 2.5rem;
  font-size: 1.25rem;
  line-height: 1;
}
</style>
