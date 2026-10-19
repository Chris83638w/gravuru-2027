VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} VersionDialog 
   Caption         =   "Neue Skriptversion vorhanden"
   ClientHeight    =   3020
   ClientLeft      =   30
   ClientTop       =   370
   ClientWidth     =   5630
   StartUpPosition =   1  'Fenstermitte
   TypeInfoVer     =   11
End
Attribute VB_Name = "VersionDialog"
Attribute VB_Base = "0{6527A718-D5AE-40DA-8DF5-4346AF60454D}{923BD3BF-333A-4D6E-97B1-8E793BC92539}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


Public yesClicked As Boolean

Private Sub VersionDialog_Initialize()
   
   yesClicked = False
   
End Sub


Private Sub NoButton_Click()
    yesClicked = False
    Hide
End Sub

Private Sub YesButton_Click()
    yesClicked = True
    Hide
End Sub
