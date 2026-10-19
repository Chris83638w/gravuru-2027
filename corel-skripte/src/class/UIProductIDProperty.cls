Attribute VB_Name = "UIProductIDProperty"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
' Dies stellt eine Eigenschaft von einer Artikelnummer dar,
' die eine Excel Liste (.csv) mit jeweils den vollen Namen der Child Eigenschaft als auch den Kürzel dazu enthält.
'
' Eine solche Eigenschaft ist z.B: das Material oder die Produktlinie(Gedenktafel z.B.)
' Desweiteren ist eine solche Eigenschaft im ProduktIdDialog mit 2 Dropdown Feldern und einem Plusbutton (zum hinzufügen) vertreten.
' Da es mehrere solcher Eigenschaften gibt (die alle gleich behandelt werden sollen), gibt es diese Klasse hier


Private WithEvents propertyComboBox As comboBox ' Für den normalen Namen
Attribute propertyComboBox.VB_VarHelpID = -1
Private WithEvents propertyShortComboBox As comboBox ' Für das Kürzel
Attribute propertyShortComboBox.VB_VarHelpID = -1
Private WithEvents plusButton As CommandButton ' Zum hinzufügen neuer Childs dieser Eigenschaft
Attribute plusButton.VB_VarHelpID = -1

Public ignorePropertyComboBoxChange As Boolean
Public ignorePropertyShortComboBoxChange As Boolean


Dim monitoredCsvFile As MonitoredFile

Dim propertyTypeName As String
Dim propertyShortTypeName As String

Dim logger As logger

Public Function newProductIDProperty(propertyComboBoxVar As comboBox, propertyShortComboBoxVar As comboBox, plusButtonVar As CommandButton, monitoredCsvFileVar As MonitoredFile, _
        propertyTypeNameVar As String, propertyShortTypeNameVar As String, Optional loggerVar As logger)
        
    Set logger = loggerVar
        
    Set propertyComboBox = propertyComboBoxVar
    Set propertyShortComboBox = propertyShortComboBoxVar
    Set plusButton = plusButtonVar
    Set monitoredCsvFile = monitoredCsvFileVar
    propertyTypeName = propertyTypeNameVar
    propertyShortTypeName = propertyShortTypeNameVar
    
    
    refreshComboBoxes
    
End Function


Private Function refreshComboBoxes()
    ' Es kann sein, dass die Combobox noch Werte vom letzten Anzeigen enthält
    propertyComboBox.Clear
    propertyShortComboBox.Clear
    
    For i = 1 To getCSVDataArray2D.rowCount
        propertyComboBox.AddItem getCSVDataArray2D.item(i, 1)
        propertyShortComboBox.AddItem getCSVDataArray2D.item(i, 2)
    Next i
End Function




' Eigenschaft geändert (Voll ausgeschriebene Eigenschaft)
' ACHTUNG: Damit dieses Event nicht 2x getriggert wird, muss man die .Value und nicht den .Text ändern (Danke Corel >:( )
Private Sub propertyComboBox_Change()
    
    If Not logger Is Nothing Then logger.addTab , "[ProductIDProperty.propertyComboBox_Change] ('" & propertyTypeName & "')"

    If ignorePropertyComboBoxChange Then ' Endlosschleife verhindern
        If Not logger Is Nothing Then logger.logINFO "Ignoriert!"
        ignorePropertyComboBoxChange = False
        GoTo ExitSub
    End If

    ' Wenn etwas ausgewählt wurde
    If Not propertyComboBox.ListIndex = -1 Then
        ignorePropertyShortComboBoxChange = True ' Endlosschleife verhindern
        propertyShortComboBox.ListIndex = propertyComboBox.ListIndex ' Auf andere Combobox übertragen
    End If


    ProductIdDialog.refreshProductIDTextBox
ExitSub:
    If Not logger Is Nothing Then logger.removeTab
End Sub




' Eigenschaften Kürzel geändert
' ACHTUNG: Damit dieses Event nicht 2x getriggert wird, muss man die .Value und nicht den .Text ändern (Danke Corel >:( )
Private Sub propertyShortComboBox_Change()
    If Not logger Is Nothing Then logger.addTab , "[ProductIDProperty.propertyShortComboBox_Change] ('" & propertyTypeName & "')"
    
    
    If ignorePropertyShortComboBoxChange Then ' Endlosschleife verhindern
        If Not logger Is Nothing Then logger.logINFO "Ignoriert!"
        ignorePropertyShortComboBoxChange = False
        GoTo ExitSub
    End If
    
    ' Wenn etwas ausgewählt wurde
    If Not propertyShortComboBox.ListIndex = -1 Then
        ignorePropertyComboBoxChange = True ' Endlosschleife verhindern
        propertyComboBox.ListIndex = propertyShortComboBox.ListIndex ' Auf andere Combobox übertragen
    End If
    
    ProductIdDialog.refreshProductIDTextBox
ExitSub:
    If Not logger Is Nothing Then logger.removeTab
End Sub






' Hinzufügen eines neuen Eigenschaften Childs
Private Sub plusButton_Click()
    
    ' Prüfen, ob was eingetragen wurde
    Dim propertyToAdd As String
    propertyToAdd = propertyComboBox.text
    
    If propertyToAdd = "" Then
        MsgBox "Bitte trage etwas unter '" & propertyTypeName & "' ein!", vbExclamation
        Exit Sub
    End If
    
    Dim propertyShortToAdd As String
    propertyShortToAdd = propertyShortComboBox.text
    
    If propertyShortToAdd = "" Then
        MsgBox "Bitte trage etwas unter " & propertyShortTypeName & " ein!", vbExclamation
        Exit Sub
    End If
    
    
    ' Prüfen, ob es das Element schon gibt
    For i = 1 To getCSVDataArray2D.rowCount
        If getCSVDataArray2D.item(i, 1) = propertyToAdd Then
            MsgBox "Der Wert '" & propertyToAdd & "' ist bereits vorhanden!", vbExclamation
            Exit Sub
        End If
        
        If getCSVDataArray2D.item(i, 2) = propertyShortToAdd Then
            MsgBox "Das Wert '" & propertyShortToAdd & "' ist bereits vorhanden!", vbExclamation
            Exit Sub
        End If
    Next i
    
    
    ' Unbedingt vor dem Hinzufügen eines neuen Wertes prüfen, ob die Daten noch aktuell sind
    monitoredCsvFile.reloadFileIfNeeded
    
    ' Element hinzufügen
    getFileDataCSV.getStringArrayList2D.AddRowParamArray propertyToAdd, propertyShortToAdd
    
'    MsgBox monitoredCsvFile.getDataCSV.getStringArrayList2D.toString
    
    ' CSV sortieren
    getFileDataCSV.getStringArrayList2D.Sort
    
    ' CSV Speichern
    getFileDataCSV.saveCSV
    
    ' Werte erneut zur UI hinzufügen
    refreshComboBoxes
    
    ' Artikelnummer nochmal setzen, damit diese geprüft wird.
    ' Es kann sein, dass es vorher einen Fehler gab, weil ein Kürzel nicht vorhanden war,
    ' der jetzt aber hinzugefügt wurde
    ProductIdDialog.refreshProductID
    
    MsgBox "Wert hinzugefügt!", vbInformation
    
End Sub

' ACHTUNG: diese Funktion darf nur zum Lesen der Daten genutzt werden. Zum Schreiben muss das MonitoredFile genutzt werden
Private Function getCSVDataArray2D() As ArrayList2D
    Set getCSVDataArray2D = getFileDataCSV.getStringArrayList2D
End Function


Private Function getFileDataCSV() As FileDataCSV
    Set getFileDataCSV = monitoredCsvFile.getDataCSV
End Function
