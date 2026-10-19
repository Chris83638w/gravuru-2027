Attribute VB_Name = "FSShapeFolder"
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
' FS = Folder-Structure
'
' Stellt einen Formordner in der Ordnerstruktur dar
' Typischerweise sind in einem solchen Ordner Größenordner (FSSizeFolder) enthalten


Dim path As String
Dim sizeFolders As New Dictionary


Public Function init(Optional path_ As String, Optional sizeFolder As FSSizeFolder)
    path = path_
    
    If path = "" Then
        If Not sizeFolder Is Nothing Then
            path = Globals.getParentPath(sizeFolder.path)
        End If
    End If

    If Not sizeFolder Is Nothing Then addSizeFolder sizeFolder
    
End Function


Public Function addSizeFolder(sizeFolder As FSSizeFolder)
    Dim folderName As String
    folderName = Globals.getFolderName(sizeFolder.path)
    
    If sizeFolders.Exists(folderName) Then Err.Raise vbObjectError + 513, , "[FSSizeFolder.addSizeFolder] 'folderName' existiert schon"
    
    sizeFolders.add folderName, sizeFolder
End Function


Public Function getSizeFolderByName(folderName As String) As FSSizeFolder
    
    If folderName = "" Then
        Err.Raise vbObjectError + 513, , "[FSSizeFolder.getSizeFolderByName] Der Ordnerpfad darf nicht leer sein!"
    End If
    
    ' Wenn der Größenordner nicht vorher schon gefunden oder hinzugefügt wurde, hinzufügen
    If Not sizeFolders.Exists(folderName) Then
        Dim sizeFolderPath As String
        sizeFolderPath = Globals.addBackslash(path) & folderName
        
        If Globals.folderExists(sizeFolderPath) Then
            Dim sizeFolder As New FSSizeFolder
            sizeFolder.init sizeFolderPath
            ' Adden des neuen designFiles nicht nötig, da es sich selbst hinzufügt
            addSizeFolder sizeFolder
            
            Set getSizeFolderByName = sizeFolder
        End If
    Else
        
        Set getSizeFolderByName = sizeFolders.item(folderName)
    End If
    
End Function


Public Function getSizeFolderByPath(sizeFolderPath As String) As FSSizeFolder
    
    If Not LCase(Globals.addBackslash(Globals.getParentPath(sizeFolderPath))) = LCase(Globals.addBackslash(path)) Then
        Err.Raise vbObjectError + 513, , "[FSSizeFolder.getSizeFolderByPath] Der Größenordnerpfad'" & sizeFolderPath & "' befindet sich nicht in diesem Formordner '" & path & "'"
    End If
    
    Set getSizeFolderByPath = getSizeFolderByName(Globals.getFolderName(sizeFolderPath))
    
End Function


Public Function searchSizeFolders() As Dictionary
    
    Dim folders As collection
    Set folders = Globals.getFoldersInFolder(path)
    
    Dim i As Integer
    For i = 1 To folders.count
        If Globals.isFolderSizeFolder(folders(i)) Then
            getSizeFolderByPath folders(i) ' Fügt sich selbst zu 'sizeFolders' hinzu, wenn nicht schon vorhanden
        End If
    Next i
    
    Set searchSizeFolders = sizeFolders
End Function
