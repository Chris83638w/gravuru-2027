Attribute VB_Name = "LookCreator"
Public lookTypeTitles As collection
Public lookTypePSDPaths As collection
Public lookTypeShapePNGFolder As collection

Public Sub Start()
    
    If ActiveDocument Is Nothing Then
        MsgBox "Kein Dokument geöffnet!", vbExclamation
        Exit Sub
    End If
    
    
    LookCreatorDialog.Show vbModal
    
End Sub


Function init()
    If lookTypeTitles Is Nothing Then
        Globals.checkIfServerOnlineAndSelectOfflineWorkPath
    
        Set lookTypeTitles = New collection
        lookTypeTitles.add "Acryl klar & satiniert"
        lookTypeTitles.add "Premiumschiefer"
        
        Set lookTypePSDPaths = New collection
        lookTypePSDPaths.add Globals.getMainFolder & "Platzierbare Bilddateien\Acryl\Acryl Look V2.1.psd"
        lookTypePSDPaths.add Globals.getMainFolder & "Platzierbare Bilddateien\Premiumschiefer\Premiumschiefer Look V2.psd"
        
        Set lookTypeShapePNGFolder = New collection
        lookTypeShapePNGFolder.add Globals.getMainFolder & "Platzierbare Bilddateien\Acryl\Formen"
        lookTypeShapePNGFolder.add ""
    End If
End Function




Public Function createLook(shapes As shapeRange, PSDPath As String, shapePNGPastePath As String)
    
    
    Globals.startMacro
    
    
    If Not Globals.debugHistory Then
        CorelScriptTools.BeginWaitCursor
        ActiveDocument.BeginCommandGroup "CreateLook"
        If Not Globals.debugErrors Then On Error GoTo MacroError
    End If
    
    
    Dim exportPath As String
    exportPath = Globals.addBackslash(Globals.getTempFolder) & "CorelDraw Grundplatten Look\"
    
    Globals.createFolder exportPath
    Globals.deleteFolderContents exportPath
    
    
    ' Alte Grundplatten löschen
    newCustomShapeTypeQuery(shapes, groundPlate).search.delete
    
    
    ' Schwarze Acrylgrundplatte platzieren
    PlaceFile.setSelectedPlaceTypeJob PlaceFile.jobAcrylSchwarz
    PlaceFile.startFunction shapes, Classfactory.newPlaceFileParameters.setParts(Part1, layer1).setQuiet
    
    ' Exportieren
    shapes.CreateSelection
    Export1.Start exportPath, Grundplatten_Look, False, "png", True, False, , True
    
    ' PS Starten
    Dim ps As Photoshop.Application
    Set ps = startPhotoshop
    
'    On Error GoTo PSDVisible
'    ps.visible = False
    ps.Open PSDPath

'    MsgBox "ActiveDocument: " & ps.ActiveDocument.FullName

    If Not ps.ActiveDocument.FullName = PSDPath Then
        MsgBox "Das Dokument '" & PSDPath & "' konnte nicht geöffnet werden!", vbCritical
        Exit Function
    End If

    Dim psScriptArguments() As Variant
    ReDim psScriptArguments(1)
    psScriptArguments(1) = exportPath

    ps.DoJavaScriptFile "Y:\20_Martin\Photoshop\Scripte\Photoshop Export Script 2.jsx", psScriptArguments


    ' Form-PNG in den Formenordner für Acryl verschieben
    ' -----------------------------------------
    If Not shapePNGPastePath = "" Then
        Dim filesToCut As collection
        Set filesToCut = Globals.getFilesInFolder(exportPath, True)
    
        For i = 1 To filesToCut.count
            Globals.moveFile exportPath & filesToCut(i), Globals.addBackslash(shapePNGPastePath), True, False
        Next i
    End If
    ' -----------------------------------------
    
    ActiveDocument.Dirty = False ' Nicht speicherbar machen
    
'PSDVisible:
'    If Not Err Is Nothing Then Err.Raise Err.number, Err.source, Err.Description, Err.HelpFile, Err.HelpContext
'    On Error GoTo 0

'    ps.visible = True
    
    
    Exit Function
MacroError: 'Alle Fehler hier abfangen und die CommandGruppe beenden, damit man mit einem Schritt zurück gehen kann (STRG + Z), auch wenn ein Fehler aufgetreten ist
    MsgBox Err.Description & ", " & Err.number, vbCritical
    Globals.endMacro True
End Function
