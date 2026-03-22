# Yourttoo MCP - Estado del Proyecto y Hoja de Ruta

## ✅ Tareas Realizadas

1.  **Arquitectura MCP**: Servidor configurado con `@modelcontextprotocol/sdk` usando el transporte `StreamableHTTPServerTransport` para compatibilidad con Notion AI y otros clientes.
2.  **Tools Implementadas**:
    *   `search_programs`: Búsqueda de circuitos con filtros avanzados.
    *   `get_program_detail`: Obtención de itinerarios, servicios y hoteles.
    *   `check_availability`: Consulta de precios por fecha y tipo de habitación.
    *   `get_inventory`: Maestros de países, ciudades, proveedores y categorías.
    *   `get_booking`: Acceso a detalles de reserva por localizador.
3.  **Refactor de Autenticación**:
    *   Cambiado `/auth` por `/auth/login` para compatibilidad con el sistema web.
    *   Implementada **captura de cookies (`connect.sid`)** necesaria para la API interna.
    *   **Autenticación Proactiva**: El cliente realiza el login automáticamente antes de la primera petición si no tiene sesión válida.
    *   **Manejo de Errores**: Re-autenticación automática al detectar errores 401 o el error 500 específico de Yourttoo (*"sesión caducada"*).
4.  **Despliegue**: Proyecto dockerizado y desplegado en Google Cloud Run.

## 🚧 Bloqueo Actual (Externo)

El proyecto está bloqueado por **permisos en la cuenta de Yourttoo** (`info@safetour.es`).
*   La API oficial v2 (`api.yourttoo.com`) requiere autorización manual de Yourttoo.
*   La API interna web (`www.yourttoo.com/api`) detecta y bloquea peticiones automatizadas aun con cookies válidas.

**Acción Requerida**: Contactar con `agencias@yourttoo.com` para solicitar la habilitación de la API B2B para la cuenta.

## 📋 Tareas Pendientes (Post-Autorización)

1.  **Validación de Datos**: Una vez habilitado el acceso, verificar que los objetos devueltos por la API v2 coinciden con los tipados del MCP.
2.  **Optimización de Búsqueda**: Implementar sistema de resolución de nombres de destino (ej: convertir "Japón" a su ID correspondiente en Yourttoo) usando `get_inventory` como cache interno.
3.  **Refinado de Formato**: Ajustar la salida de las herramientas para que Notion AI las presente de forma atractiva al usuario final.
4.  **Producción**: Realizar el push final al repositorio de GitHub indicado por el cliente.

---
*Documento actualizado el 2026-03-22*
