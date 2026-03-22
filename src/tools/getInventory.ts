import { z } from 'zod';
import { YourttooClient } from '../api/yourttooClient.js';

const inventoryTypes = ['countries', 'cities', 'providers', 'tags'] as const;

export const getInventorySchema = z.object({
  resource_type: z.enum(inventoryTypes).describe('Tipo de recurso: countries, cities, providers o tags'),
});

export type GetInventoryParams = z.infer<typeof getInventorySchema>;

export async function getInventory(params: GetInventoryParams, client: YourttooClient) {
  const { resource_type } = params;
  
  const data = await client.find(resource_type);
  
  const items = Array.isArray(data) ? data : data.items || [];
  
  const formatted = items.map((item: any) => {
    if (resource_type === 'countries' || resource_type === 'cities') {
      return {
        id: item._id,
        code: item.countrycode,
        label_es: item.label_es,
        label_en: item.label_en,
        slug: item.slug,
        location: item.location ? `${item.location.latitude},${item.location.longitude}` : null,
      };
    }
    if (resource_type === 'providers') {
      return {
        id: item._id,
        code: item.code,
        name: item.company?.name || item.name,
        country: item.country,
      };
    }
    if (resource_type === 'tags') {
      return {
        id: item._id,
        code: item.code,
        name: item.name,
        category: item.category,
      };
    }
    return item;
  });

  return {
    total: formatted.length,
    resource_type,
    items: formatted.slice(0, 100),
  };
}