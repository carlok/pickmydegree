/**
 * Unit tests for Phase2Pairs: title, timer, back, two options, handleKeep.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import Phase2Pairs from '../../src/components/Phase2Pairs.vue';
import { useGameEngine } from '../../src/composables/useGameEngine';
import en from '../../src/i18n/en.json';

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } });

function goToPhase2() {
  const engine = useGameEngine();
  engine.resetGame();
  engine.startNewGame();
  engine.completeCategories();
  const surv = engine.state.value.survivingDegrees;
  while (surv.length > 6) engine.togglePhase1Selection(surv[surv.length - 1].id);
  engine.completePhase1();
  expect(engine.state.value.phase).toBe('phase2');
  expect(engine.state.value.currentMatch).not.toBeNull();
  return engine;
}

function mountPhase2Pairs() {
  return mount(Phase2Pairs, { global: { plugins: [i18n] } });
}

describe('Phase2Pairs', () => {
  let engine;

  beforeEach(() => {
    engine = goToPhase2();
  });

  it('renders phase2 title and instruction', () => {
    const wrapper = mountPhase2Pairs();
    expect(wrapper.text()).toMatch(/Phase 2|Choose|Scegli/i);
    expect(wrapper.text()).toMatch(/Tap to keep|tap to keep/i);
  });

  it('shows back button and resets to welcome when clicked', async () => {
    const wrapper = mountPhase2Pairs();
    const backBtn = wrapper.find('button.btn-link');
    expect(backBtn.exists()).toBe(true);
    await backBtn.trigger('click');
    expect(engine.state.value.phase).toBe('welcome');
  });

  it('shows timer badge with time left', () => {
    const wrapper = mountPhase2Pairs();
    const badge = wrapper.find('.badge.rounded-pill');
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toMatch(/\d+|Time left|⏳/);
  });

  it('shows two options (MatchCards) when currentMatch exists', () => {
    const wrapper = mountPhase2Pairs();
    const options = wrapper.findAll('.phase2-option');
    expect(options).toHaveLength(2);
    expect(wrapper.find('.phase2-vs').text()).toContain('VS');
  });

  it('clicking first option keeps that degree and advances state', async () => {
    const wrapper = mountPhase2Pairs();
    const { a, b } = engine.state.value.currentMatch;
    const firstOption = wrapper.findAll('.phase2-pick-keep')[0];
    await firstOption.trigger('click');
    expect(engine.state.value.nextRoundQueue.some((d) => d.id === a.id)).toBe(true);
    expect(engine.state.value.eliminatedDegrees.some((d) => d.id === b.id && d.round === 'phase2')).toBe(true);
  });

  it('shows pair progress when phase2TotalPairs > 0', () => {
    const wrapper = mountPhase2Pairs();
    expect(engine.state.value.phase2TotalPairs).toBeGreaterThan(0);
    expect(wrapper.text()).toMatch(/Pair|Coppia|\d+ of \d+/);
  });
});
