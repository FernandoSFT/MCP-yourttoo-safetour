import { apiPost } from "../api/yourttooClient.js";
import { config } from "../config.js";

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

class InventoryCache {
  private countries: CacheItem<any[]> | null = null;
  private tags: CacheItem<any[]> | null = null;
  private providers: CacheItem<any[]> | null = null;
  private citiesByCountry: Map<string, CacheItem<any[]>> = new Map();

  private ttl = config.CACHE_TTL_HOURS * 60 * 60 * 1000;

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.ttl;
  }

  async getCountries() {
    if (!this.countries || this.isExpired(this.countries.timestamp)) {
      console.log("Fetching countries for cache...");
      const data = await apiPost("/apiv2/find", { type: "countries" });
      this.countries = { data: Array.isArray(data) ? data : [], timestamp: Date.now() };
    }
    return this.countries.data;
  }

  async getTags() {
    if (!this.tags || this.isExpired(this.tags.timestamp)) {
      console.log("Fetching tags for cache...");
      const data = await apiPost("/apiv2/find", { type: "tags" });
      this.tags = { data: Array.isArray(data) ? data : [], timestamp: Date.now() };
    }
    return this.tags.data;
  }

  async getProviders() {
    if (!this.providers || this.isExpired(this.providers.timestamp)) {
      console.log("Fetching providers for cache...");
      const data = await apiPost("/apiv2/find", { type: "providers" });
      this.providers = { data: Array.isArray(data) ? data : [], timestamp: Date.now() };
    }
    return this.providers.data;
  }

  async getCities(countrySlug?: string) {
    if (countrySlug) {
      const cached = this.citiesByCountry.get(countrySlug);
      if (!cached || this.isExpired(cached.timestamp)) {
        console.log(`Fetching cities for country: ${countrySlug}...`);
        const data = await apiPost("/apiv2/find", { type: "cities", countrycode: countrySlug });
        this.citiesByCountry.set(countrySlug, { data: Array.isArray(data) ? data : [], timestamp: Date.now() });
      }
      return this.citiesByCountry.get(countrySlug)!.data;
    }
    // No full city fetch allowed without country filter normally, but we can't fetch all at once easily.
    return [];
  }

  async resolveCountry(name: string): Promise<string | null> {
    const countries = await this.getCountries();
    const normalized = name.toLowerCase().trim();
    
    const matched = countries.find(c => 
      c.label_es?.toLowerCase() === normalized || 
      c.label_en?.toLowerCase() === normalized || 
      c.slug?.toLowerCase() === normalized ||
      c.countrycode?.toLowerCase() === normalized
    );
    
    return matched ? matched.slug : null;
  }

  async resolveCity(name: string, countrySlug?: string): Promise<string | null> {
    // If we have country, search there. Otherwise it's harder because we can't fetch all cities.
    if (countrySlug) {
        const cities = await this.getCities(countrySlug);
        const normalized = name.toLowerCase().trim();
        const matched = cities.find(c => 
          c.label_es?.toLowerCase() === normalized || 
          c.label_en?.toLowerCase() === normalized || 
          c.slug?.toLowerCase() === normalized
        );
        return matched ? matched.slug : null;
    }
    return null;
  }
}

export const inventoryCache = new InventoryCache();
