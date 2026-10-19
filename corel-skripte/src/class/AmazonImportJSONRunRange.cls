Attribute VB_Name = "AmazonImportJSONRunRange"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
Option Explicit

' Autor Martin Afelt @ Gravuru
'
' Variablen-Namens-Vorschlag: jsonRuns

Dim arrList As New ArrayList


Public Function init(paths As collection, asinToCdrExcelList() As String, Optional logger As logger)
    Dim newRunData As AmazonImportJSONRun
    
    With ProgressBarUserForm.newSubProgress(paths.count)
        
        Dim i As Integer
        For i = 1 To paths.count
                
            .setDisplayText "Initialisiere Bestellung #" & i
                
            Dim newRun As New AmazonImportJSONRun
            newRun.init paths(i), asinToCdrExcelList, logger
            
            add newRun
            
            .setStepsProgress i
            Set newRun = Nothing
        Next i
        .finishProgress
    End With
End Function


' Erstellt einen einzigen Run ohne ZIP/JSON-Datei, nur anhand einer ASIN (für Produkte ohne Anpassungen)
Public Function initFromASIN(ASIN As String, asinToCdrExcelList() As String, Optional logger As logger)
    Dim newRun As New AmazonImportJSONRun
    newRun.initFromASIN ASIN, asinToCdrExcelList, logger
    
    add newRun
End Function


Public Property Get count() As Long
    count = arrList.count
End Property


Public Function add(ByVal runData As AmazonImportJSONRun) As AmazonImportJSONRunRange
    arrList.add runData
    Set add = Me
End Function


Public Function item(ByVal index As Long) As AmazonImportJSONRun
    Set item = arrList.item(index)
End Function


Public Function deleteUnzippedFolders()
    Dim i As Integer
    For i = 1 To arrList.count
        item(i).deleteUnzippedFolder
    Next i
End Function

