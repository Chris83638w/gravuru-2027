Attribute VB_Name = "Variante"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
' Dieses Modul heißt 'Variante' mit E weil 'Variant' schon vergeben ist


Public Enum variantType
    
    NoVariantType = -1 ' Falls nicht initalisiert
    
    GroundplateVariantType ' 0
    DesignElementVariantType ' 1 - Die Designelement-Varianten, die der Designer gesetzt hat. Z.B: verschiedene Hintergründe
    StaticVariantType ' 2 - Bohrlöcher, AH, Kordeln usw.
    LayerVariantType ' 3 - Schichtvarianten wie z.B. ein Edelstahlrahmen
    PhotoMaskVariantType ' 4 - Fotomasken werden aus den Grundplatten und Uploadboxen (Fotos) beim Amazon oder Fancy-Export erstellt
    
    DesignVariantType ' Ein richtiges Design als Variante
    
    count
End Enum

Public Enum staticVariantGroupTypes
    
    BefestigungStaticVariantGroupType
    RahmenStaticVariantGroupType
    TasterStaticVariantGroupType
    FakeFKEdelstahlHintergrundplatteVariantGroupType ' TODO FK-SHOPIFY-QUICK, wenn FUnkklingeln auf Shopify hochgeladen sind, löschen
    FakeFKEckenVariantGroupType ' TODO FK-SHOPIFY-QUICK, wenn FUnkklingeln auf Shopify hochgeladen sind, löschen
    
    count
End Enum




' Ebenen-Variante oder Child-Variante einer Ebene
'Public layerVariant As Boolean

' Die Form. Entweder eine Schicht(Gruppe) oder die Form einer Child-Variante(Gruppe oder einelne Form(bei leeren Varianten))
Public shape As shape

Public layer As ProductDesignLayer

Public parent As VariantGroup

Public typee As variantType
Public variantGroupName As String ' Der Gruppenname dient dazu Variantentypen in untergruppen zu unterteilen um sie noch besser zu unterscheiden. 2 Varianten können bspw. vom Typ Designelementvariante sein, aber der eine ist desVar(1) und der andere desVar(2). 2 unterschiedliche Gruppen
Public p_variantGroupNameForFancy As String ' Optionaler, schöner Anzeigename der Gruppe (aus Job-Variante entnehmen, welche in Placefile definiert wurde). Fällt auf 'variantGroupName' zurück
Public variantName As String ' Bei Designvarianten ist es die Nummer des Indexes aus der Gruppe bspw. desVar(1) child 3 (dann ist es 3)
' TODO Evtl. ist doch mal was in der leeren Variante drin. Z.B. könnte man in Zukunft Designelemente in die Befestigungs-Varianten packen. Bei der Variante mit Bohrlöchern, würde der Designstrich dann nur kurz vor den Löchern enden, bei der Variante ohne kann der Strich breiter sein
Public variantIsEmptyVariant As Boolean ' Wird nur für 'LayerVariantType' genutzt (Kann es aber auch bei 'DesignElementVariantType' geben)

' Für den Fancy
Private p_price As Double

' Confi-Thumbnail (aus Job-Variante entnehmen, welche in Placefile definiert wurde)
Public p_confiThumbnailFileName As String
Public p_confiThumbnailFileTypeForFancy As cdrFilter
Public p_confiThumbnailFileTypeForAmazon As cdrFilter

' Steuert, ob beim FancyExport das Thumbnail dieser (statischen) Variante zusätzlich die Grundplatten der anderen ProductDesignLayer mitrendert (Produktkontext)
Private p_fancyExportExportOtherLayersGroundplatesInThumbnail As Boolean

Private originalShapeName As String
Private shapeNameWithoutOtherTags As String ' Formname nur mit dem Varianten-Tag 'var_befestigung(2-Abstandshalter-8mm)'. Andere Tags wie 'colorable' werden entfernt

Dim job As PlaceFileJob
Dim jobInitialized As Boolean

'Dim subJob As placeFileSubJob
'Dim subJobInitialized As Boolean

Public p_redOrPinkShapes As shapeRange


' DESIGNELEMENT VARIANTE VARIABLEN
Public designElementVarianteGroupNr As Integer

' STATISCHE VARIANTE VARIABLEN
Public staticVariantGroupType As staticVariantGroupTypes

Public objectID As Integer

Private Function init()
    objectID = Globals.getNextObjectID
End Function


Property Get price() As Double

    ' Aus Job Variante entnehmen, welche in Placefile definiert wurde
    If p_price = 0 Then
        If Not getJob Is Nothing Then
            If Not getJob.variante Is Nothing Then
                If Not getJob.variante Is Me Then
                    price = getJob.variante.price
                End If
            End If
        End If
    End If
    
    If price = 0 Then
        price = p_price
    End If
End Property


Property Let price(price_ As Double)
    p_price = price_
End Property


Property Get confiThumbnailFileName() As String

    ' Aus Job Variante entnehmen, welche in Placefile definiert wurde
    If p_confiThumbnailFileName = "" Then
        If Not getJob Is Nothing Then
            If Not getJob.variante Is Nothing Then
                If Not getJob.variante Is Me Then
                    confiThumbnailFileName = getJob.variante.confiThumbnailFileName
                End If
            End If
        End If
    End If

    If confiThumbnailFileName = "" Then
        confiThumbnailFileName = p_confiThumbnailFileName
    End If
End Property


Property Let confiThumbnailFileName(value As String)
    p_confiThumbnailFileName = value
End Property


Property Get variantGroupNameForFancy() As String
    If variantGroupNameForFancy = "" Then variantGroupNameForFancy = p_variantGroupNameForFancy
    If variantGroupNameForFancy = "" Then variantGroupNameForFancy = variantGroupName ' Fallback: roher Gruppenname
End Property


Property Let variantGroupNameForFancy(value As String)
    p_variantGroupNameForFancy = value
End Property


Property Get confiThumbnailFileTypeForFancy() As cdrFilter

    ' Aus Job Variante entnehmen, welche in Placefile definiert wurde
    If p_confiThumbnailFileTypeForFancy = 0 Then
        If Not getJob Is Nothing Then
            If Not getJob.variante Is Nothing Then
                If Not getJob.variante Is Me Then
                    confiThumbnailFileTypeForFancy = getJob.variante.confiThumbnailFileTypeForFancy
                End If
            End If
        End If
    End If

    If confiThumbnailFileTypeForFancy = 0 Then confiThumbnailFileTypeForFancy = p_confiThumbnailFileTypeForFancy
    If confiThumbnailFileTypeForFancy = 0 Then confiThumbnailFileTypeForFancy = cdrSVG ' Default
End Property


Property Let confiThumbnailFileTypeForFancy(value As cdrFilter)
    p_confiThumbnailFileTypeForFancy = value
End Property


Property Get confiThumbnailFileTypeForAmazon() As cdrFilter

    ' Aus Job Variante entnehmen, welche in Placefile definiert wurde
    If p_confiThumbnailFileTypeForAmazon = 0 Then
        If Not getJob Is Nothing Then
            If Not getJob.variante Is Nothing Then
                If Not getJob.variante Is Me Then
                    confiThumbnailFileTypeForAmazon = getJob.variante.confiThumbnailFileTypeForAmazon
                End If
            End If
        End If
    End If

    If confiThumbnailFileTypeForAmazon = 0 Then confiThumbnailFileTypeForAmazon = p_confiThumbnailFileTypeForAmazon
    If confiThumbnailFileTypeForAmazon = 0 Then confiThumbnailFileTypeForAmazon = cdrPNG ' Default
End Property


Property Let confiThumbnailFileTypeForAmazon(value As cdrFilter)
    p_confiThumbnailFileTypeForAmazon = value
End Property


Public Function getFullConfiThumbnailPath(fancyOrAmazon As Boolean) As String
    getFullConfiThumbnailPath = Globals.getMainFolder & "Variants\Thumbnails\" & confiThumbnailFileName & "." & Globals.getFilterAsString(IIf(fancyOrAmazon, confiThumbnailFileTypeForFancy, confiThumbnailFileTypeForAmazon))
End Function


Property Get fancyExportExportOtherLayersGroundplatesInThumbnail() As Boolean

    ' Aus Job Variante entnehmen, welche in Placefile definiert wurde
    If Not p_fancyExportExportOtherLayersGroundplatesInThumbnail Then
        If Not getJob Is Nothing Then
            If Not getJob.variante Is Nothing Then
                If Not getJob.variante Is Me Then
                    fancyExportExportOtherLayersGroundplatesInThumbnail = getJob.variante.fancyExportExportOtherLayersGroundplatesInThumbnail
                End If
            End If
        End If
    End If

    If Not fancyExportExportOtherLayersGroundplatesInThumbnail Then
        fancyExportExportOtherLayersGroundplatesInThumbnail = p_fancyExportExportOtherLayersGroundplatesInThumbnail
    End If
End Property


Property Let fancyExportExportOtherLayersGroundplatesInThumbnail(value As Boolean)
    p_fancyExportExportOtherLayersGroundplatesInThumbnail = value
End Property


Public Function newVariantOfType(typee As variantType, shape As shape, layer_ As ProductDesignLayer)
    
    Select Case typee
    Case GroundplateVariantType
        newGroundplateVariante shape, layer_
    Case DesignElementVariantType
        newDesignElementVariant shape, layer_
    Case StaticVariantType
        newStaticVariant shape, layer_
    Case LayerVariantType
        newLayerVariant shape, layer_
    Case PhotoMaskVariantType
        newPhotoMaskVariante shape, layer_
    Case designVariant
        newDesignVariant shape, layer_
    End Select
    
End Function


Public Function newDesignVariant(designShape As shape, layer_ As ProductDesignLayer)
    
    init
    Set shape = photoMaskShape
    Set layer = layer_
    typee = DesignVariantType
    
    variantGroupName = "Design"
    variantName = "D" & layer.getPart.getDesign.getProductIDObject.getDesignNumber
    
End Function


Public Function newPhotoMaskVariante(photoMaskShape As shape, layer_ As ProductDesignLayer, Optional logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[Variante.newPhotoMaskVariante]"
    
    init
    
    Set shape = photoMaskShape
    Set layer = layer_
    typee = PhotoMaskVariantType
    
    setOriginalShapeName photoMaskShape.name
    
    variantGroupName = "Fotomaske"
    Dim groundPlateOfPhotoMask As shape
    ' A Set groundPlateOfPhotoMask = layer.getGroundplateVariants.item(layer.getGroundplateVariantsPhotoMasks.IndexOf(photoMaskShape))
    ' B Achtung: Da Grundplattenvarianten immer den selben Gruppennamen haben ('Grundplatte'), gibt es nur eine Gruppe. Deshalb wird die Grundplatte auch einfach aus .allVariants entnommen und es wird kein Gruppenindex ermittelt
    Dim index As Integer
'    index = layer.getVariantsOfType(PhotoMaskVariantType).getVariantShapeIndexInGroup(photoMaskShape)
    index = layer.getVariantsOfType(PhotoMaskVariantType, False).allVariants.count + 1 ' False, damit nicht nach Fotomasken-Varianten gesucht wird. Denn sonst sind es bei der ersten 0 und bei der zweiten 2
'    If Not logger Is Nothing Then logger.logINFO "Photomasken-Varianten: '" & layer.getVariantsOfType(PhotoMaskVariantType, False, , logger).allVariants.count & "', Grundplatten-Varianten: '" & layer.getVariantsOfType(GroundplateVariantType).allVariants.count & "'"
    Set groundPlateOfPhotoMask = layer.getVariantsOfType(GroundplateVariantType, , , logger).getVariant(index).shape
    variantName = getGroundplateNameBeautiful(groundPlateOfPhotoMask.name)
    
    If Not logger Is Nothing Then logger.removeTab
End Function



Public Function newGroundplateVariante(groundplateShape As shape, Optional layerVar As ProductDesignLayer, Optional logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[Variante.newGroundplateVariante]"
    
    init
    
    Set shape = groundplateShape
    Set layer = layerVar
    typee = GroundplateVariantType
    
    setOriginalShapeName groundplateShape.name
    
    variantGroupName = "Grundplatte"
    p_variantGroupNameForFancy = "Farbe"
    If Not getJob Is Nothing Then
        variantName = getJob.variantNameBeautiful
    End If
    
    If variantName = "" Then
        variantName = getGroundplateNameBeautiful(groundplateShape.name)
    End If
    
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function newDesignElementVariant(designVariantShape As shape, layerVar As ProductDesignLayer)
    
    init
    
    Set shape = designVariantShape
    Set layer = layerVar
    typee = DesignElementVariantType
    
    setOriginalShapeName designVariantShape.name
    
    designElementVarianteGroupNr = CInt(Globals.getDesignElementVariantNr(shape))
    variantGroupName = "Design-Element-Variante-" & designElementVarianteGroupNr
    
    ' Der VariantenName wird in VariantArray initialisiert
    
End Function



Public Function newStaticVariant(theShape As shape, layerVar As ProductDesignLayer)
    
    init
    
    Set shape = theShape
    Set layer = layerVar
    typee = StaticVariantType
    
    setOriginalShapeName theShape.name
    
    setGroupNameAndNameForStaticOrLayerVariant theShape.name
End Function


Public Function newStaticVariantFromName(name As String)
    
    init
    
    typee = StaticVariantType
    
    setOriginalShapeName name
    
    setGroupNameAndNameForStaticOrLayerVariant name
End Function


' Wird vom Placefile genutzt
Public Function newStaticVariantFromGroupTypeAndName(groupType As staticVariantGroupTypes, Optional name As String = "Ohne")
    
    init
    
    typee = StaticVariantType
    setStaticVariantGroupType groupType
    setVariantName name
    If hasJob Then PlaceFile.staticVariantJobs.add job ' Job zu den statischen Varianten Jobs hinzufügen, damit man es nicht manuell in Placefile.init machen muss
End Function


Public Function newLayerVariant(shapeContainingTheName As shape, layerVar As ProductDesignLayer)
    
    init
    
    Set layer = layerVar
    Set shape = layer.layerShape
    
    typee = LayerVariantType
    
    setGroupNameAndNameForStaticOrLayerVariant shapeContainingTheName.name
    variantIsEmptyVariant = (variantName = "Ohne") ' Muss nach dem setzen von 'variantName' gemacht werden
    
    setOriginalShapeName shapeContainingTheName.name
    
    If Not variantIsEmptyVariant Then
        
        Dim groundPlates As shapeRange
        Set groundPlates = newCustomShapeTypeQuery(shape, groundPlate).search
        
        If groundPlates.count = 0 Then
            Err.Raise vbObjectError + 513, , "[Variante.newLayerVariant] keine Grundplatte gefunden "
        End If
        
        ' Grundplattenname hinzufügen. Denn wenn die Schichtvariante 'var_frame(1cm)' heißt, es aber mehrere davon im selben Part gibt, dann sin diese vom Namen nicht zu unterscheiden
        ' Wenn man dann aber noch den Grundplattennamen hinzufügt, dann sieht der Name besser aus: "1cm Edelstahl"
        variantName = variantName & "-" & getGroundplateNameBeautiful(groundPlates.firstShape.name)
    End If
    
End Function


' Konvertiert "var_befestigung(Abstandshalter)" zu variantGroupName = "befestigung" und variantName = "Abstandshalter"
Private Function setGroupNameAndNameForStaticOrLayerVariant(shapeName As String)
    
    Dim variantGroupNameAndName() As String
    variantGroupNameAndName = Globals.getVariantNameAndGroupNameOfVariantChildName(shapeName)
    variantName = variantGroupNameAndName(1)
    variantGroupName = variantGroupNameAndName(2)
    
    variantGroupName = replace(variantGroupName, "var_", "")
    variantGroupName = replace(variantGroupName, "_", " ")
    variantGroupName = StrConv(variantGroupName, vbProperCase)
    
    ' Sucht anhand des Gruppennamens 'variantGroupName' im Enum für statische Varianten den passenden Typ. Z.B: Befestigung
    For i = 1 To staticVariantGroupTypes.count
        If LCase(getStaticVariantGroupTypeName((i))) = LCase(variantGroupName) Then
            staticVariantGroupType = i
            Exit For
        End If
    Next i
    
End Function


Public Function getNameForGroupingJobShapes() As String
    ' Nur echte Gruppierungs-Varianten (statisch) benennen/gruppieren Job-Shapes.
    ' Andere Typen (z.B. eine reine Grundplatten-Thumbnail-Config-Variante am Job) liefern "",
    ' damit PlaceFileJob.getGroupName neutral bleibt (p_groupName) und die Platzierungslogik nicht bricht
    If typee = StaticVariantType Then
        getNameForGroupingJobShapes = "var_" & LCase(replace(variantGroupName, " ", "_")) & "(" & variantName & ")"
    End If
End Function


Private Function setVariantName(name As String)
    variantName = name
    variantIsEmptyVariant = (variantName = "Ohne") ' Muss nach dem setzen von 'variantName' gemacht werden
End Function


Public Function setOriginalShapeName(name As String, Optional updateShapeNameWithoutOtherTags As Boolean = True)
    originalShapeName = name
    If updateShapeNameWithoutOtherTags Then shapeNameWithoutOtherTags = Globals.removeKeywordsFromName(name)
End Function


Private Function setStaticVariantGroupType(groupType As staticVariantGroupTypes)
    staticVariantGroupType = groupType
    variantGroupName = getStaticVariantGroupTypeName(staticVariantGroupType)
End Function



Public Function getGroundplateNameBeautiful(name As String, Optional convertUnderScoreToSpace As Boolean = False) As String
    
    ' TODO Könnte in Zukunft ersetzt werden. Man könnte einen 'schönen' Namen im Job speichern
    getGroundplateNameBeautiful = Globals.getGroundplateNameBeautiful(name, convertUnderScoreToSpace)
    
End Function



'Public Function getSubJob() As placeFileSubJob
'    If Not subJobInitialized Then
'
''        Dim shapeNameForJob As String
''        shapeNameForJob = variantGroupName & "(" & variantName & ")"
''
''        ' "var_" wurde vorher vom 'variantGroupName' bei statischen Varianten entfernt
''        If typee = StaticVariantType Or typee = LayerVariantType Then
''            shapeNameForJob = "var_" & shapeNameForJob
''        End If
'
'        Set subJob = PlaceFile.findSubJobByVariantGroupNameAndName(shapeNameWithoutOtherTags)
'
'        subJobInitialized = True
'    End If
'
'    Set getSubJob = subJob
'End Function


Public Function getJob(Optional logger As logger) As PlaceFileJob
    If Not logger Is Nothing Then logger.addTab , "[Variante.getJob]"
    
    If Not jobInitialized Then
        
        If typee = LayerVariantType Or typee = StaticVariantType Then
            Set job = PlaceFile.findJobByVariantGroupNameAndName(shapeNameWithoutOtherTags)
            
        ElseIf typee = GroundplateVariantType Then
            Set job = PlaceFile.findVarianteJob(Me, layer, logger)
            
        ElseIf typee = DesignElementVariantType Then
            ' Haben keinen Job
            
        End If
        jobInitialized = True
    End If
    
    Set getJob = job
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function setJob(theJob As PlaceFileJob)
    Set job = theJob
    jobInitialized = True
End Function


Public Function hasJob() As Boolean
    hasJob = Not job Is Nothing
End Function


Public Function getDesign() As productDesign
    Set getDesign = layer.getPart.getDesign
End Function


Public Function getRedOrPinkShapes() As shapeRange
    
    If p_redOrPinkShapes Is Nothing Then
        
        If shape.Type = cdrGroupShape Then
            Set p_redOrPinkShapes = newCustomShapeTypeQuery(shape.shapes.All, RedOrPinkShape).search
        ElseIf Globals.isRedOrPinkShape(shape) Then
            Set p_redOrPinkShapes = Globals.shapeToShapeRange(shape)
        Else
            Set p_redOrPinkShapes = New shapeRange
        End If
        
    End If
    
    Set getRedOrPinkShapes = p_redOrPinkShapes
End Function


Public Function setRedShapesVisible(visible As Boolean)
    
    For i = 1 To getRedOrPinkShapes.count
        If visible Then
            p_redOrPinkShapes(i).transparency.ApplyNoTransparency
        Else
            Globals.makeShapeInvisibleForExport p_redOrPinkShapes(i)
        End If
    Next i
End Function


Public Function isEqualTo(ByVal variante As variante) As Boolean
    
    If variante Is Nothing Then Exit Function
    If Not variante.typee = Me.typee Then Exit Function
    
    ' Designvarianten sind etwas speziell.
    ' Denn bei anderen Varianten sagt der Name schon aus, welche variante es ist. Z.B: var_befestigung(Bohrlöcher-3mm)
    ' Somit lassen sich Varianten leicht per Name bzw. mit 'variantGroupName' und 'variantName' vergleichen um zu gucken, ob sie gleich sind
    ' Nicht aber bei Designvarianten. Denn da kann es alles mögliche sein. Der name bspw. 'desVar(1)' sagt nichts aus
    ' Deshalb wird der Inhalt der Desingvariante verglichen (Die Formen)
    If variante.typee = DesignElementVariantType Then
        
        If Not Globals.areShapesEqual(Me.shape, variante.shape, False, False, 0.1) Then Exit Function ' False
        
    Else
        If Not variante.variantGroupName = Me.variantGroupName Then Exit Function
        If Not variante.variantName = Me.variantName Then Exit Function
    End If
    
    
    
    isEqualTo = True
    
End Function


Public Function canHaveJob() As Boolean
    
    Select Case typee
        Case GroundplateVariantType, StaticVariantType, LayerVariantType
            canHaveJob = True
    End Select
    
End Function


Public Function getDesignVariantChildIndex() As Integer
    getDesignVariantChildIndex = CInt(variantName)
End Function


Public Function getDesingVariantGroupIndex() As Integer
    getDesingVariantGroupIndex = designElementVarianteGroupNr
End Function


Public Function Activate()
    parent.activateVariant Me
End Function

' ACHTUNG: macht nur diese Variante aktiv oder inaktiv. Misachtet andere in der Gruppe
' Wird vom parent VariantGroup aufgerufen
' Stattdesse '.activate' nutzen
Public Function setActive(activ As Boolean)
    shape.visible = activ
End Function



Public Function toString() As String
    
    toString = "Variante(variantName: " & variantName & ", variantGroupName: " & variantGroupName & ", typee: " & typee & ", objectID: " & objectID
    
    If Not Globals.isShapeReferenceValid(shape) Then
        toString = toString & ", shape: Referez ungültig"
    Else
        If shape.Type = cdrGroupShape Then
            toString = toString & ", shape.shapes: " & Globals.shapeRangeToString(shape.shapes.All)
        Else
            toString = toString & ", shape: " & Globals.getShapeDisplayName(shape)
        End If
    End If
    
    toString = toString & ")"
End Function


Public Function getShapeNameWithoutOtherTags() As String
    getShapeNameWithoutOtherTags = shapeNameWithoutOtherTags
End Function


Public Function getStaticVariantGroupTypeName(groupType As staticVariantGroupTypes) As String
    Dim result As String
    Select Case groupType
        Case staticVariantGroupTypes.BefestigungStaticVariantGroupType: result = "Befestigung"
        Case staticVariantGroupTypes.RahmenStaticVariantGroupType: result = "Rahmen"
        Case staticVariantGroupTypes.TasterStaticVariantGroupType: result = "Taster"
        Case staticVariantGroupTypes.FakeFKEdelstahlHintergrundplatteVariantGroupType: result = "Edelstahl Hintergrundplatte" ' TODO FK-SHOPIFY-QUICK
        Case staticVariantGroupTypes.FakeFKEckenVariantGroupType: result = "Ecken" ' TODO FK-SHOPIFY-QUICK
    End Select
    getStaticVariantGroupTypeName = result
End Function


Public Function getNameForFancyZIP() As String
    getNameForFancyZIP = variantGroupNameForFancy & "-" & variantName
End Function

Public Function getNameForFancyLayout() As String
    Dim result As String

    If Not getJob Is Nothing Then
        result = getJob.variantNameBeautiful
    Else
        result = variantName
    End If
    
    getNameForFancyLayout = result
End Function


' Wird beim Klonen von Jobs genutzt, die eine Variante sind (bzw. haben)
Public Function clone() As variante

    Dim newVariante As New variante
    Set newVariante.shape = shape
    Set newVariante.layer = layer
    newVariante.typee = typee
    newVariante.variantGroupName = variantGroupName
    newVariante.p_variantGroupNameForFancy = p_variantGroupNameForFancy
    newVariante.variantName = variantName
    newVariante.variantIsEmptyVariant = variantIsEmptyVariant
    newVariante.setOriginalShapeName originalShapeName
    ' shapeNameWithoutOtherTags wird hier ^ oben gesetzt
    newVariante.setJob job
    ' jobInitialized wier ^ hier oben gesetzt
    Set newVariante.p_redOrPinkShapes = p_redOrPinkShapes
    newVariante.designElementVarianteGroupNr = designElementVarianteGroupNr
    newVariante.staticVariantGroupType = staticVariantGroupType
    newVariante.p_confiThumbnailFileName = p_confiThumbnailFileName
    newVariante.p_confiThumbnailFileTypeForFancy = p_confiThumbnailFileTypeForFancy
    newVariante.p_confiThumbnailFileTypeForAmazon = p_confiThumbnailFileTypeForAmazon

    Set clone = newVariante
End Function
