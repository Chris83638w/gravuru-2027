Attribute VB_Name = "Arrange"

' Autor:  Martin Afelt @ GRAVURU
'

Dim masterDesign As productDesign


Public Sub arrange()
    arrangeMacro
'    executeArrangeFunction
End Sub


Public Sub arrangeToGrid()
    arrangeMacro , , True, True
End Sub


Private Function arrangeMacro(Optional quietMode As Boolean = False, Optional ByVal shapesOrRangesToSort As collection, Optional alignAsGrid As Boolean = False, Optional setPageSize As Boolean = False, Optional ignoreRDGWhiteShapes As Boolean = True)
    Globals.warnIfNoDocumentAndEnd
    
    If Not quietMode Then
        Globals.checkIfServerOnlineAndSelectOfflineWorkPath
        Globals.checkVersion
    End If

    If Not quietMode Then
        Globals.startMacro
        If Not Globals.debugHistory Then
            CorelScriptTools.BeginWaitCursor
            ActiveDocument.BeginCommandGroup "Arrange"
            If Not Globals.debugErrors Then On Error GoTo MacroError
        End If
    End If
    
    ' \\\\\\\\\\\\\\\\\
    ' /////////////////
    arrangeFunction quietMode, shapesOrRangesToSort, alignAsGrid, setPageSize, ignoreRDGWhiteShapes
    
    If Not quietMode And Not Globals.debugHistory Then Globals.endMacro True
    Exit Function
MacroError: 'Alle Fehler hier abfangen und die CommandGruppe beenden, damit man mit einem Schritt zurück gehen kann (STRG + Z)
    MsgBox Err.Description & ", " & Err.number, vbCritical
    ProgressBarUserForm.Hide
    Globals.endMacro True
End Function


'Private Function executeArrangeFunction(Optional quietMode As Boolean = False, Optional shapesOrRangesToSort As collection, Optional alignAsGrid As Boolean = False, Optional setPageSize As Boolean = False) As collection
'    Globals.executeMacro "Arrange", "arrangeSub", "Anordnen", True, False, , quietMode, shapesOrRangesToSort, alignAsGrid, setPageSize
'End Function
'
'Public Sub arrangeSub(Optional quietMode As Boolean = False, Optional shapesOrRangesToSort As collection, Optional alignAsGrid As Boolean = False, Optional setPageSize As Boolean = False, Optional ByRef returnVal As Variant)
'    Set returnVal = arrangeFunction(quietMode, shapesOrRangesToSort, alignAsGrid, setPageSize)
'End Sub

Public Function arrangeFunction(Optional quietMode As Boolean = False, Optional ByVal shapesOrRangesToSort As collection, Optional alignAsGrid As Boolean = False, Optional setPageSize As Boolean = False, Optional ignoreRDGWhiteShapes As Boolean = True) As collection
    
    
    Dim selectionCollection As collection
    
    If Not shapesOrRangesToSort Is Nothing Then
        Set selectionCollection = shapesOrRangesToSort
        
        ' Es gibt nur eine Form zum sortieren. Deshalb einfach diese returnen
        If shapesOrRangesToSort.count = 1 Then
            Set arrangeFunction = shapesOrRangesToSort
            Exit Function
        End If
        
    Else
        ' Auswahl oder alle Formen (außer die auf der Desktop-Ebene)
        Set selectionCollection = Globals.shapeRangeToCollection(Globals.getSelectedShapesOrAll)
    End If
    
    
    ' RDG_White Formen entfernen (sollen nicht Z-Indexmäßig sortiert werden, da sie sonst andere Elemente überdecken. Die Weißhinterlegung gehört aber immer nach hinten
    ' ----------------------------------------
    If ignoreRDGWhiteShapes Then
        Dim selectionCollectionAsShapeRange As shapeRange
        Set selectionCollectionAsShapeRange = Globals.collectionToShapeRange(selectionCollection)
        selectionCollectionAsShapeRange.RemoveRange newCustomShapeTypeQuery(selectionCollectionAsShapeRange, RGD_WhiteShape).search

        Set selectionCollection = Globals.shapeRangeToCollection(selectionCollectionAsShapeRange)
    End If
    ' ----------------------------------------
    
    
    ' Wenn Formen verriegelt sind, kann arrange nicht zuverlässig sortieren
    Globals.setShapeRangeLocked Globals.collectionToShapeRange(selectionCollection), False, True
    

    If Not selectionCollection.count = 0 Then
        
        
        ' Hilfslinien ignorieren (denn diese bringen alles durcheinander)
        Dim selectionWithoutGuidlineShapes As New collection
        For i = 1 To selectionCollection.count
        
            ' Wenn es ein Shape ist ...
            If TypeOf selectionCollection(i) Is shape Then
                ' ... dann nicht hinzufügen, wenn es eine Hilfslinie ist.
                If Not selectionCollection(i).Type = cdrGuidelineShape Then
                    selectionWithoutGuidlineShapes.add selectionCollection(i)
                End If
            Else
                ' Alles andere einfach hinzufügen
                selectionWithoutGuidlineShapes.add selectionCollection(i)
            End If
        Next i
        Set selectionCollection = selectionWithoutGuidlineShapes
        
        
        With ProgressBarUserForm.newSubProgress(selectionCollection.count - 1)
        
            ' BubbleSort
            For i = 1 To selectionCollection.count - 1
                For j = i + 1 To selectionCollection.count
    
                    Dim shapeA 'As shape oder ShapeRange (Wenn shapesOrRangesToSort nicht Nothing)
                    Set shapeA = selectionCollection.item(i)
    
                    Dim shapeB 'As shape oder ShapeRange (Wenn shapesOrRangesToSort nicht Nothing)
                    Set shapeB = selectionCollection.item(j)
    
    
                    Dim keepIndex As Boolean
                    keepIndex = False
    
                    ' Wenn ShapeA weiter oben ist als ShapeB (Also in einer höheren Zeile ist)
                    ' Bzw. Wenn die Unterkante von ShapeA höher ist als die Oberkante von ShapeB
                    If shapeA.BottomY > shapeB.centerY Then
                        keepIndex = True 'ShapeA behält seinen Z-Index
                        'MsgBox "shapeA.BottomY > shapeB.TopY"
                        
                    ' Wenn ShapeA auf der selben Zeile wie ShapeB ist
                    ' Bzw. Wenn die Oberkante von ShapeA höher ist als die Unterkante von ShapeB
                    ElseIf shapeA.TopY > shapeB.centerY Then
                        If shapeA.LeftX < shapeB.LeftX Then
                            keepIndex = True 'ShapeA behält seinen Z-Index
                        End If
                    End If
    
                    'MsgBox "Compare " & shapeA.name & " and " & shapeB.name & " keepA=" & CStr(keepIndex)
    
                    If Not keepIndex Then
                        selectionCollection.Remove j
                        selectionCollection.add shapeB, , i
                    End If
                Next j
                
                .setStepsProgress i
            Next i
        
            .finishProgress
        End With

        ' Ordern
        ' ----------------------------------------
        For i = 1 To selectionCollection.count - 1
            Dim NextShape ' As shape oder ShapeRange (Wenn shapesOrRangesToSort nicht Nothing ist)
            Set NextShape = selectionCollection.item(i + 1)
            
            Dim currentShape ' As shape oder ShapeRange (Wenn shapesOrRangesToSort nicht Nothing ist)
            Set currentShape = selectionCollection.item(i)
            
            If TypeName(currentShape) = "Shape" Then
                NextShape.OrderBackOf selectionCollection.item(i)
            Else ' ShapeRange
                NextShape.OrderBackOf selectionCollection.item(i).firstShape
            End If

        Next i
        ' ----------------------------------------
        
        If alignAsGrid Then
            Set selectionCollection = Globals.shapeRangeToCollection(sortShapesAsGrid(selectionCollection))
        End If
        
        If setPageSize Then
            setPageSizeToShapes Globals.collectionToShapeRange(selectionCollection)
        End If
        
        Set arrangeFunction = selectionCollection
    Else
        Set arrangeFunction = New collection
        
        If Not quietMode Then
            MsgBox "Es ist nichts ausgewählt!", vbInformation
        End If
    End If
    
End Function


' Returnt die sortierten Formen
Public Function sortShapesAsGrid(ByVal shapesToSort As collection) As shapeRange
    
    If shapesToSort Is Nothing Then
        Err.Raise vbObjectError + 513, , "[Arrange.sortShapesAsGrid] 'shapesToSort' ist Nothing "
    End If
    
    ' Komischerweise muss man von einem Snapshot aus arbeiten, da shapesToSort innerhalb der For-Schleife Nothing wird. Hääää !!!! >:(
    Dim shapesToSortSnapShot As shapeRange
    Set shapesToSortSnapShot = Globals.collectionToShapeRange(shapesToSort)
    
    Set masterDesign = Globals.getMasterDesignFromShapes(shapesToSortSnapShot)
    
    Dim masterDesignShape As shape
    If Not masterDesign Is Nothing Then
        Set masterDesignShape = masterDesign.getDesignShape
    End If
    
    If Not masterDesignShape Is Nothing Then
        ' Nur wenn das Masterdesign nicht das einzige ist, welches sortiert werden soll, wird es vorerst zum sortieren entfernt
        ' Denn es wird am Ende an das oberste Desing links angeordnet
        If shapesToSortSnapShot.count > 1 Then
            shapesToSortSnapShot.RemoveRange Globals.shapeToShapeRange(masterDesignShape)
        End If
    End If
    
    Set sortShapesAsGrid = shapesToSortSnapShot
    
    
    
    ' Wird mehrfach genutzt
    Dim shapeBefore As shape
    Dim currentShape As shape
    
    
    
    ' Padding ermittlen
    ' ----------------------------------
    Dim biggestShape As shape
    Set biggestShape = shapesToSortSnapShot.firstShape
    Dim padding As Double
    For i = 2 To shapesToSortSnapShot.count
        
        Set currentShape = shapesToSortSnapShot(i)
        
        If currentShape.SizeWidth > biggestShape.SizeWidth Or currentShape.SizeHeight > biggestShape.SizeHeight Then
            Set biggestShape = currentShape
        End If
        
        
    Next i
    padding = IIf(biggestShape.SizeWidth > biggestShape.SizeHeight, biggestShape.SizeWidth, biggestShape.SizeHeight)
    padding = padding / 8
    ' ----------------------------------
    
    
    
    
    
    ' Erst einmal die Zeilen ermitteln
    ' (Direktes Anordnen ist nicht möglich, da das die Zeilenermittlung verfälscht
    ' -----------------------------------------------------------------
    Dim lines As New collection
    Dim currentLine As New collection ' Wird mehrfach verwendet
    currentLine.add shapesToSortSnapShot(1)
    For i = 2 To shapesToSortSnapShot.count
        
        Set shapeBefore = shapesToSortSnapShot(i - 1)
        Set currentShape = shapesToSortSnapShot(i)
        
'        Debug.Print "currentShape: " & getShapeName(currentShape) & ", shapeBefore: " & getShapeName(shapeBefore)
        
        ' Wenn currentShape weiter oben ist als shapeBefore (Also in einer höheren Zeile ist)
        ' Bzw. Wenn die Unterkante von currentShape höher ist als die Oberkante von shapeBefore
        If shapeBefore.BottomY > currentShape.centerY Then ' In neuer Zeile angekommen
'            Debug.Print "Neue Zeile Anfangen"
            
            lines.add currentLine
            Set currentLine = New collection
        End If
        
        currentLine.add currentShape
        
        Set currentShape = Nothing
        Set shapesToSort = Nothing
    Next i
    lines.add currentLine ' Letzte Zeile wird nicht hinzugefügt, weil danach keine neue Zeile gefunden wird und nur dort welche hinzugefügt werden
    ' -----------------------------------------------------------------
    
    
    
    Dim shapeToAlignTo As shape
    Dim lineBefore As collection
    For i = 1 To lines.count
    
        Set currentLine = lines(i)
        If i > 1 Then
            Set lineBefore = lines(i - 1)
        Else
            Set lineBefore = currentLine
        End If
        
        For j = 1 To currentLine.count
            
            If j = 1 And i = 1 Then
                ' Erste Form überspringen, da diese sonst neben sich oder unter sich ausgerichtet wird
                ' (Es gibt also immer eine Verschiebung nach unten, wenn man das Skript mehrfach ausführt)
                GoTo ContinueJ
            End If
            
            Set currentShape = currentLine(j)
            
            If j = 1 Then ' Shape davor ist aus vorheriger Zeile
                Set shapeToAlignTo = lineBefore(1)
            Else ' Selbe Zeile
                Set shapeToAlignTo = currentLine(j - 1)
            End If
            
            
            
            If j = 1 Then ' Neue Zeile
                currentShape.centerX = shapeToAlignTo.centerX
                currentShape.TopY = shapeToAlignTo.BottomY - padding
            Else ' Selbe Zeile
                currentShape.LeftX = shapeToAlignTo.RightX + padding
                currentShape.centerY = shapeToAlignTo.centerY
            End If
            
ContinueJ:
        Next j
        
    Next i
    
    
End Function



Public Function setPageSizeToShapes(shapes As shapeRange)
    
    If Not ActiveDocument Is Nothing And shapes.count > 0 Then
        
        Dim shapesWithoutMaster As shapeRange
        Set shapesWithoutMaster = cloneShapeRange(shapes)
        
        Dim biggestShape As shape
        Set biggestShape = Globals.getBiggestShape(shapes)
        Dim biggestShapeSize As Double
        biggestShapeSize = max(biggestShape.SizeWidth, biggestShape.SizeHeight)
        
        Dim padding As Double
        padding = biggestShapeSize / 4
        
        If Not masterDesign Is Nothing Then
            shapesWithoutMaster.RemoveRange Globals.shapeToShapeRange(masterDesign.getDesignShape)
        End If
        
        Dim layer As layer
        Set layer = Globals.getLayer1ofDoc(ActiveDocument)
        
        ActiveDocument.ActivePage.setSize shapesWithoutMaster.SizeWidth + padding * 2, shapesWithoutMaster.SizeHeight + padding * 2
        shapes.LeftX = ActiveDocument.ActivePage.LeftX + padding
        shapes.TopY = ActiveDocument.ActivePage.TopY - padding
        
        If Not masterDesign Is Nothing Then
            Dim masterDesignShape As shape
            Set masterDesignShape = masterDesign.getDesignShape
                        
            ' Wenn das Masterdesign zu den Formen gehört, welche auch sortiert werden sollen, dann weil es die einzige Form ist.
            ' Wenn es jedoch nicht dazugehört, dann gibt es Formen die sortiert wurden und dann soll das Masterdesign links oben davon angeordnet werden
            If Not shapes.Exists(masterDesignShape) Then
                masterDesignShape.RightX = ActiveDocument.ActivePage.LeftX - padding
                masterDesignShape.TopY = ActiveDocument.ActivePage.TopY - padding
            End If
        End If
    End If
    
End Function




