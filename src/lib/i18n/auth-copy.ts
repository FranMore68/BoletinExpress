import type { Locale } from "./copy";
export const authCopy = {
  recharge: ["Recargar KC de prueba", "Recarrega KC de prova"],
  topupCredit: [
    "Recarga con Stripe en pruebas",
    "Recàrrega amb Stripe en proves",
  ],
  paymentHelp: [
    "Stripe en modo pruebas: no utilices tarjetas reales. Elige un pack para abrir el pago seguro de Stripe.",
    "Stripe en mode proves: no utilitzis targetes reals. Tria un paquet per obrir el pagament segur de Stripe.",
  ],
  paymentReturned: [
    "Al volver de Stripe, actualiza el saldo. Los KC solo se abonan cuando el servidor recibe la confirmación del pago.",
    "En tornar de Stripe, actualitza el saldo. Els KC només s’abonen quan el servidor rep la confirmació del pagament.",
  ],
  paymentUpdated: [
    "Saldo y pagos actualizados.",
    "Saldo i pagaments actualitzats.",
  ],
  refreshPayments: ["Actualizar saldo y pagos", "Actualitza saldo i pagaments"],
  paymentPaid: ["Abonado", "Abonat"],
  paymentPending: [
    "Pendiente de pago o confirmación",
    "Pendent de pagament o confirmació",
  ],
  paymentExpired: ["Sesión caducada", "Sessió caducada"],
  paymentFailed: ["Pago fallido", "Pagament fallit"],
  payments_unavailable: [
    "Las recargas de prueba no están disponibles ahora. Inténtalo más tarde.",
    "Les recàrregues de prova no estan disponibles ara. Torna-ho a provar més tard.",
  ],
  renewalCredit: [
    "Renovación de borrador (24 horas)",
    "Renovació d’esborrany (24 hores)",
  ],
  retentionHelp: [
    "El plazo de 24 horas comienza al guardar el primer dato o archivo. Si vuelves a abrir el borrador durante ese ciclo, al vencer se renovará por 1 KC durante otras 24 horas. Cada ciclo necesita un nuevo regreso y saldo; de lo contrario se elimina. Una consulta automática no cuenta como regreso.",
    "El termini de 24 hores comença en desar la primera dada o fitxer. Si tornes a obrir l’esborrany durant aquest cicle, en vèncer es renovarà per 1 KC durant 24 hores més. Cada cicle necessita un nou retorn i saldo; si no, s’elimina. Una consulta automàtica no compta com a retorn.",
  ],
  expiresAt: ["Vencimiento del borrador", "Venciment de l’esborrany"],
  renewalEnabled: [
    "Has vuelto a este borrador: al vencer, se renovará por 1 KC si tienes saldo.",
    "Has tornat a aquest esborrany: en vèncer, es renovarà per 1 KC si tens saldo.",
  ],
  expired: [
    "El borrador ha vencido. Vuelve a la lista para comprobar si se ha renovado.",
    "L’esborrany ha vençut. Torna a la llista per comprovar si s’ha renovat.",
  ],
  emailDocument: [
    "Enviar a mi correo verificado",
    "Envia al meu correu verificat",
  ],
  emailQueued: [
    "Envío solicitado. Se procesará en segundo plano. Los errores tendrán reintentos sin ampliar el plazo de conservación.",
    "Enviament sol·licitat. Es processarà en segon pla. Els errors tindran reintents sense ampliar el termini de conservació.",
  ],
  archiveHelp: [
    "Han terminado los 30 días de acceso directo. Se solicita automáticamente una copia por correo; hasta el día 60 puedes pedir su reenvío. Al día 60 se elimina de BoletinExpress, aunque falle el correo.",
    "Han finalitzat els 30 dies d’accés directe. Se sol·licita automàticament una còpia per correu; fins al dia 60 pots demanar-ne el reenviament. Al dia 60 s’elimina de BoletinExpress, encara que falli el correu.",
  ],
  deletionAt: ["Eliminación definitiva", "Eliminació definitiva"],
  creditBalance: ["Saldo de prueba", "Saldo de prova"],
  creditHistory: ["Movimientos de KC", "Moviments de KC"],
  welcomeCredit: [
    "Correo confirmado: regalo de bienvenida",
    "Correu confirmat: regal de benvinguda",
  ],
  validationCredit: ["Validación de documento", "Validació de document"],
  creditHelp: [
    "10 KC de bienvenida una sola vez. BRIE: 2 KC; CIE: 5 KC. Recargas con Stripe en modo pruebas.",
    "10 KC de benvinguda una sola vegada. BRIE: 2 KC; CIE: 5 KC. Recàrregues amb Stripe en mode proves.",
  ],
  validationHelp: [
    "Validar descuenta el coste indicado y cierra esta versión. Se eliminan los datos de trabajo y las fuentes; se conserva el PDF revisado. Revisa ambas páginas antes de confirmar. Validar aquí no certifica el cumplimiento normativo ni añade una firma.",
    "Validar descompta el cost indicat i tanca aquesta versió. S’eliminen les dades de treball i les fonts; es conserva el PDF revisat. Revisa totes dues pàgines abans de confirmar. Validar aquí no certifica el compliment normatiu ni afegeix una signatura.",
  ],
  reviewConfirm: [
    "He revisado las dos páginas y confirmo el cierre de este documento.",
    "He revisat totes dues pàgines i confirmo el tancament d’aquest document.",
  ],
  validateDocument: ["Validar y cerrar", "Valida i tanca"],
  validatedStatus: ["Validado", "Validat"],
  draftStatus: ["Borrador", "Esborrany"],
  validatedHelp: [
    "Documento cerrado. Conserva el PDF revisado y no permite editar los datos. La descarga estará disponible durante 30 días desde la validación.",
    "Document tancat. Conserva el PDF revisat i no permet editar les dades. La descàrrega estarà disponible durant 30 dies des de la validació.",
  ],
  printPdf: ["Abrir PDF para imprimir", "Obre el PDF per imprimir"],
  insufficient_credits: [
    "No tienes KC suficientes. No se ha cobrado ni cerrado el documento.",
    "No tens prou KC. No s’ha cobrat ni tancat el document.",
  ],
  review_invalid: [
    "La revisión no corresponde a esta sesión o documento. Vuelve a abrir el borrador y revisa su PDF.",
    "La revisió no correspon a aquesta sessió o document. Torna a obrir l’esborrany i revisa’n el PDF.",
  ],
  review_expired: [
    "La revisión ha caducado tras 30 minutos. Vuelve a abrir el borrador para revisar el PDF.",
    "La revisió ha caducat després de 30 minuts. Torna a obrir l’esborrany per revisar el PDF.",
  ],
  pdf_not_ready: [
    "El PDF revisado ya no está disponible o ha cambiado. Vuelve a generar y revisar la vista previa. No se ha cobrado.",
    "El PDF revisat ja no està disponible o ha canviat. Torna a generar i revisar la vista prèvia. No s’ha cobrat.",
  ],
  cieManual: ["Completar CIE ELEC-1", "Completa el CIE ELEC-1"],
  cieHelp: [
    "Revisa los datos del perfil y completa titular, emplazamiento y datos técnicos. Elige la actuación, los requisitos y el uso para mostrar sus campos adicionales.",
    "Revisa les dades del perfil i completa titular, emplaçament i dades tècniques. Tria l’actuació, els requisits i l’ús per mostrar els camps addicionals.",
  ],
  cieSafety: [
    "Tú eliges la clasificación e indicas las mediciones. La aplicación no determina el cumplimiento normativo ni añade firmas. El PDF oficial conserva sus textos en catalán.",
    "Tu tries la classificació i indiques les mesures. L’aplicació no determina el compliment normatiu ni afegeix signatures. El PDF oficial conserva els textos en català.",
  ],
  reviewCie: [
    "Revisar las dos páginas del CIE",
    "Revisa les dues pàgines del CIE",
  ],
  cieInput: [
    "Revisa los campos indicados: códigos postales de cinco cifras y opciones válidas del modelo. Los datos del perfil se conservan tal como los guardaste; corrígelos aquí si es necesario.",
    "Revisa els camps indicats: codis postals de cinc xifres i opcions vàlides del model. Les dades del perfil es conserven tal com les vas desar; corregeix-les aquí si cal.",
  ],
  cieBranchChange: [
    "Hay datos de una selección anterior que ya no se aplican. Al guardar se excluirán del borrador y del PDF. Puedes recuperar la selección anterior antes de guardar.",
    "Hi ha dades d’una selecció anterior que ja no s’apliquen. En desar s’exclouran de l’esborrany i del PDF. Pots recuperar la selecció anterior abans de desar.",
  ],
  profile: ["Mi perfil", "El meu perfil"],
  profileHelp: [
    "Guarda los datos de empresa e instalador una vez. Se copiarán a los documentos nuevos; podrás revisarlos en cada borrador.",
    "Desa les dades d’empresa i instal·lador una vegada. Es copiaran als documents nous; les podràs revisar a cada esborrany.",
  ],
  profileRetention: [
    "El perfil se conserva en tu cuenta para reutilizarlo. Cambiarlo no modifica los documentos anteriores. No guardamos firmas. Utiliza datos ficticios.",
    "El perfil es conserva al teu compte per reutilitzar-lo. Canviar-lo no modifica els documents anteriors. No desem signatures. Fes servir dades fictícies.",
  ],
  saveProfile: ["Guardar perfil", "Desa el perfil"],
  profileSaved: [
    "Perfil guardado. Se utilizará en tus próximos documentos.",
    "Perfil desat. S’utilitzarà als teus propers documents.",
  ],
  brieManual: ["Completar BRIE", "Completa el BRIE"],
  brieHelp: [
    "Revisa los datos copiados de tu perfil y completa los del local, titular e instalación. Puedes guardar aunque falten datos.",
    "Revisa les dades copiades del perfil i completa les del local, titular i instal·lació. Pots desar encara que faltin dades.",
  ],
  brieSafety: [
    "Tú indicas las mediciones y la existencia de defectos. La aplicación no determina el cumplimiento normativo ni añade datos o firmas.",
    "Tu indiques les mesures i l’existència de defectes. L’aplicació no determina el compliment normatiu ni afegeix dades o signatures.",
  ],
  emptyFields: ["Campos sin rellenar", "Camps sense emplenar"],
  emptyHelp: [
    "Algunos campos pueden no corresponder a tu caso. Revisa cuáles necesitas completar; no se rellenan automáticamente.",
    "Alguns camps poden no correspondre al teu cas. Revisa quins necessites completar; no s’emplenen automàticament.",
  ],
  revision: ["Revisión", "Revisió"],
  unsavedConfirm: [
    "Hay cambios sin guardar. ¿Quieres salir y descartarlos?",
    "Hi ha canvis sense desar. Vols sortir i descartar-los?",
  ],
  saveDraft: ["Guardar borrador", "Desa l’esborrany"],
  draftSaved: ["Borrador guardado.", "Esborrany desat."],
  saveBeforePreview: [
    "Guarda los cambios antes de generar otra vista previa.",
    "Desa els canvis abans de generar una altra vista prèvia.",
  ],
  generatePreview: ["Generar vista previa PDF", "Genera la vista prèvia PDF"],
  generating: ["Generando PDF…", "Generant el PDF…"],
  reviewBrie: [
    "Revisar las dos páginas del BRIE",
    "Revisa les dues pàgines del BRIE",
  ],
  previewDraftNotice: [
    "Borrador de evaluación, sin firmas. Esta vista previa no valida el documento ni consume KC. Si corriges los datos, tendrás que generar otra revisión.",
    "Esborrany d’avaluació, sense signatures. Aquesta vista prèvia no valida el document ni consumeix KC. Si corregeixes les dades, hauràs de generar una altra revisió.",
  ],
  openPreview: [
    "Abrir PDF en otra pestaña",
    "Obre el PDF en una altra pestanya",
  ],
  pdfFit: [
    "No se ha generado el PDF: revisa los campos indicados. Su contenido no cabe o incluye caracteres que la fuente no admite. No se recorta el texto.",
    "No s’ha generat el PDF: revisa els camps indicats. El contingut no hi cap o inclou caràcters que la font no admet. El text no es retalla.",
  ],
  conflict: [
    "Este registro cambió en otra pestaña. Vuelve a abrirlo antes de guardar; tus cambios no han sobrescrito la otra versión.",
    "Aquest registre ha canviat en una altra pestanya. Torna’l a obrir abans de desar; els teus canvis no han sobreescrit l’altra versió.",
  ],
  brand: ["BoletinExpress", "BoletinExpress"],
  home: ["Volver al inicio", "Torna a l’inici"],
  language: ["Idioma", "Idioma"],
  notice: [
    "Evaluación · utiliza únicamente datos ficticios",
    "Avaluació · fes servir només dades fictícies",
  ],
  login: ["Acceder a mi cuenta", "Accedeix al meu compte"],
  signup: ["Crear cuenta", "Crea un compte"],
  recover: ["Recuperar contraseña", "Recupera la contrasenya"],
  resend: ["Reenviar confirmación", "Torna a enviar la confirmació"],
  email: ["Correo electrónico", "Correu electrònic"],
  password: [
    "Contraseña (mínimo 12 caracteres)",
    "Contrasenya (mínim 12 caràcters)",
  ],
  newPassword: [
    "Nueva contraseña (mínimo 12 caracteres)",
    "Contrasenya nova (mínim 12 caràcters)",
  ],
  loginHelp: [
    "Accede con tu correo confirmado.",
    "Accedeix amb el correu confirmat.",
  ],
  signupHelp: [
    "Te enviaremos un enlace para confirmar el correo. Usa una dirección de evaluación.",
    "T’enviarem un enllaç per confirmar el correu. Fes servir una adreça d’avaluació.",
  ],
  recoverHelp: [
    "Recibirás un enlace si el correo tiene una cuenta.",
    "Rebràs un enllaç si el correu té un compte.",
  ],
  resendHelp: [
    "Solicita un nuevo enlace si aún no has confirmado tu cuenta.",
    "Demana un enllaç nou si encara no has confirmat el compte.",
  ],
  localMailHelp: [
    "Las cuentas ficticias .invalid usan el buzón de pruebas. Con el correo externo activado, las direcciones reales reciben allí sus enlaces. Abre los enlaces en el Mac donde funciona esta aplicación local.",
    "Els comptes ficticis .invalid fan servir la bústia de proves. Amb el correu extern activat, les adreces reals hi reben els enllaços. Obre els enllaços al Mac on funciona aquesta aplicació local.",
  ],
  localMailOpen: ["Abrir buzón de pruebas", "Obre la bústia de proves"],
  sent: [
    "Si procede, recibirás el enlace. Revisa tu correo y vuelve para acceder.",
    "Si escau, rebràs l’enllaç. Revisa el correu i torna per accedir.",
  ],
  working: ["Procesando…", "Processant…"],
  confirm: ["Confirmar mi correo", "Confirma el meu correu"],
  confirmHelp: [
    "Pulsa para utilizar el enlace de confirmación. Se consume una sola vez.",
    "Prem per fer servir l’enllaç de confirmació. Es consumeix una sola vegada.",
  ],
  recoveryConfirm: [
    "Continuar con la recuperación",
    "Continua amb la recuperació",
  ],
  reset: ["Guardar nueva contraseña", "Desa la contrasenya nova"],
  resetHelp: [
    "Después del cambio tendrás que acceder de nuevo. Se cerrarán las sesiones anteriores.",
    "Després del canvi hauràs d’accedir de nou. Es tancaran les sessions anteriors.",
  ],
  resetDone: [
    "Contraseña actualizada. Ya puedes acceder de nuevo.",
    "Contrasenya actualitzada. Ja pots tornar a accedir.",
  ],
  session: [
    "Tu sesión ha terminado. Accede de nuevo.",
    "La sessió ha finalitzat. Torna a accedir.",
  ],
  credentials: [
    "No se ha podido acceder. Comprueba el correo, la contraseña y la confirmación.",
    "No s’ha pogut accedir. Comprova el correu, la contrasenya i la confirmació.",
  ],
  registration: [
    "No se ha podido crear la cuenta. Revisa los datos o solicita otro enlace.",
    "No s’ha pogut crear el compte. Revisa les dades o demana un altre enllaç.",
  ],
  link: [
    "El enlace no es válido o ha caducado. Solicita uno nuevo.",
    "L’enllaç no és vàlid o ha caducat. Demana’n un de nou.",
  ],
  rate: [
    "Demasiados intentos. Espera un minuto antes de volver a probar.",
    "Massa intents. Espera un minut abans de tornar-ho a provar.",
  ],
  unavailable: [
    "El servicio no está disponible. Vuelve a intentarlo.",
    "El servei no està disponible. Torna-ho a provar.",
  ],
  input: ["Revisa los datos introducidos.", "Revisa les dades introduïdes."],
  origin: [
    "La petición no está autorizada. Recarga la página.",
    "La petició no està autoritzada. Torna a carregar la pàgina.",
  ],
  size: [
    "El PDF debe ocupar como máximo 2 MB.",
    "El PDF ha d’ocupar com a màxim 2 MB.",
  ],
  format: ["Selecciona un archivo PDF.", "Selecciona un fitxer PDF."],
  pdf: ["El archivo no parece un PDF.", "El fitxer no sembla un PDF."],
  upload: [
    "No se ha podido completar la subida. Vuelve a intentarlo.",
    "No s’ha pogut completar la pujada. Torna-ho a provar.",
  ],
  not_found: [
    "No se ha encontrado el documento o archivo.",
    "No s’ha trobat el document o fitxer.",
  ],
  closed: ["Este documento está cerrado.", "Aquest document està tancat."],
  draft_limit: [
    "Ya tienes tres borradores activos.",
    "Ja tens tres esborranys actius.",
  ],
  file_limit: [
    "No se puede añadir otro archivo a este documento.",
    "No es pot afegir cap altre fitxer a aquest document.",
  ],
  account: ["Mi cuenta", "El meu compte"],
  logout: ["Cerrar sesión", "Tanca la sessió"],
  privateTitle: ["Tus documentos privados", "Els teus documents privats"],
  privateHelp: [
    "Guarda tu perfil profesional y prepara un BRIE o un CIE ELEC-1 con tus datos.",
    "Desa el teu perfil professional i prepara un BRIE o un CIE ELEC-1 amb les teves dades.",
  ],
  create: ["Crear borrador privado", "Crea un esborrany privat"],
  title: ["Nombre de prueba", "Nom de prova"],
  type: ["Modelo", "Model"],
  empty: ["Todavía no tienes documentos.", "Encara no tens documents."],
  open: ["Abrir", "Obre"],
  back: ["Volver a mis documentos", "Torna als meus documents"],
  files: ["Archivos privados de prueba", "Fitxers privats de prova"],
  filesHelp: [
    "Adjunta un PDF ficticio para comprobar el almacenamiento privado (máximo 2 MB y cinco archivos).",
    "Adjunta un PDF fictici per comprovar l’emmagatzematge privat (màxim 2 MB i cinc fitxers).",
  ],
  file: ["PDF ficticio", "PDF fictici"],
  uploadButton: ["Guardar PDF privado", "Desa el PDF privat"],
  uploaded: ["PDF guardado en tu cuenta.", "PDF desat al teu compte."],
  noFiles: [
    "Este borrador todavía no tiene archivos.",
    "Aquest esborrany encara no té fitxers.",
  ],
  preview: ["Ver PDF", "Mostra el PDF"],
  download: ["Descargar PDF", "Descarrega el PDF"],
  loading: ["Cargando…", "Carregant…"],
  phase3: ["Tu cuenta y tus documentos", "El teu compte i els teus documents"],
} as const satisfies Record<string, readonly [string, string]>;
export type AuthKey = keyof typeof authCopy;
export function authText(locale: Locale, key: AuthKey) {
  return authCopy[key][locale === "ca" ? 1 : 0];
}
