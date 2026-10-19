Attribute VB_Name = "AmazonExport"


' Autor:  Martin Afelt GRAVURU
'

Private logger As logger

Dim qrCodeAsVariant As Boolean

Dim konfiCanvas As shape

Dim previousResolution As Long
Dim exportMaskOnlyOnDefaultDesign As Boolean
Dim previewImageZoomed As Boolean


Sub Show()
    Globals.showWarnings
    
    ' Vor dem Exportieren die ausgewählten Designs mit dem Fehler-Fixer prüfen (Wenn eingestellt)
    If GlobalSettingsUserForm.getSetting_RunFehlerFixerBeforeExport Then
        ErrorFixer.CorrectDesigns
    End If
    
    AmazonExportDialog.init
    AmazonExportDialog.Show vbModal
End Sub






Public Sub Start(ByVal exportPath As String, runFolderPath As String, viewSettings As ConfiPartToViewSortInstruction, exportMaskOnlyOnDefaultDesignVar As Boolean, qrCodeAsVariantVar As Boolean, focusedLayerIndex As Integer, automaticGroundplateVariants As Boolean, _
    exportSimpleFolderIconWhenGraving As Boolean, previewImageZoomedVar As Boolean, exportLook As Boolean)
    
    Set logger = newLogger("AmazonExport")
    logger.addTab , "[AmazonExport.Start]"
    
    Globals.startMacro
    
    If Not Globals.debugHistory Then
        ActiveDocument.BeginCommandGroup "AmazonExport"
        If Not Globals.debugErrors Then On Error GoTo MacroError
    End If
    
    
    If runFolderPath = "" Then
        startFunction exportPath, viewSettings, exportMaskOnlyOnDefaultDesignVar, qrCodeAsVariantVar, focusedLayerIndex, automaticGroundplateVariants, exportSimpleFolderIconWhenGraving, previewImageZoomedVar, exportLook, logger
    Else
        startFunctionRunFolder exportPath, runFolderPath, viewSettings, exportMaskOnlyOnDefaultDesignVar, qrCodeAsVariantVar, focusedLayerIndex, automaticGroundplateVariants, exportSimpleFolderIconWhenGraving, previewImageZoomedVar, exportLook, logger
    End If
   
    
    
    GoTo Finally
MacroError: 'Alle Fehler hier abfangen und die CommandGruppe beenden, damit man mit einem Schritt zurück gehen kann (STRG + Z), auch wenn ein Fehler aufgetreten ist
    MsgBox Err.Description & ", " & Err.number, vbCritical
Finally:
    Globals.endMacro True
    If Not Globals.debugHistory Then
        
        ' Dokument zurücksetzen
        If GlobalSettingsUserForm.getSetting_ResetDocAfterExport Then
            If Not ActiveDocument Is Nothing Then ActiveDocument.Undo
        End If
    End If
    ActiveDocument.Dirty = False ' Nicht speicherbar machen
    logger.removeTab
End Sub



Public Function startFunctionRunFolder(ByVal exportPath As String, runFolderPath As String, viewSettings As ConfiPartToViewSortInstruction, exportMaskOnlyOnDefaultDesignVar As Boolean, qrCodeAsVariantVar As Boolean, focusedLayerIndex As Integer, automaticGroundplateVariants As Boolean, _
    exportSimpleFolderIconWhenGraving As Boolean, previewImageZoomedVar As Boolean, exportLook As Boolean, logger_ As logger)
    
    ' Kann auch von einem Skript außerhalb gesetzt werden
    Set logger = logger_
    
    logger.addTab , "[AmazonExport.startFunctionRunFolder]"
    
    ' Ordner durchlaufen und CDR's exportieren
    Dim cdrs As collection
    Set cdrs = Globals.getDesignCDRs(runFolderPath)
    
    
    With ProgressBarUserForm.newSubProgress(cdrs.count)
        Dim i As Integer
        For i = 1 To cdrs.count
            .setDisplayText "CDR " & cdrs(i)
            
            OpenDocument cdrs(i)
            
            ' Globals.STRUCTURE_PATH verhindert, dass man aus versehen alle CDRs in einen Ordner exportiert
            startFunction Globals.STRUCTURE_PATH, viewSettings, exportMaskOnlyOnDefaultDesignVar, qrCodeAsVariantVar, focusedLayerIndex, automaticGroundplateVariants, exportSimpleFolderIconWhenGraving, previewImageZoomedVar, exportLook, logger_
                
            ActiveDocument.Close
            .setStepsProgress i
        Next i
        .finishProgress
    End With
    
    logger.removeTab
End Function



Public Function startFunction(ByVal exportPath As String, viewSettings As ConfiPartToViewSortInstruction, exportMaskOnlyOnDefaultDesignVar As Boolean, qrCodeAsVariantVar As Boolean, focusedLayerIndex As Integer, automaticGroundplateVariants As Boolean, _
    exportSimpleFolderIconWhenGraving As Boolean, previewImageZoomedVar As Boolean, exportLook As Boolean, logger_ As logger)
    
    ' Kann auch von einem Skript außerhalb gesetzt werden
    Set logger = logger_
    
    logger.addTab , "[AmazonExport.startFunction]"
    
    If exportPath = Globals.STRUCTURE_PATH Then
        exportPath = newFSSizeFolder(, , ActiveDocument).resolveStructurePathForAmazonExport
    End If
    
    logger.logINFO "exportPath: '" & exportPath & "', exportMaskOnlyOnDefaultDesignVar: '" & exportMaskOnlyOnDefaultDesignVar & "', qrCodeAsVariantVar: '" & qrCodeAsVariantVar & _
        "', focusedLayerIndex: '" & focusedLayerIndex & "', automaticGroundplateVariants: '" & automaticGroundplateVariants & "', exportSimpleFolderIconWhenGraving: '" & exportSimpleFolderIconWhenGraving & _
        "', previewImageZoomedVar: '" & previewImageZoomedVar & "', exportLook: '" & exportLook & "'"
    
    exportMaskOnlyOnDefaultDesign = exportMaskOnlyOnDefaultDesignVar
    qrCodeAsVariant = qrCodeAsVariantVar
    previewImageZoomed = previewImageZoomedVar
    
    previousResolution = ActiveDocument.resolution
    ActiveDocument.resolution = 72
    
    
    Dim designsToProcess As ProductDesignRange
    Set designsToProcess = Globals.getSelectedDesignsOrAllAsRange(onlyValidDesigns:=True)
    
    ' Folder-Bilder unbedingt vor dem übertragen des Masterdesigns machen, da dieser manchmal eine Konfi-Maske und oder Hintergrund hat, welches dann das Design verdeckt
    ConfiHelper.focusedLayerIndex = focusedLayerIndex ' Wird in der 'ConfiHelper.createDesignsSnapshots' benötigt
    
    Globals.transferMasterDesignToDesignsIfFound designsToProcess, AmazonExportType, logger
    
    ConfiHelper.init exportPath, amazon, focusedLayerIndex, exportLook, exportSimpleFolderIconWhenGraving, automaticGroundplateVariants, getAmazonKonfiSize, getAmazonKonfiSize, "", logger, _
        getAmazonKonfiPadding, getAmazonKonfiPadding, getAmazonKonfiPadding, getAmazonKonfiPadding
    
    ' Vorschaubilder erst nach dem ConfiHelper.init erstellen
    ConfiHelper.createDesignsSnapshots designsToProcess
    
    logger.logINFO "designsToProcess.Count: " & designsToProcess.count
    
    
    If designsToProcess.count = 0 Then
        logger.logWARN "Keine Designs zum exportieren vorhanden!"
    End If
    
    
    
    
    With ProgressBarUserForm.newSubProgress(designsToProcess.count)
    
        ' Design sind aus der Auswahl "selection" aussortiert, damit die Progressbar nur die echten Designs anzeigt
        For i = 1 To designsToProcess.count
            
            Dim currentDesign As productDesign
            Set currentDesign = designsToProcess.getDesign(i)
            
            .setDisplayText "Verarbeite Design " & i & " - " & currentDesign.getProductID
            
             Dim cExport As ConfiExport
            With ProgressBarUserForm.newSubProgress(3)
                .setDisplayText "Bereite vor"
                
                ' Alte Daten löschen (designFiles vorher setzen, createConfi setzt sie erst danach)
                ConfiHelper.setDesignFilesForDesign currentDesign
                ConfiHelper.designFiles.deleteAmazonExportFilesAllVersions ' Alle Daten aus allen Versionen löschen
           
                Set cExport = ConfiHelper.createConfi(currentDesign, i, viewSettings)
                .setStepsProgress 1
            
                .setDisplayText "Exportiere"
                processExport cExport
                .setStepsProgress 2
                
                .setDisplayText "ViewSettings speichern"
                ' Speichern, welches Part in welche View kam
                viewSettings.saveInstructionForAmazonImport ConfiHelper.designFiles
                .setStepsProgress 3
                
                .finishProgress
            End With

            
            Set cExport = Nothing
            
            .setStepsProgress i
            
            Set currentDesign = Nothing
        Next i
    
        .finishProgress
    End With
    
    
    ActiveDocument.resolution = previousResolution
    
    logger.removeTab
    
End Function




Private Function processExport(cExport As ConfiExport)
    
    With ProgressBarUserForm.newSubProgress(cExport.getViewCount)
        For v = 1 To cExport.getViewCount
            
            .setDisplayText "Verarbeite View " & v
            
            processView cExport, cExport.getView(v)
            
            .setStepsProgress v
        Next v
        .finishProgress
    End With
End Function


Public Sub TestRemoveBleedOfDesign()

    If Not ActiveShape Is Nothing Then
        If ActiveShape.Type = cdrGroupShape Then

            Dim design As New productDesign
            design.newProductDesign ActiveShape

            If design.isValidProductDesign Then
                For i = 1 To design.getLayers.count
                    design.getLayer2(i).removeBleed
                Next i
            End If

        End If

    End If

End Sub


Private Function processView(cExport As ConfiExport, view As ConfiView)
    
    processLayersInView view, view.parts, view.layersFlattened, view.shapeRangeForViewFitting, ConfiHelper.design, view.focusedLayersOfParts
End Function



Public Sub TestFindMainMask()
    
'    Dim layerShape As shape
    
    If Not ActiveShape Is Nothing Then
        
'        Set layerShape = ActiveShape
        
        Dim mainMaskShape As shape
        Set mainMaskShape = newCustomShapeTypeQuery(ActiveShape.shapes.All, mainMask).search.firstShape
        
        MsgBox "MainMask: " & (Not mainMaskShape Is Nothing)
    End If
    
End Sub


Public Function processLayersInView(view As ConfiView, parts As ProductDesignPartRange, productDesignLayers As ProductDesignLayerRange, shapeRangeForViewFitting As shapeRange, _
    productDesign As productDesign, focusedLayers As collection)
    
    Dim subProgressObj As SubProgress
    Set subProgressObj = ProgressBarUserForm.newSubProgress(8)
    
    logger.logINFO "[AmazonExport.processLayersInView]"
    logger.addTab
    
    
    ' Weiße Form für den Export erstellen
    Set konfiCanvas = ActiveLayer.CreateRectangle(0, 0, confiWidth, confiHeight)
    konfiCanvas.fill.ApplyUniformFill CreateRGBColor(255, 255, 255) ' Weiß
    konfiCanvas.outline.Type = cdrNoOutline
    konfiCanvas.name = "konfiCanvas"
    konfiCanvas.OrderToBack
    
    Dim currentLayer As ProductDesignLayer
    
    ' Muss gemacht werden, da die Grundplattenvarianten an dieser Stelle ungültig sind (schwer herauszufinden, ab wann und welcher Code das macht)
    For i = 1 To focusedLayers.count
        Set currentLayer = focusedLayers(i)
        currentLayer.invalidateVariantType GroundplateVariantType
        Set currentLayer = Nothing
    Next i
    
    
    
    
    ' Varianten der fokusierten Schicht vorher unsichtbar machen, da sie beim erstellen der Hauptmaske stören (Allgemein auch)
    logger.logINFO "Amazon: Varianten der fokusierten Schicht vorher unsichtbar machen"
    For f = 1 To focusedLayers.count
        
        Set currentLayer = focusedLayers(f)
        
        Dim currentLayerStaticVariantsShapes As shapeRange
        Set currentLayerStaticVariantsShapes = currentLayer.getVariantsOfType(variantType.StaticVariantType).allVariantsShapes
    
        For i = 1 To currentLayerStaticVariantsShapes.count
            Dim currentVariantShape As shape
            
            Set currentVariantShape = currentLayerStaticVariantsShapes(i)
            currentVariantShape.visible = False
            
            Set currentVariantShape = Nothing
        Next i
        
        Set currentLayer = Nothing
        Set currentVariantGroup = Nothing
    Next f
    
    
    
    
    
    
    ' Maske / mainMask (maskImage)
    ' --------------
    logger.logINFO "Hauptmaske exportieren"
    subProgressObj.setDisplayText "Hauptmaske exportieren"
    
    Dim mainMask As shape
    Dim firstLayer As ProductDesignLayer: Set firstLayer = productDesignLayers.getLayer(1)
    Set mainMask = firstLayer.newCustomShapeTypeQuery(Globals.customShapeType.mainMask).setRecursive(False).search.firstShape
    
    exportMainMask mainMask, productDesignLayers, focusedLayers, productDesign, view
    
    logger.logINFO "- Fertig mit Hauptmaske"
    logger.logINFO ""
    subProgressObj.setStepsProgress 1
    ' ---------------------------------
    
    
    
    
    ' Baseimage
    ' -------------------------------------------------------------------------------------------------
    logger.logINFO "BaseImage exportieren"
    subProgressObj.setDisplayText "BaseImage exportieren"
    ' Auf dem baseImage die erste Grundplatte anzeigen (Varianten bekommen eigene Bilder)
    For i = 1 To focusedLayers.count
        focusedLayers(i).activateGroundPlateVariant 1, False, logger
    Next i

    ' Achtung. hier wird das Design auf Fancygröße zugeschnitten
    exportBaseImage konfiCanvas, focusedLayers, False, view.index
    subProgressObj.setStepsProgress 2
    ' -------------------------------------------------------------------------------------------------
    
    
    
    
    
    
    
    
    ' Design Bilder
    ' -------------------------------------------------------------------------------------------------
    '
    ' Gucken ob fokusierte Layer Grundplatten-Varianten haben
    ' und ob die Varianten die gleichen bei mehreren fokusierten Layern sind.
    ' ==================================================================================
    subProgressObj.setDisplayText "Design exportieren"
    Dim focusedLayersHaveGroundplateVariants As Boolean
    Dim focusedLayersHaveUnevenGroundplateVariants As Boolean
    Dim focusedLayerWithGroundplateVariants As ProductDesignLayer ' Zum orientieren
    
    For i = 1 To focusedLayers.count
        Set currentLayer = focusedLayers(i)
        If currentLayer.getVariantsOfType(GroundplateVariantType).allVariants.count > 1 Then
            focusedLayersHaveGroundplateVariants = True
            Set focusedLayerWithGroundplateVariants = currentLayer
            
            ' Bei mind. 2 fokusierten Schichten rückwärts bei den vorherigen Schichten vergleichen
            If Not i = 1 Then
                For j = i - 1 To 1 Step -1
                    
                    
                    If focusedLayers(j).getVariantsOfType(GroundplateVariantType).allVariants.count > 1 And currentLayer.getVariantsOfType(GroundplateVariantType).allVariants.count > 1 Then
                        If Not focusedLayers(j).getVariantsOfType(GroundplateVariantType).allVariants.count = focusedLayers(i).getVariantsOfType(GroundplateVariantType).allVariants.count Then
                            focusedLayersHaveUnevenGroundplateVariants = True
                        End If
                    End If
                Next j
            End If
        End If
    Next i
    ' ==================================================================================
    
    
    ' Warnung & Abbruch, wenn Grundplatten von Teilen in der selben View nicht gleich sind
    If focusedLayersHaveGroundplateVariants Then
        If focusedLayersHaveUnevenGroundplateVariants Then
            MsgBox "Die einzelnen Teile des Designs haben unterschiedliche Grundplattenvarianten und sollen in die selbe View." & _
            "Ein Export ist nur möglich mit gleichen Grundplattenvarianten oder in getrennten Views." & _
            "Denn die Teile teilen sich in der View eine Dropdownfeld und müssen deshalb identische Grundplattenvarianten haben", vbCritical
            Globals.endMacro
        End If
    End If
    
    
    'Design einzeln als PNG exportieren (Für die Designauswahl als Dropdown) mit Grundplattenvariante
        
    
    ' Da oben geprüft wurde ob alle 'focusedLayers' die selben Grundplattenvarianten haben, können wir hier alle Layer Grundplattentechnisch gleich behandeln
    Dim groundPlateVariants As VariantArray
    Set groundPlateVariants = focusedLayers(1).getVariantsOfType(GroundplateVariantType)
    
    
    ' Einmal ohne Grundplattenvariante exportieren
    currentLayer.activateGroundPlateVariant 1, True
    exportDesign focusedLayers, konfiCanvas, False, 1, view.index
    
    ' Nur wenn mehrere Grundplatten da sind, auch mit Grundplatten als Variante exportieren
    If groundPlateVariants.allVariants.count > 1 Then
        With ProgressBarUserForm.newSubProgress(groundPlateVariants.allVariants.count)
            For v = 1 To groundPlateVariants.allVariants.count
                
                .setDisplayText "Design mit Grundplattenvariante " & v & " exportieren"
                
                ' Aktuelle Grundplattenvariante aktivieren
                If groundPlateVariants.allVariants.count > 1 Then
                    For i = 1 To focusedLayers.count
                        Set currentLayer = focusedLayers(i)
                        currentLayer.activateGroundPlateVariant (v), True
                        Set currentLayer = Nothing
                    Next i
                End If
                
                exportDesign focusedLayers, konfiCanvas, groundPlateVariants.allVariants.count > 1, (v), view.index
                .setStepsProgress v
            Next v
            
            .finishProgress
        End With
    End If
    Set currentLayer = Nothing
    
    subProgressObj.setStepsProgress 3
    ' ------------------------------------------------------------------------------------
    
    
    
    
    
    ' Statische Varianten (der fokusierten Schicht (z.B: Bohrlöcher))
    ' ------------------------------------------
    Dim variantsGroups As collection
    subProgressObj.setDisplayText "Statische Varianten exportieren"
    With ProgressBarUserForm.newSubProgress(productDesignLayers.count)
        
        For i = 1 To productDesignLayers.count
            Set currentLayer = productDesignLayers.getLayer(i)
            
            .setDisplayText "Verarbeite Layer " & i
            
            Set variantsGroups = currentLayer.getStaticVariantGroups
            
            For g = 1 To variantsGroups.count
                For j = 1 To variantsGroups(g).variants.count
                    Dim variantee As variante
                    Set variantee = variantsGroups(g).variants.item(j)
                    variantee.shape.visible = True
                    
                    exportStaticVariant variantee, konfiCanvas, currentLayer, Globals.collectionContainsOBJ(focusedLayers, currentLayer), view.index
                    
                    variantee.shape.visible = False
                    Set variantee = Nothing
                Next j
            Next g
            
            
            Set variantsGroups = Nothing
            Set currentLayer = Nothing
            .setStepsProgress i
        Next i
        .finishProgress
    End With
    
    subProgressObj.setStepsProgress 4
    ' ------------------------------------------
    
    
    
    ' QR-Codes
    ' --------
    subProgressObj.setDisplayText "QR-Codes exportieren"
    If qrCodeAsVariant And firstLayer.getPart.getDesign.isMainDesign Then
        Dim qrCodes As New shapeRange
        
        For i = 1 To focusedLayers.count
            qrCodes.AddRange newCustomShapeTypeQuery(focusedLayers(i).layerShape.shapes.All, qrCode).search
        Next i
        
        If qrCodes.count > 0 Then
            exportQRCodeAsVariant focusedLayers, konfiCanvas, qrCodes, view.index
        End If
    End If
    
    subProgressObj.setStepsProgress 5
    ' ------------------------------------------

    
    
    ' Schicht Varianten
    ' (Schichten die Varianten sind)
    ' ------------------------------------------
    subProgressObj.setDisplayText "Schichtvarianten exportieren"
    exportLayerVariants productDesignLayers, focusedLayers, mainMask, konfiCanvas, view.index
    subProgressObj.setStepsProgress 6
    ' ------------------------------------------
    
    
    
    ' Designvarianten
    ' ------------------------------------------
    subProgressObj.setDisplayText "Designvarianten exportieren"
    exportDesignVariants focusedLayers, konfiCanvas, view.index
    subProgressObj.setStepsProgress 7
    ' ------------------------------------------
    
    
    
    
    ' Uploadbox Koordinaten in Textdatei speichern,
    ' damit man diese beim erstellen eines Konfis eingeben kann, anstatt diese per Hand ungenau zu platzieren
    ' ---------------------------------------------------------
    subProgressObj.setDisplayText "Uploadbox Koordinaten exportieren"
    exportUploadboxInfos focusedLayers, view.index
    subProgressObj.setStepsProgress 8
    ' ---------------------------------------------------------
    
    ' Export der Bilder abgeschlossen. Weiße Form kann gelöscht werden
    konfiCanvas.delete
    
    subProgressObj.finishProgress
    logger.removeTab
    
    Exit Function
VariantCutByFocusedLayerMainShapeError:
    Err.Raise Err.number, Err.source, Err.Description, Err.HelpFile, Err.HelpContext
intersectError1:
    Err.Raise Err.number, Err.source, "[FancyExport.processLayersInView] Fehler beim zuschneiden der Layer auf Konfigröße: " & Err.Description, Err.HelpFile, Err.HelpContext
SubtractShapeError1:
    Err.Raise Err.number, Err.source, "[FancyExport.processLayersInView] Fehler beim zuschneiden der Layer für die Maske: " & Err.Description, Err.HelpFile, Err.HelpContext
End Function





Private Function exportDesignVariants(focusedLayers As collection, konfiCanvas As shape, viewIndex As Integer)
    
    ' TODO als Einstellung in GUI machen (vmtl. meinte ich damit, dass man festlegen kann, ob Varianten bei mehreren Parts in einer View im Konfi gleichzeitig geänder werden können oder epr Part)
    Dim designVariantsAreEqual As Boolean
    designVariantsAreEqual = Globals.areVariantsOfLayersEqual(focusedLayers, DesignElementVariantType)
    
    Dim currentLayer As ProductDesignLayer
        
    ' Wenn alle fokusierten Layer dieser View die selben DesignVariantenGruppen haben, muss nur der erste zusammen mit den Anderen exportiert werden ??!?
    ' Wenn nicht alle fokusierten Layer dieser View die selben DesignVariantenGruppen haben, dann wird jede Designvariante exportiert
    For i = 1 To IIf(designVariantsAreEqual, 1, focusedLayers.count)
        Set currentLayer = focusedLayers(i)

        Dim lastDesignVariantNr As Integer
        Dim currentDesignVariantChildIndex As Integer

        For k = 1 To currentLayer.getVariantsOfType(DesignElementVariantType).allVariants.count

            Dim currentVariante As variante
            Set currentVariante = currentLayer.getVariantsOfType(DesignElementVariantType).getVariant(k)

            ' Nummer der DesignGruppe und Nummer des Childs davon ermitteln
            Dim designVariantNr As Integer
            designVariantNr = currentVariante.designElementVarianteGroupNr

            currentDesignVariantChildIndex = currentVariante.variantName


            Dim designVariantRange As New shapeRange

            currentVariante.shape.visible = True
            designVariantRange.add currentLayer.getVariantsOfType(DesignElementVariantType).allVariants(k).shape

            If designVariantsAreEqual Then
                ' Andere Layer, die ja die gleichen DesignVaraintenGruppen haben mitexportieren
                For n = 2 To focusedLayers.count
                    Dim sameVarianteOfOtherLayer As variante
                    Set sameVarianteOfOtherLayer = focusedLayers(n).getVariantsOfType(DesignElementVariantType).getVariant(k)
                    sameVarianteOfOtherLayer.Activate
                    designVariantRange.add sameVarianteOfOtherLayer.shape
                    Set sameVarianteOfOtherLayer = Nothing
                Next n
            End If

            Globals.makeShapeInvisibleForExport konfiCanvas ' Unsichtbar machen. Wird als Hintergrund benötigt (Damit die Größe stimmt)

            logger.logINFO "designVariantRange: " & Globals.shapeRangeToString(designVariantRange)


            ' Bei Gravur die Designvarianten schwarz färben
            ' --------------------------------------
            Dim previewRange As shapeRange
            Dim deleteAtEnd As New shapeRange
            If currentLayer.isGraving Then
                Set previewRange = Globals.copyPasteShapeRange(designVariantRange)
                Globals.setShapeRangeColor previewRange, CreateColor("000000"), Nothing ' Schwarz färben
                deleteAtEnd.AddRange previewRange
            Else
                Set previewRange = designVariantRange
            End If
            ' --------------------------------------
            
            
            ' Vorschaubild der Designvariante exportieren
            newShapeExport(previewRange, ConfiHelper.designFiles.getAmazonExportDesignVariantPreviewImagePath(currentVariante), cdrJPEG) _
                .setResolutionX(72) _
                .setResolutionY(72) _
                .setWidth(400) _
                .setHeight(400) _
                .export logger
            
            
            Set designVariantRange = Globals.flattenShapeRange(designVariantRange, , , False)
            Set designVariantRange = newCustomShapeTypeQuery(designVariantRange, ValidForAmazonConfiExportShapeType).setRecursive(True).search(logger)


            ' Designvarianten Bild exportieren
            designVariantRange.add konfiCanvas
            
            newShapeExport(designVariantRange, ConfiHelper.designFiles.getAmazonExportDesignVariantPath(currentVariante), cdrPNG) _
                .setResolutionX(72) _
                .setResolutionY(72) _
                .setBoundingBoxShape(ConfiHelper.confiBoundingBox) _
                .setBoundingBoxDefinesOrigin(True) _
                .export logger
            
            
            deleteAtEnd.delete
            Set deleteAtEnd = Nothing
            Set previewRange = Nothing
            Set currentVariante = Nothing
            Set designVariantRange = Nothing
            lastDesignVariantNr = designVariantNr
        Next k

        Set currentLayer = Nothing
    Next i
    
End Function






Private Function exportLayerVariants(productDesignLayers As ProductDesignLayerRange, focusedLayers As collection, mainMask As shape, konfiCanvas As shape, viewIndex As Integer)
    logger.addTab , "[AmazonExport.exportLayerVariants] (Schichten die eine Variante sind)"
    
    If productDesignLayers.count > 0 Then
        Dim currentLayer As ProductDesignLayer
        ' Alle anderen Schichten der View, die eine Variante sind, exportieren
        For i = 1 To productDesignLayers.count
            Set currentLayer = productDesignLayers.getLayer(i)
            
            Dim currentLayerIsFocused As Boolean
            currentLayerIsFocused = Globals.isCollectionHavingValue(focusedLayers, currentLayer)
            
            ' FocusedLayer wurde oben schon verarbeitet
            If Not currentLayerIsFocused And currentLayer.isLayerVariant Then
        
                Dim range As New shapeRange
                
    '            If Not currentLayer.isEmptyVariant Then
    '                On Error GoTo VariantCutByFocusedLayerMainShapeError
    '                Globals.subtractShapeWithShapeRange focusedLayer.getMainShape, currentLayer.layerShape.shapes.All, True, False
    '                On Error GoTo 0
    '            End If
    
                range.AddRange Globals.getValidShapesFor(currentLayer.layerShape, False, False, True, True, True)
                
                'Diese Variante muss vor der Hauptmaske sein, da Varianten nicht aus der Hauptmaske ausgeschnitten werden
                mainMask.OrderBackOf currentLayer.layerShape
                
                range.add mainMask
                
                Globals.makeShapeInvisibleForExport konfiCanvas 'Unsichtbar machen. Wird als Hintergrund benötigt, damit die FotoMaske die Größe des Konfis hat beim export. Nicht nur die Größe der Grundplatte
                range.add konfiCanvas
                
                newShapeExport(range, ConfiHelper.designFiles.getAmazonExportVariantPath(currentLayer.getVariant, viewIndex), cdrPNG) _
                    .setWidth(400) _
                    .setHeight(400) _
                    .setResolutionX(72) _
                    .setResolutionY(72) _
                    .export logger
                
                Set range = Nothing
            End If
            
            currentLayerIsFocused = False
            Set currentLayer = Nothing
        Next i
        
    End If
    
    logger.removeTab
End Function



Private Function exportUploadboxInfos(focusedLayers As collection, viewIndex As Integer)
    Dim uploadBoxInfo As String
    For i = 1 To focusedLayers.count
        
        Set currentLayer = focusedLayers(i)
        
        Dim uploadBoxes As shapeRange
        Set uploadBoxes = currentLayer.getUploadBoxes
        
        
        If uploadBoxes.count > 0 Then
            uploadBoxInfo = uploadBoxInfo & "Part " & currentLayer.getPartIndex & ", Layer " & currentLayer.getLayerIndex & ": " & vbNewLine
        End If
        
        For u = 1 To uploadBoxes.count
            Dim currentUploadBoxCurve As curve
            Set currentUploadBoxCurve = Globals.getUploadboxBoundingShapeCurve(uploadBoxes(u))
            
            Dim x, y, w, h As Integer
            x = round(ActiveDocument.FromUnits(currentUploadBoxCurve.boundingBox.x, cdrPixel))
            '           vv Y ist invertiert
            y = round(AmazonExport.getAmazonKonfiSize - ActiveDocument.FromUnits(currentUploadBoxCurve.boundingBox.y + currentUploadBoxCurve.boundingBox.height, cdrPixel))
            w = round(ActiveDocument.FromUnits(currentUploadBoxCurve.boundingBox.width, cdrPixel))
            h = round(ActiveDocument.FromUnits(currentUploadBoxCurve.boundingBox.height, cdrPixel))
            
            uploadBoxInfo = uploadBoxInfo & vbTab & _
                "X: " & x & _
                ", Y: " & y & _
                ", Breite: " & w & _
                ", Höhe: " & h & _
                ", Zuschnitt: " & Globals.isUploadBox(uploadBoxes(u), BoundedUploadBoxType) & _
                vbNewLine
            
            Set currentUploadBoxCurve = Nothing
        Next u
        
        If uploadBoxes.count > 0 Then
            uploadBoxInfo = uploadBoxInfo & vbNewLine
        End If
        
        Set uploadBoxes = Nothing
        Set currentLayer = Nothing
    Next i
    
    If Not uploadBoxInfo = "" Then
        ConfiHelper.designFiles.saveAmazonExportUploadBoxesInfoFile uploadBoxInfo, viewIndex
    End If
End Function




Private Function exportMainMask(mainMask As shape, productDesignLayers As ProductDesignLayerRange, focusedLayers As collection, productDesign As productDesign, view As ConfiView)
    
    Dim currentLayer As ProductDesignLayer
    
    ' Gucken, ob die View Layer hat, die Varianten sind (viewHasLayersAsVariants)
    Dim viewHasLayersAsVariants As Boolean
    For i = 1 To productDesignLayers.count
        Set currentLayer = productDesignLayers.getLayer(i)
        If currentLayer.isLayerVariant Then
            viewHasLayersAsVariants = True
            GoTo found
        End If
        Set currentLayer = Nothing
    Next i
found:
    ' Wenn es Schichten gibt, die eine Variante sind (z.B: ein Edelstahlrahmen), muss eine leere Maske exportiert werden.
    ' Die Maske wird stattdessen mit den Variantenbildern gemischt (z.B: Edelstahlrahmen-Variante mit & ohne)
    Dim emptyShape As shape
    If viewHasLayersAsVariants Then
        
        logger.logINFO "- Exportiere keine Hauptmaske, weil es Schichten gibt, die eine Variante sind"
        
    Else
    ' Keine Schichten die Varianten sind
        
        logger.logINFO "- Exportiere normale Hauptmaske"
        
        Dim range As New shapeRange
        range.add mainMask
        
        For i = 1 To productDesignLayers.count
            Set currentLayer = productDesignLayers.getLayer(i)
            
            range.AddRange productDesignLayers.getLayer(i).newCustomShapeTypeQuery(Look).search ' Look kommt mit auf die Maske
            
            Dim isFocusedLayer As Boolean
            isFocusedLayer = False ' Muss komischerweise wegen der For-Loop zurückgesetzt werden
            For j = 1 To focusedLayers.count
                If currentLayer Is focusedLayers(j) Then
                    isFocusedLayer = True
                    Exit For
                End If
            Next j
            
            ' Wenn es nicht die fokusierte Schicht ist und die Schicht keine Variante, sondern fest ist, soll sie mit auf die Maske
            If Not isFocusedLayer Then
                
                
                ' TODO viewHasLayersAsVariants schließt schon aus, dass es hier eine Schicht als Variante geben kann
'                If Not currentLayer.isLayerVariant Then
                
                ' Wenn die Schicht Varianten hat, müssen diese mit der Schicht zu einzelnen Bildern exportiert werden. Nicht aber hier
                If Not currentLayer.hasVariantsOfType(variantType.StaticVariantType) Then
                    
                    range.AddRange Globals.getValidShapesFor(currentLayer.layerShape, False, False, True, True, True)
                End If
                    
'                Else
'                    ' TODO Falls die fokusierte Ebene eine transparente Grunplatte hat und es noch Ebenen als Varianten gibt, brauchen wir hier eine Lösung
'                    ' z.B: könnte man die variablen Ebenen einzeln exportieren, immer mit der transparenten, fokusierten Grunplatte
'                End If
                
            End If
            
            Set currentLayer = Nothing
        Next i
        
        ' Abstandshalter mit auf die Maske
        Dim putOnMaskShapes As shapeRange
        ' Varianten ausschließen, da diese eigene Bilder erzeugen. Auch welche mit Varianten-Abstandshaltern
        Dim allShapesExceptVariants As shapeRange
        Set allShapesExceptVariants = productDesign.getDesignShape.shapes.All
        allShapesExceptVariants.RemoveRange newCustomShapeTypeQuery(allShapesExceptVariants, StaticVariant).search
        
        For i = 1 To productDesign.getLayers.count
            Set putOnMaskShapes = productDesign.getLayers.getLayer(i).newCustomShapeTypeQuery(Globals.customShapeType.putOnMaskShape).setContinueSearchInMatchedGroups(False).setArgument1(productDesign.getLayers.getLayer(i)).search
            logger.logFINE "- putOnMaskShapes: " & vbNewLine & Globals.collectionToMultiLineStr(Globals.shapeRangeNamesToStringCollection(putOnMaskShapes))
        Next i
        
        Set putOnMaskShapes = Globals.intersectShapeWithShapeRange(ConfiHelper.confiBoundingBox, putOnMaskShapes, True, False)
        logger.logFINE "- nach dem Zuschnitt. putOnMaskShapes: " & vbNewLine & Globals.collectionToMultiLineStr(Globals.shapeRangeNamesToStringCollection(putOnMaskShapes))
        
        
        ' Varianten der Layer invalidieren, da es häufig Varianten sind, die über die Hauptmaske sollen. Formen die über die Maske wollen, wurden soeben zugeschnitten
        For i = 1 To productDesign.getLayers.count
            productDesign.getLayer2(i).invalidateVariantType StaticVariantType
        Next i
        
        putOnMaskShapes.OrderFrontOf mainMask
        range.AddRange putOnMaskShapes
        
        logger.logINFO "    Amazon: Schreibe Datei für Hauptmaske"
        
        newShapeExport(range, ConfiHelper.designFiles.getAmazonExportMaskImagePath(view.index), cdrPNG) _
            .setResolution(72) _
            .setBoundingBoxShape(ConfiHelper.confiBoundingBox) _
            .setBoundingBoxDefinesOrigin(True) _
            .setSize(400, 400) _
            .export logger
    End If
        

    
End Function





' Der 'focusedLayers' sind die Schichten, auf der normalerweise das Design ist (Bie 2 Parts gibt es halt mehrere focusedLayers. Bei doppelten SAH z.B.). Andere Schichten enthalten eig. keine Designs.
' Es wird nur der 'focusedLayer' auf einem weißen Hintergrund exportiert
' Wenn 'justWhite' True ist, wird nur ein weißes Bild epxortiert
Private Function exportBaseImage(konfiCanvas As shape, focusedLayers As collection, justWhite As Boolean, viewIndex As Integer, Optional layerBelow As ProductDesignLayer)
    
    logger.logINFO "[AmazonExport.exportBaseImage]"
    logger.addTab
    
    ' Hintergrund (baseImage)
    ' --------------
    
    Dim range As New shapeRange
    
    If Not justWhite Then
        
        If Not layerBelow Is Nothing Then
            range.AddRange layerBelow.getValidShapesFor(False, False, True, True)
            'Die Varianten hier nicht mitexportieren. Die Varianten bekommen eigene seperate Bilder
            range.RemoveRange layerBelow.getVariantsOfType(StaticVariantType).allVariantsShapes
        End If
        
        For i = 1 To focusedLayers.count
            range.AddRange focusedLayers(i).getValidShapesFor(False, False, True, True) '(Optional forProductPicture As Boolean = False, Optional forFancyKonfi As Boolean = False, Optional forAmazonKonfi As Boolean = False)
            
            'Die Varianten hier nicht mitexportieren. Die Varianten bekommen eigene seperate Bilder
            range.RemoveRange focusedLayers(i).getVariantsOfType(StaticVariantType).allVariantsShapes
            
            ' Designvarianten auch nicht mitexportieren. Diese bekommen auch separate Bilder
            range.RemoveRange focusedLayers(i).newCustomShapeTypeQuery(DesignElementVariantShapeType).search
            
            range.RemoveRange focusedLayers(i).newCustomShapeTypeQuery(CurveWithText).search
            
            range.RemoveRange focusedLayers(i).newCustomShapeTypeQuery(DesignElementVariantShapeType).search
            
            'Shapes, die auf die Hauptmaske sollen, nicht auf das BaseImage
            range.RemoveRange focusedLayers(i).newCustomShapeTypeQuery(putOnMaskShape).setArgument1(focusedLayers(i)).search
            
        Next i
        
        ' Hauptmaske ausschließen
        range.RemoveRange newCustomShapeTypeQuery(range, mainMask).search
    End If
    
    
    
    range.add konfiCanvas
    
    ' QR-Codes ausschließen (bekommen eigene Bilder)
    range.RemoveRange newCustomShapeTypeQuery(range, qrCode).search
    
    ' baseImage Bild exportieren
    Dim filePath As String
    filePath = ConfiHelper.designFiles.getAmazonExportBaseImagePath(viewIndex)
    logger.logINFO "Exportiere baseImage nach: " & filePath
    
    newShapeExport(range, filePath, cdrJPEG) _
        .setWidth(400) _
        .setHeight(400) _
        .setResolutionX(72) _
        .setResolutionY(72) _
        .setBoundingBoxShape(konfiCanvas) _
        .setExportBoundingBox(True) _
        .export logger
    
    
    logger.removeTab
End Function







' Exportiert die Variante innerhalb einer Schicht. Das können z.B: Bohrlöcher (Befestigung) sein
Private Function exportStaticVariant(variante As variante, konfiCanvas As shape, layer As ProductDesignLayer, isFocusedLayer As Boolean, viewIndex As Integer)
    
    logger.addTab , "[AmazonExport.exportStaticVariant] variante: '" & variante.variantGroupName & ", " & variante.variantName & "'"
    
    Dim variantFolderName As String
    variantFolderName = replace(variante.variantGroupName, "var_", "")
    
    Dim variantMask As shape
    
    Dim mainMasks As shapeRange
    Set mainMasks = layer.newCustomShapeTypeQuery(mainMask).search
    For i = 1 To mainMasks.count
        
        If Globals.isVariantMask(mainMasks(i)) Then
            If Globals.getVariantMaskString(mainMasks(i)) = variante.shape.name Then
                Set variantMask = mainMasks(i)
                Exit For
            End If
        End If
    Next i
    
    
    Dim range As New shapeRange
    
    If Not variantMask Is Nothing Then
        range.add variantMask
    End If
    
    If isFocusedLayer Then
        ' Von der fokusierten Schicht sind alle Designelemente usw außer der Variantensachen schon auf dem BaseImage
        ' Deshalb hier nur die Variante exportieren
        range.AddRange Globals.getValidShapesFor(variante.shape, False, False, True, True, True)
    Else
        ' Schichten, die Varianten haben, müssen mit allen Designelementen usw und der Variante exportiert werden, da erstere nicht auf dem BaseImage oder so drauf sind
        range.AddRange Globals.getValidShapesFor(layer.layerShape, False, False, True, True, True)
        range.AddRange Globals.getValidShapesFor(variante.shape, False, False, True, True, True)
        
        'Es kann sein, dass "layer" die FotoMaske enthält, diese wird ja schon als HauptMaske exportiert
        range.RemoveRange layer.newCustomShapeTypeQuery(mainMask).search
    End If
    
    
    Dim exportPath As String
    exportPath = ConfiHelper.designFiles.getAmazonExportVariantPath(variante, viewIndex)
    
    newShapeExport(range, exportPath, cdrPNG) _
        .setWidth(400) _
        .setHeight(400) _
        .setResolutionX(72) _
        .setResolutionY(72) _
        .setBoundingBoxShape(konfiCanvas) _
        .setExportBoundingBox(True) _
        .export logger
    
    logger.removeTab
    
End Function




Private Function exportQRCodeAsVariant(focusedLayers As collection, konfiCanvas As shape, qrCodes As shapeRange, viewIndex As Integer)
    Dim range As New shapeRange
    
    Globals.makeShapeInvisibleForExport konfiCanvas  'Unsichtbar machen. Wird als Hintergrund benötigt, damit die FotoMaske die Größe des Konfis hat beim export. Nicht nur die Größe der Grundplatte
    range.add konfiCanvas
    
    range.AddRange qrCodes
    
    
    newShapeExport(range, ConfiHelper.designFiles.getAmazonExportQRCodeVariantPath(viewIndex), cdrPNG) _
        .setWidth(400) _
        .setHeight(400) _
        .setResolutionX(72) _
        .setResolutionY(72) _
        .export logger
End Function



Private Function getDesignShapeExportSettings(focusedLayers As collection, useGroundplateVariants As Boolean, groundPlateVariantIndex As Integer) As ShapeExport
    
    Dim result As New ShapeExport
    
    ' Formen sammeln
    ' ---------------------------------
    Dim range As New shapeRange
    Dim currentLayer As ProductDesignLayer
    
    For i = 1 To focusedLayers.count
        Set currentLayer = focusedLayers(i)
        range.AddRange currentLayer.getValidShapesFor(False, False, True, True, False, logger)
        Set currentLayer = Nothing
    Next i
    ' ---------------------------------
    
    
    
    ' Formen ausschließen
    ' ------------------------------------
    
    For i = 1 To focusedLayers.count
        Set currentLayer = focusedLayers(i)
        
        ' Wie wird die Grundplatte und Fotomaske behandelt. Wann wird sie exportiert:
        ' - Wenn nur eine Grundplatte ohne Fotomaskenversion vorhanden ist -> Keine Grundplatte exportieren
        ' - Wenn eine Fotomaske von der Grundplatte vorhanden ist -> Fotomaske exportieren
        ' - Wenn es Grundplattenvarianten gibt -> Grundplatte exportieren
        
        ' Falls eine FotoMaske vorhanden ist, wird die Grundplatte entfernt, damit die Fotomaske exportiert wird, denn wenn sie da ist, wird sie benötigt
        ' Ist keine FotoMaske vorhanden, wird die Grundplatte mit Design exportiert
        Dim photoMasks As shapeRange
        Set photoMasks = currentLayer.newCustomShapeTypeQuery(customShapeType.photoMask).search
        
        If photoMasks.count > 0 Then
            ' Grundplatten vom Export ausschließen, denn wenn Fotomasken da sind, werden diese genutzt
            range.RemoveRange currentLayer.newCustomShapeTypeQuery(Globals.customShapeType.groundPlate).search
            
            ' Photomasken die nicht von der aktuellen Grundplattenvariante abstammen nicht exportieren
            For j = 1 To photoMasks.count
                If Not j = groundPlateVariantIndex Then
                    range.RemoveRange Globals.shapeToShapeRange(photoMasks(j))
                End If
            Next j
        Else
            ' Wenn es nur eine Grundplatte gibt, muss sie nicht mit auf dem Design exportiert werden
            ' Nur wenn es Grundplattenvarianten gibt, müssen sie mit auf dem Design um die Grundplatte auf dem baseImage zu überdecken
            If Not useGroundplateVariants Then
                ' Alle Grundplatten aus der Auswahl löschen
                range.RemoveRange newCustomShapeTypeQuery(range, Globals.customShapeType.groundPlate).search
            End If
        End If
        
        Set currentLayer = Nothing
    Next i
    
    ' Statische Varianten hier nicht mitexportieren. Die bekommen eigene seperate Bilder
    For i = 1 To focusedLayers.count
        Set currentLayer = focusedLayers(i)
        range.RemoveRange focusedLayers(i).getVariantsOfType(StaticVariantType).allVariantsShapes 'Es ist effizienter sie vom Layer abzufragen, da sie dort evtl. schon gecached sind
        Set currentLayer = Nothing
    Next i
    
    ' Hauptmaske ausschließen
    range.RemoveRange newCustomShapeTypeQuery(range, mainMask).search
    
    ' QR-Codes entfernen (werden seperat exportiert)
    range.RemoveRange newCustomShapeTypeQuery(range, qrCode).search
    
    Dim designElementVariants As shapeRange
    Set designElementVariants = newCustomShapeTypeQuery(range, customShapeType.DesignElementVariantShapeType).search
    ' DesignVarianten nicht hier exportieren
    range.RemoveRange designElementVariants
    
    ' Formen die auf die Maske sollen hier ausschließen (putOnMaskShape)
    For i = 1 To focusedLayers.count
        range.RemoveRange focusedLayers(i).productDesign.newCustomShapeTypeQuery(Globals.customShapeType.putOnMaskShape).setArgument1(focusedLayers(i)).search
    Next i
    ' ------------------------------------
    
    result.setShapes range
    Set getDesignShapeExportSettings = result
End Function



Private Function exportDesign(focusedLayers As collection, konfiCanvas As shape, useGroundplateVariants As Boolean, groundPlateVariantIndex As Integer, viewIndex As Integer)
    
    logger.addTab , "[AmazonExport.exportDesign]"
    
    
    Dim designExportableRange As ShapeExport
    Set designExportableRange = getDesignShapeExportSettings(focusedLayers, useGroundplateVariants, groundPlateVariantIndex)
    
    ' Export
    ' ::::::::::::::
    logger.logINFO "Exportiere designExportableRange: " & Globals.shapeRangeToString(designExportableRange.getShapes)
    
    
    newShapeExport(designExportableRange.getShapes, ConfiHelper.designFiles.getAmazonExportDesignImagePath(viewIndex, useGroundplateVariants, groundPlateVariantIndex), cdrPNG) _
        .setResolution(72) _
        .setBoundingBoxShape(konfiCanvas) _
        .setExportBoundingBox(True) _
        .export logger
    
    
    
    
    
    
    Dim photoIslandsExportableRange As ShapeExport
    Set photoIslandsExportableRange = getPhotoIslandsShapesForExport(focusedLayers, useGroundplateVariants, groundPlateVariantIndex, designExportableRange)
    
    ' Export
    ' ::::::::::::::
    logger.logINFO "Exportiere Fotomaskeninseln exportRange: " & Globals.shapeRangeToString(photoIslandsExportableRange.getShapes)
    
    newShapeExport(photoIslandsExportableRange.getShapes, ConfiHelper.designFiles.getAmazonExportDesignImageWithPhotoIslandsPath(viewIndex, useGroundplateVariants, groundPlateVariantIndex), cdrPNG) _
        .setResolution(72) _
        .setBoundingBoxShape(konfiCanvas) _
        .setExportBoundingBox(True) _
        .export logger
    
    photoIslandsExportableRange.deleteShapesToDeleteAfterExport
    
    
    
    
    ' Designvorschau-Bild (Design-Preview)
    ' ------------------------------
    
    ' Wenn keine Designelemente vorhanden sind, Vorschaubild nicht exportieren
    If designExportableRange.getShapes.count = 0 Then
        GoTo ExitFunction
    End If
    
    Dim previewRange As New shapeRange
    
    previewRange.AddRange designExportableRange.getShapes
'    previewRange.AddRange designElementVariants ' TODO wird bei getDesignShapeExportSettings ermittelt aber entfernt von der .exportrange. Macht es überhaupt Sinn, Designvarianten bei dem Designvorschaubild zu haben !!??!??!??
    Dim oneLayerIsGraving As Boolean
    
    For i = 1 To focusedLayers.count
        
        oneLayerIsGraving = oneLayerIsGraving Or focusedLayers(i).isGraving
        
        If Not previewImageZoomed Or useGroundplateVariants Then
            
            ' Grundplatte hinzufügen
            If focusedLayers(i).getGroundPlate Is Nothing Then
                Err.Raise vbObjectError + 513, , "[AmazonExport.exportDesign] Keine Grundplatte vorhanden"
            End If
            previewRange.add focusedLayers(i).getGroundPlate
        End If
    Next i
    
    
    Dim previewRangeBlack As shapeRange
    Dim whiteRect As shape
    If previewImageZoomed Then
        
        previewRange.RemoveRange newCustomShapeTypeQuery(previewRange, RedOrPinkShape).search
        previewRange.RemoveRange Globals.shapeToShapeRange(konfiCanvas)
        previewRange.RemoveRange newCustomShapeTypeQuery(previewRange, photoMask).search
        
        ' Schwarz gefärbte Gravur auf weißem Hintergrund
        ' Wenn es Grundplattenvarianten gibt, dann muss die Grundplattenfarbe auch in der Vorschau zu sehen sein.
        ' Deshalb wird in solchem Fall die Gravur nicht Schwarz gemacht (useGroundplateVariants)
        ' ==========================================
        If oneLayerIsGraving And Not useGroundplateVariants Then
            Set previewRangeBlack = Globals.copyPasteShapeRange(previewRange)
            
            ' Umbedingt vor dem Umbenennen Formen ausschließen. Denn wenn der Name weg ist werden Formtypen wie die Hauptmaske nicht mehr erkannt
            previewRangeBlack.RemoveRange newCustomShapeTypeQuery(previewRangeBlack, GuideElementShapeType).search
            previewRangeBlack.RemoveRange newCustomShapeTypeQuery(previewRangeBlack, VisualElementShapeType).search
            
            ' Umbenennen
            Globals.setShapeRangeName previewRangeBlack, "AmazonExport.exportDesign.previewRangeBlack"
            
            Set previewRange = previewRangeBlack ' Damit die previewRangeBlack exportiert wird
            
            Globals.setShapeRangeColor previewRangeBlack, CreateColor("#000000"), CreateColor("#000000"), True, True, True, True, True
        End If
        ' ==========================================
        
        logger.logINFO "previewRange: " & Globals.shapeRangeToString(previewRange)
        
        ' Größe für den weißen Hintergrund ermitteln
        Dim previewRangeDesignElements As shapeRange
        ' Nur Designelemente sollen die Größe des Vorschaubildes bestimmen. Bzw. es soll auf die Designelemente gezoomt werden
        Set previewRangeDesignElements = newCustomShapeTypeQuery(previewRange, DesignElementShapeType).search
        Dim previewShapeSize As Integer
        
        logger.logINFO "previewRangeDesignElements ermittelt: " & Globals.shapeRangeToString(previewRangeDesignElements)
        
        ' Muss vorher ermittelt werden
        Dim previewOriginX As Double
        Dim previewOriginY As Double
        
        If previewRangeDesignElements.count = 0 Then
            previewShapeSize = 400
            previewOriginX = previewRange.centerX
            previewOriginY = previewRange.centerY
        Else
            previewOriginX = previewRangeDesignElements.centerX
            previewOriginY = previewRangeDesignElements.centerY
            
            If previewRangeDesignElements.SizeWidth > previewRangeDesignElements.SizeHeight Then
                previewShapeSize = previewRangeDesignElements.SizeWidth
            Else
                previewShapeSize = previewRangeDesignElements.SizeHeight
            End If
        End If
        
        logger.logINFO "previewOriginX: '" & previewOriginX & "'"
        logger.logINFO "previewOriginY: '" & previewOriginY & "'"
        logger.logINFO "previewShapeSize: '" & previewShapeSize & "'"
        
        ' Weißen Hintergrund (rechteck) erstellen
        Dim rect As New rect
        rect.SetRect previewOriginX - previewShapeSize / 2, previewOriginY - previewShapeSize / 2, previewShapeSize, previewShapeSize
        
        logger.logINFO "Rect erstellt"
        
        Set whiteRect = ActiveLayer.CreateRectangleRect(rect)
        whiteRect.name = "AmazonExport.exportDesign.whiteRect"
        whiteRect.fill.ApplyUniformFill CreateColor("#FFFFFF")
        whiteRect.outline.SetNoOutline
        whiteRect.OrderBackOf ActiveLayer.shapes.All.lastShape
        
        logger.logINFO "whiteRect erstellt"
        
        previewRange.add whiteRect
        
        logger.logINFO "previewRange: " & Globals.shapeRangeToString(previewRange)
        
    End If
    
    logger.logINFO "Exportiere ..."
    
    konfiCanvas.transparency.ApplyNoTransparency  'Sichtbar machen als weißer Hintergrund
    newShapeExport(previewRange, ConfiHelper.designFiles.getAmazonExportDesignPreviewImagePath(viewIndex, useGroundplateVariants, groundPlateVariantIndex), cdrJPEG) _
        .setWidth(400) _
        .setHeight(400) _
        .setResolutionX(72) _
        .setResolutionY(72) _
        .setBoundingBoxShape(IIf(previewImageZoomed, whiteRect, Nothing)) _
        .setExportBoundingBox(True) _
        .export logger
    
    Globals.makeShapeInvisibleForExport konfiCanvas 'Wieder Unsichtbar machen
    If Not previewRangeBlack Is Nothing Then previewRangeBlack.delete
    Set previewRangeBlack = Nothing
    If Not whiteRect Is Nothing Then
        If Globals.isShapeReferenceValid(whiteRect) Then
            whiteRect.delete
        End If
    End If
    Set whiteRect = Nothing
    ' ------------------------------
    
ExitFunction:
    logger.removeTab
End Function



Private Function getPhotoIslandsShapesForExport(focusedLayers As collection, useGroundplateVariants As Boolean, groundPlateVariantIndex As Integer, Optional designExportableRange As ShapeExport) As ShapeExport
    Dim result As New ShapeExport
    
    If designExportableRange Is Nothing Then Set designExportableRange = getDesignShapeExportSettings(focusedLayers, useGroundplateVariants, groundPlateVariantIndex)
    
    ' Foto-Inseln (PhotoIslands)
    '
    ' Designbild mit Uploadboxen exportieren, wo aber die Fotomaske nur um die Uploadboxen geht, damit nur die Kundenfotos außerhalb der Uploadbox abgedeckt wird.
    ' Denn andere Bereiche wo keine Uploadboxen sind sollen für Texte frei bleiben
    ' Muss aber nicht für quadratische Uploadboxen gemacht werden, da man im Amazon-Konfi quadratische Begrenzungen für Uploadboxen festlegen kann
    '
    ' TODO es kann auch vorkommen, dass man zwar eine rechteckige Uploadbox hat, es aber Elemente vor der Uploadbox gibt, wodurch die Uploadbox nicht mehr rechteckig im Konfi erscheinen soll.
    ' Solche Uploadboxen müssten dann ebenfalls exportiert werden (Vielleicht einfach erkennen, ob etwas über der Uploadbox liegt)
    ' ---------------------------------------------------------
    Dim boundedNonRectangularUploadBoxes As New shapeRange
    For i = 1 To focusedLayers.count
        
        Set currentLayer = focusedLayers(i)
        
        Dim boundingType As Integer
        boundingType = 1
        Dim uploadboxesOfLayer As shapeRange
        Set uploadboxesOfLayer = currentLayer.newCustomShapeTypeQuery(uploadBox).setContinueSearchInMatchedGroups(False).setArgument1(boundingType).search
        
        ' Nur die Uploadboxen hinzufügen, die nicht rechteckig sind
        For j = 1 To uploadboxesOfLayer.count
            If Not Globals.isCurveRectangle(Globals.getUploadboxBoundingShapeCurve(uploadboxesOfLayer(j))) Then
                boundedNonRectangularUploadBoxes.add uploadboxesOfLayer(j)
            End If
        Next j
    Next i
    
    If boundedNonRectangularUploadBoxes.count > 0 Then
        result.setShapes Globals.copyPasteShapeRange(designExportableRange.getShapes)
        result.getShapes.OrderFrontOf ActiveLayer.shapes.First
        
        Dim cutShape As shape
        
        For i = 1 To boundedNonRectangularUploadBoxes.count
            Dim currUploadbox As shape
            Set currUploadbox = boundedNonRectangularUploadBoxes(i)
            
            
            Dim currUploadBoxCurve As curve
            Set currUploadBoxCurve = Globals.getUploadboxBoundingShapeCurve(currUploadbox)
            
            If cutShape Is Nothing Then
                Set cutShape = ActiveLayer.CreateRectangle(currUploadBoxCurve.boundingBox.left, currUploadBoxCurve.boundingBox.top, currUploadBoxCurve.boundingBox.Right, currUploadBoxCurve.boundingBox.Bottom)
                cutShape.name = "AmazonExport.exportDesign.cutShape"
            Else
                Set cutShape = Globals.combineShapes(cutShape, ActiveLayer.CreateRectangle(currUploadBoxCurve.boundingBox.left, currUploadBoxCurve.boundingBox.top, currUploadBoxCurve.boundingBox.Right, currUploadBoxCurve.boundingBox.Bottom))
            End If
            
            
            
            Set currUploadboxBoundingShapeCopy = Nothing
            Set currUploadbox = Nothing
        Next i
        
        result.setShapes Globals.intersectShapeWithShapeRange(cutShape, result.getShapes)
        
        result.addShapesToDeleteAfterExport cutShape
        result.addShapesToDeleteAfterExport result.getShapes
    End If
    ' ---------------------------------------------------------
    
    
    Set getPhotoIslandsShapesForExport = result
End Function



' TODO !
Private Function exportVariant()
    
    Dim range As New shapeRange
    
End Function


Public Function getAmazonKonfiPadding() As Double
    getAmazonKonfiPadding = 10
End Function

Public Function getAmazonKonfiSize() As Double
    getAmazonKonfiSize = 400
End Function

Public Function getAmazonKonfiSizeWithoutPadding() As Double
    getAmazonKonfiSizeWithoutPadding = getAmazonKonfiSize - getAmazonKonfiPadding * 2
End Function








' Nur bei Amazon:
' Entfernt zu kleine Kreuzmmotive. Da alle Texte nicht in den Konfi kommen,
' sieht eine leere Gedenktafel mit einem kleinen Kreuz, der von einem Todesdatum stammt, schlecht aus und könnte sogar beim freien Platzieren der Texte von Kunden, stören.
' Deshalb werden, nachdem das Design auf Konfigröße gebracht wurde, Kreuze die eine geringere Breite haben als 15, einfach gelöscht
Public Function removeSmalCrossInView(productDesignLayers As ProductDesignLayerRange)
    
    For i = 1 To productDesignLayers.count
        Dim currentLayer As ProductDesignLayer
        Set currentLayer = productDesignLayers.getLayer(i)
        
        removeSmalCrossInProductDesignLayer currentLayer
        
        Set currentLayer = Nothing
    Next i
    
End Function





Public Function removeSmalCrossInProductDesignLayer(layer As ProductDesignLayer)
    
    For j = layer.layerShape.shapes.count To 1 Step -1 'Negativ durchlaufen, wenn nähmlich ein Element gelöscht wird, muss der index 'j' nicht geändert werden, was in VBA nicht geht
            Dim currentShape As shape
            Set currentShape = layer.layerShape.shapes(j)
            
            If Globals.isMotive(currentShape) Then
                If isCross(currentShape) Then
                    
                    ' Da das Kreuz schon auf Konfigröße ist, einfach gucken ob die Breite < 15 pxl ist
                    If isCrossToSmal(currentShape, layer) Then
                        currentShape.delete
                    End If
                    
                End If
            End If
            
            Set currentShape = Nothing
    Next j
    
End Function


Public Function isCross(shape As shape) As Boolean
    isCross = startsWith(shape.name, "Kreuz")
End Function


Public Function isCrossToSmal(crossShape As shape, layer As ProductDesignLayer) As Boolean
'    MsgBox "Factor " & ((crossShape.SizeWidth * crossShape.SizeHeight) / (layer.getMainShape.SizeWidth * layer.getMainShape.SizeHeight))
    
    ' Wenn der Flächeninhalt des Kreuzes, im Gegensatz zum Flächeninhalt des Layers, kleiner als 0,3% ist, unsichtbar machen (Hinweis: Der Flächeninhaltsunterschied ist exponenziel)
    If ((crossShape.SizeWidth * crossShape.SizeHeight) / (layer.getMainShape.SizeWidth * layer.getMainShape.SizeHeight)) < 0.003 Then
        isCrossToSmal = True
    End If
    
End Function


Public Sub MarkShapeAsForAmazonConfi()
    Globals.markSelectedShapes Globals.getForAmazonConfiKeyWord
End Sub


Public Sub AddAmazonKonfiPaddingToShape()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    Dim shape As shape
    Set shape = ActiveShape
    shape.SetSizeEx shape.centerX, shape.centerY, _
        shape.SizeWidth / getAmazonKonfiSize * (getAmazonKonfiSize + getAmazonKonfiPadding * 2), _
        shape.SizeHeight / getAmazonKonfiSize * (getAmazonKonfiSize + getAmazonKonfiPadding * 2)
    
End Sub

Public Sub RemoveAmazonKonfiPaddingToShape()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    Dim shape As shape
    Set shape = ActiveShape
    shape.SetSizeEx shape.centerX, shape.centerY, _
        shape.SizeWidth / getAmazonKonfiSize * (getAmazonKonfiSize - getAmazonKonfiPadding * 2), _
        shape.SizeHeight / getAmazonKonfiSize * (getAmazonKonfiSize - getAmazonKonfiPadding * 2)
    
End Sub




