import { apiPost } from "../api/yourttooClient.js";
import { formatPrice, formatDate } from "../utils/formatters.js";
import { truncateResponse } from "../utils/truncate.js";

export async function checkAvailability(args: any) {
  const { code, date, accommodation } = args;

  if (!code || !date) throw new Error("Código y fecha (YYYY/MM/DD) son obligatorios.");

  const payload: any = { code, date };
  if (accommodation) payload.accommodation = accommodation;

  const res = await apiPost("/apiv2/checkavailability", payload);
  
  if (!res || res.available === false) {
    return `❌ No hay disponibilidad para ${code} en la fecha ${formatDate(date)}. Prueba otra fecha o programa similar.`;
  }

  let text = `✅ DISPONIBILIDAD CONFIRMADA para ${code} (${formatDate(date)})\n\n`;
  text += `- Precio para acomodación '${accommodation || 'doble'}': ${formatPrice(res.price)}\n`;
  text += `- Slots restantes: ${res.pax_remaining || 'N/D'}\n`;
  text += `- Reserva provisional creada con éxito (Válida 48h).\n`;
  
  if (res.cancel_policy) {
    text += `- Política de cancelación: ${res.cancel_policy.slice(0, 150)}...\n`;
  }

  return truncateResponse(text);
}
