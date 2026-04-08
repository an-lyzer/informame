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
                <a class="footer-link" href="#/estadisticas">Estadísticas</a>
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
                            <Icon icon="mdi:instagram" width="28" height="28" />
                        </span>
                    </a>
                    <a class="social-btn" href="#" aria-label="TikTok" @click.prevent>
                        <span class="social-circle" aria-hidden="true">
                            <Icon icon="simple-icons:tiktok" width="26" height="26" />
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
    height: 383px;
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
    column-gap: 43px;
    padding: 44px 10rem 0;
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
    margin-top: 38px;
}

.footer-col> :not(.footer-title)+ :not(.footer-title) {
    margin-top: 27px;
}

.footer-title {
    margin: 0;
    font-weight: 700;
    color: var(--primary-black);
    font-size: 24.2px;
    line-height: 1.2;
}

.footer-link {
    color: var(--primary-black);
    text-decoration: none;
    font-size: 20.2px;
    font-weight: 400;
    line-height: 1.25;
}

.footer-link:hover {
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 3px;
}

.footer-text {
    margin: 0;
    color: var(--primary-black);
    font-size: 20.2px;
    font-weight: 400;
    line-height: 1.25;
}

.footer-social {
    display: flex;
    align-items: center;
    gap: 1.4rem;
    padding-top: 0;
    justify-content: flex-start;
}

.social-btn {
    display: inline-flex;
    text-decoration: none;
}

.social-circle {
    width: 58px;
    height: 58px;
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
    padding: 2.5rem 62px 2.2rem;
}

.footer-small {
    margin: 0;
    color: var(--primary-black);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.25;
}

@media (max-width: 64em) {

    .site-footer {
        height: auto;
    }

    .footer-top,
    .footer-bottom {
        padding-left: 3.75rem;
        padding-right: 3.75rem;
    }

    .footer-top {
        column-gap: 24px;
    }
}

@media (max-width: 43.75em) {
    .site-footer {
        height: auto;
    }

    .footer-top {
        grid-template-columns: 1fr;
        row-gap: 2.4rem;
        padding: 3rem 1rem 2rem;
    }

    .footer-col {
        align-items: flex-start;
        text-align: left;
        padding: 0;
    }

    .footer-bottom {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.9rem;
        padding: 1.6rem 1rem 1.4rem;
    }
}
</style>
