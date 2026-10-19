Attribute VB_Name = "ProductDesignPart"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
Dim design As productDesign

Public layers As New ProductDesignLayerRange

Dim variantLayersArray As VariantArray
'Dim variantLayerGroups As collection

Dim partIndex As Integer ' Beginnt bei 1

Public fancyFocusedLayer As ProductDesignLayer ' Die fokusierte Schicht dieses Layers

Public Function init(designVar As productDesign, partIndexVar As Integer)
    Set design = designVar
    partIndex = partIndexVar
End Function



' Da diese Klasse eine Collection ersetzt, sind folgende Funktionen von einer Collection abgeleitet (Da manche Stellen im Code immer noch von einer Collection ausgehen)
' -------------------------------------
Public Function count() As Integer
    count = layers.count
End Function
'
Public Function item(ByVal index As Integer) As ProductDesignLayer
    Set item = layers.getLayer(index)
End Function
'
Public Function add(layer As ProductDesignLayer)
    layers.add layer
End Function
' -------------------------------------


Public Function getLayer(ByVal index As Integer) As ProductDesignLayer
    Set getLayer = layers.getLayer(index)
End Function

Public Function setPartIndex(index As Integer)
    partIndex = index
End Function

Public Function getPartIndex() As Integer
    getPartIndex = partIndex
End Function


' TODO cachen (ist aber riskant, da layers public sind und da einfach layer hinzugefügt werden können, ohne dass die Cache-Version das mitbekommt)
Public Function layersToShapeRange() As shapeRange
    
    Set layersToShapeRange = New shapeRange
    
    For i = 1 To layers.count
        Dim currentLayer As ProductDesignLayer
        Set currentLayer = layers.getLayer(i)
        
        layersToShapeRange.add currentLayer.layerShape
        
        Set currentLayer = Nothing
    Next i
End Function


Public Function getDesign() As productDesign
    Set getDesign = design
End Function



Public Function getVariantLayersArray() As VariantArray
    If variantLayersArray Is Nothing Then
        
'        Set variantLayerGroups = New collection
        
        Set variantLayersArray = New VariantArray
        
        ' Alle Schicht-Varianten sammeln
        ' -----------------------------------
        Dim allVariants As New collection
        For i = 1 To layers.count
            Dim currentLayer As ProductDesignLayer
            Set currentLayer = layers.getLayer(i)
            
            If Not currentLayer.getVariant Is Nothing Then
'                allVariants.add currentLayer.getVariant
                variantLayersArray.addVariant currentLayer.getVariant
'                Debug.Print "Variante hinzugefügt: " & currentLayer.getVariant.variantName
            End If
            
            Set currentLayer = Nothing
        Next i
        ' -----------------------------------
    End If
    
    Set getVariantLayersArray = variantLayersArray
End Function



' Gibt die Varianten-Schichten dieses Parts zurück.
' Dabei ist jede Variante je nach Gruppenname mit anderen in einer Collection gruppiert
Public Function getVariantLayerGroups() As collection
    Set getVariantLayerGroups = getVariantLayersArray.variantGroups
End Function


Public Function invalidateVariantLayers()
    
    For i = 1 To layers.count
        item(i).p_properInvalidateLayerVariant
    Next i
    
    Set variantLayersArray = Nothing
End Function



Public Function getReplaceSlugForVariante(variante As variante) As String
    getReplaceSlugForVariante = getVariantLayersArray.p_getReplaceSlugForVariante(variante)
End Function


Public Function getLayersMainShapes() As shapeRange
    
    Dim mainShapes As New shapeRange
    
    For i = 1 To layers.count
        mainShapes.add item(i).getMainShape
    Next i
    
    Set getLayersMainShapes = mainShapes
End Function



Public Function areMainShapesEqualToOtherPart(part As ProductDesignPart, Optional logger As logger) As Boolean
    
    If Not logger Is Nothing Then
        logger.logINFO "[ProductDesignPart.areMainShapesEqualToOtherPart]"
        logger.addTab
    End If
    
    If Not part.layers.count = layers.count Then
        If Not logger Is Nothing Then logger.logINFO "Schichtanzahl nicht gleich!"
        GoTo ExitFunction ' Return false
    End If
    
    
    For i = 1 To layers.count
        If Not item(i).isMainShapeEqualToOtherLayer(part.getLayer(i), logger) Then
            If Not logger Is Nothing Then logger.logINFO "Schichten nicht gleich!"
            GoTo ExitFunction ' Return false
        End If
    Next i
    
    
    areMainShapesEqualToOtherPart = True
ExitFunction:
    If Not logger Is Nothing Then
        logger.logINFO "Returne " & areMainShapesEqualToOtherPart
        logger.removeTab
    End If
End Function


' Gibt die Formen aller Layer zurück, die für eine Einpassung in einen Konfi genutzt werden sollen
' Hat ein Part z.B: ein cyanfarbenes 'ViewShape' wird das für den Part genutzt, ansonsten die roten/pinken Hauptformen der Layer des Parts
Public Function getShapesForViewFitting() As shapeRange
    
    Dim mainShapes As New shapeRange
    Dim viewShapes As New shapeRange
    
    ' Wenn es mehr als einen Layer gibt, dann sind die Layer innerhalb der Designgruppe gruppiert.
    ' Innerhalb dieser Designgruppe kann sich noch eine Viewbox befinden, die nicht zu einem Layer gehört.
    ' Dieser Layer gilt dann für alle Layer
    If getDesign.getLayerCount > 1 Then
        Dim designViewShapes As shapeRange
        Set designViewShapes = getDesign.newCustomShapeTypeQuery(viewShape).setRecursive(False).search
        
        viewShapes.AddRange designViewShapes
    End If
    
    
    ' Viewshapes & Hauptformen in den Layern dieser Schicht suchen
    For i = 1 To layers.count
        
        Dim layer As ProductDesignLayer
        Set layer = layers.getLayer(i)
        
        If Not layer.getViewShape Is Nothing Then
            ' Viewshape von einem Layer gefunden.
            ' Sobald eine Viewshape gefunden wurde, werden alle Hauptformen ignoriert
            Globals.safeAddShapeToShapeRange layer.getViewShape, viewShapes
        Else
            Globals.safeAddShapeToShapeRange layer.getMainShape, mainShapes
        End If
        
        Set layer = Nothing
    Next i
    
    ' Wenn es mindestens ein Viewshape gibt,
    ' dann wird dies genutzt und nicht die Hauptformen aller Schichten in diesem Part
    If viewShapes.count > 0 Then
        Set getShapesForViewFitting = viewShapes
    Else
        Set getShapesForViewFitting = mainShapes
    End If
    
End Function



' Gibt zurück ob skaliert wurde (wenn nicht skaliert wurde, dann weil alle Layer schon die gewünschte Größe haben)
Public Function scalePart(width As Double, height As Double, Optional relativeSize As Boolean, Optional updateBleed As Boolean, Optional logger As logger) As Boolean
    
    Dim mainShapes As shapeRange
    Set mainShapes = getLayersMainShapes

    Dim scaleOrigin As New Vector
    scaleOrigin.x = mainShapes.centerX
    scaleOrigin.y = mainShapes.centerY


    ' Neue Größe
    Dim newWidth As Double
    If relativeSize Then
        newWidth = mainShapes.SizeWidth + width
    Else
        newWidth = width
    End If
    '
    Dim newHeight As Double
    If relativeSize Then
        newHeight = mainShapes.SizeHeight + height
    Else
        newHeight = height
    End If

    Dim scaleX As Double
    scaleX = newWidth / mainShapes.SizeWidth
    Dim scaleY As Double
    scaleY = newHeight / mainShapes.SizeHeight
    
    scalePartWithScale scaleX, scaleY, updateBleed, scaleOrigin, logger
    
End Function


Public Function scalePartWithScale(scaleX As Double, scaleY As Double, Optional updateBleed As Boolean, Optional scaleOrigin As Vector, Optional logger As logger) As Boolean
    For i = 1 To layers.count
        ' Wenn mindestens ein Layer skaliert wurde, heißt es, dass der Part skaliert wurde
        If (getLayer(i).scaleLayerWithScale(scaleX, scaleY, updateBleed, scaleOrigin, logger)) Then
            scalePartWithScale = True
        End If
    Next i
End Function


Public Function getEqualVariant(vari As variante) As variante
    
    ' Alle Layer von diesem Part durchsuchen
    Dim layer As ProductDesignLayer
    For Each layer In layers
        Dim result As variante
        Set result = layer.getEqualVariant(vari)
        
        If Not result Is Nothing Then
            ' Gefunden
            Set getEqualVariant = result
            Exit Function
        End If
        
        Set result = Nothing
    Next layer
    
End Function


Public Function newCustomShapeTypeQuery(ByVal shapeType As customShapeType) As CustomShapeTypeQuery

    Dim range As shapeRange
    Dim i As Integer
    For i = 1 To layers.count
        range.AddRange layers.getLayer(i).getShapesForCustomShapeTypeQuery
    Next i
    
    Set newCustomShapeTypeQuery = Classfactory.newCustomShapeTypeQuery(range, shapeType)
End Function


Public Function getAllRedOrPinkShapesOfLayers() As shapeRange
    Dim result As New shapeRange
    Dim layer As ProductDesignLayer
    Dim i As Integer
    For i = 1 To layers.count
        result.AddRange layers.getLayer(i).getAllRedOrPinkShapes
    Next i
    
    Set getAllRedOrPinkShapesOfLayers = result
End Function


Public Function convertTextBoxesToNormalText()
    Dim i As Integer
    For i = 1 To layers.count
        getLayer(i).convertTextBoxesToNormalText
    Next i
End Function


Public Function placeGroundPlatesAgain(Optional dpiToSetAfterPlaceFile As Double = 72)
    Dim i As Integer
    For i = 1 To layers.count
        getLayer(i).placeGroundPlatesAgain dpiToSetAfterPlaceFile
    Next i
End Function


Public Function p_removeLayer(layer As ProductDesignLayer, Optional errorWhenLayerNotFound As Boolean = True)
    If errorWhenLayerNotFound Then
        If Not layers.Contains(layer) Then Err.Raise vbObjectError + 513, , "[ProductDesign.deleteLayer] Der Layer konnte nicht gefunden werden"
    End If
    
    layers.RemoveFirst layer
    design.p_removeLayer layer
End Function


Public Function collectMainShapes() As shapeRange
    Set collectMainShapes = layers.collectMainShapes
End Function


Public Function convertForFancyExport()
    Dim i As Integer
    For i = 1 To layers.count
        getLayer(i).convertForFancyExport
    Next i
End Function


Public Function getMainShapesAndBleedBoundingBox() As rect
    Set getMainShapesAndBleedBoundingBox = layers.getMainShapesAndBleedBoundingBox
End Function
