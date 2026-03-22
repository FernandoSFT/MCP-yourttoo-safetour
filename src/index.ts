import express from 'express';
import { createServer } from './server.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { config } from './config.js';

const app = express();
app.use(express.json());

// Logger middleware for Cloud Run observability
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} | ${req.method} ${req.path} | ${res.statusCode} | ${duration}ms`);
  });
  next();
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'yourttoo-mcp'
  });
});

app.post('/mcp', async (req, res) => {
  try {
    // Captura opcional de credenciales desde headers HTTP
    const requestAuth = {
      email: req.headers['x-yourttoo-email'] as string,
      password: req.headers['x-yourttoo-password'] as string,
      userid: req.headers['x-yourttoo-agency-code'] as string,
      accessToken: req.headers['x-yourttoo-access-token'] as string,
    };

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    // Creamos el servidor con las credenciales de la petición si existen
    const server = createServer(requestAuth);
    await server.connect(transport);

    await transport.handleRequest(req, res, req.body);
  } catch (error: any) {
    console.error('❌ MCP Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error.message || 'Internal error',
        },
      });
    }
  }
});

const PORT = config.server.port;
const server = app.listen(PORT, () => {
  console.log(`🚀 Yourttoo MCP Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log('💡 Soporte para credenciales de agencia dinámicas activado.');
});

// Graceful shutdown for Cloud Run
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});