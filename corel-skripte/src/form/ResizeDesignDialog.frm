VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} ResizeDesignDialog 
   Caption         =   "Designs skalieren"
   ClientHeight    =   2260
   ClientLeft      =   30
   ClientTop       =   370
   ClientWidth     =   5510
   StartUpPosition =   1  'Fenstermitte
   TypeInfoVer     =   16
End
Attribute VB_Name = "ResizeDesignDialog"
Attribute VB_Base = "0{7CB2CE3B-E520-45BF-83DB-A2656D631444}{CEFF8B18-6CD5-4419-9B46-7E1AA096C799}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


Dim selectedDesign As productDesign

Dim cancelTextboxChangeEvent As Boolean


Private Sub UserForm_Initialize()
    ResizeDesignDialog.WidthTextBox.value = "0"
    ResizeDesignDialog.HeightTextBox.value = "0"
End Sub

Private Sub cmdClose_Click()
    Hide
    Set selectedDesign = Nothing
End Sub


Private Sub ProportionalCheckBox_Click()
    
    If Not ResizeDesignDialog.WidthTextBox.value = "" Then
        updateWidthProportion
    ElseIf Not ResizeDesignDialog.HeightTextBox.value = "" Then
        updateHeightProportion
    End If
    
End Sub

Private Sub StartButton_Click()
    Hide
    
    On Error GoTo Error
    Dim w As Double
    w = CDbl(WidthTextBox.value)
    Dim h As Double
    h = CDbl(HeightTextBox.value)
    On Error GoTo 0
    
    Set selectedDesign = Nothing
    
    ResizeDesign.startResizeDesign w, h, RelativeCheckBox.value
    
    Exit Sub
Error:
    On Error GoTo 0
    MsgBox "Bitte nur Zahlen eingeben!", vbExclamation
    
    Show vbModal
End Sub


Private Sub WidthTextBox_Change()
    If cancelTextboxChangeEvent Then
        cancelTextboxChangeEvent = False
        Exit Sub
    End If
    
    If Not IsNumeric(WidthTextBox.value) Then
        If Not WidthTextBox.value = "" Then
            WidthTextBox.value = left(WidthTextBox.value, Len(WidthTextBox.value) - 1)
        End If
        Cancel = True
        Exit Sub
    End If
    
    If ResizeDesignDialog.ProportionalCheckBox.value And Not ResizeDesignDialog.WidthTextBox.value = "" And Not getSelectedDesignProportion = 0 Then
        cancelTextboxChangeEvent = True
        ResizeDesignDialog.HeightTextBox.value = CDbl(ResizeDesignDialog.WidthTextBox.value) / getSelectedDesignProportion
    End If
End Sub


Private Sub HeightTextBox_Change()
    If cancelTextboxChangeEvent Then
        cancelTextboxChangeEvent = False
        Exit Sub
    End If

    If Not IsNumeric(HeightTextBox.value) Then
        If Not HeightTextBox.value = "" Then
            HeightTextBox.value = left(HeightTextBox.value, Len(HeightTextBox.value) - 1)
        End If
        Cancel = True
        Exit Sub
    End If

    If ResizeDesignDialog.ProportionalCheckBox.value And Not ResizeDesignDialog.HeightTextBox.value = "" And Not getSelectedDesignProportion = 0 Then
        cancelTextboxChangeEvent = True
        ResizeDesignDialog.WidthTextBox.value = CDbl(ResizeDesignDialog.HeightTextBox.value) * getSelectedDesignProportion
    End If
End Sub


Private Function updateWidthProportion()
    If ResizeDesignDialog.ProportionalCheckBox.value And Not ResizeDesignDialog.WidthTextBox.value = 0 And Not getSelectedDesignProportion = 0 Then
        ResizeDesignDialog.HeightTextBox.value = CDbl(ResizeDesignDialog.WidthTextBox.value) / getSelectedDesignProportion
    End If
End Function


Private Function updateHeightProportion()
    If ResizeDesignDialog.ProportionalCheckBox.value & Not ResizeDesignDialog.HeightTextBox.value = 0 And Not getSelectedDesignProportion = 0 Then
        ResizeDesignDialog.WidthTextBox.value = CDbl(ResizeDesignDialog.HeightTextBox.value) / getSelectedDesignProportion
    End If
End Function

Private Function getSelectedDesignProportion() As Double
        
    ' TODO von Globals.getSelectedDesignsOrAll mit einem Suchlimit (TODO) von 1 suchen
    ' und Code unten ersetzen
        
    Dim selectedShape As shape
    
    If Not ActiveShape Is Nothing Then
        Set selectedShape = ActiveShape
    Else
        Set selectedShape = ActiveLayer.shapes.First
    End If
    
    
    If Not selectedShape Is Nothing Then
        
        If selectedShape.Type = cdrGroupShape Then
            
            Dim design As New productDesign
            design.newProductDesign selectedShape
            
            If design.isValidProductDesign Then
                Set selectedDesign = design
            End If
        End If
    End If
    
    If Not selectedDesign Is Nothing Then
        Dim layer As ProductDesignLayer
        Set layer = design.getLayers.getLayer(1)
        getSelectedDesignProportion = layer.getMainShape.SizeWidth / layer.getMainShape.SizeHeight
    End If
    
End Function



