# Nachtrag: Aggregat der 114 Preisvertragsgruppen

Der nun von Claude exakt benannte Ausdruck aus [Kommentar #1686821399022](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6821399022) wurde ausschließlich lokal gegen die unveränderte Originaldatei `r1-preisvertraege-gruppen.json` gerechnet. Quelle: 17.735 Bytes, SHA256 `b46d9321cdefb7d82e9200b7d37a9be8300c2d9bd4d26b49754965e53907e4f5`.

```js
SHA256(gruppen.slice()
  .sort((a,b) => a.normalisiertSha256 < b.normalisiertSha256 ? -1 : 1)
  .map(g => g.normalisiertSha256 + ':' + (g.ziel + g.rest))
  .join('|'))
```

Kodierung: UTF-8, Trenner `|`, keine abschließende neue Zeile. 114 eindeutige Gruppenhashes; zugehörige Anzahlen 778 Zielvarianten und 30 Restvarianten.

**Ergebnis stimmt exakt:** `d4467e5c22eae26e9653a4b7ca6eaa424ca83d004ee69ab17827798a1e68fa23`.

Damit ist ausschließlich die zuvor offene Benennung des Gruppenaggregat-Verfahrens geschlossen. Die bereits geprüften 114 Einzelhashes und 808 Preiszeilen bleiben unverändert. Keine neue Aussage zum nicht gelieferten vollständigen Serverbeleg, zur aktiven Functionversion oder zur Ausführungsfreigabe. Kein Testlauf, kein Remote-/DB-Zugriff und keine Änderung veröffentlichter Prüfdateien oder Pins.

Maschinenlesbarer Beleg: `main-price-aggregate-addendum.json`.
