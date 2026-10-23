import { createI18n } from 'vue-i18n';
import en from './en.json';
import it from './it.json';

const LOCALE_KEY = 'pick-my-degree-locale';
const SUPPORTED = ['en', 'it'];

const getBrowserLocale = () => {
    const navigatorLocale = navigator.language || navigator.userLanguage;
    if (navigatorLocale && navigatorLocale.startsWith('it')) {
        return 'it';
    }
    return 'en';
};

/** An explicit choice made with the language toggle wins over the browser language. */
const getInitialLocale = () => {
    try {
        const stored = localStorage.getItem(LOCALE_KEY);
        if (SUPPORTED.includes(stored)) return stored;
    } catch {
        // Storage blocked: fall back to the browser language
    }
    return getBrowserLocale();
};

export const saveLocale = (locale) => {
    try {
        localStorage.setItem(LOCALE_KEY, locale);
    } catch {
        // Storage blocked: the choice lasts for this page view only
    }
};

const i18n = createI18n({
    legacy: false,
    locale: getInitialLocale(),
    fallbackLocale: 'en',
    globalInjection: true,
    messages: {
        en,
        it
    }
});

export default i18n;
