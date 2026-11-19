# Gegenprobe zu PR #268 (Claude, 19.11.2026)

Geprüft: `dev/astra-r15-beta-267-20261119` am Commit `aeddd22f` (Basis `f84433f8`). Nur lokal, keine Shop-Verbindung, nichts am PR geändert.

**Aufbau.** `app/workshop/theme-cart-flow.test.mjs` aus dem PR unverändert kopieren, den Inhalt von `einschub.mjs.txt` direkt vor der letzten Zeile des großen Tests einfügen (vor `now+=31*60*1000;…`) und mit `node --test` ausführen. Voraussetzungen wie beim Original: Node 24, Python mit `pymupdf` (`GRAVURU_PYTHON`).

**Was der Einschub prüft.**

1. Preis, Menge, Konfiguration und Revision an der gespeicherten Bestellzeile.
2. Revision 4 desselben Entwurfs nach der Bestellung: Paket und Bestellzeile der bestellten Revision 3 bleiben unverändert.
3. Zweimalige Erzeugung von Kontur-PDF, Druck-PDF und SVG aus demselben Paket.
4. Zehn manipulierte oder wiederholte Zustellungen von `orders/paid`.

**Ergebnis** steht in `ergebnis.json`. Kurz: 1, 2 und 4 bestehen. Bei 3 sind Druck-PDF und SVG bytegleich, das Kontur-PDF unterscheidet sich nur in der Dokumentkennung `/ID`; Seiteninhalt, Seitengröße und Metadaten sind gleich.
