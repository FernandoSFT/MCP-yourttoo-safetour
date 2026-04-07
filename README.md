# Yourttoo MCP Server v3.0

Servidor MCP (Model Context Protocol) optimizado para la API de Yourttoo. Diseñado específicamente para ser consumido por LLMs (Large Language Models) minimizando el consumo de tokens mediante compresión, resúmenes y filtrado inteligente.

## 🚀 Características principales

- **Optimización de Contexto**: Cada respuesta es procesada para devolver solo los datos esenciales en formato texto legible.
- **Búsqueda Inteligente**: Resolución interna de destinos (ej: "Japón" -> "jp") sin que el LLM necesite conocer los slugs.
- **Filtros Avanzados**: Búsqueda por precio, duración, tags y post-filtrado por categoría o tipo de viajero.
- **Comparativa de Programas**: Herramienta dedicada para comparar hasta 5 programas con recomendación basada en perfil.
- **Cache de Inventario**: Almacenamiento local de países, tags y ciudades para respuestas instantáneas.
- **Auto-Reauth**: Manejo automático de expiración de tokens (401).
- **Seguridad**: Truncado automático de respuestas largas a 4000 caracteres.

## 🛠️ Herramientas (Tools)

1. `search_programs`: Busca circuitos/viajes con filtros potentes. Devuelve los 5 más económicos.
2. `get_program_detail`: Obtiene detalles con 4 niveles de profundidad (summary, itinerary, availability, full).
3. `compare_programs`: Tabla comparativa de 2-5 programas con recomendación personalizada.
4. `check_availability`: Comprueba plazas y precios reales para una fecha y acomodación.
5. `get_inventory`: Explora el catálogo de países, ciudades (filtradas), proveedores y tags.
6. `get_booking`: Consulta el estado y detalle de una reserva existente por localizador.

## 📦 Instalación y Despliegue

### Requisitos
- Node.js 20+
- Docker (para despliegue)

### Configuración
Crea un archivo `.env` basado en `.env.example`:
```bash
YOURTTOO_EMAIL=tu@email.com
YOURTTOO_PASSWORD=tu_password
YOURTTOO_BASE_URL=https://api.yourttoo.com
PORT=8080
```

### Ejecutar en local
```bash
npm install
npm run dev
```

### Despliegue en Cloud Run
El proyecto incluye un `Dockerfile` optimizado para Google Cloud Run.
```bash
gcloud run deploy yourttoo-mcp --source . --env-vars-file .env.yaml
```

## 📂 Estructura del Proyecto

```text
mcp-yourttoo/
├── src/
│   ├── index.ts          # Entry point (Express + MCP Transport)
│   ├── server.ts         # Registro y definición de tools
│   ├── tools/            # Implementación lógica de cada tool
│   ├── api/              # Cliente Yourttoo y Auth
│   ├── cache/            # Inventory Cache (Countries/Cities/Tags)
│   ├── utils/            # Formateadores, Resolvers y Truncado
│   └── config.ts         # Configuración centralizada
├── Dockerfile            # Multi-stage build Node 20
└── package.json
```

## 📝 Notas de Implementación
- Las respuestas de las tools se devuelven como **TEXTO FORMATEADO** (Markdown), no JSON crudo, para ahorrar tokens.
- Las ciudades requieren un filtro de país o texto de búsqueda para evitar volcados masivos.
- El orden de búsqueda es siempre ascendente por precio (cheapest first).