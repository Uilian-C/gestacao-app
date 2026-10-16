import { describe, expect, it } from 'vitest';
import { googleMapsUrl, uberUrl, wazeUrl } from './directions';

describe('atalhos de rota', () => {
  const address = ' Av. Paulista, 1000 - São Paulo ';

  it('codifica o endereço e ignora espaços nas pontas', () => {
    expect(googleMapsUrl(address)).toBe('https://www.google.com/maps/search/?api=1&query=Av.%20Paulista%2C%201000%20-%20S%C3%A3o%20Paulo');
  });

  it('Waze já abre navegando', () => {
    expect(wazeUrl(address)).toContain('navigate=yes');
  });

  it('Uber parte da localização atual com o destino preenchido', () => {
    const url = new URL(uberUrl(address));
    expect(url.searchParams.get('pickup')).toBe('my_location');
    expect(url.searchParams.get('dropoff[formatted_address]')).toBe('Av. Paulista, 1000 - São Paulo');
  });
});
