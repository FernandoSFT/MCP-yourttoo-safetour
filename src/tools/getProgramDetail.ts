import { apiPost } from "../api/yourttooClient.js";
import { formatPrice } from "../utils/formatters.js";
import { truncateResponse } from "../utils/truncate.js";
import {
  formatDepartureList,
  normalizeAvailability,
  normalizeProgram,
  summarizeItinerary,
} from "../normalizers/programNormalizers.js";

function shortText(value: string | undefined, max = 220): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max)}...` : cleaned;
}

function buildSummaryText(response: any): string {
  const p = normalizeProgram(response);
  const titleLine = `${p.title} (${p.code})`;
  const lines: string[] = [];

  lines.push(`DETALLE DEL PROGRAMA: ${titleLine}`);
  lines.push("");

  const description = shortText(p.description ?? p.brief);
  if (description) lines.push(`Resumen: ${description}`);

  lines.push(`Precio: ${p.minPrice !== undefined ? `desde ${formatPrice(p.minPrice, p.currency)} p/p` : "consultar"}`);
  lines.push(`Duración: ${p.days !== undefined ? `${p.days} días` : "no informada"}`);
  if (p.categoryName) lines.push(`Categoría: ${p.categoryName}`);
  lines.push(`Proveedor: ${p.providerName}`);
  lines.push(`Incluye: ${p.includedSummary}`);
  lines.push("");
  lines.push("Próximas salidas:");
  lines.push(formatDepartureList(p.nextDepartures, 4));
  lines.push("");
  lines.push("Siguiente paso: usa detail_level='itinerary' o 'availability' solo si necesitas ampliar.");

  return lines.join("\n");
}

export async function getProgramDetail(args: any): Promise<string> {
  const { code, detail_level = "summary" } = args;

  if (!code) throw new Error("Código de programa requerido.");

  const response = await apiPost("/apiv2/fetch", { type: "program", code });

  if (!response || !response.code) {
    return `No se ha encontrado el programa con código: ${code}. Asegúrate de usar el código obtenido en search_programs.`;
  }

  const p = normalizeProgram(response);
  const titleLine = `${p.title} (${p.code})`;

  if (detail_level === "micro") {
    const price = p.minPrice !== undefined ? `desde ${formatPrice(p.minPrice, p.currency)} p/p` : "precio a consultar";
    const days = p.days !== undefined ? `${p.days} días` : "duración no informada";
    return truncateResponse(`${titleLine}\n${days} · ${price}\n${p.categoryName || "Viaje"} · ${p.providerName}\nIncluye: ${p.includedSummary}`, 900);
  }

  if (detail_level === "summary") {
    return truncateResponse(buildSummaryText(response), 1600);
  }

  if (detail_level === "itinerary") {
    const itinerary = summarizeItinerary(response, 20);
    const lines = [`ITINERARIO: ${titleLine}`, "", ...(itinerary.length > 0 ? itinerary : ["Itinerario no informado."])];
    return truncateResponse(lines.join("\n"), 2200);
  }

  if (detail_level === "availability") {
    const availability = normalizeAvailability(response, 12);
    const lines = [`DISPONIBILIDAD: ${titleLine}`, ""];
    if (availability.length === 0) {
      lines.push("Sin salidas informadas.");
    } else {
      availability.forEach((departure) => {
        const prices = [
          departure.double !== undefined ? `doble ${formatPrice(departure.double)}` : undefined,
          departure.single !== undefined ? `single ${formatPrice(departure.single)}` : undefined,
          departure.triple !== undefined ? `triple ${formatPrice(departure.triple)}` : undefined,
        ].filter((item): item is string => Boolean(item));
        lines.push(`- ${departure.label} · ${departure.stateLabel}${prices.length > 0 ? ` · ${prices.join(" · ")}` : ""}`);
      });
    }
    return truncateResponse(lines.join("\n"), 2200);
  }

  if (detail_level === "full") {
    const summary = buildSummaryText(response);
    const itinerary = summarizeItinerary(response, 10).join("\n");
    return truncateResponse(`${summary}\n\nITINERARIO RESUMIDO:\n${itinerary || "No informado"}`, 3000);
  }

  return `detail_level no reconocido: ${detail_level}`;
}
