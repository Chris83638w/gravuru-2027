Attribute VB_Name = "AmazonExcelDesignInfo"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
' Stellt Infos aus der Amazon-ASIN-Excel zu einem Amazon Produkt bzw. einer ASIN dar.
' Dabei sind es entweder Infos zu einer View oder mehreren Views (Standard). Denn wenn es für eine ASIN 2 Zeilen an Infos in der Excel gibt, dann gilt jeder nur für eine View

Dim viewManager As AmazonImportViewManager

Public path As String
Public sizeFolder As FSSizeFolder
Private p_scaledSizeFolder As FSSizeFolder
Public designFiles As FSDesignFiles

Public confiType As Integer ' Konfigurator-Typ. 1 (Standart) oder 2 (Kunde gibt nur Text an, ohne Posiiton)
Public pathToTemplate As String ' Schablonenpfad aus der Excel
Public useSizeSelection As Boolean ' Beschreibt, ob die Größenauswahl des Kunden genutzt werden soll
Public scaleWidthToSizeSelection As Boolean ' Skaliert das Design auf die Breite der Größe, die der Kunde im Konfi ausgewählt hat
Public scaleToWidth As Double ' Skaliert das Design auf die Größe, die in der Excel angegeben ist
Public designName As String
Dim designNumber As Integer
Dim designNumberInitialized As Boolean
Public ignoreDesignOptionSelection As Boolean ' Wenn im Pfad zur CDR ein Platzhalter namens "Design" vorhanden ist, bedeutet das, dass das Design dadurch schon zum Pfad hinzugefügt wurde. Deshalb soll die Kunden-Design-Auswahl und die Designangabe in der Excel ignoriert werden

' Angabe darüber wie die Views sortiert werden sollen. Bspw. würde "2:1" bedeuten, dass die 2. View mit der ersten kombiniert werden soll.
' 2:0 bedeutet, dass die 2. View ganz ignoriert weden soll
' ACHTUNG: Wenn die 2 garnicht vorkommt, wird diese auch ignoriert. Bspw: "1:2|3:1" (nur 1 & 3 werden umsortiert)
' Bei "2:1|1:2" würden View 1 & 2 getauscht werden
Public viewSortInstruction As String

' Soll das Produktbild des Designs hinzugeladen werden?
' Macht Sinn bei Konfis, wo es ein Surface gibt und man das Design garnicht oder schlecht sehen kann. Das Produktbild zeigt das Design dann nochmal ganz deutlich und der Arbeiter kann den Text danach ausrichten
Public loadProductImage As Boolean

Public autoManageSize As Boolean
Public usedSameAspectRatioFolder As Boolean

' Wurde 'setDefaultJSONView' schon aufgerufen? (Passiert evtl. schon beim Initialisieren des Runs, damit die Schablonen jeder View gefunden werden)
Public isDefaultJSONViewSet As Boolean

' Die Schablone, die der User für diese View/Design-CDR ausgewählt hat. Nothing = ohne Schablone
Public template As AmazonImportTemplate

Dim jsonViews As New collection

Const SIZE_PLACEHOLDER As String = "%Größe%"

Public csvIndex As Integer
Public csvData As Variant
Dim forceDesignSelection As Boolean

' Da das Übersetzten des Pfades im Modus JsonV2 2 Schritte benötigen kann, wird zu Begin vermerkt, welchen Typ man vor sich hat, damit man es im 2. Schritt nicht nochmal machen muss
Dim translationType As TranslationTypeEnum
Dim translationJSON As Dictionary ' Nur für Übersetzungen im JSON Format
Public Enum TranslationTypeEnum
    noTranslation ' Default, wenn noch nicht initialisiert
    customLanguageTranslation
    jsonV1Translation
    jsonV2Translation
End Enum


' Wenn das Produkt im Größenordner 8x8 verknüpft ist, aber vom Kunden 6x6 gewählt wurde und die Option "scaleWidthToSizeSelection" aktiv ist,
' dann ist der Größenordner, in Bezug auf die Skalierung der 6x6 Ordner. Dort können dann bspw. Schablonen für 6x6 liegen
Public Property Get scaledSizeFolder() As FSSizeFolder
    If p_scaledSizeFolder Is Nothing Then

        ' TODO view.getSizeSelectionWidth
        Dim scaledSize As Vector
        Set scaledSize = getFinalSizeForScaling
        
        If Not scaledSize.x = 0 And Not scaledSize.y = 0 Then
            Dim scaledSizeFolderName As String
            scaledSizeFolderName = scaledSize.x & "x" & scaledSize.y
    
            Set p_scaledSizeFolder = sizeFolder.shapeFolder.getSizeFolderByName(scaledSizeFolderName)
        End If
    End If
    
    Set scaledSizeFolder = p_scaledSizeFolder
End Property


Public Function getScaledSizeFolderOrNormal() As FSSizeFolder
    If Not scaledSizeFolder Is Nothing Then
        Set getScaledSizeFolderOrNormal = scaledSizeFolder
    Else
        Set getScaledSizeFolderOrNormal = sizeFolder
    End If
End Function


Public Function getFinalSizeForScaling(Optional part As ProductDesignPart, Optional jsonViewWithSizeSelection As AmazonImportJSONView) As Vector
    Dim vec As New Vector
    
    
    Dim view As AmazonImportJSONView
    Set view = getViewWithSizeSelection
    If Not view Is Nothing Then
        vec.x = view.getSizeSelectionWidth
    Else
        vec.x = scaleToWidth
    End If
    
    Dim aspectRatio As Double
    If Not part Is Nothing Then
        Dim mainShapes As shapeRange
        Set mainShapes = part.getLayersMainShapes
        
        aspectRatio = mainShapes.SizeHeight / mainShapes.SizeWidth
    Else
        aspectRatio = sizeFolder.getAspectRatio
    End If
    
    If Not aspectRatio = 0 Then
        vec.y = vec.x / aspectRatio
    Else
        vec.x = 0
    End If
    
    Set getFinalSizeForScaling = vec
End Function



Public Function newAmazonExcelDesignInfo(viewManagerVar As AmazonImportViewManager, csvIndexVar As Integer, csvDataVar As Variant, Optional logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[AmazonExcelDesignInfo.newAmazonExcelDesignInfo]"
    
    Set viewManager = viewManagerVar
    csvIndex = csvIndexVar
    csvData = csvDataVar
    
    ' Pfad
    ' ::::::::::::::::::::::::::::::::::::::::::::::::
    path = csvData(csvIndex, AmazonImport.getElementIndexInASINToDesignCDRExcel("Dateipfad", csvData))
    If Not logger Is Nothing Then logger.logINFO ("Pfad ist : '" & path & "'")
    
    ' Größenauswahl Nutzung erzwingen
    ' ::::::::::::::::::::::::::::::::::::::::::::::::
    forceDesignSelection = LCase(csvData(csvIndex, AmazonImport.getElementIndexInASINToDesignCDRExcel("Designauswahl verwendung erzwingen", csvData))) = "ja"
    If Not logger Is Nothing Then logger.logINFO "Designauswahl wird erzwungen (Auch wenn Designauswahl durch Übersetzung gematched wird): '" & forceDesignSelection & "'"
    
    ' View sortierung
    ' ::::::::::::::::::::::::::::::::::::::::::::::::
    viewSortInstruction = csvData(csvIndex, AmazonImport.getElementIndexInASINToDesignCDRExcel("View Sortierung", csvData))
    
    ' Übersetzung des Pfades. Aus '%Größe%' wird z.B: '30x20'
    ' ------------------------------------------------------------------------
    translatePath False, logger
    ' ------------------------------------------------------------------------
    
    ' Größenauswahl nutzen
    ' ::::::::::::::::::::::::::::::::::::::::::::::::
    ' Beschreibt, ob die Größenauswahl im Konfi genutzt werden soll.
    ' Ist nicht immer so, da viele Produkte proportional skaliert werden können und deshalb nur eine Größe auf dem Server ist.
    useSizeSelection = LCase(csvData(csvIndex, AmazonImport.getElementIndexInASINToDesignCDRExcel("Größe", csvData))) = "ja"
    If Not logger Is Nothing Then logger.logINFO "Größe nutzen (laut Excel-Liste): " & useSizeSelection
    
    ' Automatisches Größenmanagement
    ' ::::::::::::::::::::::::::::::::::::::::::::::::
    autoManageSize = Not LCase(csvData(csvIndex, AmazonImport.getElementIndexInASINToDesignCDRExcel("automatisches Größenmanagement", csvData))) = "nein"
    
    ' Designnummer
    ' ::::::::::::::::::::::::::::::::::::::::::::::::
    ' Die Designnummer kann eine Zahl sein oder "s". Das steht dann für das Standartdesign bzw. für das Design "frei"
    Dim designNameFromCSV As String
    designNameFromCSV = LCase(csvData(csvIndex, AmazonImport.getElementIndexInASINToDesignCDRExcel("Design-Nummer", csvData)))
    If Not designNameFromCSV = "" Then
        designName = designNameFromCSV
        If Not logger Is Nothing Then logger.logINFO "designName ist jetzt '" & designName & "' weil ein '" & designNameFromCSV & "' in der Excel unter Design-Nummer(Spalte G) gefunden wurde."
    End If
    
    
    ' Konfi-Typ
    ' ::::::::::::::::::::::::::::::::::::::::::::::::
    If csvData(csvIndex, AmazonImport.getElementIndexInASINToDesignCDRExcel("Konfi-Typ", csvData)) = "" Then
        confiType = 1
    Else
        ' Tritt hier ein Fehler auf, ist der Konfityp keine Zahl. csvIndex ist dann die Problemzeile in der CSV
        confiType = CInt(csvData(csvIndex, AmazonImport.getElementIndexInASINToDesignCDRExcel("Konfi-Typ", csvData)))
    End If
    
    
    ' Schablonenpfad
    ' ::::::::::::::::::::::::::::::::::::::::::::::::
    pathToTemplate = csvData(csvIndex, AmazonImport.getElementIndexInASINToDesignCDRExcel("Schablonenpfad", csvData))
    
    ' Produktbild hinzuladen
    ' ::::::::::::::::::::::::::::::::::::::::::::::::
    ' Eintragen, ob das Produktbild auch hinzugeladen werden soll,
    ' da manche Konfis nicht direkt zeigen, wie das originale Design und die Textausrichtung davon ist
    loadProductImage = Not csvData(csvIndex, AmazonImport.getElementIndexInASINToDesignCDRExcel("Produktbild laden", csvData)) = ""
    
    ' Breite des Designs auf Größenauswahl skalieren
    ' ::::::::::::::::::::::::::::::::::::::::::::::::
    scaleWidthToSizeSelection = Not csvData(csvIndex, AmazonImport.getElementIndexInASINToDesignCDRExcel("Breite wie Größenauswahl", csvData)) = "" ' Wenn 'ja' (oder irgendetwas anderes) angegeben wurde, dann wird ein True daraus
    If Not logger Is Nothing Then logger.logINFO "Breite des Designs auf Größenauswahl skalieren: '" & scaleWidthToSizeSelection & "'"
    
    ' Breite des Designs skalieren
    ' ::::::::::::::::::::::::::::::::::::::::::::::::
    Dim scaleToWidthAsString As String
    scaleToWidthAsString = csvData(csvIndex, AmazonImport.getElementIndexInASINToDesignCDRExcel("Auf Breite skalieren", csvData))
    If Not scaleToWidthAsString = "" Then
        scaleToWidth = CDbl(scaleToWidthAsString)
        If Not logger Is Nothing Then logger.logINFO "Breite des Designs skalieren: '" & scaleToWidth & "'"
    End If
    
    
    If Not logger Is Nothing Then logger.removeTab
'    Exit Function
'CouldntFindDefaultDesignFolder:
'    ' Die 514 ist ein spezieller Fehler aus der 'getDefaultDesignNameFromDesignsFolder'
'    If Err.number = vbObjectError + 514 Then
'        Err.Raise Err.number, Err.source, "Die ASIN '" & ASIN & "' ist falsch verknüpft. Sie ist direkt zu einem Designordner verlinkt, obwohl der Konfi eine Designauswahl hat!", Err.HelpFile, Err.HelpContext
'    Else
'        Err.Raise Err.number, Err.source, Err.Description, Err.HelpFile, Err.HelpContext
'    End If
End Function




Public Function translatePath(secondPhase As Boolean, Optional logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[AmazonExcelDesignInfo.translatePath] secondPhase: '" & secondPhase & "'"
    
    
    ' Übersetzungstyp ermitteln (Wenn nicht schon mal ermittelt. Denn dank 'secondPhase' wird die Funktion 2x aufgerufen)
    ' ---------------------------------------
    If translationType = noTranslation Then
         ' Daten aus der Excel Bsp: "Bündig:24x20|Milchglas:Satiniert"
        Dim optionSelectionTranslationStr As String
        optionSelectionTranslationStr = csvData(csvIndex, AmazonImport.getElementIndexInASINToDesignCDRExcel("Konfi-Options-Übersetzungen", csvData))
        
        If Not logger Is Nothing Then logger.logINFO "Übersetzung aus der Excel: '" & optionSelectionTranslationStr & "'"
        
         ' Wenn eine geschweifte Klammer vorkommt, dann ist der 'optionSelectionTranslationStr' ein JSON
        ' ---------------------------------------------------------------------------------------------
        If InStr(optionSelectionTranslationStr, "{") Then
        
            ' Da Excel einen JSON-String am Anfang und Ende mit extra Anführungszeichen abspeichert, müssen diese beim laden entfernt werden
            ' Außerdem werden bereits vorhandene Anführungszeichen im JSON-String verdoppelt. Wird hier auch entfernt
            optionSelectionTranslationStr = replace(optionSelectionTranslationStr, Chr(34) & Chr(34), Chr(34))
            ' Unnötige " Zeichen links und rechts abschneiden
            optionSelectionTranslationStr = left(optionSelectionTranslationStr, Len(optionSelectionTranslationStr) - 1)
            optionSelectionTranslationStr = Right(optionSelectionTranslationStr, Len(optionSelectionTranslationStr) - 1)
            
            Dim errorStr As String
            Set translationJSON = JSON.Parse(optionSelectionTranslationStr, errorStr)
            
            
            If translationJSON.Exists("Matches") Then
                translationType = jsonV2Translation
            Else
                translationType = jsonV1Translation
            End If
            
         ' Wenn KEINE geschweifte Klammer vorkommt, dann ist der 'optionSelectionTranslationStr' KEIN JSON
        ' ---------------------------------------------------------------------------------------------
        Else
            translationType = customLanguageTranslation
        End If
    End If
    ' ---------------------------------------
            
    
    ' Passende Übersetzungs-Funktion aufrufen
    ' -------------------------------------
    Select Case translationType
        Case customLanguageTranslation
            If Not secondPhase Then translatePathWithCustomFormat optionSelectionTranslationStr, logger
        Case jsonV1Translation
            If Not secondPhase Then translatePathWithJSONV1 logger
        Case jsonV2Translation
            translatePathWithJSONV2 secondPhase, logger
    End Select
    ' -------------------------------------
    
    If Not logger Is Nothing Then logger.removeTab
End Function




'Private Function translatePathWithJSON(optionGroups As collection, optionSelectionTranslationStr As String, Optional logger As logger)
'
'
'
'
'
'    If translationJSON.Exists("Matches") Then
'        translatePathWithJSONV2 translationJSON, optionGroups, logger
'    Else
'        translatePathWithJSONV1 translationJSON, optionGroups, logger
'    End If
'
'
'
'End Function




' Verarbeitet die zweite Version von einem Übersetzungs-JSON (Zu finden bei den Gedenktafeln mit/ohne Rahmen)
' Daten sehen da wie folgt aus:
'{
'  "Matches": [
'    {
'      "Conditions": {
'        "View(1)": {
'          "Größe": "15x10 cm"
'        }
'      },
'      "Results": {
'        "View(1)": {
'           "%GRÖSSE%" : "21x15"
'        }
'      }
'    }
'  ]
'}
'
' Die 'secondPhase' ist ein zweiter Aufruf dieses Funktion, die stattfindet, nachdem das Design geladen wurde. Denn erst dann weiß mann bspw. welche D-Nummer zum Laden verwendet wurde
' Das kann nützlich sein, um bspw. Designvarianten nur bei einem bestimmten Design hinzuzuladen
Private Function translatePathWithJSONV2(secondPhase As Boolean, Optional logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[AmazonExcelDesignInfo.translatePathWithJSONV2] secondPhase: '" & secondPhase & "'"
    
    Dim matchesItem As Variant ' Array
    matchesItem = translationJSON.item("Matches")
    
    ' Wird mehrfach verwendet
    Dim jsonView As AmazonImportJSONView
    Dim viewItem As Dictionary
    Dim viewNumber As Integer
    
    ' Matches durchlaufen
    ' ==================
    For i = LBound(matchesItem) To UBound(matchesItem)
        
        Dim matchItem As Dictionary
        Set matchItem = matchesItem(i)
        
        
        Dim conditionsItem As Dictionary
        Set conditionsItem = matchItem("Conditions")
        
        
        Dim resultsItem As Dictionary
        Set resultsItem = matchItem.item("Results")
        
        If Not logger Is Nothing Then logger.logFINE "Verarbeite Match #'" & i & "' mit dem Egebnis: '" & currentResult & "'"
        
        ' Views der aktuellen Kondition durchlaufen
        ' (Wenn eine Kondition keine View oder Eigenschaften hat, matcht sie sofort)
        ' ==================
        For Each viewItemKey In conditionsItem
            
            Set viewItem = conditionsItem(viewItemKey)
            viewNumber = Globals.getStringBetweenStrings((viewItemKey), "(", ")")
            
            If viewNumber <= viewManager.unsortedJSONViews.count Then
                Set jsonView = viewManager.unsortedJSONViews(viewNumber)
                
                For Each viewConditionItemKey In viewItem
                    
                    Dim viewConditionItemValue As String
                    viewConditionItemValue = viewItem.item(viewConditionItemKey)
                    
                    If Not logger Is Nothing Then logger.logFINE "Verarbeite Kondition. Option: '" & viewConditionItemKey & "', Wert: '" & viewConditionItemValue & "'"
                    
                    If isConditionMatchingOptionSelection(viewConditionItemKey, viewConditionItemValue, logger) Then
                        
                        checkIfMatchedConditionIsDesign viewConditionItemKey
                        
                    ElseIf viewConditionItemKey = "designNumber" Then
                            
                        ' Nur dann matchen, wenn das Design schon geladen wurde und die Designnummer feststeht (also erst in der 'secondPhase')
                        If Not secondPhase Then
                            GoTo NextMatch
                        End If
                        
                        Dim designNumber As Integer
                        designNumber = CInt(viewConditionItemValue)
                        
                        If Not designNumber = getDesignNumberFromExcelOrJSON(jsonView) Then
                            GoTo NextMatch
                        End If
                        
                    Else
                        If Not logger Is Nothing Then logger.logWARN "Unbekannte Kondition. Key '" & viewConditionItemKey & "', Value: '" & viewConditionItemValue & "'"
                        GoTo NextMatch ' Unbekannte Kondition
                    End If
                    
                Next
            Else
                If Not logger Is Nothing Then logger.logWARN "Die View: '" & viewNumber & "' exestiert nicht"
            End If
            
            
            Set viewItem = Nothing
        Next
                
                
        ' Alle Konditionen haben bis hierhin gematched
        ' Deshalb wird sich jetzt um die 'Results' gekümmert
        If Not logger Is Nothing Then logger.logFINE "Match #" & i & " passt. Alle Konditionen erfüllt"
        
        ' Alle Views der Results durchlaufen
        For Each viewItemKey In resultsItem
            
            
            Set viewItem = resultsItem(viewItemKey)
            viewNumber = Globals.getStringBetweenStrings((viewItemKey), "(", ")")
            
            If viewNumber <= viewManager.unsortedJSONViews.count Then
                Set jsonView = viewManager.unsortedJSONViews(viewNumber)
                
                For Each viewResultKey In viewItem
                    
                    Dim viewResultValue As String
                    viewResultValue = viewItem.item(viewResultKey)
                    
                    Dim viewResultValueInt As Integer
                    viewResultValueInt = CInt(viewResultValue)
                    
                    If InStr(viewResultKey, "%") Then
                        path = replace(path, viewResultKey, viewResultValue)
                        If Not logger Is Nothing Then logger.logFINE "Pfad wurde übersetzt. Pfad ist jetzt '" & path & "'"
                        
                    ElseIf startsWith((viewResultKey), "desVar(") Then
                        
                        Dim designVariantNumberStr As String
                        designVariantNumberStr = Globals.getStringBetweenStrings((viewResultKey), "(", ")")
                        
                        Dim designVariantNumber As Integer
                        designVariantNumber = CInt(designVariantNumberStr)
                        
                        jsonView.setDesignVariantSelectionItem viewResultValueInt, designVariantNumber
                        
                        If Not logger Is Nothing Then logger.logFINE "Designvariantenauswahl wurde gesetzt"
                        
                    ElseIf viewResultKey = "designNumber" Then
                        
                        jsonView.designName = "D" & viewResultValue
                        
                        If Not logger Is Nothing Then logger.logFINE "Designauswahl wurde gesetzt. DesignNumber: '" & viewResultValue & "'"
                        
                    Else
                        If Not logger Is Nothing Then logger.logWARN "Result wurde nicht erkannt: '" & viewResultKey & "'"
                    End If
                    
                Next
            Else
                If Not logger Is Nothing Then logger.logWARN "Die View: '" & viewNumber & "' exestiert nicht"
            End If
            
            Set viewItem = Nothing
        Next
        

        
         
'        GoTo NextSlug
        
NextMatch:
        Set resultsItem = Nothing
        Set conditionsItem = Nothing
        Set matchItem = Nothing
    Next i
     
    If Not logger Is Nothing Then logger.removeTab
    
End Function


' Guckt in der Kunden-JSON nach, ob eine Option (z.B: Größe) und die Kundenauswahl davon (z.B: 30x20) dem 'conditionKey' und der 'conditionValue' entsprechen
Private Function isConditionMatchingOptionSelection(ByVal conditionKey As String, ByVal conditionValue As String, Optional logger As logger) As Boolean

    If Not logger Is Nothing Then logger.addTab , "[AmazonExcelDesignInfo.isConditionMatchingOptionSelection] conditionKey: '" & conditionKey & "', conditionValue: '" & conditionValue & "'"

    Dim currentOptionGroup As AmazonImportJSONOptionGroup

    For j = 1 To viewManager.allOptionGroupsOfJSONViews.count
        Set currentOptionGroup = viewManager.allOptionGroupsOfJSONViews(j)
        
        ' Vergleicht eine Optionsgruppe (aus der Kunden-JSON) (z.B: "Größe") mit einer Condition (aus der Excel) (z.B: "Größe")
        If currentOptionGroup.groupName = conditionKey Then
            ' Vergleicht eine Optionsauswahl (z.B: "30x20") mit der Value einer Condition (z.B: "30x20")
            If currentOptionGroup.optionSelectionName = conditionValue Then
            
                If Not logger Is Nothing Then logger.logFINE "Kondition passt. Option: '" & currentOptionGroup.groupName & "', Wert: '" & currentOptionGroup.optionSelectionName & _
                    "', Verglichen mit KonfiOption: '" & currentOptionGroup.groupName & "', Wert: '" & currentOptionGroup.optionSelectionName & "'"
                
                
                isConditionMatchingOptionSelection = True
                
                GoTo ExitFunction
            End If
        End If
        
        If Not logger Is Nothing Then logger.logFINER "Kondition passt NICHT. Option: '" & conditionKey & "', Wert: '" & conditionValue & _
            "', Verglichen mit Kundenauswahl Konfi-Option: '" & currentOptionGroup.groupName & "', Konfi-Options-Auswahl: '" & currentOptionGroup.optionSelectionName & "'"
        
        Set currentOptionGroup = Nothing
    Next j
    
ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
End Function



Private Function checkIfMatchedConditionIsDesign(ByVal viewConditionItemKey As String, Optional logger As logger)
    
    ' Wenn im Pfad zur CDR ein Platzhalter namens "Design" vorhanden ist,
    ' bedeutet das, dass der Pfad zur Design-CDR erst durch eine Übersetzung stattfindet
    '
    ' Bspw: man hat folgenden Pfad zu CDR aus der Excel:
    ' "V:\Produkte\Grabstecker\UV\Rund\16x40\%Design%"
    '
    ' In der Amazon-JSON wurde unter der Optionsgruppe "Design" folgende Option ausgewählt: "Pflanze"
    ' Als Übersetzung hat man folgendes in der Excel stehen: "Pflanze:GSTRUV-V2A-16x40-D4"
    '
    ' Daraus ergibt sich der Pfad: "V:\Produkte\Grabstecker\UV\Rund\16x40\GSTRUV-V2A-16x40-D4"
    ' Das bedeutet, dass das Design nicht nochmal extra zum Pfad hinzugefügt werden muss im weiteren Verlauf
    If Not forceDesignSelection Then
        If InStr(LCase(viewConditionItemKey), "design") Then
            If Not logger Is Nothing Then logger.logINFO "Der String 'design' wurde im gematchten replaceSlug gefunden ('" & viewConditionItemKey & "'). Deshalb wird die Designzuordung im weiteren Verlauf des Codes ignoriert! "
            ignoreDesignOptionSelection = True
        End If
    End If
    
End Function


' Gilt nur für JSON-V1 und für das Custom-Format
Private Function canPathBeTranslated(logger As logger) As Boolean
    
    ' Wenn im Pfad Prozente vorkommen, heißt das,
    ' dass diese Bereiche mit einer Optionsauswahl aus dem konfi (optionGroups) getauscht werden wollen.
    ' Z.B: V:\Produkte\Schlüsselanhänger\Dogtag\%Material%\5x6\
    ' Wenn dann die Option "Material" im Konfi auswählbar war und der Kunde z.B: "Holz" gewählt hat, kommt folgendes raus:
    ' Z.B: V:\Produkte\Schlüsselanhänger\Dogtag\Holz\5x6\
    If InStr(path, "%") Then
        If Not viewManager.allOptionGroupsOfJSONViews Is Nothing Then
            canPathBeTranslated = True
        Else
            If Not logger Is Nothing Then logger.logINFO "Es gibt keine Optionen aus dem Konfi. Also kann auch nicht übersetzt werden"
        End If
    Else
        If Not logger Is Nothing Then logger.logINFO "Pfad enthält kein Prozentzeichen '%'. Es kann also nichts ersetzt werden. Pfad: '" & path & "'"
    End If
    
End Function


' Verarbeitet die erste Version von einem Übersetzungs-JSON
' Daten sehen da wie folgt aus:
'{
'  "BEFESTIGUNG": {
'    "Matches": [
'      {
'        "Conditions": {
'          "Befestigung": "mit Bohrlöchern und Schrauben",
'          "Edelstahl Hintergrundplatte": "Bündig"
'        },
'        "Result": "mit Bohlöchern\\Eckig"
'      }
'    ]
'  }
'}
Private Function translatePathWithJSONV1(Optional logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[AmazonExcelDesignInfo.translatePathWithJSONV1]"
    
    If Not canPathBeTranslated(logger) Then
        GoTo ExitFunction
    End If
    
    For Each slugItemKey In translationJSON
        
        Dim slugItem As Dictionary
        Set slugItem = translationJSON.item(slugItemKey)
        
        If Not logger Is Nothing Then logger.logFINE "Verarbeite den Slug '" & slugItemKey & "'"
        
        ' Der aktuelle Name zum Ersetzen.
        ' Z.B: 'Befestigung'
        Dim currentReplaceSlug As String
        currentReplaceSlug = slugItemKey ' translationJSON.keys(i)
        
        If InStr(path, "%" & currentReplaceSlug & "%") Then
            
            Dim matchesItem As Variant ' Array
            matchesItem = slugItem.item("Matches")
            
            ' Matches durchlaufen
            ' ==================
            For i = LBound(matchesItem) To UBound(matchesItem)
                
                Dim matchItem As Dictionary
                Set matchItem = matchesItem(i)
                
                Dim conditionsItem As Dictionary
                Set conditionsItem = matchItem("Conditions")
                
                Dim currentResult As String
                currentResult = matchItem("Result")
                
                If Not logger Is Nothing Then logger.logFINE "Verarbeite Match #" & i & " mit dem Ergebnis: '" & currentResult & "'"
                
                ' Konditionen durchlaufen
                ' (Wenn eine Kondition keinen Inhalt hat, matcht sie sofort)
                ' ==================
                For Each viewConditionItemKey In conditionsItem
                    
                    Dim viewConditionItem As String
                    viewConditionItem = conditionsItem(viewConditionItemKey)
                    
                    If Not logger Is Nothing Then logger.logFINE "Verarbeite Kondition. Option: '" & viewConditionItemKey & "', Wert: '" & viewConditionItem & "'"
                    
                    Dim conditionCorrect As Boolean
                    conditionCorrect = False
                    
                    If isConditionMatchingOptionSelection(viewConditionItemKey, viewConditionItem, logger) Then
                        
                        checkIfMatchedConditionIsDesign viewConditionItemKey, logger
                        
                        conditionCorrect = True
                    End If
                   
                    
                    If Not conditionCorrect Then
                        GoTo NextMatch
                    End If
                    
                Next
                
                ' Alle Konditionen haben bis hierhin gematched
                ' Deshalb wird sich jetzt um das 'Result' gekümmert
                path = replace(path, "%" & currentReplaceSlug & "%", currentResult)
                
                If Not logger Is Nothing Then logger.logFINE "Match #" & i & " passt. Pfad ist jetzt '" & path & "'"
                GoTo NextSlug
                
NextMatch:
                Set conditionsItem = Nothing
                Set matchItem = Nothing
            Next i
            
            
            
            Set matchesItem = Nothing
        Else
            If Not logger Is Nothing Then logger.logFINE "Slug nicht gefunden!"
        End If
        
        
NextSlug:
        Set slugItem = Nothing
    Next

ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
    
End Function





' Übersetzt den Pfad mithilfe des speziellen Datenformates
' Daten sehen da wie folgt aus: "key:value|key2:value2"
Private Function translatePathWithCustomFormat(optionSelectionTranslationStr As String, Optional logger As logger)

    If Not logger Is Nothing Then logger.addTab , "[AmazonExcelDesignInfo.translatePathWithCustomFormat]"
    
    If Not canPathBeTranslated(logger) Then
        GoTo ExitFunction
    End If
    
    ' Daten nach dem Split: ["Bündig:24x20", "Milchglas:Satiniert"]
    Dim optionSelectionTranslations() As String
    optionSelectionTranslations = Split(optionSelectionTranslationStr, "|")
    
    If Not logger Is Nothing Then logger.logFINE "Übersetzung aufgeteilt: '" & Globals.stringArrayToString(optionSelectionTranslations) & "'"
    
    Dim currentOptionGroup As AmazonImportJSONOptionGroup
    
    For j = 1 To viewManager.allOptionGroupsOfJSONViews.count
        
        Set currentOptionGroup = viewManager.allOptionGroupsOfJSONViews(j)
        
        
        ' Prüfen, ob die aktuelle Auswahlgruppe 'currentOptionGroup' als Gruppenname 'currentOptionGroup.groupName' genau den Namen hat,
        ' der zwischen den Prozentzeichen steht. Z.B: "V:\Produkte\Grabstecker\UV\Rund\%Größe%"
        If InStr(path, "%" & currentOptionGroup.groupName & "%") Then
        
            If Not logger Is Nothing Then logger.logFINE "2 Prozentzeichen gefunden"
        
            ' Wenn im Pfad zur CDR ein Platzhalter namens "Design" vorhanden ist,
            ' bedeutet das, dass der Pfad zur Design-CDR erst durch eine Übersetzung stattfindet
            '
            ' Bspw: man hat folgenden Pfad zu CDR aus der Excel:
            ' "V:\Produkte\Grabstecker\UV\Rund\16x40\%Design%"
            '
            ' In der Amazon-JSON wurde unter der Optionsgruppe "Design" folgende Option ausgewählt: "Pflanze"
            ' Als Übersetzung hat man folgendes: "Pflanze:GSTRUV-V2A-16x40-D4"
            '
            ' Daraus ergibt sich der Pfad: "V:\Produkte\Grabstecker\UV\Rund\16x40\GSTRUV-V2A-16x40-D4"
            ' Das bedeutet, dass das Design nicht nochmal extra zum Pfad hinzugefügt werden muss weiter unten im Code
            If Not forceDesignSelection Then
                If InStr(LCase(currentOptionGroup.groupName), "design") Then
                    If Not logger Is Nothing Then logger.logINFO "Der String 'design' wurde in der " & j & ". Options-Gruppe gefunden ('" & currentOptionGroup.groupName & "'). Außerdem kommt es in dem Pfad vor. Deshalb wird die Designzuordung weiter unten im Code ignoriert! "
                    ignoreDesignOptionSelection = True
                End If
            End If
            
            
            
            Dim optionSelectionName As String
            optionSelectionName = currentOptionGroup.optionSelectionName
            
            ' Übersetzung für den 'optionSelectionName' suchen, falls vorhanden
            For k = 0 To UBound(optionSelectionTranslations)
            
                Dim translationKeyAndValue() As String
                translationKeyAndValue = Split(optionSelectionTranslations(k), ":")
                
                If Not logger Is Nothing Then logger.logFINE "Schlüssel und Wert: '" & Globals.stringArrayToString(translationKeyAndValue) & "'"
                
                If getArraySize(translationKeyAndValue) < 2 Then
                    Err.Raise vbObjectError + 513, , "[Globals.translatePathForAmazonImport] Der String '" & optionSelectionTranslations(k) & "' konnte nicht in Option und Übersetzung mittels ':' getrennt werden. Vermutlich fehlt das ':' Zeichen"
                ElseIf getArraySize(translationKeyAndValue) > 2 Then
                    Err.Raise vbObjectError + 513, , "[Globals.translatePathForAmazonImport] Der String '" & optionSelectionTranslations(k) & "' wurde in zu viele Teile geteilt. Vermutlich gibt es mehr als ein ':' Zeichen"
                End If
            
                Dim translationKey As String
                translationKey = translationKeyAndValue(0)
                
                Dim translationValue As String
                translationValue = translationKeyAndValue(1)
                
    
               If Not logger Is Nothing Then logger.logFINER "Vergleiche option '" & optionSelectionName & "' mit Übersetzung '" & translationKey & "'"

                If optionSelectionName = translationKey Then
                    
                    path = replace(path, "%" & currentOptionGroup.groupName & "%", translationValue)
                    
                    If Not logger Is Nothing Then logger.logFINE "Platzhalter im Pfad durch Option getauscht. Options-Gruppenname: '" & currentOptionGroup.groupName & _
                        "', Options-Auswahl: '" & currentOptionGroup.optionSelectionName & "', übersetzt: '" & optionSelectionName & "',  Pfad: '" & path & "'"
                        
                    Exit For
                End If
            Next k
            

           
            
        End If
        
        Set currentOptionGroup = Nothing
    Next j
        
ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
End Function




Public Function addJSONView(jsonView As AmazonImportJSONView)
    Globals.addToCollectionIfNotAlready jsonViews, jsonView
End Function

Public Function getJSONViewsSize() As Integer
    getJSONViewsSize = jsonViews.count
End Function

Public Function getJSONView(ByVal index As Integer) As AmazonImportJSONView
    Set getJSONView = jsonViews(index)
End Function


' Name der View, für die diese Excelzeile gilt. Aus der Spalte 'View-Name' oder, wenn leer, von der ersten JSON-View
Public Function getViewName() As String
    getViewName = viewManager.getCSVViewName(csvIndex)
    
    If getViewName = "" And getJSONViewsSize > 0 Then
        getViewName = getJSONView(1).viewName
    End If
End Function


' Gibt die Pfade aller Schablonen zurück, die für diese View/Design-CDR infrage kommen
' (Der Schablonenpfad aus der Excel und die Schablonen aus dem Größenordner)
Public Function getTemplateCandidatePaths(forGraving As Boolean, forPrint As Boolean, Optional logger As logger) As ArrayList
    Dim result As New ArrayList
    
    If Not pathToTemplate = "" Then result.add pathToTemplate
    
    ' Der Größenordner ist erst bekannt, wenn 'setDefaultJSONView' aufgerufen wurde
    If Not sizeFolder Is Nothing Then
        result.AddRange getScaledSizeFolderOrNormal.getTemplateFilesPaths(logger, forGraving, forPrint)
    End If
    
    result.RemoveDuplicates
    Set getTemplateCandidatePaths = result
End Function

' Setzt die erste (standart) View aus der JSON mithilfe dessen dann die Kundenauswahlen zum Design führen (Größenauswahl, Designsauswahl etc.)
' Eine ExcelDesignInfo kann mehrere JSON-Views haben. Aber nur die erste bestimmt wirklich, welche Optionen der Kunde gesetzt hat
Public Function setDefaultJSONView(jsonView As AmazonImportJSONView, Optional logger As logger)
    
'    autoManageSize = True
    
    designNumber = -2 ' Als "noch nicht initialisiert" markieren
    isDefaultJSONViewSet = True
    
    addJSONView jsonView
    
    If Not logger Is Nothing Then logger.addTab , "[AmazonExcelDesignInfo.setDefaultJSONView]"
    
    path = Globals.addBackslash(path)
    
    
    Dim pathIsAlreadyADesignFolder As Boolean
    pathIsAlreadyADesignFolder = Globals.isFolderDesignFolder(path)
    
    Dim pathIsAlreadyADesignsFolder As Boolean
    pathIsAlreadyADesignsFolder = Globals.isFolderDesignsFolder(path, logger)
    
    ' Größen-Ordner suchen
    ' ::::::::::::::::::::
    If (useSizeSelection Or (autoManageSize And Not pathIsAlreadyADesignFolder)) And Not jsonView.sizeSelection = "" And Not pathIsAlreadyADesignsFolder Then
        
        ' Vom Amazon-Konfi wurde ein Größenname mitgegeben. Z.B: "21x36,5"
        ' Es kann aber sein, dass der Ordner auf der Neuen-Struktur nur ähnlich heißt. Z.B. mit Punkt: "21x36.5"
        Dim possibleFolderNamesWithSize As New collection
        possibleFolderNamesWithSize.add path & jsonView.sizeSelection
        
        ' Wenn der Größenname ein Komma enthält, kann es sein, dass der Ordner auf der Neuen-Struktur statt eines Kommas einen Punkt enthält
        If InStr(jsonView.sizeSelection, ",") Then possibleFolderNamesWithSize.add path & replace(jsonView.sizeSelection, ",", ".")
        ' ... umgekehrt kann es auch sein
        If InStr(jsonView.sizeSelection, ".") Then possibleFolderNamesWithSize.add path & replace(jsonView.sizeSelection, ".", ",")
        
        If Not logger Is Nothing Then logger.logINFO "Mögliche Größen-Ordnernamen, nach denen gesucht wird: " & vbNewLine & Globals.collectionToMultiLineStr(possibleFolderNamesWithSize, "'", "'")
        
        ' Prüfen, ob der Größenordner in einer seiner möglichen Namen vorhanden ist.
        Dim foundExactFolderName As Boolean
        For j = 1 To possibleFolderNamesWithSize.count
            If Globals.folderExists(possibleFolderNamesWithSize(j)) Then
                path = possibleFolderNamesWithSize(j)
                If Not logger Is Nothing Then logger.logINFO "Größe zum Pfad hinzugefügt. Path ist jetzt '" & path & "'"
                foundExactFolderName = True
                Exit For
            Else
                If Not logger Is Nothing Then logger.logINFO "Größenordner exestiert nicht: '" & possibleFolderNamesWithSize(j) & "'"
            End If
        Next j
        
        ' ...
        ' Wenn z.B. nach dem Ordner '23x12' gesucht wird, dieser aber nicht da ist,
        ' dann wird nach dem nächstbesten Ordner gesucht,  der mit '23x12' anfängt.
        ' Z.B: '23x12 (21x10)'
        
        If Not foundExactFolderName Then
            
            ' Wenn der Pfad einen Größenplatzhalter hat (z.B: "V:\Produkte\Gedenktafel\%Größe\Acryl\",
            ' dann muss nach den Größenordnern unter "V:\Produkte\Gedenktafel\" gesucht werden.
            Dim pathTillSizeFolders As String
            If isPathHavingSizePlaceHolder() Then
                pathTillSizeFolders = leftToString(path, SIZE_PLACEHOLDER)
            Else
                pathTillSizeFolders = path
            End If
            
            Dim sizeFolders As collection
            Set sizeFolders = Globals.getFoldersInFolder(pathTillSizeFolders)
            
            If Not logger Is Nothing Then logger.logINFO "Suche nach Ordner mit gleichem Anfang:"
            
            For j = 1 To sizeFolders.count
                Dim currentFolderName As String
                currentFolderName = Globals.getFolderName(sizeFolders(j))
                
                For k = 1 To possibleFolderNamesWithSize.count
                    Dim possibleFolderName As String
                    possibleFolderName = Globals.getFolderName(possibleFolderNamesWithSize(k))
                    
                    If Globals.startsWith(currentFolderName, possibleFolderName) Then
                        path = Globals.addBackslash(path) & currentFolderName
                        If Not logger Is Nothing Then logger.logINFO "- Gefunden! Größe zum Pfad hinzugefügt. Path ist jetzt '" & path & "'"
                        GoTo ExitFor
                    Else
                        If Not logger Is Nothing Then logger.logINFO "- Möglicher Ordner-Namens-Anfang ('" & possibleFolderName & "') passt nicht zu '" & currentFolderName & "'"
                    End If
                Next k
                
            Next j
            
            
            
            ' Wenn bis hierhin der Größenordner nicht gefunden wurde, und das Skript die Suche nach der passenden Größe übernehmen soll,
            ' dann wird nach anderen Größen mit dem selben Seitenverhältnis gesucht und skaliert
            If autoManageSize Then
                
                If Not logger Is Nothing Then logger.logINFO "Suche nach Ordner mit gleichem Seitenverhältnis:"
                
                For i = 1 To sizeFolders.count
                    
                    Dim folderSize As String
                    folderSize = Globals.getSizeFromString(Globals.getFolderName(sizeFolders(i)))
                    
                    ' TODO A4 usw
                    
                    If Not logger Is Nothing Then logger.logINFO "- Vergleiche '" & folderSize & "' mit '" & jsonView.sizeSelection & "' "
                    
                    If Not folderSize = "" Then
                        If Globals.isSizeAspectRatioSame(folderSize, Globals.getSizeFromString(jsonView.sizeSelection)) Then
                            addSizeToPath Globals.getFolderName(sizeFolders(i))
                            If Not logger Is Nothing Then logger.logINFO "- Größenordner mit gleichem Seitenverhältnis gefunden! Größe zum Pfad hinzugefügt: '" & path & "'"
                            usedSameAspectRatioFolder = True
                            GoTo ExitFor
                        End If
                    End If
                    
                Next i
            End If
            
            
            
            
            
            ' Nicht gefunden
            If Not logger Is Nothing Then logger.logFATAL "- Nichts gefunden!"
            Err.Raise vbObjectError + 513, , "[AmazonExcelDesignInfo.setDefaultJSONView] Der Größenordner wurde nicht gefunden: " & path & "\" & jsonView.sizeSelection
ExitFor:
            ' Gefunden
        End If
        
    End If
    
    
    If ignoreDesignOptionSelection Then
        If Not logger Is Nothing Then logger.logINFO "Die Designauswahl wird ignoriert!"
    Else
        Dim designNumberFromExcelOrJSON As Integer
        designNumberFromExcelOrJSON = getDesignNumberFromExcelOrJSON(jsonView)
        
        If Not logger Is Nothing Then logger.logINFO "Design Nummer von der Excel oder der JSON: '" & designNumberFromExcelOrJSON & "'"
        
        If designNumberFromExcelOrJSON = -3 Then
            If Not logger Is Nothing Then logger.logINFO "Keine Designnummer vorhanden. Kann also nicht hinzugefügt werden (Kann normal sein)"
        End If
        
        
        
        ' Wenn kein Designname aus dem Konfi oder der CSV kommt, dann ist der Designname schon in "path" enthalten
        ' Wenn nicht, muss der Designname erst zu "path" hinzugefügt werden
        If Not designNumberFromExcelOrJSON = -3 Then
            path = Globals.getDefaultDesignNameFromDesignsFolder(path, logger)
            If Not logger Is Nothing Then logger.logINFO "Standartdesignordner ist jetzt path: '" & path & "'"
            
            ' -1 Steht für das Standartdesign / Wunschtextdesign
            If Not designNumberFromExcelOrJSON = -1 Then
                path = path & "-D" & designNumberFromExcelOrJSON
                If Not logger Is Nothing Then logger.logINFO "D-Nummer zu path hinzugefügt: '" & path & "'"
            End If
        End If
    End If
    
    
    
    
    If Not logger Is Nothing Then logger.logINFO ""
    If Not logger Is Nothing Then logger.logINFO "Path ist am Ende: '" & path & "'"
    If Not logger Is Nothing Then logger.logINFO ""
    
    ' An diesem Punkt führt der 'path' zum Designordner
    ' Da der Pfad in der Excel zum Produktordner oder aber auch zum Designordner führen kann,
    ' wird dem 'viewInfo.sizeFolder' der Designpfad gegeben
    Set sizeFolder = New FSSizeFolder
    sizeFolder.init , path
    
    Set designFiles = New FSDesignFiles
    designFiles.newDesignFiles sizeFolder, , path
    
    If Not logger Is Nothing Then logger.removeTab
End Function


Private Function addSizeToPath(size As String)
    
    If isPathHavingSizePlaceHolder() Then
        path = replace(path, SIZE_PLACEHOLDER, size)
    Else
        path = Globals.addBackslash(path) & size
    End If
End Function


Private Function isPathHavingSizePlaceHolder() As Boolean
    isPathHavingSizePlaceHolder = InStr(path, SIZE_PLACEHOLDER)
End Function



' Designnummer aus Designnname extrahieren
' Aus 'Hundepfoten D2' wird '2'
Public Function getDesignNumberFromExcelOrJSON(jsonView As AmazonImportJSONView) As Integer
    
    If Not designNumberInitialized Then
        designNumberInitialized = True
        
        Dim designNameToConvert As String
        
        ' :: DesignName aus der Excel
        If Not designName = "" Then
            If designName = "s" Then
                designNumber = CInt(Globals.getDesignNrFromProductID("frei" & designName))
            Else
                designNumber = CInt(Globals.getDesignNrFromProductID("D" & designName)) ' Das D wird benötigt, damit es als Artikelnummer gesehen wird und die D-Nummer extrahiert werden kann
            End If
        
        ' :: Designname aus der JSON
        ElseIf Not jsonView.designName = "" Then
            On Error GoTo NoDesignNr
            designNumber = CInt(Globals.getDesignNrFromProductID(jsonView.designName))
            On Error GoTo 0
            If designNumber = -3 Then
                GoTo NoDesignNr
            End If
        Else
            designNumber = -3 ' Keine D-Nummer
        End If

    End If

    getDesignNumberFromExcelOrJSON = designNumber

    Exit Function
NoDesignNr:
    ' Kein richtiger Error. Aber es soll beim AmazonExport geloggt werden
    Err.Raise vbObjectError + 513, , "[AmazonExcelDesignInfo.getDesignNumberFromExcelOrJSON] Der Designname '" & jsonView.designName & "' aus dem Konfigurator enhält keine Designnummer." & vbNewLine & "Der Konfigurator muss geändert werden! (Ein freies Design scheint es auch nicht zu sein) Fehler: " & vbNewLine & Err.Description
    
End Function



Public Function getViewWithSizeSelection() As AmazonImportJSONView
    
    For i = 1 To getJSONViewsSize
        Dim currentView As AmazonImportJSONView
        Set currentView = getJSONView(i)
        
        If Not currentView.getSizeSelectionWidth = 0 Then
            Set getViewWithSizeSelection = currentView
            Exit Function
        End If
        
        Set currentView = Nothing
    Next i
    
End Function


' Gibt zurück, ob das Design skaliert werden muss, da es in der Excel so hintelegt ist und der Kunde auch wirklich eine Größe ausgewählt hat (Es gibt auch Konfis ohne Größenauswahl)
Public Function isDesignNeedingScaling() As Boolean
    isDesignNeedingScaling = (scaleWidthToSizeSelection Or usedSameAspectRatioFolder Or scaleToWidth = 0)
End Function







