Attribute VB_Name = "AmazonImportJSONRun"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


' Autor: Martin Afelt @ Gravuru
'
' Variablen-Namens-Vorschlag: jsonRun


Public jsonFilePath As String
Public jsonFolderPath As String
Public amazonJson As New AmazonImportJSON
Public viewManager As New AmazonImportViewManager

Private zipExportPath As String
Private p_absoluteQuantity As Integer

Public Function init(path As String, asinToCdrExcelList() As String, Optional logger As logger)
    
    
    
    ' ZIP
    If Globals.endsWith(path, ".zip") Then
        
        
        With ProgressBarUserForm.newSubProgress(1)
            .setDisplayText "Entpacken nach " & Globals.getTempUnzipFolder
        
            ' Dadurch, dass jede ZIP anders heißt, bekommt jede ZIP seinen eigenen Exportordner (zipExportPath)
            zipExportPath = Globals.unzip(path, Globals.getTempUnzipFolder)
        
            .setStepsProgress i
    
            .finishProgress
        End With
        
        If Not Globals.folderExists(zipExportPath) Then
            deleteUnzippedFolder
            Err.Raise vbObjectError + 513, , "Fehler beim entpacken der ZIP-Datei" & vbNewLine & "[AmazonImportJSONRun.init]"
        End If
        
        setJsonFileAndFolderPath findJSONFilePath(zipExportPath, path), zipExportPath
        
    ' JSON
    Else

        setJsonFileAndFolderPath path, Globals.getParentPath(path)
    End If
    
    amazonJson.init jsonFilePath
    initViewManager asinToCdrExcelList, logger
End Function


' Initialisiert den Run ohne ZIP/JSON-Datei, nur anhand einer ASIN (für Produkte ohne Anpassungen)
Public Function initFromASIN(ASIN As String, asinToCdrExcelList() As String, Optional logger As logger)
    amazonJson.initFromASIN ASIN, AmazonImport.getViewCountForASIN(ASIN, asinToCdrExcelList)
    initViewManager asinToCdrExcelList, logger
End Function


Private Function initViewManager(asinToCdrExcelList() As String, Optional logger As logger)
    viewManager.newAmazonImportViewManager amazonJson, asinToCdrExcelList, logger
    
    
    ' Die 'sortInstructions' sind nur in der ersten View 'firstExcelDesignInfo' vorhanden
    viewManager.sortViewDatas viewManager.getFirstExcelDesignsInfo, logger
    
    ' Die erste Excelinfo benötigt schon jetzt eine JSON-View, um festzustellen, in welchem Ordner die Schablone liegen könnte
    viewManager.getFirstExcelDesignsInfo.setDefaultJSONView viewManager.getNextFreeJSONViewData, logger
    
    ' Die weiteren Excelinfos werden über ihren 'View-Name' ebenfalls schon jetzt initialisiert, damit für jede View eine Schablone vorgeschlagen werden kann
    viewManager.initExcelDesignInfosByViewName logger
End Function


Private Function setJsonFileAndFolderPath(jsonFilePath_ As String, jsonFolderPath_ As String)
    jsonFilePath = jsonFilePath_
    jsonFolderPath = jsonFolderPath_
End Function


Public Function deleteUnzippedFolder()
    ' Wenn das ein Run ist, wo eine ZIP entpackt werden musste
    If Not zipExportPath = "" Then
        ' Entpackte ZIP-Dateien/Ordner löschen
        Globals.deleteFolder zipExportPath
    End If
End Function


' Im Ordner nach der JSON Datei suchen
Private Function findJSONFilePath(folderPath As String, zipFilePath As String) As String
    
    Dim jsonFilePaths As collection
    Set jsonFilePaths = Globals.findFilesPathWithExtensionInFolder(folderPath, ".json", 1)
    
    If jsonFilePaths.count = 0 Then
        MsgBox "Die folgende Zip-Datei ist keine gültige Amazon-Bestellungs-Zip: " & vbNewLine & zipFilePath, vbCritical
        Globals.endMacro
    End If
    
    findJSONFilePath = jsonFilePaths(1)
End Function


Public Property Get absoluteQuantity() As Integer
    
    If p_absoluteQuantity = 0 Then
        p_absoluteQuantity = 1
    
        If GlobalSettingsUserForm.getSetting_UseSpareSetForAmazonImport Then
            ' (Geht erst, wenn der Viewmanager initialisiert wurde)
            p_absoluteQuantity = viewManager.getQuantity * amazonJson.quantity
        End If
    End If
    
    absoluteQuantity = p_absoluteQuantity
End Property


