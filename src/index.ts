import express from "express";
import cors from "cors";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer, TOOLS } from "./server.js";
import { config } from "./config.js";

const app = express();
app.use(cors());

// Healthcheck endpoint for Cloud Run
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    version: "3.0.0",
    tools: TOOLS.map((t: any) => t.name),
  });
});

// MCP JSON-RPC endpoint (Stateless/Sessionless mode for HTTP)
app.post("/mcp", async (req, res) => {
  try {
    const mcpServer = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined as any, // stateless mode for simple tool execution
    });
    
    // Connect MCP server to the Streamable transport
    await mcpServer.connect(transport as any);
    
    // Handle the specific HTTP request within MCP transport logic
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

// Start listening
app.listen(config.PORT, () => {
  console.log(`🚀 Yourttoo MCP Server v3.0.0 (Node.js 20)`);
  console.log(`🌍 Environment: ${config.NODE_ENV}`);
  console.log(`🔗 Endpoint: http://localhost:${config.PORT}/mcp`);
  console.log(`✅ Health: http://localhost:${config.PORT}/health`);
  console.log(`🛠️ Tools registered: ${TOOLS.map((t: any) => t.name).join(", ")}`);
});
