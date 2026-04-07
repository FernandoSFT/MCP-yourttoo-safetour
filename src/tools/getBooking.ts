import { apiPost } from "../api/yourttooClient.js";
import { formatPrice, formatDate } from "../utils/formatters.js";
import { truncateResponse } from "../utils/truncate.js";

export async function getBooking(args: any) {
  const { locator } = args;

  if (!locator) throw new Error("Localizador de la reserva (locator) es requerido.");

  const response = await apiPost("/apiv2/fetch", { type: "booking", code: locator });
  
  if (!response || !response.locator) {
    return `No se ha encontrado ninguna reserva con localizador: ${locator}. Verifica el código.`;
  }

  const b = response;
  let text = `DETALLE DE LA RESERVA: ${b.locator}\n\n`;

  text += `- Programa: ${b.programtitle || 'No disponible'}\n`;
  text += `- Estado: ${b.status || 'Desconocido'}\n`;
  text += `- Viajeros: ${b.pax || 0} pax (${b.accommodation || 'doble'})\n`;
  text += `- Fecha Viaje: ${formatDate(b.date)}\n`;
  text += `- Precio Total: ${formatPrice(b.totalprice)}\n`;
  text += `- Agencia/Agente: ${b.agentname || b.providername || 'N/A'}\n\n`;

  if (b.status === "CONFIRMED") {
      text += `✅ Reserva confirmada. ¡Buen viaje!\n`;
  } else if (b.status === "PENDING") {
      text += `⏳ Reserva pendiente de confirmación. \n`;
  }

  return truncateResponse(text);
}
