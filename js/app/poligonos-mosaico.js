// Mosaicos vectoriales locales: proyección única, índice espacial y caché de Leaflet.
(function () {
    'use strict';
    window.PoligonosMosaico = L.GridLayer.extend({
        options: { tileSize: 256, updateWhenIdle: false, updateWhenZooming: false,
            updateInterval: 80, keepBuffer: 4, maxZoom: 28, noWrap: true },
        initialize: function (datos, opciones) {
            L.setOptions(this, opciones);
            this.registros = [];
            this.celdas = new Map();
            this.grandes = [];
            this.limites = L.latLngBounds([]);
            this.addData(datos);
        },
        addData: function (datos) {
            if (!datos) return this;
            var features = datos.features || (Array.isArray(datos) ? datos : [datos]);
            var self = this;
            features.forEach(function (feature) {
                var g = feature.geometry;
                if (!g || !/^(Multi)?(Polygon|LineString)$/.test(g.type)) return;
                var esLinea = /LineString$/.test(g.type);
                var estilo = typeof self.options.style === 'function' ? self.options.style(feature) : self.options.style || {};
                var partes = esLinea ? (g.type === 'LineString' ? [[g.coordinates]] : g.coordinates.map(function (linea) { return [linea]; })) : (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);
                partes.forEach(function (poligono) {
                    var bounds = L.bounds([]);
                    var anillos = poligono.map(function (anillo) {
                        return anillo.map(function (xy) {
                            var ll = L.latLng(xy[1], xy[0]);
                            self.limites.extend(ll);
                            var p = L.CRS.EPSG3857.latLngToPoint(ll, 16);
                            bounds.extend(p);
                            return p;
                        });
                    });
                    if (!bounds.isValid()) return;
                    var registro = { anillos: anillos, bounds: bounds, estilo: estilo, esLinea: esLinea };
                    self.registros.push(registro);
                    var minX = Math.floor(bounds.min.x / 256), maxX = Math.floor(bounds.max.x / 256);
                    var minY = Math.floor(bounds.min.y / 256), maxY = Math.floor(bounds.max.y / 256);
                    if ((maxX - minX + 1) * (maxY - minY + 1) > 256) { self.grandes.push(registro); return; }
                    for (var x = minX; x <= maxX; x++) for (var y = minY; y <= maxY; y++) {
                        var key = x + ':' + y;
                        if (!self.celdas.has(key)) self.celdas.set(key, []);
                        self.celdas.get(key).push(registro);
                    }
                });
            });
            return this;
        },
        getBounds: function () { return this.limites; },
        candidatos: function (bounds) {
            var minX = Math.floor(bounds.min.x / 256), maxX = Math.floor(bounds.max.x / 256);
            var minY = Math.floor(bounds.min.y / 256), maxY = Math.floor(bounds.max.y / 256);
            if ((maxX - minX + 1) * (maxY - minY + 1) > 1024) return this.registros;
            var encontrados = new Set(this.grandes);
            for (var x = minX; x <= maxX; x++) for (var y = minY; y <= maxY; y++) {
                var registros = this.celdas.get(x + ':' + y);
                if (registros) registros.forEach(function (r) { encontrados.add(r); });
            }
            return Array.from(encontrados);
        },
        createTile: function (coords) {
            var tile = document.createElement('canvas');
            var size = this.getTileSize().x;
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            tile.width = tile.height = size * dpr;
            tile.style.pointerEvents = 'none';
            var ctx = tile.getContext('2d');
            ctx.scale(dpr, dpr);
            var scale = Math.pow(2, coords.z - 16);
            var ox = coords.x * size, oy = coords.y * size;
            var bounds = L.bounds([(ox - 4) / scale, (oy - 4) / scale], [(ox + size + 4) / scale, (oy + size + 4) / scale]);
            this.candidatos(bounds).forEach(function (r) {
                if (!bounds.intersects(r.bounds)) return;
                var s = r.estilo;
                ctx.beginPath();
                r.anillos.forEach(function (anillo) {
                    anillo.forEach(function (p, i) {
                        var x = p.x * scale - ox, y = p.y * scale - oy;
                        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
                    });
                    if (!r.esLinea) ctx.closePath();
                });
                if (!r.esLinea && s.fill !== false) {
                    ctx.globalAlpha = s.fillOpacity === undefined ? 0.2 : s.fillOpacity;
                    ctx.fillStyle = s.fillColor || s.color || '#3388ff';
                    ctx.fill('evenodd');
                }
                if (s.stroke !== false && s.weight !== 0) {
                    ctx.globalAlpha = s.opacity === undefined ? 1 : s.opacity;
                    ctx.strokeStyle = s.color || '#3388ff';
                    ctx.lineWidth = s.weight === undefined ? 3 : s.weight;
                    ctx.lineJoin = 'round';
                    ctx.lineCap = s.lineCap || 'round';
                    ctx.stroke();
                }
            });
            return tile;
        }
    });
})();
