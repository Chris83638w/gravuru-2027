"""Übersichtsseite der Bestandsdesigns: je Design eine Kachel (Vorschau aus Sprite-Bögen per CSS-Ausschnitt), darunter
Schlüssel/Material und die Knöpfe „Löschen“ (zweimal drücken, Design verschwindet), „Fehler“ (mit Notiz), „Foto fehlt“.
Markierungen liegen in der Artifact-Datenbank (Sammlung „markierungen“, Dokument = Schlüssel).

    python scripts/make-design-uebersicht.py <bestand-ordner> <artifact-ordner> <Stand> <Linie-Titel>

Sprite-Bögen als JPEG (dunkler Grund), damit auch Linien mit mehreren tausend Designs ladbar bleiben.
"""
import collections, html, json, re, sys
from pathlib import Path
from PIL import Image

src = Path(sys.argv[1]); dst = Path(sys.argv[2]); stand = sys.argv[3]; titel = sys.argv[4] if len(sys.argv) > 4 else 'Gedenktafeln'
index = json.loads((src / 'designs.json').read_text(encoding='utf-8'))
(dst / 'bilder').mkdir(parents=True, exist_ok=True)
for old in list((dst / 'bilder').glob('*.png')) + list((dst / 'bilder').glob('*.jpg')): old.unlink()
slug = lambda *a: re.sub(r'[^a-z0-9]+', '-', '-'.join(a).lower()).strip('-')
order = ['Menschen', 'Tiere', 'Sternenkinder', 'Familie', 'Beruf', 'Hinweis', 'Anlass', 'Trauer', 'Sprüche']
last = ['Allgemein', 'offen']
groups = collections.OrderedDict()
for d in index:
    k = d['kategorie']; groups.setdefault((k['ziel'], k['unter']), []).append(d)
keys = sorted(groups, key=lambda zu: (zu[0] in last, order.index(zu[0]) if zu[0] in order else 9, zu[0], zu[1] in last, zu[1]))
ordered = [d for zu in keys for d in groups[zu]]

# Sprite-Bögen: 6 × 10 Kacheln à 300 × 220 (Vorschau eingepasst, transparent)
COLS, ROWS, TW, TH = 6, 10, 300, 220
PER = COLS * ROWS
pos = {}
for si in range(0, len(ordered), PER):
    chunk = ordered[si:si + PER]; n = si // PER + 1
    sheet = Image.new('RGB', (COLS * TW, ROWS * TH), (42, 42, 42))
    for i, d in enumerate(chunk):
        p = src / d['path'] / 'preview.png'
        if not p.exists(): continue
        im = Image.open(p).convert('RGBA'); im.thumbnail((TW - 8, TH - 8))
        x = (i % COLS) * TW + (TW - im.width) // 2; y = (i // COLS) * TH + (TH - im.height) // 2
        sheet.paste(im, (x, y), im); pos[d['key']] = (n, i % COLS, i // COLS)
    sheet.save(dst / 'bilder' / f'sprite-{n}.jpg', quality=82, optimize=True)
nsheets = (len(ordered) + PER - 1) // PER
fotos = sum(1 for d in index if d.get('photoFiles')); missing = sum(1 for d in index if d.get('fontsMissing')); nvar = sum(1 for d in index if d.get('variantOf'))

nav = []
for z in dict.fromkeys(zu[0] for zu in keys):
    zs = [zu for zu in keys if zu[0] == z]
    prim = lambda zu: sum(1 for d in groups[zu] if not d.get('variantOf'))
    nav.append(f'<div class="navgroup"><span class="navz">{html.escape(z)} <b>{sum(prim(zu) for zu in zs)}</b></span>' + ''.join(f'<a href="#{slug(*zu)}">{html.escape(zu[1])} <b data-count="{slug(*zu)}">{prim(zu)}</b></a>' for zu in zs) + '</div>')
main = []
for zu in keys:
    ds = groups[zu]; z, u = zu
    tiles = []
    for d in ds:
        if d['key'] not in pos: continue
        n, c, r = pos[d['key']]
        style = f"background-image:url('bilder/sprite-{n}.jpg');background-position:{c / (COLS - 1) * 100:.4f}% {r / (ROWS - 1) * 100:.4f}%"
        sub = html.escape(', '.join(d.get('materials') or [])) + (f' · <span class="warn">Ersatzschrift: {html.escape(", ".join(d["fontsMissing"]))}</span>' if d.get('fontsMissing') else '')
        if d.get('variants'): sub += f' · <span class="var">+{len(d["variants"])} Varianten</span>'
        if d.get('variantOf'): sub += f' · <span class="var">Variante von {html.escape(d["variantOf"])}</span>'
        tiles.append(f'<div class="tile{" variante" if d.get("variantOf") else ""}" data-key="{html.escape(d["key"])}" data-cat="{slug(z, u)}"><div class="img" style="{style}" role="img" aria-label="{html.escape(d["key"])}"></div>'
                     f'<div class="cap"><b>{html.escape(d["key"])}</b><span>{html.escape(d["kategorie"]["sicherheit"])} · {sub}</span></div>'
                     f'<div class="btns"><button type="button" data-act="loeschen">Löschen</button><button type="button" data-act="fehler">Fehler</button><button type="button" data-act="foto">Foto fehlt</button></div>'
                     f'<input class="notiz" type="text" placeholder="Was ist falsch? Enter speichert" hidden></div>')
    main.append(f'<section id="{slug(z, u)}"><header><h2>{html.escape(z)} <span class="sep">/</span> {html.escape(u)}</h2><p class="meta"><span data-count="{slug(z, u)}">{sum(1 for d in ds if not d.get("variantOf"))}</span> Designs</p></header><div class="grid">{"".join(tiles)}</div></section>')

page = f'''<title>{html.escape(titel)} Designbestand</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
:root {{ --bg:#f3f1ec; --fg:#1f2123; --muted:#6b6e72; --line:#d9d5cc; --accent:#8a5a2b; --panel:#ffffff; --rot:#c0392b; --orange:#d9822b; --blau:#2b6cb0; --tile:#2a2a2a; --font:"Source Sans 3",system-ui,sans-serif; --mono:ui-monospace,"SFMono-Regular",Menlo,monospace }}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg:#1c1d1f; --fg:#ebe8e1; --muted:#a6a39b; --line:#34363a; --accent:#d9a46b; --panel:#26282b; --tile:#111; color-scheme:dark }} }}
:root[data-theme="dark"] {{ --bg:#1c1d1f; --fg:#ebe8e1; --muted:#a6a39b; --line:#34363a; --accent:#d9a46b; --panel:#26282b; --tile:#111; color-scheme:dark }}
body {{ background:var(--bg); color:var(--fg); font-family:var(--font); font-size:16px; line-height:1.45; margin:0; padding:0 max(16px,env(safe-area-inset-right,0px)) 40px max(16px,env(safe-area-inset-left,0px)) }}
.wrap {{ display:grid; grid-template-columns:240px minmax(0,1fr); gap:32px; max-width:1600px; margin:0 auto }}
@media (max-width: 900px) {{ .wrap {{ grid-template-columns:minmax(0,1fr) }} nav {{ position:static !important; max-height:none !important }} }}
h1 {{ font-size:1.5rem; margin:24px 0 4px; text-wrap:balance }}
.lead {{ color:var(--muted); margin:0 0 16px; max-width:65ch }}
nav {{ position:sticky; top:env(safe-area-inset-top,0px); align-self:start; max-height:calc(100vh - 16px); overflow:auto; padding:8px 0 16px; font-size:.95rem }}
.navgroup {{ display:flex; flex-direction:column; gap:2px; margin-bottom:14px }}
.navz {{ text-transform:uppercase; letter-spacing:.06em; font-size:.75rem; color:var(--muted); margin-bottom:4px }}
nav a {{ color:var(--fg); text-decoration:none; padding:4px 8px; border-left:2px solid var(--line); display:flex; justify-content:space-between; gap:8px }}
nav a:hover, nav a:focus-visible {{ border-left-color:var(--accent); outline:none; background:var(--panel) }}
nav b, .navz b {{ font-variant-numeric:tabular-nums; font-weight:600; color:var(--muted) }}
main {{ min-width:0; display:flex; flex-direction:column; gap:36px }}
section header {{ border-bottom:1px solid var(--line); padding-bottom:6px; margin-bottom:12px }}
h2 {{ font-size:1.2rem; margin:0 }}
.sep {{ color:var(--muted); font-weight:400; margin:0 4px }}
.meta {{ margin:2px 0 0; color:var(--muted); font-size:.9rem; font-variant-numeric:tabular-nums }}
.grid {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:14px }}
.tile {{ background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:8px; display:flex; flex-direction:column; gap:6px; border-width:2px }}
.tile .img {{ width:100%; aspect-ratio:{TW}/{TH}; background-color:var(--tile); background-repeat:no-repeat; background-size:{COLS * 100}% {ROWS * 100}%; border-radius:4px; cursor:zoom-in }}
.tile .cap {{ font-size:.78rem; line-height:1.3; display:flex; flex-direction:column; gap:2px; min-height:2.6em }}
.tile .cap b {{ font-family:var(--mono); font-size:.74rem; font-weight:600; word-break:break-all }}
.tile .cap span {{ color:var(--muted) }}
.tile .warn {{ color:var(--orange) }}
.tile .var {{ color:var(--blau) }}
.tile.variante {{ display:none }} body.zeige-varianten .tile.variante {{ display:flex }}
.tile .btns {{ display:flex; gap:6px; flex-wrap:wrap }}
.tile .btns button {{ flex:1 1 auto; font:inherit; font-size:.78rem; padding:5px 6px; border-radius:5px; border:1px solid var(--line); background:var(--bg); color:var(--fg); cursor:pointer }}
.tile .btns button:hover {{ border-color:var(--accent) }}
.tile .btns button.arm {{ background:var(--rot); color:#fff; border-color:var(--rot) }}
.tile.st-fehler {{ border-color:var(--orange) }} .tile.st-fehler button[data-act=fehler] {{ background:var(--orange); color:#fff; border-color:var(--orange) }}
.tile.st-foto {{ border-color:var(--blau) }} .tile.st-foto button[data-act=foto] {{ background:var(--blau); color:#fff; border-color:var(--blau) }}
.tile.st-loeschen {{ display:none; border-color:var(--rot); opacity:.75 }}
body.zeige-geloescht .tile.st-loeschen {{ display:flex }}
.tile.st-loeschen button[data-act=loeschen] {{ background:var(--rot); color:#fff; border-color:var(--rot) }}
.tile .notiz {{ font:inherit; font-size:.78rem; padding:4px 6px; border:1px solid var(--orange); border-radius:5px; background:var(--panel); color:var(--fg) }}
.lightbox {{ position:fixed; inset:0; background:rgba(0,0,0,.92); display:none; z-index:20; align-items:center; justify-content:center; padding:24px }}
.lightbox.open {{ display:flex }}
.lightbox .big {{ width:min(1100px,96vw); aspect-ratio:{TW}/{TH}; background-repeat:no-repeat; background-size:{COLS * 100}% {ROWS * 100}%; background-color:#000 }}
.lightbox button {{ position:fixed; top:calc(12px + env(safe-area-inset-top,0px)); right:calc(12px + env(safe-area-inset-right,0px)); font:inherit; background:#fff; color:#000; border:0; border-radius:6px; padding:8px 14px; cursor:pointer }}
.hint {{ font-size:.85rem; color:var(--muted); margin:0 0 12px; max-width:75ch }}
.status {{ font-size:.85rem; margin:0 0 20px; padding:8px 12px; border:1px solid var(--line); background:var(--panel); border-radius:6px }}
.status b {{ font-variant-numeric:tabular-nums }}
.status ul {{ margin:6px 0 0; padding-left:18px; max-height:220px; overflow:auto; font-size:.8rem }}
.status .r {{ color:var(--rot); font-weight:600 }} .status .o {{ color:var(--orange); font-weight:600 }} .status .b {{ color:var(--blau); font-weight:600 }}
.status label {{ margin-left:12px; cursor:pointer }}
@media (prefers-reduced-motion: no-preference) {{ nav a {{ transition:border-color .15s }} }}
</style>
<div class="wrap">
<nav aria-label="Kategorien">
<h1>{html.escape(titel)}</h1>
<p class="lead">{len(index) - nvar} Bestandsdesigns{f" (+ {nvar} Varianten in anderer Form/Farbe)" if nvar else ""}, Stand {stand} · {fotos} mit Musterfoto · {missing} mit Ersatzschrift</p>
{chr(10).join(nav)}
</nav>
<main>
<p class="hint">Je Design: Vorschau, Schlüssel, Sicherheit der Zuordnung, Materialien (orange: Originalschrift fehlt, Vorschau mit Ersatz). <b>Löschen</b> zweimal drücken – das Design verschwindet aus der Übersicht und wird aus dem Katalog entfernt. <b>Fehler</b> = etwas stimmt nicht (kurz eintippen, Enter speichert). <b>Foto fehlt</b> = Musterfoto fehlt oder falsch. Nochmal drücken hebt eine Markierung auf. Alles wird gespeichert und von Claude ausgelesen; Kategorie-Korrekturen weiterhin in der Excel.</p>
<div class="status" id="status">Markierungen werden geladen …</div>
{chr(10).join(main)}
</main>
</div>
<div class="lightbox" id="lb" role="dialog" aria-label="Design vergrößert"><button type="button" id="lbclose">Schließen</button><div class="big" id="lbbig"></div></div>
<script>
(function(){{
  var lb=document.getElementById('lb'), big=document.getElementById('lbbig');
  document.addEventListener('click',function(e){{ var im=e.target.closest('.tile .img'); if(!im) return; big.style.backgroundImage=im.style.backgroundImage; big.style.backgroundPosition=im.style.backgroundPosition; lb.classList.add('open'); }});
  function close(){{ lb.classList.remove('open'); }}
  document.getElementById('lbclose').addEventListener('click',close);
  lb.addEventListener('click',function(e){{ if(e.target===lb) close(); }});
  document.addEventListener('keydown',function(e){{ if(e.key==='Escape') close(); }});

  var status=document.getElementById('status'); var marks={{}}; var db=null; var armed=null, armTimer=null;
  function tileOf(key){{ var t=document.querySelector('.tile[data-key="'+CSS.escape(key)+'"]'); if(t&&t.classList.contains('variante')){{ document.body.classList.add('zeige-varianten'); var zv=document.getElementById('zv'); if(zv) zv.checked=true; }} return t; }}
  function render(){{
    var counts={{}};
    document.querySelectorAll('.tile').forEach(function(t){{
      var m=marks[t.dataset.key]; t.classList.remove('st-loeschen','st-fehler','st-foto');
      var inp=t.querySelector('.notiz');
      if(m&&m.status) t.classList.add('st-'+m.status);
      if(m&&m.status==='fehler'){{ inp.hidden=false; if(document.activeElement!==inp) inp.value=m.notiz||''; }} else {{ inp.hidden=true; }}
      if(!(m&&m.status==='loeschen')&&!t.classList.contains('variante')) counts[t.dataset.cat]=(counts[t.dataset.cat]||0)+1;
    }});
    document.querySelectorAll('[data-count]').forEach(function(el){{ el.textContent=counts[el.dataset.count]||0; }});
    var ks=Object.keys(marks).filter(function(k){{return marks[k]&&marks[k].status;}}).sort();
    var nl=ks.filter(function(k){{return marks[k].status==='loeschen';}}).length, np=ks.filter(function(k){{return marks[k].status==='foto';}}).length, nf=ks.length-nl-np;
    var h='<b>'+ks.length+'</b> markiert: <span class="r">'+nl+' gelöscht</span> · <span class="o">'+nf+' Fehler</span> · <span class="b">'+np+' Foto fehlt</span>'
      +'<label><input type="checkbox" id="zg"'+(document.body.classList.contains('zeige-geloescht')?' checked':'')+'> gelöschte anzeigen (zum Wiederherstellen nochmal „Löschen“ drücken)</label>'
      +({nvar}?'<label><input type="checkbox" id="zv"'+(document.body.classList.contains('zeige-varianten')?' checked':'')+'> Varianten anzeigen (gleiches Design in anderer Form/Farbe, {nvar})</label>':'')
      +(db?'':' · <i>Zum Markieren bitte in claude.ai angemeldet sein.</i>');
    if(ks.length) h+='<ul>'+ks.map(function(k){{ var m=marks[k]; return '<li><a href="#" data-jump="'+k+'">'+k+'</a> – <span class="'+(m.status==='loeschen'?'r':m.status==='foto'?'b':'o')+'">'+(m.status==='loeschen'?'gelöscht':m.status==='foto'?'Foto fehlt':'Fehler')+'</span>'+(m.notiz?': '+m.notiz.replace(/</g,'&lt;'):'')+'</li>'; }}).join('')+'</ul>';
    status.innerHTML=h;
  }}
  status.addEventListener('change',function(e){{ if(e.target.id==='zg') document.body.classList.toggle('zeige-geloescht',e.target.checked); if(e.target.id==='zv') document.body.classList.toggle('zeige-varianten',e.target.checked); }});
  status.addEventListener('click',function(e){{ var a=e.target.closest('[data-jump]'); if(!a) return; e.preventDefault(); var t=tileOf(a.dataset.jump); if(t){{ if(t.classList.contains('st-loeschen')){{ document.body.classList.add('zeige-geloescht'); var zg=document.getElementById('zg'); if(zg) zg.checked=true; }} t.scrollIntoView({{behavior:'smooth',block:'center'}}); }} }});
  function save(key,data){{
    if(!db){{ status.textContent='Speichern nicht möglich – bitte in claude.ai anmelden.'; return; }}
    var ref=db.doc('markierungen/'+key);
    var p=data?ref.set(Object.assign({{zeit:new Date().toISOString()}},data)):ref.delete();
    p.catch(function(err){{ status.textContent='Speichern fehlgeschlagen: '+(err&&err.code||err); }});
  }}
  function disarm(){{ if(armed){{ armed.classList.remove('arm'); armed.textContent='Löschen'; armed=null; }} clearTimeout(armTimer); }}
  document.addEventListener('click',function(e){{
    var b=e.target.closest('.tile .btns button'); if(!b){{ return; }}
    e.preventDefault();
    var t=b.closest('.tile'), key=t.dataset.key, act=b.dataset.act, m=marks[key]||{{}};
    if(act==='loeschen'){{
      if(m.status==='loeschen'){{ delete marks[key]; render(); save(key,null); return; }}  // wiederherstellen
      if(armed!==b){{ disarm(); armed=b; b.classList.add('arm'); b.textContent='Wirklich löschen?'; armTimer=setTimeout(disarm,5000); return; }}
      disarm(); marks[key]={{status:'loeschen',notiz:''}}; render(); save(key,marks[key]); return;
    }}
    disarm();
    if(m.status===act){{ delete marks[key]; render(); save(key,null); return; }}
    marks[key]={{status:act,notiz:act==='fehler'?(m.notiz||''):''}}; render(); save(key,marks[key]);
    if(act==='fehler'){{ var inp=t.querySelector('.notiz'); inp.hidden=false; inp.focus(); }}
  }});
  document.addEventListener('keydown',function(e){{
    if(e.key!=='Enter'||!e.target.classList.contains('notiz')) return;
    var t=e.target.closest('.tile'), key=t.dataset.key; marks[key]={{status:'fehler',notiz:e.target.value.trim()}}; render(); save(key,marks[key]); e.target.blur();
  }});
  document.addEventListener('focusout',function(e){{
    if(!e.target.classList||!e.target.classList.contains('notiz')) return;
    var t=e.target.closest('.tile'), key=t.dataset.key, m=marks[key]; if(!m||m.status!=='fehler') return;
    if((m.notiz||'')!==e.target.value.trim()){{ marks[key]={{status:'fehler',notiz:e.target.value.trim()}}; render(); save(key,marks[key]); }}
  }});
  render();
  if(window.claude&&window.claude.use){{
    window.claude.use('db').then(function(d){{
      db=d; if(!db){{ render(); return; }}
      db.collection('markierungen').onSnapshot(function(snap){{
        marks={{}}; snap.docs.forEach(function(doc){{ if(doc.exists) marks[doc.id]=doc.data(); }}); render();
      }}, function(err){{ status.textContent='Markierungen nicht lesbar: '+(err&&err.code||err); }});
    }}).catch(function(){{ render(); }});
  }} else {{ render(); }}
}})();
</script>
'''
(dst / 'index.html').write_text(page, encoding='utf-8')
print(len(index), 'Designs,', nsheets, 'Sprite-Bögen,', len(pos), 'Kacheln')
