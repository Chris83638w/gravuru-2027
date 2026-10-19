Attribute VB_Name = "ProductDesignPartRange"
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
' Variablen-Namens-Vorschlag: partRange

Private parts As New ArrayList


Public Function add(part As ProductDesignPart)
    parts.add part
End Function


Public Function AddRange(values As Variant)
    parts.AddRange values
End Function


Public Property Get count() As Long
    count = parts.count
End Property


Public Function getPart(ByVal index As Integer) As ProductDesignPart
    Set getPart = parts.item(index)
End Function


Public Sub Insert(ByVal index As Long, part As ProductDesignPart)
    parts.Insert index, part
End Sub


Public Sub RemoveAt(ByVal index As Long)
    parts.RemoveAt index
End Sub


Public Function RemoveAll()
    parts.RemoveAll
End Function


Public Function RemoveFirst(part As ProductDesignPart) As Boolean
    parts.RemoveFirst part
End Function


Public Function Contains(part As ProductDesignPart) As Boolean
    Contains = parts.Contains(part)
End Function

Public Function IndexOf(part As ProductDesignPart, Optional ByVal Startindex As Long = 1) As Long
    IndexOf = parts.IndexOf(part, Startindex)
End Function

Public Function ToArrayList() As ArrayList
    Set ToArrayList = parts
End Function


Public Function collectMainShapes() As shapeRange
    Dim result As New shapeRange
    
    ' Hauptformen der Parts/Layer sammeln
    Dim i As Integer
    For i = 1 To parts.count
        result.add getPart(i).collectMainShapes
    Next i
    Set collectMainShapes = result
End Function


' Gibt die Formen aller Layer zurück, die für eine Einpassung in einen Konfi genutzt werden sollen
' Hat ein Part z.B: ein cyanfarbenes 'ViewShape' wird das für den Part genutzt, ansonsten die roten/pinken Hauptformen der Layer des Parts
Public Function getShapesForViewFitting() As shapeRange
    Dim result As New shapeRange
    
    ' Formen für das Einpassen einer View der Parts sammeln
    Dim i As Integer
    For i = 1 To parts.count
        result.AddRange getPart(i).getShapesForViewFitting
    Next i
    Set getShapesForViewFitting = result
End Function


' ===== ProductDesignLayerRange =====

Public Function collectLayersByManufacturingMethod(gravingOrPrint As Boolean) As ProductDesignLayerRange
    Dim result As New ProductDesignLayerRange
    
    Dim i As Integer
    For i = 1 To parts.count
        result.AddRange getPart(i).layers.collectLayersByManufacturingMethod(gravingOrPrint).ToArrayList
    Next i
    
    Set collectLayersByManufacturingMethod = result
End Function


Public Function findShapesLayer(shp As shape) As ProductDesignLayer
    Dim i As Integer
    For i = 1 To parts.count
        Set findShapesLayer = getPart(i).layers.findShapesLayer(shp)
        If Not findShapesLayer Is Nothing Then Exit Function
    Next i
End Function


Public Function collectAllVariants(Optional logger As logger) As VariantArray
    Dim result As New VariantArray
    Dim p As Integer
    For p = 1 To count
        Dim currPart As ProductDesignPart
        Set currPart = getPart(p)
        
        ' Alle Schicht-Varianten aus dem Part hinzufügen
        result.addVariants currPart.getVariantLayersArray.allVariants
        
        ' Alle Varianten der Layer vom Part hinzufügen
        result.addVariants currPart.layers.collectAllVariants(logger).allVariants
        
        Set currPart = Nothing
    Next p
    Set collectAllVariants = result
End Function



Public Function convertForFancyExport()
    Dim i As Integer
    For i = 1 To parts.count
        getPart(i).convertForFancyExport
    Next i
End Function


Public Function getMainShapesAndBleedBoundingBox() As rect
    Dim result As rect
    
    Dim i As Integer
    For i = 1 To parts.count
        If i = 1 Then
            Set result = getPart(i).getMainShapesAndBleedBoundingBox
        Else
            Set result = result.Union(getPart(i).getMainShapesAndBleedBoundingBox)
        End If
    Next i
    
    Set getMainShapesAndBleedBoundingBox = result
End Function

