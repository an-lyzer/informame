<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Icon } from "@iconify/vue";
import Logo_Cooperacion_Popular_Peru from '../../assets/logos/Logo_Cooperacion_Popular_Peru.png';
import Logo_Fuerza_Popular from '../../assets/logos/Fuerza_popular.svg';
import lescanoImgSrc from '../../assets/imagenes candidato/Lescano/lescano.jpg';
import keikoImgSrc from '../../assets/imagenes candidato/Keiko/keiko.jpeg';
import vice1ImgSrc from '../../assets/imagenes candidato/Lescano/1era_vice.jpg';
import vice2ImgSrc from '../../assets/imagenes candidato/Lescano/2da_vice.jpg';
import candidatosData from '../../data/candidatos.json';
import denunciasPartidosData from '../../data/denuncias_partidos.json';
import investigacionesCandidatoData from '../../data/investigaciones_candidato.json';

const CANDIDATE_PHOTO_MODULES = import.meta.glob('../../assets/imagenes candidato/**/*.{png,jpg,jpeg,webp}', {
    eager: true,
    import: 'default',
});

const LOGO_MODULES = import.meta.glob('../../assets/logos/*.{png,jpg,jpeg,svg}', {
    eager: true,
    import: 'default',
});

const AVAILABLE_LOGOS = Object.entries(LOGO_MODULES).map(([path, src]) => {
    const filename = path.split('/').pop() ?? '';
    const base = filename.replace(/\.[^.]+$/, '');
    return { path, src, base };
});

const LOGO_STOP_WORDS = new Set([
    'logo',
    'partido',
    'politico',
    'politica',
    'nacional',
    'del',
    'de',
    'la',
    'el',
    'los',
    'las',
    'por',
    'para',
    'y',
    'peru',
]);

const normalizeKey = (value) =>
    (value ?? '')
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[^a-zA-Z0-9\s_-]/g, ' ')
        .toLocaleLowerCase('es');

const normalizePartyForDenuncias = (value) =>
    normalizeKey(value)
        .replace(/\bpartido\b/g, ' ')
        .replace(/\bpolitico\b/g, ' ')
        .replace(/\bpolitica\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const normalizeCandidateName = (value) =>
    normalizeKey(value)
        .replace(/\s+/g, ' ')
        .trim();

const DENUNCIAS_PARTIDOS = Array.isArray(denunciasPartidosData?.partidos) ? denunciasPartidosData.partidos : [];

const INVESTIGACIONES_CANDIDATO = Array.isArray(investigacionesCandidatoData?.investigaciones)
    ? investigacionesCandidatoData.investigaciones
    : [];

const CANDIDATE_NAME_STOP_WORDS = new Set(['de', 'del', 'la', 'las', 'los', 'y']);

const tokenizeCandidateName = (value) => {
    const normalized = normalizeCandidateName(value);
    return normalized
        .split(/[\s_-]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .filter((t) => !CANDIDATE_NAME_STOP_WORDS.has(t));
};

const findInvestigacionesByCandidate = ({ partido, candidato } = {}) => {
    const candidatoKey = normalizeCandidateName(candidato);
    if (!candidatoKey) return 0;

    const partidoKey = normalizePartyForDenuncias(partido);

    // 1) Match exacto por (partido + candidato)
    for (const row of INVESTIGACIONES_CANDIDATO) {
        const rowCandidatoKey = normalizeCandidateName(row?.candidato);
        if (!rowCandidatoKey || rowCandidatoKey !== candidatoKey) continue;
        const rowPartidoKey = normalizePartyForDenuncias(row?.partido);
        if (partidoKey && rowPartidoKey && rowPartidoKey === partidoKey) {
            return Number(row?.investigaciones ?? 0) || 0;
        }
    }

    // 2) Match exacto por candidato (sin partido)
    for (const row of INVESTIGACIONES_CANDIDATO) {
        const rowCandidatoKey = normalizeCandidateName(row?.candidato);
        if (rowCandidatoKey && rowCandidatoKey === candidatoKey) {
            return Number(row?.investigaciones ?? 0) || 0;
        }
    }

    // 3) Fallback por parecido (tokens)
    const candTokens = tokenizeCandidateName(candidato);
    if (!candTokens.length) return 0;
    const candSet = new Set(candTokens);

    let best = null;
    let bestScore = 0;

    for (const row of INVESTIGACIONES_CANDIDATO) {
        const rowCandidato = row?.candidato;
        if (!rowCandidato) continue;

        const rowTokens = tokenizeCandidateName(rowCandidato);
        if (!rowTokens.length) continue;
        const rowSet = new Set(rowTokens);

        let intersection = 0;
        for (const t of candSet) if (rowSet.has(t)) intersection += 1;
        const union = candSet.size + rowSet.size - intersection;
        const jaccard = union ? intersection / union : 0;

        let score = jaccard;

        const rowPartidoKey = normalizePartyForDenuncias(row?.partido);
        if (partidoKey && rowPartidoKey && rowPartidoKey === partidoKey) score += 0.25;

        if (score > bestScore) {
            bestScore = score;
            best = row;
        }
    }

    if (best && bestScore >= 0.6) {
        return Number(best?.investigaciones ?? 0) || 0;
    }

    return 0;
};

const findDenunciasByParty = (party) => {
    const partyKey = normalizePartyForDenuncias(party);
    if (!partyKey) return null;

    let direct = null;
    for (const row of DENUNCIAS_PARTIDOS) {
        const rowKey = normalizePartyForDenuncias(row?.partido);
        if (!rowKey) continue;
        if (rowKey === partyKey) {
            direct = row;
            break;
        }
    }
    if (direct) return direct;

    // Fallback por parecido (tokens + inclusion)
    const partyTokens = tokenize(party);
    if (!partyTokens.length) return null;

    const partyTokenSet = new Set(partyTokens);
    const partyJoined = partyTokens.join('');

    let best = null;
    let bestScore = 0;

    for (const row of DENUNCIAS_PARTIDOS) {
        const rowName = row?.partido;
        if (!rowName) continue;

        const rowTokens = tokenize(rowName);
        if (!rowTokens.length) continue;

        const rowTokenSet = new Set(rowTokens);

        let intersection = 0;
        for (const t of partyTokenSet) if (rowTokenSet.has(t)) intersection += 1;
        const union = partyTokenSet.size + rowTokenSet.size - intersection;
        const jaccard = union ? intersection / union : 0;

        let score = jaccard;

        const rowJoined = rowTokens.join('');
        if (rowJoined && partyJoined) {
            if (rowJoined.includes(partyJoined) || partyJoined.includes(rowJoined)) score += 0.35;
        }

        if (score > bestScore) {
            bestScore = score;
            best = row;
        }
    }

    return bestScore >= 0.4 ? best : null;
};

const needsPartyLogoWhiteBg = (party) => {
    const normalized = normalizeKey(party);
    return normalized.includes('renovacion') && normalized.includes('popular');
};

const FORCE_LIBERTY_LOGO_SRC = AVAILABLE_LOGOS.find((logo) => {
    const normalized = normalizeKey(logo.base);
    return normalized.includes('fuerza') && normalized.includes('libertad');
})?.src ?? null;

const RENOVACION_POPULAR_LOGO_SRC = AVAILABLE_LOGOS.find((logo) => {
    const normalized = normalizeKey(logo.base);
    return normalized.includes('renovacion') && normalized.includes('popular');
})?.src ?? null;

const LIBERTAD_POPULAR_LOGO_SRC = AVAILABLE_LOGOS.find((logo) => {
    const normalized = normalizeKey(logo.base);
    return normalized.includes('libertad') && (normalized.includes('popular') || normalized.includes('popoular'));
})?.src ?? null;

const PARTY_LOGO_OVERRIDES = new Map([
    ['fuerza y libertad', FORCE_LIBERTY_LOGO_SRC],
    ['renovacion popular', RENOVACION_POPULAR_LOGO_SRC],
    ['libertad popular', LIBERTAD_POPULAR_LOGO_SRC],
]);

const tokenize = (value) => {
    const normalized = normalizeKey(value);
    return normalized
        .split(/[\s_-]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .filter((t) => !LOGO_STOP_WORDS.has(t));
};

const PARTY_TOKEN_ALIASES = {
    aprista: ['apra'],
    apra: ['aprista'],
};

const expandPartyTokens = (tokens) => {
    const expanded = new Set(tokens);
    for (const token of tokens) {
        const aliases = PARTY_TOKEN_ALIASES[token];
        if (!aliases) continue;
        for (const alias of aliases) expanded.add(alias);
    }
    return [...expanded];
};

const levenshteinDistance = (a, b) => {
    const left = (a ?? '').toString();
    const right = (b ?? '').toString();
    if (left === right) return 0;
    const leftLen = left.length;
    const rightLen = right.length;
    if (!leftLen) return rightLen;
    if (!rightLen) return leftLen;

    const prev = new Array(rightLen + 1);
    const curr = new Array(rightLen + 1);

    for (let j = 0; j <= rightLen; j += 1) prev[j] = j;

    for (let i = 1; i <= leftLen; i += 1) {
        curr[0] = i;
        const leftChar = left[i - 1];
        for (let j = 1; j <= rightLen; j += 1) {
            const cost = leftChar === right[j - 1] ? 0 : 1;
            curr[j] = Math.min(
                prev[j] + 1,
                curr[j - 1] + 1,
                prev[j - 1] + cost,
            );
        }

        for (let j = 0; j <= rightLen; j += 1) prev[j] = curr[j];
    }

    return prev[rightLen];
};

const CANDIDATE_PHOTO_BAD_TOKENS = [
    'vice',
    'vicepresidente',
    'vicepresidenta',
    '1era',
    '2da',
    '1er',
    '2do',
    '1ervice',
    '2dovice',
];

const AVAILABLE_CANDIDATE_PHOTOS = Object.entries(CANDIDATE_PHOTO_MODULES)
    .map(([path, src]) => {
        const filename = path.split('/').pop() ?? '';
        const base = filename.replace(/\.[^.]+$/, '');

        const parts = path.split('/');
        const folder = parts.length >= 2 ? (parts[parts.length - 2] ?? '') : '';

        const baseTokens = tokenize(base);
        const folderTokens = tokenize(folder);
        return {
            path,
            src,
            filename,
            base,
            folder,
            baseTokens,
            folderTokens,
            tokens: [...folderTokens, ...baseTokens],
            normalizedBase: normalizeKey(base),
        };
    })
    .filter((item) => item.src);

const candidatePhotoCache = new Map();
const getCandidatePhotoSrc = (candidateItem) => {
    const id = (candidateItem?.id ?? '').toString().trim();
    if (!id) return null;
    if (candidatePhotoCache.has(id)) return candidatePhotoCache.get(id);

    const candidateName = (candidateItem?.candidate ?? '').toString();
    const candidateTokens = [...new Set([...tokenize(id), ...tokenize(candidateName)])];
    const candidateTokenSet = new Set(candidateTokens);
    const candidateJoined = candidateTokens.join('');

    const tokenMatchScore = (photoToken) => {
        if (candidateTokenSet.has(photoToken)) return 1;
        for (const candidateToken of candidateTokens) {
            if (photoToken.length < 5 || candidateToken.length < 5) continue;
            const distance = levenshteinDistance(photoToken, candidateToken);
            if (distance === 1) return 0.65;
            if (distance === 2) return 0.35;
        }
        return 0;
    };

    let bestScore = 0;
    let bestSrc = null;

    for (const photo of AVAILABLE_CANDIDATE_PHOTOS) {
        const badToken = CANDIDATE_PHOTO_BAD_TOKENS.some((token) => photo.normalizedBase.includes(token));
        if (badToken) continue;

        let score = 0;

        for (const token of photo.baseTokens) {
            const match = tokenMatchScore(token);
            if (match) score += 3 * match;
        }

        for (const token of photo.folderTokens) {
            const match = tokenMatchScore(token);
            if (match) score += 1 * match;
        }

        const photoJoined = photo.tokens.join('');
        if (photoJoined && candidateJoined) {
            if (photoJoined.includes(candidateJoined) || candidateJoined.includes(photoJoined)) score += 2;
        }

        if (score > bestScore) {
            bestScore = score;
            bestSrc = photo.src;
        }
    }

    const resolved = bestScore > 1 ? bestSrc : null;
    candidatePhotoCache.set(id, resolved);
    return resolved;
};

const partyLogoCache = new Map();
const getPartyLogoSrc = (party) => {
    const key = normalizeKey(party).trim();
    if (!key) return null;

    if (PARTY_LOGO_OVERRIDES.has(key)) {
        const override = PARTY_LOGO_OVERRIDES.get(key) ?? null;
        partyLogoCache.set(key, override);
        return override;
    }
    if (partyLogoCache.has(key)) return partyLogoCache.get(key);

    const partyTokens = expandPartyTokens(tokenize(party));
    if (!partyTokens.length) {
        partyLogoCache.set(key, null);
        return null;
    }

    const partyTokenSet = new Set(partyTokens);
    const partyJoined = partyTokens.join('');

    let bestScore = 0;
    let bestSrc = null;

    for (const logo of AVAILABLE_LOGOS) {
        const logoTokens = tokenize(logo.base);
        if (!logoTokens.length) continue;

        let score = 0;
        for (const token of logoTokens) {
            if (partyTokenSet.has(token)) score += 1;
        }

        const logoJoined = logoTokens.join('');
        if (logoJoined && partyJoined) {
            if (logoJoined.includes(partyJoined) || partyJoined.includes(logoJoined)) score += 2;
        }

        if (score > bestScore) {
            bestScore = score;
            bestSrc = logo.src;
        }
    }

    const resolved = bestScore > 0 ? bestSrc : null;
    partyLogoCache.set(key, resolved);
    return resolved;
};

const STORAGE_SELECTED_CANDIDATE_ID = 'watchit:selectedCandidateId';
const STORAGE_PENDING_CANDIDATE_ID = 'watchit:pendingCandidateId';
const searchInputRef = ref(null);
const searchQuery = ref('');
const isSearchFocused = ref(false);
const activeOpcion = ref('plan');

const logoPickerWrapRef = ref(null);
const logoPickerBtnRef = ref(null);
const isLogoPickerOpen = ref(false);

const planAmbito = ref('seguridad');
const planResumen = ref('simple');
const isPlanAmbitoOpen = ref(false);
const planAmbitoWrapRef = ref(null);

const PLAN_AMBITOS = [
    { key: 'seguridad', label: 'Seguridad' },
    { key: 'educacion', label: 'Educación' },
    { key: 'salud', label: 'Salud' },
    { key: 'mineria', label: 'Minería' },
    { key: 'economia', label: 'Economía e industrialización' },
    { key: 'institucional', label: 'Reforma institucional' },
    { key: 'territorial_ambiental', label: 'Ambiental' },
    { key: 'social', label: 'Social e inclusión' },
];

const planAmbitoLabel = computed(() => {
    return PLAN_AMBITOS.find((item) => item.key === planAmbito.value)?.label ?? 'Seguridad';
});


const currentCandidateId = ref(null);

const CANDIDATE_MEDIA_BY_ID = {
    'yonhy-lescano': {
        photoSrc: lescanoImgSrc,
        logoSrc: Logo_Cooperacion_Popular_Peru,
        logoCrop: false,
        hasMembers: true,
    },
    'keiko-fujimori': {
        photoSrc: keikoImgSrc,
        logoSrc: Logo_Fuerza_Popular,
        logoCrop: true,
        hasMembers: false,
    },
};

const currentCandidateData = computed(() => {
    return candidatosData.find((item) => item.id === currentCandidateId.value) ?? null;
});

const currentDenunciasPartido = computed(() => {
    const party = currentCandidateData.value?.party;
    if (!party) return null;
    return findDenunciasByParty(party);
});

const currentInvestigacionesCandidato = computed(() => {
    const candidato = currentCandidateData.value?.candidate;
    const partido = currentCandidateData.value?.party;
    if (!candidato) return 0;
    return findInvestigacionesByCandidate({ partido, candidato });
});

const hasSelectedCandidate = computed(() => Boolean(currentCandidateData.value));

const setCandidateId = (id) => {
    if (!id) return;
    const exists = candidatosData.some((item) => item.id === id);
    if (!exists) return;

    currentCandidateId.value = id;
    try {
        window.localStorage.setItem(STORAGE_SELECTED_CANDIDATE_ID, id);
    } catch {
        // ignore storage errors
    }
};

// Nota UX: Al entrar al apartado no se preselecciona ningún candidato.
// Mantener el guardado en localStorage por si se quiere usar después,
// pero no restaurar automáticamente.

const currentCandidateMedia = computed(() => {
    const hardcoded = CANDIDATE_MEDIA_BY_ID[currentCandidateId.value];
    if (hardcoded) return hardcoded;

    const party = currentCandidateData.value?.party ?? '';
    return {
        photoSrc: getCandidatePhotoSrc(currentCandidateData.value),
        logoSrc: getPartyLogoSrc(party),
        logoCrop: false,
        hasMembers: false,
    };
});

const logoBgColor = ref(null);
let logoBgColorRequestId = 0;

const rgbCss = (r, g, b) => `rgb(${r}, ${g}, ${b})`;

const extractImageCornerColor = (imgEl) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    const targetSize = 32;
    canvas.width = targetSize;
    canvas.height = targetSize;

    ctx.clearRect(0, 0, targetSize, targetSize);
    ctx.drawImage(imgEl, 0, 0, targetSize, targetSize);

    const data = ctx.getImageData(0, 0, targetSize, targetSize).data;
    const pixelAt = (x, y) => {
        const idx = (y * targetSize + x) * 4;
        return {
            r: data[idx] ?? 0,
            g: data[idx + 1] ?? 0,
            b: data[idx + 2] ?? 0,
            a: data[idx + 3] ?? 0,
        };
    };

    const samplePoints = [
        [1, 1],
        [targetSize - 2, 1],
        [1, targetSize - 2],
        [targetSize - 2, targetSize - 2],
        [3, 3],
        [targetSize - 4, 3],
        [3, targetSize - 4],
        [targetSize - 4, targetSize - 4],
    ];

    for (const [x, y] of samplePoints) {
        const { r, g, b, a } = pixelAt(x, y);
        if (a < 16) continue;
        return rgbCss(r, g, b);
    }

    return null;
};

const getLogoBackgroundColor = (src) => {
    if (!src) return Promise.resolve(null);
    if (typeof window === 'undefined') return Promise.resolve(null);

    return new Promise((resolve) => {
        const img = new Image();
        img.decoding = 'async';
        img.loading = 'eager';

        img.onload = () => {
            try {
                resolve(extractImageCornerColor(img));
            } catch {
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = src;
    });
};

watch(
    () => currentCandidateMedia.value?.logoSrc,
    async (src) => {
        const requestId = (logoBgColorRequestId += 1);
        logoBgColor.value = null;

        // Si se usa crop, respetar el background transparente del diseño.
        if (currentCandidateMedia.value?.logoCrop) return;

        // Renovación Popular: forzar fondo blanco para que el logo azul se vea.
        if (needsPartyLogoWhiteBg(currentCandidateData.value?.party)) return;

        const color = await getLogoBackgroundColor(src);
        if (requestId !== logoBgColorRequestId) return;
        logoBgColor.value = color;
    },
    { immediate: true },
);

const candidatoLogoWrapStyle = computed(() => {
    if (currentCandidateMedia.value?.logoCrop) return {};

    if (needsPartyLogoWhiteBg(currentCandidateData.value?.party)) {
        return { backgroundColor: 'var(--primary-white)' };
    }

    if (!logoBgColor.value) return {};
    return { backgroundColor: logoBgColor.value };
});

const logoPickerOptions = computed(() => {
    const list = Array.isArray(candidatosData) ? candidatosData : [];
    return list
        .map((item) => {
            const hardcoded = CANDIDATE_MEDIA_BY_ID[item.id];
            return {
                id: item.id,
                party: item.party,
                candidate: item.candidate,
                label: `${item.party} – ${item.candidate}`,
                logoSrc: hardcoded?.logoSrc ?? getPartyLogoSrc(item.party),
            };
        })
        .filter((x) => x.id && x.party && x.candidate);
});

const candidateInitials = computed(() => {
    const name = (currentCandidateData.value?.candidate ?? '').toString().trim();
    if (!name) return '';
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
});

const currentPropuestas = computed(() => {
    const propuestas = currentCandidateData.value?.propuestas;
    if (!propuestas) return [];

    if (planResumen.value === 'simple') {
        const simple = propuestas.simple;
        const lista = simple?.[planAmbito.value];
        return Array.isArray(lista) ? lista : [];
    }

    const detallado = propuestas.detallado;
    const lista = detallado?.[planAmbito.value];
    return Array.isArray(lista) ? lista : [];
});

const currentPropuestasDetalle = computed(() => {
    if (planResumen.value !== 'detalle') return [];
    return currentPropuestas.value.map((text) => {
        const normalized = (text ?? '').toString().trim();
        const idx = normalized.indexOf(':');
        if (idx === -1) {
            return { title: normalized, body: '' };
        }
        const title = normalized.slice(0, idx + 1).trim();
        const body = normalized.slice(idx + 1).trim();
        return { title, body };
    });
});

const currentTrayectoria = computed(() => {
    const trayectoria = currentCandidateData.value?.trayectoria;
    return Array.isArray(trayectoria) ? trayectoria : [];
});

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
        setCandidateId(suggestion.id);
    }
    isSearchFocused.value = false;
    nextTick(() => searchInputRef.value?.blur?.());
};

const toggleLogoPicker = () => {
    isLogoPickerOpen.value = !isLogoPickerOpen.value;
};

const closeLogoPicker = () => {
    isLogoPickerOpen.value = false;
};

const selectLogoOption = (option) => {
    if (!option?.id) return;
    setCandidateId(option.id);
    searchQuery.value = option.label;
    isSearchFocused.value = false;
    closeLogoPicker();
    nextTick(() => searchInputRef.value?.blur?.());
};

const onDocumentPointerDown = (event) => {
    if (!isLogoPickerOpen.value) return;
    const wrap = logoPickerWrapRef.value;
    const target = event.target;
    if (wrap && target && wrap.contains(target)) return;
    closeLogoPicker();
};

const onDocumentKeyDown = (event) => {
    if (!isLogoPickerOpen.value) return;
    if (event.key !== 'Escape') return;
    event.preventDefault();
    closeLogoPicker();
    nextTick(() => logoPickerBtnRef.value?.focus?.());
};

const clearSearch = () => {
    if (!searchQuery.value) return;
    searchQuery.value = '';
    nextTick(() => searchInputRef.value?.focus?.());
};

const consumePendingCandidateSelection = () => {
    let pendingId = null;
    try {
        pendingId = window.localStorage.getItem(STORAGE_PENDING_CANDIDATE_ID);
    } catch {
        pendingId = null;
    }

    if (!pendingId) return;

    try {
        window.localStorage.removeItem(STORAGE_PENDING_CANDIDATE_ID);
    } catch {
        // ignore storage errors
    }

    const id = pendingId.toString().trim();
    if (!id) return;

    const suggestion = SEARCH_SUGGESTIONS.find((item) => item.id === id);
    if (!suggestion) return;

    setCandidateId(id);
    searchQuery.value = suggestion.label;
    isSearchFocused.value = false;
};

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
    // Importante para responsive: si la barra es scrollable en X,
    // necesitamos sumar scrollLeft para obtener coordenadas en el contenido.
    barIndicatorLeft.value = btnRect.left - wrapRect.left + wrap.scrollLeft;
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
    consumePendingCandidateSelection();
    updateBarIndicator();
    window.addEventListener('resize', onWindowResize);
    if ('ResizeObserver' in window) {
        barResizeObserver = new ResizeObserver(() => updateBarIndicator());
        if (barOpcionesRef.value) barResizeObserver.observe(barOpcionesRef.value);
    }

    document.addEventListener('pointerdown', onDocumentPointerDown);
    document.addEventListener('keydown', onDocumentKeyDown);
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', onWindowResize);
    if (barResizeObserver) barResizeObserver.disconnect();

    document.removeEventListener('pointerdown', onDocumentPointerDown);
    document.removeEventListener('keydown', onDocumentKeyDown);
});

watch(activeOpcion, () => updateBarIndicator());

watch(hasSelectedCandidate, (selected) => {
    if (!selected) return;
    updateBarIndicator();
});

const togglePlanAmbito = () => {
    isPlanAmbitoOpen.value = !isPlanAmbitoOpen.value;
};

const selectPlanAmbito = (ambitoKey) => {
    planAmbito.value = ambitoKey;
    isPlanAmbitoOpen.value = false;
};

const setPlanResumen = (value) => {
    planResumen.value = value;
};

const onPlanAmbitoFocusOut = (event) => {
    const nextTarget = event.relatedTarget;
    if (!planAmbitoWrapRef.value) return;
    if (nextTarget && planAmbitoWrapRef.value.contains(nextTarget)) return;
    isPlanAmbitoOpen.value = false;
};
</script>

<template>
    <div class="candidatos-page">
        <div class="candidatos-columns">
            <div class="candidatos-col candidatos-col1 candidatos-col--search">
                <div class="search-row">
                    <div class="search-autocomplete">
                        <Icon class="search-icon" icon="lucide:search" width="28" height="28" aria-hidden="true" />
                        <button type="button" class="clear-icon-btn" aria-label="Limpiar búsqueda"
                            :disabled="!searchQuery" @pointerdown.prevent @click="clearSearch">
                            <Icon class="clear-icon" icon="lucide:x" width="28" height="28" aria-hidden="true" />
                        </button>
                        <input ref="searchInputRef" v-model="searchQuery" type="text" class="circular-search"
                            placeholder="Buscar candidato/partido politico" autocomplete="off" aria-autocomplete="list"
                            :aria-expanded="isSearchFocused && filteredSuggestions.length > 0"
                            aria-controls="search-suggestions" @focus="isSearchFocused = true"
                            @blur="isSearchFocused = false" />

                        <ul v-if="isSearchFocused && filteredSuggestions.length" id="search-suggestions"
                            class="search-suggestions" role="listbox" aria-label="Sugerencias">
                            <li v-for="item in filteredSuggestions" :key="item.label" class="search-suggestion-item"
                                role="option">
                                <button type="button" class="search-suggestion-btn"
                                    @mousedown.prevent="selectSuggestion(item)">
                                    {{ item.label }}
                                </button>
                            </li>
                        </ul>
                    </div>

                    <div class="logo-picker" ref="logoPickerWrapRef">
                        <button ref="logoPickerBtnRef" type="button" class="logo-picker-btn"
                            aria-label="Seleccionar partido" :aria-expanded="isLogoPickerOpen"
                            aria-controls="logo-picker-popover" aria-haspopup="dialog" @click="toggleLogoPicker">
                            <svg width="134" height="89" viewBox="0 0 134 89" fill="none"
                                xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <rect x="0.75" y="0.75" width="132.5" height="87.5" rx="22.25" fill="#2D3436"
                                    stroke="#F5F5F5" stroke-width="1.5" />
                                <path
                                    d="M27 14H69.6396C75.7146 14.0002 80.6396 18.925 80.6396 25V63.4893C80.6396 69.5642 75.7146 74.489 69.6396 74.4893H27C20.9249 74.4893 16 69.5644 16 63.4893V25C16 19.1148 20.6217 14.3094 26.4336 14.0146L27 14Z"
                                    stroke="#F5F5F5" stroke-width="2" />
                                <path d="M49.5312 13.5681V75.4895M81.6392 45.949H16.2116" stroke="#F5F5F5"
                                    stroke-width="2" />
                                <ellipse cx="106.5" cy="45.6593" rx="13.5" ry="12.6593" fill="#FFD900" />
                                <path d="M99.75 44.0769L106.5 49.6154L113.25 44.0769" stroke="black" stroke-width="2" />
                            </svg>
                        </button>

                        <div v-if="isLogoPickerOpen" id="logo-picker-popover" class="logo-picker-popover" role="dialog"
                            aria-label="Seleccionar partido">
                            <div class="logo-picker-grid" role="listbox" aria-label="Opciones">
                                <button v-for="option in logoPickerOptions" :key="option.id" type="button"
                                    class="logo-picker-item"
                                    :class="{ 'is-selected': option.id === currentCandidateId }"
                                    @click="selectLogoOption(option)">
                                    <img v-if="option.logoSrc" class="logo-picker-img" :src="option.logoSrc"
                                        :alt="option.party" loading="lazy" />
                                    <span v-else class="logo-picker-fallback" aria-hidden="true">{{
                                        option.party?.slice(0, 2)?.toUpperCase() ?? ''
                                        }}</span>
                                </button>
                            </div>
                        </div>
                    </div>


                </div>
                <div v-if="hasSelectedCandidate" class="bar-opciones" ref="barOpcionesRef">
                    <button :ref="(el) => setBarBtnRef('plan', el)" type="button" class="bar-opcion"
                        :class="{ 'is-active': activeOpcion === 'plan' }" @click="setActiveOpcion('plan')">
                        Plan de gobierno
                    </button>
                    <button :ref="(el) => setBarBtnRef('trayectoria', el)" type="button" class="bar-opcion"
                        :class="{ 'is-active': activeOpcion === 'trayectoria' }"
                        @click="setActiveOpcion('trayectoria')">
                        Trayectoria
                    </button>
                    <button :ref="(el) => setBarBtnRef('miembros', el)" type="button" class="bar-opcion"
                        :class="{ 'is-active': activeOpcion === 'miembros' }" @click="setActiveOpcion('miembros')">
                        Miembros
                    </button>

                    <span class="bar-indicator" :style="barIndicatorStyle" aria-hidden="true"></span>
                </div>
                <div v-if="hasSelectedCandidate" class="opcion-seccion" aria-live="polite">
                    <div v-if="activeOpcion === 'plan'">
                        <div class="plan-controls">
                            <div class="plan-control" ref="planAmbitoWrapRef" tabindex="-1"
                                @focusout="onPlanAmbitoFocusOut">
                                <h4 class="plan-label">Ámbito:</h4>
                                <div class="plan-dropdown">
                                    <button type="button" class="plan-btn plan-btn--ambito" @click="togglePlanAmbito"
                                        :aria-expanded="isPlanAmbitoOpen" aria-haspopup="listbox">
                                        <span class="plan-btn-text">{{ planAmbitoLabel }}</span>
                                        <svg class="plan-btn-icon" width="23" height="14" viewBox="0 0 23 14"
                                            fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                            <path d="M2.5 2.5L11.5 11.5L20.5 2.5" stroke="var(--primary-yellow)"
                                                stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
                                        </svg>
                                    </button>

                                    <ul v-if="isPlanAmbitoOpen" class="plan-menu" role="listbox" aria-label="Ámbitos">
                                        <li v-for="ambito in PLAN_AMBITOS" :key="ambito.key" class="plan-menu-li">
                                            <button type="button" class="plan-menu-item"
                                                :class="{ 'is-selected': planAmbito === ambito.key }"
                                                @click="selectPlanAmbito(ambito.key)">
                                                {{ ambito.label }}
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div class="plan-control">
                                <h4 class="plan-label">Vista de texto:</h4>
                                <div class="plan-resumen-toggle" role="group" aria-label="Vista de texto">
                                    <button type="button" class="plan-resumen-option"
                                        :class="{ 'is-active': planResumen === 'simple' }"
                                        :aria-pressed="planResumen === 'simple'" @click="setPlanResumen('simple')">
                                        Simple
                                    </button>
                                    <button type="button" class="plan-resumen-option"
                                        :class="{ 'is-active': planResumen === 'detalle' }"
                                        :aria-pressed="planResumen === 'detalle'" @click="setPlanResumen('detalle')">
                                        Detalle
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="plan-content">


                            <div class="propuestas" v-if="currentPropuestas.length">


                                <ul v-if="planResumen === 'simple'" class="propuestas-list">
                                    <li v-for="(item, idx) in currentPropuestas" :key="idx" class="propuesta-item">
                                        <div class="propuesta-simple-row">
                                            <span class="propuesta-dot" aria-hidden="true"></span>
                                            <h5 class="propuesta-simple-text">{{ item }}</h5>
                                        </div>
                                    </li>
                                </ul>

                                <ul v-else class="propuestas-list propuestas-list--detalle">
                                    <li v-for="(item, idx) in currentPropuestasDetalle" :key="idx"
                                        class="propuesta-item propuesta-item--detalle">
                                        <div class="propuesta-detalle-title-row">
                                            <span class="propuesta-dot" aria-hidden="true"></span>
                                            <h5 class="propuesta-detalle-title">{{ item.title }}</h5>
                                        </div>
                                        <p v-if="item.body" class="propuesta-detalle-body">{{ item.body }}</p>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div v-else-if="activeOpcion === 'trayectoria'">
                        <ul v-if="currentTrayectoria.length" class="trayectoria-list">
                            <li v-for="(item, idx) in currentTrayectoria" :key="idx" class="trayectoria-item">
                                <div class="trayectoria-row">
                                    <span class="propuesta-dot" aria-hidden="true"></span>
                                    <div class="trayectoria-text">
                                        <h5 class="trayectoria-eleccion">{{ item.eleccion }}</h5>
                                        <p class="trayectoria-detalle">
                                            {{ item.cargo }} · {{ item.partido }}<span v-if="item.region"> · {{
                                                item.region }}</span>
                                        </p>
                                    </div>
                                </div>
                            </li>
                        </ul>

                        <p v-else class="opcion-text">Sin información de trayectoria.</p>
                    </div>
                    <div v-else>
                        <div v-if="currentCandidateMedia.hasMembers" class="miembros-grid">
                            <div class="miembro-card">
                                <div class="miembro-img-wrap">
                                    <img class="miembro-img" :src="vice1ImgSrc" alt="1era Vicepresidenta" />
                                </div>
                                <div class="miembro-body">
                                    <h3>Carmela Silene Salazar Jauregui</h3>
                                    <h4 class="miembro-cargo">
                                        <span class="miembro-cargo-label">Cargo postulado:</span>
                                        <span class="miembro-cargo-value">1era Vicepresidenta - Diputado</span>
                                    </h4>
                                    <p class="miembro-info">
                                        <span class="miembro-info-label">Estudios superiores:</span>
                                        <span class="miembro-info-value">Si</span>
                                    </p>
                                    <p class="miembro-info">
                                        <span class="miembro-info-label">Ultimo cargo:</span>
                                        <span class="miembro-info-value">Provías descentralizado (2024)</span>
                                    </p>
                                </div>
                            </div>

                            <div class="miembro-card">
                                <div class="miembro-img-wrap">
                                    <img class="miembro-img" :src="vice2ImgSrc" alt="2da Vicepresidenta" />
                                </div>
                                <div class="miembro-body">
                                    <h3>Vanessa rubith lazo valles</h3>
                                    <h4 class="miembro-cargo">
                                        <span class="miembro-cargo-label">Cargo postulado:</span>
                                        <span class="miembro-cargo-value">2da Vicepresidenta - Diputado</span>
                                    </h4>
                                    <p class="miembro-info">
                                        <span class="miembro-info-label">Estudios superiores:</span>
                                        <span class="miembro-info-value">Si</span>
                                    </p>
                                    <p class="miembro-info">
                                        <span class="miembro-info-label">Ultimo cargo:</span>
                                        <span class="miembro-info-value">Servicio de articulación y facilitacion de la
                                            información para el desarrollo de una herramienta de g(2025)</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                        <p v-else class="opcion-text">Sin información de miembros.</p>
                    </div>
                </div>
            </div>

            <div class="candidatos-col candidatos-col2 candidatos-col--title">
                <div class="candidatos-title-row">
                    <h1 class="candidatos-title">{{ currentCandidateData?.candidate ?? 'Busca tu candidato' }}</h1>
                </div>
                <div v-if="hasSelectedCandidate" class="candidato-perfil">
                    <div class="candidato-perfil-img-wrap">
                        <div class="candidato-perfil-img-clip">
                            <img v-if="currentCandidateMedia.photoSrc" class="candidato-perfil-img"
                                :src="currentCandidateMedia.photoSrc"
                                :alt="currentCandidateData?.candidate ?? 'Candidato'" />
                            <div v-else class="candidato-perfil-placeholder" aria-hidden="true">
                                <span class="candidato-perfil-initials">{{ candidateInitials }}</span>
                            </div>
                        </div>
                        <div v-if="currentCandidateMedia.logoSrc" class="candidato-perfil-logo-wrap"
                            :class="{ 'is-crop': currentCandidateMedia.logoCrop }" :style="candidatoLogoWrapStyle">
                            <img class="candidato-perfil-logo" :src="currentCandidateMedia.logoSrc"
                                :alt="currentCandidateData?.party ?? 'Partido'" />
                        </div>
                    </div>
                </div>
                <div v-if="hasSelectedCandidate" class="descripcion-denuncias">
                    <div class="denuncia-line">
                        <h4 class="denuncia-label">Partido:</h4>
                        <h4 class="denuncia-value">{{ currentCandidateData?.party ?? '' }}</h4>
                    </div>
                    <!-- <div class="denuncia-line">
                        <h4 class="denuncia-label">Investigaciones candidato:</h4>
                        <h4 class="denuncia-value">{{ currentInvestigacionesCandidato }}</h4>
                    </div> -->
                    <div class="denuncia-line">
                        <h4 class="denuncia-label">Condenas miembros partido:</h4>
                        <h4 class="denuncia-value">{{ currentDenunciasPartido?.condenados ?? 0 }}</h4>
                    </div>
                    <div class="denuncia-line">
                        <h4 class="denuncia-label">Sentencias miembros partido:</h4>
                        <h4 class="denuncia-value">{{ currentDenunciasPartido?.sentenciados ?? 0 }}</h4>
                    </div>
                </div>
            </div>

        </div>
    </div>


</template>


<style scoped>
.nombre-candidato {
    margin: 0;
    line-height: 1;
}

.candidato-header {
    padding-top: 87px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding-right: 0;
    width: 100%;
    box-sizing: border-box;
}

.candidatos-page {
    width: 100%;
    padding-top: 25px;
    padding-left: 135px;
    padding-right: 135px;
    box-sizing: border-box;
}

.candidatos-columns {
    display: flex;
    gap: 43px;
    align-items: flex-start;
}

.candidatos-col {
    min-width: 0;
}

.candidatos-col--search {
    flex: 2;
}

.candidatos-col--title {
    flex: 1;
}

.candidatos-title {
    margin: 0;
    font-size: 41.8px;
    font-weight: 900;
    line-height: 1.15;
    color: var(--primary-white);
    text-align: center;
    width: 100%;
}

.candidatos-title-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    min-height: 89px;
    width: 90%;
    margin-left: auto;
    margin-right: auto;
}

.candidatos-title-logo {
    width: 146px;
    height: auto;
    border-radius: 15px;
    object-fit: contain;
    display: block;
    margin-left: auto;
    flex: 0 0 auto;

}

.candidato-perfil {
    margin-top: 28px;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    margin-left: 0;
}

.candidato-perfil-img-wrap {
    width: 45%;
    display: block;
    position: relative;
}

.candidato-perfil-img-clip {
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: 999px;
    overflow: hidden;
}

.candidato-perfil-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    max-width: none;
    border-radius: 0;

}

.candidato-perfil-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--primary-dark);
    border: 1.5px solid rgba(245, 245, 245, 0.35);
    box-sizing: border-box;
}

.candidato-perfil-initials {
    color: var(--primary-yellow);
    font-weight: 900;
    font-size: 32px;
    line-height: 1;
}

.candidato-perfil-logo-wrap {
    position: absolute;
    right: 7px;
    bottom: 7px;
    width: 55px;
    height: 55px;
    border-radius: 999px;
    background: var(--primary-white);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 5px;
    z-index: 2;
    pointer-events: none;
    overflow: hidden;
}

.candidato-perfil-logo-wrap.is-crop {
    padding: 0;
    background: transparent;
}

.candidato-perfil-logo {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
}

.descripcion-denuncias {
    width: 90%;
    max-width: none;
    margin-left: auto;
    margin-right: auto;
    display: flex;
    flex-direction: column;
    gap: 0;
    padding-top: 39px;
}

.denuncia-line {
    display: flex;
    align-items: baseline;
    gap: 10px;
    justify-content: center;
    width: 100%;
    padding-bottom: 19px;
}

.denuncia-line:not(:last-child) {
    border-bottom: 1.5px solid rgba(45, 52, 54, 1);
    margin-bottom: 19px;
}

.denuncia-label,
.denuncia-value {
    margin: 0;
    line-height: 1.25;
}

.denuncia-label {
    color: var(--primary-white);
    font-weight: 900;
}

.denuncia-value {
    color: var(--primary-yellow);
    font-weight: 400;
}

.search-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 36px;
    width: 100%;
    margin: 0 auto;
}

.search-autocomplete {
    position: relative;
    flex: 1 1 auto;
    width: auto;
    min-width: 0;
}

.logo-picker {
    position: relative;
    flex: 0 0 auto;
}

.logo-picker-btn {
    border: 0;
    background: transparent;
    padding: 0;
    margin: 0;
    cursor: pointer;
    line-height: 0;
    display: block;
}

.logo-picker-btn:focus-visible {
    outline: 2px solid var(--primary-yellow);
    outline-offset: 4px;
    border-radius: 24px;
}

.logo-picker-popover {
    --logo-cell: 64px;
    --logo-gap: 10px;
    position: absolute;
    right: 0;
    top: calc(100% + 10px);
    z-index: 30;
    padding: 12px;
    border-radius: 16px;
    border: 1.5px solid var(--primary-white);
    background: var(--primary-dark);
    width: calc(5 * var(--logo-cell) + 4 * var(--logo-gap) + 24px);
    max-width: calc(100vw - 24px);
    max-height: calc(7 * var(--logo-cell) + 6 * var(--logo-gap) + 24px);
    overflow-y: auto;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.25);
}

.logo-picker-grid {
    display: grid;
    grid-template-columns: repeat(5, var(--logo-cell));
    gap: var(--logo-gap);
    justify-content: start;
}

.logo-picker-item {
    width: var(--logo-cell);
    height: var(--logo-cell);
    border-radius: 14px;
    border: 1.5px solid rgba(245, 245, 245, 0.35);
    background: var(--primary-white);
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.logo-picker-item:hover {
    border-color: var(--primary-yellow);
}

.logo-picker-item.is-selected {
    border-color: var(--primary-yellow);
    box-shadow: 0 0 0 2px rgba(255, 217, 0, 0.25);
}

.logo-picker-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    padding: 8px;
    box-sizing: border-box;
    display: block;
}

.logo-picker-fallback {
    font-weight: 900;
    color: var(--primary-black);
}

.logo-side-svg {
    flex: 0 0 auto;
    margin-left: 0;
    width: 146px;
    height: 89px;
    display: block;
}

.search-icon {
    position: absolute;
    left: 28px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--primary-white);
    opacity: 0.6;
    stroke-width: 1.5;
    pointer-events: none;

}

.clear-icon-btn {
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    padding: 0;
    margin: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    line-height: 0;
    color: var(--primary-white);
    opacity: 1;
}

.clear-icon-btn:hover {
    opacity: 1;
}

.clear-icon-btn:disabled {
    opacity: 0.5;
    cursor: default;
}

.clear-icon {
    stroke-width: 1.5;
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
    border: 1.5px solid #f5f5f5;
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
    color: var(--primary-black);
}

.search-suggestion-btn:hover {
    background: rgba(255, 215, 0, 0.35);
}

.circular-search {
    display: block;
    margin: 0 auto;
    border-radius: 79px;
    height: 89px;
    padding: 0 60px 0 76px;
    font-size: 24px;
    font-weight: 400;
    outline: none;
    width: 100%;
    border: 1.5px solid var(--primary-white);
    background: var(--primary-dark);
    color: var(--primary-white);
    caret-color: var(--primary-white);
    text-align: left;
    transition: border 0.2s;
}

.circular-search::placeholder {
    color: var(--primary-white);
    opacity: 0.45;
    font-family: 'Merriweather';
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

.opcion-seccion {
    padding-top: 20px;
}

.opcion-title {
    margin: 0 0 10px 0;
    font-size: 22px;
    font-weight: 900;
    color: var(--primary-white);
}

.opcion-text {
    margin: 0;
    font-size: 16px;
    line-height: 1.6;
    color: var(--primary-white);
    opacity: 0.85;
}

.miembros-grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: 1fr;
    gap: 22px;
}

.miembro-card {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 50px;
    min-width: 0;
    padding-bottom: 15px;
}

.miembro-img-wrap {
    width: min(200px, 100%);
    aspect-ratio: 1 / 1;
    border-radius: 999px;
    overflow: hidden;
    flex: 0 0 auto;
}

.miembro-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.miembro-body {
    min-width: 0;
}

.miembro-cargo {
    margin: 0;
    font-weight: 900;
    line-height: 1.15;
}

.miembro-cargo-label {
    color: var(--primary-white);
    font-weight: 900;
    margin-right: 8px;
}

.miembro-cargo-value {
    color: var(--primary-yellow);
    font-weight: 900;
}

.miembro-info {
    margin: 10px 0 0 0;
    line-height: 1.4;
}

.miembro-info-label {
    color: var(--primary-white);
    font-weight: 900;
    margin-right: 6px;
}

.miembro-info-value {
    color: var(--primary-yellow);
    font-weight: 700;
}

.trayectoria-list {
    margin: 14px 0 0 0;
    padding: 0;
    list-style: none;
    display: grid;
    grid-template-columns: 1fr;
    column-gap: 0;
    row-gap: 18px;
}

.trayectoria-item {
    margin: 0;
}

.trayectoria-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
}

.trayectoria-row .propuesta-dot {
    margin-top: 7px;
}

.trayectoria-text {
    min-width: 0;
}

.trayectoria-eleccion {
    margin: 0;
    color: var(--primary-white);
    font-weight: 900;
    font-size: 20.2px;
    line-height: 1.25;
}

.trayectoria-detalle {
    margin: 12px 0 0 0;
    color: var(--primary-white);
    opacity: 0.85;
    font-size: 20.2px;
    font-weight: 400;
    line-height: 1.5;
}

.plan-controls {
    display: flex;
    align-items: center;
    gap: 22px;
    flex-wrap: wrap;
}

.plan-control {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 42px;
}

.plan-dropdown {
    position: relative;
    display: inline-block;
}

.plan-label {
    margin: 0;
    font-weight: 900;
    color: var(--primary-white);
    opacity: 0.6;
}

.plan-btn {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    height: 44px;
    padding: 0 16px;
    border-radius: 999px;
    border: 1.5px solid var(--primary-white);
    background: var(--primary-dark);
    color: var(--primary-white);
    cursor: pointer;
}

.plan-btn--resumen {
    gap: 3px;
    height: 42px;
    padding: 0 12px;
}

.plan-resumen-toggle {
    display: flex;
    align-items: stretch;
    height: 42px;
    border-radius: 999px;
    border: 1.5px solid var(--primary-white);
    background: var(--primary-dark);
    overflow: hidden;
}

.plan-resumen-option {
    flex: 1 1 0;
    min-width: 0;
    border: 0;
    background: transparent;
    color: var(--primary-white);
    opacity: 0.75;
    font: inherit;
    font-size: 18px;
    font-weight: 700;
    padding: 0 18px;
    cursor: pointer;
}

.plan-resumen-option.is-active {
    background: var(--primary-yellow);
    color: var(--primary-black);
    opacity: 1;
}

.plan-resumen-option:focus-visible {
    outline: 2px solid var(--primary-yellow);
    outline-offset: -2px;
}

.plan-btn--ambito {
    height: 42px;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    display: inline-flex;
    align-items: center;
}

.plan-btn--ambito .plan-btn-text {
    font-size: 24.19px;
    padding-left: 0;
}

.plan-btn-text {
    font-size: 18px;
    font-weight: 700;
    line-height: 1;
    padding-left: 2px;

}

.plan-btn-icon {
    display: block;
}

.plan-resumen-icon {
    color: var(--primary-yellow);
    padding-left: 0;
}

.plan-menu {
    position: absolute;
    top: calc(100% + 10px);
    left: 0;
    margin: 0;
    padding: 10px;
    list-style: none;
    background: var(--primary-dark);
    border: 1.5px solid var(--primary-white);
    border-radius: 16px;
    z-index: 20;
    min-width: 220px;
}

.plan-menu-li {
    margin: 0;
}

.plan-menu-item {
    width: 100%;
    text-align: left;
    padding: 10px 12px;
    border: 0;
    border-radius: 12px;
    background: transparent;
    color: var(--primary-white);
    cursor: pointer;
    font-size: 18px;
    font-weight: 700;
    opacity: 0.9;
}

.plan-menu-item:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.08);
}

.plan-menu-item.is-selected {
    opacity: 1;
    background: rgba(255, 217, 0, 0.15);
}

.plan-content {
    padding-top: 0px;
}

.propuestas {
    padding-top: 39px;
}

.propuestas-title {
    margin-top: 0;
    font-size: clamp(1.2rem, 2vw, 20.2px);
}

.propuestas-list {
    margin: 10px 0 0 0;
    padding-left: 18px;
    color: var(--primary-white);
    opacity: 0.85;
}

.propuestas-list:not(.propuestas-list--detalle) {
    list-style: none;
    padding-left: 0;
}

.propuestas-list--detalle {
    list-style: none;
    padding-left: 0;
    opacity: 1;
}

.propuesta-item {
    margin: 0 0 8px 0;
    font-size: clamp(1.2rem, 2vw, 20.2px);
    line-height: 1.6;
}

.propuesta-simple-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
}

.propuesta-simple-row .propuesta-dot {
    margin-top: 8px;
}

.propuesta-simple-text {
    margin: 0;
    color: var(--primary-white);
    font-weight: 900;
    font-size: clamp(1.2rem, 2vw, 20.2px);
    line-height: 1.25;
    padding-bottom: 12px;
}

.propuesta-item--detalle {
    margin: 0 0 18px 0;
}

.propuesta-detalle-title-row {
    display: flex;
    align-items: center;
    gap: 10px;
}

.propuesta-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: var(--primary-yellow);
    flex: 0 0 auto;
}

.propuesta-detalle-title {
    margin: 0;
    color: var(--primary-white);
    font-weight: 900;
    font-size: clamp(1.2rem, 2vw, 20.2px);
    line-height: 1.25;
}

.propuesta-detalle-body {
    margin: 12px 0 0 20px;
    color: var(--primary-white);
    opacity: 0.85;
    font-size: clamp(1.2rem, 2vw, 20.2px);
    line-height: 1.6;
}


@media (max-width: 1024px) {
    .candidatos-page {
        padding-left: 40px;
        padding-right: 40px;
    }

    .candidatos-columns {
        flex-direction: column;
        gap: 26px;
    }

    .candidatos-col--search,
    .candidatos-col--title {
        flex: 0 0 auto;
        width: 100%;
    }

    /* En responsive: mostrar primero título + imagen del candidato */
    .candidatos-col--title {
        order: -1;
    }

    .candidatos-col--search {
        order: 0;
    }

    /* Dentro del bloque de título: imagen primero, luego el nombre */
    .candidatos-col--title {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .candidato-perfil {
        order: 0;
        margin-top: 0;
    }

    .candidatos-title-row {
        order: 1;
        min-height: 0;
        margin-top: 14px;
        width: 100%;
    }

    .search-row {
        gap: 18px;
    }

    .bar-opciones {
        justify-content: center;
        gap: 18px;
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-width: none;
    }

    .bar-opciones::-webkit-scrollbar {
        display: none;
    }

    .bar-opcion {
        flex: 0 0 auto;
        font-size: 20px;
        white-space: nowrap;
    }

    .candidato-perfil-img-wrap {
        width: min(320px, 62vw);
    }

    .descripcion-denuncias {
        width: 100%;
    }

    .miembro-card {
        gap: 22px;
    }

    .trayectoria-eleccion,
    .trayectoria-detalle {
        font-size: 18px;
    }

    .candidatos-title {
        font-size: 40px;
    }

    .candidatos-title-logo {
        height: 40px;
    }
}

@media (max-width: 600px) {
    .search-row {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        flex-wrap: nowrap;
        gap: 10px;
    }

    .search-autocomplete {
        flex: 1 1 auto;
        min-width: 0;
    }

    .logo-picker {
        flex: 0 0 auto;
    }

    .logo-picker-btn svg {
        width: clamp(90px, 26vw, 120px);
        height: auto;
    }

    .search-side-svg {
        height: 72px;
        width: auto;
    }

    .candidatos-page {
        padding-left: 12px;
        padding-right: 12px;
    }

    .candidatos-columns {
        flex-direction: column;
        gap: 18px;
    }

    /* Asegurar orden correcto también en móvil */
    .candidatos-col--title {
        order: -1;
    }

    .candidatos-col--search {
        order: 0;
    }

    /* Achicar imagen para que el nombre quede visible sin ocupar toda la pantalla */
    .candidato-perfil-img-wrap {
        width: min(200px, 56vw);
    }

    .candidatos-title {
        font-size: clamp(22px, 6.2vw, 30px);
        line-height: 1.1;
    }

    .candidatos-title-row {
        width: 100%;
        margin-left: 0;
        margin-right: 0;
    }

    .candidato-perfil-logo-wrap {
        width: 48px;
        height: 48px;
        right: 6px;
        bottom: 6px;
    }

    .bar-opciones {
        justify-content: flex-start;
        gap: 14px;
        margin-top: 22px;
        padding-bottom: 12px;
    }

    .bar-opcion {
        font-size: 17px;
    }

    .plan-controls {
        flex-direction: column;
        align-items: flex-start;
        gap: 14px;
    }

    .plan-control {
        width: 100%;
        justify-content: space-between;
        gap: 10px;
    }

    /* En responsive: pegar "Seguridad" al texto "Ámbito:" */
    .plan-controls .plan-control:first-child {
        justify-content: flex-start;
        gap: 6px;
        flex-wrap: nowrap;
        min-height: 42px;
        position: relative;
    }

    /* En móvil, centrar el menú respecto al ancho de la pantalla (control full-width) */
    .plan-controls .plan-control:first-child .plan-dropdown {
        position: static;
    }

    .plan-controls .plan-control:first-child .plan-btn--ambito {
        display: inline-flex;
        align-items: center;
        min-height: 42px;
    }

    .plan-resumen-toggle {
        width: 100%;
    }

    .plan-resumen-option {
        padding: 0 12px;
        font-size: 16px;
    }

    .plan-btn--ambito .plan-btn-text {
        font-size: 20px;
    }

    .plan-menu {
        min-width: 0;
        left: 50%;
        right: auto;
        transform: translateX(-50%);
        width: min(80vw, 300px);
        max-width: calc(100vw - 24px);
        padding: 8px;
        box-sizing: border-box;
    }

    .plan-menu-item {
        font-size: 16px;
        padding: 8px 10px;
        white-space: normal;
        word-break: break-word;
    }

    .propuestas {
        padding-top: 26px;
    }

    .miembro-card {
        flex-direction: column;
        align-items: center;
        gap: 14px;
        padding-bottom: 10px;
        text-align: center;
    }

    .miembro-body {
        text-align: center;
    }

    .trayectoria-eleccion {
        font-size: 17px;
    }

    .trayectoria-detalle {
        font-size: 16px;
        margin-top: 8px;
    }

    .search-autocomplete {
        width: 100%;
    }

    .circular-search {
        height: 72px;
        font-size: 18px;
        padding: 0 44px 0 52px;
        border-radius: 79px;
    }

    .search-icon {
        left: 18px;
    }

    .clear-icon-btn {
        right: 12px;
    }

    .candidatos-title {
        font-size: 32px;
    }

    .candidatos-title-row {
        min-height: 72px;
    }

    .candidatos-title-logo {
        height: 32px;
    }

    .miembros-grid {
        gap: 18px;
    }

    .logo-picker-popover {
        --logo-cell: 52px;
        --logo-gap: 8px;
    }
}
</style>