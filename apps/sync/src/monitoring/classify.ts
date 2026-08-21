export function classifyChange(params: {
  visible?: boolean;
  fromVersion?: number;
  toVersion?: number;
  typeChanged?: boolean;
  tagDiff?: boolean;
  relocated?: boolean;
  confirmedConflict?: boolean;
}): string {
  if (params.visible === false) return 'deletion';
  if (params.typeChanged) return 'type_change';
  if (params.confirmedConflict) return 'confirmed_conflict';
  if (params.relocated) return 'relocation';
  if (params.tagDiff) return 'tag_edit';
  if (params.toVersion && params.fromVersion && params.toVersion > params.fromVersion) {
    return 'tag_edit';
  }
  return 'tag_edit';
}
