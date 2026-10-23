/**
 * Unit tests for WelcomeScreen: title, start button, reset, donate button.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import WelcomeScreen from '../../src/components/WelcomeScreen.vue';
import { useGameEngine } from '../../src/composables/useGameEngine';
import en from '../../src/i18n/en.json';

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } });

function mountWelcomeScreen() {
  return mount(WelcomeScreen, { global: { plugins: [i18n] } });
}

describe('WelcomeScreen', () => {
  let engine;

  beforeEach(() => {
    engine = useGameEngine();
    engine.resetGame();
  });

  it('renders title and start button', () => {
    const wrapper = mountWelcomeScreen();
    expect(wrapper.text()).toMatch(/Pick My Degree|Start|Inizia/i);
    expect(wrapper.find('button.btn-primary').exists()).toBe(true);
  });

  it('navigates to rules when start button is clicked', async () => {
    const wrapper = mountWelcomeScreen();
    expect(engine.state.value.phase).toBe('welcome');
    await wrapper.find('button.btn-primary').trigger('click');
    expect(engine.state.value.phase).toBe('rules');
  });

  it('hides the reset button when there is no saved game', () => {
    const wrapper = mountWelcomeScreen();
    const resetBtn = wrapper.findAll('button').find(w => w.text().match(/Reset|Azzera/i));
    expect(resetBtn).toBeUndefined();
  });

  it('shows the reset button when a game was left in progress', () => {
    engine.startNewGame();
    engine.goToWelcome();
    const wrapper = mountWelcomeScreen();
    const resetBtn = wrapper.findAll('button').find(w => w.text().match(/Reset|Azzera/i));
    expect(resetBtn).toBeDefined();
  });

  it('reset asks for confirmation and clears the saved game', async () => {
    engine.startNewGame();
    engine.goToWelcome();
    const wrapper = mountWelcomeScreen();
    const resetBtn = wrapper.findAll('button').find(w => w.text().match(/Reset|Azzera/i));
    await resetBtn.trigger('click');
    expect(window.confirm).toHaveBeenCalled();
    expect(engine.state.value.survivingDegrees).toEqual([]);
  });

  it('reset keeps the saved game when declined', async () => {
    window.confirm = vi.fn(() => false);
    engine.startNewGame();
    engine.goToWelcome();
    const wrapper = mountWelcomeScreen();
    const resetBtn = wrapper.findAll('button').find(w => w.text().match(/Reset|Azzera/i));
    await resetBtn.trigger('click');
    expect(engine.state.value.survivingDegrees.length).toBeGreaterThan(0);
  });

  it('shows donate button and navigates to donate phase when clicked', async () => {
    const wrapper = mountWelcomeScreen();
    const donateBtn = wrapper.findAll('button').find(w => w.text().match(/Donate|Donazione/i));
    expect(donateBtn).toBeDefined();
    expect(engine.state.value.phase).toBe('welcome');
    await donateBtn.trigger('click');
    expect(engine.state.value.phase).toBe('donate');
  });

  it('renders data source and academic year text', () => {
    const wrapper = mountWelcomeScreen();
    expect(wrapper.text()).toMatch(/Politecnico|Università|data|academic|anno/i);
  });
});
