# Edelstahl: gültiges Design nach Formwechsel laden

## Auftrag und Befund

Mikails freigegebener Aufbau, Produktoptionen, Preise und Designquellen bleiben unverändert. Nach dem separat freigegebenen Galerie-Lookup-Fix (#204) konnte Root die 21 passenden Designs auch nach Wechsel AB 12×8 → Rechteck 15×10/KGL laden. D3 wurde jedoch nach zwei erfolgreichen Antworten (`design-switch` und `model`, jeweils HTTP200) vom bestehenden Client abgelehnt: „Dieses Design gehört nicht zum gewählten Produkt.“

`shopStartModel` stellte die gewählte Familiengröße und Standarddesign-ID um, filterte `profile.designs` aber weiterhin aus dem ursprünglichen AB-Startprofil. Das gültige Rechteckdesign lag nur in der vollständigen Familienbank; die ausgelieferte Root-Liste konnte leer sein. Der Client-Guard arbeitete korrekt.

## Eng begrenzte Korrektur

Nur `app/workshop/shop-start-model.mjs` ändern. Das zuvor gegen die gewählte Familienvariante geprüfte Design wird mit dem vorhandenen `projectFamilyDesign` für diese Größe projiziert und in beide ausgelieferten Modellkopien aufgenommen. Die vollständige Familienbank, erlaubte Größen, Vorlagenrechte und benötigte Ressourcen werden wie bisher begrenzt weitergereicht. Native Quelldokumente bleiben unverändert. Kein Client-Guard, Layout, Timeout, Preis oder Bindungsrecht wird geändert.

Original-SHA256: `aac9c33e0e38dd4c466e6a04d9953f3939e720e8020c58febf3e2f25b8de2e4c`.

## Nachweise

- 56/56 gezielte Tests: bestehender Einstieg einschließlich Logo-Konvertierung, Projektion, Clientwechsel und neue HTTP-Integration. Vorhandene lokale Python-Umgebung für den SVG-Konverter erforderlich.
- Vollständiger HTTP-Ablauf: signierter Start → ursprüngliches Modell → Galerie anderer Form/Größe/Befestigung → signierter Designwechsel → Zielmodell → unveränderter Client-Guard. Ziel D3, Rechteck 15×10, KGL. Geometrie und Preis bleiben korrekt; native Quelle bleibt byteinhaltlich unverändert.
- Fremdes Formdesign bleibt abgelehnt (404), entzogene Katalogfreigabe ebenfalls (404), Pausierung bleibt wirksam (423).
- Derselbe Ablauf mit echtem freigegebenem 251er-Kandidaten, SHA256 `2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0`: ursprüngliche Projektionsdatei reproduziert exakt die Kundenfehlermeldung; korrigierte Einzeldatei besteht. 125 ausführbare Module sind gegen die tatsächliche Serverbasis geprüft, einschließlich des bereits veröffentlichten #204-Galeriefixes. Zwei statische Importressourcen ebenfalls SHA-geprüft. Lediglich das lokale HTML-Testgerüst ist nicht separat gegen den Server gehasht; es wird nicht veröffentlicht und ist nicht Teil der geprüften JSON-/Clientmodellkette.
- Kein echter Shopify-/Server-Schreibzugriff durch diesen Unteragenten. Synthetische Sitzungen/IDs, tatsächliche unveränderte Designbank. Lokales Timing ist kein Live-Nachweis.

## Veröffentlichung und Rückweg

Root prüft vor Ersetzen den Original-SHA und sichert genau diese Serverdatei separat. Nur die Projektionsdatei aus dem Paket einsetzen, Nachher-SHA gegen `PATCH_MANIFEST.json` prüfen und die vorhandene Anwendung kontrolliert neu starten (ESM-Cache). Kein Datenbank-, Shopify-, Theme- oder Browsercache-Eingriff erforderlich. Frischer Konfi-Start für den Kunden-Smoke; RE15×10/KGL/D3 wählen und Warenkorb prüfen. Rückweg: gesicherte Originaldatei wieder einsetzen und Anwendung neu starten. #204 bleibt davon unberührt.

Branch `dev/mika-steel-design-switch-projection-fix-20261108` ist auf #204 gestapelt. Lokale Belege und kleines Uploadpaket liegen unter `outputs/steel-design-switch-projection-fix-20261108/`; Root übernimmt die Live-Abnahme.
