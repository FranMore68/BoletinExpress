# Revisión previa a integración de fase 3

Alcance: acceso, cookies, rutas documentales, RLS, Storage, migración y entorno exclusivo. Aplicada la skill pre-commit-security-review.

No se han identificado hallazgos altos o críticos en la revisión estática. Se han comprobado propiedad y estado en rutas y políticas, ausencia de service_role en web, validación remota de usuario, rechazo de sesiones revocadas y comprobación de origen en escrituras. Los tokens de recuperación no permiten cambiar la contraseña de otra sesión. La aplicación no registra contenidos ni credenciales.

Correcciones: validación de cuerpos JSON, rechazo de campos sensibles, límites de carga por lectura del cuerpo, cookies HttpOnly y no-store, enlaces de correo consumidos solo con POST y sin referrer, secretos excluidos de Git. El detector permite únicamente referencias completas a variables de entorno en URI, con pruebas de regresión para valores literales.

Riesgo: integración de evaluación en repositorio privado, sin despliegue; su cierre y cualquier promoción quedan condicionados a las pruebas reales de migración/aislamiento y auditoría de imágenes en CI. La revisión de esta preparación no certifica todavía el cierre de fase.

APTO PARA COMMIT

## Preparación de imágenes corregidas

Se actualizan dependencias compatibles de Storage mediante manifiesto y lockfile, se sustituye el helper gosu de PostgreSQL por su-exec 0.3-r0 y se prepara Auth desde su fuente oficial v2.197.0, con archivo fuente verificado por SHA-256, Go 1.27.2 fijado por digest y actualizaciones fijadas de x/net y grpc. Se conservan sus pruebas de crypto/conf y la batería funcional de dos cuentas. No se modifica el código funcional del proveedor. Las imágenes no se publican ni despliegan; su promoción y el cierre siguen bloqueados hasta completar la auditoría y resolver los avisos altos pendientes.
