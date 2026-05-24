import { apiPost } from "../api/yourttooClient.js";
import { truncateResponse } from "../utils/truncate.js";

type ShapeOptions = {
  maxDepth?: number;
  maxArrayItems?: number;
  includeSamples?: boolean;
};

function primitiveType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function sampleValue(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value === "string") return value.length > 60 ? `${value.slice(0, 60)}...` : value;
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
    return lines;
  }

  if (Array.isArray(value)) {
    lines.push(`array(length=${value.length})`);
    const first = value[0];
    if (first && typeof first === "object") {
      lines.push(`first_item_keys: ${Object.keys(first as Record<string, unknown>).join(", ") || "none"}`);
      const childLines = describeObject(first as Record<string, unknown>, depth + 1, options)
        .map((line) => `  ${line}`);
      lines.push(...childLines.slice(0, options.maxArrayItems * 20));
    } else if (first !== undefined) {
      lines.push(`first_item_type: ${primitiveType(first)}`);
      if (options.includeSamples) lines.push(`first_item_sample: ${sampleValue(first)}`);
    }
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

export async function debugProgramShape(args: any) {
  const {
    code,
    max_depth = 2,
    include_samples = false,
  } = args;

  if (!code) throw new Error("Código de programa requerido.");

  const response = await apiPost("/apiv2/fetch", { type: "program", code });

  if (!response || !response.code) {
    return `No se ha encontrado el programa con código: ${code}.`;
  }

  const options: Required<ShapeOptions> = {
    maxDepth: Math.min(Number(max_depth) || 2, 3),
    maxArrayItems: 1,
    includeSamples: Boolean(include_samples),
  };

  const selectedKeys = [
    "code",
    "title",
    "description",
    "minprice",
    "duration",
    "days",
    "categoryname",
    "providername",
    "included",
    "itinerary",
    "availability",
  ];

  const selected: Record<string, unknown> = {};
  for (const key of selectedKeys) {
    if (key in response) selected[key] = response[key];
  }

  let text = `DEBUG PROGRAM SHAPE: ${response.title || "Sin título"} (${response.code})\n\n`;
  text += `Top-level keys (${Object.keys(response).length}):\n${Object.keys(response).join(", ")}\n\n`;
  text += `Selected structure:\n${describeObject(selected, 0, options).join("\n")}\n\n`;
  text += "Nota: esta tool es solo de diagnóstico. No devuelve el objeto completo para evitar consumo innecesario de tokens.";

  return truncateResponse(text, 2500);
}
