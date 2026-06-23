# Lector — Lectura y comprensión para niños

App sencilla hosteada en **Cloudflare Workers** con base de datos **D1**. Los niños ingresan con Google, eligen un nombre, leen cuentos breves al azar y responden preguntas de comprensión. Hay ranking público y panel de administración.

## Puntos

- **+1** por leer un cuento
- **+1** por cada respuesta correcta (hasta 3)
- **+1 bonus** si las 3 respuestas son correctas

Máximo por cuento: **6 puntos**. Si un niño repite un cuento, **solo cuenta el último puntaje** de ese cuento.

## Requisitos

- Cuenta en [Cloudflare](https://dash.cloudflare.com)
- Proyecto en [Google Cloud Console](https://console.cloud.google.com) con OAuth 2.0

## 1. Configurar Google OAuth

1. Creá un proyecto en Google Cloud Console.
2. Activá **Google+ API / People API** (o Google Identity).
3. En **Credenciales → Crear credenciales → ID de cliente OAuth**:
   - Tipo: **Aplicación web**
   - Orígenes autorizados: `https://lector.<tu-subdominio>.workers.dev` (y `http://localhost:8787` para desarrollo local)
   - URIs de redirección autorizados:
     - `https://lector.<tu-subdominio>.workers.dev/auth/callback`
     - `http://localhost:8787/auth/callback`
4. Copiá el **Client ID** y **Client Secret**.

## 2. Instalar y migrar base de datos

```bash
npm install
npm run db:migrate:local   # desarrollo
npm run db:migrate:remote  # producción
```

Los 30 cuentos se cargan automáticamente la primera vez que arranca la app (si la tabla está vacía).

## 3. Secretos en Cloudflare

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET    # cadena larga aleatoria
npx wrangler secret put ADMIN_PASSWORD    # contraseña del panel admin
```

Para desarrollo local, creá `.dev.vars` (no lo subas a git):

```env
GOOGLE_CLIENT_ID=tu-client-id
GOOGLE_CLIENT_SECRET=tu-client-secret
SESSION_SECRET=una-cadena-muy-larga-y-aleatoria
ADMIN_PASSWORD=tu-clave-admin
```

## 4. Desarrollo local

```bash
npm run dev
```

Abrí `http://localhost:8787`

## 5. Desplegar

```bash
npm run deploy
```

La URL será algo como: `https://lector.<cuenta>.workers.dev`

Actualizá las URLs de Google OAuth con la URL real después del primer deploy.

## Panel de administración

Abrí `/admin.html`:

1. Ingresá con Google en la app principal.
2. Entrá a `/admin.html` e ingresá la `ADMIN_PASSWORD`.
3. Verás usuarios, cuentos, intentos y actividad reciente.

## Estructura

```
src/
  index.ts          # API y rutas
  auth.ts           # Google OAuth y sesiones
  db.ts             # Consultas y puntuación
  seed.ts           # Carga de cuentos
  stories-data*.ts  # 30 cuentos en español
public/
  index.html        # App principal
  admin.html        # Panel admin
  app.js            # Frontend
  styles.css
migrations/         # Esquema D1
```

## Notas

- Un email de Google = un niño.
- El ranking muestra **nombre y puntos** de todos los lectores con nombre configurado.
- Los cuentos pueden repetirse al azar; cada cuento solo aporta puntos según el **último intento**.
