Attribute VB_Name = "CustomShapeTypeQuery"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
Option Explicit

' Autor: Martin Afelt @ Gravuru
'
' Variablen-Namens-Vorschlag: shapeQuery
'
' Erlaubt es Formen innerhalb von 'range' zu suchen, die den Kriterien wie bspw. 'shapeType' ensprechen
' Oder zu prüfen, ob alle Formen in der 'range' den Kriterien entsprechen


Public range As shapeRange
Public shapeType As customShapeType
Public excludeGivenShape As Boolean
Public excludeInvisibleShapes As Boolean
Public recursive As Boolean ' True
Public recursionLimit As Integer ' = MAXINT
Public continueSearchInMatchedGroups As Boolean ' True
Public ignoreGroupsWithTooManyShapes As Boolean ' True
Public argument1 As Variant
Public argument2 As Variant
Public argument3 As Variant



Public Function init(shapeOrRange As Variant, shapeType_ As customShapeType)
    Set range = Globals.ensureShapeRange(shapeOrRange)
    shapeType = shapeType_
    recursive = True
    recursionLimit = Globals.MAXINT
    continueSearchInMatchedGroups = True
    ignoreGroupsWithTooManyShapes = True
    
    Select Case shapeType
        Case uploadBox
            continueSearchInMatchedGroups = False ' Wenn eine Uploadbox gefunden wurde, was ja eine Gruppe ist (TODO falsch. Nicht immer oder? Was ist mit Powerclips), muss innerhalb der Gruppe nicht gesucht werden, da es keine Uploadboxen in Uploadboxen gibt
        Case DesignElementShapeType
            continueSearchInMatchedGroups = False ' Eine als Designelement erkannte (reine) Gruppe ist atomar: ihre Kinder gehören zur Einheit und sollen nicht zusätzlich einzeln zurückkommen (verhindert Gruppe-und-Kinder-Überlappung, z.B. beim Duplizieren in copyPasteShapeRange)
    End Select
End Function


Public Function setShapeRange(range_ As shapeRange) As CustomShapeTypeQuery
    Set range = range_
    Set setShapeRange = Me
End Function


Public Function setShapeRangeByShape(shp As shape) As CustomShapeTypeQuery
    Set range = Globals.shapeToShapeRange(shp)
    Set setShapeRangeByShape = Me
End Function


Public Function setShapeType(shapeType_ As customShapeType) As CustomShapeTypeQuery
    shapeType = shapeType_
    Set setShapeType = Me
End Function


Public Function setExcludeGivenShape(excludeGivenShape_ As Boolean) As CustomShapeTypeQuery
    excludeGivenShape = excludeGivenShape_
    Set setExcludeGivenShape = Me
End Function


Public Function setExcludeInvisibleShapes(excludeInvisibleShapes_ As Boolean) As CustomShapeTypeQuery
    excludeInvisibleShapes = excludeInvisibleShapes_
    Set setExcludeInvisibleShapes = Me
End Function


Public Function setRecursive(recursive_ As Boolean) As CustomShapeTypeQuery
    recursive = recursive_
    Set setRecursive = Me
End Function


' Gibt an, wie viele Schichten tief in Gruppen gesucht werden darf
' Ist recursionLimit = 0, dann werden Childs von Gruppen garnicht durchsucht
Public Function setRecursionLimit(recursionLimit_ As Integer) As CustomShapeTypeQuery
    recursionLimit = recursionLimit_
    Set setRecursionLimit = Me
End Function


Public Function setContinueSearchInMatchedGroups(continueSearchInMatchedGroups_ As Boolean) As CustomShapeTypeQuery
    continueSearchInMatchedGroups = continueSearchInMatchedGroups_
    Set setContinueSearchInMatchedGroups = Me
End Function


Public Function setIgnoreGroupsWithTooManyShapes(ignoreGroupsWithTooManyShapes_ As Boolean) As CustomShapeTypeQuery
    ignoreGroupsWithTooManyShapes = ignoreGroupsWithTooManyShapes_
    Set setIgnoreGroupsWithTooManyShapes = Me
End Function


Public Function setArgument1(argument1_ As Variant) As CustomShapeTypeQuery
    If IsObject(argument1_) Then
        Set argument1 = argument1_
    Else
        argument1 = argument1_
    End If
    
    Set setArgument1 = Me
End Function


Public Function setArgument2(argument2_ As Variant) As CustomShapeTypeQuery
    If IsObject(argument2_) Then
        Set argument2 = argument2_
    Else
        argument2 = argument2_
    End If
    
    Set setArgument2 = Me
End Function


Public Function setArgument3(argument3_ As Variant) As CustomShapeTypeQuery
    If IsObject(argument3_) Then
        Set argument3 = argument3_
    Else
        argument3 = argument3_
    End If
    
    Set setArgument3 = Me
End Function



Public Function search(Optional logger As logger) As shapeRange
    If Not logger Is Nothing Then logger.addTab , "[CustomShapeTypeQuery.search] " & toString
    
    If recursionLimit = Globals.MAXINT And shapeType = allShapes Then
        ' Nicht suchen: Alle sollen genommen werden
        Set search = Globals.cloneShapeRange(range)
    Else
        ' Echte Suche
        Set search = getShapesOfCustomShapeTypeOfShapeRange(range, excludeGivenShape, 0, logger)
    End If
    
    ' TODO Corels Shapesuche nutzen, wenn möglich (vmtl. schneller??)
    ' range.Shapes.FindShapes
    
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function getShapesOfCustomShapeTypeOfShapeRange(range_ As shapeRange, excludeGivenShape_ As Boolean, ByVal recursionCounter As Integer, Optional logger As logger) As shapeRange
    If Not logger Is Nothing Then logger.addTab , "[CustomShapeTypeQuery.getShapesOfCustomShapeTypeOfShapeRange]"
    
    Dim result As New shapeRange
    
    Dim r As Integer
    For r = 1 To range_.count
        result.AddRange getShapesOfCustomShapeType(range_(r), excludeGivenShape_, recursionCounter, logger)
    Next r
    
    Set getShapesOfCustomShapeTypeOfShapeRange = result
    
    If Not logger Is Nothing Then logger.removeTab
End Function



'Ist rekursiv
' Manche Parameter werden nicht aus der Query entnommen, da sie sich aufgrund von Rekursion ändern. Diese müssen vorher aus der Query entnommen werden
' ACHTUNG: Um das Abbrechen der Suche bei einem Design(bzw. Layer) mit mehr als 50 Formen zu verhindern, sollte lieber die Funktion "getShapesOfCustomShapeTypeOfShapeRange" mit den Formen des Layers und nicht der Layer selbst genutzt werden
Public Function getShapesOfCustomShapeType(shape As shape, excludeGivenShape_ As Boolean, ByVal recursionCounter As Integer, Optional logger As logger) As shapeRange
    If Not logger Is Nothing Then logger.addTab , "[CustomShapeTypeQuery.getShapesOfCustomShapeType]"
    
    If shape Is Nothing Then Err.Raise vbObjectError + 513, , "[CustomShapeTypeQuery.getShapesOfCustomShapeType] 'shape' ist Nothing "
    If Not Globals.isShapeReferenceValid(shape) Then Err.Raise vbObjectError + 513, , "[CustomShapeTypeQuery.getShapesOfCustomShapeType] Die Referenz von 'shape' ist nicht mehr gültig"
    
    Dim result As New shapeRange
    Dim shapeMatched As Boolean
    
    If isShapeMatchingQuery(shape, excludeGivenShape_, logger) Then  ' Not excludeGivenShape_ And isShapeCustomShapeType(shapeQuery, shape)
        result.add shape
        shapeMatched = True
    End If
    
    If isShapeRecursionPossible(shape, recursionCounter, shapeMatched) Then ' Wenn diese Gruppe schon als gefundenes Shape hinzugefügt wurde, dürfen die Childs nur durchsucht werden, wenn 'continueSearchInMatchedGroups' true ist
        result.AddRange getShapesOfCustomShapeTypeOfShapeRange(shape.shapes.All, False, recursionCounter + 1, logger)
    End If
    
    Set getShapesOfCustomShapeType = result
    If Not logger Is Nothing Then logger.removeTab
End Function





Public Function isAllShapesMatchingQuery(Optional logger As logger) As Boolean
    isAllShapesMatchingQuery = isShapeRangeOnlyHavingCustomShapeTypes(range, excludeGivenShape, 0, logger)
End Function


' Abkürzung für .setRecursionLimit(0).isAllShapesMatchingQuery
Public Function isShapesMatchingQueryNonRecursive() As Boolean
    isShapesMatchingQueryNonRecursive = isShapeRangeOnlyHavingCustomShapeTypes(range, excludeGivenShape, recursionLimit) ' Direkt 'recursionLimit' mitgeben, damit nicht in untergruppen gesucht wird
End Function


' Returnt, ob die Formen in 'range_' und je nach Rekursion auch dessen Childs den Kriterien entsprechen
Private Function isShapeRangeOnlyHavingCustomShapeTypes(range_ As shapeRange, excludeGivenShape_ As Boolean, ByVal recursionCounter As Integer, Optional logger As logger) As Boolean
    If Not logger Is Nothing Then logger.addTab , "[CustomShapeTypeQuery.isShapeRangeOnlyHavingCustomShapeTypes] recursionCounter: '" & recursionCounter & "'"
    
    Dim r As Integer
    For r = 1 To range_.count
        
        If Not isShapeOnlyHavingCustomShapeTypes(range_(r), excludeGivenShape_, recursionCounter, logger) Then
            If Not logger Is Nothing Then logger.logINFO "Range Child sagt nein. Also False nach oben weitergeben"
            GoTo ExitFunction ' False
        End If
        
    Next r
    
    isShapeRangeOnlyHavingCustomShapeTypes = True
ExitFunction:
    If Not logger Is Nothing Then
        logger.logINFO "Returne: '" & isShapeRangeOnlyHavingCustomShapeTypes & "'"
        logger.removeTab
    End If
End Function


' Returnt, ob 'shape' und je nach Rekursion auch seine Childs den Kriterien entsprechen
Private Function isShapeOnlyHavingCustomShapeTypes(shape As shape, excludeGivenShape_ As Boolean, Optional ByVal recursionCounter As Integer, Optional logger As logger) As Boolean
    If Not logger Is Nothing Then logger.addTab , "[CustomShapeTypeQuery.isShapeOnlyHavingCustomShapeTypes] shape: '" & Globals.getShapeDisplayName(shape) & "', recursionCounter: '" & recursionCounter & "'"
    
    If isShapeMatchingQuery(shape, excludeGivenShape_) Then
        isShapeOnlyHavingCustomShapeTypes = True
    Else
        
        ' Gruppen müssen nicht zwangsläufig den gewollten Formtypen entsprechen
        ' Denn Gruppen können auch Formen enthalten die dann doch alle gültig sind (dem gewollten Formtypen entsprechen)
        ' Ist diese Form aber keine Gruppe, wird false returnt, weil sie nicht 'isShapeCustomShapeType' ist
        If Not shape.Type = cdrGroupShape Then
            If Not logger Is Nothing Then logger.logINFO "Keine Gruppenform und kein Match. Deshalb keine gültige Form und deshalb ein False für die gesamte Abfrage !!"
            GoTo ExitFunction ' False
        End If
        
        ' Wenn nicht weiter rekusiv geprüft werden soll, dann ist diese Gruppe gültig
        If Not recursionValid(recursionCounter, logger) Then
            If Not logger Is Nothing Then logger.logINFO "Gruppenform aber kein Match. Dafür soll aber nicht weiter rekursiv gesucht werden. Was bedeutet, dass diese Gruppe neutral ist und ignoriert wird. "
            isShapeOnlyHavingCustomShapeTypes = True
            GoTo ExitFunction
        End If
        
        isShapeOnlyHavingCustomShapeTypes = isShapeRangeOnlyHavingCustomShapeTypes(shape.shapes.All, False, recursionCounter + 1, logger)
        If Not logger Is Nothing Then logger.logINFO "Childs der Gruppenform returnen: " & isShapeOnlyHavingCustomShapeTypes
    End If
    
ExitFunction:
    If Not logger Is Nothing Then
        logger.logINFO "Returne: '" & isShapeOnlyHavingCustomShapeTypes & "'"
        logger.removeTab
    End If
End Function




Public Function has(Optional logger As logger) As Boolean
    has = hasShapeRangeCustomShapeType(range, excludeGivenShape, 0, logger)
End Function


Private Function hasShapeRangeCustomShapeType(range_ As shapeRange, excludeGivenShape_ As Boolean, ByVal recursionCounter As Integer, Optional logger As logger) As Boolean
    Dim r As Integer
    For r = 1 To range_.count
        
        If hasShapeCustomShapeType(range_(r), excludeGivenShape_, recursionCounter, logger) Then
            hasShapeRangeCustomShapeType = True
            Exit Function
        End If
        
    Next r
End Function


' 'excludeGiveShape' gibt an, ob das angegebene Shape für die Abfrage ignoriert werden soll. Nur die Childs werden beachtet
Private Function hasShapeCustomShapeType(shp As shape, excludeGivenShape_ As Boolean, ByVal recursionCounter As Integer, Optional logger As logger) As Boolean
    If Not logger Is Nothing Then logger.addTab , "[CustomShapeTypeQuery.hasShapeCustomShapeType] shp: '" & Globals.getShapeDisplayName(shp) & "' recursionCounter: '" & recursionCounter & "'"
    
    If isShapeMatchingQuery(shp, excludeGivenShape_, logger) Then
    
        ' Eine Form hat gematched. Rekursiv nach oben True zurückgeben
        hasShapeCustomShapeType = True
        
    ElseIf isShapeRecursionPossible(shp, recursionCounter) Then
    
        ' Rekursiv weitersuchen nach einem Match
        hasShapeCustomShapeType = hasShapeRangeCustomShapeType(shp.shapes.All, False, recursionCounter + 1, logger)
        
    End If
    
    If Not logger Is Nothing Then logger.removeTab
End Function



Private Function isShapeMatchingQuery(shp As shape, excludeGivenShape_ As Boolean, Optional logger As logger) As Boolean
    If Not logger Is Nothing Then logger.addTab , "[CustomShapeTypeQuery.isShapeMatchingQuery] shp: '" & Globals.getShapeDisplayName(shp) & "'"
    
    isShapeMatchingQuery = False
    
    If excludeGivenShape_ Then GoTo ExitFunction ' False
    If Not shp.visible And excludeInvisibleShapes Then GoTo ExitFunction ' False
    If Not Globals.isShapeCustomShapeType(Me, shp) Then GoTo ExitFunction ' False
    
    isShapeMatchingQuery = True
ExitFunction:
    If Not logger Is Nothing Then
        logger.logINFO "Returne: '" & isShapeMatchingQuery & "'"
        logger.removeTab
    End If
End Function


Private Function isShapeRecursionPossible(groupShape As shape, recursionCounter As Integer, Optional groupShapeMatched As Boolean = False) As Boolean
    If Not groupShape.Type = cdrGroupShape Then Exit Function ' False
    If Not recursionValid(recursionCounter) Then Exit Function ' False
    If ignoreGroupsWithTooManyShapes Then
        If isGroupHavingToManyShapes(groupShape) Then Exit Function ' False
    End If
    If Not continueSearchInMatchedGroups And groupShapeMatched Then Exit Function ' False
    
    isShapeRecursionPossible = True
End Function


Private Function recursionValid(recursionCounter As Integer, Optional logger As logger) As Boolean
    If Not logger Is Nothing Then logger.addTab , "[CustomShapeTypeQuery.recursionValid] recursionCounter: '" & recursionCounter & "' recursionLimit: '" & recursionLimit & "'"
    
    If Not recursive Then GoTo ExitFunction ' False
    If recursionCounter >= recursionLimit Then GoTo ExitFunction  ' False
    
    recursionValid = True
ExitFunction:
    If Not logger Is Nothing Then
        logger.logINFO "Returne: '" & recursionValid & "'"
        logger.removeTab
    End If
End Function


Public Function clone() As CustomShapeTypeQuery
    Dim shapeQuery As CustomShapeTypeQuery
    Set shapeQuery = newCustomShapeTypeQuery(range, shapeType)
    
    shapeQuery.excludeGivenShape = excludeGivenShape
    shapeQuery.excludeInvisibleShapes = excludeInvisibleShapes
    shapeQuery.recursive = recursive
    shapeQuery.recursionLimit = recursionLimit
    shapeQuery.continueSearchInMatchedGroups = continueSearchInMatchedGroups
    shapeQuery.ignoreGroupsWithTooManyShapes = ignoreGroupsWithTooManyShapes
    shapeQuery.argument1 = argument1
    shapeQuery.argument2 = argument2
    shapeQuery.argument3 = argument3
    
    Set clone = shapeQuery
End Function


Public Function toString() As String
    toString = "CustomShapeTypeQuery(shapeType: '" & shapeType & "', excludeGivenShape:'" & excludeGivenShape & "', excludeInvisibleShapes: '" & excludeInvisibleShapes & "', recursive: '" & recursive & "', recursionLimit: '" & recursionLimit & _
    "', continueSearchInMatchedGroups: '" & continueSearchInMatchedGroups & "', ignoreGroupsWithTooManyShapes: '" & ignoreGroupsWithTooManyShapes & "', argument1: '" & argument1 & "', argument2: '" & argument2 & "', argument3: '" & argument3 & "')"
End Function

