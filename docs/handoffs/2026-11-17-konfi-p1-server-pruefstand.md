# P1: isolierter Prüfstand nur für Teil A und V2

Dieser Hilfsbranch ist kein neues Paket und kein zweiter PR: `dev/astra-konfi-p1-server-pruefstand-20261117` stellt für PR #255 einen eindeutig begrenzten Messkandidaten bereit. Basis `97fe62d` enthält Lesungen und V2; ergänzt ausschließlich die zwei fehlertoleranten Quellenableitungen aus `d7b0075`, die dazugehörigen HTTP-Tests sowie den Test-Cleanup unter Windows. Kein V3, kein Vorabsichern-Schalter, keine Änderung am gemeinsamen Kundeneditor oder an den Browsermodulen. `git diff 105e398 -- app/configurator app/workshop/ui` ist leer.

Teil A/V2 wurden von Claude [auf d7b0075 gegengeprüft](https://github.com/Chris83638w/gravuru-2027/pull/255#pullrequestreview-5941772598). Die Laufzeitkorrektur hier ist identisch, ohne den dazwischenliegenden V3-Commit. [Messdaten, Reviewantworten und Grenzen im Arbeitsbranch](https://github.com/Chris83638w/gravuru-2027/blob/dev/astra-konfi-tempo-p1-20261117/docs/handoffs/2026-11-17-konfi-tempo-p1-umbau.md). [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) unverändert.

Nur lokaler Prüfstand. Keine Live-Konfiguration, kein Merge, kein Deploy. Letzter bestätigter Live-Stand `9af3a1ac`. Das frühere „live für 1b“ umfasst diesen Kandidaten nicht. Genau nächster Schritt: Claude prüft den isolierten Commit; ein echtes Messfenster erfordert einen neuen expliziten Live-Auftrag. V3 und die offenen 45-Tage-Abgrenzungen bleiben separat im P1-PR.

Validierung: 199 gezielte Tests bestanden. Kundeneditor- und Browserquellen identisch zu 105e398, gebauter Editor weiterhin editor-53e0cbea74e77305.mjs. Kein V3-Schalter vorhanden.
