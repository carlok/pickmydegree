/**
 * Unit tests for RulesScreen: title, steps, Let's go, back.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import RulesScreen from '../../src/components/RulesScreen.vue';
import { useGameEngine } from '../../src/composables/useGameEngine';
import en from '../../src/i18n/en.json';

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } });

function mountRulesScreen() {
  return mount(RulesScreen, { global: { plugins: [i18n] } });
}

describe('RulesScreen', () => {
  let engine;

  beforeEach(() => {
    engine = useGameEngine();
    engine.resetGame();
    engine.goToRules();
  });

  it('renders rules title and subtitle', () => {
    const wrapper = mountRulesScreen();
    expect(wrapper.text()).toMatch(/How to Play|rules|Come funziona|Come giocare/i);
  });

  it('renders four step nodes and step cards', () => {
    const wrapper = mountRulesScreen();
    const nodes = wrapper.findAll('.rules-progress-num');
    expect(nodes).toHaveLength(4);
    expect(wrapper.findAll('.rule-step')).toHaveLength(4);
  });

  it('shows Let\'s go button', () => {
    const wrapper = mountRulesScreen();
    const btn = wrapper.find('button.btn-primary.btn-lg');
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toMatch(/Let's go|Inizia|🚀/i);
  });

  it('starts game and navigates to categories when Let\'s go is clicked', async () => {
    const wrapper = mountRulesScreen();
    expect(engine.state.value.phase).toBe('rules');
    await wrapper.find('button.btn-primary.btn-lg').trigger('click');
    expect(engine.state.value.phase).toBe('categories');
  });

  it('shows back button', () => {
    const wrapper = mountRulesScreen();
    const backBtn = wrapper.findAll('button').find(w => w.text().includes('Back') || w.text().includes('←'));
    expect(backBtn).toBeDefined();
  });

  it('navigates to welcome when back is clicked', async () => {
    const wrapper = mountRulesScreen();
    const backBtn = wrapper.findAll('button').find(w => w.text().includes('←'));
    await backBtn.trigger('click');
    expect(engine.state.value.phase).toBe('welcome');
  });
});
