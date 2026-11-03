// Conserva todas las geometrías para consultas, pero solo monta las visibles.
(function () {
    'use strict';
    var limites = new WeakMap();
    function visible(layer, bounds) {
        if (!layer.getBounds) return true;
        if (!limites.has(layer)) limites.set(layer, layer.getBounds());
        return bounds.intersects(limites.get(layer));
    }
    window.GeoJSONVisible = L.GeoJSON.extend({
        onAdd: function (mapa) {
            this.actualizarVista();
            mapa.on('moveend', this.actualizarVista, this);
        },
        onRemove: function (mapa) {
            mapa.off('moveend', this.actualizarVista, this);
            this.eachLayer(function (layer) { mapa.removeLayer(layer); });
        },
        addLayer: function (layer) {
            L.FeatureGroup.prototype.addLayer.call(this, layer);
            if (this._map && !visible(layer, this._map.getBounds().pad(0.2))) {
                this._map.removeLayer(layer);
            }
            return this;
        },
        actualizarVista: function () {
            var mapa = this._map;
            if (!mapa) return;
            var bounds = mapa.getBounds().pad(0.2);
            this.eachLayer(function (layer) {
                if (visible(layer, bounds)) {
                    if (!mapa.hasLayer(layer)) mapa.addLayer(layer);
                } else if (mapa.hasLayer(layer)) mapa.removeLayer(layer);
            });
        }
    });
})();

// Las capas de consulta ocultas no crean miles de objetos durante el arranque.
window.GeoJSONDiferido = L.GeoJSON.extend({
    initialize: function (datos, opciones) {
        L.GeoJSON.prototype.initialize.call(this, null, opciones);
        this.datosPendientes = datos;
    },
    preparar: function () {
        if (!this.datosPendientes) return;
        var datos = this.datosPendientes;
        this.datosPendientes = null;
        this.addData(datos);
    },
    eachLayer: function (fn, contexto) {
        this.preparar();
        return L.FeatureGroup.prototype.eachLayer.call(this, fn, contexto);
    },
    onAdd: function (mapa) {
        this.preparar();
        L.GeoJSON.prototype.onAdd.call(this, mapa);
    }
});
