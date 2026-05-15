# Agenda Peluqueria

PWA mobile-first para la peluqueria masculina **Gentleman**. La web normal para clientes es `/` o `/reservar`. La entrada de administradores no se muestra en la web publica.

Rutas importantes:

- `/` y `/reservar`: reserva publica para clientes.
- `/reservar/success`: pago recibido.
- `/reservar/cancel`: pago cancelado.
- `/reservar/gestionar/[enlace-privado]`: modificar o anular una cita publica ya creada.
- `/admin/dias-no-trabaja`: Alberto y Ruben gestionan dias y horas que no trabajan.
- `/admin`: panel privado completo del MVP.

## Tecnologias usadas

- Next.js
- TypeScript
- Tailwind CSS
- Supabase
- Stripe Checkout
- Vercel
- GitHub
- PWA instalable en iPhone desde Safari

## Requisitos previos

- Node.js y npm.
- Git.
- Visual Studio Code.
- Cuenta de GitHub.
- Cuenta de Supabase.
- Cuenta de Stripe.
- Cuenta de Vercel.

## Crear el proyecto en local

```bash
npm install
npm run dev
```

En Windows PowerShell, si `npm` esta bloqueado por la politica de scripts:

```bash
npm.cmd install
npm.cmd run dev
```

## Abrir en VS Code

```bash
code .
```

## Variables de entorno

Crea `.env.local` a partir de `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_SECRET=
ALBERTO_PASSWORD=
RUBEN_PASSWORD=
NEXT_PUBLIC_ALBERTO_PHONE=
NEXT_PUBLIC_RUBEN_PHONE=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_SITE_URL=
RESEND_API_KEY=
BOOKING_EMAIL_FROM=
```

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` pueden usarse en cliente. `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y `RESEND_API_KEY` son solo de servidor y nunca deben exponerse en navegador. `.env.local` no debe subirse a GitHub.

Para local, `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. Para Alberto y Ruben puedes usar `+34655874680` en los telefonos.

## Configurar Stripe

Stripe Checkout cobra un pago previo obligatorio de 8,00 EUR antes de confirmar la cita. La cita se crea primero como `pending_payment` y solo pasa a `confirmed` cuando llega un webhook valido de Stripe.

Mientras Stripe no este configurado, la app entra en modo depuracion: al confirmar una reserva publica simula el pago de 8,00 EUR, crea la cita como confirmada y permite recorrer el flujo completo de modificacion/anulacion.

Si necesitas forzar ese comportamiento aunque existan claves de Stripe, define:

```env
NEXT_PUBLIC_DEBUG_BYPASS_STRIPE=true
DEBUG_BYPASS_STRIPE=true
```

1. Crea una cuenta en Stripe.
2. Entra en Developers > API keys.
3. Copia la publishable key.
4. Copia la secret key.
5. Crea `.env.local`.
6. Anade:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_SITE_URL=
```

En desarrollo usa preferiblemente claves test: `pk_test_...` y `sk_test_...`. En produccion usa claves live: `pk_live_...` y `sk_live_...`.

En Vercel anade las mismas variables en Project Settings > Environment Variables. Crea un webhook en Stripe apuntando a:

```text
https://TU_DOMINIO.com/api/stripe/webhook
```

Copia el signing secret del webhook en `STRIPE_WEBHOOK_SECRET`. Prueba con tarjetas de prueba antes de pasar a produccion. No subas `.env.local` a GitHub.

## Configurar confirmaciones por email

La reserva publica pide un email y, cuando `RESEND_API_KEY` y `BOOKING_EMAIL_FROM` estan configurados, envia automaticamente una confirmacion con:

- fecha y hora de la cita;
- enlace privado para modificar o anular;
- enlace para anadir la cita al calendario.

Variables necesarias:

```env
RESEND_API_KEY=
BOOKING_EMAIL_FROM=Gentleman <citas@tu-dominio.com>
```

Si todavia no configuras Resend, la reserva sigue funcionando y la interfaz indica que el email esta pendiente de configurar.

## Configurar Supabase

1. Crea un proyecto nuevo en Supabase.
2. Copia la URL del proyecto en `NEXT_PUBLIC_SUPABASE_URL`.
3. Copia la anon key en `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Copia la service role key en `SUPABASE_SERVICE_ROLE_KEY`.
5. Abre SQL Editor y ejecuta `supabase/migrations/20260514000000_initial_schema.sql`.
6. Si ya tenias la base creada antes de Stripe, ejecuta tambien `supabase/migrations/20260514001000_stripe_payments.sql`.
7. Verifica que Row Level Security queda activado.
8. Define `APP_SECRET`, `ALBERTO_PASSWORD` y `RUBEN_PASSWORD`.

La migracion inserta Alberto, Ruben, servicios iniciales de peluqueria masculina con duracion inicial de 15 minutos y ajustes iniciales.

## Base de datos

- `hairdressers`: Alberto y Ruben.
- `services`: servicios editables con duracion, precio y estado activo.
- `clients`: clientes con nombre, telefono y notas.
- `appointments`: citas con estado, servicio, peluquero, retraso, origen y datos de pago Stripe.
- `schedule_blocks`: vacaciones, festivos, cierres y bloqueos parciales.
- `settings`: ajustes basicos en JSON.
- `admin_profiles`: perfiles futuros ligados a Supabase Auth.

## Ejecutar en local

```bash
npm run dev
```

Abre:

```text
http://localhost:3000
```

## Probar en iPhone dentro de la misma red

1. PC e iPhone deben estar en la misma WiFi.
2. Averigua la IP local del PC con `ipconfig`.
3. Ejecuta `npm run dev`.
4. Abre Safari en el iPhone:

```text
http://IP_DEL_PC:3000
```

Si no carga, revisa el firewall de Windows.

## Crear repositorio en GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin URL_DEL_REPOSITORIO
git push -u origin main
```

## Desplegar en Vercel

1. Entra en Vercel.
2. Crea un proyecto nuevo.
3. Importa el repositorio desde GitHub.
4. Anade las variables de entorno.
5. Despliega.

Cada push a `main` puede generar un nuevo despliegue.

## Variables de entorno en Vercel

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_SECRET=
ALBERTO_PASSWORD=
RUBEN_PASSWORD=
NEXT_PUBLIC_ALBERTO_PHONE=
NEXT_PUBLIC_RUBEN_PHONE=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_SITE_URL=
RESEND_API_KEY=
BOOKING_EMAIL_FROM=
```

## Probar la app en Vercel

- Abre la URL temporal de Vercel.
- Prueba `/` o `/reservar`.
- Prueba una reserva con Stripe Checkout.
- Prueba login en `/admin/dias-no-trabaja`.
- Crea una cita manual.
- Crea un bloqueo o vacaciones.
- Comprueba que el bloqueo elimina disponibilidad publica.
- Prueba desde iPhone.

## Instalar como app en iPhone

1. Abre Safari en iPhone.
2. Entra en la URL de Vercel o dominio propio.
3. Pulsa Compartir.
4. Pulsa **Anadir a pantalla de inicio**.
5. Confirma nombre e icono.
6. Abre la app desde el icono creado.

No hace falta Apple Developer Program, App Store ni TestFlight.

## Conectar dominio propio de IONOS mas adelante

1. Compra o usa tu dominio en IONOS.
2. En Vercel, ve a Project Settings > Domains.
3. Anade el dominio.
4. Vercel mostrara los registros DNS exactos.
5. Entra en IONOS.
6. Modifica los DNS copiando lo que indique Vercel.
7. Configura registros tipo A, CNAME o los que Vercel indique.
8. Espera la propagacion DNS.
9. Comprueba HTTPS.
10. Usa ese dominio para anadir la PWA al iPhone.

No inventes valores DNS fijos: Vercel mostrara los registros exactos que debes copiar en IONOS.

## Flujo recomendado de trabajo

1. Desarrollar en local.
2. Probar.
3. Commit.
4. Push a GitHub.
5. Vercel despliega.
6. Probar en URL publica.
7. Usar en iPhone.

## Comandos utiles

```bash
npm run dev
npm run build
npm run lint
npm run test
```

## Seguridad

- No subir `.env.local` a GitHub.
- Mantener `.gitignore`.
- No exponer `SUPABASE_SERVICE_ROLE_KEY`.
- No exponer `STRIPE_SECRET_KEY` ni `STRIPE_WEBHOOK_SECRET`.
- No hardcodear claves de Stripe en componentes.
- Activar RLS en Supabase.
- Proteger rutas admin.
- No mostrar datos de clientes en rutas publicas.
- La confirmacion real de citas se hace por webhook de Stripe, no por la pagina `success`.
- Las citas publicas confirmadas muestran un enlace privado firmado para que el cliente pueda modificarlas o anularlas sin cuenta.

## Limitaciones iniciales

- La app es PWA, no app nativa iOS.
- No usa App Store.
- No requiere Apple Developer.
- Algunas funciones nativas del iPhone pueden estar limitadas.
- Llamadas y WhatsApp se hacen mediante enlaces.
- El MVP usa login privado simple con cookie HTTP-only; `admin_profiles` queda preparado para ampliar con Supabase Auth.

## Mejoras futuras

- Supabase Auth completo con roles avanzados.
- Recordatorios automaticos por WhatsApp.
- Confirmacion por SMS.
- Panel de estadisticas.
- Exportacion a calendario.
- Copias de seguridad.
- Modo offline parcial.
- Integracion con Google Calendar.

## Tests

```bash
npm run test
```

Los tests cubren bloques de 15 minutos, horarios de Alberto y Ruben, sabado, domingo cerrado, duraciones de 15 a 120 minutos, cierre exacto, solapamientos, bloqueos, vacaciones, festivos, telefono espanol, enlace WhatsApp, importe Stripe de 800 centimos, citas `pending_payment`, expiracion a los 15 minutos y webhook invalido.
