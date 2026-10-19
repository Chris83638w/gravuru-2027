Attribute VB_Name = "PlaceFileShapeCache"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


Dim shapes As New collection
Dim shapesNamesForDebug As New collection
Dim filePaths As New collection
'
Dim shapesWidth As New collection
Dim shapesHeight As New collection


Public Function addShape(shape As shape, filePath As String, fill As Boolean)
    
    shapes.add shape
    shapesNamesForDebug.add Globals.shapeToString(shape)
    filePaths.add filePath
    
    shapesWidth.add shape.SizeWidth
    shapesHeight.add shape.SizeHeight
    
End Function




Public Function getFileShape(path As String, Optional fill As Boolean = False, Optional mainShape As shape, Optional subJob As PlaceFileSubJob, Optional logger As logger) As shape
    
    If Not logger Is Nothing Then
        logger.addTab , "[PlaceFileShapeCache.getFileShape]"
        If Not subJob Is Nothing Then logger.logINFO "subJob.name: '" & subJob.name & "'"
    End If
    
    Dim fileShape As shape
    
    For i = 1 To filePaths.count
        
        If filePaths(i) = path Then
            
            If fill Then
                If Not (shapesWidth(i) = 0 Or shapesHeight(i)) Then
                
                    If Abs(shapesWidth(i) - mainShape.SizeWidth) <= shapesWidth(i) * getSizeToleranceFactor And _
                        Abs(shapesHeight(i) - mainShape.SizeHeight) <= shapesHeight(i) * getSizeToleranceFactor Then
                        
                        Set fileShape = shapes(i) ' Eine Kopie zurückgeben. Niemals das Original, denn das muss unverändert bleiben
                        GoTo ShapeFound
                    End If
                
                End If
            Else
                Set fileShape = shapes(i) ' Eine Kopie zurückgeben. Niemals das Original, denn das muss unverändert bleiben
                GoTo ShapeFound
            End If
            
        End If
        
    Next i
    
    
    
    If Not Globals.fileExist(path) Then
        Err.Raise vbObjectError + 513, , "[PlaceFile.getFile] Die Datei '" & path & "' exestiert nicht"
    End If
    
    ' fileShape wurde nicht im Cache gefunden. Deshalb jetzt laden
    If Not fill Then
        Set fileShape = Globals.load(path)
        If Not logger Is Nothing Then logger.logINFO "Datei geladen: " & Globals.shapeToString(fileShape)
    Else
       Set fileShape = createFilledShape(path, mainShape, subJob)
       If Not logger Is Nothing Then logger.logINFO "Datei geladen & Füllung erstellt: " & Globals.shapeToString(fileShape)
    End If
    addShape fileShape, path, fill
ShapeFound:
    
    ' Eine Kopie zurückgeben. Niemals das Original, denn das muss unverändert bleiben
    Set fileShape = Globals.copyPasteShape(fileShape, True)
    If Not logger Is Nothing Then logger.logINFO "Datei kopiert: " & Globals.shapeToString(fileShape)
    
    Set getFileShape = fileShape
    
    If Not logger Is Nothing Then logger.removeTab
End Function


Private Function getSizeToleranceFactor() As Double
    getSizeToleranceFactor = 0.0005 ' Version 16.0.11
End Function


Private Function createFilledShape(path As String, shape As shape, subJob As PlaceFileSubJob) As shape
    
    
    Dim shapeToFill As shape
    Set shapeToFill = ActiveDocument.ActiveLayer.CreateRectangle2(shape.LeftX, shape.BottomY, shape.SizeWidth, shape.SizeHeight)
    shapeToFill.name = "filledRectShape"
    shapeToFill.outline.SetNoOutline
    shapeToFill.fill.ApplyNoFill
    
    Dim imageSizes() As Integer
    
'    On Error GoTo FileNotFound
    imageSizes = Globals.getImageSize(path)
'    On Error GoTo 0
    
    
    
    Dim textureWidthInPixel As Double
'    If subJob.widthSizeType = shapeToPutOnSizeType Then
'        textureWidthInPixel = ConvertUnits(shapeToFill.SizeWidth, ActiveDocument.Unit, cdrPixel)
'    Else
'        textureWidthInPixel = imageSizes(0)
'    End If
    Select Case subJob.widthSizeType
        Case shapeToPutOnSizeType
            textureWidthInPixel = ConvertUnits(shapeToFill.SizeWidth, ActiveDocument.unit, cdrPixel)
        Case SizeType.imageSizeType
            textureWidthInPixel = imageSizes(1)
        Case SizeType.specificSizeType
            textureWidthInPixel = ConvertUnits(subJob.specificWidth, cdrMillimeter, cdrPixel)
        Case SizeType.propotionalSizeType
            'textureWidthInPixel = textureHeightInPixel * imageSizes(0) / imageSizes(1)
        Case SizeType.fillProportional
            ' TODO
    End Select

    Dim textureHeightInPixel As Double
    Select Case subJob.heightSizeType
        Case shapeToPutOnSizeType
            textureHeightInPixel = ConvertUnits(shapeToFill.SizeHeight, ActiveDocument.unit, cdrPixel)
            
        Case SizeType.imageSizeType
            textureHeightInPixel = imageSizes(1)
            
        Case SizeType.specificSizeType
            textureHeightInPixel = ConvertUnits(subJob.specificHeight, cdrMillimeter, cdrPixel)
            
        Case SizeType.propotionalSizeType
            textureHeightInPixel = textureWidthInPixel * imageSizes(1) / imageSizes(0)
        'TODO fillPropotional
    End Select
    
    ' Wenn die Breite proportional sein soll, wird zuerst die Höhe brerchnet. Darauf basierend kann dann hier die Breite berechnet werden
    If subJob.widthSizeType = propotionalSizeType Then
        textureWidthInPixel = textureHeightInPixel * imageSizes(0) / imageSizes(1)
    End If
    
    
    With shapeToFill.fill.ApplyPatternFill(cdrBitmapPattern, path)
        .MirrorFillX = False
        .MirrorFillY = False
        .TileOffsetType = cdrTileOffsetRow
        .TileOffset = 0
        .RotationAngle = 0#
        .SkewAngle = 0#
        
        ActiveDocument.unit = cdrPixel
        
        ' A
        ' * 1.0001, weil die Textur in seltenen Fällen nicht ganz bis zum Rand geht und dann einen weißen Rand erzeugt
'        .TileWidth = textureWidthInPixel * 1.0001
'        .TileHeight = textureHeightInPixel * 1.0001
        
        ' B
        .TileWidth = max(textureWidthInPixel * 1.0001, ConvertUnits(0.1, cdrInch, cdrPixel)) ' Die minimale Größe ist 0.1 Inch
        .TileHeight = max(textureHeightInPixel * 1.0001, ConvertUnits(0.1, cdrInch, cdrPixel))
        
        .originX = 0#
        .originY = 0#
        
        ActiveDocument.unit = previousUnits
        
        ' Wird für Granit benötigt, damit es beim Amazon/Fancyexport
        .TransformWithShape = True
    End With
    
'    If Not debugDontRasterBitmap() Then
    Set shapeToFill = shapeToFill.ConvertToBitmapEx(, , True, 1200)
'    End If
    
'    Set shapeToFill = saveImageAndLoadAndDeleteFileAndShape(shapeToFill)
    
    Set createFilledShape = shapeToFill
    
End Function


Private Function saveImageAndLoadAndDeleteFileAndShape(image As shape) As shape
    
    Dim folder As String
    folder = Globals.addBackslash(Globals.getTempFolder) & "CorelDraw Script Bitmap Loading\"
    Globals.createFolder folder
    
    Dim fileName As String
    fileName = folder & "Bitmap1"
    
    fileName = Globals.getNextFreeFileName(fileName, False)
    
    newShapeExport(image, fileName, cdrPNG) _
        .setResolutionX(image.bitmap.resolutionX) _
        .setResolutionY(image.bitmap.resolutionY) _
        .setColorizeRDGWhiteToRGB(False) _
        .setColorizeCMYKBlackToRGB(False) _
        .export
    
    Set saveImageAndLoadAndDeleteFileAndShape = Globals.loadImage(fileName & ".png", True)
    
    Globals.deleteFolderContents folder
    image.delete
    
    saveImageAndLoadAndDeleteFileAndShape.name = "filledRectShape"
End Function


Public Function cleanUp(Optional logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[PlaceFileShapeCache.cleanUp]"
    
'    MsgBox "Es sind " & shapes.count & " Shapes im Cache"
    
    While shapes.count > 0
        If Not logger Is Nothing Then logger.logINFO "Lösche " & Globals.shapeToString(shapes(1)) & " bzw. (debugName) : " & shapesNamesForDebug(1)
        shapes(1).delete
        shapes.Remove 1
        shapesNamesForDebug.Remove 1
        
        filePaths.Remove 1
        
        shapesWidth.Remove 1
        shapesHeight.Remove 1
    Wend
    
    If Not logger Is Nothing Then logger.removeTab
End Function
