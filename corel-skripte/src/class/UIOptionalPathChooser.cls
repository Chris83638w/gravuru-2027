Attribute VB_Name = "UIOptionalPathChooser"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
Option Explicit

' Autor Martin Afelt @ Gravuru
'
' Ist genau wie UIPathChooser, nur dass wie hier noch eine Checkbox haben, die besagt, ob dieser Pfad genutzt werden soll
' Wird bei Dialogfenstern genutzt, wo man eine Aktion über mehrere Ordner laufen lassen kann. Dort ist die Funktion aber optional deshalb die Checkbox

Public pathChooser As New UIPathChooser

Private WithEvents onOffcheckBox As CheckBox
Attribute onOffcheckBox.VB_VarHelpID = -1
Private pathTextBox As TextBox

Public Function init(pathTextBox_ As TextBox, changeButton_ As CommandButton, onOffcheckBox_ As CheckBox, useStructurePath_ As Boolean, Optional chooseFileOrFolder_ As Boolean, Optional defaultPath_ As String, Optional chooserTitle_ As String)
    pathChooser.init pathTextBox_, changeButton_, useStructurePath_, chooseFileOrFolder_, defaultPath_, chooserTitle_
    
    Set pathTextBox = pathTextBox_
    Set onOffcheckBox = onOffcheckBox_
    
    onOffcheckBox_Click
End Function


Public Function isCheckboxOn() As Boolean
    isCheckboxOn = onOffcheckBox.value
End Function

Private Sub onOffcheckBox_Click()
    pathTextBox.Enabled = onOffcheckBox.value
End Sub

Public Function getPathIfOn() As String
    getPathIfOn = IIf(isCheckboxOn, pathChooser.path, "")
End Function
