import path from 'node:path';
import {createFontGroupShopConnection} from './font-group-connection.mjs';
import {createFontConnectionOperator} from './font-connection-operator.mjs';

const fail=code=>{throw Object.assign(Error('Privater Schriftanschluss gehört nicht zur geöffneten Werkstatt.'),{code,status:409});};
const absolute=value=>typeof value==='string'&&path.isAbsolute(value)&&path.resolve(value)===value;

/** Code-only preparation. No environment, route, listener, database opener or
 * automatic operation. Both execution gates are fixed false, not options.
 * The caller keeps this object privately; the HTTP server never exposes it. */
export function createFontConnectionHost({tenantId,shopDomain,dataDirectory,katalogRoot,planDirectory,webRoots,
  targets,approvedSets,runtimeFonts,clock=Date.now}={}){
  if(!tenantId||!shopDomain||![dataDirectory,katalogRoot,planDirectory].every(absolute)||
    !Array.isArray(webRoots)||!webRoots.length||!webRoots.every(absolute)||!Array.isArray(targets)||!Array.isArray(approvedSets))
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
        katalogRoot:scope.katalogRoot,targets:scope.targets,approvedSets:scope.approvedSets,graphql:reader.graphql,
        ...(runtimeFonts?{runtimeFonts}:{}),clock,executionEnabled:false});
      const guarded={async plan(input){ready();const result=await connection.plan(input);ready();return result;},
        async execute(plan){ready();return connection.execute(plan);}};
      const privateOperator=createFontConnectionOperator({connection:guarded,planDirectory:scope.planDirectory,webRoots:scope.webRoots,executionEnabled:false});
      operator=Object.freeze({plan:async input=>{ready();return privateOperator.plan(input);},
        read:sha=>{ready();return privateOperator.read(sha);},execute:async sha=>{ready();return privateOperator.execute(sha);}});
      connected=true;
      return Object.freeze({close(){closed=true;}});
    },
    operator(){ready();return operator;}
  });
}
