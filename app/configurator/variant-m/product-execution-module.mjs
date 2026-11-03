import {editorProduct} from './product-module-context.mjs';
import {executionKind} from './execution-registry.mjs';

const product=editorProduct(),kind=executionKind(product);
const signs=!product||kind==='door-sign'?await import('./family-formats-ui.mjs'):null;
const stakes=!product||kind==='stake'?await import('./stake-execution.mjs'):null;
const memorials=!product||kind==='memorial'?await import('./memorial-execution.mjs'):null;
export function installExecutionPresentation(args){
 const kind=executionKind(args.config);
 if(kind==='stake')return stakes.installStakeExecution(args);
 if(kind==='memorial')return memorials.installMemorialExecution(args);
 if(kind==='door-sign')return signs.installFamilyFormatsPresentation(args);
 return ()=>{};
}
