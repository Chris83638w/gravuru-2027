Attribute VB_Name = "FancyExport"

' Autor:  Martin Afelt @ GRAVURU
'
' TODO:
' - Wenn mehrere Grundplpatten (pro Schicht) vorhanden sind, nicht die automatischen Grundplatten (vom Placefile) nutzen. Aber auch diese per UI deaktivierbar machen
' - Beim mixen einer transparenten Grundplatte mit dem Hintergrund, müssen Schichten darunter beachtet werden. Eine Edelstahlplatte hinter einer transparenten Acrylplatte z.B.
' - Textboxen mit Begrenzung auch ausgeben, nicht nur Textlines
' - Textposition verfeinern
' - 5 Views erlauben


Private logger As logger

Public debug_zipping_off As Boolean


Dim forceColorAble As Boolean
Dim useProductImagesAsThumbnail As Boolean
Dim exportLook As Boolean
Public exportText As Boolean

' Beschreibt, ob es mind. ein Design gibt, welches von der Hauptform oder Anzahlt der Teile oder Schichten anders ist.
' Nur wenn alle Designs gleich sind, können bspw. Varianten global für alle Design exportiert werden im Produktordner. Ansonsten müssen Varianten im Designordner landen
Public areDesignsMainShapesEqual As Boolean


Public dummyText As shape
Dim thumbnailFilePath As String

Dim confiExportForDesign As Dictionary

Public Const CONFI_DEFAULT_WIDTH = 800
Public Const CONFI_DEFAULT_HEIGHT = 800
Public Const CONFI_MIN_HEIGHT = 400
Public Const CONFI_PADDING = 10
Public Const CONFI_PADDING_TOP = CONFI_PADDING * 2

' Kleinste gravierbare Schrifthöhe (physisch, am Produkt in Originalgröße).
' ca. 3.12 mm, per Testgravur auf Edelstahl bestimmt. Ergab am 20×20-cm-Referenzprodukt
' (shapesScale 0.3259665) die früher hartkodierten 12 Fancy-Einheiten - Verhalten bleibt identisch.
Public Const MIN_GRAVABLE_FONT_SIZE_PT = 8.8353


Public Const FANCY_Z_INDEX_HIGHEST = 999
Public Const FANCY_Z_INDEX_LOWEST = 1
'' ACHTUNG: Z-Indexe im Fancy sind anders herum. Hohe Z-Indexe sind unten
Public Const FANCY_Z_INDEX_LOWEST_VISUALLY = FANCY_Z_INDEX_HIGHEST
Public Const FANCY_Z_INDEX_HIGHEST_VISUALLY = FANCY_Z_INDEX_LOWEST


Public Const CUSTOMIZATION_ID_KEY_NAME = "ID"

Dim qrCodesNotSupportedInV2WarningShowed As Boolean

Dim previousResolution As Long


Sub FancyExport()
    
'    debug_zipping_off = True
    
    Globals.showWarnings
    
    ' Vor dem Exportieren die ausgewählten Designs mit dem Fehler-Fixer prüfen (Wenn eingestellt)
    If GlobalSettingsUserForm.getSetting_RunFehlerFixerBeforeExport Then
        Globals.storeSelection
        ActiveDocument.ClearSelection
        ErrorFixer.CorrectDesigns
        Globals.restoreSelection
    End If
    
    FancyExportDialog.init
    FancyExportDialog.Show
    
End Sub


Public Function cleanUp()
    If Not dummyText Is Nothing Then dummyText.delete
    ConfiHelper.cleanUp
End Function


Public Function getLogger(Optional reset As Boolean = False) As logger
    If (logger Is Nothing) Or reset Then
        Set logger = newLogger("FancyExport")
    End If
    
    Set getLogger = logger
End Function


Public Function Start(ByVal exportPath As String, runCSVFilePath As String, runCSVRegex As String, exportName As String, longCustomizationID As Long, mainDesignProductID As String, viewSettings As ConfiPartToViewSortInstruction, customBackgroundpathVar As String, qrCodeAsVariantVar As Boolean, _
        automaticGroundplateVariants As Boolean, forceColorAbleVar As Boolean, focusedLayerIndexVar As Integer, _
        exportLook As Boolean, useProductImagesAsThumbnailVar As Boolean, exportTextVar As Boolean, exportSimpleFolderIconWhenGravingVar As Boolean, _
        Optional headless As Boolean)
    
    getLogger
    logger.addTab , "[FancyExport.Start]"
    
    Globals.startMacro
    If Not Globals.debugHistory Then
        ActiveDocument.BeginCommandGroup "FancyExport"
        If Not Globals.debugErrors Then On Error GoTo MacroError
    End If
    
    If Not runCSVFilePath = "" Then
        startFunctionRunCSVFile runCSVFilePath, runCSVRegex, viewSettings, customBackgroundpathVar, qrCodeAsVariantVar, automaticGroundplateVariants, forceColorAbleVar, focusedLayerIndexVar, exportLook, _
            useProductImagesAsThumbnailVar, exportTextVar, exportSimpleFolderIconWhenGravingVar, headless, logger
    Else
        startFunction exportPath, exportName, longCustomizationID, mainDesignProductID, viewSettings, customBackgroundpathVar, qrCodeAsVariantVar, automaticGroundplateVariants, forceColorAbleVar, focusedLayerIndexVar, exportLook, _
            useProductImagesAsThumbnailVar, exportTextVar, exportSimpleFolderIconWhenGravingVar, headless, logger
    End If
    
    If Not ActiveDocument Is Nothing Then
        ActiveDocument.resolution = previousResolution
    End If
    
    
    GoTo Finally
MacroError: 'Alle Fehler hier abfangen und die CommandGruppe beenden, damit man mit einem Schritt zurück gehen kann (STRG + Z), auch wenn ein Fehler aufgetreten ist
    MsgBox Err.Description & ", " & Err.number, vbCritical
Finally:
    cleanUp
    Globals.endMacro True
    If Not Globals.debugHistory Then
        
        ' Dokument zurücksetzen
        If GlobalSettingsUserForm.getSetting_ResetDocAfterExport Then
            If Not ActiveDocument Is Nothing Then ActiveDocument.Undo
        End If
    End If
    ActiveDocument.Dirty = False ' Nicht speicherbar machen
    logger.removeTab
End Function



Public Function startFunctionRunCSVFile(ByVal csvFilePath As String, runCSVRegex As String, Optional viewSettings As ConfiPartToViewSortInstruction, Optional customBackgroundpathVar As String = "", _
        Optional qrCodeAsVariantVar As Boolean = False, Optional automaticGroundplateVariants As Boolean = True, Optional forceColorAbleVar As Boolean = False, Optional focusedLayerIndexVar As Integer = -1, _
        Optional exportLook As Boolean = True, Optional useProductImagesAsThumbnailVar As Boolean = True, Optional exportTextVar As Boolean = True, Optional exportSimpleFolderIconWhenGravingVar As Boolean = True, _
        Optional headless As Boolean = False, Optional logger_ As logger)
        
    If Not Globals.fileExist(csvFilePath) Then Err.Raise vbObjectError + 513, , "[FancyExport.startFunctionRunExcelFile] Folgende CSV Datei exestiert nicht: '" & csvFilePath & "'"
        
    If Not logger Is Nothing Then logger.addTab , "[FancyExport.startFunctionRunCSVFile]"
        
    Dim csvList As New ArrayList2D
    csvList.FromCSVFile csvFilePath
    
    Const HEADER_ROW = 1
    
    
    
    Dim row As Integer
    
    ' Regex matchen und gematche Rows (Zeilen) merken
    ' -----------------------------------------------------
    Dim validRows As New ArrayList
    ' Wenn Regex vorhanden, dann Matches suchen
    If Not runCSVRegex = "" Then
        Dim regMatcher As RegexMatcher
        Set regMatcher = newRegexMatcher.SetPattern(runCSVRegex)
        For row = HEADER_ROW + 1 To csvList.rowCount
            Dim zipPath As String
            zipPath = csvList.item(row, csvList.IndexOfStringInRow("ZIP Pfad", StringEquals, True, HEADER_ROW))
            If Not regMatcher Is Nothing Then
                If regMatcher.Test(zipPath) Then
                    validRows.add row
                End If
            End If
        Next row
    Else
    ' Ohne Regex alle Zeilen erlauben
        For row = HEADER_ROW + 1 To csvList.rowCount
            validRows.add row
        Next row
    End If
    ' -----------------------------------------------------
    
    
    With ProgressBarUserForm.newSubProgress(validRows.count)
        
        Dim i As Integer
        ' Header überspringen
        For i = 1 To validRows.count
        
            row = validRows.item(i)
            
            Dim customizationIDString As String
            customizationIDString = csvList.item(row, csvList.IndexOfStringInRow("CustomizationID", StringEquals, True, HEADER_ROW))
            
            ' Leere Felder überspringen
            If customizationIDString = "" Then GoTo NextRow
            
            Dim customizationID As Long
            customizationID = CLng(customizationIDString)
            
            Dim exportName As String
            exportName = csvList.item(row, csvList.IndexOfStringInRow("Export-Name", StringEquals, True, HEADER_ROW))
            
            Dim mainDesignProductID As String
            mainDesignProductID = csvList.item(row, csvList.IndexOfStringInRow("Hauptdesign Artikelnummer", StringEquals, True, HEADER_ROW))
            
            Dim cdrFilePath As String
            cdrFilePath = csvList.item(row, csvList.IndexOfStringInRow("CDR Pfad", StringEquals, True, HEADER_ROW))
            
            .setDisplayText "CDR '" & cdrFilePath & "'"
            
            startFunctionRunCSVFile_ProcessCDR cdrFilePath, exportName, customizationID, mainDesignProductID, viewSettings, customBackgroundpathVar, qrCodeAsVariantVar, automaticGroundplateVariants, forceColorAbleVar, focusedLayerIndexVar, exportLook, _
                useProductImagesAsThumbnailVar, exportTextVar, exportSimpleFolderIconWhenGravingVar, headless, logger_
            
            .setStepsProgress i
NextRow:
        Next i
ExitFor:
        .finishProgress
    End With
    
    
    If Not logger Is Nothing Then logger.removeTab
End Function


Private Function startFunctionRunCSVFile_ProcessCDR(cdrFilePath As String, exportName As String, customizationID As Long, mainDesignProductID As String, Optional viewSettings As ConfiPartToViewSortInstruction, Optional customBackgroundpathVar As String = "", _
        Optional qrCodeAsVariantVar As Boolean = False, Optional automaticGroundplateVariants As Boolean = True, Optional forceColorAbleVar As Boolean = False, Optional focusedLayerIndexVar As Integer = -1, _
        Optional exportLook As Boolean = True, Optional useProductImagesAsThumbnailVar As Boolean = True, Optional exportTextVar As Boolean = True, Optional exportSimpleFolderIconWhenGravingVar As Boolean = True, _
        Optional headless As Boolean = False, Optional logger_ As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[FancyExport.startFunctionRunCSVFile_ProcessCDR] cdrFilePath: '" & cdrFilePath & "'"
    
    ' Leere Zeile
    If cdrFilePath = "" Then GoTo ExitFunction
    
    ' CDRs die nicht von der Neuen Struktur kommen ignorieren
    If Not Globals.startsWith(cdrFilePath, "V:") Then GoTo ExitFunction
    
    If Not Globals.fileExist(cdrFilePath) Then
        Select Case MsgBox("Die CDR '" & cdrFilePath & "' existiert nicht. Drücke OK um den Fehler zu ignorieren", vbOKCancel, Application.name)
        Case vbOK
            GoTo ExitFunction
        Case vbCancel
            Globals.endMacro
        End Select
    End If
    
    Dim doc As document
    If Not logger Is Nothing Then logger.logINFO "Öffne Dokument ..."
    Set doc = OpenDocument(cdrFilePath)
    
    startFunction Globals.STRUCTURE_PATH, exportName, customizationID, mainDesignProductID, viewSettings, customBackgroundpathVar, qrCodeAsVariantVar, automaticGroundplateVariants, forceColorAbleVar, focusedLayerIndexVar, exportLook, _
            useProductImagesAsThumbnailVar, exportTextVar, exportSimpleFolderIconWhenGravingVar, headless, logger_
    
    If Not logger Is Nothing Then logger.logINFO "Wechsle zum Startdokument zum zuverlässigen Schließen des Arbeitsdokuments ..."
    ' Zum ersten Dokument wechseln, welches offen war, bevor man exportieren geklickt hat. Denn dann wird das Dokument, welches soeben exportiert wurde zuverlässiger geschlossen (Corel Crash BUG)
    Documents.item(1).Activate
    DoEvents
    If Not logger Is Nothing Then logger.logINFO "Gewechselt"
    
    If Not logger Is Nothing Then logger.logINFO "Schließe Dokument ..."
    doc.Close
    Set doc = Nothing
    If Not logger Is Nothing Then logger.logINFO "Dokument geschlossen"
    
ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
End Function




Public Function startFunction(ByVal exportPath As String, exportName As String, longCustomizationID As Long, mainDesignProductID As String, Optional viewSettings As ConfiPartToViewSortInstruction, Optional customBackgroundpathVar As String = "", _
        Optional qrCodeAsVariantVar As Boolean = False, Optional automaticGroundplateVariants As Boolean = True, Optional forceColorAbleVar As Boolean = False, Optional focusedLayerIndexVar As Integer = -1, _
        Optional exportLook As Boolean = True, Optional useProductImagesAsThumbnailVar As Boolean = True, Optional exportTextVar As Boolean = True, Optional exportSimpleFolderIconWhenGravingVar As Boolean = True, _
        Optional headless As Boolean = False, Optional logger_ As logger)
    
    If viewSettings Is Nothing Then
        Set viewSettings = New ConfiPartToViewSortInstruction
        viewSettings.initilizeWithDefaultValues
    End If
    
    Dim initProgress As SubProgress
    Set initProgress = ProgressBarUserForm.newSubProgress(1)
    initProgress.setDisplayText "Initialisiere"
    
    ' Kann auch von einem Skript außerhalb gesetzt werden
    Set logger = logger_
    logger.addTab , "[FancyExport.startFunction]"
    
    ActiveDocument.unit = cdrMillimeter
    ActiveDocument.Rulers.HUnits = cdrMillimeter
    ActiveDocument.Rulers.VUnits = cdrMillimeter
    previousResolution = ActiveDocument.resolution
    
    Globals.warnIfNotFrontMostDocument logger
    
    If exportPath = Globals.STRUCTURE_PATH Then
        exportPath = newFSSizeFolder(, , ActiveDocument).resolveStructurePathForFancyExport
    End If

    ' Einstellungen
    ' ------------------------------------------
    qrCodeAsVariant = qrCodeAsVariantVar
    forceColorAble = forceColorAbleVar
    useProductImagesAsThumbnail = useProductImagesAsThumbnailVar
    exportText = exportTextVar
    exportSimpleFolderIconWhenGraving = exportSimpleFolderIconWhenGravingVar
    ' ------------------------------------------
    
    
    logger.logINFO "customBackgroundpath: '" & customBackgroundpath & "', qrCodeAsVariant: '" & qrCodeAsVariant & _
        "', automaticGroundplateVariants: '" & automaticGroundplateVariants & "', forceColorAble: '" & forceColorAble & "', focusedLayerIndexVar: '" & focusedLayerIndexVar & _
        "', exportLook: '" & exportLook & _
        "', useProductImagesAsThumbnail: '" & useProductImagesAsThumbnail & "', exportText: '" & exportText & _
        "', exportSimpleFolderIconWhenGraving: '" & exportSimpleFolderIconWhenGraving & "'"
    
    FancyExportDialog.updateExportIDsSkriptVersion longCustomizationID
    
    Dim designsToProcess As ProductDesignRange
    Set designsToProcess = Globals.getAllDesignsAsRange
    
    Set designsToProcess = designsToProcess.getDesignsByFancyExportID(longCustomizationID)
    
    ' Hauptdesign als das Erste setzen
    If designsToProcess.count > 0 Then designsToProcess.moveToByDesignNumber newProductIDObject.setProductID(mainDesignProductID).getDesignNumber, 1
    
    ' Texte sortieren
    designsToProcess.sortText
    
    ' Uploadboxicon wechseln
    replaceUploadBoxIcon designsToProcess
    
    ' Folder-Bilder unbedingt vor dem übertragen des Masterdesigns machen, da dieser manchmal eine Konfi-Maske und oder Hintergrund hat, welches dann das Design verdeckt
    ConfiHelper.focusedLayerIndex = focusedLayerIndexVar ' Wird in der 'ConfiHelper.createDesignsSnapshots' benötigt
    
    Globals.transferMasterDesignToDesignsIfFound designsToProcess, FancyExportType, logger
    
    If designsToProcess.count > 0 Then
        areDesignsMainShapesEqual = Globals.areDesignMainShapesEqual(designsToProcess)
    End If
    
    ConfiHelper.init exportPath, fancy, focusedLayerIndexVar, exportLook, exportSimpleFolderIconWhenGraving, automaticGroundplateVariants, CONFI_DEFAULT_WIDTH, CONFI_DEFAULT_HEIGHT, customBackgroundpath, logger, _
        CONFI_PADDING, CONFI_PADDING_TOP, CONFI_PADDING, CONFI_PADDING, CONFI_MIN_HEIGHT
    
    
    
    ' Vorschaubilder erst nach dem ConfiHelper.init erstellen
    ConfiHelper.createDesignsSnapshots designsToProcess
    
    Set dummyText = ActiveLayer.CreateArtisticText(0, 0, "DummyText")
    dummyText.name = "Dummy-Text"
    
    ' Initailisierung abgeschlossen
    initProgress.finishProgress
    
    If designsToProcess.count = 0 Then
        If Not headless Then MsgBox "Es wurden keine Designs zum exportieren gefunden!", vbInformation
    Else
        exportDesigns exportName, longCustomizationID, designsToProcess, viewSettings
    End If
    
    logger.removeTab
End Function




Public Function startTagDesigns(designs As ProductDesignRange, exportName As String, mainDesignProductID As String, Optional progressLabel As Label)
    
    If designs.count = 0 Then
        MsgBox "Keine Designs vorhanden!"
        End
    End If
    
    If mainDesignProductID = "" Then
        MsgBox "Die Artikelnummer für das Hauptdesign darf nicht leer sein!"
        End
    End If
    
    Dim id As Long
    id = FancyExportDialog.getNextFreeFancyCustomizationIDInCSV
    
    If id < 100000 Then
        Err.Raise vbObjectError + 513, , "Die ID muss mindestens 100.000 sein!"
    End If
    
    
    ' Ordner ermitteln und erstellen
    If Not progressLabel Is Nothing Then progressLabel.Caption = "(1/4) Exportordner anlegen"
    Dim sizeFolder As FSSizeFolder
    Set sizeFolder = newFSSizeFolder(, , ActiveDocument)
    Dim fancyExportPath As String
    fancyExportPath = sizeFolder.getFancyCustomizationPath(id, exportName)
    Globals.createFolder fancyExportPath

    ' ID in Excel eintragen
    If Not progressLabel Is Nothing Then progressLabel.Caption = "(2/4) Daten in Excel eintragen"
    FancyExportDialog.fancyCustomizationIDsCSV.getDataCSV.getStringArrayList2D.AddRowParamArray id, exportName, mainDesignProductID, ActiveDocument.FullFileName, fancyExportPath, Globals.getVersion.versionString
    FancyExportDialog.fancyCustomizationIDsCSV.saveData
    
    ' ID
    If Not progressLabel Is Nothing Then progressLabel.Caption = "(3/4) IDs auf Designs anwenden"
    designs.addFancyCustomizationIDShape id, True
     
    
    If Not progressLabel Is Nothing Then progressLabel.Caption = "(4/4) Dokument speichern"
    ActiveDocument.Save
    
    If Not progressLabel Is Nothing Then progressLabel.Caption = "Fertig gettagt als " & id
End Function




Private Function replaceUploadBoxIcon(designs As ProductDesignRange)
    ' Grünes Gravuru Shopify Kamera Icon setzen
    Tool.createUploadboxOnShapeRange designs.newCustomShapeTypeQuery(uploadBox).setContinueSearchInMatchedGroups(False).search, True, GravuruShopifyIconType
End Function


Private Function exportDesigns(exportName As String, longCustomizationID As Long, designsToProcess As ProductDesignRange, viewSettings As ConfiPartToViewSortInstruction)
    
    logger.addTab , "[FancyExport.exportDesigns]"
    
'     'Chachen, damit Variantenreihenfolge passt??
'    logger.logINFO "Suche Varianten..."
'    designsToProcess.collectAllVariants logger
    
    Set confiExportForDesign = New Dictionary
    
    Dim progress As SubProgress
    Set progress = ProgressBarUserForm.newSubProgress(3)
    
    ' TODO zu Confihelper verschieben
    ' Ordner erstellen, wenn nicht vorhanden
    Globals.createFolder ConfiHelper.designFiles.sizeFolder.getFancyCustomizationPath(longCustomizationID, exportName)
    ' Alte ZIP Dateien löschen
    Globals.deleteFilesOrFolders Globals.getFilesPathWithExtensionInFolder(ConfiHelper.designFiles.sizeFolder.getFancyCustomizationPath(longCustomizationID, exportName), "zip")
    
    Dim designConfiExports As New ConfiExportRange
    
    ' Wird mehrfach verwendet:
    Dim currentDesign As productDesign
    
    ' BASE-CUSTOMIZATION
    ' ================================================
    progress.setDisplayText "(1/3) Base-Customization"
    logger.logINFO "BASE-CUSTOMIZATION"
    logger.logINFO "================================================"
    Dim firstDesign As productDesign
    If designsToProcess.count > 0 Then Set firstDesign = designsToProcess.getDesign(1)
    
'    ' Variantengruppe mit allen Designs erstellen
'    ' -------------------------------------------
'    Dim designsVariantGroup As New VariantGroup
'    For i = 1 To designsToProcess.count
'        Dim designVariante As New variante
'        designVariante.newDesignVariant designsToProcess.getDesign(i).getDesignShape, designsToProcess.getDesign(i).getLayer2(1)
'        designsVariantGroup.addVariante designVariante, False, False
'    Next i
'    ' -------------------------------------------
    
    Dim customization As New FancyExportPackage
    
    Dim customizationConfiExport As ConfiExport
    ' Views erzeugen lassen
    Set customizationConfiExport = getConfiExportForDesign(firstDesign, 1, viewSettings)
    
    Dim internalName As String
    internalName = exportName & " " & firstDesign.getProductID
    
    customization.initAsCustomization exportName, "customization", longCustomizationID, customizationConfiExport, exportName, internalName, logger
    
    Dim v As Integer
    With ProgressBarUserForm.newSubProgress(customizationConfiExport.getViewCount)
        For v = 1 To customizationConfiExport.getViewCount
            
            .setDisplayText "View " & v
            
            Dim customizationConfiView As ConfiView
            Set customizationConfiView = customizationConfiExport.getView(v)
            
            ' Exportformen für die Customization festlegen
            Dim exportShapesOfFirstView As shapeRange
            Set exportShapesOfFirstView = customizationConfiView.layersFlattened.newCustomShapeTypeQuery(VisualElementShapeType).search
            
            ' Wenn nur ein Design exportiert wird
            If designsToProcess.count = 1 Then
                exportShapesOfFirstView.AddRange customizationConfiView.layersFlattened.newCustomShapeTypeQuery(DesignElementShapeType).search
                
                ' Hilfsformen im Fancy (Bspw.: Hauptformen)
                exportShapesOfFirstView.AddRange customizationConfiView.layersFlattened.newCustomShapeTypeQuery(FancyHelperShapeType).search
                
                designConfiExports.add customizationConfiExport
            End If
            
            Dim variantGroupsOfFirstDesignToRemove As VariantArray
            Set variantGroupsOfFirstDesignToRemove = customizationConfiView.parts.collectAllVariants
            
            ' Varianten mit mehreren Optionen in eigene Layouts exportieren
            ' Single-Varianten aber in der Customization behalten, da diese nicht ausgewählt werden können
            variantGroupsOfFirstDesignToRemove.removeSingleVariants
            
            Globals.removeShapRangeRecursive exportShapesOfFirstView, variantGroupsOfFirstDesignToRemove.allVariantsShapes
            
            buildExportView customization, customizationConfiView, v, exportShapesOfFirstView
            
            .setStepsProgress v
        Next v
        .finishProgress
    End With
    
    
    progress.setStepsProgress 1
    ' ================================================
    
    
    
    ' DESIGNS
    ' ================================================
    progress.setDisplayText "(2/3) Designs Layout"
    logger.logINFO "DESIGNS"
    logger.logINFO "================================================"
    
    Dim designsPackage As FancyExportPackage
    If designsToProcess.count > 1 Then
        
        Set designsPackage = New FancyExportPackage
        designsPackage.initAsLayout "Designs", "designs", customization, exportName, internalName, DesignVariantType, logger
        
        Dim confiViewForDesign As ConfiView
        
        With ProgressBarUserForm.newSubProgress(designsToProcess.count)
            For i = 1 To designsToProcess.count
                Set currentDesign = designsToProcess.getDesign(i)
                
                .setDisplayText "Design: " & currentDesign.getProductID
                
                Dim currentDesignConfiEx As ConfiExport
                Set currentDesignConfiEx = getConfiExportForDesign(currentDesign, i, viewSettings)
                
                With ProgressBarUserForm.newSubProgress(currentDesignConfiEx.getViewCount)
                    For v = 1 To currentDesignConfiEx.getViewCount
                        
                        .setDisplayText "View " & v
                        
                        Dim currentDesignConfiView As ConfiView
                        Set currentDesignConfiView = currentDesignConfiEx.getView(v)
                        
                        Dim exportShapes As shapeRange
                        Set exportShapes = currentDesignConfiView.layersFlattened.newCustomShapeTypeQuery(DesignElementShapeType).setContinueSearchInMatchedGroups(False).search
                        
                        ' Hilfsformen im Fancy (Bspw.: Hauptformen)
                        exportShapes.AddRange currentDesignConfiView.layersFlattened.newCustomShapeTypeQuery(FancyHelperShapeType).search
                        
                        ' Multi Varianten entfernen, sollen hier nicht mitexportiert werden, sondern weiter unten einzelnd
                        Globals.removeShapRangeRecursive exportShapes, currentDesignConfiView.parts.collectAllVariants.removeSingleVariants.allVariantsShapes
                        
                        Dim currentDesignView As FancyExportView
                        Set currentDesignView = buildExportView(designsPackage, currentDesignConfiView, (i), exportShapes, currentDesign.getProductIDObject.getDesignNumberBeautiful, customization.getView(v))
                        
                        ' View des Designs nur in der selben View-Nummer der Customization erlauben.
                        ' Bspw. soll D1 Schlüsselanhänger Rückseite nur bei der Customization in der 2. View für die Rückseite auswählbar sein. Nicht auf der Vorderseite
                        customization.addLayoutViewDependency customization.getView(v), currentDesignView
                        
                    Next v
                     .finishProgress
                End With
                
                designConfiExports.add currentDesignConfiEx
                
                Set currentDesignConfiEx = Nothing
                Set currentDesign = Nothing
                
                .setStepsProgress i
            Next i
            .finishProgress
        End With
    End If
    
    progress.setStepsProgress 2
    ' ================================================
    
    
    
    
    
    ' VARIANTEN
    ' ================================================
    progress.setDisplayText "(3/3) Varianten Layouts"
    logger.logINFO "VARIANTEN"
    logger.logINFO "================================================"
    For v = 1 To customizationConfiExport.getViewCount
        
        ' Varianten die auch echte Varianten sind mit mehreren Varianten pro Gruppe
        Dim variants As VariantArray
        logger.logINFO "Suche Varianten..."
        Set variants = designConfiExports.getProductDesingPartsOfView(v).collectAllVariants.removeSingleVariants
        
'        variants.allVariantsShapes
        
        With ProgressBarUserForm.newSubProgress(variants.variantGroups.count)
            For vg = 1 To variants.variantGroups.count
                Dim currVariantGroup As VariantGroup
                Set currVariantGroup = variants.variantGroups(vg)
                
                .setDisplayText "Variantengruppe: " & currVariantGroup.getGroupName
                
                If currVariantGroup.clone.removeEqualVariants.isSingleVariant Then
                    logger.logINFO "Die Variantengruppe '" & currVariantGroup.getGroupName & "' hat nur eine Auswahl. Deshalb wird sie nicht exportiert!"
                    GoTo SkipVariant
                End If
        
                Dim variantPackage As New FancyExportPackage
                variantPackage.initAsLayout currVariantGroup.getGroupNameForFancy, LCase(currVariantGroup.getGroupNameForFancy), customization, exportName, internalName, currVariantGroup.getVariant(1).typee, logger
                
                ' Alle Designs, die diese Variante haben
                ' Es kann immer sein, dass eine Variante nicht bei allen Designs vorkommt
                Dim designsOfVariantGroup As ProductDesignRange
                Set designsOfVariantGroup = currVariantGroup.variants.getDesigns
                
                If designsOfVariantGroup.count = designsToProcess.count Then
                    logger.logINFO "Alle Designs haben die Variantengruppe: '" & currVariantGroup.getGroupName & "'"
                Else
                    logger.logINFO "Nur '" & designsOfVariantGroup.count & "' Designs von '" & designsToProcess.count & "' Designs haben die Variantengruppe: '" & currVariantGroup.getGroupName & "'"
                End If
                
                
                
                
                ' TODO !!!! !!!! !!!!  gleiche DesignElementVarianten von unterschiedlichen Designs werden noch nicht richtig als gleich angesehen
                ' Der Offset zwischen den Designs muss noch rausgerechnet werden: Globals.areShapesEqual benötigt noch diesen Offset
                
                ' Nachdem alle Designs festgestellt wurden, doppelte Varianten löschen.
                ' Denn ein Design kann die selbe Grundplatten haben wie ein anderes Design
                ' Am Ende wollen wir aber nur jede Grundplatte einmal exportieren
                Dim currVariantGroupWithoutDuplicates As VariantGroup
                Set currVariantGroupWithoutDuplicates = currVariantGroup.clone
                currVariantGroupWithoutDuplicates.variants.removeEqualVariants
                
                
                
                Dim va As Integer
                For va = 1 To currVariantGroupWithoutDuplicates.variants.count
                    
                    Dim currVariant As variante
                    Set currVariant = currVariantGroupWithoutDuplicates.variants.item(va)
                    
                    ' Variante aktivieren (sichtbar machen) damit man auf de mThumbnail was sieht davon
                    currVariant.setActive True
                        
                    Dim designsWithEqualVariant As ProductDesignRange
                    Set designsWithEqualVariant = currVariantGroup.variants.getEqualVariants(currVariant).getDesigns
                    
                        
                    Dim variantConfiEx As ConfiExport
                    Set variantConfiEx = getConfiExportForDesign(currVariant.getDesign, 1, viewSettings)
                
                    Dim currVariantView As FancyExportView
                    Set currVariantView = buildExportView(variantPackage, variantConfiEx.getView(v), va, Globals.shapeToShapeRange(currVariant.shape), currVariant.getNameForFancyLayout, customization.getView(v), currVariant)
        
                    ' Prüfen, ob alle Designs diese Variante besitzen.
                    ' Wenn nicht, dann muss eine View-Dependency eingestellt werden
                    ' ---------------------------------------------------------------
                    If Not designsWithEqualVariant.count = designsToProcess.count Then
                        logger.logINFO "Nur '" & designsWithEqualVariant.count & "' von '" & designsToProcess.count & "' Designs haben die Variante: '" & currVariant.getShapeNameWithoutOtherTags & "'. Erstelle LayoutViewDependency"
                        Dim d As Integer
                        
                        ' ViewDependency für Designs mit selber Variante hinzufügen
                        For d = 1 To designsWithEqualVariant.count
                            designsPackage.addLayoutViewDependency designsPackage.getView(designsToProcess.getDesignIndex(designsWithEqualVariant.getDesign(d))), currVariantView
                        Next d
                        
                    Else
                        logger.logINFO "Alle Designs haben die Variante: '" & currVariant.getShapeNameWithoutOtherTags & "'"
                    End If
                    ' ---------------------------------------------------------------
                    
                    customization.addLayoutViewDependency customization.getView(v), currVariantView
        
                    Set currVariantView = Nothing
                    Set currVariant = Nothing
                Next va
        
                variantPackage.finish
                
SkipVariant:
                Set variantPackage = Nothing
                Set currVariantGroup = Nothing
                Set currVariantGroupWithoutDuplicates = Nothing
                .setStepsProgress vg
            Next vg
            .finishProgress
        End With
        
        Set variants = Nothing
    
    Next v
    
    progress.setStepsProgress 3
    ' ================================================
    
    ' Bei einem Design gibt es kein Package für das Design
    If Not designsPackage Is Nothing Then designsPackage.finish
    customization.finish
    
    progress.finishProgress
    
    If Not debug_zipping_off Then
        Globals.deleteFolder ConfiHelper.designFiles.sizeFolder.getFancyCustomizationZIPTempPath(longCustomizationID, exportName)
    End If
    
    logger.removeTab
End Function


' Erzeugt eine FancyExportView, hängt die Exportformen an, verarbeitet sie und fügt sie dem Package hinzu.
' Gibt die erstellte View zurück, damit der Aufrufer noch View-Dependencies verdrahten kann.
Private Function buildExportView(package As FancyExportPackage, cView As ConfiView, index As Integer, exportShapes As shapeRange, _
        Optional title As String, Optional customizationView As FancyExportView, Optional varia As variante) As FancyExportView
    
    Dim view As New FancyExportView
    view.init package, cView, index, logger, title, customizationView, varia
    
    view.addExportShapes exportShapes, logger
    view.process
    package.addView view
    
    Set buildExportView = view
End Function


Private Function getConfiExportForDesign(design As productDesign, ByVal index As Integer, viewSettings As ConfiPartToViewSortInstruction) As ConfiExport
    
    logger.addTab , "[FancyExport.getConfiExportForDesign] design: '" & design.getProductID & "'"
    
    If Not confiExportForDesign.Exists(design) Then
        logger.logINFO "- ConfiExport für Design exestiert noch nicht und wird erstellt"
        Dim newConfiExport As ConfiExport
        Set newConfiExport = ConfiHelper.createConfi(design, index, viewSettings)
        confiExportForDesign.add design, newConfiExport
        
        convertConfiExportPartsForFancyExport newConfiExport
    Else
        logger.logINFO "- ConfiExport für Design exestiert"
    End If
    
    Set getConfiExportForDesign = confiExportForDesign(design)
    logger.logINFO "- ConfiExport.prepareForExport: '" & getConfiExportForDesign.prepareForExport & "'"
    
    logger.removeTab
End Function


Public Function convertConfiExportPartsForFancyExport(confiEx As ConfiExport)
    confiEx.views.convertForFancyExport
End Function


' Wichtig: Die 'productIDSuffix' muss im ersten Subjob enthalten sein
Private Function getDefaultGroundPlateAndDesignersSelectionName(groundPlate As shape) As collection
    
    
    Set getDefaultGroundPlateAndDesignersSelectionName = New collection
    
    For i = 1 To PlaceFile.groundPlateVariantGroups.count
        For j = 1 To PlaceFile.groundPlateVariantGroups(i).count
            Dim currentJob As PlaceFileJob: Set currentJob = PlaceFile.groundPlateVariantGroups(i).item(j)
'            MsgBox "Compare " & groundPlate.name & " with " & currentJob.subJobs(1).shapeName
            If InStr(groundPlate.name, currentJob.subJobs(1).shapeName) Then
                getDefaultGroundPlateAndDesignersSelectionName.add PlaceFile.groundPlateVariantGroups(i).item(1) 'Das erste in der Variantengruppe ist der Standart der ganzen
                getDefaultGroundPlateAndDesignersSelectionName.add currentJob.subJobs(1).productIDSuffix ' Die Grundplatten-Wahl des Designers
'                MsgBox "Found GroundplateJob for " & groundPlate.name & ", Jobname=" & currentJob.name & ", JobshapeName=" & currentJob.subJobs(1).shapeName & ", JobProductID=" & currentJob.subJobs(1).productIDSuffix
                Exit Function
            End If
        Next j
    Next i
    
    

End Function



Private Function addQRCodeElement(shape As shape)
    

    If Not qrCodesNotSupportedInV2WarningShowed Then
        MsgBox "QR-Codes werden für den Fancy-Export-V2 noch nicht unterstützt", vbExclamation
        qrCodesNotSupportedInV2WarningShowed = True
    End If
    
End Function



Private Function doubleToString(ByVal theDouble As String) As String
    If Not theDouble = "" Then
        doubleToString = CStr(round(theDouble, 4))
    End If
    
End Function



' Gibt die Breite und Höhe zurück in dem die Rotation des Shape zurückgesetzt wird und dann die Maße zurückgegeben werden
Private Function getSizeOfRotatedShape(shape As shape) As Double()
    
    'MsgBox "shape=" & shape.name
    
    Dim result() As Double
    ReDim result(2) As Double
    
    result(1) = 0
    result(2) = 0
    
    
    If shape.RotationAngle = 0 Then
        result(1) = shape.SizeWidth()
        result(2) = shape.SizeHeight()
    Else
        'Dim previousSelection As ShapeRange
        'previousSelection = ActiveSelectionRange
        
        'shape.CreateSelection
        Dim shapeCopy As shape
        'shape.copy 'TODO
        
        Set shapeCopy = shape.CopyToLayer(shape.layer)
        
        
        shapeCopy.rotate -shapeCopy.RotationAngle
        
        result(1) = shapeCopy.SizeWidth
        result(2) = shapeCopy.SizeHeight
        
        shapeCopy.delete
    End If
    
    
    
    getSizeOfRotatedShape = result
End Function



Public Sub TestPutOnMainMaskShapes()
    
    If ActiveSelectionRange.count > 0 Then
        
        
        Dim design As New productDesign
        design.newProductDesign ActiveSelectionRange.firstShape
        
        Dim putOnMaskShape As shapeRange
        Set putOnMaskShape = design.newCustomShapeTypeQuery(Globals.customShapeType.putOnMaskShape).search
        
        MsgBox Globals.getShapeRangeDisplayNames(putOnMaskShape)
        
    End If
    
End Sub




Public Sub TestMakeUploadBoxWhite()
    
    Dim uploadBoxPhoto As shape
    Set uploadBoxPhoto = Globals.getPhotoOfUploadBoxGroup(ActiveSelection)
    
    Dim uploadBoxPhotoOld As shape
    Set uploadBoxPhotoOld = uploadBoxPhoto
    
    Set uploadBoxPhoto = Globals.copyPasteShape(uploadBoxPhoto, True)
    
    uploadBoxPhoto.Style.StringAssign "{""StackedBitmapEffects"":{""BCIEffect"":{""Brightness"":""100"",""Contrast"":""0"",""Intensity"":""0""},""BCIEffect_Z_Index"":""0"",""BCIEffect_Deleted"":""0""}}"
    
    uploadBoxPhotoOld.delete
End Sub


Public Sub MarkShapeAsBitmapInFancy()
    Globals.markSelectedShapes Globals.getBitmapInFancyKeyWord
End Sub


Public Sub MarkShapeAsForFancy()
    Globals.markSelectedShapes Globals.getForFancyKeyWord
End Sub

Public Sub MarkShapeAsSVGInFancy()
    Globals.markSelectedShapes Globals.getSVGInFancyKeyWord
End Sub


Public Sub TestExportSVG()
    
    Dim shapes As shapeRange
    Set shapes = ActiveSelectionRange
    
    newShapeExport(shapes, Globals.getDesktopPath & "SVG Test", cdrSVG) _
        .setColorizeRDGWhiteToRGB(False) _
        .setColorizeCMYKBlackToRGB(False) _
        .export
    
End Sub


Public Sub ApplyKonfiPaddingToShape()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    Dim shape As shape
    Set shape = ActiveShape
    shape.SetSizeEx shape.centerX, shape.centerY, _
        shape.SizeWidth / CONFI_DEFAULT_WIDTH * (CONFI_DEFAULT_WIDTH - CONFI_PADDING), _
        shape.SizeHeight / CONFI_DEFAULT_HEIGHT * (CONFI_DEFAULT_HEIGHT - CONFI_PADDING)
    
End Sub

    

Public Sub TestFancyExportJSONImageElement()
    Globals.endIfNoDocumentOpen

    With New FancyExportJSONImageElement
        .init newShapeExport(ActiveLayer.CreateRectangle(0, 10, 10, 0), Globals.getDesktopPath & "TestFancyExportJSONImageElement", cdrPNG)
    End With
End Sub

