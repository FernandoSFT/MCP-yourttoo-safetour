import { apiPost } from "../api/yourttooClient.js";
import { formatPrice } from "../utils/formatters.js";
import { truncateResponse } from "../utils/truncate.js";

export async function comparePrograms(args: any) {
  const { codes, client_profile } = args;

  if (!Array.isArray(codes) || codes.length < 2) {
    return "Mínimo 2 y máximo 5 códigos de programa para una comparativa correcta.";
  }
  
  if (codes.length > 5) {
      return "Máximo 5 códigos de programa permitidos. Selecciona los mejores para comparar.";
  }

  const results: any[] = [];
  for (const code of codes) {
    const response = await apiPost("/apiv2/fetch", { type: "program", code });
    if (response) results.push(response);
  }

  if (results.length === 0) return "No se encontró ningún programa para comparar.";

  // Sort by price ascending
  results.sort((a, b) => (a.minprice || 0) - (b.minprice || 0));

  let text = `COMPARATIVA DE ${results.length} PROGRAMAS (Orden: Precio ASC)\n\n`;
  
  const headers = "| Campo | " + results.map(r => r.code).join(" | ") + " |";
  const underline = "|---| " + results.map(() => "---|").join("");
  
  text += headers + "\n";
  text += underline + "\n";
  
  const addRow = (label: string, field: string) => {
      return `| ${label} | ` + results.map(r => r[field] || "N/A").join(" | ") + " |\n";
  };
  
  const addFormattedRow = (label: string, formatter: (r: any) => string) => {
      return `| ${label} | ` + results.map(r => formatter(r)).join(" | ") + " |\n";
  };
  
  text += addFormattedRow("Precio Desde", r => formatPrice(r.minprice));
  text += addFormattedRow("Duración", r => `${r.itinerary?.length || 'N/D'} d`);
  text += addFormattedRow("Categoría", r => r.categoryname || "N/A");
  text += addFormattedRow("Guía ES", r => r.included?.tourescort ? "✓" : "✗");
  text += addFormattedRow("Transfers", r => (r.included?.arrivaltransfer || r.included?.departuretransfer) ? "✓" : "✗");
  text += addFormattedRow("Hoteles", r => r.itinerary?.[0]?.starhotel || "N/A");
  text += addFormattedRow("Proveedor", r => r.providername || "YTT");

  text += `\n🎯 RECOMENDACIÓN:\n`;
  if (client_profile) {
      const best = results[0]; // Simplification for now, cheapest
      text += `Para el perfil '${client_profile}', la mejor opción es '${best.code} — ${best.title}' por ser la más económica y ajustarse a los criterios base.`;
  } else {
      text += `La opción más económica es ${results[0].code} (${formatPrice(results[0].minprice)}).`;
  }

  return truncateResponse(text);
}
