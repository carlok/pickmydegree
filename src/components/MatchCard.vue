<script setup>
import { computed, inject } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  degree: {
    type: Object,
    required: true
  },
  selected: Boolean,
  eliminated: Boolean,
  compact: {
    type: Boolean,
    default: false
  }
});

const { locale, t } = useI18n();
const openDegreeInfo = inject('openDegreeInfo', null);

const localizedTags = computed(() => {
  const tagData = props.degree.tags;
  if (!tagData) return [];
  if (typeof tagData === 'object' && tagData.en && tagData.it) return tagData[locale.value] || tagData.en || [];
  if (Array.isArray(tagData)) return tagData;
  return [];
});

/** Name with break opportunities between words so long names wrap in Phase 2 without breaking layout. */
const displayName = computed(() => {
  const name = props.degree?.name?.[locale.value] ?? props.degree?.name?.en ?? '';
  if (typeof name !== 'string') return '';
  return name.split(/\s+/).join(' \u200B');
});

function onInfoClick(e) {
  e.preventDefault();
  e.stopPropagation();
  if (!props.compact) return;
  if (openDegreeInfo) {
    openDegreeInfo(props.degree);
  }
}
</script>

<template>
  <!-- Compact: name only + info (?) button -->
  <div
    v-if="compact"
    class="card glass-card card-compact h-100 position-relative overflow-hidden user-select-none d-flex flex-row align-items-start justify-content-between gap-2 px-3 py-2"
    :class="{ 'border-danger': eliminated, 'border-primary': selected }"
  >
    <span class="flex-grow-1 min-w-0 fw-bold text-light card-compact-name">{{ displayName || degree.name[$i18n.locale] }}</span>
    <button
      ref="infoBtnRef"
      type="button"
      class="btn btn-sm btn-outline-light rounded-circle p-0 d-flex align-items-center justify-content-center flex-shrink-0 text-light"
      style="width: 1.75rem; height: 1.75rem;"
      :title="t('card.info')"
      aria-label="More info"
      @click.stop="onInfoClick"
    >
      ?
    </button>
    <div v-if="eliminated" class="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-75 d-flex align-items-center justify-content-center pointer-events-none">
      <span class="text-danger">❌</span>
    </div>
  </div>

  <!-- Full card (legacy) -->
  <div
    v-else
    class="card glass-card h-100 position-relative overflow-hidden user-select-none"
    :class="{ 'border-danger': eliminated, 'border-primary': selected }"
  >
    <div class="card-body text-center d-flex flex-column align-items-center justify-content-center p-4">
      <div class="display-3 mb-3">{{ degree.icon }}</div>
      <h5 class="card-title fw-bold mb-2">{{ degree.name[$i18n.locale] }}</h5>
      <p class="card-text small text-body-secondary mb-3">{{ degree.description[$i18n.locale] }}</p>
      <div v-if="localizedTags.length" class="mt-auto pt-2">
        <span v-for="tag in localizedTags" :key="tag" class="badge rounded-pill bg-dark bg-opacity-50 me-1 border border-secondary text-info fw-normal">
          {{ tag }}
        </span>
      </div>
    </div>
    <div v-if="eliminated" class="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-75 d-flex align-items-center justify-content-center fade-in">
      <div class="display-1 text-danger">❌</div>
    </div>
  </div>
</template>

<style scoped>
.card-compact {
  color: var(--bs-light, #f8fafc);
}
.card-compact-name {
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  white-space: normal;
  line-height: 1.3;
}
.fade-in {
  animation: fadeIn 0.3s ease;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
