export type FieldValue = string | boolean;
export type FieldValues = Record<string, FieldValue>;
export type FormField = {
  key: string;
  label: readonly [string, string];
  section: string;
  type?: "boolean" | "enum" | "multiline";
  choices?: readonly { value: string; label: readonly [string, string] }[];
  max?: number;
};
const field = (
  key: string,
  es: string,
  ca: string,
  section: string,
  extra: Partial<FormField> = {},
): FormField => ({ key, label: [es, ca], section, ...extra });
export const profileFields: FormField[] = [
  field(
    "empresa_nom",
    "Empresa instaladora",
    "Empresa instal·ladora",
    "company",
    { max: 180 },
  ),
  field("empresa_nif", "NIF de la empresa", "NIF de l’empresa", "company", {
    max: 30,
  }),
  field(
    "empresa_telefon",
    "Teléfono de la empresa",
    "Telèfon de l’empresa",
    "company",
    { max: 30 },
  ),
  field(
    "empresa_rasic",
    "Inscripción RASIC (si corresponde)",
    "Inscripció RASIC (si correspon)",
    "company",
    { max: 60 },
  ),
  field(
    "installador_nom",
    "Nombre y apellidos del instalador",
    "Nom i cognoms de l’instal·lador",
    "installer",
    { max: 180 },
  ),
  field(
    "installador_nif",
    "NIF del instalador (campo NIF del BRIE)",
    "NIF de l’instal·lador (camp NIF del BRIE)",
    "installer",
    { max: 30 },
  ),
  field(
    "installador_dni",
    "DNI del instalador",
    "DNI de l’instal·lador",
    "installer",
    { max: 30 },
  ),
  field(
    "installador_categoria",
    "Categoría del instalador (CIE)",
    "Categoria de l’instal·lador (CIE)",
    "installer",
    { max: 60 },
  ),
  ...[
    ["via_tipo", "Tipo de vía", "Tipus de via"],
    ["via_nom", "Nombre de vía", "Nom de la via"],
    ["numero", "Número", "Número"],
    ["bloc", "Bloque", "Bloc"],
    ["escala", "Escalera", "Escala"],
    ["pis", "Piso", "Pis"],
    ["porta", "Puerta", "Porta"],
    ["cp", "Código postal", "Codi postal"],
    ["municipi", "Municipio", "Municipi"],
    ["correu", "Correo profesional", "Correu professional"],
  ].map(([key, es, ca]) =>
    field(`empresa_${key}`, es, ca, "address", { max: 120 }),
  ),
];
export const brieFields: FormField[] = [
  field("exemplar", "Ejemplar para", "Exemplar per a", "professional", {
    type: "enum",
    choices: [
      { value: "titular", label: ["Titular", "Titular"] },
      { value: "distribuidora", label: ["Distribuidora", "Distribuïdora"] },
      {
        value: "installadora",
        label: ["Empresa instaladora", "Empresa instal·ladora"],
      },
    ],
  }),
  ...profileFields
    .filter((f) =>
      [
        "empresa_nom",
        "empresa_telefon",
        "empresa_rasic",
        "installador_nom",
        "installador_nif",
        "installador_dni",
      ].includes(f.key),
    )
    .map((f) => ({ ...f, section: "professional" })),
  ...[
    ["activitat_anterior", "Actividad anterior", "Activitat anterior"],
    ["activitat_actual", "Actividad actual", "Activitat actual"],
    ["superficie", "Superficie (m²)", "Superfície (m²)"],
    ["local_carrer", "Calle o lugar", "Carrer o indret"],
    ["local_numero", "Número", "Número"],
    ["local_pis", "Piso", "Pis"],
    ["local_porta", "Puerta", "Porta"],
    ["local_municipi", "Municipio", "Municipi"],
    ["local_cp", "Código postal", "Codi postal"],
  ].map(([key, es, ca]) => field(key, es, ca, "premises")),
  ...[
    [
      "titular_nom",
      "Nombre y apellidos del titular",
      "Nom i cognoms del titular",
    ],
    ["titular_nif", "NIF del titular", "NIF del titular"],
    ["titular_domicili", "Domicilio del titular", "Domicili del titular"],
    ["titular_municipi", "Municipio del titular", "Municipi del titular"],
    ["titular_telefon", "Teléfono del titular", "Telèfon del titular"],
    ["titular_cp", "Código postal del titular", "Codi postal del titular"],
  ].map(([key, es, ca]) => field(key, es, ca, "holder")),
  field("treball", "Trabajo realizado", "Treball realitzat", "technical", {
    type: "multiline",
    max: 600,
  }),
  ...[1, 2].flatMap((i) => [
    field(
      `diferencial_${i}_nombre`,
      `Diferencial ${i}: número`,
      `Diferencial ${i}: nombre`,
      "technical",
    ),
    field(
      `diferencial_${i}_in`,
      `Diferencial ${i}: In (A)`,
      `Diferencial ${i}: In (A)`,
      "technical",
    ),
    field(
      `diferencial_${i}_sensibilitat`,
      `Diferencial ${i}: sensibilidad (mA)`,
      `Diferencial ${i}: sensibilitat (mA)`,
      "technical",
    ),
  ]),
  ...[
    [
      "seccio_derivacio",
      "Sección derivación individual (mm²)",
      "Secció derivació individual (mm²)",
    ],
    [
      "resistencia_terra",
      "Resistencia de tierra (Ω)",
      "Resistència de terra (Ω)",
    ],
    [
      "resistencia_aillament",
      "Resistencia de aislamiento (Ω)",
      "Resistència d’aïllament (Ω)",
    ],
    [
      "potencia_maxima",
      "Potencia máxima admisible (kW)",
      "Potència màxima admissible (kW)",
    ],
    ["potencia_inicial", "Potencia inicial (kW)", "Potència inicial (kW)"],
    [
      "potencia_contractar",
      "Potencia a contratar (kW)",
      "Potència a contractar (kW)",
    ],
    ["tensio_anterior", "Tensión anterior (V)", "Tensió anterior (V)"],
    ["tensio_actual", "Tensión actual (V)", "Tensió actual (V)"],
    ["intensitat_iga", "Intensidad IGA (A)", "Intensitat IGA (A)"],
    ["intensitat_icpm", "Intensidad ICPM (A)", "Intensitat ICPM (A)"],
  ].map(([key, es, ca]) => field(key, es, ca, "technical")),
  field(
    "terra_existeix",
    "¿Existe tierra de protección?",
    "Existeix terra de protecció?",
    "technical",
    { type: "boolean" },
  ),
  field(
    "ascensor",
    "¿Alimenta un ascensor?",
    "Alimenta un ascensor?",
    "technical",
    { type: "boolean" },
  ),
  field(
    "potencia_ascensor",
    "Potencia del ascensor",
    "Potència de l’ascensor",
    "technical",
  ),
  field(
    "certificat_nom",
    "Nombre del instalador en la declaración",
    "Nom de l’instal·lador a la declaració",
    "declaration",
    { max: 180 },
  ),
  field(
    "certificat_dni",
    "DNI en la declaración",
    "DNI a la declaració",
    "declaration",
  ),
  field(
    "certificat_rasic",
    "Inscripción en la declaración",
    "Inscripció a la declaració",
    "declaration",
  ),
  field(
    "lloc_data",
    "Lugar y fecha (escritos por ti)",
    "Lloc i data (escrits per tu)",
    "declaration",
    { max: 180 },
  ),
  ...[
    ["Contactos directos", "Contactes directes"],
    [
      "Receptores o mecanismos en volumen prohibido de baño/ducha",
      "Receptors o mecanismes en volum prohibit de bany/dutxa",
    ],
    [
      "Protección insuficiente contra contactos indirectos",
      "Protecció insuficient contra contactes indirectes",
    ],
    [
      "Falta de protección general de corte omnipolar",
      "Manca de protecció general de tall omnipolar",
    ],
    [
      "Protección inadecuada contra cortocircuitos y sobrecargas",
      "Protecció inadequada contra curtcircuits i sobrecàrregues",
    ],
    [
      "Resistencia de aislamiento insuficiente",
      "Resistència d’aïllament insuficient",
    ],
    ["Exceso de corriente de fuga", "Excés de corrent de fuita"],
    ["Resistencia de tierra excesiva", "Resistència de terra excessiva"],
    ["Caída de tensión excesiva", "Caiguda de tensió excessiva"],
    ["Otros defectos", "Altres defectes"],
  ].map(([es, ca], i) =>
    field(
      `defecte_${i + 1}`,
      `${i + 1}. ¿Existe este defecto? ${es}`,
      `${i + 1}. Existeix aquest defecte? ${ca}`,
      "defects",
      { type: "boolean" },
    ),
  ),
  field(
    "defecte_3_tensio",
    "Tensión indicada en el defecto 3 (V)",
    "Tensió indicada al defecte 3 (V)",
    "defects",
  ),
  field(
    "defecte_10_descripcio",
    "Descripción del defecto 10",
    "Descripció del defecte 10",
    "defects",
    { type: "multiline", max: 600 },
  ),
  field("comentaris", "Comentarios", "Comentaris", "defects", {
    type: "multiline",
    max: 600,
  }),
];
export function normalizeFields(
  value: unknown,
  schema: FormField[],
): FieldValues {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("input");
  const result: FieldValues = {};
  for (const [key, v] of Object.entries(value)) {
    const f = schema.find((f) => f.key === key);
    if (!f) throw new Error("input");
    if (f.type === "boolean") {
      if (typeof v !== "boolean") throw new Error("input");
    } else {
      if (
        typeof v !== "string" ||
        v.length > (f.max || 180) ||
        [...v].some(
          (c) => c.charCodeAt(0) < 32 && !["\n", "\r", "\t"].includes(c),
        )
      )
        throw new Error("input");
      if (
        f.type === "enum" &&
        v !== "" &&
        !f.choices?.some((c) => c.value === v)
      )
        throw new Error("input");
    }
    result[key] = typeof v === "string" ? v.replaceAll("\r\n", "\n") : v;
  }
  return result;
}
