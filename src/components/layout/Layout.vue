<script setup>
import { ref } from 'vue';
import Footer from './Footer.vue';
const menuOpen = ref(false);
</script>

<template>
    <div class="layout">
        <header class="header">
            <div class="logo">
                <a href="#/" class="logo-link" @click="menuOpen = false">
                    <h1>
                        Informa.me <span class="check">✔</span>
                    </h1>
                </a>
            </div>
            <nav class="paginas">
                <a href="#/candidatos">Candidatos/Partidos</a>
                <a href="#/noticias">Noticias</a>
                <a href="#/estadisticas">Estadísticas</a>
            </nav>
            <div class="menu-hamburguesa" @click="menuOpen = !menuOpen">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <div v-if="menuOpen" class="menu-overlay" @click="menuOpen = false"></div>
            <nav v-if="menuOpen" class="menu-movil" @click.stop>
                <a href="#/candidatos" @click="menuOpen = false">Candidatos/Partidos</a>
                <a href="#/noticias" @click="menuOpen = false">Noticias</a>
                <a href="#/estadisticas" @click="menuOpen = false">Estadísticas</a>
            </nav>
        </header>

        <main class="layout-main">
            <slot />
        </main>

        <Footer />
    </div>
</template>


<style scoped>
/* Header layout */
.layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

.layout-main {
    flex: 1 1 auto;
}

.header {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10rem;
    background: var(--primary-yellow);
    height: 6.25rem;
    min-height: 6.25rem;
    box-sizing: border-box;
}

.logo {
    flex-shrink: 0;
}

.logo-link {
    display: inline-flex;
    align-items: center;
    text-decoration: none;
    cursor: pointer;
}

.logo h1 {
    color: var(--primary-black);
    margin: 0;
    font-family: 'Times New Roman';
    font-style: italic;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.check {
    font-size: 3.2rem;
    color: var(--primary-black);
    margin-top: 0.25rem;
    display: inline-block;
    vertical-align: middle;
}

.paginas {
    display: flex;
    align-items: center;
    gap: 3.125rem;
    padding: 0 4.4375rem;
    justify-content: center;
}

.paginas a {
    position: relative;
    font-weight: bold;
    text-decoration: none;
}

.paginas a:hover {
    text-decoration: underline;
    text-decoration-color: var(--primary-black);
    text-decoration-thickness: 2px;
    text-underline-offset: 3px;
}

.paginas a:not(:last-child)::after {
    content: '';
    display: block;
    position: absolute;
    right: -1.5625rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1.5px;
    height: 1.375rem;
    background: var(--primary-black);
    opacity: 0.7;
}

/* Menú hamburguesa (solo móvil) */
.menu-hamburguesa {
    display: none;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 2.5rem;
    height: 2.5rem;
    cursor: pointer;
    background: transparent;
    border: 0;
    padding: 0;
    z-index: 10000;
}

.menu-hamburguesa span {
    display: block;
    width: 1.75rem;
    height: 0.25rem;
    background: var(--primary-black);
    margin: 0.25rem 0;
    border-radius: 0.125rem;
}

.menu-movil {
    position: fixed;
    top: 0;
    right: 0;
    width: 70vw;
    max-width: 20rem;
    height: 100vh;
    background: var(--primary-yellow);
    border-radius: 0 0 0 1rem;
    box-shadow: -0.125rem 0 1rem rgba(0, 0, 0, 0.10);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 5rem 2rem 2rem 2rem;
    z-index: 9999;
    align-items: flex-end;
}

.menu-overlay {
    position: fixed;
    inset: 0;
    background: transparent;
    z-index: 9998;
}

.menu-movil a {
    color: var(--primary-black);
    font-size: 1.3rem;
    font-weight: bold;
    text-decoration: none;
    padding: 0.75rem 0;
    width: 100%;
    text-align: right;
    border-bottom: 1.5px solid var(--primary-dark);
}

.menu-movil a:last-child {
    border-bottom: none;
}

/* Responsive */
@media (max-width: 64em) {
    .header {
        padding: 0 3.75rem;
        height: 5rem;
        min-height: 5rem;
    }

    .paginas {
        gap: 1.25rem;
        padding: 0;
    }

    .paginas a:not(:last-child)::after {
        right: -0.625rem;
        height: 1.125rem;
    }

    .logo h1 {
        font-size: 2.2rem;
    }
}

@media (max-width: 43.75em) {
    .header {
        padding: 0.75rem 1rem;
        height: 5rem;
        min-height: 5rem;
    }

    .paginas {
        display: none;
    }

    .menu-hamburguesa {
        display: flex;
        position: absolute;
        right: 1rem;
        top: 50%;
        transform: translateY(-50%);
    }

    .logo h1 {
        font-size: 1.2rem;
        padding-left: 1.1rem;
    }
}

@media (min-width: 43.8125em) {
    .menu-movil {
        display: none;
    }

    .menu-overlay {
        display: none;
    }
}
</style>