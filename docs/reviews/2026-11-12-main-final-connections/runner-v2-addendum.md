# Nachprüfung des korrigierten Main-Runners

12.11.2026. **Beide Befunde des vorausgehenden Reviews sind im neuen Runner geschlossen. Kein verbleibender Quellbefund im gezielten Diff.** Grundlage: [Claude #233·6831710318](https://github.com/Chris83638w/gravuru-2027/issues/233#issuecomment-6831710318) und die tatsächlichen [Dateibytes aus c17ca0e7](https://github.com/Chris83638w/gravuru-2027/blob/c17ca0e75885e9ea0489fe7e09003da388a13027/ops/plesk/ausfuehrung-20261112/ml-lauf-v2.mjs).

- Die Shopify-Vorprüfung vergleicht `custom.customization_id` jetzt mit dem belegten Alias `katalog-formate-acryl-tuerschilder-familienschilder-eb5fe26624befe4a`. Die native cfg-ID bleibt davon getrennt. Keine Produktmetafeldmutation hinzugefügt.
- Plan und Reconcile prüfen als harte Zählergleichheit nur `kopf`, `mainR1`, `mainR2` und `mainR2MitVertrag`. `globaleZaehlerGleich` steht als Information außerhalb der entscheidenden `pruefungen`. Die übrigen bestehenden Main-, Preis-, Vertrags- und Identitätsprüfungen bleiben erhalten.

Der vollständige Diff gegen den bereits geprüften `ml-lauf.mjs` aus e8c5cea7 enthält ausschließlich diese beiden Korrekturen und die zusätzliche informative Ausgabe. Keine Änderung an Mutation, Wiederholungsverhalten, Callback, Registry-/Provideranschluss, Journal, Freigaben oder abschließender Rücklesung. Die unveränderten Anschlüsse bleiben durch den vorausgehenden Review beschrieben.

| Pin | Tatsächlich geprüft |
|---|---|
| Commit | `c17ca0e75885e9ea0489fe7e09003da388a13027` |
| Datei | `ops/plesk/ausfuehrung-20261112/ml-lauf-v2.mjs` |
| Bytes | `32619` |
| SHA256 | `3734f24768fc7545e51cdf49cd1c549ac3cf76f6b6686fafe9d38e614fc45ec5` |
| Gitblob | `85785fd265c5a48d9a3787bf41fd2a069a1556b6` |

Bytezahl, SHA256 und Gitblob stimmen mit der veröffentlichten Datei überein. Reiner Quellen-/Pinreview: kein Import oder Ausführen des Runners, kein Testlauf, kein Server-/Shopzugriff und keine Gitmutation. Der folgende tatsächliche Plan-/Ausführungsbeleg wird damit nicht vorweggenommen; eine neue Nutzerfreigabe wird nicht eingeführt.
