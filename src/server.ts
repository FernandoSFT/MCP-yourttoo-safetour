import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { YourttooClient } from './api/yourttooClient.js';
import { getInventory } from './tools/getInventory.js';
import { searchPrograms } from './tools/searchPrograms.js';
import { getProgramDetail } from './tools/getProgramDetail.js';
import { checkAvailability } from './tools/checkAvailability.js';
import { getBooking } from './tools/getBooking.js';
import { YourttooConfig, config } from './config.js';

/**
 * Esquema común para las credenciales opcionales de agencia.
 * Permite que el MCP trabaje de forma dinámica para diferentes agencias.
 */
const AgencyAuthSchema = z.object({
  email: z.string().optional().describe('Email de la agencia para esta operación específica'),
  password: z.string().optional().describe('Password de la agencia'),
  agency_code: z.string().optional().describe('ID o Código de la agencia (userid)'),
  access_token: z.string().optional().describe('Token de acceso previo (si existe)'),
}).optional();

/**
 * Helper para obtener una instancia del cliente configurada
 */
function createAuthorizedClient(params: any, requestAuth?: Partial<YourttooConfig>): YourttooClient {
  const auth: YourttooConfig = {
    baseUrl: config.yourttoo.baseUrl,
    email: params?._auth?.email || requestAuth?.email || config.yourttoo.email,
    password: params?._auth?.password || requestAuth?.password || config.yourttoo.password,
    userid: params?._auth?.agency_code || requestAuth?.userid || config.yourttoo.userid,
    accessToken: params?._auth?.access_token || requestAuth?.accessToken || config.yourttoo.accessToken,
  };
  return new YourttooClient(auth);
}

/**
 * Crea el servidor MCP con soporte para credenciales dinámicas.
 * @param requestAuth Credenciales por defecto para esta sesión (por ejemplo, desde headers HTTP)
 */
export function createServer(requestAuth?: Partial<YourttooConfig>): McpServer {
  const server = new McpServer({
    name: 'yourttoo-mcp',
    version: '1.0.0',
  });

  server.tool(
    'get_inventory',
    'Obtiene el inventario (países, ciudades, etc.) usando credenciales locales o globales.',
    {
      resource_type: z.enum(['countries', 'cities', 'providers', 'tags']).describe('Tipo de recurso'),
      _auth: AgencyAuthSchema,
    },
    async (params) => {
      const client = createAuthorizedClient(params, requestAuth);
      const result = await getInventory({ resource_type: params.resource_type as any }, client);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'search_programs',
    'Busca programas de viaje de Yourttoo usando credenciales específicas de agencia.',
    {
      destination: z.string().optional().describe('Destino'),
      tags: z.array(z.string()).optional().describe('Categorías'),
      min_price: z.number().optional().describe('Precio min'),
      max_price: z.number().optional().describe('Precio max'),
      min_days: z.number().optional().describe('Días min'),
      max_days: z.number().optional().describe('Días max'),
      providers: z.array(z.string()).optional().describe('Proveedores'),
      page: z.number().optional().describe('Página'),
      max_results: z.number().optional().describe('Resultados por página'),
      _auth: AgencyAuthSchema,
    },
    async (params) => {
      const client = createAuthorizedClient(params, requestAuth);
      const result = await searchPrograms(params as any, client);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_program_detail',
    'Obtiene el detalle de un programa para una agencia específica.',
    {
      code: z.string().describe('Código del programa'),
      _auth: AgencyAuthSchema,
    },
    async (params) => {
      const client = createAuthorizedClient(params, requestAuth);
      const result = await getProgramDetail({ code: params.code }, client);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'check_availability',
    'Consulta disponibilidad en tiempo real para una agencia.',
    {
      code: z.string().describe('Código'),
      day: z.number().describe('Día'),
      month: z.number().describe('Mes'),
      year: z.number().describe('Año'),
      pax: z.number().optional().describe('Pasajeros'),
      _auth: AgencyAuthSchema,
    },
    async (params) => {
      const client = createAuthorizedClient(params, requestAuth);
      const result = await checkAvailability(params as any, client);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_booking',
    'Consulta una reserva usando las claves de la agencia propietaria.',
    {
      locator: z.string().describe('Localizador'),
      _auth: AgencyAuthSchema,
    },
    async (params) => {
      const client = createAuthorizedClient(params, requestAuth);
      const result = await getBooking({ locator: params.locator }, client);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  return server;
}