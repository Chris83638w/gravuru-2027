Attribute VB_Name = "StructureHelper"



Public Sub StartTest()
    Start "C:\gravuru"
End Sub


Public Sub Start(ordnerPfad As String)
    
    MsgBox "ordnerPfad: " & ordnerPfad, vbInformation
    
    'Application.visible = True

    'Globals.setFocusToCorelDraw
    
'    StructureHelperDialog.Show vbModeless
    
    ' Warte kurz, damit das Fenster initialisiert wird
'    Sleep 10
'    DoEvents
    
'    ' Fensterhandle des UserForms holen
'    Dim formHwnd As Long
'   ' Fensterhandle des UserForms holen
'    formHwnd = FindWindowA(vbNullString, FolderStructureHelperDialog.Caption)
'
'    If formHwnd <> 0 Then
'        ' Entferne das UserForm aus der CorelDRAW-Hierarchie
'        SetParent formHwnd, HWND_DESKTOP
'
'        ' Mache die UserForm zu einem echten eigenständigen Fenster
'        Dim style As Long
'        style = GetWindowLongA(formHwnd, GWL_STYLE)
'        SetWindowLongA formHwnd, GWL_STYLE, style Or WS_POPUP Or WS_VISIBLE
'
'        ' Bringe nur das UserForm in den Vordergrund
'        SetForegroundWindow formHwnd
'    End If
    
    'Application.visible = False
    
End Sub
