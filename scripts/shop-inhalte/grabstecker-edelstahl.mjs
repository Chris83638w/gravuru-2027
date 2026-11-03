// Entwurfstexte Grabstecker aus Edelstahl (Claude, 02.11.2026) für scripts/shop-schnitt-plan.mjs --form.
// Fakten nur aus Katalog/Chris: Edelstahl (V2A), schwarze Lasergravur, kein Foto, Stiel steckt in der Erde,
// Fertigung in Bielefeld, Preise je Größe aus der Familie. Keine erfundenen Versprechen (Lieferzeit, UV-Garantie).
// Texte werden je Produkt aus Bausteinen gemischt; shop-schnitt-plan prüft alle gegeneinander auf Fünfwortfolgen.

const FORM={
 'GS-HERZ':{n:'Herz',a:'in Herzform',kw:'herz',bild:'ein klares Herz auf schlankem Stiel'},
 'GS-HERZRAHMEN':{n:'Herz mit Rahmen',a:'als Herz mit graviertem Rahmen',kw:'herz-rahmen',bild:'ein Herz, das von einer feinen Rahmenlinie eingefasst ist'},
 'GS-HERZDOPPEL':{n:'Herz mit Doppelrahmen',a:'als Herz mit doppeltem Rahmen',kw:'herz-doppelrahmen',bild:'ein Herz mit zwei umlaufenden Linien'},
 'GS-HERZLIEGEND':{n:'Herz liegend',a:'als liegendes Herz',kw:'herz-liegend',bild:'ein quer liegendes Herz mit viel Platz für längere Namen'},
 'GS-HERZPFOTE':{n:'Herz mit Pfote',a:'als Herz mit Pfotenausschnitt',kw:'herz-pfote',bild:'ein Herz mit ausgeschnittener Pfote'},
 'GS-KREUZ':{n:'Kreuz',a:'in Kreuzform',kw:'kreuz',bild:'ein schlichtes Kreuz'},
 'GS-KREUZ2':{n:'Kreuz geschwungen',a:'als geschwungenes Kreuz',kw:'kreuz',bild:'ein Kreuz mit weichen, geschwungenen Enden'},
 'GS-ENGEL':{n:'Engel',a:'in Engelform',kw:'engel',bild:'ein Engel mit Flügeln und Heiligenschein'},
 'GS-STERN':{n:'Stern',a:'in Sternform',kw:'stern',bild:'ein fünfzackiger Stern'},
 'GS-STERN2':{n:'Stern mit Innenstern',a:'als Stern mit innerem Stern',kw:'stern',bild:'ein Stern mit eingraviertem Innenstern'},
 'GS-INFINITY':{n:'Unendlichkeit',a:'als Unendlichkeitszeichen',kw:'unendlichkeit',bild:'das Zeichen für Unendlichkeit'},
 'GS-KATZE':{n:'Katze',a:'in Katzenform',kw:'katze',bild:'eine sitzende Katzensilhouette'},
 'GS-PFOTE':{n:'Pfote',a:'in Pfotenform',kw:'pfote',bild:'eine große Pfote'}
};
const GRUPPE={
 'Mensch allgemein':{t:'Verstorbene',f:'für Verstorbene',kw:'verstorbene',intro:['Ein persönlicher Gruß am Grab, der Name und Lebensdaten eines geliebten Menschen festhält.','Für einen Menschen, der fehlt: mit Namen, Daten und einem Satz, der bleibt.','Ein stilles Zeichen der Erinnerung für Grab, Urnengrab oder Gedenkort.']},
 'Mama':{t:'Mama',f:'für Mama',kw:'mama',intro:['Für die Frau, die immer da war: ein Grabstecker mit ihrem Namen und Worten an Mama.','Ein Gruß an Mama, der am Grab bleibt, mit Name, Daten und einem Satz von Herzen.','Wenn die Mutter fehlt, hält dieser Grabstecker fest, was sie für die Familie war.']},
 'Papa':{t:'Papa',f:'für Papa',kw:'papa',intro:['Für den Vater, der fehlt: ein Grabstecker mit seinem Namen und einem Gruß an Papa.','Ein bleibender Gruß an Papa, mit Name, Daten und Worten der Familie.','Erinnerung an den Vater, schlicht und dauerhaft am Grab.']},
 'Oma/Opa':{t:'Oma und Opa',f:'für Oma und Opa',kw:'oma-opa',intro:['Für Oma oder Opa: ein Gruß der Enkel, der am Grab sichtbar bleibt.','Großeltern hinterlassen Spuren. Dieser Grabstecker trägt Namen, Daten und ein Wort der Enkel.','Ein liebevolles Andenken an Oma und Opa, gestaltet von der ganzen Familie.']},
 'Sternenkind':{t:'Sternenkind',f:'für Sternenkinder',kw:'sternenkind',intro:['Für ein Sternenkind, das zu früh gehen musste: ein zarter Grabstecker mit seinem Namen.','Ein kleines, würdiges Zeichen für ein Sternenkind, mit Name und Datum.','Für Eltern von Sternenkindern: ein Ort für den Namen, den ihr gewählt habt.']},
 'Hund':{t:'Hund',f:'für Hunde',kw:'hund',intro:['Für den treuen Begleiter: ein Grabstecker mit dem Namen deines Hundes.','Wenn der Hund fehlt, bleibt sein Name hier sichtbar, im Garten oder auf dem Tierfriedhof.','Ein Andenken an deinen Hund, schlicht graviert und dauerhaft im Boden verankert.']},
 'Katze':{t:'Katze',f:'für Katzen',kw:'katze',intro:['Für deine Katze, die einen festen Platz im Herzen hat: ein Grabstecker mit ihrem Namen.','Erinnerung an eine besondere Katze, mit Name, Daten und einem Satz von dir.','Ein ruhiges Zeichen für das Katzengrab im Garten oder auf dem Tierfriedhof.']},
 'Tier allgemein':{t:'Haustier',f:'für Haustiere',kw:'haustier',intro:['Für jedes Haustier, das zur Familie gehörte: ein Grabstecker mit seinem Namen.','Ob Kaninchen, Vogel oder Pferd: Hier bleibt der Name deines Tieres sichtbar.','Ein Andenken an ein geliebtes Tier, gestaltet mit Name und Daten.']},
 'Religiös christlich':{t:'christlich',f:'mit christlichem Motiv',kw:'christlich',intro:['Ein Grabstecker mit christlichem Gruß, für Name, Lebensdaten und ein Wort des Glaubens.','Für Familien, denen der Glaube Halt gibt: Name, Daten und ein christlicher Segen.','Christliche Erinnerung am Grab, schlicht und würdevoll.']},
 'Religiös jüdisch':{t:'jüdisch',f:'mit jüdischem Motiv',kw:'juedisch',intro:['Ein Grabstecker in jüdischer Tradition, mit Name, Lebensdaten und passendem Gruß.','Erinnerung nach jüdischer Tradition: Name und Daten, würdevoll graviert.','Für jüdische Familien: ein schlichtes Zeichen des Gedenkens am Grab.']},
 'Religiös islamisch':{t:'islamisch',f:'mit islamischem Motiv',kw:'islamisch',intro:['Ein Grabstecker mit islamischem Gruß, für Name, Lebensdaten und ein Gebet.','Gedenken in islamischer Tradition, mit Name und Daten, schlicht graviert.','Für muslimische Familien: ein würdiges Zeichen der Erinnerung am Grab.']}
};
const MATERIAL=[
 'Gefertigt aus rostfreiem Edelstahl (V2A), die Gravur ist schwarz und gut lesbar.',
 'Rostfreier V2A-Edelstahl trägt die schwarze Lasergravur, Namen und Daten bleiben klar erkennbar.',
 'Die schwarze Gravur steht auf Edelstahl, der nicht rostet, und bleibt draußen gut lesbar.',
 'Edelstahl V2A, schwarz graviert: ein Material, das für den Einsatz im Freien gemacht ist.',
 'Wir gravieren schwarz auf rostfreiem Edelstahl, damit Name und Daten lange lesbar bleiben.'
];
const STIEL=[
 'Der lange Stiel wird einfach in die Erde gesteckt, ohne Werkzeug und ohne Fundament.',
 'Den Stiel steckst du direkt in die Erde, das Grabschild steht danach fest und gerade.',
 'Aufstellen dauert Sekunden: Stiel in den Boden drücken, fertig.',
 'Kein Bohren, kein Kleben: der Stiel hält den Grabstecker sicher im Boden.'
];
const GESTALTUNG=[
 'Wähle eines der {n} Designs und ändere Name, Daten und Spruch direkt in der Vorschau.',
 'Im Gestalter siehst du sofort, wie dein Text aussieht, {n} passende Designs stehen zur Auswahl.',
 'Du suchst aus {n} Designs aus und passt jeden Text selbst an, die Vorschau zeigt das Ergebnis.',
 '{n} Vorlagen helfen beim Start, Name, Daten und Spruch trägst du selbst ein.'
];
const CTA=[
 'Jetzt personalisieren','Jetzt gestalten','Jetzt Namen eintragen','Jetzt Grabstecker gestalten','Jetzt Andenken gestalten'
];
const euro=c=>(c/100).toFixed(2).replace('.',',')+' €';
const pick=(arr,i)=>arr[((i%arr.length)+arr.length)%arr.length];
const hash=s=>{let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))|0;return Math.abs(h);};
const slug=s=>String(s).toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

export function texts({size,sizes,group,designsInGroup}){
 const F=FORM[size.groupKey],G=GRUPPE[group];
 if(!F||!G)throw Error('Grabstecker-Text fehlt für '+size.groupKey+' / '+group);
 const h=hash(size.groupKey+group),fi=Object.keys(FORM).indexOf(size.groupKey),gi=Object.keys(GRUPPE).indexOf(group);
 const list=(sizes||[size]);
 const groesse=list.map(s=>s.label.split(' · ')[0].trim().split(' ').pop()+' ('+s.label.split(' · ')[1]+', '+euro(s.baseCents)+')').join(', ');
 const preisAb=Math.min(...list.map(s=>s.baseCents));
 const designs=designsInGroup;
 const title='Grabstecker '+F.n+' '+G.f+' – Edelstahl mit Gravur';
 const cta=pick(CTA,h);
 const descriptionHtml=[
  '<p>'+pick(G.intro,fi)+'</p>',
  '<p>Die Form zeigt '+F.bild+'. '+pick(STIEL,gi+fi)+'</p>',
  '<p>'+pick(GESTALTUNG,h>>3).replace('{n}',String(designs))+' '+pick(MATERIAL,h>>5)+'</p>',
  '<p><strong>Größen:</strong> '+groesse+'.</p>',
  '<p>Hergestellt in unserer Werkstatt in Bielefeld. '+cta+'.</p>'
 ].join('\n');
 const seoTitle=('Grabstecker '+F.n+' '+G.f+' | '+cta).slice(0,70);
 const seoDescription=('Grabstecker '+F.a+' '+G.f+' aus Edelstahl, schwarz graviert, ab '+euro(preisAb)+'. '+cta+' – Name und Daten selbst eintragen.').slice(0,160);
 const kw=['grabstecker',F.kw,G.kw,'edelstahl','gravur'];
 return {
  handle:slug('grabstecker-'+F.n+'-'+G.f),
  productType:'Grabstecker',
  title,descriptionHtml,seoTitle,seoDescription,
  tags:['Grabstecker','Edelstahl','Gravur','Andenken',F.n,G.t].filter((v,i,a)=>a.indexOf(v)===i),
  imageFile:kw.join('-')+'.webp',
  imageAlt:'Grabstecker '+F.a+' aus Edelstahl mit Stiel, '+G.f+', schwarz graviert mit Name und Lebensdaten',
  collections:['grabstecker','grabstecker-'+G.kw]
 };
}
