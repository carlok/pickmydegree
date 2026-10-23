import { useI18n } from 'vue-i18n';

/** Returns a function mapping a bracket round size to its label: Final (2), Semi-final (4), Quarter (8), ... */
export function useBracketLabel() {
  const { t } = useI18n();
  return (size) => {
    const n = Math.max(2, size || 2);
    const key = `progress.bracket_level_${n}`;
    const out = t(key);
    return out !== key ? out : t('progress.phase3_bracket');
  };
}
