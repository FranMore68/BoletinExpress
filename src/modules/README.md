# Límites de módulos

- `documents`: estado documental, perfil, esquema de los 59 campos BRIE y validación de entrada. CIE manual en fase 5.
- `credits`: política; saldo y movimientos transaccionales en fase 6.
- `extraction`: cuotas; comprobación en servidor e IA en fase 7.
- `payments`: packs de prueba; Checkout/webhook en fase 9.
- `retention`: plazos; renovaciones, limpieza y correo en fase 8.
- Acceso y almacenamiento privado: Supabase propio, sesiones y RLS desde fase 3.
- PDF: generador compartido en `shared/pdf`, plantilla privada en `assets/pdf`; las herramientas de fase 0 reutilizan ese generador.

El worker consume una cola persistente PostgreSQL con un único trabajo pesado simultáneo y permisos restringidos, sin Redis. El visor PDF.js y su worker se sirven desde la propia aplicación. La vista previa no valida documentos ni descuenta KC.
