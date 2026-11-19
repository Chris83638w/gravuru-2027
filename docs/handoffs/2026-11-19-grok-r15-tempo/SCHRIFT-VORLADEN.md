# Schrift-Vorladen und Datensparmodus

Stand der Nachmessung von `fd2fb7d9`, Live-Ring-Seite, nur lesend. Die Zahlen stehen im Kommentar zu #267 vom 19.11.2026, 21:16 UTC. Dieses Dokument ändert das Verhalten nicht. Chris entscheidet.

## Gemessen

| | Kalte Übertragung Öffnen + Karten | Volle Schriften | Wechsel PC kalt | Wechsel Handy kalt | Wechsel Datensparen PC | Wechsel Datensparen Handy |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `d640afcf`, kein Vorladen | 425 KB | 0 beim Öffnen, 7 Dateien / 971 KB erst beim Wechsel | 410 ms | 1.823 ms | 456 ms | 1.566 ms |
| `3387918c`, Schriften schon im Öffnen | 1.882 KB | 1.453 KB | 133 ms | 638 ms | 148 ms | 630 ms |
| `fd2fb7d9`, Vorladen im Leerlauf nach den Karten | 1.879 KB | 1.453 KB nach dem Zeichnen, 0 beim Wechsel | 156 ms | 648 ms | 390 ms | 1.574 ms (Spitze 12.635 ms) |

Im Datensparmodus lädt `fd2fb7d9` beim Wechsel wieder 7 Dateien / 971 KB. Die Karten selbst bleiben gefüllt (0 leere Karten).

## Optionen

1. **So lassen.** Volle Schriften im Leerlauf vorladen, im Datensparmodus nicht. Kalter Wechsel liegt bei 648 ms (Handy) und 156 ms (PC). Die kalte Übertragung bleibt bei 1.879 KB. Der Datenspar-Wechsel bleibt bei 1.574 ms auf dem Handy und 390 ms am PC.
2. **Vorladen abschalten.** Das ist der Stand `d640afcf`. Die kalte Übertragung fällt auf 425 KB. Der erste Wechsel lädt 971 KB und dauert 1.823 ms auf dem Handy und 410 ms am PC. Beides gleichzeitig, 425 KB und der Wechsel von 648 ms, ist in der Messung nicht aufgetreten.
3. **Im Datensparmodus nur die Schrift des angetippten Designs laden.** Das tut der Wechsel heute schon, und dabei wurden 7 Dateien / 971 KB gemessen. Eine engere Auswahl, etwa ein oder zwei häufige Schriften, ist nicht als eigener Lauf gemessen. Die volle Schriftmenge im Leerlauf wiegt 1.453 KB.

Keine dieser Optionen ist umgesetzt. Preise, Fertigung und der Warenkorb bleiben davon unberührt.
