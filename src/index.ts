import express from "express";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import "dotenv/config.js";

const API_BASE_URL = "https://api.yourttoo.com/apiv2";
const EMAIL = process.env.YOURTTOO_EMAIL;
const PASSWORD = process.env.YOURTTOO_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.warn(
    "WARNING: YOURTTOO_EMAIL and YOURTTOO_PASSWORD not defined. Make sure they are provided in Cloud Run environment."
  );
}

// Auth state
let currentAuth: { userid: string; accessToken: string } | null = null;

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

async function apiPost(endpoint: string, payload: any = {}): Promise<any> {
  const auth = await authenticate();
  const url = `https://api.yourttoo.com${endpoint}`;

  const doRequest = async (a: typeof auth) => {
    const response = await axios.post(url, payload, {
      headers: {
        userid: a?.userid,
        accesstoken: a?.accessToken,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  };

  try {
    return await doRequest(auth);
  } catch (error: any) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      const refreshedAuth = await authenticate(true);
      return await doRequest(refreshedAuth);
    }
    throw error;
  }
}

/** Serializa la respuesta de la API de forma segura */
function formatResponse(data: any): string {
  if (data === null || data === undefined || data === "") {
    return "No results found.";
  }
  if (typeof data === "string" && data.trim() === "") {
    return "No results found.";
  }
  return JSON.stringify(data, null, 2);
}

// ──────────────────────────────────────────────
// Tool definitions
// ──────────────────────────────────────────────

const TOOLS = [
  {
    name: "get_inventory",
    description:
      "Obtener inventario base de países (countries), ciudades (cities), agencias (providers) o etiquetas (tags). Usa los valores de estos catálogos como filtros en search_programs.",
    inputSchema: {
      type: "object",
      properties: {
        resource_type: {
          type: "string",
          enum: ["countries", "cities", "providers", "tags"],
          description:
            "Tipo de recurso a obtener. Los valores devueltos se usan como filtros en search_programs.",
        },
      },
      required: ["resource_type"],
    },
  },
  {
    name: "search_programs",
    description:
      "Buscar programas turísticos mediante filtros. Los valores de countries, cities, tags y providers deben obtenerse previamente con get_inventory. IMPORTANTE: countries debe usarse con códigos ISO/slug (ej: 'jp', 'es') obtenidos de get_inventory, no nombres en inglés.",
    inputSchema: {
      type: "object",
      properties: {
        countries: {
          type: "array",
          items: { type: "string" },
          description: "Códigos de país (ej: ['jp', 'es']). Obtener con get_inventory.",
        },
        cities: {
          type: "array",
          items: { type: "string" },
          description: "Slugs de ciudad. Obtener con get_inventory.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags/categorías. Obtener con get_inventory.",
        },
        providers: {
          type: "array",
          items: { type: "string" },
          description: "Códigos de proveedor/agencia. Obtener con get_inventory.",
        },
        pricemin: { type: "number", description: "Precio mínimo." },
        pricemax: { type: "number", description: "Precio máximo." },
        mindays: { type: "number", description: "Duración mínima en días." },
        maxdays: { type: "number", description: "Duración máxima en días." },
        maxresults: {
          type: "number",
          default: 10,
          description: "Máximo de resultados por página (máx. 100).",
        },
        page: { type: "number", default: 0, description: "Página de resultados (empieza en 0)." },
        sort: {
          type: "string",
          enum: ["asc", "desc"],
          default: "asc",
          description: "Orden de resultados.",
        },
      },
    },
  },
  {
    name: "fetch_program",
    description:
      "Descargar el detalle completo de un programa turístico sabiendo su código.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          default: "program",
          description: "Tipo de recurso a descargar. Por defecto: 'program'.",
        },
        code: {
          type: "string",
          description: "Código único del programa.",
        },
      },
      required: ["code"],
    },
  },
  {
    name: "check_availability",
    description:
      "Comprobar disponibilidad de un programa turístico para una fecha y acomodación concretas. Debe hacerse antes de reservar.",
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "Código del programa.",
        },
        date: {
          type: "string",
          description: "Fecha de inicio del programa en formato YYYY/MM/DD.",
        },
        accommodation: {
          type: "string",
          description: "Tipo de acomodación.",
        },
        pax: {
          type: "number",
          description: "Número de personas (pax).",
        },
      },
      required: ["code", "date"],
    },
  },
  {
    name: "book_program",
    description:
      "Crear una reserva para un programa turístico. Requiere haber comprobado disponibilidad previamente con check_availability.",
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "Código del programa a reservar.",
        },
        date: {
          type: "string",
          description: "Fecha de inicio del programa en formato YYYY/MM/DD.",
        },
        accommodation: {
          type: "string",
          description: "Tipo de acomodación seleccionada.",
        },
        pax: {
          type: "number",
          description: "Número de personas.",
        },
        contact: {
          type: "object",
          description: "Datos de contacto del cliente.",
          properties: {
            name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
          },
        },
        extras: {
          type: "object",
          description: "Campos adicionales opcionales según la reserva.",
        },
      },
      required: ["code", "date"],
    },
  },
  {
    name: "cancel_booking",
    description: "Cancelar una reserva existente usando su código de reserva.",
    inputSchema: {
      type: "object",
      properties: {
        booking_code: {
          type: "string",
          description: "Código único de la reserva a cancelar.",
        },
        reason: {
          type: "string",
          description: "Motivo de la cancelación (opcional).",
        },
      },
      required: ["booking_code"],
    },
  },
  {
    name: "fetch_booking",
    description:
      "Obtener los detalles completos de una reserva existente a partir de su código.",
    inputSchema: {
      type: "object",
      properties: {
        booking_code: {
          type: "string",
          description: "Código único de la reserva.",
        },
      },
      required: ["booking_code"],
    },
  },
];

// ──────────────────────────────────────────────
// MCP Server factory
// ──────────────────────────────────────────────

function createMcpServer() {
  const mcpServer = new Server(
    { name: "yourttoo-mcp-server", version: "2.0.0" },
    { capabilities: { tools: {} } }
  );

  // List tools
  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  // Call tool
  mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
      // ── get_inventory ──────────────────────────
      if (name === "get_inventory") {
        const type = String((args as any).resource_type);
        const data = await apiPost(`/apiv2/find`, { type });
        return { content: [{ type: "text", text: formatResponse(data) }] };
      }

      // ── search_programs ────────────────────────
      if (name === "search_programs") {
        const a = args as any;
        const filter: Record<string, any> = {};
        if (a.countries?.length) filter.countries = a.countries;
        if (a.cities?.length) filter.cities = a.cities;
        if (a.tags?.length) filter.tags = a.tags;
        if (a.providers?.length) filter.providers = a.providers;
        if (a.pricemin != null) filter.pricemin = a.pricemin;
        if (a.pricemax != null) filter.pricemax = a.pricemax;
        if (a.mindays != null) filter.mindays = a.mindays;
        if (a.maxdays != null) filter.maxdays = a.maxdays;
        filter.maxresults = a.maxresults ?? 10;
        filter.page = a.page ?? 0;
        filter.sort = a.sort ?? "asc";

        const data = await apiPost(`/apiv2/search`, { filter });

        // Provide a helpful note when results come back empty
        const formatted = formatResponse(data);
        const note =
          formatted === "No results found."
            ? "\n\nTIP: Ensure country/city/tag values are slugs/codes from get_inventory, not display names."
            : "";

        return { content: [{ type: "text", text: formatted + note }] };
      }

      // ── fetch_program ──────────────────────────
      if (name === "fetch_program") {
        const { type = "program", code } = args as any;
        if (!code) throw new Error("Missing required field: code");
        const data = await apiPost(`/apiv2/fetch`, { type, code });
        return { content: [{ type: "text", text: formatResponse(data) }] };
      }

      // ── check_availability ─────────────────────
      if (name === "check_availability") {
        const { code, date, accommodation, pax } = args as any;
        if (!code || !date) throw new Error("Missing required fields: code, date");
        const payload: any = { code, date };
        if (accommodation) payload.accommodation = accommodation;
        if (pax != null) payload.pax = pax;
        const data = await apiPost(`/apiv2/checkavailability`, payload);
        return { content: [{ type: "text", text: formatResponse(data) }] };
      }

      // ── book_program ───────────────────────────
      if (name === "book_program") {
        const { code, date, accommodation, pax, contact, extras } = args as any;
        if (!code || !date) throw new Error("Missing required fields: code, date");
        const payload: any = { code, date };
        if (accommodation) payload.accommodation = accommodation;
        if (pax != null) payload.pax = pax;
        if (contact) payload.contact = contact;
        if (extras) Object.assign(payload, extras);
        const data = await apiPost(`/apiv2/book`, payload);
        return { content: [{ type: "text", text: formatResponse(data) }] };
      }

      // ── cancel_booking ─────────────────────────
      if (name === "cancel_booking") {
        const { booking_code, reason } = args as any;
        if (!booking_code) throw new Error("Missing required field: booking_code");
        const payload: any = { code: booking_code };
        if (reason) payload.reason = reason;
        const data = await apiPost(`/apiv2/cancel`, payload);
        return { content: [{ type: "text", text: formatResponse(data) }] };
      }

      // ── fetch_booking ──────────────────────────
      if (name === "fetch_booking") {
        const { booking_code } = args as any;
        if (!booking_code) throw new Error("Missing required field: booking_code");
        const data = await apiPost(`/apiv2/fetch`, { type: "booking", code: booking_code });
        return { content: [{ type: "text", text: formatResponse(data) }] };
      }

      throw new Error(`Unknown tool: ${name}`);
    } catch (error: any) {
      const errorMsg = error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;
      console.error(`[tool:${name}] Error:`, errorMsg);
      return {
        isError: true,
        content: [{ type: "text", text: `Error calling Yourttoo API: ${errorMsg}` }],
      };
    }
  });

  return mcpServer;
}

// ──────────────────────────────────────────────
// Express setup
// ──────────────────────────────────────────────

const app = express();
app.use(cors());

// Healthcheck
app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "2.0.0", tools: TOOLS.map((t) => t.name) });
});

// MCP JSON-RPC endpoint (Streamable HTTP, stateless)
app.post("/mcp", async (req, res) => {
  try {
    const mcpServer = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined as any, // stateless mode
    });
    await mcpServer.connect(transport as any);
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error in MCP Transport" });
    }
  }
});

app.get("/mcp", (_req, res) => {
  res.status(405).json({ error: "Method not allowed. Use POST." });
});

app.delete("/mcp", (_req, res) => {
  res.status(405).json({ error: "Method not allowed. Use POST." });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Yourttoo MCP Server v2.0.0 running on port ${PORT}`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`Tools available: ${TOOLS.map((t) => t.name).join(", ")}`);
});
