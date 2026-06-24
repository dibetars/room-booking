import { ROOMS } from './rooms';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://book.bokoboko.org';
const TAGLINE = 'Eco-Friendly Accommodation Built with Sustainable Comfort in Mind';

const AMENITIES = [
  'Beachfront',
  'Air conditioning',
  'Free WiFi',
  'Hot water',
  'Garden',
  'Outdoor kitchen',
  'Ensuite bathroom',
];

// schema.org LodgingBusiness — lets search engines and AI assistants
// understand BokoBoko as a bookable accommodation with rooms and pricing.
export function lodgingBusinessSchema() {
  const prices = ROOMS.map((r) => r.rackRateUSD);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    '@id': `${BASE_URL}/#lodging`,
    name: 'BokoBoko Guesthouse',
    description: TAGLINE,
    url: BASE_URL,
    email: 'info@bokoboko.org',
    telephone: '+233598641683',
    image: `${BASE_URL}/images/rooftop.jpg`,
    logo: `${BASE_URL}/images/Boko-Logo.png`,
    priceRange: `$${minPrice}–$${maxPrice}`,
    currenciesAccepted: 'GHS, USD',
    paymentAccepted: 'Mobile Money, Visa, Mastercard',
    petsAllowed: false,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Busua',
      addressRegion: 'Western Region',
      addressCountry: 'GH',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 4.7847,
      longitude: -1.9344,
    },
    sameAs: [
      'https://www.facebook.com/61568546901973/about/',
      'https://www.instagram.com/bokobokoopc_/',
    ],
    amenityFeature: AMENITIES.map((name) => ({
      '@type': 'LocationFeatureSpecification',
      name,
      value: true,
    })),
    makesOffer: ROOMS.map((room) => ({
      '@type': 'Offer',
      name: room.name,
      description: room.description,
      price: room.rackRateUSD,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      itemOffered: {
        '@type': 'HotelRoom',
        name: room.name,
        description: room.description,
        occupancy: {
          '@type': 'QuantitativeValue',
          maxValue: room.maxOccupancy,
          unitText: 'guests',
        },
      },
    })),
  };
}
