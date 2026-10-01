/** A timestamp from a caption date ("2026", "2026-09", "2026-09-14"), or NaN. Pure, so the browser bundle can share it with the build script. */
export function parseCaptionDate(value) {
  if (typeof value !== 'string' || !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(value.trim())) return Number.NaN;
  return Date.parse(value.trim());
}
