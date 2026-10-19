VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} ExportDialog 
   Caption         =   "Export"
   ClientHeight    =   6390
   ClientLeft      =   120
   ClientTop       =   470
   ClientWidth     =   5510
   StartUpPosition =   1  'Fenstermitte
   TypeInfoVer     =   120
End
Attribute VB_Name = "ExportDialog"
Attribute VB_Base = "0{931455D8-9BA6-4615-BF66-8613D1D1F31A}{D66FFA97-8139-4103-99AC-B350378B4D87}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


Dim exportPath As New UIPathChooser

Private Sub cmdClose_Click()
    Hide
End Sub


Private Sub CommandButton3_Click()

    newPath = CorelScriptTools.GetFolder(Export1.exportPathNewStructure)
    If Not newPath = "" Then
        Export1.exportPathNewStructure = newPath & "\"
    End If
    
    'MsgBox "exportPath=" & exportPath
    ExportPathTextBox2.value = Export1.exportPath
End Sub

Private Sub ExportButton_Click()
    If Not exportPath.isPathValid Then
        MsgBox "Exportpfad nicht gültig"
        Exit Sub
    End If

    Hide
    
    Dim exportSpecialLayers As Boolean
    Dim exportSpecialLayersSeperate As Boolean
    If ExportDialog.ExportLayersComboBox.value = "seperat exportieren" Or ExportDialog.ExportLayersComboBox.value = "" Then
        exportSpecialLayers = True
        exportSpecialLayersSeperate = True

    ElseIf ExportDialog.ExportLayersComboBox.value = "zusammen exportieren" Then
        exportSpecialLayers = True
        exportSpecialLayersSeperate = False
    Else ' garnicht exportieren
        exportSpecialLayers = False
        exportSpecialLayersSeperate = False
    End If
    
    Export1.Start exportPath.path, ExportDialog.ModeComboBox.ListIndex, False, LCase(ExportDialog.FileFormatComboBox.value), exportSpecialLayers, exportSpecialLayersSeperate, ExportDialog.Prefix.value
End Sub


Private Sub UserForm_Initialize()
    
    exportPath.init ExportPathTextBox, CommandButton2, False, , Globals.getDesktopPath() & "CorelExport"
    
    With ExportDialog.ModeComboBox
        .AddItem "Produkt-Bild"
        .AddItem "Gravuru Konfi"
        .AddItem "Amazon Konfi"
        .AddItem "Grundplatten-Look"
    End With
    
    With ExportDialog.FileFormatComboBox
        .AddItem "PNG"
        .AddItem "CDR"
        .AddItem "SVG"
    End With
    
    With ExportDialog.ExportLayersComboBox
        .AddItem "seperat exportieren"
        .AddItem "zusammen exportieren"
        .AddItem "garnicht exportieren"
    End With
        
End Sub



