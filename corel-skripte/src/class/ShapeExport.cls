Attribute VB_Name = "ShapeExport"
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
' Erlaubt es Formen einfach zu exportieren, mit vielen Optionen
' Dieses Objekt kann auch mehrfach für mehrere Exporte genutzt werden (ist also nicht destruktiv)
'
' Variablen-Namens-Vorschlag: shapeEx


Private shapes As New shapeRange
Private shapesToDeleteAfterExport As New shapeRange
Private shapesToExclude As New shapeRange


Private path As String
Private fileType As cdrFilter


' Optionale Variablen
Private width As Integer
Private height As Integer
Private preferredWidth As Double
Private preferredHeight As Double
Private shapesScale As Double
Private stretchToMeetSize As Boolean
Private resolutionX As Integer ' = 300
Private resolutionY As Integer ' = 300
Private jpgCompression As Integer ' 0 == Minimalste Komprimierung, 100 == stärkste Komprimierung
Private svgImageQualityScale As Double
Private originX As Double '= -50000
Private originY As Double '= -50000
Private ignoreAllShapesAreInvisibleWarning As Boolean ' = True
Private colorizeRDGWhiteToRGB As Boolean ' = True
Private colorizeCMYKBlackToRGB As Boolean ' = True
Private boundingBoxShape As shape
Private boundingBoxDefinesOrigin As Boolean
Private exportBoundingBox As Boolean
Private preventFileOverride As Boolean
Private exportFullyInvisibleShapeRange As Boolean ' = True
Private exportFullyInvisibleShapeRangeAs1x1 As Boolean ' = False
Private switchToPNGForEmptySVG As Boolean ' = True,
Private keepShapesToDeleteAfterExport As Boolean


' Export Arbeits Variablen
Private shapesToExport As shapeRange
Private shapesAreDuplicated As Boolean
Private helperShapes As shapeRange
Private oneByOnePixelShapeCreated As Boolean

' Export Ergebnis Variablen
Public finalExportFilePath As String ' Der finale Dateipfad unter dem Exportiert wurde. Wird erst nach dem Export vergeben
Public finalExportFileNameWithType As String
Public finalExportedShapes As shapeRange
Public fileExportedSucessfully As Boolean
Public finalWidth As Double
Public finalHeight As Double


' Corel scheint Bilder für SVGs immer in 120 DPI zu rastern
Private Const SVG_DPI_CAP_FROM_COREL As Double = 120

Public Enum ShapeExportStatus
    ShapeExportInitStatus
    
    ShapeExportShapeCountZeroErrorStatus
    ShapeExportLessThanOnePixelSizeErrorStatus
    ShapeExportAllInvisibleErrorStatus
    
    ShapeExportFileNotExportedErrorStatus
    ShapeExportSuccessfullStatus
End Enum

Private exportStatus As ShapeExportStatus


Private Sub Class_Initialize()
    resolutionX = 300
    resolutionY = 300
    
    originX = -50000
    originY = -50000
    
    svgImageQualityScale = 1
    shapesScale = 1
    
    ignoreAllShapesAreInvisibleWarning = True
    colorizeRDGWhiteToRGB = True
    colorizeCMYKBlackToRGB = True
    
    exportFullyInvisibleShapeRange = True
    
'    checkAllShapesAreInvisible = True
End Sub


Public Function init(Optional shapeOrRange As Variant, Optional ByVal path_ As String, Optional fileType_ As cdrFilter)
    setShapes shapeOrRange
    path = path_
    fileType = fileType_
End Function


Public Function getExportStatus() As ShapeExportStatus
    getExportStatus = exportStatus
End Function


Public Function addShapesToDeleteAfterExport(shapeOrRange As Variant) As ShapeExport
    shapesToDeleteAfterExport.AddRange Globals.ensureShapeRange(shapeOrRange)
    Set addShapesToDeleteAfterExport = Me
End Function

Public Function addShapesToExclude(shapesToExclude_ As shapeRange) As ShapeExport
    shapesToExclude.AddRange shapesToExclude_
    Set addShapesToExclude = Me
End Function


Public Function getShapes() As shapeRange
    Set getShapes = shapes
End Function

Public Function setShapes(shapeOrRange As Variant) As ShapeExport
    Set shapes = Globals.ensureShapeRange(shapeOrRange)
    Set setShapes = Me
End Function

Public Function setShapesToDeleteAfterExport(shapesToDeleteAfterExport_ As shapeRange) As ShapeExport
    Set shapesToDeleteAfterExport = shapesToDeleteAfterExport_
    Set setShapesToDeleteAfterExport = Me
End Function

Public Function setShapesToExclude(shapesToExclude_ As shapeRange) As ShapeExport
    Set shapesToExclude = shapesToExclude_
    Set setShapesToExclude = Me
End Function

Public Function setPath(ByVal path_ As String) As ShapeExport
    path = path_
    Set setPath = Me
End Function

Public Function setFileType(fileType_ As cdrFilter) As ShapeExport
    fileType = fileType_
    Set setFileType = Me
End Function

Public Function setSize(width_ As Integer, height_ As Integer) As ShapeExport
    setWidth width_
    setHeight height_
    Set setSize = Me
End Function

Public Function setWidth(width_ As Integer) As ShapeExport
    width = width_
    Set setWidth = Me
End Function

Public Function setHeight(height_ As Integer) As ShapeExport
    height = height_
    Set setHeight = Me
End Function

Public Function setPreferredWidth(preferredWidth_ As Integer) As ShapeExport
    preferredWidth = preferredWidth_
    Set setPreferredWidth = Me
End Function

Public Function setPreferredHeight(preferredHeight_ As Integer) As ShapeExport
    preferredHeight = preferredHeight_
    Set setPreferredHeight = Me
End Function

Public Function setShapesScale(shapesScale_ As Double) As ShapeExport
    shapesScale = shapesScale_
    Set setShapesScale = Me
End Function

Public Function setStretchToMeetSize(stretchToMeetSize_ As Boolean) As ShapeExport
    stretchToMeetSize = stretchToMeetSize_
    Set setStretchToMeetSize = Me
End Function

Public Function setResolutionX(resolutionX_ As Integer) As ShapeExport
    resolutionX = resolutionX_
    Set setResolutionX = Me
End Function

Public Function setResolutionY(resolutionY_ As Integer) As ShapeExport
    resolutionY = resolutionY_
    Set setResolutionY = Me
End Function

Public Function setResolution(resolution As Integer) As ShapeExport
    setResolutionX resolution
    setResolutionY resolution
    Set setResolution = Me
End Function

Public Function setJpgCompression(jpgCompression_ As Integer) As ShapeExport
    jpgCompression = jpgCompression_
    Set setJpgCompression = Me
End Function

Public Function setSvgImageQualityScale(svgImageQualityScale_ As Double) As ShapeExport
    svgImageQualityScale = svgImageQualityScale_
    Set setSvgImageQualityScale = Me
End Function

Public Function setOriginX(originX_ As Double) As ShapeExport
    originX = originX_
    Set setOriginX = Me
End Function

Public Function setOriginY(originY_ As Double) As ShapeExport
    originY = originY_
    Set setOriginY = Me
End Function

Public Function setIgnoreAllShapesAreInvisibleWarning(ignoreAllShapesAreInvisibleWarning_ As Boolean) As ShapeExport
    ignoreAllShapesAreInvisibleWarning = ignoreAllShapesAreInvisibleWarning_
    Set setIgnoreAllShapesAreInvisibleWarning = Me
End Function

Public Function setColorizeRDGWhiteToRGB(colorizeRDGWhiteToRGB_ As Boolean) As ShapeExport
    colorizeRDGWhiteToRGB = colorizeRDGWhiteToRGB_
    Set setColorizeRDGWhiteToRGB = Me
End Function

Public Function setColorizeCMYKBlackToRGB(colorizeCMYKBlackToRGB_ As Boolean) As ShapeExport
    colorizeCMYKBlackToRGB = colorizeCMYKBlackToRGB_
    Set setColorizeCMYKBlackToRGB = Me
End Function

Public Function setBoundingBoxShape(boundingBoxShape_ As shape) As ShapeExport
    Set boundingBoxShape = boundingBoxShape_
    Set setBoundingBoxShape = Me
End Function

Public Function setBoundingBoxDefinesOrigin(boundingBoxDefinesOrigin_ As Boolean) As ShapeExport
    boundingBoxDefinesOrigin = boundingBoxDefinesOrigin_
    Set setBoundingBoxDefinesOrigin = Me
End Function

Public Function setExportBoundingBox(exportBoundingBox_ As Boolean) As ShapeExport
    exportBoundingBox = exportBoundingBox_
    Set setExportBoundingBox = Me
End Function

Public Function setPreventFileOverride(preventFileOverride_ As Boolean) As ShapeExport
    preventFileOverride = preventFileOverride_
    Set setPreventFileOverride = Me
End Function

Public Function setExportFullyInvisibleShapeRange(exportFullyInvisibleShapeRange_ As Boolean) As ShapeExport
    exportFullyInvisibleShapeRange = exportFullyInvisibleShapeRange_
    Set setExportFullyInvisibleShapeRange = Me
End Function

Public Function setExportFullyInvisibleShapeRangeAs1x1(exportFullyInvisibleShapeRangeAs1x1_ As Boolean) As ShapeExport
    exportFullyInvisibleShapeRangeAs1x1 = exportFullyInvisibleShapeRangeAs1x1_
    Set setExportFullyInvisibleShapeRangeAs1x1 = Me
End Function

Public Function setSwitchToPNGForEmptySVG(switchToPNGForEmptySVG_ As Boolean) As ShapeExport
    switchToPNGForEmptySVG = switchToPNGForEmptySVG_
    Set setSwitchToPNGForEmptySVG = Me
End Function


' Wenn auf True gesetzt, muss man nach einem '.export' auch '.deleteShapesToDeleteAfterExport' aufrufen. Denn sonst bleiben Kopien und Hilfsformen übrig
Public Function setKeepShapesToDeleteAfterExport(keepShapesToDeleteAfterExport_ As Boolean) As ShapeExport
    keepShapesToDeleteAfterExport = keepShapesToDeleteAfterExport_
    Set setKeepShapesToDeleteAfterExport = Me
End Function



Public Function mee() As ShapeExport
    Set mee = Me
End Function






Public Function setOriginWithOriginType(originType As ExportOriginMode, layer As ProductDesignLayer) As ShapeExport
    
    Dim mainShapes As shapeRange
    
    Select Case originType
    Case ExportOriginMode.design
        Set mainShapes = layer.getPart.getDesign.getLayersMainShapes
    Case ExportOriginMode.part
        Set mainShapes = layer.getPart.getLayersMainShapes
    Case ExportOriginMode.layer
        Set mainShapes = layer.getMainShape
    End Select
    
    setOriginX mainShapes.centerX
    setOriginY mainShapes.centerY
    
    Set setOriginWithOriginType = Me
End Function


Public Function setShapesEmptyShape(width As Integer, height As Integer) As ShapeExport
    setShapes Globals.createEmptyShapeForEmptyExportWithCoordinates(0, 0, width, height)
End Function




Private Function duplicateShapesIfNotAlready()
    ' ShapeRange duplizieren, da diese verändert werden sollen. Aber eben nur für diesen Export
    If Not shapesAreDuplicated Then
        Dim allShapesToExlude As New shapeRange
        allShapesToExlude.AddRange shapesToExclude
        
        ' Wenn man unsichtbare Formen kopiert, ist die Boundingbox von der 'shapesToExport' falsch, was zu verzerrt exportierten Bildern führt,
        ' deshalb werden diese hier ausgeschlossen. (Das können bpsw. unsichtbare Varianten sein
        allShapesToExlude.AddRange newCustomShapeTypeQuery(shapesToExport, InvisibleProperlyShapeType).setContinueSearchInMatchedGroups(False).search
        
        Set shapesToExport = Globals.copyPasteShapeRange(shapesToExport, , allShapesToExlude)
        Globals.saveOrderShapeRangeIntoLayer shapesToExport
        Globals.setShapeRangeName shapesToExport, "ShapeExport.shapesToDeleteAfterExport"
        shapesToDeleteAfterExport.AddRange shapesToExport
        shapesAreDuplicated = True
    End If
End Function






' Returnt den Namen unter der die Datei letztendlich gespeichert wurde. (ohne Dateiendung)
' Denn es kann sein, dass der Dateiname schon vergeben ist z.B: "Design_Element"
' Wenn ein leerer String returnt wird, heißt das, dass der Export fehlgeschlagen ist
' Falls der Ordner in dem Exportiert werden soll noch nicht existiert, wird dieser hier erstellt
'
' Wenn 'exportFullyInvisibleShapeRange' true ist, dann wird bei komplett unsichtbarer 'shapeRange' ein Rechteck in Größe der 'shapeRange' erstellt
' Für 'finallyExportedShapesReturn' kann eine Shaperange angegeben werden. Diese Variable wird dann mit den Formen, die am Ende wirklich exportiert werden überschrieben. Somit weiß man beim FancyExport z.B. genau welche Position die final exportierte Form hat.
' Achtung: Wenn man aber 'finallyExportedShapesReturn' nutzt, muss man die Formen selber löschen. Das übernimmt diese Funktion dann nicht mehr
Public Function export(Optional logger As logger, Optional warnIfFileOverwritten As Boolean) As ShapeExport
    
    If Not logger Is Nothing Then
        logger.addTab , "[ShapeExport.export] shapeRange: " & Globals.shapeRangeToString(shapes) & ", path: '" & path & "', originX: '" & originX & "', originY: '" & originY & "'"
    End If
    
    exportStatus = ShapeExportInitStatus
    
    If Not checkIfShapeRangeCanBeExported(logger) Then GoTo ExitFunction
    
    ' EXPORT INIT
    ' ---------------------------------
    
    ' Helpershapes werden einfach nur mitexportiert, aber bspw. nicht umgefärbt (colorizeRDGWhiteToRGB), weshalb sie gesondert gesammelt werden
    ' Bei jedem Export neu erstellen, da es nur für den Export gedacht ist
    Set helperShapes = New shapeRange
    
    ' Bei jedem Export neu erstellen, da es nur für den Export gedacht ist
    Set shapesToExport = New shapeRange
    shapesToExport.AddRange shapes
    
    shapesAreDuplicated = False
    oneByOnePixelShapeCreated = False
    ' ---------------------------------
    
        
        
    ' Formen ausschließen
    ' ---------------------------------
    If Not shapesToExclude Is Nothing Then

        If shapesToExclude.count > 0 Then
            ' ShapeRange duplizieren, da diese im Code darunter verändert wird
            ' (Dupliziert aber nicht die 'shapesToExclude')
            duplicateShapesIfNotAlready
        End If

    End If
    ' ---------------------------------
    
    
    ' Formen skalieren
    ' ---------------------------------
    If shapesScale <> 1 Then
        duplicateShapesIfNotAlready
        shapesToExport.setSize shapesToExport.SizeWidth * shapesScale
    End If
    ' ---------------------------------
    
    
    ' Unsichtbare Formen Export Fix
    '
    ' Wenn alle Formen unsichtbar sind, wird ein Dummy exportiert, der die selbe Größe wie alle Unsichtbaren hat
    ' ---------------------------------
    If exportFullyInvisibleShapeRange Then
        If Not Globals.isShapeRangeVisibleProperlyRecursive(shapesToExport, False, False, logger) Then
        
            If Not logger Is Nothing Then logger.logINFO "shapesToExport sind nicht isShapeRangeVisibleProperlyRecursive. Erstelle invisibilityDummy"
            
            Dim invisibilityDummy As shape
            If exportFullyInvisibleShapeRangeAs1x1 Then
                Set invisibilityDummy = Globals.createInvisibleRectForExportByPositionAndSize(0, -1, ActiveDocument.ToUnits(1, cdrPixel), ActiveDocument.ToUnits(1, cdrPixel))
                oneByOnePixelShapeCreated = True
            Else
                Set invisibilityDummy = Globals.createInvisibleRectForExportFromShapeRange(shapesToExport)
            End If
            invisibilityDummy.name = "ShapeExport.export.invisibilityDummy"
            
            ' Wird nicht zu den 'helperShapes' hinzugefügt, da er eher ein Stellvertreter ist, jemand der sich für die anderen opfert :,(
            Set shapesToExport = Globals.shapeToShapeRange(invisibilityDummy)
            shapesAreDuplicated = True
            
            addShapesToDeleteAfterExport invisibilityDummy
            
            
            ' Weil leere SVGs im Fancy weiß aussehen, wird hier optional zu PNG gewechselt, weil leere PNGs im Fancy wirklich transparent sind
            If switchToPNGForEmptySVG And fileType = cdrSVG Then fileType = cdrPNG
        End If
    End If
    ' ---------------------------------
    
    
    
    ' Nullpunkt
    ' -------------------------------
    ' Wenn man möchte, dass die Boundingbox die Exportformen begrenzt aber auch möchte,
    ' dass auch leere Bereiche da sein dürfen, damit der Export die selbe Größe (und Position) hat wie die Boundingbox
    If boundingBoxDefinesOrigin And Not boundingBoxShape Is Nothing Then
        originX = boundingBoxShape.centerX
        originY = boundingBoxShape.centerY
    End If
    
    
    If Not originX = -50000 And Not originY = -50000 Then
        Dim originHelper As shape
        
        ' Width
        Dim originWidth As Double
        originWidth = shapesToExport.RightX - originX
        Dim leftXDistance As Double
        leftXDistance = originX - shapesToExport.LeftX
        If leftXDistance > originWidth Then originWidth = leftXDistance

        ' Height
        Dim originHeight As Double
        originHeight = shapesToExport.TopY - originY
        Dim bottomDistance As Double
        bottomDistance = originY - shapesToExport.BottomY
        If bottomDistance > originHeight Then originHeight = bottomDistance

        Set originHelper = ActiveLayer.CreateRectangle(originX - originWidth, originY + originHeight, originX + originWidth, originY - originHeight)

        setShapeInvisibleForExport originHelper
        originHelper.name = "ShapeExport.export.originHelper"

        helperShapes.add originHelper
        addShapesToDeleteAfterExport originHelper
    End If
    ' -------------------------------
    
    
    
    
    
    ' RDG_Weiß in RGB-Weiß umfärben, wenn gewünscht
    ' -------------------------------
    If colorizeRDGWhiteToRGB Then
        
        ' ShapeRange duplizieren, da diese im Code darunter verändert wird
        duplicateShapesIfNotAlready
        
        Globals.convertRDGWhiteToRGBWhite shapesToExport
    End If
    ' -------------------------------
    
    
    ' CMYK Schwarz zu RGB Scharz umfärben, wenn gewünscht
    ' -------------------------------
    If colorizeCMYKBlackToRGB Then
    
        ' ShapeRange duplizieren, da diese im Code darunter verändert wird
        duplicateShapesIfNotAlready
        
        Globals.convertCMYKBlackToRGBOfShapeRange shapesToExport, True
    End If
    ' -------------------------------
    
    
    ' Bounding Box
    ' -------------------------------
    ' 1x1 Pixel Form nie zuschneiden
    If Not boundingBoxShape Is Nothing And Not oneByOnePixelShapeCreated Then
    
        ' ShapeRange duplizieren, da diese im Code darunter verändert wird
        duplicateShapesIfNotAlready
        
        Set shapesToExport = Globals.intersectShapeWithShapeRange(boundingBoxShape, shapesToExport)
        addShapesToDeleteAfterExport shapesToExport ' Erst jetzt hinzufügen, da sich beim Zuschneiden die Referenzen geändert haben
        
        ' BoundingBox auch exportieren, damit die Ausgabedatei die selbe Größe hat
        If exportBoundingBox Then
            Dim boundingBoxInvisible As shape
            Set boundingBoxInvisible = Globals.createInvisibleRectForExportFromShape(boundingBoxShape)
            boundingBoxInvisible.name = "ShapeExport.export.boundingBoxInvisible"
            
            helperShapes.add boundingBoxInvisible
            addShapesToDeleteAfterExport boundingBoxInvisible
        End If
        
    End If
    ' -------------------------------
    
    
    
    ' Größe ermitteln
    ' Achtung: Erst hier dürfen 'finalWidth' & 'finalHeight' genutzt werden
    ' -------------------------------
    If Not width = 0 And Not height = 0 Then
        finalWidth = width
        finalHeight = height
    Else
        ' Die Hilfsformen (bspw. die unsichtbare BoundingBox) gehören mit zum Exportbereich und bestimmen dessen Größe.
        ' Sonst wird die Datei nur in der Größe der Formen erzeugt und der größere Exportbereich auf diese gequetscht (verzerrt)
        Dim exportAreaShapes As New shapeRange
        exportAreaShapes.AddRange shapesToExport
        exportAreaShapes.AddRange helperShapes
        finalWidth = exportAreaShapes.SizeWidth
        finalHeight = exportAreaShapes.SizeHeight
    End If
    
    If Not preferredWidth = 0 Or Not preferredHeight = 0 Then
        If preferredWidth = 0 Or preferredHeight = 0 Then Err.Raise vbObjectError + 513, , "[ShapeExport.export] 'preferredWidth' oder 'preferredHeight' ist 0 "
        
        Dim scaleFactor As Double
        scaleFactor = min(CDbl(preferredWidth) / finalWidth, CDbl(preferredHeight) / finalHeight)
        
        If Not logger Is Nothing Then logger.logINFO "scaleFactor: '" & scaleFactor & _
            "', preferredWidth: '" & preferredWidth & "', preferredHeight: '" & preferredHeight & _
            "', finalWidth: '" & finalWidth & "', finalHeight: '" & finalHeight & _
            "', shapesToExport.SizeWidth: '" & shapesToExport.SizeWidth & "', shapesToExport.SizeHeight: '" & shapesToExport.SizeHeight & "'"
        
        finalWidth = finalWidth * scaleFactor
        finalHeight = finalHeight * scaleFactor
    End If
    If Not logger Is Nothing Then logger.logINFO "finalWidth: '" & finalWidth & "', finalHeight: '" & finalHeight & "'"
    ' -------------------------------
    
    
    ' Verzerrung verhindern:
    ' Verhindern, dass die Formen (unproportional) verzerrt werden um die Größen 'width' und 'height' zu erfüllen
    ' -------------------------------
    If Not stretchToMeetSize Then
        
        If Not finalWidth = 0 And Not finalHeight = 0 Then
            
            Dim stretchPreventShape As shape
            
            ' Seitenverhältnisse vergleichen um zu gucken, ob überhaupt gestretcht werden müsste
            
            Dim aspectRatio As Double
            aspectRatio = finalWidth / finalHeight
            
            Dim shapesAspectRatio As Double
            shapesAspectRatio = shapesToExport.SizeWidth / shapesToExport.SizeHeight
            
            If Abs(aspectRatio - shapesAspectRatio) > 0.1 Then
                
                Dim stretchPreventShapeWidth As Double
                Dim stretchPreventShapeHeight As Double
                
                ' Breiter
                If aspectRatio > shapesAspectRatio Then
                    stretchPreventShapeHeight = shapesToExport.SizeHeight
                    stretchPreventShapeWidth = stretchPreventShapeHeight * aspectRatio
                    
                ' Höher
                Else
                    stretchPreventShapeWidth = shapesToExport.SizeWidth
                    stretchPreventShapeHeight = stretchPreventShapeWidth / aspectRatio
                End If
                
                Set stretchPreventShape = ActiveLayer.CreateRectangle2(shapesToExport.centerX - stretchPreventShapeWidth / 2, shapesToExport.centerY - stretchPreventShapeHeight / 2, stretchPreventShapeWidth, stretchPreventShapeHeight)
                Globals.setShapeInvisibleForExport stretchPreventShape
                stretchPreventShape.name = "ShapeExport.export.stretchPreventShape"
                
                helperShapes.add stretchPreventShape
                addShapesToDeleteAfterExport stretchPreventShape
                
            End If
            
        End If
    End If
    ' -------------------------------
    
    
    
    
    ' DATEIPFAD
    ' -------------------------------
    'Falls der Ordner noch nicht existiert, erstellen
    Dim folderPath As String: folderPath = getFolderFileAndType(path)(0)
    Globals.createFolder folderPath
    
    'Dateiendung anhängen
    finalExportFilePath = path & "." & Globals.getFilterAsString(fileType)
    Dim folderFileAndType() As String
    
    If preventFileOverride Then
        finalExportFilePath = Globals.getNextFreeFileName(finalExportFilePath)
    End If
    
    folderFileAndType = Globals.getFolderFileAndType(finalExportFilePath)
    finalExportFileNameWithType = folderFileAndType(1) & folderFileAndType(2)
    
    If Not logger Is Nothing Then logger.logINFO "Gesamter Pfad: '" & finalExportFilePath & "'"
    ' -------------------------------
    
    If warnIfFileOverwritten Then
        If Globals.fileExist(finalExportFilePath) Then
            If Not logger Is Nothing Then logger.logWARN "Die Datei '" & finalExportFilePath & "' existiert schon und wird überschrieben!"
        End If
    End If
    
    
    ' EXPORTFORMEN AUSWÄHLEN
    ' -------------------------------
    Set finalExportedShapes = New shapeRange
    finalExportedShapes.AddRange shapesToExport
    finalExportedShapes.AddRange helperShapes
    
    If finalExportedShapes.count = 0 Then Err.Raise vbObjectError + 513, , "[ShapeExport.export] 'finalExportedShapes' ist Leer "
    
    finalExportedShapes.All.CreateSelection ' Auswählen. Denn beim Export mit der Corel Funktion wird 'cdrSelection' angegeben
    ' -------------------------------
    
    
    
    
    
    If fileType = cdrPNG Then
        
        exportPNG logger
        
    ElseIf fileType = cdrJPEG Then
        
        exportJPG logger
        
    ElseIf fileType = cdrCDR Then
        
        exportCDR logger
        
    ElseIf fileType = cdrSVG Then
        
        exportSVG finalExportedShapes, logger
        
    Else
    
        ' NICHT UNTERSTÜTZE DATEI-ENDUNGEN
        ' ----------------------------------------
        Dim notSupportedFileFormatErrorMsg As String
        notSupportedFileFormatErrorMsg = "Dateityp '" & Globals.getFilterAsString(fileType) & "' wird noch nicht unterstützt!"
        If Not logger Is Nothing Then logger.logWARN notSupportedFileFormatErrorMsg
        Err.Raise vbObjectError + 513, , "[ShapeExport.export] " & notSupportedFileFormatErrorMsg
        ' ----------------------------------------
        
    End If
    
ExitFunction:
    
    
    If Not keepShapesToDeleteAfterExport Then deleteShapesToDeleteAfterExport
    
    If Not Globals.fileExist(finalExportFilePath) Then
        If Not logger Is Nothing Then logger.logWARN "Die Datei wurde nicht erfolgreich exportiert: '" & finalExportFilePath & "'"
        fileExportedSucessfully = False ' Nicht erfolgreich exportiert
        exportStatus = ShapeExportFileNotExportedErrorStatus
    Else
        fileExportedSucessfully = True
        exportStatus = ShapeExportSuccessfullStatus
    End If
    
    Set export = Me
    
    If Not logger Is Nothing Then logger.removeTab
End Function




Public Function deleteShapesToDeleteAfterExport()
    ' Formen löschen, die nur für den Export da waren: Duplizierte Originale, Helferformen
    Globals.removeDeletedShapeFromShapeRange shapesToDeleteAfterExport
    shapesToDeleteAfterExport.delete
End Function








Private Function checkIfShapeRangeCanBeExported(Optional logger As logger) As Boolean
    
'    shapeRange As shapeRange, fileType As cdrFilter, ByVal path As String, Optional logger As logger, Optional ignoreAllShapesAreInvisibleWarning As Boolean = True, _
'        Optional checkAllShapesAreInvisible As Boolean = True) As Boolean
    
    If Not logger Is Nothing Then logger.addTab , "[ShapeExport.checkIfShapeRangeCanBeExported] ignoreAllShapesAreInvisibleWarning: '" & ignoreAllShapesAreInvisibleWarning & "'"
    
    If shapes Is Nothing Then
        Err.Raise vbObjectError + 513, , "[ShapeExport.checkIfShapeRangeCanBeExported] exportRange ist 'Nothing'"
    End If
    
    
    ' TODO mann könnte prüfen, ob der Flächeninhalt der shapeRange zu klein ist und dann nicht exportieren. Es kommt nämlich bei bündingen Edelstahlplatten vor,
    ' dass diese zugeschnitten werden und weil sie bündig sind, ist nur noch ein kleiner Strich von ihnen übrig
    
    
    Globals.isStringPathHavingIllegalChars path, True
    
    Globals.removeShapesOfShapeRangeThatAreNothing shapes
    
    If shapes.count = 0 Then
        If Not logger Is Nothing Then logger.logWARN "ShapeRange.count ist 0. Path='" & path & "', fileType='" & fileType & "'"
        exportStatus = ShapeExportShapeCountZeroErrorStatus
        GoTo ExitFunction ' Return False
    End If

    
    ' Form muss nur bei Pixelexport mindestens 1 Pixel hoch oder breit sein
    If (fileType = cdrJPEG) Or (fileType = cdrPNG) Then
        If ActiveDocument.FromUnits(shapes.SizeWidth, cdrPixel) < 1# Or ActiveDocument.FromUnits(shapes.SizeHeight, cdrPixel) < 1# Then
            If Not logger Is Nothing Then logger.logWARN "Breite oder Höhe der Formen zum exportieren ist kleiner als 1 Pixel. Path='" & path & "', fileType=" & fileType
            exportStatus = ShapeExportLessThanOnePixelSizeErrorStatus
            GoTo ExitFunction ' Return False
        End If
    End If
    
    
    If Globals.isShapeDeleted(shapes.firstShape) Then
        Err.Raise vbObjectError + 513, , "[ShapeExport.checkIfShapeRangeCanBeExported] Shape ist gelöscht!"
    End If
    
    If Not exportFullyInvisibleShapeRange Then
        If Globals.shapeRangeShapesAreInvisible(shapes, True) Then
            Dim errorMsg As String
            errorMsg = "Unsichtbare Formen lassen sich nicht exportieren! Erste Form: " & Globals.getShapeDisplayName(shapes.firstShape)
            If Not logger Is Nothing Then logger.logWARN errorMsg
            If Not ignoreAllShapesAreInvisibleWarning Then Err.Raise vbObjectError + 513, , "[ShapeExport.checkIfShapeRangeCanBeExported] " & errorMsg
            exportStatus = ShapeExportAllInvisibleErrorStatus
            GoTo ExitFunction ' Return False
        End If
    End If
    
    checkIfShapeRangeCanBeExported = True
ExitFunction:
    
    If Not logger Is Nothing Then
        logger.logINFO "Returne " & checkIfShapeRangeCanBeExported
        logger.removeTab
    End If
    ' False
End Function



Private Function createExportFilterForJPGorPNG(forJPGorPNG As Boolean) As ExportFilter
    ' TODO man könnte 'exportArea' nutzen anstatt Formen zuzuschneiden
    Dim exportArea As rect
    
    
    ' Anti-Aliasing-Typ ermitteln
    ' --------------------------------------
    ' ACHTUNG: Seit dem nicht mehr cdrNormalAntiAliasing direkt in der Funktion unten steht, kommt es manchmal zu schwarzen JPEGs
    ' TODO: Aber evtl. liegt es daran, dass die JPGs leer sind. Dann sollte man evtl. ein switchToPNGWhenEmptyJPG einführen
    Dim antiAliasingType As cdrAntiAliasingType
    If forJPGorPNG Then
        ' Für JPGs eignet sich Supersampling gut, da bei cdrNormalAntiAliasing kleine JPGs ohne Hintergrund stufenartige Pixelränder bekommen
        antiAliasingType = cdrSupersampling
    Else
        ' 'cdrSupersampling' sorgt bei PNG komischerweise dafür, dass die PNGs einen schwarzen oder wießen Hintergrund bekommen (Farbe evtl. abhängig vom Inhalt?)
        antiAliasingType = cdrNormalAntiAliasing
    End If
    ' --------------------------------------
    
    If ActiveSelectionRange Is Nothing Then Err.Raise vbObjectError + 513, , "[ShapeExport.createExportFilterForJPGorPNG] 'ActiveSelectionRange' ist Nothing "
    If ActiveSelectionRange.count = 0 Then Err.Raise vbObjectError + 513, , "[ShapeExport.createExportFilterForJPGorPNG] 'ActiveSelectionRange' ist Leer "
    
    Set createExportFilterForJPGorPNG = ActiveDocument.ExportBitmap(finalExportFilePath, fileType, cdrSelection, cdrRGBColorImage, finalWidth, finalHeight, resolutionX, resolutionY, antiAliasingType, False, True, True, False, cdrCompressionNone, , exportArea)
End Function



Private Function exportJPG(logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[ShapeExport.exportJPG]"
    
    With createExportFilterForJPGorPNG(True)
        .Compression = jpgCompression
        
        If Not logger Is Nothing Then logger.logINFO "Exportiere JPG: '" & finalExportFilePath & "' ..."
        .finish
        If Not logger Is Nothing Then logger.logINFO "Exportiert"
    End With
    
    If Not logger Is Nothing Then logger.removeTab
End Function



Private Function exportPNG(logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[ShapeExport.exportPNG]"
    
    With createExportFilterForJPGorPNG(False)
        .Interlaced = True
        .transparency = 0
        .invertmask = False
        .color = 0
        
        If Not logger Is Nothing Then logger.logINFO "Exportiere PNG: '" & finalExportFilePath & "' ..."
        .finish
        If Not logger Is Nothing Then logger.logINFO "Exportiert"
    End With
    
    If Not logger Is Nothing Then logger.removeTab
End Function




Private Function exportCDR(logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[ShapeExport.exportCDR]"
    
    Dim authorBefore As String
    authorBefore = ActiveDocument.Metadata.Author
    Dim notesBefore As String
    notesBefore = ActiveDocument.Metadata.Notes
    
    ' Aktuellen User als Autor setzen (damit man immer genau weiß, woher die CDR kam)
    ActiveDocument.Metadata.Author = getUserName
    ActiveDocument.Metadata.Notes = "Scriptversion " & Globals.getVersion.versionString
    
    Dim saveOptions As StructSaveAsOptions
    Set saveOptions = CreateStructSaveAsOptions
    With saveOptions
        .EmbedVBAProject = False
        .filter = cdrCDR
        .IncludeCMXData = False
        .range = cdrSelection
        .EmbedICCProfile = False
        .Version = cdrVersion22
        .KeepAppearance = False
    End With
    
    If Not logger Is Nothing Then logger.logINFO "Exportiere CDR als Kopie: '" & finalExportFilePath & "' ..."
    ActiveDocument.SaveAsCopy finalExportFilePath, saveOptions
    If Not logger Is Nothing Then logger.logINFO "Exportiert"
    
    ActiveDocument.Metadata.Author = authorBefore
    ActiveDocument.Metadata.Notes = notesBefore
    
    If Not logger Is Nothing Then logger.removeTab
End Function





Private Function exportSVG(shapeRange As shapeRange, Optional logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[ShapeExport.exportSVG]"
    
    Dim previousDocument As document
    Set previousDocument = ActiveDocument
    
    Dim finalSVGImageQualityScale As Double
    ' Corel rastert Bilder in SVGs in 120 DPI. Das wird hier kompensiert
    finalSVGImageQualityScale = svgImageQualityScale * (300 / SVG_DPI_CAP_FROM_COREL)
    
    Dim DPI As Double
    DPI = 300 / finalSVGImageQualityScale
    
    
    Dim svgDocument As document
    
    ' Neues Dokument für SVG erstellen
    ' --------------------------------------------
    ' AA
    Dim createopt As StructCreateOptions
    Set createopt = CreateStructCreateOptions
    With createopt
        .name = shapeRange.firstShape.name
        .Units = cdrPixel
'        .PageHeight = ShapeRange.SizeWidth
'        .PageWidth = ShapeRange.SizeHeight
        '.PageHeight = 0.00508
        .resolution = DPI
        .ColorContext = CreateColorContext2("sRGB IEC61966-2.1,ISO Coated v2 (ECI),Dot Gain 15%")
    End With

    Set svgDocument = CreateDocumentEx(createopt)
    Dim pasteopt As StructPasteOptions
    Set pasteopt = CreateStructPasteOptions
    With pasteopt.ColorConversionOptions
        .SourceColorProfileList = "sRGB IEC61966-2.1,ISO Coated v2 (ECI),Dot Gain 15%"
        .TargetColorProfileList = "sRGB IEC61966-2.1,ISO Coated v2 (ECI),Dot Gain 15%"
    End With
    
    ' BB
    ' TODO vv  das könnte als Alternative genutzt werden, damit man nicht shapeRange.copy nutzen muss, welche vmtl. die Zwischenablage nutzt und weswegen manchmal Fehler auftreten
'    Set svgDocument = shapeRange.CreateDocumentFrom
'    svgDocument.name = shapeRange.firstShape.name
''    svgDocument.unit = cdrPixel
'    svgDocument.Resolution = DPI
    ' --------------------------------------------
    
    
    
    ' Scheint doch nicht zu stimmen:
    ' Wenn Formen eine Kontur haben, kann es sein, dass die Größe falsch angegeben wird.
    ' Somit könnten Konturen aus dem Canvas rausragen und Probleme bei der Skalierung machen
    Dim tolerance As Double
    tolerance = 0 '-0.3
    
    ' AA
'    With svgDocument.MasterPage
'        .SizeWidth = 100
'        .SizeHeight = 100
'    End With
    
    
    Dim svgShapes As shapeRange
    
    ' Beim direkten shapeRange.copy tritt sporadisch ein "unerwarteter Fehler" auf (Zwischenablage-Race).
    ' Deshalb über TryCopyShapeRange mit Wiederholungsversuchen kopieren.
    Globals.TryCopyShapeRange shapeRange
    Set svgShapes = ActiveLayer.PasteEx(pasteopt)
    
    ' Formen vorher duplizieren, wenn nötig, um nicht destruktiv gleich die Outlines zu verändern
    duplicateShapesIfNotAlready
    
    ' ACHTUNG: Outlines von Kurven müssen unbedingt auf scaleWithShape = False stehen,
    ' sonst backt Coreldraw beim SVG Export die Konturen zu flächen mit vielen unnötigen Punkten (keine Kurven mehr)
    Globals.setShapesOutlinesScaleWithShape svgShapes, , False
    
    ' BB
'    Set svgShapes = ActiveLayer.shapes.All
    
    If Not finalSVGImageQualityScale = 1 Then
        svgShapes.SetSizeEx svgShapes.centerX, svgShapes.centerY, svgShapes.SizeWidth * finalSVGImageQualityScale, svgShapes.SizeHeight * finalSVGImageQualityScale
    End If
    
    With svgDocument.MasterPage
        .SizeWidth = svgShapes.SizeWidth + tolerance * 2
        .SizeHeight = svgShapes.SizeHeight + tolerance * 2
        .PrintExportBackground = False
        .background = 0
    End With
    
    svgShapes.LeftX = tolerance
    svgShapes.BottomY = tolerance
    
'    svgShapes.CreateSelection
    ' Nichts auswählen
    ActiveDocument.ClearSelection
    
    
     Dim expopt2 As StructExportOptions
     Set expopt2 = CreateStructExportOptions
     expopt2.useColorProfile = True

     Dim expflt2 As ExportFilter
     Set expflt2 = ActiveDocument.ExportEx(finalExportFilePath, cdrSVG, , expopt2)
    
     
     
     With expflt2
     
         ' Ändert nichts
         '.width = shape.SizeWidth
         '.height = shape.SizeHeight
         
         .width = svgDocument.MasterPage.SizeWidth * DPI
         .height = svgDocument.MasterPage.SizeHeight * DPI
         
         
         ' Aufgezeichnet:
         .Version = 1 ' FilterSVGLib.svgVer11
         .Encoding = 0 ' FilterSVGLib.svgUTF8
         .Styling = 0 ' FilterSVGLib.svgInternalStyleSheet
         .EmbedJavaScript = True
         .Units = 3 ' FilterSVGLib.svgPixels
         .DrawingPrecision = 0 ' FilterSVGLib.svg_1to1
         .FountainSteps = 255
         .TextAsCurves = True
         .EmbedFont = True
         .CharacterSubsetting = 0 ' FilterSVGLib.svgUsedOnly
         .GiveEmbededFontPriority = True
         .BmpExportType = 2 ' FilterSVGLib.svgPng
'            .BmpExportType = 0 ' FilterSVGLib.svgJpg
         .EmbedImages = True
         .UseDecimalPrecision = True
         
         If Not logger Is Nothing Then logger.logINFO "Exportiere SVG: '" & finalExportFilePath & "' ..."
         .finish
         If Not logger Is Nothing Then logger.logINFO "Exportiert"
     End With
    
    
    
    svgDocument.Close
    'TODO zum vorherigem Dokument zurückkehren (Es kann sein, dass zwischen diesem und dem Dokument aus dem die SVG kopiert wurde
    ' ein anderes Dokument liegt, welches nach der Schließung diesen Dokuments ausgewählt wird)
    previousDocument.Activate
    
    If Not logger Is Nothing Then logger.removeTab
End Function
