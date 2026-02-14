/**
 * Unit tests for ResultsScreen: title, winner card, name input, download/restart/donate buttons.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import ResultsScreen from '../../src/components/ResultsScreen.vue';
import { useGameEngine } from '../../src/composables/useGameEngine';
import en from '../../src/i18n/en.json';

vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toBlob: (cb) => cb(new Blob([''], { type: 'image/png' })),
  }),
}));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } });

/** Get to results phase with a winner (bracket of 4, resolve all matches). */
function goToResults() {
  const engine = useGameEngine();
  engine.resetGame();
  engine.startNewGame();
  engine.completeCategories();
  const surv = engine.state.value.survivingDegrees;
  while (surv.length > 4) engine.togglePhase1Selection(surv[surv.length - 1].id);
  engine.completePhase1();
  expect(engine.state.value.phase).toBe('phase3-bracket');
  while (engine.state.value.phase === 'phase3-bracket' && engine.state.value.currentMatch) {
    const { a } = engine.state.value.currentMatch;
    engine.resolveBracketMatch(a.id);
  }
  expect(engine.state.value.phase).toBe('results');
  expect(engine.state.value.winner).not.toBeNull();
  return engine;
}

function mountResultsScreen() {
  return mount(ResultsScreen, { global: { plugins: [i18n] } });
}

describe('ResultsScreen', () => {
  let engine;

  beforeEach(() => {
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
    engine = goToResults();
  });

  it('renders results title and winner label', () => {
    const wrapper = mountResultsScreen();
    expect(wrapper.text()).toMatch(/Results|Risultati|Winner|Vincitore/i);
  });

  it('shows winner card when state.winner exists', () => {
    const wrapper = mountResultsScreen();
    expect(engine.state.value.winner).not.toBeNull();
    const capture = wrapper.find('.results-capture');
    expect(capture.exists()).toBe(true);
    expect(wrapper.find('.results-capture .card-compact-name').exists()).toBe(true);
  });

  it('shows name input and date', () => {
    const wrapper = mountResultsScreen();
    const input = wrapper.find('input[type="text"]');
    expect(input.exists()).toBe(true);
    expect(wrapper.text()).toMatch(/name|nome|date|data/i);
  });

  it('shows download and restart buttons', () => {
    const wrapper = mountResultsScreen();
    const buttons = wrapper.findAll('button');
    const downloadBtn = buttons.find(b => b.text().match(/Download|Scarica/i));
    const restartBtn = buttons.find(b => b.text().match(/Start Over|Ricomincia|Restart/i));
    expect(downloadBtn).toBeDefined();
    expect(restartBtn).toBeDefined();
  });

  it('donate button navigates to donate phase', async () => {
    const wrapper = mountResultsScreen();
    const donateBtn = wrapper.findAll('button').find(b => b.text().match(/Donate|Donazione/i));
    expect(donateBtn).toBeDefined();
    await donateBtn.trigger('click');
    expect(engine.state.value.phase).toBe('donate');
  });

  it('restart button resets game to welcome', async () => {
    const wrapper = mountResultsScreen();
    const restartBtn = wrapper.findAll('button').find(b => b.text().match(/Start Over|Ricomincia|Restart/i));
    expect(restartBtn).toBeDefined();
    await restartBtn.trigger('click');
    expect(engine.state.value.phase).toBe('welcome');
  });

  it('back button resets game', async () => {
    const wrapper = mountResultsScreen();
    const backBtn = wrapper.find('button.btn-link');
    await backBtn.trigger('click');
    expect(engine.state.value.phase).toBe('welcome');
  });
});
