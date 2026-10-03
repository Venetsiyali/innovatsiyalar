import uz from "./uz.json";

type Dict = { [key: string]: string | Dict };

const dict: Dict = uz;

/** Look up a dotted key in uz.json and fill `{param}` placeholders. */
export function t(key: string, params?: Record<string, string | number>): string {
  let node: string | Dict | undefined = dict;
  for (const part of key.split(".")) {
    node = typeof node === "object" ? node[part] : undefined;
  }
  if (typeof node !== "string") return key;
  return params ? node.replace(/\{(\w+)\}/g, (_, p) => String(params[p] ?? `{${p}}`)) : node;
}
