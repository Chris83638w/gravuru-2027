Attribute VB_Name = "MultiFileSelector"
Private Const OFN_ALLOWMULTISELECT = &H200&
Private Const OFN_EXPLORER = &H80000
Private Const OFN_FILEMUSTEXIST = &H1000&
Private Const OFN_HIDEREADONLY = &H4&
Private Const OFN_PATHMUSTEXIST = &H800&

Private Declare PtrSafe Function GetOpenFileName Lib "comdlg32.dll" Alias _
    "GetOpenFileNameA" (pOpenfilename As OPENFILENAME) As Long

Public Type OPENFILENAME
    lStructSize As Long
    hwndOwner As LongPtr
    hInstance As LongPtr
    lpstrFilter As String
    lpstrCustomFilter As String
    nMaxCustFilter As Long
    nFilterIndex As Long
    lpstrFile As String
    nMaxFile As Long
    lpstrFileTitle As String
    nMaxFileTitle As Long
    lpstrInitialDir As String
    lpstrTitle As String
    flags As Long
    nFileOffset As Integer
    nFileExtension As Integer
    lpstrDefExt As String
    lCustData As LongPtr
    lpfnHook As LongPtr
    lpTemplateName As String
End Type

Public Function showFileOpenDialog( _
    Optional ByVal filter As String = "All Files (*.*)|*.*", _
    Optional ByVal title As String = "", _
    Optional ByVal initialPath As String = "" _
) As collection

    Dim openFile As OPENFILENAME
    Dim lReturn As Long
    Dim fileDir As String
    Dim filePos As Long
    Dim prevFilePos As Long
    Dim fileList As New collection
    Dim buffer As String
    Dim fileTitleBuffer As String
    Dim apiFilter As String
    Dim i As Long

    buffer = String$(4096, vbNullChar)
    fileTitleBuffer = String$(260, vbNullChar)

    ' Wichtig: doppelt null-terminieren
    apiFilter = replace$(filter, "|", vbNullChar) & vbNullChar & vbNullChar

    With openFile
        .lStructSize = LenB(openFile)
        .hwndOwner = 0
        .hInstance = 0
        .lpstrFilter = apiFilter
        .nFilterIndex = 1

        .lpstrFile = buffer
        .nMaxFile = Len(.lpstrFile)   ' NICHT LenB

        .lpstrFileTitle = fileTitleBuffer
        .nMaxFileTitle = Len(.lpstrFileTitle)

        .lpstrInitialDir = initialPath
        .lpstrTitle = title

        .flags = OFN_HIDEREADONLY Or _
                 OFN_PATHMUSTEXIST Or _
                 OFN_FILEMUSTEXIST Or _
                 OFN_ALLOWMULTISELECT Or _
                 OFN_EXPLORER
    End With

    lReturn = GetOpenFileName(openFile)

    If lReturn <> 0 Then
        filePos = InStr(1, openFile.lpstrFile, vbNullChar)

        If Mid$(openFile.lpstrFile, filePos + 1, 1) = vbNullChar Then
            fileList.add left$(openFile.lpstrFile, filePos - 1)
        Else
            fileDir = left$(openFile.lpstrFile, filePos - 1)

            Do
                prevFilePos = filePos
                filePos = InStr(prevFilePos + 1, openFile.lpstrFile, vbNullChar)

                If filePos - prevFilePos > 1 Then
                    fileList.add fileDir & "\" & Mid$(openFile.lpstrFile, prevFilePos + 1, filePos - prevFilePos - 1)
                Else
                    Exit Do
                End If
            Loop
        End If
    End If

    Set showFileOpenDialog = fileList
End Function

Sub TestShowFileOpenDialog()
    Dim colFileList As collection
    Set colFileList = showFileOpenDialog("C:\")
    
    Dim lngI As Long
    Dim strOutput As String
    With colFileList
        If .count > 0 Then
            strOutput = "The following files were selected:" + vbCrLf
            For lngI = 1 To .count
                strOutput = strOutput + .item(lngI) + vbCrLf
            Next
            MsgBox strOutput
        Else
            MsgBox "No files were selected!"
        End If
    End With
End Sub

