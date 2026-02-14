<script setup>
import { useI18n } from 'vue-i18n';
import { useGameEngine } from '../composables/useGameEngine';
import { useSound } from '../composables/useSound';

const { t } = useI18n();
const { goToRules, goToDonate, resetGame } = useGameEngine();
const { playSuccess, playTap } = useSound();

const dataSourceHtml = () =>
  t('welcome.data_source', {
    politoLink: '<a href="https://polito.it" target="_blank" rel="noopener noreferrer" class="link-primary">Politecnico di Torino</a>',
    unitoLink: '<a href="https://unito.it" target="_blank" rel="noopener noreferrer" class="link-primary">Università di Torino</a>',
  });
</script>

<template>
  <div class="text-center py-5">
    <div class="mb-5 display-1">🎓</div>
    <h1 class="display-4 fw-bold mb-3">{{ $t('welcome.title') }}</h1>
    <p class="lead text-secondary-emphasis mb-4">{{ $t('welcome.subtitle') }}</p>
    <p class="small text-secondary mb-2 mx-auto" style="max-width: 480px;" v-html="dataSourceHtml()"></p>
    <p class="small text-secondary opacity-75 mb-5 mx-auto" style="max-width: 480px;">{{ $t('welcome.data_academic_year') }}</p>

    <button @click="playSuccess(); goToRules()" class="btn btn-primary rounded-pill px-4 py-3 fw-bold d-inline-flex align-items-center justify-content-center">
      {{ $t('welcome.start') }} 🚀
    </button>

    <p class="mt-4 mb-0">
      <button type="button" class="btn btn-link link-secondary small text-decoration-none p-0" @click="playTap(); resetGame()">
        {{ $t('dev.reset_saved') }}
      </button>
    </p>
    <p class="mt-3 mb-0">
      <button
        type="button"
        class="btn btn-primary rounded-pill px-4 py-3 fw-bold d-inline-flex align-items-center justify-content-center gap-2"
        @click="playTap(); goToDonate()"
      >
        <span aria-hidden="true">🙏</span>
        {{ $t('donate.title') }}
      </button>
    </p>
  </div>
</template>
