Attribute VB_Name = "PersistentShapeHandler"

' ACHTUNG !!!
' Eigentlich benötigt jedes Dokument seinen eigenen Handler, da die StaticIDs



Dim documentHandlers As New Dictionary

Public Function getDocumentHandlerForShape(shape As shape, Optional logger As logger) As PersistentShapeDocumentHandler
    Set getDocumentHandlerForShape = getDocumentHandler(Globals.getDocumentOfShape(shape), logger)
End Function

Public Function getDocumentHandler(document As document, Optional logger As logger) As PersistentShapeDocumentHandler
    
    If Not logger Is Nothing Then logger.addTab , "[PersistentShapeHandler.getDocumentHandler]"
    
    Dim result As PersistentShapeDocumentHandler
    If documentHandlers.Exists(document) Then
        Set result = documentHandlers.item(document)
    Else
        Set result = New PersistentShapeDocumentHandler
        result.init document
        If Not logger Is Nothing Then logger.logINFO "Neuen PersistentShapeDocumentHandler erstellt"
        documentHandlers.add document, result
    End If
    
    Set getDocumentHandler = result
    If Not logger Is Nothing Then
        logger.logINFO "Returne: " & Globals.documentToString(getDocumentHandler.document) & " ObjectID: '" & getDocumentHandler.objectID & "'"
        logger.removeTab
    End If
End Function

Public Function getShape(shape As shape, Optional logger As logger) As PersistentShape
    If Not logger Is Nothing Then logger.addTab , "[PersistentShapeHandler.getShape]"
    
    Set getShape = getDocumentHandlerForShape(shape, logger).getShape(shape, logger)
    
    If Not logger Is Nothing Then logger.removeTab
End Function


