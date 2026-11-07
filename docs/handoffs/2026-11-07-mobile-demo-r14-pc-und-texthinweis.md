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
