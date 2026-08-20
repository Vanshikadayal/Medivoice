export function normalizeMedicineName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/[^\w\s.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
