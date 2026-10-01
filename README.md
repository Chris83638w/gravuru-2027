# Gravuru 2027

**Aktueller Stand: Werkstatt, Produktdatenbank, Profile und Excel-Stapelanlage. 111 Tests bestanden.** Gesamtanwendung noch nicht live fertig.

Für die Weiterarbeit in der Cloud zuerst [CLOUD-START.md](CLOUD-START.md) lesen und `python3 cloud_setup.py` ausführen. Aktueller aktiver Quellstand steckt in `GRAVURU-2027-G27-02.zip` und wird nach `runtime/` entpackt. Er enthält Anwendung, Ressourcen, Excel-Vorlage und ausführliche Übergabe.

Danach in `runtime/`: `npm test`, `npm run build`, `npm start`. Node.js 24 oder neuer. Ohne Paketinstallation startbar. Der Server bindet nur lokal und enthält noch keine öffentliche Händleranmeldung. Die neue Cloud-Umgebung ist Entwicklung, kein Shopify-Livehosting.

Altes G27-01-ZIP und REFERENZ-Archive sind historische Vergleichsstände. Sie nicht anstelle des aktuellen Pakets bearbeiten. Quellhistorien nicht per Force-Push zusammenführen. Lokale Datenbanken/Zugangsdaten sind nicht im Paket.

Details: [Master-Bauplan](NEUE-WERKSTATT-PLAN.md), [Umsetzungspakete](UMSETZUNGSPAKETE.md), [Materialreferenzen](MATERIALREFERENZEN.md).
