# #230: geprüfter gemeinsamer Integrationskandidat

11.11.2026 · Codex/Astra mit drei Agenten. Aufgabenbranch `dev/astra-issue230-integration-candidate-20261111`. Lokale Integration abgeschlossen; Serverinstallation, reale Zielbindung und Kauf-/Produktionspilot bleiben beim Operator Claude. Keine neuen Produkte angelegt, keine Varianten gelöscht, keine Produkte veröffentlicht.

## Ausgangsproblem und Ergebnis

Die freigegebene Designsuche, weichen Materialschatten und native Produktplanung lagen auf `0e200d8`; die laufende R15-Linie mit Katalogarbeiter, gzip und Kundenmodellcache auf `ac10e6c`. Zusätzlich bestanden 19 ungesicherte Serverabweichungen. Der Kandidat führt diese Funktionen zusammen, erhält feste Produkt-/Revisionsidentitäten und Preise und berücksichtigt jede der 19 Serverdateien ausdrücklich.

Gemeinsamer Vorfahr: `7b8bc287012140cb3aba05f2aadbbe52248c6a55`. Die 30 Konfliktpfade wurden einzeln aufgelöst. Claude hat die 19 Dateien in `sicherung/serverstand-20261111` @ `0d6d23d94d088d17b61397237537fdf42260117c` gesichert; alle 13 übertragenen Dateien wurden unabhängig bytegleich zurückgelesen. Die Freigabe von Chris und die Rückmeldung nach der Sicherung sind in [#168](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6805392758) dokumentiert.

## Erhaltene Funktionen und bewusste Entscheidungen

- Native Modul-/Gruppenverwaltung, Versionsschutz, V1/V2/V3-Preisvertrag, unveränderliche Bestellstände und bestehende Bindungen bleiben erhalten. Cacheprüfungen ersetzen keine aktuelle Sitzungs-/Freigabe-/Revisionsprüfung.
- Suche nach Designname, Nummer, Thema und vorhandenen Motivbezeichnungen bleibt vor der Galerie; bestehende Filter, Rangfolge und Seitenabfrage bleiben wirksam. R15 bricht veraltete Abrufe ab und begrenzt parallele Vorschauen. Originale stehen zuerst. Original-Spruchtexte werden nicht neu indexiert.
- Bestätigte Uploads: Hauptacryl Foto und SVG; sechs Kleinprodukte ohne beides. Preise bleiben unverändert einschließlich 19 % MwSt. Startdesigns bleiben; das separat bereits gesetzte H1-Shopbild wird nicht ersetzt.
- Neue Original18-Acrylfunktionen aus dem Serverstand werden im Code erhalten: native skalierbare 3-mm-Druckgrößen, Vorschauadapter, gespeicherte Preisableitung und begrenzter Vorbereitungslaufcache. Es werden damit keine Original18-Produkte importiert.
- Ältere Serverrückschritte überschreiben keine bestätigten Regeln: Mindestflächenfeld, 0,3-mm-Katalogprüfung, 0,5-mm-Kundenlogohinweis, Bohrungsausweichen, konkrete Material-/Modulprofile, getrennte KGL/KRA-Symbole, Originalfotopixel und weiche Schatten bleiben. Alle 243 tatsächlichen Kleinformatfälle sind kompatibel.
- `modern-navigation.css` und `view-zoom.css` bleiben auf ac10. Belegte Ausnahme innerhalb der älteren Servergruppe: der [Namensgruppenfix 586a7541](https://github.com/Chris83638w/gravuru-2027/commit/586a7541dfa5b973e9a790d0954f964f62057d3e) bleibt. Direkter Gegenvergleich: ac10 zerlegt „Test Eins“/„Familie“, der Kandidat erhält beide Texte vollständig.
- Drei bereits auf B/C vorhandene Cachezählfehler sind gezielt behoben: Quellen einer Operation werden einmal gebündelt aufgelöst; der Zwei-Dokumente-LRU und frische Bestätigungs-/Ausführungsprüfungen bleiben. Sollwerte wurden nicht erhöht.
- Der unveränderte ac10-Katalogtest hing unter Windows beim Aufräumen geöffneter SQLite-Dateien. Nur Test-Cleanup und temporäre Testordner sind korrigiert; Runtime-Arbeiter und Client sind unverändert ac10.

## Ausgeführte Prüfung

Die [Belege](../reviews/2026-11-11-issue230-integrated-candidate/) enthalten Berichte, Dateihashes, Gegenvergleiche, Testausgaben und Screenshots.

| Umfang | Ergebnis |
|---|---|
| Backend-Teilprüfung | 211 unterschiedliche gezielte Tests grün |
| Editor-Teilprüfung | 180 unterschiedliche gezielte Tests grün |
| Galerie/Mobile/Material-Teilprüfung | 184 unterschiedliche gezielte Tests grün |
| Zusätzlicher unabhängiger Backendreview | kein weiterer konkreter Integrationsfehler im geprüften Umfang |
| Zusätzlicher Cross-Lauf | ursprünglich 98 Fälle: 82 grün, 12 Windows-Cleanupfehler, 3 bekannte Cachefehler, 1 fehlende Originalbank-Eingabe |
| Gezielter Abschluss der Cross-Fehler | Katalogworker 23/23, Produktgruppen 22/22 einschließlich neuer Regression; natürlicher Exit, kein Force-Exit/Skip |
| Nach Cachekorrektur | tatsächlicher lokaler Modul-HTTP-Ablauf erneut grün |
| Statistik/Optionpreise/Profile | 13 gezielte Tests grün |
| Persistierte v9-Pläne mit integriertem Code | 7/7 gültig, 823 unveränderte Varianten, keine Bestätigung/Ausführung |
| Build | 76 Referenzressourcen geprüft, 159 Module, 16 Styles; Bundle `editor-f11e977b34d3925a.mjs`, 1.490.600 Byte / 495.766 Byte gzip |
| Browser | PC 1440×900, Handy 390×844: Suche, Leeren, Materialtiefe, Hauptacryl Foto/SVG, native mobile Galerie und Vollansicht geprüft |

Die Gruppen überschneiden sich; ihre Zahlen werden nicht als Gesamtsumme addiert. Nach den gezielten Fehlerkorrekturen wurde nicht behauptet, die gesamte Repository-Suite erneut ausgeführt zu haben. `r15-module-bank.test.mjs` wurde mangels exakt gepinnter realer Edelstahl-Originalbank übersprungen; das ist ausdrücklich keine bestandene Originalbank-/Live-Abnahme.

Browsernachweis verwendet echte unveränderte v9-Produktdokumente mit synthetischen lokalen Bindungen. Speichern, Shopupload und Warenkorb sind in diesem Prüftool gesperrt. Dies belegt keine echte Shopify-Bestellung oder Produktion. Die endgültigen Screenshots zeigen das Hauptacryl am PC und die native Acrylsuche am Handy nach Rücknahme der zwei unbelegten CSS-Deltas. Die frühere Edelstahlprüfung und ihr Build sind im Browserbericht getrennt benannt.

## Nächster konkreter Schritt beim Operator

Claude hat [diesen Kandidaten als gemeinsame Integrationsbasis bestätigt](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6805603018). Keine zweite parallele Integrationslinie bauen.

1. Den veröffentlichten Commit übernehmen; auf Linux gezielt prüfen, echte Kundenmodell-/Originalbankreferenz und PC-/Handybilder vergleichen, Katalogarbeiter messen. Für die reale Bankprüfung den im Test festgelegten Originalhash verwenden.
2. Claudes inzwischen erprobtes SQLite-Online-Backup vor der Migration frisch ausführen (drei Dateien, WAL in Kopie enthalten, quick_check grün; siehe #2336805861632). Dafür ist kein App-Stopp nötig. Statistikmigration zuerst an der geprüften Kopie testen; Änderungen und Umschaltung weiterhin vorher in #233 ankündigen. Der alte Statistikwriter ist nach Migration inkompatibel; nur `app.cjs` zurückzuschalten reicht nicht. Neue Bestellungen niemals durch pauschales Datenbankzurückspielen verlieren.
3. Reale cfg-ID und aktuelle Bindungen des Hauptacryls **16190784602492** bestimmen und erhalten. Neuer Laufzeitordner neben dem jetzigen, Umschaltung erst nach Operatorabnahme.
4. Genau dieses Hauptprodukt bis Speichern → Warenkorb → Produktionspaket prüfen; H1 und Produktidentität erhalten. Die sechs kleinen Produkte erst nach vollständigem Dubletten-/Zielcheck als konkrete Zielpläne vorlegen.
5. Eine konkrete gemeinsame Freigabe für die tatsächlichen Zielpläne von Chris einholen, sobald Pilot und Vergleich vorliegen. Keine zusätzliche Abnahme unveränderter lokaler v9-Pläne. 808→778, alte Produkte, öffentliche Veröffentlichung und andere vorbehaltene Produktlinien werden nicht still geändert.

Vollständige v9-Planpfade, Quellen und Hashes: [TARGETS.md](../reviews/2026-11-11-issue230-native-plans-v9/transport/TARGETS.md). Importgrenzen und identitätserhaltender Updateweg: [target-import.md](../reviews/2026-11-11-issue230-operator-integration/target-import.md). Die umfangreichen Plan-/Excelpakete und ihre eingefrorenen Hashes bleiben unverändert.
