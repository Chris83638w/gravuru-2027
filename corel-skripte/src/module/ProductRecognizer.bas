Attribute VB_Name = "ProductRecognizer"

' Autor:  Martin Afelt GRAVURU
'

Public initialized As Boolean

Public productShapesInfo() As ProductShapeInfo

Public Const TEXT_LAYER_NAME = "*TextLayer"

' Wie stark weicht die aktuelle ProductInfo von der Form ab. (Percent ist also umgekehrt, heißt 0% abweichen = 100% zutreffend)
Public fitPercent As Double
Public bestFittingValuePercent As Double

Public Function getProductShapesInfoFilePathRelative() As String
    getProductShapesInfoFilePathRelative = "Produktgrößennamen\Produktgrößennamen 2.1.csv"
End Function

Public Function initIfNeeded()
    If Not initialized Then
        init
    End If
End Function


Public Function init()
    
    Globals.checkIfServerOnlineAndSelectOfflineWorkPath
    Globals.checkVersion
    
    Dim path As String
    path = Globals.getMainFolder() & getProductShapesInfoFilePathRelative()
    
    If Globals.fileExist(path) Then
        Dim sizeNamesData() As String
        sizeNamesData = Globals.loadCSVToStringArray(path)
        
        'MsgBox "First Name=" & sizeNamesData(0, 1)
        
        Dim sizeNameObj As ProductShapeInfo ' Muss außerhalb der For stehen !!!
        
        
        
        ReDim productShapesInfo(UBound(sizeNamesData)) As ProductShapeInfo
        ' In i = 0 liegen die Datennamen (name, width, height)
        For i = 1 To UBound(sizeNamesData)
        
            
            
            Set sizeNameObj = New ProductShapeInfo
            sizeNameObj.newFromCSVStringArray sizeNamesData, (i)
            Set productShapesInfo(i) = sizeNameObj
'            MsgBox "Name=" & sizeNameObj.name & ", W=" & sizeNameObj.width & ", H=" & sizeNameObj.height
        Next i
        
        initialized = True
    Else
        MsgBox "Die Datei mit Produktgrößennamen fehlt! Wurde unter folgendem Pfad erwartet: '" & path & "'", , "ProductRecognizer"
        
        initialized = False
    End If
    

End Function




Public Function getShapeInfoForLayer(layer As ProductDesignLayer, Optional logger As logger, Optional quietMode As Boolean = False, Optional errorLogger As logger) As ProductShapeInfo
    
    ' Wenn die Hauptform ein Text ist, dann kann es alles mögliche sein
    ' Deshalb ein allgemeinen String zurückgeben -> 'TEXT_LAYER_NAME'
    ' Andere Scripte können diesen dann erkennen
    If layer.getMainShape.Type = cdrTextShape Then
        If Not logger Is Nothing Then logger.logINFO "Die Hauptform ist ein Text. Abbruch!"
        GoTo ExitFunction
    End If
    
    Dim layersShapeInfo As New ProductShapeInfo
    layersShapeInfo.newFromShape layer.getMainShape, layer.getSmalerRedOrPinkShapes, , quietMode, errorLogger
    
    Set getShapeInfoForLayer = layersShapeInfo
    
ExitFunction:
End Function




' TODO besser die productShapesInfo zurückgeben und nicht den Namen davon (sonst muss evtl. noch mithilfe des Namens die productShapesInfo nochmal gesucht werden)
' TODO rote Varianten-Formen ausschließen
'
' Wenn "findBestFit" true ist, dann wird versucht zu ermitteln zu wieviel Prozent die gegebene Form eine Form aus der Liste entspricht.
' Denn es kann sein, dass die gegebene Form nur leicht vom Original abweicht. Bevor dann gar keine Form zurückgegeben wird, wird lieber die nächstpassende mit einer Prozentzahl zurückgegeben
Public Function recognizeProductLayerName(layer As ProductDesignLayer, Optional findBestFit As Boolean = False, Optional logger As logger, Optional quietMode As Boolean = False, Optional errorLogger As logger) As String
    
'    Set logger = Globals.getLogger
'    Globals.getLogger.reset
    
    If Not logger Is Nothing Then logger.addTab , "[ProductRecognizer.recognizeProductLayerName] findBestFit: '" & findBestFit & "'"
    
    
    Dim layersShapeInfo As New ProductShapeInfo
    Set layersShapeInfo = getShapeInfoForLayer(layer, logger, quietMode, errorLogger)
    
    If layersShapeInfo Is Nothing Then
        recognizeProductLayerName = TEXT_LAYER_NAME
        GoTo ExitFunction
    End If
    
    
    initIfNeeded
    
    
    If IsEmpty(productShapesInfo) Then
        If Not logger Is Nothing Then logger.logWARN "'productShapesInfo' ist Nothing. Wahrscheinlich wurde die Datei mit den Forminfos nicht richtig galaden. Abbruch!"
        GoTo ExitFunction
    End If
    
    Dim previousUnit As cdrUnit
    previousUnit = ActiveDocument.unit
    ' Verhindert Fehler mit den Größen
    ActiveDocument.unit = cdrMillimeter
    
    Dim debugProductShapeName As String
    
    
    
    
    Dim bestFittingIndex As Integer
    bestFittingIndex = -1
    bestFittingValuePercent = -1
    
    
    
    ' Alle Formen die es gibt durchlaufen
    ' ----------------------------------------
    For i = 1 To UBound(productShapesInfo)
        
        If isLayerProduct(layer, productShapesInfo(i), layersShapeInfo, findBestFit, logger) And Not findBestFit Then
            recognizeProductLayerName = productShapesInfo(i).name
            GoTo ExitFunction
        End If
        
        If Not logger Is Nothing Then logger.logINFO productShapesInfo(i).name & " - fit: " & fitPercent & ", bestFittingValuePercent: " & bestFittingValuePercent
        
        If fitPercent > bestFittingValuePercent Then
            bestFittingValuePercent = fitPercent
            bestFittingIndex = i
        End If
         
    Next i
    ' ----------------------------------------
    
    
    If findBestFit And Not bestFittingIndex = -1 Then
        recognizeProductLayerName = productShapesInfo(bestFittingIndex).name
    End If
    
    
ExitFunction:
    ActiveDocument.unit = previousUnit
    If Not logger Is Nothing Then logger.removeTab
End Function




Private Function getBoundingBoxesOfSmalerRedOrPinkShapesOfLayer(layer As ProductDesignLayer, Optional logger As logger) As collection
    
    Dim smallerShapesBoundingBoxes As New collection
    
    
    
    ' DEBUG
'    MsgBox "layer.getAllRedOrPinkShapes.count: " & layer.getAllRedOrPinkShapes.count & ", layer: " & layer.layerShape.name & ", layer index: " & layer.getLayerIndex
    
    ' SubPaths von der Hauptform hinzufügen (der größte wird ignoriert)
    Globals.combineCollectionToCollection getBoundingBoxesOfShape(layer.getMainShape, True, logger), smallerShapesBoundingBoxes
    
    ' SubPaths von kleineren (abgetrennten) Formen hinzufügen (Hauptform kann auch mehrere subPaths haben)
    For i = 1 To layer.getSmalerRedOrPinkShapes.count
        Globals.combineCollectionToCollection getBoundingBoxesOfShape(layer.getAllRedOrPinkShapes(i), False, logger), smallerShapesBoundingBoxes
    Next i
    
    Set getBoundingBoxesOfSmalerRedOrPinkShapesOfLayer = smallerShapesBoundingBoxes
End Function




Private Function getBoundingBoxesOfShape(shape As shape, isMainShape As Boolean, Optional logger As logger) As collection
    ' Boundingboxen aller Formen. Hauptform & Unterformen
    Dim smallerShapesBoundingBoxes As New collection
    
    
    ' Wenn die Hauptform eine Kurvenform ist, kann sie Unterpfade haben
    If shape.Type = cdrCurveShape Then
        
        Dim biggestSubPathIndex As Integer
        biggestSubPathIndex = -1
        
        ' Nur bei der größten Form/Hauptform den größten SubPath ausschließen
        If isMainShape Then
            biggestSubPathIndex = Globals.getBiggestSubPathIndex(shape.DisplayCurve.subPaths)
        End If
        
        ' Alle BoundingBoxen der SubPaths von der Hauptform sammeln
        For j = 1 To shape.curve.subPaths.count
            If Not j = biggestSubPathIndex Then ' Größten SubPath nicht hinzufügen
                smallerShapesBoundingBoxes.add shape.curve.subPaths(j).boundingBox
            End If
        Next j
    
    ' Hauptform ist eine einfache Form...
    Else
        ' ... deshalb einfach nur die Hauptform hinzufügen, ...
        If Not isMainShape Then ' ... wenn es nicht die Hauptform ist
            smallerShapesBoundingBoxes.add shape.boundingBox
        End If
    End If
    
    Set getBoundingBoxesOfShape = smallerShapesBoundingBoxes
End Function



Public Sub TestIsLayerProduct()
    
    Dim logger As logger
    Set logger = Globals.getLogger(True)
    logger.logINFO "[ProductRecognizer.TestIsLayerProduct] start"
    logger.addTab
    
    If Not ActiveShape.Type = cdrGroupShape Then
        MsgBox "Keine Gruppe ausgewählt!"
        Exit Sub
    End If
    
    Dim design As New productDesign
    design.newProductDesign ActiveShape
    
    Dim layer As ProductDesignLayer
    Set layer = design.getLayer2(1)
    
    Dim answer As String
    answer = InputBox("Gebe den Formnamen ein", "Formname eingeben ...", recognizeProductLayerName(layer, True))
    
    If answer = "" Then
        Exit Sub ' Abbrechen
    End If
    
    Dim productInfo As ProductShapeInfo
    Set productInfo = getProductShapeInfoFromString(answer)
    
    If productInfo Is Nothing Then
       MsgBox "Der Formname '" & answer & "' wurde nicht gefunden !"
       Exit Sub
    End If
    
    
    ActiveDocument.unit = cdrMillimeter
    
    MsgBox "isLayerProduct: " & isLayerProduct(layer, productInfo, , True, logger)
    
    logger.removeTabsAll
End Sub


Public Function isLayerProduct(layer As ProductDesignLayer, pShapeInfo As ProductShapeInfo, Optional layersShapeInfo As ProductShapeInfo, Optional findBestFit As Boolean = False, Optional logger As logger) As Boolean
    
    initIfNeeded
    
    If Not logger Is Nothing Then
        logger.logINFO "[ProductRecognizer.isLayerProduct] pShapeInfo: " & pShapeInfo.name & ", findBestFit: " & findBestFit
        logger.addTab
    End If
    

    
    If layersShapeInfo Is Nothing Then
        Set layersShapeInfo = New ProductShapeInfo
        layersShapeInfo.newFromShape layer.getMainShape, layer.getSmalerRedOrPinkShapes
    End If
    
    isLayerProduct = areShapeInfosEuqal(layersShapeInfo, pShapeInfo, findBestFit, logger)
    
    If Not logger Is Nothing Then logger.removeTab
End Function

' Prüft ob 'productShapeInfoA' (source) 'productShapeInfoB' (target) ähnelt
' Achtung: Die Tolleranzen werden immer mit den Größen von 'productShapeInfoB' berechnet
Public Function areShapeInfosEuqal(productShapeInfoA As ProductShapeInfo, productShapeInfoB As ProductShapeInfo, Optional findBestFit As Boolean = False, Optional logger As logger) As Boolean
        
        
    If Not logger Is Nothing Then logger.addTab , "[ProductRecognizer.areShapeInfosEuqal]"
    
    If Not ActiveDocument.unit = cdrMillimeter Then
        Dim errorMsg As String
        errorMsg = "Das Dokument ist nicht auf Millimeter eingestellt sondern auf '" & Globals.getUnitName(ActiveDocument.unit) & "'"
        logger.logFATAL errorMsg
        Err.Raise vbObjectError + 513, , errorMsg
    End If
    
    initIfNeeded
    
    
    
    fitPercent = 0
    
    Dim sizeAndBoundingBoxesFitPercent As Double
    
    ' BREITE ::::::::
    Dim widthDifference As Double
    widthDifference = VBA.Abs(productShapeInfoA.width - productShapeInfoB.width)
    '
    Dim widthTollerance As Double
    widthTollerance = (productShapeInfoB.width * getSizeToleranceFactor)
    sizeAndBoundingBoxesFitPercent = sizeAndBoundingBoxesFitPercent + getFitPercentForTollerance(widthDifference, widthTollerance)
    
    If Not logger Is Nothing Then logger.logINFO "wFit: " & getFitPercentForTollerance(widthDifference, widthTollerance)
    
    
    ' HÖHE ::::::::
    Dim heightDifference As Double
    heightDifference = VBA.Abs(productShapeInfoA.height - productShapeInfoB.height)
    '
    Dim heightTollerance As Double
    heightTollerance = (productShapeInfoB.height * getSizeToleranceFactor)
    sizeAndBoundingBoxesFitPercent = sizeAndBoundingBoxesFitPercent + getFitPercentForTollerance(heightDifference, heightTollerance)
    
    If Not logger Is Nothing Then logger.logINFO "hFit: " & getFitPercentForTollerance(heightDifference, heightTollerance)
    
    
    ' FLÄCHE:::::::
    Dim areaDifference As Double
    areaDifference = VBA.Abs(productShapeInfoA.area - productShapeInfoB.area)
    '
    Dim areaTollerance As Double
    areaTollerance = (productShapeInfoB.area * getAreaToleranceFactor)
    sizeAndBoundingBoxesFitPercent = sizeAndBoundingBoxesFitPercent + getFitPercentForTollerance(areaDifference, areaTollerance)
    
    If Not logger Is Nothing Then logger.logINFO "aFit: " & getFitPercentForTollerance(areaDifference, areaTollerance) & ", A.area: " & productShapeInfoA.area & ", B.area: " & productShapeInfoB.area & ", areaDifference: " & areaDifference & ", areaTollerance: " & areaTollerance
    
    
    ' BOUNDING-BOXES ::::::
    Dim boundingBoxesCountDifference As Integer
    boundingBoxesCountDifference = Abs(productShapeInfoA.subShapes.count - productShapeInfoB.subShapes.count)
    Dim boundingBoxesCountTollerance As Integer
    boundingBoxesCountTollerance = productShapeInfoB.subShapes.count * 0.7

    sizeAndBoundingBoxesFitPercent = sizeAndBoundingBoxesFitPercent + getFitPercentForTollerance((boundingBoxesCountDifference), (boundingBoxesCountTollerance))
    
    If Not logger Is Nothing Then logger.logINFO "bFit: " & getFitPercentForTollerance((boundingBoxesCountDifference), (boundingBoxesCountTollerance))
    
    
    
    
    sizeAndBoundingBoxesFitPercent = sizeAndBoundingBoxesFitPercent / 4 ' 4 == Breite, Höhe, Fläche & Boundingboxen
    
    fitPercent = sizeAndBoundingBoxesFitPercent
    
    If Not logger Is Nothing Then logger.logINFO "sizeAndBoundingBoxesFitPercent: " & sizeAndBoundingBoxesFitPercent
    
    
    ' Nur wenn die Werte für Breite Höhe, Area & Boundingboxen (einigermaßen) passen, mit der Form weitermachen
    If IIf(findBestFit, fitPercent < 50, fitPercent < 100) Then
        GoTo ExitFunction
    End If
        
    
    ' SubPaths vergleichen
    ' ===================================
    Dim subPathsFit As Double
    Dim allSubShapesFound As Boolean
    Dim foundSubPathsCount As Integer
    
    Dim fitChache As New collection
        
    
    Dim ShapeFound() As Boolean ' Wird mehrfach verwendet
    If productShapeInfoA.subShapes.count > 0 Then
        ReDim ShapeFound(1 To productShapeInfoA.subShapes.count)
    End If
    
    ' Gespeicherte SubPaths infos der aktuellen ProductShapeInfo durchlaufen
    For j = 1 To productShapeInfoB.subShapes.count

        ' Boundingbox vom aktuellen SubPath der ProductShapeInfo
        Dim currentSubShapeRectB As New rect
        Set currentSubShapeRectB = productShapeInfoB.subShapes(j)
        
        fitChache.add New collection
        
        ' Alle Boundingboxen durchlaufen
        For k = 1 To productShapeInfoA.subShapes.count
            If Not ShapeFound(k) Then

                ' Position der Boundingbox relativ zur Hauptform
                Dim currentSubShapeRectA As rect
                
                Set currentSubShapeRectA = productShapeInfoA.subShapes(k)
                
                Dim currentSubpathFit As Double
                currentSubpathFit = 0
'                    logger.logINFO "currentSubpathFit @ start: " & currentSubpathFit
                
                ' CENTER X :::::::::::::::
                Dim centerXDifference As Double
                centerXDifference = Abs(currentSubShapeRectA.centerX - currentSubShapeRectB.centerX)
                Dim centerXTollereance As Double
                centerXTollereance = currentSubShapeRectB.width * getSizeToleranceFactor()
                currentSubpathFit = currentSubpathFit + getFitPercentForTollerance(centerXDifference, centerXTollereance)
                
'                    logger.logINFO "currentSubpathFit after centerX: " & currentSubpathFit
                
                ' CENTER Y :::::::::::::::
                Dim centerYDifference As Double
                centerYDifference = Abs(currentSubShapeRectA.centerY - currentSubShapeRectB.centerY)
                Dim centerYTollerance As Double
                centerYTollerance = currentSubShapeRectB.height * getSizeToleranceFactor()
                currentSubpathFit = currentSubpathFit + getFitPercentForTollerance(centerYDifference, centerYTollerance)
                
'                    logger.logINFO "currentSubpathFit after centerY: " & currentSubpathFit
                
                ' WIDTH :::::::::::::::
                Dim wDifference As Double
                wDifference = Abs(currentSubShapeRectA.width - currentSubShapeRectB.width)
                Dim wTollereance As Double
                wTollereance = currentSubShapeRectB.width * getSizeToleranceFactor()
                currentSubpathFit = currentSubpathFit + getFitPercentForTollerance(wDifference, wTollereance)
                
'                    logger.logINFO "currentSubpathFit after w: " & currentSubpathFit
                
                ' HEIGHT :::::::::::::::
                Dim hDifference As Double
                hDifference = Abs(currentSubShapeRectA.height - currentSubShapeRectB.height)
                Dim hTollereance As Double
                hTollereance = currentSubShapeRectB.height * getSizeToleranceFactor()
                currentSubpathFit = currentSubpathFit + getFitPercentForTollerance(hDifference, hTollereance)
                
'                    logger.logINFO "currentSubpathFit after h: " & currentSubpathFit
                currentSubpathFit = currentSubpathFit / 4 ' 4 == CenterX, CenterY, Width, Height
                
                
                If Not logger Is Nothing Then
                    logger.logINFO "Compare k: " & k
                    logger.logINFO "- centerXDifference: " & centerXDifference
                    logger.logINFO "- centerX Fit: " & getFitPercentForTollerance(centerXDifference, centerXTollereance)
                    
                    logger.logINFO "- centerYDifference: " & centerYDifference
                    logger.logINFO "- centerY Fit: " & getFitPercentForTollerance(centerYDifference, centerYTollerance)
                    
                    logger.logINFO "- A.w: " & currentSubShapeRectA.width & ", B.w: " & currentSubShapeRectB.width
                    logger.logINFO "- wDifference: " & wDifference
                    logger.logINFO "- w Fit: " & getFitPercentForTollerance(wDifference, wTollereance)
                    
                    logger.logINFO "- A.h: " & currentSubShapeRectA.height & ", B.h: " & currentSubShapeRectB.height
                    logger.logINFO "- hDifference: " & hDifference
                    logger.logINFO "- h Fit: " & getFitPercentForTollerance(hDifference, hTollereance)
                    
                    logger.logINFO "- currentSubpathFit: " & currentSubpathFit
                    
'                             ", CenterY: " & currentSubShapeRectB.CenterY & " & " & currentSubShapeRectA.CenterY & " = " & Abs(currentSubShapeRectB.CenterY - currentSubShapeRectA.CenterY) & _
'                            ", Width: " & currentSubShapeRectB.width & " & " & currentSubShapeRectA.width & " = " & Abs(currentSubShapeRectB.width - currentSubShapeRectA.width) & _
'                            ", Height: " & currentSubShapeRectB.height & " & " & currentSubShapeRectA.height & " = " & Abs(currentSubShapeRectB.height - currentSubShapeRectA.height)
                End If
                
                If Not findBestFit Then
                    If currentSubpathFit >= 100 Then
                        ShapeFound(k) = True
                        
                        foundSubPathsCount = foundSubPathsCount + 1
                        subPathsFit = subPathsFit + currentSubpathFit
                        
                        If Not logger Is Nothing Then logger.logINFO "Match"
                    Else
                        If Not logger Is Nothing Then logger.logINFO "Not a Match!"
                    End If
                Else
                    fitChache(j).add currentSubpathFit
                End If
                
                Set layerMainShape = Nothing
                Set smalerRedShapeRect = Nothing
                Set currentSubShapeRectA = Nothing
            End If
        Next k

        Set currentSubShapeRectB = Nothing
    Next j
    
    
    ' Wenn 'findBestFit' true ist, dann wurden zuvor alle Boundingboxen von der 'productShapeInfo' mit denen vom Layer verglichen.
    ' Die Ergebnisse sind im 'fitChache'
    If findBestFit Then
        
        If Not logger Is Nothing Then logger.logINFO "Durchsuche fitChache:"
        
        For i = 1 To productShapeInfoB.subShapes.count
            
            Dim bestFitSmallerShapeIndex As Integer
            Dim bestFitSmallerShapeFittment As Double
            bestFitSmallerShapeFittment = -10000000
            
            For j = 1 To productShapeInfoA.subShapes.count
                
                If Not logger Is Nothing Then logger.logINFO "- shapeFound('" & j & "')" & ShapeFound(j)
                
                ' Verhindern, dass eine Boundingbox vom Layer zu mehreren Boundingboxen vom 'productShapeInfo' passt.
                If Not ShapeFound(j) Then
                    If Not logger Is Nothing Then logger.logINFO "- Vergleiche fitChache '" & fitChache(i)(j) & "' mit '" & bestFitSmallerShapeFittment & "'"
                    If fitChache(i)(j) > bestFitSmallerShapeFittment Then
                        
                        bestFitSmallerShapeFittment = fitChache(i)(j)
                        bestFitSmallerShapeIndex = j
                        
                        If Not logger Is Nothing Then logger.logINFO "- Besseren Fit gefunden: bestFitSmallerShapeIndex: '" & bestFitSmallerShapeIndex & "', bestFitSmallerShapeFittment: '" & bestFitSmallerShapeFittment & "'"
                    End If
                End If
            Next j
            
            ' Prüfen, ob eine BoundingBox gepasst hat
            If Not bestFitSmallerShapeIndex = 0 Then
                ' Verhindern, dass eine Boundingbox vom Layer zu mehreren Boundingboxen vom 'productShapeInfo' passt.
                ShapeFound(bestFitSmallerShapeIndex) = True
                foundSubPathsCount = foundSubPathsCount + 1
                subPathsFit = subPathsFit + bestFitSmallerShapeFittment
                If Not logger Is Nothing Then logger.logINFO "- Besten Fit nutzen"
            Else
                If Not logger Is Nothing Then logger.logINFO "- Keinen Fit gefunden"
            End If
            
        Next i
        
    End If
    
    
    If Not logger Is Nothing Then logger.logINFO "productShapeInfoB.subShapes.count: " & productShapeInfoB.subShapes.count & ", productShapeInfoA.subShapes.count: " & productShapeInfoA.subShapes.count
    
    ' Die productShapeInfo hat als 'subShapes' nur die tatsächlichen subPaths nicht aber die (größte) Hauptform
    ' Wenn die Produktinfo keine Unterformen hat und es von den Boundingboxen nur die eine von der Hauptform gibt
    If productShapeInfoB.subShapes.count = 0 And productShapeInfoA.subShapes.count = 0 Then
        
    Else
        If Not foundSubPathsCount = 0 Then
            subPathsFit = subPathsFit / foundSubPathsCount
        End If
        
        If Not logger Is Nothing Then logger.logINFO "subPathsFit: " & subPathsFit & ", foundSubPathsCount: " & foundSubPathsCount
        
        fitPercent = fitPercent * 0.75 + subPathsFit * 0.25
        
    End If
     
    If Not logger Is Nothing Then logger.logINFO "fitPercent @ end: " & fitPercent
    
    If fitPercent >= 100 Then
        areShapeInfosEuqal = True
    End If
        
        

ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
End Function



Public Sub TestGetFitPercentForTollerance()

    MsgBox "getFitPercentForTollerance: " & getFitPercentForTollerance(0.1, 10)

End Sub


' 'lowerDifferenceFitPercent' gibt an, wieviel Prozent eine niedrige Differenz bekommt, wenn sie 0 ist (also genau passt)
Private Function getFitPercentForTollerance(difference As Double, tollerance As Double, Optional lowerDifferenceFitPercent As Double = 0) As Double
    ' Wenn der Flächenunterschied im Tolleranzbereich liegt, gibt es mind. 100% fit. Oder sogar mehr. Bis 110%
    If difference < tollerance Then
        ' 100 == 100 %
        getFitPercentForTollerance = 100 + ((1 - difference / tollerance) * lowerDifferenceFitPercent)
    Else
        getFitPercentForTollerance = 100 - (difference - tollerance)
    End If
End Function



Public Function getAreaToleranceFactor() As Double
    'getAreaToleranceFactor = 0.001
'    getAreaToleranceFactor = 0.0005 ' Version 11.
'    getAreaToleranceFactor = 0.00025 ' Version 13.4.
    'getAreaToleranceFactor = 0.00001 ' Version 16.0.11
    getAreaToleranceFactor = 0.00005 ' Version 19.0.0
End Function

Public Function getSizeToleranceFactor() As Double
    'getSizeToleranceFactor = 0.01
    'getSizeToleranceFactor = 0.005
    'getSizeToleranceFactor = 0.0005 ' Version 16.0.11
    getSizeToleranceFactor = 0.0025 ' Version 19.0.0
End Function


Public Function recognizeProductName(designShape As shape) As String
    
    Dim design As New productDesign
    design.newProductDesign designShape
    
    
    recognizeProductName = recognizeProductLayerName(design.getLayer(1, 1))
End Function




Public Function getProductShapeInfoFromString(shapeName As String) As ProductShapeInfo

    For i = 1 To UBound(productShapesInfo)
        If productShapesInfo(i).name = shapeName Then
            Set getProductShapeInfoFromString = productShapesInfo(i)
            Exit Function
        End If
    Next i

End Function




Public Sub RecognizeProductNameBySelection()

    Globals.checkIfServerOnlineAndSelectOfflineWorkPath
    Globals.checkVersion

    If Not ActiveShape Is Nothing Then
        
        If ActiveShape.Type = cdrGroupShape Then
            
            MsgBox "Es ist " & recognizeProductName(ActiveShape)
        
        Else
            MsgBox "Keine Gruppe ausgewählt!"
        End If
        
        
    End If
End Sub
