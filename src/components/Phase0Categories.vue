<script setup>
import { computed, ref, onMounted } from 'vue';
import { Modal } from 'bootstrap';
import { useGameEngine } from '../composables/useGameEngine';
import { useSound } from '../composables/useSound';
import { useI18n } from 'vue-i18n';

const { state, removeCategory, completeCategories, restoreCategory, resetGame } = useGameEngine();
const { playTap, playSuccess } = useSound();
const { t, locale } = useI18n();

/** Stable display order of category names (shuffled once on mount). */
const categoryDisplayOrder = ref([]);

onMounted(() => {
  const surv = state.value.survivingDegrees || [];
  const names = [...new Set(surv.map((d) => d.category || 'Other'))];
  categoryDisplayOrder.value = shuffleArray(names);
});

/** Slug for i18n key: "Business & Law" -> "business_law", "STEM" -> "stem". */
function categoryToSlug(category) {
  if (!category || typeof category !== 'string') return '';
  return category.replace(/\s*&\s*/g, '_').replace(/\s+/g, '_').toLowerCase();
}

/** Localized category label. STEM is shown as "STEM" in all locales (widely known). */
function getCategoryLabel(category) {
  if (category === 'STEM') return 'STEM';
  const key = `category.${categoryToSlug(category)}`;
  const out = t(key);
  return out !== key ? out : category;
}

/** Shuffle array (Fisher-Yates). */
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** All categories in stable display order (surviving + removed), each with name, count, and removed flag. */
const allCategories = computed(() => {
  const surv = state.value.survivingDegrees || [];
  const elim = state.value.eliminatedDegrees || [];
  const survivingByCat = new Map();
  for (const d of surv) {
    const c = d.category || 'Other';
    survivingByCat.set(c, (survivingByCat.get(c) || 0) + 1);
  }
  const removedByCat = new Map();
  for (const d of elim) {
    if (d.round !== 'categories' || !d.category) continue;
    const c = d.category;
    removedByCat.set(c, (removedByCat.get(c) || 0) + 1);
  }
  const allNames = new Set([...survivingByCat.keys(), ...removedByCat.keys()]);
  const order = categoryDisplayOrder.value.length ? categoryDisplayOrder.value : [...allNames];
  const list = order.filter((name) => allNames.has(name)).map((name) => ({
    name,
    count: survivingByCat.has(name) ? survivingByCat.get(name) : removedByCat.get(name),
    removed: !survivingByCat.has(name)
  }));
  return list;
});

/** Kept categories (tap to exclude). */
const keptCategories = computed(() => allCategories.value.filter((c) => !c.removed));
/** Removed categories (tap to restore). */
const removedCategories = computed(() => allCategories.value.filter((c) => c.removed));

const survivingCount = computed(() => state.value.survivingDegrees?.length ?? 0);

function handleRemove(categoryName) {
  playTap();
  removeCategory(categoryName);
}

function handleContinue() {
  const result = completeCategories();
  if (result?.success !== true) return;
  playSuccess();
}

const canContinue = computed(() => survivingCount.value >= 2);

function handleRestore(categoryName) {
  playTap();
  restoreCategory(categoryName);
}

const categoryModalRef = ref(null);
const categoryForInfo = ref(null);

function openCategoryInfo(categoryName, e) {
  e?.preventDefault?.();
  e?.stopPropagation?.();
  categoryForInfo.value = categoryName;
  const el = categoryModalRef.value;
  if (el) Modal.getOrCreateInstance(el).show();
}

function closeCategoryModal() {
  categoryForInfo.value = null;
  const el = categoryModalRef.value;
  if (el) {
    const instance = Modal.getInstance(el);
    if (instance) instance.hide();
  }
}

/** Degrees in the given category (from surviving + eliminated with round categories). */
const degreesInCategory = computed(() => {
  const name = categoryForInfo.value;
  if (!name) return [];
  const surv = state.value.survivingDegrees || [];
  const elim = (state.value.eliminatedDegrees || []).filter((d) => d.round === 'categories');
  const loc = locale.value;
  const fromSurv = surv.filter((d) => (d.category || 'Other') === name).map((d) => d.name[loc] ?? d.name.en ?? d.id);
  const fromElim = elim.filter((d) => d.category === name).map((d) => d.name[loc] ?? d.name.en ?? d.id);
  const names = [...new Set([...fromSurv, ...fromElim])];
  return names.sort((a, b) => (a || '').localeCompare(b || '', locale.value || 'en'));
});

</script>

<template>
  <div class="categories-root h-100 d-flex flex-column min-h-0" data-screen="categories">
    <div class="categories-scroll flex-grow-1 min-h-0 overflow-auto d-flex flex-column align-items-center text-center py-4">
      <div class="d-flex align-items-center justify-content-between w-100 mb-2 px-2" style="max-width: 360px;">
        <button
          type="button"
          class="btn btn-link link-secondary small text-decoration-none p-0"
          @click="playTap(); resetGame()"
        >
          ← {{ t('common.back') }}
        </button>
      </div>
      <h2 class="fw-bold h3 mb-2">{{ t('categories.title') }}</h2>
      <p class="text-secondary small mb-3">{{ t('categories.instruction') }}</p>

      <!-- Tap to exclude (kept categories) -->
      <div class="categories-section categories-section-exclude rounded-3 p-3 mb-3" style="max-width: 360px;">
        <p class="small text-center mb-2 text-danger fw-bold categories-section-label">{{ t('categories.tap_to_exclude') }}</p>
        <div class="d-flex flex-wrap justify-content-center gap-2">
          <div
            v-for="cat in keptCategories"
            :key="cat.name"
            role="button"
            tabindex="0"
            class="btn rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2 btn-outline-light category-chip"
            @click="handleRemove(cat.name)"
            @keydown.enter.prevent="handleRemove(cat.name)"
            @keydown.space.prevent="handleRemove(cat.name)"
          >
            <span>{{ getCategoryLabel(cat.name) }}</span>
            <span class="badge bg-secondary rounded-pill">{{ cat.count }}</span>
            <button
              type="button"
              class="btn btn-sm rounded-circle p-0 d-flex align-items-center justify-content-center flex-shrink-0 category-info-btn btn-outline-light"
              style="width: 1.4rem; height: 1.4rem;"
              :title="t('card.info')"
              :aria-label="t('card.info')"
              @click.stop="openCategoryInfo(cat.name, $event)"
            >
              ?
            </button>
          </div>
        </div>
      </div>

      <p class="small text-secondary mb-2">
        {{ t('categories.remaining', { count: survivingCount, total: survivingCount + (state.eliminatedDegrees?.length ?? 0) }) }}
      </p>
      <p class="small text-secondary mb-3">{{ t('categories.keep_at_least') }}</p>
      <button
        type="button"
        class="btn btn-primary rounded-pill px-4 py-3 fw-bold mb-3"
        :disabled="!canContinue"
        @click="handleContinue"
      >
        {{ t('categories.continue', { count: survivingCount }) }}
      </button>

      <!-- Excluded categories (tap to restore) – after Continue -->
      <div v-if="removedCategories.length > 0" class="categories-section categories-section-restore rounded-3 p-3 mb-3" style="max-width: 360px;">
        <p class="small text-center mb-2 text-secondary fw-bold categories-section-label">{{ t('categories.tap_to_restore') }}</p>
        <div class="d-flex flex-wrap justify-content-center gap-2">
          <div
            v-for="cat in removedCategories"
            :key="cat.name"
            role="button"
            tabindex="0"
            class="btn rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2 btn-outline-secondary category-removed category-chip"
            @click="handleRestore(cat.name)"
            @keydown.enter.prevent="handleRestore(cat.name)"
            @keydown.space.prevent="handleRestore(cat.name)"
          >
            <span class="category-name-removed">{{ getCategoryLabel(cat.name) }}</span>
            <span class="badge bg-secondary rounded-pill">{{ cat.count }}</span>
            <button
              type="button"
              class="btn btn-sm rounded-circle p-0 d-flex align-items-center justify-content-center flex-shrink-0 category-info-btn btn-secondary text-white border-0"
              style="width: 1.4rem; height: 1.4rem;"
              :title="t('card.info')"
              :aria-label="t('card.info')"
              @click.stop="openCategoryInfo(cat.name, $event)"
            >
              ?
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Category info modal (list of degrees in category) -->
    <div
      ref="categoryModalRef"
      class="modal fade"
      tabindex="-1"
      aria-labelledby="categoryModalTitle"
      aria-hidden="true"
      data-bs-backdrop="true"
      data-bs-keyboard="true"
      @hidden.bs.modal="closeCategoryModal"
    >
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content bg-dark border border-secondary">
          <div class="modal-header border-secondary">
            <h5 id="categoryModalTitle" class="modal-title text-light">
              {{ categoryForInfo ? getCategoryLabel(categoryForInfo) : '' }}
            </h5>
            <button type="button" class="btn-close btn-close-white" aria-label="Close" data-bs-dismiss="modal" />
          </div>
          <div class="modal-body text-start text-body small">
            <p class="category-modal-label fw-bold text-primary mb-2">{{ t('categories.degrees_in_category') }}</p>
            <ul class="category-modal-list list-unstyled mb-0">
              <li v-for="degName in degreesInCategory" :key="degName" class="mb-1">· {{ degName }}</li>
            </ul>
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
/* Emphasize: tap to EXCLUDE (red tint, like Phase 1 remove) */
.categories-section-exclude {
  background: rgba(var(--bs-danger-rgb), 0.12);
  border: 1px solid rgba(var(--bs-danger-rgb), 0.3);
}
/* Emphasize: tap to RESTORE (neutral tint) */
.categories-section-restore {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
}
.categories-section-label {
  letter-spacing: 0.05em;
}
.category-info-btn {
  opacity: 0.85;
}
.category-info-btn:hover {
  opacity: 1;
}
.category-modal-label {
  color: var(--bs-primary);
}
.categories-root { }
.categories-scroll { -webkit-overflow-scrolling: touch; }
.category-removed {
  opacity: 0.75;
}
.category-removed:hover {
  opacity: 1;
}
.category-name-removed {
  text-decoration: line-through;
}
</style>
