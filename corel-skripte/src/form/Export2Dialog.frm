VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} Export2Dialog 
   Caption         =   "Export 2"
   ClientHeight    =   7320
   ClientLeft      =   30
   ClientTop       =   370
   ClientWidth     =   5510
   StartUpPosition =   1  'Fenstermitte
   TypeInfoVer     =   67
End
Attribute VB_Name = "Export2Dialog"
Attribute VB_Base = "0{A628E652-4BB1-479B-89E4-FCECA259D0AD}{3DB3806B-B10E-4A25-A93B-9F73AC36E33F}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


Dim exportPath As New UIPathChooser
Dim runFolderPath As New UIOptionalPathChooser


Private Sub cmdClose_Click()
    Hide
End Sub

Private Sub ExportButton_Click()
    
    If Not exportPath.isPathValid Then
        MsgBox "Der Exportpfad ist nicht gültig", vbExclamation
        Exit Sub
    End If
    
    
    Dim specialShapesExportModeVar As SpecialShapesExportMode
    If Export2Dialog.SpecialLayersExportAllOptionButton.value Then
        specialShapesExportModeVar = exportAll
    ElseIf Export2Dialog.SpecialLayersExportNoneOptionButton.value Then
        specialShapesExportModeVar = exportNone
    Else
        specialShapesExportModeVar = exportOnce
    End If
    
    Dim exportOriginModeVar As ExportOriginMode
    
    If Export2Dialog.OriginDesignOptionButton.value Then
        exportOriginModeVar = ExportOriginMode.design
    ElseIf Export2Dialog.OriginPartOptionButton.value Then
        exportOriginModeVar = ExportOriginMode.part
    Else
        exportOriginModeVar = ExportOriginMode.layer
    End If
    
    Hide
    
    Export2.Start exportPath.path, runFolderPath.getPathIfOn, Export2Dialog.ModeComboBox.ListIndex, Export2Dialog.CutUVBleedCheckBox.value, specialShapesExportModeVar, _
        Export2Dialog.forceExportGroundPlateSeperatelyCheckBox.value, Export2Dialog.forceExportUploadboxSeperateCheckBox.value, _
        exportOriginModeVar, Export2Dialog.AutomaticGroundPlateVariantsCheckBox.value, False, Export2Dialog.ExportNormalDesignsCheckBox.value, Export2Dialog.ExportProductImageVariantDesignsCheckBox.value
End Sub


Private Sub ModeComboBox_Change()
    updateMode
End Sub


Private Function updateMode()
    
    Export2Dialog.ExportNormalDesignsCheckBox.Enabled = Export2Dialog.ModeComboBox.ListIndex = exportModeType.productPicture
    Export2Dialog.ExportProductImageVariantDesignsCheckBox.Enabled = Export2Dialog.ModeComboBox.ListIndex = exportModeType.productPicture
    
    ' Wenn AmazonDaten erstellt werden sollen und wir gerade mit einer CDR in einem [CDR] Ordner arbeiten,
    ' dann soll der Exportpfad der Oberordner sein, da dort die AmazonDaten exportiert werden müssen
    If Export2Dialog.ModeComboBox.ListIndex = exportModeType.SplitFileForAmazonKonfi Or Export2Dialog.ModeComboBox.ListIndex = exportModeType.SplitFileForNewStructure Then
        exportPath.useStructurePath = True
    Else
        ' Da der Fall oben den Pfad ändert, müssen wir ihn auf Standart zurücksetzen, wenn der Fall oben nicht greift
        exportPath.useStructurePath = False
    End If
    
    exportPath.initPath
End Function

Private Sub UserForm_Initialize()
    
    exportPath.init ExportFolderTextBox, ChangeExportFolderButton, False, , Globals.getDesktopPath() & "CorelExport"
    
    runFolderPath.init RunFolderTextBox, ChangeRunFolderButton, UseRunFolderCheckBox, False, , Globals.getNewStructureProductsFolder
    
    With Export2Dialog.ModeComboBox
        .AddItem "Produkt-Bild"
        .AddItem "Gravuru Konfi"
        .AddItem "Amazon Konfi"
        .AddItem "Designs aufteilen"
        .AddItem "Designs aufteilen (Neue Struktur)"
        .AddItem "Designs aufteilen (AmazonImport)"
    End With

    updateMode
End Sub

Public Function init()
    updateMode
    exportPath.initPath
End Function

Private Sub UseRunFolderCheckBox_Click()
    exportPath.setPathToStructurePath
End Sub
