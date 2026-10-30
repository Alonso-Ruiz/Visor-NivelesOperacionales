// Datos auxiliares: nunca se añaden al mapa, leyenda ni fichas del lote.
(function () {
    'use strict';
    var datos = window.datosZonificacionAuxiliar;
    var entradas = new WeakMap();
    if (!datos || !window.json_usos_compatibles_0) return;
    window.json_usos_compatibles_0.features.forEach(function (f, i) {
        entradas.set(f.properties, datos.valores[i]);
    });

    function enAnillo(p, ring) {
        var inside = false;
        for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            var a = ring[i], b = ring[j];
            if ((a[1] > p[1]) !== (b[1] > p[1]) &&
                p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
        }
        return inside;
    }

    window.ZONIFICACION_IIUU = {
        obtener: function (propiedades, latlng) {
            var entrada = entradas.get(propiedades);
            if (!Array.isArray(entrada)) return entrada || '';
            if (!latlng) return '';
            var punto = [latlng.lng, latlng.lat];
            var valores = entrada.filter(function (id) {
                return datos.poligonos[id][1].coordinates.some(function (poly) {
                    return enAnillo(punto, poly[0]) && !poly.slice(1).some(function (ring) { return enAnillo(punto, ring); });
                });
            }).map(function (id) { return datos.poligonos[id][0] || ''; });
            var unicos = Array.from(new Set(valores));
            return unicos.length === 1 ? unicos[0] : '';
        }
    };
})();
