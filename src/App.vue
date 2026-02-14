<script setup>
import { ref, provide, nextTick, computed, watch } from 'vue';
import { Modal, Offcanvas } from 'bootstrap';
import { useGameEngine } from './composables/useGameEngine';
import { useSound } from './composables/useSound';
import { useI18n } from 'vue-i18n';
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

/** Injected at build time from git (e.g. 0.1.42). */
const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0-dev';

init(); // Load from localStorage

const switchLocale = () => {
  locale.value = locale.value === 'en' ? 'it' : 'en';
};

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

function openDegreeInfo(degree) {
  degreeForModal.value = degree;
  nextTick(() => {
    const el = degreeModalRef.value;
    if (el) {
      Modal.getOrCreateInstance(el).show();
    }
  });
}

function closeDegreeModal() {
  const el = degreeModalRef.value;
  if (el) {
    const instance = Modal.getInstance(el);
    if (instance) instance.hide();
  }
  degreeForModal.value = null;
}

provide('openDegreeInfo', openDegreeInfo);

const modalDegreeName = computed(() => {
  const d = degreeForModal.value;
  if (!d?.name) return '';
  return d.name[locale.value] ?? d.name.en ?? '';
});
const modalDegreeDesc = computed(() => {
  const d = degreeForModal.value;
  if (!d?.description) return '';
  return d.description[locale.value] ?? d.description.en ?? '';
});
const modalDegreeTags = computed(() => {
  const d = degreeForModal.value;
  if (!d?.tags) return [];
  const tagData = d.tags;
  const loc = locale.value;
  if (typeof tagData === 'object' && tagData.en && tagData.it) return tagData[loc] || tagData.en || [];
  if (Array.isArray(tagData)) return tagData;
  return [];
});
</script>

<template>
  <div class="container py-4 flex-grow-1 min-h-0 d-flex flex-column overflow-hidden" style="max-width: 600px;">
    <header class="d-flex justify-content-between align-items-center mb-4">
      <a
        href="#"
        class="h4 mb-0 fw-bold text-gradient d-flex align-items-center gap-2 user-select-none text-decoration-none text-body"
        aria-label="Home"
        @click.prevent="playTap(); goToWelcome()"
      >
        <span>🎓</span> Pick My Degree
      </a>
      <div class="d-flex align-items-center gap-2">
        <button
          type="button"
          class="btn btn-sm btn-outline-light rounded-pill px-2 border-opacity-25"
          :aria-label="isMuted ? t('common.sound_off') : t('common.sound_on')"
          :title="isMuted ? t('common.sound_off') : t('common.sound_on')"
          @click="playTap(); toggleMute()"
        >
          {{ isMuted ? '🔇' : '🔊' }}
        </button>
        <button
          @click="playTap(); switchLocale()"
          class="btn btn-sm btn-outline-light rounded-pill px-3 fw-bold border-opacity-25"
        >
          {{ locale === 'en' ? '🇮🇹 IT' : '🇬🇧 EN' }}
        </button>
        <button
          type="button"
          class="btn btn-sm btn-outline-light rounded-pill px-2 border-opacity-25"
          :aria-label="t('menu.aria_label')"
          title="Menu"
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
        <button type="button" class="btn-close btn-close-white" aria-label="Close" data-bs-dismiss="offcanvas" data-bs-target="#menuOffcanvas" />
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
    
    <main class="app-main flex-grow-1 d-flex flex-column position-relative min-h-0">
      <div
        class="app-main-content flex-grow-1 min-h-0 d-flex flex-column"
        :class="{
          'phase-scrollable': state.phase === 'welcome' || state.phase === 'rules' || state.phase === 'donate' || state.phase === 'phase2',
          'phase2-footer-gap': state.phase === 'phase2'
        }"
      >
        <Transition name="fade" mode="out-in">
          <KeepAlive>
             <component 
               :key="state.phase"
               :is="state.phase === 'welcome' ? WelcomeScreen : 
                    state.phase === 'rules' ? RulesScreen : 
                    state.phase === 'donate' ? DonateScreen : 
                    state.phase === 'categories' ? Phase0Categories : 
                    state.phase === 'phase1' ? Phase1Filter : 
                    state.phase === 'phase2' ? Phase2Pairs : 
                    state.phase === 'phase3-bracket' ? Phase3Bracket : 
                    ResultsScreen"
             />
          </KeepAlive>
        </Transition>
      </div>
    </main>
    
    <footer class="app-footer mt-4 text-center text-secondary small py-3 user-select-none opacity-50">
      {{ t('footer.copyright_prefix') }}
      <a href="https://carlo.perassi.com" target="_blank" rel="noopener noreferrer" class="text-secondary text-decoration-none">{{ t('footer.author') }}</a>
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
      @hidden.bs.modal="degreeForModal = null"
    >
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content bg-dark border border-secondary">
          <div class="modal-header border-secondary">
            <h5 id="degreeModalTitle" class="modal-title text-light">
              {{ modalDegreeName }}
            </h5>
            <button type="button" class="btn-close btn-close-white" aria-label="Close" data-bs-dismiss="modal" />
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

/* Force phase content to fill main and allow internal scroll (Phase 1 list) */
.app-main-content > * {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Welcome and Rules: allow vertical scroll so "Azzera progressi" / bottom content is reachable on mobile */
.app-main-content.phase-scrollable > * {
  overflow: auto;
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
