Attribute VB_Name = "FSSizeFolder"
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
' Diese Klasse stellt eine Schnittstelle zu einem Größenordner mit Designordnern dar.
' Hiermit hat man Zugriff auf die Designs von einem Produkt
' Normalerweise sind Produktordner nur unter 'V:\Produkte' in irgendwelchen unterordnern zu finden.
' Für Testzwecke können diese aber auch egal wo liegen
' Achtung: An vielen Stellen im Code wird ein FSSizeFolder auch als DesignsFolder bezeichnet

Dim p_shapeFolder As New FSShapeFolder

' Der Pfad zum Größen-Ordner. Z.B: 'V:\Produkte\Gedenktafeln\Gravur\Schiefer\30x20'
Public path As String
Dim folder As folder

Dim cdrFolderPath As String
Dim fancyExportFolderPath As String

Dim defaultTemplateFolderPath As String
Dim gravingTemplateFolderPath As String
Dim printTemplateFolderPath As String

Dim masterDesignFilePathWithoutExtension As String
Dim masterDesignFilePathInitialized As Boolean

Dim designsFiles As New Dictionary


Public Function init(Optional sizeFolderPath As String, Optional designFolderPath As String, Optional doc As document)
    
    If Not sizeFolderPath = "" Then
        path = sizeFolderPath
    ElseIf Not designFolderPath = "" Then
        path = Globals.getParentPath(designFolderPath)
    ElseIf Not doc Is Nothing Then
        path = Globals.getParentPath(doc.filePath)
    End If
    
    
    If Not Globals.folderExists(path) Then
        Err.Raise vbObjectError + 513, , "[FSSizeFolder.init] Der Ordner exestiert nicht: '" & path & "'"
    End If
    
    p_shapeFolder.init , Me
    
End Function



Public Function addDesignFiles(designFiles As FSDesignFiles)
    ' Wenn hier ein Fehler auftritt, dann weil es evtl. 2 gleiche Artikelnummern gibt
    If designsFiles.Exists(designFiles.getProductID) Then
        MsgBox "Die Artikelnummer '" & designFiles.getProductID & "' ist mehrfach im Dokument vorhanden. Bitte ändere das!", vbCritical, Application.name
        Globals.endMacro
    End If
    designsFiles.add designFiles.getProductID, designFiles
End Function


Public Property Get shapeFolder() As FSShapeFolder
    Set shapeFolder = p_shapeFolder
End Property


Public Function getCDRFolderPath() As String
    If cdrFolderPath = "" Then
        cdrFolderPath = Globals.addBackslash(path) & "[CDR]\"
    End If
    
    getCDRFolderPath = cdrFolderPath
End Function


Public Function hasCDRFolder() As Boolean
    hasCDRFolder = Globals.folderExists(getCDRFolderPath)
End Function


Public Function getFolderName() As String
    getFolderName = Globals.getFolderName(path)
End Function


Public Function getSize() As Vector
    Dim sizeStr As String
    sizeStr = Globals.getSizeFromString(getFolderName)
    
    Globals.getWidthAndHeightOfSize (sizeStr)
End Function


Public Function getAspectRatio() As Double
    
    Dim folderName As String
    folderName = getFolderName
    
    If Globals.getSizeFromString(folderName) = "" Then Exit Function
    
    getAspectRatio = getAspectRatioOfSize(folderName)
   
End Function


Public Function getTemplateFolderPath(Optional forGraving As Boolean = True, Optional forPrint As Boolean = True) As String
    If forGraving And Not forPrint Then
        ' Wenn ein [Gravur] Schablonenordner vorhanden ist, wird er genutzt, ansonsten der Default [Schablone]
        If hasGravingTemplateFolder Then
            getTemplateFolderPath = getGravingTemplateFolderPath
            Exit Function
        End If
    ElseIf forPrint And Not forGraving Then
        ' Wenn ein [Druck] Schablonenordner vorhanden ist, wird er genutzt, ansonsten der Default [Schablone]
        If hasPrintTemplateFolder Then
            getTemplateFolderPath = getPrintTemplateFolderPath
            Exit Function
        End If
    End If
    
    getTemplateFolderPath = getDefaultTemplateFolderPath
End Function


' Der Schablonen Ordner, der nicht zwischen Gravur oder Druck unterscheidet
Public Function getDefaultTemplateFolderPath()
    If defaultTemplateFolderPath = "" Then
        defaultTemplateFolderPath = Globals.addBackslash(getCDRFolderPath) & "[Schablone]"
    End If
    
    getDefaultTemplateFolderPath = defaultTemplateFolderPath
End Function


Public Function getGravingTemplateFolderPath() As String
    If gravingTemplateFolderPath = "" Then
        gravingTemplateFolderPath = Globals.addBackslash(getDefaultTemplateFolderPath) & "[Gravur]"
    End If
    
    getGravingTemplateFolderPath = gravingTemplateFolderPath
End Function


Public Function getPrintTemplateFolderPath() As String
    If printTemplateFolderPath = "" Then
        printTemplateFolderPath = Globals.addBackslash(getDefaultTemplateFolderPath) & "[Druck]"
    End If
    
    getPrintTemplateFolderPath = printTemplateFolderPath
End Function


Public Function hasTemplateFolder(Optional forGraving As Boolean = True, Optional forPrint As Boolean = True) As Boolean
    If forGraving And Not forPrint Then
        ' Wenn ein [Gravur] Schablonenordner vorhanden ist, wird er genutzt, ansonsten der Default [Schablone]
        hasTemplateFolder = hasGravingTemplateFolder
    ElseIf forPrint And Not forGraving Then
        ' Wenn ein [Druck] Schablonenordner vorhanden ist, wird er genutzt, ansonsten der Default [Schablone]
        hasTemplateFolder = hasPrintTemplateFolder
    End If
    
    hasTemplateFolder = hasDefaultTemplateFolder
End Function


Public Function hasDefaultTemplateFolder() As Boolean
    hasDefaultTemplateFolder = Globals.folderExists(getDefaultTemplateFolderPath)
End Function


Public Function hasGravingTemplateFolder() As Boolean
    hasGravingTemplateFolder = Globals.folderExists(getGravingTemplateFolderPath)
End Function


Public Function hasPrintTemplateFolder() As Boolean
    hasPrintTemplateFolder = Globals.folderExists(getPrintTemplateFolderPath)
End Function


' Gibt die Pfade zu dem Schablonen-CDR's zurück
Public Function getTemplateFilesPaths(Optional logger As logger, Optional forGraving As Boolean = True, Optional forPrint As Boolean = True) As ArrayList
    
    If Not logger Is Nothing Then logger.addTab , "[FSSizeFolder.getTemplateFilesPaths]"
    
    Dim templateCDRFilePaths As New ArrayList
    
    If hasTemplateFolder(forGraving, forPrint) Then
            
        ' Beinhaltet auch Ziel-CDR's von Verknüpfungen
        Dim filesInTemplateFolder As collection
        Set filesInTemplateFolder = Globals.listfiles(getTemplateFolderPath(forGraving, forPrint), False, True)
        
        
        If Not logger Is Nothing Then logger.logINFO "filesInTemplateFolder.count: '" & filesInTemplateFolder.count & "'"
        
        Dim i As Integer
        For i = 1 To filesInTemplateFolder.count
            If Globals.endsWith(filesInTemplateFolder(i), ".cdr") Then
                 templateCDRFilePaths.add filesInTemplateFolder(i)
                 If Not logger Is Nothing Then logger.logINFO "Template gefunden: '" & filesInTemplateFolder(i) & "'"
            End If
        Next i
    
    End If
        
    
    Set getTemplateFilesPaths = templateCDRFilePaths
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function hasTemplateFiles() As Boolean
    hasTemplateFiles = getTemplateFilesPaths.count > 0
End Function


Public Function searchDesignsFiles() As Dictionary
    
    Dim folders As collection
    Set folders = Globals.getFoldersInFolder(path)
    
    Dim i As Integer
    For i = 1 To folders.count
        If Globals.isFolderDesignFolder(folders(i)) Then
            getDesignFilesByPath folders(i) ' Fügt sich selbst zu 'designsFiles' hinzu, wenn nicht schon vorhanden
        End If
    Next i
    
    Set searchDesignsFiles = designsFiles
End Function


Public Function getDesignFiles(ByVal index As Integer, Optional oneBasedIndex As Boolean = True) As FSDesignFiles
    Set getDesignFiles = designsFiles.Items(index - IIf(oneBasedIndex, 1, 0))
End Function


Public Function getDesignFilesSize() As Integer
    getDesignFilesSize = designsFiles.count
End Function


Public Function hasMasterDesignFiles()
    ' TODO
End Function


Public Function getMasterDesignFiles() As FSDesignFiles
    Set getMasterDesignFiles = getDesignFilesByProductID(Globals.MASTER_DESIGN_PRODUCT_ID)
End Function


Public Function getDesignFilesByProductID(productID As String) As FSDesignFiles
    
    If productID = "" Then
        Err.Raise vbObjectError + 513, , "[FSSizeFolder.getDesignFilesByProductID] Die Artikelnummer darf nicht leer sein!"
    End If
    
    ' Die Liste mit den Designs initialisieren
    If designsFiles Is Nothing Then
        Set designsFiles = New Dictionary
    End If
    
    ' Wenn das Design nicht vorher schon gefunden oder hinzugefügt wurde, hinzufügen
    If Not designsFiles.Exists(productID) Then
        Dim designFiles As New FSDesignFiles
        designFiles.newDesignFiles Me, productID
        ' Adden des neuen designFiles nicht nötig, da es sich selbst hinzufügt
        
        Set getDesignFilesByProductID = designFiles
    Else
        
        Set getDesignFilesByProductID = designsFiles.item(productID)
    End If
    
End Function


Public Function getDesignFilesByPath(designFolderPath As String) As FSDesignFiles
    ' LCase sorgt dafür, dass Groß/Kleinschreiung missachtet wird
    ' 'addBackslash' sorgt dafür, dass beide Pfade mit einem Backslash enden
    If Not LCase(Globals.addBackslash(Globals.getParentPath(designFolderPath))) = LCase(Globals.addBackslash(path)) Then
        Err.Raise vbObjectError + 513, , "[FSSizeFolder.getDesignFilesByPath] Der Designordnerpfad'" & designFolderPath & "' befindet sich nicht in diesem Produktordner '" & path & "'"
    End If
    
    Set getDesignFilesByPath = getDesignFilesByProductID(Globals.getFolderName(designFolderPath))
    
End Function



Public Function getMasterDesignFilePath(Optional withFileType As Boolean = True) As String
    If Not masterDesignFilePathInitialized Then
                
        If hasCDRFolder Then
            masterDesignFilePathWithoutExtension = Globals.addBackslash(getCDRFolderPath) & Globals.MASTER_DESIGN_FILE_NAME
        End If
        
        masterDesignFilePathInitialized = True
    End If
    
    getMasterDesignFilePath = masterDesignFilePathWithoutExtension & IIf(withFileType, ".cdr", "")
End Function


' Throws Error
Public Function renameDesigns(designs As collection, newNames As collection, Optional logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[FSSizeFolder.renameDesigns]"
    
    If Not designs.count = newNames.count Then Err.Raise vbObjectError + 513, , "[FSSizeFolder.renameDesigns] 'theShape' ist Nothing "
    
    ' Wird mehrfach verwendet
    Dim i As Integer
    
    ' Designfiles sammeln
    ' --------------------------------------------------
    Dim designFilesOfDesigns As New collection
    For i = 1 To designs.count
        Dim currentDesign As productDesign
        Set currentDesign = designs(i)
        
        If Not currentDesign.getProductID = "" Then
            designFilesOfDesigns.add getDesignFilesByProductID(currentDesign.getProductID)
        Else
            ' Wenn das Design noch keine Artikelnummer hat, dann ist die Artikelnummer die aus 'newNames'
            'designFilesOfDesigns.add getDesignFilesByProductID(newNames(i))
        End If
        
        Set currentDesign = Nothing
    Next i
    ' --------------------------------------------------
    
    ' Pfade von Dateien mit alten und neuen Pfad sammeln
    ' --------------------------------------------------
    Dim allFilesAndFoldersOldPaths As New collection
    Dim allFilesAndFoldersNewPaths As New collection
    For i = 1 To designFilesOfDesigns.count
        Dim currentDesignFiles As FSDesignFiles
        Set currentDesignFiles = designFilesOfDesigns(i)
        
        Dim currentFilesAndFoldersToRename As collection
        Set currentFilesAndFoldersToRename = currentDesignFiles.getFilesAndFoldersForRename '(logger:=logger)
        Globals.combineCollectionToCollection currentFilesAndFoldersToRename, allFilesAndFoldersOldPaths
        
        Globals.replaceFilesOrFoldersNames currentFilesAndFoldersToRename, currentDesignFiles.getProductID, newNames(i)
        
        Globals.combineCollectionToCollection currentFilesAndFoldersToRename, allFilesAndFoldersNewPaths
        
        Set currentFilesAndFoldersToRename = Nothing
        Set currentDesignFiles = Nothing
    Next i
    ' --------------------------------------------------
    
    
    
    ' Prüfen, ob umbenannt werden kann
    ' --------------------------------------------------
    Dim canFilesAndFoldersBeRenamedResult As String
    canFilesAndFoldersBeRenamedResult = canFilesAndFoldersBeRenamed(allFilesAndFoldersOldPaths, allFilesAndFoldersNewPaths)
    
    ' Fehlermeldung anzeigen und beenden
    If Not canFilesAndFoldersBeRenamedResult = "" Then
        MsgBox canFilesAndFoldersBeRenamedResult, vbCritical
        Globals.endMacro
    End If
    ' --------------------------------------------------
    
    
    ' Umbenennen
    renameFilesAndFolders allFilesAndFoldersOldPaths, allFilesAndFoldersNewPaths ', logger:=logger
    
    If Not logger Is Nothing Then logger.removeTab
End Function





Public Sub TestCanFilesAndFoldersBeRenamed()
    
    ' Fehler: Zwei Pfade wollen zum selben Pfad umbenannt werden
'    MsgBox canFilesAndFoldersBeRenamed(Globals.collectionFromValues("C:\Users\GRAVURU 2\Desktop\CorelExport", "C:\Users\GRAVURU 2\Desktop\CorelExport 2"), _
'        Globals.collectionFromValues("C:\Users\GRAVURU 2\Desktop\FancyExport\", "C:\Users\GRAVURU 2\Desktop\FancyExport"))
    
    ' Fehler: Ordner exestiert bereits
'    MsgBox canFilesAndFoldersBeRenamed(Globals.collectionFromValues("C:\Users\GRAVURU 2\Desktop\CorelExport", "C:\Users\GRAVURU 2\Desktop\CorelExport 2"), _
'        Globals.collectionFromValues("C:\Users\GRAVURU 2\Desktop\FancyExport", "C:\Users\GRAVURU 2\Desktop\FancyExport 2"))
        
    ' Fehler: Datei exestiert bereits
'    MsgBox canFilesAndFoldersBeRenamed(Globals.collectionFromValues("C:\Windows\hh.exe"), _
'        Globals.collectionFromValues("C:\Windows\hh.exe"))
    
    ' Sollte keinen Fehler ausgeben. Nur eine leere MessageBox
    MsgBox canFilesAndFoldersBeRenamed(Globals.collectionFromValues("C:\Users\GRAVURU 2\Desktop\CorelExport", "C:\Users\GRAVURU 2\Desktop\FancyExport"), _
        Globals.collectionFromValues("C:\Users\GRAVURU 2\Desktop\FancyExport", "C:\Users\GRAVURU 2\Desktop\CorelExport"))
    
End Sub




Public Function renameFilesAndFolders(filesAndFolders As collection, newPaths As collection, Optional withTempStep As Boolean = True, Optional logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[FSSizeFolder.renameFilesAndFolders]"
    
    If withTempStep Then
        Dim newPathsTemp As collection
        Set newPathsTemp = Globals.cloneCollection(newPaths)
        
        Dim i As Integer
        ' Dateien und Ordner mit TEMP_ versehen
        For i = 1 To newPathsTemp.count
            If Globals.isFileOrFolder(newPathsTemp(i)) Then
                Dim folderFileAndType() As String
                folderFileAndType = Globals.getFolderFileAndType(newPathsTemp(i))
                
                Globals.changeValueInCollectionAtIndex folderFileAndType(0) & "TEMP_" & folderFileAndType(1) & folderFileAndType(2), (i), newPathsTemp
            Else
                Globals.changeValueInCollectionAtIndex Globals.addBackslash(Globals.getParentPath(newPathsTemp(i))) & "TEMP_" & Globals.getFolderName(newPathsTemp(i)), (i), newPathsTemp
            End If
        Next i
        
        ' Umbenennen. Bzw. TEMP_ vorne anhängen
        properRenameFilesAndFolders filesAndFolders, newPathsTemp, newPaths, logger
        Set filesAndFolders = newPathsTemp ' 'filesAndFolders' wurden umbenannt zu 'newPathsTemp'
        
    End If
    
    properRenameFilesAndFolders filesAndFolders, newPaths, , logger
    
    If Not logger Is Nothing Then logger.removeTab
    
End Function


Public Function properRenameFilesAndFolders(ByRef filesAndFolders As collection, newPaths As collection, Optional ByRef nonTemporaryNewPathsToRename As collection, Optional logger As logger)
    Dim currentRenamePath As String
    
    If Not logger Is Nothing Then logger.addTab , "[FSSizeFolder.properRenameFilesAndFolders]"
    
    If Not logger Is Nothing Then logger.logINFO "filesAndFolders.count: '" & filesAndFolders.count & "'"
    
    ' Hier werden die Pfade nach Länge sortiert. Die längsten Pfade kommen zuerst, damit Dateien und Unterorder zuerst umbenannt werden und dann erst die Überordner.
    ' Denn würde man erst die Überordner umbenennen müsste man die Pfade von Unterordnern und Unterdateien abändern
'    sortStringCollectionByLenght filesAndFolders, newPaths
    
    Dim i As Integer
    Dim j As Integer
    For i = 1 To filesAndFolders.count
        
        currentRenamePath = newPaths(i)
        
        If Not logger Is Nothing Then logger.logINFO "- Der Pfad: '" & filesAndFolders(i) & "' soll umbenannt werden zu '" & currentRenamePath & "' i: '" & i & "', filesAndFolders.count: '" & filesAndFolders.count & "'"
        
        On Error GoTo RenameError
        Globals.renameFileOrFolder filesAndFolders(i), currentRenamePath
        On Error GoTo 0
        
        ' Wenn ein Ordner umbenannt wurde, dann muss geprüft werden, ob es Unterdateien oder Unterordner in diesem Ordner gibt.
        ' Dessen Pfad muss dann aktualisiert werden, da ihr Überordner sich geändert hat
        ' Muss aber nur für noch nicht verarbeitete Pfade gemacht werden (also ab 'i + 1')
        ' Beispiel:
        ' Wenn der Ordner "C:\Ordner" zu "C:\Neu" umbenannt wurde und es in 'filesAndFolders' einen Pfad namens "C:\Ordner\Bild.jpg" gibt,
        ' dann muss er zu "C:\Neu\Bild.jpg" umbenannt werden
        If Not Globals.isFileOrFolder(currentRenamePath) Then
            If Not logger Is Nothing Then logger.logINFO "-- Ordner umbenannt. Gucken, ob Unterpfade geändert werden müssen. i='" & i & "' filesAndFolders.count='" & filesAndFolders.count & "'"
            
            ' Eigentlich müssten hier nur alle nachfolgenden Elemente bearbeitet werden. Also 'For j = i + 1'. Aber da es den TEMP Schritt geben kann werden hier vorsorglich alle Pfade aktualisiert
            For j = 1 To filesAndFolders.count

                If Not logger Is Nothing Then
                    logger.logINFO "--- Vergleiche '" & filesAndFolders(j) & "' mit '" & Globals.addBackslash(filesAndFolders(i)) & "'"
                End If

                If startsWith(LCase(filesAndFolders(j)), LCase(Globals.addBackslash(filesAndFolders(i)))) Then
                    Dim correctedCurrentPath As String
                    correctedCurrentPath = replace(filesAndFolders(j), Globals.addBackslash(filesAndFolders(i)), Globals.addBackslash(currentRenamePath))
                    Globals.replaceCollectionItem (j), filesAndFolders, correctedCurrentPath
                    
                    Dim correctedNewPath As String
                    correctedNewPath = replace(newPaths(j), Globals.addBackslash(filesAndFolders(i)), Globals.addBackslash(currentRenamePath))
                    Globals.replaceCollectionItem (j), newPaths, correctedNewPath
                    
                    ' Wenn es den Zwischenschritt mit "TEMP_" gibt, müssen die Pfade, die für die aktuellen Dateien stehen ebenfalls umbenannt werden
                    If Not nonTemporaryNewPathsToRename Is Nothing Then
                        Dim correctedNonTemporaryNewPath As String
                        correctedNonTemporaryNewPath = replace(nonTemporaryNewPathsToRename(j), Globals.addBackslash(filesAndFolders(i)), Globals.addBackslash(currentRenamePath))
                        Globals.replaceCollectionItem (j), nonTemporaryNewPathsToRename, correctedNonTemporaryNewPath
                    End If
                    
                    If Not logger Is Nothing Then logger.logINFO "--- Umbenannt zu '" & filesAndFolders(j) & "'"
                End If
            Next j
        End If
        
        currentRenamePath = ""
    Next i
    
    If Not logger Is Nothing Then logger.removeTab
    Exit Function
RenameError:
    If Not logger Is Nothing Then logger.removeTab
    If Err.number = 58 Then
        Err.Raise Err.number, Err.source, Err.Description & vbNewLine & "Pfad: " & currentRenamePath, Err.HelpFile, Err.HelpContext
    Else
        Err.Raise Err.number, Err.source, Err.Description & vbNewLine & "Pfad: " & currentRenamePath, Err.HelpFile, Err.HelpContext
    End If
End Function



' Returnt den Fehler als String
Public Function canFilesAndFoldersBeRenamed(filesAndFolders As collection, newPaths As collection, Optional withTempStep As Boolean = True) As String
    
    If Not (filesAndFolders.count = newPaths.count) Then
        Err.Raise vbObjectError + 513, , "[ProductID.canFilesAndFoldersBeRenamed] 'theShape' ist Nothing "
    End If
    
    Dim result As String
    
    Dim i As Integer
    Dim j As Integer
    
    ' Prüfen, ob sich neue Pfade doppeln
    ' --------------------------------
    For i = 1 To newPaths.count
        For j = i + 1 To newPaths.count
            If Globals.arePathsEqual(newPaths(i), newPaths(j)) Then
                result = "Sowohl '" & filesAndFolders(i) & "' als auch '" & filesAndFolders(j) & "' wollen den selben Pfad haben: '" & newPaths(i) & "'"
                GoTo ExitFunction
            End If
        Next j
    Next i
    ' --------------------------------
    
    
    ' Prüfen ob Pfade bereits exestieren (Ordner oder Dateien)
    ' --------------------------------
    Dim currentPath As String
    For i = 1 To newPaths.count
        
        currentPath = newPaths(i)
        
        If withTempStep Then
            ' Es kann sein, dass der neue Pfad schon exestiert
            ' Doch wenn der neue Pfad in 'filesAndFolders' enthalten ist, heißt es, dass der Pfad beim Umbenennen wieder frei wird
            ' Das könnte so aussehen:
            ' "A" soll "B" werden und
            ' "B" soll "C" werden
            ' "A" kann eigentlich nicht zu "B" umbenannt werden, da es bereits (als Datei oder Ordner) exestiert.
            ' Da aber "B" selbst zu etwas umbenannt wird, wird der Pfad "B" frei für "A"
            '
            ' "B" wird aber nur frei, wenn 'withTempStep' true ist und deshalb Dateien und Ordner vorher mit einem TEMP_ versehen werden -> "TEMP_B".
            ' Dann kann "TEMP_A" zu "B" werden und "TEMP_B" zu "C"
            For j = 1 To filesAndFolders.count
                If Globals.arePathsEqual(currentPath, filesAndFolders(j)) Then
                    GoTo NextI
                End If
            Next j
        End If
        
        If Globals.isFileOrFolder(currentPath) Then ' Datei
            
            If Globals.fileExist(currentPath) Then
                result = "Der Pfad '" & filesAndFolders(i) & "' kann nicht zu der bereits exestierenden Datei '" & currentPath & "' umbenannt werden"
                GoTo ExitFunction
            End If
            
        Else ' Ordner
            
            If Globals.folderExists(currentPath) Then
                result = "Der Pfad '" & filesAndFolders(i) & "' kann nicht zu dem bereits exestierenden Ordner '" & currentPath & "' umbenannt werden"
                GoTo ExitFunction
            End If
            
        End If
NextI:
    Next i
    ' --------------------------------
    
ExitFunction:
    canFilesAndFoldersBeRenamed = result
End Function


Public Function resolveStructurePathForAmazonImportFilesExport() As String
    resolveStructurePathForAmazonImportFilesExport = Globals.addBackslash(path)
End Function


Public Function resolveStructurePathForAmazonExport() As String
    resolveStructurePathForAmazonExport = Globals.addBackslash(path)
End Function

Public Function resolveStructurePathForFancyExport()
    resolveStructurePathForFancyExport = Globals.addBackslash(path)
End Function


Public Function getFancyExportFolder() As String
    getFancyExportFolder = Globals.addBackslash(path) & "[Fancy]\"
End Function

Public Function getFancyCustomizationPath(customizationID As Long, exportName As String) As String
    getFancyCustomizationPath = getFancyExportFolder & "[" & customizationID & " - " & exportName & "]\"
End Function

Public Function getFancyCustomizationPathAny() As ArrayList
    Set getFancyCustomizationPathAny = newArrayList.AddRange(Globals.getFoldersInFolder(getFancyExportFolder)).getStringsMatchingComparison("^.*\\\[\d+ - +[^\]]+\]$", StringRegex)
End Function

' Der Ordner, in dem die Dateien für Fancy ZIPs zunächst abgelegt werden um sie danach zu zippen
Public Function getFancyCustomizationZIPTempPath(customizationID As Long, exportName As String) As String
    getFancyCustomizationZIPTempPath = Globals.getTempFolder & "[FancyExportZIPTemp]\"
End Function

