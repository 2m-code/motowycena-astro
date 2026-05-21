/**
 * Pojedyncze źródło prawdy o firmie.
 * Wszystkie komponenty importują dane stąd – jedno miejsce do edycji.
 * Te dane są też używane w Schema.org JSON-LD.
 */

export const business = {
  name: 'Motowycena',
  legalName: 'Rafał Pelczar – Rzeczoznawca Techniki Samochodowej',
  certificate: 'RS001771',
  founder: {
    name: 'Rafał Pelczar',
    jobTitle: 'Rzeczoznawca Techniki Samochodowej',
  },
  contact: {
    phone: '+48509146666',
    phoneDisplay: '509 146 666',
    whatsapp: '+48509146666',
    email: 'biuro@motowycena.pl',
  },
  address: {
    street: 'ul. Spacerowa 10',
    city: 'Garki',
    postalCode: '63-430',
    country: 'PL',
    countryName: 'Polska',
  },
  geo: {
    // Garki, woj. wielkopolskie
    latitude: 51.6,
    longitude: 17.7,
  },
  url: 'https://www.motowycena.pl',
  logo: '/logo.svg',
  // Główne obszary działania – do schema markup i podstron lokalnych.
  // Kolejność = priorytet (Ostrów Wlkp. = siedziba w gminie Odolanów / pow. ostrowski).
  areaServed: [
    { type: 'City', name: 'Odolanów' },
    { type: 'City', name: 'Ostrów Wielkopolski' },
    { type: 'City', name: 'Ostrzeszów' },
    { type: 'City', name: 'Kępno' },
    { type: 'City', name: 'Kalisz' },
    { type: 'City', name: 'Jarocin' },
    { type: 'City', name: 'Krotoszyn' },
    { type: 'City', name: 'Pleszew' },
    { type: 'City', name: 'Grabów nad Prosną' },
    { type: 'City', name: 'Środa Wielkopolska' },
    { type: 'City', name: 'Poznań' },
    { type: 'City', name: 'Milicz' },
    { type: 'City', name: 'Twardogóra' },
    { type: 'City', name: 'Oleśnica' },
    { type: 'City', name: 'Syców' },
    { type: 'City', name: 'Trzebnica' },
    { type: 'City', name: 'Długołęka' },
    { type: 'City', name: 'Wrocław' },
    { type: 'City', name: 'Warszawa' },
    { type: 'City', name: 'Kraków' },
    { type: 'City', name: 'Łódź' },
    { type: 'City', name: 'Gdańsk' },
    { type: 'City', name: 'Bydgoszcz' },
    { type: 'AdministrativeArea', name: 'Wielkopolska' },
    { type: 'AdministrativeArea', name: 'Dolnośląskie' },
  ],
  serviceAreas: {
    wielkopolska: 'Odolanów, Ostrów Wielkopolski, Krotoszyn, Ostrzeszów, Kępno, Kalisz, Jarocin, Pleszew, Grabów nad Prosną, Środa Wielkopolska, Poznań',
    dolnoslaskie: 'Milicz, Twardogóra, Oleśnica, Syców, Trzebnica, Długołęka, Wrocław i okolice',
    nationwide: 'Kraków, Łódź, Warszawa, Gdańsk, Bydgoszcz oraz inne miejscowości po uzgodnieniu',
  },
  // Godziny pracy – do schema + footer
  openingHours: {
    monday: { open: '08:00', close: '18:00' },
    tuesday: { open: '08:00', close: '18:00' },
    wednesday: { open: '08:00', close: '18:00' },
    thursday: { open: '08:00', close: '18:00' },
    friday: { open: '08:00', close: '18:00' },
    saturday: { open: '09:00', close: '14:00' },
    sunday: null, // zamknięte
  },
  social: {
    // Uzupełnić gdy klient poda
    facebook: '',
    linkedin: '',
    youtube: '',
  },
} as const;

/**
 * Lista wszystkich usług/podstron z metadanymi SEO.
 * URL-e zachowane 1:1 z obecną stroną – krytyczne dla utrzymania pozycji w Google.
 */
export const services = [
  {
    slug: 'wycena-wartosci-pojazdu',
    name: 'Wycena wartości pojazdu',
    shortDesc: 'Profesjonalna wycena rynkowej wartości pojazdu przez certyfikowanego rzeczoznawcę.',
    keywords: ['wycena pojazdu', 'wycena auta', 'wartość rynkowa samochodu'],
  },
  {
    slug: 'wycena-kosztow-naprawy',
    name: 'Wycena kosztów naprawy',
    shortDesc: 'Rzetelna ekspertyza kosztów naprawy pojazdu po szkodzie komunikacyjnej lub mechanicznej.',
    keywords: ['wycena naprawy', 'koszty naprawy auta', 'ekspertyza powypadkowa'],
  },
  {
    slug: 'opis-stanu-technicznego',
    name: 'Opis stanu technicznego',
    shortDesc: 'Szczegółowa ocena stanu technicznego pojazdu z pełną dokumentacją fotograficzną.',
    keywords: ['stan techniczny pojazdu', 'ocena techniczna auta', 'przegląd przedzakupowy'],
  },
  {
    slug: 'wycena-celno-skarbowa',
    name: 'Wycena celno-skarbowa',
    shortDesc: 'Wycena pojazdów sprowadzanych z zagranicy akceptowana przez urzędy celno-skarbowe.',
    keywords: ['wycena celno-skarbowa', 'wycena do urzędu skarbowego', 'akcyza samochodowa'],
  },
  {
    slug: 'doradztwo-zakupowe',
    name: 'Doradztwo zakupowe',
    shortDesc: 'Profesjonalne doradztwo przy zakupie samochodu – sprawdzenie historii i stanu technicznego.',
    keywords: ['doradztwo zakupu auta', 'sprawdzenie samochodu', 'pomoc przy zakupie'],
  },
  {
    slug: 'pojazdy-zabytkowe-2',
    name: 'Pojazdy zabytkowe',
    shortDesc: 'Wyceny i ekspertyzy pojazdów zabytkowych oraz młodzieżowych (youngtimer).',
    keywords: ['wycena zabytku', 'pojazd historyczny', 'youngtimer'],
    // ⚠️ URL zachowany z sufiksem "-2" celowo - obecny URL na motowycena.pl
  },
  {
    slug: 'zmiany-konstrukcyjne',
    name: 'Zmiany konstrukcyjne',
    shortDesc: 'Ekspertyzy zmian konstrukcyjnych pojazdów wymagane przy rejestracji w urzędzie.',
    keywords: ['zmiany konstrukcyjne', 'zmiana zabudowy', 'rejestracja po przeróbce'],
  },
  {
    slug: 'pomoc-prawna',
    name: 'Pomoc prawna',
    shortDesc: 'Wsparcie ekspertyzowe w sprawach sądowych i odszkodowawczych dotyczących pojazdów.',
    keywords: ['pomoc prawna motoryzacja', 'odszkodowanie OC', 'sprawa sądowa pojazd'],
  },
  {
    slug: 'polisy-ubezpieczeniowe',
    name: 'Polisy ubezpieczeniowe',
    shortDesc: 'Doradztwo w sprawach ubezpieczeniowych i ekspertyzy szkód komunikacyjnych.',
    keywords: ['szkoda komunikacyjna', 'ekspertyza dla ubezpieczyciela', 'OC AC'],
  },
  {
    slug: 'biegly-skarbowy',
    name: 'Biegły Skarbowy',
    shortDesc: 'Usługi biegłego skarbowego z zakresu techniki samochodowej.',
    keywords: ['biegły skarbowy', 'rzeczoznawca skarbowy', 'wycena do skarbówki'],
  },
  {
    slug: 'biegly-sadowy',
    name: 'Biegły Sądowy',
    shortDesc: 'Opinie biegłego sądowego z zakresu techniki samochodowej i wyceny pojazdów.',
    keywords: ['biegły sądowy', 'opinia biegłego', 'rzeczoznawca w sądzie'],
  },
] as const;

export type Service = (typeof services)[number];

/**
 * Mapowanie slug → URL z trailing slash (KRYTYCZNE dla SEO).
 */
export function serviceUrl(slug: string): string {
  return `/${slug}/`;
}
