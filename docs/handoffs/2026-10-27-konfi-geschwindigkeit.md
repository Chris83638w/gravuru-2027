# Konfi-Geschwindigkeit · Befund und Plan · 27.10.2026 (Claude, Operator)

Anlass: Chris – D8 Türschild über 40 s bis in den Warenkorb, Warenkorbbild nur flache Gravur; „Variante C“ deutlich schneller.

## Messungen live (Desktop-Chrome)

| Strecke | Schritt | vorher | nach Limit-Anhebung 19:37 |
| --- | --- | --- | --- |
| D8 nativ (`4100000`) | `POST /api/shop-entry/acrylic-drafts` | **31,5 s** | **1,2 s** |
| | Klick → `/cart` erreicht | 36,7 s | 6,2 s |
| | Klick → Warenkorb geladen | 38,6 s | 8,7 s |
| | Editor öffnen: `/api/shop-entry/model` | 1,3 s, 11,2 MB (gzip 3,9 MB) | 2,0 s |
| Variante C (Theme-Konfi) | Klick → Warenkorb | ca. 5 s (Dateien im Browser, direkt `cart/add.js`) | – |
| Gedenktafel (alt, ohne Foto) | Klick → Warenkorb | ca. 5 s; Upload `Entwurf` 2,0 MB + PDF 0,5 MB | – |

## Hauptursache: CloudLinux-Grenzen des Hosting-Benutzers

Plesk → CloudLinux Manager → Benutzer: `gravuru_werkstatt` (gravuru-designwerkstatt.de, App `app-2027`) lief mit Paket „Admin Simple“:
SPEED 100 % (1 Kern), PMEM 1 GB, **IO 1 MB/s**, IOPS 1024, EP 20, NPROC 100 (gravuru.de: 1600 %, unbegrenzt).
Statistik „Heute“ bis 19:35: **IO 324 Treffer, SPEED 135, PMEM 4** (Speichergrenze → vermutlich die 503-Aussetzer).
Erklärt auch ~20 min je Plesk-Deploy (1,08 GB bei 1 MB/s).

**Chris hat am 27.10. ~19:37 selbst gespeichert:** SPEED 400 %, PMEM 4G, IO 50 MB/s, IOPS 4096, EP 50, NPROC 200.

## Code-Ursachen (bleiben relevant)

- Jedes Prüfpaket enthielt die komplette Konfiguration (17 Schriften 9,3 MB + Materialbild 1,9 MB als data:-URL) → ~12 MB BLOB in SQLite je Warenkorb-Klick. Fix `dev/schnelles-sichern-20261027-claude` (3fd71c5, 94b88d8): nur Ressourcen des Designs, Bild per Hash.
- 6 importierte Profilschriften (z. B. „Lato Regular · c3d3cabdb582“) im Editor angeboten, beim Sichern 422 „Bitte eine vorhandene Schriftart auswählen.“ – im selben Branch behoben (nur Prüfpfad, Freigabe unverändert).
- Editor lädt beim Öffnen ~11 MB Modell + 4,5 MB `motive-alle.json` + Schriften.
- Warenkorbbild = flache Gravur (Variante C und Gedenktafel zeigen Material).
- Kundentext „Lokaler Prüfstand · Bestellung noch nicht verbunden“ (`variant-m/ux.mjs`, `.fk-order-status`).
- Vorlage `product.test-temp-svenja-grid`: 9 Fancy-Product-Designer-Blöcke, FPD-App-Einbettung seit 28.09. deaktiviert → toter zweiter Knopf + „Designer lädt“.
- `gravuru-legacy-cart.js` doppelt geladen (main-cart + cart-drawer).
- Editor-Bundle des Shop-Einstiegs kommt aus der Release `gravuru-combined-id-20261022-v1/legacy` (nicht aus `main`) – Editor-Änderungen brauchen einen neuen Release-Build.

## Plan

1. Schnell-Korrektur aufspielen (Chris' Satz nötig), nachmessen.
2. Stufe 2 (Claude): Editor als Fenster auf der Produktseite (wie Gedenktafel), Warenkorb direkt im Elternfenster per `cart/add.js` (keine App-Proxy-Zwischenseite), schlankes Modell (Schriften/Motive bei Bedarf, Materialbild als Cache-URL), Warenkorbbild mit Material. Ziel: öffnen 1–2 s, Warenkorb 2–3 s.
3. Astra parallel: Gedenktafel-Vorschau verkleinern (2 MB PNG), Kundenfoto vor Upload auf Fertigungsauflösung, Fortschritt in %, `legacy-cart.js` nur einmal laden.
4. Danach: eigener Cloud-Server für app-2027 (getrennt von gravuru.de/WooCommerce), Deploy aus GitHub, Testumgebung. Domain bleibt, nur DNS.

## Stufe 2 · Stand (Branch `dev/konfi-schnell-stufe2-20261027-claude`)

- `5d54c24` Modell-Cache: fertig aufgebautes Modell je fester Produktrevision (max. 8, LRU), jeder Aufrufer bekommt eine eigene Kopie; Formprodukte und Werkstatt-Ansicht (ohne Revision) weiter frisch.
- `eb4f03b` Fenster-Modus: `/apps/konfigurator/shop-embed.mjs` (über den signierten App-Proxy) fängt den Klick auf „Jetzt personalisieren“ ab und öffnet den Konfigurator als Vollbild-Fenster über der Produktseite (`embed=1`). „In den Warenkorb“ meldet nur die 64-hex-Übergabekennung per `postMessage` (Origin + Quelle beidseitig geprüft); die Produktseite holt `data`/`claim` über den App-Proxy und legt per `cart/add.js` direkt in den Warenkorb → keine Zwischenseite mehr. Ohne `embed=1` und ohne Skript bleibt alles wie bisher (normaler Link).
- `frame-ancestors` der Einstiegsseite nur `https://gravuru-design.myshopify.com`; der Live-Editor erlaubt den Shop bereits (`frame-ancestors 'self' https://gravuru-design.myshopify.com https://admin.shopify.com`). Live-Editor-Bundle nutzt `gate.submitCart` → Fenster-Modus greift ohne neuen Editor-Build.
- Unabhängiger Review: kein Blocker. R1 (Skriptabrufe zählten aufs Warenkorb-Limit) behoben: Skripte vor dem Limit, `Cache-Control: public, max-age=300`, Test. R2 (Shop-Domain) geprüft: Primärdomain ist `gravuru-design.myshopify.com`; bei späterer eigener Domain muss `shopDomain`/`frame-ancestors` erweitert werden. R4 Safari/iOS (sessionStorage im Fremd-iframe) nur am Gerät prüfbar.
- Aktivierung im Shop = eine Zeile im Live-Block `custom_liquid_mTPWzc` (vor dem letzten `endif`): `<script type="module" src="/apps/konfigurator/shop-embed.mjs"></script>`. Test vorher ohne Theme-Änderung: Skript in der eigenen Browser-Sitzung per Konsole laden.
- Offen danach: schlankes Modell (Schriften bei Bedarf, Materialbild als URL), Warenkorbbild mit Material, Text „Lokaler Prüfstand …“ (braucht Editor-Release-Build).
