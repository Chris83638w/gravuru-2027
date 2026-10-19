VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} DesignSelectorDialog 
   Caption         =   "Designauswähler"
   ClientHeight    =   3620
   ClientLeft      =   30
   ClientTop       =   370
   ClientWidth     =   5510
   StartUpPosition =   1  'Fenstermitte
   TypeInfoVer     =   5
End
Attribute VB_Name = "DesignSelectorDialog"
Attribute VB_Base = "0{02845257-7BFE-48C2-B0C4-3DD66AA00544}{319AD65B-8FE5-463D-B418-8B63BC9FC945}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


Private Sub SelectDesignsButton_Click()
        
    DesignSelector.selectDesigns DesignSelectorDialog.DesignsTextBox.value ', Globals.getLogger(True)
    
    Hide
End Sub

