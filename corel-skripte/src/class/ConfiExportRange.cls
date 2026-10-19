Attribute VB_Name = "ConfiExportRange"
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
'

Private confiExports As New ArrayList


Public Function add(confiEx As ConfiExport)
    confiExports.add confiEx
End Function


Public Function getConfiExport(index As Integer) As ConfiExport
    Set getConfiExport = confiExports.item(index)
End Function


Public Function getProductDesingPartsOfView(viewIndex As Integer) As ProductDesignPartRange
    Dim result As New ProductDesignPartRange
    
    Dim i As Integer
    For i = 1 To confiExports.count
        result.AddRange getConfiExport(i).getView(viewIndex).parts.ToArrayList
    Next i
    
    Set getProductDesingPartsOfView = result
End Function
