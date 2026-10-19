Attribute VB_Name = "CDRRun"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
Option Explicit

' Autor: Martin Afelt @ Gravuru
'
' Gibt die CDR Dateipfade für einen Durchlauf in einem (Ober) Ordner zurück.
' Prüft, ob es eine Text-Datei gibt, die den letzten Fortschritt als CDR-Datei-Pfad abgespeichert hat
' und gibt alle CDRs nach der zuletzt erfolgreichen CDR zurück
'
' Speichert aber auch den Fortschritt neu ab, wenn eine CDR erfolgreich durchlaufen (run) wurde


Dim path As String
Dim runName As String
Dim designCDRsOrAll As Boolean

Dim paths As ArrayList

Public Function init(ByVal path_ As String, ByVal runName_ As String, designCDRsOrAll_ As Boolean) As CDRRun
    
    path = Globals.addBackslash(path_)
    runName = runName_
    designCDRsOrAll = designCDRsOrAll_
    
    ' Fragen ob beim letzten Durchlauf weitergemacht werden soll
    If doesLastCDRRunTextFileExist Then
        Select Case MsgBox("Es wurde ein vorheriger Durchlauf gefunden. Soll dieser fortgeführt werden? Letzte erfolgreiche CDR:" & vbNewLine & loadSuccessFullCDRRun, vbYesNo Or vbQuestion, Application.name)
            Case vbNo
                deleteSuccessFullCDRRun
        End Select
    End If
    
    Set init = Me
End Function


Private Function getLastCDRRunTextFilePath() As String
    getLastCDRRunTextFilePath = path & runName & ".txt"
End Function

Private Function doesLastCDRRunTextFileExist() As Boolean
    doesLastCDRRunTextFileExist = Globals.fileExist(getLastCDRRunTextFilePath)
End Function


Public Function getPaths() As ArrayList
    If paths Is Nothing Then
    
        Set paths = New ArrayList
        If designCDRsOrAll Then
            With ProgressBarUserForm.newSubProgress(1)
                .setDisplayText "CDRs suchen"
                paths.AddRange Globals.getDesignCDRs(path)
                .finishProgress
            End With
        Else
            paths.AddRange Globals.findFilesPathWithExtensionInFolder(path, "cdr")
        End If
        
        Dim lastCDR As String
        lastCDR = loadSuccessFullCDRRun
        
        ' Alle CDRs zum Run aufnehmen, da es keinen vorherigen Fortschritt gibt
        If lastCDR = "" Then
            GoTo ExitFunction
        End If
        
        Dim lastCDRIndex As Integer
        lastCDRIndex = paths.IndexOf(lastCDR)
        
        ' Wenn nicht gefunden, am Anfang anfangen
        If lastCDRIndex = -1 Then lastCDRIndex = 0
        
        If lastCDRIndex = paths.count Then
            Set getPaths = newArrayList
            GoTo ExitFunction
        End If
        
        ' Die restlichen noch nicht durchlaufenen CDRs zurückliefern
        Set paths = paths.subArrayList(lastCDRIndex + 1)
        
    End If
    
ExitFunction:
    Set getPaths = paths
End Function


Public Function saveSuccessfullCDRRun(cdrPath As String)
    If getPaths.isLast(cdrPath) Then
        ' Wenn die letzte CDR verabreitet wurde, Durchlauf beenden indem die Fortschrittdatei gelöscht wird
        deleteSuccessFullCDRRun
    Else
        Globals.saveTextFile cdrPath, getLastCDRRunTextFilePath
    End If
End Function

Public Function loadSuccessFullCDRRun() As String
    If doesLastCDRRunTextFileExist Then
        loadSuccessFullCDRRun = Globals.loadTextFileLines(getLastCDRRunTextFilePath)(0)
    End If
End Function

Public Function deleteSuccessFullCDRRun()
    If doesLastCDRRunTextFileExist Then
        Globals.deleteFile getLastCDRRunTextFilePath ' Letzten Fortschritt löschen
    End If
End Function
