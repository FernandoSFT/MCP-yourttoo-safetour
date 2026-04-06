# MCP-Yourttoo-v2

## Descripción
Proyecto MCP-Yourttoo-v2 es una implementación basada en el Modelo de Contexto de Protocolo (MCP) para integrar con los servicios de Yourttoo. Este servidor MCP proporciona herramientas para obtener inventario, buscar programas turísticos y obtener detalles de programas específicos a través de la API de Yourttoo.

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
- Express
- Cors
- Dotenv

## Endpoints disponibles

Este servidor MCP expone las siguientes herramientas:

1. `get_inventory` - Obtener inventario base de países, ciudades, agencias (providers) o etiquetas (tags)
2. `search_programs` - Buscar programas turísticos mediante filtros (país, ciudad, duración, precio, etc.)
3. `fetch_program` - Descargar detalle de un programa específico

## Configuración

Copia el archivo `.env.example` a `.env` y configura las variables de entorno necesarias:

```env
YOURTTOO_EMAIL=tu_email@ejemplo.com
YOURTTOO_PASSWORD=tu_contraseña
```

## Estructura del proyecto

```
src/
  index.ts          # Punto de entrada del servidor MCP
.env.example        # Ejemplo de variables de entorno
.gitignore          # Archivos y directorios a ignorar por git
package.json        # Dependencias y scripts
tsconfig.json       # Configuración de TypeScript
```

## Licencia

ISC