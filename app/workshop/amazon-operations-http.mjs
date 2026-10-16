const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
const fields=(value,allowed)=>{if(Object.keys(value).some(key=>!allowed.includes(key)))fail(422,'amazon_fields','Unbekannte Eingabefelder.');return value;};
const scope=['accountId','provenance','marketplaceId'];

/** Called only after the workshop's existing merchant authentication and CSRF gates. */
export function createAmazonOperationsHttp({paperwork,custom,allowTestImports=false,body,json}) {
 return async function handle(req,res,url) {
  const pathname=url.pathname,method=req.method;
  const base='/api/workshop/amazon/';
  const routes=['paperwork','paperwork/enqueue','paperwork/pdf','paperwork/printed','scan/resolve','scan','custom/imports','custom/review','custom/confirm'];
  if(!routes.some(route=>pathname===base+route))return false;
  const route=pathname.slice(base.length);
  if(method==='GET'&&route==='paperwork'){json(res,200,{...paperwork.list(),enabled:allowTestImports,test:true});return true;}
  if(method==='GET'&&route==='custom/imports'){
   if([...url.searchParams.keys()].some(k=>k!=='lineId'))fail(422,'amazon_fields','Nur die Bestellposition angeben.');
   const lineId=url.searchParams.get('lineId');if(!lineId)fail(422,'amazon_fields','Bitte eine Bestellposition wählen.');
   json(res,200,{current:custom.get(lineId),history:custom.history(lineId),test:true});return true;
  }
  if(method!=='POST')fail(405,'method_not_allowed','Diese Aktion benötigt POST.');
  if(!allowTestImports)fail(403,'amazon_operations_disabled','Begleitscheine, Scans und Custom-Dateiimporte sind in dieser Laufzeit nicht für Tests freigegeben.');
  const data=await body(req,route==='custom/imports'?12*1024*1024:65536);
  if(route==='paperwork/enqueue'){fields(data,['lineIds','format']);json(res,201,paperwork.enqueue(data));}
  else if(route==='paperwork/pdf'){
   fields(data,['jobIds']);const result=paperwork.generate(data),pdf=result.pdf;
   res.writeHead(200,{'Content-Type':'application/pdf','Content-Length':pdf.length,'Content-Disposition':'attachment; filename="gravuru-amazon-test-begleitscheine.pdf"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Gravuru-SHA256':result.sha256,'X-Gravuru-OutputId':result.outputId}).end(pdf);
  }
  else if(route==='paperwork/printed'){fields(data,['jobIds','outputId','requestId']);json(res,200,paperwork.confirmPrinted(data));}
  else if(route==='scan/resolve'){fields(data,['code',...scope]);json(res,200,paperwork.resolveScan(data));}
  else if(route==='scan'){fields(data,['code','stage','requestId',...scope]);json(res,200,paperwork.scan(data));}
  else if(route==='custom/imports'){
   fields(data,['lineId','orderId','orderItemId','sku','base64','format','classification','operatorApproved','expectedVersion','expectedHash']);
   const max=data.format==='json'?1024*1024:8*1024*1024;
   if(!['json','zip'].includes(data.format)||typeof data.base64!=='string'||!data.base64.length||data.base64.length>4*Math.ceil(max/3)||data.base64.length%4||/[^A-Za-z0-9+/=]/.test(data.base64))fail(422,'amazon_custom_payload','Bitte eine begrenzte JSON-/ZIP-Testdatei senden.');
   const bytes=Buffer.from(data.base64,'base64');if(bytes.toString('base64')!==data.base64)fail(422,'amazon_custom_payload','Die Testdatei ist nicht eindeutig kodiert.');
   const {base64,...input}=data;json(res,201,custom.importSample({...input,bytes}));
  }
  else if(route==='custom/review'){fields(data,['lineId','expectedVersion','expectedHash','mapping']);json(res,200,custom.review(data));}
  else if(route==='custom/confirm'){fields(data,['lineId','expectedVersion','expectedHash','mapping','reviewHash','operatorApproved']);json(res,200,custom.confirm(data));}
  else fail(405,'method_not_allowed','Diese Aktion ist hier nicht verfügbar.');
  return true;
 };
}
