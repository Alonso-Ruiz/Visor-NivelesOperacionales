// Capa de referencia, se dibuja en un canvas para limitar nodos y mejorar fluidez.
(function () {
    'use strict';
    var mapa = window.map || window.mapa;
    var control = document.getElementById('capa-zonificacion-vigente');
    var leyenda = document.getElementById('leyenda-zonificacion-vigente');
    if (!mapa || !window.L || !control || !window.ZONIFICACION_VIGENTE) return;

    var colores = {
        RDB: '#78aeca', RDM: '#5796b4', RDA: '#357e9f', CV: '#d9a84b', CZ: '#ba8737',
        OU: '#868d8a', H2: '#a77ca4', H3: '#93648f', E1: '#7d9b61', E2: '#6d8752', E3: '#5d7548',
        ZRP: '#73ad7a', 'ZRE-1': '#d8bd76', 'ZRE-2': '#d8bd76', 'ZRE-3': '#d8bd76', 'ZRE-4': '#d8bd76'
    };
    var capa = null;

    function crearCapa() {
        if (capa) return capa;
        if (!mapa.getPane('pane_zonificacion_vigente')) {
            mapa.createPane('pane_zonificacion_vigente');
            mapa.getPane('pane_zonificacion_vigente').style.zIndex = 430;
            mapa.getPane('pane_zonificacion_vigente').style.pointerEvents = 'none';
        }
        capa = L.geoJSON(window.json_zonificacion_vigente_0, {
            pane: 'pane_zonificacion_vigente',
            renderer: L.canvas({ pane: 'pane_zonificacion_vigente', padding: 0.1 }),
            interactive: false,
            style: function (feature) {
                var codigo = feature.properties && feature.properties.ZON_VIG || '';
                var color = colores[codigo] || '#aab5ad';
                return { color: color, weight: 0.55, opacity: 0.8, fillColor: color, fillOpacity: 0.22 };
            }
        });
        return capa;
    }

    function actualizarVisibilidad() {
        if (!capa) return;
        if (control.checked && !document.body.classList.contains('modo-retiros')) {
            if (!mapa.hasLayer(capa)) capa.addTo(mapa);
        } else if (mapa.hasLayer(capa)) {
            mapa.removeLayer(capa);
        }
    }
    window.actualizarCapaZonificacionVigente = actualizarVisibilidad;

    control.addEventListener('change', function () {
        if (!control.checked) {
            if (leyenda) leyenda.hidden = true;
            if (capa && mapa.hasLayer(capa)) mapa.removeLayer(capa);
            return;
        }
        if (leyenda) leyenda.hidden = false;
        control.disabled = true;
        window.ZONIFICACION_VIGENTE.cargar().then(function () {
            if (!control.checked) return;
            crearCapa();
            actualizarVisibilidad();
        }).catch(function (error) {
            console.error(error);
            control.checked = false;
            if (leyenda) leyenda.hidden = true;
        }).then(function () { control.disabled = false; });
    });
})();
