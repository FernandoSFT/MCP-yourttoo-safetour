import { z } from 'zod';
import { YourttooClient } from '../api/yourttooClient.js';

export const getBookingSchema = z.object({
  locator: z.string().describe('Localizador de la reserva en Yourttoo'),
});

export type GetBookingParams = z.infer<typeof getBookingSchema>;

export async function getBooking(params: GetBookingParams, client: YourttooClient) {
  const { locator } = params;
  
  const booking = await client.fetch('booking', locator);
  
  const formatted = {
    id: booking.id,
    locator: booking.locator,
    cancel_policy: booking.cancelpolicy,
    dates: booking.dates,
    program: {
      code: booking.program.code,
      title: booking.program.title,
      category: booking.program.categoryname,
      description: booking.program.description?.substring(0, 300),
    },
    provider: booking.provider?.company?.name || booking.provider?.code,
    info: booking.info,
    pricing: {
      net_price: booking.pricing?.netprice,
      currency: booking.pricing?.currency || 'EUR',
    },
    passengers: (booking.paxes || []).map((p: any) => ({
      name: p.name,
      lastname: p.lastname,
      room: p.room,
      document: p.iddocument ? `${p.iddocumenttype}: ${p.iddocument}` : null,
    })),
    rooms: (booking.rooms || []).map((r: any) => ({
      code: r.code,
      name: r.name,
      pax_list: r.paxlist,
    })),
  };
  
  return formatted;
}