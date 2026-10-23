<script setup>
import { ref, provide, nextTick, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { Modal, Offcanvas } from './bootstrap-js';
import { useGameEngine } from './composables/useGameEngine';
import { useSound } from './composables/useSound';
import { useI18n } from 'vue-i18n';
import { saveLocale } from './i18n';
import { loadDegreeText } from './data';
import ProgressBar from './components/ProgressBar.vue';
import WelcomeScreen from './components/WelcomeScreen.vue';
import Phase1Filter from './components/Phase1Filter.vue';
import Phase2Pairs from './components/Phase2Pairs.vue';
import Phase3Bracket from './components/Phase3Bracket.vue';
import ResultsScreen from './components/ResultsScreen.vue';
import RulesScreen from './components/RulesScreen.vue';
import Phase0Categories from './components/Phase0Categories.vue';
import DonateScreen from './components/DonateScreen.vue';

const { state, init, goToWelcome, goToDonate } = useGameEngine();
const { isMuted, toggleMute, playTap } = useSound();
const { locale, t } = useI18n();

const screens = {
  welcome: WelcomeScreen,
  rules: RulesScreen,
  donate: DonateScreen,
  categories: Phase0Categories,
  phase1: Phase1Filter,
  phase2: Phase2Pairs,
  'phase3-bracket': Phase3Bracket,
  results: ResultsScreen,
};

/** Injected at build time from git (e.g. 0.1.42). */
const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0-dev';

init(); // Load from localStorage

const switchLocale = () => {
  locale.value = locale.value === 'en' ? 'it' : 'en';
  saveLocale(locale.value);
};

// The page scrolls as a whole now, so a new screen must start at the top.
watch(() => state.value.phase, () => { window.scrollTo?.({ top: 0 }); });

// Keep <html lang> in step with the UI language (screen readers pick pronunciation from it).
watch(locale, (l) => { document.documentElement.lang = l; }, { immediate: true });

const menuOffcanvasRef = ref(null);
function openMenu() {
  nextTick(() => {
    if (menuOffcanvasRef.value) Offcanvas.getOrCreateInstance(menuOffcanvasRef.value).show();
  });
}

function goHomeAndCloseMenu() {
  goToWelcome();
  if (menuOffcanvasRef.value) {
    const instance = Offcanvas.getInstance(menuOffcanvasRef.value);
    if (instance) instance.hide();
  }
}

function goToDonateAndCloseMenu() {
  playTap();
  goToDonate();
  if (menuOffcanvasRef.value) {
    const instance = Offcanvas.getInstance(menuOffcanvasRef.value);
    if (instance) instance.hide();
  }
}

// Degree info modal (reliable on Chrome/PC instead of Bootstrap Popover)
const degreeForModal = ref(null);
const degreeModalRef = ref(null);
/** True while the description is on screen; Phase 2 pauses its countdown meanwhile. */
const degreeInfoOpen = ref(false);

// Descriptions and tags are separate per-language chunks, fetched the first time a "?" is tapped.
const degreeTexts = ref({});
async function ensureDegreeText(loc) {
  if (degreeTexts.value[loc]) return;
  try {
    degreeTexts.value = { ...degreeTexts.value, [loc]: await loadDegreeText(loc) };
  } catch {
    // Offline or chunk missing: the modal still shows the degree name
  }
}
watch(locale, (loc) => { if (degreeForModal.value) ensureDegreeText(loc); });

function openDegreeInfo(degree) {
  degreeForModal.value = degree;
  degreeInfoOpen.value = true;
  ensureDegreeText(locale.value);
  nextTick(() => {
    const el = degreeModalRef.value;
    if (el) {
      Modal.getOrCreateInstance(el).show();
    }
  });
}

function onDegreeModalHidden() {
  degreeForModal.value = null;
  degreeInfoOpen.value = false;
}

// Bootstrap fires "hidden.bs.modal" on the element. Vue's `@hidden.bs.modal` would read ".bs" and ".modal"
// as modifiers and listen for plain "hidden", so the listener is attached by hand.
onMounted(() => degreeModalRef.value?.addEventListener('hidden.bs.modal', onDegreeModalHidden));
onBeforeUnmount(() => degreeModalRef.value?.removeEventListener('hidden.bs.modal', onDegreeModalHidden));

provide('openDegreeInfo', openDegreeInfo);
provide('degreeInfoOpen', degreeInfoOpen);

const modalDegreeName = computed(() => {
  const d = degreeForModal.value;
  if (!d?.name) return '';
  return d.name[locale.value] ?? d.name.en ?? '';
});
const modalDegreeText = computed(() => {
  const d = degreeForModal.value;
  if (!d) return null;
  return degreeTexts.value[locale.value]?.[d.id] ?? null;
});
const modalDegreeDesc = computed(() => {
  const d = degreeForModal.value;
  if (!d) return '';
  return modalDegreeText.value?.description ?? d.description?.[locale.value] ?? d.description?.en ?? '';
});
const modalDegreeTags = computed(() => {
  const d = degreeForModal.value;
  if (!d) return [];
  if (modalDegreeText.value) return modalDegreeText.value.tags ?? [];
  const tagData = d.tags;
  if (tagData && typeof tagData === 'object' && !Array.isArray(tagData)) return tagData[locale.value] || tagData.en || [];
  return Array.isArray(tagData) ? tagData : [];
});
</script>

<template>
  <div class="container py-4 flex-grow-1 d-flex flex-column" style="max-width: 600px;">
    <header class="d-flex justify-content-between align-items-center mb-4">
      <a
        href="#"
        class="h4 mb-0 fw-bold text-gradient d-flex align-items-center gap-2 user-select-none text-decoration-none text-body"
        @click.prevent="playTap(); goToWelcome()"
      >
        <span aria-hidden="true">🎓</span> Pick My Degree
      </a>
      <div class="d-flex align-items-center gap-2">
        <button
          type="button"
          class="btn btn-sm btn-outline-light rounded-pill px-2 border-opacity-25 header-btn"
          :aria-label="isMuted ? t('common.sound_off') : t('common.sound_on')"
          :aria-pressed="!isMuted"
          :title="isMuted ? t('common.sound_off') : t('common.sound_on')"
          @click="playTap(); toggleMute()"
        >
          <span aria-hidden="true">{{ isMuted ? '🔇' : '🔊' }}</span>
        </button>
        <button
          type="button"
          @click="playTap(); switchLocale()"
          class="btn btn-sm btn-outline-light rounded-pill px-3 fw-bold border-opacity-25 header-btn"
          :aria-label="t('common.switch_language')"
          :title="t('common.switch_language')"
        >
          {{ locale === 'en' ? 'IT' : 'EN' }}
        </button>
        <button
          type="button"
          class="btn btn-sm btn-outline-light rounded-pill px-2 border-opacity-25 header-btn"
          :aria-label="t('menu.aria_label')"
          :title="t('menu.title')"
          @click="playTap(); openMenu()"
        >
          <span aria-hidden="true">☰</span>
        </button>
      </div>
    </header>

    <!-- Hamburger menu offcanvas -->
    <div
      id="menuOffcanvas"
      ref="menuOffcanvasRef"
      class="offcanvas offcanvas-end bg-dark border-start border-secondary"
      tabindex="-1"
      aria-labelledby="menuOffcanvasLabel"
      data-bs-backdrop="true"
      data-bs-scroll="true"
    >
      <div class="offcanvas-header border-secondary">
        <h5 id="menuOffcanvasLabel" class="offcanvas-title text-light">{{ t('menu.title') }}</h5>
        <button type="button" class="btn-close btn-close-white" :aria-label="t('common.close')" data-bs-dismiss="offcanvas" data-bs-target="#menuOffcanvas" />
      </div>
      <div class="offcanvas-body">
        <button type="button" class="btn btn-outline-light rounded-pill w-100 mb-3" @click="playTap(); goHomeAndCloseMenu()">
          {{ t('menu.home') }}
        </button>
        <a href="https://github.com/carlok/pickmydegree" target="_blank" rel="noopener noreferrer" class="btn btn-outline-light rounded-pill w-100 mb-3 d-inline-flex align-items-center justify-content-center gap-2" :aria-label="t('menu.github')" @click="playTap()">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          {{ t('menu.github') }}
        </a>
        <p class="small text-secondary mb-2">{{ t('menu.about') }}</p>
        <a href="https://carlo.perassi.com" target="_blank" rel="noopener noreferrer" class="btn btn-outline-primary rounded-pill w-100 mb-2" @click="playTap()">
          {{ t('menu.info_contact') }}
        </a>
        <button type="button" class="btn btn-primary rounded-pill w-100 mb-3 d-inline-flex align-items-center justify-content-center gap-2" @click="goToDonateAndCloseMenu()">
          <span aria-hidden="true">🙏</span>
          {{ t('donate.title') }}
        </button>
        <div class="thanks-card rounded-3 p-3 mt-3 border border-secondary">
          <p class="small text-secondary text-center mb-2">{{ t('menu.thanks_to') }}</p>
          <div class="d-flex flex-wrap align-items-center justify-content-center gap-2">
            <span class="thanks-name rounded-pill px-3 py-1 fw-semibold">👩 {{ t('menu.thanks_rossella') }}</span>
            <span class="small text-secondary">{{ t('menu.thanks_and') }}</span>
            <span class="thanks-name rounded-pill px-3 py-1 fw-semibold">👨 {{ t('menu.thanks_vittorio') }}</span>
          </div>
        </div>
      </div>
    </div>

    <ProgressBar v-if="state.phase !== 'welcome' && state.phase !== 'rules' && state.phase !== 'donate'" />
    
    <main class="app-main flex-grow-1 d-flex flex-column position-relative">
      <div
        class="app-main-content flex-grow-1 d-flex flex-column"
        :class="{ 'phase2-footer-gap': state.phase === 'phase2' }"
      >
        <!-- No <KeepAlive>: each screen starts fresh, so a second game replays intros, fanfare and shuffles. -->
        <Transition name="fade" mode="out-in">
          <component
            :key="state.phase"
            :is="screens[state.phase] ?? ResultsScreen"
          />
        </Transition>
      </div>
    </main>

    <footer class="app-footer mt-4 text-center text-secondary small py-3 user-select-none">
      {{ t('footer.copyright_prefix') }}
      <a href="https://carlo.perassi.com" target="_blank" rel="noopener noreferrer" class="text-secondary text-decoration-none d-inline-block py-2">{{ t('footer.author') }}</a>
      <span class="ms-1">· {{ t('footer.version', { version: appVersion }) }}</span>
    </footer>

    <!-- Degree info modal (for "?" on cards; works on Chrome/PC) -->
    <div
      ref="degreeModalRef"
      class="modal fade"
      tabindex="-1"
      aria-labelledby="degreeModalTitle"
      aria-hidden="true"
      data-bs-backdrop="true"
      data-bs-keyboard="true"
    >
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content bg-dark border border-secondary">
          <div class="modal-header border-secondary">
            <h5 id="degreeModalTitle" class="modal-title text-light">
              {{ modalDegreeName }}
            </h5>
            <button type="button" class="btn-close btn-close-white" :aria-label="t('common.close')" data-bs-dismiss="modal" />
          </div>
          <div class="modal-body text-start text-body">
            <p class="small text-secondary-emphasis">{{ modalDegreeDesc }}</p>
            <div v-if="modalDegreeTags.length" class="mt-2">
              <span v-for="tag in modalDegreeTags" :key="tag" class="badge bg-secondary me-1 mb-1">{{ tag }}</span>
            </div>
          </div>
          <div class="modal-footer border-secondary">
            <button type="button" class="btn btn-primary rounded-pill" data-bs-dismiss="modal">
              {{ t('common.close') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.text-gradient {
  background: linear-gradient(to right, #6B5DEA, #6AAEF5);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Each screen takes the free space under the header; the page itself scrolls when content is taller. */
.app-main-content > * {
  flex: 1 0 auto;
  display: flex;
  flex-direction: column;
}

.header-btn {
  min-width: 2.75rem;
  min-height: 2.75rem;
}

/* Safe area so footer and bottom buttons aren't under home indicator (iPhone) */
.app-footer {
  padding-bottom: env(safe-area-inset-bottom, 0);
  flex-shrink: 0;
}

/* Phase 2: extra bottom gap so footer never overlays the second degree card when scrolling */
.app-main-content.phase2-footer-gap > * {
  padding-bottom: 6rem;
}

/* Thanks clip-card in menu: subtle card with highlighted names */
.thanks-card {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(6px);
}
.thanks-name {
  background: rgba(107, 93, 234, 0.35);
  color: rgba(255, 255, 255, 0.95);
  white-space: nowrap;
}
</style>
