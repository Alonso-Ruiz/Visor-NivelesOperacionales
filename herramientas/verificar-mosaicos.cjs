const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.join(__dirname, '..');
let vertices = 0, fills = 0;
const paint = { scale(){}, beginPath(){}, moveTo(){vertices++;}, lineTo(){vertices++;}, closePath(){}, fill(){fills++;}, stroke(){} };
const element = () => ({style:{},getContext:()=>paint,appendChild(){},setAttribute(){},getElementsByTagName:()=>[]});
const c = { console, setTimeout, clearTimeout, navigator:{userAgent:'node',platform:'Win32'}, document:{documentElement:element(),createElement:element,createElementNS:element},screen:{deviceXDPI:96,logicalXDPI:96} };
c.window=c;vm.createContext(c);
const read = p => fs.readFileSync(path.join(root,p),'utf8');
for (const p of ['js/leaflet.js','js/app/poligonos-mosaico.js','data/retiros_lotes.js','data/retiros_lineas.js','data/retiros_contexto.js','data/retiros_poligonos_completos_20261013.js']) vm.runInContext(read(p),c);
const L=c.L;
for (const data of [c.geojsonRetirosLotes,c.geojsonRetirosLineas,c.geojsonRetirosContexto,c.json_Polgono_retiros_concdigos_0]) {
    const layer = new c.PoligonosMosaico(data,{style:{fillOpacity:1,weight:1}});
    assert(layer.getBounds().isValid());
    const center=layer.getBounds().getCenter();
    for (const z of [14,16,18,22,28]) {
        const centerPixel=L.CRS.EPSG3857.latLngToPoint(center,z);
        for (let offset=-2;offset<=2;offset++) {
            const coords={x:Math.floor(centerPixel.x/256)+offset,y:Math.floor(centerPixel.y/256),z};
            const scale=2**(z-16),ox=coords.x*256,oy=coords.y*256;
            const bounds=L.bounds([(ox-4)/scale,(oy-4)/scale],[(ox+260)/scale,(oy+260)/scale]);
            const candidates=new Set(layer.candidatos(bounds));
            for (const record of layer.registros) if(bounds.intersects(record.bounds)) assert(candidates.has(record),'Geometría faltante en mosaico');
            const oldFills=fills;
            layer.createTile(coords);
            if(data===c.geojsonRetirosLineas) assert.equal(fills,oldFills,'Las líneas no deben rellenarse');
        }
    }
    const tile=L.CRS.EPSG3857.latLngToPoint(center,18);
    vertices=0;layer.createTile({x:Math.floor(tile.x/256),y:Math.floor(tile.y/256),z:18});
    const total=layer.registros.reduce((n,r)=>n+r.anillos.reduce((a,b)=>a+b.length,0),0);
    console.log(data===c.geojsonRetirosLineas?'Líneas':'Polígonos',layer.registros.length,'partes;',vertices,'vértices/mosaico central frente a',total,'totales');
}
const source=read('js/app/visor-retiros.js');
const associate=source.slice(source.indexOf('    function asociarDatosLinealesAreas('),source.indexOf('    function crearPanes()'));
const hit=source.slice(source.indexOf('    function lineaBajoPunto('),source.indexOf('    function actualizarCursorRetiros('));
vm.runInContext('var informacionLinealPorArea, indiceLineasClic; var capaRetirosLineas3m={}, capaRetirosLineas5m={};'+associate+hit,c);
let visible=true;
c.map={latLngToContainerPoint:ll=>L.CRS.EPSG3857.latLngToPoint(L.latLng(ll),18),containerPointToLatLng:p=>L.CRS.EPSG3857.pointToLatLng(p,18),hasLayer:()=>visible};
vm.runInContext('asociarDatosLinealesAreas(json_Polgono_retiros_concdigos_0,geojsonRetirosLineas)',c);
const segment=vm.runInContext('indiceLineasClic.segmentos.find(s=>/^[35]/.test(String(s.feature.properties.ANCHO)))',c);
const midpoint=L.latLng((segment.a[1]+segment.b[1])/2,(segment.a[0]+segment.b[0])/2);
assert(c.lineaBajoPunto(midpoint),'Clic en línea no detectado');visible=false;assert.equal(c.lineaBajoPunto(midpoint),null,'Capa oculta seleccionable');
for(const p of fs.readdirSync(path.join(root,'js/app')).filter(p=>p.endsWith('.js')))new vm.Script(read('js/app/'+p),{filename:p});
console.log('OK: índice sin omisiones, zoom 14–28, trazado, clics, capas ocultas y sintaxis.');
