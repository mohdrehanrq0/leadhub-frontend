/** LinkedIn uses these labels when the person has not named a real company. */
export function isHiddenEmployer(name?: string | null): boolean {
  return /stealth/i.test(name ?? '');
}

export function visibleEmployer(name?: string | null): string {
  const trimmed = name?.trim() ?? '';
  if (!trimmed || /employer tbd/i.test(trimmed) || isHiddenEmployer(trimmed)) return '';
  return trimmed;
}
