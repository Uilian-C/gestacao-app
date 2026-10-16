// Atalhos para chegar à consulta: abrem o app instalado no celular (ou o site,
// no computador) já com o endereço preenchido.

const enc = (address: string) => encodeURIComponent(address.trim());

export const googleMapsUrl = (address: string) => `https://www.google.com/maps/search/?api=1&query=${enc(address)}`;

export const wazeUrl = (address: string) => `https://waze.com/ul?q=${enc(address)}&navigate=yes`;

/** Uber com destino preenchido; a partida é a localização atual. O app pede para confirmar o endereço. */
export const uberUrl = (address: string) =>
  `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff%5Bformatted_address%5D=${enc(address)}`;
