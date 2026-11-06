# Bedienkorrekturen – Mika, 05.11.2026

Quelle: Mikails ausdrückliche Freigabe „Kannst loslegen“ nach Screenshot 91, einschließlich der unmittelbar davor gesammelten Desktop- und Handy-Korrekturen. Abstimmung: Issue 168, Kommentar 6661370403. Ausgang: 53ed706 / Vorschau R4.

## Verbindlicher Umfang vor Umsetzung

- Schrift anklicken übernimmt sie sofort und schließt die Auswahl; kein zusätzlicher Übernehmen-Schritt.
- Eine nicht leere Motivsuche durchsucht alle für das Produkt angebotenen Motive unabhängig von der gewählten Kategorie. Ohne Suchtext gilt wieder die Kategorie.
- Häufige Motivsuchbegriffe und erfolglose Suchen mit Anzahl, Zeitraum und Produktgruppe in der bestehenden Shopify-App auswerten. Keine Kundenkennungen speichern.
- Kundenfotos zunächst vollständig und proportional zeigen. Beschnitt nur nach bewusster Bearbeitung. Fotos, Position, Größe und Bearbeitung nach Neuladen erhalten; keine zusätzlichen leeren Fotoboxen.
- Vorschauzoom ausschließlich per Regler, weder Finger-Gesten noch Mausrad. Normales Scrollen erhalten.
- Größe hochgeladener Fotos ebenfalls ausschließlich per Regler, auf Handy und PC. Fotos bleiben verschiebbar.
- Warenkorbbutton grün mit weißer Schrift. Wichtige Aktionen erhalten konsistente, kontrastreiche Farbakzente.

Bestehende Preisregeln (19,99 / 24,99 Euro Grundpreis, 1,69 Euro Zusatzmotiv), Ausführungen und Designs bleiben erhalten. Kein zusätzlicher Produktlaunch und keine Verkaufsfreigabe der 43 Vorlagen; diese erfordert weiterhin Mikails Sichtprüfung. Bestehende Warenkorbgrenzen klar ausweisen.

## Umsetzung und Nachweise

Veröffentlicht in der bestehenden Prüfstrecke am 05.11.2026. Aktive Laufzeit `private/mika-konfi-hundetest-r5c-20261105`, finales Paket `editor-e1a26ccc8a1ad1de.mjs` (öffentlich unter `/_acryl-bundle/`). Der [Servernachweis](2026-11-05-konfi-bedienkorrekturen-servernachweis.json) wurde nach den letzten Korrekturen um 16:30 UTC gelesen.

### Bedienung

- Schriftwahl übernimmt sofort und schließt die Auswahl. Tatsächlich auf der veröffentlichten Seite mit Nunito geprüft.
- Nicht leere Motivsuche hat Vorrang vor der Kategorie; nach Leeren gilt die vorherige Kategorie wieder. Kategorie Geburtstag + „Kreuz“ liefert im Browser 18 Treffer.
- Frei hochgeladene rechteckige Fotos erhalten anfangs ihr vollständiges Seitenverhältnis. Bewusste Ausschnittbearbeitung bleibt möglich. Größenänderung erfolgt über „Fotogröße“, Ansichtszoom über „Ansicht“. Foto-Eckgriffe und Finger-/Mausradskalierung sind gesperrt; Verschieben, Drehen und normales Scrollen bleiben erhalten.
- Uploaddateien werden zusätzlich zum Entwurf im Browser gespeichert (IndexedDB, maximal sieben Tage), einschließlich bearbeiteter Datei und Metadaten. Beim Wiederherstellen entstehen neue gültige Blob-URLs, ohne erneut zu platzieren oder zu verkleinern. Speicherfehler werden einmal gemeldet. Bereits vor dieser Korrektur verlorene Datei-Bytes lassen sich daraus nicht rekonstruieren.
- „Entfernen“ löscht ein frei hinzugefügtes Fotoobjekt vollständig. Echte Fotovorlagen behalten ihren vorgesehenen Rahmen. Rückgängig bleibt möglich. Damit entstehen weder verwaiste leere Fotoboxen noch der irreführende Hinweis zur freien Hinzufügung.
- Warenkorbbutton grün/weiß, Speichern und Hochladen dunkelgrün, weitere Aktionen und aktiver Reiter hellgrün. Bestehende farbige Textwerkzeuge bleiben erhalten. Der Ansichtsregler liegt unterhalb der Bemaßung; die mobile Vorschauhöhe berücksichtigt seinen Platz.

### Suchauswertung in der bestehenden App

Neue Seite `/werkstatt/motivsuche/`, Navigationseintrag „Suchauswertung“ auch in der bisherigen Werkstatt-Navigation. Sie bietet 7/30/90/365 Tage, Produktgruppe und Herkunft (Shop/Vorschau/alle), Suchanzahl, Suchen ohne Treffer sowie die häufigsten und erfolglosen Begriffe.

Der Konfi zählt nach 1,2 Sekunden Eingabepause einen normalisierten Suchbegriff einmal je geöffnetem Editor. Gespeichert werden Tagesaggregate je Mandant, Produktgruppe, Begriff und Herkunft; keine Kundenkennungen und keine einzelnen Ereignisprotokolle. E-Mail-/URL-/Telefon-/Markup-Eingaben werden herausgefiltert. Statistiken bleiben hinter der vorhandenen Shopify-Sitzungsauthentifizierung; ein nicht angemeldeter Abruf liefert HTTP 401.

Die zwei bestehenden statischen Prüfprodukte sind ausdrücklich in der privaten `motif-search-previews.json` registriert. Die Produktgruppe wird serverseitig bestimmt, nicht vom Browser übernommen. Unbekannte Produkte werden abgelehnt. Das erzeugt weder Katalogprodukte noch eine Verkaufsfreigabe.

**Suchdaten direkt im echten Shopify-iframe visuell geprüft; Wiederöffnung separat korrigiert.** Mikail präzisiert am 05.11.2026: „Die Seite öffnet sich, aber ohne Suchbegriffe“. Im geöffneten Shopify-Tab stand Herkunft auf „Shop“, entsprechend waren 0 Suchanfragen und 0 ohne Treffer sichtbar. Nach Wechsel auf „Vorschau / Prüfung“ erschienen 2 Suchanfragen, 1 ohne Treffer: „kreuz“ einmal und „giraffe mit hut“ einmal; die Liste ohne Treffer enthielt ausschließlich „giraffe mit hut“. Zeitraum letzte 30 Tage, alle Produktgruppen. Das stimmt mit dem vorherigen Servernachweis überein. Tatsächlicher Bildschirmnachweis dieses Filterwechsels: `shopify-suchauswertung-geprueft-20261105.png` im Ausgabeordner des Chats. Dieser erste Sichttest prüfte noch nicht das erneute Öffnen.

Mikails erneute Meldung „jetzt ist wieder nichts drin“ wurde anschließend reproduziert: Der Herkunftsfilter sprang beim Öffnen wieder auf „Shop“. Die vorherige Einschätzung „keine Codeänderung erforderlich“ war damit unvollständig. `motif-searches.mjs` speichert nun ausschließlich Zeitraum, Produktgruppe und Herkunft im Browser, getrennt nach Shop. Authentifizierung und Suchdaten bleiben serverseitig unverändert; Tokens werden nicht gespeichert. Ungültige Einstellungen werden verworfen, gesperrter Browserspeicher lässt den Bericht weiter funktionieren, entfernte Produktgruppen fallen sichtbar auf „Alle Produktgruppen“ zurück. Neue Browser behalten den bisherigen Standard „Shop“.

Der [separate Server- und Browsernachweis zur Filterkorrektur](2026-11-05-suchauswertung-filter-servernachweis.json) belegt die Veröffentlichung um 18:46 UTC in der bestehenden R5c-Laufzeit, **6/6 lokale und 6/6 Linux-Prüfungen**, unveränderten Startdatei-Hash und Sicherung vor dem Austausch. Nur Berichtsskript und zugehörige Testdatei wurden übertragen, kein Konfi-Build und kein Neustart. Öffentliches Berichtsskript: HTTP 200 mit `no-store, private`, neue Filterpersistenz und korrekter `/api/workshop/acryl/`-Pfad. Code: **f749b353**.

**Wiederöffnung des Berichts inzwischen tatsächlich geprüft.** Mikail bestätigt das manuelle Neuladen, meldet aber weiterhin keine Ergebnisse. In seinem offenen Tab war die erstmalig gespeicherte Herkunft noch „Shop“. Direkt auf „Vorschau / Prüfung“ umgestellt: beide Begriffe, 2 Suchanfragen und 1 ohne Treffer erscheinen. Anschließend über den sichtbaren Menüpunkt „Suchauswertung“ erneut geöffnet; neues Berichtsdokument geladen, Herkunft bleibt „Vorschau / Prüfung“ und dieselben Ergebnisse werden erneut abgerufen und angezeigt. Zeitraum letzte 30 Tage, alle Produktgruppen. Nachweisbild `shopify-suchauswertung-nach-neuoeffnen-20261105.png` im Ausgabeordner des Chats; Ansicht für Mikail mit Filter und beiden Tabellen geöffnet gelassen. Die beiden Begriffe sind weiterhin ausdrücklich Prüfsuchen, keine Kundensuchen. Die automatische Voll-Neuladung des äußeren Shopify-Admins blieb eine Einschränkung der Browsersteuerung; sie wird nicht als neuer erfolgreicher Test ausgegeben. Für diesen reinen Abnahmenachtrag keine Tests wiederholt und kein weiterer Produktcode geändert.

### Prüfungen und Grenzen

- Finaler Linux-Lauf: **222/222**, null Fehler/übersprungene Tests. Nach dem separaten Navigationsnachtrag zusätzlich **5/5** Hostprüfungen.
- 36 Quelldateien im Servermanifest. 35 stimmen nach LF-Normalisierung mit dem Branch überein; ausschließlich die dokumentierte vorhandene Linux-Prüfdatei `ui-event-regressions.test.mjs` bleibt serverspezifisch erhalten.
- Tatsächliche Desktop-/Mobilebedienung: sofortige Schriftübernahme, kategorienübergreifende Suche, Farbakzente, Regler, keine Zoomänderung durch Mausrad oder Zwei-Finger-Geste. Fotoeckgriffe nach Auswahl und Neuladen verborgen.
- Zwei lokale Fotos einschließlich bewusst beschnittenem Foto behalten Position, Größe, Ausschnitt und Datei beim Neuladen. Zusätzlich ein vollständiges 400×800-Testfoto auf der veröffentlichten Seite hochgeladen und wiederhergestellt. Anschließend dort entfernt und neu geladen: keine Fotofelder, vier Originalelemente, Basispreis wieder 19,99 EUR.
- Live-Größenwechsel zeigt 19,99 → 24,99 EUR und 220×140 → 300×200 mm, danach zurück. Die vorherige 602-Kombinationen-Prüfung bleibt ein Nachweis der ersten Korrekturrunde; sie wurde hier nicht als neuer Lauf ausgegeben.
- Abschließende tatsächliche Bildschirmbilder: `konfi-farbakzente-handy-20261105.png` (390×740) und `konfi-farbakzente-desktop-20261105.png` (1440×900), im Ausgabeordner des Chats.

Während der ersten Aktivierung hatten die fünf statischen Prüfdateien durch die restriktive Dateierstellung falsche Leserechte. Das wurde ausschließlich für diese Dateien korrigiert und im Aktivierungsskript behoben; anschließend HTTP 200 und reale Browserprüfung. Die Startdatei und Quelldateien wurden vor jedem Nachtrag auf unveränderte Hashes geprüft. Sicherungen liegen in der aktiven Stage unter `before-round5`, `before-preview-search-registration`, `before-photo-removal` und `before-search-nav`. Bestehende Datenbanken wurden nicht ersetzt oder zurückgesetzt.

**Weiterhin Prüfvorschau ohne echten Warenkorb-Erfolgsnachweis.** Kein neuer Produktlaunch, keine Aktivierung des V3-Shopify-Preiskandidaten. Die 43 Originalvorlagen benötigen weiter Mikails Sichtfreigabe. Nächste fachliche Schritte bleiben Designfreigabe, konkrete Produkt-/Preisbindung und echter Warenkorbtest. Das normale Öffnen der Shopify-App ist von Mikail bestätigt; die Suchauswertung mit tatsächlichen Einträgen wurde inzwischen direkt in Shopify geprüft.

- [Prüfvorschau mit beiden Größen](https://app-2027.gravuru-designwerkstatt.de/produktvorschau/21afd5dc8edad301caace78b04c7973c6a2e6f7b3133dd24/22x14.html)
- [Suchauswertung in Shopify](https://admin.shopify.com/store/gravuru-design/apps/gravuru-konfigurator/werkstatt/motivsuche/)
- [Abstimmung Issue 168](https://github.com/Chris83638w/gravuru-2027/issues/168)
