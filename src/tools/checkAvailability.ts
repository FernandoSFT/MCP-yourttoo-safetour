import { z } from 'zod';
import { YourttooClient } from '../api/yourttooClient.js';

export const checkAvailabilitySchema = z.object({
  code: z.string().describe('Código del programa'),
  day: z.number().describe('Día del mes'),
  month: z.number().describe('Mes (1-12)'),
  year: z.number().describe('Año'),
  pax: z.number().optional().describe('Número de pasajeros (default: 2)'),
});

export type CheckAvailabilityParams = z.infer<typeof checkAvailabilitySchema>;

export async function checkAvailability(params: CheckAvailabilityParams, client: YourttooClient) {
  const { code, day, month, year, pax = 2 } = params;
  
  const request = {
    bookrequest: {
      date: { day, month, year },
      productcode: code,
      roomdistribution: [
        {
          name: 'Habitación Doble',
          roomcode: 2,
          paxlist: Array(pax).fill(null).map((_, i) => ({
            name: `Pasajero${i + 1}`,
            lastname: '',
            documentnumber: '',
            documenttype: 'passport',
            documentexpeditioncountry: 'ES',
            birthdate: '1990-01-01',
            country: 'ES',
          })),
        },
      ],
    },
  };
  
  const result = await client.checkAvailability(request);
  
  if (!result.available) {
    return {
      available: false,
      message: result.message || 'No disponible',
    };
  }
  
  const budget = result.budget;
  
  const formatted = {
    available: true,
    locator: budget.locator,
    program: {
      code: budget.program.code,
      title: budget.program.title,
    },
    dates: budget.dates,
    pricing: {
      net_price: budget.pricing?.netprice,
      currency: budget.pricing?.currency || 'EUR',
    },
    pax_count: budget.paxes?.length || pax,
    rooms: budget.rooms?.map((r: any) => ({
      code: r.code,
      name: r.name,
      pax_count: r.paxlist?.length || 0,
    })) || [],
    cancel_policy: budget.cancelpolicy,
    message: result.message,
  };
  
  return formatted;
}