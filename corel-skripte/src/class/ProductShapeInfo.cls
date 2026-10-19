Attribute VB_Name = "ProductShapeInfo"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False

Public name As String

' In mm
Public width As Double
Public height As Double
Public area As Double
Public subShapes As New collection '(Rect) Boundingboxen. 'subShapes' sind nur die tatsächlichen subPaths nicht aber die (größte) Hauptform

Dim mainShape As shape
Dim smallerShapes As shapeRange

Public Function newFromShape(mainShapeVar As shape, Optional smallerShapesVar As shapeRange = Nothing, Optional nameVar As String = "ignore", Optional quietMode As Boolean = False, Optional logger As logger)
    
    Set mainShape = mainShapeVar
    Set smallerShapes = smallerShapesVar
    
    name = nameVar
    
    width = ActiveDocument.FromUnits(mainShape.SizeWidth, cdrMillimeter)
    height = ActiveDocument.FromUnits(mainShape.SizeHeight, cdrMillimeter)
    area = ActiveDocument.FromUnits(Globals.getAreaOfMainShapeAndSmallerShapes(mainShape, smallerShapesVar, , quietMode, logger), cdrMillimeter)
    
    updateSubShapes
    
End Function


Public Function newFromCSVStringArray(strArr() As String, rowIndex As Integer)

    name = strArr(rowIndex, 0)
    width = CDbl(strArr(rowIndex, 1))
    height = CDbl(strArr(rowIndex, 2))
    area = CDbl(strArr(rowIndex, 3))
    
    
    ' Vorherige Daten löschen
    Globals.clearCollection subShapes
    
    Dim subPathsArray() As String
    subPathsArray = Split(strArr(rowIndex, 4), "___")
    For j = 0 To UBound(subPathsArray)
        Dim boundingBoxValues() As String

        boundingBoxValues = Split(subPathsArray(j), "|")

        Dim boundingBox As New rect
        boundingBox.SetRect boundingBoxValues(0), boundingBoxValues(1), boundingBoxValues(2), boundingBoxValues(3)

        subShapes.add boundingBox
        Set boundingBox = Nothing
    Next j

End Function


Public Function toString() As String
    
    
    Dim subPathsString As String
    
    For i = 1 To subShapes.count
        
        ' Wenn schon was im String ist und wir jetzt etwas neues hinzufügen wollen, ...
        If Not subPathsString = "" Then
            subPathsString = subPathsString & "___" ' ... wird ein Trennzeichen gesetzt
        End If
        
        Dim currentBoundingBox As rect
        Set currentBoundingBox = subShapes(i)
        
        subPathsString = subPathsString & currentBoundingBox.left & "|" & currentBoundingBox.Bottom & "|" & currentBoundingBox.width & "|" & currentBoundingBox.height
        
        Set currentBoundingBox = Nothing
    Next i
    
    Dim str As String
    str = name & ";" & width & ";" & height & ";" & area & ";" & subPathsString
    
    toString = str
End Function


Private Function updateSubShapes()
    
    ' Vorherige Daten löschen
    Globals.clearCollection subShapes
    
    
    ' Nur Kurven können Löcher/Ausschnitte haben (Wie das Loch bei einem O)
    ' Andere Formen wie Rechteck, Kreis sind vollflächig
    If mainShape.Type = cdrCurveShape Then
        
        Dim biggestSubPathIndex As Integer
        biggestSubPathIndex = Globals.getBiggestSubPathIndex(mainShape.curve.subPaths)
            
        For i = 1 To mainShape.curve.subPaths.count
            If Not i = biggestSubPathIndex Then
                addSubPathBoundingBox mainShape.curve.subPaths(i).boundingBox
            End If
        Next i
        
    End If
    
    If Not smallerShapes Is Nothing Then
        For i = 1 To smallerShapes.count
            Dim currentShape As shape
            Set currentShape = smallerShapes(i)
            
            addSubPathBoundingBox currentShape.boundingBox
            
            Set currentShape = Nothing
        Next i
    End If
    
End Function

Private Function addSubPathBoundingBox(boundingBox As rect)
    
    Dim relativeBoundingBox As New rect
    relativeBoundingBox.SetRect _
        ActiveDocument.FromUnits(boundingBox.left - mainShape.LeftX, cdrMillimeter), _
        ActiveDocument.FromUnits(boundingBox.Bottom - mainShape.BottomY, cdrMillimeter), _
        ActiveDocument.FromUnits(boundingBox.width, cdrMillimeter), _
        ActiveDocument.FromUnits(boundingBox.height, cdrMillimeter)

    subShapes.add relativeBoundingBox
End Function


Public Function equalsShapeInfo(shapeInfo As ProductShapeInfo) As Boolean
    
    equalsShapeInfo = ProductRecognizer.areShapeInfosEuqal(Me, shapeInfo)
    
End Function
