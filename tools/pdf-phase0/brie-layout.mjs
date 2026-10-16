// Coordenadas PDF en puntos; origen abajo a la izquierda. No son reglas normativas.
const text = (page,x,y,width,sample,extra={}) => ({page,type:'text',x,y,width,height:10,fontSize:8,sample,...extra});
const yesNo = (page,yes,no,sample) => ({page,type:'boolean',yes,no,sample});
const box = (x,y) => ({x,y,width:6.5,height:6.5});

export const brieFields = {
  exemplar: {page:0,type:'enum',choices:{titular:box(86.5,734),distribuidora:box(86.5,722),installadora:box(86.5,710)},sample:'titular'},
  empresa_nom:text(0,86,669,206,'INSTAL·LACIONS PROVA SL'),
  empresa_telefon:text(0,300,669,70,'000000000'),
  empresa_rasic:text(0,378,669,180,'PROVA-0000'),
  installador_nom:text(0,89,645,280,'PERSONA INSTAL·LADORA FICTÍCIA'),
  installador_nif:text(0,377,645,49,'00000000T'),
  installador_dni:text(0,431,645,130,'00000000T'),
  activitat_anterior:text(0,86,607,172,'Habitatge de prova'),
  activitat_actual:text(0,266,607,205,'Habitatge de prova'),
  superficie:text(0,482,607,77,'80'),
  local_carrer:text(0,86,578,242,'Carrer de la Prova Fictícia'),
  local_numero:text(0,338,578,70,'10'),
  local_pis:text(0,418,578,66,'2'),
  local_porta:text(0,493,578,68,'A'),
  local_municipi:text(0,86,558,395,'Municipi de prova'),
  local_cp:text(0,493,558,68,'00000'),
  titular_nom:text(0,89,527,316,'TITULAR FICTICI DE PROVA'),
  titular_nif:text(0,416,527,144,'00000000T'),
  titular_domicili:text(0,89,507,266,'Carrer Fictici, 20'),
  titular_municipi:text(0,366,507,194,'Municipi de prova'),
  titular_telefon:text(0,89,487,393,'000000000'),
  titular_cp:text(0,494,487,66,'00000'),
  treball:text(0,86,463,472,'DADES FICTÍCIES. Prova de posició dels camps.\nAquest exemple no acredita cap instal·lació.',{multiline:true,height:21}),
  diferencial_1_nombre:text(0,111,396,40,'1'),
  diferencial_1_in:text(0,164,396,29,'40'),
  diferencial_1_sensibilitat:text(0,232,396,22,'30'),
  diferencial_2_nombre:text(0,111,384,40,'1'),
  diferencial_2_in:text(0,164,384,29,'25'),
  diferencial_2_sensibilitat:text(0,232,384,22,'30'),
  seccio_derivacio:text(0,414,407,64,'10'),
  terra_existeix:yesNo(0,box(330,385),box(330,373),true),
  resistencia_terra:text(0,387,385,61,'12'),
  resistencia_aillament:text(0,391,361,57,'1000000'),
  potencia_maxima:text(0,215,334,46,'9,2'),
  potencia_inicial:text(0,215,324,46,'5,75'),
  potencia_contractar:text(0,215,314,46,'5,75'),
  tensio_anterior:text(0,408,344,46,'230'),
  tensio_actual:text(0,408,334,46,'230'),
  intensitat_iga:text(0,408,324,46,'40'),
  intensitat_icpm:text(0,408,314,46,'25'),
  ascensor:yesNo(0,box(279,297),box(312,297),false),
  potencia_ascensor:text(0,477,296,74,'0'),
  certificat_nom:text(0,108,263,274,'PERSONA INSTAL·LADORA FICTÍCIA'),
  certificat_dni:text(0,101,253,48,'00000000T'),
  certificat_rasic:text(0,372,253,72,'PROVA-0000'),
  lloc_data:text(0,133,146,423,'Municipi de prova, 15/10/2026'),
  defecte_3_tensio:text(1,368,652,21,'',{fontSize:7}),
  defecte_10_descripcio:text(1,174,489,383,'Prova fictícia del camp de descripció.',{multiline:true,height:43}),
  comentaris:text(1,89,296,468,'DADES FICTÍCIES PER AVALUAR EL PROGRAMARI.\nNo és un certificat vàlid ni una verificació tècnica.',{multiline:true,height:38}),
};

const defectBaselines=[701.7,680.5,656.5,631,604.4,579.7,558.7,538.9,519.1,503.1];
for(let i=0;i<defectBaselines.length;i++) {
  brieFields[`defecte_${i+1}`]=yesNo(1,box(90.5,defectBaselines[i]+0.8),box(121,defectBaselines[i]+0.8),i===9);
}

export const brieFixture=Object.fromEntries(Object.entries(brieFields).map(([name,field])=>[name,field.sample]));
