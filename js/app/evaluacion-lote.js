// Anexo 03, artículos 16, 20, 22, 23, 25 y 26.
// Las ampliaciones requieren intervención edificatoria. El índice base sigue
// siendo la fuente de la compatibilidad ordinaria y del texto de cada giro.
(function (root) {
    'use strict';

    var AMPLIACIONES = {
        'Uso Residencial Preferente': {
            RDB: ['1071-01', '1410-01', '1811-01', '4761-01', '4772-04', '4773-05'],
            RDM: ['1071-01', '1811-01', '4741-01', '4742-01', '4761-01', '4761-02',
                '4764-01', '4772-03', '4772-04', '4773-04', '4773-02', '4773-03',
                '4773-05', '7500-01', '7911-01', '9602-01', '9602-02'],
            RDA: ['4773-04', '4763-01', '7500-01', '7911-01', '9602-01', '9602-02']
        },
        'Uso Mixto Vecinal': {
            RDB: ['4773-04', '4741-01', '4761-01', '4761-02', '4763-01', '4764-01',
                '4773-05', '7420-01', '7500-01', '8542-01'],
            RDM: ['4773-04', '4741-01', '4761-01', '4761-02', '4763-01', '4764-01',
                '4773-05', '7420-01', '7500-01', '8542-01'],
            RDA: ['4773-04', '4741-01', '4761-01', '4761-02', '4763-01', '4764-01',
                '4773-05', '7420-01', '7500-01', '8542-01']
        },
        'Uso Mixto Zonal': {
            RDB: ['1410-01', '4510-01', '4530-01', '4540-01', '4540-02', '4711-01',
                '5911-01', '5920-01', '7810-01', '7911-01', '7912-01', '8010-01',
                '9200-01', '9200-02'],
            RDM: ['1410-01', '4510-01', '4530-01', '4540-01', '4540-02', '4711-01',
                '5911-01', '5920-01', '7810-01', '7911-01', '7912-01', '8010-01',
                '9200-01', '9200-02'],
            RDA: ['1410-01', '4510-01', '4530-01', '4540-01', '4540-02', '4711-01',
                '5911-01', '5920-01', '7810-01', '7911-01', '7912-01', '8010-01',
                '9200-01', '9200-02']
        }
    };

    var PRECISIONES = {
        '1071-01': 'Elaboración artesanal con reparto y atención; en RDB se contemplan modalidades con o sin consumo.',
        '1410-01': 'Confección, arreglo o reparación a pedido, con atención, prueba y entrega en el establecimiento.',
        '1811-01': 'Impresión digital de documentos y material gráfico simple con equipos de oficina o mostrador.',
        '4510-01': 'Sala de exhibición de unidades, sin taller.',
        '4530-01': 'Venta de repuestos y accesorios sin instalación.',
        '4540-01': 'Exhibición de motocicletas, partes y accesorios.',
        '4711-01': 'En Uso Mixto Zonal, la ampliación comprende autoservicio con preparación de pedidos y recojo, sin almacén autónomo ni centro de distribución.',
        '4763-01': 'Venta de artículos deportivos y bicicletas, sin armado ni mantenimiento.',
        '4773-05': 'Venta de animales de compañía y productos para su cuidado, sin servicios veterinarios.',
        '5911-01': 'Producción audiovisual en estudio o set de grabación.',
        '5920-01': 'Grabación de sonido y edición musical en estudio.',
        '7420-01': 'Servicios de fotografía en estudio.',
        '7500-01': 'Atención veterinaria ambulatoria en consultorio.',
        '8010-01': 'Seguridad privada en oficina, sin armería ni patio de vehículos.',
        '8542-01': 'Enseñanza cultural y artística en aula, taller o estudio, sin espectáculos al público.',
        '9200-01': 'Apuestas deportivas en agencia, sin máquinas de juego.',
        '9602-01': 'Cuidado capilar, peluquería y barbería, sin procedimientos médicos.',
        '9602-02': 'Tratamientos de belleza no médicos y cuidado estético no invasivo.'
    };

    function evaluar(opciones) {
        var categoria = opciones.categoria;
        var zona = String(opciones.zonificacion || '').trim().toUpperCase();
        var conObra = Boolean(opciones.conObra);
        var indice = opciones.indice || [];
        var area = Number(opciones.areaM2);
        var llave = {'Usos Específicos - Hospital': 'Hospitales',
            'Usos Específicos - Educación': 'Educación',
            'Usos Específicos - Otros Usos': 'Otros Usos'}[categoria] || categoria;
        if (!zona) return {actividades: [], motivo: 'No se pudo confirmar la zonificación vigente de este lote. Verifica el plano antes de atribuir giros.', ampliadas: 0};
        if (categoria === 'Uso Mixto Especializado' && ['OU', 'H', 'E'].indexOf(zona) !== -1)
            return {actividades: [], motivo: 'El Uso Mixto Especializado no se aplica en zonificación OU, H o E.', ampliadas: 0};
        if (categoria === 'Uso Mixto Especializado' && area > 0 && area < 500)
            return {actividades: [], motivo: 'El área registrada del lote es inferior a los 500 m² requeridos para Uso Mixto Especializado.', ampliadas: 0};

        var ampliaciones = conObra && AMPLIACIONES[categoria] && AMPLIACIONES[categoria][zona] || [];
        var actividades = indice.reduce(function (lista, giro) {
            var autorizado = giro.ZONAS && ['X', 'R'].indexOf(String(giro.ZONAS[llave] || '').trim().toUpperCase()) !== -1;
            var ampliado = ampliaciones.indexOf(String(giro.COD_GIRO || '')) !== -1;
            if (!autorizado && !ampliado) return lista;
            if (giro.CLASE === '5510' && zona === 'RDA' && area > 0 && area < 350) return lista;
            lista.push({giro: giro, ampliado: ampliado && !autorizado,
                precision: ampliado ? PRECISIONES[giro.COD_GIRO] || '' : ''});
            return lista;
        }, []);
        return {actividades: actividades, ampliadas: actividades.filter(function (x) {return x.ampliado;}).length, motivo: ''};
    }

    root.EVALUACION_LOTE = {evaluar: evaluar, ampliaciones: AMPLIACIONES};
})(typeof window !== 'undefined' ? window : globalThis);
