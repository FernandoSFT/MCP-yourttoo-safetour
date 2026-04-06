import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const API_BASE_URL = "https://api.yourttoo.com/apiv2";
const EMAIL = process.env.YOURTTOO_EMAIL;
const PASSWORD = process.env.YOURTTOO_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("Error: YOURTTOO_EMAIL and YOURTTOO_PASSWORD must be defined in the .env file.");
  process.exit(1);
}

// Auth state
let currentAuth: { userid: string; accessToken: string } | null = null;

// Authenticate and get token
async function authenticate(forceRefresh = false) {
  if (currentAuth && !forceRefresh) return currentAuth;

  try {
    const response = await axios.post(`${API_BASE_URL}/auth`, {
      email: EMAIL,
      password: PASSWORD,
    });
    if (response.data && response.data.userid && response.data.accessToken) {
      currentAuth = response.data;
      return currentAuth;
    } else {
      throw new Error("Invalid response format from /auth");
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.message;
    console.error("Authentication failed:", errorMsg);
    throw new Error(`Authentication failed: ${errorMsg}`);
  }
}

// Helper to make API requests with automatic authentication
async function apiPost(endpoint: string, payload: any = {}): Promise<any> {
  const auth = await authenticate();
  try {
    const response = await axios.post(`https://api.yourttoo.com${endpoint}`, payload, {
      headers: {
        "userid": auth?.userid,
        "accesstoken": auth?.accessToken,
        "Content-Type": "application/json"
      }
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token might be expired, retry once
      const refreshedAuth = await authenticate(true);
      const retryResponse = await axios.post(`https://api.yourttoo.com${endpoint}`, payload, {
        headers: {
          "userid": refreshedAuth?.userid,
          "accesstoken": refreshedAuth?.accessToken,
          "Content-Type": "application/json"
        }
      });
      return retryResponse.data;
    }
    throw error;
  }
}

// Initialize MCP Server
const server = new Server(
  {
    name: "yourttoo-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_inventory",
        description: "Obtener inventario base de países, ciudades, agencias (providers) o etiquetas (tags).",
        inputSchema: {
          type: "object",
          properties: {
            resource_type: {
              type: "string",
              enum: ["countries", "cities", "providers", "tags"],
              description: "El tipo de recurso de inventario a obtener."
            }
          },
          required: ["resource_type"]
        }
      },
      {
        name: "search_programs",
        description: "Buscar programas turísticos mediante filtros (país, ciudad, duración, precio, etc.).",
        inputSchema: {
          type: "object",
          properties: {
            countries: { type: "array", items: { type: "string" }, description: "Ej: ['tr', 'es']" },
            cities: { type: "array", items: { type: "string" }, description: "Ej: ['antakya-tr']" },
            tags: { type: "array", items: { type: "string" } },
            providers: { type: "array", items: { type: "string" } },
            pricemin: { type: "number" },
            pricemax: { type: "number" },
            mindays: { type: "number" },
            maxdays: { type: "number" },
            maxresults: { type: "number", default: 10, description: "Max 100" },
            page: { type: "number", default: 0 }
          }
        }
      },
      {
        name: "fetch_program",
        description: "Descargar detalle de un programa.",
        inputSchema: {
          type: "object",
          properties: {
            type: { type: "string", description: "Tipo (ej: 'program')" },
            code: { type: "string", description: "Código del programa" }
          },
          required: ["type", "code"]
        }
      }
    ]
  };
});

// Tool Handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (request.params.name === "get_inventory") {
      const type = String(request.params.arguments?.resource_type);
      // Ensure endpoint starts with /apiv2/
      const data = await apiPost(`/apiv2/find`, { type });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
      };
    }

    if (request.params.name === "search_programs") {
      const args = request.params.arguments || {};
      const payload: any = { filter: {} };
      
      // Map arguments to filter payload
      if (args.countries) payload.filter.countries = args.countries;
      if (args.cities) payload.filter.cities = args.cities;
      if (args.tags) payload.filter.tags = args.tags;
      if (args.providers) payload.filter.providers = args.providers;
      if (args.pricemin) payload.filter.pricemin = args.pricemin;
      if (args.pricemax) payload.filter.pricemax = args.pricemax;
      if (args.mindays) payload.filter.mindays = args.mindays;
      if (args.maxdays) payload.filter.maxdays = args.maxdays;
      payload.filter.maxresults = args.maxresults || 20;
      payload.filter.page = args.page || 0;

      const data = await apiPost(`/apiv2/search`, payload);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
      };
    }

    if (request.params.name === "fetch_program") {
      const { type, code } = request.params.arguments as any;
      const data = await apiPost(`/apiv2/fetch`, { type, code });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
      };
    }

    throw new Error(`Unknown tool: ${request.params.name}`);
  } catch (error: any) {
    const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    return {
      isError: true,
      content: [{ type: "text", text: `Error calling Yourttoo API: ${errorMsg}` }]
    };
  }
});

// Start Server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Yourttoo MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error starting server:", error);
  process.exit(1);
});
