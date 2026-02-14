/**
 * Unit tests for DonateScreen: title, back, coffee link, Satispay link (web URL by default).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import DonateScreen from '../../src/components/DonateScreen.vue';
import { useGameEngine } from '../../src/composables/useGameEngine';
import en from '../../src/i18n/en.json';

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } });

function mountDonateScreen() {
  return mount(DonateScreen, { global: { plugins: [i18n] } });
}

describe('DonateScreen', () => {
  let engine;

  beforeEach(() => {
    engine = useGameEngine();
    engine.resetGame();
    engine.goToDonate();
  });

  it('renders donate title and subtitle', () => {
    const wrapper = mountDonateScreen();
    expect(wrapper.text()).toMatch(/Donate|Donazione/i);
    expect(wrapper.text()).toMatch(/support|supportare/i);
  });

  it('back button navigates to welcome', async () => {
    const wrapper = mountDonateScreen();
    expect(engine.state.value.phase).toBe('donate');
    const backBtn = wrapper.find('button.btn-link');
    expect(backBtn.exists()).toBe(true);
    await backBtn.trigger('click');
    expect(engine.state.value.phase).toBe('welcome');
  });

  it('coffee link has correct href and label', () => {
    const wrapper = mountDonateScreen();
    const coffeeLink = wrapper.find('a[href="https://buymeacoffee.com/carlok"]');
    expect(coffeeLink.exists()).toBe(true);
    expect(coffeeLink.text()).toMatch(/Buy me a coffee|Offrimi un caffè/i);
  });

  it('Satispay link uses web URL when not Android', () => {
    const wrapper = mountDonateScreen();
    const satispayLink = wrapper.find('a[href*="web.satispay.com"]');
    expect(satispayLink.exists()).toBe(true);
    expect(satispayLink.attributes('href')).toContain('web.satispay.com');
    expect(satispayLink.text()).toMatch(/Satispay/i);
  });

  it('renders two donation options (coffee and Satispay)', () => {
    const wrapper = mountDonateScreen();
    const links = wrapper.findAll('a[target="_blank"]');
    expect(links).toHaveLength(2);
  });

  it('Satispay link uses Android intent URL when userAgent is Android', async () => {
    const originalUserAgent = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
      configurable: true,
    });
    try {
      const wrapper = mountDonateScreen();
      await wrapper.vm.$nextTick();
      const satispayLink = wrapper.find('a[href*="intent://"]');
      expect(satispayLink.exists()).toBe(true);
      const href = satispayLink.attributes('href');
      expect(href).toMatch(/^intent:\/\//);
      expect(href).toContain('package=com.satispay.customer');
      expect(href).toContain('S.browser_fallback_url=');
      expect(href).toContain('web.satispay.com');
    } finally {
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      });
    }
  });
});
