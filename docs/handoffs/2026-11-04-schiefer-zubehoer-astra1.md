# Schiefer-Zubehör vorbereiten · Astra 1, zweiter Chat · 04.11.2026

Basis `main` **3eb2ea43c5383571094b8da1017ade9f4884eb72**, eigener Branch `dev/astra1-schiefer-zubehoer-20261104`.
Nur Vorbereitung. Keine Schieferfamilie, kein Produkt und keine Variante angelegt; kein Merge, Import, Shopify-Schreibzugriff oder Live-Schritt.

## Auftrag und fachliche Quellen

- Maßgeblich: [Claude in #85, 6618153743](https://github.com/Chris83638w/gravuru-2027/issues/85#issuecomment-6618153743). Die 48 Tafeln, bestätigten Preise und freigegebenen Rohlinge V2 kommen erst mit der vollständigen Katalogübergabe. **Keine Daten aus alten 22×14-/30×20-Familien verwenden.**
- `AGENTS.md` auf main und `ENTSCHEIDUNGEN.md` aus [PR #158](https://github.com/Chris83638w/gravuru-2027/pull/158) gelesen. Master mit Ausführungsmodul (1.13), keine neue Konfigurator-App.
- [Katalog-PR #162](https://github.com/Chris83638w/gravuru-katalog./pull/162), Branch `dev/zubehoer-bilder-20261103-claude`, Commit **86aa4bcec5c62e0c46cfc61ed30a42418841d1ff**: `materialien/zubehoer/schiefer-zubehoer.json`, ausschließlich `konfiBilder` mit Bildnamen, `preisCents`, `preisJeFarbe`. Keine Gruppen-/Seitenbilder in den Abstandshalter-Kacheln.
- Regeln 3.38/3.39, 4.44–4.48: Draufsichten, Abstandshalter 12 mm, fünf Farben (Edelstahl, Schwarz matt, Bronze, Gold, Weiß), Foto-Beispiele Mensch/Hund. 2er/4er Edelstahl 599/899 Cent, farbig zusätzlich 100/200 Cent. Schwarzbild bleibt die als simuliert dokumentierte Originalquelle.
- Für spätere Produktanbindung verbindlich: Schraubenkopf 5 mm, Premium 12 mm, Natur/geschnitten ca. 5 mm, blaue Haarlinien, Gravur/Graustufen. Dieses Medienpaket erzeugt keine Geometrie oder Produktionsprofile. **main hat noch `SIGN_SCREW_HEAD_MM=4.5`; die spätere Schiefer-Abnahme muss 5 mm verifizieren**, abgestimmt mit dem zuständigen #139-Chat. Hier keine globale Änderung an anderen Linien.
- Vorschauen/Kontaktbögen ausschließlich über [Renderer-PR #163](https://github.com/Chris83638w/gravuru-2027/pull/163). In diesem Paket keine Tafeln/Vorlagen gerendert.

## Implementiert

`app/workshop/slate-accessories.mjs` bietet `bindSlateAccessories(config, {catalogue, source, bindings, resolveImage, includePhoto})`:

- Die spätere Kataloganbindung liefert JSON, Quellpfad/Revision, erreichbare Bildadressen und ausdrückliche Zuordnungen `{groupId,valueId,optionId,imageName?}`. Es werden keine IDs aus Namen oder Lochzahlen geraten.
- Vorhandene Produktoptionen und Fotovertrag müssen exakt zu den Katalogpreisen passen. Veraltete Preise werden gemeldet, niemals still geändert. Farben benötigen eine eindeutige Zuordnung.
- Die Funktion liefert eine Kopie mit `slateAccessories`; Preisvertrag, Optionen, Geometrie und Original bleiben unverändert. Sie wird noch von keinem produktiven Import aufgerufen.
- Familienformate sind in diesem ersten Adapter ausdrücklich noch nicht unterstützt: ihre Preise/Optionen wechseln je Größe und müssen nach der vollständigen Katalogübergabe an den gemeinsamen Formatresolver angeschlossen werden. Diese technische Grenze ist keine neue Sortimentsregel.

`slate-accessory-media.mjs` und das bestehende `memorial-execution.mjs` stellen ausdrücklich gebundene Bilder samt Bildnamen und Katalogbezeichnungen dar. Befestigung bleibt im vorhandenen Auswahlvertrag, K00 zuerst. Separate gebundene Zubehörgruppen bleiben separat; es wird keine neue gegenseitige Ausschlussregel eingeführt. Foto Mensch/Hund ergänzt den bestehenden Einstieg „Foto gestalten“.

Das Modul bleibt im separaten Gedenktafel-Bündel. Ungebundene Produkte behalten ihre Darstellung; die bestehenden deaktivierten Gedenktafelprofile werden nicht aktiviert. Kein neuer Produktfamilienname erfunden.

## Prüfungen

22 unterschiedliche Tests erfolgreich, keine Skips:

```powershell
node --test app/workshop/slate-accessories.test.mjs app/configurator/variant-m/execution-registry.test.mjs app/configurator/variant-m/option-fields.test.mjs app/configurator/variant-m/bundle.test.mjs
```

Erstlauf 21/22: ein HTTP-Server-Test scheiterte an `connect EACCES 127.0.0.1`, außerhalb der eingeschränkten Testumgebung gezielt bestanden (`--test-name-pattern='Server: Bündel'`). Die neun direkt betroffenen Adapter-/Darstellungs-/Bündeltests nach der letzten Bezeichnungsänderung erneut erfolgreich. Windows TEMP/TMP auf eigenen Arbeitsordner gesetzt, nachdem der erste Bündellauf beim Umbenennen im System-Testordner scheiterte.

Testfälle umfassen alle fünf Farben in beiden Setgrößen, korrekte Aufpreise, Zurückweisung der alten Schrauben-/Silikon-/Ständer-/Fotopreise, fehlende Quellen/Bindungen/Farben, HTML-Escaping, unveränderte Produktdaten und getrennte Module. Der JSON-Testfixture entspricht dem oben festgehaltenen Katalogcommit; er wird ausschließlich vom Test gelesen, nicht als Produktdatenquelle. 11 Optionen / 23 unterschiedliche `konfiBilder` vorhanden und nicht leer. `git diff --check` und Syntaxprüfung des lokalen Prüfscripts erfolgreich.

## Sichtbare Bedienprüfung: offen

Reproduzierbarer lokaler Komponentenprüfer:

```powershell
node scripts/check-slate-accessories-ui.mjs <Pfad-zum-Katalogcheckout-PR162>
```

Er lauscht ausschließlich auf `127.0.0.1:8976`. Zeigt das echte Darstellungsmodul mit den Original-Katalogbildern in einer **synthetischen Komponentenprüfung**, keine Platte und keinen vollständigen Konfi. Die Test-Auswahl ist kein freigegebenes Sortiment. Knopf für 390 px Prüfbreite und Auswahlstatus vorhanden.

Der Serverstart wurde bestätigt. Der integrierte Browser erreichte localhost nicht (`ERR_CONNECTION_TIMED_OUT`). Die native Chrome-Steuerung brach danach ab, weil sie die aktuelle Browseradresse nicht sicher feststellen konnte. **Keine erfolgreiche Desktop-/Mobil-Bedienprüfung, kein Screenshot- oder vollständiger Warenkorbnachweis behauptet.** Keine weiteren Browseraktionen nach diesem Abbruch.

## Genau nächster Schritt

Nach Claudes vollständigem Auftrag in #85 die neuen Katalogfamilien/48 Tafeln/Rohlinge an den bestehenden Familienformat- und Gedenktafelvertrag anbinden. Erst dann erlaubte Befestigungen/Zubehör, gemeinsame Preisauflösung, Form-/Größenwechsel, graue Kundenfotos, 5-mm-Schraubenköpfe, blaue Exportkonturen und Erhalt der Medien in Startmodell/Speicherung prüfen. Bildadressen über die vorhandene Ressourcenverteilung bereitstellen; dieses Paket veröffentlicht keine Bilder. Renderer aus PR #163 für Plattenvorschauen verwenden. Sichtbare Bedienprüfung nachholen.

Merge ausschließlich durch Astra 1 in #139. Live ausschließlich nach Chris' Satz im selben Chat. Die Produktaufteilung bleibt ungeändert, bis Claude die Katalogübergabe liefert.
