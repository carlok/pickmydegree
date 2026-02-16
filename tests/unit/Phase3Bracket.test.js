/**
 * Unit tests for Phase3Bracket: match progress, toGoInRound includes current match.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import Phase3Bracket from '../../src/components/Phase3Bracket.vue';
import { useGameEngine } from '../../src/composables/useGameEngine';
import en from '../../src/i18n/en.json';

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } });

function goToPhase3() {
  const engine = useGameEngine();
  engine.resetGame();
  engine.startNewGame();
  engine.completeCategories();
  const surv = engine.state.value.survivingDegrees;
  // Filter down to 8 degrees for a clean bracket (4 matches in round 1)
  while (surv.length > 8) engine.togglePhase1Selection(surv[surv.length - 1].id);
  engine.completePhase1();
  // Phase 2: resolve matches until we have <= 8 degrees (then auto-transitions to bracket)
  while (engine.state.value.phase === 'phase2' && engine.state.value.currentMatch) {
    const match = engine.state.value.currentMatch;
    engine.resolvePhase2Match(match.a.id); // Keep first option
  }
  expect(engine.state.value.phase).toBe('phase3-bracket');
  expect(engine.state.value.currentMatch).not.toBeNull();
  return engine;
}

function mountPhase3Bracket() {
  return mount(Phase3Bracket, { global: { plugins: [i18n] } });
}

describe('Phase3Bracket', () => {
  let engine;

  beforeEach(() => {
    engine = goToPhase3();
  });

  it('renders bracket title and instruction', () => {
    const wrapper = mountPhase3Bracket();
    expect(wrapper.text()).toMatch(/Tournament|Torneo/i);
    expect(wrapper.text()).toMatch(/winner|vincitore/i);
  });

  it('shows back button and resets to welcome when clicked', async () => {
    const wrapper = mountPhase3Bracket();
    const backBtn = wrapper.find('button.btn-link');
    expect(backBtn.exists()).toBe(true);
    await backBtn.trigger('click');
    expect(engine.state.value.phase).toBe('welcome');
  });

  it('toGoInRound includes current match when calculating remaining', () => {
    const wrapper = mountPhase3Bracket();
    const state = engine.state.value;
    // Start with 8 teams = 4 matches in round 1
    expect(state.bracketTotal).toBeGreaterThanOrEqual(4);
    const initialQueue = state.bracketQueue.length;
    const hasCurrent = !!state.currentMatch;
    // toGoInRound should be: queue length + (current match ? 1 : 0)
    const expectedToGo = initialQueue + (hasCurrent ? 1 : 0);
    const vm = wrapper.vm;
    expect(vm.toGoInRound).toBe(expectedToGo);
  });

  it('match progress shows correct "toGo" count including current match', () => {
    const wrapper = mountPhase3Bracket();
    const state = engine.state.value;
    // Play 2 matches to get to match 3 of 4
    if (state.bracketQueue.length >= 2 && state.currentMatch) {
      engine.resolveBracketMatch(state.currentMatch.a.id);
      if (state.currentMatch) {
        engine.resolveBracketMatch(state.currentMatch.a.id);
      }
    }
    const vm = wrapper.vm;
    // Now we should be on match 3 of 4: currentMatch exists, bracketQueue has 1
    if (state.currentMatch && state.bracketQueue.length === 1) {
      expect(vm.currentMatchInRound).toBe(3);
      expect(vm.totalInRound).toBe(4);
      expect(vm.toGoInRound).toBe(2); // current match (3) + queue (1) = 2
      const progress = vm.matchProgress;
      expect(progress).toContain('3');
      expect(progress).toContain('4');
      expect(progress).toContain('2'); // "2 da fare"
    }
  });

  it('matchesLeftLabel shows plural when toGoInRound > 1', () => {
    const wrapper = mountPhase3Bracket();
    const state = engine.state.value;
    // Ensure we have at least 2 matches remaining (current + queue)
    if (state.currentMatch && state.bracketQueue.length >= 1) {
      const vm = wrapper.vm;
      if (vm.toGoInRound > 1) {
        const label = vm.matchesLeftLabel;
        expect(label).toMatch(/\d+/);
        expect(label).toMatch(/match|rimast/i);
      }
    }
  });
});
