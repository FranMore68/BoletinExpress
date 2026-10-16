# Límites de módulos

- `documents`: tipos y estado documental; formulario y validación se incorporan en las fases 4/5.
- `credits`: política; saldo y movimientos transaccionales en fase 6.
- `extraction`: cuotas; comprobación en servidor e IA en fase 7.
- `payments`: packs de prueba; Checkout/webhook en fase 9.
- `retention`: plazos; renovaciones, limpieza y correo en fase 8.
- Acceso y almacenamiento privado: fase 3, con Supabase propio y RLS.
- PDF: se conserva el prototipo comprobado en `tools/pdf-phase0`; se integrará mediante adaptadores en fases 4/5.

Las constantes no implementan ni autorizan operaciones. No hay rutas de escritura ni conexiones a proveedores en fase 1. El worker iniciará trabajos solo cuando existan la cola PostgreSQL y handlers transaccionales. Se limitará a un trabajo pesado simultáneo, sin Redis.
