import {cieFields} from './cie.mjs';

// Datos inventados exclusivamente para comprobar la escritura del documento.
export const cieFixture={
  NomCognoms:'TITULAR FICTICI - PROVA DE PROGRAMARI',NIF:'FICTICI01',
  CBO_TipusVia:'CAR',TXT_NomVia:'Exemple fictici',TXT_Num:'12',TXT_Bloc:'A',TXT_Escala:'1',TXT_Pis:'2',TXT_Porta:'1',TXT_CodiPostal:'08001',TXT_Poblacio:'POBLACIÓ FICTÍCIA',TXT_Tel:'000000001',TXT_Correu:'titular@example.invalid',
  NomCognoms_2:'EMPRESA FICTÍCIA DE PROVES',TXT_Rasic:'FICTICI-RASIC',NIF_2:'FICTICI02',NomCognomsInstalador:'PERSONA INSTAL·LADORA FICTÍCIA',TXT_Categoria:'Bàsica',DNIInstallador:'FICTICI03',
  CBO_TipusVia_2:'AVI',TXT_NomVia_2:'Proves',TXT_Num_2:'5',TXT_Bloc_2:'B',TXT_Escala_2:'2',TXT_Pis_2:'1',TXT_Porta_2:'3',TXT_CodiPostal_2:'08002',TXT_Poblacio_2:'POBLACIÓ FICTÍCIA',TXT_Tel_2:'000000002',TXT_Correu_2:'empresa@example.invalid',
  CBO_TipusVia_3:'CAR',TXT_NomVia_3:'Instal·lació fictícia',TXT_Num_3:'42',TXT_Bloc_3:'C',TXT_Escala_3:'1',TXT_Pis_3:'3',TXT_Porta_3:'2',TXT_CodiPostal_3:'08003',TXT_Poblacio_3:'POBLACIÓ FICTÍCIA',TXT_Tel_3:'000000003',TXT_Correu_3:'local@example.invalid',
  RB_TipusActuacio:'NOVA',RB_Requisits:'MEMORIA',TXT_Us:'5',
  TXT_PotenciaMax:'9,2',TXT_Calibre:'63',TXT_Tensio:'230 V',TXT_IGM:'63',TXT_Circuits:'8',TXT_SeccioLGA:'16',TXT_MaterialConductor:'Coure',TXT_ResistenciaConductors:'500',TXT_UbicacioComptadors:'Armari',TXT_AillamentTerra:'500',TXT_ResistenciaTerra:'12',TXT_Interruptor:'40',TXT_Tecnologia:'FOTOVOLTAICA FICTÍCIA',TXT_TipusConnexio:'Interconnectada',RB_Subministrament:'NO',TXT_Potencia:'3',
  NomCognomsInstalador_2:'PERSONA INSTAL·LADORA FICTÍCIA',TXT_Observacions:'PROVA FICTÍCIA. NO ÉS UN CERTIFICAT VÀLID. SENSE SIGNATURA.\nValors inventats per provar el PDF; no acrediten mesures ni compliment.\nMostra per revisar i acceptar la fase 0 del programari.',
};
const first=name=>Object.keys(cieFields[name].choices)[0];
export const cieCases=[
  {id:'base',values:{...cieFixture}},
  {id:'ampliacio_50',values:{...cieFixture,RB_TipusActuacio:'AMPLIACIO',TXT_CUPS:'ES-FICTICI-0000000000',DDLAmpliaMod:'SI'},expected:['DDLAmpliaMod']},
  {id:'modificacio_50',values:{...cieFixture,RB_TipusActuacio:'MODIFICACIO',TXT_CUPS:'ES-FICTICI-0000000000',DDLAmpliaMod:'NO'},expected:['DDLAmpliaMod']},
  {id:'classe_p1',values:{...cieFixture,RB_Requisits:'P1',TXT_P1:first('TXT_P1')},expected:['TXT_P1']},
  {id:'classe_p2',values:{...cieFixture,RB_Requisits:'P2',TXT_P2:first('TXT_P2')},expected:['TXT_P2']},
  {id:'us_g',values:{...cieFixture,TXT_Us:'g',TXT_G:first('TXT_G')},expected:['TXT_G']},
  {id:'us_h',values:{...cieFixture,TXT_Us:'h',TXT_H:'h6) Bar, cafeteria, restaurant o similar'},expected:['TXT_H']},
  {id:'altres_usos',values:{...cieFixture,TXT_Us:'14',AltresUsos:'Ús fictici d’avaluació'},expected:['AltresUsos']},
  {id:'tensio_altra',values:{...cieFixture,TXT_Tensio:'Altra',InfoTensioAltre:'3 x 230 V'},expected:['InfoTensioAltre']},
  {id:'auditori_ref',values:{...cieFixture,RB_Requisits:'P1',TXT_P1:first('TXT_P1'),TXT_Us:'g',TXT_G:'g3) Auditori'},expected:['TXT_P1','TXT_G']},
  {id:'incomplet',values:{NomCognoms:'BORRADOR FICTICI',RB_TipusActuacio:'AMPLIACIO',RB_Requisits:'P1',TXT_Tensio:'Altra',TXT_Observacions:'PROVA INCOMPLETA. NO ÉS UN CERTIFICAT VÀLID. SENSE SIGNATURA.'},expected:[]},
];
