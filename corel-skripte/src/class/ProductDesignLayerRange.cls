Attribute VB_Name = "ProductDesignLayerRange"
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
' Variablen-Namens-Vorschlag: layerRange

Private layers As New ArrayList


Public Function add(layer As ProductDesignLayer)
    layers.add layer
End Function


Public Function AddRange(values As Variant)
    layers.AddRange values
End Function


Public Property Get count() As Long
    count = layers.count
End Property


Public Function getLayer(ByVal index As Integer) As ProductDesignLayer
    Set getLayer = layers.item(index)
End Function


Public Sub Insert(ByVal index As Long, layer As ProductDesignLayer)
    layers.Insert index, layer
End Sub


Public Sub RemoveAt(ByVal index As Long)
    layers.RemoveAt index
End Sub


Public Function RemoveFirst(layer As ProductDesignLayer) As Boolean
    layers.RemoveFirst layer
End Function


Public Function Contains(layer As ProductDesignLayer) As Boolean
    Contains = layers.Contains(layer)
End Function

Public Function IndexOf(layer As ProductDesignLayer, Optional ByVal Startindex As Long = 1) As Long
    IndexOf = layers.IndexOf(layer, Startindex)
End Function


Public Function ToArrayList() As ArrayList
    Set ToArrayList = layers
End Function


Public Function collectMainShapes() As shapeRange
    Dim result As New shapeRange
    
    ' Hauptformen der Layer sammeln
    Dim i As Integer
    For i = 1 To layers.count
        result.add getLayer(i).getMainShape
    Next i
    Set collectMainShapes = result
End Function



Public Function collectLayersByManufacturingMethod(gravingOrPrint As Boolean) As ProductDesignLayerRange
    Dim result As New ProductDesignLayerRange
    
    Dim i As Integer
    For i = 1 To layers.count
        If getLayer(i).isGraving = gravingOrPrint Then
            result.add getLayer(i)
        End If
    Next i
    
    Set collectLayersByManufacturingMethod = result
End Function


Public Function getShapesForCustomShapeTypeQuery() As shapeRange
    Dim result As New shapeRange
    
    ' Hauptformen der Layer sammeln
    Dim i As Integer
    For i = 1 To layers.count
        result.AddRange getLayer(i).getShapesForCustomShapeTypeQuery
    Next i
    Set getShapesForCustomShapeTypeQuery = result
End Function



Public Function isShapeFromHere(shp As shape) As Boolean
    
    Dim i As Integer
    For i = 1 To layers.count
        If getLayer(i).isShapeFromHere(shp) Then
            isShapeFromHere = True
            Exit Function
        End If
    Next i
End Function


Public Function findShapesLayer(shp As shape) As ProductDesignLayer
    
    Dim i As Integer
    For i = 1 To layers.count
        If getLayer(i).isShapeFromHere(shp) Then
            Set findShapesLayer = getLayer(i)
            Exit Function
        End If
    Next i
    
End Function


' Gibt ein Form Suchen Objekt 'CustomShapeTypeQuery' zurück, das in diesen Layern nach passenden Formen sucht
Public Function newCustomShapeTypeQuery(shapeType As customShapeType) As CustomShapeTypeQuery
    Set newCustomShapeTypeQuery = Classfactory.newCustomShapeTypeQuery(getShapesForCustomShapeTypeQuery, shapeType)
End Function


Public Function getVarianteFromShape(variantShape As shape) As variante
    ' Nach Layer suchen, von der eine Variante die Shape hat
    Dim i As Integer
    For i = 1 To layers.count
        Set getVarianteFromShape = getLayer(i).getVarianteFromShape(variantShape)
        If Not getVarianteFromShape Is Nothing Then Exit Function
    Next i
End Function


Public Function collectAllVariants(Optional logger As logger) As VariantArray
    Dim result As New VariantArray
    
    Dim i As Integer
    For i = 1 To layers.count
        result.addVariants getLayer(i).getAllVariants(, logger).allVariants
    Next i
    Set collectAllVariants = result
End Function


Public Function sortText(Optional orderTextToFront As Boolean)
    Dim i As Integer
    For i = 1 To layers.count
        getLayer(i).sortText orderTextToFront
    Next i
End Function


Public Function getMainShapesAndBleedBoundingBox() As rect
    Dim result As rect
    
    Dim i As Integer
    For i = 1 To layers.count
        If i = 1 Then
            Set result = getLayer(i).getMainShapesAndBleedBoundingBox
        Else
            ' Rechtecke verschmelzen
            Set result = result.Union(getLayer(i).getMainShapesAndBleedBoundingBox)
        End If
    Next i
    
    Set getMainShapesAndBleedBoundingBox = result
End Function

Public Function getArea(Optional ignoreVariants As Boolean = True) As Double
    Dim result As Double
    Dim i As Integer
    For i = 1 To layers.count
        result = result + getLayer(i).getArea(ignoreVariants)
    Next i
    getArea = result
End Function
