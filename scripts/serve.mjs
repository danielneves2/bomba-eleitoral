import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const directory = path.dirname(fileURLToPath(import.meta.url));
const root = fs.existsSync(path.join(directory, 'index.html'))
  ? directory
  : path.resolve(directory, '../dist/client');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.rsc': 'text/x-component',
};
const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    res.end();
    return;
  }
  try {
    const url = new URL(req.url, 'http://127.0.0.1'),
      relative = decodeURIComponent(url.pathname).replace(/^\/+/, ''),
      file = path.resolve(root, relative || 'index.html');
    const within = path.relative(root, file);
    if (within.startsWith('..') || path.isAbsolute(within)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404);
      res.end('Arquivo não encontrado');
      return;
    }
    res.writeHead(200, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    if (req.method === 'HEAD') res.end();
    else fs.createReadStream(file).pipe(res);
  } catch {
    res.writeHead(400);
    res.end();
  }
});
const port = Number(process.env.BOMBA_PORT || 0);
server.listen(port, '127.0.0.1', () => {
  const address = server.address(),
    url = `http://127.0.0.1:${address.port}/`;
  console.log(
    `BOMBA ELEITORAL\nJogue em ${url}\nMantenha esta janela aberta. Ctrl+C encerra o jogo.`,
  );
  if (!process.argv.includes('--no-open')) {
    if (process.platform === 'win32')
      spawn('cmd.exe', ['/c', 'start', '', url], {
        stdio: 'ignore',
        windowsHide: true,
      });
    else if (process.platform === 'darwin')
      spawn('open', [url], { stdio: 'ignore' });
    else spawn('xdg-open', [url], { stdio: 'ignore' });
  }
});
server.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
