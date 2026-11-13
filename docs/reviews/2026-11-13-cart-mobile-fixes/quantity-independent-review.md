# Unabhängiger Review: Menge bei Rückkehr in den Editor

13.11.2026. Nur Quell-/Belegprüfung, keine eigenen Tests, keine App-/Server-/Shopifyänderung. Scope: `session-guard.mjs`, `ux.mjs`, `session-guard.test.mjs` und ihre vorhandenen Restore-Aufrufpfade. Der separate mobile `design-reset`-Fix ist nicht Teil dieses Urteils.

**Endurteil nach Nachprüfung: Der konkrete CartEdit-Konflikt ist im eingefrorenen Folgestand behoben. Kein verbleibender konkreter Befund im geprüften Mengenfix; zur Codeübernahme geeignet.** Das ist kein Einbau- oder Livewarenkorbnachweis. Die nachfolgende Befundbeschreibung hält den ursprünglichen Reviewverlauf fest.

## Echter Befund vor Übernahme

Der erste Mengenpatch bewahrt die Menge im lokalen Sitzungsschutz, ließ jedoch das bestehende Rennen mit der expliziten Warenkorbbearbeitung unberücksichtigt:

`ux.mjs:466` → `refinements.mjs:148` → `workflow.mjs:220` → `completion.mjs:30` startet `installCartEdit(api).catch(...)` ohne darauf zu warten. Anschließend folgen weitere asynchrone UI-/Ressourcenschritte und erst danach die lokale `sessionGuard.recover()` in `ux.mjs:490`.

Damit kann eine schnell geladene und vollständig validierte CartEdit-Revision bereits Menge 3 setzen (`cart-edit.mjs:70–71`), bevor die lokale Sitzung ihre alte Menge 10 wiederherstellt. Die lokale Gestaltung konnte bereits vorher mit CartEdit konkurrieren; der neue Mengenrestore erweitert dieses konkrete Rennen um die Menge. Die anfängliche Annahme, CartEdit werde grundsätzlich später gestartet, wurde anhand dieser vollständigen Aufrufkette korrigiert und vor Commit an Root und den Autor gemeldet.

Minimaler Abgleich: Ein syntaktisch gültiger expliziter CartEdit-Auftrag muss gegenüber der automatischen lokalen Recovery Vorrang haben, einschließlich lokaler Upload-Recovery. Native Zugriffs-/Produkt-/Revisionsprüfung bleibt im vorhandenen CartEdit-Pfad. Normale Rückkehr ohne CartEdit-Parameter stellt die lokale Menge weiterhin wieder her; ungültige URL-Parameter dürfen den Schutz nicht pauschal abschalten. Der lokale Guard kann anschließend weiterhin gültige Änderungen sichern.

Erforderlicher enger Regressionsfall: alter lokaler Stand/Menge 10 plus gültige CartEdit-URL; der schnelle und der verspätete native Revision-Restore mit Menge 3 dürfen nicht durch die lokale Sitzung ersetzt werden. Zusätzlich gewöhnliches Wiederöffnen ohne diese URL → 10 und ungültige CartEdit-URL → normale Recovery.

## Sonstiger geprüfter Umfang

Das Mengenfeld ist optional im bestehenden Guard-v1; alte Sitzungen ohne Feld bleiben mit Menge 1 lesbar. Ganze Werte 1–99 entsprechen der vorhandenen `contract.mjs:233`-Grenze. Ungültige Schreibzwischenstände bewahren den letzten gültigen Speicherstand. Die Gestaltung wird weiter durch den nativen `readDraft`-Pfad und Produkt-/Profilrevision validiert. Pending-Design-Transfer, gesperrter Speicher und Workbench-/Fresh-Preview-Ausnahmen werden durch den ursprünglichen Mengenpatch nicht erweitert. Der `input`-Event erreicht den bestehenden Adapterzustand; Preisberechnung und Server-Draftformat ändern sich nicht.

Der Autorenbeleg für den ursprünglichen Stand wurde gelesen: 10/10 Tests, 0 Skip sowie Syntaxprüfungen. Die damaligen drei Datei-SHAs stimmen mit `cart-return-quantity-20261113/checks.json` überein. Keine Wiederholung dieses Testlaufs. Dieser Beleg deckt das oben gefundene CartEdit-Rennen noch nicht ab.

## Abschließende Nachprüfung des Vorrangfixes

Die UX importiert nun den bestehenden `cartEditParams`-Parser. `recoverLocalSession = !pendingDesignTransfer && !cartEditParams(location.search)` wird vor allen lokalen Restore-Schritten ausgewertet. Dasselbe Signal sperrt Ressourcen-Vorladen, lokale Upload-Wiederherstellung und Draft-/Mengen-Recovery. Deshalb kann weder ein bereits abgeschlossener noch ein noch ausstehender gültiger CartEdit-Auftrag von der alten lokalen Sitzung überschrieben werden. Der Parser verleiht keine Zugriffsrechte; der unveränderte native CartEdit-Pfad prüft und lädt weiterhin über den privaten Entwurfszugang. Ungültige CartEdit-Parameter lassen die normale Recovery zu. Der Guard bleibt nach der Übernahme für neue gültige Änderungen aktiv.

Die drei ergänzten Tests wurden quellenmäßig geprüft: Zwei Fälle führen tatsächlich `installCartEdit` mit privatem Token-/Request-Port und nativer `readDraft`-Validierung vor beziehungsweise nach den echten extrahierten UX-Recoveryblöcken aus. Jeweils bleiben Servergestaltung und Menge 3 erhalten; lokale Uploadreferenzen und Ressourcen werden nicht angewendet, der alte Speicher wird beim bloßen Überspringen nicht überschrieben. Eine spätere Mengenänderung wird wieder gespeichert. Der dritte Fall belegt die normale Wiederherstellung von lokaler Gestaltung/Menge 10/Uploadreferenz bei ungültiger URL. Das ist aussagekräftig für die konkrete Reihenfolge, aber weiterhin ein Clienttest mit injiziertem Transport und kein tatsächlicher Serverauthentifizierungs- oder Browsertest.

Autorenlog `session-guard-cart-edit-tests.log`: **13/13 bestanden, 0 Skip**. Drei Syntaxprüfungen und Diffprüfung sind im Autorenbeleg grün. Keine eigene Testwiederholung. Alle neun Dateien des eingefrorenen Pakets und alle drei aktuellen Quelldateien wurden gegen Bytezahl/SHA256 des Manifests beziehungsweise `checks.json` unabhängig nachgerechnet; **keine Abweichung**.

| Finaler Pin | SHA256 |
| --- | --- |
| Paketmanifest Revision 2 | `01012d9121780c915180d920efc9a0e1b3cf4dda36c065d2e5994eceb6fff163` |
| `session-guard.mjs` | `5cc52cfd3c2b0b5a129e04b5ed014f9172d8caeecadc14187eb4eed5fd6221be` |
| `ux.mjs` | `33c42c1543a6cf7774bd81d4bf6a372b268e64bf13957e541325f1a359511684` |
| `session-guard.test.mjs` | `dd9b217778fcba43134a3cfc122a59cfee8879a2c08668117c32e9c166555412` |

`cart-edit.mjs`, `contract.mjs` und der Adapter bleiben unverändert. Keine Preis-/Server-/Authentifizierungsänderung. Echte Browser-/Shopifyabnahme bleibt getrennt; DRAFT-422 wird durch diesen lokalen Fix nicht zu einem erfolgreichen Warenkorbtest. Nach tatsächlicher Codeübernahme ist derselbe öffentliche Rückweg mit Menge 10 sichtbar zu prüfen.
