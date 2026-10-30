// Restricciones del Índice distrital y del Índice ZRE, contrastadas con la
// propuesta de reglamento proporcionada el 01/10/2026 (arts. 16-27 y 34-42).
(function () {
    'use strict';

    var UBICACIONES_ZRE = {
        'ZRE-1': {
            sanJuanCalles: 'San Juan Masías - Calle El Comercio, Jr. De la Historia y Av. De la Arqueología',
            sanJuanAvenidas: 'San Juan Masías - Av. Aviación y Av. Canadá',
            elBosque: 'El Bosque y El Bosque de San Borja',
            pequenosAgricultores: 'Pequeños Agricultores Todos los Santos'
        },
        'ZRE-2': {
            calles: 'Papa Juan XXIII - Calle Géminis, Calle Gamma, Calle Joaquín Madrid y Calle Alfa',
            avenidas: 'Papa Juan XXIII - Av. Aviación y Av. Angamos Este'
        },
        'ZRE-3': { unica: 'Área rústica del Subsector 12-A' },
        'ZRE-4': { unica: 'Centro Cultural de la Nación' }
    };

    function normalizar(valor) {
        return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase().replace(/\s+/g, ' ').trim();
    }

    function contiene(texto, opciones) {
        return opciones.some(function (opcion) { return texto.indexOf(opcion) !== -1; });
    }

    function propiedad(objeto, nombres) {
        objeto = objeto || {};
        for (var i = 0; i < nombres.length; i++) {
            var valor = objeto[nombres[i]];
            if (valor !== null && valor !== undefined && String(valor).trim() !== '') return valor;
        }
        return '';
    }

    function condicion(etiqueta, valor) {
        return { etiqueta: etiqueta, valor: valor };
    }

    function regla(condiciones, sinRestriccion) {
        return { condiciones: condiciones || [], sinRestriccion: Boolean(sinRestriccion) };
    }

    function restriccionesAnteriores(zona, clase, contexto) {
        var clave = zona === 'Usos Específicos - Hospital' || zona === 'Usos Específicos - Educación'
            ? 'Usos Específicos' : zona;
        var notas = window.datosNotasRestricciones && window.datosNotasRestricciones.distrital;
        var datos = notas && notas[clave];
        if (!datos) {
            if (contexto && contexto.restriccionAnterior) {
                return regla([condicion('Restricción', contexto.restriccionAnterior)]);
            }
            return regla([condicion(
                'Restricción del giro',
                'El Índice distrital marca esta actividad con R, pero la hoja Notas - Restricciones no detalla una condición para esta categoría.'
            )]);
        }
        var condiciones = [];
        var soloObraNueva = contexto && String(contexto.restriccionPoligono || '').trim().toUpperCase() === 'O.N';
        if (datos.existente && !soloObraNueva) condiciones.push(condicion('Edificación existente', datos.existente));
        if (datos.obraNueva) condiciones.push(condicion(
            soloObraNueva ? 'Solo por obra nueva, remodelación o ampliación' : 'Obra nueva, remodelación o ampliación',
            datos.obraNueva
        ));
        return regla(condiciones);
    }

    var clasesExceptuadas = {
        'Uso Residencial Preferente': '4711 4721 5221 7810 7420 7490 8413 7010 8510 8620 8690 8890'.split(' '),
        'Uso Mixto Vecinal': '1071 1410 1811 4711 4719 4721 4772 5221 7810 7420 7490 8413 7010 8510 8620 8690 8890 9601 9609 9602'.split(' '),
        'Uso Mixto Zonal': '1071 1410 1811 4711 4719 4721 4772 4771 4753 4752 4741 4761 4763 4773 9523 5610 5629 5221 7911 5320 6190 6419 6499 6612 6910 6920 7810 7420 7490 8413 7010 8510 8620 8690 7500 8890 9311 9602 9601 9609'.split(' ')
    };
    var viasExceptuadas = {
        'Uso Residencial Preferente': ['san borja norte', 'paseo del bosque'],
        'Uso Mixto Vecinal': ['san borja norte', 'san borja sur', 'julio bailetti', 'mercator', 'van gogh']
    };
    var viasPorClase = {
        'Uso Residencial Preferente': ['san borja norte'],
        'Uso Mixto Vecinal': ['san borja norte', 'san borja sur'],
        'Uso Mixto Zonal': ['galvez barrenechea', 'primavera', 'san luis', 'aviacion', 'san borja norte', 'san borja sur']
    };
    var disposicionesGenerales = [
        'Las condiciones de área, nivel, ubicación y escala son criterios de compatibilidad de uso. No sustituyen las condiciones de seguridad en edificaciones, normativa sectorial, accesibilidad, aforo y demás normas aplicables.',
        'Los giros aprobados en edificaciones existentes mantienen su licencia de funcionamiento, respetando las condiciones bajo las cuales fueron autorizados y las acciones de fiscalización posterior que correspondan.',
        'La transferencia de la licencia procede siempre que se mantengan el giro autorizado, el área aprobada, la ubicación del establecimiento, las condiciones de seguridad y las demás condiciones bajo las cuales fue otorgada.',
        'La modificación del giro, ampliación o reducción del área autorizada, cambio de ubicación o variación de las condiciones aprobadas se sujeta a la evaluación correspondiente conforme a la normativa vigente.'
    ];

    function restriccionesOrdinarias(zona, clase, contexto) {
        contexto = contexto || {};
        clase = String(clase);
        // Este campo procede exclusivamente de la capa auxiliar; ZDB/ZDM/ZDA no son equivalencias.
        var vigente = String(contexto.zonificacionVigente || '').trim().toUpperCase();
        var via = normalizar(contexto.via).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ');
        function enVias(vias) {
            return (vias || []).some(function (nombre) { return (' ' + via + ' ').indexOf(' ' + nombre + ' ') !== -1; });
        }
        var residencial = ['RDB', 'RDM', 'RDA'].indexOf(vigente) !== -1;
        var revisada = Object.prototype.hasOwnProperty.call(clasesExceptuadas, zona);
        var exceptuada = enVias(viasExceptuadas[zona]) ||
            (revisada && clasesExceptuadas[zona].indexOf(clase) !== -1 && enVias(viasPorClase[zona]));
        var resultado = restriccionesAnteriores(zona, clase, contexto);
        var soloObra = String(contexto.restriccionPoligono || '').trim().toUpperCase() === 'O.N';
        if (revisada && residencial) {
            var condiciones = [];
            if (exceptuada) {
                condiciones.push(condicion('Excepción por ubicación',
                    'Este giro y ubicación están exceptuados de las condiciones generales de esta categoría indicadas en las restricciones revisadas. Se mantienen las condiciones específicas del giro y las demás normas aplicables.'));
                if (soloObra) condiciones.push(condicion('Condición del polígono',
                    'La compatibilidad se consulta solo por obra nueva, remodelación, ampliación u obra menor.'));
            } else {
                var existente, nueva;
                if (zona === 'Uso Residencial Preferente') {
                    existente = 'Predio en esquina, establecimiento en el primer nivel y área destinada al establecimiento de 15 m² a 300 m².';
                    nueva = 'Uso comercial compatible solo en el primer nivel y/o subsuelo, según las condiciones de seguridad y funcionamiento.';
                } else if (zona === 'Uso Mixto Vecinal') {
                    existente = 'Establecimiento en el primer nivel, con área de 50 m² como mínimo y máxima de ' + (vigente === 'RDB' ? '300' : '500') + ' m² por establecimiento.';
                    nueva = 'Uso comercial compatible desde el subsuelo hasta el segundo nivel.';
                } else {
                    existente = 'Establecimiento hasta el tercer nivel, con área de 50 m² como mínimo y máxima de ' + (vigente === 'RDB' ? '300' : '750') + ' m² por establecimiento.';
                    nueva = 'Uso comercial compatible desde el subsuelo hasta el tercer nivel.';
                }
                if (!soloObra) condiciones.push(condicion('Edificación existente, con o sin acondicionamiento o refacción', existente));
                condiciones.push(condicion((soloObra ? 'Solo por ' : '') + 'Obra nueva, remodelación, ampliación u obra menor', nueva));
            }
            resultado = regla(condiciones);
        } else if (revisada && !vigente) {
            resultado = regla([condicion('Verificación del predio',
                'No se ha podido determinar la condición aplicable al punto consultado. Seleccione el interior del lote en el mapa para consultar sus límites de área y nivel.')]);
        }
        if (contexto.autorizacion === 'X') resultado = regla([]);
        if (clase === '8413') {
            resultado.condiciones.push(condicion('Condición específica de la actividad a puerta cerrada',
                'Para actividades administrativas, profesionales o de gestión a puerta cerrada: en vivienda unifamiliar, el área útil total de todos los ambientes y niveles destinados al giro no podrá exceder el 20 % del área de la unidad inmobiliaria. En vivienda bifamiliar o multifamiliar, no podrá exceder el 15 % del área de la unidad inmobiliaria declarada como vivienda.'));
        }
        var comercial = vigente === 'CV' || vigente === 'CZ';
        if (clase === '7010' && comercial) {
            resultado.condiciones.push(condicion('Excepción específica de nivel',
                'Para oficinas con atención al público, sede empresarial, oficina principal, coworking, centro administrativo, capacitación empresarial o modalidad equivalente, se permite el desarrollo en todos los niveles, salvo restricción expresa por seguridad, niveles operacionales, normativa sectorial o incompatibilidad específica del giro. Esta condición de nivel prevalece sobre el límite general.'));
        }
        if (clase === '5510') {
            if (comercial) resultado.condiciones.push(condicion('Excepción específica de nivel',
                'El alojamiento para estancias cortas se permite en todos los niveles. Esta condición de nivel prevalece sobre el límite general.'));
            if (vigente === 'RDA') {
                var areaLote = Number(contexto.areaM2);
                var minima = condicion('Área mínima del lote',
                    'Compatible únicamente en lotes de al menos 350 m², sin perjuicio de las condiciones de seguridad y demás normas sectoriales aplicables.' +
                    (areaLote > 0 && areaLote < 350 ? ' El área registrada del lote es menor de 350 m² y no cumple esta condición.' : ''));
                if (Number.isFinite(areaLote) && areaLote > 0) minima.estado = areaLote < 350 ? 'no-cumple' : 'cumple';
                resultado.condiciones.push(minima);
            }
        }
        if (clase === '4711' && comercial && ['Uso Mixto Vecinal', 'Uso Mixto Zonal'].indexOf(zona) !== -1) {
            resultado.condiciones.push(condicion('Excepción específica de nivel',
                'Se permite el desarrollo en todos los niveles cuando el establecimiento se ubique al interior de mercados, galerías comerciales o centros comerciales formalmente existentes o autorizados como tales y el giro sea compatible con esta categoría. Esta excepción sustituye el límite general de nivel únicamente cuando se cumple esa ubicación.'));
        }
        // Las reglas nuevas complementan el texto que ya mostraba el visor.
        // Al aplicar una excepción o condición especial, volver a añadirlo si
        // el bloque general fue sustituido por la regla específica.
        if (contexto.restriccionAnterior && !resultado.condiciones.some(function (c) {
            return c.etiqueta === 'Restricción';
        })) {
            resultado.condiciones.unshift(condicion('Restricción', contexto.restriccionAnterior));
        }
        if (contexto.restriccionAnterior) {
            resultado.condiciones = resultado.condiciones.filter(function (c) {
            return c.etiqueta !== 'Restricción del giro';
            });
        }
        return resultado;
    }

    function resolverUbicacionZRE(zreId, propiedadesLote) {
        var via = normalizar(propiedad(propiedadesLote, ['VIA COLIND', 'VIA_COLIND', 'VÍA COLINDANTE', 'VIA COLINDANTE']));
        var uso = normalizar(propiedad(propiedadesLote, ['ZRE_USOCOM']));

        if (zreId === 'ZRE-1') {
            if (contiene(via, ['aviacion', 'canada'])) return UBICACIONES_ZRE['ZRE-1'].sanJuanAvenidas;
            if (contiene(via, ['comercio', 'historia', 'arqueologia'])) return UBICACIONES_ZRE['ZRE-1'].sanJuanCalles;
            if (contiene(via, ['san luis', 'paseo del bosque'])) return UBICACIONES_ZRE['ZRE-1'].elBosque;
            if (contiene(via, ['roma', 'joaquin madrid', 'melissa'])) return UBICACIONES_ZRE['ZRE-1'].pequenosAgricultores;
            if (uso.indexOf('mixto controlado') !== -1) return UBICACIONES_ZRE['ZRE-1'].sanJuanAvenidas;
            if (uso.indexOf('mixto restringido') !== -1) return UBICACIONES_ZRE['ZRE-1'].sanJuanCalles;
            return '';
        }

        if (zreId === 'ZRE-2') {
            if (contiene(via, ['aviacion', 'angamos'])) return UBICACIONES_ZRE['ZRE-2'].avenidas;
            if (contiene(via, ['geminis', 'gamma', 'joaquin madrid', 'alfa', 'lambda'])) return UBICACIONES_ZRE['ZRE-2'].calles;
            if (uso.indexOf('mixto controlado') !== -1) return UBICACIONES_ZRE['ZRE-2'].avenidas;
            if (uso.indexOf('mixto restringido') !== -1) return UBICACIONES_ZRE['ZRE-2'].calles;
            return '';
        }

        if (zreId === 'ZRE-3') return UBICACIONES_ZRE['ZRE-3'].unica;
        if (zreId === 'ZRE-4') return UBICACIONES_ZRE['ZRE-4'].unica;
        return '';
    }

    function autorizacionZRE(giro, zreId, ubicacion) {
        if (!giro || !ubicacion || !giro.ZRE || !giro.ZRE[zreId]) return null;
        var valor = giro.ZRE[zreId][ubicacion];
        var notas = window.datosNotasRestricciones && window.datosNotasRestricciones.zre;
        if (valor === 'X') return 'X';
        return notas && Object.prototype.hasOwnProperty.call(notas, valor) ? 'R' : null;
    }

    function restriccionGiroZRE(giro, zreId, ubicacion) {
        var autorizacion = autorizacionZRE(giro, zreId, ubicacion);
        if (!autorizacion) return regla([]);
        if (autorizacion === 'X') return regla([], true);

        var codigo = giro.ZRE[zreId][ubicacion];
        var datos = window.datosNotasRestricciones.zre[codigo];
        var condiciones = [];
        if (datos.existente) condiciones.push(condicion(codigo + ' · Edificación existente (m² de área útil)', datos.existente));
        if (datos.obraNueva) condiciones.push(condicion(codigo + ' · Obra nueva, remodelación o ampliación', datos.obraNueva));
        return regla(condiciones);
    }

    window.RESTRICCIONES_IIUU = {
        ubicacionesZRE: UBICACIONES_ZRE,
        resolverUbicacionZRE: resolverUbicacionZRE,
        autorizacionZRE: autorizacionZRE,
        obtener: restriccionesOrdinarias,
        disposicionesGenerales: disposicionesGenerales,
        obtenerZRE: restriccionGiroZRE,
        regimenResidencialExclusivo: {
            titulo: 'Condición de compatibilidad',
            resumen: 'En Uso Residencial Exclusivo, se consideran compatibles las unidades inmobiliarias que cuenten con declaratoria de fábrica como tienda, local comercial o uso equivalente, los cuales adquieren uso de la categoría USO RESIDENCIAL PREFERENTE.',
            condiciones: []
        }
    };
})();
