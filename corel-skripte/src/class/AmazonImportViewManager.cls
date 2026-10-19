Attribute VB_Name = "AmazonImportViewManager"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
' Diese Klasse parsed einen Teil der Amazon-JSON, findet die Views darin und speichert sie hier.


' Alle Views aus der JSON. Eine Collection mit AmazonImportJSONView Objekten
Public unsortedJSONViews As New collection

' Alle Optionsgruppen aus allen Views, die der Kunde zur verfügung hatte. Bspw. Größe, Design, Befestigung usw
Public allOptionGroupsOfJSONViews As New collection

' Die Views, die mithilfe der Excelangabe 'View Sortierung' sortiert wurden und jetzt die 'sortedViews' sind. Eine Collection aus AmazonImportSortedView Objekten
Public sortedViews As New collection

Public excelDesignsInfos As collection  ' Enhält AmazonExcelDesignInfo Objekte

Public csvData As Variant
Public amazonJson As AmazonImportJSON

' 'customizationDataChildsAsViews' kommt aus der Amazon-JSON
Public Function newAmazonImportViewManager(amazonJSON_ As AmazonImportJSON, Optional csvData_ As Variant, Optional logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[AmazonImportViewManager.newAmazonImportViewManager]"
    
    Set amazonJson = amazonJSON_
    csvData = csvData_
    
    Dim jsonViewData As AmazonImportJSONView
     ' Alle Views aus der Konfi-JSON durchlaufen
    For i = 0 To amazonJson.getViewCount
        Set jsonViewData = New AmazonImportJSONView
        jsonViewData.newAmazonImportJSONView amazonJson, i, Me, logger
        unsortedJSONViews.add jsonViewData
        
        If Not logger Is Nothing Then logger.logINFO "added jsonViewData #'" & jsonViewData.objectID & "'"
        
        For j = 1 To jsonViewData.optionGroups.count
            allOptionGroupsOfJSONViews.add jsonViewData.optionGroups(j)
'            If Not logger Is Nothing Then logger.logINFO "Optionsgruppe aus jsonViewData hinzugefügt. Optionsgruppe: '" & jsonViewData.optionGroups(j).groupName & "'"
        Next j
        
        Set jsonViewData = Nothing
    Next i

'    sortjsonViewDatas

    
    Set excelDesignsInfos = initExcelDesignInfos(logger)
    
    If Not logger Is Nothing Then logger.removeTab
End Function




' Returnt eine Collection mit 'AmazonExcelDesignInfo'
Private Function initExcelDesignInfos(Optional logger As logger = Nothing) As collection

    If Not logger Is Nothing Then
        logger.logINFO "[AmazonImportViewManager.initExcelDesignInfos] asin: '" & amazonJson.ASIN & "'"
        logger.addTab
    End If
    
    Set initExcelDesignInfos = New collection
    
    
    ' EXCEL LADEN
    ' Es kann sein, dass die Excel schon geladen wurde und an diese Funktion weitergebene wurde,
    ' damit sie bei mehreren Aufrufen dieser Funktion nicht mehrfach geladen wird.
    ' Wenn sie aber nicht geladen ist, wird sie hier geladen
    ' ----------------------------------------------
    If Not IsArray(csvData) Then ' Is Nothing funktioniert hier nicht
        csvData = AmazonImport.loadAmazonASINToDesignCDRExcel(False, logger)
    End If
    ' ----------------------------------------------
    
    
    
    ' ASIN Spaltenindex finden
    Dim csvASINIndex As Integer
    csvASINIndex = AmazonImport.getElementIndexInASINToDesignCDRExcel("ASIN", csvData)
    
    
    
    ' Die 'ASIN' in der Excel 'csvData' suchen
    ' -----------------------------------------------------------------------------------
    If Not logger Is Nothing Then logger.logINFO "Suche nach ASIN in der Excel ... asin: '" & amazonJson.ASIN & "'"
    ' Der Zeilenindex in der Excel in der die ASIN gefunden wurde. Evtl. auch mehrere Indexe falls sich unterhalb von der gefundenen ASIN noch weitere mit einem '>' (an Stelle der ASIN) befinden
    Dim viewCSVIndexies As New collection
    ' Zeile suchen in der die ASIN vorkommt, dort stehen dann alle Infos zur ASIN
    ' Bei Zeile 0 liegen die Titel (z.B: Asin, Datei-Pfad), deshalb bei 1 anfangen
    For i = 0 To UBound(csvData)
        
        If csvData(i, csvASINIndex) = amazonJson.ASIN Then
            
            viewCSVIndexies.add i
            
            ' Gucken, ob weitere Views unterhalb von dieser ASIN verlinkt sind (Im Feld für die ASIN)
            For j = i + 1 To UBound(csvData)
                ' Wenn die nächste Zeile unterhalb der jetztigen ASIN 1 Zeichen enthält und es ein ">" ist,
                ' dann ist es die Anweisung dafür, dass noch ein weiteres Design zu dem Konfi/zu der ASIN gehört
                If Len(csvData(j, csvASINIndex)) = 1 And Globals.startsWith((csvData(j, csvASINIndex)), ">") Then
                    viewCSVIndexies.add j
                Else
                    Exit For
                End If
                
            Next j
            
            If Not logger Is Nothing Then logger.logINFO "ASIN gefunden!"
            Exit For
        End If
    Next i
    ' -----------------------------------------------------------------------------------
    
    
    
    ' Excelzeilen ohne passende View in der JSON entfernen
    ' -----------------------------------------------------------------------------------
    ' Amazon schickt nur die Views mit, die der Kunde aktiviert hat (z.B: "Nein, nur das Radiergummi bestellen" -> Lineal-View fehlt).
    ' Ohne diesen Filter würden die folgenden Excelzeilen um eine View verrutschen (Lineal-Design mit den Daten der Stiftehalter-View)
    ' Bei 'isFromASIN' gibt es keine echten Views, deshalb dort nicht filtern
    If Not amazonJson.isFromASIN Then
        Set viewCSVIndexies = filterCSVIndexiesByViewName(viewCSVIndexies, logger)
    End If
    ' -----------------------------------------------------------------------------------
    
    
    
    If Not viewCSVIndexies.count = 0 Then
        For i = 1 To viewCSVIndexies.count
        
            Dim excelDesignInfo As New AmazonExcelDesignInfo
            excelDesignInfo.newAmazonExcelDesignInfo Me, viewCSVIndexies(i), csvData, logger
            initExcelDesignInfos.add excelDesignInfo
            Set excelDesignInfo = Nothing
            
        Next i
    Else
        Dim errorMsg As String
        errorMsg = "Das Produkt wird noch nicht unterstützt!" & vbNewLine & "Die ASIN '" & amazonJson.ASIN & "' konnte zu keinem Design zugeordnet werden."
        If Not logger Is Nothing Then logger.logFATAL errorMsg
        MsgBox errorMsg, vbCritical
        Globals.endMacro
    End If
    
    
    If Not logger Is Nothing Then logger.removeTab
End Function


' Gibt nur die Excelzeilen aus 'csvIndexies' zurück, deren 'View-Name' als View in der JSON vorkommt
' Zeilen ohne Eintrag in 'View-Name' bleiben erhalten und werden weiterhin der Reihe nach den Views zugeordnet
Private Function filterCSVIndexiesByViewName(csvIndexies As collection, Optional logger As logger) As collection
    
    Set filterCSVIndexiesByViewName = New collection
    
    ' Die Spalte ist optional (z.B: ältere Debug-Excel), deshalb ohne Fehlermeldung suchen (-1 = nicht vorhanden)
    Dim csvViewNameIndex As Integer
    csvViewNameIndex = Globals.getElementIndexIn2DArrayHeader("View-Name", csvData)
    
    Dim i As Integer
    For i = 1 To csvIndexies.count
        Dim csvViewName As String
        csvViewName = ""
        If csvViewNameIndex > -1 Then csvViewName = Trim(csvData(csvIndexies(i), csvViewNameIndex))
        
        If csvViewName = "" Or hasUnsortedJSONViewWithName(csvViewName) Then
            filterCSVIndexiesByViewName.add csvIndexies(i)
        Else
            If Not logger Is Nothing Then logger.logINFO "Excelzeile '" & csvIndexies(i) & "' übersprungen. Die View '" & csvViewName & "' gibt es nicht in der JSON (vom Kunden nicht ausgewählt)"
        End If
    Next i
End Function


Private Function hasUnsortedJSONViewWithName(viewName As String) As Boolean
    hasUnsortedJSONViewWithName = Not getUnsortedJSONViewByName(viewName) Is Nothing
End Function


Public Function getUnsortedJSONViewByName(viewName As String) As AmazonImportJSONView
    Dim i As Integer
    For i = 1 To unsortedJSONViews.count
        If StrComp(Trim(getUnsortedJSONView(i).viewName), viewName, vbTextCompare) = 0 Then
            Set getUnsortedJSONViewByName = getUnsortedJSONView(i)
            Exit Function
        End If
    Next i
End Function


' Gibt den Eintrag der Spalte 'View-Name' einer Excelzeile zurück. Leer, wenn nicht eingetragen oder die Spalte fehlt
Public Function getCSVViewName(csvIndex As Integer) As String
    ' Die Spalte ist optional (z.B: ältere Debug-Excel), deshalb ohne Fehlermeldung suchen (-1 = nicht vorhanden)
    Dim csvViewNameIndex As Integer
    csvViewNameIndex = Globals.getElementIndexIn2DArrayHeader("View-Name", csvData)
    
    If csvViewNameIndex > -1 Then getCSVViewName = Trim(csvData(csvIndex, csvViewNameIndex))
End Function


' Initialisiert die Excelinfos ab der zweiten Zeile schon jetzt mit ihrer JSON-View, damit für jede View eine Schablone gefunden werden kann.
' (Die erste Excelinfo wird separat initialisiert)
' Das geht nur über den 'View-Name' aus der Excel. Eine Zuordnung nur über die Reihenfolge wäre unsicher,
' da ein Design auch mehrere Views belegen kann. Zeilen ohne 'View-Name' werden erst beim Laden der Designs initialisiert
Public Function initExcelDesignInfosByViewName(Optional logger As logger)

    If Not logger Is Nothing Then logger.addTab , "[AmazonImportViewManager.initExcelDesignInfosByViewName]"

    Dim i As Integer
    For i = 2 To excelDesignsInfos.count
        Dim excelInfo As AmazonExcelDesignInfo
        Set excelInfo = getExcelDesignsInfo(i)
        
        Dim csvViewName As String
        csvViewName = getCSVViewName(excelInfo.csvIndex)
        
        If Not csvViewName = "" And Not excelInfo.isDefaultJSONViewSet Then
            Dim jsonView As AmazonImportJSONView
            Set jsonView = getUnsortedJSONViewByName(csvViewName)
            
            If Not jsonView Is Nothing Then
                If Not logger Is Nothing Then logger.logINFO "Excelzeile '" & excelInfo.csvIndex & "' wird mit der JSON-View '" & csvViewName & "' initialisiert"
                excelInfo.setDefaultJSONView jsonView, logger
            End If
            
            Set jsonView = Nothing
        End If
        
        Set excelInfo = Nothing
    Next i
    
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function getFirstExcelDesignsInfo() As AmazonExcelDesignInfo
    Set getFirstExcelDesignsInfo = getExcelDesignsInfo(1)
End Function


Public Function getExcelDesignsInfo(index As Integer) As AmazonExcelDesignInfo
    Set getExcelDesignsInfo = excelDesignsInfos(index)
End Function


' Views der Amazon-Daten umsortieren
' Hat man z.B.
' - 3 Views aus der Amazon-JSON
' - Folgende Umsortierung: "01:01|02:01|03:03"
' Dann ist 'views':
' views
'  - Import-View 1
'      - JSON-View 1
'      - JSON-View 2
'  - Import-View 2
'      - JSON-View 3
Public Function sortViewDatas(firstExcelDesignInfo As AmazonExcelDesignInfo, Optional logger As logger)

    If Not logger Is Nothing Then logger.addTab , "[AmazonImportViewManager.sortViewDatas]"
    
    
    ' Die Sortierinfos werden nur vom Eintrag der ersten View aus der EWxcel genutzt, da es pro Produkt nur eine Sortierung der Views gibt
'    Dim firstView As AmazonImportJSONView
'    Set firstView = unsortedJSONViews(1)

    ' Wenn in der Excel keine Anweisung zum umsortieren der Views vorhanden sind
    If firstExcelDesignInfo.viewSortInstruction = "" Then

        ' Jede View aus der JSON wird auch eine View in Coreldraw
        For i = 1 To unsortedJSONViews.count
            Dim sortedView As AmazonImportSortedView
            Set sortedView = addNewSortedView
            
            sortedView.addJSONView getUnsortedJSONView(i), logger
            
            Set sortedView = Nothing
        Next i

    Else
        ' Hier werden Viewdaten aus der JSON umsortiert.
        ' Dazu wird der Eintrag aus der Amazon-Excel genutzt.
        ' Dabei können auch mehrere Views kombiniert werden
        ' Das hat den Vorteil, dass 2 Designs innerhalb einer View sein können
        ' Oder aber dass 2 Parts von einem Design auf 2 Views aufgeteilt sein können
        Dim viewSortInstructions() As String
        viewSortInstructions = Split(firstExcelDesignInfo.viewSortInstruction, "|")
        
        For i = LBound(viewSortInstructions) To UBound(viewSortInstructions)

            Dim sortInstruction() As String
            sortInstruction = Split(viewSortInstructions(i), ":") ' In der Excel steht evtl. nicht einfach 1:2 sondern 01:02, damit es von Excel nicht als Datum interpretiert wird
            Dim sortViewFrom As Integer
            sortViewFrom = sortInstruction(0)
            Dim sortViewTo As Integer
            sortViewTo = sortInstruction(1)

            ' Wenn 0 angebeben wurde, heißt es die View soll ignoriert werden
            If Not sortViewTo = 0 Then

                ' Sicherstellen, dass es genügend Fächer gibt
                While sortedViews.count < sortViewTo
                    addNewSortedView
                Wend

                sortedViews(sortViewTo).addJSONView unsortedJSONViews(sortViewFrom), logger

            End If
        Next i
    End If
    
    If Not logger Is Nothing Then logger.removeTab
End Function


' Helper
Private Function addNewSortedView() As AmazonImportSortedView
    Dim sortedView As New AmazonImportSortedView
    sortedViews.add sortedView

    Set addNewSortedView = sortedView
End Function


Public Function getSortedViewCount() As Integer
    getSortedViewCount = sortedViews.count
End Function

Public Function getSortedView(ByVal index As Integer) As AmazonImportSortedView
    Set getSortedView = sortedViews.item(index)
End Function


' Teilt die Parts zu einzelnen Views auf
Public Function addDesign(design As productDesign, excelDesignInfo As AmazonExcelDesignInfo, partToViewInstruction As ConfiPartToViewSortInstruction, Optional logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[AmazonImportViewManager.addDesign]"
    
    ' Views der Instruction durchlaufen
    For i = 1 To partToViewInstruction.getViewsCount
        
        If Not logger Is Nothing Then logger.logFINE "View i: '" & i & "'"
        
        If Not partToViewInstruction.isViewHavingParts(i) Then
            GoTo NextI
        End If
        
        ' Da die 'partToViewInstruction' Infos von 4 Parts enthält (da dies die maximal unterstütze Anzahl ist, egal ob das Design so viele Parts hat),
        ' muss geprüft werden, ob wir bei einer View von 'partToViewInstruction' angekommen sind,
        ' wo schon ein Partindex ist den das Design nicht hat
        '
        ' Wenn wir folgende Daten haben:
        ' partToViewInstruction:
        ' - View 1:
        '   - Part 1
        '   - Part 2
        ' - View 2:
        '   - Leer
        ' - View 3:
        '   - Part 3
        ' - View 4:
        '   - Part 4
        '
        ' Design:
        ' - Part 1
        ' - Part 2
        '
        ' Dann würen wir bei View 3 sehen, dass das Design kein Part 3 hat
        ' Part 3 > design.getPartsCount (2)
        For j = 1 To partToViewInstruction.getView(i).count
            If Not logger Is Nothing Then logger.logFINE "- Part #'" & j & "' mit dem partIndex: '" & partToViewInstruction.getView(i)(j) & "' in der aktuellen View"
            If partToViewInstruction.getView(i)(j) > design.getPartsCount Then
                If Not logger Is Nothing Then logger.logFINE "  - Part mit dem partIndex'" & partToViewInstruction.getView(i)(j) & "' gibt es nicht im Design. Design hat nur '" & design.getPartsCount & "' parts. Überspringen"
                GoTo NextI
            End If
        Next j
        
        Dim jsonViewData As AmazonImportJSONView
        Set jsonViewData = getNextFreeJSONViewData
        
        If Not jsonViewData Is Nothing Then
            Set jsonViewData.excelDesignInfo = excelDesignInfo
            
            ' Parts aus der Instruction durchlaufen
            For p = 1 To partToViewInstruction.getView(i).count
                jsonViewData.addPart design.getPart(partToViewInstruction.getView(i)(p)), logger
            Next p
            
            excelDesignInfo.addJSONView jsonViewData
            
            If Not logger Is Nothing Then
                jsonViewData.debugPrint logger
            End If
        End If
        
        Set jsonViewData = Nothing
NextI:
    Next i
    
    
    
    ' Da es jetzt neue Designparts gibt, müssen die Sortedviews aktualisiert werden
    invalidateSortedViews logger
    
    
    excelDesignInfo.translatePath True, logger
    
    If Not logger Is Nothing Then logger.logINFO "unsortedJSONViews.item(1).getPartsCount: " & unsortedJSONViews.item(1).getPartsCount
    
    If Not logger Is Nothing Then logger.removeTab
End Function


' Helper
Public Function getNextFreeJSONViewData(Optional logger As logger) As AmazonImportJSONView
    
    If Not logger Is Nothing Then logger.addTab , "[AmazonImportViewManager.getNextFreeJSONViewData]"
    If Not logger Is Nothing Then logger.logINFO "sortedViews.count: " & sortedViews.count
    
    
    For i = 1 To sortedViews.count
        Dim currentSortedView As AmazonImportSortedView
        Set currentSortedView = sortedViews(i)
        
        If Not logger Is Nothing Then logger.logINFO "currentSortedView.getJSONViewDataCount: " & currentSortedView.getJSONViewDataCount
        
        For j = 1 To currentSortedView.getJSONViewDataCount
            Dim currentJSONView As AmazonImportJSONView
            Set currentJSONView = currentSortedView.getJSONViewData(j)
            
            If currentJSONView.excelDesignInfo Is Nothing Then
                Set getNextFreeJSONViewData = currentJSONView
                GoTo ExitFunction
            End If
            
            Set currentJSONView = Nothing
        Next j
        
        Set currentSortedView = Nothing
    Next i
    
ExitFunction:
    If Not logger Is Nothing Then
        logger.logINFO "Returne " & IIf(getNextFreeJSONViewData Is Nothing, "Nothing", "AmazonImportJSONView")
        logger.removeTab
    End If
End Function


Public Function hasFreeJSONView() As Boolean
    hasFreeJSONView = Not getNextFreeJSONViewData Is Nothing
End Function


' Gibt die nächst freie 'sortedView' wieder, in der noch kein Part von einem Design hinzugefügt wurde
Public Function getNextFreeSortedView(Optional logger As logger) As AmazonImportSortedView
    
    If Not logger Is Nothing Then logger.addTab , "[AmazonImportViewManager.getNextFreeSortedView]"
    
    For i = 1 To sortedViews.count
        Dim currentView As AmazonImportSortedView
        Set currentView = sortedViews(i)
        
        ' Loggen
        currentView.getParts logger
        
        If currentView.getParts.count = 0 Then
            Set getNextFreeSortedView = currentView
            GoTo ExitFunction
        End If
        
        Set currentView = Nothing
    Next i
    
    
ExitFunction:
    If Not logger Is Nothing Then
        If getNextFreeSortedView Is Nothing Then
            logger.logINFO "Returne Nothing"
        Else
            logger.logINFO "Returne vvvvv"
            getNextFreeSortedView.debugPrint logger
        End If
        logger.removeTab
    End If
End Function


Public Function hasFreeSortedView(Optional logger As logger) As Boolean
    If Not logger Is Nothing Then logger.addTab , "[AmazonImportViewManager.hasFreeSortedView]"
    hasFreeSortedView = Not getNextFreeSortedView(logger) Is Nothing
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function warnIfHasFreeSortedView(Optional logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[AmazonImportViewManager.warnIfHasFreeSortedView]"
    
    If hasFreeSortedView(logger) Then
        Dim notEnoughPartsErrorMessage As String
        notEnoughPartsErrorMessage = "Die Designs haben nicht so viele Parts wie es Views im Konfi gibt."

        AmazonImport.logError notEnoughPartsErrorMessage
        If Not logger Is Nothing Then logger.logFATAL notEnoughPartsErrorMessage
        MsgBox notEnoughPartsErrorMessage, vbCritical
        Globals.endMacro
    End If
    
    If Not logger Is Nothing Then logger.removeTab
End Function



Public Function invalidateSortedViews(Optional logger As logger)
    For i = 1 To sortedViews.count
        Dim sortedView As AmazonImportSortedView
        Set sortedView = sortedViews(i)
        
        sortedView.invalidateAll logger
        
        Set sortedView = Nothing
    Next i
End Function


Public Function invalidateSortedViewsParts(Optional logger As logger)
    For i = 1 To sortedViews.count
        Dim sortedView As AmazonImportSortedView
        Set sortedView = sortedViews(i)
        
        sortedView.invalidateParts logger
        
        Set sortedView = Nothing
    Next i
End Function


Public Function getQuantity() As Integer
    
    getQuantity = 1
    
    For i = 1 To unsortedJSONViews.count
        If getUnsortedJSONView(i).quantity > 1 Then
            getQuantity = getUnsortedJSONView(i).quantity
            Exit Function
        End If
    Next i
    
End Function


Public Function getUnsortedJSONView(ByVal index As Integer) As AmazonImportJSONView
    Set getUnsortedJSONView = unsortedJSONViews(index)
End Function


Public Function debugPrint(logger As logger)
    logger.addTab , "[AmazonImportViewManager.debugPrint]"
    logger.logINFO "sortedViews.count: " & sortedViews.count
    For i = 1 To sortedViews.count
        logger.logINFO "Sorted View " & i & ":"
        sortedViews(i).debugPrint logger
    Next i
    logger.removeTab
End Function
