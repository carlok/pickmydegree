<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useGameEngine } from '../composables/useGameEngine';
import { useSound } from '../composables/useSound';
import MatchCard from './MatchCard.vue';
import { useI18n } from 'vue-i18n';
import html2canvas from 'html2canvas';
import confetti from 'canvas-confetti';

const { state, resetGame } = useGameEngine();
const { playFanfare, playSuccess } = useSound();
const { t, locale } = useI18n();

const captureRef = ref(null);
const actionsRef = ref(null);

/** App palette for confetti (classic firework on winner). */
const CONFETTI_COLORS = ['#6B5DEA', '#6AAEF5', '#58DDBA', '#DEEFFF', '#425EC9'];

function fireConfetti() {
  const duration = 2200;
  const end = Date.now() + duration;
  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0.2, y: 0.6 },
      colors: CONFETTI_COLORS,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 0.8, y: 0.6 },
      colors: CONFETTI_COLORS,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
  // One big burst from center (above winner card)
  setTimeout(() => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { x: 0.5, y: 0.45 },
      colors: CONFETTI_COLORS,
    });
  }, 200);
}

const RESULTS_CONFETTI_KEY = 'pick-my-degree-confetti-shown';
let resizeCleanup = null;
onMounted(() => {
  playFanfare();
  const alreadyShown = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(RESULTS_CONFETTI_KEY);
  if (!alreadyShown) {
    fireConfetti();
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(RESULTS_CONFETTI_KEY, '1');
  }
  nextTick(() => measureLayout());
  const win = typeof window !== 'undefined' ? window : null;
  if (win) {
    win.addEventListener('resize', measureLayout);
    resizeCleanup = () => win.removeEventListener('resize', measureLayout);
  }
});
onUnmounted(() => { resizeCleanup?.(); });

function measureLayout() {
  const cap = captureRef.value;
  const act = actionsRef.value;
  const win = typeof window !== 'undefined' ? window : null;
  if (!win) return;
  const capRect = cap?.getBoundingClientRect();
  const actRect = act?.getBoundingClientRect();
  const overlap = capRect && actRect ? actRect.top < capRect.bottom : null;
  const scrollEl = cap?.closest('.results-scroll');
}
const downloadMessage = ref(null);
const shareMessage = ref(null); // 'success' | 'error' | null
const personName = ref('');

const resultDate = computed(() => {
  return new Date().toLocaleDateString(locale.value === 'it' ? 'it-IT' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
});

const downloadFilename = computed(() => {
  const base = 'pick-my-degree-result';
  const namePart = personName.value.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '') || 'result';
  const datePart = new Date().toISOString().slice(0, 10);
  return `${base}-${namePart}-${datePart}.png`;
});

const shareSupported = computed(() => typeof navigator !== 'undefined' && !!navigator.share);

/** Canonical app home URL (used for share and "Share the app" link). */
const APP_HOME_URL = 'https://pick-my-degree.surge.sh/';

async function handleShareApp() {
  if (!navigator.share) return;
  try {
    await navigator.share({
      title: 'Pick My Degree',
      text: 'Pick My Degree – discover your ideal degree through a tournament of choices.',
      url: APP_HOME_URL
    });
    shareMessage.value = 'success';
    playSuccess();
  } catch (e) {
    if (e?.name !== 'AbortError') shareMessage.value = 'error';
  }
}

/** Capture result card to canvas and return PNG blob. */
async function getResultBlob() {
  if (!captureRef.value) return null;
  const canvas = await html2canvas(captureRef.value, {
    backgroundColor: '#0B1830',
    scale: 2,
  });
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob || null), 'image/png');
  });
}

const handleDownload = async () => {
  downloadMessage.value = null;
  shareMessage.value = null;
  try {
    const blob = await getResultBlob();
    if (!blob) {
      downloadMessage.value = 'error';
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadFilename.value;
    a.click();
    URL.revokeObjectURL(url);
    downloadMessage.value = 'success';
    playSuccess();
  } catch {
    downloadMessage.value = 'error';
  }
};

const handleShare = async () => {
  shareMessage.value = null;
  downloadMessage.value = null;
  if (!navigator.share) {
    shareMessage.value = 'error';
    return;
  }
  try {
    const blob = await getResultBlob();
    if (!blob) {
      shareMessage.value = 'error';
      return;
    }
    const file = new File([blob], downloadFilename.value, { type: 'image/png' });
    const data = {
      files: [file],
      title: 'Pick My Degree',
      text: state.value.winner ? state.value.winner.name[locale.value] : 'My degree result',
    };
    if (navigator.canShare && !navigator.canShare(data)) {
      shareMessage.value = 'error';
      return;
    }
    await navigator.share(data);
    shareMessage.value = 'success';
    playSuccess();
  } catch (err) {
    if (err?.name === 'AbortError') return; // user cancelled
    shareMessage.value = 'error';
  }
};

const handleRestart = () => {
  resetGame();
};
</script>

<template>
  <div class="results-root h-100 d-flex flex-column min-h-0">
    <div class="results-scroll flex-grow-1 min-h-0 overflow-auto">
      <div class="results-inner d-flex flex-column align-items-center text-center py-4 w-100">
        <div class="d-flex align-items-start justify-content-between w-100 mb-2 px-2" style="max-width: 320px;">
          <button
            type="button"
            class="btn btn-link link-secondary small text-decoration-none p-0"
            @click="resetGame"
          >
            ← {{ t('common.back') }}
          </button>
          <span class="invisible">← {{ t('common.back') }}</span>
        </div>
        <h2 class="fw-bold h3 mb-4">{{ t('results.title') }}</h2>

        <div ref="captureRef" class="results-capture rounded-4 p-4 text-start">
          <p class="small text-secondary text-uppercase mb-2">{{ t('results.winner_label') }}</p>
          <MatchCard v-if="state.winner" :degree="state.winner" class="mb-0" compact />
          <div class="mt-3 pt-3 border-top border-white border-opacity-10">
            <label class="small text-secondary text-uppercase d-block mb-1">{{ t('results.your_name') }}</label>
            <input
              v-model="personName"
              type="text"
              class="form-control form-control-sm bg-dark bg-opacity-50 border border-white border-opacity-25 text-light rounded-pill px-3"
              :placeholder="t('results.your_name')"
            />
            <p class="small text-secondary mb-0 mt-2">
              {{ t('results.date') }}: <strong class="text-light">{{ resultDate }}</strong>
            </p>
          </div>
        </div>

        <div ref="actionsRef" class="results-actions d-flex flex-column gap-3 w-100 mt-4" style="max-width: 320px;">
          <div class="d-flex gap-2 flex-sm-row flex-column">
            <button @click="handleDownload" class="btn btn-primary rounded-pill px-4 py-3 fw-bold flex-grow-1">
              {{ t('results.download') }}
            </button>
            <button
              v-if="shareSupported"
              type="button"
              class="btn btn-outline-primary rounded-pill px-4 py-3 fw-bold flex-grow-1 d-flex align-items-center justify-content-center gap-2"
              @click="handleShare"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              {{ t('results.share') }}
            </button>
          </div>
          <p v-if="downloadMessage === 'success'" class="small text-success mb-0">
            {{ t('results.share_success') }}
          </p>
          <p v-if="shareMessage === 'success'" class="small text-success mb-0">
            {{ t('results.share_success_native') }}
          </p>
          <p v-if="downloadMessage === 'error' || shareMessage === 'error'" class="small text-danger mb-0">
            {{ t('results.share_error') }}
          </p>
          <button @click="handleRestart" class="btn btn-outline-light rounded-pill px-4 py-3 fw-bold">
            {{ t('results.restart') }}
          </button>
          <a
            href="https://pick-my-degree.surge.sh/"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-outline-primary rounded-pill px-4 py-3 fw-bold d-flex align-items-center justify-content-center gap-2 text-decoration-none"
            @click="shareSupported && $event.preventDefault() && handleShareApp()"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            {{ t('results.share_app') }}
          </a>
          <a
            href="https://buymeacoffee.com/carlok"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-primary rounded-pill px-4 py-3 fw-bold d-inline-flex align-items-center justify-content-center gap-2"
          >
            <span aria-hidden="true">☕</span>
            {{ t('common.buy_me_a_coffee') }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.results-root {
  /* Same pattern as RulesScreen: scrollable inner area so capture + actions never overlap */
}
.results-scroll {
  -webkit-overflow-scrolling: touch;
}
/* Prevent flex shrink: inner content keeps natural height so scroll works and buttons never overlap */
.results-inner {
  flex-shrink: 0;
  min-height: min-content;
}
.results-capture {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-width: 320px;
}
.results-actions {
  flex-shrink: 0;
  padding-bottom: env(safe-area-inset-bottom, 1rem);
}
</style>
