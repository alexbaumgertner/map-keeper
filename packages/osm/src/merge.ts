export type FieldTriple = {
  key: string;
  base?: string;
  remote?: string;
  local?: string;
};

export type MergeResolution = {
  key: string;
  value: string;
  choice: 'base' | 'remote' | 'local' | 'custom';
};

/** Build three-way field list for UI. Never auto-resolve conflicts. */
export function buildThreeWay(
  base: Record<string, string>,
  remote: Record<string, string>,
  local: Record<string, string>,
): FieldTriple[] {
  const keys = new Set([...Object.keys(base), ...Object.keys(remote), ...Object.keys(local)]);
  return [...keys].map((key) => ({
    key,
    base: base[key],
    remote: remote[key],
    local: local[key],
  }));
}

export function applyResolutions(
  remote: Record<string, string>,
  resolutions: MergeResolution[],
): Record<string, string> {
  const next = { ...remote };
  for (const r of resolutions) {
    if (r.choice === 'remote') next[r.key] = remote[r.key] ?? r.value;
    else next[r.key] = r.value;
  }
  return next;
}

/** Blind retry / last-write-wins are forbidden. */
export function isConflictStatus(status: number): boolean {
  return status === 409;
}
