import {PDFDocument} from 'pdf-lib';

const mm=n=>n*72/25.4;
export const flowMetrics={
  classHeight:mm(6),detailHeight:mm(13.5),otherHeight:mm(12.5),separatorHeight:mm(3.822),
  classBottomLine:89.6,technicalTop:768.31,
};

export function planCieFlow(values) {
  const classField=values.RB_Requisits==='P1'?'TXT_P1':values.RB_Requisits==='P2'?'TXT_P2':null;
  const detailField=values.TXT_Us==='g'?'TXT_G':values.TXT_Us==='h'?'TXT_H':values.TXT_Us==='14'?'AltresUsos':null;
  const classShift=classField?flowMetrics.classHeight:0;
  const detailHeight=detailField==='AltresUsos'?flowMetrics.otherHeight:detailField?flowMetrics.detailHeight:0;
  const technicalShift=detailField?detailHeight+flowMetrics.separatorHeight:0;
  return {classField,detailField,classShift,detailHeight,technicalShift};
}

// Se recortan y trasladan los vectores de la base; no se tapan textos con blanco.
export async function composeCieBackground(source,plan) {
  const components=[];
  if(!plan.classField && !plan.detailField) return {pdf:source,components:[{kind:'unchanged',sourcePages:[0,1]}]};
  const pdf=await PDFDocument.create();
  const pages=[pdf.addPage([595,842]),pdf.addPage([595,842])];
  async function part(sourcePage,targetPage,box,dx=0,dy=0,role='') {
    const [left,bottom,right,top]=box;
    const embedded=await pdf.embedPage(source.getPage(sourcePage),{left,bottom,right,top});
    pages[targetPage].drawPage(embedded,{x:left+dx,y:bottom+dy});
    components.push({role,sourcePage,targetPage,box,dx,dy});
  }
  // Parte común, con la línea bajo los botones; el pie permanece en su página.
  await part(0,0,[0,88,595,842],0,0,'page1-common');
  await part(0,0,[0,0,595,20],0,0,'page1-footer');
  await part(0,0,[0,plan.detailField?51:39,595,88],0,-plan.classShift,'primary-use');
  if(!plan.detailField) {
    await part(1,1,[0,0,595,842],0,0,'page2-unchanged');
  } else {
    // Master: logotipo, código vertical y pie. Cuerpo técnico con su firma vacía.
    await part(1,1,[0,770,595,842],0,0,'page2-header');
    await part(1,1,[0,0,595,260],0,0,'page2-footer');
    await part(1,1,[83,260,569,770],0,-plan.technicalShift,'technical-body');
    // Separador original tras el detalle; coincide con la cabecera técnica.
    const destination=flowMetrics.technicalTop-plan.technicalShift;
    await part(0,1,[83,39,569,42],0,destination-40.49,'detail-separator');
    if(plan.detailField==='AltresUsos') {
      // El texto libre tiene además un borde inferior, presente en el XFA.
      await part(0,1,[83,88,569,91],0,flowMetrics.technicalTop-plan.detailHeight-89.6,'other-use-bottom-border');
    }
  }
  return {pdf,components};
}

export function placeCieField(name,field,plan) {
  if(name===plan.classField) return {...field,page:0,rect:{x:87.874015748,y:flowMetrics.classBottomLine-flowMetrics.classHeight+72/25.4,width:476.217637795,height:72/25.4*4},placementStatus:'DERIVADO_XFA_Y_CONTRASTADO_P1_ADOBE'};
  if(name===plan.detailField) {
    const top=flowMetrics.technicalTop;
    return {...field,page:1,rect:{x:87.874015748,y:top-plan.detailHeight+72/25.4,width:476.217637795,height:plan.detailHeight-72/25.4*7},labelRect:{x:87.874015748,y:top-14.2,width:476.217637795,height:12},placementStatus:'DERIVADO_XFA_Y_CONTRASTADO_G_ADOBE'};
  }
  if(name==='TXT_Us') return {...field,rect:{...field.rect,y:field.rect.y-plan.classShift}};
  if(field.page===1 && plan.technicalShift) {
    const move=r=>({...r,y:r.y-plan.technicalShift});
    return {...field,rect:field.rect?move(field.rect):undefined,choices:field.type==='enumMark'?Object.fromEntries(Object.entries(field.choices).map(([k,r])=>[k,move(r)])):field.choices,valueRect:field.valueRect?move(field.valueRect):undefined};
  }
  return field;
}
