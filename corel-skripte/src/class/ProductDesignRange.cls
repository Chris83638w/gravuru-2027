Attribute VB_Name = "ProductDesignRange"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
Option Explicit

' Autor Martin Afelt @ Gravuru

Private designs As New ArrayList


Public Function add(design As productDesign)
    designs.add design
End Function


Public Function AddRange(ByVal values As Variant)
    ' TODO Prüfen, ob es wirklich Designs sind
    designs.AddRange values
End Function


Public Sub Insert(ByVal index As Long, ByVal value As Variant)
    designs.Insert index, value
End Sub

' ===== Search =====
Public Function IndexOf(ByVal value As Variant, Optional ByVal Startindex As Long = 1, Optional deepSearch As Boolean) As Long
    IndexOf = designs.IndexOf(value, Startindex, deepSearch)
End Function


Public Function moveToByDesignNumber(designNumber As Integer, toIndex As Long)
    Dim design As productDesign
    Set design = getDesignByDesignNumber(designNumber)
    
    If design Is Nothing Then Err.Raise vbObjectError + 513, , "[ProductDesignRange.moveToByDesignNumber] Design mit der Design-Nummer '" & designNumber & "' nicht gefunden"
    
    designs.moveTo IndexOf(design), toIndex
End Function


Public Property Get count() As Long
    count = designs.count
End Property


Public Function getDesign(ByVal index As Integer) As productDesign
    Set getDesign = designs.item(index)
End Function


Public Function getDesignIndex(design As productDesign) As Integer
    Dim i As Integer
    For i = 1 To designs.count
        If getDesign(i) Is design Then
            getDesignIndex = i
            Exit Function
        End If
    Next i
    
    getDesignIndex = -1
End Function


Public Function getDesignByDesignNumber(designNumber As Integer) As productDesign
    Dim i As Integer
    For i = 1 To designs.count
        If getDesign(i).getProductIDObject.getDesignNumber = designNumber Then
            Set getDesignByDesignNumber = getDesign(i)
            Exit Function
        End If
    Next i
End Function


Public Function getDesignShapes() As shapeRange
    Dim result As New shapeRange
    
    Dim i As Integer
    For i = 1 To designs.count
        Globals.safeAddShapeToShapeRange getDesign(i).getDesignShape, result
    Next i
    
    Set getDesignShapes = result
End Function


Public Function getArrayList() As ArrayList
    Set getArrayList = designs
End Function

Public Function addArrayList(arrList As ArrayList) As ArrayList
    designs.AddRange arrList
End Function


Public Function reverse()
    designs.reverse
End Function


Public Function RemoveAt(ByVal index As Long)
    designs.RemoveAt index
End Function


Public Function Contains(ByVal value As Variant, Optional deepSearch As Boolean) As Boolean
    Contains = designs.Contains(value, deepSearch)
End Function

Public Function ContainsByDesignNumber(designNumber As Integer) As Boolean
    Dim i As Integer
    For i = 1 To designs.count
        If getDesign(i).getProductIDObject.getDesignNumber = designNumber Then
            ContainsByDesignNumber = True
            Exit Function
        End If
    Next i
End Function


Public Function ToDesignShapes() As ArrayList
    Set ToDesignShapes = designs.ToDesignShapes
End Function


Public Function collectAllVariants(Optional logger As logger) As VariantArray
    Dim result As New VariantArray
    
    Dim i As Integer
    For i = 1 To designs.count
        Dim currDesign As productDesign
        Set currDesign = getDesign(i)
        
        result.addVariants currDesign.collectAllVariants(logger).allVariants
        
        Set currDesign = Nothing
    Next i
    
    Set collectAllVariants = result
End Function


Public Function getDesignsByFancyExportID(id As Long) As ProductDesignRange
    
    Dim result As New ProductDesignRange
    
    Dim i As Integer
    For i = 1 To designs.count
        Dim currDesign As productDesign
        Set currDesign = getDesign(i)
        
        If currDesign.hasFancyCustomizationID(id) Then
            result.add currDesign
        End If
        
        Set currDesign = Nothing
    Next i
    
    Set getDesignsByFancyExportID = result
    
End Function


Public Function getSelectedDesigns(Optional selectedShapes As shapeRange) As ProductDesignRange
    
    Dim result As New ProductDesignRange
    
    Dim i As Integer
    For i = 1 To designs.count
        Dim currDesign As productDesign
        Set currDesign = getDesign(i)
        
        If currDesign.isSelected(selectedShapes, True) Then
            result.add currDesign
        End If
        
        Set currDesign = Nothing
    Next i
    
    Set getSelectedDesigns = result
End Function


' Funktionen aus ProductDesignLayer
' ==============================

Public Function ungroupLayersAndDesign()
    Dim i As Integer
    For i = 1 To designs.count
        getDesign(i).ungroupLayersAndDesign
    Next i
End Function


Public Function newCustomShapeTypeQuery(ByVal shapeType As customShapeType) As CustomShapeTypeQuery
    Set newCustomShapeTypeQuery = Classfactory.newCustomShapeTypeQuery(getShapesForCustomShapeTypeQuery, shapeType)
End Function


Public Function getShapesForCustomShapeTypeQuery() As shapeRange
    Dim range As New shapeRange
    
    Dim i As Integer
    For i = 1 To designs.count
        range.AddRange getDesign(i).getShapesForCustomShapeTypeQuery
    Next i
    
    Set getShapesForCustomShapeTypeQuery = range
End Function


Public Function collectMainShapes()
    Dim result As New shapeRange
    
    Dim i As Integer
    For i = 1 To designs.count
        result.AddRange getDesign(i).getLayers.collectMainShapes
    Next i
    
    Set collectMainShapes = result
End Function


Public Function sortText(Optional orderTextToFront As Boolean)
    Dim i As Integer
    For i = 1 To designs.count
        getDesign(i).getLayers.sortText orderTextToFront
    Next i
End Function


' Funktionen aus ProductDesign
' ==============================

Public Function addFancyCustomizationIDShape(fancyCustomizationID As Long, Optional doPositionMetadataShapes As Boolean)
    Dim i As Integer
    For i = 1 To designs.count
        getDesign(i).addFancyCustomizationIDShape fancyCustomizationID, doPositionMetadataShapes
    Next i
End Function


Public Function getFancyCustomizationIDs(Optional allowDuplicates As Boolean = False) As ArrayList
    
    Dim result As New ArrayList
    
    Dim i As Integer
    For i = 1 To designs.count
        Dim currDesign As productDesign
        Set currDesign = getDesign(i)
        
        Dim currDesignIDs As ArrayList
        Set currDesignIDs = currDesign.getFancyCustomizationIDs
        
        If Not currDesignIDs.count = 0 Then
            result.AddRange currDesignIDs, allowDuplicates, False
        End If
        
        Set currDesignIDs = Nothing
        Set currDesign = Nothing
    Next i
    
    Set getFancyCustomizationIDs = result
End Function


Public Function deleteFancyCustomizationIDShape(fancyCustomizationID As Long, Optional doPositionMetadataShapes As Boolean)
    Dim i As Integer
    For i = 1 To designs.count
        Dim currDesign As productDesign
        Set currDesign = getDesign(i)
        
        currDesign.deleteFancyCustomizationIDShape fancyCustomizationID, doPositionMetadataShapes
        
        Set currDesign = Nothing
    Next i
End Function

