// Carga bajo demanda la capa oficial (grande) y cruza el lote consultado.
(function (root) {
    'use strict';

    var porPar = new Map();
    var porCuc = new Map();
    var porLote = new Map();
    var carga = null;
    var lista = [];
    var porCelda = new Map();
    var tamanoCelda = 0.001;

    function indexarGeometria(feature) {
        var geometria = feature.geometry || {};
        var partes = geometria.type === 'Polygon' ? [geometria.coordinates] :
            geometria.type === 'MultiPolygon' ? geometria.coordinates : [];
        partes.forEach(function(poly) {
            var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            (poly[0] || []).forEach(function(p) {
                minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
                minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
            });
            for (var x = Math.floor(minX / tamanoCelda); x <= Math.floor(maxX / tamanoCelda); x++) {
                for (var y = Math.floor(minY / tamanoCelda); y <= Math.floor(maxY / tamanoCelda); y++) {
                    agregar(porCelda, x + ':' + y, feature);
                }
            }
        });
    }

    function campo(props, key) {
        return String(props && props[key] !== undefined && props[key] !== null ? props[key] : '').trim();
    }

    function agregar(index, key, feature) {
        if (!key) return;
        if (!index.has(key)) index.set(key, []);
        index.get(key).push(feature);
    }

    function inicializar() {
        var features = root.json_zonificacion_vigente_0 && root.json_zonificacion_vigente_0.features || [];
        porPar.clear(); porCuc.clear(); porLote.clear(); porCelda.clear();
        features.forEach(function (feature) {
            var props = feature.properties || {};
            var cuc = campo(props, 'CUC');
            var lote = campo(props, 'COD_LOTE');
            if (cuc && cuc !== '1') agregar(porCuc, cuc, feature);
            if (lote) agregar(porLote, lote, feature);
            if (cuc && cuc !== '1' && lote) agregar(porPar, cuc + '|' + lote, feature);
            indexarGeometria(feature);
        });
        lista = features;
    }

    function cargar() {
        if (lista.length) return Promise.resolve();
        if (carga) return carga;
        carga = new Promise(function (resolve, reject) {
            var script = document.createElement('script');
            script.src = 'data/zonificacion_vigente_0.js?v=20261020-carga-bajo-demanda1';
            script.async = true;
            script.onload = function () { inicializar(); resolve(); };
            script.onerror = function () {
                script.remove(); carga = null;
                reject(new Error('No se pudo cargar la zonificación vigente.'));
            };
            document.head.appendChild(script);
        });
        return carga;
    }

    function punto(valor) {
        if (Array.isArray(valor) && valor.length >= 2) return { x: Number(valor[0]), y: Number(valor[1]) };
        if (valor && Number.isFinite(Number(valor.lng)) && Number.isFinite(Number(valor.lat)))
            return { x: Number(valor.lng), y: Number(valor.lat) };
        return null;
    }

    function dentroAnillo(anillo, x, y) {
        var dentro = false;
        for (var i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
            var a = anillo[i], b = anillo[j];
            if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) dentro = !dentro;
        }
        return dentro;
    }

    function dentroGeometria(geometria, p) {
        if (!geometria || !p) return false;
        var polys = geometria.type === 'Polygon' ? [geometria.coordinates] :
            geometria.type === 'MultiPolygon' ? geometria.coordinates : [];
        return polys.some(function (poly) {
            var dentro = false;
            poly.forEach(function (ring) { if (dentroAnillo(ring, p.x, p.y)) dentro = !dentro; });
            return dentro;
        });
    }

    function resolver(candidatos, p) {
        if (!candidatos || !candidatos.length) return '';
        if (p) {
            var coincidentes = candidatos.filter(function (f) { return dentroGeometria(f.geometry, p); });
            if (coincidentes.length === 1) return campo(coincidentes[0].properties, 'ZON_VIG');
            if (coincidentes.length) candidatos = coincidentes;
        }
        var codigos = Array.from(new Set(candidatos.map(function (f) {
            return campo(f.properties, 'ZON_VIG');
        }).filter(Boolean)));
        return codigos.length === 1 ? codigos[0] : '';
    }

    function obtener(props, ubicacion) {
        props = props || {};
        var directo = campo(props, 'ZON_VIG_REAL');
        if (directo) return directo;
        if (!lista.length) return '';
        var p = punto(ubicacion);
        var cuc = campo(props, 'CUC');
        var lote = campo(props, 'COD_LOTE') || campo(props, 'CÓDIGO') || campo(props, 'CODIGO');
        var zona = resolver(cuc && cuc !== '1' && lote ? porPar.get(cuc + '|' + lote) : null, p);
        if (zona) return zona;
        zona = resolver(cuc && cuc !== '1' ? porCuc.get(cuc) : null, p);
        if (zona) return zona;
        zona = resolver(lote ? porLote.get(lote) : null, p);
        if (zona || !p) return zona;
        var cercanos = porCelda.get(Math.floor(p.x / tamanoCelda) + ':' + Math.floor(p.y / tamanoCelda)) || [];
        return resolver(Array.from(new Set(cercanos)).filter(function (f) { return dentroGeometria(f.geometry, p); }), p);
    }

    root.ZONIFICACION_VIGENTE = { obtener: obtener, cargar: cargar,
        get cantidadPoligonos() { return lista.length; } };
})(typeof window !== 'undefined' ? window : globalThis);
