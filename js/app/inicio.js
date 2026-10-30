// Punto de entrada exclusivo del proyecto de retiros. No navega a otro visor.
(function () {
    'use strict';
    function iniciar() {
        document.body.classList.remove('inicio-cargando');
        var bienvenida = document.getElementById('bienvenida-visor');
        if (bienvenida) {
            function cerrarBienvenida() { bienvenida.close(); }
            bienvenida.querySelector('.bienvenida-cerrar').addEventListener('click', cerrarBienvenida);
            bienvenida.querySelector('.bienvenida-ingresar').addEventListener('click', cerrarBienvenida);
            bienvenida.addEventListener('close', function () {
                document.getElementById('boton-buscar-vias').focus({ preventScroll: true });
            });
            bienvenida.showModal();
        }
        window.visorRetiros.entrar();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar, { once: true });
    } else iniciar();
})();
