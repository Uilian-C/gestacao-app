// Servidor local das funções de /api (o mesmo código que roda na Vercel).
// Uso: DATABASE_URL=... BETTER_AUTH_SECRET=... npm run dev:api  (e, em outro terminal, npm run dev)
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { auth } from '../api/_lib/auth.ts';
import * as account from '../api/account.ts';
import * as config from '../api/config.ts';
import * as data from '../api/data.ts';
import * as exames from '../api/exames.ts';
import * as family from '../api/family.ts';
import * as fotos from '../api/fotos.ts';
import * as lembretes from '../api/lembretes.ts';
import * as places from '../api/places.ts';
import * as push from '../api/push.ts';
import * as videos from '../api/videos.ts';

type Handler = (request: Request) => Response | Promise<Response>;
const routes: Record<string, Partial<Record<string, Handler>>> = {
  '/api/account': account,
  '/api/config': config,
  '/api/data': data,
  '/api/exames': exames,
  '/api/fotos': fotos,
  '/api/family': family,
  '/api/lembretes': lembretes,
  '/api/places': places,
  '/api/push': push,
  '/api/videos': videos,
};

const port = Number(process.env.API_PORT ?? 3001);

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const request = new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? (Readable.toWeb(req) as ReadableStream) : undefined,
    ...(hasBody ? { duplex: 'half' } : {}),
  } as RequestInit);

  const handler: Handler | undefined = url.pathname.startsWith('/api/auth/') ? auth.handler : routes[url.pathname]?.[req.method ?? 'GET'];
  const response = handler ? await handler(request) : new Response('Not found', { status: 404 });
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    if (key !== 'set-cookie') res.setHeader(key, value);
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) res.setHeader('set-cookie', cookies);
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, () => console.log(`API local em http://localhost:${port}`));
