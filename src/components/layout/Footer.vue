<script setup>
import { Icon } from '@iconify/vue';
</script>

<template>
    <footer class="site-footer">
        <div class="footer-top">
            <div class="footer-col">
                <h3 class="footer-title">Servicios</h3>
                <a class="footer-link" href="#/candidatos">Candidato/Partido</a>
                <a class="footer-link" href="#/noticias">Noticias</a>
                <a class="footer-link"
                    href="https://elcomercio.pe/politica/elecciones-peru-2026-simulador-voto-como-cedula-evitar-errores-practicar-presidente-senado-diputados-parlamento-andino-especdis-noticia/"
                    target="_blank" rel="noopener noreferrer">¿Como votar?</a>
            </div>

            <div class="footer-col">
                <h3 class="footer-title">Contacto</h3>
                <p class="footer-text">Correo: informame@gmail.com</p>
            </div>

            <div class="footer-col footer-col--social">
                <h3 class="footer-title">Redes Sociales</h3>
                <div class="footer-social">
                    <a class="social-btn" href="#" aria-label="Instagram" @click.prevent>
                        <span class="social-circle" aria-hidden="true">
                            <Icon icon="mdi:instagram" width="22.4" height="22.4" />
                        </span>
                    </a>
                    <a class="social-btn" href="#" aria-label="TikTok" @click.prevent>
                        <span class="social-circle" aria-hidden="true">
                            <Icon icon="simple-icons:tiktok" width="20.8" height="20.8" />
                        </span>
                    </a>
                </div>
            </div>

            <div class="footer-col">
                <h3 class="footer-title">Empresa</h3>
                <p class="footer-text">Acerca de</p>
                <p class="footer-text">Preguntas Frecuentes</p>
                <p class="footer-text">Trabaja con nosotros</p>
            </div>
        </div>

        <div class="footer-bottom">
            <p class="footer-small">Derechos Reservados Informame</p>
            <p class="footer-small">Términos y Condiciones</p>
        </div>
    </footer>
</template>

<style scoped>
.site-footer {
    background: var(--primary-yellow);
    color: var(--primary-black);
    height: 306.4px;
    display: flex;
    flex-direction: column;
}

.site-footer,
.site-footer * {
    font-family: Verdana, Geneva, Tahoma, sans-serif;
}

.footer-top {
    flex: 1 1 auto;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    align-items: start;
    column-gap: 34.4px;
    padding: 35.2px 8rem 0;
}

.footer-col {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
    align-items: flex-start;
    text-align: left;
    padding: 0;
}

.footer-col>.footer-title+* {
    margin-top: 30.4px;
}

.footer-col> :not(.footer-title)+ :not(.footer-title) {
    margin-top: 21.6px;
}

.footer-title {
    margin: 0;
    font-weight: 700;
    color: var(--primary-black);
    font-size: 19.36px;
    line-height: 1.2;
}

.footer-link {
    color: var(--primary-black);
    text-decoration: none;
    font-size: 16.16px;
    font-weight: 400;
    line-height: 1.25;
}

.footer-link:hover {
    text-decoration: underline;
    text-decoration-thickness: 1.6px;
    text-underline-offset: 2.4px;
}

.footer-text {
    margin: 0;
    color: var(--primary-black);
    font-size: 16.16px;
    font-weight: 400;
    line-height: 1.25;
}

.footer-social {
    display: flex;
    align-items: center;
    gap: 1.12rem;
    padding-top: 0;
    justify-content: flex-start;
}

.social-btn {
    display: inline-flex;
    text-decoration: none;
}

.social-circle {
    width: 46.4px;
    height: 46.4px;
    border-radius: 999px;
    background: var(--primary-black);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--primary-yellow);
}

.footer-bottom {
    flex: 0 0 auto;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: 2rem 49.6px 1.76rem;
}

.footer-small {
    margin: 0;
    color: var(--primary-black);
    font-size: 11.2px;
    font-weight: 400;
    line-height: 1.25;
}

@media (max-width: 64em) {

    .site-footer {
        height: auto;
    }

    .footer-top,
    .footer-bottom {
        padding-left: 3rem;
        padding-right: 3rem;
    }

    .footer-top {
        column-gap: 19.2px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        row-gap: 2.2rem;
        padding-top: 2.5rem;
        padding-bottom: 1.6rem;
    }

    .footer-bottom {
        flex-wrap: wrap;
        row-gap: 0.8rem;
        padding-top: 1.2rem;
        padding-bottom: 1.2rem;
        align-items: flex-start;
    }
}

@media (max-width: 43.75em) {
    .site-footer {
        height: auto;
    }

    .footer-top {
        grid-template-columns: 1fr;
        row-gap: 1.92rem;
        padding: 2.4rem 0.8rem 1.6rem;
    }

    .footer-col {
        align-items: flex-start;
        text-align: left;
        padding: 0;
    }

    .footer-col>.footer-title+* {
        margin-top: 16px;
    }

    .footer-col> :not(.footer-title)+ :not(.footer-title) {
        margin-top: 12px;
    }

    .footer-bottom {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.72rem;
        padding: 1.28rem 0.8rem 1.12rem;
    }
}
</style>
