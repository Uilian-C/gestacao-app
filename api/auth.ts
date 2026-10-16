import { auth } from './_lib/auth.js';

// vercel.json reescreve /api/auth/<rota> para esta função com ?__path=<rota>;
// aqui a URL original é remontada para o Better Auth reconhecer a rota.
async function handler(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get('__path');
  if (path === null) return auth.handler(request);
  url.searchParams.delete('__path');
  url.pathname = `/api/auth/${path}`;
  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer();
  return auth.handler(new Request(url, { method: request.method, headers: request.headers, body }));
}

export { handler as GET, handler as POST };
