Attribute VB_Name = "Macros"

Declare PtrSafe Function ShellExecute Lib "shell32.dll" Alias "ShellExecuteA" _
                    (ByVal hWnd As Long, ByVal lpszOp As String, _
                    ByVal lpszFile As String, ByVal lpszParams As String, _
                    ByVal LpszDir As String, ByVal FsShowCmd As Long) _

Private Declare PtrSafe Function GetDesktopWindow Lib "user32" ( _
) As Long

Private Declare PtrSafe Function mciSendString _
Lib "winmm.dll" _
Alias "mciSendStringA" (ByVal lpstrCommand As String, _
ByVal lpstrReturnString As String, _
ByVal uReturnLength As Long, _
ByVal hwndCallback As Long) As Long

Public Sub OutlinesSkalierbarMachen()
    Dim selection As shapeRange
    Set selection = ActiveSelectionRange
    
    For i = 1 To selection.count
        Globals.setShapeOutlinesScaleWithShape selection(i)
    Next i
End Sub


Public Sub BitmapZuOriginalzuschnitt()
    
    Globals.endIfNoDocumentOpen

    If ActiveSelectionRange.count > 0 Then
    
        For i = 1 To ActiveSelectionRange.count
            If ActiveSelectionRange(i).Type = cdrBitmapShape Then
                ' Aus, da Corel manchmal denkt, eine Bitmap hat keine Zuschnitt obwohl es nicht stimmt
'                If ActiveSelectionRange(i).bitmap.Cropped Then
                    ActiveSelectionRange(i).bitmap.ResetCropEnvelope
'                End If
            End If
        Next i
        
    End If
End Sub


Public Sub ExtractBitmapCrop()
    
    Globals.endIfNoDocumentOpen
    
    If ActiveSelectionRange.count > 0 Then
    
        For i = 1 To ActiveSelectionRange.count
            If ActiveSelectionRange(i).Type = cdrBitmapShape Then
                Dim currentShape As shape
                Set currentShape = ActiveSelectionRange(i)
                ' Aus, da Corel manchmal denkt, eine Bitmap hat keine Zuschnitt obwohl es nicht stimmt
                Dim shape As shape
                Set shape = ActiveLayer.CreateCurve(currentShape.bitmap.CropEnvelope)
                
                shape.name = "Bitmap Zuschnitt"
                shape.OrderFrontOf currentShape
                
                Set currentShape = Nothing
                Set shape = Nothing
            End If
        Next i
        
    End If
    
End Sub

' TODO
Public Sub ReplaceBitmap()
    
    Globals.endIfNoDocumentOpen
    
    If ActiveSelectionRange.count > 0 Then
        
        Dim selection As shapeRange
        Set selection = ActiveSelectionRange
        
        Dim fileName As String
        fileName = CorelScriptTools.GetFileBox("PNG|*.png|JPG|*.jpg", "Bitte wähle eine PNG oder JPG Datei aus")
        
        If fileName = "" Then
            Exit Sub
        End If
        
        Dim newBitmap As shape
        Set newBitmap = Globals.loadImage(fileName)
        
        For i = 1 To selection.count
            Dim currentShape As shape
            Set currentShape = selection(i)
            
            If currentShape.Type = cdrBitmapShape Then
                currentShape.bitmap.SetImageData newBitmap.bitmap.image, newBitmap.bitmap.imageAlpha ' TODO
            End If
            
            Set currentShape = Nothing
        Next i
        
        newBitmap.delete
        
    End If
    
End Sub


Public Sub ProduktInfo()
    
    Globals.startMacro

    Dim logger As logger
    Set logger = Globals.getLogger(True)
    
    Globals.showWarnings
    Globals.warnIfNoActiveShapeAndEnd
    
    If Not ActiveDocument Is Nothing Then
        ActiveDocument.unit = cdrMillimeter
        ActiveDocument.Rulers.HUnits = cdrMillimeter
        ActiveDocument.Rulers.VUnits = cdrMillimeter
    End If
    

    If ActiveSelectionRange.count = 1 Then
        
        If Not ActiveDocument.ActiveShape.Type = cdrGroupShape Then
            MsgBox "Kein Design (Gruppe) ausgewählt", vbInformation
            Exit Sub
        End If
        
        Dim productDesign As New productDesign
        productDesign.newProductDesign ActiveDocument.ActiveShape
'        productDesign.initLayersAndPartsIfNeeded logger
        
        
        Dim str As String
        
        str = "Produkt-Design-Info:"
        str = str & vbNewLine & "- Atrikelnummer: " & productDesign.getProductID
        str = str & vbNewLine & "- Musterdesign: " & productDesign.isMasterDesign
        str = str & vbNewLine & "- Konstellationsname: " & productDesign.getDesignNameForPSD(False)
        
        str = str & vbNewLine & "- Teile: (" & productDesign.getPartsCount & ")"
        For p = 1 To productDesign.getPartsCount
            str = str & vbNewLine & "----Teil " & p & " (partIndex=" & productDesign.getPart(p).getPartIndex & "):"
            
            Dim currentPart As ProductDesignPart
            Set currentPart = productDesign.getPart(p)
            
            
            
            str = str & vbNewLine & "-----$ Varianten-Layer-Gruppen: (anzahl:" & currentPart.getVariantLayerGroups.count & ")"
            
            For vlg = 1 To currentPart.getVariantLayerGroups.count
                str = str & vbNewLine & "-----$$ (" & vlg & ")" & currentPart.getVariantLayerGroups(vlg)(1).variantGroupName
            Next vlg
            
            
            
            Dim focusedLayer As ProductDesignLayer
            Set focusedLayer = ConfiHelper.findFocusedLayer(productDesign.getPart(p).layers)
            
            For l = 1 To currentPart.layers.count
                Dim currentLayer As ProductDesignLayer
                Set currentLayer = currentPart.layers.getLayer(l)
                
                
                str = str & vbNewLine & "------Ebene " & l & "(" & currentLayer.layerShape.name & "):"
                str = str & vbNewLine & "--------partIndex=" & currentLayer.getPartIndex & ", layerIndex=" & currentLayer.getLayerIndex
                
                If currentLayer.getMainShape Is Nothing Then
                    str = str & vbNewLine & "-------- KEINE HAUPTFORM GEFUNDEN !"
                Else
                    str = str & vbNewLine & "--------Designschicht: " & (currentLayer Is focusedLayer)
                    str = str & vbNewLine & "--------Flächeninhalt: " & currentLayer.getArea & " mm" ' TODO fehlerhaft
                    str = str & vbNewLine & "--------Rote Formen: " & currentLayer.getAllRedOrPinkShapes.count
                    str = str & vbNewLine & "--------Grundplatte: " & (Not currentLayer.getGroundPlate Is Nothing)
                    str = str & vbNewLine & "--------View-Box: " & (Not currentLayer.getViewShape Is Nothing)
                    str = str & vbNewLine & "--------Beschnittzugabe: " & currentLayer.getBleedSizeInMM & " mm"
                    str = str & vbNewLine & "--------VariantenTyp=" & currentLayer.getLayerVariantGroupName & ", Name=" & currentLayer.getLayerVariantName & ", leere Variante=" & currentLayer.isEmptyVariant
                    str = str & vbNewLine & "--------VariantenChilds:"
                    
'                    currentLayer.getAllVariants , Globals.getLogger(False)
                    
                    For vg = 1 To currentLayer.getAllVariants.allVariants.count
                         str = str & vbNewLine & "----------" & currentLayer.getAllVariants.getVariant(vg).toString
'                        str = str & vbNewLine & "----------" & currentLayer.getStaticVariantGroups(vg)(1).variantGroupName & ":"
'                        For v = 1 To currentLayer.getStaticVariantGroups(vg).count
'                            str = str & vbNewLine & "------------" & currentLayer.getStaticVariantGroups(vg)(v).variantName
'                        Next v
                    Next vg
    '                str = str & vbNewLine & "--------(Amazon) Hat transparente Formen über änderbare Gestaltungselemente:" & CStr(currentLayer.hasTransparentShapeOverCustomizables())
                    
'                    str = str & vbNewLine & "--------Platzierte Formen: " & Globals.getShapeRangeDisplayNames(currentLayer.getPlacedShapes, , False)
                    
                    If Not currentLayer.getMainShape Is Nothing Then
                        ProductRecognizer.initIfNeeded
                        str = str & vbNewLine & "--------Formname: " & ProductRecognizer.recognizeProductLayerName(currentLayer, True) & " zu " & CInt(ProductRecognizer.bestFittingValuePercent) & "%, Form in CDR: " & Globals.getShapeDisplayName(currentLayer.getMainShape)
                        
                        ProductRecognizer.recognizeProductLayerName currentLayer, False
                    Else
                        str = str & vbNewLine & "--------Formname: Keine Hauptform vorhanden !"
                    End If
                End If
                
                
                
                
                Set currentLayer = Nothing
            Next l
            
            Set currentPart = Nothing
            str = str & vbNewLine
        Next p
        str = str & vbNewLine
        
        MsgBox str
'        Globals.openTextInTextEditor str, "Produkt"
        
    ElseIf ActiveSelectionRange.count = 0 Then
        MsgBox "Es ist nichts ausgewählt!", vbInformation
    Else
        MsgBox "Es sind zu viele Formen ausgewählt!", vbInformation
    End If
    
    logger.logINFO "Fertig"
    
    Globals.endMacro True

    
End Sub



Public Sub SchriftartenlisteVomPC()
    
    Dim fonts As String
    fonts = fontList(1)
    
    For i = 2 To fontList.count
        fonts = fonts & vbNewLine & fontList(i)
    Next i
    
    MsgBox "Schriften:" & vbNewLine & fonts
End Sub


Public Sub SindBeideKurvenGleich()
    MsgBox "Kurven sind gleich: " & Globals.areCurvesEqual(ActiveSelectionRange(1).curve, ActiveSelectionRange(2).curve, False)
End Sub

Sub Gesamtpunktzahl()
    If Not ActiveShape Is Nothing Then
        MsgBox "Nodes=" & Globals.getShapeCurveNodeCount(ActiveShape)
    Else
        MsgBox "Nichts ausgewählt"
    End If
End Sub





Sub FormTyp()
    
    If Not ActiveSelectionRange.count = 0 Then
        Dim shape As shape
        Set shape = ActiveSelectionRange(1)
        
        Dim shapeTypeName As String
        shapeTypeName = Globals.getShapeTypeNameByShape(shape)
        MsgBox "Formtyp: " & shapeTypeName
    End If

End Sub


Sub DisplayCurveAusgeben()
    If Not ActiveShape.DisplayCurve Is Nothing Then
        MsgBox "DisplayCurve.Length:" & ActiveShape.DisplayCurve.Length
    Else
        MsgBox "Keine DisplayCurve vorhanden"
    End If

End Sub

Sub LinienSkalierbarMachen()
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    Globals.setShapesOutlinesScaleWithShape ActiveSelection.shapes.All
End Sub

'Sub OeffneCDRDieNachSchriftenFragtTest()
'    ' Hat nicht gefragt, da per script geöffnet
'    OpenDocument "V:\Produkte\Gedenktafeln\Acryl\30x20\[CDR]\GT-A-30x20_Designs_Part8.cdr"
'End Sub



Sub VisualizeSubPaths()
    Dim shape As shape
    Set shape = ActiveSelectionRange(1)

    If Not shape.Type = cdrCurveShape Then
        shape.ConvertToCurves
    End If

    For i = 1 To shape.curve.subPaths.count
        Dim curve As shape
        Set curve = ActiveLayer.CreateCurve(shape.curve.subPaths(i).GetCopy)
        curve.name = "Curve " & i
    Next i
End Sub





'Sub IstQRCode()
'    MsgBox "QR-COde: " & Globals.isQRCode(ActiveSelectionRange(1))
'End Sub

'Sub Datenfelder()
'    Dim shape As shape
'
'
'    If ActiveSelectionRange.count > 0 Then
'        Set shape = ActiveSelectionRange(1)
'
'        Dim name As String
'
'        For i = 1 To shape.ObjectData.count
'            name = name & vbNewLine & shape.ObjectData(i).DataField.name & ":" & shape.ObjectData(i).value
'        Next i
'
'        Globals.saveTextFile name, Globals.getDesktopPath & "Datenfelder.txt"
'
'        'MsgBox "ObjectData:" & name
'    End If
'End Sub

'Sub Properties()
'    Dim shape As shape
'
'    If ActiveSelectionRange.count > 0 Then
'        Set shape = ActiveSelectionRange(1)
'
'        Dim name As String
'
'        For i = 1 To shape.Properties.count
'            name = name & vbNewLine & shape.Properties.ItemByIndex(i)
'        Next i
'
'        Globals.saveTextFile name, Globals.getDesktopPath & "Properties.txt"
'
'        'MsgBox "ObjectData:" & name
'    End If
'End Sub

'Sub TImeTEst()
'    Dim sec As Double
'    sec = 102
'    Dim secBK As Double
'    secBK = sec
'    MsgBox secBK & "=" & ProgressBarUserForm.secondsToHoursSecondsMinutes(sec)
'End Sub

'Sub IstHauptProdukt()
'    Dim product As New ProductDesign
'    product.newProductDesign ActiveSelectionRange(1)
'
'    If product.isValidProductDesign Then
'        MsgBox Globals.isProductIDMainDesign(product.getProductID)
'    End If
'
'End Sub

'Sub IstTransparenteForm()
'    MsgBox "Ist transparente Form:" & Globals.isShapeHavingTransparency(ActiveSelectionRange(1))
'End Sub


Public Sub Farbname()

    If ActiveSelectionRange.count = 0 Then
       MsgBox "Keine Form ausgewählt !"
       End
    End If
    
    If Not ActiveSelectionRange(1).CanHaveFill Then
       MsgBox "Form unterstützt keine Füllung!"
       End
    End If
    
    If ActiveSelectionRange(1).fill.Type = cdrNoFill Then
       MsgBox "Form hat keine Füllung!"
       End
    End If
    
    Dim pal As palette: Set pal = Palettes.item("Standard-RGB-Palette")
    MsgBox pal.colors(pal.MatchColor(ActiveShape.fill.UniformColor)).name
    
    
    ' Alle Paletten
'    For Each pal In Palettes
'        MsgBox pal.name & " (" & pal.ColorCount & " colors)"
'    Next pal
    
End Sub


Public Sub TextAusrichtungAusgeben()
    If Not ActiveShape Is Nothing Then
        If ActiveShape.Type = cdrTextShape Then
            MsgBox "Alignment " & ActiveShape.text.Story.alignment
        Else
            MsgBox "Dies ist keine Textform!"
        End If
    End If
End Sub

Sub FontSize()
    
    If Not ActiveShape Is Nothing Then
        If ActiveShape.Type = cdrTextShape Then
            MsgBox "Text Size=" & ActiveShape.text.Story.size
        End If
    End If
    

End Sub

Sub CharInfo()

    If Not ActiveShape Is Nothing Then
        If ActiveShape.Type = cdrTextShape Then
            Dim text As String: text = ActiveShape.text.Story.text
            
            For i = 1 To Len(text)
                Dim char As String
                char = Mid(text, i, 1)
                
                MsgBox "Char=" & char & ", Asc=" & Asc(char) & ", AscW=" & AscW(char) & ", AscB=" & AscB(char) & ", isUnicode=" & Globals.isCharWide(char) '& ", ConvAsc=" & Asc(StrConv(char, vbFromUnicode)) & ", ConvAscW=" & AscW(StrConv(char, vbFromUnicode))
                
                Dim charConv As String: charConv = StrConv(char, vbUnicode)
                
                MsgBox "StrConv" & charConv
                
                MsgBox "ConvAsc = " & Asc(charConv) & ", " & AscW(charConv)
                
                char = ""
            Next i
        End If
    End If
End Sub

Sub ConvertUnicodeTextToNormalText()
    If Not ActiveShape Is Nothing Then
        If ActiveShape.Type = cdrTextShape Then
            Dim text As String: text = ActiveShape.text.Story.text
            
            For i = 1 To Len(text)
                Dim char As String
                char = Mid(text, i, 1)
                
                If Globals.isCharWide(char) Then
                    If AscW(char) = -10187 Then
                        ActiveShape.text.range(i - 1, i).replace "A"
                    End If
                End If
                
'                If AscW(char) >= -10187 And AscW(char) <= -9191 Then
'                    Let wide = AscW(char)
'                    Dim newCharInt As Integer: newCharInt = 65 + (AscW(char) + 10187)
'                    Dim newChar As String: newChar = Chr(newCharInt)
'                    ActiveShape.text.range(i - 1, i).replace newChar
'
'                End If
                
                char = ""
            Next i
        End If
    End If
End Sub



Public Sub DetectTransformedText()

    Dim text As shape
    If ActiveSelectionRange.count > 0 Then
        Set text = ActiveSelectionRange.firstShape
        
        MsgBox "Scaled: " & text.TransformationMatrix.IsScaled
        
    End If

End Sub


Public Sub ReverseSelectedShapesZIndex()
    
    If ActiveSelectionRange.count > 1 Then
    
        Globals.startMacro
        If Not Globals.debugHistory Then
            CorelScriptTools.BeginWaitCursor
            ActiveDocument.BeginCommandGroup "ReverseSelectedShapesDirection"
            If Not Globals.debugErrors Then On Error GoTo MacroError
        End If
        
'        Debug.Print "Ebenenreihenfolge am Anfang: " & Globals.shapeRangeToString(ActiveLayer.shapes.All)
        
        ' Der Angfangsstatus muss zwischengespeichert werden, da sich die Auswahl ändern könnte
        Dim activeSelectionRangeSnapShot As shapeRange
        Set activeSelectionRangeSnapShot = Globals.sortShapeRangeToMatchZIndex(ActiveSelectionRange)
        
        Dim lastShape As shape
        Set lastShape = activeSelectionRangeSnapShot.lastShape
        

        ' Den Ersten überspringen.
        For i = activeSelectionRangeSnapShot.count - 1 To 1 Step -1
'            Debug.Print "lastShape: " & Globals.getShapeDisplayName(lastShape)
            activeSelectionRangeSnapShot(i).OrderBackOf lastShape
            Set lastShape = activeSelectionRangeSnapShot(i)
'            Debug.Print activeSelectionRangeSnapShot(i).name; " ist jetzt vor dem ersten Shape"
'            Debug.Print "Ebenenreihenfolge ist jetzt: " & Globals.shapeRangeToString(ActiveLayer.shapes.All)
        Next i
        
        openCloseObjectManagerDocker
        
        Exit Sub
MacroError: 'Alle Fehler hier abfangen und die CommandGruppe beenden, damit man mit einem Schritt zurück gehen kann (STRG + Z), auch wenn ein Fehler aufgetreten ist
        MsgBox Err.Description & ", " & Err.number, vbCritical
        Globals.endMacro True
    End If
    
    MsgBox "Fertig", vbInformation
    
End Sub



' TODO am besten so machen, dass zuerst die Größte Form gesucht wird und dann kleinere Formen per .addCurve hinzugefügt werden.
' Coreldraw checkt dann selbst, welche Formen positiv sind und welche löcher sind

' Ist sinnvoll, wenn man den Buchstaben "O" hat der zwar dick sein soll, aber nur aus 2 Kreisen besteht, die voneinander getrennt sind
' Dieses Macro erkennt dann die überlappung und zieht den kleineren Kreis vom Größeren ab. Jetzt kann

' Probleme:
' - Wenn sich 2 Formen nur leicht überlappen (wie z.B: ein 'e' und ein 'i' von einer geschwungenen Schrift)
        'kommt ein Fehler. Denn nur wenn die eine Form in der anderen Steckt, muss geschnitten werden.
Public Sub SubtrahiereUeberlappendeFormen()
    
    If ActiveSelectionRange.count > 1 Then
        
        Globals.startMacro
        If Not Globals.debugHistory Then
            CorelScriptTools.BeginWaitCursor
            ActiveDocument.BeginCommandGroup "SubtrahiereUeberlappendeFormen"
            If Not Globals.debugErrors Then On Error GoTo MacroError
        End If
        
        Dim selectionSnapShot As shapeRange
        Set selectionSnapShot = ActiveSelectionRange
        
        Dim i As Integer
        i = 1
        While i <= selectionSnapShot.count
            
            Dim currentShape As shape
            Set currentShape = selectionSnapShot(i)
            
            If Globals.isVectorShape(currentShape) Then
                
                Dim j As Integer
                j = i + 1
                While j <= selectionSnapShot.count
                    
                    Dim NextShape As shape
                    Set NextShape = selectionSnapShot(j)
                    
                    If Globals.isVectorShape(NextShape) Then
                    
                        If Globals.isCurveIntersectingFast(currentShape, NextShape) Then
                            If currentShape.SizeWidth > NextShape.SizeWidth Then
                                selectionSnapShot.RemoveRange Globals.shapeToShapeRange(NextShape)
                                'Set currentShape = Globals.subtractShape(nextShape, currentShape)
                                Set currentShape = NextShape.Trim(currentShape)
                                ' nextShape.name = "A Remove" ' Debug
                                NextShape.delete
                                j = j - 1
                                GoTo NextJ
                            Else
                                selectionSnapShot.RemoveRange Globals.shapeToShapeRange(currentShape)
                                'Set nextShape = Globals.subtractShape(currentShape, nextShape)
                                Set NextShape = currentShape.Trim(NextShape)
                                Set selectionSnapShot = Globals.addToShapeRangeAtIndex(selectionSnapShot, NextShape, j)
                                'currentShape.name = "B remove" ' Debug
                                currentShape.delete
                            End If
                            
                        End If
                    End If
                    
NextJ:
                    Set NextShape = Nothing
                    j = j + 1
                Wend
            
            End If
            
            Set currentShape = Nothing
            i = i + 1
        Wend
        
    End If
    
    On Error GoTo 0
    
    Globals.endMacro True
    Exit Sub
MacroError:
    MsgBox Err.Description & vbNewLine & "Fehler-Code: " & Err.number, vbCritical
End Sub









Sub EasterEgg()

    shell "C:\Windows\system32\Notepad.Exe", vbNormalFocus
    Globals.Sleep (1000)
    
    
    Dim text As String
    text = "Du wurdest gehackt! Kleiner Scherz :D"
    
    For i = 1 To Len(text)
        Dim char As String
        char = Mid(text, i, 1)
        SendKeys char, True
        
        If char = " " Then
            Globals.Sleep (300 + Rnd(100))
        ElseIf char = "!" Or char = "." Then
            Globals.Sleep (2000 + Rnd(1000))
        Else
            Globals.Sleep (100 + Rnd(250))
        End If
        
        If i = 19 Then
            OpenCDDrive
        End If
    Next i
    
    CloseCDDrive
    
End Sub


Private Function OpenCDDrive()
    mciSendString "Set CDAudio Door Open", 0&, 0, 0
End Function


Private Function CloseCDDrive()
    mciSendString "Set CDAudio Door Closed", 0&, 0, 0
End Function



Public Sub MakeShapeNamesUnique()
    
    Dim shapes As shapeRange
    Set shapes = Globals.getSelectedShapesOrAll
    Set shapes = Globals.flattenShapeRange(shapes)
    
    Dim names As New Dictionary

    
    For i = 1 To shapes.count
        Dim shape As shape
        Set shape = shapes(i)
        
        If shape.name = "" Then
            
            Dim name As String
            name = Globals.getShapeDisplayName(shape)
            
            Dim counter As Integer
            counter = 1
            While names.Exists(name & " " & counter)
                counter = counter + 1
            Wend
            name = name & " " & counter
            
            names.add name, name
            shape.name = name
            
        End If
        
        Set shape = Nothing
    Next i
    
End Sub




Sub PfadUeberlagerungZusammenFuegen()
    
    
    Globals.endIfNoDocumentOpen
    Globals.warnIfNoActiveShapeAndEnd
        
    For i = 1 To ActiveSelectionRange.count
        If ActiveSelectionRange(i).Type = cdrCurveShape Then
            ActiveSelectionRange(i).curve.SelfWeldClosedSubpaths
        End If
    Next i
    
End Sub



Public Sub TexteZuTextBoxen()
    
    Globals.endIfNoDocumentOpen
    Globals.startMacro
    
    Dim selection As shapeRange
    Set selection = Globals.getSelectedShapesOrAll
    Set selection = Globals.flattenShapeRange(selection)
    
    Dim designs As collection
    Set designs = Globals.getSelectedDesignsOrAll


    ' Texte konvertieren
    ' ---------------------
    For i = 1 To selection.count
        Dim currentShape As shape
        Set currentShape = selection(i)

        If currentShape.Type = cdrTextShape Then
            If Not Globals.isProductID(currentShape) Then
                If Not currentShape.text.Type = cdrParagraphText Then
                    currentShape.text.ConvertToParagraph
                    currentShape.text.Frame.VerticalAlignment = cdrCenterJustify
                End If
            End If

        End If

        Set currentShape = Nothing
    Next i
    ' ---------------------
    
    
    
    
     For i = 1 To designs.count
        Dim currentDesign As productDesign
        Set currentDesign = designs(i)
        
        For k = 1 To currentDesign.getLayers.count
            Dim currentLayer As ProductDesignLayer
            Set currentLayer = currentDesign.getLayers.getLayer(k)
            
            Dim texts As shapeRange
            Set texts = currentLayer.newCustomShapeTypeQuery(ParagraphText).search
            
            
            
            
            ' Durchnittliche X Position der Texte berechnen um danach sagen zu können, welche Textausrichtung (rechts, links, mitte) ein Text hat.
            ' ---------------------
            Dim averageX As Double
            Dim averageXL As Double
            Dim averageXR As Double
            Dim shapesForXAverage As shapeRange
            Set shapesForXAverage = texts.shapes.All
            
            ' Wenn es nur einen Text gibt, soll seine Position relativ zur Hauptform abgeglichen werden
            If texts.count = 1 Then
                shapesForXAverage.add currentLayer.getMainShape
            End If
            
            For h = 1 To shapesForXAverage.count
                averageX = averageX + shapesForXAverage(h).centerX
                averageXL = averageXL + shapesForXAverage(h).LeftX
                averageXR = averageXR + shapesForXAverage(h).RightX
            Next h
            averageX = averageX / shapesForXAverage.count
            averageXL = averageXL / shapesForXAverage.count
            averageXR = averageXR / shapesForXAverage.count
            ' ---------------------
            
            
            
            
            ' Textausrichtung feststellen und setzen
            ' -----------------------
            Dim xTolerance As Double
            xTolerance = currentLayer.getMainShape.SizeWidth / 25
            For h = 1 To texts.count
                Dim currentText As shape
                Set currentText = texts(h)
                
                Dim difference As Double
                difference = currentText.centerX - averageX
'                Debug.Print "difference: " & difference & ", xTolerance: " & xTolerance
                If Abs(difference) < xTolerance Then ' Center
                    currentText.text.Story.alignment = cdrCenterAlignment
                ElseIf Abs(currentText.LeftX - averageXL) < xTolerance Then ' Links bündig
                    currentText.text.Story.alignment = cdrLeftAlignment
                ElseIf Abs(currentText.RightX - averageXR) < xTolerance Then ' Rechts bündig
                    currentText.text.Story.alignment = cdrRightAlignment
                ElseIf difference < 0 Then ' Links
                    currentText.text.Story.alignment = cdrLeftAlignment
                Else
                    currentText.text.Story.alignment = cdrRightAlignment
                End If
                
                Set currentText = Nothing
            Next h
            ' -----------------------
            
            averageX = 0
            averageXL = 0
            averageXR = 0
            xTolerance = 0
            Set shapesForXAverage = Nothing
            Set texts = Nothing
            Set currentLayer = Nothing
        Next k
        
        
        
        Set currentDesign = Nothing
    Next i
    
    TexteInLeserichtungSortieren
    
    Globals.endMacro
'    MsgBox "Fertig"
End Sub


Public Sub TextBoxenTextVertikalZentrieren()
    
    Globals.startMacro
    
    Dim selection As shapeRange
    Set selection = Globals.getSelectedShapesOrAll
    Set selection = Globals.flattenShapeRange(selection)

    
    For i = 1 To selection.count
        Dim currentShape As shape
        Set currentShape = selection(i)

        If currentShape.Type = cdrTextShape Then
            If Not Globals.isProductID(currentShape) Then
                If currentShape.text.Type = cdrParagraphText Then
                    currentShape.text.Frame.VerticalAlignment = cdrCenterJustify
                End If
            End If

        End If

        Set currentShape = Nothing
    Next i
    
    Globals.endMacro True
    
End Sub


Public Sub TextBoxenZuText()
    
    Globals.endIfNoDocumentOpen
    Globals.startMacro
    
    Dim selection As shapeRange
    Set selection = Globals.getSelectedShapesOrAll
    Set selection = Globals.flattenShapeRange(selection)


    ' Texte konvertieren
    ' ---------------------
    For i = 1 To selection.count
        Dim currentShape As shape
        Set currentShape = selection(i)

        If currentShape.Type = cdrTextShape Then
            If Not Globals.isProductID(currentShape) Then
                If Not currentShape.text.Type = cdrArtisticText Then
                    currentShape.text.ConvertToArtistic
                End If
            End If

        End If

        Set currentShape = Nothing
    Next i
    ' ---------------------

    Globals.endMacro True
    
End Sub



Public Sub TexteInLeserichtungSortieren()
    Dim designs As collection
    Set designs = Globals.getSelectedDesignsOrAll
    
    Dim currentDesign As productDesign
    For i = 1 To designs.count
        
        Set currentDesign = designs(i)
        
        Dim texts As shapeRange
        Set texts = currentDesign.newCustomShapeTypeQuery(TextAny).search
        texts.RemoveRange newCustomShapeTypeQuery(texts, Globals.customShapeType.productID).search
        
        If texts.count > 1 Then
            arrange.arrangeFunction True, Globals.shapeRangeToCollection(texts)
        End If
        
        Set texts = Nothing
        
        Set currentDesign = Nothing
    Next i
    
    
End Sub



Public Sub FormNameSuchenUndErsetzen()
    
    Globals.endIfNoDocumentOpen
    
    Dim searchString As String
    searchString = InputBox("Wonach soll gesucht werden?", "Suchen & ersetzen", "")
    If searchString = "" Then Exit Sub
    
    Dim replaceString As String
    replaceString = InputBox("Mit welchem Text soll ersetzt werden?", "Suchen & ersetzen", "")
'    If replaceString = "" Then Exit Sub
    
    Dim selection As shapeRange
    Set selection = Globals.getSelectedShapesOrAll
    
    Set selection = Globals.flattenShapeRange(selection, 1, True)
    
    ProgressBarUserForm.Start
    
'    MsgBox "Replace searchString: " & searchString & ", replaceString: " & replaceString
    
    For i = 1 To selection.count
        selection(i).name = replace(selection(i).name, searchString, replaceString)
        ProgressBarUserForm.setProgress CDbl(i) / selection.count
    Next i
    
    ProgressBarUserForm.Hide
    
End Sub

Public Sub StylesAnzahl()
    
    Globals.endIfNoDocumentOpen
    
    MsgBox "Styles.count: " & ActiveDocument.StyleSheet.styles.count & vbNewLine & _
        "AllStyles.count: " & ActiveDocument.StyleSheet.AllStyles.count & vbNewLine & _
        "StyleSets.count: " & ActiveDocument.StyleSheet.StyleSets.count

    
    '        While ActiveDocument.StyleSheet.AllStyleSets.count > 0
'            ActiveDocument.StyleSheet.AllStyleSets.First.delete
'        Wend
'
'        While ActiveDocument.StyleSheet.AllStyles.count > 1
'            ActiveDocument.StyleSheet.AllStyles.First.delete
'        Wend
    
End Sub






Public Sub BackupPSDs()
    
    ProgressBarUserForm.Start
    
    Dim logger As New logger
    logger.init "BackupPSDs"
    logger.logINFO "BackupPSDs Start "
    
    Dim mainFolder As String
    mainFolder = Globals.addBackslash(Globals.getNewStructureFolder) & "Produkte"
    
    Dim sourceFolder As String
    sourceFolder = InputBox("Ordner: ", "Ordner angeben", mainFolder)
    
    If sourceFolder = "" Then
        GoTo ExitFunction
    End If
    
    Dim destinationFolder As String
    destinationFolder = Globals.addBackslash(Globals.getDesktopPath) & "Server PSD Backup"
    
    logger.logINFO "Quellordner: '" & sourceFolder & "', Zielordner: '" & destinationFolder & "'"
    
'    MsgBox "mainFolder: " & mainFolder & vbNewLine & "destinationFolder: " & destinationFolder
    
    Dim folders As collection
    Set folders = Globals.getFoldersInFolder(sourceFolder)
    
    For i = 1 To folders.count
        processFolderForPSDBackup Globals.addBackslash(folders(i)), destinationFolder, mainFolder, logger
        ProgressBarUserForm.setProgress i / CDbl(folders.count)
    Next i
    
ExitFunction:
    ProgressBarUserForm.Hide
    
End Sub




Private Function processFolderForPSDBackup(folderPath As String, destinationFolder As String, mainFolder As String, logger As logger)
    
    logger.addTab , "[Macros.processFolderForPSDBackup] folderPath: '" & folderPath & "'"
    
    Dim files As collection
    Set files = Globals.listfiles(folderPath)
    
    If Not files Is Nothing Then
        For i = 1 To files.count
            
            Dim fileType As String
            fileType = Globals.getFolderFileAndType(files(i))(2)
            
            If fileType = ".psd" Or fileType = ".psb" Then
            
                Dim filePath As String
                filePath = Globals.addBackslash(folderPath) & files(i)
                
                Dim destinationFilePath As String
                destinationFilePath = Globals.addBackslash(Globals.addBackslash(destinationFolder) & Right(folderPath, Len(folderPath) - Len(mainFolder))) & files(i)
                
                logger.logINFO "Kopiere '" & filePath & "' zu '" & destinationFilePath & "'"
                
                Globals.copyPasteFile filePath, destinationFilePath, , True, True
                
                ' Vorschau JPG der PSD
                If Globals.fileExist(replace(replace(filePath, ".psd", ".jpg"), ".psb", ".jpg")) Then
                    Globals.copyPasteFile replace(replace(filePath, ".psd", ".jpg"), ".psb", ".jpg"), replace(replace(destinationFilePath, ".psd", ".jpg"), ".psb", ".jpg"), , True, True
                End If
                
            End If
        Next i
    End If
    
    Set files = Nothing
    
    
    
    
    Dim folders As collection
    Set folders = Globals.listFoldersInFolder(folderPath)
    
    If Not folders Is Nothing Then
        For i = 1 To folders.count
            processFolderForPSDBackup folders(i).path, destinationFolder, mainFolder, logger
        Next i
    End If
    
    Set folders = Nothing
    
    logger.removeTab
    
End Function


' Die alten Order "Gray" und "PREDATA" in Produktordern löschen
Public Sub DeleteGrayAndPreDataFolders()
    
    ProgressBarUserForm.Start
    
'    Dim logger As New logger
'    logger.init "BackupPSDs"
'    logger.logINFO "BackupPSDs Start "
    
    Dim mainFolder As String
    mainFolder = Globals.addBackslash(Globals.getNewStructureFolder) & "Produkte"
    
'    MsgBox "mainFolder: " & mainFolder & vbNewLine & "destinationFolder: " & destinationFolder
    
    Dim folders As collection
    Set folders = Globals.getFoldersInFolder(mainFolder)
    
    For i = 1 To folders.count
        searchSizeFolderForDeleteGrayAndPreData folders(i)
        ProgressBarUserForm.setProgress i / CDbl(folders.count)
    Next i
    
    ProgressBarUserForm.Hide
    
End Sub


Private Function searchSizeFolderForDeleteGrayAndPreData(folderPath As String)
        
    Dim folders As collection
    Set folders = Globals.getFoldersInFolder(folderPath)
    
    
    For i = 1 To folders.count
        Dim currentFolder As String
        currentFolder = folders(i)
        
        If Globals.getFolderName(currentFolder) = "[CDR]" Then
            processSizeFolderForDeleteGrayAndPreData folderPath
        Else
            searchSizeFolderForDeleteGrayAndPreData currentFolder
        End If
        
        currentFolder = ""
    Next i
    
End Function


Private Function processSizeFolderForDeleteGrayAndPreData(folderPath As String)
    
    Dim folders As collection
    Set folders = Globals.getFoldersInFolder(folderPath)
    
    For i = 1 To folders.count
        Dim currentFolder As String
        currentFolder = folders(i)
        
        processDesignFolderForDeleteGrayAndPreData currentFolder
        
        currentFolder = ""
    Next i
    
End Function


Private Function processDesignFolderForDeleteGrayAndPreData(folderPath As String)
    
    Dim productImagesFolder As String
    productImagesFolder = Globals.addBackslash(folderPath) & "Produktbilder\"
    
    If Globals.folderExists(productImagesFolder) Then
        
        Dim jpgFolder As String
        jpgFolder = productImagesFolder & "JPG\"
        
        If Globals.folderExists(jpgFolder) Then
            Dim grayFolder As String
            grayFolder = jpgFolder & "Grau\"
            
            ' DEBUG
'            If Globals.folderExists(grayFolder) Then
'                MsgBox grayFolder
'            End If
            
            ' deleteFolder prüft auch ob der Ordner exestiert
            Globals.deleteFolder grayFolder
            
        End If
        
        
        
        Dim predataFolder As String
        predataFolder = productImagesFolder & "PREDATA\"
        
'        If Globals.folderExists(predataFolder) Then
'            MsgBox predataFolder
'        End If
        
        ' deleteFolder prüft auch ob der Ordner exestiert
       Globals.deleteFolder predataFolder
        
    End If
    
End Function



' Die alten Order "Gray" und "PREDATA" in Produktordern löschen
Public Sub DeleteExportFolderAndOldFDPFolders()
    
    ProgressBarUserForm.Start
    
'    Dim logger As New logger
'    logger.init "BackupPSDs"
'    logger.logINFO "BackupPSDs Start "
    
    Dim mainFolder As String
    mainFolder = Globals.addBackslash(Globals.getNewStructureFolder) & "Produkte"
    
'    MsgBox "mainFolder: " & mainFolder & vbNewLine & "destinationFolder: " & destinationFolder
    
    Dim folders As collection
    Set folders = Globals.getFoldersInFolder(mainFolder)
    
    For i = 1 To folders.count
        searchSizeFolderForDeleteExportAndFDPFolders folders(i)
        ProgressBarUserForm.setProgress i / CDbl(folders.count)
    Next i
    
    ProgressBarUserForm.Hide
    
End Sub



Private Function searchSizeFolderForDeleteExportAndFDPFolders(folderPath As String)
        
    Dim folders As collection
    Set folders = Globals.getFoldersInFolder(folderPath)
    
    
    For i = 1 To folders.count
        Dim currentFolder As String
        currentFolder = folders(i)
        
        If Globals.getFolderName(currentFolder) = "[CDR]" Then
            processSizeFolderForDeleteExportAndFDPFolders folderPath
        Else
            searchSizeFolderForDeleteExportAndFDPFolders currentFolder
        End If
        
        currentFolder = ""
    Next i
    
End Function

Private Function processSizeFolderForDeleteExportAndFDPFolders(folderPath As String)
    
    Dim folders As collection
    Set folders = Globals.getFoldersInFolder(folderPath)
    
    For i = 1 To folders.count
        Dim currentFolder As String
        currentFolder = folders(i)
        
        processDesignFolderForDeleteGrayAndPreData currentFolder
        
        currentFolder = ""
    Next i
    
End Function


Private Function processDesignFolderForDeleteExportAndFDPFolders(folderPath As String)
    
    Dim oldFPDFolder As String
    oldFPDFolder = Globals.addBackslash(folderPath) & "FPD\"
    
    If Globals.folderExists(oldFPDFolder) Then
       Globals.deleteFolder oldFPDFolder
    End If
    
End Function



Public Sub DesignZuEdelstahl()
    
    Dim selection As shapeRange
    Set selection = Globals.getSelectedShapesOrAll
    
    If selection.count = 0 Then Exit Sub
    
    PlaceFile.setSelectedPlaceTypeJob Nothing
    PlaceFile.startFunction selection, Classfactory.newPlaceFileParameters.setDeleteMode.setQuiet
    
    PlaceFile.setSelectedPlaceTypeJob PlaceFile.jobEdelstahl
    PlaceFile.startFunction selection, Classfactory.newPlaceFileParameters.setQuiet
    
    selection.CreateSelection
    
    productID.createProductID "", False, "", "", "-A-", "-V2A-"
    
    selection.CreateSelection
    
    ErrorFixer.Start True
    
    
    
End Sub

Sub FokusiereMarkierteForm()
    
    If ActiveSelectionRange.count > 0 Then
        Globals.setViewToShapeRange ActiveSelectionRange
    End If
    
End Sub



Sub DesignVarianteSichtbarkeitUmstellen()
    
    ' Variantengruppe eingeben
    ' ------------------------------------
    Dim variantGroupSelection As String
    variantGroupSelection = InputBox("Welche Variantengruppe?", "", "1")
    
    If variantGroupSelection = "" Then
        Exit Sub
    End If
    
    If Not IsNumeric(variantGroupSelection) Then
        MsgBox "Bitte nur Zahlen eingeben!", vbExclamation
        Exit Sub
    End If
    Dim variantGroupSelectionInt As Integer
    variantGroupSelectionInt = CInt(variantGroupSelection)
    ' ------------------------------------
    
    
    ' Varianten eingeben
    ' ------------------------------------
    Dim variantSelection As String
    variantSelection = InputBox("Welche Variante?", "", "1")
    
    If variantSelection = "" Then
        Exit Sub
    End If
    
    If Not IsNumeric(variantSelection) Then
        MsgBox "Bitte nur Zahlen eingeben!", vbExclamation
        Exit Sub
    End If
    Dim variantSelectionInt As Integer
    variantSelectionInt = CInt(variantSelection)
    ' ------------------------------------
    
    
    Dim makeVisibleOrHide As Boolean
    Dim answer As VbMsgBoxResult
    answer = MsgBox("Soll die Designvariante sichtbar oder unsichtbar gemacht werden? Klicke ja für sichtbar", vbYesNo Or vbQuestion)
    makeVisibleOrHide = (answer = vbYes)
    
    Dim selectedDesigns As collection
    Set selectedDesigns = Globals.getSelectedDesignsOrAll(onlyValidDesigns:=True)
    
    Globals.startMacro
    
    If Not Globals.debugHistory Then
        CorelScriptTools.BeginWaitCursor
        ActiveDocument.BeginCommandGroup "DesignVarianteSichtbarkeitUmstellen"
    End If
    
    
    For i = 1 To selectedDesigns.count
        Dim currentDesign As productDesign
        Set currentDesign = selectedDesigns(i)
        
        For k = 1 To currentDesign.getLayers.count
            
            Dim designVariantGroups As collection
            Set designVariantGroups = currentDesign.getLayer2(k).getVariantsOfType(DesignElementVariantType).variantGroups
            
            If variantGroupSelection <= designVariantGroups.count Then
                Dim designVariantGroup As collection
                Set designVariantGroup = designVariantGroups(variantGroupSelectionInt)
                
                If variantSelection <= designVariantGroup.count Then
                    designVariantGroup(variantSelectionInt).shape.visible = makeVisibleOrHide
                End If
                
                Set designVariantGroup = Nothing
            End If
            
            Set designVariantGroups = Nothing
        Next k
        
        Set currentDesign = Nothing
    Next i
    
    Globals.endMacro
    
End Sub


' Testet, ob bei einem Zuschnitt die Referenz der neu erzeugten Form automatisch in anderen Objekten (Variante) gesetzt wird
Public Sub TestByRef()
    
    Globals.endIfNoDocumentOpen
    
    Dim ellipse As shape
    Set ellipse = ActiveLayer.CreateEllipse(ActiveDocument.ToUnits(5, cdrCentimeter), ActiveDocument.ToUnits(5, cdrCentimeter), ActiveDocument.ToUnits(25, cdrCentimeter), ActiveDocument.ToUnits(25, cdrCentimeter))
    ellipse.name = "ellipse"
    
    Dim rect As shape
    Set rect = ActiveLayer.CreateRectangle(ActiveDocument.ToUnits(10, cdrCentimeter), ActiveDocument.ToUnits(20, cdrCentimeter), ActiveDocument.ToUnits(25, cdrCentimeter), ActiveDocument.ToUnits(25, cdrCentimeter))
    rect.name = "rect"
    
    Dim variante As New variante
    Set variante.shape = ellipse
    
    subtractByVal rect, variante.shape
    
    MsgBox "Ellipse Ref: " & Globals.getShapeDisplayName(variante.shape)
    
End Sub

Private Function subtractByVal(sourceShape As shape, ByRef targetShape As shape)
    
    Set targetShape = sourceShape.Trim(targetShape)
    
End Function


Sub UnterpfadGanzAuswählen()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
        
    Dim shape As shape
    Set shape = ActiveShape
    
    If Globals.isVectorShape(shape) Then
        Dim curve As curve
        Set curve = Globals.getCurveFromShape(shape)
        
        If Not curve Is Nothing Then
            
            Dim selectedSubpath As subPath
            If curve.selection.count = 0 Then
                MsgBox "Es wurde kein ausgewählter Unterpfad gefunden. Bitte wähle ein Knotenpunkt aus"
                Exit Sub
            End If
            
            Set selectedSubpath = curve.selection.FirstNode.subPath
            
            If Not selectedSubpath Is Nothing Then
                
                Dim nodeStartIndex As Integer
                For i = 1 To curve.subPaths.count
                    If curve.subPaths(i) Is selectedSubpath Then
                        Exit For
                    Else
                        nodeStartIndex = nodeStartIndex + curve.subPaths(i).Nodes.count
                    End If
                Next i
                
'                ActiveDocument.ClearSelection
                
                'selectedSubpath.Nodes.range.CreateSelection
                
'                curve.ClearSelection
'                curve.Nodes.range().CreateSelection
                
                ' TODO Da man scheinbar kein ParamArray erstellen und übergeben kann,
                ' könnte man es versuchen über Application.Evaluate einen String zusammen zu bauen.
                ' Etwa so: curve.Nodes.range(2, 3).CreateSelection
'                curve.Nodes.range(2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13).CreateSelection
                
                
                Dim commandString As String
                commandString = "curve.Nodes.range("
                
                For i = 1 To selectedSubpath.Nodes.count
                    commandString = commandString & (nodeStartIndex + i)
                    If i < selectedSubpath.Nodes.count Then commandString = commandString & ","
                Next i
                
                commandString = commandString & ").CreateSelection"
                
                Application.Evaluate commandString
                
                
                'selectedSubpath.Segments.range.CreateSelection
                
                DoEvents
                refresh
                
            End If
            
            
        Else
            MsgBox "Es wurde keine Kurve gefunden!"
        End If
    End If
        
    
End Sub




Public Sub ViewboxAnhandVonAmazonVorschauErstellen()
    
    Globals.endIfNoDocumentOpen
    Globals.endIfNoActiveShape
    
    Dim selectedShape As shape
    Set selectedShape = ActiveShape
    
    Dim size As Double
    size = ActiveShape.SizeWidth / AmazonExport.getAmazonKonfiSize * AmazonExport.getAmazonKonfiSizeWithoutPadding
    
    Dim rect As New rect
    rect.SetRect selectedShape.centerX - size / 2, selectedShape.centerY - size / 2, size, size
    
    
    Dim viewRect As shape
    Set viewRect = ActiveLayer.CreateRectangleRect(rect)
    
    viewRect.name = "Viewbox"
    
    viewRect.outline.Type = cdrOutline
    viewRect.outline.color = Globals.getViewShapeColor
    
    viewRect.fill.ApplyNoFill
End Sub


Public Sub ViewboxPaddingEntfernen()
    
    Globals.startMacro
    
    Globals.endIfNoDocumentOpen
    Globals.endIfNoActiveShape
    
    Dim selectedShape As shape
    Set selectedShape = ActiveShape
    
    If Not Globals.isViewShape(selectedShape) Then
        MsgBox "Bitte wähle eine Viewbox aus!"
        Globals.endMacro
    End If
    
    
    Dim newWidth As Double
    newWidth = selectedShape.SizeWidth / AmazonExport.getAmazonKonfiSize * AmazonExport.getAmazonKonfiSizeWithoutPadding
    
    Dim newHeight As Double
    newHeight = selectedShape.SizeHeight / AmazonExport.getAmazonKonfiSize * AmazonExport.getAmazonKonfiSizeWithoutPadding
    
    selectedShape.SetSizeEx selectedShape.centerX, selectedShape.centerY, newWidth, newHeight
    
    Globals.endMacro
End Sub


' Bei den Definitions-Designs soll der Kundentext jetzt automatisch in die passende Stelle eingesetzt werden.
' Diese Funktion stellt die Texte dafür um
Public Sub DefinitionDesignTextUmwandeln()
    
    Globals.warnIfNoDocumentAndEnd
    
    Globals.startMacro
    
    
    definitionDesignTextUmwandelnVerarbeiteFormen ActiveLayer.shapes
    
    Globals.endMacro
    
End Sub

Private Function definitionDesignTextUmwandelnVerarbeiteFormen(shapes As shapes)
    For i = 1 To shapes.count
        Dim currentShape As shape
        Set currentShape = shapes(i)
        
        If currentShape.Type = cdrTextShape Then
            
            If currentShape.visible Then
                
    '            Debug.Print "Text: '" & currentShape.text.Story.text & "'"
                If Globals.startsWith(currentShape.text.Story.text, "[   ") And Globals.endsWith(currentShape.text.Story.text, "Substantiv") Then
                    If currentShape.text.IsArtisticText Then currentShape.text.ConvertToParagraph
                    currentShape.CreateSelection
                    Globals.markSelectedShape Globals.getAmazonCustomerTextInBlanksKeyWord, True, True, False
                    Globals.markSelectedShape Globals.getIgnoreAmazonCustomerColorKeyWord, True, True, False
                    
                    ' 15x20
'                    currentShape.SetSizeEx currentShape.LeftX, currentShape.centerY, ActiveDocument.ToUnits(129.393, cdrMillimeter), currentShape.SizeHeight
                    
                    ' 20x30
                    currentShape.SetSizeEx currentShape.LeftX, currentShape.centerY, ActiveDocument.ToUnits(181.151, cdrMillimeter), currentShape.SizeHeight
                    
                    currentShape.text.Story.text = "[                         ]   Substantiv"
                End If
                
            End If
            
        ElseIf currentShape.Type = cdrGroupShape Then
            
            definitionDesignTextUmwandelnVerarbeiteFormen currentShape.shapes
            
        End If
        
        Set currentShape = Nothing
    Next i
End Function



Public Sub addBleedToUploadboxes()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.startMacro
    
    ActiveDocument.BeginCommandGroup "addBleedToUploadboxes"
    
    Dim designs As collection
    Set designs = Globals.getSelectedDesignsOrAll(onlyValidDesigns:=True)
    
    For d = 1 To designs.count
        
        Dim currentDesign As productDesign
        Set currentDesign = designs(d)
        
        For k = 1 To currentDesign.getLayerCount
            Dim currentLayer As ProductDesignLayer
            Set currentLayer = currentDesign.getLayer2(k)
            
            Dim uploadBoxes As shapeRange
            Set uploadBoxes = currentLayer.newCustomShapeTypeQuery(Globals.uploadBox).search
            
            For u = 1 To uploadBoxes.count
                
                Dim uploadBox As shape
                Set uploadBox = uploadBoxes(u)
                
                
                If Globals.isShapePowerclip(uploadBox) Then
                    addBleedToUploadbox uploadBox
                Else
                    addBleedToUploadbox Globals.getPhotoOfUploadBoxGroup(uploadBox)
                End If
                
                Set uploadBox = Nothing
            Next u
            
            Set uploadBoxes = Nothing
            Set currentLayer = Nothing
        Next k
        
        Set currentDesign = Nothing
    Next d
    
    
    Globals.endMacro
    
End Sub



Private Function addBleedToUploadbox(uploadBox As shape)
    
    If Not uploadBox.curve.IsClockwise Then
        uploadBox.curve.ReverseDirection
    End If
    
    Dim bleedSizeInDocUnits As Double
    bleedSizeInDocUnits = ActiveDocument.ToUnits(Globals.getDefaultBleedSizeInMM, cdrMillimeter)
    
    For i = 1 To uploadBox.curve.Nodes.count
        Dim x As Integer
        Dim y As Integer
        
        If i = 1 Or i = 4 Then
            x = -1
        Else
            x = 1
        End If
        
        If i = 3 Or i = 4 Then
            y = -1
        Else
            y = 1
        End If
        
        uploadBox.curve.Nodes.item(i).Move bleedSizeInDocUnits * x, bleedSizeInDocUnits * y
    Next i
    
End Function


Public Sub TestChangeTextCodingToArab()
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    If ActiveShape.Type = cdrTextShape Then
        'ActiveShape.text.Story.LanguageID = cdrArabic
        'ActiveShape.text.Story.CharSet = cdrCharSetArabic
        ActiveShape.text.range(1, 5).CharSet = cdrCharSetArabic
    Else
        MsgBox "Bitte wähle eine Textform aus"
    End If
End Sub


Sub HelveticaZuMontserrat()
    ActiveDocument.ReferencePoint = cdrMiddleLeft
    
    
    Dim OrigSelection As shapeRange
    Set OrigSelection = ActiveSelectionRange
    
    For i = 1 To OrigSelection.count
        If OrigSelection(i).Type = cdrTextShape Then
            OrigSelection(i).text.Story.font = "Montserrat"
            OrigSelection(i).text.Story.Style = cdrMediumFontStyle
        End If
        
        OrigSelection(i).SetSizeEx OrigSelection(i).LeftX, OrigSelection(i).centerY, OrigSelection(i).SizeWidth * 0.9
    Next i
    
    
    
End Sub




' Für den neuen Shopify-Shop werden Informationen in einer Excel von allen Artikeln auf der neuen Struktur benötigt
Sub ProduktInfosFuerShopifySammeln()
    
    Select Case MsgBox("Möchtest du wirklich, dass eine Excel von allen Produkten erstellt wird? Corel wird dabei für eine Weile brauchen!", vbYesNo Or vbQuestion, "Wirklich?")
    Case vbNo
        Exit Sub
    End Select

    Dim timer As New StopWatch
    timer.startTimer
    
    Dim csvString As String
    csvString = "Verarbeitungsart;Material;Kategorie;Form;Artikelnummer;Größe in cm;Skalierung;Pfad;Designanzahl" & vbNewLine
    
    Globals.getLogger True ' Resetten
    Globals.getLogger.logINFO "Starte 'ProduktInfosFuerShopifySammeln'"
    
'    productInfosForShopifyProcessFolder Globals.getNewStructureProductsFolder, csvString, Globals.getLogger
'    productInfosForShopifyProcessFolder "V:\Produkte\Brotdosen-Set", csvString, Globals.getLogger
'    productInfosForShopifyProcessFolder "V:\Produkte\Türklingel\Funkklingeln\Acryl + Edelstahl\Ausschnitt\Eckig\Cococam\16x28 (16x26)", csvString, Globals.getLogger
'    productInfosForShopifyProcessFolder "V:\Produkte\Hausnummern\Gravur\Acryl\20x15 - raus", csvString, Globals.getLogger
'    productInfosForShopifyProcessFolder "V:\Produkte\Hausnummern\Gravur\3D\Acryl + Edelstahl\18x12", csvString, Globals.getLogger
'    productInfosForShopifyProcessFolder "C:\Users\GRAVURU 2\Desktop\Hauptform nicht geschlossen BUG\Gravur\30x20", csvString, Globals.getLogger
    
    ' EXCEL DATEI
    Globals.saveCSVStringIntoExcel csvString, Globals.getDesktopPath & "Ergebnis.xlsx"
    
    MsgBox "Excel ist fertig generiert. Zeit: " & timer.stopTimer
    
    Globals.openFile Globals.getDesktopPath & "Ergebnis.xlsx"
    
End Sub


Private Function productInfosForShopifyProcessFolder(folder As String, ByRef csvString As String, Optional logger As logger)
        
    If Globals.isFolderDesignsFolder(folder) Then
        
        Dim sizeFolder As New FSSizeFolder
        sizeFolder.init folder
        sizeFolder.searchDesignsFiles
        
        ' Es gibt Ordner, in denen noch keine Designdaten außer der CDR im [CDR] Ordner liegen
        If sizeFolder.getDesignFilesSize = 0 Then
            Exit Function
        End If
        
        Dim artikelnummer As String
        artikelnummer = Globals.getFolderName(Globals.getDefaultDesignNameFromDesignsFolder(folder))
        
        Dim isGravur As Boolean
        isGravur = Not InStr(folder, "Gravur") = 0
        
        Dim productIDObj As New ProductIDObject
        productIDObj.setProductID artikelnummer
        
        Dim sizeString As String
        productIDObj.replaceSizeDotWithComma
        sizeString = productIDObj.getSize(1)
        
        Dim aspectRatio As String
        
        If Not sizeString = "" Then
            Dim sizeStringDimension() As String
            sizeStringDimension = Globals.getWidthAndHeightOfSize(sizeString)
            
            If sizeStringDimension(1) = "" Then
                aspectRatio = 1
            Else
                aspectRatio = Format(CDbl(sizeStringDimension(1)) / CDbl(sizeStringDimension(2)), "0.00")
            End If
            
            
        End If
        
        Dim category As String
        category = replace(folder, "V:\Produkte\", "")
        ' Es gibt Ordner wie den Bierhammer, wo direkt die Designs kommen. Dann ist 'folder' 'V:\Produkte\Bierhammer'. Man kann also kein '\' am Ende entfernen
        If Not InStr(category, "\") = 0 Then category = left(category, InStr(category, "\") - 1)
        

        ProductRecognizer.initIfNeeded
        
        ' Ein Design finden, welches eine CDR hat
        ' ----------------------------------------
        Dim designCDRPath As String
        For i = 1 To sizeFolder.getDesignFilesSize
            Dim currentDesignFile As FSDesignFiles
            Set currentDesignFile = sizeFolder.getDesignFiles((i))
            
            If Globals.fileExist(currentDesignFile.getAmazonImportCDRPath) Then
                designCDRPath = currentDesignFile.getAmazonImportCDRPath
                Exit For
            End If
            
            Set currentDesignFile = Nothing
        Next i
        
        Dim shapeNames As String
        If Not designCDRPath = "" Then
            Dim doc As document
            Set doc = Application.OpenDocument(designCDRPath)  'Application.OpenDocumentAsCopy(designCDRPath)
            
            ' ----------------------------------------
            
            ' Formname aller Layer vom Design erkennen
            ' ----------------------------------------
            Dim design As New productDesign
            Dim designShape As shape
            Set designShape = doc.ActiveLayer.shapes.FindShape(, cdrGroupShape)
            If Not designShape Is Nothing Then
                design.newProductDesign designShape
                If design.isValidProductDesign Then
                    Dim foundLayerNameCount As Integer
                    For i = 1 To design.getLayerCount
                        Dim layer As ProductDesignLayer
                        Set layer = design.getLayer2(i)
                        
                        Dim currentLayerName As String
                        currentLayerName = ProductRecognizer.recognizeProductLayerName(layer, , , True, logger)
                        If Not currentLayerName = "" Then foundLayerNameCount = foundLayerNameCount + 1
                        
                        ' TextLayer Name schöner anzeigen. Ist sonst '*TextLayer'
                        currentLayerName = replace(currentLayerName, ProductRecognizer.TEXT_LAYER_NAME, "Text")
                        
                        shapeNames = shapeNames & IIf(foundLayerNameCount = 2, "(", "") & IIf(foundLayerNameCount > 2, ", ", "") & currentLayerName
                        
                        Set layer = Nothing
                    Next i
                    If foundLayerNameCount > 1 Then shapeNames = shapeNames & ")"
                End If
            End If
            ' ----------------------------------------
            doc.Close
        End If
        
        If shapeNames = "" Then shapeNames = sizeString
        
        Dim materialFullName As String
        If Not productIDObj.getMaterial = "" Then
RetryMatrerialFullName:
            materialFullName = productIDObj.getMaterialFullName
    
'            If materialFullName = "" Then
'                Select Case MsgBox("Das Materialkürzel '" & productIDObj.getMaterial & "' wurde nicht erkannt!", vbAbortRetryIgnore Or vbExclamation, Application.name)
'                    Case vbAbort
'                        Globals.endMacro
'                    Case vbRetry
'                        GoTo RetryMatrerialFullName
'                    Case vbIgnore
'                        ' Weitermachen
'                End Select
'            End If
        End If
        
        csvString = csvString & IIf(isGravur, "Gravur", "Druck") & ";"      ' Verarbeitungsart
        csvString = csvString & materialFullName & ";"                      ' Material
        csvString = csvString & category & ";"                              ' Kategorie
        csvString = csvString & shapeNames & ";"                            ' Form
        csvString = csvString & artikelnummer & ";"                         ' Artikelnummer
        csvString = csvString & sizeString & ";"                            ' Größe in cm
        csvString = csvString & aspectRatio & ";"                           ' Skalierung
        csvString = csvString & "file:///" & folder & ";"                   ' Pfad
        csvString = csvString & sizeFolder.getDesignFilesSize            ' Designanzahl
        
        csvString = csvString & vbNewLine ' Zeile abschließen
        
    Else
        Dim subFolders As collection
        Set subFolders = Globals.getFoldersInFolder(folder)
        
        For i = 1 To subFolders.count
            productInfosForShopifyProcessFolder subFolders(i), csvString, logger ' Rekursion
        Next i
    End If
    
End Function



' TODO:
' - Fotos von Uploadboxen evtl. in ruhe lassen
Public Sub BitmapBacken()
    
    Globals.warnIfNoDocumentAndEnd
    
    Globals.startMacro
    
    Globals.getLogger True
    Globals.getLogger.addTab , "BitmapBacken"
    
    If Not Globals.debugHistory Then
        CorelScriptTools.BeginWaitCursor
        ActiveDocument.BeginCommandGroup "Bitmap backen"
        If Not Globals.debugErrors Then On Error GoTo MacroError
    End If
    
    
    
    ' DPI beim User abfragen
    ' -------------------------------
    Dim DPI As Integer
    
    Dim answer As String
    answer = InputBox("Welche DPI soll verwendet werden? Wenn das Produkt nie hochskaliert werden soll reichen 300", , 300)
    
    If answer = "" Then
        GoTo ExitSub
    ElseIf IsNumeric(answer) Then
        DPI = CInt(answer)
        If DPI = 0 Then GoTo ExitSub
    End If
    ' -------------------------------
    
    
    ProgressBarUserForm.Start False
    
    
    Dim selectedShapes As shapeRange
    Set selectedShapes = Globals.getSelectedShapesOrAll
    
    For i = 1 To selectedShapes.count
        
        bakeProcessShape selectedShapes(i), DPI, Globals.getLogger
        
        ProgressBarUserForm.setProgress i / CDbl(selectedShapes.count)
    Next i
    
    ProgressBarUserForm.Hide
    
ExitSub:
    Globals.getLogger.removeTab
    Globals.endMacro
    Exit Sub
MacroError: 'Alle Fehler hier abfangen und die CommandGruppe beenden, damit man mit einem Schritt zurück gehen kann (STRG + Z), auch wenn ein Fehler aufgetreten ist
    MsgBox Err.Description & ", " & Err.number, vbCritical
    ProgressBarUserForm.Hide
    Globals.getLogger.removeTab
    Globals.endMacro True
End Sub


Private Function bakeProcessShape(shape As shape, DPI As Integer, Optional logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[Macros.bakeProcessShape]"
    
    If shape.Type = cdrGroupShape Then
        For i = 1 To shape.shapes.count
            bakeProcessShape shape.shapes(i), DPI, logger
        Next i
    ElseIf shape.Type = cdrBitmapShape Then
        If Globals.isShapeDesignElement(shape) Then
            bakeBitmap shape, DPI, logger
        End If
    End If
    
    If Not logger Is Nothing Then logger.removeTab
    
End Function


Private Function bakeBitmap(bitmapShape As shape, ByVal DPI As Integer, Optional logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[Macros.bakeBitmap] bitmapShape: " & Globals.shapeToString(bitmapShape)
    
    Dim needsRaster As Boolean
    needsRaster = True
    
    needsRaster = (bitmapShape.bitmap.resolutionX > DPI Or bitmapShape.bitmap.resolutionY > DPI)
    If Not logger Is Nothing Then logger.logINFO "needsRaster: '" & needsRaster & "'"
    
    Dim bitmapShapePersistent As PersistentShape
    Set bitmapShapePersistent = PersistentShapeHandler.getShape(bitmapShape, logger)
    
    Dim shapeToRestoreInvisibility As PersistentShape
    If Not bitmapShape.visible Then
        Set shapeToRestoreInvisibility = Globals.makeShapeVisibleAndGetShapeForInvisibilityRestore(bitmapShape)
    End If
    
    
    Dim cropShapeOriginal As shape
    Set cropShapeOriginal = ActiveLayer.CreateCurve(bitmapShape.bitmap.CropEnvelope)
    
    ' Ein Offset von 1cm hinzufügen, falls man wegen der Beschnittzugabe mal mehr Textur braucht
    Dim oneCentimeter As Double
    oneCentimeter = ActiveDocument.ToUnits(1, cdrCentimeter)
    Dim cropShapeForRaster As shape
    Set cropShapeForRaster = ActiveLayer.CreateRectangle(cropShapeOriginal.LeftX - oneCentimeter, cropShapeOriginal.TopY + oneCentimeter, cropShapeOriginal.RightX + oneCentimeter, cropShapeOriginal.BottomY - oneCentimeter)
    
    Dim cropNeeded As Boolean
    If bitmapShapePersistent.getShape.bitmap.Cropped Then
        cropNeeded = Not Globals.areCurvesEqual(bitmapShapePersistent.getShape.bitmap.CropEnvelope, cropShapeForRaster.DisplayCurve, False, , 0.2)
    End If
    
    ' Zuschnitt entfernen
    If cropNeeded Then bitmapShapePersistent.getShape.bitmap.ResetCropEnvelope
    If Not logger Is Nothing Then logger.logINFO "Bitmap nach dem entfernen des Bitmap Zuschnitts: " & Globals.shapeToString(bitmapShape)
    
    ' Zuschneiden +1 cm
    If cropNeeded Then bitmapShapePersistent.intersectAsTarget cropShapeForRaster
    If Not logger Is Nothing Then logger.logINFO "Bitmap nach dem Zuschnitt: " & Globals.shapeToString(bitmapShapePersistent.getShape)
    
    
    ' Falls die Bitmap einen Zuschnitt benötigt, aber schon die richtige DPI hat, muss die Bitmpa trotzem gerastert werden, da sonst abgeschnittene Bereiche noch da bleiben
    If cropNeeded And Not needsRaster Then DPI = bitmapShapePersistent.getShape.bitmap.resolutionX
    
    ' Rastern (ja auch wenn eigentlich nur Zugeschnitten wurde. Denn durch das Rastern werden außen liegende abgeschnittene Pixel entfernt)
    If needsRaster Or cropNeeded Then bitmapShapePersistent.convertToBitmap resolution:=DPI, antiAliasing:=cdrNormalAntiAliasing
    
    If Not logger Is Nothing Then logger.logINFO "Bitmap nach dem Rastern: " & Globals.shapeToString(bitmapShapePersistent.getShape)
    ' Originaler Zuschnitt
    If cropNeeded Then bitmapShapePersistent.intersectAsTarget cropShapeOriginal
    If Not logger Is Nothing Then logger.logINFO "Bitmap nach dem Zuschneiden mit dem originalen Zuschnitt: " & Globals.shapeToString(bitmapShapePersistent.getShape)
    
    cropShapeOriginal.delete
    cropShapeForRaster.delete
    
    If Not shapeToRestoreInvisibility Is Nothing Then shapeToRestoreInvisibility.getShape.visible = False
    
ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
End Function



' Wenn eine Textbox rot ist, weil der Text darin zu groß ist, wird die Textbox höher gemacht
Public Sub CorrectOverflowTextBoxes()
    
    Globals.warnIfNoDocumentAndEnd
    
    Globals.startMacro
    Globals.storeSelection
    
    If Not Globals.debugHistory Then
        CorelScriptTools.BeginWaitCursor
        ActiveDocument.BeginCommandGroup "Textbox Überfluss beheben"
        If Not Globals.debugErrors Then On Error GoTo MacroError
    End If
    
    correctOverflowTextBoxesFunction
    
    Globals.restoreSelection
    
    
    Globals.endMacro
    Exit Sub
MacroError: 'Alle Fehler hier abfangen und die CommandGruppe beenden, damit man mit einem Schritt zurück gehen kann (STRG + Z), auch wenn ein Fehler aufgetreten ist
    MsgBox Err.Description & ", " & Err.number, vbCritical
    ProgressBarUserForm.Hide
    Globals.endMacro True
End Sub


Private Function correctOverflowTextBoxesFunction()
    
    Dim selectedShapes As shapeRange
    Set selectedShapes = Globals.getSelectedShapesOrAll
    
    With ProgressBarUserForm.newSubProgress(selectedShapes.count)
            
        For i = 1 To selectedShapes.count
            correctOverflowTextBoxesProcessShape selectedShapes(i)
            .setStepsProgress i
        Next i
        
        .finishProgress
    End With
    
End Function

Private Function correctOverflowTextBoxesProcessShape(shape As shape)
    
    If shape.Type = cdrGroupShape Then
        
        For i = 1 To shape.shapes.count
            correctOverflowTextBoxesProcessShape shape.shapes(i)
        Next i
        
    ElseIf shape.Type = cdrTextShape Then
        If Not shape.text.IsArtisticText Then ' Textbox
            If shape.text.Overflow Then
                
                Dim textCopy As shape
                Set textCopy = Globals.copyPasteShape(shape, False)
                textCopy.name = "Macros.textboxHeightCorrectionProcessShape.textCopy"
                
                textCopy.text.Frame.FrameShape.SizeHeight = ActiveDocument.ToUnits(1000, cdrCentimeter)
                textCopy.text.Frame.FrameShape.SizeWidth = ActiveDocument.ToUnits(1000, cdrCentimeter)
                
                Dim textHeight As Double
                textHeight = textCopy.text.Story.TextLineRects.boundingBox.height
'                MsgBox "Frame Height: " & shape.text.Frame.FrameShape.SizeHeight & ", Text height: " & textHeight
                
                
                ' Herausfinden zu welchem Punkt hiniskaliert werden soll
                ' --------------------------
                Dim xCenterPos As Double
                Select Case shape.text.Story.alignment
                    Case cdrLeftAlignment, cdrNoAlignment
                        xCenterPos = shape.text.Frame.FrameShape.LeftX
                    Case cdrCenterAlignment
                        xCenterPos = shape.text.Frame.FrameShape.centerX
                    Case cdrRightAlignment
                        xCenterPos = shape.text.Frame.FrameShape.RightX
                End Select
                ' --------------------------
                
                ' Zu einem freien Text (keine Textbox) kovertieren.
                ' Denn bei einer Textbox macht Corel die Baseline vom Text bis zum Textbox-Rand rechts.
                ' Das verfälscht die Breitenberechnung. Bei normalen Texten ist die Baseline aber richtig
                textCopy.text.ConvertToArtistic
                
                Dim w As Double
                w = textCopy.text.Story.Baselines.boundingBox.width + ActiveDocument.ToUnits(0.5, cdrMillimeter)
                
                shape.text.Frame.FrameShape.SetSizeEx xCenterPos, shape.text.Frame.FrameShape.centerY, _
                    max(shape.text.Frame.FrameShape.SizeWidth, w), textCopy.text.Story.TextLineRects.boundingBox.height + ActiveDocument.ToUnits(0.5, cdrMillimeter)
                
                textCopy.delete
            End If
        End If
    End If
    
End Function











Public Sub ListeSchriftartenHäufigkeitProDesignAuf()
    
    Globals.startMacro
    
    
    Dim exportFolder As String
    exportFolder = CorelScriptTools.GetFolder(Globals.getNewStructureProductsFolder, "Wähle einen Ordner, dessen CDRs analysiert werden sollen")
    
    If exportFolder = "" Then GoTo Finally ' User hat abbrechen gedrückt -> Beenden
    exportFolder = Globals.addBackslash(exportFolder)
    
    
    
    Select Case MsgBox("Sollen für die Unterordner eigene Excel-Listen erstellt werden?", vbYesNoCancel Or vbQuestion, Application.name)
        Case vbYes
            listFontsOfDesigns_ProcessParentExcelFolder exportFolder
        Case vbNo
            Globals.openFile listFontsOfDesigns_ProcessExcelFolder(exportFolder)
            
        Case vbCancel
            ' Nichts machen
    End Select
    
    
    
    GoTo Finally
MacroError: 'Alle Fehler hier abfangen und die CommandGruppe beenden, damit man mit einem Schritt zurück gehen kann (STRG + Z), auch wenn ein Fehler aufgetreten ist
    MsgBox Err.Description & ", " & Err.number, vbCritical
Finally:
    ProgressBarUserForm.Hide
    Globals.endMacro True
End Sub


Private Function listFontsOfDesigns_ProcessParentExcelFolder(folderPath As String)
    Dim subFolders As collection
    Set subFolders = Globals.listFoldersInFolder(folderPath)
    
    Dim i As Integer
    For i = 1 To subFolders.count
        Dim folderName As String
        folderName = Globals.getFolderName(subFolders(i))
        
        If Not startsWith(folderName, "_") And Not startsWith(folderName, "[") Then
            listFontsOfDesigns_ProcessExcelFolder Globals.addBackslash(subFolders(i))
        End If
    Next i
End Function



' Ein Ordner, für den eine Excel generiert werden soll
' Returnt den Pfad unter der die Excel gespeichert wurde
Private Function listFontsOfDesigns_ProcessExcelFolder(ByVal folderPath As String)
    
    ' Wird mehrfach verwendet
    Dim i As Integer
    
    Dim fontsUsed As New Dictionary
    listFontsOfDesigns_AddCSVElement fontsUsed, "Header", -1, "Schrifarten"
    listFontsOfDesigns_AddCSVElement fontsUsed, "Header", 0, "Häufigkeit"
    
    listFontsOfDesigns_AddCSVElement fontsUsed, "Pfad", -1, "Pfad"
    listFontsOfDesigns_AddCSVElement fontsUsed, "Pfad", 0, " " ' Wichtig, damit es keine Verschiebung bei den Pfaden gibt
    
    Dim cdrFolders As collection
    Set cdrFolders = Globals.getCDRFolders(folderPath)
    
    
    With ProgressBarUserForm.newSubProgress(cdrFolders.count)
        
        For i = 1 To cdrFolders.count
            .setDisplayText cdrFolders(i)
            
            listFontsOfDesigns_ProcessCDRFolder cdrFolders(i), fontsUsed, (i)
            .setStepsProgress i
        Next i
            
        .finishProgress
    End With
    
    
    
    Set fontsUsed = Globals.sortDictionaryKeys(fontsUsed, 2)
    
    listFontsOfDesigns_ProcessExcelFolder = listFontsOfDesigns_ExportCSV(fontsUsed, folderPath)
    
End Function




Private Function listFontsOfDesigns_AddCSVElement(fontsUsed As Dictionary, ByVal fontName As String, ByVal productIndex As Integer, ByVal designList As String)
    
    If fontName = "" Then Err.Raise vbObjectError + 513, , "[Macros.listFontsOfDesigns_AddCSVElement] 'fontName' darf nicht leer sein!"
    
    If Not fontsUsed.Exists(fontName) Then
        fontsUsed.add fontName, New Dictionary
    End If
    
    Dim fontDict As Dictionary
    Set fontDict = fontsUsed(fontName)
    
    If Not fontDict.Exists(productIndex) Then
        fontDict.add productIndex, ""
    End If
    
    fontDict(productIndex) = designList
    
End Function


Private Function listFontsOfDesigns_GetCSVElement(fontsUsed As Dictionary, fontName As String, productIndex As Integer) As String
    listFontsOfDesigns_GetCSVElement = fontsUsed(fontName).item(productIndex)
End Function



Private Function listFontsOfDesigns_ExportCSV(fontsUsed As Dictionary, exportFolder As String) As String
    
    Dim csvString As String
    
    Dim fontDict As Dictionary
    Dim fontName As Variant
    
    Dim lineString As String
    
    Dim headerDict As Dictionary
    
    ' Schrifarten durchlaufen
    For Each fontName In fontsUsed.keys()
        Set fontDict = fontsUsed(fontName)
        
        If headerDict Is Nothing Then Set headerDict = fontDict
        
        ' Jede Schriftart mit dem Header durchlaufen, denn nur er hat alle CDRs.
        ' Es kann nämlich sein, dass in einer CDR eine Schriftart garnicht vorkommt
        '
        ' Der Header hat also für jede CDR einen Key: [0, 1, 2, 3, usw.]
        ' Eine Schriftart hat nur für die CDRs einen Key, die diese Schrifart auch nutzt: [1, 5]
        For Each element In headerDict.keys()
            If fontDict.Exists(element) Then
                lineString = Globals.addStringWithDelimiterIfNeeded(lineString, fontDict(element), ";")
            Else
                lineString = Globals.addStringWithDelimiterIfNeeded(lineString, "", ";")
            End If
        Next element
        
        csvString = csvString & lineString & vbNewLine
        
        lineString = ""
    Next fontName
    
    Dim fileName As String
    fileName = Globals.addBackslash(exportFolder) & Globals.getFolderName(exportFolder) & " Schriftartenhäufigkeit.xlsx"
    
    Globals.saveCSVStringIntoExcel csvString, fileName
    
    listFontsOfDesigns_ExportCSV = fileName
End Function


Private Function listFontsOfDesigns_ProcessCDRFolder(folder As String, ByRef fontsUsed As Dictionary, productIndex As Integer)
    
    Dim cdrs As collection
    Set cdrs = Globals.getDesignCDRsInFolder(folder)
    
    Dim firstCDRName As String
    If cdrs.count > 0 Then
        firstCDRName = Globals.getFileName(cdrs(1))
        listFontsOfDesigns_AddCSVElement fontsUsed, "Header", productIndex, firstCDRName
        
        listFontsOfDesigns_AddCSVElement fontsUsed, "Pfad", productIndex, folder
    End If
    
    With ProgressBarUserForm.newSubProgress(cdrs.count)
        For i = 1 To cdrs.count
            .setDisplayText "CDR: " & Globals.getFileName(cdrs(i))
            
            listFontsOfDesigns_ProcessCDR cdrs(i), fontsUsed, firstCDRName, productIndex
            
            .setStepsProgress i
        Next i
        .finishProgress
    End With
    
End Function


Private Function listFontsOfDesigns_ProcessCDR(cdrPath As String, ByRef fontsUsed As Dictionary, firstCDRName As String, productIndex As Integer)
    
    On Error GoTo SomeError
    
    Dim doc As document
    Set doc = Application.OpenDocument(cdrPath)
    
    listFontsOfDesigns_ProcessDoc doc, fontsUsed, firstCDRName, productIndex
    
    GoTo Finally
    
SomeError:
    listFontsOfDesigns_AddCSVElement fontsUsed, "Error", productIndex, "Error"
Finally:
    If Not doc Is Nothing Then doc.Close
End Function


Private Function listFontsOfDesigns_ProcessDoc(doc As document, ByRef fontsUsed As Dictionary, firstCDRName As String, productIndex As Integer)
    
    Dim designs As ProductDesignRange
    Set designs = Globals.getAllDesignsAsRange(, True)
    
    With ProgressBarUserForm.newSubProgress(designs.count)
        For i = 1 To designs.count
            .setDisplayText "Design: " & designs.getDesign(i).getProductID
            
            listFontsOfDesigns_ProcessDesign designs.getDesign(i), fontsUsed, firstCDRName, productIndex
            
            .setStepsProgress i
        Next i
        .finishProgress
    End With
    
End Function


Private Function listFontsOfDesigns_ProcessDesign(design As productDesign, ByRef fontsUsed As Dictionary, firstCDRName As String, productIndex As Integer)
    
    Dim designNumber As Integer
    designNumber = design.getProductIDObject.getDesignNumber
    
    ' Wunschtextdesign und andere Ungültige ausschließen
    If Not designNumber >= 0 Then Exit Function
    
    Dim textShapes As shapeRange
    Set textShapes = design.newCustomShapeTypeQuery(DesignElementShapeType).setExcludeInvisibleShapes(True).search
    Set textShapes = newCustomShapeTypeQuery(textShapes, TextAny).search
    textShapes.RemoveRange Globals.flattenShapeRange(design.newCustomShapeTypeQuery(uploadBox).search)
    
    
    Dim appearedFontsInDesign As New collection
    
    Dim textShape As shape
    For Each textShape In textShapes
        listFontsOfDesigns_ProcessTextShape textShape, fontsUsed, firstCDRName, productIndex, appearedFontsInDesign, designNumber
    Next textShape
End Function




Private Function listFontsOfDesigns_ProcessTextShape(textShape As shape, ByRef fontsUsed As Dictionary, firstCDRName As String, productIndex As Integer, appearedFontsInDesign As collection, designNumber As Integer)
    
    Dim fontName As String
    fontName = textShape.text.Story.font
    
    If fontName = "" Then
        fontName = "Unbekannt (Fontbase prüfen)"
    End If
    
    ' Schriftart kam schonmal auf dem Design vor. Überspringen
    If Globals.isStringInCollection(appearedFontsInDesign, fontName, StringEquals) Then Exit Function
    
    appearedFontsInDesign.add fontName
    
    listFontsOfDesigns_AddCSVElement fontsUsed, fontName, -1, fontName
    
    ' Die Designs, von der 'firstCDRName', die die Schriftart von 'fontName' nutzen
    Dim designsUsedFont As String
    designsUsedFont = listFontsOfDesigns_GetCSVElement(fontsUsed, fontName, productIndex)
    
    ' Designnummer hinzufügen. Mit Komma (Delimiter) Wenn nötig
    designsUsedFont = Globals.addStringWithDelimiterIfNeeded(designsUsedFont, "D" & designNumber)
    listFontsOfDesigns_AddCSVElement fontsUsed, fontName, productIndex, designsUsedFont
    
    Dim fontUsedCounter As String
    fontUsedCounter = listFontsOfDesigns_GetCSVElement(fontsUsed, fontName, 0)
    If fontUsedCounter = "" Then fontUsedCounter = "0"
    fontUsedCounter = CStr(CInt(fontUsedCounter) + 1)
    listFontsOfDesigns_AddCSVElement fontsUsed, fontName, 0, fontUsedCounter
     
End Function








Public Sub CloneNewStructureAmazonCDRsToGoogleDrive()
    
    ProgressBarUserForm.Start
    
    Select Case MsgBox("Möchtest du wirklich die AmazonDaten der Neuen Struktur auf den Google Drive Ordner kopieren? Das kann lange dauern!", vbYesNo Or vbExclamation, Application.name)
    Case vbNo
        Exit Sub
    End Select
    
    Dim folder As String
    folder = CorelScriptTools.GetFolder(Globals.getNewStructureServerFolder)
    
    processFolderForCloningNewStructureAmazonCDRsToGoogleDrive folder
'    processFolderForCloningNewStructureAmazonCDRsToGoogleDrive "V:\Produkte\Anhänger\Tannenbaum Anhänger\UV\Acryl\8x9 - Clipart"
    
    ProgressBarUserForm.Hide
    
End Sub


' Rekursiv
Private Function processFolderForCloningNewStructureAmazonCDRsToGoogleDrive(folder As String, Optional isInsideDesignsFolder As Boolean)
    
    Dim folders As collection
    Set folders = Globals.getFoldersInFolder(folder)
    
    For i = 1 To folders.count
        
        Dim currentFolder As String
        currentFolder = folders(i)
        
        Dim isDesignsFolder As Boolean
        isDesignsFolder = Globals.isFolderDesignsFolder(currentFolder)
        isInsideDesignsFolder = isDesignsFolder Or isInsideDesignsFolder
        
        If isDesignsFolder Then
        
            ProgressBarUserForm.setProgressText folder
            
            Dim foldersSizeFolder As New FSSizeFolder
            foldersSizeFolder.init currentFolder
            
            ' [CDR] Ordner
            Dim cdrFolderPath As String
            cdrFolderPath = foldersSizeFolder.getCDRFolderPath
            Dim cdrFolderPathGoogleDrive As String
            cdrFolderPathGoogleDrive = replace(cdrFolderPath, Globals.getNewStructureServerFolder, Globals.getGoogleDriveNewStructureFolder)
            
            Globals.copyPasteFolder cdrFolderPath, cdrFolderPathGoogleDrive, True
            
            ' Leeren Fake CDR Ordner erstellen
'            Globals.createFolder cdrFolderPathGoogleDrive
            
            
            
'            If Globals.folderExists(folderssizeFolder.getTemplateFolderPath) Then
'                Dim templateFolderPathGoogleDrive As String
'                templateFolderPathGoogleDrive = replace(folderssizeFolder.getTemplateFolderPath, Globals.getNewStructureServerFolder, Globals.getGoogleDriveNewStructureFolder)
'
'                Globals.copyPasteFolder folderssizeFolder.getTemplateFolderPath, templateFolderPathGoogleDrive, True
'            End If
            
            ' Designordner
'            folderssizeFolder.searchDesignsFiles
'            For d = 1 To folderssizeFolder.getDesignFilesSize
'                Dim currDesignFiles As FSDesignFiles
'                Set currDesignFiles = folderssizeFolder.getDesignFiles(d)
'
'                ' Amazon "Export" Ordner kopieren
'                ' Bspw. "GT-S-30x20-D1\Export"
'                If Globals.folderExists(currDesignFiles.getAmazonImportFolderPath) Then
'                    Globals.copyPasteFolder currDesignFiles.getAmazonImportFolderPath, replace(Globals.getParentPath(currDesignFiles.getAmazonImportFolderPath), Globals.getNewStructureServerFolder, Globals.getGoogleDriveNewStructureFolder), True
'                End If
'
'                Set currDesignFiles = Nothing
'            Next d
            
            
            
            Set foldersSizeFolder = Nothing
        End If
        
        If (Not isDesignsFolder) Or isInsideDesignsFolder Then
            ' Rekursion
            processFolderForCloningNewStructureAmazonCDRsToGoogleDrive currentFolder, isInsideDesignsFolder
        End If
        
    Next i
    
End Function



Public Sub SelectShapeByStaticID()
    
    Globals.warnIfNoDocumentAndEnd
    
    Globals.startMacro
    
    Dim answer As String
    answer = InputBox("Gib die Static ID der Form an, die ausgewählt werden soll")
    
    If answer = "" Then Globals.endMacro
    
    Dim foundShape As shape
    Set foundShape = ActivePage.FindShape(, , answer)
    
    If Not foundShape Is Nothing Then
        foundShape.CreateSelection
    Else
        MsgBox "Es wurde nichts gefunden"
    End If
    
End Sub





' =========================
' Haupt-Makro für CorelDRAW
' =========================
Sub RenameFontFilesInFolder()
    Dim folderPath As String
    Dim folder As folder
    Dim file As file
    Dim fontName As String
    Dim fileName As String
    Dim newFileName As String
    Dim newFullPath As String
    Dim ext As String
    Dim counter As Long
    
    ' Ordner über Windows-Dialog wählen
    folderPath = CorelScriptTools.GetFolder(Globals.getDesktopPath, "Ordner mit Schriftart-Dateien wählen")
    If folderPath = "" Then
        Exit Sub
    End If
    
    If Right(folderPath, 1) <> "\" Then
        folderPath = folderPath & "\"
    End If
    
    Set folder = Globals.fileSystemObject.GetFolder(folderPath)
    
    
    Globals.startMacro
    ProgressBarUserForm.Start False
    
    
    Dim fileCounter As Integer
    For Each file In folder.files
        ext = LCase(Globals.fileSystemObject.GetExtensionName(file.name))
        
        ' Nur TTF / OTF bearbeiten
        If ext = "ttf" Or ext = "otf" Then
            
            fontName = getFontNameFromFile(file.path)
            
            fileName = Globals.fileSystemObject.GetBaseName(file.name)
            
            Debug.Print "Compare fileName: " & fileName & ", fontName: " & fontName
            
            If Len(fontName) > 0 And Not fileName = fontName Then ' Prüfen, ob der neue Name anders als der Alte ist
                fontName = sanitizeFileName(fontName)
                
                If Len(fontName) > 0 Then
                    newFileName = fontName & "." & ext
                    newFullPath = folderPath & newFileName
                    
                    ' Falls es bereits eine Datei mit diesem Namen gibt, Nummer anhängen
                    counter = 1
                    Do While Globals.fileExist(newFullPath)
                        newFileName = fontName & " (" & counter & ")." & ext
                        newFullPath = folderPath & newFileName
                        counter = counter + 1
                    Loop
                    
                    ' Umbenennen
                    On Error Resume Next
                    Name file.path As newFullPath
                    If Err.number <> 0 Then
                        Debug.Print "Fehler beim Umbenennen von: " & file.path & " -> " & newFullPath & " | " & Err.Description
                        Err.Clear
                    End If
                    On Error GoTo 0
                End If
            End If
        End If
        fileCounter = fileCounter + 1
        ProgressBarUserForm.setProgress fileCounter / CDbl(folder.files.count)
    Next file
    
    ProgressBarUserForm.Hide
    Globals.endMacro True
    
    MsgBox "Fertig. Schriftdateien wurden (so gut wie möglich) nach Fontnamen umbenannt.", vbInformation
End Sub




' =====================================================
' Font-Familiennamen aus Fontdatei via PowerShell/.NET
' =====================================================
Private Function getFontNameFromFile(ByVal fontPath As String) As String
    Dim shellObj As Object
    Dim execObj As Object
    Dim cmd As String
    Dim outputLine As String
    Dim result As String
    Dim psPath As String
    
    ' Pfad vorbereiten – einfache Anführungszeichen escapen
    psPath = replace(fontPath, "'", "''")
    
    ' PowerShell-Befehl:
    ' - System.Drawing laden
    ' - PrivateFontCollection erstellen
    ' - Font-Datei hinzufügen
    ' - Familienname ausgeben
    cmd = "powershell -NoLogo -NoProfile -Command " & _
          """Add-Type -AssemblyName System.Drawing;" & _
          "$f = New-Object System.Drawing.Text.PrivateFontCollection;" & _
          "$f.AddFontFile('" & psPath & "');" & _
          "($f.Families[0].Name)"""
    
    On Error GoTo ErrHandler
    
    Set shellObj = CreateObject("WScript.Shell")
    Set execObj = shellObj.Exec(cmd)
    
    Do While Not execObj.StdOut.AtEndOfStream
        outputLine = execObj.StdOut.ReadLine
        If Trim(outputLine) <> "" Then
            result = Trim(outputLine)
            Exit Do
        End If
    Loop
    
    getFontNameFromFile = result
    Exit Function

ErrHandler:
    getFontNameFromFile = ""
End Function




' ===============================================
' Ungültige Zeichen aus Dateinamen herausfiltern
' ===============================================
Private Function sanitizeFileName(ByVal nameIn As String) As String
    Dim badChars As Variant
    Dim ch As Variant
    Dim cleaned As String
    
    cleaned = nameIn
    
    badChars = Array("\", "/", ":", "*", "?", """", "<", ">", "|")
    For Each ch In badChars
        cleaned = replace(cleaned, ch, "_")
    Next ch
    
    ' Vor- und Nachlauf-Leerzeichen entfernen
    cleaned = Trim(cleaned)
    
    sanitizeFileName = cleaned
End Function







Public Sub ConvertPowerClipToOldUploadbox()
    
    Dim powerClips As shapeRange
    Set powerClips = newCustomShapeTypeQuery(ActiveLayer.shapes.All, PowerClipShapeType).search
    
    For i = 1 To powerClips.count
        Globals.convertNewUploadboxToOld powerClips(i)
    Next i
    
End Sub









Public Sub MarkGroupAsMotive()
    Dim folderPath As String
    folderPath = CorelScriptTools.GetFolder(Globals.getNewStructureProductsFolder, "Wähle einen Ordner")
    
    If folderPath = "" Then Exit Sub
    
    Globals.startMacro
    
    
    Dim run As New CDRRun
    run.init folderPath, "MarkGroupAsMotive", True
    
    markGroupAsMotive_ProcessCDRPaths run.getPaths, run
    
    MsgBox "Fertig"
    
    Globals.endMacro
End Sub


Private Function markGroupAsMotive_ProcessCDRPaths(cdrFilePaths As ArrayList, run As CDRRun)
    
    With ProgressBarUserForm.newSubProgress(cdrFilePaths.count)
    
        For i = 1 To cdrFilePaths.count
            .setDisplayText cdrFilePaths.item(i)
            
            markGroupAsMotive_ProcessCDRPath cdrFilePaths.item(i)
            
            run.saveSuccessfullCDRRun cdrFilePaths.item(i)
            
            .setStepsProgress i
        Next i
        
        .finishProgress
    End With
End Function


Private Function markGroupAsMotive_ProcessCDRPath(cdrFilePath As String)
    
    
    Dim doc As document
    Set doc = Application.OpenDocument(cdrFilePath)
    
    markGroupAsMotive_ProcessOpenDocument
    
    doc.Save
    
    doc.Close
    
End Function


Public Sub TestMarkGroupAsMotiveProcessOpenDocument()
    markGroupAsMotive_ProcessOpenDocument
End Sub


Private Function markGroupAsMotive_ProcessOpenDocument()
    
    Dim designs As ProductDesignRange
    Set designs = Globals.getAllDesignsAsRange(, True, , , False)
    
    Dim design36 As productDesign
    Set design36 = designs.getDesignByDesignNumber(36)
    
    If design36 Is Nothing Then Exit Function
    
    markGroupAsMotive_ProcessDesign design36
    
End Function


Private Function markGroupAsMotive_ProcessDesign(design As productDesign)
    
    Dim motiv As shape
    Set motiv = design.newCustomShapeTypeQuery(ByName).setArgument1("Voegel31_motiv").search.firstShape
    
    If motiv Is Nothing Then Exit Function
    
    Dim leuchtturmUndMoewenGroup As shape
    
    ' Möwen Motiv & Leuchtturm sind entweder zusammen in einer Gruppe ...
    Set leuchtturmUndMoewenGroup = Globals.getParentShapeOfShape(motiv)
    
    ' ... wenn nicht, dann ist die Obergruppe der Möwen die Designgruppe (was falsch ist) ...
    If leuchtturmUndMoewenGroup Is design.getDesignShape Then
        ' ... dann liegt die leuchtturmgruppe über dem Möwenmotiv und beide werden gruppiert
        Dim groupShapes As New shapeRange
        groupShapes.add motiv
        groupShapes.add Globals.getShapeAboveShape(motiv)
        Set leuchtturmUndMoewenGroup = groupShapes.group
    End If
    
    leuchtturmUndMoewenGroup.name = "Leuchtturm_BUG_motiv"
    
End Function










Public Sub ReplaceMotive()
    
    Dim folderPath As String
    folderPath = CorelScriptTools.GetFolder(Globals.getNewStructureProductsFolder & "Türschilder\Gravur\Edelstahl\5x2", "Wähle den Ordner, in dessen CDRs nach Motiven gesucht werden soll")
    If folderPath = "" Then Exit Sub
    
    Dim motiveToReplaceName As String
    motiveToReplaceName = InputBox("Wie heißt das Motiv, dass du ersetzen willst?", "Motiv Name", "Hund17_motiv")
    If motiveToReplaceName = "" Then Exit Sub
    
    Dim newMotiveFilePath As String
    newMotiveFilePath = CorelScriptTools.GetFileBox("SVG Dateien (*.svg)|*.svg", "Wähle das neue Motiv aus", folder:=Globals.getNewStructureMotivesFolder & "Tiere & Pfoten\Hunde", file:="Hund_05.svg")
    '"V:\Motive\Tiere & Pfoten\Hunde\Hund_05.svg"
    If newMotiveFilePath = "" Then Exit Sub
    
    
    Globals.startMacro
    
    Dim run As New CDRRun
    run.init folderPath, "ReplaceMotive", True
    
    replaceMotive_ProcessCDRPaths run.getPaths, run, motiveToReplaceName, newMotiveFilePath
    
    MsgBox "Fertig"
    
    Globals.endMacro
End Sub



Private Function replaceMotive_ProcessCDRPaths(cdrFilePaths As ArrayList, run As CDRRun, motiveToReplaceName As String, newMotiveFilePath As String)
    
    With ProgressBarUserForm.newSubProgress(cdrFilePaths.count)
            
        For i = 1 To cdrFilePaths.count
            .setDisplayText cdrFilePaths.item(i)
            
            replaceMotiveProcessCDR cdrFilePaths.item(i), run, motiveToReplaceName, newMotiveFilePath

            .setStepsProgress i
        Next i
        
        .finishProgress
    End With
    
End Function



Private Function replaceMotiveProcessCDR(cdrPath As String, run As CDRRun, motiveToReplaceName As String, newMotiveFilePath As String)
    
    With ProgressBarUserForm.newSubProgress(5)
        
        .setDisplayText "Öffne CDR"
        Application.OpenDocument cdrPath
        .setStepsProgress 1
        
        .setDisplayText "Tausche Motiv"
        PlaceFile.replaceShape motiveToReplaceName, newMotiveFilePath ' , Globals.getLogger(True)
        .setStepsProgress 2
        
        .setDisplayText "Behebe überlaufene Textboxen"
        ' Nichts auswählen
        ActiveDocument.ClearSelection
        correctOverflowTextBoxesFunction
        .setStepsProgress 3


'        .setDisplayText "Autokorrektur"
'        ' Nichts auswählen
'        ActiveDocument.ClearSelection
'        AutoCorrection.startFunction True
'        .setStepsProgress 4

        .setDisplayText "Speichere CDR"
        ActiveDocument.Save
        .setStepsProgress 4

        .setDisplayText "Exportiere Amazon-Import-Daten"
        ' Nichts auswählen
        ActiveDocument.ClearSelection
        Export2.startFunction Globals.STRUCTURE_PATH, SplitFileForAmazonKonfi, False, exportAll, False, False, layer, True, Export2.createLogger, True

        .setDisplayText "Schließe CDR"
        ActiveDocument.Close
        .setStepsProgress 5

        .setDisplayText "Speichere Fortschritts-Textdatei"
        ' Merken, welche Datei zuletzt bearbeitet wurde, damit beim Fehlschlagen dort weitergemacht werden kann
        run.saveSuccessfullCDRRun cdrPath
        
        .finishProgress
    End With
        
End Function











Public Sub TestSubPorgresses()
    
'    MsgBox "Start"
    
    With ProgressBarUserForm.newSubProgress(2)
    
        With ProgressBarUserForm.newSubProgress(5)
            
            For i = 1 To 5
                
                .setDisplayText "A1"
                'Globals.Sleep 10
                
                With ProgressBarUserForm.newSubProgress(20)
                    For j = 1 To 20
                        
                        .setDisplayText "B1"
                        Globals.Sleep 50
                        .setStepsProgress j
                        
                    Next j
                    .finishProgress
                End With
                
                .setStepsProgress i
            Next i
            
            
            .finishProgress
        End With
        
        .setStepsProgress 1
        
        
        
        
        
        
        
        With ProgressBarUserForm.newSubProgress(5)
            
            For i = 1 To 5
                
                .setDisplayText "A2"
                'Globals.Sleep 10
                
                With ProgressBarUserForm.newSubProgress(20)
                    For j = 1 To 20
                        
                        .setDisplayText "B2"
                        
                        
                        With ProgressBarUserForm.newSubProgress(10)
                            For h = 1 To 10
                                
                                .setDisplayText "C2"
                                Globals.Sleep 5
                                .setStepsProgress h
                                
                            Next h
                            .finishProgress
                        End With
                        
                        .setStepsProgress j
                        
                    Next j
                    .finishProgress
                End With
                
                .setStepsProgress i
            Next i
            
            
            .finishProgress
        End With
        
        
        
        
        
        
        
        .setStepsProgress 2
    
        .finishProgress
    End With
    
'    MsgBox "Fertig"
    
End Sub






' Generiert (anders als CloneAndSetNewDoorbellMainShapes) aus einer CDR Quelle für die Designs und den neuen Formen neue CDRs
' Die neuen Formen haben keine Ausschnitte mehr im Acryl sondern nur noch Bohrlöcher und Kabellöcher
Public Sub CloneAndSetNewDoorbellMainShapes2()
    
    Dim logger As New logger
    logger.init "CloneAndSetNewDoorbellMainShapes2"
    
    logger.addTab , "[Macros.CloneAndSetNewDoorbellMainShapes2]"
    
    ' CDRs von Kay
    Dim newMainShapesCDRFolder As String
    newMainShapesCDRFolder = "P:\Projekte\Funkklingel Montage\Funkklingeln" ' & "\AE"
'    newMainShapesCDRFolder = CorelScriptTools.GetFolder(newMainShapesCDRFolder)
    If newMainShapesCDRFolder = "" Then Exit Sub
    newMainShapesCDRFolder = Globals.addBackslash(newMainShapesCDRFolder)
    
    
    ' Ordner mit den NS CDRs mit den Desings
    Dim doorbellsFolder As String
    doorbellsFolder = "V:\Produkte\Türklingel\Funkklingeln\Acryl + Edelstahl\Ausschnitt\Eckig"
'    doorbellsFolder = CorelScriptTools.GetFolder(doorbellsFolder)
    If doorbellsFolder = "" Then Exit Sub
    doorbellsFolder = Globals.addBackslash(doorbellsFolder)
    
    
    
    ' Output Ordner
    Dim outputFolder As String
    outputFolder = Globals.getDesktopPath & "Funkklingeln Output\"
    Globals.createFolder outputFolder
    
    
    Dim run As New CDRRun
    run.init newMainShapesCDRFolder, "CloneAndSetNewDoorbellMainShapes2", False
    ' Vorlagen ignorieren
    run.getPaths.removeStringsMatchingComparison "_vorlage", StringInside, True
    
    
    ' DEBUGGING, damit nur eine FK verarbeitet wird
'    Dim firstPath As String
'    firstPath = run.getPaths.item(1)
'    run.getPaths.RemoveAll
'    run.getPaths.add firstPath
    
    ' Nur ein bestimmtes Modell verarbeiten
    run.getPaths.keepStringsMatchingComparison "Blink Kabel 2K+", StringInside
    
    CloneAndSetNewDoorbellMainShapes2_ProcessNewMainShapeCDRs run.getPaths, run, doorbellsFolder, outputFolder, newMainShapesCDRFolder, logger
    
    logger.removeTab
End Sub



Public Function CloneAndSetNewDoorbellMainShapes2_ProcessNewMainShapeCDRs(paths As ArrayList, run As CDRRun, doorbellsFolder As String, outputFolder As String, newMainShapesCDRFolder As String, logger As logger)
    logger.addTab , "[Macros.ProcessNewMainShapeCDRs]"
    
    
    With ProgressBarUserForm.newSubProgress(paths.count)
    
        Dim i As Integer
        For i = 1 To paths.count
            .setDisplayText "CDR " & Globals.getFileName(paths.item(i))
            
            CloneAndSetNewDoorbellMainShapes2_ProcessNewMainShapeCDR paths.item(i), run, doorbellsFolder, outputFolder, newMainShapesCDRFolder, logger
            
            .setStepsProgress i
        Next i

    
        .finishProgress
    End With
    
    logger.removeTab
End Function



Public Function CloneAndSetNewDoorbellMainShapes2_ProcessNewMainShapeCDR(cdrPath As String, run As CDRRun, doorbellsFolder As String, outputFolder As String, newMainShapesCDRFolder As String, logger As logger)
    logger.addTab , "[Macros.ProcessNewMainShapeCDR] cdrPath: '" & cdrPath & "'"
    
    Dim doc As document
    Set doc = Application.OpenDocument(cdrPath)
    
    Dim sizeShapes As shapeRange
    Set sizeShapes = doc.ActiveLayer.shapes.All
    
    Dim newDoorBellName As String
    newDoorBellName = Globals.getFileName(cdrPath)
    
    With ProgressBarUserForm.newSubProgress(sizeShapes.count)
    
        Dim i As Integer
        For i = 1 To sizeShapes.count
            .setDisplayText "Verarbeite Größenform " & sizeShapes(i).name
            
            CloneAndSetNewDoorbellMainShapes2_ProcessNewMainShapeSize sizeShapes(i), doorbellsFolder, newDoorBellName, outputFolder, newMainShapesCDRFolder, logger
            
            .setStepsProgress i
        Next i
    
        .finishProgress
    End With
    
    run.saveSuccessfullCDRRun cdrPath
    
Finally:
    doc.Close ' Wenns nicht geht Methode unten nutzen
    logger.removeTab
End Function


' Einer der 3 Größenversionen eines FK-Models wird hier verarbeitet
' Bspw. 16x28 oder 24x20 oder 35x18
Public Function CloneAndSetNewDoorbellMainShapes2_ProcessNewMainShapeSize(shape As shape, doorbellsFolder As String, newDoorBellName As String, outputFolder As String, newMainShapesCDRFolder As String, logger As logger)
    logger.addTab , "[Macros.ProcessNewMainShapeSize]"
    
    Dim sizeName As String
    sizeName = shape.name
    
    With ProgressBarUserForm.newSubProgress(4)
    
        ' Pro Größe gibt es dann 4 Versionen, wegen der Acryl-Größen (Auch Edelstahlrahmen genannt)
        Dim i As Integer
        For i = 1 To 4
            Dim v2AWidth As Integer
            Dim v2AHeight As Integer
            v2AWidth = Globals.getWidthOfSize(sizeName)
            v2AHeight = Globals.getHeightOfSize(sizeName)
            
            Dim acrylicWidth As Integer
            Dim acrylicHeight As Integer
            acrylicWidth = v2AWidth
            acrylicHeight = v2AHeight
            
            ' Sorgt dafür, dass es 4 Größen-Varianten für Acryl gibt:
            ' Breite -2, Höhe -2
            ' Breite -0, Höhe -2
            ' Breite -2, Höhe -0
            ' Breite -0, Höhe -0
            If (i + 1) Mod 2 Then acrylicWidth = acrylicWidth - 2
            If i < 3 Then acrylicHeight = acrylicHeight - 2
            
            .setDisplayText "Acrylvariante " & acrylicWidth & "x" & acrylicHeight
            
            CloneAndSetNewDoorbellMainShapes2_ProcessAcrylicSizeVariant shape, doorbellsFolder, newDoorBellName, v2AWidth, v2AHeight, acrylicWidth, acrylicHeight, outputFolder, newMainShapesCDRFolder, logger
            
            newWidth = 0
            newHeight = 0
            
            .setStepsProgress i
        Next i
        .finishProgress
    End With
    
    logger.removeTab
End Function



Public Function CloneAndSetNewDoorbellMainShapes2_ProcessAcrylicSizeVariant(shape As shape, doorbellsFolder As String, newDoorBellName As String, v2AWidth As Integer, v2AHeight As Integer, acrylicWidth As Integer, acrylicHeight As Integer, _
        outputFolder As String, newMainShapesCDRFolder As String, logger As logger)
        
    logger.addTab , "[Macros.ProcessAcrylicSizeVariant] acrylicWidth: '" & acrylicWidth & "', acrylicHeight: '" & acrylicHeight & "'"
    
    Dim v2aSizeName As String
    v2aSizeName = v2AWidth & "x" & v2AHeight
    Dim acrylicSizeName As String
    acrylicSizeName = acrylicWidth & "x" & acrylicHeight
    
    Dim v2AAndAcrylicSizeName As String
    v2AAndAcrylicSizeName = v2aSizeName & IIf(acrylicSizeName = v2aSizeName, "", " (" & acrylicSizeName & ")")
    
    Dim designsCDRPath As String
    designsCDRPath = CloneAndSetNewDoorbellMainShapes2_GetDoorBellFolderPathForCDR(v2aSizeName, acrylicSizeName)
    designsCDRPath = designsCDRPath & "\[CDR]"
    designsCDRPath = Globals.getDesignCDRsInFolder(designsCDRPath).item(1)
    
    Dim newProductID As String
    newProductID = CloneAndSetNewDoorbellMainShapes2_GetDoorBellProductID(doorbellsFolder, newDoorBellName, v2aSizeName, acrylicSizeName)
    
    ' ACRYL
    ' Finale Acryl Hauptform für die 1. Schicht erstellen
    Dim newAcrylMainShapeCDRPath As String
    newAcrylMainShapeCDRPath = CloneAndSetNewDoorbellMainShapes2_CreateAcrylicSizeVariantAndGetPath(shape, acrylicWidth, acrylicHeight, outputFolder, logger)
    
    ' EDELSTAHL
    ' Finale Edelstahl Hauptform für die 2. Schicht erstellen
    Dim newV2AMainShapeCDRPath As String
    newV2AMainShapeCDRPath = CloneAndSetNewDoorbellMainShapes2_CreateV2ASizeVariantAndGetPath(shape, v2AWidth, v2AHeight, outputFolder, logger)
    
    If newV2AMainShapeCDRPath = "" Then Err.Raise vbObjectError + 513, , "[Globals.CloneAndSetNewDoorbellMainShapes2_ProcessAcrylicSizeVariant] 'newV2AMainShapeCDRPath' ist Leer "
    
    CloneAndSetNewDoorbellMainShapes2_ProcessDesignsCDR designsCDRPath, newProductID, newAcrylMainShapeCDRPath, newV2AMainShapeCDRPath, v2AAndAcrylicSizeName, newDoorBellName, outputFolder, logger
    
    
    logger.removeTab
End Function



Public Function CloneAndSetNewDoorbellMainShapes2_ProcessDesignsCDR(path As String, newProductID As String, newAcrylMainShapeCDRPath As String, newV2AMainShapeCDRPath As String, _
    v2AAndAcrylicSizeName As String, newDoorBellName As String, ByVal outputFolder As String, logger As logger)
    
    logger.addTab , "[Macros.ProcessDesignsCDR] path: '" & path & "'"
    
    
    Dim doc As document
    Set doc = Application.OpenDocumentAsCopy(path)
    
    
    Dim designs As New ProductDesignRange
    designs.AddRange Globals.getAllDesigns(, True)
    
    ' Artikelnummer vergeben (Designnummer beibehalten)
    productID.startFunction_ProcessDesigns designs, newProductID, False, "", "", "", "", logger, , True, Keep, False, KeepCountType
    
    Dim i As Integer
    For i = 1 To designs.count
        CloneAndSetNewDoorbellMainShapes_ProcessDesign designs.getDesign(i), newAcrylMainShapeCDRPath, newV2AMainShapeCDRPath, logger
        
        CloneAndSetNewDoorbellMainShapes_DeleteGroundPlatesOfDesign designs.getDesign(i)
    Next i
    
    
    CloneAndSetNewDoorbellMainShapes_PlaceGroundPlates
     
    ' Neu suchen, da es einen Absturz gibt bei 'CreateDoorbellInnerBleed_ProcessDesigns'
    Set designs = New ProductDesignRange
    designs.AddRange Globals.getAllDesigns(, True)
    
    ' Da der Ausschnitt jetzt weg ist, müssen manche Designs diese Lücke besser auffüllen
    CreateDoorbellInnerBleed_ProcessDesigns designs, logger
    
    PlaceFile.setSelectedPlaceTypeJob jobVarianteBefestigungBohrlöcher4x5mm
    PlaceFile.startFunction designs.getDesignShapes, Classfactory.newPlaceFileParameters.setParts(Part1, layer2).setMainShapeAddMode(AddNewMainShapesToExisting).setErrorWhenNothingPlaced
    
    outputFolder = Globals.addBackslash(outputFolder) & newDoorBellName & "\" & v2AAndAcrylicSizeName & "\[CDR]\"
    
    Globals.createFolder outputFolder
    
    Dim newCDRPath As String
    newCDRPath = outputFolder & newProductID & "_Designs.cdr"
    
    logger.logINFO "Speichere '" & newCDRPath & "' ... "
    doc.SaveAsCopy newCDRPath
    logger.logINFO "Gespeichert!"
    
Finally:
    doc.Close
    
    logger.removeTab
End Function



' Wird für die Benennung der neuen CDR genutzt.
' Wenn man bspw die neuen Hauptformen der Aqara verarbeitet, nimmt man die Designs der Aosu Pro,
' damit alle Designs bei den unterschiedlichen FK gleich sind.
' Die Artikelnummer muss dann aber noch von der Aosu Pro auf die Aqara geändert werden
Public Function CloneAndSetNewDoorbellMainShapes2_GetDoorBellProductID(doorbellsFolder As String, newDoorBellName As String, v2aSizeName As String, acrylicSizeName As String)
    Dim result As String
    result = doorbellsFolder & Globals.addBackslash(newDoorBellName)
    
    If Not Globals.folderExists(result) Then
        Err.Raise vbObjectError + 513, , "[Macros.CloneAndSetNewDoorbellMainShapes2_GetDoorBellProductID] Folgender Ordner exestiert nicht. Auch wenn es ein neues Model ist, muss sein Ordner sammt Größenordner schon da sein. Ordner: " & result
    End If
    
    If Globals.stringCollectionContains(Globals.getSubFolderNames(result), "neigung", StringInside, True) Then
        result = Globals.getFoldersInFolder(result)(2) & "\" ' Ordner "Ohne Neigungswinkel" wählen
    End If
    
    result = result & v2aSizeName & IIf(v2aSizeName = acrylicSizeName, "", " (" & acrylicSizeName & ")")
    
    ' Artikelnummer finden
    result = Globals.getFolderName(Globals.getDefaultDesignNameFromDesignsFolder(result))
    
    CloneAndSetNewDoorbellMainShapes2_GetDoorBellProductID = result
End Function


Public Function CloneAndSetNewDoorbellMainShapes2_GetDoorBellFolderPathForCDR(v2aSizeName As String, acrylicSizeName As String)
    
    Dim result As String
    
    Select Case v2aSizeName
        Case "16x28", "24x20", "35x18"
            result = "P:\Projekte\Funkklingel Montage\Funkklingeln\Designs\Aosu Pro\"
        Case "17x30", "26x22", "38x20"
            result = "P:\Projekte\Funkklingel Montage\Funkklingeln\Designs\EZVIZ DB2C\"
        Case "18x32", "34x24", "42x24"
            result = "P:\Projekte\Funkklingel Montage\Funkklingeln\Designs\Eufy Dual\"
    End Select
    
    result = result & v2aSizeName & IIf(acrylicSizeName = v2aSizeName, "", " (" & acrylicSizeName & ")")
    
    CloneAndSetNewDoorbellMainShapes2_GetDoorBellFolderPathForCDR = result
End Function



Public Function CloneAndSetNewDoorbellMainShapes2_CreateAcrylicSizeVariantAndGetPath(newMainShapeSizeShape As shape, width As Integer, height As Integer, outputFolder As String, logger As logger) As String
    logger.addTab , "[Macros.CreateAcrylicSizeVariantAndGetPath]"
    
    Dim acrylGroupShape As shape
    Set acrylGroupShape = Globals.copyPasteShape(newMainShapeSizeShape, True)
    
    
    ' Blaue Form finden, welche für die Klingel-Position und Größe steht
    Dim doorBellHelpShape As shape
    Set doorBellHelpShape = acrylGroupShape.shapes.FindShape(Query:="@outline.color=rgb(0,0,255)") ' Blau
    Globals.makeShapeGuideLineShape doorBellHelpShape ' Umfärben, damit es eine Hilfslinienform wird
    
    Dim acrylShape As shape
    Set acrylShape = acrylGroupShape.shapes.FindShape(Query:="@outline.color=rgb(255,0,0)") ' Rot
    
    Dim acrylShapes As shapeRange
    Set acrylShapes = Globals.getShapeRangeShapesSortedByBoundingBoxSize(Globals.BreakApartShapeSubPaths(acrylShape), False)
    
    ' Muss in die Gruppe kommen, denn wenn gleich die alte Acrylform gelöscht wird, darf 'doorBellHelpShape' nicht alleine in der Gruppe sein
    ' denn sonst lößt Corel die Gruppe auf
    acrylShapes.OrderBackOf doorBellHelpShape
    
    ' Edelstahl Form löschen
    acrylShapes.firstShape.delete
    acrylShapes.Remove 1 ' Aus der Range entfernen
    
    ' Acrylrahmen auf passende Form bringen
    Dim acrylFrameShape As shape
    Set acrylFrameShape = acrylShapes.firstShape
    acrylFrameShape.SetSizeEx acrylFrameShape.centerX, acrylFrameShape.centerY, ActiveDocument.ToUnits(width, cdrCentimeter), ActiveDocument.ToUnits(height, cdrCentimeter)
    
    ' Form wiederherstellen
    Dim smallerShapes As New shapeRange
    smallerShapes.AddRange acrylShapes
    smallerShapes.RemoveRange Globals.shapeToShapeRange(acrylFrameShape)
    
    ' Zusammenfügen
    acrylShape.delete ' Alte Form löschen, denn jetzt kommt die neue
    Set acrylShape = Globals.subtractShapeRangeWithShape(smallerShapes, acrylFrameShape, False, False, logger)
    
    Dim acrylicSizeName As String
    acrylicSizeName = width & "x" & height
    
    ' Export
    Dim cdrExportPath As String: cdrExportPath = outputFolder & "Acryl " & acrylicSizeName
    newShapeExport(acrylGroupShape, cdrExportPath, cdrCDR) _
        .setColorizeRDGWhiteToRGB(False) _
        .setColorizeCMYKBlackToRGB(False) _
        .export
    
    ' Kopie löschen
    acrylGroupShape.delete
    
    
    ' Pfad zurückgeben
    CloneAndSetNewDoorbellMainShapes2_CreateAcrylicSizeVariantAndGetPath = cdrExportPath & ".cdr"
    
    
ExitFunction:
    logger.logINFO "Returne: '" & CloneAndSetNewDoorbellMainShapes2_CreateAcrylicSizeVariantAndGetPath & "'"
    logger.removeTab
End Function





Public Function CloneAndSetNewDoorbellMainShapes2_CreateV2ASizeVariantAndGetPath(newMainShapeSizeShape As shape, width As Integer, height As Integer, outputFolder As String, logger As logger) As String
    logger.addTab , "[Macros.CreateV2ASizeVariantAndGetPath]"
    
    Dim v2aGroupShape As shape
    Set v2aGroupShape = Globals.copyPasteShape(newMainShapeSizeShape, True)
    
    ' Blaue Form finden, welche für die Klingel-Position und Größe steht
    Dim doorBellHelpShape As shape
    Set doorBellHelpShape = v2aGroupShape.shapes.FindShape(Query:="@outline.color=rgb(0,0,255)") ' Blau

    Dim v2aShape As shape
    Set v2aShape = v2aGroupShape.shapes.FindShape(Query:="@outline.color=rgb(255,0,0)") ' Rot
    
    Dim v2aShapes As shapeRange
    Set v2aShapes = Globals.getShapeRangeShapesSortedByBoundingBoxSize(Globals.BreakApartShapeSubPaths(v2aShape), False)
    
    ' Muss in die Gruppe kommen, denn wenn gleich die alte Acrylform gelöscht wird, darf 'doorBellHelpShape' nicht alleine in der Gruppe sein
    ' denn sonst lößt Corel die Gruppe auf
    v2aShapes.OrderBackOf doorBellHelpShape
    
    ' Acryl Form löschen
    v2aShapes(2).delete
    v2aShapes.Remove 2 ' Aus der Range entfernen
    
    ' Edelstahlrahmen
    Dim v2aFrameShape As shape
    Set v2aFrameShape = v2aShapes.firstShape
    
    ' Form wiederherstellen
    Dim smallerShapes As New shapeRange
    smallerShapes.AddRange v2aShapes
    smallerShapes.RemoveRange Globals.shapeToShapeRange(v2aFrameShape)
    
    ' Löschen, da diese schon auf dem Acryl liegt in der Acryldatei
    doorBellHelpShape.delete
    
    ' Zusammenfügen
    v2aShape.delete ' Alte Form löschen, denn jetzt kommt die neue
    Set v2aShape = Globals.subtractShapeRangeWithShape(smallerShapes, v2aFrameShape, False, False, logger)
    
    Dim v2aSizeName As String
    v2aSizeName = width & "x" & height
    
    ' Export
    Dim cdrExportPath As String: cdrExportPath = outputFolder & "Edelstahl " & v2aSizeName
    newShapeExport(v2aGroupShape, cdrExportPath, cdrCDR) _
        .setColorizeRDGWhiteToRGB(False) _
        .setColorizeCMYKBlackToRGB(False) _
        .export
    
    ' Kopie löschen
    v2aGroupShape.delete
    
    ' Pfad zurückgeben
    CloneAndSetNewDoorbellMainShapes2_CreateV2ASizeVariantAndGetPath = cdrExportPath & ".cdr"
    
    
ExitFunction:
    logger.logINFO "Returne: '" & CloneAndSetNewDoorbellMainShapes2_CreateV2ASizeVariantAndGetPath & "'"
    logger.removeTab
End Function










' Die Funkklingeln bekommen neue Hauptformen.
' Die Funkklingeln werden nicht mehr ins Acryl und Edelstahl geschnitten sondern nur deren Bohrlöcher und dann auf dem Acryl montiert
'
' Dieses Skript nimmt die CDRs von Kay, kopiert die Funkklingel CDR und ändert dort die Form ab
Public Sub CloneAndSetNewDoorbellMainShapes()
    
    Dim logger As New logger
    logger.init "CloneAndSetNewDoorbellMainShapes"
    
    logger.addTab , "[Macros.CloneAndSetNewDoorbellMainShapes]"
    
    ' CDRs von Kay
    Dim newMainShapesCDRFolder As String
    newMainShapesCDRFolder = "P:\Projekte\Funkklingel Montage\Funkklingeln"
'    newMainShapesCDRFolder = CorelScriptTools.GetFolder(newMainShapesCDRFolder)
    If newMainShapesCDRFolder = "" Then Exit Sub
    newMainShapesCDRFolder = Globals.addBackslash(newMainShapesCDRFolder)
    
    ' Ordner mit den NS CDRs mit den Desings
    Dim doorbellsFolder As String
    doorbellsFolder = "V:\Produkte\Türklingel\Funkklingeln\Acryl + Edelstahl\Ausschnitt\Eckig"
'    doorbellsFolder = CorelScriptTools.GetFolder(doorbellsFolder)
    If doorbellsFolder = "" Then Exit Sub
    doorbellsFolder = Globals.addBackslash(doorbellsFolder)
    
    ' Output Ordner
    Dim outputFolder As String
    outputFolder = Globals.getDesktopPath & "Funkklingeln Output\"
    
    Globals.createFolder outputFolder
    
    
    ' Gucken, ob es vorher einen Durchlauf gab, der bei einer CDR hängenblieb
    Dim lastCDRPathTextFilePath As String
    lastCDRPathTextFilePath = Globals.addBackslash(doorbellsFolder) & "CloneAndSetNewDoorbellMainShapes.txt"
    
    Dim lastCDRProcessedReached As Boolean
    
    
    ' Prüfen, ob es schonmal einen run gab und bei einer CDR gestoppt wurde
    ' --------------------------------------------
    Dim lastCDRProcessedLastRun As String
    If Globals.fileExist(lastCDRPathTextFilePath) Then
        lastCDRProcessedLastRun = Globals.loadTextFileLines(lastCDRPathTextFilePath)(0)
    Else
        lastCDRProcessedReached = True
    End If
    ' --------------------------------------------
    
    
    CloneAndSetNewDoorbellMainShapes_ProcessDoorbellFolders doorbellsFolder, newMainShapesCDRFolder, outputFolder, outputFolder, lastCDRPathTextFilePath, lastCDRProcessedLastRun, lastCDRProcessedReached, logger
    
    logger.removeTab
End Sub


Private Function CloneAndSetNewDoorbellMainShapes_ProcessDoorbellFolders(doorbellFoldersPath As String, newMainShapesCDRFolder As String, ByVal cdrExportFolderPath As String, outputFolder As String, _
    lastCDRPathTextFilePath As String, lastCDRProcessedLastRun As String, ByRef lastCDRProcessedReached As Boolean, logger As logger)
    
    logger.addTab , "[Macros.ProcessDoorbellFolders]"
    
    Dim doorBellFolders As collection
    Set doorBellFolders = Globals.getFoldersInFolder(doorbellFoldersPath)
    
    
    With ProgressBarUserForm.newSubProgress(doorBellFolders.count)
    
        For i = 1 To doorBellFolders.count
            .setDisplayText "Funkklingelordner " & doorBellFolders(i)
            CloneAndSetNewDoorbellMainShapes_ProcessDoorbellFolder doorBellFolders(i), newMainShapesCDRFolder, cdrExportFolderPath, outputFolder, lastCDRPathTextFilePath, lastCDRProcessedLastRun, lastCDRProcessedReached, logger
            .setStepsProgress i
        Next i
    
        .finishProgress
    End With
    
ExitFunction:
    logger.removeTab
End Function



Public Sub TestProcessDoorbellFolder()
    
    ' AQUARA
'    CloneAndSetNewDoorbellMainShapes_ProcessDoorbellFolder "V:\Produkte\Türklingel\Funkklingeln\Acryl + Edelstahl\Ausschnitt\Eckig\Aqara", _
'    "P:\Projekte\Funkklingel Montage\Funkklingeln", _
'    Globals.getDesktopPath & "Funkklingeln Output\", _
'    "", _
'    "", _
'    True, _
'    Globals.getLogger(True)
    
    ' AOSU PRO
'    CloneAndSetNewDoorbellMainShapes_ProcessDoorbellFolder "V:\Produkte\Türklingel\Funkklingeln\Acryl + Edelstahl\Ausschnitt\Eckig\Aosu Pro", _
'    "P:\Projekte\Funkklingel Montage\Funkklingeln", _
'    Globals.getDesktopPath & "Funkklingeln Output\", _
'    Globals.getLogger(True)

    
    CloneAndSetNewDoorbellMainShapes_ProcessDoorbellFolder "V:\Produkte\Türklingel\Funkklingeln\Acryl + Edelstahl\Ausschnitt\Eckig\Unifi G6 Entry", _
    "P:\Projekte\Funkklingel Montage\Funkklingeln", _
    Globals.getDesktopPath & "Funkklingeln Output\", _
    Globals.getDesktopPath & "Funkklingeln Output\", _
    "V:\Produkte\Türklingel\Funkklingeln\Acryl + Edelstahl\Ausschnitt\Eckig\Unifi G6 Entry\CloneAndSetNewDoorbellMainShapes.txt", _
    "", _
    True, _
    Globals.getLogger(True)
    
End Sub



' Verarbeitet einen Funkklingeloberordner wie z.B. "Aosu Pro"
' ACHTUNG: Wird rekursiv aufgerufen bei Neigungswinkel, denn erst dort stecken die Größenordner drin
Private Function CloneAndSetNewDoorbellMainShapes_ProcessDoorbellFolder(doorbellFolderPath As String, ByVal newMainShapesCDRFolder As String, ByVal cdrExportFolderPath As String, outputFolder As String, _
    lastCDRPathTextFilePath As String, lastCDRProcessedLastRun As String, ByRef lastCDRProcessedReached As Boolean, logger As logger, _
    Optional blockRecursion As Boolean = False, Optional doorbellName As String = "")

    logger.addTab , "[Macros.ProcessDoorbellFolder]"
    logger.logINFO "doorbellFolderPath: '" & doorbellFolderPath & "', newMainShapesCDRFolder: '" & newMainShapesCDRFolder & "'"
    
    Dim subFolders As collection
    Set subFolders = Globals.getFoldersInFolder(doorbellFolderPath)
    
    
    
    
    ' NEIGUNGSWINKEL
    ' Prüfen, ob im Funkklingelordner "Aosu Pro" bspw. nicht schon die Größenordner kommen sondern erst Neigungswinkel-Ordner
    If Not blockRecursion And Not Globals.getStringIndexInCollection(subFolders, "neigung", StringInside, True) = -1 Then
        
        For i = 1 To subFolders.count
            ' Nur Ordner ohne Neigung verarbeiten
            ' Denn die neuen Funkklingeln funktionieren mit und ohne Winkel
            If Globals.stringCompare(subFolders(i), "ohne", StringInside, True) And Globals.stringCompare(subFolders(i), "neigung", StringInside, True) Then
                CloneAndSetNewDoorbellMainShapes_ProcessDoorbellFolder subFolders(i), newMainShapesCDRFolder, cdrExportFolderPath, outputFolder, lastCDRPathTextFilePath, lastCDRProcessedLastRun, lastCDRProcessedReached, logger, True, Globals.getFolderName(doorbellFolderPath)
            End If
        Next i
        
    ' KEIN NEIGUNGSWINKEL
    Else
        
        ' Falls der Name nicht bereits durch einen rekursiven Aufruf wegen Neigungswinkel mitgegeben wurde
        If doorbellName = "" Then doorbellName = Globals.getFolderName(doorbellFolderPath)
        
        cdrExportFolderPath = Globals.addBackslash(cdrExportFolderPath) & doorbellName
        
        CloneAndSetNewDoorbellMainShapes_ProcessSizesFolders doorbellName, doorbellFolderPath, newMainShapesCDRFolder, cdrExportFolderPath, outputFolder, lastCDRPathTextFilePath, lastCDRProcessedLastRun, lastCDRProcessedReached, logger
        
    End If
    
ExitFunction:
    logger.removeTab
End Function




' Alle Größenordner
' von einer Funkklingel verarbeiten (je nach dem mit oder ohne Neigungswinkel)
Private Function CloneAndSetNewDoorbellMainShapes_ProcessSizesFolders(doorbellName As String, sizesFoldersPaths As String, newMainShapesCDRFolder As String, ByVal cdrExportFolderPath As String, outputFolder As String, _
    lastCDRPathTextFilePath As String, lastCDRProcessedLastRun As String, ByRef lastCDRProcessedReached As Boolean, logger As logger)
    
    logger.addTab , "[Macros.ProcessSizesFolders]"
    
    Dim sizeFolders As collection
    Set sizeFolders = Globals.getFoldersInFolder(sizesFoldersPaths)
    
    With ProgressBarUserForm.newSubProgress(sizeFolders.count)
    
        For i = 1 To sizeFolders.count
            .setDisplayText "Größenordner " & Globals.getFolderName(sizeFolders(i))
            CloneAndSetNewDoorbellMainShapes_ProcessSizeFolder doorbellName, sizeFolders(i), newMainShapesCDRFolder, Globals.addBackslash(cdrExportFolderPath) & Globals.getFolderName(sizeFolders(i)), outputFolder, lastCDRPathTextFilePath, lastCDRProcessedLastRun, lastCDRProcessedReached, logger
            .setStepsProgress i
        Next i
        .finishProgress
    End With
    
ExitFunction:
    logger.removeTab
End Function



Public Sub TestProcessSizeFolder()
    
    CloneAndSetNewDoorbellMainShapes_ProcessSizeFolder "Aosu Pro", _
    "V:\Produkte\Türklingel\Funkklingeln\Acryl + Edelstahl\Ausschnitt\Eckig\Aosu Pro\16x28", _
    "P:\Projekte\Funkklingel Montage\Funkklingeln", _
    "C:\Users\GRAVURU 2\Desktop\Funkklingeln Output\Aosu Pro\16x28\", _
    "C:\Users\GRAVURU 2\Desktop\Funkklingeln Output\", _
    "", "", True, _
    Globals.getLogger(True)
    
End Sub



' Größenordner verarbeiten
Private Function CloneAndSetNewDoorbellMainShapes_ProcessSizeFolder(doorbellName As String, sizeFolderPath As String, newMainShapesCDRFolder As String, ByVal cdrExportFolderPath As String, outputFolder As String, _
    lastCDRPathTextFilePath As String, lastCDRProcessedLastRun As String, ByRef lastCDRProcessedReached As Boolean, logger As logger)
    
    logger.addTab , "[Macros.ProcessSizeFolder]"
    
    logger.logINFO "cdrExportFolderPath: '" & cdrExportFolderPath & "'"
    
    ' Prüfen, ob es wirklich ein Größenordner ist
    If Not Globals.isFolderDesignsFolder(sizeFolderPath) Then
        logger.logINFO "Dies ist kein Produktordner: '" & sizeFolderPath & "'"
        GoTo ExitFunction
    End If
    
    
    Dim sizeFolder As New FSSizeFolder
    sizeFolder.init sizeFolderPath
    sizeFolder.searchDesignsFiles
    
    Dim pIDObject As New ProductIDObject
    pIDObject.setProductID sizeFolder.getDesignFiles(1).getProductID
    
    
    Dim v2aSizeName As String
    v2aSizeName = pIDObject.getSize(1)
    Dim acrylicSizeName As String
    acrylicSizeName = pIDObject.getSize(2)
    
    Dim cdrFilePaths As collection
    Set cdrFilePaths = Globals.getFilesPathWithExtensionInFolder(sizeFolder.getCDRFolderPath, "cdr")
    
    
    Dim i As Integer
    For i = 1 To cdrFilePaths.count
    
        
        Dim cdrPath As String
        cdrPath = cdrFilePaths(i)
        
        
        If InStr(cdrPath, "Sicherungskopie") Then
            logger.logINFO "Sicherungskopie überspringen: '" & cdrPath & "'"
            GoTo NextI
        End If
        
        If Not lastCDRProcessedReached Then
            logger.logINFO "Suche nach zuletzt fertiggestellter CDR: '" & cdrPath & "'"
            If cdrPath = lastCDRProcessedLastRun Then
                ' CDR gefunden, die zuletzt erfolgreich bearbeitet wurde
                ' 'cdrPath' ist die CDR. Die nächste wurde also noch nicht bearbeitet
                lastCDRProcessedReached = True
                logger.logINFO "- Gefunden!"
            Else
                logger.logINFO "- Überspringe CDR"
            End If
            GoTo NextI ' Bei nächster CDR weitermachen
        End If
        
        
        CloneAndSetNewDoorbellMainShapes_ProcessSizeCDR doorbellName, cdrPath, newMainShapesCDRFolder, v2aSizeName, acrylicSizeName, Globals.addBackslash(cdrExportFolderPath) & "[CDR]", outputFolder, logger
        
        ' Merken, welche Datei zuletzt bearbeitet wurde, damit beim Fehlschlagen dort weitergemacht werden kann
        Globals.saveTextFile cdrPath, lastCDRPathTextFilePath
        
NextI:
    Next i
    
ExitFunction:
    logger.removeTab
End Function



Public Sub TestProcessSizeCDR()
    
    CloneAndSetNewDoorbellMainShapes_ProcessSizeCDR "Aosu Pro", _
        "V:\Produkte\Türklingel\Funkklingeln\Acryl + Edelstahl\Ausschnitt\Eckig\Aosu Pro\16x28 (14x26)\[CDR]\FKA-AosuPro-16x28(14x26)_Designs.cdr", _
        "P:\Projekte\Funkklingel Montage\Funkklingeln\", "16x28", "14x26", Globals.getDesktopPath & "Funkklingeln Output", Globals.getLogger(True), Globals.getLogger(True)
    
End Sub



Private Function CloneAndSetNewDoorbellMainShapes_ProcessSizeCDR(doorbellName As String, cdrPath As String, newMainShapesCDRFolder As String, v2aSizeName As String, acrylicSizeName As String, ByVal cdrExportFolderPath As String, outputFolder As String, logger As logger)
    
    logger.addTab , "[Macros.ProcessSizeCDR]"
    
    logger.logINFO "cdrExportFolderPath: '" & cdrExportFolderPath & "'"
    
    Dim path As String
    path = Globals.addBackslash(newMainShapesCDRFolder) & doorbellName & ".cdr"
    
    
    If Not Globals.fileExist(path) Then
        logger.logFATAL "Für die Funkklingel '" & doorbellName & "', konnte keine passende CDR gefunden werden. Gesucht wurde: '" & path & "'"
        GoTo ExitFunction
    End If
    
    ' CDR SCHICHT 1
    ' Die CDR die auf alle Designs platziert wird
    Dim newAcrylMainShapeCDRPath As String
    newAcrylMainShapeCDRPath = CloneAndSetNewDoorbellMainShapes_GetAcrylicCDRPath(doorbellName, v2aSizeName, acrylicSizeName, newMainShapesCDRFolder, logger)
    
    Dim newV2AMainShapeCDRPath As String
    newV2AMainShapeCDRPath = CloneAndSetNewDoorbellMainShapes_GetV2ACDRPath(v2aSizeName, newMainShapesCDRFolder, outputFolder, logger)
    
    
    Dim sizeDocument As document
    Set sizeDocument = Application.OpenDocument(cdrPath)
    
    Dim designs As collection
    Set designs = Globals.getAllDesigns(, True)
    
    Dim i As Integer
    For i = 1 To designs.count
        CloneAndSetNewDoorbellMainShapes_ProcessDesign designs(i), newAcrylMainShapeCDRPath, newV2AMainShapeCDRPath, logger
        
        CloneAndSetNewDoorbellMainShapes_DeleteGroundPlatesOfDesign designs(i)
    Next i
    
    
    CloneAndSetNewDoorbellMainShapes_PlaceGroundPlates
    
    
    ' Da der Ausschnitt jetzt weg ist, müssen manche Designs diese Lücke besser auffüllen
    CreateDoorbellInnerBleed_ProcessDesigns designs, logger
    
    
    Globals.createFolder cdrExportFolderPath
    
    sizeDocument.SaveAsCopy Globals.addBackslash(cdrExportFolderPath) & Globals.getFileNameAndType(cdrPath)
     
ExitFunction:
    If Not sizeDocument Is Nothing Then sizeDocument.Close
    logger.removeTab
End Function



Private Function CloneAndSetNewDoorbellMainShapes_PlaceGroundPlates()
    
    Dim allShapes As shapeRange
    Set allShapes = Globals.getAllShapes
    
    ' Acryl platzieren
    PlaceFile.setSelectedPlaceTypeJob PlaceFile.jobAcrylSchwarz
    PlaceFile.startFunction allShapes, Classfactory.newPlaceFileParameters.setParts(AllParts, layer1).setQuiet
    
    PlaceFile.setSelectedPlaceTypeJob PlaceFile.jobEdelstahl
    PlaceFile.startFunction allShapes, Classfactory.newPlaceFileParameters.setParts(AllParts, layer2).setQuiet
    
End Function




Private Function CloneAndSetNewDoorbellMainShapes_DeleteGroundPlatesOfDesign(design As productDesign)
    
    ' Alte Grundplatten löschen
    design.getLayer2(1).getGroundPlate.delete
    design.getLayer2(1).invalidateGroundPlate
    design.getLayer2(2).getGroundPlate.delete
    design.getLayer2(2).invalidateGroundPlate
    
End Function



Private Function CloneAndSetNewDoorbellMainShapes_ProcessDesign(design As productDesign, newAcrylMainShapeCDRPath As String, newV2AMainShapeCDRPath As String, logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[Macros.ProcessDesign]"
    
    logger.logINFO "newAcrylMainShapeCDRPath: '" & newAcrylMainShapeCDRPath & "'"
    logger.logINFO "newV2AMainShapeCDRPath: '" & newV2AMainShapeCDRPath & "'"
    
    If newAcrylMainShapeCDRPath = "" Then Err.Raise vbObjectError + 513, , "[Macros.CloneAndSetNewDoorbellMainShapes_ProcessDesign] 'newAcrylMainShapeCDRPath' ist Leer "
    If newV2AMainShapeCDRPath = "" Then Err.Raise vbObjectError + 513, , "[Macros.CloneAndSetNewDoorbellMainShapes_ProcessDesign] 'newV2AMainShapeCDRPath' ist Leer "
    
    PlaceFile.setSelectedPlaceTypeJob PlaceFile.jobCDR
    
    ' Acryl Hauptformen platzieren
    PlaceFile.startFunction design.getDesignShape, Classfactory.newPlaceFileParameters.setParts(Part1, layer1).setMainShapeAddMode(OverrideNewMainShapesWithExisting).setFilePath(newAcrylMainShapeCDRPath)
    
    ' Edelstahl Hauptformen platzieren
    PlaceFile.startFunction design.getDesignShape, Classfactory.newPlaceFileParameters.setParts(Part1, layer2).setMainShapeAddMode(OverrideNewMainShapesWithExisting).setFilePath(newV2AMainShapeCDRPath)
    
    design.invalidateDesign
    
    If Not logger Is Nothing Then logger.removeTab
End Function



Public Sub TestGetAcrylicCDRPath()
    
    MsgBox CloneAndSetNewDoorbellMainShapes_GetAcrylicCDRPath("Aosu Pro", "16x28", "14x26", "P:\Projekte\Funkklingel Montage\Funkklingeln\", Globals.getLogger(True))
    
End Sub



' Acrylform für PlaceFile als CDR speichern
Private Function CloneAndSetNewDoorbellMainShapes_GetAcrylicCDRPath(doorbellName As String, v2aSizeName As String, acrylicSizeName As String, newMainShapesCDRFolder As String, logger As logger) As String
    logger.addTab , "[Macros.GetAcrylicCDRPath]"
    
    If Not logger Is Nothing Then logger.logINFO "v2aSizeName: '" & v2aSizeName & "', acrylicSizeName: '" & acrylicSizeName & "'"
    
    Dim path As String
    path = Globals.addBackslash(newMainShapesCDRFolder) & doorbellName & ".cdr"
    
    
    Application.OpenDocument path
    
    Dim doc As document
    Set doc = ActiveDocument
    
    
    CloneAndSetNewDoorbellMainShapes_GetAcrylicCDRPath = CloneAndSetNewDoorbellMainShapes_GetAcrylicCDRPath_ProcessActiveDocument(v2aSizeName, acrylicSizeName, logger)
    
ExitFunction:
    logger.logINFO "Returne: '" & CloneAndSetNewDoorbellMainShapes_GetAcrylicCDRPath & "'"
    doc.Close ' Wenns nicht geht Methode unten nutzen
    ' ActiveDocument.Close
    logger.removeTab
End Function


' Exportiert den Acryl Teil einer ausgewählte Funkklingel von Kay
Public Sub ExportNewDoorbellMainShapes()
    Globals.endIfNoActiveShape
    
    Dim shapeCopy As shape
    Set shapeCopy = Globals.copyPasteShape(ActiveShape, True)
    
    shapeCopy.CreateSelection
    
    Dim exportedFilePath As String
    exportedFilePath = CloneAndSetNewDoorbellMainShapes_GetAcrylicCDRPath_ProcessActiveDocument(ActiveShape.name, InputBox("Acrylgröße", "Acrylgröße", ActiveShape.name), Globals.getLogger(True))
    
    shapeCopy.delete
    
    Application.OpenDocument exportedFilePath
End Sub



Private Function CloneAndSetNewDoorbellMainShapes_GetAcrylicCDRPath_ProcessActiveDocument(v2aSizeName As String, acrylicSizeName As String, logger As logger) As String
    logger.addTab , "[Macros.GetAcrylicCDRPath_ProcessActiveDocument]"
    
    Dim acrylGroupShape As shape
    Set acrylGroupShape = ActiveDocument.ActiveLayer.FindShape(v2aSizeName)
    
    ' Blaue Form finden, welche für die Klingel-Position und Größe steht
    Dim doorBellHelpShape As shape
    Set doorBellHelpShape = acrylGroupShape.shapes.FindShape(Query:="@outline.color=rgb(0,0,255)") ' Blau
    Globals.makeShapeGuideLineShape doorBellHelpShape ' Umfärben, damit es eine Hilfslinienform wird
    
    Dim acrylShape As shape
    Set acrylShape = acrylGroupShape.shapes.FindShape(Query:="@outline.color=rgb(255,0,0)") ' Rot
    
    Dim acrylShapes As shapeRange
    Set acrylShapes = Globals.getShapeRangeShapesSortedByBoundingBoxSize(Globals.BreakApartShapeSubPaths(acrylShape), False)
    
    ' Muss in die Gruppe kommen, denn wenn gleich die alte Acrylform gelöscht wird, darf 'doorBellHelpShape' nicht alleine in der Gruppe sein
    ' denn sonst lößt Corel die Gruppe auf
    acrylShapes.OrderBackOf doorBellHelpShape
    
    ' Edelstahl Form löschen
    acrylShapes.firstShape.delete
    acrylShapes.Remove 1
    
    ' Acrylrahmen auf passende Form bringen
    Dim acrylFrameShape As shape
    Set acrylFrameShape = acrylShapes.firstShape
    acrylFrameShape.SetSizeEx acrylFrameShape.centerX, acrylFrameShape.centerY, ActiveDocument.ToUnits(Globals.getWidthOfSize(acrylicSizeName), cdrCentimeter), ActiveDocument.ToUnits(Globals.getHeightOfSize(acrylicSizeName), cdrCentimeter)
    
    ' Form wiederherstellen
    Dim smallerShapes As New shapeRange
    smallerShapes.AddRange acrylShapes
    smallerShapes.RemoveRange Globals.shapeToShapeRange(acrylFrameShape)
    
    ' Zusammenfügen
    acrylShape.delete ' Alte Form löschen, denn jetzt kommt die neue
    Set acrylShape = Globals.subtractShapeRangeWithShape(smallerShapes, acrylFrameShape, False, False, logger)
    
    ' Export
    Dim cdrExportPath As String: cdrExportPath = Globals.getDesktopPath & "Acryl " & acrylicSizeName
    newShapeExport(Globals.shapeToShapeRange(acrylGroupShape), cdrExportPath, cdrCDR) _
        .setColorizeRDGWhiteToRGB(False) _
        .setColorizeCMYKBlackToRGB(False) _
        .export
    
    ' Pfad zurückgeben
    CloneAndSetNewDoorbellMainShapes_GetAcrylicCDRPath_ProcessActiveDocument = cdrExportPath & ".cdr"
    
ExitFunction:
    logger.logINFO "Returne: '" & CloneAndSetNewDoorbellMainShapes_GetAcrylicCDRPath_ProcessActiveDocument & "'"
    logger.removeTab
End Function



Public Sub TestGetV2ACDRPath()

    MsgBox CloneAndSetNewDoorbellMainShapes_GetV2ACDRPath("18x32", "P:\Projekte\Funkklingel Montage\Funkklingeln\", Globals.getDesktopPath & "Funkklingeln Output Test", Globals.getLogger(True))

End Sub



' Edelstahlform für PlaceFile als CDR speichern
Private Function CloneAndSetNewDoorbellMainShapes_GetV2ACDRPath(v2aSizeName As String, newMainShapesCDRFolder As String, outputFolder As String, logger As logger, Optional roundedEdges As Boolean) As String
    
    logger.addTab , "[Macros.GetV2ACDRPath]"
    
    Dim path As String
    path = newMainShapesCDRFolder & CloneAndSetNewDoorbellMainShapes_GetV2ACDRForSize(v2aSizeName, logger)
    
    Application.OpenDocument path
    Dim doc As document
    Set doc = ActiveDocument
    
    
    Dim v2aShape As shape
    Set v2aShape = doc.ActiveLayer.FindShape(v2aSizeName & IIf(roundedEdges, " aE", ""))
    
    If v2aShape Is Nothing Then
        logger.logFATAL "v2aShape nicht gefunden"
        GoTo ExitFunction
    End If
    
    Set v2aShape = v2aShape.shapes.First ' Form in der Gruppe nutzen
    
    Dim cdrExportPath As String: cdrExportPath = outputFolder & "Edelstahl " & v2aSizeName
    
    newShapeExport(Globals.shapeToShapeRange(v2aShape), cdrExportPath, cdrCDR) _
        .setColorizeRDGWhiteToRGB(False) _
        .setColorizeCMYKBlackToRGB(False) _
        .export
    
    CloneAndSetNewDoorbellMainShapes_GetV2ACDRPath = cdrExportPath & ".cdr"
    
ExitFunction:
    logger.logINFO "Returne: '" & CloneAndSetNewDoorbellMainShapes_GetV2ACDRPath & "'"
    doc.Close ' Wenns nicht geht Methode unten nutzen
    ' ActiveDocument.Close
    logger.removeTab
End Function


Private Function CloneAndSetNewDoorbellMainShapes_GetV2ACDRForSize(v2aSizeName As String, logger As logger) As String
    
    logger.addTab , "[Macros.GetV2ACDRForSize]"
    
    Dim sizes As New collection
    Dim sizesFiles As New collection
    
    sizesFiles.add "_Vorlage Hintergrundplatten Standardmaße.cdr"
    Dim defaultSizes As New collection
    defaultSizes.add "16x28"
    defaultSizes.add "24x20"
    defaultSizes.add "35x18"
    sizes.add defaultSizes
    
    
    sizesFiles.add "_Vorlage Hintergrundplatten Sondermaße 17x30.cdr"
    Dim biggerSizes As New collection
    biggerSizes.add "17x30"
    biggerSizes.add "26x22"
    biggerSizes.add "38x20"
    sizes.add biggerSizes
    
    
    sizesFiles.add "_Vorlage Hintergrundplatten Sondermaße 18x32.cdr"
    Dim evenBiggerSizes As New collection
    evenBiggerSizes.add "18x32"
    evenBiggerSizes.add "34x24"
    evenBiggerSizes.add "42x24"
    sizes.add evenBiggerSizes
    
     
    For i = 1 To sizes.count
        Dim currSizes As collection
        Set currSizes = sizes(i)
        
        ' v2aSizeName in jeder Größencollection suchen. Bspw. in biggerSizes
        If Not Globals.getStringIndexInCollection(currSizes, v2aSizeName, StringEquals) = -1 Then
            CloneAndSetNewDoorbellMainShapes_GetV2ACDRForSize = sizesFiles(i)
            GoTo ExitFunction
        End If
    Next i
    
    
ExitFunction:
    logger.logINFO "Returne '" & CloneAndSetNewDoorbellMainShapes_GetV2ACDRForSize & "'"
    logger.removeTab
End Function



' Sucht für einen Funkklingel-Ordnernamen den Pfad zur passenden neuen CDR mit den Hauptformen
Private Function CloneAndSetNewDoorbellMainShapes_GetNewMainShapeCDRForDoorbell(doorbellFolderName As String, newMainShapesCDRFolder As String, logger As logger) As String
    
    logger.addTab , "[Macros.GetNewMainShapeCDRForDoorbell]"
    
    Dim newMainShapeCDRs As collection
    Set newMainShapeCDRs = Globals.getFilesPathWithExtensionInFolder(newMainShapesCDRFolder, "cdr")
    
    For i = 1 To newMainShapeCDRs.count
        Dim cdrFileName As String
        cdrFileName = Globals.getFileName(newMainShapeCDRs(i))
        
        If cdrFileName = doorbellFolderName Then
            CloneAndSetNewDoorbellMainShapes_GetNewMainShapeCDRForDoorbell = newMainShapeCDRs(i)
        End If
        
    Next i
    
ExitFunction:
    logger.removeTab
End Function













' Dadurch, dass die Funkklingeln keinen Ausschnitt mehr haben, sind manche Designs an dem Bereich zu sehr abgeschnitten
Public Sub CreateDoorbellInnerBleed()
    
    
    Dim sourceFolder As String
    sourceFolder = Globals.getDesktopPath & "Funkklingeln Output\"
    
    
    ' Gucken, ob es vorher einen Durchlauf gab, der bei einer CDR hängenblieb
    Dim lastCDRPathTextFilePath As String
    lastCDRPathTextFilePath = Globals.addBackslash(sourceFolder) & "CreateDoorbellInnerBleed.txt"
    
    Dim lastCDRProcessedReached As Boolean
    
    
    ' Prüfen, ob es schonmal einen run gab und bei einer CDR gestoppt wurde
    ' --------------------------------------------
    Dim lastCDRProcessedLastRun As String
    If Globals.fileExist(lastCDRPathTextFilePath) Then
        lastCDRProcessedLastRun = Globals.loadTextFileLines(lastCDRPathTextFilePath)(0)
    Else
        lastCDRProcessedReached = True
    End If
    ' --------------------------------------------
    
    CreateDoorbellInnerBleed_ProcessFolder sourceFolder, lastCDRProcessedReached, lastCDRProcessedLastRun, lastCDRPathTextFilePath, Globals.getLogger(True)
    
    
End Sub


Private Function CreateDoorbellInnerBleed_ProcessFolder(folderPath As String, ByRef lastCDRProcessedReached As Boolean, lastCDRProcessedLastRun As String, lastCDRPathTextFilePath As String, logger As logger)
    
    If Globals.isFolderDesignsFolder(folderPath) Then
        CreateDoorbellInnerBleed_ProcessDesignsFolder folderPath, lastCDRProcessedReached, lastCDRProcessedLastRun, lastCDRPathTextFilePath, logger
    Else
        
        Dim subFolders As collection
        Set subFolders = Globals.getFoldersInFolder(folderPath)
        
        With ProgressBarUserForm.newSubProgress(subFolders.count)
        
            Dim i As Integer
            For i = 1 To subFolders.count
                .setDisplayText "Ordner : " & Globals.getFolderName(subFolders(i))
                
                CreateDoorbellInnerBleed_ProcessFolder subFolders(i), lastCDRProcessedReached, lastCDRProcessedLastRun, lastCDRPathTextFilePath, logger
                
                .setStepsProgress i
            Next i
    
            .finishProgress
        End With
        
        
    End If
    
End Function


Private Function CreateDoorbellInnerBleed_ProcessDesignsFolder(folderPath As String, ByRef lastCDRProcessedReached As Boolean, lastCDRProcessedLastRun As String, lastCDRPathTextFilePath As String, logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[Macros.ProcessDesignsFolder]"
    
    Dim sizeFolder As New FSSizeFolder
    sizeFolder.init folderPath
    
    sizeFolder.searchDesignsFiles
    
    
    Dim cdrFilePaths As collection
    Set cdrFilePaths = Globals.getFilesPathWithExtensionInFolder(sizeFolder.getCDRFolderPath, "cdr")
    
    
    Dim i As Integer
    For i = 1 To cdrFilePaths.count
    
        
        Dim cdrPath As String
        cdrPath = cdrFilePaths(i)
        
        
        If InStr(cdrPath, "Sicherungskopie") Then
            logger.logINFO "Sicherungskopie überspringen: '" & cdrPath & "'"
            GoTo NextI
        End If
        
        If Not lastCDRProcessedReached Then
            logger.logINFO "Suche nach zuletzt fertiggestellter CDR: '" & cdrPath & "'"
            If cdrPath = lastCDRProcessedLastRun Then
                ' CDR gefunden, die zuletzt erfolgreich bearbeitet wurde
                ' 'cdrPath' ist die CDR. Die nächste wurde also noch nicht bearbeitet
                lastCDRProcessedReached = True
                logger.logINFO "- Gefunden!"
            Else
                logger.logINFO "- Überspringe CDR"
            End If
            GoTo NextI ' Bei nächster CDR weitermachen
        End If
        
        
        CreateDoorbellInnerBleed_ProcessCDR cdrPath, logger
        
        ' Merken, welche Datei zuletzt bearbeitet wurde, damit beim Fehlschlagen dort weitergemacht werden kann
        Globals.saveTextFile cdrPath, lastCDRPathTextFilePath
        
NextI:
    Next i
    
ExitFunction:
    logger.removeTab
End Function


Private Sub TestsCreateDoorbellInnerBleed_ProcessCDR()
    
    CreateDoorbellInnerBleed_ProcessCDR "C:\Users\GRAVURU 2\Desktop\Cococam\24x20\[CDR]\FKA-Cococam-24x20_Designs.cdr", Globals.getLogger(True)
    
End Sub


Private Function CreateDoorbellInnerBleed_ProcessCDR(cdrPath As String, logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[Macros.ProcessCDR]"
    
    Dim doc As document
    Set doc = OpenDocument(cdrPath)
    
    CreateDoorbellInnerBleed_ProcessDocument doc, logger
    
    doc.Save
    
    doc.Close
    logger.removeTab
End Function


Private Sub TestCreateDoorbellInnerBleed_ProcessDocument()
    
    CreateDoorbellInnerBleed_ProcessDocument ActiveDocument, Globals.getLogger(True)
    
End Sub


Private Function CreateDoorbellInnerBleed_ProcessDocument(doc As document, logger As logger)
    
    Dim designs As ProductDesignRange
    Set designs = Globals.getAllDesignsAsRange(, True)
    
    CreateDoorbellInnerBleed_ProcessDesigns designs, logger
    
End Function

Private Function CreateDoorbellInnerBleed_ProcessDesigns(designs As ProductDesignRange, logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[Macros.CreateDoorbellInnerBleed_ProcessDesigns]"
    
    CreateDoorbellInnerBleed_ProcessDesign designs.getDesignByDesignNumber(5), 5, logger
    CreateDoorbellInnerBleed_ProcessDesign designs.getDesignByDesignNumber(6), 6, logger
    
    If Not logger Is Nothing Then logger.removeTab
End Function


Private Sub Test_CreateDoorbellInnerBleed_ProcessDesign()
    Globals.endIfNoActiveShape
    
    Dim design As productDesign
    Set design = Globals.getSelectedDesignsOrAll().item(1)
    CreateDoorbellInnerBleed_ProcessDesign design, design.getProductIDObject.getDesignNumber, Globals.getLogger(True)
End Sub


Private Function CreateDoorbellInnerBleed_ProcessDesign(design As productDesign, designNumber As Integer, logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[Macros.CreateDoorbellInnerBleed_ProcessDesign]"
    
    Dim firstLayer As ProductDesignLayer
    Set firstLayer = design.getLayer2(1)
    
    Dim guideShapes As shapeRange
    Set guideShapes = firstLayer.newCustomShapeTypeQuery(GuideLineShapeType).search
    
    ' Hilfsform 'Funkklingeln'
    Dim funkklingelnShape As shape
    Set funkklingelnShape = guideShapes.shapes.FindShape("Funkklingeln")
    
    If Not funkklingelnShape Is Nothing Then
        guideShapes.RemoveRange Globals.shapeToShapeRange(funkklingelnShape)
    End If
    
    Dim guideShape As shape
    Set guideShape = guideShapes.firstShape
    
    
    Dim rectangles As shapeRange
    Set rectangles = firstLayer.newCustomShapeTypeQuery(RectangleAny).search
    If Not funkklingelnShape Is Nothing Then
        rectangles.RemoveRange Globals.shapeToShapeRange(funkklingelnShape) ' Funkklingel Form ist ein Rechteck
    End If
    
    Dim i As Integer
    For i = 1 To rectangles.count
        
        If designNumber = 2 Then
            CreateDoorbellInnerBleed_ProcessDesign2Rectangle rectangles(i), funkklingelnShape, firstLayer, logger
        ElseIf designNumber = 5 Then
            CreateDoorbellInnerBleed_ProcessRectangleHeight rectangles(i), logger
        ElseIf designNumber = 6 Then
            CreateDoorbellInnerBleed_ProcessRectangle rectangles(i), guideShape, firstLayer, logger
        End If
    Next i
    
    
    If designNumber = 5 Then
        CreateDoorbellInnerBleed_ConvertLShapeToTwoLines firstLayer
    End If
    
    
    logger.removeTab
End Function



Private Function CreateDoorbellInnerBleed_ProcessDesign2Rectangle(rectangleShape As shape, guideShape As shape, layer As ProductDesignLayer, logger As logger)
    
    ' Design überspringen, wenn die Funkklingel mittig ist
    If Abs(guideShape.centerX - layer.getMainShape.centerX) < ActiveDocument.FromUnits(10, cdrMillimeter) Then Exit Function
    
    ' Strich mittig zwischen linkem Rand des Layers und linken Rand der Funkklingel
    rectangleShape.SetPositionEx cdrCenter, layer.getMainShape.LeftX + (guideShape.LeftX - layer.getMainShape.LeftX) / 2, rectangleShape.centerY
    
    
    Dim textShapes As shapeRange
    Set textShapes = layer.newCustomShapeTypeQuery(TextAny).search
    Set textShapes = newCustomShapeTypeQuery(textShapes, DesignElementShapeType).search
    
    Set textShapes = Globals.collectionToShapeRange(arrange.arrangeFunction(True, Globals.shapeRangeToCollection(textShapes)))
    
    textShapes.firstShape.LeftX = rectangleShape.LeftX
    textShapes.shapes(2).RightX = rectangleShape.RightX
    
End Function


Private Function CreateDoorbellInnerBleed_ProcessRectangle(rectangleShape As shape, guideShape As shape, layer As ProductDesignLayer, logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[Macros.CreateDoorbellInnerBleed_ProcessRectangle] rectangleShape: '" & Globals.getShapeDisplayName(rectangleShape) & "', guideShape: '" & Globals.getShapeDisplayName(guideShape) & "'"
    
    If rectangleShape.SizeWidth < ActiveDocument.ToUnits(50, cdrMillimeter) Then
        rectangleShape.delete
        GoTo ExitFunction
    End If
    
    Dim newWidth As Double
    newWidth = layer.getMainShape.SizeWidth
    
    rectangleShape.setSize newWidth, rectangleShape.SizeHeight
    rectangleShape.LeftX = layer.getMainShape.LeftX
    
    layer.layerShape.CreateSelection
    
ExitFunction:
    logger.removeTab
End Function


Private Sub Test_CreateDoorbellInnerBleed_ProcessRectangleHeight()
    endIfNoActiveShape
    CreateDoorbellInnerBleed_ProcessRectangleHeight ActiveShape, Globals.getLogger(True)
End Sub


' Da ich beim Skalieren vergessen habe die Höhe fix anzugeben, wurde diese auch mitskaliert bei D6. Das wird hhier wieder korrigiert
Private Function CreateDoorbellInnerBleed_ProcessRectangleHeight(rectangleShape As shape, logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[Macros.ProcessRectangleHeight] rectangleShape: '" & Globals.getShapeDisplayName(rectangleShape) & "'"
    rectangleShape.SetSizeEx rectangleShape.centerX, rectangleShape.centerY, rectangleShape.SizeWidth, ActiveDocument.ToUnits(1.6, cdrMillimeter)
    If Not logger Is Nothing Then logger.removeTab
End Function


Private Sub Test_CreateDoorbellInnerBleed_ConvertLShapeToTwoLines()
    Globals.endIfNoActiveShape
    
    Dim design As productDesign
    Set design = Globals.getSelectedDesignsOrAll().item(1)
    CreateDoorbellInnerBleed_ConvertLShapeToTwoLines design.getLayer2(1)
End Sub


' Betrifft D5
' Konvertiert die L artige Form
' ------
'      |
' zu zwei Rechtecke, da sich das schneller gravieren lässt
Private Function CreateDoorbellInnerBleed_ConvertLShapeToTwoLines(firstLayer As ProductDesignLayer)
    Dim curveShapesWithEightPoints As shapeRange
    Set curveShapesWithEightPoints = firstLayer.newCustomShapeTypeQuery(allShapes).range.shapes.FindShapes(Query:="@type = 'curve' and @com.curve.nodes.count = 8")
    
    If curveShapesWithEightPoints.count = 1 Then
    
        Dim lineThickness As Double
        lineThickness = 1.6
        Dim lineThicknessInDocUnits As Double
        lineThicknessInDocUnits = ActiveDocument.ToUnits(lineThickness, cdrMillimeter)
        
        Dim eightPointer As shape
        Set eightPointer = curveShapesWithEightPoints.firstShape
        
        Dim rects As New shapeRange
        rects.add ActiveLayer.CreateRectangle(eightPointer.LeftX, eightPointer.TopY, eightPointer.RightX, eightPointer.TopY - lineThicknessInDocUnits)
        rects.add ActiveLayer.CreateRectangle(eightPointer.RightX - lineThicknessInDocUnits, eightPointer.TopY - lineThicknessInDocUnits, eightPointer.RightX, eightPointer.BottomY)
        
        rects.ApplyUniformFill CreateColor("#FFFFFF")
'        rects.SetOutlineProperties
        Dim i As Integer
        For i = 1 To rects.count
            rects(i).outline.SetNoOutline
        Next i
        
        rects.OrderFrontOf eightPointer
        rects.group ' Gruppieren, damit diese auch zusammen im Konfi erscheinen
        
        ' Löschen
        eightPointer.delete
    End If
End Function








' Markiert Motive, die mehr als 10.000 Pfadpunkte haben mit einer cyanfarbenen Box
Public Sub MarkMotivesWithToManyCurvePoints()
    
    Dim curveShapes As shapeRange
    Set curveShapes = newCustomShapeTypeQuery(ActiveLayer.shapes.All, CurveAny).search
    
    Dim markerRects As New shapeRange
    
    Dim i As Integer
    For i = 1 To curveShapes.count
        Dim currShape As shape
        Set currShape = curveShapes(i)
        
        If Globals.getShapeCurveNodeCount(curveShapes(i)) > 10000 Then
            
            Dim markerRect As shape
            Set markerRect = ActiveLayer.CreateRectangleRect(currShape.boundingBox)
            markerRect.fill.ApplyUniformFill CreateColor("#00FFFF")
            markerRect.outline.SetNoOutline
            
            markerRects.add markerRect
            
            Set markerRect = Nothing
        End If
        
        Set currShape = Nothing
    Next i
    
    Dim markerRectsGroup As shape
    Set markerRectsGroup = markerRects.group
    markerRectsGroup.OrderBackOf ActiveLayer.shapes.Last
    
End Sub






' Kopiert die Groessenformen 16x28, 24x20 und 35x18 aus allen CDRs eines Ordners
' in das Dokument, das beim Start dieses Makros aktiv war.
Public Sub CopyDoorbellSizeShapesFromFolderToOpenDocument()

    Globals.warnIfNoDocumentAndEnd

    Dim targetDoc As document
    Set targetDoc = ActiveDocument

    Dim cdrFolder As String
    cdrFolder = CorelScriptTools.GetFolder("P:\Projekte\Funkklingel Montage\Funkklingeln", "Wähle den Ordner mit den CDR Dateien")
    If cdrFolder = "" Then Exit Sub
    cdrFolder = Globals.addBackslash(cdrFolder)

    Dim logger As New logger
    logger.init "CopyDoorbellSizeShapesFromFolderToOpenDocument"

    logger.addTab , "[Macros.CopyDoorbellSizeShapesFromFolderToOpenDocument]"

    Dim run As New CDRRun
    run.init cdrFolder, "CopyDoorbellSizeShapesFromFolderToOpenDocument", False
    
    ' Vorlagen ignorieren
    run.getPaths.removeStringsMatchingComparison "_vorlage", StringInside, True

    CopyDoorbellSizeShapesFromFolderToOpenDocument_ProcessCDRs run.getPaths, run, targetDoc, logger

    targetDoc.Activate
    logger.removeTab

End Sub


Private Function CopyDoorbellSizeShapesFromFolderToOpenDocument_ProcessCDRs(paths As ArrayList, run As CDRRun, targetDoc As document, logger As logger)
    logger.addTab , "[Macros.CopyDoorbellSizeShapesFromFolderToOpenDocument_ProcessCDRs]"

    With ProgressBarUserForm.newSubProgress(paths.count)

        Dim i As Integer
        For i = 1 To paths.count
            .setDisplayText "CDR " & Globals.getFileName(paths.item(i))

            CopyDoorbellSizeShapesFromFolderToOpenDocument_ProcessCDR paths.item(i), run, targetDoc, logger

            .setStepsProgress i
        Next i

        .finishProgress
    End With

    logger.removeTab
End Function


Private Function CopyDoorbellSizeShapesFromFolderToOpenDocument_ProcessCDR(cdrPath As String, run As CDRRun, targetDoc As document, logger As logger)
    logger.addTab , "[Macros.CopyDoorbellSizeShapesFromFolderToOpenDocument_ProcessCDR] cdrPath: '" & cdrPath & "'"

    Dim sourceDoc As document
    Set sourceDoc = Application.OpenDocument(cdrPath)

    Dim sizeNames As Variant
    ' "16x28", "24x20", "35x18"
    sizeNames = _
    Array("17x30", "26x22", "38x20", _
        "18x32", "34x24", "42x24")

    Dim sourceFileName As String
    sourceFileName = Globals.getFileName(cdrPath)

    With ProgressBarUserForm.newSubProgress(UBound(sizeNames) - LBound(sizeNames) + 1)

        Dim i As Integer
        For i = LBound(sizeNames) To UBound(sizeNames)
            .setDisplayText "Suche " & CStr(sizeNames(i))

            CopyDoorbellSizeShapesFromFolderToOpenDocument_CopySizeShape sourceDoc, targetDoc, CStr(sizeNames(i)), sourceFileName, logger

            .setStepsProgress i - LBound(sizeNames) + 1
        Next i

        .finishProgress
    End With

    run.saveSuccessfullCDRRun cdrPath

Finally:
    sourceDoc.Close
    targetDoc.Activate
    logger.removeTab
End Function


Private Function CopyDoorbellSizeShapesFromFolderToOpenDocument_CopySizeShape(sourceDoc As document, targetDoc As document, sizeName As String, sourceFileName As String, logger As logger)
    logger.addTab , "[Macros.CopyDoorbellSizeShapesFromFolderToOpenDocument_CopySizeShape] sizeName: '" & sizeName & "', sourceFileName: '" & sourceFileName & "'"

    Dim sourceShape As shape
    Set sourceShape = CopyDoorbellSizeShapesFromFolderToOpenDocument_FindSizeShape(sourceDoc, sizeName)

    If sourceShape Is Nothing Then
        logger.logINFO "Keine Quellform mit Name '" & sizeName & "' gefunden. Überspringe."
        GoTo ExitFunction
    End If

    Dim targetShape As shape
    Set targetShape = CopyDoorbellSizeShapesFromFolderToOpenDocument_FindSizeShape(targetDoc, sizeName)

    If targetShape Is Nothing Then
        logger.logWARN "Keine Zielform mit Name '" & sizeName & "' im Ursprungsdokument gefunden. Überspringe."
        GoTo ExitFunction
    End If

    sourceDoc.Activate
    sourceShape.layer.Activate

    targetDoc.Activate
    targetShape.layer.Activate
    
    Globals.TryCopyShape sourceShape
'    sourceShape.copy
    Set pastedShape = ActiveLayer.Paste
    
    pastedShape.name = sizeName & " " & sourceFileName
    pastedShape.SetPositionEx cdrCenter, targetShape.centerX, targetShape.centerY
    pastedShape.OrderFrontOf targetShape

ExitFunction:
    logger.removeTab
End Function


Private Function CopyDoorbellSizeShapesFromFolderToOpenDocument_FindSizeShape(doc As document, sizeName As String) As shape
    Dim shapesToSearch As shapeRange
    Set shapesToSearch = CopyDoorbellSizeShapesFromFolderToOpenDocument_GetActivePageShapes(doc)

    Dim foundShapes As shapeRange
    Set foundShapes = newCustomShapeTypeQuery(shapesToSearch, ByName).setArgument1(sizeName).setArgument2(StringEquals).search

    If foundShapes.count > 0 Then
        Set CopyDoorbellSizeShapesFromFolderToOpenDocument_FindSizeShape = foundShapes.firstShape
    End If
End Function


Private Function CopyDoorbellSizeShapesFromFolderToOpenDocument_GetActivePageShapes(doc As document) As shapeRange
    Dim allShapes As New shapeRange

    Dim i As Integer
    For i = 1 To doc.ActivePage.layers.count
        If Not doc.ActivePage.layers(i).IsDesktopLayer Then
            allShapes.AddRange doc.ActivePage.layers(i).shapes.All
        End If
    Next i

    Set CopyDoorbellSizeShapesFromFolderToOpenDocument_GetActivePageShapes = allShapes
End Function










' Achtung: Ändert die angegebenen CDRs ab und speichert nicht in einem extra Ordner
Public Sub MakeDoorBellRounded()

    Dim cdrFolder As String
    cdrFolder = CorelScriptTools.GetFolder("P:\Projekte\Funkklingel Montage\Funkklingeln\AE", "Wähle den Ordner mit den CDR Dateien")
    If cdrFolder = "" Then Exit Sub
    cdrFolder = Globals.addBackslash(cdrFolder)

    Dim logger As logger: Set logger = Globals.getLogger(True)

    logger.addTab , "[Macros.MakeDoorBellRounded]"

    Dim run As New CDRRun
    run.init cdrFolder, "MakeDoorBellRounded", True
    
    ' Vorlagen ignorieren
    run.getPaths.removeStringsMatchingComparison "_vorlage", StringInside, True

    MakeDoorBellRounded_ProcessCDRs run.getPaths, run, logger

    logger.removeTab
    
End Sub




Private Function MakeDoorBellRounded_ProcessCDRs(paths As ArrayList, run As CDRRun, logger As logger)
    logger.addTab , "[Macros.MakeDoorBellRounded_ProcessCDRs]"

    With ProgressBarUserForm.newSubProgress(paths.count)

        Dim i As Integer
        For i = 1 To paths.count
            .setDisplayText "CDR " & Globals.getFileName(paths.item(i))

            MakeDoorBellRounded_ProcessCDRPath paths.item(i), run, logger

            .setStepsProgress i
        Next i

        .finishProgress
    End With

    logger.removeTab
End Function



Private Function MakeDoorBellRounded_ProcessCDRPath(cdrPath As String, run As CDRRun, logger As logger)
    logger.addTab , "[Macros.CopyDoorbellSizeShapesFromFolderToOpenDocument_ProcessCDR] cdrPath: '" & cdrPath & "'"

    Dim doorbellDoc As document
    Set doorbellDoc = Application.OpenDocument(cdrPath)
    
    MakeDoorBellRounded_ProcessDocument doorbellDoc, run, logger

    doorbellDoc.Save
    
    run.saveSuccessfullCDRRun cdrPath
    
Finally:
    doorbellDoc.Close
    logger.removeTab
End Function


Private Sub MakeDoorBellRounded_ProcessActiveDocument()
    Globals.endIfNoDocumentOpen
    MakeDoorBellRounded_ProcessDocument ActiveDocument, Nothing, Globals.getLogger(True)
End Sub


Private Function MakeDoorBellRounded_ProcessDocument(doorbellDoc As document, run As CDRRun, logger As logger)
    Dim sizeGroups As shapeRange
    Set sizeGroups = doorbellDoc.ActiveLayer.shapes.FindShapes(, cdrGroupShape)
    
    With ProgressBarUserForm.newSubProgress(sizeGroups.count)

        Dim i As Integer
        For i = 1 To sizeGroups.count
            .setDisplayText "Verarbeite Größe " & sizeGroups(i).name

            MakeDoorBellRounded_ProcessSizeGroup sizeGroups(i), logger

            .setStepsProgress i
        Next i

        .finishProgress
    End With
End Function



Private Sub Test_MakeDoorBellRounded_ProcessSizeGroup()
    Application.OpenDocument ("Z:\Projekte\Funkklingel Montage\Funkklingeln\AE\Aosu Pro.cdr")
    MakeDoorBellRounded_ProcessSizeGroup ActiveLayer.shapes.FindShape("24x20"), Globals.getLogger(True)
End Sub


Private Function MakeDoorBellRounded_ProcessSizeGroup(sizeGroup As shape, logger As logger)
    logger.addTab , "[Macros.MakeDoorBellRounded_ProcessSizeGroup]"
    
    
    ' Blaue Form finden, welche für die Klingel-Position und Größe steht
    Dim doorBellHelpShape As shape
    Set doorBellHelpShape = sizeGroup.shapes.FindShape(Query:="@outline.color=rgb(0,0,255)") ' Blau
    
    Dim acrylShape As shape
    Set acrylShape = sizeGroup.shapes.FindShape(Query:="@outline.color=rgb(255,0,0)") ' Rot
    
    Dim acrylShapes As shapeRange
    Set acrylShapes = Globals.getShapeRangeShapesSortedByBoundingBoxSize(Globals.BreakApartShapeSubPaths(acrylShape), False)
    
    ' Die auseinandergepflückten Formen geraten leider aus ihrer Gruppe. Das wird hier behoben
    acrylShapes.OrderFrontOf acrylShape
    
    ' Abgerundete Form erstellen
    Dim v2aShape As shape
    Set v2aShape = acrylShapes.firstShape
    Dim oldV2AShape As shape: Set oldV2AShape = v2aShape
    Dim radius As Double: radius = ActiveDocument.ToUnits(5, cdrMillimeter)
    Set v2aShape = ActiveLayer.CreateRectangle2(oldV2AShape.LeftX, oldV2AShape.BottomY, oldV2AShape.SizeWidth, oldV2AShape.SizeHeight, radius, radius, radius, radius)
    v2aShape.OrderFrontOf oldV2AShape
    v2aShape.outline.SetProperties Globals.getHairlineThickness, , CreateColor(Globals.getRedHexCode)
    
    ' Form austauschen
    oldV2AShape.delete
    acrylShapes.Remove 1
    acrylShapes.add v2aShape
    
    ' Zusammenfügen.
    ' Nicht wie Weld oder so, sondern so, dass keine Form eine andere subtrahiert oder addiert. Alle werden einfach zu einer neuen Form zusammengefügt. Dabei wird keine Kurve verändert
    acrylShapes.Combine.name = acrylShape.name
    
    acrylShape.delete
    
Finally:
    logger.removeTab
End Function



Private Function RoundDoorbellMainShapes_GetDefaultFolder() As String
    RoundDoorbellMainShapes_GetDefaultFolder = "V:\Produkte\Türklingel\Funkklingeln\Edelstahl\Montage-Löcher\Eckig"
End Function


' Rundet bei allen Designs aller Design-CDRs die Hauptform (größtes Rechteck) um 5 mm ab.
' Die Unterformen (Montage-Löcher) bleiben unverändert: Sie werden aus der Hauptform herausgelöst und danach wieder zusammengefügt
' Danach wird die Edelstahl-Grundplatte per PlaceFile neu platziert.
' Die Quell-CDRs bleiben unverändert: Das Ergebnis wird mit gleicher Ordnerstruktur unter
' "Desktop\Funkklingeln Edelstahl Abgerundet Output" gespeichert
Public Sub RoundDoorbellMainShapes()

    Dim cdrFolder As String
    cdrFolder = CorelScriptTools.GetFolder(RoundDoorbellMainShapes_GetDefaultFolder, "Wähle den Ordner mit den Design-CDRs")
    If cdrFolder = "" Then Exit Sub
    cdrFolder = Globals.addBackslash(cdrFolder)

    Dim logger As logger: Set logger = Globals.getLogger(True)
    logger.addTab , "[Macros.RoundDoorbellMainShapes]"

    ' True = nur Design-CDRs (rekursiv aus allen Unterordnern)
    Dim run As New CDRRun
    run.init cdrFolder, "RoundDoorbellMainShapes", True

    RoundDoorbellMainShapes_ProcessCDRs run.getPaths, run, logger

    logger.removeTab

End Sub


Private Function RoundDoorbellMainShapes_ProcessCDRs(paths As ArrayList, run As CDRRun, logger As logger)
    logger.addTab , "[Macros.RoundDoorbellMainShapes_ProcessCDRs]"

    With ProgressBarUserForm.newSubProgress(paths.count)

        Dim i As Integer
        For i = 1 To paths.count
            .setDisplayText "CDR " & Globals.getFileName(paths.item(i))

            RoundDoorbellMainShapes_ProcessCDR paths.item(i), run, logger

            .setStepsProgress i
        Next i

        .finishProgress
    End With

    logger.removeTab
End Function


Private Function RoundDoorbellMainShapes_ProcessCDR(cdrPath As String, run As CDRRun, logger As logger)
    logger.addTab , "[Macros.RoundDoorbellMainShapes_ProcessCDR] cdrPath: '" & cdrPath & "'"

    Dim outputPath As String
    outputPath = RoundDoorbellMainShapes_GetOutputPath(cdrPath, logger)
    If outputPath = "" Then GoTo ExitFunction

    ' Als Kopie öffnen, damit die Quell-CDR garantiert unverändert bleibt
    Dim doc As document
    Set doc = Application.OpenDocumentAsCopy(cdrPath)

    RoundDoorbellMainShapes_ProcessDocument doc, logger

    RoundDoorbellMainShapes_SaveDocument doc, outputPath, logger

    run.saveSuccessfullCDRRun cdrPath

    ' Speicher freigeben (siehe CreateDoorbellPDFExport_ProcessCDR)
    On Error Resume Next
    doc.ClearUndoList
    doc.Dirty = False
    On Error GoTo 0

    doc.Close

ExitFunction:
    logger.removeTab
End Function


' Gibt den Speicherpfad im Output-Ordner auf dem Desktop zurück.
' Leer, wenn die CDR nicht unter dem Quellordner liegt (sonst würde das Original überschrieben)
Private Function RoundDoorbellMainShapes_GetOutputPath(cdrPath As String, logger As logger) As String
    Dim sourceFolder As String
    sourceFolder = Globals.addBackslash(RoundDoorbellMainShapes_GetDefaultFolder)

    Dim outputPath As String
    outputPath = replace(cdrPath, sourceFolder, Globals.getDesktopPath & "Funkklingeln Edelstahl Abgerundet Output\", , , vbTextCompare)

    If outputPath = cdrPath Then
        logger.logFATAL "CDR liegt nicht unter '" & sourceFolder & "' und wird übersprungen, damit das Original nicht überschrieben wird. cdrPath: '" & cdrPath & "'"
        Exit Function
    End If

    RoundDoorbellMainShapes_GetOutputPath = outputPath
End Function


Private Function RoundDoorbellMainShapes_SaveDocument(doc As document, outputPath As String, logger As logger)
    Globals.createFolder Globals.getParentPath(outputPath)
    doc.SaveAs outputPath
    logger.logINFO "Gespeichert: '" & outputPath & "'"
End Function


' Verarbeitet die offene CDR und speichert das Ergebnis im Output-Ordner auf dem Desktop.
' Das offene Dokument zeigt danach auf die gespeicherte Datei, die Quell-CDR bleibt unverändert
Public Sub Test_RoundDoorbellMainShapes_ProcessDocument()
    Globals.warnIfNoDocumentAndEnd

    Dim logger As logger: Set logger = Globals.getLogger(True)

    Dim outputPath As String
    outputPath = RoundDoorbellMainShapes_GetOutputPath(ActiveDocument.FullFileName, logger)
    If outputPath = "" Then
        MsgBox "Die CDR liegt nicht unter '" & RoundDoorbellMainShapes_GetDefaultFolder & "'. Abbruch, damit das Original nicht überschrieben wird.", vbExclamation
        Exit Sub
    End If

    Dim doc As document
    Set doc = ActiveDocument

    RoundDoorbellMainShapes_ProcessDocument doc, logger

    RoundDoorbellMainShapes_SaveDocument doc, outputPath, logger
End Sub


Private Function RoundDoorbellMainShapes_ProcessDocument(doc As document, logger As logger)
    logger.addTab , "[Macros.RoundDoorbellMainShapes_ProcessDocument]"

    Dim designs As ProductDesignRange
    Set designs = Globals.getAllDesignsAsRange(onlyValidDesigns:=True, ignoreMainDesigns:=False, logger:=logger)

    Dim i As Integer
    For i = 1 To designs.count
        RoundDoorbellMainShapes_ProcessDesign designs.getDesign(i), logger
    Next i

    ' Edelstahl-Grundplatte passend zur abgerundeten Hauptform neu platzieren
    PlaceFile.setSelectedPlaceTypeJob PlaceFile.jobEdelstahl
    PlaceFile.startFunction Globals.getAllShapes, Classfactory.newPlaceFileParameters.setParts(AllParts, layer1).setQuiet

    logger.removeTab
End Function


Private Function RoundDoorbellMainShapes_ProcessDesign(design As productDesign, logger As logger)
    logger.addTab , "[Macros.RoundDoorbellMainShapes_ProcessDesign] Design: " & design.getDesignNumber

    Dim i As Integer
    For i = 1 To design.getLayerCount
        RoundDoorbellMainShapes_ProcessLayer design.getLayer2(i), logger
    Next i

    ' Alte (eckige) Grundplatte des 1. Layers löschen, damit sie neu platziert wird
    Dim groundPlate As shape
    Set groundPlate = design.getLayer2(1).getGroundPlate

    If groundPlate Is Nothing Then
        logger.logWARN "Design hat auf dem 1. Layer keine Grundplatte"
    Else
        groundPlate.delete
        design.getLayer2(1).invalidateGroundPlate
    End If

    design.invalidateDesign

    logger.removeTab
End Function


Private Function RoundDoorbellMainShapes_ProcessLayer(layer As ProductDesignLayer, logger As logger)
    logger.addTab , "[Macros.RoundDoorbellMainShapes_ProcessLayer]"

    Dim mainShape As shape
    Set mainShape = layer.getMainShape

    If mainShape Is Nothing Then
        logger.logWARN "Layer hat keine Hauptform"
        GoTo ExitFunction
    End If

    If mainShape.Type = cdrTextShape Then
        logger.logWARN "Hauptform ist ein Text und wird übersprungen"
        GoTo ExitFunction
    End If

    Dim mainShapeName As String: mainShapeName = mainShape.name

    ' Hauptform in ihre SubPaths zerlegen. Der größte (das Rechteck) kommt zuerst
    Dim subShapes As shapeRange
    Set subShapes = Globals.getShapeRangeShapesSortedByBoundingBoxSize(Globals.BreakApartShapeSubPaths(mainShape), False)

    ' Die auseinandergepflückten Formen geraten leider aus ihrer Gruppe. Das wird hier behoben
    subShapes.OrderFrontOf mainShape

    ' Größte Form durch abgerundetes Rechteck ersetzen
    Dim oldRectangle As shape: Set oldRectangle = subShapes.firstShape
    Dim radius As Double: radius = ActiveDocument.ToUnits(5, cdrMillimeter)

    Dim roundedRectangle As shape
    Set roundedRectangle = ActiveLayer.CreateRectangle2(oldRectangle.LeftX, oldRectangle.BottomY, oldRectangle.SizeWidth, oldRectangle.SizeHeight, radius, radius, radius, radius)
    roundedRectangle.OrderFrontOf oldRectangle
    Globals.copyPasteShapeLook mainShape, roundedRectangle

    oldRectangle.delete
    subShapes.Remove 1
    subShapes.add roundedRectangle

    ' Zusammenfügen.
    ' Nicht wie Weld oder so, sondern so, dass keine Form eine andere subtrahiert oder addiert. Alle werden einfach zu einer neuen Form zusammengefügt. Dabei wird keine Kurve verändert
    subShapes.Combine.name = mainShapeName

    mainShape.delete

    ' Die Referenz auf die Hauptform ist jetzt ungültig
    layer.invalidateAll

ExitFunction:
    logger.removeTab
End Function













Public Sub RenameDoorBellCut()

    Dim cdrFolder As String
    cdrFolder = CorelScriptTools.GetFolder("Z:\Projekte\Funkklingel Montage\Funkklingeln\AE", "Wähle den Ordner mit den CDR Dateien")
    If cdrFolder = "" Then Exit Sub
    cdrFolder = Globals.addBackslash(cdrFolder)

    Dim logger As logger: Set logger = Globals.getLogger(True)

    logger.addTab , "[Macros.RenameDoorBellCut]"

    Dim run As New CDRRun
    run.init cdrFolder, "RenameDoorBellCut", False
    
    ' Vorlagen ignorieren
    run.getPaths.removeStringsMatchingComparison "_vorlage", StringInside, True
    
    
    ' DEBUGGING, damit nur eine FK verarbeitet wird
    Dim firstPath As String
    firstPath = run.getPaths.item(1)
    run.getPaths.RemoveAll
    run.getPaths.add firstPath
    
    
    RenameDoorBellCut_ProcessCDRs run.getPaths, run, logger

    logger.removeTab
    
End Sub




Private Function RenameDoorBellCut_ProcessCDRs(paths As ArrayList, run As CDRRun, logger As logger)
    logger.addTab , "[Macros.MakeDoorBellRounded_ProcessCDRs]"

    With ProgressBarUserForm.newSubProgress(paths.count)

        Dim i As Integer
        For i = 1 To paths.count
            .setDisplayText "CDR " & Globals.getFileName(paths.item(i))

            RenameDoorBellCut_ProcessCDR paths.item(i), logger

            .setStepsProgress i
        Next i

        .finishProgress
    End With

    logger.removeTab
End Function


Private Function RenameDoorBellCut_ProcessCDRPath(cdrPath As String, run As CDRRun, logger As logger)
    Dim doorbellDoc As document
    Set doorbellDoc = Application.OpenDocument(cdrPath)
    
    RenameDoorBellCut_ProcessCDR doorbellDoc, logger
    
    doorbellDoc.Save
    
    run.saveSuccessfullCDRRun cdrPath
    
Finally:
    doorbellDoc.Close
End Function



Private Sub Test_RenameDoorBellCut_ProcessCDR()
    Globals.warnIfNoDocumentAndEnd
    RenameDoorBellCut_ProcessCDR ActiveDocument, Globals.getLogger(True)
End Sub


Private Function RenameDoorBellCut_ProcessCDR(doorbellDoc As document, logger As logger)
    logger.addTab , "[Macros.RenameDoorBellCut_ProcessCDR]"

    RenameDoorBellCut_ProcessShapes doorbellDoc.ActiveLayer.shapes, logger

    logger.removeTab
End Function


' Wendet die Umbenennung nur auf das gegebene Design an (statt auf den ganzen ActiveLayer).
' Praktisch, wenn in einer CDR nur ein bestimmtes Design (z. B. das Wunschtextdesign)
' korrekte Shape-Namen bekommen soll, damit PlaceFile richtig platziert.
Private Function RenameDoorBellCut_ProcessDesign(design As productDesign, logger As logger)
    logger.addTab , "[Macros.RenameDoorBellCut_ProcessDesign] design productID: '" & design.getProductID & "'"

    RenameDoorBellCut_ProcessShapes design.getDesignShape.shapes, logger

    logger.removeTab
End Function


' Tauscht in 'shapes' (rekursiv) die Kurznamen der Funkklingeln gegen die vollständigen
' Bezeichnungen inkl. Modellnummer aus (siehe nameTable).
Private Function RenameDoorBellCut_ProcessShapes(shapes As shapes, logger As logger)
    logger.addTab , "[Macros.RenameDoorBellCut_ProcessShapes]"

    Dim nameTable As New ArrayList
    With nameTable
        .AddParamArray "Aosu Pro", "Aosu Pro V8P1AX11"
        .AddParamArray "Aosu Ultra", "Aosu Ultra V8S1AX15"
        .AddParamArray "Aqara", "Aqara G4 SVD-C03"
        
        .AddParamArray "Arlo Akku", "Arlo Akku (1.Gen) AVD2001"
        .AddParamArray "Arlo Akku-2.Gen", "Arlo Akku (2.Gen) AVD4001"
        .AddParamArray "Arlo Kabel", "Arlo Kabel AVD1001"
        
        .AddParamArray "Blink", "Blink (1. Gen) BDM01200U"
        .AddParamArray "Blink 2", "Blink (2.Gen) BDM01300U"
        
        .AddParamArray "Boifun Bell J1", "Boifun Bell J1"
        .AddParamArray "botslab", "Botslab Video Doorbell 2 Pro R811"
        .AddParamArray "Cococam", "Cococam Doorbell"
        .AddParamArray "ctronics", "Ctronics CTSC-J6"
        
        .AddParamArray "Eufy 1080 T8220", "Eufy 1080P T8220"
        .AddParamArray "Eufy 1080 T8222", "Eufy 1080P T8222"
        .AddParamArray "Eufy Akku", "Eufy 2K HD T8210"
        .AddParamArray "Eufy C30", "Eufy C30 T8224"
        .AddParamArray "Eufy C31", "Eufy C31 T8223"
        .AddParamArray "Eufy Dual E340", "Eufy Dual E340 T8214"
        .AddParamArray "Eufy Dual", "Eufy Dual T8213"
        .AddParamArray "Eufy Kabel", "Eufy HDR 2K T8200"
        
        .AddParamArray "EZVIZ DB1C", "EZVIZ DB1 CS-DB1C"
        .AddParamArray "DB2C", "EZVIZ DB2C CS-DB2C"
        .AddParamArray "EP3x Pro", "EZVIZ EP3x Pro CS-EP3x"
        
        .AddParamArray "Google Kabel", "Google Nest A0077"
        .AddParamArray "Google Akku", "Google Nest Akku 22LCUR"
        
        .AddParamArray "hombli", "Hombli Smart Doorbell 2 HBDB-0200"
        .AddParamArray "Netatmo NDB01", "Netatmo NDB01"
        .AddParamArray "Philips WelcomeEye", "Philips Welcome Eye 531034"
        
        .AddParamArray "Reolink Akku", "Reolink Akku 2AYHE-2205B"
        .AddParamArray "Reolink PoE", "Reolink PoE D340B"
        
        .AddParamArray "Ring 1", "Ring 1 5UM5E5"
        .AddParamArray "Ring 2", "Ring 2 8VR1S7-0EU0"
        .AddParamArray "Ring 3", "Ring 3 5AT3S9"
        .AddParamArray "Ring Akku Pro", "Ring Akku Pro 5F79E9"
        .AddParamArray "Ring Battery", "Ring Battery 5F97F2"
        .AddParamArray "Ring Elite", "Ring Elite 8VR1E7-0EU0"
        .AddParamArray "Ring Plus", "Ring Plus (1.Gen) 5F77E9" ' Vorheriger Fehler. Gen nicht in Klammern
        .AddParamArray "Ring Plus - 1 Gen 5F77E9", "Ring Plus (1.Gen) 5F77E9"
        .AddParamArray "Ring Plus 2", "Ring Plus (2.Gen) 5DFYA3" ' Vorheriger Fehler. Gen nicht in Klammern
        .AddParamArray "Ring Plus - 2. Gen 5DFYA3", "Ring Plus (2.Gen) 5DFYA3"
        .AddParamArray "Ring Pro1", "Ring Pro1"
        .AddParamArray "Ring Pro Kabel", "Ring Pro2 5AT2S2"
        .AddParamArray "Ring Wired", "Ring Wired 5AT3T5"
        .AddParamArray "Ring Pro 3", "Ring Wired Pro (3.Gen) 5DFYA2" ' Vorheriger Fehler. Gen nicht in Klammern
        .AddParamArray "Ring Wired Pro - 3. Gen 5DFYA2", "Ring Wired Pro (3.Gen) 5DFYA2"
        
        .AddParamArray "Tapo D235", "Tapo D235"
        .AddParamArray "tmezon interkom", "Tmezon Intercom MZ-VDP-NE120"
        .AddParamArray "tmezon", "Tmezon Smart Home Bell J7 Plus"
        .AddParamArray "Unifi G4", "Ubiquiti UniFi G4 Pro UVC-G4 Doorbell Pro "
        .AddParamArray "Unifi G6 Entry", "Ubiquiti Unifi G6 Entry UVC-G6-Entry"
        .AddParamArray "winees", "Winees M6P20AC"
        .AddParamArray "Cardea 2", "WP Cardea 2"
        
        .AddParamArray "WP Pro V1", "WP ProV1 (2.Gen)"
        .AddParamArray "WP ProV1 2.Gen", "WP ProV1 (2.Gen)"
        .AddParamArray "WP V1", "WP ProV1 (2.Gen)"
    End With
    
    
    If nameTable.count Mod 2 = 1 Then Err.Raise vbObjectError + 513, , "[Globals.RenameDoorBellCut_ProcessCDR] 'nameTable' hat nicht überall Wortpaare. Anzahl ungerade "
    
    With ProgressBarUserForm.newSubProgress(nameTable.count / 2)

        Dim i As Integer
        For i = 1 To nameTable.count / 2
            Dim searchh As String
            searchh = nameTable.item(i * 2 - 1)
            Dim replacee As String
            replacee = nameTable.item(i * 2)
            
            .setDisplayText "Tausche Bezeichnug '" & searchh & "'"
            
            RenameDoorBellCut_ReplaceName searchh, replacee, shapes

            .setStepsProgress i
        Next i

        .finishProgress
    End With
    

    logger.removeTab
End Function


Private Sub Test_RenameDoorBellCut_ReplaceName()
    
    Globals.warnIfNoDocumentAndEnd
    
    RenameDoorBellCut_ReplaceName "Aosu Pro", "Aosu Pro V8P1AX11", ActiveDocument.ActiveLayer.shapes
    
End Sub


Private Function RenameDoorBellCut_ReplaceName(searchh As String, replacee As String, shapes As shapes)
    
    Dim shapesWithName As shapeRange
    Set shapesWithName = shapes.FindShapes(searchh)
    
    Globals.setShapeRangeName shapesWithName, replacee
    
End Function




Public Sub SortTextOfDesigns()
    
    With ProgressBarUserForm.newSubProgress(1)
        Globals.getSelectedDesignsOrAllAsRange(ignoreMasterDesign:=False).sortText False
        .finishProgress
    End With
End Sub



Public Sub SelectText()
    newCustomShapeTypeQuery(ActiveLayer.shapes.All, TextAny).search.CreateSelection
End Sub



Public Sub ExportSelectedShapesAsSVG()
    newShapeExport(ActiveSelectionRange, Globals.getDesktopPath & "Macros.ExportSelectedShapesAsSVG", cdrSVG).export
End Sub













Public Sub ConvertFakedDoorbellCDRs()
    
    
    Dim fakedDoorbellFolder As String
    fakedDoorbellFolder = CorelScriptTools.GetFolder("V:\Produkte\Türklingel\Funkklingeln\Acryl + Edelstahl\Montage-Löcher\Für Fancy gefaked", "Wähle den Ordner mit den gefakten Funkklingeln")
    If fakedDoorbellFolder = "" Then Exit Sub
    fakedDoorbellFolder = Globals.addBackslash(fakedDoorbellFolder)
    
    Dim logger As logger: Set logger = Globals.getLogger(True)
    
    logger.addTab , "[Macros.ConvertFakedDoorbellCDRs]"
    
    Dim run As New CDRRun
    run.init fakedDoorbellFolder, "ConvertFakedDoorbellCDRs", True
    
    ' DEBUGGING, damit nur eine FK verarbeitet wird
'    If run.getPaths.count > 0 Then
'        Dim firstPath As String
'        firstPath = run.getPaths.item(1)
'        run.getPaths.RemoveAll
'        run.getPaths.add firstPath
'    End If
    
    convertFakedDoorbellCDRs_processCDRs run.getPaths, run, logger
    
    logger.removeTab
    
End Sub



Private Function convertFakedDoorbellCDRs_processCDRs(paths As ArrayList, run As CDRRun, logger As logger)
    logger.addTab , "[Macros.convertFakedDoorbellCDRs_processCDRs]"
    
    With ProgressBarUserForm.newSubProgress(paths.count)

        Dim i As Integer
        For i = 1 To paths.count
            .setDisplayText "CDR " & Globals.getFileName(paths.item(i))

            convertFakedDoorbellCDRs_processCDR paths.item(i), logger
            
            run.saveSuccessfullCDRRun paths.item(i)

            .setStepsProgress i
        Next i

        .finishProgress
    End With
    
    logger.removeTab
End Function



Private Function convertFakedDoorbellCDRs_processCDR(path As String, logger As logger)
    logger.addTab , "[Macros.convertFakedDoorbellCDRs_processCDRs] path: '" & path & "'"
    
    Dim doc As document
    Set doc = OpenDocument(path)
    
    convertFakedDoorbellCDRs_processDocument doc, convertFakedDoorbellCDRs_getDoorbellNameFromCDRPath(path), logger
    
    ' Schließen. Speichern nicht nötig, da beim Taggen schon gespeichert wird
    doc.Close
    

    logger.removeTab
End Function


Private Function convertFakedDoorbellCDRs_getDoorbellNameFromCDRPath(path As String) As String
    Dim doorbellName As String
    
    ' GRÖSSE: Name des 2. Überordners 1. [CDR] -> 2. 16x28 -> 3. Aosu Pro
    doorbellName = Globals.getFolderName(Globals.getParentPath(path, 2))
    ' FUNKKLINGEL-NAME: Name des 3. Überordners 1. [CDR] -> 2. 16x28 -> 3. Aosu Pro
    doorbellName = Globals.getFolderName(Globals.getParentPath(path, 3)) & " " & doorbellName
End Function


Private Sub Test_convertFakedDoorbellCDRs_processDocument()
    convertFakedDoorbellCDRs_processDocument ActiveDocument, convertFakedDoorbellCDRs_getDoorbellNameFromCDRPath(ActiveDocument.filePath), Globals.getLogger(True)
End Sub



Private Function convertFakedDoorbellCDRs_processDocument(doc As document, doorbellName As String, logger As logger)
    logger.addTab , "[Macros.convertFakedDoorbellCDRs_processDocument] doorbellName: '" & doorbellName & "'"
    
    Dim designs As ProductDesignRange
    Set designs = Globals.getSelectedDesignsOrAllAsRange(ignoreMainDesigns:=True) ' Wunschtextdesign nicht taggen
    
    convertFakedDoorbellCDRs_processDesigns designs, doorbellName, logger
    
    logger.removeTab
End Function



Private Function convertFakedDoorbellCDRs_processDesigns(designs As ProductDesignRange, doorbellName As String, logger As logger)
    logger.addTab , "[Macros.convertFakedDoorbellCDRs_processDesigns] doorbellName: '" & doorbellName & "'"
    
    ' Benennung aktualisieren
    logger.logINFO "Funkklingel Benennung aktualisieren"
    RenameDoorBellCut_ProcessCDR ActiveDocument, logger
    
    Dim i As Integer
    For i = 1 To designs.count
        convertFakedDoorbellCDRs_processDesign designs.getDesign(i), logger
    Next i
    
    ' Muster Design erstellen
    logger.logINFO "Muster Design erstellen"
    Dim masterDesign As productDesign
    Set masterDesign = designs.getDesign(1).duplicateAsMasterDesign
    
    ' Funkklingel Jobs platzieren
    logger.logINFO "Funkklingel Jobs platzieren"
    PlaceFile.initIfNeeded
    PlaceFile.setSelectedPlaceTypeJob PlaceFile.jobFunkklingelnFakedJobs
    PlaceFile.startFunction masterDesign.getDesignShape, Classfactory.newPlaceFileParameters
    
    ' Funkklingel PNG als _locked taggen
    logger.logINFO "Funkklingel locken"
    Dim placedShapes As shapeRange
    Set placedShapes = PlaceFile.placedShapes
    Globals.removeDeletedShapeFromShapeRange placedShapes
    Globals.markShapes PlaceFile.placedShapes, Globals.getLockedKeyWord, True, True, False
    
    ' Anordnen
    logger.logINFO "Anordnen"
    Globals.removeSelection
    arrange.arrangeFunction True, , True, True
    
    ' Customization ID Taggen
    Dim randomDesignIndex As Integer
    randomDesignIndex = Int(designs.count * Rnd) + 1
    FancyExport.startTagDesigns designs, doorbellName & " Funkklingel (faked)", designs.getDesign(randomDesignIndex).getProductID
    
    logger.logINFO "- Fertig"
    logger.removeTab
End Function


Private Function convertFakedDoorbellCDRs_processDesign(design As productDesign, logger As logger)
    logger.addTab , "[Macros.convertFakedDoorbellCDRs_processDesigns] design productID: '" & design.getProductID & "'"
    
    ' Edelstahl Layer löschen, da dieser variabel sein soll,
    ' was mit Jobs auf dem Masterdesign gefaked wird
    If design.getLayers.count > 1 Then
        design.getLayers.getLayer(2).delete
    End If
    
    logger.logINFO "- Fertig"
    logger.removeTab
End Function




' Erzeugt für jede Edelstahlrahmen-Variante (z. B. "16x28 (14x26)") eine neue Designs-CDR:
' Das komplette Basis-Design (z. B. "16x28") wird übernommen, dessen Text-Designelemente
' (Globals.DesignElementShapeType + Text) werden aber gelöscht und durch die passend
' positionierten Text-Designelemente der Variante ersetzt (bei 14x26 ist das Acryl vorne
' 2 cm je Seite kleiner, daher sitzt der Text dort anders).
' Gearbeitet wird nur mit der Master-CDR "[CDR]\*_Designs.cdr" jedes Ordners.
' Das Ergebnis wird unter <Desktop>\Funkklingeln Output\<Unterstruktur>\[CDR]\ gespeichert,
' die Originale bleiben unangetastet.
Public Sub CreateEdelstahlFrameVariantsFromBaseDesigns()

    Dim rootFolder As String
    rootFolder = CorelScriptTools.GetFolder("V:\Produkte\Türklingel\Funkklingeln\Acryl + Edelstahl\Montage-Löcher\Eckig", "Wähle den Ordner mit den Funkklingelmodellen")
    If rootFolder = "" Then Exit Sub
    rootFolder = Globals.addBackslash(rootFolder)

    Dim outputRoot As String
    outputRoot = Globals.getDesktopPath & "Funkklingeln Output\"

    Dim logger As New logger
    logger.init "CreateEdelstahlFrameVariantsFromBaseDesigns"
    logger.addTab , "[Macros.CreateEdelstahlFrameVariantsFromBaseDesigns]"

    ' Alle Variantenordner (Name mit Klammer-Maß, z. B. "16x28 (14x26)") rekursiv sammeln
    Dim variantFolders As New collection
    CreateEdelstahlFrameVariantsFromBaseDesigns_CollectVariantFolders rootFolder, variantFolders

    logger.logINFO "Gefundene Variantenordner: " & variantFolders.count

    CreateEdelstahlFrameVariantsFromBaseDesigns_ProcessVariantFolders variantFolders, rootFolder, outputRoot, logger

    logger.logINFO "Fertig. Ausgabe: '" & outputRoot & "'"
    logger.removeTab

End Sub


' Sammelt rekursiv alle Variantenordner ab 'folderPath' in 'result' (ByRef).
' Größenordner (Basis wie "16x28" und Varianten wie "16x28 (14x26)") werden nicht weiter
' durchsucht, damit die tiefe Design-/[CDR]-Struktur nicht unnötig durchlaufen wird.
Private Function CreateEdelstahlFrameVariantsFromBaseDesigns_CollectVariantFolders(folderPath As String, ByRef result As collection)

    Dim subFolders As collection
    Set subFolders = Globals.getFoldersInFolder(folderPath, False, , True) ' nur direkte Unterordner als Pfade

    Dim i As Integer
    For i = 1 To subFolders.count
        Dim subPath As String
        subPath = subFolders(i)

        Dim folderName As String
        folderName = Globals.getFolderName(subPath)

        If CreateEdelstahlFrameVariantsFromBaseDesigns_IsVariantFolderName(folderName) Then
            result.add subPath
        End If

        ' Nur in Modell-/Kategorieordner weiter absteigen, nicht in Größenordner
        If Not CreateEdelstahlFrameVariantsFromBaseDesigns_LooksLikeSizeFolderName(folderName) Then
            CreateEdelstahlFrameVariantsFromBaseDesigns_CollectVariantFolders subPath, result
        End If
    Next i

End Function


' True, wenn der Ordnername ein Klammer-Maß enthält, z. B. "16x28 (14x26)"
Private Function CreateEdelstahlFrameVariantsFromBaseDesigns_IsVariantFolderName(folderName As String) As Boolean
    CreateEdelstahlFrameVariantsFromBaseDesigns_IsVariantFolderName = _
        InStr(folderName, "x") > 0 And InStr(folderName, " (") > 0 And Right(folderName, 1) = ")"
End Function


' True, wenn der Ordnername wie ein Größenordner aussieht (Basis oder Variante), z. B. "16x28" oder "16x28 (14x26)"
Private Function CreateEdelstahlFrameVariantsFromBaseDesigns_LooksLikeSizeFolderName(folderName As String) As Boolean
    CreateEdelstahlFrameVariantsFromBaseDesigns_LooksLikeSizeFolderName = (folderName Like "#*x#*")
End Function


' Zerlegt ein Maß wie "16x28" in Breite und Höhe (ByRef). Gibt False zurück, wenn das Format nicht passt.
Private Function CreateEdelstahlFrameVariantsFromBaseDesigns_ParseSize(sizeText As String, ByRef width As Integer, ByRef height As Integer) As Boolean
    Dim parts() As String
    parts = Split(sizeText, "x")

    If UBound(parts) - LBound(parts) <> 1 Then Exit Function
    If Not IsNumeric(Trim(parts(0))) Or Not IsNumeric(Trim(parts(1))) Then Exit Function

    width = CInt(Trim(parts(0)))
    height = CInt(Trim(parts(1)))
    CreateEdelstahlFrameVariantsFromBaseDesigns_ParseSize = True
End Function


Private Function CreateEdelstahlFrameVariantsFromBaseDesigns_ProcessVariantFolders(variantFolders As collection, rootFolder As String, outputRoot As String, logger As logger)
    logger.addTab , "[Macros.CreateEdelstahlFrameVariantsFromBaseDesigns_ProcessVariantFolders]"

    With ProgressBarUserForm.newSubProgress(variantFolders.count)

        Dim i As Integer
        For i = 1 To variantFolders.count
            .setDisplayText "Variante " & Globals.getFolderName(CStr(variantFolders(i)))

            CreateEdelstahlFrameVariantsFromBaseDesigns_ProcessVariantFolder CStr(variantFolders(i)), rootFolder, outputRoot, logger

            .setStepsProgress i
        Next i

        .finishProgress
    End With

    logger.removeTab
End Function


Private Function CreateEdelstahlFrameVariantsFromBaseDesigns_ProcessVariantFolder(variantFolder As String, rootFolder As String, outputRoot As String, logger As logger)
    logger.addTab , "[Macros.CreateEdelstahlFrameVariantsFromBaseDesigns_ProcessVariantFolder] '" & variantFolder & "'"

    Dim variantName As String
    variantName = Globals.getFolderName(variantFolder)                              ' "16x28 (14x26)"

    Dim baseName As String
    baseName = Trim(left(variantName, InStr(variantName, " (") - 1))                ' "16x28"

    ' Inneres Maß aus der Klammer, z. B. "14x26"
    Dim innerName As String
    innerName = Mid(variantName, InStr(variantName, "(") + 1)
    innerName = Trim(left(innerName, InStr(innerName, ")") - 1))

    ' Nur verbinden, wenn das Acryl auf BEIDEN Achsen exakt 2 cm kleiner ist (z. B. 16x28 -> 14x26).
    ' Varianten wie (14x28) oder (16x26) sind nur auf einer Achse kleiner und werden übersprungen.
    Dim baseW As Integer, baseH As Integer, innerW As Integer, innerH As Integer
    If Not CreateEdelstahlFrameVariantsFromBaseDesigns_ParseSize(baseName, baseW, baseH) _
        Or Not CreateEdelstahlFrameVariantsFromBaseDesigns_ParseSize(innerName, innerW, innerH) Then
        logger.logWARN "Größe nicht lesbar ('" & baseName & "' / '" & innerName & "'). Überspringe."
        GoTo ExitFunction
    End If

    If Not (baseW - innerW = 2 And baseH - innerH = 2) Then
        logger.logINFO "Variante '" & variantName & "' ist nicht auf beiden Achsen 2 kleiner. Überspringe."
        GoTo ExitFunction
    End If

    Dim baseFolder As String
    baseFolder = Globals.addBackslash(Globals.getParentPath(variantFolder)) & baseName ' Geschwisterordner

    If Not Globals.folderExists(baseFolder) Then
        logger.logWARN "Basisordner nicht gefunden: '" & baseFolder & "'. Überspringe."
        GoTo ExitFunction
    End If

    Dim baseCDR As String
    baseCDR = CreateEdelstahlFrameVariantsFromBaseDesigns_FindDesignsCDR(baseFolder)

    Dim variantCDR As String
    variantCDR = CreateEdelstahlFrameVariantsFromBaseDesigns_FindDesignsCDR(variantFolder)

    If baseCDR = "" Then
        logger.logWARN "Keine _Designs.cdr im Basisordner: '" & baseFolder & "'. Überspringe."
        GoTo ExitFunction
    End If
    If variantCDR = "" Then
        logger.logWARN "Keine _Designs.cdr im Variantenordner: '" & variantFolder & "'. Überspringe."
        GoTo ExitFunction
    End If

    ' Ausgabepfad: Unterstruktur ab gewähltem Root bis zum Basisordner erhalten, Basis-Dateiname behalten
    Dim relPath As String
    relPath = Mid(Globals.addBackslash(baseFolder), Len(rootFolder) + 1)            ' z. B. "Aosu Pro\16x28\"

    Dim outputFolder As String
    outputFolder = Globals.addBackslash(outputRoot) & relPath & "[CDR]\"

    Dim outputCDR As String
    outputCDR = outputFolder & Globals.getFileNameAndType(baseCDR)                  ' z. B. "FKA-AosuPro-16x28_Designs.cdr"

    Dim baseDoc As document
    Dim variantDoc As document
    Set baseDoc = Application.OpenDocumentAsCopy(baseCDR)
    Set variantDoc = Application.OpenDocumentAsCopy(variantCDR)

    ' Ab hier bei Fehlern aufräumen und mit der nächsten Variante weitermachen
    On Error GoTo cleanUp

    CreateEdelstahlFrameVariantsFromBaseDesigns_ReplaceDesignTexts baseDoc, variantDoc, logger

    Globals.createFolder outputFolder

    logger.logINFO "Speichere '" & outputCDR & "' ..."
    baseDoc.SaveAsCopy outputCDR
    logger.logINFO "Gespeichert!"

cleanUp:
    If Err.number <> 0 Then
        logger.logWARN "Fehler bei Variante '" & variantName & "': " & Err.Description & " (Nr. " & Err.number & "). Überspringe."
    End If

    On Error Resume Next
    If Not variantDoc Is Nothing Then
        If Not baseDoc Is Nothing Then baseDoc.Activate
        DoEvents
        variantDoc.Close
        Set variantDoc = Nothing
    End If
    If Not baseDoc Is Nothing Then
        ' Vor dem Schließen ein anderes Dokument aktivieren (Corel-Absturzschutz)
        Dim d As Integer
        For d = 1 To Documents.count
            If Not Documents(d) Is baseDoc Then Documents(d).Activate: Exit For
        Next d
        DoEvents
        baseDoc.Close
        Set baseDoc = Nothing
    End If
    On Error GoTo 0

ExitFunction:
    logger.removeTab
End Function


' Sucht die "*_Designs.cdr" im "[CDR]"-Unterordner eines Größenordners.
Private Function CreateEdelstahlFrameVariantsFromBaseDesigns_FindDesignsCDR(sizeFolder As String) As String

    Dim cdrFolder As String
    cdrFolder = Globals.addBackslash(sizeFolder) & "[CDR]"

    If Not Globals.folderExists(cdrFolder) Then Exit Function

    Dim files As collection
    Set files = Globals.findFilesPathWithExtensionInFolder(cdrFolder, "cdr")

    Dim i As Integer
    For i = 1 To files.count
        Dim fileName As String
        fileName = Globals.getFileNameAndType(CStr(files(i)))

        If InStr(1, fileName, "_Designs", vbTextCompare) > 0 _
            And InStr(1, fileName, "Sicherungskopie", vbTextCompare) = 0 Then
            CreateEdelstahlFrameVariantsFromBaseDesigns_FindDesignsCDR = files(i)
            Exit Function
        End If
    Next i

End Function


' Ersetzt in allen Designs der Basis-CDR die Text-Designelemente durch die der Varianten-CDR.
' Designs werden über den Index gepaart (Basis-Design i <-> Varianten-Design i).
Private Function CreateEdelstahlFrameVariantsFromBaseDesigns_ReplaceDesignTexts(baseDoc As document, variantDoc As document, logger As logger)
    logger.addTab , "[Macros.CreateEdelstahlFrameVariantsFromBaseDesigns_ReplaceDesignTexts]"

    baseDoc.Activate
    Dim baseDesigns As New ProductDesignRange
    baseDesigns.AddRange Globals.getAllDesigns(, True)

    variantDoc.Activate
    Dim variantDesigns As New ProductDesignRange
    variantDesigns.AddRange Globals.getAllDesigns(, True)

    If baseDesigns.count <> variantDesigns.count Then
        logger.logWARN "Unterschiedliche Design-Anzahl (Basis " & baseDesigns.count & ", Variante " & variantDesigns.count & "). Verarbeite nur die gemeinsamen Designs."
    End If

    Dim designCount As Integer
    If baseDesigns.count < variantDesigns.count Then
        designCount = baseDesigns.count
    Else
        designCount = variantDesigns.count
    End If

    Dim i As Integer
    For i = 1 To designCount
        CreateEdelstahlFrameVariantsFromBaseDesigns_ReplaceDesignTextsInDesign _
            baseDoc, variantDoc, baseDesigns.getDesign(i), variantDesigns.getDesign(i), logger
    Next i

    logger.removeTab
End Function


' Ersetzt die Text-Designelemente eines Designs Ebene für Ebene (Part/Layer über den Index gepaart).
Private Function CreateEdelstahlFrameVariantsFromBaseDesigns_ReplaceDesignTextsInDesign(baseDoc As document, variantDoc As document, baseDesign As productDesign, variantDesign As productDesign, logger As logger)
    logger.addTab , "[Macros.CreateEdelstahlFrameVariantsFromBaseDesigns_ReplaceDesignTextsInDesign] Design '" & baseDesign.getProductID & "'"

    Dim partCount As Integer
    If baseDesign.getPartsCount < variantDesign.getPartsCount Then
        partCount = baseDesign.getPartsCount
    Else
        partCount = variantDesign.getPartsCount
    End If

    Dim p As Integer
    For p = 1 To partCount
        Dim basePart As ProductDesignPart
        Set basePart = baseDesign.getPart(p)

        Dim variantPart As ProductDesignPart
        Set variantPart = variantDesign.getPart(p)

        Dim layerCount As Integer
        If basePart.count < variantPart.count Then
            layerCount = basePart.count
        Else
            layerCount = variantPart.count
        End If

        Dim l As Integer
        For l = 1 To layerCount
            CreateEdelstahlFrameVariantsFromBaseDesigns_ReplaceLayerTexts _
                baseDoc, variantDoc, basePart.getLayer(l), variantPart.getLayer(l), logger
        Next l
    Next p

    baseDesign.invalidateDesign

    logger.removeTab
End Function


' Löscht die Text-Designelemente einer Basis-Ebene und fügt die der Varianten-Ebene ein.
' Reihenfolge: erst die Varianten-Texte einfügen (solange die Layer-Gruppe noch Kinder als
' Anker hat), dann die Basis-Texte löschen. Die Varianten-Texte werden über OrderFrontOf in
' die Ziel-Layer-Gruppe verschoben und behalten durch Paste ihre Originalposition (14x26).
Private Function CreateEdelstahlFrameVariantsFromBaseDesigns_ReplaceLayerTexts(baseDoc As document, variantDoc As document, baseLayer As ProductDesignLayer, variantLayer As ProductDesignLayer, logger As logger)

    ' Text-Designelemente der Variante (Quelle)
    Dim variantTexts As shapeRange
    Set variantTexts = variantLayer.newCustomShapeTypeQuery(DesignElementShapeType).search
    Set variantTexts = Classfactory.newCustomShapeTypeQuery(variantTexts, TextAny).search

    ' Text-Designelemente der Basis (zum Löschen)
    Dim baseTexts As shapeRange
    Set baseTexts = baseLayer.newCustomShapeTypeQuery(DesignElementShapeType).search
    Set baseTexts = Classfactory.newCustomShapeTypeQuery(baseTexts, TextAny).search

    If variantTexts.count = 0 And baseTexts.count = 0 Then Exit Function

    ' Anker in der Ziel-Layer-Gruppe merken, damit die Kopien in die Gruppe wandern
    Dim Anchor As shape
    If baseLayer.layerShape.shapes.count > 0 Then Set Anchor = baseLayer.layerShape.shapes.First

    If Anchor Is Nothing And variantTexts.count > 0 Then
        logger.logWARN "Ziel-Ebene ohne Anker-Form; eingefügte Texte landen evtl. neben der Layer-Gruppe."
    End If

    ' Ziel-Corel-Ebene ermitteln (die Ebene, auf der die Basis-Layer-Gruppe sitzt)
    Dim targetLayer As layer
    If Not Anchor Is Nothing Then
        Set targetLayer = Anchor.layer
    Else
        Set targetLayer = baseLayer.layerShape.layer
    End If

    ' Texte objektbasiert neu aufbauen: CloneTextToLayer arbeitet dokumentübergreifend, ohne
    ' Zwischenablage und ohne Seitenaktivierung. Pro Text abgesichert, damit ein nicht unterstützter
    ' Text (z. B. Text auf Pfad) nur diesen Text überspringt statt die ganze Variante abzubrechen.
    Dim j As Integer
    For j = 1 To variantTexts.count
        Dim dst As shape
        Set dst = Nothing

        Dim cloneErr As Long
        Dim cloneMsg As String

        On Error Resume Next
        Set dst = CloneTextToLayer(variantTexts(j), targetLayer)
        cloneErr = Err.number
        cloneMsg = Err.Description
        On Error GoTo 0

        If dst Is Nothing Then
            logger.logWARN "Text nicht klonbar (" & cloneErr & ": " & cloneMsg & "). Übersprungen."
        ElseIf Not Anchor Is Nothing Then
            dst.OrderFrontOf Anchor
        End If
    Next j

    If baseTexts.count > 0 Then baseTexts.delete

End Function



Public Sub TestShapeDulicationBetweenDocuments()
    
    Globals.endIfNoActiveShape
    
    CloneBitmapTo ActiveShape, Documents(2).Pages(1).ActiveLayer
    
    Documents(2).Activate
    
End Sub

Private Function CloneBitmapTo( _
    ByVal src As shape, _
    ByVal targetLayer As layer _
) As shape

    Dim img As image
    Set img = src.bitmap.image.GetCopy

    Dim alpha As image
    If Not src.bitmap.imageAlpha Is Nothing Then
        Set alpha = src.bitmap.imageAlpha.GetCopy
    End If

    Set CloneBitmapTo = targetLayer.CreateBitmapRect( _
        src.boundingBox, _
        img, _
        alpha)
    
    Dim d11 As Double
    Dim d12 As Double
    Dim d21 As Double
    Dim d22 As Double
    Dim tx As Double
    Dim ty As Double
    src.GetMatrix d11, d12, d21, d22, tx, ty
    
    CloneBitmapTo.ApplyTransformMatrix src.TransformationMatrix
    'CloneBitmapTo.SetMatrix d11, d12, d21, d22, tx, ty

End Function










Public Sub TestTextDuplicationBetweenDocumentOldWay()
    Globals.endIfNoActiveShape
    
    Dim src As shape
    Set src = ActiveShape
    
    If src.Type <> cdrTextShape Then
        MsgBox "Bitte ein Text-Shape auswählen."
        Exit Sub
    End If
    
    Dim tStep As Single
    tStep = timer
    
    src.copy
    
    Documents(2).Pages(1).ActiveLayer.Paste
    
    ' Dauert bei einem Text ca. 0,168s
    MsgBox "Kopiert in " & Format(timer - tStep, "0.000") & "s"
End Sub








Public Sub TestTextDuplicationBetweenDocuments()

    Globals.endIfNoActiveShape

    Dim src As shape
    Set src = ActiveShape

    If src.Type <> cdrTextShape Then
        MsgBox "Bitte ein Text-Shape auswählen."
        Exit Sub
    End If

    Dim targetLayer As layer
    Set targetLayer = Documents(2).Pages(1).ActiveLayer

    Dim tStep As Single
    tStep = timer

    Dim dst As shape
    Set dst = CloneTextToLayer(src, targetLayer)

    ' Dauert bei einem Text ca. 0,031 s
    MsgBox "Kopiert in " & Format(timer - tStep, "0.000") & "s"

End Sub


Public Function CloneTextToLayer( _
    ByVal src As shape, _
    ByVal targetLayer As layer _
) As shape

    If src.Type <> cdrTextShape Then
        Err.Raise vbObjectError + 1000, _
                  "CloneTextToLayer", _
                  "Das Source-Shape ist kein Text."
    End If

    Dim dst As shape

    Select Case src.text.Type

        Case cdrArtisticText

            Set dst = targetLayer.CreateArtisticText( _
                src.LeftX, _
                src.BottomY, _
                src.text.Story.WideText)

        Case cdrParagraphText

            Set dst = targetLayer.CreateParagraphTextWide( _
                src.LeftX, _
                src.TopY, _
                src.RightX, _
                src.BottomY, _
                src.text.Story.WideText)

        Case cdrArtisticFittedText, cdrParagraphFittedText

            Err.Raise vbObjectError + 1001, _
                      "CloneTextToLayer", _
                      "Text auf Pfad wird aktuell noch nicht unterstützt."

        Case Else

            Err.Raise vbObjectError + 1002, _
                      "CloneTextToLayer", _
                      "Unbekannter Text-Typ: " & src.text.Type

    End Select

    CopyTextAttributes src.text.Story, dst.text.Story

    ' Nach dem Formatieren erneut positionieren,
    ' weil sich durch Font/Größe die BoundingBox ändern kann.
    dst.Move _
        src.LeftX - dst.LeftX, _
        src.BottomY - dst.BottomY

    Set CloneTextToLayer = dst

End Function


Private Sub CopyTextAttributes( _
    ByVal srcStory As textRange, _
    ByVal dstStory As textRange _
)

    Dim srcRange As textRange
    Dim dstRange As textRange

    For Each srcRange In srcStory.EnumRanges(cdrTextPropertyAll)

        Set dstRange = dstStory.range( _
            srcRange.Start, _
            srcRange.End)

        dstRange.copyAttributes srcRange

    Next srcRange

End Sub



' Erzeugt aus den Wunschtextdesigns aller Design-CDRs unterhalb eines Ordners je ein
' Funkklingel-Modell als PDF:
'   1. Auf jedes Wunschtextdesign (Design ohne Designnummer = MainDesign) wird der
'      PlaceFile-Job "Funkklingel Modelle" (jobFunkklingelModelle) angewendet. Damit die
'      Formen dabei erkannt werden, werden vorher per RenameDoorBellCut_ProcessDesign die
'      Shape-Namen korrigiert.
'   2. Anschließend werden ALLE Texte aus dem Design entfernt (auch Artikelnummer und
'      "Wunschtext").
'   3. Die Hauptform (ProductDesignLayer.getMainShape) jedes Layers wird blau (#0000FF) gefärbt.
'   4. Das Design (inkl. platziertem Modell) wird als PDF nach Desktop\CreateDoorbellPDFExport\
'      exportiert (Dateiname "Modellname Größe.pdf").
' Größen-Varianten mit Klammer-Maß ("16x28 (14x26)") werden übersprungen, nur Basisgrößen.
' Die Quell-CDRs werden nicht verändert (als Kopie geöffnet und wieder geschlossen).
Public Sub CreateDoorbellPDFExport()

    Dim cdrFolder As String
    cdrFolder = CorelScriptTools.GetFolder("V:\Produkte\Türklingel\Funkklingeln\Acryl + Edelstahl\Montage-Löcher\Eckig", "Wähle den Ordner mit den Design-CDRs")
    If cdrFolder = "" Then Exit Sub
    cdrFolder = Globals.addBackslash(cdrFolder)

    Dim logger As logger: Set logger = Globals.getLogger(True)
    logger.addTab , "[Macros.CreateDoorbellPDFExport]"

    ' True = nur Design-CDRs (rekursiv aus allen Unterordnern)
    Dim run As New CDRRun
    run.init cdrFolder, "CreateDoorbellPDFExport", True

    ' Größen-Varianten mit Klammer-Maß (z. B. "16x28 (14x26)") überspringen - nur Basisgrößen ("16x28")
    CreateDoorbellPDFExport_removeVariantPaths run.getPaths, logger

    CreateDoorbellPDFExport_ProcessCDRs run.getPaths, run, logger

    logger.removeTab

End Sub


' Entfernt CDR-Pfade, die eine Größen-Variante mit Klammer-Maß enthalten (z. B. ".../16x28 (14x26)/...").
' Basisgrößen ohne Klammer (z. B. "16x28") bleiben erhalten.
Private Function CreateDoorbellPDFExport_removeVariantPaths(paths As ArrayList, logger As logger)
    logger.addTab , "[Macros.CreateDoorbellPDFExport_removeVariantPaths]"

    Dim regex As New RegExp
    regex.Pattern = "\(\s*\d+x\d+\s*\)" ' Klammer-Maß wie "(14x26)"

    Dim removedCount As Integer

    Dim i As Integer
    For i = paths.count To 1 Step -1
        If regex.Test(CStr(paths.item(i))) Then
            logger.logINFO "Überspringe Größen-Variante: '" & paths.item(i) & "'"
            paths.RemoveAt i
            removedCount = removedCount + 1
        End If
    Next i

    logger.logINFO "Übersprungene Größen-Varianten (Klammer-Maß): " & removedCount
    logger.removeTab
End Function


Private Function CreateDoorbellPDFExport_ProcessCDRs(paths As ArrayList, run As CDRRun, logger As logger)
    logger.addTab , "[Macros.CreateDoorbellPDFExport_ProcessCDRs]"

    With ProgressBarUserForm.newSubProgress(paths.count)

        Dim i As Integer
        For i = 1 To paths.count
            .setDisplayText "CDR " & Globals.getFileName(paths.item(i))

            CreateDoorbellPDFExport_ProcessCDR paths.item(i), run, logger

            .setStepsProgress i
        Next i

        .finishProgress
    End With

    logger.removeTab
End Function


Private Function CreateDoorbellPDFExport_ProcessCDR(cdrPath As String, run As CDRRun, logger As logger)
    logger.addTab , "[Macros.CreateDoorbellPDFExport_ProcessCDR] cdrPath: '" & cdrPath & "'"

    ' Als Kopie öffnen, damit die Quell-CDR garantiert unverändert bleibt
    Dim doc As document
    Set doc = Application.OpenDocumentAsCopy(cdrPath)

    CreateDoorbellPDFExport_ProcessDocument doc, cdrPath, logger

    ' Speicher freigeben: Die Undo-Liste hält sonst die schweren Bildimporte/Platzierungen jeder
    ' CDR im Speicher. Ohne Leeren staut sich das über die Läufe auf, bis PlaceFile ab ~CDR 20
    ' nichts mehr platziert (ein Neustart des Macros behob das, weil dabei alles freigegeben wird).
    On Error Resume Next
    doc.ClearUndoList
    doc.Dirty = False
    On Error GoTo 0

    doc.Close

    run.saveSuccessfullCDRRun cdrPath

    logger.removeTab
End Function


Public Sub Test_CreateDoorbellPDFExport_ProcessDocument()
    Globals.warnIfNoDocumentAndEnd
    CreateDoorbellPDFExport_ProcessDocument ActiveDocument, ActiveDocument.FullFileName, Globals.getLogger(True)
End Sub


Private Function CreateDoorbellPDFExport_ProcessDocument(doc As document, cdrPath As String, logger As logger)
    logger.addTab , "[Macros.CreateDoorbellPDFExport_ProcessDocument]"

    ' Nur das Wunschtextdesign (Design ohne Designnummer = MainDesign) verarbeiten
    Dim designs As ProductDesignRange
    Set designs = Globals.getAllDesignsAsRange(onlyValidDesigns:=True, ignoreMainDesigns:=False, logger:=logger)

    Dim processedCount As Integer
    processedCount = 0

    Dim i As Integer
    For i = 1 To designs.count
        Dim design As productDesign
        Set design = designs.getDesign(i)

        If design.isMainDesign Then
            CreateDoorbellPDFExport_ProcessDesign design, cdrPath, logger
            processedCount = processedCount + 1
        End If

        Set design = Nothing
    Next i

    If processedCount = 0 Then
        logger.logWARN "Kein Wunschtextdesign (MainDesign) in der CDR gefunden: '" & cdrPath & "'"
    End If

    logger.removeTab
End Function


Private Function CreateDoorbellPDFExport_ProcessDesign(design As productDesign, cdrPath As String, logger As logger)
    logger.addTab , "[Macros.CreateDoorbellPDFExport_ProcessDesign] design productID: '" & design.getProductID & "'"

    ' 1. Shape-Namen korrigieren, damit PlaceFile die Formen (blaue Platzhalter) erkennt
    logger.logINFO "Shape-Namen korrigieren (RenameDoorBellCut)"
    RenameDoorBellCut_ProcessDesign design, logger

    ' Modellname (aus der Hilfslinien-Form) und Größe (aus Artikelnummer/Dateiname) VOR dem
    ' Entfernen der Texte ermitteln - danach ist die Artikelnummer weg und der Name wäre nicht
    ' mehr ermittelbar
    Dim modelName As String
    modelName = CreateDoorbellPDFExport_getModelName(design, logger)

    Dim size As String
    size = CreateDoorbellPDFExport_getSize(design, cdrPath, logger)

    ' 2. Funkklingel-Modell platzieren.
    ' quietMode = True (kein Dialog/keine Auswahl-Wiederherstellung im Batch),
    ' errorWhenNothingPlacedVar = True (warnt, wenn nichts platziert werden konnte)
    logger.logINFO "Funkklingel-Modell platzieren (jobFunkklingelModelle)"
    PlaceFile.initIfNeeded
    PlaceFile.setSelectedPlaceTypeJob PlaceFile.jobFunkklingelModelle
    PlaceFile.startFunction design.getDesignShape, Classfactory.newPlaceFileParameters.setQuiet.setErrorWhenNothingPlaced

    ' 3. ALLE Texte aus dem Design entfernen (auch Artikelnummer und "Wunschtext")
    logger.logINFO "Alle Texte aus dem Design entfernen"
    design.newCustomShapeTypeQuery(TextAny).search.delete

    ' 4. Hauptform jedes Designs blau (#0000FF) färben
    logger.logINFO "Hauptformen blau färben"
    CreateDoorbellPDFExport_colorMainShapesBlue design, logger

    ' 5. Design (inkl. platziertem Modell) als PDF nach Desktop\CreateDoorbellPDFExport\ exportieren.
    ' Dateiname = "Modellname Größe.pdf"
    Dim pdfPath As String
    pdfPath = CreateDoorbellPDFExport_getPDFPath(cdrPath, modelName, size)

    logger.logINFO "Exportiere PDF: '" & pdfPath & "'"
    CreateDoorbellPDFExport_ExportDesignAsPDF design, pdfPath
    logger.logINFO "Exportiert"

    logger.logINFO "- Fertig"
    logger.removeTab
End Function


' Färbt die Kontur des größten SubPaths der Hauptform (ProductDesignLayer.getMainShape) jedes Layers blau (#0000FF).
' Die Hauptform darf nicht gefüllt sein, daher wird die Kontur gefärbt (nicht die Füllung).
Private Function CreateDoorbellPDFExport_colorMainShapesBlue(design As productDesign, logger As logger)
    Dim i As Integer
    For i = 1 To design.getLayerCount
        Dim mainShape As shape
        Set mainShape = design.getLayer2(i).getMainShape

        If mainShape Is Nothing Then
            logger.logWARN "Hauptform von Layer #" & i & " nicht gefunden - nicht blau gefärbt"
        Else
            ' Nur der größte SubPath wird blau. Hat die Hauptform mehrere SubPaths, werden diese zu
            ' eigenen Formen (alte Form wird entfernt)
            Dim blueShape As shape
            If mainShape.Type = cdrCurveShape And mainShape.curve.subPaths.count > 1 Then
                Dim subPathShapes As shapeRange
                Set subPathShapes = Globals.BreakApartShapeSubPaths(mainShape)

                Dim s As Integer
                For s = 1 To subPathShapes.count
                    ' Direkt vor die alte Form setzen -> landet in derselben Quellgruppe/Ebene
                    subPathShapes(s).OrderFrontOf mainShape
                Next s

                mainShape.delete
                Set blueShape = Globals.getBiggestShape(subPathShapes)
            Else
                Set blueShape = mainShape
            End If

            If blueShape.outline.Type = cdrNoOutline Then blueShape.outline.width = 0.001 ' sichtbare Haarlinie (Zoll), sonst wäre die Farbe unsichtbar
            blueShape.outline.color.RGBAssign 0, 0, 255
        End If

        Set mainShape = Nothing
    Next i
End Function


' Ermittelt den Modellnamen aus der Hilfslinien-Form (GuideLineShapeType) im Design.
' Auf dieser Form platziert PlaceFile das Modell; ihr Name ist nach RenameDoorBellCut der
' vollständige Modellname inkl. Modellnummer (z. B. "Aosu Pro V8P1AX11").
' Die zusätzliche Hilfslinie "Funkklingeln" wird dabei ausgeschlossen.
Private Function CreateDoorbellPDFExport_getModelName(design As productDesign, logger As logger) As String
    Dim guideShapes As shapeRange
    Set guideShapes = design.newCustomShapeTypeQuery(GuideLineShapeType).search

    Dim funkShape As shape
    Set funkShape = guideShapes.shapes.FindShape("Funkklingeln")
    If Not funkShape Is Nothing Then guideShapes.RemoveRange Globals.shapeToShapeRange(funkShape)

    If guideShapes.count = 0 Then
        logger.logWARN "Keine Hilfslinien-Form (GuideLineShapeType) mit Modellnamen im Design gefunden"
        Exit Function ' leerer String
    End If

    CreateDoorbellPDFExport_getModelName = Trim(guideShapes.firstShape.name)
End Function


' Ermittelt die Größe (z. B. "30x20"): zuerst aus der Artikelnummer, sonst aus dem Dateinamen.
Private Function CreateDoorbellPDFExport_getSize(design As productDesign, cdrPath As String, logger As logger) As String
    Dim size As String

    ' 1. Aus der Artikelnummer (ProductID), Normalgröße ohne Klammer-Maß
    On Error Resume Next
    size = design.getProductIDObject.getSize(1)
    On Error GoTo 0

    ' 2. Fallback: aus dem Dateinamen (z. B. "...-16x28_Designs.cdr" -> "16x28")
    If Trim(size) = "" Then
        size = CreateDoorbellPDFExport_getSizeFromFileName(cdrPath)
        If size = "" Then logger.logWARN "Größe konnte weder aus der Artikelnummer noch aus dem Dateinamen ('" & cdrPath & "') ermittelt werden"
    End If

    CreateDoorbellPDFExport_getSize = Trim(size)
End Function


' Sucht im Dateinamen ein Maß im Format "ZahlxZahl" (z. B. "16x28").
Private Function CreateDoorbellPDFExport_getSizeFromFileName(cdrPath As String) As String
    Dim regex As New RegExp
    regex.Pattern = "\d+x\d+"
    regex.ignoreCase = True

    Dim matches As Object
    Set matches = regex.Execute(Globals.getFileName(cdrPath))

    If matches.count > 0 Then CreateDoorbellPDFExport_getSizeFromFileName = matches(0).value
End Function


' Ausgabeordner für alle PDFs: Desktop\CreateDoorbellPDFExport\
Private Function CreateDoorbellPDFExport_getOutputFolder() As String
    CreateDoorbellPDFExport_getOutputFolder = Globals.getDesktopPath & "CreateDoorbellPDFExport\"
End Function


' Baut den PDF-Pfad: Ordner = Desktop\CreateDoorbellPDFExport\, Dateiname = "Modellname Größe.pdf".
' Fehlt Modellname oder Größe, wird auf den vorhandenen Teil bzw. den CDR-Dateinamen zurückgefallen.
' Existiert der Dateiname schon, wird die PDF überschrieben (nicht nummeriert).
Private Function CreateDoorbellPDFExport_getPDFPath(cdrPath As String, modelName As String, size As String) As String
    Dim fileName As String
    fileName = Trim(Trim(modelName) & " " & Trim(size))

    If fileName = "" Then fileName = Globals.getFileName(cdrPath)

    Dim outputFolder As String
    outputFolder = CreateDoorbellPDFExport_getOutputFolder
    Globals.createFolder outputFolder

    CreateDoorbellPDFExport_getPDFPath = outputFolder & sanitizeFileName(fileName) & ".pdf"
End Function


' Exportiert die Design-Form (inkl. platziertem Modell) als PDF - direkt per Selektion aus dem
' aktuellen Dokument (kein Zwischen-Dokument). Formnamen/Ebenennamen kann Corel ohnehin nicht in
' die PDF schreiben, daher wäre der CreateDocumentFrom-Umweg nur unnötige Speicherlast pro CDR.
' PDF-Einstellungen aufgezeichnet (analog GravostyleBridge.exportShapeRangeToPDF).
Private Function CreateDoorbellPDFExport_ExportDesignAsPDF(design As productDesign, pdfPath As String)

    Globals.createFolder Globals.getFolderFileAndType(pdfPath)(0)

    Globals.shapeToShapeRange(design.getDesignShape).CreateSelection

    With ActiveDocument.PDFSettings
        .PublishRange = pdfSelection
        .PageRange = "1"
        .Author = "Gravuru CorelDRAW Automation"
        .Subject = ""
        .Keywords = ""
        .BitmapCompression = 0 ' CdrPDFVBA.pdfNone
        .JPEGQualityFactor = 2
        .TextAsCurves = True
        .EmbedFonts = True
        .EmbedBaseFonts = True
        .TrueTypeToType1 = True
        .SubsetFonts = True
        .SubsetPct = 80
        .CompressText = True
        .Encoding = 1 ' CdrPDFVBA.pdfBinary
        .DownsampleColor = False
        .DownsampleGray = False
        .DownsampleMono = False
        .ColorResolution = 400
        .MonoResolution = 600
        .GrayResolution = 400
        .Hyperlinks = True
        .Bookmarks = False
        .Thumbnails = False
        .Startup = 0 ' CdrPDFVBA.pdfPageOnly
        .ComplexFillsAsBitmaps = False
        .Overprints = True
        .Halftones = False
        .MaintainOPILinks = False
        .FountainSteps = 256
        .EPSAs = 0 ' CdrPDFVBA.pdfPostscript
        .pdfVersion = 0 ' CdrPDFVBA.pdfVersion12
        .IncludeBleed = False
        .Bleed = 31750
        .Linearize = False
        .CropMarks = False
        .RegistrationMarks = False
        .DensitometerScales = False
        .FileInformation = False
        .ColorMode = 3 ' CdrPDFVBA.pdfNative
        .ColorProfile = 1 ' CdrPDFVBA.pdfSeparationProfile
        .EmbedFilename = ""
        .EmbedFile = False
        .JP2QualityFactor = 2
        .TextExportMode = 0 ' CdrPDFVBA.pdfTextAsUnicode
        .PrintPermissions = 0 ' CdrPDFVBA.pdfPrintPermissionNone
        .EditPermissions = 0 ' CdrPDFVBA.pdfEditPermissionNone
        .ContentCopyingAllowed = False
        .OpenPassword = ""
        .PermissionPassword = ""
        .EncryptType = 2 ' CdrPDFVBA.pdfEncryptTypeAES
        .OutputSpotColorsAs = 0 ' CdrPDFVBA.pdfSpotAsSpot
        .overPrintBlackLimit = 95
        .ProtectedTextAsCurves = True
    End With

    ActiveDocument.PublishToPDF pdfPath

End Function



Private Function DoorbellToStainlessSteel_GetSourceFolder() As String
    DoorbellToStainlessSteel_GetSourceFolder = "V:\Produkte\Türklingel\Funkklingeln\Acryl + Edelstahl\Montage-Löcher\Eckig\"
End Function


' Macht aus den Funkklingel-CDRs (Acryl + Edelstahl) reine Edelstahl-CDRs:
' - 2. Layer der Designs löschen
' - Grundplatte des 1. Layers durch Edelstahl ersetzen
' - Unter "Desktop\Funkklingeln Edelstahl Output" mit gleicher Ordnerstruktur speichern
Public Sub DoorbellToStainlessSteel()

    Dim cdrFolder As String
    cdrFolder = CorelScriptTools.GetFolder(DoorbellToStainlessSteel_GetSourceFolder, "Wähle den Ordner mit den Design-CDRs")
    If cdrFolder = "" Then Exit Sub
    cdrFolder = Globals.addBackslash(cdrFolder)

    Dim logger As logger: Set logger = Globals.getLogger(True)
    logger.addTab , "[Macros.DoorbellToStainlessSteel]"

    ' True = nur Design-CDRs (rekursiv aus allen Unterordnern)
    Dim run As New CDRRun
    run.init cdrFolder, "DoorbellToStainlessSteel", True

    ' Größen-Varianten mit Klammer-Maß (z. B. "16x28 (14x26)") überspringen - nur Basisgrößen ("16x28")
    CreateDoorbellPDFExport_removeVariantPaths run.getPaths, logger

    DoorbellToStainlessSteel_ProcessCDRs run.getPaths, run, logger

    logger.removeTab

End Sub


Private Function DoorbellToStainlessSteel_ProcessCDRs(paths As ArrayList, run As CDRRun, logger As logger)
    logger.addTab , "[Macros.DoorbellToStainlessSteel_ProcessCDRs]"

    With ProgressBarUserForm.newSubProgress(paths.count)

        Dim i As Integer
        For i = 1 To paths.count
            .setDisplayText "CDR " & Globals.getFileName(paths.item(i))

            DoorbellToStainlessSteel_ProcessCDR paths.item(i), run, logger

            .setStepsProgress i
        Next i

        .finishProgress
    End With

    logger.removeTab
End Function


Private Function DoorbellToStainlessSteel_ProcessCDR(cdrPath As String, run As CDRRun, logger As logger)
    logger.addTab , "[Macros.DoorbellToStainlessSteel_ProcessCDR] cdrPath: '" & cdrPath & "'"

    Dim outputPath As String
    outputPath = DoorbellToStainlessSteel_GetOutputPath(cdrPath, logger)
    If outputPath = "" Then GoTo ExitFunction

    ' Als Kopie öffnen, damit die Quell-CDR garantiert unverändert bleibt
    Dim doc As document
    Set doc = Application.OpenDocumentAsCopy(cdrPath)

    DoorbellToStainlessSteel_ProcessDocument doc, logger

    DoorbellToStainlessSteel_SaveDocument doc, outputPath, logger

    ' Speicher freigeben (siehe CreateDoorbellPDFExport_ProcessCDR)
    On Error Resume Next
    doc.ClearUndoList
    doc.Dirty = False
    On Error GoTo 0

    doc.Close

    run.saveSuccessfullCDRRun cdrPath

ExitFunction:
    logger.removeTab
End Function


' Gibt den Speicherpfad im Output-Ordner auf dem Desktop zurück.
' Leer, wenn die CDR nicht unter dem Quellordner liegt (sonst würde das Original überschrieben)
Private Function DoorbellToStainlessSteel_GetOutputPath(cdrPath As String, logger As logger) As String
    Dim outputPath As String
    outputPath = replace(cdrPath, DoorbellToStainlessSteel_GetSourceFolder, _
        Globals.getDesktopPath & "Funkklingeln Edelstahl Output\", , , vbTextCompare)

    If outputPath = cdrPath Then
        logger.logFATAL "CDR liegt nicht unter '" & DoorbellToStainlessSteel_GetSourceFolder & "' und wird übersprungen, damit das Original nicht überschrieben wird. cdrPath: '" & cdrPath & "'"
        Exit Function
    End If

    DoorbellToStainlessSteel_GetOutputPath = outputPath
End Function


Private Function DoorbellToStainlessSteel_SaveDocument(doc As document, outputPath As String, logger As logger)
    Globals.createFolder Globals.getParentPath(outputPath)
    doc.SaveAs outputPath
    logger.logINFO "Gespeichert: '" & outputPath & "'"
End Function


' Verarbeitet die offene CDR und speichert das Ergebnis im Output-Ordner auf dem Desktop.
' Das offene Dokument zeigt danach auf die gespeicherte Datei, die Quell-CDR bleibt unverändert
Public Sub Test_DoorbellToStainlessSteel_ProcessDocument()
    Globals.warnIfNoDocumentAndEnd

    Dim logger As logger: Set logger = Globals.getLogger(True)

    Dim outputPath As String
    outputPath = DoorbellToStainlessSteel_GetOutputPath(ActiveDocument.FullFileName, logger)
    If outputPath = "" Then
        MsgBox "Die CDR liegt nicht unter '" & DoorbellToStainlessSteel_GetSourceFolder & "'. Abbruch, damit das Original nicht überschrieben wird.", vbExclamation
        Exit Sub
    End If

    Dim doc As document
    Set doc = ActiveDocument

    DoorbellToStainlessSteel_ProcessDocument doc, logger

    DoorbellToStainlessSteel_SaveDocument doc, outputPath, logger
End Sub


Private Function DoorbellToStainlessSteel_ProcessDocument(doc As document, logger As logger)
    logger.addTab , "[Macros.DoorbellToStainlessSteel_ProcessDocument]"

    Dim designs As ProductDesignRange
    Set designs = Globals.getAllDesignsAsRange(onlyValidDesigns:=True, ignoreMainDesigns:=False, logger:=logger)

    Dim i As Integer
    For i = 1 To designs.count
        DoorbellToStainlessSteel_ProcessDesign designs.getDesign(i), logger
    Next i

    ' Edelstahl auf den (jetzt einzigen) 1. Layer aller Designs platzieren
    PlaceFile.setSelectedPlaceTypeJob PlaceFile.jobEdelstahl
    PlaceFile.startFunction Globals.getAllShapes, Classfactory.newPlaceFileParameters.setParts(AllParts, layer1).setQuiet

    ' Produkt-ID von Acryl auf Edelstahl ändern (wie DesignZuEdelstahl)
    ' Designs neu holen, da PlaceFile die Grundplatten ausgetauscht hat
    Set designs = Globals.getAllDesignsAsRange(ignoreMasterDesign:=False, ignoreRedDesignsToIgnore:=False, ignoreProductImageVariantDesigns:=False, logger:=logger)
    productID.startFunction_ProcessDesigns designs, "", False, "", "", "-A-", "-V2A-", logger

    ' Autokorrektur, damit Texte & Designelemente die passende Farbe für die neue Edelstahl-Grundplatte bekommen.
    ' Auswahl aufheben, da die Autokorrektur sonst nur die markierten Formen verarbeitet
    doc.ClearSelection
    AutoCorrection.startFunction True

    logger.removeTab
End Function


Private Function DoorbellToStainlessSteel_ProcessDesign(design As productDesign, logger As logger)
    logger.addTab , "[Macros.DoorbellToStainlessSteel_ProcessDesign] Design: " & design.getDesignNumber

    ' 2. Layer (Edelstahl-Rahmen) löschen
    If design.getLayerCount >= 2 Then
        design.deleteLayerByIndex 2
    Else
        logger.logWARN "Design hat keinen 2. Layer"
    End If

    ' Grundplatte vom 1. Layer löschen
    Dim groundPlate As shape
    Set groundPlate = design.getLayer2(1).getGroundPlate

    If groundPlate Is Nothing Then
        logger.logWARN "Design hat auf dem 1. Layer keine Grundplatte"
    Else
        groundPlate.delete
        design.getLayer2(1).invalidateGroundPlate
    End If

    design.invalidateDesign

    logger.removeTab
End Function



Private Function DoorbellBohrloecher4x5mm_GetSourceFolder() As String
    DoorbellBohrloecher4x5mm_GetSourceFolder = "V:\Produkte\Türklingel\Funkklingeln\Acryl + Edelstahl\Montage-Löcher\Eckig\"
End Function


' Achtung: Ändert die angegebenen CDRs ab und speichert nicht in einem extra Ordner
' Führt in allen Design-CDRs die Autokorrektur aus, platziert danach den Job "Variante Befestigung Bohrlöcher 4x 5mm"
' auf allen Designs und speichert die CDR
Public Sub DoorbellBohrloecher4x5mm()

    Dim cdrFolder As String
    cdrFolder = CorelScriptTools.GetFolder(DoorbellBohrloecher4x5mm_GetSourceFolder, "Wähle den Ordner mit den Design-CDRs")
    If cdrFolder = "" Then Exit Sub
    cdrFolder = Globals.addBackslash(cdrFolder)

    Dim logger As logger: Set logger = Globals.getLogger(True)
    logger.addTab , "[Macros.DoorbellBohrloecher4x5mm]"

    ' True = nur Design-CDRs (rekursiv aus allen Unterordnern)
    Dim run As New CDRRun
    run.init cdrFolder, "DoorbellBohrloecher4x5mm", True

    DoorbellBohrloecher4x5mm_ProcessCDRs run.getPaths, run, logger

    logger.removeTab

End Sub


Private Function DoorbellBohrloecher4x5mm_ProcessCDRs(paths As ArrayList, run As CDRRun, logger As logger)
    logger.addTab , "[Macros.DoorbellBohrloecher4x5mm_ProcessCDRs]"

    With ProgressBarUserForm.newSubProgress(paths.count)

        Dim i As Integer
        For i = 1 To paths.count
            .setDisplayText "CDR " & Globals.getFileName(paths.item(i))

            DoorbellBohrloecher4x5mm_ProcessCDR paths.item(i), run, logger

            .setStepsProgress i
        Next i

        .finishProgress
    End With

    logger.removeTab
End Function


Private Function DoorbellBohrloecher4x5mm_ProcessCDR(cdrPath As String, run As CDRRun, logger As logger)
    logger.addTab , "[Macros.DoorbellBohrloecher4x5mm_ProcessCDR] cdrPath: '" & cdrPath & "'"

    Dim doc As document
    Set doc = Application.OpenDocument(cdrPath)

    DoorbellBohrloecher4x5mm_ProcessDocument doc, logger

    doc.Save
    logger.logINFO "Gespeichert: '" & cdrPath & "'"

    ' Speicher freigeben (siehe CreateDoorbellPDFExport_ProcessCDR)
    On Error Resume Next
    doc.ClearUndoList
    doc.Dirty = False
    On Error GoTo 0

    doc.Close

    run.saveSuccessfullCDRRun cdrPath

    logger.removeTab
End Function


' Verarbeitet die offene CDR und speichert sie
Public Sub Test_DoorbellBohrloecher4x5mm_ProcessDocument()
    Globals.warnIfNoDocumentAndEnd

    Dim doc As document
    Set doc = ActiveDocument

    DoorbellBohrloecher4x5mm_ProcessDocument doc, Globals.getLogger(True)

    doc.Save
End Sub


Private Function DoorbellBohrloecher4x5mm_ProcessDocument(doc As document, logger As logger)
    logger.addTab , "[Macros.DoorbellBohrloecher4x5mm_ProcessDocument]"

    ' Autokorrektur. Auswahl aufheben, da die Autokorrektur sonst nur die markierten Formen verarbeitet
    doc.ClearSelection
    AutoCorrection.startFunction True

    ' Designs nach der Autokorrektur holen, da diese Formen ändern kann
    Dim designs As ProductDesignRange
    Set designs = Globals.getAllDesignsAsRange(onlyValidDesigns:=True, ignoreMainDesigns:=False, logger:=logger)

    PlaceFile.setSelectedPlaceTypeJob PlaceFile.jobVarianteBefestigungBohrlöcher4x5mm
    PlaceFile.startFunction designs.getDesignShapes, Classfactory.newPlaceFileParameters.setParts(Part1, layer1).setMainShapeAddMode(AddNewMainShapesToExisting).setErrorWhenNothingPlaced

    logger.removeTab
End Function
