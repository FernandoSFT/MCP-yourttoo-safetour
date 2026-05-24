import { formatPrice } from "../utils/formatters.js";

type UnknownRecord = Record<string, unknown>;

export type NormalizedDeparture = {
  date: string;
  label: string;
  minPrice?: number;
  currency: string;
};

export type NormalizedAvailabilityDay = {
  date: string;
  label: string;
  state: string;
  stateLabel: string;
  single?: number;
  double?: number;
  triple?: number;
};

export type NormalizedProgram = {
  code: string;
  title: string;
  description?: string;
  brief?: string;
  categoryName?: string;
  providerName: string;
  minPrice?: number;
  currency: string;
  days?: number;
  minPax?: number;
  includedSummary: string;
  nextDepartures: NormalizedDeparture[];
};

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function getArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function monthToNumber(month: unknown): number | undefined {
  const monthText = asString(month)?.toLowerCase();
  if (!monthText) return undefined;
  return MONTHS[monthText];
}

function buildIsoDate(year: unknown, month: unknown, day: unknown): string | undefined {
  const y = asNumber(year);
  const m = monthToNumber(month);
  const d = asNumber(day);
  if (y === undefined || m === undefined || d === undefined) return undefined;
  return new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
}

export function formatDisplayDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function stateLabel(state: unknown): string {
  const value = asString(state)?.toLowerCase();
  if (value === "available") return "disponible";
  if (value === "onrequest") return "bajo petición";
  if (value === "closed") return "cerrado";
  if (value === "soldout") return "sin plazas";
  return value || "consultar";
}

export function getProgramDays(program: unknown): number | undefined {
  if (!isRecord(program)) return undefined;
  const itinerary = getArray(program.itinerary);
  if (itinerary.length > 0) return itinerary.length;
  return asNumber(program.days) ?? asNumber(program.duration);
}

export function getProviderName(program: unknown): string {
  if (!isRecord(program)) return "YTT";
  const direct = asString(program.providername);
  if (direct) return direct;
  if (isRecord(program.provider)) {
    return (
      asString(program.provider.name) ??
      asString(program.provider.title) ??
      asString(program.provider.code) ??
      "YTT"
    );
  }
  return "YTT";
}

function activeLanguages(value: unknown): string[] {
  if (!isRecord(value)) return [];
  const labels: Array<[string, string]> = [
    ["spanish", "español"],
    ["english", "inglés"],
    ["french", "francés"],
    ["german", "alemán"],
    ["italian", "italiano"],
    ["portuguese", "portugués"],
  ];
  return labels.filter(([key]) => asBoolean(value[key])).map(([, label]) => label);
}

export function summarizeIncludedSafe(included: unknown): string {
  if (!isRecord(included)) return "Incluidos no informados";

  const features: string[] = [];
  const arrivalTransfer = included.arrivaltransfer;
  if (isRecord(arrivalTransfer) && asBoolean(arrivalTransfer.included)) {
    features.push("transfer entrada");
  }

  const departureTransfer = included.departuretransfer;
  if (isRecord(departureTransfer) && asBoolean(departureTransfer.included)) {
    features.push("transfer salida");
  }

  const tourEscort = included.tourescort;
  if (isRecord(tourEscort) && asBoolean(tourEscort.included)) {
    const languages = activeLanguages(tourEscort);
    features.push(languages.length > 0 ? `guía acompañante (${languages.join(", ")})` : "guía acompañante");
  }

  const driverGuide = included.driverguide;
  if (isRecord(driverGuide) && asBoolean(driverGuide.included)) {
    const languages = activeLanguages(driverGuide);
    features.push(languages.length > 0 ? `guía conductor (${languages.join(", ")})` : "guía conductor");
  }

  const accommodation = included.accomodation;
  if (isRecord(accommodation)) {
    const meals: string[] = [];
    const breakfast = accommodation.breakfast;
    if (isRecord(breakfast) && asBoolean(breakfast.included)) meals.push("desayuno");
    const lunch = accommodation.lunch;
    if (isRecord(lunch) && asBoolean(lunch.included)) meals.push("almuerzo");
    const dinner = accommodation.dinner;
    if (isRecord(dinner) && asBoolean(dinner.included)) meals.push("cena");
    const allIncluded = accommodation.allincluded;
    if (isRecord(allIncluded) && asBoolean(allIncluded.included)) meals.push("todo incluido");
    if (meals.length > 0) features.push(meals.join(" + "));
  }

  return features.length > 0 ? features.join(" · ") : "servicios estándar incluidos";
}

export function normalizePricesByMonth(program: unknown, limit = 5): NormalizedDeparture[] {
  if (!isRecord(program)) return [];
  return getArray(program.pricesbymonth)
    .map((item): NormalizedDeparture | undefined => {
      if (!isRecord(item)) return undefined;
      const isoDate = asString(item.date)?.slice(0, 10) ?? buildIsoDate(item.year, item.month, item.day);
      if (!isoDate) return undefined;
      const minPrice = asNumber(item.minprice);
      const currency = asString(item.currency) ?? asString(program.currency) ?? "EUR";
      const departure: NormalizedDeparture = {
        date: isoDate,
        label: formatDisplayDate(isoDate),
        currency,
      };
      if (minPrice !== undefined) departure.minPrice = minPrice;
      return departure;
    })
    .filter((item): item is NormalizedDeparture => Boolean(item))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

export function normalizeAvailability(program: unknown, limit = 10): NormalizedAvailabilityDay[] {
  if (!isRecord(program)) return [];
  const result: NormalizedAvailabilityDay[] = [];

  for (const yearBlock of getArray(program.availability)) {
    if (!isRecord(yearBlock)) continue;
    for (const monthBlock of getArray(yearBlock.months)) {
      if (!isRecord(monthBlock)) continue;
      for (const dayBlock of getArray(monthBlock.days)) {
        if (!isRecord(dayBlock)) continue;
        const isoDate = buildIsoDate(yearBlock.year, monthBlock.month, dayBlock.day);
        if (!isoDate) continue;
        const normalized: NormalizedAvailabilityDay = {
          date: isoDate,
          label: formatDisplayDate(isoDate),
          state: asString(dayBlock.state) ?? "unknown",
          stateLabel: stateLabel(dayBlock.state),
        };
        const single = asNumber(dayBlock.single);
        const double = asNumber(dayBlock.double);
        const triple = asNumber(dayBlock.triple);
        if (single !== undefined) normalized.single = single;
        if (double !== undefined) normalized.double = double;
        if (triple !== undefined) normalized.triple = triple;
        result.push(normalized);
      }
    }
  }

  return result.sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit);
}

export function summarizeItinerary(program: unknown, limit = 7): string[] {
  if (!isRecord(program)) return [];
  return getArray(program.itinerary)
    .slice(0, limit)
    .map((day, index): string => {
      if (!isRecord(day)) return `Día ${index + 1}: etapa no informada`;
      const dayNumber = asNumber(day.dayNumber) ?? index + 1;
      const sleep = isRecord(day.sleep) ? asString(day.sleep.city) : undefined;
      const hotel = isRecord(day.hotel)
        ? asString(day.hotel.name) ?? asString(day.hotel.title)
        : asString(day.hotel);
      const description = asString(day.description);
      const parts = [sleep, hotel, description].filter((part): part is string => Boolean(part));
      return `Día ${dayNumber}: ${parts.length > 0 ? parts.join(" · ") : "estancia"}`;
    });
}

export function normalizeProgram(program: unknown): NormalizedProgram {
  if (!isRecord(program)) {
    return {
      code: "N/D",
      title: "Programa sin datos",
      providerName: "YTT",
      currency: "EUR",
      includedSummary: "Incluidos no informados",
      nextDepartures: [],
    };
  }

  const normalized: NormalizedProgram = {
    code: asString(program.code) ?? "N/D",
    title: asString(program.title) ?? "Programa sin título",
    providerName: getProviderName(program),
    currency: asString(program.currency) ?? "EUR",
    includedSummary: summarizeIncludedSafe(program.included),
    nextDepartures: normalizePricesByMonth(program, 5),
  };

  const description = asString(program.description);
  if (description) normalized.description = description;
  const brief = asString(program.brief);
  if (brief) normalized.brief = brief;
  const categoryName = asString(program.categoryname);
  if (categoryName) normalized.categoryName = categoryName;
  const minPrice = asNumber(program.minprice);
  if (minPrice !== undefined) normalized.minPrice = minPrice;
  const days = getProgramDays(program);
  if (days !== undefined) normalized.days = days;
  const minPax = asNumber(program.minpaxoperation);
  if (minPax !== undefined) normalized.minPax = minPax;

  return normalized;
}

export function formatDepartureList(departures: NormalizedDeparture[], limit = 3): string {
  if (departures.length === 0) return "Sin salidas informadas";
  return departures
    .slice(0, limit)
    .map((departure) => {
      const price = departure.minPrice !== undefined ? ` · desde ${formatPrice(departure.minPrice, departure.currency)}` : "";
      return `- ${departure.label}${price}`;
    })
    .join("\n");
}
