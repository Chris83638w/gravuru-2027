# Freigabeantrag für eine geschützte B-Beta

Kandidat B ist lokal ausführbar. Einen Host lege ich nicht an.

## Ziel

`https://konfi-beta-b.gravuru-designwerkstatt.de/`

Das ist ein eigener Name neben der Adresse von Kandidat A. `konfi-beta.gravuru-designwerkstatt.de` bleibt unangetastet.

## Zugriff

Eigener Systembenutzer, eigenes Verzeichnis, eigene SQLite-Datei, HTTP-Basic-Auth mit getrenntem Prüferkonto. Ohne Anmeldung antwortet die Adresse mit 401. Passwörter gehen privat an Chris, nicht ins Repository und nicht ins Issue.

## Isolierung

Kein gemeinsamer Warenkorbordner mit A, kein Schreibzugriff auf den Live-Shop oder den Testshop, keine Theme-Änderung. `checkoutPreviewFirst` darf nur in diesem Prozess an sein. Der Katalog auf dem Server, falls nötig, ist ein read-only Checkout von `Chris83638w/gravuru-katalog.` ausschließlich für `migrationen/funkklingeln-42x3-20261027` und die genannten Preisdateien. Kein Schreibtoken.

## Kosten

Kein neuer Server und keine neue Lizenz. Wenn der vorhandene Plesk-Rechner die zweite Adresse mitträgt, entstehen keine zusätzlichen monatlichen Kosten. Das ist eine Annahme und kein Angebot. Sobald ein neuer Server oder ein kostenpflichtiges Zertifikat nötig wäre, stoppe ich.

## Rückweg

Nur diese Adresse stoppen oder das vorherige Paket dieses Benutzers zurückspielen. A, `app-2027` und der Shop bleiben außen vor.

## Was ich von Chris brauche

Ein ausdrückliches Ja zu Name, Benutzer und Basic-Auth auf dem bestehenden Rechner. Ohne dieses Ja bleibt der Nachweis lokal.
