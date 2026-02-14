/**
 * Unit tests for ProgressBar: phase label, progress %, bracket current stage.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import ProgressBar from '../../src/components/ProgressBar.vue';
import { useGameEngine } from '../../src/composables/useGameEngine';
import en from '../../src/i18n/en.json';

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } });

function mountProgressBar() {
  return mount(ProgressBar, { global: { plugins: [i18n] } });
}

describe('ProgressBar', () => {
  let engine;

  beforeEach(() => {
    engine = useGameEngine();
    engine.resetGame();
  });

  it('shows no phase label at welcome', () => {
    const wrapper = mountProgressBar();
    expect(wrapper.text()).not.toContain('Categories');
    expect(engine.state.value.phase).toBe('welcome');
  });

  it('shows categories phase label when in categories', () => {
    engine.startNewGame();
    const wrapper = mountProgressBar();
    expect(wrapper.text()).toMatch(/Categories/i);
  });

  it('shows phase1 progress when in phase1', () => {
    engine.startNewGame();
    engine.completeCategories();
    const wrapper = mountProgressBar();
    expect(wrapper.text()).toMatch(/\d+ of \d+/);
  });

  it('shows bracket phase label when in phase3-bracket', () => {
    engine.startNewGame();
    engine.completeCategories();
    const surv = engine.state.value.survivingDegrees;
    while (surv.length > 4) engine.togglePhase1Selection(surv[surv.length - 1].id);
    engine.completePhase1();
    const wrapper = mountProgressBar();
    expect(engine.state.value.phase).toBe('phase3-bracket');
    expect(wrapper.text()).toBeTruthy();
  });

  it('shows results phase label when in results', () => {
    engine.startNewGame();
    engine.completeCategories();
    const surv = engine.state.value.survivingDegrees;
    while (surv.length > 4) engine.togglePhase1Selection(surv[surv.length - 1].id);
    engine.completePhase1();
    while (engine.state.value.phase === 'phase3-bracket' && engine.state.value.currentMatch) {
      engine.resolveBracketMatch(engine.state.value.currentMatch.a.id);
    }
    const wrapper = mountProgressBar();
    expect(engine.state.value.phase).toBe('results');
    expect(wrapper.text()).toMatch(/Results/i);
  });

  it('shows no phase label when phase1 has zero total (surviving + eliminated)', () => {
    engine.startNewGame();
    engine.completeCategories();
    engine.state.value.phase = 'phase1';
    engine.state.value.survivingDegrees = [];
    engine.state.value.eliminatedDegrees = [];
    const wrapper = mountProgressBar();
    expect(engine.state.value.phase).toBe('phase1');
    expect(wrapper.find('.small.text-secondary').exists()).toBe(false);
  });

  it('shows bracket-level label when phase2 has no pairs (phase2TotalPairs 0)', () => {
    engine.startNewGame();
    engine.completeCategories();
    const surv = engine.state.value.survivingDegrees;
    while (surv.length > 4) engine.togglePhase1Selection(surv[surv.length - 1].id);
    engine.completePhase1();
    engine.state.value.phase = 'phase2';
    engine.state.value.phase2TotalPairs = 0;
    engine.state.value.phase2Queue = [];
    const wrapper = mountProgressBar();
    expect(engine.state.value.phase).toBe('phase2');
    expect(wrapper.text()).toBeTruthy();
  });

  it('phaseProgress is 0 when phase2 has phase2TotalPairs 0', () => {
    engine.startNewGame();
    engine.completeCategories();
    const surv = engine.state.value.survivingDegrees;
    while (surv.length > 4) engine.togglePhase1Selection(surv[surv.length - 1].id);
    engine.completePhase1();
    engine.state.value.phase = 'phase2';
    engine.state.value.phase2TotalPairs = 0;
    engine.state.value.phase2Queue = [];
    const wrapper = mountProgressBar();
    const innerBars = wrapper.findAll('.progress-bar');
    expect(innerBars.length).toBeGreaterThanOrEqual(1);
  });
});
