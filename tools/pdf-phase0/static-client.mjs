import { getDocument, GlobalWorkerOptions } from '/pdf.mjs';
GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
window.staticProbe = { ready:false, error:null };
try {
  const doc = await getDocument({url:'/fixture.pdf',isEvalSupported:false,useSystemFonts:false,standardFontDataUrl:'/fonts/'}).promise;
  const pages=[];
  for(let number=1;number<=doc.numPages;number++) {
    const page=await doc.getPage(number);
    const viewport=page.getViewport({scale:2});
    const canvas=document.createElement('canvas');
    canvas.width=viewport.width; canvas.height=viewport.height;
    canvas.style.width=`${viewport.width/2}px`; canvas.style.height=`${viewport.height/2}px`;
    document.getElementById('pages').append(canvas);
    await page.render({canvas,viewport}).promise;
    const content=await page.getTextContent();
    pages.push({number,width:viewport.width/2,height:viewport.height/2,text:content.items.filter(i=>i.str!==undefined).map(i=>({text:i.str,x:i.transform[4],y:i.transform[5],width:i.width,height:i.height}))});
  }
  window.staticProbe={ready:true,error:null,pages};
} catch(error) { window.staticProbe={ready:true,error:String(error)}; }
