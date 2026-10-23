/**
 * Unit tests for useSound (mute state and toggles; playback is best-effort in DOM).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSound } from '../../src/composables/useSound';

describe('useSound', () => {
  let sound;

  beforeEach(() => {
    localStorage.clear();
    sound = useSound();
  });

  it('isMuted is false when storage is not "off"', () => {
    expect(sound.isMuted.value).toBe(false);
  });

  it('setMuted(true) persists and isMuted becomes true', () => {
    sound.setMuted(true);
    expect(sound.isMuted.value).toBe(true);
    expect(localStorage.getItem('pick-my-degree-sound')).toBe('off');
  });

  it('setMuted(false) clears mute', () => {
    sound.setMuted(true);
    sound.setMuted(false);
    expect(sound.isMuted.value).toBe(false);
    expect(localStorage.getItem('pick-my-degree-sound')).toBe('on');
  });

  it('toggleMute flips mute state', () => {
    expect(sound.isMuted.value).toBe(false);
    sound.toggleMute();
    expect(sound.isMuted.value).toBe(true);
    sound.toggleMute();
    expect(sound.isMuted.value).toBe(false);
  });

  it('playTap and playAdvance do not throw', () => {
    expect(() => sound.playTap()).not.toThrow();
    expect(() => sound.playAdvance()).not.toThrow();
  });

  it('playSuccess and playFanfare do not throw', () => {
    expect(() => sound.playSuccess()).not.toThrow();
    expect(() => sound.playFanfare()).not.toThrow();
  });

  it('survives a missing AudioContext: no throw, no sound', () => {
    const ctor = window.AudioContext;
    const webkit = window.webkitAudioContext;
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', undefined);
    try {
      expect(() => sound.playAdvance()).not.toThrow();
      expect(() => sound.playFanfare()).not.toThrow();
      expect(() => sound.playTap()).not.toThrow();
    } finally {
      vi.stubGlobal('AudioContext', ctor);
      vi.stubGlobal('webkitAudioContext', webkit);
    }
  });

  it('survives blocked localStorage when toggling and playing', () => {
    const real = globalThis.localStorage;
    const blocked = {
      getItem() { throw new Error('blocked'); },
      setItem() { throw new Error('blocked'); },
      removeItem() { throw new Error('blocked'); },
    };
    vi.stubGlobal('localStorage', blocked);
    try {
      expect(() => sound.toggleMute()).not.toThrow();
      expect(() => sound.playAdvance()).not.toThrow();
      expect(() => sound.playFanfare()).not.toThrow();
    } finally {
      vi.stubGlobal('localStorage', real);
    }
  });

  it('importing the module with blocked localStorage does not throw', async () => {
    const real = globalThis.localStorage;
    vi.stubGlobal('localStorage', { getItem() { throw new Error('blocked'); } });
    vi.resetModules();
    try {
      const mod = await import('../../src/composables/useSound');
      expect(mod.useSound().isMuted.value).toBe(false);
    } finally {
      vi.stubGlobal('localStorage', real);
    }
  });
});
