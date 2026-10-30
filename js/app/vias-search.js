        // Datos cargados via <script> tags (sin fetch, compatible con file://)
        console.log('Datos cargados — Usos:', datosUsos.length, '| Actividades:', datosActividades.length, '| ZRE:', datosActividadesZRE.length);
        let capaViasEtiquetas = null;
        let temporizadorViasEtiquetas = null;
        let rendererViasEtiquetas = null;
        let etiquetasViasVisibles = true;
        cargarVias();

        function cargarVias() {
            (function() { var jsonVias = json_vias;
                datosVias = jsonVias.features;
                map.createPane('pane_vias_lineas'); map.getPane('pane_vias_lineas').style.zIndex = 350;
                rendererViasEtiquetas = L.svg({ pane: 'pane_vias_lineas', padding: 0.1 });
                programarActualizacionEtiquetasVias(60);
            })();
        }

        function clasePorNivelVia(nivel) {
            nivel = String(nivel || '').toUpperCase();
            if (nivel.includes('EXPRESA')) return 'etiqueta-expresa';
            if (nivel.includes('ARTERIAL')) return 'etiqueta-arterial';
            if (nivel.includes('COLECTORA')) return 'etiqueta-colectora';
            return 'etiqueta-local';
        }

        function viaVisiblePorZoom(nivel, zoom) {
            nivel = String(nivel || '').toUpperCase();
            if (nivel.includes('EXPRESA')) return zoom >= 14;
            if (nivel.includes('ARTERIAL')) return zoom >= 15;
            if (nivel.includes('COLECTORA')) return zoom >= 16;
            return zoom >= 17;
        }

        function coordenadaDentroDeVista(coords, bounds) {
            if (!coords) return false;
            if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
                return bounds.contains([coords[1], coords[0]]);
            }
            return coords.some(function(parte) {
                return coordenadaDentroDeVista(parte, bounds);
            });
        }

        function construirEtiquetasVias() {
            if (capaViasEtiquetas) {
                map.removeLayer(capaViasEtiquetas);
                capaViasEtiquetas = null;
            }

            if (!etiquetasViasVisibles) return;

            var zoom = map.getZoom();
            if (zoom < 14) return;

            var boundsVisibles = map.getBounds().pad(0.25);
            var featuresVisibles = datosVias.filter(function(feature) {
                var props = feature.properties || {};
                return props.NOMBRECOMP &&
                    viaVisiblePorZoom(props.NIVEL, zoom) &&
                    feature.geometry &&
                    coordenadaDentroDeVista(feature.geometry.coordinates, boundsVisibles);
            });

            if (featuresVisibles.length === 0) return;

            capaViasEtiquetas = L.geoJson({ type: 'FeatureCollection', features: featuresVisibles }, {
                pane: 'pane_vias_lineas',
                renderer: rendererViasEtiquetas,
                style: { color: '#ffffff', weight: 1.5, opacity: 0.25, interactive: false },
                interactive: false,
                onEachFeature: function(feature, layer) {
                    if (feature.properties && feature.properties['NOMBRECOMP']) {
                        var nombre = String(feature.properties['NOMBRECOMP']).trim();
                        var claseNivel = clasePorNivelVia(feature.properties['NIVEL']);

                        try {
                            var latlngs = layer.getLatLngs();
                            function enderezar(seg) {
                                if (!seg || seg.length === 0) return seg;
                                if (Array.isArray(seg[0])) return seg.map(enderezar);
                                var p1 = seg[0], p2 = seg[seg.length - 1];
                                if (p1.lng > p2.lng || (Math.abs(p1.lng - p2.lng) < 0.00001 && p1.lat > p2.lat)) return seg.slice().reverse();
                                return seg;
                            }
                            layer.setLatLngs(enderezar(latlngs));

                            if (layer.setText) layer.setText(nombre, { center: true, offset: 6, attributes: { 'class': 'etiqueta-via-curva ' + claseNivel } });
                            else if (layer.eachLayer) layer.eachLayer(sub => { if (sub.setText) sub.setText(nombre, { center: true, offset: 6, attributes: { 'class': 'etiqueta-via-curva ' + claseNivel } }); });
                        } catch(e) {}
                    }
                }
            }).addTo(map);
        }

        function programarActualizacionEtiquetasVias(espera) {
            clearTimeout(temporizadorViasEtiquetas);
            temporizadorViasEtiquetas = setTimeout(construirEtiquetasVias, espera || 120);
        }

        window.establecerVisibilidadVias = function(visible) {
            etiquetasViasVisibles = !!visible;
            if (!etiquetasViasVisibles && capaViasEtiquetas) {
                map.removeLayer(capaViasEtiquetas);
                capaViasEtiquetas = null;
            } else if (etiquetasViasVisibles) {
                programarActualizacionEtiquetasVias(0);
            }
        };
        window.obtenerVisibilidadVias = function() { return etiquetasViasVisibles; };

        map.on('movestart zoomstart', function() {
            document.body.classList.add('mapa-en-movimiento');
            clearTimeout(temporizadorViasEtiquetas);
            if (capaViasEtiquetas) {
                map.removeLayer(capaViasEtiquetas);
                capaViasEtiquetas = null;
            }
        });

        map.on('moveend zoomend', function() {
            document.body.classList.remove('mapa-en-movimiento');
            programarActualizacionEtiquetasVias(100);
        });

        const contenedorBuscadorVias = document.getElementById('buscador-vias-container');
        const botonBuscadorVias = document.getElementById('boton-buscar-vias');
        const inputBuscadorVias = document.getElementById('buscador-vias'), sugerenciasVias = document.getElementById('sugerencias-vias');
        const botonLimpiarVias = document.getElementById('boton-limpiar-vias');
        let ultimoResultadoVias = {};
        let indiceSugerenciaViaActiva = -1;

        inputBuscadorVias.setAttribute('role', 'combobox');
        inputBuscadorVias.setAttribute('aria-autocomplete', 'list');
        inputBuscadorVias.setAttribute('aria-controls', 'sugerencias-vias');
        inputBuscadorVias.setAttribute('aria-expanded', 'false');
        sugerenciasVias.setAttribute('role', 'listbox');

        function actualizarSugerenciaViaActiva(indice) {
            const sugerencias = sugerenciasVias.querySelectorAll('.sugerencia-item');
            if (!sugerencias.length) {
                indiceSugerenciaViaActiva = -1;
                inputBuscadorVias.removeAttribute('aria-activedescendant');
                return;
            }

            indiceSugerenciaViaActiva = (indice + sugerencias.length) % sugerencias.length;
            sugerencias.forEach(function(item, i) {
                const activa = i === indiceSugerenciaViaActiva;
                item.classList.toggle('sugerencia-activa', activa);
                item.setAttribute('aria-selected', activa ? 'true' : 'false');
            });
            inputBuscadorVias.setAttribute('aria-activedescendant', sugerencias[indiceSugerenciaViaActiva].id);
            sugerencias[indiceSugerenciaViaActiva].scrollIntoView({ block: 'nearest' });
        }

        function cerrarSugerenciasVias() {
            sugerenciasVias.style.display = 'none';
            inputBuscadorVias.setAttribute('aria-expanded', 'false');
            inputBuscadorVias.removeAttribute('aria-activedescendant');
            indiceSugerenciaViaActiva = -1;
        }

        function actualizarBotonLimpiarVias() {
            if (botonLimpiarVias) botonLimpiarVias.hidden = !inputBuscadorVias.value.trim();
        }

        function limpiarBusquedaVia() {
            inputBuscadorVias.value = '';
            ultimoResultadoVias = {};
            sugerenciasVias.innerHTML = '';
            cerrarSugerenciasVias();
            if (capaResaltadoVia) {
                map.removeLayer(capaResaltadoVia);
                capaResaltadoVia = null;
            }
            actualizarBotonLimpiarVias();
            cerrarBuscadorViasSiVacio();
        }

        function abrirBuscadorVias() {
            contenedorBuscadorVias.classList.add('buscador-abierto');
            contenedorBuscadorVias.classList.remove('buscador-cerrado');
            if (botonBuscadorVias) botonBuscadorVias.setAttribute('aria-expanded', 'true');
        }

        function cerrarBuscadorViasSiVacio() {
            if (inputBuscadorVias.value.trim()) return;
            contenedorBuscadorVias.classList.add('buscador-cerrado');
            contenedorBuscadorVias.classList.remove('buscador-abierto');
            cerrarSugerenciasVias();
            if (botonBuscadorVias) botonBuscadorVias.setAttribute('aria-expanded', 'false');
        }

        if (botonBuscadorVias) {
            botonBuscadorVias.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                abrirBuscadorVias();
                inputBuscadorVias.focus();
            });
        }

        inputBuscadorVias.addEventListener('focus', abrirBuscadorVias);

        function agruparViasPorTexto(texto) {
            const agrup = {};
            datosVias.forEach(f => {
                if (f.properties && f.properties['NOMBRECOMP']) {
                    const n = String(f.properties['NOMBRECOMP']);
                    if (estandarizarTexto(n).includes(texto)) {
                        if(!agrup[n]) agrup[n] = [];
                        agrup[n].push(f);
                    }
                }
            });
            return agrup;
        }

        function seleccionarVia(nombre, segmentos) {
            inputBuscadorVias.value = nombre;
            actualizarBotonLimpiarVias();
            cerrarSugerenciasVias();

            if (window.mostrarRestriccionesPorVia) window.mostrarRestriccionesPorVia(nombre, segmentos);
            enfocarVia(segmentos);
        }

        function ejecutarBusquedaActual() {
            const textoOriginal = inputBuscadorVias.value.trim();
            const texto = estandarizarTexto(textoOriginal);
            if (texto.length < 2) return;

            const resultados = Object.keys(ultimoResultadoVias).length > 0 ? ultimoResultadoVias : agruparViasPorTexto(texto);
            const nombres = Object.keys(resultados);
            if (nombres.length === 0) return;

            const nombreExacto = nombres.find(n => estandarizarTexto(n) === texto);
            const sugerencias = sugerenciasVias.querySelectorAll('.sugerencia-item');
            const nombreSeleccionado = sugerencias[indiceSugerenciaViaActiva] && sugerencias[indiceSugerenciaViaActiva].dataset.nombre;
            const nombreElegido = nombreSeleccionado || nombreExacto || nombres[0];
            seleccionarVia(nombreElegido, resultados[nombreElegido]);
        }

        inputBuscadorVias.addEventListener('input', function() {
            const txt = estandarizarTexto(this.value); sugerenciasVias.innerHTML = '';
            cerrarSugerenciasVias();
            ultimoResultadoVias = {};
            actualizarBotonLimpiarVias();
            if (txt.length < 2) {
                cerrarSugerenciasVias();
                if (!txt && capaResaltadoVia) {
                    map.removeLayer(capaResaltadoVia);
                    capaResaltadoVia = null;
                }
                return;
            }
            const agrup = agruparViasPorTexto(txt);
            ultimoResultadoVias = agrup;
            const res = Object.keys(agrup).slice(0, 5);
            if (res.length > 0) {
                sugerenciasVias.style.display = 'block';
                inputBuscadorVias.setAttribute('aria-expanded', 'true');
                res.forEach(n => {
                    let div = document.createElement('div');
                    div.className = 'sugerencia-item';
                    div.id = 'sugerencia-via-' + sugerenciasVias.children.length;
                    div.dataset.nombre = n;
                    div.setAttribute('role', 'option');
                    div.setAttribute('aria-selected', 'false');
                    let icono = document.createElement('i');
                    icono.className = 'fas fa-map-marker-alt';
                    icono.style.cssText = 'color:#00bcd4; margin-right:8px;';
                    icono.setAttribute('aria-hidden', 'true');
                    div.appendChild(icono);
                    div.appendChild(document.createTextNode(' ' + n));
                    div.addEventListener('mouseenter', function() {
                        actualizarSugerenciaViaActiva(Array.prototype.indexOf.call(sugerenciasVias.children, div));
                    });
                    div.onclick = () => {
                        seleccionarVia(n, agrup[n]);
                    };
                    sugerenciasVias.appendChild(div);
                });
            } else { cerrarSugerenciasVias(); }
        });

        inputBuscadorVias.addEventListener('keydown', function(e) {
            const sugerenciasVisibles = sugerenciasVias.style.display !== 'none' && sugerenciasVias.children.length > 0;
            if (e.key === 'ArrowDown' && sugerenciasVisibles) {
                e.preventDefault();
                actualizarSugerenciaViaActiva(indiceSugerenciaViaActiva + 1);
                return;
            }
            if (e.key === 'ArrowUp' && sugerenciasVisibles) {
                e.preventDefault();
                actualizarSugerenciaViaActiva(indiceSugerenciaViaActiva < 0 ? sugerenciasVias.children.length - 1 : indiceSugerenciaViaActiva - 1);
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                ejecutarBusquedaActual();
            } else if (e.key === 'Escape') {
                limpiarBusquedaVia();
            }
        });

        if (botonLimpiarVias) {
            botonLimpiarVias.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                limpiarBusquedaVia();
            });
        }

        document.addEventListener('click', e => {
            if (!contenedorBuscadorVias.contains(e.target)) {
                cerrarSugerenciasVias();
                cerrarBuscadorViasSiVacio();
            }
        });

        function enfocarVia(segmentos) {
            if (capaResaltadoVia) map.removeLayer(capaResaltadoVia);
            capaResaltadoVia = L.geoJson({ type: "FeatureCollection", features: segmentos }, { style: { className: 'via-resaltada-animacion' } }).addTo(map);
            var panelDetalle = document.getElementById('panel-usos');
            var movil = window.innerWidth <= 896;
            var espacioPanel = panelDetalle && !panelDetalle.classList.contains('minimizado')
                ? Math.round(panelDetalle.getBoundingClientRect().width) : 0;
            map.flyToBounds(capaResaltadoVia.getBounds(), {
                paddingTopLeft: [50, 50],
                paddingBottomRight: movil
                    ? [20, Math.round(window.innerHeight * 0.58)]
                    : [espacioPanel + 50, 50],
                maxZoom: 18,
                duration: 1.6,
                easeLinearity: 0.2
            });
        }
