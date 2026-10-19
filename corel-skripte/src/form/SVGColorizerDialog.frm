VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} SVGColorizerDialog 
   Caption         =   "SVGs umfärben"
   ClientHeight    =   2040
   ClientLeft      =   30
   ClientTop       =   370
   ClientWidth     =   4540
   StartUpPosition =   1  'Fenstermitte
   TypeInfoVer     =   20
End
Attribute VB_Name = "SVGColorizerDialog"
Attribute VB_Base = "0{1BCBBD21-7319-4070-B4A8-E7BFBA4B2339}{82CDE1AD-AEEF-4A2F-AC35-2C6E26E22435}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


Dim importFolderPath As String
Dim colorString As String

Private Sub cmd_Close_Click()
    Hide
End Sub



Private Sub ImportPathCommandButton_Click()
    Dim newPath As String
    newPath = CorelScriptTools.GetFolder(importFolderPath) 'Ordnerauswahl-Dialog
    If Not newPath = "" Then
        importFolderPath = newPath & "\"
    End If
    SVGColorizerDialog.ImportPathTextBox.value = importFolderPath
End Sub

Private Sub StartCommandButton_Click()
    
    On Error GoTo colorError
    colorString = SVGColorizerDialog.ColorTextBox.value
    If colorString = "" Then GoTo colorError
    If Not Len(colorString) = 6 Then GoTo colorError
    On Error GoTo 0
    
    Hide
    
    SVGColorizer.Start importFolderPath, importFolderPath & "Gefärbt\", 200, CreateColor("#" & colorString)
    
    Exit Sub
colorError:
     MsgBox "Bitte gib ein gültigen Farbcode ein!"
End Sub
