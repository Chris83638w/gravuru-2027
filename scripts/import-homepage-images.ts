import fs from 'node:fs';import sharp from 'sharp';
Object.assign(process.env,{NODE_ENV:'production'});
const dir='work/homepage-images';fs.mkdirSync(dir,{recursive:true});
const source='C:/Users/Mikail Erdem/.codex/generated_images/01a0ced9-aba0-7e13-ae76-a2e735352571/';
const assets=[
['serienzuschnitt','exec-4347b04c-e4fe-4815-ad20-b78d6465a02f.png','Gestapelte Edelstahlzuschnitte mit gleichmäßigen Konturen und Bohrungen','Serienzuschnitt · KI-generiertes Anwendungsbeispiel','edelstahl-stahl-laserschneiden'],
['druckschild','exec-6ddc9828-76ec-403e-8092-d8989db6cc46.png','Farbig bedrucktes Acrylschild mit botanischem Motiv und Abstandshaltern','UV-Direktdruck auf Acrylglas · KI-generiertes Anwendungsbeispiel','uv-direktdruck'],
['bauteilmarkierung','exec-5e1f1758-d7b8-4bac-a4e1-380ca4f02e59.png','Metallbauteil mit schwarzer Seriennummer und Kennzeichnung','Bauteilmarkierung · KI-generiertes Anwendungsbeispiel','lasergravur'],
['acrylzuschnitt','exec-740efeff-a10f-4aff-9675-f6aacb0f140c.png','Klare Acrylzuschnitte mit polierten Kanten, Bohrungen und unterschiedlichen Formen','Acrylzuschnitt · KI-generiertes Anwendungsbeispiel','acrylglas-schneiden'],
['masspruefung','exec-9ca8410f-5be7-43a5-b77e-dd1ee54481df.png','Prüfung eines Metallteils mit einem Messschieber','Maßprüfung · KI-generierte Illustration','']];
const {getPayload}=await import('payload');const {default:config}=await import('../src/payload.config.ts');const p=await getPayload({config});
const old=await p.findGlobal({slug:'website',depth:0});fs.writeFileSync(dir+'/settings-before.json',JSON.stringify(old,null,2));const ids:Record<string,number|string>={};
for(const [key,file,alt,caption,slug] of assets){fs.copyFileSync(source+file,dir+'/'+key+'.png');const out=dir+'/'+key+'.webp';await sharp(source+file).webp({quality:85}).toFile(out);const m=await p.create({collection:'media',data:{alt,caption,credit:'OpenAI Bildgenerierung · 2026-09-30 · '+key,approved:true},filePath:out});ids[key]=m.id;if(slug){const pages=await p.find({collection:'pages',where:{slug:{equals:slug}},depth:0});for(const page of pages.docs){fs.writeFileSync(dir+'/'+slug+'-before.json',JSON.stringify(page,null,2));await p.update({collection:'pages',id:page.id,data:{image:m.id}})}}
}
await p.updateGlobal({slug:'website',data:{heroImage:ids.masspruefung,showcaseImages:[]}});fs.writeFileSync(dir+'/media-ids.json',JSON.stringify(ids,null,2));console.log('Five distinct images imported; four services and homepage hero assigned.');await p.destroy();
