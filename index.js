'use strict';
const crypto=require('crypto');
const BASE=require('../templates/base.json'),EXTRA=require('../templates/extra.js').concat(require('../templates/extra2.js'));
const U=process.env.SUPABASE_URL,K=process.env.SUPABASE_SERVICE_KEY,APP=process.env.APP_KEY||'';
const SEL='id,no,rev,tid,status,meta,values:vals,created,updated';
async function q(m,p,b){const r=await fetch(U+'/rest/v1'+p,{method:m,headers:{apikey:K,Authorization:'Bearer '+K,'Content-Type':'application/json',Prefer:'return=representation'},body:b?JSON.stringify(b):undefined});const t=await r.text();if(!r.ok)throw new Error(t);return t?JSON.parse(t):null}
const one=r=>Array.isArray(r)?r[0]:r;
const out=r=>{if(!r)return r;const o=Object.assign({},r);if('vals' in o){o.values=o.vals;delete o.vals}return o};
const same=(a,b)=>{const x=Buffer.from(String(a||'')),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y)};
const log=(a,ref,who)=>q('POST','/audit',{a,ref,who}).catch(()=>{});
function validT(t){const A=Array.isArray,E=/^[\w\s+\-*\/^().,e]+$/;return t&&/^[a-z0-9_]{2,24}$/.test(t.id)&&typeof t.n==='string'&&typeof t.fam==='string'&&typeof t.title==='string'&&A(t.sec)&&A(t.calc)&&A(t.chk)&&t.sec.every(s=>A(s)&&typeof s[0]==='string'&&A(s[1])&&s[1].every(f=>A(f)&&/^[A-Za-z_]\w*$/.test(f[0])&&typeof f[1]==='string'))&&t.calc.every(c=>A(c)&&/^[A-Za-z_]\w*$/.test(c[0])&&E.test(c[3]))&&t.chk.every(c=>A(c)&&E.test(c[1]))}
module.exports=async(req,res)=>{
 const send=(c,o)=>{res.setHeader('Cache-Control','no-store');res.status(c).json(o)};
 try{
  const p=new URL(req.url,'http://x').pathname.replace(/\/$/,''),b=(req.body&&typeof req.body==='object')?req.body:{},who=String(req.headers['x-user']||'').slice(0,40);
  if(!U||!K)return send(500,{error:'Server is not configured'});
  const custom=async()=>(await q('GET','/custom_templates?select=data')).map(r=>r.data);
  if(p==='/api/templates'&&req.method==='GET')return send(200,[...BASE,...EXTRA,...await custom()]);
  if(!APP||!same(req.headers['x-api-key'],APP))return send(401,{error:'API key required'});
  if(p==='/api/templates'&&req.method==='POST'){if(!validT(b))return send(400,{error:'Invalid template structure'});if([...BASE,...EXTRA].some(x=>x.id===b.id))return send(409,{error:'Template id already exists; ids are never reused'});
   try{await q('POST','/custom_templates',{id:b.id,data:b})}catch(e){return send(409,{error:'Template id already exists; ids are never reused'})}log('template added',b.id,who);return send(201,b)}
  if(p==='/api/sheets'&&req.method==='GET')return send(200,(await q('GET','/sheets?select=id,no,rev,tid,status,updated,tag:vals->>tag&order=id.desc&limit=200')));
  if(p==='/api/sheets'&&req.method==='POST'){const all=[...BASE,...EXTRA,...await custom()];if(!all.some(t=>t.id===b.tid))return send(400,{error:'Unknown template'});
   const no=await q('POST','/rpc/next_sheet_no',{});const st=['Review','Approved'].includes(b.status)?b.status:'Draft';
   const r=out(one(await q('POST','/sheets',{no,rev:0,tid:b.tid,status:st,meta:b.meta||{},vals:b.values||{}})));log('created '+st,no+' Rev 0',who);return send(201,r)}
  const m=p.match(/^\/api\/sheets\/(\d+)$/);
  if(m){const s=one(await q('GET','/sheets?id=eq.'+m[1]+'&select='+SEL));if(!s)return send(404,{error:'Not found'});
   if(req.method==='GET')return send(200,s);
   if(req.method==='PUT'){
    if(s.status==='Superseded')return send(409,{error:'Superseded revision is read-only'});
    if(s.status==='Approved'){const n=out(one(await q('POST','/rpc/revise_sheet',{p_id:s.id,p_meta:b.meta||null,p_values:b.values||null})));log('new revision (previous kept as Superseded)',n.no+' Rev '+n.rev,who);return send(200,n)}
    const patch={updated:new Date().toISOString()};if(b.meta)patch.meta=b.meta;if(b.values)patch.vals=b.values;if(['Draft','Review','Approved'].includes(b.status))patch.status=b.status;
    const r=out(one(await q('PATCH','/sheets?id=eq.'+s.id,patch)));log('saved '+r.status,r.no+' Rev '+r.rev,who);return send(200,r)}
   return send(405,{error:'Delete is not allowed; sheets are kept for the audit trail'})}
  if(p==='/api/audit'&&req.method==='GET')return send(200,await q('GET','/audit?select=t,a,ref,who&order=id.desc&limit=500'));
  return send(404,{error:'Unknown endpoint'})
 }catch(e){console.error(e);send(500,{error:'Server error'})}
};
