"""Convert only our frozen, explicit text fields to paths; retain paint order."""
import copy,re
import numpy as np
from svgpathtools import parse_path,Line,QuadraticBezier,Arc
from svgpathtools.parser import parse_transform
from svgpathtools.path import transform
S='{http://www.w3.org/2000/svg}'
def text_paths(node,require,number):
 result=[]
 def visit(n,matrix,color):
  tag=n.tag.removeprefix(S)
  require(tag in ['g','path'],'Unbekanntes Element im gesicherten Schriftpfad.')
  require(set(n.attrib)<= {'data-field','transform','fill','d'},'Nicht unterstützte Eigenschaft im Schriftpfad.')
  matrix=matrix @ parse_transform(n.get('transform',''))
  color=n.get('fill',color);require(bool(re.fullmatch('#[a-fA-F0-9]{6}',color)),'Ungültige Schriftfarbe.')
  if tag=='path' and n.get('d','').strip():
   p=transform(parse_path(n.get('d')),matrix);out=[]
   xy=lambda z:number(z.real)+' '+number(z.imag)
   for sub in p.continuous_subpaths():
    out.append(xy(sub.start)+' m')
    for seg in sub:
     if isinstance(seg,Line):out.append(xy(seg.end)+' l')
     elif isinstance(seg,QuadraticBezier):
      a,b,t=seg.start,seg.end,seg.control;out.append(' '.join(xy(z) for z in [a+2*(t-a)/3,b+2*(t-b)/3,b])+' c')
     else:
      require(not isinstance(seg,Arc),'Unerwarteter Kreisbogen im Schriftpfad.')
      out.append(' '.join(xy(z) for z in seg.bpoints()[1:])+' c')
    out.append('h')
   result.append({'path':'\n'.join(out),'rgb':[int(color[i:i+2],16) for i in [1,3,5]]})
  for child in n:visit(child,matrix,color)
 visit(node,np.eye(3),'#000000');return result

def split_artwork(root,text_ids,require,number):
 groups=[n for n in root.iter(S+'g') if n.get('data-design') or n.get('data-native-design')]
 require(len(groups)==1,'Gestaltungsebene fehlt.');group=groups[0]
 require(set(group.attrib)<= {'data-design','data-native-design','clip-path'},'Unbekannte Gestaltungstransformation.')
 children=list(group)
 if group.get('data-native-design'):
  ordered=children
 else:
  require(len(children)==2 and children[0].tag==S+'image' and children[1].tag==S+'g','Unbekannter Aufbau der Gestaltung.')
  ordered=[children[0],*list(children[1])]
 parts=[];batch=[];vectors=[];nontext=[]
 def svg(nodes):
  r=copy.deepcopy(root);g=next(n for n in r.iter(S+'g') if n.get('data-design') or n.get('data-native-design'))
  for child in list(g):g.remove(child)
  for child in nodes:g.append(copy.deepcopy(child))
  return r
 for node in ordered:
  if node.get('data-field') in text_ids:
   if batch:parts.append({'root':svg(batch)});batch=[]
   paths=text_paths(node,require,number);parts.append({'vectors':paths});vectors.extend(paths)
  else:batch.append(node);nontext.append(node)
 if batch:parts.append({'root':svg(batch)})
 return parts,vectors,svg(nontext)
