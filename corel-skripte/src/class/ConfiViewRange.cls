Attribute VB_Name = "ConfiViewRange"
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
' Variablen-Namens-Vorschlag: cViewRange

Private confiViews As New ArrayList


Public Function add(view As ConfiView)
    confiViews.add view
End Function


Public Function AddRange(ByVal values As Variant)
    confiViews.AddRange values
End Function


Public Property Get count() As Long
    count = confiViews.count
End Property


Public Function getView(ByVal index As Integer) As ConfiView
    Set getView = confiViews.item(index)
End Function


Public Sub RemoveAt(ByVal index As Long)
    confiViews.RemoveAt index
End Sub


Public Function convertForFancyExport()
    Dim i As Integer
    For i = 1 To confiViews.count
        getView(i).convertForFancyExport
    Next i
End Function


Public Property Get layersFlattened() As ProductDesignLayerRange
    Dim result As New ProductDesignLayerRange
    Dim i As Integer
    For i = 1 To confiViews.count
        result.AddRange getView(i).layersFlattened.ToArrayList
    Next i
    Set layersFlattened = result
End Property
