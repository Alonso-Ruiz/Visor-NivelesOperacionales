
        // --- LÓGICA DEL PANEL ---
        const botonArrastre = document.getElementById('boton-arrastre');
        const botonAlturaPanel = document.getElementById('boton-altura-panel');
        var resumenRestriccionesViaActual = null;
        var zonificacionVigenteActual = '';
        var escenarioConObra = false;
        var consultaLoteVigente = 0;
        var contextoATDActual = null;
        var propiedadesLoteATDPorId = null;

        function mostrarSelectorEdificacion(mostrar) {
            var selector = document.getElementById('selector-edificacion');
            if (!selector) return;
            selector.hidden = !mostrar;
            escenarioConObra = false;
            document.getElementById('escenario-existente').setAttribute('aria-pressed', 'true');
            document.getElementById('escenario-con-obra').setAttribute('aria-pressed', 'false');
        }

        document.getElementById('lista-clases-container').addEventListener('click', function (evento) {
            var resumen = evento.target.closest('summary');
            if (!resumen || !this.contains(resumen)) return;
            var giro = resumen.closest('details.giro-fila');
            if (!giro || giro.open) return;
            this.querySelectorAll('details.giro-fila[open]').forEach(function (abierto) {
                if (abierto !== giro) abierto.open = false;
            });
        });

        function restriccionAnterior(zona, clase) {
            var normalizar = function (valor) {
                return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .toLowerCase().replace(/\s+/g, ' ').trim();
            };
            var categoria = normalizar(zona);
            var coincidencias = (window.datosUsosLegacy || []).filter(function (item) {
                return String(item.Clase) === String(clase) && normalizar(item['Uso Compatible']) === categoria &&
                    String(item.Restricciones || '').trim();
            });
            var textos = [];
            coincidencias.forEach(function (item) {
                var texto = String(item.Restricciones || '').trim();
                if (textos.indexOf(texto) === -1) textos.push(texto);
            });
            return textos.join(' ');
        }

        function contextoRestricciones(propiedades, vigente, autorizacion, zona, clase) {
            return {
                zonificacionVigente: vigente,
                autorizacion: tipoAutorizacion(autorizacion),
                via: obtenerPropiedad(propiedades, ['VIA COLIND', 'VIA_COLIND', 'VÍA COLINDANTE', 'VIA COLINDANTE']),
                areaM2: obtenerPropiedad(propiedades, ['ÁREA_M2', 'AREA_M2', 'Area_m2', 'AREA']),
                restriccionPoligono: obtenerPropiedad(propiedades, ['RESTRICCIÓN', 'RESTRICCIÓ', 'RESTRICCI�', 'RESTRICCION']),
                restriccionAnterior: restriccionAnterior(zona, clase)
            };
        }

        function obtenerAreaLote() {
            return loteActual && (loteActual.AREA_M2 || loteActual['ÁREA_M2'] || loteActual['�REA_M2'] || loteActual.Area_ha || loteActual.AREA);
        }

        function actualizarMetaLoteZonificacion() {
            var contenedor = document.getElementById('meta-lote-zonificacion');
            if (!contenedor) return;
            var props = loteActual || {};
            var identificador = obtenerPropiedad(props, ['CÓDIGO', 'C�DIGO', 'CODIGO', 'COD_LOTE', 'CUC']);
            var area = Number(obtenerAreaLote());
            var zona = zonificacionVigenteActual;
            document.getElementById('chip-zonificacion-vigente').textContent = zona
                ? 'Zonificación vigente ' + zona
                : 'Zonificación por verificar';
            document.getElementById('chip-identificacion-lote').textContent = identificador
                ? 'Lote ' + identificador
                : 'Lote seleccionado';
            document.getElementById('chip-area-lote').textContent = Number.isFinite(area) && area > 0
                ? new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(area) + ' m²'
                : 'Área por verificar';
            contenedor.hidden = !Object.keys(props).length;
        }

        function numerosNotasPorZona(zona) {
            var notas = {
                'Uso Residencial Exclusivo': [1],
                'Uso Residencial Preferente': [2],
                'Uso Residencial Especial': [3],
                'Uso Mixto Especializado': [4],
                'Uso de Recreación Pública': [5],
                'Usos Específicos - Hospital': [6],
                'Usos Específicos - Educación': [6],
                'Usos Específicos - Otros Usos': [6]
            };
            return notas[zona] || [];
        }

        function escaparHtml(valor) {
            return String(valor === null || valor === undefined ? '' : valor)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
        }

        function htmlEquivalenciaRev3(giro) {
            // Las equivalencias Rev. 3 no forman parte de la ficha de consulta.
            return '';
        }

        function obtenerPropiedad(obj, nombres) {
            obj = obj || {};
            for (var i = 0; i < nombres.length; i++) {
                var valor = obj[nombres[i]];
                if (valor !== null && valor !== undefined && String(valor).trim() !== '') return valor;
            }
            return '';
        }

        function puntoEnAnilloATD(punto, anillo) {
            var dentro = false;
            for (var i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
                var xi = Number(anillo[i][0]), yi = Number(anillo[i][1]);
                var xj = Number(anillo[j][0]), yj = Number(anillo[j][1]);
                var cruza = ((yi > punto.lat) !== (yj > punto.lat)) &&
                    (punto.lng < (xj - xi) * (punto.lat - yi) / (yj - yi) + xi);
                if (cruza) dentro = !dentro;
            }
            return dentro;
        }

        function puntoEnPoligonoATD(punto, poligono) {
            if (!poligono || !poligono.length || !puntoEnAnilloATD(punto, poligono[0])) return false;
            for (var i = 1; i < poligono.length; i++) {
                if (puntoEnAnilloATD(punto, poligono[i])) return false;
            }
            return true;
        }

        function resolverATD(punto) {
            if (!punto || !Number.isFinite(Number(punto.lat)) || !Number.isFinite(Number(punto.lng))) return '';
            var features = window.json_areas_tratamiento_diferenciado &&
                window.json_areas_tratamiento_diferenciado.features || [];
            for (var i = 0; i < features.length; i++) {
                var feature = features[i];
                var geometria = feature.geometry || {};
                if (geometria.type !== 'MultiPolygon') continue;
                if (geometria.coordinates.some(function(poligono) { return puntoEnPoligonoATD(punto, poligono); })) {
                    return String(feature.properties && feature.properties.ATD || '').trim().toUpperCase();
                }
            }
            return '';
        }

        function esLoteEsquinaATD(propiedades) {
            var configuracion = String(propiedades && propiedades.CONFIG_LOT || '').trim().toLowerCase();
            return configuracion === 'doble frente lateral' || configuracion === 'triple frente' ||
                configuracion === 'mas de tres frentes' || configuracion === 'más de tres frentes';
        }

        function completarPropiedadesUsoATD(propiedades) {
            var resultado = Object.assign({}, propiedades || {});
            var coleccion = window.json_usos_compatibles_0;
            if (!coleccion) return resultado;
            if (!propiedadesLoteATDPorId) {
                propiedadesLoteATDPorId = new Map();
                (coleccion.features || []).forEach(function(feature) {
                    var props = feature.properties || {};
                    ['CUC', 'COD_LOTE'].forEach(function(campo) {
                        var id = String(props[campo] || '').trim();
                        if (id && !propiedadesLoteATDPorId.has(campo + ':' + id)) {
                            propiedadesLoteATDPorId.set(campo + ':' + id, props);
                        }
                    });
                });
            }
            var fuente = null;
            ['CUC', 'COD_LOTE'].some(function(campo) {
                var id = String(resultado[campo] || '').trim();
                if (!id) return false;
                fuente = propiedadesLoteATDPorId.get(campo + ':' + id) || null;
                return Boolean(fuente);
            });
            if (fuente) {
                resultado = Object.assign({}, fuente, resultado);
                Object.keys(propiedades || {}).forEach(function(campo) {
                    var valor = propiedades[campo];
                    if (valor === null || valor === undefined || String(valor).trim() === '') {
                        resultado[campo] = fuente[campo];
                    }
                });
            }
            return resultado;
        }

        function esPoligonoONATD(propiedades) {
            return String(obtenerPropiedad(propiedades, ['RESTRICCI�', 'RESTRICCIÓN', 'RESTRICCIÓ', 'RESTRICCION']))
                .trim().toUpperCase() === 'O.N';
        }

        function actividadesEspecificasATD(busqueda) {
            if (zonaActual !== 'Uso Residencial Preferente') return [];
            var atd = contextoATDActual && contextoATDActual.codigo;
            var esquina = contextoATDActual && contextoATDActual.esquina;
            var ambito = '';
            var especificas = [];
            if (atd === 'C') {
                ambito = 'ATD C';
                especificas = [
                    'Servicios públicos de regulación y facilitación de actividades económicas (Oficinas a puerta cerrada)',
                    'Bodega o tienda de abarrotes (local comercial individual)',
                    'Minimarket (local comercial individual)',
                    'Tienda de Conveniencia',
                    'Cafeterías dentro del giro: Preparación y expendio de bebidas no alcohólicas, postres y comidas ligeras',
                    'Servicios de cuidado capilar, peluquería y barbería',
                    'Venta al por menor de medicamentos y productos farmacéuticos'
                ];
            } else if ((atd === 'A' || atd === 'B') && esquina) {
                ambito = 'ATD ' + atd + ' · esquina';
                especificas = [
                    'Servicios públicos de regulación y facilitación de actividades económicas (Oficinas a puerta cerrada)',
                    'Bodega o tienda de abarrotes (local comercial individual)',
                    'Minimarket (local comercial individual)',
                    'Cafeterías dentro del giro: Preparación y expendio de bebidas no alcohólicas, postres y comidas ligeras'
                ];
            } else if (esPoligonoONATD(loteActual)) {
                ambito = 'Todos lados';
                especificas = [
                    'Servicios públicos de regulación y facilitación de actividades económicas (Oficinas a puerta cerrada)'
                ];
            }
            var items = especificas.map(function(nombre) {
                return {
                    nombre: nombre,
                    ambito: ambito,
                    condiciones: nombre.toLowerCase().indexOf('oficinas a puerta cerrada') !== -1 ? [
                        'En vivienda unifamiliar, el área útil total destinada a la actividad, considerando la suma de todos los ambientes y niveles utilizados para dicho giro, no podrá exceder el 20 % del área del lote.',
                        'En vivienda bifamiliar, multifamiliar o conjunto residencial, el área útil total destinada a la actividad no podrá exceder el 15 % del área de la unidad inmobiliaria declarada como vivienda.'
                    ] : []
                };
            });
            return items.filter(function(item) {
                return !busqueda || coincideBusquedaTexto(busqueda, item.nombre) || coincideBusquedaTexto(busqueda, item.ambito);
            });
        }

        function renderizarActividadesATD(busqueda) {
            var items = actividadesEspecificasATD(busqueda);
            var html = items.map(function(item) {
                var condicion = item.condiciones.map(function(texto) {
                    return '<p class="giro-recordatorio">' + escaparHtml(texto) + '</p>';
                }).join('');
                var notaAmbito = item.ambito === 'Todos lados'
                    ? ''
                    : 'Aplicable según ' + item.ambito + '.';
                var abierto = contextoATDActual.codigo !== 'C' && esPoligonoONATD(loteActual) &&
                    item.nombre.toLowerCase().indexOf('oficinas a puerta cerrada') !== -1 ? ' open' : '';
                return '<details class="giro-fila giro-fila-atd"' + abierto + '><summary><span class="giro-nombre">' +
                    escaparHtml(item.nombre) + '</span><span class="giro-estado">' + escaparHtml(item.ambito) +
                    '</span><span class="giro-chevron" aria-hidden="true"></span></summary><div class="giro-detalle">' +
                    (notaAmbito ? '<p class="giro-recordatorio">' + escaparHtml(notaAmbito) + '</p>' : '') + condicion +
                    '</div></details>';
            }).join('');
            return { html: html, count: items.length };
        }

        var actividadesMixtoVecinalResidencial = [
            'Bodega o tienda de abarrotes (local comercial individual)',
            'Tienda de conveniencia (local comercial individual)',
            'Minimarket (local comercial individual)',
            'Venta al por menor de medicamentos y productos farmacéuticos',
            'Venta al por menor de perfumes, cosméticos y productos de cuidado personal',
            'Servicio de estacionamiento vehicular',
            'Consultorio de profesionales de la salud (excepto médicos cirujanos), sin internamiento',
            'Consultorio médico (con médico cirujano, con o sin especialidad), sin internamiento',
            'Centro odontológico sin internamiento',
            'Sólo servicio de rehabilitación y medicina física en el giro: Servicios especializados o de subespecialidad: medicina nuclear, radioterapia, medicina física, rehabilitación, hemodiálisis, litotripsia, medicina hiperbárica, endoscopias y colposcopias',
            'Servicios de oftalmología',
            'Centros de medicina alternativa',
            'Atención residencial para personas mayores o con discapacidad',
            'Asistencia social diurna para personas mayores o con discapacidad',
            'Asistencia social alimentaria y programas comunitarios',
            'Cuidado diurno infantil'
        ];

        var actividadesMixtoVecinalComercial = [
            'Bodega o tienda de abarrotes (local comercial individual)',
            'Tienda de conveniencia (local comercial individual)',
            'Minimarket (local comercial individual)',
            'Venta al por menor de productos de panadería, confitería y alimentos envasados',
            'Venta al por menor de medicamentos y productos farmacéuticos',
            'Venta al por menor de perfumes, cosméticos y productos de cuidado personal',
            'Venta al por menor de productos medicinales naturales y suplementos terapéuticos',
            'Venta al por menor de productos ortopédicos, material e instrumental médico',
            'Venta al por menor de artículos fotográficos, relojes y joyas',
            'Venta al por menor de productos ópticos',
            'Venta al por menor de animales de compañía, alimentos y accesorios para su cuidado',
            'Servicio de estacionamiento vehicular',
            'Servicios veterinarios ambulatorios',
            'Consultorio de profesionales de la salud (excepto médicos cirujanos), sin internamiento',
            'Consultorio médico (con médico cirujano, con o sin especialidad), sin internamiento',
            'Centro odontológico sin internamiento',
            'Sólo servicio de rehabilitación y medicina física en el giro: Servicios especializados o de subespecialidad: medicina nuclear, radioterapia, medicina física, rehabilitación, hemodiálisis, litotripsia, medicina hiperbárica, endoscopias y colposcopias',
            'Servicios de oftalmología',
            'Centros de medicina alternativa',
            'Atención residencial para personas mayores o con discapacidad',
            'Asistencia social diurna para personas mayores o con discapacidad',
            'Asistencia social alimentaria y programas comunitarios',
            'Cuidado diurno infantil'
        ];

        // Listas del cuadro ZONAL FINAL. Sustituyen el catálogo general solo
        // cuando coinciden la zonificación vigente y el tramo/área aplicable.
        var actividadesMixtoZonalPrimaveraSanLuis = [
            'Elaboración de productos de panadería y pastelería para la venta en el establecimiento',
            'Impresión y reproducción de documentos y material gráfico',
            'Bodega o tienda de abarrotes (local comercial individual)',
            'Tienda de conveniencia (local comercial individual)',
            'Minimarket (local comercial individual)',
            'Venta de artículos de bazar y regalos',
            'Venta al por menor de productos de panadería, confitería y alimentos envasados',
            'Venta al por menor de celulares, computadoras y accesorios',
            'Venta al por menor de muebles, electrodomésticos, menaje y artículos de iluminación',
            'Venta al por menor de libros, revistas y periódicos',
            'Venta al por menor de artículos deportivos y bicicletas',
            'Venta al por menor de prendas de vestir, calzado y artículos de cuero',
            'Venta al por menor de medicamentos y productos farmacéuticos',
            'Venta al por menor de perfumes, cosméticos y productos de cuidado personal',
            'Venta al por menor de productos medicinales naturales y suplementos terapéuticos',
            'Venta al por menor de artículos para celebraciones, decoración, artesanía, flores y plantas',
            'Venta al por menor de artículos fotográficos, relojes y joyas',
            'Venta al por menor de animales de compañía, alimentos y accesorios para su cuidado',
            'Servicio de estacionamiento vehicular',
            'Preparación y expendio de bebidas no alcohólicas, postres y comidas ligeras',
            'Preparación y expendio de comidas y bebidas para consumo inmediato',
            'Servicios de intermediación monetaria en agencias financieras',
            'Servicios de intermediación monetaria mediante cajeros automáticos o agentes corresponsales',
            'Servicios financieros no bancarios de arrendamiento, factoraje y crédito',
            'Servicios notariales',
            'Servicios de abogacía y asesoría jurídica',
            'Servicios de contabilidad, auditoría y asesoría tributaria',
            'Servicios de fotografía profesional',
            'Servicios veterinarios ambulatorios',
            'Consultorio de profesionales de la salud (excepto médicos cirujanos), sin internamiento',
            'Consultorio médico (con médico cirujano, con o sin especialidad), sin internamiento',
            'Centro odontológico sin internamiento',
            'Servicios de atención psicológica y bienestar emocional',
            'Servicios de oftalmología',
            'Centros de medicina alternativa',
            'Atención residencial para personas mayores o con discapacidad',
            'Asistencia social diurna para personas mayores o con discapacidad',
            'Servicios de acondicionamiento físico',
            'Reparación de efectos personales y enseres domésticos, como bicicletas, joyas, relojes, artículos deportivos, libros, instrumentos musicales, juguetes y otros',
            'Lavado y limpieza de prendas de vestir',
            'Tratamientos de belleza y cuidado estético no médico',
            'Sólo servicio de rehabilitación y medicina física en el giro: Servicios especializados o de subespecialidad: medicina nuclear, radioterapia, medicina física, rehabilitación, hemodiálisis, litotripsia, medicina hiperbárica, endoscopias y colposcopias'
        ];

        var actividadesMixtoZonalGalvez = [
            'Elaboración de productos de panadería y pastelería para la venta en el establecimiento',
            'Impresión y reproducción de documentos y material gráfico',
            'Bodega o tienda de abarrotes (local comercial individual)',
            'Tienda de conveniencia (local comercial individual)',
            'Minimarket (local comercial individual)',
            'Venta de artículos de bazar y regalos',
            'Venta al por menor de alimentos frescos y envasados en comercios especializados',
            'Venta al por menor de productos de panadería, confitería y alimentos envasados',
            'Venta al por menor de celulares, computadoras y accesorios',
            'Venta al por menor de alfombras, cortinas, tapices y revestimientos',
            'Venta al por menor de muebles, electrodomésticos, menaje y artículos de iluminación',
            'Venta al por menor de libros, revistas y periódicos',
            'Venta al por menor de artículos de papelería, útiles de escritorio y artículos de oficina',
            'Venta al por menor de artículos deportivos y bicicletas',
            'Venta al por menor de juegos, juguetes y productos recreativos',
            'Venta al por menor de prendas de vestir, calzado y artículos de cuero',
            'Venta al por menor de medicamentos y productos farmacéuticos',
            'Venta al por menor de perfumes, cosméticos y productos de cuidado personal',
            'Venta al por menor de productos medicinales naturales y suplementos terapéuticos',
            'Venta al por menor de artículos para celebraciones, decoración, artesanía, flores y plantas',
            'Venta al por menor de artículos fotográficos, relojes y joyas',
            'Venta al por menor de productos ópticos',
            'Venta al por menor de animales de compañía, alimentos y accesorios para su cuidado',
            'Servicio de estacionamiento vehicular',
            'Servicios postales',
            'Preparación y expendio de bebidas no alcohólicas, postres y comidas ligeras',
            'Cambio de moneda',
            'Servicios de fotografía profesional',
            'Servicios veterinarios ambulatorios',
            'Consultorio de profesionales de la salud (excepto médicos cirujanos), sin internamiento',
            'Consultorio médico (con médico cirujano, con o sin especialidad), sin internamiento',
            'Centro odontológico sin internamiento',
            'Servicios de atención psicológica y bienestar emocional',
            'Servicios de oftalmología',
            'Centros de medicina alternativa',
            'Atención residencial para personas mayores o con discapacidad',
            'Asistencia social diurna para personas mayores o con discapacidad',
            'Reparación de efectos personales y enseres domésticos, como bicicletas, joyas, relojes, artículos deportivos, libros, instrumentos musicales, juguetes y otros',
            'Lavado y limpieza de prendas de vestir',
            'Servicios de cuidado capilar, peluquería y barbería',
            'Sólo servicio de rehabilitación y medicina física en el giro: Servicios especializados o de subespecialidad: medicina nuclear, radioterapia, medicina física, rehabilitación, hemodiálisis, litotripsia, medicina hiperbárica, endoscopias y colposcopias'
        ];

        var actividadesMixtoZonalComercial = [
            'Elaboración de productos de panadería y pastelería para la venta en el establecimiento',
            'Impresión y reproducción de documentos y material gráfico',
            'Bodega o tienda de abarrotes (local comercial individual)',
            'Tienda de conveniencia (local comercial individual)',
            'Minimarket (local comercial individual)',
            'Supermercado (tienda de autoservicio como local comercial individual)',
            'Venta de alimentos para mascotas',
            'Venta de artículos de bazar y regalos',
            'Venta al por menor de alimentos frescos y envasados en comercios especializados',
            'Venta al por menor de carnes, pescados y productos refrigerados',
            'Venta al por menor de productos de panadería, confitería y alimentos envasados',
            'Venta al por menor de celulares, computadoras y accesorios',
            'Venta al por menor de telas, tejidos, artículos de mercería y productos textiles',
            'Venta al por menor de alfombras, cortinas, tapices y revestimientos',
            'Venta al por menor de muebles, electrodomésticos, menaje y artículos de iluminación',
            'Venta al por menor de libros, revistas y periódicos',
            'Venta al por menor de artículos de papelería, útiles de escritorio y artículos de oficina',
            'Venta al por menor de artículos deportivos y bicicletas',
            'Venta al por menor de juegos, juguetes y productos recreativos',
            'Venta al por menor de prendas de vestir, calzado y artículos de cuero',
            'Venta al por menor de medicamentos y productos farmacéuticos',
            'Venta al por menor de perfumes, cosméticos y productos de cuidado personal',
            'Venta al por menor de productos medicinales naturales y suplementos terapéuticos',
            'Venta al por menor de productos ortopédicos, material e instrumental médico',
            'Venta al por menor de artículos para celebraciones, decoración, artesanía, flores y plantas',
            'Venta al por menor de artículos fotográficos, relojes y joyas',
            'Venta al por menor de productos ópticos',
            'Venta al por menor de otros productos nuevos en comercios especializados',
            'Venta al por menor de animales de compañía, alimentos y accesorios para su cuidado',
            'Venta al por menor de artículos de segunda mano, antigüedades y objetos de colección',
            'Venta al por menor por internet o catálogo',
            'Servicio de estacionamiento vehicular',
            'Servicios postales',
            'Hotel',
            'Preparación y expendio de bebidas no alcohólicas, postres y comidas ligeras',
            'Preparación y expendio de comidas y bebidas para consumo inmediato',
            'Servicios de intermediación monetaria en agencias financieras',
            'Servicios de intermediación monetaria mediante cajeros automáticos o agentes corresponsales',
            'Servicios financieros no bancarios de arrendamiento, factoraje y crédito',
            'Gestión de seguros de vida',
            'Administración de fondos de pensiones',
            'Administración de mercados de valores',
            'Cambio de moneda',
            'Corretaje de valores y contratos de productos financieros',
            'Arrendamiento y operación de inmuebles propios o arrendados',
            'Corretaje y administración de bienes inmuebles',
            'Servicios notariales',
            'Servicios de abogacía y asesoría jurídica',
            'Servicios de contabilidad, auditoría y asesoría tributaria',
            'Actividades de oficinas principales, sedes y oficinas administrativas',
            'Publicidad y gestión de medios publicitarios',
            'Servicios de fotografía profesional',
            'Servicios veterinarios con cirugía, diagnóstico u hospitalización',
            'Servicios veterinarios ambulatorios',
            'Enseñanza técnico-productiva',
            'Enseñanza cultural y artística',
            'Capacitación profesional y enseñanza complementaria',
            'Centro de salud sin internamiento',
            'Centro médico sin internamiento',
            'Centro médico especializado sin internamiento',
            'Policlínico sin internamiento',
            'Consultorio de profesionales de la salud (excepto médicos cirujanos), sin internamiento',
            'Consultorio médico (con médico cirujano, con o sin especialidad), sin internamiento',
            'Centro odontológico sin internamiento',
            'Servicios de atención psicológica y bienestar emocional',
            'Servicios de patología clínica, laboratorio clínico, diagnóstico por imágenes y toma de muestras',
            'Servicios ambulatorios de enfermería, nutrición y otros similares',
            'Servicios de oftalmología',
            'Laboratorios de prótesis dental',
            'Ortopedias y servicios de podología',
            'Centros de medicina alternativa',
            'Asistencia social diurna para personas mayores o con discapacidad',
            'Servicios de acondicionamiento físico',
            'Reparación de calzado y artículos de cuero',
            'Reparación de efectos personales y enseres domésticos, como bicicletas, joyas, relojes, artículos deportivos, libros, instrumentos musicales, juguetes y otros',
            'Lavado y limpieza de prendas de vestir',
            'Servicios de cuidado capilar, peluquería y barbería',
            'Tratamientos de belleza y cuidado estético no médico',
            'Servicios personales de bienestar no médico y modificación corporal',
            'Servicios especializados o de subespecialidad: medicina nuclear, radioterapia, medicina física, rehabilitación, hemodiálisis, litotripsia, medicina hiperbárica, endoscopias y colposcopias'
        ];

        function reglaEspecialMixtoZonal() {
            if (zonaActual !== 'Uso Mixto Zonal') return null;
            var codigo = String(zonificacionVigenteActual || '').trim().toUpperCase();
            var codigoOrigen = String(obtenerPropiedad(loteActual, ['ZON_VIG']) || '').trim().toUpperCase();
            var via = obtenerPropiedad(loteActual, ['VIA COLIND', 'VIA_COLIND', 'VÍA COLINDANTE', 'VIA COLINDANTE']);
            // En San Luis y Primavera la regla especial del tramo tiene
            // prioridad incluso si el lote está clasificado como comercial.
            if (coincideNombreVia('Primavera', via) || coincideNombreVia('San Luis', via)) {
                return { tipo: 'Residencial', ambito: 'Tramos Av. Primavera / Av. San Luis',
                    nota: 'Esta lista aplica a los lotes de Uso Mixto Zonal ubicados en Av. Primavera o Av. San Luis, incluso si tienen característica comercial.',
                    actividades: actividadesMixtoZonalPrimaveraSanLuis };
            }
            if (['CV', 'CZ'].indexOf(codigo) !== -1) {
                return { tipo: 'Comercial', ambito: 'ÁREAS COMERCIALES',
                    nota: 'Esta lista aplica a todas las áreas comerciales de Uso Mixto Zonal (CV y CZ).',
                    actividades: actividadesMixtoZonalComercial };
            }
            // ZON_VIG del polígono de usos usa códigos anteriores (ZDB/ZDM/ZDA).
            // Sirve como respaldo solo cuando aún no se resolvió la zonificación vigente.
            var codigoResidencial = ['RDB', 'RDM', 'RDA'].indexOf(codigo) !== -1 ||
                (!codigo && ['ZDB', 'ZDM', 'ZDA'].indexOf(codigoOrigen) !== -1);
            if (codigoResidencial) {
                if (coincideNombreVia('Gálvez Barrenechea', via)) {
                    return { tipo: 'Residencial', ambito: 'Residencial · Av. Gálvez Barrenechea',
                        nota: 'Esta lista aplica a los lotes residenciales de Uso Mixto Zonal ubicados en Av. Gálvez Barrenechea.',
                        actividades: actividadesMixtoZonalGalvez };
                }
            }
            return null;
        }

        function renderizarListaEspecialMixtoZonal(busqueda, regla) {
            var actividades = regla.actividades.filter(function(nombre) {
                return !busqueda || coincideBusquedaTexto(busqueda, nombre);
            });
            var html = actividades.map(function(nombre) {
                return '<details class="giro-fila giro-fila-especial-mv"><summary><span class="giro-nombre">' +
                    escaparHtml(nombre) + '</span><span class="giro-estado">' + escaparHtml(regla.tipo) +
                    '</span><span class="giro-chevron" aria-hidden="true"></span></summary>' +
                    '<div class="giro-detalle"><div class="giro-codigo">Uso Mixto Zonal · ' +
                    escaparHtml(regla.tipo) + '</div><p class="giro-recordatorio">' + escaparHtml(regla.nota) +
                    '</p></div></details>';
            }).join('');
            return { html: html, count: actividades.length };
        }

        function reglaEspecialMixtoVecinal() {
            if (zonaActual !== 'Uso Mixto Vecinal') return null;
            var codigo = String(zonificacionVigenteActual || '').trim().toUpperCase();
            if (codigo === 'CV' || codigo === 'CZ') {
                return {
                    tipo: 'Comercial',
                    ambito: 'ÁREAS COMERCIALES',
                    nota: 'Esta lista aplica a todas las áreas comerciales de Uso Mixto Vecinal (CV y CZ).',
                    actividades: actividadesMixtoVecinalComercial
                };
            }
            if (['RDB', 'RDM', 'RDA'].indexOf(codigo) !== -1) {
                var via = obtenerPropiedad(loteActual, ['VIA COLIND', 'VIA_COLIND', 'VÍA COLINDANTE', 'VIA COLINDANTE']);
                if (coincideNombreVia('San Borja Norte', via) || coincideNombreVia('San Borja Sur', via)) {
                    return {
                        tipo: 'Residencial',
                        ambito: 'En vías de carácter metropolitano (San Borja Norte y Sur)',
                        nota: 'Esta lista aplica a los lotes residenciales de Uso Mixto Vecinal ubicados en esos tramos.',
                        actividades: actividadesMixtoVecinalResidencial
                    };
                }
            }
            return null;
        }

        function renderizarListaEspecialMixtoVecinal(busqueda, regla) {
            var actividades = regla.actividades.filter(function(nombre) {
                return !busqueda || coincideBusquedaTexto(busqueda, nombre);
            });
            var html = actividades.map(function(nombre) {
                return '<details class="giro-fila giro-fila-especial-mv"><summary><span class="giro-nombre">' +
                    escaparHtml(nombre) + '</span><span class="giro-estado">' + escaparHtml(regla.tipo) +
                    '</span><span class="giro-chevron" aria-hidden="true"></span></summary>' +
                    '<div class="giro-detalle"><div class="giro-codigo">Uso Mixto Vecinal · ' +
                    escaparHtml(regla.tipo) + '</div><p class="giro-recordatorio">' + escaparHtml(regla.nota) +
                    '</p></div></details>';
            }).join('');
            return { html: html, count: actividades.length };
        }

        function obtenerRestriccionPoligono() {
            return obtenerPropiedad(loteActual,
                ['RESTRICCIÓN', 'RESTRICCIÓ', 'RESTRICCI�', 'RESTRICCION']);
        }

        function poligonoRayadoActual() {
            var categoria = String(loteActual && loteActual.USOS_COMPA || '');
            if (window.normalizarCategoriaUso) categoria = window.normalizarCategoriaUso(categoria);
            return categoria.indexOf('Planes Especiales') === 0;
        }

        function renderizarRestriccionesGiro(regla, titulo) {
            if (!regla || !regla.condiciones || !regla.condiciones.length) return '';
            var items = regla.condiciones.map(function(c) {
                var estado = '';
                if (c.estado === 'cumple') estado = '<span class="estado-condicion cumple">Cumple según área del lote</span>';
                if (c.estado === 'no-cumple') estado = '<span class="estado-condicion no-cumple">No cumple según área del lote</span>';
                if (c.estado === 'no-verificable') estado = '<span class="estado-condicion revisar">Revisar ubicación</span>';
                return '<li><strong>' + escaparHtml(c.etiqueta) + ':</strong> ' + escaparHtml(c.valor) +
                    (c.detalle ? '<small>' + escaparHtml(c.detalle) + '</small>' : '') + estado + '</li>';
            }).join('');
            return '<div class="bloque-restricciones-giro">' +
                '<div class="titulo-restricciones-giro"><i class="fas fa-clipboard-check"></i> ' + escaparHtml(titulo || 'Restricciones del giro') + '</div>' +
                (regla.grupo ? '<div class="grupo-restriccion">Clase agrupada: ' + escaparHtml(regla.grupo) + '</div>' : '') +
                '<ul>' + items + '</ul></div>';
        }

        function tokensNombreVia(nombre) {
            return String(nombre || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/\uFFFD/g, '').toLowerCase()
                .replace(/\b(tnte|tnt)\b/g, 'teniente')
                .replace(/\b(av|avenida|jr|jiron|calle|cl|pje|pasaje)\b/g, ' ')
                .replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/)
                .filter(function(t) { return t && !['de', 'del', 'la', 'las', 'el', 'los'].includes(t); });
        }

        function distanciaEdicionUnitaria(a, b) {
            if (a === b) return 0;
            if (Math.abs(a.length - b.length) > 1) return 2;
            var i = 0, j = 0, cambios = 0;
            while (i < a.length && j < b.length) {
                if (a[i] === b[j]) { i++; j++; continue; }
                if (++cambios > 1) return cambios;
                if (a.length > b.length) i++;
                else if (b.length > a.length) j++;
                else { i++; j++; }
            }
            if (i < a.length || j < b.length) cambios++;
            return cambios;
        }

        function coincideNombreVia(nombreBuscado, nombreColindante) {
            var buscado = tokensNombreVia(nombreBuscado);
            var colindante = tokensNombreVia(nombreColindante);
            if (!buscado.length || !colindante.length) return false;

            var direcciones = ['norte', 'sur', 'este', 'oeste'];
            var direccionBuscada = buscado.find(function(t) { return direcciones.includes(t); });
            var direccionColindante = colindante.find(function(t) { return direcciones.includes(t); });
            if (direccionBuscada && direccionColindante && direccionBuscada !== direccionColindante) return false;
            if (direccionBuscada && !direccionColindante) buscado = buscado.filter(function(t) { return t !== direccionBuscada; });
            if (direccionColindante && !direccionBuscada) colindante = colindante.filter(function(t) { return t !== direccionColindante; });

            var coincidencias = buscado.filter(function(token) {
                return colindante.some(function(otro) {
                    return token === otro || (Math.min(token.length, otro.length) >= 5 && distanciaEdicionUnitaria(token, otro) <= 1);
                });
            }).length;
            return coincidencias >= Math.ceil(Math.max(buscado.length, colindante.length) * 0.67);
        }

        function claveZonaActividad(nombreZona) {
            var mapa = {
                'Uso Residencial Exclusivo': 'Uso Mixto Vecinal',
                'Uso Residencial Preferente': 'Uso Residencial Preferente',
                'Uso Residencial Especial': 'Uso Residencial Especial',
                'Uso Mixto Vecinal': 'Uso Mixto Vecinal',
                'Uso Mixto Zonal': 'Uso Mixto Zonal',
                'Uso Mixto Metropolitano': 'Uso Mixto Metropolitano',
                'Uso Mixto Intensivo': 'Uso Mixto Intensivo',
                'Uso Mixto Especializado': 'Uso Mixto Especializado',
                'Uso de Recreación Pública': 'Uso de Recreación Pública',
                'Usos Específicos - Otros Usos': 'Otros Usos',
                'Usos Específicos - Educación': 'Educación',
                'Usos Específicos - Hospital': 'Hospitales'
            };
            return mapa[nombreZona] || nombreZona;
        }

        function cajasCercanasDeVia(segmentos) {
            var margen = 0.00018;
            var cajas = [];
            function agregarLineas(coordenadas) {
                if (!coordenadas || !coordenadas.length) return;
                if (Array.isArray(coordenadas[0]) && typeof coordenadas[0][0] === 'number') {
                    for (var i = 1; i < coordenadas.length; i++) {
                        var a = coordenadas[i - 1], b = coordenadas[i];
                        cajas.push({
                            minX: Math.min(a[0], b[0]) - margen,
                            maxX: Math.max(a[0], b[0]) + margen,
                            minY: Math.min(a[1], b[1]) - margen,
                            maxY: Math.max(a[1], b[1]) + margen
                        });
                    }
                    return;
                }
                coordenadas.forEach(agregarLineas);
            }
            (segmentos || []).forEach(function(feature) {
                if (feature.geometry) agregarLineas(feature.geometry.coordinates);
            });
            return cajas;
        }

        function cajaGeometria(geometria) {
            if (!geometria || !geometria.coordinates) return null;
            var caja = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
            function revisar(coordenadas) {
                if (typeof coordenadas[0] === 'number') {
                    caja.minX = Math.min(caja.minX, coordenadas[0]);
                    caja.maxX = Math.max(caja.maxX, coordenadas[0]);
                    caja.minY = Math.min(caja.minY, coordenadas[1]);
                    caja.maxY = Math.max(caja.maxY, coordenadas[1]);
                    return;
                }
                coordenadas.forEach(revisar);
            }
            revisar(geometria.coordinates);
            return Number.isFinite(caja.minX) ? caja : null;
        }

        function cajasSeCruzan(a, b) {
            return a && b && a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
        }

        function construirResumenRestriccionesVia(nombreVia, segmentos) {
            var coleccion = window.json_usos_compatibles_0;
            var motor = window.RESTRICCIONES_IIUU;
            var features = coleccion && coleccion.features || [];
            var lotes = new Map();
            var restricciones = new Map();
            var cajasVia = cajasCercanasDeVia(segmentos);

            features.forEach(function(feature, indiceFeature) {
                var propiedades = feature.properties || {};
                var viaColindante = obtenerPropiedad(propiedades, ['VIA COLIND', 'VIA_COLIND', 'VÍA COLINDANTE', 'VIA COLINDANTE']);
                var coincideAtributo = coincideNombreVia(nombreVia, viaColindante);
                if (!coincideAtributo && cajasVia.length) {
                    var cajaLote = cajaGeometria(feature.geometry);
                    coincideAtributo = cajasVia.some(function(cajaVia) { return cajasSeCruzan(cajaLote, cajaVia); });
                }
                if (!coincideAtributo) return;

                var zona = String(propiedades.USOS_COMPA || '').trim();
                if (window.normalizarCategoriaUso) zona = window.normalizarCategoriaUso(zona);
                if (zona === 'Usos Específicos') zona = 'Usos Específicos - Otros Usos';
                if (!zona) return;
                var zonVig = String(propiedades.ZON_VIG || '').trim();
                var idBase = obtenerPropiedad(propiedades, ['CUC', 'COD_LOTE', 'CÓDIGO', 'C�DIGO', 'CODIGO']) || ('poligono-' + indiceFeature);
                var etiquetaLote = obtenerPropiedad(propiedades, ['CÓDIGO', 'C�DIGO', 'CODIGO', 'COD_LOTE', 'CUC']) || ('Polígono ' + (indiceFeature + 1));
                var tramo = obtenerPropiedad(propiedades, ['TRAMO']);
                var idLote = String(idBase) + '|' + zona + '|' + zonVig;
                if (lotes.has(idLote)) return;
                lotes.set(idLote, { etiqueta: String(etiquetaLote), tramo: String(tramo || ''), zona: zona });

                function agregarRestriccion(giro, clase, autorizacion, regla) {
                    if (autorizacion !== 'R') return;
                    if (!regla || !regla.condiciones || !regla.condiciones.length) {
                        regla = { condiciones: [{ etiqueta: 'Régimen de restricción', valor: 'Esta actividad está marcada con R en el índice.' }] };
                    }
                    var codigoGiro = giro.COD_GIRO || ('CIIU ' + clase);
                    var actividad = giro.ACTIVIDAD || giro['DESCRIPCIÓN DE LA CLASE'] || '';
                    var clave = [zona, zonVig, clase, codigoGiro, actividad, JSON.stringify(regla.condiciones)].join('|');
                    if (!restricciones.has(clave)) {
                        restricciones.set(clave, {
                            zona: zona,
                            zonVig: zonVig,
                            clase: String(clase || ''),
                            codigo: String(codigoGiro),
                            actividad: String(actividad),
                            regla: regla,
                            lotes: new Set()
                        });
                    }
                    restricciones.get(clave).lotes.add(idLote);
                }

                if (esZonaReglamentacionEspecial(zona, zonVig)) {
                    var ubicacion = motor && motor.resolverUbicacionZRE ? motor.resolverUbicacionZRE(zonVig, propiedades) : '';
                    if (!ubicacion || !motor) return;
                    (window.datosActividadesZRE || []).forEach(function(giro) {
                        var auth = motor.autorizacionZRE ? motor.autorizacionZRE(giro, zonVig, ubicacion) : null;
                        if (auth !== 'R') return;
                        agregarRestriccion(giro, giro.CLASE, auth, motor.obtenerZRE ? motor.obtenerZRE(giro, zonVig, ubicacion) : null);
                    });
                    return;
                }

                var zonaKey = claveZonaActividad(zona);
                (obtenerActividadesIndice() || []).forEach(function(giro) {
                    var auth = giro.ZONAS && giro.ZONAS[zonaKey];
                    if (!tipoAutorizacion(auth)) return;
                    var vigente = window.ZONIFICACION_IIUU ? window.ZONIFICACION_IIUU.obtener(propiedades) : '';
                    var regla = motor && motor.obtener ? motor.obtener(zona, giro.CLASE,
                        contextoRestricciones(propiedades, vigente, auth, zona, giro.CLASE)) : null;
                    if (tipoAutorizacion(auth) !== 'R' && (!regla || !regla.condiciones.length)) return;
                    agregarRestriccion(giro, giro.CLASE, 'R', regla);
                });
            });

            return {
                nombre: nombreVia,
                lotes: Array.from(lotes.values()),
                lotesPorId: lotes,
                restricciones: Array.from(restricciones.values())
            };
        }

        function renderizarRestriccionesDeVia(busqueda) {
            var resumen = resumenRestriccionesViaActual;
            var restricciones = resumen ? resumen.restricciones : [];
            if (busqueda) {
                restricciones = restricciones.filter(function(item) {
                    return coincideBusquedaTexto(busqueda, [item.zona, item.codigo, item.actividad, item.clase].join(' '));
                });
            }
            document.getElementById('ventanas-zona').style.display = 'none';
            document.getElementById('ayuda-panel').style.display = 'none';
            document.getElementById('nombre-uso-titulo').textContent = 'Restricciones del giro · ' + (resumen ? resumen.nombre : 'vía');
            document.getElementById('conteo-resumen').innerHTML =
                '<strong>' + (resumen ? resumen.lotes.length : 0) + '</strong> polígonos del frente · ' +
                '<strong>' + restricciones.length + '</strong> entradas de giros restringidos' +
                (busqueda ? ' (filtradas por la búsqueda).' : '.');

            var contenido = restricciones.map(function(item) {
                var giro = { ACTIVIDAD: item.actividad, COD_GIRO: item.codigo, CLASE: item.clase };
                var detalle = '<p class="giro-recordatorio">Zona: ' + escaparHtml(item.zona) + '</p>' +
                    renderizarRestriccionesGiro(item.regla, 'Restricciones del giro');
                return renderizarFilaGiro(giro, {
                    estado: 'Con condiciones', restringido: true,
                    extraHtml: detalle
                });
            }).join('');
            actualizarListaAlfabetica(contenido ||
                "<p class='mensaje-vacio'>No se encontraron giros restringidos registrados para esta vía.</p>");
        }

        window.mostrarRestriccionesPorVia = function(nombreVia, segmentos) {
            resumenRestriccionesViaActual = construirResumenRestriccionesVia(nombreVia, segmentos);
            zonaActual = '';
            zonVigActual = '';
            zreUsocomActual = '';
            loteActual = {};
            actualizarMetaLoteZonificacion();
            mostrarSelectorEdificacion(false);
            panel.classList.remove('panel-expandido', 'minimizado');
            document.body.classList.add('panel-abierto');
            sincronizarAlturaPanel();
            if (window.sincronizarBotonDetalleMovil) window.sincronizarBotonDetalleMovil();
            document.getElementById('buscador-actividad').value = '';
            actualizarBotonLimpiarBusqueda();
            document.getElementById('contenido-scrollable').scrollTop = 0;
            renderizarRestriccionesDeVia('');
        };

        function renderizarRegimenTransitorio() {
            var regimen = window.RESTRICCIONES_IIUU && window.RESTRICCIONES_IIUU.regimenResidencialExclusivo;
            if (!regimen) return '';
            var html = regimen.resumen ? '<p class="regimen-resumen">' + escaparHtml(regimen.resumen) + '</p>' : '';
            if (regimen.condiciones && regimen.condiciones.length) {
                html += '<ol class="regimen-lista">' + regimen.condiciones.map(function(c) {
                    return '<li>' + escaparHtml(c) + '</li>';
                }).join('') + '</ol>';
            }
            if (regimen.nota) html += '<p class="regimen-nota"><strong>Declaratoria posterior:</strong> ' + escaparHtml(regimen.nota) + '</p>';
            if (regimen.vigencia) html += '<p class="regimen-nota"><strong>Vigencia:</strong> ' + escaparHtml(regimen.vigencia) + '</p>';
            if (regimen.cierre) html += '<p class="regimen-nota">' + escaparHtml(regimen.cierre) + '</p>';
            return html;
        }

        function esZonaReglamentacionEspecial(nombreZona, zonVig) {
            return String(nombreZona || '').indexOf('Planes Especiales') === 0 && /^ZRE-\d/.test(String(zonVig || '').trim());
        }

        function usoEspecialDesdeCategoria(nombreZona) {
            var partes = String(nombreZona || '').split(' - ');
            return partes.length > 1 ? partes.slice(1).join(' - ') : '';
        }

        function obtenerActividadesIndice() {
            return Array.isArray(window.datosActividadesIndice) && datosActividadesIndice.length
                ? datosActividadesIndice
                : datosActividades;
        }

        function actualizarListaAlfabetica(html) {
            var lista = document.getElementById('lista-clases-container');
            lista.innerHTML = html;
            var collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });
            Array.prototype.slice.call(lista.children).sort(function(a, b) {
                var nombreA = a.querySelector('.giro-nombre');
                var nombreB = b.querySelector('.giro-nombre');
                return collator.compare(nombreA ? nombreA.textContent : a.textContent,
                    nombreB ? nombreB.textContent : b.textContent);
            }).forEach(function(elemento) { lista.appendChild(elemento); });
        }

        function actualizarBotonLimpiarBusqueda() {
            var campo = document.getElementById('buscador-actividad');
            document.getElementById('limpiar-busqueda-actividad').hidden = campo.value.length === 0;
        }

        function coincideActividadIndice(busqueda, giro) {
            if (!busqueda || !giro) return false;
            var terminos = [giro.ACTIVIDAD, giro.COD_GIRO].concat(giro.BUSQUEDA || [], giro.NOMBRES_PARA_EL_VISOR || []);
            return terminos.some(function(termino) {
                return coincideBusquedaTexto(busqueda, termino);
            });
        }

        function renderizarFilaGiro(giro, opciones) {
            opciones = opciones || {};
            var clase = String(giro.CLASE || opciones.clase || '');
            var numero = String(giro['N°'] || '').trim();
            var codigo = String(giro.COD_GIRO || (clase && numero ? clase + '-' + numero : ''));
            var nombreComun = giro.NOMBRE_COMUN || (window.nombresComunesGiros && nombresComunesGiros[codigo]) || giro.ACTIVIDAD || '';
            var nombreTecnico = String(giro.ACTIVIDAD || '');
            var detalleTecnico = nombreTecnico && nombreTecnico !== nombreComun
                ? '<div class="giro-tecnico"><span>Giro técnico</span>' + escaparHtml(nombreTecnico) + '</div>'
                : '';
            var descripcionClase = String(giro['DESCRIPCIÓN DE LA CLASE'] || opciones.descripcionClase || '');
            var detalleClase = '<div class="giro-codigo">CIIU ' + escaparHtml(clase) +
                (codigo ? ' · ' + escaparHtml(codigo) : '') + '</div>' +
                (descripcionClase ? '<div class="giro-descripcion-clase">' + escaparHtml(descripcionClase) + '</div>' : '');
            var estado = opciones.estado ? '<span class="giro-estado' + (opciones.restringido ? ' giro-estado-restringido' : '') + (opciones.obra ? ' giro-estado-obra' : '') + '">' +
                escaparHtml(opciones.estado) + '</span>' : '';
            var extra = opciones.extraHtml || '';
            var observacion = giro.OBSERVACIONES ? '<p class="giro-observacion">' + escaparHtml(giro.OBSERVACIONES) + '</p>' : '';
            return '<details class="giro-fila"' + (opciones.open ? ' open' : '') + '>' +
                '<summary><span class="giro-nombre">' + escaparHtml(nombreComun) + '</span>' + estado +
                '<span class="giro-chevron" aria-hidden="true"></span></summary>' +
                '<div class="giro-detalle">' + detalleTecnico + detalleClase + observacion + extra + '</div></details>';
        }

        function renderizarBusquedaGlobal(busqueda) {
            var contVentanas = document.getElementById('ventanas-zona');
            contVentanas.style.display = 'none';

            if (!busqueda) {
                document.getElementById('nombre-uso-titulo').innerHTML = 'Seleccione un polígono';
                document.getElementById('ayuda-panel').style.display = '';
                document.getElementById('conteo-resumen').innerHTML = 'Haz clic en un polígono del mapa para consultar...';
                document.getElementById('lista-clases-container').innerHTML = '';
                return;
            }

            document.getElementById('nombre-uso-titulo').innerHTML = 'Consulta general';
            document.getElementById('ayuda-panel').style.display = 'none';

            var clasesGlobales = {};
            datosUsos.forEach(function(item) {
                var clase = String(item.Clase || '').trim();
                var descripcion = String(item['Descripción'] || '').trim();
                var coincideUso = coincideBusquedaTexto(busqueda, item['Uso Compatible']) ||
                    coincideBusquedaTexto(busqueda, item['Autorización']);
                var girosClase = obtenerActividadesIndice().filter(function(g) {
                    return String(g.CLASE) === clase;
                });
                var girosCoinciden = girosClase.filter(function(g) {
                    return coincideActividadIndice(busqueda, g) ||
                        coincideBusquedaTexto(busqueda, g.CLASE) ||
                        coincideBusquedaTexto(busqueda, g['DESCRIPCIÓN DE LA CLASE']);
                });
                var coincideClase = coincideBusquedaTexto(busqueda, clase) ||
                    coincideBusquedaTexto(busqueda, descripcion) ||
                    coincideUso;
                if (!coincideClase && !girosCoinciden.length) return;

                if (!clasesGlobales[clase]) {
                    clasesGlobales[clase] = {
                        clase: clase,
                        descripcion: descripcion,
                        usos: [],
                        giros: coincideClase ? girosClase : girosCoinciden
                    };
                }
                clasesGlobales[clase].usos.push(item);
                if (!coincideClase) {
                    clasesGlobales[clase].giros = clasesGlobales[clase].giros.concat(girosCoinciden);
                }
            });

            var clases = Object.values(clasesGlobales).map(function(item) {
                var girosUnicos = {};
                item.giros.forEach(function(g) {
                    girosUnicos[String(g.ACTIVIDAD)] = g;
                });
                item.giros = Object.values(girosUnicos);
                return item;
            });

            var totalGirosGlobal = clases.reduce(function(total, item) { return total + item.giros.length; }, 0);
            document.getElementById('conteo-resumen').innerHTML =
                'Consulta general: <strong>' + totalGirosGlobal + '</strong> actividades encontradas.';

            var htmlContenido = '';
            clases.forEach(function(item) {
                var usosHtml = '<div class="usos-globales">';
                item.usos.forEach(function(uso) {
                    var esRestringido = /restricci[oó]n/i.test(String(uso['Autorización'] || ''));
                    var badgeColor = esRestringido ? '#ffca28' : '#4CAF50';
                    var badgeTexto = esRestringido ? '#1d1d1d' : '#fff';
                    var badgeLabel = esRestringido ? 'Permitido con restricción' : 'Permitido';
                    usosHtml += '<span class="uso-global-badge" style="background:' + badgeColor + ';color:' + badgeTexto + ';">' +
                        escaparHtml(badgeLabel) + '</span>';
                });
                usosHtml += '</div>';

                var girosHtml = '';
                if (item.giros.length > 0) {
                    item.giros.forEach(function(g) {
                        htmlContenido += renderizarFilaGiro(g, {
                            estado: 'Consulta general',
                            extraHtml: usosHtml + htmlEquivalenciaRev3(g)
                        });
                    });
                } else {
                    girosHtml = "<p class='mensaje-vacio mensaje-vacio-compacto'>No hay giros específicos detallados para esta clase.</p>";
                    htmlContenido += '<div class="sin-giros-clase"><strong>CIIU: ' + escaparHtml(item.clase) + '</strong>' +
                        '<span>' + escaparHtml(item.descripcion) + '</span>' + girosHtml + usosHtml + '</div>';
                }
            });

            actualizarListaAlfabetica(htmlContenido ||
                "<p class='mensaje-vacio'>No se encontraron clases CIIU o actividades para la búsqueda ingresada.</p>");
        }

        function alternarPanel() {
            var abrir = panel.classList.contains('minimizado');
            panel.classList.toggle('minimizado', !abrir);
            panel.classList.remove('panel-expandido');
            document.body.classList.toggle('panel-abierto', abrir);

            if(!abrir) {
                if(capaLoteResaltado) { map.removeLayer(capaLoteResaltado); capaLoteResaltado = null; }
                if (window.limpiarBordeBloqueSeleccionado) window.limpiarBordeBloqueSeleccionado();
                map.closePopup();
            }

            sincronizarAlturaPanel();
        }

        window.limpiarEstadoPanelVisor = function() {
            if (capaLoteResaltado && map.hasLayer(capaLoteResaltado)) map.removeLayer(capaLoteResaltado);
            capaLoteResaltado = null;
            window.capaLoteResaltado = null;
            if (window.limpiarBordeBloqueSeleccionado) window.limpiarBordeBloqueSeleccionado();
            if (window.limpiarRetiroResaltado) window.limpiarRetiroResaltado();
            if (capaResaltadoVia && map.hasLayer(capaResaltadoVia)) map.removeLayer(capaResaltadoVia);
            capaResaltadoVia = null;
            map.closePopup();

            zonaActual = '';
            zonVigActual = '';
            zreUsocomActual = '';
            loteActual = {};
            resumenRestriccionesViaActual = null;
            zonificacionVigenteActual = '';
            consultaLoteVigente += 1;
            mostrarSelectorEdificacion(false);
            actualizarMetaLoteZonificacion();
            panel.classList.add('minimizado');
            panel.classList.remove('panel-expandido');
            document.body.classList.remove('panel-abierto');
            document.getElementById('nombre-uso-titulo').textContent = 'Seleccione un polígono';
            document.getElementById('ayuda-panel').style.display = '';
            document.getElementById('conteo-resumen').textContent = 'Haz clic en un polígono del mapa para consultar...';
            document.getElementById('lista-clases-container').innerHTML = '';
            document.getElementById('buscador-actividad').value = '';
            actualizarBotonLimpiarBusqueda();
            actualizarMetaLoteZonificacion();
            var restricciones = document.getElementById('ventana-restricciones');
            var observaciones = document.getElementById('ventana-observaciones');
            if (restricciones) restricciones.style.display = 'none';
            if (observaciones) observaciones.style.display = 'none';
            if (window.sincronizarBotonDetalleMovil) window.sincronizarBotonDetalleMovil();
            sincronizarAlturaPanel();
        };

        function sincronizarAlturaPanel() {
            if (!botonAlturaPanel) return;
            var expandido = panel.classList.contains('panel-expandido');
            botonAlturaPanel.setAttribute('aria-label', expandido ? 'Reducir detalle del lote' : 'Expandir detalle del lote');
            botonAlturaPanel.setAttribute('aria-expanded', expandido ? 'true' : 'false');
        }

        function establecerPanelExpandido(expandido) {
            if (panel.classList.contains('minimizado')) return;
            panel.classList.toggle('panel-expandido', expandido);
            sincronizarAlturaPanel();
        }

        botonArrastre.addEventListener('click', alternarPanel);

        (function iniciarBotonDetalleMovil() {
            var botonDetalle = document.getElementById('boton-detalle-movil');
            if (!botonDetalle) return;

            function sincronizarBotonDetalle() {
                var abierto = !panel.classList.contains('minimizado');
                botonDetalle.classList.toggle('detalle-abierto', abierto);
                botonDetalle.setAttribute('aria-expanded', abierto ? 'true' : 'false');
                botonDetalle.setAttribute('aria-label', abierto ? 'Cerrar detalle del lote' : 'Abrir detalle del lote');
            }

            window.sincronizarBotonDetalleMovil = sincronizarBotonDetalle;

            botonDetalle.addEventListener('click', function() {
                if (document.body.classList.contains('modo-retiros')) return;
                if (window.cerrarPanelesMapa) window.cerrarPanelesMapa();
                alternarPanel();
                sincronizarBotonDetalle();
            });

            botonArrastre.addEventListener('click', sincronizarBotonDetalle);
            botonArrastre.addEventListener('touchend', function() {
                setTimeout(sincronizarBotonDetalle, 80);
            }, {passive: true});
            sincronizarBotonDetalle();
        })();

        if (botonAlturaPanel) {
            botonAlturaPanel.addEventListener('click', function(e) {
                e.stopPropagation();
                establecerPanelExpandido(!panel.classList.contains('panel-expandido'));
            });
        }

        (function iniciarNivelesPanelMovil() {
            var cabecera = panel.querySelector('.cabecera-negra');
            if (!cabecera) return;
            var inicioY = 0;

            cabecera.addEventListener('touchstart', function(e) {
                if (e.target.closest('#boton-arrastre, #boton-altura-panel')) return;
                inicioY = e.touches[0].clientY;
            }, {passive: true});

            cabecera.addEventListener('touchend', function(e) {
                if (!inicioY || e.target.closest('#boton-arrastre, #boton-altura-panel')) return;
                var diferencia = e.changedTouches[0].clientY - inicioY;
                inicioY = 0;

                if (diferencia < -42) {
                    establecerPanelExpandido(true);
                } else if (diferencia > 42) {
                    if (panel.classList.contains('panel-expandido')) {
                        establecerPanelExpandido(false);
                    } else {
                        alternarPanel();
                        if (window.sincronizarBotonDetalleMovil) window.sincronizarBotonDetalleMovil();
                    }
                }
            }, {passive: true});
        })();

        window.actualizarLista = function(nombreZona, zonVig, zreUsocom, propiedadesLote, puntoConsulta) {
            if(!nombreZona) return;
            resumenRestriccionesViaActual = null;
            zonaActual      = String(nombreZona).trim();
            zonVigActual    = String(zonVig  || '').trim();
            zreUsocomActual = String(zreUsocom || '').trim();
            loteActual      = completarPropiedadesUsoATD(propiedadesLote || {});
            contextoATDActual = {
                codigo: resolverATD(puntoConsulta),
                esquina: esLoteEsquinaATD(loteActual)
            };
            zonificacionVigenteActual = window.ZONIFICACION_VIGENTE
                ? window.ZONIFICACION_VIGENTE.obtener(loteActual, puntoConsulta)
                : '';
            var numeroConsulta = ++consultaLoteVigente;
            var loteConsultado = loteActual;
            var puntoConsultado = puntoConsulta;
            if (!zonificacionVigenteActual && window.ZONIFICACION_VIGENTE && window.ZONIFICACION_VIGENTE.cargar) {
                window.ZONIFICACION_VIGENTE.cargar().then(function() {
                    if (numeroConsulta !== consultaLoteVigente || loteActual !== loteConsultado) return;
                    zonificacionVigenteActual = window.ZONIFICACION_VIGENTE.obtener(loteConsultado, puntoConsultado);
                    actualizarMetaLoteZonificacion();
                    if (escenarioConObra || zonaActual === 'Uso Mixto Vecinal' || zonaActual === 'Uso Mixto Zonal') renderizarResultados();
                }).catch(function(error) { console.warn('Zonificación vigente no disponible.', error); });
            }
            actualizarMetaLoteZonificacion();
            mostrarSelectorEdificacion(!esZonaReglamentacionEspecial(zonaActual, zonVigActual) &&
                zonaActual !== 'Uso Residencial Exclusivo');

            panel.classList.remove('panel-expandido');
            panel.classList.remove('minimizado');
            document.body.classList.add('panel-abierto');
            sincronizarAlturaPanel();
            if (window.sincronizarBotonDetalleMovil) window.sincronizarBotonDetalleMovil();

            var esZRE = esZonaReglamentacionEspecial(zonaActual, zonVigActual);
            var tituloPanel = zonaActual;
            if (esZRE) {
                tituloPanel = zonVigActual;
                var usoZre = zreUsocomActual || usoEspecialDesdeCategoria(zonaActual) || 'Planes Especiales';
                if (usoZre) tituloPanel += ' - ' + usoZre;
            }
            document.getElementById('nombre-uso-titulo').innerHTML = tituloPanel;
            document.getElementById('buscador-actividad').value = '';
            actualizarBotonLimpiarBusqueda();

            // Obs / Restricciones del Uso Compatible (solo para zonas normales)
            var contVentanas = document.getElementById('ventanas-zona');
            var divObs  = document.getElementById('ventana-observaciones');
            var divRest = document.getElementById('ventana-restricciones');
            divRest.style.display = 'none';
            divObs.style.display = 'none';
            document.getElementById('texto-restricciones').innerHTML = '';
            document.getElementById('texto-observaciones').innerHTML = '';

            if (zonaActual === 'Uso Residencial Exclusivo') {
                contVentanas.style.display = 'flex';
                divObs.style.display = 'block';
                divRest.style.display = 'block';
                document.getElementById('texto-observaciones').innerHTML =
                    'La categoría y delimitación del Uso Residencial Exclusivo se mantienen. La consulta siguiente no constituye una modificación de zonificación.';
                document.getElementById('texto-restricciones').innerHTML = renderizarRegimenTransitorio();
            } else if (!esZRE) {
                var zonaParaFiltro = zonaActual === 'Usos Específicos - Otros Usos' ? 'Usos Específicos - Otros Usos' : zonaActual;
                var resultadosZona = datosUsos.filter(f => estandarizarTexto(f['Uso Compatible']) === estandarizarTexto(zonaParaFiltro));
                if (resultadosZona.length > 0) {
                    var obs  = (resultadosZona[0]['Observaciones'] || '').trim();
                    var rest = (resultadosZona[0]['Restricciones'] || '').trim();
                    var zonasConCuadroDetallado = [
                        'Uso Mixto Especializado', 'Uso Mixto Intensivo', 'Uso Mixto Metropolitano',
                        'Uso Mixto Zonal', 'Uso Mixto Vecinal', 'Uso Residencial Preferente'
                    ];
                    if (zonasConCuadroDetallado.includes(zonaActual)) rest = '';
                    contVentanas.style.display = (obs || rest) ? 'flex' : 'none';
                    divObs.style.display  = obs  ? 'block' : 'none';
                    divRest.style.display = rest ? 'block' : 'none';
                    if (obs)  document.getElementById('texto-observaciones').innerHTML = obs;
                    if (rest) document.getElementById('texto-restricciones').innerHTML = rest;
                } else { contVentanas.style.display = 'none'; }
            } else {
                // Para ZRE mostrar nota sobre planes especiales
                contVentanas.style.display = 'flex';
                divObs.style.display  = 'block';
                divRest.style.display = 'none';
                var codigoZre = obtenerPropiedad(loteActual, ['CÓDIGO', 'C�DIGO', 'CODIGO']);
                var ubicacionZre = obtenerPropiedad(loteActual, ['UBICACIÓN', 'UBICACI�N', 'UBICACION']);
                var tramoZre = obtenerPropiedad(loteActual, ['TRAMO']);
                var matrizZre = window.RESTRICCIONES_IIUU && window.RESTRICCIONES_IIUU.resolverUbicacionZRE
                    ? window.RESTRICCIONES_IIUU.resolverUbicacionZRE(zonVigActual, loteActual)
                    : '';
                var detalleZre = '';
                if (codigoZre || tramoZre || ubicacionZre) {
                    detalleZre = '<br><strong>Detalle del polígono:</strong> ' +
                        (codigoZre ? 'Código ' + escaparHtml(codigoZre) : '') +
                        (tramoZre ? (codigoZre ? ' | ' : '') + 'Tramo ' + escaparHtml(tramoZre) : '') +
                        (ubicacionZre ? ((codigoZre || tramoZre) ? ' | ' : '') + escaparHtml(ubicacionZre) : '');
                }
                document.getElementById('texto-observaciones').innerHTML =
                    'Zona de Reglamentación Especial. Los giros y su compatibilidad se rigen por el Plan Especial correspondiente a cada ubicación dentro del ' + zonVigActual + '.' +
                    (matrizZre ? '<br><strong>Matriz aplicable:</strong> ' + escaparHtml(matrizZre) :
                        '<br><strong>Matriz aplicable:</strong> Esta ubicación no corresponde a los frentes comerciales definidos en el cuadro ZRE.') +
                    detalleZre;
            }

            if (!esZRE && window.RESTRICCIONES_IIUU) {
                var generales = window.RESTRICCIONES_IIUU.disposicionesGenerales || [];
                var textoGeneral = '<details class="disposiciones-generales"><summary>Disposiciones generales y licencias existentes</summary>' +
                    generales.map(function (texto) { return '<p>' + escaparHtml(texto) + '</p>'; }).join('') + '</details>';
                var notasIndice = window.datosNotasIndiceDistrital || [];
                var numerosAplicables = numerosNotasPorZona(zonaActual);
                var notasAplicables = notasIndice.filter(function(nota) {
                    return numerosAplicables.indexOf(Number(nota.numero)) !== -1;
                });
                if (notasAplicables.length) {
                    var referenciaNotas = notasAplicables.map(function(nota) { return nota.numero; }).join(', ');
                    textoGeneral += '<details class="disposiciones-generales"><summary>Nota aplicable a ' +
                        escaparHtml(zonaActual) + ' (' + escaparHtml(referenciaNotas) + ')</summary>' +
                        notasAplicables.map(function(nota) {
                            return '<p><strong>' + escaparHtml(nota.numero) + '.</strong> ' + escaparHtml(nota.texto) + '</p>';
                        }).join('') + '</details>';
                }
                var otrasNotas = notasIndice.filter(function(nota) { return Number(nota.numero) > 6; });
                if (otrasNotas.length) {
                    textoGeneral += '<details class="disposiciones-generales"><summary>Otras notas generales del índice</summary>' +
                        otrasNotas.map(function(nota) {
                            return '<p><strong>' + escaparHtml(nota.numero) + '.</strong> ' + escaparHtml(nota.texto) + '</p>';
                        }).join('') + '</details>';
                }
                var textoRest = document.getElementById('texto-restricciones');
                textoRest.innerHTML = (divRest.style.display === 'none' ? '' : textoRest.innerHTML) + textoGeneral;
                divRest.style.display = 'block';
                contVentanas.style.display = 'flex';
            }
            document.getElementById('contenido-scrollable').scrollTop = 0;
            renderizarResultados();
        }

        function renderizarEscenarioConObra(busqueda, zonaKeyAct) {
            var motor = window.EVALUACION_LOTE;
            var evaluacion = motor && motor.evaluar ? motor.evaluar({
                categoria: zonaActual,
                zonificacion: zonificacionVigenteActual,
                conObra: true,
                indice: obtenerActividadesIndice(),
                areaM2: obtenerAreaLote()
            }) : { actividades: [], motivo: 'No se pudo cargar la evaluación del escenario.' };
            var actividades = evaluacion.actividades.filter(function(item) {
                return !busqueda || coincideActividadIndice(busqueda, item.giro) ||
                    coincideBusquedaTexto(busqueda, item.giro.CLASE) ||
                    coincideBusquedaTexto(busqueda, item.giro['DESCRIPCIÓN DE LA CLASE']);
            });
            var resumenATD = renderizarActividadesATD(busqueda);
            var html = resumenATD.html;
            actividades.forEach(function(item) {
                var giro = item.giro;
                var autorizacion = giro.ZONAS && tipoAutorizacion(giro.ZONAS[zonaKeyAct]);
                var estado = item.ampliado ? 'Con obra' : colorAuth(autorizacion).label;
                var extra = '';
                if (item.precision) extra += '<p class="giro-recordatorio">' + escaparHtml(item.precision) + '</p>';
                if (item.ampliado) extra += '<p class="giro-recordatorio">Aplicable con obra nueva, remodelación, ampliación u obra menor.</p>';
                html += renderizarFilaGiro(giro, {
                    estado: estado,
                    restringido: !item.ampliado && autorizacion === 'R',
                    obra: item.ampliado,
                    extraHtml: extra
                });
            });
            var conteo = document.getElementById('conteo-resumen');
            conteo.hidden = false;
            var totalActividades = actividades.length + resumenATD.count;
            conteo.innerHTML = totalActividades
                ? '<strong>' + totalActividades + '</strong> actividades para el escenario Con obra' +
                    (resumenATD.count ? ' · ' + resumenATD.count + ' específicas por ATD' : '') +
                    (evaluacion.ampliadas ? ' · <strong>' + evaluacion.ampliadas + '</strong> habilitadas con obra.' : '.')
                : '';
            actualizarListaAlfabetica(html || "<p class='mensaje-vacio'>" +
                escaparHtml(evaluacion.motivo || 'No se encontraron actividades para este escenario.') + '</p>');
        }

        // Colores por tipo de autorización

        function renderizarResultados() {
            actualizarBotonLimpiarBusqueda();
            var conteoResumen = document.getElementById('conteo-resumen');
            conteoResumen.hidden = false;
            var busqueda = estandarizarTexto(document.getElementById('buscador-actividad').value);
            if (resumenRestriccionesViaActual) {
                renderizarRestriccionesDeVia(busqueda);
                return;
            }
            if (!zonaActual) {
                renderizarBusquedaGlobal(busqueda);
                return;
            }
            var esZRE    = esZonaReglamentacionEspecial(zonaActual, zonVigActual);
            var zreId    = zonVigActual; // e.g. "ZRE-1"

            // ---- MODO ZRE ----
            if (esZRE) {
                var motorRestricciones = window.RESTRICCIONES_IIUU;
                var matrizZre = motorRestricciones && motorRestricciones.resolverUbicacionZRE
                    ? motorRestricciones.resolverUbicacionZRE(zreId, loteActual)
                    : '';

                if (!matrizZre) {
                    document.getElementById('conteo-resumen').innerHTML =
                        'Mostrando: <strong>0</strong> clases CIIU para la ubicación seleccionada.';
                    document.getElementById('lista-clases-container').innerHTML =
                        "<p class='mensaje-vacio'>El lote no se ubica en uno de los frentes comerciales definidos en la matriz del " + escaparHtml(zreId) + '.</p>';
                    return;
                }

                // Agrupa únicamente los giros compatibles con el frente del lote seleccionado.
                var clasesVistas = {};
                datosActividadesZRE.forEach(function(giro) {
                    var autorizacion = motorRestricciones && motorRestricciones.autorizacionZRE
                        ? motorRestricciones.autorizacionZRE(giro, zreId, matrizZre)
                        : giro.ZRE && giro.ZRE[zreId] && giro.ZRE[zreId][matrizZre];
                    if (autorizacion !== 'X' && autorizacion !== 'R') return;

                    if (!clasesVistas[giro.CLASE]) {
                        clasesVistas[giro.CLASE] = {
                            clase: giro.CLASE, desc: giro['DESCRIPCIÓN DE LA CLASE'],
                            obs: giro.OBSERVACIONES, giros: []
                        };
                    }
                    giro._autorizacionSeleccionada = autorizacion;
                    clasesVistas[giro.CLASE].giros.push(giro);
                });

                var clases = Object.values(clasesVistas);
                if (busqueda) {
                    clases = clases.map(function(c) {
                        var coincideClase = coincideBusquedaTexto(busqueda, c.desc) ||
                            coincideBusquedaTexto(busqueda, c.clase);
                        if (!coincideClase) {
                            c.giros = c.giros.filter(function(giro) {
                                return coincideBusquedaTexto(busqueda, giro.ACTIVIDAD);
                            });
                        }
                        return c;
                    }).filter(function(c) { return c.giros.length > 0; });
                }

                // Conteos
                var totalGirosZre = 0;
                clases.forEach(function(c) {
                    totalGirosZre += c.giros.length;
                });
                document.getElementById('conteo-resumen').innerHTML =
                    '<strong>Ubicación:</strong> ' + escaparHtml(matrizZre) + '<br>' +
                    'Mostrando: <strong>' + totalGirosZre + '</strong> actividades compatibles.';

                // Presenta cada actividad por su nombre común, con su referencia técnica dentro.
                var htmlContenido = '';
                clases.forEach(function(c) {
                    c.giros.forEach(function(g) {
                        var autorizacion = poligonoRayadoActual() ? 'R' : 'X';
                        var col = colorAuth(autorizacion);
                        var equivalencia = g.EQUIVALENCIA_REV3 || g.NOMBRE_GIRO_EQUIVALENTE_REV3
                            ? '<small class="nota-actividad-zre">Equivalencia CIIU Rev. 3: ' + escaparHtml(g.EQUIVALENCIA_REV3 || '—') +
                                (g.NOMBRE_GIRO_EQUIVALENTE_REV3 ? ' · ' + escaparHtml(g.NOMBRE_GIRO_EQUIVALENTE_REV3).replace(/\n/g, '<br>') : '') + '</small>'
                            : '';
                        htmlContenido += renderizarFilaGiro(g, {
                            estado: col.label, restringido: autorizacion === 'R',
                            extraHtml: equivalencia
                        });
                    });
                });

                actualizarListaAlfabetica(htmlContenido ||
                    "<p style='color:#666;text-align:center;padding:20px;font-style:italic;'>No hay actividades compatibles para este ZRE.</p>");
                return;
            }

            // ---- MODO ZONAS NORMALES ----
            var zonaParaFiltro = (zonaActual === 'Usos Específicos - Otros Usos') ? 'Usos Específicos - Otros Usos' : zonaActual;
            // Mapeo de nombre de zona del Usos.json al campo ZONAS del Actividades.json
            var zonaKeyMap = {
                'Uso Residencial Exclusivo':  'Uso Residencial Exclusivo',
                'Uso Residencial Preferente': 'Uso Residencial Preferente',
                'Uso Residencial Especial':   'Uso Residencial Especial',
                'Uso Mixto Vecinal':          'Uso Mixto Vecinal',
                'Uso Mixto Zonal':            'Uso Mixto Zonal',
                'Uso Mixto Metropolitano':    'Uso Mixto Metropolitano',
                'Uso Mixto Intensivo':        'Uso Mixto Intensivo',
                'Uso Mixto Especializado':    'Uso Mixto Especializado',
                'Uso de Recreación Pública':  'Uso de Recreación Pública',
                'Usos Específicos - Otros Usos': 'Otros Usos',
                'Usos Específicos - Educación':  'Educación',
                'Usos Específicos - Hospital':   'Hospitales',
            };
            var zonaKeyAct = zonaKeyMap[zonaActual] || zonaActual;

            var reglaMixtoVecinal = reglaEspecialMixtoVecinal();
            if (reglaMixtoVecinal) {
                var listaMixtoVecinal = renderizarListaEspecialMixtoVecinal(busqueda, reglaMixtoVecinal);
                conteoResumen.innerHTML = '<strong>' + listaMixtoVecinal.count +
                    '</strong> actividades permitidas para Uso Mixto Vecinal · ' +
                    escaparHtml(reglaMixtoVecinal.tipo) + '.<br><span class="giro-recordatorio">' +
                    escaparHtml(reglaMixtoVecinal.ambito) + '</span>';
                conteoResumen.hidden = false;
                actualizarListaAlfabetica(listaMixtoVecinal.html ||
                    "<p class='mensaje-vacio'>No hay actividades que coincidan con la búsqueda en la lista aplicable.</p>");
                return;
            }

            var reglaMixtoZonal = reglaEspecialMixtoZonal();
            if (reglaMixtoZonal) {
                var listaMixtoZonal = renderizarListaEspecialMixtoZonal(busqueda, reglaMixtoZonal);
                conteoResumen.innerHTML = '<strong>' + listaMixtoZonal.count +
                    '</strong> actividades permitidas para Uso Mixto Zonal · ' +
                    escaparHtml(reglaMixtoZonal.tipo) + '.<br><span class="giro-recordatorio">' +
                    escaparHtml(reglaMixtoZonal.ambito) + '</span>';
                conteoResumen.hidden = false;
                actualizarListaAlfabetica(listaMixtoZonal.html ||
                    "<p class='mensaje-vacio'>No hay actividades que coincidan con la búsqueda en la lista aplicable.</p>");
                return;
            }

            // En esquinas ATD A/B y en ATD C, el cuadro específico sustituye
            // la lista general de compatibilidades de Residencial Preferente.
            if (zonaActual === 'Uso Residencial Preferente' &&
                (esPoligonoONATD(loteActual) ||
                    (contextoATDActual && (contextoATDActual.codigo === 'A' || contextoATDActual.codigo === 'B') && contextoATDActual.esquina) ||
                    (contextoATDActual && contextoATDActual.codigo === 'C'))) {
                var listaATD = renderizarActividadesATD(busqueda);
                var ambitoATD = contextoATDActual.codigo === 'C' ? 'ATD C' :
                    (contextoATDActual.codigo === 'A' || contextoATDActual.codigo === 'B')
                        ? 'ATD ' + contextoATDActual.codigo + ' en esquina' : 'Todos lados';
                conteoResumen.innerHTML = '<strong>' + listaATD.count + '</strong> actividades permitidas según ' +
                    escaparHtml(ambitoATD) + '.';
                conteoResumen.hidden = false;
                actualizarListaAlfabetica(listaATD.html ||
                    "<p class='mensaje-vacio'>No hay actividades que coincidan con la búsqueda en el cuadro aplicable.</p>");
                return;
            }

            // En Uso Residencial Exclusivo se muestran las actividades
            // compatibles con Uso Residencial Preferente.
            if (zonaActual === 'Uso Residencial Exclusivo') {
                zonaKeyAct = 'Uso Residencial Preferente';
                var actividadesResidencialPreferente = obtenerActividadesIndice().filter(function(g) {
                    if (!g.ZONAS || tipoAutorizacion(g.ZONAS[zonaKeyAct]) !== 'X') return false;
                    return !busqueda || coincideActividadIndice(busqueda, g) ||
                        coincideBusquedaTexto(busqueda, g.CLASE) ||
                        coincideBusquedaTexto(busqueda, g['DESCRIPCIÓN DE LA CLASE']);
                });
                conteoResumen.innerHTML = '<strong>' + actividadesResidencialPreferente.length +
                    '</strong> actividades compatibles con Uso Residencial Preferente.';
                conteoResumen.hidden = false;

                var htmlResidencialPreferente = '';
                actividadesResidencialPreferente.forEach(function(g) {
                    htmlResidencialPreferente += renderizarFilaGiro(g, {
                        estado: 'Compatible',
                        extraHtml: '<p class="giro-recordatorio">Compatible con Uso Residencial Preferente.</p>'
                    });
                });
                actualizarListaAlfabetica(htmlResidencialPreferente ||
                    "<p class='mensaje-vacio'>No hay actividades que coincidan con la búsqueda en Uso Residencial Preferente.</p>");
                return;
            }

            if (escenarioConObra && window.EVALUACION_LOTE) {
                renderizarEscenarioConObra(busqueda, zonaKeyAct);
                return;
            }

            var resultados = datosUsos.filter(function(f) {
                return estandarizarTexto(f['Uso Compatible']) === estandarizarTexto(zonaParaFiltro);
            });

            if (busqueda) {
                resultados = resultados.filter(function(f) {
                    var tieneGiro = obtenerActividadesIndice().some(function(g) {
                        var auth = g.ZONAS && g.ZONAS[zonaKeyAct];
                        return String(g.CLASE) === String(f.Clase) && tipoAutorizacion(auth) &&
                               coincideActividadIndice(busqueda, g);
                    });
                    return coincideBusquedaTexto(busqueda, f['Descripción']) ||
                           coincideBusquedaTexto(busqueda, f['Clase']) || tieneGiro;
                });
            }

            var poligonoRayado = poligonoRayadoActual();
            resultados = resultados.map(function (item) {
                return Object.assign({}, item, {
                    'Autorización': poligonoRayado ? 'Permitidas con restricción' : 'Permitidas'
                });
            });

            var resumenATD = renderizarActividadesATD(busqueda);
            var htmlContenido = resumenATD.html;
            var totalGirosVisibles = resumenATD.count;
            resultados.forEach(function(item) {
                // Giros para esta clase CON su autorización individual en la zona
                var girosDeEstaClase = obtenerActividadesIndice().filter(function(g) {
                    if (String(g.CLASE) !== String(item.Clase)) return false;
                    var auth = g.ZONAS && g.ZONAS[zonaKeyAct];
                    if (!tipoAutorizacion(auth)) return false;
                    if (!busqueda) return true;
                    var coincideClase = coincideBusquedaTexto(busqueda, item['Descripción']) || coincideBusquedaTexto(busqueda, item['Clase']);
                    return coincideClase || coincideActividadIndice(busqueda, g);
                });
                totalGirosVisibles += girosDeEstaClase.length;
                if (girosDeEstaClase.length > 0) {
                    girosDeEstaClase.forEach(function(g) {
                        var authGiro = poligonoRayado ? 'R' : 'X';
                        var col = colorAuth(authGiro);
                        htmlContenido += renderizarFilaGiro(g, {
                            estado: col.label,
                            restringido: authGiro === 'R',
                            open: false
                        });
                    });
                } else {
                    htmlContenido += '<p class="sin-giros-clase">No hay giros específicos detallados para la clase ' +
                        escaparHtml(item.Clase) + ' · ' + escaparHtml(item['Descripción']) + '.</p>';
                }
            });

            document.getElementById('conteo-resumen').innerHTML =
                '<strong>' + totalGirosVisibles + '</strong> actividades compatibles' +
                (busqueda ? ' encontradas.' : '.');

            actualizarListaAlfabetica(htmlContenido ||
                "<p style='color:#666;text-align:center;padding:20px;font-style:italic;'>No se encontraron actividades.</p>");
        }

        var buscadorActividad = document.getElementById('buscador-actividad');
        var botonLimpiarBusqueda = document.getElementById('limpiar-busqueda-actividad');
        botonLimpiarBusqueda.addEventListener('click', function() {
            buscadorActividad.value = '';
            actualizarBotonLimpiarBusqueda();
            renderizarResultados();
            buscadorActividad.focus();
        });
        var renderBusquedaPendiente = null;
        buscadorActividad.addEventListener('input', function() {
            actualizarBotonLimpiarBusqueda();
            if (renderBusquedaPendiente !== null) cancelAnimationFrame(renderBusquedaPendiente);
            renderBusquedaPendiente = requestAnimationFrame(function() {
                renderBusquedaPendiente = null;
                renderizarResultados();
            });
        });
        document.getElementById('escenario-existente').addEventListener('click', function() {
            escenarioConObra = false;
            this.setAttribute('aria-pressed', 'true');
            document.getElementById('escenario-con-obra').setAttribute('aria-pressed', 'false');
            renderizarResultados();
        });
        document.getElementById('escenario-con-obra').addEventListener('click', function() {
            escenarioConObra = true;
            this.setAttribute('aria-pressed', 'true');
            document.getElementById('escenario-existente').setAttribute('aria-pressed', 'false');
            renderizarResultados();
        });
