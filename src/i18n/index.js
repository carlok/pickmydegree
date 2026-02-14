import { createI18n } from 'vue-i18n';
import en from './en.json';
import it from './it.json';

const getBrowserLocale = () => {
    const navigatorLocale = navigator.language || navigator.userLanguage;
    if (navigatorLocale && navigatorLocale.startsWith('it')) {
        return 'it';
    }
    return 'en';
};

const i18n = createI18n({
    legacy: false,
    locale: getBrowserLocale(),
    fallbackLocale: 'en',
    globalInjection: true,
    messages: {
        en,
        it
    }
});

export default i18n;
