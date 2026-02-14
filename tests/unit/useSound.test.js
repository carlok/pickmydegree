/**
 * Unit tests for useSound (mute state and toggles; playback is best-effort in DOM).
 */
import { describe, it, expect, beforeEach } from 'vitest';
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
});
