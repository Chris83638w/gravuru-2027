VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} ProductIdDialog 
   Caption         =   "Artikelnummer"
   ClientHeight    =   7680
   ClientLeft      =   30
   ClientTop       =   370
   ClientWidth     =   5510
   StartUpPosition =   1  'Fenstermitte
   TypeInfoVer     =   298
End
Attribute VB_Name = "ProductIdDialog"
Attribute VB_Base = "0{ABDC5893-3E4F-4C54-962C-C5E9DEB72063}{E400E648-F4FB-4BD6-AEC8-EB86680083A5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


Dim selectedDesigns As collection
Dim firstDesign As productDesign
Dim designWithProductID As productDesign
Dim productIDObj As New ProductIDObject

Dim dataFolder As String

Dim ignoreSizeTextBoxChange As Boolean
Dim ignoreDesignNumberTextBoxChange As Boolean
Dim ignoreProductIDTextBoxChange As Boolean
Dim ignoreDesignNumberSpinButtonChange As Boolean
Dim ignoreProductImageVariantNrTextBoxChange As Boolean
Dim ignoreProductImageVariantNumberSpinButtonChange As Boolean
Dim ignoreTypeChanged As Boolean

Dim productLineProperty As New UIProductIDProperty
Dim materialProperty As New UIProductIDProperty

' Gründe, warum die aktuelle Artikelnummer nicht OK ist (und rot angezeigt wird)
Dim errorReasons As String


Dim logger As logger


' Shopify ID Page
' ----------------
Dim fancyCustomizationIDsCSV As MonitoredFile
Dim fancyCustomizationIDCategoriesCSV As MonitoredFile


Public Function getDataFolder() As String
    If dataFolder = "" Then
        Globals.checkIfServerOnlineAndSelectOfflineWorkPath
        dataFolder = Globals.addBackslash(Globals.getMainFolder()) & "ProductID\Data\"
    End If
    getDataFolder = dataFolder
End Function


Public Function init()
    
    ' Logger ist Standartmäßig aus
'    Set logger = New logger
'    logger.init "ProductID"
    
    Set selectedDesigns = Globals.getSelectedDesignsOrAll(onlyValidDesigns:=True, ignoreMasterDesign:=False, ignoreMasterDesignIfNotExplicitlySelected:=True, ignoreRedDesignsToIgnore:=False, ignoreProductImageVariantDesigns:=False)
    If selectedDesigns.count > 0 Then Set firstDesign = selectedDesigns(1)
    
    Dim allDesigns As New collection
    Set allDesigns = Globals.getAllDesigns
    
    
    ' Design mit Artikelummer finden
    ' -----------------------
    Dim design As productDesign
    Set designWithProductID = Nothing
    For i = 1 To selectedDesigns.count
        Set design = selectedDesigns(i)
        
        If Not design.getProductID = "" Then
            Set designWithProductID = design
            Exit For
        End If
        
        Set design = Nothing
    Next i
    ' Wenn unter den ausgewählten Designs kein Design mit Artikelnummer gefunden wurde, dann suchen wir in allen Designs nach so einem Design
    If designWithProductID Is Nothing Then
        
        For i = 1 To allDesigns.count
            Set design = allDesigns(i)
            
            If Not design.getProductID = "" Then
                Set designWithProductID = design
                Exit For
            End If
            
            Set design = Nothing
        Next i
        
    End If
    ' -----------------------
    
    
    
    
    ' Wenn der Wert auf 1 steht (Standart) und man dann auf 'runter' klickt ist er auf 0.
    ' Dadurch ändert sich aber nichts. Wenn er auf 0 ist und man dann auf 'runter' klickt währe er auf -1, was nicht geht
    ignoreDesignNumberSpinButtonChange = True
    ProductIdDialog.DesignNumberSpinButton.value = 1
    ignoreDesignNumberSpinButtonChange = False
    
    productLineProperty.newProductIDProperty ProductIdDialog.ProductLineComboBox, ProductIdDialog.ProductLineShortComboBox, ProductIdDialog.AddProductLineCommandButton, productID.getProductLineShortToFullNameCSVFile, "Produktlinie", "Produktlinien-Kürzel", logger
    materialProperty.newProductIDProperty ProductIdDialog.MaterialComboBox, ProductIdDialog.MaterialShortComboBox, ProductIdDialog.AddmaterialCommandButton, productID.getMaterialShortToFullNameCSVFile, "Material", "Material-Kürzel", logger
    
    ' Artikelnummer vom Design entnehmen
    If Not designWithProductID Is Nothing Then
        ProductIdDialog.ProductIdTextBox.value = designWithProductID.getProductID
    End If
    
    If selectedDesigns.count = 0 Then
        ' Standart auswählen
        ProductIdDialog.ProductLineComboBox.ListIndex = 0
        ProductIdDialog.ProductLineShortComboBox.ListIndex = 0
        
    Else
        ' Sorgt für Fehler
'        ' Werte aus bereits vorhandener Artikelnummer ablesen:
'        If firstDesign.hasProductIDString Then
'            setProductID firstDesign.getProductID
'        End If
    End If
    
    
    ProductIdDialog.ProductIdTextBox.SetFocus
    ProductIdDialog.ProductIdTextBox.SelStart = 0
    ProductIdDialog.ProductIdTextBox.SelLength = Len(ProductIdDialog.ProductIdTextBox.value)

    ' Formname & Kürzel setzen
    If Not firstDesign Is Nothing Then
        ' Der ProductRecognizer benötigt das MainShape
        If Not firstDesign.getLayer2(1).getMainShape Is Nothing Then
            ProductIdDialog.ShapeLabel.Caption = ProductRecognizer.recognizeProductLayerName(firstDesign.getLayer2(1))
            ProductIdDialog.ShapeShortLabel.Caption = ""
        End If
    Else
        ProductIdDialog.ShapeLabel.Caption = ""
        ProductIdDialog.ShapeShortLabel.Caption = ""
    End If
    
    typeChanged
    
    ProductIdDialog.ProductIdTextBox.font.size = 9
    
    ' Komischerweise dürfen die 'MonitoredFile's nicht schon oben beim Deklarieren erstellt werden. Sonst ist beim 2. öffne des Dialogfensters die 'p_data' einfach Nothing !?!??
    If fancyCustomizationIDsCSV Is Nothing Then
        Set fancyCustomizationIDsCSV = New MonitoredFile
        fancyCustomizationIDsCSV.newMonitoredFile (Globals.getMainFolder & "ProductID\Data\FancyCustomizationIDs.csv")
    End If
    
    If fancyCustomizationIDCategoriesCSV Is Nothing Then
        Set fancyCustomizationIDCategoriesCSV = New MonitoredFile
        fancyCustomizationIDCategoriesCSV.newMonitoredFile (Globals.getMainFolder & "ProductID\Data\FancyCustomizationIDCategories.csv")
    End If
    
End Function




Private Sub CancelCommandButton_Click()
    Hide
End Sub




Private Sub CountDesignnumberOptionButton_Click()
    DesignNumberTextBox.Enabled = True
End Sub

Private Sub CountKeepOptionButton_Click()
    DesignNumberTextBox.Enabled = False
End Sub

Private Sub CountPorductImageVariantNumberOptionButton_Click()
    DesignNumberTextBox.Enabled = True
End Sub

Private Sub DeleteButton_Click()
    Hide
    productID.removeItemID
End Sub


Private Sub KeepTypeOptionButton_Click()
    typeChanged
End Sub

Private Sub NormalTypeOptionButton_Click()
    typeChanged
End Sub

Private Sub IgnoreTypeOptionButton_Click()
    typeChanged
End Sub



Private Sub ProductImageVariantOptionButton_Click()
    If ProductIdDialog.ProductImageVariantNrTextBox.text = "" Then
        ProductIdDialog.ProductImageVariantNrTextBox.text = "1"
    End If
    typeChanged
End Sub

Private Sub ProductImageVariantNrTextBox_Change()
    If Not logger Is Nothing Then logger.addTab , "[ProductIdDialog.ProductImageVariantNrTextBox_Change]"

    If ignoreProductImageVariantNrTextBoxChange Then
        ignoreProductImageVariantNrTextBoxChange = False
        If Not logger Is Nothing Then logger.logINFO "Ignoriert!"
        GoTo ExitSub
    End If
    
    refreshProductIDTextBox
    
ExitSub:
    If Not logger Is Nothing Then logger.removeTab
End Sub

Private Sub ProductImageVariantNrTextBox_KeyPress(ByVal KeyAscii As MSForms.ReturnInteger)
    ' Nur Zahlen dürfen eingetippt werden
    If Not (KeyAscii >= 48 And KeyAscii <= 57) Then
        KeyAscii = 0 ' Keine Zahl -> Verbieten
    End If
End Sub

' Produkbildervarianten Spinner wurde gedrückt
Private Sub ProductImageVariantSpinButton_Change()
    If Not logger Is Nothing Then logger.addTab , "[ProductIdDialog.ProductImageVariantSpinButton_Change] .value: '" & ProductIdDialog.ProductImageVariantSpinButton.value & "'"
    
    If Not ProductIdDialog.ProductImageVariantNrTextBox.Enabled Then
        If Not logger Is Nothing Then logger.logINFO "Nicht enabled"
        GoTo ExitSub
    End If
    
    
    If ignoreProductImageVariantNumberSpinButtonChange Then
        If Not logger Is Nothing Then logger.logINFO "Ignoriert!"
        ignoreProductImageVariantNumberSpinButtonChange = False
        GoTo ExitSub
    End If
    
    Dim currentValue As Integer
    If Not ProductIdDialog.ProductImageVariantNrTextBox.text = "" Then
        If IsNumeric(ProductIdDialog.ProductImageVariantNrTextBox.text) Then
            currentValue = CInt(ProductIdDialog.ProductImageVariantNrTextBox.text)
        End If
    End If
    
    Dim realSpinButtonValue As Integer
    realSpinButtonValue = ProductIdDialog.ProductImageVariantSpinButton.value - 1
    
    If Not logger Is Nothing Then logger.logINFO "realSpinButtonValue: '" & realSpinButtonValue & "'"
    
    currentValue = currentValue + realSpinButtonValue
'    If currentValue <= 0 Then
'        ProductIdDialog.ProductImageVariantNrTextBox.text = ""
'    Else
        currentValue = max(currentValue, 1)
        ProductIdDialog.ProductImageVariantNrTextBox.text = CStr(currentValue)
'    End If
    
    
    
    If Not logger Is Nothing Then logger.logINFO "ignoreProductImageVariantNumberSpinButtonChange = True"
    ignoreProductImageVariantNumberSpinButtonChange = True
    ProductIdDialog.ProductImageVariantSpinButton.value = 1
    ignoreProductImageVariantNumberSpinButtonChange = False
    
ExitSub:
    If Not logger Is Nothing Then logger.removeTab
End Sub


Private Sub RenameButton_Click()
    Hide
    'productID.startRenameProductID PrefixTextBox.value, SuffixTextBox.value, SearchTextBox.value, ReplaceTextBox.value
    ' TODO DEBUG TEST               vv
    productID.createProductID "", RenameDesignFolderCheckBox2.value, PrefixTextBox.value, SuffixTextBox.value, SearchTextBox.value, ReplaceTextBox.value, False, False, getProductIDType, ProductIdDialog.RenameRelatedProductImageVariantsCheckBox.value, _
        ProductIdDialog.CountDesignnumberOptionButton.value
End Sub


Private Sub StartButton_Click()
    If ProductIdTextBox.value = "" Then
        MsgBox "Bitte trage eine Artikelnummer ein", vbInformation
    ElseIf Not errorReasons = "" Then
        MsgBox errorReasons, vbInformation
    Else
        Hide
        
        ' Durchnummerierungs Typ ermitteln
        ' ----------------------------------------
        Dim countType As ProductIDCountType
        If ProductIdDialog.CountDesignnumberOptionButton.value Then
            countType = DesignNumberCountType
        ElseIf ProductIdDialog.CountPorductImageVariantNumberOptionButton.value Then
            countType = ImageVariantNumberCountType
        Else
            countType = KeepCountType
        End If
        ' ----------------------------------------
        
        productID.createProductID ProductIdDialog.ProductIdTextBox.value, ProductIdDialog.RenameDesignFolderCheckBox.value, _
            "", "", "", "", _
            ProductIdDialog.BackwardsCheckBox.value, ProductIdDialog.sortDesignsBefore.value, getProductIDType, ProductIdDialog.RenameRelatedProductImageVariantsCheckBox.value, countType
    End If
    
End Sub





Private Sub ProductIdTextBox_KeyPress(ByVal KeyAscii As MSForms.ReturnInteger)
    Dim dot As Integer
    dot = 46 ' Punkt aus der ASCII Tabelle
    
    Dim spaceAscii As Integer
    spaceAscii = 32
    
    If KeyAscii = dot Or KeyAscii = spaceAscii Then
        KeyAscii = 0 ' Keine Zahl -> Verbieten
    End If
End Sub


Private Sub ProductIdTextBox_Change()
    
    If Not logger Is Nothing Then logger.addTab , "[ProductIdDialog.ProductIdTextBox_Change]: '" & ProductIdDialog.ProductIdTextBox.value & "', ignoreProductIDTextBoxChange: '" & ignoreProductIDTextBoxChange & "'"

    If ignoreProductIDTextBoxChange Then
        ignoreProductIDTextBoxChange = False
        If Not logger Is Nothing Then logger.logINFO "Ignoriert!"
        GoTo ExitSub
    End If
    
    setProductID ProductIdDialog.ProductIdTextBox.value
ExitSub:
    If Not logger Is Nothing Then logger.removeTab
End Sub


' Zerlegt eine Artikelnummer und setzt die Bestandteile in die passenden (Text) Felder
Public Function setProductID(productID As String, Optional refreshUI As Boolean = False)
    
    If Not logger Is Nothing Then logger.addTab , "[ProductIdDialog.setProductID] productID: '" & productID & "', refreshUI: '" & refreshUI & "'"
    
    'Debug.Print "ProductIdDialog.setProductID: " & productID
    setProductIDHasError False
    
    productIDObj.setProductID productID
    
    
    ' Produktlinie
    ' :::::::::::::::::::::::
    If Not productIDObj.getProductLine = "" Then
        If Not logger Is Nothing Then logger.logINFO "Produktlinie erkannt"

        productLineProperty.ignorePropertyComboBoxChange = Not refreshUI
        productLineProperty.ignorePropertyShortComboBoxChange = Not refreshUI ' Normale Combobox ändert auch die Combobox mit dem Kürzel. Deshalb  die Combobox mit Kürzel ignorieren
        ProductIdDialog.ProductLineShortComboBox.value = productIDObj.getProductLine

        If ProductIdDialog.ProductLineShortComboBox.ListIndex = -1 Then
            setProductIDHasError True, "Das Produktlinien Kürzel exestiert noch nicht"
            If Not refreshUI Then
                productLineProperty.ignorePropertyComboBoxChange = True
                productLineProperty.ignorePropertyShortComboBoxChange = Not refreshUI ' Normale Combobox ändert auch die Combobox mit dem Kürzel. Deshalb  die Combobox mit Kürzel ignorieren
                ProductIdDialog.ProductLineComboBox.value = ""
            End If
        Else
            If Not refreshUI Then
                productLineProperty.ignorePropertyComboBoxChange = True
                productLineProperty.ignorePropertyShortComboBoxChange = Not refreshUI ' Normale Combobox ändert auch die Combobox mit dem Kürzel. Deshalb  die Combobox mit Kürzel ignorieren
                ProductIdDialog.ProductLineComboBox.ListIndex = ProductIdDialog.ProductLineShortComboBox.ListIndex
            End If
        End If
    Else
        setProductIDHasError True, "Produktlinie fehlt"
        If Not logger Is Nothing Then logger.logINFO "Keine Produktlinie erkannt. Setze Comboboxen für Produktlinienname und Kürzel zurück"
        productLineProperty.ignorePropertyComboBoxChange = Not refreshUI
        productLineProperty.ignorePropertyShortComboBoxChange = Not refreshUI ' Normale Combobox ändert auch die Combobox mit dem Kürzel. Deshalb auch die Combobox mit Kürzel ignorieren
        ProductIdDialog.ProductLineComboBox.value = ""

        productLineProperty.ignorePropertyShortComboBoxChange = Not refreshUI
        ProductIdDialog.ProductLineShortComboBox.value = ""
    End If
    productLineProperty.ignorePropertyComboBoxChange = False
    productLineProperty.ignorePropertyShortComboBoxChange = False ' Wieder deaktivieren. Denn wenn der neue Wert genau der slebe ist wie der Alte, dann wird der EventListener nicht aufgerufen und dieser Boolean nicht deaktiviert
    
    
    ' Material
    ' :::::::::::::::::::::::
    If Not productIDObj.getMaterial = "" Then
        materialProperty.ignorePropertyShortComboBoxChange = Not refreshUI
        ProductIdDialog.MaterialShortComboBox.text = productIDObj.getMaterial
        If ProductIdDialog.MaterialShortComboBox.ListIndex = -1 Then
            setProductIDHasError True, "Das Material Kürzel exestiert noch nicht"
            If Not refreshUI Then
                materialProperty.ignorePropertyComboBoxChange = True
                ProductIdDialog.MaterialComboBox.text = ""
            End If
        Else
            If Not refreshUI Then
                materialProperty.ignorePropertyComboBoxChange = True
                ProductIdDialog.MaterialComboBox.ListIndex = ProductIdDialog.MaterialShortComboBox.ListIndex
            End If
        End If
    Else
        setProductIDHasError True, "Material fehlt"
        materialProperty.ignorePropertyComboBoxChange = Not refreshUI
        materialProperty.ignorePropertyShortComboBoxChange = Not refreshUI
        ProductIdDialog.MaterialComboBox.text = ""
        ProductIdDialog.MaterialShortComboBox.text = ""
    End If
    materialProperty.ignorePropertyComboBoxChange = False
    materialProperty.ignorePropertyShortComboBoxChange = False ' Wieder deaktivieren. Denn wenn der neue Wert genau der slebe ist wie der Alte, dann wird der EventListener nicht aufgerufen und dieser Boolean nicht deaktiviert
    
    
    ' Größe
    ' :::::::::::::::::::::::
    ignoreSizeTextBoxChange = Not refreshUI
    ProductIdDialog.SizeTextBox.text = productIDObj.getSize
    If ProductIdDialog.SizeTextBox.text = "" Then setProductIDHasError True, "Größe fehlt"
    ignoreSizeTextBoxChange = False ' Wieder deaktivieren. Denn wenn der neue Wert genau der slebe ist wie der Alte, dann wird der EventListener nicht aufgerufen und dieser Boolean nicht deaktiviert
    
    
    ' Design Nummer
    ' :::::::::::::::::::::::
    ignoreDesignNumberTextBoxChange = Not refreshUI
    ' Designnummer nicht zwingend erfordelich
    If productIDObj.getDesignNumber > 0 Then
        ProductIdDialog.DesignNumberTextBox = CStr(productIDObj.getDesignNumber)
    Else
        ProductIdDialog.DesignNumberTextBox = ""
    End If
    ignoreDesignNumberTextBoxChange = False ' Wieder deaktivieren. Denn wenn der neue Wert genau der slebe ist wie der Alte, dann wird der EventListener nicht aufgerufen und dieser Boolean nicht deaktiviert
    
    
    ' Produktbild-Varianten-Nummer
    ' :::::::::::::::::::::::
    ignoreProductIDTextBoxChange = Not refreshUI
    ignoreTypeChanged = Not refreshUI
    ignoreProductImageVariantNrTextBoxChange = Not refreshUI
    If productIDObj.hasProductImageVariantNumber Then
        ProductIdDialog.ProductImageVariantNrTextBox.value = CStr(productIDObj.getProductImageVariantNumber)
        ProductIdDialog.ProductImageVariantOptionButton.value = True
    Else
        ProductIdDialog.ProductImageVariantNrTextBox.value = ""
        ProductIdDialog.KeepTypeOptionButton.value = True
    End If
    ignoreProductIDTextBoxChange = False
    ignoreProductImageVariantNrTextBoxChange = False
    ignoreTypeChanged = False
    
    
    ' Master Design
    ' :::::::::::::::::::::::
    If productIDObj.isMasterDesign Then setProductIDHasError False
    
    
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function refreshProductID()
    setProductID ProductIdDialog.ProductIdTextBox.text, True
End Function


' Hiermit wird die Artikelnummer-Textbox aktualisiert.
' Dazu werden die Einträge aus den anderen Felder (für z.B: die Größe) genommen und zu einer Artikelnummer zusammengesetzt.
' Diese Artikelnummer wird dann in die Artikelnummer-Textbox gesetzt.
Public Function refreshProductIDTextBox()
    If Not logger Is Nothing Then logger.addTab , "[ProductIdDialog.refreshProductIDTextBox]"

    productIDObj.setDefaultValues
    
    setProductIDHasError False
    
    ' Produktlinien-Kürzel Gedenktafel -> GD
    If Not ProductIdDialog.ProductLineShortComboBox.text = "" Then productIDObj.setProductLine ProductIdDialog.ProductLineShortComboBox.text, False
    ' Warnen
    If ProductIdDialog.ProductLineShortComboBox.ListIndex = -1 Then setProductIDHasError True, "Produktlinie fehlt"
    
    ' Material
    If Not ProductIdDialog.MaterialShortComboBox.text = "" Then
        productIDObj.setMaterial ProductIdDialog.MaterialShortComboBox.text
    End If
    
    ' Form
    If Not ProductIdDialog.ShapeShortLabel.Caption = "" Then
        ' TODO ProductIDObject unterstützt noch kein Formname (Falls das jemals nötig sein wird)
        ' ProductIdDialog.ShapeShortLabel.Caption
    End If
    
    ' Größe
    If Not ProductIdDialog.SizeTextBox.text = "" Then
        productIDObj.setSize ProductIdDialog.SizeTextBox.text
    End If
    
    ' Design Nummer
    If Not ProductIdDialog.DesignNumberTextBox.text = "" Then
        productIDObj.setDesignNumber ProductIdDialog.DesignNumberTextBox.text
    End If
    
    ' Produktbild-Varianten-Nummer
    If Not ProductIdDialog.ProductImageVariantNrTextBox.text = "" And ProductIdDialog.ProductImageVariantNrTextBox.Enabled Then
        productIDObj.setProductImageVariantNumber ProductIdDialog.ProductImageVariantNrTextBox.text
    End If
    
    
    ' Wenn die Textbox schon den Text hat, nicht nochmal setzen. Denn dadurch wird der Trigger "ProductIdTextBox_Change" nicht ausgelößt
    ' "ignoreProductIDTextBoxChange" wird aber auf True gesetzt. Das bedeutet,
    ' dass die nächste Änderung zwar das "ProductIdTextBox_Change" Event auslöst aber der Code darin wird nicht ausgeführt wegen "ignoreProductIDTextBoxChange"
    Dim productIDObjForComparison As New ProductIDObject
    productIDObjForComparison.setProductID ProductIdDialog.ProductIdTextBox.text
    If Not logger Is Nothing Then logger.logINFO "Prüfe, ob sich die Artikelnummer im Textfeld aktualisiert werden muss. Vegleiche (alt)'" & productIDObjForComparison.getProductID & "' mit (neu)'" & productIDObj.getProductID & "' :"
    If Not productIDObjForComparison.getProductID = productIDObj.getProductID Then
        If Not logger Is Nothing Then logger.logINFO "- Sind unterschiedlich. ProductIdTextBox wird aktualisiert mit '" & productIDObj.getProductID & "'"
        If Not logger Is Nothing Then logger.logINFO "ignoreProductIDTextBoxChange = True"
        ignoreProductIDTextBoxChange = True
        ProductIdDialog.ProductIdTextBox.text = productIDObj.getProductID
    Else
        If Not logger Is Nothing Then logger.logINFO "- Sind gleich. ProductIdTextBox wird NICHT aktualisiert"
    End If
    ignoreProductIDTextBoxChange = False
    
    If Not logger Is Nothing Then logger.removeTab
End Function




' Größe geändert
Private Sub SizeTextBox_Change()

    If Not logger Is Nothing Then logger.addTab , "[ProductIDProperty.SizeTextBox_Change]"
    
    If ignoreSizeTextBoxChange Then ' Endlosschleife verhindern
        If Not logger Is Nothing Then logger.logINFO "Ignoriert!"
        ignoreSizeTextBoxChange = False
        Exit Sub
    End If
    
    refreshProductIDTextBox
    If Not logger Is Nothing Then logger.removeTab
End Sub



' Etwas wird in das Feld für die Größe eingegeben
Private Sub SizeTextBox_KeyPress(ByVal KeyAscii As MSForms.ReturnInteger)
    
'    Debug.Print "KeyAscii: " & KeyAscii
    
    ' Nur ein 'x' erlauben (nicht mehrere)
    Dim hasX As Boolean
    hasX = InStr(SizeTextBox.text, "x")
    
    Dim komma As Integer
    komma = 44
    
    Dim x As Integer
    x = 120
    
    Dim a As Integer
    a = 65 ' Großes A (Um Din-A Größen zu ermöglichen)
    
    If Not ((KeyAscii >= 48 And KeyAscii <= 57) Or (KeyAscii = x And Not hasX) Or KeyAscii = komma Or (KeyAscii = a)) Then
        KeyAscii = 0 ' Keine Zahl -> Verbieten
    End If
End Sub




    

' Designnummer Pfeilbutton wurde gedrückt
Private Sub DesignNumberSpinButton_Change()
    If Not logger Is Nothing Then logger.addTab , "[ProductIdDialog.DesignNumberSpinButton_Change] .value: '" & ProductIdDialog.DesignNumberSpinButton.value & "'"
    
    
    If ignoreDesignNumberSpinButtonChange Then
        If Not logger Is Nothing Then logger.logINFO "Ignoriert!"
        ignoreDesignNumberSpinButtonChange = False
        GoTo ExitSub
    End If
    
    Dim currentValue As Integer
    If Not ProductIdDialog.DesignNumberTextBox.text = "" Then
        If IsNumeric(ProductIdDialog.DesignNumberTextBox.text) Then
            currentValue = CInt(ProductIdDialog.DesignNumberTextBox.text)
        End If
    End If
    
    Dim realSpinButtonValue As Integer
    realSpinButtonValue = ProductIdDialog.DesignNumberSpinButton.value - 1
    
    If Not logger Is Nothing Then logger.logINFO "realSpinButtonValue: '" & realSpinButtonValue & "'"
    
    currentValue = currentValue + realSpinButtonValue
    If currentValue < 1 Then
        ' Wenn der aktuelle Wert unter 1 ist, dann soll einfach keine D-Nummer verwendet werden (Standartdesign)
        ProductIdDialog.DesignNumberTextBox.text = ""
    Else
        currentValue = max(currentValue, 1)
        ProductIdDialog.DesignNumberTextBox.text = CStr(currentValue)
    End If
    
    If Not logger Is Nothing Then logger.logINFO "ignoreDesignNumberSpinButtonChange = True"
    ignoreDesignNumberSpinButtonChange = True
    ProductIdDialog.DesignNumberSpinButton.value = 1
    ignoreDesignNumberSpinButtonChange = False
    
ExitSub:
    If Not logger Is Nothing Then logger.removeTab
End Sub



' Designnummer wurde eingegeben
Private Sub DesignNumberTextBox_Change()
    If Not logger Is Nothing Then logger.addTab , "[ProductIdDialog.DesignNumberTextBox_Change]"

    If ignoreDesignNumberTextBoxChange Then
        ignoreDesignNumberTextBoxChange = False
        If Not logger Is Nothing Then logger.logINFO "Ignoriert!"
        GoTo ExitSub
    End If
    
    refreshProductIDTextBox
    
ExitSub:
    If Not logger Is Nothing Then logger.removeTab
End Sub



Private Sub DesignNumberTextBox_KeyPress(ByVal KeyAscii As MSForms.ReturnInteger)
    ' Nur Zahlen dürfen eingetippt werden
    If Not (KeyAscii >= 48 And KeyAscii <= 57) Then
        KeyAscii = 0 ' Keine Zahl -> Verbieten
    End If
End Sub



Private Function setProductIDHasError(hasError As Boolean, Optional errorReason As String)
    If hasError Then
        ProductIdDialog.ProductIdTextBox.ForeColor = RGB(255, 0, 0)
        
        If Not errorReason = "" Then
            errorReasons = Globals.addStringWithDelimiterIfNeeded(errorReasons, errorReason)
        End If
    Else
        errorReasons = ""
        ProductIdDialog.ProductIdTextBox.ForeColor = RGB(0, 0, 0)
    End If
    
    ProductIdDialog.ProductIdTextBox.ControlTipText = errorReasons
End Function


' Artikelnummertype wurde geändert.
Public Function typeChanged()
    If Not logger Is Nothing Then logger.addTab , "[ProductIdDialog.typeChanged]"
        
    Dim productIDType As productIDType
    productIDType = getProductIDType
    
    ProductIdDialog.ProductImageVariantNrTextBox.Enabled = productIDType = ProductImageVariantProductID
    ProductIdDialog.RenameRelatedProductImageVariantsCheckBox.Enabled = Not (productIDType = ProductImageVariantProductID)
    
    refreshCountType
    
    If ignoreTypeChanged Then
        ignoreTypeChanged = False
    Else
        refreshProductIDTextBox
    End If
    
    If Not logger Is Nothing Then logger.removeTab
End Function


' Aktualisiert die beiden Radiobuttons die angeben, ob Designnummern oder Produktbild-Varianten-Nummern durchnummeriert werden sollen
Public Function refreshCountType()
    Dim countDesignNumber As Boolean
    countDesignNumber = Not (getProductIDType = ProductImageVariantProductID)
    ProductIdDialog.CountDesignnumberOptionButton.value = countDesignNumber
    ProductIdDialog.CountPorductImageVariantNumberOptionButton = Not countDesignNumber
End Function


' Entnimmt anhand der GUI Auswahl, welcher 'productIDType' ausgewählt ist
Public Function getProductIDType() As productIDType
    If ProductIdDialog.NormalTypeOptionButton.value Then
        getProductIDType = NormalProductID
    ElseIf ProductIdDialog.IgnoreTypeOptionButton.value Then
        getProductIDType = IgnoreProductID
    ElseIf ProductIdDialog.ProductImageVariantOptionButton.value Then
        getProductIDType = ProductImageVariantProductID
    Else
        getProductIDType = Keep
    End If
End Function


