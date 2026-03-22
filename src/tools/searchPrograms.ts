import { z } from 'zod';
import { YourttooClient } from '../api/yourttooClient.js';

export const searchProgramsSchema = z.object({
  destination: z.string().optional().describe('País o ciudad de destino (ej: España, Tokio)'),
  tags: z.array(z.string()).optional().describe('Categorías: beach, cultural, adventure, etc.'),
  min_price: z.number().optional().describe('Precio mínimo en EUR'),
  max_price: z.number().optional().describe('Precio máximo en EUR'),
  min_days: z.number().optional().describe('Duración mínima en días'),
  max_days: z.number().optional().describe('Duración máxima en días'),
  providers: z.array(z.string()).optional().describe('Códigos de proveedores'),
  page: z.number().optional().describe('Número de página (default: 1)'),
  max_results: z.number().optional().describe('Resultados por página (default: 12)'),
});

export type SearchProgramsParams = z.infer<typeof searchProgramsSchema>;

export async function searchPrograms(params: SearchProgramsParams, client: YourttooClient) {
  const { destination, tags, min_price, max_price, min_days, max_days, providers, page = 1, max_results = 12 } = params;
  
  const filter: any = {
    page,
    maxresults: max_results,
  };
  
  if (tags && tags.length > 0) filter.tags = tags;
  if (providers && providers.length > 0) filter.providers = providers;
  if (min_price) filter.pricemin = min_price;
  if (max_price) filter.pricemax = max_price;
  if (min_days) filter.mindays = min_days;
  if (max_days) filter.maxdays = max_days;
  
  if (destination) {
    const countriesData = await client.find('countries');
    const citiesData = await client.find('cities');
    
    const countries = Array.isArray(countriesData) ? countriesData : countriesData.items || [];
    const cities = Array.isArray(citiesData) ? citiesData : citiesData.items || [];
    
    const normalizedDest = destination.toLowerCase();
    
    const foundCountry = countries.find((c: any) => 
      c.label_es?.toLowerCase() === normalizedDest || 
      c.label_en?.toLowerCase() === normalizedDest ||
      c.slug?.toLowerCase() === normalizedDest
    );
    
    if (foundCountry) {
      filter.countries = [foundCountry._id];
    } else {
      const foundCity = cities.find((c: any) => 
        c.label_es?.toLowerCase() === normalizedDest || 
        c.label_en?.toLowerCase() === normalizedDest ||
        c.slug?.toLowerCase() === normalizedDest
      );
      
      if (foundCity) {
        filter.cities = [foundCity._id];
      }
    }
  }
  
  const data = await client.search(filter);
  
  const items = (data.items || []).map((item: any) => ({
    code: item.code,
    title: item.title,
    category: item.categoryname,
    description: item.description?.substring(0, 200) + '...',
    min_price: item.minprice,
    currency: item.currency || 'EUR',
    min_pax: item.minpaxopertaion,
    release_days: item.release,
    arrival: item.flights?.arrival?.label || null,
    departure: item.flights?.departure?.label || null,
    provider: item.provider?.company?.name || item.provider?.code,
    prices_by_month: item.pricesbymonth?.slice(0, 6).map((p: any) => ({
      month: p.month,
      year: p.year,
      price: p.minprice,
    })) || [],
  }));
  
  return {
    total_items: data.totalItems || 0,
    pages: data.pages || 1,
    current_page: data.currentpage || 1,
    results: items,
  };
}