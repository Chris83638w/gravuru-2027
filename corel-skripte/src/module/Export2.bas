Attribute VB_Name = "Export2"

' Autor: Martin Afelt GRAVURU
'
' TODO:
' - Wenn ein Shape als "for_product_picture" markiert ist, soll es nur im Modus "ProductPicture" mit exportiert werden
' - Design für den Export lieber mit der Grundplatte zuschneiden und nicht mit der Hauptform. Denn die Grundplatte ist die wahre optische Form (Schiefer z.B.). Achtung: Grundplatten haben bei UV eig. immer noch eine Beschnittzugabe

Private logger As logger

Dim exportPath As String
Dim sizeFolder As FSSizeFolder

Dim debugRedOrPinkShapes As Boolean ' Wenn aktiv, werden rote/pinke Hautformen mit exportiert

Public Enum exportModeType
    productPicture
    KonfiGravuru
    KonfiAmazon
    SplitFile
    SplitFileForNewStructure
    SplitFileForAmazonKonfi
End Enum

Public Enum SpecialShapesExportMode
    exportOnce
    exportAll
    exportNone
End Enum

Public Enum ExportOriginMode
    design
    part
    layer
End Enum

Dim exportMode As exportModeType
Dim specialShapesExportModeVar As SpecialShapesExportMode
Dim exportOriginModeVar As ExportOriginMode

Dim cutUVDesings As Boolean
Dim forceExportGroundPlateSeperately As Boolean
Dim forceExportUploadboxesSeperately As Boolean
Dim layersUseSameOrigin As Boolean
Dim automaticGroundPlateVariant As Boolean

Dim isFirstDesign As Boolean

Public Sub Show()
    
    Globals.showWarnings
    
    ' Vor dem Exportieren die ausgewählten Designs mit dem Fehler-Fixer prüfen (Wenn eingestellt)
    If GlobalSettingsUserForm.getSetting_RunFehlerFixerBeforeExport Then
        Globals.storeSelection
        ActiveDocument.ClearSelection
        ErrorFixer.CorrectDesigns
        Globals.restoreSelection
    End If
    
    Export2Dialog.init
    Export2Dialog.Show vbModal
    
End Sub


Public Function createLogger() As logger
    Set createLogger = newLogger("Export2")
End Function


Public Function Start(exportPathVar As String, runFolderPath As String, exportModeVar As exportModeType, cutUVDesingsVar As Boolean, specialShapesExportModeVar2 As SpecialShapesExportMode, _
        forceExportGroundPlateSeperatelyVar As Boolean, forceExportUploadboxesSeperatelyVar As Boolean, exportOriginModeVar2 As ExportOriginMode, _
        automaticGroundPlateVariantVar As Boolean, Optional headless As Boolean, Optional exportNormalDesigns As Boolean = True, Optional exportProductImageVariantDesigns As Boolean = True)
    
    Set logger = createLogger
    
    Globals.startMacro
    If Not Globals.debugHistory Then
        ActiveDocument.BeginCommandGroup "Export2"
        If Not Globals.debugErrors Then On Error GoTo MacroError
    End If
    
    ' TODO Funktioniert nicht
'    Globals.storeViewOriginAndZoom
    
    
    If runFolderPath = "" Then
        startFunction exportPathVar, exportModeVar, cutUVDesingsVar, specialShapesExportModeVar2, forceExportGroundPlateSeperatelyVar, forceExportUploadboxesSeperatelyVar, _
            exportOriginModeVar2, automaticGroundPlateVariantVar, logger, exportNormalDesigns, exportProductImageVariantDesigns, headless
    Else
        startFunctionRunFolder exportPathVar, runFolderPath, exportModeVar, cutUVDesingsVar, specialShapesExportModeVar2, forceExportGroundPlateSeperatelyVar, forceExportUploadboxesSeperatelyVar, _
            exportOriginModeVar2, automaticGroundPlateVariantVar, logger, exportNormalDesigns, exportProductImageVariantDesigns, headless
    End If
    
    
    ' Funktioniert nicht
'    Globals.restoreViewOriginAndZoom
    
    
    GoTo Finally
MacroError: 'Alle Fehler hier abfangen und die CommandGruppe beenden, damit man mit einem Schritt zurück gehen kann (STRG + Z)
    MsgBox Err.Description & ", Fehlercode: " & Err.number, vbCritical
Finally:
    Globals.endMacro True
    If Not Globals.debugHistory Then
        
        ' Dokument zurücksetzen
        If GlobalSettingsUserForm.getSetting_ResetDocAfterExport Then
            If Not ActiveDocument Is Nothing Then ActiveDocument.Undo
        End If
    End If
    ActiveDocument.Dirty = False ' Nicht speicherbar machen
End Function



Public Function startFunctionRunFolder(exportPathVar As String, runFolderPath As String, exportModeVar As exportModeType, cutUVDesingsVar As Boolean, specialShapesExportModeVar2 As SpecialShapesExportMode, _
        forceExportGroundPlateSeperatelyVar As Boolean, forceExportUploadboxesSeperatelyVar As Boolean, exportOriginModeVar2 As ExportOriginMode, _
        automaticGroundPlateVariantVar As Boolean, logger_ As logger, _
        Optional exportNormalDesigns As Boolean = True, Optional exportProductImageVariantDesigns As Boolean = True, _
        Optional headless As Boolean)
    
    ' Kann auch von einem Skript außerhalb gesetzt werden
    Set logger = logger_
    
    logger.addTab , "[Export2.startFunctionRunFolder]"
    
    ' Ordner durchlaufen und CDR's exportieren
    Dim cdrs As collection
    Set cdrs = Globals.getDesignCDRs(runFolderPath)
    
    
    With ProgressBarUserForm.newSubProgress(cdrs.count)
        Dim i As Integer
        For i = 1 To cdrs.count
            .setDisplayText "CDR " & cdrs(i)
            
            OpenDocument cdrs(i)
            
            startFunction exportPathVar, exportModeVar, cutUVDesingsVar, specialShapesExportModeVar2, forceExportGroundPlateSeperatelyVar, forceExportUploadboxesSeperatelyVar, _
            exportOriginModeVar2, automaticGroundPlateVariantVar, logger, exportNormalDesigns, exportProductImageVariantDesigns, headless
                
            ActiveDocument.Close
            .setStepsProgress i
        Next i
        .finishProgress
    End With
    
    logger.removeTab
End Function


Public Function startFunction(ByVal exportPath_ As String, exportModeVar As exportModeType, cutUVDesingsVar As Boolean, specialShapesExportModeVar2 As SpecialShapesExportMode, _
        forceExportGroundPlateSeperatelyVar As Boolean, forceExportUploadboxesSeperatelyVar As Boolean, exportOriginModeVar2 As ExportOriginMode, _
        automaticGroundPlateVariantVar As Boolean, logger_ As logger, _
        Optional exportNormalDesigns As Boolean = True, Optional exportProductImageVariantDesigns As Boolean = True, _
        Optional headless As Boolean)
    
    ' Kann auch von einem Skript außerhalb gesetzt werden
    Set logger = logger_
    
    logger.addTab , "[Export2.Start]"
    
    ' Nur wenn man Produktbilder exportiert, soll man wählen können, ob man Normale, Produkblidvarianten oder beide Designtypen exportieren will
    If Not exportModeVar = productPicture Then
        exportNormalDesigns = True
        exportProductImageVariantDesigns = False
    End If
    
    exportPath = exportPath_
    If exportPath = Globals.STRUCTURE_PATH Then
        exportPath = newFSSizeFolder(, , ActiveDocument).resolveStructurePathForAmazonImportFilesExport
    End If
    
    exportMode = exportModeVar
    cutUVDesings = cutUVDesingsVar
    forceExportGroundPlateSeperately = forceExportGroundPlateSeperatelyVar
    forceExportUploadboxesSeperately = forceExportUploadboxesSeperatelyVar
    specialShapesExportModeVar = specialShapesExportModeVar2
    exportOriginModeVar = exportOriginModeVar2
    automaticGroundPlateVariant = automaticGroundPlateVariantVar
    
    isFirstDesign = True
    debugRedOrPinkShapes = False
    
    
    
    
    
    If Not ActiveDocument Is Nothing Then
        ActiveDocument.unit = cdrMillimeter
        ActiveDocument.Rulers.HUnits = cdrMillimeter
        ActiveDocument.Rulers.VUnits = cdrMillimeter
    End If
    
    
    
    
    
    logger.logINFO "exportPath: '" & exportPath & "', exportMode: '" & exportMode & "', cutUVDesings: '" & cutUVDesings & "', forceExportGroundPlateSeperately: '" & forceExportGroundPlateSeperately & _
        "', forceExportUploadboxesSeperately: '" & forceExportUploadboxesSeperately & "', specialShapesExportModeVar: '" & specialShapesExportModeVar & _
        "', exportOriginModeVar: '" & exportOriginModeVar & "', automaticGroundPlateVariant: '" & automaticGroundPlateVariant & "', quietMode: '" & quietMode & "'"
    
    
    Set sizeFolder = New FSSizeFolder
    sizeFolder.init exportPath
    
    
    If exportMode = productPicture Then
        Globals.setDocumentRenderPerceptual
    End If
    
    ' Auswahl
    Dim designsToProcess As collection
    Dim exportMasterDesign As Boolean
    exportMasterDesign = exportMode = SplitFileForAmazonKonfi ' < Wenn Amazon-Import-Daten erstellt werden, dann soll das Masterdesign auch exportiert werden
    Set designsToProcess = Globals.getSelectedDesignsOrAll(onlyValidDesigns:=True, ignoreNormalDesigns:=(Not exportNormalDesigns), ignoreProductImageVariantDesigns:=(Not exportProductImageVariantDesigns), _
        ignoreMasterDesign:=(Not exportMasterDesign), ignoreMasterDesignIfNotExplicitlySelected:=(Not exportMasterDesign))
    
    
    With ProgressBarUserForm.newSubProgress(designsToProcess.count)
        
        For i = 1 To designsToProcess.count
            .setDisplayText "Exportiere " & designsToProcess(i).getProductID
            processDesign designsToProcess(i)
            .setStepsProgress i
        Next i
        
        .finishProgress
    End With
    
    
    logger.removeTab
End Function




Private Function processDesign(productDesign As productDesign)
    
    Dim productID As String: productID = productDesign.getProductID
    logger.addTab
    logger.logFINE "[Export2.processDesign] productID: '" & productID & "'"
    
    Dim designFiles As New FSDesignFiles
    designFiles.newDesignFiles sizeFolder, productID
    
    ' Spezialebenen exportieren?
    Dim exportSpecialShapes As Boolean
    If specialShapesExportModeVar = exportAll Or (specialShapesExportModeVar = exportOnce And isFirstDesign) Then
        exportSpecialShapes = True
    End If
    
    
    
    If exportMode = SplitFile Then
        processDesignForSplitFile productDesign
        GoTo ExitFunction
    ElseIf exportMode = SplitFileForNewStructure Then
        processDesignForSplitFileForNewStructure productDesign
        GoTo ExitFunction
    End If
    
    If exportMode = productPicture Then
    
        For i = 1 To productDesign.getLayers.count
            
            If Not productDesign.getLayers.getLayer(i).isEmptyVariant Then
                If productDesign.getLayers.getLayer(i).getGroundPlate Is Nothing Then
                    productDesign.getLayers.getLayer(i).layerShape.CreateSelection
                    Globals.setViewAreaToShape productDesign.getLayers.getLayer(i).layerShape
                    
                    Dim errorMsg As String
                    errorMsg = "Bei dem Design '" & productID & "' ist keine Grundplatte vorhanden!"
                    
                    logger.logFATAL errorMsg
                    MsgBox errorMsg, vbCritical
                    Globals.endMacro
                End If
            End If
        Next i
        
        
        If automaticGroundPlateVariant Then
            If specialShapesExportModeVar = exportAll Or (specialShapesExportModeVar = exportOnce And isFirstDesign) Then
                logger.logFINE "    Platziere automatische Grundplattenvarianten bei " & productID
                
                productDesign.placeAutomaticGroundPlateVariants
            End If
        End If
        
    End If
    
    
    
    If productID = "" Then
        Globals.setViewAreaToShape productDesign.getDesignShape
        MsgBox "Es ist keine Artikelnummer vorhanden", vbCritical
        Globals.endMacro
    End If
    productDesign.deleteProductIDShape
    
    
    
    'Vorher merken / cachen
    For i = 1 To productDesign.getLayers.count
        productDesign.getLayers.getLayer(i).isGraving
    Next i
    
    
    Dim index As Integer: index = 0
    For i = 1 To productDesign.getPartsCount
        For j = 1 To productDesign.getPart(i).count
            processLayer productDesign.getPart(i).item(j), index, exportSpecialShapes
            index = index + 1
        Next j
    Next i
    
    
    
    If exportMode = SplitFileForAmazonKonfi Then
        processDesignForSplitForAmazonKonfi productDesign, designFiles
    End If
    
    
    
    isFirstDesign = False
ExitFunction:
    logger.removeTab
End Function


Public Function exportShapeOrEmptyFile(shape As shape, path As String)
    exportShapeRangeOrEmptyFile Globals.shapeToShapeRange(shape), path
End Function

Public Function exportShapeRangeOrEmptyFile(shapeRange As shapeRange, path As String)
    
    logger.addTab , "[Export2.exportShapeRangeOrEmptyFile] path: '" & path & "'"
    
    
    If Globals.isShapeRangeVisibleProperlyRecursive(shapeRange, True, False) Then
        newShapeExport(shapeRange, path, cdrCDR) _
            .setIgnoreAllShapesAreInvisibleWarning(False) _
            .setColorizeRDGWhiteToRGB(False) _
            .setColorizeCMYKBlackToRGB(False) _
            .export logger

        logger.logINFO "Variantengruppe exportiert"
    Else
        logger.logINFO "Exportiere .empty Datei, da die Variantengruppe keine sichtbaren Formen hat und Corel dann nichts exportieren würde"
        Dim emptyFilePath As String
        emptyFilePath = path & ".empty"
        logger.logINFO "Empty Dateipfad: '" & emptyFilePath & "'"
        Globals.createFolder Globals.getParentPath(path, 0)
        Globals.fileSystemObject.CreateTextFile emptyFilePath
    End If
    
    logger.removeTab
    
End Function


' Wird auch vom Amazon-Import aufgerufen, wenn ein Design skaliert wurde. Danach soll das Dokument angepasst werden
Public Function fitDocumentAndDesignForAmazonKonfiExport(design As productDesign)
    ' Dokumentengröße auf Design +1cm anpassen
    ActivePage.SizeWidth = design.getDesignShape.SizeWidth + ConvertUnits(1, cdrCentimeter, ActiveDocument.unit)
    ActivePage.SizeHeight = design.getDesignShape.SizeHeight + ConvertUnits(1, cdrCentimeter, ActiveDocument.unit)
    
    ' Design zentrieren
    design.getDesignShape.CreateSelection
    design.getDesignShape.AlignAndDistribute cdrAlignDistributeHAlignCenter, cdrAlignDistributeVAlignCenter, cdrAlignShapesToCenterOfPage, cdrDistributeToPage, False
End Function


Private Function processDesignForSplitFile(design As productDesign)
    newShapeExport(design.getDesignShape, exportPath & design.getProductID, cdrCDR) _
        .setColorizeRDGWhiteToRGB(False) _
        .setColorizeCMYKBlackToRGB(False) _
        .export
End Function




Private Function processDesignForSplitForAmazonKonfi(design As productDesign, designFiles As FSDesignFiles)
    
    ' Wird mehrfach verwendet
    Dim currentLayer As ProductDesignLayer
    
    For i = 1 To design.getPartsCount
        For j = 1 To design.getPart(i).count
            removeUselessShapesForSplittingForAmazonKonfiImport design.getPart(i).item(j).layerShape, design.getPart(i).item(j)
        Next j
    Next i
    
    
    ' Formen die für die Amazon CDR als Bitmap rauskommen sollen
    ' ------------------------------------------------------
    Dim shapesForBitmapRasterization As shapeRange
    Set shapesForBitmapRasterization = design.newCustomShapeTypeQuery(BitmapInAmazonCDRShapeType).setContinueSearchInMatchedGroups(False).search
    Dim shapeForBitmapRaster As shape
    For Each shapeForBitmapRaster In shapesForBitmapRasterization
        shapeForBitmapRaster.convertToBitmap resolution:=300
    Next shapeForBitmapRaster
    ' ------------------------------------------------------
    
    
    ' Bei Textboxen den Text entfernen, damit der Text aus dem Design nicht evtl noch graviert/gedruckt wird
    ' Außer es ist ein "kundentext-in-leerzeichen"
    ' ----------------------------------------------------------------------
    Dim textBoxes As shapeRange
    Set textBoxes = design.getDesignShape.shapes.FindShapes(Query:="@type ='text:paragraph'")
    
    For i = 1 To textBoxes.count
        If Not Globals.isShapeAmazonCustomerTextInBlanksKeyWord(textBoxes(i)) Then
            textBoxes(i).text.Story.text = ""
        End If
    Next i
    ' ----------------------------------------------------------------------
    
    
    ' Rote / pinke Texte löschen
    ' ----------------------------------------------------------------------
    newCustomShapeTypeQuery(design.newCustomShapeTypeQuery(RedOrPinkShape).search, TextAny).search.delete
    ' ----------------------------------------------------------------------
    
    
    fitDocumentAndDesignForAmazonKonfiExport design
    
    ' Falls die Daten schon exestieren, löschen, damit keine unnötigen Dateien oder Sicherungskopien entstehen
    designFiles.deleteAmazonImportFiles
    
    ' Design-Element-Varianten
    ' (werden nicht mit der Haupt-CDR exportiert, sondern separat)
    ' ---------------------------------------------------------
    Dim designElementVariants As New shapeRange
    For i = 1 To design.getLayerCount
        designElementVariants.AddRange design.getLayer2(i).newCustomShapeTypeQuery(DesignElementVariantShapeType).setRecursive(False).setContinueSearchInMatchedGroups(False).search
    Next i
    
    Dim exportCounters(10) As Integer
    
    For i = 1 To designElementVariants.count
        Dim currentDesignElementVar As shape
        Set currentDesignElementVar = designElementVariants(i)
        
        ' Designvarianten-Gruppe sichtbar machen
        currentDesignElementVar.visible = True
        
        
        ' Ungültige Formen löschen ( Wie Texte z.B.)
        Classfactory.newCustomShapeTypeQuery(currentDesignElementVar, NotValidForSplittingForAmazonKonfiImportShapeType).search.delete
        
        Dim currentDesignElementVarNr As Integer
        currentDesignElementVarNr = Globals.getDesignElementVariantNr(currentDesignElementVar)
        
        exportShapeOrEmptyFile currentDesignElementVar, designFiles.getAmazonImportDesignVariantFilePath(currentDesignElementVarNr, exportCounters(currentDesignVarNr) + 1, False)
        
        logger.logFINE "Designvariante exportiert unter '" & designFiles.getAmazonImportDesignVariantFilePath(currentDesignElementVarNr, exportCounters(currentDesignElementVarNr) + 1) & "'"
        ' Counten
        exportCounters(currentDesignElementVarNr) = exportCounters(currentDesignElementVarNr) + 1
        
        ' Container für die aktuelle Designvariante erstellen, die dann mit dem Design exportiert wird.
        ' Dann weiß man beim AmazonImport beim reinladen einer Design-Variante in die CDR, wo die Variante im Ebenenstapel hingehört (Z-Index)
        ' ==================================
        Dim designElementVarContainer As shape
        Set designElementVarContainer = ActiveLayer.CreateRectangleRect(currentDesignElementVar.boundingBox)
        
        designElementVarContainer.name = "desVarCont(" & currentDesignVarNr & ")"
        Globals.makeShapeInvisibleForExport designElementVarContainer
        designElementVarContainer.visible = False
        
        designElementVarContainer.OrderFrontOf currentDesignElementVar ' Position von der aktuellen Designvariante einnehmen
        
        ' ==================================
        
        currentDesignElementVar.delete
        
        Set currentDesignElementVar = Nothing
        Set currentDesignElementVarExportableShapes = Nothing
    Next i
    If designElementVariants.count = 0 Then
        logger.logFINE "Keine Designvarianten gefunden!"
    End If
    ' ---------------------------------------------------------
    
    
'    ' Grundplattenvarianten exportieren
'    ' --------------------------------------------
'    Dim exportGroundPlatesInMainCDR As Boolean
'    exportGroundPlatesInMainCDR = True
'    For i = 1 To design.getLayers.count
'
'
'        Set currentLayer = design.getLayers.getLayer(i)
'
'        Dim groundPlateVariants As variantArray
'        Set groundPlateVariants = currentLayer.getVariantsOfType(GroundplateVariantType)
'
'        Dim groundPlateVariantsShapes As shapeRange
'        Set groundPlateVariantsShapes = groundPlateVariants.allVariantsShapes
'
'        ' Wenn es nur eine Grundplatte gibt, dann soll diese nicht extra exportiert werden.
'        ' Sondern zusammen mit dem Design exportiert werden (Es sei denn
'        For g = 1 To groundPlateVariantsShapes.count
'
'            Dim currentGroundPlate As shape
'            Set currentGroundPlate = groundPlateVariantsShapes(g)
'
'            currentGroundPlate.visible = True
'
'            Dim groundPlateSubJob As placeFileSubJob
'            Set groundPlateSubJob = PlaceFile.findSubJobByShape(currentGroundPlate, currentLayer)
'
'            If groundPlateVariantsShapes.count = 1 Then
'                ' Die Grundplatte ist druckbar. Allerdings ist sie auch die einzige.
'                ' Deshalb wird sie einfach mit der HauptCDR exportiert.
'                ' Hier muss nichts weiter gemacht werden
'            Else
'                exportGroundPlatesInMainCDR = False
'
'                Dim groundPlateFolder As String
'                groundPlateFolder = Globals.addBackslash(DesignFiles.getAmazonImportFolderPath) & "Grundplatten Schicht " & i & "\"
'                Globals.createFolder groundPlateFolder
'
'                Globals.exportShape currentGroundPlate, cdrCDR, groundPlateFolder & replace(currentGroundPlate.name, ">", "")
'
'            End If
'
'            Set currentGroundPlate = Nothing
'        Next g
'
'        Set currentLayer = Nothing
'        Set groundPlateVariants = Nothing
'        Set groundPlateVariantsShapes = Nothing
'    Next i
'    ' --------------------------------------------
    
    
    
    
    
    
    
    ' Statische Varianten exportieren
    ' (werden nicht mit der Haupt-CDR exportiert, sondern separat)
    ' --------------------------------
    Dim layersThatHaveStaticVariantsIndex As Integer
    For i = 1 To design.getLayerCount
        Set currentLayer = design.getLayers.getLayer(i)
        
        Dim staticVariantGroups As collection
        Set staticVariantGroups = currentLayer.getStaticVariantGroups
        
        
        If staticVariantGroups.count > 0 Then
            layersThatHaveStaticVariantsIndex = layersThatHaveStaticVariantsIndex + 1
        End If
        
        For s = 1 To staticVariantGroups.count
            
            Dim currentVariantGroup As VariantGroup
            Set currentVariantGroup = staticVariantGroups.item(s)
            
            For v = 1 To currentVariantGroup.variants.count
                
                Dim currentStaticVariant As variante
                Set currentStaticVariant = currentVariantGroup.variants.item(v)
                
                currentStaticVariant.shape.visible = True
                
                exportShapeOrEmptyFile currentStaticVariant.shape, designFiles.getAmazonImportStaticVariantFilePath(currentStaticVariant, layersThatHaveStaticVariantsIndex)
                
                
                ' Container für die aktuelle statische Variante erstellen, die dann mit dem Design exportiert wird.
                ' Dann weiß man beim AmazonImport beim reinladen einer statischen Variante in die CDR, wo die Variante im Ebenenstapel hingehört (Z-Index)
                ' ==================================
                Dim staticVarContainer As shape
                Set staticVarContainer = Globals.createInvisibleRectForExportFromShape(currentStaticVariant.shape)
                staticVarContainer.name = "varCont(" & currentStaticVariant.getShapeNameWithoutOtherTags & ")"
                staticVarContainer.visible = False
                
                staticVarContainer.OrderFrontOf currentStaticVariant.shape ' Position von der aktuellen DesignElementVariante einnehmen
                ' ==================================
                
                currentStaticVariant.shape.delete
                
                Set currentStaticVariant = Nothing
            Next v
            
            Set currentVariantGroup = Nothing
        Next s
        
        
        Set staticVariantGroups = Nothing
        Set currentLayer = Nothing
    Next i
    ' --------------------------------
    
    
    
    
    
    
    
    ' Haupt CDR exportieren
    ' --------------------------------------------
    Dim exportRange As shapeRange
    Set exportRange = Globals.shapeToShapeRange(design.getDesignShape)
    If Not exportGroundPlatesInMainCDR Then exportRange.RemoveRange newCustomShapeTypeQuery(exportRange, groundPlate).search
    
    newShapeExport(exportRange, designFiles.getAmazonImportCDRPath(False), cdrCDR) _
        .setColorizeRDGWhiteToRGB(False) _
        .setColorizeCMYKBlackToRGB(False) _
        .export logger
    ' --------------------------------------------
    
    
    Set exportRange = Nothing
    
    
End Function




' Exportiert ein Design anhand der Designnummer in seinen eigenen Designordner + "\[CDR]\Design.cdr"
' Der richtige Ordner muss aber noch angegeben werden beim Dialog
Private Function processDesignForSplitFileForNewStructure(design As productDesign)
    
    
    ' Gruppenname finden: Artikelnummer ohne -D0
    Dim designNrStartIndex As Integer
    designNrStartIndex = InStr(1, design.getProductID, "-D", vbBinaryCompare)
    designNrStartIndex = designNrStartIndex - 1 ' Wegen den - vor dem D
    'Artikelnummer ohne Designnummer
    If designNrStartIndex = -1 Then
        designNrStartIndex = Len(design.getProductID)
    End If
    
    
    Dim groupName As String
    groupName = left(design.getProductID, designNrStartIndex)

    
    If Not MySQL.isProducGroupInDB(groupName) Then
        If quietMode Then
            Err.Raise vbObjectError + 513 + 1, , "Die Gruppe '" & groupName & "' ist noch nicht in Skynet hinterlegt. Bitte anlegen."
        Else
            MsgBox "Die Gruppe '" & groupName & "' ist noch nicht in Skynet hinterlegt. Bitte anlegen.", vbCritical
        End If
        
        Globals.endMacro
    Else
'        MsgBox "Die Gruppe '" & groupName & "' ist in Skynet. Hurra"
    End If
    
    Dim processname As String
    ' Die erste Schicht wird in 99% der Fälle bearbeitet. Graviert oder bedruckt
    If design.getLayer(1, 1).isGraving Then
        processname = "Gravur"
    Else
        processname = "UV-Druck"
    End If
    ' TODO Ausschnitt (irgendwann)
    
    Dim uploadBoxes As shapeRange
    Set uploadBoxes = design.newCustomShapeTypeQuery(uploadBox).setExcludeInvisibleShapes(False).search
    
    Dim hasBoundedUploadBoxes As Boolean
    For i = 1 To uploadBoxes.count
        If Globals.isUploadBox(uploadBoxes(i), BoundedUploadBoxType) Then
            hasBoundedUploadBoxes = True
            GoTo found
        End If
    Next i
found:
    
    
    
    MySQL.updateProductDesignInfoInDB design.getProductID, processname, IIf(uploadBoxes.count > 0, 1, 0), IIf(hasBoundedUploadBoxes, 1, 0)
    
    'Globals.exportShape design.getDesignShape, cdrCDR, exportPath & "\" & design.getProductID & "\[CDR]\Design"
    
End Function






Private Function processLayer(layer As ProductDesignLayer, index As Integer, exportSpecialShapes As Boolean)
    
    logger.addTab
    logger.logINFO "[Export2.processLayer] '" & layer.productDesign.getProductID & "', index: " & index & ", exportSpecialShapes: " & exportSpecialShapes
    
    
    ' Formen löschen, die nicht für den aktuellen Exporttypen 'exportMode' bestimmt sind
    ' Ist eine Form z.B. als 'für-Fancy' markiert und es wird gerade für Amazon exportiert, dann wird diese Form gelöscht.
    ' ------------------------
    Dim shapeSearchType As customShapeType
    shapeSearchType = NoShapeType
    Select Case exportMode
        Case exportModeType.KonfiAmazon, exportModeType.SplitFileForAmazonKonfi
            shapeSearchType = NotForAmazonConfiShapeType
        Case exportModeType.KonfiGravuru
            shapeSearchType = NotForFancyShapeType
        Case exportModeType.productPicture
            shapeSearchType = NotForProductPictureShapeType
    End Select
    If Not shapeSearchType = NoShapeType Then
        layer.newCustomShapeTypeQuery(shapeSearchType).search.delete
    End If
    ' ------------------------
    
    ' Amazon
    If exportMode = SplitFileForAmazonKonfi Then
        processLayerForSplittingForAmazonKonfiImport layer, index
        GoTo ExitFunction
    End If
    
    layer.colorizeMainShapes ' Wieder sichtbar machen, da es unten unsichtbar gemacht wurde
    
    If exportMode = productPicture Then
        
        ' Entferne Bitmapzuschnitt vor dem Export bei platzierten Bildern die das wollen
        For i = 1 To layer.layerShape.shapes.count
            findAndRemoveBitmapCut layer.layerShape.shapes(i), layer
        Next i
        
    
        If cutUVDesings Then
            If Not layer.isGraving Then ' Nur UV Produkte haben evtl. eine Beschnittzugabe. Deshalb nur dort entfernen
                layer.removeBleed
            End If
        End If
        
        
        
        ' Bei Gravurdesigns können Texte usw. grau sein (Gravurfarbe)
        ' Da auf die Gravur wegen der Fotos in PS ein spezieller Gravurfilter draufkommt, welcher nur weiß sichtbar lässt, sollen alle Texte usw. für PS weiß sein
        ' -----------------------------------------------
        If layer.isGraving And Not layer.isEmptyVariant Then

            Dim subJob As PlaceFileSubJob
            Set subJob = PlaceFile.findSubJobByShape(layer.getGroundPlate, layer)
            
            Dim whiteOrBlack As Boolean
            
            If Not subJob Is Nothing Then
                whiteOrBlack = Not subJob.isDarkGraving
            Else
                MsgBox "Der SubJob für '" & layer.getGroundPlate.name & "' konnte nicht gefunden werden!", vbExclamation
            End If
            
            setGravingColor layer.layerShape, layer, whiteOrBlack
        End If
        ' -----------------------------------------------
        
    End If
    
    
    ' Cachen
    layer.getGroundPlate
    
    hideUselessShapes layer.layerShape.shapes, layer.layerShape, layer, layer.isGraving, True
    
    
    If layer.isEmptyVariant Then
        GoTo ExitFunction
        
    ElseIf layer.getGroundPlate Is Nothing Then
        layer.layerShape.CreateSelection
        Globals.setViewAreaToShape layer.layerShape
        
        logger.logFATAL "Keine Grundplatte vorhanden. Abbrechen! "
        MsgBox "Keine Grundplatte vorhanden", vbCritical
        Globals.endMacro
    End If
    
    If Globals.isGroundPlateTransparent(layer.getGroundPlate) Then
        layer.getGroundPlate.transparency.ApplyNoTransparency 'Transparente Grundplatte vollflächig machen
        layer.getGroundPlate.fill.UniformColor = CreateRGBColor(255, 255, 255)
        
    ElseIf layer.isGraving Or layer.getGroundPlate.name = ">Granit_Grundplatte" Or layer.getGroundPlate.name = ">PremiumSchiefer_Grundplatte" Then
        '
'        MsgBox "Gravurplatte"
    Else
        If Not forceExportGroundPlateSeperately Then
            layer.getGroundPlate.name = replace(layer.getGroundPlate.name, ">", "") 'Grundplatten zusammen exportieren mit Design
        End If
    End If

    
    
    
    hideExportableShapes layer.layerShape
    
    
    Dim filePath As String
    filePath = layer.productDesign.getProductID

    If Not index = 0 Then
        filePath = filePath + "_part" & index
    End If
    
    
    ' DPI
    ' ----------------------------------------------------------------------------------------
    Dim DPI As Integer
    DPI = 300
    ' Wenn die Schicht kleiner als 100 mm ist, in 600DPI exportieren
    If ConvertUnits(layer.getMainShape.SizeWidth, ActiveDocument.unit, cdrMillimeter) < 100 And _
        ConvertUnits(layer.getMainShape.SizeHeight, ActiveDocument.unit, cdrMillimeter) < 100 Then
        DPI = 600
    End If
    
    If ConvertUnits(layer.getMainShape.SizeWidth, ActiveDocument.unit, cdrMillimeter) > 300 Or _
        ConvertUnits(layer.getMainShape.SizeHeight, ActiveDocument.unit, cdrMillimeter) > 300 Then
        DPI = 160 ' 300 mm @ 160 DPI = 1890 Pixel
    End If
    
    If ConvertUnits(layer.getMainShape.SizeWidth, ActiveDocument.unit, cdrMillimeter) > 600 Or _
        ConvertUnits(layer.getMainShape.SizeHeight, ActiveDocument.unit, cdrMillimeter) > 600 Then
        DPI = 80 ' 600 mm @ 80 DPI = 1890 Pixel
    End If
    ' ----------------------------------------------------------------------------------------
    
    
    
    Dim selection As New shapeRange
    selection.add layer.layerShape
    
    Dim colorizeToRGB As Boolean
    colorizeToRGB = exportMode = productPicture Or exportMode = KonfiGravuru Or exportMode = KonfiAmazon
    
    newShapeExport(selection, exportPath & filePath, cdrPNG) _
        .setOriginWithOriginType(exportOriginModeVar, layer) _
        .setResolution(DPI) _
        .setColorizeRDGWhiteToRGB(colorizeToRGB) _
        .setColorizeCMYKBlackToRGB(colorizeToRGB) _
        .export logger
    
    If exportSpecialShapes Then
        logger.logINFO "Suche nach Export-Formen ('findSpecialLayersToExport')"
        findSpecialLayersToExport layer.layerShape, layer.layerShape, exportPath & filePath, DPI, layer, True
    Else
        logger.logINFO "Suche NICHT nach Export-Formen ('findSpecialLayersToExport'), da exportSpecialShapes false ist: " & exportSpecialShapes & ". Das kann daran liegen, dass eingestellt ist, dass nur beim ersten Design Exportformen exportiert werden"
    End If
    
    
    If exportMode = KonfiAmazon Or KonfiGravuru Then
        'createPhotoMask layer
    End If
    
    If exportMode = KonfiAmazon Or exportMode = KonfiGravuru Then
        exportDesignVariantsOfLayer layer
    End If
    
    
    
ExitFunction:
    logger.removeTab
End Function





Private Function processLayerForSplittingForAmazonKonfiImport(layer As ProductDesignLayer, index As Integer)
    
    logger.addTab
    logger.logINFO "[Export2.processLayerForSplittingForAmazonKonfiImport]"
    
    Dim uploadBoxes As shapeRange
    Set uploadBoxes = layer.newCustomShapeTypeQuery(uploadBox).setContinueSearchInMatchedGroups(False).search
    
    
    ' Design-Varianten sichtbar machen,
    ' da diese sonst nicht schwarz gefärbt werden können, bei Gravur (weiter unten im Code)
    Dim designElementVariants As shapeRange
    Set designElementVariants = layer.newCustomShapeTypeQuery(DesignElementVariantShapeType).search
    ' Merken welche Design-Varianten sichtbar waren
    Dim designVariantsVisible As New collection
    
    For j = 1 To designElementVariants.count
        designVariantsVisible.add designElementVariants(j).visible
        designElementVariants(j).visible = True
    Next j
    
    
    'Weil dieses Design keine Uploadbox enthält, aber bei Amazon immer mindestens eins angeboten wird, wird eins hinzugefügt
'    If uploadboxes.count = 0 Then
'        addUploadBoxForAmazon layer
'    End If
    
    Dim i As Integer: i = 1
    While i <= uploadBoxes.count
        Dim uploadBoxPhoto As shape: Set uploadBoxPhoto = Globals.getPhotoOfUploadBoxGroup(uploadBoxes(i))
        
        If uploadBoxPhoto Is Nothing Then
            Err.Raise vbObjectError + 513, , "[Export2.processLayerForSplittingForAmazonKonfiImport] Das Foto von der Uploadbox wurde nicht gefunden"
        End If
        
        Dim boundedUploadBox As Boolean
        boundedUploadBox = Globals.isUploadBox(uploadBoxes(i), BoundedUploadBoxType)


        Dim photoCutShape As shape
        Set photoCutShape = Globals.createConfiUploadBoxCutForImportShapeType(uploadBoxes(i))
        photoCutShape.OrderBackOf uploadBoxes(i)
        
        uploadBoxes(i).delete

        Set uploadBoxPhoto = Nothing
        i = i + 1
    Wend
    
    If layer.isGraving Then
        ' ACHTUNG. Invalidieren nötig
        Globals.makeShapeBlack layer.layerShape, True
        
        layer.invalidateAll
    End If
    
    ' Designvarianten wieder sichtbar / unsichtbar machen
    For i = 1 To designElementVariants.count
        designElementVariants(i).visible = designVariantsVisible(i)
    Next i
    
    
    ' Gilt nur für UV
    If Not layer.isGraving Then
        ' Neuerdings wird kein echtes schwarz satiniertes Acryl verwendet.
        ' Stattdessen wird schwarz auf eine durchsichtige satinierte Platte gedruckt.
        ' Deshalb muss die Grundplatte für schwarz satiniertes Acryl als CMYK-Schwarze Form ausgegeben werden
        ' ---------------------------------------------------------------------------------------------
        If Not layer.getGroundPlate Is Nothing Then
            If layer.getGroundPlate.name = ">Acryl_Satiniert_Schwarz_Grundplatte" Then
                layer.getGroundPlate.name = "Acryl_Satiniert_Schwarz" ' Name ändern, damit die Grundplatte in der 'removeUselessShapesForSplittingForAmazonKonfiImport' nicht entfernt wird
                layer.getGroundPlate.fill.ApplyUniformFill Globals.getRichBlackColor
            End If
        End If
        ' ---------------------------------------------------------------------------------------------
    End If
    
    
    ' Textboxen sind evtl. unsichtbar im Design drin, weil der Text dafür ein einfacher Text ist, da dieser sich besser anpassen lässt ohne die Textbox zu verändern.
    ' Wenn eine Textbox aber unsichtbar ist, kann beim AmazonImport nachher der Text in der Textbox nicht auf die Größe angepasst werden da die Box unsichtbar ist
    ' -------------------------------------------------------------------------------------
    Dim textBoxes As shapeRange
    Set textBoxes = layer.newCustomShapeTypeQuery(ParagraphText).search
    textBoxes.Show
    ' -------------------------------------------------------------------------------------
    
    
    logger.removeTab
End Function



Private Function addUploadBoxForAmazon(layer As ProductDesignLayer)
    Dim photoCutShape As shape
    Set photoCutShape = Globals.copyPasteShape(layer.getMainShape, False)
    
    'Farbe
    photoCutShape.fill.ApplyNoFill
    photoCutShape.outline.Type = cdrOutline
    photoCutShape.outline.color = CreateColor("#FFFF00")
    
    photoCutShape.OrderFrontOf layer.layerShape.shapes.First
    photoCutShape.name = "uploadbox_amazon_false"
End Function



Private Function removeUselessShapesForSplittingForAmazonKonfiImport(shape As shape, layer As ProductDesignLayer)
    
    logger.addTab , "[Export2.removeUselessShapesForSplittingForAmazonKonfiImport]"
    
    Dim i As Integer: i = 1
    While i <= shape.shapes.count
        
        Dim shapeInvalid As Boolean
        shapeInvalid = Not Globals.isShapeValidFor(shape.shapes(i), False, False, False, False, True, layer)
        
        ' Effekt Formen werden von der 'Globals.isShapeValidFor' als nicht Valide angegeben,
        ' damit diese von der Form verarbeitet werden, auf der der Effekt angewendet ist
        ' Trotzdem darf eine Effektform aber nicht gelöscht werden !
        Dim isEffectShape As Boolean
        isEffectShape = Globals.isShapeTypeEffect(shape.shapes(i).Type)
        
        If (shapeInvalid _
            Or (AmazonExport.isCross(shape.shapes(i)) And AmazonExport.isCrossToSmal(shape.shapes(i), layer))) _
            And Not Globals.isViewShape(shape.shapes(i)) And Not isEffectShape Then
            
            If shapeValid Then
                logger.logFINER "[Export2.removeUselessShapesForSplittingForAmazonKonfiImport] lösche " & Globals.getShapeDisplayName(shape.shapes(i)) & ", weil nicht valide"
            End If
            
            ' Kreuze
            ' :::::::::
            If (AmazonExport.isCross(shape.shapes(i)) And AmazonExport.isCrossToSmal(shape.shapes(i), layer)) Then
                logger.logFINER "[Export2.removeUselessShapesForSplittingForAmazonKonfiImport] lösche '" & Globals.getShapeDisplayName(shape.shapes(i)) & "', weil es ein zu kleines Kreuzmotiv ist"
            End If
            
            shape.shapes(i).delete
            

            'Wenn das letzte Shape der Gruppe gelöscht wurde, Gruppe abbrechen, da sie nicht mehr vorhanden ist
            If Globals.isShapeDeleted(shape) Then
                GoTo ExitFunction
            End If

            i = i - 1
        ElseIf shape.shapes(i).Type = cdrGroupShape And Not Globals.isDesignElementVariantShapeType(shape.shapes(i)) Then ' Designvarianten nicht beachten, denn sie und ihr Inhalt dürfen nicht gelöscht/verändert werden
            Dim groupShape As shape
            Set groupShape = shape.shapes(i)
            
            ' Rekursiv
            removeUselessShapesForSplittingForAmazonKonfiImport groupShape, layer
            
            'Wenn alle Shapes der Gruppe gelöscht wurden, wird die Gruppe von Corel aufgelöst
            If Globals.isShapeDeleted(groupShape) Then
                i = i - 1
            End If
            
            Set groupShape = Nothing
        End If
            
        i = i + 1
    Wend
    
ExitFunction:
    logger.removeTab
End Function



Public Sub TestisShapeValidForSplittingAmazonKonfiImport()
    MsgBox "Valide: " & Globals.isShapeValidFor(ActiveShape, False, False, False, False, True)
End Sub



Private Function createPhotoMask(layer As ProductDesignLayer)
    
    Dim uploadBoxes As shapeRange
    Set uploadBoxes = layer.newCustomShapeTypeQuery(uploadBox).search
    
    Dim photoMaskIndex As Integer
    photoMaskIndex = 0
    
    For i = 1 To uploadBoxes.count
        If Globals.isUploadBox(uploadBoxes(i), BoundedUploadBoxType) Then
            Dim photoMask As shape
            Set photoMask = ActiveLayer.CreateRectangle(uploadBoxes(i).LeftX, uploadBoxes(i).TopY, uploadBoxes(i).RightX, uploadBoxes(i).BottomY)
            
            Dim uploadBoxPhoto As shape: Set uploadBoxPhoto = uploadBoxes(i).shapes.FindShape("uploadbox")
            
            Globals.intersectShapes uploadBoxPhoto, photoMask, False, False
            
            'Alle oberen Shapes abziehen
            For j = Globals.getShapeIndexInParentGroup(uploadBoxes(i)) - 1 To 1 Step -1
                If Globals.isVectorShape(layer.layerShape.shapes(j)) Then
                    On Error GoTo SubtractShapeError
                    Set photoMask = Globals.subtractShape(layer.layerShape.shapes(j), photoMask)
                    On Error GoTo 0
                End If
            Next j
            
            photoMask.OrderBackOf uploadBoxes(i)
            photoMask.name = ">Foto" & photoMaskIndex
            
            photoMaskIndex = photoMaskIndex + 1
            
            Set photoMask = Nothing
            Set uploadBoxPhoto = Nothing
        End If
    Next i
    
    Exit Function
SubtractShapeError:
    Err.Raise Err.number, Err.source, Err.Description, Err.HelpFile, Err.HelpContext
End Function



Private Function setGravingColor(shape As shape, layer As ProductDesignLayer, whiteOrBlack As Boolean)
    If whiteOrBlack Then
        Globals.correctGravingColor shape, layer, CreateRGBColor(255, 255, 255)
    Else
        Globals.correctGravingColor shape, layer, CreateRGBColor(0, 0, 0)
    End If
End Function




' Wandelt Formen für einen Exportzweck um. Manche werden dafür unsichtbar gemacht, evtl wird ein Gravureffekt auf das Kundenfoto angewendet usw.
' Eigenschaften, wie isGraving müssen vorher schon ermittelt werden, da von den roten Formen hier die Outline gelöscht wird.
' Somit könnte dann nicht mehr festgestellt werden ob es Gravur oder UV ist. Schlimmer noch, es findet sich keine Hauptform mehr
Private Function hideUselessShapes(shapes As shapes, parentShape As shape, layer As ProductDesignLayer, isGraving As Boolean, ignoreToManyShapes As Boolean)
    
    logger.addTab , "[Export2.hideUselessShapes]"
    
    If Globals.isShapesHavingToManyShapes(shapes) And Not ignoreToManyShapes Then
        Exit Function
    End If

    For i = 1 To shapes.count

        Dim currentShape As shape
        Set currentShape = shapes(i)
        
        ' Uploadboxen
        If forceExportUploadboxesSeperately Or exportMode = KonfiGravuru Or exportMode = KonfiAmazon Then
            If Globals.isUploadBox(currentShape, BoundedUploadBoxType) Then
                currentShape.name = ">Uploadbox" & CStr(photoIndex)
                photoIndex = photoIndex + 1
            End If
        End If

        
        logger.logFINE "Prüfen ob Shape valide ist. Shape: '" & Globals.getShapeDisplayName(currentShape) & "'"
        If Not Globals.isShapeEffectShape(currentShape) And Not Globals.isShapeValidFor(currentShape, exportMode = productPicture, exportMode = KonfiGravuru, exportMode = KonfiAmazon, True, exportMode = SplitFileForAmazonKonfi, layer) Then
            
            logger.logFINE "Shape nicht valide"
            
            ' Rote Formen nicht unsichtbar machen sondern nur die Outline entfernen, damit deren Größe beim Export mitberechnet wird
            If Globals.isRedOrPinkShape(currentShape) And Not debugRedOrPinkShapes Then
                currentShape.locked = False
                currentShape.outline.SetNoOutline
            Else
                currentShape.visible = False
            End If
            
        Else
            logger.logFINE "Shape valide"
            
            If Globals.isUploadBox(currentShape) Then
                'Gravureffekt für Bitmaps/Fotos
                If isGraving Then
                    Dim photo As shape
                    Set photo = Globals.getPhotoOfUploadBoxGroup(currentShape)
                    
                    If Not photo Is Nothing Then
                        Globals.applyPhotoGravingEffect photo
                    End If
                End If
                
            ElseIf (exportMode = KonfiGravuru Or exportMode = KonfiAmazon) And (Globals.isShapeConfiBackground(currentShape) Or Globals.isShapeConfiMask(currentShape)) Then
                currentShape.name = ">" & currentShape.name
            End If
        End If
        
        ' Rekursion
        ' -----------------
        If currentShape.Type = cdrGroupShape Then
            ' Nur die Childs von Uploadboxen untersuchen nicht aber dessen Childs (Den Text von "Dein Foto" z.B.)
            ' 'Dein Foto' selbst muss aber noch untersucht werden, da es z.B. für die Produktbilder ausgeblendet werden muss
            If Not Globals.isUploadBox(parentShape) Then
                hideUselessShapes currentShape.shapes, currentShape, layer, isGraving, False
            End If
        
        ElseIf Globals.isShapePowerclip(currentShape) Then
            If Globals.isUploadBox(currentShape) Then
                hideUselessShapes currentShape.powerClip.shapes, currentShape, layer, isGraving, False
            End If
        End If
        ' -----------------
        
    Next i
    
    
    logger.removeTab

End Function






Public Sub SharpenTest()
    
    If ActiveSelectionRange.count > 0 Then
        For i = 1 To ActiveSelectionRange.count
            If ActiveSelectionRange(i).Type = cdrBitmapShape Then
                Dim photo As shape
                Set photo = ActiveSelectionRange(i)
            
               Dim sharpenFactor As Double
                sharpenFactor = photo.bitmap.resolutionX / 1000
                
                Dim percentage As Integer: percentage = 500 ' 100 + CInt(400 * sharpenFactor)
                percentage = min(max(percentage, 1), 500)
                
                Dim radius As Integer: radius = CInt(20 * ((sharpenFactor - 1) * 1.2 + 1))
                radius = min(max(radius, 1), 20)
                
                Dim threshold As Integer: threshold = 4 * sharpenFactor
                threshold = min(max(threshold, 0), 255)
                
                photo.bitmap.ApplyBitmapEffect "Unsharp Mask", "UnsharpMaskEffect Radius=" & CStr(radius) & ",Percentage=" & CStr(percentage) & ",Threshold=" & CStr(threshold)
                
                
                
                Set photo = Nothing
            End If
            
        Next i
        
    End If
    
    
End Sub





' Verstecke Shapes die ">" im Namen haben
' Rekursiv
Private Function hideExportableShapes(shape As shape)
    
    For i = 1 To shape.shapes.count
        If InStr(1, shape.shapes(i).name, ">") = 1 Then
            shape.shapes(i).visible = False
        End If
    
        If shape.shapes(i).Type = cdrGroupShape Then
            ' Rekursion
            hideExportableShapes shape.shapes(i)
        End If
    Next i

End Function



Private Function findSpecialLayersToExport(shape As shape, groupShape As shape, path As String, DPI As Integer, layer As ProductDesignLayer, Optional isLayerShape As Boolean = False)
    
    
    logger.logINFO "[Export2.findSpecialLayersToExport]"
    logger.addTab
    
    If Not isLayerShape Then
        If Globals.isGroupHavingToManyShapes(shape) Then
            logger.logINFO "Die Gruppe hat zu viele Unterformen und wird deshalb nicht weiterverarbeitet: " & Globals.shapeToString(shape)
            GoTo ExitFunction
        End If
    End If
    
    For i = 1 To shape.shapes.count
        
        If InStr(1, shape.shapes(i).name, ">") = 1 Then
                    
            shape.shapes(i).visible = True
            
            Dim selection As New shapeRange
            selection.add shape.shapes(i)
            
            logger.logINFO "Exportform gefunden: '" & shape.shapes(i).name & "'"
            
            newShapeExport(selection, path & "_" & Right(shape.shapes(i).name, Len(shape.shapes(i).name) - 1), cdrPNG) _
                .setOriginWithOriginType(exportOriginModeVar, layer) _
                .setResolution(DPI) _
                .export logger
            
            Set selection = Nothing
        ElseIf shape.shapes(i).Type = cdrGroupShape Then
            findSpecialLayersToExport shape.shapes(i), groupShape, path, DPI, layer

        End If
    Next i
    
ExitFunction:
    logger.removeTab
End Function


Private Function hideAllShapesInGroupExceptFor(exceptionShape As shape, shape As shape)
    'MsgBox "HideAllLayersExceptFor: " & exceptionShape.Name & ", urrGroup=" & shape.Name
    
    For i = 1 To shape.shapes.count
    
        Dim currentShape As shape
        Set currentShape = shape.shapes(i)
    
        Dim checkThisShape As Boolean
        checkThisShape = True
        
        If currentShape.Type = cdrGroupShape Then
        
            checkThisShape = False
            If InStr(1, currentShape.name, ">") = 1 Then ' Eine Gruppe, die mit > anfängt, enthällt sowieso nur Shapes die auch mit > anfangen. Deshalb nicht durchsuchen. Z.B: >2AH -> >AH, >AH
                checkThisShape = True 'Diese GRuppe durch die Überprüfung unten laufen lassen, da es mit einem > anfängt (muss deshalb vielleicht unsichtbar / sichtbar gemacht werden)
            Else
                hideAllShapesInGroupExceptFor exceptionShape, currentShape
            End If
            
        End If
        
        
        If checkThisShape Then
            If Not currentShape Is exceptionShape Then
                
                Dim shapeVisibility As Boolean
                shapeVisibility = False
                
                ' TODO BUG ACHTUNG Was ist mit Texten als Hauptform oder Ausschnitt ???
                If currentShape.Type > 0 And currentShape.Type <= 4 And Not Globals.isCurveWithText(currentShape) Then ' > 0 == kein GroupShape(0) & kein cdrBitmapShape
                    If currentShape.outline.Type = cdrNoOutline And currentShape.fill.Type = cdrNoFill Then ' Vermutlich dann ein pinker Rahmen der für den Export keinen Rahmen / Outline hat aber noch sichtbar ist
                        shapeVisibility = True
                    End If
                End If
                
                
                currentShape.visible = shapeVisibility
                
                
            Else ' Das exceptionShape sichtbar machen (kann durch vorherige Shapes mit > unsichtbar gemacht worden sein)
                shape.shapes(i).visible = True
            End If
        
        End If
        
        Set currentShape = Nothing
    Next i

End Function



Private Function findAndRemoveBitmapCut(shape As shape, layer As ProductDesignLayer)
    
    If shape.Type = cdrGroupShape Then
        For i = 1 To shape.shapes.count
            
            findAndRemoveBitmapCut shape.shapes(i), layer
            
        Next i
        
        ' Ist nur bei Bitmaps möglich
    ElseIf shape.Type = cdrBitmapShape Then
        
        Dim subJob As PlaceFileSubJob
        Set subJob = PlaceFile.findSubJob(shape, layer)
        
        If Not subJob Is Nothing Then
            If subJob.removeBitmapCutForExport2 Then
                
                shape.bitmap.ResetCropEnvelope
                
            End If
        End If
        
    End If
    
End Function



Private Function exportDesignVariantsOfLayer(layer As ProductDesignLayer)
    
    For i = 1 To layer.getVariantsOfType(DesignElementVariantType).allVariants.count
        Dim designVariant As variante
        Set designVariant = layer.getVariantsOfType(DesignElementVariantType).getVariant(i)
        
        designVariant.shape.visible = True
        
        Dim filePath As String
        filePath = exportPath & layer.getPart.getDesign.getProductID & "_" & designVariant.designElementVarianteGroupNr & "-" & designVariant.variantName
        
        newShapeExport(designVariant.shape, filePath, cdrPNG).setOriginWithOriginType(exportOriginModeVar, layer).export
        
        Set designVariant = Nothing
    Next i
    
End Function


Sub SelectFirstSubPath()

    If Not ActiveShape Is Nothing Then
        If Globals.isVectorShape(ActiveShape) Then
'            ActiveShape.Curve.SubPaths(1).StartNode.Move 10, 10
            
            
            
            ActiveShape.curve.subPaths.First.Nodes.All.CreateSelection
            
            'Damit der Fensterinhalt neu gezeichnet wird
            ActiveWindow.ActiveView.Zoom = ActiveWindow.ActiveView.Zoom + 1
            ActiveWindow.ActiveView.Zoom = ActiveWindow.ActiveView.Zoom - 1
            
            'ActiveShape.Curve.SubPaths.First.IsClockwise
            
'            For i = 1 To ActiveShape.Curve.SubPaths.count
'                ActiveShape.Curve.SubPaths(i).StartNode.Move 1, 1
'            Next i
            
'            ActiveShape.Curve.Segments(2).Nodes.item(2).Move -10, -10
        Else
            MsgBox "Die ausgewählte Form ist keine Vektorform"
        End If
    Else
        MsgBox "Es ist nichts ausgewählt!"
    End If
   
End Sub



Public Sub MarkShapeAsBitmapInAmazonExportCDR()
    Globals.markSelectedShapes Globals.getBitmapInAmazonExportCDRKeyWord
End Sub


