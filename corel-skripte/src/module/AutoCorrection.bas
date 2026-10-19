Attribute VB_Name = "AutoCorrection"

' Autor:  Martin Afelt GRAVURU
'
' TODO:
' - Wenn 2 gleiche Grundplatten vorhanden sind, eine davon löschen
' - Nichtgeschlossene rote/pinke Formen schließen
' - Zusammengefügte Hauptformen (z.B: Rechteck mit Bohrlöchern) wieder trennen
' - Uploadboxen prüfen: Prüfen ob das Foto und das "Dein Foto" Overlay da sind
' - Grundplatten dürfen nicht in Designvarianten vorkommen
'
' Angefangen:
' - Warnen wenn eingebettete Schriften Probleme machen



Dim dummyText As shape

Dim warnUndoneUnproportionalScaledText As Boolean

Dim checkGroundPlate As Boolean

Dim logger As New logger


Dim renameJobs As collection


Public Sub CorrectDesigns()
    Globals.showWarnings
    
    If Globals.isCTRLPressed() Then
        AutoCorrectionDialog.Show vbModal
        Exit Sub ' Dialog startet das Skript selbst. Deshalb hier beenden
    End If
    
    checkGroundPlate = AutoCorrectionDialog.CheckGroundPlateCheckBox.value
    
    Start
End Sub



Public Function Start(Optional quietMode As Boolean = False, Optional doCheckCDR As Boolean = False)
    
    
    If Not quiteMode Then
        Globals.startMacro
        
        If Not Globals.debugHistory Then
            CorelScriptTools.BeginWaitCursor
            ActiveDocument.BeginCommandGroup "AutoCorrection"
            If Not Globals.debugErrors Then On Error GoTo MacroError
        End If
    End If
    
    
    Globals.storeSelection
    
    
    
    startFunction quietMode, doCheckCDR

    
    

    Globals.restoreSelection
    
    If warnUndoneUnproportionalScaledText Then
        MsgBox "Es wurden 1 oder mehrere Texte wieder proportional gemacht (entzerrt). Diese Texte könnten jetzt anders aussehen. Bitte kontrolliere noch einmal jedes Design", vbExclamation
    End If
    
    If Not Globals.debugHistory Then Globals.endMacro True
    
    Exit Function
MacroError:     'Alle Fehler hier abfangen und die CommandGruppe beenden, damit man mit einem Schritt zurück gehen kann (STRG + Z)
    MsgBox Err.Description & ", Fehlercode: " & Err.number, vbCritical
    cleanUp
    ProgressBarUserForm.Hide
    Globals.endMacro True
End Function



Public Function startFunction(Optional quietMode As Boolean = False, Optional doCheckCDR As Boolean = False)
    warnUndoneUnproportionalScaledText = False
    
    logger.init "AutoCorrection"
    
    
    If Not ActiveDocument Is Nothing Then
        ActiveDocument.unit = cdrMillimeter
        ActiveDocument.Rulers.HUnits = cdrMillimeter
        ActiveDocument.Rulers.VUnits = cdrMillimeter
    End If
    
    
    If renameJobs Is Nothing Then
        Set renameJobs = New collection
        
        addRenameJob "var_frame", "var_rahmen", CurveAny
    End If
    
    
    ' Temporäre Formen löschen. Diese enden immer mit _tmp und können von allen möglichen Skripten erstellt worden sein. Sind aber auch nur noch da, wenn ein Skript fehlschlägt.
    ' Vorher löschen, da sie stören könnten
    Globals.removeTemporaryShapesFromActiveDocument
    
    
    
    Dim selection As shapeRange
    Set selection = Globals.getSelectedShapesOrAll
    
    
    Set dummyText = ActiveLayer.CreateArtisticText(0, 0, "DummyText")
    dummyText.name = "AutoCorrection_DummyText_tmp"
    
    
    With ProgressBarUserForm.newSubProgress(selection.count)
    
        ' Auswahl durchlaufen
        For i = 1 To selection.count
            processShape selection(i)
            .setStepsProgress i
        Next i
        
        .finishProgress
    End With
    
    
    
    cleanUp
    
    If doCheckCDR Then checkCDR
    
End Function



Private Function addRenameJob(find As String, replace As String, shapeType As customShapeType, Optional argument1, Optional argument2)
    Dim job As New RenameJob
    job.find = find
    job.replace = replace
    job.addShapeType shapeType, argument1, argument2
    
    renameJobs.add job
End Function


Private Function cleanUp()
    If Not dummyText Is Nothing Then dummyText.delete
    Set dummyText = Nothing
    
    Globals.removeTemporaryShapesFromActiveDocument
End Function



Public Sub TestCheckCDR()
    
    Dim cdrFilePath As String
    
    cdrFilePath = Globals.getDesktopPath & "Styles Bug.cdr"
'    cdrFilePath = Globals.getDesktopPath & "Form.cdr"
    
    If checkCDR(cdrFilePath) Then
        MsgBox "Die Datei enthält fehlerhafte Styles!"
    Else
        MsgBox "Die Datei ist sauber"
    End If
    
End Sub


Private Function checkCDR()
    
    If ActiveDocument.FullFileName = "" Then
        MsgBox "Bitte speichere die Datei mindestens einmal ab, damit auch die Datei an sich auf Fehler geprüft werden kann", vbInformation
    Else
        If Globals.isCDRhavingStyles(ActiveDocument.FullFileName) Then
            Dim answer As VbMsgBoxResult
            answer = MsgBox("Die CDR-Datei hat Fehler und muss repariert werden." & vbNewLine & "Soll die Datei gespeichert und repariert werden?" & vbNewLine & "(Es wird ein Backup auf dem Desktop angefertigt)", vbYesNo Or vbQuestion)
            
            If answer = vbYes Then
                Dim cdrPath As String
                cdrPath = ActiveDocument.FullFileName
            
                DoEvents
                Application.refresh
                
                ActiveDocument.Save
                ActiveDocument.Close
                
                Tool.repairSlowAndBigCDRProcessCDR cdrPath
                
                Application.OpenDocument cdrPath
                
                Globals.endMacro
            End If
        End If
    End If
    
End Function



' Diese methode verarbeitet nur die Shapes im Dokument.
' Bei Gruppen wird ein Produktdesign draus gemacht und mit einer anderen Methode weiterverarbeitet
' ACHTUNG: Wird nicht rekursiv aufgerufen.
' Returnt ob das Shape gelöscht wurde
Private Function processShape(shape As shape) As Boolean
    
    shape.locked = False
    
    ' Nicht nur in den Designs suchen, sondern auch außerhalb
    If searchSvgDataAndDelete(shape) Then ' Wenn das Shape gelöscht wurde
        processShape = True
        Exit Function
    End If
    
    
    
    
    If shape.Type = cdrGroupShape Then
    
        
        ' Falsche rote/pinke Farben korrigieren
        correctWrongRedOrPinkColor shape
        
        ' Gefüllte rote/pinke Formen aufteilen
        correctFilledRedOrPinkShape shape
        
        ' Wenn nach der Korrektur immer noch keine rote/pinken Formen zu finden sind
        If newCustomShapeTypeQuery(shape.shapes.All, RedOrPinkShape).search.count = 0 Then
            shape.CreateSelection
            Globals.setViewAreaToShape shape
            
            If Globals.isUploadBox(shape) Then
                MsgBox "Diese Uploadbox ist nicht in der Gruppe ihres Designs. Bitte korrigieren!", vbCritical, "Autokorrektur"
            Else
                MsgBox "Es wurde keine Hauptform in rot oder pink erkannt. Bitte korrigieren!", vbCritical, "Autokorrektur"
            End If
            
            
            cleanUp
            Globals.endMacro
        End If
        
        
        
        Dim currentProductDesign As productDesign
        Set currentProductDesign = New productDesign
        currentProductDesign.newProductDesign shape
        
        If Not currentProductDesign.isRedDesignToIgnore Then
        
            'correctGroupedRedOrPinkShapes currentProductDesign
            
            For i = 1 To currentProductDesign.getLayers.count
                correctGroupedRedOrPinkShapes currentProductDesign.getLayers.getLayer(i).layerShape, currentProductDesign.getLayers.getLayer(i).layerShape
            Next i
            
    '        correctGravingHavingColoredShapes currentProductDesign
    
            If currentProductDesign.isValidProductDesign Then
                'Masterdesign überspringen
                If currentProductDesign.isMasterDesign Then Exit Function
                
                processDesign currentProductDesign
    
                findProblems shape
            End If
            
        End If
    Else
        
        ' Wenn eine rote/pinke Form nicht gruppiert ist
        If Globals.isRedOrPinkShape(shape) Then
            shape.CreateSelection
            Globals.setViewAreaToShape shape
            MsgBox "Diese rote oder pinke Form ist nicht gruppiert!", vbCritical
            
            cleanUp
            Globals.endMacro
        End If
        
    End If
End Function




Private Function processDesign(productDesign As productDesign)
    
    ' TODO parts sortieren, nicht Layer: (unten falsch)
    ' TODO. Soll entweder nur optional sein, oder unterscheiden zwischen
'    productDesign.sortLayers
    

    ' Designs mit nur einer Schicht müssen die Schicht nicht nochmal gruppiert haben. Erst ab 2 Schichten hat jede Schicht ihre eigene Gruppe
    ' Die Schicht-Gruppe wird nur aufgelöst, wenn sie innerhalb der Designgruppe liegt
    ' ---------------------------------------------------------
    If productDesign.isDesignHavingGroupedLayers And Not productDesign.doesDesignShouldHaveGroupedLayers Then
        logger.logINFO "Design hat nur eine Schicht, aber eine eigene Schicht-Gruppe. Gruppe wird aufgelöst"
        productDesign.manageLayerGrouping
        productDesign.invalidateLayers
    End If
    ' ---------------------------------------------------------

    Dim index As Integer: index = 0

    For i = 1 To productDesign.getPartsCount
        For j = 1 To productDesign.getPart(i).count
            processLayer productDesign.getPart(i).item(j), index
            index = index + 1
        Next j
    Next i
    
    productDesign.sortParts
    
    productDesign.setTransparencyOfTransparentGroundplates True
    
    productDesign.invalidateLayers
    
    
    
    ' rote/pinke Form & Grundplatten ZIndex korrigieren
    Dim currentLayer As ProductDesignLayer
    For i = 1 To productDesign.getLayers.count
        Set currentLayer = productDesign.getLayers.getLayer(i)
        
        ' Z-Index von roten/pinken Formen & Grundplatte korrigieren
        currentLayer.correctRedPinkAndGroundplateShapesZIndex
        
        
        
        ' ZIndex von Formen mit RDG-Weiß korrigieren
        ' -----------------------------------------------------
        Dim rgdWhiteShapes As shapeRange
        Set rgdWhiteShapes = newCustomShapeTypeQuery(currentLayer.layerShape, RGD_WhiteShape).search
        
        If Not rgdWhiteShapes.count = 0 Then
            
            
            Dim groundPlateTransparent As Boolean
            If currentLayer.getGroundPlate Is Nothing Then
                groundPlateTransparent = False
            Else
                groundPlateTransparent = Globals.isGroundPlateTransparent(currentLayer.getGroundPlate)
            End If
            
            If groundPlateTransparent Then
                ' Bei einer transparenten Grundplatte RDG_White vor die Grundplatte sortieren
                rgdWhiteShapes.OrderFrontOf currentLayer.getGroundPlate
            Else
                ' Bei einer deckenden Grundplatte RDG_White ganz nach hinten sortieren
                rgdWhiteShapes.OrderBackOf currentLayer.layerShape.shapes.Last
            End If
            
        End If
        ' -----------------------------------------------------
        
        
        Set currentLayer = Nothing
    Next i
    
    
    ' Artikelnummer
    ' -----------------------------------------------------
    If Not productDesign.getProductIDShape Is Nothing Then
        productDesign.getProductIDShape.orderToFront
    End If
    ' -----------------------------------------------------
    
    
    ' Metadata Formen (Artikelnummer usw.)
    ' ---------------------------------
    productDesign.positionMetadataShapes
    ' ---------------------------------
    
    
    ' Umbenennen
    ' ---------------------------------------
    For i = 1 To renameJobs.count
        Dim job As RenameJob
        Set job = renameJobs(i)
        
        job.renameDesignShapes productDesign
        
        Set job = Nothing
    Next i
    ' ---------------------------------------
    
End Function





Private Function processLayer(layer As ProductDesignLayer, index As Integer)
    
    logger.logINFO "[AutoCorrection.processLayer]"
    logger.addTab
    
'    MsgBox "Process Layer"
    ' warnIfGroundPlateMissing layer
    
    If layer.isEmptyVariant Then
        Exit Function
    End If
    
    
    
    If checkGroundPlate And layer.getGroundPlate Is Nothing Then
        Globals.setViewAreaToShape layer.layerShape
        layer.layerShape.CreateSelection
        MsgBox "Keine Grundplatte vorhanden", vbCritical, "Autokorrektur"
        cleanUp
        Globals.endMacro
'        End
    End If
    
    
    ' Parts/Schichten nicht passend gruppiert
    ' Wenn eine Schicht rote/pinke Formen hat, die außerhalb der Hauptform liegen,
    ' dann gehören diese Formen in eine eigene Schicht
    ' ----------------------------------------------------------------
    For i = 1 To layer.getSmalerRedOrPinkShapes.count
        If Not Globals.areRectanglesInside(layer.getSmalerRedOrPinkShapes(i).boundingBox, layer.getMainShape.boundingBox, True) Then
            layer.getSmalerRedOrPinkShapes(i).CreateSelection
            Globals.setViewAreaToShape layer.getSmalerRedOrPinkShapes(i)
            
            MsgBox "Die Form scheint eine eigene Schicht zu sein, hat aber keine eigene Gruppe!", vbCritical, "Autokorrektur"
            cleanUp
            Globals.endMacro
        End If
    Next i
    ' ----------------------------------------------------------------
    
    
    ' Doppelte rote/pinke Formen löschen
    ' ---------------------------------
    For i = layer.getSmalerRedOrPinkShapes.count To 1 Step -1
        Dim currentShape As shape
        Set currentShape = layer.getSmalerRedOrPinkShapes(i)
        
'        MsgBox "For i(" & i & ")"
        
        
        If Globals.ensureShapeHasCurve(currentShape) And Globals.ensureShapeHasCurve(layer.getMainShape) Then
'            MsgBox "Compare"
            If Globals.areCurvesEqual(currentShape.curve, layer.getMainShape.curve, True) Then
                currentShape.delete
                GoTo ForEnd
            End If
        End If
        Set currentShape = Nothing
ForEnd:
    Next i
    layer.invalidateAllRedShapes
    ' --------------------------------
    
    
    
    ' Doppelte Grundplatten löschen
    ' ------------------------------
    If checkGroundPlate And Not layer.getGroundPlate Is Nothing Then
        
        If layer.getVariantsOfType(GroundplateVariantType).allVariants.count > 1 Then
            
            Dim groundPlateDict As New Dictionary
        
            For i = 1 To layer.getVariantsOfType(GroundplateVariantType).allVariants.count
                If groundPlateDict.Exists(layer.getVariantsOfType(GroundplateVariantType).allVariants.item(i).variantName) Then
                    layer.getVariantsOfType(GroundplateVariantType).removeVariantByIndex (i)
                Else
                    Dim groundPlateName As String
                    groundPlateName = layer.getVariantsOfType(GroundplateVariantType).allVariants(i).variantName
                    groundPlateDict.add groundPlateName, groundPlateName
                    groundPlateName = ""
                End If
            Next i
        
            layer.invalidateAll
        End If
    End If
    ' ------------------------------
    
    
    ' Prüfen, ob die Formen erkannt werden. Warnen wenn nicht
    ' --------------------------------------------------------
'    ProductRecognizer.initIfNeeded
'    layer.invalidateAllRedShapes ' Muss komischerweise gemacht werden
'
'    If Not layer.getMainShape Is Nothing Then
'        If ProductRecognizer.recognizeProductLayerName(layer, False) = "" Then
'            cleanUp
'            Globals.setViewAreaToShape layer.layerShape
'            layer.layerShape.CreateSelection
'            MsgBox "Die Form der Schicht wurde nicht erkannt. Das kann bei einigen Scripten zu fehlern führen!"
'            Globals.endMacro
'        End If
'    Else
'        cleanUp
'        Globals.setViewAreaToShape layer.layerShape
'        layer.layerShape.CreateSelection
'        MsgBox "Keine Hauptform vorhanden!"
'        Globals.endMacro
'    End If
    ' --------------------------------------------------------
    
    
    ' Doppelte Uploadbox korrigieren
    ' --------------------------------------------
    Dim uploadBoxes As shapeRange
    Set uploadBoxes = layer.newCustomShapeTypeQuery(uploadBox).search
    For i = 1 To uploadBoxes.count
        correctDoubleUploadbox uploadBoxes(i)
    Next i
    ' --------------------------------------------
    
    
    ' Gravurfarbe korrigieren (Von Texten und Motven usw.)
    ' ---------------------------------------
    If Not layer.getGroundPlate Is Nothing Then
        Globals.correctGravingColor layer.layerShape, layer
    End If
    ' ---------------------------------------
    
    
    ' Haarlinien Dicke bei roten & pinken Formen festlegen
    ' ---------------------------------------
    If Not layer.getAllRedOrPinkShapes Is Nothing Then
        For i = 1 To layer.getAllRedOrPinkShapes.count
              layer.getAllRedOrPinkShapes(i).outline.width = Globals.getHairlineThickness
        Next i
    End If
    ' ---------------------------------------
    
    
    ' Gruppierte Texte entgruppieren
    ' ---------------------------------------
    correctGroupedText layer.layerShape, layer.layerShape
'    For i = 1 To layer.layerShape.shapes.count
'        correctGroupedText layer.layerShape.shapes.item(i), layer.layerShape
'    Next i
    ' ---------------------------------------
    
    
    ' Gruppen mit fehlerhafter Transparenz suchen und beheben
    ' ---------------------------------------
    Dim groupShapes As shapeRange
    
    Set groupShapes = layer.layerShape.shapes.FindShapes(, cdrGroupShape)
    For i = 1 To groupShapes.count
        checkAndcorrectBrokenTransparencyOnGroup groupShapes(i)
    Next i
    ' ---------------------------------------
    
    ' Warnen wenn veralterte Varianten vorhanden sind (bzw. Varianten die anhand ihres Namens nicht mehr bei den PlaceFileJobs zu finden sind)
    ' --------------------------------------------------
    logger.logINFO "Prüfen, ob alle Varianten vom Design auch als aktueller Job exestieren:"
    Dim variantShapes As shapeRange
    Set variantShapes = layer.getVariantsOfType(StaticVariantType).allVariantsShapes
    For i = 1 To variantShapes.count
        
        Dim job As PlaceFileJob
        Set job = PlaceFile.findVarianteJobByShape(variantShapes(i), , layer)
        
        If job Is Nothing Then
            variantShapes(i).CreateSelection
            Globals.setViewAreaToShape variantShapes(i)
            
            Dim warningMsg As String
            warningMsg = "Die Variante '" & variantShapes(i).name & "' ist veraltet. Sie muss entfernt und die neue platziert werden."
            
            MsgBox warningMsg, vbCritical
            logger.logFATAL "- " & warningMsg
            AutoCorrection.cleanUp
            Globals.endMacro
        End If
        
        Set job = Nothing
        
    Next i
    logger.logINFO "- Alle Varianten OK"
    ' --------------------------------------------------
    
    ' Notiz: vv Nicht zuverlässig. Denn nicht alle UV-Designs benötigen eine Beschnittzugabe. manche haben keinen Hintergrund (wie Songcover SAH auf klarem Acryl)
'    ' Warnen, wenn ein UV-Layer keine Beschnittzugabe hat
'    ' -------------------------------------------------------
'    If Not layer.isGraving Then
'
'        If Not layer.hasBleed Then
'            layer.layerShape.CreateSelection
'            Globals.setViewAreaToShape layer.layerShape
'            MsgBox "Der ausgewählte Layer hat keine Beschnittzugabe, obwohl es ein UV-Layer ist!"
'        End If
'
'    End If
'    ' -------------------------------------------------------
    
    logger.removeTab
End Function





Private Function correctGravingHavingColoredShapes(design As productDesign)
    
    Dim range As shapeRange
    
    For i = 1 To design.getPartsCount
        For j = 1 To design.getPart(i).count
            
            Dim currentLayer As ProductDesignLayer
            Set currentLayer = design.getPart(i).item(j)
            
            ' Nur wenn ein Design durch seine rote Hauptform behauptet
            ' ein Gravurdesign zu sein, muss überprüft werden ob alles Grau ist
            If currentLayer.isGraving Then
                
                checkIfShapeIsGrayScale currentLayer.layerShape
                
            End If
                        
            Set currentLayer = Nothing
            
        Next j
    Next i
End Function





Private Function checkIfShapeIsGrayScale(shape As shape)
    
    If shape.Type = cdrGroupShape Then
        If Globals.isUploadBox(shape) Then
            ' Bei Uploadboxen nur das Foto untersuchen
            checkIfShapeIsGrayScale Globals.getPhotoOfUploadBoxGroup(shape)
        ElseIf Globals.isStaticVariant(shape) Then
            'Child Varianten ignorieren (sind immer als Gruppen vorhanden)
            
        Else
            For i = 1 To shape.shapes.count
                checkIfShapeIsGrayScale shape.shapes(i)
            Next i
        End If
    Else
    
        If Not Globals.isGroundplate(shape) And Not Globals.isRedOrPinkShape(shape) And Not Globals.isProductID(shape) And Not Globals.isViewShape(shape) And Not Globals.isExportableShape(shape) _
                And Not Globals.isQRCode(shape) Then
            
            If Not Globals.isShapeGrayScale(shape, True, True) Then
                shape.CreateSelection
                Globals.setViewAreaToShape shape
                MsgBox "Das ausgewählte Element aus dem Design ist nicht Grau(Schwarz-Weiß). Das Design hat aber einen roten Rahmen, was für Gravur steht! " & vbNewLine & _
                "Entweder muss alles grau sein oder es ist ein UV-Design, welches dann aber einen pinken Rahmen benötigt!", vbCritical, "Autokorrektur"
                
                cleanUp
                Globals.endMacro
            End If
        End If
    End If
    
End Function






Private Function correctWrongRedOrPinkColor(shape As shape)
    
    If shape.Type = cdrGroupShape Then
        For i = 1 To shape.shapes.count
            correctWrongRedOrPinkColor shape.shapes(i)
        Next i
    ElseIf shape.CanHaveOutline Then
        ' Falsche Pinktöne zu richtigem pink korrigieren
        If shape.outline.color.HexValue = "#FF00FF" Or shape.outline.color.HexValue = "#E5097F" Then
            'shape.shapes(i).CreateSelection
            'MsgBox "Die ausgewählte Umrandung ist falsch! Es ist einfach nur Pink, sollte aber ""Cut Contour"" sein"
            'End
            
            shape.outline.color.HexValue = "#EC2A90"
        End If
        
        ' Falschen Rot-Ton korrigieren (CMYK-Rot)
        If shape.outline.color.HexValue = "#E31E24" Then
            shape.outline.color.HexValue = "#FF0000"
        End If
    End If

End Function





'Sorgt noch für falsche Meldungen. Zb bei Arial
Private Function correctEmbededFont(textShape As shape)
'    On Error GoTo fontEmbededError
'    dummyText.text.Story.CopyAttributes textShape.text.Story
'    On Error GoTo 0
'
'    Exit Function
'fontEmbededError:
'    MsgBox "Die Schriftart " & textShape.text.Story.font & " muss installiert werden!"
'    cleanup
'    Globals.endMacro
'    End
End Function





' Gefüllte rote/pinke Formen in Rahmen und Füllung aufteilen
Private Function correctFilledRedOrPinkShape(shape As shape)
    
    If shape.Type = cdrGroupShape Then
        For i = 1 To shape.shapes.count
            
            correctFilledRedOrPinkShape shape.shapes(i)
            
        Next i
    Else
        If shape.CanHaveOutline Then
            If Not shape.outline.Type = cdrNoOutline Then
                If Globals.isColorRedOrPink(shape.outline.color) Then
                
                    If Not shape.fill.Type = cdrNoFill Then
                        
                        ' Bei Uploadboxen einfach nur die Umrandung entfernen ...
                        If shape.name = "uploadbox" Then
                            shape.outline.Type = cdrNoOutline
                        Else
                            
                            ' ... bei anderen Fällen Fläche und Uploadbox trennen
                        
                            Dim copy As shape
                            Set copy = Globals.copyPasteShape(shape, True)
                            
                            copy.outline.SetNoOutline
                            shape.fill.ApplyNoFill
                            
                            Set copy = Nothing
                        End If
                    End If
                    
                End If
            End If
        End If
    End If
    
End Function






'Private Function correctGroupedRedOrPinkShapes(design As productDesign)
'
''    MsgBox "correctGroupedRedOrPinkShapes"
'
'    Dim currentLayer As productDesignLayer
'    Set currentLayer = design.getLayers.item(1)
'
'    'TODO Variantengruppe nicht entgruppieren
'    Dim redOrPinkShapes As shapeRange
'    Set redOrPinkShapes = Globals.getShapesOfCustomShapeType(currentLayer.layerShape, RedOrPinkShape)
'
'    For j = 1 To redOrPinkShapes.count
'
'        If Not redOrPinkShapes(j).ParentGroup Is currentLayer.layerShape And Not Globals.isStaticVariant(redOrPinkShapes(j).ParentGroup) Then
''            redOrPinkShapes(j).CreateSelection
''            Globals.setViewAreaToShape redOrPinkShapes(j)
''            MsgBox "Gruppierte rote/pinke Form gefunden"
''            Globals.endMacro
'
'            Dim group As shape
'            Set group = redOrPinkShapes(j).ParentGroup
'
'            ' Letztes Shape in der Gruppe
'            If group.shapes.count = 1 Then
'                ' Gruppe auflösen
'                group.Ungroup
'            Else
'                ' Shape aus der Gruppe über die Gruppe ordern
'                redOrPinkShapes(j).OrderFrontOf group
'            End If
'
'            Set group = Nothing
'        End If
'
'    Next j
'
'End Function





' "shape" muss eine Groupshape sein
' "layerGroup" ist die Gruppe des Layers in der "shape" drin ist (oder in einer Untergruppe
' Returnt, ob das "shape" als Gruppe aufgelößt wurde (geht natürlich nur, wenn "shape" eine Gruppe ist)
Private Function correctGroupedRedOrPinkShapes(shape As shape, layerGroup As shape) As Boolean
    
'    MsgBox "correctGroupedRedOrPinkShapes shape: " & shape.name
    
    Dim i As Integer
    i = 1
    While i <= shape.shapes.count
        
        Dim currentShape As shape
        Set currentShape = shape.shapes(i)
        
'        MsgBox "currentShape: " & currentShape.name
        
        Let currentShapeName = currentShape.name
        Let ParentGroupName = currentShape.parentGroup.name
        
        If currentShape.Type = cdrGroupShape Then
        
            If correctGroupedRedOrPinkShapes(currentShape, layerGroup) Then
                i = i - 1
            End If
            
'        End If
        
        
        ElseIf Globals.isRedOrPinkShape(currentShape) Then
            
            If Not Globals.isStaticVariant(currentShape.parentGroup) Then
            
                If Not currentShape.parentGroup Is layerGroup Then
                    
                    ' Letztes Shape in der Gruppe
                    If currentShape.parentGroup.shapes.count = 1 Then
                        ' Gruppe auflösen
                        currentShape.parentGroup.Ungroup
                        
                        correctGroupedRedOrPinkShapes = True
                        Exit Function
                    Else
                        ' Shape aus der Gruppe über die Gruppe ordern
                        currentShape.OrderFrontOf currentShape.parentGroup
                    End If
                    
                End If
                
                
            End If
            
        End If
        
        
        Set currentShape = Nothing
        
        i = i + 1
    Wend
    
End Function






Private Function correctGroupedText(shape As shape, layerShape As shape) As Boolean
    
    Dim i As Integer
    i = 1
    While i <= shape.shapes.count
        
        Dim currentShape As shape
        Set currentShape = shape.shapes(i)
        
        'Let currentShapeName = currentShape.name
        
        If currentShape.Type = cdrGroupShape Then
            
            If Not Globals.isLocked(currentShape) And Not Globals.isUploadBox(currentShape) And Not Globals.isStaticVariant(currentShape) And _
                Not Globals.isDesignElementVariantShapeType(currentShape) Then
                If correctGroupedText(currentShape, layerShape) Then
                    i = i - 1
                End If
            End If
            
        ElseIf currentShape.parentGroup Is layerShape Then
            ' Alle Formen, die keine Gruppen sind und den Layer als parentGroup haben,
            ' werden hier abgefangen, damit nicht etwa ein Text aus dem layerShape geordert wird
            
        ElseIf currentShape.Type = cdrTextShape Then
            
            ' Letztes Shape in der Gruppe ...
            If currentShape.parentGroup.shapes.count = 1 Then
                ' ... dann Gruppe auflösen
                currentShape.parentGroup.Ungroup
                
                correctGroupedText = True
                Exit Function
            Else
                ' Shape aus der Gruppe über die Gruppe ordern
                currentShape.OrderFrontOf currentShape.parentGroup
            End If
            
        End If
        
        i = i + 1
    Wend
End Function




' Returnt, ob das Shape gelöscht wurde. Wird für die Rekursion benötigt
Public Function searchSvgDataAndDelete(shape As shape) As Boolean
    
    
    If shape.Type = cdrGroupShape Then
        Dim i As Integer
        i = 1
    
        While i <= shape.shapes.count
            If searchSvgDataAndDelete(shape.shapes(i)) Then
                i = i - 1
            End If
            i = i + 1
        Wend
    
    Else
        If shape.Type = cdrNoShape Then
            shape.locked = False
            shape.delete
            searchSvgDataAndDelete = True
        End If
        
    End If

    'MsgBox "shapes Type=" & VarType(shapes)
End Function




'Public Function findNotSameShapeTypesInGroupProblem(designShape As shape)
'
'    For i = 1 To designShape.shapes.count
'        Dim groupShape As shape
'        Set groupShape = designShape.shapes(i)
'
'
'
'        If groupShape.Type = cdrGroupShape And Not Globals.isUploadBox(groupShape) Then
'            Dim shape As shape
'            Set shape = Globals.findFirstShapeThatsNotGroupRecursive(groupShape)
'
'
'
'            If Not Globals.areAllShapesOfGroupEitherVectorOrBitmap(groupShape, Globals.isBitmapShape(shape)) Then
'                groupShape.CreateSelection
'                MsgBox "Die Ebenen innerhalb der Gruppe, müssen alle vom selben Typ sein. Entweder nur Bildtypen oder nur Vektortypen (oder Gruppen)", , "Fehler-Fixer"
'                End
'            End If
'        Else
'        End If
'    Next i
'
'End Function



Public Function findProblems(shape As shape)
    
    logger.logINFO "[AutoCorrection.findProblems]"
    logger.addTab
    
    ' Falls Shapes während des durchlaufens hinzugefügt oder gelöscht werden, könnte die While-Schleife durcheinanderkommen
    ' Das passiert aber nicht mit einem cache, da dieser gleich bleibt
    Dim cachedShapes As shapes
    Set cachedShapes = shape.shapes
    
    Dim i As Integer
    i = 1
    
    While i <= cachedShapes.count
        
        Dim currentShape As shape: Set currentShape = cachedShapes(i)
        
        ' Falls eine Form gelöscht wurde einfach überspringen
        If Globals.isShapeDeleted(currentShape) Then
            GoTo ContinueWhile
        End If
        
        If currentShape.Type = cdrGroupShape Then
            
            ' Kaputte Motive
            If InStr(currentShape.name, "_motiv") Then
                currentShape.CreateSelection
                Globals.setViewAreaToShape currentShape
                MsgBox "Das Motiv ist eine Gruppe. Bitte suche das originale Motiv und ersetze es mit dem Kaputten.", vbCritical, "Autokorrektur"
                
                cleanUp
                Globals.endMacro
            End If
            
            findProblems currentShape
        Else 'If shape.Shapes(i).Type > 0 And shape.Shapes(i).Type <= 5 Then ' > 0 == kein GroupShape(0) <= 5 bis cdrBitmapShape
            
            'MsgBox shape.shapes(i).Name & ", shape.type=" & shape.shapes(i).Type
            
            
'            ' Pinke und rote Farbe aktzeptieren
'            If shape.Shapes(i).Outline.color.HexValue = "#EC2A90" Or shape.Shapes(i).Outline.color.HexValue = "#FF0000" Then
'
'                If Not shape.Shapes(i).Outline.width = Globals.getHairlineThickness Then
'                    'shape.shapes(i).CreateSelection
'                    'MsgBox "Der pinke Rahmen muss als Konturdicke ""Haarlinie"" haben!"
'                    'End
'
'                    shape.Shapes(i).Outline.width = Globals.getHairlineThickness
'                End If
'
'                If IsNull(cutShapePink) Then
'                     'MsgBox "Width" & shape.shapes(i).Outline.Width
'
'                    Set cutShapePink = shape.Shapes(i)
'
'                ElseIf isBigger(shape.Shapes(i), cutShapePink) Then ' Wenn es mehrere Pinke Rahmen gibt dann wird das größere genommen
'                    Set cutShapePink = shape.Shapes(i)
'                End If
'
'
'            End If
            
            ' Falls eine Form keinen Umriss oder eine Füllung hat, löschen
            If Not Globals.isShapeOpaque(currentShape) And Not Globals.isQRCode(currentShape) And Not Globals.isShapePowerclip(currentShape) Then
                logger.logINFO "Form '" & Globals.getShapeDisplayName(currentShape) & "' (Typ:'" & Globals.getShapeTypeNameByShape(currentShape) & "' #'" & currentShape.Type & "') wird gelöscht, da es weder Füllung noch einen Umriss hat!"
                currentShape.delete
                GoTo ContinueWhile
            End If
            
            
            If currentShape.Type = cdrTextShape Then
                
                If currentShape.text.Story.alignment = cdrForceJustifyAlignment Then
                    MsgBox "Die Textausrichtung 'Blocksatz erzwingen' wird nicht vom Fancy unterstützt!", vbCritical
                    
                    currentShape.CreateSelection
                    Globals.setViewAreaToShape currentShape
                    Globals.endMacro
                End If
                
                ' Nur freien Text prüfen. Textboxen können nicht unproportional sein
                If Globals.isShapeUnproportionalScaled(currentShape, True) Then
                    Globals.removeUnproportionalScale currentShape
                    
                    warnUndoneUnproportionalScaledText = True
                End If
                
                If Not currentShape.text.IsArtisticText Then
                    If currentShape.text.Story.text = "" Then
                        currentShape.visible = False
                    End If
                End If
            End If
            
            
            
            If currentShape.Type = cdrBitmapShape Then
                If currentShape.name = "uploadbox" Then
                    
                    Dim brokenUploadBox As Boolean
                    
                    If Globals.hasParentGroup(currentShape) Then
                        If Not Globals.startsWith(currentShape.parentGroup.name, "uploadbox_") Then
                            brokenUploadBox = True
                        End If
                    Else
                        brokenUploadBox = True
                    End If
                    
                    If brokenUploadBox Then
                        
                        Globals.setViewAreaToShape currentShape
                        
                        'Wenn hier ein Fehler auftritt, kann es sein, das der Parent nicht eine Gruppe ist, sondern schon ein Layer von CorelDraw
                        Dim sameParentShapes As shapes: Set sameParentShapes = Globals.getParentShapes(currentShape)
                        
                        
                        Dim deinFoto As shape
                        Set deinFoto = sameParentShapes.FindShape("deinfoto", cdrGroupShape, , False)
                        
                        If Not deinFoto Is Nothing Then
                            deinFoto.delete
                        End If
                        
                        
                        currentShape.CreateSelection
                        
                        Tool.createUploadboxOnShape currentShape
                        
'                        Globals.setViewAreaToShape currentShape
'                        MsgBox "Die Uploadbox ist kaputt. Bitte entferne den Uploadbox-Text und -Kreis (Name: deinfoto). " & _
'                            "Wähle dann das Foto aus und mache mit hilfe des Uploadboxscripts das Foto zu einer Uploadbox.", , "Fehler-Fixer"
'
'                        cleanUp
'                        Globals.endMacro
                    End If
                    
                End If
            End If
            
        End If
        
ContinueWhile:
        i = i + 1
    Wend

ExitFunction:
    logger.removeTab
End Function


Public Function isBigger(ByVal shapeA As shape, ByVal shapeB As shape) As Boolean
    
    'MsgBox "Compare A.W=" & shapeA.BoundingBox.Width & ", B.W=" & shapeB.BoundingBox.Width & ", A.H=" & shapeA.BoundingBox.Height & ", B.H=" & shapeB.BoundingBox.Height
    isBigger = ((shapeA.boundingBox.width >= shapeB.boundingBox.width) And (shapeA.boundingBox.height >= shapeB.boundingBox.height))
    
End Function

' Behebt den Fehler dass eine Uploadbox mehrfach als "uploadbox" Gruppiert ist
Public Function correctDoubleUploadbox(uploadBoxShape As shape)
    Dim falseUploadBoxes As shapeRange
    Set falseUploadBoxes = newCustomShapeTypeQuery(uploadBoxShape, uploadBox).setExcludeGivenShape(True).search
    For i = falseUploadBoxes.count To 1 Step -1
        If falseUploadBoxes(i).Type = cdrGroupShape Then
            falseUploadBoxes(i).Ungroup
        End If
    Next i
End Function



Private Function checkAndcorrectBrokenTransparencyOnGroup(groupShape As shape)
    
    If isGroupHavingBrokenTransparency(groupShape) Then
        Dim groupShapeNameBefore As String
        groupShapeNameBefore = groupShape.name
        Dim transparencyOfGroup As Integer
        transparencyOfGroup = groupShape.transparency.Uniform
        
        Dim shapes As shapeRange
        Set shapes = Globals.ungroupShapeGroupAndKeepPosition(groupShape)
        
        Set groupShape = Globals.groupShapes(shapes)
        groupShape.name = groupShapeNameBefore
        
        ' Transparenz auf neue Gruppe anwenden (Damit sie so ist wie vorher, nur ohne Fehler)
        groupShape.transparency.ApplyUniformTransparency transparencyOfGroup
        
        ' Wenn man nach dem beheben des Fehler den Mischmodus der Gruppe auf Multiplizieren setzt, dann sieht es am ehesten so aus wie vorher
        groupShape.transparency.MergeMode = cdrMergeMultiply
    End If
    
End Function


Public Sub TestIsGroupHavingBrokenTransparency()
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    If ActiveShape.Type = cdrGroupShape Then
        MsgBox "" & isGroupHavingBrokenTransparency(ActiveShape)
'        MsgBox ActiveShape.transparency.Uniform
    End If
    
End Sub


Public Function isGroupHavingBrokenTransparency(groupShape As shape) As Boolean
    
    ' Der Fehler kam bisher nur bei Gruppen mit einer Unterform vor
    If groupShape.shapes.count = 1 Then
        
        ' Kam bisher nur bei vollflächigen Transparenzen vor
        If groupShape.transparency.Type = cdrUniformTransparency Then
            ' Falls die Gruppe eine Transparenz aufweist
            If groupShape.transparency.Uniform > 0 Then
                For i = 1 To groupShape.shapes.count
                    If groupShape.shapes(i).transparency.Type = cdrUniformTransparency Then
                        ' Wenn die Gruppe einen Transparenz-Wert von über 0 hat, dann kann es nicht sein, dass alle Childs einen Wert von 0 haben.
                        ' Mindestens ein Child muss die selbe Transparenz haben wie die Gruppe (Denn die Gruppe selbst hat keine eigene Transparenz und orientiert sich an den Childs)
                        If Not groupShape.shapes(i).transparency.Uniform = 0 Then Exit Function
                    End If
                Next i
                ' Wenn man bis hier gekommen ist, dann hat kein Child eine Transparenz (Wert bei allen 0)
                ' Das ist dann eine Gruppe mit fehlerhafter Transparenz. True returnen
                isGroupHavingBrokenTransparency = True
                Exit Function
            End If
        End If
        
    End If
    
End Function
