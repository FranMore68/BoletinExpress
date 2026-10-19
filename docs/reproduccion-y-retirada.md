# Reproducción y retirada de BoletinExpress

Esta guía no ejecuta una retirada. El despliegue actual sigue disponible para la evaluación con datos ficticios y Stripe en pruebas. Solo se opera sobre el proyecto BoletinExpress y el recurso `hepqrz8hrz58omwradhcvzgj`.

## Reproducir las comprobaciones

Desde una copia del repositorio privado, con Node 24, Python 3 y Docker Compose:

```sh
npm ci --ignore-scripts
npm run check
node scripts/check-coolify.mjs
python3 scripts/test-coolify-alias.py
npm run build
```

La CI instala y audita también las dependencias del worker, Storage y las herramientas PDF, construye las imágenes y ejecuta las integraciones. Para repetir la batería completa, usar el workflow `Comprobaciones` conforme a `.github/workflows/ci.yml`; no sustituirla por estas comprobaciones breves. Se necesitan un Docker funcional y puertos locales disponibles. No ejecutar scripts de inicialización contra una base con datos que deban conservarse.

La entrega ya evaluada conserva los digests en `evidence/phase-10/release/images.env.example`. Las imágenes corresponden a `fe0dfab`; la corrección Compose/cargador y su regresión a `2c6e30e`. Los cambios posteriores de documentación no requieren reconstruirlas. Una futura modificación de código o dependencias exige CI correcta para ese commit y un nuevo workflow manual `release-evaluation.yml`. No reutilizar automáticamente los resultados de seguridad de una entrega anterior.

## Reproducir un despliegue nuevo

1. Crear únicamente el recurso Compose dentro del proyecto BoletinExpress. Usar `infra/coolify/compose.yaml`, sin puertos host, redes externas compartidas ni compilación en el VPS. Mantener los límites conjuntos de 3072 MiB y 1 CPU.
2. En una instalación nueva, ejecutar `node scripts/init-coolify.mjs`. Crea `.secrets/coolify.env` sin sobrescribir uno existente. Introducir los valores privados mediante el editor de variables de ese recurso; nunca en chat, Git o capturas. Mantener claves de base/JWT exclusivas y Stripe en pruebas. Registrar la vigencia de las credenciales y renovarlas si el piloto se prolonga.
3. Copiar los digests de la entrega verificada a las variables `BE_IMAGE_*`. Crear un endpoint Stripe de pruebas exclusivo para la nueva URL; no reutilizar el secreto del CLI. Mantenerlo desactivado hasta disponer de HTTPS.
4. Transferir el cargador y el manifiesto verificados a un directorio privado del VPS. Comprobar primero el manifiesto, sin acceso a credenciales:

   ```sh
   python3 scripts/pull-evaluation-images.py evidence/phase-10/release/images.env.example --check-only
   ```

   En el VPS, con ambos archivos en el directorio privado:

   ```sh
   python3 pull-evaluation-images.py images.env.example
   ```

   El usuario introduce el PAT clásico con `read:packages` en la entrada oculta. El cargador comprueba los siete paquetes privados y descarga nueve imágenes amd64 por digest mediante configuración Docker temporal. No usar un login Docker global ni registrar el PAT como variable de la aplicación.
5. Guardar el Compose y revisar la transformación de Coolify sin copiar valores secretos. Mantener las 116 anulaciones de credenciales innecesarias, Storage `SERVICE_KEY: "${SERVICE_ROLE_KEY}"`, las otras nueve anulaciones de ese alias y el guard obligatorio de gateway. No habilitar `Connect To Predefined Network`.
6. Usar el arranque normal de este recurso, conservando `pull_policy: never`. No seleccionar `Pull Latest Images & Restart`. Comprobar nueve servicios permanentes y migración con salida 0, entornos efectivos sin claves sobrantes, límites, redes y volúmenes exclusivos.
7. Asignar solo a web `https://boletinexpress.moremaker3d.cloud`, puerto interno 3000. Comprobar DNS antes de cambiarlo: durante este despliegue ya apuntaba al VPS. Verificar certificado y redirección HTTP sin desactivar la validación TLS. No reiniciar el proxy global para resolver incidencias del piloto.
8. Habilitar únicamente su webhook Stripe de pruebas. Repetir el recorrido con cuentas ficticias: registro, aislamiento, PDF, revisión/validación, créditos, extracción, correo y pago simulado, incluidos eventos repetidos. Repetir la carga de diez minutos con dos usuarios y un trabajo pesado simultáneo antes de aceptar la capacidad.

No restaurar contenido documental desde este repositorio: el piloto no respalda datos de usuarios. Los informes completos temporales del despliegue actual están en `/tmp/boletinexpress-evaluation-c585cff` del VPS; los resúmenes publicables están en `evidence/phase-10/`.

## Retirada tras confirmar el fin de la evaluación

**Eliminar volúmenes borra definitivamente cuentas, documentos y movimientos del piloto. Requiere la confirmación expresa del usuario de que la evaluación ha terminado.** Estos pasos son instrucciones para la fase 11, todavía no ejecutada.

1. Confirmar el proyecto BoletinExpress y el UUID `hepqrz8hrz58omwradhcvzgj` antes de cada operación. Conservar código, configuración reproducible y evidencias ficticias; no exportar documentación personal como copia de seguridad.
2. Deshabilitar el endpoint Stripe de pruebas exclusivo `we_1US33kBOYpfv3qqp1G3eRDzC`. No modificar los otros endpoints de la cuenta.
3. Detener y retirar solo `boletinexpress-evaluacion` en Coolify. Quitar su ruta pública. No reiniciar el proxy global, ejecutar `docker system prune` ni actuar sobre otros proyectos.
4. Tras la confirmación de borrado, verificar los nombres y pertenencia antes de eliminar únicamente sus volúmenes: `hepqrz8hrz58omwradhcvzgj_db`, `hepqrz8hrz58omwradhcvzgj_db-config` y `hepqrz8hrz58omwradhcvzgj_files`. Retirar únicamente redes y archivos temporales exclusivos de ese recurso. Si el nombre efectivo difiere, detener ese paso y comprobarlo; no inferirlo por coincidencias parciales.
5. Revocar credenciales y PAT solo si son exclusivos de BoletinExpress. Si un proveedor usa una clave compartida, retirar su copia del recurso y planificar la rotación sin afectar otros proyectos. El cargador ya retiró su configuración temporal del registro. Revisar también `.secrets` del Mac al retirar el piloto.
6. Eliminar un registro DNS únicamente si existe un registro específico exclusivo del subdominio y se decide retirarlo. No borrar registros raíz o comodines compartidos; este despliegue no necesitó crear un registro nuevo.
7. Conservar el repositorio privado y las evidencias de evaluación. Registrar qué recursos se retiraron y comprobar que el dominio ya no sirve la aplicación. La situación de otras aplicaciones se verificará mediante la observación del usuario, sin operar sobre sus proyectos.
