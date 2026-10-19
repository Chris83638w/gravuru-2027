Attribute VB_Name = "PlaceFileSubJob"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False

Public name As String ' Achtung: Gibt es auch bei den PlaceFileJobs

Public parentJob As PlaceFileJob
Public cloneHistory As New collection ' Die Jobs von dem dieser Job geklont wurde (Verweist erstmal auf sich selbst)

' Datei-Info
Public imageFolder As String
Public imageName As String
Public imageType As String
Public imagePathRelativeToPlaceableImageFiles As Boolean 'Ob der Bildpfad sich im "Platzierbare Bildateien"-Ordner befindet. Wenn ja, wird der Pfad beim nutzen vorne angefügt

' Form-Eigenschaften (Falls eine Form platziert werden soll und keine Datei)
Public shapeType As cdrShapeType
Public shapeColor As color
Public shapeColorOutline As color
Dim shapeColorIsAutoRedOrPink As Boolean
Public roundCornersInMM As Double


' Platzierungs-Einstellungen:
' Auf welchen Formen soll platziert werden/ welche Eigenschaften sollen diese haben
Public widthToPutOnMin As Double
Public widthToPutOnMax As Double
Public heightToPutOnMin As Double
Public heightToPutOnMax As Double
Public areaToPutOnMin As Double
Public areaToPutOnMax As Double

Public productShapeToPlaceOn As ProductShapeInfo
Dim productShapesToAvoid As New collection

Public placeOnMainRedShape As Boolean
Public p_placeOnMainRedShapeBleed As Boolean
Public p_mainRedShapeBleedSizeInMM As Double
Public placeOnGroupBoundingBox As Boolean
Public placeOnShapeWithName As Boolean
Public shapeNameToPlaceOn As String
Public deleteShapeToPlaceOnAtEnd As Boolean
Public placeOnBlueShape As Boolean ' Übergangslösung, bis man sehr spezifisch definieren kann, auf welchen Formen man platzieren will

Public placeOnVerticalShapes As Boolean
Public placeOnHorizontalShapes As Boolean
Public placeOnHorizontalShapesTollerancePercent As Double ' Von 0-1. Sorgt dafür, dass auch leicht vertikale Formen (fast quadratisch aber eben doch bisschen höher) als horizontal gesehen werden

Public placeOnGravingLayers As Boolean ' Wenn true, dann kann die zu platzierende Datei auf eine Form platziert werden, die Gravur/rot ist
Public placeOnPrintLayers As Boolean ' Wenn true, dann kann die zu platzierende Datei auf eine Form platziert werden, die UV-Druck/pink ist

Public shapeTypesToPutOn As New collection
Public partsToPutOn As New collection
Public layersToPutOn As New collection ' TODO

Public subPathTypesToPutOn As New collection
Public subPathImageIntersectWithWholeShape As Boolean

Public fillShape As Boolean 'Erstellt eine Kopie der zu füllenden Form und füllt sie dann mit einer Textur
Public cutToShape As Boolean 'Das Bild, welches platziert wird, wird anhand der roten/pinken Formen vom Design zugeschnitten
Public cutDesign As Boolean ' Wird eine Form platziert, schneidet diese das Design zu

Public placeMaximumCount As Integer ' Achtung: Gibt es auch bei den PlaceFileJobs
Dim placeMaximumCountCounters() As Variant ' Achtung: Gibt es auch bei den PlaceFileJobs. Zählt für jede einzelne Schicht. Aufbau Part > Schicht (2 dimensionales Array) ' Kann leider nicht Public sein :( VBAAAAA

Public minimumShapesToFind As Integer ' Dateien/Bilder können auch auf einer ShapeRange platziert werden. Z.B: ein Kordelband auf 2 Kordellöcher
Public foundShapesToPlaceOn As shapeRange
Public subtractFromFoundShapesToPlaceOn As collection 'Collection nutzen, da Corel abstürzt, wenn man Nothing zu einer ShapeRange hinzufügt

' Wenn 'minimumShapesToFind' > 1 ist und ausreichend Formen gefunden wurden, wird nochmal geprüft, ob die Größe dieser Formen passt
Public widthToPutOnFoundShapesMin As Double
Public widthToPutOnFoundShapesMax As Double
Public heightToPutOnFoundShapesMin As Double
Public heightToPutOnFoundShapesMax As Double


' Skalierung
Public specificWidth As Double
Public specificHeight As Double

Public widthSizeType As SizeType
Public heightSizeType As SizeType

Enum SizeType
    shapeToPutOnSizeType = 0 ' Die größe von der Form auf der es platziert wird
    imageSizeType ' Die Originale Bildgröße
    specificSizeType ' zb 25
    propotionalSizeType ' Wenn nur eine Seite nach einem Typ skaliert wird. Z.B. wird die Höhe anhand des shapeToPutOn gesetzt und die breite dann proportional. Macht aber nur Sinn wenn die andere Größe (Breite oder Höhe) imageSizeType nutzt
    fillProportional ' Füllt die Form auf der es platziert aus, aber ohne unproportial zu sein. Deshalb wird es in den meisten Fällen über die Form herausragen. Es ist so wie Windows Hintergründe platziert. Alles wird proportional gefüllt. Evtl. wird was abgeschnitten
End Enum

Public pathOffset As Double ' In mm. Vergrößert/verkleinert den Pfad
Public pathOffsetCornerType As cdrContourCornerType ' = cdrContourCornerMiteredBevel gibt eckige Ecken


' Ausrichten-Eigenschaften
' Diese Form wird standartmäßig mittig auf die passende gefundene Form platziert.
' Ist 'alignXTarget' aber nicht 0 sondern -1 dann wird diese Form auf den linken Rand der gefundenen Form platziert (Der Mittelpunkt dieser Form ist dann auf der linken Außenlinie der gefundenen Form)
' Ist 'alignX' nicht 0 sondern -1 dann wird diese Form nicht mit seinem Mittelpunkt mittig auf die gefundenen Form platziert, sondern mit seinem linken Rand
' Ist 'alignXOffset' nicht 0 sondern 1 dann wird die Form am Ende nochmals um 1mm nach rechts verschoben
' In der PlaceFile.positionShape werden diese Werte genutzt
Public alignXTarget As Double '0 = Center, -1 Left, +1 Right. Kann auch zwischen -1 und 1 sein. Z.B: 0.1
Public alignYTarget As Double '0 = Center, -1 Bottom, +1 Top
Public alignX As Double '0 = Center, -1 Left, +1 Right.
Public alignY As Double '0 = Center, -1 Bottom, +1 Top
Public alignXOffset As Double ' in mm
Public alignYOffset As Double ' in mm


Public mainShapeAddModee As MainShapeAddMode

' Wo soll das neue Shape einsortiert/platziert werden
Public orderShapeAllBehind As Boolean ' Ganz nach hinten in der Gruppe einsortieren (Wenn false dann ganz oben)
Public orderShapeAboveMainRedShape As Boolean
'Public orderAsOwnDesignLayer As Boolean


' Shape-Eigenschaften nach dem Platzieren
Public emtpyShapeName As Boolean ' Soll der Name leer sein? So dass Coreldraw den Anzeigename bestimmt
Public shapeName As String 'Der Name, der am Ende der Ebene/Shape gegeben wird
Public exportable As Boolean 'Wenn es exportierbar ist, bekommt es ein > Zeichen
Public transparency As Integer


' Gruppieren
Public groupPlacedShapes As Boolean
Public groupPlacedShapesMinimumAmount As Integer
Public addGroupChildCountToGroupName As Boolean
Public groupName As String


' Zuschneiden
Public subtractSmallerShapes As Boolean ' Wenn aktiv, dann werden die kleineren roten/pinken Formen von dem platzierten Bild subtrahiert. Sieht nachher so aus, als wenn es auf dem Design liegt (wenn auch fillShape an ist)
Public subtractMainShape As Boolean ' Wenn aktiv, dann wird die rote/pinke Hauptform von dem platzierten Bild subtrahiert. Sieht nachher so aus, als wenn es hinter/außerhalb des Designs liegt
Public subtractVisualMainShape As Boolean ' Ist das gleiche wie "subtractMainShape". Nur das hier nicht immer die Hauptform zum Zuschneiden genommen wird. Wenn eine Schiefer-Grundplatte vorhanden ist, wird diese genommen
Public subtractDesignShapes As Boolean ' Macht Sinn bei roten Formen. Schneidet dann bspw ein Loch in das Design
Public removeBitmapCutForExport2 As Boolean ' Wenn eine platzierte Datei, die mit diesem Job platziert wurde, mit dem Export2 exportiert wird, dann wird der Bitmapszuschnitt entfernt

' Boolesche Operation gegen die Formen, die der vorherige SubJob auf derselben Schicht platziert hat
Public booleanOperationWithPreviousSubJob As ShapeBooleanOperation ' Standard = noOperation
Public booleanOperationLeaveSource As Boolean ' Wenn False (Standard), wird die aktuelle (schneidende) Form nach der Operation gelöscht
Public booleanOperationLeaveTarget As Boolean ' Wenn False (Standard), wird die vorherige Form durch das Ergebnis ersetzt

Public productIDSuffix As String ' Wird der Artikelnummer hinten angehängt, wenn vorhanden
Public useProductIDSuffix As Boolean

' Verschmelzen
Public merge As Boolean
Public mergeWithShapeWithName As String
Public mergeWithShapeWithType As cdrShapeType
Public mergeWithShapeRecursive As Boolean
Public mergeWithShapeWithQuery As String

' Eigenschaften für andere Skripte
Dim groundPlateTextureColorForText As color ' Hat einen Getter. Diesen nutzen. Bedeutung: Wenn z.B. ein Edelstahltext für den Fancy exportiert werden soll, dann kann der Text keine Textur haben. Stattdessen soll diese Farbe genutzt werden
Dim groundPlateMaterialName As String
Public isForPrint As Boolean
Public amazonImportGroundPlateNameInConfi As String ' Wird benutzt um Grundplatten im Konfi zu erkennen
Public maskType As Integer
Public isDarkGraving As Boolean ' Wenn True, dann ist die Gravur auf dem Material schwarz (auf Holz z.B.). Ansonsten Weiß (auf Acryl Klar z.B.)

'
'Public fillColor As color ' TODO wird scheinbar nicht genutzt. Löschen?? ?? ?? ?


Public Function init(job As PlaceFileJob, Optional asClone As Boolean = False)

    Set parentJob = job
    
    ' INIT
    ' Wenn dieser Job ein Klon ist, sind diese Werte bereits gesetzt und werden übersprungen
    If Not asClone Then
        imagePathRelativeToPlaceableImageFiles = True
        placeOnVerticalShapes = True
        placeOnHorizontalShapes = True

        widthSizeType = SizeType.shapeToPutOnSizeType ' Tritt hier ein Fehler auf, liegt es nicht an dieser Stelle. Einfach oben bei 'SizeType' dem 'shapeToPutOnSizeType' eine ' = 0' anhängen
        heightSizeType = SizeType.shapeToPutOnSizeType

        mergeWithShapeWithType = cdrNoShape
        mergeWithShapeRecursive = True
        
        minimumShapesToFind = 1
        exportable = True
        
        placeMaximumCount = 20
        
        placeOnGravingLayers = True
        placeOnPrintLayers = True
        
        placeOnHorizontalShapesTollerancePercent = 0.001
        
        cloneHistory.add Me
    End If
End Function



' Die Form, die platziert wird, ist eine rote/pinke Form
' Die Farbe wird je nach bereits vorhandenen Farben (rot/pink) gesetzt
' Ist noch keine rote/pinke Form vorhanden, wird im Design nachgesehen, ob es UV oder Gravur ist
Public Function setShapeColorIsAutoRedOrPink(subtractShapeFromDesignVar As Boolean, Optional shapeColorIsAutoRedOrPinkVar As Boolean = True)
    subtractDesignShapes = subtractShapeFromDesignVar
    shapeColorIsAutoRedOrPink = shapeColorIsAutoRedOrPinkVar
End Function

Public Function isShapeColorIsAutoRedOrPink() As Boolean
    isShapeColorIsAutoRedOrPink = shapeColorIsAutoRedOrPink
End Function


' Legt fest, dass die von diesem SubJob platzierte Form mit der Form des vorherigen SubJobs verrechnet wird
Public Function setBooleanOperationWithPreviousSubJob(operation As ShapeBooleanOperation, _
    Optional leaveSource As Boolean = False, Optional leaveTarget As Boolean = False)
    booleanOperationWithPreviousSubJob = operation
    booleanOperationLeaveSource = leaveSource
    booleanOperationLeaveTarget = leaveTarget
End Function



Public Function setPlaceOnMainRedShapeBleed(Optional bleedInMM As Double = -1) ' bei -1 wird der aktuelle Beschnittzugaben-Standart genutzt
    p_mainRedShapeBleedSizeInMM = bleedInMM
    p_placeOnMainRedShapeBleed = True
    
    placeOnMainRedShape = False
End Function


Public Function getWidthSizeType() As SizeType
    getWidthSizeType = widthSizeType
End Function

Public Function getSpecificWidth() As Double
   getSpecificWidth = specificWidth
End Function

Public Function getWidth(shapesToPutOn As shapeRange, imageShape As shape) As Double
    Select Case widthSizeType
    Case shapeToPutOnSizeType
        getWidth = shapesToPutOn.SizeWidth
    Case imageSizeType
        getWidth = imageShape.SizeWidth
    Case specificSizeType
        getWidth = ActiveDocument.ToUnits(specificWidth, cdrMillimeter)
    Case propotionalSizeType
        
        If imageShape Is Nothing Then
            getWidth = getHeight(shapesToPutOn, imageShape) * (imageShape.SizeWidth / imageShape.SizeHeight)
        End If
    Case fillProportional
        
        If shapesToPutOn.SizeWidth / shapesToPutOn.SizeHeight > imageShape.SizeWidth / imageShape.SizeHeight Then
            getWidth = shapesToPutOn.SizeWidth
        Else
            getWidth = shapesToPutOn.SizeHeight * imageShape.SizeWidth / imageShape.SizeHeight
        End If
        
  End Select
End Function

Public Function setWidth(width As Double)
    specificWidth = width
    widthSizeType = specificSizeType
End Function

Public Function setWidthToImage()
    widthSizeType = imageSizeType
End Function

Public Function setWidthToShapeToPlaceOn()
    widthSizeType = shapeToPutOnSizeType
End Function

Public Function setWidthProportional()
    widthSizeType = propotionalSizeType
End Function

Public Function setWidthFillProportional()
    widthSizeType = fillProportional
End Function



Public Function getHeightSizeType() As SizeType
    getHeightSizeType = heightSizeType
End Function

Public Function getSpecificHeight() As Double
    getSpecificHeight = specificHeight
End Function


Public Function getHeight(shapesToPutOn As shapeRange, imageShape As shape) As Double
    Select Case heightSizeType
    Case shapeToPutOnSizeType
        getHeight = shapesToPutOn.SizeHeight
    Case imageSizeType
        getHeight = imageShape.SizeHeight
    Case specificSizeType
        getHeight = ActiveDocument.ToUnits(specificHeight, cdrMillimeter)
    Case propotionalSizeType
        If imageShape Is Nothing Then
            getHeight = getWidth(shapesToPutOn, imageShape) * (imageShape.SizeHeight / imageShape.SizeWidth)
        End If
    Case fillProportional
        If shapesToPutOn.SizeWidth / shapesToPutOn.SizeHeight < imageShape.SizeWidth / imageShape.SizeHeight Then
            getHeight = shapesToPutOn.SizeHeight
        Else
            getHeight = shapesToPutOn.SizeWidth * imageShape.SizeHeight / imageShape.SizeWidth
        End If
    End Select
End Function

Public Function setHeight(height As Double)
    specificHeight = height
    heightSizeType = specificSizeType
End Function

Public Function setHeightToImage()
    heightSizeType = imageSizeType
End Function

Public Function setHeightToShapeToPlaceOn()
    heightSizeType = shapeToPutOnSizeType
End Function

Public Function setHeightProportional()
    heightSizeType = propotionalSizeType
End Function

Public Function setHeigthFillProportional()
    heightSizeType = fillProportional
End Function




Public Function setMinMaxSize(width As Double, height As Double, Optional tolerance As Double = 10, Optional area As Double = -1, Optional areaTolerance As Double = -1)
    widthToPutOnMin = width - tolerance
    widthToPutOnMax = width + tolerance
    heightToPutOnMin = height - tolerance
    heightToPutOnMax = height + tolerance
    
    If Not area = -1 Then
        If Not areaTolerance = -1 Then
            areaToPutOnMin = area - areaTolerance
            areaToPutOnMax = area + areaTolerance
        Else
            areaToPutOnMin = area
            areaToPutOnMax = area
        End If
    End If
    
End Function

Public Function setMinMaxSize2(minWidth As Double, maxWidth As Double, minHeight As Double, maxHeight As Double, Optional minArea As Double = -1, Optional maxArea As Double = -1)
    widthToPutOnMin = minWidth
    widthToPutOnMax = maxWidth
    heightToPutOnMin = minHeight
    heightToPutOnMax = maxHeight
    
    If Not minArea = -1 Then
        areaToPutOnMin = minArea
    End If
    
    If Not maxArea = -1 Then
        areaToPutOnMax = maxArea
    End If
    
End Function

Public Function setMinMaxSizeByProductShapeInfo(pShapeInfo As ProductShapeInfo)
    Dim widthTolerance As Double
    widthTolerance = pShapeInfo.width * ProductRecognizer.getSizeToleranceFactor
    
    Dim heightTolerance As Double
    heightTolerance = pShapeInfo.height * ProductRecognizer.getSizeToleranceFactor
    
    widthToPutOnMin = pShapeInfo.width - widthTolerance / 2
    widthToPutOnMax = pShapeInfo.width + widthTolerance / 2
    heightToPutOnMin = pShapeInfo.height - heightTolerance / 2
    heightToPutOnMax = pShapeInfo.height + heightTolerance / 2
    
    Dim areaTolerance As Double
    areaTolerance = pShapeInfo.area * ProductRecognizer.getAreaToleranceFactor
    
    areaToPutOnMin = pShapeInfo.area - areaTolerance / 2
    areaToPutOnMax = pShapeInfo.area + areaTolerance / 2
End Function



Public Function setAlignOffsetScale(scalee As Double, Optional onX As Boolean = True, Optional onY As Boolean = True)
    
    If onX Then setAlignXOffsetScale scalee
    If onY Then setAlignYOffsetScale scalee
    
End Function

Public Function setAlignXOffsetScale(scalee As Double)
    alignXOffset = Math.Sgn(alignXOffset) * scalee
End Function

Public Function setAlignYOffsetScale(scalee As Double)
    alignYOffset = Math.Sgn(alignYOffset) * scalee
End Function

Public Function setShapeColor(r, g, b)
    Set shapeColor = CreateRGBColor(r, g, b)
End Function

Public Function setShapeColorCMYK(c, m, y, k)
    Set shapeColor = CreateCMYKColor(c, m, y, k)
End Function

Public Function setShapeColorOutline(r, g, b)
    Set shapeColorOutline = CreateRGBColor(r, g, b)
End Function

Public Function setShapeColorOutlineCMYK(c, m, y, k)
    Set shapeColorOutline = CreateCMYKColor(c, m, y, k)
End Function

Public Function setShapeColorOutlineHex(hex As String)
    Set shapeColorOutline = New color
    shapeColorOutline.HexValue = hex
End Function


Public Function addShapeTypeToPutOn(shapeType As cdrShapeType)
    shapeTypesToPutOn.add CInt(shapeType) ' A
    'MsgBox "Adding " & CStr(shapeType)
End Function


Public Function addShapeTypeToPutOnCustom(shapeType As customShapeType)
    shapeTypesToPutOn.add CInt(shapeType) + CInt(cdrEPSShape) + 1 ' Letzes ShapeType aus cdrShapeType (als Offset, damit sich die Typen cdrShapeType und customShapeType nicht überschneiden)
End Function

Public Function addSubPathTypeToPutOn(subPathType As subPathType)
    subPathTypesToPutOn.add subPathType
End Function


Public Function hasShapeType(shapeType As cdrShapeType) As Boolean
    
    hasShapeType = Globals.ItemExistsInCollection(shapeType, shapeTypesToPutOn)
    
    'MsgBox "Compare " & shapeTypeAsString & ". Contains=" & ItemExistsInCollection(shapeTypeAsString, shapeTypesToPutOn)
End Function


' Prüft, ob das Shape von einem bestimmten Typ ist. Entweder eine Shapetyp von Corel (cdrCurveSHape) oder ein eigener Typ (redOrPinkShape)
Public Function isShapeOkToPlaceOn(shape As shape) As Boolean
    
    If shapeTypesToPutOn.count = 0 Then
        isShapeOkToPlaceOn = True
        Exit Function
    End If
    
    For i = 1 To shapeTypesToPutOn.count
    
        Dim shapeTypeIndex As Integer
        
        ' Corels cdrShapeType
        If (shapeTypesToPutOn(i) <= CInt(cdrEPSShape)) Then
            If shape.Type = shapeTypesToPutOn(i) Then
                isShapeOkToPlaceOn = True
                Exit Function
            End If
            
        ' Eigener customShapeType
        Else
'            MsgBox "Compare ShapeType=" & shape.Type & ", customType=" & (shapeTypesToPutOn(i) - cdrEPSShape - 1)
            If newCustomShapeTypeQuery(shape, shapeTypesToPutOn(i) - cdrEPSShape - 1).isShapesMatchingQueryNonRecursive Then
                isShapeOkToPlaceOn = True
'                MsgBox "Correct"
                Exit Function
            End If
'            MsgBox "Wrong"
        End If
        
    Next i
    
End Function



Public Function isSubPathOkToPlaceOn(subPath As subPath) As Boolean
    Let typeOfCurve = Globals.getSubPathType(subPath)

    For i = 1 To subPathTypesToPutOn.count
        If subPathTypesToPutOn(i) = Globals.subPathType.AnySubPath Then
            isSubPathOkToPlaceOn = True
            Exit Function
        ElseIf typeOfCurve = subPathTypesToPutOn(i) Then
            isSubPathOkToPlaceOn = True
            Exit Function
        End If
    Next i
End Function


Public Function setPadding(newPadding As Double)
    padding = newPadding
End Function



Public Function setImagePath(path As String)
    
    Dim folderFileAndType() As String
    folderFileAndType = Globals.getFolderFileAndType(path)
    
    'imagePath = path
    imageFolder = folderFileAndType(0)
    imageName = folderFileAndType(1)
    imageType = folderFileAndType(2)
    
    If InStr(path, ".") = 0 Then
        MsgBox "[PlaceFileSubJob.setImagePath] Der Pfad '" & path & "' enthält keine Dateiendung!", vbCritical
        Globals.endMacro
    End If
    
    shapeName = imageName
    
    'MsgBox "Path = " & imagePath & ", imageName=" & imageName & ", imageType=" & imageType
    
End Function



Public Function getImagePath() As String
    
    'MsgBox "Getting image path = " & imageFolder & imageName & imageType
    
    getImagePath = imageFolder & imageName & imageType

End Function





Public Function getPlaceMaximumCountCounters() As Variant()
    getPlaceMaximumCountCounters = placeMaximumCountCounters
End Function

Public Function getPlaceMaximumCountCountersValueByLayer(layer As ProductDesignLayer) As Integer
    getPlaceMaximumCountCountersValueByLayer = getPlaceMaximumCountCountersValue(layer.getPartIndex, layer.getLayerIndex)
End Function

Public Function getPlaceMaximumCountCountersValue(partIndex As Integer, layerIndex As Integer) As Integer
    getPlaceMaximumCountCountersValue = placeMaximumCountCounters(partIndex)(layerIndex)
End Function

Public Function setPlaceMaximumCountCountersValueByLayer(layer As ProductDesignLayer, value As Integer)
    setPlaceMaximumCountCountersValue layer.getPartIndex, layer.getLayerIndex, value
End Function

Public Function setPlaceMaximumCountCountersValue(partIndex As Integer, layerIndex As Integer, value As Integer)
     placeMaximumCountCounters(partIndex)(layerIndex) = value
End Function

Public Function resetPlaceMaximumCountCounters(design As productDesign)
    ReDim placeMaximumCountCounters(1 To design.getPartsCount)
    
    For i = 1 To design.getPartsCount
    
        Dim arr() As Integer
        ReDim arr(1 To design.getPart(i).count)
        
        placeMaximumCountCounters(i) = arr
    Next i
End Function





Public Function getGroundPlateMaterialName() As String
    If groundPlateMaterialName = "" Then
        getGroundPlateMaterialName = parentJob.name
    End If
End Function


Public Function setGroundPlateMaterialName(name As String)
    groundPlateMaterialName = name
End Function


Public Function isNameTopLevel() As Boolean
    isNameTopLevel = parentJob.getGroupName = ""
End Function


' Wenn dieser SubJob vom parentJob gruppiert wird und die Gruppe mit einem Namen versehen wird,
' dann wird der Gruppenname returnt.
' Ansonsten der eigene Name
Public Function getTopLevelName()
    
    Dim parentTopLevelName As String
    parentTopLevelName = parentJob.getGroupName
    
    If parentTopLevelName = "" Then
        getTopLevelName = getNameForPlacedShape
    Else
        getTopLevelName = parentTopLevelName
    End If
End Function


Public Function getGroundPlateTextureColorForText() As color
    
    If Not shapeColor Is Nothing Then
        ' Wenn es eine Formfarbe gibt, wird keine 'groundPlateTextureColorForText' benötigt
        Set getGroundPlateTextureColorForText = shapeColor
    Else
        Set getGroundPlateTextureColorForText = groundPlateTextureColorForText
    End If
    
End Function

Public Function setGroundPlateTextureColorForText(color As color)
    Set groundPlateTextureColorForText = color
End Function


Public Function getNameForPlacedShape() As String
    getNameForPlacedShape = IIf(exportable, ">", "") & IIf(shapeName = "", imageName, shapeName)
End Function


Public Function getNameForGroupingPlacedShapes(groupShape As shape) As String
    If Not groupName = "" Then
        getNameForGroupingPlacedShapes = groupName
    ElseIf groupShape.Type = cdrGroupShape Then
    
        If Not groupShape.shapes.count = 0 Then
            If Not groupShape.shapes.First.name = "" Then
                getNameForGroupingPlacedShapes = IIf(exportable, ">", "") & IIf(addGroupChildCountToGroupName, groupShape.shapes.count, "") & _
                    Right(groupShape.shapes.First.name, Len(groupShape.shapes.First.name) - 1)
            Else
                getNameForGroupingPlacedShapes = ""
            End If
        End If
        
        
    Else
        getNameForGroupingPlacedShapes = getNameForPlacedShape()
    End If
End Function



Public Function getRegexPatternForGroupedShapesWithNumber() As String
    
    Dim endlessDigits As String
    endlessDigits = "\d*"
    
    getRegexPatternForGroupedShapesWithNumber = IIf(exportable, ">", "") & endlessDigits & IIf(shapeName = "", imageName, shapeName)
    
End Function



Public Function addProductShapeInfoToAvoid(shapeInfo As ProductShapeInfo)
    If shapeInfo Is Nothing Then Err.Raise vbObjectError + 513, , "[PlaceFileSubJob.addProductShapeInfoToAvoid] 'shapeInfo' ist Nothing "
    productShapesToAvoid.add shapeInfo
End Function

Public Function removeProductShapeInfoToAvoid(shapeInfo As ProductShapeInfo)
    Globals.deleteCollectionItem productShapesToAvoid, shapeInfo
End Function

Public Function clearProductShapeInfoToAvoid()
    Globals.clearCollection productShapesToAvoid
End Function

Public Function getProductShapeInfoToAvoid() As collection
    Set getProductShapeInfoToAvoid = productShapesToAvoid
End Function

Public Function getSubJobInfosForLogging() As String
    
    Dim subJobIndexInParent As Integer
    For i = 1 To parentJob.subJobs.count
        If parentJob.subJobs(i) Is Me Then
            subJobIndexInParent = i
            Exit For
        End If
    Next i
    
    getSubJobInfosForLogging = "subJob #" & subJobIndexInParent & "(name: " & name & ", shapeName: " & shapeName & ") aus dem Job " & parentJob.name
    
End Function


Public Function clone(Optional add As Boolean = True) As PlaceFileSubJob
    
    Dim subJobClone As New PlaceFileSubJob
    
    If add Then
        subJobClone.init parentJob
        parentJob.subJobs.add subJobClone
    End If
    
    
    subJobClone.name = name
    
    subJobClone.alignX = alignX
    subJobClone.alignY = alignY
    subJobClone.alignXTarget = alignXTarget
    subJobClone.alignYTarget = alignYTarget
    subJobClone.alignXOffset = alignXOffset
    subJobClone.alignYOffset = alignYOffset
    subJobClone.areaToPutOnMax = areaToPutOnMax
    subJobClone.areaToPutOnMin = areaToPutOnMin
    subJobClone.cutToShape = cutToShape
    subJobClone.cutDesign = cutDesign
    subJobClone.fillShape = fillShape
    subJobClone.heightToPutOnMax = heightToPutOnMax
    subJobClone.heightToPutOnMin = heightToPutOnMin
    subJobClone.imageName = imageName
    subJobClone.imageFolder = imageFolder
    subJobClone.imageType = imageType
    subJobClone.imagePathRelativeToPlaceableImageFiles = imagePathRelativeToPlaceableImageFiles
    subJobClone.shapeName = shapeName
    subJobClone.emtpyShapeName = emtpyShapeName
    subJobClone.placeOnMainRedShape = placeOnMainRedShape
    subJobClone.placeOnGroupBoundingBox = placeOnGroupBoundingBox
    subJobClone.orderShapeAllBehind = orderShapeAllBehind
    subJobClone.orderShapeAboveMainRedShape = orderShapeAboveMainRedShape
    subJobClone.placeOnHorizontalShapes = placeOnHorizontalShapes
    subJobClone.placeOnVerticalShapes = placeOnVerticalShapes
    subJobClone.placeOnHorizontalShapesTollerancePercent = placeOnHorizontalShapesTollerancePercent
    Set subJobClone.shapeColor = shapeColor
    Set subJobClone.shapeColorOutline = shapeColorOutline
    subJobClone.shapeType = shapeType
    For i = 1 To shapeTypesToPutOn.count
        subJobClone.shapeTypesToPutOn.add shapeTypesToPutOn.item(i)
    Next i
    subJobClone.subtractSmallerShapes = subtractSmallerShapes
    subJobClone.transparency = transparency
    subJobClone.widthToPutOnMax = widthToPutOnMax
    subJobClone.widthToPutOnMin = widthToPutOnMin
    
    subJobClone.widthSizeType = widthSizeType
    subJobClone.heightSizeType = heightSizeType
    
    subJobClone.specificWidth = specificWidth
    subJobClone.specificHeight = specificHeight
    
    subJobClone.productIDSuffix = productIDSuffix
    subJobClone.useProductIDSuffix = useProductIDSuffix
    
    subJobClone.subtractDesignShapes = subtractDesignShapes
    subJobClone.setShapeColorIsAutoRedOrPink subtractDesignShapes, shapeColorIsAutoRedOrPink
    
    subJobClone.merge = merge
    subJobClone.mergeWithShapeWithName = mergeWithShapeWithName
    subJobClone.mergeWithShapeWithType = mergeWithShapeWithType
    subJobClone.mergeWithShapeRecursive = mergeWithShapeRecursive
    subJobClone.mergeWithShapeWithQuery = mergeWithShapeWithQuery
    
    subJobClone.subtractVisualMainShape = subtractVisualMainShape
    subJobClone.subtractMainShape = subtractMainShape
    subJobClone.removeBitmapCutForExport2 = removeBitmapCutForExport2

    subJobClone.booleanOperationWithPreviousSubJob = booleanOperationWithPreviousSubJob
    subJobClone.booleanOperationLeaveSource = booleanOperationLeaveSource
    subJobClone.booleanOperationLeaveTarget = booleanOperationLeaveTarget
    
    subJobClone.mainShapeAddModee = mainShapeAddModee
    
    subJobClone.pathOffset = pathOffset
    subJobClone.pathOffsetCornerType = pathOffsetCornerType
    
    subJobClone.p_mainRedShapeBleedSizeInMM = p_mainRedShapeBleedSizeInMM
    subJobClone.p_placeOnMainRedShapeBleed = p_placeOnMainRedShapeBleed
    subJobClone.imagePathRelativeToPlaceableImageFiles = imagePathRelativeToPlaceableImageFiles
    
    subJobClone.roundCornersInMM = roundCornersInMM
    
    subJobClone.minimumShapesToFind = minimumShapesToFind
    subJobClone.placeMaximumCount = placeMaximumCount
    
    subJobClone.widthToPutOnFoundShapesMin = widthToPutOnFoundShapesMin
    subJobClone.widthToPutOnFoundShapesMax = widthToPutOnFoundShapesMax
    subJobClone.heightToPutOnFoundShapesMin = heightToPutOnFoundShapesMin
    subJobClone.heightToPutOnFoundShapesMax = heightToPutOnFoundShapesMax
    subJobClone.exportable = exportable
    
    subJobClone.groupPlacedShapes = groupPlacedShapes
    subJobClone.groupPlacedShapesMinimumAmount = groupPlacedShapesMinimumAmount
    subJobClone.addGroupChildCountToGroupName = addGroupChildCountToGroupName
    subJobClone.groupName = groupName
    
    subJobClone.isForPrint = isForPrint
    subJobClone.amazonImportGroundPlateNameInConfi = amazonImportGroundPlateNameInConfi
    subJobClone.isDarkGraving = isDarkGraving
    
    subJobClone.placeOnGravingLayers = placeOnGravingLayers
    subJobClone.placeOnPrintLayers = placeOnPrintLayers
    
    subJobClone.placeOnShapeWithName = placeOnShapeWithName
    subJobClone.shapeNameToPlaceOn = shapeNameToPlaceOn
    subJobClone.deleteShapeToPlaceOnAtEnd = deleteShapeToPlaceOnAtEnd
    subJobClone.placeOnBlueShape = placeOnBlueShape
    
    Set subJobClone.productShapeToPlaceOn = productShapeToPlaceOn
    subJobClone.clearProductShapeInfoToAvoid
    For i = 1 To productShapesToAvoid.count
        subJobClone.addProductShapeInfoToAvoid productShapesToAvoid(i)
    Next i

    
    For i = 1 To subPathTypesToPutOn.count
        subJobClone.subPathTypesToPutOn.add subPathTypesToPutOn(i)
    Next i
    
    subJobClone.cloneHistory.add Me
    
    Set clone = subJobClone
End Function


Public Function delete()
    parentJob.removeItem Me
End Function

