import { apiPost } from "../api/yourttooClient.js";
import { formatPrice } from "../utils/formatters.js";
import { truncateResponse } from "../utils/truncate.js";
import { resolveDestination, resolveCitySlugs } from "../utils/resolvers.js";

export async function searchPrograms(args: any) {
  const {
    destination,
    cities = [],
    tags = [],
    providers = [],
    min_price,
    max_price,
    min_days,
    max_days,
    page = 0,
    // Post-filters
    program_name,
    category,
    language,
    traveler_type,
  } = args;

  // 1. Resolve destination to slugs
  let resolvedCountry = "";
  let resolvedCities = [...cities];

  if (destination) {
    const res = await resolveDestination(destination);
    if (res.countrySlug) resolvedCountry = res.countrySlug;
    if (res.citySlug && !resolvedCities.includes(res.citySlug)) {
        resolvedCities.push(res.citySlug);
    }
  }

  // 2. Further resolve cities if country is known
  if (resolvedCountry && resolvedCities.length > 0) {
      resolvedCities = await resolveCitySlugs(resolvedCities, resolvedCountry);
  }

  // 3. API Search
  const filter: any = {
    sort: "asc", // Always cheapest first
    maxresults: 30, // Internal buffer for post-filtering
    page: page,
  };

  if (resolvedCountry) filter.countries = [resolvedCountry];
  if (resolvedCities.length > 0) filter.cities = resolvedCities;
  if (tags.length > 0) filter.tags = tags;
  if (providers.length > 0) filter.providers = providers;
  if (min_price != null) filter.pricemin = min_price;
  if (max_price != null) filter.pricemax = max_price;
  if (min_days != null) filter.mindays = min_days;
  if (max_days != null) filter.maxdays = max_days;

  const response = await apiPost("/apiv2/search", { filter });
  let items = Array.isArray(response.items) ? response.items : [];
  const totalFound = response.totalItems || items.length;

  // 4. Server-side post-filtering
  if (program_name) {
    const pn = program_name.toLowerCase();
    items = items.filter((it: any) => it.title?.toLowerCase().includes(pn));
  }

  if (category) {
    const cat = category.toLowerCase();
    items = items.filter((it: any) => it.categoryname?.toLowerCase() === cat);
  }

  // Note: Language and traveler_type filtering would require individual/fetch 
  // which can be slow. For now, we search tags/description if requested.
  if (traveler_type) {
      const type = traveler_type.toLowerCase();
      items = items.filter((it: any) => 
          it.tags?.some((t: any) => t.slug?.toLowerCase().includes(type)) ||
          it.description?.toLowerCase().includes(type)
      );
  }

  // 5. Pick top 5 cheapest from remaining
  const finalItems = items.slice(0, 5);

  // 6. Format response
  if (finalItems.length === 0) {
    return "No se encontraron programas que coincidan con todos los filtros. Intenta ampliar el rango de precio o simplificar los tags.";
  }

  let text = `Encontrados ${totalFound} programas. `;
  if (totalFound > items.length && items.length < 30) {
      text += `Tras aplicar filtros locales (${category || program_name || traveler_type || 'N/A'}), hay ${items.length} disponibles. `;
  }
  text += `Mostrando los 5 más económicos:\n\n`;

  finalItems.forEach((it: any, idx: number) => {
    const priceRange = it.minprice ? `desde ${formatPrice(it.minprice)}/persona` : "Consultar";
    const airports = it.flights && it.flights.length > 0 
        ? `${it.flights[0].departure} → ${it.flights[it.flights.length-1].arrival}` 
        : "No incluye vuelos";
    
    text += `${idx + 1}. ${it.code} | ${it.title} | ${it.categoryname || 'Viaje'} | ${priceRange} | ${it.duration || 'N/D'} días | Guía ES ✓ | Min ${it.minpaxoperation || 2} pax | ${it.providername || 'YTT'}\n`;
  });

  text += `\n💡 Usa compare_programs con los códigos para comparar, o get_program_detail para ver el resumen detallado.`;
  text += `\n[Filtros aplicados: ${destination || ''}, ${tags.join(', ')}]`;

  return truncateResponse(text);
}
