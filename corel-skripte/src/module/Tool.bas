Attribute VB_Name = "Tool"


' Autor:  Martin Afelt GRAVURU
'


Enum alignShapesType
    AtoBAlign
    IndividualAlign
    GroupAling
End Enum

Public Enum UploadboxIconType
    ClickHereIconType
    GravuruShopifyIconType
End Enum


Public dialogUploadBoxIsBounded As Boolean

Public dialogClosedStopMacro As Boolean

Private shapeEditedInPS As shape
Private shapeEditedInPSFileDate As Date
Private shapeEditedInPSDocument As document

Private Function getDeinFotoScaling() As Double
     getDeinFotoScaling = 0.65
End Function



Sub createUploadBox()
    Globals.endIfNoDocumentOpen

    
    Globals.checkIfServerOnlineAndSelectOfflineWorkPath
    Globals.checkVersion
    
    Dim allUploadBoxes As Boolean
    If Globals.isCTRLPressed Then
        allUploadBoxes = True
    End If
    
    If Not Globals.debugHistory Then ActiveDocument.BeginCommandGroup "createUploadBox"
    
    
    
    If Not allUploadBoxes Then
        
        Dim shape As shape
        Set shape = ActiveDocument.ActiveShape
        
        If shape Is Nothing Then
            MsgBox "Es ist keine Ebene ausgewählt!", vbCritical
            Globals.endMacro
        End If
        
        createUploadboxOnShape shape
    Else
        
        Dim shapes As shapeRange
        Set shapes = newCustomShapeTypeQuery(Globals.getLayer1ofDoc(ActiveDocument).shapes.All, uploadBox).setContinueSearchInMatchedGroups(False).search
        
        createUploadboxOnShapeRange shapes, True
        
    End If
    
    If Not Globals.debugHistory Then Globals.endMacro

End Sub


Public Function createUploadboxOnShapeRange(range As shapeRange, Optional refreshMode As Boolean = False, Optional iconType As UploadboxIconType = ClickHereIconType)
    Dim i As Integer
    For i = 1 To range.count
        createUploadboxOnShape range(i), refreshMode, iconType
    Next i
End Function


Public Function createUploadboxOnShape(shape As shape, Optional refreshMode As Boolean = False, Optional iconType As UploadboxIconType = ClickHereIconType)
    
    Dim isBoundedUploadbox As Boolean
    Dim uploadBoxOverlayX As Double
    Dim uploadBoxOverlayY As Double
    Dim uploadBoxOverlaySize As Double
    Dim uploadBoxPropertyFound As Boolean
    
    
    
    ' Falls das ausgewählte Shape schon eine Uploadbox ist, wird es zu einer normalen Bitmap zurückgewandelt
    ' Falls ein Zuschnitt vorhanden war, wird dieser auch auf das Bitmap angewendet
    ' ----------------------------------------------------
    If Globals.isUploadBox(shape) Then
        
        AutoCorrection.correctDoubleUploadbox shape
        
        isBoundedUploadbox = Globals.isUploadBox(shape, BoundedUploadBoxType)
        
        Dim deinFotoOverlay As shape
        Set deinFotoOverlay = Globals.getYourPhotoTextGroupOfUploadBoxGroup(shape)
        
        If deinFotoOverlay Is Nothing Then GoTo KeinDeinFotoOverlay
        
        ' Merken, wo das Overlay 'Dein Foto' positioniert war
        uploadBoxOverlayX = deinFotoOverlay.centerX
        uploadBoxOverlayY = deinFotoOverlay.centerY
        uploadBoxOverlaySize = deinFotoOverlay.SizeWidth
        uploadBoxPropertyFound = True
        
        Dim newShape As shape
        Set newShape = Globals.getPhotoOfUploadBoxGroup(shape) ' B
        
        deinFotoOverlay.delete
        
        ' Uploadbox auflösen
        If Globals.isShapePowerclip(shape) Then
            '
            Dim curveOfPowerclip As curve
            Set curveOfPowerclip = shape.curve
            Dim curveShape As shape
            Set curveShape = ActiveLayer.CreateCurve(curveOfPowerclip)
            curveShape.name = "Tool.createUploadboxOnShape.curveShape"
        
            shape.powerClip.ExtractShapes
            
            Set newShape = Globals.intersectShapes(curveShape, newShape)
            
            curveShape.delete
            shape.delete
        Else
            shape.Ungroup
        End If
        
        
        Set deinFotoOverlay = Nothing
        Set shape = newShape
    End If
    ' ----------------------------------------------------
    
    
    
KeinDeinFotoOverlay:
    
    If shape.Type = cdrBitmapShape Or shape.Type = cdrCurveShape Then
    
        dialogClosedStopMacro = True
        
        ' Für die GUI Herausfinden, ob die Uploadbox begrenzt sein soll
        ' -----------------------------------------------------
        If uploadBoxPropertyFound Then 'Falls das ausgewählte Shape vorher eine Uploadbox war
        
            ToolCreateUploadBoxDialog.UploadBoxCutsCheckBox.value = isBoundedUploadbox
        Else
            
            If shape.Type = cdrBitmapShape Then
                If Not shape.bitmap Is Nothing Then
                    isBoundedUploadbox = shape.bitmap.CropEnvelopeModified
                End If
            ElseIf shape.Type = cdrRectangleShape Then
                isBoundedUploadbox = False
            Else
                isBoundedUploadbox = True
            End If
            
        
            ToolCreateUploadBoxDialog.UploadBoxCutsCheckBox.value = isBoundedUploadbox
            
        End If
        ' -----------------------------------------------------
        
        
        If Not refreshMode Then
            ' GUI anzeigen
            ToolCreateUploadBoxDialog.OkayButton.SetFocus
            ToolCreateUploadBoxDialog.Show vbModal
            
            If dialogClosedStopMacro Then
                End
            End If
        Else
            dialogUploadBoxIsBounded = isBoundedUploadbox
        End If
        
        shape.name = "uploadbox"
        
        
        
        Dim deinFotoShape As shape
        Set deinFotoShape = Globals.loadCDR(Globals.getMainFolder & "Tool\Uploadbox Tool\" & getUploadboxIconFileName(iconType) & ".cdr")
        
        deinFotoShape.name = "deinfoto"
        
        deinFotoShape.OrderFrontOf shape
        
        If Not uploadBoxPropertyFound Then
            uploadBoxOverlayX = shape.centerX
            uploadBoxOverlayY = shape.centerY
        End If
        
        
        ' Einpassen
        deinFotoShape.Move -deinFotoShape.centerX + uploadBoxOverlayX, -deinFotoShape.centerY + uploadBoxOverlayY
        
        Dim newW As Double
        Dim newH As Double
        
        If uploadBoxPropertyFound Then
            newW = uploadBoxOverlaySize
            newH = uploadBoxOverlaySize
        Else
            If (shape.SizeWidth / shape.SizeHeight) > (deinFotoShape.SizeWidth / deinFotoShape.SizeHeight) Then
                ' Bild ist breiter als deinFoto
                newH = shape.SizeHeight * getDeinFotoScaling
                newW = newH * (deinFotoShape.SizeWidth / deinFotoShape.SizeHeight)
            Else
                ' Bild ist höher als deinFoto
                newW = shape.SizeWidth * getDeinFotoScaling
                newH = newW * (deinFotoShape.SizeHeight / deinFotoShape.SizeWidth)
            End If
        End If
        
        
        ' Skalieren
        deinFotoShape.SetBoundingBox deinFotoShape.centerX - newW / 2, deinFotoShape.centerY - newH / 2, newW, newH, False, cdrCenter
        
        
        'Gruppieren
        Dim groupRange As New shapeRange
        groupRange.add shape
        groupRange.add deinFotoShape
        
        Dim group As shape
        Set group = groupRange.group
        
        If group Is Nothing Then
            MsgBox "Beim erstellen von Uploadboxen darf nicht das Form-Werkzeug ausgewählt sein! Bitte nochmal ausführen. Danke Corel :)", vbCritical
            Globals.endMacro
        End If
        
        group.name = "uploadbox_" & Globals.castBooleanToString(dialogUploadBoxIsBounded)
        
        If dialogUploadBoxIsBounded Then
            Globals.convertOldBoundedUploadboxToNew group
        End If
        
        
    Else
        
        If Not refreshMode Then MsgBox "Dieser Ebenentyp wird nicht unterstützt!", vbInformation
        
    End If
    
End Function



Private Function getUploadboxIconFileName(iconType As UploadboxIconType) As String
    Dim result As String
    Select Case iconType
        Case UploadboxIconType.ClickHereIconType
            result = "Dein Foto"
        Case UploadboxIconType.GravuruShopifyIconType
            result = "Gravuru Shopify Uploadbox Icon"
    End Select
    
    getUploadboxIconFileName = result
End Function
    




Sub lockShape()
    Globals.endIfNoDocumentOpen
    
    Globals.checkIfServerOnlineAndSelectOfflineWorkPath
    Globals.checkVersion

    Globals.addOrRemoveNameFromSelectedShape getLockedKeyWord
   
End Sub



' Macro mit Button
Sub CreateMotiv()
    Globals.endIfNoDocumentOpen

    Globals.checkIfServerOnlineAndSelectOfflineWorkPath
    Globals.checkVersion
    
    If Not Globals.debugHistory Then ActiveDocument.BeginCommandGroup "createMotiv"
    
    
    If ActiveShape Is Nothing Then
        MsgBox "Keine form Ausgewählt", vbInformation
        Globals.endMacro False
    End If
    
    ' Einstellungen werden angepasst. z.B: der Exportordner
    MotiveDialog.makeVisible
    
    If Not Globals.debugHistory Then Globals.endMacro
End Sub



Public Function startCreatingMotives()

    'Wenn ok im 'MotiveDialog' gedrückt wurde

    Dim selection As shapeRange
    Set selection = ActiveSelectionRange
    
    For i = 1 To selection.count
        createMotiveProcessSelectionShape selection.shapes(i), MotiveDialog.FolderNewMotivesTextBox.value, MotiveDialog.FolderMotivesTextBox.value, MotiveDialog.loadExportedMotiveCheckBox.value
    Next i
End Function



Private Function createMotiveProcessSelectionShape(shape As shape, exportPath As String, mainMotivesFolderPath As String, loadExportedMotive As Boolean)
    
    Dim totalNodeCount As Long
    totalNodeCount = Globals.getShapeCurveNodeCount(shape)
    If totalNodeCount > 5000 Then
        shape.CreateSelection
        setViewAreaToShape shape
        
'        MsgBox "Das Motiv (" & Shape.name & ") enthält zu viele Pfadpunkte (" & totalNodeCount & ") und wird übersprungen."
        '"Das Motiv (" & Shape.name & ") enthält zu viele Pfadpunkte (" & totalNodeCount & ")." & vbNewLine & "Soll das Motiv trotzdem exportiert werden?"
        Dim mbResult As Integer: mbResult = MsgBox("Das Motiv (" & shape.name & ") enthält viele Pfadpunkte (" & totalNodeCount & ")." & vbNewLine & "Soll das Motiv trotzdem exportiert werden?", vbYesNoCancel Or vbQuestion)


        Select Case mbResult
            Case vbYes
            Case vbNo
                Exit Function
            Case vbCancel
                End
        End Select
        
    End If
    
    Dim fileName As String
    fileName = MotiveNameDialog.getFileName(shape, exportPath, mainMotivesFolderPath)
    
    
    
    'TODO
    If Not MotiveNameDialog.okPressed Then
        Exit Function ' Mit nächstem weitermachen
    End If

    If fileName = "" Then
        End
    End If
    
    
    Dim path As String
    path = exportPath & fileName & ".svg"
    
    
    
    Dim docBefore As document
    Set docBefore = ActiveDocument
    
    
    shape.CreateSelection
    Dim shapeToMakeMotiveSelection As shapeRange
    Set shapeToMakeMotiveSelection = ActiveSelectionRange
    
    Dim motiveDoc As document

    Set motiveDoc = shapeToMakeMotiveSelection.CreateDocumentFrom
    ' Wenn hiernach ein Fehler auftritt, dann weil das Ausgangsdokument nicht das Vorderste war
    
    motiveDoc.unit = cdrPixel
    motiveDoc.ConvertToColorContext CreateColorContext2("sRGB IEC61966-2.1,ISO Coated v2 (ECI),Dot Gain 15%", BlendingColorModel:=clrColorModelCMYK)
    motiveDoc.ActivePage.resolution = 300
    motiveDoc.ActivePage.setSize ConvertUnits(200, cdrPixel, motiveDoc.unit), ConvertUnits(200, cdrPixel, motiveDoc.unit)
    motiveDoc.Rulers.HUnits = cdrPixel
    motiveDoc.Rulers.VUnits = cdrPixel
    
    
    
    Dim selection As shapeRange
    Set selection = motiveDoc.ActiveLayer.shapes.All
    
    Dim motivShape As shape
    Set motivShape = selection.firstShape
    
    
    If motivShape.Type = cdrGroupShape Then
        motivShape.Ungroup
        Set selection = ActiveSelectionRange
    End If
    
    
    For i = 1 To selection.count
        If Not selection.shapes(i).outline.Type = cdrNoOutline Then
            selection.shapes(i).outline.ConvertToObject
        End If
        
    Next i
    
    'Alles auswählen
    ActiveLayer.shapes.All.CreateSelection
    Set selection = ActiveSelectionRange
    
    
    'Alle Formen zusammenfügen
    Set motivShape = Globals.weldShapeRange(selection)
    Set selection = ActiveLayer.shapes.range
    
    ' Färben (schwarz)
    motivShape.fill.ApplyUniformFill CreateRGBColor(0, 0, 0)
    
    
    Set motivShape = ActiveShape
    ActiveLayer.shapes.All.CreateSelection
    Set selection = ActiveSelectionRange
    

    
    ' Zentrieren und einpassen
    ' ---------------------------------------------------
    selection.AlignAndDistribute cdrAlignDistributeHAlignCenter, cdrAlignDistributeVAlignCenter, cdrAlignShapesToCenterOfPage, cdrDistributeToSelection, False, cdrTextAlignBoundingBox
    
    Dim newW As Double
    Dim newH As Double

    ActiveDocument.unit = cdrPixel

    If motivShape.SizeWidth > motivShape.SizeHeight Then
        newW = 200
        newH = newW * (motivShape.SizeHeight / motivShape.SizeWidth)
    Else
        newH = 200
        newW = newH * (motivShape.SizeWidth / motivShape.SizeHeight)
    End If

    motivShape.SetBoundingBox motivShape.centerX - newW / 2, motivShape.centerY - newH / 2, newW, newH, False, cdrCenter
    ' ---------------------------------------------------
    
    
    
    
    motivShape.name = fileName & "_motiv"


    ' Als .SVG speichern
    Dim expopt As StructExportOptions
    Set expopt = CreateStructExportOptions
    expopt.useColorProfile = False
    Dim expFlt As ExportFilter
    Set expFlt = motiveDoc.ExportEx(path, cdrSVG, cdrAllPages, expopt)
    With expFlt
        .Version = 1 ' FilterSVGLib.svgVer11
        .Encoding = 0 ' FilterSVGLib.svgUTF8
        .Styling = 0 ' FilterSVGLib.svgInternalStyleSheet
        .EmbedJavaScript = True
        .width = 200#
        .height = 200#
        .Units = 3 ' FilterSVGLib.svgPixels
        .DrawingPrecision = 0 ' FilterSVGLib.svg_1to1
        .FountainSteps = 255
        .TextAsCurves = True
        .EmbedFont = True
        .CharacterSubsetting = 0 ' FilterSVGLib.svgUsedOnly
        .GiveEmbededFontPriority = True
        .BmpExportType = 2 ' FilterSVGLib.svgPng
        .EmbedImages = True
        .UseDecimalPrecision = True
        .finish
    End With

    Set motivShape = Nothing

    ActiveDocument.Close

    docBefore.Activate
    
    
    If loadExportedMotive Then
    
        ' Soeben erstelltes Motiv über den selben Pfad reinladen
        Dim loadedMotive As shape
        Globals.loadSVG (path)
    
        ' Komischerweise wurde beim Laden des Motivs ein neuer Layer eingefügt
        Dim uselessLayer As layer
        Set uselessLayer = ActiveLayer
    
        ' Löschen von SVG-Daten
        uselessLayer.shapes(1).locked = False
        uselessLayer.shapes(1).delete
    
        ' Motiv auswählen
        If uselessLayer.shapes.count > 0 Then
            ' Wenn das Motiv normal reingeladen wurde
            uselessLayer.shapes(1).CreateSelection
        Else
            ' Wenn beim reinladen das Motiv vor der letzten Auswahl platziert wurde.
            ' Wird verursacht durch ThisMacroStorage.CurDoc_ShapeCreate
            
            
            Dim shapesParentShapes As shapes
            Set shapesParentShapes = Globals.getParentShapes(shape)
            
            shapesParentShapes(Globals.getShapeIndexInParentGroup(shape) - 1).CreateSelection
        End If
        Set loadedMotive = ActiveShape
    
        ' Komischerweise wird beim Laden des Motivs nicht der Name des SHapes sondern der Datei genommen
        loadedMotive.name = replace(loadedMotive.name, ".svg", "_motiv")
        loadedMotive.OrderFrontOf shape
    
        uselessLayer.delete
        shape.layer.Activate
    
        loadedMotive.SizeWidth = shape.SizeWidth
        loadedMotive.SizeHeight = shape.SizeHeight
        loadedMotive.centerX = shape.centerX
        loadedMotive.centerY = shape.centerY
        
        ' Reingeladenes Motiv in die Farbe einfärben, die es vorher hatte.
        ' Denn beim exportieren wurde es schwarz gemacht
        
        If Not shape.fill.Type = cdrNoFill Then
            loadedMotive.fill.ApplyUniformFill shape.fill.UniformColor
        ElseIf Not shape.outline.Type = cdrNoOutline Then
            loadedMotive.fill.ApplyUniformFill shape.outline.color
        End If
    
        shape.delete
        
    End If
    
End Function

' TODO verschieben zu dem Modul 'Group'
' TODO umbenennen zu StartCreateGroup
Public Sub createGroup()
    
    Globals.endIfNoDocumentOpen
    
    If Not Globals.debugHistory Then
        CorelScriptTools.BeginWaitCursor
        ActiveDocument.BeginCommandGroup "Gruppe erstellen"
    End If
    
    Dim group As shape
    Set group = createGroupFunction(ActiveSelectionRange)
    
    If Not group Is Nothing Then group.CreateSelection
    
    If Not Globals.debugHistory Then Globals.endMacro True
End Sub


' TODO umbennenen zu createGroup
' Returnt die Gruppe
Public Function createGroupFunction(rangeOrShape As Variant) As shape
    
    Dim range As shapeRange
    Set range = Globals.ensureShapeRange(rangeOrShape)
    
    If range.count = 0 Then Exit Function
    
    range.Unlock
    
    If range.count = 1 Then
        
        Dim dummyRect As shape
        Set dummyRect = ActiveDocument.ActiveLayer.CreateRectangle(0, 0, 10, 10)
        
        dummyRect.OrderFrontOf range.firstShape
        range.add dummyRect
        
        Set createGroupFunction = range.group
        dummyRect.delete
        
        Set dummyRect = Nothing
    Else
        Set createGroupFunction = range.group
    End If
End Function



Public Sub showBleedDialog()
    Globals.endIfNoDocumentOpen
    
    Globals.checkIfServerOnlineAndSelectOfflineWorkPath
    Globals.checkVersion
    
    BleedDialog.Show vbModal
End Sub




Public Function createBleed(bleedInMM As Double, cutDesignOrBleedShape As Boolean, cutGroundPlate As Boolean, cutMotives As Boolean, Optional logger As logger)
    
    If Not Globals.debugHistory Then
        CorelScriptTools.BeginWaitCursor
        ActiveDocument.BeginCommandGroup "createBleed"
    End If
    
    Globals.storeSelection
    
    Dim selection As shapeRange
    Set selection = Globals.getSelectedShapesOrAll
    
    If Not logger Is Nothing Then logger.logINFO "createBleed"
    
    
    For i = 1 To selection.count
        createBleedProcessShape selection(i), bleedInMM, cutDesignOrBleedShape, cutGroundPlate, cutMotives, logger
    Next i
    
    
    Globals.restoreSelection
    If Not Globals.debugHistory Then Globals.endMacro True
    
End Function




Private Function createBleedProcessShape(shape As shape, bleedInMM As Double, cutDesignOrBleedShape As Boolean, Optional cutGroundPlate As Boolean = False, Optional cutMotives As Boolean, Optional logger As logger)
    If shape.Type = cdrGroupShape Then
    
        Dim productDesign As New productDesign
        productDesign.newProductDesign shape
        
        If productDesign.isValidProductDesign Then
            createBleedProcessDesign productDesign, bleedInMM, cutDesignOrBleedShape, cutGroundPlate, cutMotives, logger
        End If
    End If
End Function




Private Function createBleedProcessDesign(design As productDesign, bleedInMM As Double, cutDesignOrBleedShape As Boolean, Optional cutGroundPlate As Boolean = False, Optional cutMotives As Boolean, Optional logger As logger)
    
    For i = 1 To design.getPartsCount
        For j = 1 To design.getPart(i).count
            Dim currentLayer As ProductDesignLayer: Set currentLayer = design.getPart(i).item(j)
            
            createBleedProcessDesignLayer currentLayer, bleedInMM, cutDesignOrBleedShape, cutGroundPlate, cutMotives, , , logger
            
            Set currentLayer = Nothing
        Next j
    Next i
    
End Function



Public Sub TestCreateBleed()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    Dim design As New productDesign
    design.newProductDesign ActiveShape
    
    createBleedForDesignLayer design.getLayer(1, 1), Globals.getDefaultBleedSizeInMM, True
    
End Sub


Public Function createBleedForDesignLayer(layer As ProductDesignLayer, bleedInMM As Double, Optional cutDesignOrBleedShape As Boolean = False, Optional cutGroundPlate As Boolean = False, Optional cutMotives As Boolean = False, Optional preventSameBleedCut As Boolean = True, Optional logger As logger) As shape
    Set createBleedForDesignLayer = createBleedProcessDesignLayer(layer, bleedInMM, cutDesignOrBleedShape, cutGroundPlate, cutMotives, preventSameBleedCut, , logger)
End Function



Private Function createBleedProcessDesignLayer(layer As ProductDesignLayer, bleedInMM As Double, cutDesignOrBleedShape As Boolean, Optional cutGroundPlate As Boolean = False, Optional cutMotives As Boolean = False, _
    Optional preventSameBleedCut As Boolean = True, Optional sameBleedTolleranceInMM As Double = 0.05, Optional logger As logger) As shape
    
'    Set logger = Globals.getLogger(True)
    
    If Not logger Is Nothing Then logger.addTab , "[Tool.createBleedProcessDesignLayer] bleedInMM: " & bleedInMM & ", cutDesignOrBleedShape: " & cutDesignOrBleedShape & ", cutGroundPlate: " & cutGroundPlate & _
        ", cutMotives: " & cutMotives
    
    Dim bleedShape As shape
    Dim bleedShapesSmallerShapes As New collection
    
    If Not layer.getMainShape.DisplayCurve.Closed Then
        If Not logger Is Nothing Then logger.removeTab
        Err.Raise vbObjectError + 513, , "Die Hauptform (rot/pink) muss geschlossen sein! " & vbNewLine & "[Globals.createBleedProcessDesignLayer] "
    End If
    
    
    ' Verhindern, dass die selbe Beschnittzugabe nochmal angewendet wird
    ' (Wenn man das macht, kommt es bei Formen die schon einen Zuschnitt wegen der Beschnittzugabe haben, zu rundungsfehlern und sie sind dann zerstört)
    ' Aber auch nur, wenn das Design zugeschnitten werden soll und nicht einfach nur eine Beschnittzugabeform erstellt werden soll 'cutDesignOrBleedShape'
    If cutDesignOrBleedShape And preventSameBleedCut Then
        If Abs(layer.getBleedSizeInMM - bleedInMM) < sameBleedTolleranceInMM Then
            If Not logger Is Nothing Then logger.logINFO "Eine Beschnittzugabe von '" & bleedInMM & "' mm ist schon vorhanden. Abbruch!"
            GoTo ExitFunction
        End If
    End If
    
    
    
    
    ' Bleed Form erstellen 'bleedShape'
    ' ----------------------------------------------------------------
    If Not logger Is Nothing Then logger.logINFO "Zuschnittsform erstellen 'bleedShape'"
    If bleedInMM > 0 Then ' :::: Bleed ist nicht 0. Pfad muss also erweitert werden
    
        Set bleedShape = Globals.offsetPath(layer.getMainShape, bleedInMM, , cdrContourCornerMiteredBevel)
        ' Es kann vorkommen, dass die Hauptformen gruppiert sind. Dann ist 'bleedShape' in der Gruppe mit den Hauptformen, was zu Fehler führen kann
        ' Deshalb da raus ordern
        bleedShape.OrderFrontOf layer.layerShape.shapes.First
        layer.invalidateAll


    Else ' :::: Bleed ist 0. Pfad muss also nicht erweitert werden sondern kann kopiert werden
            
        
        Set bleedShape = Globals.copyPasteShape(layer.getMainShape, True)
        For i = 1 To layer.getSmalerRedOrPinkShapes.count
            bleedShapesSmallerShapes.add Globals.copyPasteShape(layer.getSmalerRedOrPinkShapes(i), True)
        Next i
    End If
    bleedShape.name = "Beschnittzugabe"
'    Globals.correctWrongSubPathDirectionsOfCurve bleedShape.curve
    
    ' Kleinere rote/pinke Formen durch die Hauptform schneiden
    For i = 1 To bleedShapesSmallerShapes.count
        Set bleedShape = bleedShapesSmallerShapes(i).Trim(bleedShape, False, False)
    Next i
    If Not logger Is Nothing Then logger.logINFO "Zuschnittsform erstellt"
    ' ----------------------------------------------------------------
    
    
    
    
    ' Design zuschneiden
    ' :::::::::::::::::::::::::::::::::::::::::::::
    ' Prüft, ob nur eine Beschnittzugabe-Form erstellt werden soll oder zugeschnitten werden soll?
    If cutDesignOrBleedShape Then
        
        bleedShape.name = "Tool.createBleedProcessDesignLayer_bleedShape_tmp"
        
        Dim mainShapesCombinedCopy As shape
        Set mainShapesCombinedCopy = layer.getMainShapesCombinedCopy
        ' Es kann vorkommen, dass die Hauptformen gruppiert sind. Dann ist 'mainShapesCombinedCopy' in der Gruppe mit den Hauptformen, was zu Fehler führen kann
        ' Deshalb da raus ordern
        mainShapesCombinedCopy.OrderFrontOf layer.layerShape.shapes.First
        
        mainShapesCombinedCopy.name = "Tool.createBleedProcessDesignLayer_mainShapesCombinedCopy_tmp"
        
        If Not mainShapesCombinedCopy.DisplayCurve.Closed Then
            If Not logger Is Nothing Then logger.removeTab
            Err.Raise vbObjectError + 513, , "Die Hauptform (rot/pink) und die Grundplatte müssen geschlossen sein! " & vbNewLine & "[Globals.createBleedProcessDesignLayer] "
        End If
        
        Dim mainShapesCombinedCopyCurve As curve
        Set mainShapesCombinedCopyCurve = Globals.getCurveFromShape(mainShapesCombinedCopy)
        
        ' Formen zum schneiden merken, da bereits fertig geschnittene sonst dazwischen kommen könnten
        Dim shapesToCutSnapShot As shapeRange
        Set shapesToCutSnapShot = layer.layerShape.shapes.All
        
        Dim shapesToCutSnapShotIgnore As New shapeRange
        
        ' Wenn hier was geändert wird, evtl. auch zum ProductDesignLayer hinzufügen (Funktion: getBackgroundShapes)
        Set shapesToCutSnapShot = newCustomShapeTypeQuery(shapesToCutSnapShot, DesignElementShapeType).setContinueSearchInMatchedGroups(False).search
        
        shapesToCutSnapShot.RemoveRange Globals.shapeToShapeRange(mainShapesCombinedCopy)
        shapesToCutSnapShot.RemoveRange Globals.shapeToShapeRange(bleedShape)
        
        ' Abflachen, damit der Inhalt von Gruppen, wie DesignElementVarianten, ebenefalls zugeschnitten werden
'        Set shapesToCutSnapShot = Globals.flattenShapeRange(shapesToCutSnapShot)
        
        shapesToCutSnapShotIgnore.AddRange newCustomShapeTypeQuery(shapesToCutSnapShot, qrCode).search
        If cutGroundPlate Then
            shapesToCutSnapShot.AddRange layer.newCustomShapeTypeQuery(customShapeType.groundPlate).search
        End If
        shapesToCutSnapShotIgnore.AddRange newCustomShapeTypeQuery(shapesToCutSnapShot, FxShapeType).search  ' Effektformen überspringen, da die Kurve noch nicht ermittelt werden kann? (Zumindest laut 'Globals.getCurveFromShape')
        shapesToCutSnapShotIgnore.AddRange newCustomShapeTypeQuery(shapesToCutSnapShot, StaticVariant).search
        
        ' Texte werden erst aus der Range entfernt, nachdem sie abgeflacht wurde. Denn wenn ein Text in einer Gruppe steckt und die Gruppe noch in der Range ist,
        ' hat es keinen Sinn den Text aus der Range zu entfernen, denn die Gruppe ist ja noch in der Range und deshalb würde die Gruppe und somit auch der Text zugeschnitten werden
        shapesToCutSnapShot.RemoveRange newCustomShapeTypeQuery(shapesToCutSnapShot, TextAny).search
        If Not cutMotives Then
            ' Für Motive gilt das selbe wie für Texte (siehe oben ^^)
            shapesToCutSnapShot.RemoveRange newCustomShapeTypeQuery(shapesToCutSnapShot, motive).search
        End If
        
        If Not logger Is Nothing Then logger.logINFO "shapesToCutSnapShot: " & Globals.shapeRangeToString(shapesToCutSnapShot)
        
        
        ' #Skript zur Erweiterung der Beschnittzugabe
        
        
        If Not logger Is Nothing Then logger.logINFO "Formen vergrößern: "
        
        
        ' Kurven und Bitmaps, die ohnehin schon eine Beschnittzugabe haben (über den pinken Rahmen gehen), können einfach auch größere Beschnittzgaben annehmen
        ' ---------------------------------------------------------
        ' Für diesen Abschnitt noch ein Snapshot anlegen
        Dim shapesToCutSnapShot2 As New shapeRange
        shapesToCutSnapShot2.AddRange shapesToCutSnapShot
        
        For i = 1 To shapesToCutSnapShot2.count
            Dim currentShape As shape
            Set currentShape = shapesToCutSnapShot2(i)
            
            If Not logger Is Nothing Then logger.logFINE "currentShape: '" & Globals.getShapeDisplayName(currentShape) & "'"
            
            Dim currentShapeCurve As curve
            If Globals.isVectorShape(currentShape) Then
                ' Wenn das Shape eine 'Rechteck' Kurve hat, lässt sich diese weiter unten
                ' nicht mit 'currentShapeCurve.CopyAssign' verändern -> Fehlermeldung
                Globals.ensureShapeHasCurve currentShape
            End If
            
            Dim isShapeHavingTooManyShapes As Boolean
            isShapeHavingTooManyShapes = False
            If currentShape.Type = cdrGroupShape Then
                If Globals.isGroupHavingToManyShapes(currentShape, 25, Globals.MAXINT) Then
                    isShapeHavingTooManyShapes = True
                End If
            End If
            
            If Not isShapeHavingTooManyShapes Then
                ' Nur wenn die Boundingbox vom 'currentShape' größer oder gleich groß ist wie die Hauptform 'mainShapesCombinedCopy', lohnt es sich eine Kurve von 'currentShape' zu erstellen um sie mit 'mainShapesCombinedCopy' zu vergleichen
                If Globals.areRectanglesEqual(mainShapesCombinedCopy.boundingBox, currentShape.boundingBox, True, 0.1) Or Globals.areRectanglesInside(mainShapesCombinedCopy.boundingBox, currentShape.boundingBox, True) Then
                    Set currentShapeCurve = Globals.getCurveFromShape(currentShape)
                End If
            End If
            
            
            If Not currentShapeCurve Is Nothing Then

                If Not logger Is Nothing Then logger.logFINE "Vergleiche Formen. Form A: '" & Globals.getShapeDisplayName(mainShapesCombinedCopy) & "' Form B: '" & Globals.getShapeDisplayName(currentShape) & "'"
                
                If layer.isShapeLikeMainShapesOrWithBleed(mainShapesCombinedCopy, mainShapesCombinedCopyCurve, currentShape, currentShapeCurve, logger) Then
                    
                    
                    If currentShape.Type = cdrBitmapShape Then
                        currentShape.bitmap.ResetCropEnvelope
                        If Not logger Is Nothing Then logger.logFINE "Zuschnitt der Bitmap von 'currentShape' entfernt"
                    Else

                        ' Neue Curve in Form eines Rechtecks erstellen.
                        ' In der Größe der Boundingbox von der Beschnittzugabe
                        Dim newCurve As New curve
                        newCurve.AppendSubpathRectangle bleedShape.boundingBox.left, bleedShape.boundingBox.top, bleedShape.boundingBox.Right, bleedShape.boundingBox.Bottom
                        
                        currentShapeCurve.CopyAssign newCurve ' Die Rechteckige neue Kurve als die Kurve für die aktuelle Form setzen
                        
                        If Not logger Is Nothing Then logger.logFINE "Kurve von 'currentShape' ist jetzt so wie die Boundingbox der Hauptform"

                        Set newCurve = Nothing
                    End If


                Else
                    If Not logger Is Nothing Then logger.logFINE "currentShape hat keine Beschnittzugabe und hat auch nicht die selbe Form wie die Hauptformen, weshalb keine Beschnittzugabe erstellt werden kann"
                End If
            Else
                If Not logger Is Nothing Then logger.logFINE "currentShape hat keine Kurve, kann also nicht vergrößert werden"
            End If
            
            Set currentShape = Nothing
            Set currentShapeCurve = Nothing
        Next i
        ' ---------------------------------------------------------
        
        Set mainShapesCombinedCopyCurve = Nothing
        mainShapesCombinedCopy.delete
        
        
'        If Not logger Is Nothing Then logger.logINFO "shapesToCutSnapShot: " & Globals.getShapeRangeDisplayNames(shapesToCutSnapShot)
'        If Not logger Is Nothing And Not Globals.isShapeRangeShapesReferenceValid(shapesToCutSnapShot) Then logger.logWARN "shapesToCutSnapShot hat ungültige Formen"
        
'        On Error GoTo IntersectError
        Globals.intersectShapeWithShapeRange bleedShape, shapesToCutSnapShot, , False, , shapesToCutSnapShotIgnore
'        On Error GoTo 0
        
        bleedShape.delete
    Else
        ' Es soll nur die Zuschnittsform erstellt werden. Design wird nicht zugeschnitten
        bleedShape.outline.color = CreateColor("#0000FF")
        bleedShape.fill.ApplyNoFill
        Set createBleedProcessDesignLayer = bleedShape
    End If
    
    
ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
    
    Exit Function
IntersectError:
    Err.Raise vbObjectError + 513, , "[Tool.createBleedProcessDesignLayer] Fehler beim erstellen einer Beschnittzugabe (Es kann sein, dass 2 identische rote/pinke Formen vorhanden sind, dass es Gruppen gibt mit nur einer Form darin oder eine Gruppe hat eine fehlerhafte Transparenz -> Entgruppieren -> Gruppieren -> Transparenz hinzufügen) : " & vbNewLine & Err.Description
End Function





Sub createDuplicate()

    Globals.checkIfServerOnlineAndSelectOfflineWorkPath
    Globals.checkVersion
    
    Dim shape As shape
    Set shape = ActiveDocument.ActiveShape
    
    If shape Is Nothing Then
        'MsgBox "Es ist keine Ebene ausgewählt!"
        End
    Else
        Dim copy As shape
        Set copy = Globals.copyPasteShape(shape, True)
        copy.name = shape.name
        copy.CreateSelection
    End If
End Sub



Sub AreaOfShape()

    If Not ActiveShape Is Nothing Then
        If ActiveShape.Type = cdrGroupShape Then
            Dim redShapes As collection
            Set redShapes = newCustomShapeTypeQuery(ActiveShape, RedOrPinkShape).search
            Dim mainShape As shape
            Set mainShape = Globals.getBiggestShape(redShapes)
            
            If Not mainShape Is Nothing Then
                
                Dim index As Integer
                index = Globals.getCollectionValueIndex(redShapes, mainShape)
                
                redShapes.Remove index
                
                Dim area As Double
                area = Globals.getAreaOfShape(mainShape)
                
                
                
                For i = 1 To redShapes.count
                    area = area + Globals.getAreaOfShape(redShapes(i))
                Next i
                
                MsgBox "Area=" & area
            End If
            
        Else
            MsgBox "Area=" & Globals.getAreaOfShape(ActiveShape)
        End If
        
        
    End If

End Sub


Sub MakeColorable()
    Globals.markSelectedShapes Globals.getColorableKeyWord
End Sub

Public Sub MakeOnlyForProductPicture()
    Globals.markSelectedShapes Globals.getForProductPictureKeyWord
End Sub


Public Sub LockText()
    Globals.endIfNoDocumentOpen

    Globals.checkIfServerOnlineAndSelectOfflineWorkPath
    Globals.checkVersion
    
    Globals.markSelectedShapes Globals.getTextLockedKeyWord
End Sub


' Outdated
Public Sub MarkTransparency()
    Globals.scriptIconsOutdatedWarning
End Sub


Public Sub MarkShapeAsBitmapInFancy()
    ' Skript ist umgezogen
    Globals.scriptIconsOutdatedWarning
End Sub


Public Sub MarkShapeAsAmazonCustomerTextInBlanks()
    Globals.markSelectedShapes Globals.getAmazonCustomerTextInBlanksKeyWord
End Sub

Public Sub MarkShapeAsIgnoreAmazonCustomerColor()
    Globals.markSelectedShapes Globals.getIgnoreAmazonCustomerColorKeyWord
End Sub

Public Sub MarkShapeAsAmazonMultiLineTextBox()
    Globals.markSelectedShapes Globals.getAmazonMultiLineTextBoxKeyWord
End Sub



' Temporäres Script für Rick
' Später sollte ein größeres daraus gemacht werden, welches Hauptformen tauschen kann
' Jetzt kann entweder das Tauschen mit dem PlaceFile und einer CDR gemacht werden
' Oder mit dem Script ResizeDesign
Public Sub RundeHauptformenAufCM()
    Globals.endIfNoDocumentOpen

    
    ProgressBarUserForm.Start
    
    
    Dim selection As shapeRange
    Set selection = ActiveSelectionRange
    
    ActiveDocument.unit = cdrCentimeter
    
    If Not selection Is Nothing And Not selection.count = 0 Then
        For i = 1 To selection.count
            RundeHauptformenAufCMProcessShape selection(i)
            ProgressBarUserForm.setProgress i / CDbl(selection.count)
        Next i
    Else
        For i = 1 To ActiveDocument.Pages.count

            For j = 1 To ActiveDocument.Pages(i).shapes.count
                 RundeHauptformenAufCMProcessShape ActiveDocument.Pages(i).shapes(j)
                 
                 ProgressBarUserForm.setProgress j / CDbl(ActiveDocument.Pages(i).shapes.count)
            Next j

        Next i
    End If
    
    ProgressBarUserForm.Hide
    
End Sub


Private Function RundeHauptformenAufCMProcessShape(shape As shape)
    If shape.Type = cdrGroupShape Then
        Dim currentProductDesign As productDesign
        Set currentProductDesign = New productDesign
        currentProductDesign.newProductDesign shape

        If currentProductDesign.isValidProductDesign Then
            RundeHauptformenAufCMProcessDesign currentProductDesign
        End If
    End If
End Function


Private Function RundeHauptformenAufCMProcessDesign(design As productDesign)
    
    For i = 1 To design.getPartsCount
        For j = 1 To design.getPart(i).count
            Dim currentLayer As ProductDesignLayer
            Set currentLayer = design.getPart(i)(j)
            
            Dim mainShape As shape: Set mainShape = currentLayer.getMainShape
            
            If Not ActiveDocument.FromUnits(mainShape.SizeWidth, cdrCentimeter) = Math.round(ActiveDocument.FromUnits(mainShape.SizeWidth, cdrCentimeter), 0) Or _
               Not ActiveDocument.FromUnits(mainShape.SizeHeight, cdrCentimeter) = Math.round(ActiveDocument.FromUnits(mainShape.SizeHeight, cdrCentimeter), 0) Then
                
                
                
                Dim w As Integer
                w = ActiveDocument.ToUnits(Math.round(ActiveDocument.FromUnits(mainShape.SizeWidth, cdrCentimeter), 0), cdrCentimeter)
                Dim h As Integer
                h = ActiveDocument.ToUnits(Math.round(ActiveDocument.FromUnits(mainShape.SizeHeight, cdrCentimeter), 0), cdrCentimeter)
                
                'MsgBox "Round " & CStr(ActiveDocument.FromUnits(mainShape.SizeWidth, cdrCentimeter)) & ", to " & (Math.Round(ActiveDocument.FromUnits(mainShape.SizeWidth, cdrCentimeter), 0)) & " newW=" & w & ", newH=" & h
                
                mainShape.SetBoundingBox mainShape.centerX - w / 2#, mainShape.centerY - h / 2#, _
                w, _
                h, False, cdrCenter
                
                
                
            End If
            
            
            
            'Nur überschneidende Bereiche von dem Mainshape und allen anderen erlauben
            For k = 1 To currentLayer.layerShape.shapes.count
                If Not Globals.isRedOrPinkShape(currentLayer.layerShape.shapes(k)) _
                And Not currentLayer.layerShape.shapes(k).Type = cdrTextShape _
                And Not Globals.isMotive(currentLayer.layerShape.shapes(k)) Then
                    'ProductDesignLayer.getMainShape.Intersect ProductDesignLayer.layerShape.shapes(i), True, False
                    Globals.intersectShapes currentLayer.getMainShape, currentLayer.layerShape.shapes(k), True, False
                End If
            Next k
            
            
            Set currentLayer = Nothing
            Set mainShape = Nothing
        Next j
    Next i
    
End Function


Public Sub AmazonExcelChecker()
        
    Dim csvData() As String
    On Error GoTo CSVNotFound
    csvData = AmazonImport.loadAmazonASINToDesignCDRExcel ' ALT: Globals.loadCSVToStringArray(Globals.getAmazonExcelPath)
'    csvData = Globals.loadCSVToStringArray(Globals.getDesktopPath & "\Amazon-Import ASIN zu Design-CDR.csv")  ' DEBUG
    On Error GoTo 0
    
    ' Spaltenindexe über die Kopfzeile finden, damit neue Spalten die Prüfung nicht verschieben
    Dim csvASINIndex As Integer
    csvASINIndex = AmazonImport.getElementIndexInASINToDesignCDRExcel("ASIN", csvData)
    Dim csvPathIndex As Integer
    csvPathIndex = AmazonImport.getElementIndexInASINToDesignCDRExcel("Dateipfad", csvData)
    
    
    ProgressBarUserForm.Start
    
    For i = 1 To UBound(csvData)
        
        
        ' Wenn es in der aktuellen Zeile eine ASIN und einen Pfad gibt
        If Not csvData(i, csvASINIndex) = "" And Not csvData(i, csvPathIndex) = "" Then
            Dim currentPath As String
            currentPath = csvData(i, csvPathIndex)
            
            ' Pfade mit %Platzhalter% =================================================================
            If InStr(currentPath, "%") Then
            
            
                ' NEU Nur prüfen ob der Pfad vor dem ersten Platzhalter exestiert
                ' Erstmal prüfen ob der Pfad vor dem ersten Platzhalter exestiert
                ' -----------------------------------------
                Dim pathBeforeFirstPlaceholder As String
                pathBeforeFirstPlaceholder = Mid(currentPath, 1, InStr(currentPath, "%") - 1)
                
                Dim folderPathBeforeFirstPlaceholder As String
                folderPathBeforeFirstPlaceholder = Mid(pathBeforeFirstPlaceholder, 1, InStrRev(pathBeforeFirstPlaceholder, "\") - 1)
                
'                Debug.Print "folderPathBeforeFirstPlaceholder: " & folderPathBeforeFirstPlaceholder
                
                If Not Globals.folderExists(folderPathBeforeFirstPlaceholder) Then
                    amazonExcelCheckerPathError i, "Der Pfad exestiert nicht: " & folderPathBeforeFirstPlaceholder & vbNewLine & csvData(i, csvPathIndex) & vbNewLine & "ASIN: " & csvData(i, csvASINIndex)
                    ' User will weitersuchen, aber dieser Pfad ist ungültig, deshalb nicht weiterversuchen mit diesem Pfad
                    GoTo SkipPlaceholderPath
                End If
                ' -----------------------------------------
            
            
                ' DEAKTIVIERT weil die rekursive Ordnersuche sehr lange dauert
                
'                ' Aus allen %Platzhaltern% ein ".*" machen
'                ' Für den regulären Ausdruck (regex) bedeutet das, dass an der Stelle alles mögliche vorkommen kann
'                ' ZB: Wenn der String folgender ist: "Hallo%Platzhalter% wie gehts" dann ist der regex: "Hallo.* wie gehts" und fängt u.a folgende Fälle ab:
'                ' "Hallo du, wie gehts"
'                ' "Hallo alter. Wollte nur fragen wie gehts"
'                ' -------------------------------------
'                Dim regexPattern As String
'                Do While InStr(regexPattern, "%")
'
'                    Dim firstPercentIndex As Integer
'                    firstPercentIndex = InStr(regexPattern, "%")
'
'                    Dim textAfterFirstPercent As String
'                    textAfterFirstPercent = Mid(regexPattern, firstPercentIndex, Len(regexPattern) - firstPercentIndex)
'
'                    Dim secondPercentIndex As Integer
'                    secondPercentIndex = InStr(textAfterFirstPercent, "%")
'
'                    If secondPercentIndex = 0 Then
'                        Exit Do
'                    End If
'
'                    Dim placeHolder As String
'                    placeHolder = left(textAfterFirstPercent, secondPercentIndex)
'
'                    regexPattern = replace(regexPattern, placeHolder, ".*")
'                Loop
'                ' -------------------------------------
'
'
'
'
'                Dim regexx As New RegExp
'                regexx.Global = False
'                regexx.Pattern = regexPattern
'
'                Dim foldersToCheck As collection
'                Set foldersToCheck = Globals.getFoldersInFolder(pathBeforeFirstPlaceholder, True, True)
'
'                Dim regexFound As Boolean
'
'                For f = 1 To foldersToCheck.count
'                    Dim regexResult As Object
'                    regexResult = regexx.Execute(foldersToCheck(f))
'
'                    Dim message As String
'                    message = "TypeName: " & TypeName(regexResult) & vbNewLine
'                    message = message & "Path: " & foldersToCheck(f)
'
'                    MsgBox message
'
'
'                Next f
'
'                If Not regexFound Then
'                    amazonExcelCheckerPathError i, "Es wurde kein Pfad mit Platzhelter für folgenden Pfad gefunden: " & vbNewLine & currentPath
'                End If
                
SkipPlaceholderPath:

            Else
                ' Simple Pfade ohne %Platzhalter% =================================================================
                
                If Not Globals.folderExists(currentPath) Then
            
                    amazonExcelCheckerPathError i, "Der Pfad exestiert nicht: " & vbNewLine & csvData(i, csvPathIndex) & vbNewLine & "ASIN: " & csvData(i, csvASINIndex)
'                    Dim answer As Integer
'                    answer = MsgBox("Zeile: " & (i + 1) & ". Der Pfad exestiert nicht: " & vbNewLine & csvData(i, csvPathIndex) & vbNewLine & vbNewLine & "Weitersuchen?", vbOKCancel)
'
'                    If answer = vbCancel Then
'                        End
'                    End If
                End If
            End If
        End If
        
        
        ProgressBarUserForm.setProgress i / CDbl(UBound(csvData))
    Next i
    
    ProgressBarUserForm.Hide
    
    MsgBox "Fertig", vbInformation
    
    Exit Sub
CSVNotFound:
    MsgBox "Die Excel-Datei wurde nicht gefunden. Fehler:" & Err.Description, vbCritical
End Sub


Private Function amazonExcelCheckerPathError(ByVal csvLineNr As Integer, errorMessage As String)
    
    Dim answer As Integer
    answer = MsgBox("Zeile: " & (csvLineNr + 1) & "." & errorMessage & vbNewLine & vbNewLine & "Weitersuchen?", vbOKCancel Or vbQuestion)
    
    If answer = vbCancel Then
        End
    End If
    
End Function





Public Sub ShowGlobalSettings()
    GlobalSettingsUserForm.init
    GlobalSettingsUserForm.Show vbModal
End Sub




Sub correctWrongSubPathDirections()
    If Not ActiveShape Is Nothing Then
        
        If ActiveShape.Type = cdrCurveShape Then
        
            Globals.startMacro
            
            If Not Globals.debugHistory Then
                CorelScriptTools.BeginWaitCursor
                ActiveDocument.BeginCommandGroup "CorrectWrongSubPathDirections"
            End If
            
            Globals.correctWrongSubPathDirections ActiveShape
            
            Globals.endMacro
        Else
            MsgBox "Form muss eine Kurve sein!", vbInformation
        End If
        
    Else
        MsgBox "Keine Form ausgewählt", vbInformation
    End If
End Sub


Sub TestCurveChangeDirection()
    ' Recorded 20.10.2022
    Dim OrigSelection As shapeRange
    Set OrigSelection = ActiveSelectionRange
    Dim crv As curve
    Set crv = ActiveDocument.CreateCurve
    With crv.CreateSubPath(12.978217, 30.570843)
        .AppendLineSegment 22.417449, 30.570843
        .AppendLineSegment 22.417449, 21.394622
        .AppendLineSegment 12.978217, 21.394622
        .AppendCurveSegment2 12.978217, 30.570843, 12.978217, 24.453362, 12.978217, 27.512102
        .Closed = True
    End With
    OrigSelection(1).curve.CopyAssign crv
    Set crv = ActiveDocument.CreateCurve
    With crv.CreateSubPath(12.978217, 30.570843)
        .AppendLineSegment 22.417449, 30.570843
        .AppendLineSegment 22.417449, 21.394622
        .AppendLineSegment 12.978217, 21.394622
        .AppendCurveSegment2 12.978217, 30.570843, 12.978217, 24.453362, 12.978217, 27.512102
        .Closed = True
    End With
    OrigSelection(1).curve.CopyAssign crv
    Set crv = ActiveDocument.CreateCurve
    With crv.CreateSubPath(12.978217, 30.570843)
        .AppendLineSegment 22.417449, 30.570843
        .AppendLineSegment 22.417449, 21.394622
        .AppendLineSegment 12.978217, 21.394622
        .AppendCurveSegment2 12.978217, 30.570843, 12.978217, 24.453362, 4.532587, 27.278315
        .Closed = True
    End With
    OrigSelection(1).curve.CopyAssign crv
End Sub




Sub SpotFarbenKonvertieren()
    
    Globals.endIfNoDocumentOpen
    
    Dim shapesToProcess As shapeRange
    Set shapesToProcess = Globals.getSelectedShapesOrAll
    Set shapesToProcess = Globals.flattenShapeRange(shapesToProcess)
    
    Globals.startMacro
    ProgressBarUserForm.Start
    
    For i = 1 To shapesToProcess.count
        Dim currentShape As shape
        Set currentShape = shapesToProcess(i)
        
        If currentShape.CanHaveFill Then
            If currentShape.fill.Type = cdrUniformFill Then
                
                ' Weiße Hinterlegung ausschließen
                If Globals.isRDGWhite(currentShape.fill.UniformColor) Then
                    convertColorToCMYKIfSpot currentShape.fill.UniformColor
                End If
            End If
        End If
        
        If currentShape.CanHaveOutline Then
            If currentShape.outline.Type = cdrOutline Then
                
                ' Pink ausschließen
                If Not Globals.isColorRedOrPink(currentShape.outline.color) And Not Globals.isRDGWhite(currentShape.outline.color) Then
                    convertColorToCMYKIfSpot currentShape.outline.color
                End If
            End If
        End If
        
        Set currentShape = Nothing
        ProgressBarUserForm.setProgress i / CDbl(shapesToProcess.count)
    Next i
    
    ProgressBarUserForm.Hide
    
    Globals.endMacro
End Sub



Private Function convertColorToCMYKIfSpot(color As color)
    If color.IsSpot Then
        color.ConvertToCMYK
    End If
End Function









' Anonrdnen / Zentrieren
' //////////////////////////////////////////////////////////////


' HORIZONTAL ZENTRIEREN
Public Sub CenterShapeAToBHorizontal()
    startAlignMacro "CenterShapeAToBHorizontal", cdrAlignHCenter, AtoBAlign
End Sub

Public Sub CenterSelectedShapesHorizontal()
    startAlignMacro "CenterSelectedShapesHorizontal", cdrAlignHCenter, IndividualAlign
End Sub

Public Sub CenterSelectedShapesTogetherHorizontal()
    If Globals.isUserEditingText Then
        ' Der Nutzer bearbeitet gerade einen Text. Es kann also sein, dass er das Zeichen '|' gerade eintippt und nicht diese Aktion starten will
        Exit Sub
    End If
    
    startAlignMacro "CenterSelectedShapesTogetherHorizontal", cdrAlignHCenter, GroupAling
End Sub


' VERTIKAL ZENTRIEREN
Public Sub CenterShapeAToBVertical()
    startAlignMacro "CenterShapeAToBVertical", cdrAlignVCenter, AtoBAlign
End Sub

Public Sub CenterSelectedShapesVertical()
    startAlignMacro "CenterSelectedShapesVertical", cdrAlignVCenter, IndividualAlign
End Sub

Public Sub CenterSelectedShapesTogetherVertical()
    startAlignMacro "CenterSelectedShapesTogetherVertical", cdrAlignVCenter, GroupAling
End Sub


' LINKS
Public Sub MoveShapeAToLeftOfB()
    startAlignMacro "MoveShapeAToLeftOfB", cdrAlignLeft, AtoBAlign
End Sub

Public Sub MoveSelectedShapesToLeft()
    startAlignMacro "MoveSelectedShapesToLeft", cdrAlignLeft, IndividualAlign
End Sub

Public Sub MoveSelectedShapesTogetherToLeft()
    startAlignMacro "MoveSelectedShapesTogetherToLeft", cdrAlignLeft, GroupAling
End Sub


' RECHTS
Public Sub MoveShapeAToRightOfB()
    startAlignMacro "MoveShapeAToRightOfB", cdrAlignRight, AtoBAlign
End Sub

Public Sub MoveSelectedShapesToRight()
    startAlignMacro "MoveSelectedShapesToRight", cdrAlignRight, IndividualAlign
End Sub

Public Sub MoveSelectedShapesTogetherToRight()
    startAlignMacro "MoveSelectedShapesTogetherToRight", cdrAlignRight, GroupAling
End Sub


' OBEN
Public Sub MoveShapeAToTopOfB()
    startAlignMacro "MoveShapeAToTopOfB", cdrAlignTop, AtoBAlign
End Sub

Public Sub MoveSelectedShapesToTop()
    startAlignMacro "MoveSelectedShapesToTop", cdrAlignTop, IndividualAlign
End Sub

Public Sub MoveSelectedShapesTogetherToTop()
    startAlignMacro "MoveSelectedShapesTogetherToTop", cdrAlignTop, GroupAling
End Sub



' UNTEN
Public Sub MoveShapeAToBottomOfB()
    startAlignMacro "MoveShapeAToBottomOfB", cdrAlignBottom, AtoBAlign
End Sub

Public Sub MoveSelectedShapesToBottom()
    startAlignMacro "MoveSelectedShapesToBottom", cdrAlignBottom, IndividualAlign
End Sub

Public Sub MoveSelectedShapesTogetherToBottom()
    startAlignMacro "MoveSelectedShapesTogetherToBottom", cdrAlignBottom, GroupAling
End Sub




Private Function startAlignMacro(macroName As String, align As cdrAlignType, alignShapesType As alignShapesType)
    Globals.endIfNoDocumentOpen
    Globals.endIfNoActiveShape
    Globals.startMacro
    If Not Globals.debugHistory Then
        CorelScriptTools.BeginWaitCursor
        ActiveDocument.BeginCommandGroup macroName
    End If
    
    alignSelectedShapes align, alignShapesType
    
    Globals.endMacro
End Function



Private Function alignSelectedShapes(ByVal align As cdrAlignType, alignShapesType As alignShapesType)
    Dim range As shapeRange
    Set range = ActiveSelectionRange
    
    If range.count = 0 Then Exit Function
    
    Globals.storeSelection
    
    
    ' Form A an B ausrichten
    ' ::::::::::::::::::::::::::::
    If alignShapesType = AtoBAlign Then
    
        If range.count = 1 Then
            alignShape range, align
        Else
            ' Alle Formen an die erste Form ausrichten
            Dim firstShape As shape
            Set firstShape = range.firstShape
            Dim firstShapeAsRange As shapeRange
            Set firstShapeAsRange = Globals.shapeToShapeRange(firstShape)
            range.RemoveRange firstShapeAsRange
            alignShapeOrRangeToShape range, firstShape, align
        End If
    
    
    ' Formen zusammen ausrichten
    ' ::::::::::::::::::::::::::::
    ElseIf alignShapesType = GroupAling Then
    
        Dim selection As shapeRange
        Set selection = ActiveSelectionRange
        alignShape selection, align
        
        ' Am Ende wieder auswählen, da einzelne Formen ausgewählt wurden zum Positionieren
        selection.CreateSelection
    
    
    ' Jede Form einzeln ausrichten
    ' ::::::::::::::::::::::::::::
    ElseIf alignShapesType = IndividualAlign Then
    
         For i = 1 To ActiveSelectionRange.count
            alignShape ActiveSelectionRange(i), align
        Next i
    End If
        
    
    Globals.restoreSelection
End Function



Private Function alignShape(ByVal shapeOrRange As Variant, ByVal align As cdrAlignType)
    
    Dim range As shapeRange
    Set range = Globals.ensureShapeRange(shapeOrRange)
    
    
    Dim parent As shape
    Set parent = Globals.getParent(range.firstShape)
    
    Dim aligned As Boolean
    
    ' An das Powerclip ausrichten
    ' ::::::::::::::::::::
    If Not parent Is Nothing Then
        
        If Globals.isShapePowerclip(parent) Then
            alignShapeOrRangeToShape shapeOrRange, parent, align
            aligned = True
        End If
    End If
    
    
    ' Im Design (Layer) ausrichten
    ' ::::::::::::::::::::
    If Not aligned Then
        Dim lastParent As shape
        Set lastParent = Globals.getLastParent(range.firstShape)
        
        If Not lastParent Is Nothing Then
        
            Dim design As New productDesign
            design.newProductDesign lastParent
            If design.isValidProductDesign Then
                For j = 1 To design.getLayers.count
                    
                    ' Wenn das 'currentShape' irgendwo in dem aktuellen Design-Layer ist
                    If Globals.isShapeGroupOneOfShapesParents(design.getLayers.getLayer(j).layerShape, range.firstShape) Then
                        alignShapeOrRangeToShape shapeOrRange, design.getLayers.getLayer(j).getMainShape, align
                        aligned = True
                        Exit For
                    End If
                Next j
            End If
            
        End If
    End If
    
    ' Auf Seite ausrichten
    ' ::::::::::::::::::::
    If Not aligned Then
        alignShapeOrRangeToDocument shapeOrRange, align
    End If
End Function



Private Function alignShapeOrRangeToDocument(shapeOrRange As Variant, ByVal align As cdrAlignType)
    
    Dim x As Double
    Dim y As Double
    
    Select Case align
        Case cdrAlignType.cdrAlignLeft
            x = ActiveDocument.MasterPage.LeftX
        
        Case cdrAlignType.cdrAlignRight
            x = ActiveDocument.MasterPage.RightX
        
        Case cdrAlignType.cdrAlignHCenter
            x = ActiveDocument.MasterPage.centerX
        
        Case cdrAlignType.cdrAlignBottom
            y = ActiveDocument.MasterPage.BottomY
            
        Case cdrAlignType.cdrAlignTop
            y = ActiveDocument.MasterPage.TopY
        
        Case cdrAlignType.cdrAlignVCenter
            y = ActiveDocument.MasterPage.centerY
    End Select
    
    alignShapeOrRangeToPoint shapeOrRange, x, y, align
End Function



Private Function alignShapeOrRangeToShape(shapeOrRange As Variant, toShape As shape, ByVal align As cdrAlignType)
    Dim pointX As Double
    If align = cdrAlignLeft Then
        pointX = toShape.LeftX
    ElseIf align = cdrAlignHCenter Then
        pointX = toShape.centerX
    ElseIf align = cdrAlignRight Then
        pointX = toShape.RightX
    End If
    
    Dim pointY As Double
    If align = cdrAlignTop Then
        pointY = toShape.TopY
    ElseIf align = cdrAlignVCenter Then
        pointY = toShape.centerY
    ElseIf align = cdrAlignBottom Then
        pointY = toShape.BottomY
    End If
    
    If TypeOf shapeOrRange Is shape Then
        Dim theShape As shape
        Set theShape = shapeOrRange
        alignShapeOrRangeToPoint theShape, pointX, pointY, align
    Else
        Dim range As shapeRange
        Set range = shapeOrRange
        
        ' Snapshot, da sich die Werte ändern, sobald eines der Shapes aus der Range verschoben wird
        Dim rangeCenterX As Double
        rangeCenterX = range.centerX
        Dim rangeCenterY As Double
        rangeCenterY = range.centerY
        
        For i = 1 To range.count
            
            ' WICHTIG: Form muss vorher als einzige ausgewählt sein
            range(i).CreateSelection
            
            alignShapeOrRangeToPoint range(i), pointX + (range(i).centerX - rangeCenterX), pointY + (range(i).centerY - rangeCenterY), align
        Next i
        
    End If
End Function


Private Function alignShapeOrRangeToPoint(shapeOrRange As Variant, ByVal pointX As Double, ByVal pointY As Double, ByVal align As cdrAlignType)
    Dim range As shapeRange
    Set range = Globals.ensureShapeRange(shapeOrRange)
    
    range.AlignRangeToPoint align, pointX, pointY
End Function

' //////////////////////////////////////////////////////////////










Public Sub EditBitmapInPhotoShop()
    
    Globals.endIfNoDocumentOpen
    
    If Not ActiveShape Is Nothing Then
        
        If Not ActiveShape.Type = cdrBitmapShape Then
            MsgBox "Die ausgewählte Form ist keine Bitmap!", vbInformation
            End
        End If
        
        
        If Not Globals.debugErrors Then On Error GoTo MacroError
        
        ProgressBarUserForm.Start
        Dim progressSteps As Integer: progressSteps = 5
        
        
        Dim originalShape As shape
        Set originalShape = ActiveShape
        
        ' Shape kopieren und Transformation zurücksetzen
        ' ::::::::::::::::
        Dim shape As shape
        Set shape = Globals.copyPasteShape(originalShape, False)
        
        shape.OrderFrontOf ActiveLayer.shapes.All.firstShape
        
        ProgressBarUserForm.setProgress 1 / progressSteps
        
        shape.bitmap.ResetCropEnvelope ' Bitmapzuschnitt rückgängig machen
        ProgressBarUserForm.setProgress 2 / progressSteps
        shape.ClearTransformations ' Transformationen zurücksetzen
        ProgressBarUserForm.setProgress 3 / progressSteps
        
        
        ' Shape exportieren
        ' :::::::::::::::::
        Dim path As String
        path = Globals.getDesktopPath & "Bitmap aus CorelDraw.png"
        
        path = Globals.getNextFreeFileName(path, False)
        
        
        If Not newShapeExport(shape, path, cdrPNG) _
            .setResolutionX(shape.bitmap.resolutionX) _
            .setResolutionY(shape.bitmap.resolutionY) _
            .setColorizeRDGWhiteToRGB(False) _
            .setColorizeCMYKBlackToRGB(False) _
            .export.fileExportedSucessfully Then
            
            MsgBox "Bitmap konnte nicht gespeichert werden!", vbCritical
            Globals.endMacro
        End If
        path = path & ".png" ' Muss hier stehen
        ProgressBarUserForm.setProgress 4 / progressSteps
        
        
        Dim ps As Photoshop.Application
        Set ps = Globals.startPhotoshop
        
        If Not ps Is Nothing Then
            ps.Open path
            ProgressBarUserForm.setProgress 5 / progressSteps
            
'            ps.ExecuteAction ps.StringIDToTypeID("Vsbl")
            
            ps.visible = False
            ps.visible = True
            
            Set shapeEditedInPS = originalShape
            Set shapeEditedInPSDocument = ActiveDocument
            shapeEditedInPSFileDate = Globals.getFileDateLastModified(path)
        End If
        
        shape.delete
        
        ' Am Ende wieder die Form auswählen, die Exportiert wurde, denn diese soll ja nach dem Importieren aus PS ersetzt werden
        originalShape.CreateSelection
        
        ProgressBarUserForm.Hide
    Else
        MsgBox "Es wurde keine Form ausgewählt!", vbInformation
    End If
    
    Exit Sub
MacroError:
    MsgBox Err.Description & ", " & Err.number, vbCritical
    ProgressBarUserForm.Hide
End Sub


Public Sub ReplaceBitmap()
    
    Globals.endIfNoDocumentOpen
    
    Globals.startMacro
    
    If Not Globals.debugHistory Then
        CorelScriptTools.BeginWaitCursor
        ActiveDocument.BeginCommandGroup "LoadBitmapEditedInPS"
        If Not Globals.debugErrors Then On Error GoTo MacroError
    End If
    
    If ActiveShape Is Nothing Then
        MsgBox "Keine Form ausgewählt!", vbInformation
        Globals.endMacro
    End If
    
    If Not ActiveShape.Type = cdrBitmapShape Then
        MsgBox "Keine Bitmap ausgewählt!", vbInformation
        Globals.endMacro
    End If

    Dim selectedFilepath As String
    selectedFilepath = CorelScriptTools.GetFileBox("PNG-Datei, JPG-Datei|*.png;*.jpg", "Bitmap laden...", , "Bitmap aus CorelDraw", "png", Globals.getDesktopPath)
    
    If selectedFilepath = "" Then
        End ' User hat abbrechen gedrückt
    End If
    
    If Not Globals.fileExist(selectedFilepath) Then
        MsgBox "Die Datei '" & selectedFilepath & "' konnte nicht gefunden werden", vbInformation
        Globals.endMacro
    End If
    
    Dim originalShape As shape
    Set originalShape = ActiveShape
    
    Dim originalShapeWithoutCrop As shape
    Set originalShapeWithoutCrop = Globals.copyPasteShape(originalShape, True)
    originalShapeWithoutCrop.bitmap.ResetCropEnvelope
    
    
    ' Bild laden
    ' ------------------------------------------
    Dim shape As shape
    Set shape = Globals.load(selectedFilepath)
    ' ------------------------------------------
    
    originalShapeWithoutCrop.rotate -originalShapeWithoutCrop.RotationAngle ' Gerade machen, denn nur so lässt sich die Größe vom vorherigen Bild 'originalShapeWithoutCrop' mit dem neuen Bild 'shape' vergleichen
    
    ' Falls das Bild in PS zugeschnitten wurde, hier kompensieren und Bild zentrieren
    ' ------------------------------------------
    Dim xCropScaleFromPS As Double
    xCropScaleFromPS = shape.bitmap.image.width / originalShapeWithoutCrop.bitmap.image.width
    
    Dim yCropScaleFromPS As Double
    yCropScaleFromPS = shape.bitmap.image.height / originalShapeWithoutCrop.bitmap.image.height
    
    Dim xOffsetToCenter As Double
    xOffsetToCenter = (originalShapeWithoutCrop.SizeWidth / 2 * (1 - xCropScaleFromPS))
    
    Dim yOffsetToCenter As Double
    yOffsetToCenter = (originalShapeWithoutCrop.SizeHeight / 2 * (1 - yCropScaleFromPS))
    ' ------------------------------------------
    
    shape.SetBoundingBox originalShapeWithoutCrop.LeftX + xOffsetToCenter, originalShapeWithoutCrop.BottomY + yOffsetToCenter, originalShapeWithoutCrop.SizeWidth * xCropScaleFromPS, originalShapeWithoutCrop.SizeHeight * yCropScaleFromPS
    
    ' Rotation und Spiegelung
    ' ------------------------------------------
    If originalShape.TransformationMatrix.IsMirrored Then
        shape.Flip cdrFlipVertical
    End If
    shape.rotate originalShape.RotationAngle
    ' ------------------------------------------
    
    
    shape.OrderFrontOf originalShape
    shape.name = originalShape.name
    
    ' Wenn die vorherige Bitmap einen Zuschnitt hatte, soll die neu reingeladene die selbe bekommen
    If originalShape.bitmap.CropEnvelopeModified Then
        Globals.intersectShapes originalShape, shape, False, False, True
    End If
    
    If Not Globals.isShapeDeleted(originalShape) Then originalShape.delete
    originalShapeWithoutCrop.delete
    
    Globals.endMacro
    Exit Sub
MacroError: 'Alle Fehler hier abfangen und die CommandGruppe beenden, damit man mit einem Schritt zurück gehen kann (STRG + Z), auch wenn ein Fehler aufgetreten ist
    MsgBox Err.Description & ", " & Err.number, vbCritical
    ProgressBarUserForm.Hide
    Globals.endMacro True
End Sub


' Wenn eine CDR-ZIP .colorbitmap Dateien im styles Ordner enthällt, macht es die Datei sehr langsam ung groß.
' Auch wenn man einzelne Formen daraus seperat abspeichert, enthalten diese dann auch die .colorbitmap Dateien
' Hiermit werden diese Dateien aus der CDR gelöscht
Public Sub RepairSlowAndBigCDR()
    
    Dim cdrFilePath As String
    cdrFilePath = CorelScriptTools.GetFileBox("CDR|*.cdr", "Bitte wähle eine CDR-Datei aus", , , , "Y:\20_Martin\Corel\Fancyexport\Hintergründe")
    
    If Not cdrFilePath = "" Then
        repairSlowAndBigCDRProcessCDR cdrFilePath
        
        MsgBox "Fertig", vbInformation
    End If
    
End Sub



Public Function repairSlowAndBigCDRProcessCDR(cdrFilePath)
    
    
    ' Muss gemacht werden, da VBA sonst meckert, dass 'cdrFilePath' nicht ByVal ist (auch wenn man es in der Parameterliste so macht)
    Dim cdrFilePath2 As String
    cdrFilePath2 = cdrFilePath
    Dim cdrZipFilePath As String
    Dim unzippedPath As String
    
    For i = 1 To Application.Documents.count
        If Application.Documents(i).FullFileName = cdrFilePath2 Then
            MsgBox "Die Datei '" & cdrFilePath2 & "' ist in Corel geöffnet. Bitte vorher schließen.", vbExclamation
            Globals.endMacro
        End If
    Next i
    
    cdrZipFilePath = Globals.addBackslash(Globals.getDesktopPath) & "CDR-ZIP.zip"
    Globals.copyPasteFile cdrFilePath2, cdrZipFilePath, , True, True
    
    
    unzippedPath = Globals.addBackslash(Globals.getDesktopPath)
    
    unzippedPath = Globals.unzip(cdrZipFilePath, unzippedPath)
    
    If Not Globals.folderExists(unzippedPath) Then
        MsgBox "Die CDR konnte nicht entpackt werden!", vbCritical
        Globals.endMacro
    End If
    
    Dim stylesPath As String
    stylesPath = Globals.addBackslash(unzippedPath) & "styles\"
    
    If Globals.folderExists(stylesPath) Then
        Dim colorBitmapFilesPaths As collection
        Set colorBitmapFilesPaths = Globals.getFilesPathWithExtensionInFolder(stylesPath, ".colorbitmap", 0)
        
        If colorBitmapFilesPaths.count = 0 Then
            MsgBox "Die CDR-Datei weist keine Probleme auf", vbInformation
            GoTo cleanUp
        End If
        
        For i = 1 To colorBitmapFilesPaths.count
            Globals.deleteFile colorBitmapFilesPaths(i)
        Next i
    Else
        MsgBox "Die CDR-Datei konnte nicht repariert werden", vbInformation
        GoTo cleanUp
    End If
    
    Dim cdrFolderFileAndType() As String
    cdrFolderFileAndType = Globals.getFolderFileAndType(cdrFilePath2)
    
    Dim backupFolderPath As String
    backupFolderPath = Globals.addBackslash(Globals.getDesktopPath) & "CDR-Reparatur Backups\"
    Globals.createFolder backupFolderPath
    
    Globals.copyPasteFile cdrFilePath2, backupFolderPath & cdrFolderFileAndType(1) & "_BK.cdr", False, True
    
    ' Vorherige CDR zu ZIP-kopie überschreiben
    Globals.zipFolder unzippedPath, cdrZipFilePath
    
    Globals.deleteFile cdrFilePath2
    Globals.renameFileOrFolder cdrZipFilePath, cdrFilePath2
    
    
    
    
cleanUp:
    If Not unzippedPath = "" Then
        Globals.deleteFolder unzippedPath
    End If
    If Not cdrZipFilePath = "" Then
        If Globals.fileExist(cdrZipFilePath) Then
            Globals.deleteFile cdrZipFilePath
        End If
    End If
End Function



Public Sub RenameFontsToRealName()
    
    Dim path As String
    path = CorelScriptTools.GetFolder(Globals.getDesktopPath, "Bitte wähle einen Ordner mit Schriftarten")
    
    If Not path = "" Then
        
        Dim extensions As New collection
        extensions.add "ttf"
        extensions.add "otf"
        extensions.add "fon"
        
        Dim fontFiles As collection
        Set fontFiles = Globals.findFilesPathWithExtensionsInFolder(path, extensions)
        
        ProgressBarUserForm.Start
        
        For i = 1 To fontFiles.count
            
            Dim newFontName As String
            newFontName = Globals.getFontName(fontFiles(i))
            
            If Not newFontName = "" Then
                
                Dim fontFolderFileAndType() As String
                fontFolderFileAndType = Globals.getFolderFileAndType(fontFiles(i))
                
                Dim newFileName As String
                newFileName = Globals.addBackslash(fontFolderFileAndType(0)) & newFontName & fontFolderFileAndType(2)
                                
                ' Wenn die Schrift nicht schon den passenden Namen hat
                If Not newFileName = fontFiles(i) And Not Globals.isStringHavingIllegalFileNameChars(newFileName) Then
                
                    If Globals.fileExist(newFileName) Then
                        renameFontsToRealNamePutFontIntoDoublesFolder fontFiles(i), path, newFileName
                    Else
                        Globals.renameFileOrFolder fontFiles(i), newFileName
                    End If
                End If
                
            End If
            
            ProgressBarUserForm.setProgress i / CDbl(fontFiles.count)
        Next i
        
    End If
    
    ProgressBarUserForm.Hide
    
End Sub

Private Function renameFontsToRealNamePutFontIntoDoublesFolder(fontFile As String, folder As String, newFileName As String)
    
    ' Ordner erstellen, wo die doppelten reinkommen
    Dim doublesFolder As String
    doublesFolder = Globals.addBackslash(folder) & "Name mehrfach vorhanden"
    '
    If Not Globals.folderExists(doublesFolder) Then
        Globals.createFolder doublesFolder
    End If
    
    Dim fontFolderFileAndType() As String
    fontFolderFileAndType = Globals.getFolderFileAndType(fontFile)
    
    Dim newFilePath As String
    newFilePath = Globals.addBackslash(doublesFolder) & fontFolderFileAndType(1) & fontFolderFileAndType(2)
    newFilePath = Globals.getNextFreeFileName(newFilePath, True) ' Falls z.B. die Datei "Schrift.ttf" schon da ist, wird hier "Schrift1.ttf" genommen usw.
    
    Globals.moveFile fontFile, newFilePath
    
End Function



Public Sub MarkShapeNaming()
    
    Globals.endIfNoActiveShape
    
    Dim naming As String
    naming = Globals.getKeyWordContent(ActiveShape, Globals.getNamingKeyWord)
    
    naming = InputBox("Name für die Form", "Form benennen", naming)
    
    ' Entfernen
    If naming = "" Then
        Globals.addOrRemoveKeywordWithArgumentsToShape ActiveShape, Globals.getNamingKeyWord, newArrayList, False, True
    Else
        Globals.addOrRemoveKeywordWithArgumentsToShape ActiveShape, Globals.getNamingKeyWord, newArrayList.add(naming)
    End If
    
    
    
End Sub

