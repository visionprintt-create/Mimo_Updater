/**
 * Calculates the number of business days (Monday-Friday) between two dates (inclusive).
 * @param start Start date string (YYYY-MM-DD)
 * @param end End date string (YYYY-MM-DD)
 */
export function calculateBusinessDays(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  // Ensure start is before or equal to end
  if (startDate > endDate) return 0;

  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}
