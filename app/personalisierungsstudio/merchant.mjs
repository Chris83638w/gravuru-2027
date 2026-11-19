const q=s=>document.querySelector(s);
const local=document.body.dataset.local==='true';
let token='';
const base=local?'/demo/manage':'/api';
const status=(s)=>{q('#status').textContent=s;};
let unverifiedOrders=new Set();
async function api(route,options={}){
  const headers={...options.headers};
  if(!local)headers.Authorization='Bearer '+token;
  const res=await fetch(base+route,{...options,headers,cache:'no-store'});
  if(!res.ok){let msg='Werkstatt nicht erreichbar.';try{msg=(await res.json()).error||msg;}catch{}throw Error(msg);}
  return res;
}
const run=fn=>async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button')||e.currentTarget;button.disabled=true;try{await fn();}catch(error){status(error.message);}finally{button.disabled=false;}};
async function list(){
  const orders=await (await api('/orders')).json();const table=q('#orders');table.replaceChildren();
  if(!orders.length){table.textContent='Noch keine Bestellpositionen vorhanden.';return;}
  for(const o of orders){
    const item=document.createElement('article'),title=document.createElement('h3');
    title.textContent=o.name+' · Position '+o.line;item.append(title);
    const unverified=unverifiedOrders.has(o.id);
    const text=document.createElement('p');text.textContent=o.qty+' Stück · '+(unverified?'Shopify-Abgleich ausstehend':o.cancelled?'Storniert':o.status);item.append(text);
    if(!unverified && !o.cancelled && o.qty>0 && (o.status==='PAID' || local && o.status==='TEST'))for(const type of ['svg','pdf','json']){
      const a=document.createElement('button');a.type='button';a.className='gs-download';a.textContent=type.toUpperCase();
      a.onclick=run(async()=>{const r=await api('/orders/'+o.id+'/lines/'+o.line+'/'+type);
        const href=URL.createObjectURL(await r.blob()),link=document.createElement('a');link.href=href;link.download=o.id+'-'+o.line+'.'+type;link.click();setTimeout(()=>URL.revokeObjectURL(href),3000);});
      item.append(a);
    }
    table.append(item);
  }
}
const syncF02=q('#sync-f02');
async function refreshF02(){
  status('Testbestellungen werden bei Shopify abgeglichen …');
  const summary=await (await api('/orders/f02/sync',{method:'POST'})).json();
  unverifiedOrders=new Set(summary.unverified||[]);
  await list();
  const outstanding=unverifiedOrders.size?' Bei '+unverifiedOrders.size+' Bestellungen steht der Abgleich aus.':'';
  status(summary.orders+' Testbestellungen erfasst, '+summary.positions+' Positionen zugeordnet.'+outstanding);
}
if(syncF02) syncF02.onclick=run(refreshF02);
q('#login').onsubmit=run(async()=>{
  token=q('#key').value;
  if(syncF02) await refreshF02();
  else {await list();status('');}
  q('#key').value='';q('#login').hidden=true;q('#tools').hidden=false;
});
q('#sync').onsubmit=run(async()=>{const id=q('#orderid').value;const r=await (await api('/orders/'+encodeURIComponent(id)+'/sync',{method:'POST'})).json();await list();status(r.positions+' Positionen übernommen.');});
let checked=null;
q('#file').onchange=()=>{checked=null;q('#publish').disabled=true;};
async function fileInput(){
  const file=q('#file').files[0];if(!file)throw Error('Bitte eine Quelldatei wählen.');
  if(file.size>8_000_000)throw Error('Quelldateien bis 8 MB lassen sich hier prüfen.');
  const encoded=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=()=>reject(Error('Datei nicht lesbar.'));r.readAsDataURL(file);});
  return {name:file.name,bytes:encoded};
}
q('#inspect').onclick=run(async()=>{const input=await fileInput();const result=await (await api('/imports/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)})).json();
  checked=result.revision||null;q('#report').textContent=JSON.stringify(result,null,2);q('#publish').disabled=!checked;status(checked?'Vorlagen lassen sich übernehmen.':'Importprüfung abgeschlossen. Die offenen Zuordnungen stehen im Prüfbericht.');});
q('#import').onsubmit=run(async()=>{if(!checked)throw Error('Quelle zuerst prüfen.');const file=await fileInput();
  const result=await (await api('/imports/publish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...file,expected:checked,product:q('#product').value,variant:q('#variant').value})})).json();status(result.count+' Vorlagen für diese Studio-Variante übernommen.');});
if(local){q('#tools').hidden=false;q('#login').hidden=true;q('#sync').hidden=true;list().catch(e=>status(e.message));}
