import {customerLayoutIssue} from './contract.mjs';
import {overlapHints,showOverlapWarnings,templateOverlap} from './customer-tools-model.mjs';
import {objectSurface} from './surfaces.mjs';
// Product-specific mechanical rules can be supplied later. No hole keepout rule.
export function layoutReviewIssues({config,profile=config.profile,objects,design,resources,mechanicalRules=[]}){
 const visible=objects.filter(o=>!o.uxHidden&&!o.uxDecoration&&o.role!=='guide'&&['text','motif'].includes(o.type)&&!(o.type==='text'&&!o.text?.trim()));
 const issues=[];
 for(const o of visible){
  const message=customerLayoutIssue(o,profile,resources);
  if(message)issues.push({code:'boundary',ids:[o.id],message:'Dieses Element ragt über den Gestaltungsrand.'});
 }
 if(showOverlapWarnings(profile))for(const issue of overlapHints(visible)){
  if(new Set(issue.ids.map(id=>objectSurface(visible.find(o=>o.id===id)))).size!==1)continue;
  if(templateOverlap(issue.ids,visible,design))continue;
  issues.push({...issue,message:'Text und Motiv überlagern sich. Bitte verschieben oder automatisch einpassen.'});
 }
 for(const rule of mechanicalRules)issues.push(...rule({config,profile,objects}));
 return issues;
}
