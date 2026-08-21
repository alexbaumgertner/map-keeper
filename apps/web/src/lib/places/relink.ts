export async function applyRelinkConfirm(params: {
  placeLinkId: string;
  osmType: string;
  osmId: number;
  osmVersion: number;
}) {
  return { ...params, status: 'active' as const };
}
