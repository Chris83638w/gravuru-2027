// B1 „Werkstatt einheitlich“: eine Quelle für Kopfzeile und Hauptnavigation aller Werkstattseiten.
// Die HTML-Dateien in ui/ tragen den erzeugten Block zwischen den Markierungen statisch
// (`node scripts/workshop-shell-sync.mjs` schreibt ihn neu); workshop-shell.test.mjs prüft,
// dass jede Seite genau diesen Block enthält. Kundenseiten (Kundeneditor, Ausführungswahl,
// Kundenansicht) bekommen ihn nicht.

export const SHELL_START='<!-- werkstatt-kopf: erzeugt aus app/workshop/workshop-shell-markup.mjs, nicht von Hand ändern -->';
export const SHELL_END='<!-- /werkstatt-kopf -->';

/** Hauptnavigation oben. `view` = Ansicht der Produktliste (dort Schaltflächen statt Links). */
export const MAIN_NAVIGATION=Object.freeze([
  {key:'produkte',label:'Produkte',href:'/werkstatt/',icon:'cube',view:'products'},
  {key:'master',label:'Mastervorlagen',href:'/werkstatt/?view=masters',icon:'files',view:'masters'},
  {key:'stapel',label:'Stapelverarbeitung',href:'/werkstatt/serien/',icon:'stack-2'},
  {key:'bestellungen',label:'Bestellungen',href:'/werkstatt/bestellungen/',icon:'shopping-cart'},
  {key:'konfis',label:'Konfis',href:'/werkstatt/konfis/',icon:'adjustments-horizontal'},
  // Katalogseite (Codex 22.10.2026): Linien → Unterkategorien → Hauptprodukte; in die gemeinsame Kopfzeile aufgenommen (Zusammenführung 22.10.2026).
  {key:'katalog',label:'Katalog',href:'/werkstatt/katalog/',icon:'files'},
  // Design-Dashboard (Chris 23.10.2026): Designs Linie für Linie prüfen und korrigieren.
  {key:'designs',label:'Designs',href:'/werkstatt/designs/',icon:'pencil'},
]);

/** Verwaltung ▾ */
export const MANAGEMENT_NAVIGATION=Object.freeze([
  {key:'familien',label:'Produktfamilien',href:'/werkstatt/familien/'},
  {key:'profile',label:'Schriften & Profile',href:'/werkstatt/profile/'},
  {key:'ausgaben',label:'Ausgaben',href:'/werkstatt/ausgaben/'},
  {key:'fertigung',label:'Fertigungsprofile',href:'/werkstatt/fertigung/'},
  {key:'ausfuehrungen',label:'Ausführungen',href:'/werkstatt/ausfuehrungen/'},
  {key:'konturen',label:'Formkonturen',href:'/werkstatt/konturen/'},
  {key:'acryl',label:'Acryl-Galerie',href:'/werkstatt/acryl/'},
  {key:'pruefstaende',label:'Prüfstände',href:'/werkstatt/pruefstaende/'},
  {key:'shopvorbereitung',label:'Shop vorbereiten',href:'/werkstatt/shopvorbereitung/'},
  {key:'mandanten',label:'Mandanten',href:'/werkstatt/mandanten/'},
]);

/** Alle Werkstattseiten mit gemeinsamer Kopfzeile: Datei in ui/ → aktiver Navigationspunkt. */
export const WORKSHOP_PAGES=Object.freeze([
  {file:'index.html',route:'/werkstatt/',current:'produkte',spa:true},
  {file:'batch.html',route:'/werkstatt/serien/',current:'stapel'},
  {file:'orders.html',route:'/werkstatt/bestellungen/',current:'bestellungen'},
  {file:'cart-handoff.html',route:'/werkstatt/warenkorbpruefung/',current:'bestellungen'},
  {file:'konfis.html',route:'/werkstatt/konfis/',current:'konfis'},
  {file:'families.html',route:'/werkstatt/familien/',current:'familien'},
  {file:'profiles.html',route:'/werkstatt/profile/',current:'profile'},
  {file:'fontsets.html',route:'/werkstatt/schriftgruppen/',current:'profile'},
  {file:'export-jobs.html',route:'/werkstatt/ausgaben/',current:'ausgaben'},
  {file:'production-profiles.html',route:'/werkstatt/fertigung/',current:'fertigung'},
  {file:'form-variants.html',route:'/werkstatt/ausfuehrungen/',current:'ausfuehrungen'},
  {file:'variant-batch.html',route:'/werkstatt/ausfuehrungen-import/',current:'ausfuehrungen'},
  {file:'contours.html',route:'/werkstatt/konturen/',current:'konturen'},
  {file:'review-snapshots.html',route:'/werkstatt/pruefstaende/',current:'pruefstaende'},
  {file:'shop-preparation.html',route:'/werkstatt/shopvorbereitung/',current:'shopvorbereitung'},
  {file:'form-product.html',route:'/werkstatt/formprodukt/',current:'produkte'},
  {file:'tenants.html',route:'/werkstatt/mandanten/',current:'mandanten'},
  {file:'catalog-structure.html',route:'/werkstatt/katalog/',current:'katalog'},
  {file:'acryl-gallery.html',route:'/werkstatt/acryl/',current:'acryl'},
  {file:'design-dashboard.html',route:'/werkstatt/designs/',current:'designs'},
]);

const esc=v=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const icon=name=>`<img class="ws-icon" src="/workshop-ui/editor-icons/${name}.svg" alt="" aria-hidden="true">`;

/** Kopfzeile für einen Navigationspunkt. `spa`: Produktliste (Produkte/Mastervorlagen schalten per data-view). */
export function topbarMarkup(current,{spa=false}={}){
  if(![...MAIN_NAVIGATION,...MANAGEMENT_NAVIGATION].some(n=>n.key===current))throw new TypeError('Unbekannter Navigationspunkt: '+current);
  const main=MAIN_NAVIGATION.map(n=>{
    if(spa&&n.view){const active=n.key===current;return `<button type="button" class="ws-nav-item${active?' active':''}" data-view="${n.view}" aria-pressed="${active}">${icon(n.icon)}${esc(n.label)}</button>`;}
    return `<a class="ws-nav-item" href="${n.href}"${n.key===current?' aria-current="page"':''}>${icon(n.icon)}${esc(n.label)}</a>`;
  }).join('');
  const inManagement=MANAGEMENT_NAVIGATION.some(n=>n.key===current);
  const menu=MANAGEMENT_NAVIGATION.map(n=>`<a href="${n.href}"${n.key===current?' aria-current="page"':''}>${esc(n.label)}</a>`).join('');
  return [SHELL_START,
    '<header class="ws-topbar">',
    '<a class="ws-brand" href="/werkstatt/"><em>gravuru</em> werkstatt</a>',
    `<nav class="ws-nav" aria-label="Hauptnavigation">${main}</nav>`,
    `<div class="ws-tools"><span data-workshop-session role="status">Verbindung wird geprüft …</span><details class="management-menu"><summary${inManagement?' class="ws-current"':''}>Verwaltung</summary><nav aria-label="Verwaltung">${menu}</nav></details></div>`,
    '</header>',
    SHELL_END].join('\n');
}

/** Ersetzt den markierten Block einer Seite (für das Sync-Skript und den Test). */
export function withTopbar(html,page){
  const start=html.indexOf(SHELL_START),end=html.indexOf(SHELL_END);
  if(start<0||end<start||html.indexOf(SHELL_START,start+1)>=0)throw Error(page.file+': Kopfzeilen-Markierung fehlt oder ist doppelt.');
  return html.slice(0,start)+topbarMarkup(page.current,{spa:page.spa})+html.slice(end+SHELL_END.length);
}
