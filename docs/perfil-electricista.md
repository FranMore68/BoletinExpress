# Perfil reutilizable del electricista

## Incorporación al plan

La especificación y las fases iniciales no contemplaban expresamente guardar los datos profesionales para reutilizarlos. Se incorpora este requisito tras la consulta del usuario del 17/10/2026.

**Fase 4:** implementar «Mi perfil», guardar los datos profesionales privados y utilizarlos al crear el BRIE. El primer documento solicitará completar los campos profesionales que falten, sin añadir un recorrido de presentación obligatorio.

**Fase 5:** reutilizar el mismo perfil y adaptar sus campos al CIE ELEC-1. No habrá que introducir de nuevo los datos ya guardados.

## Datos y comportamiento

Los campos se basarán en los inventarios oficiales ya verificados, distinguiendo empresa instaladora y persona instaladora. Incluyen nombre de empresa, NIF, RASIC, dirección y contacto; nombre e identificación del instalador y categoría cuando corresponda al modelo. El mapeo exacto y las etiquetas se comprobarán frente a cada PDF, sin confundir identificadores diferentes ni inventar datos ausentes.

Cada cuenta dispone inicialmente de un perfil profesional, accesible y editable desde «Mi perfil», en español y catalán. No se incorpora una gestión de equipos o múltiples empresas en esta versión.

Al crear un documento, se copian los valores aplicables al borrador. El usuario los revisa y puede corregirlos para ese documento. Cambiar un borrador no modifica silenciosamente el perfil. Cambiar el perfil se aplica a futuros documentos y no sobrescribe borradores existentes ni PDF validados. No se guardan ni reproducen firmas.

Los datos del titular, el emplazamiento y las características técnicas se aportan en cada documento. El perfil no sustituye mediciones ni comprobaciones de la instalación.

## Privacidad y conservación

El perfil pertenece a la cuenta y tendrá comprobaciones de sesión, propietario y RLS. Sus datos no se incluirán en registros. Es información profesional conservada expresamente para reutilización, separada de las fuentes y los datos temporales que se eliminan tras validar un documento. Esta distinción debe explicarse en la interfaz y en la política de conservación del piloto. En evaluación solo se utilizarán datos ficticios.

## Pruebas para cerrar las fases

| Fase | Prueba | Resultado exigido |
|---|---|---|
| 4 | Guardar perfil y cerrar/abrir sesión | Los datos profesionales se recuperan sin volver a introducirlos |
| 4 | Crear dos BRIE | Ambos reciben los datos del perfil en los campos oficiales correctos |
| 4 | Perfil incompleto | Se señalan los campos que faltan, sin rellenarlos con valores inventados |
| 4 | Editar perfil y crear otro documento | El documento nuevo utiliza los datos nuevos; los existentes se conservan |
| 4 | Corregir datos en un borrador | Solo cambia ese borrador |
| 4 | Acceso cruzado entre dos cuentas | Consultas y cambios de perfil ajeno rechazados |
| 5 | Crear CIE con el perfil existente | Los datos compartidos se reutilizan y se solicitan únicamente los faltantes |
| 5 | Revisar PDF de ambos modelos | Empresa e instalador aparecen en sus campos correctos, sin cambiar el diseño |

Este añadido no adelanta la fase 4: sigue siendo necesario cerrar la fase 3 y aceptar su cierre.
