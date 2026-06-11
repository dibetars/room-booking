export interface RoomConfig {
  id: number;
  name: string;
  description: string;
  maxOccupancy: number;
  rackRateUSD: number;
  photos: string[];
}

// IDs sourced from GET /properties?includeAllRooms=true — property 334193 (Boko Boko GuestHouse)
export const ROOMS: RoomConfig[] = [
  {
    id: 691857,
    name: 'Patience',
    description: 'Double room with king bed, beach-front setting, ceiling fan, hot water and garden views.',
    maxOccupancy: 2,
    rackRateUSD: 35,
    photos: [],
  },
  {
    id: 691859,
    name: 'Regeneration',
    description: 'Double room with king bed, balcony, outdoor kitchen access, and beachfront views.',
    maxOccupancy: 2,
    rackRateUSD: 35,
    photos: [],
  },
  {
    id: 691860,
    name: 'Humility',
    description: 'Comfortable double room with king bed, garden outlook, and beach-front access.',
    maxOccupancy: 2,
    rackRateUSD: 30,
    photos: [],
  },
  {
    id: 691861,
    name: 'Wisdom',
    description: 'Relaxing double room with king bed, hammock, and full beach-front amenities.',
    maxOccupancy: 2,
    rackRateUSD: 30,
    photos: [],
  },
  {
    id: 691862,
    name: 'Truth & Honesty',
    description: 'Spacious room with two king beds, ideal for families or groups up to 4 guests.',
    maxOccupancy: 4,
    rackRateUSD: 40,
    photos: [],
  },
  {
    id: 691863,
    name: 'Love',
    description: 'Double room with king bed, beach-front location, and serene garden surroundings.',
    maxOccupancy: 2,
    rackRateUSD: 30,
    photos: [],
  },
  {
    id: 691864,
    name: 'Generosity',
    description: 'Premium double room with king bed, full amenities, and direct beach-front access.',
    maxOccupancy: 2,
    rackRateUSD: 40,
    photos: [],
  },
];
