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
import { debugProgramShape } from "./tools/debugProgramShape.js";

export const TOOLS = [
  {
    name: "search_programs",
    description: "Busca programas Yourttoo con salida compacta. Filtra por destino, precio, duración y perfil; devuelve las mejores opciones.",
    inputSchema: {
      type: "object",
      properties: {
        destination: { type: "string", description: "País o ciudad, ej. Japón o Tokio." },
        cities: { type: "array", items: { type: "string" }, description: "Ciudades concretas." },
        tags: { type: "array", items: { type: "string" }, description: "Tags/intereses." },
        providers: { type: "array", items: { type: "string" }, description: "Códigos de proveedor." },
        min_price: { type: "number", description: "Precio mínimo por persona." },
        max_price: { type: "number", description: "Precio máximo por persona." },
        min_days: { type: "number", description: "Duración mínima en días." },
        max_days: { type: "number", description: "Duración máxima en días." },
        limit: { type: "number", default: 3, description: "Resultados a mostrar (1-5)." },
        page: { type: "number", default: 0, description: "Página de resultados." },
        program_name: { type: "string", description: "Texto en título." },
        category: { type: "string", description: "Categoría exacta." },
        traveler_type: { type: "string", description: "Perfil/interés del viajero." },
      },
    },
  },
  {
    name: "get_program_detail",
    description: "Obtiene detalle compacto de un programa. Usa summary por defecto; itinerary/availability solo si hace falta ampliar.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Código del programa." },
        detail_level: {
          type: "string",
          enum: ["micro", "summary", "itinerary", "availability", "full"],
          default: "summary",
          description: "Nivel de detalle.",
        },
      },
      required: ["code"],
    },
  },
  {
    name: "check_availability",
    description: "Comprueba disponibilidad real para fecha y acomodación concretas.",
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
    description: "Lista países, ciudades, proveedores o tags. Filtra ciudades con country_filter o search_text.",
    inputSchema: {
      type: "object",
      properties: {
        resource_type: {
          type: "string",
          enum: ["countries", "cities", "providers", "tags"],
          description: "Tipo de recurso.",
        },
        country_filter: { type: "string", description: "Código de país, ej. jp." },
        search_text: { type: "string", description: "Texto para filtrar." },
      },
      required: ["resource_type"],
    },
  },
  {
    name: "compare_programs",
    description: "Compara 2-3 programas en modo compacto; hasta 5 si mode='verbose'.",
    inputSchema: {
      type: "object",
      properties: {
        codes: { type: "array", items: { type: "string" }, description: "Códigos a comparar." },
        client_profile: { type: "string", description: "Perfil para recomendación." },
        mode: { type: "string", enum: ["compact", "verbose"], default: "compact" },
      },
      required: ["codes"],
    },
  },
  {
    name: "get_booking",
    description: "Consulta una reserva existente por localizador.",
    inputSchema: {
      type: "object",
      properties: {
        locator: { type: "string", description: "Localizador de reserva." },
      },
      required: ["locator"],
    },
  },
  {
    name: "debug_program_shape",
    description: "Diagnóstico temporal: estructura resumida de un programa. Solo para depurar normalizadores.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Código del programa a inspeccionar." },
        section: {
          type: "string",
          enum: ["all", "included", "itinerary", "availability", "pricesbymonth", "provider", "categories", "hotels"],
          default: "all",
          description: "Sección concreta a inspeccionar.",
        },
        max_depth: { type: "number", default: 2, description: "Profundidad máxima (máx. 4)." },
        max_array_items: { type: "number", default: 1, description: "Elementos de array a inspeccionar (máx. 3)." },
        include_samples: { type: "boolean", default: false, description: "Incluye muestras de valores." },
        max_chars: { type: "number", default: 2500, description: "Límite de caracteres (máx. 5000)." },
      },
      required: ["code"],
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
        case "debug_program_shape":
          resultText = await debugProgramShape(args);
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
