# Gravuru 2027 lokal starten

Voraussetzung: Node.js 24 oder neuer. Keine Paketinstallation nötig. Befehle im Projektordner ausführen, der `package.json` und `app/` enthält.

```powershell
node app/configurator/variant-m/server.mjs --port=8961
```

Danach http://127.0.0.1:8961/?model=acryl öffnen. Das Terminal muss laufen bleiben. Bei belegtem Port vorhandenen Server verwenden oder einen anderen freien Port angeben. Der alte Vergleich auf Port 8951 wird nicht ersetzt.

Der Server baut die Vorschau beim Start. `app/configurator/variant-m/.preview/` ist ein ignoriertes Build-Ergebnis. Referenzarchive müssen für diesen Pilot nicht ausgepackt werden; alle benötigten Ressourcen liegen unter `app/`.

## Prüfungen

```powershell
node --test app/configurator/variant-m/*.test.mjs
node app/configurator/variant-m/build.mjs
```

Letzter Prüfstand: 57 Tests erfolgreich, Build mit 76 Ressourcen und einem Acrylmodell. Details: `G27-01-PRUEFUNG.md`.

## Grenzen

Dieser Server bindet ausschließlich lokal und besitzt keine schreibende Admin-, Shopify- oder Produktionsschnittstelle. Gestaltungen sind keine gespeicherten Bestellungen. Sichtbare Abschluss-/Entwurfsfunktionen des übernommenen Editors belegen keine neue Bestellstrecke. Nicht unverändert öffentlich hosten. Die vollständige Anwendung entsteht in den weiteren Paketen.
