        var map = L.map('map', {
            preferCanvas: true,
            zoomControl: false,
            attributionControl: false,
            maxZoom: 28,
            minZoom: 1,
            wheelDebounceTime: 45,
            wheelPxPerZoomLevel: 60
        }).fitBounds([[-12.094993710275856,-77.0100891034669],[-12.085400753536042,-76.99586998020054]]);
        window.map = map;
        var mapaSatelital = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
            maxNativeZoom: 22,
            maxZoom: 28,
            opacity: 0.5,
            updateWhenIdle: false,
            updateWhenZooming: false,
            keepBuffer: 4,
            updateInterval: 80,
            attribution: '&copy; Google'
        }).addTo(map);
        window.mapaSatelital = mapaSatelital;

        L.control.zoom({ position: 'bottomright' }).addTo(map);
        var bounds_group = new L.featureGroup([]);

        // --- DICCIONARIO DE CONCEPTOS COMPLETOS ---
        const definicionesZonas = {
            "Uso Mixto Especializado": "Áreas destinadas a la concentración estratégica de actividades de salud en una zona del distrito. Este clúster promueve entornos urbanos saludables.",
            "Uso Mixto Intensivo": "Áreas destinadas a la concentración estratégica de actividades como tiendas, ferias, centros comerciales y bancos orientados a atraer consumidores y dinamizar el entorno urbano. Este clúster promueve la competitividad, impulsa el desarrollo económico local y contribuye a la formalización del comercio.",
            "Uso Mixto Metropolitano": "Áreas destinadas a la concentración de actividades de gran escala con una oferta diversa y especializada capaz de atraer un alto flujo de personas. Debido a su magnitud, requieren infraestructura adecuada y ubicación estratégica para evitar congestión vehicular y garantizar accesibilidad.",
            "Uso Mixto Zonal": "Áreas destinadas a actividades de mediana escala con una mayor variedad en comparación con los servicios básicos. Suelen ubicarse en áreas de uso mixto o en corredores comerciales estratégicos, donde existe un flujo constante de personas.",
            "Uso Mixto Vecinal": "Áreas destinadas a actividades de pequeña escala que cubren necesidades esenciales de la población. Se ubican cerca a zonas residenciales para reducir desplazamientos. Su impacto en el entorno urbano es mínimo, lo cual no afecta las interacciones barriales.",
            "Uso Residencial Preferente": "Áreas destinadas a actividades compatibles con la función residencial sin alterar su carácter habitacional. Este uso se integra al tejido urbano residencial bajo criterios de control de intensidad, accesibilidad y bajo impacto en la dinámica barrial.",
            "Uso Residencial Especial": "Es una variante del Uso Mixto Vecinal pero ubicado en los Conjuntos Habitacionales de Torres de Limatambo y Torres de San Borja. Atiende las necesidades básicas con una oferta limitada de actividades, sin alterar la dinámica residencial.",
            "Uso Residencial Exclusivo": "Áreas destinadas únicamente a la vivienda, no permite actividades urbanas complementarias de tipo comercial, institucional o productivo. Su objetivo es asegurar la protección del carácter estrictamente residencial y la calidad de vida de los habitantes.",
            "Planes Especiales": "Áreas destinadas a actividades compatibles con las Zonas de Reglamentación Especial 1, 2 y 3 (ZRE-1, ZRE-2 y ZRE-3) y la Zona de Reglamentación Especial 4 (ZRE-4) correspondiente al ámbito del Centro Cultural de la Nación.",
            "Planes Especiales - Uso Mixto Zonal": "Polígonos de Planes Especiales con compatibilidad orientada a uso mixto zonal, sujetos a las condiciones del ZRE correspondiente.",
            "Planes Especiales - Uso Mixto Vecinal": "Polígonos de Planes Especiales con compatibilidad orientada a uso mixto vecinal, sujetos a las condiciones del ZRE correspondiente.",
            "Usos Específicos - Otros Usos": "Áreas destinadas a actividades de carácter complementario o especializado esenciales para la ciudad, que requieren condiciones particulares de localización, regulación y compatibilidad con el entorno urbano, tales como servicios de salud (H), educación (E) y otros usos (OU).",
            "Usos Específicos - Educación": "Áreas destinadas a actividades de carácter complementario o especializado esenciales para la ciudad, que requieren condiciones particulares de localización, regulación y compatibilidad con el entorno urbano, tales como servicios de salud (H), educación (E) y otros usos (OU).",
            "Usos Específicos - Hospital": "Áreas destinadas a actividades de carácter complementario o especializado esenciales para la ciudad, que requieren condiciones particulares de localización, regulación y compatibilidad con el entorno urbano, tales como servicios de salud (H), educación (E) y otros usos (OU).",
            "Uso de Recreación Pública": "Áreas zonificadas como Zona de Recreación Pública (ZRP). Su finalidad es consolidar áreas destinadas al ocio, la integración social y el bienestar colectivo mediante actividades que dinamicen el espacio público sin desnaturalizar el carácter recreativo."
        };

// --- ESTADO GLOBAL DE LA APLICACION ---
let capaLoteResaltado = null;
let datosVias = []; // datosUsos, datosActividades, datosActividadesZRE cargados via script tags
let zonaActual = "", zonVigActual = "", zreUsocomActual = "";
let loteActual = {};
let panel = document.getElementById('panel-usos');
let capaResaltadoVia = null;

function estandarizarTexto(t) {
    return String(t === null || t === undefined ? '' : t)
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[ñ]/g, 'n')
        .toLocaleLowerCase('es')
        .replace(/&/g, ' y ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

function coincideBusquedaTexto(busqueda, texto) {
    var terminos = estandarizarTexto(busqueda).split(' ').filter(Boolean);
    var contenido = estandarizarTexto(texto);
    return terminos.length > 0 && terminos.every(function(termino) {
        return contenido.includes(termino);
    });
}

function tipoAutorizacion(valor) {
    var texto = String(valor || '').trim().toUpperCase();
    if (texto === 'X') return 'X';
    if (texto === 'R') return 'R';
    return '';
}

// Colores por tipo de autorizacion
function colorAuth(auth) {
    if (tipoAutorizacion(auth) === 'X') return { bg: '#4CAF50', txt: '#fff', label: 'Permitido' };
    if (tipoAutorizacion(auth) === 'R') return { bg: '#ffca28', txt: '#000', label: 'Permitido con restricción' };
    return { bg: '#555', txt: '#ccc', label: 'Uso No Permitido' };
}
