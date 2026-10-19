VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} AmazonImportTemplateDialog 
   ClientHeight    =   1680
   ClientLeft      =   30
   ClientTop       =   370
   ClientWidth     =   5180
   StartUpPosition =   1  'Fenstermitte
   TypeInfoVer     =   12
End
Attribute VB_Name = "AmazonImportTemplateDialog"
Attribute VB_Base = "0{632365CA-0E2C-4D2E-9E74-A40E835EBD4D}{49F78047-ED52-44C9-98D5-3A4EFB1FE2A9}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


Private selectedItem As Integer

Private Sub CancelButton_Click()
    selectedItem = -1 ' Abgebrochen
    
    Hide
End Sub

Private Sub OKButton_Click()
    selectedItem = AmazonImportTemplateDialog.SelectionComboBox.ListIndex + 1
    
    Hide
End Sub


Public Function showDialog(templateNames As ArrayList, templatePaths As ArrayList, Optional infoText As String = "", Optional dialogTitle As String = "", Optional selectedIndex As Integer) As String
    
    If Not templateNames.count = templatePaths.count Then
        Err.Raise vbObjectError + 513, , "[AmazonImportTemplateDialog.showDialog] templateNames.count ist nicht templatePaths.count "
    End If
    
    ' Vorherige Einträge löschen
    While AmazonImportTemplateDialog.SelectionComboBox.ListCount > 0
        AmazonImportTemplateDialog.SelectionComboBox.removeItem (0)
    Wend

    ' Einträge hinzufügen
    For i = 1 To templateNames.count
        AmazonImportTemplateDialog.SelectionComboBox.AddItem templateNames.item(i)
    Next i
    
    AmazonImportTemplateDialog.SelectionComboBox.SetFocus
    AmazonImportTemplateDialog.SelectionComboBox.ListIndex = selectedIndex
    
    ' Anzeigetext
    AmazonImportTemplateDialog.InfoLabel.Caption = infoText
    AmazonImportTemplateDialog.Caption = dialogTitle
    
    Show vbModal
    
    ' Wenn der User nicht folgendes geklickt hat:
    ' - Cancelbutton = -1
    ' - X-Button vom Fenster = 0
    If Not selectedItem < 1 Then
        showDialog = templatePaths.item(selectedItem)
    End If
End Function

