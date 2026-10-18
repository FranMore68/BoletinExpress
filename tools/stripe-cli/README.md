# Stripe CLI aislado para evaluación local

Esta herramienta permite recibir eventos reales de Stripe en modo pruebas en la aplicación local, sin publicar un túnel ni abrir puertos adicionales. No se despliega en el VPS.

## Procedencia y correcciones

- Fuente oficial: Stripe CLI v1.54.0, commit `7839c312a40ed89ecc48d16fc5fb8bca7dbfac49`.
- Archivo fuente fijado por SHA-256 en el Dockerfile.
- Constructor Go 1.27.2 Alpine fijado por digest; `CGO_ENABLED=0`.
- Módulos fijados en `go.mod` y `go.sum`, incluyendo x/crypto 0.57.0, x/net 0.60.0, x/text 0.42.0 y gRPC 1.83.2. Se verifican con `go mod verify`.
- Pruebas oficiales de `pkg/config`, `pkg/proxy` y `pkg/websocket` ejecutadas antes de compilar.
- Imagen final scratch con binario estático y certificados de confianza; usuario 1000, sin shell ni gestor de paquetes.

El binario oficial de macOS se descargó y verificó por su SHA-256, pero no se ejecutó ni recibió claves. Trivy no inventarió directamente su formato Mach-O. El inventario extraído sin ejecutarlo identificó Go 1.26.5 y 80 módulos; el análisis de ese inventario detectó avisos altos en la biblioteca estándar y módulos. Se conserva el diagnóstico en `evidence/phase-9/stripe-cli`. La versión recompilada se analiza como binario Go Linux y no presenta avisos altos ni críticos detectados.

## Uso

Desde la raíz del proyecto, con `STRIPE_SECRET_KEY` de pruebas en `.secrets/stripe.env`:

```sh
docker build -f tools/stripe-cli/Dockerfile -t boletinexpress-stripe-cli:1.54.0-be1 tools/stripe-cli
node scripts/stripe-listen-local.mjs start
```

El script usa `STRIPE_API_KEY` en un archivo privado con permisos 0600; nunca pone la clave en argumentos ni la imprime. Captura el secreto de firma sin mostrarlo, lo guarda en `STRIPE_WEBHOOK_SECRET` y recrea solo web para cargarlo. La salida privada inicial se consume en memoria y el contenedor tiene los logs desactivados. El cliente se desconecta después; el listener permanece en Docker.

El listener comparte exclusivamente la red local de evaluación y entrega a `http://web:3000/api/payments/stripe`. No publica puertos ni recibe datos del BRIE/CIE. Usa 64 MiB y 0,10 CPU; mientras está activo, web pasa a 0,20 CPU. El conjunto de servicios configurados conserva 3072 MiB y 1 CPU.

Para detenerlo y volver a las cuotas normales:

```sh
node scripts/stripe-listen-local.mjs stop
```

El script solo retira el contenedor con las etiquetas del proyecto y servicio previstos. Si el secreto del archivo sigue siendo el generado por este listener, lo vacía al detenerlo y recrea web, dejando Checkout desactivado hasta iniciar otro listener. Un secreto ajeno no se elimina.

Cada reinicio debe hacerse mediante estos comandos para sincronizar el secreto del listener y la web. No reiniciar el contenedor manualmente ni copiar su secreto al chat. La prueba no usa cobros reales; las claves `sk_live_` se rechazan.
