Attribute VB_Name = "AmazonConvertPreset"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
Public preset As shape

'Iterieren um die nächste TextBox zu bekommen
Public textIndex As Integer
Public textLinesOrBoxes As collection 'In einer Box platzierter Text oder frei platzierbarer Text



'TIPP Für ganzflächige/frei platzierbare Bilder einfach eine Uploadbox über das gesamte Design machen
Public imageIndex As Integer
Public imageBoxes As collection

Public rotated As Boolean

Public rotationBefore As Double

Public loaded As Boolean

'Public konfiOffsetX As Double
'Public konfiOffsetY As Double
'
'Public konfiScale As Double

Public Function init(presetShape As shape)
    'MsgBox "Init"
    
'    If Globals.isShapeDeleted(presetShape) Then
'        Err.Raise vbObjectError + 513, , "[AmazonConvertPreset.init] Die Referenz zu 'presetShape' ist ungültig"
'    End If
    
    Set preset = presetShape
    
    Set textLinesOrBoxes = New collection
    Set imageBoxes = New collection
    findBoxesToEdit preset
    
    If preset.RotationAngle > 45 Or preset.RotationAngle < -45 Then
        rotated = True
    End If
    
    
    
    
'    konfiOffsetX = 53.55
'    konfiOffsetY = 21.17
'    konfiScale = 0.556

End Function


Private Function findBoxesToEdit(shape As shape)
        
        
    For i = 1 To shape.shapes.count
    
        If shape.shapes(i).Type = cdrGroupShape Then
            findBoxesToEdit shape.shapes(i)
        End If
        
        If shape.shapes(i).Type = cdrTextShape Then
        
            'MsgBox "Text " & shape.shapes(i).text.Story.text & " IsArtisticText=" & CStr(shape.shapes(i).text.IsArtisticText)
        
            
            ' .Text.IsArtisticText
            
            textLinesOrBoxes.add shape.shapes(i)
            
        Else
        
            If shape.shapes(i).Type = cdrRectangleShape Or shape.shapes(i).Type = cdrCurveShape Or shape.shapes(i).Type = cdrEllipseShape Then
                If InStr(1, shape.shapes(i).name, "uploadbox") Then
                    imageBoxes.add shape.shapes(i)
                End If
            End If
        
        End If
        
    Next i

End Function



Public Function disableRotation()
    If rotated Then
        rotationBefore = preset.RotationAngle
        
        preset.RotationCenterX = preset.centerX
        preset.RotationCenterY = preset.centerY
        preset.rotate -preset.RotationAngle
    End If
End Function

Public Function restoreRotation()
    If rotated Then
        preset.RotationCenterX = preset.centerX
        preset.RotationCenterY = preset.centerY
        preset.rotate rotationBefore
    End If
End Function


Public Function isOnlyRDGWhite() As Boolean
    isOnlyRDGWhite = isOnlyRDGWhiteRecursive(preset)
End Function

Private Function isOnlyRDGWhiteRecursive(shape As shape) As Boolean
    
    isOnlyRDGWhiteRecursive = True
    
    If shape.Type = cdrGroupShape Then
        For i = 1 To shape.shapes.count
            If Not isOnlyRDGWhiteRecursive(shape.shapes(i)) Then
                isOnlyRDGWhiteRecursive = False
                Exit Function
            End If
        Next i
    Else
        If Globals.isShapeRDGWhiteShape(shape) Or Globals.isRedOrPinkShape(shape) Then
            
        Else
            isOnlyRDGWhiteRecursive = False
            Exit Function
        End If
    End If
    
End Function


