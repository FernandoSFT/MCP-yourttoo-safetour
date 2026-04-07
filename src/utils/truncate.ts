import { config } from "../config";

/**
 * Truncates long text to prevent exceeding LLM context limits.
 * Adds a helpful note if truncated.
 */
export function truncateResponse(text: string, maxChars: number = config.MAX_RESPONSE_CHARS): string {
  if (text.length <= maxChars) return text;
  
  const truncationNote = "\n\n[... Respuesta truncada por extensión. Usa filtros más específicos o detail_level más bajo.]";
  const limit = maxChars - truncationNote.length;
  
  return text.slice(0, limit) + truncationNote;
}
