import { createHash } from "node:crypto";

const APOSTROPHES = /[ʻʼ‘’`´]/g;

export function clean(value: string): string {
  return value.replace(APOSTROPHES, "'").replace(/\s+/g, " ").trim();
}

/** Case/spacing-insensitive key for de-duplicating names. */
export function keyOf(value: string): string {
  return clean(value).toLowerCase();
}

/** Person key that ignores word order: "Turg'unboyev Dadaxon" == "Dadaxon Turg'unboyev". */
export function personKey(value: string): string {
  return keyOf(value).split(" ").sort().join(" ");
}

export function isCyrillic(value: string): boolean {
  return /[Ѐ-ӿ]/.test(value);
}

/** "DAVLAT VA HUQUQ NAZARIYASI" → "Davlat va huquq nazariyasi". Mixed-case input is kept. */
export function sentenceCase(value: string): string {
  const v = clean(value);
  if (v !== v.toUpperCase()) return v;
  const lower = v.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** "BABAYAROV MARAT" → "Babayarov Marat". Mixed-case input is kept. */
export function titleCase(value: string): string {
  const v = clean(value);
  if (v !== v.toUpperCase()) return v;
  return v.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
}

const CYR_TO_LAT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i", й: "y", к: "k",
  л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "x", ц: "ts",
  ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya", ў: "o", қ: "q", ғ: "g", ҳ: "h",
};

export function slugify(value: string): string {
  return keyOf(value)
    .split("")
    .map((ch) => CYR_TO_LAT[ch] ?? ch)
    .join("")
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function shortHash(value: string): string {
  return createHash("sha1").update(value).digest("hex").slice(0, 6);
}
