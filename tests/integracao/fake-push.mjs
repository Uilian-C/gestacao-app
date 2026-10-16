// Serviço de push falso (no lugar do Google/Apple): recebe os avisos cifrados,
// decifra com a chave do "aparelho" e guarda para o teste conferir o texto.
//   GET  /new?id=x  → cria um aparelho e devolve a inscrição, como o navegador faria
//   POST /push/:id  → recebe o aviso (ids começando com "gone" respondem 410)
//   GET  /inbox     → avisos recebidos
import { createECDH, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import https from 'node:https';
import { createRequire } from 'node:module';

const ece = createRequire(import.meta.url)('http_ece');
const [, , keyPath, certPath, port = '4443'] = process.argv;
const devices = new Map();
const inbox = [];

function device(id) {
  if (!devices.has(id)) {
    const ecdh = createECDH('prime256v1');
    ecdh.generateKeys();
    devices.set(id, { ecdh, auth: randomBytes(16) });
  }
  return devices.get(id);
}

https
  .createServer({ key: readFileSync(keyPath), cert: readFileSync(certPath) }, (req, res) => {
    const url = new URL(req.url, 'https://localhost');
    if (req.method === 'GET' && url.pathname === '/new') {
      const id = url.searchParams.get('id');
      const d = device(id);
      res.end(JSON.stringify({ endpoint: `https://localhost:${port}/push/${id}`, keys: { p256dh: d.ecdh.getPublicKey('base64url'), auth: d.auth.toString('base64url') } }));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/inbox') return res.end(JSON.stringify(inbox));
    if (req.method === 'POST' && url.pathname.startsWith('/push/')) {
      const id = url.pathname.split('/')[2];
      if (id.startsWith('gone')) {
        res.statusCode = 410;
        return res.end();
      }
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => {
        const d = device(id);
        const body = ece.decrypt(Buffer.concat(chunks), { version: 'aes128gcm', privateKey: d.ecdh, authSecret: d.auth });
        inbox.push({ device: id, payload: JSON.parse(body.toString()) });
        res.statusCode = 201;
        res.end();
      });
      return;
    }
    res.statusCode = 404;
    res.end();
  })
  .listen(Number(port), () => console.log(`push falso em https://localhost:${port}`));
