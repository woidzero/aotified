export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseDate(text: string) {
  text = text.trim();

  if (text === "TBA") return 0;

  const date = Date.parse(text + " 2025");
  return isNaN(date) ? 0 : date;
}
