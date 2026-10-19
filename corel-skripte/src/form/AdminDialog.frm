VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} AdminDialog 
   Caption         =   "Admin Dialog"
   ClientHeight    =   4710
   ClientLeft      =   30
   ClientTop       =   370
   ClientWidth     =   5510
   StartUpPosition =   1  'Fenstermitte
   TypeInfoVer     =   6
End
Attribute VB_Name = "AdminDialog"
Attribute VB_Base = "0{E7A303AA-FF8A-4A59-B622-899D7A549F19}{A1B6A45E-F361-497A-9261-148BAF1D1CB1}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


Private Sub ExportForGithubButton_Click()
    exportMacrosAndForms
End Sub


Private Function exportMacrosAndForms()
    
    If Not Globals.isReleaseVersion Then
        Dim result As VbMsgBoxResult
        result = MsgBox("Release Version ist aus! Möchtest du trotzdem exportieren?", vbYesNo Or vbQuestion)
        
        If result = vbNo Then Exit Function
    End If
    
    
    Dim exportPath As String
    exportPath = Application.GMSManager.UserGMSPath & "\Gravuru CorelDRAW Tools\"
    
    ' Alte Daten löschen
    Globals.deleteFolder exportPath & "Formulare\"
    Globals.deleteFolder exportPath & "Module\"
    Globals.deleteFolder exportPath & "Klassenmodule\"
    
    Globals.createFolder exportPath
    Globals.createFolder exportPath & "Formulare\"
    Globals.createFolder exportPath & "Module\"
    Globals.createFolder exportPath & "Klassenmodule\"
    
    
    Dim project As VBIDE.VBProject
    Set project = Application.VBE.ActiveVBProject
    
    For Each currentComp In project.VBComponents
        
        Dim fileName As String
        fileName = currentComp.name
        
'        MsgBox "Type of " & fileName & " is " & currentComp.Type
        
        Select Case currentComp.Type
            Case vbext_ct_ClassModule
                fileName = "Klassenmodule\" & fileName & ".cls"
            Case vbext_ct_MSForm
                fileName = "Formulare\" & fileName & ".frm"
            Case vbext_ct_StdModule
                fileName = "Module\" & fileName & ".bas"
            Case vbext_ct_Document
                ''' This is a worksheet or workbook object.
                ''' Don't try to export.
                fileName = ""
        End Select
        
        ' Export
        If Not fileName = "" Then
            currentComp.export exportPath & fileName
            convertFileAnsiToUtf8 exportPath & fileName
        End If
        
    Next currentComp

    MsgBox "Fertig exportiert! '" & vbNewLine & exportPath & "'", vbInformation
End Function


' Konvertiert eine von VBIDE exportierte Datei von Windows-1252 (ANSI) nach
' UTF-8 ohne BOM. So verarbeiten Git/GitHub, externe Editoren und Claude die
' Umlaute verlustfrei. Der ProjectImporter muss vor dem Reimport wieder nach
' Windows-1252 zurücksetzen, da die VBA-IDE beim Import ANSI erwartet.
Private Sub convertFileAnsiToUtf8(ByVal filePath As String)
    On Error GoTo Fail

    Dim srcStream As Object
    Set srcStream = CreateObject("ADODB.Stream")
    srcStream.Type = 2 ' adTypeText
    srcStream.CharSet = "Windows-1252"
    srcStream.Open
    srcStream.loadFromFile filePath
    Dim content As String
    content = srcStream.ReadText
    srcStream.Close

    ' Formulare: die VBA-IDE hängt bei jedem Export eine Leerzeile hinter
    ' den Attribute-Block. Auf genau eine normalisieren, damit der Export
    ' idempotent bleibt und die Leerzeilen nicht mit jedem Roundtrip wachsen.
    If LCase$(Right$(filePath, 4)) = ".frm" Then
        content = normalizeFormHeaderBlankLines(content)
    End If

    Dim utf8Stream As Object
    Set utf8Stream = CreateObject("ADODB.Stream")
    utf8Stream.Type = 2 ' adTypeText
    utf8Stream.CharSet = "utf-8"
    utf8Stream.Open
    utf8Stream.WriteText content

    ' BOM (3 Byte) überspringen und als reine Bytes speichern
    utf8Stream.position = 0
    utf8Stream.Type = 1 ' adTypeBinary
    utf8Stream.position = 3
    Dim bytes
    bytes = utf8Stream.Read
    utf8Stream.Close

    Dim outStream As Object
    Set outStream = CreateObject("ADODB.Stream")
    outStream.Type = 1 ' adTypeBinary
    outStream.Open
    outStream.Write bytes
    outStream.SaveToFile filePath, 2 ' adSaveCreateOverWrite
    outStream.Close
    Exit Sub

Fail:
    MsgBox "Konvertierung nach UTF-8 fehlgeschlagen für:" & vbNewLine & filePath & _
           vbNewLine & vbNewLine & Err.Description, vbExclamation
End Sub


' Kollabiert die Leerzeilen zwischen dem letzten Attribute-Header und der
' ersten Code-Zeile auf genau eine. Nur die Kopf-Leerzeilen werden angefasst,
' der restliche Datei-Inhalt bleibt byte-genau erhalten (Join reproduziert
' den Originaltext exakt, es fallen nur überzählige Leerzeilen weg).
Private Function normalizeFormHeaderBlankLines(ByVal content As String) As String
    Dim lines() As String
    lines = Split(content, vbCrLf)

    ' Index der letzten Attribute-Zeile suchen
    Dim lastAttr As Long
    lastAttr = -1
    Dim i As Long
    For i = 0 To UBound(lines)
        If left$(LTrim$(lines(i)), 10) = "Attribute " Then
            lastAttr = i
        End If
    Next i

    If lastAttr = -1 Then
        normalizeFormHeaderBlankLines = content
        Exit Function
    End If

    ' Leerzeilen direkt nach dem Attribute-Block zählen
    Dim firstCode As Long
    firstCode = lastAttr + 1
    Do While firstCode <= UBound(lines)
        If Len(Trim$(lines(firstCode))) = 0 Then
            firstCode = firstCode + 1
        Else
            Exit Do
        End If
    Loop

    Dim removeCount As Long
    removeCount = (firstCode - lastAttr - 1) - 1  ' alle bis auf eine entfernen
    If removeCount <= 0 Then
        normalizeFormHeaderBlankLines = content
        Exit Function
    End If

    ' Neues Array ohne die überzähligen Leerzeilen zusammenbauen
    Dim newLines() As String
    ReDim newLines(UBound(lines) - removeCount)
    Dim k As Long
    k = 0
    For i = 0 To UBound(lines)
        If i >= lastAttr + 1 And i <= lastAttr + removeCount Then
            ' überzählige Leerzeile überspringen
        Else
            newLines(k) = lines(i)
            k = k + 1
        End If
    Next i

    normalizeFormHeaderBlankLines = Join(newLines, vbCrLf)
End Function


Private Sub ReleaseOnServerCommandButton_Click()
    Globals.releaseThisGMSOnServer
End Sub
