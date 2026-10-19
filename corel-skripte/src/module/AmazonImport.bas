Attribute VB_Name = "AmazonImport"
Option Explicit

' Autor: Martin Afelt GRAVURU
'

Private Declare PtrSafe Function CreateCompatibleDC Lib "gdi32" (ByVal hdc As LongPtr) As LongPtr
Private Declare PtrSafe Function DeleteDC Lib "gdi32" (ByVal hdc As LongPtr) As Long
Private Declare PtrSafe Function SelectObject Lib "gdi32" (ByVal hdc As LongPtr, ByVal hObject As LongPtr) As LongPtr
Private Declare PtrSafe Function DeleteObject Lib "gdi32" (ByVal hObject As LongPtr) As Long
Private Declare PtrSafe Function CreateFontW Lib "gdi32" ( _
    ByVal nHeight As Long, ByVal nWidth As Long, ByVal nEscapement As Long, ByVal nOrientation As Long, _
    ByVal fnWeight As Long, ByVal fdwItalic As Long, ByVal fdwUnderline As Long, ByVal fdwStrikeOut As Long, _
    ByVal fdwCharSet As Long, ByVal fdwOutputPrecision As Long, ByVal fdwClipPrecision As Long, _
    ByVal fdwQuality As Long, ByVal fdwPitchAndFamily As Long, ByVal lpszFace As LongPtr) As LongPtr
Private Declare PtrSafe Function GetGlyphIndicesW Lib "gdi32" ( _
    ByVal hdc As LongPtr, ByVal lpstr As LongPtr, ByVal c As Long, ByVal pgi As LongPtr, ByVal fl As Long) As Long

Private Const GGI_MARK_NONEXISTING_GLYPHS As Long = &H1
Private Const DEFAULT_CHARSET As Long = 1
Private Const OUT_DEFAULT_PRECIS As Long = 0
Private Const CLIP_DEFAULT_PRECIS As Long = 0
Private Const DEFAULT_QUALITY As Long = 0
Private Const DEFAULT_PITCH As Long = 0


Public Const AMAZON_JSON_VERSION_SUPPORTED = "3.0"
Dim supportedAmazonJSONVersion As Version

Dim logger As New logger

Dim amazonJson As AmazonImportJSON
Dim asinToCdrExcelList() As String

Dim KonfiType As Integer
' Jeder Fehler, der beim Import der aktuellen ASIN passiert, wird hier als String gespeichert und erst am Ende angezeigt
Dim ASINErrorList As collection

Dim viewManager As AmazonImportViewManager
'Dim amazonImportViewDatasSorted As collection ' Beinhaltet Collections, die 'AmazonImportViewDatas' enthalten


Dim scaleSetting As Double ' Wie weit musste das Produkt herunterskaliert werden, um in den Konfi zu passen
Dim paddingXKonfi As Double
Dim paddingYKonfi As Double

Dim uploadBoxes As shapeRange

Dim p_dummyText As shape
Dim dummyDocument As document

Dim paths As collection

' Alle geöffneten Schablonen dieses Imports. Schablonenpfad -> AmazonImportTemplate
' Jede View/Design-CDR kann seine eigene Schablone haben (siehe 'AmazonExcelDesignInfo.template')
Dim openTemplates As Dictionary

' Das Dokument, in das die Designs ohne Schablone der aktuellen Bestellung (Run) geladen werden. Nothing = alle Designs haben eine Schablone
' (Designs mit Schablone werden direkt in das Dokument ihrer Schablone geladen)
Dim runWorkDoc As document

Const ROTATION_MINIMUM = 2.5 ' In Grad. Beschreibt, ab welchem Wert die Drehung des Kunden-Textes, beachtet werden. Eine minimale Drehung wird also ignoriert
Const ROTATION_MINIMUM_IMAGES = 5# ' In Grad. Beschreibt, ab welchem Wert die Drehung des Kunden-Fotos, beachtet werden. Eine minimale Drehung wird also ignoriert

Const ZERO_WIDTH_SPACE_UNICODE As Long = &H200B

Const CURRENT_DOKUMENT_TEMPLATE_NAME = "Aktuelles Dokument"
Const NO_TEMPLATE_NAME = "Ohne Schablone"

Dim amazonFontsAliasse() As String


' Name: gravuru
' Email: buchhaltung@gravuru.de
Const tinyURLToken = "NbnRD8QIXMeMisdEPnnmcdIHnU8bxKiN6JhWeK8YjYzUvXVGFRr8BKt0HgDO"


Private Function getDummyText() As shape
    
'    logger.addTab , "[AmazonImport.getDummyText]"
    

    ' Da es sein kann, dass mehrere ZIPs oder Schablonen geladen werden, werden auch immer wieder neue Dokumente erstellt.
    ' Haben wir ein neues Dokument, muss da der dummyText auch wieder neu erstellt werden
    ' Deshalb geht die Referenz zum dummyText vom vorherigen Dokument/Design/ZIP verloren, wenn es nicht im aktuellen Dokument ist ???
    ' (Variablen usw vom Objekt werden ungültig/Nothing. Das Objekt selbst aber nicht)
    ' --------------------------------------------
'    deleteDummyText
    ' --------------------------------------------
    
    
    ' Dummytext erstellen wenn noch nicht voehanden im aktuellen Dokument ( bzw. bei der aktuellen Schablone oder dem aktuellen Design / ZIP)
    ' ---------------------------------------------
    If p_dummyText Is Nothing Then
        Set p_dummyText = ActiveDocument.ActiveLayer.CreateArtisticText(0, 0, "Test")
        
        p_dummyText.name = "Dummy-Text"
        
'        logger.logINFO "Dummytexte insgesammt : " & ActivePage.shapes.FindShapes("Dummy-Text").count
    End If
    
    Set getDummyText = p_dummyText
    ' ---------------------------------------------
    
'    logger.removeTab
End Function


Private Function deleteDummyText()
    logger.addTab , "[AmazonImport.deleteDummyText]"
    
    ' Darf auf keinen Fall vor der Fehleranzeige stehen, da es das Fehlertobjekt 'Err' löscht und dann nur ein leerer Fehler angezeigt wird
    If Not p_dummyText Is Nothing Then
'        If Not Globals.isShapeReferenceValid(p_dummyText) Then
            On Error Resume Next
            p_dummyText.delete
            On Error GoTo 0
            Set p_dummyText = Nothing
            logger.logINFO "p_dummyText.delete"
'        End If
        
        
        logger.logINFO "Dummytexte übrig nach dem löschen : " & ActivePage.shapes.FindShapes("Dummy-Text").count
    End If
    
    logger.removeTab
End Function


Public Sub Show()
    
    ' Mit STRG wird statt einer Bestellung (ZIP/JSON) nur eine ASIN geladen. Für Produkte ohne Anpassungen
    ' Muss vor allem anderen abgefragt werden, da die Taste sonst evtl. schon losgelassen wurde
    Dim loadFromASIN As Boolean
    loadFromASIN = Globals.isCTRLPressed
    
    Globals.checkIfServerOnlineAndSelectOfflineWorkPath
    Globals.checkVersion

    If loadFromASIN Then
        Dim ASIN As String
        ASIN = UCase(Trim(InputBox("ASIN eingeben:", "AmazonImport per ASIN")))
        
        ' Abbrechen oder leere Eingabe
        If ASIN = "" Then Exit Sub
        
        If Not isASINValid(ASIN) Then
            MsgBox "Ungültige ASIN: '" & ASIN & "'" & vbNewLine & "Eine ASIN besteht aus 10 Buchstaben und Zahlen. Z.B: B0CMDB5WLH", vbExclamation
            Exit Sub
        End If
        
        Start New collection, ASIN
        Exit Sub
    End If
    
    ' Dialog vorerst deaktiviert, da nur ein Button für einen FileChooser vorhanden ist. Unten wird einfach nur der FileChooser geöffnet. Spart 1 klick
'    AmazonImportDialog.Show vbModal
    
    Dim paths2 As collection
    Set paths2 = AmazonImportDialog.chooseFile
    
    If Not paths2.count = 0 Then
        Start paths2
    End If
    
End Sub



' 'ASIN': Wenn angegeben, wird keine Bestellung aus 'paths_' geladen, sondern nur das Design zur ASIN (ohne Kundenanpassungen)
Public Function Start(paths_ As collection, Optional ASIN As String = "")

    Globals.startMacro
    If Not Globals.debugErrors Then On Error GoTo MacroError
    
    startFunction paths_, GlobalSettingsUserForm.getSetting_AmazonImportGravingModeEnabled, GlobalSettingsUserForm.getSetting_AmazonImportPrintModeEnabled, ASIN
    
    GoTo Finally
MacroError:
    Dim errorDescription As String
    errorDescription = Err.Description ' Fehler Description kann nur einmal extrahiert werden
    
    logError errorDescription
    
    MsgBox "Fehler: " & errorDescription, vbCritical
    
Finally:
    cleanUp
    ProgressBarUserForm.Hide
    showErrors
    Globals.endMacro True
End Function





Public Function startFunction(paths_ As collection, forGraving As Boolean, forPrint As Boolean, Optional ASIN As String = "")
    
     Set paths = paths_
    
    logger.init "AmazonImport"
    logger.logINFO "AmazonImport Start "
    If ASIN = "" Then
        logger.logINFO "Pfade: " & vbNewLine & Globals.collectionToMultiLineStr(paths, "'", "'")
    Else
        logger.logINFO "Lade nur anhand der ASIN (ohne ZIP/JSON): '" & ASIN & "'"
    End If
    
    Set ASINErrorList = New collection
    
    Dim useDebugExcel As Boolean
    If paths.count > 0 Then
        If InStr(paths.item(1), "Unittest") Then
            useDebugExcel = True
            logger.logWARN "Unittest Excel wird genutzt!"
        End If
    End If
    
    
    logger.logINFO "Lade 'Amazon-Import ASIN zu Design-CDR.csv'"
    asinToCdrExcelList = AmazonImport.loadAmazonASINToDesignCDRExcel(useDebugExcel, logger)
    logger.logINFO "- Erfolgreich geladen!"
    
    
    amazonFontsAliasse = Globals.loadCSVToStringArray(Globals.getMainFolder & "Amazon Import\Schiften Aliasse.csv")
    
    ' Wegen der QR-Codes muss immer ein Dokument vor dem Import geöffnet sein, da sonst das Eigenschaften-Fenster für die QR-Codes erst initialisiert werden muss
    ' Dadurch kann aber dann kein QR-Code abgeändert werden
    If ActivePage Is Nothing Then
        Set dummyDocument = Application.CreateDocument
        logger.logINFO "Leeres Dokument erstellt, damit das Eigenschaften-Fenster initialisiert wird und QR-Codes vom Skript im Eigenschaften-Fenster geändert werden können"
    End If
    
    
    ' Bestellungen nach Datum sortieren
    If paths.count > 1 Then
        Globals.sortFilesOrFoldersByCreationDate paths
    End If
    
    
    ' Unzip Ordner leeren
    ' Denn wenn beim letzen mal ein Fehler aufgetuacht ist, kann es sein, dass noch eine alter Bestell Ordner einer ZIP drin ist, dei gelich wieder geöffnet wird
    ' Wenn das passiert, und die Zip ein zweites mal entpackt werden möchte, fragt Windows, ob man die Dateien überschreiben will (nicht schön)
    Globals.deleteFolderContents Globals.getTempUnzipFolder
    
    
    Dim progress As SubProgress
    Set progress = ProgressBarUserForm.newSubProgress(2)
    
    Dim jsonRuns As New AmazonImportJSONRunRange
    If ASIN = "" Then
        jsonRuns.init paths, asinToCdrExcelList, logger
    Else
        jsonRuns.initFromASIN ASIN, asinToCdrExcelList, logger
    End If
    
    progress.setStepsProgress 1
    
    

    ' Schablone managen
    manageTemplateLoad jsonRuns, forGraving, forPrint
    
    
    
    
    With ProgressBarUserForm.newSubProgress(jsonRuns.count)
        Dim i As Integer
        For i = 1 To jsonRuns.count
            Dim currRun As AmazonImportJSONRun
            Set currRun = jsonRuns.item(i)
            
            If currRun.amazonJson.isFromASIN Then
                .setDisplayText "ASIN: " & currRun.amazonJson.ASIN
            Else
                .setDisplayText "Bestellung: " & currRun.amazonJson.orderID
            End If
            
            processJsonRun currRun
            
            ' Das Dokument mit den Designs ohne Schablone aufräumen (Schablonen werden am Ende aufgeräumt)
            If Not runWorkDoc Is Nothing Then
                runWorkDoc.Activate
                cleanUpDocument
            End If
            
            Set currRun = Nothing
            .setStepsProgress i
        Next i
        .finishProgress
    End With
    
    progress.setStepsProgress 2
    
    manageTemplateDocCleanup
    
    
    ' Entpackte Ordner löschen
    jsonRuns.deleteUnzippedFolders
    
    
    ' Falls das Script ein zweites mal aufgerufen(angeklickt) wird,
    ' wird ein frischer Start benötigt
    Set openTemplates = Nothing
    Set runWorkDoc = Nothing
    Set paths = Nothing
    
    progress.finishProgress
    
End Function



Private Function manageTemplateDocCleanup()
    If openTemplates Is Nothing Then Exit Function
    
    ' Alle Schablonen aufräumen, die genutzt wurden
    Dim templateKey As Variant
    For Each templateKey In openTemplates.keys
        
        Dim currTemplate As AmazonImportTemplate
        Set currTemplate = openTemplates(templateKey)
        
        ' 'cleanUpDocument' arbeitet mit dem aktiven Dokument
        currTemplate.doc.Activate
        
        ' Vorschaubilder gruppieren
        ' ---------------------------------------------------
        Dim designPreviewImages As shapeRange
        Set designPreviewImages = newCustomShapeTypeQuery(currTemplate.doc.ActiveLayer.shapes.All, AmazonImportPreviewImageShapeType).search
        
        Globals.setShapeRangeVisible designPreviewImages, False
        ' ---------------------------------------------------
        
        ' Kunden-Anmerkungen gruppieren
        ' ---------------------------------------------------
        Dim customerNotes As shapeRange
        Set customerNotes = currTemplate.doc.ActiveLayer.shapes.FindShapes("Kunden-Anmerkung")
        
        If Not customerNotes.count = 0 Then
            Dim groupedCustomerNotes As shape
            Set groupedCustomerNotes = Globals.groupShapes(customerNotes)
            groupedCustomerNotes.name = "Kunden-Anmerkung"
            groupedCustomerNotes.OrderFrontOf currTemplate.doc.ActiveLayer.shapes.First
        End If
        ' ---------------------------------------------------
        
        cleanUpDocument currTemplate
        
        Set designPreviewImages = Nothing
        Set customerNotes = Nothing
        Set groupedCustomerNotes = Nothing
        Set currTemplate = Nothing
    Next templateKey
End Function


' Prüft für jede View/Design-CDR der gewählten Bestellungen, ob es Schablonen gibt und blendet ein Dialogfeld zum Auswählen ein.
' Views mit den gleichen möglichen Schablonen (z.B: die Stiftehalter aus mehreren Bestellungen) werden nur einmal abgefragt.
' Die gewählte Schablone wird in 'AmazonExcelDesignInfo.template' gespeichert
Private Function manageTemplateLoad(jsonRuns As AmazonImportJSONRunRange, forGraving As Boolean, forPrint As Boolean)
    
    Set openTemplates = New Dictionary
    
    ' Muss vor dem Öffnen der ersten Schablone gemerkt werden, da sich dadurch das aktive Dokument ändert
    Dim activeDocIsTemplate As Boolean
    activeDocIsTemplate = isActiveDocTemplate
    Dim docBeforeImport As document
    Set docBeforeImport = ActiveDocument
    
    Dim i As Integer
    Dim j As Integer
    Dim currTemplate As AmazonImportTemplate
    
    
    ' Excelinfos (Views) nach ihren möglichen Schablonen gruppieren
    ' -------------------------------------------------
    Dim groupedExcelInfos As New Dictionary     ' Schlüssel aus den Schablonenpfaden -> Collection mit AmazonExcelDesignInfo
    Dim groupedCandidatePaths As New Dictionary ' Schlüssel aus den Schablonenpfaden -> ArrayList mit den Schablonenpfaden
    
    For i = 1 To jsonRuns.count
        For j = 1 To jsonRuns.item(i).viewManager.excelDesignsInfos.count
            Dim excelInfo As AmazonExcelDesignInfo
            Set excelInfo = jsonRuns.item(i).viewManager.getExcelDesignsInfo(j)
            
            Dim candidatePaths As ArrayList
            Set candidatePaths = excelInfo.getTemplateCandidatePaths(forGraving, forPrint, logger)
            
            Dim groupKey As String
            groupKey = candidatePaths.toString("|")
            
            If Not groupedExcelInfos.Exists(groupKey) Then
                groupedExcelInfos.add groupKey, New collection
                groupedCandidatePaths.add groupKey, candidatePaths
            End If
            groupedExcelInfos(groupKey).add excelInfo
            
            Set candidatePaths = Nothing
            Set excelInfo = Nothing
        Next j
    Next i
    ' -------------------------------------------------
    
    
    ' Pro Gruppe eine Schablone auswählen lassen
    ' -------------------------------------------------
    Dim groupKeyVar As Variant
    For Each groupKeyVar In groupedExcelInfos.keys
        
        Dim groupExcelInfos As collection
        Set groupExcelInfos = groupedExcelInfos(groupKeyVar)
        
        Dim templatePaths As ArrayList
        Set templatePaths = groupedCandidatePaths(groupKeyVar).clone
        
        Dim templateNames As ArrayList
        Set templateNames = templatePaths.ToFileNameList
        
        ' Welche Option soll vorausgewählt sein im Dialogfenster, welcher gleich erscheint
        Dim selectedIndex As Integer
        selectedIndex = 0
        
        ' Wenn das offene Dokument eine Schablone ist,
        ' "Aktuelles Dokument" als Option hinzufügen
        If activeDocIsTemplate Then
            templatePaths.add CURRENT_DOKUMENT_TEMPLATE_NAME
            templateNames.add CURRENT_DOKUMENT_TEMPLATE_NAME
            
            ' Wenn das offene Dokument eine Schablone ist, das als beste Option auswählen
            ' (Macht am meisten Sinn in der bereits offenen Schablone zu arbeiten)
            selectedIndex = templateNames.count
        End If
        
        ' Wenn es für diese Views keine Schablonen zur Auswahl gibt und auch das jetzige Dokument keine Schablone ist, ohne Schablone importieren
        If templatePaths.count = 0 Then GoTo NextGroup
        
        ' "Ohne Schablone" als Option hinzufügen
        templatePaths.Insert 1, NO_TEMPLATE_NAME
        templateNames.Insert 1, NO_TEMPLATE_NAME
        
        Dim selectedTemplatePath As String
        selectedTemplatePath = AmazonImportTemplateDialog.showDialog(templateNames, templatePaths, _
            "Es sind Schablonen vorhanden." & vbNewLine & "Wähle eine Schablone für " & getViewNamesText(groupExcelInfos) & " aus." & vbNewLine & "Bestellungen ausgewählt: " & jsonRuns.count, _
            "Schablone wählen", selectedIndex)
        
        ' Wenn der User auf Abbrechen geklickt hat
        If selectedTemplatePath = "" Then Globals.endMacro
        
        ' Keine Schablone ausgewählt
        If selectedTemplatePath = NO_TEMPLATE_NAME Then GoTo NextGroup
        
        Set currTemplate = getOrOpenTemplate(selectedTemplatePath, docBeforeImport)
        For j = 1 To groupExcelInfos.count
            Set groupExcelInfos(j).template = currTemplate
        Next j
        Set currTemplate = Nothing

NextGroup:
        Set groupExcelInfos = Nothing
        Set templatePaths = Nothing
        Set templateNames = Nothing
    Next groupKeyVar
    ' -------------------------------------------------
    
    
    ' Prüfen, ob die Schablonen genügend Plätze haben
    ' Jede Bestellung (mal Stückzahl) belegt in jeder ihrer Schablonen einen Platz. Designs einer Bestellung mit der gleichen Schablone teilen sich einen Platz
    ' -------------------------------------------------
    For i = 1 To jsonRuns.count
        Dim runTemplates As New Dictionary
        
        For j = 1 To jsonRuns.item(i).viewManager.excelDesignsInfos.count
            Set currTemplate = jsonRuns.item(i).viewManager.getExcelDesignsInfo(j).template
            
            If Not currTemplate Is Nothing Then
                If Not runTemplates.Exists(currTemplate) Then
                    runTemplates.add currTemplate, True
                    currTemplate.neededSlots = currTemplate.neededSlots + jsonRuns.item(i).absoluteQuantity
                End If
            End If
            
            Set currTemplate = Nothing
        Next j
        
        Set runTemplates = Nothing
    Next i
    
    Dim templateKey As Variant
    For Each templateKey In openTemplates.keys
        Set currTemplate = openTemplates(templateKey)
        
        If currTemplate.getFreeSlotsCount < currTemplate.neededSlots Then
            Dim answer As VbMsgBoxResult
            answer = MsgBox("Es gibt in der Schablone '" & currTemplate.doc.name & "' nicht genügend Plätze für die ausgewählten Bestellungen " & _
                "(benötigt: " & currTemplate.neededSlots & ", frei: " & currTemplate.getFreeSlotsCount & "). Trotzdem fortfahren?", vbYesNo Or vbQuestion)
            
            If answer = vbNo Then
                Globals.endMacro
            End If
        End If
        
        Set currTemplate = Nothing
    Next templateKey
    ' -------------------------------------------------
    
End Function


' Öffnet die Schablone, oder gibt sie zurück, wenn sie schon für eine andere View geöffnet wurde
Private Function getOrOpenTemplate(templatePath As String, docBeforeImport As document) As AmazonImportTemplate
    
    If Not openTemplates.Exists(templatePath) Then
        Dim newTemplate As New AmazonImportTemplate
        
        If templatePath = CURRENT_DOKUMENT_TEMPLATE_NAME Then
            newTemplate.initFromDocument docBeforeImport
        Else
            newTemplate.initFromFile templatePath
        End If
        
        openTemplates.add templatePath, newTemplate
    End If
    
    Set getOrOpenTemplate = openTemplates(templatePath)
End Function


' Erzeugt den Text für den Schablonen-Dialog. Z.B: "die View 'Stiftehalter'" oder "die Views 'Anpassung', 'Stiftehalter'"
Private Function getViewNamesText(excelInfos As collection) As String
    
    Dim viewNames As New ArrayList
    
    Dim i As Integer
    For i = 1 To excelInfos.count
        Dim viewName As String
        viewName = excelInfos(i).getViewName
        
        If Not viewName = "" Then viewNames.add "'" & viewName & "'", False
    Next i
    
    Select Case viewNames.count
        Case 0
            getViewNamesText = "die ausgewählten Bestellungen"
        Case 1
            getViewNamesText = "die View " & viewNames.toString
        Case Else
            getViewNamesText = "die Views " & viewNames.toString
    End Select
End Function


' Gibt die Schablone zurück, in der die View landet (über die Excelinfo der ersten JSON-View). Nothing = ohne Schablone
Private Function getTemplateOfView(view As AmazonImportSortedView) As AmazonImportTemplate
    Dim excelInfo As AmazonExcelDesignInfo
    Set excelInfo = view.getJSONViewData(1).excelDesignInfo
    
    If Not excelInfo Is Nothing Then Set getTemplateOfView = excelInfo.template
End Function


Private Sub TestLogError()
    logError "Test 123"
End Sub


Public Function logError(errorDescription As String)
    If Globals.isReleaseVersion And Globals.isFirstServerOnline Then
        ' Fehler als Datei abspeichern in "Corel\Error Logs"
        
        Dim folderPath As String
        folderPath = Globals.getMainFolderOfServer & "\Error Logs\"
        If Globals.folderExists(folderPath) Then
            
            Dim ASIN As String
            Dim orderID As String
            If Not amazonJson Is Nothing Then
                ASIN = amazonJson.ASIN
                orderID = amazonJson.orderID
            End If
            
            Globals.saveTextFileUTF8 "Fehler: " & errorDescription & vbNewLine & "Code: " & Err.number & vbNewLine & "ASIN: " & ASIN & vbNewLine & "Bestellung: " & Globals.getAmazonOrderLink(orderID) & vbNewLine & "Script-Version: " & Globals.getVersion.versionString, _
                 folderPath & Format(Date, "yyyy-mm-dd") & "--" & Format(Time, "hh-mm-ss-ms") & "-" & Globals.getUserName & ".txt"
        End If
    End If
End Function


Public Function getAmazonJSONVersionSupported() As Version
    If supportedAmazonJSONVersion Is Nothing Then
        Set supportedAmazonJSONVersion = New Version
        supportedAmazonJSONVersion.newFromString AMAZON_JSON_VERSION_SUPPORTED
    End If
    
    Set getAmazonJSONVersionSupported = supportedAmazonJSONVersion
End Function


Private Function getFontAlias(fontName As String) As String
    
    ' Ersetzen des Schriftnamens aus der CSV für Amazon Schriftaliasse
    Dim fontAliasIndex As Integer
    fontAliasIndex = Globals.searchStringInCVSArray(fontName, 0, amazonFontsAliasse)
    If Not fontAliasIndex = -1 Then
        fontName = amazonFontsAliasse(fontAliasIndex, 1)
    End If
    
    getFontAlias = fontName
    
End Function




Public Function addASINError(errorMsg As String)
    If Not Globals.isCollectionHavingValue(ASINErrorList, errorMsg) Then
        ASINErrorList.add errorMsg
    End If
End Function


Public Function isActiveDocTemplate()
    If Not ActiveDocument Is Nothing Then
        If ActiveDocument.Metadata.Notes = "Schablone" Then
            isActiveDocTemplate = True
        End If
    End If
End Function


Public Function processJsonRun(jsonRun As AmazonImportJSONRun)
    
    logger.logINFO "-----------------------------------------------"
    logger.addTab , "[AmazonImport.processJsonRun] jsonFilePath: '" & jsonRun.jsonFilePath & "'"
    
    
    ' Wird mehrfach verwendet
    Dim answer As VbMsgBoxResult
    Dim i As Integer
    Dim j As Integer
   
    
    logger.logINFO ""
    logger.logINFO "ASIN : '" & jsonRun.amazonJson.ASIN & "'"
    logger.logINFO "OrderID : '" & jsonRun.amazonJson.orderID & "'"
    logger.logINFO ""
    
    
    
    
    
    
    ' Wird mehrfach verwendet
    Dim currentViewData As AmazonImportJSONView
    
    Dim firstExcelDesignInfo As AmazonExcelDesignInfo
    Set firstExcelDesignInfo = jsonRun.viewManager.getFirstExcelDesignsInfo
    
    
    ' Jedes Design wird direkt in das Dokument seiner Schablone geladen.
    ' Designs ohne Schablone kommen in ein neues Dokument, das beim ersten Design ohne Schablone geöffnet wird
    Set runWorkDoc = Nothing
    
    
    
    ' Konfi-Typ:
    KonfiType = firstExcelDesignInfo.confiType ' TODO jede View könnte seinen eigenen Konfityp haben
    
    
    ' Wird mehrfach verwendet
    Dim currentExcelDesignInfo As AmazonExcelDesignInfo
    Dim currentJSONViewData As AmazonImportJSONView
    
    
    
    ' Designs laden
    ' ====================================================================================
    Dim designs As New ProductDesignRange
    '
    ' Beinhaltet Collections in denen die Parts einer View sind
    ' Denn die Parts eines Design können auf mehreren Views verteilt sein
    ' designsPartsAsViews:
    '  - View
    '  - - Part
    Dim designsPartsAsViews As New collection
    Dim designPartsAreHorizontalToEachOther As Boolean
    
    ' Wird mehrfach benutzt
    Dim currentSortedView As AmazonImportSortedView
    
    logger.logINFO ""
    logger.logINFO "Lade Designs, Designvarianten & statische Varianten"


    Dim lastExcelDesignInfoWithSizeSelection As AmazonExcelDesignInfo
    
    For i = 1 To jsonRun.viewManager.excelDesignsInfos.count
        
        
        Set currentSortedView = jsonRun.viewManager.getNextFreeSortedView(logger)
        
        If currentSortedView Is Nothing Then
            logger.logINFO "Es gibt zwar noch mehr Excel Design Infos. Allerdings keine weiteren SortedViews. Dass kann vorkommen, wenn in der Excel Infos für mehrere Views für eine ASIN eingetragen sind. Hier wird abgebrochen!"
            Exit For
        End If
        
        Set currentExcelDesignInfo = jsonRun.viewManager.excelDesignsInfos(i)
        Set currentJSONViewData = jsonRun.viewManager.getNextFreeJSONViewData(logger)
        
        
        ' Die erste excelDesignInfo (und die mit 'View-Name') wurde schon beim Initialisieren des Runs initialisiert, damit die Schablonen gefunden werden können
        If Not currentExcelDesignInfo.isDefaultJSONViewSet Then
            currentExcelDesignInfo.setDefaultJSONView currentJSONViewData, logger
        ElseIf Not currentJSONViewData Is Nothing Then
            If Not currentExcelDesignInfo.getJSONView(1) Is currentJSONViewData Then
                logger.logWARN "Die über den 'View-Name' zugeordnete JSON-View '" & currentExcelDesignInfo.getJSONView(1).viewName & "' ist nicht die nächste freie JSON-View '" & currentJSONViewData.viewName & "'"
            End If
        End If
        
        ' Unbedingt nach dem Initialisieren
        Dim masterDesignFiles As FSDesignFiles
        Set masterDesignFiles = currentExcelDesignInfo.sizeFolder.getMasterDesignFiles
        
        ' QUICKFIX
        ' Die ExcelInfo merken, welches eine JSONView hat, wo der Kunde eine Größe ausgewählt hat
        If lastExcelDesignInfoWithSizeSelection Is Nothing And Not currentExcelDesignInfo.getViewWithSizeSelection Is Nothing Then
            Set lastExcelDesignInfoWithSizeSelection = currentExcelDesignInfo
        End If
        
        ' Design laden
        ' ---------------------------------------------------
        logger.logINFO "- Lade Design-CDR: '" & currentExcelDesignInfo.designFiles.getAmazonImportCDRPath & "'"
        Dim currentDesign As productDesign
        Set currentDesign = loadDesignCDRAndPrepare(currentExcelDesignInfo.designFiles.getAmazonImportCDRPath, currentExcelDesignInfo, masterDesignFiles)
        designs.add currentDesign
        ' --------------------------------------------------
        
        Dim partToViewInstruction As ConfiPartToViewSortInstruction
        Set partToViewInstruction = currentExcelDesignInfo.designFiles.loadPartToViewInstruction
        jsonRun.viewManager.addDesign currentDesign, currentExcelDesignInfo, partToViewInstruction, logger
        
        ' Design-Varianten
        processDesignVariants currentExcelDesignInfo, currentDesign
        
        ' Statische Varianten
        processStaticVariants currentExcelDesignInfo, currentDesign, masterDesignFiles
        
        ' Skalieren
        'scaleDesign currentDesign, currentExcelDesignInfo
        scaleDesign currentDesign, firstExcelDesignInfo, currentExcelDesignInfo, lastExcelDesignInfoWithSizeSelection ' QUICKFIX Hier wird die letzte JSONView genutzt, die eine Größenangabe vom Kunden enthält
        
        
'        cutDesignBleedToDefaultSize currentDesign
        
        ' Designs nebeneinander oder übereinander anordnen
        ' ---------------------------------------------------
        If i = 1 Then
            If currentDesign.getPartsCount > 1 Then
                designPartsAreHorizontalToEachOther = (currentDesign.getPart(1).item(1).layerShape.centerX - currentDesign.getPart(2).item(1).layerShape.centerX) > (currentDesign.getPart(1).item(1).layerShape.centerY - currentDesign.getPart(2).item(1).layerShape.centerY)
            Else
                designPartsAreHorizontalToEachOther = True
            End If
        End If
        
        ' Das vorherige Design, das im selben Dokument (gleiche Schablone bzw. ohne Schablone) liegt
        Dim previousDesign As productDesign
        Dim p As Integer
        For p = i - 1 To 1 Step -1
            If getTemplateOfDesign(jsonRun, p) Is currentExcelDesignInfo.template Then
                Set previousDesign = designs.getDesign(p)
                Exit For
            End If
        Next p
        
        If Not previousDesign Is Nothing Then
            
            ' Rechts vom vorherigen Design + 2cm platzieren. Das Export2-Script exportiert die CDRs nämlich mit 1cm Abstand zum Design.
            ' Da 2 Designs nebeneinander sollen, sind es 2cm
            If designPartsAreHorizontalToEachOther Then
                ' Horizontal nebeneinander setzen
                currentDesign.getDesignShape.LeftX = previousDesign.getDesignShape.RightX + ConvertUnits(2, cdrCentimeter, ActiveDocument.unit)
            Else
                ' Übereinander setzen
                currentDesign.getDesignShape.TopY = previousDesign.getDesignShape.BottomY - ConvertUnits(2, cdrCentimeter, ActiveDocument.unit)
            End If
            
            ' Neu geladene Designs kommen im Ebenenstapel nach oben. Das erste Design soll aber oben sein und die Folgenden darunter.
            currentDesign.getDesignShape.OrderBackOf previousDesign.getDesignShape
            
            Set previousDesign = Nothing
        End If
        ' ---------------------------------------------------
        
        
        
        
        
        Set masterDesignFiles = Nothing
        Set currentExcelDesignInfo = Nothing
        Set currentDesign = Nothing
        Set currentJSONViewData = Nothing
        Set currentSortedView = Nothing
    Next i
    '
    logger.logINFO ""
    ' ====================================================================================
    
    
    
    jsonRun.viewManager.debugPrint logger
    
    
    
    ' Warnen, wenn die Designs nicht genügend Parts haben
    ' ---------------------------------------------------------
    jsonRun.viewManager.warnIfHasFreeSortedView logger
    ' ---------------------------------------------------------
    
    
    
    
    
    ' Wird mehrfach benutzt
    Dim shapesForViewFitting As shapeRange
    
    ' Die Views durchlaufen
    For j = 1 To jsonRun.viewManager.getSortedViewCount
        
        logger.logFINE ("Verarbeite Sortierte Views #" & j & ". Insgesammt gibt es " & jsonRun.viewManager.getSortedViewCount & " Views")
        
        Set currentSortedView = jsonRun.viewManager.getSortedView(j)
        currentSortedView.debugPrint logger
        
        Dim firstPartOfView As ProductDesignPart
        Set firstPartOfView = currentSortedView.getJSONViewData(1).getPart(1)
        
        ' Die Schablone, in der diese View landet. Nothing = ohne Schablone
        Dim viewTemplate As AmazonImportTemplate
        Set viewTemplate = getTemplateOfView(currentSortedView)
        
        ' Das Dokument aktivieren, in dem die Designs der View liegen. Texte, Vorschaubilder usw. werden im aktiven Dokument erstellt
        activateDocOfTemplate viewTemplate
        
        
        prepareView currentSortedView
    
        ' FOTOS
        processImages currentSortedView, jsonRun.jsonFolderPath
    
        ' TEXT
        ' Texte werden nach den Fotos bearbeitet, da diese im AmazonKonfi über den Fotos sind
        processTexts currentSortedView, firstPartOfView
        
        ' QR Codes
        processQRCodes currentSortedView
        
        
        ' TODO : Beim Exportieren der Amazon-CDR kann der Schicht, die als Designschicht gewählt wurde, ein Marker verpasst werden.
        ' Dann könnte man Texte aus dem Konfi in die Designschicht ordern. Dort würden sie dann durch den Code unten passend eingefärbt werden
        
        ' FARBEN
        ' ---------------------------------------------------
        For i = 1 To currentSortedView.getParts.count
            
            Dim currentPart As ProductDesignPart
            Set currentPart = currentSortedView.getParts.getPart(i)
            
            Dim n As Integer
            For n = 1 To currentPart.layers.count
                currentPart.getLayer(n).colorizeForAmazonImport
            Next n

            Set currentPart = Nothing
        Next i
        ' ---------------------------------------------------
        
        
        
        ' GRUNDPLATTE
        ' ---------------------------------------------------
        PlaceFile.initIfNeeded ' Ist wichtig, damit die Jobs nicht Nothing sind
        For i = 1 To currentSortedView.getParts.count
            
            Set currentPart = currentSortedView.getParts.getPart(i)
            
            For n = 1 To currentPart.layers.count
                If Not currentPart.getLayer(n).isGraving Then
                    Dim groundPlateJob As PlaceFileJob
                    
                    Dim d As Integer
                    For d = 1 To currentSortedView.getJSONViewDataCount
                        ' Schwarz satiniertes Acryl
                        If currentSortedView.getJSONViewData(d).material = mtAcrylicBlackSatin Then
                            Set groundPlateJob = PlaceFile.jobAcrylSchwarzSatiniert
                        End If
                        
                        ' TODO Buchenholz??
                    Next d
                    
                    If Not groundPlateJob Is Nothing Then
                        PlaceFile.placeJobOnProductDesignLayer currentPart.layers.getLayer(n), groundPlateJob
                        Dim groundPlateWhiteFilling As shape
                        Set groundPlateWhiteFilling = Globals.createRGD_WhiteShape(currentPart.getLayer(n).getGroundPlate, True, False)
                        
                        groundPlateWhiteFilling.OrderBackOf currentPart.getLayer(n).layerShape.shapes.Last
                        
                        Set groundPlateWhiteFilling = Nothing
                    End If
                    Set groundPlateJob = Nothing
                End If
            Next n
            
            
            
            Set currentPart = Nothing
        Next i
        ' ---------------------------------------------------
        
        
        
        
        ' GRUNDPLATTEN EINFÄRBUNG ALS ORIENTIERUNG
        ' ---------------------------------------------------
        currentSortedView.colorizeMainShapesOfPartsByGroundplateSelection
        ' ---------------------------------------------------
        

        ' Anmerkung vom Kunden
        ' ---------------------------------------------------
        logger.logFINE "Kundenanmerkung:"
        Dim customerNote As String
        Dim k As Integer
        For k = 1 To currentSortedView.getJSONViewDataCount
            If Not currentSortedView.getJSONViewData(k).customerNote = "" Then
                customerNote = customerNote & (IIf(customerNote = "", "", vbNewLine)) & currentSortedView.getJSONViewData(k).customerNote
                logger.logFINE "- Kundenanmerkung hinzugefügt: '" & currentSortedView.getJSONViewData(k).customerNote & "'"
            End If
        Next k
        
        ' Bei Schablonen auf Bestellmenge verzichten
        If jsonRun.absoluteQuantity > 1 And viewTemplate Is Nothing Then
            customerNote = customerNote & (IIf(customerNote = "", "", vbNewLine)) & "Bestellmenge (Sparset:" & jsonRun.viewManager.getQuantity & " * Stückzahl:" & jsonRun.amazonJson.quantity & ") = " & jsonRun.absoluteQuantity
        End If
        
        
        If Not customerNote = "" Then
            
            customerNote = "Kundenanmerkung:" & vbNewLine & customerNote
            
            Dim noteTextSize As Double
            noteTextSize = IIf(firstPartOfView.getDesign.getLayersMainShapes.SizeHeight < firstPartOfView.getDesign.getLayersMainShapes.SizeWidth, firstPartOfView.getDesign.getLayersMainShapes.SizeHeight, firstPartOfView.getDesign.getLayersMainShapes.SizeWidth)
            Dim noteText As shape
            Set noteText = ActiveLayer.CreateParagraphText(0, 0, noteTextSize, noteTextSize, customerNote, , , "Arial", noteTextSize / 100)

            ' Mit Schablone
            If Not viewTemplate Is Nothing Then
                noteText.fill.UniformColor.RGBAssign 0, 0, 255

                Globals.shapeToShapeRange(noteText).SetOutlineProperties 5, , CreateColor("#FFFFFF")
                noteText.outline.Justification = cdrOutlineJustificationOutside
                noteText.SetPositionEx cdrCenter, currentSortedView.getLayerShapes.centerX, currentSortedView.getLayerShapes.centerY

                noteText.OrderFrontOf firstPartOfView.getDesign.getDesignShape.shapes.First
            Else
                noteText.fill.ApplyUniformFill CreateRGBColor(255, 0, 0)
                
                
                
                noteText.SetPositionEx IIf(j = 1, cdrMiddleRight, cdrMiddleLeft), IIf(j = 1, currentSortedView.getLayerShapes.LeftX - 250, currentSortedView.getLayerShapes.RightX + 250), currentSortedView.getShapesForViewFitting.centerY
            End If

            If noteText.text.Overflow Then
                ' Text an Rahmen anpassen
                noteText.text.FitTextToFrame
            End If

            noteText.name = "Kunden-Anmerkung"
        Else
            logger.logFINE "- Keine Kundenanmerkung vorhanden"
        End If
        ' ----------------------------------------------------
        
        
        
        Dim designMustBeEdited As Boolean
        If designMustBeEdited Then
    '        MsgBox "Design muss vorher bearbeitet werden"
            
            
        ' Kein Bildzuschnitt nötig. Für den Druck als PDF speichern
        Else
    '        MsgBox "Design kann als PDF in den Druck"
            
            logger.logBASIC "Färbe die gelben Uploadboxen zu pink um"
            ' Die gelben Uploadboxen zu "CutContour" (Pink) umfärben
            Dim yellowUploadBoxes As shapeRange
            Set yellowUploadBoxes = newCustomShapeTypeQuery(currentSortedView.getLayerShapes, ConfiUploadBoxCutForImportShapeType).setExcludeGivenShape(True).setRecursive(False).search
            Globals.setShapeRangeColor yellowUploadBoxes, Nothing, _
            IIf(firstPartOfView.item(1).isGraving, CreateRGBColor(255, 0, 0), Globals.getPinkColor), False, False, False, True
            
        End If
        
        
        
        
        ' Vorschaubild & evtl. Produktbild laden
        ' ----------------------------------------------------
        ' Ohne Bestellung (nur ASIN) gibt es kein Vorschaubild vom Kunden
        If jsonRun.amazonJson.isFromASIN Then
            logger.logINFO "Keine Vorschaubilder laden. Denn es wurde nur eine ASIN ohne Bestellung geladen"
        ElseIf viewTemplate Is Nothing Or GlobalSettingsUserForm.getSetting_AmazonImportLoadPreviewImageInTemplates Then
            logger.logINFO "Lade Vorschaubilder & Produktbilder:"
            
            For k = 1 To currentSortedView.getJSONViewDataCount
                
                Set currentJSONViewData = currentSortedView.getJSONViewData(k)
                Dim snapShotImage As shape
                
                On Error GoTo SnapShotImageError
                Set snapShotImage = Globals.loadImage(jsonRun.jsonFolderPath & currentJSONViewData.snapShotImageName, False)
                On Error GoTo 0
                
                
            
                Set currentExcelDesignInfo = currentJSONViewData.excelDesignInfo
            
                ' Produktbild hinzuladen
                ' ==========================
                If Not currentExcelDesignInfo Is Nothing Then ' Wenn die aktuelle sortedView mehr als eine JSONView beinhaltet, dann hat nur die erste JSONView auch ExcelDesignInfos
                    Dim productImage As shape
                    logger.logINFO "- Produktbild soll laut Excel hinzugeladen werden: '" & currentExcelDesignInfo.loadProductImage & "'"
                    If currentExcelDesignInfo.loadProductImage Then
                        
                        Dim productImagePath As String
                        productImagePath = currentExcelDesignInfo.designFiles.getProductImagePath
                        
                        If Not Globals.fileExist(productImagePath) Then
                            ' Wenn das Bild nicht vorhanden, wird das Folderbild genutzt
                            productImagePath = currentExcelDesignInfo.designFiles.getFolderThumbnailPath
                        End If
                        
                        
                        If Globals.fileExist(productImagePath) Then
                            Set productImage = Globals.loadImage(productImagePath)
                            logger.logINFO "- Bild geladen"
                        Else
                            logger.logWARN "- Bild NICHT geladen. Datei exestiert nicht: '" & productImagePath & "'"
                        End If
                    End If
                End If
                ' ==========================
                
                
                Dim longestSideLenght As Double
                If currentSortedView.getShapesForViewFitting.SizeWidth > currentSortedView.getShapesForViewFitting.SizeHeight Then
                    longestSideLenght = currentSortedView.getShapesForViewFitting.SizeWidth
                Else
                    longestSideLenght = currentSortedView.getShapesForViewFitting.SizeHeight
                End If
                
                snapShotImage.setSize longestSideLenght / AmazonExport.getAmazonKonfiSizeWithoutPadding * AmazonExport.getAmazonKonfiSize, _
                                    longestSideLenght / AmazonExport.getAmazonKonfiSizeWithoutPadding * AmazonExport.getAmazonKonfiSize
                
                If Not productImage Is Nothing Then productImage.setSize snapShotImage.SizeWidth
                
                ' Zentrieren auf das jetzige Part
                snapShotImage.SetPositionEx cdrCenter, currentSortedView.getShapesForViewFitting.centerX, currentSortedView.getShapesForViewFitting.centerY
                If Not productImage Is Nothing Then productImage.SetPositionEx cdrCenter, snapShotImage.centerX, snapShotImage.centerY
                
                ' Beim Import ohne Schablone, das Vorschaubild über (nicht auf) das Design setzen,
                ' damit man Vorschau & Design vergleichen kann.
                If viewTemplate Is Nothing Then
                    snapShotImage.BottomY = ActiveDocument.ActivePage.SizeHeight
                    If Not productImage Is Nothing Then productImage.BottomY = snapShotImage.TopY
                End If
                
                snapShotImage.name = Globals.getAmazonImportPreviewImageKeyword  ' - S-View: " & j & " JSN-View: " & k
                snapShotImage.OrderFrontOf firstPartOfView.getDesign.getDesignShape.shapes.First
                
                GoTo SkipSnapShotImageError
SnapShotImageError:
                addASINError "Das Vorschaubild vom Kunden konnte nicht geladen werden! Fehlermeldung: " & Err.Description
SkipSnapShotImageError:
                
                Set snapShotImage = Nothing
                Set productImage = Nothing
                Set currentJSONViewData = Nothing
            Next k
        Else
            logger.logINFO "Keine Vorschaubilder laden. Denn es wird eine Schablone genutzt. Dort stören die Vorschaubilder laut der Kollegen aus der Produktion"
        End If
        ' ----------------------------------------------------
    
        
        Set firstPartOfView = Nothing
        Set viewTemplate = Nothing
        Set currentSortedView = Nothing
    Next j
    
    
    
    
    ' Parts der Designs aufeinanderstapeln, die in einer Schablone landen
    For i = 1 To designs.count
        If Not getTemplateOfDesign(jsonRun, i) Is Nothing Then
            Set currentDesign = designs.getDesign(i)
            Dim a As Integer
            For a = 1 To currentDesign.getLayerCount
                currentDesign.getLayer2(a).layerShape.SetPosition 0, 0
            Next a
            Set currentDesign = Nothing
        End If
    Next i
    
    
    
    ' Alle Dokumente, in die Designs dieser Bestellung geladen wurden (Schablonen und Dokument ohne Schablone)
    Dim runDocs As collection
    Set runDocs = getDocsOfRun(jsonRun, designs.count)
    Dim runDoc As Variant
    
    For Each runDoc In runDocs
        ' Viewbox Shapes löschen (wenn vorhanden)
        newCustomShapeTypeQuery(runDoc.ActiveLayer.shapes.All, viewShape).search.delete
        
        ' Statische Varianten-Container löschen ('processStaticVariants' löscht nur den Container der gewählten Variante)
        newCustomShapeTypeQuery(runDoc.ActiveLayer.shapes.All, StaticVariantContainer).search.delete
    Next runDoc
    logger.logFINE ("Viewbox Shape gelöscht")
    
    
    
    
    ' FEHLENDE GLYPHEN
    '
    ' Prüfen, ob es Texte gibt, die fehlende Zeichen haben (Liegt an den Schriftarten)
    ' --------------------------------------------------------------
    Dim textShapesToCheckForMissingGlyphs As New shapeRange
    For i = 1 To designs.count
        Set currentDesign = designs.getDesign(i)
        
        textShapesToCheckForMissingGlyphs.AddRange currentDesign.newCustomShapeTypeQuery(TextAny).search
        
        Set currentDesign = Nothing
    Next i
    
    For i = 1 To textShapesToCheckForMissingGlyphs.count
        FindMissingGlyphsErrors textShapesToCheckForMissingGlyphs(i)
    Next i
    ' --------------------------------------------------------------
    
    
    ' Löscht vollständig unsichtbare Formen. Das betrifft vorallem leere Varianten.
    ' Diese sind nicht nötig und erzeugen eine Fehlermeldung beim Gravieren, wenn so eine unsichtbare Form da ist
    deleteFullyTransparentShapes designs
    
    
    ' Quantität und Sparsets
    ' ==============================================================
    '
    ' Falls der Kunde von dem Produkt mehrere Exemplare bestellt hat
    '
    Dim quantityDesigns As New collection  ' Wenn der Kunde 2x bestellt hat, befinden sich in 'quantityDesigns' 2 ProductDesignRanges mit den Designs drin
    quantityDesigns.add designs
    
    If jsonRun.absoluteQuantity > 1 Then
        logger.logINFO "Das Produkt wurde mehrfach bestellt und wird mehrfach kopiert. absoluteQuantity: '" & jsonRun.absoluteQuantity & "'"
    End If
    
    ' Die Designs bzw. Klone, rechts von denen die nächsten Klone platziert werden.
    ' Pro Dokument (Schablone oder ohne Schablone), da Formen aus verschiedenen Dokumenten nicht zusammen bewegt werden können
    Dim previousShapesByDoc As New Dictionary ' Dokument-Schlüssel -> ShapeRange
    For j = 1 To designs.count
        addShapeToShapeRangeDictionary previousShapesByDoc, getDocKeyOfDesign(jsonRun, j), designs.getDesign(j).getDesignShape
    Next j
    
    ' 2, weil die erste Bestellung an diesem Punkt bereits importiert ist
    For i = 2 To jsonRun.absoluteQuantity
        
        ' Designs von Bestellung Clonen (Der Klon landet im Dokument des Originals)
        ' ----------------------
        Dim designsCopy As New ProductDesignRange
        Dim designsCopyShapesByDoc As New Dictionary ' Dokument-Schlüssel -> ShapeRange
        
        For j = 1 To designs.count
            Dim designCopy As productDesign
            Set designCopy = designs.getDesign(j).clone
            designsCopy.add designCopy
            
            ' Vorschaubild bei den Klonen löschen (braucht man nur einmal)
            newCustomShapeTypeQuery(designCopy.getDesignShape, AmazonImportPreviewImageShapeType).search.delete
            
            addShapeToShapeRangeDictionary designsCopyShapesByDoc, getDocKeyOfDesign(jsonRun, j), designCopy.getDesignShape
            Set designCopy = Nothing
        Next j
        ' ----------------------
        
        ' Geklonte Designs rechts von Original oder vorherigen Klon platzieren
        ' ----------------------
        Dim docKey As Variant
        For Each docKey In designsCopyShapesByDoc.keys
            Dim designsCopyAsShapeRange As shapeRange
            Set designsCopyAsShapeRange = designsCopyShapesByDoc(docKey)
            
            Dim previousDesignsAsShapeRangeForPositioning As shapeRange
            Set previousDesignsAsShapeRangeForPositioning = previousShapesByDoc(docKey)
            
            designsCopyAsShapeRange.Move (previousDesignsAsShapeRangeForPositioning.RightX - designsCopyAsShapeRange.LeftX) + ActiveDocument.ToUnits(1, cdrCentimeter), 0
            
            Set previousShapesByDoc(docKey) = designsCopyAsShapeRange
            Set designsCopyAsShapeRange = Nothing
            Set previousDesignsAsShapeRangeForPositioning = Nothing
        Next docKey
        ' ----------------------
        
        quantityDesigns.add designsCopy
        
        Set designsCopy = Nothing
        Set designsCopyShapesByDoc = Nothing
    Next i
    
    
    ' ==============================================================
    
    
    ' Dokumentengröße auf Design anpassen
    ' (Aber nur auf die Designs ohne Schablone und nur, wenn nicht direkt in eine Schablone geladen wurde. Dort soll die Seitengröße bleiben)
    ' -----------------------------
    Dim designsWithoutTemplate As New ProductDesignRange
    For i = 1 To designs.count
        If getTemplateOfDesign(jsonRun, i) Is Nothing Then
            designsWithoutTemplate.add designs.getDesign(i)
        End If
    Next i
    
    If Not runWorkDoc Is Nothing And designsWithoutTemplate.count > 0 Then
        runWorkDoc.Activate ' 'setPageSizeToDesigns' arbeitet mit der aktiven Seite
        setPageSizeToDesigns designsWithoutTemplate
    End If
    ' -----------------------------
    
    
    ' Layer löschen, die nicht dem Gravur oder Druckmodus entsprechen
    ' Wenn man bspw. gerade im Druckmodus ist, werden alle Gravurlayer gelöscht
    manageGravingAndPrintMode quantityDesigns
    
    
    ' Designs in ihre Schablonen setzen
    ' ==============================================================
    Dim q As Integer
    For q = 1 To quantityDesigns.count
        
        Dim currDesignRange As ProductDesignRange
        Set currDesignRange = quantityDesigns(q)
        
        ' Designs dieser Mengen-Kopie nach ihrer Schablone gruppieren. Designs mit der gleichen Schablone kommen zusammen auf einen Platz
        Dim designsByTemplate As New Dictionary ' AmazonImportTemplate -> ProductDesignRange
        Dim designsToUngroup As New ProductDesignRange
        
        For d = 1 To currDesignRange.count
            Dim designTemplate As AmazonImportTemplate
            Set designTemplate = getTemplateOfDesign(jsonRun, d)
            
            If designTemplate Is Nothing Then
                ' Wenn keine Schablone verwendet wird, dann die Designs entgruppieren, damit eine Nachbearbeitung leichter ist
                ' Bei einer Schablone bleiben die Designs gruppiert, damit man sie leichter hin und her schieben kann und nicht im Objektfenster durcheinander kommt
                designsToUngroup.add currDesignRange.getDesign(d)
            
            ElseIf Not designsByTemplate.Exists(designTemplate) And Not designTemplate.hasFreeSlot Then
                ' User wurde vorher gewarnt, dass nicht genügend Plätze da sind. Das Design bleibt, wo es ist
                addASINError "In der Schablone '" & designTemplate.doc.name & "' gibt es keinen freien Platz mehr. Ein Design der Bestellung '" & jsonRun.amazonJson.orderID & "' wurde deshalb nicht in die Schablone gesetzt."
            
            Else
                If Not designsByTemplate.Exists(designTemplate) Then
                    designsByTemplate.add designTemplate, New ProductDesignRange
                End If
                
                Dim templateDesigns As ProductDesignRange
                Set templateDesigns = designsByTemplate(designTemplate)
                templateDesigns.add currDesignRange.getDesign(d)
                Set templateDesigns = Nothing
            End If
            
            Set designTemplate = Nothing
        Next d
        
        Dim templateKey As Variant
        For Each templateKey In designsByTemplate.keys
            Set designTemplate = templateKey
            Set templateDesigns = designsByTemplate(templateKey)
            
            placeDesignsInTemplate templateDesigns, designTemplate
            
            Set templateDesigns = Nothing
            Set designTemplate = Nothing
        Next templateKey
        
        If designsToUngroup.count > 0 Then
            activateDocOfTemplate Nothing
            designsToUngroup.ungroupLayersAndDesign
        End If
        
        Set designsByTemplate = Nothing
        Set designsToUngroup = Nothing
        Set currDesignRange = Nothing
    Next q
    ' ==============================================================
    
    
    
    ' Nullpunkt in die Mitte der Dokumente setzen
    For Each runDoc In runDocs
        runDoc.DrawingOriginX = 0
        runDoc.DrawingOriginY = 0
    Next runDoc
    
    
    
    logger.removeTab
    
    Exit Function
AsinError:
    MsgBox "Das Amazonprodukt wird noch nicht unterstützt! " & vbNewLine & vbNewLine & "Fehlermeldung: " & vbNewLine & Err.Description, vbInformation
    deleteDummyText
    logger.removeTab
    Exit Function
End Function


' Die Schablone, in der das Design mit dem Index 'designIndex' landet. Nothing = ohne Schablone
' (Die Designs einer Bestellung haben die gleiche Reihenfolge wie die Excelinfos, aus denen sie geladen wurden)
Private Function getTemplateOfDesign(jsonRun As AmazonImportJSONRun, designIndex As Integer) As AmazonImportTemplate
    Set getTemplateOfDesign = jsonRun.viewManager.getExcelDesignsInfo(designIndex).template
End Function


' Gibt einen Schlüssel für das Dokument zurück, in dem das Design liegt (pro Schablone bzw. ohne Schablone)
Private Function getDocKeyOfDesign(jsonRun As AmazonImportJSONRun, designIndex As Integer) As String
    Dim designTemplate As AmazonImportTemplate
    Set designTemplate = getTemplateOfDesign(jsonRun, designIndex)
    
    If designTemplate Is Nothing Then
        getDocKeyOfDesign = NO_TEMPLATE_NAME
    Else
        getDocKeyOfDesign = CStr(ObjPtr(designTemplate))
    End If
End Function


' Gibt alle Dokumente zurück, in die Designs dieser Bestellung geladen wurden (Schablonen und das Dokument ohne Schablone)
Private Function getDocsOfRun(jsonRun As AmazonImportJSONRun, ByVal designsCount As Integer) As collection
    
    Set getDocsOfRun = New collection
    
    If Not runWorkDoc Is Nothing Then getDocsOfRun.add runWorkDoc
    
    Dim addedTemplates As New Dictionary
    
    Dim i As Integer
    For i = 1 To designsCount
        Dim designTemplate As AmazonImportTemplate
        Set designTemplate = getTemplateOfDesign(jsonRun, i)
        
        If Not designTemplate Is Nothing Then
            If Not addedTemplates.Exists(designTemplate) Then
                addedTemplates.add designTemplate, True
                getDocsOfRun.add designTemplate.doc
            End If
        End If
        
        Set designTemplate = Nothing
    Next i
End Function


' Aktiviert das Dokument der Schablone. Nothing = das Dokument mit den Designs ohne Schablone
Private Function activateDocOfTemplate(template As AmazonImportTemplate)
    If template Is Nothing Then
        If Not runWorkDoc Is Nothing Then runWorkDoc.Activate
    Else
        template.doc.Activate
    End If
End Function


Private Function addShapeToShapeRangeDictionary(dict As Dictionary, key As String, shapeToAdd As shape)
    If Not dict.Exists(key) Then dict.add key, New shapeRange
    
    Dim range As shapeRange
    Set range = dict(key)
    range.add shapeToAdd
End Function


' Setzt die Designs (einer Mengen-Kopie einer Bestellung) an den nächsten freien Platz der Schablone.
' Die Designs wurden schon direkt in das Dokument der Schablone geladen
Private Function placeDesignsInTemplate(designRange As ProductDesignRange, template As AmazonImportTemplate)
    
    activateDocOfTemplate template
    
    ' Nächste freie Stelle in der Schablone
    Dim templateSlot As shape
    Set templateSlot = template.getNextFreeSlot
    Dim slotRotation As Double
    slotRotation = templateSlot.RotationAngle
    templateSlot.rotate -templateSlot.RotationAngle ' Auf 0 setzen
    
    Dim layersMainShapes As shapeRange
    Set layersMainShapes = designRange.collectMainShapes
    
    Dim designShapes As shapeRange
    Set designShapes = designRange.getDesignShapes
    
    
    designShapes.RotateEx slotRotation, templateSlot.centerX, templateSlot.centerY
    
    
    ' Die roten/pinken Formen werden genutzt um den Mittelpunkt des Designs zu bestimmen.
    ' Da im Design noch das Vorschaubild und die View sind können diese den Mittelpunkt verfälschen
    ' Außerdem können auch andere Formen den Mittelpunkt verfälschen (merkt man, wenn der Mittelpunkt von "design.getDesignShape" nicht der selbe ist wie von "layersMainShapes")
    
    ' Wenn die Designs kleiner als der Slot sind, links oben platzieren
    If layersMainShapes.SizeWidth < templateSlot.SizeWidth Or _
       layersMainShapes.SizeHeight < templateSlot.SizeHeight Then
        
        designShapes.SetPositionEx cdrTopLeft, _
            templateSlot.LeftX - (layersMainShapes.LeftX - designShapes.LeftX), _
            templateSlot.TopY - (layersMainShapes.TopY - designShapes.TopY)
    
    ' Ist der Slot passend oder zu groß, mittig platzieren
    Else
        
        designShapes.SetPositionEx cdrCenter, _
            templateSlot.centerX - (layersMainShapes.centerX - designShapes.centerX), _
            templateSlot.centerY - (layersMainShapes.centerY - designShapes.centerY)
    
    End If
    
    templateSlot.delete
End Function


' Entfernt alle Formen, die vollständig transparent sind von allen Designs
Private Function deleteFullyTransparentShapes(designs As ProductDesignRange)
    designs.newCustomShapeTypeQuery(FullTransparentShapeType).search.delete
End Function


Private Function manageGravingAndPrintMode(quantityDesigns)
    Dim q As Integer
    For q = 1 To quantityDesigns.count
        manageGravingAndPrintMode_ProcessDesigns quantityDesigns(q)
    Next q
End Function


Private Function manageGravingAndPrintMode_ProcessDesigns(ByVal designs As ProductDesignRange)
    Dim d As Integer
    For d = 1 To designs.count
        manageGravingAndPrintMode_ProcessDesign designs.getDesign(d)
    Next d
End Function


Private Function manageGravingAndPrintMode_ProcessDesign(design As productDesign)
    
    ' Wenn ein Design nur Layer für eine Herstellungsart hat, dann macht es keinen Sinn
    ' irgendwelche Layer zu löschen. Denn wenn man bspw. ein reines Gravurprodukt im Druck-Modus reinlädt,
    ' würden alle Layer gelöscht werden
    If design.isLayersOnlyGraving Or design.isLayersOnlyPrint Then Exit Function
    
    Dim layersToDelete As New collection
        
    Dim i As Integer
    For i = 1 To design.getLayers.count
        
        Dim currLayer As ProductDesignLayer
        Set currLayer = design.getLayers.getLayer(i)
        
        If Not manageGravingAndPrintMode_isLayerForCurrentMode(currLayer) Then
            layersToDelete.add currLayer
        End If
        
        Set currLayer = Nothing
    Next i
    
    For i = 1 To layersToDelete.count
        layersToDelete(i).delete
    Next i
    
End Function


Private Function manageGravingAndPrintMode_isLayerForCurrentMode(layer As ProductDesignLayer) As Boolean
    
    Dim result As Boolean
    
    If layer.isGraving Then
        result = GlobalSettingsUserForm.getSetting_AmazonImportGravingModeEnabled
    Else
        result = GlobalSettingsUserForm.getSetting_AmazonImportPrintModeEnabled
    End If
    
    manageGravingAndPrintMode_isLayerForCurrentMode = result
End Function



Private Function showErrors()
    
    Dim errorStr As String
    
    Dim i As Integer
    For i = 1 To ASINErrorList.count
        errorStr = errorStr & ASINErrorList(i) & IIf(i = ASINErrorList.count, "", vbNewLine & vbNewLine)
    Next i
    
    If Not errorStr = "" Then
        MsgBox errorStr, vbExclamation
    End If
    
End Function



' 'template': Wenn das aktive Dokument eine Schablone ist
Private Function cleanUpDocument(Optional template As AmazonImportTemplate)
    
    ' Zoom auf alle Formen im Dokument anpassen, sonst würde man das Vorschaubild von Amazon nicht ganz sehen
    ActiveWindow.ActiveView.ToFitAllObjects
    
    ' Musterdesign entfernen, wenn vorhanden
    Globals.removeTemporaryShapesFromActiveDocument
    
    ' Nichts auswählen. Ist sonst evtl. störend, wenn noch etwas angewählt ist, nachdem das Script fertig ist
    ActiveDocument.ClearSelection
    
    ' Formen in Leserichtung sortieren. Erleichtert das Navigieren im Objektefenster
    If Not template Is Nothing Then
        Dim shapesToSort As shapeRange
        Set shapesToSort = ActiveLayer.shapes.All
        ' Wenn es eine Schablonen-Slot-Gruppe gibt, diese ignorieren
        If template.hasFreeSlot Then
            shapesToSort.RemoveRange Globals.shapeToShapeRange(template.slotsGroup)
        End If
        
        arrange.arrangeFunction True, Globals.shapeRangeToCollection(shapesToSort)
        
        shapesToSort.orderToFront
    End If
        
End Function


Private Function cleanUp()
    
    logger.addTab , "[AmazonImport.cleanUp]"
    
    deleteDummyText
    
    ' Dummy Dokument am Ende schließen
    If Not dummyDocument Is Nothing Then
        dummyDocument.Close
        Set dummyDocument = Nothing
    End If
    
    If Not ActiveDocument Is Nothing Then ActiveDocument.Dirty = False
    
    logger.removeTab
    
End Function



Private Function setPageSizeToDesigns(designs As ProductDesignRange)
    
    ' Wenn es eine Schablone gibt, soll die Seitengröße bleiben. Deshalb nur mit Designs ohne Schablone aufrufen
    If designs.count > 0 Then
        Dim allDesignShapes As shapeRange
        Set allDesignShapes = designs.getDesignShapes
        Set allDesignShapes = Globals.flattenShapeRange(allDesignShapes, ignoreGroupsWithToManyShapes:=False)
        
        Dim designShapesForScaling As shapeRange
        Set designShapesForScaling = allDesignShapes
        
        ' Das Vorschaubild und auch andere visuelle Elemente könnten im Design sein, welche aber nicht die Größe des Designs mitbestimmen
        designShapesForScaling.RemoveRange designs.newCustomShapeTypeQuery(VisualElementShapeType).search
        
        
        ActivePage.setSize designShapesForScaling.SizeWidth, designShapesForScaling.SizeHeight
        
        allDesignShapes.LeftX = ActivePage.LeftX + (allDesignShapes.LeftX - designShapesForScaling.LeftX)
        allDesignShapes.TopY = ActivePage.TopY + (allDesignShapes.TopY - designShapesForScaling.TopY)
        
    End If
    
End Function



Private Function processDesignVariants(excelDesignInfo As AmazonExcelDesignInfo, currentDesign As productDesign)
    
    logger.addTab , "[AmazonImport.processDesignVariants] "
    
'    Dim pathToDesignVariants As String
'    pathToDesignVariants = Globals.getParentPath(excelDesignInfo.pathToCDR)
    
    Dim designVariantsContainers As shapeRange
    Set designVariantsContainers = currentDesign.newCustomShapeTypeQuery(DesignElementVariantContainerShapeType).search
    
    logger.logFINE "designVariantsContainers.Count : '" & designVariantsContainers.count & "'"
    
    Dim v As Integer
    For v = 1 To excelDesignInfo.getJSONViewsSize
    
        Dim currentJSONView As AmazonImportJSONView
        Set currentJSONView = excelDesignInfo.getJSONView(v)
        
        logger.logFINE "Verarbeite JSON-View '" & v & "'"
        
        Dim j As Integer
        For j = 1 To UBound(currentJSONView.getDesignVariantSelection)
            Dim currentDesignVariantSelectionNr As Integer
            currentDesignVariantSelectionNr = currentJSONView.getDesignVariantSelection()(j)
            
            If currentDesignVariantSelectionNr > 0 Then
                
                ' 1. Zunächst die Varianten-CDR beim Design selbst suchen
                Dim currentDesignVariantFilePath As String
                currentDesignVariantFilePath = excelDesignInfo.designFiles.getAmazonImportDesignVariantFilePath((j), currentDesignVariantSelectionNr, False)
                If Globals.fileExist(currentDesignVariantFilePath & ".cdr") Then
                    currentDesignVariantFilePath = currentDesignVariantFilePath & ".cdr"
                
                ' 2. .empty Datei beim Design suchen. (.empty ist quasi eine leere CDR. Corel exportiert solche CDRs aber nicht deshalb das eigene .empty Format)
                ElseIf Globals.fileExist(currentDesignVariantFilePath & ".empty") Then
                    logger.logINFO "Designvarianten Datei ist eine .empty Datei. Deshalb wird nichts geladen"
                    GoTo NextJ
                Else
                ' 3. Variante-CDR beim Musterdesign suchen
                ' Wenn das Design eine bestimte Variante nicht hat, dann kann es sein, dass das Musterdesign diese Variante hat
                    currentDesignVariantFilePath = excelDesignInfo.sizeFolder.getMasterDesignFiles.getAmazonImportDesignVariantFilePath((j), currentDesignVariantSelectionNr, False)
                    
                    If Globals.fileExist(currentDesignVariantFilePath & ".cdr") Then
                        currentDesignVariantFilePath = currentDesignVariantFilePath & ".cdr"
                    ElseIf Globals.fileExist(currentDesignVariantFilePath & ".empty") Then
                        logger.logINFO "Designvarianten Datei ist eine .empty Datei. Deshalb wird nichts geladen"
                        GoTo NextJ
                    End If
                End If
                
                
                
                If Not Globals.fileExist(currentDesignVariantFilePath) Then
                    Dim result As VbMsgBoxResult
                    result = MsgBox("Die CDR für die Design-Variante #" & CStr(j) & " #" & CStr(currentDesignVariantSelectionNr) & " wurde unter folgendem Pfad nicht gefunden: " _
                        & vbNewLine & currentDesignVariantFilePath & vbNewLine & vbNewLine & _
                        "Das Design wird unvollständig sein, wenn fortgefahren wird!", vbOKCancel & vbExclamation)
                        
                    If result = vbCancel Then
                        Globals.endMacro
                    End If
                    
                    GoTo NextJ
                End If
                
                
                logger.logINFO "Lade Design-Varianten-CDR: '" & currentDesignVariantFilePath & "'"
                Dim designVariantShape As shape
                Set designVariantShape = Globals.loadCDR(currentDesignVariantFilePath)
                
                
                ' Container suchen
                ' ============================
                ' Gruppe suchen. Z.B: 1 dann alle desVarCont(1)
                Dim containersGroupForCurrentDesignVartiant As shapeRange
                Set containersGroupForCurrentDesignVartiant = newCustomShapeTypeQuery(designVariantsContainers, ByName).setArgument1("desVarCont(" & CStr(j) & ")").setArgument2(StringEquals).search
                
                Dim containerForCurrentDesignVariant As shape
                ' Prüfen, ob es so viele DeignVarianten aus der Gruppe gibt, wie die Nummer der Auswahl des Kunden ist
                If currentDesignVariantSelectionNr <= containersGroupForCurrentDesignVartiant.count Then
                    Set containerForCurrentDesignVariant = containersGroupForCurrentDesignVartiant(currentDesignVariantSelectionNr)
                Else
                    logger.logWARN "Design-Varianten-Kontainer für die Designvariante " & CStr(j) & "-" & currentDesignVariantSelectionNr & " konnte nicht gefunden werden ! ! !"
                End If
                ' ============================
                
                If Not containerForCurrentDesignVariant Is Nothing Then
                    designVariantShape.OrderFrontOf containerForCurrentDesignVariant
                Else
                    designVariantShape.OrderFrontOf currentDesign.getPart(1).item(1).layerShape.shapes.First
                End If
                
                
                
                Set designVariantShape = Nothing
            End If
NextJ:
        Next j
        
        Set currentJSONView = Nothing
    Next v
    
    designVariantsContainers.delete
    
    logger.removeTab
End Function




Public Function processStaticVariants(excelDesignInfo As AmazonExcelDesignInfo, currentDesign As productDesign, masterDesignFiles As FSDesignFiles)
    
    logger.addTab , "[AmazonImport.processStaticVariants]"
    
    Dim layersThatHaveStaticVariantsIndex As Integer: layersThatHaveStaticVariantsIndex = 1
    
    Dim v As Integer
    For v = 1 To excelDesignInfo.getJSONViewsSize
    
        Dim currentJSONView As AmazonImportJSONView
        Set currentJSONView = excelDesignInfo.getJSONView(v)
        
        logger.logFINE "Verarbeite JSON-View '" & v & "'"
        
        
        Dim p As Integer
        For p = 1 To currentJSONView.getPartsCount
            Dim currentPart As ProductDesignPart
            Set currentPart = currentJSONView.getPart(p)
            
            Dim a As Integer
            For a = 1 To currentPart.layers.count
                Dim currentLayer As ProductDesignLayer
                Set currentLayer = currentPart.layers.getLayer(a)
                
                Dim staticVariantContainers As shapeRange
                Set staticVariantContainers = currentLayer.newCustomShapeTypeQuery(StaticVariantContainer).search
                
                Dim pathOfStaticVariantCDR As String
                Dim variantOfStaticVariantCDR As variante
                
                Dim s As Integer
                For s = 1 To currentJSONView.staticVariants.count
                    Dim currentStaticVariantSelection As collection
                    Set currentStaticVariantSelection = currentJSONView.staticVariants(s)
                    
                    If Not currentStaticVariantSelection.item("Processed") Then
                        
                        Dim possibleJobs As collection
                        Set possibleJobs = PlaceFile.findStaticVariantJobs(currentStaticVariantSelection(1), currentStaticVariantSelection(2))
                        
                        Dim j As Integer
                        For j = 1 To possibleJobs.count
                            
                            Dim currentPossibleJob As PlaceFileJob
                            Set currentPossibleJob = possibleJobs(j)
                            
                            Dim dummyStaticVariant As New variante
                            dummyStaticVariant.newStaticVariantFromName (currentPossibleJob.getGroupName)
                            
                            ' Es werden einfach alle Pfade ausprobiert
                            Dim possiblePath As String
                            possiblePath = excelDesignInfo.designFiles.getAmazonImportStaticVariantFilePath(dummyStaticVariant, layersThatHaveStaticVariantsIndex) & ".cdr"
                            
                            
                            If Globals.fileExist(possiblePath) Then
                                pathOfStaticVariantCDR = possiblePath
                                Set variantOfStaticVariantCDR = dummyStaticVariant
                                GoTo pathOfStaticVariantCDRFound
                            End If
                            
                            ' Masterdesign nach statischer Variante prüfen
                            Dim possibleMasterDesignPath As String
                            possibleMasterDesignPath = masterDesignFiles.getAmazonImportStaticVariantFilePath(dummyStaticVariant, layersThatHaveStaticVariantsIndex) & ".cdr"
                            
                            If Globals.fileExist(possibleMasterDesignPath) Then
                                pathOfStaticVariantCDR = possibleMasterDesignPath
                                Set variantOfStaticVariantCDR = dummyStaticVariant
                                GoTo pathOfStaticVariantCDRFound
                            End If
                            
                            Set dummyStaticVariant = Nothing
                            Set currentPossibleJob = Nothing
                        Next j
                        
                        Set possibleJobs = Nothing
                    End If
                    
                    Set currentStaticVariantSelection = Nothing
                Next s
pathOfStaticVariantCDRFound:
                
                
                If Not pathOfStaticVariantCDR = "" Then
                    
                    Dim c As Integer
                    For c = 1 To staticVariantContainers.count
                        
                        Dim currentContainer As shape
                        Set currentContainer = staticVariantContainers(c)
                        
                        If startsWith(currentContainer.name, "varCont(" & variantOfStaticVariantCDR.getShapeNameWithoutOtherTags) Then
                            Dim loadedStaticVariant As shape
                            Set loadedStaticVariant = Globals.loadCDR(pathOfStaticVariantCDR)
                            
                            loadedStaticVariant.OrderFrontOf currentContainer
                            currentContainer.delete
                        End If
                        
                        Set currentContainer = Nothing
                    Next c
                    
                End If

                
                ' Diesen Layer mitzählen, wenn er statische Varianten (Container) hatte
                If staticVariantContainers.count > 0 Then layersThatHaveStaticVariantsIndex = layersThatHaveStaticVariantsIndex + 1
                Set staticVariantContainers = Nothing
                Set currentLayer = Nothing
            Next a
            
            Set currentPart = Nothing
        Next p
    Next v
    
    
    logger.removeTab
End Function





' Wenn Text erstellt wurde und man ein Schlüsselanhänger mit 2 Parts hat, kann man anhand der Position des Textes herausfinden, auf welchem Layer von welchem Part der Text platziert wurde
Private Function getDesignLayerForPlacedKonfiElement(element As shape, view As ProductDesignPartRange) As ProductDesignLayer
    
    Dim p As Integer
    Dim l As Integer
    
    For p = 1 To view.count
        
        Dim currentPart As ProductDesignPart
        Set currentPart = view.getPart(p)
        
        For l = 1 To currentPart.layers.count
            Dim currentLayer As ProductDesignLayer
            Set currentLayer = currentPart.layers.getLayer(l)
            
            ' TODO nicht nach Layer suchen, sondern den DesignLayer nehmen. Der Layer welcher als Designlayer markiert wurde (sobald vefügbar durch Codeändereung oben)
            
            If Globals.areRectanglesOverlapping(currentLayer.layerShape.boundingBox, element.boundingBox) Then
                Set getDesignLayerForPlacedKonfiElement = currentLayer
                Exit Function
            End If
            
            Set currentLayer = Nothing
        Next l
        
        Set currentPart = Nothing
    Next p
    
    ' Wenn kein passender Layer gefunden wurde, einfach den ersten aus dem ersten Part der View nehmen
    Set getDesignLayerForPlacedKonfiElement = view.getPart(1).layers.getLayer(1)
End Function





Private Function loadDesignCDRAndPrepare(path As String, designInfo As AmazonExcelDesignInfo, masterDesignFiles As FSDesignFiles) As productDesign
    
    
    logger.logFINE "[AmazonImport.loadDesignCDRAndPrepare] Öffne Design CDR und bereite vor. Path: '" & path & "'"
    logger.addTab
    
    If Not Globals.fileExist(path) Then
        Err.Raise vbObjectError + 513, , "Die Datei '" & path & "' exestiert nicht! [AmazonImport.loadDesignCDRAndPrepare]"
    End If
    
    ' Hat das Design eine Schablone, wird es direkt in das Dokument der Schablone geladen
    If Not designInfo.template Is Nothing Then
        designInfo.template.doc.Activate
        Globals.loadCDR path
    
    ' Ist es das erste Design ohne Schablone dieses Konfis, dann wird das Design als neues Dokument geöffnet ...
    ElseIf runWorkDoc Is Nothing Then
        Application.OpenDocumentAsCopy path
        ActiveDocument.name = Globals.getFolderFileAndType(path)(1)
        Set runWorkDoc = ActiveDocument
    Else
    ' ... ansonsten wird es in das Dokument mit dem ersten Design ohne Schablone dieses Konfis reingeladen
        runWorkDoc.Activate
        Globals.loadCDR path
        '    OpenDocument path
    End If
    
   
    
    ActiveDocument.unit = cdrPixel
    
    'TODO kleine Kreuze löschen, da sie beim Amazonexport gelöscht wurden
    
    Dim design As New productDesign
    design.newProductDesign ActiveLayer.shapes.First
   
   
   
    ' Musterdesign hinzuladen, wenn vorhanden
    ' (Das Masterdesign für den AmazonImport. Nicht zu verwechseln mit dem normalen Masterdesign)
    ' -----------------------------
    
    If masterDesignFiles.hasAmazonImportCDR Then
        
        Dim masterDesign As New productDesign
        Dim masterDesignShape As shape
        Set masterDesignShape = Globals.loadCDR(masterDesignFiles.getAmazonImportCDRPath)
        logger.logINFO "Masterdesign geladen: '" & masterDesignFiles.getAmazonImportCDRPath & "'"
        Globals.markShapeAsTemporary masterDesignShape
        masterDesign.newProductDesign masterDesignShape
        masterDesign.transferMasterDesignToDesign design
    Else
        logger.logINFO "Das Masterdesign wurde unter folgendem Pfad nicht gefunden: '" & masterDesignFiles.getAmazonImportCDRPath & "'"
    End If
    ' -----------------------------
   
    Set loadDesignCDRAndPrepare = design
    logger.removeTab
End Function



Private Function cutDesignBleedToDefaultSize(design As productDesign)
    
    Dim i As Integer
    Dim j As Integer
    
    If GlobalSettingsUserForm.getSetting_CutUVProductsToDefaultBleedSize Then
        
        For i = 1 To design.getPartsCount
            Dim currPart As ProductDesignPart
            Set currPart = design.getPart(i)
            
            For j = 1 To currPart.layers.count
                Dim currLayer As ProductDesignLayer
                Set currLayer = currPart.getLayer(j)
                
                ' Nur bei UV Produkten machen
                If Not currLayer.isGraving Then
                    currLayer.setBleedSizeInMM Globals.getDefaultBleedSizeInMM
                End If
                
                Set currLayer = Nothing
            Next j
            
            Set currPart = Nothing
        Next i
        
    End If
    
End Function



' QUICKFIX 'designInfoWithScaleInfo' ist nur ein quickfix, damit man auch andere Views mit der Größenauswahl des Kunden aus einer anderen View skalieren kann
' Die 'mainExcelDesignInfo' ist die Info aus der Excel für die erste View. Es ist die Zeile in der Excel mit der passenden ASIN
Private Function scaleDesign(design As productDesign, mainExcelDesignInfo As AmazonExcelDesignInfo, excelDesignInfo As AmazonExcelDesignInfo, excelDesignInfoWithSizeSelection As AmazonExcelDesignInfo)  ', sortedView As AmazonImportSortedView)
    
    logger.addTab , "[AmazonImport.scaleDesign]"
    
     Dim v As Integer
     Dim k As Integer
    
    ' Designpart(s) wird/werden auf die Größe gesetzt, die der Kunde im Konfi ausgewählt hat
    ' ------------------------------------------------------------------------
    ' Hier bestimmt die erste (die Haupt) ExcelDesignInfo, bzw. die erste View, ob auch alle anderen Views dieser Bestellung auf die Größenauswahl des Kunden skaliert werden sollen
    ' Das macht momentan noch Sinn. Kann aber wieder so umgestellt werden, dass die View 'excelDesignInfo' selbst bestimmt, ob sie auf die Größenauswahl des Kunden skaliert wird
    If mainExcelDesignInfo.isDesignNeedingScaling Then
        logger.logINFO "Design soll skaliert werden"
        
        ' Jedes Part einzeln durchgehen, da jedes Part in einer anderen View mit einer anderen Größenauswahl des Kunden sein kann
        For v = 1 To excelDesignInfo.getJSONViewsSize
            
            Dim jsonView As AmazonImportJSONView
            Set jsonView = excelDesignInfo.getJSONView(v) ' TODO so ist es eigentlich richtig. Jede View bestimmt selbst, wie groß die Parts sind
'            Set jsonView = excelDesignInfo.getViewWithSizeSelection  ' Hier wird einfach die VIew genommen, bei der eine Größenangabe gefunden wird. Das skaliert dann alle Views gleichermaßen. Machte Sinn bei den Weihnachtsanhängern
            
            If Not jsonView Is Nothing Then
                
                Dim newSizeStr As String
                
                For k = 1 To jsonView.getPartsCount
                    Dim viewPart As ProductDesignPart
                    Set viewPart = jsonView.getPart(k)
                    
                    ' Prüfen, ob das Design, welches skaliert werden soll in der 'jsonView' vorkommt, bzw. ob eines der Parts vom Design darin vorkommt.
                    If viewPart.getDesign Is design Then
                        
                        Dim viewWithSizeSelection As AmazonImportJSONView
                        ' Nur wenn bereits eine ExcelDesignInfo mit einer JSONView mit einer Größenauswahl verarbeitet wurde exestiert 'excelDesignInfoWithSizeSelection'
                        If Not excelDesignInfoWithSizeSelection Is Nothing Then
                            Set viewWithSizeSelection = excelDesignInfoWithSizeSelection.getViewWithSizeSelection
                        End If
                        
                        newSizeStr = scaleDesignPart(viewPart, jsonView, excelDesignInfo, viewWithSizeSelection)
                    End If
                    
                    Set viewPart = Nothing
                Next k
                
                If Not newSizeStr = "" Then
                    ' Neue Größe im Dokumenten-Name angeben
                    ActiveDocument.name = "(" & newSizeStr & ")" & ActiveDocument.name
                End If
                
            End If
            
        Next v
    End If
    ' ------------------------------------------------------------------------
    
    logger.removeTab
End Function


Private Function scaleDesignPart(part As ProductDesignPart, jsonView As AmazonImportJSONView, excelDesignInfo As AmazonExcelDesignInfo, Optional jsonViewWithSizeSelection As AmazonImportJSONView) As String
    
    logger.addTab , "[AmazonImport.scaleDesignPart]"
    
    Dim scaleToWidth As Double
    scaleToWidth = jsonView.excelDesignInfo.scaleToWidth
    If Not jsonViewWithSizeSelection Is Nothing Then
        If Not jsonViewWithSizeSelection.getSizeSelectionWidth(logger) = 0 Then
            scaleToWidth = jsonViewWithSizeSelection.getSizeSelectionWidth() ' Überschreibt die Größenskalierungsangabe aus der Excel
        End If
    End If
    
    logger.logINFO "Breite auf die skaliert werden soll: '" & scaleToWidth & "'"
    
    If Not scaleToWidth = 0 Then
    
        Dim mainShapes As shapeRange
        Set mainShapes = part.getLayersMainShapes
        
        Dim aspectRatio As Double
        aspectRatio = mainShapes.SizeHeight / mainShapes.SizeWidth
        
        Dim scaleToHeight As Double
        scaleToHeight = aspectRatio * scaleToWidth
        
        Dim scalingApplied As Boolean
        scalingApplied = part.scalePart(ActiveDocument.ToUnits(scaleToWidth, cdrCentimeter), _
            ActiveDocument.ToUnits(scaleToHeight, cdrCentimeter), _
            False, True, logger)
        
        If scalingApplied Then
            scaleDesignPart = CStr(scaleToWidth) & "x" & CStr(scaleToHeight) ' Skalierungswert zurückgeben
        End If
        
        ' Wenn eine Schablone vorhanden ist (für dieses Design oder das Dokument), nicht die Dokumentengröße ändern
        If excelDesignInfo.template Is Nothing Then
            Export2.fitDocumentAndDesignForAmazonKonfiExport part.getDesign
        End If
    End If
    
    
    logger.removeTab
End Function




Public Function prepareView(view As AmazonImportSortedView) 'parts As collection, viewLayersShapesFlattened As shapeRange, shapeRangeForViewFitting As shapeRange)
    
    logger.addTab , "[AmazonImport.prepareView]"
    
    
    Dim shapesForViewFitting As shapeRange
    Set shapesForViewFitting = view.getShapesForViewFitting(logger)
    
    ' Prüfung: Sind die Formen die zum Einpassen genutzt werden (shapeRangeForViewFitting)
    ' Breiter oder Höher.
    If view.getShapesForViewFitting(logger).SizeWidth > view.getShapesForViewFitting.SizeHeight Then
        ' 380 ist die Konfigröße(400) - Padding(10 * 2Seiten)
        ' scaleSetting sagt aus, wie groß angaben von Amazon (zB.: Textpositon) skaliert werden müssen, um zum Produkt in Echtgröße zu passen
        scaleSetting = AmazonExport.getAmazonKonfiSizeWithoutPadding / view.getShapesForViewFitting.SizeWidth
    Else
        scaleSetting = AmazonExport.getAmazonKonfiSizeWithoutPadding / view.getShapesForViewFitting.SizeHeight
    End If
    
    logger.logFINE "scaleSetting (Skalierungsfaktor): " & scaleSetting
    
    ' paddingXKonfi sagt aus, wieviel Platz die Formen vom Produkt zum Einpassen haben würden, wenn das Produkt auf Größe des Konfis währe (produktgröße * scaleSetting)
    paddingXKonfi = (AmazonExport.getAmazonKonfiSize - view.getShapesForViewFitting.SizeWidth * scaleSetting) / 2
    paddingYKonfi = (AmazonExport.getAmazonKonfiSize - view.getShapesForViewFitting.SizeHeight * scaleSetting) / 2
    
    logger.logFINE "paddingXKonfi: " & paddingXKonfi
    logger.logFINE "paddingYKonfi: " & paddingYKonfi
    
    Set uploadBoxes = newCustomShapeTypeQuery(view.getLayerShapes, customShapeType.ConfiUploadBoxCutForImportShapeType).setExcludeGivenShape(True).search
    
    logger.removeTab
End Function



Public Function processTexts(currentSortedView As AmazonImportSortedView, firstPartOfView As ProductDesignPart)
    
    Dim textBoxes As New shapeRange
    textBoxes.AddRange newCustomShapeTypeQuery(currentSortedView.getLayerShapes, ParagraphText).search
    
    Dim k As Integer
    Dim i As Integer
    Dim h As Integer
    Dim m As Integer
    
    For k = 1 To currentSortedView.getJSONViewDataCount
        For i = 1 To currentSortedView.getJSONViewData(k).textContainers.count

            ' "type": "ContainerCustomization",
            ' "name": "Texteingabe",
            ' "children": [{
            Dim textChildren() As Variant
            textChildren = currentSortedView.getJSONViewData(k).textContainers(i).item("children")

            Dim fontCustomization As Dictionary
            Dim colorCustomization As Dictionary

            Dim textFields() As Variant

            For h = 0 To UBound(textChildren)
                Dim textPropertyType As String
                textPropertyType = textChildren(h).item("type")

                '"type": "FontCustomization",
                If textPropertyType = "FontCustomization" Then
                    Set fontCustomization = textChildren(h)

                '"type": "ColorCustomization",
                ElseIf textPropertyType = "ColorCustomization" Then
                    Set colorCustomization = textChildren(h)

                ' "type": "ContainerCustomization",
                '      "children": [{
                ElseIf textPropertyType = "ContainerCustomization" Then
                    textFields = textChildren(h).item("children")
                End If
                
            Next h
            
            
            
            For m = 0 To UBound(textFields)
                'MsgBox "" & textFields.Item("children")(0).Item("label")

                processText textFields(m), fontCustomization, colorCustomization, currentSortedView, m, firstPartOfView.getDesign, textBoxes, currentSortedView.getParts

            Next m

        Next i
    Next k
    
    
    ' Leer gebliebene Textboxen löschen
    For k = textBoxes.count To 1 Step -1
        If textBoxes(k).text.Story.text = "" Then
            textBoxes(k).delete
        End If
    Next k
    
End Function



Public Function processText(ByVal placementContainerCustomization As Dictionary, fontCustomization As Dictionary, colorCustomization As Dictionary, sortedView As AmazonImportSortedView, _
        ByVal textIndex As Integer, ByVal design As productDesign, textBoxes As shapeRange, view As ProductDesignPartRange) As shape
    
    logger.logINFO "[AmazonImport.processText] textBoxes: '" & Globals.getShapeRangeDisplayNames(textBoxes, , False, True) & "'"
    logger.addTab
    
    
    
    ' Text extrahieren
    ' --------------------------------
    Dim text As String
    Dim pCCFirstChild As Variant
    Set pCCFirstChild = placementContainerCustomization.item("children")(0)
    
    ' Neu bei Amazon. Zuerst gesehen am 27.03.2023
    ' Wenn das Feld 'type'
    If pCCFirstChild.item("type") = "FlatRatePriceDeltaContainerCustomization" Then
    
'           vvv pCCFirstChild
'
'        "children" : [ {
'                "type" : "FlatRatePriceDeltaContainerCustomization",
'                "children" : [ {
'                  "type" : "TextCustomization",
'                  "name" : "",
'                  "label" : "Text 1",
'                  "inputValue" : "Quiana"  <<<<<<       vvvvv
        text = pCCFirstChild.item("children")(0).item("inputValue")
    Else
        text = pCCFirstChild.item("inputValue")
    End If
    
    If Globals.removeWhiteSpace(text) = "" Then
        ' Wenn der Amazontext eine Textbox ist..
        If Not isCustomerTextFreeTextOrTextBox(placementContainerCustomization) Then
            Dim textBoxToDelete As shape
            Set textBoxToDelete = getTextBoxFromDesign(textBoxes) 'Wenn das Design eine Textbox für diesen leeren Text hat ...
            If Not textBoxToDelete Is Nothing Then
                textBoxToDelete.delete ' ... dann wird die Textbox gelöscht, damit der nächste Text auch in die nächste Textbox kommt und nicht in diese
                logger.logINFO "Textbox gelöscht, da der Text für diese Textbox leer ist!"
            End If
        End If
        
        logger.logINFO "Text ist leer. Abbruch!"
        GoTo ExitFunction
    End If
    
    logger.logINFO "Text: '" & text & "'"
    ' --------------------------------
    
    
    ' Falsches \n 'Chr(10)' mit vbNewLine tauschen, sonst gibt's keine Umbrüche
    text = replace(text, Chr(10), ChrW(&H200B) & vbNewLine & ChrW(&H200B))
    
    text = replacePlusSignAndDateWithCrossAndDate(text)
    
    text = reverseArabicTextDirection(text)
    
    Dim textShape As shape
    Dim textIsTextBoxFromDesign As Boolean
    Dim placeCustomerTextInSpaces As Boolean ' Kundentext in die Leerzeichen setzen (Kan zuerst bei den Definitions Wandbildern vor)
    
    
    ' Textform erstellen oder vom Design nehmen
    ' --------------------------------------------------------
    ' Wenn es in der Excel als ein Konfi vom Typ 2 angegeben ist, wo der Kunde nur Text eingeben aber nicht verschieben kann
    ' ODER wenn im JSON Element 'placementContainerCustomization' eine Kundenplatzierung 'buyerPlacement' für den Text vorhanden ist,
    ' dann ist es ein freier Text
    If isCustomerTextFreeTextOrTextBox(placementContainerCustomization) Then
        ' Freier Text
        Set textShape = ActiveLayer.CreateArtisticText(0, 0, "Text")
        logger.logINFO "Freier Text erstellt"
    Else
        ' Textbox
        
        ' Leerzeichen am Anfang und Ende abschneiden, denn durch Leerzeichen wird der Text kleiner in der Textbox
        text = LTrim(RTrim(text))
        
        ' Wenn das Design noch freie Textboxen hat, diese verwenden. Ansonsten neue erstellen
        If textBoxes.count > 0 Then
            Set textShape = getTextBoxFromDesign(textBoxes)
            
            textIsTextBoxFromDesign = True
            placeCustomerTextInSpaces = Globals.isShapeAmazonCustomerTextInBlanksKeyWord(textShape)
            logger.logINFO "Textbox aus dem Design genommen: '" & Globals.getShapeDisplayName(textShape) & "', Kundentext in die Leerzeichen platzieren: '" & placeCustomerTextInSpaces & "'"
        Else
            Set textShape = ActiveLayer.CreateParagraphText(0, 0, 2000, 2000, "Text", , , , 10)
            logger.logINFO "Textbox erstellt"
        End If
    End If
    ' --------------------------------------------------------
    
    
    
    ' Textausrichtung: mittig
    ' -----------------------------------
    If Not textIsTextBoxFromDesign Then
        textShape.text.Story.alignment = cdrCenterAlignment
    End If
    ' -----------------------------------
    
    
    
    ' Text setzen
    ' -----------------------------------
    If placeCustomerTextInSpaces Then
        textShape.text.Story.text = inserTextInSpaces(textShape.text.Story.text, text)
    Else
        ' ChrW(&H200B) ist der Unicode für ein 'Zero Width Space'. Diese muss am Ende und am Anfang jeder Zeile stehen, da es sein kann, dass die Zeile mit Leerzeichen beginnt/endet, welche Corel dann ignortiert(visuell).
        ' Damit das verhindert wird, wird als erstes & letztes Zeichen der 'Zero Width Space' genutzt. Somit denkt Corel es ist ein Buchstabe und die Zeile endet nicht mit abzuschneidenden Leerzeichen
        text = ChrW(ZERO_WIDTH_SPACE_UNICODE) & text & ChrW(ZERO_WIDTH_SPACE_UNICODE)
        textShape.text.Story.text = text
    End If
    ' -----------------------------------
    
    
    
    
    ' Schriftart setzen
    ' -----------------------------------
    Dim fontFamily As String
    fontFamily = fontCustomization.item("fontSelection").item("family")
    'fontFamily = "Parisienne" 'DEBUG
    If Not fontFamily = "" Then
        
        Dim bold As Boolean
        bold = Globals.endsWith(fontFamily, "Bold")
        
        fontFamily = getFontAlias(fontFamily)
        
'        textShape.text.Story.font = fontFamily ' A
        Globals.setTextShapeFont textShape, fontFamily, True, logger, True
        
        
        ' Manche Schriften, wie 'Copperplate Gothic' hängen den Schriftstil hinter den Schriftnamen.
        ' Solche Schriften kann man einfach per Name in Corel für ein Text setzen (Schriftname im Schriftauswahlfeld eintippen)
        '
        ' Die meisten Schriften wie die 'Century Gothic' nutzen für alle Schriftstile den selben Schriftnamen 'Century Gothic'
        ' Bei denen muss der Stil nach setzen des Namen eingestellt werden
        
        'TODO Bold und andere Fontstyles hier setzen
        If bold Then 'TODO TEST CODE
            textShape.text.Story.Style = cdrBoldFontStyle
        End If
        
        
'        Dim styleBefore As cdrFontStyle
'        styleBefore = textShape.Text.Story.Style
        
        ' Neu in Version 16.1.3
        ' Wenn der Style größer als 15 (ab 16 beginnen andere Styles wie cdrMixedFontStyle) ist, kommt hier ein Fehler. Deshalb der Check
        If textShape.text.Story.Style < 16 Then
            'Beim erneuten setzen des Styles (z.B. Bold), prüft Corel, ob die Font den Schriftschnitt überhaupt hat. Wenn nicht, wird der Style auf Normal gesetzt (0)
            textShape.text.Story.Style = textShape.text.Story.Style
        End If
        
'        'Style wurde geändert
'        If Not styleBefore = textShape.Text.Story.Style Then
'            textShape.Text.Story.Bold = False
'        End If
    End If
    ' -----------------------------------
    
    
    
    
    
    
    ' Unicodes korrigieren
    Globals.correctTextUnicodes textShape
    
    
    
    ' Transformation
    ' ------------------------------------------
    If textIsTextBoxFromDesign Then
        
        If Globals.isShapeAmazonMultiLineTextBoxKeyWord(textShape) Then
            If textShape.text.Overflow Then
                textShape.text.FitTextToFrame
            End If
        Else
            fitTextToTextBox textShape
        End If
        
    ElseIf KonfiType = 2 Then
        
        applyTransformToTextShapeForKonfiType2 textShape, textIndex, design
        
    Else
    
        ' Ein Text, den der Kunde im Konfi frei bewegen konnte
        If placementContainerCustomization.Exists("buyerPlacement") Then
        
            Dim buyerPlacement As Dictionary
            Set buyerPlacement = placementContainerCustomization.item("buyerPlacement")
        
            applyTransformToTextShapeWithBuyerPlacement textShape, sortedView.getShapesForViewFitting, buyerPlacement
        
        
        Else ' Ein Text, der an einer festen Position mit einem Rahmen im Konfi war
            
            applyTransformToTextShape textShape, placementContainerCustomization, sortedView.getShapesForViewFitting
            
        End If
    End If
    ' ------------------------------------------
    
    
    
    
    
    
    ' Textbox umwandeln
    ' ------------------------------------------
    ' Nach dem Transformieren Boxentext zu normalen Text umwandeln, da dieser sich besser verschieben und skalieren lässt
    If Not textShape.text.IsArtisticText Then
        textShape.text.ConvertToArtistic
    End If
    ' ------------------------------------------
    
    
    
    Dim layer As ProductDesignLayer
    Set layer = getDesignLayerForPlacedKonfiElement(textShape, view)
    
    
    
    ' Weiße Hinterlegung RDG_White
    ' ------------------------------------------
    Dim shapeToOrder As shape
    Set shapeToOrder = textShape
'    logger.logINFO "Weiße Hinterlegung:"
'    If Not layer.isGraving Then
'        If layer.getGroundPlate Is Nothing Then
'            If layer.getBackgroundShapes.count = 0 Then
'
'
'                Dim textShapeWhite As shape
'                Set textShapeWhite = Globals.copyPasteShape(textShape, False)
'                textShapeWhite.fill.ApplyUniformFill Globals.getRGDWhite
'                textShapeWhite.OrderBackOf textShape
'                textShapeWhite.name = "RDG_White"
'
'                Dim textShapeAndTextShapeWhite As New shapeRange
'                textShapeAndTextShapeWhite.add textShapeWhite
'                textShapeAndTextShapeWhite.add textShape
'
'                textShapeAndTextShapeWhite.CreateSelection
''                Set shapeToOrder = Globals.groupShapes(textShapeAndTextShapeWhite)
'                Dim textGroup As shape
'                Set textGroup = textShapeAndTextShapeWhite.group ' FUNKTIONIERT nicht :(
'                Set shapeToOrder = textGroup
'
'                textGroup.name = "Text mit RDG_White"
'
'                Set textShapeAndTextShapeWhite = Nothing
'                Set textShapeWhite = Nothing
'            Else
'                logger.logINFO "- Nicht nötig, da der Layer mind. einen vollflächigen Hintergrund hat: " & Globals.collectionToMultiLineStr(getShapesDisplayName(layer.getBackgroundShapes))
'            End If
'        Else
'            logger.logINFO "- Nicht nötig, da der Layer eine Grundplatte hat"
'        End If
'    Else
'        logger.logINFO "- Nicht nötig, da der Layer nicht UV ist"
'    End If
'    ' ------------------------------------------
    
    ' Ordern
    ' ------------------------------------------
    shapeToOrder.OrderFrontOf layer.layerShape.shapes.First
    ' ------------------------------------------
    
    
    
    ' Textfarbe
    ' ------------------------------------------
    If Not Globals.isShapeAmazonIgnoreCustomerColor(textShape) Then

        Dim fill As String
        fill = colorCustomization.item("colorSelection").item("value")
        fill = LCase(fill)

        logger.logFINE "Textfarbe soll nicht ignoriert werden. Kunden-Farbe: '" & fill & "'"

        Dim shapeToFill As shape


        If Globals.isRDGWhite(textShape.text.Story.fill.UniformColor) Then
            If StrComp(fill, "#ffffff") = 0 Then
                Set shapeToFill = Nothing ' Die Farbe weiß (#ffffff) ist das selbe wie RDG_White("#9B9493")
            Else

                Set shapeToFill = Globals.copyPasteShape(textShape, True) ' Text muss kopiert werden, da hinten weiß(RDG_White) bleiben soll, und vorne die Kundenfarbe
            End If

        Else
            Set shapeToFill = textShape
        End If


        If Not shapeToFill Is Nothing Then
            If fill = "#000000" Then
                shapeToFill.text.Story.fill.ApplyUniformFill CreateCMYKColor(0, 0, 0, 100)
            Else
                If LCase(fill) = "#ffffff" And Not layer.isGraving Then
                        
                    ' Falls sich hinter dem Text nichts befindent und der Text für den Druck ist und der Text weiß sein soll,
                    ' dann wird der Text in RDG_White gefärbt, denn normales Weiß wird nicht gedruckt (ist dann sichtbar auf klarem Acryl)
                    If Not layer.isShapeIntersectingWithOther(shapeToFill, , False, True) Then
                        shapeToFill.text.Story.fill.ApplyUniformFill Globals.getRGDWhite
                        GoTo DontFillText
                    Else
                        GoTo FillText
                    End If
                Else
                    GoTo FillText
                End If
                
FillText:
                shapeToFill.text.Story.fill.ApplyUniformFill CreateColor(fill)
DontFillText:
            End If
        End If
    Else
        logger.logFINE "Textfarbe soll ignoriert werden"
    End If
    ' ------------------------------------------

    
    logger.logINFO "Text am Ende: '" & textShape.text.Story.text & "'"
    
    
    'MsgBox "a=" & CStr(textShape.text.Story.Range(0, textShape.text.Story.Characters.Count - 1).TextLineRects.BoundingBox.width)
ExitFunction:
    Set processText = textShape
    logger.removeTab
End Function


Private Function isCustomerTextFreeTextOrTextBox(placementContainerCustomization As Dictionary) As Boolean
    ' Wenn es in der Excel als ein Konfi vom Typ 2 angegeben ist, wo der Kunde nur Text eingeben aber nicht verschieben kann
    ' ODER wenn im JSON Element 'placementContainerCustomization' eine Kundenplatzierung 'buyerPlacement' für den Text vorhanden ist,
    ' dann ist es ein freier Text
    isCustomerTextFreeTextOrTextBox = (KonfiType = 2 Or placementContainerCustomization.Exists("buyerPlacement"))
End Function


Public Function getTextBoxFromDesign(textBoxes As shapeRange) As shape
    Dim textShape As shape
    
     ' Wenn das Design noch freie Textboxen hat, diese verwenden. Ansonsten neue erstellen
    If textBoxes.count > 0 Then
        Set textShape = textBoxes.firstShape
        textBoxes.Remove 1
    End If
    
    Set getTextBoxFromDesign = textShape
End Function



' Kehrt die Reihenfolge von arabischen Texten um.
' Die Richtung der Buchstaben ist bereits richtig, aber die Wörter haben die falsche Reihenfolge.
' Bei einem Wort fällt das also nicht auf
Private Function reverseArabicTextDirection(ByVal text As String) As String
    
    logger.addTab , "[AmazonImport.reverseArabicTextDirection]"
    
    Dim w As Integer
    Dim i As Integer
    
    If Not Globals.isStringHavingArabicChar(text) Then
        GoTo ExitFunction
    End If
    
    setDummyTextText text

    
    Dim words As collection
    Set words = Globals.getWords(text)
    
    ' Im folgenden Beispiel ist der arabische Text zwar in der richtigen Buchstaben-Reihenfolge. Die Wörter sind jedoch falsch herum.
    ' Das gilt aber immer nur für Wortpaare (2 oder mehr Wörter).
    ' Beispieltext:
    ' "Hallo TEXT ARABISCHER wie gehts TEXT ARABISCHER"
    ' Richtig währe es:
    ' "Hallo ARABISCHER TEXT wie gehts ARABISCHER TEXT"
    
    
    ' Folge von einen oder mehreren Arabischen Wörtern, die aufeinander Folgen und nicht durch andere Wörter unterbrochen sind
    Dim currentArabicWordsIndexiesInARow As New collection
    
    ' Suche nach arabischen Wörter-Folgen
    For w = 1 To words.count
        
        Dim word As StringWord
        Set word = words(w)
        
        logger.logFINE "current word: '" & word.text & "'"
        
        Dim isCurrentWordArabic As Boolean
        
        If Globals.isStringHavingArabicChar(word.text) Then
            ' Arabisches Wort gefunden. Index vom Wort in der Liste merken
            currentArabicWordsIndexiesInARow.add w
            isCurrentWordArabic = True
        End If
        
        Dim isLastWord As Boolean
        isLastWord = w = words.count
        
        If Not isCurrentWordArabic Or isLastWord Then
            ' Nur bei mind. 2 Wörtern kann gespiegelt werden
            If currentArabicWordsIndexiesInARow.count > 1 Then
                text = changeWordsOrder(text, currentArabicWordsIndexiesInARow, words)
            Else
                Set currentArabicWordsIndexiesInARow = New collection
            End If
            
            If currentArabicWordsIndexiesInARow.count = 0 Then
                Set currentArabicWordsIndexiesInARow = New collection
            End If
        End If
        
        Set word = Nothing
    Next w
    
    
    
    
    ' Arabisches Komma spiegeln
    ' Falls es am Ende eines Wortes steht, an den Anfang vom Wort packen ( Achtung in VisualStudioCode und anderen Texteditoren wird das Komma Am Anfang angezeigt)
    ' --------------------------------------------
    For i = 1 To Len(text)
        
        Dim charr As String
        charr = Globals.getCharOfString(text, (i))
        
        If charr = getArabicComma Then
            ' Wenn ein arabisches Komma gefunden wurde, suchen wir das Wort, an dem das Komma dran steckt
            For w = 1 To words.count
                Set word = words(w)
                
                ' Komma hängt hinten am aktuellen Wort
                If i = word.ending Then
                    
                    Dim theWord As New StringWord
                    theWord.begin = word.begin
                    theWord.ending = word.ending - 1
                    theWord.parentString = text
                    
                    Dim arabicCommaWord As New StringWord
                    arabicCommaWord.begin = i
                    arabicCommaWord.ending = i
                    arabicCommaWord.parentString = text
                    
                    text = replaceWords(text, theWord, arabicCommaWord)
                    
                    Set words = Globals.getWords(text)
                    
                    Set theWord = Nothing
                    Set arabicCommaWord = Nothing
                    
                End If
                
                Set word = Nothing
            Next w
        End If
    Next i
    ' --------------------------------------------
    
    
ExitFunction:
    reverseArabicTextDirection = text
    logger.removeTab
End Function


Private Function getArabicComma() As String
    getArabicComma = ChrW(&H60C)  ' Unicode für arabisches Dezimalkomma
End Function


Private Function changeWordsOrder(ByVal text As String, wordIndexies As collection, ByRef words As collection) As String
    
    logger.addTab , "[AmazonImport.changeWordsOrder] text: '" & text & "'"
    
    ' Um die Reihenfolge der Wörter zu tauschen, muss erstmal die "mitte" der Spiegelung ermittelt werden
    ' Bei 4 Wörtern währe die Mitte zwischen 2 & 3. Die Mitte kann man sich wie ein Spiegel vorstellen:
    ' 1 2 | 3 4
    ' Wenn man jedoch 3 Wörter hat, ist die Mitte ein Wort selbst, welches dann nicht mit einem anderen Wort gespiegelt wird:
    ' 1 2 3
    ' Die Variable 'wordsToMirror' bestimmt, wie viele Wörter gespiegelt werden müssen.
    ' Bei 4 Wörtern sind es nur 2 Wörter, welche jeweils mit 2 gegenüberliegenden Wörtern gespiegelt werden
    ' Bei 3 Wörtern ist es nur ein Wort ...
    Dim wordsToMirror As Integer
    wordsToMirror = Int(wordIndexies.count / 2) ' ... denn 3 / 2 = 1,5 => Integer casting => 1
    
    logger.logFINER "words: '" & words.count & "', wordsToMirror: '" & wordsToMirror & "', wordIndexies: '" & wordIndexies.count & "'"
    
    Dim i As Integer
    For i = 1 To wordsToMirror
        ' Das gegenüberliegende Wort vom aktuellen Wort mit dem Index 'i'.
        ' Bei 4 Wörtern währe das gegenüberliegende Wort 1 das 4. Wort
        Dim oppositeWordInMirrorIndex As Integer
        oppositeWordInMirrorIndex = wordIndexies.count - (i - 1)
        
        text = replaceWordsByIndex(text, wordIndexies(i), oppositeWordInMirrorIndex, words)
        logger.logFINE "text: '" & text & "'"
        Set words = Globals.getWords(text) ' Erneuern, da sich Wörter getauscht haben
        logger.logFINE "Words: " & vbNewLine & Globals.wordCollectionToMultiLineStr(words, "'", "'")
    Next i
    
    changeWordsOrder = text
    logger.removeTab
End Function




Private Function replaceWordsByIndex(ByVal text As String, sourceWordIndex As Integer, targetWordIndex As Integer, words As collection) As String
    
    logger.addTab , "[AmazonImport.replaceWordsByIndex] text: '" & text & "'"
    
    
    Dim sourceWord As StringWord
    Set sourceWord = words.item(sourceWordIndex)
    
    Dim targetWord As StringWord
    Set targetWord = words.item(targetWordIndex)
    
    replaceWordsByIndex = replaceWords(text, sourceWord, targetWord)
    
    logger.logINFO "text: '" & text & "'"
    
    logger.removeTab
End Function


Private Function replaceWords(ByVal text As String, sourceWord As StringWord, targetWord As StringWord) As String
    
    logger.addTab , "[AmazonImport.replaceWords] text: '" & text & "'"
    
    Dim sourceText As String
    
    Dim leftPart As String
    Dim middlePart As String
    Dim rightPart As String
    
    leftPart = subStr(text, 1, sourceWord.begin - 1)
    middlePart = subStr(text, sourceWord.ending + 1, targetWord.begin - 1)
    rightPart = subStr(text, targetWord.ending + 1, Len(text))
    
    logger.logINFO "leftPart: '" & leftPart & "'"
    logger.logINFO "targetWord: '" & targetWord.text & "'"
    logger.logINFO "middlePart: '" & middlePart & "'"
    logger.logINFO "sourceWord: '" & sourceWord.text & "'"
    logger.logINFO "rightPart: '" & rightPart & "'"
    
    text = leftPart & targetWord.text & middlePart & sourceWord.text & rightPart
    
    ' Linken Text tauschen
'    text = Globals.replaceWord(text, (sourceTextRange.start), (sourceTextRange.ending), targetWord)
    
    
'    Set targetTextRange = words.item(targetWordIndex)
'
'    ' Rechten Text tauschen
'    text = Globals.replaceWord(text, (targetTextRange.start), (targetTextRange.ending), sourceWord)
    
    replaceWords = text
    logger.removeTab
End Function
    


Public Sub TestReplacePlusSign()
'    MsgBox "Plussymbol zu Kreuz: " & replacePlusSignAndDateWithCrossAndDate("+29.04.1994")
    MsgBox "Plussymbol zu Kreuz: " & replacePlusSignAndDateWithCrossAndDate("Test123 +49123 Hallo +29.04.1994")
End Sub


' Bei Gedenkprodukten wird manchmal bei einem Todesdatum kein Kreuz sondern ein Pluszeichen angegeben.
' Diese Funktion wandelt das Pluszeichen zu einem Kreuz um
Private Function replacePlusSignAndDateWithCrossAndDate(ByVal text As String) As String
    
    Dim i As Integer
    For i = 1 To Len(text)
        
        Dim charr As String
        charr = Mid(text, i, 1)
        
        If charr = "+" Then
            
            ' Prüfen, ob nach dem Plus ein Datum kommt
            ' Bzw. nur der Anfang eines Datums also entweder eine Zahl und ein Punkt oder zwei Zahlen und ein Punkt
            If (IsNumeric(Globals.getCharOfStringOrNothing(text, i + 1)) And Globals.getCharOfStringOrNothing(text, i + 2) = ".") Or _
               (IsNumeric(Globals.getCharOfStringOrNothing(text, i + 1)) And IsNumeric(Globals.getCharOfStringOrNothing(text, i + 2)) And Globals.getCharOfStringOrNothing(text, i + 3) = ".") Then
                                
                text = left(text, i - 1) & ChrW(&H2020) & Right(text, Len(text) - i)
                
            End If
            
        End If
        
    Next i
    
    replacePlusSignAndDateWithCrossAndDate = text
    
End Function


Private Function inserTextInSpaces(textWithSpaces As String, textToInsert As String) As String
    
    Dim i As Integer
    
    If InStr(textWithSpaces, " ") Then
        
        
        ' Bereiche (Sections) ermittlen. Eine Bereich ist eine Reihenfolge mehrerer Leerzeichen
        Dim spacesSections As New collection
        Dim lastStartIndex As Integer
        Dim lastCharWasSpace As Boolean
        
        For i = 1 To Len(textWithSpaces)
            
            Dim character As String
            character = Mid(textWithSpaces, i, 1)
            
            If character = " " Then
                If Not lastCharWasSpace Then
                    lastStartIndex = i
                End If
                lastCharWasSpace = True
            Else
                If lastCharWasSpace Then
                    Dim startEnd As New collection
                    startEnd.add lastStartIndex
                    startEnd.add i - 1
                    spacesSections.add startEnd
                End If
                lastCharWasSpace = False
            End If
            
        Next i
        
        ' Längste Reihenfolge (Section) mit den meisten Leerzeichen finden
        Dim longestSpaceSectionIndex As Integer
        Dim longestSpaceSection As Integer
        For i = 1 To spacesSections.count
            Dim sectionLenght As Integer
            sectionLenght = spacesSections(i)(2) - spacesSections(i)(1)
            If sectionLenght > longestSpaceSection Then
                longestSpaceSection = sectionLenght
                longestSpaceSectionIndex = i
            End If
        Next i
        Dim lengestSection As collection
        Set lengestSection = spacesSections(longestSpaceSectionIndex)
        
        Debug.Print (textToInsert)
        Debug.Print (Trim(textToInsert))
        
        inserTextInSpaces = left(textWithSpaces, lengestSection(1) - 1) & " " & Trim(textToInsert) & " " & Right(textWithSpaces, Len(textWithSpaces) - lengestSection(2))
        
    Else
        ' Text hat keine Leerzeichen
        inserTextInSpaces = textWithSpaces & textToInsert
    End If
    
End Function




' Text-Transformation für den Konfi-Typ 2
Private Function applyTransformToTextShapeForKonfiType2(shape As shape, textIndex As Integer, design As productDesign)
    
    shape.text.Story.size = design.getLayer(1, 1).getMainShape.SizeWidth * 0.015
    
    shape.SetPosition design.getDesignShape.centerX - (shape.SizeWidth / 2), design.getDesignShape.BottomY - 100 - (textIndex * 50)
    
End Function




' Text-Transformation, wenn es eine feste Box ist
' ACHTUNG ! ! ! Die Baselines von dem Shape können ungültig werden und zu Corelabstürzen führen, wenn die Textgröße & Textboxgröße geändert werden (Am besten zum Schluss machen)
Private Function applyTransformToTextShape(shape As shape, ByVal placementContainerCustomization As Dictionary, shapesForFitting As shapeRange, Optional onlyTextSize As Boolean = False)
    
    logger.addTab
    logger.logINFO "[AmazonImport.applyTransformToTextShape]"
    
    ActiveDocument.ClearSelection
    
    Dim i As Integer
    
    Dim dimensions As Dictionary
    Set dimensions = placementContainerCustomization.item("dimension")
    
    Dim position As Dictionary
    Set position = placementContainerCustomization.item("position")
    
    
    ' Text Rect
    ' -----------------
    Dim textRect As rect
    Set textRect = shape.text.Story.TextLineRects.subPaths(1).boundingBox
'    logger.logFINEST "    textRect: " & Globals.rectToString(textRect)
    
    ' Die breiteste Textbox muss genutzt werden
    For i = 2 To shape.text.Story.TextLineRects.subPaths.count
        If shape.text.Story.TextLineRects.subPaths(i).SizeWidth > textRect.width Then
            Set textRect = shape.text.Story.TextLineRects.subPaths(i).boundingBox
        End If
    Next i
'    logger.logFINEST "    textRect: " & Globals.rectToString(textRect)
    
    
    'textRect.SetRect textRect.x, amazonTextBoxYPosAndHeight(1), textRect.width, amazonTextBoxYPosAndHeight(2)
    
    Dim textLimitRect As New rect
    textLimitRect.width = dimensions.item("width") / scaleSetting
    textLimitRect.height = dimensions.item("height") / scaleSetting
    textLimitRect.x = (position.item("x") - paddingXKonfi) / scaleSetting
    textLimitRect.y = (400 - position.item("y") - paddingYKonfi) / scaleSetting - textLimitRect.height
'    ActiveLayer.CreateRectangleRect textLimitRect
'    logger.logFINEST "    textLimitRect: " & Globals.rectToString(textLimitRect)
    
    
    shape.text.Story.size = CSng(textLimitRect.height * 0.19) ' * 0.19
    
    If onlyTextSize Then Exit Function
    
'    logger.logFINEST "    Text Size: " & shape.text.Story.size
    
    ' Behebt den Fehler bei Bestellung
    ' 303-3750193-0728302_27353694176562
    If shape.text.Overflow Then
        shape.text.FitTextToFrame
    End If
    
    
    Dim amazonTextBoxYPosAndHeight() As Double
    logger.logINFO "    amazonTextBoxYPosAndHeight"
    amazonTextBoxYPosAndHeight = Globals.getAmazonTextBoxYPosAndHeight(shape)
    logger.logINFO "    Done with amazonTextBoxYPosAndHeight"
    
    Dim originalBaselineYPos As Double
    originalBaselineYPos = shape.text.Story.Baselines.subPaths(1).StartNode.positionY
    logger.logFINEST "    originalBaselineYPos: " & originalBaselineYPos
    
    shape.text.Frame.VerticalAlignment = cdrCenterJustify
    
    
    
    
    ' Relativ zum Design positionieren
    textLimitRect.offset shapesForFitting.LeftX, shapesForFitting.BottomY
    
    ' -50 & +50 bei Y, weil Corel oben und unten von einem Text viel Platz braucht um es einzupassen
    textLimitRect.y = textLimitRect.y - 50
    textLimitRect.height = textLimitRect.height + 100
    
    shape.text.Frame.FrameShape.SetBoundingBox textLimitRect.x, textLimitRect.y, textLimitRect.width, textLimitRect.height, False, cdrCenter
    logger.logFINEST "    Textbox scaled"
    shape.centerX = textLimitRect.centerX
    shape.centerY = textLimitRect.centerY
    logger.logFINEST "    Textbox positioned"
    
    ' DEBUG TextlimitRect darstellen
'    ActiveLayer.CreateRectangleRect textLimitRect
'    ActiveShape.name = "textLimitRect"
    
    
    Dim amazonBaselineYDifference As Double
    amazonBaselineYDifference = originalBaselineYPos - amazonTextBoxYPosAndHeight(1)
    
'
    logger.logINFO "    Units: " & Globals.getUnitName(ActiveDocument.unit)
    logger.logINFO "    amazonBaselineYDifference: " & amazonBaselineYDifference '& ", baselineY: " & shape.text.Story.Baselines.subPaths(1).StartNode.PositionY & _
        '", amazonTextBoxYPos: " & amazonTextBoxYPosAndHeight(1)
'
    shape.Move 0, amazonBaselineYDifference
    
    ' Debug
    
'    ActiveLayer.CreateLineSegment shape.text.Story.Baselines.subPaths(1).StartNode.PositionX, amazonTextBoxYPosAndHeight(1), shape.text.Story.Baselines.subPaths(1).EndNode.PositionX, amazonTextBoxYPosAndHeight(1)
'    ActiveShape.name = "amazonTextBoxYPos"
'    ActiveShape.fill.ApplyUniformFill CreateRGBColor(100, 255, 0)
'
'    ActiveLayer.CreateLineSegment shape.text.Story.Baselines.subPaths(1).StartNode.PositionX, shape.text.Story.Baselines.subPaths(1).StartNode.PositionY, shape.text.Story.Baselines.subPaths(1).EndNode.PositionX, shape.text.Story.Baselines.subPaths(1).StartNode.PositionY
'    ActiveShape.name = "baselineY"
    
    
    fitTextToTextBox shape
    
    
    logger.removeTab
    
End Function



Private Function fitTextToTextBox(textShape As shape)

    textShape.visible = True

    ' Falls der Text zu groß für die Textbox ist, wird er hier eingepasst
    Dim textScale As Double
    copyTextToDummyText textShape
    
    textScale = textShape.text.Frame.FrameShape.SizeWidth / getDummyText.text.Story.TextLineRects.boundingBox.width

    ' Text nur verkleinern, nicht vergrößern
    If textScale < 1 Then
        'textShape.Text.FitTextToFrame 'Methode von Corel. Nutzt aber auch mehrere Textzeilen, um Text einzupassen
        textShape.text.Story.size = textShape.text.Story.size * textScale * 0.99 'Kleine Tolleranz, damit ja nichts über den Textrahmen geht
    End If
End Function



Public Sub TestSetTextSizeBUG()
    
'    If Not ActiveShape Is Nothing Then
'        If ActiveShape.Type = cdrTextShape Then
            
            
            
            Dim shape As shape
'            Set shape = ActiveShape
            Set shape = ActiveLayer.CreateParagraphText(0, 0, 2000, 2000, "Test")
            
            shape.text.Story.text = "Textt"
            shape.text.Story.alignment = cdrCenterAlignment
            
            shape.text.Story.font = "Cookie"
            shape.text.Story.Style = shape.text.Story.Style
            
            ' Unicodes korrigieren
            Globals.correctTextUnicodes shape
            
            
            ' Text Rect
            ' -----------------
            Dim textRect As rect
            Set textRect = shape.text.Story.TextLineRects.subPaths(1).boundingBox
            
            ' Die breiteste Textbox muss genutzt werden
            Dim i As Integer
            For i = 2 To shape.text.Story.TextLineRects.subPaths.count
                If shape.text.Story.TextLineRects.subPaths(i).SizeWidth > textRect.width Then
                    Set textRect = shape.text.Story.TextLineRects.subPaths(i).boundingBox
                End If
            Next i
            
            shape.text.Story.size = 100
            
            shape.text.Frame.FrameShape.SetBoundingBox 0, 0, 50, 50, True
            
            Dim amazonTextBoxYPosAndHeight() As Double
            amazonTextBoxYPosAndHeight = Globals.getAmazonTextBoxYPosAndHeight(shape)
            
'            MsgBox "Y: " & amazonTextBoxYPosAndHeight(1)
            
'        Else
'            MsgBox "Kein Text ausgewählt!"
'        End If
'    End If
    
End Sub



' Text-Transformation, wenn der Text frei platzierbar ist
Function applyTransformToTextShapeWithBuyerPlacement(shape As shape, shapesForFitting As shapeRange, buyerPlacement As Dictionary)
    
    
    Dim i As Integer
    
    'Die wahre Textbox (so wie sie auch im Konfi angezeigt wird). Corel nutzt für die Boundingbox eines Textes nähmlich die exakte Größe (welche kleiner ist. Manchmal auch größer, wenn Schnörkel aus dem echten Rahmen gehen)
    Dim realTextBoxForX As rect
    Set realTextBoxForX = shape.text.Story.TextLineRects.subPaths(1).boundingBox
    
    ' Die breiteste Textbox muss genutzt werden
    For i = 2 To shape.text.Story.TextLineRects.subPaths.count
        If shape.text.Story.TextLineRects.subPaths(i).SizeWidth > realTextBoxForX.width Then
            Set realTextBoxForX = shape.text.Story.TextLineRects.subPaths(i).boundingBox
        End If
    Next i
    
    Dim boundingToRealSizeFactor As Double
    ' "max()" muss gemacht werden, damit nicht mit 0 dividiert wird, da "realTextBoxForX.width" auch 0 sein kann.
    ' Kam bisher bei Sonderzeichen vor, die nicht angezeigt werden und deshalb eine Breite von 0 haben
    boundingToRealSizeFactor = shape.SizeWidth / max(realTextBoxForX.width, 0.001)
    If realTextBoxForX.width = 0 Then
        logger.logWARN "Die Breite von realTextBoxForX ist '0'. Die Position vom Text kann also abweichen!"
    End If
    'boundingToRealSizeFactor = 1
    
    Dim dimensions As Dictionary
    Set dimensions = buyerPlacement.item("dimension")
    
    Dim position As Dictionary
    Set position = buyerPlacement.item("position")
    
    Dim scaleDict As Dictionary
    Set scaleDict = buyerPlacement.item("scale")
    
    
    Dim wInKonfi As Double
    wInKonfi = dimensions.item("width") * scaleDict.item("scaleX")
    
    Dim hInKonfi As Double
    hInKonfi = dimensions.item("height") * scaleDict.item("scaleY")
    
    
    Dim wReal As Double
    wReal = wInKonfi / scaleSetting
    
    Dim hReal As Double
    hReal = shape.SizeHeight / shape.SizeWidth * wReal
    
    
    
    Dim left As Double
    '      Zentrum des Textshapes - die hälfte der Breite, um in die linke obere Ecke zu kommen
    left = shape.centerX - wReal / 2 * boundingToRealSizeFactor
    
    
    Dim top As Double
    '      Zentrum des Textshapes - die hälfte der Höhe, um in die linke obere Ecke zu kommen
    top = shape.centerY - hReal / 2 * boundingToRealSizeFactor
    
    
    'Skalieren
    shape.SetBoundingBox left, top, wReal * boundingToRealSizeFactor, hReal * boundingToRealSizeFactor, False, cdrCenter
    
    
    'Nach dem skalieren, muss die 'realTextBoxForX' neu gesetzt werden
    ' ACHTUNG:
    ' Wenn 'realTextBoxForX.x' eine sehr große Zahl ist und deshalb Texte sehr weit nach rechts platziert werden wo man sie nicht sieht,
    ' dann kann es daran liegen, dass das Design fremde SVGs hat mit fehlerhaften Transparenzen auf Gruppen. Die Autokorrektur kann das beheben
    Set realTextBoxForX = shape.text.Story.TextLineRects.subPaths(1).boundingBox
    
    
     ' Die breiteste Textbox muss genutzt werden
    For i = 2 To shape.text.Story.TextLineRects.subPaths.count
        If shape.text.Story.TextLineRects.subPaths(i).SizeWidth > realTextBoxForX.width Then
            Set realTextBoxForX = shape.text.Story.TextLineRects.subPaths(i).boundingBox
        End If
    Next i
    
    
    Dim amazonTextBoxYPosAndHeight() As Double
    amazonTextBoxYPosAndHeight = Globals.getAmazonTextBoxYPosAndHeight(shape)
    
    ' Während die 'realTextBoxForX' die Box der breitesten Zeile ist, muss die 'realTextBoxForY' die Box der ersten Zeile sein,
    ' da anhand davon der Abstand/Unterschied oben zwischen der Boundingbox aller Zeilen und des 'TextLineRects' gemessen wird (boundingToRealSizeYOffset)
    Dim realTextBoxForY As rect
    Set realTextBoxForY = shape.text.Story.TextLineRects.subPaths(1).boundingBox
    
    ' Hier tritt leider ab und zu mal ein Fehler auf  );  >:(
    realTextBoxForY.SetRect realTextBoxForY.x, amazonTextBoxYPosAndHeight(1), realTextBoxForY.width, amazonTextBoxYPosAndHeight(2)
    
    Dim boundingToRealSizeXOffset As Double
    boundingToRealSizeXOffset = shape.LeftX - realTextBoxForX.left
    
    Dim boundingToRealSizeYOffset As Double
    boundingToRealSizeYOffset = shape.BottomY - realTextBoxForY.top
    
    

    Dim x As Double ' X Center
    '                     vv + (wInKonfi / 2)
    x = (position.item("x") - paddingXKonfi)
    x = x / scaleSetting ' Von Konfigröße zu echte Größe skalieren (scaleSetting ist ca. 0,3 bei 30x20)
    
    
    Dim y As Double ' Y Center
    '                              vv + (hInKonfi / 2)
    y = (400 - (position.item("y")) - paddingYKonfi)
    y = y / scaleSetting ' Von Konfigröße zu echte Größe skalieren (scaleSetting ist ca. 0,3 bei 30x20)
    
    
    
    'Positionieren
    ' ------------------------------------------
    shape.LeftX = (shapesForFitting.LeftX + x + (boundingToRealSizeXOffset))
    shape.BottomY = (shapesForFitting.BottomY + y + boundingToRealSizeYOffset)
      
    shape.text.Story.SetLineSpacing cdrPercentOfPointSizeLineSpacing, 130 ' Der Zeilenabstand, der im Amazon-Konfi genutzt wird ' TODO Falsch. Es wird anhand der AmazonTextbox der Zeilenabstand berechnet, nicht anhand von Baseline, Ascender, Descender
    ' ------------------------------------------
    
    ' DEBUG
'    ' Erstellt für einen Text zwei Boxen. Eine für die Boundingbox von Corel und die andere für die echte Box bestehend aus Baseline, Ascender & Descender
'    Set realTextBox = Shape.text.Story.TextLineRects.SubPaths(1).boundingBox
'    'MsgBox "Line Box H=" & realTextBox.height / 25.4
'    'MsgBox "Shape Bottom Y=" & shape.BottomY & ", realBBottomY=" & realTextBox.Bottom
'    ' Box A
'    ActiveLayer.CreateRectangleRect realTextBox
'    ActiveShape.fill.ApplyUniformFill Application.CreateColor("#ff00ff") ' Pink
'    ' Box B
'    ActiveLayer.CreateRectangleRect Shape.boundingBox
'    ActiveShape.fill.ApplyUniformFill Application.CreateColor("#00ffff") ' Cyan
    
    

    'Rotieren
    ' ------------------------------------------
    Dim rotation As Double
    rotation = -buyerPlacement.item("angleOfRotation") ' ist in Corel anders herum, deshalb das Minus
    
    rotation = Globals.FMod(rotation, 360#)  ' Verhindert den Fehler, dass wenn man Corel sehr großen Zahlen wie 2520.3582293673785 gibt, die Rotation falsch ist
    
'    Debug.Print "rotation: " & rotation
    
    ' Wenn der Text nur wenig gedreht wurde, ist es höchstwahrscheinlich ein versehen vom Kunden.
    ' Deshalb werden kleine Drehungen ignoriert
    If Abs(rotation) > ROTATION_MINIMUM And Abs(rotation) < 360 - ROTATION_MINIMUM Then
        shape.RotationCenterX = shape.text.Story.TextLineRects.subPaths(1).boundingBox.left
        shape.RotationCenterY = shape.text.Story.TextLineRects.subPaths(1).boundingBox.top
        shape.rotate rotation  ' - image.RotationAngle 'ist Unnötig (ist 0)
    End If
    ' ------------------------------------------

End Function





Public Function processImages(sortedView As AmazonImportSortedView, folderPath As String)
    
    Dim i As Integer
    Dim j As Integer
    Dim k As Integer
    Dim p As Integer
    
    logger.addTab , "[AmazonImport.processImages]"
    sortedView.debugPrint logger
    
    Dim nonBoundedUploadBoxes As shapeRange
    Set nonBoundedUploadBoxes = newCustomShapeTypeQuery(sortedView.getLayerShapes, ConfiUploadBoxCutForImportShapeType).setExcludeGivenShape(True).setArgument1(2).search
    
    Dim hasNonBoundedUploadBoxes As Boolean
    hasNonBoundedUploadBoxes = nonBoundedUploadBoxes.count > 0
    
    Dim designMustBeEdited As Boolean
    ' Bild muss von einem Mitarbeiter zugeschnitten werden
    ' Denn entweder gibt es die option 'Bildauschnitt' oder es gibt mindestens eine nicht begrenzte Uploadbox
    designMustBeEdited = sortedView.getJSONViewData(1).imageCutoutNeedsEditing Or hasNonBoundedUploadBoxes
    
    logger.logFINE "- sortedView.getLayerShapes: " & Globals.shapeRangeToString(sortedView.getLayerShapes) ', vbNewLine & ",")
    
    ' Uploadboxen in jedem Layer suchen und merken, welche Uploadbox aus welchem Layer stammt
    Dim uploadBoxes As New shapeRange
    Dim layersOfUploadboxes As New Dictionary
    For p = 1 To sortedView.getParts.count
        Dim part As ProductDesignPart
        Set part = sortedView.getParts.getPart(p)
        For j = 1 To part.layers.count
            
            Dim currLayer As ProductDesignLayer
            Set currLayer = part.layers.getLayer(j)
            
            Dim uploadboxesOfLayer As shapeRange
            Set uploadboxesOfLayer = currLayer.newCustomShapeTypeQuery(ConfiUploadBoxCutForImportShapeType).setArgument1(1).search
            
            Dim u As Integer
            For u = 1 To uploadboxesOfLayer.count
                uploadBoxes.add uploadboxesOfLayer(u)
                layersOfUploadboxes.add uploadboxesOfLayer(u), currLayer
            Next u
            
            Set currLayer = Nothing
            Set uploadboxesOfLayer = Nothing
        Next j
        Set part = Nothing
    Next p
    
    Dim customerPhotos As New shapeRange
    
    ' Kundenfotos laden
    For k = 1 To sortedView.getJSONViewDataCount
        For i = 1 To sortedView.getJSONViewData(k).imageContainers.count
            ' Das Foto muss komischerweise erst als Shape zwischengespeichert werden.
            ' Denn bei einer Bestellung hat Coreldraw gemeckert, wenn es direkt zur ShapeRange 'customerPhotos' hinzugefügt wurde
            Dim customerPhoto As shape
            Set customerPhoto = processImage(sortedView.getJSONViewData(k).imageContainers.item(i), sortedView.getJSONViewData(k).imageCutoutTypeName, _
                sortedView.getShapesForViewFitting, folderPath, Not designMustBeEdited, sortedView.getParts)
            
            If Not customerPhoto Is Nothing Then
                customerPhotos.add customerPhoto
            End If
            
            Set customerPhoto = Nothing
        Next i
    Next k
    
    
    
    ' Nächste Uploadbox für jedes Kundenfoto suchen
    ' -----------------------------------------------
    ' Schritt 1: Distanz jedes Fotos zu jeder Uploadbox messen
    ' ::::::::::::::::
    Dim currentCustomerPhoto As shape
    Dim currentUploadBox As shape
    '
    Dim customerPhotoForUploadboxes As New collection
    Dim freeCustomerPhotos As New shapeRange
    freeCustomerPhotos.AddRange customerPhotos
    Dim freeUploadboxes As New shapeRange
    freeUploadboxes.AddRange uploadBoxes
    Dim distances As New Dictionary
    For i = 1 To customerPhotos.count
        Set currentCustomerPhoto = customerPhotos(i)
        Dim distancesOfCurrentCustomerPhoto As New collection
        For j = 1 To uploadBoxes.count
            Set currentUploadBox = uploadBoxes(j)
            ' Distanz zu jeder Uploadbox messen
            distancesOfCurrentCustomerPhoto.add getDistanceToUploadbox(currentCustomerPhoto, currentUploadBox)
            Set currentUploadBox = Nothing
        Next j
        
        distances.add currentCustomerPhoto, distancesOfCurrentCustomerPhoto
        Set currentCustomerPhoto = Nothing
        Set distancesOfCurrentCustomerPhoto = Nothing
    Next
    ' Schritt 2: Passende Uploadbox zu jedem Foto finden
    ' ::::::::::::::::
    Dim currentDistances As collection
    While freeCustomerPhotos.count > 0 And freeUploadboxes.count > 0
        
        ' Das Foto mit der kürzesten Distanz zu einer Uploadbox, darf sich die Uploadbox nehmen
        Dim lowestDistance As Double
        lowestDistance = 100000
        Dim customerPhotoWithLowestDistance As shape
        Dim uploadBoxWithLowestDistance As shape
        Dim uploadBoxWithLowestDistanceIndex As Integer
        
        For j = 1 To freeCustomerPhotos.count
            Set currentCustomerPhoto = freeCustomerPhotos(j)
            
            Set currentDistances = distances.item(currentCustomerPhoto)
            
            For k = 1 To currentDistances.count
                If currentDistances(k) < lowestDistance Then
                    lowestDistance = currentDistances(k)
                    
                    logger.logFINE "Uploadbox mit geringerer Distanz gefunden. Distanz: '" & lowestDistance & "', Uploadbox #'" & k & "'"
                    Set customerPhotoWithLowestDistance = currentCustomerPhoto
                    Set uploadBoxWithLowestDistance = freeUploadboxes(k)
                    uploadBoxWithLowestDistanceIndex = k
                End If
            Next k
            
            Set currentDistances = Nothing
            Set currentCustomerPhoto = Nothing
        Next j
        
        If Not customerPhotoWithLowestDistance Is Nothing Then
            
            
            ' Gefundenes Foto & Uploadbox aus Suche löschen
            ' ------------------------
            ' Die gefundene Uploadbox & Foto müssen unbedingt vorher entfernt werden, da die Funktion 'createPowerclipForPhoto' beide Formen ändert (Referenz ändert sich)
            freeCustomerPhotos.RemoveRange Globals.shapeToShapeRange(customerPhotoWithLowestDistance)
            freeUploadboxes.RemoveRange Globals.shapeToShapeRange(uploadBoxWithLowestDistance)
            nonBoundedUploadBoxes.RemoveRange Globals.shapeToShapeRange(uploadBoxWithLowestDistance)
            'distances.Remove uploadBoxWithLowestDistance
            
            If GlobalSettingsUserForm.getSetting_UsePowerClipsForAmazonImport Then
                createPowerclipForPhoto customerPhotoWithLowestDistance, uploadBoxWithLowestDistance, layersOfUploadboxes.item(uploadBoxWithLowestDistance)
            Else
                createUploadBoxForPhoto customerPhotoWithLowestDistance, uploadBoxWithLowestDistance, layersOfUploadboxes.item(uploadBoxWithLowestDistance)
            End If
            
            ' Distanz zur entfernten Uploadbox auch entfernen
            For i = 1 To distances.count
                Set currentDistances = distances.item(distances.keys(i - 1)) ' -1 wegen zero based
                currentDistances.Remove uploadBoxWithLowestDistanceIndex
                Set currentDistances = Nothing
            Next i
            ' ------------------------
        End If
        
        Set customerPhotoWithLowestDistance = Nothing
        Set uploadBoxWithLowestDistance = Nothing
    Wend
    ' -----------------------------------------------
    
    
    
    
    ' Kundenfotos zu denen keine Uploadbox gefunden werden konnte
    ' -----------------------------------------------
    Dim firstLayer As ProductDesignLayer
    Set firstLayer = sortedView.getParts().getPart(1).getLayer(1)
    Dim cutShape As shape
    
    If firstLayer.isGraving Then
        Set cutShape = firstLayer.getMainShapesCombinedCopy
    Else
        Set cutShape = Tool.createBleedForDesignLayer(firstLayer, Globals.getDefaultBleedSizeInMM, False) ' TODO besser währe es die Beschnittzugabe vom Layer zu erfahren und damit die Beschnittzugabeformen zu erstellen
    End If
    
    While freeCustomerPhotos.count > 0
        Set currentCustomerPhoto = freeCustomerPhotos(1)
        freeCustomerPhotos.RemoveRange Globals.shapeToShapeRange(currentCustomerPhoto)
        
        ' Da die Uploadbox frei ist, wird das Foto ganz nach oben platziert, da es im AmazonKonfi nicht unter einer FotoMaske liegt, sondern oben unter Texten
        currentCustomerPhoto.OrderFrontOf firstLayer.layerShape.shapes.First
        
        Set currentCustomerPhoto = Globals.intersectShapes(cutShape, currentCustomerPhoto)
        
        createWhiteFillingForImage currentCustomerPhoto, firstLayer
        
        Set currentCustomerPhoto = Nothing
    Wend
    cutShape.delete
    ' -----------------------------------------------
    
    
    nonBoundedUploadBoxes.delete
    
    
    logger.removeTab
End Function


Private Function createWhiteFillingForImage(image As shape, layer As ProductDesignLayer)

    If Not layer.isGraving And layer.getGroundPlate Is Nothing And layer.getBackgroundShapes.count = 0 Then
        Dim imageRDG As shape
        Set imageRDG = Globals.createRGD_WhiteShape(image)
        
        imageRDG.name = "Kundenfoto RDG_White"
        imageRDG.OrderBackOf image
    End If
End Function



Private Function getDistanceToUploadbox(photo As shape, uploadBox As shape) As Double
    Dim vec As New Vector
    vec.x = uploadBox.centerX - photo.centerX
    vec.y = uploadBox.centerY - photo.centerY
    
    getDistanceToUploadbox = vec.Length
End Function



Private Function createPowerclipForPhoto(photo As shape, uploadBox As shape, layer As ProductDesignLayer)
    logger.addTab , "[AmazonImport.createPowerclipForPhoto] Schneide das Foto auf die Uploadbox zu."
    
    Dim powerClip As shape
    Set powerClip = Globals.createPowerClip(uploadBox)
    powerClip.name = uploadBox.name
    powerClip.outline.Type = cdrOutline
    powerClip.outline.color = Globals.getPinkColor
    uploadBox.delete
    Set uploadBox = Nothing
    
    photo.AddToPowerClip powerClip
    
    createWhiteFillingForImage photo, layer
    
    logger.removeTab
End Function



Private Function createUploadBoxForPhoto(photo As shape, uploadBox As shape, layer As ProductDesignLayer)
    logger.addTab , "[AmazonImport.createUploadBoxForPhoto] Schneide das Foto auf die Uploadbox zu."
    
    Dim isUnboundedUploadbox As Boolean
    isUnboundedUploadbox = Globals.isShapeUploadBoxCutShapeForConfiImportShapeType(uploadBox, FreeUploadBoxType)
    
    ' Nur wenn die Uploadbox begrenzt ist, soll auf die Begrenzung zugeschnitten werden. Denn die Form von freien Uploadboxen ist nicht zwingend vollflächig
    If Not isUnboundedUploadbox Then
        ' Nur Zuschneiden, wenn Foto mit Uploadbox überlappt. Es gibt nämlich Kunden, die das Bild aus der Uploadbox ziehen (warum auch immer. Vielleicht wollen sie es nicht mehr. Zumindest sehen sie das Foto nicht mehr)
        If Globals.areShapesOverlapping(photo, uploadBox) Then
            Set photo = Globals.intersectShapes(uploadBox, photo, True)
        End If
    End If
    
    ' Z-Index
    photo.OrderBackOf uploadBox
    
    If isUnboundedUploadbox Then
        uploadBox.delete ' Uplodabox löschen. Stört nur (Außer man muss den Ausschnitt ändern, dann ist die wieder hilfreich)
                
        Dim cutShape As shape
        If layer.isGraving Then
            Set cutShape = layer.getMainShapesCombinedCopy
        Else
            Set cutShape = Tool.createBleedForDesignLayer(layer, Globals.getDefaultBleedSizeInMM, False) ' TODO besser währe es die Beschnittzugabe vom Layer zu erfahren und damit die Beschnittzugabeforme zu erstellen
        End If
        
        Set photo = Globals.intersectShapes(cutShape, photo)
        cutShape.delete
    Else
        uploadBox.outline.color = Globals.getPinkColor
        uploadBox.outline.width = Globals.getHairlineThickness
    End If
    
    createWhiteFillingForImage photo, layer
    
    logger.removeTab
End Function



Public Function processImage(ImagePlacementContainerCustomization As Dictionary, ByVal imageCutoutTypeName As String, shapesForFitting As shapeRange, _
        folderPath As String, cutPhotosToUploadboxes As Boolean, view As ProductDesignPartRange) As shape
    
    logger.addTab , "[AmazonImport.processImage] Bild Name: '" & ImagePlacementContainerCustomization.item("name") & "', label: '" & ImagePlacementContainerCustomization.item("label") & "'"
    
    ' Es wurde kein Bild hochgeladen
    If Not ImagePlacementContainerCustomization.Exists("buyerPlacement") Then
        logger.logFINE "Kunde hat kein Bild hochgeladen!"
        Exit Function
    End If
    
    Dim buyerPlacement As Dictionary
    Set buyerPlacement = ImagePlacementContainerCustomization.item("buyerPlacement")

    Dim imageItem As Dictionary
    Set imageItem = ImagePlacementContainerCustomization.item("children")(0).item("image")
    
    'MsgBox "processImage=" & imageItem.Item("imageName")
    
    
    'TODO Rotation in der Globals Methode eleminieren
    Globals.loadImageWithoutRotation folderPath & imageItem.item("imageName") ' "imageName" : "123.jpg",
    Dim image As shape
    Set image = ActiveShape
    
    ' Breite & Höhe
    Dim dimensions As Dictionary
    Set dimensions = buyerPlacement.item("dimension")
    '
    Dim width As Double
    width = dimensions.item("width")
    Dim height As Double
    height = dimensions.item("height")
    
    ' Position
    Dim position As Dictionary
    Set position = buyerPlacement.item("position")
    '
    Dim positionX As Double
    positionX = position.item("x")
    Dim positionY As Double
    positionY = position.item("y")
    
    ' Skalierung
    Dim scalee As Dictionary
    Set scalee = buyerPlacement.item("scale")
    '
    Dim scaleX As Double
    scaleX = scalee.item("scaleX")
    Dim scaleY As Double
    scaleY = scalee.item("scaleY")
    
    
    ' Breite & Höhe
    ' IM KONFI
    Dim wInKonfi As Double
    wInKonfi = width * scaleX
    '
    Dim hInKonfi As Double
    hInKonfi = height * scaleY
    
    
    Dim newW As Double
    newW = wInKonfi / scaleSetting
    
    Dim newH As Double
    newH = hInKonfi / scaleSetting
    
    
    'Skalieren
    image.SetBoundingBox image.centerX - newW / 2, image.centerY - newH / 2, newW, newH, False, cdrCenter
    

    Dim x As Double ' X Center
    x = (positionX + (wInKonfi / 2) - paddingXKonfi) / scaleSetting
    
    
    Dim y As Double ' Y Center
    y = (400 - (positionY + (hInKonfi / 2)) - paddingYKonfi) / scaleSetting
    
    
    ' DEBUG VISUALIZE
'    Dim shapesForFittingDebugShape As shape
'    Set shapesForFittingDebugShape = ActiveLayer.CreateRectangle(shapesForFitting.LeftX, shapesForFitting.TopY, _
'        shapesForFitting.RightX, shapesForFitting.BottomY)
'    shapesForFittingDebugShape.fill.ApplyNoFill
'    shapesForFittingDebugShape.outline.Type = cdrOutline
'    shapesForFittingDebugShape.outline.color = CreateRGBColor(0, 255, 0)
'    shapesForFittingDebugShape.name = "shapesForFittingDebugShape"
'    ' //
'    Dim originDebugShape As shape
'    Set originDebugShape = ActiveLayer.CreateEllipse2(0, 0, 10)
'    originDebugShape.name = "originDebugShape"
'    originDebugShape.fill.ApplyUniformFill CreateRGBColor(20, 128, 20)
'    originDebugShape.outline.Type = cdrNoOutline
'    ' ///
'    Dim imageCenterDebugShape As shape
'    Set imageCenterDebugShape = ActiveLayer.CreateEllipse2(image.centerX, image.centerY, 10)
'    imageCenterDebugShape.name = "imageCenterDebugShape"
'    imageCenterDebugShape.fill.ApplyUniformFill CreateRGBColor(255, 128, 0)
'    imageCenterDebugShape.outline.Type = cdrNoOutline
    
    
    ActiveDocument.ReferencePoint = cdrCenter
    'logger.logINFO "X: " & x & ", Y: " & y & ", shapesForFitting.positionX: " & shapesForFitting.positionX & ", shapesForFitting.positionY: " & shapesForFitting.positionY & ", shapesForFitting: " & Globals.getShapeRangeDisplayNames(shapesForFitting, , True)
    
    ' Positionieren
    image.Move (shapesForFitting.LeftX + x) - image.centerX, (shapesForFitting.TopY - shapesForFitting.SizeHeight + y) - image.centerY
    
    
    
    ' Rotieren
    ' ------------------------------------------
    Dim rotation As Double
    rotation = -buyerPlacement.item("angleOfRotation") ' ist in Corel anders herum, deshalb das Minus
    rotation = Globals.FMod(rotation, 360#)  ' Verhindert den Fehler, dass wenn man Corel sehr großen Zahlen wie 2520.3582293673785 gibt, die Rotation falsch ist
    
    If (Not GlobalSettingsUserForm.getSetting_IgnoreSmalCustomerImageRotations) Or _
            Abs(rotation) > ROTATION_MINIMUM_IMAGES Then
        image.RotationCenterX = image.LeftX
        image.RotationCenterY = image.TopY
        image.rotate rotation
    End If
    ' ------------------------------------------
    
    
    ' Name
    ' ---------------------------------
    ' Das Foto bekommt den Namen des Zuschnitttyps. Z.B: Ganzer Körper oder Portrait
    ' Somit weiß derjenige, der das Bild nachbearbeitet, wie es bearbeitet werden soll
    If imageCutoutTypeName = "" Then
        image.name = "Kundenfoto"
    Else
        image.name = imageCutoutTypeName
    End If
    ' ---------------------------------
    
    Set processImage = image
ExitFunction:
    logger.removeTab
End Function




Public Function processQRCodes(currentSortedView As AmazonImportSortedView)
    
    Dim qrCodes As shapeRange
    Set qrCodes = newCustomShapeTypeQuery(currentSortedView.getLayerShapes, customShapeType.qrCode).search
    
    
    Dim k As Integer
    For k = 1 To currentSortedView.getJSONViewDataCount
        Dim currentJSONView As AmazonImportJSONView
        Set currentJSONView = currentSortedView.getJSONViewData(k)
        
        Dim qrCode As shape
        
        Dim firstLayerInView As ProductDesignLayer
        Set firstLayerInView = currentSortedView.getPart(1).getLayer(1)
        
        If Not currentJSONView.qrCodeLink = "" Then
            
            Set qrCode = getOrCreateQRCode(qrCodes, firstLayerInView)
            
            Dim origSize As Double
            origSize = qrCode.SizeWidth
            Dim centerX, centerY As Double
            centerX = qrCode.centerX
            centerY = qrCode.centerY
            
            Dim shortenURLResult As ArrayList
            Set shortenURLResult = shortenURL(currentJSONView.qrCodeLink)
            Dim qrCodeLinkShortened As String
            qrCodeLinkShortened = shortenURLResult.item(1)
            
            Dim shortenUrlErrored As Boolean
            shortenUrlErrored = shortenURLResult.item(2)
'            shortenUrlErrored = True ' DEBUG Fehler simulieren
            If Not shortenUrlErrored Then
                
                Dim result As collection
                Dim qrCodeChanged As Boolean
                Set result = Globals.setQrCodeLink(qrCode, qrCodeLinkShortened)
                qrCodeChanged = result(1)
                Set qrCode = result(2)
                
                If qrCodeChanged Then
                    ' Größe und Position zurücksetzen, da der QR-Code durch das ändern des Links seine Größe geändert haben könnte
                    qrCode.SetSizeEx centerX, centerY, origSize, origSize
                    qrCode.SetPositionEx cdrCenter, centerX, centerY
                
                Else
                     manageQRCodeError qrCode, "Link konnte nicht in QR-Code eingefügt werden", currentJSONView.qrCodeLink
                End If
                
            Else
                manageQRCodeError qrCode, qrCodeLinkShortened, currentJSONView.qrCodeLink
            End If
            
        Else
            If qrCodes.count > 0 Then
                Set qrCode = getOrCreateQRCode(qrCodes, firstLayerInView)
                qrCode.delete ' Diesen QR-Code löschen, da der Kunde dafür keinen Link angegeben hat
            End If
        End If
        
        
        Set qrCode = Nothing
        Set currentJSONView = Nothing
    Next k
    
    ' Ungenutze QR-Codes löschen
    qrCodes.delete
End Function

Private Function manageQRCodeError(qrCode As shape, ByVal errorMsg As String, erroredLink As String)
    errorMsg = errorMsg & ". Link: '" & erroredLink & "'"
    AmazonImport.addASINError "QR-Code Fehler:" & errorMsg
    markQRCodeAsErrored qrCode, "Fehler: " & errorMsg
End Function

Private Function markQRCodeAsErrored(qrCode As shape, errorMsg As String)
    qrCode.fill.ApplyUniformFill CreateRGBColor(255, 0, 0) ' QR Code als rot/fehlerhaft markieren
    qrCode.name = errorMsg
End Function


Private Function getOrCreateQRCode(ByRef qrCodesFromDesign As shapeRange, layerForNewQRCodes As ProductDesignLayer) As shape
    Dim result As shape
    If qrCodesFromDesign.count = 0 Then
        Set result = Globals.createQRCode
        result.OrderFrontOf layerForNewQRCodes.layerShape.shapes.First ' Wenn ein neuer QR-Code erstellt wurde, ganz oben in den Layer einsortieren (Denn bei Schablonen werden Designs an die nächstfreie Stelle verschoben. Alle Formen müssen also gruppiert sein)
    Else
        Set result = qrCodesFromDesign.firstShape
        qrCodesFromDesign.RemoveRange Globals.shapeToShapeRange(result)
    End If
    
    Set getOrCreateQRCode = result
End Function



Private Function exportToPDF(path As String)
    ' Recorded 08.07.2021
    With ActiveDocument.PDFSettings
        .PublishRange = 0 ' CdrPDFVBA.pdfWholeDocument
        .PageRange = "1"
        .Subject = ""
        .Keywords = ""
        .BitmapCompression = 2 ' CdrPDFVBA.pdfJPEG
        .JPEGQualityFactor = 2
        .TextAsCurves = False
        .EmbedFonts = True
        .EmbedBaseFonts = True
        .TrueTypeToType1 = True
        .SubsetFonts = True
        .SubsetPct = 80
        .CompressText = True
        .Encoding = 1 ' CdrPDFVBA.pdfBinary
        .DownsampleColor = True
        .DownsampleGray = True
        .DownsampleMono = True
        .ColorResolution = 200
        .MonoResolution = 600
        .GrayResolution = 200
        .Hyperlinks = True
        .Bookmarks = True
        .Thumbnails = False
        .Startup = 0 ' CdrPDFVBA.pdfPageOnly
        .ComplexFillsAsBitmaps = False
        .Overprints = True
        .Halftones = False
        .MaintainOPILinks = False
        .FountainSteps = 256
        .EPSAs = 0 ' CdrPDFVBA.pdfPostscript
        .pdfVersion = 9 ' CdrPDFVBA.pdfVersion17_Acrobat9
        .IncludeBleed = False
        .Bleed = 31750
        .Linearize = False
        .CropMarks = False
        .RegistrationMarks = False
        .DensitometerScales = False
        .FileInformation = False
        .ColorMode = 1 ' CdrPDFVBA.pdfCMYK
        .useColorProfile = True
        .ColorProfile = 1 ' CdrPDFVBA.pdfSeparationProfile
        .EmbedFilename = ""
        .EmbedFile = False
        .JP2QualityFactor = 2
        .TextExportMode = 0 ' CdrPDFVBA.pdfTextAsUnicode
        .PrintPermissions = 0 ' CdrPDFVBA.pdfPrintPermissionNone
        .EditPermissions = 0 ' CdrPDFVBA.pdfEditPermissionNone
        .ContentCopyingAllowed = False
        .OpenPassword = ""
        .PermissionPassword = ""
        .EncryptType = 2 ' CdrPDFVBA.pdfEncryptTypeAES
        .OutputSpotColorsAs = 0 ' CdrPDFVBA.pdfSpotAsSpot
        .overPrintBlackLimit = 95
        .ProtectedTextAsCurves = True
    End With
    ActiveDocument.PublishToPDF path
End Function


Private Function copyTextToDummyText(textShape As shape)
    
    logger.logFINER "[AmazonImport.copyTextToDummyText]"
    logger.addTab
    
    logger.logFINER "text: '" & textShape.text.Story.text & "'"
    
    getDummyText.text.Story.copyAttributes textShape.text.range(0, 1)
    
    Globals.safeSetTextShapeText getDummyText, textShape.text.Story.text

    logger.removeTab
End Function


Private Function setDummyTextText(text As String)
    Globals.safeSetTextShapeText getDummyText, text
End Function


' Weiße Hinterlegung erstellen
Public Sub CreateRGD_WhiteFilling()
    
    Dim i As Integer
    
    Dim preciseBitmap As Boolean
    If Globals.isCTRLPressed Then
        preciseBitmap = True
    End If
    
    Globals.endIfNoDocumentOpen
    
    Globals.startMacro
    If Not Globals.debugHistory Then
        CorelScriptTools.BeginWaitCursor
        ActiveDocument.BeginCommandGroup "Weiße Hinterlegung"
        If Not Globals.debugErrors Then On Error GoTo MacroError
    End If
    
    Globals.storeSelection
    
    Dim logger As logger
    Set logger = Globals.getLogger(True)
    
    Dim selection As shapeRange
    Set selection = Globals.getSelectedShapesOrAll
    
    For i = 1 To selection.count

        Dim currentShape As shape
        Set currentShape = selection(i)
        
        ' Gruppen (also potenzielle Designs)
        If currentShape.Type = cdrGroupShape And Not currentShape.locked Then
            createRDG_WhiteFillingProcessDocumentShape currentShape, preciseBitmap, logger
    
            
        ' Einfache Formen
        ElseIf Globals.isShapeDesignElement(currentShape) Then
            createRDG_WhiteShape currentShape, preciseBitmap, Globals.getLayerOfShape(currentShape), logger
        End If

        Set currentShape = Nothing

    Next i

    Globals.restoreSelection
    Globals.endMacro
    
    Exit Sub
MacroError: 'Alle Fehler hier abfangen und die CommandGruppe beenden, damit man mit einem Schritt zurück gehen kann (STRG + Z), auch wenn ein Fehler aufgetreten ist
    MsgBox Err.Description & ", " & Err.number, vbCritical
    ProgressBarUserForm.Hide
    Globals.endMacro True
End Sub


Private Function createRDG_WhiteFillingProcessDocumentShape(shape As shape, preciseBitmap As Boolean, Optional logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[AmazonImport.createRDG_WhiteFillingProcessDocumentShape]"
    
    Dim design As New productDesign
    design.newProductDesign shape
    
'    Dim design As productDesign
'    Set design = Globals.getDesignOfShape(shape, True, logger)
'    If Not logger Is Nothing Then logger.logINFO "Shape, welches als Design erkannt wurde: '" & Globals.getShapeDisplayName(design.getDesignShape) & "'"
'    If design.getDesignShape Is shape Then
    
    
    If design.isValidProductDesign And Not design.getLayer(1, 1).getMainShape Is Nothing Then
        
        Dim p As Integer
        With ProgressBarUserForm.newSubProgress(design.getPartsCount)
            For p = 1 To design.getPartsCount
                
                .setDisplayText "Part " & p
                
                Dim l As Integer
                With ProgressBarUserForm.newSubProgress(design.getPart(p).count)
                    For l = 1 To design.getPart(p).count
                        
                        .setDisplayText "Layer " & l
                        
                        createRGD_WhiteProcessLayer design.getPart(p).layers.getLayer(l), preciseBitmap, logger
                        
                        .setStepsProgress l
                    Next l
                    .finishProgress
                End With
                
                .setStepsProgress p
            Next p
            .finishProgress
        End With
        
    Else
        If shape.Type = cdrGroupShape Then
            Dim shapesFlattened As shapeRange
            Set shapesFlattened = Globals.flattenGroupShape(shape)
            
            Dim i As Integer
            With ProgressBarUserForm.newSubProgress(shapesFlattened.count)
            For i = 1 To shapesFlattened.count
                .setDisplayText "Form " & 1 & " von " & shapesFlattened.count
                createRDG_WhiteShape shapesFlattened(i), preciseBitmap
                .setStepsProgress i
            Next i
                .finishProgress
            End With
            
        Else
            createRDG_WhiteShape shape, preciseBitmap
        End If
    End If
    
    If Not logger Is Nothing Then logger.removeTab
End Function



Private Function createRGD_WhiteProcessLayer(layer As ProductDesignLayer, preciseBitmap As Boolean, Optional logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "createRGD_WhiteProcessLayer"
    
    Dim layerShapesSnapshot As shapeRange
    
    
    
    
    ' Fall 1:
    ' Wenn der Layer eine Grundplatte hat, die druckbar ist (wie z.B: Standbilder_Blau_Grundplatte),
    ' dann soll nur diese Form zum erstellen der weißen Hinterlegung genutzt werden,
    ' da sie das Design ganz ausfüllt und andere Formen nicht mehr beachtet werden müssen
    If Not layer.getGroundPlate Is Nothing Then
        Dim groundPlateSubJob As PlaceFileSubJob
        Set groundPlateSubJob = PlaceFile.findSubJob(layer.getGroundPlate, layer)
        If Not groundPlateSubJob Is Nothing Then
            If groundPlateSubJob.isForPrint Then
                Set layerShapesSnapshot = Globals.shapeToShapeRange(layer.getGroundPlate)
            End If
        End If
    End If
    
    
    ' Fall 2:
    ' Wenn es Uploadboxen gibt, die über die gesamte Schicht gehen
    If layerShapesSnapshot Is Nothing Then
        
    
        Dim uploadBoxes As shapeRange
        Set uploadBoxes = layer.newCustomShapeTypeQuery(customShapeType.uploadBox).search
        
        If uploadBoxes.count > 0 Then
            
            Dim mainShapesOfLayerCombinedCopy As shape
            Set mainShapesOfLayerCombinedCopy = layer.getMainShapesCombinedCopy
            Dim mainShapesCurve As curve
            Set mainShapesCurve = Globals.getCurveFromShape(mainShapesOfLayerCombinedCopy)
            
            
            Dim i As Integer
            For i = 1 To uploadBoxes.count
                Dim currentUploadBox As shape
                Set currentUploadBox = uploadBoxes(i)
                
                If Not Globals.isShapeUploadBoxCutShapeForConfiImportShapeType(currentUploadBox, , False) Then
                    If layer.isShapeLikeMainShapesOrWithBleed(currentUploadBox, Globals.getUploadboxBoundingShapeCurve(currentUploadBox), mainShapesOfLayerCombinedCopy, mainShapesCurve) Then
                        Set layerShapesSnapshot = Globals.shapeToShapeRange(currentUploadBox)
                    End If
                End If
                
                Set currentUploadBox = Nothing
            Next i
            
            
            mainShapesOfLayerCombinedCopy.delete
            Set mainShapesOfLayerCombinedCopy = Nothing
        End If
    End If
    
    
    ' Fall 3:
    ' Wenn es BackgroundShapes gibt, gilt das selbe wie oben in Fall 1
    If layerShapesSnapshot Is Nothing Then
        Dim layerBGShapes As shapeRange
        Set layerBGShapes = layer.getBackgroundShapes
        
        layerBGShapes.RemoveRange newCustomShapeTypeQuery(layerBGShapes, groundPlate).search
        
        If layerBGShapes.count > 0 Then
            
            Dim bestBackgroundShapeRating As Integer
            Dim bestBackgroundShape As shape
            
            For i = 1 To layerBGShapes.count
                Dim currentBGShape As shape
                Set currentBGShape = layerBGShapes(i)
                Dim currentBGShapeRating As Integer
                
                ' Bewerten
                ' --------------------
                If Globals.isVectorShape(currentBGShape) Then
                    currentBGShapeRating = 1
                    If currentBGShape.transparency.Type = cdrNoTransparency Then
                        currentBGShapeRating = 2
                    End If
                End If
                ' --------------------
                
                
                If currentBGShapeRating > bestBackgroundShapeRating Then
                    ' Besseren Hintergrund gefunden
                    Set bestBackgroundShape = currentBGShape
                    bestBackgroundShapeRating = currentBGShapeRating
                End If
                
                Set currentBGShape = Nothing
            Next i
            
            ' Wenn weiter oben noch keine passende Form von den 'layerBGShapes' gefunden wurde, dann wird einfach die erste von den 'layerBGShapes' genommen
            If bestBackgroundShape Is Nothing Then
                Set layerShapesSnapshot = Globals.shapeToShapeRange(layerBGShapes.firstShape)
            Else
                Set layerShapesSnapshot = Globals.shapeToShapeRange(bestBackgroundShape)
            End If
        End If
    End If
    
    ' Fall 4:
    ' Wenn es keine Formen gibt, die das Design ganz ausfüllen,
    ' dann werden alle Formen genommen
    If layerShapesSnapshot Is Nothing Then
        Set layerShapesSnapshot = layer.layerShape.shapes.All
        
        Set layerShapesSnapshot = newCustomShapeTypeQuery(layerShapesSnapshot, Globals.DesignElementShapeType).search
        layerShapesSnapshot.RemoveRange newCustomShapeTypeQuery(layerShapesSnapshot, uploadBox).search
        
        ' Flach machen, damit man nicht wegen Gruppen rekursiv arbeiten muss
        Set layerShapesSnapshot = Globals.flattenShapeRange(layerShapesSnapshot, , , False)
    End If
    
    

    ' Weiße Hinterlegung erstellen
    ' ---------------------------------------------
    With ProgressBarUserForm.newSubProgress(layerShapesSnapshot.count)
        For i = 1 To layerShapesSnapshot.count
    
            .setDisplayText "Form " & i & " von " & layerShapesSnapshot.count
    
            Dim currentShape As shape
            Set currentShape = layerShapesSnapshot(i)
    
            createRDG_WhiteShape currentShape, preciseBitmap, layer, logger
    
            Set currentShape = Nothing
            .setStepsProgress i
        Next i
        .finishProgress
    End With
    ' ---------------------------------------------
    
    If Not logger Is Nothing Then logger.removeTab
    
End Function


Private Function createRDG_WhiteShape(shape As shape, preciseBitmap As Boolean, Optional layer As ProductDesignLayer, Optional logger As logger) As shapeRange
    If Not logger Is Nothing Then logger.addTab , "[AmazonImport.createRDG_WhiteShape]"
    
    Set createRDG_WhiteShape = New shapeRange
    
    If shape.visible And Not Globals.isShapeRDGWhiteShape(shape) Then
        
        If shape.Type = cdrGroupShape Then
            Dim i As Integer
            For i = 1 To shape.shapes.count
                createRDG_WhiteShape.AddRange createRDG_WhiteShape(shape.shapes(i), preciseBitmap, layer)
            Next i
        Else
            Dim shapeCopy As shape
            Set shapeCopy = Globals.createRGD_WhiteShape(shape, , preciseBitmap)
    
            ' Ordern
            ' ------------------------------------
            Dim shapeParent As shape
            If Not layer Is Nothing Then Set shapeParent = layer.layerShape
            If Not shapeParent Is Nothing Then
                shapeCopy.OrderBackOf shapeParent.shapes.All.lastShape
            Else
                shapeCopy.OrderBackOf ActiveLayer.shapes.All.lastShape
            End If
            ' ------------------------------------
            
            createRDG_WhiteShape.add shapeCopy
        End If
    End If
    
    If Not logger Is Nothing Then logger.removeTab
End Function



Public Function getAmazonExcelPath() As String
    getAmazonExcelPath = Globals.getNewStructureFolder() & "Amazon\Amazon-Import ASIN zu Design-CDR.csv"
    
    ' A C H T U N G ! ! ! in der Debug-Version der Excel am besten nur die eine ASIN und so zum debuggen einfügen.
    ' Ansonsten kann es passieren, dass man vergisst den Pfad auf den richtigen umzustellen (Weil ja alle Bestell-Zips funktionieren)
    
'    getAmazonExcelPath = "Y:\20_Martin\Corel\Amazon Import\Test CSV\Amazon-Import ASIN zu Design-CDR2.csv" ' DEBUG Version
End Function




Public Function loadAmazonASINToDesignCDRExcel(Optional debugMode As Boolean, Optional logger As logger) As String()
    
    If Not logger Is Nothing Then logger.addTab , "[AmazonImport.loadAmazonASINToDesignCDRExcel]"

    
    Dim path As String
    If debugMode Then
        path = Globals.getMainFolder & "Amazon Import\Unittests\ASIN zu Pfad.csv"
    Else
        path = getAmazonExcelPath
    End If
    
    Dim timer As New StopWatch
    timer.startTimer
    
'    On Error GoTo CSVNotFound
    loadAmazonASINToDesignCDRExcel = Globals.loadCSVToStringArray(path)
'    On Error GoTo 0
    
    If Not logger Is Nothing Then logger.logINFO "Benötigte Zeit zum laden der CSV: '" & timer.stopTimer & "'"
    
    
    If Not logger Is Nothing Then logger.removeTab
    Exit Function
CSVNotFound:
    Dim errDesc As String
    errDesc = Err.Description
    If Not logger Is Nothing Then logger.removeTab
    Err.Raise vbObjectError + 513, , "[Globals.loadAmazonASINToDesignCDRExcel] Fehler beim laden der CSV: '" & path & "'" & vbNewLine & "Fehler: " & errDesc
End Function



Public Function getElementIndexInASINToDesignCDRExcel(elementName As String, arr As Variant) As Integer
    getElementIndexInASINToDesignCDRExcel = Globals.getElementIndexIn2DArrayHeader(elementName, arr, "Die Kopfzeile '" & elementName & "' wurde in der Amazon ASIN Excel nicht gefunden!")
End Function


' Eine ASIN besteht aus 10 Großbuchstaben und Zahlen. Z.B: B0CMDB5WLH
Private Function isASINValid(ASIN As String) As Boolean
    isASINValid = ASIN Like "[A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]"
End Function


' Wie viele Views eine Bestellung zur ASIN mindestens braucht, wenn nur die ASIN (ohne JSON) geladen wird.
' Ergibt sich aus der Anzahl der Excelzeilen zur ASIN (ASIN + folgende '>' Zeilen) und der höchsten Quell-View aus 'View Sortierung' (z.B: "01:01|02:01" = 2)
Public Function getViewCountForASIN(ASIN As String, csvData As Variant) As Integer
    
    Dim result As Integer
    result = 1
    
    Dim csvASINIndex As Integer
    csvASINIndex = getElementIndexInASINToDesignCDRExcel("ASIN", csvData)
    
    Dim i As Integer
    Dim j As Integer
    For i = 0 To UBound(csvData)
        If csvData(i, csvASINIndex) = ASIN Then
            
            ' Anzahl der Excelzeilen zur ASIN
            Dim rowCount As Integer
            rowCount = 1
            For j = i + 1 To UBound(csvData)
                If Len(csvData(j, csvASINIndex)) = 1 And Globals.startsWith((csvData(j, csvASINIndex)), ">") Then
                    rowCount = rowCount + 1
                Else
                    Exit For
                End If
            Next j
            If rowCount > result Then result = rowCount
            
            ' Höchste Quell-View aus der 'View Sortierung'
            Dim viewSortInstruction As String
            viewSortInstruction = csvData(i, getElementIndexInASINToDesignCDRExcel("View Sortierung", csvData))
            If Not viewSortInstruction = "" Then
                Dim viewSortInstructions() As String
                viewSortInstructions = Split(viewSortInstruction, "|")
                For j = LBound(viewSortInstructions) To UBound(viewSortInstructions)
                    Dim sortViewFrom As Integer
                    sortViewFrom = CInt(Split(viewSortInstructions(j), ":")(0))
                    If sortViewFrom > result Then result = sortViewFrom
                Next j
            End If
            
            Exit For
        End If
    Next i
    
    getViewCountForASIN = result
End Function




Sub TestShortenURL()
    Globals.openWebsite shortenURL("https://gravuru.de/").item(1)
End Sub


Function shortenURL(ByVal longUrl As String) As ArrayList
    
    ' 1: URL / Error Message | String
    ' 2: Errored | Boolean
    Dim result As ArrayList
    Set result = New ArrayList
    
    ' Wenn der Link kein WWW enthält, dann ist es kein gültiger Link
    If Not Globals.isLink(longUrl) Then
        result.add("InvalidURL").add True
        GoTo Finally
    End If

    Dim http As Object
    Dim jsonObj As Object
    Dim apiUrl As String
    Dim apiKey As String
    Dim requestBody As String
    Dim responseText As String
    
    ' Hier API-Schlüssel eintragen
    apiKey = tinyURLToken
    
    ' API URL für TinyURL
    apiUrl = "https://api.tinyurl.com/create"

    ' JSON-Anfrage mit der zu kürzenden URL
    requestBody = "{""url"":""" & longUrl & """, ""domain"": ""tinyurl.com""}"

    ' HTTP-Request erstellen
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    
    With http
        .Open "POST", apiUrl, False
        .setRequestHeader "Content-Type", "application/json"
        .setRequestHeader "Authorization", "Bearer " & apiKey
        On Error GoTo SendError
        .send requestBody
        On Error GoTo 0
        
        ' 'responseText' Resultate:
        ' - Erfolg : {"data":{"domain":"tinyurl.com","alias":"4thk2j56","deleted":false,"archived":false,"analytics":{"enabled":true,"public":false},"tags":[],"created_at":"2026-10-01T06:18:17+00:00","expires_at":null,"tiny_url":"https:\/\/tinyurl.com\/9wu8uf8k","url":"https:\/\/gravuru.de\/"},"code":0,"errors":[]}
        responseText = .responseText
    End With
    
    ' JSON-Parser erstellen (falls JSON erfolgreich geladen wurde)
    Set jsonObj = JSON.Parse(responseText)
    'Set JSON = JsonConverter.ParseJson(responseText)
    
    ' Überprüfen, ob eine verkürzte URL zurückgegeben wurde
    If Not jsonObj Is Nothing Then
    
        ' Fall 1: Fehler sind vorhanden
        If jsonObj.Exists("errors") Then
            ' Fehler sammeln
            Dim errors() As Variant
            errors = jsonObj("errors")
            Dim allErrorMessages As String
            Dim errorCount As Integer
            errorCount = Globals.getArraySize(errors)
            
            If errorCount > 0 Then
                Dim i As Integer
                For i = LBound(errors) To UBound(errors)
                    allErrorMessages = allErrorMessages & errors(i) & " "
                Next i
                
                result.add(allErrorMessages).add True
                GoTo Finally ' Fehler ist aufgetreten. Fall 2 nicht behandeln
            End If
        End If
        
        ' Fall 2: Daten sind vorhanden
        If jsonObj.Exists("data") Then
            If jsonObj("data").Exists("tiny_url") Then
                Dim tinyUrl As String
                tinyUrl = jsonObj("data")("tiny_url")
                
                result.add(tinyUrl).add False
                GoTo Finally
            Else
                result.add("'tinyUrl' nicht in 'data' vorhanden").add True
                GoTo Finally
            End If
        End If
        
        ' Fall 3: Message ist vorhanden (Nicht sicher geprüft)
        If jsonObj.Exists("message") Then
            result.add("Fehler: " & jsonObj("message")).add True
            GoTo Finally
        End If
        
        ' Fall 4: Nichts hat gematched
        result.add("Fehler: Weder 'errors', noch 'data', noch 'message' vorhanden").add True
        
    Else
        result.add("Fehler beim Abrufen der Antwort").add True
    End If
    
Finally:
    ' Objekte freigeben
    Set http = Nothing
    Set jsonObj = Nothing
    Set shortenURL = result
    Exit Function
SendError:
    Err.Raise Err.number, Err.source, Err.Description & ". Status: " & http.status & ", Response Text: " & http.responseText, Err.HelpFile, Err.HelpContext
End Function



Public Sub TestCopyTextAttributes()
    
    Dim dummyText2 As shape
    Set dummyText2 = ActiveLayer.FindShape("dummyText")
    
    Dim textShape As shape
    Set textShape = ActiveLayer.FindShape("textShape")
    
    
    dummyText2.text.Story.copyAttributes textShape.text.range(0, 1)
    dummyText2.text.Story.text = textShape.text.Story.text
End Sub




Public Sub TestFindMissingGlyphsErrors()
    
    Globals.endIfNoActiveShape
    
    FindMissingGlyphsErrors ActiveShape
    
End Sub


' Sucht nach fehlenden Glyphen im Shape.
' Wenn eine fehlende Glyphe gefunden wird, wird sie in rot markiert
' und als Fehler festgehalten und am Ende angezeigt mit allen anderen Fehlern
Public Function FindMissingGlyphsErrors(ByVal s As shape)

    If s Is Nothing Then Exit Function
    If s.Type <> cdrTextShape Then Exit Function

    Dim storyRange As textRange
    Set storyRange = s.text.Story

    Dim fullText As String
    fullText = storyRange.text
    If Len(fullText) = 0 Then Exit Function

    Dim i As Long, n As Long
    n = Len(fullText)

    Dim runFont As String, curFont As String
    Dim runStart As Long, runText As String

    runStart = 0
    runText = ""
    runFont = storyRange.range(1, 1).font
    
    For i = 1 To n
        Dim ch As String
        ch = Mid$(fullText, i, 1)

        ' Steuerzeichen (CR/LF) überspringen – kein „fehlender Glyph“ im Sinn
        Dim codeUnit As Long
        codeUnit = AscW(ch) And &HFFFF&
        If codeUnit = 13 Or codeUnit = 10 Then
            ' Run flushen, bevor wir weitermachen
            If Len(runText) > 0 Then FindMissingGlyphsErrors_ProcessEqualText runFont, runText, runStart, s
            runText = ""
            runStart = i + 1
            If i < n Then runFont = storyRange.range(i + 1, i + 1).font
            GoTo NextI
        End If

        curFont = storyRange.range(i, i).font

        If curFont <> runFont Then
            If Len(runText) > 0 Then FindMissingGlyphsErrors_ProcessEqualText runFont, runText, runStart, s
            runFont = curFont
            runStart = i
            runText = ch
        Else
            runText = runText & ch
        End If

NextI:
    Next i

    If Len(runText) > 0 Then FindMissingGlyphsErrors_ProcessEqualText runFont, runText, runStart, s
End Function


' Prüft einen zusammenhängenden Text, dessen Zeichen alle die selbe Schriftart haben
Private Sub FindMissingGlyphsErrors_ProcessEqualText(ByVal fontName As String, ByVal txt As String, ByVal basePos As Long, s As shape)
    If Len(txt) = 0 Then Exit Sub
    If Len(fontName) = 0 Then Exit Sub

    #If VBA7 Then
        Dim hdc As LongPtr, hFont As LongPtr, hPrev As LongPtr
    #Else
        Dim hdc As Long, hFont As Long, hPrev As Long
    #End If

    hdc = CreateCompatibleDC(0)
    If hdc = 0 Then Exit Sub

    Dim face As String
    face = fontName & vbNullChar

    hFont = CreateFontW(0, 0, 0, 0, 400, 0, 0, 0, DEFAULT_CHARSET, _
                        OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS, DEFAULT_QUALITY, _
                        DEFAULT_PITCH, StrPtr(face))
    If hFont = 0 Then DeleteDC hdc: Exit Sub

    hPrev = SelectObject(hdc, hFont)

    Dim n As Long: n = Len(txt)
    Dim glyphs() As Integer
    ReDim glyphs(0 To n - 1)

    Call GetGlyphIndicesW(hdc, StrPtr(txt), n, VarPtr(glyphs(0)), GGI_MARK_NONEXISTING_GLYPHS)

    Dim i As Long
    For i = 0 To n - 1
        If (glyphs(i) And &HFFFF&) = &HFFFF& Then
            Dim ch As String: ch = Mid$(txt, i + 1, 1)
            
            ' Zero Width Space ignorieren, da wir das selbst hinzugefügt haben
            If Not ch = ChrW(ZERO_WIDTH_SPACE_UNICODE) Then
                
                ' Char in dem Textshape rot markieren
                s.text.range(basePos + i - 1, basePos + i).fill.ApplyUniformFill CreateRGBColor(255, 0, 0)
                
                ' Error merken und erst später alle Fehler anzeigen
                addASINError "Der folgende Text enthält ein fehlendes Zeichen: '" & replace(s.text.Story.text, ChrW(ZERO_WIDTH_SPACE_UNICODE), "") & "'"
                
            End If
        End If
    Next i

    SelectObject hdc, hPrev
    DeleteObject hFont
    DeleteDC hdc
End Sub


