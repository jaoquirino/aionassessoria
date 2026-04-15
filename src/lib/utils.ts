import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a date string in YYYY-MM-DD format to a Date object in local timezone
 * This prevents timezone offset issues where "2024-02-15" becomes Feb 14th in negative UTC offsets
 */
/**
 * Capitalize the first letter of each word, lowercase the rest.
 * e.g. "jOÃO QUIRINO" → "João Quirino"
 */
export function capitalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, (char) => char.toUpperCase());
}

export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}
