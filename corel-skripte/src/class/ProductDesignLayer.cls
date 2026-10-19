Attribute VB_Name = "ProductDesignLayer"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False

Public productDesign As productDesign
Dim partIndex As Integer
Dim layerIndex As Integer

Public layerShape As shape

Dim mainShape As shape
Dim allRedOrPinkShapes As shapeRange
Dim smalerRedOrPinkShapes As shapeRange

Dim area As Double

Dim groundPlate As shape

Dim viewShape As shape ' Eine cyanfarbene Form, die beim einpassen in die Konfiguratorgröße anstelle der Hauptform genutzt wird
Dim viewShapeInitialized As Boolean
Dim graving As Boolean
Dim gravingSetted As Boolean

Dim backGroundShapes As shapeRange ' Formen die einen Hintergrund darstellen. Die also ganzflächig über das gesamte Design gehen

'Falls dieser Layer selbst eine Variante ist (z.B: ein Edelstahlrahmen der optional dazuwählbar ist)
Dim variante As variante
Dim checkedIfLayerIsVariant As Boolean

Dim allVariants As VariantArray ' Beinhaltet alle Arten von Varianten außer, wenn diese Schicht selbst eine Variante ist. Das ist dann gespeichert unter der Variable 'variante'
Dim groundPlateVariants As VariantArray
Dim staticVariants As VariantArray
Dim photoMaskVariants As VariantArray
Dim designElementVariants As VariantArray ' Hinweis: Die Nummerierung von Design-Element-Varianten sind nicht auf einzelne Schichten begrenzt. Die Nummerierung ist also Global.


' Exportierbare Formen (dessen name mit einem > beginnt)
Dim exportableShapes As shapeRange

Dim placedShapesAndJobs As collection
Dim placedShapes As shapeRange
Dim placedJobs As collection
Dim placedJobsWithoutDouble As collection

' Wird vom Bildplatzierer genutzt
' -----------------------------------
Public topLevelPlacedShapes As shapeRange ' Formen die vom Bildplatzierer platziert worden sind. Von einer platzieren Gruppe sind aber die Childs ausgeschlossen. Deshalb 'top level'
Public topLevelPlacedShapesNames As collection
Public previousSubJobPlacedShapes As shapeRange ' Formen des vorherigen SubJobs auf dieser Schicht (für booleanOperationWithPreviousSubJob)
' -----------------------------------

'' Der Name aller Grundplatten kombiniert für die Grundplatten-Varianten im Fancy. Dieser String wird für das "replace" Feld genutzt
'Dim groundPlateVariantsNameForFancy As String

Dim shapeName As String ' Kommt vom ProductRecognizer bzw. AlleFormen.cdr
Dim shapeNameInitialized As Boolean

Dim widthForLayerName As String
Dim heightForLayerName As String


Public Function newProductDesignLayer(productDesignVar As productDesign, layerShapeVar As shape, Optional partIndexVar As Integer = -1, Optional layerIndexVar As Integer = -1)
    Set productDesign = productDesignVar
    Set layerShape = layerShapeVar
    
    partIndex = partIndexVar
    layerIndex = layerIndexVar
    
    ' Wenn eine Form rund ist, aber als Ellipse vorliegt und nicht als Kurve,
    ' wird die Form vom ProductRecognizer nicht erkannt. Das liegt daran, dass eine Ellipse leeeeicht anders ist als wenn man diese als Kurve umwandelt.
    Globals.convertRedOrPinkEllipsesToCurves getAllRedOrPinkShapes
    
    'MsgBox "layerShapeName=" & layerShapeVar.name
End Function


Public Function setPartIndex(partIndexVar As Integer)
    partIndex = partIndexVar
End Function

Public Function invalidatePartIndex()
    partIndex = -1
End Function

Public Function getPartIndex() As Integer
    getPartIndex = -1 ' Falls nichts gefunden wird
    
    If partIndex = -1 Then
        For p = 1 To productDesign.getPartsCount
            For l = 1 To productDesign.getPart(p).count
                If productDesign.getLayer(p, l) Is Me Then
                    partIndex = p
                    layerIndex = l
                    
                    getPartIndex = partIndex
                    Exit Function
                End If
            Next l
        Next p
    Else
        getPartIndex = partIndex
    End If
End Function


Public Function setLayerIndex(layerIndexVar As Integer)
    layerIndex = layerIndexVar
End Function

Public Function invalidateLayerIndex()
    layerIndex = -1
End Function

Public Function getLayerIndex() As Integer
    getPartIndex ' Such auch nach dem Layerindex
    
    getLayerIndex = layerIndex
End Function


Public Function getMainShape() As shape

    If mainShape Is Nothing Then
        Dim allRedOrPinkShapes_ As shapeRange
        Set allRedOrPinkShapes_ = getAllRedOrPinkShapes
        
        ' Varianten entfernen (sollen standartmäßig raus sein)
        allRedOrPinkShapes_.RemoveRange Classfactory.newCustomShapeTypeQuery(newCustomShapeTypeQuery(StaticVariant).search, RedOrPinkShape).search
        
        Set mainShape = Globals.getBiggestShape(allRedOrPinkShapes_)
        
        If Not mainShape Is Nothing Then
            If mainShape.CanHaveFill Then
                If Not mainShape.fill.Type = cdrNoFill Then
                    MsgBox "Die Hauptform darf nicht gefüllt sein. Bitte ändern.", vbCritical
                    
                    ' TODO evtl. auch eine Wanrung einbauen, die es verbietet auf die Hauptform gekurvte Texte zu platzieren (bzw. allgemein keine Effekte wie Schatten o.Ä.). Das sorgte schon für Hauptform nicht gefunden Bugs
                    
                    mainShape.CreateSelection
                    
                    Globals.endMacro
                    
                End If
            End If
        End If
        
    Else
        If Not Globals.isShapeReferenceValid(mainShape) Then
            Err.Raise vbObjectError + 513, , "[ProductDesignLayer.getMainShape] Die Referenz von 'mainShape' ist ungültig. Evtl. ist Invalidieren nötig!"
        End If
    End If
    
'    If mainShape Is Nothing Then
'        Err.Raise vbObjectError + 514, Me, "[ProductDesignLayer] Die Hauptform (rot/pink) ist nicht vorhanden"
'    End If
    
    Set getMainShape = mainShape
End Function



Public Function getAllRedOrPinkShapes() As shapeRange
    
    If allRedOrPinkShapes Is Nothing Then
        Set allRedOrPinkShapes = newCustomShapeTypeQuery(RedOrPinkShape).search
    Else
        If Not Globals.isShapeRangeShapesReferenceValid(allRedOrPinkShapes) Then
            Err.Raise vbObjectError + 513, , "[ProductDesignLayer.getAllRedOrPinkShapes] Eine Referenz von einem Shape von 'allRedOrPinkShapes' ist ungültig. Evtl. ist Invalidieren nötig!"
        End If
    End If
    
    Set getAllRedOrPinkShapes = allRedOrPinkShapes
End Function




' Gibt alle roten/pinken Formen zurück. Außer die Größte.
' Die größte Form ist nämlich die Hauptform
Public Function getSmalerRedOrPinkShapes() As shapeRange
    If smalerRedOrPinkShapes Is Nothing Then
        Set smalerRedOrPinkShapes = New shapeRange
        smalerRedOrPinkShapes.AddRange getAllRedOrPinkShapes
        
        'Hauptshape entfernen
        smalerRedOrPinkShapes.RemoveRange Globals.shapeToShapeRange(getMainShape)
        
        ' Varianten entfernen (sollen standartmäßig raus sein)
        smalerRedOrPinkShapes.RemoveRange Classfactory.newCustomShapeTypeQuery(getVariantsOfType(StaticVariantType).allVariantsShapes, RedOrPinkShape).search
        
    Else
        If Not Globals.isShapeRangeShapesReferenceValid(smalerRedOrPinkShapes) Then
            Err.Raise vbObjectError + 513, , "[ProductDesignLayer.getSmalerRedOrPinkShapes] Eine Referenz von einem Shape von 'smalerRedOrPinkShapes' ist ungültig. Evtl. ist Invalidieren nötig!"
        End If
    End If
    
    Set getSmalerRedOrPinkShapes = smalerRedOrPinkShapes
End Function



' Gibt den Flächeninhalt der Form wieder.
' Dabei wird zunächst die Fläche der Hauptform (der größten roten/pinken Form) genommen und alle anderen Flächen der kleineren Formen abgezogen.
Public Function getArea(Optional ignoreVariants As Boolean = True) As Double
    
    If Not area = 0 Then
        getArea = area
        Exit Function
    End If
    
    
    If getMainShape Is Nothing Then
        Err.Raise vbObjectError + 513, , "[ProductDesignLayer.getArea] Es wurde keine Hauptform erkannt "
    End If
    
    Dim smallerShapesCache As New shapeRange
    If Not getSmalerRedOrPinkShapes Is Nothing Then
        If Not getSmalerRedOrPinkShapes.count = 0 Then
            smallerShapesCache.AddRange getSmalerRedOrPinkShapes
        End If
    End If
    
    If Not ignoreVariants Then
        'Alle roten/pinken Formen der Varianten werden hiermit aus der Liste aller roten/pinken Formen entfernt
        smallerShapesCache.RemoveRange getVariantsOfType(StaticVariantType).allVariantsShapes
    End If
    
    area = Globals.getAreaOfMainShapeAndSmallerShapes(getMainShape, smallerShapesCache)

    
    getArea = area
End Function


' TODO umbenennen zu getActiveGroundPlate (Da es Varianten geben kann)
' Oder ganz löschen und nur noch auf Varianten zugreifen
Public Function getGroundPlate(Optional logger As logger) As shape
    
    ' TODO groundPlateInitialized As Boolean hinzufügen, sonst wird immer gesucht
    
    If groundPlate Is Nothing Then
        Set groundPlate = Globals.findGroundPlate(layerShape, True, logger)
    Else
        If Not Globals.isShapeReferenceValid(groundPlate) Then
            Err.Raise vbObjectError + 513, , "[ProductDesignLayer.getGroundplateVariants] Die Referenz von 'groundPlate' ist ungültig. Evtl. ist Invalidieren nötig!"
        End If
    End If
    
    Set getGroundPlate = groundPlate
End Function



Public Function getGroundPlateVariantsFromPlaceFile() As collection
    
    If isEmptyVariant Then
        Set getGroundPlateVariantsFromPlaceFile = New collection
        Exit Function
    End If
    
    If getGroundPlate Is Nothing Then
        Err.Raise vbObjectError + 513, , "[ProductDesignLayer.getGroundPlateVariantsFromPlaceFile] 'getGroundPlate' ist Nothing "
    End If
    
    If Globals.isShapeDeleted(getGroundPlate) Then
        Err.Raise vbObjectError + 513, , "[ProductDesignLayer.getGroundPlateVariantsFromPlaceFile] Referenz von 'getGroundPlate' ist ungültig"
    End If
    
    Set getGroundPlateVariantsFromPlaceFile = PlaceFile.getGroundplateVariantGroup(getGroundPlate)
    
    If getGroundPlateVariantsFromPlaceFile Is Nothing Then
        Set getGroundPlateVariantsFromPlaceFile = New collection
    End If
     
End Function


Public Function invalidateGroundPlate(Optional logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[ProductDesignLayer.invalidateGroundPlate]"
    
    Set groundPlate = Nothing
    
    invalidateExportableShapes
    invalidateVariantType GroundplateVariantType, logger
    
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function activateGroundPlateVariant(index As Integer, alsoPhotomaskIfExists As Boolean, Optional logger As logger)

    If Not logger Is Nothing Then logger.addTab , "[ProductDesignLayer.activateGroundPlateVariant] index: '" & index & "'"
    
    activateVariantOfType index, GroundplateVariantType, logger
    
    If alsoPhotomaskIfExists Then
        ' Nur wenn es begrenzte Uploadboxen gibt, gibt es auch Photomasken und erst dann können diese aktiviert werden
        If getVariantsOfType(PhotoMaskVariantType).allVariants.count > 0 Then
            activateVariantOfType index, PhotoMaskVariantType, logger
        End If
    End If
    
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function activateVariantOfType(index As Integer, variantType As variantType, Optional logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[ProductDesignLayer.activateGroundPlateVariant] index: " & index & "'"
    
    ' Sichtbarkeit
    ' --------------------------
    For i = 1 To getVariantsOfType(variantType, , , logger).allVariants.count
        getVariantsOfType(variantType).getVariant(i).shape.visible = False
    Next i
    ' Photomasken sind nicht immer vorhanden
    getVariantsOfType(variantType).getVariant(index).shape.visible = True ' Nur die aktuelle Variante sichtbar machen
    ' --------------------------
    
    Select Case variantType
        Case GroundplateVariantType
            ' Grundplattenvariante als aktuelle setzen
            Set groundPlate = getVariantsOfType(variantType).getVariant(index).shape
    End Select
    
    If Not logger Is Nothing Then logger.removeTab
End Function



' Formen die mit einem '>' beginnen. Z.B: ">Edelstahl_Grundplatte"
Public Function getExportableShapes(Optional logger As logger) As shapeRange
    
    If exportableShapes Is Nothing Then
    
        Set exportableShapes = Classfactory.newCustomShapeTypeQuery(layerShape, ExportableShape).setExcludeGivenShape(True).search
        exportableShapes.AddRange Classfactory.newCustomShapeTypeQuery(layerShape, Globals.customShapeType.AnyVariant).excludeGivenShape(True).sea
        
    Else
        If Not Globals.isShapeRangeShapesReferenceValid(exportableShapes) Then
            Dim errorMessage As String
            errorMessage = "[ProductDesignLayer.getExportableShapes] Eine Referenz von einem Shape von 'exportableShapes' ist ungültig. Evtl. ist Invalidieren nötig! exportableShapes: " & Globals.getShapeRangeDisplayNames(exportableShapes, , , True)
            If Not logger Is Nothing Then logger.logFATAL errorMessage
            Err.Raise vbObjectError + 513, , errorMessage
        End If
    End If
    
    If Not logger Is Nothing Then
        logger.logINFO "[ProductDesignLayer.getExportableShapes] Artikelnummer: '" & productDesign.getProductID & "' exportableShapes: '" & Globals.getShapeRangeDisplayNames(exportableShapes, , , True) & "'"
        
    End If
    
    Set getExportableShapes = exportableShapes

End Function


Public Function invalidateExportableShapes()
    Set exportableShapes = Nothing
End Function



Public Function getPlacedShapesAndJobs() As collection
    
    If placedShapesAndJobs Is Nothing Then
        Set placedShapesAndJobs = Globals.getPlacedShapesWithJobsFromShapeRange(layerShape.shapes.All, Me)
    End If
    
    Set getPlacedShapesAndJobs = placedShapesAndJobs
End Function


Public Function getPlacedShapes() As shapeRange

    
    If placedShapes Is Nothing Then
        
        Set placedShapes = getPlacedShapesAndJobs(1)
        
    Else
        If Not Globals.isShapeRangeShapesReferenceValid(placedShapes) Then
            Dim errorMessage As String
            errorMessage = "[ProductDesignLayer.getPlacedShapes] Eine Referenz von einem Shape von 'placedShapes' ist ungültig. Evtl. ist Invalidieren nötig! placedShapes: " & Globals.getShapeRangeDisplayNames(placedShapes, , , True)
            If Not logger Is Nothing Then logger.logFATAL errorMessage
            Err.Raise vbObjectError + 513, , errorMessage
        End If
    End If
    
    Set getPlacedShapes = placedShapes
End Function


Public Function getPlacedShapesJobs() As collection

    If placedJobs Is Nothing Then
        Set placedJobs = getPlacedShapesAndJobs(2)
    End If
    
    
    Set getPlacedShapesJobs = placedJobs
End Function


' Gibt die platzierten Formen wieder ohne welche doppelt zu haben
Public Function getPlacedShapesJobsWithoutDoubles() As collection
    
    If placedJobsWithoutDouble Is Nothing Then
        
        Set placedJobsWithoutDouble = New collection
        
'        Debug.Print "getPlacedShapesJobs().count: " & getPlacedShapesJobs().count
        
        For i = 1 To getPlacedShapesJobs().count
            
            Dim currentJob As PlaceFileJob
            Set currentJob = getPlacedShapesJobs(i)
            
            If Not Globals.collectionContainsOBJ(placedJobsWithoutDouble, currentJob) Then
                placedJobsWithoutDouble.add currentJob
            End If
            
            Set currentJob = Nothing
        Next i
    End If
    
    Set getPlacedShapesJobsWithoutDoubles = placedJobsWithoutDouble
End Function


Public Function invalidatePlacedShapesAndJobs()
    Set placedShapesAndJobs = Nothing
    Set placedShapes = Nothing
    Set placedJobs = Nothing
    Set placedJobsWithoutDouble = Nothing
End Function

Public Function isPlacedShapesAndJobsInitialized() As Boolean
    isPlacedShapesAndJobsInitialized = Not placedShapesAndJobs Is Nothing
End Function


'TODO Cachen & ShapeRange returnen
Public Function getLookShapes() As collection
    Set getLookShapes = Globals.shapeRangeToCollection(newCustomShapeTypeQuery(Look).search)
End Function


Public Function isGraving() As Boolean

    If gravingSetted Then
        isGraving = graving
    Else
        If getMainShape Is Nothing Then
            Err.Raise vbObjectError + 513, , "[ProductDesignLayer.isGraving] Keine Hauptform vorhanden!"
        End If
        If getMainShape.outline.Type = cdrNoOutline Then
            Err.Raise vbObjectError + 513, , "[ProductDesignLayer.isGraving] Keine Outline vorhanden!"
        End If
        graving = getMainShape.outline.color.HexValue = Globals.getRedHexCode
        isGraving = graving
        gravingSetted = True
    End If
    
End Function


' Färbt alle Formen, die als rot/pink bekannt sind ein: 'getAllRedOrPinkShapes'
' Auch wenn sie gerade nicht rot/pink sind. Aber zuvor deswegen gesammelt wurden.
Public Function colorizeMainShapes()
    
    If Not gravingSetted Then
        Err.Raise vbObjectError + 513, , "[ProductDesignLayer.colorizeMainShapes] Einfärben nicht möglich. Gravur/UV wurde vorher nicht ermittelt "
    End If
    
    
    Dim outlineColor As color
    If isGraving Then
        Set outlineColor = CreateColor(Globals.getRedHexCode)
    Else
        Set outlineColor = Globals.getPinkColor
    End If
    
    For i = 1 To getAllRedOrPinkShapes.count
        getAllRedOrPinkShapes(i).outline.SetPropertiesEx Globals.getHairlineThickness, OutlineStyles(0), outlineColor, ArrowHeads(0), ArrowHeads(0), cdrFalse, cdrFalse, _
            cdrOutlineButtLineCaps, cdrOutlineMiterLineJoin, 0#, 100, MiterLimit:=5#, Justification:=cdrOutlineJustificationMiddle
    Next i
    
End Function


Public Function getViewShape() As shape
    If Not viewShapeInitialized And viewShape Is Nothing Then
    
        Dim range As shapeRange
        
        Set range = newCustomShapeTypeQuery(customShapeType.viewShape).search
        
        If Not range.shapes.count = 0 Then
            Set viewShape = range.firstShape
        End If
        
        viewShapeInitialized = True
    End If
    
    Set getViewShape = viewShape
End Function

Public Function invalidateAllRedShapes()
    Set mainShape = Nothing
    Set allRedOrPinkShapes = Nothing
    Set smalerRedOrPinkShapes = Nothing
End Function


Public Function invalidateBackgroundShapes()
    Set backGroundShapes = Nothing
End Function


Public Function invalidateAll()
    invalidateAllRedShapes
    
    Set viewShape = Nothing
    viewShapeInitialized = False
    graving = False
    gravingSetted = False
    
    area = 0

    Set groundPlate = Nothing
    
    Set variante = Nothing
    checkedIfLayerIsVariant = False
    
    Set variantGroups = Nothing
    Set variantGroupsFlattened = Nothing
    Set variantGroupsFlattenedShapes = Nothing
    
    invalidateExportableShapes
    invalidateAllVariants
    invalidateBackgroundShapes
    invalidatePlacedShapesAndJobs
    invalidateAllRedShapes
    
    invalidateLayerVariant
End Function



Public Function showGroundPlate(Optional Show As Boolean = True)
    
    If Not getGroundPlate Is Nothing Then
        getGroundPlate.visible = Show
    End If
    
End Function



' Macht alle Shapes sichtbar/unsichtbar. Aber keine Shapes/Gruppen in Gruppen. Nur die Gruppe selbst
Public Function showAll(Optional Show As Boolean = True)
    For i = 1 To layerShape.shapes.count
        layerShape.shapes(i).visible = Show
    Next i
End Function



Public Function getValidShapesFor(Optional forProductPicture As Boolean = False, Optional forFancyKonfi As Boolean = False, Optional forAmazonKonfi As Boolean = False, _
        Optional excludeInvisibleShapes As Boolean = False, Optional forSplittingForAmazonKonfiImport As Boolean = False, Optional logger As logger) As shapeRange
    
    If Not logger Is Nothing Then
        logger.logINFO "[ProductDesignLayer.getValidShapesFor]"
        logger.addTab
    End If
    
    Set getValidShapesFor = New shapeRange
    
    For i = 1 To layerShape.shapes.count
        Dim shape As shape
        Set shape = layerShape.shapes(i)
        
        If Globals.isShapeValidFor(shape, forProductPicture, forFancyKonfi, forAmazonKonfi, excludeInvisibleShapes, forSplittingForAmazonKonfiImport, Me, logger) Then
            getValidShapesFor.add shape
            
            ' Wenn diese Form valide ist, dann sind auch seine Effekte valide.
            ' Wenn diese Form z.B. ein Text ist und dieser Text ist valide, dann ist auch sein Schatteneffekt valide
            Dim effectShapes As shapeRange
            Set effectShapes = Globals.getEffectsShapesOfShape(shape)
            getValidShapesFor.AddRange effectShapes
            If Not logger Is Nothing Then logger.logINFO "Effektformen der jetzigen Form hinzugefügt: " & Globals.getShapeRangeDisplayNames(effectShapes)
            
            Set effectShapes = Nothing
        End If
        
        Set shape = Nothing
    Next i
    
    
    If Not logger Is Nothing Then logger.removeTab
End Function



Public Function hasNonRectangularUploadBox() As Boolean
    For i = 1 To layerShape.shapes.count
        If Globals.isUploadBox(layerShape.shapes(i), BoundedUploadBoxType) Then
             If Not Globals.isShapeCurveRectangle(Globals.getPhotoOfUploadBoxGroup(layerShape.shapes(i))) Then
                hasNonRectangularUploadBox = True
                Exit Function
             End If
        End If
    Next i
End Function




Public Function hasElementsOverBoundedUploadboxes() As Boolean
    For i = layerShape.shapes.count To 1 Step -1
        If Globals.isUploadBox(layerShape.shapes(i), BoundedUploadBoxType) Then
            
            'MsgBox "Found Uploadbox. Name=" & layerShape.shapes(i).name
            
            ' Oberhalb der Uploadbox nach Shapes suchen, die Sie überlappen
            For j = i - 1 To 1 Step -1
                If Not Globals.isShapeGuideElement(layerShape.shapes(j)) Then
                    If areRectanglesOverlapping(layerShape.shapes(i).boundingBox, layerShape.shapes(j).boundingBox) Then
                        hasElementsOverBoundedUploadboxes = True
                        Exit Function
                    End If
                End If
            Next j
            
            
        End If
    Next i
End Function



' TODO: Bei Text auf Kurven wird der erste Text einer Kurve komischerweise kopiert und in weiß ganz nach oben gesetzt
' Wird für den Amazonexport benötigt. Alle Texte sollen oben erscheinen und sortiert sein (von oben links nach unten rechts)
' TEST: Globals.TestLayerSortText
Public Function sortText(Optional orderTextToFront As Boolean)
    
    Dim textShapes As New shapeRange
    Set textShapes = layerShape.shapes.FindShapes(, cdrTextShape, False) 'Nicht rekursiv suchen, da dort eventuell der Text 'Dein Foto' zu finden sein könnte, Oder Texte von Designvarianten
    
    ' Nur Texte erlauben, die zum Design gehören
    Set textShapes = Classfactory.newCustomShapeTypeQuery(textShapes, DesignElementShapeType).search
    
    arrange.arrangeFunction True, Globals.shapeRangeToCollection(textShapes)
    
    If orderTextToFront Then
        'Wenn nicht ganz oben ...
        If Not layerShape.shapes.First Is textShapes.firstShape Then
            textShapes.OrderFrontOf layerShape.shapes.First ' ... nach oben setzen
        End If
    End If
    
End Function


Public Function hasBleed() As Boolean
    hasBleed = getBleedSizeInMM > 0
End Function


' Versucht anhand von überstehenden Elementen zu gucken, wie groß die Beschnittzugabe ist
Public Function getBleedSizeInMM() As Double

    Dim designShapes As shapeRange
    Set designShapes = newCustomShapeTypeQuery(DesignElementShapeType).search
    
    ' Ohne Designelemente gibt es keine überstehenden Elemente. Der Zugriff auf Eigenschaften (LeftX, TopY, ...) einer leeren ShapeRange bringt Corel zum Absturz
    If designShapes.count = 0 Then
        getBleedSizeInMM = 0
        Exit Function
    End If
    
    'TODO müsste
    ' Nach der Seite mit den am längsten herausragenden Elementen suchen
    Dim biggestBleed As Double
    biggestBleed = max(getMainShape.LeftX - designShapes.LeftX, biggestBleed) 'Linke Seite
    biggestBleed = max(designShapes.TopY - getMainShape.TopY, biggestBleed) 'Obere Seite
    biggestBleed = max(designShapes.RightX - getMainShape.RightX, biggestBleed) 'Rechte Seite
    biggestBleed = max(getMainShape.BottomY - designShapes.BottomY, biggestBleed) 'Linke Seite
    
    biggestBleed = ActiveDocument.FromUnits(biggestBleed, cdrMillimeter)
    
    If biggestBleed < 0.1 Then
        biggestBleed = 0
    End If
    
    getBleedSizeInMM = biggestBleed
End Function


Public Function setBleedSizeInMM(bleedSizeInMM As Double, Optional cutGroundPlate As Boolean = True, Optional cutMotives As Boolean = True, Optional preventDoubleCut As Boolean = True, _
        Optional logger As logger)
        
    If Not logger Is Nothing Then logger.addTab , "[ProductDesignLayer.setBleedSizeInMM]"
    
    ' Verhindern, dass ein zweites Mal auf die selbe größe zugeschnitten wird
    ' Wenn nämlich 2 mal zugeschnitten wird, gibt es Rundungsfehler und SEHR komische Formen !!
    If preventDoubleCut Then
        If getBleedSizeInMM = bleedSizeInMM Then
            Exit Function
        End If
    End If
    
    Tool.createBleedForDesignLayer Me, bleedSizeInMM, True, cutGroundPlate, cutMotives
    
    invalidateBackgroundShapes
    invalidateGroundPlate logger
    
    If Not logger Is Nothing Then logger.removeTab
End Function

Public Function removeBleed(Optional logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[ProductDesignLayer.removeBleed]"
    
    setBleedSizeInMM 0, logger:=logger
    
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function getMainShapesAndBleedBoundingBox() As rect
    
    If getAllRedOrPinkShapes.count = 0 Then Err.Raise vbObjectError + 513, , "[ProductDesignLayer.getMainShapesAndBleedBoundingBox] Keine roten / pinken Formen gefunden!"
    
    Dim result As rect
    Set result = getAllRedOrPinkShapes.boundingBox.GetCopy
    
    Dim bleedSize As Double
    ' In Dokumenteneinheit ändern
    bleedSize = ActiveDocument.ToUnits(getBleedSizeInMM, cdrMillimeter)
    result.Inflate bleedSize, bleedSize, bleedSize, bleedSize
    
    Set getMainShapesAndBleedBoundingBox = result
End Function


Public Function isBackgroundShape(shape As shape)
    
    ' Wenn das 'shape' an 'getBackgroundShapes' weitergegeben wird und genau ein Shape zurückkommt, dann ist 'shape' ein Background
    isBackgroundShape = getBackgroundShapes().Exists(shape)
    
End Function


' Gibt alle Formen wieder, die mindestens so groß sind wie die Hauptform.
' Also Formen, die Hintergründe sind
Public Function getBackgroundShapes(Optional logger As logger) As shapeRange
    
    If backGroundShapes Is Nothing Then
        
        Set backGroundShapes = New shapeRange
        
        
        Dim mainShapeCurve As curve
        If getMainShape().Type = cdrCurveShape Then
            Set mainShapeCurve = getMainShape().curve
        Else
            Set mainShapeCurve = getMainShape().DisplayCurve
        End If
        
        
        Dim shapesToSearch As shapeRange
        Set shapesToSearch = newCustomShapeTypeQuery(DesignElementShapeType).setContinueSearchInMatchedGroups(False).search
            
        ' Wenn hier was geändert wird, evtl. auch zum Tool hinzufügen (Funktion: createBleedProcessDesignLayer)
        shapesToSearch.RemoveRange Classfactory.newCustomShapeTypeQuery(shapesToSearch, TextAny).search
        shapesToSearch.RemoveRange Classfactory.newCustomShapeTypeQuery(shapesToSearch, motive).search
        shapesToSearch.RemoveRange Classfactory.newCustomShapeTypeQuery(shapesToSearch, qrCode).search
        shapesToSearch.RemoveRange Classfactory.newCustomShapeTypeQuery(shapesToSearch, ByName).setArgument1("Vorschaubild Amazon-Konfi").setArgument2(stringSearchType.StringEquals).search ' Falls nach einem AmazonImport eine weiße Hinterlegung erstellt werden soll (per Script)
        shapesToSearch.RemoveRange Classfactory.newCustomShapeTypeQuery(shapesToSearch, FxShapeType).search
        shapesToSearch.RemoveRange Classfactory.newCustomShapeTypeQuery(shapesToSearch, InvisibleProperlyShapeType).search ' Unsichtbare Formen ausschließen. Denn es gibt leere Varianten, die über die gesammte Form gehen
        
        
        For i = 1 To shapesToSearch.count

            Dim shape As shape
            Set shape = shapesToSearch(i)
            
            ' Prüfen, ob eine Grupe zu viele child Formen hat.
            ' Wenn ja dann soll die Gruppe übersprungen werden, denn 'Globals.getCurveFromShape' dauert bei Gruppen mit vielen Formen zu lange
            If shape.Type = cdrGroupShape Then
                If Globals.isGroupHavingToManyShapes(shape, 10, Globals.MAXINT) Then
                    GoTo NextShape
                End If
            End If
            
            
            If Globals.areRectanglesEqual(getMainShape().boundingBox, shape.boundingBox, False, 0.1) Or Globals.areRectanglesInside(getMainShape().boundingBox, shape.boundingBox, True) Then
            
                Dim curve As curve
                Set curve = Globals.getCurveFromShape(shape, , logger)
    
                If Not curve Is Nothing Then
    
                    ' Wenn die jetzige Form größer ist als die Hauptform und diese komplett umhüllt (und es keine Überlappung gibt),
                    ' hat es eine Beschnittzugabe.
                    ' Oder wenn die jetzige Form den selben Pfad hat wie die Hauptform, dann ist es auch ein 'Background' .
                    If (Globals.areRectanglesInside(getMainShape().boundingBox, shape.boundingBox) And _
                        Not Globals.isCurveIntersecting(shape, getMainShape(), True)) Or _
                        Globals.areCurvesEqual(mainShapeCurve, curve, True) Then
                        backGroundShapes.add shape
                    End If
                End If
            End If
NextShape:
            Set shape = Nothing
            Set curve = Nothing
        Next i
        
    End If
    
    Set getBackgroundShapes = backGroundShapes
    
End Function




Public Function getAllVariants(Optional onlyInitAllVariantsArray As Boolean = False, Optional logger As logger) As VariantArray
    
    If Not logger Is Nothing Then logger.addTab , "[ProductDesignLayer.getAllVariants]"
    
    If allVariants Is Nothing Then
        Set allVariants = New VariantArray
        allVariants.setVariantParent = True
    End If
    
    If Not onlyInitAllVariantsArray Then
        ' Cachen
        getVariantsOfType DesignElementVariantType, , , logger
        getVariantsOfType GroundplateVariantType, , , logger
        getVariantsOfType PhotoMaskVariantType, , , logger
        getVariantsOfType StaticVariantType, , , logger
    
    End If
    
    Set getAllVariants = allVariants
    
    If Not logger Is Nothing Then logger.removeTab
End Function


' Da Fotomasken beim Confi Export erst erstellt werden, nachdem 'allVariants' initialisiert wurde, sind die Fotomasken nicht in 'allVariants'
Public Function addPhotoMask(photoMaskShape As shape, Optional logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[ProductDesignLayer.addPhotoMask] Layerindex: '" & getLayerIndex & "', Partindex: '" & getPartIndex & "'"
'    If Not logger Is Nothing Then logger.logINFO "Fotomasken am Anfang: '" & getVariantsOfType(PhotoMaskVariantType, False).allVariants.count & "'"
    
    getAllVariants True, logger ' Init
    
    Dim variante As New variante
    variante.newPhotoMaskVariante photoMaskShape, Me, logger
    
'    If Not logger Is Nothing Then logger.logINFO "Fotomasken VOR dem hinzufügen: '" & getVariantsOfType(PhotoMaskVariantType, False).allVariants.count & "'"
    
    addVariant variante
    
'    If Not logger Is Nothing Then logger.logINFO "Fotomasken NACH dem hinzufügen: '" & getVariantsOfType(PhotoMaskVariantType, False).allVariants.count & "'"
    
    If Not logger Is Nothing Then logger.removeTab
End Function


Private Function addVariant(variante As variante, Optional onlyInitAllVariantsArray As Boolean = False, Optional logger As logger)
    
    If Not logger Is Nothing Then
        logger.logINFO "[ProductDesignLayer.addVariant] variante: " & variante.toString
        logger.addTab
    End If
    
    getAllVariants onlyInitAllVariantsArray, logger ' Cachen
    
    allVariants.addVariant variante, logger
    
    Dim arrayy As VariantArray
    Set arrayy = getVariantsOfType(variante.typee)
    If Not arrayy Is Nothing Then
        arrayy.addVariant variante
    End If
    
    If Not logger Is Nothing Then logger.removeTab
    
End Function


Public Function hasVariantType(typee As variantType) As Boolean
    
    Dim arrayy As VariantArray
    Set arrayy = getVariantsOfType(typee)
    
    If Not arrayy Is Nothing Then
        hasVariantType = arrayy.allVariants.count > 0
    End If
    
End Function


' ACHTUNG: Standartmäßig wird das Array initialisiert und nach Varianten gesucht, weil 'initArray' true
Public Function getVariantsOfType(variantType As variantType, Optional initArray As Boolean = True, Optional checkShapeReferences As Boolean = True, Optional logger As logger) As VariantArray
    
    If Not logger Is Nothing Then
        logger.logINFO "[ProductDesignLayer.getVariantsOfType] variantType: " & variantType
        logger.addTab
    End If
    
    Dim customShapeTypeOfVariant As customShapeType
    
    Select Case variantType
    Case StaticVariantType
        If staticVariants Is Nothing Then
            Set staticVariants = New VariantArray
            staticVariants.setVariantParent = True
            
            customShapeTypeOfVariant = Globals.customShapeType.StaticVariant
        End If
    Case PhotoMaskVariantType
        If photoMaskVariants Is Nothing Then
            Set photoMaskVariants = New VariantArray
            photoMaskVariants.setVariantParent = True
            
            customShapeTypeOfVariant = Globals.customShapeType.photoMask
        End If
    Case DesignElementVariantType
        If designElementVariants Is Nothing Then
            Set designElementVariants = New VariantArray
            designElementVariants.setVariantParent = True
            
            customShapeTypeOfVariant = Globals.customShapeType.DesignElementVariantShapeType
        End If
    Case GroundplateVariantType
        If groundPlateVariants Is Nothing Then
            Set groundPlateVariants = New VariantArray
            groundPlateVariants.setVariantParent = True
            
            If Not logger Is Nothing Then logger.logINFO "Grundplattenvarianten Array neu erstellt"
            
            customShapeTypeOfVariant = Globals.customShapeType.groundPlate
        End If
    End Select
    
    
    
    ' Nur initialisieren, wenn das VariantArray des Typs vorher Nothing war (Dann erst wird auch 'customShapeTypeOfVariant' gesetzt (oben))
    If Not customShapeTypeOfVariant = NoShapeType And initArray Then
        If Not logger Is Nothing Then logger.logINFO "array noch nicht initialisiert. Initialisiere..."
        Dim variantShapes As shapeRange
        Set variantShapes = newCustomShapeTypeQuery(customShapeTypeOfVariant).setContinueSearchInMatchedGroups(False).search
        
        ' Wird mehrfach verwendet
        Dim newVariante As variante
        
        If Not logger Is Nothing Then logger.logINFO "type: " & variantType & ", variantShapes.Count: " & variantShapes.count
        
        
        For i = 1 To variantShapes.count
            Set newVariante = New variante
            newVariante.newVariantOfType variantType, variantShapes(i), Me
            
            ' Beim hinzufügen der Variante wird nur das Varianten Array 'allVariants' und das vom Typen 'variantType' initialisiert.
            ' Dafür sorgt das True hier vv . Sonst kommt es zu Problemen wenn sich alle Varianten Arrays gleichzeitig initialisieren.
            addVariant newVariante, True, logger
            
            If Not logger Is Nothing Then logger.logINFO newVariante.variantName & " - " & newVariante.variantGroupName & " hinzugefügt"
            
            Set newVariante = Nothing
        Next i
    Else
        If Not logger Is Nothing Then logger.logINFO "array bereits initialisiert oder mitten in initialierung"
    End If
    
    
    
    Dim arrayy As VariantArray

    Select Case variantType
    Case StaticVariantType
        Set arrayy = staticVariants
    Case PhotoMaskVariantType
        Set arrayy = photoMaskVariants
    Case DesignElementVariantType
        Set arrayy = designElementVariants
    Case GroundplateVariantType
        Set arrayy = groundPlateVariants
    End Select
    
    If Not arrayy Is Nothing Then
        If checkShapeReferences Then
            If Not arrayy.areShapeReferencesValid Then
                Err.Raise vbObjectError + 513, , "[ProductDesignLayer.getVariantsOfType] Eine Referenz von einem Shape vom Varianten-Array für den Typen " & variantType & " ist ungültig. Evtl. ist Invalidieren nötig!"
            End If
        End If
    End If
    
    If Not logger Is Nothing Then
        logger.logINFO "returne " & arrayy.toString
        logger.removeTab
    End If
    Set getVariantsOfType = arrayy
End Function


Public Function invalidateVariantType(variantType As variantType, Optional logger As logger)
    
    If Not logger Is Nothing Then logger.addTab FINE, "[ProductDesignLayer.invalidateVariantType]"
    
    If Not logger Is Nothing Then logger.logINFO "variantType: '" & variantType & "'"
    
    ' Wenn das Array mit allen Varianten schon vorhanden ist, dann müssen die Varianten vom angegebenen Typ
    ' aus 'allVariants' gelöscht werden
    If Not allVariants Is Nothing Then
        Dim arrayy As VariantArray
        Set arrayy = getVariantsOfType(variantType, False, False, logger)
        
        If Not arrayy Is Nothing Then
            For i = 1 To arrayy.allVariants.count
                allVariants.removeVariant arrayy.getVariant(i)
            Next i
        End If
    End If
    
    Select Case variantType
    Case StaticVariantType
        Set staticVariants = Nothing
    Case PhotoMaskVariantType
        Set photoMaskVariants = Nothing
    Case DesignElementVariantType
        Set designElementVariants = Nothing
    Case GroundplateVariantType
        Set groundPlateVariants = Nothing
    End Select
    
    If Not logger Is Nothing Then logger.removeTab
    
End Function


Public Function invalidateAllVariants()
    
    Set allVariants = Nothing
    Set staticVariants = Nothing
    Set designElementVariants = Nothing
    Set photoMaskVariants = Nothing
    Set groundPlateVariants = Nothing
    
End Function


' Gibt die Varianten dieses Layers/dieser Schicht zurück.
' Missachtet dabei aber die Grundplattenvarianten
' Dabei ist jede Variante je nach Typ mit anderen in einem 'VariantGroup' gruppiert
Public Function getStaticVariantGroups(Optional logger As logger) As collection ' Beinahltet 'VariantGroup' Objekte
    
    getAllVariants , logger
    
    Set getStaticVariantGroups = staticVariants.variantGroups
End Function


Public Function hasVariantsOfType(variantType As variantType) As Boolean
    If variantType = LayerVariantType Then Exit Function ' Return False
    hasVariantsOfType = getVariantsOfType(variantType).variantGroups.count > 0
End Function


Public Function areVariantsOfLayersEqual(layer As ProductDesignLayer, variantType As variantType) As Boolean
    areVariantsOfLayersEqual = getVariantsOfType(variantType).isEqualTo(layer.getVariantsOfType(variantType))
End Function



' Gibt den Variantentypennamen dieser Schicht zurück
Public Function getLayerVariantGroupName() As String
    If isLayerVariant Then ' Hier wird auch initialisiert
        getLayerVariantGroupName = variante.variantGroupName
    End If
End Function


' Gibt den Variantennamen dieser Schicht zurück
Public Function getLayerVariantName() As String
    If isLayerVariant Then ' Hier wird auch initialisiert
        getLayerVariantName = variante.variantName
    End If
End Function


Public Function getVariant() As variante
    checkIfLayerIsVariantAndInit
    
    Set getVariant = variante
End Function

Private Function checkIfLayerIsVariantAndInit()
     If Not checkedIfLayerIsVariant Then
    
        For i = 1 To layerShape.shapes.count
            ' Die Haupt-Form einer Schicht-Variante (z.B: ein Edelstahlrahmen 'var_frame(1cm)') fängt mit 'var_' an und ist rot/pink
            If Globals.isLayerVariant(layerShape.shapes(i)) Then
                
                Set variante = New variante
                variante.newLayerVariant layerShape.shapes(i), Me
                
                Exit For
            End If
        Next i
        
        checkedIfLayerIsVariant = True
    End If

End Function

Public Function invalidateLayerVariant()
    If Not variante Is Nothing Then
        getPart.invalidateVariantLayers
    End If
End Function

' Wird vom Part aufegerufen
Public Function p_properInvalidateLayerVariant()
    checkedIfLayerIsVariant = False
    Set variante = Nothing
End Function


' Gibt an, ob diese Schicht nur eine Variante ist. Bspw. ein Edelstahlrahmen
Public Function isLayerVariant() As Boolean
    checkIfLayerIsVariantAndInit
    
    isLayerVariant = Not variante Is Nothing
End Function



' Gibt an, ob diese Schicht eine Variante ist, die eine 'ohne' Option ist. Wenn es z.B: einen Edelstahlrahmen als Variante gibt, kann es auch eine 'Ohne'-Edelstahlrahmen Variante geben
Public Function isEmptyVariant() As Boolean
    If isLayerVariant Then
        isEmptyVariant = variante.variantIsEmptyVariant
    End If
End Function




Public Function warnIfGroundPlateMissing()
    Globals.warnIfGroundPlateMissing Me
End Function



' Gibt einen Namen für diese Schicht.
' Alle Schichtnamen getrennt mit einem '-' ergeben den Exportordnernamen und den Namen der PSD,
' die für diese Konstelation an Teilen, Schichten und Varianten passend ist.
Public Function getLayerNameForPSDFile(Optional warnIfNoGroundPlate As Boolean = True) As String
    
    If getGroundPlate Is Nothing Then
        If isEmptyVariant Then
            
        Else
            If warnIfNoGroundPlate Then
                MsgBox "[ProductDesignLayer.getLayerNameForPSDFile] Keine Grundplatte vorhanden! " & layerShape.shapes.Last.name, vbCritical, "ProductDesignLayer.getLayerNameForPSDFile"
                Globals.endMacro
            Else
                getLayerNameForPSDFile = "Keine Grundplatte"
                Exit Function
            End If
        End If
        
    End If
    
    
    Dim process As String
    If Not getMainShape Is Nothing Then
        If isGraving Then
            process = "Gravur"
        Else
            process = "UV"
        End If
    Else
        process = "(Verarbeitung unbekannt)"
    End If
    
    
    
    
    If isEmptyVariant Then
        ' TODO Debug
        getLayerNameForPSDFile = "Leere Variante"
        Exit Function
    End If
    
    
    
    ' Material
    ' ------------------------------------------
    Dim material As String
    If InStr(getGroundPlate.name, "Schiefer") Then
        If InStr(getGroundPlate.name, "geschnitten") Then
            material = "Schiefer geschnitten"
        ElseIf InStr(getGroundPlate.name, "Premium") Then
            material = "Premium Schiefer"
        Else
            material = "Schiefer"
        End If
        
    ElseIf InStr(getGroundPlate.name, "Acryl") Then
        If InStr(getGroundPlate.name, "transparent") Then
            material = "Acryl Klar"
        Else
            material = "Acryl"
        End If
        
    ElseIf InStr(getGroundPlate.name, "Holz") Then
        material = "Holz"
    ElseIf InStr(getGroundPlate.name, "Edelstahl") Then
        material = "Edelstahl"
    ElseIf InStr(getGroundPlate.name, "Granit") Then
        material = "Granit"
    ElseIf InStr(getGroundPlate.name, "Alu-Dibond") Then
        material = "Alu-Dibond"
    End If
    ' ------------------------------------------
    
    
    
    getLayerNameForPSDFile = material & " " & process
    
End Function




Public Function getShapeName()
    
    If Not shapeNameInitialized Then
        Dim unitsBefore As cdrUnit
        unitsBefore = ActiveDocument.unit
        
        ProductRecognizer.initIfNeeded
        
        shapeName = ProductRecognizer.recognizeProductLayerName(Me)
        shapeNameInitialized = True
        
        ActiveDocument.unit = unitsBefore
    End If
    
    getShapeName = shapeName
    
End Function


Public Function isShapeNameSquare() As Boolean
    
    Dim shapeName As String
    shapeName = getShapeName
    
    If Not shapeName = "" Then
        If InStr(shapeName, "x") Then
            Dim size() As String
            size = Split(shapeName, "x")
            
            If UBound(size) = 2 Then
                If IsNumeric(size(1)) And IsNumeric(size(2)) Then
                    isShapeNameSquare = True
                End If
            End If
        End If
    End If
    
End Function



Public Function getMainShapeSize() As Double()
    Dim mainShapeSizeArr(2) As Double
    
    ' Cachen
    If widthForLayerName = "" Then
        Dim width As Double
        width = ActiveDocument.FromUnits(getMainShape.SizeWidth, cdrCentimeter)
        width = Globals.round(width, 1, 2)
        widthForLayerName = CStr(width)
    End If
    
    ' Cachen
    If heightForLayerName = "" Then
        Dim height As Double
        height = ActiveDocument.FromUnits(getMainShape.SizeHeight, cdrCentimeter)
        height = Globals.round(height, 1, 2)
        heightForLayerName = CStr(height)
    End If
    
    
    mainShapeSizeArr(1) = widthForLayerName
    mainShapeSizeArr(2) = heightForLayerName
    
    
    getMainShapeSize = mainShapeSizeArr
End Function





' Gibt eine Kopie der Hauptform zum zuschneiden zurück.
' Außer bei folgenden Grundplatten wird die Grundplatte dafür genutzt:
' - Schiefer (nicht aber geschnittenem)
' - Leinwand
' Diese kopie muss nach dem verwenden gelöscht werden
Public Function getMainShapesCombinedCopyForMask(Optional ByVal variantGroupIndex As Integer = -1, Optional ByVal variantGroupChildIndex As Integer = -1) As shape
' getMainShapesCombinedCopyForMask
    
'    MsgBox "[getDesignLayerShapeToCutMainMask] Grundplattenname=" & getGroundPlate.name
    
'    Debug.Print "getMainShapesCombinedCopyForMask"
    
    If getGroundPlate Is Nothing Then
        Err.Raise vbObjectError + 513, , "[ProductDesignLayer.getMainShapesCombinedCopyForMask] 'getGroundPlate' ist Nothing "
    End If
    
    If (InStr(getGroundPlate.name, "Schiefer") And Not InStr(getGroundPlate.name, "geschnitten")) Or _
            InStr(getGroundPlate.name, "Leinwand") Then
            
        Set getMainShapesCombinedCopyForMask = getGroundPlate
    Else
        Set getMainShapesCombinedCopyForMask = getMainShape
    End If
    
'    Debug.Print "Shape #1: " & Globals.getShapeDisplayName(getMainShapesCombinedCopyForMask)
    
    ' Kopie muss erstellt werden, da das zurückgelieferte Shape dieser Funktion gelöscht wird
    ' Eine Kopie der Form erstellen, da evtl. vorhandene kleinere rote Formen herausgeschnitten werden müssen
    Set getMainShapesCombinedCopyForMask = Globals.copyPasteShape(getMainShapesCombinedCopyForMask, False)
    
'    Debug.Print "Shape #2: " & Globals.getShapeDisplayName(getMainShapesCombinedCopyForMask)
    
    ' MACHT KEINEN SINN, denn neuerdings wird die Grundplatte zugeschnitten wenn neue rote/pinke kleine Formen (wie z.B: Bohrlöcher) hinzugefügt werden
    ' JAAAA. AAAABER nur die Grundplatte. Nicht aber die Hauptform
    ' Kleinere rote/pinke Formen abziehen (Bohrlöcher o.Ä)
    ' Varianten sind aber nicht mit dabei. Diese werden bei 'getsmalerRedOrPinkShapes' nicht mit einberechnet
    For j = 1 To getSmalerRedOrPinkShapes.count
        Set getMainShapesCombinedCopyForMask = Globals.subtractShape(getSmalerRedOrPinkShapes(j), getMainShapesCombinedCopyForMask, True, False)
    Next j
    
'    Debug.Print "Shape #3: " & Globals.getShapeDisplayName(getMainShapesCombinedCopyForMask)
    
    
    ' Varianten durch Form schneiden (wenn variante angegeben)
    If Not variantGroupIndex = -1 And Not variantGroupChildIndex = -1 Then
        
        Dim variante As variante
        Set variante = getVariantsOfType(StaticVariantType).getVariantGroupChild(variantGroupIndex, variantGroupChildIndex)
        
        Dim redShapesGroupOfVariantGroup As shapeRange
        Set redShapesGroupOfVariantGroup = Classfactory.newCustomShapeTypeQuery(variante.shape.shapes.All, RedOrPinkShape).search
        
        
        For i = 1 To redShapesGroupOfVariantGroup.count
            Set getMainShapesCombinedCopyForMask = Globals.subtractShape(redShapesGroupOfVariantGroup(i), getMainShapesCombinedCopyForMask)
        Next i
        
    End If
    
'    Debug.Print "Shape #4: " & Globals.getShapeDisplayName(getMainShapesCombinedCopyForMask)
    
    ' Wenn hier ein Fehler auftritt, dann kann es sein, dass diese Funktion vorher schon mal aufgerufen wurde, eine temporäre Form, die alle roten Formen kombiniert darstellt, erstellt wurde, aber nicht gelöscht wurde
    getMainShapesCombinedCopyForMask.name = "ProductDesignLayer.getMainShapesCombinedCopyForMask_" & Globals.getTemporaryKeyWord
    
'    Debug.Print "Shape #4: " & Globals.getShapeDisplayName(getMainShapesCombinedCopyForMask)
End Function



Public Function getMainShapesCombinedCopy(Optional addBleedIfNeeded As Boolean = False) As shape
    Set getMainShapesCombinedCopy = getMainShape
    
    ' Kopie muss erstellt werden, da das zurückgelieferte Shape dieser Funktion gelöscht wird
    ' Eine Kopie der Form erstellen, da evtl. vorhandene kleinere rote Formen herausgeschnitten werden müssen
    Set getMainShapesCombinedCopy = Globals.copyPasteShape(getMainShapesCombinedCopy, False)
    
    
    ' Kleinere rote/pinke Formen abziehen (Bohrlöcher o.Ä)
    ' Varianten sind aber nicht mit dabei. Diese werden bei 'getsmalerRedOrPinkShapes' ignoriert
    For j = 1 To getSmalerRedOrPinkShapes.count
        Set getMainShapesCombinedCopy = Globals.subtractShape(getSmalerRedOrPinkShapes(j), getMainShapesCombinedCopy, True, False)
    Next j
    
    If addBleedIfNeeded And Not isGraving Then
        Dim bleedShape As shape
        Set bleedShape = Globals.offsetPath(getMainShapesCombinedCopy, Globals.getDefaultBleedSizeInMM, , cdrContourCornerMiteredBevel)
        bleedShape.name = "ProductDesignLayer.getMainShapesCombinedCopy.bleedShape"
        getMainShapesCombinedCopy.delete
        Set getMainShapesCombinedCopy = bleedShape
    End If
    
End Function



' Wenn die Grundplatte von diesem Layer durchsichtig ist und sich darunter ein Layer befindet dessen Grundplatte variabel ist, wird True returnt
' Throws Exception
Public Function isGroundplateTransparentAndOverGroundPlateVariant() As Boolean
    ' TODO Missachtet Grundplattenvariante
    If Globals.isGroundPlateTransparent(getGroundPlate) Then
        
        ' Achtung: Es wird nur eine Gruppe darunter geprüft
        If getLayerIndex + 1 <= getPart().count Then ' Gibt es darunter noch einen Layer
            Dim layerBelow As ProductDesignLayer
            Set layerBelow = getPart().item(getLayerIndex + 1)
            
            ' Leere Varianten haben keine Grundplatte
            If Not layerBelow.isEmptyVariant Then
                If layerBelow.getVariantsOfType(GroundplateVariantType).allVariants.count > 1 Then
                    isTransparentAndOverGroundPlateVariant = True
                    Exit Function
                End If
            End If
            
        End If
    End If
End Function



' Wenn die Grundplatte dieses Layers variabel ist und darüber ein Layer ist, dessen Grundplatte transparent ist, wird True returnt
' Throws Exception
Public Function isGroundPlateVariantAndUnderTransparentLayer() As Boolean
    If getLayerIndex - 1 >= 1 Then ' Ist darüber mind. eine Ebene
        Dim layerAbove As ProductDesignLayer
        Set layerAbove = getPart().item(getLayerIndex - 1)
        
        If layerAbove.isGroundplateTransparentAndOverGroundPlateVariant Then
            isGroundPlateVariantAndUnderTransparentLayer = True
            Exit Function
        End If
    End If
End Function




' Throws Exception
Public Function getPart() As ProductDesignPart
    Set getPart = productDesign.getPart(getPartIndex)
End Function




' Berechnet die Wahrscheinlichkeit, wie sehr es sein kann, dass diese Schicht die 'fokusierte' also die mit dem eigentlichen Design ist.
' Bei einem Klingelschild aus Acryl, wo der Name draufgraviert wird, aber noch Edelstahl dahinter ist, ist die fokusierte Schicht die aus Acryl mit dem Design
Public Function getLayerFocusedChance() As Integer
    getLayerFocusedChance = layerShape.shapes.count
    
    getLayerFocusedChance = getLayerFocusedChance + newCustomShapeTypeQuery(TextAny).search.count * 20
    getLayerFocusedChance = getLayerFocusedChance + newCustomShapeTypeQuery(uploadBox).search.count * 10
    
End Function




Public Function getPhotoMasks() As shapeRange
    Set getPhotoMasks = newCustomShapeTypeQuery(photoMask).search
End Function




' Wird von der Autokorrektur aufgerufen
Public Function correctRedPinkAndGroundplateShapesZIndex()
    
    If getBackgroundShapes.count > 0 Then
        ' Erstes Shape sollte das oberste (Z-Index) sein
        getMainShape.OrderFrontOf getBackgroundShapes.firstShape
    Else
        getMainShape.OrderToBack
    End If
    
    
    
    Dim lastRedShape As shape
    If getSmalerRedOrPinkShapes.count > 0 Then
        getSmalerRedOrPinkShapes.OrderBackOf getMainShape
        
        Set lastRedShape = getSmalerRedOrPinkShapes.lastShape
    Else
        Set lastRedShape = getMainShape
    End If
    
    
    If isGraving Then
        getVariantsOfType(GroundplateVariantType).allVariantsShapes.OrderBackOf lastRedShape ' B
    Else
        ' Bei UV gibt es eine Beschnittzugabe, deshalb sollen die Grundplatten hinter die roten/pinken Formen
        getVariantsOfType(GroundplateVariantType).allVariantsShapes.OrderToBack
    End If
    
End Function




Public Function needsCutBevoreExport2() As Boolean
    
    Dim area As Double
    area = -1
    
    
    
    For i = 1 To layerShape.shapes.count
        Dim currentShape As shape
        Set currentShape = layerShape.shapes(i)
        
        If Not Globals.isRedOrPinkShape(currentShape) And Not Globals.isProductID(currentShape) Then
            
            If Globals.areRectanglesInside(currentShape.boundingBox, getMainShape.boundingBox) Then
                If area = -1 Then
                    area = getArea ' Nur bei bedarf berechnen
                End If
                
                ' Bei Texten keine Areaabfrage machen (geht nicht) sondern direkt schneiden
                If currentShape.Type = cdrTextShape Then
                    needsCutBevoreExport2 = True
                    Exit Function
                End If
                
                If Globals.getAreaOfShape(currentShape) > area Then
                    needsCutBevoreExport2 = True
                    Exit Function
                End If
            End If
            
        End If
        
        Set currentShape = Nothing
    Next i
    
End Function




' ACHTUNG: hier wird die Dokumenteneinheit auf Pixel umgestellt
Public Function placeAutomaticGroundPlateVariants(Optional logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[ProductDesignLayer.placeAutomaticGroundPlateVariants] design: '" & getPart.getDesign.getProductID & "'"
    
'    On Error GoTo SomeError ' ---
        
    If Not isEmptyVariant Then
    
        PlaceFile.initIfNeeded
        
        Dim groundPlateVariants As collection
        Set groundPlateVariants = getGroundPlateVariantsFromPlaceFile
        
        
        If groundPlateVariants.count > 0 Then
            If Not logger Is Nothing Then logger.logINFO "    P#" & getPartIndex & ", L#" & getLayerIndex & " Alte Grundplatte löschen..."
            
            ' TODO vv  Vorhandene Grundplatte nicht löschen, sondern gucken, dass sie nicht 2 mal platziert wird. Währe schneller ...
            
            ' Alte Grundplatte löschen, Neue per PlaceFile einfügen
            getGroundPlate.delete
            invalidateGroundPlate
            
            ' Alle Varianten platzieren
            For v = 1 To groundPlateVariants.count
                PlaceFile.setSelectedPlaceTypeJob groundPlateVariants(v)
                PlaceFile.startFunction Globals.shapeToShapeRange(layerShape), Classfactory.newPlaceFileParameters.setQuiet.setErrorWhenNothingPlaced
                ActiveDocument.unit = cdrPixel ' SEHR WICHTIG
                
                If Not logger Is Nothing Then logger.logINFO "    P#" & getPartIndex & ", L#" & getLayerIndex & " " & groundPlateVariants(v).name & " platziert"
                
                getGroundPlate.visible = False 'Variante erstmal deaktivieren
            Next v
            
            ' Die erste Grundplattenvariante aktivieren
            activateGroundPlateVariant 1, False
        End If
                        
        Set groundPlateVariants = Nothing
        
    End If
    
   
    
    On Error GoTo 0 ' ---
    
     If Not logger Is Nothing Then logger.removeTab
    Exit Function
'SomeError:
'    Err.Raise Err.number, Err.source, "[ProductDesignLayer.placeAutomaticGroundPlateVariants]" & vbNewLine & Err.Description, Err.HelpFile, Err.HelpContext
End Function

 
 
Public Function getVarianteFromShape(variantShape As shape) As variante
    
    getAllVariants ' Init
    
    ' Wenn dies eine Schichtvariante ist
    If Not getVariant Is Nothing Then
        If variantShape Is getVariant.shape Then
            Set getVarianteFromShape = getVariant
            Exit Function
        End If
    End If
    
    ' Wenn es Childvarianten gibt
    For i = 1 To allVariants.allVariants.count
        Dim currentVariant As variante
        Set currentVariant = allVariants.allVariants(i)
        
        If currentVariant.shape Is variantShape Then
            Set getVarianteFromShape = currentVariant
            Exit Function
        End If
        
        Set currentVariant = Nothing
    Next i
    
'    If currentVariant Is Nothing Then
'        Err.Raise vbObjectError + 513, , "[ProductDesignLayer.getVarianteFromShape] Für '" & variantGroupShape.name & "' konnte keine Variante aus diesem Layer gefunden werden!"
'    End If
    
End Function



Public Function placeGroundPlatesAgain(Optional dpiToSetAfterPlaceFile As Double = 72)
    
    Dim foundGroundPlateJobs As New collection
    
    
    
    For i = 1 To getVariantsOfType(GroundplateVariantType).allVariants.count
        Dim result As PlaceFileSubJob
        Set result = PlaceFile.findSubJob(getVariantsOfType(GroundplateVariantType).allVariantsShapes.item(i), Me)
        
        If result Is Nothing Then
            Err.Raise vbObjectError + 513, , "[ProductDesignLayer.placeGroundPlatesAgain] Für die Grundplatte '" & getVariantsOfType(GroundplateVariantType).allVariants(i).name & "' konnte kein Job gefunden werden"
        End If
        
        getVariantsOfType(GroundplateVariantType).allVariantsShapes(i).name = getVariantsOfType(GroundplateVariantType).allVariantsShapes(i).name & "_tmp"
        getVariantsOfType(GroundplateVariantType).allVariantsShapes(i).delete
        foundGroundPlateJobs.add result
        Set result = Nothing
    Next i
    
    For i = 1 To foundGroundPlateJobs.count
    
        ActiveDocument.resolution = 300
        PlaceFile.setSelectedPlaceTypeJob foundGroundPlateJobs(i).parentJob
        
        PlaceFile.startFunction layerShape, Classfactory.newPlaceFileParameters.setQuiet.setErrorWhenNothingPlaced
        
        ActiveDocument.unit = cdrPixel
        ActiveDocument.resolution = dpiToSetAfterPlaceFile
    Next i
    
    invalidateVariantType GroundplateVariantType
    invalidateGroundPlate
    invalidatePlacedShapesAndJobs
    
End Function





' Wenn die Hauptform auch kleinere Formen (Löcher) hat, werden diese zu eigenen Formen konvertiert
Public Function seperateMainShapesSmallerShapes()
    
    ' Andere Fromtypen außer Texte haben nur einen SubPath. Fromtypen wie Kreise Rechtecke usw.
    If Not getMainShape().Type = cdrCurveShape Then
        Exit Function
    End If
    
    Dim biggestSubPathIndex As Integer
    biggestSubPathIndex = Globals.getBiggestSubPathIndex(getMainShape.curve.subPaths)
    
    For i = getMainShape.curve.subPaths.count To 1 Step -1
        
        If Not i = biggestSubPathIndex Then
            Dim newShape As shape
            Set newShape = Globals.convertSubPathToOwnShape(getMainShape, (i), True)
            
            Globals.setShapeOutlineThicknessToHairline newShape
            
            Set newShape = Nothing
        End If
        
    Next i
    
    invalidateAll
    
End Function



Public Function hasRedOrPinkText() As Boolean
    
    For i = 1 To getAllRedOrPinkShapes.count
    
        If getAllRedOrPinkShapes(i).Type = cdrTextShape Then
            hasRedOrPinkText = True
            Exit Function
        End If
    Next i
    
End Function




Public Function deleteSameRedOrPinkShapesFromLayersBelow(Optional logger As logger)
    
    If Not logger Is Nothing Then
        logger.logINFO "ProductDesignLayer.deleteSameRedOrPinkShapesFromLayersBelow layerIndex: " & getLayerIndex & ", PartIndex: " & getPartIndex
        logger.addTab
    End If
    
    Dim textShapeIsPositive As Boolean
    textShapeIsPositive = getMainShape.Type = cdrTextShape
    
    Dim currentLayer As ProductDesignLayer
        
        
        
    ' Wenn der Text negativ ist also ausgeschnitten,
    ' dann ist dieser Auschnitt auch in den Grundplatten(varianten) vorhanden
    ' und muss entfernt werden
    If Not textShapeIsPositive Then
        For i = 1 To getSmalerRedOrPinkShapes.count
            For g = 1 To getVariantsOfType(GroundplateVariantType).allVariants.count
                Globals.deleteSameCurvesOfShapes getSmalerRedOrPinkShapes(i), getVariantsOfType(GroundplateVariantType).getVariant(g).shape, , logger
            Next g
        Next i
    End If
    
    
    
    
    ' Alle Layer unterhalb diesen Layers im selben Part durchlaufen
    For i = getLayerIndex + 1 To getPart.count
        Set currentLayer = getPart.item(i)
        
        If Not logger Is Nothing Then logger.logINFO "currentLayer layerIndex: " & currentLayer.getLayerIndex
        
        If Not logger Is Nothing Then logger.logINFO "Durchlaufe alle roten Formen vom Layer " & getLayerIndex & ". Anzahl: " & getAllRedOrPinkShapes.count
        
        Dim s As Integer
        s = 1
        While s <= getAllRedOrPinkShapes.count
            Dim currentOwnRedShape As shape
            Set currentOwnRedShape = getAllRedOrPinkShapes(s)
            
            If Not logger Is Nothing Then logger.logINFO "currentOwnRedShape: " & Globals.getShapeDisplayName(currentOwnRedShape)
            
            For r = 1 To currentLayer.getSmalerRedOrPinkShapes.count
                Dim currentOtherRedShape As shape
                Set currentOtherRedShape = currentLayer.getSmalerRedOrPinkShapes(r)
                
                If Not logger Is Nothing Then logger.logINFO "currentOtherRedShape: " & Globals.getShapeDisplayName(currentOtherRedShape)
                
                If Globals.areShapesCurvesEqual(currentOwnRedShape, currentOtherRedShape, True, , , logger) Then
                    
                    currentLayer.deleteRedShape currentOtherRedShape, logger
                    currentLayer.invalidateAllRedShapes
                    
                    GoTo NextOwnRedShape
                End If
                
                Set currentOtherRedShape = Nothing
            Next r
            
            ' Da der Text nicht positiv ist sondern ausgeschnitten, sollen nur die kleinen Formen, aber nicht die Hauptform eingefärbt werden
            If IIf(textShapeIsPositive, True, Not currentOwnRedShape Is getMainShape) Then
                ' Wenn der Code hier angelangt, dann wurde keine gleiche Form gefunden.
                ' Also wird die Form 'currentOwnRedShape' anhand der Grundplatte von 'currentLayer' eingefärbt
                convertRedShapeToNormalShape currentOwnRedShape, currentLayer, logger
                s = s - 1
            End If
            
NextOwnRedShape:
            Set currentOwnRedShape = Nothing
            s = s + 1
        Wend
        
    Next i
    
    
    
    
    ' Wenn noch rote Formen übrig geblieben sind, die nicht eingefärbt wurden durch eine der Grunplatten von darunterliegenden Layern,
    ' heißt das, ...
    For i = getAllRedOrPinkShapes.count To 1 Step -1
        
        If textShapeIsPositive Then
            convertRedShapeToNormalShape getAllRedOrPinkShapes(i), Me ' ... dass sie anhand der Grundplatte vom EIGENEN Layer eingefärbt werden müssen
        Else
            ' Da der Text nicht positiv ist sondern ausgeschnitten, sollen nur die kleinen Formen, aber nicht die Hauptform eingefärbt werden
            If Not getAllRedOrPinkShapes(i) Is getMainShape Then
                convertRedShapeToNormalShape getAllRedOrPinkShapes(i), Nothing ' ... dass sie in weiß eingefärbt werden müssen, was den weißen Hintergrund wiederspiegelt
            End If
        End If
    Next i
    
    
    
    'Grundplatten/Grundplattenvarianten löschen
    ' --------------------------------------
    If textShapeIsPositive Then
        
        For i = getVariantsOfType(GroundplateVariantType).allVariants.count To 1 Step -1
            getVariantsOfType(GroundplateVariantType).getVariant(i).shape.delete
        Next i
        
        invalidateVariantType GroundplateVariantType
        
    End If
    ' --------------------------------------
    
    
    If Not logger Is Nothing Then logger.removeTab
    
End Function



Private Function convertRedShapeToNormalShape(redShape As shape, layerToTakeColorFrom As ProductDesignLayer, Optional logger As logger)
    
    If Not logger Is Nothing Then
        logger.logINFO "ProductDesignLayer.convertRedShapeToNormalShape redShape: " & Globals.getShapeDisplayName(redShape) & ", layerToTakeColorFrom Index: " & layerToTakeColorFrom.getLayerIndex
        logger.addTab
    End If
    
    redShape.outline.SetNoOutline
    
    Dim color As color
    
    If layerToTakeColorFrom Is Nothing Then
        Set color = CreateColor("#FFFFFF") ' Weiß, weil der Hintergrund weiß ist
    Else
    
        Dim subJob As PlaceFileSubJob
        Set subJob = PlaceFile.findSubJobByShape(layerToTakeColorFrom.getGroundPlate, layerToTakeColorFrom, , , , , , , logger)
        
        If subJob Is Nothing Then
            MsgBox "Der SubJob von " & layerToTakeColorFrom.getGroundPlate.name & " konnte nicht gefunden werden", vbExclamation
        End If
        
        Set color = subJob.getGroundPlateTextureColorForText
        
    End If
    
    redShape.fill.ApplyUniformFill color
    redShape.name = redShape.name & "_dynamicKonfiCut"
    
    invalidateAllRedShapes
    
    If Not logger Is Nothing Then logger.removeTab
End Function



Public Function deleteRedShape(shape As shape, Optional logger As logger)
    
    For i = 1 To getVariantsOfType(GroundplateVariantType).allVariants.count
        Globals.deleteSameCurvesOfShapes shape, getVariantsOfType(GroundplateVariantType).getVariant(i).shape, 1, logger
    Next i
    
    shape.delete
    
    invalidateAllRedShapes
    
End Function


Public Function colorizeForAmazonImport()
    
    
    If isGraving Then
        
        Dim allShapesFlattened As shapeRange
        Set allShapesFlattened = Globals.flattenGroupShape(layerShape)
        
        For i = 1 To allShapesFlattened.count
            ' Diese Funktion passt schon auf, dass keine falschen Formen wie roter Rahmen eingefärbt werden
            Globals.makeShapeBlack allShapesFlattened(i), True
        Next i
    Else
        
        ' RGB-Schwarz zu CMYK-Schwarz
        ' --------------------------------------------
        Dim blackFillShapes As shapeRange
        Set blackFillShapes = layerShape.shapes.FindShapes(Query:="@fill.color.rgb[.r=0 and .g=0 and .b=0]")
        Globals.setShapeRangeColor blackFillShapes, CreateCMYKColor(0, 0, 0, 100), Nothing, True, True, False, False

        Dim blackOutlineShapes As shapeRange
        Set blackOutlineShapes = layerShape.shapes.FindShapes(Query:="@outline.color.rgb[.r=0 and .g=0 and .b=0]")
        Globals.setShapeRangeColor blackFillShapes, Nothing, CreateCMYKColor(0, 0, 0, 100), False, False, True, True
        ' --------------------------------------------
    
    
        ' RGB-Weiß und 100%-CMYK-Weiß zu 99%-CMYK-Weiß
        ' --------------------------------------------
        Dim whiteFillShapes As shapeRange
        Set whiteFillShapes = layerShape.shapes.FindShapes(Query:="@fill.color.rgb[.r=255 and .g=255 and .b=255]")
        whiteFillShapes.AddRange layerShape.shapes.FindShapes(Query:="@fill.color.cmyk[.c=0 and .m=0 and .y=0 and .k=0]")
        Globals.setShapeRangeColor whiteFillShapes, CreateCMYKColor(0, 0, 0, 1), Nothing, True, True, False, False
    
    
        Dim whiteOutlineShapes As shapeRange
        Set whiteOutlineShapes = layerShape.shapes.FindShapes(Query:="@outline.color.rgb[.r=255 and .g=255 and .b=255]")
        whiteOutlineShapes.AddRange layerShape.shapes.FindShapes(Query:="@outline.color.cmyk[.c=0 and .m=0 and .y=0 and .k=0]")
        Globals.setShapeRangeColor whiteOutlineShapes, Nothing, CreateCMYKColor(0, 0, 0, 1), False, False, True, True
        ' --------------------------------------------
        
    End If
    
    
End Function


Public Function getReplaceSlugForVariante(variante As variante) As String
    
    getReplaceSlugForVariante = getAllVariants.p_getReplaceSlugForVariante(variante)
    ' Wenn das VariantenArray keinen replaceSlug zurückgibt, dann weil es keine echte Variante ist, bzw. es keine Auswahl zwischen mind. 2 Varianten gibt
    If getReplaceSlugForVariante = "" Then
        Exit Function ' Return ""
    End If
    
    ' Bei Grundplatten und Fotomasken kommt der Formname noch hinzu
    If variante.typee = GroundplateVariantType Or variante.typee = PhotoMaskVariantType Then
        getReplaceSlugForVariante = replace(Me.getShapeName, " ", "-") & "_" & getReplaceSlugForVariante
    End If
    
    
End Function


Public Function isMainShapeEqualToOtherLayer(layer As ProductDesignLayer, Optional logger As logger) As Boolean
    
    If Not logger Is Nothing Then
        logger.logINFO "[ProductDesignLayer.isMainShapeEqualToOtherLayer]"
        logger.addTab
    End If
    
    Dim mainShapesCopy As shape
    Set mainShapesCopy = getMainShapesCombinedCopy
    
    Dim otherMainShapesCopy As shape
    Set otherMainShapesCopy = layer.getMainShapesCombinedCopy
    
    otherMainShapesCopy.centerX = mainShapesCopy.centerX
    otherMainShapesCopy.centerY = mainShapesCopy.centerY
    
    isMainShapeEqualToOtherLayer = Globals.areShapesCurvesEqual(mainShapesCopy, otherMainShapesCopy, False, , 5, logger)
    
    mainShapesCopy.delete
    otherMainShapesCopy.delete
    
    If Not logger Is Nothing Then
        logger.removeTab
    End If
    
End Function


' TODO
Public Function getUploadBoxes() As shapeRange
    Set getUploadBoxes = newCustomShapeTypeQuery(uploadBox).setContinueSearchInMatchedGroups(False).search
End Function


' Gibt zurück ob skaliert wurde (wenn nicht skaliert wurde, dann weil es schon die gewünschte Größe hat)
Public Function scaleLayerWithScale(scaleX As Double, scaleY As Double, Optional updateBleed As Boolean, Optional scaleOrigin As Vector, Optional logger As logger) As Boolean
    
    Dim width As Double
    width = getMainShape.SizeWidth * scaleX
    
    Dim height As Double
    height = getMainShape.SizeHeight * scaleY
    
    ' Merken ob Skaliert wurde
    scaleLayerWithScale = scaleLayer(width, height, False, updateBleed, scaleOrigin, logger)
End Function


' Gibt zurück ob skaliert wurde (wenn nicht skaliert wurde, dann weil es schon die gewünschte Größe hat)
' Wenn kein 'scaleOrigin' angegeben wurde, wird dieser Layer in seine eigene Mitte skaliert, was nicht immer unbedingt gewünscht ist.
' Man kann bspw. die Mitte des Parts angeben
Public Function scaleLayer(Optional width As Double, Optional height As Double, Optional relativeSize As Boolean, Optional updateBleed As Boolean, Optional scaleOrigin As Vector, Optional logger As logger) As Boolean
    
    If Not logger Is Nothing Then logger.addTab , "[ProductDesignLayer.scaleLayer] width: '" & width & "', height: '" & height & "', relativeSize: '" & relativeSize & "'"
    
    If width = 0 And height = 0 Then
        Err.Raise vbObjectError + 513, , "[ProductDesignLayer.scaleLayer] Breite und Höhe sind 0"
    End If
    
    If width = 0 Then
        width = height * (getMainShape.SizeWidth / getMainShape.SizeHeight)
    ElseIf height = 0 Then
        height = width / (getMainShape.SizeWidth / getMainShape.SizeHeight)
    End If
    
    ' Vor den Skalieren sicherstellen, dass Outlines mitskaliert werden
    If Not logger Is Nothing Then logger.logINFO "Stelle Konturen auf 'mit Objekt skalieren' um ..."
    Globals.setShapeOutlinesScaleWithShape layerShape
    If Not logger Is Nothing Then logger.logINFO "- Konturen umgestellt!"
    
    'Unbedingt vor dem Skalieren feststellen
    Dim bleedSizeInMM As Double
    If Not logger Is Nothing Then logger.logINFO "Ermittle Beschnittzugabe ..."
    bleedSizeInMM = getBleedSizeInMM
    If Not logger Is Nothing Then logger.logINFO "- Beschnittzugabe: '" & bleedSizeInMM & "' mm"
    
    ' Ist wichtig für das Skalieren von Textboxen
    Dim oldWidth As Double
    oldWidth = getMainShape.SizeWidth
    
    ' Neue Größe
    Dim newWidth As Double
    If relativeSize Then
        newWidth = getMainShape.SizeWidth + width
    Else
        newWidth = width
    End If
    '
    Dim newHeight As Double
    If relativeSize Then
        newHeight = getMainShape.SizeHeight + height
    Else
        newHeight = height
    End If
    
    ' Seitenverhältnis
    Dim aspectRatio As Double
    aspectRatio = getMainShape.SizeWidth / getMainShape.SizeHeight
    '
    Dim newAspectRatio As Double
    newAspectRatio = newWidth / newHeight
    
    'If Not logger Is Nothing Then logger.logINFO "Alte Breite: " & getMainShape.SizeWidth & ", alte Höhe: " & getMainShape.SizeHeight & ", neue Breite: " & realNewWidth & ", neue Höhe: " & realNewHeight & ", Seitenverhältnis der neuen Größe: " & newAspectRatio
    
    ' Prüfen, ob die Größe sich wirklich ändert und ob skaliert werden muss
    ' -----------------------------------------------------------------------
'    If Not logger Is Nothing Then logger.logINFO "Vergleiche Größen: w: " & designsMainShapes.SizeWidth & ", h: " & designsMainShapes.SizeHeight & " - nw: " & realNewWidth & ", nh: " & realNewHeight & _
'        " - wd: " & Abs(designsMainShapes.SizeWidth - realNewWidth) & ", hd: " & Abs(designsMainShapes.SizeHeight - realNewHeight) & ", t: " & ActiveDocument.ToUnits(0.1, cdrPixel)
    '
    If (Abs(getMainShape.SizeWidth - newWidth) < ActiveDocument.ToUnits(0.1, cdrPixel)) And _
        (Abs(getMainShape.SizeHeight - newHeight) < ActiveDocument.ToUnits(0.1, cdrPixel)) Then
        
        If Not logger Is Nothing Then logger.logINFO "Die neue Größe ist die jetzige Größe. Abbruch!"
        GoTo ExitFunction
    End If
    ' ----------------------------------------------------------------------
    
    Dim centerX As Double
    If Not scaleOrigin Is Nothing Then
        centerX = scaleOrigin.x
    Else
        centerX = getMainShape.centerX
    End If
    
    Dim centerY As Double
    If Not scaleOrigin Is Nothing Then
        centerY = scaleOrigin.y
    Else
        centerY = getMainShape.centerY
    End If
    
    
    ' Proportional skalieren
    ' --------------------------
    If Not logger Is Nothing Then logger.logINFO "Skaliere Layer (SetSizeEx) ... newWidth: '" & newWidth & "', newHeight: '" & newHeight & "', centerX: '" & centerX & "', centerY: '" & centerY & "'"
    If productDesignAspectRatio > newSizeAspectRatio Then
        layerShape.SetSizeEx centerX, centerY, newWidth * (layerShape.SizeWidth / getMainShape.SizeWidth)
        'layerShape.SetSize newWidth * (layerShape.SizeWidth / getMainShape.SizeWidth) ' Herausragende Elemente kompensieren (Beschnittzugabe, Artikelnummer)
    Else
        layerShape.SetSizeEx centerX, centerY, , newHeight * (layerShape.SizeHeight / getMainShape.SizeHeight)
'        layerShape.SetSize , newHeight * (layerShape.SizeHeight / getMainShape.SizeHeight) ' Herausragende Elemente kompensieren (Beschnittzugabe, Artikelnummer)
    End If
    ' --------------------------
    
    If Not logger Is Nothing Then logger.logINFO "Layer skaliert!"
    
    
    
    ' Bei Textboxen die Schriftgröße skalieren, da das nicht beim Skalieren passiert
    ' ------------------------------------------------------------------
    Dim allTextBoxes As shapeRange
    Set allTextBoxes = newCustomShapeTypeQuery(Globals.customShapeType.ParagraphText).search

    If allTextBoxes.count > 0 Then
        For i = 1 To allTextBoxes.count
            ' Es kann sein, dass ein Text innerhalb einer Textbox die neue Skalierung nicht überlebt hat. Also nicht mehr in die Textbox passt.
            ' In diesem Fall wird der Text wieder an die Textbox angepasst.
            If Not Globals.isTextBoxTextSizeInAllowedRange(allTextBoxes(i).text.Story.size) Then
                allTextBoxes(i).text.FitTextToFrame
            End If
    
            If Globals.isTextBoxTextSizeInAllowedRange(allTextBoxes(i).text.Story.size) Then
                allTextBoxes(i).text.Story.size = allTextBoxes(i).text.Story.size * (getMainShape.SizeWidth / oldWidth) * 0.9999 ' Kleine Tolleranz, da der Text manchmal sonst nicht in die Textbox passt
            End If
        Next i
        If Not logger Is Nothing Then logger.logINFO "Texboxen skaliert!"
    Else
        If Not logger Is Nothing Then logger.logINFO "Keine Textboxen zum skalieren gefunden!"
    End If
    ' ------------------------------------------------------------------
    
    
    
    ' Wenn auch noch unproportional skaliert werden muss, wird die Hauptform von diesem Layer verzogen
    ' ------------------------------------------------------------------
    If Not (aspectRatio = newAspectRatio) Then
        
        Dim scaleX As Double
        Dim scaleY As Double
        
        If productDesignAspectRatio > newSizeAspectRatio Then
            scaleX = 1
            scaleY = newHeight / getMainShape.SizeHeight
        Else
            scaleX = newWidth / getMainShape.SizeWidth
            scaleY = 1
        End If
        
        ActiveDocument.ReferencePoint = cdrCenter
        
        getMainShape.setSize getMainShape.SizeWidth * scaleX, getMainShape.SizeHeight * scaleY
        
        ' Artikelnummer usw. neu ausrichten
        getPart.getDesign.positionMetadataShapes
    End If
    ' ------------------------------------------------------------------
    
    
    ' Beschnittzugabe aktualisieren
    ' ------------------------------------------------------------------
    If updateBleed Then
        Tool.createBleedForDesignLayer Me, bleedSizeInMM, True, , , , logger
    End If
     ' ------------------------------------------------------------------
    
    ' Zurückgeben, dass dieser Layer skaliert wurde
    scaleLayer = True
    
ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
End Function




Public Function isShapeLikeMainShapesOrWithBleed(shape As shape, Optional shapeCurve As curve, Optional mainShapesCombinedOfLayer As shape, Optional mainShapesCombinedOfLayerCurve As curve, Optional logger As logger) As Boolean
    
    If Not logger Is Nothing Then logger.addTab , "[ProductDesignLayer.isShapeLikeMainShapesOrWithBleed] shape: '" & Globals.getShapeDisplayName(shape) & "'"
    
    
    If shapeCurve Is Nothing Then
        Set shapeCurve = Globals.getCurveFromShape(shape)
    End If
    
    Dim mainShapesCombinedWasNothing As Boolean
    If mainShapesCombinedOfLayer Is Nothing Then
        Set mainShapesCombinedOfLayer = getMainShapesCombinedCopy
        mainShapesCombinedWasNothing = True
    End If
    
    If mainShapesCombinedOfLayerCurve Is Nothing Then
        Set mainShapesCombinedOfLayerCurve = Globals.getCurveFromShape(mainShapesCombinedOfLayer)
    End If
    
    
    
    Dim areRectanglesInside As Boolean
    areRectanglesInside = Globals.areRectanglesInside(mainShapesCombinedOfLayer.boundingBox, shape.boundingBox, , logger)
    ' DEBUG
'    ActiveLayer.CreateRectangleRect(mainShapesCombinedOfLayer.boundingBox).name = "mainShapesCombinedOfLayer_curve"
'    ActiveLayer.CreateRectangleRect(shape.boundingBox).name = "shape_curve"
    
    Dim areCurvesIntersecting As Boolean
    areCurvesIntersecting = Globals.isCurveIntersecting(shape, mainShapesCombinedOfLayer, True, logger)
    Dim areCurvesEqual As Boolean
    areCurvesEqual = Globals.areCurvesEqual(mainShapesCombinedOfLayerCurve, shapeCurve, True, logger, toleranceInMM:=1.75)
    
    
    ' Wenn die jetzige Form größer ist als die Hauptform ('areRectanglesInside') und diese komplett umhüllt (und es keine Überlappung gibt (Not 'areCurvesIntersecting')),
    ' hat es schon eine Beschnittzugabe.
    ' Oder wenn die jetzige Form den selben Pfad hat wie die Hauptform ('areCurvesEqual').
    ' Dann sollte es kein Problem sein einen neuen Zuschnitt zu machen
    If ((areRectanglesInside And Not areCurvesIntersecting) Or areCurvesEqual) Then
        isShapeLikeMainShapesOrWithBleed = True
        GoTo cleanUp
    End If
    
    ' TODO Funktioniert nicht
'    ' Es kann sein, dass wenn man einem Layer eine neue Form gibt, dass dann die Hintergründe zwar eine Beschnittzugabe haben, aber mit der neuen Form kollidieren
'    ' Dieser Teil prüft, ob die Hintergründe Flächentechnisch größer sind als die Hauptform (also eine Beschnittzugabe sind)
'    If Not Globals.isCurveHavingTooManyPointsForGettingArea(Globals.getCurveFromShape(mainShapesCombinedOfLayer)) And Not Globals.isCurveHavingTooManyPointsForGettingArea(shapeCurve) Then
'        If Globals.getAreaOfShape(shape) > Globals.getAreaOfShape(mainShapesCombinedOfLayer) Then
'            isShapeLikeMainShapesOrWithBleed = True
'            Exit Function
'        End If
'    End If
    
cleanUp:
    If mainShapesCombinedWasNothing Then
        mainShapesCombinedOfLayer.delete
    End If
    
    If Not logger Is Nothing Then
        logger.logINFO "Returning " & isShapeLikeMainShapesOrWithBleed
        logger.removeTab
    End If
    
End Function



Public Function isShapeIntersectingWithOther(shape As shape, Optional preciseCheck As Boolean = False, Optional alsoCheckGroupContent As Boolean = True, Optional autoPrecision As Boolean, Optional logger As logger) As Boolean
    
    If Not logger Is Nothing Then logger.addTab , "[ProductDesignLayer.isShapeIntersectingWithOther]"
    
    isShapeIntersectingWithOther = isShapeIntersectingWithOtherShapes(shape, layerShape.shapes.All, preciseCheck, alsoCheckGroupContent, autoPrecision, logger)
    
    If Not logger Is Nothing Then logger.removeTab
    
End Function


Public Function isShapeChildOfThisLayer(shape As shape, Optional logger As logger) As Boolean
    isShapeChildOfThisLayer = Globals.isShapeChildOfGroup(shape, layerShape, logger)
End Function



Private Function isShapeIntersectingWithOtherShapes(shape As shape, shapes As shapeRange, Optional preciseCheck As Boolean = False, Optional alsoCheckGroupContent As Boolean = True, Optional autoPrecision As Boolean, Optional logger As logger) As Boolean
    
    If Not logger Is Nothing Then logger.addTab , "[ProductDesignLayer.isShapeIntersectingWithOtherShapes]"
    
    Dim shapeHavingToManyNodes As Boolean
    shapeHavingToManyNodes = Globals.isShapeHavingToManyNodes(shape)
    
    For i = 1 To shapes.count
        Dim currShape As shape
        Set currShape = shapes(i)
        
        
        ' Präzision feststellen
        ' -----------------------------
        Dim doPreciseCheck As Boolean
        If autoPrecision Then
            If Not shapeHavingToManyNodes Then
                If Not Globals.isShapeHavingToManyNodes(currShape, logger) Then
                    doPreciseCheck = True
                End If
            End If
        Else
            doPreciseCheck = preciseCheck
        End If
        ' -----------------------------
        
        If Not logger Is Nothing Then logger.logINFO "doPreciseCheck: '" & doPreciseCheck & "' currShape: " & Globals.shapeToString(currShape) & ", shape: " & Globals.shapeToString(shape)
        
        If Not currShape Is shape And Classfactory.newCustomShapeTypeQuery(currShape, DesignElementShapeType).isShapesMatchingQueryNonRecursive Then
        
            If currShape.Type = cdrGroupShape And alsoCheckGroupContent And Not Globals.isGroupHavingToManyShapes(currShape) Then
                If isShapeIntersectingWithOtherShapes(shape, currShape.shapes.All, preciseCheck, alsoCheckGroupContent) Then
                    isShapeIntersectingWithOtherShapes = True
                    GoTo ExitFunction
                End If
            End If
            
            If doPreciseCheck Then
                If Globals.areShapesOverlapping(shape, currShape) Then
                
                    isShapeIntersectingWithOtherShapes = True
                    GoTo ExitFunction
                End If
            Else
                If Globals.areRectanglesOverlapping(currShape.boundingBox, shape.boundingBox) Or _
                   Globals.areRectanglesInside(currShape.boundingBox, shape.boundingBox) Or _
                   Globals.areRectanglesInside(shape.boundingBox, currShape.boundingBox) Then
                    
                    If Not logger Is Nothing Then logger.logINFO "shape: " & Globals.shapeToString(shape) & " überlappt mit currShape: " & Globals.shapeToString(currShape)
                    
                    isShapeIntersectingWithOtherShapes = True
                    GoTo ExitFunction
                End If
            End If
            
        End If
        
        doPreciseCheck = False
        Set currShape = Nothing
    Next i
    
ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
    
End Function


Public Function isShapeFromHere(shp As shape) As Boolean
    isShapeFromHere = Globals.flattenShapeRange(layerShape.shapes.All, , True).Exists(shp)
End Function

 
Public Function getEqualVariant(vari As variante) As variante
    
    If Not variante Is Nothing Then
        If vari.isEqualTo(variante) Then
            Set getEqualVariant = variante
        End If
    End If
    
    ' Init
    getAllVariants
    
    Set getEqualVariant = allVariants.getEqualVariant(vari)
End Function



Public Function convertTextBoxesToNormalText()
    
    Dim textBoxes As shapeRange
    Set textBoxes = newCustomShapeTypeQuery(DesignElementShapeType).search  ' Nur DesignElemente
    Set textBoxes = Classfactory.newCustomShapeTypeQuery(textBoxes, ParagraphText).search  ' Nur Textboxen
    
    Dim i As Integer
    For i = 1 To textBoxes.count
        textBoxes(i).text.ConvertToArtistic
    Next i
End Function


Public Function isOverlappingWithLayer(layerB As ProductDesignLayer, Optional logger As logger) As Boolean
    If Globals.areRectanglesOverlapping(getMainShape.boundingBox, layerB.getMainShape.boundingBox) Then
        isOverlappingWithLayer = Globals.isCurveIntersecting(getMainShape, layerB.getMainShape, , logger)
    End If
End Function


Public Function addShapeRange(range As shapeRange, Optional addMode As MainShapeAddMode, Optional logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[ProductDesignLayer.addShapeRange]"
    
    Dim i As Integer
    For i = 1 To range.count
        addShape range(i), addMode, logger
    Next i
    
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function addShape(ByVal shp As shape, Optional addMode As MainShapeAddMode, Optional logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[ProductDesignLayer.addShape] "
    
    ' TODO automatisch erkennen, ob eine rote Form hinzugefügt zu den Hauptformen oder ob es die neue Hauptform wird:
    ' - Wenn die neue rote Form die alte Berührt, dann ist es zu 80% eine Form, die zum Ersetzen der Alten gedacht ist (Hat Pfade an der selben Position)
    ' Denn Bohrlöcher bspw. überlappen ja nie mit der Hauptform
    ' Allerdings gibt es ja auch den fall, dass die neue Form größer ist. Wobei da der Designskalierer genutzt wird
    
    ' Automatisch erkennen
    If addMode = AutoSenseNewMainShapes Then
        If getPart.getDesign.isShapeValidLayerGroup(shp) Then
            addMode = CreateNewLayerOfNewMainShapes
        Else
            addMode = AddNewMainShapesToExisting
        End If
    End If
    
    Select Case addMode
        Case MainShapeAddMode.AddNewMainShapesToExisting
            invalidateAllRedShapes
            
        Case MainShapeAddMode.OverrideNewMainShapesWithExisting
            newCustomShapeTypeQuery(RedOrPinkShape).search.delete
            invalidateAllRedShapes
        
        Case MainShapeAddMode.DeleteNewMainShapes
            Classfactory.newCustomShapeTypeQuery(shp, RedOrPinkShape).search.delete
        
        Case MainShapeAddMode.CreateNewLayerOfNewMainShapes
            getPart.getDesign.addLayer shp, logger
    End Select
    
    If Not logger Is Nothing Then logger.removeTab
End Function


' Gibt ein Form Suchen Objekt 'CustomShapeTypeQuery' zurück, das in diesem Layer nach passenden Formen sucht
Public Function newCustomShapeTypeQuery(shapeType As customShapeType) As CustomShapeTypeQuery
    Set newCustomShapeTypeQuery = Classfactory.newCustomShapeTypeQuery(getShapesForCustomShapeTypeQuery, shapeType)
End Function


Public Function getShapesForCustomShapeTypeQuery() As shapeRange
    ' Es wird nicht die Form diesen Layers direkt mitgegeben, sondern seine Childs
    ' Denn wenn die Form diesen Layers zu viele Childs hat, würde die Suche für diese Form abgebrochen werden.
    ' Das gilt dann aber auch weiterhin für Childs die selber eine Gruppe sind und zu viele Formen haben: Zu viele Formen werden standartmäßig übersprungen
    Set getShapesForCustomShapeTypeQuery = layerShape.shapes.All
End Function


' Konvertiert diesen Layer aus dem normalen Design Zustand zum Zustand für den FancyExport
Public Function convertForFancyExport()
    
    Dim boundingUploadboxes As shapeRange
    Set boundingUploadboxes = newCustomShapeTypeQuery(uploadBox).setArgument1(BoundedUploadBoxType).search
    
    Dim i As Integer
    For i = 1 To boundingUploadboxes.count
        Dim currentUploadBox As shape
        Set currentUploadBox = boundingUploadboxes(i)
        
        Dim confiUploadBoxCutForImportShape As shape
        Set confiUploadBoxCutForImportShape = Globals.createConfiUploadBoxCutForImportShapeType(currentUploadBox)
        confiUploadBoxCutForImportShape.OrderFrontOf currentUploadBox
    Next i
    
End Function



' Entfernt diesen Layer von dem Design und löscht seine Formen aus Corel
Public Function delete()
    Remove
    layerShape.delete
End Function


' Entfernt diesen Layer vom Design
Public Function Remove()
    getPart.p_removeLayer Me
End Function


Public Function toString() As String
    toString = "layerShape: '" & Globals.getShapeDisplayName(layerShape) & ", layerIndex: '" & layerIndex & "', partIndex: '" & partIndex & "'"
End Function

