# MCP-Yourttoo-v2

## Descripción
Proyecto MCP-Yourttoo-v2 es una implementación basada en el Modelo de Contexto de Protocolo (MCP) para integrar con los servicios de Yourttoo.

## Instalación

```bash
npm install
```

## Uso

### Desarrollo
```bash
npm run start
```

### Producción
```bash
npm run build
npm run start:prod
```

### Pruebas
```bash
npm test
```

## Scripts disponibles

- `npm run start` - Inicia la aplicación en modo desarrollo usando tsx
- `npm run build` - Compila TypeScript a JavaScript
- `npm run start:prod` - Ejecuta la aplicación compilada
- `npm test` - Ejecuta los tests (actualmente solo muestra un mensaje de error)

## Tecnologías utilizadas

- Node.js
- TypeScript
- @modelcontextprotocol/sdk
- Axios
- Dotenv

## Configuración

Copia el archivo `.env.example` a `.env` y configura las variables de entorno necesarias.

## Licencia

ISC