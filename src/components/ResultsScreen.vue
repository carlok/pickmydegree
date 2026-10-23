<script setup>
import { ref, computed, onMounted } from 'vue';
import { useGameEngine } from '../composables/useGameEngine';
import { useSound } from '../composables/useSound';
import { useLeaveGame } from '../composables/useLeaveGame';
import MatchCard from './MatchCard.vue';
import { useI18n } from 'vue-i18n';
import { APP_HOME_URL } from '../config';

const { state, resetGame, goToDonate } = useGameEngine();
const { playFanfare, playSuccess, playTap } = useSound();
const { leaveGame } = useLeaveGame();
const { t, locale } = useI18n();

const captureRef = ref(null);

/** App palette for confetti (classic firework on winner). */
const CONFETTI_COLORS = ['#6B5DEA', '#6AAEF5', '#58DDBA', '#DEEFFF', '#425EC9'];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// canvas-confetti and html2canvas are only needed here, so they load on demand instead of with the first screen.
async function fireConfetti() {
  if (prefersReducedMotion()) return;
  const { default: confetti } = await import('canvas-confetti');
  const duration = 2200;
  const end = Date.now() + duration;
  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0.2, y: 0.6 },
      colors: CONFETTI_COLORS,
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 0.8, y: 0.6 },
      colors: CONFETTI_COLORS,
      disableForReducedMotion: true,
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
      disableForReducedMotion: true,
    });
  }, 200);
}

onMounted(() => {
  playFanfare();
  fireConfetti().catch(() => {});
});

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

const nameOf = (degree) => degree?.name?.[locale.value] ?? degree?.name?.en ?? '';

/**
 * Runner-up and the two semi-final losers. Losers are recorded in play order, so the last bracket
 * entries are the semi-final losers and then the final's loser.
 */
const contenders = computed(() => {
  const lost = state.value.eliminatedDegrees.filter((d) => typeof d.round === 'string' && d.round.startsWith('bracket-'));
  return lost.slice(-3).reverse();
});

/** Links to the official course pages, when the card has them. */
const courseLinks = computed(() => {
  const urls = state.value.winner?.url;
  if (!urls || typeof urls !== 'object') return [];
  return Object.entries(urls).map(([key, href]) => ({ key, href, label: t(`universities.${key}`) }));
});

async function handleShareApp() {
  if (!navigator.share) return;
  try {
    await navigator.share({
      title: t('welcome.title'),
      text: t('results.share_app_text'),
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
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(captureRef.value, {
    backgroundColor: '#0B1830',
    scale: 2,
    // Keep interface chrome (the "?" button, input placeholder) out of the saved image.
    ignoreElements: (el) => el.classList?.contains('card-info-btn'),
    onclone: (doc) => {
      doc.querySelector('.results-name-input')?.setAttribute('placeholder', '');
    },
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
    // Some browsers start the download asynchronously; revoking right away can cancel it.
    setTimeout(() => URL.revokeObjectURL(url), 10000);
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
      title: t('welcome.title'),
      text: state.value.winner ? nameOf(state.value.winner) : t('results.share_result_fallback'),
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
  <div class="results-root d-flex flex-column">
    <div class="results-scroll flex-grow-1">
      <div class="results-inner d-flex flex-column align-items-center text-center py-4 w-100">
        <div class="d-flex align-items-start justify-content-between w-100 mb-2 px-2" style="max-width: 320px;">
          <button
            type="button"
            class="btn btn-link link-secondary small text-decoration-none back-link"
            @click="leaveGame"
          >
            ← {{ t('common.back') }}
          </button>
          <span class="invisible">← {{ t('common.back') }}</span>
        </div>
        <h2 class="fw-bold h3 mb-4">{{ t('results.title') }}</h2>

        <div ref="captureRef" class="results-capture rounded-4 p-4 text-start">
          <p class="small text-secondary text-uppercase mb-2">{{ t('results.winner_label') }}</p>
          <MatchCard v-if="state.winner" :degree="state.winner" class="mb-0" />
          <div v-if="contenders.length" class="mt-3">
            <p class="small text-secondary text-uppercase mb-1">{{ t('results.ranking_label') }}</p>
            <ol class="small text-light mb-0 ps-3">
              <li v-for="degree in contenders" :key="degree.id">{{ nameOf(degree) }}</li>
            </ol>
          </div>
          <div class="mt-3 pt-3 border-top border-white border-opacity-10">
            <label for="results-name" class="small text-secondary text-uppercase d-block mb-1">{{ t('results.your_name') }}</label>
            <input
              id="results-name"
              v-model="personName"
              type="text"
              autocomplete="name"
              class="results-name-input form-control bg-dark bg-opacity-50 border border-white border-opacity-25 text-light rounded-pill px-3"
              :placeholder="t('results.your_name')"
            />
            <p class="small text-secondary mb-0 mt-2">
              {{ t('results.date') }}: <strong class="text-light">{{ resultDate }}</strong>
            </p>
          </div>
        </div>

        <p v-if="courseLinks.length" class="small mt-3 mb-0">
          {{ t('results.learn_more') }}:
          <template v-for="(link, i) in courseLinks" :key="link.key">
            <span v-if="i > 0"> · </span>
            <a :href="link.href" target="_blank" rel="noopener noreferrer" class="link-primary">{{ link.label }}</a>
          </template>
        </p>

        <div class="results-actions d-flex flex-column gap-3 w-100 mt-4" style="max-width: 320px;">
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
          <div aria-live="polite">
            <p v-if="downloadMessage === 'success'" class="small text-success mb-0">
              {{ t('results.share_success') }}
            </p>
            <p v-if="shareMessage === 'success'" class="small text-success mb-0">
              {{ t('results.share_success_native') }}
            </p>
            <p v-if="downloadMessage === 'error' || shareMessage === 'error'" class="small text-danger mb-0">
              {{ t('results.share_error') }}
            </p>
          </div>
          <button @click="playTap(); handleRestart()" class="btn btn-outline-light rounded-pill px-4 py-3 fw-bold">
            {{ t('results.restart') }}
          </button>
          <button
            v-if="shareSupported"
            type="button"
            class="btn btn-outline-primary rounded-pill px-4 py-3 fw-bold d-flex align-items-center justify-content-center gap-2"
            @click="playTap(); handleShareApp()"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            {{ t('results.share_app') }}
          </button>
          <a
            v-else
            :href="APP_HOME_URL"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-outline-primary rounded-pill px-4 py-3 fw-bold d-flex align-items-center justify-content-center gap-2 text-decoration-none"
            @click="playTap()"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            {{ t('results.share_app') }}
          </a>
          <button
            type="button"
            class="btn btn-primary rounded-pill px-4 py-3 fw-bold d-inline-flex align-items-center justify-content-center gap-2"
            @click="playTap(); goToDonate()"
          >
            <span aria-hidden="true">🙏</span>
            {{ t('donate.title') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.results-root {
  flex: 1 0 auto;
}
.results-scroll {
  -webkit-overflow-scrolling: touch;
}
.results-inner {
  flex-shrink: 0;
  min-height: min-content;
}
.results-capture {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-width: 320px;
  width: 100%;
}
.results-actions {
  flex-shrink: 0;
  padding-bottom: env(safe-area-inset-bottom, 1rem);
}
</style>
