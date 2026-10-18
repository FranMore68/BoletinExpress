# Fase 10 · Despliegue y evaluación

Estado a 19 de octubre de 2026: recurso remoto creado y detenido; sin despliegue.
La fase 7 está aceptada. Esta fase aún no reúne las condiciones de cierre.

## Alcance autorizado

Únicamente el proyecto existente **BoletinExpress**, entorno **production**, en
Coolify. El nombre del entorno no cambia la condición de piloto con datos ficticios
y Stripe en pruebas. Queda prohibido modificar cualquier otro proyecto, en
particular **Staging-Pimet**. No reiniciar el proxy global ni limpiar Docker en el VPS.

## Recurso preparado

Un servicio Docker Compose vacío: `boletinexpress-evaluacion`, UUID
`hepqrz8hrz58omwradhcvzgj`. Creado dentro del proyecto autorizado, sin arrancarlo.
Fuente: `infra/coolify/compose.yaml`. No usa archivos locales del Mac ni compilación
en el VPS. Las siete imágenes propias se indicarán por digest tras su publicación.
PostgREST y Mailpit conservan las versiones ya evaluadas, también fijadas por digest.
Los diez componentes tienen `pull_policy: never`: arrancan con las imágenes
precargadas y no requieren credenciales de registro en el arranque de Coolify.

Nueve servicios permanentes y un auxiliar `migrate` de una sola ejecución.
Este último reutiliza la imagen PostgreSQL, espera a Auth y Storage y aplica las
siete migraciones, saltando las ya registradas. Web y worker esperan a que termine.
Cambiar un SQL existente exige una migración nueva; este mecanismo no lo reaplica.

Límites conjuntos: **3072 MiB y 1 CPU**, incluido el auxiliar. Web usa 0,28 CPU
para reservar 0,02 al migrador. El resto conserva sus límites locales.

Los volúmenes `db`, `db-config` y `files` son nuevos y pertenecen al recurso.
No hay volúmenes o redes externos, nombres globales de contenedores, montajes del
host ni puertos publicados. La web pertenece a la red frontal y a la red interna
`data`. El worker y el relay de correo añaden una red `egress` para OpenAI y Resend.
Solo la web recibirá dominio, hacia su puerto interno 3000.

Coolify transforma el Compose: antes de desplegar hay que revisar su versión
**Deployable Compose**, comprobar redes, volúmenes, límites, dependencias y que no
añada rutas públicas a componentes internos. No activar **Connect To Predefined
Network**. La topología remota no se da por verificada hasta comprobarla allí.

`migrate.exclude_from_hc` es una propiedad específica de Coolify. El comprobador
local retira únicamente esa línea antes de validar con Docker Compose estándar.
El parser de Coolify ha aceptado la definición inicial y ha creado los diez componentes.
La versión final con 107 anulaciones de credenciales innecesarias está guardada;
se ha verificado su persistencia tras recargar la página y su presencia en el
Compose generado. Las variables obligatorias vacías siguen bloqueando el despliegue.

## Adaptación a Coolify 4.4.6

La vista generada añade `.env` a todos los contenedores y una red propia del
recurso (externa para Compose, exclusiva de este UUID). No es la red compartida
`coolify`; no se habilitó conectar a otros recursos. La red añadida permite tráfico
entre componentes del propio recurso y exige comprobar el aislamiento final allí.

El archivo local anula explícitamente las trece variables de credenciales que cada
componente no utiliza, mediante el marcador fijo `disabled`. Esto evita que la inyección de `.env`
coloque claves innecesarias en el entorno efectivo. Un vacío literal no basta: el parser de Coolify
puede reemplazarlo por el valor guardado. Cualquier variable secreta nueva exige
ampliar la lista y su comprobación.

La prueba local simula la inyección del archivo común y comprueba el entorno
efectivo de los diez contenedores: todas las credenciales innecesarias tienen el marcador `disabled`, sin su valor real.
La transformación final conserva los 107 marcadores `disabled`, los límites y
las dependencias. Evidencia: `evidence/phase-10/coolify-generated.yaml`, obtenida
antes de cargar secretos. La persistencia del fuente se comprobó tras recargar.
Pendiente comprobar el entorno efectivo remoto al arrancar, antes de habilitar
acceso público.

## Configuración privada

`node scripts/init-coolify.mjs` crea `.secrets/coolify.env` (0600, excluido de Git)
sin sobrescribirlo ni cambiar el entorno local. Genera claves propias de la base
remota y JWT restringidos con vigencia de 90 días. Copia únicamente los valores
de proveedor de BoletinExpress ya disponibles: OpenAI, Resend y Stripe de pruebas.
No muestra valores en terminal. No pegar el contenido en el chat.

Quedan vacíos hasta configurarlos:

- `BE_IMAGE_*`: digests de las siete imágenes publicadas y las dos imágenes upstream.
- `STRIPE_WEBHOOK_SECRET`: preparado en el archivo privado para el nuevo endpoint
  HTTPS; **no reutiliza** el de Stripe CLI local. Endpoint `/api/payments/stripe`,
  evento `checkout.session.completed`, API `2026-09-30.endive`, modo de pruebas.
  Creado y dejado desactivado hasta disponer de HTTPS; evidencia sin secreto en
  `evidence/phase-10/stripe-webhook.json`. No se modificaron otros endpoints.

El relay Auth envía a Resend con TLS verificado y mantiene las direcciones
`.invalid` en el buzón interno. Mailpit no dispone de dominio ni puerto del host.
El worker envía los documentos con la API de Resend. La clave OpenAI solo está
presente en el worker.

## Imágenes fuera del VPS

Workflow manual `.github/workflows/release-evaluation.yml`: requiere CI correcta
para el mismo commit de main, construye linux/amd64 en GitHub, analiza nueve
imágenes con Trivy y solo publica las siete propias si no detecta avisos HIGH o
CRITICAL. Produce `images.env.example` con nueve referencias por digest y los informes.
No se ha ejecutado todavía. El análisis conserva las limitaciones de inventario
ya documentadas en la fase 7; no garantiza ausencia de toda vulnerabilidad.

GHCR crea paquetes privados por defecto; comprobar su visibilidad y asociación
con el repositorio privado BoletinExpress. No registrar el token en los registros generales de Coolify: la implementación
oficial usa `$HOME/.docker/config.json`, compartido por los despliegues del servidor.

`scripts/pull-evaluation-images.py` recibe el manifiesto verificado, valida las
nueve referencias exactas permitidas y exige digests SHA-256. En el VPS pide el
token clásico `read:packages` por entrada oculta, inicia sesión con un directorio
Docker temporal exclusivo y descarga las imágenes para linux/amd64. No lee ni
escribe la configuración Docker global. El directorio de credenciales se retira
al terminar, también ante fallos. Las imágenes upstream se descargan por digest,
sin retaggear ni sustituir tags usados por otras aplicaciones.

Uso en el VPS: `python3 pull-evaluation-images.py images.env.example`. En el Mac
solo comprobar manifiesto con `--check-only`. No ejecutar la descarga antes de
verificar CI y los análisis de esa entrega. En Coolify usar el arranque normal;
no **Pull Latest Images & Restart**. Las imágenes faltantes deben causar un error,
sin recurrir a un login global. La descarga real está pendiente.

## Secuencia pendiente

1. Prueba local de arranque y migraciones superada; revisión de publicación.
2. Publicar código y superar CI del commit concreto; ejecutar release y verificar
   informes, arquitectura y privacidad de los paquetes.
3. Precargar las nueve imágenes con credenciales temporales exclusivas. El recurso
   está creado; cargar sus variables privadas sin mostrarlas. No reutilizar datos
   ni claves internas locales.
4. Configurar dominio web `https://boletinexpress.moremaker3d.cloud` al puerto 3000,
   DNS y endpoint Stripe de pruebas. Revisar Deployable Compose antes del arranque.
5. Arrancar exclusivamente este recurso y comprobar migraciones y HTTPS.
6. Probar dos cuentas aisladas, extracción, PDF, validación, correo y pagos de pruebas.
7. Medir diez minutos con dos usuarios y un trabajo pesado simultáneo.

`scripts/observe-vps.py` solo lee CPU, memoria, disco y, si se indica el proyecto
Compose exacto de BoletinExpress, reinicios/OOM de sus contenedores. Sin esa
selección no inspecciona contenedores. Una observación de reposo no acepta el VPS.
No se realizarán operaciones sobre otras aplicaciones para obtener referencias.
La condición original de comparación con Control-Contracts queda pendiente de una
evidencia permitida por el límite actual de alcance, sin darla por cumplida.

## Evidencias

| Prueba | Resultado | Evidencia |
|---|---|---|
| Sintaxis y límites Compose | Superada: 3072 MiB, 1 CPU, cero puertos del host | `evidence/phase-10/compose-validation.json` |
| Claves remotas separadas y no sobrescritura | Preparadas; comprobación local | `.secrets/coolify.env`, no versionado |
| Arranque y migración en instalación nueva | Superada: nueve servicios activos y migrador con salida 0; siete migraciones idempotentes | `evidence/phase-10/local-startup.json` |
| Aislamiento ante .env común | Superada en diez contenedores locales creados sin arrancar | `evidence/phase-10/secret-isolation.json` |
| Aplicación | Superada: lint, tipos, 37 pruebas y revisión de secretos | `npm run check` con Node 24.19.0 |
| Publicación de imágenes y acceso desde Coolify | Pendiente | Workflow manual |
| Parser inicial de Coolify | Aceptado; recurso detenido | `evidence/phase-10/coolify-created.png` |
| Guardado final y topología generada | Persistencia y 107 marcadores verificados; sin claves cargadas | `evidence/phase-10/coolify-generated.yaml` |
| Recorrido HTTPS y carga de diez minutos | Pendiente | No desplegado |

Fuentes técnicas:
[Compose en Coolify](https://coolify.io/docs/services/configuration/docker-compose),
[redes en Coolify](https://coolify.io/docs/core/networking-in-coolify),
[GHCR](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

## Primer intento de CI y corrección de Storage

La CI [39173210229](https://github.com/FranMore68/BoletinExpress/actions/runs/39173210229)
superó las siete baterías de integración, pero detectó un aviso HIGH en Storage:
CVE-2026-77214, libexpat 2.8.5-r0. No se publicó ninguna imagen. Se conserva el
informe actual en `evidence/phase-10/ci-attempt-1`; la descarga completa original,
con evidencias históricas ya versionadas, está en `tmp/phase10-ci-attempt1-download`.

El Dockerfile actualiza únicamente libexpat a 2.9.0-r0 en Storage. La imagen
candidata local confirma la versión instalada, tiene salud correcta y no presenta
avisos HIGH/CRITICAL detectados. Falta repetir la CI amd64 completa y la entrega.
Evidencia: `evidence/phase-10/storage-fix`.
[Corrección Alpine](https://security.alpinelinux.org/vuln/CVE-2026-77214),
[paquete oficial](https://pkgs.alpinelinux.org/package/v3.23/main/x86_64/libexpat).
