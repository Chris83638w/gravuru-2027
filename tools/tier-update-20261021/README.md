# Vollständiger Händlerquellstand mit Komplettpreisstaffel · 21.10.2026

`merchant/` enthält alle **436** Dateien des verifizierten aktiven Releases `d18bc6cb8fdbe9e69008d9be18b2b74ce72365eb`; vier Preisdateien sind gezielt geändert. Der ursprüngliche Commit ließ sich nicht direkt über GitHub abrufen. Darum wird der vollständige Dateibaum samt ursprünglichen und neuen Prüfsummen gesichert; keine bloßen Änderungspakete. Die unveränderte Originalmanifestdatei und der historische Stagebeleg stehen unter `evidence/` und behaupten keine Aktivierung dieses neuen Pakets.

Neue ausdrückliche Regel: `quantityTierScope: complete-unit`, 6 % ab zwei und 10 % ab drei identischen Exemplaren auf Grundpreis, Befestigung, Motive und Fotos zusammen. Einmal pro Stück auf ganze Cent runden, anschließend Menge multiplizieren. Beispiel 22,99 € + 9,99 € Foto: zwei Exemplare 62,00 €, drei Exemplare 89,04 €. Ohne explizite Staffel bleibt die bisherige Berechnung erhalten. Unspezifizierte historische Staffeln bleiben lesbar, werden aber nicht neu kaufbar gebunden.

Die vier Änderungen sind `contract.mjs`, `commerce-model.mjs`, der Preisabschnitt in `ux.mjs` und `workshop/cart-personalization.mjs`. Kein neuer Kundeneditor oder Funktionsabbau. Die vollständigen Dateipfade, Herkunft und SHA-256 stehen in [SOURCE-PROVENANCE.json](SOURCE-PROVENANCE.json).

## Lokale Prüfung

Node 24 mit `node:sqlite` verwenden und in diesem Ordner ausführen:

```sh
node --test tests/*.test.mjs
```

50 Tests bestanden: 29 Preis-/UX-Prüfungen und 21 Backend-/SQLite-Bestelleingangsprüfungen. Die unveränderte Releaseberechnung wurde zusätzlich in 45 Fällen mit der echten privaten Produktkonfiguration verglichen; der öffentliche Nachweis enthält keine Kundengestaltung oder Bildbytes. Die hier abgelegten Tests verwenden synthetische Daten und importieren ausschließlich diesen gesicherten Baum.

## Grenzen und nächste Schritte

Kein Deployment, keine private Datenbank und keine Zugangsdaten in diesem Ordner. Die Anwendung benötigt für einen echten Start die dokumentierten Laufzeitvoraussetzungen und separat gesicherte private Konfiguration/Daten. Der GitHub-Snapshot allein ist keine gestartete Kundenanwendung und kein Shopify-Testkauf.

Die noch bearbeiteten Ops-Helfer und das separate Shopify-Function-Projekt werden mit eigenen Folgecommits gesichert. Anschließend neuen unveränderlichen Produktstand, passenden Shopify-Preisvertrag und Warenkorb/Testbestellungen für Mengen 2 und 3 abgleichen. Die vorhandene September-Oberfläche und ihre vollständige Anbindung bleiben ein gesonderter Nachweis.
