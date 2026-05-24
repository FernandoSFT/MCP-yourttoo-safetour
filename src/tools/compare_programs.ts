import { apiPost } from "../api/yourttooClient.js";
import { formatPrice } from "../utils/formatters.js";
import { truncateResponse } from "../utils/truncate.js";
import { normalizeProgram } from "../normalizers/programNormalizers.js";

export async function comparePrograms(args: any) {
  const { codes, client_profile, mode = "compact" } = args;

  if (!Array.isArray(codes) || codes.length < 2) {
    return "Mínimo 2 códigos de programa para comparar.";
  }

  const maxCodes = mode === "verbose" ? 5 : 3;
  if (codes.length > maxCodes) {
    return `Máximo ${maxCodes} códigos en modo ${mode}. Selecciona las opciones más relevantes.`;
  }

  const results = [];
  for (const code of codes) {
    const response = await apiPost("/apiv2/fetch", { type: "program", code });
    if (response) results.push(normalizeProgram(response));
  }

  if (results.length === 0) return "No se encontró ningún programa para comparar.";

  results.sort((a, b) => (a.minPrice ?? Number.MAX_SAFE_INTEGER) - (b.minPrice ?? Number.MAX_SAFE_INTEGER));

  const lines: string[] = [];
  lines.push(`COMPARATIVA BREVE (${results.length} programas)`);
  lines.push("");
  lines.push("| Código | Días | Desde | Perfil | Próxima salida |");
  lines.push("|---|---:|---:|---|---|");
  results.forEach((program) => {
    const next = program.nextDepartures[0];
    lines.push(`| ${program.code} | ${program.days ?? "N/D"} | ${program.minPrice !== undefined ? formatPrice(program.minPrice, program.currency) : "Consultar"} | ${program.categoryName ?? "Viaje"} | ${next?.label ?? "Sin salidas"} |`);
  });

  lines.push("");
  const best = results[0];
  if (best) {
    if (client_profile) {
      lines.push(`Recomendación inicial para '${client_profile}': ${best.code} — ${best.title}. Es la opción más competitiva por precio; validar encaje con itinerario antes de proponer.`);
    } else {
      lines.push(`Opción más económica: ${best.code} — ${best.title} (${best.minPrice !== undefined ? formatPrice(best.minPrice, best.currency) : "consultar"}).`);
    }
  }

  return truncateResponse(lines.join("\n"), 1600);
}
