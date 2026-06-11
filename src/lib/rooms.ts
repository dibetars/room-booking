export interface RoomConfig {
  id: number;
  name: string;
  description: string;
  maxOccupancy: number;
  photos: string[];
}

// Room IDs must match your Beds24 property configuration.
// Run GET /properties?includeAllRooms=true to get the actual IDs and update here.
export const ROOMS: RoomConfig[] = [
  {
    id: 1,
    name: 'Standard Room',
    description: 'Comfortable room with garden views, air conditioning, and free WiFi.',
    maxOccupancy: 2,
    photos: [],
  },
  {
    id: 2,
    name: 'Deluxe Room',
    description: 'Spacious deluxe room with premium furnishings and ensuite bathroom.',
    maxOccupancy: 3,
    photos: [],
  },
  {
    id: 3,
    name: 'Family Room',
    description: 'Large family room with two beds, perfect for families up to 4 guests.',
    maxOccupancy: 4,
    photos: [],
  },
];
