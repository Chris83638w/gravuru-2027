# Demo R14 – PC-Textbereich und veralteter Texthinweis

Auftrag nach „Kannst loslegen“: PC-Textbereich kompakter, damit „+ Text hinzufügen“ sichtbar bleibt; in der PC-Werkzeugeübersicht „In den Warenkorb“ statt des wirkungslosen „Fertig“; Hinweis „Text konnte noch nicht automatisch eingepasst werden. Bitte Position prüfen.“ untersuchen und ursächlich korrigieren. Einzelne Bearbeitungsbereiche behalten „Fertig“. Nur getrennte Demo. Keine Änderung am Shop, Kunden-Konfi, Main oder Astras Stand.

Vorherige vollständige Quellsicherung: `checkpoints/mobile-demo-r14-pc-hinweis-20261107/before-r14-77720aaa.zip`, 298.973.453 Bytes, SHA256 `22f6b8db0d63cf4d5258be5c9e86091654e272ebf3004a80b8cd09a81285cb18`. Ausgangscommit `77720aaa`.

Der Zoom-Vorschlag „Ganze Tafel anzeigen“ war nicht freigegeben; Nutzer präzisierte stattdessen den Texthinweis. Ebenso bleibt der Vorschlag eines höheren Ausführungsmenüs aus Screenshot 199 offen. Beide nicht umgesetzt.

## Korrekturen

- Ausschließlich ab 1000 px: kleinere Abstände und 60 px Mindesthöhe des weiterhin mehrzeiligen, vergrößerbaren Textfelds. Schriftwahl, Größenregler und weitere Optionen bleiben erhalten. Keine Verkleinerung der Tafel.
- PC-Werkzeugeübersicht: grüner „In den Warenkorb“-Button leitet an genau dieselbe native Aktion weiter. Deren Verfügbarkeit und Pflichtfeld-/Gestaltungsprüfung bleiben maßgeblich. Deaktivierte/verborgene Aktionen werden nicht umgangen. Nach einem Validierungsfehler bleibt das betroffene Textfeld geöffnet. In mobilen Menüs und einzelnen Bearbeitungsbereichen weiterhin „Fertig“.
- Die Einpassprüfung merkt Texte mit einem vorübergehenden Messfehler. Sobald alle betroffenen Texte erfolgreich erneut geprüft wurden, entfernt sie nur ihren eigenen alten Hinweis. Fremde Meldungen und echte Größenfehler bleiben bestehen. Keine zusätzliche automatische Geometrieänderung, kein neuer Pollingprozess.

## Vorläufige Browserbelege

R13 bei 1366×768: Text-hinzufügen-Button endet bei y=707,69, sichtbarer Werkzeugbereich endet schon bei y=692. R14: derselbe Button endet bei y=639,69 und liegt vollständig im Werkzeugbereich. Native Aktion erzeugt „Text 4“, Undo entfernt ihn wieder. Neuer Warenkorbzugang führt bei unverändertem Beispielsname zur echten Pflichtfeldmeldung und öffnet den Textbereich.

R13 zeigt den alten Hinweis auch nach Auswahl „Lebensdaten“, obwohl alle drei Schriftinstanzen bereit und gültig messbar sind. Im R14-Browser wurde die Allura-Schrift ausschließlich im Prüftab vorübergehend entfernt: Hinweis erschien; nach Wiederherstellung und erneuter nativer Prüfung war er leer. Sämtliche Objekte blieben dabei identisch. Prüfeingriffe werden mit Neuladen verworfen.

Unabhängiger Review von Demo-Integration und Desktop-CSS ohne wesentlichen Befund. Tests und Veröffentlichung werden unten mit endgültigen Belegen ergänzt. Ziel ist ausschließlich der neue Pfad `/konfi-demo/mobil-20261107-r14/`; ältere Versionen bleiben erhalten. Die statische Demo hat weiterhin keinen echten Shop-Warenkorb.

249 gezielte Tests bestanden, einschließlich zehn neuer Fälle für den Statuslebenszyklus und der tatsächlichen Demo-Integration. Zwei veraltete Messcache-Tests verwenden jetzt die gemeinsame Messhilfe. Browserprüfung des endgültigen Pakets: bei 1024×768 und 1366×768 ist „Text hinzufügen“ vollständig sichtbar; bei 390×844 bleibt das Textfeld 91 px hoch und „Schrift ändern“ sichtbar, Abschluss weiterhin „Fertig“. 30×20 startet unverändert mit 24,99 €. Prüfung mit Chrome und simulierten Viewports, keine physische Handyabnahme.

Quellcommit `b329903d516673dd739997b12190bd5570b0a996`; Paket 83.391.654 Bytes, ZIP-SHA256 `e95f70bec6c8ddade99e8cc0dc0d25090d79da6cc6b336e763f5a4836acb2999`, Manifest-SHA256 `af30a0b79aec95708eaf9008caa5748e078c9ecc9dc3a2721db2d35f10c45251`. Beide Modelle enthalten unverändert 43 Designs; Design- und Materialhashes entsprechen exakt den Ausgangsmodellen. Server-Vorprüfung: 20.215 vorhandene Public-Dateien, alle geschützten Originale unverändert; neuer eigener Zielordner und private Hostsicherung vorgesehen.

R14 separat veröffentlicht: [frisch testen](https://app-2027.gravuru-designwerkstatt.de/konfi-demo/mobil-20261107-r14/22x14.html?fresh=1). Hostsicherung unter `private/mobil-20261107-r14-before-publication`. Alle 20.215 bisherigen Public-Dateien und geschützten Originale nach Veröffentlichung unverändert. Kein Neustart, Routerwechsel, Shop- oder Datenbankschreiben. 17 öffentliche HTTP-Stichproben: Status 200, bytegleich zum geprüften Paket, no-store/noindex.

Öffentlicher Browserablauf ohne Zustandsinjektion: Text öffnen → „Text hinzufügen“ → neues Textfeld → Rückgängig entfernt es; Fertig → Werkzeuge → „In den Warenkorb“ → echte Pflichtfeldmeldung beim Beispielsname öffnet Textbereich und bleibt sichtbar. Bei 1366×768 ist der neue Textbutton vollständig sichtbar. Bei 390×844 ist die unveränderte Textansicht samt Schriftwahl sichtbar, kein veralteter Einpasshinweis. Abschließend Prüftabs geschlossen und öffentliche Demo frisch geladen, ohne gespeicherten Prüfeingriff.

Nachweise: [249 Tests](../reviews/2026-11-07-mobile-demo/r14-tests.txt), [Build](../reviews/2026-11-07-mobile-demo/build-r14.json), [Vorprüfung](../reviews/2026-11-07-mobile-demo/host-preflight-r14.json), [Veröffentlichung](../reviews/2026-11-07-mobile-demo/host-publication-r14.json), [HTTP](../reviews/2026-11-07-mobile-demo/http-public-r14.json), [lokaler Browser](../reviews/2026-11-07-mobile-demo/r14-local-browser.json), [öffentlicher Browser](../reviews/2026-11-07-mobile-demo/r14-public-browser.json), [PC-Textansicht](../reviews/2026-11-07-mobile-demo/r14-public-desktop.png), [PC-Warenkorb](../reviews/2026-11-07-mobile-demo/r14-public-cart.png), [mobile Ansicht](../reviews/2026-11-07-mobile-demo/r14-public-mobile.png). Eigener Branch und Draft-PR #193, kein Main-Merge.
