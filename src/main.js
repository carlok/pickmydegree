import { createApp } from 'vue';
import './assets/styles.scss';
import App from './App.vue';
import i18n from './i18n';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

function showFallback(message) {
  const el = document.getElementById('app');
  if (el) {
    el.innerHTML = '<div style="padding: 1.5rem; text-align: center;"><p>' + message + '</p><p><a href="">Refresh the page</a></p></div>';
  }
}

try {
  const app = createApp(App);
  app.use(i18n);
  app.mount('#app');
} catch (err) {
  console.error('Pick My Degree failed to start', err);
  showFallback('Something went wrong. Try refreshing the page.');
}
