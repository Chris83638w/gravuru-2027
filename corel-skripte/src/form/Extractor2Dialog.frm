VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} Extractor2Dialog 
   Caption         =   "Produktdaten bearbeiten"
   ClientHeight    =   6730
   ClientLeft      =   30
   ClientTop       =   370
   ClientWidth     =   5510
   StartUpPosition =   1  'Fenstermitte
   TypeInfoVer     =   73
End
Attribute VB_Name = "Extractor2Dialog"
Attribute VB_Base = "0{E1AE57D1-4F4F-4C85-B67D-043DDEA8A49F}{C546D61A-586D-4473-8ECB-BBF1E618EB68}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


Private Sub cmdClose_Click()
    Hide
End Sub

Private Sub destinationButton_Click()
    Dim folderSelection As String
    folderSelection = CorelScriptTools.GetFolder(Extractor2Dialog.destiantionTextBox.value, "Zielordner auswählen")
    
    If Not folderSelection = "" Then
        Extractor2Dialog.destiantionTextBox.value = folderSelection
    End If
End Sub

Private Sub sourceFolderButton_Click()
    Dim folderSelection As String
    folderSelection = CorelScriptTools.GetFolder(Extractor2Dialog.sourceFolderTextBox.value, "Quellordner auswählen")
    
    If Not folderSelection = "" Then
        
        Dim folderPaths As collection
        Set folderPaths = Globals.getFoldersInFolder(folderSelection)
            
        Extractor2Dialog.sourceFolderTextBox.value = folderSelection
        
    End If

    
End Sub

Private Sub StartButton_Click()
    If Extractor2Dialog.sourceFolderTextBox.value = "" Then
        MsgBox "Es wurde kein Quellordner angegeben", vbExclamation
        
    ElseIf Extractor2Dialog.destiantionTextBox.value = "" Then
        MsgBox "Es wurde kein Zielordner angegeben", vbExclamation
        
    Else
        Hide
        
        Dim extractType As FolderExtractType
        
        If Extractor2Dialog.copyOptionButton.value Then
            extractType = copyFolderType
        ElseIf Extractor2Dialog.cutOptionButton.value Then
            extractType = cutFolderType
        Else
            extractType = deleteFolderType
        End If
        
        
    
        Extractor2.Start Extractor2Dialog.sourceFolderTextBox.value, Extractor2Dialog.destiantionTextBox.value, extractType, Extractor2Dialog.RegexTextBox.value, Extractor2Dialog.ProductImagesCheckBox.value, _
            Extractor2Dialog.AmazonKonfiCheckBox.value, Extractor2Dialog.FancyCheckBox.value, Extractor2Dialog.AmazonImportCheckBox.value, Extractor2Dialog.CDRCheckBox.value, Extractor2Dialog.overwriteCheckBox.value, Extractor2Dialog.KeepFolderStructureCheckBox.value
    End If
    
End Sub
