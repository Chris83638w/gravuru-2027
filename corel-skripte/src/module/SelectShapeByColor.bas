Attribute VB_Name = "SelectShapeByColor"

Dim logger As logger
Public noShapesFoundLastSearch As Boolean

Public Sub showDialog()
    
    SelectShapeByColorDialog.init
    SelectShapeByColorDialog.Show vbModal
    
End Sub

Public Function Start(color As color, color2 As color, outline As Boolean, fill As Boolean)
    
    noShapesFoundLastSearch = False
    
    Globals.endIfNoDocumentOpen
    
    ' Aus, da das Suchen sonst zu lange dauert
    'Set logger = New logger
    If Not logger Is Nothing Then
        logger.init "SelectShapeByColor"
        logger.addTab , "[SelectShapeByColor.Start]" ' color: '" & IIf(color Is Nothing, "Nothing", color.HexValue) & "', color2: '" & IIf(color2 Is Nothing, "Nothing", color2.HexValue) & "', outline: '" & outline & "', fill: '" & fill & "'"
    End If
    
    
    ' Soll die Farbe per Name oder Hexcode gesucht werden?
    ' Ist color Nothing, werden Formen ohne Füllung bzw. ohne Outline gesucht
    Dim searchColorByHexOrName As Boolean
    If Not color Is Nothing Then
        searchColorByHexOrName = Globals.startsWith(color.name, "unbenannt")
    End If
    Dim searchSecondColorByHexOrName As Boolean
    If Not color2 Is Nothing Then
        searchSecondColorByHexOrName = Globals.startsWith(color2.name, "unbenannt")
    End If
    
    Dim foundShapes As New shapeRange
    
    For i = 1 To ActiveDocument.ActivePage.allLayers.count
        foundShapes.AddRange searchShapesWithFillOrOutlineColor(color, outline, fill, ActiveDocument.ActivePage.allLayers(i).shapes.All, searchColorByHexOrName)
        If Not color2 Is Nothing Then foundShapes.AddRange searchShapesWithFillOrOutlineColor(color2, outline, fill, ActiveDocument.ActivePage.allLayers(i).shapes.All, searchSecondColorByHexOrName)
    Next i
    
    If foundShapes.count = 0 Then
        noShapesFoundLastSearch = True
        MsgBox "Es wurde nichts gefunden!", vbInformation
    Else
        foundShapes.CreateSelection
    End If
    
    If Not logger Is Nothing Then logger.removeTab
    
End Function


' Rekursiv
Private Function searchShapesWithFillOrOutlineColor(color As color, outline As Boolean, fill As Boolean, range As shapeRange, _
    byHexOrName As Boolean, Optional found As shapeRange) As shapeRange
    If Not logger Is Nothing Then logger.addTab , "[SelectShapeByColor.searchShapesWithFillOrOutlineColor] color: '" & colorToLogString(color) & "', outline: '" & outline & "', fill: '" & fill & "', byHexOrName: '" & byHexOrName & "'"
    
    If found Is Nothing Then
        Set found = New shapeRange
    End If

    For i = 1 To range.count

        Dim currentShape As shape
        Set currentShape = range(i)

        If currentShape.Type = cdrGroupShape Then
            ' Rekursiv
            searchShapesWithFillOrOutlineColor color, outline, fill, currentShape.shapes.All, byHexOrName, found
        
        Else
            
            If Globals.isShapePowerclip(currentShape) Then
                ' Rekursiv
                searchShapesWithFillOrOutlineColor color, outline, fill, currentShape.powerClip.shapes.All, byHexOrName, found
            End If
            
            If color Is Nothing Then
                ' Ohne Farbe: Formen suchen, die keine Füllung und/oder keine Outline haben
                ' Ist weder fill noch outline gewählt, muss beides fehlen
                If hasShapeNoFillAndNoOutline(currentShape, fill Or Not outline, outline Or Not fill) Then
                    found.add currentShape
                End If

            ElseIf currentShape.CanHaveOutline Then
                Dim added As Boolean
                added = False
                If fill Then
                    If isShapeFillSameColor(currentShape, color, byHexOrName) Then
                        found.add currentShape
                        added = True
                    End If
                End If
                
                If Not added Then
                    If outline Then
                        If isShapeOutlineSameColor(currentShape, color, byHexOrName) Then
                            found.add currentShape
                        End If
                    End If
                End If
            End If
            
        End If


        Set currentShape = Nothing
    Next i


    Set searchShapesWithFillOrOutlineColor = found
    
    If Not logger Is Nothing Then logger.removeTab
End Function



' Formen, die gar keine Füllung/Outline haben können (z. B. Bitmaps), zählen nicht
Private Function hasShapeNoFillAndNoOutline(shape As shape, checkFill As Boolean, checkOutline As Boolean) As Boolean
    If checkFill Then
        If Not shape.CanHaveFill Then Exit Function
        If shape.fill.Type <> cdrNoFill Then Exit Function
    End If
    If checkOutline Then
        If Not shape.CanHaveOutline Then Exit Function
        If shape.outline.Type <> cdrNoOutline Then Exit Function
    End If
    hasShapeNoFillAndNoOutline = True
End Function


Private Function isShapeOutlineSameColor(shape As shape, color As color, byHexOrName As Boolean) As Boolean
    If shape.CanHaveOutline Then
        If shape.outline.Type = cdrOutline Then
            If areColorsSame(shape.outline.color, color, byHexOrName) Then
                isShapeOutlineSameColor = True
            End If
        End If
    End If
End Function


Private Function isShapeFillSameColor(shape As shape, color As color, byHexOrName As Boolean) As Boolean
    If Not logger Is Nothing Then logger.addTab , "[SelectShapeByColor.isShapeFillSameColor]"
    If shape.CanHaveFill Then
        If shape.fill.Type = cdrUniformFill Then
            If areColorsSame(shape.fill.UniformColor, color, byHexOrName) Then
                isShapeFillSameColor = True
            End If
        End If
    End If
    If Not logger Is Nothing Then logger.removeTab
End Function


Private Function areColorsSame(colorA As color, colorB As color, byHexOrName As Boolean) As Boolean
    If Not logger Is Nothing Then logger.addTab , "[SelectShapeByColor.areColorsSame] byHexOrName: '" & byHexOrName & "'"
    
    If byHexOrName Then
        If Not logger Is Nothing Then logger.logINFO "Vergleiche A: '" & colorA.HexValue & "' mit B: '" & colorB.HexValue & "'"
        areColorsSame = colorA.HexValue = colorB.HexValue
    Else
        If Not logger Is Nothing Then logger.logINFO "Vergleiche A: '" & colorA.name & "' mit B: '" & colorB.name & "'"
        areColorsSame = colorA.name = colorB.name
    End If
    If Not logger Is Nothing Then logger.logINFO "returning '" & areColorsSame & "'"
    If Not logger Is Nothing Then logger.removeTab
End Function


Private Function colorToLogString(color As color) As String
    If color Is Nothing Then
        colorToLogString = "Nothing"
    Else
        colorToLogString = color.HexValue
    End If
End Function
