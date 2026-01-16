export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseDate(text: string) {
  text = text.trim();

  if (text === "TBA") return 0;

  const date = Date.parse(text + " 2025");
  return isNaN(date) ? 0 : date;
}

export function getYTID(url: string) {
  const regExp =
      /(?:youtube\.com\/(?:.*v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

