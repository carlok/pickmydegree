/**
 * Unit tests for MatchCard: compact mode, displayName, eliminated overlay, info button.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import MatchCard from '../../src/components/MatchCard.vue';
import en from '../../src/i18n/en.json';

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } });

const mockDegree = {
  id: 'deg-test',
  icon: '🎓',
  name: { en: 'Test Degree', it: 'Corso Test' },
  description: { en: 'A test.', it: 'Un test.' },
};

function mountMatchCard(props = {}, opts = {}) {
  return mount(MatchCard, {
    props: { degree: mockDegree, ...props },
    global: {
      plugins: [i18n],
      provide: opts.openDegreeInfo ? { openDegreeInfo: opts.openDegreeInfo } : {},
    },
    ...opts,
  });
}

describe('MatchCard', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'en';
  });

  it('renders compact mode with degree name from displayName', () => {
    const wrapper = mountMatchCard({ compact: true });
    expect(wrapper.text().replace(/\u200B/g, '')).toContain('Test Degree');
    expect(wrapper.find('.card-compact').exists()).toBe(true);
    expect(wrapper.find('button[aria-label="More info"]').exists()).toBe(true);
  });

  it('uses locale for displayName (Italian)', async () => {
    i18n.global.locale.value = 'it';
    const wrapper = mountMatchCard({ compact: true });
    await wrapper.vm.$nextTick();
    expect(wrapper.text().replace(/\u200B/g, '')).toContain('Corso Test');
  });

  it('adds zero-width spaces between words in displayName for wrapping', () => {
    const wrapper = mountMatchCard({ compact: true });
    const nameEl = wrapper.find('.card-compact-name');
    expect(nameEl.exists()).toBe(true);
    expect(nameEl.text()).toContain('Test');
    expect(nameEl.text()).toContain('Degree');
  });

  it('shows eliminated overlay in compact mode when eliminated prop is true', () => {
    const wrapper = mountMatchCard({ compact: true, eliminated: true });
    expect(wrapper.find('.position-absolute .text-danger').exists()).toBe(true);
    expect(wrapper.text()).toContain('❌');
    expect(wrapper.find('.card-compact').classes()).toContain('border-danger');
  });

  it('applies border-primary when selected in compact mode', () => {
    const wrapper = mountMatchCard({ compact: true, selected: true });
    expect(wrapper.find('.card-compact').classes()).toContain('border-primary');
  });

  it('calls openDegreeInfo when info button clicked in compact mode', async () => {
    const openDegreeInfo = vi.fn();
    const wrapper = mountMatchCard({ compact: true }, { openDegreeInfo });
    await wrapper.find('button[aria-label="More info"]').trigger('click');
    expect(openDegreeInfo).toHaveBeenCalledWith(mockDegree);
  });

  it('renders full (non-compact) card with icon and description', () => {
    const wrapper = mountMatchCard({ compact: false });
    expect(wrapper.find('.card-body').exists()).toBe(true);
    expect(wrapper.text()).toContain('🎓');
    expect(wrapper.text()).toContain('Test Degree');
    expect(wrapper.text()).toContain('A test.');
  });

  it('shows eliminated overlay in full card when eliminated prop is true', () => {
    const wrapper = mountMatchCard({ compact: false, eliminated: true });
    const overlay = wrapper.findAll('.position-absolute').find(w => w.text().includes('❌'));
    expect(overlay).toBeDefined();
    expect(wrapper.find('.card').classes()).toContain('border-danger');
  });

  it('renders tags when degree has tags object (en/it)', () => {
    const degreeWithTags = {
      ...mockDegree,
      tags: { en: ['Tag1', 'Tag2'], it: ['Tag1', 'Tag2'] },
    };
    const wrapper = mount(MatchCard, {
      props: { degree: degreeWithTags, compact: false },
      global: { plugins: [i18n] },
    });
    expect(wrapper.text()).toContain('Tag1');
    expect(wrapper.text()).toContain('Tag2');
  });

  it('falls back to degree.name.en when locale key missing', () => {
    const degreeEnOnly = { id: 'x', name: { en: 'English Only' } };
    const wrapper = mount(MatchCard, {
      props: { degree: degreeEnOnly, compact: true },
      global: { plugins: [i18n] },
    });
    expect(wrapper.text().replace(/\u200B/g, '')).toContain('English Only');
  });
});
