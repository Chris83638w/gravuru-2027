Attribute VB_Name = "PersistentShapeDocumentHandler"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False

Public document As document

Public persistentShapes As collection
Public staticIDToPersistentShape As Dictionary

Public objectID As Integer


Public Function init(theDocument As document, Optional logger As logger)
    Set document = theDocument
    Set staticIDToPersistentShape = New Dictionary
    Set persistentShapes = New collection
    objectID = Globals.getNextObjectID
End Function


Public Function getShape(shape As shape, Optional logger As logger) As PersistentShape
    
    If Not logger Is Nothing Then logger.addTab , "[PersistentShapeDocumentHandler.getShape] objectID: '" & objectID & "'"
    
    If isShapeAlreadyAdded(shape) Then
        Set getShape = staticIDToPersistentShape.item(shape.staticID)
    Else
        Set getShape = addShape(shape, True, logger)
    End If
    
    If Not logger Is Nothing Then logger.removeTab
    
End Function


Public Function addShape(shape As shape, Optional skipExistCheck As Boolean, Optional logger As logger) As PersistentShape
    
    If Not logger Is Nothing Then logger.addTab , "[PersistentShapeDocumentHandler.addShape] objectID: '" & objectID & "', shape: " & Globals.shapeToString(shape) & ", " & (staticIDToPersistentShape Is Nothing)
    
    If Not skipExistCheck Then
        If isShapeAlreadyAdded(shape) Then Exit Function ' Exestiert schon
    End If
    
    Dim pShape As New PersistentShape
    pShape.setShape shape
    
    Set pShape.documentHandler = PersistentShapeHandler.getDocumentHandlerForShape(shape, logger)
    
    persistentShapes.add pShape
    staticIDToPersistentShape.add shape.staticID, pShape
    
    Set addShape = pShape
    If Not logger Is Nothing Then logger.removeTab
End Function

' Wichtig ist, dass 'oldStaticID' als ByVal angegeben wird. Denn pShape.setShape verändert ihn, was ihn dann auch hier ändern würde
Public Function swapShape(ByVal oldStaticID As Long, newShape As shape, Optional logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[PersistentShapeDocumentHandler.swapShape]"
    
    Dim pShape As PersistentShape
    For Each pShape In persistentShapes
        If pShape.getStaticID = oldStaticID Then
            pShape.setShape newShape
            
            staticIDToPersistentShape.Remove oldStaticID
            staticIDToPersistentShape.add newShape.staticID, pShape
            
            If Not logger Is Nothing Then logger.logINFO "Shape gefunden und getauscht"
            GoTo ExitFunction
        End If
    Next pShape
    
    Err.Raise vbObjectError + 513, , "[PersistentShapeDocumentHandler.swapShape] oldStaticID '" & oldStaticID & "' nicht gefunden"
ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function isShapeAlreadyAdded(shape As shape) As Boolean
    isShapeAlreadyAdded = staticIDToPersistentShape.Exists(shape.staticID)
End Function
