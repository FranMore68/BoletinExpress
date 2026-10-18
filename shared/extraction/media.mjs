// The browser converts audio to canonical PCM mono WAV; duration comes from bytes.
export function sourceMedia(bytes, mime) {
  if (!bytes.length || bytes.length > 2097152) throw Error('size');
  if (mime === 'audio/wav') {
    if(bytes.length<44||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE'||bytes.readUInt32LE(4)+8!==bytes.length||bytes.toString('ascii',12,16)!=='fmt '||bytes.readUInt32LE(16)!==16||bytes.readUInt16LE(20)!==1||bytes.readUInt16LE(22)!==1||bytes.readUInt32LE(24)!==16000||bytes.readUInt32LE(28)!==32000||bytes.readUInt16LE(32)!==2||bytes.readUInt16LE(34)!==16||bytes.toString('ascii',36,40)!=='data'||bytes.readUInt32LE(40)!==bytes.length-44||(bytes.length-44)%2)throw Error('format');
    const seconds=Math.ceil((bytes.length-44)/32000);if(seconds<1||seconds>60)throw Error('audio_limit');
    return {kind:'audio',mime:'audio/wav',extension:'wav',seconds};
  }
  let width=0,height=0,extension;
  if(mime==='image/png'&&bytes.length>=24&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&bytes.toString('ascii',12,16)==='IHDR'){width=bytes.readUInt32BE(16);height=bytes.readUInt32BE(20);extension='png';}
  if(mime==='image/jpeg'&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255){
    extension='jpg';let p=2;
    while(p+4<=bytes.length){if(bytes[p++]!==255)throw Error('format');while(bytes[p]===255)p++;const marker=bytes[p++];if(marker===217||marker===218)break;if(p+2>bytes.length)throw Error('format');const n=bytes.readUInt16BE(p);if(n<2||p+n>bytes.length)throw Error('format');if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){if(n<7)throw Error('format');height=bytes.readUInt16BE(p+3);width=bytes.readUInt16BE(p+5);break;}p+=n;}
  }
  if(mime==='image/webp'&&bytes.length>=30&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'){
    extension='webp';const type=bytes.toString('ascii',12,16);
    if(type==='VP8X'){width=bytes.readUIntLE(24,3)+1;height=bytes.readUIntLE(27,3)+1;}
    else if(type==='VP8L'&&bytes[20]===47){width=1+(bytes[21]|(bytes[22]&63)<<8);height=1+((bytes[22]>>6)|(bytes[23]<<2)|((bytes[24]&15)<<10));}
    else if(type==='VP8 '&&bytes[23]===157&&bytes[24]===1&&bytes[25]===42){width=bytes.readUInt16LE(26)&16383;height=bytes.readUInt16LE(28)&16383;}
  }
  if(!extension||width<1||height<1||width>4096||height>4096||width*height>12582912)throw Error('format');
  return {kind:'photo',mime,extension,seconds:0};
}
