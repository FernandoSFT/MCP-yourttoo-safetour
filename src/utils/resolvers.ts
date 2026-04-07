import { inventoryCache } from "../cache/inventoryCache.js";

/**
 * Attemps to resolve a free-text location into the most likely slug(s).
 * Prioritizes country, then city.
 */
export async function resolveDestination(input: string): Promise<{ countrySlug?: string; citySlug?: string }> {
    if (!input) return {};
    
    // Check if it matches a country first
    const country = await inventoryCache.resolveCountry(input);
    if (country) {
        return { countrySlug: country };
    }
    
    // If not a country, it might be a city. We don't have all cities cached, so we
    // try to match with cities of "primary" countries or frequent destinations
    // but the best way is to search in common destinations if possible.
    // For now, if it didn't match a country, we just return it as a possible city slug
    // and the tool logic will handle trying to resolve it if country filter is present.
    return { citySlug: input.toLowerCase().replace(/\s+/g, '-') };
}

/**
 * Resolves an array of city names to slugs.
 * Needs a country slug to be accurate because of duplicates like 'Madrid (ES)' vs 'Madrid (CO)'.
 */
export async function resolveCitySlugs(cities: string[], countrySlug?: string): Promise<string[]> {
    if (!cities.length || !countrySlug) return cities; // Fallback to raw names as slugs
    
    const results: string[] = [];
    for (const city of cities) {
        const slug = await inventoryCache.resolveCity(city, countrySlug);
        results.push(slug || city.toLowerCase().replace(/\s+/g, '-'));
    }
    return results;
}
