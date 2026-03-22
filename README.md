# Yourttoo MCP Server

Model Context Protocol (MCP) server for Yourttoo API - Travel packages and circuits distribution.

## Overview

This MCP server exposes Yourttoo's travel inventory through 5 tools that can be consumed by any MCP client (Notion AI, Claude Desktop, Cursor, etc.).

## Features

- **search_programs**: Search travel circuits with filters (destination, price, duration, tags)
- **get_program_detail**: Get complete program details (itinerary, hotels, meals, included services)
- **check_availability**: Check availability and pricing for specific dates
- **get_inventory**: List available destinations (countries, cities, providers, tags)
- **get_booking**: Get booking details by locator

## Requirements

- Node.js 20+
- Yourttoo API credentials (userid + accessToken)

## Installation

```bash
npm install
```

Create a `.env` file with your Yourttoo credentials:

```env
YOURTTOO_API_URL=https://www.yourttoo.com
# Opcional: https://api.yourttoo.com para la API B2B v2 (si está habilitada)
YOURTTOO_EMAIL=info@safetour.es
YOURTTOO_PASSWORD=S4f3t0ur
PORT=8080
```

> [!NOTE]
> El MCP ha sido actualizado con un flujo de autenticación proactivo que captura las cookies de sesión del endpoint `/auth/login`. Ya no es necesario setear el `accessToken` manualmente en el `.env`.

### ⚠️ Estado del Servicio
Actualmente el servicio está funcional pero los datos están bloqueados por Yourttoo. La cuenta requiere autorización manual para habilitar el acceso a la API B2B.
- **Acceso API B2B**: `api.yourttoo.com` devuelve *"Your account has not been authorized yet..."*.
- **Acceso API Interna**: `www.yourttoo.com` devuelve *"Error en BACK.PROCESS"*.

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Run Production

```bash
npm start
```

## Docker

```bash
docker-compose up --build
```

## Deployment to Google Cloud Run

```bash
# Build and push to GCR
gcloud builds submit --tag gcr.io/PROJECT_ID/yourttoo-mcp

# Deploy to Cloud Run
gcloud run deploy yourttoo-mcp \
  --image gcr.io/PROJECT_ID/yourttoo-mcp \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars YOURTTOO_AGENCY_CODE=...,YOURTTOO_ACCESS_TOKEN=...
```

## MCP Client Configuration

### Claude Desktop

```json
{
  "mcpServers": {
    "yourttoo": {
      "command": "npx",
      "args": ["-y", "yourttoo-mcp@latest"],
      "env": {
        "YOURTTOO_AGENCY_CODE": "your_userid",
        "YOURTTOO_ACCESS_TOKEN": "your_token"
      }
    }
  }
}
```

### Notion AI / Remote MCP

```
URL: https://yourttoo-mcp-xxxx.run.app/mcp
Protocol: Streamable HTTP
```

## License

MIT