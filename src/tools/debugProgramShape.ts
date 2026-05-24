import { apiPost } from "../api/yourttooClient.js";
import { truncateResponse } from "../utils/truncate.js";

type ShapeOptions = {
  maxDepth?: number;
  maxArrayItems?: number;
  includeSamples?: boolean;
};

type DebugSection =
  | "all"
  | "included"
  | "itinerary"
  | "availability"
  | "pricesbymonth"
  | "provider"
  | "categories"
  | "hotels";

const SECTION_KEYS: Record<DebugSection, string[]> = {
  all: [
    "code",
    "title",
    "description",
    "brief",
    "minprice",
    "currency",
    "duration",
    "days",
    "categoryname",
    "minpaxoperation",
    "provider",
    "included",
    "itinerary",
    "availability",
    "pricesbymonth",
  ],
  included: ["included"],
  itinerary: ["itinerary"],
  availability: ["availability"],
  pricesbymonth: ["pricesbymonth"],
  provider: ["provider"],
  categories: ["categories", "categoryname", "categoryparentcode", "tags"],
  hotels: ["hotelcategories", "itinerary"],
};

function primitiveType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function sampleValue(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value === "string") return value.length > 80 ? `${value.slice(0, 80)}...` : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[array:${value.length}]`;
  if (typeof value === "object") return "{object}";
  return typeof value;
}

function describeValue(value: unknown, depth: number, options: Required<ShapeOptions>): string[] {
  const lines: string[] = [];
  const type = primitiveType(value);

  if (depth >= options.maxDepth) {
    lines.push(type);
    if (options.includeSamples && type !== "object" && type !== "array") {
      lines.push(`sample: ${sampleValue(value)}`);
    }
    return lines;
  }

  if (Array.isArray(value)) {
    lines.push(`array(length=${value.length})`);
    const items = value.slice(0, options.maxArrayItems);
    items.forEach((item, index) => {
      if (item && typeof item === "object") {
        lines.push(`item_${index}_keys: ${Object.keys(item as Record<string, unknown>).join(", ") || "none"}`);
        const childLines = describeObject(item as Record<string, unknown>, depth + 1, options)
          .map((line) => `  ${line}`);
        lines.push(...childLines);
      } else if (item !== undefined) {
        lines.push(`item_${index}_type: ${primitiveType(item)}`);
        if (options.includeSamples) lines.push(`item_${index}_sample: ${sampleValue(item)}`);
      }
    });
    return lines;
  }

  if (value && typeof value === "object") {
    lines.push(`object(keys=${Object.keys(value as Record<string, unknown>).length})`);
    const childLines = describeObject(value as Record<string, unknown>, depth + 1, options)
      .map((line) => `  ${line}`);
    lines.push(...childLines);
    return lines;
  }

  lines.push(type);
  if (options.includeSamples) lines.push(`sample: ${sampleValue(value)}`);
  return lines;
}

function describeObject(obj: Record<string, unknown>, depth: number, options: Required<ShapeOptions>): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const descriptions = describeValue(value, depth, options);
    const [first = primitiveType(value), ...rest] = descriptions;
    return [`- ${key}: ${first}`, ...rest.map((line) => `  ${line}`)];
  });
}

function normalizeSection(section: unknown): DebugSection {
  if (typeof section !== "string") return "all";
  if (section in SECTION_KEYS) return section as DebugSection;
  return "all";
}

export async function debugProgramShape(args: any) {
  const {
    code,
    max_depth = 2,
    max_array_items = 1,
    include_samples = false,
    section = "all",
    max_chars = 2500,
  } = args;

  if (!code) throw new Error("Código de programa requerido.");

  const selectedSection = normalizeSection(section);
  const response = await apiPost("/apiv2/fetch", { type: "program", code });

  if (!response || !response.code) {
    return `No se ha encontrado el programa con código: ${code}.`;
  }

  const options: Required<ShapeOptions> = {
    maxDepth: Math.min(Number(max_depth) || 2, 4),
    maxArrayItems: Math.min(Math.max(Number(max_array_items) || 1, 1), 3),
    includeSamples: Boolean(include_samples),
  };

  const selected: Record<string, unknown> = {};
  for (const key of SECTION_KEYS[selectedSection]) {
    if (key in response) selected[key] = response[key];
  }

  let text = `DEBUG PROGRAM SHAPE: ${response.title || "Sin título"} (${response.code})\n`;
  text += `Section: ${selectedSection}\n\n`;
  text += `Top-level keys (${Object.keys(response).length}):\n${Object.keys(response).join(", ")}\n\n`;
  text += `Selected structure:\n${describeObject(selected, 0, options).join("\n")}\n\n`;
  text += "Nota: tool temporal de diagnóstico. Usa section='availability' o section='pricesbymonth' para evitar truncado.";

  return truncateResponse(text, Math.min(Number(max_chars) || 2500, 5000));
}
