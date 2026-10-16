import {amazonTestOrders,AMAZON_TEST_MARKETPLACE} from './amazon-fixtures.mjs';
import {normalizeAmazonOrderQuery} from './amazon-orders.mjs';
import {AmazonSpApiError} from './amazon-sp-api-client.mjs';

const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
/** One serial worker. All remote reads are pinned to the static sandbox in this release. */
export function createAmazonIntegration({orders,client=null,allowTestImports=false,clock=Date.now,intervalMs=300000}={}) {
  if(client&&client.diagnostics().environment!=='sandbox')fail(503,'amazon_sandbox_required','Diese Integration ist ausschließlich für die Amazon-Sandbox freigegeben.');
  if(!Number.isSafeInteger(intervalMs)||intervalMs<180000)fail(422,'amazon_interval','Abrufabstand mindestens drei Minuten.');
  let active=null,timer=null,stopped=false,lastRun=null,lastError=null;
  const at=()=>new Date(clock()).toISOString();
  async function exclusive(fn) {
    if(active)fail(409,'amazon_sync_running','Ein Amazon-Abruf läuft bereits.');
    active=Promise.resolve().then(fn);
    try {const result=await active;lastRun=at();lastError=null;return result;}
    catch(error){
      const known=error instanceof AmazonSpApiError||['amazon_order_input','amazon_order_store','amazon_repeated_cursor','amazon_checkpoint_query','amazon_closed'].includes(error.code);
      const safe=known?error:Object.assign(Error('Amazon-Abruf fehlgeschlagen. Bitte den Verbindungsstatus prüfen.'),{status:502,code:'amazon_sync_failed'});
      lastError={at:at(),code:safe.code};throw safe;
    }
    finally {active=null;}
  }
  function open(){if(stopped)fail(409,'amazon_closed','Amazon-Anbindung wurde beendet.');}
  function connected(){open();if(!client)fail(503,'amazon_not_connected','Amazon-Sandbox ist noch nicht serverseitig verbunden.');}
  const service={
    status(){return {mode:client?'sandbox':'not-connected',ordersVersion:'2026-01-01',running:Boolean(active),automatic:Boolean(timer),closed:stopped,lastRun,lastError,
      testImportsAllowed:allowTestImports,productionReadsEnabled:false,productionWritesEnabled:false,customDataEnabled:false,
      blockers:['DTC-Rolle und Produktionsautorisierung fehlen','Echte Kundendaten sind nicht freigegeben'],
      connection:client?.diagnostics()??null,checkpoints:orders.checkpoints()};},
    demo(action='import') {
      open();
      if(!allowTestImports)fail(403,'amazon_demo_disabled','Synthetische Beispiele sind in dieser Laufzeit nicht aktiviert.');
      if(!['import','cancel'].includes(action))fail(422,'amazon_demo_action','Unbekannte Testaktion.');
      return orders.ingestPage({orders:amazonTestOrders({cancelled:action==='cancel'})},{provenance:'synthetic',marketplaceIds:[AMAZON_TEST_MARKETPLACE]});
    },
    async probe(){connected();return exclusive(async()=>{const result=await client.probeSandbox();open();const imported=orders.ingestPage({orders:[result.order]},{provenance:'sandbox'});return {environment:'sandbox',staticFixture:true,productionPermissionVerified:false,imported:imported.lines.length,...client.diagnostics()};});},
    async sync(query,{checkpointKey='sandbox-orders',maxPages=10}={}) {
      connected();if(!Number.isSafeInteger(maxPages)||maxPages<1||maxPages>100)fail(422,'amazon_page_limit','Ungültige Seitenbegrenzung.');
      return exclusive(async()=>{
        let cursor=orders.checkpoint(checkpointKey);const search=query===undefined&&cursor?cursor.query:normalizeAmazonOrderQuery(query);
        if(cursor&&JSON.stringify(cursor.query)!==JSON.stringify(search))fail(409,'amazon_checkpoint_query','Dieser Amazon-Fortsetzungsname gehört zu einem anderen Suchzeitfenster.');
        if(cursor&&!cursor.nextToken)return {complete:true,pages:0,reused:true};
        let pages=0,inserted=0;const seen=new Set();
        do {
          if(stopped)break;
          const result=await client.searchOrders({...search,...(cursor?.nextToken?{paginationToken:cursor.nextToken}:{})});
          open();
          const next=result.pagination?.nextToken??null;
          if(next&&(seen.has(next)||next===cursor?.nextToken))fail(502,'amazon_repeated_cursor','Amazon hat einen wiederholten Fortsetzungsschlüssel geliefert.');
          if(next)seen.add(next);
          const stored=orders.ingestPage({orders:result.orders,nextToken:next,checkpointKey,query:search,expectedRevision:cursor?.revision??0,expectedNextToken:cursor?.nextToken??null},{provenance:'sandbox'});
          inserted+=stored.inserted;pages++;cursor=orders.checkpoint(checkpointKey);
        }while(cursor?.nextToken&&pages<maxPages);
        return {complete:!cursor?.nextToken,pages,inserted,mode:'sandbox'};
      });
    },
    start(){connected();if(timer)return;stopped=false;const run=async()=>{if(stopped)return;try{await service.probe();}catch{/* safe code is exposed in status; no raw response log */}if(!stopped){timer=setTimeout(run,intervalMs);timer.unref?.();}};timer=setTimeout(run,0);timer.unref?.();},
    close(){stopped=true;if(timer)clearTimeout(timer);timer=null;}
  };
  return service;
}
