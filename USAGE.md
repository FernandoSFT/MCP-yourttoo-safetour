# Guía de Uso: MCP Yourttoo en Cloud Run

¡Felicidades! Tu servidor **Model Context Protocol (MCP)** para Yourttoo se encuentra alojado en Google Cloud Run. Al estar en la nube, funciona como un cerebro portátil: cualquier agente de Inteligencia Artificial que se conecte a él, aprenderá instantáneamente a buscar, reservar y procesar paquetes turísticos empleando tu API sin que tú le enseñes cómo.

## 1. Localizar tu Endpoint (URL)

A diferencia de un servidor local (que usa la entrada y salida de consola estándar `stdio`), tu servidor en Cloud Run está exponiendo su conocimiento vía web usando el protocolo avanzado **Server-Sent Events (SSE)**. 
Para poder "enchufarle" una IA, lo único que vas a necesitar es la URL pública que te ha generado Google terminada en `/sse`.

> Ejemplo de cómo se ve tu endpoint:
> `https://mcp-yourttoo-abcd123-ew.a.run.app/sse`
> *(Podrás encontrar el tuyo exacto dentro de los logs del despliegue en la pestaña 'Actions' de tu repositorio Github)*.

---

## 2. Forma de Uso A: En herramientas "No-Code" e IDEs (Ej: Cursor IDE)

Muchos clientes modernos (como Cursor, LibreChat o tu agente de Notion) tienen soporte oficial para conectarse a servidores remotos MCP leyendo un simple enlace. 

**Ejemplo si usas Cursor IDE (o similar):**
1. Abre los "Cursor Settings" (el engranaje).
2. Ve a la pestaña **Features** y busca la sección **MCP Servers**.
3. Haz clic en **+ Add new MCP Server**.
4. Rellena los datos clave:
   - **Name**: `Yourttoo API`
   - **Type**: Selecciona la opción **`sse`** *(esto es importantísimo, no elijas command).*
   - **URL**: Pega tu URL de Cloud Run (`https://...run.app/sse`).
5. Pulsa el botón de Guardar. 

El indicador se pondrá verde (`Connected`). A partir de ese segundo, la IA del editor puede descubrir viajes en tu base de datos y usarlos como contexto para cualquier tarea que le pidas.

---

## 3. Forma de Uso B: Uso Programático (Tu propio código Python / Node.js)

Si tu objetivo es crear un "agente viajero" propio por código (por ejemplo en Python o TypeScript con LangChain o Gemini), el flujo es conectarse mediante el cliente base.

### Ejemplo oficial en TypeScript (Node.js)

Si no lo tienes, en tu proyecto cliente debes instalar el SDK:
```bash
npm install @modelcontextprotocol/sdk
```

Luego invoca a tu robot remoto así:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

async function runTravelAgent() {
  // 1. Apuntamos al endpoint SSE remoto
  const transport = new SSEClientTransport(
    new URL("https://TU-URL-DE-CLOUD-RUN.run.app/sse")
  );

  // 2. Instanciamos tu propio Agente Cliente
  const client = new Client(
    { name: "agente-frontoffice", version: "1.0.0" },
    { capabilities: {} }
  );

  // 3. Establecemos conexión con el cerebro Cloud Run
  await client.connect(transport);
  console.log("¡Conexión remota con Yourttoo establecida!");

  // 4. (Opcional) Podemos pedirle al MCP que nos diga qué sabe hacer
  const { tools } = await client.listTools();
  console.log("Herramientas descubiertas remotamente:");
  tools.forEach(t => console.log(t.name, "-", t.description));

  // 5. Ordenamos al MCP ejecutar una acción real
  console.log("Realizando petición cruzada a España...");
  const resultado = await client.callTool({
    name: "search_programs",
    arguments: {
      countries: ["es"],     // Buscar en España
      mindays: 3,            // Mínimo de duración
      maxresults: 5          // No queremos saturar, dame 5
    }
  });

  // 6. ¡Extraemos el resultado devuelto!
  console.log("Viajes encontrados:", JSON.parse(resultado.content[0].text));
}

runTravelAgent();
```

---

## 4. ¿De qué herramientas (Tools) consta ahora mismo el servidor?

Al estudiar tu `Roadmap`, he dotado a tu sistema de las 3 habilidades esenciales iniciales. Da igual qué cliente uses, tu servidor Cloud Run responderá a estas llamadas inyectando de forma invisible tus credenciales seguras (Email y Password) en cabecera para hablar con el API real de Yourttoo (`https://api.yourttoo.com`):

### 🌍 1. `get_inventory`
* **Misión**: Localizar qué destinos o configuraciones hay guardadas.
* **Argumento fundamental**: `resource_type`. La IA deberá enviar obligatoriamente uno de estos strings: `"countries"`, `"cities"`, `"providers"`, o `"tags"`.

### 🔎 2. `search_programs`
* **Misión**: El buscador core. Permite cruzar infinitos parámetros para localizar el viaje exacto para un cliente.
* **Filtros programados**: `countries` (array), `cities` (array), `tags` (array), `providers` (array), numéricos como `pricemin`, `pricemax`, `mindays`, `maxdays` y paginación con `page`.

### 📖 3. `fetch_program`
* **Misión**: Cuando la herramienta 2 encuentre un viaje interesante, esta herramienta se utiliza para bajarse "todo el libro", sacando el detalle extendido del código exacto del viaje.
* **Argumento fundamental**: `code` (string con el ID de viaje).

El bloque ya está preparado para la acción y totalmente expuesto sin preocuparte de cuellos de botella de red en tu casa. ¡Haz la primera prueba enganchándolo a un cliente local!
