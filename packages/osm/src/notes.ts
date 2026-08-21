export function suggestedNoteText(params: {
  placeName: string;
  lat: number;
  lon: number;
  issue: string;
}): string {
  return `Mapkeeper user note about "${params.placeName}" near ${params.lat.toFixed(5)}, ${params.lon.toFixed(5)}: ${params.issue}`;
}
