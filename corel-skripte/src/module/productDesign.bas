Attribute VB_Name = "ProductDesign"
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
' Variablen-Namens-Vorschlag: design


Dim designShape As shape

Public parts As New ProductDesignPartRange
Public allLayers As New ProductDesignLayerRange
Dim layerShapes As New shapeRange

Dim masterDesign As Boolean
Dim masterDesignInitialized As Boolean
Public masterDesignIsTemporaryLoaded As Boolean ' Wenn das Masterdesign als CDR aus dem [CDR] ordner hinzugeladen wurde, dann ist es nur temporär und muss nach dem Nutzen gelöscht werden

Dim productIDShape As shape
Dim productIDString As String
Dim ProductIDObject As New ProductIDObject

Dim fancyCustomizationIDShapes As New shapeRange
Dim fancyCustomizationIDShapesInitialized As Boolean

Dim layersAndPartsInitialized As Boolean


Public Function newProductDesign(designShapeVar As shape, Optional quietMode As Boolean = False)

    If designShapeVar Is Nothing Then
        Err.Raise vbObjectError + 513, , "[ProductDesign] Das Shape ist 'Nothing' "
    End If
    
    If Not designShapeVar.Type = cdrGroupShape Then
        Err.Raise vbObjectError + 513, , "[ProductDesign] Ein Design muss eine Gruppe sein"
    End If

    
    Set designShape = designShapeVar
End Function


Public Function initLayersAndPartsIfNeeded(Optional logger As logger, Optional headless As Boolean = False)
    If Not layersAndPartsInitialized Then
        initLayersAndParts logger, headless
    End If
End Function


Public Function initLayersAndParts(Optional logger As logger, Optional headless As Boolean = False) As Boolean
    If Not logger Is Nothing Then logger.addTab , "[ProductDesign.initLayersAndParts] designShape: '" & Globals.getShapeDisplayName(designShape) & "'"
    
    Set allLayers = New ProductDesignLayerRange
    
    If designShape Is Nothing Then
        Err.Raise vbObjectError + 513, , "[ProductDesign.initLayersAndParts] DesignShape ist nicht vorhanden"
    End If
    
    Dim layerGroups As collection
    Set layerGroups = getLayerGroups(designShape.shapes.All, logger)
    
    If layerGroups.count = 0 Then
        ' Es gibt keine gruppierten Layer. Also ist die Designform auch die Layerform
        initNewLayer designShape
    Else
        Dim i As Integer
        For i = 1 To layerGroups.count
            initNewLayer layerGroups(i)
        Next i
    End If
    
    
    If Not logger Is Nothing Then logger.logFINE "allLayers.Count: '" & allLayers.count & "'"
    
    initParts logger
    
    layersAndPartsInitialized = True
    
    If Not logger Is Nothing Then logger.removeTab
End Function



Private Function getLayerGroups(range As shapeRange, Optional logger As logger) As collection
    If Not logger Is Nothing Then logger.addTab , "[ProductDesign.getLayerGroups]"
    
    Dim groups As New collection
    
    Dim i As Integer
    For i = 1 To range.count
        ' Variantengruppen ignorieren, denn diese sind keine Layer, obwohl sie eine Gruppe sind und rote/pinke Formen haben
        If isShapeValidLayerGroup(range(i), logger) Then
            groups.add range(i)
            If Not logger Is Nothing Then logger.logFINE "Gruppe gefunden. Name: '" & range(i).name & "'"
        Else
            
            ' In einer DesignShape-Gruppe dürfen nur die einzelnen Teile/Schichten sein, eine rote/pinke Schablone und/oder Metadaten-Formen wie die grüne Artikelnummer in Textform
            ' Viewboxen dürfen nur in einzelnen Schichten abgelegt sein, da eine Viewbox immer zu einem Part gehört. Heißt: Wenn es 2 Parts gibt, dann kann es auch 2 Viewboxen geben. Deshalb müssen die Viewboxen in einer Schicht sein, damit man weiß, zu welchem Part sie gehört
            If Not Globals.isShapeMetadata(range(i)) Then
                ' ... ansonsten ist es kein Design mit mehreren Parts/Layern
                
                ' TODO vorerst deaktiviert, da der PlaceFile beim platzieren von Looks aus einer Schichten ein Design macht.
                ' Das würde diese Fehlermeldung auch triggern, da dann zwar die Viewbox korrekterweise in einer Schicht liegt.
                ' Prüfen ob es eine Viewbox ist, die nicht in ihrer dazugehörigen Schicht ist, sondern neben den Schichtgruppen in der Designgruppe
'                If Globals.isViewShape(designShape.shapes(i)) Then
'                    Err.Raise vbObjectError + 513, , "[Globals.getPotentialLayerGroups] Die Viewbox muss in die Gruppe einer Schicht abgelegt werden!"
'                End If
                
                ' Auch wenn vorher Gruppen gefunden wurden. Sobald eine Form gefunden wird, die weder eine Gruppe noch eine Metadata-Form ist,
                ' ist es eine Form, die außerhalb eines Layers verboten ist.
                ' Deshalb gibt es keine Layer in solchen Fällen
                GoTo ReturnEmptyCollection
            End If
        End If
    Next i
    
    GoTo ExitFunction
ReturnEmptyCollection:
    Set groups = New collection
ExitFunction:
    Set getLayerGroups = groups
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function isShapeValidLayerGroup(shp As shape, Optional logger As logger) As Boolean
    If Not logger Is Nothing Then logger.addTab , "[ProductDesign.isShapeValidLayerGroup]"
    
    isShapeValidLayerGroup = shp.Type = cdrGroupShape And Not Globals.isStaticVariant(shp) And _
        Classfactory.newCustomShapeTypeQuery(shp, RedOrPinkShape).search.count > 0
        ' gucken ob eine rote/pinke Hauptform vorhanden ist
    
    If Not logger Is Nothing Then
        logger.logINFO "Returne '" & isShapeValidLayerGroup & "'"
        logger.removeTab
    End If
End Function


Public Function initNewLayer(groupShape As shape) As ProductDesignLayer
    Dim layer As New ProductDesignLayer
    layer.newProductDesignLayer Me, groupShape
    
    allLayers.add layer
    layerShapes.add layer.layerShape
    Set initNewLayer = layer
End Function


' Parts ergeben sich aus überlappenden Layern
Public Function initParts(Optional logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[ProductDesign.initParts]"

    parts.RemoveAll
    
    Dim layerGroups As ArrayList
    Set layerGroups = findLayerGroups(logger)
    
    Dim i As Integer
    For i = 1 To layerGroups.count
        Dim newPart As ProductDesignPart
        Set newPart = newProductDesignPart(Me, i)
        parts.add newPart
        
        Dim j As Integer
        For j = 1 To layerGroups.item(i).count
            newPart.add layerGroups.item(i).item(j)
        Next j
    Next i
    
    If Not logger Is Nothing Then logger.removeTab
End Function


Private Function findLayerGroups(Optional logger As logger) As ArrayList
    If Not logger Is Nothing Then logger.addTab , "[ProductDesign.findLayerGroups]"
    
    Dim groups As New ArrayList
    
    Dim i As Integer
    For i = 1 To allLayers.count
        Dim currLayer As ProductDesignLayer
        Set currLayer = allLayers.getLayer(i)
        
        If Not logger Is Nothing Then logger.logINFO "currLayer " & currLayer.toString
        
        If Not groups.Contains(currLayer, True) Then
            If Not logger Is Nothing Then logger.logINFO "Layer ist noch in keiner Gruppe"
            
            Dim newGroup As New ArrayList
            newGroup.add currLayer
            
            groups.add newGroup
            
            processLayerGroup newGroup, groups, logger
            Set newGroup = Nothing
        End If
        
        Set currLayer = Nothing
    Next i
    
    If Not logger Is Nothing Then logger.logINFO "groups.Count: '" & groups.count & "'"
    
    Set findLayerGroups = groups
    
    If Not logger Is Nothing Then logger.removeTab
End Function


Private Function processLayerGroup(ByRef group As ArrayList, ByRef groups As ArrayList, Optional logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[ProductDesign.processLayerGroup]"
    
    Dim j As Integer
    j = 1
    ' Dynamische Schleife (For Schleife elaubt kein dynamisches "To")
    Do While j <= group.count
        Dim currLayer As ProductDesignLayer
        Set currLayer = group.item(j)
        
        If Not logger Is Nothing Then logger.logINFO "currLayer " & currLayer.toString
        
        searchLayerOverlaps currLayer, allLayers.IndexOf(currLayer), group, groups, logger
        
        Set currLayer = Nothing
        j = j + 1
    Loop

    If Not logger Is Nothing Then logger.removeTab
End Function


Private Function searchLayerOverlaps(layer As ProductDesignLayer, layerIndex As Integer, groupOfLayer As ArrayList, ByRef groups As ArrayList, Optional logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[ProductDesign.searchLayerOverlaps]"
    
    If Not logger Is Nothing Then logger.logINFO "layer " & layer.toString
    
    Dim i As Integer
    For i = 1 To allLayers.count
        Dim currLayer As ProductDesignLayer
        Set currLayer = allLayers.getLayer(i)
        
        If Not logger Is Nothing Then logger.logINFO "currLayer " & currLayer.toString
        
        ' Nur Layer außerhalb der eignenen Gruppe vergleichen
        If Not groupOfLayer.Contains(currLayer) Then
            ' Wenn beide Layer sich überlappen gehören sie zur selben Gruppe und danach auch zum selben Part
            If layer.isOverlappingWithLayer(currLayer, logger) Then
                If Not logger Is Nothing Then logger.logINFO "Überlappung gefunden"
                groupOfLayer.add currLayer
            End If
        End If
        
        Set currLayer = Nothing
    Next i
    
    If Not logger Is Nothing Then logger.removeTab
End Function



Public Function getProductIDShape(Optional createIfNotExisting As Boolean, Optional productIDType As productIDType = NormalProductID, Optional productIDString As String) As shape

    If productIDShape Is Nothing Then
        Set productIDShape = Globals.getProductIDShape(designShape)
        
        ' Falls keine Form gefunden wurde, aber in solchem Fall eine erstellt werden soll
        If productIDShape Is Nothing And createIfNotExisting Then
            Set productIDShape = createMetadataText
        
            productIDShape.fill.ApplyUniformFill CreateColor(Globals.getProductIDTypeHexColor(productIDType))
            productIDShape.name = "Artikelnummer"
            productIDShape.text.Story.text = productIDString
        End If
        
        
        If Not productIDShape Is Nothing Then
            If Globals.isStringHavingIllegalDirectoryChars(Globals.getProductIDFromShape(productIDShape)) Then
                MsgBox "Die Artikelnummer '" & Globals.getProductIDFromShape(productIDShape) & "' enthält für Ordner ungültige Zeichen", vbCritical
                Globals.endMacro
            End If
        End If
    End If
    
    Set getProductIDShape = productIDShape
End Function


Private Function createMetadataText() As shape
    Set createMetadataText = ActiveLayer.CreateArtisticText(0, 0, "Metadata", , , "Arial")
    createMetadataText.OrderFrontOf getDesignShape.shapes.First
End Function


Public Function hasProductIDString() As Boolean
    hasProductIDString = Not getProductID = ""
End Function


Public Function getProductID() As String
    
    If productIDString = vbNullString Then
        Dim productIDShape As shape
        Set productIDShape = getProductIDShape()
        
        If Not productIDShape Is Nothing Then
            
            productIDString = Globals.getProductIDFromShape(productIDShape)
            
            getProductID = productIDString
        End If
    Else
       getProductID = productIDString
    End If
    
End Function


Public Function getProductIDObject() As ProductIDObject
    ProductIDObject.setProductID getProductID
    Set getProductIDObject = ProductIDObject
End Function


Public Function updateProductIDFromProductIDObject(Optional doPositionMetadataShapes As Boolean = True)
    productIDString = ProductIDObject.getProductID
    getProductIDShape.text.Story.text = getProductIDObject.getProductID
    
    If doPositionMetadataShapes Then positionMetadataShapes
End Function


Public Function deleteProductIDShape()
    
    If Not getProductIDShape() Is Nothing Then
        getProductID 'ProduktID vorher speichern
        getProductIDShape().delete
        Set productIDShape = Nothing
    End If
    
End Function


Public Function setFancyCustomizationID(index As Integer, fancyCustomizationID As Long, Optional doPositionMetadataShapes As Boolean)
    getFancyCustomizationIDShape(index).text.Story.text = fancyCustomizationID
    If doPositionMetadataShapes Then positionMetadataShapes
End Function


Public Function addFancyCustomizationIDShape(fancyCustomizationID As Long, Optional doPositionMetadataShapes As Boolean) As shape
    
    Dim result As shape
    Set result = createMetadataText
    result.name = "CustomizationID"
    result.text.Story.text = CStr(fancyCustomizationID)
    result.outline.SetNoOutline
    result.fill.ApplyUniformFill CreateColor(Globals.getFancyCustomizationIDHexCode)
    
    fancyCustomizationIDShapes.add result
    
    If doPositionMetadataShapes Then positionMetadataShapes
    
    Set addFancyCustomizationIDShape = result
End Function


Public Function deleteFancyCustomizationIDShape(fancyCustomizationID As Long, Optional doPositionMetadataShapes As Boolean)
    initializeFancyCustomizationIDShapesIfNotAlready
    
    Dim i As Integer
    For i = 1 To fancyCustomizationIDShapes.count
        If fancyCustomizationIDShapes(i).text.Story.text = CStr(fancyCustomizationID) Then
            fancyCustomizationIDShapes(i).delete
            Exit For
        End If
    Next i
    
    If doPositionMetadataShapes Then positionMetadataShapes
End Function

 
Public Function getFancyCustomizationIDShape(index As Integer) As shape
    
    initializeFancyCustomizationIDShapesIfNotAlready
     
    Set getFancyCustomizationIDShape = fancyCustomizationIDShapes.item(index)
End Function


Private Function initializeFancyCustomizationIDShapesIfNotAlready()
    If Not fancyCustomizationIDShapesInitialized Then
        fancyCustomizationIDShapes.AddRange newCustomShapeTypeQuery(fancyCustomizationIDShapeType).search
        fancyCustomizationIDShapesInitialized = True
    End If
End Function


Public Function getFancyCustomizationID(index As Integer) As String
    
    initializeFancyCustomizationIDShapesIfNotAlready
    
    getFancyCustomizationID = getFancyCustomizationIDShape(index).text.Story.text
    
End Function


Public Function getFancyCustomizationIDs() As ArrayList
    Dim result As New ArrayList
    
    initializeFancyCustomizationIDShapesIfNotAlready
    
    Dim i As Integer
    For i = 1 To fancyCustomizationIDShapes.count
        result.add getFancyCustomizationID(i)
    Next i
    
    Set getFancyCustomizationIDs = result
End Function


Public Function hasFancyCustomizationID(fancyCustomizationID As Long)
    
    initializeFancyCustomizationIDShapesIfNotAlready

    Dim j As Integer
    For j = 1 To fancyCustomizationIDShapes.count
        Dim customizationIDStr As String
        customizationIDStr = getFancyCustomizationID(j)
        
        If customizationIDStr = CStr(fancyCustomizationID) Then
            hasFancyCustomizationID = True
            Exit Function
        End If
    Next j
End Function


Public Function deleteMetaInfoShapes()
    deleteProductIDShape
    deleteFancyCustomizationIDShapes
End Function


' Gibt die (Text)Formen zurück, die Metainfos wie z.B. die Artikelummer speichern und über dem Design stehen
Public Function getMetaInfoShapes(Optional createIfNotExisting As Boolean) As shapeRange
    Dim result As New shapeRange
    
    If Not getProductIDShape(createIfNotExisting) Is Nothing Then result.add getProductIDShape
    initializeFancyCustomizationIDShapesIfNotAlready
    result.AddRange fancyCustomizationIDShapes
    
    Set getMetaInfoShapes = result
End Function


Public Function positionMetadataShapes()
    
    Dim metadataShapes As shapeRange
    Set metadataShapes = getMetaInfoShapes
    
    Dim allShapesExceptForMeta As shapeRange: Set allShapesExceptForMeta = Globals.flattenShapeRange(designShape.shapes.All)
    allShapesExceptForMeta.RemoveRange metadataShapes
    
    Dim yPaddingToDesign As Double
    yPaddingToDesign = 0.05
    Dim yPaddingBetweenMetadata As Double
    yPaddingBetweenMetadata = 0.07
    
    Dim i As Integer
    For i = 1 To metadataShapes.count
        Dim currMetadataShape As shape
        Set currMetadataShape = metadataShapes(i)
        
        Globals.safeSetTextShapeTextSize currMetadataShape, ConvertUnits(allShapesExceptForMeta.SizeWidth / 18, ActiveDocument.unit, cdrPoint)
        currMetadataShape.LeftX = allShapesExceptForMeta.LeftX
        currMetadataShape.BottomY = allShapesExceptForMeta.TopY + _
            (allShapesExceptForMeta.SizeWidth * yPaddingToDesign) + _
            ((allShapesExceptForMeta.SizeWidth * yPaddingBetweenMetadata) * (metadataShapes.count - i))
        
        Set currMetadataShape = Nothing
    Next i
End Function



Public Function getLayer(ByVal partIndex As Integer, ByVal layerIndex As Integer) As ProductDesignLayer
    
    initLayersAndPartsIfNeeded
    
    Set getLayer = parts.getPart(partIndex).getLayer(layerIndex)

End Function


Public Function getLayer2(ByVal layersIndex As Integer) As ProductDesignLayer
    Set getLayer2 = getLayers.getLayer(layersIndex)
End Function


Public Function getPartsCount() As Integer

    initLayersAndPartsIfNeeded
    
'    MsgBox "getPartsCount"
    
    getPartsCount = parts.count

End Function





Public Function getPart(ByVal partIndex As Integer) As ProductDesignPart

    initLayersAndPartsIfNeeded
    
    Set getPart = parts.getPart(partIndex)
    
End Function

 
' Prüft, ob dieses Design ein Design nach den derzeitigen Standart ist. Ob alle roten Formen vorhanden sind etc.
Public Function isValidProductDesign(Optional headless As Boolean = True, Optional layersNeedToHaveMainShape As Boolean = True, Optional logger As logger) As Boolean
    
    isValidProductDesign = True
    
    initLayersAndPartsIfNeeded logger, headless
    
    If getPartsCount = 0 Then
        isValidProductDesign = False
        Exit Function
    End If
    
    If Globals.isUploadBox(designShape) Then
        isValidProductDesign = False
        Exit Function
    End If
    
    Dim i As Integer
    For i = 1 To getLayers.count
        If layersNeedToHaveMainShape Then
            If getLayer2(i).getMainShape Is Nothing Then
                isValidProductDesign = False
                Exit Function
            End If
        End If
    Next i

End Function

Public Function getDesignShape() As shape
    Set getDesignShape = designShape
End Function


Public Function showGroundPlates(Optional Show As Boolean = True)
    Dim i As Integer
    For i = 1 To parts.count
        Dim j As Integer
        For j = 1 To parts.getPart(i).count
            parts.getPart(i).getLayer(j).showGroundPlate Show
        Next j
    Next i
End Function

' Macht alle Shapes sichtbar/unsichtbar. Aber keine Shapes/Gruppen in Gruppen. Nur die Gruppe selbst
Public Function showAll(Optional Show As Boolean = True)
    Dim i As Integer
    For i = 1 To parts.count
        Dim j As Integer
        For j = 1 To parts(i).count
            parts.getPart(i).getLayer(j).showAll Show
        Next j
    Next i
End Function


Public Function getValidShapesFor(Optional forProductPicture As Boolean = False, Optional forFancyKonfi As Boolean = False, Optional forAmazonKonfi As Boolean = False) As shapeRange
    
    Set getValidShapesFor = New shapeRange
    
    Dim i As Integer
    For i = 1 To parts.count
        Dim j As Integer
        For j = 1 To parts.getPart(i).count
            getValidShapesFor.AddRange parts.getPart(i).getLayer(j).getValidShapesFor(forProductPicture, forFancyKonfi, forAmazonKonfi)
        Next j
    Next i
    
End Function


Public Function hasNonRectangularUploadBox() As Boolean
    Dim i As Integer
    For i = 1 To parts.count
        Dim j As Integer
        For j = 1 To parts.getPart(i).count
            If parts.getPart(i).getLayer(j).hasNonRectangularUploadBox() Then
                hasNonRectangularUploadBox = True
                Exit Function
            End If
        Next j
    Next i
End Function


Public Function hasElementsOverBoundedUploadboxes() As Boolean
    Dim i As Integer
     For i = 1 To parts.count
        Dim j As Integer
        For j = 1 To parts.getPart(i).count
            If parts.getPart(i).getLayer(j).hasElementsOverBoundedUploadboxes() Then
                hasElementsOverBoundedUploadboxes = True
                Exit Function
            End If
        Next j
    Next i
End Function


Public Function sortText(Optional orderTextToFront As Boolean)
    Dim i As Integer
    For i = 1 To parts.count
        Dim j As Integer
        For j = 1 To parts(i).count
            parts.getPart(i).getLayer(j).sortText orderTextToFront
        Next j
    Next i
End Function




' Fügt eine Gruppe als neue Schicht zu diesem Design hinzu
Public Function addLayer(layerGroupShape As shape, Optional logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[ProductDesign.addLayer]"
    
    getMetaInfoShapes ' Vorher Cachen
    
    ' Wenn nur ein Part und ein Layer vorhanden sind, ist der Layer nicht gruppiert. Kommt aber jetzt noch ein weiterer Layer(gruppiert) hinzu muss der erste auch gruppiert werden
    If getPartsCount = 1 And getPart(1).count = 1 Then
    
        ' Wenn die einzige Schicht des einzigen Teils die selbe Gruppe ist wie die vom gesamten Design, heißt das, dass die Schicht noch nicht gruppiert ist
        If getPart(1).item(1).layerShape Is designShape Then
            
            Dim allShapesExceptForProductID As shapeRange
            Set allShapesExceptForProductID = getPart(1).item(1).layerShape.shapes.All
            
            'ProduktID soll nicht gruppiert werden, deshalb finden und aus der Range löschen
            allShapesExceptForProductID.RemoveRange Classfactory.newCustomShapeTypeQuery(allShapesExceptForProductID, customShapeType.productID).search
            allShapesExceptForProductID.group
        End If
       
        
    End If
    
    If Not Globals.getParent(layerGroupShape) Is designShape Then
        layerGroupShape.OrderBackOf designShape.shapes.Last
    End If
    
    initNewLayer layerGroupShape
    
    initParts
    
    positionMetadataShapes
    
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function addDesignLayers(design As productDesign, Optional logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[ProductDesign.addDesignLayers]"
    
    design.getLayer2 (1) ' Cachen
    
    Dim p As Integer
    For p = 1 To design.getPartsCount
        
        Dim currentPart As ProductDesignPart
        Set currentPart = design.getPart(p)
        
        Dim i As Integer
        For i = 1 To currentPart.layers.count
            Dim currentLayer As ProductDesignLayer
            Set currentLayer = currentPart.layers.getLayer(i)
            
            ' Prüfen, ob dieses Design auch den selben Part und Layer hat wie das 'design'
            ' Wenn nicht, dann muss der 'currentLayer' als neuer Layer hinzugefügt werden und nicht in einem anderen Layer entpackt werden
            Dim layerAdded As Boolean
            If p <= getPartsCount Then
                If i <= getPart(p).layers.count Then
                    addLayerToPartIndexAndLayerIndex currentLayer.layerShape, p, i, logger
                    layerAdded = True
                End If
            End If
            
            ' Layer wird als eigener Layer hinzugefügt
            If Not layerAdded Then
                addLayer currentLayer.layerShape, logger ' TODO ACHTUNG: Durch das adden ändert sich die anzahl der Layer oder auch Parts. Die Layer und Parts sollten vor der For-Schleife ein Snapshot bekommen
            End If
            
            layerAdded = False
            Set currentLayer = Nothing
        Next i
        
        Set currentPart = Nothing
    Next p
    
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function addLayerToPartIndexAndLayerIndex(layerGroupShape As shape, ByVal partIndex As Integer, ByVal layerIndex As Integer, Optional logger As logger)
    addLayerToLayer layerGroupShape, getLayer(partIndex, layerIndex), logger
End Function


Public Function addLayerToLayerIndex(layerGroupShape As shape, ByVal layerIndex As Integer, Optional logger As logger)
    addLayerToLayer layerGroupShape, getLayer2(layerIndex), logger
End Function


Public Function addLayerToLayer(layerGroupShape As shape, layer As ProductDesignLayer, Optional logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[ProductDesign.addLayerToLayer]"
    
    ' Prüfen, ob der Layer auch wirklich von diesem Design ist
    If Not layer.getPart.getDesign Is Me Then
        Err.Raise vbObjectError + 513, , "[ProductDesign.addLayerToLayer] 'theShape' ist Nothing "
    End If
    
    
    getProductIDShape ' Vorher Cachen
    
    
    
    layerGroupShape.OrderFrontOf layer.getGroundPlate
    
    
    Dim mainShapesOfLayer As shapeRange
    Set mainShapesOfLayer = Classfactory.newCustomShapeTypeQuery(layerGroupShape, RedOrPinkShape).search
    ' 'layerGroupShape' so verschieben, dass die roten/pinken Formen von 'layer' übereinander lappen
    layerGroupShape.Move layer.getAllRedOrPinkShapes.centerX - mainShapesOfLayer.centerX, layer.getAllRedOrPinkShapes.centerY - mainShapesOfLayer.centerY
    mainShapesOfLayer.delete ' 'layer' hat bereits rote/pinke Formen
    
    ' Es kann sein, dass die Gruppe 'layerGroupShape' nur aus den 'mainShapesOfLayer' bestand, welche soeben gelöscht wurden
    If Not Globals.isShapeDeleted(layerGroupShape) Then
        layerGroupShape.Ungroup
    End If
    
    positionMetadataShapes
    
    If Not logger Is Nothing Then logger.removeTab
    
End Function


Public Function getLayersMainShapes() As shapeRange
    initLayersAndPartsIfNeeded

    Set getLayersMainShapes = New shapeRange
    Dim i As Integer
    For i = 1 To parts.count
        getLayersMainShapes.AddRange getPart(i).getLayersMainShapes
    Next i
End Function



' Gibt zurück, ob es einen Layer in diesem Produkt gibt, der eine Variante ist. Z.B: ein Edelstahlrahmen
Public Function hasLayersAsVariants() As Boolean
    Dim i As Integer
    For i = 1 To parts.count
        Dim j As Integer
        For j = 1 To parts.getPart(i).count
            Dim currentLayer As ProductDesignLayer: Set currentLayer = parts.getPart(i).getLayer(j)
            
            If currentLayer.isLayerVariant Then
                hasLayersAsVariants = True
                Exit Function
            End If
            
            Set currentLayer = Nothing
        Next j
    Next i
End Function


Public Function getLayerShapes() As shapeRange
    initLayersAndPartsIfNeeded
    
    Set getLayerShapes = layerShapes
End Function



Public Function getLayers() As ProductDesignLayerRange

    initLayersAndPartsIfNeeded
    
    Set getLayers = allLayers
    
End Function


Public Function getLayerCount() As Integer
    getLayerCount = getLayers.count
End Function



' Gibt einen Namen für dieses Design zurück.
' Alle Schichtnamen getrennt mit einem '-' ergeben den Exportordnernamen und den Namen der PSD,
' die für diese Konstelation an Teilen, Schichten und Varianten passend ist.
Public Function getDesignNameForPSD(Optional warnIfNoGroundPlate As Boolean = True) As String

    initLayersAndPartsIfNeeded
    
    Dim i As Integer
    For i = 1 To parts.count
        Dim j As Integer
        For j = 1 To parts.getPart(i).count
            Dim currentLayer As ProductDesignLayer: Set currentLayer = parts.getPart(i).getLayer(j)
            
            'Schichten mit ' & ' trennen
            getDesignNameForPSD = getDesignNameForPSD & currentLayer.getLayerNameForPSDFile(warnIfNoGroundPlate) & IIf(j = parts.getPart(i).count, "", " & ")
            
            Set currentLayer = Nothing
        Next j
        
        'Partnamen mit '-' trennen
        If Not i = parts.count Then
            getDesignNameForPSD = getDesignNameForPSD & " - "
        End If
    Next i
    
End Function


Public Function invalidateDesign()
    
    layersAndPartsInitialized = False
    invalidateProductIDShape
    invalidateFancyCustomizationIDShapes
    
    masterDesign = False
    masterDesignInitialized = False
    
    
End Function


Public Function invalidateProductIDShape()
    Set productIDShape = Nothing
    productIDString = ""
End Function


Public Function deleteFancyCustomizationIDShapes()
    initializeFancyCustomizationIDShapesIfNotAlready ' Cachen. Sonst ist er evtl. noch nicht gefunden und dann Nothing
    If Not fancyCustomizationIDShapes.count = 0 Then fancyCustomizationIDShapes.delete
    invalidateFancyCustomizationIDShapes
End Function

Public Function invalidateFancyCustomizationIDShapes()
    Set fancyCustomizationIDShapes = New shapeRange
    fancyCustomizationIDShapesInitialized = False
End Function

Public Function invalidateLayers()
    Dim p As Integer
    For p = 1 To getPartsCount
        Dim l As Integer
        For l = 1 To getPart(p).count
            getLayer(p, l).invalidateAll
        Next l
    Next p
End Function




' Falls dieses Design transparente Grundplatten wie z.B: Acryl-Klar hat, wird die Transparenz angepasst, damit es gut aussieht
' Wenn keine weiteren Grundplatten mehr vorhanden sind, wird davon ausgegangen, dass der HIntergrund weiß ist. Dann wird die Transparenz verringert
' Wenn aber dahinter noch weitere Grundplatten sind, wird geguckt wie hell diese sind. Bei Dunklen wird die Transparenz verringert
Public Function setTransparencyOfTransparentGroundplates(Optional ignoreLayersWithoutGroundPlate As Boolean = False)

    Dim p As Integer
    For p = 1 To getPartsCount
            
        Dim l As Integer
        For l = 1 To getPart(p).count
            Dim currentLayer As ProductDesignLayer
            Set currentLayer = getPart(p).item(l)
            
            If currentLayer.isEmptyVariant Then
                GoTo Skip
            End If
            
            If currentLayer.getGroundPlate Is Nothing Then
                If Not ignoreLayersWithoutGroundPlate Then
                    Err.Raise vbObjectError + 513, , "[ProductDesign.setTransparencyOfTransparentGroundplates] Keine Grundplatte vorhanden"
                Else
                    GoTo Skip
                End If
            End If
            
            If Globals.isGroundPlateTransparent(currentLayer.getGroundPlate) Then
                If InStr(LCase(currentLayer.getGroundPlate.name), "acryl") Then
                    
                    ' Wenn eine weitere Ebene darunter ist
                    If l + 1 <= getPart(p).count Then
                        
                        Dim currentLayerIsSatin As Boolean
                        currentLayerIsSatin = Globals.isGroundPlateSatin(currentLayer.getGroundPlate)
                        
                        Dim layerBelow As ProductDesignLayer
                        Set layerBelow = getPart(p).item(l + 1)
                        
                        If Not layerBelow.isEmptyVariant Then
                            
                            Dim groundPlateBelow As shape
                            Set groundPlateBelow = layerBelow.getGroundPlate
                            
                            Set layerBelow = Nothing
                            
                            'EDELSTAHL
                            If InStr(LCase(groundPlateBelow.name), "edelstahl") Then
                                If currentLayerIsSatin Then
                                    currentLayer.getGroundPlate.transparency.ApplyUniformTransparency 50
                                Else
                                    currentLayer.getGroundPlate.transparency.ApplyUniformTransparency 73
                                End If
                            
                            ' ACRYL
                            ElseIf InStr(LCase(groundPlateBelow.name), "acryl") Then
                                If currentLayerIsSatin Then
                                    currentLayer.getGroundPlate.transparency.ApplyUniformTransparency 50
                                Else
                                    currentLayer.getGroundPlate.transparency.ApplyUniformTransparency 75
                                End If
                            End If
                        End If
                        
                    Else ' Nur ein (vermutlich) weißer Hintergrund
                        currentLayer.getGroundPlate.transparency.ApplyUniformTransparency 50
                    End If
                    
                    
                End If
            End If
            
Skip:
            Set currentLayer = Nothing
        Next l
    Next p
End Function





Public Function sortParts()
    
    If getPartsCount = 1 Then
        Exit Function
    End If
    
    Dim partsAsShapeRangeCollection As New collection
    
    
    Dim i As Integer
    For i = 1 To getPartsCount
        Dim part As ProductDesignPart
        Set part = getPart(i)
        
        Dim partShapeRange As New shapeRange
        
        Dim j As Integer
        For j = 1 To part.count
            partShapeRange.add getLayer(i, j).layerShape
        Next j
        
        partsAsShapeRangeCollection.add partShapeRange
        
        Set partShapeRange = Nothing
        Set part = Nothing
    Next i
    
    arrange.arrangeFunction True, partsAsShapeRangeCollection
    
End Function


Public Function reversePartsOrder()
    
    If getPartsCount = 1 Then
        Exit Function
    End If
    
    Dim firstPartLayerShapes As shapeRange
    Set firstPartLayerShapes = getPart(1).layersToShapeRange
    
    Dim i As Integer
    For i = 2 To getPartsCount
        getPart(i).layersToShapeRange.OrderFrontOf firstPartLayerShapes.firstShape
    Next i
    
End Function


Public Function getDesignNumber() As Integer
    If Not productIDString = "" Then
       getDesignNumber = Globals.getDesignNumber(productIDString)
    End If
End Function


Public Function isMainDesign() As Boolean
    
    If Not getProductID = "" Then
        ' TODO productIDObject als lokale Variable ablegen und damit "productID" ersetzen
        ' TODO Danach Globals.isProductIDMainDesign entfernen
        Dim ProductIDObject As New ProductIDObject
        ProductIDObject.setProductID getProductID
        If ProductIDObject.isMainDesign Then
            isMainDesign = True
        End If
    End If
    
End Function


Public Function placeAutomaticGroundPlateVariants(Optional logger As logger)
    
    On Error GoTo SomeError ' ----
    
    Dim p As Integer
    For p = 1 To getPartsCount
        Dim l As Integer
        For l = 1 To getPart(p).count
            
            getPart(p).item(l).placeAutomaticGroundPlateVariants logger
            
        Next l
    Next p
    
    On Error GoTo 0 ' ----
    
    Exit Function
SomeError:
    Err.Raise Err.number, Err.source, "[ProductDesign.placeAutomaticGroundPlateVariants]" & vbNewLine & Err.Description, Err.HelpFile, Err.HelpContext
End Function



Public Function deleteLayer(layer As ProductDesignLayer)
    Dim i As Integer
    For i = 1 To getLayers.count
        If getLayers.getLayer(i) Is layer Then
            deleteLayerByIndex i
            Exit Function
        End If
    Next i
    
    Err.Raise vbObjectError + 513, , "[ProductDesign.deleteLayer] Der Layer konnte nicht gefunden werden"
End Function


Public Function deleteLayerByIndex(ByVal layerIndex As Integer)
    getLayers.getLayer(layerIndex).layerShape.delete
    
    ' Invalidieren
    layersAndPartsInitialized = False
    Set parts = New ProductDesignPartRange
    Set allLayers = New ProductDesignLayerRange
End Function


Public Function seperateMainShapesSmallerShapesOfLayers()
    Dim i As Integer
    For i = 1 To getLayers.count
        getLayer2(i).seperateMainShapesSmallerShapes
    Next i
End Function



Public Function getMainShapesOfLayers() As shapeRange
    Dim range As New shapeRange
    
    Dim i As Integer
    For i = 1 To getLayers.count
        If getLayer2(i).getMainShape Is Nothing Then
            Err.Raise vbObjectError + 513, , "[ProductDesign.getMainShapesOfLayers] Hauptform vom Layer #" & i & " ist Nothing"
        Else
            range.add getLayer2(i).getMainShape
        End If
    Next i
    
    
    Set getMainShapesOfLayers = range
End Function


Public Function isMasterDesign() As Boolean
    
    If Not masterDesignInitialized Then
        masterDesign = Globals.isProductIDMasterDesign(getProductID)
        
        masterDesignInitialized = True
    End If
    
    isMasterDesign = masterDesign
End Function


' Hinweis: Dieses Objekt ist das Masterdesign und es wird auf das 'design' angewendet
Public Function transferMasterDesignToDesign(design As productDesign, Optional logger As logger)
    
    fitMasterDesignToDesign design, logger
    
    Dim p As Integer
    For p = 1 To getPartsCount
        transferMasterPartToDesign getPart(p), design, logger
    Next p
    
End Function


' Hinweis: Dieses Objekt ist das Masterdesign und es wird auf das 'design' angewendet
Private Function transferMasterPartToDesign(part As ProductDesignPart, design As productDesign, Optional logger As logger)
    
    Dim layerCountInPartsSnapshot As New collection
    Dim i As Integer
    For i = 1 To getPartsCount
        layerCountInPartsSnapshot.add getPart(i).layers.count
    Next i
    
    ' Part bei beiden Designs vorhanden
    If part.getPartIndex <= getPartsCount Then
        
        Dim l As Integer
        For l = 1 To part.layers.count
            Dim currentLayer As ProductDesignLayer
            Set currentLayer = part.layers.getLayer(l)
            
            ' Da das 'design' mindestens ein Layer hat, wird der erste Layer von 'part' nicht als neuer layer kopiert sondern nur sein Inhalt zum ersten Layer von 'design' hinzugefügt
            If l <= layerCountInPartsSnapshot(part.getPartIndex) Then
                Dim shapesToCopy As shapeRange
                Set shapesToCopy = currentLayer.layerShape.shapes.All
                shapesToCopy.RemoveRange Classfactory.newCustomShapeTypeQuery(shapesToCopy, customShapeType.metadataShapeType).search
                shapesToCopy.RemoveRange Globals.shapeToShapeRange(currentLayer.getMainShape)
                
                
                
                ' Bereits vorhandene Grundplatten ausschließen
                ' --------------------------------------------
                Dim groundPlateVariants As VariantArray
                Set groundPlateVariants = currentLayer.getVariantsOfType(GroundplateVariantType)
                
                Dim g As Integer
                For g = 1 To groundPlateVariants.allVariants.count
                    shapesToCopy.RemoveRange Classfactory.newCustomShapeTypeQuery(shapesToCopy, customShapeType.ByName).setArgument1(groundPlateVariants.getVariant(g).shape.name).setArgument2(stringSearchType.StringEquals).search
                Next g
                ' --------------------------------------------
                
                
                Dim shapesCopy As shapeRange
                Set shapesCopy = Globals.copyPasteShapeRange(shapesToCopy, False)
                
                shapesCopy.OrderFrontOf design.getLayer2(1).layerShape.shapes.First
                Set groundPlateVariants = Nothing
            Else
                ' Alle weiteren Layer werden als kopie hinzugefügt
                design.addLayer Globals.copyPasteShape(currentLayer.layerShape, False)
            End If
            
            Set currentLayer = Nothing
        Next l
        
    ' Part beim 'design' garnicht vorhanden. Deshalb den gesamten Part rüberkopieren
    Else
        
        For i = 1 To part.count
            design.addLayer Globals.copyPasteShape(part.item(i).layerShape, False)
        Next i
        
    End If
End Function


Private Function fitMasterDesignToDesign(design As productDesign, Optional logger As logger)
    
    Dim anchorPart As ProductDesignPart
    Set anchorPart = getPart(1)
    
    ' Sortiert die Parts in Leserichtung
    design.sortParts
    
    ' Beide Designs vorerst übereinenander setzen
    ' (Parts ignorieren. Diese werden seperat übereinander gesetzt. Wenn aber das Zieldesign 'design' nicht so viele Parts hat, dann ist die )
    Dim offsetBetweenDesigns() As Double
    offsetBetweenDesigns = getPartsMainShapesOffset(anchorPart, design.getPart(1), logger)
    getDesignShape.Move offsetBetweenDesigns(1), offsetBetweenDesigns(2)
    
    ' 2 weil der erste Part oben schon gesetzt wurde
    Dim i As Integer
    For i = 2 To getPartsCount
         fitMasterDesignPartToDesign getPart(i), design
    Next i
    
End Function


Private Function fitMasterDesignPartToDesign(part As ProductDesignPart, design As productDesign, Optional logger As logger)
    
    If design.getPartsCount < part.getPartIndex Then
        Exit Function
    End If
    
    Dim designPart As ProductDesignPart
    Set designPart = design.getPart(part.getPartIndex) ' Gleichen Part aus dem Design nutzen
    
    Dim offsetBetweenParts() As Double
    offsetBetweenParts = getPartsMainShapesOffset(part, designPart, logger)
    
    Dim partShapes As shapeRange
    Set partShapes = part.layersToShapeRange
    
    'offsetBetweenParts(1) = offsetBetweenParts(1) + (partShapes.CenterX - part.layers.getLayer(1).layerShape.CenterX)
    
    partShapes.Move offsetBetweenParts(1), offsetBetweenParts(2)
    
End Function



Private Function getPartsMainShapesOffset(partA As ProductDesignPart, partB As ProductDesignPart, Optional logger As logger) As Double()
    If Not logger Is Nothing Then logger.addTab , "[ProductDesign.getPartsMainShapesOffset]"
    
    Dim offset(2) As Double
    offset(1) = partB.getAllRedOrPinkShapesOfLayers.centerX - partA.getAllRedOrPinkShapesOfLayers.centerX
    offset(2) = partB.getAllRedOrPinkShapesOfLayers.centerY - partA.getAllRedOrPinkShapesOfLayers.centerY
    
    getPartsMainShapesOffset = offset
    If Not logger Is Nothing Then logger.removeTab
End Function


' Wenn das Design keine Artikelnummer hat, die ignoriert werden soll oder eine Artikelnummer hat, welche eine Produktbild-Variante ist.
Public Function isNormalDesign() As Boolean
    isNormalDesign = Not isRedDesignToIgnore And Not isProductImageVariant
End Function


' Designs mit roten Artikelnummern werden von anderen Skripten ignoriert
' Grund für das Ignorieren von Designs:
' Wenn es Designs/Motive gibt, die auf verschiedene Formen kommen (wie bei Türschilder Edelstahl), dann gibt es auch Designs, die auf bestimmten Formen nicht gut aussehen.
' Bspw. sieht Design 3 gut auf einer rechteckigen Form aus. Nicht aber auf Oval. Dann ist Design 3 aber trotzdem in Oval drin, damit die Designnummer nicht von einem anderen Design eingenommen wird
Public Function isRedDesignToIgnore() As Boolean
    If Not getProductIDShape Is Nothing Then
        If Globals.isColorProductIDRedToIgnore(getProductIDShape.fill.UniformColor) Then
            isRedDesignToIgnore = True
        End If
    End If
End Function



Public Function isProductImageVariant() As Boolean
    If Not getProductIDShape Is Nothing Then
        If Globals.isColorProductIDColorForProductImageVariant(getProductIDShape.fill.UniformColor) Then
            isProductImageVariant = True
        End If
    End If
End Function





Public Function getVariantGroupByGroupName(groupName As String) As VariantGroup
    
    Dim i As Integer
    For i = 1 To getLayers.count
        Dim currLayer As ProductDesignLayer
        Set currLayer = getLayer2(i)
        
        Dim allVariantGroups As collection
        Set allVariantGroups = currLayer.getAllVariants.variantGroups
        
        Dim j As Integer
        For j = 1 To allVariantGroups.count
            Dim currVariantGroup As VariantGroup
            Set currVariantGroup = allVariantGroups.item(j)
            
            Dim firstVariante As variante
            Set firstVariante = currVariantGroup.variants.item(1)
            
            If firstVariante.variantGroupName = groupName Then
                Set getVariantGroupByGroupName = currVariantGroup
                Exit Function
            End If
            
            Set firstVariante = Nothing
            Set currVariantGroup = Nothing
        Next j
        
        Set allVariantGroups = Nothing
        Set currLayer = Nothing
    Next i
    
End Function


Public Function areDesignsMainShapesEqual(design As productDesign, Optional logger As logger) As Boolean
    
    If Not logger Is Nothing Then
        logger.logINFO "[ProductDesign.areDesignsMainShapesEqual]"
        logger.addTab
    End If
    
    If Not getPartsCount = design.getPartsCount Then
        If Not logger Is Nothing Then logger.logINFO "Die Parts stimmen nicht überein!"
        GoTo ExitFunction ' Returrn False
    End If
    
    Dim p As Integer
    For p = 1 To getPartsCount
        If Not getPart(p).areMainShapesEqualToOtherPart(design.getPart(p), logger) Then
            If Not logger Is Nothing Then logger.logINFO "Die Hauptformen stimmen nicht überein!"
            GoTo ExitFunction ' Returrn False
        End If
    Next p
    
    
    areDesignsMainShapesEqual = True
ExitFunction:
    If Not logger Is Nothing Then
        logger.logINFO "Returne " & areDesignsMainShapesEqual
        logger.removeTab
    End If
End Function


' Funktioniert nicht. Beim Vergleichen der Parentgroup von einer Form die ganz klar in einem Layer ist und dem Layer selbst, kommt false raus
Public Function findLayerOfShape(shape As shape, Optional logger As logger) As ProductDesignLayer
    
    If Not logger Is Nothing Then logger.addTab , "[ProductDesign.findLayerOfShape]"
    
    Dim i As Integer
    For i = 1 To getLayerCount
        If getLayer2(i).layerShape.shapes.All.Exists(shape) Then
            Set findLayerOfShape = getLayer2(i)
            Exit Function
        End If
    Next i
    
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function ungroupLayersAndDesign()
    
    ' Wenn es nur einen Layer gibt, dann ist das Designshape der Layer
    If getLayerCount > 1 Then
        
        Dim i As Integer
        For i = 1 To getLayerCount
            getLayer2(i).layerShape.Ungroup
        Next i
        
        getDesignShape.Ungroup
    Else
        getDesignShape.Ungroup
    End If
    
End Function


Public Function newCustomShapeTypeQuery(ByVal shapeType As customShapeType) As CustomShapeTypeQuery
    Set newCustomShapeTypeQuery = Classfactory.newCustomShapeTypeQuery(getShapesForCustomShapeTypeQuery, shapeType)
End Function


Public Function getShapesForCustomShapeTypeQuery() As shapeRange
    
    Dim result As New shapeRange
    
    initLayersAndPartsIfNeeded
    
    ' Layer Formen für den Query abfragen
    Dim i As Integer
    For i = 1 To parts.count
        Dim part As ProductDesignPart
        Set part = parts.getPart(i)
        
        
        Dim j As Integer
        For j = 1 To part.layers.count
            Dim layer As ProductDesignLayer
            Set layer = part.getLayer(j)
            result.AddRange layer.getShapesForCustomShapeTypeQuery
            
            Set layer = Nothing
        Next j
        
        Set part = Nothing
    Next i
    
    ' ... aber auch andere Formen in dem Design
    result.AddRange getNonLayerShapes
    
    Set getShapesForCustomShapeTypeQuery = result
End Function


Public Function clone(Optional quietMode As Boolean = False) As productDesign
    Dim design As New productDesign
    design.newProductDesign Globals.copyPasteShape(getDesignShape, True), quietMode
    
    Set clone = design
End Function


Public Function scaleDesign(newWidth As Double, newHeight As Double, relativeSize As Boolean, updateBleed As Boolean, Optional logger As logger)
    Dim i As Integer
    For i = 1 To getPartsCount
        getPart(i).scalePart newWidth, newHeight, relativeSize, updateBleed, logger
    Next i
End Function

Public Function scaleDesignWithScale(scaleX As Double, scaleY As Double, Optional updateBleed As Boolean, Optional scaleOrigin As Vector, Optional logger As logger)
    Dim i As Integer
    For i = 1 To getPartsCount
        getPart(i).scalePartWithScale scaleX, scaleY, updateBleed, scaleOrigin, logger
    Next i
End Function


Public Function isLayersOnlyGraving() As Boolean
    
    Dim i As Integer
    For i = 1 To allLayers.count
        If Not allLayers.getLayer(i).isGraving Then Exit Function ' Return False
    Next i
    
    isLayersOnlyGraving = True
End Function


Public Function isLayersOnlyPrint() As Boolean
    
    Dim i As Integer
    For i = 1 To allLayers.count
        If allLayers.getLayer(i).isGraving Then Exit Function ' Return False
    Next i
    
    isLayersOnlyPrint = True
End Function


Public Function convertTextBoxesToNormalText()
    Dim i As Integer
    For i = 1 To getPartsCount
        getPart(i).convertTextBoxesToNormalText
    Next i
End Function


Public Function placeGroundPlatesAgain(Optional dpiToSetAfterPlaceFile As Double = 72)
    Dim i As Integer
    For i = 1 To parts.count
        getPart(i).placeGroundPlatesAgain dpiToSetAfterPlaceFile
    Next i
End Function



' Gibt Formen zurück, die nicht Child eines Layers (Gruppe) sind.
' Solche Formen gibt es nur, wenn mindestens ein Layer als Gruppenform vorliegt.
' (Typischerweise werden Layer aber erst gruppiert bei 2 Layern, damit man bei einem Layer nicht immer unnötigerweise die Layergruppe öffnen muss)
' Die Artikelnummer kann also mal Child von einem Layer (Gruppe) sein, oder ein NonLayerShape sein
Public Function getNonLayerShapes() As shapeRange
    
    Dim result As New shapeRange
    
    If Not isDesignHavingGroupedLayers Then GoTo ExitFunction
    
    ' Zunächst alle Formen nehmen ...
    result.AddRange designShape.shapes.All
    ' ... aber Layergruppen ausschließen
    result.RemoveRange getLayerShapes
    
ExitFunction:
    Set getNonLayerShapes = result
End Function


Public Function doesDesignShouldHaveGroupedLayers()
    ' Wenn es mehr als einen Layer gibt, dann nur, weil sie in Gruppen unterteilt sind.
    ' Anders hätten sie nicht in mehrere Gruppen geparsed werden können
    If allLayers.count > 1 Then
        doesDesignShouldHaveGroupedLayers = True
        Exit Function
    End If
End Function


Public Function isDesignHavingGroupedLayers() As Boolean
    ' Wenn die Gruppenform dieses Designs die selbe ist, wie der vom ersten Layer, dann gibt es keine Layergruppe oder gruppierte Layer (GroupedLayers)
    isDesignHavingGroupedLayers = Not designShape Is allLayers.getLayer(1).layerShape
End Function


Public Function manageLayerGrouping()
    If isDesignHavingGroupedLayers And Not doesDesignShouldHaveGroupedLayers Then
        ' Ersten und einzigen Layer entgruppieren
        layerShapes.firstShape.Ungroup
        
        ' Layer Form ist jetzt die des Designs, da es nur noch einen Layer gibt
        Set allLayers.getLayer(1).layerShape = designShape
    End If
End Function


' Wird von layer.remove aufgerufen
Public Function p_removeLayer(layer As ProductDesignLayer)
    allLayers.RemoveFirst layer
    layerShapes.RemoveRange Globals.shapeToShapeRange(layer.layerShape)
    
    manageLayerGrouping
    
    ' Parts neu aufbauen, da sich durch das löschen eines Layers neu Parts ergeben können
    ' Wenn bspw. ein Layer in der Mitte ein Layer links und einen rechts verbunden hat und jetzt fehlt,
    ' gibt es nicht nur einen Part, wo alle 3 drin sind, sondern 2 getrennte Parts. Das eine für den linken und den anderen für den rechten Layer
    initParts
End Function



Public Function getShapesForViewFitting() As shapeRange
    Set getShapesForViewFitting = parts.getShapesForViewFitting
End Function


Public Function collectAllVariants(Optional logger As logger) As VariantArray
    Set collectAllVariants = parts.collectAllVariants(logger)
End Function


Public Function duplicateAsMasterDesign() As productDesign
    Dim result As productDesign
    Set result = duplicate(True, True)
    
    result.getProductIDObject.setProductIDMasterDesign
    result.updateProductIDFromProductIDObject
    
    Set duplicateAsMasterDesign = result
End Function


Public Function duplicate(Optional removeDesignElements As Boolean, Optional removeGroundplates As Boolean) As productDesign
    Dim newDesignShape As shape
    Set newDesignShape = Globals.copyPasteShape(designShape, False)
    
    
    Dim result As productDesign
    Set result = Globals.getDesignFromShape(newDesignShape)
    
    If removeDesignElements Then result.newCustomShapeTypeQuery(DesignElementShapeType).search.delete
    If removeGroundplates Then result.newCustomShapeTypeQuery(groundPlate).search.delete
    
    Set duplicate = result
End Function


Public Function isSelected(Optional ByRef selectedShapes As shapeRange, Optional removeFromSelectedShapesWhenFound As Boolean) As Boolean
    If selectedShapes Is Nothing Then Set selectedShapes = ActiveSelectionRange
    
    Dim i As Integer
    For i = 1 To selectedShapes.count
        Dim currShape As shape
        Set currShape = selectedShapes(i)
        
        If getDesignShape Is Globals.getLastParentOrSelf(currShape) Then
            ' Gefunden! Eines der ausgewählten Formen ist die Hauptform dieses Designs oder ein Child davon
            isSelected = True
            If removeFromSelectedShapesWhenFound Then selectedShapes.RemoveRange Globals.shapeToShapeRange(currShape)
            Exit For
        End If
        
        Set currShape = Nothing
    Next i
    
End Function

