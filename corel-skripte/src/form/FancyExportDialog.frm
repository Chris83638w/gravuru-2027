VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} FancyExportDialog 
   Caption         =   "Fancy Export"
   ClientHeight    =   7220
   ClientLeft      =   30
   ClientTop       =   380
   ClientWidth     =   5510
   StartUpPosition =   1  'Fenstermitte
   TypeInfoVer     =   601
End
Attribute VB_Name = "FancyExportDialog"
Attribute VB_Base = "0{50C08F29-0E66-4DAA-83C3-2B6CCA7D52A1}{5A3267AC-F833-42E4-905F-F9170C17D43C}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


Option Explicit

' Autor: Martin Afelt @ Gravuru
'
'


Dim backgroundPath As String
Dim exportPath As New UIPathChooser

'Private Sub ChangeExportFolderButton_Click()
'    ConfiHelper.changeExportFolder False
'End Sub


Dim designWithProductID As productDesign
Private p_fancyCustomizationIDsCSV As MonitoredFile


Public Property Get fancyCustomizationIDsCSV() As MonitoredFile
    If p_fancyCustomizationIDsCSV Is Nothing Then
        Set p_fancyCustomizationIDsCSV = New MonitoredFile
        p_fancyCustomizationIDsCSV.newMonitoredFile (getFancyCustomizationIDsCSVFilePath)
    End If
    
    Set fancyCustomizationIDsCSV = p_fancyCustomizationIDsCSV
End Property


Private Sub cmdClose_Click()
    Hide
End Sub

Private Sub CustomBackgroundChangeCommandButton_Click()
     Dim newPath As String
    newPath = CorelScriptTools.GetFileBox("PNG|*.png|JPG|*.jpg", "Bitte wähle eine Bild-Datei aus", , , , "Y:\20_Martin\Corel\Fancyexport\Hintergründe")
        
    If Not newPath = "" Then
        backgroundPath = newPath
    End If
End Sub




Private Sub ExportButton_Click()
    
    
    
    'MsgBox "FancyExportDialog.AbstandshalterCheckBox.value=" & FancyExportDialog.AbstandshalterCheckBox.value
    
    FancyExportDialog.Hide
    
    Dim focusedLayerIndex As Integer
    focusedLayerIndex = -1
    If FancyExportDialog.DesignLayerOptionButton.value Then
        On Error GoTo DesignLayerIndexWrong
        focusedLayerIndex = FancyExportDialog.DesignLayerTextBox.value
        If focusedLayerIndex < 1 Or focusedLayerIndex > 5 Then
            GoTo DesignLayerIndexWrong
        End If
        On Error GoTo 0
    End If
    
    Dim viewSettings As ConfiPartToViewSortInstruction
    On Error GoTo ViewSettingsWrongError
    Set viewSettings = getViewSettings
    On Error GoTo 0
    
    
    ' Tab: 'Mehrere IDs aus der Excel exportieren'
    If Me.IDMultiPage.value = 1 Then
        FancyExport.Start exportPath.path, getFancyCustomizationIDsCSVFilePath, ExportAllTaggedCDRsRegexTextBox.value, "", -1, "", viewSettings, IIf(FancyExportDialog.UseCustomBackgroundCheckBox, backgroundPath, ""), _
            False, FancyExportDialog.AutomaticGroundPlateVariantsCheckBox.value, _
            FancyExportDialog.forceColorAbleCheckBox.value, focusedLayerIndex, _
            FancyExportDialog.ExportLookCheckBox.value, FancyExportDialog.useProductImagesAsThumbnailOptionButton.value, FancyExportDialog.ExportTextCheckBox.value, _
            FancyExportDialog.exportSimpleFolderIconWhenGravingCheckBox.value
    Else
        
        If IDToExportComboBox.value = "" Then
            MsgBox "Es wurde keine Export ID ausgewählt oder gefunden. Bitte tagge die Designs erstmal mit IDs"
            Exit Sub
        End If
    
        FancyExport.Start exportPath.path, "", "", FancyExportDialog.ExportNameTextBox.value, IDToExportComboBox.value, FancyExportDialog.MainDesignProductIDTextBox.value, viewSettings, IIf(FancyExportDialog.UseCustomBackgroundCheckBox, backgroundPath, ""), _
            False, FancyExportDialog.AutomaticGroundPlateVariantsCheckBox.value, _
            FancyExportDialog.forceColorAbleCheckBox.value, focusedLayerIndex, _
            FancyExportDialog.ExportLookCheckBox.value, FancyExportDialog.useProductImagesAsThumbnailOptionButton.value, FancyExportDialog.ExportTextCheckBox.value, _
            FancyExportDialog.exportSimpleFolderIconWhenGravingCheckBox.value
    End If
    
    
    
    Exit Sub
ViewSettingsWrongError:
    MsgBox "Die View-Einstellung ist falsch!"
    Exit Sub
DesignLayerIndexWrong:
    MsgBox "Der Index für die Designschicht ist ungültig!"
End Sub



Private Function getViewSettings() As ConfiPartToViewSortInstruction
    
    Dim ConfiPartToViewSortInstruction As New ConfiPartToViewSortInstruction
    
    Dim i As Integer
    For i = 1 To 4
        If FancyExportDialog("Part" & i & "CheckBox").value Then
            Dim viewIndex As Integer
            viewIndex = CInt(Mid(FancyExportDialog("Part" & i & "ComboBox").value, 6, 1))
            
            ConfiPartToViewSortInstruction.addPartToView (i), viewIndex
        End If
    Next i
    
    Set getViewSettings = ConfiPartToViewSortInstruction
End Function



Private Sub UserForm_Initialize()
    
    FancyExport.getLogger.addTab , "[FancyExportDialog.UserForm_Initialize]"
    
    exportPath.init ExportFolderTextBox, ChangeExportFolderButton, True, , Globals.getDesktopPath() & "FancyExport"
    
    Dim i As Integer
    For i = 1 To 4
        
        ' Comboboxen befüllen
        With FancyExportDialog("Part" & i & "ComboBox")
            Dim j As Integer
            For j = 1 To 4
                .AddItem "View " & j
            Next j
        End With
        
        ' Standartauwahl der View-Einstellungen setzen
        If FancyExportDialog("Part" & i & "ComboBox").value = "" Then
            FancyExportDialog("Part" & i & "ComboBox").value = "View 1"
        End If
    Next i
    
    ' Tab Auswahl wiederherstellen
    MainMultiPage.value = max(0, min( _
        MainMultiPage.Pages.count - 1, _
        CLng(GetSetting( _
            appName:="Gravuru-CorelDRAW-Tools", _
            Section:="FancyExportDialog.MainMultiPage", _
            key:="LastTab", _
            Default:="0"))))
    
    FancyExportDialog.ExportButton.SetFocus
    
    FancyExport.getLogger.removeTab
End Sub



' 'UserForm_Initialize' wird nicht immer beim anzeigen des Dialogs aufgerufen, deshalb gibt es diese Methode
' Muss immer vor/nach dem Anzeigen aufgerufen werden
Public Function init()
    
    FancyExport.getLogger(True).addTab , "[FancyExportDialog.init]"

    exportPath.initPath
    
    Dim selectedShapes As shapeRange
    Set selectedShapes = ActiveSelectionRange
    
    Dim allDesigns As ProductDesignRange
    Set allDesigns = Globals.getAllDesignsAsRange
    
    Dim selectedDesigns As ProductDesignRange
    Set selectedDesigns = allDesigns.getSelectedDesigns(selectedShapes)
    If selectedDesigns.count > 0 Then
        Dim productIDObj As ProductIDObject
        Set productIDObj = selectedDesigns.getDesign(1).getProductIDObject
        FancyExportDialog.NewExportNameTextBox.value = productIDObj.getProductLineFullName
    End If
    
    
    initIDToExportComboBox
    
    ' FANCY ID PAGE
    ' --------------------------------------------
    ' Komischerweise dürfen die 'MonitoredFile's nicht schon oben beim Deklarieren erstellt werden. Sonst ist beim 2. öffne des Dialogfensters die 'p_data' einfach Nothing !?!??
    If p_fancyCustomizationIDsCSV Is Nothing Then
        Dim c: Set c = fancyCustomizationIDsCSV ' Cachen
        initIDToExportComboBox
    End If
    
    selectNextFreeFancyCustomizationID
    
    initMainDesignComboBox selectedDesigns
    initIDToDeleteComboBox allDesigns
    ' --------------------------------------------
    
    FancyExport.getLogger.removeTab
End Function


Private Function getFancyCustomizationIDsCSVFilePath() As String
    getFancyCustomizationIDsCSVFilePath = Globals.getMainFolder & "Fancyexport\Data\FancyCustomizationIDs.csv"
'    getFancyCustomizationIDsCSVFilePath = Globals.getDesktopPath & "FancyCustomizationIDs.csv" ' DEBUG
End Function





Private Sub MainMultiPage_Change()

    SaveSetting _
        appName:="Gravuru-CorelDRAW-Tools", _
        Section:="FancyExportDialog.MainMultiPage", _
        key:="LastTab", _
        Setting:=CStr(MainMultiPage.value)

End Sub






' S H O P I F Y   I D   P A G E
' ---------------------------------------------------------------------------------------------------

Private Function initIDToExportComboBox(Optional logger As logger)
    
    ' FANCY CUSTOMIZATION ID'S
    IDToExportComboBox.Clear
    Dim fancyCustomizationIDs As ArrayList
    Set fancyCustomizationIDs = Globals.getAllDesignsAsRange(logger:=logger).getFancyCustomizationIDs
    ' IDs in Combobox hinzufügen
    Dim i As Integer
    For i = 1 To fancyCustomizationIDs.count
        IDToExportComboBox.AddItem fancyCustomizationIDs.item(i)
    Next i

    ' Neuestes Element auswählen
    If IDToExportComboBox.ListCount > 0 Then
        IDToExportComboBox.ListIndex = 0
        showExportNameForExportID
        showMainDesignProductIDForExportID
    End If
End Function


Private Function initMainDesignComboBox(Optional selection As ProductDesignRange)
    ' HAUPTDESIGN
    ' Alle Designs in die Combobox
    FancyExportDialog.MainDesignComboBox.Clear
    If selection Is Nothing Then Set selection = Globals.getSelectedDesignsOrAllAsRange
    Dim i As Integer
    For i = 1 To selection.count
        FancyExportDialog.MainDesignComboBox.AddItem selection.getDesign(i).getProductID
    Next i
    ' Erstes Element auswählen, wenn vorhanden
    If FancyExportDialog.MainDesignComboBox.ListCount > 0 Then
        FancyExportDialog.MainDesignComboBox.ListIndex = 0
    End If
End Function

Private Function initIDToDeleteComboBox(Optional allDesigns As ProductDesignRange)
    ' FANCY CUSTOMIZATION ID'S
    IDToDeleteComboBox.Clear
    Dim fancyCustomizationIDs As ArrayList
    If allDesigns Is Nothing Then Set allDesigns = Globals.getAllDesignsAsRange '(logger:=logger)
    Set fancyCustomizationIDs = allDesigns.getFancyCustomizationIDs
    ' IDs in Combobox hinzufügen
    Dim i As Integer
    For i = 1 To fancyCustomizationIDs.count
        IDToDeleteComboBox.AddItem fancyCustomizationIDs.item(i)
    Next i

    ' Neuestes Element auswählen
    If IDToDeleteComboBox.ListCount > 0 Then
        IDToDeleteComboBox.ListIndex = 0
        showExportNameForExportID
        showMainDesignProductIDForExportID
    End If
End Function



Private Sub FancyCustomizationIDTextBox_KeyPress(ByVal KeyAscii As MSForms.ReturnInteger)
    ' Nur Zahlen dürfen eingetippt werden. Und nur bis maximal 8 Zeichen (sonst lässt es sich zum Prüfen nicht zu einem Long casten)
    If Not (KeyAscii >= 48 And KeyAscii <= 57) Or (Len(FancyCustomizationIDTextBox.value) > 8) Then
        KeyAscii = 0 ' Keine Zahl -> Verbieten
    End If
    
End Sub


Private Sub IDToExportComboBox_Change()
    showExportNameForExportID
    showMainDesignProductIDForExportID
End Sub


Private Function showExportNameForExportID()
    FancyExportDialog.ExportNameTextBox.value = getElementInRowOfCurrentUIExportIDOfCSV("Export-Name")
End Function


Private Function showMainDesignProductIDForExportID()
   FancyExportDialog.MainDesignProductIDTextBox.value = getElementInRowOfCurrentUIExportIDOfCSV("Hauptdesign Artikelnummer")
End Function


Private Function getElementInRowOfCurrentUIExportIDOfCSV(rowName As String) As String
    If IDToExportComboBox.value = "" Then Exit Function
    
    ' Es kann sein, dass 'init' noch nicht aufgerufen wurde. Da ist dann 'fancyCustomizationIDsCSV' Nothing
    If p_fancyCustomizationIDsCSV Is Nothing Then Exit Function
    
    Dim rowIndex As Integer
    rowIndex = CInt(fancyCustomizationIDsCSV.getDataCSV.getStringArrayList2D.IndexOfStringInRow(rowName, StringEquals, False, 1))
    
    getElementInRowOfCurrentUIExportIDOfCSV = getElementInRowOfExportIDOfCSV(rowIndex, IDToExportComboBox.value)
End Function

Private Function getElementInRowOfExportIDOfCSV(rowIndex As Integer, exportID As Long) As String
    ' Es kann sein, dass 'init' noch nicht aufgerufen wurde. Da ist dann 'fancyCustomizationIDsCSV' Nothing
    If p_fancyCustomizationIDsCSV Is Nothing Then Exit Function
    
    Dim columnOfID As Long
'    columnOfID = Globals.getElementIndexIn2DArrayRow(CStr(exportID), , 0)
    columnOfID = fancyCustomizationIDsCSV.getDataCSV.getStringArrayList2D.IndexOfStringInColumn(CStr(exportID), StringEquals, False, 1)
    
    If columnOfID = -1 Then Err.Raise vbObjectError + 513, , "[FancyExportDialog.getElementInRowOfExportIDOfCSV] Die ID '" & exportID & "' wurde in der Excel nicht gefunden. Sie scheint nur in der CDR zu existieren!"
    
    getElementInRowOfExportIDOfCSV = fancyCustomizationIDsCSV.getDataCSV.getStringArrayList2D.item(columnOfID, rowIndex)
End Function


Private Function selectNextFreeFancyCustomizationID()
    
     FancyExportDialog.FancyCustomizationIDTextBox.value = getNextFreeFancyCustomizationIDInCSV
    
End Function



' Findet die kleinste freie FancyCustomizationID.
' Gültige IDs haben das Format:
'   100000
'   200000
'   300000
'   ...
Public Function getNextFreeFancyCustomizationIDInCSV() As Long

    Const ID_STEP As Long = 100000
    Const MAX_INDEX As Long = 99999

    Dim array2D As ArrayList2D
    Set array2D = fancyCustomizationIDsCSV.getDataCSV.getStringArrayList2D

    ' used(1) = ID 100000 vergeben
    ' used(2) = ID 200000 vergeben
    ' ...
    Dim used(1 To MAX_INDEX) As Boolean

    Dim row As Long
    Dim id As Long
    Dim index As Long
    Dim value As String

    For row = 1 To array2D.rowCount
        
        value = array2D.item(row, 1)

        If IsNumeric(value) Then
            
            id = CLng(value)

            ' Nur IDs berücksichtigen, die tatsächlich
            ' auf unserem 100000er-Raster liegen.
            If id > 0 And id Mod ID_STEP = 0 Then
                
                index = id \ ID_STEP

                If index <= MAX_INDEX Then
                    used(index) = True
                End If
                
            End If
            
        End If
        
    Next row

    ' Kleinste freie ID finden
    Dim candidate As Long

    For candidate = 1 To MAX_INDEX
        If Not used(candidate) Then
            getNextFreeFancyCustomizationIDInCSV = CLng(candidate) * ID_STEP
            Exit Function
        End If
    Next candidate

    ' Keine freie ID mehr vorhanden
    getNextFreeFancyCustomizationIDInCSV = -1

End Function




Private Sub IDAddButton_Click()
    
    Dim exportName As String
    exportName = FancyExportDialog.NewExportNameTextBox.value
    
    If exportName = "" Then
        MsgBox "Es wurde kein Export-Name eingetragen!"
        Exit Sub
    End If
    
    FancyExport.startTagDesigns Globals.getSelectedDesignsOrAllAsRange, exportName, FancyExportDialog.MainDesignComboBox.value, FancyExportDialog.IDAddProgressLabel
    
    ' Neueste ID auswählen zum exportieren
    initIDToExportComboBox
    
    ' Neueste ID auswählen zum löschen
    initIDToDeleteComboBox
    
    ' Nächstfreie ID in UI anzeigen
    selectNextFreeFancyCustomizationID
    
End Sub


' Wenn eine ID gelöscht werden soll
Private Sub IDDeleteButton_Click()
    
    Dim idToDelete As String
    idToDelete = FancyExportDialog.IDToDeleteComboBox.value
    
    If idToDelete = "" Then Exit Sub
    
    Dim array2D As ArrayList2D
    Set array2D = fancyCustomizationIDsCSV.getDataCSV.getStringArrayList2D
    
    Dim rowIndex As Long
    rowIndex = array2D.IndexOfStringInColumn(idToDelete, StringEquals, False, 1)
    
    Dim row As ArrayList
    Set row = array2D.itemRow(rowIndex)
    
    Dim exportName As String
    exportName = row.item(array2D.IndexOfStringInRow("Export-Name", StringEquals, False, 1))
    
    ' Zeile löschen
    array2D.RemoveRowAt rowIndex

    ' CSV speichern
    fancyCustomizationIDsCSV.saveData
    
    ' Bei den Designs in der CDR entfernen
    Globals.getAllDesignsAsRange.deleteFancyCustomizationIDShape CLng(idToDelete)
    
    ' Exportordner löschen
    ' TODO potenziell gefährlich, wenn man dort irgendwann auch Actionbilder o.Ä. speziell für diesen Konfi speichert
    ' Am besten vorher warnen, speziell, wenn nicht nur Fancy ZIPs drin sind !!!!
    Dim sizeFldr As New FSSizeFolder
    sizeFldr.init , , ActiveDocument
    Dim exportFolderPath As String
    exportFolderPath = sizeFldr.getFancyCustomizationPath(CLng(idToDelete), exportName)
    If Globals.folderExists(exportFolderPath) Then Globals.deleteFolder (exportFolderPath)
    
    ' CDR speichern
    ActiveDocument.Save
    
    initIDToDeleteComboBox
    
End Sub




Public Function updateExportIDsSkriptVersion(ByVal id As Long)
    
    Dim array2D As ArrayList2D
    Set array2D = fancyCustomizationIDsCSV.getDataCSV.getStringArrayList2D
    
    Dim rowIndex As Long
    rowIndex = array2D.IndexOfStringInColumn(id, StringEquals, False, 1)
    
    Dim row As ArrayList
    Set row = array2D.itemRow(rowIndex)
    row.SetItem array2D.IndexOfStringInRow("Skriptversion", StringEquals, False, 1), Globals.getVersion.versionString
    
    fancyCustomizationIDsCSV.saveData
    
End Function




