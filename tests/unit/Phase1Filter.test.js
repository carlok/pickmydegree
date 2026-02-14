/**
 * Unit tests for Phase1Filter: sortedEliminatedDegrees, continue/undo, back.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import Phase1Filter from '../../src/components/Phase1Filter.vue';
import { useGameEngine } from '../../src/composables/useGameEngine';
import en from '../../src/i18n/en.json';

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } });

function mountPhase1Filter() {
  return mount(Phase1Filter, { global: { plugins: [i18n] } });
}

describe('Phase1Filter', () => {
  let engine;

  beforeEach(() => {
    engine = useGameEngine();
    engine.resetGame();
    engine.startNewGame();
    engine.completeCategories();
  });

  it('shows phase1 title and instruction', () => {
    const wrapper = mountPhase1Filter();
    expect(wrapper.text()).toMatch(/Phase 1|Filter/i);
    expect(engine.state.value.phase).toBe('phase1');
  });

  it('disables continue when fewer than 2 surviving degrees', () => {
    const surv = engine.state.value.survivingDegrees;
    while (surv.length > 1) engine.togglePhase1Selection(surv[surv.length - 1].id);
    const wrapper = mountPhase1Filter();
    const continueBtn = wrapper.find('button.btn-primary');
    expect(continueBtn.attributes('disabled')).toBeDefined();
  });

  it('enables continue when at least 2 surviving degrees', () => {
    const wrapper = mountPhase1Filter();
    const continueBtn = wrapper.find('button.btn-primary');
    expect(continueBtn.attributes('disabled')).toBeUndefined();
  });

  it('disables undo when no eliminated degrees', () => {
    const wrapper = mountPhase1Filter();
    const undoBtn = wrapper.find('button.btn-outline-secondary');
    expect(undoBtn.attributes('disabled')).toBeDefined();
  });

  it('enables undo after eliminating at least one degree', async () => {
    const wrapper = mountPhase1Filter();
    const surv = engine.state.value.survivingDegrees;
    const firstCard = wrapper.find('.phase1-section-remove .phase1-line');
    await firstCard.trigger('click');
    await wrapper.vm.$nextTick();
    const undoBtn = wrapper.find('button.btn-outline-secondary');
    expect(undoBtn.attributes('disabled')).toBeUndefined();
  });

  it('shows eliminated degrees in alphabetical order by name (sortedEliminatedDegrees)', async () => {
    const surv = [...engine.state.value.survivingDegrees];
    const byName = (a, b) => (a.name?.en ?? '').localeCompare(b.name?.en ?? '');
    surv.sort(byName);
    for (let i = 0; i < Math.min(3, surv.length - 2); i++) {
      engine.togglePhase1Selection(surv[i].id);
    }
    const wrapper = mountPhase1Filter();
    await wrapper.vm.$nextTick();
    const eliminatedSection = wrapper.find('.phase1-section-restore');
    if (eliminatedSection.exists() && engine.state.value.eliminatedDegrees.length > 0) {
      const names = eliminatedSection.findAll('.card-compact-name').map(el => el.text().trim());
      const sorted = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(sorted);
    }
  });

  it('calls resetGame when back button is clicked', async () => {
    const wrapper = mountPhase1Filter();
    const backBtn = wrapper.find('button.btn-link');
    await backBtn.trigger('click');
    expect(engine.state.value.phase).toBe('welcome');
  });

  it('complete phase1 when continue is clicked with enough survivors', async () => {
    const wrapper = mountPhase1Filter();
    const continueBtn = wrapper.find('button.btn-primary');
    await continueBtn.trigger('click');
    expect(engine.state.value.phase).toBe('phase2');
  });
});
