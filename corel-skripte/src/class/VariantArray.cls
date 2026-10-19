Attribute VB_Name = "VariantArray"
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
' Stellt Variantengruppen von einem bestimmten Typ von Variante dar. Z.B. alle Designvarianten

Public setVariantParent As Boolean ' Sollte nur bei ProductDesignLayer eingeschaltet sein, da nur dort die echten Variantengruppen sind

Public variantGroups As New collection ' Enthält Objekte vom Typ 'VariantGroup'
Public allVariants As New collection ' Enthält alle Varianten aus allen Gruppen
Public allVariantsShapes As New shapeRange ' Enthält alle Varianten Formen aus allen Gruppen

' Sorgt dafür, dass bspw. Grundplatten von 2 verscheidenen Layern nie in die selbe 'VariantGroup' landen
Public seperateVariantsByLayer As Boolean

Private Sub Class_Initialize()
    seperateVariantsByLayer = True
End Sub

Public Function addVariants(variants As collection)
    Dim i As Integer
    For i = 1 To variants.count
        addVariant variants(i)
    Next i
End Function


Public Function addVariant(varia As variante, Optional logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[VariantArray.addVariant]"
    
    If Not logger Is Nothing Then logger.logINFO "varia: " & varia.toString
    
    allVariants.add varia
    allVariantsShapes.add varia.shape
    
    Dim varGroup As VariantGroup
    
    Dim i As Integer
    For i = 1 To variantGroups.count
        
        Dim currentVarGroup As VariantGroup
        Set currentVarGroup = variantGroups(i)
        
        Dim firstVariantOfGroup As variante
        Set firstVariantOfGroup = currentVarGroup.getVariant(1)
        
        
        If firstVariantOfGroup.variantGroupName = varia.variantGroupName Then
            ' Es wird mit LayerIndex verglichen, da auch Varianten unterschiedlicher Designs zusammengesucht werden können
            If Not seperateVariantsByLayer Or (firstVariantOfGroup.layer.getLayerIndex = varia.layer.getLayerIndex) Then
                Set varGroup = currentVarGroup
                GoTo GroupFound
            End If
        End If
        
        Set firstVariantOfGroup = Nothing
        Set currentVarGroup = Nothing
    Next i
    
CreateNewGroup:
    
    ' Wenn keine passende Gruppe bis hierhin gefunden wurde, neue erstellen
    Set varGroup = New VariantGroup
    varGroup.newVariantGroup Me
    ' Gruppe zu allen Gruppen hinzufügen
    variantGroups.add varGroup
    
GroupFound:
    varGroup.addVariante varia, False, setVariantParent ' ACHTUNG: False ist sehr wichtig um eine Endlosschleife zu verhindern
    setDesignElementVariantName varia, varGroup
    
ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
End Function


Private Function setDesignElementVariantName(varia As variante, varGroup As VariantGroup)
    ' Da Designvarianten nur den Gruppennamen enthalten: 'desVar(1)' nicht aber den Childindex von der Gruppe,
    ' wird der hier gesetzt (Da man erst hier weiß, wieviele es von der Gruppe gibt bzw. welchen Index die 'variante' hat)
    If varia.typee = DesignElementVariantType Then
        varia.variantName = CStr(varGroup.variants.count)
    End If
End Function


' Gibt eine Variante aus der Collection 'allVariants' zurück. Dort sind alle Varianten gemischt zusammen!
Public Function getVariant(ByVal index As Integer) As variante
    Set getVariant = allVariants(index)
End Function

Public Function getVariantByShape(shape As shape) As variante
    Dim i As Integer
    For i = 1 To allVariantsShapes.count
        If shape = allVariantsShapes(i) Then
            getVariantByShape = getVariant(i)
            Exit Function
        End If
    Next i
End Function


Public Function getVariantGroupChild(groupIndex As Integer, childIndex As Integer) As variante
    Set getVariantGroupChild = variantGroups(groupIndex)(childIndex)
End Function


Public Function getVariantGroupOfVariantShape(shape As shape) As VariantGroup
    
    Dim variantOfShape As variante
    Set variantOfShape = getVariantByShape(shape)
    
    Set getVariantGroupOfVariantShape = getVariantGroupOfVariant(variantOfShape)
End Function

Public Function getVariantGroupOfVariant(ByVal varia As variante) As VariantGroup
    Dim i As Integer
    For i = 1 To variantGroups.count
        Dim currentVariantGroup As VariantGroup
        Set currentVariantGroup = variantGroups(i)
        
        Dim firstVariantInGroup As variante
        Set firstVariantInGroup = currentVariantGroup.getVariant(1)
        
        If firstVariantInGroup.variantGroupName = varia.variantGroupName Then
            Set getVariantGroupOfVariant = currentVariantGroup
            Exit For
        End If
        
        Set firstVariantInGroup = Nothing
        Set currentVariantGroup = Nothing
    Next i
    
End Function



Public Function getVariantGroup(ByVal groupIndex As Integer) As VariantGroup
    Set getVariantGroup = variantGroups.item(groupIndex)
End Function




Public Function isVarianteFirstInGroup(varia As variante) As Integer
    
    Dim varGroup As VariantGroup
    Set varGroup = getVariantGroupOfVariant(varia)
    
    If varGroup.variants.count > 0 Then
        If varGroup.variants.item(1) Is varia Then
            isVarianteFirstInGroup = True
        End If
    End If
     
End Function


Public Function getVarianteIndexInGroup(varia As variante, Optional logger As logger) As Integer
    
    If Not logger Is Nothing Then logger.addTab , "[VariantArray.getVarianteIndexInGroup]"
    
    Dim varGroup As VariantGroup
    Set varGroup = getVariantGroupOfVariant(varia)
    
    Dim i As Integer
    
    If Not varGroup Is Nothing Then
        For i = 1 To varGroup.variants.count
            If Not logger Is Nothing Then logger.logINFO "Vergleiche '" & varGroup.getVariant(i).toString & "' mit '" & varia.toString & "'"
            If varGroup.getVariant(i) Is varia Then
                getVarianteIndexInGroup = i
                GoTo ExitFunction
            End If
        Next i
    Else
        If Not logger Is Nothing Then logger.logINFO "keine Gruppe gefunden"
    End If
    
    getVarianteIndexInGroup = -1
ExitFunction:
    If Not logger Is Nothing Then
        logger.logINFO "returning: '" & getVarianteIndexInGroup & "'"
        logger.removeTab
    End If
End Function



Public Function getVariantShapeIndexInGroup(shape As shape) As Integer
    getVariantShapeIndexInGroup = getVarianteIndexInGroup(getVariantByShape(shape))
End Function

' Gibt die aktive Variante von der selben Variantengruppe wie 'variantee' wieder. Wenn man bsp. eine Haarfarben-Designelement-Variante hat, gibt diese Funktion zurück, welche Haarfarbe im Dokument aktiv (sichtbar) ist
Public Function getActiveVariantOfGroupFromVariante(varia As variante) As variante
    Set getActiveVariantOfGroupFromVariante = getActiveVariantOfGroup(getVariantGroupOfVariant(varia))
End Function


Public Function getActiveVariantOfGroupIndex(groupIndex As Integer) As variante
    
    Dim varGroup As VariantGroup
    Set varGroup = variantGroups(groupIndex)
    
    Set getActiveVariantOfGroupIndex = getActiveVariantOfGroup(varGroup)
End Function


Public Function getActiveVariantOfGroup(varGroup As VariantGroup) As variante
    
    Dim i As Integer
    For i = 1 To varGroup.variants.count
        Dim currentVariante As variante
        Set currentVariante = varGroup.getVariant(i)
        
        ' Sichbar heißt, dass es die aktive Variante ist
        If currentVariante.shape.visible Then
            Set getActiveVariantOfGroup = currentVariante
            Exit Function
        End If
        
        Set currentVariante = Nothing
    Next i
    
End Function



Public Function p_getReplaceSlugForVariante(varia As variante) As String
    
    Dim varGroup As VariantGroup
    Set varGroup = getVariantGroupOfVariant(varia)
    
    If varGroup Is Nothing Then
        Err.Raise vbObjectError + 513, , "[VariantArray.getReplaceSlugForVariante]  Für die Variante '" & varia.variantName & "' wurde keine Gruppe gefunden"
    End If
    
    
    If varGroup.variants.count <= 1 Then
        Exit Function 'Weil es nur eine Variante aus der Gruppe gibt, ist es keine echte Variante. Kann also auch nicht getauscht werden 'replace'
    End If
    
    Dim replaceSlug As String
    
    Dim currentVariant As variante
    
    
    ' Variantennamen aller Varianten in der selben Gruppe wie 'variante'
    ' ------------------------
    Dim i As Integer
    For i = 1 To varGroup.variants.count
        Set currentVariant = varGroup.getVariant(i)
        
        replaceSlug = replaceSlug & replace(currentVariant.variantName, "_", "-")
        
        If Not i = varGroup.variants.count Then
            replaceSlug = replaceSlug & "_"
        End If
        
        Set currentVariant = Nothing
    Next i
    ' ------------------------
    
    
    ' Abmessung in Pxl
    ' ------------------------
    Dim maxWidth As Integer
    maxWidth = -1
    Dim maxHeight As Integer
    maxHeight = -1
    For i = 1 To varGroup.variants.count
        Set currentVariant = varGroup.getVariant(i)
        
        maxWidth = CInt(max(CInt(currentVariant.shape.SizeWidth), maxWidth))
        maxHeight = CInt(max(CInt(currentVariant.shape.SizeHeight), maxHeight))
        
        Set currentVariant = Nothing
    Next i
    replaceSlug = replaceSlug & "_" & maxWidth & "x" & maxHeight & "px"
    ' ------------------------
    
    
    p_getReplaceSlugForVariante = replaceSlug
    
End Function


Public Function isEqualTo(varArray As VariantArray) As Boolean
    
    If varArray Is Nothing Then Exit Function ' Return False
    
    If Not varArray.allVariants.count = Me.allVariants.count Then Exit Function ' Return False
    
    Dim i As Integer
    For i = 1 To varArray.allVariants.count
        If Not varArray.getVariant(i).isEqualTo(getVariant(i)) Then
            Exit Function ' Return False
        End If
    Next i
    
    isEqualTo = True
    
End Function


Public Function getEqualVariant(varia As variante) As variante
    
    ' Erstmal die gleiche Gruppe finden, damit nicht alle Varianten verglichen werden
    Dim varGroup As VariantGroup
    Set varGroup = getVariantGroupOfVariant(varia)
    
    If Not varGroup Is Nothing Then
        Dim i As Integer
        For i = 1 To varGroup.variants.count
            Dim currentVar As variante
            Set currentVar = varGroup.getVariant(i)
            
            If currentVar.isEqualTo(varia) Then
                Set getEqualVariant = currentVar
                Exit Function
            End If
            
            Set currentVar = Nothing
        Next i
    End If
    
End Function


Public Function removeVariant(varia As variante, Optional logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[VariantArray.RemoveVariant]"
    
    Dim varGroup As VariantGroup
    Set varGroup = getVariantGroupOfVariant(varia)
    
    If Not varGroup Is Nothing Then
        
        varGroup.removeVariant varia, True
        Globals.deleteCollectionItem allVariants, varia
        Globals.deleteShapeRangeShape allVariantsShapes, varia.shape
    End If
    
    If Not logger Is Nothing Then logger.removeTab
    
End Function


Public Function removeVariantGroup(varGroup As VariantGroup, Optional logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[VariantArray.removeVariantGroup]"
    
    allVariantsShapes.RemoveRange varGroup.variants.collectShapes
    
    ' Alle Childs löschen
    ' (Macht momentan noch keinen Unterschied, aber es ist wichtig, dass jedes Child das mitbekommt)
    ' ------------------------
    While varGroup.variants.count > 0
        varGroup.removeVariantByIndex 1 ' ACHTUNG: Potenzielle Endlosschleife, da < diese Funktion ^ diese Funktion auslößt. Aber nur einmal bei der letzten Variante nachdem sie gelöscht wurde. Was diese For Schleife nicht mehr triggern sollte
    Wend
    ' ------------------------
    
    Globals.deleteCollectionItem variantGroups, varGroup
    
    If Not logger Is Nothing Then logger.logINFO "Nach dem entfernen ist ME: " & toString
    
    If Not logger Is Nothing Then logger.removeTab
    
End Function


Public Function removeVariantByIndex(index As Integer)
    
    removeVariant allVariants.item(index)
    
End Function


'Public Function removeShape(shape As shape)
'
'End Function


Public Function areShapeReferencesValid() As Boolean
    areShapeReferencesValid = Globals.isShapeRangeShapesReferenceValid(allVariantsShapes)
End Function


' Aktiviert die Variante indem sie sichtbar gemacht wird und alle anderen aus der gleichen Gruppe unsichtbar
Public Function activateVariant(varia As variante)
    
    Dim vGroup As VariantGroup
    Set vGroup = getVariantGroupOfVariant(varia)
    
    Dim i As Integer
    For i = 1 To vGroup.variants.count
        Dim currVar As variante
        Set currVar = vGroup.getVariant(i)
        
        If currVar = varia Then
            currVar.shape.visible = True
        Else
            currVar.shape.visible = False
        End If
        
        Set currVar = Nothing
    Next i
    
End Function


Public Function clone() As VariantArray
    Set clone = New VariantArray
    clone.addVariants allVariants
End Function


' Single Varianten sind Varinaten die als Einzige in ihrer Gruppe sind
' Bspw. eine Grundplatte, wenn es nur eine gibt
Public Function removeSingleVariants(Optional logger As logger) As VariantArray
    If Not logger Is Nothing Then logger.addTab , "[VariantArray.removeSingleVariants]"
    Dim i As Integer
    For i = variantGroups.count To 1 Step -1
        Dim currGroup As VariantGroup
        Set currGroup = getVariantGroup(i)
        
        If currGroup.isSingleVariant(logger) Then
            removeVariantGroup currGroup, logger
        End If
        
        Set currGroup = Nothing
    Next i
    Set removeSingleVariants = Me
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function removeMultiVariants() As VariantArray
    Dim i As Integer
    For i = variantGroups.count To 1 Step -1
        Dim currGroup As VariantGroup
        Set currGroup = getVariantGroup(i)
        
        If Not currGroup.isSingleVariant Then
            removeVariantGroup currGroup
        End If
        
        Set currGroup = Nothing
    Next i
    Set removeMultiVariants = Me
End Function


Public Function removeEqualVariants() As VariantArray
    Dim i As Integer
    For i = 1 To variantGroups.count
        Dim currGroup As VariantGroup
        Set currGroup = getVariantGroup(i)
        
        currGroup.variants.removeEqualVariants
        
        Set currGroup = Nothing
    Next i
    Set removeEqualVariants = Me
End Function



Public Function toString() As String
    Dim childs As String
    Dim i As Integer
    For i = 1 To variantGroups.count
        childs = Globals.addStringWithDelimiterIfNeeded(childs, getVariantGroup(i).toString)
    Next i
    
    toString = "VariantArray: [" & childs & "]"
End Function

