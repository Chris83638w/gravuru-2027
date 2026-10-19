Attribute VB_Name = "DesignVariantCreator"
Public Sub Start()
    
    Globals.endIfNoDocumentOpen
    
    ' Einstellungen öffnen
    DesignVariantDialog.Show vbModal
        
End Sub


Public Sub CreateDesignVariantMacro()
    
    Globals.startMacro

    If Not Globals.debugHistory Then
        CorelScriptTools.BeginWaitCursor
        ActiveDocument.BeginCommandGroup "FancyExport"
        If Not Globals.debugErrors Then On Error GoTo MacroError
    End If

    createDesignVariant
    
        
    If Not Globals.debugHistory Then Globals.endMacro True

    Exit Sub
MacroError: 'Alle Fehler hier abfangen und die CommandGruppe beenden, damit man mit einem Schritt zurück gehen kann (STRG + Z), auch wenn ein Fehler aufgetreten ist
    MsgBox Err.Description & ", " & Err.number, vbCritical
    ProgressBarUserForm.Hide
    Globals.endMacro True
    
End Sub

Public Function createDesignVariant()
    
    ' Muss gemacht werden, da beim Gruppieren einer Form die Auswahl verändert wird (ActiveSelectionRange)
    Dim selectionSnapShot As shapeRange
    Set selectionSnapShot = Globals.sortShapeRangeToMatchZIndex(ActiveSelectionRange)
    
    Dim currentShape As shape
    Dim lastShape As shape
    
    For i = 1 To selectionSnapShot.count
        
        
        Set currentShape = selectionSnapShot(i)
        
        ' Wenn das Shape schon eine Gruppe ist und keinen Namen hat, muss nicht nochmal gruppiert werden
        ' Und wenn es schon eine Design-Varianten-Gruppe dann auch nicht nochmal gruppieren
        If Not (currentShape.Type = cdrGroupShape And currentShape.name = "") And Not Globals.startsWith(currentShape.name, "desVar(") Then
            Set currentShape = Globals.groupShapes(Globals.shapeToShapeRange(currentShape))
        End If
        
        Let designVarNr = DesignVariantDialog.designVariantGroupNr
        ' Es kann sein, dass das Dialogfenster noch nicht angezeigt wurde und deshalb auch nicht initialisiert ist.
        ' Dann ist 'DesignVariantDialog.designVariantGroupNr' == 0 obwohl bei 1 angefangen wird
        If designVarNr = 0 Then designVarNr = 1
        
        
        currentShape.name = "desVar(" & CStr(designVarNr) & ")"
        
        Set lastShape = currentShape
        Set currentShape = Nothing
    Next i
    
    
    ' Andere Design-Varianten unsichtbar machen
    ' ---------------------------------------------
    If Not lastShape Is Nothing Then
        Dim parentGroup As shape
        Set parentGroup = lastShape.parentGroup
        
        ' Wenn man Designvarianten nicht in einer Designgruppe/DesignLayergruppe erstellt, gibt es keine parentGroup
        If parentGroup Is Nothing Then GoTo Skip
        
        For i = 1 To parentGroup.shapes.count
            Set currentShape = parentGroup.shapes(i)
            
            If Globals.isDesignElementVariantShapeType(currentShape) And Not currentShape Is lastShape Then
                
                ' Nur wenn beide Designvarianten von der selben Gruppe sind..
'                        MsgBox "Vergleiche '" & Globals.getDesignElementVariantNr(currentShape) & "' mit '" & Globals.getDesignElementVariantNr(lastShape) & "'"
                If Globals.getDesignElementVariantNr(currentShape) = Globals.getDesignElementVariantNr(lastShape) Then
                    currentShape.visible = False
                End If
            End If
            
            Set currentShape = Nothing
        Next i
    End If
Skip:
    ' ---------------------------------------------
    

End Function

