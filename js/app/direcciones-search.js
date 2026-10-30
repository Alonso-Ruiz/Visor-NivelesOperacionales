// Búsqueda local de vía y número usando el directorio municipal validado.
(function () {
    var input = document.getElementById('buscador-vias');
    var lista = document.getElementById('sugerencias-vias');
    if (!input || !lista || !window.LoteSearch || !window.DIRECCIONES_LOCAL_DATA) return;

    var motor = window.LoteSearch.create(window.DIRECCIONES_LOCAL_DATA);
    var resultados = null;
    var textoResultados = '';
    var indiceGeometrias = null;
    var listaDireccionesLote = document.getElementById('lista-direcciones-lote');
    var panelDireccionesLote = document.getElementById('direcciones-lote-panel');
    var bloqueBuscador = document.getElementById('bloque-superior-izquierdo');
    var mostrarTrasBusqueda = false;

    function ocultarDireccionesDelLote() {
        mostrarTrasBusqueda = false;
        if (panelDireccionesLote) panelDireccionesLote.hidden = true;
        if (bloqueBuscador) bloqueBuscador.classList.remove('buscador-con-direcciones');
        if (listaDireccionesLote) listaDireccionesLote.innerHTML = '';
        var conteo = document.getElementById('conteo-direcciones-lote');
        if (conteo) conteo.textContent = '';
    }

    function pareceDireccionCompleta(texto) {
        if (document.body.classList.contains('modo-retiros')) return false;
        var valor = String(texto || '').trim();
        return /^\d{1,8}$/.test(valor) || /(?:^|\s)(?:n(?:[.°º])?\s*)?(?:\d+[a-z]?(?:[- ][a-z])?|s\/?n)$/i.test(valor);
    }

    function obtenerGeometriasPorCodigo() {
        if (indiceGeometrias) return indiceGeometrias;
        indiceGeometrias = new Map();
        var capa = window.layer_usos_compatibles_0;
        if (!capa || !capa.eachLayer) return indiceGeometrias;
        capa.eachLayer(function (layer) {
            var codigo = String((layer.feature.properties || {}).COD_LOTE || '').trim();
            if (!codigo) return;
            if (!indiceGeometrias.has(codigo)) indiceGeometrias.set(codigo, []);
            indiceGeometrias.get(codigo).push(layer.feature);
        });
        return indiceGeometrias;
    }

    function ponerMensaje(texto) {
        var mensaje = document.createElement('div');
        mensaje.className = 'resultado-direccion-mensaje';
        mensaje.setAttribute('role', 'status');
        mensaje.textContent = texto;
        lista.appendChild(mensaje);
    }

    function avisarSinSeleccion(texto) {
        lista.innerHTML = '';
        ponerMensaje(texto);
        lista.style.display = 'block';
        input.setAttribute('aria-expanded', 'true');
    }

    function describirVia(indice) {
        var via = window.DIRECCIONES_LOCAL_DATA.streets[indice] || [];
        return [via[1], via[2]].filter(Boolean).join(' ');
    }

    function abrirResultado(item) {
        var codigo = String(item.code || '').trim();
        var geometrias = obtenerGeometriasPorCodigo().get(codigo) || [];
        if (!geometrias.length) {
            avisarSinSeleccion('La dirección figura en el directorio municipal, pero no tiene un polígono coincidente en el visor 1.');
            return;
        }
        mostrarTrasBusqueda = true;
        window.abrirLotePorDireccion({ type: 'FeatureCollection', features: geometrias });
    }

    function mostrarDireccionesDelLote(props) {
        if (!listaDireccionesLote) return;
        var codigo = String((props || {}).COD_LOTE || '').trim();
        var grupos = codigo ? motor.groups(codigo) : [];
        listaDireccionesLote.innerHTML = '';
        if (!grupos.length) {
            document.getElementById('conteo-direcciones-lote').textContent = '';
            var vacio = document.createElement('li');
            vacio.textContent = 'El directorio no tiene direcciones vinculadas a este código de lote.';
            listaDireccionesLote.appendChild(vacio);
            panelDireccionesLote.hidden = !codigo;
            if (bloqueBuscador) bloqueBuscador.classList.toggle('buscador-con-direcciones', !panelDireccionesLote.hidden);
            return;
        }
        var total = grupos.reduce(function (suma, grupo) { return suma + grupo.items.length; }, 0);
        document.getElementById('conteo-direcciones-lote').textContent = total + (total === 1 ? ' dirección registrada' : ' direcciones registradas');
        grupos.forEach(function (grupo) {
            var bloque = document.createElement('li');
            var nombreVia = document.createElement('strong');
            var numeros = document.createElement('span');
            nombreVia.textContent = describirVia(grupo.street);
            numeros.textContent = grupo.items.map(function (direccion) {
                return direccion.number || 'Sin número en fuente';
            }).join(' · ');
            bloque.appendChild(nombreVia);
            bloque.appendChild(numeros);
            listaDireccionesLote.appendChild(bloque);
        });
        panelDireccionesLote.hidden = false;
        if (bloqueBuscador) bloqueBuscador.classList.add('buscador-con-direcciones');
    }

    var actualizarListaOriginal = window.actualizarLista;
    if (typeof actualizarListaOriginal === 'function') {
        window.actualizarLista = function () {
            var resultado = actualizarListaOriginal.apply(this, arguments);
            if (mostrarTrasBusqueda) {
                mostrarTrasBusqueda = false;
                mostrarDireccionesDelLote(arguments[3]);
            } else {
                ocultarDireccionesDelLote();
            }
            return resultado;
        };
    }

    var mostrarRestriccionesPorViaOriginal = window.mostrarRestriccionesPorVia;
    if (typeof mostrarRestriccionesPorViaOriginal === 'function') {
        window.mostrarRestriccionesPorVia = function () {
            ocultarDireccionesDelLote();
            return mostrarRestriccionesPorViaOriginal.apply(this, arguments);
        };
    }

    if (typeof window.limpiarEstadoPanelVisor === 'function') {
        var limpiarEstadoPanelOriginal = window.limpiarEstadoPanelVisor;
        window.limpiarEstadoPanelVisor = function () {
            ocultarDireccionesDelLote();
            return limpiarEstadoPanelOriginal.apply(this, arguments);
        };
    }

    function seleccionarResultado(item) {
        input.value = Number.isInteger(item.street)
            ? (describirVia(item.street) + ' ' + String(item.number || '')).trim()
            : String(item.code || '').trim();
        var botonLimpiar = document.getElementById('boton-limpiar-vias');
        if (botonLimpiar) botonLimpiar.hidden = !input.value;
        ocultarDireccionesDelLote();
        if (!item.mapped && !(Array.isArray(item.ids) && item.ids.length)) {
            avisarSinSeleccion('Esta dirección está en el directorio, pero su lote no tiene geometría asociada.');
            return;
        }
        abrirResultado(item);
    }

    function pintarResultados(resultado) {
        resultados = resultado;
        textoResultados = input.value.trim();
        lista.innerHTML = '';

        if (resultado.kind === 'empty' || !resultado.total) {
            ponerMensaje('No encontramos esa vía y número en el directorio municipal. Verifica el nombre y la numeración.');
            lista.style.display = 'block';
            input.setAttribute('aria-expanded', 'true');
            return;
        }

        var items = resultado.items || [];
        if (resultado.total > items.length) ponerMensaje('Hay ' + resultado.total + ' coincidencias. Mostrando las primeras ' + items.length + '.');
        items.forEach(function (item, indice) {
            var fila = document.createElement('div');
            fila.className = 'sugerencia-item';
            fila.id = 'sugerencia-direccion-municipal-' + indice;
            fila.setAttribute('role', 'option');
            fila.setAttribute('aria-selected', 'false');

            var titulo = document.createElement('strong');
            var detalle = document.createElement('small');
            var tieneVia = Number.isInteger(item.street);
            titulo.textContent = tieneVia
                ? describirVia(item.street) + ' ' + item.number
                : 'Lote ' + item.code;
            var geometrias = obtenerGeometriasPorCodigo().get(String(item.code || '')) || [];
            var poligonos = geometrias.length;
            detalle.textContent = 'Lote ' + item.code + (poligonos > 1
                ? ' · ' + poligonos + ' polígonos con este código'
                : poligonos === 1 ? ' · Sector ' + ((geometrias[0].properties || {}).SECTOR || 'del mapa')
                    : ' · Sin polígono en el visor 1');
            fila.appendChild(titulo);
            fila.appendChild(detalle);
            fila.addEventListener('mouseenter', function () { actualizarSugerenciaViaActiva(indice); });
            fila.addEventListener('click', function () { seleccionarResultado(item); });
            lista.appendChild(fila);
        });
        lista.style.display = 'block';
        input.setAttribute('aria-expanded', 'true');
    }

    function buscar(texto) {
        var valor = String(texto || '').trim();
        if (!pareceDireccionCompleta(valor)) {
            resultados = null;
            textoResultados = '';
            return false;
        }
        pintarResultados(motor.search(valor, '', 12));
        return true;
    }

    input.addEventListener('input', function () { buscar(input.value); });

    window.BUSQUEDA_DIRECCIONES_MUNICIPAL = {
        pareceDireccionCompleta: pareceDireccionCompleta,
        buscar: buscar,
        ejecutar: function (evento) {
            var valor = input.value.trim();
            if (!pareceDireccionCompleta(valor)) return false;
            if (evento) {
                evento.preventDefault();
                evento.stopImmediatePropagation();
            }
            if (!resultados || textoResultados !== valor) buscar(valor);
            if (!resultados || !resultados.total) return true;
            var items = resultados.items || [];
            var activos = lista.querySelectorAll('.sugerencia-item');
            var itemActivo = indiceSugerenciaViaActiva >= 0 && activos[indiceSugerenciaViaActiva]
                ? items[indiceSugerenciaViaActiva] : null;
            if (itemActivo) seleccionarResultado(itemActivo);
            else if (resultados.total === 1 && items.length === 1) seleccionarResultado(items[0]);
            return true;
        }
    };
})();
