Attribute VB_Name = "ConfiView"
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
' Diese View beschreibt, welche Layer in ihr enthalten sind
'
' Variablen-Namens-Vorschlag: cView


Public confiEx As ConfiExport

Public index As Integer ' Index der View vom Export
Public parts As New ProductDesignPartRange
Public focusedLayersOfParts As New collection ' TODO ändern zu ProductDesingLayerRange
Public layersFlattened As New ProductDesignLayerRange
Public layersFlattenedNames As collection
Public shapeRangeForViewFitting As shapeRange
Public layerProcessOrderIndexies As New collection
Public layersInKonfiOrder As New ProductDesignLayerRange

Private p_layersMainShapes As shapeRange
Private p_layersShapes As shapeRange

' Eine View kann bereits eine Maske haben. Eine "ConfiMask". Eine vorher erstellte Maske, die dann getaggt wurde als "ConfiMask"
Public hasPredefinedMask As Boolean

Public mainShapesWidth As Double
Public mainShapesHeight As Double

Private p_originalMainShapesAndBleedBox As New rect

' Wie stark wurden die Originalformen (bspw 30x20 cm ) skaliert um in den Konfi zu passen
' Wird genutzt, um die Printfile Größe für den Fancy zu berechnen
Public shapesScale As Double



Public Function prepareForExport()
    calculateMainShapesBoundingSizes
    calculateOriginalMainShapesAndBleedBox
End Function


' Berechnet, wie groß die Hauptformen von allen Layern aus den 'parts' sind.
' Die Größe wird im Fancy für Shopify benötigt, um die Hochskalierung beim Export anzugeben.
' Bei den meisten Produkten wird es nur ein Layer mit einer Hauptform geben.
' Z.B: 30x20. Es kann aber auch mehrschichtige Parts geben. Oder Eine View mit mehreren Parts. Z.B: Vorder und Rückseite von einem Schlüsselanhänger.
' Berechnet wird hier Breite und Höhe der BoundingBox aller Parts und deren Hauptformen.
' Wichtig ist, dass diese Berechnung vor dem herunterskalieren auf Konfigröße passiert
Public Function calculateMainShapesBoundingSizes()
    
    Dim boundingBox As rect
    
    Dim i As Integer
    For i = 1 To parts.count
        Dim currPart As ProductDesignPart
        Set currPart = parts.getPart(i)
        Dim shapesForViewFitting As shapeRange
        Set shapesForViewFitting = currPart.getShapesForViewFitting
        
        If boundingBox Is Nothing Then
            Set boundingBox = shapesForViewFitting.boundingBox
        Else
            Set boundingBox = boundingBox.Union(shapesForViewFitting.boundingBox)
        End If
        
        Set currPart = Nothing
        Set shapesForViewFitting = Nothing
    Next i
    
    mainShapesWidth = boundingBox.width
    mainShapesHeight = boundingBox.height
    
End Function



Public Function getEqualVariantsOfOtherParts(vari As variante, partOfVariante As ProductDesignPart) As collection
    
    Dim result As New collection
    
    Dim i As Integer
    For i = 1 To parts.count
        Dim part As ProductDesignPart
        Set part = parts.getPart(i)
        If Not part Is partOfVariante Then
            Dim partResult As variante
            Set partResult = part.getEqualVariant(vari)
            
            If Not partResult Is Nothing Then
                result.add partResult
            End If
            
            Set partResult = Nothing
        End If
        Set part = Nothing
    Next i
    
    Set getEqualVariantsOfOtherParts = result
End Function


Public Function getLayersMainShapes() As shapeRange
    
    If p_layersMainShapes Is Nothing Then
        Set p_layersMainShapes = New shapeRange
        
        Dim p As Integer
        For p = 1 To parts.count
            Dim currPart As ProductDesignPart
            Set currPart = parts.getPart(p)
            
            p_layersMainShapes.AddRange currPart.getLayersMainShapes
            
            Set currPart = Nothing
        Next p
    End If
        
    Set getLayersMainShapes = p_layersMainShapes
End Function


Public Function getLayersShapes() As shapeRange

    If p_layersShapes Is Nothing Then
        Set p_layersShapes = New shapeRange
        
        Dim p As Integer
        For p = 1 To parts.count
            Dim currPart As ProductDesignPart
            Set currPart = parts.getPart(p)
            
            p_layersShapes.AddRange currPart.layersToShapeRange
            
            Set currPart = Nothing
        Next p
        
    End If
    
    Set getLayersShapes = p_layersShapes
End Function



Public Function convertForFancyExport()
    parts.convertForFancyExport
End Function



Public Property Get originalMainShapesAndBleedBox() As rect
    Set originalMainShapesAndBleedBox = p_originalMainShapesAndBleedBox
End Property

Private Function calculateOriginalMainShapesAndBleedBox()
    Set p_originalMainShapesAndBleedBox = parts.getMainShapesAndBleedBoundingBox
End Function


Public Property Get confiMainShapesAndBleedBox() As rect
    Set confiMainShapesAndBleedBox = parts.getMainShapesAndBleedBoundingBox
End Property

