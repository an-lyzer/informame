<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import Layout from './components/layout/Layout.vue';
import Home from './components/pages/Home.vue';
import Candidatos from './components/pages/candidatos.vue';
import Noticias from './components/pages/Noticias.vue';
import Estadisticas from './components/pages/Estadisticas.vue';

const GA_MEASUREMENT_ID = 'G-9SBK9Q1L79';

const getHashPath = (hashValue) => {
  const raw = typeof hashValue === 'string' ? hashValue : window.location.hash;
  const path = (raw || '#/').replace(/^#/, '');
  return path || '/';
};

const trackPageView = (hashValue) => {
  const page_path = getHashPath(hashValue);
  if (typeof window.gtag !== 'function') return;

  window.gtag('event', 'page_view', {
    page_path,
    page_location: window.location.href,
  });
};

const currentHash = ref(window.location.hash || '#/');

const onHashChange = () => {
  currentHash.value = window.location.hash || '#/';
  trackPageView(currentHash.value);
};

onMounted(() => {
  if (!window.location.hash) {
    window.location.hash = '#/';
  }

  trackPageView(window.location.hash || '#/');
  window.addEventListener('hashchange', onHashChange);
});

onBeforeUnmount(() => {
  window.removeEventListener('hashchange', onHashChange);
});

const currentView = computed(() => {
  const path = (currentHash.value || '#/').replace(/^#/, '');
  switch (path) {
    case '/candidatos':
      return Candidatos;
    case '/noticias':
      return Noticias;
    case '/estadisticas':
      return Estadisticas;
    case '/':
    default:
      return Home;
  }
});
</script>

<template>
  <Layout>
    <component :is="currentView" />
  </Layout>
</template>