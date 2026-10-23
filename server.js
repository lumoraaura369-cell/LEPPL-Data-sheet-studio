'use strict';
const http=require('http'),fs=require('fs'),path=require('path');
const PORT=+process.env.PORT||3000,KEY=process.env.API_KEY||'',DIR=__dirname,PUB=path.join(DIR,'public'),DB=path.join(DIR,'data','db.json');
fs.mkdirSync(path.join(DIR,'data'),{recursive:true});
let db={sheets:[],audit:[],custom:[],seq:0};
try{db=Object.assign(db,JSON.parse(fs.readFileSync(DB,'utf8')))}catch(e){}
function save(){const t=DB+'.tmp';fs.writeFileSync(t,JSON.stringify(db));fs.renameSync(t,DB)}
function log(a,id,who){db.audit.push({t:new Date().toISOString(),a,id,who:who||''})}
function templates(){return [...require('./templates/base.json'),...require('./templates/extra.js'),...require('./templates/extra2.js'),...db.custom]}
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
function send(res,c,o){const b=JSON.stringify(o);res.writeHead(c,{'content-type':'application/json; charset=utf-8','x-content-type-options':'nosniff','cache-control':'no-store'});res.end(b)}
function body(req){return new Promise((ok,no)=>{let d='';req.on('data',c=>{d+=c;if(d.length>2e6){no(new Error('too large'));req.destroy()}});req.on('end',()=>{try{ok(d?JSON.parse(d):{})}catch(e){no(e)}})})}
function validT(t){const A=Array.isArray;return t&&/^[a-z0-9_]{2,24}$/.test(t.id)&&typeof t.n==='string'&&typeof t.fam==='string'&&typeof t.title==='string'&&A(t.sec)&&A(t.calc)&&A(t.chk)&&t.sec.every(s=>A(s)&&typeof s[0]==='string'&&A(s[1])&&s[1].every(f=>A(f)&&/^[A-Za-z_]\w*$/.test(f[0])&&typeof f[1]==='string'))&&t.calc.every(c=>A(c)&&/^[A-Za-z_]\w*$/.test(c[0])&&/^[\w\s+\-*\/^().,e]+$/.test(c[3]))&&t.chk.every(c=>A(c)&&/^[\w\s+\-*\/^().,e]+$/.test(c[1]))}
const server=http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://x'),p=u.pathname;
  if(p.startsWith('/api/')){
   const w=req.method!=='GET';
   if(w&&KEY&&req.headers['x-api-key']!==KEY)return send(res,401,{error:'API key required'});
   const who=String(req.headers['x-user']||'').slice(0,40);
   if(p==='/api/templates'&&req.method==='GET')return send(res,200,templates());
   if(p==='/api/templates'&&req.method==='POST'){const t=await body(req);if(!validT(t))return send(res,400,{error:'Invalid template structure'});if(templates().some(x=>x.id===t.id))return send(res,409,{error:'Template id already exists; ids are never reused'});db.custom.push(t);log('template added',t.id,who);save();return send(res,201,t)}
   if(p==='/api/sheets'&&req.method==='GET')return send(res,200,db.sheets.map(s=>({id:s.id,no:s.no,rev:s.rev,tid:s.tid,status:s.status,tag:(s.values&&s.values.tag)||'',updated:s.updated})).reverse());
   if(p==='/api/sheets'&&req.method==='POST'){const b=await body(req);if(!templates().some(t=>t.id===b.tid))return send(res,400,{error:'Unknown template'});db.seq++;db.sn=(db.sn||0)+1;const s={id:'s'+db.seq,no:'DS-'+String(db.sn).padStart(6,'0'),rev:0,tid:b.tid,status:'Draft',meta:b.meta||{},values:b.values||{},created:new Date().toISOString(),updated:new Date().toISOString()};if(['Review','Approved'].includes(b.status))s.status=b.status;db.sheets.push(s);log('created '+s.status,s.no+' Rev 0',who);save();return send(res,201,s)}
   const m=p.match(/^\/api\/sheets\/(s\d+)$/);
   if(m){const s=db.sheets.find(x=>x.id===m[1]);if(!s)return send(res,404,{error:'Not found'});
    if(req.method==='GET')return send(res,200,s);
    if(req.method==='PUT'){const b=await body(req);
     if(s.status==='Approved'||s.status==='Superseded'){if(s.status==='Superseded')return send(res,409,{error:'Superseded revision is read-only'});s.status='Superseded';db.seq++;const n={id:'s'+db.seq,no:s.no,rev:s.rev+1,tid:s.tid,status:'Draft',meta:b.meta||s.meta,values:b.values||s.values,created:new Date().toISOString(),updated:new Date().toISOString()};db.sheets.push(n);log('new revision (previous kept as Superseded)',n.no+' Rev '+n.rev,who);save();return send(res,200,n)}
     if(b.meta)s.meta=b.meta;if(b.values)s.values=b.values;if(['Draft','Review','Approved'].includes(b.status))s.status=b.status;s.updated=new Date().toISOString();log('saved '+s.status,s.no+' Rev '+s.rev,who);save();return send(res,200,s)}
    return send(res,405,{error:'Delete is not allowed; sheets are kept for the audit trail'})}
   if(p==='/api/audit'&&req.method==='GET')return send(res,200,db.audit.slice(-500).reverse());
   return send(res,404,{error:'Unknown endpoint'})}
  let f=path.normalize(path.join(PUB,p==='/'?'index.html':p));
  if(!f.startsWith(PUB+path.sep))return send(res,403,{error:'Forbidden'});
  fs.readFile(f,(e,d)=>{if(e)return send(res,404,{error:'Not found'});res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream','x-content-type-options':'nosniff'});res.end(d)})
 }catch(e){send(res,500,{error:'Server error'})}
});
server.listen(PORT,()=>console.log('Lummora_DataSheet_Studio on http://localhost:'+PORT));
