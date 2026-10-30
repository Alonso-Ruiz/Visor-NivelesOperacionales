const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
function servir(root, port = 8080) {
    root = path.resolve(root);
    const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' };
    const server = http.createServer((req, res) => {
        let file;
        try {
            const url = new URL(req.url, 'http://localhost');
            file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
            if (file !== root && !file.startsWith(root + path.sep)) throw new Error('Ruta inválida');
            if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
            if (!fs.statSync(file).isFile()) throw new Error('No es archivo');
        } catch {
            res.writeHead(404); res.end('No encontrado'); return;
        }
        res.writeHead(200, { 'Content-Type': tipos[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        fs.createReadStream(file).pipe(res);
    });
    server.listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${server.address().port}/`));
    return server;
}
module.exports = servir;
if (require.main === module) servir(path.join(__dirname, '..'), Number(process.argv[2]) || 8080);
