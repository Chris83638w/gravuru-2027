Attribute VB_Name = "VariantRange"
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


Private variants As New collection


Public Function add(varia As variante)
    variants.add varia
End Function


Public Function item(ByVal index As Integer) As variante
    Set item = variants.item(index)
End Function


Public Function count() As Integer
    count = variants.count
End Function


Public Function removeVariant(varia As Variant)
    Remove Globals.getCollectionValueIndex(variants, varia)
End Function

Public Function Remove(index As Integer)
    variants.Remove index
End Function


Public Function removeEqualVariants() As VariantRange
    Dim i As Integer
    i = 1
    While i <= variants.count
        Dim j As Integer
        j = i + 1
        While j <= variants.count
            If item(i).isEqualTo(item(j)) Then
                Remove j
                j = j - 1
            End If
            j = j + 1
        Wend
        i = i + 1
    Wend
    
    Set removeEqualVariants = Me
End Function


Public Function getEqualVariants(varia As variante) As VariantRange
    Dim result As New VariantRange
    
    Dim i
    For i = 1 To variants.count
        If varia.isEqualTo(item(i)) Then
            result.add item(i)
        End If
    Next i
    
    Set getEqualVariants = result
End Function


Public Function clone() As VariantRange
    
    Set clone = New VariantRange
    
    Dim i As Integer
    For i = 1 To variants.count
        clone.add variants(i)
    Next i
    
End Function


Public Function getDesigns() As ProductDesignRange
    Dim result As New ProductDesignRange
    
    Dim i As Integer
    For i = 1 To variants.count
        Dim currDesign As productDesign
        Set currDesign = item(i).getDesign
        
        If Not result.Contains(currDesign) Then
            result.add currDesign
        End If
    Next i
    
    Set getDesigns = result
End Function


Public Function getVariantNames() As String
    Dim v As Integer
    For v = 1 To variants.count
        getVariantNames = getVariantNames & item(v).variantName & IIf(v = variants.count, "", ", ")
    Next v
End Function


Public Function collectShapes() As shapeRange
    Dim result As New shapeRange
    Dim v As Integer
    For v = 1 To variants.count
        result.add item(v).shape
    Next v
    Set collectShapes = result
End Function


Public Function toString() As String
    Dim childs As String
    Dim i As Integer
    For i = 1 To count()
        childs = Globals.addStringWithDelimiterIfNeeded(childs, item(i).toString)
    Next i
    toString = "VariantRange: [" & childs & "]"
End Function
