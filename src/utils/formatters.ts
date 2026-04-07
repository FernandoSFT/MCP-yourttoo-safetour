/**
 * Formats numbers into currency strings.
 */
export function formatPrice(price: number | string, currency: string = "€"): string {
    const num = typeof price === "string" ? parseFloat(price) : price;
    if (isNaN(num)) return "N/D";
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: currency === "EUR" ? "EUR" : "EUR",
    }).format(num).replace(",00", "");
}

/**
 * Formats dates to a readable Spanish format.
 */
export function formatDate(dateStr: string): string {
    if (!dateStr) return "N/D";
    try {
        const parts = dateStr.split("/");
        if (parts.length === 3 && parts[0] !== undefined && parts[1] !== undefined && parts[2] !== undefined) {
            const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            return date.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
        }
        return dateStr;
    } catch {
        return dateStr;
    }
}

/**
 * Summarizes the 'included' object for programs.
 */
export function summarizeIncluded(included: any): string {
    if (!included) return "No especificado";
    const features = [];
    if (included.arrivaltransfer || included.arrivalp) features.push("Transfer entrada ✓");
    if (included.departuretransfer || included.departurep) features.push("Transfer salida ✓");
    if (included.tourescort) features.push(`Guía: ${included.tourescort} ✓`);
    if (included.meals) features.push(`Comidas: ${included.meals} ✓`);
    return features.length > 0 ? features.join(" | ") : "Servicios estándar incluidos";
}
