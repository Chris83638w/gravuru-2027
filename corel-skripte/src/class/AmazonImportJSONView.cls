Attribute VB_Name = "AmazonImportJSONView"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
' Diese Klasse stellt alle relevanten Infos einer View dar, die aus einer Amazon-Bestell-JSON geparsed werden.

Public viewManager As AmazonImportViewManager

Public designName As String
Public sizeSelection As String
Dim sizeSelectionWidth As Double
Dim sizeSelectionHeight As Double
Public textContainers As New collection
Public imageContainers As New collection
Public customerNote As String
Public imageCutoutNeedsEditing As Boolean ' Die 'Bildauschnitt'-Auswahl erfordert eine Nachbearbeitung
Public imageCutoutTypeName As String ' Die Art wie das Bild zugeschnitten werden soll

Public material As MaterialType

' Arrays dürfen leider nicht public sein >:(
Dim designVariantSelection(10) As Integer ' Die Auswahl aller Designvarianten-Gruppen. Eine Gruppe kann z.B: alle Motive links unten sein. Die nächste Gruppe alle Motive in der Mitte
Public staticVariants As New collection ' Ist verbunden mit PlaceFileJob.staticVariantNameAliasseForAmazonImport
Public qrCodeLink As String
Public quantity As Integer ' Sparset. Wieviele Exemplare hat der Kunde bestellt (Nicht zu verwechseln mit der Auswahl der Anzahl außerhalb vom Konfi)

Public excelDesignInfo As AmazonExcelDesignInfo
Dim designParts As New collection ' Parts dieser View
Dim designPartsAsShapeRange As shapeRange

' Alle Optionen die in dem Konfigurator für den Kunden zur verfügung standen. Z.B: Acrylfarbe - Anthrazit / Schwarz
Public optionGroups As New collection

Private viewIndex As Integer

Public objectID As Integer ' Nur für Debugging Zwecke

Dim amazonJson As AmazonImportJSON

Private jsonViewDict As Dictionary
    Private p_viewName As String
    Private p_flatContainerCustomization As Dictionary
        Private p_flatContainerCustomizationChildrenItems() As Variant
    
    Private p_snapShot As Dictionary
        Private p_snapShotImageName As String


Public Function newAmazonImportJSONView(amazonJSON_ As AmazonImportJSON, ByVal viewIndex_ As Integer, viewManager_ As AmazonImportViewManager, Optional logger As logger)
    
    objectID = Globals.getNextObjectID
    
    Set amazonJson = amazonJSON_
    viewIndex = viewIndex_
    Set viewManager = viewManager_
    Set jsonViewDict = amazonJson.getViewJsonDict(viewIndex)
    quantity = 1 ' Standartwert
    designNumber = -1 ' Als nicht initialisiert markieren
    
    If Not logger Is Nothing Then logger.addTab , "[AmazonImportJSONView.newAmazonImportJSONView] #" & objectID & ", viewIndex: " & viewIndex & ", viewName: '" & viewName & "'"
    
    

    Dim designChoiceContainers As New collection
    
    Dim imageCutoutTypeExists As Boolean ' Die Auswahl: "Bildauschnitt" ist vorhanden
    
    
    For i = 0 To UBound(flatContainerCustomizationChildrenItems)
        Dim currentChild As Dictionary
        Set currentChild = flatContainerCustomizationChildrenItems()(i)
        
        Dim containerType As String
        containerType = currentChild.item("type")
        Dim containerName As String
        containerName = currentChild.item("name")
        Dim containerLabel As String
        containerLabel = currentChild.item("label")
        
        logger.logFINER "currentChild: type: '" & containerType & "', name: '" & containerName & "', label: '" & containerLabel & "'"
        
        
        ' Alle Optionsgruppen seperat in die 'AmazonImportJSONView' schreiben
        ' ------------------------------------
        If StrComp(containerType, "OptionCustomization") = 0 Then
            If currentChild.Exists("optionSelection") Then
            
                Dim optionGroupName As String
                optionGroupName = currentChild.item("name")
                
                Dim optionGroup As New AmazonImportJSONOptionGroup
                optionGroup.groupName = optionGroupName
            
                ' Wenn die "optionSelection" ein leerer String ist "", wurde nichts ausgewählt
                ' Wenn nicht, ist es ein Objekt im JSON bzw. ein Dictionary in VBA
                If Not VarType(currentChild.item("optionSelection")) = vbString Then
                    If currentChild.item("optionSelection").Exists("name") Then

                        Dim selectedOptionName As String ' Nicht Label
                        selectedOptionName = currentChild.item("optionSelection").item("name")
                        optionGroup.optionSelectionName = selectedOptionName

                    End If
                Else
                    optionGroup.optionSelectionName = "Keine Auswahl"
                End If
                
                optionGroups.add optionGroup
                If Not logger Is Nothing Then logger.logINFO "Optionsauswahl erkannt '" & optionGroup.groupName & "' mit der Auswahl '" & optionGroup.optionSelectionName & "'"
                Set optionGroup = Nothing
            End If
        End If
        ' ------------------------------------
        
        
        

        ' BILD
        If StrComp(containerType, "PlacementContainerCustomization") = 0 Then

            If currentChild.Exists("children") Then

                Dim childOfPlacementContainerCustomization As Dictionary
                Set childOfPlacementContainerCustomization = currentChild.item("children")(0)

                If childOfPlacementContainerCustomization.Exists("type") Then
                    If StrComp(childOfPlacementContainerCustomization.item("type"), "ImageCustomization") = 0 Then
'                        MsgBox "Found Pic Child"
                        imageContainers.add currentChild
                    End If
                End If

            End If

        ' TEXT
        ElseIf StrComp(containerType, "ContainerCustomization") = 0 Then

            If currentChild.Exists("children") Then
                Dim childOfContainerCustomization As Dictionary
                Set childOfContainerCustomization = currentChild.item("children")(0)

                If childOfContainerCustomization.Exists("type") Then
                    If StrComp(childOfContainerCustomization.item("type"), "FontCustomization") = 0 Then
                        'MsgBox "Found Text Customization"
                        textContainers.add currentChild
                        If Not logger Is Nothing Then logger.logINFO "Text-Container gefunden! Containername: '" & currentChild.item("name") & "'"
                    End If
                End If
            End If

        
        ' GRUNDPLATTE
        '" name": "Grundplatte"
        ElseIf StrComp(containerType, "OptionCustomization") = 0 And (InStr(LCase(containerName), "platte") Or InStr(LCase(containerLabel), "material")) Then
            If Not logger Is Nothing Then logger.logFINE "Grundplattenauswahl / Material gefunden!"
            
            ' Wenn der Kunde eine Option ausgewählt hat
            If Not VarType(currentChild.item("optionSelection")) = vbString Then
                Dim groundPlateSelectionName As String
                groundPlateSelectionName = currentChild.item("optionSelection").item("name")
                
                
                If InStr(LCase(groundPlateSelectionName), "acryl") And InStr(LCase(groundPlateSelectionName), "satiniert") And InStr(LCase(groundPlateSelectionName), "schwarz") Then
                    ' Schwarz satiniertes Acryl
                    material = mtAcrylicBlackSatin
                ElseIf InStr(LCase(groundPlateSelectionName), "acryl") And InStr(LCase(groundPlateSelectionName), "satiniert") Then
                    ' Satiniertes Acryl
                    material = mtAcrylicSatin
                ElseIf InStr(LCase(groundPlateSelectionName), "acryl") And InStr(LCase(groundPlateSelectionName), "schwarz") Then
                    ' Schwarzes Acryl
                    material = mtAcrylicBlack
                ElseIf InStr(LCase(groundPlateSelectionName), "acryl") And InStr(LCase(groundPlateSelectionName), "anthrazit") Then
                    ' Anthrazit Acryl
                    material = mtAcrylicAnthrazit
                ElseIf InStr(LCase(groundPlateSelectionName), "acryl") And InStr(LCase(groundPlateSelectionName), "klar") Then
                    ' Klares Acryl
                    material = mtAcrylicClear
                End If
                
                If Not logger Is Nothing Then logger.logFINE "Grundplattenauswahl: '" & groundPlateSelectionName & "', Material: '" & material & "'"
            End If
            
        
        
        ' DESIGN-VARIANTE
        ' "name": "desVar(1)"
        ElseIf StrComp(containerType, "OptionCustomization") = 0 And InStr(LCase(containerName), "desvar(") Then
            
            Let desVarStr = Globals.subStrWithStrings(LCase(currentChild.item("name")), "desvar(", ")")
            
            Dim designVariantNr As Integer
            designVariantNr = CInt(desVarStr)
            
            ' Wenn der Kunde eine Option ausgewählt hat
            If Not VarType(currentChild.item("optionSelection")) = vbString Then
                 Dim designVariantOptionSelectionName As String
                designVariantOptionSelectionName = currentChild.item("optionSelection").item("name")
                
                
                ' Wenn kein Design ausgewählt wurde (bzw. das "freie" Design)
                If InStr(LCase(designVariantOptionSelectionName), "frei") Or InStr(LCase(designVariantOptionSelectionName), "ohne") Then
                    setDesignVariantSelectionItem -1, designVariantNr, logger, True
                Else
                    Dim designVariantOptionSelectionNr As Integer
                    designVariantOptionSelectionNr = -3
                    
                    On Error Resume Next
                    designVariantOptionSelectionNr = CInt(Globals.getDesignNrFromProductID(designVariantOptionSelectionName))
                    On Error GoTo 0
                    
                    ' Wenn sich der Standartwert der (-3) Variable nicht geändert hat oder 'Globals.getDesignNrFromProductID' -3 returnt hat,
                    ' dann gibt es keine D-Nummer in 'designVariantOptionSelectionName'
                    ' Aber es kann sein, dass hier das Format für Designvarianten verwendet wird. Z.B: "2: weiße Schrift"
                    If designVariantOptionSelectionNr = -3 Then
                        
                        ' Maximal 99 Designvarianten erlauben.
                        ' "99:" hat dann nur 3 Chars
                        Dim firstThreeChars As String
                        firstThreeChars = left(designVariantOptionSelectionName, 3)
                        
                        Dim colonPosition As Integer
                        colonPosition = InStr(firstThreeChars, ":")
                        
                        If colonPosition > 0 Then
                            'MsgBox "Number " & left(firstThreeChars, colonPosition - 1)
                            On Error Resume Next
                            designVariantOptionSelectionNr = CInt(left(firstThreeChars, colonPosition - 1))
                            On Error GoTo 0
                        End If
                       
                    End If
                    
                    ' Wenn sich der Standartwert (-3) der Variable noch immer nicht geändert hat
                    If designVariantOptionSelectionNr = -3 Then
                        Dim answer As VbMsgBoxResult
                        
                        Dim errorMsg As String
                        errorMsg = "Die Nummer der Designvariante konnte nicht erkannt werden: " & vbNewLine & "'" & designVariantOptionSelectionName & "'"
                        
                        AmazonImport.logError errorMsg
                        AmazonImport.addASINError errorMsg
                    End If
                    
                    setDesignVariantSelectionItem designVariantOptionSelectionNr, designVariantNr, logger, True
                End If
                
            Else
                setDesignVariantSelectionItem -1, designVariantNr, logger, True
            End If
            
            ' DEBUG
'            MsgBox "Der Kunde hat für die DesignVariante #" & designVariantNr & ", die Nr." & getDesignVariantSelection()(designVariantNr) & " gewählt"
        
        
        ' STATISCHE VARIANTE
        ' "name" : "var_befestigung",
        ElseIf StrComp(containerType, "OptionCustomization") = 0 And (Globals.startsWith(LCase(containerName), "var_")) Then
            
            If Not logger Is Nothing Then logger.logFINE "Statische Variante gefunden! Name: '" & currentChild.item("name") & "', Label: '" & currentChild.item("label") & "'"
            
            Dim optionSelectionObject As Variant
            If IsObject(currentChild.item("optionSelection")) Then
                Set optionSelectionObject = currentChild.item("optionSelection")
            Else
                optionSelectionObject = currentChild.item("optionSelection")
            End If
            
            If VarType(optionSelectionObject) = vbString Then
                If optionSelectionObject = "" Then
                    If Not logger Is Nothing Then logger.logWARN "Allerdings wurde keine Option ausgewählt. Varianten sollten immer Pflichtfelder sein"
                End If
            Else
                ' TODO hier könnte man ein echtes Varianten Objekt nutzen
                Dim staticVariantGroupNameAndName As New collection
                staticVariantGroupNameAndName.add containerName
                staticVariantGroupNameAndName.add currentChild.item("optionSelection").item("label")
                staticVariantGroupNameAndName.add False, "Processed"
                staticVariants.add staticVariantGroupNameAndName
            End If
            
            
        
        ' DESIGN-AUSNWAHL
        ' "name": "Designs",
        ElseIf StrComp(containerType, "OptionCustomization") = 0 And (InStr(LCase(containerName), "design") Or InStr(LCase(containerLabel), "design")) _
            And Not InStr(currentChild.item("name"), "desVar(") Then ' Muss hier stehen, damit nicht etwa DesignVarianten hier rein geraten
            
            If Not logger Is Nothing Then logger.logFINE "Designauswahl gefunden! Name: '" & currentChild.item("name") & "', Label: '" & currentChild.item("label") & "'"
            designChoiceContainers.add currentChild

        ' BILDAUSSCHNITT
        ' "name" : "Bildausschnitt",
        ElseIf StrComp(containerType, "OptionCustomization") = 0 And StrComp(containerName, "Bildausschnitt") = 0 Then
            
            ' Wenn die "optionSelection" ein leerer String ist "", wurde nichts ausgewählt
            ' Wenn nicht, ist es ein Objekt im JSON bzw. ein Dictionary in VBA
            If Not VarType(currentChild.item("optionSelection")) = vbString Then
                imageCutoutTypeName = currentChild.item("optionSelection").item("label")
                
                imageCutoutNeedsEditing = True
            End If
            
            imageCutoutTypeExists = True
        
        ' GRÖSSE
        ' "name" : "Größe"
        ElseIf StrComp(containerType, "OptionCustomization") = 0 And (InStr(LCase(containerName), "größe") Or InStr(LCase(containerLabel), "größe")) Then ' Or LCase(currentChild.item("name")) = "größe:" Or LCase(currentChild.item("label")) = "größe" Or LCase(currentChild.item("label")) = "größe:") Then
            
            ' Wenn der Kunde keine Größe ausgewählt hat, ist die Value von "optionSelection" ein leerer String
            ' Wenn nicht, ist es ein Objekt im JSON bzw. ein Dictionary in VBA
            ' Das prüft das IF vv
            If Not VarType(currentChild.item("optionSelection")) = vbString Then
                sizeSelection = currentChild.item("optionSelection").item("label")
                
                Dim sizeParsed As String
                sizeParsed = Globals.getSizeFromString(sizeSelection, True, True)
                
                If Not sizeParsed = "" Then
                    sizeSelection = sizeParsed
                End If
                
            Else
                MsgBox "Der Kunde hat im Konfigurator keine Größe ausgewählt. Die Größenoption muss im Konfigurator zu einem Pflichtfeld umgestellt werden." & _
                vbNewLine & "ASIN: " & ASIN & vbNewLine & vbNewLine & _
                "[AmazonImportJSONView.newAmazonImportJSONView]", vbExclamation
                
                ' Weitermachen lassen. Denn dann kann man den Designordner selbst suchen (Script schlägt das vor)
            End If
            
            
        
        ' BRANDZEICHEN
        '
        ElseIf StrComp(containerType, "OptionCustomization") = 0 And (InStr(containerName, "Brandzeichen") Or InStr(containerLabel, "Brandzeichen")) Then
            
            If Not logger Is Nothing Then logger.logFINE "Brandzeichen gefunden!"
            
            ' Wenn der Kunde kein Brandzeichen ausgewählt hat, ist die Value von "optionSelection" ein leerer String
            ' Wenn nicht, ist es ein Objekt im JSON bzw. ein Dictionary in VBA
            If Not VarType(currentChild.item("optionSelection")) = vbString Then
                addCustomerNote "Brandzeichen: " & currentChild.item("optionSelection").item("label")
            
                If Not logger Is Nothing Then logger.logFINE "  Brandzeichenauswahl zur Kundenanmerkung der View geparsed: " & currentChild.item("optionSelection").item("label")
            Else
                If Not logger Is Nothing Then logger.logFINE "  Kundenauswahl ist nicht vom Typ String. Kunde hat wohl keine Option ausgewählt. Auswahl: '" & CStr(currentChild.item("optionSelection")) & "'"
            End If
            
        
        ' FUNKKLINGEL EDELSTAHL ABGERUNDET / ECKIG
        '
        ElseIf StrComp(containerType, "OptionCustomization") = 0 And InStr(containerName, "Edelstahl") Then
        
            If Not VarType(currentChild.item("optionSelection")) = vbString Then
                Dim stainlessSteelOptionName As String
                stainlessSteelOptionName = currentChild.item("optionSelection").item("label")
                If stainlessSteelOptionName = "Eckig" Or stainlessSteelOptionName = "Abgerundete Ecken" Then
                    logger.logFINE "Funkklingel Edelstahl-Option gefunden"
                    addCustomerNote "Edelstahl:" & stainlessSteelOptionName
                End If
            End If
        
        
        
        ' FUNKKLINGEL POSITION DES AUSSCHNITTS
        
        ElseIf StrComp(containerType, "OptionCustomization") = 0 And InStr(containerName, "Position des Ausschnitts") Then
            
            If Not VarType(currentChild.item("optionSelection")) = vbString Then
                logger.logFINE "Funkklingel Edelstahl-Position-Option gefunden"
                addCustomerNote "Klingel Ausschnitt:" & currentChild.item("optionSelection").item("label")
            End If
            
            
            
        
'        ' FARBAUSWAHL
'        '
'        ElseIf StrComp(currentChild.item("type"), "OptionCustomization") = 0 And (InStr(currentChild.item("name"), "Farbauswahl") Or InStr(currentChild.item("label"), "Farbauswahl")) Then
'
'            logger.logFINE "    Farbauswahl gefunden!"
'
'            ' Wenn der Kunde keine Farbe ausgewählt hat, ist die Value von "optionSelection" ein leerer String
'            ' Wenn nicht, ist es ein Objekt im JSON bzw. ein Dictionary in VBA
'            If Not VarType(currentChild.item("optionSelection")) = vbString Then
'                addCustomerNote "Farbauswahl: " & currentChild.item("optionSelection").item("label")
'
'                logger.logFINE "        Farbauswahl zur Kundenanmerkung der View geparsed: " & currentChild.item("optionSelection").item("label")
'            Else
'                logger.logFINE "        Kundenauswahl ist nicht vom Typ String. Kunde hat wohl keine Option ausgewählt. Auswahl: '" & CStr(currentChild.item("optionSelection")) & "'"
'            End If
        
        
        ' QR CODE LINK
        ElseIf ((StrComp(containerType, "FlatRatePriceDeltaContainerCustomization") = 0) Or (StrComp(containerType, "OptionCustomization") = 0)) _
            And InStr(LCase(containerName), "qr code link") Then
        
            If currentChild.Exists("children") Then
                Dim qrCodeChildren As Dictionary
                Set qrCodeChildren = currentChild.item("children")(0)
                
                If qrCodeChildren.Exists("inputValue") Then
                    qrCodeLink = qrCodeChildren.item("inputValue")
                    logger.logINFO "QR-Code geunden!"
                End If
                
            End If
        
        ' SPAR-SET
        ElseIf (CBool(InStr(LCase(containerName), "spar")) And CBool(InStr(LCase(containerName), "set"))) Or _
               (CBool(InStr(LCase(containerLabel), "spar")) And CBool(InStr(LCase(containerLabel), "set"))) Then
            
            
            If currentChild.Exists("optionSelection") Then
                If TypeName(currentChild.item("optionSelection")) = "Dictionary" Then  ' Prüfen, ob der Kunde ein Sparset aus der Liste ausgewählt hat
                    Dim sparSetOptionContainer As Dictionary
                    Set sparSetOptionContainer = currentChild.item("optionSelection")
                    
                    Dim sparSetName As String
                    sparSetName = sparSetOptionContainer.item("name")
                    
                    Globals.regexx.Pattern = "\d+" 'Sucht nach einer Zahl (Zeichenlänge egal)
                    Globals.regexx.Global = False
                    Dim matches As MatchCollection
                    Set matches = Globals.regexx.Execute(sparSetName)
                    If matches.count > 0 Then
                        quantity = matches.item(0)
                        logger.logINFO "Sparset gefunden mit der Quantität von '" & quantity & "'"
                    Else
                        logger.logWARN "Sparset gefunden. Jedoch konnte die Quantität nicht erkannt werden: '" & sparSetName & "'"
                    End If
                End If
            End If
        
            
        ' ANMERKUNG
        '
        ElseIf StrComp(containerType, "TextCustomization") = 0 And InStr(containerLabel, "Anmerkung") Then
            If Not Trim(currentChild.item("inputValue")) = "" Then
                addCustomerNote "Kundenanmerkung: " & vbNewLine & Trim(currentChild.item("inputValue"))
            End If
        ElseIf StrComp(containerType, "FlatRatePriceDeltaContainerCustomization") = 0 And InStr(containerLabel, "Anmerkung") Then
            If currentChild.Exists("children") Then
                If UBound(currentChild.item("children")) >= 0 Then
                    If currentChild.item("children")(0).Exists("inputValue") Then
                        If Not Trim(currentChild.item("children")(0).item("inputValue")) = "" Then
                            addCustomerNote "Kundenanmerkung: " & vbNewLine & Trim(currentChild.item("children")(0).item("inputValue"))
                        End If
                    End If
                End If
            End If
        End If


    Next i
    
    
    
    ' DESIGNAUSWAHL
    ' -------------
    ' Wenn eine Designauswahl vorhanden ist
    If Not designChoiceContainers.count = 0 Then
    
        '"type": "OptionCustomization",
        '"name": "Designs",
        '"label": "Designauswahl",
        '"optionSelection": {
        '   "name": "Option 22",
        '   "label": "Design D72",
        
        ' Wenn die "optionSelection" ein leerer String ist "", wurde nichts ausgewählt
        ' Bzw. der Konfi ist falsch eingestellt und erlaubt die Option nichts auszuwählen
        If VarType(designChoiceContainers.item(1).item("optionSelection")) = vbString Then
            'Kein Design ausgewählt
            designName = "Frei (Kunde hat kein Design gewählt)"
        Else
            designName = designChoiceContainers.item(1).item("optionSelection").item("label")
        End If
        
    End If
    
    
    If Not logger Is Nothing Then logger.removeTab
    
End Function



Public Property Get viewName() As String
    If p_viewName = "" Then
        p_viewName = jsonViewDict.item("name")
    End If
    viewName = p_viewName
End Property


Private Property Get snapShot() As Dictionary
    If p_snapShot Is Nothing Then
        Set p_snapShot = jsonViewDict.item("snapshot")
    End If
    Set snapShot = p_snapShot
End Property


Public Property Get snapShotImageName() As String
    If p_snapShotImageName = "" Then
        p_snapShotImageName = snapShot.item("imageName")
    End If
    snapShotImageName = p_snapShotImageName
End Property


Private Property Get flatContainerCustomization() As Dictionary
    If p_flatContainerCustomization Is Nothing Then
        Set p_flatContainerCustomization = JSON.findJSONItemParentByValue(jsonViewDict, "FlatContainerCustomization")
    End If
    Set flatContainerCustomization = p_flatContainerCustomization
End Property


Private Property Get flatContainerCustomizationChildrenItems() As Variant()
    If Not Globals.isArrayDimensionised(p_flatContainerCustomizationChildrenItems) Then
        p_flatContainerCustomizationChildrenItems = flatContainerCustomization.item("children")
    End If
    flatContainerCustomizationChildrenItems = p_flatContainerCustomizationChildrenItems
End Property



Public Function getDesignVariantSelection() As Integer()
    getDesignVariantSelection = designVariantSelection
End Function


Public Function setDesignVariantSelectionItem(value As Integer, itemIndex As Integer, Optional logger As logger, Optional logFoundInfo As Boolean)
    If Not logger Is Nothing And logFoundInfo Then logger.logFINE "Designvariante erkannt! '" & itemIndex & "', '" & value & "'"
    designVariantSelection(itemIndex) = value
End Function


Public Function addCustomerNote(note As String)
    
    If customerNote = "" Then
        customerNote = note
    Else
        customerNote = customerNote & vbNewLine & vbNewLine & note
    End If
    
End Function


Public Function getPartsLayersAsShapeRange() As shapeRange
    Dim result As New shapeRange
    If designPartsAsShapeRange Is Nothing Then
        For p = 1 To designParts.count
            Dim part As ProductDesignPart
            Set part = designParts(p)
            
            For j = 1 To part.layers.count
                Dim layer As ProductDesignLayer
                Set layer = part.layers.getLayer(j)
                
                result.add layer.layerShape  '.shapes.All
                
                Set layer = Nothing
            Next j
            
            Set part = Nothing
        Next p
    End If
    Set getPartsLayersAsShapeRange = result
End Function


Public Function addPart(part As ProductDesignPart, Optional logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[AmazonImportJSONView.addPart]"
    designParts.add part
    If Not logger Is Nothing Then logger.logINFO "designParts.Count: " & designParts.count
    If Not logger Is Nothing Then logger.removeTab
End Function

Public Function getPart(ByVal index As Integer) As ProductDesignPart
    Set getPart = designParts(index)
End Function

Public Function getPartsCount() As Integer
    getPartsCount = designParts.count
End Function


Public Function getSizeSelectionWidth(Optional logger As logger) As Double
    parseSizeSelectionToNumber logger
    getSizeSelectionWidth = sizeSelectionWidth
End Function


Public Function getSizeSelectionHeight(Optional logger As logger) As Double
    parseSizeSelectionToNumber logger
    getSizeSelectionHeight = sizeSelectionHeight
End Function


Private Function parseSizeSelectionToNumber(Optional logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[AmazonImportJSONView.getSizeSelectionNumber]"
    If sizeSelectionWidth = 0 And sizeSelectionHeight = 0 Then

        If InStr(sizeSelection, "x") Then
            Dim dimensions() As String
            dimensions = Split(sizeSelection, "x")
    
            If Not logger Is Nothing Then logger.logINFO "Größenauswahl des Kunden: " & sizeSelection & ", Aufgeteilt: " & Globals.stringArrayToString(dimensions)
    
            sizeSelectionWidth = Globals.getRightNumber(dimensions(0))
            sizeSelectionHeight = Globals.getLeftNumber(dimensions(1))
    
            If Not logger Is Nothing Then logger.logINFO "Breite der Größenauswahl: " & sizeSelectionWidth
            If Not logger Is Nothing Then logger.logINFO "Höhe der Größenauswahl: " & sizeSelectionHeight
        Else
            If Not logger Is Nothing Then logger.logWARN "Größenauswahl hat kein X. Breite und Höhe können nicht ermittelt werden. sizeSelection: '" & sizeSelection & "'"
        End If
    
    End If
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function debugPrint(logger As logger)
    logger.addTab , "[AmazonImportJSONView.debugPrint]"
    
    logger.logINFO "viewIndex '" & viewIndex & "'"
    logger.logINFO "viewName '" & viewName & "'"
    
    logger.removeTab
End Function
