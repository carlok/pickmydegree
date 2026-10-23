/**
 * Lightweight sound effects using Web Audio API (no asset files).
 * Respects mute preference (localStorage) and resumes AudioContext on first user gesture.
 * Never throws: blocked storage or a missing AudioContext just means silence.
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

function readMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'off';
  } catch {
    return false;
  }
}

function writeMuted(muted) {
  try {
    localStorage.setItem(STORAGE_KEY, muted ? 'off' : 'on');
  } catch {
    // Storage blocked: the preference lasts for this page view only
  }
}

/** Play a short tone. Returns early if muted or AudioContext unavailable. */
function playTone(options) {
  if (typeof window === 'undefined' || !window.AudioContext) return;
  if (readMuted()) return;

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

/**
 * Play a rising run of sine notes. Note i starts at i * spacing; its fade ends at decay + i * tail
 * and the oscillator stops at stop + i * tail, so later notes ring a little longer.
 */
function playNotes({ freqs, volume, attack, spacing, decay, stop, tail }) {
  if (readMuted()) return;
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + attack);
      gain.gain.exponentialRampToValueAtTime(0.001, now + decay + i * tail);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * spacing);
      osc.stop(now + stop + i * tail);
    });
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
  playNotes({ freqs: [523, 659], volume: 0.1, attack: 0.02, spacing: 0.08, decay: 0.15, stop: 0.2, tail: 0.1 });
}

/** Short fanfare – e.g. landing on Results / champion. */
function playFanfare() {
  playNotes({ freqs: [523, 659, 784, 1047], volume: 0.08, attack: 0.03, spacing: 0.1, decay: 0.18, stop: 0.25, tail: 0.08 });
}

const isMutedRef = ref(readMuted());

export function useSound() {
  const isMuted = computed({
    get: () => isMutedRef.value,
    set: (v) => {
      isMutedRef.value = v;
      writeMuted(v);
    },
  });

  function setMuted(muted) {
    isMutedRef.value = muted;
    writeMuted(muted);
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
