Attribute VB_Name = "ConfiHelper"
Option Explicit

Public Enum confiType
    amazon
    fancy
End Enum


Dim logger As logger

Public sizeFolder As FSSizeFolder

Public design As productDesign
Dim isDesignMainProduct As Boolean ' Ist es kein echtes Design, sondern das Hauptprodukt mit 'Dein Wunschtext'
Public designFiles As FSDesignFiles

' Einstellungen
Public exportPath As String ' Der Pfad, der durch den User im Dialogfenster festgelegt wird. Wird aber auch Standartmäßig durch den Pfad der CDR vorgegeben
Public focusedLayerIndex As Integer
Public exportLook As Boolean
Dim confiExportType As confiType
Public backgroundName As String
Dim automaticGroundplateVariants As Boolean
Dim customBackgroundpath As String
Dim exportSimpleFolderIconWhenGraving As Boolean


' Größe
' -----------------------------
Private p_confiBoundingBox As shape ' Das blaue Rechteck, dass die Größe des Konfis abbildet und zum zuschneiden benutzt wird
Private p_confiPaddingBox As shape
Private p_confiAndDesignBleedBoundingBox As shape ' Begrenzung des Konfis mit dem Überdruck des Designs, falls dieser größer ist als die Konfi-Begrenzung
'
Public confiWidth As Double
Public confiHeight As Double
Public confiMinHeight As Double
Public confiWidthMinusPadding As Double
Public confiHeightMinusPadding As Double
'
Dim confiMaxWidth As Double
Dim confiMaxHeight As Double
'
' Padding individuell pro Seite steuerbar
Public confiPaddingLeft As Double
Public confiPaddingTop As Double
Public confiPaddingRight As Double
Public confiPaddingBottom As Double
' -----------------------------








Public Function init(exportPath_ As String, confiExportTypeVar As confiType, focusedLayerIndexVar As Integer, exportLookVar As Boolean, ByVal exportSimpleFolderIconWhenGravingVar As Boolean, _
    automaticGroundplateVariantsVar As Boolean, width As Double, height As Double, Optional ByVal customBackgroundpathVar As String, _
    Optional loggerVar As logger = Nothing, _
    Optional paddingLeft As Double = -1, Optional paddingTop As Double = -1, Optional paddingRight As Double = -1, Optional paddingBottom As Double = -1, _
    Optional confiMinHeight_ As Double)
    
    exportPath = exportPath_
    Set logger = loggerVar
    Set p_confiBoundingBox = Nothing
    Set p_confiPaddingBox = Nothing
    Set p_confiAndDesignBleedBoundingBox = Nothing
    confiMinHeight = confiMinHeight_
    
    If Not logger Is Nothing Then logger.addTab , "[ConfiHelper.init] "
    
    Set sizeFolder = New FSSizeFolder
    sizeFolder.init exportPath
    
    confiExportType = confiExportTypeVar
    focusedLayerIndex = focusedLayerIndexVar
    exportLook = exportLookVar
    customBackgroundpath = customBackgroundpathVar
    
    exportSimpleFolderIconWhenGraving = exportSimpleFolderIconWhenGravingVar
    automaticGroundplateVariants = automaticGroundplateVariantsVar
    
    PlaceFile.initIfNeeded
    
    ActiveDocument.unit = cdrPixel
    
    setConfiguratorSize width, height, paddingLeft, paddingTop, paddingRight, paddingBottom, True, , True
    
    'Dokumentengröße anpassen...
    With ActiveDocument.MasterPage
        .setSize confiWidth, confiHeight
    End With
    
    'Nach dem die Dokumentengröße angepasst wurde, wird die confiBoundingBox positioniert (ansonsten würde es noch die Position haben, die es vor der Dokumentengrößenänderung hatte)
    confiBoundingBox.positionX = 0
    If confiExportType = amazon Then
        confiBoundingBox.positionY = confiHeight
    Else
        confiBoundingBox.positionY = 0
    End If
    
    ' Die confiPaddingBox wurde in 'setConfiguratorSize' vor der Dokumentengrößenänderung erstellt/positioniert und hat deshalb noch die alte Position.
    ' Beim Fancy wird sie später pro View neu gesetzt, beim Amazon nicht. Deshalb jetzt relativ zur (bereits richtig positionierten) confiBoundingBox ausrichten.
    confiPaddingBox.SetBoundingBox confiBoundingBox.LeftX + confiPaddingLeft, confiBoundingBox.BottomY + confiPaddingBottom, confiWidthMinusPadding, confiHeightMinusPadding
    
    
    If Not logger Is Nothing Then logger.removeTab
    
End Function





Property Get confiBoundingBox() As shape
    If p_confiBoundingBox Is Nothing Then
        Set p_confiBoundingBox = createBlueBox(0, 0, confiWidth, confiHeight, "confiBoundingBox")
    End If
    
    Set confiBoundingBox = p_confiBoundingBox
End Property


Property Get confiPaddingBox() As shape
    If p_confiPaddingBox Is Nothing Then
        Set p_confiPaddingBox = createBlueBox(confiPaddingLeft, confiPaddingBottom, confiWidthMinusPadding, confiHeightMinusPadding, "confiPaddingBox")
    End If
    
    Set confiPaddingBox = p_confiPaddingBox
End Property


Private Function createBlueBox(x As Double, y As Double, w As Double, h As Double, name As String) As shape
    Dim result As shape
    Set result = ActiveLayer.CreateRectangle(x, y, w, h)
    result.fill.ApplyNoFill
    result.outline.Type = cdrOutline
    result.outline.color = CreateRGBColor(0, 0, 255) ' Blau
    result.name = name
    
    Set createBlueBox = result
End Function



Private Function setDesignToProcess(designToProcess As productDesign, ByVal index As Integer)

    If Not logger Is Nothing Then
        logger.logINFO "[ConfiHelper.setDesignToProcess] designToProcess: '" & designToProcess.getProductID & "'"
        logger.addTab
    End If
    
    Set design = designToProcess
    setDesignFilesForDesign designToProcess
    
    
    ' Konfigröße auf Originalgröße zurückstellen, da für den Fancy die Größe je nach Produkt eingestellt wird
    If confiExportType = fancy Then
        setConfiguratorSize confiMaxWidth, confiMaxHeight, confiPaddingLeft, confiPaddingTop, confiPaddingRight, confiPaddingBottom, False, True, True
    End If
    
    
    ' CACHING
    ' --------------------------------------
    If Not logger Is Nothing Then logger.logINFO "Cache Design Metadaten: "
    design.getMetaInfoShapes ' Cachen
    ' --------------------------------------
    
    
    ' PROBLEME VERHINDERN
    ' --------------------------------------
    findProblems designToProcess
    ' --------------------------------------




    
    
    
'    ' TEXTAUSSCHNITTE
'    ' Wenn es rote/pinke Texte gibt (Textauschnitte also), dann werden diese entfernt und die Grundplatten neu gesetzt, damit der Text verschwindet,
'    ' denn der Kunde soll den Text im Konfi selber setzen können (Amazon oder Fancy).
'    ' ======================================================================
'
'    designToProcess.seperateMainShapesSmallerShapesOfLayers
'
'    Dim currentLayer As productDesignLayer
'    Dim currentPart As ProductDesignPart
'
'    For p = 1 To designToProcess.getPartsCount
'        Set currentPart = designToProcess.getPart(p)
'
'        For i = 1 To currentPart.layers.count
'            Set currentLayer = currentPart.layers.getLayer(i)
'            If currentLayer.hasRedOrPinkText Then
'
'                currentLayer.deleteSameRedOrPinkShapesFromLayersBelow 'logger
'
'            End If
'
'            currentLayer.invalidateAllRedShapes ' Muss komischerweise gemacht werden
'            Set currentLayer = Nothing
'        Next i
'        Set currentPart = Nothing
'    Next p
'    ' ======================================================================
    
    
    
    ' Beschnittzugabe entfernen
    ' ------------------------------------------------------------
    If confiExportType = amazon Then
        If Not logger Is Nothing Then logger.logINFO "Beschnittzugabe entfernen:"
        Dim i As Integer
        For i = 1 To designToProcess.getLayerCount
            designToProcess.getLayer2(i).removeBleed logger
            designToProcess.getLayer2(i).invalidateAll
            If Not logger Is Nothing Then logger.logINFO "- Beschnittzugabe beim Layer #" & i & " entfernt"
        Next i
    Else
        If Not logger Is Nothing Then logger.logINFO "Beschnittzugabe wird nicht entfernt. Nur bei Amazon"
    End If
    ' ------------------------------------------------------------
    
    
    If Not logger Is Nothing Then logger.removeTab
End Function



' Diese Funktion kann mehrfach aufgerufen werden, da der sizeFolder die DesignFiles cached
Public Function setDesignFilesForDesign(design As productDesign)
    Set designFiles = sizeFolder.getDesignFilesByProductID(design.getProductID)
End Function



Public Function createConfi(design_ As productDesign, ByVal index As Integer, viewSettings As ConfiPartToViewSortInstruction, _
    Optional backgroundNameVar As String = "Weiß.png") As ConfiExport
    
    If Not logger Is Nothing Then
        logger.logINFO "[ConfiHelper.createConfi] confiType: '" & confiExportType & "'"
        logger.addTab
    End If
    
    setDesignToProcess design_, index
    
    backgroundName = backgroundNameVar
    
    
    
    Dim confiEx As New ConfiExport
    Set confiEx.viewSettings = viewSettings
    
    ' Manche Funktionen nutzen es um zu gucken ob es die erste Variante ist die exportiert wird
    ' Bspw. um die Hauptmaske zu generieren
    ' (muss wohl 1 sein auch wenns keine Varianten gibt)
    confiEx.varianteIndex = 1
    
    ' TODO Entfernen
'    confiEx.varianteIndex = varianteIndex
'    Set confiEx.variante = variante
'    Set confiEx.allVariants = allVariants
    confiEx.exportIndex = 1
    
    
    processDesign confiEx
    
    Set createConfi = confiEx
    
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function cleanUp()
    If Not Globals.isShapeDeleted(confiBoundingBox) Then
        p_confiBoundingBox.delete
        Set p_confiBoundingBox = Nothing
    End If
    If Not Globals.isShapeDeleted(confiPaddingBox) Then
        p_confiPaddingBox.delete
        Set p_confiPaddingBox = Nothing
    End If
End Function



Private Function processDesign(confiEx As ConfiExport)
    
    If Not logger Is Nothing Then
        logger.logINFO "[ConfiHelper.processDesign] Verarbeite Design '" & design.getProductID & "' -------------------------------------------------------------------------------------------------------------"
        logger.addTab
    End If
    
    
    Dim partsSortedInViews As collection
    Set partsSortedInViews = getPartsSortedInViews(design, confiEx.viewSettings)
    Set confiEx.partsSortedInViews = partsSortedInViews
    
    Dim i As Integer
    For i = 1 To partsSortedInViews.count
        Dim newView As New ConfiView
        Set newView.parts = partsSortedInViews(i)
        
        newView.index = i
        
        confiEx.addView newView
        Set newView = Nothing
    Next i
    
    
    ' Wird mehrfach genutzt
    Dim currentLayer As ProductDesignLayer
    
    
    ' Grundplatten mischen
    ' ----------------------------------------------
    If Not logger Is Nothing Then logger.logINFO "Suche nach Grundplatten zum Mischen:"
    Dim v As Integer
    For v = 1 To confiEx.partsSortedInViews.count

        Dim parts As ProductDesignPartRange
        Set parts = confiEx.partsSortedInViews(v)

        Dim p As Integer
        For p = 1 To parts.count
            Dim part As ProductDesignPart
            Set part = parts.getPart(p)

            ' Letzten Layer überspringen, da dieser keine Grundplatte unter sich zum Mixen hat
            '                           v
            Dim l As Integer
            For l = part.layers.count - 1 To 1 Step -1

                Set currentLayer = part.getLayer(l)
                
                If Not currentLayer.isEmptyVariant Then
                    For i = 1 To currentLayer.getVariantsOfType(GroundplateVariantType).allVariants.count
                        Dim currentGroundPlate As shape
                        Set currentGroundPlate = currentLayer.getVariantsOfType(GroundplateVariantType).getVariant(i).shape
                        
                        If Globals.isGroundPlateTransparent(currentGroundPlate) Then
                            Dim layerBelow As ProductDesignLayer
                            Set layerBelow = part.getLayer(l + 1)

                            If Not layerBelow.isEmptyVariant Then
                                If Not logger Is Nothing Then logger.logINFO "- Grundplatte #" & i & " Name: '" & currentGroundPlate.name & "' ist transparent und wird mit der Grundplatte des darunterliegenden Layers gemixt"
                                mixLayerGroundplates currentLayer, currentGroundPlate, layerBelow, layerBelow.getGroundPlate
                                
                            End If

                            Set layerBelow = Nothing
                        End If
                    Next i
                End If

                Set currentLayer = Nothing
            Next l

            Set part = Nothing
        Next p

        Set parts = Nothing
    Next v
    If Not logger Is Nothing Then logger.logINFO ""
    ' ----------------------------------------------
      




    ' \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \
    ' / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / /
     processViews confiEx
     
     ' Wenn das Design merhfach exportiert werden soll, muss es am Ende invalidiert werden, da beim verändern/zuschneiden von Formen Referenzen verloren gegangen sind
    If Not confiEx.allVariants Is Nothing Then
        If confiEx.allVariants.count > 1 Then
            design.invalidateLayers
        End If
    End If

    ' Bei einem zweiten Durchlauf nicht nochmal Vorbereiten: Grundplattenvarianten platzieren, Hauptmasek erstellen usw.
    confiEx.prepareForExport = False

    
    If Not logger Is Nothing Then logger.removeTab
End Function




Private Function processViews(confiEx As ConfiExport)
    
    confiEx.productID = design.getProductID
    
    If Not logger Is Nothing Then
        logger.logINFO "[ConfiHelper.processViews] Verarbeite Parts sortiert in Views. varianteIndex(ZIP-Nr): " & confiEx.varianteIndex
        logger.addTab
    End If


    Dim i As Integer
    Dim p As Integer
    Dim l As Integer
    Dim j As Integer
    
    i = 1
    While i < confiEx.getViewCount + 1
        
        Dim currentView As ConfiView
        Set currentView = confiEx.getView(i)
        
        
        ' Wenn die aktuelle View mindestens ein Part hat...
        If Not currentView.parts.count = 0 Then
            
            ' Wenn noch nicht skaliert wurde, Größe der View berechnen
            If confiEx.prepareForExport Then
                currentView.prepareForExport
            End If
                
            
            ' Die Layer aller Parts in eine Collection packen.
            ' --------------------------------------------
            logger.logFINE "Sammle alle Layer der Parts dieser View:"
            
            For p = 1 To currentView.parts.count
                For l = 1 To currentView.parts.getPart(p).count
                    Dim currentLayer As ProductDesignLayer
                    Set currentLayer = currentView.parts.getPart(p).item(l)
                    currentView.layersFlattened.add currentLayer ' partsSortedInViews(i)(p)(l)
                    
                    logger.logFINE "- Adde Layer. Part #" & currentLayer.getPartIndex & ", Layer #" & currentLayer.getLayerIndex
                    
                    Set currentLayer = Nothing
                Next l
            Next p
            logger.logFINE ""
            ' --------------------------------------------
            
            
            
            ' Eigenschaften Cachen
            ' ----------------------------
            For j = 1 To currentView.layersFlattened.count
                Dim layer As ProductDesignLayer
                Set layer = currentView.layersFlattened.getLayer(j)
                layer.getMainShapeSize
                layer.getShapeName

                Set layer = Nothing
            Next j
            ' ---------------------------
            
            
            
            ' EBENEN-NAMEN:
            ' Wenn dies das erste mal ist, das die View exportiert wird (kann mehrmals vorkommen wegen Varianten),
            ' dann sollen die Ebenennamen ermittelt werden. Beim 2. mal geht das nicht mehr, da dann die Formen schon auf Fancygröße sind
            ' ----------------------------------------------------------------------------------------------
            If confiEx.prepareForExport Then
            
                ' TODO DEBUG
                For j = 1 To currentView.layersFlattened.count
                    Set layer = currentView.layersFlattened.getLayer(j)
                    layer.invalidateAll
    
                    Set layer = Nothing
                Next j
                
                
                'Layername = Die Formnamen der Layer (Aus der 'Alle Formen' Datei)
                'Set currentView.layersFlattenedNames = getLayersNames(currentView.layersFlattened) ' A - B ist oben unter 'Eigenschaften Cachen' layer.getShapeName
'                If Not logger Is Nothing Then logger.logINFO "Namen für die Layer: " & Globals.collectionToString(currentView.layersFlattenedNames)
            End If
            ' ----------------------------------------------------------------------------------------------
            
            
            ' \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \
            ' / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / /
            processView confiEx, currentView, design
            
            
            i = i + 1
        Else
            
            ' View hat keine Parts
            confiEx.removeView i
        End If
        
        Set currentView = Nothing
    Wend
    
    
    logger.removeTab
End Function




Private Function processView(confiEx As ConfiExport, view As ConfiView, design As productDesign)
        'f2VariantToExport As variante, fancyVariantsToProcess As collection, layerNames() As String) As ConfiView
    
    ' Wird mehrfach verwendet
    Dim i As Integer
    Dim j As Integer
    Dim g As Integer
    
    Dim partsStringForLogger As String
    For i = 1 To view.parts.count
        partsStringForLogger = partsStringForLogger & IIf(i = 1, "", ", ") & "Part #" & view.parts.getPart(i).getLayer(1).getPartIndex
    Next i
    
    Dim viewLayersFlattenedForLogger As String
    For i = 1 To view.layersFlattened.count
        viewLayersFlattenedForLogger = viewLayersFlattenedForLogger & IIf(i = 1, "", "| ") & "Part #" & view.layersFlattened.getLayer(i).getPartIndex & ", Layer #" & view.layersFlattened.getLayer(i).getLayerIndex
    Next i
    
    If Not logger Is Nothing Then
        logger.logINFO "[ConfiHelper.processView] Verarbeite View. viewIndex: " & view.index & ", varianteIndex: " & confiEx.varianteIndex & ", Parts: " & partsStringForLogger & ", LayersFlattened: " & viewLayersFlattenedForLogger
        logger.addTab
    End If
    
    ' Für den Fancy wird die Konfigröße immer passend zum Produkt gesetzt ?
    If confiExportType = fancy Then
        setConfiguratorSize confiMaxWidth, confiMaxHeight, confiPaddingLeft, confiPaddingTop, confiPaddingRight, confiPaddingBottom, False, True, True
    End If
    
    
    
    ' Fokusierte Schichten der Parts ermitteln
    ' -----------------------------------------
    For i = 1 To view.parts.count
        view.focusedLayersOfParts.add getFocusedLayer(view.parts.getPart(i).layers)
    Next i
    ' -----------------------------------------
    
    ' Wird mehrfach verwendet
    Dim currentLayer As ProductDesignLayer
    
    ' "shapeRangeForViewFitting" ist die Shaperange anhand dessen die Layer der View in die Konfigröße eingepasst werden.
    ' Das kann pro Layer entweder die rote/pinke Hauptformen des Layers sein. (Somit währe der Layer komplett sichtbar)
    ' Oder es ist die 'layerView' Form, die kleiner/größer als die Hauptform ist. Die Form ist vom User gesetzt um bspw. nicht designbare Füße von Standbildern/Stecker auszuschließen
    Set view.shapeRangeForViewFitting = view.parts.getShapesForViewFitting

    
    
    
    
    ' Edelstahlgrundplatten vor der Skalierung rastern, damit die Textur nicht verwaschen und fleckig wird
    ' Granitgrundplatte rastern, da diese komischerweise nicht mitskaliert wird (obwohl Einstellung an)
    ' -------------------------------------------------------------------------
    If confiEx.prepareForExport Then
        For i = 1 To view.layersFlattened.count
            Set currentLayer = view.layersFlattened.getLayer(i)
            
            If Not currentLayer.isEmptyVariant Then
                
                If InStr(currentLayer.getGroundPlate.name, "Edelstahl") Or _
                       InStr(currentLayer.getGroundPlate.name, "Granit") Then
                       
                       ' TODO Nur die Textur Rastern. Nicht aber die Zuschnittsform.
                       ' Von daher muss die Zuschnittsform vorher entfernt werden, dann wird gerastert (nur die Textur) und dann wird die Form wieder angewendet
                       ' ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! !
                       
                    currentLayer.getGroundPlate.convertToBitmap , , , , 300
                    currentLayer.invalidateGroundPlate
                    currentLayer.invalidateVariantType GroundplateVariantType
                End If
            End If
        Next i
    End If
    ' -------------------------------------------------------------------------
    
    
    
    
    ' Grundplattenvarianten platzieren
    ' -------------------------------------------------------------------------
    If Not logger Is Nothing Then logger.logINFO "Grundplattenvarianten platzieren:"
    If confiEx.prepareForExport Then
        If automaticGroundplateVariants Then
                
                
            For i = 1 To view.layersFlattened.count
                Set currentLayer = view.layersFlattened.getLayer(i)
                
                currentLayer.placeAutomaticGroundPlateVariants logger
                
            Next i
                
        Else
            If Not logger Is Nothing Then logger.logINFO "- Grundplatten platziern übersprungen! Denn die Option 'automatische Grundplattenvarianten' ist ausgestellt"
        End If
    Else
        If Not logger Is Nothing Then logger.logINFO "- Grundplatten platziern übersprungen! Denn dieser Durchlauf ist nicht der erste. Also nicht die erste ZIP."
    End If
    If Not logger Is Nothing Then logger.logINFO ""
    ' -------------------------------------------------------------------------
    
    
    
    For i = 1 To view.layersFlattened.count
        If view.layersFlattened.getLayer(i).newCustomShapeTypeQuery(ConfiMaskShapeType).search.count > 0 Then
            view.hasPredefinedMask = True
            Exit For
        End If
    Next i
    
    
    
    ' Look Platzieren
    ' -------------------------------------------------------------------------
    If Not logger Is Nothing Then logger.logINFO "Look platzieren:"
    If Not view.hasPredefinedMask Then
        If confiEx.prepareForExport Then
            If exportLook Then
            
                For i = 1 To view.layersFlattened.count
                    Set currentLayer = view.layersFlattened.getLayer(i)
                    
                    'Leere Varianten sind nur imaginär und haben somit auch keine Grundplatte oder Look dafür
                    If Not currentLayer.isEmptyVariant Then
                        For j = 1 To currentLayer.getVariantsOfType(GroundplateVariantType).allVariants.count
                            currentLayer.activateGroundPlateVariant (j), False, logger
                            
                            logger.logINFO "- Platziere Look auf '" & currentLayer.getVariantsOfType(GroundplateVariantType).getVariant(j).shape.name & "'"
                            ' Unbedingt vor dem Runterskalieren platzieren, da die Originalgröße fürs platzieren gebraucht wird
                            Globals.placeLookOnLayer currentLayer, True, logger ', , currentLayer.getGroundPlate.name = ">Acryl_Klar_Grundplatte"
                            
                        Next j
                        
                        ' Erste Variante wieder aktivieren
                        currentLayer.activateGroundPlateVariant (1), False, logger
                    End If
                Next i
                
            Else
                If Not logger Is Nothing Then logger.logINFO "- Der Look wird nicht platziert, da die Option 'exportLook' aus ist. "
            End If
        Else
            If Not logger Is Nothing Then logger.logINFO "- Der Look wird nicht platziert, da dieser Durchlauf nicht der erste ist. Also nicht die erste ZIP"
        End If
    Else
        If Not logger Is Nothing Then logger.logINFO "- Der Look wird nicht platziert, da diese View eine vorgefertigte Maske hat"
    End If
    If Not logger Is Nothing Then logger.logINFO ""
    ' -------------------------------------------------------------------------
    
    
    
    ' Looks mit dazugehöriger Grundplatte zusammenfügen, wenn wegen Grundplattenvarianten
    ' Look & Grundplatte zusammen getauscht werden müssen im Konfi
    reduceLookIfNeeded view.parts
    
    
    
    
    
    ' Skalierung auf Konfigröße
    ' Größe des Fancys auf Produkt anpassen (Damit keine Ränder übrigbleiben). Aber nur im Fancy-Modus vv
    fitViewToKonfiSize view, confiExportType = fancy
    
    
    
    
    
    ' Zu kleine Kreuze entfernen
    ' Muss nach der Skalierung auf Konfigröße gemacht werden
    If confiExportType = amazon Then
        AmazonExport.removeSmalCrossInView view.layersFlattened
    End If
    
    
    
    
    ' Masken erstellen
    ' ==================================================================
    If confiEx.prepareForExport Then
            
            Dim createdVariantMasks As Boolean
            
            If Not logger Is Nothing Then logger.logINFO "Masken erstellen:"
            
'            ' Varianten-Hauptmasken erstellen
'            ' Wenn im Fancy-Export-V2, dann soll geguckt werden ob Varianten wie z.B: Bohrlöcher weitere Hauptmasken benötigen
'            If fancyExport2 Then
                
                If Not logger Is Nothing Then logger.logINFO "- Variantenmasken für den FancyExportV2:"
                
                'TODO, Was ist wenn es mehr als eine fokusierte Schicht gibt, weil mehrere Parts in dieser View sind
                For g = 1 To view.focusedLayersOfParts(1).getStaticVariantGroups(logger).count
                    
                    For j = 1 To view.focusedLayersOfParts(1).getStaticVariantGroups()(g).variants.count
                        
                        Dim currentVariante As variante
                        Set currentVariante = view.focusedLayersOfParts(1).getStaticVariantGroups()(g).variants.item(j)
                        
                        If currentVariante.getJob Is Nothing Then
                            Err.Raise vbObjectError + 513, , "[FancyExport.processView] Der SubJob der Variante '" & currentVariante.shape.name & "' wurde nicht gefunden!"
                        End If
                        
'                        If currentVariante.getSubJob.parentJob.isGeneratingOwnMask Then
'                            If Not logger Is Nothing Then logger.logINFO "-- Erstelle Maske für Variante: " & currentVariante.variantGroupName & ", " & currentVariante.variantName
'
'                            createMainMask view.layersFlattened, view.shapeRangeForViewFitting, view.focusedLayersOfParts(1), (g), (j), replace(currentVariante.variantGroupName, "var_", "") & "(" & currentVariante.variantName & ")", currentVariante
'
'                            createdVariantMasks = True
'                        Else
'                            If Not logger Is Nothing Then logger.logINFO "-- Variante (" & currentVariante.variantName & ") bekommt wegen seiner Einstellung keine Maske!"
'                        End If
                        
                        If currentVariante.getJob.isGeneratingVariantMask Then
                            createVariantMask view.focusedLayersOfParts(1), currentVariante
                        End If
                        
                        
                        Set currentVariante = Nothing
                    Next j
                    
                Next g
                
'            End If
            
            ' Hauptmaske erstellen
            If Not createdVariantMasks Then
                If Not logger Is Nothing Then logger.logINFO "- Hauptmaske erstellen"
                getMainMask view.layersFlattened, view.shapeRangeForViewFitting
            Else
                If Not logger Is Nothing Then logger.logINFO "- Hauptmaske nicht erstellen. Es gibt mind. 1 Variante mit eigener Maske"
            End If
            
            If Not logger Is Nothing Then logger.logINFO "- Masken fertig!"
            
            
            ' Shapes vor die Maske packen (Abstandshalter, Kordeln)
            ' -----------------------------------
            Dim firstLayer As ProductDesignLayer
            Set firstLayer = view.layersFlattened.getLayer(1)

            Dim putOverMaskShapes As New shapeRange

            putOverMaskShapes.AddRange firstLayer.newCustomShapeTypeQuery(putOnMaskShape).setContinueSearchInMatchedGroups(False).setArgument1(firstLayer).search

            If putOverMaskShapes.count > 0 Then
                putOverMaskShapes.OrderFrontOf firstLayer.layerShape.shapes.First
            End If
            ' -----------------------------------
        
    End If
    If Not logger Is Nothing Then logger.logINFO ""
    ' ==================================================================
    
    
    
    
    ' Uploadboxen durch Grundplatte schneiden
    ' ------------------------------------------
    If confiEx.prepareForExport Then
        If Not logger Is Nothing Then logger.logINFO "Schneide Löcher für Uploadboxen: "
            
            ' TODO eigentlich müsste jede Uploadbox nur durch die Layer des eigenen Parts schneiden, nicht durch alle Layer in der View. Wenn es mehrere Parts in der View gibt schneiden dann unnötigerweise Uploadboxen aus anderen Parts fremde Parts
            For i = 1 To view.layersFlattened.count
                    Set currentLayer = view.layersFlattened.getLayer(i)
                    
                    If currentLayer.getVariantsOfType(GroundplateVariantType).allVariants.count > 1 Then
                    
                        For j = 1 To currentLayer.getVariantsOfType(GroundplateVariantType).allVariants.count
                            currentLayer.activateGroundPlateVariant (j), False
                            
                            mixBackgroundWithGroundPlate currentLayer, view
                            If Not confiExportType = fancy Then ' Bei Shopify keine Fotomasken erstellen. Dort ist die Uploadbox selbst die Maske
                                createPhotoMask currentLayer, (j)
                            End If
                            
                            currentLayer.invalidateVariantType GroundplateVariantType ' Verhindert den Fehler, dass eine Grundplatte von einer Variante nicht mehr da ist
                        Next j
                        
                        ' Erste Grundplatte wieder aktivieren
                        currentLayer.activateGroundPlateVariant (1), False
                        
                    Else
                        If Not currentLayer.isEmptyVariant Then
                            mixBackgroundWithGroundPlate currentLayer, view
                            If Not confiExportType = fancy Then ' Bei Shopify keine Fotomasken erstellen. Dort ist die Uploadbox selbst die Maske
                                createPhotoMask currentLayer
                            End If
                        End If
                    End If
                    
            Next i
        If Not logger Is Nothing Then logger.logINFO "- Fertig"
    End If
    ' ------------------------------------------
    
    
    
    ' Falls Schichten hinter der Fokusierten sind, die Fokusierte durch die unteren schneiden,
    ' damit die Oberen als Maske für die Fokusierte dienen.
    '
    ' Z.B. hat man eine Acrylplatte auf einer Edelstahlplatte, die 1cm breiter ist.
    ' Dann wird die Edelstahlplatte vor der Acrylplatte gesetzt und die Acrylplatte durch das Edelstahl geschnitten, so dass ein Loch entsteht da wo Acryl ist.
    ' Dadurch ist die Edelstahlplatte zu einer Maske geworden
    ' ------------------------------------------------
    If Not logger Is Nothing Then logger.logINFO "Schneide fokusierte Schichten durch untere: "
    If confiEx.prepareForExport Then

        Dim p As Integer
        For p = 1 To view.parts.count

            For i = view.focusedLayersOfParts(p).getLayerIndex + 1 To view.parts.getPart(p).count

                Set currentLayer = view.parts.getPart(p).getLayer(i)

                ' Rote Formen nicht zuschneiden (da diese eig. immer auch zum fitten zwischengespeichert sind. Wenn sie auch zugeschnitten werden, geht die Referenz verloren)
                Dim currentLayerShapesWithoutRedPink As shapeRange
                Set currentLayerShapesWithoutRedPink = currentLayer.layerShape.shapes.All
                currentLayerShapesWithoutRedPink.RemoveRange currentLayer.getAllRedOrPinkShapes


                ' Es kann vorkommen, dass aus irgendeinem Grund keine roten Formen mehr von 'getAllRedOrPinkShapes' zurückkommen.
                ' Das kann dann zu weiteren Fehler führen, denn weiter unten würden die roten Formen zugeschnitten werden.
                ' Dadurch gehen dann die Referenzen zu 'shapeRangeForViewFitting' verloren
                If currentLayer.getAllRedOrPinkShapes.count = 0 Then
                    Err.Raise vbObjectError + 513, , "[ConfiHelper.processView] Keine roten/pinken Formen mehr vorhanden"
                End If

                Dim focusedLayerMainShape As shape
                Set focusedLayerMainShape = view.focusedLayersOfParts(p).getMainShapesCombinedCopyForMask

                If Not logger Is Nothing Then logger.logINFO "- Schneide die fokusierte Schicht vom Part '#" & p & "' durch Layer '#" & i & "'"
                Globals.subtractShapeWithShapeRange focusedLayerMainShape, currentLayerShapesWithoutRedPink, True, False, logger

                focusedLayerMainShape.delete
                Set focusedLayerMainShape = Nothing

                currentLayer.invalidateAll

                Set currentLayer = Nothing
            Next i

        Next p
    Else
        If Not logger Is Nothing Then logger.logINFO "Nicht nötig, da schon einmal für den Export vorbereitet"
    End If
    If Not logger Is Nothing Then logger.logINFO "- Fertig"
    If Not logger Is Nothing Then logger.logINFO ""
    ' ------------------------------------------------
    
    
    
    
    ' Reihenfolge in der die Schichten verarbeitet werden
    ' ---------------------------------------------------
    For i = 1 To view.layersFlattened.count
        
        ' Fokusierte Schichten am ende erst
        Dim isAFocusedLayer As Boolean
        For j = 1 To view.focusedLayersOfParts.count
            If view.layersFlattened.getLayer(i) Is view.focusedLayersOfParts(j) Then
                isAFocusedLayer = True
                GoTo ContinueFor
            End If
        Next j
ContinueFor:
        
        If Not isAFocusedLayer Then
            view.layerProcessOrderIndexies.add i
            view.layersInKonfiOrder.add view.layersFlattened.getLayer(i)
        End If
        
        isAFocusedLayer = False
    Next i
    
    ' Fokusierte Schichten am ende erst
    For j = 1 To view.focusedLayersOfParts.count
        Dim layerIndexOffsetFromPreviousParts As Integer
        
        ' Alle vorherigen Parts durchlaufen
        Dim k As Integer
        For k = 1 To j - 1
            layerIndexOffsetFromPreviousParts = layerIndexOffsetFromPreviousParts + view.parts.getPart(k).count
        Next k
        
        ' Wenn Parts vor diesem kamen, ist der Index dadurch verschoben, weil alle Layer von allen Parts in "viewLayersFlattened" sind
        view.layerProcessOrderIndexies.add view.focusedLayersOfParts(j).getLayerIndex + layerIndexOffsetFromPreviousParts
        view.layersInKonfiOrder.add view.layersFlattened.getLayer(view.layerProcessOrderIndexies(view.layerProcessOrderIndexies.count))
        
        layerIndexOffsetFromPreviousParts = 0
    Next j
    
    If view.confiEx.prepareForExport Then
        ' Layer nach Index benennen damit sie nach der Umsortierung besser zu verstehen sind
        For i = 1 To view.layersFlattened.count
            Set currentLayer = view.layersFlattened.getLayer(i)
            currentLayer.layerShape.name = IIf(currentLayer.layerShape.name = "", "", currentLayer.layerShape.name & " - ") & currentLayer.getLayerIndex
            Set currentLayer = Nothing
        Next i
    End If
    
    
    ' Ordern
    Dim previousLayer As ProductDesignLayer
    For i = 2 To view.layersInKonfiOrder.count
        
        Set currentLayer = view.layersInKonfiOrder.getLayer(i)
        Set previousLayer = view.layersInKonfiOrder.getLayer(i - 1)
        
        currentLayer.layerShape.OrderBackOf previousLayer.layerShape
        
        Set currentLayer = Nothing
        Set previousLayer = Nothing
    Next i
    ' ---------------------------------------------------
    
    
    design.invalidateLayers
    
    
    If Not logger Is Nothing Then logger.removeTab
End Function




' Returnt die Views als Childs in der Collection und die Layers wiederum als Child in den View-Collections
' Views:
' - View:
' -- Layer
Private Function getLayersSortedInViews(design As productDesign, viewSettings As collection) As collection

    Dim viewsColl As New collection
    Dim layersOfView As collection

    Dim i As Integer
    Dim p As Integer
    Dim l As Integer

    'Alle möglichen Views durchlaufen
    For i = 1 To 4

        ' Anhand von den ViewSettings die Parts in die Views packen
        ' ---------------------------------------------------------
        Set layersOfView = New collection

        For p = 1 To viewSettings(i).count
            Dim partIndex As Integer
            partIndex = viewSettings(i)(p)
            If Not partIndex > design.getPartsCount Then

                 For l = 1 To design.getPart(partIndex).count
                    layersOfView.add design.getPart(partIndex).item(l)
                 Next l
                
            End If
        Next p

        viewsColl.add layersOfView
        ' ---------------------------------------------------------

        Set layersOfView = Nothing
    Next i


    Set getLayersSortedInViews = viewsColl
End Function


' Returnt die Views als Childs in der Collection und darin die Parts
' Views: (Collection)
' - partsOfView (ProductDesignPartRange)
Private Function getPartsSortedInViews(design As productDesign, viewSettings As ConfiPartToViewSortInstruction) As collection
    
    If Not logger Is Nothing Then
        logger.logFINE "[ConfiHelper.getPartsSortedInViews] Sortiere Designparts: "
        logger.addTab
    End If
    
    Dim viewsColl As New collection
    Dim partsOfView As ProductDesignPartRange

    'Alle Views durchlaufen
    Dim i As Integer
    For i = 1 To viewSettings.getViewsCount
    
        ' Anhand von den ViewSettings die Parts in die Views packen
        ' ---------------------------------------------------------
        Set partsOfView = New ProductDesignPartRange
        
        Dim p As Integer
        For p = 1 To viewSettings.getView(i).count
            Dim partIndex As Integer
            partIndex = viewSettings.getView(i)(p)
            If Not partIndex > design.getPartsCount Then
                
                If Not logger Is Nothing Then logger.logFINE "Sortiere Designpart #" & partIndex & " mit all seinen Layern in View " & i
                partsOfView.add design.getPart(partIndex)
                
            End If
        Next p

        viewsColl.add partsOfView
        ' ---------------------------------------------------------

        Set partsOfView = Nothing
    Next i
    
    logger.removeTab

    Set getPartsSortedInViews = viewsColl
End Function




' Mixt 2 Grundplatten (von verschiedenen übereinanderliegenden). Dabei wird eine Kopie von der Grundplatte des Mixlayer genutzt und mit
' der Grundplatte vom TargetLayer gemischt
' targetLayer = Oberer Layer
' mixLayer = Unterer Layer
' Wenn die Grundplatte vom Targetlayer satiniert ist, wird die Grundplatte des Mixlayer passend weichgezeichnet
Private Function mixLayerGroundplates(targetLayer As ProductDesignLayer, targetGroundPlate As shape, mixLayer As ProductDesignLayer, mixGroundPlate As shape)
    
    Dim targetMainShapesCombined As shape
    Set targetMainShapesCombined = targetLayer.getMainShapesCombinedCopyForMask
    
    Dim mixLayerGroundPlateCopy As shape
    Set mixLayerGroundPlateCopy = Globals.copyPasteShape(mixGroundPlate, False)
    mixLayerGroundPlateCopy.OrderBackOf targetGroundPlate

    ' Bei satiniert die darunterliegende Ebene weichzeichnen
    If Globals.isGroundPlateSatin(targetGroundPlate) Then
        Set mixLayerGroundPlateCopy = mixLayerGroundPlateCopy.ConvertToBitmapEx(, , True, 300)
        mixLayerGroundPlateCopy.bitmap.ApplyBitmapEffect "Gaussian Blur", "GaussianBlurEffect GaussianBlurRadius=2 , GaussianBlurResampled=0"
    End If
    
    
'    Set mixLayerGroundPlateCopy = Globals.intersectShapes(targetLayer.getMainShape, mixLayerGroundPlateCopy, True, False)
'    Set mixLayerGroundPlateCopy = Globals.intersectShapes(targetMainShapesCombined, mixLayerGroundPlateCopy, True, False)
    
    mixLayerGroundPlateCopy.OrderBackOf targetGroundPlate
    
'    Dim mixShapeRange As New ShapeRange
'    mixShapeRange.add targetLayer.getMainShape
'    mixShapeRange.add mixLayerGroundPlateCopy
'    mixShapeRange.ConvertToBitmap , , , , 300
    
    ' Corel zu ende machen lassen
    ' Verhindert den Fehler, dass Ebenen einfach irgendwo landen
    DoEvents
    
    
    ' Beide kombinieren
    Dim range As New shapeRange
    range.add targetGroundPlate
    range.add mixLayerGroundPlateCopy
    '                                   Transparent JA! (Corel misachtet es) v
    Set targetGroundPlate = range.ConvertToBitmapEx(cdrRGBColorImage, False, True, 300)
    
    ' Hier muss nochmal die gemixte Grundplatte zugeschnitten werden, da COREL nicht beachtet,
    ' dass die Bitmap hier drüber ^ transparent sein soll >:(
    Globals.intersectShapes targetMainShapesCombined, targetGroundPlate, True, False
    
    If targetLayer.isLayerVariant Then
        targetLayer.invalidateLayerVariant
    End If
    targetLayer.invalidateGroundPlate
    targetLayer.invalidateVariantType GroundplateVariantType
    targetLayer.invalidateAllRedShapes ' Muss wegen "targetLayer.getMainShapesCombinedCopyForMask" komischerweise auch gemacht werden
    
    targetMainShapesCombined.delete
    
End Function








Private Function getMainMask(productDesignLayers As ProductDesignLayerRange, shapeRangeForViewFitting As shapeRange, Optional focusedLayer As ProductDesignLayer = Nothing, _
        Optional ByVal activeVariantGroupIndex As Integer = -1, Optional ByVal activeVariantGroupChildIndex As Integer = -1, Optional variantName As String = "", _
        Optional variante As variante = Nothing) As shape
    
    logger.addTab , "[ConfiHelper.getMainMask]"
    
    Dim foundMasks As shapeRange
    Dim i As Integer
    For i = 1 To productDesignLayers.count
        Set foundMasks = productDesignLayers.getLayer(i).newCustomShapeTypeQuery(ConfiMaskShapeType).search
        
        If foundMasks.count > 0 Then
            Set getMainMask = foundMasks.firstShape
            getMainMask.name = "HauptMaske" 'TODO Warum? Ist doch fehleranfällig. Wenn eine Maske eine Variantenmaske ist und das im Namen steht, geht das hierdurch weg
            
            ' Maske zuschneiden
            Set getMainMask = Globals.intersectShapes(confiBoundingBox, getMainMask)
            
            logger.logINFO "Maske aus dem Design gefunden!"
            GoTo ExitFunction
        End If
        
        Set foundMasks = Nothing
    Next i
    
    
    Set getMainMask = createMainMask(productDesignLayers, shapeRangeForViewFitting, focusedLayer, activeVariantGroupIndex, activeVariantGroupChildIndex, variantName, variante)

ExitFunction:
    logger.removeTab
End Function



Public Sub createMainMaskForSelectedDesigns()
    
    Globals.endIfNoActiveShape
    
    Dim selection As New ProductDesignRange
    selection.AddRange Globals.getSelectedDesignsOrAll(, , True)
    
    Dim i As Integer
    For i = 1 To selection.count
        createMainMaskForSelectedDesigns_ProcessDesign selection.getDesign(i)
    Next i
    
End Sub


Private Function createMainMaskForSelectedDesigns_ProcessDesign(design As productDesign)
    
    Dim padding As Double
    padding = max(design.getDesignShape.SizeHeight, design.getDesignShape.SizeHeight)
    padding = padding / FancyExport.CONFI_DEFAULT_WIDTH * FancyExport.CONFI_PADDING
    
    ' Neuerstellung erzwingen
    Set confiBoundingBox = Nothing
    
    setConfiguratorSizeWithUniformPadding design.getDesignShape.SizeWidth, design.getDesignShape.SizeHeight, padding, , True
    
    Dim mask As shape
    Set mask = createMainMask(design.getLayers, design.getShapesForViewFitting)
    
    Globals.markShape mask, Globals.getConfiMaskKeyWord, , True, False
    
End Function



' Erstellt die Hauptmaske (die ganz oben liegt, über allem (außer  der Look, der liegt darüber)).
' Belässt die erstellte Hauptmaske erstmal im ersten Layer als child (Auch wenn es für den 2. Layer erstellt wurde). Später beim Export wird sie erkannt und richtig ausgegeben
' Wenn Varianten angegeben werden, werden diese beim Erstellen der Maske beachtet. Ansonsten werden Varianten ignoriert.
' Aktuell werden Varianten wie bspw. Bohrlöcher mit Schrauben drauf nur als weiße Bohrlöcher exportiert. Dazu wird eine Maske mithilfe von "createVariantMask" erstellt (Diese Funktion wird dafür nicht mehr genutzt)
' Returnt die Maske
Private Function createMainMask(productDesignLayers As ProductDesignLayerRange, shapeRangeForViewFitting As shapeRange, Optional focusedLayer As ProductDesignLayer = Nothing, _
        Optional ByVal activeVariantGroupIndex As Integer = -1, Optional ByVal activeVariantGroupChildIndex As Integer = -1, Optional variantName As String = "", _
        Optional variante As variante = Nothing) As shape
        
    ' Wird mehrfach verwendet
    Dim i As Integer
    Dim g As Integer
    
    Dim mask As shape
    Set mask = getBackground(productDesignLayers)
    
    Dim maskName As String
    maskName = Globals.getMainMaskKeyWord & IIf(variantName = "", "", "[" & variantName & "]")
    
    mask.name = maskName
    
    ' Wird mehrfach verwendet
    Dim currentLayer As ProductDesignLayer
    

    ' Maskentyp ermitteln (0 oder 1)
    ' ---------------------------
    Dim maskType As Integer
    maskType = 0
    For i = 1 To productDesignLayers.count
        Set currentLayer = productDesignLayers.getLayer(i)
        
        ' Leere Varianten überspringen
        If Not currentLayer.isEmptyVariant Then
            Dim subJob As PlaceFileSubJob
            Set subJob = PlaceFile.findSubJobByShape(currentLayer.getGroundPlate, currentLayer, False, True, True, True, True, True)
            
            If subJob Is Nothing Then
                Err.Raise vbObjectError + 513, , "[ConfiHelper.createMainMask] Der SubJob für die Grundplatte '" & Globals.getShapeDisplayName(currentLayer.getGroundPlate) & "' konnte nicht gefunden werden"
            End If
            
            If subJob.maskType = 1 Then
                maskType = 1
                Exit For
            End If
            
            Set subJob = Nothing
        End If
        
        
        Set currentLayer = Nothing
    Next i
    ' ---------------------------
    
    
    Dim maskCopyForLimit As shape
    Set maskCopyForLimit = ActiveLayer.CreateRectangle(mask.LeftX, mask.TopY, mask.RightX, mask.BottomY)
    maskCopyForLimit.name = "maskCopyForLimit"
    
    ' Maskten-Typ 0 (mit Schatten. Grundplatte nicht auf Maske)
    ' ::::::::::::::::::::::::::
    If maskType = 0 Then
        
        ' Schattenskaliereung.
        ' Der Schatten kann nähmlich für Amazon erstellt werden (scale 1) oder für den Fancy, welcher aber noch die PDF version hat (scale > 1(meistens da Produkt (in Pxl) > konfi (in Pxl)))
        ' ---------------------------------------------
        Dim shadowScale As Double
        Dim blurRadius As Double
        If confiExportType = amazon Then
            shadowScale = 1
            blurRadius = 200# * shadowScale
        Else
            shadowScale = mask.SizeWidth / (confiWidth * 4)
            blurRadius = 400# * shadowScale
        End If
        ' ---------------------------------------------
        
        
        
        'Schatten von Grundplatten anwenden
        For i = 1 To productDesignLayers.count
            
            
            Set currentLayer = productDesignLayers.getLayer(i)
            
            ' Leere Varianten überspringen (für den Schatten)
            If Not currentLayer.isLayerVariant Then
            
                Dim shadowShape As shape
                
                If Not activeVariantGroupIndex = -1 And currentLayer Is focusedLayer Then
                    Set shadowShape = currentLayer.getMainShapesCombinedCopyForMask(activeVariantGroupIndex, activeVariantGroupChildIndex)
                Else
                    Set shadowShape = currentLayer.getMainShapesCombinedCopyForMask
                End If
                
                If shadowShape.CanHaveFill Then shadowShape.fill.ApplyUniformFill CreateRGBColor(255, 0, 0) ' Füllen, damit der Schatten vollfächig ist
                If shadowShape.CanHaveOutline Then shadowShape.outline.Type = cdrNoOutline
                shadowShape.OrderFrontOf mask
                
                Dim shadowOnly As shape
                Set shadowOnly = Globals.createDropShadow(shadowShape, ActiveDocument.ToUnits(0.4, cdrMillimeter) * shadowScale, ActiveDocument.ToUnits(-0.4, cdrMillimeter) * shadowScale, blurRadius, 50)  ' ActiveDocument.ToUnits(15, cdrMillimeter) * shadowScale
                
                shadowShape.delete
                Set shadowShape = Nothing
                
                Dim shadowAndMask As New shapeRange
                shadowAndMask.add shadowOnly
                shadowAndMask.add mask
                
                Set mask = shadowAndMask.convertToBitmap(, , , , ActiveDocument.resolution)
                mask.name = maskName
               
                Set mask = Globals.intersectShapes(maskCopyForLimit, mask, True, False)
                
                Set shadowAndMask = Nothing
            End If
            
            Set currentLayer = Nothing
        Next i
        
    ' Masken-Typ 1 (Ohne Schatten, mit Grundplatte auf der Maske, da die Grundplatte größer ist als das Produkt bzw. seine Bemaßung)
    ' :::::::::::::::::::::::::
    Else
        
        ' Alle Grundplatten holen
        Dim groundPlatesCopiesOfLayers As New shapeRange
        For i = 1 To productDesignLayers.count
            Set currentLayer = productDesignLayers.getLayer(i)
            groundPlatesCopiesOfLayers.add Globals.copyPasteShape(currentLayer.getGroundPlate, True)
            Set currentLayer = Nothing
        Next i
        
        ' Grunplatten limitieren
        Set groundPlatesCopiesOfLayers = Globals.intersectShapeWithShapeRange(maskCopyForLimit, groundPlatesCopiesOfLayers, True, False)
        
        groundPlatesCopiesOfLayers.OrderFrontOf mask
        
        Set mask = Globals.combineShapeWithShapeRange(mask, groundPlatesCopiesOfLayers, True)
        
        'mask
    End If
    
    'Wird ab hier nicht mehr benötigt
    maskCopyForLimit.delete
    
    
    
    ' Ausschnittsform aller Layer erstellen (von den Hauptformen)
    ' (Verhindert Zuschnitts-Fehler, die passieren, wenn jeder Layer einzeln schneidet. Kam zuerst bei Funkklingeln vor.)
    Dim subtractShape As shape
    For i = 1 To productDesignLayers.count
        
        Dim layerSubtractShape As shape
        
        Set currentLayer = productDesignLayers.getLayer(i)
        
        If Not currentLayer.isLayerVariant Then
        
            If Not activeVariantGroupIndex = -1 And currentLayer Is focusedLayer Then
                Set layerSubtractShape = currentLayer.getMainShapesCombinedCopyForMask(activeVariantGroupIndex, activeVariantGroupChildIndex)
            Else
                Set layerSubtractShape = currentLayer.getMainShapesCombinedCopyForMask
            End If
            
            ' Wenn es das erste Shape ist, gibt es noch kein 2. zum verschmelzen
            If subtractShape Is Nothing Then
                Set subtractShape = layerSubtractShape
                
            Else ' Mit vorherigen verschmelzen
                Set subtractShape = Globals.combineShapes(subtractShape, layerSubtractShape, False)
'                Set subtractShape = subtractShape.Weld(layerSubtractShape)
            End If
            
            
            ' Klingeltaster nicht maskieren (Maske soll dort Platz freihalten, sodass diese sichtbar bleiben)
            ' =====================================================
            For g = 1 To currentLayer.getStaticVariantGroups.count
                Dim currentVariant As variante
                Set currentVariant = currentLayer.getStaticVariantGroups()(g).variants.item(1)
                
                If currentVariant.staticVariantGroupType = TasterStaticVariantGroupType Then
                    Dim tasterRoundShape As shape
                    Set tasterRoundShape = ActiveLayer.CreateEllipse2(currentVariant.shape.centerX, currentVariant.shape.centerY, currentVariant.shape.SizeWidth / 2)
                    tasterRoundShape.name = "ConfiHelper.createMainMask.tasterRoundShape"
                    
                    Set subtractShape = Globals.combineShapes(subtractShape, tasterRoundShape, False)
                    
                    If Globals.isShapeReferenceValid(tasterRoundShape) Then tasterRoundShape.delete
                    Set tasterRoundShape = Nothing
                    Exit For
                End If
                
                Set currentVariant = Nothing
            Next g
            ' =====================================================
            
        End If
        
'        If Not layerSubtractShape Is Nothing Then layerSubtractShape.delete
        Set layerSubtractShape = Nothing
        Set currentLayer = Nothing
    Next i
    
    subtractShape.name = "createMainMask.subtractShape"
    
    
    ' Ausschneiden
    Set mask = Globals.subtractShape(subtractShape, mask)
    
    subtractShape.delete
    
    
    ' Maske nach oben setzen
    mask.OrderFrontOf productDesignLayers.getLayer(1).layerShape.shapes.First
    
    
    For i = 1 To productDesignLayers.count
        ' Muss gemacht werden, da es vorkommen kann, dass wegen der nutzung von 'getDesignLayerShapeToCutMainMask' ,
        ' wo ja eine Kopie aller roten Formen gemacht wird, die ShapeRange:allRedOrPinkShapes vom Layer auf einmal keine Formen mehr enthällt ?!?
        productDesignLayers.getLayer(i).invalidateAllRedShapes
    Next i
    
    
    ' Auf ganze Zahl runden, damit es bei Amazon genau 400x400 ergibt.
    ' ACHTUNG: Kann zu einer Verzerrung führen, wenn durch eine Viewbox ein Produkt die Maske stark beschneidet (sie also nicht ganz bis zum Rand geht) und dann auf 400 gestreckt wird
    mask.SizeWidth = round(mask.SizeWidth, 0)
    mask.SizeHeight = round(mask.SizeHeight, 0)
    

    
    ' Variante auf Konfigröße zuschneiden
    If Not variante Is Nothing Then
        Dim variantShapesToCut As shapeRange
        Set variantShapesToCut = Globals.flattenShapeRange(variante.shape.shapes.All)
        
        variantShapesToCut.RemoveRange newCustomShapeTypeQuery(variantShapesToCut, RedOrPinkShape).search
        
        Globals.intersectShapeWithShapeRange confiBoundingBox, variantShapesToCut, , False
    End If
    
    ' Wenn es eine Variantenmaske ist, die Maske in die Variantengruppe packen
    If Not variante Is Nothing Then
        mask.OrderBackOf variante.shape.shapes.Last
    End If
    
    
    
    
    ' Maske auf Konfigröße zuschneiden
    Set mask = Globals.intersectShapes(confiBoundingBox, mask, , False)
    
    Set createMainMask = mask
    
End Function



' Erstellt eine Varianten-Maske. Dabei werden bspw. die Bohrlöcher von einer Bohrlöchervariante kopiert, weiß gefärbt und als Gruppe namens "VariantenMaske" in die Variantengruppe abgelegt
' Früher wurden Varianten mit einer eigenen Hauptmaske kombiniert, sodass man die Schrauben auf den Bohrlöchern sehen konnte.
' Das ist mit dieser Funktion anders. Bohrlöcher bspw. sind einfach nur weiß
Private Function createVariantMask(layer As ProductDesignLayer, variante As variante)

    Dim redOrPinkShapes As shapeRange
    Set redOrPinkShapes = newCustomShapeTypeQuery(variante.shape, RedOrPinkShape).search

    If redOrPinkShapes.count = 0 Then Exit Function

    Dim maskShapes As New shapeRange
    
    Dim i As Integer
    For i = 1 To redOrPinkShapes.count
        maskShapes.add Globals.copyPasteShape(redOrPinkShapes(i), True)
    Next i

    Dim mask As shape
    Set mask = Globals.groupShapes(maskShapes)

    mask.outline.SetNoOutline
    
    ' TODO nicht einfach weiß füllen, sonden Bildinformationen aus dem Konfi-Hintergrund nehmen
    mask.fill.ApplyUniformFill CreateColor("#FFFFFF")
    
    Dim shadowScale As Double
    Dim blurRadius As Double
    shadowScale = mask.SizeWidth / (confiWidth * 4)
    blurRadius = 200# * shadowScale
    
    Dim yOffset As Double
    yOffset = ActiveDocument.ToUnits(2#, cdrMillimeter) * -shadowScale
    
    Dim eff As effect
    Set eff = mask.CreateInnerShadow( _
        opacity:=50, _
        Feather:=blurRadius, _
        offsetX:=0, _
        offsetY:=yOffset, _
        color:=CreateRGBColor(0, 0, 0))

    Dim innerShadow As EffectInnerShadow
    Set innerShadow = eff.innerShadow
    
    
    Dim shadowOnly As shape: Set shadowOnly = eff.Separate.firstShape
    Dim group As New shapeRange
    group.add shadowOnly
    group.add mask
    Set mask = group.convertToBitmap(, , , , ActiveDocument.resolution)
    
    mask.name = "VariantenMaske"
    mask.OrderFrontOf redOrPinkShapes.firstShape
    
End Function





' Nutzt begrenzte (bounded=true) Uploadboxen, um sie durch alle darunterliegenden Formen und der (neu erstellten) Kopie von der Grundplatte (FotoMaske) zu schneiden
Private Function createPhotoMask(layer As ProductDesignLayer, Optional groundPlateVariantIndex As Integer = 1) As shape
    
    logger.logINFO "[ConfiHelper.createPhotoMask] Erstelle Fotomaske. Schneide Löcher für Uploadboxen bei P#" & layer.getPartIndex & ", L#" & layer.getLayerIndex & ", Grundplatten-Variante#" & groundPlateVariantIndex
    logger.addTab
    
    Dim uploadBoxes As shapeRange
    
    'Nur nach begrenzten Uploadboxen suchen (nicht rekursiv)
    Set uploadBoxes = Globals.findUploadBoxes(layer.layerShape, BoundedUploadBoxType)
    
    If Not doesLayerNeedsPhotoMaskWithUploadboxes(layer, uploadBoxes) Then
        GoTo ExitFunction
    End If
    
    
    If uploadBoxes.count > 0 Then
        
        logger.logFINE "Uploadboxen: " & uploadBoxes.count
        
        ' FotoMaske/Grundplattenkopie einmal für alle Uploadboxen erstellen
        Dim groundPlateCopy As shape
        Set groundPlateCopy = Globals.copyPasteShape(layer.getGroundPlate, True)
        
        
        groundPlateCopy.name = "FotoMaske"
        
        Dim i As Integer
        For i = 1 To uploadBoxes.count
            
            Dim currentUploadBox As shape
            Set currentUploadBox = uploadBoxes.item(i)
            
            
            logger.logFINE "currentUploadBox: '" & Globals.getShapeDisplayName(currentUploadBox) & "'"
            logger.logFINE "groundPlateCopy: '" & Globals.getShapeDisplayName(groundPlateCopy) & "'"
            
            Dim uploadBoxFotoCopy As shape
            Set uploadBoxFotoCopy = Globals.createUploadboxBoundingShape(currentUploadBox)
            uploadBoxFotoCopy.name = "uploadBoxFotoCopy"
            
            ' Uploadboxfoto-Kopie per Z-Index da hinsetzen, wo die eigentliche Uploadbox war, denn ...
            uploadBoxFotoCopy.OrderFrontOf currentUploadBox
            
            '... die eigentliche Uploadbox wandert hinter die Grundplattenkopie (So wie es dann im Fancy ist: Foto hinter Fotomaske) aus der alle Uploadboxen ausgeschnitten werden.
            currentUploadBox.OrderBackOf groundPlateCopy
            
            
            
            
            
            ' Der Index der "uploadBoxFotoCopy", aber einen weiter +1 weil mit dem Shape darunter angefangen wird zu schneiden
            Dim j As Integer
            j = Globals.getShapeIndexInParentGroup(uploadBoxFotoCopy) + 1
            
            While j <= layer.layerShape.shapes.count
                
                Dim currentShape As shape
                Set currentShape = layer.layerShape.shapes(j)
                
                logger.logFINE "j: " & j & ", currentShape: '" & Globals.getShapeDisplayName(currentShape) & "', isUploadBox('" & Globals.isUploadBox(currentShape) & "'), isTextShape('" & (currentShape.Type = cdrTextShape) & "')" & _
                    ", isGroundPlate('" & isGroundplate(currentShape) & "'), isRedOrPinkShape('" & Globals.isRedOrPinkShape(currentShape) & "'), isVisible('" & currentShape.visible & _
                    "'), isDesignVariant('" & Globals.isDesignElementVariantShapeType(currentShape) & "'), isQRCode('" & Globals.isQRCode(currentShape) & "')"
                
                ' QR-Codes werden übersprungen, da sie nicht zugeschnitten werden können (es sei den man konvertiert sie zu Kurven). Ansonsten kommen komische fehler
                ' Weiße Hinterlegungen werden übersprungen. Denn wenn eine Uploadbox mit einem wilden Zuschnit mit vielen Pfadpunkten hat und es davon noch eine weiße Hinterlegung gibt, dann ist es der selbe Pfad.
                ' Corel braucht dann seeeeehr lange um dann die Uploadbox durch die weiße Hinterlegung davon zu schneiden
                If Not Globals.isUploadBox(currentShape) And Not currentShape.Type = cdrTextShape And Not isGroundplate(currentShape) And Not Globals.isRedOrPinkShape(currentShape) _
                        And (currentShape.visible Or Globals.isDesignElementVariantShapeType(currentShape)) And Not Globals.isViewShape(currentShape) And Not Globals.isQRCode(currentShape) _
                        And Not Globals.isShapeRDGWhiteShape(currentShape) Then
                    
                    logger.logFINE "currentShape wird durchschnitten..."
                    
                    Dim currentShapeName As String
                    currentShapeName = currentShape.name
                    
                    'Vor dem Zuschneiden die Uploadbox vor die Form zum schneiden setzen. Ansonsten würde Corel die Form unter die Uploadbox setzen (Texte aber nicht, weil sie ignoriert werden > Chaos)
                    uploadBoxFotoCopy.OrderFrontOf currentShape
                    
                    Dim currentShapeIsPhotoMask As Boolean
                    currentShapeIsPhotoMask = Globals.isPhotoMask(currentShape)
                    
                    
                    
                    
                    ' Formen sammeln
                    ' ==============================
                    Dim currentShapes As shapeRange
                    Dim currentShapesCollected As Boolean
                    currentShapesCollected = False
                    If currentShape.Type = cdrGroupShape Then
                        If Not Globals.isGroupHavingToManyShapes(currentShape) Then
                        
                            Set currentShapes = Globals.flattenShapeRange(Globals.shapeToShapeRange(currentShape), , , False)
    
                            ' Texte ausschließen (Macht nur Sinn, wenn die aktuelle Form eine Gruppe ist)
                            ' ------------------------------------------------------
                            Dim textInCurrentShapes As shapeRange
                            Set textInCurrentShapes = newCustomShapeTypeQuery(currentShapes, TextAny).search
                            
                            If textInCurrentShapes.count > 0 Then
    '                            Set currentShapes = Globals.flattenShapeRange(currentShapes)
                                currentShapes.RemoveRange textInCurrentShapes
                            End If
                            Set textInCurrentShapes = Nothing
                            ' ------------------------------------------------------
                            
                            currentShapesCollected = True
                        End If
                    End If
                    If Not currentShapesCollected Then
                        Set currentShapes = Globals.shapeToShapeRange(currentShape)
                    End If
                    ' ==============================
                    
                    
                    
                    
                    logger.logFINE "currentShapes: '" & Globals.getShapeRangeDisplayNames(currentShapes) & "'"
                    
                    If currentShapes Is Nothing Then Err.Raise vbObjectError + 513, , "[ConfiHelper.createPhotoMask] 'currentShapes' ist Nothing"
                    If currentShapes.count = 0 Then Err.Raise vbObjectError + 513, , "[ConfiHelper.createPhotoMask] 'currentShapes' hat 0 Childs"
                    
                    
                    ' ZUSCHNITT
                    ' ==============================
                    Set currentShapes = Globals.subtractShapeWithShapeRange(uploadBoxFotoCopy, currentShapes, , , logger, True, False)
                    logger.logFINE "currentShapes nach dem Zuschnitt: '" & Globals.getShapeRangeDisplayNames(currentShapes) & "'"
                    ' ==============================
                    
                    
                    ' Fotomasken-Referenz neu setzen
                    ' ---------------------------
                    If Not currentShapes.count = 0 Then
                        ' Wenn das soeben zugeschnittene Shape die FotoMaske war, muss die Referenz neu gesetzt werden (es ist nach dem Schnitt ein neues Objekt).
                        ' Ansonsten würde Corel abstürzen, wenn das Objekt benutzt wird
                        If currentShapeIsPhotoMask Then
                            Set groundPlateCopy = currentShapes.firstShape
                            
                        End If
                    End If
                    ' ---------------------------
                    
                    
                    'Wenn die Form nicht zugeschnitten werden konnte, wurde sie gelöscht und soll hier übersprungen werden
                    If currentShapes.count = 0 Then
                        j = j - 1
                    End If
                    
                    
                    Set currentShapes = Nothing
                Else
                    logger.logFINE "currentShape wurde übersprungen!"
                End If
                
                Set currentShape = Nothing
                
                j = j + 1
            Wend
            
            logger.logFINE "Fertig mit dem Durchlaufen der Formen des Layers"
            
            uploadBoxFotoCopy.delete
            Set currentUploadBox = Nothing
            Set uploadBoxFotoCopy = Nothing
            
            logger.logFINE "Fertig mit der Uploadbox #" & i
        Next i
        
        ' Quick Fix:
        ' Es kann sein, dass Designvarianten durschnitten wurden
        layer.invalidateVariantType DesignElementVariantType
        
        ' Fotomaske erst am Ende hinzufügen, da sie noch den Aussschnitt bekommt
        layer.addPhotoMask groundPlateCopy, logger
        
        
         ' Wenn es nicht die erste Grundplatte ist
        If groundPlateVariantIndex > 1 Then
            
            logger.logFINE "groundplateVariantIndex > 1"
            
            ' Falls mehrere Grundplatten mit Uploadboxen zugeschnitten werden, würde die Uploadbox immer hinter der zuletzt erstellten FotoMaske liegen
            ' (Jede Grundplatte erzeugt auch eine FotoMaske wenn nötig)
            ' Dadurch währe beim FancyExport die Uploadbox (bzw. alle) immer hinter der Hauptgrundplatte (Problem). Denn nur diese kommt in die ZIP. Die anderen werden als Fancy-Variante exportiert
            ' Deshalb werden die Uploadboxen vor die Hauptgrundplatte gepackt. Dort würden sie auch liegen, wenn es nur eine Grundplatte gäbe
        
            Dim topGroundPlate As shape
            Set topGroundPlate = layer.getVariantsOfType(GroundplateVariantType).getVariant(1).shape
            
            Dim k As Integer
            For k = 1 To uploadBoxes.count
                uploadBoxes(k).OrderFrontOf topGroundPlate
            Next k
        End If
        
        logger.logFINE "Set createPhotoMask = groundPlateCopy"
        Set createPhotoMask = groundPlateCopy
        
    End If
    
ExitFunction:
    logger.logFINE "ENDE"
    logger.removeTab
End Function



Private Function getBackground(layers As ProductDesignLayerRange) As shape
    
    Dim i As Integer
    
    Dim foundBackgrounds As shapeRange
    For i = 1 To layers.count
        Set foundBackgrounds = layers.getLayer(i).newCustomShapeTypeQuery(ConfiBackgroundShapeType).search
        
        If foundBackgrounds.count > 0 Then
            Set getBackground = foundBackgrounds.firstShape
            Set getBackground = Globals.intersectShapes(confiBoundingBox, getBackground) ' TODO Achtung: Wenn der Hintergrund mehrfach angefordert wird, wird er auch mehrfach zugeschnitten (Rundungsfehler !??!)
            Exit Function
        End If
    Next i
    
    
    ' Falls kein vordefinierter Hintergrund gefunden wurde:
    Set getBackground = loadBackgroundAndSizeIt()
End Function


Private Function loadBackgroundAndSizeIt() As shape 'productDesignLayersAsView As collection,
    
    ' Wenn kein Hintergrund angegeben wurde, weiße Fläche erstellen
    If customBackgroundpath = "" Then
        Set loadBackgroundAndSizeIt = ActiveLayer.CreateRectangle2(0, 0, 100, 100)
        loadBackgroundAndSizeIt.outline.SetNoOutline
        
        Dim color As New color
        color.HexValue = "#FFFFFF"
        loadBackgroundAndSizeIt.fill.ApplyUniformFill color
    Else
        Set loadBackgroundAndSizeIt = Globals.loadImage(customBackgroundpath)
    End If
    
    sizeAndPositionShapeToFullConfiSize loadBackgroundAndSizeIt, False, False
End Function




' Throws Exception
Private Function sizeAndPositionShapeToFullConfiSize( _
    shape As shape, _
    Optional usePaddedOrNormalConfiSize As Boolean = False, _
    Optional fitOrFillScaling As Boolean = False _
)

    ' usePaddedOrNormalConfiSize:
    ' True  = Konfigröße mit Padding verwenden
    ' False = normale volle Konfigröße verwenden
    '
    ' fitOrFillScaling:
    ' True  = Fit / Einpassen: Shape bleibt vollständig sichtbar
    ' False = Fill / Ausfüllen: Zielbereich wird vollständig gefüllt
    
    Dim box As shape
    If usePaddedOrNormalConfiSize Then
        Set box = confiPaddingBox
    Else
        Set box = confiBoundingBox
    End If
    
    Dim targetWidth As Double
    targetWidth = box.SizeWidth
    Dim targetHeight As Double
    targetHeight = box.SizeHeight
    
    Dim targetAspectRatio As Double
    targetAspectRatio = targetWidth / targetHeight
    
    Dim shapeAspectRatio As Double
    shapeAspectRatio = shape.SizeWidth / shape.SizeHeight
    
    If fitOrFillScaling Then
        ' Fit / Einpassen
        ' Shape bleibt vollständig sichtbar.
        If shapeAspectRatio > targetAspectRatio Then
            shape.SizeWidth = targetWidth
            shape.SizeHeight = shape.SizeWidth / shapeAspectRatio
        Else
            shape.SizeHeight = targetHeight
            shape.SizeWidth = shape.SizeHeight * shapeAspectRatio
        End If
    Else
        ' Fill / Ausfüllen
        ' Zielbereich wird vollständig gefüllt.
        ' Shape kann über den Zielbereich hinausragen.
        If shapeAspectRatio > targetAspectRatio Then
            shape.SizeHeight = targetHeight
            shape.SizeWidth = shape.SizeHeight * shapeAspectRatio
        Else
            shape.SizeWidth = targetWidth
            shape.SizeHeight = shape.SizeWidth / shapeAspectRatio
        End If
    End If

    shape.centerX = box.centerX
    shape.centerY = box.centerY

End Function


Private Function mixBackgroundWithGroundPlate(layer As ProductDesignLayer, view As ConfiView) ' productDesignLayersAsView As collection, shapeRangeForViewFitting As shapeRange)
    
    If Globals.isGroundPlateTransparent(layer.getGroundPlate) Then
        Dim background As shape
        Set background = getBackground(view.layersFlattened)
        background.OrderBackOf layer.getGroundPlate
        
        ' Eine vordefinierte Maske deaktiviert das platzieren eines Looks. Die Grundplatte ist quasi auch Teil des Looks. Also auch deaktivieren (unsichtbar machen)
        If view.hasPredefinedMask Then
            layer.getGroundPlate.transparency.ApplyUniformTransparency 100 ' Unsichtbar machen
        Else
            If Globals.isGroundPlateSatin(layer.getGroundPlate) Then
                ' Wenn der Hintergrund weiß ist, dann ist es keine geladene Bitmap sondern eine weiße Fläche/Form
                If Not background.Type = cdrBitmapShape Then
                    Set background = background.convertToBitmap(, , , , 300)
                End If
                background.bitmap.ApplyBitmapEffect "Gaussian Blur", "GaussianBlurEffect GaussianBlurRadius=2 , GaussianBlurResampled=0"
            End If
        End If
        
        background.OrderBackOf layer.getGroundPlate
        Set background = Globals.intersectShapes(layer.getGroundPlate, background, True, False)
        
        
        ' Zusammen rastern
        Dim selection As New shapeRange
        selection.add layer.getGroundPlate
        selection.add background
        selection.ConvertToBitmapEx , , True, 300
        
        ' Bisherige Grundplatte wurde verändert und ist deshalb nicht mehr vorhanden. Wenn sie nochmal gebraucht wird, muss sie neu gesucht werden
        layer.invalidateGroundPlate logger
    End If
    
End Function



Private Function doesLayerNeedsPhotoMask(layer As ProductDesignLayer)
    doesLayerNeedsPhotoMask = doesLayerNeedsPhotoMaskWithUploadboxes(layer, Globals.findUploadBoxes(layer.layerShape, BoundedUploadBoxType))
End Function


Private Function doesLayerNeedsPhotoMaskWithUploadboxes(layer As ProductDesignLayer, uploadBoxes As shapeRange)
    logger.logINFO "[ConfiHelper.doesLayerNeedsPhotoMaskWithUploadboxes]"
    logger.addTab
    
    ' Wenn Uploadboxen vorkommen, die zwar als bounded/begrenz gesetzt sind, aber über das gesamte Design gehen (größer oder gleich der Hauptform) ,
    ' dann macht eine Maske keinen Sinn, weil sie dann
    Dim i As Integer
    For i = uploadBoxes.count To 1 Step -1
        If Globals.areRectanglesInside(layer.getMainShape.boundingBox, uploadBoxes.item(i).boundingBox) Or Globals.areRectanglesEqual(layer.getMainShape.boundingBox, uploadBoxes.item(i).boundingBox, False) Then
            logger.logINFO "False"
            GoTo ExitFunction
        End If
    Next i
    
    logger.logINFO "True"
    doesLayerNeedsPhotoMaskWithUploadboxes = True
ExitFunction:
    logger.removeTab
End Function








' Konvertiert Shapes vom Typen 'custom' wie z.B: QR-Codes.
' CustomShapes sind nämlich nicht mit anderen Formen subtrahierbar usw.
' Deshalb müssen diese konvertiert werden
' ACHTUNG: Ist rekursiv
Private Function convertCustomShapesToCurves(shape As shape)
    
    Dim i As Integer
    
    If shape.Type = cdrGroupShape Then

        For i = 1 To shape.shapes.count
            ' Rekursiv
            convertCustomShapesToCurves shape.shapes(i)
        Next i
    ElseIf shape.Type = cdrCustomShape Then
        
        Dim range As New shapeRange
        range.add shape
        
        Globals.groupShapes range
        
        Dim converted As shape
        shape.ConvertToCurves
    End If
    
    
End Function


' Da der Fancy keine Verläufe darstellen kann (SVG eig. schnon),
' werden diese vorher zu Bitmaps umgewandelt. Dadurch werden sie beim Export auch für den Fancy als Bitmap exportiert.
' Somit kann der Fancy die Verläufe dann darstellen. Nur halt als Bitmap
' ACHTUNG: Ist rekursiv
Private Function convertGradiendShapesToBitmap(shape As shape)
    
    Dim i As Integer
    
     If shape.Type = cdrGroupShape Then

        For i = 1 To shape.shapes.count
            ' Rekursiv
            convertGradiendShapesToBitmap shape.shapes(i)
        Next i
    ElseIf shape.CanHaveFill Then
        
        If shape.fill.Type = cdrFountainFill Then
            shape.convertToBitmap , , , , 300
        End If
        
    End If
    
End Function




Public Function setConfiguratorSizeWithUniformPadding(width As Double, height As Double, padding As Double, _
    Optional setMaxSize As Boolean, Optional setConfiBoundingBox As Boolean, Optional setConfiPaddingBox As Boolean = True)
    setConfiguratorSize width, height, padding, padding, padding, padding, setMaxSize, setConfiBoundingBox, setConfiPaddingBox
End Function




' Setzt die Konfigurator-Größe und das Padding.
' Das Padding kann entweder einheitlich über 'confiPadding_' gesetzt werden,
' oder individuell pro Seite über die optionalen Parameter paddingLeft/Top/Right/Bottom.
' Ein individueller Wert von -1 (Standard) bedeutet: den einheitlichen Wert 'confiPadding_' verwenden.
Public Function setConfiguratorSize(width As Double, height As Double, paddingLeft As Double, paddingTop As Double, paddingRight As Double, paddingBottom As Double, _
    Optional setMaxSize As Boolean, Optional setConfiBoundingBox As Boolean, Optional setConfiPaddingBox As Boolean = True)


    confiWidth = width
    confiHeight = height

    ' Individuelles Padding pro Seite
    confiPaddingLeft = paddingLeft
    confiPaddingTop = paddingTop
    confiPaddingRight = paddingRight
    confiPaddingBottom = paddingBottom

    confiWidthMinusPadding = width - confiPaddingLeft - confiPaddingRight
    confiHeightMinusPadding = height - confiPaddingTop - confiPaddingBottom

    If setMaxSize Then
        confiMaxWidth = width
        confiMaxHeight = height
    End If

    If setConfiBoundingBox Then
        If confiExportType = fancy Then
            confiBoundingBox.SetBoundingBox 0, -height, width, height
        Else
            confiBoundingBox.SetBoundingBox 0, 0, width, height
        End If
    End If

    If setConfiPaddingBox Then
        If confiExportType = fancy Then
            confiPaddingBox.SetBoundingBox confiPaddingLeft, confiPaddingBottom - confiHeight, confiWidthMinusPadding, confiHeightMinusPadding
        Else
            confiPaddingBox.SetBoundingBox confiPaddingLeft, confiPaddingBottom, confiWidthMinusPadding, confiHeightMinusPadding
        End If
    End If

End Function





Private Function fitViewToKonfiSize(view As ConfiView, Optional trimWhiteSpace As Boolean = False)
    ' productDesignLayers As collection, shapeRangeForViewFitting As shapeRange
    
    logger.addTab , "[ConfiHelper.fitViewToKonfiSize]"
    
    
    ' Skalieren
    ' ---------------------------------
    Dim scaleFactor As Double
    
    Dim rangeForViewFittingAspectRation As Double
    rangeForViewFittingAspectRation = view.shapeRangeForViewFitting.SizeWidth / view.shapeRangeForViewFitting.SizeHeight
    
    Dim confiPaddingBoxAspectRatio As Double
    confiPaddingBoxAspectRatio = confiPaddingBox.SizeWidth / confiPaddingBox.SizeHeight
    
    If rangeForViewFittingAspectRation > confiPaddingBoxAspectRatio Then
        scaleFactor = CDbl(confiPaddingBox.SizeWidth) / CDbl(view.shapeRangeForViewFitting.SizeWidth)
    Else
        scaleFactor = CDbl(confiPaddingBox.SizeHeight) / CDbl(view.shapeRangeForViewFitting.SizeHeight)
    End If
    
    Dim center As New Vector
    center.x = view.getLayersShapes.centerX
    center.y = view.getLayersShapes.centerY
    
    Dim p As Integer
    For p = 1 To view.parts.count
        Dim currPart As ProductDesignPart
        Set currPart = view.parts.getPart(p)
        
        currPart.scalePartWithScale scaleFactor, scaleFactor, False, center, logger
        
        view.shapesScale = scaleFactor
        Set currPart = Nothing
    Next p
    ' ---------------------------------
    
    
    ' Weiße Ränder abschneiden (optional)
    ' ---------------------------------
    If trimWhiteSpace Then
        trimKonfiSizeToView view
    End If
    ' ---------------------------------
    
    
    ' Zentrieren
    ' ---------------------------------
    view.getLayersShapes.Move -view.shapeRangeForViewFitting.centerX + confiPaddingBox.centerX, -view.shapeRangeForViewFitting.centerY + confiPaddingBox.centerY
    ' ---------------------------------
    
    
    logger.removeTab
End Function



Private Function trimKonfiSizeToView(view As ConfiView)
    Dim trimmedWidth As Double
    trimmedWidth = view.shapeRangeForViewFitting.SizeWidth + confiPaddingLeft + confiPaddingRight

    If trimmedWidth < confiWidth Then
        confiWidth = trimmedWidth
    End If

    Dim trimmedHeight As Double
    trimmedHeight = view.shapeRangeForViewFitting.SizeHeight + confiPaddingTop + confiPaddingBottom
    
    ' Mindesthöhe anwenden
    If trimmedHeight < confiMinHeight Then trimmedHeight = confiMinHeight

    If trimmedHeight < confiHeight Then
        confiHeight = trimmedHeight
    End If
    
    setConfiguratorSize confiWidth, confiHeight, confiPaddingLeft, confiPaddingTop, confiPaddingRight, confiPaddingBottom, False, True, True
End Function




Public Function findFocusedLayer(layers As ProductDesignLayerRange) As ProductDesignLayer
    If layers.count < 2 Then
        Set findFocusedLayer = layers.getLayer(1)
        Exit Function
    End If
    
    Dim bestLayer As ProductDesignLayer
    Dim bestLayerScore As Integer
    Set bestLayer = layers.getLayer(1)
    bestLayerScore = bestLayer.getLayerFocusedChance
    
    Dim i As Integer
    For i = 2 To layers.count
        Dim currScore As Integer: currScore = layers.getLayer(i).getLayerFocusedChance
        If currScore > bestLayerScore Then
            Set bestLayer = layers.getLayer(i)
            bestLayerScore = currScore
        End If
    Next i
    
    Set findFocusedLayer = bestLayer
End Function


Private Function getFocusedLayer(layers As ProductDesignLayerRange) As ProductDesignLayer
    
    ' Automatisch erkennen
    If focusedLayerIndex = -1 Then
        Set getFocusedLayer = findFocusedLayer(layers)
    Else
        If focusedLayerIndex > layers.count Then
            MsgBox "Die Designschicht konnte nicht gefunden werden, da nicht genügend Schichten vorhanden sind!", vbCritical
            Globals.endMacro
        End If
        
        Set getFocusedLayer = layers.getLayer(focusedLayerIndex)
    End If
End Function






' Looks mit dazugehöriger Grundplatte zusammenfügen, wenn wegen Grundplattenvarianten
' Look & Grundplatte zusammen getauscht werden müssen im Konfi
Private Function reduceLookIfNeeded(parts As ProductDesignPartRange)
    
    logger.logINFO "reduceLookIfNeeded"
    
    Dim currentLayer As ProductDesignLayer
    
    Dim i As Integer
    For i = 1 To parts.count
        Dim currentPart As ProductDesignPart
        Set currentPart = parts.getPart(i)

        Dim j As Integer
        For j = 1 To currentPart.layers.count
            Set currentLayer = currentPart.getLayer(j)

            Dim lookShapes As collection
            Set lookShapes = currentLayer.getLookShapes

            ' Es gibt mehr als 1 Look. Das bedeutet, dass es mehrere Grundplattenvarianten die verschiedene Looks haben.
            ' Da im Fancy oder Amazon-Konfi nur eine Ebene getauscht werden kann, wenn der Kunde eine andere Grundplatte auswählt,
            ' müssen Look und GRundplatte zusammengefügt werden
            If lookShapes.count > 1 Then
            
                logger.logINFO "    Der aktuelle Produkt-Layer (P#" & currentLayer.getPartIndex & ", L#" & currentLayer.getLayerIndex & ") hat mehr als nur 1 Look. Deshalb werden Looks & Grundplatten zusammengefügt"
                
                Dim g As Integer
                g = 1
                While g <= lookShapes.count
                    
                    Dim currentLookSubJob As PlaceFileSubJob
                    Set currentLookSubJob = PlaceFile.findSubJob(lookShapes(g), currentLayer)
                    
                    
                    Dim f As Integer
                    For f = 1 To currentLayer.getVariantsOfType(GroundplateVariantType).allVariants.count
                        
                        Dim currentGroundPlateVariant As variante
                        Set currentGroundPlateVariant = currentLayer.getVariantsOfType(GroundplateVariantType).getVariant(f)
                        
                        Dim currentGroundPlateSubJob As PlaceFileSubJob
                        Set currentGroundPlateSubJob = PlaceFile.findSubJob(currentGroundPlateVariant.shape, currentLayer)
                        
                        
                        If Not currentGroundPlateSubJob Is Nothing Then
                        
                            If Not currentGroundPlateSubJob.parentJob.getLookJob Is Nothing Then
                                
                                Dim d As Integer
                                For d = 1 To currentGroundPlateSubJob.parentJob.getLookJob.subJobs.count
                                    If currentGroundPlateSubJob.parentJob.getLookJob.subJobs(d) Is currentLookSubJob Then
                                        currentGroundPlateVariant.shape.visible = True
        
                                        Dim mergeShapes As New shapeRange
                                        mergeShapes.add currentGroundPlateVariant.shape
                                        mergeShapes.add lookShapes(g)
        
                                        mergeShapes.ConvertToBitmapEx , , True, 300
        
                                        currentLayer.invalidateGroundPlate
                                        currentLayer.invalidateVariantType GroundplateVariantType
        
                                        lookShapes.Remove g
                                        g = g - 1
                                        GoTo NextG
                                    End If
                                Next d
                            End If
                            
                        End If
                        
                        Set currentGroundPlateVariant = Nothing
                    Next f

NextG:
                    
                    g = g + 1
                Wend

            Else
                logger.logINFO "    Der aktuelle Produkt-Layer (P#" & currentLayer.getPartIndex & ", L#" & currentLayer.getLayerIndex & ") hat weniger als 1 Look. Deshalb werden Looks & Grundplatten NICHT zusammengefügt"
            End If


            Set currentLayer = Nothing
        Next j
    Next
    
    
    logger.logINFO ""
    
End Function




Public Function TestCreateDesignSnapshot()
    
    ' Standarteinstellung, die nicht getriggert wird ohne die Start Sub
    ' Deshalb hier. Sonst hat 'focusedLayerIndex' den Wert 0
    focusedLayerIndex = -1
    
    Set sizeFolder = New FSSizeFolder
    sizeFolder.init , , ActiveDocument
    
    Dim selectedDesigns As collection
    Set selectedDesigns = Globals.getSelectedDesignsOrAll(True, , True)
    
    createDesignsSnapshots selectedDesigns
    
End Function



Public Function createDesignsSnapshots(designs As ProductDesignRange)
    Dim i As Integer
    For i = 1 To designs.count
        setDesignFilesForDesign designs.getDesign(i) ' createDesignSnapshot benötigt DesignFiles
        createDesignSnapshot designs.getDesign(i)
    Next i
End Function





' Erstellt ein Vorschaubild (Schnappschuss) vom Design, welches dann als "folder.jpg" also als Ordnervorschaubild abgespeichert wird
Private Function createDesignSnapshot(design As productDesign, Optional logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[ConfiHelper.createDesignSnapshot]"
    
    Dim isGraving As Boolean
    isGraving = getFocusedLayer(design.getLayers).isGraving
    
    Dim selection As New shapeRange
    ' vv Blödsinn. Corel exportiert Fromen immer nach dem Stack im ObjekteManager
    ' Rückwärts laufen, damit die vorderste Schicht zuletzt hinzugefügt wird und damit oben ist
    Dim i As Integer
    For i = design.getLayers.count To 1 Step -1
        selection.AddRange design.getLayers.getLayer(i).layerShape.shapes.All
    Next i
     
    selection.RemoveRange design.newCustomShapeTypeQuery(Globals.customShapeType.GuideElementShapeType).search
    
    If isGraving Then
        If exportSimpleFolderIconWhenGraving Then
            selection.RemoveRange design.newCustomShapeTypeQuery(Globals.customShapeType.groundPlate).search
            selection.RemoveRange design.newCustomShapeTypeQuery(Globals.customShapeType.ExportableShape).search
            selection.RemoveRange design.newCustomShapeTypeQuery(Globals.customShapeType.StaticVariant).search
        End If
    End If
    
    ' Notlösung
    If selection.count = 0 Then
        selection.AddRange design.newCustomShapeTypeQuery(Globals.customShapeType.groundPlate).search
    End If
    

    Dim whiteBG As shape
    
    Dim previewDoc As document
    Dim selectionCopy As shapeRange
    
    Dim exportRange As shapeRange
    
    If isGraving Then
    
        Set selectionCopy = Globals.copyPasteShapeRange(selection)
        
        
        ' Formen wie z.B: Texte schwarz färben
        ' ----------------------------------------
        If exportSimpleFolderIconWhenGraving Then
            
            Dim shapesToMakeBlack As shapeRange
            Set shapesToMakeBlack = selectionCopy.shapes.All
            shapesToMakeBlack.RemoveRange newCustomShapeTypeQuery(shapesToMakeBlack, Globals.customShapeType.groundPlate).search
            shapesToMakeBlack.RemoveRange newCustomShapeTypeQuery(shapesToMakeBlack, Globals.customShapeType.ExportableShape).search
            
            Globals.setShapeRangeColor shapesToMakeBlack, CreateRGBColor(0, 0, 0), CreateRGBColor(0, 0, 0), True, True, True, True, True
            '        Debug.Print "shapesToMakeBlack: " & vbNewLine & Globals.getShapeRangeDisplayNames(shapesToMakeBlack) & vbNewLine
        End If
        ' ----------------------------------------
        
        Set exportRange = selectionCopy.shapes.All ' Neue ShapeRange wird durch .all erstellt, damit selectionCopy unabhängig bleibt (Sorgte sonst für Probleme unten wegen 'selectionCopy.delete' bei 'whiteBG.delete')
        
        Set whiteBG = createWhiteBackgroundForShapeRange(selectionCopy)
        exportRange.add whiteBG
    Else
        Set exportRange = selection.shapes.All
        
        Set whiteBG = createWhiteBackgroundForShapeRange(selection)
        exportRange.add whiteBG
    End If

    
    newShapeExport(exportRange, designFiles.getFolderThumbnailPath(False), cdrJPEG).setWidth(512).setHeight(512).export
    
    If isGraving Then
        If Not selectionCopy Is Nothing Then
            selectionCopy.delete
            Set selectionCopy = Nothing
        End If
    End If
    
    whiteBG.delete
    
    If Not logger Is Nothing Then
        logger.logFINE "- Fertig"
        logger.removeTab
    End If
End Function



Private Function createWhiteBackgroundForShapeRange(shapes As shapeRange) As shape
    
    Dim size As Double
    
    ' Größe für den Hintergrund ermitteln
    If shapes.SizeWidth > shapes.SizeHeight Then
        size = shapes.SizeWidth
    Else
        size = shapes.SizeHeight
    End If
    
    size = size * 1.1 ' Padding
    
    Dim whiteBG As shape
    Set whiteBG = ActiveLayer.CreateRectangle2(shapes.centerX - size / 2, shapes.centerY - size / 2, size, size)
    whiteBG.name = "ConfiHelper.createWhiteBackgroundForShapeRange.whiteBG"
    whiteBG.outline.SetNoOutline
    whiteBG.fill.ApplyUniformFill CreateRGBColor(255, 255, 255)
    whiteBG.OrderBackOf ActiveLayer.shapes.Last
    
    Set createWhiteBackgroundForShapeRange = whiteBG
End Function



Private Function getLayersNames(layers As collection) As collection
    Dim names As New collection
    
    Dim i As Integer
    For i = 1 To layers.count
        names.add getLayerName(layers(i))
    Next i

    Set getLayersNames = names
End Function


Private Function getLayerName(layer As ProductDesignLayer) As String
    
    ' Für Amazon unwichtig
    If confiExportType = confiType.amazon Then
        getLayerName = ""
        Exit Function
    End If
    
    Dim groundPlateVariants As collection
    Set groundPlateVariants = layer.getGroundPlateVariantsFromPlaceFile
    
    ' Prüfen, ob Varianten vorhanden sind und ein Name überhaupt benötigt wird
    If groundPlateVariants.count > 1 Then
'        ActiveDocument.unit = cdrMillimeter
        getLayerName = ProductRecognizer.recognizeProductLayerName(layer)
'        ActiveDocument.unit = cdrPixel
        
'        Debug.Print getLayerName
        
        If getLayerName = "" Then
            Err.Raise vbObjectError + 513, , "[ConfiHelper.getLayerName] Der Formname der Designschicht wurde nicht erkannt. Das ist aber nötig, da das Design Varianten hat."
        End If
    End If
    
End Function



Private Function findProblems(design As productDesign)
    ' Fehler Check
    If Not logger Is Nothing Then logger.logINFO "Suche nach Probleme (Unproportionaler Text): "
    findShapeProblems design.getDesignShape
    If Not logger Is Nothing Then logger.logINFO "- Fertig"
    
    
    ' Grundplattencheck
    ' --------------------------------------
    If Not logger Is Nothing Then logger.logINFO "Grundplattencheck: "
    Dim p As Integer
    For p = 1 To design.getPartsCount
        Dim l As Integer
        For l = 1 To design.getPart(p).count
            If design.getLayer(p, l).getGroundPlate(logger) Is Nothing And Not design.getLayer(p, l).isEmptyVariant Then
'                MsgBox "Die Schicht " & designLayers(i).layerShape.name & " ist eine leere Variante?=" & designLayers(i).isEmptyVariant
                design.getLayer(p, l).layerShape.CreateSelection
                cleanUp
                
                MsgBox "Keine Grundplatte im Layer " & design.getLayer(p, l).getLayerIndex & " Teil " & design.getLayer(p, l).getPartIndex & " vorhanden!", vbCritical
                Globals.endMacro
            End If
        Next l
    Next p

    design.setTransparencyOfTransparentGroundplates
    If Not logger Is Nothing Then logger.logINFO "- Fertig"
    ' --------------------------------------
    
    
    ' Artikelnummer
    ' -------------------------
    If Not logger Is Nothing Then logger.logINFO "Prüfe Artikelnummer und lösche alle MetaInfos"
    If design.getProductID = vbNullString Then
        design.getDesignShape.CreateSelection
        Globals.setViewAreaToShape design.getDesignShape
        cleanUp
        MsgBox "Keine Artikelnummer vorhanden!", vbCritical
        Globals.endMacro
    End If
    design.deleteMetaInfoShapes
    If Not logger Is Nothing Then logger.logINFO "- Fertig"
    ' -------------------------
    isDesignMainProduct = Globals.isProductIDMainDesign(design.getProductID)
    
    
    
    
    ' Texte auf Kurven löschen, da diese in keinem Konfi unterstützt werden
    ' ---------------------------------------
    If Not logger Is Nothing Then logger.logINFO "Texte auf Kurven löschen: "
    Dim curvesWithText As shapeRange
    Set curvesWithText = design.newCustomShapeTypeQuery(CurveWithText).search
    While curvesWithText.count > 0
        Globals.deleteCurveWithText curvesWithText.firstShape, Not Globals.isRedOrPinkShape(curvesWithText.firstShape)
        curvesWithText.Remove (1)
    Wend
    If Not logger Is Nothing Then logger.logINFO "- Fertig"
    ' ---------------------------------------
    
    
    
    ' Bei Formen die einen Schatten zugewiesen haben, den Schatten von der Form lösen.
    ' -------------------------------------------
    If Not logger Is Nothing Then logger.logINFO "Schatten trennen: "
     Globals.seperateShadows design.getDesignShape
    If Not logger Is Nothing Then logger.logINFO "- Fertig"
    ' -------------------------------------------
    
    
   
    
    ' Damit Outlines sich mitskalieren, wenn das Design/seine Schichten auf Konfigröße skaliert werden
    If Not logger Is Nothing Then logger.logINFO "Outlines skalierbar machen: "
    Globals.setShapeOutlinesScaleWithShape design.getDesignShape
    If Not logger Is Nothing Then logger.logINFO "- Fertig"
    
    ' TODO QR-Codes ???
'    If forAmazon Then
'        convertCustomShapesToCurves design.getDesignShape
'    End If
    
    convertGradiendShapesToBitmap design.getDesignShape
End Function


Private Function findShapeProblems(shape As shape)
    If shape.Type = cdrGroupShape Then
        Dim i As Integer
        For i = 1 To shape.shapes.count
            ' Rekursiv
            findShapeProblems shape.shapes(i)
        Next i
    Else
        
        If confiExportType = fancy Then
            If shape.Type = cdrTextShape Then
            
                ' TODO RELEASE AUS !!!!=!=!?!??!??!??!?!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            
'                If Globals.isShapeUnproportionalScaled(shape, True) Then
'                    cleanUp
'
'                    shape.CreateSelection
'                    Globals.setViewAreaToShape shape
'
'                    MsgBox "Der Text wurde unproportional transformiert. Im Fancy würde so ein Text anders dargestellt werden. Führe deshalb das ""Fehler-Fixer"" Script aus. Passe den korrigierten Text danach gegebenenfalls an.", vbCritical
'
'                    If Not logger Is Nothing Then logger.logFATAL "Unproportionaler Text gefunden. Beenden!"
'                    Globals.endMacro
'                End If
            End If
        End If
        
    End If
End Function




Public Function getFancyBackgroundsFolder() As String
    getFancyBackgroundsFolder = "Fancyexport\Hintergründe\"
End Function


Public Sub MarkShapeAsConfiBackground()
    Globals.markSelectedShapes Globals.getConfiBackgroundKeyWord
End Sub


Public Sub MarkShapeAsConfiMask()
    Globals.markSelectedShapes Globals.getConfiMaskKeyWord
End Sub


'Sub Macro1()
'    ' Recorded 02.02.2024
'    Dim OrigSelection As shapeRange
'    Set OrigSelection = ActiveSelectionRange
'    Dim eff1 As effect
'
'    Set eff1 = OrigSelection(1).createDropShadow(cdrDropShadowBottom, 100, cdrFeatherOutside, 0, 0, CreateCMYKColor(0, 0, 0, 100), cdrFeatherOutside, cdrEdgeFlat, MergeMode:=cdrMergeAdd)
'    'eff1.DropShadow.FeatherType = cdrFeatherOutside
'    eff1.dropShadow.Feather = cdrFeatherInside
'    eff1.dropShadow.Feather = cdrFeatherOutside
'End Sub
'
'
Sub Macro2()
    ' Recorded 02.02.2024
    Dim OrigSelection As shapeRange
    Set OrigSelection = ActiveSelectionRange
    Dim eff1 As effect
'    Set eff1 = OrigSelection(1).CreateDropShadow(0, 50, 15, 32.8063, -36.796064, CreateCMYKColor(0, 0, 0, 100), 4, 0, MergeMode:=9)
'    Set eff1 = OrigSelection(1).CreateDropShadow(0, 50, 15, -0.816142, -16.27441, CreateCMYKColor(0, 0, 0, 100), 4, 0, MergeMode:=9)
    Set eff1 = OrigSelection(1).createDropShadow(0, 50, 15, 206.764967, -124.137406, CreateCMYKColor(0, 0, 0, 100), 4, 0, MergeMode:=9)
End Sub
'Sub Macro3()
'    ' Recorded 02.02.2024
'    Dim eff1 As effect
'    Set eff1 = ActiveLayer.shapes(1).createDropShadow(0, 22, 2, 221.003157, -201.814967, CreateCMYKColor(0, 0, 0, 100), 3, 0, MergeMode:=9)
'End Sub

