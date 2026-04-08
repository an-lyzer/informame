<script setup>
import { computed, onBeforeUnmount, onMounted, nextTick, ref } from 'vue';
import intencionVotoBarrasImg from '../../assets/intencion_voto_barras.png';
import intencionVotoPresidenteImg from '../../assets/intencion_voto_presidente.png';
import intencionSenadoFebImg from '../../assets/intencion_senado_feb.png';
import noticia1Img from '../../assets/noticias/noticia1.png';
import noticia2Img from '../../assets/noticias/noticia2.png';
import noticia3Img from '../../assets/noticias/noiticia3.png';
import { Icon } from "@iconify/vue";
import candidatosData from '../../data/candidatos.json';

const STORAGE_SELECTED_CANDIDATE_ID = 'watchit:selectedCandidateId';
const STORAGE_PENDING_CANDIDATE_ID = 'watchit:pendingCandidateId';
const logoModules = import.meta.glob('../../assets/logos/*.{png,jpg,jpeg,svg,webp}', {
    eager: true,
    import: 'default',
});

const logos = Object.entries(logoModules)
    .map(([path, src]) => {
        const fileName = path.split('/').pop() ?? path;
        return {
            name: fileName,
            src,
            alt: fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '),
        };
    })
    .filter((logo) => {
        const name = (logo?.name ?? '').toString().toLocaleLowerCase('es');
        const alt = (logo?.alt ?? '').toString().toLocaleLowerCase('es');
        const hasPte = /(^|[^a-z0-9])pte([^a-z0-9]|$)/i.test(name) || /(^|[^a-z0-9])pte([^a-z0-9]|$)/i.test(alt);
        return !hasPte;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

const noticiasSemanaRef = ref(null);
const noticiasTitleRef = ref(null);
const noticiasTitleWidth = ref(0);

const estadisticasTitleRef = ref(null);
const estadisticasTitleWidth = ref(0);

const activeStatIndex = ref(0);
const stats = [
    {
        title: 'Intención de Voto Presidencial Ene-Feb | Ipsos',
        imageSrc: intencionVotoBarrasImg,
    },
    {
        title: 'Intención de Voto Presidencial Último Año | Ipsos',
        imageSrc: intencionVotoPresidenteImg,
    },
    {
        title: 'Intención de Voto Partido/Senado Feb | Ipsos',
        imageSrc: intencionSenadoFebImg,
    },
];

const searchInputRef = ref(null);
const searchQuery = ref('');
const isSearchFocused = ref(false);

const SEARCH_SUGGESTIONS = (Array.isArray(candidatosData) ? candidatosData : [])
    .map((item) => ({
        id: item.id,
        party: item.party,
        candidate: item.candidate,
        label: `${item.party} – ${item.candidate}`,
    }))
    .filter((item) => item.id && item.party && item.candidate);

const normalizeText = (value) =>
    value
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('es');

const filteredSuggestions = computed(() => {
    const query = normalizeText(searchQuery.value).trim();
    if (!query) return [];
    return SEARCH_SUGGESTIONS.filter((item) => {
        const party = normalizeText(item.party);
        const candidate = normalizeText(item.candidate);
        const label = normalizeText(item.label);
        return party.includes(query) || candidate.includes(query) || label.includes(query);
    });
});

const selectSuggestion = (suggestion) => {
    searchQuery.value = suggestion.label;
    if (suggestion?.id) {
        try {
            window.localStorage.setItem(STORAGE_SELECTED_CANDIDATE_ID, suggestion.id);
            window.localStorage.setItem(STORAGE_PENDING_CANDIDATE_ID, suggestion.id);
        } catch {
            // ignore storage errors
        }
        window.location.hash = '#/candidatos';
    }
    isSearchFocused.value = false;
    nextTick(() => searchInputRef.value?.blur?.());
};

const normalizeKey = (value) =>
    (value ?? '')
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('es')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

const needsLogoContrast = (logo) => {
    const text = `${logo?.alt ?? ''} ${logo?.name ?? ''}`;
    const normalized = normalizeKey(text);
    return normalized.includes('renovacion') && normalized.includes('popular');
};

const STOP_TOKENS = new Set([
    'partido',
    'politico',
    'politica',
    'del',
    'de',
    'la',
    'el',
    'los',
    'las',
    'por',
    'para',
    'y',
    'en',
    'al',
    'a',
    'peru',
    'logo',
]);

const TOKEN_ALIASES = {
    // Para archivos con typo (ej: libertad_popoular.png)
    popoular: 'popular',
};

const keyTokens = (value) =>
    normalizeKey(value)
        .split(' ')
        .map((t) => t.trim())
        .filter(Boolean);

const normalizeTokens = (tokens) => tokens.map((t) => TOKEN_ALIASES[t] ?? t);

const findCandidateIdByLogo = (logo) => {
    const logoText = logo?.alt ?? logo?.name ?? '';
    const logoKey = normalizeKey(logoText);
    if (!logoKey) return null;

    const logoTokens = new Set(normalizeTokens(keyTokens(logoText)));
    const logoCompact = logoKey.replace(/\s+/g, '');

    let bestId = null;
    let bestScore = 0;

    for (const item of SEARCH_SUGGESTIONS) {
        const partyKey = normalizeKey(item.party);
        if (!partyKey) continue;

        const partyCompact = partyKey.replace(/\s+/g, '');
        if (partyCompact.includes(logoCompact) || logoCompact.includes(partyCompact)) {
            return item.id;
        }

        const partyTokens = normalizeTokens(keyTokens(item.party)).filter((t) => !STOP_TOKENS.has(t));
        if (!partyTokens.length) continue;

        let score = 0;
        for (const token of partyTokens) {
            if (logoTokens.has(token)) score += 1;
        }

        if (score > bestScore) {
            bestScore = score;
            bestId = item.id;
        }
    }

    // Exigir al menos 2 tokens compartidos para evitar falsos positivos (ej: solo 'popular').
    // Pero permitir 1 token si el logo tiene un token distintivo y no es un stop-token.
    if (bestScore >= 2) return bestId;
    if (bestScore >= 1) {
        const tokens = normalizeTokens(keyTokens(logoText)).filter((t) => !STOP_TOKENS.has(t));
        if (tokens.length === 1 && tokens[0] && tokens[0].length >= 6) return bestId;
    }
    return null;
};

const selectByLogo = (logo) => {
    const id = findCandidateIdByLogo(logo);
    if (!id) {
        searchQuery.value = logo?.alt ?? '';
        nextTick(() => searchInputRef.value?.focus?.());
        return;
    }
    try {
        window.localStorage.setItem(STORAGE_SELECTED_CANDIDATE_ID, id);
        window.localStorage.setItem(STORAGE_PENDING_CANDIDATE_ID, id);
    } catch {
        // ignore storage errors
    }
    window.location.hash = '#/candidatos';
};

const scrollToNoticiasSemana = () => {
    noticiasSemanaRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const updateNoticiasTitleWidth = () => {
    noticiasTitleWidth.value = noticiasTitleRef.value?.offsetWidth ?? 0;
};

const updateEstadisticasTitleWidth = () => {
    estadisticasTitleWidth.value = estadisticasTitleRef.value?.offsetWidth ?? 0;
};

const updateTitleWidths = () => {
    updateNoticiasTitleWidth();
    updateEstadisticasTitleWidth();
};

onMounted(() => {
    nextTick(updateTitleWidths);
    window.addEventListener('resize', updateTitleWidths);
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', updateTitleWidths);
});
</script>

<template>
    <div class="contenedor-buscador">
        <span class="home-title">
            Informate de cualquier candidato/<br />
            partido de manera fácil y objetiva
        </span>
        <div class="search-bar-wrapper">
            <div class="search-autocomplete">
                <input ref="searchInputRef" v-model="searchQuery" type="text" class="circular-search"
                    placeholder="Buscar por nombre" autocomplete="off" aria-autocomplete="list"
                    :aria-expanded="isSearchFocused && filteredSuggestions.length > 0"
                    aria-controls="search-suggestions" @focus="isSearchFocused = true"
                    @blur="isSearchFocused = false" />
                <Icon class="search-icon" icon="lucide:search" width="28" height="28" aria-hidden="true" />

                <ul v-if="isSearchFocused && filteredSuggestions.length" id="search-suggestions"
                    class="search-suggestions" role="listbox" aria-label="Sugerencias">
                    <li v-for="item in filteredSuggestions" :key="item.label" class="search-suggestion-item"
                        role="option">
                        <button type="button" class="search-suggestion-btn" @mousedown.prevent="selectSuggestion(item)">
                            {{ item.label }}
                        </button>
                    </li>
                </ul>
            </div>
        </div>
        <div class="elige-texto">O elige un logo:</div>
        <div class="opciones-grid">
            <div v-for="logo in logos" :key="logo.name" class="opcion-cuadro" @click="selectByLogo(logo)" role="button"
                tabindex="0" @keydown.enter.prevent="selectByLogo(logo)" @keydown.space.prevent="selectByLogo(logo)"
                aria-label="Seleccionar partido">
                <img :src="logo.src" :alt="logo.alt" loading="lazy" :class="{ 'logo-white-badge': needsLogoContrast(logo) }" />
            </div>
        </div>
        <div class="home-icon" @click="scrollToNoticiasSemana" aria-label="Ir a noticias de la semana">
            <svg class="flechita-icono" width="59.2" height="59.2" viewBox="0 0 74 74" fill="none"
                xmlns="http://www.w3.org/2000/svg" focusable="false">
                <circle cx="36.731" cy="36.731" r="36.731" fill="var(--primary-yellow)" />
                <path d="M15.5828 27.4554L37.1019 50.4586L58.6211 27.4554" stroke="var(--primary-black)"
                    stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        </div>
    </div>
    <div class="seccion-noticias" ref="noticiasSemanaRef">
        <div class="noticias-header">
            <a href="#/noticias" class="noticias-title-link" aria-label="Ver noticias">
                <h2 ref="noticiasTitleRef">Noticias de la semana</h2>
            </a>
            <div class="noticias-divider" :style="{ '--noticias-title-width': `${noticiasTitleWidth}px` }"></div>
        </div>

        <div class="noticias-columnas">
            <div class="noticia1">
                <img class="noticia-imagen" :src="noticia1Img"
                    alt="Candidatos a la presidencia despliegan giras intensivas en regiones" />
                <h4 class="noticia-titulo">Candidatos a la presidencia despliegan giras intensivas en regiones: ¿Dónde
                    estuvieron y hacia dónde se dirigen?</h4>
                <h5 class="noticia-meta">Abril 7 - 5 min leer</h5>
            </div>

            <div class="noticia2">
                <img class="noticia-imagen" :src="noticia2Img" alt="Keiko se estanca en encuesta IEP" />
                <h4 class="noticia-titulo">Keiko se estanca, mientras que López Aliaga, Carlos Álvarez y Roberto Sánchez
                    empatan en encuesta IEP</h4>
                <h5 class="noticia-meta">Abril 5 - 4 min leer</h5>
            </div>

            <div class="noticia3">
                <img class="noticia-imagen" :src="noticia3Img" alt="Multa por no votar en Perú 2026" />
                <h4 class="noticia-titulo">Este es el valor de la multa por no votar en las elecciones de Perú en 2026
                </h4>
                <h5 class="noticia-meta">Abril 7 - 4 min leer</h5>
            </div>
        </div>

    </div>


    <div class="cita-dia">
        <h3>Cita del día</h3>
        <h4>“No me interesa así se perjudiquen diez mil, cien mil personas. ¡No va!”<br>-Keiko Fujimori</h4>

    </div>
    <div class="seccion-estadisticas">
        <div class="estadisticas-header">
            <h2 ref="estadisticasTitleRef">Top Estadísticas</h2>
            <div class="estadisticas-divider" :style="{ '--estadisticas-title-width': `${estadisticasTitleWidth}px` }">
            </div>
        </div>

        <div class="estadisticas-columnas">
            <div class="estadistica-col estadistica1">
                <div class="estadistica-stage" aria-live="polite">
                    <div class="estadistica-track" :style="{ transform: `translateX(-${activeStatIndex * 100}%)` }">
                        <div v-for="s in stats" :key="s.title" class="estadistica-slide">
                            <h4 class="estadistica-titulo">{{ s.title }}</h4>
                            <img class="estadistica-imagen" :src="s.imageSrc" :alt="s.title" />
                        </div>
                    </div>
                </div>

                <div class="estadistica-tabs" role="tablist" aria-label="Cambiar estadística">
                    <button v-for="(s, idx) in stats" :key="s.title" type="button" class="estadistica-tab"
                        :class="{ active: idx === activeStatIndex }" @click="activeStatIndex = idx"
                        :aria-pressed="idx === activeStatIndex" :aria-label="`Ver estadística ${idx + 1}`">
                        <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg"
                            focusable="false" aria-hidden="true">
                            <circle cx="12.5204" cy="12.5204" r="12.5204" fill="var(--primary-yellow)" />
                        </svg>
                    </button>
                </div>
            </div>

            <div class="estadistica-col col2">
                <h2 class="estadisticas-col2-titulo">
                    Revisa las estadísticas más recientes e infórmate qué está pasando realmente de forma gráfica.
                </h2>

                <button type="button" class="estadisticas-cta" aria-label="Ver más estadísticas">
                    <svg width="204" height="62" viewBox="0 0 204 62" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g filter="url(#filter0_d_74_163)">
                            <rect width="196" height="54" rx="21" fill="var(--primary-yellow)" />
                            <path
                                d="M48.5646 18.0268H55.9183V19.5266L53.8622 19.8411L57.4665 30.6782L58.168 33.1214L58.7728 30.654L62.1594 19.8411L60.2484 19.5266V18.0268H66.1023V19.5266L64.5542 19.8411L58.9905 36.1693H56.1119L50.016 19.8411L48.5646 19.5266V18.0268ZM72.7914 36.2661C70.6627 36.2661 69.0742 35.6452 68.026 34.4035C66.9939 33.1456 66.4778 31.4362 66.4778 29.2752C66.4778 27.8238 66.7439 26.5659 67.2761 25.5015C67.8244 24.4372 68.5904 23.6228 69.5742 23.0583C70.5579 22.4939 71.6948 22.2117 72.985 22.2117C74.5976 22.2117 75.8394 22.6391 76.7102 23.4938C77.5811 24.3324 78.0326 25.5338 78.0649 27.0981C78.0649 28.1624 78.0003 28.9526 77.8713 29.4687H70.0096C70.0741 30.9362 70.4208 32.0812 71.0498 32.9037C71.6787 33.71 72.5737 34.1132 73.7348 34.1132C74.3638 34.1132 75.0088 34.0084 75.67 33.7987C76.3474 33.5891 76.8795 33.3391 77.2666 33.0488L77.8713 34.3793C77.4359 34.8469 76.7263 35.2824 75.7426 35.6855C74.775 36.0726 73.7913 36.2661 72.7914 36.2661ZM74.6783 28.0173C74.7105 27.5658 74.7266 27.219 74.7266 26.9771C74.7266 24.8323 74.009 23.7599 72.5737 23.7599C71.7835 23.7599 71.1707 24.0743 70.7353 24.7033C70.2999 25.3322 70.058 26.4369 70.0096 28.0173H74.6783ZM79.9953 34.5728L81.5919 34.3793V24.8484L80.0437 24.413V22.7439L83.7932 22.2359H83.8657L84.4705 22.7197V23.2519L84.3979 25.2113H84.4705C84.5834 24.8887 84.8495 24.4936 85.2687 24.0259C85.688 23.5421 86.2122 23.1229 86.8411 22.7681C87.4862 22.3972 88.1796 22.2117 88.9214 22.2117C89.2762 22.2117 89.5826 22.2601 89.8407 22.3568V25.9853C89.3569 25.6467 88.7682 25.4773 88.0748 25.4773C86.8975 25.4773 85.8735 25.7918 85.0027 26.4208V34.3551L87.8087 34.5728V36H79.9953V34.5728ZM97.122 34.5486L98.4767 34.3309V24.8484L96.9285 24.413V22.7439L100.944 22.2359L101.234 22.4294L101.597 23.2277V24.2437C102.129 23.7276 102.887 23.2761 103.871 22.889C104.871 22.4859 105.734 22.2843 106.459 22.2843C107.33 22.2843 108.032 22.4294 108.564 22.7197C109.112 23.01 109.523 23.4615 109.798 24.0743C110.33 23.5905 111.031 23.1712 111.902 22.8164C112.773 22.4617 113.628 22.2843 114.466 22.2843C115.902 22.2843 116.918 22.7036 117.514 23.5421C118.111 24.3807 118.409 25.7515 118.409 27.6544V34.3309L119.982 34.5486V36H113.716V34.5486L114.974 34.3309V27.7512C114.974 26.4933 114.821 25.6144 114.515 25.1145C114.224 24.5984 113.66 24.3404 112.821 24.3404C112.37 24.3404 111.902 24.4452 111.418 24.6549C110.951 24.8484 110.531 25.0903 110.16 25.3806C110.273 25.9934 110.33 26.7594 110.33 27.6786V34.3309L111.83 34.5486V36H105.516V34.5486L106.846 34.3309V27.6786C106.846 26.8401 106.79 26.1869 106.677 25.7192C106.58 25.2354 106.387 24.8887 106.097 24.6791C105.806 24.4533 105.387 24.3404 104.839 24.3404C104.323 24.3404 103.807 24.4614 103.29 24.7033C102.791 24.929 102.339 25.2032 101.936 25.5257V34.3309L103.363 34.5486V36H97.122V34.5486ZM121.353 32.2264C121.353 30.7588 122.087 29.6542 123.554 28.9123C125.038 28.1705 126.949 27.7915 129.287 27.7754V27.219C129.287 26.5578 129.215 26.0418 129.07 25.6709C128.941 25.3 128.691 25.0258 128.32 24.8484C127.965 24.6549 127.441 24.5581 126.747 24.5581C125.957 24.5581 125.248 24.663 124.619 24.8726C123.99 25.0661 123.337 25.3241 122.659 25.6467L121.909 24.0985C122.151 23.8889 122.554 23.6389 123.119 23.3486C123.699 23.0583 124.385 22.8084 125.175 22.5987C125.965 22.373 126.78 22.2601 127.618 22.2601C128.86 22.2601 129.828 22.4213 130.521 22.7439C131.231 23.0664 131.739 23.5825 132.045 24.292C132.351 25.0016 132.505 25.9531 132.505 27.1465V34.5486H133.811V35.9032C133.488 35.9839 133.029 36.0645 132.432 36.1451C131.835 36.2258 131.311 36.2661 130.86 36.2661C130.311 36.2661 129.94 36.1855 129.747 36.0242C129.57 35.8629 129.481 35.5323 129.481 35.0324V34.3793C129.045 34.8631 128.481 35.2985 127.788 35.6855C127.094 36.0726 126.312 36.2661 125.441 36.2661C124.699 36.2661 124.014 36.1129 123.385 35.8065C122.772 35.4839 122.28 35.0243 121.909 34.4276C121.539 33.8148 121.353 33.0811 121.353 32.2264ZM126.989 34.2583C127.328 34.2583 127.715 34.1616 128.15 33.968C128.586 33.7584 128.965 33.5084 129.287 33.2181V29.251C127.836 29.251 126.747 29.501 126.022 30.0009C125.312 30.4847 124.957 31.1136 124.957 31.8877C124.957 32.6618 125.135 33.2504 125.49 33.6536C125.86 34.0567 126.36 34.2583 126.989 34.2583ZM124.982 19.4057L129.07 14.3741L131.198 16.2368C130.811 16.8818 130.053 17.672 128.925 18.6074C127.812 19.5427 126.909 20.1555 126.215 20.4458L124.982 19.4057ZM138.006 34.0164C138.135 34.2099 138.425 34.3954 138.876 34.5728C139.344 34.7341 139.812 34.8147 140.279 34.8147C141.037 34.8147 141.602 34.6615 141.973 34.3551C142.36 34.0325 142.553 33.6133 142.553 33.0972C142.553 32.565 142.319 32.1377 141.852 31.8151C141.384 31.4765 140.594 31.0652 139.481 30.5814L138.804 30.2912C137.691 29.8235 136.861 29.2591 136.312 28.5979C135.764 27.9367 135.49 27.082 135.49 26.0337C135.49 25.308 135.708 24.663 136.143 24.0985C136.578 23.518 137.191 23.0664 137.981 22.7439C138.772 22.4213 139.683 22.2601 140.715 22.2601C141.473 22.2601 142.118 22.3085 142.65 22.4052C143.198 22.502 143.771 22.631 144.368 22.7923C144.69 22.9051 144.932 22.9697 145.093 22.9858V26.1547H143.182L142.626 24.3162C142.529 24.155 142.311 24.0098 141.973 23.8808C141.634 23.7518 141.247 23.6873 140.812 23.6873C140.15 23.6873 139.618 23.8324 139.215 24.1227C138.828 24.3969 138.635 24.7839 138.635 25.2838C138.635 25.7354 138.772 26.1144 139.046 26.4208C139.32 26.711 139.618 26.9368 139.941 27.0981C140.263 27.2593 140.86 27.5254 141.731 27.8963C142.602 28.2673 143.319 28.622 143.884 28.9607C144.464 29.2994 144.94 29.7429 145.311 30.2912C145.698 30.8233 145.892 31.4765 145.892 32.2505C145.892 33.4439 145.424 34.4115 144.489 35.1533C143.553 35.8952 142.207 36.2661 140.449 36.2661C139.626 36.2661 138.885 36.1935 138.223 36.0484C137.578 35.9032 136.828 35.7097 135.974 35.4678L135.441 35.2985V32.1054H137.449L138.006 34.0164Z"
                                fill="var(--primary-black)" />
                        </g>
                        <defs>
                            <filter id="filter0_d_74_163" x="0" y="0" width="204" height="62"
                                filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                <feFlood flood-opacity="0" result="BackgroundImageFix" />
                                <feColorMatrix in="SourceAlpha" type="matrix"
                                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                <feOffset dx="4" dy="4" />
                                <feGaussianBlur stdDeviation="2" />
                                <feComposite in2="hardAlpha" operator="out" />
                                <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
                                <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_74_163" />
                                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_74_163"
                                    result="shape" />
                            </filter>
                        </defs>
                    </svg>
                </button>
            </div>
        </div>
    </div>

</template>


<style scoped>
.search-autocomplete {
    position: relative;
    width: 100%;
    max-width: 832px;
    margin: 0 auto;
}

.search-icon {
    position: absolute;
    right: 20.8px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--primary-white);
    opacity: 0.85;
    stroke-width: 1.5;
    pointer-events: none;
}

.search-suggestions {
    position: absolute;
    top: calc(100% + 10px);
    left: 0;
    right: 0;
    margin: 0;
    padding: 8px 0;
    list-style: none;
    background: var(--primary-white);
    border: 1.5px solid #d1d1d1;
    border-radius: 12px;
    z-index: 10;
    max-height: 320px;
    overflow-y: auto;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.10);
}

.search-suggestion-item {
    margin: 0;
}

.search-suggestion-btn {
    width: 100%;
    text-align: left;
    background: transparent;
    border: 0;
    padding: 12px 18px;
    cursor: pointer;
    font-size: 18px;
    font-family: 'Merriweather';
    color: var(--primary-black);
}

.search-suggestion-btn:hover {
    background: rgba(255, 215, 0, 0.35);
}

.home-icon {
    margin-top: 36px;
    display: flex;
    justify-content: center;
    cursor: pointer;
}

.flechita-icono {
    width: 59.2px;
    height: 59.2px;
    display: block;
}

.seccion-noticias {
    height: 700px;
}

.cita-dia {
    height: 169.6px;
    background: var(--primary-white);
    color: var(--primary-black);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding-left: 80px;
    padding-right: 80px;
    box-sizing: border-box;
    text-align: center;
}

.cita-dia h3 {
    margin: 0;
    font-weight: 900;
    line-height: 1;
    text-align: center;
    font-size: clamp(1.4rem, 2.5vw, 24.2px);
}

.cita-dia h4 {
    margin: 0;
    font-style: italic;
    font-weight: 400;
    text-align: center;
}

.noticias-header {
    padding-left: 80px;
    padding-right: 80px;
}

.noticias-title-link {
    display: inline-block;
    text-decoration: none;
    color: inherit;
}

.noticias-title-link:hover {
    text-decoration: underline;
    text-decoration-color: var(--primary-yellow);
    text-decoration-thickness: 3px;
    text-underline-offset: 6px;
}

.noticias-header h2 {
    padding-top: 89px;
    font-weight: 900;
    line-height: 1.264;
    margin: 0;
    display: inline-block;
    max-width: 100%;
}

.noticias-divider {
    height: 2px;
    background: var(--primary-white);
    margin-top: 26px;
    position: relative;
}

.noticias-divider::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: var(--noticias-title-width, 0px);
    background: var(--primary-yellow);
}

.noticias-columnas {
    display: flex;
    gap: 40px;
    padding-left: 80px;
    padding-right: 80px;
    padding-top: 47px;
    box-sizing: border-box;
}

.seccion-estadisticas {
    padding-bottom: 64px;
}

.estadisticas-header {
    padding-left: 64px;
    padding-right: 64px;
    text-align: right;
}

.estadisticas-header h2 {
    padding-top: 52px;
    font-weight: 900;
    line-height: 1.264;
    margin: 0;
    display: inline-block;
    max-width: 100%;
}

.estadisticas-divider {
    height: 2px;
    background: var(--primary-white);
    margin-top: 24px;
    position: relative;
}

.estadisticas-divider::before {
    content: '';
    position: absolute;
    right: 0;
    top: 0;
    height: 100%;
    width: var(--estadisticas-title-width, 0px);
    background: var(--primary-yellow);
}

.estadisticas-columnas {
    display: flex;
    gap: 32px;
    padding-right: 64px;
    padding-top: 60.8px;
    box-sizing: border-box;
    align-items: flex-start;
}

.estadistica-col {
    flex: 1;
    min-width: 0;
}

.estadistica1 {
    flex: 2;
    padding-left: 123.2px;
}

.estadistica-stage {
    width: 100%;
    overflow: hidden;
}

.estadistica-track {
    display: flex;
    flex-wrap: nowrap;
    width: 100%;
    transition: transform 520ms ease;
    will-change: transform;
}

.estadistica-slide {
    flex: 0 0 100%;
    min-width: 0;
}

.estadistica-titulo {
    font-weight: 400;
    line-height: 1.264;
    margin: 0px 0 14px 0;
    text-align: center;
    color: var(--primary-yellow)
}

.estadistica-imagen {
    width: 50vw;
    max-width: 100%;
    aspect-ratio: 700 / 323;
    height: auto;
    display: block;
    margin: 0 auto;
    border-radius: 10px;
    object-fit: contain;
}

.estadistica-tabs {
    margin-top: 21px;
    display: flex;
    gap: 42px;
    justify-content: center;
}

.estadistica-tab {
    background: transparent;
    border: 0;
    padding: 0;
    width: 26px;
    height: 26px;
    cursor: pointer;
    transition: transform 0.1s ease;
    line-height: 0;
    opacity: 0.55;
}

.estadistica-tab svg {
    display: block;
}

.estadistica-tab:hover {
    transform: translateY(-1px);
}

.estadistica-tab.active {
    opacity: 1;
}

.col2 {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: center;
    align-self: stretch;
}

.estadisticas-col2-titulo {
    margin: 18px 35px 0px 0;
    font-weight: 900;
    line-height: 1.264;
    text-align: right;
    font-size: 41.8px;
}

.estadisticas-cta {
    background: transparent;
    border: 0;
    padding: 0;
    margin-top: 47px;
    cursor: pointer;
    line-height: 0;
    align-self: center;
}

.estadisticas-cta svg {
    display: block;
}

@media (max-width: 1024px) {
    .estadisticas-columnas {
        flex-direction: column;
        gap: 22.4px;
        padding-left: 32px;
        padding-right: 32px;
    }

    .estadisticas-header {
        padding-left: 32px;
        padding-right: 32px;
    }

    .estadistica1 {
        padding-left: 0;
    }
}

@media (max-width: 600px) {
    .estadisticas-columnas {
        padding-left: 9.6px;
        padding-right: 9.6px;
    }

    .estadisticas-header {
        padding-left: 9.6px;
        padding-right: 9.6px;
    }

    .estadistica-tabs {
        gap: 42px;
    }

    .estadistica-tab {
        padding: 9px 14px;
    }
}

.noticias-columnas>div {
    flex: 1;
    min-width: 0;
}

.noticia-imagen {
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    display: block;
    margin-top: 9px;
}

.noticia-titulo {
    font-weight: 900;
    line-height: 1.264;
    display: block;
    width: 100%;
    overflow-wrap: anywhere;
    margin: 25px 0 0 0;
}

.noticia-meta {
    font-weight: 400;
    margin: 10px 0 0 0;
}

.elige-texto {
    text-align: center;
    margin-top: 16px;
    font-size: 20.2px;
    color: var(--primary-white);
    font-family: 'Merriweather';
    font-weight: 400;
    opacity: 0.5;
}

.opciones-grid {
    display: grid;
    grid-template-columns: repeat(11, 85.6px);
    grid-template-rows: repeat(4, 80.8px);
    gap: 4px;
    justify-content: center;
    margin: 12.8px auto 0 auto;
    width: max-content;
    padding-left: 48px;
    padding-right: 48px;
    box-sizing: border-box;
}

@media (max-width: 1024px) {
    .opciones-grid {
        padding-left: 1rem;
        padding-right: 1rem;
        width: min(25.6rem, 100%);
        max-width: 100%;
        grid-template-columns: repeat(8, minmax(3.25rem, 1fr));
        grid-template-rows: none;
        grid-auto-rows: 2.6rem;
        gap: 0.6rem;
    }

    .opciones-grid .opcion-cuadro {
        width: 100%;
        height: 100%;
        border-radius: 0.6rem;
        border-width: 1px;
    }
}

@media (max-width: 600px) {
    .opciones-grid {
        padding-left: 0.75rem;
        padding-right: 0.75rem;
        width: min(17.6rem, 100%);
        max-width: 100%;
        grid-template-columns: repeat(5, minmax(2.8rem, 1fr));
        grid-template-rows: none;
        grid-auto-rows: 2.24rem;
        gap: 0.56rem;
    }

    .opciones-grid .opcion-cuadro {
        width: 100%;
        min-width: 0;
        height: 100%;
        border-radius: 0.4rem;
        border-width: 1px;
    }
}


.opcion-cuadro {
    width: 80px;
    height: 74.4px;
    background: var(--primary-white);
    border-radius: 9.6px;
    border: 1.2px solid #d1d1d1;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 140ms ease, box-shadow 0.2s, border-color 0.2s;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
    cursor: pointer;
    box-sizing: border-box;
    overflow: hidden;
    transform: scale(1);
    transform-origin: center;
    position: relative;
    background-position: center;
    background-repeat: no-repeat;
    background-size: contain;
}

.opcion-cuadro img {
    width: 82%;
    height: 82%;
    object-fit: contain;
    display: block;
}

.logo-white-badge {
    background: var(--primary-white);
    border-radius: 10px;
    padding: 6px;
    box-sizing: border-box;
}

.opcion-cuadro:hover {
    transform: scale(1.06);
    z-index: 1;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.10);
    border-color: var(--primary-yellow);
}

.home-title {
    display: block;
    margin: 40px auto 0 auto;
    text-align: center;
    font-size: 60.48px;
    padding-left: 180px;
    padding-right: 180px;
    line-height: 1.15;
}

.search-bar-wrapper {
    display: flex;
    justify-content: center;
    margin-top: 32px;
    padding-left: 135px;
    padding-right: 135px;
}


.circular-search {
    border-radius: 15.2px;
    padding: 14.4px 51.2px 14.4px 25.6px;
    font-size: 23.2px;
    font-weight: 400;
    outline: none;
    border: 1.2px solid var(--primary-white);
    background: var(--primary-dark);
    color: var(--primary-white);
    caret-color: var(--primary-white);
    width: 100%;
    max-width: 832px;
    text-align: left;
    transition: border 0.2s;
}

.circular-search::placeholder {
    color: var(--primary-white);
    opacity: 0.65;
    font-weight: 400;
    font-style: italic;
    font-family: 'Merriweather';
}


@media (max-width: 1024px) {
    .search-autocomplete {
        max-width: 480px;
    }

    .home-title {
        font-size: 33.44px;
        padding-left: 40px;
        padding-right: 40px;
    }

    .search-bar-wrapper {
        padding-left: 40px;
        padding-right: 40px;
    }

    .circular-search {
        font-size: 17.6px;
        max-width: 480px;
    }
}

@media (max-width: 600px) {
    .search-autocomplete {
        max-width: 72vw;
    }

    .circular-search {
        font-size: 12.8px;
        max-width: 72vw;
        padding: 9.6px 35.2px 9.6px 12.8px;
    }

    .search-icon {
        right: 12.8px;
        stroke-width: 1.5;
    }
}

@media (max-width: 1024px) {
    .home-title {
        font-size: 33.44px;
        padding-left: 40px;
        padding-right: 40px;
    }
}

@media (max-width: 600px) {
    .home-title {
        font-size: 25.6px;
        padding-left: 12px;
        padding-right: 12px;
        margin-top: 40px;
    }

    .search-bar-wrapper {
        padding-left: 8px;
        padding-right: 8px;
    }
}
</style>