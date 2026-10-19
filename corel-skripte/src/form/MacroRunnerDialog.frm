VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} MacroRunnerDialog 
   Caption         =   "Macro Runner"
   ClientHeight    =   9590.001
   ClientLeft      =   30
   ClientTop       =   370
   ClientWidth     =   5970
   StartUpPosition =   1  'Fenstermitte
   TypeInfoVer     =   19
End
Attribute VB_Name = "MacroRunnerDialog"
Attribute VB_Base = "0{09AF1233-174C-440A-ABB2-6043FA35E9A5}{510FD0DB-BAA9-4461-B761-86BCFFD30A44}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


Option Explicit

Private Sub cmdClose_Click()
    Hide
End Sub

Private Sub UserForm_Initialize()
    MacroRunner.reloadMacros
    MacroRunner.renderMacroList Me.MacroList, ""
    restoreLastSelection
End Sub

Private Sub UserForm_Activate()
    ' Fokus nach dem Anzeigen -> F5, dann Enter startet das Makro
    On Error Resume Next
    Me.StartMacroButton.SetFocus
End Sub

Private Sub SearchBox_Change()
    MacroRunner.renderMacroList Me.MacroList, Me.SearchBox.text
    selectFirstMacro
End Sub

Private Sub selectFirstMacro()
    ' Nach dem Filtern den ersten startbaren Treffer markieren -> Enter startet ihn
    Dim i As Long
    For i = 0 To Me.MacroList.ListCount - 1
        If left$(Me.MacroList.List(i, 1), 2) = "S|" Then
            Me.MacroList.ListIndex = i
            Exit For
        End If
    Next i
End Sub

Private Sub restoreLastSelection()
    Dim key As String
    key = MacroRunner.getLastSelectionKey()
    If Len(key) = 0 Then Exit Sub

    Dim i As Long
    For i = 0 To Me.MacroList.ListCount - 1
        If Me.MacroList.List(i, 1) = key Then
            Me.MacroList.ListIndex = i
            Exit For
        End If
    Next i
End Sub

Private Sub MacroList_Click()
    If Me.MacroList.ListIndex < 0 Then Exit Sub

    Dim key As String
    key = Me.MacroList.List(Me.MacroList.ListIndex, 1)

    If left$(key, 2) = "S|" Then
        Dim teile() As String
        teile = Split(key, "|")
        MacroRunner.saveLastSelection teile(1), teile(2)
    End If
End Sub

Private Sub MacroList_DblClick(ByVal Cancel As MSForms.ReturnBoolean)
    StartMacroButton_Click                     ' Doppelklick startet direkt
End Sub

Private Sub StartMacroButton_Click()
    If Me.MacroList.ListIndex < 0 Then Exit Sub

    Dim key As String
    key = Me.MacroList.List(Me.MacroList.ListIndex, 1)
    If left$(key, 2) <> "S|" Then Exit Sub     ' Kopfzeile ist nicht startbar

    Me.Hide
    MacroRunner.runSelectedFromKey key
End Sub
