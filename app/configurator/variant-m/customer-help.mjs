const normalize=value=>String(value||'').toLocaleLowerCase('de-DE').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss');
const money=cents=>(cents/100).toLocaleString('de-DE',{style:'currency',currency:'EUR'});

// Intent matching stays on the device. Answers describe actual controls and
// the active product's capabilities, without inventing manufacturing promises.
export function answerCustomerQuestion(question,{photo=false,logo=false,vectorLogo=false,logoCents,minTextMm=3}={}){
 const q=normalize(question),has=pattern=>pattern.test(q);
 const answer=(topic,title,text,tab=null)=>({topic,title,text,tab});
 if(has(/foto|photo|bild|hochlad|upload|datei|dpi|auflos|pixel|kontrast|unscharf/)&&!has(/logo|svg/)){
  if(!photo)return answer('photo-unavailable','Fotos bei diesem Produkt','Dieses Produkt bietet keinen Foto-Upload an. Auf Edelstahl gravieren wir keine Fotos.'+(logo?' Ein geeignetes Logo kannst du über „Logo“ hinzufügen.':''),logo?'upload':null);
  if(has(/qualitat|kontrast|scharf|unscharf|dpi|auflos|pixel|gross|groesse|geeignet|sollte|gut|aufwert/))return answer('photo-quality','Ein geeignetes Foto','Wähle möglichst die Originaldatei: scharf, gut beleuchtet und kontrastreich. Das Motiv sollte klar erkennbar sein. Es gibt keine feste DPI-Mindestgrenze für dein Kundenfoto. Wir können Fotos aufbereiten; fehlende Details lassen sich jedoch nicht immer wiederherstellen. Prüfe deshalb den Bildausschnitt in der Vorschau.','upload');
  if(has(/grau|schwarz|weiss|farbe|original/))return answer('photo-color','Fotofarbe ändern','Bei Schiefer und Gravuren auf Acrylglas erscheint dein hochgeladenes Foto zunächst in Graustufen. Unter „Bild bearbeiten“ kannst du wieder „Original“ wählen.','upload');
  if(has(/schneid|dreh|spiegel|ausschnitt|maske|herz|verschieb/))return answer('photo-edit','Dein Foto bearbeiten','Wähle dein Foto auf dem Schild und öffne „Bild bearbeiten“. Dort änderst du den Bildausschnitt. Den gesamten Fotobereich verschiebst du am Schild; an den Griffen änderst du seine Größe, soweit die Vorlage das erlaubt.','upload');
  return answer('photo-upload','So lädst du ein Foto hoch','Öffne „Foto“ bzw. „Foto / Logo“ und wähle „Foto hochladen“. Wähle eine JPG-, PNG- oder WebP-Datei. Du kannst auch auf einen Fotobereich in der Vorlage tippen. Dein Foto erscheint danach in der Vorschau.','upload');
 }
 if(has(/logo|vektor|svg/))return logo?answer('logo','Dein Logo hinzufügen',vectorLogo?'Öffne „Logo“ und lade eine SVG-Vektordatei hoch. Schriften müssen in Pfade umgewandelt sein; Fotos und eingebettete Bilder sind nicht geeignet. Vergleiche Original und schwarze Gravurfassung und bestätige die Vorschau.'+(Number.isSafeInteger(logoCents)?' Je Logo: '+money(logoCents)+'.':''):'Öffne „Foto / Logo“ bzw. „Logo“ und wähle „Logo hochladen“. Prüfe anschließend die Vorschau.','upload'):answer('logo-unavailable','Logo-Upload','Bei diesem Produkt ist kein Logo-Upload vorgesehen.');
 if(has(/motiv|symbol|haus|anker/))return answer('motif','Ein Motiv hinzufügen','Unter „Motive“ findest du die Auswahl und die Motivbibliothek. Ein Klick fügt das Motiv hinzu; vorhandene Motive bleiben stehen. Das ursprüngliche Vorlagenmotiv ist enthalten. Jedes zusätzliche Motiv kostet 1,69 €.','motif');
 if(has(/design|vorlage|gestaltung.*wechsel/))return answer('design','Design auswählen','Öffne „Design auswählen“ oder den Reiter „Designs“. Beim Wechsel werden deine eigenen Texte und Fotos übernommen. Die Anordnung und die Motive kommen von der neuen Vorlage. Kann ein Foto nicht übernommen werden, bleibt deine bisherige Gestaltung erhalten.','design');
 if(has(/zoom|finger|maus|vergroess.*ansicht|ansicht/))return answer('zoom','Die Ansicht vergrößern','Auf dem Handy zoomst du mit zwei Fingern, am Computer mit dem Mausrad über dem Schild. Dabei ändert sich nur die Ansicht, nicht die Größe deiner Texte oder Motive.');
 if(has(/losch|entfern|mulleimer/))return answer('delete','Ein Element entfernen','Wähle das Element auf dem Schild und drücke auf den Mülleimer daneben. Mit dem Rückgängig-Pfeil kannst du die Änderung zurücknehmen. Feste Vorlagenelemente lassen sich nur ändern, wenn sie dafür freigegeben sind.');
 if(has(/dreh|rotier/))return answer('rotate','Ein Element drehen','Wähle das Element und ziehe am runden Drehgriff darüber. Feste Vorlagenelemente können eingeschränkt sein.');
 if(has(/speicher|entwurf|spater|wiederherstell/))return answer('save','Deinen Entwurf speichern','Mit „Entwurf speichern“ sicherst du deine Gestaltung im Kundenkonto. Dafür meldest du dich an. Mit den Rückgängig- und Wiederholen-Pfeilen kannst du einzelne Bearbeitungsschritte zurücknehmen oder wiederholen.');
 if(has(/warenkorb|bestell|kauf|preis/))return answer('cart','In den Warenkorb','Prüfe Texte, Fotos, Anordnung und Ausführung. Unten siehst du den Gesamtpreis. Wähle „In den Warenkorb“ und bestätige den Überblick. Wenn etwas noch nicht passt, zeigt dir der Konfigurator den konkreten Grund.');
 if(has(/ausricht|bundig|mitte|zentrier/))return answer('align','Texte ausrichten','Wähle den Text auf dem Schild oder sein Eingabefeld. Die drei Symbole in der Textleiste richten ihn links, mittig oder rechts aus. Beim Verschieben helfen dir die pinken Ausrichtungshinweise.','text');
 if(has(/schrift|fett|kursiv|mm|grosse|groesse/))return answer('font','Schrift und Größe','Wähle zuerst eine Textzeile. Vorn in der Leiste steht ihr Name. Daneben wählst du die Schrift sowie Fett oder Kursiv. Mit − und + oder den Griffen änderst du die Schriftgröße. Mindesthöhe: '+minTextMm.toLocaleString('de-DE')+' mm.','text');
 if(has(/text|name|zeile|umbruch|eingab|schreib/))return answer('text','Deinen Text ändern','Wähle den Text auf dem Schild oder das passende Eingabefeld. Beide werden gemeinsam markiert. Tippe deinen Text ein; mit Enter setzt du einen Zeilenumbruch. Das aktive Feld wächst mit und wird beim Verlassen wieder kompakt.','text');
 return answer('unknown','Wobei brauchst du Hilfe?','Beschreibe kurz, was du machen möchtest, zum Beispiel „Wie lade ich ein Foto hoch?“, „Wie ändere ich die Schrift?“ oder „Wie füge ich ein Motiv hinzu?“.');
}

export function installCustomerHelp({dialog,context,navigate}){
 const form=document.createElement('form');form.className='ux-help-question';
 form.innerHTML='<label for="ux-help-question">Deine Frage zum Konfigurator</label><div><input id="ux-help-question" type="search" placeholder="Wie lade ich ein Foto hoch?" maxlength="300"><button type="submit">Antwort anzeigen</button></div>';
 const examples=document.createElement('div');examples.className='ux-help-examples';
 const result=document.createElement('section');result.className='ux-help-answer';result.setAttribute('aria-live','polite');
 function ask(question){const a=answerCustomerQuestion(question,context());result.replaceChildren();const h=document.createElement('h3'),p=document.createElement('p');h.textContent=a.title;p.textContent=a.text;result.append(h,p);if(a.tab){const b=document.createElement('button');b.type='button';b.textContent=({upload:'Zum Upload',text:'Zum Text',motif:'Zu den Motiven',design:'Zur Designauswahl'})[a.tab];b.onclick=()=>{dialog.close();navigate(a.tab);};result.append(b);}}
 form.onsubmit=e=>{e.preventDefault();ask(form.querySelector('input').value);};
 for(const q of ['Wie lade ich ein Foto hoch?','Wie sollte das Foto sein?','Wie ändere ich die Schrift?','Wie füge ich ein Motiv hinzu?']){const b=document.createElement('button');b.type='button';b.textContent=q;b.onclick=()=>{form.querySelector('input').value=q;ask(q);};examples.append(b);}
 dialog.querySelector('header').after(form,examples,result);return {ask};
}
