VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} ToolCreateUploadBoxDialog 
   Caption         =   "Uploadbox erstellen"
   ClientHeight    =   1450
   ClientLeft      =   30
   ClientTop       =   370
   ClientWidth     =   4540
   StartUpPosition =   1  'Fenstermitte
   TypeInfoVer     =   9
End
Attribute VB_Name = "ToolCreateUploadBoxDialog"
Attribute VB_Base = "0{224C41FA-45F4-4606-AC7F-580B5EE093D5}{542C3E57-741E-40B2-81F4-0AFC3B211D4E}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


Private Sub cmdClose_Click()
    Hide
End Sub

Private Sub OkayButton_Click()
    Tool.dialogUploadBoxIsBounded = ToolCreateUploadBoxDialog.UploadBoxCutsCheckBox.value
    
    Tool.dialogClosedStopMacro = False
    Hide
End Sub
