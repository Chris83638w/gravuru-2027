# Übergabe Hauptprodukt (Stand 12.11.2026 17:56Z) – für die Fortsetzung in derselben Sitzung (auch nach Modellwechsel)

Freigabe: #168 6829898414 „Ja, Gesamtpaket ausführen“, Umfang `f26ada8`. Sechs DRAFTs sind abgeschlossen (#168 6830922986, `2b-sechsdraft-ergebnis.json`).
**Main `16190784602492` / `cfg_8e7ebe96-…` ist zum Zeitpunkt dieser Notiz unverändert.**

Server: Plesk-Node-Konsole (Tab im Laptop-Browser), Staging `/private/claude-paket1a-20261110/`, ein Prozess nach dem anderen, Uploads nur unter neuen Namen, jeden Schritt vorher in #233 ankündigen, danach Hashes melden. Nichts löschen, kein Appneustart, keine Veröffentlichung.

## Reihenfolge
1. `exec -- node ../private/claude-paket1a-20261110/sicherung-db.mjs` → neuer Ordner `sicherungen-db/<Zeitstempel>` (um 17:56Z gestartet; Ergebnis prüfen).
2. Upload `ml-update.mjs` (sha `098ae9869ca94e7c4467f01212565a3dda53d6e4b5dc35ab251f8b9b9140c718`). `node …/ml-update.mjs` = Vorprüfung; nur wenn `bestanden:true`: `node …/ml-update.mjs --ausfuehren`. Erwartet: Revision 2, Dokument `f0bb7d95…d285`, Metadaten `52476368…f075`, 1 Journaleintrag, 808 R1-Bindungen unverändert.
3. Ankündigung Teil 2 in #233, Upload `ml-connections.mjs` (sha `ecc6a54f074dbeae155f243fc9470cc556d0d1aa3323e80181f7e5bd435891ee`) und `ml-lauf.mjs` (sha `b075fc960ec5e8bd158e15c9a851e5c297076e98cd7236ef3e26a39492960745`). `fr-callback.mjs` liegt schon im Staging.
4. `node …/ml-lauf.mjs --stufe=plan` (nur lesend) → Ordner `sicherungen-db/mainlive-<ts>`, `PLANBELEG.json`. Alle Prüfungen müssen grün sein (182/158/30, 8 Blöcke, Preisplan 3 898 B `37ef02c6…0705`, 808 R1-Verträge `1fe75355…6da1`, echter Functionbeleg).
5. Ankündigung Teil 3, dann `node …/ml-lauf.mjs --stufe=apply --ordner=mainlive-<ts>` (≈ 6–8 min: 1 Variantenupdate, 1 Preis-CAS, 8 Blöcke, finish-catalog, Readback). Konsole kann die Ausgabe verlieren → Beleg `lauf-apply-<ts>/AUSFUEHRUNG-main.json` über den Dateimanager lesen.
6. Bei `angehalten`: **nichts wiederholen.** Journal lesen, `--stufe=reconcile --ordner=… --step=<Schlüssel>` (nur lesend), Ergebnis in #168 klären; erst danach ggf. erneut `--stufe=apply`. Liegt `journal/.lock` ohne laufenden Prozess vor: nicht löschen, erst Astra/Chris informieren.
7. Abschluss: Live-Check, Ergebnis-JSON ins Repo, tatsächliche IDs/Readback in #168 und #233, kurze Meldung an Chris.

Bekannte Grenzen: Plan-Auswertung, Schreibverdrahtung und Readback sind nur auf Kopie (mo-lauf, synthetisches Shopify) bzw. gar nicht lokal testbar; Transport lokal gegen Nachbau getestet; unabhängige Durchsicht ohne Blocker (Befunde eingearbeitet, Commit `e8c5cea7`).
