Attribute VB_Name = "GravostyleBridge"
Option Explicit

' Autor: Martin Afelt & Kay Henning @ Gravuru
'

Const SLEEP_TIME_MULTIPLIER = 1

Public Sub OpenCorelDocumentInGravostyle()
    
    Globals.endIfNoDocumentOpen
    
    Globals.startMacro


    If Not Globals.debugHistory Then
        CorelScriptTools.BeginWaitCursor
        If Not ActiveDocument Is Nothing Then ActiveDocument.BeginCommandGroup "GravostyleBridge"
        If Not Globals.debugErrors Then On Error GoTo MacroError
    End If
    
    

    OpenCorelDocumentInGravostyle_Function Globals.getSelectedShapesOrAll
    
    
    
    
    GoTo Finally
MacroError: 'Alle Fehler hier abfangen und die CommandGruppe beenden, damit man mit einem Schritt zurück gehen kann (STRG + Z), auch wenn ein Fehler aufgetreten ist
    MsgBox Err.Description & ", " & Err.number, vbCritical
Finally:
    Globals.endMacro True
    If Not Globals.debugHistory Then
        
        ' Dokument zurücksetzen
        If GlobalSettingsUserForm.getSetting_ResetDocAfterExport Then
            If Not ActiveDocument Is Nothing Then ActiveDocument.Undo
        End If
    End If
End Sub


Public Sub TestOpenCorelDocumentInGravostyle_Function()
    Globals.startMacro
    OpenCorelDocumentInGravostyle_Function Globals.getSelectedShapesOrAll, True
    Globals.endMacro
End Sub


Public Function OpenCorelDocumentInGravostyle_Function(selection As shapeRange, Optional debugOpenPDFInBrowserNotGravoStyle As Boolean)
    
    If ActiveDocument Is Nothing Then Exit Function
    If Not areLayersHavingShapes(ActivePage.layers) Then Exit Function
    
    Dim pdfFilePath As String
    pdfFilePath = getGravostyleBridgeTempFolder & "CorelDraw Import.pdf"
    
    
    convertShapesForGravostyle selection
    
    exportShapeRangeToPDF selection, pdfFilePath
    
    If debugOpenPDFInBrowserNotGravoStyle Then
        Globals.openFile pdfFilePath
    Else
        ImportPDFInGravostyle pdfFilePath
    End If
    
End Function



Public Sub TestConvertPageForGravostyle()
    convertShapesForGravostyle Globals.getSelectedShapesOrAll
End Sub


Private Function convertShapesForGravostyle(range As shapeRange)
    
    Set range = Globals.shapeToShapeRange(range.group)
    
    Dim layerr As layer
    Dim i As Integer
    Dim j As Integer
    
    
    ' Schrift zu Kurven konvertieren
    ' --------------------------------
    Dim textShapes As New ArrayList
    textShapes.AddRange Globals.shapeRangeToCollection(range.shapes.FindShapes(, cdrTextShape))
    
    Dim textShapesConverted As New shapeRange
    Dim convertedTextShape As shape
    
    For j = 1 To textShapes.count
        
        Set convertedTextShape = Globals.convertTextShapeToCurveShape(textShapes.item(j))
        
        ' Es kann sein, dass der Text leer war, dann kommt nur Nothing raus, wenn man es zu einer Kurve konvertiert
        If Globals.isShapeReferenceValid(convertedTextShape) Then
            textShapesConverted.add convertedTextShape
        End If
        
        Set convertedTextShape = Nothing
    Next j
    
    ' Wenn der Text Buchstaben hat, die sich überschneiden, sieht Gravograph diese Überschneidungen als Löcher.
    ' Deshalb werden diese Löcher hier gestopft
    ' ============
    For j = 1 To textShapesConverted.count
        If textShapesConverted(j).Type = cdrCurveShape Then
            textShapesConverted(j).curve.SelfWeldClosedSubpaths
        End If
    Next j
    ' ============
    
    Set textShapes = Nothing
    ' --------------------------------
    
    
    
    ' Alle roten (nicht aber pinke) Formen Öffnen, damit sie beim rüberkopieren zu Gravograph nicht automatisch von dem Programm gefüllt werden können (weil sie nicht geschlossen sind)
    ' ---------------------------------------------------------
    Dim redShapes As shapeRange
    Set redShapes = newCustomShapeTypeQuery(range, redShape).setIgnoreGroupsWithTooManyShapes(False).search
    
    Dim lockedBefore As Boolean
    For j = 1 To redShapes.count
        lockedBefore = redShapes(j).locked
        
        ' Falls das jetzige Shape gesperrt ist, entsperren
        If redShapes(j).locked Then redShapes(j).locked = False
        
        Globals.ensureShapeHasCurve redShapes(j)
        
        redShapes(j).name = Globals.getNextObjectID
        
        ' Kurve öffnen
        openCurve redShapes(j).curve
        
        If lockedBefore Then
            redShapes(j).locked = True
        End If
    Next j
    ' ---------------------------------------------------------
    
    ' Wenn nur eine Form ausgewählt wurde, dann gruppiert Corel nicht.
    ' Dann muss hier auch nicht entgruppiert werden
    If range.firstShape.Type = cdrGroupShape Then
        Set range = range.shapes.All.firstShape.UngroupEx
    End If
    
End Function


' Öffnet eine Kurve einen Spalt breit, damit Gravograph nicht denkt, dass es einen Fläche ist und diese auch nicht füllt
Private Function openCurve(curvee As curve)
    
    curvee.Closed = False
    
    Dim i As Integer
    For i = 1 To curvee.subPaths.count
        ' Erzeugt einen neuen SubPath, indem die Kurve 1mm nach dem Start unterbrochen wird
        curvee.subPaths(i).BreakApartAt ActiveDocument.ToUnits(1, cdrMillimeter), cdrAbsoluteSegmentOffset
        
        ' Lösche diesen neuen SubPath, damit die Kurve dann wirklich offen ist
        curvee.subPaths(i).delete
        
    Next i
    
    
    
End Function


Private Function getGravostyleBridgeTempFolder()
    getGravostyleBridgeTempFolder = Globals.getTempFolder & "CorelDraw GravostyleBridge\"
    Globals.createFolder getGravostyleBridgeTempFolder
End Function




Private Function ImportPDFInGravostyle(pdfPath As String)
    
    ' Gravostyle8.exe startet Pltf.exe
    Dim exePath As String
    exePath = "C:\GravoStyle8000\Exe\Gravostyle8.exe"
    
    If Len(Dir$(pdfPath)) = 0 Then
        Err.Raise vbObjectError + 513, , "PDF nicht gefunden: " & pdfPath
    End If
    
    ' 1) Sicherstellen, dass Gravostyle läuft und PID holen
    Dim pid As Long
    pid = Globals.FindProcessIdByExeName("Pltf.exe")

    ' Wenn Gravograph nicht läuft, dann wird er gestartet und das Skript abgebrochen
    ' Denn Gravograph benötigt lange zum starten
    If pid = 0 Then
        If Len(Dir$(exePath)) = 0 Then
            Err.Raise vbObjectError + 513, , "Gravostyle nicht gefunden: " & exePath
        End If
        
        shell """" & exePath & """", vbNormalFocus
        
        MsgBox "Gravostyle wird jetzt für dich geöffnet du Dulli :)"
        Exit Function
    End If
    
    ' 2) Aktivieren über PID (kein Fenstertitel nötig!)
    If Not Globals.ActivateWindowByPid(pid, 5) Then
        Err.Raise vbObjectError + 513, , "Konnte Gravostyle nicht in den Vordergrund holen (PID=" & pid & ")."
    End If
    
    Globals.Sleep 50 * SLEEP_TIME_MULTIPLIER
    
    ' 3) Import öffnen
    SendKeys "^i", True
    Globals.Sleep 200 * SLEEP_TIME_MULTIPLIER
    
    ' 4) PDF einfügen
    ' Pfad via Clipboard einfügen statt "tippen", denn wenn der Pfad ein ~ enthält gibt es Probleme
    SetClipboardText pdfPath
    SendKeys "^v", True
    Globals.Sleep 5 * SLEEP_TIME_MULTIPLIER

    
    ' 5) Dateityp setzen
    SendKeys "%t", True ' Alt+T = Dateityp
    Globals.Sleep 5 * SLEEP_TIME_MULTIPLIER
    SendKeys "N", True ' Eines der Einträge mit N auswählen. Denn das nächste A ist dann immer Adobe PDF
    Globals.Sleep 5 * SLEEP_TIME_MULTIPLIER
    SendKeys "A", True ' Adobe PDF auswählen
    SendKeys "{ENTER}", True
    
    ' 6) Dialogfenster in Gravostyle bestätigen
    Globals.Sleep 40 * SLEEP_TIME_MULTIPLIER
    SendKeys "{ENTER}", True
    Globals.Sleep 5 * SLEEP_TIME_MULTIPLIER
    
    ' 7) Hinweis einfügen, falls man das Textwerkzeug ausgewählt hat
    ' Denn dann ist der Menüeintrag "Importieren" ausgegraut
    SendKeys "Auswahlmodus aktivieren!"
    
End Function



Private Function exportShapeRangeToPDF(range As shapeRange, filePath As String)
    
    range.CreateSelection

    ' Recorded 17.02.2026
    With ActiveDocument.PDFSettings
        .PublishRange = pdfSelection
        .PageRange = "1"
        .Author = "Gravuru CorelDRAW Automation"
        .Subject = ""
        .Keywords = ""
        .BitmapCompression = 0 ' CdrPDFVBA.pdfNone
        .JPEGQualityFactor = 2
        .TextAsCurves = False
        .EmbedFonts = True
        .EmbedBaseFonts = True
        .TrueTypeToType1 = True
        .SubsetFonts = True
        .SubsetPct = 80
        .CompressText = True
        .Encoding = 1 ' CdrPDFVBA.pdfBinary
        .DownsampleColor = False
        .DownsampleGray = False
        .DownsampleMono = False
        .ColorResolution = 400
        .MonoResolution = 600
        .GrayResolution = 400
        .Hyperlinks = True
        .Bookmarks = True
        .Thumbnails = False
        .Startup = 0 ' CdrPDFVBA.pdfPageOnly
        .ComplexFillsAsBitmaps = False
        .Overprints = True
        .Halftones = False
        .MaintainOPILinks = False
        .FountainSteps = 256
        .EPSAs = 0 ' CdrPDFVBA.pdfPostscript
        .pdfVersion = 0 ' CdrPDFVBA.pdfVersion12
        .IncludeBleed = False
        .Bleed = 31750
        .Linearize = False
        .CropMarks = False
        .RegistrationMarks = False
        .DensitometerScales = False
        .FileInformation = False
        .ColorMode = 3 ' CdrPDFVBA.pdfNative
        .ColorProfile = 1 ' CdrPDFVBA.pdfSeparationProfile
        .EmbedFilename = ""
        .EmbedFile = False
        .JP2QualityFactor = 2
        .TextExportMode = 0 ' CdrPDFVBA.pdfTextAsUnicode
        .PrintPermissions = 0 ' CdrPDFVBA.pdfPrintPermissionNone
        .EditPermissions = 0 ' CdrPDFVBA.pdfEditPermissionNone
        .ContentCopyingAllowed = False
        .OpenPassword = ""
        .PermissionPassword = ""
        .EncryptType = 2 ' CdrPDFVBA.pdfEncryptTypeAES
        .OutputSpotColorsAs = 0 ' CdrPDFVBA.pdfSpotAsSpot
        .overPrintBlackLimit = 95
        .ProtectedTextAsCurves = True
    End With
    ActiveDocument.PublishToPDF filePath
End Function



