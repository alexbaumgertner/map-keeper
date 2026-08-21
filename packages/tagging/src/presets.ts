export type Vertical = 'food_drink' | 'accommodation' | 'other';

export const FOOD_DRINK_AMENITIES = ['restaurant', 'cafe', 'bar', 'fast_food', 'pub'] as const;
export const ACCOMMODATION_TOURISM = ['hotel', 'guest_house', 'hostel', 'apartment'] as const;

export const BASIC_FIELDS = ['name', 'addr:street', 'addr:housenumber', 'phone', 'website', 'opening_hours'] as const;

export type FormField = {
  key: string;
  label: string;
  type: 'text' | 'opening_hours' | 'url' | 'tel';
  required?: boolean;
};

/** Forms derived from id-tagging-schema concepts; package is the integration point. */
export function fieldsForVertical(vertical: Vertical): FormField[] {
  const basic: FormField[] = BASIC_FIELDS.map((key) => ({
    key,
    label: key,
    type: key === 'opening_hours' ? 'opening_hours' : key === 'website' ? 'url' : key === 'phone' ? 'tel' : 'text',
    required: key === 'name',
  }));

  if (vertical === 'food_drink') {
    return [
      ...basic,
      { key: 'amenity', label: 'amenity', type: 'text', required: true },
      { key: 'cuisine', label: 'cuisine', type: 'text' },
      { key: 'outdoor_seating', label: 'outdoor_seating', type: 'text' },
    ];
  }
  if (vertical === 'accommodation') {
    return [
      ...basic,
      { key: 'tourism', label: 'tourism', type: 'text', required: true },
      { key: 'stars', label: 'stars', type: 'text' },
      { key: 'rooms', label: 'rooms', type: 'text' },
    ];
  }
  return basic;
}

export function validateTagCodepoints(value: string, max = 255): boolean {
  return [...value].length <= max;
}

export type OpeningHoursInterval = { days: string; open: string; close: string };

export function intervalsToOpeningHours(intervals: OpeningHoursInterval[]): string {
  return intervals.map((i) => `${i.days} ${i.open}-${i.close}`).join('; ');
}
