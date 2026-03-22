import { z } from 'zod';
import { YourttooClient } from '../api/yourttooClient.js';

export const getProgramDetailSchema = z.object({
  code: z.string().describe('Código del programa en Yourttoo (ej: YTTJP-2026)'),
});

export type GetProgramDetailParams = z.infer<typeof getProgramDetailSchema>;

export async function getProgramDetail(params: GetProgramDetailParams, client: YourttooClient) {
  const { code } = params;
  
  const program = await client.fetch('program', code);
  
  const formatted = {
    code: program.code,
    title: program.title,
    category: program.categoryname,
    description: program.description,
    min_price: program.minprice,
    currency: program.currency || 'EUR',
    min_pax: program.minpaxoperation,
    release_days: program.release,
    cancel_policy: program.cancelpolicy,
    important_notes: program.importantnotes,
    
    flights: {
      arrival: program.flights?.arrival ? {
        airport: program.flights.arrival.iata,
        city: program.flights.arrival.city,
        label: program.flights.arrival.label,
      } : null,
      departure: program.flights?.departure ? {
        airport: program.flights.departure.iata,
        city: program.flights.departure.city,
        label: program.flights.departure.label,
      } : null,
    },
    
    included: {
      arrival_transfer: program.included?.arrivaltransfer?.included ? program.included.arrivaltransfer.description : 'No incluido',
      departure_transfer: program.included?.departuretransfer?.included ? program.included.departuretransfer.description : 'No incluido',
      tour_escort: program.included?.tourescort?.included ? {
        included: true,
        languages: Object.entries(program.included.tourescort)
          .filter(([k, v]) => k !== 'included' && k !== 'description' && v === true)
          .map(([k]) => k),
      } : { included: false },
      transport: Object.entries(program.included?.transportbetweencities || {})
        .filter(([, v]: any) => v?.included)
        .map(([k, v]: any) => `${k}: ${v.description || 'Incluido'}`),
    },
    
    itinerary: (program.itinerary || []).map((day: any, index: number) => ({
      day: index + 1,
      description: day.description,
      departure: day.departure?.city ? `${day.departure.city}, ${day.departure.country}` : null,
      sleep: day.sleep?.city ? `${day.sleep.city}, ${day.sleep.country}` : null,
      hotel: day.hotel?.name ? `${day.hotel.name} (${day.hotel.category})` : null,
      meals: {
        breakfast: day.meals?.breakfast || false,
        lunch: day.meals?.lunch || false,
        dinner: day.meals?.dinner || false,
      },
      activities: (day.activities || []).map((a: any) => ({
        title: a.title,
        type: a.private ? 'Privado' : a.group ? 'Grupo' : null,
        tickets: a.ticketsincluded ? 'Incluidos' : 'No incluidos',
      })),
    })),
    
    availability: program.availability?.map((yearData: any) => ({
      year: yearData.year,
      months: yearData.months?.map((month: any) => ({
        month: month.month,
        available_days: month.days?.map((d: any) => ({
          day: d.day,
          price_single: d.single,
          price_double: d.double,
          price_triple: d.triple,
        })) || [],
      })) || [],
    })) || [],
    
    provider: program.provider?.company?.name || program.provider?.code,
  };
  
  return formatted;
}