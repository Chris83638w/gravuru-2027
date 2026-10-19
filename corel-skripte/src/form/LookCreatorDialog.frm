VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} LookCreatorDialog 
   Caption         =   "Look erstellen"
   ClientHeight    =   1340
   ClientLeft      =   30
   ClientTop       =   370
   ClientWidth     =   3140
   StartUpPosition =   1  'Fenstermitte
   TypeInfoVer     =   5
End
Attribute VB_Name = "LookCreatorDialog"
Attribute VB_Base = "0{56C25D78-16CF-4170-8985-15A8CC124C83}{B552D58C-7FCF-4A39-B8ED-4CD201299FC0}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


Private Sub StartButton_Click()
    
    If ActiveSelectionRange.count = 0 Then
        MsgBox "Keine Formen ausgewählt", vbExclamation
        Exit Sub
    End If
    
    If Not LookTypeComboBox.ListIndex = -1 Then
        
        LookCreator.createLook ActiveSelectionRange, LookCreator.lookTypePSDPaths(LookTypeComboBox.ListIndex + 1), LookCreator.lookTypeShapePNGFolder(LookTypeComboBox.ListIndex + 1)
    Else
        MsgBox "Bitte wähle einen Look-Typ aus!", vbExclamation
    End If
    
    MsgBox "Look erstellt!", vbInformation
    Hide
    
End Sub


Private Sub UserForm_Initialize()
    LookCreator.init

    For i = 1 To lookTypeTitles.count
        LookTypeComboBox.AddItem LookCreator.lookTypeTitles(i)
    Next i
    
    LookTypeComboBox.value = LookCreator.lookTypeTitles(1)
    
End Sub
