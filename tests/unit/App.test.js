/**
 * Unit tests for App: header, phase routing, menu, donate/home from menu.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import App from '../../src/App.vue';
import { useGameEngine } from '../../src/composables/useGameEngine';
import { useDataStore } from '../../src/composables/useDataStore';
import en from '../../src/i18n/en.json';

const mockModalInstance = { show: vi.fn(), hide: vi.fn() };
const mockOffcanvasInstance = { show: vi.fn(), hide: vi.fn() };

vi.mock('bootstrap', () => ({
  Modal: {
    getOrCreateInstance: vi.fn(() => mockModalInstance),
    getInstance: vi.fn(() => mockModalInstance),
  },
  Offcanvas: {
    getOrCreateInstance: vi.fn(() => mockOffcanvasInstance),
    getInstance: vi.fn(() => mockOffcanvasInstance),
  },
}));

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } });

function mountApp() {
  return mount(App, { global: { plugins: [i18n] } });
}

describe('App', () => {
  beforeEach(() => {
    const engine = useGameEngine();
    engine.resetGame();
  });

  it('renders header with Pick My Degree title', () => {
    const wrapper = mountApp();
    expect(wrapper.text()).toMatch(/Pick My Degree/);
  });

  it('shows welcome content when phase is welcome', () => {
    const wrapper = mountApp();
    expect(useGameEngine().state.value.phase).toBe('welcome');
    expect(wrapper.text()).toMatch(/Pick My Degree|Start|Inizia|Discover/i);
  });

  it('shows rules when phase is rules', async () => {
    const engine = useGameEngine();
    engine.goToRules();
    useDataStore().save({ phase: 'invalid' }); // so init() does not overwrite state
    const wrapper = mountApp();
    await wrapper.vm.$nextTick();
    expect(engine.state.value.phase).toBe('rules');
    expect(wrapper.find('.rule-step').exists()).toBe(true);
  });

  it('shows donate screen when phase is donate', async () => {
    const engine = useGameEngine();
    engine.goToDonate();
    const wrapper = mountApp();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toMatch(/Donate|Donazione|support|Satispay/i);
  });

  it('header home link navigates to welcome', async () => {
    const engine = useGameEngine();
    engine.goToRules();
    const wrapper = mountApp();
    await wrapper.vm.$nextTick();
    const homeLink = wrapper.find('header a[aria-label="Home"]');
    await homeLink.trigger('click');
    expect(engine.state.value.phase).toBe('welcome');
  });

  it('hamburger menu button exists and opens menu', async () => {
    const wrapper = mountApp();
    const menuBtn = wrapper.find('button[title="Menu"]');
    expect(menuBtn.exists()).toBe(true);
    await menuBtn.trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('#menuOffcanvas').exists()).toBe(true);
    expect(wrapper.find('.offcanvas-body').exists()).toBe(true);
  });

  it('menu contains Home, GitHub, donate and thanks card', () => {
    const wrapper = mountApp();
    const body = wrapper.find('.offcanvas-body');
    expect(body.exists()).toBe(true);
    expect(body.text()).toMatch(/Home|Menu/i);
    expect(body.text()).toMatch(/GitHub|repo/i);
    expect(body.text()).toMatch(/Donate|Donazione/i);
    expect(body.find('.thanks-card').exists()).toBe(true);
  });

  it('locale toggle switches between EN and IT', async () => {
    const wrapper = mountApp();
    const buttons = wrapper.findAll('button');
    const localeBtn = buttons.find(b => /IT|EN/.test(b.text()));
    expect(localeBtn).toBeDefined();
    const initialText = localeBtn.text();
    await localeBtn.trigger('click');
    await wrapper.vm.$nextTick();
    const afterButtons = wrapper.findAll('button');
    const afterLocaleBtn = afterButtons.find(b => /IT|EN/.test(b.text()));
    expect(afterLocaleBtn.text()).not.toBe(initialText);
  });
});
