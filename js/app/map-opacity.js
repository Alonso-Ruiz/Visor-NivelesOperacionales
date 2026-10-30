(function() {
    function iniciarControlTransparencia() {
        var control = document.getElementById('control-transparencia-mapa');
        var boton = document.getElementById('boton-transparencia-mapa');
        var panel = document.getElementById('panel-transparencia-mapa');
        var slider = document.getElementById('map-opacity');

        if (!control || !boton || !panel || !slider) return false;

        if (window.L && L.DomEvent) {
            L.DomEvent.disableClickPropagation(control);
            L.DomEvent.disableScrollPropagation(control);
        }

        function alternarPanel(forzarAbierto) {
            var abrir = typeof forzarAbierto === 'boolean'
                ? forzarAbierto
                : !control.classList.contains('transparencia-abierta');

            if (abrir && window.cerrarPanelesMapa) window.cerrarPanelesMapa('transparencia');
            control.classList.toggle('transparencia-abierta', abrir);
            control.classList.toggle('transparencia-cerrada', !abrir);
            boton.setAttribute('aria-expanded', abrir ? 'true' : 'false');
            boton.setAttribute('aria-label', abrir ? 'Cerrar transparencia del mapa' : 'Abrir transparencia del mapa');
            panel.setAttribute('aria-hidden', abrir ? 'false' : 'true');
        }

        function actualizarOpacidad(valor) {
            var opacidad = parseFloat(valor);

            if (Number.isNaN(opacidad)) {
                opacidad = 0.5;
            }

            opacidad = Math.max(0, Math.min(0.95, opacidad));

            if (typeof mapaSatelital !== 'undefined' && mapaSatelital && typeof mapaSatelital.setOpacity === 'function') {
                mapaSatelital.setOpacity(opacidad);
            }
        }

        slider.addEventListener('input', function(e) {
            actualizarOpacidad(e.target.value);
        });

        boton.addEventListener('click', function() {
            alternarPanel();
        });

        document.addEventListener('click', function(e) {
            if (!control.contains(e.target)) {
                alternarPanel(false);
            }
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                alternarPanel(false);
            }
        });

        actualizarOpacidad(slider.value);
        return true;
    }

    if (!iniciarControlTransparencia()) {
        setTimeout(iniciarControlTransparencia, 100);
    }
})();
