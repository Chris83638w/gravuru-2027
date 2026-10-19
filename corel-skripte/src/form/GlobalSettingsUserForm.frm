VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} GlobalSettingsUserForm 
   Caption         =   "Einstellungen"
   ClientHeight    =   8980.001
   ClientLeft      =   30
   ClientTop       =   380
   ClientWidth     =   5510
   StartUpPosition =   1  'Fenstermitte
   TypeInfoVer     =   77
End
Attribute VB_Name = "GlobalSettingsUserForm"
Attribute VB_Base = "0{7BE267B1-878E-4757-8C6C-043A1AB65C36}{4E8E365F-E5DD-4657-B787-C4574735D21D}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


' Autor:  Martin Afelt @ GRAVURU
'
' TODO Zugriffe auf die Registry mittels GetSetting reduzieren. Dazu einfach alle Werte cachen und den cache erneuern, wenn der User einen Wert in der UI ändert

Public Function getSetting_RunFehlerFixerBeforeExport() As Boolean
    Dim bool As Variant
    bool = GetSetting("CorelDraw", "Tools-GlobalSettings", "RunFehler-FixerBeforeExport", False)
    
    getSetting_RunFehlerFixerBeforeExport = (bool)
End Function


Public Function getSetting_UseOptimize() As Boolean
    Dim bool As Variant
    bool = GetSetting("CorelDraw", "Tools-GlobalSettings", "UseOptimize", False)
    
    getSetting_UseOptimize = (bool)
End Function


Public Function getSetting_ResetDocAfterExport() As Boolean
    Dim bool As Variant
    bool = GetSetting("CorelDraw", "Tools-GlobalSettings", "ResetDocumentAfterExport", True) ' True, damit das Dokument nach dem Export zurückgesetzt wird. Denn es kam jetzt schon mehrfach vor, dass ein Dokument aus Versehen, nach dem Export gespeichert wurde und Formen kaput waren
    
    getSetting_ResetDocAfterExport = (bool)
End Function


Public Function getSetting_OrderPastedShapeAboveLastSelected() As Boolean
    Dim bool As Variant
    bool = GetSetting("CorelDraw", "Tools-GlobalSettings", "OrderPastedShapeAboveLastSelected", False)
    
    getSetting_OrderPastedShapeAboveLastSelected = (bool)
End Function

Public Function getSetting_UsePowerClipsForAmazonImport() As Boolean
    Dim bool As Variant
    bool = GetSetting("CorelDraw", "Tools-GlobalSettings", "UsePowerClipsForAmazonImport", False)
    
    getSetting_UsePowerClipsForAmazonImport = (bool)
End Function


Public Function getSetting_UseSpareSetForAmazonImport() As Boolean
    Dim bool As Variant
    bool = GetSetting("CorelDraw", "Tools-GlobalSettings", "UseSpareSetForAmazonImport", True) ' True, weil das die Standardeinstellung sein sollte
    
    getSetting_UseSpareSetForAmazonImport = (bool)
End Function


Public Function getSetting_CutUVProductsToDefaultBleedSize() As Boolean
    Dim bool As Variant
    bool = GetSetting("CorelDraw", "Tools-GlobalSettings", "CutUVProductsToDefaultBleedSize", True) ' True, weil das die Standardeinstellung sein sollte
    
    getSetting_CutUVProductsToDefaultBleedSize = (bool)
End Function


Public Function getSetting_IgnoreSmalCustomerImageRotations() As Boolean
    Dim bool As Variant
    bool = GetSetting("CorelDraw", "Tools-GlobalSettings", "IgnoreSmalCustomerImageRotations", True) ' True, weil das die Standardeinstellung sein sollte
    
    getSetting_IgnoreSmalCustomerImageRotations = (bool)
End Function


Public Function getSetting_UseGoogleDriveAsServer() As Boolean
    Dim bool As Variant
    bool = GetSetting("CorelDraw", "Tools-GlobalSettings", "UseGoogleDriveAsServer", False)
    
    getSetting_UseGoogleDriveAsServer = (bool)
End Function


Public Function getSetting_AmazonImportLoadPreviewImageInTemplates() As Boolean
    Dim bool As Variant
    bool = GetSetting("CorelDraw", "Tools-GlobalSettings", "AmazonImportLoadPreviewImageInTemplates", False)
    
    getSetting_AmazonImportLoadPreviewImageInTemplates = (bool)
End Function


Public Function getSetting_AmazonImportGravingModeEnabled() As Boolean
    Dim bool As Variant
    bool = GetSetting("CorelDraw", "Tools-GlobalSettings", "AmazonImportGravingMode", True)
    
    getSetting_AmazonImportGravingModeEnabled = (bool)
End Function

Public Function getSetting_AmazonImportPrintModeEnabled() As Boolean
    Dim bool As Variant
    bool = GetSetting("CorelDraw", "Tools-GlobalSettings", "AmazonImportPrintMode", True)
    
    getSetting_AmazonImportPrintModeEnabled = (bool)
End Function


' Lässt sich leider nicht per GMSManager.RunMacro aufrufen. Außer aus der Globals heraus
'Public Sub getSetting_OrderPastedShapeAboveLastSelectedSub(var() As Variant)
'    Dim bool As Variant
'    bool = GetSetting_OrderPastedShapeAboveLastSelected
'
'    MsgBox "bool: " & bool
'
'    var(0) = (bool)
'End Sub

Private Sub cmdClose_Click()
    Hide
End Sub

Private Sub EasterEggLabel_Click()
    Macros.EasterEgg
End Sub

' Es ist nur erlaubt, dass der User entweder nur im Gravur, Druck oder beiden Modi ist.
' Deshalb einen Modus immer aktivieren, wenn der andere deaktiviert wird
Private Sub ImportForGravingCheckBox_Click()
    If ImportForGravingCheckBox.value = False Then
        avoidRecursionOnImport = True
    End If
End Sub

' Hier gilt selbes wie in der Sub oben
Private Sub ImportForPrintCheckBox_Click()
    If ImportForPrintCheckBox.value = False Then
        avoidRecursionOnImport = True
    End If
End Sub

Private Sub Label1_Click()
    MsgBox "Wieso klickst du auf diesen Text. Was glaubst du soll dann passieren?"
End Sub

Private Sub OkayButton_Click()
    
    SaveSetting "CorelDraw", "Tools-GlobalSettings", "RunFehler-FixerBeforeExport", RunFehlerFixerCheckBox.value
    SaveSetting "CorelDraw", "Tools-GlobalSettings", "UseOptimize", UseOptimizeCheckBox.value
    SaveSetting "CorelDraw", "Tools-GlobalSettings", "ResetDocumentAfterExport", ResetDocAfterExportCheckBox.value
    SaveSetting "CorelDraw", "Tools-GlobalSettings", "OrderPastedShapeAboveLastSelected", OrderPastedShapeAboveLastSelectedCheckBox.value
    SaveSetting "CorelDraw", "Tools-GlobalSettings", "UsePowerClipsForAmazonImport", UsePowerClipForAmazonImportCheckBox.value
    SaveSetting "CorelDraw", "Tools-GlobalSettings", "UseSpareSetForAmazonImport", UseSpareSetCheckBox.value
    SaveSetting "CorelDraw", "Tools-GlobalSettings", "CutUVProductsToDefaultBleedSize", GlobalSettingsUserForm.CutUVToDefaultBleedCheckBox.value
    SaveSetting "CorelDraw", "Tools-GlobalSettings", "IgnoreSmalCustomerImageRotations", GlobalSettingsUserForm.IgnoreSmalCustomerImageRotationsCheckBox.value
    SaveSetting "CorelDraw", "Tools-GlobalSettings", "UseGoogleDriveAsServer", GlobalSettingsUserForm.GoogleDriveOptionButton.value
    SaveSetting "CorelDraw", "Tools-GlobalSettings", "AmazonImportLoadPreviewImageInTemplates", GlobalSettingsUserForm.LoadPreviewImageInTemplatesCheckBox.value
    SaveSetting "CorelDraw", "Tools-GlobalSettings", "AmazonImportGravingMode", GlobalSettingsUserForm.ImportForGravingCheckBox.value
    SaveSetting "CorelDraw", "Tools-GlobalSettings", "AmazonImportPrintMode", GlobalSettingsUserForm.ImportForPrintCheckBox.value
    
    Hide
End Sub



Public Function init()
    RunFehlerFixerCheckBox.value = getSetting_RunFehlerFixerBeforeExport
    UseOptimizeCheckBox.value = getSetting_UseOptimize
    ResetDocAfterExportCheckBox.value = getSetting_ResetDocAfterExport
    UsePowerClipForAmazonImportCheckBox.value = getSetting_UsePowerClipsForAmazonImport
    UseSpareSetCheckBox.value = getSetting_UseSpareSetForAmazonImport
    GlobalSettingsUserForm.CutUVToDefaultBleedCheckBox.value = getSetting_CutUVProductsToDefaultBleedSize
    GlobalSettingsUserForm.IgnoreSmalCustomerImageRotationsCheckBox.value = getSetting_IgnoreSmalCustomerImageRotations
    GlobalSettingsUserForm.GoogleDriveOptionButton.value = getSetting_UseGoogleDriveAsServer
    GlobalSettingsUserForm.LoadPreviewImageInTemplatesCheckBox.value = getSetting_AmazonImportLoadPreviewImageInTemplates
    
    ' Ordern
    OrderPastedShapeAboveLastSelectedCheckBox.value = getSetting_OrderPastedShapeAboveLastSelected
    
    Globals.checkIfServerOnlineAndSelectOfflineWorkPath
    GlobalSettingsUserForm.VersionLabel.Caption = "Deine Script-Version: " & Globals.getVersion.versionString & vbNewLine & "Version auf dem Server: " & Globals.getScriptVersionFromServer.versionString
    
    GlobalSettingsUserForm.ScriptIconVersionLabel.Caption = "Deine Symbolleisten-Version: " & Globals.getGravuruBarVersion.versionString & vbNewLine & "Version auf dem Server: " & Globals.getGravuruBarVersionFromServer.versionString
    
    GlobalSettingsUserForm.ImportForGravingCheckBox.value = getSetting_AmazonImportGravingModeEnabled
    GlobalSettingsUserForm.ImportForPrintCheckBox.value = getSetting_AmazonImportPrintModeEnabled
    
    GlobalSettingsUserForm.OkayButton.SetFocus
    
    OpenAdminSettingsLabel.Enabled = Not Globals.isReleaseVersion
    OpenAdminSettingsLabel.visible = Not Globals.isReleaseVersion
End Function


Private Sub OpenAdminSettingsLabel_Click()
    Hide
    AdminDialog.Show
End Sub



Private Sub PSScriptsInstallButton_Click()
    Dim result As VbMsgBoxResult
    result = MsgBox("Möchtest du die Photoshop Skripte wirklich installieren?", vbYesNo Or vbQuestion, "Wirklich installieren?")
    If result = vbNo Then
        Exit Sub
    End If
    
    Dim fileName As String
    fileName = Globals.addBackslash(Globals.getMainPhotoshopFolderOfServer) & "Skript installieren\Photoshop Skripte installieren.atn"
    If Not Globals.fileExist(fileName) Then
        MsgBox "Die Datei '" & fileName & "' konnte nicht gefunden werden!", vbCritical
        Exit Sub
    End If
'    MsgBox fileName
    Globals.openFile fileName
End Sub

Private Sub UpdateButton_Click()
    Globals.checkIfServerOnlineAndSelectOfflineWorkPath
    Globals.openUpdateInstaller
    Hide
    
    If ActiveDocument Is Nothing Then Quit
End Sub

Private Sub UpdateScriptIconsButton_Click()

    Globals.askScriptIconsUpdateInstallation
    
End Sub

Private Sub UseOptimizeCheckBox_Click()

    ' Wenn der User die Optimierung ausstellt, soll sie sofort in Corel ausgestellt werden,
    ' da es sein kann, dass Corel wegen Optimize eingefroren ist
    If Not UseOptimizeCheckBox.value Then
        Globals.optimize False
    End If
End Sub

