VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} DesignVariantDialog 
   Caption         =   "Designvarianten Einstellungen"
   ClientHeight    =   1770
   ClientLeft      =   30
   ClientTop       =   370
   ClientWidth     =   3140
   StartUpPosition =   1  'Fenstermitte
   TypeInfoVer     =   14
End
Attribute VB_Name = "DesignVariantDialog"
Attribute VB_Base = "0{F16D09AE-6946-4A7B-A54F-75B80066A38B}{3971FB94-8997-44A2-92E2-350755304D6E}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


Public designVariantGroupNr As Integer



Private Sub DesignVariantSpinButton_SpinUp()
    spin True
End Sub



Private Sub DesignVariantSpinButton_SpinDown()
    spin False
End Sub



Private Function spin(up As Boolean)
    
    On Error Resume Next
    designVariantGroupNr = CInt(DesignVariantDialog.DesignVariantTextBox.value)
    On Error GoTo 0
    
    If up Then
        designVariantGroupNr = designVariantGroupNr + 1
        If designVariantGroupNr > 50 Then designVariantGroupNr = 50
    Else
        designVariantGroupNr = designVariantGroupNr - 1
        If designVariantGroupNr < 1 Then designVariantGroupNr = 1
    End If
    
    DesignVariantDialog.DesignVariantTextBox.value = CStr(designVariantGroupNr)
    
End Function



Private Sub ExitButton_Click()
    Hide
End Sub

Private Sub OKCommandButton_Click()
    Hide
    DesignVariantCreator.CreateDesignVariantMacro
End Sub



Private Sub UserForm_Initialize()
    
    If designVariantGroupNr = 0 Then
        designVariantGroupNr = 1
    End If
    
    
    DesignVariantDialog.DesignVariantTextBox.value = CStr(designVariantGroupNr)
    
End Sub

