Attribute VB_Name = "FancyExportJSONImageElement"
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


Dim shapeRange As shapeRange
Dim shapeForZIndexCalculation As shape

Public view As FancyExportView
Dim shapeEx As ShapeExport
Public layer As ProductDesignLayer
Public logger As logger

Enum FancyXOrigin
    LeftFOrigin
    CenterFOrigin
    RightFOrigin
End Enum

Enum FancyUploadBoxScaleMode
    CoverScaleMode
    FitScaleMode
End Enum

Public title As String
Public source As String ' Die Datei. Z.B: "Grundplatte.jpg"
Public imageSrcOriginal As String

' Parameters
' -----------------------
Private x As Double ' Stellvertretend für 'left'
Private y As Double ' Stellvertretend für 'top'
Public angle As Double
Public z As Integer
Public color As String ' Stellvertretend für 'fill'
Public colorAble As Boolean

Public draggable As Boolean
Public rotatable As Boolean
Public resizable As Boolean
Public removable As Boolean

Public replace As String
Public topped As Boolean
Public opacity As Double

Public excludeFromExport As Boolean
' Wenn True, dann muss der Fancy-User diese Ebene erst im Layer-Modul vom Fancy unlocken um dieses Element zu bearbeiten
Public locked As Boolean

Public isUploadBox As Boolean
Public uploadBoxScaleMode As FancyUploadBoxScaleMode

Public adminLocked As Boolean

Public originX As FancyXOrigin

Public price As Double

Public excludeFromDesigner As Boolean
' -----------------------

Public initialized As Boolean
Private erroredDontWriteJSON As Boolean


Public Function init(ByVal shapeEx_ As ShapeExport, Optional shapeExPrint As ShapeExport, Optional title_ As String = "", Optional zIndexInLayer As Integer = -1, Optional shapeForZIndexCalculation_ As shape)
    
    Set shapeEx = shapeEx_
    If Not shapeForZIndexCalculation_ Is Nothing Then
        Set shapeForZIndexCalculation = shapeForZIndexCalculation_
    Else
        ' Da die finalen Exportformen eventuel nur eine Kopie sind, eignen sich nur die originalen Formen im Layer für Z-Indexe
        Set shapeForZIndexCalculation = shapeEx.getShapes.firstShape
    End If
    
    shapeEx.setKeepShapesToDeleteAfterExport True
    shapeEx.export logger, True
    
    ' Wenn es ein Problem beim exportieren der Formen gab, soll hier nicht weitergemacht werden und dieses ImageElement auch nicht in die JSON kommen
    If Not shapeEx.fileExportedSucessfully Then
        erroredDontWriteJSON = True
        ' TODO Error in Log speichern !!! ! !!! ! ! !
        Exit Function
    End If
    
    Set shapeRange = shapeEx.finalExportedShapes
    
    If Not shapeExPrint Is Nothing Then
        imageSrcOriginal = shapeExPrint.export(logger, True).finalExportFileNameWithType
    End If
    
    setPositionToShapeOrRange shapeRange
    
    source = shapeEx.finalExportFileNameWithType
    If source = "" Then Err.Raise vbObjectError + 513, , "[FancyExportJSONImageElement.init] 'source' darf nicht leer sein. Vermutlich wurde das Bild nicht exportiert, weil es leer war"
    
    If title_ = "" Then
        ' Wenn kein titel angegeben wurde, wird einfach der Dateiname ohne Dateiendung von der 'source' genutzt
        ' Z.B: "Designelement1.svg" -> "Designelement1"
        title = Globals.getFolderFileAndType(source)(1)
    Else
        title = title_
    End If
    
'    Set layer = view.view.layersInKonfiOrder.findShapesLayer(shapeEx.getShapes.firstShape)
'    If layer Is Nothing Then Err.Raise vbObjectError + 513, , "[FancyExportJSONImageElement.init] Der Layer für folgende Formen konnte nicht ermittelt werden. Eventuell sind die Formen außerhalb eines Layers: " & Globals.shapeRangeToString(shapeEx.getShapes)
    
    calculateZIndex zIndexInLayer
    
    shapeEx.deleteShapesToDeleteAfterExport
    
    setDefaultValues
    initialized = True
End Function


' ACHTUNG: Je höher ein Z-Index beim Fancy, desdo tiefer unten ist er im Stapel
' zIndexInLayer ist die Sichtweise in Corel: oberste Form = 1 unterste bspw.: 200
Private Function calculateZIndex(Optional zIndexInLayer As Integer = -1)
    If Not logger Is Nothing Then logger.addTab , "[FancyExportJSONImageElement.calculateZIndex] zIndexInLayer: '" & zIndexInLayer & "'"
    
    ' Wird anhand des Z-Indexes der letzten Form gemessen. Bspw.: 200
    Dim highestZIndexInLayer As Integer
    highestZIndexInLayer = getGroupShapeLastAbsoulteIndex(layer.layerShape)
    
    If Not logger Is Nothing Then logger.logINFO "highestZIndexInLayer: '" & highestZIndexInLayer & "'"
    
    If zIndexInLayer = -1 Then
        zIndexInLayer = Globals.getShapeAbsoluteIndexInGroupShape(shapeForZIndexCalculation, layer.layerShape)
        If Not logger Is Nothing Then logger.logINFO "zIndexInLayer ist nicht angegeben und wurde ermittelt. zIndexInLayer: '" & zIndexInLayer & "'"
        If zIndexInLayer = -1 Then
            ' Fehler anzeigen!
            Err.Raise vbObjectError + 513, , "[FancyExportJSONImageElement.calculateZIndex] zIndexInLayer konnte nicht ermittelt werden. Höchstwahrscheinlich ist 'shapeForZIndexCalculation' kein Child von 'layer'. zIndexInLayer: '" & zIndexInLayer & "'"
        End If
    End If
    
    ' Wenn 'zIndexInLayer' = 4 und 'highestZIndexInLayer' = 9 und 'FANCY_Z_INDEX_HIGHEST' = 999 dann ist z = 994
    z = (highestZIndexInLayer - zIndexInLayer)
    If Not logger Is Nothing Then logger.logINFO "z: '" & z & "'"
    z = min(max(z, 1), FANCY_Z_INDEX_HIGHEST)
    If Not logger Is Nothing Then logger.logINFO "z: '" & z & "'"
    
    ' Bei mehreren Layern hätten man folgende Ranges für die Z-Indexe
    ' Layer 1: 1000 bis 1999
    ' Layer 2: 0 bis 999
    ' usw.
    Dim layerIndexInKonfiOrder As Integer
    layerIndexInKonfiOrder = view.view.layersInKonfiOrder.count - view.view.layersInKonfiOrder.IndexOf(layer)
    If Not logger Is Nothing Then logger.logINFO "layerIndexInKonfiOrder: '" & layerIndexInKonfiOrder & "'"
    
    Dim layerSlotStart As Integer
    layerSlotStart = layerIndexInKonfiOrder * 1000
    If Not logger Is Nothing Then logger.logINFO "layerSlotStart: '" & layerSlotStart & "'"
    
    z = z + layerSlotStart
    
    If Not logger Is Nothing Then logger.logINFO "Finales z: '" & z & "'"
    
    logger.removeTab
End Function



Public Function initInTextElement(shapeOrRange As Variant, sourceVar As String, title_ As String)
    Set shapeRange = Globals.ensureShapeRange(shapeOrRange)
    
    Set shapeForZIndexCalculation = shapeRange.firstShape
    
    source = sourceVar
    title = title_
    
    Set layer = view.view.layersInKonfiOrder.findShapesLayer(shapeRange.firstShape)
    If layer Is Nothing Then Err.Raise vbObjectError + 513, , "[FancyExportJSONImageElement.init] Der Layer für folgende Formen konnte nicht ermittelt werden. Eventuell sind die Formen außerhalb eines Layers: " & Globals.shapeRangeToString(shapeEx.getShapes)
    
    calculateZIndex

    setDefaultValues
    initialized = True
End Function


Private Function setDefaultValues()
    
    originX = CenterFOrigin
    
    draggable = True
    rotatable = True
    resizable = True
    removable = True
    
    uploadBoxScaleMode = CoverScaleMode
    
    opacity = 1
End Function



Public Function setPositionToShapeOrRange(shapeOrRange As Variant)
    x = shapeOrRange.centerX
    y = -shapeOrRange.centerY
End Function

Public Function setPositionToTextSplit(textSplit As FancyExportTextSplit)
    x = textSplit.x
    y = -textSplit.y
End Function


Public Function setTransformationLocked(locked As Boolean)
    draggable = Not locked
    rotatable = Not locked
    resizable = Not locked
    removable = Not locked
End Function


Public Function toJSONObj() As Dictionary
    
    Dim imageElement As New Dictionary
    imageElement.add "title", title
    imageElement.add "source", source
    imageElement.add "type", "image"
    
    
    imageElement.add "parameters", getParametersJSON
    
    Set toJSONObj = imageElement
End Function



Public Function addToMainJSON(Optional atEnd As Boolean = False)
    If Not erroredDontWriteJSON Then
        view.addElementToJSON Me, atEnd
    End If
End Function


' Baut die JSON Struktur aus den Werten dieses ImageElements.
' Die Funktions-Bezeichnung 'parameters' ist die selbe, die auch in der JSON vorkommt
Public Function getParametersJSON() As Dictionary
    Dim parameters As New Dictionary
    
    If Not imageSrcOriginal = "" Then parameters.add "imageSrcOriginal", imageSrcOriginal
    
    ' Center Origin überspringen, da das der Standart ist
    If Not originX = CenterFOrigin Then parameters.add "originX", getFancyXOriginName(originX)
    
    parameters.add "left", x
    parameters.add "top", y
    If Not angle = 0 Then parameters.add "angle", 360 - angle ' << Winkel von Corel zu Fancy umwandeln
    parameters.add "z", z
    
    parameters.add "fill", IIf(color = "", False, color)
    parameters.add "colors", IIf(colorAble, "#000", False)
    
    parameters.add "draggable", IIf(draggable, 1, False)
    parameters.add "rotatable", IIf(rotatable, 1, False)
    parameters.add "resizable", IIf(resizable, 1, False)
    parameters.add "removable", IIf(removable, 1, False)
    
    If Not replace = "" Then parameters.add "replace", replace
    parameters.add "topped", topped
    parameters.add "opacity", opacity
    
    parameters.add "excludeFromExport", excludeFromExport
    parameters.add "locked", locked
    
    parameters.add "adminLocked", adminLocked
    
    parameters.add "minScaleLimit", 0.01 ' TODO Testen ob nötig ! ! ! ! ! ! ! ! ! !! ! !
    
    parameters.add "autoCenter", False ' Verhindern, dass der Fancy Elemente einfach auf das Canvas zentriert
    
    parameters.add "uploadZone", IIf(isUploadBox, 1, False) ' TODO testen ob nötig bei False !!!!!
    If isUploadBox Then
        parameters.add "scaleMode", getFancyUploadBoxScaleModeName(uploadBoxScaleMode)
        Dim customAdds As New Dictionary
        customAdds.add "uploads", 1
        parameters.add "customAdds", customAdds
    End If
    
    If price <> 0 Then parameters.add "price", price
    
    If excludeFromDesigner Then parameters.add "excludeFromDesigner", excludeFromDesigner
    
    Set getParametersJSON = parameters
End Function

Public Function getShapeRange() As shapeRange
    Set getShapeRange = shapeRange
End Function

Public Function getFancyXOriginName(orig As FancyXOrigin) As String
    Dim result As String
    Select Case orig
        Case LeftFOrigin
            result = "left"
         Case CenterFOrigin
            result = "center"
         Case RightFOrigin
            result = "right"
    End Select
    
    getFancyXOriginName = result
End Function


Public Function getFancyUploadBoxScaleModeName(scaleMode As FancyUploadBoxScaleMode) As String
    Dim result As String
    Select Case scaleMode
        Case FancyUploadBoxScaleMode.CoverScaleMode
            result = "cover"
        Case FancyUploadBoxScaleMode.FitScaleMode
            result = "fit"
    End Select
    getFancyUploadBoxScaleModeName = result
End Function

