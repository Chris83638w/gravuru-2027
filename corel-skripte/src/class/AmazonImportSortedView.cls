Attribute VB_Name = "AmazonImportSortedView"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
' Stellt eine View in CorelDRAW beim importieren einer Amazon-JSON aus der Amazon-ZIP dar, die aus eine oder mehrere JSON-Views besteht.
' Diese JSON-Views werden umsortiert zu eine "sorted" View.
' Es können nämlich Views aus der JSON ignoriert oder kombiniert werden. So können dann bspw. Texte aus einer View mit dem Foto aus einer anderen View auf ein Design(Part) erscheinen


Dim jsonViews As New collection ' Beinhaltet AmazonImportJSONView Objekte
Dim shapesForViewFitting As shapeRange
Dim layerShapes As shapeRange
Dim parts As ProductDesignPartRange


Public Function getJSONViewDataCount() As Integer
    getJSONViewDataCount = jsonViews.count
End Function
'

Public Function getJSONViewData(ByVal index As Integer) As AmazonImportJSONView
    Set getJSONViewData = jsonViews(index)
End Function



Public Function getLayerShapes() As shapeRange
    If layerShapes Is Nothing Then
        Set layerShapes = New shapeRange
        For v = 1 To jsonViews.count
            layerShapes.AddRange getJSONViewData(v).getPartsLayersAsShapeRange
        Next v
    End If
    
    Set getLayerShapes = layerShapes
End Function

Public Function invalidateLayerShapes()
    Set layerShapes = Nothing
End Function



Public Function getParts(Optional logger As logger) As ProductDesignPartRange
    If Not logger Is Nothing Then logger.addTab , "[AmazonImportSortedView.getParts]"
    
    If parts Is Nothing Then
        Set parts = New ProductDesignPartRange
        
        If Not logger Is Nothing Then logger.logINFO "jsonViews.Count: '" & jsonViews.count & "'"
        
        If Not logger Is Nothing Then logger.logINFO "Initialisiere parts..."
        
        If Not logger Is Nothing Then logger.logINFO "getJSONViewDataCount: " & getJSONViewDataCount
        For i = 1 To getJSONViewDataCount
            
            If Not logger Is Nothing Then logger.logINFO "i: " & i & ", getJSONViewData(i).getPartsCount: " & getJSONViewData(i).getPartsCount
            For p = 1 To getJSONViewData(i).getPartsCount
                
                If Not logger Is Nothing Then logger.logINFO "added part # p: " & p & ""
                
                parts.add getJSONViewData(i).getPart(p)
            Next p
        Next i
    
    Else
        If Not logger Is Nothing Then logger.logINFO "parts schon initialisiert"
    End If
    
    If Not logger Is Nothing Then logger.logINFO "parts.Count: '" & parts.count & "'"
    Set getParts = parts
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function getPart(index As Integer) As ProductDesignPart
    Set getPart = getParts.getPart(index)
End Function


Public Function invalidateParts(Optional logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[AmazonImportSortedView.invalidateParts]"
    Set parts = Nothing
    If Not logger Is Nothing Then logger.removeTab
End Function



Public Function getShapesForViewFitting(Optional logger As logger) As shapeRange
    If Not logger Is Nothing Then logger.addTab , "[AmazonImportSortedView.getShapesForViewFitting] "
    
    If shapesForViewFitting Is Nothing Then
        Set shapesForViewFitting = New shapeRange
        
        If Not logger Is Nothing Then logger.logINFO "Initialisiere shapesForViewFitting..."
        
        ' Loggen
        getParts logger
        
        For p = 1 To getParts.count
            Dim part As ProductDesignPart
            Set part = getParts.getPart(p)
            
            Globals.safeAddShapeRangeToShapeRange part.getShapesForViewFitting, shapesForViewFitting
            'shapesForViewFitting.AddRange, part.getShapesForViewFitting
            
            Set part = Nothing
        Next p
        
    Else
        If Not logger Is Nothing Then logger.logINFO "shapesForViewFitting schon initialisiert"
        getParts logger
    End If
    
    If Not logger Is Nothing Then logger.logINFO "shapesForViewFitting.Count: '" & shapesForViewFitting.count & "'"
    Set getShapesForViewFitting = shapesForViewFitting
    If Not logger Is Nothing Then logger.removeTab
End Function

Public Function invalidateShapesForViewFitting()
    Set shapesForViewFitting = Nothing
End Function



Public Function addJSONView(view As AmazonImportJSONView, Optional logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[AmazonImportSortedView.addJSONView]"
    If Not logger Is Nothing Then view.debugPrint logger
    jsonViews.add view
    invalidateAll logger
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function invalidateAll(Optional logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[AmazonImportSortedView.invalidateAll]"
    invalidateLayerShapes
    invalidateParts logger
    invalidateShapesForViewFitting
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function debugPrint(logger As logger) As String
    logger.addTab , "[AmazonImportSortedView.debugPrint]"
    
    logger.logINFO "Parts:"
    For i = 1 To getParts.count
        Dim part As ProductDesignPart
        Set part = getParts.getPart(i)
        
        logger.logINFO "- Part #" & part.getPartIndex
        
        Set part = Nothing
    Next i
    
    
    logger.logINFO "jsonViews.count: '" & jsonViews.count & "'"
    For i = 1 To jsonViews.count
        logger.logINFO "getJSONViewData('" & i & "').objectID: #'" & getJSONViewData(i).objectID & "'"
    Next i
    
    logger.removeTab
End Function


Public Function findLayerOfShape(shape As shape, Optional logger As logger) As ProductDesignLayer
    
    ' In einer View können Parts von verschiedenen Designs liegen
    Dim designs As New collection
    For i = 1 To parts.count
        Globals.addToCollectionIfNotAlready designs, parts.getPart(i).getDesign
    Next i
    
    For i = 1 To designs.count
        Dim result As ProductDesignLayer
        Set result = designs(i).findLayerOfShape(shape, logger)
        
        If Not result Is Nothing Then Exit Function
    Next i
End Function


' Färbt die Hauptformen so ein, dass die Materialauswahl des Kunden sichtbar wird.
' Das hat im Allgemeinen aber vorallem bei Schablonen den Vorteil, dass man besser sehen kann,
' wieveiele und welche Materialien man benötigt um eine Maschine zu bestücken
Public Function colorizeMainShapesOfPartsByGroundplateSelection()
    
    Dim i As Integer
    For i = 1 To getJSONViewDataCount
        If Not getJSONViewData(i).material = mtUnknown Then
            colorizeMainShapesOfParts getJSONViewData(i).material
            Exit Function
        End If
    Next i
    
End Function


Private Function colorizeMainShapesOfParts(material As MaterialType)
    
    Dim fillColor As color
    
    Dim colorString As String
    Select Case material
        Case mtAcrylicClear
        Case mtAcrylicSatin: colorString = "CCCCCC"
        Case mtAcrylicAnthrazit: colorString = "586470"
        Case mtAcrylicBlack: colorString = "666666"
    End Select
    If colorString = "" Then Exit Function
    
    Set fillColor = CreateColor("#" & colorString)
    
    Dim i As Integer
    For i = 1 To getParts.count
        Dim gravingMainShapes As shapeRange
        Set gravingMainShapes = getParts.collectLayersByManufacturingMethod(True).collectMainShapes
        
        If Not gravingMainShapes.count = 0 Then Globals.setShapeRangeColor gravingMainShapes, fillColor, Nothing
        
        Set gravingMainShapes = Nothing
    Next i
    
End Function

