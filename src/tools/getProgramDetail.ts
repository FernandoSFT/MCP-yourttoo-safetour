import { apiPost } from "../api/yourttooClient.js";
import { formatPrice, summarizeIncluded } from "../utils/formatters.js";
import { truncateResponse } from "../utils/truncate.js";

export async function getProgramDetail(args: any) {
  const { code, detail_level = "summary" } = args;

  if (!code) throw new Error("Código de programa requerido.");

  const response = await apiPost("/apiv2/fetch", { type: "program", code });
  
  if (!response || !response.code) {
    return `No se ha encontrado el programa con código: ${code}. Asegúrate de usar el código obtenido en search_programs.`;
  }

  const p = response;
  let text = `DETALLE DEL PROGRAMA: ${p.title} (${p.code})\n\n`;

  // Helper for summarizing itinerary
  const summarizeItinerary = (itinerary: any[]) => {
      if (!itinerary || !Array.isArray(itinerary)) return "No disponible.";
      return itinerary.map(day => `Día ${day.day}: ${day.hotelname || day.route || 'Estancia'}`).join("\n");
  };

  // Helper for available months
  const listAvailableMonths = (availability: any[]) => {
      if (!availability || !Array.isArray(availability)) return "No hay disponibilidad próxima.";
      const months = availability.map((m: any) => `${m.month} ${m.year} (${m.days?.length || 0} salidas)`);
      return months.length > 5 ? months.slice(0, 5).join(", ") + "..." : months.join(", ");
  };

  if (detail_level === "summary") {
      text += `Resumen:\n- ${p.description?.slice(0, 200)}...\n`;
      text += `- Precio: desde ${formatPrice(p.minprice)}\n`;
      text += `- Incluye: ${summarizeIncluded(p.included)}\n`;
      text += `- Duración: ${p.itinerary?.length || 'N/D'} días\n`;
      text += `- Proveedor: ${p.providername || 'Dabliu'}\n\n`;
      text += `Itinerario resumido:\n${summarizeItinerary(p.itinerary).slice(0, 500)}...\n\n`;
      text += `Meses disponibles: ${listAvailableMonths(p.availability)}\n\n`;
      text += `💡 Usa detail_level='itinerary' para el día a día, o 'availability' para fechas y precios exactos.`;
  } else if (detail_level === "itinerary") {
      text += `ITINERARIO DÍA A DÍA:\n`;
      p.itinerary?.forEach((day: any) => {
          text += `Día ${day.day}: ${day.hotelname || 'Estancia'} | ${day.meals || 'Solo alojamiento'} | ${day.highlights || 'Visitas libres'}\n`;
      });
  } else if (detail_level === "availability") {
      text += `DISPONIBILIDAD Y PRECIOS:\n`;
      p.availability?.forEach((mon: any) => {
          text += `\n📅 ${mon.month} ${mon.year}:\n`;
          mon.days?.forEach((d: any) => {
              text += `- Día ${d.day}: ${formatPrice(d.minprice)} | ${d.available ? 'Disponible' : 'Cerrado'}\n`;
          });
      });
  } else if (detail_level === "full") {
      // Combination of all, but strictly truncated
      text += `RESUMEN COMPLETO (Comprimido):\n`;
      text += `- Descripción: ${p.description?.slice(0, 300)}...\n`;
      text += `- Incluye: ${summarizeIncluded(p.included)}\n\n`;
      text += `Itinerario:\n${summarizeItinerary(p.itinerary)}\n\n`;
      text += `Disponibilidad:\n${listAvailableMonths(p.availability)}\n`;
  }

  return truncateResponse(text);
}
