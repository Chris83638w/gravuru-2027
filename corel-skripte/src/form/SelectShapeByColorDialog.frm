VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} SelectShapeByColorDialog 
   Caption         =   "Formen nach Farbe suchen"
   ClientHeight    =   3730
   ClientLeft      =   30
   ClientTop       =   370
   ClientWidth     =   5510
   StartUpPosition =   1  'Fenstermitte
   TypeInfoVer     =   57
End
Attribute VB_Name = "SelectShapeByColorDialog"
Attribute VB_Base = "0{7D77EA93-D6C1-437D-8EC6-CF103FBB070E}{9414CADF-7AC4-428F-9954-64B1571D4E77}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False

    
Dim color As color
Dim secondColor As color

Private Function colorChanged(colorOneOrTwo As Boolean)
    
    Dim theColor As color
    Dim theButton As CommandButton
    
    If colorOneOrTwo Then
        If Not color Is Nothing Then Set theColor = color
        Set theButton = SelectShapeByColorDialog.ColorButton
    Else
        If Not secondColor Is Nothing Then Set theColor = secondColor
        Set theButton = SelectShapeByColorDialog.ColorButton2
    End If
    

    If Not theColor Is Nothing Then
       
        Dim rgbColor As New color
        rgbColor.CopyAssign theColor
        rgbColor.ConvertToRGB
       
        theButton.BackColor = RGB(rgbColor.RGBRed, rgbColor.RGBGreen, rgbColor.RGBBlue)
        theButton.Caption = theColor.name
    Else
        theButton.BackColor = Me.BackColor
        theButton.Caption = "Keine Farbe ausgewählt"
    End If
    
End Function


Private Function onTargetColorButtonClick(colorOneOrTwo As Boolean)
    If colorOneOrTwo Then
        Set theColor = color
    Else
        Set theColor = secondColor
    End If
    
    On Error GoTo ColorPickerError
    theColor.UserAssign
    On Error GoTo 0

    colorChanged colorOneOrTwo
    
    Exit Function
ColorPickerError:
    MsgBox Err.Description, vbCritical
End Function


Private Sub ColorButton_Click()
    onTargetColorButtonClick True
End Sub

Private Sub ColorButton2_Click()
    onTargetColorButtonClick False
End Sub

Public Function init()
    
    fillCheckBox.value = False
    outlineCheckBox.value = False
    
    Dim colorPickedFromSelectedShape As Boolean
    If Not ActiveShape Is Nothing Then
        
        ' Standartwerte
        outlineCheckBox.value = False
        fillCheckBox.value = False
        Set color = Nothing
        Set secondColor = Nothing
        
        If ActiveShape.CanHaveOutline Then
            If ActiveShape.outline.Type = cdrOutline Then
                ' Außenlinie
                copyAssingColorAndInitIfNot color, ActiveShape.outline.color
                colorPickedFromSelectedShape = True
                colorChanged True
                outlineCheckBox.value = True
            End If
        End If
            
        
        If Not colorPickedFromSelectedShape Then
            If ActiveShape.CanHaveFill Then
                If ActiveShape.fill.Type = cdrUniformFill Then
                    ' Füllung
                    copyAssingColorAndInitIfNot color, ActiveShape.fill.UniformColor
                    colorChanged True
                    fillCheckBox.value = True
                End If
            End If
        End If
    End If
End Function


Private Sub CutContourAndRDG_GLOSSButton_Click()
    copyAssingColorAndInitIfNot color, Globals.getPinkColor
    copyAssingColorAndInitIfNot secondColor, Globals.getRGDGloss
    
    colorChanged True
    colorChanged False
    
    fillCheckBox.value = False
    outlineCheckBox.value = True
End Sub


Private Sub CutContourButton_Click()
    copyAssingColorAndInitIfNot color, Globals.getPinkColor
    Set secondColor = Nothing
    
    colorChanged True
    colorChanged False
    
    fillCheckBox.value = False
    outlineCheckBox.value = True
End Sub


Private Sub RDG_GLOSSButton_Click()
    copyAssingColorAndInitIfNot color, Globals.getRGDGloss
    Set secondColor = Nothing
    
    colorChanged True
    colorChanged False
    
    fillCheckBox.value = False
    outlineCheckBox.value = True
End Sub


Private Sub RDG_WhiteButton_Click()
    Dim rdg_White As color
    Set rdg_White = Globals.getRGDWhite
    copyAssingColorAndInitIfNot color, rdg_White
    Set secondColor = Nothing
    
    colorChanged True
    colorChanged False
    
    fillCheckBox.value = True
    outlineCheckBox.value = False
End Sub


Private Function copyAssingColorAndInitIfNot(ByRef targetColor As color, ByVal sourceColor As color)
    If targetColor Is Nothing Then Set targetColor = New color
    If sourceColor.IsSpot Then
        targetColor.ConvertTo cdrColorSpot
    Else
        targetColor.ConvertToCMYK
    End If
    targetColor.CopyAssign sourceColor
End Function


Private Sub StartSearchButton_Click()
    SelectShapeByColor.Start color, secondColor, outlineCheckBox.value, fillCheckBox.value
    
    ' Wenn Formen gefunden wurden, dann das Dialogfenster schließen. Wenn nicht, dann soll das Fenster offen bleiben, damit man die Farben zum Suchen ändern kann
    If Not SelectShapeByColor.noShapesFoundLastSearch Then
        Hide
    End If
End Sub
