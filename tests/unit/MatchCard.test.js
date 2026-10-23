/**
 * Unit tests for MatchCard: name, pick button, eliminated overlay, info button.
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
  });
}

describe('MatchCard', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'en';
  });

  it('renders the degree name and an info button named after the degree', () => {
    const wrapper = mountMatchCard();
    expect(wrapper.text()).toContain('Test Degree');
    expect(wrapper.find('.card-compact').exists()).toBe(true);
    expect(wrapper.find('button.card-info-btn').attributes('aria-label')).toBe('More info about Test Degree');
  });

  it('uses locale for the name (Italian)', async () => {
    i18n.global.locale.value = 'it';
    const wrapper = mountMatchCard();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Corso Test');
  });

  it('keeps the name as plain text, without zero-width spaces', () => {
    const wrapper = mountMatchCard();
    expect(wrapper.find('.card-compact-name').text()).toBe('Test Degree');
  });

  it('is display-only by default: no pick button', () => {
    const wrapper = mountMatchCard();
    expect(wrapper.find('button.card-pick').exists()).toBe(false);
  });

  it('pickable renders the name inside a button that emits pick', async () => {
    const wrapper = mountMatchCard({ pickable: true });
    const pick = wrapper.find('button.card-pick');
    expect(pick.exists()).toBe(true);
    expect(pick.text()).toContain('Test Degree');
    await pick.trigger('click');
    expect(wrapper.emitted('pick')).toHaveLength(1);
  });

  it('clicking the info button does not emit pick', async () => {
    const wrapper = mountMatchCard({ pickable: true }, { openDegreeInfo: vi.fn() });
    await wrapper.find('button.card-info-btn').trigger('click');
    expect(wrapper.emitted('pick')).toBeUndefined();
  });

  it('the pick button and the info button are siblings, never nested', () => {
    const wrapper = mountMatchCard({ pickable: true });
    expect(wrapper.find('button button').exists()).toBe(false);
  });

  it('eliminated shows the overlay, hides it from assistive tech, and says "Removed" to screen readers', () => {
    const wrapper = mountMatchCard({ eliminated: true, pickable: true });
    const overlay = wrapper.find('.position-absolute');
    expect(overlay.attributes('aria-hidden')).toBe('true');
    expect(overlay.classes()).toContain('pe-none');
    expect(wrapper.text()).toContain('❌');
    expect(wrapper.find('.visually-hidden').text()).toContain('Removed');
    expect(wrapper.find('.card-compact').classes()).toContain('border-danger');
  });

  it('applies border-primary when selected', () => {
    const wrapper = mountMatchCard({ selected: true });
    expect(wrapper.find('.card-compact').classes()).toContain('border-primary');
  });

  it('calls openDegreeInfo when the info button is clicked', async () => {
    const openDegreeInfo = vi.fn();
    const wrapper = mountMatchCard({}, { openDegreeInfo });
    await wrapper.find('button.card-info-btn').trigger('click');
    expect(openDegreeInfo).toHaveBeenCalledWith(mockDegree);
  });

  it('falls back to degree.name.en when locale key missing', () => {
    const degreeEnOnly = { id: 'x', name: { en: 'English Only' } };
    i18n.global.locale.value = 'it';
    const wrapper = mount(MatchCard, {
      props: { degree: degreeEnOnly },
      global: { plugins: [i18n] },
    });
    expect(wrapper.text()).toContain('English Only');
  });
});
