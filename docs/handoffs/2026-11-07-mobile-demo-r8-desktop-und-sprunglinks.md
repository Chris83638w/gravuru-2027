# Demo R8 – Desktop-Werkzeuge und Sprunglinks

Stand: 07.11.2026. Eigener Branch `dev/mika-mobile-demo-20261107`, Draft-PR #193. R7 bleibt als bisheriger Prüfstand erhalten. Ausschließlich die ausdrücklich gesammelten Desktop-Punkte und die Sprunglinks aus Screenshot 178 gehören zu diesem Schritt.

## Sicherung und Grenzen

Vor Änderungen wurde der Quellstand `d49806ef8d62db735be8caa719b1792699246024` als `checkpoints/desktop-demo-r8-20261107/before-r8-d49806ef.zip` gesichert. SHA256: `0f86ba774d209be54febc2f8574b1993e9824facd000398e092338dfd87fca1a`.

Kein Main-Merge, keine Änderung an Shopify, Galerie, Astras Arbeitsstand oder dem bisherigen Kunden-Konfi. Designs, Grundplatten, Schriftkonturen, Preise und native Bearbeitungsrechte bleiben erhalten. Die Demo hat weiterhin keine echte Bestellung, Kundenkonto-Speicherung oder Galerie-Rückspeicherung.

## Umsetzung

- Desktop ab 1000 px: dieselben fünf Werkzeugbuttons stehen deutlich über dem Produkt. Ansicht, Fotogröße und Zurücksetzen stehen unten; Preis und grüner Warenkorb rechts unten. Mobil bleibt die Fußnavigation erhalten.
- Der zusätzliche Foto-Shortcut oben rechts entfällt. Auf beiden Ansichten öffnet Foto zuerst das Panel; erst der ausdrückliche Upload-Button öffnet die Dateiauswahl.
- Ein abgeschlossener Desktop-Klick auf ein natives Canvas-Element öffnet dessen Werkzeugbereich und behält die native Auswahl. Text führt zum konkreten Textfeld; Foto/Logo zu Fotos & Logos; Motiv zur Motivauswahl. Ziehen, Größenänderung, Mehrfachauswahl, Vollbild und gesperrte Elemente werden nicht übernommen oder umgedeutet.
- Material, Größe und Befestigung erhalten Sprunglinks im bestehenden Optionspanel. Die separaten Informationssymbole bleiben mit ihren nativen Aktionen erhalten. Nur das Panel scrollt. Wo Material feststeht, stammt die kleine Materialzeile wortgleich aus der bereits vorhandenen Materialinformation; es wird keine Materialauswahl erfunden.
- Der Demo-Adapter zieht den nativen Warenkorb bei Fenstergrößenwechsel nicht aus einem offenen Vollbilddialog zurück. Schließen und Abbau der Demo stellen die ursprünglichen Knoten wieder her. Der separat unten dokumentierte native Mobil-/Vollbildkonflikt bleibt offen.

## Prüfstand

Lokale Prüfung: 93/93 gezielte Tests bestanden (20 Demo-Shell, 12 Desktopauswahl, 12 Sprunglinks sowie bestehende Text-/Gesten-/Paket-/Publikationstests). Browser in Chrome: Name/Lebensdaten öffnen die richtigen Textfelder, Motiv öffnet Motive, hochgeladenes Foto öffnet Fotos & Logos. Designobjekte und Tafelrechteck vor/nach Panelwechsel exakt gleich. Expliziter Foto-Button öffnet Dateiauswahl; vorhandenes Foto wählt nur aus. Zurücksetzen fragt nach Bestätigung und stellt Bruno mit 19,99 € wieder her. Desktop 1440×900 und 1024×768 sowie Rückwechsel auf 390×844 geprüft. Keine Konsolenfehler in diesem Ablauf.

Sprunglinks im echten Browser bei 390×844: Material, Größe und Befestigung jeweils unter dem Panelkopf sichtbar. Befestigung scrollt das Panel von 0 auf 255,5 px; äußerer Scrollstand, Canvas-Rechteck und Designobjekte bleiben identisch. Material-i öffnet weiterhin den bestehenden Informationsdialog. Größenwechsel 22×14 → 30×20 regeneriert die nativen Gruppen, Sprunglinks bleiben vorhanden. Unabhängiges Read-only-Review von Shell/CSS/Builder ohne konkreten Blocker. Öffentlicher R8-Stand ebenfalls in Chrome geprüft: mobile Befestigungsnavigation mit Panel-scrollTop 255,5 px; Desktop-Textklick öffnet rechts Name/Bruno, Schriftart und Größenregler; keine Konsolenfehler. Die acht HTTP-Stichproben stimmen mit dem Paket überein. Physische Android-/Edge-Tastatur und der native Kopieren-Dialog können durch Desktop-Emulation nicht abschließend abgenommen werden.

## Weiteres Vorgehen

Nutzer prüft R8 mobil und am Desktop. Weitere Optimierungsvorschläge werden zuerst besprochen. Danach Backend/Designgruppen: explizite Gruppe und Startdesign je Angebot; Hauptproduktbild und Konfi müssen dieselbe freigegebene Designrevision verwenden. Diese Regeln sowie Synchronisierung und bestätigte Produktgruppen-Optionen bleiben in der Gesamtübergabe dokumentiert; keine Backend-Änderung in R8.

## Veröffentlichung und Rückweg

Quellcommit `41792b7e`, gesichert auf GitHub in Draft #193. R8 wurde ausschließlich als neues Verzeichnis veröffentlicht:

- [22×14 cm – neuer Start](https://app-2027.gravuru-designwerkstatt.de/konfi-demo/mobil-20261107-r8/22x14.html?fresh=1)
- [30×20 cm – neuer Start](https://app-2027.gravuru-designwerkstatt.de/konfi-demo/mobil-20261107-r8/30x20.html?fresh=1)
- [R7 bleibt als Rückweg bestehen](https://app-2027.gravuru-designwerkstatt.de/konfi-demo/mobil-20261107-r7/22x14.html?fresh=1)

Manifest-SHA256 `79e843b585036cabf5f2b125571f896a21d1de0ec39dcf7932d7423cdec56341`; ZIP-SHA256 `77d3fc77cef422c0dcfdaf474db792929a5ff19f1efb64fc237a0b6b1ba71a00`. 2013 Paketdateien einschließlich Manifest, zusätzlich eigene `.htaccess`. Designs und Materialdaten beider Größen sind zu ihren Eingangsmodellen hashgleich.

Private Hostsicherung: `/var/www/vhosts/gravuru-designwerkstatt.de/private/mobil-20261107-r8-before-publication`. Der geprüfte Veröffentlichungsablauf bestätigt `verified:true`, `originalFilesUnchanged:true`, `oldPublicInventoryUnchanged:true`. Alle 8.085 vorherigen öffentlichen Dateien bleiben hashgleich; kein Neustart, Routerwechsel, Shop- oder Datenbankschreiben. Diese Sicherung umfasst die geschützten Start-/App-/Prüfdateien und das vollständige Public-Inventar; sie ist keine neue Datenbanksicherung.

Acht öffentliche HTTP-Stichproben (Manifest, beide HTMLs, Demo-JS/CSS und drei Helfer) liefern 200, korrekte MIME-Typen, Brotli, Paket-Hashes, `no-store` und `noindex`. [Nachweise und Screenshots](../reviews/2026-11-07-mobile-demo/).

## Zusätzlicher Befund – nur Vorschlag, noch nicht verändert

Im bestehenden nativen mobilen Vollbild verschwindet die Warenkorbleiste. `variant-m/mobile.css:37` blendet alle `.fk-buy-dock` aus; die Gegenregel in `modern-navigation.css:17` gilt nur innerhalb `.ux-shell`. Dazu verschiebt `modern-mobile-navigation.mjs:40–41` den Dock beim Medienwechsel ohne Rücksicht auf einen offenen Vollbilddialog. Rückkehr zur normalen Demo zeigt den Warenkorb wieder. Dieser Befund wurde im Browser festgestellt und unabhängig am Code erklärt; die Demo-Unit-Tests simulieren diesen nativen Medienwechsel nicht vollständig.

Keine zusätzliche Änderung an diesen nativen Dateien vorgenommen. Empfehlung zur Besprechung: Warenkorb auch im mobilen Vollbild sichtbar halten und native Dock-Verschiebung bei offenem Vollbild unterbinden. Vollständige physische Handy-/Tastaturprüfung bleibt Nutzertest; kein echter Checkout in dieser isolierten Demo.