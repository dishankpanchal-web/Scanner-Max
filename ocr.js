/* On-device OCR + form-aware parsing for the AMA feedback form (Tesseract.js, runs in the browser) */
(function(root){
"use strict";
const OPN=["Excellent","Very Good","Good","Okay"],CAT=["Excellent","Very Good","Good","Average","Poor"];
const T=t=>String(t==null?"":t).replace(/[\uE000-\uF8FF|_{}]/g,"").trim(), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const SEP="\\s*[:;.\\-]?\\s*";

function mkLines(words){
  const ws=words.map(w=>({t:T(w.text),x0:w.bbox.x0,x1:w.bbox.x1,y0:w.bbox.y0,y1:w.bbox.y1})).filter(w=>w.t);
  ws.sort((a,b)=>(a.y0+a.y1)-(b.y0+b.y1));
  const L=[];
  for(const w of ws){const cy=(w.y0+w.y1)/2,h=w.y1-w.y0;
    const l=L.find(l=>Math.abs(l.cy-cy)<Math.max(Math.min(l.h,h*1.6),h*.5)*.7);
    if(l){l.w.push(w);l.cy=(l.cy*(l.w.length-1)+cy)/l.w.length;l.h=Math.max(l.h,h)}else L.push({w:[w],cy,h});}
  for(const l of L){l.w.sort((a,b)=>a.x0-b.x0);l.t=l.w.map(w=>w.t).join(" ");l.y0=Math.min(...l.w.map(w=>w.y0));l.y1=Math.max(...l.w.map(w=>w.y1))}
  return L.sort((a,b)=>a.cy-b.cy);
}
function pick(r,labels,minTop){
  const o=r.map((v,i)=>[v,i]).sort((a,b)=>b[0]-a[0]),t=o[0],s=o[1]||[0,0];
  return t&&t[0]>=minTop&&t[0]>=s[0]*1.35&&t[0]-s[0]>=.03?labels[t[1]]:"";
}
function opinion(L,ink,re){
  const i=L.findIndex(l=>re.test(l.t)); if(i<0)return null;
  for(let j=i;j<=Math.min(i+2,L.length-1);j++){
    const w=L[j].w,f=(rx,from)=>w.findIndex((x,k)=>k>=from&&rx.test(x.t));
    const e=f(/^excel/i,0); if(e<0)continue;
    const v=f(/^very/i,e+1); if(v<0)continue;
    const vg=/good/i.test(w[v].t)&&w[v].t.length>5?v:v+1; if(!w[vg])continue;
    const g=f(/^go+d/i,vg+1); if(g<0)continue;
    const o=f(/^(ok|0k|o[kl])/i,g+1); if(o<0)continue;
    const ends=[w[e],w[vg],w[g],w[o]],h=L[j].y1-L[j].y0;
    return ends.map((x,k)=>ink(x.x1+1,L[j].y0-h*.2,Math.min(ends[k+1]?ends[k+1].x0-1:1e9,x.x1+h*2.6),L[j].y1+h*.2));
  }
  return null;
}
function catering(L,ink){
  let hi=-1;L.forEach((l,k)=>{if(/excel/i.test(l.t)&&/poor/i.test(l.t))hi=k});
  if(hi<0)return{hi,out:{},amb:["cat_q","cat_s","cat_p","cat_m"]};
  const H=L[hi].w,f=(rx,from)=>H.findIndex((x,k)=>k>=from&&rx.test(x.t));
  const e=f(/excel/i,0),v=f(/^very/i,e+1),vg=v<0?-1:(/good/i.test(H[v].t)&&H[v].t.length>5?v:v+1),g=f(/^go+d/i,vg+1),a=f(/avera/i,g+1),p=f(/poor/i,a+1);
  if([e,v,g,a,p].some(x=>x<0)||!H[vg])return{hi,out:{},amb:["cat_q","cat_s","cat_p","cat_m"]};
  const m=x=>(x.x0+x.x1)/2,cx=[m(H[e]),(H[v].x0+H[vg].x1)/2,m(H[g]),m(H[a]),m(H[p])],half=(cx[4]-cx[0])/8;
  const defs=[["cat_q",/^quality/i],["cat_s",/^service/i],["cat_p",/^present/i],["cat_m",/^menu/i]],labs=[];
  for(const[k,rx]of defs){let wd=null;for(let j=hi+1;j<L.length&&!wd;j++)wd=L[j].w.find(x=>rx.test(x.t)&&x.x0<cx[0]-half);labs.push([k,wd])}
  const ys=labs.filter(l=>l[1]).map(l=>(l[1].y0+l[1].y1)/2);let rh=1e9;
  for(let i=1;i<ys.length;i++)rh=Math.min(rh,ys[i]-ys[i-1]);if(rh>1e8)rh=(H[0].y1-H[0].y0)*1.4;
  const out={},amb=[];
  for(const[k,wd]of labs){if(!wd){amb.push(k);continue}
    const cy=(wd.y0+wd.y1)/2,r=cx.map(c=>ink(c-half*.55,cy-rh*.3,c+half*.55,cy+rh*.3));
    out[k]=pick(r,CAT,.05);if(!out[k])amb.push(k)}
  return{hi,out,amb};
}
async function parse(words,ink,digit){
  const L=mkLines(words),d={},amb=[];
  const val=re=>{const ri=new RegExp(re.source,"i"),l=L.find(l=>ri.test(l.t));if(!l)return"";const m=l.t.match(new RegExp(re.source+SEP+"(.*)$","i"));return m?m[1].trim():""};
  d.prog=val(/programme\s*name/);d.org=val(/organi[sz]ed\s*for/);d.date=val(/programme\s*date/);d.time=val(/programme\s*time/);d.venue=val(/programme\s*venue/);
  for(const[k,re]of[["q1",/overall\s+opinion/i],["q2",/faculty\s+eval/i]]){const r=opinion(L,ink,re);d[k]=r?pick(r,OPN,.10):"";if(!d[k])amb.push(k)}
  const ci=Math.max(0,L.findIndex(l=>/course\s+content/i.test(l.t)));
  for(const[k,rx]of[["c_rel",/^topic/i],["c_cov",/^coverage/i],["c_cla",/^clarity/i],["c_sup",/^material/i],["c_oth",/^specify/i]]){
    d[k]="";
    for(let j=ci;j<L.length;j++){const w=L[j].w,x=w.findIndex(z=>rx.test(z.t));if(x<0)continue;
      const h=L[j].y1-L[j].y0,e=w[x],nx=w.find((z,q)=>q>x&&/^([b-e][)\]]|any|coverage|clarity|support)$/i.test(z.t));
      const reg={x0:e.x1+2,y0:L[j].y0-h*.4,x1:Math.min(nx?nx.x0-2:1e9,e.x1+h*7),y1:L[j].y1+h*.4};
      if(ink(reg.x0,reg.y0,reg.x1,reg.y1)>.05){d[k]=await digit(reg);if(!d[k])amb.push(k)}
      break}}
  const between=(sr,er)=>{const i=L.findIndex(l=>sr.test(l.t));if(i<0)return"";let j=L.findIndex((l,k)=>k>i&&er.test(l.t));if(j<0)j=Math.min(L.length,i+6);
    return[L[i].t.replace(/^.*?:/,""),...L.slice(i+1,j).map(l=>l.t)].join(" ").replace(/\s+/g," ").trim()};
  d.pos=between(/positive\s+aspect/i,/any\s+points|improvement/i);
  d.imp=between(/any\s+points|improvement/i,/please\s+mark|catering|evaluation/i);
  const c=catering(L,ink);Object.assign(d,c.out);amb.push(...c.amb);
  const F=L.slice(c.hi+1),num=s=>String(s||"").replace(/[oO]/g,"0").replace(/[lI|]/g,"1").replace(/[^\d+\-() ]/g,"").trim();
  const nm=F.find(l=>/^name\b/i.test(l.t));d.name=nm?nm.t.replace(new RegExp("^name"+SEP,"i"),"").trim():"";
  const ai=F.findIndex(l=>/^address/i.test(l.t));d.addr="";
  if(ai>=0){let a=F[ai].t.replace(new RegExp("^address"+SEP,"i"),"");const nx=F[ai+1];
    if(nx&&!/^(phone|mobile|e-?\s*mail)/i.test(nx.t))a+=" "+nx.t.split(/pin\s*code/i)[0];d.addr=a.replace(/\s+/g," ").trim()}
  const pn=F.map(l=>l.t.match(/pin\s*code\s*[:;.\-]?\s*([\dOo ]{5,9})/i)).find(Boolean);d.pin=pn?num(pn[1]).replace(/\D/g,""):"";
  const pl=F.find(l=>/phone/i.test(l.t)),ml=F.find(l=>/mobile/i.test(l.t));
  const pm=pl&&pl.t.match(/phone\s*[:;.\-]?\s*(.*?)(?:\s*mobile.*)?$/i),mm=ml&&ml.t.match(/mobile\s*[:;.\-]?\s*(.*)$/i);
  d.phone=pm?num(pm[1]):"";d.mobile=mm?num(mm[1]):"";
  const em=F.map(l=>l.t).join(" ").match(/[\w.+\-]+\s?@\s?[\w\-]+(\.[\w\-]+)+/);
  d.email=em?em[0].replace(/\s/g,""):(()=>{const l=F.find(l=>/e-?\s*mail/i.test(l.t));return l?l.t.replace(/^.*e-?\s*mail\s*[:;.\-]?\s*/i,"").trim():""})();
  d._amb=amb;d.note="On-device OCR: please verify handwriting, ticks and numbers.";
  return d;
}

/* ---------- browser side ---------- */
let tw=null;
const FB={parse,onProgress:null};
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=()=>rej(new Error("Could not load OCR engine — internet is needed the first time"));document.head.appendChild(s)})}
async function worker(){
  if(!root.Tesseract)await loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js");
  if(!tw)tw=await root.Tesseract.createWorker("eng",1,{logger:m=>FB.onProgress&&FB.onProgress(m.status,m.progress)});
  return tw;
}
FB.end=async()=>{if(tw){try{await tw.terminate()}catch(e){}tw=null}};
async function prep(blob){
  const bm=await createImageBitmap(blob),s=Math.min(2,2000/Math.max(bm.width,bm.height));
  const w=Math.round(bm.width*s),h=Math.round(bm.height*s),c=document.createElement("canvas");c.width=w;c.height=h;
  const g=c.getContext("2d",{willReadFrequently:true});g.fillStyle="#fff";g.fillRect(0,0,w,h);g.drawImage(bm,0,0,w,h);if(bm.close)bm.close();
  const px=g.getImageData(0,0,w,h).data,gray=new Uint8Array(w*h),W=w+1,S=new Uint32Array(W*(h+1));
  for(let i=0,j=0;i<px.length;i+=4,j++)gray[j]=(px[i]*299+px[i+1]*587+px[i+2]*114)/1000|0;
  for(let y=1;y<=h;y++){let r=0;for(let x=1;x<=w;x++){r+=gray[(y-1)*w+x-1];S[y*W+x]=S[(y-1)*W+x]+r}}
  const R=Math.max(10,Math.round(Math.max(w,h)/60)),I=new Uint32Array(W*(h+1)),out=g.createImageData(w,h);
  for(let y=0;y<h;y++){const y0=Math.max(0,y-R),y1=Math.min(h,y+R+1);
    for(let x=0;x<w;x++){const x0=Math.max(0,x-R),x1=Math.min(w,x+R+1),n=(x1-x0)*(y1-y0),sum=S[y1*W+x1]-S[y0*W+x1]-S[y1*W+x0]+S[y0*W+x0];
      const k=gray[y*w+x]*n<sum*.86?1:0,o=(y*w+x)*4;out.data[o]=out.data[o+1]=out.data[o+2]=k?0:255;out.data[o+3]=255;
      I[(y+1)*W+x+1]=I[y*W+x+1]+I[(y+1)*W+x]-I[y*W+x]+k}}
  g.putImageData(out,0,0);
  const ink=(x0,y0,x1,y1)=>{x0=clamp(x0|0,0,w);x1=clamp(x1|0,0,w);y0=clamp(y0|0,0,h);y1=clamp(y1|0,0,h);const a=(x1-x0)*(y1-y0);return a<=0?0:(I[y1*W+x1]-I[y0*W+x1]-I[y1*W+x0]+I[y0*W+x0])/a};
  return{canvas:c,ink};
}
FB.run=async blob=>{
  const wk=await worker(),p=await prep(blob);
  await wk.setParameters({tessedit_char_whitelist:"",tessedit_pageseg_mode:"4"});
  const{data}=await wk.recognize(p.canvas);
  let words=data.words||[];
  if(!words.length&&data.blocks)words=data.blocks.flatMap(b=>b.paragraphs.flatMap(q=>q.lines.flatMap(l=>l.words)));
  let set=false;
  const digit=async r=>{const cw=r.x1-r.x0,ch=r.y1-r.y0;if(cw<4||ch<4)return"";
    const c=document.createElement("canvas");c.width=Math.round(cw*2)+40;c.height=Math.round(ch*2)+40;
    const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,c.width,c.height);g.drawImage(p.canvas,r.x0,r.y0,cw,ch,20,20,cw*2,ch*2);
    if(!set){await wk.setParameters({tessedit_char_whitelist:"12345",tessedit_pageseg_mode:"7"});set=true}
    const{data:d}=await wk.recognize(c),m=(d.text||"").match(/[1-5]/);return m&&d.confidence>35?m[0]:""};
  return parse(words,p.ink,digit);
};
root.FBOCR=FB;if(typeof module!=="undefined")module.exports=FB;
})(typeof window!=="undefined"?window:globalThis);
