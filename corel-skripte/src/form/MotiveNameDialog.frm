VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} MotiveNameDialog 
   Caption         =   "Motivname"
   ClientHeight    =   2190
   ClientLeft      =   30
   ClientTop       =   370
   ClientWidth     =   6590
   StartUpPosition =   1  'Fenstermitte
   TypeInfoVer     =   14
End
Attribute VB_Name = "MotiveNameDialog"
Attribute VB_Base = "0{EC278151-CF9B-414C-B898-A737B1C37EED}{1A3565CF-370D-4269-9E1A-AB657D4BD815}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


Public okPressed As Boolean
Dim exportPath As String
Dim mainMotivesFolderPath As String

Private Function findFreeFileName(fileName As String) As String
    
    Dim fileNameSplitted() As String
    fileNameSplitted = Globals.splitLastDigits(fileName)

    Dim i As Integer
    If fileNameSplitted(1) = "" Then
        i = 0
    Else
        i = CInt(fileNameSplitted(1))
    End If
    
    While True
        i = i + 1
        
        If Not (Globals.fileExist(exportPath & fileNameSplitted(0) & i & ".svg") Or Globals.fileExist(mainMotivesFolderPath & fileNameSplitted(0) & i & ".svg")) Then
            findFreeFileName = fileNameSplitted(0) & i
            Exit Function
        End If
    Wend

End Function

Private Sub CancelButton_Click()
    Globals.endMacro
End Sub

Private Sub NextButton_Click()
    okPressed = False
    Hide
End Sub

Private Sub OKButton_Click()
    
    Dim fileName As String
    fileName = MotiveNameTextBox.value
    
    If Globals.endsWith(fileName, "_motiv") Then
        fileName = replace(fileName, "_motiv", "")
    End If
    
    If Globals.fileExist(exportPath & fileName & ".svg") Or Globals.fileExist(exportPath & fileName & ".svg") Then
        
'        MsgBox "File exist. " & exportPath & fileName & ".svg"
        
        If OverrideCheckBox.value Then
            Dim mbResult As Integer
            mbResult = MsgBox("Willst du das Motiv " & fileName & " wirklich überschreiben?", _
             vbYesNoCancel Or vbQuestion)
            
            Select Case mbResult
                Case vbYes
                    okPressed = True
                    Hide
                Case vbNo
                    
                Case vbCancel
                    Exit Sub
            End Select
            
        Else
            fileName = findFreeFileName(fileName)
             okPressed = False
        End If
        
       
    Else
'        MsgBox "File doesnt exist. " & exportPath & fileName & ".svg"
        okPressed = True
        Hide
    End If
    
    MotiveNameTextBox.value = fileName
    
End Sub


Public Function getFileName(shape As shape, exportPathVar As String, mainMotivesFolderPathVar As String)
    
    exportPath = exportPathVar
    mainMotivesFolderPath = mainMotivesFolderPathVar
    
    MotiveNameTextBox.value = shape.name
    
    ' Kein name vorhanden
    If MotiveNameTextBox.value = "" Then
        Globals.setViewAreaToShape shape
        ProblemLabel.Caption = "Bitte gib einen Dateinamen ein:"
        Show vbModal
    Else
        ' Motiv soll nicht im Dateinamen vorkommen. (Muss aber im Namen der Shape vorkommen. Hier aber noch nicht wichtig)
        If Globals.endsWith(MotiveNameTextBox.value, "_motiv") Then
            MotiveNameTextBox.value = replace(MotiveNameTextBox.value, "_motiv", "")
        End If
    
        ' Ein name ist vorhanden.
        ' Prüfen, ob eine Datei mit selben Namen in einem der beiden Ordner exestiert
        If Globals.fileExist(exportPath & MotiveNameTextBox.value & ".svg") Or Globals.fileExist(mainMotivesFolderPath & MotiveNameTextBox.value & ".svg") Then
            ' Dateiname exestiert bereits
            ' Dialog anzeigen
            
            
            Globals.setViewAreaToShape shape
            
            ProblemLabel.Caption = "Dateiname exestiert bereits:"
            Show vbModal
        Else
            okPressed = True
        End If
    End If
    
    
    
    
    
    getFileName = MotiveNameTextBox.value
End Function

