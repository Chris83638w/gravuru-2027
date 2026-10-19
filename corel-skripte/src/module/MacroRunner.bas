Attribute VB_Name = "MacroRunner"
Option Explicit

' ============================================================
'  MacroRunner
'  Füllt eine ListBox mit allen startbaren Makros, gruppiert
'  nach Modul, mit Live-Suche, und startet das gewählte Makro.
'  Die Auswahl wird in der Registry gemerkt (F5 -> Enter
'  startet das zuletzt gewählte Makro).
'  Autor: Martin Afelt @ GRAVURU
' ============================================================

Private Const SETTINGS_APP As String = "CorelDraw"
Private Const SETTINGS_SECTION As String = "Tools-MacroRunner"

' VBIDE-Konstanten (spät gebunden, daher lokal definiert)
Private Const CT_STD_MODULE As Long = 1   ' vbext_ct_StdModule
Private Const PK_PROC As Long = 0         ' vbext_pk_Proc

' Cache aller startbaren Makros: je Eintrag Array(Modul, Makro)
Private mMacros As collection


Public Sub Show()
    MacroRunnerDialog.Show vbModal
End Sub

' Cache verwerfen -> beim nächsten renderMacroList wird neu aus der VBE gelesen.
Public Sub reloadMacros()
    Set mMacros = Nothing
End Sub


' Füllt die ListBox aus dem Cache; zeigt nur Einträge, die zum Filter passen
' (Filter leer = alles). Modul-Kopfzeile erscheint nur bei mind. 1 Treffer.
Public Sub renderMacroList(lst As MSForms.ListBox, filter As String)
    If mMacros Is Nothing Then loadMacros

    lst.Clear
    lst.ColumnCount = 2
    lst.ColumnWidths = ";0"        ' 2. Spalte (Key) unsichtbar

    Dim f As String
    f = LCase$(Trim$(filter))

    Dim letztesModul As String
    letztesModul = vbNullChar
    Dim kopfGesetzt As Boolean

    Dim eintrag As Variant
    For Each eintrag In mMacros
        Dim modul As String, makro As String
        modul = eintrag(0)
        makro = eintrag(1)

        If modul <> letztesModul Then
            letztesModul = modul
            kopfGesetzt = False
        End If

        If Len(f) = 0 _
           Or InStr(LCase$(makro), f) > 0 _
           Or InStr(LCase$(modul), f) > 0 Then

            If Not kopfGesetzt Then
                ' Kopfzeile für das Modul (kein Key -> nicht startbar)
                lst.AddItem modul
                lst.List(lst.ListCount - 1, 1) = ""
                kopfGesetzt = True
            End If

            lst.AddItem "    " & makro
            lst.List(lst.ListCount - 1, 1) = "S|" & modul & "|" & makro
        End If
    Next eintrag
End Sub


Private Sub loadMacros()
    Set mMacros = New collection
    On Error GoTo Fehler

    Dim proj As Object
    Set proj = getOwnProject()
    If proj Is Nothing Then Exit Sub

    Dim comp As Object
    For Each comp In proj.VBComponents
        If comp.Type = CT_STD_MODULE Then
            Dim makros() As String
            Dim anzahl As Long
            getPublicParameterlessSubs comp, makros, anzahl

            Dim i As Long
            For i = 0 To anzahl - 1
                mMacros.add Array(comp.name, makros(i))
            Next i
        End If
    Next comp

    Exit Sub
Fehler:
    MsgBox "MacroRunner konnte die Makroliste nicht lesen." & vbCrLf & vbCrLf & _
           "Fehler: " & Err.Description & vbCrLf & vbCrLf & _
           "Bitte prüfen: 'Vertrauen auf Zugriff auf das VBA-Projektobjektmodell' " & _
           "muss aktiviert sein.", vbExclamation
End Sub


Public Sub runSelectedFromKey(nodeKey As String)
    If left$(nodeKey, 2) <> "S|" Then Exit Sub

    Dim teile() As String
    teile = Split(nodeKey, "|")             ' teile(1)=Modul, teile(2)=Makro
    saveLastSelection teile(1), teile(2)

    Dim projName As String
    projName = getOwnProject().name         ' GMS-Projekt, das dieses Modul enthält

    Application.GMSManager.RunMacro projName, teile(1) & "." & teile(2)
End Sub


Public Sub saveLastSelection(modulName As String, makroName As String)
    SaveSetting SETTINGS_APP, SETTINGS_SECTION, "LastModule", modulName
    SaveSetting SETTINGS_APP, SETTINGS_SECTION, "LastMacro", makroName
End Sub


Public Function getLastSelectionKey() As String
    Dim m As String, s As String
    m = GetSetting(SETTINGS_APP, SETTINGS_SECTION, "LastModule", "")
    s = GetSetting(SETTINGS_APP, SETTINGS_SECTION, "LastMacro", "")
    If Len(m) = 0 Or Len(s) = 0 Then Exit Function
    getLastSelectionKey = "S|" & m & "|" & s
End Function


Private Function getOwnProject() As Object
    ' Das Projekt zurückgeben, das dieses Modul enthält
    ' (robust, falls mehrere GMS-Projekte geladen sind)
    Dim p As Object, c As Object
    For Each p In Application.VBE.VBProjects
        Set c = Nothing
        On Error Resume Next
        Set c = p.VBComponents("MacroRunner")
        On Error GoTo 0
        If Not c Is Nothing Then
            Set getOwnProject = p
            Exit Function
        End If
    Next p
    Set getOwnProject = Application.VBE.ActiveVBProject
End Function


Private Sub getPublicParameterlessSubs(comp As Object, ByRef namen() As String, ByRef anzahl As Long)
    Dim cm As Object
    Set cm = comp.CodeModule

    ReDim namen(0 To 63)
    anzahl = 0

    Dim letzterProc As String
    letzterProc = vbNullChar

    Dim zeile As Long
    For zeile = cm.CountOfDeclarationLines + 1 To cm.CountOfLines
        Dim procName As String
        procName = cm.ProcOfLine(zeile, PK_PROC)

        If Len(procName) > 0 And procName <> letzterProc Then
            letzterProc = procName

            ' ProcBodyLine wirft bei Properties Fehler 35 -> abfangen und überspringen
            Dim bodyLine As Long
            bodyLine = 0
            On Error Resume Next
            bodyLine = cm.ProcBodyLine(procName, PK_PROC)
            On Error GoTo 0

            If bodyLine > 0 Then
                Dim kopf As String
                kopf = getProcHeader(cm, bodyLine)
                If isPublicParameterlessSub(kopf) Then
                    If anzahl > UBound(namen) Then ReDim Preserve namen(0 To anzahl + 63)
                    namen(anzahl) = procName
                    anzahl = anzahl + 1
                End If
            End If
        End If
    Next zeile
End Sub


Private Function getProcHeader(cm As Object, bodyLine As Long) As String
    ' Deklarationszeile lesen und Zeilenfortsetzungen ( _ ) zusammenfügen
    Dim ergebnis As String
    Dim zeile As Long
    zeile = bodyLine

    Do
        Dim ln As String
        ln = RTrim$(cm.lines(zeile, 1))
        If Right$(ln, 1) = "_" Then
            ergebnis = ergebnis & left$(ln, Len(ln) - 1) & " "
            zeile = zeile + 1
        Else
            ergebnis = ergebnis & ln
            Exit Do
        End If
    Loop

    getProcHeader = Trim$(ergebnis)
End Function


Private Function isPublicParameterlessSub(kopf As String) As Boolean
    Dim klammerAuf As Long
    klammerAuf = InStr(kopf, "(")
    If klammerAuf = 0 Then Exit Function

    ' Teil vor der Klammer (Modifizierer + "Sub" + Name)
    Dim vorKlammer As String
    vorKlammer = " " & LCase$(Trim$(left$(kopf, klammerAuf - 1))) & " "

    ' nur Subs (keine Functions/Properties)
    If InStr(vorKlammer, " sub ") = 0 Then Exit Function
    ' keine privaten / Friend-Subs
    If InStr(vorKlammer, " private ") > 0 Then Exit Function
    If InStr(vorKlammer, " friend ") > 0 Then Exit Function

    ' Parameterliste muss leer sein
    Dim klammerZu As Long
    klammerZu = InStr(klammerAuf, kopf, ")")
    If klammerZu = 0 Then Exit Function
    If Len(Trim$(Mid$(kopf, klammerAuf + 1, klammerZu - klammerAuf - 1))) > 0 Then Exit Function

    isPublicParameterlessSub = True
End Function
