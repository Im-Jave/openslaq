/** Escape LIKE/ILIKE pattern special characters in user input */
export function escapeLike(input: string): string {
  return input.replace(/[%_\\]/g, (c) => `\\${c}`);
}
