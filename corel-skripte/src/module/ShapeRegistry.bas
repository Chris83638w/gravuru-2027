Attribute VB_Name = "ShapeRegistry"
'
' Generiert aus den Formen der "Alle Formen.cdr" eine CSV, die jede Form beschreibt
' Anhand dieser Daten kann der "ProductRecognizer" Formen wiedererkennen
'
' Autor:  Martin Afelt GRAVURU
'

Dim csvString As String

' Wichtig, alle 3 Collections müssen die selbe Größe haben um zu funktionieren
Dim alreadyTakenNames As collection
Dim alreadyExistingShapeInfo As collection
Dim processedShapes As collection

Public Sub CreateShapeNames()
    If ActiveDocument Is Nothing Then
        MsgBox "Kein Dokument geöffnet!", vbInformation
        End
    End If
    
    Globals.checkIfServerOnlineAndSelectOfflineWorkPath
    Globals.checkVersion
    
    If Not ActiveDocument.name = "Alle Formen.cdr" Then
        MsgBox "Das ist in dieser Datei nicht möglich nur in der 'Alle Formen'-Datei", vbExclamation
        End
    End If
    
    
    Set alreadyTakenNames = New collection
    Set alreadyExistingShapeInfo = New collection
    Set processedShapes = New collection
    
    Dim previousUnit As Integer
    previousUnit = ActiveDocument.unit
    ActiveDocument.unit = cdrMillimeter
    
    csvString = "name;width;height;area;subpaths(x,y,w,h)"
    
    ProgressBarUserForm.Start
    
    For i = 1 To ActiveDocument.Pages.count
        For j = 1 To ActiveDocument.Pages(i).shapes.count
            If ActiveDocument.Pages(i).shapes(j).Type = cdrGroupShape Then
                
                processGroup ActiveDocument.Pages(i).shapes(j)
                
                ProgressBarUserForm.setProgress j / CDbl(ActiveDocument.Pages(i).shapes.count)
            End If
        Next j
    Next i
    
    
    Dim csvPath As String
    
    csvPath = Globals.getMainFolder & ProductRecognizer.getProductShapesInfoFilePathRelative
    On Error GoTo AccessDeniedError
    Globals.saveTextFile csvString, csvPath
    On Error GoTo 0
    
    ' Neue Formen wurden hinzugefügt, deshalb neu initialisieren
    PlaceFile.initialized = False
    ProductRecognizer.initialized = False
    
    ProductRecognizer.initIfNeeded
    
    ' Nochmal prüfen anhand des Formnamens in der CDR ob jede Form mit den soeben erstellten Formdaten erkannt wird
    For i = 1 To ActiveDocument.Pages.count
        For j = 1 To ActiveDocument.Pages(i).shapes.count
            If ActiveDocument.Pages(i).shapes(j).Type = cdrGroupShape Then

                checkShapeNameOfGroup ActiveDocument.Pages(i).shapes(j)
                
                ProgressBarUserForm.setProgress (j / CDbl(ActiveDocument.Pages(i).shapes.count)) / ActiveDocument.Pages.count + ((i - 1) / ActiveDocument.Pages.count)
                ProgressBarUserForm.setProgressText "Prüfe " & ActiveDocument.Pages(i).shapes(j).name
            End If
        Next j
    Next i
    
    
    ActiveDocument.unit = previousUnit
    
    ProgressBarUserForm.Hide
    
    MsgBox "Formdaten erstellt!"
    Exit Sub
    
AccessDeniedError:
    MsgBox "Der Zugriff auf die Datei '" & csvPath & "' wurde verweigert. Stelle sicher, dass niemand darauf zugreift." & vbNewLine & "Fehler: " & Err.Description
    ProgressBarUserForm.Hide
End Sub



Private Function processGroup(group As shape)
    
    Globals.convertRedOrPinkEllipsesToCurves group.shapes.All
    
    Dim redShape As shape
    Dim redShapes As shapeRange
    Set redShapes = newCustomShapeTypeQuery(group, RedOrPinkShape).setExcludeGivenShape(True).setExcludeInvisibleShapes(True).search
    
    
    If redShapes.count > 0 Then
        Set redShape = redShapes.firstShape
    End If
    
    If redShape Is Nothing Then
        Exit Function
    End If
    
    
    ' Wird mehrfach verwendet
    Dim bothShapes As shapeRange
    
    Dim textShape As shape
    Set textShape = group.shapes.FindShapes(, cdrTextShape, True).firstShape
    
    If Not textShape Is Nothing Then
    
        If redShapes.count > 1 Then
            group.CreateSelection
            Globals.setViewAreaToShape group
            MsgBox "Die roten/pinken Formen sind nicht kombiniert"
            Globals.endMacro
        End If
    
        Dim name As String
        name = textShape.text.Story.text
        name = convertShapeNameFromTextShape(name)
        
        Dim sameNameShapeIndex As Integer
        sameNameShapeIndex = Globals.getStringIndexInCollection(alreadyTakenNames, name, StringEquals)
        
        If Not sameNameShapeIndex = -1 Then
            Set bothShapes = New shapeRange
            bothShapes.add group
            bothShapes.add processedShapes.item(sameNameShapeIndex)
            
            bothShapes.CreateSelection
            Globals.setViewAreaToShape group
            
            MsgBox "Der Formname '" & name & "' ist 2 mal vorhanden. Bitte beheben!"
            Globals.endMacro
        End If
        alreadyTakenNames.add name
        
        Dim shapeInfo As New ProductShapeInfo
        
        shapeInfo.newFromShape redShape, , name
        
        
        Dim sameShapeindex As Integer
        sameShapeindex = getSameShapeInfoIndex(shapeInfo)
        
        If Not sameShapeindex = -1 Then
            
            Set bothShapes = New shapeRange
            bothShapes.add group
            bothShapes.add processedShapes.item(sameShapeindex)
            
            bothShapes.CreateSelection
            Globals.setViewAreaToShape group
            
            MsgBox "Die Form kommt 2 mal vor. Eine Form aus der Auswahl muss gelöscht werden!"
            
            ' Debug
'            MsgBox shapeInfo.toString & vbNewLine & alreadyExistingShapeInfo(sameShapeindex).toString
            
            Globals.endMacro
        End If
        alreadyExistingShapeInfo.add shapeInfo
        processedShapes.add group
        
        ' Rote/Pinke Form und Gruppe davon so benennen, wie der Text in der Gruppe es angibt.
        ' Also der Formname. Z.B: Autoanhänger Kreuz
        redShape.name = name
        group.name = name
        
        csvString = csvString & vbNewLine & shapeInfo.toString
    End If
    

End Function


Public Function getSameShapeInfoIndex(shapeInfo As ProductShapeInfo) As Integer
    
    getSameShapeInfoIndex = -1
    
    For i = 1 To alreadyExistingShapeInfo.count
        
        If shapeInfo.equalsShapeInfo(alreadyExistingShapeInfo(i)) Then
            getSameShapeInfoIndex = i
            Exit Function
        End If
    
    Next i
    
End Function


Public Function checkShapeNameOfGroup(group As shape)
    
    Dim redShape As shape
    Dim redShapes As shapeRange
    Set redShapes = newCustomShapeTypeQuery(group, RedOrPinkShape).setExcludeGivenShape(True).setExcludeInvisibleShapes(True).search
    
    
    If redShapes.count > 0 Then
        Set redShape = redShapes.firstShape
    End If
    
    If redShape Is Nothing Then
        Exit Function
    End If
    
    
    ' Wird mehrfach verwendet
    Dim bothShapes As shapeRange
    
    Dim textShape As shape
    Set textShape = group.shapes.FindShapes(, cdrTextShape, True).firstShape
    
    If Not textShape Is Nothing Then
    
        Dim name As String
        name = textShape.text.Story.text
        name = convertShapeNameFromTextShape(name)
        
        Dim design As New productDesign
        design.newProductDesign group
        
        
        Dim shapeInfoByShapeName As ProductShapeInfo
        Set shapeInfoByShapeName = ProductRecognizer.getProductShapeInfoFromString(name)
        
        If shapeInfoByShapeName Is Nothing Then
            group.CreateSelection
            Globals.setViewAreaToShape group
            MsgBox "Die Form wurde nicht als '" & name & "' registriert"
            Globals.endMacro
        End If
        
        If Not ProductRecognizer.isLayerProduct(design.getLayer(1, 1), shapeInfoByShapeName) Then
            group.CreateSelection
            Globals.setViewAreaToShape group
            MsgBox "Die Form wurde nicht als '" & name & "' wiedererkannt. Verglichen wurde sie mit : '" & shapeInfoByShapeName.name & "'. Am ehesten entspricht sie '" & ProductRecognizer.recognizeProductLayerName(design.getLayer(1, 1), True) & " zu " & ProductRecognizer.bestFittingValuePercent & "%"
            Globals.endMacro
        End If
        
    End If
    
End Function



Public Sub TestGetSelectedShapeName()
    
    If Not ActiveShape Is Nothing Then
        
        If ActiveShape.Type = cdrGroupShape Then
            
            Dim shapeName As String
            
            Dim foundText As shapeRange
            Set foundText = newCustomShapeTypeQuery(ActiveShape, TextAny).setExcludeGivenShape(True).search
            If Not foundText.firstShape Is Nothing Then shapeName = foundText.firstShape.text.Story
            shapeName = convertShapeNameFromTextShape(shapeName)
            
            Dim answer As String
'            answer = InputBox("Gebe den Formnamen ein, mit dem Verglichen werden soll", "Formname eingeben", shapeName)
            answer = shapeName
            
            If Not answer = "" Then
                ProductRecognizer.initIfNeeded
                Dim shapeInfo As ProductShapeInfo
                Set shapeInfo = ProductRecognizer.getProductShapeInfoFromString(answer)
                
                If Not shapeInfo Is Nothing Then
                    Dim design As New productDesign
                    design.newProductDesign ActiveShape
                    
                    Globals.getLogger.reset
                    
                    ProductRecognizer.isLayerProduct design.getLayer2(1), shapeInfo, ProductRecognizer.getShapeInfoForLayer(design.getLayer2(1)), True, Globals.getLogger
                    
                    MsgBox "Die Form zu " & ProductRecognizer.fitPercent & "% die Form " & shapeInfo.name
                Else
                    MsgBox "Form " & answer & "nicht gefunden!"
                End If
            End If
            
        End If
        
    
    
    End If
    
End Sub


Private Function convertShapeNameFromTextShape(name As String) As String
    
    convertShapeNameFromTextShape = name
    convertShapeNameFromTextShape = Globals.replaceLineBreaks(convertShapeNameFromTextShape, " ")
    convertShapeNameFromTextShape = RTrim(convertShapeNameFromTextShape)
    
End Function
