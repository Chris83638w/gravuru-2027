VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} MotiveDialog 
   Caption         =   "Motive exportieren"
   ClientHeight    =   3650
   ClientLeft      =   30
   ClientTop       =   370
   ClientWidth     =   4540
   StartUpPosition =   1  'Fenstermitte
   TypeInfoVer     =   60
End
Attribute VB_Name = "MotiveDialog"
Attribute VB_Base = "0{8AED9F33-AC16-4D2D-9742-DC84108F6FC4}{18C9CC16-5C64-449A-A427-E610C045B5C2}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


Public okPressed As Boolean


Public Function getFileName(shapeName As String) As String
    
    ' Oberordner "Motive" nach unterordnern durchsuchen und in einer Combobox anzeigen
'    Dim folders As collection
'    Set folders = Globals.listFoldersInFolder("V:\Motive\")
'
'    With FolderMotivesComboBox
'        For i = 1 To folders.count
'            .AddItem folders(i)
'        Next i
'    End With
'
'    With FolderNewMotivesComboBox
'        For i = 1 To folders.count
'            .AddItem folders(i)
'        Next i
'    End With
    
    
    


'    MotiveNameTextBox.SetFocus
'    MotiveNameTextBox.SelStart = 0
'    MotiveNameTextBox.SelLength = Len(MotiveNameTextBox.value)
    
    
    
    If FolderMotivesTextBox.value = "" Then
        FolderMotivesTextBox.value = "V:\Motive\SVG\"
    End If


    If FolderNewMotivesTextBox.value = "" Then
        FolderNewMotivesTextBox.value = "V:\Motive\SVG Neu\"
    End If
    
    okPressed = False
    MotiveNameTextBox.value = shapeName
    
    Show vbModal 'Hier wird angehalten, bis das Fenster geschlossen wird
    

    
    getFileName = MotiveNameTextBox.value
    
End Function



Public Function makeVisible()
    If FolderMotivesTextBox.value = "" Then
        FolderMotivesTextBox.value = Globals.getDesktopPath
'        FolderMotivesTextBox.value = "V:\Motive\SVG\"
'        FolderMotivesTextBox.value = "C:\Users\GRAVURU 2\Desktop\"
    End If

    If FolderNewMotivesTextBox.value = "" Then
        FolderNewMotivesTextBox.value = Globals.getDesktopPath
'        FolderNewMotivesTextBox.value = "V:\Motive\SVG\"
'        FolderNewMotivesTextBox.value = "C:\Users\GRAVURU 2\Desktop\"
    End If
    
'    okPressed = False
    
    Show vbModal 'Hier wird angehalten, bis das Fenster geschlossen wird
End Function




'Ändert den Pfad für den Exportordner
Private Sub ChangeExportPathButton_Click()
    Dim newPath As String
    newPath = CorelScriptTools.GetFolder(FolderNewMotivesTextBox.value)
    If Not newPath = "" Then
        FolderNewMotivesTextBox.value = newPath & "\"
    End If
End Sub




'Ändert den Pfad für den Hauptordner (der nur für den Namensabgleich verwendet wird)
Private Sub ChangeMainFolderButton_Click()
    Dim newPath As String
    newPath = CorelScriptTools.GetFolder(FolderMotivesTextBox.value)
    If Not newPath = "" Then
        FolderMotivesTextBox.value = newPath & "\"
    End If
End Sub




Private Sub OKButton_Click()
    
    Dim settingsOK As Boolean
    settingsOK = True
    
    If Not Globals.folderExists(FolderMotivesTextBox.value) Then
        MsgBox "Der Ordner '" & FolderMotivesTextBox.value & "' exestiert nicht!", vbExclamation
        settingsOK = False
    ElseIf Not Globals.folderExists(FolderNewMotivesTextBox.value) Then
        MsgBox "Der Ordner '" & FolderNewMotivesTextBox.value & "' exestiert nicht!", vbExclamation
        settingsOK = False
    End If
    
    If settingsOK Then
        Hide
        Tool.startCreatingMotives
    End If
    
End Sub



