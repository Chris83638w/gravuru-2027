# Konfigurator: Nachtrag 3 – Design-Galerie live zu langsam · 28.10.2026

PR #41 ist seit 28.10. ~19:55 live (`main` `0643c70`, Baum = `602a3ac`). Desktop, iPhone 13 und iPhone SE habe ich live ohne Umleitung geprüft; alles läuft wie im Testbrowser. **Ein Fehler zeigt sich nur mit Echtdaten:**

## G1 · „Designs ansehen“ endet nach 30 s mit 502

- Ablauf: D8 → Reiter „Designs“ → „Designs ansehen“. Die Anfrage `GET /api/shop-entry/design-gallery?page=0` antwortet nach **30,1 s** mit 502 `upstream request failed`, dem Zeitlimit des Plesk-Proxys. Der Kunde sieht „Der Konfigurator konnte nicht geladen werden.“ Bild: [`konfi-ux-20261028-nachtrag/Live-Galerie-502.png`](konfi-ux-20261028-nachtrag/Live-Galerie-502.png). Dreimal reproduziert.
- Der Server bleibt ansprechbar: `/api/workshop/session` antwortet während der Anfrage in 0,4–0,9 s. Dein `setImmediate` alle 8 Kandidaten wirkt.
- Vermutete Ursache, bitte verifizieren:
  - `build()` ruft `modelFor` je Produktstand über **alle** aktiven Bindungen des Stores auf, darunter die ~120 Funkklingel-Varianten mit Materialbildern. Mit Echtdaten dauert das länger als 30 s.
  - Das Ergebnis lebt nur **10 s** (`expiresAt: now+10000`). Ein Lauf, der nach dem Proxy-Abbruch fertig wird, ist praktisch sofort wieder verfallen. Jeder Klick startet den Kaltaufbau neu, und jeder kostet eine halbe Minute CPU.

**Bitte:**
1. Karten so lange behalten, bis sich `galleryRevision()` ändert, nicht nur 10 s. Kein TTL-Verfall bei unveränderter Revision.
2. Aufwärmen nach dem App-Start im Hintergrund, nicht beim ersten Kundenklick.
3. Der Kaltaufbau darf kein vollständiges `modelFor` mit Materialbild je Produktstand brauchen. Für die Karte reichen Name, Design, Geometrie und Preis. Das volle Modell erst bei Vorschau oder Wechsel.
4. Antwort spätestens nach ~5 s. Ist der Aufbau noch nicht fertig, kommt eine klare Meldung „Designs werden vorbereitet – bitte gleich noch einmal“ oder die bereits fertigen Karten, nie der allgemeine Ladefehler.
5. Ein Messwert gegen eine **Kopie der echten Daten** (lesend, ohne Kundendaten), nicht nur synthetisch: kalt, warm und nach Neustart.
6. Optional als Zwischenlösung: Der Knopf „Designs ansehen“ wird erst gezeigt, wenn die Galerie vorbereitet ist.

Bis zur Korrektur ist der Rest des Konfigurators unberührt. Nichts live ohne Chris' Satz.
