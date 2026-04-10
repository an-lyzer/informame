<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import noticia2Src from '../../assets/noticias/noticia2.png';
import noticia1Src from '../../assets/noticias/noticia1.png';
import noticia3Src from '../../assets/noticias/noiticia3.png';
import noticia4Src from '../../assets/noticias/noticia4.png';

const STORAGE_SELECTED_CANDIDATE_ID = 'watchit:selectedCandidateId';

const currentCandidateId = ref(null);
const hasSelectedCandidate = computed(() => Boolean(currentCandidateId.value));

const activeOpcion = ref('plan');

const setActiveOpcion = (opcion) => {
    activeOpcion.value = opcion;
};

const barOpcionesRef = ref(null);
const barBtnRefs = ref({
    plan: null,
    trayectoria: null,
    miembros: null,
});
const barIndicatorLeft = ref(0);
const barIndicatorWidth = ref(0);

const setBarBtnRef = (key, el) => {
    if (!el) return;
    barBtnRefs.value[key] = el;
};

const updateBarIndicator = async () => {
    await nextTick();
    const wrap = barOpcionesRef.value;
    const btn = barBtnRefs.value?.[activeOpcion.value];
    if (!wrap || !btn) return;

    const wrapRect = wrap.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    barIndicatorLeft.value = btnRect.left - wrapRect.left;
    barIndicatorWidth.value = btnRect.width;
};

const barIndicatorStyle = computed(() => {
    const width = barIndicatorWidth.value;
    return {
        transform: `translateX(${barIndicatorLeft.value}px)`,
        width: `${width}px`,
        opacity: width > 0 ? 1 : 0,
    };
});

let barResizeObserver;
const onWindowResize = () => updateBarIndicator();

onMounted(() => {
    try {
        currentCandidateId.value = window.localStorage.getItem(STORAGE_SELECTED_CANDIDATE_ID);
    } catch {
        currentCandidateId.value = null;
    }

    updateBarIndicator();
    window.addEventListener('resize', onWindowResize);
    if ('ResizeObserver' in window) {
        barResizeObserver = new ResizeObserver(() => updateBarIndicator());
        if (barOpcionesRef.value) barResizeObserver.observe(barOpcionesRef.value);
    }
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', onWindowResize);
    if (barResizeObserver) barResizeObserver.disconnect();
});

watch(activeOpcion, () => updateBarIndicator());
watch(hasSelectedCandidate, (selected) => {
    if (!selected) return;
    updateBarIndicator();
});

const noticiaPrincipal = computed(() => ({
    imgSrc: noticia2Src,
    imgAlt: 'Noticia principal',
    url: 'https://larepublica.pe/politica/2026/04/03/encuesta-presidencial-iep-keiko-fujimori-esta-estancada-mientras-que-rafael-lopez-aliaga-carlos-alvarez-y-roberto-sanchez-empatados-hnews-140412',
    title: 'Keiko se estanca, mientras que López Aliaga, Carlos Álvarez y Roberto Sánchez empatan en encuesta IEP',
    body: 'A una semana de las elecciones, el representante del Partido País para Todos se ubica en el tercer lugar con 6.9%, mientras que el de Juntos por el Perú se posiciona con 6.7%.',
}));

const noticiasSecundarias = computed(() => [
    {
        id: 'n1',
        imgSrc: noticia1Src,
        imgAlt: 'Noticia 1',
        url: 'https://elcomercio.pe/politica/elecciones/elecciones-2026-candidatos-a-la-presidencia-despliegan-giras-intensivas-en-regiones-donde-estuvieron-y-hacia-donde-se-dirigen-noticia/',
        title: 'Candidatos a la presidencia despliegan giras intensivas en regiones: ¿Dónde estuvieron y hacia dónde se dirigen?',
    },
    {
        id: 'n2',
        imgSrc: noticia3Src,
        imgAlt: 'Noticia 2',
        url: 'https://www.bloomberglinea.com/latinoamerica/peru/este-es-el-valor-de-la-multa-por-no-votar-en-las-elecciones-de-peru-en-2026/',
        title: 'Este es el valor de la multa por no votar en las elecciones de Perú en 2026',
    },
    {
        id: 'n3',
        imgSrc: noticia4Src,
        imgAlt: 'Noticia 3',
        url: 'https://elcomercio.pe/respuestas/tramites/link-onpe-para-elecciones-generales-2026-consula-tu-local-de-votacion-para-este-domingo-12-de-abril-tdpe-noticia/',
        title: '¿Dónde vas a votar este 12 de abril? Consulta tu local y mesa con tu DNI vía web de la ONPE',
    },
]);
</script>

<template>
    <div class="noticias-page">
        <div class="noticias-columns">
            <div class="noticias-col noticias-col--main">

                <div v-if="hasSelectedCandidate" class="bar-opciones" ref="barOpcionesRef">
                    <button :ref="(el) => setBarBtnRef('plan', el)" type="button" class="bar-opcion"
                        :class="{ 'is-active': activeOpcion === 'plan' }" @click="setActiveOpcion('plan')">
                        Esta semana
                    </button>
                    <button :ref="(el) => setBarBtnRef('trayectoria', el)" type="button" class="bar-opcion"
                        :class="{ 'is-active': activeOpcion === 'trayectoria' }"
                        @click="setActiveOpcion('trayectoria')">
                        Último mes
                    </button>
                    <button :ref="(el) => setBarBtnRef('miembros', el)" type="button" class="bar-opcion"
                        :class="{ 'is-active': activeOpcion === 'miembros' }" @click="setActiveOpcion('miembros')">
                        Personalizado
                    </button>

                    <span class="bar-indicator" :style="barIndicatorStyle" aria-hidden="true"></span>
                </div>

                <div class="noticia-principal">
                    <a class="noticia-principal-link" :href="noticiaPrincipal.url" target="_blank"
                        rel="noopener noreferrer" aria-label="Abrir noticia principal">
                        <img class="noticia-principal-img" :src="noticiaPrincipal.imgSrc"
                            :alt="noticiaPrincipal.imgAlt" />
                    </a>
                    <div class="noticia-principal-body">
                        <h2 class="noticia-principal-title">{{ noticiaPrincipal.title }}</h2>
                        <p class="noticia-principal-text">{{ noticiaPrincipal.body }}</p>
                    </div>
                </div>

                <div class="noticias-divider" aria-hidden="true"></div>

                <div class="noticias-secundarias">
                    <component :is="item.url ? 'a' : 'div'" v-for="item in noticiasSecundarias" :key="item.id"
                        class="noticia-card" :class="{ 'is-link': Boolean(item.url) }" :href="item.url || undefined"
                        :target="item.url ? '_blank' : undefined" :rel="item.url ? 'noopener noreferrer' : undefined">
                        <img class="noticia-card-img" :src="item.imgSrc" :alt="item.imgAlt" />
                        <h4 class="noticia-card-title">{{ item.title }}</h4>
                    </component>
                </div>
            </div>

            <div class="noticias-col noticias-col--aside">
                <div class="otras-noticias">
                    <h4 class="otras-noticias-title">Lo último</h4>

                    <div class="otras-noticias-item">
                        <h5 class="otras-noticias-time">14:00</h5>
                        <a class="otras-noticias-headline otras-noticias-link" target="_blank" rel="noopener noreferrer"
                            href="https://elcomercio.pe/politica/elecciones/elecciones-2026-candidatos-a-la-presidencia-despliegan-giras-intensivas-en-regiones-donde-estuvieron-y-hacia-donde-se-dirigen-noticia/">
                            Candidatos a la presidencia despliegan giras intensivas en regiones: ¿Dónde estuvieron y
                            hacia dónde se dirigen?
                        </a>
                    </div>

                    <div class="otras-noticias-divider" aria-hidden="true"></div>

                    <div class="otras-noticias-item">
                        <h5 class="otras-noticias-time">15:00</h5>
                        <a class="otras-noticias-headline otras-noticias-link" target="_blank" rel="noopener noreferrer"
                            href="https://www.bloomberglinea.com/latinoamerica/peru/este-es-el-valor-de-la-multa-por-no-votar-en-las-elecciones-de-peru-en-2026/">
                            Este es el valor de la multa por no votar en las elecciones de Perú en 2026
                        </a>
                    </div>
                </div>
            </div>
        </div>

    </div>
</template>


<style scoped>
.noticias-page {
    width: 100%;
    padding-top: 0px;
    padding-bottom: 30px;
    padding-left: 135px;
    padding-right: 135px;
    box-sizing: border-box;
}

.noticias-columns {
    display: flex;
    gap: 43px;
    align-items: flex-start;
    --noticias-columns-top: 28px;
}

.noticias-col {
    min-width: 0;
}

.noticias-col--main {
    flex: 3;
    padding-right: 43px;
    position: relative;
}

.noticias-col--main::after {
    content: '';
    position: absolute;
    top: var(--noticias-columns-top);
    right: 0;
    bottom: 0;
    width: 1px;
    background: rgba(255, 255, 255, 0.5);
}

.noticias-col--aside {
    flex: 1;
    padding-left: 0;
}

.otras-noticias {
    margin-top: 28px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.otras-noticias-title {
    margin: 0;
    color: var(--primary-white);
    font-weight: 900;
    text-align: left;
    font-size: 22px;
    line-height: 1.2;
}

.otras-noticias-item {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.otras-noticias-time,
.otras-noticias-headline {
    margin: 0;
    color: var(--primary-white);
    text-align: left;
    line-height: 1.35;
}

.otras-noticias-time {
    font-weight: 400;
    opacity: 0.60;
}

.otras-noticias-headline {
    font-weight: 900;
}

.otras-noticias-link {
    text-decoration: none;
    color: inherit;
    display: block;
}

.otras-noticias-link:focus-visible {
    outline: 2px solid var(--primary-yellow);
    outline-offset: 4px;
    border-radius: 8px;
}

.otras-noticias-divider {
    height: 1.5px;
    width: 100%;
    background: rgba(245, 245, 245, 0.5);
}

.bar-opciones {
    margin-top: 28px;
    display: flex;
    align-items: flex-end;
    gap: 28px;
    position: relative;
    padding-bottom: 14px;
}

.bar-opciones::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1.5px;
    background: #2D3436;
    z-index: 0;
}

.bar-opcion {
    position: relative;
    padding: 0;
    margin: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    font: inherit;
    font-size: 24.19px;
    font-weight: 700;
    color: var(--primary-white);
    opacity: 0.5;
    transition: opacity 0.16s ease;
    z-index: 2;
}

.bar-opcion.is-active {
    opacity: 1;
}

.bar-indicator {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 3px;
    background: var(--primary-yellow);
    border-radius: 999px;
    transition: transform 0.18s ease, width 0.18s ease;
    will-change: transform, width;
    z-index: 1;
    pointer-events: none;
}

.noticia-principal {
    margin-top: 40px;
    display: flex;
    gap: 22px;
    align-items: stretch;
}

.noticia-principal-link {
    width: 46%;
    min-width: 0;
    flex: 0 0 auto;
    display: block;
    border-radius: 18px;
    overflow: hidden;
    line-height: 0;
    text-decoration: none;
}

.noticia-principal-link:focus-visible {
    outline: 2px solid var(--primary-yellow);
    outline-offset: 4px;
}

.noticia-principal-img {
    width: 100%;
    min-width: 0;
    object-fit: cover;
    display: block;
}

.noticia-principal-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 12px;
}

.noticia-principal-title {
    margin: 0;
    color: var(--primary-white);
    font-size: 28px;
    font-weight: 900;
    line-height: 1.2;
}

.noticia-principal-text {
    margin: 0;
    color: var(--primary-white);
    opacity: 0.85;
    font-size: 18px;
    line-height: 1.6;
}

.noticias-divider {
    margin-top: 40px;
    margin-bottom: 40px;
    height: 1.5px;
    width: 100%;
    background: rgba(245, 245, 245, 0.5);
}

.noticias-secundarias {
    margin-top: 26px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 22px;
}

.noticia-card {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    text-decoration: none;
    color: inherit;
}

.noticia-card.is-link {
    cursor: pointer;
}

.noticia-card.is-link:focus-visible {
    outline: 2px solid var(--primary-yellow);
    outline-offset: 4px;
    border-radius: 16px;
}

.noticia-card-img {
    width: 100%;
    aspect-ratio: 16 / 10;
    border-radius: 16px;
    object-fit: cover;
    display: block;
}

.noticia-card-title {
    margin: 0;
    color: var(--primary-white);
    font-size: 18px;
    line-height: 1.35;
    font-weight: 900;
}

@media (max-width: 1024px) {
    .noticias-page {
        padding-left: 40px;
        padding-right: 40px;
    }

    .noticias-columns {
        flex-direction: column;
        gap: 28px;
    }

    .noticias-col--main {
        padding-right: 0;
    }

    .noticias-col--main::after {
        content: none;
    }

    .noticia-principal {
        flex-direction: column;
    }

    .noticia-principal-link {
        width: 100%;
    }

    .noticia-principal-img {
        max-height: 360px;
    }

    .noticias-secundarias {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 600px) {
    .noticias-page {
        padding-left: 18px;
        padding-right: 18px;
    }

    .bar-opciones {
        gap: 18px;
    }

    .bar-opcion {
        font-size: 18px;
    }

    .noticia-principal-title {
        font-size: 22px;
    }

    .noticia-principal-text {
        font-size: 16px;
    }

    .noticias-secundarias {
        grid-template-columns: 1fr;
    }

    .noticia-card-title {
        font-size: 16px;
    }
}
</style>