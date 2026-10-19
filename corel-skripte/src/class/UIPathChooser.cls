Attribute VB_Name = "UIPathChooser"
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
' Diese Klasse managed einen Pfad, den man per UI setzen kann. Dazu gehört eine Textbox,
' die den Pfad anzeigt und ein Button, der je nach dem einen File oder FolderChooser öffnet, um den Pfad zu ändern.

Private p_path As String
Private defaultPath As String
Private WithEvents pathTextBox As TextBox
Attribute pathTextBox.VB_VarHelpID = -1
Private WithEvents changeButton As CommandButton
Attribute changeButton.VB_VarHelpID = -1

Private chooseFileOrFolder As Boolean
Private chooserTitle As String

Public useStructurePath As Boolean

' Wenn allowFileOrFolderOrBoth = 1 dann werden nur Dateien akzeptiert
' Wenn allowFileOrFolderOrBoth = 2 dann werden nur Ordner akzeptiert
' Wenn allowFileOrFolderOrBoth = 3 dann werden Dateien und Ordner akzeptiert
Public Function init(pathTextBox_ As TextBox, changeButton_ As CommandButton, useStructurePath_ As Boolean, _
    Optional chooseFileOrFolder_ As Boolean, Optional defaultPath_ As String, Optional chooserTitle_ As String, Optional createDefaultPath As Boolean = True)
    
    Set pathTextBox = pathTextBox_
    pathTextBox.locked = True ' User verbieten Pfad selber einzugeben oder abzuändern
    Set changeButton = changeButton_
    useStructurePath = useStructurePath_
    chooseFileOrFolder = chooseFileOrFolder_
    chooserTitle = chooserTitle_
    defaultPath = defaultPath_
    
    If Not defaultPath = "" And createDefaultPath Then Globals.createFolder defaultPath
    
    initPath
End Function


Public Property Get path() As String
    If p_path = Globals.STRUCTURE_PATH Then
        path = p_path
    Else
        path = Globals.addBackslash(p_path)
    End If
End Property


Public Property Let path(path_ As String)
    p_path = path_
    pathTextBox.value = p_path ' In UI setzen
End Property


' Wenn der User auf den ... Button drückt, um den Pfad zu ändern
Private Sub changeButton_Click()
    Dim newPath As String
    If chooseFileOrFolder Then
        newPath = CorelScriptTools.GetFileBox(, chooserTitle, , Globals.removeBackslash(path))
    Else
        newPath = CorelScriptTools.GetFolder(Globals.removeBackslash(path), chooserTitle)
    End If
    
    ' Wenn der User auf abbrechen klickt, bekommen wir einen leeren Pfad zurück
    ' Diesen wollen wir aber nicht nutzen. Denn wenn der User abbricht, dann weil er den vorherigen Pfad behalten will
    If Not newPath = "" Then
        path = newPath
    End If
End Sub

Public Function isPathValid() As Boolean
    isPathValid = Not p_path = "" And Not p_path = "\" And (Globals.folderExists(p_path) Or p_path = Globals.STRUCTURE_PATH)
End Function


Public Function initPath()
    
    ' Wenn die CDR in einem [CDR] Ordner liegt und somit die Neue Struktur abbildet, egal ob die echte oder auf dem Desktop
    If useStructurePath And Globals.isCDRInsideOfCDRFolder(ActiveDocument) Then
        'path = Globals.getParentPath(ActiveDocument.filePath)
        setPathToStructurePath
    Else
         'Wenn in der UI bereits ein Pfad eingetragen ist
        p_path = pathTextBox.value
        
        ' Wenn kein Pfad in der UI ist, Standartpfad nutzen
        ' Oder wenn der Pfad aus der UI ein Pfad war, der sich aus einer CDR in einem [CDR] Ordner ergibt
        If p_path = "" Or p_path = Globals.STRUCTURE_PATH Then
            setPathToDefaultPath
        End If
    End If
End Function

Public Function setPathToDefaultPath()
    path = defaultPath
End Function

Public Function setPathToStructurePath()
    path = Globals.STRUCTURE_PATH
End Function
