(function () {
    var tituloPrincipal = document.getElementById('titulo-visor-principal');
    var tituloOriginal = tituloPrincipal ? tituloPrincipal.textContent : '';
    var subtitulo = document.querySelector('.encabezado-subtitulo');
    var subtituloOriginal = subtitulo ? subtitulo.textContent : '';
    var cabecera = document.getElementById('retiros-cabecera');
    var estado = document.getElementById('retiros-estado');
    var capaRetirosContexto = null;
    var capaRetirosLotes = null;
    var capaRetirosCompatibles = null;
    var capaRetirosPoligonos = null;
    var capaRetirosLineas3m = null;
    var capaRetirosLineas5m = null;
    var capaRetirosSeleccionada = null;
    var panelCapas = document.getElementById('panel-capas-retiros');
    var panelDetalle = document.getElementById('panel-usos');
    var botonDetalleMovil = document.getElementById('boton-detalle-movil');
    var estiloBotonDetalleMovil = botonDetalleMovil ? botonDetalleMovil.style.display : '';
    var botonDetalleMovilOculto = botonDetalleMovil ? botonDetalleMovil.hidden : false;
    var tituloDetalle = document.getElementById('nombre-uso-titulo');
    var ayudaDetalle = document.getElementById('ayuda-panel');
    var detalleRetiros = document.getElementById('retiros-detalle');
    var camposDetalleRetiros = document.getElementById('retiros-detalle-campos');
    var tituloPanelOriginal = document.querySelector('#panel-usos .cabecera-negra h4');
    var tituloPanelTextoOriginal = tituloPanelOriginal ? tituloPanelOriginal.textContent : '';
    var panelCapasAuxiliares = document.getElementById('panel-capas-auxiliares');
    var botonCapasAuxiliares = document.getElementById('boton-capas-auxiliares');
    var contenidoBotonCapasOriginal = botonCapasAuxiliares ? botonCapasAuxiliares.innerHTML : '';
    var etiquetaBotonCapasOriginal = botonCapasAuxiliares ? botonCapasAuxiliares.getAttribute('aria-label') : '';
    var cargaBase = null;
    var cargaPredios = null;
    var preparacionPredios = null;
    var estadoAnterior = null;
    var activo = false;
    var sesion = 0;
    var indiceClicPoligonos = Object.create(null);
    var informacionLinealPorArea = new WeakMap();
    var indiceLineasClic = null;
    var tamanoCeldaClic = 0.001;
    var ultimoClicDeCapa = null;
    var ultimoCursorRetiros = 0;
    var mapaArrastrandose = false;

    function agregarScript(ruta) {
        return new Promise(function (resolve, reject) {
            var script = document.createElement('script');
            script.src = ruta;
            script.async = true;
            script.onload = resolve;
            script.onerror = function () {
                script.remove();
                reject(new Error('No se pudo cargar ' + ruta));
            };
            document.head.appendChild(script);
        });
    }

    function cargarDatosBase() {
        if (cargaBase) return cargaBase;
        if (window.geojsonRetirosContexto && window.json_Polgono_retiros_concdigos_0 && window.geojsonRetirosLineas) return Promise.resolve();
        cargaBase = Promise.all([
            window.geojsonRetirosContexto || agregarScript('data/retiros_contexto.js?v=20261009-1'),
            window.geojsonRetirosLineas || agregarScript('data/retiros_lineas.js?v=20261009-1'),
            window.json_Polgono_retiros_concdigos_0 || agregarScript('data/retiros_poligonos_completos_20261013.js?v=20261013-retiros-capa-completa1')
        ]).catch(function (error) {
            cargaBase = null;
            throw error;
        });
        return cargaBase;
    }

    function cargarDatosPredios() {
        if (cargaPredios) return cargaPredios;
        if (window.geojsonRetirosLotes && window.geojsonRetirosCompatibles) return Promise.resolve();
        cargaPredios = Promise.all([
            agregarScript('data/retiros_lotes.js?v=20261009-1'),
            agregarScript('data/retiros_compatibles.js?v=20261009-1')
        ]).catch(function (error) {
            cargaPredios = null;
            throw error;
        });
        return cargaPredios;
    }

    function textoSeguro(valor) {
        return String(valor === null || valor === undefined || valor === '' ? 'No disponible' : valor)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function areaGeometriaM2(geometria) {
        if (!geometria || !geometria.coordinates) return 0;
        var radio = 6378137;
        function areaAnillo(anillo) {
            var suma = 0;
            for (var i = 0; i < anillo.length - 1; i++) {
                var a = anillo[i], b = anillo[i + 1];
                suma += (b[0] - a[0]) * Math.PI / 180 * (2 + Math.sin(a[1] * Math.PI / 180) + Math.sin(b[1] * Math.PI / 180));
            }
            return Math.abs(suma * radio * radio / 2);
        }
        function areaPoligono(poligono) {
            if (!poligono.length) return 0;
            return Math.max(0, areaAnillo(poligono[0]) - poligono.slice(1).reduce(function (total, anillo) { return total + areaAnillo(anillo); }, 0));
        }
        if (geometria.type === 'Polygon') return areaPoligono(geometria.coordinates);
        if (geometria.type === 'MultiPolygon') return geometria.coordinates.reduce(function (total, poligono) { return total + areaPoligono(poligono); }, 0);
        return 0;
    }

    function limitesGeometria(geometria) {
        if (!geometria || !geometria.coordinates) return null;
        var limites = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
        function visitar(coordenadas) {
            if (!coordenadas) return;
            if (typeof coordenadas[0] === 'number' && typeof coordenadas[1] === 'number') {
                limites.minX = Math.min(limites.minX, coordenadas[0]);
                limites.maxX = Math.max(limites.maxX, coordenadas[0]);
                limites.minY = Math.min(limites.minY, coordenadas[1]);
                limites.maxY = Math.max(limites.maxY, coordenadas[1]);
                return;
            }
            coordenadas.forEach(visitar);
        }
        visitar(geometria.coordinates);
        return Number.isFinite(limites.minX) ? limites : null;
    }

    function celdaClic(x, y) { return Math.floor(x / tamanoCeldaClic) + ':' + Math.floor(y / tamanoCeldaClic); }

    function indexarPoligonos(datos, titulo, prioridad) {
        (datos && datos.features || []).forEach(function (feature) {
            if (!feature.geometry || !/Polygon/.test(feature.geometry.type)) return;
            var geometria = feature.geometry;
            var partes = geometria.type === 'Polygon' ? [geometria] : geometria.coordinates.map(function (coordenadas) {
                return { type: 'Polygon', coordinates: coordenadas };
            });
            partes.forEach(function (parte) {
                var limites = limitesGeometria(parte);
                if (!limites) return;
                var registro = { feature: feature, geometria: parte, titulo: titulo, limites: limites, prioridad: prioridad };
                var minX = Math.floor(limites.minX / tamanoCeldaClic);
                var maxX = Math.floor(limites.maxX / tamanoCeldaClic);
                var minY = Math.floor(limites.minY / tamanoCeldaClic);
                var maxY = Math.floor(limites.maxY / tamanoCeldaClic);
                for (var x = minX; x <= maxX; x++) {
                    for (var y = minY; y <= maxY; y++) {
                        var llave = x + ':' + y;
                        if (!indiceClicPoligonos[llave]) indiceClicPoligonos[llave] = [];
                        indiceClicPoligonos[llave].push(registro);
                    }
                }
            });
        });
    }

    function puntoEnAnillo(punto, anillo) {
        var dentro = false;
        for (var i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
            var xi = anillo[i][0], yi = anillo[i][1], xj = anillo[j][0], yj = anillo[j][1];
            var cruza = ((yi > punto[1]) !== (yj > punto[1])) &&
                (punto[0] < (xj - xi) * (punto[1] - yi) / ((yj - yi) || 1e-15) + xi);
            if (cruza) dentro = !dentro;
        }
        return dentro;
    }

    function puntoEnGeometria(punto, geometria) {
        var poligonos = geometria.type === 'Polygon' ? [geometria.coordinates] : geometria.coordinates;
        return poligonos.some(function (poligono) {
            return poligono.length && puntoEnAnillo(punto, poligono[0]) &&
                !poligono.slice(1).some(function (hueco) { return puntoEnAnillo(punto, hueco); });
        });
    }

    function poligonoBajoPunto(punto) {
        var candidatos = indiceClicPoligonos[celdaClic(punto[0], punto[1])] || [];
        for (var i = 0; i < candidatos.length; i++) {
            var candidato = candidatos[i], limites = candidato.limites;
            var capa = candidato.titulo === 'Área de retiro' ? capaRetirosPoligonos :
                candidato.titulo === 'Lote compatible' ? capaRetirosCompatibles :
                candidato.titulo === 'Área urbana' ? capaRetirosContexto : capaRetirosLotes;
            if (!capa || !map.hasLayer(capa)) continue;
            if (punto[0] < limites.minX || punto[0] > limites.maxX ||
                punto[1] < limites.minY || punto[1] > limites.maxY) continue;
            if (puntoEnGeometria(punto, candidato.geometria)) return candidato;
        }
        return null;
    }

    function buscarPoligonoPorClic(e) {
        if (!activo || !e || !e.latlng) return;
        if (ultimoClicDeCapa && Date.now() - ultimoClicDeCapa.tiempo < 120 &&
            map.distance(ultimoClicDeCapa.latlng, e.latlng) < 1) return;
        var linea = lineaBajoPunto(e.latlng);
        if (linea) {
            map.closePopup();
            mostrarDetalle('Línea de retiro', linea.feature.properties, linea.feature, e.latlng,
                { type: 'LineString', coordinates: linea.linea });
            return;
        }
        var candidato = poligonoBajoPunto([e.latlng.lng, e.latlng.lat]);
        if (!candidato) return;
        map.closePopup();
        var propiedades = candidato.feature.properties;
        if (candidato.titulo === 'Área de retiro') {
            propiedades = informacionLinealPorArea.get(candidato.feature) || {};
        }
        mostrarDetalle(candidato.titulo, propiedades, candidato.feature, e.latlng, candidato.geometria);
    }

    function lineaBajoPunto(latlng) {
        if (!indiceLineasClic) return null;
        var indice = indiceLineasClic, p = map.latLngToContainerPoint(latlng);
        var a = map.containerPointToLatLng(p.subtract([8, 8]));
        var b = map.containerPointToLatLng(p.add([8, 8]));
        var minX = Math.floor(Math.min(a.lng, b.lng) / indice.tamano), maxX = Math.floor(Math.max(a.lng, b.lng) / indice.tamano);
        var minY = Math.floor(Math.min(a.lat, b.lat) / indice.tamano), maxY = Math.floor(Math.max(a.lat, b.lat) / indice.tamano);
        if ((maxX-minX+1)*(maxY-minY+1) > 4096) return null;
        var vistos = new Set(), mejor = null, distancia = 8;
        for (var x = minX; x <= maxX; x++) for (var y = minY; y <= maxY; y++) {
            (indice.celdas[x + ':' + y] || []).forEach(function (id) {
                if (vistos.has(id)) return;
                vistos.add(id);
                var s = indice.segmentos[id];
                var ancho = String(s.feature.properties.ANCHO || '');
                var capa = ancho.indexOf('3') === 0 ? capaRetirosLineas3m : ancho.indexOf('5') === 0 ? capaRetirosLineas5m : null;
                if (!capa || !map.hasLayer(capa)) return;
                var d = L.LineUtil.pointToSegmentDistance(p,
                    map.latLngToContainerPoint([s.a[1], s.a[0]]), map.latLngToContainerPoint([s.b[1], s.b[0]]));
                if (d < distancia) { distancia = d; mejor = s; }
            });
        }
        return mejor;
    }

    function actualizarCursorRetiros(e) {
        if (!activo || mapaArrastrandose || !e || !e.latlng) return;
        var ahora = Date.now();
        if (ahora - ultimoCursorRetiros < 80) return;
        ultimoCursorRetiros = ahora;
        var candidato = poligonoBajoPunto([e.latlng.lng, e.latlng.lat]);
        map.getContainer().classList.toggle('retiros-cursor-clicable', Boolean(candidato));
    }

    map.on('dragstart', function () { mapaArrastrandose = true; });
    map.on('dragend', function () {
        mapaArrastrandose = false;
        map.getContainer().classList.remove('retiros-cursor-clicable');
    });
    map.on('click', buscarPoligonoPorClic);
    map.on('mousemove', actualizarCursorRetiros);
    map.on('mouseout', function () {
        map.getContainer().classList.remove('retiros-cursor-clicable');
    });

    function mostrarDetalle(titulo, propiedades, feature, latlng, geometriaSeleccionada) {
        if (!activo || !latlng) return;
        propiedades = propiedades || {};
        var entradas = Object.keys(propiedades).filter(function (clave) {
            return propiedades[clave] !== null && propiedades[clave] !== undefined && String(propiedades[clave]).trim() !== '';
        });
        var html = '';
        entradas.forEach(function (clave) {
            var valor = propiedades[clave];
            if (clave === 'AREA' && Number.isFinite(Number(valor))) {
                valor = Number(valor).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²';
            }
            html += '<div class="retiros-dato"><span>' + textoSeguro(clave.replace(/_/g, ' ')) + '</span><strong>' + textoSeguro(valor) + '</strong></div>';
        });
        if (titulo !== 'Área de retiro' && feature && feature.geometry && /Polygon/.test(feature.geometry.type)) {
            var area = areaGeometriaM2(feature.geometry);
            if (area > 0 && !Object.keys(propiedades).some(function (k) {
                return /area/i.test(k) && propiedades[k] !== null && propiedades[k] !== undefined && String(propiedades[k]).trim() !== '';
            })) {
                html += '<div class="retiros-dato"><span>Área calculada</span><strong>' + area.toLocaleString('es-PE', { maximumFractionDigits: 1 }) + ' m²</strong></div>';
            }
        }
        if (!html) {
            var mensajeSinDatos = titulo === 'Área de retiro'
                ? 'No se encontró una línea cercana con datos de ancho y compatibilidad suficientemente confiables.'
                : 'Este elemento no tiene atributos asociados; se muestra su geometría de referencia.';
            html = '<p class="retiros-sin-datos">' + textoSeguro(mensajeSinDatos) + '</p>';
        }
        var contenido = '<div class="retiros-popup-ficha"><strong class="retiros-popup-titulo">' +
            textoSeguro(titulo) + '</strong><div class="retiros-popup-campos">' + html + '</div></div>';
        var popup = L.popup({
            className: 'popup-retiros-ficha',
            closeButton: true,
            maxWidth: 300,
            minWidth: 150,
            autoPan: true,
            autoPanPaddingTopLeft: [18, 72],
            autoPanPaddingBottomRight: [18, 24]
        }).setLatLng(latlng).setContent(contenido);
        popup.on('remove', limpiarResaltadoRetiros);
        popup.openOn(map);
        resaltarElementoRetiros(feature, latlng, geometriaSeleccionada);
    }

    function limpiarResaltadoRetiros() {
        if (capaRetirosSeleccionada && map.hasLayer(capaRetirosSeleccionada)) {
            map.removeLayer(capaRetirosSeleccionada);
        }
        capaRetirosSeleccionada = null;
    }

    function geometriaLineaMasCercana(geometria, latlng) {
        if (!geometria || !latlng) return geometria;
        var lineas = geometria.type === 'LineString' ? [geometria.coordinates]
            : geometria.type === 'MultiLineString' ? geometria.coordinates : [];
        if (!lineas.length) return geometria;
        var punto = map.latLngToLayerPoint(latlng);
        var indiceMasCercano = 0;
        var distanciaMinima = Infinity;
        lineas.forEach(function (linea, indice) {
            for (var i = 1; i < linea.length; i++) {
                var a = map.latLngToLayerPoint([linea[i - 1][1], linea[i - 1][0]]);
                var b = map.latLngToLayerPoint([linea[i][1], linea[i][0]]);
                var dx = b.x - a.x, dy = b.y - a.y;
                var longitudCuadrada = dx * dx + dy * dy;
                var t = longitudCuadrada ? ((punto.x - a.x) * dx + (punto.y - a.y) * dy) / longitudCuadrada : 0;
                t = Math.max(0, Math.min(1, t));
                var diferenciaX = punto.x - (a.x + t * dx);
                var diferenciaY = punto.y - (a.y + t * dy);
                var distancia = diferenciaX * diferenciaX + diferenciaY * diferenciaY;
                if (distancia < distanciaMinima) {
                    distanciaMinima = distancia;
                    indiceMasCercano = indice;
                }
            }
        });
        return { type: 'LineString', coordinates: lineas[indiceMasCercano] };
    }

    function resaltarElementoRetiros(feature, latlng, geometriaSeleccionada) {
        limpiarResaltadoRetiros();
        if (!feature || !feature.geometry) return;
        var geometria = geometriaSeleccionada || geometriaLineaMasCercana(feature.geometry, latlng);
        var esLinea = /LineString/.test(geometria.type);
        var nombrePane = 'pane_retiros_seleccionado';
        if (!map.getPane(nombrePane)) map.createPane(nombrePane);
        var pane = map.getPane(nombrePane);
        pane.style.zIndex = 450;
        pane.style.pointerEvents = 'none';
        var renderer = L.canvas({ pane: nombrePane, padding: 0.1 });
        capaRetirosSeleccionada = L.geoJSON({
            type: 'Feature', properties: feature.properties || {}, geometry: geometria
        }, {
            pane: nombrePane,
            renderer: renderer,
            interactive: false,
            style: esLinea ? {
                color: '#00aeea', weight: 7, opacity: 1,
                lineCap: 'round', lineJoin: 'round'
            } : {
                color: '#008fc4', weight: 3, opacity: 1,
                fill: true, fillColor: '#55c9ef', fillOpacity: 0.38
            }
        }).addTo(map);
    }

    function hacerClicable(feature, layer, titulo) {
        layer.on('click', function (e) {
            ultimoClicDeCapa = { tiempo: Date.now(), latlng: e.latlng };
            mostrarDetalle(titulo, feature.properties, feature, e.latlng);
            if (e && e.originalEvent) L.DomEvent.stopPropagation(e);
        });
    }

    function estiloPoligono(feature) {
        return {
            pane: 'pane_retiros_nuevos_poligonos',
            color: 'rgba(92,99,106,0.72)',
            weight: 0.8,
            opacity: 1,
            fill: true,
            fillColor: '#aeb4ba',
            fillOpacity: 0.42
        };
    }

    function estiloLinea(feature) {
        var ancho = String(feature.properties && feature.properties.ANCHO || '');
        var esCincoMetros = ancho.indexOf('5') === 0;
        return {
            pane: 'pane_retiros_nuevas_lineas',
            color: esCincoMetros ? '#d71920' : '#1769c2',
            weight: esCincoMetros ? 4.2 : 2.6,
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round',
            interactive: true
        };
    }

    function obtenerPoligonosRetiro(datos) {
        // Esta capa contiene áreas de retiro, independientemente de su compatibilidad.
        // La base actual marca todas como "Sin usos compatibles": filtrar por
        // "Con usos compatibles" eliminaba las 8.589 geometrías del mapa.
        var features = (datos && datos.features || []).filter(function (feature) {
            return feature.geometry && /^(Multi)?Polygon$/.test(feature.geometry.type);
        });
        return { type: 'FeatureCollection', features: features };
    }

    function asociarDatosLinealesAreas(areas, lineas) {
        informacionLinealPorArea = new WeakMap();
        if (!areas || !areas.features || !lineas || !lineas.features) return;

        var tamanoCelda = 0.0002;
        var segmentos = [];
        var celdas = Object.create(null);
        var grupos = [];
        function claveCelda(x, y) { return Math.floor(x / tamanoCelda) + ':' + Math.floor(y / tamanoCelda); }

        lineas.features.forEach(function (feature, grupo) {
            var props = feature.properties || {};
            grupos[grupo] = { 'ANCHO': props.ANCHO, 'USOS COMPA': props['USOS COMPA'] };
            var geometria = feature.geometry || {};
            var lineasCoordenadas = geometria.type === 'LineString'
                ? [geometria.coordinates]
                : geometria.type === 'MultiLineString' ? geometria.coordinates : [];
            lineasCoordenadas.forEach(function (linea) {
                for (var i = 1; i < linea.length; i++) {
                    var segmento = { a: linea[i - 1], b: linea[i], grupo: grupo, feature: feature, linea: linea };
                    var indice = segmentos.push(segmento) - 1;
                    var minX = Math.floor(Math.min(segmento.a[0], segmento.b[0]) / tamanoCelda);
                    var maxX = Math.floor(Math.max(segmento.a[0], segmento.b[0]) / tamanoCelda);
                    var minY = Math.floor(Math.min(segmento.a[1], segmento.b[1]) / tamanoCelda);
                    var maxY = Math.floor(Math.max(segmento.a[1], segmento.b[1]) / tamanoCelda);
                    for (var x = minX; x <= maxX; x++) {
                        for (var y = minY; y <= maxY; y++) {
                            var llave = x + ':' + y;
                            if (!celdas[llave]) celdas[llave] = [];
                            celdas[llave].push(indice);
                        }
                    }
                }
            });
        });

        indiceLineasClic = { celdas: celdas, segmentos: segmentos, tamano: tamanoCelda };

        function centroideAnillo(anillo) {
            var areaDoble = 0, cx = 0, cy = 0;
            var origenX = anillo[0][0], origenY = anillo[0][1];
            for (var i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
                var xj = anillo[j][0] - origenX, yj = anillo[j][1] - origenY;
                var xi = anillo[i][0] - origenX, yi = anillo[i][1] - origenY;
                var cruz = xj * yi - xi * yj;
                areaDoble += cruz;
                cx += (xj + xi) * cruz;
                cy += (yj + yi) * cruz;
            }
            if (Math.abs(areaDoble) < 1e-15) return null;
            return {
                punto: [origenX + cx / (3 * areaDoble), origenY + cy / (3 * areaDoble)],
                area: Math.abs(areaDoble / 2)
            };
        }

        function distanciaSegmentoMetros(punto, segmento) {
            var escalaX = Math.cos(punto[1] * Math.PI / 180) * 111320;
            var ax = segmento.a[0] * escalaX, ay = segmento.a[1] * 111320;
            var bx = segmento.b[0] * escalaX, by = segmento.b[1] * 111320;
            var px = punto[0] * escalaX, py = punto[1] * 111320;
            var dx = bx - ax, dy = by - ay;
            var t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
            return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
        }

        areas.features.forEach(function (feature) {
            var geometria = feature.geometry || {};
            var poligonos = geometria.type === 'Polygon' ? [geometria.coordinates]
                : geometria.type === 'MultiPolygon' ? geometria.coordinates : [];
            var componenteMayor = null;
            poligonos.forEach(function (poligono) {
                if (!poligono || !poligono[0]) return;
                var centro = centroideAnillo(poligono[0]);
                if (centro && (!componenteMayor || centro.area > componenteMayor.area)) componenteMayor = centro;
            });
            if (!componenteMayor) return;

            var punto = componenteMayor.punto;
            var centroX = Math.floor(punto[0] / tamanoCelda), centroY = Math.floor(punto[1] / tamanoCelda);
            var candidatos = Object.create(null);
            for (var x = centroX - 2; x <= centroX + 2; x++) {
                for (var y = centroY - 2; y <= centroY + 2; y++) {
                    (celdas[x + ':' + y] || []).forEach(function (indice) { candidatos[indice] = true; });
                }
            }
            var distancias = Object.create(null);
            Object.keys(candidatos).forEach(function (indice) {
                var segmento = segmentos[indice];
                var distancia = distanciaSegmentoMetros(punto, segmento);
                if (distancias[segmento.grupo] === undefined || distancia < distancias[segmento.grupo]) distancias[segmento.grupo] = distancia;
            });
            var orden = Object.keys(distancias).map(function (grupo) { return { distancia: distancias[grupo], grupo: Number(grupo) }; })
                .sort(function (a, b) { return a.distancia - b.distancia; });
            var mejor = orden[0], siguiente = orden[1];
            // Solo se muestran atributos cuando una línea está cerca y su tipo destaca claramente.
            if (mejor && mejor.distancia <= 10 && (!siguiente || siguiente.distancia - mejor.distancia >= 3)) {
                informacionLinealPorArea.set(feature, grupos[mejor.grupo]);
            }
        });
    }

    function crearPanes() {
        [
            ['pane_retiros_contexto', 410],
            ['pane_retiros_lotes', 420],
            ['pane_retiros_compatibles', 425],
            ['pane_retiros_nuevos_poligonos', 430],
            ['pane_retiros_nuevas_lineas', 440]
        ].forEach(function (definicion) {
            if (!map.getPane(definicion[0])) {
                map.createPane(definicion[0]);
            }
            var pane = map.getPane(definicion[0]);
            pane.style.zIndex = definicion[1];
            pane.style.pointerEvents = 'none';
        });
    }

    function establecerInteraccionPanes(activa) {
        [
            'pane_retiros_contexto', 'pane_retiros_lotes', 'pane_retiros_compatibles',
            'pane_retiros_nuevos_poligonos', 'pane_retiros_nuevas_lineas'
        ].forEach(function (nombre) {
            var pane = map.getPane(nombre);
            if (pane) pane.style.pointerEvents = 'none';
        });
    }

    function ordenarIndiceClicPoligonos() {
        Object.keys(indiceClicPoligonos).forEach(function (llave) {
            indiceClicPoligonos[llave].sort(function (a, b) { return b.prioridad - a.prioridad; });
        });
    }

    function crearCapasBase() {
        if (capaRetirosPoligonos) return;
        indiceClicPoligonos = Object.create(null);
        var datosAreasRetiro = window.json_Polgono_retiros_concdigos_0;
        if (!datosAreasRetiro) throw new Error('No se encontró la capa completa de áreas de retiro.');
        var datosAreasCompatibles = obtenerPoligonosRetiro(datosAreasRetiro);
        asociarDatosLinealesAreas(datosAreasRetiro, window.geojsonRetirosLineas);
        indexarPoligonos(datosAreasCompatibles, 'Área de retiro', 3);
        indexarPoligonos(window.geojsonRetirosContexto, 'Área urbana', 0);
        ordenarIndiceClicPoligonos();
        crearPanes();

        function capaPoligonal(datos, pane, estilo, titulo, interactiva) {
            return new window.PoligonosMosaico(datos, {
                pane: pane,
                smoothFactor: 2,
                interactive: interactiva !== false,
                style: estilo,

            });
        }

        capaRetirosContexto = capaPoligonal(window.geojsonRetirosContexto, 'pane_retiros_contexto', {
            color: '#cccccc', weight: 0, fillColor: '#e6e6e6', fillOpacity: 1
        }, 'Área urbana', true);
        capaRetirosPoligonos = new window.PoligonosMosaico(datosAreasCompatibles, {
            pane: 'pane_retiros_nuevos_poligonos',
            interactive: false,
            smoothFactor: 1,
            style: estiloPoligono
        });
        // Las líneas se dibujan en mosaicos y se consultan mediante el índice espacial.

        function crearLineas(ancho) {
            var features = window.geojsonRetirosLineas.features.filter(function (feature) {
                return String(feature.properties && feature.properties.ANCHO || '').indexOf(ancho) === 0;
            });
            return new window.PoligonosMosaico({ type: 'FeatureCollection', features: features }, {
                pane: 'pane_retiros_nuevas_lineas',
                interactive: true,
                smoothFactor: 1,
                style: estiloLinea,

            });
        }
        capaRetirosLineas3m = crearLineas('3');
        capaRetirosLineas5m = crearLineas('5');
        window.capaRetirosNormativosPoligonos = capaRetirosPoligonos;
        window.capaRetirosNormativosLineas3m = capaRetirosLineas3m;
        window.capaRetirosNormativosLineas5m = capaRetirosLineas5m;
    }

    function agregarGeometriasPorLotes(datos, titulo, prioridad, capa) {
        var features = [];
        (datos && datos.features || []).forEach(function (feature) {
            if (!feature.geometry) return;
            if (feature.geometry.type === 'Polygon') {
                features.push(feature);
            } else if (feature.geometry.type === 'MultiPolygon') {
                feature.geometry.coordinates.forEach(function (coordenadas) {
                    features.push({
                        type: 'Feature',
                        properties: feature.properties || {},
                        geometry: { type: 'Polygon', coordinates: coordenadas }
                    });
                });
            }
        });

        return new Promise(function (resolve, reject) {
            var offset = 0;
            function procesarLote() {
                try {
                    var inicioTanda = performance.now();
                    var siguiente = offset;
                    do {
                        siguiente = Math.min(siguiente + 30, features.length);
                        var lote = features.slice(offset, siguiente);
                        if (lote.length) {
                            indexarPoligonos({ type: 'FeatureCollection', features: lote }, titulo, prioridad);
                            capa.addData({ type: 'FeatureCollection', features: lote });
                        }
                        offset = siguiente;
                    } while (offset < features.length && performance.now() - inicioTanda < 6);
                    if (offset < features.length) {
                        if (window.requestAnimationFrame) window.requestAnimationFrame(procesarLote);
                        else window.setTimeout(procesarLote, 16);
                    } else {
                        if (capa.redraw) capa.redraw();
                        resolve();
                    }
                } catch (error) {
                    reject(error);
                }
            }
            procesarLote();
        });
    }

    function crearCapasPredios() {
        if (preparacionPredios) return preparacionPredios;
        if (capaRetirosLotes) return Promise.resolve();
        crearPanes();
        capaRetirosLotes = new window.PoligonosMosaico(null, {
            pane: 'pane_retiros_lotes',
            smoothFactor: 1,
            interactive: false,
            style: {
                color: 'rgba(197,197,197,0.85)', weight: 0.8, fillColor: '#f2f2f2', fillOpacity: 1
            }
        });
        capaRetirosCompatibles = new window.PoligonosMosaico(null, {
            pane: 'pane_retiros_compatibles',
            smoothFactor: 1,
            interactive: false,
            style: {
                color: '#b8b8b8', weight: 0.8,
                fillColor: '#d5d5d5', fillOpacity: 1
            }
        });
        // Insert higher-priority compatible lots first; then stream gray lot geometry in frames.
        preparacionPredios = agregarGeometriasPorLotes(window.geojsonRetirosCompatibles, 'Lote compatible', 2, capaRetirosCompatibles)
            .then(function () {
                return agregarGeometriasPorLotes(window.geojsonRetirosLotes, 'Lote', 1, capaRetirosLotes);
            })
            .then(ordenarIndiceClicPoligonos)
            .finally(function () { preparacionPredios = null; });
        return preparacionPredios;
    }

    function mostrarPanelCapas(mostrar) {
        if (panelCapas) panelCapas.hidden = !mostrar;
    }

    function mostrarProgresoCarga(texto) {
        if (estado) {
            estado.textContent = texto;
            estado.hidden = !texto;
        } else if (ayudaDetalle) {
            ayudaDetalle.textContent = texto || 'Haz clic en un lote, área o línea del mapa para consultar sus datos.';
        }
    }

    function obtenerCapas() {
        return {
            contexto: capaRetirosContexto,
            lotes: capaRetirosLotes,
            compatibles: capaRetirosCompatibles,
            poligonos: capaRetirosPoligonos,
            lineas3: capaRetirosLineas3m,
            lineas5: capaRetirosLineas5m
        };
    }

    function habilitarControlesCapas(ids) {
        if (!panelCapas) return;
        panelCapas.querySelectorAll('[data-retiro-capa]').forEach(function (input) {
            if (ids.indexOf(input.dataset.retiroCapa) !== -1) input.disabled = false;
        });
    }

    function agregarCapasMarcadas(ids) {
        if (!panelCapas) return;
        var capas = obtenerCapas();
        panelCapas.querySelectorAll('[data-retiro-capa]').forEach(function (input) {
            if (ids.indexOf(input.dataset.retiroCapa) === -1 || !input.checked) return;
            var capa = capas[input.dataset.retiroCapa];
            if (capa && !map.hasLayer(capa)) capa.addTo(map);
        });
    }

    function conectarPanelCapas() {
        if (panelCapas && panelCapasAuxiliares && panelCapas.parentElement !== panelCapasAuxiliares) {
            panelCapasAuxiliares.appendChild(panelCapas);
        }
        if (panelCapas) panelCapas.querySelectorAll('[data-retiro-capa]').forEach(function (input) {
            input.addEventListener('change', function () {
                if (input.dataset.retiroCapa === 'vias') {
                    if (window.establecerVisibilidadVias) window.establecerVisibilidadVias(input.checked);
                    return;
                }
                var capa = obtenerCapas()[input.dataset.retiroCapa];
                if (!capa) return;
                if (input.checked) capa.addTo(map);
                else map.removeLayer(capa);
            });
        });
    }

    conectarPanelCapas();

    function ocultarCapasPrincipales() {
        [window.layer_usos_compatibles_0, window.layer_usos_compatibles_planes,
        window.layer_parques_alineados,
        window.capaRetiros].forEach(function (capa) {
            if (capa && map.hasLayer(capa)) map.removeLayer(capa);
        });
    }

    function restaurarCapasPrincipales() {
        if (!estadoAnterior) return;
        estadoAnterior.capas.forEach(function (item) {
            if (item.visible && item.capa && !map.hasLayer(item.capa)) item.capa.addTo(map);
        });
        map.setView(estadoAnterior.centro, estadoAnterior.zoom, { animate: false });
        estadoAnterior = null;
    }

    function entrar() {
        if (activo) return;
        activo = true;
        map.getContainer().classList.remove('retiros-cursor-clicable');
        establecerInteraccionPanes(false);
        if (window.limpiarEstadoPanelVisor) window.limpiarEstadoPanelVisor();
        var sesionActual = ++sesion;
        estadoAnterior = {
            centro: map.getCenter(),
            zoom: map.getZoom(),
            viasVisibles: window.obtenerVisibilidadVias ? window.obtenerVisibilidadVias() : true,
            capas: [window.layer_usos_compatibles_0, window.layer_usos_compatibles_planes,
            window.layer_parques_alineados,
            window.capaRetiros].filter(Boolean).map(function (capa) {
                return { capa: capa, visible: map.hasLayer(capa) };
            })
        };
        document.body.classList.add('modo-retiros');
        map.stop();
        if (window.actualizarCapaZonificacionVigente) window.actualizarCapaZonificacionVigente();
        if (botonDetalleMovil) {
            botonDetalleMovil.hidden = true;
            botonDetalleMovil.style.display = 'none';
            botonDetalleMovil.setAttribute('aria-hidden', 'true');
        }
        if (cabecera) cabecera.hidden = false;
        // La visibilidad del contenedor la controla el botón de capas.
        mostrarPanelCapas(true);
        if (botonCapasAuxiliares) botonCapasAuxiliares.setAttribute('aria-label', 'Abrir capas de retiros y vías');
        if (botonCapasAuxiliares) botonCapasAuxiliares.innerHTML = '<svg class="icono-capas-retiros" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 3 9 4.5-9 4.5-9-4.5L12 3Z"></path><path d="m3 12 9 4.5 9-4.5M3 16.5 12 21l9-4.5"></path></svg>';
        if (tituloPrincipal) tituloPrincipal.textContent = 'Visor de retiros normativos del distrito de San Borja';
        if (subtitulo) subtitulo.textContent = 'Consulta de polígonos y líneas de retiro';
        if (tituloPanelOriginal) tituloPanelOriginal.textContent = 'Información de retiros normativos';
        if (tituloDetalle) tituloDetalle.textContent = 'Selecciona un elemento';
        if (ayudaDetalle) ayudaDetalle.textContent = 'Haz clic en un lote, área o línea del mapa para consultar sus datos.';
        if (detalleRetiros) detalleRetiros.hidden = false;
        if (panelDetalle) {
            panelDetalle.classList.remove('minimizado');
            panelDetalle.classList.add('panel-expandido');
        }
        if (window.cerrarPanelesMapa) window.cerrarPanelesMapa();
        ocultarCapasPrincipales();
        if (window.limpiarRetiroResaltado) window.limpiarRetiroResaltado();
        map.closePopup();
        mostrarProgresoCarga('Cargando mapa…');
        map.invalidateSize({ pan: false });

        // Descargar en paralelo; la geometría se prepara después por tandas.
        // La promesa conserva el resultado para cambios posteriores de visor.
        cargarDatosPredios().catch(function () { });
        var etapaCarga = 'mapa';
        cargarDatosBase().then(function () {
            if (!activo || sesionActual !== sesion) return;
            crearCapasBase();
            establecerInteraccionPanes(true);
            habilitarControlesCapas(['contexto', 'poligonos', 'lineas3', 'lineas5']);
            agregarCapasMarcadas(['contexto', 'poligonos', 'lineas3', 'lineas5']);
            var viasControl = panelCapas && panelCapas.querySelector('[data-retiro-capa="vias"]');
            if (viasControl && window.establecerVisibilidadVias) window.establecerVisibilidadVias(viasControl.checked);
            var limites = capaRetirosContexto.getBounds();
            [capaRetirosPoligonos, capaRetirosLineas3m, capaRetirosLineas5m].forEach(function (capa) {
                if (capa.getBounds().isValid()) limites.extend(capa.getBounds());
            });
            if (limites.isValid()) map.fitBounds(limites, { paddingTopLeft: [34, 34], paddingBottomRight: [34, 34], maxZoom: 17, animate: false });
            mostrarProgresoCarga('Cargando lotes… Puedes navegar mientras se completa.');
            etapaCarga = 'predios';
            return cargarDatosPredios();
        }).then(function () {
            if (!activo || sesionActual !== sesion) return;
            mostrarProgresoCarga('Preparando predios… Puedes navegar mientras se completa.');
            var preparacionPredios = crearCapasPredios();
            habilitarControlesCapas(['lotes', 'compatibles']);
            agregarCapasMarcadas(['lotes', 'compatibles']);
            return preparacionPredios;
        }).then(function () {
            if (!activo || sesionActual !== sesion) return;
            mostrarProgresoCarga('');
        }).catch(function (error) {
            if (sesionActual !== sesion) return;
            console.error('No se pudieron cargar las capas de retiros.', error);
            mostrarProgresoCarga(etapaCarga === 'predios'
                ? 'No se pudieron cargar los lotes. Vuelve a intentarlo.'
                : 'No se pudieron cargar las capas. Vuelve a intentarlo.');
            if (etapaCarga !== 'predios') activo = false;
        });
    }

    function salir() {
        if (!activo && !document.body.classList.contains('modo-retiros')) return;
        activo = false;
        limpiarResaltadoRetiros();
        map.getContainer().classList.remove('retiros-cursor-clicable');
        sesion += 1;
        document.body.classList.remove('modo-retiros');
        map.stop();
        if (window.actualizarCapaZonificacionVigente) window.actualizarCapaZonificacionVigente();
        if (botonDetalleMovil) {
            botonDetalleMovil.hidden = botonDetalleMovilOculto;
            botonDetalleMovil.style.display = estiloBotonDetalleMovil;
            botonDetalleMovil.removeAttribute('aria-hidden');
        }
        if (cabecera) cabecera.hidden = true;
        mostrarPanelCapas(false);
        if (botonCapasAuxiliares) botonCapasAuxiliares.setAttribute('aria-label', etiquetaBotonCapasOriginal || 'Abrir capas adicionales');
        if (botonCapasAuxiliares) botonCapasAuxiliares.innerHTML = contenidoBotonCapasOriginal;
        [capaRetirosContexto, capaRetirosLotes, capaRetirosCompatibles,
            capaRetirosPoligonos, capaRetirosLineas3m, capaRetirosLineas5m].forEach(function (capa) {
                if (capa) map.removeLayer(capa);
            });
        establecerInteraccionPanes(false);
        var viasVisiblesAntes = estadoAnterior ? estadoAnterior.viasVisibles : true;
        restaurarCapasPrincipales();
        if (window.establecerVisibilidadVias) window.establecerVisibilidadVias(viasVisiblesAntes);
        if (tituloPrincipal) tituloPrincipal.textContent = tituloOriginal;
        if (subtitulo) subtitulo.textContent = subtituloOriginal;
        if (tituloPanelOriginal) tituloPanelOriginal.textContent = tituloPanelTextoOriginal;
        if (tituloDetalle) tituloDetalle.textContent = 'Seleccione un polígono';
        if (ayudaDetalle) ayudaDetalle.textContent = 'Haz clic en un lote del mapa para consultar usos compatibles.';
        if (detalleRetiros) detalleRetiros.hidden = true;
        if (window.limpiarEstadoPanelVisor) window.limpiarEstadoPanelVisor();
        if (panelDetalle) {
            panelDetalle.classList.add('minimizado');
            panelDetalle.classList.remove('panel-expandido');
        }
        if (estado) { estado.textContent = ''; estado.hidden = true; }
        map.closePopup();
        map.invalidateSize({ pan: false });
    }

    window.visorRetiros = { entrar: entrar, salir: salir };
})();
