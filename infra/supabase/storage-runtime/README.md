# Dependencias de ejecución de Storage

Base: package.json y package-lock.json de supabase/storage v1.83.5. Se conservan las dependencias y la configuración de módulos de ejecución, con actualizaciones compatibles fijadas para los paquetes señalados por las auditorías. Se excluyen scripts y dependencias de desarrollo; no se modifica el código de Storage.

El Dockerfile instala estas versiones sobre los módulos existentes para conservar los complementos nativos ya compilados del proveedor. Se retiran después npm/yarn. La batería de dos cuentas comprueba la subida, vista, descarga y políticas de acceso; Trivy verifica la imagen final. El lockfile debe conservarse para reproducir las versiones transitorias.

Procedencia: https://github.com/supabase/storage/tree/v1.83.5
