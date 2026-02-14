<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useGameEngine } from '../composables/useGameEngine';
import { useSound } from '../composables/useSound';

const { t } = useI18n();
const { goToWelcome } = useGameEngine();
const { playTap } = useSound();

const COFFEE_URL = 'https://buymeacoffee.com/carlok';

const SATISPAY_WEB_URL = 'https://web.satispay.com/download/qrcode/S6Y-CON--974A8B11-B631-4E2D-8A11-ED1CA5F3749B?locale=it';
const SATISPAY_ANDROID_PACKAGE = 'com.satispay.customer';

/** On Android mobile: use intent URL so the link opens the Satispay app when installed, otherwise the web page. */
const satispayHref = ref(SATISPAY_WEB_URL);

onMounted(() => {
  if (typeof navigator === 'undefined') return;
  const isAndroid = /Android/i.test(navigator.userAgent);
  if (isAndroid) {
    const fallback = encodeURIComponent(SATISPAY_WEB_URL);
    satispayHref.value = `intent://web.satispay.com/download/qrcode/S6Y-CON--974A8B11-B631-4E2D-8A11-ED1CA5F3749B?locale=it#Intent;scheme=https;package=${SATISPAY_ANDROID_PACKAGE};S.browser_fallback_url=${fallback};end`;
  }
});
</script>

<template>
  <div class="donate-root text-center py-5">
    <div class="mb-4">
      <button
        type="button"
        class="btn btn-link link-secondary small text-decoration-none p-0"
        @click="playTap(); goToWelcome()"
      >
        ← {{ t('common.back') }}
      </button>
    </div>
    <h2 class="fw-bold h3 mb-2">{{ t('donate.title') }}</h2>
    <p class="text-secondary small mb-4">{{ t('donate.subtitle') }}</p>

    <div class="d-flex flex-column gap-3 align-items-center" style="max-width: 360px; margin: 0 auto;">
      <a
        :href="COFFEE_URL"
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-primary rounded-pill px-4 py-3 fw-bold d-inline-flex align-items-center justify-content-center gap-2 w-100 text-decoration-none"
        @click="playTap()"
      >
        <span aria-hidden="true">☕</span>
        {{ t('donate.coffee') }}
      </a>
      <a
        :href="satispayHref"
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-outline-light rounded-pill px-4 py-3 fw-bold d-inline-flex align-items-center justify-content-center gap-2 w-100 text-decoration-none"
        @click="playTap()"
      >
        <span aria-hidden="true">💳</span>
        {{ t('donate.satispay') }}
      </a>
    </div>
  </div>
</template>

<style scoped>
.donate-root {
  min-height: 0;
}
</style>
