// Sugestões de endereço para o cadastro da consulta.
// Com GOOGLE_MAPS_API_KEY usa o Google Places (mesma base do Google Maps);
// sem chave, usa o Photon (OpenStreetMap), gratuito.

export interface PlaceSuggestion {
  label: string;
}

interface PhotonProps {
  name?: string;
  street?: string;
  housenumber?: string;
  district?: string;
  locality?: string;
  city?: string;
  state?: string;
  postcode?: string;
  countrycode?: string;
}

/** "Hospital X, Rua Y, 100 - Bairro, Cidade - UF". Pula partes repetidas ou ausentes. */
export function photonLabel(p: PhotonProps): string {
  const street = [p.street, p.housenumber].filter(Boolean).join(', ');
  const area = p.district || p.locality;
  const head = [p.name && p.name !== p.street ? p.name : null, street || null].filter(Boolean).join(', ');
  const place = [head, area].filter(Boolean).join(' - ');
  const city = [p.city, p.state].filter(Boolean).join(' - ');
  return [place, city].filter(Boolean).join(', ');
}

async function photon(q: string): Promise<PlaceSuggestion[]> {
  // Viés para o Brasil (centro aproximado) e respostas em português.
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=pt&lat=-15.8&lon=-47.9`;
  const res = await fetch(url, { headers: { 'User-Agent': 'NossaGestacao/1.0 (gestacao-app.vercel.app)' } });
  if (!res.ok) throw new Error(`photon ${res.status}`);
  const data = (await res.json()) as { features?: Array<{ properties: PhotonProps }> };
  const labels = (data.features ?? []).filter(f => !f.properties.countrycode || f.properties.countrycode === 'BR').map(f => photonLabel(f.properties));
  return [...new Set(labels.filter(Boolean))].slice(0, 5).map(label => ({ label }));
}

async function google(q: string, key: string): Promise<PlaceSuggestion[]> {
  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
    body: JSON.stringify({ input: q, languageCode: 'pt-BR', includedRegionCodes: ['br'] }),
  });
  if (!res.ok) throw new Error(`places ${res.status}`);
  const data = (await res.json()) as { suggestions?: Array<{ placePrediction?: { text?: { text?: string } } }> };
  return (data.suggestions ?? [])
    .map(s => s.placePrediction?.text?.text)
    .filter((t): t is string => !!t)
    .slice(0, 5)
    .map(label => ({ label }));
}

export function searchPlaces(q: string): Promise<PlaceSuggestion[]> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  return key ? google(q, key) : photon(q);
}
