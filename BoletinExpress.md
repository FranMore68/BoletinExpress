# ESPECIFICACIÓN INICIAL   

## BoletinExpress

Quiero crear desde cero una aplicación web que ayude a los electricistas de Cataluña a rellenar de forma asistida el BRIE y el CIE modelo ELEC-1. Podrán aportar los datos hablando, subiendo fotografías de sus notas o escribiendo en lenguaje natural. La aplicación completará los campos que pueda, y preguntará por los datos que falten y permitirá revisar y corregir todo, antes de generar un borrador en PDF. No debe inventar datos. Los modelos están en la carpeta plantillas.

El usuario se registrará con correo y contraseña, confirmará su correo y recibirá créditos de prueba (10) que los llamaremos KiloCreditos El coste de la generación del documento se descontaran al final de la generación de este, siempre que este sea validado como correcto por el usuario

Una vez registrado podrá elegir entre

1. Rellenar un BRIE (coste 2 KiloCreditos) o un CIE modelo ELEC-1 (5 KiloCreditos). 

Los datos los podrá aportar mediante formulario, voz o fotos. Deberá el usuario revisar y completar los datos que falten, y la App BoletinExpress, generará un borrador en PDF a partir de los modelos oficiales de la carpeta plantillas, el Brie (Plta_ButlletiReconeixementBT) que está en formato Word o el CIE modelo ELEC-1 (Plta_ELEC1CertificatInstalElectricaBT) que está en formato PDF. 

Los dos documentos están descargados de la página de la Generalitat de Catalunya. 

POR LO QUE SON DOCUMENTOS OFICIALES Y NO SE PUEDE MODIFICAR SU DISEÑO. 

2. Consultar los documentos que haya creado en eses momento o con anterioridad e reenviarlos a un email o imprimirlos. Por lo que será necesario tener la base de datos.

3. Recargar los KiloCréditos mediante una pasarela de pagos.

Quiero una web visualmente atractiva y con un diseño propio. Tiene que ser moderna no recargada fácil intuitiva que, de la información precisa para usarla sin complicaciones, que el usuario no tenga que hacer un curso, que solo viendo sepa que tiene que hacer sin demasiadas opciones, nosotros le guiamos. 

En la página principal el “Hero Section” lo ocupa el formulario de entrada y si el usuario hace “Scrool” lo que se mueve es el fondo de la página, pero no el formulario de inscripción o entrada. Todo se enfoca a que se tiene que registrar.

El fondo de la página quiero que sea como un a página sin fin que va girando como una rueda, donde además de grafías referidas al tema, (NADA DE RAYOS, TORRES DE ALTA TENSION, LLAMAS etc.…) por ejemplo un estilo de diseño que me gusta mucho es Bauhaus donde las geometrías se mezclen con las explicaciones de los beneficios de usar la web, sin largos párrafos solo indicaciones directas, del estilo de, fácil o rápido, etc... que tenga que ver con lo que hace la web ayudar a rellenar unos formularios a electricistas.

En la página principal tiene que quedar claro para que sirve la web y que se podrá probar con los Kilocreditos gratuitos del registro.

Una vez registrados acceden a la página de presentación, debe explicar el producto mientras el usuario se desplaza: mostrar cómo se aportan los datos, cómo se completan los campos y cómo se revisa el PDF, con transiciones suaves y una simpleza extrema menos letra más imagen incluso si hace falta animaciones, pero sin perder la esencia del diseño que te he dicho antes. 
Dentro de la aplicación, prioriza un proceso guiado, fácil de leer y usar. Todo debe funcionar bien en ordenador, Tablet y móvil, las animaciones no deben dificultar el uso si necesitas crear imágenes que no sean recargadas ni realistas seguimos con el diseño igual en toda la web, que sea coherente. Pueden ayudar a explicar el recorrido en la página de presentación, pero no deberían competir con los formularios ni distraer mientras se rellena un documento. Como solo tenemos dos opciones, tiene que ser todo muy fluido.

Me registro o si soy usuario accedo, dentro tengo tres opciones o busco un documento generado antes si ya soy cliente y anteriormente he generado alguno o genero documento nuevo o recargo los créditos. 

Y si soy nuevo usuario, o no tengo documentos generados, nosotros lo guiamos a la creación del documento no lo paseamos por la web.

Quiero que la creación del documento sea un proceso guiado, con la opción de adjuntar fotos guardadas o directamente con la cámara, grabar un audio para poderlo transcribir o rellenar formulario. Una vez esté terminado el proceso de la obtención de datos se revisan y lo que falte se le pide al usuario, una vez completado lo debe revisar el usuario y si no está ok rectificar lo que crea necesario y si esta ok pasamos a la última fase descargarse una copia o enviársela a su email con el que se ha registrado(no somos un portal de envió, solo al que se ha registrado). 

Terminado el proceso un aviso de que los datos, audios y fotos incluidos, no se guardaran una vez validado el documento generado, solo se guardara el documento validado durante 30 días. En caso de que se salga de la sesión antes de validar el documento, los datos adjuntos incluidas fotos y audios se guardaran durante 24 horas, pasado ese tiempo se borraran y no provocara ningún descuento de KiloCreditos. Si antes de 24 horas se accede de nuevo a la plataforma se retoma la creación del documento no terminado y se volviera a dejar sin terminar, se guardaría todo durante 24 horas más, pero con el coste de 1 KiloCreditodesde el momento en que el usuario cierra la sesión sin terminar el documento (es como cobrarle por guardárselo 24 horas más) al final de esas 24 horas se borrarían los datos si no se accede de nuevo. A partir de la segunda vez cada vez que se repitiera la acción se le cobraría 1 KiloCredito. En caso de quedarse sin crédito los datos se borrarán pasado el plazo. El documento validado se guardara durante 30 días desde su validación sin coste adicional al de la creación, pasados estos 30 días se le enviará a su email automáticamente al usuario con el documento que caduque, añadiendo una nota que diga algo como “El documento nos será accesible de forma directa, pero en caso de necesidad y por petición expresa se podrá recuperar en los 30 dias siguientes pasado ese plazo ya no sera posible recuperarlo”. Por seguridad, guardaremos el documento 30 días mas (como si fuera la papelera) y solo se puede recuperar con la petición expresa del usuario pero a simple vista no tiene acceso a él.

Usaremos Next.js con TypeScript, Supabase para la base de datos y Supabase Auth para el acceso. 

Estoy abierto a sugerencias de cambio de las especificaciones, pero la base de datos y el Auth tiene que de Supabase 

La aplicación se desplegará en mi VPS de Hostinger mediante contenedores con Coolify y Supabase en mi VPS 

Quiero estudiar la transcripción con Whisper ejecutado en el VPS, indica qué recursos necesitaría antes de incluirla en la primera versión. 

Tambien debes valorar la opción de convertir el BRIE a PDF para así conservar el disño y disposición de los elementos fijos del documento.

Todo el código se versionará desde el inicio en un repositorio privado de mi cuenta de GitHub, sin incluir claves ni credenciales. Para la evaluación del ejercicio el repositorio estará Publico para su revisión si fuera necesario.

Tu eres el agente senior experto en desarrollo de aplicaciones, en programación backend, en diseño Frontend, en despliegue de aplicaciones en VPS y experto en ciberseguridad.

Al proponer las fases, define qué comprobaras y qué resultado permitirá pasar a la siguiente. 

- Acceso y privacidad: registro y confirmación del correo; un usuario no puede abrir, descargar ni consultar documentos o archivos de otro, tampoco usando un enlace directo.

- Créditos: las 10 iniciales se conceden una sola vez; se descuentan 2 o 5 únicamente tras la validación prevista y 1 en los casos de mantenimiento de los datos con un documento por validar en los casos descritos antes. Un error, un doble clic o un reintento no producen cargos duplicados.

- Borradores y plazos: salir y volver antes de 24 horas, llegar al límite de tiempo, repetir el abandono y quedarse sin créditos.

- Datos y PDF: voz o fotos con datos incompletos o mal reconocidos; corrección por el usuario; campos trasladados al lugar correcto; diseño fijo de los modelos conservado.

- Borrado y correo: comprobar que se eliminan los archivos de origen tras validar, que el PDF vence a los 30 días y que el aviso se dirige solo al correo de la cuenta.

- Aplicación desplegada: recorrer el proceso completo desde móvil y ordenador con cuentas y datos ficticios, sin depender de que funcione solo en el equipo de desarrollo.

 Me enseñaras el resultado de las pruebas y los fallos pendientes al cerrar cada fase. 

Solo con la lista de los test superados decidiremos juntos si avanzamos.

Pon mucha atención a la autentificación y en la seguridad de los datos ya que hay datos sensibles en la documentación. 

Antes de usar ninguna librería asegúrate de que no este informado ninguna vulnerabilidad grabe. 

Antes de programar, propón una arquitectura sencilla, el recorrido del usuario y el orden de construcción. Indica qué servicios tendremos que configurar y qué recursos necesitaría Whisper. Si hace falta un api de OpenAi estuve mirando costes te adjunto unas capturas para que valores cual nos haría falta.

Con referencia a la plataforma de pagos mira Stripe tienes en este enlace toda la documentación para usar la plataforma en modo pruebas.

https://docs.stripe.com/testing

En referencia a Stripe y solo como primer dato antes de que revises toda la documentación tendría en cuenta que una recarga de Stripe en modo de pruebas solo aumente el saldo cuando el pago se confirme, y que los reintentos no lo dupliquen. La documentación de pruebas de Stripe contempla pagos correctos y rechazados.

Para las pruebas de los plazos de 24 horas y 30 días activaría algo así como un reloj/calendario que permitiera avanzar el tiempo para comprobar que pasa con los plazos de los datos guardados, si se descuenta los créditos correctamente, si envia el email con el documento pasado los 30 días. Esto solo es para las pruebas y la evaluación del proyecto, no una función de la aplicación deberá quedar claro

Super importante divide todo el trabajo en fases, pero no muy grandes, que podamos corregir sin tener que empezar de nuevo, no haremos la siguiente fase hasta que la que le precede esté terminada funcionando y con todos los test superados. 

¡Y LO MAS IMPORTANTE NADA ES PARA UN DIA NI SE QUEDA SIEMPRE IGUAL, por lo que debemos tener ¡SIEMPRE! ¡SIEMPRE! en cuenta la escalabilidad del proyecto sin que esto implique deshacer lo realizado. Así que piensa en módulos como si construyeras la estación espacial.

Trabajaremos en la carpeta local:
/Volumes/SSD_Ugreen/001.MasterIA/Hackathones/HackathonVibecoding_e7/BoletinExpress

y en github:

https://github.com/FranMore68/BoletinExpress.git

Se tienen que crear los propios servicios para BoletinExpress, base de datos, autenticación, almacenamiento y credenciales, sin usar nada de aplicaciones que hayamos creado antes, NADA es NADA.


No generes código todavía. 

Si algo no está claro o te falta información para decidir, pregúntame antes de hacer suposiciones, no inventes ni te pongas creativo si no te lo pido expresamente.
