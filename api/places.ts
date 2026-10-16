import { searchPlaces } from './_lib/places.js';
import { endpoint, json, requireUser } from './_lib/http.js';

/** GET /api/places?q=... → sugestões de endereço. Só para quem está logado. */
export const GET = endpoint(async request => {
  await requireUser(request);
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 120);
  if (q.length < 3) return json({ suggestions: [] });
  try {
    return json({ suggestions: await searchPlaces(q) });
  } catch (err) {
    // Sem sugestões, o campo continua funcionando como texto livre.
    console.error(err);
    return json({ suggestions: [] });
  }
});
