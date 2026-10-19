Attribute VB_Name = "MonitoredFile"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False

' Diese Klasse stellt eine Datei dar, welche auf Änderungen überwacht wird und dann neu geladen wird, wenn sie seit dem letzten Laden verändert wurde
' Denn es kann sein, dass die Skripte Dateien laden und im Speicher behalten aber jemand anderes die Datei im Hintergrund geändert hat.
' Diese Klasse verhindert, dass eine früher geladene Version der Datei eine neuere veränderte Überschreibt


Public file As file
Dim fileType As String
Dim dateLastModified As Date

Dim p_data As IMonitoredFileData


Public Function newMonitoredFile(filePath As String)
    Set file = Globals.fileSystemObject.GetFile(filePath)
    fileType = Globals.fileSystemObject.GetExtensionName(file.path)
    
    If fileType = "csv" Then
        Set p_data = New FileDataCSV
    Else
        Err.Raise vbObjectError + 513, , "[MonitoredFile.newMonitoredFile] Dateityp '" & fileType & "' wird noch nicht unterstützt!"
    End If
    
    p_data.init Me
End Function

Private Function loadFile()
    p_data.loadData
    undirty
End Function

Public Function reloadFileIfNeeded()
    If doesFileNeedsToBeReloaded() Then
        loadFile
    End If
End Function

Public Function doesFileNeedsToBeReloaded() As Boolean
    doesFileNeedsToBeReloaded = Not (dateLastModified = file.dateLastModified)
End Function

Public Function getData() As IMonitoredFileData
    Set getData = p_data
End Function

Public Function getDataCSV() As FileDataCSV
    Set getDataCSV = p_data
End Function

Public Function saveData()
    p_data.saveData
    undirty ' Daten sind jetzt genau so wie in der Datei. Deshalb sind die Daten jetzt wie auf dem Stand der Datei
End Function

Private Function undirty()
    dateLastModified = file.dateLastModified
End Function
