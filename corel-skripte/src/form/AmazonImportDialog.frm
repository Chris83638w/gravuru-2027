VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} AmazonImportDialog 
   Caption         =   "Amazon Import"
   ClientHeight    =   1210
   ClientLeft      =   30
   ClientTop       =   370
   ClientWidth     =   4940
   StartUpPosition =   1  'Fenstermitte
   TypeInfoVer     =   10
End
Attribute VB_Name = "AmazonImportDialog"
Attribute VB_Base = "0{543F667F-C50B-4C3A-844A-D99FFCDBA8A2}{66871D2C-6601-4BA4-BFFB-0D9B0F5510C7}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


'Private Sub TV1_Enter()
'End Sub
'
'Private Sub UserForm_Initialize()
''    AmazonImportDialog.TV1.
''    TV1.OLEDropMode = ccOLEDropManual
'End Sub
'
'Private Sub ZipFileBrowserButton_Click()
'End Sub



'Private Sub TV1_Enter()
'    TV1.Cancel
'End Sub

Private Sub ZipFileBrowserButton_Click()
    Dim paths As collection
    Set paths = chooseFile
    'MsgBox "path=" & path
    Hide
    
    If Not paths.count = 0 Then
        AmazonImport.Start paths
    End If
End Sub


Private Sub cmdCancel_Click()
    Hide
End Sub

Public Function chooseFile() As collection
    Set chooseFile = MultiFileSelector.showFileOpenDialog("ZIP-Dateien, JSON-Dateien|*.zip;*.json", "Bitte wähle eine ZIP-Datei oder JSON-Datei aus")
    'chooseFile = CorelScriptTools.GetFileBox("ZIP-Dateien|*.zip|JSON-Dateien|*.json", "Bitte wähle eine ZIP-Datei oder JSON-Datei aus")
End Function
