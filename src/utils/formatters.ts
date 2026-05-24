/**
 * Formats numbers into currency strings.
 */
export function formatPrice(price: number | string | undefined, currency: string = "EUR"): string {
    if (price === undefined || price === null) return "N/D";
    const num = typeof price === "string" ? parseFloat(price) : price;
    if (isNaN(num)) return "N/D";
    const normalizedCurrency = currency === "€" ? "EUR" : currency;
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: normalizedCurrency || "EUR",
    }).format(num).replace(",00", "");
}

/**
 * Formats dates to a readable Spanish format.
 * Supports YYYY/MM/DD, YYYY-MM-DD and ISO strings.
 */
export function formatDate(dateStr: string): string {
    if (!dateStr) return "N/D";
    try {
        const slashParts = dateStr.split("/");
        if (slashParts.length === 3 && slashParts[0] !== undefined && slashParts[1] !== undefined && slashParts[2] !== undefined) {
            const date = new Date(Date.UTC(parseInt(slashParts[0]), parseInt(slashParts[1]) - 1, parseInt(slashParts[2])));
            return date.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
        }
        const date = new Date(dateStr);
        if (!Number.isNaN(date.getTime())) {
            return date.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
        }
        return dateStr;
    } catch {
        return dateStr;
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function bool(value: unknown): boolean {
    return value === true;
}

/**
 * Summarizes the 'included' object for programs without leaking [object Object].
 */
export function summarizeIncluded(included: unknown): string {
    if (!isRecord(included)) return "No especificado";
    const features: string[] = [];
    const arrival = included.arrivaltransfer;
    if (isRecord(arrival) && bool(arrival.included)) features.push("Transfer entrada ✓");
    const departure = included.departuretransfer;
    if (isRecord(departure) && bool(departure.included)) features.push("Transfer salida ✓");
    const escort = included.tourescort;
    if (isRecord(escort) && bool(escort.included)) {
        const langs = [
            ["spanish", "ES"],
            ["english", "EN"],
            ["french", "FR"],
            ["german", "DE"],
            ["italian", "IT"],
            ["portuguese", "PT"],
        ].filter(([key]) => escort[key] === true).map(([, label]) => label);
        features.push(langs.length > 0 ? `Guía ${langs.join("/")} ✓` : "Guía ✓");
    }
    return features.length > 0 ? features.join(" | ") : "Servicios estándar incluidos";
}
