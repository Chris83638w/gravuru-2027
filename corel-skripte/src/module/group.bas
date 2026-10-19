Attribute VB_Name = "Group"

' Sucht nach sich überlappenden Formen und gruppert diese.

Dim selection As shapeRange
Dim unselectedShapes As shapeRange


' TODO umbenennen zu Autogroup, damit man es mit einem normalen Group der vom User kommt, wo er mehrere Formen selber gewählt hat nicht verwechselt wird
Sub group()
    Globals.endIfNoDocumentOpen
    
    startGroup False
End Sub



Function startGroup(quietMode As Boolean, Optional logger As logger)
    
    If Not logger Is Nothing Then
        logger.logINFO "[Group.startGroup] quietMode: " & quietMode
        logger.addTab
    End If
    
    If Not Globals.debugHistory And Not quietMode Then
        CorelScriptTools.BeginWaitCursor
        ActiveDocument.BeginCommandGroup "Automatisch gruppieren"
        If Not Globals.debugErrors Then On Error GoTo MacroError
    End If
    
    ' Auswahl
    Set selection = Globals.getSelectedShapesOrAll
    
    ' Wenn eine Form bereits in einer Gruppe ist, dann sorgt es nur für Probleme diese neu zu gruppieren
    ' -------------------------------------------
    Dim i As Integer
    i = 1
    While i <= selection.count
        ' Wenn die Form eine Obergruppe hat, ignorieren
        If Not selection(i).parentGroup Is Nothing Then
            selection.Remove i
            i = i - 1
        End If
        i = i + 1
    Wend
    ' -------------------------------------------
    
    
    Set unselectedShapes = ActivePage.shapes.All
    unselectedShapes.RemoveRange selection
    
    If Not quietMode Then
        ProgressBarUserForm.Start
    End If
    
    Dim selectionCountAtStart As Integer
    selectionCountAtStart = selection.count
    
    While selection.count > 0
        searchIntersections selection(1), logger
        
        If Not quietMode Then
            ProgressBarUserForm.setProgress (selectionCountAtStart - selection.count) / selectionCountAtStart
        End If
        
        selection.Remove 1
    Wend
    
    If Not quietMode Then ProgressBarUserForm.Hide
    
    ' (Globals.endMacro) True muss hier stehen, da sonst das Macro absichtlich beendet wird. Dadurch gehen Variablenwerte verloren.
    ' Somit ist 'initialized' auch false und die GUI wird immer zurückgesetzt
    If Not Globals.debugHistory And Not quietMode Then Globals.endMacro True
    GoTo ExitFunction
MacroError: 'Alle Fehler hier abfangen und die CommandGruppe beenden, damit man mit einem Schritt zurück gehen kann (STRG + Z)
    Dim errorDescription As String
    errorDescription = Err.Description
    Dim errorNumber As String
    errorNumber = Err.number
    MsgBox errorDescription & ", " & errorNumber, vbCritical
    If Not logger Is Nothing Then logger.logFATAL errorDescription & ", Nr. " & errorNumber
    If Not quietMode Then Globals.endMacro True
ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
End Function



' Hier werden überlappungen mit 'shape' gesucht und dann zusammen gruppiert
Private Function searchIntersections(shape As shape, Optional logger As logger)
    
    If Not logger Is Nothing Then
        logger.logINFO "[Group.searchIntersections] shape: '" & Globals.getShapeDisplayName(shape) & "'"
        logger.addTab
    End If
    

    Dim intersectingShapes As New shapeRange
    intersectingShapes.add shape

    Dim shapeIndex As Integer
    shapeIndex = Globals.getShapeIndexInParentGroup(shape)
    
    
    If Not logger Is Nothing Then logger.logFINE "Überlappende Formen in der Auswahl suchen selection.count: '" & selection.count & "' :"
    
    ' 1. Zunächst nach Überlappungen zwischen dem 'shape' und der 'selection' suchen
    ' ========================================
    findIntersectingShapes shapeIndex, intersectingShapes, selection, False, logger

    ' 2. Überlappungen zwischen ('shape' welcher in 'intersectingShapes' ist &) 'intersectingShapes' mit anderen Formen, die anfangs nicht ausgewählt waren finden : 'unselectedShapes'
    ' ========================================
    If Not logger Is Nothing Then logger.logFINE "Überlappende Formen außerhalb der Auswahl suchen unselectedShapes.count: '" & unselectedShapes.count & "' :"
    findIntersectingShapes 1, intersectingShapes, unselectedShapes, False, logger



    ' Zuletzt die uberlappenden Formen gruppieren
    groupIntersectingShapes intersectingShapes, logger


    If Not logger Is Nothing Then logger.removeTab

    'searchIntersections = selection.Count = 1
End Function




Private Function findIntersectingShapes(shapeIndex As Integer, ByRef alreadyIntersecting As shapeRange, ByRef shapesToCheck As shapeRange, onlyCheckShapesBelow As Boolean, Optional logger As logger)

RestartIntersectionSearch:

    For i = shapeIndex To shapesToCheck.count

        Dim currShape As shape
        Set currShape = shapesToCheck(i)
        If Not logger Is Nothing Then logger.logINFO "- currShape: '" & Globals.getShapeDisplayName(currShape) & "'"

        If Not alreadyIntersecting.Exists(currShape) Then
            If intersection(alreadyIntersecting.boundingBox, currShape) Then
                alreadyIntersecting.add currShape
                shapesToCheck.Remove i
                
                If Not logger Is Nothing Then logger.logINFO "- Überlappende Form gefunden currShape: '" & Globals.getShapeDisplayName(currShape) & "'"
                
                ' Sobald eine neue Form gefunden wurde und zu den 'gefundenen' Formen hinzugefügt wird, kann es neue Überlappungen geben.
                ' Aber eben auch mit Formen, die schon untersucht wurden (als die neue Form noch nicht dazu gehörte)
                GoTo RestartIntersectionSearch
            End If
        End If

        Set currShape = Nothing
    Next i

End Function


Private Function groupIntersectingShapes(intersectingShapes As shapeRange, Optional logger As logger)
    
    If Not logger Is Nothing Then
        logger.logINFO "[Group.groupIntersectingShapes]"
        logger.addTab
    End If
    
    If Not intersectingShapes.count = 1 Then
        
        Dim designs As shapeRange
        Set designs = newCustomShapeTypeQuery(intersectingShapes, designShape).setRecursive(False).setContinueSearchInMatchedGroups(False).search
        
        ' Wenn es bei den gefundenen überlappenden Formen mind. ein Design gibt,
        If designs.count > 0 Then
            Dim design As New productDesign
            design.newProductDesign designs.firstShape
            
            If Not logger Is Nothing Then logger.logINFO "Design gefunden: '" & Globals.getShapeDisplayName(design.getDesignShape) & "'"
            
            For l = 1 To design.getLayers.count
                For s = 1 To intersectingShapes.count
                    
                    ' DesignShape kann nicht zu sich selbst geordert werden
                    If Not intersectingShapes(s) Is design.getDesignShape Then
                        If Globals.areRectanglesOverlapping(design.getLayers.getLayer(l).layerShape.boundingBox, intersectingShapes(s).boundingBox) Then
                            
                            
                            ' TODO besser prüfen, ob es noch Designvarianten wie Abstandshalter gibt.
                            ' Denn dann besser dahinter packen
                            Globals.safeOrderShapeFrontOf intersectingShapes(s), design.getLayers.getLayer(l).layerShape.shapes.First
                            'intersectingShapes(s).OrderFrontOf design.getLayers.getLayer(l).layerShape.shapes.First
                        End If
                    End If
                Next s
                
            Next l
            
            Set design = Nothing
        Else
            'Gefundene überlappende Formen gruppieren
            Dim grouped As shape
            Set grouped = intersectingShapes.group
        End If
        
        Set designs = Nothing
    End If
    
    If Not logger Is Nothing Then logger.removeTab
    
End Function


Private Function intersection(selectionBoundingBox As rect, shapeB As shape) As Boolean
    
    intersection = False

    If selectionBoundingBox.left < shapeB.boundingBox.Right And selectionBoundingBox.Right > shapeB.boundingBox.left And selectionBoundingBox.Bottom < shapeB.boundingBox.top And selectionBoundingBox.top > shapeB.boundingBox.Bottom Then
        intersection = True
        'MsgBox "intersection of " & shapeB.name
    End If

End Function
