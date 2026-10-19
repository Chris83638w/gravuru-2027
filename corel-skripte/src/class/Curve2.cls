Attribute VB_Name = "Curve2"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
' Ist dafür gedacht, das Problem mit den nicht ausschneidenden Pfaden zu lösen.
' Bsp. kommt es vor, dass bei einem O das Loch nicht ausgeschnitten ist.
' Ein Pfad dazu ist da, doch er hat keinen Effekt. Das liegt daran, dass der Pfad falsch herum ist

Public subPathClusters As New collection

Public Function newCurve(curve As curve)
    
    For i = 1 To curve.subPaths.count
        
    Next i
    
End Function
