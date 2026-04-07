import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Import tool implementations
import { searchPrograms } from "./tools/searchPrograms.js";
import { getProgramDetail } from "./tools/getProgramDetail.js";
import { checkAvailability } from "./tools/checkAvailability.js";
import { getInventory } from "./tools/getInventory.js";
import { comparePrograms } from "./tools/compare_programs.js";
import { getBooking } from "./tools/getBooking.js";

export const TOOLS = [
  {
    name: "search_programs",
    description: "Busca programas/circuitos de viaje en Yourttoo ordenados por precio (más económicos primero). Devuelve máximo 5 resultados resumidos tras aplicar filtros. Usa los filtros para afinar la búsqueda al perfil del cliente.",
    inputSchema: {
      type: "object",
      properties: {
        destination: { type: "string", description: "País o ciudad. Se resuelve internamente a slug (ej: 'Japón', 'Tokio')." },
        cities: { type: "array", items: { type: "string" }, description: "Ciudades específicas sugeridas (ej: ['antakya-tr'])." },
        tags: { type: "array", items: { type: "string" }, description: "Inspiración (ej: 'cultural', 'aventura', 'short-city-breaks')." },
        providers: { type: "array", items: { type: "string" }, description: "Códigos de proveedores específicos." },
        min_price: { type: "number", description: "Precio mínimo EUR por persona." },
        max_price: { type: "number", description: "Precio máximo EUR por persona." },
        min_days: { type: "number", description: "Duración mínima en días." },
        max_days: { type: "number", description: "Duración máxima en días." },
        page: { type: "number", default: 0, description: "Página de resultados (0-based)." },
        // Post-filters (server-side)
        program_name: { type: "string", description: "Filtrar por texto en el título (ej: 'Crucero')." },
        category: { type: "string", description: "Filtrar por categoría (ej: 'Circuitos', 'Estancias')." },
        traveler_type: { type: "string", description: "Perfil del viajero (ej: 'parejas', 'familias', 'singles')." },
      },
    },
  },
  {
    name: "get_program_detail",
    description: "Obtiene detalle de un programa. Usa detail_level='summary' primero (por defecto). Solo usa 'itinerary' o 'availability' si el usuario pide explícitamente el día a día o fechas exactas.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Código del programa (ej: 'YTTJP-2026')." },
        detail_level: {
          type: "string",
          enum: ["summary", "itinerary", "availability", "full"],
          default: "summary",
          description: "Nivel de detalle de la respuesta.",
        },
      },
      required: ["code"],
    },
  },
  {
    name: "check_availability",
    description: "Comprueba disponibilidad real de un programa para fecha y acomodación concretas.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Código del programa." },
        date: { type: "string", description: "Fecha de inicio (YYYY/MM/DD)." },
        accommodation: {
          type: "string",
          enum: ["single", "double", "triple"],
          default: "double",
        },
      },
      required: ["code", "date"],
    },
  },
  {
    name: "get_inventory",
    description: "Lista países, ciudades, proveedores o tags disponibles. Útil para conocer el catálogo base.",
    inputSchema: {
      type: "object",
      properties: {
        resource_type: {
          type: "string",
          enum: ["countries", "cities", "providers", "tags"],
          description: "Tipo de recurso a obtener.",
        },
        country_filter: { type: "string", description: "Código de país (ej: 'jp') para filtrar ciudades." },
        search_text: { type: "string", description: "Filtrar por texto en el nombre." },
      },
      required: ["resource_type"],
    },
  },
  {
    name: "compare_programs",
    description: "Compara 2-5 programas lado a lado en una tabla. Ideal para ayudar al cliente a elegir.",
    inputSchema: {
      type: "object",
      properties: {
        codes: { type: "array", items: { type: "string" }, description: "Códigos de programas a comparar." },
        client_profile: { type: "string", description: "Perfil del cliente para recibir una recomendación personalizada." },
      },
      required: ["codes"],
    },
  },
  {
    name: "get_booking",
    description: "Consulta el detalle de una reserva existente por su localizador.",
    inputSchema: {
      type: "object",
      properties: {
        locator: { type: "string", description: "Código localizador de la reserva." },
      },
      required: ["locator"],
    },
  },
];

export function createMcpServer() {
  const mcpServer = new Server(
    { name: "yourttoo-mcp-server", version: "3.0.0" },
    { capabilities: { tools: {} } }
  );

  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
      let resultText = "";
      switch (name) {
        case "search_programs":
          resultText = await searchPrograms(args);
          break;
        case "get_program_detail":
          resultText = await getProgramDetail(args);
          break;
        case "check_availability":
          resultText = await checkAvailability(args);
          break;
        case "get_inventory":
          resultText = await getInventory(args);
          break;
        case "compare_programs":
          resultText = await comparePrograms(args);
          break;
        case "get_booking":
          resultText = await getBooking(args);
          break;
        default:
          throw new Error(`Tool unknown: ${name}`);
      }

      return { content: [{ type: "text", text: resultText }] };
    } catch (error: any) {
      console.error(`Error in tool ${name}:`, error);
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${error.message}` }],
      };
    }
  });

  return mcpServer;
}
