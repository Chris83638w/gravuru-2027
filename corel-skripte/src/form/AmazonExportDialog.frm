VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} AmazonExportDialog 
   Caption         =   "Amazon Export"
   ClientHeight    =   6010
   ClientLeft      =   30
   ClientTop       =   370
   ClientWidth     =   5520
   StartUpPosition =   1  'Fenstermitte
   TypeInfoVer     =   133
End
Attribute VB_Name = "AmazonExportDialog"
Attribute VB_Base = "0{47E9FD76-DB08-4D1F-8425-C0D89456DF0B}{401C542D-00DA-493C-9912-BBA647275AD7}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


Dim exportPath As New UIPathChooser
Dim runFolderPath As New UIOptionalPathChooser

'Private Sub ChangeExportFolderButton_Click()
'    ConfiHelper.changeExportFolder True
'End Sub
'
'Private Sub ChangeFolderStructureButton_Click()
'    Dim newPath As String
'    newPath = CorelScriptTools.GetFolder(folderStructureExportPath)
'
'    If Not newPath = "" Then
'        folderStructureExportPath = newPath & "\"
'
'        'MsgBox "exportPath=" & exportPath
'
'        AmazonExportDialog.FolderStructureTextBox.value = folderStructureExportPath
'    End If
'End Sub

Private Sub cmdCancel_Click()
    Hide
End Sub

Private Sub StartButton_Click()
    Hide
    
    ConfiHelper.backgroundName = "Weiß.png"
    
    
    Dim focusedLayerIndex As Integer
    focusedLayerIndex = -1
    If AmazonExportDialog.DesignLayerOptionButton.value Then
        On Error GoTo DesignLayerIndexWrong
        focusedLayerIndex = AmazonExportDialog.DesignLayerTextBox.value
        If focusedLayerIndex < 1 Or focusedLayerIndex > 5 Then
            GoTo DesignLayerIndexWrong
        End If
        On Error GoTo 0
    End If
    
    
    Dim viewSettings As ConfiPartToViewSortInstruction
    On Error GoTo ViewSettingsWrongError
    Set viewSettings = getViewSettings
    On Error GoTo 0
    
    
    AmazonExport.Start exportPath.path, runFolderPath.getPathIfOn, viewSettings, exportMaskOnlyOnDefaultDesignCheckBox.value, QRCodeAsVariantCheckBox.value, focusedLayerIndex, AmazonExportDialog.AutomaticGroundplatesCheckBox.value, _
            AmazonExportDialog.exportSimpleFolderIconWhenGravingCheckBox.value, AmazonExportDialog.PreviewImageZoomoedCheckBox.value, AmazonExportDialog.ExportLookCheckBox.value
    
    
    Exit Sub
ViewSettingsWrongError:
    MsgBox "Die View-Einstellungen sind falsch!", vbExclamation
    Globals.endMacro
DesignLayerIndexWrong:
    MsgBox "Die Nummer für die Designschicht ist ungültig!", vbExclamation
    Globals.endMacro
End Sub



Private Function getViewSettings() As ConfiPartToViewSortInstruction
    
    Dim ConfiPartToViewSortInstruction As New ConfiPartToViewSortInstruction
    
    
    For i = 1 To 4
        If AmazonExportDialog("Part" & i & "CheckBox").value Then
            Dim viewIndex As Integer
            viewIndex = CInt(Mid(AmazonExportDialog("Part" & i & "ComboBox").value, 6, 1))
            
            ConfiPartToViewSortInstruction.addPartToView (i), viewIndex
        End If
    Next i
    
    Set getViewSettings = ConfiPartToViewSortInstruction
End Function



Private Sub UserForm_Initialize()
    
    exportPath.init ExportFolderTextBox, ChangeExportFolderButton, True, , Globals.getDesktopPath() & "AmazonExport"
    runFolderPath.init RunFolderTextBox, ChangeRunFolderButton, UseRunFolderCheckBox, False, , Globals.getNewStructureProductsFolder
    
    For i = 1 To 4
        If AmazonExportDialog("Part" & i & "ComboBox").value = "" Then
            AmazonExportDialog("Part" & i & "ComboBox").value = "View " & i
        End If
        
        With AmazonExportDialog("Part" & i & "ComboBox")
            For j = 1 To 4
                .AddItem "View " & j
            Next j
        End With
    Next i
    
End Sub


' 'UserForm_Initialize' wird nicht immer beim anzeigen des Dialogs aufgerufen, deshalb gibt es diese Methode
' Muss immer vor/nach dem Anzeigen aufgerufen werden
Public Function init()
    exportPath.initPath
End Function


