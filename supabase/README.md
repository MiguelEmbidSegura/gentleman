# Supabase

Ejecuta la migración `migrations/20260514000000_initial_schema.sql` desde el SQL Editor de Supabase o con la CLI de Supabase.

La migración crea:

- Peluqueros iniciales: Alberto y Rubén.
- Servicios iniciales.
- Ajustes iniciales.
- Tablas de clientes, citas, bloqueos, settings y perfiles admin.
- Row Level Security.

El MVP controla reservas y administración mediante endpoints de Next.js usando `SUPABASE_SERVICE_ROLE_KEY` solo en servidor.
