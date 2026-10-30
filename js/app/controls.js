        L.control.scale({position: 'bottomright', metric: true, imperial: false}).addTo(map);
        var norteControl = L.control({position: 'bottomleft'});
        norteControl.onAdd = function (map) {
            var div = L.DomUtil.create('div', 'norte-magnetico-flotante');
            div.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                            '<polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>' +
                            '<text x="12" y="16" font-family="Arial" font-size="8" fill="#333" text-anchor="middle" stroke="none" font-weight="bold">N</text></svg>';
            return div;
        };
        norteControl.addTo(map);

        function cerrarPanelesMapa(excepto) {
            if (excepto !== 'anexos') {
                var anexos = document.getElementById('control-info-titulo');
                var botonAnexos = document.getElementById('boton-info-titulo');
                var panelAnexos = document.getElementById('panel-anexos');
                if (anexos && panelAnexos) {
                    anexos.classList.remove('anexos-abiertos');
                    anexos.classList.add('anexos-cerrados');
                    panelAnexos.setAttribute('aria-hidden', 'true');
                    if (botonAnexos) {
                        botonAnexos.setAttribute('aria-expanded', 'false');
                        botonAnexos.setAttribute('aria-label', 'Abrir anexos');
                    }
                }
            }

            if (excepto !== 'leyenda') {
                var leyenda = document.querySelector('.info.legend');
                var listaLeyenda = document.getElementById('leyenda-lista');
                var flechaLeyenda = document.getElementById('leyenda-arrow');
                var botonLeyenda = document.getElementById('leyenda-header');
                if (leyenda && listaLeyenda) {
                    listaLeyenda.style.display = 'none';
                    leyenda.classList.remove('leyenda-abierta');
                    leyenda.classList.add('leyenda-cerrada');
                    if (flechaLeyenda) flechaLeyenda.innerHTML = '▼';
                    if (botonLeyenda) {
                        botonLeyenda.setAttribute('aria-expanded', 'false');
                        botonLeyenda.setAttribute('aria-label', 'Abrir leyenda de usos');
                    }
                }
            }

            if (excepto !== 'capas') {
                var capas = document.getElementById('control-capas-auxiliares');
                var botonCapas = document.getElementById('boton-capas-auxiliares');
                var panelCapas = document.getElementById('panel-capas-auxiliares');
                if (capas && panelCapas) {
                    capas.classList.remove('capas-auxiliares-abiertas');
                    capas.classList.add('capas-auxiliares-cerradas');
                    panelCapas.setAttribute('aria-hidden', 'true');
                    if (botonCapas) {
                        botonCapas.setAttribute('aria-expanded', 'false');
                        botonCapas.setAttribute('aria-label', 'Abrir capas adicionales');
                    }
                }
            }

            if (excepto !== 'transparencia') {
                var transparencia = document.getElementById('control-transparencia-mapa');
                var botonTransparencia = document.getElementById('boton-transparencia-mapa');
                var panelTransparencia = document.getElementById('panel-transparencia-mapa');
                if (transparencia && panelTransparencia) {
                    transparencia.classList.remove('transparencia-abierta');
                    transparencia.classList.add('transparencia-cerrada');
                    panelTransparencia.setAttribute('aria-hidden', 'true');
                    if (botonTransparencia) {
                        botonTransparencia.setAttribute('aria-expanded', 'false');
                        botonTransparencia.setAttribute('aria-label', 'Abrir transparencia del mapa');
                    }
                }
            }
        }

        window.cerrarPanelesMapa = cerrarPanelesMapa;

        // --- ANEXOS OFICIALES ---
        var anexosControl = L.control({position: 'bottomleft'});
        anexosControl.onAdd = function() {
            var div = L.DomUtil.create('div', 'control-info-titulo anexos-cerrados');
            div.id = 'control-info-titulo';
            div.innerHTML =
                '<button type="button" id="boton-info-titulo" class="boton-info-titulo" aria-label="Abrir anexos" aria-expanded="false">' +
                    '<i class="fas fa-info-circle" aria-hidden="true"></i>' +
                '</button>' +
                '<section id="panel-anexos" class="panel-anexos mobile-tool-panel mobile-tool-panel--compact" aria-hidden="true" aria-labelledby="panel-anexos-titulo">' +
                    '<button type="button" id="panel-anexos-titulo" class="panel-anexos-titulo" aria-label="Cerrar anexos">' +
                        '<span><strong>Anexos</strong><small>Documentos oficiales del visor</small></span>' +
                        '<i class="fas fa-times" aria-hidden="true"></i>' +
                    '</button>' +
                    '<ol class="lista-anexos">' +
                        '<li><a href="anexos/01-Ordenanza-2851.pdf" target="_blank" rel="noopener"><i class="fas fa-file-pdf" aria-hidden="true"></i><span><strong>Ordenanza Nº 2851</strong><small>Ordenanza que aprueba el Índice de Usos para el distrito de San Borja</small></span></a></li>' +
                        '<li><a href="anexos/02-Anexo-01-Plano-Usos-Compatibles.pdf" target="_blank" rel="noopener"><i class="fas fa-file-pdf" aria-hidden="true"></i><span><strong>Anexo N° 01</strong><small>Plano de usos compatibles del distrito de San Borja</small></span></a></li>' +
                        '<li><a href="anexos/03-Anexo-02-Indice-Usos-CIIU-Rev4.pdf" target="_blank" rel="noopener"><i class="fas fa-file-pdf" aria-hidden="true"></i><span><strong>Anexo N° 02</strong><small>Índice de usos para la ubicación de actividades urbanas del distrito de San Borja - CIIU Rev. 4</small></span></a></li>' +
                        '<li><a href="anexos/04-Anexo-03-Indice-Usos-ZRE-CIIU-Rev4.pdf" target="_blank" rel="noopener"><i class="fas fa-file-pdf" aria-hidden="true"></i><span><strong>Anexo N° 03</strong><small>Índice de usos para las Zonas de Reglamentación Especial (ZRE) - CIIU Rev. 4</small></span></a></li>' +
                    '</ol>' +
                    '<div class="anexos-desplegable">' +
                        '<button type="button" id="boton-listado-aprobados" class="boton-listado-aprobados" aria-expanded="false" aria-controls="listado-aprobados">' +
                            '<span><i class="fas fa-check-circle" aria-hidden="true"></i>Listado de Clases aprobadas según Usos Compatibles</span>' +
                            '<i class="fas fa-chevron-down" aria-hidden="true"></i>' +
                        '</button>' +
                        '<div id="listado-aprobados" class="listado-aprobados" aria-hidden="true">' +
                            '<p>Seleccione un uso para consultar su listado aprobado.</p>' +
                            '<strong class="listado-aprobados-grupo">Usos compatibles</strong>' +
                            '<ul>' +
                                '<li><a href="anexos/listado-aprobados/Uso-Mixto-Especializado.pdf" target="_blank" rel="noopener">Uso Mixto Especializado</a></li>' +
                                '<li><a href="anexos/listado-aprobados/Uso-Mixto-Intensivo.pdf" target="_blank" rel="noopener">Uso Mixto Intensivo</a></li>' +
                                '<li><a href="anexos/listado-aprobados/Uso-Mixto-Metropolitano.pdf" target="_blank" rel="noopener">Uso Mixto Metropolitano</a></li>' +
                                '<li><a href="anexos/listado-aprobados/Uso-Mixto-Zonal.pdf" target="_blank" rel="noopener">Uso Mixto Zonal</a></li>' +
                                '<li><a href="anexos/listado-aprobados/Uso-Mixto-Vecinal.pdf" target="_blank" rel="noopener">Uso Mixto Vecinal</a></li>' +
                                '<li><a href="anexos/listado-aprobados/Uso-Residencial-Preferente.pdf" target="_blank" rel="noopener">Uso Residencial Preferente</a></li>' +
                                '<li><a href="anexos/listado-aprobados/Uso-Residencial-Especial.pdf" target="_blank" rel="noopener">Uso Residencial Especial</a></li>' +
                                '<li><a href="anexos/listado-aprobados/Uso-Especifico-Educacion.pdf" target="_blank" rel="noopener">Uso Específico - Educación</a></li>' +
                                '<li><a href="anexos/listado-aprobados/Uso-Especifico-Hospitales.pdf" target="_blank" rel="noopener">Uso Específico - Hospitales</a></li>' +
                                '<li><a href="anexos/listado-aprobados/Usos-Especificos-Otros-Usos.pdf" target="_blank" rel="noopener">Usos Específicos - Otros Usos</a></li>' +
                                '<li><a href="anexos/listado-aprobados/Uso-Recreacion-Publica.pdf" target="_blank" rel="noopener">Uso de Recreación Pública</a></li>' +
                            '</ul>' +
                            '<strong class="listado-aprobados-grupo">Planes Especiales</strong>' +
                            '<ul class="listado-zre">' +
                                '<li><a href="anexos/listado-aprobados/ZRE-1.pdf" target="_blank" rel="noopener">ZRE-1</a></li>' +
                                '<li><a href="anexos/listado-aprobados/ZRE-2.pdf" target="_blank" rel="noopener">ZRE-2</a></li>' +
                                '<li><a href="anexos/listado-aprobados/ZRE-3.pdf" target="_blank" rel="noopener">ZRE-3</a></li>' +
                                '<li><a href="anexos/listado-aprobados/ZRE-4.pdf" target="_blank" rel="noopener">ZRE-4</a></li>' +
                            '</ul>' +
                        '</div>' +
                    '</div>' +
                '</section>';
            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);
            return div;
        };
        anexosControl.addTo(map);

        (function iniciarAnexos() {
            var control = document.getElementById('control-info-titulo');
            var boton = document.getElementById('boton-info-titulo');
            var panel = document.getElementById('panel-anexos');
            var titulo = document.getElementById('panel-anexos-titulo');
            var botonListado = document.getElementById('boton-listado-aprobados');
            var listado = document.getElementById('listado-aprobados');

            function alternarListado(forzarAbierto) {
                var abrir = typeof forzarAbierto === 'boolean'
                    ? forzarAbierto
                    : listado.getAttribute('aria-hidden') === 'true';
                listado.setAttribute('aria-hidden', abrir ? 'false' : 'true');
                botonListado.setAttribute('aria-expanded', abrir ? 'true' : 'false');
            }

            function alternarPanel(forzarAbierto) {
                var abrir = typeof forzarAbierto === 'boolean'
                    ? forzarAbierto
                    : !control.classList.contains('anexos-abiertos');
                if (abrir) cerrarPanelesMapa('anexos');
                control.classList.toggle('anexos-abiertos', abrir);
                control.classList.toggle('anexos-cerrados', !abrir);
                panel.setAttribute('aria-hidden', abrir ? 'false' : 'true');
                boton.setAttribute('aria-expanded', abrir ? 'true' : 'false');
                boton.setAttribute('aria-label', abrir ? 'Cerrar anexos' : 'Abrir anexos');
                if (!abrir) alternarListado(false);
            }

            boton.addEventListener('click', function() { alternarPanel(); });
            titulo.addEventListener('click', function() { alternarPanel(false); });
            botonListado.addEventListener('click', function() { alternarListado(); });
            document.addEventListener('click', function(e) {
                if (!control.contains(e.target)) alternarPanel(false);
            });
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') alternarPanel(false);
            });
        })();

        // --- LEYENDA (INTERACTIVA) ---
        window.toggleConcepto = function(id) {
            var el = document.getElementById(id);
            document.querySelectorAll('.leyenda-concepto').forEach(c => { if(c.id !== id) c.style.display = 'none'; });
            el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'block' : 'none';
        };

        var legend = L.control({position: 'bottomleft'});
        legend.onAdd = function (map) {
            var div = L.DomUtil.create('div', 'info legend');
            div.classList.add('leyenda-cerrada');
            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);
            div.innerHTML += '<button type="button" id="leyenda-header" class="leyenda-header" aria-label="Abrir leyenda de usos" aria-expanded="false">' +
                             '<span class="leyenda-boton-icon" aria-hidden="true"></span>' +
                             '<span><strong>Leyenda de usos</strong><small>Colores del mapa</small></span>' +
                             '<span id="leyenda-arrow" class="leyenda-arrow">▼</span></button>';

            var listaHtml = '<div id="leyenda-lista" class="leyenda-lista mobile-tool-panel mobile-tool-panel--legend mobile-tool-panel--scrollable" style="display: none;">' +
                            '<button type="button" id="leyenda-panel-titulo" class="leyenda-panel-titulo" aria-label="Cerrar leyenda de usos"><strong>Leyenda de usos</strong><small>Colores del mapa</small></button>';

            var cats = [
                { id: 'Uso Mixto Especializado', n: 'Mixto Especializado', c: '#7a0403' }, { id: 'Uso Mixto Intensivo', n: 'Mixto Intensivo', c: '#b72020' },
                { id: 'Uso Mixto Metropolitano', n: 'Mixto Metropolitano', c: '#9b5847' }, { id: 'Uso Mixto Zonal', n: 'Mixto Zonal', c: '#f47a7a' },
                { id: 'Uso Mixto Vecinal', n: 'Mixto Vecinal', c: '#f27144' }, { id: 'Uso Residencial Preferente', n: 'Residencial Preferente', c: '#f4c644' },
                { id: 'Uso Residencial Especial', n: 'Residencial Especial', c: '#feac00' }, { id: 'Uso Residencial Exclusivo', n: 'Residencial Exclusivo', c: '#f4f4f4' },
                { id: 'Usos Específicos - Otros Usos', n: 'Usos Específicos - Otros Usos', c: '#818181' },
                { id: 'Usos Específicos - Educación', n: 'Usos Específicos - Educación', c: '#818181' },
                { id: 'Usos Específicos - Hospital', n: 'Usos Específicos - Hospital', c: '#818181' },
                { id: 'Uso de Recreación Pública', n: 'Recreación Pública', c: '#a4cda3' }
            ];

            cats.forEach((i, idx) => {
                var txt = definicionesZonas[i.id];
                if (window.categoriasUsoActivas && !i.tipo) window.categoriasUsoActivas[i.id] = true;
                listaHtml += `
                    <div class="leyenda-categoria-item">
                        <div class="leyenda-item-titulo">
                        <label class="leyenda-check-label" title="Mostrar u ocultar ${i.n}">
                            <input type="checkbox" class="leyenda-checkbox" data-uso="${i.id}" data-tipo="${i.tipo || 'uso'}" checked>
                            <span class="leyenda-check-custom" aria-hidden="true"></span>
                        </label>
                        <button type="button" class="leyenda-concepto-toggle" data-concepto="concepto-${idx}">
                            <i style="background: ${i.c};"></i> <span>${i.n}</span>
                        </button>
                    </div>
                    <div class="leyenda-opacidad-control">
                        <label for="opacidad-leyenda-${idx}"><span>Transparencia</span><output>0%</output></label>
                        <input type="range" id="opacidad-leyenda-${idx}" class="leyenda-opacidad" data-uso="${i.id}" min="0" max="100" step="5" value="0" aria-label="Transparencia de ${i.n}">
                    </div>
                    <div id="concepto-${idx}" class="leyenda-concepto">${txt}</div>
                </div>`;
            });
            div.innerHTML += listaHtml + '</div>';

            setTimeout(function() {
                var listaScroll = document.getElementById('leyenda-lista');
                if (listaScroll) {
                    var detenerPropagacionMapa = function(e) {
                        e.stopPropagation();
                    };
                    ['wheel', 'mousewheel', 'DOMMouseScroll', 'touchstart', 'touchmove', 'pointerdown', 'pointermove'].forEach(function(evento) {
                        listaScroll.addEventListener(evento, detenerPropagacionMapa, { passive: true });
                    });
                }

                function fijarLeyendaAbierta(abierta) {
                    var l = document.getElementById('leyenda-lista'); var a = document.getElementById('leyenda-arrow');
                    var botonPrincipal = document.getElementById('leyenda-header');
                    var contenedor = botonPrincipal.closest('.legend');
                    if (abierta) cerrarPanelesMapa('leyenda');
                    l.style.display = abierta ? 'block' : 'none';
                    a.innerHTML = abierta ? '▲' : '▼';
                    contenedor.classList.toggle('leyenda-abierta', abierta);
                    contenedor.classList.toggle('leyenda-cerrada', !abierta);
                    botonPrincipal.setAttribute('aria-expanded', abierta ? 'true' : 'false');
                    botonPrincipal.setAttribute('aria-label', abierta ? 'Cerrar leyenda de usos' : 'Abrir leyenda de usos');
                }

                document.getElementById('leyenda-header').addEventListener('click', function() {
                    fijarLeyendaAbierta(document.getElementById('leyenda-lista').style.display === 'none');
                });

                document.getElementById('leyenda-panel-titulo').addEventListener('click', function() {
                    fijarLeyendaAbierta(false);
                });

                document.querySelectorAll('.leyenda-concepto-toggle').forEach(function(btn) {
                    btn.addEventListener('click', function() {
                        toggleConcepto(this.getAttribute('data-concepto'));
                    });
                });

                document.querySelectorAll('.leyenda-checkbox').forEach(function(chk) {
                    chk.addEventListener('change', function() {
                        var listaLeyenda = this.closest('.leyenda-lista');
                        var scrollLeyenda = listaLeyenda ? listaLeyenda.scrollTop : 0;

                        if (!window.categoriasUsoActivas) window.categoriasUsoActivas = {};
                        window.categoriasUsoActivas[this.getAttribute('data-uso')] = this.checked;
                        if (window.actualizarVisibilidadUsos) window.actualizarVisibilidadUsos();

                        if (listaLeyenda) {
                            requestAnimationFrame(function() {
                                listaLeyenda.scrollTop = scrollLeyenda;
                            });
                        }
                    });
                });

                document.querySelectorAll('.leyenda-opacidad').forEach(function(controlOpacidad) {
                    controlOpacidad.addEventListener('input', function() {
                        var valor = Number(this.value);
                        this.parentElement.querySelector('output').textContent = valor + '%';
                        if (window.establecerOpacidadCategoriaUso) {
                            window.establecerOpacidadCategoriaUso(this.getAttribute('data-uso'), 1 - valor / 100);
                        }
                    });
                });
            }, 100);
            return div;
        };
        legend.addTo(map);

        // --- CAPAS AUXILIARES: RETIROS Y PLANES ESPECIALES ---
        var capasAuxiliaresControl = L.control({position: 'bottomleft'});
        capasAuxiliaresControl.onAdd = function() {
            var div = L.DomUtil.create('div', 'control-capas-auxiliares capas-auxiliares-cerradas');
            div.id = 'control-capas-auxiliares';
            div.innerHTML =
                '<button type="button" id="boton-capas-auxiliares" class="boton-capas-auxiliares" aria-label="Abrir capas adicionales" aria-expanded="false">' +
                    '<i class="fas fa-clone" aria-hidden="true"></i>' +
                '</button>' +
                '<div id="panel-capas-auxiliares" class="panel-capas-auxiliares mobile-tool-panel mobile-tool-panel--compact" aria-hidden="true">' +
                    '<button type="button" id="panel-capas-titulo" class="panel-capas-titulo" aria-label="Cerrar capas adicionales"><i class="fas fa-clone" aria-hidden="true"></i><span>Capas del mapa</span></button>' +
                    '<div class="capa-opacidad-grupo">' +
                        '<label class="capa-auxiliar-item" for="capa-retiro-visible">' +
                            '<input type="checkbox" id="capa-retiro-visible" checked>' +
                            '<span class="capa-auxiliar-check" aria-hidden="true"></span>' +
                            '<i class="muestra-capa muestra-retiro" aria-hidden="true"></i>' +
                            '<span>Retiro normativo</span>' +
                        '</label>' +
                        '<div class="capa-opacidad-control">' +
                            '<label for="opacidad-capa-retiro"><span>Transparencia</span><output>0%</output></label>' +
                            '<input type="range" class="opacidad-capa-range" id="opacidad-capa-retiro" data-capa-opacidad="retiros" min="0" max="100" step="5" value="0" aria-label="Transparencia del retiro normativo">' +
                        '</div>' +
                    '</div>' +
                    '<div class="capa-opacidad-grupo">' +
                        '<label class="capa-auxiliar-item" for="capa-zonificacion-vigente">' +
                            '<input type="checkbox" id="capa-zonificacion-vigente">' +
                            '<span class="capa-auxiliar-check" aria-hidden="true"></span>' +
                            '<i class="muestra-capa muestra-zonificacion-vigente" aria-hidden="true"></i>' +
                            '<span>Zonificación vigente</span>' +
                        '</label>' +
                        '<div id="leyenda-zonificacion-vigente" class="leyenda-zonificacion-vigente" hidden>' +
                            '<span><i class="zv-muestra zv-rdb"></i>RDB</span><span><i class="zv-muestra zv-rdm"></i>RDM</span><span><i class="zv-muestra zv-rda"></i>RDA</span>' +
                            '<span><i class="zv-muestra zv-cv"></i>CV</span><span><i class="zv-muestra zv-cz"></i>CZ</span><span><i class="zv-muestra zv-zrp"></i>ZRP</span>' +
                            '<span><i class="zv-muestra zv-e1"></i>E1</span><span><i class="zv-muestra zv-e2"></i>E2</span><span><i class="zv-muestra zv-e3"></i>E3</span>' +
                            '<span><i class="zv-muestra zv-h2"></i>H2</span><span><i class="zv-muestra zv-h3"></i>H3</span><span><i class="zv-muestra zv-ou"></i>OU</span>' +
                            '<span><i class="zv-muestra zv-zre"></i>ZRE</span><span><i class="zv-muestra zv-otros"></i>Sin código</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="capa-zre-grupo">' +
                        '<div class="capa-zre-principal">' +
                            '<label class="capa-auxiliar-item capa-zre-item-principal" for="capa-zre-visible">' +
                                '<input type="checkbox" id="capa-zre-visible" checked>' +
                                '<span class="capa-auxiliar-check" aria-hidden="true"></span>' +
                                '<i class="muestra-capa muestra-zre" aria-hidden="true"></i>' +
                                '<span>Planes Especiales (ZRE)</span>' +
                            '</label>' +
                            '<button type="button" id="boton-desplegar-zre" class="boton-desplegar-zre" aria-label="Mostrar zonas de reglamentación especial" aria-expanded="false">' +
                                '<i class="fas fa-chevron-down" aria-hidden="true"></i>' +
                            '</button>' +
                        '</div>' +
                        '<div class="capa-opacidad-control capa-opacidad-zre-global">' +
                            '<label for="opacidad-capa-zre"><span>Transparencia general</span><output>0%</output></label>' +
                            '<input type="range" class="opacidad-capa-range" id="opacidad-capa-zre" data-capa-opacidad="zre-global" min="0" max="100" step="5" value="0" aria-label="Transparencia general de Planes Especiales">' +
                        '</div>' +
                        '<div id="lista-zonas-zre" class="lista-zonas-zre" aria-hidden="true">' +
                            '<p class="capa-zre-descripcion">' + definicionesZonas['Planes Especiales'] + '</p>' +
                            '<div class="capa-opacidad-grupo capa-opacidad-zre-subgrupo">' +
                                '<label class="capa-auxiliar-item capa-zre-subitem" for="capa-zre-1-visible">' +
                                    '<input type="checkbox" id="capa-zre-1-visible" data-zre="ZRE-1" checked>' +
                                    '<span class="capa-auxiliar-check" aria-hidden="true"></span>' +
                                    '<span><strong>ZRE-1</strong><small>San Juan Masías, El Bosque y Pequeños Agricultores</small></span>' +
                                '</label>' +
                                '<div class="capa-opacidad-control"><label for="opacidad-capa-zre-1"><span>Transparencia</span><output>0%</output></label><input type="range" class="opacidad-capa-range" id="opacidad-capa-zre-1" data-capa-opacidad="ZRE-1" min="0" max="100" step="5" value="0" aria-label="Transparencia ZRE-1"></div>' +
                            '</div>' +
                            '<div class="capa-opacidad-grupo capa-opacidad-zre-subgrupo">' +
                                '<label class="capa-auxiliar-item capa-zre-subitem" for="capa-zre-2-visible">' +
                                    '<input type="checkbox" id="capa-zre-2-visible" data-zre="ZRE-2" checked>' +
                                    '<span class="capa-auxiliar-check" aria-hidden="true"></span>' +
                                    '<span><strong>ZRE-2</strong><small>Papa Juan XXIII</small></span>' +
                                '</label>' +
                                '<div class="capa-opacidad-control"><label for="opacidad-capa-zre-2"><span>Transparencia</span><output>0%</output></label><input type="range" class="opacidad-capa-range" id="opacidad-capa-zre-2" data-capa-opacidad="ZRE-2" min="0" max="100" step="5" value="0" aria-label="Transparencia ZRE-2"></div>' +
                            '</div>' +
                            '<div class="capa-opacidad-grupo capa-opacidad-zre-subgrupo">' +
                                '<label class="capa-auxiliar-item capa-zre-subitem" for="capa-zre-3-visible">' +
                                    '<input type="checkbox" id="capa-zre-3-visible" data-zre="ZRE-3" checked>' +
                                    '<span class="capa-auxiliar-check" aria-hidden="true"></span>' +
                                    '<span><strong>ZRE-3</strong><small>Área rústica del Subsector 12-A</small></span>' +
                                '</label>' +
                                '<div class="capa-opacidad-control"><label for="opacidad-capa-zre-3"><span>Transparencia</span><output>0%</output></label><input type="range" class="opacidad-capa-range" id="opacidad-capa-zre-3" data-capa-opacidad="ZRE-3" min="0" max="100" step="5" value="0" aria-label="Transparencia ZRE-3"></div>' +
                            '</div>' +
                            '<div class="capa-opacidad-grupo capa-opacidad-zre-subgrupo">' +
                                '<label class="capa-auxiliar-item capa-zre-subitem" for="capa-zre-4-visible">' +
                                    '<input type="checkbox" id="capa-zre-4-visible" data-zre="ZRE-4" checked>' +
                                    '<span class="capa-auxiliar-check" aria-hidden="true"></span>' +
                                    '<span><strong>ZRE-4</strong><small>Centro Cultural de la Nación</small></span>' +
                                '</label>' +
                                '<div class="capa-opacidad-control"><label for="opacidad-capa-zre-4"><span>Transparencia</span><output>0%</output></label><input type="range" class="opacidad-capa-range" id="opacidad-capa-zre-4" data-capa-opacidad="ZRE-4" min="0" max="100" step="5" value="0" aria-label="Transparencia ZRE-4"></div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';

            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);
            return div;
        };
        capasAuxiliaresControl.addTo(map);

        var consultaCiiuControl = L.control({position: 'bottomleft'});
        consultaCiiuControl.onAdd = function() {
            var div = L.DomUtil.create('div', 'control-consulta-ciiu');
            div.id = 'control-consulta-ciiu';
            div.innerHTML = '<button type="button" id="boton-consulta-ciiu" class="boton-consulta-ciiu" aria-label="Abrir consulta de actividades por CIIU" title="Consulta de actividades por CIIU"><i class="fas fa-list-alt" aria-hidden="true"></i></button>';
            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);
            return div;
        };
        consultaCiiuControl.addTo(map);

        (function iniciarCapasAuxiliares() {
            var control = document.getElementById('control-capas-auxiliares');
            var boton = document.getElementById('boton-capas-auxiliares');
            var panel = document.getElementById('panel-capas-auxiliares');
            var tituloPanel = document.getElementById('panel-capas-titulo');
            var retiroVisible = document.getElementById('capa-retiro-visible');
            var zrePrincipal = document.getElementById('capa-zre-visible');
            var botonZre = document.getElementById('boton-desplegar-zre');
            var listaZre = document.getElementById('lista-zonas-zre');
            var checksZre = Array.prototype.slice.call(document.querySelectorAll('.capa-zre-subitem input[data-zre]'));
            Array.prototype.forEach.call(document.querySelectorAll('.opacidad-capa-range'), function(controlOpacidad) {
                controlOpacidad.addEventListener('input', function() {
                    var valor = Number(this.value);
                    this.parentElement.querySelector('output').textContent = valor + '%';
                    var tipo = this.getAttribute('data-capa-opacidad');
                    if (tipo === 'retiros' && window.establecerOpacidadRetiros) {
                        window.establecerOpacidadRetiros(1 - valor / 100);
                    } else if (tipo === 'zre-global' && window.establecerOpacidadPlanesEspeciales) {
                        window.establecerOpacidadPlanesEspeciales(1 - valor / 100);
                    } else if (/^ZRE-[1-4]$/.test(tipo) && window.establecerOpacidadZre) {
                        window.establecerOpacidadZre(tipo, 1 - valor / 100);
                    }
                });
            });

            function alternarPanel(forzarAbierto) {
                var abrir = typeof forzarAbierto === 'boolean'
                    ? forzarAbierto
                    : !control.classList.contains('capas-auxiliares-abiertas');

                if (abrir) cerrarPanelesMapa('capas');
                control.classList.toggle('capas-auxiliares-abiertas', abrir);
                control.classList.toggle('capas-auxiliares-cerradas', !abrir);
                boton.setAttribute('aria-expanded', abrir ? 'true' : 'false');
                boton.setAttribute('aria-label', abrir ? 'Cerrar capas adicionales' : 'Abrir capas adicionales');
                panel.setAttribute('aria-hidden', abrir ? 'false' : 'true');
            }

            boton.addEventListener('click', function() { alternarPanel(); });
            tituloPanel.addEventListener('click', function() { alternarPanel(false); });
            if (retiroVisible) {
                retiroVisible.addEventListener('change', function() {
                    if (!window.capaRetiros) return;
                    if (this.checked) {
                        if (!map.hasLayer(window.capaRetiros)) map.addLayer(window.capaRetiros);
                    } else if (map.hasLayer(window.capaRetiros)) {
                        map.removeLayer(window.capaRetiros);
                        if (window.limpiarRetiroResaltado) window.limpiarRetiroResaltado();
                        map.closePopup();
                    }
                });
            }
            function sincronizarCheckZrePrincipal() {
                var activas = checksZre.filter(function(check) { return check.checked; }).length;
                zrePrincipal.checked = activas === checksZre.length;
                zrePrincipal.indeterminate = activas > 0 && activas < checksZre.length;
            }

            function actualizarZonasZre() {
                window.zonasZreActivas = window.zonasZreActivas || {};
                checksZre.forEach(function(check) {
                    window.zonasZreActivas[check.getAttribute('data-zre')] = check.checked;
                });
                sincronizarCheckZrePrincipal();
                if (window.actualizarVisibilidadUsos) window.actualizarVisibilidadUsos();
            }

            function alternarListaZre(forzarAbierta) {
                var abrir = typeof forzarAbierta === 'boolean'
                    ? forzarAbierta
                    : listaZre.getAttribute('aria-hidden') === 'true';
                listaZre.setAttribute('aria-hidden', abrir ? 'false' : 'true');
                botonZre.setAttribute('aria-expanded', abrir ? 'true' : 'false');
                botonZre.setAttribute('aria-label', abrir ? 'Ocultar zonas de reglamentación especial' : 'Mostrar zonas de reglamentación especial');
            }

            botonZre.addEventListener('click', function() { alternarListaZre(); });
            zrePrincipal.addEventListener('change', function() {
                var visible = this.checked;
                checksZre.forEach(function(check) { check.checked = visible; });
                actualizarZonasZre();
                alternarListaZre(true);
            });
            checksZre.forEach(function(check) {
                check.addEventListener('change', actualizarZonasZre);
            });

            document.addEventListener('click', function(e) {
                if (!control.contains(e.target)) alternarPanel(false);
            });
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') alternarPanel(false);
            });
        })();

        var transparenciaControl = L.control({position: 'bottomleft'});
        transparenciaControl.onAdd = function() {
            var div = L.DomUtil.create('div', 'control-transparencia-mapa transparencia-cerrada');
            div.id = 'control-transparencia-mapa';
            div.setAttribute('aria-label', 'Control de transparencia del mapa');
            div.innerHTML =
                '<button type="button" id="boton-transparencia-mapa" class="boton-transparencia-mapa" aria-label="Abrir transparencia del mapa" aria-expanded="false">' +
                    '<i class="fas fa-adjust" aria-hidden="true"></i>' +
                '</button>' +
                '<div id="panel-transparencia-mapa" class="panel-transparencia-mapa mobile-tool-panel mobile-tool-panel--compact" aria-hidden="true">' +
                    '<label for="map-opacity">' +
                        '<i class="fas fa-layer-group" aria-hidden="true"></i>' +
                        '<span>Transparencia del mapa</span>' +
                    '</label>' +
                    '<input type="range" id="map-opacity" min="0" max="0.95" step="0.05" value="0.5" aria-label="Transparencia del mapa">' +
                '</div>';
            return div;
        };
        transparenciaControl.addTo(map);

        // --- LÓGICA DE VÍAS ---
        function actualizarTamanioLetrasVias() {
            var zoom = map.getZoom();
            var root = document.documentElement;
            var fe = '0px', fa = '0px', fc = '0px', fl = '0px';
            var oe = 0, oa = 0, oc = 0, ol = 0;

            if (zoom >= 17) { fe = '16px'; fa = '15px'; fc = '13px'; fl = '11px'; oe = 1; oa = 1; oc = 1; ol = 1; }
            else if (zoom === 16) { fe = '14px'; fa = '12px'; fc = '10px'; fl = '0px'; oe = 1; oa = 1; oc = 1; ol = 0; }
            else if (zoom === 15) { fe = '11px'; fa = '10px'; fc = '0px'; fl = '0px'; oe = 1; oa = 1; oc = 0; ol = 0; }
            else if (zoom <= 14) { fe = '10px'; fa = '0px'; fc = '0px'; fl = '0px'; oe = 1; oa = 0; oc = 0; ol = 0; }

            root.style.setProperty('--font-expresa', fe); root.style.setProperty('--op-expresa', oe);
            root.style.setProperty('--font-arterial', fa); root.style.setProperty('--op-arterial', oa);
            root.style.setProperty('--font-colectora', fc); root.style.setProperty('--op-colectora', oc);
            root.style.setProperty('--font-local', fl); root.style.setProperty('--op-local', ol);
        }
        map.on('zoomend', actualizarTamanioLetrasVias); actualizarTamanioLetrasVias();
