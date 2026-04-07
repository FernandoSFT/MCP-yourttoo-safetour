import { apiPost } from "../api/yourttooClient.js";
import { truncateResponse } from "../utils/truncate.js";

export async function getInventory(args: any) {
  const { resource_type, country_filter, search_text } = args;

  if (resource_type === "cities" && !country_filter && !search_text) {
    return "El catálogo de ciudades es muy extenso. Usa country_filter (ej: 'jp' para Japón) o search_text (ej: 'Tokio') para filtrar.";
  }

  const payload: any = { type: resource_type };
  if (country_filter) payload.countrycode = country_filter;

  const data = await apiPost("/apiv2/find", payload);
  if (!Array.isArray(data)) return "No se encontró inventario de ese tipo.";

  let items = data;
  if (search_text) {
    const st = search_text.toLowerCase();
    items = data.filter(it => 
      (it.label_es?.toLowerCase().includes(st) || 
       it.label_en?.toLowerCase().includes(st) || 
       it.slug?.toLowerCase().includes(st))
    );
  }

  const finalItems = items.slice(0, 30);
  let text = `INVENTARIO DE ${resource_type.toUpperCase()} (Mostrando ${finalItems.length} de ${items.length}):\n\n`;

  finalItems.forEach(it => {
    if (resource_type === "countries") {
        text += `- ${it.label_es} (${it.label_en || 'N/A'}) | slug: ${it.slug} | code: ${it.countrycode}\n`;
    } else if (resource_type === "cities") {
        text += `- ${it.label_es} | slug: ${it.slug} | country: ${it.countrycode}\n`;
    } else {
        text += `- ${it.label_es || it.label_en || it.name || it.slug} | slug: ${it.slug || it.code}\n`;
    }
  });

  if (items.length > 30) {
      text += `\n[... Mostrando solo 30 de ${items.length}. Usa search_text para refinar tu búsqueda.]`;
  }

  return truncateResponse(text);
}
