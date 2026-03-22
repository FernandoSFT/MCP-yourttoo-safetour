# Guía de Despliegue Profesional - Yourttoo MCP en Cloud Run

Este documento detalla los pasos para desplegar el servidor MCP en un entorno de producción seguro.

## 📋 Requisitos Previos

1.  **Google Cloud CLI (`gcloud`)** instalado y autenticado.
2.  **Proyecto GCP**: `mcp-yourttoo-safetour` (ID confirmado).
3.  ** billing** activo en la cuenta.

---

## 🔐 Paso 1: Configurar Secretos (Recomendado)

Para evitar exponer contraseñas en variables de entorno visibles, usaremos **Secret Manager**.

```bash
# Habilitar Secret Manager
gcloud services enable secretmanager.googleapis.com

# Crear secretos
echo -n "tu_email@agencia.es" | gcloud secrets create YOURTTOO_EMAIL --data-file=-
echo -n "tu_password_seguro" | gcloud secrets create YOURTTOO_PASSWORD --data-file=-
```

---

## 🛠️ Paso 2: Preparar y Construir

Desde la raíz del proyecto:

```bash
# 1. Configurar el proyecto
gcloud config set project mcp-yourttoo-safetour

# 2. Habilitar APIs necesarias
gcloud services enable run.googleapis.com cloudbuild.googleapis.com

# 3. Construir la imagen optimizada (usa el Dockerfile profesional)
gcloud builds submit --tag gcr.io/mcp-yourttoo-safetour/yourttoo-mcp
```

---

## 🚀 Paso 3: Despliegue en Cloud Run

Ejecuta el siguiente comando para desplegar el servicio. Este comando integra los secretos y expone el puerto 8080.

```bash
gcloud run deploy yourttoo-mcp \
  --image gcr.io/mcp-yourttoo-safetour/yourttoo-mcp \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-secrets "YOURTTOO_EMAIL=YOURTTOO_EMAIL:latest,YOURTTOO_PASSWORD=YOURTTOO_PASSWORD:latest" \
  --set-env-vars "YOURTTOO_API_URL=https://www.yourttoo.com,NODE_ENV=production" \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 5 \
  --timeout 60
```

---

## 🧪 Paso 4: Verificación

Una vez finalizado el despliegue, obtendrás una URL (ej: `https://yourttoo-mcp-xxxx.a.run.app`).

1.  **Health Check**: `curl https://<TU_URL>/health`
    - Debe responder: `{"status":"ok", ...}`
2.  **MCP Endpoint**: `https://<TU_URL>/mcp`
    - Esta es la URL que debes poner en Cursor, Claude Desktop o Notion AI.

---

## 📊 Mantenimiento y Logs

Para ver los logs en tiempo real (gracias al logger profesional que hemos implementado):

```bash
gcloud logs read --service yourttoo-mcp --limit 50
```

Para actualizar el código, repite el **Paso 2** y el **Paso 3**. Cloud Run creará una nueva revisión sin caída de servicio.