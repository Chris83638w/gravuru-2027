Attribute VB_Name = "Export1"

' Autor: Martin Afelt GRAVURU
'
' TODO:
' - Wenn ein Shape als "for_product_picture" markiert ist, soll es im Konfi-Modus nicht mit exportiert werden



Public Enum Export1ExportMode
    productPicture
    KonfiGravuru
    KonfiAmazon
    Grundplatten_Look
End Enum

Dim exportMode As Export1ExportMode
Dim photoIndex As Integer

Dim prefixText As String

Dim fileName As String
Dim fileType As String

'Dim useProductNames As Boolean
'Dim ProductNames() As String
'Dim excludeColors() As String
'Dim toWhiteColor() As String

Dim useGroupName As Boolean
Dim useSizeForName As Boolean
Dim searchFontAndColorCode As Boolean
Dim gravurPhotoFX As Boolean


Dim exportSpecialLayers As Boolean
Dim exportSpecialLayersSeperate As Boolean

Public exportPath As String
Dim exportStartIndex As Integer

Public exportPathNewStructure As String
Dim exportToNewStructure As Boolean


'Dim abstandshalter As IPictureDisp


'Dim fontNamesAndColors(10, 2)
'As String

Dim fontNames() As String
Dim fontYPos() As Double
Dim fontColors() As String
'Dim fontsColorsArray() As Variant
'Dim fontColors() As String

Dim fileNames() As String
Dim fileNamesCounter() As Integer

Dim quietMode As Boolean
Dim logger As New logger




Sub export()

    If ActiveDocument Is Nothing Then
        MsgBox "Kein Dokument geöffnet!", vbInformation
        End
    End If
    
    Globals.showWarnings
    
    ExportDialog.ExportButton.SetFocus
    ExportDialog.Show
End Sub





Public Function Start(exportPathVar As String, exportModeVar As Export1ExportMode, exportToNewStructureVar As Boolean, fileTypeVar As String, exportSpecialLayersVar As Boolean, exportSpecialLayersSeperateVar As Boolean, _
    Optional prefixTextVar As String = "", Optional quietModeVar As Boolean = False)
    
    logger.init "Export1"
    
    logger.logINFO "Export1.Start exportPath: '" & exportPath & "'"
    
    exportPath = exportPathVar
    exportMode = exportModeVar
    exportToNewStructure = exportToNewStructureVar
    fileType = fileTypeVar
    prefixText = prefixTextVar
    exportSpecialLayers = exportSpecialLayersVar
    exportSpecialLayersSeperate = exportSpecialLayersSeperateVar
    searchFontAndColorCode = ExportDialog.TextAndColorCodeCheckBox.value
    useGroupName = ExportDialog.UseGroupNameForNameCheckBox.value
    useSizeForName = ExportDialog.UseSizeForNameCheckBox.value
    gravurPhotoFX = ExportDialog.GravurPhotoFXCheckBox.value
    exportStartIndex = CInt(ExportDialog.StartIndexTextBox.value)
    quietMode = quietModeVar
    
    If Not quietMode Then Globals.startMacro
    
    If Not Globals.debugHistory Then
        CorelScriptTools.BeginWaitCursor
        ActiveDocument.BeginCommandGroup "Export"
        If Not Globals.debugErrors Then On Error GoTo MacroError
    End If

    If Not quietMode Then
        Globals.checkIfServerOnlineAndSelectOfflineWorkPath
        Globals.checkVersion
    End If
    
    If Not ActiveDocument Is Nothing Then
        ActiveDocument.unit = cdrMillimeter
        ActiveDocument.Rulers.HUnits = cdrMillimeter
        ActiveDocument.Rulers.VUnits = cdrMillimeter
    End If
    


    'Init
    ReDim fileNames(1) As String
    fileNames(1) = ""
    ReDim fileNamesCounter(1) As Integer
    fileNamesCounter(1) = 0
   
    If Not quietMode Then
        ProgressBarUserForm.Start
    End If
    
    ' Auswahl
    Dim selection As shapeRange
    Set selection = ActiveSelectionRange.ReverseRange ' Rückwärts laufen, da eine Auswahl immer andersherum ist (egal wie man es auswählt?)
    
    If selection.count = 0 Then ' Wenn nichts ausgewählt ist, ...
        Set selection = ActivePage.shapes.All ' ... alle Formen bearbeiten. ...
        selection.RemoveRange ActiveDocument.MasterPage.desktopLayer.shapes.All ' ... Shapes von dem Desktop-Layer nicht beachten.
    End If
    
    
    For i = 1 To selection.count
        prepareExportLayer selection(i)
        If Not quietMode Then ProgressBarUserForm.setProgress i / CDbl(selection.count)
    Next i
    

    
    If Not quietMode Then
        ProgressBarUserForm.Hide
        If Not Globals.debugHistory Then Globals.endMacro True
        
        ' Dokument zurücksetzen
        If GlobalSettingsUserForm.getSetting_ResetDocAfterExport Then ActiveDocument.Undo
    End If
    
    Exit Function
MacroError: 'Alle Fehler hier abfangen und die CommandGruppe beenden, damit man mit einem Schritt zurück gehen kann (STRG + Z)
    MsgBox Err.Description & ", " & Err.number
    ProgressBarUserForm.Hide
    ActiveDocument.Dirty = False ' Nicht speicherbar machen
    Globals.endMacro True
End Function





Public Function prepareExportLayer(layer As shape)
    
    logger.logINFO "[Export1.prepareExportLayer]"
    logger.addTab
    
    logger.logINFO "exportPath: '" & exportPath & "'"
    
    photoIndex = 1

    If Not layer.Type = cdrGroupShape Or Not layer.visible Then
        logger.logINFO "Shape ist keine Gruppe oder nicht sichtbar. Abbrechen!"
        Exit Function
    End If
    
    
    Dim seperator As String
    
    Dim layerFontAndColor As String
    
    
    fileName = ""
    
    If Not exportMode = Grundplatten_Look Then
    
        Dim productID As String
        Dim productIDShape As shape
        Set productIDShape = Globals.getProductIDShape(layer)
        If Not productIDShape Is Nothing Then
            productID = Globals.getProductIDFromShape(productIDShape)
            productIDShape.delete
            Set productIDShape = Nothing
        End If
        
        If Not productID = "" Then
        
            ' Master Design überspringen
            If productID = "MASTER" Then
                GoTo ExitFunction
            End If
            
            fileName = productID
        End If
    
    End If
    
    
    
    If exportMode = Grundplatten_Look Then
        Dim groundPlates As shapeRange
        Set groundPlates = newCustomShapeTypeQuery(layer, groundPlate).setExcludeGivenShape(True).setExcludeInvisibleShapes(True).search
        
        If groundPlates.count > 0 Then
            groundPlates(1).transparency.ApplyNoTransparency
        End If
    End If
    
    
    
    Dim sizeNameVar As String
    
    
    If fileType = "png" Then
        
        'Array leeren / init
        ReDim fontNames(1) As String
        ReDim fontYPos(1) As Double
        ReDim fontColors(1) As String
        fontColors(1) = "!FEHLER!"
        fontYPos(1) = -10000
        
       
        'Textebenen durchsuchen. Wenn dort der Name eines Produktes gefunden wird, wird er (zusammen mit der Größe) als Dateiname verwendet'
        Dim foundedName As String
        
        'If useProductNames Then
            'foundedName = searchName(layer)
        'End If
        
'        If Globals.isMultiDesign(layer) Then
'            MsgBox "Multi Design"
'        End If
        
        
        hideUselessShapes layer.shapes, layer
        
        
        
        Dim lastFontNameAndColor As String
        lastFontNameAndColor = ""
        
        ' !!!                           vv -1 weil das erste Leere nach hinten gerückt wurde
        For i = 1 To UBound(fontNames) - 1
            
            ' Nur wenn nicht schon die letzte Textzeile die selbe Schiftart und Farbe hatte, wird es zum Dateinamen hinzugefügt (ansonsten währe es doppelt)
            If Not StrComp(lastFontNameAndColor, fontNames(i) & "_" & fontColors(i), vbTextCompare) = 0 Then
                layerFontAndColor = layerFontAndColor & "_" & fontNames(i) & "_" & fontColors(i)
            End If
            
            
            
            'MsgBox "Font: " & fontNames(i) & "i=" & i & ", To " & UBound(fontNames)
    
            lastFontNameAndColor = fontNames(i) & "_" & fontColors(i)
        Next i
    End If
    
    
    
    
    
    'Nur vorher unsichtbar machen, wenn es seperat oder garnicht exportiert werrden soll. Nicht aber wenn es zusammen exportiert werden soll
    If exportSpecialLayers = exportSpecialLayersSeperate Then
        findSpecialLayersToHide layer
    End If
    
    

    If useGroupName Then
    
        seperator = ""
        
        If Not fileName = "" Then
            seperator = "_"
        End If
        
        If Globals.endsWith(layer.name, ".cdr") Then
            ' Ohne .cdr
            fileName = fileName & seperator & left(layer.name, Len(layer.name) - 4) + fileName ' TODO ???????????????????????????? + filename  (eig. & filename)
        Else
            fileName = fileName & seperator & layer.name + fileName
        End If
    
        
    End If





    
    If useSizeForName And productID = "" Then
    
        seperator = ""
        
        If Not fileName = "" Then
            seperator = "_"
        End If
        
        If sizeNameVar = "" Then
            
            If newCustomShapeTypeQuery(layer, RedOrPinkShape).search.count > 0 Then
                
                ' Produktname finden
                sizeNameVar = ProductRecognizer.recognizeProductName(layer)
            End If
            
            If exportMode = Grundplatten_Look Then
                If sizeNameVar = "" Then
                    MsgBox "Der Name der Form wurde nicht erkannt! Das ist aber beim Modus Grundplatten-Look wichtig!"
                    End
                End If
            End If
            
            If Not sizeNameVar = "" Then
                fileName = sizeNameVar & seperator & fileName
            Else
                'Breite und Höhe in cm umrechnen'
                Dim layerW As Double
                layerW = ActiveDocument.FromUnits(layer.SizeWidth, cdrCentimeter)
                'Auf halbe Zentimeter runden 2,6 => 2,5'
                layerW = round(layerW * 2, 0) / 2
                
                Dim layerH As Double
                layerH = ActiveDocument.FromUnits(layer.SizeHeight, cdrCentimeter)
                layerH = round(layerH * 2, 0) / 2
                
                fileName = layerW & "x" & layerH & seperator & fileName
            End If
        
    
            If Not exportMode = Grundplatten_Look Then
                fileName = fileName + "_" + CStr(getFileNameCount(fileName) + (exportStartIndex - 1))
            End If
            
            If Not foundedName = "" Then
                fileName = fileName & "_" & foundedName
            End If
        
        Else
            fileName = sizeNameVar
        End If
    End If
    
    
    
    
    

    If Not prefixText = "" Then
        'MsgBox "Adding Prefix=" & prefixText
        fileName = prefixText + "_" + fileName
    End If

    
    ' Wenn keine Artikelnummer vorhanden ist und die Abmessung bzw der Formname nicht genommen werden soll
    If fileName = "" Then
        If layer.name = "" Then
            fileName = "Unbenannt"
        Else
            fileName = layer.name
        End If
    End If
    
    
    
    Dim filePath As String
    filePath = exportPath + fileName
   
    If Not exportMode = Grundplatten_Look Then
        Dim fileNumber As Integer
        fileNumber = 1
        
        'MsgBox CStr(Dir(filename & ".png") = "") 'Exestiert nicht (= Wahr)'
        
        Dim fileExist As Boolean
        
        fileExist = Not Dir(filePath & "." & fileType) = ""
      
        
        
        While fileExist
            'MsgBox filename & " exestiert nicht mit Nr " & fileNumber & " denn:" & CStr(Dir(filename & ".png") = "")
            
            fileNumber = fileNumber + 1
            
            Dim fileNameToCheck As String
            
            fileNameToCheck = filePath & "_" & CStr(fileNumber) & "." & fileType
    
            
            fileExist = Not Dir(fileNameToCheck) = ""
            
            'MsgBox fileNameToCheck & " ist leer  " & CStr(Dir(fileNameToCheck) = "")
        Wend
        
        
        
        If Not fileNumber = 1 Then
            fileName = fileName & "_" & CStr(fileNumber)
        End If
    End If
    
    'MsgBox "Filename=" & filename & ", fileNumber=" & fileNumber
    
    ' Outline von roten/pinken Formen löschen
    Dim redOrPinkShapes As shapeRange
    Set redOrPinkShapes = newCustomShapeTypeQuery(layer, RedOrPinkShape).search
    redOrPinkShapes.Unlock
    For i = 1 To redOrPinkShapes.count
    redOrPinkShapes(i).outline.SetNoOutline
    Next i
    
    'Ebene Auswählen, damit Sie exportiert werden kann'
    layer.CreateSelection
    
    logger.logINFO "exportPath: '" & exportPath & "'"
    exportSelection exportPath & fileName & layerFontAndColor
    
    If exportToNewStructure Then
        If productID = "" Then
            ' layer ist schon aushewählt (^^ oben)
            MsgBox "Für den Export in die neue Struktur ist eine Artikelnummer nötig"
            End
        End If
        Globals.createFolder exportPathNewStructure & productID & "\Produktbilder\PREDATA\"
        exportSelection exportPathNewStructure & productID & "\Produktbilder\PREDATA\" & fileName & layerFontAndColor
        
    End If
    
    If exportSpecialLayers And exportSpecialLayersSeperate And fileType = "png" Then
        
        findSpecialLayersToExport layer, layer, exportPath & fileName
    End If
    
ExitFunction:
    logger.removeTab
    
End Function


Public Function getExportResolution()
    getExportResolution = ActiveDocument.resolution
End Function


Public Function exportSelection(filePath As String)
    
    logger.logINFO "[Export1.exportSelection]"
    logger.addTab
    
    logger.logINFO "filePath: '" & filePath & "'"
    
    ' Wenn der Layer, auf dem die zu exportierenden Shapes liegen, nicht "printable" (Druckbar und exportierbar) ist, werden die Shapes auch nicht exportier
    ' Deshalb muss der Layer vorher auf printable true gesetzt werden
    Dim layerWasPrintable As Boolean
    If ActiveSelectionRange.count > 0 Then
        layerWasPrintable = ActiveSelectionRange.firstShape.layer.Printable
        ActiveSelectionRange.firstShape.layer.Printable = True
    End If
    
    Globals.warnAndEndIfFilePathHasIllegalChars filePath
    

    ' vv Falls ein nicht sichtbares Design exportiert werden soll, kommt ein Error. Der wird ignoriert
    On Error GoTo ErrorHandler
    
    'If ActiveDocument.selection.BoundingBox.width = 0 Then
        'MsgBox "Nichts zum Exportieren!"
        'Exit Function
    'End If
    
    If fileType = "png" Then
    
        'MsgBox "Export as " & exportPath & fileName
    
        Set expFlt = ActiveDocument.ExportBitmap(filePath & ".png", cdrPNG, cdrSelection, cdrRGBColorImage, 0, 0, getExportResolution, getExportResolution, cdrNormalAntiAliasing, False, True, True, False, cdrCompressionNone)
        With expFlt
            .Interlaced = True
            .transparency = 0
            .invertmask = False
            .color = 0
            .finish
        End With
    
    ElseIf fileType = "cdr" Then
        
    

        Dim saveOptions As StructSaveAsOptions
        Set saveOptions = CreateStructSaveAsOptions
        With saveOptions
            .EmbedVBAProject = False
            .filter = cdrCDR
            .IncludeCMXData = False
            .range = cdrSelection
            .EmbedICCProfile = False
            .Version = cdrVersion22
            .KeepAppearance = True
        End With
        ActiveDocument.SaveAsCopy filePath & ".cdr", saveOptions
        
    
    ElseIf fileType = "svg" Then
    
        Dim expopt2 As StructExportOptions
        Set expopt2 = CreateStructExportOptions
        expopt2.useColorProfile = True
        Dim expflt2 As ExportFilter
        Set expflt2 = ActiveDocument.ExportEx(filePath & ".svg", cdrSVG, cdrSelection, expopt2)
        With expflt2
            .Version = 1 ' FilterSVGLib.svgVer11
            .Encoding = 0 ' FilterSVGLib.svgUTF8
            .Styling = 0 ' FilterSVGLib.svgInternalStyleSheet
            .EmbedJavaScript = True
            .width = 210#
            .height = 297#
            .Units = 1 ' FilterSVGLib.svgMillimeters
            .DrawingPrecision = 2 ' FilterSVGLib.svg_1to100
            .FountainSteps = 256
            .TextAsCurves = False
            .EmbedFont = True
            .CharacterSubsetting = 0 ' FilterSVGLib.svgUsedOnly
            .GiveEmbededFontPriority = True
            .BmpExportType = 2 ' FilterSVGLib.svgPng
            .EmbedImages = False
            .UseDecimalPrecision = True
            .finish
        End With
    Else
        logger.logWARN "Ungültiges Dateiformat angegeben: " & fileType
    End If
    
ErrorHandler:
    On Error GoTo 0
    
    If ActiveSelectionRange.count > 0 Then
        ActiveSelectionRange.firstShape.layer.Printable = layerWasPrintable
    End If
    
    logger.removeTab
    
End Function




Private Function findSpecialLayersToHide(shape As shape)

    
    For i = 1 To shape.shapes.count
        If InStr(1, shape.shapes(i).name, ">") = 1 Then
            shape.shapes(i).visible = False
        End If
    
    
        If shape.shapes(i).Type = cdrGroupShape Then
            findSpecialLayersToHide shape.shapes(i)
        End If
    Next i

End Function



Private Function findSpecialLayersToExport(shape As shape, groupShape As shape, path As String)
    
    For i = 1 To shape.shapes.count
        
        
        If InStr(1, shape.shapes(i).name, ">") = 1 Then
        
                    
            hideAllLayersExceptFor shape.shapes(i), groupShape
            
            groupShape.CreateSelection
                
            If exportMode = Grundplatten_Look Then
                exportSelection path
            Else
                'MsgBox "fileName=" & fileName
                exportSelection path & "_" & Right(shape.shapes(i).name, Len(shape.shapes(i).name) - 1)
            End If
                
        ElseIf shape.shapes(i).Type = cdrGroupShape Then
            findSpecialLayersToExport shape.shapes(i), groupShape, path

        End If
        
        
    Next i
    
End Function


Private Function hideAllLayersExceptFor(exceptionShape As shape, shape As shape)
    
    'MsgBox "HideAllLayersExceptFor: " & exceptionShape.Name & ", urrGroup=" & shape.Name
    
    For i = 1 To shape.shapes.count
        
        Dim checkThisShape As Boolean
        checkThisShape = True
        
        If shape.shapes(i).Type = cdrGroupShape Then
        
            checkThisShape = False
            If InStr(1, shape.shapes(i).name, ">") = 1 Then ' Eine Gruppe, die mit > anfängt, enthällt sowieso nur Shapes die auch mit > anfangen. Deshalb nicht durchsuchen. Z.B: >2AH -> >AH, >AH
                checkThisShape = True 'Diese GRuppe durch die Überprüfung unten laufen lassen, da es mit einem > anfängt (muss deshalb vielleicht unsichtbar / sichtbar gemacht werden)
            Else
                hideAllLayersExceptFor exceptionShape, shape.shapes(i)
            End If
            
        End If
        
        
        
        If checkThisShape Then
        
            If Not shape.shapes(i) Is exceptionShape Then
                
                
                Dim shapeVisibility As Boolean
                shapeVisibility = False
                
                If shape.shapes(i).Type > 0 And shape.shapes(i).Type <= 4 Then ' > 0 == kein GroupShape(0) & kein cdrBitmapShape
                    If shape.shapes(i).outline.Type = cdrNoOutline And shape.shapes(i).fill.Type = cdrNoFill Then ' Vermutlich dann ein pinker Rahmen der für den Export keinen Rahmen / Outline hat aber noch sichtbar ist
                        shapeVisibility = True
                    End If
                End If
                
                'MsgBox "Show Shape " & shape.Shapes(i).Name & " : " & CStr(shapeVisibility)
                shape.shapes(i).visible = shapeVisibility
                
                
            Else ' Das exceptionShape sichtbar machen (kann durch vorherige Shapes mit > unsichtbar gemacht worden sein)
                shape.shapes(i).visible = True
            End If
        
        End If
        
        
        
        
         
         
    Next i
    
End Function


'Outdated !!! wurde genutzt um Produktnamen anhand der Texte auf einem Design (z.B. Becker) zu ermitteln. Ist aber viel zu langsam!!
Public Function searchName(shape) As String
    For i = 1 To shape.shapes.count
    
        If shape.shapes(i).Type = cdrTextShape Then
            
            For Each prod In ProductNames
                'MsgBox Prod
                'If layer.Shapes(i).Text.Story == Prod Then
                For j = 1 To Len(shape.shapes(i).text.Story)
                    If Mid(shape.shapes(i).text.Story, j, Len(prod)) = prod Then
                        searchName = prod
                    End If
                Next
            Next
            
        ElseIf shape.shapes(i).Type = cdrGroupShape Then
            searchName = searchName(shape.shapes(i))
        End If
        
        
    Next i
End Function


'Macht unnötige Ebenen vor dem Export für PNG unsichtbar
Public Function hideUselessShapes(shapes As shapes, parentShape As shape)
    For i = 1 To shapes.count
        
        Dim currentShape As shape
        Set currentShape = shapes(i)
    
    
         'Die Schrift "Dein Foto" unsichtbar machen, wenn es ein Produktbild werden soll
        If exportMode = productPicture Then
            If Globals.endsWith(currentShape.name, "deinfoto") Then
                currentShape.visible = False
            End If
        End If
        
        ' Shapes die nur für Produktbilder sind unsichtbar machen, wenn nicht im Modus "Produktbilder"
        If Not exportMode = productPicture Then
            If Globals.isForProductPicture(currentShape) Then
                currentShape.visible = False
            End If
        End If
        
        If exportMode = KonfiGravuru Then
            If Globals.isMotive(currentShape) Then
                'MsgBox "Motiv gefunden"
                currentShape.visible = False
            End If
        End If
        
        If Globals.isViewShape(currentShape) Then
            currentShape.visible = False
        End If
        
    
        
        If currentShape.Type = cdrGroupShape Then
            ' Wenn die Gruppe schon unsichtbar ist, nicht weiter nach Shapes darin suchen um sie unsichtbar zu machen
            If currentShape.visible Then
                hideUselessShapes currentShape.shapes, currentShape
            End If
        ElseIf Globals.isShapePowerclip(currentShape) Then
            hideUselessShapes currentShape.powerClip.shapes, currentShape
        ElseIf currentShape.Type = cdrTextShape Then
        
            If Not exportMode = productPicture Then
            
                ' Bei Konfibildern den Text nicht mitexportieren. Außer der Text ist "text_locked"
                If Not Globals.isTextLocked(currentShape) Then
                    currentShape.visible = False
                End If
                
            End If
           
            
            
            If searchFontAndColorCode Then
            
                If currentShape.fill.Type = cdrUniformFill Then
                    
                    If currentShape.text.Story.font = "" Then
                    
                        addMultiFontColor currentShape
                        
                        'shape.Shapes(i).Fill.UniformColor.HexValue = "#FF0000"
                        'MsgBox "Es wurden mehrere Schriften in einem Text gefunden. Er wurde rot markiert. Er darf nur eine Schriftart enthalten und muss neu gesetzt werden!"
                        
                        'MsgBox "Font 1 ist " & (shape.Shapes(i).Text.Story.Words.First.Text)
                    Else
                        
                        
                        addFontColor currentShape.text.Story.font, currentShape.fill.UniformColor.HexValue, currentShape.BottomY  ' shape.Shapes(i),
                        
                        
                    End If
                End If
            
                
            
                'Schriftart'
                'textAndColorNames = textAndColorNames & " " & shape.Shapes(i).Text.Story.Font
                
                'addToArray fontNamesAndColors(1), shape.Shapes(i).Text.Story.Font
                
                'Schriftfarbe'
                'If shape.Shapes(i).Fill.Type = cdrUniformFill Then
                        'textAndColorNames = textAndColorNames & " " & shape.Shapes(i).Fill.UniformColor.HexValue
                'End If
            End If
            
            
            
        ElseIf Not currentShape.Type = cdrDropShadowGroupShape And Not currentShape.Type = cdrCustomEffectGroupShape Then
            
            If currentShape.CanHaveOutline Then
                If currentShape.outline.color.HexValue = "#0000FF" Then
                    currentShape.visible = False
                End If
            End If
            
            
            If currentShape.CanHaveFill Then
                If currentShape.fill.Type = cdrUniformFill And Globals.isRDGWhite(currentShape.fill.UniformColor) Then
                    currentShape.fill.ApplyUniformFill CreateRGBColor(255, 255, 255)
                End If
            End If
        
        End If
        
        
        'Gravureffekt für Bitmaps/Fotos
        If gravurPhotoFX And currentShape.Type = cdrBitmapShape Then
            If Globals.isUploadBox(currentShape) Then
                currentShape.bitmap.ApplyBitmapEffect "Unsharp Mask", "UnsharpMaskEffect Radius=20,Percentage=500,Threshold=4"
            End If
                
        End If
        
        
       
        If exportMode = KonfiGravuru Or exportMode = KonfiAmazon Then
            'Wenn im Konfimodus, dann sollen Fotos separat exportiert werden, um sie als Maske zu nutzen
            If Globals.isUploadBox(currentShape) Then
                
                currentShape.name = ">Foto " & CStr(photoIndex)
                photoIndex = photoIndex + 1
                
            End If
        End If
        
        
    Next i
    
End Function




Function getFontArrayIndex(fontName) As Integer
    If IsNull(fontNames) Then
        getFontArrayIndex = -1
        Exit Function
    End If
    

    For i = 1 To UBound(fontNames)
        'MsgBox "i=" & i & ", len=" & UBound(fontNames) & " fontNames=" & fontNames(i) & ", fontName=" & fontName
        
        ' vv Not IsNull(fontNames(i)) And
       If StrComp(fontNames(i), fontName, vbTextCompare) = 0 Then
            getFontArrayIndex = i
            'getFontArray = fontNamesAndColors(i)
            Exit Function
       End If
        
    Next i
    
    getFontArrayIndex = -1
    'getFontArray = Null
End Function




Function addMultiFontColor(fontShape As shape)

    Dim lastFont As String

    For i = 1 To fontShape.text.Story.Characters.count
            Dim char As textRange
            Set char = fontShape.text.Story.Characters(i)
            
            
            If Not lastFont = char.font Then
                addFontColor char.font, char.fill.UniformColor.HexValue, char.Baselines.boundingBox.Bottom
            End If
            
            lastFont = char.font
    Next i
End Function

Function addFontColor(fontName As String, fontColor As String, fontY As Double) 'fontShape As shape,
        
        
        'Dim fontY As Double
        'fontY = fontShape.BottomY
        
        'Dim fontIndex As Integer
        'fontIndex = getFontArrayIndex(fontName)
        'fontIndex = -1
        
        'MsgBox "fontIndex=" & fontIndex
        
        'Array erweitern
        'If fontIndex = -1 Then
            'MsgBox "Array erweitern"
            
        Dim yIndex As Integer
        yIndex = UBound(fontNames) + 1 'Letzte Position geben, falls kein niedriger liegender Text gefunden wird
            
            
            
        For i = 1 To UBound(fontNames)
        
            'MsgBox "fontY=" & fontY & ", fontYPos(i)=" & fontYPos(i)
        
            Dim yDIfference As Double
            yDIfference = Abs(fontY - fontYPos(i))
        
            If yDIfference < 0.75 And fontName = fontNames(i) And fontColor = fontColors(i) Then
                Exit Function
            ElseIf fontY > fontYPos(i) Then
                yIndex = i
                Exit For
            End If
        Next i
            
            'MsgBox "fontName=" & fontName & ", yIndex=" & yIndex & ", fontNames.lenght=" & UBound(fontNames) & "\nfontNames:\n" & Join(fontNames, "\n")
            
        'Arrays vergrößern
        ReDim Preserve fontNames(UBound(fontNames) + 1) As String
        ReDim Preserve fontYPos(UBound(fontYPos) + 1) As Double
        ReDim Preserve fontColors(UBound(fontColors) + 1) As String
        'ReDim Preserve fontsColorsArray(UBound(fontsColorsArray) + 1) As Variant
        '-'
        If Not yIndex = UBound(fontNames) Then 'Text soll zwischen 2 Texten sein. Platz im Array machen
            
            'MsgBox "Drag&Drop Items from yIndex=" & yIndex & " To fontNames=" & UBound(fontNames)
            
            For i = UBound(fontNames) - 1 To yIndex Step -1
                fontNames(i + 1) = fontNames(i)
                fontYPos(i + 1) = fontYPos(i)
                fontColors(i + 1) = fontColors(i)
                'fontsColorsArray(i + 1) = fontsColorsArray(i)
            Next i
        End If
        
        
        'fontIndex = UBound(fontNames)
        
        fontNames(yIndex) = fontName
        fontYPos(yIndex) = fontY
        fontColors(yIndex) = fontColor
        
        'fontsColorsArray(yIndex) = colors
    
    
        'Dim fontColorExists As Boolean
        'fontColorExists = False
        
        'MsgBox "Typ = " & VarType(fontsColorsArray(fontIndex))
        
        
        'For i = 0 To UBound(fontsColorsArray(yIndex))
            'If StrComp(fontsColorsArray(yIndex)(i), fontColor, vbTextCompare) = 0 Then
                'fontColorExists = True
                'Exit For
            'End If
        'Next i
        
        'If Not fontColorExists Then
            'Dim colorArray() As String
            'colorArray = fontsColorsArray(yIndex)
            
            'ReDim Preserve colorArray(UBound(colorArray) + 1) As String
            
            'colorArray(UBound(colorArray)) = fontColor
            
            'fontsColorsArray(fontIndex) = colorArray
        'End If
        
        
End Function



Function getFileNameCount(fileName As String) As Integer
    
    Dim index As Integer
    
    index = -1
    
    For i = 1 To UBound(fileNames)
         If StrComp(fileName, fileNames(i), vbTextCompare) = 0 Then
            index = i
            Exit For
         End If
    Next i
    
    If index = -1 Then
        ReDim Preserve fileNames(UBound(fileNames) + 1) As String
        fileNames(UBound(fileNames)) = fileName
        ReDim Preserve fileNamesCounter(UBound(fileNamesCounter) + 1) As Integer
        fileNamesCounter(UBound(fileNamesCounter)) = 0
        
        index = UBound(fileNames)
    End If
    
    fileNamesCounter(index) = fileNamesCounter(index) + 1
    
    
    getFileNameCount = fileNamesCounter(index)
    
End Function



' TODO
Public Function getShapeSizeName(shape As shape) As String
    
    getShapeSizeName = ""
    
    If IsEmpty(sizeNames) Then
        Exit Function
    End If
    
    For i = 1 To UBound(sizeNames)
        'MsgBox "Compare FW=" & CStr(ActiveDocument.FromUnits(shape.SizeWidth, cdrMillimeter)) & " with SW=" & CStr(sizeNames(i).width)
        If VBA.Abs(ActiveDocument.FromUnits(shape.SizeWidth, cdrMillimeter) - sizeNames(i).width) < 2 _
            And VBA.Abs(ActiveDocument.FromUnits(shape.SizeHeight, cdrMillimeter) - sizeNames(i).height) < 2 Then
            
            getShapeSizeName = sizeNames(i).name
            'MsgBox "Found " & sizeNames(i).name
            Exit Function
        End If
    Next i
    
    
End Function




Public Function trimShapesBelow(shapeThatTrims As shape, Optional shapeBelowStart As shape)

    If shapeBelowStart Is Nothing Then
        Set shapeBelowStart = shapeThatTrims
    End If

    Dim shapeBelowStartIndex As Integer
    shapeBelowStartIndex = Globals.getShapeIndexInParentGroup(shapeBelowStart)
    
    For i = shapeBelowStartIndex + 1 To shapeBelowStart.parentGroup.shapes.count
        shapeThatTrims = shapeThatTrims.Trim(shapeBelowStart.parentGroup.shapes(i), True, False)
    Next i
    
End Function

