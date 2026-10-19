Attribute VB_Name = "ProductLayerDistance"

' Autor: Martin Afelt @ Gravuru

' Dieses Script setzt den Abstand zwischen 2 Parts eines Produktes
' Ist z.B: nützlich bei Schlüsselanhängern die aus 2 Parts bestehen und wo die Gestalter bei den verschiedenen Designs nicht immer den selben Abstand zwischen den beiden Parts gehalten haben.
' Für Produktbilder und bei den Konfis möchte man aber immer den selben Abstand


Dim partModeA As PartMode
Dim layerModeA As PartMode

Dim partModeB As PartMode
Dim layerModeB As PartMode

Dim useX As Boolean
Dim xOffset As Double
Dim useY As Boolean
Dim yOffset As Double

Public Sub ProductLayerDistance()
    
    Globals.showWarnings
    
    
    ProductLayerDistanceDialog.Show vbModal
    
End Sub




Public Function Start(partModeAVar As PartMode, layerModeAVar As LayerMode, partModeBVar As PartMode, layerModeBVar As LayerMode, xOffsetVar As Double, yOffsetVar As Double, useXVar As Boolean, useYVar As Boolean)
    
    Globals.startMacro
    If Not Globals.debugHistory Then
        CorelScriptTools.BeginWaitCursor
        ActiveDocument.BeginCommandGroup "ProductLayerDistance"
        If Not Globals.debugErrors Then On Error GoTo MacroError
    End If
    
    ActiveDocument.unit = cdrMillimeter
    
    partModeA = partModeAVar
    layerModeA = layerModeAVar
    
    partModeB = partModeBVar
    layerModeB = layerModeBVar
    
    xOffset = xOffsetVar
    yOffset = yOffsetVar
    
    useX = useXVar
    useY = useYVar
    
    
    ProgressBarUserForm.Start
    
    ' Auswahl
    Dim selection As shapeRange
    Set selection = ActiveSelectionRange.ReverseRange ' Rückwärts laufen, da eine Auswahl immer andersherum ist (egal wie man es auswählt)
    
    If selection.count = 0 Then ' Wenn nichts ausgewählt ist, ...
        Set selection = ActivePage.shapes.All ' ... alle Formen bearbeiten. ...
        selection.RemoveRange ActiveDocument.MasterPage.desktopLayer.shapes.All ' ... Shapes von dem Desktop-Layer nicht beachten.
    End If
    
    
    For i = 1 To selection.count
        processShape selection(i)
        ProgressBarUserForm.setProgress i / CDbl(selection.count)
    Next i
    
    
    
    
    ProgressBarUserForm.Hide
    
    If Not Globals.debugHistory Then Globals.endMacro True
    Exit Function
MacroError: 'Alle Fehler hier abfangen und die CommandGruppe beenden, damit man mit einem Schritt zurück gehen kann (STRG + Z)
    MsgBox Err.Description, vbCritical
    ProgressBarUserForm.Hide
    Globals.endMacro True
End Function




Private Function processShape(shape As shape)

    If shape.Type = cdrGroupShape Then
        Dim currentProductDesign As productDesign
        Set currentProductDesign = New productDesign
        currentProductDesign.newProductDesign shape

        If currentProductDesign.isValidProductDesign Then
            processDesign currentProductDesign
        End If
    End If

End Function




Private Function processDesign(design As productDesign)
    
    ' Wird mehrfach genutzt
    Dim currentLayer As ProductDesignLayer
    
    
    If partModeA + 1 > design.getPartsCount Then
        Err.Raise vbObjectError + 513, , "Das Design hat nur " & design.getPartsCount & " Teile. Angegeben wurde Teil " & CStr(partModeA + 1) & vbNewLine & "[ProductLayerDistance.processDesign]"
    End If
    
    Dim shapesA As New shapeRange
    Dim partA As collection
    Set partA = design.getPart(partModeA + 1).layers
    
    If layerModeA = AllParts Then
        For i = 1 To partA.count
            
            Set currentLayer = partA(i)
            shapesA.add currentLayer.layerShape
            
            Set currentLayer = Nothing
        Next i
    Else
        
        If layerModeA + 1 > partA.count Then
            Err.Raise vbObjectError + 513, , "Das Teil " & CStr(partModeA + 1) & " hat nur " & partA.count & " Schichten. Angegeben wurde Schicht " & CStr(layerModeA + 1) & vbNewLine & "[ProductLayerDistance.processDesign] "
        End If
        
        Set currentLayer = partA(layerModeA + 1)
        shapesA.add currentLayer.layerShape
        
        Set currentLayer = Nothing
    End If
    
    
    
    If partModeB + 1 > design.getPartsCount Then
        Globals.setViewAreaToShape design.getDesignShape
        design.getDesignShape.CreateSelection
        Err.Raise vbObjectError + 513, , "Das Design hat nur " & design.getPartsCount & " Teile. Angegeben wurde Teil " & CStr(partModeB + 1) & vbNewLine & "[ProductLayerDistance.processDesign]"
    End If
    
    Dim shapesB As New shapeRange
    Dim partB As collection
    Set partB = design.getPart(partModeB + 1).layers
    
    If layerModeB = AllParts Then
        For i = 1 To partB.count
            
            Set currentLayer = partB(i)
            shapesB.add currentLayer.layerShape
            
            Set currentLayer = Nothing
        Next i
    Else
        If layerModeB + 1 > partB.count Then
            Globals.setViewAreaToShape design.getDesignShape
            design.getDesignShape.CreateSelection
            Err.Raise vbObjectError + 513, , "Das Teil " & CStr(layerModeB + 1) & " hat nur " & partB.count & " Schichten. Angegeben wurde Schicht " & CStr(layerModeB + 1) & vbNewLine & "[ProductLayerDistance.processDesign]"
        End If
    
        Set currentLayer = partB(layerModeB + 1)
        shapesB.add currentLayer.layerShape
        
        Set currentLayer = Nothing
    End If
    
    If useX Then
        shapesB.LeftX = shapesA.RightX + xOffset
    End If
    
    If useY Then
        shapesB.TopY = shapesA.BottomY + yOffset
    End If
    
'    shapesB.CenterX = shapesA.CenterX + xOffset
'    shapesB.CenterY = shapesA.CenterY + yOffset
    
    
End Function

