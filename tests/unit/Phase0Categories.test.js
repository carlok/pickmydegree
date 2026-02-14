/**
 * Unit tests for Phase0Categories: tap to exclude/restore, continue, back.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import Phase0Categories from '../../src/components/Phase0Categories.vue';
import { useGameEngine } from '../../src/composables/useGameEngine';
import en from '../../src/i18n/en.json';

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } });

function mountPhase0Categories() {
  return mount(Phase0Categories, { global: { plugins: [i18n] } });
}

describe('Phase0Categories', () => {
  let engine;

  beforeEach(() => {
    engine = useGameEngine();
    engine.resetGame();
    engine.startNewGame();
  });

  it('renders categories title and tap to exclude section', () => {
    const wrapper = mountPhase0Categories();
    expect(engine.state.value.phase).toBe('categories');
    expect(wrapper.text()).toMatch(/category|By category|Per categoria/i);
    expect(wrapper.find('.categories-section-exclude').exists()).toBe(true);
    expect(wrapper.text()).toMatch(/Tap to exclude|Tocca per escludere/i);
  });

  it('shows back button and navigates to welcome on click', async () => {
    const wrapper = mountPhase0Categories();
    const backBtn = wrapper.find('button.btn-link');
    expect(backBtn.exists()).toBe(true);
    await backBtn.trigger('click');
    expect(engine.state.value.phase).toBe('welcome');
  });

  it('shows kept category chips with counts', async () => {
    const wrapper = mountPhase0Categories();
    await wrapper.vm.$nextTick();
    const chips = wrapper.findAll('.categories-section-exclude .category-chip');
    expect(chips.length).toBeGreaterThan(0);
    const firstChip = chips[0];
    expect(firstChip.find('.badge').exists()).toBe(true);
  });

  it('disables continue when fewer than 2 degrees remaining', async () => {
    const wrapper = mountPhase0Categories();
    const surv = engine.state.value.survivingDegrees || [];
    const categories = [...new Set(surv.map(d => d.category || 'Other'))];
    for (const cat of categories) {
      engine.removeCategory(cat);
      await wrapper.vm.$nextTick();
      if (engine.state.value.survivingDegrees.length < 2) break;
    }
    const continueBtn = wrapper.find('button.btn-primary');
    if (engine.state.value.survivingDegrees.length < 2) {
      expect(continueBtn.attributes('disabled')).toBeDefined();
    }
  });

  it('enables continue when at least 2 degrees remaining', () => {
    const wrapper = mountPhase0Categories();
    expect(engine.state.value.survivingDegrees.length).toBeGreaterThanOrEqual(2);
    const continueBtn = wrapper.find('button.btn-primary');
    expect(continueBtn.attributes('disabled')).toBeUndefined();
  });

  it('navigates to phase1 when continue is clicked', async () => {
    const wrapper = mountPhase0Categories();
    await wrapper.find('button.btn-primary').trigger('click');
    expect(engine.state.value.phase).toBe('phase1');
  });

  it('removes category when a kept category chip is clicked', async () => {
    const wrapper = mountPhase0Categories();
    const beforeCount = engine.state.value.survivingDegrees.length;
    const firstChip = wrapper.find('.categories-section-exclude .category-chip');
    await firstChip.trigger('click');
    await wrapper.vm.$nextTick();
    expect(engine.state.value.survivingDegrees.length).toBeLessThan(beforeCount);
  });

  it('shows tap to restore section after removing at least one category', async () => {
    const wrapper = mountPhase0Categories();
    const firstChip = wrapper.find('.categories-section-exclude .category-chip');
    await firstChip.trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.categories-section-restore').exists()).toBe(true);
    expect(wrapper.text()).toMatch(/Tap to restore|Tocca per ripristinare/i);
  });

  it('Continue button appears before the excluded (restore) block in the DOM', async () => {
    const wrapper = mountPhase0Categories();
    const firstChip = wrapper.find('.categories-section-exclude .category-chip');
    await firstChip.trigger('click');
    await wrapper.vm.$nextTick();
    const restoreSection = wrapper.find('.categories-section-restore');
    expect(restoreSection.exists()).toBe(true);
    const primaryButtons = wrapper.findAll('button.btn-primary');
    const continueButton = primaryButtons[0];
    expect(continueButton.exists()).toBe(true);
    const docPos = restoreSection.element.compareDocumentPosition(continueButton.element);
    const DOCUMENT_POSITION_PRECEDING = 2;
    expect(docPos & DOCUMENT_POSITION_PRECEDING).toBe(DOCUMENT_POSITION_PRECEDING);
  });
});
