<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import Layout from './components/layout/Layout.vue';
import Home from './components/pages/Home.vue';
import Candidatos from './components/pages/candidatos.vue';
import Noticias from './components/pages/Noticias.vue';
import Estadisticas from './components/pages/Estadisticas.vue';

const currentHash = ref(window.location.hash || '#/');

const onHashChange = () => {
  currentHash.value = window.location.hash || '#/';
};

onMounted(() => {
  if (!window.location.hash) {
    window.location.hash = '#/';
  }
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