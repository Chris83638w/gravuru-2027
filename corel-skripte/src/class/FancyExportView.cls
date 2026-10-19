Attribute VB_Name = "FancyExportView"
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
' Stellt eine View im Konfi dar. Also in der JSON und die Dateien die dazu gehören.
' Achtung: Layout Views darf man nicht mit Customization Views verwechseln. Denn eine Layout View ist eigentlich eine Variante.
' Eine Customization View ist eine echte View, denn im Fancy kann man Views wechseln, wenns mehrer gibt


' TODO Alle Datei-Namen benötigen noch eine Pre oder Suffix, damit man sie von anderen Views in gleicher ZIP unterscheiden kann. Z.B.: Uploadbox_1_View_1


Private logger As logger

Private shortID As Long
Private id As Long
Private title As String
Private index As Integer
Private varia As variante

' JSON
Private jsonView As New Dictionary
    Private jsonViewElements As New collection
    Private jsonViewElementsAddAtEnd As New collection


' Export Counter
Private uploadBoxesExported As Integer
Private imagesExported As Integer

Private currentProcessedLayer As ProductDesignLayer


Public parent As FancyExportPackage
Public view As ConfiView
Private exportShapesByLayerKey As New Dictionary
Private exportShapesOfAllLayers As New shapeRange

Private processed As Boolean

Private Const FANCY_EXPORT_DPI = 300      ' Fancy rechnet intern mit 300 DPI (vgl. Globals.warnIfNot300DPI)
Private Const POINTS_PER_INCH = 72


Public Function init(parent_ As FancyExportPackage, view_ As ConfiView, index_ As Integer, logger_ As logger, Optional title_ As String, Optional customizationView As FancyExportView, Optional varia_ As variante)
    Set logger = logger_
    Set parent = parent_
    Set view = view_
    index = index_
    Set varia = varia_
    
    title = title_
    If title = "" Then title = "Ansicht " & CStr(view.index)
    
    If Not logger Is Nothing Then
        logger.addTab , "[FancyExportView.init]"
        logger.logINFO "index: '" & index & "', title: '" & title & "', varia: '" & (Not varia Is Nothing) & "'"
    End If
    
    shortID = parent.getNextViewID
    id = parent.id
    If parent.packageType = CustomizationPackage Then
        id = id + shortID * 10000
    Else
        ' Wenn dies eine Layout View ist (bspw. D4), dann muss zur ID noch die View der Customization hinzugefügt werden
        ' Denn D4 kann auch 2 Parts haben die in 2 Views kommen. Um die D4 Views besser unterscheiden zu können wird die Customization View ID hinzugefügt
        id = id + shortID + customizationView.getShortViewID * 10000
    End If
    
    
    'Nur bei der ersten View machen
    If view.index = 1 Then
        
        ' Der Titel, den auch die Kunden auf der Website im Fancy sehen
        Globals.addToDictionaryAtIndex jsonView, "title", view.confiEx.productID, 1
    End If
    
    If Not logger Is Nothing Then logger.removeTab
End Function


' Ist für den Fancy eigentlich das selbe wie die Customization ID, denn Layouts teilen sich die IDs mit Customizations
Public Function getLayoutID() As Long
    If Not parent.packageType = LayoutPackage Then Err.Raise vbObjectError + 513, , "[FancyExportView.getLayoutID] Der Parent ist kein Layout!"
    getLayoutID = parent.id
End Function


Public Function getViewID() As Long
    getViewID = id
End Function

Public Function getShortViewID() As Integer
    getShortViewID = shortID
End Function


Public Function process()

    createJSONHeader
    
    Dim i As Integer
    For i = 1 To view.layersInKonfiOrder.count
        processLayer view.layersInKonfiOrder.getLayer(i), view.layerProcessOrderIndexies(i), i
    Next i
    
    
    ' Elemente für die FancyJSON die am Ende hinzugefügt werden sollen, um nach hinten zu kommen
    For i = 1 To jsonViewElementsAddAtEnd.count
        Globals.addToCollectionAtIndex jsonViewElements, jsonViewElementsAddAtEnd(i), 1 ' Müssen an den Anfang um ganz oben zu sein. Denn am Ende werden alle Elemente umgekehrt
    Next i
    
    ' Die reihenfolge der Ebenen umkehren (Z-Index) weil der Fancy die anderseherum benötigt
    ' Wird gemacht, nachdem alle Elemente hinzugefügt wurden (durch "processDesignElements")
    ' ACHTUNG: Muss aber erst gemacht werden, wenn alle Layer der View durch sind
    Globals.reverseCollection jsonViewElements
    
    processed = True
End Function


Public Function getJson() As Dictionary
    Set getJson = jsonView
End Function



Private Function getThumbnailFileNameAndType() As String
    If Not logger Is Nothing Then logger.addTab , "[FancyExportView.getThumbnailFileNameAndType]"
    
    ' Variantenvorschaubild aus Job entnehmen
    ' -----------------------------------------------------------
    If Not varia Is Nothing Then
        If Not varia.getJob Is Nothing Then
            If Not varia.confiThumbnailFileName = "" Then
                getThumbnailFileNameAndType = copyVariantThumbnailAndGetFilePath(varia.getFullConfiThumbnailPath(True))
                GoTo ExitFunction
            End If
        End If
    End If
    ' -----------------------------------------------------------
    
    
    ' Leeres Variantenvorschaubild für unsichtbare Formen
    ' -----------------------------------------------------------
    If Not Globals.isShapeRangeVisibleProperlyRecursive(exportShapesOfAllLayers, True) Then
        ' Alle Formen sind unsichtbar
        getThumbnailFileNameAndType = copyVariantThumbnailAndGetFilePath(Globals.getMainFolder & "Variants\Thumbnails\Ohne.svg")
        GoTo ExitFunction
    End If
    ' -----------------------------------------------------------
    
    
    
    ' Variantenvorschaubild aus Schnappschuss erzeugen
    ' -----------------------------------------------------------
    getThumbnailFileNameAndType = createThumbnailSnapshotAndGetFileNameAndType
    GoTo ExitFunction
    ' -----------------------------------------------------------
    
ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
End Function


Private Function copyVariantThumbnailAndGetFilePath(imagePath As String) As String
    Dim imagePasteNameAndType As String
    If Globals.fileExist(imagePath) Then
        Dim imagePathPath As String
        imagePathPath = Globals.copyPasteFile(imagePath, parent.getFolderPath, True, True, True)
        imagePasteNameAndType = Globals.getFileNameAndType(imagePathPath)
    Else
        Err.Raise vbObjectError + 513, , "Die Datei '" & imagePath & "' konnte nicht gefunden werden! [FancyExportView.copyVariantThumbnailAndGetFilePath]"
    End If
    
    copyVariantThumbnailAndGetFilePath = imagePasteNameAndType
End Function


Private Function createThumbnailSnapshotAndGetFileNameAndType() As String
    Dim shapeEx As ShapeExport
    Set shapeEx = newShapeExportInZIPFolder(New shapeRange, "Thumbnail", cdrJPEG)
    
    getShapesForThumbnail shapeEx
    
    ' Hilfsformen ignorieren
    shapeEx.addShapesToExclude newCustomShapeTypeQuery(Globals.customShapeType.GuideElementShapeType).setIgnoreGroupsWithTooManyShapes(False).search
    
    createThumbnailSnapshotAndGetFileNameAndType = shapeEx.setPreferredWidth(150).setPreferredHeight(150).setExportFullyInvisibleShapeRange(True).export.finalExportFileNameWithType
End Function


Private Function getShapesForThumbnail(shapeEx As ShapeExport)
    If Not logger Is Nothing Then logger.addTab , "[FancyExportView.getShapesForThumbnail]"
    
    shapeEx.getShapes.AddRange exportShapesOfAllLayers
    
    Select Case parent.getVariantType
        Case variantType.GroundplateVariantType
            shapeEx.getShapes.AddRange newCustomShapeTypeQuery(mainMask).search
        Case variantType.StaticVariantType
           ' Werden als SVG Icons unter 'copyVariantThumbnailAndGetFilePath' ausgegeben
           ' Optional: Grundplatten der anderen Layer als Produktkontext mitrendern
           If Not varia Is Nothing Then
               If varia.fancyExportExportOtherLayersGroundplatesInThumbnail Then
                   shapeEx.getShapes.AddRange newCustomShapeTypeQuery(groundPlate).setExcludeInvisibleShapes(True).search
               End If
           End If
        Case variantType.DesignElementVariantType
            
            ' TODO
        
            ' Bei Gravur kommt die Designvariante in schwarz raus. Denn bei Acryl klar und so ist die Gravur weiß.
            ' Hier würde sonst eine weiße Designvariante auf weißem BG exportiert werden- > schlecht
'            If variante.layer.isGraving Then
'                Globals.makeShapeBlack variantShapeCopy
'            End If
        
        Case variantType.DesignVariantType
            shapeEx.getShapes.AddRange newCustomShapeTypeQuery(groundPlate).setExcludeInvisibleShapes(True).search
            shapeEx.getShapes.AddRange newCustomShapeTypeQuery(mainMask).search
    End Select
    
    If Not logger Is Nothing Then logger.removeTab
End Function




Private Function createJSONHeader()
    
    If Not logger Is Nothing Then logger.addTab , "[FancyExportView.createJSONHeader] title: '" & title & "', Package: '" & parent.getPackageName & "'"
    
    Dim thumbnailFileNameAndType As String
    thumbnailFileNameAndType = getThumbnailFileNameAndType
    
    ' Die erste View im Konfi und die erste View in einem Layout Package, bestimmt das Thumbnail vom Package
    If view.index And index = 1 And parent.packageType = LayoutPackage Then
        If Not logger Is Nothing Then logger.logINFO "Füge Thumbnail zum parent hinzu, da dies die erste View von Ihm ist"
        parent.setThumbnailFile thumbnailFileNameAndType
    End If
    
    ' JSON
    ' ----------------------------------
    With jsonView
        .add "title", title
        .add CUSTOMIZATION_ID_KEY_NAME, getViewID
        .add "thumbnail", thumbnailFileNameAndType
        .add "elements", jsonViewElements
        
        Dim jsonViewOptions As New Dictionary
        .add "options", jsonViewOptions
        With jsonViewOptions
            
            Dim jsonPrintingBox As New Dictionary
            .add "printing_box", jsonPrintingBox
            With jsonPrintingBox
                Dim printingBox As rect
                Set printingBox = view.confiMainShapesAndBleedBox
                .add "width", Globals.RoundIfCloseToInteger(printingBox.width, 0.001)
                .add "height", Globals.RoundIfCloseToInteger(printingBox.height, 0.001)
                .add "top", -printingBox.top
                .add "left", printingBox.left
            End With
            
            .add "stageWidth", Globals.RoundIfCloseToInteger(ConfiHelper.confiWidth, 0.001)
            .add "stageHeight", Globals.RoundIfCloseToInteger(ConfiHelper.confiHeight, 0.001)
            .add "output_format", "man"
            Dim outputBox As rect
            Set outputBox = view.originalMainShapesAndBleedBox
            .add "output_width", Globals.RoundIfCloseToInteger(ActiveDocument.FromUnits(outputBox.width, cdrMillimeter), 0.001)
            .add "output_height", Globals.RoundIfCloseToInteger(ActiveDocument.FromUnits(outputBox.height, cdrMillimeter), 0.001)
            .add "design_categories[]", New collection
            
            .add "custom_texts_prop_minFontSize", CInt(getMinimumGravableFontSizeInFancyFontUnit)
            .add "custom_texts_prop_maxFontSize", CInt(getMaximumFontSizeInFancyFontUnit)
            
        End With
    End With
    If Not logger Is Nothing Then logger.removeTab
End Function



Public Function getTitle() As String
    getTitle = title
End Function



' TODO iInNormalOrder ist indexInNormalOrder
Private Function processLayer(layer As ProductDesignLayer, indexInNormalOrder As Integer, ByVal index As Integer)
    
    logger.addTab , "[FancyExportView.processLayer]"
    logger.logFINE "Verarbeite Layer #" & layer.getLayerIndex & ", aus dem Part #" & layer.getPartIndex & ", index: " & index
    logger.logINFO ""
    
    Set currentProcessedLayer = layer
    
    
    ' Fokusierte Schicht finden & Z-Index des aktuellen Layers relativ zur Fokusierten
    ' --------------------------------------------------------
    Dim focusedLayerOfLayerPart As ProductDesignLayer
    ' Der PartIndex vom ersten Part (parts(1)(1)) ist quasi der Offset für alle die außerdem noch in der View sind.
    ' Ist der erste Part Partindex 5 vom Produkt, dann ist er der erste in der View (5 - 5 + 1) = 1. Hat man dann den nächsten Part Nr. 6 , dann ist er der 2. in der View (6 - 5 + 1) = 2
    Dim startPartIndex As Integer
    startPartIndex = view.parts.getPart(1).getLayer(1).getPartIndex
    
    Dim focusedLayerIndex As Integer
    focusedLayerIndex = layer.getPartIndex - startPartIndex + 1
    Set focusedLayerOfLayerPart = view.focusedLayersOfParts(focusedLayerIndex)
    
    Dim currLyrZIndexRelativeToFocused As Integer
    
    Dim focusedLayerOfLayerPartIndexInKonfi As Integer
    Dim j As Integer
    For j = 1 To view.layersInKonfiOrder.count
        If focusedLayerOfLayerPart Is view.layersInKonfiOrder.getLayer(j) Then
            currLyrZIndexRelativeToFocused = j - index
            Exit For
        End If
    Next j
    ' --------------------------------------------------------
    
    
    If layer.isLayerVariant Then
        
        processVariant layer.layerShape, index, currLyrZIndexRelativeToFocused, layer, True, New shapeRange
        
    Else

        
        ' Cachen. Wird für 'processDesignElements' benötigt
        layer.getBackgroundShapes
        
        
        If Not logger Is Nothing Then logger.logINFO "Verarbeite Designelemente:"
        Dim mainMaskAppeared As Boolean
        
        Dim exportShapesForLayer As shapeRange
        Set exportShapesForLayer = getExportShapesForLayer(layer)
        
        For j = 1 To exportShapesForLayer.count

            If Globals.isMainMask(exportShapesForLayer(j)) Then
                mainMaskAppeared = True
            End If
            
            processDesignElements exportShapesForLayer(j), index, currLyrZIndexRelativeToFocused, layer, Not mainMaskAppeared
        Next j
    End If
    
    logger.removeTab
End Function



' Achtung: Rekursiv
Public Function processDesignElements(shape As shape, indexOfLayerInView As Integer, currLyrZIndexRelativeToFocused As Integer, _
        layer As ProductDesignLayer, shapeIsAboveMask As Boolean, _
        Optional textLocked As Boolean = False, Optional locked As Boolean = False, Optional colorAble As Boolean = False)
    
    logger.logINFO "[FancyExportView.processDesignElements] Designelement name: '" & Globals.getShapeDisplayName(shape) & "', StaticID: '" & shape.staticID & "'"
    logger.addTab
    
    
    
    ' Bestimmte Formen escapen
    ' --------------------------------------
    If Not Globals.isShapeValidFor(shape, False, True) Then
        logger.logFINE "Form ist nicht für den Fancy gedacht. Abbruch!"
        GoTo ExitFunction
    End If
    ' --------------------------------------
    
    
    ' RDG_White gefüllte Formen überspringen
    ' --------------------------------------
    If Classfactory.newCustomShapeTypeQuery(shape, RGD_WhiteShape).isAllShapesMatchingQuery Then
        logger.logINFO "Form ist RDG_White oder beinhaltet nur RDG_White. Wird übersprungen"
        GoTo ExitFunction
    End If
    ' --------------------------------------
    
    Dim i As Integer
    
    ' Eigenschaften
    ' --------------------
    If Not textLocked Then
        textLocked = Globals.isTextLocked(shape)
    End If
    
    If Not locked Then
        locked = Globals.isLocked(shape)
    End If
    
    If Not colorAble Then
        colorAble = Globals.isColorAble(shape)
    End If
    ' --------------------
    
    
    
    
    ' Hilfs-Formen separat exportieren
    ' --------------------
    Dim shapesToExportSeperate As New shapeRange
    ' Hauptformen (rot / pink)
    shapesToExportSeperate.AddRange Classfactory.newCustomShapeTypeQuery(shape, RedOrPinkShape).search
    ' Hilfslinien Formen
    shapesToExportSeperate.AddRange Classfactory.newCustomShapeTypeQuery(shape, GuideLineShapeType).search
    ' Uploadbox Zuschnitts Form Formen
    shapesToExportSeperate.AddRange Classfactory.newCustomShapeTypeQuery(shape, ConfiUploadBoxCutForImportShapeType).search
    
    ' TODO: Würde man genau wissen, ob der Formtyp von 'shape' eine Gruppe sein kann, dann wüsste man auch, ob man dort die 'shapesToExportSeperate' zum Exkludieren mitgeben muss.
    ' Denn wenn ein Formtyp (bspw Grundplatte) nie eine Gruppe sein kann, dann wird es auch keine Childs als Hilfsformen geben, welche ausgeschlossen werden müssen ('shapesToExportSeperate')
    ' Aktuell wird das zwar schon gemacht, aber nicht gebunden an der Info ob der FormTyp eine Gruppe sein kann
    
    ' Spezielle Formen Rekursiv einzeln exportieren
    If shapesToExportSeperate.count > 1 Then
        For i = 1 To shapesToExportSeperate.count
            processDesignElements shapesToExportSeperate(i), indexOfLayerInView, currLyrZIndexRelativeToFocused, layer, shapeIsAboveMask, textLocked, locked, colorAble
        Next i
    End If
    ' --------------------
    
    

    
    ' Export
    ' --------------------
    ' ### HAUPTFORM
    If Globals.isRedOrPinkShape(shape) Then
        
        processRedOrPinkShape shape
    
    ' ### HILFSLINIEN FORM
    ElseIf Globals.isShapeGuideLineShape(shape) Then
        
        processGuideLineShape shape
    
    ' ### UPLOADBOX ZUSCHNITTS FORM
    ElseIf Globals.isShapeUploadBoxCutShapeForConfiImportShapeType(shape) Then
        
        processUploadBoxCutShapeForConfiImportShape shape
    
    ' ### VARIANTEN (Grundplatten, Fotomasken, statische Varianten(Abstandshalter o.Ä), Designvarianten)
    ElseIf Globals.isVariant(shape) Then
        
        processVariant shape, indexOfLayerInView, currLyrZIndexRelativeToFocused, layer, shapeIsAboveMask, shapesToExportSeperate
    
    ' ### LOOK
    ElseIf Globals.isLook(shape) Then
        
        processLook shape
        
    ' ### UPLOADBOX
    ElseIf Globals.isUploadBox(shape) Then
        
        processUploadBox shape, layer
        
    
    ' ### HAUPTMASKE
    ElseIf Globals.isMainMask(shape) Then
        
        processMainMask shape
    
    
    ' ### BITMAP ERZWINGEN
    ElseIf Globals.isFancyBitmap(shape) Then
            
        processBitmaps Globals.shapeToShapeRange(shape), locked, colorAble, currLyrZIndexRelativeToFocused, shapesToExportSeperate, shapeIsAboveMask
    
    
    ' ### SVG ERZWINGEN
    ElseIf Globals.isFancySVG(shape) Then
        
        processSVGElement Globals.shapeToShapeRange(shape), locked, colorAble, False, currLyrZIndexRelativeToFocused, shapesToExportSeperate, True
    
    ' ### GRUPPE
    ElseIf shape.Type = cdrGroupShape Then
        
        
        ' GRUPPE NUR MIT TEXT-FORMEN
        ' ::::::::
        If Classfactory.newCustomShapeTypeQuery(shape, TextAny).isAllShapesMatchingQuery Then
            
            For i = 1 To shape.shapes.count
            
                ' Hier wird diese Funktion für die Childs der Gruppe 'shape' nochmal rekursiv aufgerufen
                ' Die Gruppe 'shape' gibt die Eigenschaften (wie z.B: "locked") and die Childs weiter
                processDesignElements shape.shapes(i), indexOfLayerInView, currLyrZIndexRelativeToFocused, layer, shapeIsAboveMask, _
                    textLocked, locked, colorAble
            Next i
        
        
        ' GRUPPE NUR MIT BITMAP-FORMEN
        ' ::::::::
        ElseIf Classfactory.newCustomShapeTypeQuery(shape, CorelDrawShape).setArgument1(cdrBitmapShape).isAllShapesMatchingQuery Then
            
            processBitmaps Globals.shapeToShapeRange(shape), locked, colorAble, currLyrZIndexRelativeToFocused, shapesToExportSeperate, shapeIsAboveMask
            
        ' GRUPPE NUR MIT VEKTOR-FORMEN
        ' ::::::::
        ElseIf Classfactory.newCustomShapeTypeQuery(shape, CurveAnyOrText).isAllShapesMatchingQuery Then
            
            processSVGElement shape, locked, colorAble, textLocked, currLyrZIndexRelativeToFocused, shapesToExportSeperate, shapeIsAboveMask
            
            
        ' GRUPPE MIT GEMISCHTEN FORMEN
        ' ::::::::
        Else

            ' Wenn eine Gruppe sowohl Bitmaps als auch Kurven hat und man es als SVG exportiert,
            ' dann bekommt die SVG leider einen weißen Hintergrund von COREL verpasst. Deshalb wird hier alles als Bitmap exportiert
            processBitmaps Globals.shapeToShapeRange(shape), locked, colorAble, currLyrZIndexRelativeToFocused, shapesToExportSeperate, shapeIsAboveMask
        End If
    
    
    
    
    
    ' ### KEINE GRUPPE
    Else
                
        Dim isGradientTransparency As Boolean
        If shape.transparency.Type = cdrFountainTransparency Then
            isGradientTransparency = True
        End If
        
        ' TEXT
        ' ::::::::
        If shape.Type = cdrTextShape Then
            
            If FancyExport.exportText Or textLocked Then
                processCorelText shape, layer.isGraving, locked
            End If
        
        ' KURVE o.Ä.
        ' ::::::::
        ElseIf Globals.isVectorShape(shape) And Not isGradientTransparency Then
            
            processSVGElement shape, locked, colorAble, textLocked, currLyrZIndexRelativeToFocused, shapesToExportSeperate, shapeIsAboveMask
            
            
        ' BITMAP
        ' ::::::::
        ElseIf shape.Type = cdrBitmapShape Or isGradientTransparency Then
            
            processBitmaps shape, locked, colorAble, currLyrZIndexRelativeToFocused, shapesToExportSeperate, shapeIsAboveMask
            
        Else
            GoTo NothingExportedWarn
        End If
        
        ' QR CODES
        ' ::::::::
        ' TODO
    End If
    ' --------------------
    
    GoTo ExitFunction
NothingExportedWarn:
    logger.logWARN "Die Form " & Globals.getShapeDisplayName(shape) & " konnte nicht zugeordnet werden!"
ExitFunction:
    logger.removeTab
End Function




Private Function processRedOrPinkShape(shape As shape)
    
    With newFancyExportJSONImageElement
        .init newShapeExportInZIPFolder(shape, "Hauptform_1", cdrSVG, False)
        
        ' Dem Kunden keine roten/pinken Formen zeigen. Werden erst wieder beim PDF-Export sichtbar
        .excludeFromDesigner = True
        
        .adminLocked = True
        .setTransformationLocked True
        
        .addToMainJSON
    End With
    
End Function




Private Function processGuideLineShape(shape As shape)

    With newFancyExportJSONImageElement
        .init newShapeExportInZIPFolder(shape, "Hilfslinienform_1", cdrSVG, False)
        
        ' Dem Kunden keine Hilflinen Formen zeigen. Werden erst wieder beim PDF-Export sichtbar
        .excludeFromDesigner = True
        
        .adminLocked = True
        .setTransformationLocked True
        
        .addToMainJSON
    End With
    
End Function



Private Function processUploadBoxCutShapeForConfiImportShape(shape As shape)
    
    With newFancyExportJSONImageElement
        .init newShapeExportInZIPFolder(shape, "Uploadbox-Zuschnitt_1", cdrSVG, False)
        
        ' Dem Kunden keine Uploadbox Zuschnitts Formen zeigen. Werden erst wieder beim PDF-Export sichtbar
        .excludeFromDesigner = True
        
        .adminLocked = True
        .setTransformationLocked True
        
        .addToMainJSON
    End With

End Function




Private Function processVariant(shape As shape, indexOfLayerInView As Integer, currLyrZIndexRelativeToFocused As Integer, _
        layer As ProductDesignLayer, shapeIsAboveMask As Boolean, helperShapesToExclude As shapeRange, _
        Optional textLocked As Boolean = False, Optional locked As Boolean = False, Optional colorAble As Boolean = False)
    
    logger.logINFO "[FancyExportView.processVariant] shape: '" & Globals.getShapeDisplayName(shape) & "'"
    logger.addTab
    
    
    Dim i As Integer
    
    Dim variante As variante
    Set variante = layer.getVarianteFromShape(shape)
    
    If variante Is Nothing Then
        Err.Raise vbObjectError + 513, , "[FancyExportView.processVariant] 'variante' für die Form '" & Globals.getShapeDisplayName(shape) & "' konnten nicht gefunden werden"
    End If
    
    If Not variante.getJob Is Nothing Then
        shapeIsAboveMask = shapeIsAboveMask Or variante.getJob.isToPutAboveMainMask
    End If
    
    
    
    ' Gleiche Varianten aus anderen Parts
    ' -------------------------------------------------------------------------------
    ' Es kann sein, dass es in der View mehrere Parts mit der selben Variante wie 'variant' gibt.
    ' Diese sollen dann zusammen exportiert werden
    '
    Dim variants As New collection
    variants.add variante
    
    Dim equalVariantsFromOtherParts As collection
    If Not variante.typee = DesignElementVariantType Then
        Set equalVariantsFromOtherParts = view.getEqualVariantsOfOtherParts(variante, layer.getPart)
        
        ' Wenn es noch andere gleiche Varianten in anderen Parts dieser View gibt...
        If equalVariantsFromOtherParts.count > 0 Then
            ' ... und wenn dieser Part nicht der erste in der View ist ...
            If Not layer.getPart Is view.parts(1) Then
                ' ... dann soll diese Variante nicht exportiert werden, da sie schon vom ersten Part in der View mit seiner Variante zusammen exportiert wurde
                GoTo ExitFunction
            End If
        End If
        
        ' Gleiche Varianten aus anderen Parts hinzufügen
        Globals.combineCollectionToCollection equalVariantsFromOtherParts, variants
        
        Dim variantsShapes As New shapeRange
        For i = 1 To variants.count
            variantsShapes.add variants(i).shape
        Next i
    End If
    ' -------------------------------------------------------------------------------
    
    
    
    Dim isDefaultVariant As Boolean
    
    ' Sinnvoll bei Klingeltastern
    Dim isVarianteFirstInGroup As Boolean
    If variante.typee = LayerVariantType Then
        isVarianteFirstInGroup = layer.getPart.getVariantLayersArray().isVarianteFirstInGroup(variante)
    Else
        isVarianteFirstInGroup = layer.getAllVariants.isVarianteFirstInGroup(variante)
    End If
    
    isDefaultVariant = (isVarianteFirstInGroup)
    
    
    
    ' Feststellen, welches die ausgewählte / sichtbare Variante aus der selben Gruppe wie 'variante' ist
    '
    ' Wichtig: Das Feststellen von der ausgewählten/sichtbaren Variante muss erfolgen, bevor 'variante' sichtbar gemacht wird
    ' ---------------------------------------------------------------------------------
    Dim activeVariantOfSameGroup As variante
    
    If variante.typee = DesignElementVariantType Then
        Set activeVariantOfSameGroup = layer.getVariantsOfType(DesignElementVariantType).getActiveVariantOfGroupFromVariante(variante)
        If activeVariantOfSameGroup Is Nothing Then
            MsgBox "Für die Variante " & variante.variantGroupName & " gibt es keine Standartauswahl. Keine Variante davon ist sichtbar", vbOKOnly Or vbCritical, Application.name
            Globals.endMacro
        End If
        
        logger.logINFO "variante: '" & variante.toString & "'"
        logger.logINFO "activeVariantOfSameGroup: '" & activeVariantOfSameGroup.toString & "'"
    End If
    ' ---------------------------------------------------------------------------------
    
    
    
    
    Dim isActiveVariante As Boolean
    If variante.shape.visible Then
        isActiveVariante = True
    End If
    
    Dim designIsFirstToExportInCDR As Boolean
    designIsFirstToExportInCDR = view.confiEx.exportIndex = 1
    
    
    ' Vorher sichtbar machen, sonst kann man nicht exportieren
    variante.shape.visible = True
    logger.logINFO "'" & Globals.collectionToMultiLineStr(Globals.getShapesDisplayName(Globals.shapeToShapeRange(variante.shape))) & "' sichtbar gemacht!"
    
    Select Case variante.typee
    ' Statische Variante
    Case variantType.StaticVariantType
        processStaticVariant variante, variants, variantsShapes, isDefaultVariant, isVarianteFirstInGroup, layer, shapeIsAboveMask, designIsFirstToExportInCDR, helperShapesToExclude
    
    ' Grundplatte Variante
    Case variantType.GroundplateVariantType
        processGroundPlate variante, variants, variantsShapes, isDefaultVariant, isVarianteFirstInGroup, layer, view.index, indexOfLayerInView, currLyrZIndexRelativeToFocused, designIsFirstToExportInCDR, helperShapesToExclude
    
    ' Designelement Variante
    Case variantType.DesignElementVariantType
        processDesignElementVariant variante, isActiveVariante, activeVariantOfSameGroup, indexOfLayerInView, currLyrZIndexRelativeToFocused, layer, view.index, shapeIsAboveMask, helperShapesToExclude
        
    ' Schicht Variante
    Case variantType.LayerVariantType
        processVariantLayer variante, variants, variantsShapes, isDefaultVariant, isVarianteFirstInGroup, layer, designIsFirstToExportInCDR, helperShapesToExclude
        
    End Select
    
    variante.shape.visible = isActiveVariante
    logger.logINFO "'" & Globals.collectionToMultiLineStr(Globals.getShapesDisplayName(Globals.shapeToShapeRange(variante.shape))) & "' sichbar am Ende: '" & variante.shape.visible & "'"
    
ExitFunction:
    logger.removeTab
End Function



Private Function processLook(shape As shape)

    logger.addTab , "[FancyExportView.processLook]"
    
    ' JSON
    ' ----------------------------
    With newFancyExportJSONImageElement
        .init newShapeExportInZIPFolder(shape, "Look_1", cdrPNG)
        .setTransformationLocked True
        .topped = True
        .excludeFromExport = True
        .adminLocked = True
        
        .addToMainJSON
    End With
    ' ----------------------------
    
    logger.removeTab
End Function





Private Function processUploadBox(uploadBox As shape, layer As ProductDesignLayer)
    
    logger.addTab , "[FancyExportView.processUploadBox]"
    
    
    Dim isBounded As Boolean
    isBounded = Globals.isUploadBox(uploadBox, BoundedUploadBoxType)
    
    Dim isPowerClip As Boolean
    isPowerClip = Globals.isShapePowerclip(uploadBox)
    
    Dim exportShapes As New shapeRange
    exportShapes.add uploadBox
    
    Dim uploadBoxPhoto As shape
    Dim svgPhotoShapes As shapeRange
    
    Dim fileType As cdrFilter
        
    If Not isBounded Then
    
        fileType = cdrPNG
        
        Set uploadBoxPhoto = Globals.getPhotoOfUploadBoxGroup(uploadBox, logger)

        ' Uploadbox-Bild unsichtbar machen
        Globals.makeShapeInvisibleForExport uploadBoxPhoto
        
    Else
        fileType = cdrSVG
        
        exportShapes.RemoveAll
        
        Set svgPhotoShapes = New shapeRange
        
        ' Form erstellen, die dann als SVG Fotomaske für den Fancy auf Shopify dient
        Dim svgPhoto As shape
        Set svgPhoto = ActiveLayer.CreateCurve(Globals.getUploadboxBoundingShapeCurve(uploadBox))
        svgPhoto.fill.ApplyUniformFill getUploadboxAutoColor(layer)
        svgPhoto.outline.Type = cdrNoOutline
        
        svgPhotoShapes.add svgPhoto
        ' Eine Bitmap Kopie von "Uploadzone hier hochladen" o.Ä.
        Dim yourPhotoShape As shape
        Set yourPhotoShape = Globals.copyPasteShape(Globals.getYourPhotoTextGroupOfUploadBoxGroup(uploadBox), True)
        ' SVG Foto zur Uploadbox ordern, damit der Z-Index für die Fancy JSON nicht verfälscht wird. (Ansonsten liegt das Foto außerhalb vom Design)
        svgPhoto.OrderBackOf yourPhotoShape
        
        Dim yourPhotoBoundingBoxShape As shape
        Set yourPhotoBoundingBoxShape = ActiveLayer.CreateRectangleRect(yourPhotoShape.boundingBox)
        ' Für die Hintergrundbox von 'yourPhotoShape' die Farbe vom svgPhoto nutzen, denn das kann schwarz oder weiß sein
        yourPhotoBoundingBoxShape.CopyPropertiesFrom svgPhoto, cdrCopyFill
        yourPhotoBoundingBoxShape.outline.SetNoOutline
        
        yourPhotoBoundingBoxShape.OrderBackOf yourPhotoShape
        
        Dim yourPhotoShapes As New shapeRange
        yourPhotoShapes.add yourPhotoShape
        yourPhotoShapes.add yourPhotoBoundingBoxShape
        
        Dim yourPhotoBitmapShape As shape
        ' Wenn die Uploadbox eine Powerclip ist, muss man im Editmode sein, um Inhalt davon zu einer Bitmap zu rastern
        ' Das gilt auch für Globals.intersectShapes. Deshalb wird der Editmode auch erst ganz am Ende geschlossen
        If isPowerClip Then
            uploadBox.powerClip.EnterEditMode
        End If
        ' 300 DPI würden auch reichen, allerdings rastert Corel beim erstellen der SVG das Bild in die SVG neu. Also sehen > 300 DPI schärfer aus, obwohl ca. 300 rauskommen
        Set yourPhotoBitmapShape = yourPhotoShapes.ConvertToBitmapEx(resolution:=600)
        
        Set yourPhotoBitmapShape = Globals.intersectShapes(svgPhoto, yourPhotoBitmapShape)
        
        svgPhotoShapes.add yourPhotoBitmapShape
        yourPhotoShapes.delete
        
        exportShapes.AddRange svgPhotoShapes
        
    End If
    
    
    Dim title As String
    title = "Dein_Foto" & "_#" & (uploadBoxesExported + 1)
    
    With newFancyExportJSONImageElement
        ' 'uploadBox' als Shape für die Z-Index Berechnung mitgeben, da die (potenzielle) Powerclip keine Gruppe ist und deren Childs keine Z-Indexe haben
        .init newShapeExportInZIPFolder(exportShapes, "Uploadbox_" & uploadBoxesExported + 1, fileType), , title, , uploadBox
        .isUploadBox = True
        
        .addToMainJSON
    End With
    
    If Not svgPhotoShapes Is Nothing Then svgPhotoShapes.delete
    uploadBoxesExported = uploadBoxesExported + 1
    
ExitFunction:
    If isPowerClip Then
        uploadBox.powerClip.LeaveEditMode
    End If
    logger.removeTab
End Function



Public Function getUploadboxAutoColor(layer As ProductDesignLayer) As color
    
    Dim shapesForColorSample As shapeRange
    Set shapesForColorSample = layer.newCustomShapeTypeQuery(DesignElementShapeType).setExcludeInvisibleShapes(True).setContinueSearchInMatchedGroups(False).search
    shapesForColorSample.RemoveRange Classfactory.newCustomShapeTypeQuery(shapesForColorSample, uploadBox).search
    shapesForColorSample.AddRange layer.newCustomShapeTypeQuery(groundPlate).setExcludeInvisibleShapes(True).setContinueSearchInMatchedGroups(False).search
    
    Set shapesForColorSample = Globals.copyPasteShapeRange(shapesForColorSample)
    
    If shapesForColorSample.count = 0 Then
        Err.Raise vbObjectError + 513, , "[FancyExportView.getUploadboxAutoColor] 'shapesForColorSample.count' ist 0. Es wurden keine Formen für ein Colorsampling gefunden "
    End If
    
    Dim sampleBitmap As shape
    Set sampleBitmap = shapesForColorSample.convertToBitmap
    sampleBitmap.name = "FancyExport.getUploadboxAutoColor.sampleBitmap"
    
    Dim samples As collection
    Set samples = Globals.getImageSamples(sampleBitmap.bitmap.image, 50)
    
    If mostlyWhite(samples) Then
        Set getUploadboxAutoColor = CreateColor("#000000") ' Schwarz
    Else
        Set getUploadboxAutoColor = CreateColor("#FFFFFF") ' Weiß
    End If
    
    sampleBitmap.delete
    
End Function




Public Function mostlyWhite(ByVal colors As collection, _
                            Optional ByVal WhiteRatioThreshold As Double = 0.85, _
                            Optional ByVal MinBrightness As Double = 240, _
                            Optional ByVal MaxSpread As Long = 15) As Boolean
    mostlyWhite = (percentWhite(colors, MinBrightness, MaxSpread) >= WhiteRatioThreshold)
End Function

Public Function percentWhite(ByVal colors As collection, _
                             Optional ByVal MinBrightness As Double = 240, _
                             Optional ByVal MaxSpread As Long = 15) As Double
    Dim i As Long, c As color
    
    Dim whiteCount As Long
    
    whiteCount = 0
    For Each c In colors
        
        If isWhiteRGB(c, MinBrightness, MaxSpread) Then
            whiteCount = whiteCount + 1
        End If
    Next c
    
    If colors.count > 0 Then
        percentWhite = whiteCount / colors.count
    Else
        percentWhite = 0
    End If
End Function



Private Function isWhiteRGB(color As color, _
                            Optional ByVal MinBrightness As Double = 240, _
                            Optional ByVal MaxSpread As Long = 15) As Boolean
    
    Dim r As Long, g As Long, b As Long
    r = color.RGBRed: g = color.RGBGreen: b = color.RGBBlue
    
    ' Perceived brightness (NTSC-gewichtet)
    Dim brightness As Double
    brightness = 0.299 * color.RGBRed + 0.587 * color.RGBGreen + 0.114 * color.RGBBlue
    
    ' Geringe Farbsättigung: Kanäle liegen nahe beieinander
    Dim maxc As Long, minc As Long, spread As Long
    maxc = Globals.max3(r, g, b)
    minc = Globals.min3(r, g, b)
    spread = maxc - minc
    
    isWhiteRGB = (brightness >= MinBrightness) And (spread <= MaxSpread)
End Function







Private Function processMainMask(maskShape As shape)
    
    logger.addTab , "[FancyExportView.processMainMask]"
    
    If Globals.isShapeDeleted(maskShape) Then Err.Raise vbObjectError + 513, , "[FancyExportView.processMainMask] 'maskShape' ist ungültig "
    
    With newFancyExportJSONImageElement
        .init newShapeExportInZIPFolder(maskShape, "Hauptmaske", cdrPNG).setBoundingBoxShape(ConfiHelper.confiBoundingBox), , "Hauptmaske"
        .setTransformationLocked True
        .adminLocked = True
        .topped = True
        .excludeFromExport = True
        
        .addToMainJSON
    End With
    
ExitFunction:
    logger.removeTab
End Function






Private Function processBitmaps(shapeOrRange As Variant, locked As Boolean, colorAble As Boolean, currLyrZIndexRelativeToFocused As Integer, helperShapesToExclude As shapeRange, shapeIsAboveMask As Boolean)
    
    logger.addTab , "[FancyExportView.processBitmaps]"
    
    Dim groupName As String
    
    Dim bitmapShapes As shapeRange
    Set bitmapShapes = Globals.ensureShapeRange(shapeOrRange)
    
    
    logger.logINFO "bitmapShapes: " & bitmapShapes.count
    
    Dim fileName As String
    fileName = getShapesJSONNameForFancy(bitmapShapes)
    If fileName = "" Then
        imagesExported = imagesExported + 1
        fileName = "Bild_" & imagesExported
    End If
    
    logger.logINFO "bitmapShapes: " & bitmapShapes.count
    
    Dim fileType As cdrFilter
    If Globals.isShapeRangeExportableAsJPEG(bitmapShapes, logger) Then
        fileType = cdrJPEG
    Else
        fileType = cdrPNG
    End If
    
    
    logger.logINFO "bitmapShapes: " & bitmapShapes.count
    
    ' JSON
    ' ----------------------------
    With newFancyExportJSONImageElement
        .init newShapeExportInZIPFolder(bitmapShapes, fileName, fileType).addShapesToExclude(helperShapesToExclude), newShapeExportInZIPFolderForPrint(bitmapShapes, fileName, fileType).addShapesToExclude(helperShapesToExclude)
        ' Wenn dieser Layer über dem Fokusierten ist, dann muss er topped sein
        ' Denn die fokusierte Schicht kann ja z.B: einen Look haben. Diese sind ja immer topped
        ' Damit dann dieser Layer wirklich über dem fokusierten Layer ist, müssen diese shapes topped sein
        If currLyrZIndexRelativeToFocused > 0 Or shapeIsAboveMask Then
            .topped = True
        End If
        
        .colorAble = colorAble
        .locked = locked
        
        .addToMainJSON
    End With
    ' ----------------------------
    
    logger.removeTab
End Function




Private Function processSVGElement(curveShapeOrShapes As Variant, locked As Boolean, colorAble As Boolean, textLocked As Boolean, currLyrZIndexRelativeToFocused As Integer, _
        helperShapesToExclude As shapeRange, shapeIsAboveMask As Boolean, Optional forceTextToSVG As Boolean = False)
    
    logger.addTab , "[FancyExportView.processSVGElement]"
    
    Dim curveShapes As shapeRange
    Set curveShapes = Globals.ensureShapeRange(curveShapeOrShapes)
    
    ' Kurven mit zu vielen Punkten als Bitmap exportieren
    ' --------------------------------------------------------
    If Globals.getShapeRangeCurveNodeCount(curveShapes) > 10000 Then
        processBitmaps curveShapes, locked, colorAble, currLyrZIndexRelativeToFocused, helperShapesToExclude, shapeIsAboveMask
        GoTo ExitFunction ' Hier abbrechen
    End If
    ' --------------------------------------------------------
    
    
    ' Gruppenname ermitteln
    Dim groupName As String
    If curveShapes.count = 1 Then
        ' Wenn es nur eine Form und vom Typ Gruppe ist
        If curveShapes.firstShape.Type = cdrGroupShape Then
            If Not curveShapes.firstShape.name = "" Then groupName = curveShapes.firstShape.name
        End If
    End If
    
    ' Feststellen, ob es ein RDG_White Shape ist
    Dim isRDG_WhiteShape As Boolean
    If curveShapes.count = 1 Then
        If Classfactory.newCustomShapeTypeQuery(curveShapes.firstShape, RGD_WhiteShape).isShapesMatchingQueryNonRecursive Then
            isRDG_WhiteShape = True
        End If
    End If
    
    Dim shapesToExclude As New shapeRange
    
    If Not forceTextToSVG Then
        ' Texte ausschließen, die nicht exportiert werden sollen
        shapesToExclude.AddRange Classfactory.newCustomShapeTypeQuery(curveShapes, TextAny).search
    End If
    
    
    If Globals.getShapeRangeCount(shapesToExclude) >= Globals.getShapeRangeCount(curveShapes) Then
        logger.logINFO "Es gibt keine Formen zum exportieren. Wahrscheinlich waren es nur Texte, die aber für den Fancy nicht exportiert werden. Abbruch!"
        GoTo ExitFunction
    End If
    
    Dim fileName As String
    fileName = getShapesJSONNameForFancy(curveShapes)
    If fileName = "" Then fileName = "Kurve_1"
    
    ' Unbedingt vor dem Export die Deckkraft extrahieren
    Dim opacity As Double
    opacity = extractOpacity(curveShapes)
    
    
    ' Einfärbbarkeit prüfen oder erzwingen
    ' ----------------------------
'    If forceColorAble Then colorAble = True
    If colorAble And Globals.isShapeRangeHavingMoreThanOneColor(curveShapes) Then colorAble = False
    ' ----------------------------
    
    
    ' JSON
    ' ----------------------------
    With newFancyExportJSONImageElement
        .init newShapeExportInZIPFolder(curveShapes, fileName, cdrSVG).addShapesToExclude(shapesToExclude).addShapesToExclude(helperShapesToExclude).setPreventFileOverride(True)
        .setTransformationLocked locked Or isRDG_WhiteShape
        .opacity = opacity
        .colorAble = colorAble
        
        ' Wenn dieser Layer über dem Fokusierten ist, dann muss er topped sein
        ' Denn die fokusierte Schicht kann ja z.B: eine Look haben. Diese sind ja immer topped
        ' Damit dann dieser Layer wirklich über dem fokusierten Layer ist, müssen diese shapes topped sein
        If currLyrZIndexRelativeToFocused > 0 Then
            .topped = True
        End If
        
        .addToMainJSON isRDG_WhiteShape
    End With
    ' ----------------------------

ExitFunction:
    logger.removeTab
End Function




Private Function processCorelText(textShape As shape, isLayerGraving As Boolean, locked As Boolean)
    
    logger.logINFO "[FancyExportView.processCorelText]"
    logger.addTab
    
    Dim textSplits As collection
    Set textSplits = textToKonfiTextSplits(textShape, False)
    
    Dim i As Integer
    For i = 1 To textSplits.count
        processKonfiText textSplits(i), isLayerGraving, locked
    Next i
    
    logger.removeTab
End Function


Private Function processKonfiText(textSplit As FancyExportTextSplit, isLayerGraving As Boolean, locked As Boolean)
    
    Dim textElement As FancyExportJSONTextElement
    Set textElement = newFancyExportJSONTextElement
    textElement.init textSplit, locked
    
    If Not isLayerGraving Then textElement.imageElement.colorAble = True
    
    textElement.addToMainJSON
End Function



Private Function processGroundPlate(variante As variante, variants As collection, variantsShapes As shapeRange, isDefaultVariant As Boolean, isVarianteFirstInGroup As Boolean, layer As ProductDesignLayer, viewIndex As Integer, _
        indexOfLayerInView As Integer, currLyrZIndexRelativeToFocused As Integer, designIsFirstToExportInCDR As Boolean, helperShapesToExclude As shapeRange)
    
    logger.addTab , "[FancyExportView.processGroundPlate]"
    
    Dim shapesToExport As New shapeRange
    
    
    
    shapesToExport.AddRange variantsShapes
    
    Dim fileType As cdrFilter
    ' Da sich Grundplatten die eine SVG sind nicht im Fancy im Bearbeitungsmodus austauschen lassen, sind SVGs hier nicht mehr möglich
    If Classfactory.newCustomShapeTypeQuery(shapesToExport, CurveAny).isAllShapesMatchingQuery Then
        fileType = cdrSVG
    ElseIf currLyrZIndexRelativeToFocused = 0 Or Globals.isShapeRangeExportableAsJPEG(shapesToExport) Then
        fileType = cdrJPEG
    Else
        fileType = cdrPNG
    End If
    

    ' Bestimmen, ob die Grundplatte nach einer Bestellung zum Produzieren mitexportiert wird
    ' ----------------------------
    Dim excludeFromExport As Boolean
    excludeFromExport = True
    
    If Not layer.isGraving Then
        Dim subJob As PlaceFileSubJob
        If Not variante.getJob Is Nothing Then
            Set subJob = variante.getJob.getSubJob(1)
        End If
        
        If Not subJob Is Nothing Then
            ' Nur bei UV Grundplatten, die das wollen mitdrucken
            excludeFromExport = Not subJob.isForPrint
        End If
    End If
    ' ----------------------------
    
    
    
    ' JSON
    ' ----------------------------
    With newFancyExportJSONImageElement
        
        ' Optionale Printversion
        Dim shapeExPrint As ShapeExport
        If Not excludeFromExport Then
            Set shapeExPrint = newShapeExportInZIPFolderForPrint(shapesToExport, variante.variantName, fileType)
            shapeExPrint.addShapesToExclude helperShapesToExclude
        End If
        
        .init newShapeExportInZIPFolder(shapesToExport, variante.variantName, fileType).addShapesToExclude(helperShapesToExclude), shapeExPrint
        
        .adminLocked = True
        .setTransformationLocked True
        .excludeFromExport = excludeFromExport
        
        ' Wenn dieser Layer über dem Fokusierten ist, dann muss er topped sein
        ' Denn die fokusierte Schicht kann ja z.B: einen Look haben. Diese sind ja immer topped
        ' Damit dann dieser Layer wirklich über dem fokusierten Layer ist, müssen diese shapes topped sein
        If currLyrZIndexRelativeToFocused > 0 Then
            .topped = True
        End If
        
        .price = variante.price
        
        .addToMainJSON
    End With
    ' ----------------------------
    
    
ExitFunction:
    logger.removeTab
End Function




Private Function processVariantLayer(variante As variante, variants As collection, variantsShapes As shapeRange, isDefaultVariant As Boolean, isVarianteFirstInGroup As Boolean, layer As ProductDesignLayer, designIsFirstToExportInCDR As Boolean, _
        helperShapesToExclude As shapeRange)
    
    Dim emptyShape As shape
    
    If variante.variantIsEmptyVariant Then
        ' Leere Form hinzufügen, da leere Varianten nur rote/pinke Formen haben
        Set emptyShape = Globals.createEmptyShapeForEmptyExport(variante.shape.boundingBox)
        variantsShapes.add emptyShape
    End If
    
    processStaticVariant variante, variants, variantsShapes, isDefaultVariant, isVarianteFirstInGroup, layer, True, designIsFirstToExportInCDR, helperShapesToExclude
    
    If Not emptyShape Is Nothing Then emptyShape.delete
    
End Function


Private Function processDesignElementVariant(variante As variante, isActiveVariante As Boolean, activeVariantOfSameGroup As variante, _
        indexOfLayerInView As Integer, currLyrZIndexRelativeToFocused As Integer, _
        layer As ProductDesignLayer, viewIndex As Integer, shapeIsAboveMask As Boolean, helperShapesToExclude As shapeRange, _
        Optional textLocked As Boolean = False, Optional locked As Boolean = False, Optional colorAble As Boolean = False)
    
    logger.addTab , "[FancyExportView.processDesignElementVariant] variante: '" & variante.toString & "'"
    
    
    ' JSON
    ' ----------------------------
    With newFancyExportJSONImageElement
        .init newShapeExportInZIPFolder(variante.shape, "Design-Variante_" & variante.getDesingVariantGroupIndex & "-" & variante.getDesignVariantChildIndex, getShapesFilterType(variante.shape)).addShapesToExclude(helperShapesToExclude)
        .setTransformationLocked True
        .adminLocked = True
        .topped = shapeIsAboveMask
        
        .price = variante.price
        
        .addToMainJSON
    End With
    ' ---------------------------
    
    
ExitFunction:
    logger.removeTab
End Function


Public Function processStaticVariant(variante As variante, variants As collection, variantsShapes As shapeRange, isDefaultVariant As Boolean, isVarianteFirstInGroup As Boolean, layer As ProductDesignLayer, shapeIsAboveMask As Boolean, _
    designIsFirstToExportInCDR As Boolean, Optional helperShapesToExclude As shapeRange)
    
    logger.addTab , "[FancyExportView.processStaticVariant] variante: (Gruppe:'" & variante.variantGroupName & "', Name:'" & variante.variantName & "')"
    
    Dim shapeEx As ShapeExport
    Set shapeEx = newShapeExportInZIPFolder(New shapeRange, variante.getNameForFancyZIP, cdrPNG)
    
    ' Für leere Varianten wie "Befestigung ohne"
    shapeEx.setExportFullyInvisibleShapeRange True
    
    If Not variante.variantIsEmptyVariant Then
        shapeEx.getShapes.AddRange variantsShapes
    Else
        
        ' Eine 1x1 Pixel große PNG exportieren, da die Variante sowieso leer ist (aber eben so groß ist, wie das Produkt, nicht 1x1 Pxl)
        shapeEx.setWidth 1
        shapeEx.setHeight 1
    End If
    
    ' Hilfsformen ausschließen
    If Not helperShapesToExclude Is Nothing Then shapeEx.addShapesToExclude helperShapesToExclude
    
    ' JSON
    ' ----------------------------
    With newFancyExportJSONImageElement
        .init shapeEx
        
        .setTransformationLocked True
        .adminLocked = True
        .topped = shapeIsAboveMask
        .excludeFromExport = True
        
        .price = variante.price
        
        .addToMainJSON shapeIsAboveMask
    End With
    ' ----------------------------

    logger.removeTab
End Function




' Berechnet anhand der Transparenz der ersten Form den Wert 'opacity' (Deckkraft. 1 = volle Deckkraft, 0 = Transparent)
Private Function extractOpacity(shapes As shapeRange) As Double
    
    Dim lowestTransparency As Integer
    lowestTransparency = 100
    
    Dim shape As shape
    
    Dim i As Integer
    For i = 1 To shapes.count
       
        Set shape = shapes(i)
            
        If shape.transparency.Type = cdrUniformTransparency Then
            If shape.transparency.Uniform < lowestTransparency Then
                lowestTransparency = shape.transparency.Uniform
            End If
        ElseIf shape.transparency.Type = cdrNoTransparency Then
            ' Eine Form besitzt keine Transparenz. Das bedeutet, dass es keinen Sinn macht die Transparenz zu extrahieren.
            ' Extrahieren heißt: Die SVG ohne Transparenz zu exportieren und den Transparenz-Wert an den Fancy weitergeben, damit der Kunde den Wert regeln kann
            extractOpacity = 1
            Exit Function
        Else
            ' Eine Form hat eine spezielle Transparenz
            ' Diese lässt sich nur schwer runterschrauben. Deshalb beenden
            extractOpacity = 1
            Exit Function
        End If
            
        Set shape = Nothing
    Next i
    
    ' Transparenz ausstellen/runterschrauben, da der Wert 'opacity' dann im Fancy die Transparenz regelt
    For i = 1 To shapes.count
        Set shape = shapes(i)
        
        Dim transparencyBefore As Integer
        transparencyBefore = shape.transparency.Uniform
        
        shape.transparency.Uniform = shape.transparency.Uniform - lowestTransparency
        
        Set shape = Nothing
    Next i
    
    
    extractOpacity = 1 - (lowestTransparency / 100)
End Function


' Da im Fancy und Amazon Konfigurator die Texteigenschaften (wie Schriftfarbe, Größe etc) pro Text gelten und nicht pro Zeichen wie in Corel,
' müssen Zeichen/Zeichenketten die voneinander abweichen in einzelne Konfi-Texte (Splits) aufgeteilt werden
' ACHTUNG: Erlaubt nur freien Text. Bei Textboxen hat jede Zeile nähmlich ihre eigene Textausrichtung
' Konvertiert eine Corel-Schriftgröße in Punkt in die Fancy-Font-Einheit.
' Der Fancy arbeitet mit Pixeln bei 300 DPI: Punkt / 72 * 300.
' Erwartet die bereits auf Konfigröße skalierte Schriftgröße; physische Größen
' vor dem Aufruf mit shapesScale multiplizieren.
Public Function pointToFancyFontUnit(pointSize As Double) As Double
    pointToFancyFontUnit = pointSize / POINTS_PER_INCH * FANCY_EXPORT_DPI
End Function


' Wurde mit einer Testgravur auf Edelstahl entschieden. 12 Einheiten im Fancy ist die minimal gravierbare Größe für Texte.
' Jetzt aus der physischen Mindesthöhe (MIN_GRAVABLE_FONT_SIZE_PT) abgeleitet:
' physische Größe -> auf Konfigröße skalieren -> in Fancy-Einheit umrechnen.
Public Function getMinimumGravableFontSizeInFancyFontUnit()
    getMinimumGravableFontSizeInFancyFontUnit = pointToFancyFontUnit(FancyExport.MIN_GRAVABLE_FONT_SIZE_PT * view.shapesScale)
End Function


' Diese Formel erlaubt einen Text bei einem Produkt, welches die volle Höhe des Konfis - Padding ausfüllt eine Schrifthöhe von maximal 1000 zu haben
Public Function getMaximumFontSizeInFancyFontUnit()
    getMaximumFontSizeInFancyFontUnit = view.shapeRangeForViewFitting.SizeHeight * (1000 / (FancyExport.CONFI_DEFAULT_HEIGHT - FancyExport.CONFI_PADDING_TOP - FancyExport.CONFI_PADDING))
End Function


Private Function textToKonfiTextSplits(textShape As shape, Optional allowLineBreaksOnlyForCenteredText As Boolean = False) As collection
    logger.addTab , "[FancyExportView.textToKonfiTextSplits]"
    
    Dim textSplitsToReturn As New collection
    
    Dim startingIndex As Integer
    startingIndex = 1
    
    
    
    
    ' Der Fancy verwendet nur ganze Zahlen für Textgrößen (Im Bearbeitungsmodus zeigt er Kommazahlen an, nicht aber im Frontend)
    ' Wenn der Fancy also eine Textgröße von 5,9 auf 5 runterskaliert, macht er es zum Mittelpunkt des Textes.
    ' Das ist bei mittelbündigen Texten kein Problem. Allerdings bei links oder rechtsbündigen Text
    ' Deshalb runden wir hier die Fontsize auf eine ganze Zahl und skalieren den Text passend auf diese Zahl.
    ' Ist der Text dann linksbündig, skalieren wir nicht mittig, sondern nach links hin.
    ' ===========================================
    Dim oldFontSize As Double
    oldFontSize = pointToFancyFontUnit(Globals.getRealFontSize(textShape))
    Dim newFontSize As Integer
    newFontSize = Globals.round(oldFontSize, 0)
    
    If newFontSize = 0 Then
        Err.Raise vbObjectError + 513, , "[FancyExportView.textToKonfiTextSplits] Corel gibt eine winzige Schriftgröße aus. Das kann daran liegen, dass mehrere Schriftarten in einem Text verwendet wurden. Oder wegen Sonderzeichen."
    End If
    
    Dim scaleFactor As Double
    scaleFactor = newFontSize / oldFontSize
    ' Herausfinden zu welchem Punkt hiniskaliert werden soll
    ' --------------------------
    Dim xCenterPos As Double
    Select Case textShape.text.Story.alignment
        Case cdrLeftAlignment
            xCenterPos = textShape.LeftX
        Case cdrCenterAlignment, cdrNoAlignment
            xCenterPos = textShape.centerX
        Case cdrRightAlignment
            xCenterPos = textShape.RightX
    End Select
    ' --------------------------
    textShape.SetSizeEx xCenterPos, textShape.centerY, textShape.SizeWidth * scaleFactor, textShape.SizeHeight * scaleFactor
    ' ===========================================
    
    
    
    
    
   
    Dim currentFontForError As String
   
    Dim widthOfProcessedRangesInLine As Double
    
    Dim i As Integer
    
    For i = 1 To textShape.text.Story.Characters.count
        Dim char As textRange
        Set char = textShape.text.Story.Characters(i)
        
        Dim nextChar As textRange
        
        Dim isEndOfText As Boolean
        isEndOfText = (i = textShape.text.Story.Characters.count)
        
        If Not isEndOfText Then
            Set nextChar = textShape.text.Story.Characters(i + 1)
        End If
        
        Dim isNewLine As Boolean
        isNewLine = Asc(char.Characters(1)) = Asc(vbNewLine)
        
        If isNewLine Then
            widthOfProcessedRangesInLine = 0 ' Neue Zeile wird angefangen
        End If
        
        
        'Neue Zeile etc überspringen (Das Zeichen vbNewLine, wird hiermit übersprungen)
        If Not (isNewLine And Not allowLineBreak(allowLineBreaksOnlyForCenteredText, char)) Then
            
            'Wenn die Eigenschaften vom jetzigen Zeichen nicht mit dem vom Nächsten übereinstimmen, wird der bisherige Text als eine Textbox gespeichert
            'Wenn diese Textzeile mit Leerzeichen endet, können diese ignoriert werden, da Corel das auch macht (isTextLineEndingWithSpaces)
            If Not charsHaveSameProperties(char, nextChar, isEndOfText, allowLineBreaksOnlyForCenteredText) Or isTextLineEndingWithSpaces(char, nextChar, textShape.text.Story, i + 1) Then
                
                
                'Gelichartige Buchstaben zusammengefasst (Gleichartig = selbe Schrift usw.)
                Dim equalTextRange As textRange
                Set equalTextRange = textShape.text.Story.range(startingIndex - 1, i)
                
                FancyExport.dummyText.text.Story.text = equalTextRange.text
                
                currentFontForError = equalTextRange.font
                
                ' Eine 'Nicht bearbeitbare, eingebettetet Schrift'
                ' Es ist ein Schriftprobem. Die Textkodierung zeigt auch keine Vorschau des Textes mehr an in einem derart fehlerhaften Dokument
                ' Fehler 440 Automatisierungsfehler (Der eingefügte Text ist abgeschnitten. Sogar ziemlich stark. Ist aber wohl nur ein Anzeigefehler)
                On Error GoTo UneditableEmbeddedFontFound:
                dummyText.text.Story.copyAttributes equalTextRange
                On Error GoTo 0
                
                
                If Not isTextOnlySpaces(equalTextRange.text) Then
                    
                    
                    Dim boundingBoxOfCurrentText As rect
                    
                    
                    If hasTextRangeMultipleLines(equalTextRange) Then ' Wenn der Text mehrere Zeilen enthält...
                        Set boundingBoxOfCurrentText = equalTextRange.TextLineRects.boundingBox ' ... dann nutze die Größe aller Zeilen in 'equalTextRange'
                    Else
                        Set boundingBoxOfCurrentText = equalTextRange.TextLineRects.subPaths(1).boundingBox ' ... wenn nicht, dann nur die Erste (Muss gemacht werden, da Corel bei mehrzeiligen Texten, bei der ersten Zeile trotzdem noch die 2. Zeile mitgibt)
                    End If
                        
                        
                    boundingBoxOfCurrentText.y = equalTextRange.Baselines.boundingBox.centerY - (char.size * 4.1469 / 123# * 44# * 0.6853)
                    boundingBoxOfCurrentText.height = (char.size * 4.1469 / 123# * 209# * 0.6853)
                    
                    
                    
                    Dim theText As String
                    
                    If equalTextRange.Case = cdrAllCapsFontCase Then
                        theText = UCase(equalTextRange.text)
                    Else
                        theText = equalTextRange.text
                    End If
                    
                    
                    ' Die breiteste Textzeile bestimmt die Breite für den Mittelpunkt der Export-Textbox (bei mehreren, die in eine Textbox kommen am Ende (im Fancy z.B.))
                    Dim equalTextMaxWidthHalf As Double
                    equalTextMaxWidthHalf = (dummyText.text.Story.TextLineRects.boundingBox.width / 2#)
                    
                    Dim x As Double
                    x = boundingBoxOfCurrentText.left + widthOfProcessedRangesInLine
                    
                    ' Je nach Ausrichtung des Textes wird auch der Origin Punkt anders
                    Select Case textShape.text.Story.alignment
                        Case cdrLeftAlignment
                            ' Passt schon
                        Case cdrCenterAlignment, cdrNoAlignment, cdrFullJustifyAlignment
                            x = x + equalTextMaxWidthHalf
                        Case cdrRightAlignment
                            x = x + equalTextMaxWidthHalf * 2
                    End Select
                    
                    
                    'logger.logFINER "theText=" & theText & ", x: " & x & ", boundingBoxOfCurrentText.left: " & boundingBoxOfCurrentText.left & ", widthOfProcessedRangesInLine: " & widthOfProcessedRangesInLine & ""
                    
                    Dim y As Double
                    y = boundingBoxOfCurrentText.centerY
                    
                    ' DEBUG Form für Position
'                    Dim rectSize As Double
'                    rectSize = ActiveDocument.ToUnits(10, cdrPixel)
'                    ActiveLayer.CreateRectangle x - rectSize, y + rectSize, x + rectSize, y - rectSize
'                    ActiveShape.fill.ApplyUniformFill CreateColor("#00FF00")
'                    ActiveShape.outline.SetNoOutline
                    
                    
                    Dim isBold As Boolean
                    isBold = char.bold
                    If Not isBold Then
                        ' Eine Outline genau so behandeln als sei es Bold. Denn vermutlich gab es für diese Schrift kein Bold Schriftschnitt. Deshalb hat der Designer eine Outline genommen.
                        ' Fancy macht bei Bold eine Fake-Bold-Outline
                        ' Aber erst ab einer bestimmten Dicke der Outline sollte bold genutzt werden
                        If Not textShape.outline.Type = cdrNoOutline And ActiveDocument.FromUnits(textShape.outline.width, cdrPixel) > textShape.text.Story.size / 12 Then
                            isBold = True
                        End If
                    End If
                    
                    
                    Dim konfiText As New FancyExportTextSplit
                    With konfiText
                        Set .shape = textShape ' TODO nötig???? Wird ja schon beim Aufrufen vom Aufrufer mitgegeben
                        .text = Globals.replaceLineBreaks(theText, "\n")
                        
                        .x = x
                        .y = y
                        .width = boundingBoxOfCurrentText.width
                        .height = boundingBoxOfCurrentText.height
                        .size = pointToFancyFontUnit(char.size)
                        .angle = textShape.RotationAngle
                        
                        .color = char.fill.UniformColor.HexValue
                        .font = char.font
                        .alignment = char.alignment
                        .rangeKerning = char.rangeKerning
                        
                        .italic = char.italic
                        .bold = isBold
                        .underline = char.underline
                    End With
                    
                    textSplitsToReturn.add konfiText
                    logger.logINFO "Text hinzugefügt: '" & konfiText.text & "'"
                    Set konfiText = Nothing
                End If
                
                startingIndex = i + 1
                widthOfProcessedRangesInLine = widthOfProcessedRangesInLine + dummyText.text.Story.TextLineRects.subPaths(1).boundingBox.width
            End If
            
        Else
            'Ein Zeichen wurde übersprungen. Startindex deshalb nach vorne rücken
            startingIndex = startingIndex + 1
        End If
        
    Next i
    
    Set textToKonfiTextSplits = textSplitsToReturn
    logger.removeTab
    Exit Function
UneditableEmbeddedFontFound:
    MsgBox "Das Dokument enthält eingebettete Schriftarten, die auf dem PC nicht installiert sind. Wähle alle Designs aus und kopiere sie. Corel wird dann zeigen, welche Schriftarten fehlen. Installiere diese und exportiere dann noch einmal.", _
    vbInformation
    Globals.endMacro
End Function




Public Function charsHaveSameProperties(char1 As textRange, char2 As textRange, isEndOfText As Boolean, allowLineBreaksOnlyForCenteredText As Boolean) As Boolean
    
    If isEndOfText Then
        charsHaveSameProperties = False
        Exit Function
    End If
    
    'Neue Zeile
    If Asc(char2.Characters(1)) = Asc(vbNewLine) Then
        If Not allowLineBreak(allowLineBreaksOnlyForCenteredText, char1) Then
            charsHaveSameProperties = False
            Exit Function
        End If
        
    End If
    
    If (char1.font = char2.font) And (char1.fill.UniformColor.HexValue = char2.fill.UniformColor.HexValue) And (char1.rangeKerning = char2.rangeKerning) And (char1.size = char2.size) Then
        charsHaveSameProperties = True
        Exit Function
    Else
        charsHaveSameProperties = False
        Exit Function
    End If
    
End Function



Public Function isTextLineEndingWithSpaces(char, nextChar, ByRef text As textRange, index) As Boolean
    
    isTextLineEndingWithSpaces = False
    
    'Ende vom Text
    If nextChar Is Nothing Then
        Exit Function
    End If
    
    
    'Eine Prüfung macht nur sinn, wenn der aktuelle Buchstabe (char) kein Leerzeichen ist aber der nächste schon (nextChar)
    If Not Asc(char) = Asc(" ") And Asc(nextChar) = Asc(" ") Then
        
        Dim i As Integer
        For i = index To text.Length
        
            If Not Asc(text.Characters(i - text.Start)) = Asc(" ") Then
                isTextLineEndingWithSpaces = False
                Exit Function
            End If
        
            If Asc(text.Characters(i - text.Start)) = Asc(vbNewLine) Or i = text.Length Then 'Neue Zeile oder Ende vom Text
                isTextLineEndingWithSpaces = True
                Exit Function
            End If
        Next i
        
    End If

End Function




Private Function isTextOnlySpaces(text As String) As Boolean
    
    Dim i As Integer
    For i = 1 To Len(text)
        If Not (Asc(Mid(text, i, 1)) = Asc(" ")) Then
            isTextOnlySpaces = False
            Exit Function
        End If
    Next i
    
    isTextOnlySpaces = True
End Function



Private Function allowLineBreak(allowLineBreaksOnlyForCenteredText As Boolean, charForAlignment As textRange) As Boolean
    allowLineBreak = Not (allowLineBreaksOnlyForCenteredText And Not (charForAlignment.alignment = cdrCenterAlignment))
End Function


Private Function hasTextRangeMultipleLines(range As textRange) As Boolean
    Dim i As Integer
    For i = 1 To range.Characters.count
        If Asc(range.Characters(i)) = Asc(vbNewLine) Then
            hasTextRangeMultipleLines = True
            Exit Function
        End If
    Next i
End Function




Private Function getShapesJSONNameForFancy(shapes As shapeRange) As String
    
    If shapes.count > 0 Then
        Dim name As String
        
        If shapes.firstShape.Type = cdrGroupShape Then
            name = shapes.firstShape.shapes.First.name
        Else
            name = shapes.firstShape.name
        End If
        
        name = replace(name, ">", "")
        
        name = replace(name, "  ", " ")
        name = replace(name, " ", "_")
        
        name = Globals.removeKeywordsFromName(name)
        
        getShapesJSONNameForFancy = name
    End If
    
End Function


Public Function addElementToJSON(element As Variant, Optional atEnd As Boolean = False)
    If atEnd Then
        jsonViewElementsAddAtEnd.add element.toJSONObj
    Else
        jsonViewElements.add element.toJSONObj
    End If
End Function


Public Function stringToWebSafeString(ByVal text As String) As String
    Dim result As String
    Dim i As Long
    Dim ch As String
    Dim code As Long
    
    result = Trim$(text)
    
    ' Deutsche Sonderzeichen ersetzen
    result = replace(result, "Ä", "Ae")
    result = replace(result, "Ö", "Oe")
    result = replace(result, "Ü", "Ue")
    result = replace(result, "ä", "ae")
    result = replace(result, "ö", "oe")
    result = replace(result, "ü", "ue")
    result = replace(result, "ß", "ss")
    
    ' Weitere häufige Sonderzeichen ersetzen
    result = replace(result, "&", "und")
    result = replace(result, "+", "plus")
    result = replace(result, "@", "at")
    result = replace(result, "€", "eur")
    
    ' Leerzeichen und typische Trenner zu _
    result = Replace(result, " ", "_")
    result = replace(result, "-", "_")
    result = replace(result, ".", "_")
    result = replace(result, ",", "_")
    result = replace(result, ";", "_")
    result = replace(result, ":", "_")
    
    ' Nur erlaubte Zeichen behalten:
    ' A-Z, a-z, 0-9 und '_
    Dim cleaned As String
    cleaned = ""
    
    For i = 1 To Len(result)
        ch = Mid$(result, i, 1)
        code = AscW(ch)
        
        If (code >= 48 And code <= 57) Or _
           (code >= 65 And code <= 90) Or _
           (code >= 97 And code <= 122) Or _
           ch = "_" Then
           
            cleaned = cleaned & ch
        End If
    Next i
    
    ' Mehrfache Unterstriche zusammenfassen
    Do While InStr(cleaned, "__") > 0
        cleaned = replace(cleaned, "__", "_")
    Loop
    
    ' Unterstriche am Anfang/Ende entfernen
    Do While left$(cleaned, 1) = "_"
        cleaned = Mid$(cleaned, 2)
    Loop
    
    Do While Right$(cleaned, 1) = "_"
        cleaned = left$(cleaned, Len(cleaned) - 1)
    Loop
    
    stringToWebSafeString = cleaned
End Function


Private Function newShapeExportInZIPFolder(shapeOrRange As Variant, ByVal fileName As String, fileType As cdrFilter, Optional cutToConfiBoundingBox As Boolean = True) As ShapeExport
    fileName = stringToWebSafeString("View_" & view.index & "_" & replace(title, " ", "_") & "_" & fileName)
    
    
    With newShapeExport(shapeOrRange, parent.getFolderPath & fileName, fileType)
        .setPreventFileOverride (True)
        .setExportFullyInvisibleShapeRangeAs1x1 (True)
        .setJpgCompression 25
        
        If cutToConfiBoundingBox Then
            ' Auf Konfi zuschneiden (nichts kann dann mehr rausragen)
            .setBoundingBoxShape ConfiHelper.confiBoundingBox
        End If
        
        Set newShapeExportInZIPFolder = .mee ' Returnen
    End With
End Function


' Erzeugt einen ShapeExport in optimaler Druckqualität für den Druck
Private Function newShapeExportInZIPFolderForPrint(shapeOrRange As Variant, ByVal fileName As String, fileType As cdrFilter)
    
    With newShapeExportInZIPFolder(shapeOrRange, fileName & "-print", fileType)
        ' 1 / view.shapesScale, weil zurücksaliert werden soll auf Originalgröße
        .setShapesScale (1 / view.shapesScale)
        .setResolution 300
        .setJpgCompression 0
        
        ' Nicht auf Fancygröße beschränken. Denn sonst kommt die größere Printfile abghackt raus in Fancygröße
        .setBoundingBoxShape Nothing
        
        Set newShapeExportInZIPFolderForPrint = .mee ' Returnen
    End With
End Function


Private Function newFancyExportJSONImageElement() As FancyExportJSONImageElement
    Set newFancyExportJSONImageElement = New FancyExportJSONImageElement
    Set newFancyExportJSONImageElement.view = Me
    Set newFancyExportJSONImageElement.logger = logger
    Set newFancyExportJSONImageElement.layer = currentProcessedLayer
End Function


Private Function newFancyExportJSONTextElement() As FancyExportJSONTextElement
    Set newFancyExportJSONTextElement = New FancyExportJSONTextElement
    Set newFancyExportJSONTextElement.imageElement = newFancyExportJSONImageElement
End Function



Public Function newCustomShapeTypeQuery(shapeType As customShapeType) As CustomShapeTypeQuery
    Set newCustomShapeTypeQuery = view.layersFlattened.newCustomShapeTypeQuery(shapeType)
End Function

Private Function newCustomShapeTypeQueryForExportShapes(shapeType As customShapeType) As CustomShapeTypeQuery
    Set newCustomShapeTypeQueryForExportShapes = Classfactory.newCustomShapeTypeQuery(exportShapesOfAllLayers, shapeType)
End Function

Private Function newCustomShapeTypeQueryForLayersExportShapes(layer As ProductDesignLayer, shapeType As customShapeType) As CustomShapeTypeQuery
    Set newCustomShapeTypeQueryForLayersExportShapes = Classfactory.newCustomShapeTypeQuery(getExportShapesForLayer(layer), shapeType)
End Function



Public Function addExportShapes(exportShapes As shapeRange, Optional logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[FancyExportView.addExportShapes] exportShapes: " & Globals.shapeRangeToString(exportShapes) & ", Me.title: '" & title & "'"
    
    Dim i As Integer
    For i = 1 To exportShapes.count
'        If Not logger Is Nothing Then logger.logINFO "Aktuelle Export Shape: '" & Globals.getShapeDisplayName(exportShapes(i)) & "'"
        Dim j As Integer
        Dim currLayer As ProductDesignLayer
        For j = 1 To view.layersFlattened.count
'            If Not logger Is Nothing Then logger.logINFO "Aktuelle View Shape: '" & Globals.getShapeDisplayName(view.layersFlattened.getLayer(j).layerShape) & "'"
            Set currLayer = view.layersFlattened.getLayer(j)
            If currLayer.isShapeChildOfThisLayer(exportShapes(i), logger) Then
                addExportShapeForLayer view.layersFlattened.getLayer(j), exportShapes(i)
            End If
            Set currLayer = Nothing
        Next j
    Next i

    If Not logger Is Nothing Then logger.removeTab
End Function

Private Function addExportShapeForLayer(layer As ProductDesignLayer, exportShape As shape)
    If processed Then Err.Raise vbObjectError + 513, , "[FancyExportView.addExportShapeForLayer] Diese View wurde bereits verarbeitet. Jetzt Exportformen hinzuzufügen macht keinen Sinn"
    getExportShapesForLayer(layer, True).add exportShape
    exportShapesOfAllLayers.add exportShape
End Function

Public Function getExportShapesForLayer(layer As ProductDesignLayer, Optional addIfNotExists As Boolean) As shapeRange
    Dim key As String
    key = getLayerKey(layer)
    
    If addIfNotExists Then
        If Not exportShapesByLayerKey.Exists(key) Then
            exportShapesByLayerKey.add key, New shapeRange
        End If
    End If
    
    If exportShapesByLayerKey.Exists(key) Then
        Set getExportShapesForLayer = exportShapesByLayerKey(key)
    Else
        Set getExportShapesForLayer = New shapeRange 'Keine Formen
    End If
End Function

Private Function getLayerKey(layer As ProductDesignLayer) As String
    getLayerKey = CStr(layer.getPartIndex) & ":" & CStr(layer.getLayerIndex)
End Function



' Ermittelt, zunächst mit 'getShapesExportShapeType' als welchen Formtyp die 'groupOrRange' behandelt werden soll. Bspw.: 'cdrBitmapsShape'
' Guckt dann, ob die Formen (wenn sie cdrBitmapsShape sind) als PNG oder JPG behandelt/exportiert werden sollen
Private Function getShapesFilterType(groupOrRange As Variant) As cdrFilter
    Dim shapeTypeOfShapes As cdrShapeType
    shapeTypeOfShapes = getShapesExportShapeType(groupOrRange)
    
    Dim fileType As cdrFilter
    
    Select Case shapeTypeOfShapes
    Case cdrTextShape, cdrCurveShape
        fileType = cdrSVG
    Case cdrBitmapShape
        If Globals.isShapeRangeExportableAsJPEG(Globals.ensureShapeRange(groupOrRange)) Then
            fileType = cdrJPEG
        Else
            fileType = cdrPNG
        End If
    End Select
    
    If fileType = 0 Then
        Err.Raise vbObjectError + 513, , "[Globals.getShapesFilterType] Der Datei-Typ konnte nicht ermittelt werden!"
    End If
    
    getShapesFilterType = fileType
End Function



' Gibt einen 'cdrShapeType' zurück, der beschreibt, wie die Formen behandelt werden sollen.
' Wenn eine 'groupOrRange' z.B. nur Bitmaps enthält, dann sollen diese als 'cdrBitmapsShape' behandelt werden und als JPG oder PNG exportiert werden
Private Function getShapesExportShapeType(groupOrRange As Variant) As cdrShapeType
    
    Dim range As shapeRange
    Set range = Globals.ensureShapeRange(groupOrRange)
    
    ' Grundplatten & Fotomasken sollen nicht als SVG rauskommen, da diese sich sonst nicht im Fancy in der Bearbeitungsansicht austauschen lassen
    If range.count = 1 Then
        If Globals.isGroundplate(range.firstShape) Or Globals.isPhotoMask(range.firstShape) Then
            getShapesExportShapeType = cdrBitmapShape
            Exit Function
        End If
    End If
    
    If Classfactory.newCustomShapeTypeQuery(range, TextAny).isAllShapesMatchingQuery Then
        getShapesExportShapeType = cdrTextShape
    ElseIf Classfactory.newCustomShapeTypeQuery(range, CorelDrawShape).setArgument1(cdrBitmapShape).isAllShapesMatchingQuery Then
        getShapesExportShapeType = cdrBitmapShape
    ElseIf Classfactory.newCustomShapeTypeQuery(range, CurveAny).isAllShapesMatchingQuery Then
        getShapesExportShapeType = cdrCurveShape
    Else
        getShapesExportShapeType = cdrBitmapShape
    End If
    
    
End Function
