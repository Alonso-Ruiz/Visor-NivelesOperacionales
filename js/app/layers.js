// --- SISTEMA DE RESALTADO ---
        var capaBloqueSeleccionado = null;
        var capaRetiroResaltado = null;

        window.limpiarRetiroResaltado = function() {
            if (capaRetiroResaltado) map.removeLayer(capaRetiroResaltado);
            capaRetiroResaltado = null;
            window.capaRetiroResaltado = null;
        };

        function resaltarRetiro(feature) {
            window.limpiarRetiroResaltado();
            if (!feature) return;
            if (capaLoteResaltado) map.removeLayer(capaLoteResaltado);
            capaLoteResaltado = null;
            window.capaLoteResaltado = null;
            if (window.limpiarBordeBloqueSeleccionado) window.limpiarBordeBloqueSeleccionado();

            if (!map.getPane('pane_retiro_resaltado')) {
                map.createPane('pane_retiro_resaltado');
                map.getPane('pane_retiro_resaltado').style.zIndex = 651;
                map.getPane('pane_retiro_resaltado').style.pointerEvents = 'none';
            }

            capaRetiroResaltado = L.geoJson(feature, {
                pane: 'pane_retiro_resaltado',
                style: {
                    color: '#00D9FF',
                    weight: 4,
                    opacity: 1,
                    dashArray: '9 6',
                    lineCap: 'round',
                    lineJoin: 'round',
                    fill: true,
                    fillColor: '#00D9FF',
                    fillOpacity: 0.16,
                    className: 'lote-resaltado-animacion'
                },
                interactive: false
            }).addTo(map);
            window.capaRetiroResaltado = capaRetiroResaltado;
        }

        function puntoEnAnillo(punto, anillo) {
            var dentro = false;
            for (var i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
                var xi = anillo[i][0], yi = anillo[i][1];
                var xj = anillo[j][0], yj = anillo[j][1];
                var cruza = ((yi > punto[1]) !== (yj > punto[1])) &&
                    (punto[0] < (xj - xi) * (punto[1] - yi) / (yj - yi) + xi);
                if (cruza) dentro = !dentro;
            }
            return dentro;
        }

        function puntoEnBloque(punto, geometria) {
            if (!geometria || geometria.type !== 'MultiPolygon') return false;
            return geometria.coordinates.some(function(poligono) {
                return puntoEnAnillo(punto, poligono[0]) && !poligono.slice(1).some(function(anillo) {
                    return puntoEnAnillo(punto, anillo);
                });
            });
        }

        function areaCajaBloque(geometria) {
            var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            function revisar(coordenadas) {
                if (typeof coordenadas[0] === 'number') {
                    minX = Math.min(minX, coordenadas[0]);
                    minY = Math.min(minY, coordenadas[1]);
                    maxX = Math.max(maxX, coordenadas[0]);
                    maxY = Math.max(maxY, coordenadas[1]);
                    return;
                }
                coordenadas.forEach(revisar);
            }
            revisar(geometria.coordinates);
            return (maxX - minX) * (maxY - minY);
        }

        window.limpiarBordeBloqueSeleccionado = function() {
            if (capaBloqueSeleccionado) map.removeLayer(capaBloqueSeleccionado);
            capaBloqueSeleccionado = null;
        };

        function resaltarBloqueDelLote(layer) {
            window.limpiarBordeBloqueSeleccionado();
            if (!layer || !layer.getBounds || !window.json_Bordes_1) return;

            var centro = layer.getBounds().getCenter();
            var punto = [centro.lng, centro.lat];
            var candidatos = json_Bordes_1.features.filter(function(bloque) {
                return puntoEnBloque(punto, bloque.geometry);
            });
            if (!candidatos.length) return;

            candidatos.sort(function(a, b) {
                return areaCajaBloque(a.geometry) - areaCajaBloque(b.geometry);
            });

            if (!map.getPane('pane_bloque_seleccionado')) {
                map.createPane('pane_bloque_seleccionado');
                map.getPane('pane_bloque_seleccionado').style.zIndex = 640;
                map.getPane('pane_bloque_seleccionado').style.pointerEvents = 'none';
            }

            capaBloqueSeleccionado = L.geoJson(candidatos[0], {
                pane: 'pane_bloque_seleccionado',
                style: {
                    color: '#111111',
                    weight: 3,
                    opacity: 0.96,
                    fill: false,
                    interactive: false
                },
                interactive: false
            }).addTo(map);
            window.capaBloqueSeleccionado = capaBloqueSeleccionado;
        }

        window.resaltarLotePorBusqueda = function(feature) {
            window.limpiarRetiroResaltado();
            if (capaLoteResaltado && map.hasLayer(capaLoteResaltado)) map.removeLayer(capaLoteResaltado);
            capaLoteResaltado = null;
            window.capaLoteResaltado = null;
            window.limpiarBordeBloqueSeleccionado();
            if (!feature) return;

            if (!map.getPane('pane_lote_resaltado')) {
                map.createPane('pane_lote_resaltado');
                map.getPane('pane_lote_resaltado').style.zIndex = 650;
                map.getPane('pane_lote_resaltado').style.pointerEvents = 'none';
            }
            capaLoteResaltado = L.geoJson(feature, {
                pane: 'pane_lote_resaltado',
                interactive: false,
                style: {
                    color: '#00D9FF', weight: 5, opacity: 1, dashArray: '9 6',
                    lineCap: 'round', lineJoin: 'round', fill: true,
                    fillColor: '#00D9FF', fillOpacity: 0.22,
                    className: 'lote-resaltado-animacion'
                }
            }).addTo(map);
            window.capaLoteResaltado = capaLoteResaltado;
            if (capaLoteResaltado.bringToFront) capaLoteResaltado.bringToFront();
        };

        function resaltarLote(feature, layer) {
            window.limpiarRetiroResaltado();
            if (capaLoteResaltado) map.removeLayer(capaLoteResaltado);
            window.capaLoteResaltado = null;
            if (!map.getPane('pane_lote_resaltado')) {
                map.createPane('pane_lote_resaltado');
                map.getPane('pane_lote_resaltado').style.zIndex = 650;
                map.getPane('pane_lote_resaltado').style.pointerEvents = 'none';
            }
            capaLoteResaltado = L.geoJson(feature, {
                pane: 'pane_lote_resaltado',
                style: {
                    color: '#00D9FF',
                    weight: 5,
                    opacity: 1,
                    dashArray: '9 6',
                    lineCap: 'round',
                    lineJoin: 'round',
                    fill: true,
                    fillOpacity: 0.22,
                    fillColor: '#00D9FF',
                    className: 'lote-resaltado-animacion'
                },
                interactive: false
            }).addTo(map);
            window.capaLoteResaltado = capaLoteResaltado;
            if (capaLoteResaltado.bringToFront) capaLoteResaltado.bringToFront();
            resaltarBloqueDelLote(layer);
        }

        function enfocarSeleccion(layer) {
            if (!layer || !layer.getBounds) return;
            var limites = layer.getBounds();
            if (!limites || !limites.isValid()) return;

            var esMovil = window.innerWidth <= 896;
            if (esMovil) map.closePopup();

            window.setTimeout(function() {
                if (document.body.classList.contains('modo-retiros')) return;
                if (!esMovil) {
                    var panelDetalle = document.getElementById('panel-usos');
                    var anchoPanel = panelDetalle && !panelDetalle.classList.contains('minimizado')
                        ? Math.round(panelDetalle.getBoundingClientRect().width)
                        : 0;

                    map.flyToBounds(limites, {
                        paddingTopLeft: [24, 64],
                        paddingBottomRight: [anchoPanel + 24, 24],
                        maxZoom: 20,
                        animate: true,
                        duration: 0.45
                    });
                    return;
                }

                map.flyToBounds(limites, {
                    paddingTopLeft: [18, 82],
                    paddingBottomRight: [18, Math.round(window.innerHeight * 0.58)],
                    maxZoom: 20,
                    animate: true,
                    duration: 0.45
                });
            }, 40);
        }

        // --- LÓGICA DEL LOTE Y EL POPUP ---
        function pop_usos_compatibles_0(feature, layer) {
            var miZona = feature.properties['USOS_COMPA'] || '';
            if (miZona === 'Usos Específicos' || miZona === 'Otros Usos') miZona = 'Usos Específicos - Otros Usos';
            if (window.normalizarCategoriaUso) miZona = window.normalizarCategoriaUso(miZona);

            var zonVig     = feature.properties['ZON_VIG']     || '';
            var zreUsocom  = feature.properties['ZRE_USOCOM']  || '';

            // Calculamos el espacio para que en celular el popup no quede tapado por el panel
            var paddingAbajo = window.innerWidth <= 896 ? (window.innerHeight * 0.55) : 50;

            layer.bindPopup(miZona, {
                className: 'popup-limpio',
                closeButton: false,
                autoPanPaddingBottomRight: [10, paddingAbajo],
                autoPanPaddingTopLeft: [10, 50]
            });

            layer.on('click', function(e) {
                if ((window.categoriaUsoVisible && !window.categoriaUsoVisible(feature.properties['USOS_COMPA'])) ||
                    (window.zonaZreVisible && !window.zonaZreVisible(feature))) {
                    map.closePopup();
                    if (L.DomEvent) L.DomEvent.stop(e);
                    return;
                }
                resaltarLote(feature, layer);
                if(window.actualizarLista) window.actualizarLista(miZona, zonVig, zreUsocom, feature.properties || {}, e.latlng);
                enfocarSeleccion(layer);
            });
        }

        map.createPane('pane_usos_compatibles_0');
        map.getPane('pane_usos_compatibles_0').style.zIndex = 400;
        map.getPane('pane_usos_compatibles_0').style['mix-blend-mode'] = 'normal';
        map.createPane('pane_parques_alineados');
        map.getPane('pane_parques_alineados').style.zIndex = 401;
        map.getPane('pane_parques_alineados').style.pointerEvents = 'none';
        map.createPane('pane_tramado_planes_especiales');
        map.getPane('pane_tramado_planes_especiales').style.zIndex = 401;
        map.getPane('pane_tramado_planes_especiales').style['mix-blend-mode'] = 'normal';
        map.createPane('pane_retiros');
        map.getPane('pane_retiros').style.zIndex = 402;
        map.getPane('pane_retiros').style.mixBlendMode = 'multiply';

        // El tramado vive en un SVG independiente, encima de la capa que
        // conserva el color y los bordes originales de cada poligono.
        var rendererPlanesEspecialesSvg = L.svg({ pane: 'pane_tramado_planes_especiales', padding: 0.35 });
        var pattern_usos_compatibles_0_0 = new L.StripePattern({
            pane: 'pane_tramado_planes_especiales',
            renderer: rendererPlanesEspecialesSvg,
            weight: 0.45,
            spaceWeight: 1.0,
            color: '#000000',
            opacity: 1.0,
            spaceOpacity: 0,
            angle: 315
        });
        pattern_usos_compatibles_0_0.addTo(map);

        // Retiro normativo: oscurece con suavidad el color real del uso que queda debajo.
        // Mantiene la detección de clic original de Leaflet para que esta
        // superposición no interfiera con la selección de los lotes.
        var rendererRetirosSvg = L.svg({ pane: 'pane_retiros', padding: 0.35 });
        function styleBaseUsosCompatibles(feature) {
            var categoriaEstilo = window.normalizarCategoriaUso
                ? window.normalizarCategoriaUso(feature.properties['USOS_COMPA'])
                : String(feature.properties['USOS_COMPA']);
            switch(categoriaEstilo) {
                case 'Uso Mixto Especializado': return { pane: 'pane_usos_compatibles_0', opacity: 1, color: 'rgba(35,35,35,0.81)', weight: 1.0, fill: true, fillOpacity: 1, fillColor: 'rgba(122,4,3,1.0)', interactive: true, }
                case 'Uso Mixto Intensivo': return { pane: 'pane_usos_compatibles_0', opacity: 1, color: 'rgba(35,35,35,0.81)', weight: 1.0, fill: true, fillOpacity: 1, fillColor: 'rgba(183,32,32,1.0)', interactive: true, }
                case 'Uso Mixto Metropolitano': return { pane: 'pane_usos_compatibles_0', opacity: 1, color: 'rgba(35,35,35,0.81)', weight: 1.0, fill: true, fillOpacity: 1, fillColor: 'rgba(155,88,71,1.0)', interactive: true, }
                case 'Uso Mixto Zonal': return { pane: 'pane_usos_compatibles_0', opacity: 1, color: 'rgba(35,35,35,0.81)', weight: 1.0, fill: true, fillOpacity: 1, fillColor: 'rgba(244,122,122,1.0)', interactive: true, }
                case 'Uso Mixto Vecinal': return { pane: 'pane_usos_compatibles_0', opacity: 1, color: 'rgba(35,35,35,0.81)', weight: 1.0, fill: true, fillOpacity: 1, fillColor: 'rgba(242,113,68,1.0)', interactive: true, }
                case 'Uso Residencial Preferente': return { pane: 'pane_usos_compatibles_0', opacity: 1, color: 'rgba(35,35,35,0.81)', weight: 1.0, fill: true, fillOpacity: 1, fillColor: 'rgba(244,198,68,1.0)', interactive: true, }
                case 'Uso Residencial Especial': return { pane: 'pane_usos_compatibles_0', opacity: 1, color: 'rgba(35,35,35,0.81)', weight: 1.0, fill: true, fillOpacity: 1, fillColor: 'rgba(254,172,0,1.0)', interactive: true, }
                case 'Uso Residencial Exclusivo': return { pane: 'pane_usos_compatibles_0', opacity: 1, color: 'rgba(35,35,35,0.81)', weight: 1.0, fill: true, fillOpacity: 1, fillColor: 'rgba(244,244,244,1.0)', interactive: true, }
                case 'Planes Especiales': return { pane: 'pane_usos_compatibles_0', opacity: 1, color: 'rgba(35,35,35,0.81)', weight: 1.0, fill: true, fillOpacity: 1, fillColor: 'rgba(244,244,244,1.0)', interactive: true, }
                case 'Planes Especiales - Uso Mixto Zonal': return { pane: 'pane_usos_compatibles_0', opacity: 1, color: 'rgba(35,35,35,0.81)', weight: 1.0, fill: true, fillOpacity: 1, fillColor: 'rgba(244,122,122,1.0)', interactive: true, }
                case 'Planes Especiales - Uso Mixto Vecinal': return { pane: 'pane_usos_compatibles_0', opacity: 1, color: 'rgba(35,35,35,0.81)', weight: 1.0, fill: true, fillOpacity: 1, fillColor: 'rgba(242,113,68,1.0)', interactive: true, }
                case 'Usos Específicos': return { pane: 'pane_usos_compatibles_0', opacity: 1, color: 'rgba(35,35,35,0.81)', weight: 1.0, fill: true, fillOpacity: 1, fillColor: 'rgba(129,129,129,1.0)', interactive: true, }
                case 'Usos Específicos - Otros Usos': return { pane: 'pane_usos_compatibles_0', opacity: 1, color: 'rgba(35,35,35,0.81)', weight: 1.0, fill: true, fillOpacity: 1, fillColor: 'rgba(129,129,129,1.0)', interactive: true, }
                case 'Usos Específicos - Educación': return { pane: 'pane_usos_compatibles_0', opacity: 1, color: 'rgba(35,35,35,0.81)', weight: 1.0, fill: true, fillOpacity: 1, fillColor: 'rgba(129,129,129,1.0)', interactive: true, }
                case 'Usos Específicos - Hospital': return { pane: 'pane_usos_compatibles_0', opacity: 1, color: 'rgba(35,35,35,0.81)', weight: 1.0, fill: true, fillOpacity: 1, fillColor: 'rgba(129,129,129,1.0)', interactive: true, }
                case 'Uso de Recreación Pública': return { pane: 'pane_usos_compatibles_0', opacity: 1, color: 'rgba(35,35,35,0.81)', weight: 1.0, fill: true, fillOpacity: 1, fillColor: 'rgba(164,205,163,1.0)', interactive: true, }
                default: return { pane: 'pane_usos_compatibles_0', opacity: 1, color: 'rgba(35,35,35,0.81)', weight: 1.0, fill: true, fillOpacity: 1, fillColor: 'rgba(129,129,129,1.0)', interactive: true, }
            }
        }

        function style_usos_compatibles_0_0(feature) {
            return styleBaseUsosCompatibles(feature);
        }

        function esPlanEspecialRayado(feature) {
            var categoria = window.normalizarCategoriaUso
                ? window.normalizarCategoriaUso(feature.properties['USOS_COMPA'])
                : String(feature.properties['USOS_COMPA']);
            return categoria.indexOf('Planes Especiales') === 0;
        }

        function style_tramado_planes_especiales() {
            return {
                pane: 'pane_tramado_planes_especiales',
                stroke: false,
                fill: true,
                fillOpacity: 1,
                fillPattern: pattern_usos_compatibles_0_0,
                interactive: true
            };
        }

        var rendererLotesCanvas = L.canvas({ pane: 'pane_usos_compatibles_0', padding: 0.35, tolerance: 6 });
        var layer_usos_compatibles_0 = new L.geoJson(json_usos_compatibles_0, {
            attribution: '',
            interactive: true,
            dataVar: 'json_usos_compatibles_0',
            layerName: 'layer_usos_compatibles_0',
            pane: 'pane_usos_compatibles_0',
            renderer: rendererLotesCanvas,
            onEachFeature: pop_usos_compatibles_0,
            style: style_usos_compatibles_0_0,
        });
        window.layer_usos_compatibles_0 = layer_usos_compatibles_0;
        bounds_group.addLayer(layer_usos_compatibles_0); map.addLayer(layer_usos_compatibles_0);

        // Trazado visual de parques del export de QGIS. La capa de usos
        // conserva las consultas y esta superposición no captura clics.
        function style_parques_alineados() {
            return {
                pane: 'pane_parques_alineados',
                color: 'rgba(35,35,35,0.81)', weight: 1,
                opacity: 1, fill: true, fillColor: 'rgba(164,205,163,1.0)',
                fillOpacity: 1, interactive: false
            };
        }
        var layer_parques_alineados = typeof json_parques_alineados_20261001 !== 'undefined'
            ? L.geoJson(json_parques_alineados_20261001, {
                pane: 'pane_parques_alineados', interactive: false,
                style: function(feature) {
                    return window.aplicarVisibilidadCategoria(style_parques_alineados(feature), feature);
                }
            }).addTo(map) : null;
        window.layer_parques_alineados = layer_parques_alineados;

        var layer_usos_compatibles_planes = new L.geoJson(json_usos_compatibles_0, {
            attribution: '',
            interactive: true,
            dataVar: 'json_usos_compatibles_0',
            layerName: 'layer_usos_compatibles_planes',
            pane: 'pane_tramado_planes_especiales',
            renderer: rendererPlanesEspecialesSvg,
            filter: esPlanEspecialRayado,
            onEachFeature: pop_usos_compatibles_0,
            style: style_tramado_planes_especiales,
        });
        window.layer_usos_compatibles_planes = layer_usos_compatibles_planes;
        bounds_group.addLayer(layer_usos_compatibles_planes); map.addLayer(layer_usos_compatibles_planes);

        var capaRetiros = typeof json_Polgono_retiros_concdigos_2 !== 'undefined'
            ? new L.geoJson(null, {
                pane: 'pane_retiros',
                renderer: rendererRetirosSvg,
                // SVG captura solo la geometría del retiro, dejando accesibles
                // los lotes situados fuera de ella.
                interactive: true,
                onEachFeature: function(feature, layer) {
                    var valorArea = feature.properties && feature.properties.AREA;
                    var area = valorArea === null || valorArea === undefined || valorArea === '' ? NaN : Number(valorArea);
                    var areaTexto = Number.isFinite(area)
                        ? area.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²'
                        : 'Área no disponible';
                    layer.bindPopup('<div class="popup-retiro-contenido"><strong>Área de retiro mínimo normativo</strong><span>' + areaTexto + '</span></div>', {
                        className: 'popup-retiro', closeButton: false,
                        autoPanPaddingTopLeft: [14, 62],
                        autoPanPaddingBottomRight: [14, window.innerWidth <= 896 ? Math.round(window.innerHeight * 0.55) : 24]
                    });
                    layer.on('click', function() { resaltarRetiro(feature); });
                },
                style: function() {
                    return {
                        pane: 'pane_retiros',
                        stroke: false,
                        fill: true,
                        fillColor: '#111111',
                        fillOpacity: 0.28
                    };
                }
            })
            : null;
        window.capaRetiros = capaRetiros;
        if (capaRetiros) {
            map.addLayer(capaRetiros);
            // Añade los polígonos en tandas cortas: el mapa y sus controles
            // quedan interactivos mientras termina de dibujarse la capa.
            var featuresRetirosNormativos = json_Polgono_retiros_concdigos_2.features || [];
            var indiceRetiroNormativo = 0;
            function agregarTandaRetirosNormativos() {
                var limite = Math.min(indiceRetiroNormativo + 240, featuresRetirosNormativos.length);
                if (limite > indiceRetiroNormativo) {
                    capaRetiros.addData(featuresRetirosNormativos.slice(indiceRetiroNormativo, limite));
                    indiceRetiroNormativo = limite;
                }
                if (indiceRetiroNormativo < featuresRetirosNormativos.length) {
                    window.requestAnimationFrame(agregarTandaRetirosNormativos);
                }
            }
            window.requestAnimationFrame(agregarTandaRetirosNormativos);
        }
