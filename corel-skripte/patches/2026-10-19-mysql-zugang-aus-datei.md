# Patch-Vorschlag: MySQL-Zugangsdaten aus Datei statt aus dem Code

Stand: 19.10.2026 · betrifft `src/class/MySQLConnection.cls` (Funktion `connect`) · **noch nicht angewendet.**
Anwenden in CorelDRAW → Makro-Editor (Alt+F11) → Projekt `Tools` → Klasse `MySQLConnection`, danach `.gms` speichern, neu extrahieren und committen.

## Warum

`connect` enthält die Passwörter für `martin` und `gravuru/admin` im Klartext. Jede Weitergabe der `.gms` (Werkstatt-PCs, Repo, Backups) gibt sie mit. Nach dem Passwortwechsel sollen sie nur noch in **einer** Datei auf dem Server liegen, die das Skript beim Verbinden liest.

Befund nebenbei: Der `admin`-Zweig ruft nach der Zuweisung `End` auf (Zeile 53) und bricht das Makro ab – die Admin-Verbindung ist damit heute faktisch deaktiviert. Produktiv genutzt wird nur `martin` (siehe `MySQL.bas`, alle `connect localServer, martin`). Der Patch behält dieses Verhalten bei.

## Zugangsdatei

Pfad: `<Corel-Hauptordner>\MySQL\zugang.ini` – also `Y:\20_Martin\Corel\MySQL\zugang.ini` (bzw. Zweitserver/Offline-Pfad über `Globals.getMainFolder`). Der Ordner `MySQL\` existiert bereits (ODBC-Treiber-Installer). Nur Leserecht für die Werkstattnutzer.

```ini
; gravuru Corel-Skripte – MySQL-Zugang. Nicht ins Repo, nicht in die .gms.
server=192.168.178.252
martin.user=martin
martin.password=NEUES_PASSWORT
martin.database=martin
admin.user=gravuru
admin.password=NEUES_PASSWORT
admin.database=admin
```

## Code: Ersatz für den Kopf von `connect` (Zeilen 37–54 im Original)

Alt:

```vb
Public Function connect(server As Servers, databaseVar As Databases)

    Select Case server
        Case localServer
            serverIP = "192.168.178.252"
    End Select

    If databaseVar = martin Then
        user = "martin"
        password = "…"
        database = "martin"
    ElseIf databaseVar = admin Then
        user = "gravuru"
        password = "…"
        database = "admin"
'        MsgBox "Sicher?"
        End
    End If
```

Neu:

```vb
Public Function connect(server As Servers, databaseVar As Databases)

    Dim cfg As Object
    Set cfg = loadCredentials(Globals.getMainFolder & "MySQL\zugang.ini")

    Select Case server
        Case localServer
            serverIP = cfg("server")
    End Select

    If databaseVar = martin Then
        user = cfg("martin.user")
        password = cfg("martin.password")
        database = cfg("martin.database")
    ElseIf databaseVar = admin Then
        user = cfg("admin.user")
        password = cfg("admin.password")
        database = cfg("admin.database")
        End ' Wie bisher: Admin-Verbindung ist deaktiviert. Zeile entfernen, wenn sie wieder gebraucht wird.
    End If
```

Neue private Funktion am Ende der Klasse (vor `closeConnection` oder dahinter, egal):

```vb
' Liest eine einfache key=value-Datei (ANSI, ';' oder '#' am Zeilenanfang = Kommentar).
' Fehlende Datei oder fehlender Schlüssel -> verständlicher Fehler statt stillem Verbindungsfehler.
Private Function loadCredentials(path As String) As Object
    Dim dict As Object
    Set dict = CreateObject("Scripting.Dictionary")
    dict.CompareMode = 1 ' vbTextCompare

    If Len(Dir$(path)) = 0 Then
        Err.Raise vbObjectError + 514, "MySQLConnection", _
            "Zugangsdatei nicht gefunden: '" & path & "'" & vbNewLine & _
            "Bitte 'zugang.ini' im Ordner MySQL\ auf dem Server anlegen (Vorlage: corel-skripte/patches)."
    End If

    Dim f As Integer, line As String, pos As Long
    f = FreeFile
    Open path For Input As #f
    Do While Not EOF(f)
        Line Input #f, line
        line = Trim$(line)
        If Len(line) > 0 And Left$(line, 1) <> ";" And Left$(line, 1) <> "#" Then
            pos = InStr(line, "=")
            If pos > 1 Then dict(Trim$(Left$(line, pos - 1))) = Trim$(Mid$(line, pos + 1))
        End If
    Loop
    Close #f

    Dim required As Variant, key As Variant
    required = Array("server", "martin.user", "martin.password", "martin.database", _
                     "admin.user", "admin.password", "admin.database")
    For Each key In required
        If Not dict.Exists(key) Then
            Err.Raise vbObjectError + 515, "MySQLConnection", _
                "Schlüssel '" & key & "' fehlt in '" & path & "'"
        End If
    Next key

    Set loadCredentials = dict
End Function
```

## Prüfung nach dem Einbau

1. Corel neu starten, Makro `MySQL.TestGetCDRPathFromAsin` (Zeile 6 in `MySQL.bas`, ruft `getCDRPathFromAsin("B0979Y664L", "D72")`) ausführen → Pfad kommt zurück.
2. `zugang.ini` kurz umbenennen → Makro muss mit „Zugangsdatei nicht gefunden“ abbrechen, nicht mit ODBC-Fehler.
3. `.gms` neu extrahieren (`tools/extract-gms.py`), `grep -rn -i 'password = "' corel-skripte/src` → nur noch `cfg(...)`-Zuweisungen und die leeren PDF-Passwörter.
4. Alte Passwörter in MySQL ändern (Nutzer `martin`, `gravuru`), `zugang.ini` auf allen Werkstatt-PCs liegt zentral auf `Y:` – nichts je PC zu verteilen.

Nicht Teil dieses Patches: Verschlüsselung der Datei (ODBC braucht das Passwort im Klartext; Schutz über NTFS-Rechte des Ordners `MySQL\`).
