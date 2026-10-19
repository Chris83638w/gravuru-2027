Attribute VB_Name = "PersistentShape"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
' Kapselt ein Shape, damit nicht direkt mit dem Shape gearbeitet wird.
' Denn Shape Referenzen gehen verloren, wenn man das Shape bspw. zuschneidet oder zu einer Bitmap konvertiert.
' Das macht es aufwändig, alle Refezenzen zu aktualisieren
' Mit dieser Klasse würde sich die Shape Refenz hier drin aktualisieren und alle Referenzen eines Objektes dieser Klasse hätten die Aktualisierung


Dim shape As shape
Dim staticID As Long ' Eine StaticID ist die ID eines Shapes innerhalb des Dokuments. Alte IDs werden nicht wiederverwendet

Public documentHandler As PersistentShapeDocumentHandler

Public Function getShape() As shape
    Set getShape = shape
End Function


Public Function setShape(theShape As shape)
    Set shape = theShape
    If shape Is Nothing Then
        staticID = -1
    Else
        staticID = shape.staticID
    End If
End Function


Public Function getStaticID() As Long
    getStaticID = staticID
End Function

Public Function swap(newShape As shape, Optional logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[PersistentShape.swap] newShape: " & Globals.shapeToString(newShape)
    
    If Not Globals.isShapeReferenceValid(newShape) Then
        Err.Raise vbObjectError + 513, , "[PersistentShape.swap] 'newShape' ist ungültig "
    End If
    documentHandler.swapShape staticID, newShape
    
    If Not logger Is Nothing Then logger.removeTab
End Function

Public Function convertToBitmap(Optional ByVal bitDepth As Long = 24, Optional ByVal grayscale As Boolean = False, Optional ByVal dithered As Boolean = True, Optional ByVal transparentBG As Boolean = True, _
        Optional ByVal resolution As Long = 72, Optional ByVal antiAliasing As cdrAntiAliasingType, Optional ByVal useColorProfile As Boolean = False, Optional ByVal multiChannel As Boolean = False, _
        Optional ByVal alwaysOverprintBlack As Boolean = False, Optional ByVal overPrintBlackLimit As Long = 95, Optional logger As logger)
    swap shape.convertToBitmap(bitDepth, grayscale, dithered, transparentBG, resolution, antiAliasing, useColorProfile, multiChannel, alwaysOverprintBlack, overPrintBlackLimit), logger
End Function


' Wenn dieses Shape das sourceShape beim intersecten ist, bleibt es unverändert, weshalb es dafür keine Funktion hier gibt. Da sol einfach die Globals.intersectShapes genutzt werden
Public Function intersectAsTarget(sourceShape As shape, Optional leaveSource As Boolean = True, Optional leaveTarget As Boolean = False, _
    Optional keepTargetShapeWhenNoOverlap As Boolean = True, Optional logger As logger) As shape
    
    If Not logger Is Nothing Then logger.addTab , "[PersistentShape.intersectAsTarget]"
    
    swap Globals.intersectShapes(sourceShape, shape, leaveSource, leaveTarget, keepTargetShapeWhenNoOverlap, logger), logger
    
    If Not logger Is Nothing Then logger.removeTab
End Function
