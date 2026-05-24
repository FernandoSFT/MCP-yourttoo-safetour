import { apiPost } from "../api/yourttooClient.js";
import { formatPrice } from "../utils/formatters.js";
import { truncateResponse } from "../utils/truncate.js";
import { resolveDestination, resolveCitySlugs } from "../utils/resolvers.js";
import { getProgramDays, getProviderName } from "../normalizers/programNormalizers.js";

function numeric(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

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
    limit = 3,
    // Post-filters
    program_name,
    category,
    traveler_type,
  } = args;

  let resolvedCountry = "";
  let resolvedCities = Array.isArray(cities) ? [...cities] : [];

  if (destination) {
    const res = await resolveDestination(destination);
    if (res.countrySlug) resolvedCountry = res.countrySlug;
    if (res.citySlug && !resolvedCities.includes(res.citySlug)) {
      resolvedCities.push(res.citySlug);
    }
  }

  if (resolvedCountry && resolvedCities.length > 0) {
    resolvedCities = await resolveCitySlugs(resolvedCities, resolvedCountry);
  }

  const requestedLimit = Math.min(Math.max(Number(limit) || 3, 1), 5);
  const filter: any = {
    sort: "asc",
    maxresults: 30,
    page,
  };

  if (resolvedCountry) filter.countries = [resolvedCountry];
  if (resolvedCities.length > 0) filter.cities = resolvedCities;
  if (Array.isArray(tags) && tags.length > 0) filter.tags = tags;
  if (Array.isArray(providers) && providers.length > 0) filter.providers = providers;
  if (min_price != null) filter.pricemin = min_price;
  if (max_price != null) filter.pricemax = max_price;
  if (min_days != null) filter.mindays = min_days;
  if (max_days != null) filter.maxdays = max_days;

  const response = await apiPost("/apiv2/search", { filter });
  let items = Array.isArray(response.items) ? response.items : [];
  const totalFound = response.totalItems || items.length;
  const beforeLocalFilters = items.length;

  const minPrice = numeric(min_price);
  const maxPrice = numeric(max_price);
  const minDays = numeric(min_days);
  const maxDays = numeric(max_days);

  items = items.filter((it: any) => {
    const price = numeric(it.minprice);
    if (minPrice !== undefined && price !== undefined && price < minPrice) return false;
    if (maxPrice !== undefined && price !== undefined && price > maxPrice) return false;

    const days = getProgramDays(it);
    if (days !== undefined) {
      if (minDays !== undefined && days < minDays) return false;
      if (maxDays !== undefined && days > maxDays) return false;
    }
    return true;
  });

  if (program_name) {
    const pn = String(program_name).toLowerCase();
    items = items.filter((it: any) => text(it.title)?.toLowerCase().includes(pn));
  }

  if (category) {
    const cat = String(category).toLowerCase();
    items = items.filter((it: any) => text(it.categoryname)?.toLowerCase() === cat);
  }

  if (traveler_type) {
    const type = String(traveler_type).toLowerCase();
    items = items.filter((it: any) =>
      it.tags?.some((t: any) => text(t.slug)?.toLowerCase().includes(type) || text(t.label_es)?.toLowerCase().includes(type)) ||
      text(it.description)?.toLowerCase().includes(type) ||
      text(it.title)?.toLowerCase().includes(type)
    );
  }

  items.sort((a: any, b: any) => (numeric(a.minprice) ?? Number.MAX_SAFE_INTEGER) - (numeric(b.minprice) ?? Number.MAX_SAFE_INTEGER));
  const finalItems = items.slice(0, requestedLimit);

  if (finalItems.length === 0) {
    return "No se encontraron programas que coincidan con los filtros. Amplía precio/duración o simplifica destino/tags.";
  }

  const discarded = beforeLocalFilters - items.length;
  const lines: string[] = [];
  lines.push(`Encontrados ${totalFound} programas. Mostrando ${finalItems.length} mejores opciones filtradas:`);
  if (discarded > 0) lines.push(`(${discarded} descartados por filtros locales de precio/duración/perfil)`);
  lines.push("");

  finalItems.forEach((it: any, idx: number) => {
    const price = numeric(it.minprice);
    const days = getProgramDays(it);
    const provider = getProviderName(it);
    const categoryLabel = text(it.categoryname) ?? "Viaje";
    const minPax = numeric(it.minpaxoperation) ?? 2;
    lines.push(`${idx + 1}. ${it.code} · ${it.title} · ${categoryLabel} · ${price !== undefined ? `desde ${formatPrice(price)}/persona` : "precio a consultar"} · ${days !== undefined ? `${days} días` : "duración no informada"} · Min ${minPax} pax · ${provider}`);
  });

  lines.push("");
  lines.push("Siguiente: usa get_program_detail con 1 código. Para comparar, usa máximo 3 códigos.");

  return truncateResponse(lines.join("\n"), 1400);
}
