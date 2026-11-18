import path from 'node:path';
import {createFontGroupShopConnection} from './font-group-connection.mjs';
import {createFontConnectionOperator} from './font-connection-operator.mjs';

const fail=code=>{throw Object.assign(Error('Privater Schriftanschluss gehört nicht zur geöffneten Werkstatt.'),{code,status:409});};
const absolute=value=>typeof value==='string'&&path.isAbsolute(value)&&path.resolve(value)===value;

/** Private maintenance composition. No environment, route, listener, database
 * opener or automatic operation. Execution requires one explicitly pinned SHA.
 * The caller keeps this object privately; the HTTP server never exposes it. */
export function createFontConnectionHost({tenantId,shopDomain,dataDirectory,katalogRoot,planDirectory,webRoots,
  targets,approvedSets,runtimeFonts,clock=Date.now,approvedPlanSha=null}={}){
  if(!tenantId||!shopDomain||![dataDirectory,katalogRoot,planDirectory].every(absolute)||
    !Array.isArray(webRoots)||!webRoots.length||!webRoots.every(absolute)||!Array.isArray(targets)||!Array.isArray(approvedSets)||
    approvedPlanSha!==null&&(typeof approvedPlanSha!=='string'||!/^[a-f0-9]{64}$/.test(approvedPlanSha)))
    fail('font_connection_host_config');
  const scope=structuredClone({tenantId,shopDomain,dataDirectory,katalogRoot,planDirectory,webRoots,targets,approvedSets});
  let connected=false,closed=false,operator;
  function ready(){if(!connected||closed)fail('font_connection_host_closed');}
  return Object.freeze({
    connect(context){
      if(connected||closed)fail('font_connection_host_lifecycle');
      const reader=context?.shopifyReader;
      if(context?.dataDirectory!==scope.dataDirectory||context.katalogRoot!==scope.katalogRoot||context.workshop?.tenantId!==scope.tenantId||
        reader?.shopDomain!==scope.shopDomain||reader?.canWrite!==false||typeof reader?.graphql!=='function'||
        'accessToken' in reader||'getAccessToken' in reader)fail('font_connection_host_scope');
      const connection=createFontGroupShopConnection({workshop:context.workshop,tenantId:scope.tenantId,shopDomain:scope.shopDomain,
        katalogRoot:scope.katalogRoot,targets:scope.targets,approvedSets:scope.approvedSets,
        graphql:async(...args)=>{ready();const result=await reader.graphql(...args);ready();return result;},
        ...(runtimeFonts?{runtimeFonts}:{}),clock,executionEnabled:approvedPlanSha!==null});
      const guarded={async plan(input){ready();const result=await connection.plan(input);ready();return result;},
        async execute(plan){ready();return connection.execute(plan);}};
      const privateOperator=createFontConnectionOperator({connection:guarded,planDirectory:scope.planDirectory,webRoots:scope.webRoots,executionEnabled:approvedPlanSha!==null});
      operator=Object.freeze({plan:async input=>{ready();return privateOperator.plan(input);},
        read:sha=>{ready();return privateOperator.read(sha);},execute:async sha=>{ready();
          if(approvedPlanSha===null||sha!==approvedPlanSha)throw Object.assign(Error('Genau dieser Prüfplan ist nicht zur Ausführung freigegeben.'),{code:'font_connection_execution_disabled',status:403});
          return privateOperator.execute(sha);}});
      connected=true;
      return Object.freeze({close(){closed=true;}});
    },
    operator(){ready();return operator;}
  });
}
