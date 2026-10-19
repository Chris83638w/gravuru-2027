Attribute VB_Name = "RenameJob"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
Public find As String
Public replace As String

' TODO umstellen auf CustomShapeTypeQuery
Dim shapeTypes As collection ' Standartmäßig sind alle Formen erlaubt
Dim shapeTypesArgument1 As collection
Dim shapeTypesArgument2 As collection


Public Function renameDesignShapes(design As productDesign)
    
    Dim flattenedShapes As shapeRange
    Set flattenedShapes = Globals.flattenGroupShape(design.getDesignShape, , True, False)
    
    For i = 1 To flattenedShapes.count
        Dim shape As shape
        Set shape = flattenedShapes(i)
        
        If isShapeTypeOK(shape) Then
            If InStr(shape.name, find) Then
                ' Interessanterweise lässt sich die Replace Funktion nicht aus Modulen aufrufen
                shape.name = Globals.Replace2(shape.name, find, replace)
            End If
        
        End If
        
        Set shape = Nothing
    Next i
    
End Function


Private Function isShapeTypeOK(shape As shape) As Boolean
    
    If shapeTypes Is Nothing Then
        isShapeTypeOK = True
        Exit Function
    End If
        
        
    For i = 1 To shapeTypes.count
        If newCustomShapeTypeQuery(shape, shapeTypes(i)).setArgument1(shapeTypesArgument1(i)).setArgument2(shapeTypesArgument2(i)).isShapesMatchingQueryNonRecursive Then
            isShapeTypeOK = True
            Exit Function
        End If
    Next i
    
End Function


Public Function addShapeType(shapeType As customShapeType, Optional argument1, Optional argument2)
    
    
    If shapeTypes Is Nothing Then Set shapeTypes = New collection
    If shapeTypesArgument1 Is Nothing Then Set shapeTypesArgument1 = New collection
    If shapeTypesArgument2 Is Nothing Then Set shapeTypesArgument2 = New collection
    
    shapeTypes.add shapeType
    shapeTypesArgument1.add argument1
    shapeTypesArgument2.add argument2
End Function
