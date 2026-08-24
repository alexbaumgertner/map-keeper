export type BusinessTypeOption = { id: string; name: string };

export const HOUSING_TYPES: BusinessTypeOption[] = [
  { id: 'guest_house', name: 'Guest house' },
  { id: 'hotel', name: 'Hotel' },
  { id: 'hostel', name: 'Hostel' },
  { id: 'motel', name: 'Motel' },
  { id: 'apartment', name: 'Apartment' },
];

export const FOOD_TYPES: BusinessTypeOption[] = [
  { id: 'restaurant', name: 'Restaurant' },
  { id: 'cafe', name: 'Cafe' },
  { id: 'fast_food', name: 'Fast food' },
  { id: 'bar', name: 'Bar' },
  { id: 'pub', name: 'Pub' },
];

export type CategoryTab = 'housing' | 'food';

export function typesForCategory(category: CategoryTab): BusinessTypeOption[] {
  return category === 'housing' ? HOUSING_TYPES : FOOD_TYPES;
}

export function verticalForCategory(category: CategoryTab): 'accommodation' | 'food_drink' {
  return category === 'housing' ? 'accommodation' : 'food_drink';
}

export function categoryForVertical(vertical: string): CategoryTab {
  return vertical === 'food_drink' ? 'food' : 'housing';
}
