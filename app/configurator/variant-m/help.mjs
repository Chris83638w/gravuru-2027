export const GUIDES={
 start:{title:'So funktioniert’s',text:'Wähle zuerst Material und Befestigung unter Optionen, dann dein Design. Danach gestaltest du Texte, Motive und Fotos. Du kannst jederzeit zwischen den Bereichen wechseln.'},
 form:{title:'Material & Befestigung',text:'Wähle die zum Produkt angebotenen Optionen. Aufpreise stehen direkt bei der Auswahl und unter Preisdetails.'},
 design:{title:'Dein Design',text:'Die Designs sind Vorlagen. Du kannst Texte und Motive über Meine Inhalte einzeln einblenden, entsperren, verschieben oder löschen.'},
 text:{title:'Deine Texte',text:'Tippe auf die gewünschte Textzeile und ersetze den Beispieltext. Schrift ändern öffnet die Schriftproben für genau diesen Text.'},
 font:{title:'Schrift & Größe',text:'Wähle Schrift ändern. Die Liste zeigt deinen eigenen Text in jeder Schrift. Scrolle nach unten und wähle eine Schrift. Plus und Minus ändern die Größe in 1-mm-Schritten, mindestens 3 mm.'},
 arrangement:{title:'Mittig ausrichten',text:'Aktiviere Hilfslinien unten links im Produktbild. Die senkrechte Linie markiert die Mitte. Wähle deinen Text und tippe auf Mitte. Beim Ziehen rastet er auch an der Mitte und den Kanten anderer Texte ein. Die kleinen Ankerpunkte zeigen dir die Textmitten, damit du Texte untereinander anordnen kannst. Die gestrichelte Linie ist der Gestaltungsrand; rote Kreise zeigen die Schutzzone um Bohrlöcher. Die Hilfslinien werden nicht mitgefertigt.'},
 motif:{title:'Motive gestalten',text:'Suche in den Bestsellern oder nach einer Kategorie. Meine Inhalte zeigt jedes Element. Dort kannst du ein Motiv entsperren, vergrößern, verschieben oder löschen.'},
 logo:{title:'Fotos & Logos',text:'Du kannst bis zu vier Fotos oder Logos hinzufügen. Jede sichtbare Datei kostet 9,99 Euro extra. Dein Bild erscheint direkt in der Vorschau. Zuschneiden und Freistellen öffnet die Bildbearbeitung. Mit dem Radierer kannst du einen Hintergrund manuell entfernen. Lokal werden Dateien noch nicht an eine Bestellung übertragen.'},
 review:{title:'Vorschau & Bestellung',text:'Prüfe deine Gestaltung in der großen Vorschau und die Aufpreise unter Preisdetails. Der lokale Prüfstand kann noch keine Bestellung auslösen.'},
 save:{title:'Entwurf speichern',text:'Dauerhafte Entwürfe werden künftig nach Anmeldung im Kundenkonto gespeichert. Im lokalen Prüfstand ist die Kontoverbindung noch nicht eingerichtet. Ein PNG-Download wird erst nach dem bezahlten Kauf angeboten. Fertigungsdateien bleiben im Backend.'},
 problem:{title:'Ein Schritt zurück',text:'Mit Rückgängig kannst du die letzte Änderung zurücknehmen. Über Meine Inhalte kannst du versehentlich ausgeblendete Elemente wieder sichtbar machen. Die persönliche KI-Verbindung ist im lokalen Prüfstand noch nicht aktiv.'}
};

export const ACRYLIC_GUIDES={...GUIDES,
 start:{title:'So funktioniert’s',text:'Wähle Größe, Sockel und bei Bedarf die zusätzliche Wandhalterung unter Ausführungen. Tippe auf das Beispielfoto, um es durch dein eigenes Foto zu ersetzen. Texte und Farben kannst du anschließend ändern.'},
 design:{title:'Dein Design',text:'Die feste Vorlage bleibt in ihrer Anordnung erhalten. Texte kannst du bearbeiten und ihre Farbe auswählen. Foto und feste Designelemente bleiben an ihrem Platz.'},
 motif:{title:'Motive gestalten',text:'Zusätzliche Motive findest du in der Motivbibliothek. Die zur Vorlage gehörenden Elemente sind fest platziert; ihre Farbe lässt sich ändern. Deine selbst hinzugefügten Motive kannst du bearbeiten.'},
 logo:{title:'Dein Foto',text:'Ein Foto ist enthalten. Tippe auf das Foto oder auf den Hinweis, um dein eigenes Bild hochzuladen. Ein erneuter Upload ersetzt das Foto an derselben Position. Der Hintergrund bleibt erhalten. Deine Originaldatei bleibt in dieser Sitzung; die Bestellung ist noch nicht verbunden.'}
};

// Adapt the existing assistant in build output; the archived production source remains byte-identical.
export function localAssistant(source,{testMode=true,contact={email:'',phone:'',whatsapp:''}}={}){
  function patch(from,to){if(source.split(from).length!==2)throw Error('Assistent-Anker nicht eindeutig: '+from.slice(0,70));source=source.replace(from,to);}
  patch("  function highlight(section) {",`  function highlight(section) {
    const instance=currentDocument.querySelector('gravuru-configurator');
    if(instance?.uxShowSection){instance.uxShowSection(section);close();return;}`);
  patch("  function open() { panel.hidden = false;", "  function open() { panel.hidden = false;");
  patch("    const node=append('Hallo! Beschreibe deinen Gestaltungswunsch. Im verbundenen Konfigurator kann ich Texte einsetzen, ausrichten, Schriften ändern und Motive ergänzen. Du kannst schreiben oder diktieren.');", `    const node=append('Hallo! Hier findest du Antworten zu Texten, Schriften, Ausrichtung und Uploads.'+${testMode?JSON.stringify(' Der persönliche KI-Chat ist hier noch nicht verbunden.'):"''"});`);
  source=source.replaceAll('Setze Familie Meier auf zwei Zeilen, mittig','Wie richte ich meinen Text mittig aus?').replaceAll('Familie Meier zweizeilig, beide mittig','Wie richte ich Text mittig aus?').replaceAll('Text 2 etwas größer','Wie vergrößere ich einen Text?').replaceAll('Wispr Flow oder ','').replaceAll('Wispr Flow oder','').replaceAll('dem Browser, Wispr Flow oder','dem Browser oder');
  patch("    const designEnabled=$('#design-enabled').checked&&bridge?.available();", `    const section=/schrift|größe|größer|kleiner/i.test(message)?'font':/mitt|ausricht|linie/i.test(message)?'arrangement':/logo|foto|upload/i.test(message)?'logo':/speicher|konto/i.test(message)?'save':/motiv|hund/i.test(message)?'motif':/material|befestig/i.test(message)?'form':'text';
    append(message,'user');input.value='';const info=guideData?.guides?.[section];append(info?.text||'Bitte nutze Schritt für Schritt. Der KI-Server ist hier noch nicht verbunden.','bot',section);voice?.speak(info?.text||'');return;
    const designEnabled=$('#design-enabled').checked&&bridge?.available();`);
  patch("    detail.append(back,h,p,sectionButton(section));", `    detail.append(back,h,p,sectionButton(section));
    const instance=currentDocument.querySelector('gravuru-configurator');
    if(instance){const image=currentDocument.createElement('div');image.setAttribute('aria-label','Deine aktuelle Gestaltung');image.innerHTML=instance.svg(true);image.style.cssText='max-height:130px;overflow:hidden;margin:12px auto';const art=image.querySelector('svg');if(art){art.style.cssText='width:100%;height:130px';}detail.append(image);}
    const speak=currentDocument.createElement('button');speak.className='show-section';speak.textContent='Erklärung anhören';speak.addEventListener('click',()=>{if(!window.speechSynthesis)return showNotice('Vorlesen ist in diesem Browser nicht verfügbar.');window.speechSynthesis.cancel();const speech=new SpeechSynthesisUtterance(info.text);speech.lang='de-DE';speech.rate=.9;window.speechSynthesis.speak(speech);});detail.append(speak);`);
  patch("  function close() { voice?.stop();", "  function close() { window.speechSynthesis?.cancel();voice?.stop();");
  patch("  mount();welcome();loadGuides();const mountTimer=setInterval(mount,1200);", `  const localStyle=document.createElement('style');localStyle.textContent='.launcher{display:none!important}.panel{bottom:0;border-color:#d8e2dc}.head,.message.user{background:#eef4ef}.title,.guide-detail h3{font-family:Arial,sans-serif;color:#243a32}.send,.show-design{background:#235f48}.tab[aria-selected=true]{color:#235f48;border-color:#235f48}.show-section{background:#eef4ef;color:#235f48;min-height:44px}.close{min-width:44px;min-height:44px}.guide-row{font-size:15px;min-height:48px}.fine,.speech-help{font-size:12px}.assistant-controls label,.context-label{display:none!important}';shadow.append(localStyle);
  $('.fine').textContent='Lokale Direkthilfe · Keine Nachrichten werden hier an einen KI-Dienst gesendet.';
  $('#chat-tab').textContent='Direkthilfe';
  const support=${JSON.stringify(contact)};
  const contactBox=document.createElement('div');contactBox.className='human-contact';contactBox.innerHTML='<strong>Persönliche Hilfe</strong>';
  for(const [key,label,prefix]of [['email','E-Mail','mailto:'],['phone','Telefon','tel:'],['whatsapp','WhatsApp','https://wa.me/']])if(support[key]){const link=document.createElement('a');link.textContent=label;link.href=prefix+support[key];contactBox.append(link);}
  if(!Object.values(support).some(Boolean)){const pending=document.createElement('span');pending.textContent='Kontakt zum Gravuru-Team wird hier ergänzt.';contactBox.append(pending);}
  $('.composer').append(contactBox);
  const readable=document.createElement('style');readable.textContent='textarea{font-size:16px!important}.chip,.fine,.speech-help,.human-contact{font-size:14px!important}.chip{min-height:44px}.human-contact{display:flex;gap:8px;flex-wrap:wrap;padding-top:8px}.human-contact a{min-height:44px;display:flex;align-items:center}.human-contact span{display:block;color:#53665c}';shadow.append(readable);
  mount();welcome();loadGuides();const mountTimer=setInterval(mount,1200);`);
  return source;
}
