export function getMessageDateKey(createdAt: string): string {
  const d = new Date(createdAt);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isDifferentDay(a: string, b: string): boolean {
  return getMessageDateKey(a) !== getMessageDateKey(b);
}
