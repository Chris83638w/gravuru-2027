Attribute VB_Name = "ResizeDesign"

' Autor: Martin Afelt GRAVURU
'

Dim logger As logger

Dim quietMode As Boolean


Public Sub Start()
    Globals.endIfNoDocumentOpen

    ResizeDesignDialog.Show vbModal
End Sub



Public Function startResizeDesign(newWidth As Double, newHeight As Double, relativeSize As Boolean, Optional quietModeVar As Boolean = False, Optional loggerVar As logger)
    
    quietMode = quietModeVar
    
    If Not quietMode Then
        If Not Globals.debugHistory Then
            CorelScriptTools.BeginWaitCursor
            ActiveDocument.BeginCommandGroup "ResizeDesigns"
        End If
        If Not Globals.debugErrors Then On Error GoTo MacroError
    End If
    
    If loggerVar Is Nothing Then
        Set logger = New logger
        logger.init "Design-Skalierer"
    Else
        ' Wenn diese Funktion von einem anderen Skript ausgeführt wird,
        ' dann kann auch der Logger vom anderen Skript genutzt werden
        Set logger = loggerVar
    End If
    
    logger.addTab , "[ResizeDesign.startResizeDesign]"
    
    Dim unitsBefore As cdrUnit
    unitsBefore = ActiveDocument.unit
    ActiveDocument.unit = cdrMillimeter
    
    Dim selectedDesigns As collection
    Set selectedDesigns = Globals.getSelectedDesignsOrAll(, , True, , False, , False, False)
    
    With ProgressBarUserForm.newSubProgress(selectedDesigns.count)
        For i = 1 To selectedDesigns.count
            Dim currentDesign As productDesign
            Set currentDesign = selectedDesigns(i)
            
            .setDisplayText "Design skalieren " & currentDesign.getProductID
            
            currentDesign.scaleDesign newWidth, newHeight, relativeSize, True, logger
            
            Set currentDesign = Nothing
            
            .setStepsProgress i
        Next i
        
        .finishProgress
    End With
    
    
    If Not quietMode Then
        ActiveDocument.unit = unitsBefore
        If Not Globals.debugHistory Then Globals.endMacro True
    End If
    
    If Not logger Is Nothing Then logger.removeTab
Exit Function
MacroError: 'Alle Fehler hier abfangen und die CommandGruppe beenden, damit man mit einem Schritt zurück gehen kann (STRG + Z), auch wenn ein Fehler aufgetreten ist
    MsgBox Err.Description & ", " & Err.number, vbCritical
    ProgressBarUserForm.Hide
    ActiveDocument.Dirty = False ' Nicht speicherbar machen
    If Not logger Is Nothing Then logger.removeTab
    Globals.endMacro True
End Function





