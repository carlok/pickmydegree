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
  /** Render the name as a button that emits `pick`; without it the card is display-only. */
  pickable: Boolean
});
const emit = defineEmits(['pick']);

const { locale, t } = useI18n();
const openDegreeInfo = inject('openDegreeInfo', null);

const displayName = computed(() => {
  const name = props.degree?.name?.[locale.value] ?? props.degree?.name?.en ?? '';
  return typeof name === 'string' ? name : '';
});

function onInfoClick(e) {
  e.preventDefault();
  e.stopPropagation();
  if (openDegreeInfo) {
    openDegreeInfo(props.degree);
  }
}
</script>

<template>
  <div
    class="card glass-card card-compact h-100 position-relative overflow-hidden user-select-none d-flex flex-row align-items-stretch justify-content-between"
    :class="{ 'border-danger': eliminated, 'border-primary': selected }"
  >
    <button
      v-if="pickable"
      type="button"
      class="card-pick flex-grow-1 min-w-0 text-start"
      @click="emit('pick')"
    >
      <span class="card-compact-name fw-bold text-light">{{ displayName }}</span>
      <span v-if="eliminated" class="visually-hidden"> ({{ t('card.eliminated') }})</span>
    </button>
    <span v-else class="card-compact-name fw-bold text-light flex-grow-1 min-w-0 px-3 py-2">{{ displayName }}</span>
    <button
      type="button"
      class="card-info-btn flex-shrink-0"
      :title="t('card.info')"
      :aria-label="t('card.more_info_about', { name: displayName })"
      @click.stop="onInfoClick"
    >
      <span class="card-info-dot" aria-hidden="true">?</span>
    </button>
    <div v-if="eliminated" class="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-75 d-flex align-items-center justify-content-center pe-none" aria-hidden="true">
      <span class="text-danger">❌</span>
    </div>
  </div>
</template>

<style scoped>
.card-compact {
  color: var(--bs-light, #f8fafc);
}
.card-compact-name {
  overflow-wrap: anywhere;
  white-space: normal;
  line-height: 1.3;
}
/* The whole name area is the tap target (>= 44px tall). */
.card-pick {
  display: flex;
  align-items: center;
  min-height: 2.75rem;
  padding: 0.5rem 0.75rem 0.5rem 1rem;
  background: none;
  border: 0;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.card-pick:focus-visible {
  outline: 3px solid var(--bs-light, #DEEFFF);
  outline-offset: -3px;
  border-radius: 1rem;
}
/* 44x44 hit area around a smaller visual circle. */
.card-info-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  min-height: 2.75rem;
  padding: 0;
  background: none;
  border: 0;
  color: inherit;
  cursor: pointer;
}
.card-info-dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-weight: 600;
  line-height: 1;
}
.card-info-btn:hover .card-info-dot {
  background: rgba(255, 255, 255, 0.15);
}
.card-info-btn:focus-visible {
  outline: 3px solid var(--bs-light, #DEEFFF);
  outline-offset: -3px;
  border-radius: 1rem;
}
</style>
