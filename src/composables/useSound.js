/**
 * Lightweight sound effects using Web Audio API (no asset files).
 * Respects mute preference (localStorage) and resumes AudioContext on first user gesture.
 */

import { ref, computed } from 'vue';

const STORAGE_KEY = 'pick-my-degree-sound';

let audioContext = null;

function getContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

/** Play a short tone. Returns early if muted or AudioContext unavailable. */
function playTone(options) {
  if (typeof window === 'undefined' || !window.AudioContext) return;
  const muted = localStorage.getItem(STORAGE_KEY) === 'off';
  if (muted) return;

  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = options.type ?? 'sine';
    osc.frequency.setValueAtTime(options.freq, now);
    if (options.freqEnd != null) {
      osc.frequency.exponentialRampToValueAtTime(options.freqEnd, now + (options.duration ?? 0.1));
    }
    gain.gain.setValueAtTime(options.volume ?? 0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (options.duration ?? 0.1));

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (options.duration ?? 0.1));
  } catch (_) {
    // Ignore errors (e.g. autoplay policy, no Web Audio)
  }
}

/** Soft tap/click – e.g. Phase 1 toggle, Phase 2 discard. */
function playTap() {
  playTone({ freq: 280, duration: 0.06, volume: 0.08, type: 'sine' });
}

/** Success / next step – e.g. Continue Phase 1, phase transition, download done. */
function playSuccess() {
  playTone({ freq: 523, duration: 0.12, volume: 0.1, type: 'sine' });
}

/** Advance / match won – e.g. bracket pick winner. */
function playAdvance() {
  const ctx = getContext();
  if (ctx.state === 'suspended') ctx.resume();
  const muted = localStorage.getItem(STORAGE_KEY) === 'off';
  if (muted) return;
  try {
    const now = ctx.currentTime;
    [523, 659].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15 + i * 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + 0.2 + i * 0.1);
    });
  } catch (_) {}
}

/** Short fanfare – e.g. landing on Results / champion. */
function playFanfare() {
  const ctx = getContext();
  if (ctx.state === 'suspended') ctx.resume();
  const muted = localStorage.getItem(STORAGE_KEY) === 'off';
  if (muted) return;
  try {
    const now = ctx.currentTime;
    const freqs = [523, 659, 784, 1047];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18 + i * 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + 0.25 + i * 0.08);
    });
  } catch (_) {}
}

const isMutedRef = ref(localStorage.getItem(STORAGE_KEY) === 'off');

export function useSound() {
  const isMuted = computed({
    get: () => isMutedRef.value,
    set: (v) => {
      isMutedRef.value = v;
      localStorage.setItem(STORAGE_KEY, v ? 'off' : 'on');
    },
  });

  function setMuted(muted) {
    isMutedRef.value = muted;
    localStorage.setItem(STORAGE_KEY, muted ? 'off' : 'on');
  }

  function toggleMute() {
    setMuted(!isMutedRef.value);
  }

  return {
    isMuted,
    setMuted,
    toggleMute,
    playTap,
    playSuccess,
    playAdvance,
    playFanfare,
  };
}
