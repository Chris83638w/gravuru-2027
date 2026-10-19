Attribute VB_Name = "WeightCalculator"
Option Explicit

' Autor: Martin Afelt @ Gravuru

Public Sub Start()
    
    Globals.endIfNoDocumentOpen
    
    Globals.startMacro
    If Not Globals.debugHistory Then
        If Not ActiveDocument Is Nothing Then ActiveDocument.BeginCommandGroup "WeightCalculator"
        If Not Globals.debugErrors Then On Error GoTo MacroError
    End If
    
    
    If Globals.isKeyPressed(Globals.CTRL_KEY) Or WeightCalculatorDialog.selectedMaterialWeight = 0 Then
        WeightCalculatorDialog.Show
    End If
    
    If ActiveSelectionRange.count = 0 Then GoTo Finally
    If WeightCalculatorDialog.selectedMaterialWeight = 0 Then GoTo Finally
    
    Dim selectedShapes As shapeRange
    Set selectedShapes = ActiveSelectionRange
    
    Dim selectedDesigns As ProductDesignRange
    Set selectedDesigns = Globals.getSelectedDesignsOrAllAsRange(True, , , , False, , False)
    
    
    ' Fläche ermitteln
    Dim area As Double
    If selectedDesigns.count = 0 Then
        Dim i As Integer
        For i = 1 To selectedShapes.count
            
            area = getAreaOfShapeOrRange(selectedShapes(i))
            Exit For
        Next i
        
    ElseIf selectedDesigns.count > 0 Then
        area = selectedDesigns.getDesign(1).getLayers.getArea
    End If
    
    
    ' Gewicht ermitteln
    Dim weight As Double
    weight = calculateWeight(WeightCalculatorDialog.selectedMaterialWeight, area)
    weight = Globals.round(weight, 0)
    
    ' In Zwischenablage kopieren
    Globals.SetClipboardText CStr(weight)
    
    ' Anzeigen
    MsgBox WeightCalculatorDialog.selectedMaterialAndThickness & ":" & vbNewLine & vbNewLine & weight & " Gramm" & vbNewLine & vbNewLine & "(In Zwischenablage kopiert)"
    
    GoTo Finally
MacroError: 'Alle Fehler hier abfangen und die CommandGruppe beenden, damit man mit einem Schritt zurück gehen kann (STRG + Z), auch wenn ein Fehler aufgetreten ist
    MsgBox Err.Description & ", " & Err.number, vbCritical
Finally:
    Globals.endMacro True
End Sub

Private Function getAreaOfShapeOrRange(shapeOrRange As Variant) As Double
    
    Dim shps As shapeRange
    Set shps = Globals.ensureShapeRange(shapeOrRange)

    Dim result As Double
    Dim i As Integer
    For i = 1 To shps.count
        result = result + Globals.getShapeAreaWithHoles(shps(i))
    Next i
    getAreaOfShapeOrRange = result
End Function



Private Function calculateWeight(materialWeight As Double, ByVal area As Double) As Double
    ' Von Dokument Einheiten zu Zentimeter umrechnen
    area = (area * ActiveDocument.FromUnits(1, cdrCentimeter) ^ 2)
    calculateWeight = materialWeight * area
End Function
