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
    description: 'Deluxe double with king bed, air conditioning, beach-front setting, ceiling fan, hot water and garden views.',
    maxOccupancy: 2,
    rackRateUSD: 45,
    photos: ['/images/rooms/DeluxeRoom.jpg'],
  },
  {
    id: 691859,
    name: 'Regeneration',
    description: 'Deluxe double with king bed, air conditioning, balcony, outdoor kitchen access, and beachfront views.',
    maxOccupancy: 2,
    rackRateUSD: 45,
    photos: ['/images/rooms/DeluxeRoom.jpg'],
  },
  {
    id: 691860,
    name: 'Humility',
    description: 'Comfortable double with king bed, ensuite bathroom, garden outlook, and beach-front access.',
    maxOccupancy: 2,
    rackRateUSD: 40,
    photos: ['/images/rooms/StandardRoom.jpg'],
  },
  {
    id: 691861,
    name: 'Wisdom',
    description: 'Relaxing double with king bed, ensuite bathroom, hammock, and full beach-front amenities.',
    maxOccupancy: 2,
    rackRateUSD: 40,
    photos: ['/images/rooms/StandardRoom.jpg'],
  },
  {
    id: 691862,
    name: 'Truth & Honesty',
    description: 'Spacious family room with two king beds, ensuite bathroom, ideal for families or groups up to 4 guests.',
    maxOccupancy: 4,
    rackRateUSD: 50,
    photos: ['/images/rooms/FamilyRoom.jpg'],
  },
  {
    id: 691863,
    name: 'Love',
    description: 'Standard double with king bed, ensuite bathroom, beach-front location, and serene garden surroundings.',
    maxOccupancy: 2,
    rackRateUSD: 40,
    photos: ['/images/rooms/StandardRoom.jpg'],
  },
  {
    id: 691864,
    name: 'Generosity',
    description: 'Premium double with king bed, ensuite bathroom, full amenities, and direct beach-front access.',
    maxOccupancy: 2,
    rackRateUSD: 50,
    photos: ['/images/rooms/FamilyRoom.jpg'],
  },
];
