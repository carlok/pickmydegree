import { createApp } from 'vue';
import '@fontsource-variable/montserrat/wght.css';
import './assets/styles.scss';
import App from './App.vue';
import i18n from './i18n';

/** Shown if the app cannot start or a screen throws. Uses the active locale when i18n is up, else the browser's. */
function showFallback() {
  const el = document.getElementById('app');
  if (!el) return;
  const locale = i18n.global?.locale?.value ?? (navigator.language?.startsWith('it') ? 'it' : 'en');
  const messages = i18n.global?.messages?.value?.[locale]?.errors;
  const message = messages?.something_wrong ?? 'Something went wrong. Try refreshing the page.';
  const refresh = messages?.refresh ?? 'Refresh the page';
  el.replaceChildren();
  const box = document.createElement('div');
  box.setAttribute('role', 'alert');
  box.style.cssText = 'padding: 1.5rem; text-align: center;';
  const p1 = document.createElement('p');
  p1.textContent = message;
  const p2 = document.createElement('p');
  const a = document.createElement('a');
  a.href = '';
  a.textContent = refresh;
  p2.appendChild(a);
  box.append(p1, p2);
  el.appendChild(box);
}

try {
  const app = createApp(App);
  app.config.errorHandler = (err, _instance, info) => {
    console.error('Pick My Degree error:', info, err);
    showFallback();
  };
  app.use(i18n);
  app.mount('#app');
} catch (err) {
  console.error('Pick My Degree failed to start', err);
  showFallback();
}
