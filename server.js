const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const port = 4173;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg'
};
const publicFiles = new Set(['index.html', 'style.css', 'app.js', 'ambient.js',
  ...fs.readdirSync(path.join(__dirname, 'assets')).map(name => 'assets/' + name)]);

const server = http.createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  const pathname = request.url.split('?')[0];
  const file = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (!['GET', 'HEAD'].includes(request.method) || !publicFiles.has(file)) {
    response.writeHead(404).end();
    return;
  }
  fs.readFile(path.join(__dirname, file), (error, body) => {
    if (error) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] });
    response.end(request.method === 'HEAD' ? undefined : body);
  });
});
server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.log('Порт 4173 вже зайнятий. Перевірте http://127.0.0.1:4173/');
  } else {
    console.error(error.message);
  }
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`Відкрийте сайт: http://127.0.0.1:${port}/`));
