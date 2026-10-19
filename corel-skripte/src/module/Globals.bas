Attribute VB_Name = "Globals"

' Autor:  Martin Afelt @ GRAVURU
'         Nigel Heffernan   Excellerando.Blogspot.com

Public Declare PtrSafe Sub Sleep Lib "kernel32.dll" (ByVal dwMilliseconds As Long)

Private Declare PtrSafe Function CreateScalableFontResource Lib "gdi32" _
   Alias "CreateScalableFontResourceA" _
  (ByVal fHidden As Long, _
   ByVal lpszResourceFile As String, _
   ByVal lpszFontFile As String, _
   ByVal lpszCurrentPath As String) As Long


' KEYS ::::
Declare PtrSafe Function GetKeyState Lib "user32" _
(ByVal vKey As Integer) As Integer
Public Const SHIFT_KEY = 16
Public Const CTRL_KEY = 17
Public Const ALT_KEY = 18

' MAX VALUES ::::
Public Const MAXINT As Integer = (2 ^ 15) - 1
Public Const gMaxCode As Long = &H2191 ' Up arrow. Scheinbar das letzte Zeichen das noch kein Unicode ist. Alles darüber ist Unicode

Dim pi As Double
Public Const DOUBLE_ROUND_TOLERANCE As Double = 0.000000001

' GLOBALER LOGGER ::::
Private p_logger As logger

' ERROR CODES ::::
'Public Const


' SERVER ::::
Dim offlineMainFolder As String
Dim serverOnline As Boolean
Dim serverOnlineStatusCheckedOnce As Boolean
Dim secondServerOnline As Boolean


' FUNKTIONS-VARIABLEN ::::
Dim macroRunning As Boolean
Dim selectionBeforeMacroStart As shapeRange
Dim viewOriginXBeforeMacroStart As Double
Dim viewOriginYBeforeMacroStart As Double
Dim viewZoomBeforeMacroStart As Double
' PathFinder-Funktionen wie Globals.subtractShape oder Globals.intersectShape teilen sich diese Variablen
Dim pathFinder_sourceShapeCurve As curve
Dim pathFinder_targetShapeCurve As curve
Dim pathFinder_reversedSourceShapeDirection As Boolean
Dim pathFinder_reversedTargetShapeDirection As Boolean

Private storedVisibleDockers As collection
Private p_dockersGUIDs As Dictionary



Public fileSystemObject As New fileSystemObject
Public regexx As New RegExp

' Farben der Roland Versa Works Palette: RDG_White und CutContour
Dim p_rolandVersaWorksPalette As palette
Dim p_pinkColor As color
Dim p_RGD_WhiteColor As color
Dim p_RGD_GlossColor As color
Dim p_viewShapeColor As color

Dim gravingColors As collection

Public Const MASTER_DESIGN_PRODUCT_ID = "MUSTER"
Public Const MASTER_DESIGN_FILE_NAME = "Muster"

' Wird genutzt um beim Ex oder Import von einer CDR aus den Pfad zu nehmen, welcher strukturell vorgegeben ist
' Wenn man bspw einen AmazonExport macht und in einer CDR ist, dann macht der AmazonExport aus 'STRUKTUR' den Pfad zum Ordner wo die Amazonbilder rein sollen
Public Const STRUCTURE_PATH = "STRUKTUR"

Dim allKeyWords As collection

Dim objectIDCounter As Integer


Public Enum customShapeType
    NoShapeType = 0
    allShapes
    
    RedOrPinkShape
    redShape
    PinkShape
    
    Look
    uploadBox
    YourPhotoNoteShapeType ' Dein Foto
    PowerClipShapeType
    motive
    
    ' MARKER
    locked
    textLocked
    BitmapInAmazonCDRShapeType
    
    ' METADATEN
    metadataShapeType ' Beinhaltet alle darunterliegenden Formtypen vv
    productID
    fancyCustomizationIDShapeType
    
    mainMask ' HauptMaske die im ConfiHelper generiert wird
    viewShape
    GuideLineShapeType ' Custom Hilfslinien die mit RDG_Gloss gefärbt sind
    
    ' VARIANTEN
    AnyVariant
    groundPlate
    photoMask 'FotoMaske
    StaticVariant ' var_befestigung(Bohrloecher-3mm)
    DesignElementVariantShapeType ' desVar(1)
    DesignElementVariantContainerShapeType ' desVarCont(1)
    StaticVariantContainer ' varCont(var_befestigung(Bohrloecher-3mm))
    
    ' TRANSPARENZ
    TransparentShape 'Formen, die eine Transparenz haben
    FullTransparentShapeType ' Formen, die zu 100% transparent sind
    
    ' AmazonImport
    AmazonImportPreviewImageShapeType ' Vorschaubild Amazon-Konfi
    
    ' Confi (Amazon oder Fancy)
    ConfiUploadBoxCutForImportShapeType
    ConfiMaskShapeType
    ConfiBackgroundShapeType
    
    ' Fancy
    FancyHelperShapeType
    
    ' Formen können für einen bestimmten Exporttyp markiert sein, für welchen sie dann gültig sind
    ForProductPictureShapeType
    ForAmazonConfiShapeType
    ForFancyShapeType
    NotForProductPictureShapeType
    NotForAmazonConfiShapeType
    NotForFancyShapeType
    ValidForGlobalExportTypeShapeType
    InvalidForGlobalExportTypeShapeType
    
    ' Je nach Exporttyp sind bestimmte Formen ausgeschlossen (Nicht markierabhängig)
    ValidForProductPictureExportShapeType
    ValidForFancyConfiExportShapeType
    ValidForAmazonConfiExportShapeType
    ValidForSplittingForAmazonKonfiImportShapeType
    NotValidForProductPictureExportShapeType
    NotValidForFancyConfiExportShapeType
    NotValidForAmazonConfiExportShapeType
    NotValidForSplittingForAmazonKonfiImportShapeType
    
    
    designShape ' Eine Gruppe, die ein Design ist. Wird geprüft mit isValidDesign
    
    TextAny ' alle Texte, egal ob es auch die ProductID o.Ä ist
    CurveWithText ' Kurve, auf der ein Text ist
    ParagraphText ' Textbox von Corel
    
    qrCode ' Ein QR-Code von Corel erstellt vom Typ 'CustomShape'
    bSplineShapeType ' Wird von Corel als 'CustomShape' Typ angegeben. QR-Codes sind aber auch 'CustomShape'. Dieser custom Typ hilft dabei das zu unterscheiden
    
    ExportableShape ' Form dessen Name mit > beginnt
    RGD_WhiteShape
    putOnMaskShape ' Abstandshalter z.B: sollen auf die Hauptmaske beim Amazon oder Fancyexport
    ByName ' Beim suchem mit getShapesOfCustomShapeType muss noch ein Name und der Suchtyp angegeben werden (als argument1 & argument2)
    ShapeWithFx ' Zusätzlich kann über das argument1 der Typ angegeben werden, TODO ! ! !
    FxShapeType
    
    CorelDrawShape ' Der eigentliche ShapeType muss dann als argument1 angegeben werden. Z.B: cdrBitmapShape
    
    ' Formen, die auch als cdrShapeType exestieren. Der Formtyp curveShape kann aber alles sein: Rechteck Ellipse o.Ä
    ' Deshalb exestieren nochmal diese Formtypen. Denn bei denen wird genau hingesehen
    EllipseAny
    RectangleAny
    CurveAny ' Schließt Rechtecke, Ellipsen und alle anderen möglichen Formen mit ein, die eine Kurve haben
    CurveAnyOrText
    
    ' Da CMYK-Schwarz in RGB nicht wirklich schwarz rauskommt, müssen Formen mit
    CmykBlackOutline ' Schwarz steht hier für alle CMYK-Töne, die schwarz aussehen (auch wenn K nicht gleich 100 ist): C:0,M:0,Y:0,K:100 oder C:95,M:95,Y:45,K:95
    CmykBlackFill
    
    OutlineColorShapeType
    FillColorShapeType
    InvisibleProperlyShapeType ' Eine Form, die entweder 100% transparent ist oder keine sichtbaren Eigenschaften hat wie Füllung oder Outline
    VisibleProperlyShapeType ' Eine Form, die NICHT zu 100% unsichtbar ist und auch sichtbare Eigenschaften wie Füllung oder Outline hat
    
    ' Eine Form kann nur eine dieser 3 Typen sein
    DesignElementShapeType ' Gibt an, ob eine Form ein gestalterisches Element ist (Text, Farbflächen, Bitmaps usw.)
    VisualElementShapeType ' Gibt an, ob eine Form nur zur visuellen unterstützung des Produktes da ist. (Abstandshalter, Konfimaske, Konfihintergrund, Look etc.)
    GuideElementShapeType ' Gibt an, ob eine Form eine Eigenschaft des Designs darstellt (Rote/pinke Form, Hilfslinie, Viewbox, Artikelnummer etc)
End Enum


Public Enum subPathType
    RectangleSubPath ' Damit ist zum einen eine Form vom Typ Rectangle gemeint aber auch Formen vom Typ Curve die rechteckig sind
    EllipseSubPath ' Damit ist zum einen eine Form vom Typ Ellipse gemeint aber auch Formen vom Typ Curve die elipsenförmig/rund sind
    FreeSubPath ' Alle Formen außer rechteckig oder ellipse
    AnySubPath ' Alle Formen
End Enum


Public Enum stringSearchType
    StringInside = 0
    StringEndsWith
    StringStartsWith
    StringEquals
    StringRegex
End Enum


Public Enum globalExportType
    NoExportType
    ProductImageExportType
    AmazonExportType
    FancyExportType
End Enum

Public Enum shapeGatherType
    Selected
    Unselected
    GatherAll
End Enum



' Wird hauptsächlich vom ProductDesignLayer genutzt
Public Enum MainShapeAddMode
    AutoSenseNewMainShapes ' Automatisch erkennen, ob die neuen Formen ein neuer Layer sein können (CreateNewLayerOfNewMainShapes). Ansonsten werden die Formen hinzugefügt (AddNewMainShapesToExisting)
    AddNewMainShapesToExisting
    OverrideNewMainShapesWithExisting
    CreateNewLayerOfNewMainShapes
    DeleteNewMainShapes
    
    count
End Enum


Public Enum UploadBoxType
    FreeUploadBoxType
    BoundedUploadBoxType
    AnyUploadBoxType
End Enum

' Boolesche Formoperationen (Zuschneiden). Verweist auf die jeweiligen Globals-Funktionen:
' subtractOperation -> subtractShape, intersectOperation -> intersectShapes, combineOperation -> combineShapes
Public Enum ShapeBooleanOperation
    noOperation = 0
    subtractOperation
    intersectOperation
    combineOperation
End Enum


Public Function getVersion() As Version
    
    Dim vers As New Version
    
    'RELEASE
    vers.newVersion 52, 5, 2, FinalVersionPhase
    
    Set getVersion = vers
End Function


Public Sub isReleaseVersionSub(result As Boolean)
    
End Sub


' Kopiert die Dev-GMS als "Tools <Version>.gms" in den Versionen-Ordner auf dem Server, damit Kollegen die Version installieren können.
' Gibt den Pfad der veröffentlichten GMS zurück. Bei einem Fehler oder Abbruch "" bzw. im silent-Modus "FEHLER: <Grund>".
' silent = True ist für den Aufruf per COM (GMSManager.RunMacro) gedacht: Keine MsgBoxen, denn die würden den Aufruf blockieren.
' Eine bereits veröffentlichte Version wird im silent-Modus ohne Nachfrage überschrieben.
Public Function releaseThisGMSOnServer(Optional silent As Boolean = False) As String
    ' Der Serverstatus wird sonst nur beim Start von CorelDRAW ermittelt (Startup). Nach einem Neuaufbau des Projekts
    ' (z.B. VBA-Import) ist er zurückgesetzt und getMainFolder wäre leer
    If Not checkIfServerIsOnline Then
        If silent Then
            releaseThisGMSOnServer = "FEHLER: Kein Server erreichbar. Die Version kann nicht veröffentlicht werden"
            Exit Function
        End If
        MsgBox "Kein Server erreichbar. Die Version kann nicht veröffentlicht werden", vbCritical
        Exit Function
    End If
    
    Dim versionsFolderPath As String
    versionsFolderPath = Globals.getMainFolder
    versionsFolderPath = versionsFolderPath & "Skript installieren\Versionen\"
    
    Dim devGMSPath As String
    devGMSPath = Globals.addBackslash(Application.GMSManager.UserGMSPath) & "Tools (Dev Version).gms"
    
    If Not Globals.fileExist(devGMSPath) Then
        If silent Then
            releaseThisGMSOnServer = "FEHLER: Der Pfad zur GMS-Datei existiert nicht: " & devGMSPath
            Exit Function
        End If
        MsgBox "Der Pfad zur GMS-Datei existiert nicht: " & devGMSPath, vbCritical
        End
    End If
    
    ' Kopiert wird die Datei auf der Platte. Ungespeicherte Änderungen im VBA-Editor wären nicht enthalten
    Dim project As gmsProject
    For Each project In Application.GMSManager.Projects
        If LCase(project.FullFileName) = LCase(devGMSPath) Then
            If project.Dirty Then
                If silent Then
                    releaseThisGMSOnServer = "FEHLER: Das Projekt '" & project.name & "' hat ungespeicherte Änderungen. Bitte zuerst im VBA-Editor speichern"
                    Exit Function
                End If
                If MsgBox("Das Projekt '" & project.name & "' hat ungespeicherte Änderungen, die nicht veröffentlicht werden. Trotzdem fortfahren?", vbYesNo Or vbExclamation) = vbNo Then
                    Exit Function
                End If
            End If
        End If
    Next project
    
    Dim exportedGMSPath As String
    exportedGMSPath = versionsFolderPath & "Tools " & Globals.getVersion.versionString & ".gms"
    
    Dim overwriteExisting As Boolean
    overwriteExisting = silent ' Ohne silent fragt copyPasteFile per MsgBox nach
    
    If Globals.copyPasteFile(devGMSPath, exportedGMSPath, False, overwriteExisting) = "" Then
        Exit Function ' Überschreiben einer vorhandenen Version abgelehnt
    End If
    
    If Not silent Then
        MsgBox "Version " & Globals.getVersion.versionString & " erfolgreich veröffentlicht", vbInformation
    End If
    
    releaseThisGMSOnServer = exportedGMSPath
End Function


' Gibt an, ob das Script herausgegeben wurde. Ob es gerade beim Endnutzer ausgeführt wird.
' Denn dann werden Debugfunktionen deaktiviert. Wie z.B: der Logger
' Fehler werden abgefangen und dann als MessageBox angezeigt damit sich dieses Fenster nicht öffnet
Public Function isReleaseVersion() As Boolean
    isReleaseVersion = True 'RELEASE EIN !
End Function


' Wenn nicht aktiv, werden Fehler auf oberster Ebene abgefangen (also immer in der Start-Funktion)
' Außerdem wird der Fehler nicht im Code-Editor angezeigt. Es erscheint (im Optimalfall) nur ein Fenster mit der Fehlermeldung
Public Function debugErrors() As Boolean
    debugErrors = Not isReleaseVersion
End Function


' Wenn aktiv, lässt sich per STRG + Z jeder einzelne Schritt, der vom Script ausgeführt wurde rückgängig machen.
' Ist aber nervig für den Endnutzer. Der soll nämlich alle Scriptschritte mit einem STRG + Z rückgängig machen können.
' Deshalb aus. Ist nur gut fürs Debuggen.
Public Function debugHistory() As Boolean
'    debugHistory = True 'RELEASE AUS !
End Function


Public Function isUserformLoaded(formName As String) As Boolean
    Dim frm As Object
    For Each frm In VBA.UserForms
        If frm.name = formName Then
            isUserformLoaded = True
            Exit Function
        End If
    Next frm
    isUserformLoaded = False
End Function


' Zum Debbugen von Objektinstanzen können diese IDs verwendet werden
Public Function getNextObjectID() As Integer
    getNextObjectID = objectIDCounter
    objectIDCounter = objectIDCounter + 1
End Function


'KEYWÖRTER
'
Public Function getTextLockedKeyWord() As String
    getTextLockedKeyWord = "textLocked"
End Function

Public Function getLockedKeyWord() As String
    getLockedKeyWord = "locked" 'Fest
End Function

Public Function getColorableKeyWord() As String
    getColorableKeyWord = "colorable"
End Function

' Outdated, aber noch in alten CDRs vorhanden. Wichtig für die 'Globals.removeKeywordsFromName'
Public Function getTransparencyKeyWord() As String
    getTransparencyKeyWord = "transparency"
End Function

Public Function getBitmapInFancyKeyWord() As String
    getBitmapInFancyKeyWord = "fancyBitmap"
End Function

Public Function getSVGInFancyKeyWord() As String
    getSVGInFancyKeyWord = "fancySVG"
End Function

Public Function getConfiMaskKeyWord() As String
    getConfiMaskKeyWord = "konfi-maske"
End Function

Public Function getConfiBackgroundKeyWord() As String
    getConfiBackgroundKeyWord = "konfi-hintergrund"
End Function

Public Function getForProductPictureKeyWordOld() As String
    getForProductPictureKeyWordOld = "for_product_picture"
End Function

Public Function getForProductPictureKeyWord() As String
    getForProductPictureKeyWord = "for_product_picture" '"für-produktbilder"
End Function

Public Function getForFancyKeyWord() As String
    getForFancyKeyWord = "für-fancy"
End Function

Public Function getForAmazonConfiKeyWord() As String
    getForAmazonConfiKeyWord = "für-amazon-konfi"
End Function

Public Function getBitmapInAmazonExportCDRKeyWord() As String
    getBitmapInAmazonExportCDRKeyWord = "amazonCDRBitmap"
End Function

Public Function getTemporaryKeyWord() As String
    getTemporaryKeyWord = "tmp"
End Function


Public Function getAmazonCustomerTextInBlanksKeyWord() As String
    getAmazonCustomerTextInBlanksKeyWord = "amazon-kundentext-in-leerzeichen"
End Function

Public Function getIgnoreAmazonCustomerColorKeyWord() As String
    getIgnoreAmazonCustomerColorKeyWord = "amazon-kundenfarbe-ignorieren"
End Function

' Wenn eine Textbox mit diesem Marker markiert ist,
' dann wird ein langer Text beim AmazonImport in dieser Textbox in mehrere Zeilen umgebrochen,
' wenn der Text nicht in die Textbox passt
Public Function getAmazonMultiLineTextBoxKeyWord() As String
    getAmazonMultiLineTextBoxKeyWord = "amazon-mehrzeiler-textbox"
End Function


Public Function getNamingKeyWord() As String
    getNamingKeyWord = "name"
End Function


Public Function getAllKeyWords() As collection
    ' Wenn nicht alle Keywords schon gecached sind, dann in 'allKeyWords' chachen
    If allKeyWords Is Nothing Then
        Set allKeyWords = New collection
        
        allKeyWords.add getTextLockedKeyWord
        allKeyWords.add getLockedKeyWord
        allKeyWords.add getColorableKeyWord
        allKeyWords.add getTransparencyKeyWord
        
        allKeyWords.add getBitmapInFancyKeyWord
        allKeyWords.add getSVGInFancyKeyWord
        
        allKeyWords.add getConfiMaskKeyWord
        allKeyWords.add getConfiBackgroundKeyWord
        
        allKeyWords.add getForFancyKeyWord
        allKeyWords.add getForAmazonConfiKeyWord
        allKeyWords.add getForProductPictureKeyWord
        allKeyWords.add getForProductPictureKeyWordOld
        
        allKeyWords.add getBitmapInAmazonExportCDRKeyWord
        
        allKeyWords.add getTemporaryKeyWord
        
        allKeyWords.add getAmazonCustomerTextInBlanksKeyWord
        allKeyWords.add getIgnoreAmazonCustomerColorKeyWord
        allKeyWords.add getAmazonMultiLineTextBoxKeyWord
        allKeyWords.add getNamingKeyWord
    End If
    
    Set getAllKeyWords = allKeyWords
End Function



Public Sub TestGetKeyWordContent()
    Globals.endIfNoActiveShape
    MsgBox getKeyWordContent(ActiveShape, Globals.getNamingKeyWord)
End Sub



' Es gibt Keywords, die einen Kontent haben.
' Bspw. name(Sterbedatum)
Public Function getKeyWordContent(shapee As shape, keyWord As String) As String
    Dim name As String
    name = Globals.getShapeNameLong(shapee)
    
    getKeyWordContent = getStringGroupContentByStartString(name, keyWord)
    
    ' TODO. Es könnten in Zukunft auch mehrere Keywords mit Kontent vorkommen oder Verschachtelungen:
    ' keyword(wert1(var), wert2) usw...
    'getKeyWordContent = Globals.getStringBetweenStrings(name, keyWord & "(", ")")
End Function


Public Sub TestGetStringGroupContentByStartString()
    MsgBox "getStringGroupContentByStartString: " & vbNewLine & getStringGroupContentByStartString("abc(123(x), 456(y))", "abc")
End Sub


Public Function getStringGroupContentByStartString(str As String, startString As String, Optional openChar As String = "(", Optional closingChar As String = ")") As String
    getStringGroupContentByStartString = getStringGroupContent(str, InStr(str, startString) + Len(startString) + 1, openChar, closingChar)
End Function

Public Function getStringGroupContent(str As String, Optional Startindex As Integer = 1, Optional openChar As String = "(", Optional closingChar As String = ")") As String
    getStringGroupContent = subStr(str, Startindex, findClosingCharPosition(str, Startindex - 1, openChar, closingChar) - 1)
End Function


' Sucht nach Text zwischen den openChar und closingChar. Beachtet dabei aber dass ein openChar & closingChar mehrfach vorkommen kann
'
' Wenn man als str folgendes hat:
' abc(123(x), 456(y))
' und man als startIndex die 4 hat. Also den ersten (
' Dann bekommt man folgendes zurück:
' 123(x), 456(y)
Public Function findClosingCharPosition(str As String, Optional Startindex As Integer = 1, Optional openChar As String = "(", Optional closingChar As String = ")") As Integer
    
    Dim level As Integer
    
    Dim i As Integer
    For i = Startindex To Len(str)
        Dim charr As String
        charr = getCharOfString(str, i)
        
        If charr = openChar Then
            level = level + 1
        ElseIf charr = closingChar Then
            level = level - 1
            
            If level = 0 Then
                findClosingCharPosition = i
                Exit Function
            End If
        End If
    Next i
    
End Function


Public Function markShapeAsTemporary(shape As shape)
    markShape shape, getTemporaryKeyWord, True, True, False ' Achtung. Markiert nur. Entfernt aber nicht
End Function


Public Function markSelectedShapes(keyWord As String, Optional quietMode As Boolean = False, Optional allowAdd As Boolean = True, Optional allowRemove As Boolean = True)
    
    Globals.endIfNoDocumentOpen
    
    markShapes ActiveSelectionRange, keyWord, quietMode, allowAdd, allowRemove
    
End Function


Public Function markSelectedShape(keyWord As String, Optional quietMode As Boolean = False, Optional allowAdd As Boolean = True, Optional allowRemove As Boolean = True)
    
    Globals.endIfNoDocumentOpen

    markShape ActiveShape, keyWord, quietMode, allowAdd, allowRemove
End Function


Public Function markShapes(shapes As shapeRange, keyWord As String, Optional quietMode As Boolean = False, Optional allowAdd As Boolean = True, Optional allowRemove As Boolean = True)
    
    Dim i As Integer
    For i = 1 To shapes.count
        markShape shapes(i), keyWord, quietMode, allowAdd, allowRemove
    Next i
    
End Function


' Achtung: Markiert nur die ausgewählten Shapes
' Achtung! Es gibt Buttons, mit der die User Keywords zu Formnamen hinzufügen oder entfernen können und es gibt Keywords für die es keine Buttons gibt, da nur Skripte diese benutzen. Manche auch nur zur Laufzeit
Public Function markShape(shp As shape, keyWord As String, Optional quietMode As Boolean = False, Optional allowAdd As Boolean = True, Optional allowRemove As Boolean = True)
    
    If Not quietMode Then
        Globals.endIfNoDocumentOpen
        
        Globals.checkIfServerOnlineAndSelectOfflineWorkPath
        Globals.checkVersion
        
        If Not Globals.debugHistory Then
            ActiveDocument.BeginCommandGroup "Form markieren als '" & keyWord & "'"
        End If
    End If
    
    Globals.addOrRemoveNameFromShape shp, keyWord
    
    If Not quietMode Then
        If Not Globals.debugHistory Then Globals.endMacro True
    End If
End Function



' Setzt voraus, dass 'checkIfServerIsOnline' vorher ausgeführt wurde
Public Function getMainFolder() As String
    
    If serverOnline Then
        getMainFolder = getMainFolderOfServer()
    ElseIf secondServerOnline Then
        getMainFolder = getMainFolderOfSecondServer()
    Else
        getMainFolder = offlineMainFolder
    End If

End Function


Public Function getMainFolderOfServer() As String
    If GlobalSettingsUserForm.getSetting_UseGoogleDriveAsServer Then
        getMainFolderOfServer = getGoogleDriveNewStructureFolder & "Corel\"
    Else
        getMainFolderOfServer = "Y:\20_Martin\Corel\"
    End If
End Function

Public Function getMainPhotoshopFolderOfServer() As String
    getMainPhotoshopFolderOfServer = "Y:\20_Martin\Photoshop\Scripte\"
End Function


Public Function getMainFolderOfSecondServer() As String
    getMainFolderOfSecondServer = "\\192.168.178.100\chrisck_design\Mitarbeiter\20_Martin ALT\Corel\"
End Function

Public Function getNewStructureServerFolder()
    getNewStructureServerFolder = "V:\"
End Function

Public Function getNewStructureFolder() As String
    If GlobalSettingsUserForm.getSetting_UseGoogleDriveAsServer Then
        getNewStructureFolder = getGoogleDriveNewStructureFolder
    Else
        getNewStructureFolder = getNewStructureServerFolder
    End If
End Function

Public Function getNewStructureProductsFolder() As String
    getNewStructureProductsFolder = getNewStructureFolder & "Produkte\"
End Function

Public Function getNewStructureMotivesFolder() As String
    getNewStructureMotivesFolder = getNewStructureFolder & "Motive\"
End Function

Public Function getGoogleDriveNewStructureFolder() As String
    getGoogleDriveNewStructureFolder = "G:\Meine Ablage\Neue Struktur\"
End Function



Public Function getHairlineThickness() As Double
    getHairlineThickness = ConvertUnits(0.003, cdrInch, ActiveDocument.unit)
End Function


Public Function startMacro()
    macroRunning = True
    
    If useOptimize Then optimize True
    
    CorelScriptTools.BeginWaitCursor
    
End Function

' Wird von GlobalMacroStorage aufgerufen
' Subs können keine Werte zurückliefern. Deshalb wird hier "var" genutzt um Werte zu übermitteln
Public Sub isMacroRunning(var() As Variant)
    var(0) = macroRunning
End Sub


Public Sub GetSetting_OrderPastedShapeAboveLastSelectedSub(var() As Variant)
    var(0) = GlobalSettingsUserForm.getSetting_OrderPastedShapeAboveLastSelected
End Sub


Public Function endMacro(Optional dontForceEnd As Boolean, Optional hideProgressBar As Boolean = True)
    
    CorelScriptTools.EndWaitCursor
    If Not ActiveDocument Is Nothing Then
        ActiveDocument.EndCommandGroup
    End If
    
    'ProgressBarUserForm.Hide 'Muss nicht gemacht werden wenn 'End'
    
    macroRunning = False
    If useOptimize Then
        optimize False
        Globals.RefreshObjectManagerDocker
    End If
    
    If hideProgressBar Then
        ' Es kann vorkommen, dass Skripte nicht den Ladebalken nutzen.
        ' Dieser ist dann komischerweise noch nicht initialisiert oder so
        If isUserformLoaded("ProgressBarUserForm") Then
            ProgressBarUserForm.Hide ' TODO Hier kommt noch ein Fehler
        End If
    End If
    
    If Not dontForceEnd Then
        End
    End If
End Function

Public Function useOptimize() As Boolean
    useOptimize = GlobalSettingsUserForm.getSetting_UseOptimize
End Function




' S E R V E R
'
'///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

' Wird von ThisMacroStorage ausgeführt
Public Sub Startup()
    checkIfServerOnlineAndSelectOfflineWorkPath
    
    checkVersion
End Sub




Public Function checkIfServerOnlineAndSelectOfflineWorkPath()
    
    checkIfServerIsOnline
    
    If Not folderExists(getMainFolder()) Then
    
        MsgBox "Der Pfad '" & getMainFolder() & "' exestiert nicht." & vbNewLine & "Beide Server scheinen offline zu sein. Bitte wähle einen alternativen Pfad." & vbNewLine & "(Es muss ein Ordner namens 'Corel' sein.)", vbExclamation
    
        Dim newPath As String
        newPath = CorelScriptTools.GetFolder()
        
        If Not newPath = "" Then
            offlineMainFolder = newPath & "\"
        Else
            End
        End If
        
    End If
    
End Function




Private Function checkIfServerIsOnline() As Boolean
    
    Dim serverOnlineBefore As Boolean
    serverOnlineBefore = serverOnline
    
    If Not serverOnlineStatusCheckedOnce Then
        serverOnlineBefore = True
    End If
    
    serverOnline = folderExists(getMainFolderOfServer())
    serverOnlineStatusCheckedOnce = True
    
    If serverOnline And Not serverOnlineBefore Then
        MsgBox "Der Hauptserver ist jetzt wieder Online", vbInformation
    End If
    
    If Not serverOnline Then
    
        Dim secondServerOnlineBefore As Boolean
        secondServerOnlineBefore = secondServerOnline
        secondServerOnline = folderExists(getMainFolderOfSecondServer())
       
        If secondServerOnline Then
            If Not secondServerOnlineBefore Then
                MsgBox "Der Hauptserver ist offline. Jetzt wird der alternative Server genutzt.", vbInformation
            End If
            
        End If
    End If
    
    checkIfServerIsOnline = isOneServerOnline

End Function



Private Function isOneServerOnline() As Boolean
    
    isOneServerOnline = serverOnline Or secondServerOnline

End Function


Public Function isFirstServerOnline() As Boolean
    isFirstServerOnline = serverOnline
End Function


Public Function getScriptVersionFromServer() As Version
    Dim vers As New Version
    vers.newFromTextFile getMainFolder() & "Version.txt"
    Set getScriptVersionFromServer = vers
End Function

Public Function getGravuruBarVersionFromServer() As Version
    Dim vers As New Version
    vers.newFromTextFile Globals.addBackslash(getMainFolder()) & "Script Icons\ScriptIconsVersion.txt"
    Set getGravuruBarVersionFromServer = vers
End Function


' Gibt true zurück, wenn diese Version die aktuelle oder neuer ist
Public Function isScriptCurrentOrNewerVersion() As Boolean
    isScriptCurrentOrNewerVersion = getVersion.isVersionSameOrNewerThen(getScriptVersionFromServer)
End Function






Public Function checkVersion()
    
    If Not isScriptCurrentOrNewerVersion And Not VersionDialog.DontShowAgainCheckBox.value Then
        
        VersionDialog.VersionLabel1.Caption = "Neue Version: " & getScriptVersionFromServer.versionString & vbNewLine & "Deine aktuelle Version: " & getVersion.versionString
        VersionDialog.Show
        
        If VersionDialog.yesClicked Then
            
            openUpdateInstaller
            
            End
        End If
        
    End If

End Function


Public Function openUpdateInstaller()
    Dim pastePath As String
    pastePath = Globals.getTempFolder & "CorelDraw Script Installieren\Script installieren erweitert.hta"
    
    Dim sourcePath As String
    sourcePath = getMainFolder & "Skript installieren\Script installieren erweitert.hta"
    
    ' Den Script-Installer auf den Benutzer-PC kopieren und es von dort aus ausführen. So erscheint keine Sicherheitswarnung
    Globals.copyPasteFile sourcePath, pastePath, False, True, True
    
    If Not Globals.fileExist(sourcePath) Then
        MsgBox "Die Datei '" & sourcePath & "' konnte nicht gefunden werden!", vbCritical
        Exit Function
    End If
    
    runExecute "C:\WINDOWS\explorer.exe ", pastePath
End Function
















' H E L P E R S
'
'///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



Public Function max3(a As Long, b As Long, c As Long) As Long
    max3 = a
    If b > max3 Then max3 = b
    If c > max3 Then max3 = c
End Function


Public Function min3(a As Long, b As Long, c As Long) As Long
    min3 = a
    If b < min3 Then min3 = b
    If c < min3 Then min3 = c
End Function


' Funktioniert wie der Modulo Operator "Mod". Nur dass hier auch nachkommastellen im Ergebnis vorkommen dürfen
Public Function FMod(a As Double, b As Double) As Double
    FMod = a - Fix(a / b) * b

    'http://en.wikipedia.org/wiki/Machine_epsilon
    'Unfortunately, this function can only be accurate when `a / b` is outside [-2.22E-16,+2.22E-16]
    'Without this correction, FMod(.66, .06) = 5.55111512312578E-17 when it should be 0
    If FMod >= -2 ^ -52 And FMod <= 2 ^ -52 Then '+/- 2.22E-16
        FMod = 0
    End If
End Function


Public Sub TestLogging()
    getLogger(True).logINFO "ABC123"
End Sub


Function getLogger(Optional reset As Boolean = False) As logger
    
    If p_logger Is Nothing Then
        Set p_logger = New logger
        p_logger.init "Globals"
    Else
        If reset Then
            p_logger.reset
        End If
    End If
    
    Set getLogger = p_logger
End Function


' Versucht ein Objekt zu als ein String auszudrücken. Es wird der Typename genutzt
' und wenn die Eigenschaft .name vorhanden ist, dann wird diese in Klammern dahinter gepackt
'
' Wenn man es mit einem Shape aufruft : "Shape(Shape Name)"
' Wenn man es mit Boundingbox aufruft: "Boundingbox"
Function objectToStringUsingName(obj As Variant) As String
    
    If obj Is Nothing Then
        objectToStringUsingName = "Nothing"
    Else
        objectToStringUsingName = TypeName(obj)
    End If
    
    On Error Resume Next
    objectToStringUsingName = objectToStringUsingName & "(" & obj.name & ")"
    On Error GoTo 0
    
End Function


Function getUserName() As String
    On Error GoTo NameError
    getUserName = Environ("Username")
    On Error GoTo 0
    Exit Function
NameError:
    getUserName = "NameError"
End Function


Function joinCollection(coll As collection, Optional delimiter As String = "") As String
    
    For i = 1 To coll.count
        joinCollection = joinCollection & IIf(i = 1, "", delimiter) & coll(i)
    Next i
    
End Function


Public Function addStringWithDelimiterIfNeeded(baseString As String, stringToAdd As String, Optional delimiter As String = ", ") As String
    
    addStringWithDelimiterIfNeeded = baseString & IIf(Len(baseString) = 0, "", delimiter) & stringToAdd
    
End Function


Function stringArrayToString(arr() As String) As String
    
    If IsEmpty(arr) Then
        stringArrayToString = "Null"
    End If
    
    stringArrayToString = "["
    For i = LBound(arr) To UBound(arr)
        stringArrayToString = addStringWithDelimiterIfNeeded(stringArrayToString, arr(i)) ' stringArrayToString & IIf(i = LBound(arr), "", ", ") & arr(i)
    Next i
    stringArrayToString = stringArrayToString & "]"
    
End Function
    

Function collectionToString(ByVal coll As collection, Optional ByVal tabCount As Integer = 0) As String
    
    If coll Is Nothing Then
        collectionToString = "Nothing"
        Exit Function
    End If
    
    
    collectionToString = tabs(tabCount) & "Collection["
    For i = 1 To coll.count
        Dim currentItemName As String
        
        If TypeName(coll.item(i)) = "String" Then
            currentItemName = coll.item(i)
        ElseIf TypeOf coll.item(i) Is collection Then
            currentItemName = collectionToString(coll.item(i), tabCount + 1)
        ElseIf TypeName(coll.item(i)) = "Long" Or TypeName(coll.item(i)) = "Integer" Then
            currentItemName = coll.item(i)
        Else
            currentItemName = TypeName(coll.item(i))
        End If
        
        collectionToString = collectionToString & IIf(i = 1, "", ", ") & vbNewLine & tabs(tabCount + 1) & currentItemName
        
    Next i
    collectionToString = collectionToString & vbNewLine & tabs(tabCount) & "]"
End Function

Function rectToString(rect As rect) As String
    
    rectToString = "Rect[l:" & rect.left & ",r:" & rect.Right & ",t:" & rect.top & ",b:" & rect.Bottom & "]"
    
End Function



'Function dictionaryToString(dictionary As dictionary) As String
'
'
'
'End Function


Function removePercentPlaceholder(ByVal str As String) As String
    
    Dim percentStartIndex As Integer
    percentStartIndex = -1
    
    While InStr(str, "%")
        For i = 1 To Len(str)
            If Mid(str, i, 1) = "%" Then
                
                If percentStartIndex = -1 Then
                    percentStartIndex = i
                Else
                    percentStartIndex = -1
                    
                    Dim beforePercent As String
                    If percentStartIndex > 0 Then
                        beforePercent = Mid(str, 1, percentStartIndex - 1)
                    End If
                    
                    Dim afterPercent As String
                    If i < Len(str) Then
                        afterPercent = Mid(str, i + 1, Len(str) - i)
                    End If
                    
                    str = beforePercent & afterPercent
                    i = 10000 ' Break
                End If
                
            End If
        Next i
        
        ' Falls es nur ein Prozentzeichen gibt, und deshalb kein 2. gefunden wurde.
        ' Dann muss beendet werden, ansonsten würde man in der While für immer feststecken :,(
        If Not percentStartIndex = -1 Then
            GoTo ExitWhile
        End If
    Wend
    
ExitWhile:
    removePercentPlaceholder = str
    
End Function

Public Sub TestRemovePercentPlaceholder()
    
    Dim str As String
'    str = "hallo%test%123"
    str = "hallo%test%123%test%"
    
    MsgBox str & ": " & removePercentPlaceholder(str)
    
End Sub



Function RoundUp(ByVal value As Double)
    If Int(value) = value Then
        RoundUp = value
    Else
        RoundUp = Int(value) + 1
    End If
End Function


Public Sub TestSplitStringInParts()
    MsgBox collectionToMultiLineStr(splitStringInParts("12345678", 3))
End Sub

Public Function splitStringInParts(str As String, partLength As Integer) As collection
    
    Set splitStringInParts = New collection
    
    Dim partCountDouble As Double
    partCountDouble = CDbl(Len(str)) / partLength
    
    Dim partCount As Integer
    partCount = RoundUp(partCountDouble)
    
    Dim lastPartLenght As Integer
    lastPartLenght = CDbl(Len(str)) Mod partLength
    
    For i = 1 To partCount
        splitStringInParts.add Mid(str, (i - 1) * partLength + 1, IIf(i = partCount, lastPartLenght, partLength))
    Next i
    
End Function



Public Function stringToAsciiNrCollection(str As String, Optional asciiWide As Boolean = False) As collection
    
    Set stringToAsciiNrCollection = New collection
    
    For i = 1 To Len(str)
        Dim ascVar As Long
    
        If asciiWide Then
            ascVar = AscW(Mid(str, i, 1))
        Else
            ascVar = Asc(Mid(str, i, 1))
        End If
        
        stringToAsciiNrCollection.add ascVar
    Next i
    
End Function




' Achtung: Wenn die DPI-Zahl nicht angegeben wird (-1), wird nicht die DPI-Zahl des geladenen Bildes verwendet, sondern die DPI-Zahl des aktuellen Dokuments, in welches das Bild geladen wird
Public Function scaleImageFile(filePath As String, Optional width As Integer = -1, Optional height As Integer = -1, Optional scalee As Double = 1, Optional DPI As Integer = -1, _
        Optional biggestSideSize As Double = -1, Optional smallestSideSize As Double = -1)
    
    Dim imageFile As shape
    Set imageFile = Globals.load(filePath)
    
    If Not biggestSideSize = -1 Then
        If ActiveSelection.SizeWidth > ActiveSelection.SizeHeight Then
            width = biggestSideSize
        Else
            height = biggestSideSize
        End If
    End If
    
    If Not smallestSideSize = -1 Then
        If ActiveSelection.SizeWidth < ActiveSelection.SizeHeight Then
            width = smallestSideSize
        Else
            height = smallestSideSize
        End If
    End If
    
    
    If width = -1 Then
        If height = -1 Then
            height = ActiveDocument.FromUnits(ActiveSelection.SizeHeight, cdrPixel) * scalee
        End If
        width = height * (ActiveSelection.SizeWidth / ActiveSelection.SizeHeight)
    ElseIf height = -1 Then
        width = ActiveDocument.FromUnits(ActiveSelection.SizeWidth, cdrPixel) * scalee
        height = width * (ActiveSelection.SizeHeight / ActiveSelection.SizeWidth)
    End If
    
    
    If DPI = -1 Then
        DPI = ActiveDocument.resolution
    End If
    
    
    Dim fileType As cdrFilter
    If endsWith(filePath, ".cdr") Then
        fileType = cdrCDR
    ElseIf endsWith(filePath, ".png") Then
        fileType = cdrPNG
    ElseIf endsWith(filePath, ".jpg") Or endsWith(filePath, ".jpeg") Then
        fileType = cdrJPEG
    ElseIf endsWith(filePath, ".svg") Then
        fileType = cdrSVG
    End If
    
    
    Dim folderFileAndType() As String
    folderFileAndType = Globals.getFolderFileAndType(filePath)
    
    
    newShapeExport(ActiveSelectionRange, folderFileAndType(0) & folderFileAndType(1), fileType) _
        .setWidth(width) _
        .setHeight(height) _
        .setResolutionX(DPI) _
        .setResolutionY(DPI) _
        .setColorizeRDGWhiteToRGB(False) _
        .setColorizeCMYKBlackToRGB(False) _
        .export
    
    imageFile.delete
    
End Function




' "roundToDividedBy" rundet zusätzlich zu einer Stelle die sich durch die Teilung von 1 durch "roundToDividedBy" ergibt.
' Wenn man z.B. die Zahl 1,6 hat und "numDigitsAfterDecimal" = 1 ist und "roundToDividedBy" = 2 ist,
' dann würde 1/"roundToDividedBy"(2) = 0.5 ergeben. Deshalb würde 1,6 zu 1,5 werden oder 2,1 zu 2
' ist "roundToDividedBy" = 2 wird also noch zusätzlich auf halbe gerundet, ist "roundToDividedBy" = 4 wird auf viertel gerundet
Public Function round(ByVal number As Double, Optional numDigitsAfterDecimal As Long, Optional roundToDividedBy As Integer = -1) As Double
    If roundToDividedBy > 1 Then
        number = number * roundToDividedBy
    End If
    number = Math.round(number, max(numDigitsAfterDecimal - IIf(roundToDividedBy > 1, 1, 0), 0))
    If roundToDividedBy > 1 Then
        number = number / roundToDividedBy
    End If
    
    round = number
End Function

Public Sub TestRound()
    
'    MsgBox round(1.61111, 1, 2) ' Muss 1,5 ergeben
'    MsgBox round(1.61111, 1, 3) ' Muss 1,66666666666667 ergeben
'    MsgBox round(1.71111, 1, 4) ' Muss 1,75 ergeben
    MsgBox round(1.071111, 2, 4) ' Muss 1,075 ergeben
    
End Sub


Public Function RoundIfCloseToInteger(ByVal value As Double, Optional doubleRoundTolerance As Double = -1) As Double
    
    Dim roundedValue As Double
    roundedValue = round(value, 0)
    
    If doubleRoundTolerance = -1 Then doubleRoundTolerance = DOUBLE_ROUND_TOLERANCE
    
    If Abs(value - roundedValue) <= doubleRoundTolerance Then
        RoundIfCloseToInteger = roundedValue
    Else
        RoundIfCloseToInteger = value
    End If
    
End Function


' Musste gemacht werden, da VBA einmal die normale 'replace' Funktion nicht erkannt hatte
Public Function Replace2(a, b, c) As String

    Replace2 = replace(a, b, c)

End Function


Public Sub TestReplaceWord()
    
    MsgBox "replaceWord: " & replaceWord("Hallo 789 was geht?", 7, 9, "du")
    
'    MsgBox "replaceWord: " & replaceWord("1234 was geht?", 1, 4, "du")
End Sub


Public Function replaceWord(ByVal text As String, replaceStartIndex As Integer, replaceEndStartIndex As Integer, replacerWord As String) As String
    If Not replaceStartIndex - 1 < 1 Then replaceWord = Mid(text, 1, replaceStartIndex - 1)
    replaceWord = replacerWord & Mid(text, replaceEndStartIndex + 1, Len(text))
End Function

Public Sub TestGetWords()
    
    Dim words As collection
    Set words = getWords("Was geht?Du    Typ")
    
    Dim result As String
    
    Dim wordsAsString As New collection
    
    For i = 1 To words.count
        Dim word As StringWord
        Set word = words(i)
        
        wordsAsString.add word.text
        
        Set word = Nothing
    Next i
    
    MsgBox "getWords: " & vbNewLine & Globals.collectionToMultiLineStr(wordsAsString, "'", "'")
    
End Sub



Public Function getWords(ByVal text As String) As collection ', ParamArray charsCreatingOwnWord() As Variant) As collection
    
    Dim words As New collection
    
    Dim wordStart As Integer
    wordStart = -1
    For i = 1 To Len(text) + 1
        
        Dim charr As String
        charr = getCharOfStringOrNothing(text, i)
        
        Dim isLastChar As Boolean
        isLastChar = i = Len(text) + 1
        
        
        If isCharWordSplitter(charr) Or isLastChar Then ' Or isCharCreatingOwnWord Then
            If Not wordStart = -1 Then
                Dim wordEnd As Integer
                wordEnd = i
                
                wordEnd = wordEnd - 1 ' Das Wort endete schon ein Zeichen davor, denn das aktuelle Zeichen ist ja ein anderes
                
                Dim wordd As New StringWord
                wordd.begin = wordStart
                wordd.ending = wordEnd
                wordd.parentString = text
                words.add wordd
                
                wordStart = -1 ' Reset
                Set wordd = Nothing
            End If
        
        Else
            If wordStart = -1 Then wordStart = i
        End If
        
    Next i
    
    Set getWords = words
    
End Function


Public Function isCharWordSplitter(char As String) As Boolean
    isCharWordSplitter = char = " " Or char = "," Or char = ":" Or char = ";" Or char = "-"
End Function



Public Function isCharLetter(char As String) As Boolean
    isCharLetter = char Like "[A-Za-z]"
End Function


Public Function subStrWithStrings(str As String, fromStr As String, toStr As String, Optional fromOffset As Integer = 0, Optional toOffset As Integer = 0) As String
    Dim leftPart As String
    leftPart = left(str, InStr(str, toStr) - 1 + toOffset)
    subStrWithStrings = Right(leftPart, Len(leftPart) - InStr(str, fromStr) - Len(fromStr) + 1 - fromOffset)
End Function


Public Sub TestSubStr()
    MsgBox "subStr: '" & subStr("12Hallo89", 3, 7) & "'" ' Ergebnis sollte 'Hallo' sein
End Sub

Public Function subStr(str As String, from As Integer, too As Integer) As String
    Dim lenght As Integer
    lenght = too - from
    
    If lenght < 0 Then
        subStr = ""
        Exit Function
    End If
    
    If from < 1 Then from = 1
    If too > Len(str) Then too = Len(str)
    
    subStr = Mid(str, from, too - from + 1)
End Function


Public Sub TestsubStrWithStrings()
    
    Dim testtt As String
'    testtt = subStrWithStrings("Hallo (123) was geht ahahahhaaaaabbbbbb ?", "(", ")") ' Sollte "123" rauskommen
    testtt = subStrWithStrings("Brandzeichen ddddddesVar(1)))) Blalalalla", "ddddddesVar(", "))))", -1, 1) ' Sollte "(1)" rauskommen
    
    MsgBox testtt
End Sub



' Groß/Kleinschreibung wird nicht beachtet
Public Function endsWith(ByVal str As String, ByVal ending As String) As Boolean
     Dim endingLen As Integer
     endingLen = Len(ending)
     endsWith = (Right(Trim(UCase(str)), endingLen) = UCase(ending))
End Function



' Groß/Kleinschreibung wird nicht beachtet
Public Function startsWith(ByVal str As String, ByVal theStart As String) As Boolean
     Dim startLen As Integer
     startLen = Len(theStart)
     startsWith = (left(Trim(UCase(str)), startLen) = UCase(theStart))
End Function




Public Function removeLineBreaks(str As String) As String
    removeLineBreaks = replaceLineBreaks(str, "")
End Function



Public Function replaceLineBreaks(str As String, replaceWith As String) As String
    replaceLineBreaks = str
    replaceLineBreaks = replace(replaceLineBreaks, vbCr, replaceWith)
    replaceLineBreaks = replace(replaceLineBreaks, vbCrLf, replaceWith)
    replaceLineBreaks = replace(replaceLineBreaks, vbLf, replaceWith)
    replaceLineBreaks = replace(replaceLineBreaks, vbNewLine, replaceWith)
End Function



Public Function addOrRemoveNameFromSelectedShape(name As String, Optional allowAdd As Boolean = True, Optional allowRemove As Boolean = True)
    
    If ActiveSelectionRange.count > 0 Then
        addOrRemoveNameFromShapes ActiveSelectionRange, name, allowAdd, allowRemove
    End If

End Function


Public Function addOrRemoveNameFromShapes(range As shapeRange, name As String, Optional allowAdd As Boolean = True, Optional allowRemove As Boolean = True)
    
    For i = 1 To range.count
        addOrRemoveNameFromShape ActiveSelectionRange(i), name, allowAdd, allowRemove
    Next i

End Function


' Fügt hinzu oder löscht ein Keyword mit Argumenten wie
' _naming(Sterbedatum)
Public Function addOrRemoveKeywordWithArgumentsToShape(shape As shape, keyWord As String, args As ArrayList, Optional allowAdd As Boolean = True, Optional allowRemove As Boolean = True)

    ' Wenn gelöscht werden soll, dann muss beim Shape geguckt werden, welche Argumente das Keyword beim Shapenamen nutzt.
    ' Denn der gesamte String ist variabel aufgrund der Argumente
    If allowRemove Then
        addOrRemoveNameFromShape shape, keyWord & "(" & getStringGroupContentByStartString(getShapeNameLong(shape), keyWord) & ")", False, True
    End If
    
    If allowAdd Then
        addOrRemoveNameFromShape shape, keyWord & "(" & args.toString(", ") & ")"
    End If
    
End Function


' Wird von Markern genutz wie _locked
' Löscht einen namen im Shape-Namen, wenn er vorkommt und allowRemove True ist
' Fügt einen Namen im Shape-Namen hinzu, wenn er nicht schoon vorhanden und allowAdd True ist
Public Function addOrRemoveNameFromShape(shape As shape, name As String, Optional allowAdd As Boolean = True, Optional allowRemove As Boolean = True)

    If (Not shape.name = "") And InStr(getShapeNameLong(shape), name) Then
        If allowRemove Then
            setShapeNameLong shape, removeNameFromShapeName(getShapeNameLong(shape), name)
        End If
    Else
        If allowAdd Then
            setShapeNameLong shape, getShapeNameLong(shape) & "_" & name
        End If
    End If
    
End Function



Public Function removeNameFromShapeName(ByVal shapeName As String, nameToRemove As String) As String
    shapeName = replace(shapeName, "_" & nameToRemove, "")
    shapeName = replace(shapeName, nameToRemove, "")
    
    removeNameFromShapeName = shapeName
End Function



Public Function removeKeywordsFromName(name As String) As String
    ' Keywords entfernen
    For i = 1 To Globals.getAllKeyWords.count
        name = Globals.removeNameFromShapeName(name, Globals.getAllKeyWords(i))
    Next i
    
    removeKeywordsFromName = name
End Function

' Wenn man den Namen einer Form mittels shape.name = ändert, sind nur 72 Zeichen erlaubt
' Mit dieser Funktion sind viiel mehr Zeichen erlaubt
Public Function setShapeNameLong(shape As shape, name As String)
    shape.ObjectData("Name").value = name
End Function


Public Sub TestGetShapeNameLong()
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    MsgBox Globals.getShapeNameLong(ActiveShape)
End Sub


Public Function getShapeNameLong(shape As shape) As String
    If shape.ObjectData("Name").value > shape.ObjectData("Name").FormattedValue Then
        getShapeNameLong = shape.ObjectData("Name").value
    Else
        getShapeNameLong = shape.ObjectData("Name").FormattedValue
    End If
    
    If getShapeNameLong = "" Then getShapeNameLong = shape.name
End Function


Public Sub TestGetObjectData()
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    Dim shape As shape
    Set shape = ActiveShape
    
    Globals.getLogger True
    
    For i = 1 To shape.ObjectData.count
        Globals.getLogger.logINFO "elementName: '" & shape.ObjectData(i).DataField.elementName & "'"
        Globals.getLogger.logINFO "name: '" & shape.ObjectData(i).DataField.name & "'"
        Globals.getLogger.logINFO "Value: '" & shape.ObjectData(i).value & "'"
        Globals.getLogger.logINFO "FormattedValue: '" & shape.ObjectData(i).FormattedValue & "'"
        Globals.getLogger.logINFO ""
    Next i
End Sub


Public Function getShapeNameOrNull(shape As shape) As String
    If Not shape Is Nothing Then
        If Globals.isShapeReferenceValid(shape) Then
            getShapeNameOrNull = shape.name
        End If
    End If
End Function


Public Function addNameToShapeRange(range As shapeRange, name As String)
    For i = 1 To range.count
        range(i).name = range(i).name & name
    Next i
End Function



Public Function max(x, y As Variant) As Variant
    max = IIf(x > y, x, y)
End Function



Public Function min(x, y As Variant) As Variant
   min = IIf(x < y, x, y)
End Function


Public Function splitLastDigits(str As String) As String()
    
    Dim firstDigit As Integer
    
    For i = Len(str) To 1 Step -1
        Dim c As String
        c = Mid(str, i, 1)
        
        If Not IsNumeric(c) Then
            firstDigit = i + 1
           GoTo ExitFor
        End If
    Next i
    
ExitFor:

    
    Dim strArr(0 To 1) As String
    
    
    If firstDigit <= Len(str) Then
        strArr(0) = left(str, firstDigit - 1) ' ERROR wenn man eine zahl eingibt ins erste Feld !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        strArr(1) = Right(str, Len(str) - firstDigit + 1)
    Else
        strArr(0) = str
    End If
    
    splitLastDigits = strArr
End Function


Public Function removeCharFromStringStartAndOrEnd(ByVal str As String, removeStr As String, fromStart As Boolean, fromEnd As Boolean) As String
    
    If fromStart Then
        If startsWith(str, removeStr) Then
            str = Right(str, Len(str) - Len(removeStr))
        End If
    End If
    
    If fromEnd Then
        If endsWith(str, removeStr) Then
            str = left(str, Len(str) - Len(removeStr))
        End If
    End If
    
    removeCharFromStringStartAndOrEnd = str
    
End Function



Public Sub TestSplitFirstNumbers()
    Dim result() As String
    'result = splitFirstNumbers("123Hallo")
    result = splitFirstNumbers("40")
    MsgBox Globals.stringArrayToString(result)
End Sub


' Splittet "123Hallo" zu "123" und "Hallo"
Public Function splitFirstNumbers(str As String, Optional allowComma As Boolean = True, Optional allowDot As Boolean = True) As String()
    
    Dim result(0 To 1) As String
    
    For i = 1 To Len(str)
        
        If Not (isCharForNumberAllowed(Mid(str, i, 1), allowComma, allowDot)) Then
            If i = 1 Then ' Keine Zahl gefunden
                result(0) = ""
                result(1) = str
                GoTo ReturnResult
            Else
                result(0) = left(str, i - 1)
                result(1) = Right(str, Len(str) - (i - 1))
                GoTo ReturnResult
            End If
            
        End If
        
    Next i
    
    ' Falls alle Zeichen numerisch waren
    result(0) = str
    
ReturnResult:
    splitFirstNumbers = result
End Function




Private Function isCharForNumberAllowed(char As String, Optional allowComma As Boolean = True, Optional allowDot As Boolean = True)
    
    If allowComma And char = "," Then GoTo IsTrue
    If allowDot And char = "." Then GoTo IsTrue
    If IsNumeric(char) Then GoTo IsTrue
    
    
    Exit Function ' False
IsTrue:
    isCharForNumberAllowed = True
End Function



Public Sub TestSplitLastNumbers()
    Dim result() As String
'    result = splitLastNumbers("Hallo123")
    result = splitFirstNumbers("40")
    MsgBox Globals.stringArrayToString(result)
End Sub

' Splittet "Hallo123" zu "123" und "Hallo"
Public Function splitLastNumbers(str As String, Optional allowComma As Boolean = True, Optional allowDot As Boolean = True) As String()
    
    Dim result(0 To 1) As String
    
    For i = Len(str) To 1 Step -1
        
        If Not (isCharForNumberAllowed(Mid(str, i, 1), allowComma, allowDot)) Then
            If i = Len(str) Then ' Keine Zahl gefunden
                result(0) = ""
                result(1) = str
                GoTo ReturnResult
            Else
                result(0) = Right(str, (Len(str) - i))
                result(1) = left(str, i)
                GoTo ReturnResult
            End If
            
        End If
        
    Next i
    
    ' Falls alle Zeichen numerisch waren
    result(0) = str
    
ReturnResult:
    splitLastNumbers = result
    
End Function


Public Function getLeftNumber(str As String, Optional allowComma As Boolean = True, Optional allowDot As Boolean = True, Optional asDoubleOrString As Boolean = True) As String
    
    Dim numberStr As String
    numberStr = splitFirstNumbers(str, allowComma, allowDot)(0)
    
    If asDoubleOrString Then numberStr = replace(numberStr, ".", ",") ' Damit die Zahl später zu einem Double gecastet werden kann, dürfen keine Punkte sondern nur Kommas vorkommen
    
    If numberStr = "" Then
        getLeftNumber = -1
    Else
         ' Bei einem Double können nur noch Kommas vorkommen, da Punkte weiter oben im Code gegen Kommas getauscht wurden
        numberStr = removeCharFromStringStartAndOrEnd(numberStr, ",", True, True)
        If Not asDoubleOrString Then numberStr = removeCharFromStringStartAndOrEnd(numberStr, ".", True, True)
        
        If asDoubleOrString Then
            getLeftNumber = CDbl(numberStr)
        Else
            getLeftNumber = numberStr
        End If
    End If
    
End Function


Public Function getRightNumber(str As String, Optional allowComma As Boolean = True, Optional allowDot As Boolean = True, Optional asDoubleOrString As Boolean = True) As Variant
    
    Dim numberStr As String
    numberStr = splitLastNumbers(str, allowComma, allowDot)(0)
    
    If asDoubleOrString Then numberStr = replace(numberStr, ".", ",") ' Damit die Zahl später zu einem Double gecastet werden kann, dürfen keine Punkte sondern nur Kommas vorkommen
    
    If numberStr = "" Then
        getRightNumber = -1
    Else
        
        ' Bei einem Double können nur noch Kommas vorkommen, da Punkte weiter oben im Code gegen Kommas getauscht wurden
        numberStr = removeCharFromStringStartAndOrEnd(numberStr, ",", True, True)
        If Not asDoubleOrString Then numberStr = removeCharFromStringStartAndOrEnd(numberStr, ".", True, True)
        
        If asDoubleOrString Then
            getRightNumber = CDbl(numberStr)
        Else
            getRightNumber = numberStr
        End If
    End If
    
End Function


Public Sub TestGetSizeFromString()
    
'    MsgBox "getSizeFromString: " & getSizeFromString("xMaximum 20  X  30 Test x abcx 4x4") ' Ergebniss sollte sein: 20x30
'    MsgBox "getSizeFromString: " & getSizeFromString("4x4xMaximum 20  X  30 Test x abcx 4x4") ' Ergebniss sollte sein: 4x4
'    MsgBox "getSizeFromString: " & getSizeFromString("Test x abcx 4x4") ' Ergebniss sollte sein: 4x4
'    MsgBox "getSizeFromString: " & getSizeFromString("xMaximum245X345Testxabc") ' Ergebniss sollte sein: 245x345
    
'    MsgBox "getSizeFromString: " & getSizeFromString("ca. 30x20,5") ' PROBLEM !!
    
'    MsgBox "getSizeFromString: " & getSizeFromString("A4")
    MsgBox "getSizeFromString: " & getSizeFromString("30x20 (28x18)", , True) ' Sollte "30x20(28x18)" ergeben
    
'    MsgBox "getSizeFromString: " & getSizeFromString("123,456x789.22") ' Ergebniss sollte sein: 123,456x789,22
    
'    MsgBox "getSizeFromString: " & getSizeFromString("ca. 29,3 x 13,2 cm") ' Ergebniss sollte sein: 29,3x13,2
    
'    MsgBox "getSizeFromString: " & getSizeFromString("Keine Größe im Text vorhanden!") ' Ergebniss sollte sein: ""
    
    MsgBox "getSizeFromString: " & getSizeFromString("20x30 cm (Empfohlen)")
    
    ' FALSCH
'    MsgBox "getSizeFromString: " & getSizeFromString("128 ist die Größe") ' Ergebniss sollte sein: 128
'    MsgBox "getSizeFromString: " & getSizeFromString("Die Größe ist 128") ' Ergebniss sollte sein: 128
'    MsgBox "getSizeFromString: " & getSizeFromString("Die Größe ist 128 glaube ich") ' Ergebniss sollte sein: 128
    
End Sub



Public Function getSizeFromString(ByVal str As String, Optional allowShapeName As Boolean = False, Optional allowSecondSizeInBrackets As Boolean = False) As String
    
    ' Alle Zeichen klein machen, damit es kein kleines und großes X gibt
    str = LCase(str)
    
    Dim originalStringLCase As String
    originalStringLCase = str
    
    str = removeWhiteSpace(str)
    
    Dim xIndexies As collection
    Set xIndexies = inStrMulti(1, str, "x")
    
    If Not xIndexies.count = 0 Then
        
        For i = 1 To xIndexies.count
            ' Vorher prüfen, ob das aktuelle X nicht am Anfang oder Ende steht
            If xIndexies(i) > 1 And (Len(str) >= xIndexies(i) + 1) Then
                
                ' Wenn die Zeichen vor dem X und nach dem X eine Zahl sind, dann haben wir das passende X mit der Größe gefunden
                If IsNumeric(Mid(str, xIndexies(i) - 1, 1)) And IsNumeric(Mid(str, xIndexies(i) + 1, 1)) Then
                    getSizeFromString = getRightNumber(Mid(str, 1, xIndexies(i) - 1), , , False)
                    getSizeFromString = getSizeFromString & "x"
                    getSizeFromString = getSizeFromString & getLeftNumber(Mid(str, xIndexies(i) + 1, Len(str) - (xIndexies(i))), , , False)
                    GoTo SizeFound  ' Gefunden
                End If
                
            End If
        Next i
        
    End If
    
SizeFound:
    
    ' Zweite Größe innerhalb von Klammer suchen.
    ' Zb: 28x18(30x20)
    ' 30x20 ist dann die zweite Größe die wir suchen
    If allowSecondSizeInBrackets Then
        
        Dim matcher As RegexMatcher
        Set matcher = newRegexMatcher.SetPattern("\((\d+x\d+)\)").SetIgnoreCase(True)
        
        If matcher.Test(str) Then
            getSizeFromString = getSizeFromString & "(" & matcher.Execute(str).getMatchGroupAsString & ")"   ' Erste Gruppe im ersten Match
            GoTo ExitFunction ' Gefunden
        End If

    End If
    
    
    
    ' DIN-A Größen suchen
    ' -------------------------------
    Dim aIndexies As collection
    Set aIndexies = inStrMulti(0, str, "a")
    
    If Not aIndexies.count = 0 Then
        
        For i = 1 To aIndexies.count
            ' Vorher prüfen, ob das aktuelle A nicht am Anfang oder Ende steht
            If (Len(str) >= aIndexies(i) + 1) Then
                
                ' Wenn das Zeichen nach dem A eine Zahl ist, dann haben wir das passende A mit der Größe gefunden. z.B: "A4"
                If IsNumeric(Mid(str, aIndexies(i) + 1, 1)) Then
                    getSizeFromString = "A" & Mid(str, aIndexies(i) + 1, 1)
                    GoTo ExitFunction ' Gefunden
                End If
            End If
                
        Next i
    End If
    ' -------------------------------
    
    
    
    
    
    
ExitFunction:

    ' Formname hinzufügen
    ' (Kam zuerst bei den Edelstahl Türschildern vor)
    ' ----------------------------
    If allowShapeName Then
        ' Formnamen, die auf Amazon genutzt werden
        Dim shapeNames As New collection
        shapeNames.add "Oval"
        shapeNames.add "abgerundete Ecken"
        shapeNames.add "abgerundete Seiten"
        
        For i = 1 To shapeNames.count
            If InStr(originalStringLCase, LCase(shapeNames(i))) Then
                getSizeFromString = getSizeFromString & " " & shapeNames(i)
                Exit For
            End If
        Next i
    End If
    ' ----------------------------
    
End Function




' Achtung: Hier wird davon ausgegangen, dass die Größen durch die 'getSizeFromString' ermittelt wurden
' Also dass es Strings sind, die nur die Größe enthalten
Public Function isSizeAspectRatioSame(sizeA As String, sizeB As String, Optional tollerance As Double = 0#)

    ' Wenn beides Din-A Formate sind, dann haben sie (automatisch) das selbe Seitenverhältnis
    If isDinASize(sizeA) Then
        isSizeAspectRatioSame = isDinASize(sizeB)
        Exit Function
    ElseIf isDinASize(sizeB) Then
        Exit Function
    End If

    Dim aspectRatioA As Double
    aspectRatioA = getAspectRatioOfSize(sizeA)

    Dim aspectRatioB As Double
    aspectRatioB = getAspectRatioOfSize(sizeB)

    isSizeAspectRatioSame = Abs(aspectRatioA - aspectRatioB) <= tollerance

End Function


' Achtung: Hier wird davon ausgegangen, dass die Größe durch die 'getSizeFromString' ermittelt wurde
' Also dass es ein String ist, die nur die Größe enthält
Public Function isDinASize(size As String) As Boolean
    isDinASize = startsWith(size, "A")
End Function


Public Function getAspectRatioOfSize(size As String) As Double
    
    Dim dimensions() As String
    dimensions = getWidthAndHeightOfSize(size)

    getAspectRatioOfSize = CDbl(dimensions(1)) / CDbl(dimensions(2))

End Function


Public Sub TestGetWidthAndHeightOfSize()
    
    Dim dimensions() As String
'    dimensions = getWidthAndHeightOfSize("30x20")
    dimensions = getWidthAndHeightOfSize(Globals.getSizeFromString("Größe: 15x10 cm"))
    
    MsgBox "Breite: " & dimensions(1) & ", Höhe: " & dimensions(2)
    
End Sub



Public Function getWidthAndHeightOfSize(size As String) As String()
    
    Dim dimensions(2) As String

    dimensions(1) = getWidthOfSize(size)
    dimensions(2) = getHeightOfSize(size)
    
    getWidthAndHeightOfSize = dimensions
    
End Function


Public Sub TestGetDinANumber()
    MsgBox "getDinANumber: " & getDinANumber("Din A4 ist gut")
End Sub


Public Function getDinANumber(size As String) As Integer
    getDinANumber = newRegexMatcher.SetPattern("\bA\s*((?:[0-9]|10))\b").Execute(size).getMatchGroupAsInt(-1)
End Function


' Größe wird in Millimeter angegeben
Public Function getDinASize(dinANumber As Integer) As Vector
    Dim result As New Vector
    
    Select Case dinANumber
        Case 0
            result.x = 841
            result.y = 1189
        Case 1
            result.x = 594
            result.y = 841
        Case 2
            result.x = 420
            result.y = 594
        Case 3
            result.x = 297
            result.y = 420
        Case 4
            result.x = 210
            result.y = 297
        Case 5
            result.x = 148
            result.y = 210
        Case 6
            result.x = 105
            result.y = 148
        Case 7
            result.x = 74
            result.y = 105
        Case 8
            result.x = 52
            result.y = 74
    End Select
    
    Set getDinASize = result
End Function


' Achtung: Hier wird davon ausgegangen, dass die Größe durch die 'getSizeFromString' ermittelt wurde
' Also dass es ein String ist, die nur die Größe enthält
Public Function getWidthOfSize(size As String) As String
    
    Dim result As String
    
    size = LCase(size)

    Dim xPos As Integer
    xPos = InStr(size, "x")


    If xPos > 0 Then
        ' Vorher prüfen, ob das aktuelle X nicht am Anfang oder Ende steht
        If xPos > 1 And (Len(size) >= xPos + 1) Then
            result = getLeftNumber(Mid(size, 1, xPos - 1))
        End If
    End If
    
    If result = "" Then
        
        Dim dinAVector As Vector
        Set dinAVector = getDinASize(getDinANumber(size))
        If Not dinAVector.x = 0 Then
            result = dinAVector.x
        End If
    End If
    
    getWidthOfSize = result
End Function

' Achtung: Hier wird davon ausgegangen, dass die Größe durch die 'getSizeFromString' ermittelt wurde
' Also dass es ein String ist, die nur die Größe enthält
Public Function getHeightOfSize(size As String) As String
    
    Dim result As String
    
    size = LCase(size)

    Dim xPos As Integer
    xPos = InStr(size, "x")


    If xPos > 0 Then
        ' Vorher prüfen, ob das aktuelle X nicht am Anfang oder Ende steht
        If xPos > 1 And (Len(size) >= xPos + 1) Then
            result = getRightNumber(Mid(size, xPos + 1, Len(size) - (xPos)))
        End If
    End If
    
    If result = "" Then
        
        Dim dinAVector As Vector
        Set dinAVector = getDinASize(getDinANumber(size))
        If Not dinAVector.y = 0 Then
            result = dinAVector.y
        End If
    End If
    
    getHeightOfSize = result
End Function





Public Function getGroundplateNameBeautiful(name As String, Optional convertUnderScoreToSpace As Boolean = True) As String
    
    getGroundplateNameBeautiful = replace(name, "_Grundplatte", "")
    getGroundplateNameBeautiful = replace(getGroundplateNameBeautiful, ">", "")
    If convertUnderScoreToSpace Then getGroundplateNameBeautiful = replace(getGroundplateNameBeautiful, "_", " ")
    
End Function


Public Sub TestInStrMulti()
    MsgBox "inStrMulti: " & Globals.collectionToString(inStrMulti(, "Maximum 20x30 Test x abc", "x")) ' Ergebniss sollte sein: 3, 11, 20
End Sub


Public Function inStrMulti(Optional theStart As Long = 1, Optional string1 As String, Optional string2 As String, Optional compare As VbCompareMethod = vbBinaryCompare) As collection
    Dim currentIndex As Long
    currentIndex = theStart
    
    Dim results As New collection
    
    currentIndex = InStr(currentIndex + 1, string1, string2, compare)
    
    While Not currentIndex = 0
        
        results.add currentIndex
        
        If currentIndex + 1 < Len(string1) Then
            currentIndex = InStr(currentIndex + 1, string1, string2, compare)
        Else
            GoTo ExitWhile
        End If
    Wend
ExitWhile:
    
    Set inStrMulti = results
End Function

' Gibt die linke Seite eines Strings zurück bis zu der Position wo der String 'toString' vorkommt
' Z.B: str("Hallo123") toString("123") == "Hallo"
Public Function leftToString(str As String, toString As String) As String
    leftToString = left(str, max(InStr(str, toString) - 1, 0))
End Function


Public Function removeWhiteSpace(target As String) As String
    
    removeWhiteSpace = newRegexMatcher.SetPattern("\s").setMultiline(True).setGlobal(True).replace(target, vbNullString)
    
End Function


Public Function castBooleanToString(ByVal bool As Boolean) As String

    If bool Then
        castBooleanToString = "true"
    Else
        castBooleanToString = "false"
    End If
    
End Function


' TODO umbenennen zu CSV
Public Function searchStringInCVSArray(searchString As String, column As Integer, csvArray() As String) As Integer
    
    searchStringInCVSArray = -1
    
    On Error GoTo err_exit
    
    ' Bei 1 anfangen, da der Header ignoriert wird
    For i = 1 To UBound(csvArray)
        'MsgBox "Compare " & csvArray(i, column) & " and " & searchString
        If csvArray(i, column) = searchString Then
            searchStringInCVSArray = i
            Exit Function
        End If
    Next i
    
err_exit:
End Function



Public Function ItemExistsInCollection(ByRef target As Variant, _
                                       ByRef container As collection) As Boolean
    Dim candidate As Variant
    Dim found As Boolean
    
    For Each candidate In container
        Select Case True
            Case IsObject(candidate) And IsObject(target)
                found = candidate Is target
            Case IsObject(candidate), IsObject(target)
                found = False
            Case Else
                found = (candidate = target)
        End Select
        If found Then
            ItemExistsInCollection = True
            Exit Function
        End If
    Next
End Function




Public Function collectionToMultiLineStr(col As collection, Optional Prefix As String = "", Optional suffix As String = "") As String

    Dim str As String
    
    'MsgBox "Save collection. item count=" & col.count
    
    For i = 1 To col.count
        str = str & Prefix & col.item(i) & suffix
        
        If i < col.count Then
            str = str & vbNewLine
        End If
    Next i

    collectionToMultiLineStr = str

End Function


Public Function collectionToStringArray(col As collection) As String()
    
    Dim arr() As String
    
    If col.count = 0 Then
        ReDim arr(1 To 1) ' Leeres Array erstellen
    Else
        ReDim arr(1 To col.count) As String
        
        For i = 1 To col.count
            arr(i) = col(i)
        Next i
    End If
    
    collectionToStringArray = arr
End Function


Public Function collectionToShapeRange(col As collection) As shapeRange
    
    Dim sel As New shapeRange
    
    
     For i = 1 To col.count
        sel.add col.item(i)
     Next i
     
     Set collectionToShapeRange = sel
    
End Function


Public Function productDesignLayersToShapeRange(col As collection) As shapeRange
    
    Dim range As New shapeRange
    For i = 1 To col.count
        range.add col(i)
    Next i
    
    Set productDesignLayersToShapeRange = range
End Function


Public Function combineCollections(colA As collection, colB As collection) As collection
    Dim col As New collection
    
    For i = 1 To colA.count
        col.add colA(i)
    Next i
    
    For i = 1 To colB.count
        col.add colB(i)
    Next i
    
    Set combineCollections = col
End Function


Public Function combineCollectionToCollection(fromCol As collection, ByRef toCol As collection)
    
    For i = 1 To fromCol.count
        toCol.add fromCol(i)
    Next i
    
End Function




Public Function collectionContainsOBJ(col As collection, obj As Variant) As Boolean
    
    For i = 1 To col.count
        If col(i) Is obj Then
            collectionContainsOBJ = True
            Exit Function
        End If
    Next i
    
End Function


Public Sub TestCollectionContainsOBJ()
    
    Dim collection As New collection
    
    Dim rect1 As New rect
    rect1.SetRect 0, 0, 100, 200
    
    collection.add rect1 ' Aktiv = True. Inaktiv = False
    collection.add New rect
    
    MsgBox "" & collectionContainsOBJ(collection, rect1)
    
End Sub


Public Function stringCollectionToIntegerCollection(strColl As collection) As collection
    Set stringCollectionToIntegerCollection = New collection
    
    For i = 1 To strColl.count
        stringCollectionToIntegerCollection.add Int(strColl(i))
    Next i
End Function

Public Function stringArrayToCollection(strArray() As String) As collection
    Set stringArrayToCollection = New collection
    
    For i = LBound(strArray) To UBound(strArray)
        stringArrayToCollection.add strArray(i)
    Next i
End Function

Public Function stringParamArrayToCollection(ParamArray strArr() As Variant) As collection
    
    Dim coll As New collection
    
    For i = LBound(strArr) To UBound(strArr)
        
        coll.add strArr(i)
        
    Next i
    
    Set stringParamArrayToCollection = coll
    
End Function

Public Function wordCollectionToStringCollection(words As collection) As collection
    
    Dim coll As New collection
    
    For i = 1 To words.count
        Dim wordd As StringWord
        Set wordd = words(i)
        coll.add wordd.text
        
        Set wordd = Nothing
    Next i
    
    Set wordCollectionToStringCollection = coll
End Function

Public Function wordCollectionToMultiLineStr(words As collection, Optional Prefix As String = "", Optional suffix As String = "") As String
    wordCollectionToMultiLineStr = Globals.collectionToMultiLineStr(Globals.wordCollectionToStringCollection(words), Prefix, suffix)
End Function


' Umleitung
Public Function isStringInCollection(col As collection, searchString As String, Optional searchType As stringSearchType = stringSearchType.StringInside) As Boolean
    isStringInCollection = stringCollectionContains(col, searchString, searchType)
End Function


Public Function getStringIndexInCollection(col As collection, searchString As String, Optional searchType As stringSearchType = stringSearchType.StringInside, Optional ignoreCase As Boolean) As Integer
    For i = 1 To col.count
        If stringCompare(col.item(i), searchString, searchType, ignoreCase) Then
            getStringIndexInCollection = i
            Exit Function
        End If
    Next i
    
    getStringIndexInCollection = -1
End Function


Public Sub TestStringCollectionContains()
    
    Dim coll As New collection
    coll.add "mit Bohrlöchern"
    
    MsgBox "stringCompareStringCollectionToString: " & stringCompareStringCollectionToString(coll, "mit Bohrlöchern (4 Bohrlöcher)", StringInside)
End Sub


Public Function stringCompareStringCollectionToString(col As collection, theString As String, Optional searchType As stringSearchType = stringSearchType.StringInside, Optional ignoreCase As Boolean = False)
    For i = 1 To col.count
        stringCompareStringCollectionToString = stringCompare(theString, col.item(i), searchType, ignoreCase)
    
        If stringCompareStringCollectionToString Then
            Exit Function
        End If
    Next i
End Function


Public Function stringCollectionContains(col As collection, searchString As String, Optional searchType As stringSearchType = stringSearchType.StringInside, Optional ignoreCase As Boolean = False) As Boolean
    For i = 1 To col.count
        stringCollectionContains = stringCompare(col.item(i), searchString, searchType, ignoreCase)
    
        If stringCollectionContains Then
            Exit Function
        End If
    Next i
End Function


Public Function TestGetStringBetweenStrings()
    'MsgBox getStringBetweenStrings("name(Datum)", "name(", ")")
    MsgBox getStringBetweenStrings("name(Datum)", "(", ")")
End Function


Public Function getStringBetweenStrings(str As String, startStr As String, endStr As String)
    
    Dim Startindex As Integer
    Startindex = InStr(str, startStr) + Len(startStr)
    
    Dim endIndex As Integer
    endIndex = InStrRev(str, endStr)
    
    If Not (Startindex = 0 Or endIndex = 0) Then
        getStringBetweenStrings = Mid(str, Startindex, endIndex - Startindex)
    End If
    
End Function

Public Function stringCompare(ByVal str As String, ByVal find As String, ByVal searchType As stringSearchType, Optional ignoreCase As Boolean = False) As Boolean
    
    If ignoreCase And Not searchType = stringSearchType.StringRegex Then ' Beim Regex werden 'str' und 'find' nicht verändert. Dort wird dem Regex direkt 'ignoreCase' weitergegeben
        str = LCase(str)
        find = LCase(find)
    End If
    
    Select Case searchType
        Case stringSearchType.StringInside
            stringCompare = InStr(str, find)
        Case stringSearchType.StringEquals
            stringCompare = (str = find)
        Case stringSearchType.StringStartsWith
            stringCompare = startsWith(str, find)
        Case stringSearchType.StringEndsWith
            stringCompare = endsWith(str, find)
        Case stringSearchType.StringRegex
            regexx.Global = False
            regexx.Pattern = find
            regexx.ignoreCase = ignoreCase ' Direktes weitergeben, ohne 'str' und 'find' zu ändern
            stringCompare = regexx.Test(str)
    End Select
    
End Function


Public Function getStringCollectionContainingString(col As collection, searchString As String, Optional searchType As stringSearchType = stringSearchType.StringInside, Optional ignoreCase As Boolean = False) As collection
    Dim result As New collection
    
    For i = 1 To col.count
        If stringCompare(col.item(i), searchString, searchType, ignoreCase) Then
            result.add col(i)
        End If
    Next i
    
    Set getStringCollectionContainingString = result
    
End Function





Public Function getFilesAndFoldersMatchingString(folderPath As String, searchString As String, Optional searchType As stringSearchType = stringSearchType.StringInside, Optional recursive As Boolean = True, _
    Optional ignoreCase As Boolean, Optional logger As logger) As collection
    
    If Not logger Is Nothing Then logger.addTab , "[Globals.getFilesAndFoldersMatchingString] folderPath:'" & folderPath & "', searchString: '" & searchString & "', searchType: '" & searchType & "', recursive: '" & recursive & "'"
    
    Dim result As New collection
    
    ' Dateien im 'folderPath' prüfen
    Dim files As collection
    Set files = Globals.getFilesInFolder(folderPath, False)
    For i = 1 To files.count
        Dim currFile As String
        currFile = files(i)
        Dim folderFileAndType() As String
        folderFileAndType = Globals.getFolderFileAndType(currFile)
        If Globals.stringCompare(folderFileAndType(1), searchString, searchType, ignoreCase) Then
            result.add files(i)
        End If
        currFile = ""
    Next i
    
    
    Dim folders As New collection
    Set folders = Globals.getFoldersInFolder(folderPath)
    
    For i = 1 To folders.count
        
        If Globals.stringCompare(Globals.getFolderName(folders(i)), searchString, searchType, ignoreCase) Then
            result.add folders(i)
        End If
    
        If recursive Then
            Globals.combineCollectionToCollection getFilesAndFoldersMatchingString(folders(i), searchString, searchType, recursive, ignoreCase), result
        End If
    Next i
    
    Set getFilesAndFoldersMatchingString = result
    If Not logger Is Nothing Then
        logger.logINFO "Returne '" & Globals.collectionToMultiLineStr(getFilesAndFoldersMatchingString) & "'"
        logger.removeTab
    End If
End Function


Public Function replaceFilesOrFoldersNames(paths As collection, search As String, replace As String)
    
    For i = 1 To paths.count
        Dim result As Variant
        result = replaceFileOrFolderName(paths(i), search, replace)
        Globals.changeValueInCollectionAtIndex result, (i), paths
        result = ""
    Next i
    
End Function



Public Function replaceFileOrFolderName(fileOrFolderPath As String, search As String, replace As String) As String
    
    Dim result As String
    
    ' File
    If Globals.isFileOrFolder(fileOrFolderPath) Then
        
        Dim folderFileAndType() As String
        folderFileAndType = Globals.getFolderFileAndType(fileOrFolderPath)
        
        result = Globals.addBackslash(folderFileAndType(0)) ' Ordner
        result = result & Replace2(folderFileAndType(1), search, replace) ' Dateiname
        result = result & folderFileAndType(2) ' Dateityp
        
    ' Folder
    Else
        result = Globals.getParentPath(fileOrFolderPath) & Replace2(Globals.getFolderName(fileOrFolderPath), search, replace)
        
    End If
    
    replaceFileOrFolderName = result
End Function


' Gibt den Char an der Position 'charPos' zurück. Wenn 'charPos' aber außerhalb des String ist, wird ein leerer String zurückgegeben
Public Function getCharOfStringOrNothing(str As String, ByVal charPos As Integer) As String
    
    If charPos < 0 Or charPos > Len(str) Then
        getCharOfStringOrNothing = "" ' Nothing
    Else
        getCharOfStringOrNothing = getCharOfString(str, charPos)
    End If
    
End Function


Public Function getCharOfString(str As String, charPos As Integer) As String
    getCharOfString = Mid(str, charPos, 1)
End Function


Public Function shapesToShapeRange(shapes As shapes) As shapeRange
    Set shapesToShapeRange = shapes.All
End Function

Public Function shapeToShapeRange(ByVal shape As shape) As shapeRange
    Set shapeToShapeRange = New shapeRange
    Globals.safeAddShapeToShapeRange shape, shapeToShapeRange
End Function


Public Function designsToShapeRange(collection As collection) As shapeRange

    Dim range As New shapeRange
    
    For i = 1 To collection.count
        range.add collection(i).getDesignShape
    Next i
    
    Set designsToShapeRange = range
End Function


Public Function designsToShapeCollection(designs As collection) As collection
    
    Dim result As New collection
    
    For i = 1 To designs.count
        Dim currentDesign As productDesign
        Set currentDesign = designs(i)
        
        result.add currentDesign.getDesignShape
        
        Set currentDesign = Nothing
    Next i
    
    Set designsToShapeCollection = result
End Function

Public Function isDesignCollectionHavingProductID(designs As collection, productID As String) As Boolean
    
    Dim currDesign As productDesign
    For i = 1 To designs.count
        Set currDesign = designs.item(i)
        
        If LCase(currDesign.getProductID) = LCase(productID) Then
            isDesignCollectionHavingProductID = True
            Exit Function
        End If
        
        Set currDesign = Nothing
    Next i
    
    
End Function


Public Function ensureShapeRange(ByVal shapeOrRange As Variant) As shapeRange
    
    If TypeOf shapeOrRange Is shape Then
        Set ensureShapeRange = shapeToShapeRange(shapeOrRange)
    Else
        Set ensureShapeRange = shapeOrRange
    End If
    
End Function


'Löscht alle Shapes in der ShapeRange. Danach sind sie nicht mehr in Corel vorhanden
Public Function deleteShapeRangeShapes(range As shapeRange)
    range.delete
End Function


Public Function getKeyByValueFromDictionary(dict As Dictionary, value As String) As Variant

    For i = 1 To dict.count
    
        If StrComp(dict.Items(i), value, vbTextCompare) Then ' Vllt = 0
            getKeyByValueFromDictionary = dict.Items(i)
            Exit Function
        End If
    Next i

    
End Function


' Nutzt Bubblesort. Vorsicht !!! (je mehr Items, desto länger die Sortierung (exponenziell))
' Sortiert [1, 2, 10] wie folgt: [1, 10, 2]
Public Function sortCollection(ByRef collection As collection)


    'Dim vItm As Variant
    Dim i As Long, j As Long
    Dim vTemp As Variant

    For i = 1 To collection.count - 1
        For j = i + 1 To collection.count
            If collection.item(i) > collection.item(j) Then
                'store the lesser item
                vTemp = collection.item(j)
                'remove the lesser item
                collection.Remove j
                're-add the lesser item before the
                'greater Item
                collection.add vTemp, vTemp, i
            End If
        Next j
    Next i

End Function






Public Function reverseCollection(coll As collection)
    
    'Letztes Element muss nicht nach hinten gesetzt werden, nur alle vor ihm, um umgekehrt werden
    For i = coll.count - 1 To 1 Step -1
        Dim temp
        If IsObject(coll(i)) Then
            Set temp = coll(i)
        Else
            temp = coll(i)
        End If
        coll.Remove (i)
        coll.add temp
    Next i
    
End Function


Public Function isCollectionHavingValue(coll As collection, value As Variant) As Boolean
    isCollectionHavingValue = Not getCollectionValueIndex(coll, value) = -1
End Function


Public Function getCollectionValueIndex(coll As collection, value As Variant) As Integer

    For i = 1 To coll.count
    
        'MsgBox "Item=" & dict.Items(i)
            
        If IsObject(coll.item(i)) And IsObject(value) Then
            If coll.item(i) Is value Then
                getCollectionValueIndex = i
                Exit Function
            End If
        Else
            If coll.item(i) = value Then
                getCollectionValueIndex = i
                Exit Function
            End If
        End If
    Next i
    
    getCollectionValueIndex = -1

End Function


Public Function replaceCollectionItem(index As Integer, coll As collection, newItem As Variant)
    
    Dim collectionCountAtStart As Integer
    collectionCountAtStart = coll.count
    
    coll.Remove index
    coll.add newItem
    
    Dim tempColl As New collection
    
    For i = index To collectionCountAtStart - 1
        tempColl.add coll.item(index)
        coll.Remove index
        coll.add tempColl(1)
        tempColl.Remove 1
    Next i
    
    
End Function


Public Function deleteCollectionItem(coll As collection, item As Variant) As Boolean
        
    Dim index As Integer
    index = getCollectionValueIndex(coll, item)
    
    If Not index = -1 Then
        coll.Remove index
        deleteCollectionItem = True
    End If
    
End Function


Public Function deleteShapeRangeShape(range As shapeRange, shape As shape) As Boolean
    
    Dim indexOfShape As Integer
    indexOfShape = range.IndexOf(shape)
    
    If Not indexOfShape = -1 Then
        range.Remove indexOfShape
        deleteShapeRangeShape = True
    End If
    
End Function



Public Function collectionFromValues(ParamArray values() As Variant) As collection
    
    Dim coll As New collection
    For i = LBound(values) To UBound(values)
        coll.add values(i)
    Next i
    
    Set collectionFromValues = coll
End Function



Public Function clearCollection(coll As collection)
    
    For i = coll.count To 1 Step -1
        coll.Remove (i)
    Next i
    
End Function

Public Function changeValueInCollectionAtIndex(newValue As Variant, index As Integer, coll As collection)
    
    coll.Remove index
    addToCollectionAtIndex coll, newValue, index
    
End Function

Public Function addToCollectionIfNotAlready(ByRef coll As collection, newItem As Variant)
    If Not Globals.isCollectionHavingValue(coll, newItem) Then
        coll.add newItem
    End If
End Function

' Index ist 1 basierend
Public Function addToCollectionAtIndex(coll As collection, newItem As Variant, ByVal index As Integer)
    
    Dim tempColl As New collection
    
    ' Alle Elemente ab 'index' in die temporäre Kollektion packen
    For i = index To coll.count
        tempColl.add coll.item(index)
        coll.Remove index
    Next i
    
    coll.add newItem
    
    For i = 1 To tempColl.count
        coll.add tempColl.item(i)
    Next i
    
End Function


Public Function addToDictionaryAtIndex(dict As Dictionary, key, value, ByVal index As Integer)
    If dict Is Nothing Then
        Err.Raise vbObjectError + 513, , "[Globals.addToDictionaryAtIndex] 'dict' ist Nothing "
    End If
    
    Dim tempDict As New Dictionary
    Set tempDict = cloneDictionary(dict)
    
    
    dict.RemoveAll
    
    Dim i As Integer
    i = 1
    For Each dictKey In tempDict
        If i = index Then
            dict.add key, value
        End If
        dict.add dictKey, tempDict(dictKey)
        i = i + 1
    Next dictKey
    
End Function


Public Function getCollectionItemOrNothing(collection As collection, i As Integer) As Variant
    
    If collection Is Nothing Then Exit Function
    If i < 1 Or i > collection.count Then Exit Function
    
    getCollectionItemOrNothing = collection.item(i)
End Function


Public Function addToShapeRangeAtIndex(range As shapeRange, shape As shape, ByVal index As Integer) As shapeRange
    If range Is Nothing Then
        Err.Raise vbObjectError + 513, , "[Globals.addToShapeRangeAtIndex] 'range' ist Nothing "
    End If
    
    Dim newRange As New shapeRange
    
    For i = 1 To range.count
        If Not i = index Then
            newRange.add range(i)
        Else
            newRange.add shape
        End If
    Next i
    
    Set addToShapeRangeAtIndex = newRange
End Function


' Throws exception
Public Function cloneDictionary(dict As Dictionary) As Dictionary
    If dict Is Nothing Then
        Err.Raise vbObjectError + 513, , "[Globals.cloneDictionary] 'dict' ist Nothing "
    End If
    
    Dim newDict As New Dictionary
    
     For Each dictKey In dict
        newDict.add dictKey, dict(dictKey)
    Next dictKey
    
    Set cloneDictionary = newDict
End Function


Public Function cloneCollection(ByVal coll As collection) As collection
    Dim result As New collection
    For i = 1 To coll.count
        result.add coll(i)
    Next i
    Set cloneCollection = result
End Function


Public Function cloneShapeRange(range As shapeRange) As shapeRange
    
    Dim newRange As New shapeRange
    
    For i = 1 To range.count
        newRange.add range(i)
    Next i
    
    Set cloneShapeRange = newRange

End Function


Public Function getDictionaryValueIndex(dict As Dictionary, value As Variant) As Integer

    For i = 0 To dict.count - 1
    
        'MsgBox "Item=" & dict.Items(i)
        If Not TypeOf dict.Items(i) Is Dictionary And Not IsArray(dict.Items(i)) Then
            
            If StrComp(dict.Items(i), value, vbTextCompare) = 0 Then
                getDictionaryValueIndex = i
                Exit Function
            End If
        End If
    Next i
    
    getDictionaryValueIndex = -1

End Function

Public Function dictionaryValueExists(dict As Dictionary, value As Variant) As Boolean
    
    dictionaryValueExists = getDictionaryValueIndex(dict, value) > -1
    
End Function

Public Function getDictionaryKeyIndex(dict As Dictionary, key As Variant) As Integer
    
    Dim i As Integer
    For Each dictKey In dict
        If dictKey = key Then
            GoTo found
        End If
        i = i + 1
    Next dictKey
    i = -1 ' Nichts gefunden
found:
    getDictionaryKeyIndex = i
End Function


' TODO zu ArrayList hinzufügen
Public Function indexInStringArray(stringToBeFound As String, arr As Variant, Optional startt As Long = -1, Optional endd As Long = -1) As Long
    Dim i As Long
    ' default return value if value not found in array
    indexInStringArray = -1
      
    If startt = -1 Then startt = LBound(arr)
    If endd = -1 Then endd = UBound(arr)
    
    For i = startt To endd
        If StrComp(stringToBeFound, arr(i), vbTextCompare) = 0 Then
            indexInStringArray = i
            Exit For
        End If
    Next i
End Function


Public Function indexInStringArray2DRow(stringToBeFound As String, arr As Variant, ParamArray columnToSearchInVar() As Variant) As Long
    
    indexInStringArray2DRow = indexInStringArray2D(stringToBeFound, arr, columnToSearchInVar)
    
End Function

Public Function indexInStringArray2D(stringToBeFound As String, arr As Variant, ParamArray columnToSearchInVar() As Variant) As Long
    
    indexInStringArray2D = -1 ' Standartwert, wenn nichts gefunden
    
    Dim startt As Long
    Dim endd As Long
    
    Dim columnToSearchIn() As Variant
    columnToSearchIn = Globals.unwrapParamArray(columnToSearchInVar)
    
    Dim allColumns As Boolean
    allColumns = (IsMissing(columnToSearchIn) Or IsEmpty(columnToSearchIn))
    
    If allColumns Then
        startt = LBound(arr)
        endd = UBound(arr)
    Else
        startt = LBound(columnToSearchIn)
        endd = UBound(columnToSearchIn)
    End If
    
    For i = startt To endd
        Dim column As Long
        If allColumns Then
            column = i
        Else
            column = columnToSearchIn(i)
        End If
        
        Dim index As Long
        Dim columnAsArray() As Variant
        columnAsArray = getColumnFrom2DArray(arr, column)
        index = indexInStringArray(stringToBeFound, columnAsArray)
        
        ' Gefunden
        If Not index = -1 Then
            indexInStringArray2D = index
            Exit Function
        End If
        
    Next i
    
End Function



Function getColumnFrom2DArray(arr As Variant, columnIndex As Long) As Variant
    Dim rowLBound As Long, rowUBound As Long
    Dim i As Long
    Dim result() As Variant
    
    rowLBound = LBound(arr)
    rowUBound = UBound(arr)
    ReDim result(rowLBound To rowUBound)
    
    For i = rowLBound To rowUBound
        result(i) = arr(i, columnIndex)
    Next i
    
    getColumnFrom2DArray = result
End Function




Public Function isVariantUndefined(myVar As Variant) As Boolean
    isVariantUndefined = True
    If IsEmpty(myVar) Then
'        Debug.Print "Empty"
    ElseIf IsNull(myVar) Then
        Debug.Print "Null"
'    ElseIf VarType(myVar) = vbObject Then
        If myVar Is Nothing Then
'            Debug.Print "Nothing"
        Else
'            Debug.Print "Objekt ist gesetzt"
        End If
    Else
'        Debug.Print "Hat gültigen Wert: " & myVar
        isVariantUndefined = False
    End If
End Function




' Wenn ein Array ohne Größe deklariert wurde -> (Dim arr() As Variant) wird true zurückgegeben
Public Function isArrayDimensionised(ByRef arr As Variant) As Boolean
    'Is array initialized checking
    isArrayDimensionised = False
    On Error Resume Next
    If UBound(arr) >= 0 Then If Err.number = 0 Then isArrayDimensionised = True Else Err.Clear
End Function



' ACHTUNG: Ist noch nicht getestet worden !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
Public Function addElementToArray(ByRef arr(), element)
    
    Dim newArraySize As Integer
    Dim Startindex As Integer
    If Globals.isArrayDimensionised(arr) Then
        newArraySize = UBound(arr) + 1
        Startindex = LBound(arr)
    Else
        newArraySize = 1
        Startindex = 1
    End If
    
    ReDim Preserve arr(Startindex, newArraySize)
    
    arr(newArraySize) = element
    
End Function





Public Function array2DToString(arr As Variant, Optional delimiter = ",") As String
    
    Dim str As String
    
    For x = LBound(arr, 1) To UBound(arr, 1)
        
        For y = LBound(arr, 2) To UBound(arr, 2)
            
            str = str & arr(x, y)
            
            If Not y = UBound(arr, 2) Then
                str = str & delimiter & " "
            End If
            
        Next y
        
        str = str & vbNewLine
    Next x
    
    array2DToString = str
    
End Function



' Diese Funktion enpackt verschachtelte ParamArrays,
' da sich ParamArrays immer weiter verschachteln, wenn man ein ParamArray immer weitergibt zu einem anderen ParamArray Parameter einer anderen Funktion
Public Function unwrapParamArray(ByVal args As Variant) As Variant()
    
    If UBound(args) - LBound(args) + 1 = 1 Then
        Dim child As Variant
        child = args(LBound(args))
        ' Prüfen, ob erstes Child ein Array ist. Wenn ja dann ist es mit 99% Wahrscheinlichkeit ein verschachteltes ParamArray. (Lässt sich leider nicht direkt prüfen)
        If IsArray(child) Then
            unwrapParamArray = unwrapParamArray(child)
            Exit Function
        End If
    End If
    
    unwrapParamArray = args
End Function



Public Function removeElementsFrom2DArray(ByRef arr As Variant, ParamArray elementIndexies() As Variant)
    
    Dim elementsUnwrapped() As Variant
    elementsUnwrapped = unwrapParamArray(elementIndexies)
    
    Dim elementIndexiesColl As collection
    Set elementIndexiesColl = Globals.variantArrayToCollection(elementsUnwrapped)
    
    Dim copy As Variant
    copy = cloneArray(arr)
    
    Dim arraySize As Integer
    arraySize = Globals.getArraySize(arr, 1)
    
    
    If arraySize - elementIndexiesColl.count < 1 Then
        Err.Raise vbObjectError + 513, , "[Globals.removeElementsFrom2DArray] Zu viele Elemente sollen gelöscht werden."
    End If
    
    ' Array verkleinern um die Anzahl der Indexe die gelöscht werden sollen
    ReDim arr(LBound(arr, 1) To UBound(arr, 1) - elementIndexiesColl.count, LBound(arr, 2) To UBound(arr, 2))
    
    Dim xForArray As Integer
    xForArray = LBound(copy, 1)
    For x = xForArray To UBound(copy, 1)
        
        ' Soll das aktuelle Element gelöscht werden?
        If Not Globals.isCollectionHavingValue(elementIndexiesColl, x) Then
            For y = LBound(arr, 2) To UBound(arr, 2)
                arr(xForArray, y) = copy(x, y)
            Next y
            
            xForArray = xForArray + 1
        End If
    Next x
    
    
End Function



' Achtung: Supportet nur maximal 2D Arrays
Public Function cloneArray(arr As Variant) As Variant()
    
    Dim dimensions As Integer
    dimensions = getArrayDimensionCount(arr)
    
    Dim clone() As Variant
    If dimensions = 1 Then
        ReDim clone(LBound(arr, 1) To UBound(arr, 1))
        
        ' TODO
    Else
        ReDim clone(LBound(arr, 1) To UBound(arr, 1), LBound(arr, 2) To UBound(arr, 2))
        
        cloneArrayContent arr, clone
    End If
    
    cloneArray = clone
    
End Function


Public Function cloneArrayContent(from As Variant, too As Variant, Optional dimensions As Integer = -1)
    
    If dimensions = -1 Then
        dimensions = getArrayDimensionCount(arr)
    End If
    
    If dimensions = 1 Then
        For x = LBound(from) To UBound(from)
            too(x) = from(x)
        Next x
    Else
    
        For x = LBound(from, 1) To UBound(from, 1)
            For y = LBound(from, 2) To UBound(from, 2)
                too(x, y) = from(x, y)
            Next y
        Next x
    End If
    
End Function


Function getArrayDimensionCount(arr As Variant) As Long
    On Error GoTo Err
    Dim i As Long
    Dim tmp As Long
    i = 0
    Do While True
        i = i + 1
        tmp = UBound(var, i)
    Loop
Err:
    getArrayDimensionCount = i - 1
End Function



Public Sub TestArrayList2DAddRowParamArray()
    
    Dim result() As Variant
    
    Dim arr As New ArrayList2D
    arr.init 1, 4, 0
    
    arr.SetItem 1, 1, "Hallo"
    arr.SetItem 1, 2, "wie"
    arr.SetItem 1, 3, "gehts"
    arr.SetItem 1, 4, "so?"
    
    arr.AddRowParamArray "Mir", "geht", "es", "gut"
    MsgBox "getArraySize: '" & arr.rowCount & "' (sollte 2 sein)"
    MsgBox "" & arr.toString
    
End Sub



Public Function getParamArraySize(ParamArray paramArrayy() As Variant) As Integer
    getParamArraySize = getArraySize(CVar(paramArrayy))
End Function

Public Function getArraySize(arr As Variant, Optional dimension As Integer = -1) As Integer
    If Not Globals.isArrayDimensionised(arr) Then
        getArraySize = -1
    Else
        If dimension > -1 Then
            getArraySize = UBound(arr, dimension) - (LBound(arr, dimension) - 1)
        Else
            getArraySize = UBound(arr) - (LBound(arr) - 1)
        End If
    End If
End Function



Public Function paramarrayToCollection(ByVal paramArrayy As Variant) As collection
    
    Dim coll As New collection
    
    For i = LBound(paramArrayy) To UBound(paramArrayy)
        coll.add paramArrayy(i)
    Next i
    
    Set paramarrayToCollection = coll
End Function

Public Function variantArrayToCollection(ByVal VariantArray As Variant) As collection
    Dim coll As New collection
    
    For i = LBound(VariantArray) To UBound(VariantArray)
        coll.add VariantArray(i)
    Next i
    
    Set variantArrayToCollection = coll
End Function


Public Function creatIndexArray(from As Integer, too As Integer) As Integer()
    
    Dim arr() As Integer
    ReDim arr(too - from)
    
    For i = from To too
        arr(i - from) = i
    Next i
    
    creatIndexArray = arr
    
End Function
















Function isShapeReferenceValid(shape As shape) As Boolean
    On Error GoTo ReferenceError
    If shape.visible Then
        
    End If
    On Error GoTo 0
    
    isShapeReferenceValid = True
    Exit Function
ReferenceError:
    isShapeReferenceValid = False
End Function


Function isShapeRangeShapesReferenceValid(range As shapeRange) As Boolean
    
    For i = 1 To range.count
        If Not isShapeReferenceValid(range(i)) Then
            isShapeRangeShapesReferenceValid = False
            Exit Function
        End If
    Next i
    
    isShapeRangeShapesReferenceValid = True
    
End Function


Function setShapeRangeVisible(range As shapeRange, visible As Boolean)
    For i = 1 To range.count
        range(i).visible = visible
    Next i
End Function


' Da Coreldraws ShapeRange.Lock & .Unlock nicht funktionieren, haben wir diese Funktion
Public Function setShapeRangeLocked(ByVal range As shapeRange, locked As Boolean, recursive As Boolean)
    
    If recursive Then
        Set range = Globals.flattenShapeRange(range, , , False)
    End If
    
    For i = 1 To range.count
        range(i).locked = locked
    Next i
    
End Function


' Macht eine Form unsichtbar, so dass die beim exportieren Bild nicht zu sehen ist,
' aber noch bei der Größenbestimmung des Bildes miteinbezogen wird
Public Function setShapeInvisibleForExport(shape As shape)
    shape.fill.ApplyNoFill
    shape.outline.Type = cdrNoOutline
End Function


' Macht 'shape' sichtbar. Wenn es aber in einer nicht sichtbaren Gruppe war, wird diese zurückgegeben,
' damit man wieder die gesamte Gruppe unsichtbar machen kann und nicht nur das 'shape'
' um den vorherigen Zustand zu erreichen (restore)
Public Function makeShapeVisibleAndGetShapeForInvisibilityRestore(shape As shape) As PersistentShape
    
    Dim result As PersistentShape
    Set result = PersistentShapeHandler.getShape(shape) ' Standartmäßig bzw. ohne Parent ist das Shape selbst verantwortlich für seine Sichtbarkeit
    
    Dim shapeToCheckParent As shape
    Set shapeToCheckParent = shape
    
    While hasParentGroup(shapeToCheckParent)
        Set shapeToCheckParent = getParent(shapeToCheckParent)
        
        ' Wenn eine Obergruppe unsichtbar ist, dann steuert die die Sichtbarkeit von 'shape'
        If Not shapeToCheckParent.visible Then Set result = PersistentShapeHandler.getShape(shapeToCheckParent)
    Wend
    
    shape.visible = True
    
    Set makeShapeVisibleAndGetShapeForInvisibilityRestore = result
End Function



Public Function setShapeRangeName(ByRef range As shapeRange, name As String)
    
    For i = 1 To range.count
        range(i).name = name
    Next i
    
End Function


Public Function addShapeRangeName(ByRef range As shapeRange, name As String)
    
    For i = 1 To range.count
        setShapeNameLong range(i), range(i).name & name
    Next i
    
End Function












' C O R E L
'
'///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////







Public Function collectionToVariantArray(coll As collection) As Variant()
    
    Dim count As Integer
    count = coll.count
    
    Dim arr() As Variant
    ReDim arr(count - 1)
    
    For i = 1 To coll.count
        If IsObject(coll.item(i)) Then
            Set arr(i - 1) = coll.item(i)
        Else
            arr(i - 1) = coll.item(i)
        End If
    Next i
    
    collectionToVariantArray = arr
End Function


Public Function saveOrderShapeIntoLayer(shapeToOrder As shapeRange, Optional layer As layer, Optional orderToFront As Boolean = True, Optional logger As logger, Optional throwError As Boolean = True)
    If layer Is Nothing Then Set layer = ActiveLayer
    saveOrderShapeToShapeRange shapeToOrder, layer.shapes.All, orderToFront, logger, throwError
End Function


Public Function saveOrderShapeIntoGroupShape(shapeToOrder As shapeRange, groupShape As shapeRange, Optional orderToFront As Boolean = True, Optional logger As logger, Optional throwError As Boolean = True)
    saveOrderShapeToShapeRange shapeToOrder, groupShape.shapes.All, orderToFront, logger, throwError
End Function


' Versucht die Form 'shapeToOrder' hinter eines der 'range' Formen zu ordern und dann ganz nach vorne.
' Dabei wird geprüft, ob das Ordern möglich ist. Denn wenn 'shapeToOrder' selbst in der 'range' ist, muss verhindert werden, dass 'shapeToOrder' hinter sich selbst geordert wird.
' Denn das bringt Corel potentiell zum Absturz
Public Function saveOrderShapeToShapeRange(shapeToOrder As shapeRange, range As shapeRange, Optional orderToFront As Boolean = True, Optional logger As logger, Optional throwError As Boolean = True)
    
    For i = 1 To range.count
        If isOrderOK(shapeToOrder, range.All(i)) Then
            ' Hinter die Form setzen. Denn wenn die Vorherige 'shapeToOrder' war, wird wieder an die selbe Stelle geordert. Wieder potentieller Corel Crash
            shapeToOrder.OrderBackOf range.All(i)
            If orderToFront Then shapeToOrder.orderToFront
            Exit Function
        End If
    Next i
    
    If throwError Then Err.Raise vbObjectError + 513, , "[Globals.saveOrderShapeToShapeRange] Es wurde keine Form gefunden zu der 'shapeToOrder' hintergeordert werden kann. Dann muss es die einzige Form in 'range' sein"
End Function


Public Function saveOrderShapeRangeIntoLayer(rangeToOrder As shapeRange, Optional layer As layer, Optional orderToFront As Boolean = True, Optional logger As logger, Optional throwError As Boolean = True)
    If layer Is Nothing Then Set layer = ActiveLayer
    saveOrderShapeRangeToShapes rangeToOrder, layer.shapes.All, orderToFront, logger, throwError
End Function

Public Function saveOrderShapeRangeIntoGroupShape(rangeToOrder As shapeRange, groupShape As shapeRange, Optional orderToFront As Boolean = True, Optional logger As logger, Optional throwError As Boolean = True)
    saveOrderShapeRangeToShapes rangeToOrder, groupShape.shapes.All, orderToFront, logger, throwError
End Function

Public Function saveOrderShapeRangeToShapes(rangeToOrder As shapeRange, range As shapeRange, Optional orderToFront As Boolean = True, Optional logger As logger, Optional throwError As Boolean = True)
    
    For i = 1 To range.count
        
        For j = 1 To rangeToOrder.count
            If Not isOrderOK(rangeToOrder(j), range(i)) Then
                GoTo NextI
            End If
        Next j
        
        ' An dieser Stelle sind alle 'rangeToOrder' isOrderOK
        ' Hinter die Form setzen. Denn wenn die Vorherige 'shapeToOrder' war, wird wieder an die selbe Stelle geordert. Wieder potentieller Corel Crash
        rangeToOrder.OrderBackOf range(i)
        If orderToFront Then rangeToOrder.orderToFront
        Exit Function
NextI:
    Next i
    
    If throwError Then Err.Raise vbObjectError + 513, , "[Globals.saveOrderShapeRangeToShapes] Es wurde keine Form gefunden zu der 'rangeToOrder' hintergeordert werden kann. Alle Formen in der 'range' müssen dann von 'rangeToOrder' sein"
End Function


Public Function safeOrderShapeRangeBackOf(rangeToOrder As shapeRange, backOfShape As shape, Optional logger As logger)
    saveOrderCheckShapesAndRange rangeToOrder, backOfShape, logger
    shapesToOrder.OrderBackOf backOfShape
End Function


' Da Corel einfach ohne Fehlermeldung abstürzt, wenn eine Der Formen nicht OK ist, gibt es diese Funktion die das selbe erledigt und vorher Formen prüft
Public Function safeOrderShapeBackOf(shapeToOrder As shape, backOfShape As shape, Optional logger As logger)
    saveOrderCheckShapes shapeToOrder, backOfShape, logger:=logger
    shapeToOrder.OrderBackOf backOfShape
End Function


Public Function safeOrderShapeRangeFrontOf(shapeRangeToOrder As shapeRange, frontOfShape As shape, Optional logger As logger)
    saveOrderCheckShapesAndRange shapeRangeToOrder, frontOfShape, logger
    shapesToOrder.OrderFrontOf frontOfShape
End Function


' Da Corel einfach ohne Fehlermeldung abstürzt, wenn eine Der Formen nicht OK ist, gibt es diese Funktion die das selbe erledigt und vorher Formen prüft
Public Function safeOrderShapeFrontOf(shapeToOrder As shape, frontOfShape As shape, Optional logger As logger)
    saveOrderCheckShapes shapeToOrder, frontOfShape, logger:=logger
    shapeToOrder.OrderFrontOf frontOfShape
End Function


Private Function saveOrderCheckShapesAndRange(shapesToOrder As shapeRange, frontOrBackOfShape As shape, Optional logger As logger)
    
    ' Nur die frontOrBackOfShape prüfen
    saveOrderCheckShapes Nothing, frontOrBackOfShape, False, True, False, logger
    
    Dim i As Integer
    For i = 1 To shapesToOrder.count
        saveOrderCheckShapes shapesToOrder(i), frontOrBackOfShape, True, False, True, logger
    Next i
    
End Function


Private Function saveOrderCheckShapes(shapeToOrder As shape, frontOrBackOfShape As shape, Optional checkShapeToOrderReference As Boolean = True, Optional checkfrontOrBackOfShapeReference As Boolean = True, Optional checkOrder As Boolean = True, _
    Optional logger As logger)
    
    If checkShapeToOrder Then
        If Not Globals.isShapeReferenceValid(shapeToOrder) Then
            Err.Raise vbObjectError + 513, , "[Globals.saveOrderCheckShapes] Referenz von 'shapeToOrder' ist nicht gültig oder die Form ist Nothing"
        End If
    End If
    
    If checkfrontOrBackOfShape Then
        If Not Globals.isShapeReferenceValid(frontOrBackOfShape) Then
            Err.Raise vbObjectError + 513, , "[Globals.saveOrderCheckShapes] Referenz von 'frontOrBackOfShape' ist nicht gültig oder die Form ist Nothing"
        End If
    End If
    
    If checkOrder Then
        If Not isOrderOK(shapeToOrder, frontOrBackOfShape, logger) Then
            Err.Raise vbObjectError + 513, , "[Globals.saveOrderCheckShapes] Form kann nicht vor bzw. hinter der anderen From einsortiert werden! "
        End If
    End If
End Function


' Corel stürzt ab sobald man einer Form eine Transparenz zuweist wenn diese Form in einem Powerclip steckt
' Diesen Fehler umgeht diese Funktion
Public Function safeApplyUniformTransparencyToShape(shape As shape, transparency As Long)
    Dim powerClipParent As shape
    Set powerClipParent = shape.powerClipParent
    If Not powerClipParent Is Nothing Then

        ' Nur im Powerclip-Bearbeitungsmodus
        powerClipParent.powerClip.EnterEditMode
        shape.transparency.ApplyUniformTransparency transparency
        powerClipParent.powerClip.LeaveEditMode
        
    Else
        shape.transparency.ApplyUniformTransparency transparency
    End If
    
End Function


' Sobald man den Text von einer Textform setzt, kann es sein, dass die Textform verschwindet oder die Referenz verloren geht.
' Das scheint immer dann zu passieren, wenn die Form soeben erstellt wurde
Public Function safeSetTextShapeText(textShape As shape, text As String)
    
    If Globals.isShapeDeleted(textShape) Then
        Err.Raise vbObjectError + 513, , "[Globals.safeSetTextShapeText] Referenz von 'textShape' ist nicht gültig oder die Form ist Nothing"
    End If
    
    If Not textShape.Type = cdrTextShape Then
        Err.Raise vbObjectError + 513, , "[Globals.safeSetTextShapeText] 'textShape' muss eine Textform sein"
    End If
    
    Dim textShapeNameBefore As String
    textShapeNameBefore = textShape.name
    textShape.name = "Globals.safeSetTextShapeText.textShape"
    
    textShape.text.Story.text = text
    
    ' Falls die Form verschwunden ist,
    If Globals.isShapeDeleted(textShape) Then
        Set textShape = ActivePage.shapes.FindShape("Globals.safeSetTextShapeText.textShape")
        textShape.name = textShapeNameBefore
    End If
End Function



' Die Funktion von Corel
' textShape.text.Story.size = 50
' kann in manchen Fällen zu einem "unerwarteten Fehler" führen
' Diese Funktion hier umgeht das
Public Function safeSetTextShapeTextSize(textShape As shape, size As Double)
    
    Dim scalee As Double
    scalee = size / textShape.text.Story.size
    textShape.SetSizeEx textShape.centerX, textShape.text.Story.Baselines.Segments.First.StartNode.positionY, textShape.SizeWidth * scalee
    
End Function




Public Sub TestRemoveShapeFromPowerclip()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    Dim shape As shape
    Set shape = ActiveShape
    
    Dim powerClipParent As shape
    Set powerClipParent = shape.powerClipParent
    If Not powerClipParent Is Nothing Then
    
        Dim shapesInPowerclip As shapeRange
        Set shapesInPowerclip = powerClipParent.powerClip.shapes.All
        
'        powerClipParent.powerclip.ExtractShapes ' B
        
'        powerClipParent.powerclip.EnterEditMode
        
        ' Aus Powerclip herauslösen
        shape.RemoveFromContainer ' A
        
        shapesInPowerclip.RemoveRange Globals.shapeToShapeRange(shape)
        
'        shape.OrderFrontOf powerClipParent ' C
        
'        MsgBox "PowerclipParent of shape after extracting from powerclip: " & Globals.getShapeDisplayName(shape.powerClipParent)
        
'        shape.AddToPowerClip powerClipParent
        
'        powerClipParent.powerclip.LeaveEditMode
        
        'shapesInPowerclip.AddToPowerClip powerClipParent
        For i = 1 To shapesInPowerclip.count
            shapesInPowerclip(i).AddToPowerClip powerClipParent
        Next i
        
        
'        MsgBox "PowerclipParent of shape after leaving edit mode: " & Globals.getShapeDisplayName(shape.powerClipParent)
    End If
    
End Sub




Public Sub TestPrintPowerclipParent()
    
     Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    Dim shape As shape
    Set shape = ActiveShape
    
    MsgBox "PowerclipParent: " & Globals.getShapeDisplayName(shape.powerClipParent)
    
End Sub



Public Function isOrderOK(orderSourceShape As shape, toTargetShape As shape, Optional logger As logger) As Boolean
    
    If Not logger Is Nothing Then
        logger.logINFO "[Globals.isOrderOK] orderSourceShape: '" & Globals.getShapeDisplayName(orderSourceShape) & "', toTargetShape: '" & Globals.getShapeDisplayName(toTargetShape) & "'"
        logger.addTab
    End If
    
    If orderSourceShape Is toTargetShape Then
        If Not logger Is Nothing Then logger.logINFO "Formen sind gleich. Ordern nicht möglich!"
        GoTo ExitFunction ' Return False
    End If
    
    ' Wenn eine Gruppe ober oder unterhalb einer seiner Formen geordert werden soll, stürzt Corel (glaub ich) ab. Weil das keinen Sinn ergibt
    If isShapeInsideGroupShape(toTargetShape, orderSourceShape) Then
        If Not logger Is Nothing Then logger.logINFO "'toTargetShape' ist eine Gruppe und 'orderSourceShape' ist darin enthalten. Ordern nicht möglich!"
        GoTo ExitFunction ' Return False
    End If
    
    
    If Not logger Is Nothing Then logger.logINFO "Return true"
    isOrderOK = True
ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
End Function




Public Function isShapeInsideAGroup(shape As shape) As Boolean
    isShapeInsideAGroup = Not shape.parentGroup Is Nothing
End Function


Public Sub TestIsShapeInsideGroupShape()
    Globals.warnIfNoActiveShapeAndEnd
    
    Dim shp As shape
    Set shp = ActiveLayer.FindShape("shape")
    
    Dim groupShape As shape
    Set groupShape = ActiveLayer.FindShape("groupShape")
    
    MsgBox "isShapeInsideGroupShape: " & isShapeInsideGroupShape(shp, groupShape)
End Sub


Public Function isShapeInsideGroupShape(shape As shape, groupShape As shape) As Boolean
    If Not groupShape.Type = cdrGroupShape Then Exit Function
    
    Dim parent As shape
    Set parent = getParentShapeOfShape(shape)
    
    While Not parent Is Nothing
        
        If parent Is groupShape Then
            isShapeInsideGroupShape = True
            Exit Function
        End If
    
        Set parent = getParentShapeOfShape(parent)
    Wend
    
End Function



Public Function getParentShapeOfShapes(shapes As shapes) As shape
    
    getParentShapeOfShape shapes.First
    
End Function


Public Sub TestParentGroup()
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    MsgBox "Parent: " & TypeName(ActiveShape.parent)
    
'    MsgBox "Parent: '" & IIf(ActiveShape.parent Is Nothing, "Nothing", ActiveShape.parent.name) & "'"
    
    MsgBox "ActiveShape.parentGroup: '" & Globals.getShapeDisplayName(ActiveShape.parentGroup) & "' is Uploadbox: '" & Globals.isUploadBox(ActiveShape.parentGroup) & "'"
    
    
    ActiveShape.parentGroup.name = "LALALLALLL"
    
End Sub


Public Function getParentShapeOfShape(shape As shape) As shape
    
    If Not shape.parentGroup Is Nothing Then
        
        If TypeOf shape.parentGroup Is shape Then
            Set getParentShapeOfShape = shape.parentGroup
        End If
    End If
    
End Function



Public Sub TestGetParentShape()
    
    Globals.warnIfNoActiveShapeAndEnd
    
    
    MsgBox "Parent Shape: " & Globals.getShapeDisplayName(Globals.getParentShapeOfShape(ActiveShape))
    
'    MsgBox "TypeOf shape.parent: " & TypeName(ActiveShape)
    
End Sub



Public Function getDocumentOfShape(shape As shape) As document
    
    ' Durchsuche alle Dokumente und suche nach dem Shape. Das Dokument, welches das Shape hat, ist das Dokument vom Shape
    Dim document As document
    For Each document In Application.Documents
        Dim page As page
        For Each page In document.Pages
            Dim shapeWithSameID As shape
            Set shapeWithSameID = page.FindShape(, , shape.staticID)
            
            If Not shapeWithSameID Is Nothing Then
                ' Dokument hat zwar ein Shape mit gleicher ID, aber es muss noch geprüft werden, ob es wirklich das selbe ist
                If shapeWithSameID Is shape Then
                    Set getDocumentOfShape = document
                End If
            End If
            
            Set shapeWithSameID = Nothing
        Next page
    Next document
    
End Function



Public Function safeAddShapeRangeToShapeRange(sourceRange As shapeRange, targetRange As shapeRange)
    
    If sourceRange Is Nothing Then
        Err.Raise vbObjectError + 513, , "[Globals.safeAddShapeRangeToShapeRange] 'sourceRange' ist Nothing "
    End If
    
    For i = 1 To sourceRange.count
        safeAddShapeToShapeRange sourceRange(i), targetRange
    Next i
    
End Function



' Da Corel einfach ohne Fehlermeldung abstürzt, wenn eine Der Formen nicht OK ist, gibt es diese Funktion die das selbe erledigt und vorher Formen prüft
Public Function safeAddShapeToShapeRange(shape As shape, range As shapeRange)
    
    If Globals.isShapeDeleted(shape) Then
        Err.Raise vbObjectError + 513, , "[Globals.safeAddShapeToShapeRange] Referenz von 'shape' ist nicht gültig oder die Form ist Nothing"
    End If
    
    If range Is Nothing Then
        Err.Raise vbObjectError + 513, , "[Globals.safeAddShapeToShapeRange] 'range' ist Nothing "
    End If
    
    range.add shape
End Function


' Da Corel einfach ohne Fehlermeldung abstürzt, wenn eine nicht sichtbare Form zu Kurven umgewandelt wird, gibt es diese Funktion, die sicherstellt, dass die Form sichtbar ist
Public Function safeConvertShapeToCurves(shape As shape)
    
    Dim shapeWasVisible As Boolean
    shapeWasVisible = shape.visible
    
    shape.visible = True ' Wichtig
    shape.ConvertToCurves
    
    shape.visible = shapeWasVisible
    
End Function


' Da Corel einfach ohne Fehlermeldung abstürzt, wenn die Form zu Kurven umgewandelt wird, die nicht sichtbar ist, gibt es diese Funktion, die sicherstellt, dass die Form sichtbar ist
Public Function safeConvertShapeOutlineToObject(shape As shape)
    
    If Not shape.CanHaveOutline Then
        Err.Raise vbObjectError + 513, , "[Globals.safeConvertShapeOutlineToObject] 'shape' hat keine Kontur"
    End If
    
    Dim shapeWasVisible As Boolean
    shapeWasVisible = shape.visible
    
    shape.visible = True ' Wichtig
    shape.outline.ConvertToObject
    
    shape.visible = shapeWasVisible
    
End Function


' Drückt die Tasten STRG + Z
' ACHTUNG: Drückt sie in dem Programm/Fenster welches gerade offen ist (Muss nicht immer Corel sein)
Public Function pressSTRGZ()
    SendKeys "^z"
End Function


Public Function pressSTRGZInCorel()
    ' Coreldraw in den Fokus bringen
    Application.ActiveWindow.Activate
    
    pressSTRGZ
End Function


Public Function optimize(Optional isStartOrEnd As Boolean = True)
    ' Zu Begin eines Skriptes
    If isStartOrEnd Then
        Optimization = True
        EventsEnabled = False
'        ActiveDocument.SaveSettings
'        ActiveDocument.PreserveSelection = False
    ' Zum Ende eines Skriptes
    Else
'        If Not ActiveDocument Is Nothing Then
'            ActiveDocument.PreserveSelection = True
'            ActiveDocument.RestoreSettings
'        End If
        EventsEnabled = True
        Optimization = False
        refreshActiveWindow
        
    End If
End Function


Public Function refreshActiveWindow()
    If Windows.count > 0 Then
        ActiveWindow.refresh
    End If
End Function


Public Function getAllShapes(Optional ignoreDesktopFolder As Boolean = True) As shapeRange
    
    Dim allShapes As New shapeRange
    
    For i = 1 To ActivePage.layers.count
        If Not ignoreDesktopFolder Or Not ActivePage.layers(i).IsDesktopLayer Then
            allShapes.AddRange ActivePage.layers(i).shapes.All
        End If
    Next i
    
    Set getAllShapes = allShapes
    
End Function


Public Function getSelectedShapesOrAll(Optional onlySelected As Boolean = False, Optional ignoreDesktopFolder As Boolean = True) As shapeRange
    
    Dim selection As shapeRange
    
    If onlySelected Or ActiveSelectionRange.count > 0 Then
        Set selection = ActiveSelectionRange.ReverseRange  ' Reversed. Weil die Auswahl immer falsch herum ist
    
    ' Wenn es keine ausgewählten Formen gibt, dann alle Formen sammeln
    Else
        Set selection = New shapeRange
        For i = 1 To ActivePage.layers.count
            
            If Not ignoreDesktopFolder Or Not ActivePage.layers(i).IsDesktopLayer Then
                selection.AddRange ActivePage.layers(i).shapes.All
            End If
        Next i
    End If
    
    Set getSelectedShapesOrAll = selection
End Function



Public Function getShapesByShapeGatherType(Optional gatherType As shapeGatherType = shapeGatherType.GatherAll, Optional ignoreDesktopFolder As Boolean = True) As shapeRange
    
    Dim selection As shapeRange
    
    If Not ActiveDocument Is Nothing Then
        
        For i = 1 To ActiveDocument.ActivePage.layers.count
            Dim layer As layer
            Set layer = ActiveDocument.ActivePage.layers(i)
            
            If Not ignoreDesktopFolder Or Not layer.IsDesktopLayer Then
                
                selection.AddRange getShapeFromShapesByShapeGatherType(layer.shapes.All, gatherType)
                
            End If
            
            Set layer = Nothing
        Next i
        
    End If
    
    Set getShapesByShapeGatherType = selection
End Function


Public Function getShapeFromShapesByShapeGatherType(shapes As shapeRange, Optional gatherType As shapeGatherType = shapeGatherType.GatherAll) As shapeRange
    
    Dim result As New shapeRange
    
    For i = 1 To shapes.count
        Dim fitsType As Boolean
        Select Case gatherType
            Case shapeGatherType.GatherAll
                fitsType = True
            Case shapeGatherType.Selected
                fitsType = shapes(i).Selected
            Case shapeGatherType.Unselected
                fitsType = Not shapes(i).Selected
        End Select
        
        If fitsType Then
            result.add shapes(i)
        End If
        
    Next i
    
    Set getShapeFromShapesByShapeGatherType = result
    
End Function



Public Function getDesignFromDesignsCollection(designs As collection, ByVal index As Integer) As productDesign
    Set getDesignFromDesignsCollection = designs(index)
End Function



Public Function getAllDesigns(Optional ignoreDesktopFolder As Boolean = True, Optional onlyValidDesigns As Boolean = False, Optional ignoreNormalDesigns = False, Optional ignoreMasterDesign As Boolean = True, _
        Optional ignoreRedDesignsToIgnore As Boolean = True, Optional ignoreProductImageVariantDesigns As Boolean = True, Optional ignoreMainDesigns As Boolean = False, Optional logger As logger, Optional limit As Integer = MAXINT) As collection
    
    Dim allShapes As New shapeRange
    Set allShapes = getAllShapes(ignoreDesktopFolder)
    
    Set getAllDesigns = getDesignsFromShapes(allShapes, onlyValidDesigns, ignoreNormalDesigns, ignoreMasterDesign, ignoreRedDesignsToIgnore, ignoreProductImageVariantDesigns, ignoreMainDesigns, logger, limit)
    
End Function


Public Function getAllDesignsAsRange(Optional ignoreDesktopFolder As Boolean = True, Optional onlyValidDesigns As Boolean = False, Optional ignoreNormalDesigns = False, Optional ignoreMasterDesign As Boolean = True, _
        Optional ignoreRedDesignsToIgnore As Boolean = True, Optional ignoreProductImageVariantDesigns As Boolean = True, Optional ignoreMainDesigns As Boolean = False, Optional logger As logger, Optional limit As Integer = MAXINT) As ProductDesignRange
    
    Dim allDesigns As collection
    Set allDesigns = getAllDesigns(ignoreDesktopFolder, onlyValidDesigns, ignoreNormalDesigns, ignoreMasterDesign, ignoreRedDesignsToIgnore, ignoreProductImageVariantDesigns, ignoreMainDesigns, logger, limit)
    
    Dim allDesignsRange As New ProductDesignRange
    allDesignsRange.AddRange allDesigns
    
    Set getAllDesignsAsRange = allDesignsRange
End Function



Public Function getSelectedDesignsFromDesigns(designs As collection, Optional ignoreRedDesignsToIgnore As Boolean = True) As collection
    
    Dim selectedDesigns As New collection
    
    For i = 1 To designs.count
        
        Dim design As productDesign
        Set design = designs(i)
        
        If Not ActiveSelectionRange.IndexOf(design.getDesignShape) = 0 Then
            selectedDesigns.add design
        End If
        
        Set design = Nothing
    Next i
    
    Set getSelectedDesignsFromDesigns = selectedDesigns
    
End Function



Public Function getSelectedDesignsOrAll(Optional onlySelected As Boolean = False, Optional ignoreDesktopFolder As Boolean = True, Optional onlyValidDesigns As Boolean = False, _
        Optional ignoreNormalDesigns = False, Optional ByVal ignoreMasterDesign As Boolean = True, Optional ignoreMasterDesignIfNotExplicitlySelected As Boolean = False, Optional ignoreRedDesignsToIgnore As Boolean = True, _
        Optional ignoreProductImageVariantDesigns As Boolean = True, Optional ignoreMainDesigns As Boolean = False, Optional logger As logger) As collection
    
    If Not logger Is Nothing Then
        logger.addTab , "[Globals.getSelectedDesignsOrAll] onlySelected: '" & onlySelected & "', ignoreDesktopFolder: '" & ignoreDesktopFolder & "', onlyValidDesigns: '" & onlyValidDesigns & "', ignoreMasterDesign: '" & ignoreMasterDesign & "'"
    End If
    
    ' Wenn keine Formen ausgewählt wurden, dann soll je nach 'onlySelected' alle Formen ausgewählt werden,
    ' aber nicht das Masterdesign. Somit wird das Masterdesign geschützt. Macht Sinn wenn man Artikelnummern an alle Designs vergeben will,
    ' dann wählt man einfach keine Designs aus, weil man alle Designs ändern will. Aber man will dabei eigentlich nicht das Masterdesign ändern
    If ActiveSelectionRange.count = 0 And ignoreMasterDesignIfNotExplicitlySelected Then
        ignoreMasterDesign = True
    End If
    
    Dim selection As shapeRange
    Set selection = getSelectedShapesOrAll(onlySelected, ignoreDesktopFolder)
    
    If Not logger Is Nothing Then logger.logFINE "selection.count: " & selection.count
    
    Set getSelectedDesignsOrAll = getDesignsFromShapes(selection, onlyValidDesigns, ignoreNormalDesigns, ignoreMasterDesign, ignoreRedDesignsToIgnore, ignoreProductImageVariantDesigns, ignoreMainDesigns, logger)
    
    If Not logger Is Nothing Then logger.removeTab
End Function

Public Function getSelectedDesignsOrAllAsRange(Optional onlySelected As Boolean = False, Optional ignoreDesktopFolder As Boolean = True, Optional onlyValidDesigns As Boolean = False, _
        Optional ignoreNormalDesigns = False, Optional ByVal ignoreMasterDesign As Boolean = True, Optional ignoreMasterDesignIfNotExplicitlySelected As Boolean = False, Optional ignoreRedDesignsToIgnore As Boolean = True, _
        Optional ignoreProductImageVariantDesigns As Boolean = True, Optional ignoreMainDesigns As Boolean = False, Optional logger As logger) As ProductDesignRange
    
    Dim designs As collection
    Set designs = getSelectedDesignsOrAll(onlySelected, ignoreDesktopFolder, onlyValidDesigns, ignoreNormalDesigns, ignoreMasterDesign, ignoreMasterDesignIfNotExplicitlySelected, ignoreRedDesignsToIgnore, ignoreProductImageVariantDesigns, ignoreMainDesigns, logger)
    
    Dim result As New ProductDesignRange
    result.AddRange designs
    
    Set getSelectedDesignsOrAllAsRange = result
End Function


Public Function getFirstDesignFromShapes(shapes As shapeRange, Optional onlyValidDesigns As Boolean = False, Optional ignoreNormalDesigns = False, Optional ignoreMasterDesign As Boolean = True, Optional ignoreRedDesignsToIgnore As Boolean = True, _
    Optional ignoreProductImageVariantDesigns As Boolean = True, Optional ignoreMainDesigns As Boolean = False, Optional logger As logger) As productDesign
    Set getFirstDesignFromShapes = getDesignsFromShapes(shapes, onlyValidDesigns, ignoreNormalDesigns, ignoreMasterDesign, ignoreRedDesignsToIgnore, ignoreProductImageVariantDesigns, ignoreMainDesigns, logger, 1).item(1)
End Function


Public Function getDesignsFromShapes(shapes As shapeRange, Optional onlyValidDesigns As Boolean = False, Optional ignoreNormalDesigns = False, Optional ignoreMasterDesign As Boolean = True, Optional ignoreRedDesignsToIgnore As Boolean = True, _
    Optional ignoreProductImageVariantDesigns As Boolean = True, Optional ignoreMainDesigns As Boolean = False, Optional logger As logger, Optional limit As Integer = MAXINT) As collection
    
    If Not logger Is Nothing Then
        logger.addTab , "[Globals.getDesignsFromShapes] onlyValidDesigns: '" & onlyValidDesigns & "', ignoreNormalDesigns: '" & ignoreNormalDesigns & "', ignoreMasterDesign: '" & ignoreMasterDesign & _
            "', ignoreRedDesignsToIgnore: '" & ignoreRedDesignsToIgnore & "', ignoreProductImageVariantDesigns: '" & ignoreProductImageVariantDesigns & "', ignoreMainDesigns: '" & ignoreMainDesigns & "', limit: '" & limit & "'"
    End If
    
    If Not logger Is Nothing Then logger.logFINE "shapes.count: '" & shapes.count & "'"
    
    Dim designs As New collection
    
    For i = 1 To shapes.count
        Dim design As productDesign
        Set design = getDesignFromShape(shapes(i)) ' Kann Nothing returnen
        
        If Not design Is Nothing Then designs.add design
        
        Set design = Nothing
    Next i
    
    Set getDesignsFromShapes = getDesignsFromDesigns(designs, onlyValidDesigns, ignoreNormalDesigns, ignoreMasterDesign, ignoreRedDesignsToIgnore, ignoreProductImageVariantDesigns, ignoreMainDesigns, logger, limit)
    
    If Not logger Is Nothing Then logger.removeTab
End Function



' Returnt die Designs von 'designs', die die Kriterien aus der restlichen Parameterliste erfüllen
Public Function getDesignsFromDesigns(designs As collection, Optional onlyValidDesigns As Boolean = False, Optional ignoreNormalDesigns = False, Optional ignoreMasterDesign As Boolean = True, Optional ignoreRedDesignsToIgnore As Boolean = True, _
    Optional ignoreProductImageVariantDesigns As Boolean = True, Optional ignoreMainDesigns As Boolean = False, Optional logger As logger, Optional limit As Integer = MAXINT) As collection
    
    If Not logger Is Nothing Then
        logger.addTab , "[Globals.getDesignsFromDesigns] onlyValidDesigns: '" & onlyValidDesigns & "', ignoreNormalDesigns: '" & ignoreNormalDesigns & "', ignoreMasterDesign: '" & ignoreMasterDesign & _
            "', ignoreRedDesignsToIgnore: '" & ignoreRedDesignsToIgnore & "', ignoreProductImageVariantDesigns: '" & ignoreProductImageVariantDesigns & "', ignoreMainDesigns: '" & ignoreMainDesigns & "', limit: '" & limit & "'"
    End If
    
    Dim result As New collection
    
    For i = 1 To designs.count
        Dim design As productDesign
        Set design = designs(i)
        
        If Not design Is Nothing Then
            Dim isMaster As Boolean
            isMaster = design.isMasterDesign
            If IIf(onlyValidDesigns, design.isValidProductDesign, True) And IIf(ignoreNormalDesigns, Not design.isNormalDesign, True) And IIf(ignoreMasterDesign, Not design.isMasterDesign, True) And IIf(ignoreRedDesignsToIgnore, Not design.isRedDesignToIgnore, True) And _
                    IIf(ignoreProductImageVariantDesigns, Not design.isProductImageVariant, True) And IIf(ignoreMainDesigns, Not design.isMainDesign, True) Then
                
                result.add design
                If result.count >= limit Then GoTo ExitFunction
            End If
        End If
        
        Set design = Nothing
    Next i
    
ExitFunction:
    Set getDesignsFromDesigns = result
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function getMasterDesignFromShapes(shapes As shapeRange, Optional onlyValidDesigns As Boolean = False) As productDesign
    
    Dim designs As collection
    Set designs = getDesignsFromShapes(shapes, onlyValidDesigns, , False)
    
    For i = 1 To designs.count
        Dim design As productDesign
        Set design = designs(i)
        
        If design.isMasterDesign Then
            Set getMasterDesignFromShapes = design
            Exit Function
        End If
        
        Set design = Nothing
    Next i
    
End Function



Public Function getDesignFromShape(shape As shape) As productDesign
    If shape.Type = cdrGroupShape Then
        Dim design As New productDesign
        design.newProductDesign shape
        
        Set getDesignFromShape = design
    Else
        Dim superParent As shape
        Set superParent = Globals.getLastParent(shape)
        
        If Not superParent Is Nothing Then
            Set getDesignFromShape = getDesignFromShape(superParent)
        End If
    End If
End Function


Public Sub TestAreDesignMainShapesEqual()
    
    Dim allDesigns As collection
    Set allDesigns = Globals.getAllDesigns
    
    MsgBox "Sind alle Designs gleich: " & areDesignMainShapesEqual(allDesigns, Globals.getLogger(True))
    
End Sub


Public Function areDesignMainShapesEqual(designs As ProductDesignRange, Optional logger As logger) As Boolean
    
    If Not logger Is Nothing Then
        logger.logINFO "[Globals.areDesignMainShapesEqual]"
        logger.addTab
    End If
    
    
    Dim firstDesign As productDesign
    Set firstDesign = designs.getDesign(1)
    
    For i = 2 To designs.count
        If Not firstDesign.areDesignsMainShapesEqual(designs.getDesign(i), logger) Then
            If Not logger Is Nothing Then logger.logINFO "Design 1 & " & i & " stimmen nicht überein!"
            GoTo ExitFunction ' Return False
        End If
    Next i
    
    
    areDesignMainShapesEqual = True
    
ExitFunction:
    If Not logger Is Nothing Then
        logger.logINFO "Returne " & areDesignMainShapesEqual
        logger.removeTab
    End If
End Function



' Versucht das Design von einer Form zu finden.
' Versucht dabei zunächst zu testen, ob die Form selbst ein Design ist.
' Danach das selbe bei seinem Parents
Public Function getDesignOfShape(shp As shape, Optional quietMode As Boolean, Optional logger As logger) As productDesign
    If Not logger Is Nothing Then logger.addTab , "[Globals.getDesignOfShape] shp: '" & Globals.getShapeDisplayName(shp) & "'"
    
    Dim designIsValidProductDesign As Boolean
    
    If shp.Type = cdrGroupShape Then
        Dim design As New productDesign
        design.newProductDesign shp, quietMode
        designIsValidProductDesign = design.isValidProductDesign
    End If
    
    Dim parentShape As shape
    Set parentShape = Globals.getParentShapeOfShape(shp)
    
    If designIsValidProductDesign Then
        
        If Not parentShape Is Nothing Then
            ' Design ist zwar gültig, aber das kann daran liegen, dass 'shp' ein Layer ist und Hauptformen hat wie ein Design
            ' Deshalb prüfen wir nochmal den Parent, wenn es einen gibt
            
            Dim parentsDesign As productDesign
            Set parentsDesign = getDesignOfShape(parentShape, quietMode, logger)
            
            ' Wenn also ein Parent auch ein gültiges Design ist, dann ist das mit höherer Wahrscheinlichkeit ein echteres Design als 'design'
            ' Denn Designs beinhalten Layer, welche schnell als Designs gesehen werden können
            If Not parentsDesign Is Nothing Then
                Set design = parentsDesign
            End If
        
        End If
        
    
    Else
        ' Design ungültig
        Set design = Nothing
        
        If Not parentShape Is Nothing Then
            Set design = getDesignOfShape(parentShape, quietMode, logger)
        End If
    End If
    
    
    Set getDesignOfShape = design
    
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function getLayerOfShape(shp As shape, Optional quietMode As Boolean, Optional logger As logger)
    Dim design As productDesign
    Set design = getDesignOfShape(shp, quietMode, logger)
    
    If design Is Nothing Then Exit Function
    
    Set getLayerOfShape = design.allLayers.findShapesLayer(shp)
End Function



' Merkt sich die aktuelle Auswahl der Formen (Können auch 0 sein)
Public Function storeSelection()
    Set selectionBeforeMacroStart = ActiveSelectionRange
End Function


' Wählt die Formen wieder aus, die während des Aufrufes von 'storeSelection' ausgewählt waren
' Es kann auch keine Auswahl sein
Public Function restoreSelection()
    
    Dim nothingSelected As Boolean
    
    If selectionBeforeMacroStart Is Nothing Then
        nothingSelected = True
    ElseIf selectionBeforeMacroStart.count = 0 Then
        nothingSelected = True
    End If
    
    If nothingSelected Then
        ActiveDocument.ClearSelection
    Else
        selectionBeforeMacroStart.CreateSelection
    End If
    
End Function


Public Function storeViewOriginAndZoom()
    viewOriginXBeforeMacroStart = ActiveDocument.ActiveWindow.ActiveView.originX
    viewOriginYBeforeMacroStart = ActiveDocument.ActiveWindow.ActiveView.originY
    viewZoomBeforeMacroStart = ActiveDocument.ActiveWindow.ActiveView.Zoom
'    MsgBox "Store Zoom: " & viewZoomBeforeMacroStart
End Function


Public Function restoreViewOriginAndZoom()
    If viewZoomBeforeMacroStart > 0 Then
        ActiveDocument.ActiveWindow.ActiveView.Zoom = viewZoomBeforeMacroStart
        ActiveDocument.ActiveWindow.ActiveView.originX = viewOriginXBeforeMacroStart
        ActiveDocument.ActiveWindow.ActiveView.originY = viewOriginYBeforeMacroStart
        
'        MsgBox "Restored Zoom: " & ActiveDocument.ActiveWindow.ActiveView.Zoom
    End If
End Function


Public Function setViewAreaToShape(shape As shape, Optional zoomOutCount As Integer = 2)
    setViewToShapeRange shapeToShapeRange(shape), zoomOutCount
End Function


Public Function setViewToShapeRange(range As shapeRange, Optional zoomOutCount As Integer = 2)
    
    If range Is Nothing Then Err.Raise vbObjectError + 513, , "[Globals.setViewToShapeRange] 'range' ist Nothing "
    If range.count = 0 Then Err.Raise vbObjectError + 513, , "[Globals.setViewToShapeRange] 'range' hat keine Childs "
    
    ' Achtung: Wenn die 'range' leer ist, crashed Corel !!!
    ActiveWindow.ActiveView.SetViewArea range.LeftX, range.BottomY, range.SizeWidth, range.SizeHeight
    
    For i = 1 To zoomOutCount
        ActiveWindow.ActiveView.ZoomOut
    Next i
End Function


Public Function showWarnings(Optional endIfNoDocumentOpen As Boolean = True, Optional whenServerIsOffline As Boolean = True, Optional whenVersionIsOutdated As Boolean, Optional whenNot300DPI As Boolean = True)
    
    If endIfNoDocumentOpen Then
        Globals.endIfNoDocumentOpen
    End If
    
    If whenServerIsOffline Then
        Globals.checkIfServerOnlineAndSelectOfflineWorkPath
    End If
    
    If whenVersionIsOutdated Then
        Globals.checkVersion
    End If
    
    If whenNot300DPI Then
        Globals.warnIfNot300DPI
    End If
    
End Function


Public Function warnIfNot300DPI()
    
    If Not ActiveDocument Is Nothing Then
        If Not ActiveDocument.resolution = 300 Then
'            MsgBox "Das Dokument hat nicht die Standartauflösung von 300 Dpi"
            Dim answer As VbMsgBoxResult: answer = MsgBox("Das Dokument hat nicht die Standartauflösung von 300 Dpi." & vbNewLine & "Soll das Dokument auf 300 Dpi umgestellt werden?", vbYesNoCancel Or vbExclamation)
            If answer = vbCancel Then
                endMacro
            ElseIf answer = vbYes Then
                ActiveDocument.resolution = 300
                ActiveDocument.Dirty = True
                suggestToSavDocumentAfterImportantChange
            End If
        End If
    End If
    
End Function

' Warnt den User, wenn die Wiedergabebasicht des Farbprofils im Dokument nicht auf 'perzeptiv' eingestellt ist und fragt ob es umgestellt werden soll
Public Function warnIfDocumentIsNotRenderPerceptual()
    If ActiveDocument Is Nothing Then Exit Function
    
    If Not ActiveDocument.ColorContext.RenderingIntent = clrRenderPerceptual Then
        Dim answer As VbMsgBoxResult: answer = MsgBox("Die Wiedergabeabsicht des Farbprofils im Dokument ist nicht auf 'perzeptiv' eingestellt. Das führt zu Farbverfälschungen beim Export." & vbNewLine & vbNewLine & "Soll die Wiedergabeabsicht auf 'perzeptiv' umgestellt werden?", vbYesNoCancel Or vbExclamation)
        If answer = vbCancel Then
            endMacro
        ElseIf answer = vbYes Then
            setDocumentRenderPerceptual
            ActiveDocument.Dirty = True
            suggestToSavDocumentAfterImportantChange
        End If
    End If
End Function


Public Function setDocumentRenderPerceptual(Optional doc As document)
    If doc Is Nothing Then Set doc = ActiveDocument
    doc.ColorContext.RenderingIntent = clrRenderPerceptual
End Function


Public Function suggestToSavDocumentAfterImportantChange()
    
    MsgBox "Die Einstellung wurde übernommen. Speichere jetzt das Dokument, damit diese Einstellung gespeichert wird", vbInformation
    
End Function


Public Function warnIfNotFrontMostDocument(Optional logger As logger = Nothing)
    
    If Not ActiveDocument Is Nothing Then
        If Not ActiveDocument.index = Documents.count Then
            If Not logger Is Nothing Then logger.logFATAL "Das Dokument muss das vorderste (ganz rechts) sein. Ansonsten können Fehler auftreten! Abbruch!"
            MsgBox "Das Dokument muss das vorderste (ganz rechts) sein. Ansonsten können Fehler auftreten!", vbCritical
            Globals.endMacro
        End If
    End If
    
End Function


Public Function warnIfNoDocumentAndEnd()
    If ActiveDocument Is Nothing Then
        MsgBox "Kein Dokument geöffnet!", vbExclamation
        Globals.endMacro
    End If
End Function


Public Function endIfNoDocumentOpen()
     If ActiveDocument Is Nothing Then
        Globals.endMacro
     End If
End Function

Public Function endIfNoActiveShape()
    If ActiveShape Is Nothing Then
        Globals.endMacro
    End If
End Function

Public Function warnIfNoActiveShapeAndEnd()
    
    endIfNoActiveShape
    
End Function

' TODO umbenennen zu getActiveShapeAdWarnIfNoneSelected
Public Function getActiveShape(Optional showWarnignAndEndWhenNothingSelected As Boolean = True) As shape
    
    If ActiveShape Is Nothing Then
        If showWarnignAndEndWhenNothingSelected Then
            MsgBox "Keine Form ausgewählt!", vbCritical
            Globals.endMacro
        End If
    End If
    
    Set getActiveShape = ActiveShape
    
End Function


Public Function groupShapes(shapes As shapeRange) As shape
    
    If shapes.count = 0 Then
        'MsgBox "Es ist keine Ebene ausgewählt!"
        Exit Function
    ElseIf shapes.count = 1 Then
        
        Dim rect As shape
        Set rect = ActiveDocument.ActiveLayer.CreateRectangle(0, 0, 10, 10)
        rect.OrderFrontOf shapes.firstShape
        shapes.add rect
        
        Set groupShapes = shapes.group
        rect.delete
        
        Set rect = Nothing
        
    Else
        Set groupShapes = shapes.group
    End If
End Function



Public Function getOpacityDecimal(shape As shape) As Double

    getOpacityDecimal = 1 - getTransparencyDecimal(shape)

End Function

Public Function getTransparencyDecimal(shape As shape) As Double
    
    If shape.transparency.Type = cdrUniformTransparency Then
        getTransparencyDecimal = shape.transparency.Uniform
        Exit Function
    End If
    
    getTransparencyDecimal = 0
    
End Function


Public Sub TestGetShapeIndexInParentGroup()
    
    MsgBox "ShapeIndexInParentGroup: " & getShapeIndexInParentGroup(ActiveShape)
    
End Sub


Public Function getShapeIndexInParentGroup(shape As shape) As Integer
    getShapeIndexInParentGroup = -1
    'TODO was wenn keine ParentGruppe vorhanden ist?
    
    If shape Is Nothing Then
        Err.Raise vbObjectError + 513, , "[Globals.getShapeIndexInParentGroup] 'Shape' ist Nothing "
    End If
    
    If isShapeDeleted(shape) Then
        Err.Raise vbObjectError + 513, , "[Globals.getShapeIndexInParentGroup] Die Referenz von 'Shape' ist ungültig "
    End If
    
    Dim parentShapes As shapes
    Set parentShapes = getParentShapes(shape)
    
    For i = 1 To parentShapes.count
        
        If parentShapes.item(i) Is shape Then
            getShapeIndexInParentGroup = i
            Exit Function
        End If
    Next i

    
End Function

' Gibt zurück, ob 'shapeGroup' eines der .parents von shape ist (rekursiv)
Public Function isShapeGroupOneOfShapesParents(shapeGroup As shape, shape As shape) As Boolean
    
    Dim parent As shape
    
    If hasParentGroup(shape) Then
        Set parent = shape
        While hasParentGroup(parent)
            Set parent = Globals.getParent(parent)
            If parent Is shapeGroup Then
                isShapeGroupOneOfShapesParents = True
                Exit Function
            End If
        Wend
    End If
    
    isShapeGroupOneOfShapesParents = False
End Function


Public Function getLastParentOrSelf(shape As shape) As shape
    Dim result As shape
    Set result = getLastParent(shape)
    
    If result Is Nothing Then Set result = shape
    
    Set getLastParentOrSelf = result
End Function


' Gibt die Hauptgruppe in der das Shape drin liegt. Selbst wenn das Shape noch mehrfach in dieser Hauptgruppe gruppiert ist.
Public Function getLastParent(shape As shape) As shape
    
    Dim parent As shape
    
    If hasParentGroup(shape) Then
        Set parent = shape
        While hasParentGroup(parent)
            Set parent = getParent(parent)
        Wend
    End If
    
    Set getLastParent = parent
End Function


Public Function hasParentGroup(shape As shape) As Boolean

    ' Um zu prüfen, ob das 'shape' in einem anderen shape/gruppe drinsteckt, wird einfach geprüft, ob das shape lose bzw. ganz links (nicht gruppiert) im Dokument liegt
    For i = 1 To shape.layer.shapes.count
        If shape.layer.shapes.item(i) Is shape Then
            hasParentGroup = False
            Exit Function
        End If
    Next i

    hasParentGroup = True
End Function


' Sammelt alle Gruppen in die das Shape ist. Die oberste Gruppe kommt zuerst
Public Function getShapesOfParents(shape As shape) As shapeRange
    
    Dim result As New shapeRange
    
    Dim shapeToLookForParent As shape
    Set shapeToLookForParent = shape
    
    While hasParentGroup(shapeToLookForParent)
        Set shapeToLookForParent = Globals.getParent(shapeToLookForParent)
        result.add shapeToLookForParent
    Wend
    
    Set result = result.ReverseRange
    
    Set getShapesOfParents = result
End Function


' Kopie von 'getParentShapes'
Public Function getSiblingShapes(theShape As shape, Optional includeSelf As Boolean = True) As shapes
    Dim result As shapes
    Set result = getParentShapes(theShape)
    
    If Not includeSelf Then result.RemoveRange Globals.shapeToShapeRange(theShape)
    
    Set getSiblingShapes = result
End Function


' Gibt die Kinder des Vaters eines Shapes zurück. Also die Geschwister von 'Shape' und das 'Shape' selbst
Public Function getParentShapes(theShape As shape) As shapes
    
    If theShape Is Nothing Then
        Err.Raise vbObjectError + 513, , "[Globals.getParentShapes] 'theShape' ist Nothing "
    End If
    
    If isShapeDeleted(theShape) Then
        Err.Raise vbObjectError + 513, , "[Globals.getParentShapes] Die Referenz von 'theShape' ist ungültig "
    End If
    
    'MsgBox "TypeName(theShape.parent)=" & TypeName(theShape.parent)
    
'    MsgBox "[Globals.getParentShapes] theShape.name=" & theShape.name & " hasParentGroup=" & hasParentGroup(theShape)
    
    If hasParentGroup(theShape) Then
        Set getParentShapes = getParent(theShape).shapes
    Else
        Set getParentShapes = theShape.layer.shapes
    End If

End Function


Public Function getAllParentShapesOrSelf(shape As shape) As shapeRange
    
   Dim result As shapeRange
   Set result = getAllParentShapes(shape)
   
   If result.count = 0 Then
        result.add shape
   End If
   
   Set getAllParentShapesOrSelf = result
End Function


' Gibt alle Väter von 'shape' zurück
Public Function getAllParentShapes(shape As shape) As shapeRange
    
    Dim result As New shapeRange
    
    Dim parent As shape
    
    If hasParentGroup(shape) Then
        Set parent = shape
        result.add parent
        While hasParentGroup(parent)
            Set parent = getParent(parent)
            result.add parent
        Wend
    End If
    
    Set getAllParentShapes = result
    
End Function


' ACHTUNG: Vor dem Aufruf sollte man mittels 'Globals.hasParentGroup' prüfen, ob es einen Parent gibt
Public Function getParent(shape As shape) As shape
    ' Prüfen, ob es das Child von einem Powerclip ist
    If Not shape.powerClipParent Is Nothing Then
        ' Bei Powerclips ist der Parent einfach ein "Shapes" Objekt, welches selbst kein Parent hat. Deshalb muss man die Variable 'PowerClipParent' nutzen
        Set getParent = shape.powerClipParent
    Else
        Set getParent = shape.parentGroup
    End If
End Function



Public Function getShapeAboveShape(shape As shape) As shape
    
    Dim siblingShapes As shapeRange
    Set siblingShapes = Globals.shapesToShapeRange(getSiblingShapes(shape))
    
    
    Dim index As Integer
    index = getShapeIndexInShapeRange(shape, siblingShapes)
    
    ' Mindestens 2, denn dann hat der darüber den Index 1 (0 gibts nicht)
    If index > 1 Then
        Set getShapeAboveShape = siblingShapes(index - 1)
    End If
    
End Function



Public Function getShapeIndexInShapeRange(shape As shape, range As shapeRange) As Integer
    
    getShapeIndexInShapeRange = -1
    
    For i = 1 To range.count
        If range(i) Is shape Then
            getShapeIndexInShapeRange = i
            Exit For
        End If
    Next i
    
End Function



Public Sub TestGetShapeAbsoluteIndexInGroupShapeButLayerShape()
    
    Globals.warnIfNoActiveShapeAndEnd
    
    Dim selection As shape
    Set selection = ActiveShape
    
    Dim design As productDesign
    Set design = Globals.getDesignOfShape(selection, True)
    
    Dim layer As ProductDesignLayer
    Set layer = design.findLayerOfShape(selection)
    
    Dim index As Integer
    index = Globals.getShapeAbsoluteIndexInGroupShape(selection, layer.layerShape)
    
    MsgBox "index: " & index
    
End Sub



Public Sub TestGetShapeAbsoluteIndexInGroupShape()
    
    Globals.warnIfNoActiveShapeAndEnd
    
    Dim designs As ProductDesignRange
    Set designs = Globals.getSelectedDesignsOrAllAsRange
    
    If designs.count = 0 Then
        MsgBox "Kein Design ausgewählt"
        End
    End If
    
    Dim design As productDesign
    Set design = designs.getDesign(1)
    
    Dim i As Integer
    For i = 1 To design.getLayers.count
        Dim currLayer As ProductDesignLayer
        Set currLayer = design.getLayers.getLayer(i)
        
        Dim shapesOfLayer As shapeRange
        Set shapesOfLayer = Globals.flattenGroupShape(currLayer.layerShape, , True)
        
        Dim j As Integer
        For j = 1 To shapesOfLayer.count
            shapesOfLayer(j).name = shapesOfLayer(j).name + "[" + CStr(getShapeAbsoluteIndexInGroupShape(shapesOfLayer(j), currLayer.layerShape)) & "]"
        Next j
        
        Set currLayer = Nothing
    Next i
    
End Sub



' Sucht rekursiv nach der Form 'shp' in 'groupShape' in findet dabei den absoluten Index
' Beispielhafter aufbau von Gruppen und Shapes mit ihren absoluten Indexen:
' 1:
' - 2:
'   - 3
' 4:
' - 5
Public Function getShapeAbsoluteIndexInGroupShape(shp As shape, groupShape As shape, Optional ByRef shapeCounter As Integer) As Integer
        
    If Globals.isShapeDeleted(shp) Then Err.Raise vbObjectError + 513, , "[Globals.getShapeAbsoluteIndexInGroupShape] 'shp' ist gelöscht!"
        
    Dim i As Integer
    For i = 1 To groupShape.shapes.count
        Dim currShape As shape
        Set currShape = groupShape.shapes(i)
        
        shapeCounter = shapeCounter + 1
        
        ' 'shp' gefunden !!
        If currShape Is shp Then
            getShapeAbsoluteIndexInGroupShape = shapeCounter
            Exit Function
        End If
        
        ' Gruppe, deshalb rekursiv weitersuchen
        If currShape.Type = cdrGroupShape Then
            Dim resultOfSubGroup As Integer
            resultOfSubGroup = getShapeAbsoluteIndexInGroupShape(shp, currShape, shapeCounter)
            
            ' 'shp' rekursiv gefunden !!
            If Not resultOfSubGroup = -1 Then
                getShapeAbsoluteIndexInGroupShape = resultOfSubGroup
                Exit Function
            End If
        End If
        
        Set currShape = Nothing
    Next i
    
    ' 'shp' nicht gefunden
    getShapeAbsoluteIndexInGroupShape = -1
End Function



Public Function getGroupShapeLastAbsoulteIndex(groupShape As shape) As Integer
    Dim i As Integer
    For i = 1 To groupShape.shapes.count
        Dim currShape As shape
        Set currShape = groupShape.shapes(i)
        
        shapeCounter = shapeCounter + 1
        
        ' Gruppe, deshalb rekursiv weitersuchen
        If currShape.Type = cdrGroupShape Then
            shapeCounter = shapeCounter + getGroupShapeLastAbsoulteIndex(currShape)
        End If
        
        Set currShape = Nothing
    Next i
    
    getGroupShapeLastAbsoulteIndex = shapeCounter
End Function



' C# TODO auch in CShape.cs aufnehmen, damit Formen ohne die Fehlermeldung "Unerwarteter Fehler aufgetreten" kopiert werden können
' Delegiert an TryCopyShapeRange, damit die Retry-Logik nur an einer Stelle existiert.
Public Function TryCopyShape( _
    ByVal sourceShape As shape, _
    Optional ByVal maxRetries As Long = 2, _
    Optional ByVal waitMilliseconds As Long = 0 _
)

    Globals.TryCopyShapeRange Globals.shapeToShapeRange(sourceShape), maxRetries, waitMilliseconds
End Function


' ShapeRange-Variante von TryCopyShape: kopiert die ganze ShapeRange mit Wiederholungsversuchen,
' um den sporadischen "Unerwarteter Fehler" der Zwischenablage abzufangen.
Public Function TryCopyShapeRange( _
    ByVal sourceShapeRange As shapeRange, _
    Optional ByVal maxRetries As Long = 2, _
    Optional ByVal waitMilliseconds As Long = 0 _
)

    Dim attempt As Long
    Dim lastErrNumber As Long
    Dim lastErrDescription As String
    Dim lastErrSource As String

    For attempt = 1 To maxRetries

        Err.Clear
        ' Fehler unten abfangen
        On Error Resume Next

        sourceShapeRange.copy ' Hier kann der Fehler "Unerwarteter Fehler" auftreten

        lastErrNumber = Err.number
        lastErrDescription = Err.Description
        lastErrSource = Err.source

        On Error GoTo 0

        If lastErrNumber = 0 Then
            Exit Function
        End If

        If attempt < maxRetries Then
            DoEvents
            If Not waitMilliseconds = 0 Then Sleep waitMilliseconds
        End If

    Next attempt

    Err.Raise vbObjectError + 1000, _
              "TryCopyShapeRange", _
              "ShapeRange konnte nach " & maxRetries & " Versuchen nicht kopiert werden." & vbCrLf & _
              "ShapeRange: " & Globals.shapeRangeToString(sourceShapeRange) & vbCrLf & _
              "Letzter Fehler: " & lastErrNumber & " - " & lastErrDescription & vbCrLf & _
              "Fehlerquelle: " & lastErrSource
End Function


Public Function copyPasteShape(shapeToCopy As shape, onTopOfShape As Boolean, Optional ignoreEffectShapes As Boolean = False) As shape
    
    Set copyPasteShape = shapeToCopy.duplicate
    
    ' Bei der "NSOSG-A-22x18" wird bei der .Duplicate keine Form zurückgegeben. Dupliziert wird aber.
    ' Deshalb einfach die Form über der akuell ausgewählte Form nehmen. Die Form ist dann das Duplikat
    If copyPasteShape Is Nothing Then
        Set copyPasteShape = Globals.getSiblingShapes(shapeToCopy).item(Globals.getShapeIndexInParentGroup(shapeToCopy) - 1)
    End If
    
    If ignoreEffectShapes Then
        Globals.removeShapeEffectShapes copyPasteShape
    End If

    If onTopOfShape Then
        copyPasteShape.OrderFrontOf shapeToCopy
    End If
    
End Function


' Kopiert die 'shapeRangeToCopy' und überspringt dabei die 'shapesToExclude' (wenn angegeben).
' WICHTIG: Die 'shapesToExclude' müssen Formen aus 'shapeRangeToCopy', sonst kann nicht verglichen werden, welche Formen nicht kopiert werden sollen
Public Function copyPasteShapeRange(shapeRangeToCopy As shapeRange, Optional onTopOfEachShape As Boolean = False, Optional shapesToExclude As shapeRange) As shapeRange
    
    Dim result As New shapeRange
    
    For i = 1 To shapeRangeToCopy.count
        result.add copyPasteShape(shapeRangeToCopy(i), onTopOfEachShape)
    Next i
        
    ' Formen, die von der Kopie ausgeschlossen werden sollen, werden hier gelöscht
    If Not shapesToExclude Is Nothing Then
        If shapesToExclude.count > 0 Then
            Dim shapesToDelete As shapeRange
            Set shapesToDelete = findShapesInCopiedShapeRange(shapeRangeToCopy, shapesToExclude, result)
            
            shapesToDelete.delete
            
            ' Referenzen von gelöschten Formen entfernen
            Globals.removeDeletedShapeFromShapeRange result
        End If
    End If
    
    Set copyPasteShapeRange = result
    
End Function




Public Sub TestCopyPasteShapeRange()
    
    Globals.warnIfNoDocumentAndEnd
    
    Dim shapeA As shape
    Set shapeA = ActiveLayer.CreateRectangle(0, 0, 10, 10)
    shapeA.name = "shapeA"
    
    Dim shapeB As shape
    Set shapeB = ActiveLayer.CreateRectangle(0, 0, 10, 10)
    shapeB.name = "shapeB"
    
    Dim groupRange As New shapeRange
    
    groupRange.add shapeA
    groupRange.add shapeB
    
    Dim groupShape As shape
    Set groupShape = groupRange.group
    
    Dim shapeC As shape
    Set shapeC = ActiveLayer.CreateRectangle(0, 0, 10, 10)
    shapeC.name = "shapeC"
    
    Dim groupRange2 As New shapeRange
    groupRange2.add groupShape
    groupRange2.add shapeC
    
    Dim group2 As shape
    Set group2 = groupRange2.group
    group2.name = "Grupeeee"
    
    copyPasteShapeRange Globals.shapeToShapeRange(group2), False, Globals.shapeToShapeRange(shapeB)
    
End Sub




' Gibt die 'selectionRange' Formen, die sich in 'originalRange' befinden aus der 'copyRange' zurück
Public Function findShapesInCopiedShapeRange(originalRange As shapeRange, shapesToFind As shapeRange, copyRange As shapeRange) As shapeRange
    
    ' Grober nicht-rekursiver Vergleich (müsste eig. rekursiv gemacht werden)
    If Not originalRange.count = copyRange.count Then Err.Raise vbObjectError + 513, , "[Globals.getShapeRangeOfShapeRangeCopy] 'originalRange' ist nicht gleich groß wie 'copyRange' "
    
    Dim result As New shapeRange
    
    For i = 1 To originalRange.count
        Dim currentShape As shape
        Set currentShape = originalRange(i)
        
        If Globals.shapeRangeContainsShape(shapesToFind, currentShape) Then
            result.add copyRange(i)
        End If
        
        ' Rekursion
        If currentShape.Type = cdrGroupShape Then
            result.AddRange findShapesInCopiedShapeRange(currentShape.shapes.All, shapesToFind, copyRange(i).shapes.All)
        End If
        
        Set currentShape = Nothing
    Next i
    
    Set findShapesInCopiedShapeRange = result
End Function





' Sind die Ebenen innerhalb der angegebenen Gruppe alles Bitmapartige Ebenen (Bitmap, Schatten etc.) oder Vektorartige Ebenen (Formen(Kreis, Rechteck etc.), )
Public Function areAllShapesOfGroupEitherVectorOrBitmap(shape As shape, isBitmap As Boolean) As Boolean
    
    For i = 1 To shape.shapes.count
        If shape.shapes(i).Type = cdrGroupShape Then
            
            Dim sameType As Boolean
            sameType = areAllShapesOfGroupEitherVectorOrBitmap(shape.shapes(i), isBitmap)
                
            If Not sameType Then
                areAllShapesOfGroupEitherVectorOrBitmap = False
                Exit Function
            End If
            
        ElseIf Not isBitmapShape(shape.shapes(i)) = isBitmap Then
            areAllShapesOfGroupEitherVectorOrBitmap = False
            Exit Function
        End If
    Next i
    
    areAllShapesOfGroupEitherVectorOrBitmap = True
End Function



Public Function areAllShapesOfGroupType(groupShape As shape, shapeType As cdrShapeType, recursive As Boolean) As Boolean
    
    For i = 1 To groupShape.shapes.count
        
        If Not groupShape.shapes(i).Type = shapeType Then
            Exit Function
        ElseIf groupShape.shapes(i).Type = cdrGroupShape Then
            If recursive Then
                If Not areAllShapesOfGroupType(groupShape.shapes(i), shapeType, recursive) Then
                    Exit Function
                End If
            End If
            
        End If
        
    Next i
    
    areAllShapesOfGroupType = True
End Function



Public Function isBitmapShape(shape As shape) As Boolean

    isBitmapShape = shape.Type = cdrBitmapShape Or shape.Type = cdrDropShadowGroupShape

End Function




Public Sub TestSetShapeOutlinesScaleWithShape()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    setShapeOutlinesScaleWithShape ActiveShape, True
    
End Sub


Public Function setShapesOutlinesScaleWithShape(ByVal range As shapeRange, Optional recursive As Boolean = True, Optional scaleWithShape As Boolean = True)
    
    If recursive Then
        Set range = Globals.flattenShapeRange(range, , , False)
    End If
    
    For i = 1 To range.count
        setShapeOutlinesScaleWithShape range(i), recursive, scaleWithShape
    Next i
    
End Function


' Die Outlines der Formen werden so eingestellt, dass sie sich skalieren, wenn die Form skaliert wird
' Sollte rekursiv gemacht werden
Public Function setShapeOutlinesScaleWithShape(shape As shape, Optional recursive As Boolean = True, Optional scaleWithShape As Boolean = True)

    If shape.Type = cdrGroupShape Then
        
        If recursive Then
            setShapesOutlinesScaleWithShape shape.shapes.All, recursive, scaleWithShape
        End If
        
    Else
        If shape.CanHaveOutline Or shape.Type = cdrConnectorShape Then
            If shape.outline.Type = cdrOutline Then
                
                                
                If shape.outline.Style.DashCount = 0 And Not shape.Type = cdrConnectorShape Then
                    
                    ' Schatten nach innen Effekte auflösen, da diese sonst nicht mehr richtig dargestellt werden,
                    ' wenn die Outline von dem Shape auf 'ScaleWithShape' umgestellt wird
'                    For i = 1 To shape.Effects.count
'                        If shape.Effects.item(i).Type = cdrInnerShadow Then
'                            Dim mainShapeAndShadowShape As shapeRange
'                            Set mainShapeAndShadowShape = shape.Effects.item(i).Separate
'
'                            Dim shadowAsBitmap As shape
'                            Set shadowAsBitmap = mainShapeAndShadowShape(1)
'
'                            Dim shadowWasVisible As Boolean
'                            shadowWasVisible = shadowAsBitmap.visible
'
'                            shadowAsBitmap.visible = True ' Sehr wichtig. Sonst ist 'shadowAsBitmap' nach der 'ConvertToBitmapEx' Nothing
'                            Set shadowAsBitmap = shadowAsBitmap.ConvertToBitmapEx(, , True)
'
'                            ' Den selben Namen übernehmen von dem Shape, der den Schatten geworfen hat. Denn dort könnte sowas stehen wie "_locked"
'                            shadowAsBitmap.name = mainShapeAndShadowShape(2).name
'                            shadowAsBitmap.visible = shadowWasVisible
'
'                            Set shadowAsBitmap = Nothing
'                            Set mainShapeAndShadowShape = Nothing
'                        End If
'                    Next i
                    
                    shape.outline.scaleWithShape = scaleWithShape
                    
                ElseIf scaleWithShape Then
                    ' Damit das Aussehen von gestrichelten Linien beim Skalieren gleich bleibt,
                    ' müssen diese komplett zu Kurven konvertiert werden
                    
                    ' Das gilt auch für ConnectorShapes (Verbindung)
                    Globals.safeConvertShapeToCurves shape
                    Globals.safeConvertShapeOutlineToObject shape
                End If

            End If
            
        End If
    End If
    
    
End Function





Public Function TestSeperateShadows()

    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    seperateShadows ActiveShape, True

End Function


Public Function seperateShadows(shape As shape, Optional recursive As Boolean = True)
    
    If shape.Type = cdrGroupShape Then
    
        If recursive Then
            For i = 1 To shape.shapes.count
                seperateShadows shape.shapes(i), recursive
            Next i
        End If
        
    Else

        ' Schatten nach innen Effekte auflösen, da diese sonst nicht mehr richtig dargestellt werden,
        ' wenn die Outline von dem Shape auf 'ScaleWithShape' umgestellt wird
        For i = 1 To shape.effects.count
            If shape.effects.item(i).Type = cdrInnerShadow Or shape.effects.item(i).Type = cdrDropShadow Then
                Dim mainShapeAndShadowShape As shapeRange
                Set mainShapeAndShadowShape = shape.effects.item(i).Separate
                
                Dim shadowAsBitmap As shape
                Set shadowAsBitmap = mainShapeAndShadowShape(1)
                
                Dim shadowWasVisible As Boolean
                shadowWasVisible = shadowAsBitmap.visible
                
                shadowAsBitmap.visible = True ' Sehr wichtig. Sonst ist 'shadowAsBitmap' nach der 'ConvertToBitmapEx' Nothing
                Set shadowAsBitmap = shadowAsBitmap.ConvertToBitmapEx(, , True)
                
                ' Den selben Namen übernehmen von dem Shape, der den Schatten geworfen hat. Denn dort könnte sowas stehen wie "_locked"
                shadowAsBitmap.name = mainShapeAndShadowShape(2).name
                shadowAsBitmap.visible = shadowWasVisible
                
                Set shadowAsBitmap = Nothing
                Set mainShapeAndShadowShape = Nothing
                
            End If
        Next i
        
    End If

    
End Function



Public Function areAllShapesOfGroupSameType(theType As Integer, shape As shape, recursive As Boolean) As Boolean

    If theType = -1 Then
        theType = findFirstShapeTypeRecursive(shape)
    End If


    For i = 1 To shape.shapes.count
    
        If shape.shapes(i).Type = cdrGroupShape Then
            
            If recursive Then
                Dim sameType As Boolean
                sameType = areAllShapesOfGroupSameType(theType, shape.shapes(i), recursive)
                
                If Not sameType Then
                    areAllShapesOfGroupSameType = False
                    Exit Function
                End If
            End If
            
        ElseIf Not shape.shapes(i).Type = theType Then
            
            'MsgBox "Shape ist nicht vom selben Typ '" & shape.shapes(i).name & "' es ist " & shape.shapes(i).Type & ", aber gesucht wird " & theType
            
            areAllShapesOfGroupSameType = False
            Exit Function
            
        End If
    
    Next i
    
    areAllShapesOfGroupSameType = True
    
End Function



Public Function areAllShapesOfGroupGroups(mainShape As shape) As Boolean
    
    For i = 1 To mainShape.shapes.count
        If Not mainShape.shapes(i).Type = cdrGroupShape Then
            areAllShapesOfGroupGroups = False
            Exit Function
        End If
    Next i
    
    areAllShapesOfGroupGroups = True
    
End Function




'' Unnötig ?????ß
Private Function findFirstShapeTypeRecursive(shape As shape) As Integer

    For i = 1 To shape.shapes.count
        If Not shape.shapes(i).Type = cdrGroupShape Then
            findFirstShapeTypeRecursive = shape.shapes(i).Type
            Exit Function
        Else
            Dim typeFound As Integer
            typeFound = findFirstShapeTypeRecursive(shape.shapes(i))
            
            If Not typeFound = -1 Then
                findFirstShapeTypeRecursive = typeFound
                Exit Function
            End If
            
        End If
    Next i
    
    findFirstShapeTypeRecursive = -1
End Function




Public Function findFirstShapeThatsNotGroupRecursive(shape As shape) As shape

    For i = 1 To shape.shapes.count
        If Not shape.shapes(i).Type = cdrGroupShape Then
            Set findFirstShapeThatsNotGroupRecursive = shape.shapes(i)
            Exit Function
        Else
            Dim foundShape As shape
            Set foundShape = findFirstShapeThatsNotGroupRecursive(shape.shapes(i))
            
            If Not foundShape Is Nothing Then
                Set findFirstShapeThatsNotGroupRecursive = foundShape
                Exit Function
            End If
            
            Set foundShape = Nothing
        End If
    Next i
    
    Set findFirstShapeThatsNotGroupRecursive = Nothing
End Function



Public Function findFirstShapeOfType(shape As shape, cdrShapeType As Integer) As shape
     Set findFirstShapeOfType = shape.shapes.FindShapes(, cdrShapeType, True).firstShape
End Function

' TODO entfernen?
' Farben die bestimmte Formen markieren wie rote oder pinke Hauptformen oder cyanfarbenen Viewboxen (TODO)
Public Function isColorExcludeColor(color As color)
    isColorExcludeColor = isColorRedOrPink(color)
End Function


Public Function isColorStringRed(color As String) As Boolean
    isColorStringRed = (color = getRedHexCode)
End Function


Public Function isColorPink(color As color) As Boolean
    isColorPink = color.name = "CutContour"
End Function


Public Function isColorRed(color As color) As Boolean
    isColorRed = isColorStringRed(color.HexValue)
End Function


Public Function isColorRedOrPink(color As color)
    isColorRedOrPink = (isColorStringRed(color.HexValue) Or isColorPink(color))
End Function


Public Function isOutlineColorRedOrPink(shape As shape)
    isOutlineColorRedOrPink = False
    
    If shape.CanHaveOutline Then
        If Not shape.outline.Type = cdrNoOutline Then
            isOutlineColorRedOrPink = isColorRedOrPink(shape.outline.color)
        End If
    End If
End Function


Public Function getRedHexCode() As String
    getRedHexCode = "#FF0000"
End Function


Public Function convertRedOrPinkEllipsesToCurves(shapes As shapeRange)
    
    Dim redOrPinkShapes As shapeRange
    Set redOrPinkShapes = newCustomShapeTypeQuery(shapes, RedOrPinkShape).search
    
    For i = 1 To redOrPinkShapes.count
        If redOrPinkShapes(i).Type = cdrEllipseShape Then
            redOrPinkShapes(i).ConvertToCurves
        End If
    Next i
    
End Function



' Subtrahiert die kleineren roten Formen (Bohrlöcher etc. die im "designShape" stecken) vom gegebenen "shapeToSubtract"
Public Function subtractSmallerRedOrPinkShapes(layer As ProductDesignLayer, shapeToSubtract As shape, Optional alsoMainShape As Boolean) As shape
    For i = 1 To layer.getAllRedOrPinkShapes.count
       
        Dim sameShape As Boolean
        sameShape = (layer.getAllRedOrPinkShapes.item(i) Is layer.getMainShape)
        If alsoMainShape Or Not sameShape Then
            Set shapeToSubtract = layer.getAllRedOrPinkShapes.item(i).Trim(shapeToSubtract)
        End If
        
    Next i
    Set subtractSmallerRedOrPinkShapes = shapeToSubtract
End Function


Public Function subtractShapeRangeWithShape(sourceShapes As shapeRange, targetShape As shape, Optional leaveSource As Boolean = True, Optional leaveTarget As Boolean = False, _
    Optional logger As logger = Nothing, Optional preventDoubleCut As Boolean = False, Optional keepTargetShapeWhenSameAsSource As Boolean = True) As shape
    
    If Not logger Is Nothing Then logger.addTab , "[Globals.subtractShapeRangeWithShape]"
    
    Dim result As shape
    Set result = targetShape
    
    For i = 1 To sourceShapes.count
        Set result = subtractShape(sourceShapes(i), result, leaveSource, leaveTarget, logger, preventDoubleCut, keepTargetShapeWhenSameAsSource)
    Next i
    
    Set subtractShapeRangeWithShape = result
    If Not logger Is Nothing Then logger.removeTab
End Function


' Throws Exception
' sourceShape schneidet ein Loch in shapesToSubtract, diese werden dann returnt
Public Function subtractShapeWithShapeRange(sourceShape As shape, targetShapes As shapeRange, Optional leaveSource As Boolean = True, Optional leaveTarget As Boolean = False, _
    Optional logger As logger = Nothing, Optional preventDoubleCut As Boolean = False, Optional keepTargetShapeWhenSameAsSource As Boolean = True) As shapeRange
    
    Set subtractShapeWithShapeRange = New shapeRange
    
    For i = 1 To targetShapes.count
        Dim result As shape
        Set result = subtractShape(sourceShape, targetShapes(i), True, leaveTarget, logger, preventDoubleCut, keepTargetShapeWhenSameAsSource)
        
        If Not result Is Nothing Then
            subtractShapeWithShapeRange.add result
        End If
        
        Set result = Nothing
    Next i
    
    If Not leaveSource Then
        sourceShape.delete
    End If
    
End Function



Public Sub TestSubtractShapesNamed()
        
    Dim sourceShape As shape
    Set sourceShape = ActiveLayer.FindShape("sourceShape")
    
    If sourceShape Is Nothing Then
        MsgBox "Ein Shape namens 'sourceShape' konnte nicht gefunden werden!"
        Exit Sub
    End If
    
    Dim targetShape As shape
    Set targetShape = ActiveLayer.FindShape("targetShape")
    
    If targetShape Is Nothing Then
        MsgBox "Ein Shape namens 'targetShape' konnte nicht gefunden werden!"
        Exit Sub
    End If
    
    subtractShape sourceShape, targetShape ' Ist umgekehrt, da die Auswahl immer anders herum ist. Von hinten nach vorne im Ebenenstapel
    MsgBox "Zugeschnitten"
    
End Sub



Public Sub TestSubtractShape()
    
    If ActiveSelectionRange.count = 2 Then
        subtractShape ActiveSelectionRange(2), ActiveSelectionRange(1) ' Ist umgekehrt, da die Auswahl immer anders herum ist. Von hinten nach vorne im Ebenenstapel
        MsgBox "Zugeschnitten"
    Else
        MsgBox "Es müssen 2 Formen ausgewählt sein!"
    End If
    
End Sub


' Throws Exception
' sourceShape schneidet ein Loch in shapeToSubtract
Public Function subtractShape(sourceShape As shape, targetShape As shape, Optional leaveSource As Boolean = True, Optional leaveTarget As Boolean = False, Optional logger As logger = Nothing, _
        Optional preventDoubleCut As Boolean = False, Optional keepTargetShapeWhenSameAsSource As Boolean = True) As shape
    
    If Not logger Is Nothing Then
        logger.logINFO "[Globals.subtractShape] sourceShape: '" & Globals.getShapeDisplayName(sourceShape) & "', targetShape: '" & Globals.getShapeDisplayName(targetShape) & "', leaveSource: '" & leaveSource & "', leaveTarget: '" _
            & leaveTarget & "', preventDoubleCut: '" & preventDoubleCut & "', keepTargetShapeWhenSameAsSource: '" & keepTargetShapeWhenSameAsSource & "'"
        logger.addTab
    End If
    
    
    If sourceShape Is Nothing Then
        Err.Raise vbObjectError + 513, , "[Globals.subtractShape] 'sourceShape' ist Nothing (A)"
    End If
    
     If Globals.isShapeDeleted(sourceShape) Then
        Err.Raise vbObjectError + 513, , "[Globals.subtractShape] Die Referenz von 'sourceShape' ist ungültig (A)"
    End If
    
    If targetShape Is Nothing Then
        Err.Raise vbObjectError + 513, , "[Globals.subtractShape] 'targetShape' ist Nothing (A)"
    End If
    
     If Globals.isShapeDeleted(targetShape) Then
        Err.Raise vbObjectError + 513, , "[Globals.subtractShape] Die Referenz von 'targetShape' ist ungültig (A)"
    End If
    
    
    ' Sichtbarkeit
    ' -------------------------------------------------
    Dim targetShapeWasVisible As Boolean
    targetShapeWasVisible = targetShape.visible
    targetShape.visible = True
    ' -------------------------------------------------
    
    
    If Not logger Is Nothing Then logger.logINFO "First checks passed"
    
    
    
    If Not logger Is Nothing Then logger.logINFO "ensureShapeHasCurve"
    ensureShapeHasCurve targetShape
    ensureShapeHasCurve sourceShape
    
'    correctCurveDirectionsBeforePathFinding sourceShape, targetShape
    
    
    
    ' Verhindert, dass wenn eine Form (bspw. eine 30x20 Platte mit Bohrlöchern) schon die Löcher hat, diese nicht nochmal ausgeschnitten werden,
    ' da Corel sonst die Löcher entfernt (Es wird dann eine 30x20 Platte ohne Bohrlöcher)
    ' -------------------------------------------------
    If preventDoubleCut And Not pathFinder_sourceShapeCurve Is Nothing And Not pathFinder_targetShapeCurve Is Nothing Then
        If Not logger Is Nothing Then logger.logINFO "preventDoubleCut: " & preventDoubleCut & ", prüfe ob 'curveExistsInCurve' true ist:"
        
        If Globals.curveExistsInCurve(pathFinder_sourceShapeCurve, pathFinder_targetShapeCurve, True, 0.1) Then
            
            If Not logger Is Nothing Then logger.logINFO "- curveExistsInCurve: 'Wahr'. leaveSource: '" & leaveSource & "', leaveTarget: '" & leaveTarget & "'"
            
            If Not leaveSource Then
                sourceShape.delete
            End If
            
            Set subtractShape = targetShape
            
            If Not logger Is Nothing Then logger.logINFO "Abbruch! "
            GoTo ExitFunction
        Else
            
            If Not logger Is Nothing Then logger.logINFO "- curveExistsInCurve: 'Falsch'"
        End If
    End If
    ' -------------------------------------------------
    
    
    Dim parentNameOfSourceShape As String
    Dim parentOfSourceShape As shape
    Set parentOfSourceShape = Globals.getParentShapeOfShape(sourceShape)
    parentNameOfSourceShape = Globals.getShapeNameOrNull(parentOfSourceShape)
    
    Dim parentNameOfTargetShape As String
    Dim parentOfTargetShape As shape
    Set parentOfTargetShape = Globals.getParentShapeOfShape(targetShape)
    parentNameOfTargetShape = Globals.getShapeNameOrNull(parentOfTargetShape)
    
    
    ' Parentgruppe beider Shapes und Index darin merken
    ' -------------------------------------------------
    Dim shapesAreInSameGroup As Boolean
    shapesAreInSameGroup = areShapesInSameGroup(sourceShape, targetShape)
    
    Dim parentShapesOftargetShape As shapes
    Set parentShapesOftargetShape = Globals.getParentShapes(targetShape)
    
    ' Wenn das targetShape als einziger in einer Gruppe ist und dann das targetShape aus diese Gruppe rausgenommen wird,
    ' damit es in der selben Gruppe ist wie das sourceShape, dann löst Coreldraw diese Gruppe auf, weil keine Form mehr drin ist.
    ' Deshalb wird eine Form erstellt die das verhindert: 'ungroupPrevent'
    ' Am Ende wird diese Form natürlich wieder gelöscht, wenn targetShape wieder in der Ausgangsgruppe ist
'    Dim ungroupPreventerOfTargetShapeGroup As shape
'    If parentShapesOftargetShape.count = 1 Then
'        Set ungroupPreventerOfTargetShapeGroup = ActiveLayer.CreateRectangle(0, 0, 10, 10)
'        ungroupPreventerOfTargetShapeGroup.name = "Globals.subtractShape.ungroupPreventerOfTargetShapeGroup"
'        ungroupPreventerOfTargetShapeGroup.OrderBackOf targetShape
'    End If
    
    Dim targetShapeIndexBefore As Integer
    targetShapeIndexBefore = Globals.getShapeIndexInParentGroup(targetShape)
    
    Dim parentShapesOfSourceShape As shapes
    Set parentShapesOfSourceShape = Globals.getParentShapes(sourceShape)
    Dim sourceShapeIndexBefore As Integer
    sourceShapeIndexBefore = Globals.getShapeIndexInParentGroup(sourceShape)
    
    
    ' Beide Shapes außerhalb von Gruppen im Dokument platzieren
    If Not shapesAreInSameGroup Then
        Dim targetShapeIsOnCorrectPos As Boolean
        If ActiveLayer.shapes.count > 1 Then
            targetShapeIsOnCorrectPos = targetShape Is ActiveLayer.shapes.item(2)
        End If
    
        ' Hinweis:  Zuvor wurde das targetShape ganz nach vorne geordert. Dadurch gab es ein Problem: Wenn man nach dem Export mit FancyExport/AmazonExport STRG + Z gedrückt hat,
        ' wurden Formen von Gruppen die für die Fotomaske zugeschnitten wurden nicht zurückgesetzt
        If Not targetShapeIsOnCorrectPos Then targetShape.OrderBackOf ActiveLayer.shapes.First
        sourceShape.OrderFrontOf targetShape
    End If
    
    If Not logger Is Nothing Then logger.logINFO "sourceShapeIndexBefore: " & sourceShapeIndexBefore & ", targetShapeIndexBefore: " & targetShapeIndexBefore, ", shapesAreInSameGroup: " & shapesAreInSameGroup
    ' -------------------------------------------------
    
    
    
    
    ' Zuschneiden
    ' -----------------------------
    Dim result As shape
    On Error GoTo TrimError
    Set result = sourceShape.Trim(targetShape, leaveSource, leaveTarget)
    On Error GoTo 0
    
    If Not logger Is Nothing Then logger.logINFO "Trim passed"
    
    
    If result Is Nothing Then
        ' Shapes waren gleich
        If keepTargetShapeWhenSameAsSource Then
            targetShape.delete
            Set targetShape = Nothing
            
            Set subtractShape = Nothing ' Return
            GoTo ExitFunction
        End If
    Else
        Set targetShape = result
    End If
    ' -----------------------------
    
    
    ' Sichtbarkeit wiederherstellen
    ' -------------------------------------------------
    targetShape.visible = targetShapeWasVisible
    ' -------------------------------------------------
    
    
    If Not Globals.isShapeReferenceValid(parentOfSourceShape) Then
        If Not logger Is Nothing Then logger.logWARN "Die Gruppe von 'sourceShape' ist nicht mehr da!"
    End If
    
    If Not Globals.isShapeReferenceValid(parentOfTargetShape) Then
        If Not logger Is Nothing Then logger.logWARN "Die Gruppe von 'targetShape' ist nicht mehr da!"
    End If
    
    
    ' ORDER
    ' Shapes zurück in ihre ursprüngliche Gruppe verschieben (ordern)
    ' -----------------------------------------------------------
    If Not shapesAreInSameGroup Then
        If Not logger Is Nothing Then logger.logINFO "Verschiebe Formen zurück in ihre ursprünglichen Gruppen. 'sourceShapeIndexBefore' zu index #" & sourceShapeIndexBefore & " 'targetShape' zu index #" & targetShapeIndexBefore
        Globals.orderShapeAtIndex targetShape, parentShapesOftargetShape, targetShapeIndexBefore
        Globals.orderShapeAtIndex sourceShape, parentShapesOfSourceShape, sourceShapeIndexBefore
    Else
        If Not logger Is Nothing Then logger.logINFO "Ordern nicht nötig, beide Formen sind in selber Gruppe"
    End If
    ' -----------------------------------------------------------
    
    If leaveSource Then
        Set parentOfSourceShape = Globals.getParentShapeOfShape(sourceShape)
        If Not Globals.getShapeNameOrNull(parentOfSourceShape) = parentNameOfSourceShape Then
            If Not logger Is Nothing Then logger.logWARN "Das 'sourceShape' ist nicht mehr in der selben Gruppe. Vorher: '" & parentNameOfSourceShape & "', jetzt: '" & Globals.getShapeNameOrNull(parentOfSourceShape) & "'"
        End If
    End If
    
    
    If leaveTarget Then
        Set parentOfTargetShape = Globals.getParentShapeOfShape(targetShape)
        If Not Globals.getShapeNameOrNull(parentOfTargetShape) = parentNameOfTargetShape Then
            If Not logger Is Nothing Then logger.logWARN "Das 'targetShape' ist nicht mehr in der selben Gruppe. Vorher: '" & parentNameOfTargetShape & "', jetzt: '" & Globals.getShapeNameOrNull(parentOfTargetShape) & "'"
        End If
    End If
    
    
    ' Pfadrichtungen wieder umkehren, wenn sie zuvor umgekehrt worden sind.
    ' ----------------------------------------------------------------------
    undoCurveDirectionsAfterPathFinding
    ' ----------------------------------------------------------------------
    
    
    
    Set subtractShape = targetShape
ExitFunction:
'    If Not ungroupPreventerOfTargetShapeGroup Is Nothing Then
'        ungroupPreventerOfTargetShapeGroup.delete
'    End If
    
    If Not logger Is Nothing Then logger.removeTab
    Exit Function
TrimError:
    If Not logger Is Nothing Then logger.removeTab
    Err.Raise Err.number, Err.source, Err.Description, Err.HelpFile, Err.HelpContext
End Function



Public Sub TestCorrectCurveDirectionsBeforePathFinding()
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    Dim sourceShape As shape
    Dim targetShape As shape
    Dim dummyShape As shape
    
    ' A
'    Set dummyShape = ActiveLayer.CreateRectangle(0, ActivePage.SizeHeight, ActivePage.SizeWidth, 0)
'    Set sourceShape = dummyShape
    
    ' B
    Set sourceShape = ActiveSelectionRange.firstShape
    Set targetShape = ActiveSelectionRange.lastShape
    
    correctCurveDirectionsBeforePathFinding sourceShape, targetShape
    
    
    If Not dummyShape Is Nothing Then dummyShape.delete
End Sub



Public Function correctCurveDirectionsBeforePathFinding(sourceShape As shape, targetShape As shape, Optional logger As logger) As collection
    
    If Not logger Is Nothing Then logger.addTab , "[Globals.correctCurveDirectionsBeforePathFinding]"
    
    
    ' Sind beide Shapes eine Bitmap, ist die Kurvenrichtung kein Problem (getestet)
    ' Sind beide Vektoren, muss die Richtung geprüft und evtl. korrigiert werden
    ' Ist eine Shape ein Bitmap und das andere ein Vektorshape, dann gilt das auch
    If isVectorShape(sourceShape) And isVectorShape(targetShape) Then
'        sourceShape.CreateSelection ' TODO DEBUG
        
        ensureShapeHasCurve sourceShape
        ensureShapeHasCurve targetShape
        
        Set pathFinder_sourceShapeCurve = sourceShape.curve
        Set pathFinder_targetShapeCurve = targetShape.curve
        
        correctWrongSubPathDirectionsOfCurve pathFinder_sourceShapeCurve
        correctWrongSubPathDirectionsOfCurve pathFinder_targetShapeCurve
        
        If (sourceShape.curve.IsClockwise = targetShape.curve.IsClockwise) Then
            
            sourceShape.curve.ReverseDirection 'Beide Formen dürfen nicht in die selbe Richtung gehen beim subtrahieren. Sonst ist es Addieren
            pathFinder_reversedSourceShapeDirection = True
        End If
    ElseIf isVectorShape(sourceShape) And targetShape.Type = cdrBitmapShape Then
        
        ensureShapeHasCurve sourceShape
        
        Set pathFinder_sourceShapeCurve = sourceShape.curve
        Set pathFinder_targetShapeCurve = targetShape.bitmap.CropEnvelope
        
        correctWrongSubPathDirectionsOfCurve pathFinder_sourceShapeCurve
        
        If (sourceShape.curve.IsClockwise = targetShape.bitmap.CropEnvelope.subPaths.First.IsClockwise) Then
            sourceShape.curve.ReverseDirection
            pathFinder_reversedSourceShapeDirection = True

        End If
    ElseIf sourceShape.Type = cdrBitmapShape And isVectorShape(targetShape) Then

        ensureShapeHasCurve targetShape
        
        Set pathFinder_sourceShapeCurve = sourceShape.bitmap.CropEnvelope
        Set pathFinder_targetShapeCurve = targetShape.curve
        
        correctWrongSubPathDirectionsOfCurve pathFinder_targetShapeCurve
        
        If (sourceShape.bitmap.CropEnvelope.subPaths.First.IsClockwise = targetShape.curve.IsClockwise) Then
            targetShape.curve.ReverseDirection
            pathFinder_reversedTargetShapeDirection = True

        End If
        
    ElseIf sourceShape.Type = cdrBitmapShape And targetShape.Type = cdrBitmapShape Then
        Set pathFinder_sourceShapeCurve = sourceShape.bitmap.CropEnvelope
        Set pathFinder_targetShapeCurve = targetShape.bitmap.CropEnvelope
        
    Else
        If Not logger Is Nothing Then logger.logWARN "Die beiden Formen scheinen vom Typ nicht voneinander subtrahierbar zu sein. sourceShape Typ: '" & Globals.getShapeTypeNameByShape(sourceShape) & "', targetShape Typ: '" & Globals.getShapeTypeNameByShape(targetShape) & "'"
'        MsgBox "sourceShape kann nicht genutzt werden! Name: " & Globals.getShapeDisplayName(sourceShape) & ", " & Globals.getShapeTypeName(sourceShape.Type)
    End If
    
    
    If targetShape Is Nothing Then
        Err.Raise vbObjectError + 513, , "[Globals.subtractShape] 'targetShape' ist Nothing (B)"
    End If
    
    If sourceShape Is Nothing Then
        Err.Raise vbObjectError + 513, , "[Globals.subtractShape] 'sourceShape' ist Nothing (B)"
    End If
    
    If Not logger Is Nothing Then logger.logINFO "Curve direction correction passed"
    
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function undoCurveDirectionsAfterPathFinding(Optional logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[Globals.undoCurveDirectionsAfterPathFinding]"
    If reversedSourceShapeDirection Then
        pathFinder_sourceShapeCurve.ReverseDirection
        'sourceShape.curve.ReverseDirection
    End If
    
    If reversedtargetShapeDirection Then
        If Not targetShape Is Nothing Then
            pathFinder_targetShapeCurve.ReverseDirection
            'targetShape.curve.ReverseDirection
        End If
    End If
    
    If Not logger Is Nothing Then logger.removeTab
End Function



Public Sub TestAreShapesInSameGroupNamed()
    
    MsgBox "Gleicher Parent: " & areShapesInSameGroup(ActiveLayer.FindShape("shapeA"), ActiveLayer.FindShape("shapeB"))
    
End Sub

Public Sub TestAreShapesInSameGroup()
        
    If ActiveSelectionRange.count = 2 Then
        
        MsgBox "Gleicher Parent: " & areShapesInSameGroup(ActiveSelectionRange(1), ActiveSelectionRange(2))
        
    Else
        MsgBox "Es müssen 2 Formen ausgewählt sein"
    End If
End Sub


Public Function areShapesInSameGroup(shapeA As shape, shapeB As shape) As Boolean
    
    ' Fall A: Beide Shapes sind in einer Gruppe
    If Globals.hasParentGroup(shapeA) Then
        If Globals.hasParentGroup(shapeB) Then
            areShapesInSameGroup = shapeA.parentGroup Is shapeB.parentGroup
        End If
    Else
    ' Fall B: Beide sind nicht in einer Gruppe
        If Not Globals.hasParentGroup(shapeB) Then
            areShapesInSameGroup = shapeA.layer Is shapeB.layer
        End If
    End If
    ' Fall C: Ein Shape ist in einer Gruppe und eins nicht. Demnach ist dann 'areShapesInSameGroup' false
    
End Function


Public Function orderShapeAtIndex(shape As shape, parentShapes As shapes, index As Integer, Optional logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[Globals.orderShapeAtIndex] shape: '" & Globals.getShapeDisplayName(shape) & "', index: '" & index & "'"
    
    If index = 1 Then
    
        ' Gruppe mit 0 Childs.
        ' Die Gruppe wird gelöscht und aus dem 'shape' neu erstellt
        If parentShapes.count = 0 Then
            Dim group As shape
            Set group = parentShapes.parent
            
            shape.OrderFrontOf group
            
            Dim newGroup As shape
            Set newGroup = Globals.groupShapes(Globals.shapeToShapeRange(shape))
            
            newGroup.name = group.name
            newGroup.OrderBackOf group
            
            group.delete
            
            If Not logger Is Nothing Then logger.logINFO "Neue Gruppe erstellt"
            
        Else
            If Not logger Is Nothing Then logger.logINFO "Shape vor '" & Globals.getShapeDisplayName(parentShapes.item(index)) & "' sortiert"
            shape.OrderFrontOf parentShapes.item(index)
        End If
        
    Else
        If Not logger Is Nothing Then logger.logINFO "Shape hinter '" & Globals.getShapeDisplayName(parentShapes.item(index - 1)) & "' sortiert"
        shape.OrderBackOf parentShapes.item(index - 1)
    End If
    
    If Not logger Is Nothing Then logger.removeTab
    
End Function




Public Sub TestRemoveDuplicateSubPaths()
    
    If ActiveSelectionRange.count = 2 Then
        Dim firstShape As shape
        Dim secondShape As shape
        
        Set firstShape = ActiveSelectionRange.firstShape
        Set secondShape = ActiveSelectionRange.lastShape
        
        Dim firstCurve As curve
        Dim secondCurve As curve
        
        
        
        If Globals.isVectorShape(firstShape) Then
            Set firstCurve = firstShape.curve
        ElseIf firstShape.Type = cdrBitmapShape Then
            Set firstCurve = firstShape.bitmap.CropEnvelope
        Else
            MsgBox "Erste Form hat keine Kurve!"
            End
        End If
        
        
        If Globals.isVectorShape(secondShape) Then
            Set secondCurve = secondShape.curve
        ElseIf secondShape.Type = cdrBitmapShape Then
            Set secondCurve = secondShape.bitmap.CropEnvelope
        Else
            MsgBox "Zweite Form hat keine Kurve!"
            End
        End If
        
        Globals.removeDuplicateSubPaths firstCurve, secondCurve
        
    Else
        MsgBox "Bitte wähle 2 Formen aus! "
    End If
    
End Sub


' Entfernt doppelt vorkommende kleine Unterpfade (nicht die Hauptform sondern die Löcher davon),
' die bei beiden Kurven vorkommen (curveToRemoveFrom und curveToCompare)
Public Function removeDuplicateSubPaths(curveToRemoveFrom As curve, curveToCompare As curve, Optional toleranceInMM As Double = 0#, Optional reAddDuplicateSubPath As Boolean = False)
    
    Dim curveToRemoveFromBiggestSubPathIndex As Integer
    curveToRemoveFromBiggestSubPathIndex = getBiggestSubPathIndex(curveToRemoveFrom.subPaths)
    Dim curveToCompareBiggestSubPathIndex As Integer
    curveToCompareBiggestSubPathIndex = getBiggestSubPathIndex(curveToCompare.subPaths)
    
    
    For i = curveToRemoveFrom.subPaths.count To 1 Step -1
        
        If Not i = curveToRemoveFromBiggestSubPathIndex Then
            
           Dim msgStr As String
           msgStr = "Nodes Count from Path #" & i & ": " & curveToRemoveFrom.subPaths(i).Nodes.count
'           MsgBox msgStr
            
            For j = 1 To curveToCompare.subPaths.count
                
                If Not j = curveToCompareBiggestSubPathIndex Then
                
                    If Globals.areSubPathsEqual(curveToRemoveFrom.subPaths(i), curveToCompare.subPaths(j), (toleranceInMM)) Then
                        
                        On Error GoTo DisplayCurveError
                        ' Tritt hier ein Fehler auf, wurde eine DisplayCurve und nicht die Echte genutzt
                        curveToRemoveFrom.subPaths(i).delete
                        On Error GoTo 0
                        
                        
                        If reAddDuplicateSubPath Then
                        
                            Dim duplicateSubPathCurve As New curve
                            duplicateSubPathCurve.CopyAssign curveToCompare ' Erstmal alle SubPaths der Kurve hinzufügen ...
                            For k = duplicateSubPathCurve.subPaths.count To 1 Step -1
                                If Not k = j Then
                                    duplicateSubPathCurve.subPaths(k).delete ' ... dann alle außer das Eine löschen
                                End If
                            Next k
                            
                            curveToRemoveFrom.AppendCurve duplicateSubPathCurve
                            
                        End If
                        
                        j = 10000 ' Break. Nächsten SubPath von "curveToRemoveFrom" ansehen
                    End If
                    
                End If
                
            Next j
        
        End If
        
    Next i
    
    Exit Function
DisplayCurveError:
    Err.Raise vbObjectError + 513, , "[Globals.removeDuplicateSubPaths] Vermutlich wurde eine Displayurve und keine Curve verwendet. Fehler: " & Err.Description
End Function




Public Sub TestIntersectShapes()
    
    
    If Not Globals.debugHistory Then
        CorelScriptTools.BeginWaitCursor
        ActiveDocument.BeginCommandGroup "TestIntersectShapes"
    End If
    
    If ActiveSelectionRange.count = 2 Then
        
        Dim sourceShape As shape
        Set sourceShape = ActiveSelectionRange(1)
        Dim targetShape As shape
        Set targetShape = ActiveSelectionRange(2)
        
        intersectShapes sourceShape, targetShape, True, False
        
    Else
        MsgBox "Nicht genügend Shapes ausgewählt"
    End If
    
    If Not Globals.debugHistory Then
        Globals.endMacro
    End If
    
End Sub



Public Sub TestIntersectShapesNamed()
    
    Dim sourceShape As shape
    Set sourceShape = ActiveLayer.FindShape("sourceShape")
    
    If sourceShape Is Nothing Then
        MsgBox "Ein Shape namens 'sourceShape' konnte nicht gefunden werden!"
        Exit Sub
    End If
    
    Dim targetShapes As shapeRange
    Set targetShapes = newCustomShapeTypeQuery(ActiveLayer.shapes.All, ByName).setArgument1("targetShape").setArgument2(StringInside).search
    'Set targetShapes = ActiveLayer.FindShapes("targetShape")
    
    If targetShapes.count = 0 Then
        MsgBox "Ein Shape namens 'targetShape' konnte nicht gefunden werden!"
        Exit Sub
    End If
    
    intersectShapeWithShapeRange sourceShape, targetShapes, True, False, , , Globals.getLogger(True)
    
    
End Sub





' Throws Exception
Public Function intersectShapeWithShapeRange(sourceShape As shape, ByVal shapesToIntersect As shapeRange, Optional leaveSource As Boolean = True, Optional leaveTarget As Boolean = False, _
    Optional keepTargetShapeWhenNoOverlap As Boolean = True, Optional shapesToIgnore As shapeRange, Optional logger As logger) As shapeRange
    
'    On Error GoTo SomeError
    
    Set intersectShapeWithShapeRange = New shapeRange
    
    ' Verhindern, dass Formen doppelt zugeschnitten werden. Kann passieren, wenn eine Form und seine Obergruppe in der Range sind
    Globals.removeGroupChildShapesOfShapeRange shapesToIntersect, False
    
    ' shapesToIgnore entfernen
    If Not shapesToIgnore Is Nothing Then
        Dim shapeToIgnore As shape
        For Each shapeToIgnore In shapesToIgnore
            Globals.removeShapeFromShapeRange shapeToIgnore, shapesToIntersect
        Next shapeToIgnore
    End If
    
    
    Dim i As Integer
    For i = 1 To shapesToIntersect.count
        ' leaveSource wird hier als True angegeben, damit es nicht für das nächste Shape schon weg ist.
        ' Wenn das sourceSHape gelöscht werden soll leaveSource = False dann wird das am Ende unten gemacht
        Dim result As shape
        Set result = intersectShapes(sourceShape, shapesToIntersect(i), True, leaveTarget, keepTargetShapeWhenNoOverlap, logger)
        ' Es kann sein, dass keine neue Form rauskommt ( result also 'Nothing' ist) In dem Fall darf es nicht zur Shaperange hinzugefügt werden. Sonst stürzt Corel ohne Fehlermeldung ab
        If Not result Is Nothing Then
            intersectShapeWithShapeRange.add result
        End If
    Next i
    
    If Not leaveSource Then
        sourceShape.delete
    End If
    
'    On Error GoTo 0
'    Exit Function

'SomeError:
'    Dim shapeName As String
'    If Globals.isShapeReferenceValid(shapesToIntersect(i)) Then
'        shapeName = shapesToIntersect(i).name
'    End If
'    Err.Raise vbObjectError + 513, , "[Globals.intersectShapeWithShapeRange] Fehler: " & Err.Description & ", For-Loop-I=" & i '& ", shapeName=" & shapeName
End Function




' Entfernt ein Shape von einer ShapeRange. Wenn die Form aber in einer Gruppe ist und diese Gruppe in der ShapeRange,
' dann wird die Gruppe entfernt und die Childs hinzugefügt und das Shape, welches
Public Function removeShapeFromShapeRange(shape As shape, range As shapeRange)
    
    If Globals.isShapeInsideAGroup(shape) Then
        
        Dim parentGroups As shapeRange
        Set parentGroups = Globals.getShapesOfParents(shape)
        
        Dim parent As shape
        For Each parent In parentGroups
            ' Wenn eine der Obergruppen vom Shape in der ShapeRange ist, muss die Gruppe in der ShapeRange aufgelößt werden.
            ' Heißt: Gruppe entfernen, Childs hinzufügen
            If Globals.shapeRangeContainsShape(range, parent) Then
                range.RemoveRange Globals.shapeToShapeRange(parent)
                
                range.AddRange parent.shapes.All
            End If
        Next parent
    End If
    
    
    range.RemoveRange Globals.shapeToShapeRange(shape)
End Function



Public Function intersectShapes(sourceShape As shape, ByVal targetShape As shape, Optional leaveSource As Boolean = True, Optional leaveTarget As Boolean = False, _
    Optional keepTargetShapeWhenNoOverlap As Boolean = True, Optional logger As logger) As shape
    
'    MsgBox "[Globals.intersectShapes] sourceShape.name=" & sourceShape.name & ", targetShape.name=" & targetShape.name & ", leaveSource=" & leaveSource & ", leaveTarget=" & leaveTarget
    
    If Not logger Is Nothing Then
        logger.logFINE "[Globals.intersectShapes] sourceShape.name: '" & sourceShape.name & "', targetShape.name: '" & targetShape.name & "', leaveSource: '" & leaveSource & "', leaveTarget: '" & leaveTarget & "'"
        logger.addTab
    End If
    
    ' Prüfen, ob eines der Shape 'Nothing' ist
    If sourceShape Is Nothing Then
        Err.Raise vbObjectError + 513, , "[Globals.intersectShapes] sourceShape ist Nothing"
    End If
    If targetShape Is Nothing Then
        Err.Raise vbObjectError + 513, , "[Globals.intersectShapes] targetShape ist Nothing (A)"
    End If
    
    ' Prüfen, ob die Referenz beider Shapes gültig ist
    If isShapeDeleted(sourceShape) Then
        Err.Raise vbObjectError + 513, , "[Globals.intersectShapes] sourceShape Referenz ist ungültig"
    End If
    If isShapeDeleted(targetShape) Then
        Err.Raise vbObjectError + 513, , "[Globals.intersectShapes] targetShape Referenz ist ungültig"
    End If
    
    ' Prüfen, ob eines der beiden Shapes eine Kurve mit Text ist. (Diese können nicht zugeschnitten werden)
    If isCurveWithText(sourceShape) Then
        Err.Raise vbObjectError + 513, , "[Globals.intersectShapes] sourceShape ist eine Kurve mit gekurvten Text"
    End If
    If isCurveWithText(targetShape) Then
        Err.Raise vbObjectError + 513, , "[Globals.intersectShapes] targetShape ist eine Kurve mit gekurvten Text"
    End If
    
    ' Prüfen ob eines der beiden Shapes ein QR-Code ist
    If Globals.isQRCode(sourceShape) Then
        Err.Raise vbObjectError + 513, , "[Globals.intersectShapes] sourceShape ist ein QR-Code und kann nicht verändert werden"
    End If
    If Globals.isQRCode(targetShape) Then
        Err.Raise vbObjectError + 513, , "[Globals.intersectShapes] targetShape ist ein QR-Code und kann nicht verändert werden"
    End If
    
    
'
    
    If Not ensureShapeHasCurve(sourceShape) Then
'        MsgBox "[Globals.intersectShapes] Error! Keine Vectorform"
'        End
    End If
    
    
    
    Dim targetShapeGroupName As String
    If targetShape.Type = cdrGroupShape Then
        If targetShape.shapes.count = 1 Then
            ' Gruppenname nur merken und dann später neu gruppieren und benennen,
            ' wenn es nur ein Child gibt. Denn nur dann entgruppiert Corel die Gruppe bei Zuschneiden
            targetShapeGroupName = targetShape.name
        End If
    End If
    
    Dim targetShapeParentGroupBefore As shape
    Set targetShapeParentGroupBefore = targetShape.parentGroup
    
    Dim targetShapeParentShapes As shapes
    Set targetShapeParentShapes = Globals.getParentShapes(targetShape)
    
    Dim targetShapeDummySibling As shape
    ' Wenn nur das targetShape in seiner Gruppe ist, dann wird es beim herausholen zum Zuschneiden die Gruppe leer lassen.
    ' Dann gibt es keine Möglichkeit mehr eine Form in die Gruppe einzufügen
    If targetShapeParentShapes.count = 1 Then
        Set targetShapeDummySibling = ActiveLayer.CreateRectangle(0, 0, 1, 1)
        targetShapeDummySibling.name = "Globals.intersectShapes.targetShapeDummySibling_" & Globals.getTemporaryKeyWord
        targetShapeDummySibling.OrderBackOf targetShape
    End If
    
    Dim targetShapeIndexBefore As Integer
    targetShapeIndexBefore = Globals.getShapeIndexInParentGroup(targetShape)
    
    Dim sourceShapeIndex As Integer
    sourceShapeIndex = Globals.getShapeIndexInParentGroup(sourceShape)
    
    Dim targetShapeWasText As Boolean
    targetShapeWasText = targetShape.Type = cdrTextShape
    
    
    ' Kurvenrichtung korrigieren
    ' ------------------------------
'    correctCurveDirectionsBeforePathFinding sourceShape, targetShape
    ' ------------------------------
    
    
    Dim targetShapeWasInvisible As Boolean
    ' Wenn nicht sichtbar, sichtbar machen. Ansonsten würde ein Fehler auftreten
    ' Später wird dann wieder sichtbar gemacht
    If Not targetShape.visible Then
        targetShape.visible = True
        targetShapeWasInvisible = True
    End If
    
    
    Dim targetShapeBackupReference As shape
    Set targetShapeBackupReference = targetShape
    
    ' Wenn 'leaveTarget' true ist, dann wird 'targetShape' behalten.
    ' Wenn 'leaveTarget' false ist, wird das targetShape gelöscht.
    ' Die Referenz wird mit dem sich (aus der Überlappung) neu ergebenen Shape überschrieben.
    Set targetShape = sourceShape.Intersect(targetShape, leaveSource, leaveTarget)
    

    If Not keepTargetShapeWhenNoOverlap Then
        
        ' Wenn das Targetshape nach dem Intersecten Nothing ist, liegt es wahrscheinlich daran, dass beide Formen sich garnicht überlappen und beide jetzt noch da sind
        If targetShape Is Nothing Then
            targetShapeBackupReference.delete
        End If
        
    End If
    
        
    
    
    
    
    
    ' ORDERN
    ' --------------------------------------------------------------
    If Not logger Is Nothing Then logger.logFINE "Ordern:"
    Dim targetsSiblingShapes As shapes
    
    If targetShape Is Nothing Then
        
        If Not logger Is Nothing Then logger.logWARN "[Globals.intersectShapes] 'targetShape' ist nach dem Überlappen Nothing. Es kann sein, dass sich beide Formen nicht überlappt haben"
        'Err.Raise vbObjectError + 513, , "[Globals.intersectShapes] 'targetShape' ist nach dem Überlappen Nothing"
    Else
        
        ' B
        ' ::::::::::::
        ' TODO noch Fehlerhaft
'        Globals.orderShapeAtIndex targetShape, targetShapeParentShapes, targetShapeIndexBefore, logger
        
        
        ' A
        ' ::::::::::::
        If Not targetShape.parentGroup Is targetShapeParentGroupBefore Then
            Set targetsSiblingShapes = targetShapeParentGroupBefore.shapes
            If Not logger Is Nothing Then logger.logFINE "- Da die targetShape.parentGroup('" & Globals.getShapeDisplayName(targetShape.parentGroup) & "') nicht gleich targetShapeParentGroupBefore('" & Globals.getShapeDisplayName(targetShapeParentGroupBefore) & "') ist, "
        Else
            Set targetsSiblingShapes = Globals.getParentShapes(targetShape)
        End If


        ' FALSCH?
        ' Wenn der Index "shapeToIntersectIndexBefore" von targetShape bei seinen vorherigen Parent der Letzte war,
        ' beim Letzten Child hinter-ordern ...

        If targetShapeIndexBefore > targetsSiblingShapes.count Then
            If Not logger Is Nothing Then logger.logFINE "- targetShapeIndexBefore('" & targetShapeIndexBefore & "') >= targetsSiblingShapes.count('" & targetsSiblingShapes.count & "') deshalb nach ganz hinten ordern"
            
            targetShape.OrderBackOf targetsSiblingShapes.item(targetsSiblingShapes.count)

        ElseIf targetShapeIndexBefore = targetsSiblingShapes.count Then
            If Not logger Is Nothing Then logger.logFINE "- targetShape hinter dem letzten ordern"
            targetShape.OrderBackOf targetsSiblingShapes.item(targetsSiblingShapes.count)
        Else

            ' targetShape hat nie seine ParentGroup verlassen. Deshalb ist das Shape, das jetzt an seinem Platz ist um +1 im Index verschoben ... (-> Wenn man den 1. Platz überholt ist der der 2.)
            If targetShapeParentGroupBefore Is targetShape.parentGroup Then
                ' ... aber nur, wenn "shapeToIntersect" nicht nach hinten (hinter seinem eigenem Platz) gerückt ist
                If getShapeIndexInParentGroup(targetShape) < targetShapeIndexBefore Then
                    targetShapeIndexBefore = targetShapeIndexBefore + 1
                End If

            End If

            If Not logger Is Nothing Then logger.logFINE "- Ordern nach Index targetShapeIndexBefore('" & targetShapeIndexBefore & "')"

            ' ... ansonsten einfach vor dem Shape ordern, der die Position von shapeToIntersect eingenommen hat
            targetShape.OrderFrontOf targetsSiblingShapes.item(targetShapeIndexBefore)
        End If
    End If
    ' --------------------------------------------------------------
    
    
    
    undoCurveDirectionsAfterPathFinding
    
    
    If Not targetShape Is Nothing Then
        
        ' GRUPPE WIEDERHERSTELLEN
        ' :::::::::::::::
        ' Wenn 'targetShape' vorher eine Gruppe war, aber wegen dem Zuschnitt entgruppiert wurde, weil es nur eine Form in der Gruppe hatte,
        ' dann hier neu gruppieren
        If Not targetShapeGroupName = "" Then
            Set targetShape = Globals.groupShapes(Globals.shapeToShapeRange(targetShape))
            targetShape.name = targetShapeGroupName
        End If
        
        ' SICHTBARKEIT
        ' :::::::::::::::
        If targetShapeWasInvisible Then
            targetShape.visible = False
        End If
        
        ' Es wird geprüft, ob das "shapeToIntersect" nach dem Prozess wieder in der selben Gruppe ist wie vorher
        If Not targetShape.parentGroup Is targetShapeParentGroupBefore Then
            Dim targetShapeNotInParentGroupError As String
            targetShapeNotInParentGroupError = "[Globals.intersectShapes] targetShape '" & Globals.getShapeDisplayName(targetShape) & "' ist nicht mehr in der Ausgangsgruppe '" & Globals.getShapeDisplayName(targetShapeParentGroupBefore) & "'"
            If Not logger Is Nothing Then logger.logFATAL targetShapeNotInParentGroupError
            Err.Raise vbObjectError + 513, , targetShapeNotInParentGroupError
        End If
        
        ' Da Texte Buchstaben haben können, die sich überlappen, kann es passieren, dass bei den Überlappungen Löcher entstehen
        If targetShapeWasText Then
            targetShape.curve.SelfWeldClosedSubpaths
        End If
    End If
    
    
    If Globals.isShapeReferenceValid(targetShapeDummySibling) Then targetShapeDummySibling.delete
    Set intersectShapes = targetShape
    If Not logger Is Nothing Then logger.removeTab
End Function






Public Sub TestCombineShapeRange()
    
    If ActiveSelectionRange.count > 1 Then
        
        combineShapeRange ActiveSelectionRange
        
    Else
        MsgBox "Nicht genügend Formen ausgewählt"
    End If
End Sub


' ACHTUNG: 'range' sollte entweder nur aus Vektorformen bestehen oder aus Bitmaps
Public Function combineShapeRange(range As shapeRange, Optional leaveSource As Boolean = False, Optional leaveTarget As Boolean = False, Optional doRemoveDuplicateSubPaths As Boolean) As shape
    
    If range.count = 0 Then Exit Function
    
    Dim result As shape
    Set result = range(1)
    
    For i = 2 To range.count
        Set result = combineShapes(result, range(i), doRemoveDuplicateSubPaths)
    Next i
    
    
    Set combineShapeRange = result
End Function


' ACHTUNG: 'range' und 'shape' sollten entweder nur aus Vektorformen bestehen oder aus Bitmaps
Public Function combineShapeWithShapeRange(shape As shape, range As shapeRange, Optional leaveSource As Boolean = False, Optional leaveTarget As Boolean = False, Optional doRemoveDuplicateSubPaths As Boolean) As shape
    
    For i = 1 To range.count
        Set shape = combineShapes(shape, range(i), doRemoveDuplicateSubPaths)
    Next i

    Set combineShapeWithShapeRange = shape
End Function


' Kombiniert (Weld) 2 Formen. Wenn beide Formen Bitmaps sind, werden sie per 'convertToBitmap' zusammengefügt (da bei Bitmaps das normale zusammenfügen dafür sorgt, dass nur eine Bitmap übrig bleibt)
Public Function combineShapes(shapeA As shape, shapeB As shape, Optional leaveSource As Boolean = False, Optional leaveTarget As Boolean = False, Optional doRemoveDuplicateSubPaths As Boolean) As shape
    
    If doRemoveDuplicateSubPaths Then
        removeDuplicateSubPaths Globals.getCurveFromShape(shapeA), Globals.getCurveFromShape(shapeB), 1#, True
    End If
    
    If shapeA.Type = cdrBitmapShape And shapeB.Type = cdrBitmapShape Then
        Dim range As New shapeRange
        range.add shapeA
        range.add shapeB
        
        Set combineShapes = range.ConvertToBitmapEx(cdrRGBColorImage, , True, 300)
    Else
        Set combineShapes = shapeA.Weld(shapeB, leaveSource, leaveTarget)
    End If
    
End Function


' ?? Wenn "leaveTarget" true ist, dann erhält man "range" quasi 2x. Einmal wie die Formen vorher waren und einmal wie sie nach dem zuschneiden sind
' Returnt die neuen Formen von "range"
Public Function trimShapeWithShapeRange(trimmerShape As shape, range As shapeRange, Optional leaveSource As Boolean = True, Optional leaveTarget = False, Optional logger As logger = Nothing) As shapeRange
    
    If Not logger Is Nothing Then logger.logINFO "[Globals.trimShapeWithShapeRange] "
    
    Dim newRange As New shapeRange
    
    For i = 1 To range.count
        
        Dim currentShape As shape
        Set currentShape = range(i)
        
        If Not logger Is Nothing Then logger.logFATAL "    current shape is: " & Globals.getShapeDisplayName(currentShape)
        
        Dim newShape As shape
        Set newShape = trimmerShape.Trim(currentShape, True, leaveTarget)
        
        ' Wenn es kein neues Shape gibt, heißt es, dass das alte Shape nicht verändert wurde
        If newShape Is Nothing Then
            If Not logger Is Nothing Then logger.logFATAL "    newShape Is Nothing"
            
            newRange.add currentShape
        Else
            If Globals.isShapeDeleted(newShape) Then
                If Not logger Is Nothing Then logger.logFATAL "    newShape is deleted"
            Else
                If Not logger Is Nothing Then logger.logINFO "    newShape name: " & Globals.getShapeDisplayName(newShape)
                
                newRange.add newShape
            End If
        End If
        
        
        
        Set newShape = Nothing
    Next i
    
    If Not leaveSource Then
        trimmerShape.delete
    End If
    
    Set trimShapeWithShapeRange = newRange
    
End Function


Public Sub TestTrimShapeWithShapeRange()

    If ActiveSelectionRange.count = 2 Then
        
        Dim shapeA As shape
        Set shapeA = ActiveSelectionRange(1)
        Dim shapeB As shape
        Set shapeB = ActiveSelectionRange(2)
        
        getLogger().reset
        
        trimShapeWithShapeRange shapeA, Globals.shapeToShapeRange(shapeB), , , getLogger()
        
    End If

End Sub


Public Sub TestShapeRangeParentChild()
    Globals.endIfNoDocumentOpen

    Dim range As New shapeRange
    
    Dim rectShape As shape
    Set rectShape = ActiveLayer.CreateRectangle(0, 0, 10, 10)
    rectShape.name = "rectShape"
    
    Dim groupShape As shape
    Set groupShape = Tool.createGroupFunction(rectShape)
    groupShape.name = "groupShape"
    
    range.add groupShape
    range.add rectShape
    
    MsgBox Globals.shapeRangeToString(range)
    
End Sub


Public Function ungroupShapeRange(ByVal range As shapeRange, Optional recursion As Boolean, Optional ByVal recursionLimit As Integer = MAXINT) As shapeRange
    Dim result As New shapeRange
    
    Globals.removeGroupChildShapesOfShapeRange range, False
    
    For i = 1 To range.count
        If range(i).Type = cdrGroupShape Then
            Globals.safeAddShapeRangeToShapeRange ungroupShape(range(i), recursion, recursionLimit), result
        Else
            result.add range(i)
        End If
    Next i
    
    Set ungroupShapeRange = result
End Function


' Entgruppierte die 'groupShape'.
' Aber anders als Corels Shape.Ungroup wird dabei nicht die Auswahl beinflusst
Public Function ungroupShape(groupShape As shape, Optional recursive As Boolean, Optional ByVal recursionLimit As Integer = MAXINT) As shapeRange
    
    If Not groupShape.Type = cdrGroupShape Then Err.Raise vbObjectError + 513, , "[Globals.ungroupShape] 'groupShape' ist keine Gruppenform"
    
    Dim result As New shapeRange
    
    Dim groupShapes As shapeRange
    Set groupShapes = newCustomShapeTypeQuery(groupShape, CorelDrawShape).setRecursive(recursive).setRecursionLimit(recursionLimit).setArgument1(cdrGroupShape).search
    
    For i = 1 To groupShapes.count
        result.AddRange properUngroupShape(groupShapes(i))
    Next i
    
    Set ungroupShape = result
End Function


Private Function properUngroupShape(groupShape As shape) As shapeRange
    Dim childs As shapeRange
    Set childs = groupShape.shapes.All

    ' Childs aus ihrer Gruppe ordern um Gruppe aufzulösen
    childs.OrderFrontOf groupShape

    ' Gruppe löschen, wenn noch da
    If Globals.isShapeReferenceValid(groupShape) Then groupShape.delete

    Set properUngroupShape = childs
End Function


Public Function ungroupShapeGroupAndKeepPosition(shape As shape) As shapeRange

    If shape Is Nothing Then
        Err.Raise vbObjectError + 513, , "[Globals.ungroupShapeGroupAndKeepPosition] 'Shape' ist Nothing "
    End If
    
    If isShapeDeleted(shape) Then
        Err.Raise vbObjectError + 513, , "[Globals.ungroupShapeGroupAndKeepPosition] Die Referenz von 'Shape' ist ungültig "
    End If


    Dim shapeIndex As Integer
    shapeIndex = Globals.getShapeIndexInParentGroup(shape)
    Dim parentShapes As shapes: Set parentShapes = Globals.getParentShapes(shape)
    
    Dim range As shapeRange: Set range = shape.UngroupEx
    
    range.OrderBackOf parentShapes.item(shapeIndex)
    
    Set ungroupShapeGroupAndKeepPosition = range
End Function



Public Function isVectorShape(shape As shape) As Boolean
    
    'MsgBox "[Globals.isVectorShape] Shape.Type=" & Shape.Type
    
    isVectorShape = (shape.Type = cdrCurveShape Or shape.Type = cdrRectangleShape Or shape.Type = cdrEllipseShape Or shape.Type = cdrPolygonShape Or _
            shape.Type = cdrConnectorShape Or Globals.isShapeBSpline(shape) Or shape.Type = cdrPerfectShape)
End Function



Public Function BreakApartShapeSubPaths(shapee As shape) As shapeRange
    
    Dim result As New shapeRange
    
    For i = 1 To shapee.curve.subPaths.count
        
        Dim currShape As shape
        Set currShape = ActiveLayer.CreateCurve(getCurveWithSubPathFromIndex(shapee.curve, i))
        
        Globals.copyPasteShapeLook shapee, currShape
        
        result.add currShape
    Next i
    
    Set BreakApartShapeSubPaths = result
End Function



Public Function getCurveWithSubPathFromIndex(curv As curve, ByVal subPathIndex As Integer) As curve
    
    Dim curveCopy As curve
    Set curveCopy = curv.GetCopy
    
    Dim d As Integer
    d = 1
    Dim deleteIndex As Integer
    deleteIndex = 1
    Do While curveCopy.subPaths.count > 1
        If Not d = subPathIndex Then
            curveCopy.subPaths.item(deleteIndex).delete
        Else
            ' Wenn wir das nichtzulöschende Element erreicht haben, löschen wir immer beim nächsten Index
            deleteIndex = 2
        End If
        d = d + 1
    Loop
    
    Set getCurveWithSubPathFromIndex = curveCopy
    
End Function



Public Function getShapeRangeShapesSortedByBoundingBoxSize(range As shapeRange, Optional ByVal fromSmalToBig As Boolean = True) As shapeRange
    
    Dim shapeSizes As New Dictionary
    
    For i = 1 To range.count
        shapeSizes.add range(i), getAreaOfRect(range(i).boundingBox)
    Next i
   
    Set getShapeRangeShapesSortedByBoundingBoxSize = Globals.collectionToShapeRange(SortDictionaryByNumericValue(shapeSizes, fromSmalToBig))
End Function



Public Function getSubPathsSortedByBoundingBoxSize(curv As curve) As collection
    
    Dim subPathSizes As New Dictionary
    
    For i = 1 To curv.subPaths.count
        subPathSizes.add curv.subPaths(i), getAreaOfRect(curv.subPaths(i).boundingBox)
    Next i
    
    
    Set getSubPathsSortedByBoundingBoxSize = SortDictionaryByNumericValue(subPathSizes)
End Function


Public Function getAreaOfRect(rectA As rect) As Double
    getAreaOfRect = rectA.width * rectA.height
End Function


' Ersatz für 'Shape.Curve.Area': Corel addiert dort die Flächen aller geschlossenen SubPaths, auch die von Löchern.
' Hier wird für jeden geschlossenen SubPath die Verschachtelungstiefe bestimmt (wie viele andere geschlossene SubPaths ihn enthalten):
' Gerade Tiefe (Außenkontur, Insel in einem Loch, ...) -> Fläche addieren. Ungerade Tiefe (Loch, ...) -> Fläche abziehen.
' Unabhängig von Reihenfolge der SubPaths und von IsClockwise. Offene SubPaths werden ignoriert.
' Einheit: wie 'SubPath.Area', also Quadrat der Einheit des Dokuments (bei mm-Dokumenten mm²).
Public Function getCurveAreaWithHoles(curv As curve) As Double

    If curv Is Nothing Then Exit Function ' 0

    ' Geschlossene SubPaths einsammeln
    Dim closedSubPaths As New collection
    Dim subPathItem As subPath
    For Each subPathItem In curv.subPaths
        If subPathItem.Closed Then closedSubPaths.add subPathItem
    Next subPathItem

    Dim closedCount As Long
    closedCount = closedSubPaths.count
    If closedCount = 0 Then Exit Function ' 0

    Dim areas() As Double
    ReDim areas(1 To closedCount)
    Dim boxes() As rect
    ReDim boxes(1 To closedCount)

    Dim i As Long, j As Long
    For i = 1 To closedCount
        areas(i) = Abs(closedSubPaths(i).area)
        Set boxes(i) = closedSubPaths(i).boundingBox
    Next i

    Dim result As Double
    For i = 1 To closedCount

        Dim depth As Long
        depth = 0

        For j = 1 To closedCount
            If i <> j Then

                ' Nur größere SubPaths mit passender BoundingBox können 'i' enthalten (spart die meisten IsPointInside-Aufrufe)
                If areas(j) > areas(i) Then
                    If isRectInsideRect(boxes(i), boxes(j)) Then
                        If isSubPathInsideSubPath(closedSubPaths(i), closedSubPaths(j)) Then depth = depth + 1
                    End If
                End If

            End If
        Next j

        If depth Mod 2 = 0 Then
            result = result + areas(i)
        Else
            result = result - areas(i)
        End If

    Next i

    getCurveAreaWithHoles = result

End Function


Public Function getShapeAreaWithHoles(shapee As shape) As Double

    Dim curv As curve
    Set curv = Globals.getCurveFromShape(shapee)

    ' Z.B. leerer Text hat keine Kurveninformationen
    If curv Is Nothing Then Exit Function ' 0

    getShapeAreaWithHoles = getCurveAreaWithHoles(curv)

End Function


' Prüft ob 'inner' (mit kleiner Toleranz für Berührungen) komplett in 'outer' liegt
Private Function isRectInsideRect(inner As rect, outer As rect) As Boolean
    Const tolerance As Double = 0.00001
    isRectInsideRect = inner.left >= outer.left - tolerance And inner.Right <= outer.Right + tolerance _
                   And inner.Bottom >= outer.Bottom - tolerance And inner.top <= outer.top + tolerance
End Function


' Prüft, ob 'inner' in 'outer' liegt. Statt nur des ersten Nodes (der auf dem Rand von 'outer' liegen kann)
' werden bis zu drei über den SubPath verteilte Nodes getestet; die Mehrheit entscheidet.
Private Function isSubPathInsideSubPath(inner As subPath, outer As subPath) As Boolean

    Dim nodeCount As Long
    nodeCount = inner.Nodes.count
    If nodeCount = 0 Then Exit Function ' False

    Dim indexes(0 To 2) As Long
    indexes(0) = 1
    indexes(1) = nodeCount \ 3 + 1
    indexes(2) = (2 * nodeCount) \ 3 + 1

    Dim tested As Long, insideCount As Long
    Dim lastIndex As Long
    Dim k As Long
    For k = 0 To 2
        ' Doppelte Indizes (bei sehr wenigen Nodes) nicht mehrfach zählen
        If indexes(k) <> lastIndex And indexes(k) <= nodeCount Then
            lastIndex = indexes(k)
            tested = tested + 1
            If outer.IsPointInside(inner.Nodes(indexes(k)).positionX, inner.Nodes(indexes(k)).positionY) Then insideCount = insideCount + 1
        End If
    Next k

    isSubPathInsideSubPath = insideCount * 2 > tested

End Function


Public Sub TestGetShapeAreaWithHoles()

    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd

    Dim curv As curve
    Set curv = Globals.getCurveFromShape(ActiveShape)
    If curv Is Nothing Then Exit Sub

    MsgBox "Curve.Area: " & curv.area & vbCrLf & "getShapeAreaWithHoles: " & getShapeAreaWithHoles(ActiveShape)

End Sub



' Gibt eine neue Collection zurück nur mit den Keys, sortiert nach numerischen Values
Public Function SortDictionaryByNumericValue(ByVal dict As Dictionary, Optional ByVal fromSmalToBig As Boolean = True) As collection
    
    Dim n As Long, i As Long
    Dim keys() As Variant, vals() As Double
    
    If dict Is Nothing Then
        Set SortDictionaryByNumericValue = New collection
        Exit Function
    End If
    
    n = dict.count
    Set SortDictionaryByNumericValue = New collection
    If n = 0 Then Exit Function
    
    ' Keys/Values in Arrays kopieren
    ReDim keys(0 To n - 1)
    ReDim vals(0 To n - 1)
    
    Dim k As Variant
    i = 0
    For Each k In dict.keys
        If Not IsNumeric(dict.item(k)) Then
            Err.Raise vbObjectError + 513, _
                      "[Globals.SortDictionaryByNumericValue]", _
                      "Nicht-numerischer Value bei Key '" & CStr(k) & "': " & TypeName(dict(k))
        End If
        
        If IsObject(k) Then
            Set keys(i) = k
        Else
            keys(i) = k
        End If
        vals(i) = CDbl(dict.item(k))
        i = i + 1
    Next k
    
    ' Sortieren
    QuickSortKeysByVals keys, vals, 0, n - 1, fromSmalToBig
    
    ' Neue Collection in Sort-Reihenfolge befüllen
    For i = 0 To n - 1
        SortDictionaryByNumericValue.add keys(i)
    Next i
    
End Function


'
Private Sub QuickSortKeysByVals(ByRef keys() As Variant, ByRef vals() As Double, ByVal lo As Long, ByVal hi As Long, ByVal fromSmalToBig As Boolean)
    Dim i As Long, j As Long
    Dim pivot As Double
    Dim tmpKey As Variant
    Dim tmpVal As Double
    
    i = lo
    j = hi
    pivot = vals((lo + hi) \ 2)
    
    Do While i <= j
        If fromSmalToBig Then
            Do While vals(i) < pivot: i = i + 1: Loop
            Do While vals(j) > pivot: j = j - 1: Loop
        Else
            Do While vals(i) > pivot: i = i + 1: Loop
            Do While vals(j) < pivot: j = j - 1: Loop
        End If
        
        If i <= j Then
            ' swap vals
            tmpVal = vals(i)
            vals(i) = vals(j)
            vals(j) = tmpVal
            
            ' swap keys (mitziehen)
            If IsObject(keys(i)) Then
                Set tmpKey = keys(i)
            Else
                tmpKey = keys(i)
            End If
            
            If IsObject(keys(j)) Then
                Set keys(i) = keys(j)
            Else
                keys(i) = keys(j)
            End If
            
            If IsObject(keys(j)) Then
                Set keys(j) = tmpKey
            Else
                keys(j) = tmpKey
            End If
            
            i = i + 1
            j = j - 1
        End If
    Loop
    
    If lo < j Then QuickSortKeysByVals keys, vals, lo, j, fromSmalToBig
    If i < hi Then QuickSortKeysByVals keys, vals, i, hi, fromSmalToBig
End Sub



Public Function sortDictionaryKeys(dict As Dictionary, Optional Startindex As Integer = -1) As Dictionary
    
    Dim keys As Variant
    keys = dict.keys
    
    ' Sortieren
    sortArray keys, Startindex
    
    ' Neues Dictionary in sortierter Reihenfolge
    Dim result As New Dictionary
    
    Dim i As Long
    For i = LBound(keys) To UBound(keys)
        result.add keys(i), dict(keys(i))
    Next i
    
    Set sortDictionaryKeys = result
End Function



Public Function sortArray(arr As Variant, Optional Startindex As Integer = -1)
    Dim i As Long, j As Long
    Dim temp As Variant
    
    If Startindex = -1 Then Startindex = LBound(arr)
    
    For i = Startindex To UBound(arr) - 1
        For j = i + 1 To UBound(arr)
            If normalizeTextForComparison(arr(i)) > normalizeTextForComparison(arr(j)) Then
                temp = arr(i)
                arr(i) = arr(j)
                arr(j) = temp
            End If
        Next j
    Next i
End Function

Public Function normalizeTextForComparison(ByVal s As String) As String
    s = LCase(s)
    
    ' Optional: Sonderzeichen glätten
    s = replace(s, "ä", "ae")
    s = replace(s, "ö", "oe")
    s = replace(s, "ü", "ue")
    s = replace(s, "ß", "ss")
    
    normalizeTextForComparison = s
End Function


' Stellt sicher, dass das Shape eine Kurve hat. Ein Rechteck z.B: wird zu Kurven konvertiert
' Siehe auch 'getShapeWithCurve'
Public Function ensureShapeHasCurve(shape As shape) As Boolean
    
    If isVectorShape(shape) Then
        ensureShapeHasCurve = True
        
        If Not shape.Type = cdrCurveShape Then
            Dim shapeIsVisible As Boolean
            shapeIsVisible = shape.visible
            shape.visible = True ' Nur wenn das Shape sichtbar ist, kann Corel das Shape zu eine Kurve umwandeln
            
            shape.ConvertToCurves
            
            shape.visible = shapeIsVisible
        End If
    End If
    
End Function


Public Sub TestGetShapeWithCurve()
    
    If Not ActiveShape Is Nothing Then
        getShapeWithCurve ActiveShape
    End If
    
End Sub


' Wenn 'shape' keine 'Curve' hat, weil es z.B. ein Text ist,
' dann wird eine Kopie vom Text erstellt zu Kurven umgewandelt und zurückgegeben
' Wenn 'shape' aber eine 'Curve' hat wird einfach 'shape' zurückgegeben
' Siehe auch 'ensureShapeHasCurve'
Public Function getShapeWithCurve(shape As shape) As shape
    
    If Not shape.Type = cdrCurveShape Then
        Dim shapeCopy As shape
        Set shapeCopy = Globals.copyPasteShape(shape, True)
        
        Set shapeCopy = convertShapeToCurveShape(shapeCopy)
        
        shapeCopy.name = "Globals.getShapeWithCurve.shapeCopy"
        
        Set getShapeWithCurve = shapeCopy
    Else
        Set getShapeWithCurve = shape
    End If
    
End Function


Public Function convertShapeToCurveShape(ByVal shape As shape, Optional asCopy As Boolean = False) As shape
    
    If shape.Type = cdrBitmapShape Then
        Set convertShapeToCurveShape = convertBitmapToCurveShape(shape, asCopy)
    ElseIf shape.Type = cdrTextShape Then
        Set convertShapeToCurveShape = convertTextShapeToCurveShape(shape, asCopy)
    Else
        
        If asCopy Then
            Set shape = Globals.copyPasteShape(shape, True)
        End If
        
        shape.ConvertToCurves
        
        Set convertShapeToCurveShape = shape
    End If
    
End Function


Public Function convertBitmapToCurveShape(bitmapShape As shape, Optional keepBitmap As Boolean = True) As shape
    
    If Not bitmapShape.Type = cdrBitmapShape Then
        Err.Raise vbObjectError + 513, , "[Globals.convertBitmapToCurveShape] 'bitmapShape' ist keine Bitmap"
    End If
    
    Dim curveShape As shape
    Set curveShape = ActiveLayer.CreateCurve(bitmapShape.bitmap.CropEnvelope)
    
    curveShape.name = "Globals.convertBitmapToCurveShape"
    
    Set convertBitmapToCurveShape = curveShape
End Function


Public Sub TestGetNewShapesSinceStaticID()
    
    Dim maxID As Long
    maxID = getHighestShapeStaticIDActiveLayer
    
    Dim rectShape As shape
    Set rectShape = ActiveLayer.CreateRectangle(0, 0, 10, 10)
    
'    MsgBox GetHighestShapeStaticIDActiveLayer
    
    rectShape.convertToBitmap
    
'    MsgBox "Anfangs: " & maxID & " jetzt " & GetHighestShapeStaticIDActiveLayer
    
    getNewShapesSinceStaticID(maxID).CreateSelection
    
End Sub


' Achtung: Liefert die neuen Formen flach zurück, Gruppe und Childs ggf.
Public Function getNewShapesSinceStaticID(staticID As Long) As shapeRange
    Dim result As New shapeRange
    
    Dim allShapesFlattened As shapeRange
    Set allShapesFlattened = Globals.flattenShapeRange(ActiveLayer.shapes.All, , , False)
    
    Dim s As shape
    For Each s In allShapesFlattened
        If s.staticID > staticID Then
            result.add s
        End If
    Next s
    
    Set getNewShapesSinceStaticID = result
End Function


Public Function getHighestShapeStaticIDActiveLayer() As Long
    
    Dim maxID As Long
    
    maxID = 0
    
    Dim allShapesFlattened As shapeRange
    Set allShapesFlattened = Globals.flattenShapeRange(ActiveLayer.shapes.All, , , False)
    
    Dim s As shape
    For Each s In allShapesFlattened
        If s.staticID > maxID Then
            maxID = s.staticID
        End If
    Next s
    
    getHighestShapeStaticIDActiveLayer = maxID
End Function



Public Sub TestUngroup()
    
    Dim watch As New StopWatch
    watch.startTimer
    
    ' Besser, da keine Änderung an der Auswahl gemacht wird
    ' Und es ist sogar schneller ooooooooooooooooohhhhhhhhhhhhhhhhhhhhhhhhh
    Globals.ungroupShape ActiveShape
    
    ' Schlechter. Von Corel
'    ActiveShape.UngroupEx
    
    MsgBox watch.stopTimer
End Sub



Public Sub TestConvertTextShapeToCurveShape()
    Globals.endIfNoDocumentOpen
    
    convertTextShapeToCurveShape ActiveShape
End Sub

' Konvertiert Text zu einer einzigen Kurve. Denn Corel macht daraus gerne einzelne Formen in einer Gruppe
' Diese Funktion fügt das alles zu einer Form zusammen
'
' Achtung: Leere Textformen sind nach dem Konvertieren 'Nothing'
Public Function convertTextShapeToCurveShape(ByVal shp As shape, Optional asCopy As Boolean = False) As shape
    
    If Not shp.Type = cdrTextShape Then Err.Raise vbObjectError + 513, , "[Globals.convertTextShapeToCurveShape] 'shp' ist kein Text "
    
    If asCopy Then
        Set shp = Globals.copyPasteShape(shp, True)
    End If
    
    Dim highestID As Long
    highestID = getHighestShapeStaticIDActiveLayer
    
    Dim previousName As String
    previousName = shp.name
    
    ' Achtung: Leere Textformen sind nach dem Konvertieren 'Nothing'
    shp.ConvertToCurves
    
    Dim shps As shapeRange
    Set shps = getNewShapesSinceStaticID(highestID)
'    Globals.addShapeRangeName shps, " NewStaticID" ' DEBUG
    
    Globals.removeGroupChildShapesOfShapeRange shps
    Set shps = Globals.ungroupShapeRange(shps, True)
    
    ' Es kann sein, dass Corel keine neue Gruppe gemacht hat und die Form noch immer gültig ist oder beides
    If Globals.isShapeReferenceValid(shp) Then shps.add shp
    
    ' Name beibehalten (Corel entfernt ihn nach dem Konvertieren zu Kurven)
    Globals.addShapeRangeName shps, previousName
    
    Set shp = Globals.combineShapeRange(shps)
    
    
    Set convertTextShapeToCurveShape = shp
End Function


Public Function getBiggestSubPathIndex(subPaths As subPaths) As Integer

    Dim biggestSubPathIndex As Integer
    biggestSubPathIndex = 1
    
    For i = 2 To subPaths.count

        If subPaths(i).area > subPaths(biggestSubPathIndex).area Then
            biggestSubPathIndex = i
        End If
        
    Next i
    
    getBiggestSubPathIndex = biggestSubPathIndex
End Function




Public Function getAllInvisibleShapesOfDesign(designShape As shape) As collection
    
    Dim shapes As New collection
    
    Set getAllInvisibleShapesOfDesign = getAllInvisibleShapesOfDesignRecursive(designShape, shapes)
    
End Function


Private Function getAllInvisibleShapesOfDesignRecursive(shape As shape, shapes As collection) As collection
     For i = 1 To shape.shapes.count
        If shape.shapes(i).Type = cdrGroupShape Then
            Set shapes = getAllInvisibleShapesOfDesignRecursive(shape.shapes(i), shapes)
            
            
        ElseIf shape.shapes(i).outline.Type = cdrNoOutline And shape.shapes(i).fill.Type = cdrNoFill Then
            shapes.add shape.shapes(i)
        End If
     Next i
     
     Set getAllInvisibleShapesOfDesignRecursive = shapes
End Function


Public Function getProductIDShape(designShape As shape) As shape
    
    For i = 1 To designShape.shapes.count
        If isProductID(designShape.shapes(i)) Then
            Set getProductIDShape = designShape.shapes(i)
        End If
    Next i
    
End Function


Public Sub TestIsProductID()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    MsgBox "isProductID: " & isProductID(ActiveShape)
    
End Sub


Public Function isProductID(shape As shape) As Boolean

    isProductID = False

    If shape.Type = cdrTextShape And shape.fill.Type = cdrUniformFill Then
        If isColorProductID(shape.fill.UniformColor) Or isColorProductIDRedToIgnore(shape.fill.UniformColor) Or isColorProductIDColorForProductImageVariant(shape.fill.UniformColor) Then
            isProductID = True
        End If
    End If
End Function

Public Function isColorProductID(color As color) As Boolean
    isColorProductID = isColorStringProductID(color.HexValue)
End Function

Public Function isColorStringProductID(color As String) As Boolean
    isColorStringProductID = color = getGreenHexCode
End Function

Public Sub TestIsColorProductIDColorForProductImageVariant()
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    MsgBox "isColorProductIDColorForProductImageVariant: " & isColorProductIDRedToIgnore(ActiveShape.fill.UniformColor)
End Sub

Public Function isColorProductIDRedToIgnore(color As color) As Boolean
    isColorProductIDRedToIgnore = isColorStringProductIDRedToIgnore(color.HexValue)
End Function

Public Function isColorStringProductIDRedToIgnore(color As String) As Boolean
    isColorStringProductIDRedToIgnore = color = Globals.getRedHexCode
End Function

Public Function isColorProductIDColorForProductImageVariant(color As color) As Boolean
    isColorProductIDColorForProductImageVariant = isColorStringProductIDColorForProductImageVariant(color.HexValue)
End Function

Public Function isColorStringProductIDColorForProductImageVariant(color As String) As Boolean
    isColorStringProductIDColorForProductImageVariant = color = Globals.getBlueHexCode
End Function

Public Function getBlueHexCode() As String
    getBlueHexCode = "#0000FF"
End Function

Public Function getGreenHexCode() As String
    getGreenHexCode = "#00FF00"
End Function


Public Function isShapeMetadata(shape As shape)
    isShapeMetadata = isProductID(shape) Or isShapeFancyCustomizationID(shape)
End Function

Public Function getProductIDFromShape(productIDShape As shape) As String
    getProductIDFromShape = productIDShape.text.Story.text
    getProductIDFromShape = Trim(getProductIDFromShape) ' Leerzeichen abschneiden
    getProductIDFromShape = Globals.removeLineBreaks(getProductIDFromShape)
End Function


Public Function getProductIDTypeHexColor(productIDType As productIDType) As String
    Select Case productIDType
        Case NormalProductID
            getProductIDTypeHexColor = getGreenHexCode
        Case IgnoreProductID
            getProductIDTypeHexColor = getRedHexCode
        Case ProductImageVariantProductID
            getProductIDTypeHexColor = getBlueHexCode
    End Select
End Function


Public Function isShapeFancyCustomizationID(shape As shape) As Boolean
    isShapeFancyCustomizationID = shape.name = "CustomizationID" And isShapeColorShopifyID(shape)
End Function

' Macht es später einfacher die Farbe für Shopify zu tauschen aber auch alte Farben zu akzeptieren
Public Function isShapeColorShopifyID(shape As shape) As Boolean
    If Not shape.CanHaveFill Then Exit Function
    If Not shape.fill.Type = cdrUniformFill Then Exit Function
    
    isShapeColorShopifyID = shape.fill.UniformColor.HexValue = getFancyCustomizationIDHexCode
End Function

Public Function getFancyCustomizationIDHexCode() As String
    getFancyCustomizationIDHexCode = "#000000" ' Schwarz
End Function


Public Function getDesignNumber(productIDString As String) As Integer

    'Index finden
    Dim designNrStartIndex As Integer
    designNrStartIndex = InStr(1, productIDString, "-D") + 1
    
    ' Artikelnummer ohne D-nummer (Standartdesign)
    If designNrStartIndex = 1 Then
        getDesignNumber = -1
        Exit Function
    End If
    
    Dim result As String
    result = Right(productIDString, (Len(productIDString) - designNrStartIndex))
    
    getDesignNumber = CInt(result)
End Function


Public Function isShapeHavingToManyNodes(shape As shape, Optional logger As logger) As Boolean
    
    If Not logger Is Nothing Then logger.addTab , "[Globals.isShapeHavingToManyNodes]"
    
    Dim nodesCount As Long
    nodesCount = Globals.getShapeCurveNodeCount(shape)
    
    If Not logger Is Nothing Then logger.logINFO "nodesCount: '" & nodesCount & "'"
    
    isShapeHavingToManyNodes = nodesCount > 500
    
    If Not logger Is Nothing Then
        logger.logINFO "Returne: '" & isShapeHavingToManyNodes & "'"
        logger.removeTab
    End If
End Function


' Prüft ob die gegebene Gruppe zu viele Formen hat um es weiter zu beachten. Wenn es nähmlich mehr als 50 Formen in der Gruppe sind, ist die Gruppe höchstwahrscheinlich ein Gestaltungselement (Blumen oder so) bzw. eine SVG
Public Function isGroupHavingToManyShapes(groupShape As shape, Optional tooManyLimit As Integer = 50, Optional recursionDepth As Integer = 0) As Boolean
    isGroupHavingToManyShapes = isShapesHavingToManyShapes(groupShape.shapes, tooManyLimit, recursionDepth)
End Function

 
Public Function isShapesHavingToManyShapes(shapes As shapes, Optional tooManyLimit As Integer = 50, Optional recursionDepth As Integer = 0) As Boolean
    isShapesHavingToManyShapes = getShapesCount(shapes, recursionDepth) >= tooManyLimit
End Function


Public Function getShapesCount(shapes As shapes, Optional recursionLimit As Integer = MAXINT) As Integer
    getShapesCount = getShapeRangeCount(shapes.All, recursionLimit)
End Function



Public Function getShapeRangeCount(shapeRange As shapeRange, Optional recursionLimit As Integer = MAXINT) As Integer
    Dim count As Integer
    
    For i = 1 To shapeRange.count
        
        Dim shape As shape
        Set shape = shapeRange(i)
        
        If shape.Type = cdrGroupShape Then
            
            If recursionLimit > 0 Then
                count = count + getShapesCount(shape.shapes, recursionLimit - 1)
            End If
            
        End If
        
        count = count + 1
        
        Set shape = Nothing
    Next i
    
    getShapeRangeCount = count
End Function



Public Function isShapeRect(theShape As shape) As Boolean
    
    isShapeRect = theShape.Type = cdrRectangleShape Or theShape.curve.Nodes.count = 4
    
End Function



Public Function removeTemporaryShapesFromActiveDocument()
    
    If Not ActiveDocument Is Nothing Then
        Dim range As shapeRange
        Set range = newCustomShapeTypeQuery(ActiveDocument.ActiveLayer.shapes.All, ByName).setArgument1("_" & Globals.getTemporaryKeyWord).setArgument2(stringSearchType.StringInside).search
        range.delete
    End If
End Function


Public Function isShapeDeleted(shape As shape) As Boolean
    isShapeDeleted = Not isShapeReferenceValid(shape)
End Function


Public Function isOneOfShapeRangeShapesDeleted(range As shapeRange) As Boolean
    
    For i = 1 To range.count
        If isShapeDeleted(range(i)) Then
            isOneOfShapeRangeShapesDeleted = True
            Exit Function
        End If
    Next i
    
End Function


Public Function removeDeletedShapeFromShapeRange(ByRef range As shapeRange)
        
    For i = range.count To 1 Step -1
        If isShapeDeleted(range(i)) Then
            range.Remove i
        End If
    Next i
    
End Function


' Entfernt alle Shapes aus 'fromRange', die 'rangeToRemove' normal und rekursiv enthält
Public Function removeShapRangeRecursive(fromRange As shapeRange, ByVal rangeToRemove As shapeRange)
    Set rangeToRemove = Globals.flattenShapeRange(rangeToRemove, , True, False)
    
    fromRange.RemoveRange rangeToRemove
End Function



Public Function removeGroupChildShapesOfShapeRange(ByRef range As shapeRange, Optional keepGroupsInGroups As Boolean)
    
'    Debug.Print "[removeGroupChildShapesOfShapeRange]"
    
    For i = range.count To 1 Step -1
        If Not (keepGroupsInGroups And range(i).Type = cdrGroupShape) Then
            If isShapeChildOfOneGroup(range(i), range) Then
                range.Remove i
    '            Debug.Print "    [removeGroupChildShapesOfShapeRange] removed #" & i
            End If
        End If
    Next i
    
End Function


Public Function isShapeChildOfOneGroup(shape As shape, groups As shapeRange) As Boolean
    
'    Debug.Print "[isShapeChildOfOneGroup] shape: " & Globals.getShapeDisplayName(shape)
    
    For i = 1 To groups.count
        Dim currentShape As shape
        Set currentShape = groups(i)
        
        If currentShape.Type = cdrGroupShape Then
            If Not shape.parentGroup Is Nothing Then
                If isShapeChildOfGroup(shape.parentGroup, currentShape) Then
                    isShapeChildOfOneGroup = True
                    
                    Exit Function
                End If
            End If
        End If
        
        Set currentShape = Nothing
    Next i
    
End Function


Public Function isShapeChildOfGroup(shapesParentGroup As shape, group As shape, Optional logger As logger) As Boolean
    
    If Not logger Is Nothing Then logger.addTab , "[Globals.isShapeChildOfGroup]"
    
'    Debug.Print "isShapeChildOfGroup"
'    Debug.Print "    Vergleiche '" & Globals.getShapeDisplayName(shapesParentGroup) & "' mit '" & Globals.getShapeDisplayName(group) & "'"
    If shapesParentGroup Is group Then
'        Debug.Print "        Ist gleich !!!"
        isShapeChildOfGroup = True
        GoTo ExitFunction
    End If
    
    If Not shapesParentGroup.parentGroup Is Nothing Then
        isShapeChildOfGroup = isShapeChildOfGroup(shapesParentGroup.parentGroup, group, logger)
    End If
    
ExitFunction:
    If Not logger Is Nothing Then
        logger.logINFO "Returne '" & isShapeChildOfGroup & "'"
        logger.removeTab
    End If
End Function



Public Function isRectangleBiggerThanOtherRectangle(rectA As rect, rectB As rect, biggerOnOneOrTwoAxis As Boolean) As Boolean
    
    If biggerOnOneOrTwoAxis Then
        isRectangleBiggerThanOtherRectangle = rectA.width > rectB.width Or rectA.height > rectB.height
    Else
        isRectangleBiggerThanOtherRectangle = rectA.width > rectB.width And rectA.height > rectB.height
    End If
    
End Function



Public Function areRectanglesOverlapping(rect1 As rect, rect2 As rect) As Boolean
    
    'MsgBox "rect1.top=" & CStr(rect1.top) & ", rect2.Bottom=" & rect2.Bottom & ", rect1.Bottom=" & rect1.Bottom & ", rect2.top=" & rect2.top
    
    areRectanglesOverlapping = rect1.Right > rect2.left And rect1.left < rect2.Right And rect1.top > rect2.Bottom And rect1.Bottom < rect2.top
    
End Function



Public Function getRectShortestXGap(rectA As rect, rectB As rect) As Double
    Dim xGap As Double
    xGap = max(rectA.left - rectB.Right, rectB.left - rectA.Right)
    
    getRectShortestXGap = xGap
End Function



Public Function areRectanglesOverlappingY(rect1 As rect, rect2 As rect) As Boolean
    areRectanglesOverlappingY = rect1.top > rect2.Bottom And rect1.Bottom < rect2.top
End Function



Public Sub TestAreShapesOverlapping()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    If ActiveSelectionRange.count = 2 Then
        
        MsgBox "areShapesOverlapping: " & areShapesOverlapping(ActiveSelectionRange.firstShape, ActiveSelectionRange.lastShape)
        
    End If
    
End Sub

Public Function areShapesOverlapping(shapeA As shape, shapeB As shape) As Boolean
    
    If Not Globals.areRectanglesOverlapping(shapeA.boundingBox, shapeB.boundingBox) Then Exit Function ' False
    
    Dim curveA As curve
    Set curveA = Globals.getCurveFromShape(shapeA, True)
    
    Dim curveB As curve
    Set curveB = Globals.getCurveFromShape(shapeB, True)
    
    ' Es kann sein, dass 'shapeA' oder 'shapeB' keine Kurveninformationen hat. Wie leerer Text bspw
    If curveA Is Nothing Or curveB Is Nothing Then
        Exit Function ' False
    End If
    
    ' 'IntersectsWith' Prüft, ob die beiden Kurven sich berühren.
    ' Wenn aber die eine Kurve in der Anderen steckt, wird das nicht bemerkt
    ' Deshalb wird noch mittels 'IsPointInside' geprüft, ob die eine Kurve in der anderen Steckt (ohne dass diese sich berühren)
    ' Abfragen sind aber voneinander getrennt, da Corel sonst alle auf einmal ausführt (auch wenn der erste schon True ist
    If curveA.IntersectsWith(curveB) Then
        areShapesOverlapping = True
        
    ElseIf curveA.IsPointInside(curveB.Nodes.First.positionX, curveB.Nodes.First.positionY) Then
        areShapesOverlapping = True
    ElseIf curveB.IsPointInside(curveA.Nodes.First.positionX, curveA.Nodes.First.positionY) Then
        areShapesOverlapping = True
    End If
    
End Function


' Vergleicht Breite und Höhe. Nicht Fläche
Public Function getBiggestShape(range As shapeRange) As shape
    
    Dim biggestShapeSize As Double
    Dim biggestShape As shape
    For i = 1 To range.count
        
        Dim biggerSide As Double
        biggerSide = max(range(i).SizeWidth, range(i).SizeHeight)
        
        If biggerSide > biggestShapeSize Then
            Set biggestShape = range(i)
            biggestShapeSize = biggerSide
        End If
        
    Next i
    
    Set getBiggestShape = biggestShape
    
End Function


Public Function isEmptyTextBox(shape As shape) As Boolean
    If shape.Type = cdrTextShape Then
        If Not shape.text.IsArtisticText Then
            If shape.text.Story.text = "" Then
                isEmptyTextBox = True
            End If
        End If
    End If
End Function


Public Sub TestAreRectanglesInside()
    
    If ActiveSelectionRange.count = 2 Then
        MsgBox areRectanglesInside(ActiveSelectionRange(2).boundingBox, ActiveSelectionRange(1).boundingBox)
    End If
    
End Sub


Public Sub TestAreRectanglesInsideOrEqual()
    
    If ActiveSelectionRange.count = 2 Then
        MsgBox areRectanglesInside(ActiveSelectionRange(2).boundingBox, ActiveSelectionRange(1).boundingBox) Or areRectanglesEqual(ActiveSelectionRange(2).boundingBox, ActiveSelectionRange(1).boundingBox, True, 0.01)
    End If
    
End Sub


Public Function areRectanglesInside(rectInside As rect, rectBigger As rect, Optional allowOverlap As Boolean = False, Optional logger As logger) As Boolean
    
    If Not logger Is Nothing Then logger.addTab , "[Globals.areRectanglesInside]"
    
    If allowOverlap Then
        areRectanglesInside = rectInside.left >= rectBigger.left And rectInside.top <= rectBigger.top And rectInside.Right <= rectBigger.Right And rectInside.Bottom >= rectBigger.Bottom
    Else
        areRectanglesInside = rectInside.left > rectBigger.left And rectInside.top < rectBigger.top And rectInside.Right < rectBigger.Right And rectInside.Bottom > rectBigger.Bottom
    End If
    
    If Not logger Is Nothing Then
        logger.logINFO "Returning " & areRectanglesInside
        logger.removeTab
    End If
End Function

Public Function areRectanglesEqual(rectA As rect, rectB As rect, checkPosition As Boolean, Optional toleranceInMM As Double = 0#) As Boolean
    
    ' Falls das Dokument nicht in MM ist, sonder in Pixel oder so
    Dim toleranceInDocUnits As Double
    toleranceInDocUnits = ActiveDocument.ToUnits(toleranceInMM, cdrMillimeter)
    
    If Not checkPosition Then
        areRectanglesEqual = Abs(rectA.width - rectB.width) <= toleranceInDocUnits And Abs(rectA.height - rectB.height) <= toleranceInDocUnits
    Else
        areRectanglesEqual = _
            Abs(rectA.left - rectB.left) <= toleranceInDocUnits And _
            Abs(rectA.top - rectB.top) <= toleranceInDocUnits And _
            Abs(rectA.Right - rectB.Right) <= toleranceInDocUnits And _
            Abs(rectA.Bottom - rectB.Bottom) <= toleranceInDocUnits
    End If
    
    
    
End Function


Public Sub TestAre2ShapesIntersecting()
    
    Globals.startMacro
    
    Dim range As shapeRange: Set range = ActiveSelectionRange
    
    If range.count = 2 Then
        
        'Gruppen ignorieren
        Dim realShapeA As shape
        If range.item(1).Type = cdrGroupShape Then
            Set realShapeA = findFirstShapeThatsNotGroupRecursive(range.item(1))
        Else
            Set realShapeA = range.item(1)
        End If
        
        Dim realShapeB As shape
        If range.item(2).Type = cdrGroupShape Then
            Set realShapeB = findFirstShapeThatsNotGroupRecursive(range.item(2))
        Else
            Set realShapeB = range.item(2)
        End If
        
        MsgBox "Intersecting = " & isCurveIntersecting(realShapeA, realShapeB)
        
    End If
    
    Globals.endMacro
    
End Sub


Public Sub TestAreCurvesEqual()
    
    If ActiveSelectionRange.count = 2 Then
        
        Dim curveA As curve
        Dim curveB As curve
    
        If ActiveSelectionRange(1).Type = cdrCurveShape Then
            Set curveA = ActiveSelectionRange(1).curve
        ElseIf ActiveSelectionRange(1).Type = cdrBitmapShape Then
            Set curveA = ActiveSelectionRange(1).bitmap.CropEnvelope
        End If
        
        If ActiveSelectionRange(2).Type = cdrCurveShape Then
            Set curveB = ActiveSelectionRange(2).curve
        ElseIf ActiveSelectionRange(2).Type = cdrBitmapShape Then
            Set curveB = ActiveSelectionRange(2).bitmap.CropEnvelope
        End If
        
        
        If Not curveA Is Nothing And Not curveB Is Nothing Then
            MsgBox "Kurven sind gleich? " & areCurvesEqual(curveA, curveB, getLogger(True), , 1.5)
        Else
            MsgBox "Beide Formen müssen Bitmaps oder Kurven sein"
        End If
    Else
        MsgBox "Es müssen 2 Formen ausgewählt sein"
    End If
    
End Sub

' ACHTUNG: Wenn eines der Kurven zwar ein gültiges Objekt ist, aber Variablen von der Kurve ungültig sind, kann es daran liegen, dass das Shape der Kurve nicht sichtbar ist
Public Function areCurvesEqual(curveA As curve, curveB As curve, checkPosition As Boolean, Optional logger As logger = Nothing, Optional toleranceInMM As Double = 0#) As Boolean
    
    If Not logger Is Nothing Then logger.addTab , "[Globals.areCurvesEqual]"
    
    If Not curveA.Nodes.count = curveB.Nodes.count Then
        If Not logger Is Nothing Then logger.logINFO "Punktanzahl nicht gleich! A: '" & curveA.Nodes.count & "', B: '" & curveB.Nodes.count & "'"
        GoTo ExitFunction ' False
    End If

    If Not areRectanglesEqual(curveA.boundingBox, curveB.boundingBox, checkPosition, toleranceInMM) Then
        If Not logger Is Nothing Then logger.logINFO "Boundingboxen sind nicht gleich!"
        GoTo ExitFunction ' False
    End If
    
    If Not curveA.subPaths.count = curveB.subPaths.count Then
        If Not logger Is Nothing Then logger.logINFO "Anzahl der subPaths nicht übereinstimmend!"
        GoTo ExitFunction ' False
    End If
    
    
    Dim curveABiggestSubPathIndex As Integer
    curveABiggestSubPathIndex = Globals.getBiggestSubPathIndex(curveA.subPaths)
    Dim curveABiggestSubPath As subPath
    Set curveABiggestSubPath = curveA.subPaths.item(curveABiggestSubPathIndex)
    
    Dim curveBBiggestSubPathIndex As Integer
    curveBBiggestSubPathIndex = Globals.getBiggestSubPathIndex(curveB.subPaths)
    Dim curveBBiggestSubPath As subPath
    Set curveBBiggestSubPath = curveB.subPaths.item(curveBBiggestSubPathIndex)
    
    
    If Not areSubPathsEqual(curveABiggestSubPath, curveBBiggestSubPath, checkPosition, toleranceInMM, logger) Then
        If Not logger Is Nothing Then logger.logINFO "Die beiden Haupt-SubPaths sind nicht gleich!"
        GoTo ExitFunction ' False
    End If
    
    
    ' Kleinere SubPaths sammeln
    ' ------------------------------------------
    Dim curveAsmallerSubPaths As New collection
    For i = 1 To curveA.subPaths.count
        If Not i = curveABiggestSubPathIndex Then
            curveAsmallerSubPaths.add curveA.subPaths(i)
        End If
    Next i
    
    Dim curveBsmallerSubPaths As New collection
    For i = 1 To curveB.subPaths.count
        If Not i = curveBBiggestSubPathIndex Then
            curveBsmallerSubPaths.add curveB.subPaths(i)
        End If
    Next i
    ' ------------------------------------------
    
    
    For i = 1 To curveAsmallerSubPaths.count
    
        Dim found As Boolean
        For j = 1 To curveBsmallerSubPaths.count
        
            If areSubPathsEqual(curveAsmallerSubPaths(i), curveBsmallerSubPaths(j), checkPosition, toleranceInMM, logger) Then
                curveBsmallerSubPaths.Remove j
                found = True
                Exit For
            End If
            
        Next j
        
        If Not found Then
            If Not logger Is Nothing Then logger.logINFO "Der #" & i & " kleine subPath von curveA konnte nicht in einen der kleineren subpaths von curveB gefunden werden !"
            GoTo ExitFunction ' False
        End If
    Next i
    
    areCurvesEqual = True
ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
End Function



Public Sub VisualizeNodeIndexies()
    
    If Not ActiveShape Is Nothing Then
        
        If Globals.ensureShapeHasCurve(ActiveShape) Then
            
            Dim theShape As shape
            Set theShape = ActiveShape
            
            Dim nodeTextBoxSize As Double
            nodeTextBoxSize = IIf(theShape.SizeWidth > theShape.SizeHeight, theShape.SizeWidth, theShape.SizeHeight)
            nodeTextBoxSize = nodeTextBoxSize / 80
            
            Globals.startMacro
            Globals.storeSelection
            ActiveDocument.BeginCommandGroup "VisualizeNodeIndexies"
            
            For i = 1 To theShape.curve.subPaths.count
                Dim currentSubPath As subPath
                Set currentSubPath = theShape.curve.subPaths.item(i)
                
                ActiveLayer.CreateParagraphText currentSubPath.boundingBox.left, currentSubPath.boundingBox.top, currentSubPath.boundingBox.Right, currentSubPath.boundingBox.Bottom, i
                ActiveShape.text.FitTextToFrame
                ActiveShape.text.Story.alignment = cdrCenterAlignment
                ActiveShape.name = "SubPath #" & i
                
                For j = 1 To currentSubPath.Nodes.count
                    Dim currentNode As Node
                    Set currentNode = currentSubPath.Nodes(j)
                    
                    ActiveLayer.CreateParagraphText currentNode.positionX - nodeTextBoxSize, currentNode.positionY - nodeTextBoxSize, currentNode.positionX + nodeTextBoxSize, currentNode.positionY + nodeTextBoxSize, j
                    ActiveShape.text.FitTextToFrame
                    ActiveShape.text.Story.alignment = cdrCenterAlignment
                    ActiveShape.name = "Node #" & j & " of subPath #" & i
                    
                    Set currentNode = Nothing
                Next j
                
                Set currentSubPath = Nothing
            Next i
            
        Else
            MsgBox "Form ist keine Kurve"
        End If
        
    End If
    
    Globals.restoreSelection
    Globals.endMacro
    
End Sub


Public Sub TestDeleteSameCurvesOfShapes()
    
    If ActiveSelectionRange.count = 2 Then
        getLogger().reset
    
        deleteSameCurvesOfShapes ActiveSelectionRange(1), ActiveSelectionRange(2), , getLogger()
    End If
    
End Sub


Public Function deleteSameCurvesOfShapes(sourceShape As shape, targetShape As shape, Optional toleranceInMM As Double = 0#, Optional logger As logger)
    
    If Not logger Is Nothing Then
        logger.logINFO "Globals.deleteSameCurvesOfShapes"
        logger.addTab
    End If
    
    
    Dim sourceCurve As curve
    Set sourceCurve = Globals.getCurveFromShape(sourceShape, False)
    
    Dim targetCurve As curve
    Set targetCurve = Globals.getCurveFromShape(targetShape, False)
    
    If Not logger Is Nothing Then logger.logINFO "sourceCurve.subPaths.count: " & sourceCurve.subPaths.count & ", targetCurve.subPaths.count: " & targetCurve.subPaths.count
    
    If sourceCurve.subPaths.count < targetCurve.subPaths.count Then
        deleteSameCurves sourceCurve, targetCurve, toleranceInMM, logger
    Else
        deleteSameCurves targetCurve, sourceCurve, toleranceInMM, logger
    End If
    
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function deleteSameCurves(sourceCurve As curve, targetCurve As curve, Optional toleranceInMM As Double = 0#, Optional logger As logger)
    
    If Not logger Is Nothing Then
        logger.logINFO "Globals.deleteSameCurves"
        logger.addTab
    End If
    
    
    Dim targetCurveSameSubPathsIndexies As collection
    Set targetCurveSameSubPathsIndexies = getCurveSubPathIndexiesInCurve(sourceCurve, targetCurve, True, True, toleranceInMM, Nothing)
    
'    If Not logger Is Nothing Then logger.logINFO "targetCurveSameSubPathsIndexies: " & Globals.collectionToString(targetCurveSameSubPathsIndexies, logger.getTabCount)
'    If Not logger Is Nothing Then logger.logINFO "targetCurve subPaths count: " & targetCurve.subPaths.count
    
    For i = 1 To targetCurveSameSubPathsIndexies.count
'        If Not logger Is Nothing Then logger.logINFO "Lösche SubPath #" & targetCurveSameSubPathsIndexies(i) & ", von targetCurve. Diese hat " & targetCurve.subPaths(targetCurveSameSubPathsIndexies(i)).Nodes.count & " Nodes"
        targetCurve.subPaths(targetCurveSameSubPathsIndexies(i)).delete
'        If Not logger Is Nothing Then logger.logINFO "Jetzt hat er " & targetCurve.subPaths(targetCurveSameSubPathsIndexies(i)).Nodes.count & " Nodes"
        
        ' Indexe aktuelisieren / nachrücken, da ein SubPath gelöscht wurde
        For j = 1 To targetCurveSameSubPathsIndexies.count
            ' Nur die Indexe aktuelisieren, die (indexmäßig) nach dem jetzigen (i) kommen
            If targetCurveSameSubPathsIndexies(j) > targetCurveSameSubPathsIndexies(i) Then
                Globals.changeValueInCollectionAtIndex targetCurveSameSubPathsIndexies(j) - 1, (j), targetCurveSameSubPathsIndexies
            End If
        Next j
    Next i
    
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function getCurveSubPathIndexiesInCurve(sourceCurve As curve, targetCurve As curve, checkPosition As Boolean, Optional onylAllSubPaths As Boolean = True, Optional toleranceInMM As Double = 0#, Optional logger As logger = Nothing) As collection
    
    If Not logger Is Nothing Then
        logger.logINFO "Globals.getCurveSubPathIndexiesInCurve"
        logger.addTab
    End If
    
    Dim indexies As New collection
    
    If Not logger Is Nothing Then logger.logFINER "Prüfe ob targetCurve.subPaths.count(" & (targetCurve.subPaths.count) & ") größer als sourceCurve.subPaths.count(" & (sourceCurve.subPaths.count) & ") ist"
    If targetCurve.subPaths.count > sourceCurve.subPaths.count Then
        If Not logger Is Nothing Then logger.logFINER "- Richtig"
        
        
        For i = 1 To sourceCurve.subPaths.count
            
            Dim index As Integer
            index = getSubPathIndexInSubPaths(sourceCurve.subPaths(i), targetCurve.subPaths, checkPosition, toleranceInMM, logger)
            
            If Not index = -1 Then
                indexies.add index
            Else
                If onylAllSubPaths Then
                    Set getCurveSubPathIndexiesInCurve = New collection ' Leere Collection returnen
                    GoTo ExitFunction
                End If
            End If
            
        Next i
        
        Set getCurveSubPathIndexiesInCurve = indexies
        
    Else
        If Not logger Is Nothing Then logger.logINFO "- Falsch"
        Set getCurveSubPathIndexiesInCurve = New collection ' Leere Collection returnen
        GoTo ExitFunction
    End If
    
ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
End Function


' Gibt zurück, ob 'sourceCurve' in der 'targetCurve' exestiert. Also ob die Pfade von 'sourceCurve' auch in 'targetCurve' exestieren
Public Function curveExistsInCurve(sourceCurve As curve, targetCurve As curve, checkPosition As Boolean, Optional toleranceInMM As Double = 0#, Optional logger As logger = Nothing) As Boolean
    
    If Not logger Is Nothing Then
        logger.logINFO "[Globals.curveExistsInCurve]"
        logger.addTab
    End If
    
    If sourceCurve Is Nothing Then
        Err.Raise vbObjectError + 513, , "[Globals.curveExistsInCurve] 'sourceCurve' ist Nothing "
    End If
    
    If targetCurve Is Nothing Then
        Err.Raise vbObjectError + 513, , "[Globals.curveExistsInCurve] 'targetCurve' ist Nothing "
    End If
    
    
    If Not logger Is Nothing Then logger.logFINER "Prüfe ob targetCurve.subPaths.count(" & (targetCurve.subPaths.count) & ") größer als sourceCurve.subPaths.count(" & (sourceCurve.subPaths.count) & ") ist:"
    If targetCurve.subPaths.count > sourceCurve.subPaths.count Then
        If Not logger Is Nothing Then logger.logFINER "- Richtig"
        
        For i = 1 To targetCurve.subPaths.count
            
            If Not logger Is Nothing Then logger.logFINER "i: '" & i & "'"
            
            If hasSubPathsEqualSubPath(sourceCurve.subPaths, targetCurve.subPaths(i), checkPosition, toleranceInMM, logger) Then
                curveExistsInCurve = True
                GoTo ExitFunction
            End If
            
        Next i
        
    Else
        If Not logger Is Nothing Then logger.logINFO "- Falsch"
        curveExistsInCurve = False
        GoTo ExitFunction
    End If
    
    
    curveExistsInCurve = False
    
ExitFunction:
    If Not logger Is Nothing Then
        logger.logINFO "Returning '" & curveExistsInCurve & "'"
        logger.removeTab
    End If
End Function


Public Function hasSubPathsEqualSubPath(subPaths As subPaths, subPath As subPath, checkPosition As Boolean, Optional toleranceInMM As Double = 0#, Optional logger As logger = Nothing) As Boolean
    
    If Not logger Is Nothing Then
        logger.logFINER "[Globals.hasSubPathsEqualSubPath] subPaths.Count: '" & subPaths.count & "', toleranceInMM: '" & toleranceInMM & "'"
        logger.addTab
    End If
    
    If Not getSubPathIndexInSubPaths(subPath, subPaths, checkPosition, toleranceInMM, logger) = -1 Then
        hasSubPathsEqualSubPath = True
    End If
    
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function getSubPathIndexInSubPaths(subPath As subPath, subPaths As subPaths, checkPosition As Boolean, Optional toleranceInMM As Double = 0#, Optional logger As logger = Nothing) As Integer
    If Not logger Is Nothing Then
        logger.logFINER "[Globals.getSubPathIndexInSubPaths] subPaths.Count: '" & subPaths.count & "', toleranceInMM: '" & toleranceInMM & "'"
        logger.addTab
    End If
    
    getSubPathIndexInSubPaths = -1 ' Default
    
    For i = 1 To subPaths.count
        If areSubPathsEqual(subPaths(i), subPath, checkPosition, toleranceInMM, logger) Then
            getSubPathIndexInSubPaths = i
            GoTo ExitFunction
        End If
    Next i
    
ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function areSubPathsEqual(pathA As subPath, pathB As subPath, checkPosition As Boolean, Optional toleranceInMM As Double = 0#, Optional logger As logger = Nothing) As Boolean
    
    If Not logger Is Nothing Then
        logger.logINFO "[Globals.areSubPathsEqual]"
        logger.addTab
    End If
    
    If Not pathA.Nodes.count = pathB.Nodes.count Then
        If Not logger Is Nothing Then logger.logFINER "Punktanzahl nicht gleich! A: '" & pathA.Nodes.count & "', B: '" & pathB.Nodes.count & "'"
        GoTo ExitFunction ' False
    End If
    
    If Not areRectanglesEqual(pathA.boundingBox, pathB.boundingBox, checkPosition, toleranceInMM) Then
        If Not logger Is Nothing Then logger.logFINER "Boundingboxen sind nicht gleich!"
        GoTo ExitFunction ' False
    End If
    
    
    ' Zuerst werden 2 gleiche Nodes gesucht und dann werden von da an die folgenden Nodes verglichen
    Dim pathBStartNodeIndex As Integer
    pathBStartNodeIndex = -1
    
    For i = 1 To pathA.Nodes.count
        If areNodesEqual(pathA.Nodes(1), pathB.Nodes(i), checkPosition, toleranceInMM) Then
            pathBStartNodeIndex = i
            Exit For
        End If
    Next i
    
    If pathBStartNodeIndex = -1 Then
        If Not logger Is Nothing Then logger.logFINER "In pathA wurde keine Node gefunden die mit der ersten Node von pathB übereinstimmt"
        GoTo ExitFunction ' False
    End If
    
    If Not logger Is Nothing Then logger.logFINEST "pathBStartNodeIndex: " & pathBStartNodeIndex
    
    ' TODO beachten, wenn ein Pfad nicht im Uhrzeigersinn verläuft
    
    Dim pathBDirectionNegative As Boolean
    pathBDirectionNegative = Not (pathA.IsClockwise = pathB.IsClockwise)
    
    For i = 1 To pathA.Nodes.count
        Dim pathBIndex As Integer
        pathBIndex = loopInteger(i, pathB.Nodes.count, pathBStartNodeIndex - 1, pathBDirectionNegative, False)
        
        
        If Not areNodesEqual(pathA.Nodes(i), pathB.Nodes(pathBIndex), checkPosition, toleranceInMM) Then
            If Not logger Is Nothing Then logger.logFINER "Punkt #" & i & " und #" & pathBIndex & " nicht gleich!"
            GoTo ExitFunction ' False
        Else
            If Not logger Is Nothing Then logger.logFINEST "Punkt #" & i & " und #" & pathBIndex & " sind gleich!"
        End If
    Next i
    
    areSubPathsEqual = True
    
ExitFunction:
    If Not logger Is Nothing Then
        logger.logFINER "Returning " & areSubPathsEqual
        logger.removeTab
    End If
End Function



Public Function areShapesCurvesEqual(shapeA As shape, shapeB As shape, checkPosition As Boolean, Optional typeMustBeSame As Boolean = False, Optional toleranceInMM As Double = 0#, Optional logger As logger) As Boolean
    
    If Not logger Is Nothing Then logger.addTab , "[Globals.areShapesCurvesEqual] shapeA: '" & Globals.getShapeDisplayName(shapeA) & "', shapeB: '" & Globals.getShapeDisplayName(shapeB) & "'"
    
    If typeMustBeSame Then
        If Not shapeA.Type = shapeB.Type Then
            logger.logINFO "Typen nicht gleich!"
            GoTo ExitFunction
        End If
    End If
    
    If shapeA.Type = cdrTextShape Then
        areShapesCurvesEqual = areTextShapesEqual(shapeA, shapeB, checkPosition, toleranceInMM)
    ElseIf Globals.isVectorShape(shapeA) And Globals.isVectorShape(shapeB) Then
        areShapesCurvesEqual = Globals.areCurvesEqual(shapeA.DisplayCurve, shapeB.DisplayCurve, checkPosition, logger, toleranceInMM)
    Else
        MsgBox "Die Form vom Typ " & Globals.getShapeTypeNameByShape(shapeA) & " wird noch nicht unterstützt [Globals.areShapesCurvesEqual]", vbExclamation
    End If
    
    
ExitFunction:
    If Not logger Is Nothing Then
        logger.logINFO "Returning " & areShapesCurvesEqual
        logger.removeTab
    End If
End Function



Public Sub TestAreShapesEqual()
    
    If Not ActiveDocument Is Nothing Then
        
        If ActiveSelectionRange.count = 2 Then
            MsgBox "Formen sind gleich: " & areShapesEqual(ActiveSelectionRange(1), ActiveSelectionRange(2), False, False, 0.1, , Globals.getLogger(True))
'            MsgBox "Formen sind gleich: " & areShapesEqual(ActiveSelectionRange(1), ActiveSelectionRange(2), False, False, 0.1) ' Ohne Logger
        End If
        
    End If
    
End Sub


' Für 'typeMustBeSame' macht false nur Sinn, wenn man bspw. ein Rechteck mit einer Kurve vergleicht. Denn die Kurve kann ja auch rechteckig sein. Nur ist es nicht vom Typen Rechteck
Public Function areShapesEqual(shapeA As shape, shapeB As shape, checkPosition As Boolean, checkName As Boolean, Optional toleranceInMM As Double = 0#, Optional recursive As Boolean = True, Optional logger As logger) As Boolean
    
    If Not logger Is Nothing Then logger.addTab , "[Globals.areShapesEqual] shapeA: '" & Globals.getShapeDisplayName(shapeA) & "', shapeB: '" & Globals.getShapeDisplayName(shapeB) & "'"

    
    ' Beide Formen sichtbar machen. Denn sonst kann nicht auf Kurveninfos zugegriffen werden
    ' --------------------------------
    Dim shapeAWasVisible As Boolean
    shapeAWasVisible = shapeA.visible
    shapeA.visible = True
    
    Dim shapeBWasVisible As Boolean
    shapeBWasVisible = shapeB.visible
    shapeB.visible = True
    ' --------------------------------
    
    If Not shapeA.Type = shapeB.Type Then
        If Not logger Is Nothing Then logger.logINFO "Typ nicht gleich. shapeA.Type: '" & Globals.getShapeDisplayName(shapeA) & "', shapeB.Type: '" & Globals.getShapeDisplayName(shapeB) & "'"
        GoTo ExitFunction ' False
    End If
    
    If checkName Then
        If Not shapeA.name = shapeB.name Then
            If Not logger Is Nothing Then logger.logINFO "Namen nicht gleich shapeA.name: '" & shapeA.name & "', shapeB.name: '" & shapeB.name & "'"
            GoTo ExitFunction ' False
        End If
    End If
    
    'If Not Globals.areRectanglesEqual(shapeA.boundingBox, shapeB.boundingBox, checkPosition, toleranceInMM) Then GoTo ExitFunction
    
    
    
    If shapeA.Type = cdrTextShape Then
        areShapesEqual = areTextShapesEqual(shapeA, shapeB, checkPosition, toleranceInMM)
    ElseIf Globals.isVectorShape(shapeA) Then
        areShapesEqual = Globals.areCurvesEqual(Globals.getCurveFromShape(shapeA), Globals.getCurveFromShape(shapeB), checkPosition, , toleranceInMM)
    ElseIf shapeA.Type = cdrBitmapShape Then
        areShapesEqual = Globals.areBitmapShapesEqual(shapeA, shapeB, checkPosition, toleranceInMM, , logger)
    ElseIf shapeA.Type = cdrGroupShape Then
        
        If recursive Then
            
            If Not shapeA.shapes.count = shapeB.shapes.count Then
                If Not logger Is Nothing Then logger.logINFO "Gruppen haben nicht die selbe anzahl an Childs. shapeA.shapes.count: '" & shapeA.shapes.count & "', shapeB.shapes.count: '" & shapeB.shapes.count & "'"
                GoTo ExitFunction ' False
            End If
            
            For i = 1 To shapeA.shapes.count
                If Not Globals.areShapesEqual(shapeA.shapes(i), shapeB.shapes(i), checkPosition, checkName, toleranceInMM, recursive, logger) Then GoTo ExitFunction ' False
            Next i
              
            areShapesEqual = True
        End If
        
    ElseIf Globals.isQRCode(shapeA) Then
        
        ' QR-Codes werden nicht oben durch den Typencheck erkannt (sind nämlich cdrCustomShape. B-Splines aber auch. Deshalb wird hier nochmal genauer geprüft)
        If Not Globals.isQRCode(shapeB) Then
            If Not logger Is Nothing Then logger.logINFO "shapeA ist ein QR-Code, shapeB aber nicht"
            GoTo ExitFunction ' False
        End If
        
        If Not Globals.areRectanglesEqual(shapeA.boundingBox, shapeB.boundingBox, False, toleranceInMM) Then
            If Not logger Is Nothing Then logger.logINFO "Boundingboxen beider QR-Codes unterschiedlich"
            GoTo ExitFunction ' False
        End If
        
        areShapesEqual = True
    Else
        MsgBox "[Globals.areShapesEqual] Die Form vom Typ " & Globals.getShapeTypeNameByShape(shapeA) & " wird noch nicht unterstützt", vbExclamation
        Globals.endMacro
    End If
    
ExitFunction:
    shapeA.visible = shapeAWasVisible
    shapeB.visible = shapeBWasVisible
    If Not logger Is Nothing Then
        logger.logINFO "Returning '" & areShapesEqual & "'"
        logger.removeTab
    End If
End Function


Public Sub TestAreBitmapShapesEqual()
    
    Globals.warnIfNoDocumentAndEnd
    
    If ActiveSelectionRange.count = 2 Then
        
        MsgBox "areBitmapShapesEqual: " & areBitmapShapesEqual(ActiveSelectionRange(1), ActiveSelectionRange(2), True, 0, 1000) ', Globals.getLogger(True))
        
    Else
        MsgBox "Bitte wähle 2 Formen aus"
    End If
    
End Sub




Public Function areShapeRangeShapesEqual(range As shapeRange, checkPosition As Boolean, checkName As Boolean, Optional toleranceInMM As Double = 0#, Optional recursive As Boolean = True, Optional logger As logger) As Boolean
    
    Dim i As Integer
    For i = 2 To range.count
        
        ' Alle Formen mit der ersten Form gegenprüfen
        If Not areShapesEqual(range(1), range(i), checkPosition, checkName, toleranceInMM, recursive, logger) Then
            Exit Function ' False
        End If
        
    Next i
    
End Function



Public Sub TestAreTransparenciesOfShapesEqual()
    
    Globals.warnIfNoDocumentAndEnd
    
    If ActiveSelectionRange.count = 2 Then
        
        MsgBox "areTransparenciesOfShapesEqual: " & areTransparenciesOfShapesEqual(ActiveSelectionRange(1), ActiveSelectionRange(2)) ', Globals.getLogger(True))
        
    Else
        MsgBox "Bitte wähle 2 Formen aus"
    End If
    
    
End Sub


Public Function areTransparenciesOfShapesEqual(shapeA As shape, shapeB As shape) As Boolean
    
    If Not shapeA.transparency.Type = shapeB.transparency.Type Then Exit Function
    
    ' GLEICHMÄßIGE TRANSPARENZ
    If shapeA.transparency.Type = cdrUniformTransparency Then
        
        areTransparenciesOfShapesEqual = shapeA.transparency.Uniform = shapeB.transparency.Uniform
    
    ' VERLAUF
    ElseIf shapeA.transparency.Type = cdrFountainTransparency Then
        
            
        Dim fountainA As FountainFill
        Set fountainA = shapeA.transparency.Fountain
        Dim fountainB As FountainFill
        Set fountainB = shapeB.transparency.Fountain
        
        ' Vorgezogen. Macht sinn diese Eigenschaft zuerst zu prüfen
        If Not fountainA.Type = fountainB.Type Then Exit Function          ' False
        
        If Not fountainA.angle = fountainB.angle Then Exit Function ' False
        If Not fountainA.Anisotropic = fountainB.Anisotropic Then Exit Function   ' False
        If Not fountainA.BlendAcceleration = fountainB.BlendAcceleration Then Exit Function   ' False
        If Not fountainA.CenterOffsetX = fountainB.CenterOffsetX Then Exit Function     ' False
        If Not fountainA.CenterOffsetY = fountainB.CenterOffsetY Then Exit Function     ' False
        ' Fontänenfarben -----------
        If Not fountainA.colors.count = fountainB.colors.count Then Exit Function     ' False
        For i = 0 To fountainA.colors.count - 1 ' Ist eine 0-basierte Collection
            Dim fountainColorA As FountainColor
            Set fountainColorA = fountainA.colors.item(i)
            
            Dim fountainColorB As FountainColor
            Set fountainColorB = fountainB.colors.item(i)
            
            If Not fountainColorA.BlendType = fountainColorB.BlendType Then Exit Function ' False
            If Not fountainColorA.color.HexValue = fountainColorB.color.HexValue Then Exit Function  ' False
            If Not fountainColorA.MidPoint = fountainColorB.MidPoint Then Exit Function   ' False
            If Not fountainColorA.opacity = fountainColorB.opacity Then Exit Function   ' False
            If Not fountainColorA.position = fountainColorB.position Then Exit Function   ' False
            
            Set fountainColorA = Nothing
            Set fountainColorB = Nothing
        Next i
        ' ------------------
        If Not fountainA.End2X = fountainB.End2X Then Exit Function   ' False
        If Not fountainA.End2Y = fountainB.End2Y Then Exit Function    ' False
        ' EndX, EndY geben leider globale Koordinaten aus dem Dokument wieder. Das bedeutet, dass 2 gleichaussehende Verläufe an unterschiedlichen Positionen im Dokument dann nicht gleich währen. Deshalb ignoriert
        If Not fountainA.IsTransparent = fountainB.IsTransparent Then Exit Function      ' False
        If Not fountainA.scaleX = fountainB.scaleX Then Exit Function      ' False
        If Not fountainA.scaleY = fountainB.scaleY Then Exit Function       ' False
        If Not fountainA.Skew = fountainB.Skew Then Exit Function        ' False
        If Not fountainA.SmoothBlend = fountainB.SmoothBlend Then Exit Function         ' False
        If Not fountainA.SpreadMethod = fountainB.SpreadMethod Then Exit Function         ' False
        ' StartX, StartY geben leider globale Koordinaten aus dem Dokument wieder. Das bedeutet, dass 2 gleichaussehende Verläufe an unterschiedlichen Positionen im Dokument dann nicht gleich währen. Deshalb ignoriert
        If Not fountainA.steps = fountainB.steps Then Exit Function         ' False
            
            
    
    ' OHNE TRANSPARENZ
    ElseIf shapeA.transparency.Type = cdrNoTransparency Then
            
    Else
        MsgBox "Transparenz noch nicht unterstützt [Globals.areTransparenciesOfShapesEqual]"
        Globals.endMacro
    End If
    
    areTransparenciesOfShapesEqual = True ' Vergleiche bestanden

End Function


Public Function areBitmapShapesEqual(bitmapShapeA As shape, bitmapShapeB As shape, checkPosition As Boolean, Optional toleranceInMM As Double = 0#, Optional samples As Integer = 100, Optional logger As logger) As Boolean
    
    areBitmapShapesEqual = areBitmapsEqual(bitmapShapeA.bitmap, bitmapShapeB.bitmap, checkPosition, toleranceInMM, samples, logger)
    
End Function



Public Function areBitmapsEqual(bitmapA As bitmap, bitmapB As bitmap, checkPosition As Boolean, Optional toleranceInMM As Double = 0#, Optional samples As Integer = 100, Optional logger As logger) As Boolean
    
    If Not logger Is Nothing Then logger.addTab , "[Globals.areBitmapsEqual]"
    
    ' Prüfen, ob beide Formen entweder BEIDE einen Zuschnitt haben oder BEIDE keinen haben
    If Not bitmapA.Cropped = bitmapB.Cropped Then
        If Not logger Is Nothing Then logger.logINFO "Nur eine Bitmap hat ein Zuschnitt"
        GoTo ExitFunction
    End If
    
    ' Prüfen, ob Zuschnitte gleich sind (falls vorhanden)
    If bitmapA.Cropped And bitmapB.Cropped Then
        If Not Globals.areCurvesEqual(bitmapA.CropEnvelope, bitmapB.CropEnvelope, checkPosition, , toleranceInMM) Then
            If Not logger Is Nothing Then logger.logINFO "Bitmapzuschnitt nicht gleich"
            GoTo ExitFunction
        End If
    End If
    
    ' Entweder haben beide einen Alphakanal oder beide nicht. Denn wenn einer in diesem vom anderen abweicht sind sie nicht gleicht
    If Not ((bitmapA.imageAlpha Is Nothing) = (bitmapB.imageAlpha Is Nothing)) Then
        If Not logger Is Nothing Then logger.logINFO "Nur eine Bitmap hat ein Alphakanal"
        GoTo ExitFunction
    End If
    
    ' RGB Prüfen
    If Not Globals.areBitmapImagesEqual(bitmapA.image, bitmapB.image, samples) Then
        If Not logger Is Nothing Then logger.logINFO "RGB Image nicht gleich"
        GoTo ExitFunction     ' False
    End If
    
    ' Alphakanal prüfen
    If Not bitmapA.imageAlpha Is Nothing Then
        If Not Globals.areBitmapImagesEqual(bitmapA.imageAlpha, bitmapB.imageAlpha, samples) Then
            If Not logger Is Nothing Then logger.logINFO "Alpha Image nicht gleich"
            GoTo ExitFunction  ' False
        End If
    End If
    
    areBitmapsEqual = True ' Tests bestanden
ExitFunction:
    If Not logger Is Nothing Then
        logger.logINFO "Returne: '" & areBitmapsEqual & "'"
        logger.removeTab
    End If
End Function



Public Function areBitmapImagesEqual(imageA As image, imageB As image, Optional samples As Integer, Optional logger As logger) As Boolean
    
    If Not imageA.width = imageB.width Then Exit Function ' Nicht gleich
    If Not imageA.height = imageB.height Then Exit Function ' Nicht gleich
    
    ' Der Typ ist bspw. RGB oder Graustufen etc.
    If Not imageA.Type = imageB.Type Then Exit Function ' Nicht gleich
    
    Dim imageASamples As collection
    Set imageASamples = Globals.getImageSamples(imageA, samples, logger)
    
    Dim imageBSamples As collection
    Set imageBSamples = Globals.getImageSamples(imageB, samples, logger)
    
    
    areBitmapImagesEqual = areCollectionsEqual(imageASamples, imageBSamples)
End Function



Public Function areCollectionsEqual(collA As collection, collB As collection, Optional logger As logger) As Boolean
    
    If Not logger Is Nothing Then logger.addTab , "[Globals.areCollectionsEqual]"
    
    ' Beide Collections sind Nothing also gleich (equal)
    If collA Is Nothing And collB Is Nothing Then
        areCollectionsEqual = True
        GoTo ExitFunction
    End If
    
    If collA Is Nothing Or collB Is Nothing Then GoTo ExitFunction ' Nur eine Collection ist Nothing. Beide sind also nicht gleich
    
    If Not collA.count = collB.count Then GoTo ExitFunction  ' False
    
    If Not logger Is Nothing Then logger.logINFO "collA.count: '" & collA.count & "', collB.count: '" & collB.count & "'"
    
    For i = 1 To collA.count
        
        ' Beides Objekte
        If IsObject(collA(i)) And IsObject(collB(i)) Then
        
            If Not Globals.areObjectsEqual(collA(i), collB(i), logger) Then
                GoTo ExitFunction ' False
            End If
        
        ' Beides keine Objekte
        ElseIf Not IsObject(collA(i)) And Not IsObject(collB(i)) Then
        
            If Not collA(i) = collB(i) Then GoTo ExitFunction
        
        ' Beide Variablen sind nicht vom selben Typ
        Else
            GoTo ExitFunction ' False
        End If
        
    Next i
    
    
    areCollectionsEqual = True
    
ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
End Function



Public Function areObjectsEqual(objA As Object, objB As Object, Optional logger As logger) As Boolean
    
    If Not logger Is Nothing Then logger.addTab , "[Globals.areObjectsEqual] objA:'" & TypeName(objA) & "' objB:'" & TypeName(objB) & "'"
    
    ' Beide Objekte sind Nothing also gleich (equal)
    If objA Is Nothing And objB Is Nothing Then
        areObjectsEqual = True
        GoTo ExitFunction
    End If
    
    If objA Is Nothing Or objB Is Nothing Then GoTo ExitFunction ' Nur ein Objekt ist Nothing. Beide sind also nicht gleich
    
    
    ' Wenn sie nicht vom selben Typ sind, sind sie nicht gleich (equal)
    If Not TypeName(objA) = TypeName(objB) Then GoTo ExitFunction ' False
    
    ' COLOR
    If TypeOf objA Is color Then
        Dim colorA As color
        Set colorA = objA
        
        Dim colorB As color
        Set colorB = objB
        
        If Not logger Is Nothing Then logger.logINFO "Vergleiche colorA.HexValue: '" & colorA.HexValue & "' mit colorB.HexValue: '" & colorB.HexValue & "'"
        
        areObjectsEqual = colorA.HexValue = colorB.HexValue
    
    ' SHAPE
    ElseIf objA Is shape Then
        
        areObjectsEqual = Globals.areShapesEqual(objA, objB, True, True)
    End If
    
ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
End Function



Public Function areTextShapesEqual(textShapeA As shape, textShapeB As shape, checkPosition As Boolean, Optional toleranceInMM As Double = 0#) As Boolean
    
    If Not textShapeA.Type = cdrTextShape Or Not textShapeB.Type = cdrTextShape Then Exit Function
    If Not textShapeA.text.IsArtisticText = textShapeB.text.IsArtisticText Then Exit Function
    If Not textShapeA.text.Story.text = textShapeB.text.Story.text Then Exit Function
    If Not textShapeA.text.Story.font = textShapeB.text.Story.font Then Exit Function
    If Not Globals.areRectanglesEqual(textShapeA.boundingBox, textShapeB.boundingBox, checkPosition, toleranceInMM) Then Exit Function
    
    areTextShapesEqual = True
End Function


Public Function convertSubPathToOwnShape(shape As shape, subPathIndex As Integer, Optional orderAboveShape As Boolean = False) As shape
    
    
    Dim newShape As shape
    Set newShape = ActiveLayer.CreateCurve(shape.curve.GetCopy)
    
    For i = newShape.curve.subPaths.count To 1 Step -1
        If Not i = subPathIndex Then
            newShape.curve.subPaths(i).delete
        End If
    Next i
    
    shape.curve.subPaths(subPathIndex).delete
    
    newShape.CopyPropertiesFrom shape, cdrCopyFill
    newShape.CopyPropertiesFrom shape, cdrCopyOutlineColor
    
    newShape.OrderFrontOf shape
    Set convertSubPathToOwnShape = newShape
End Function



'Public Sub TestLoopInteger()
'
'    Dim result As New collection
'    result.add "0 To 3, Limit 4, Start 0, Negativ"
'    For i = 0 To 3
'        result.add loopInteger(i, 4, 0, True)
'    Next i
'    result.add ""
'
'    result.add "1 To 4, Limit 4, Start 0, Positiv, Nicht 0 Based"
'    For i = 1 To 4
'        result.add loopInteger(i, 4, 0, False, False)
'    Next i
'    result.add ""
'
'    result.add "1 To 4, Limit 4, Start 0, Negativ, Nicht 0 Based"
'    For i = 1 To 4
'        result.add loopInteger(i, 4, 0, True, False)
'    Next i
'    result.add ""
'
'    MsgBox Globals.collectionToMultiLineStr(result)
'
'End Sub


Public Function loopInteger(ByVal index As Integer, limit As Integer, Optional Start As Integer = 0, Optional negativeDirection As Boolean = False, Optional zeroBasedIndex As Boolean = True) As Integer
    If Not zeroBasedIndex Then index = index - 1
    
    loopInteger = (Start + index * IIf(negativeDirection, -1, 1)) + IIf(negativeDirection, limit, 0)
    loopInteger = loopInteger Mod limit
    
    If Not zeroBasedIndex Then loopInteger = loopInteger + 1
End Function


Public Function areNodesEqual(nodeA As Node, nodeB As Node, checkPosition As Boolean, Optional toleranceInMM As Double = 0#)
    
    ' Falls das Dokument nicht in MM ist, sonder in Pixel oder so
    Dim toleranceInDocUnits As Double
    toleranceInDocUnits = ActiveDocument.ToUnits(toleranceInMM, cdrMillimeter)
    
    Dim nodeAX As Double
    nodeAX = nodeA.positionX
    Dim nodeAY As Double
    nodeAY = nodeA.positionY
    
    Dim nodeBX As Double
    nodeBX = nodeB.positionX
    Dim nodeBY As Double
    nodeBY = nodeB.positionY
    
    ' Wenn die Globale Position nicht wichtig ist, sondern nur der Pfad an sich
    ' dann wird die globale Position subtrahiert
    If Not checkPosition Then
        nodeAX = nodeAX - nodeA.subPath.positionX
        nodeAY = nodeAY - nodeA.subPath.positionY
        
        nodeBX = nodeBX - nodeB.subPath.positionX
        nodeBY = nodeBY - nodeB.subPath.positionY
    End If
    
    areNodesEqual = (Abs(nodeAX - nodeBX) <= toleranceInDocUnits And Abs(nodeAY - nodeBY) <= toleranceInDocUnits)
End Function



Public Sub TestIsCurveIntersecting()
    
    Globals.endIfNoDocumentOpen
    
    Dim shapeA As shape
    Set shapeA = ActiveLayer.shapes.FindShape("shapeA")
    
    Dim shapeB As shape
    Set shapeB = ActiveLayer.shapes.FindShape("shapeB")
    
    If shapeA Is Nothing Then
        MsgBox "shapeA nicht gefunden!"
        End
    End If
    
    If shapeB Is Nothing Then
        MsgBox "shapeB nicht gefunden!"
        End
    End If
    
    MsgBox "isCurveIntersecting: " & isCurveIntersecting(shapeA, shapeB)
    
End Sub


' Funktioniert auch mit Bitmaps. Dort wird der Zuschnitt der Bitmap genutzt als Kurve
' Wenn 'onlyCurveTouch' true, gibt es nur ein true zurück, wenn beide Pfade sich berühren, nicht aber wenn das eine in das andere (ohne Berührungspunke) steckt
Public Function isCurveIntersecting(shapeA As shape, ByVal shapeB As shape, Optional onlyCurveTouch As Boolean = False, Optional logger As logger) As Boolean
    
    If Not logger Is Nothing Then
        logger.addTab , "[Globals.isCurveIntersecting] shapeA: '" & Globals.getShapeDisplayName(shapeA) & "', shapeB: '" & Globals.getShapeDisplayName(shapeB) & "', onlyCurveTouch: '" & onlyCurveTouch & "'"
    End If
    
    
    Dim curve1 As curve
    Dim Curve2 As curve
    
    Set curve1 = getCurveFromShape(shapeA, True, logger)
    Set Curve2 = getCurveFromShape(shapeB, True, logger)
        
    isCurveIntersecting = curve1.IntersectsWith(Curve2)
    
    ' Wenn beide Formen nicht überlappen, prüfen, ob sie in einander stecken
    If Not isCurveIntersecting And Not onlyCurveTouch Then
        isCurveIntersecting = (curve1.IsPointInside(Curve2.Nodes.First.positionX, Curve2.Nodes.First.positionY) Or _
            Curve2.IsPointInside(curve1.Nodes.First.positionX, curve1.Nodes.First.positionY))
    End If
    
    If Not logger Is Nothing Then logger.removeTab
End Function


' TODO entfernen. Ist jetzt das selbe wie .isCurveIntersecting
' ACHTUNG:
' - Beide Shapes müssen in der selben Gruppe sein. Ansonsten 'isCurveIntersecting' nutzen
Public Function isCurveIntersectingFast(shapeA As shape, ByVal shapeB As shape, Optional onlyCurveTouch As Boolean = False, Optional logger As logger) As Boolean
    
    If Not logger Is Nothing Then
        logger.addTab , "[Globals.isCurveIntersectingFast] shapeA: '" & Globals.getShapeDisplayName(shapeA) & "', shapeB: '" & Globals.getShapeDisplayName(shapeB) & "'"
    End If
    
    Dim curve1 As curve
    Dim Curve2 As curve
    
    Set curve1 = getCurveFromShape(shapeA, True, logger)
    Set Curve2 = getCurveFromShape(shapeB, True, logger)
    
    isCurveIntersectingFast = curve1.IntersectsWith(Curve2)
    
    ' Wenn beide Formen nicht überlappen, prüfen, ob sie in einander stecken
    If Not isCurveIntersectingFast And Not onlyCurveTouch Then
        isCurveIntersectingFast = (curve1.IsPointInside(Curve2.Nodes.First.positionX, Curve2.Nodes.First.positionY) Or _
            Curve2.IsPointInside(curve1.Nodes.First.positionX, curve1.Nodes.First.positionY))
    End If
    
    
    If Not logger Is Nothing Then logger.removeTab
End Function



Public Function getCurveFromShapeRange(range As shapeRange, Optional prefereDisplayCurve As Boolean = False, Optional logger As logger) As curve
    
    If Not logger Is Nothing Then logger.addTab , "[Globals.getCurveFromShapeRange]"
    
    Dim groupCurve As curve
    
    Dim visibleBefore As Boolean
    
    For i = 1 To range.count
        
        visibleBefore = range(i).visible
        If Not logger Is Nothing Then logger.logFINE "range(i): '" & Globals.getShapeDisplayName(range(i)) & "', i:'" & i & "', visibleBefore:'" & visibleBefore & "'"
        range(i).visible = True
        
        Dim currCurve As curve
        Set currCurve = getCurveFromShape(range(i), prefereDisplayCurve, logger)
        
        If Not currCurve Is Nothing Then
            If groupCurve Is Nothing Then
                Set groupCurve = currCurve
            Else
                Set groupCurve = groupCurve.WeldWith(currCurve)
            End If
        End If
        
        If Not visibleBefore Then
            setShapeInvisible range(i), logger
            If Not logger Is Nothing Then logger.logFINE "made invisible. visible:'" & range(i).visible & "'"
        End If
        
        Set currCurve = Nothing
    Next i
    
    Set getCurveFromShapeRange = groupCurve '.RemoveOverlaps
    If Not logger Is Nothing Then logger.removeTab
End Function



Public Function setShapeInvisible(shape As shape, Optional logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[Globals.setShapeInvisible] shape: '" & Globals.getShapeDisplayName(shape) & "'"
    
    shape.visible = False
    
    Dim parent As shape
    Set parent = getParentShapeOfShape(shape)
    
    If Not parent Is Nothing Then
        If Not logger Is Nothing Then logger.logFINE "Checking visibility of shapes. Count: '" & parent.shapes.count & "'"
        If Globals.isShapeRangeInvisible(parent.shapes.All) Then
            setShapeInvisible parent, logger
        Else
            If Not logger Is Nothing Then logger.logFINE "Not all shapes invisible"
        End If
    Else
        If Not logger Is Nothing Then logger.logFINE "No Parent"
    End If
    
    If Not logger Is Nothing Then logger.removeTab
    
End Function


Public Function isShapeRangeInvisible(range As shapeRange) As Boolean
    
    For i = 1 To range.count
        If range(i).visible Then
            Exit Function ' False
        End If
    Next i
    
    ' Keine sichtbare Form gefunden
    isShapeRangeInvisible = True
    
End Function


Public Sub TestGetCurveFromShape()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    
    Dim shape As shape
    Set shape = ActiveShape
    
    ' Effektform
'    Set shape = Globals.getEffectsShapesOfShape(shape).firstShape
    
    
    Set shape = ActiveLayer.CreateArtisticText(0, 0, "A", , , "The BraggestDemo") ' Diese Schriftart hat das Alphazeichen nicht und auch kein Rechteck welches das Zeichen ersetzt sondern garnichts
'    shape.text.Story.text = "" ' Ein leerer Text kann keine Kurve erzeugen. Deshalb sollte die Warnmeldung unten getriggert werden
    shape.text.Story.text = ChrW(&HD835) & ChrW(&HDEC2) ' Griechisches Alpha, was bei den meisten Schriftarten nicht vorhanden ist. Text wird dann nicht dargestellt und hat dann keine Kurveninformationen
'    shape.text.selection.font = "The BraggestDemo"
    
    Dim curve As curve
    Set curve = getCurveFromShape(shape)
    
    If curve Is Nothing Then
        MsgBox "Es konnte keine Kurve erstellt werden (Es könnte sich um ein leeren Text handeln)"
    Else
        ActiveLayer.CreateCurve curve
        ActiveShape.outline.color = CreateColor("#000FFF")
        ActiveShape.fill.ApplyNoFill
    End If
    
    
    
End Sub


' ACHTUNG: Wenn das 'shape' bspw. ein leerer Text ist, dann enthält er keine Kurveninformationen und es wird Nothing returnt
Public Function getCurveFromShape(shape As shape, Optional prefereDisplayCurve As Boolean = False, Optional logger As logger) As curve
    
    If Not logger Is Nothing Then
        logger.addTab , "[Globals.getCurveFromShape] shape: '" & Globals.getShapeDisplayName(shape) & "', prefereDisplayCurve: '" & prefereDisplayCurve & "'"
    End If
    
    If Not shape.visible Then
        If Not logger Is Nothing Then logger.removeTab
        Err.Raise vbObjectError + 513, , "[Globals.getCurveFromShape] 'shape' ist unsichtbar. Kurve kann sonst nicht ermittelt werden "
    End If
    
    Dim curveExists As Boolean
    curveExists = True
    
    On Error GoTo NoCurve
    Dim testt As curve: Set testt = shape.curve
    On Error GoTo 0
    GoTo CurveFound
NoCurve:
    prefereDisplayCurve = True
    curveExists = False
CurveFound:
    
    If Not logger Is Nothing Then logger.logINFO "prefereDisplayCurve: '" & prefereDisplayCurve & "', curveExists: '" & curveExists & "', shape.Type: '" & Globals.getShapeTypeNameByShape(shape) & "'"
    
'    MsgBox "prefereDisplayCurve: " & prefereDisplayCurve & ", curveExists: " & curveExists & ", shape.Type: " & Globals.getShapeTypeName(shape.type)
    
    
    
    If shape.Type = cdrBitmapShape Then
        Set getCurveFromShape = shape.bitmap.CropEnvelope
        
    
    ElseIf shape.Type = cdrGroupShape Then
        'Bei Gruppen wird rekursiv eine Curve zusammengesammelt
        
        Set getCurveFromShape = getCurveFromShapeRange(shape.shapes.All, prefereDisplayCurve, logger)
    
    ElseIf Globals.isQRCode(shape) Then
        
        ' Von QR-Codes kann man leider keine Kurven-Infos bekommen (.curve oder .displaycurve)
        ' Deshalb wird der QR-Code zu einer Kurvenform konvertiert und davon die Kurve genutzt
        Dim qrCodeRect As shape
        Set qrCodeRect = Globals.convertQRCodeToRect(Globals.copyPasteShape(shape, True))
        Set getCurveFromShape = qrCodeRect.curve.GetCopy
        qrCodeRect.delete
    
    ElseIf Globals.isShapeEffectShape(shape) Then
        
        Dim effectCurve As New curve
        effectCurve.AppendSubpathRectangle shape.LeftX, shape.TopY, shape.RightX, shape.BottomY
        Set getCurveFromShape = effectCurve
        
    Else
        
        If Not prefereDisplayCurve Then
            
            If curveExists Then
                If Not shape.curve Is Nothing Then Set getCurveFromShape = shape.curve
            Else
                Set getCurveFromShape = shape.DisplayCurve
            End If
        Else
            If Not shape.DisplayCurve Is Nothing Then
                Set getCurveFromShape = shape.DisplayCurve
            Else
                If curveExists Then
                    Set getCurveFromShape = shape.curve
                Else
                    
                    ' Da manche Formen (wie z.B: Texte) keine Curve oder DisplayCurve haben, müssen wir hier eine Kurve generieren
                    Dim shapeCopy As shape
                    Set shapeCopy = Globals.copyPasteShape(shape, True, True)
                    shapeCopy.name = "Globals.getCurveFromShape_tmp"
                    shapeCopy.ConvertToCurves
                    
                    ' Wenn 'shape' keine Kurven hat dann wird 'shapeCopy' bei .ConvertToCurves ungültig
                    ' Das bei folgenden Fällen passieren
                    ' - Leerer Text
                    ' - Text der Zeichen enthält (griechische bspw.) welche die Schriftart nicht hat und nicht mit leeren Rechtecken ausfüllt
                    If Not Globals.isShapeReferenceValid(shapeCopy) Then
                        GoTo ExitFunction
                    End If
                    
                    If shapeCopy.Type = cdrGroupShape Then
                        Set shapeCopy = shapeCopy.shapes.All.Combine
                    End If
                    Set getCurveFromShape = shapeCopy.DisplayCurve.GetCopy
                    shapeCopy.delete
                End If
            End If
        End If
        
    End If
    
    
ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
End Function



Public Sub TestIsShapeHavingDisplayCurve()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
        
    MsgBox "Form hat DisplayCurve: " & (Not ActiveShape.DisplayCurve Is Nothing)
    
End Sub


Public Sub TestCorrectWrongSubPathDirections()
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    
    If ActiveShape.Type = cdrCurveShape Then
        correctWrongSubPathDirections ActiveShape
    Else
        MsgBox "Die Ausgewählte Form muss eine Kurve sein!"
    End If
End Sub



Public Function correctWrongSubPathDirections(shape As shape)
    
    ' Rekursion bei Gruppen
    If shape.Type = cdrGroupShape Then
        For i = 1 To shape.shapes.count
            correctWrongSubPathDirections shape.shapes(i)
        Next i
        Exit Function
    End If
    
    correctWrongSubPathDirectionsOfCurve shape.curve
    
End Function

' ACHTUNG: Scheint nicht mit 'displayCurve' zu funktionieren.
' Und es scheint auch nicht mit den Kurven bon Bitmapzuschnitten zu funktionieren.
' Es tritt dann ein Fehler bei 'curve.ReverseDirection' auf.
Public Function correctWrongSubPathDirectionsOfCurve(curve As curve)
    
    If Not curve.IsClockwise Then
        curve.ReverseDirection
    End If
    
    ' Wenn es nur ein Pfad ist ohne Ausschnitte, dann gibt es daran nichts zu korrigieren (Wenn oben schon die Richtung auf "Im Uhrzeigersinn" steht)
    If curve.subPaths.count = 1 Then
        Exit Function
    End If
    
    ' Prüfen, ob eines der Ausschnitte in die falsche Richtung geht (Im Uhrzeigersinn währe falsch)
    ' Der größte SubPath ist die positive Form. Alle anderen sind Ausschnitte
    Dim biggestSubPath As Integer
    biggestSubPath = Globals.getBiggestSubPathIndex(curve.subPaths)
    For i = 1 To curve.subPaths.count
        Dim currSubPath As subPath
        Set currSubPath = curve.subPaths(i)
        If Not i = biggestSubPath Then
            ' Nur die größte Form darf im Uhrzeigersinn verlaufen
            ' Komischerweise muss auch nur die Richtung der größten Kurve korrigiert werden. Der Rest läuft so
            If Not currSubPath.IsClockwise Then
                currSubPath.ReverseDirection
            End If
        End If
        Set currSubPath = Nothing
    Next i
    
End Function


Public Function createOutlinePath(shape As shape) As shape
    
    Dim shapesBoundingBox As rect
    Set shapesBoundingBox = shape.boundingBox
    
    Dim rect As New rect
    rect.SetRect shapesBoundingBox.left - 10, shapesBoundingBox.y, 5, 5
    Dim rectShape As shape
    Set rectShape = ActiveLayer.CreateRectangleRect(rect)
    
    Dim range As New shapeRange
    range.add rectShape
    range.add shape
    
    Dim outlineShape As shape
    Set outlineShape = range.CustomCommand("Boundary", "CreateBoundary")
    
    
    copyPasteShapeLook shape, outlineShape
    outlineShape.name = shape.name
     
    ' Rechteck in der neuen Form finden und löschen
    ' -----------------------------------------------
'    Debug.Print "Suche Rechteck..."
    For i = 1 To outlineShape.curve.subPaths.count
        Dim currentSubPath As subPath
        Set currentSubPath = outlineShape.curve.subPaths(i)
        
        If Globals.areSubPathsEqual(currentSubPath, rectShape.DisplayCurve.subPaths.First, True) Then
'            Debug.Print "    Rechteck gefunden. Löschen!"
            currentSubPath.delete ' Löschen
            Exit For
        End If
        
        Set currentSubPath = Nothing
    Next i
    rectShape.delete
    ' -----------------------------------------------
    
    Set createOutlinePath = outlineShape
    
End Function



Public Sub TestCreateDropShadow()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    createDropShadow ActiveShape, ActiveDocument.ToUnits(80, cdrPixel), ActiveDocument.ToUnits(-80, cdrPixel), 350, 50
    
End Sub


Public Function createDropShadow(shape As shape, offsetX As Double, offsetY As Double, Optional blurRadius As Double = 0, Optional transparency As Double = 0, Optional color As color) As shape
    
    If color Is Nothing Then Set color = CreateRGBColor(0, 0, 0)
    
    Dim dropShadow As shape
    Set dropShadow = Globals.copyPasteShape(shape, True)
    dropShadow.OrderBackOf shape
    dropShadow.name = "Schlagschatten"
    
    ' TODO 'setShapeColor' für Bitmaps ermöglichen
    Globals.setShapeColor dropShadow, color, , , , , , True
    
    dropShadow.Move offsetX, offsetY
    
    Set dropShadow = dropShadow.convertToBitmap
    
    If blurRadius > 0 Then
        dropShadow.Style.StringAssign "{""StackedBitmapEffects"":{""GaussianBlurEffect"":{""Resampled"":""0"",""Radius"":""" & CInt(blurRadius) & """},""GaussianBlurEffect_Deleted"":""0"",""GaussianBlurEffect_Z_Index"":""0""}}"
    End If
    
    If transparency > 0 Then
        dropShadow.transparency.ApplyUniformTransparency transparency
    End If
    
    Set createDropShadow = dropShadow
    
End Function



Public Function copyPasteShapeLook(sourceShape As shape, targetShape As shape)
    
    ' Fill
    ' ::::::::::::::::::
    If sourceShape.CanHaveFill Then
        targetShape.fill.CopyAssign sourceShape.fill
    Else
        If targetShape.CanHaveFill Then
            targetShape.fill.ApplyNoFill
        End If
    End If
    
    
    ' Outline
    ' ::::::::::::::::::
    If sourceShape.CanHaveOutline Then
        targetShape.outline.CopyAssign sourceShape.outline
        targetShape.outline.SetPropertiesEx sourceShape.outline.width
    Else
        If targetShape.CanHaveOutline Then
            targetShape.outline.SetNoOutline
        End If
    End If
    
    
End Function



Public Function flattenGroupShape(groupShape As shape, Optional depthLimit As Integer = -1, Optional alsoGroups As Boolean = False, Optional ignoreGroupsWithToManyShapes As Boolean = True, Optional logger As logger) As shapeRange
    Set flattenGroupShape = flattenShapeRange(groupShape.shapes.All, depthLimit, alsoGroups, ignoreGroupsWithToManyShapes, logger)
End Function


' Erstellt eine neue ShapeRange
' Fügt dann die Shapes und alle Childs davon zur neuen ShapeRange hinzu.
Public Function flattenShapeRange(shapeRange As shapeRange, Optional depthLimit As Integer = -1, Optional alsoGroups As Boolean = False, Optional ignoreGroupsWithToManyShapes As Boolean = True, Optional logger As logger, Optional p_depth As Integer = 0) As shapeRange
    Set flattenShapeRange = New shapeRange
    
    If Not logger Is Nothing Then
        logger.logINFO "[Globals.flattenShapeRange] ignoreGroupsWithToManyShapes: " & ignoreGroupsWithToManyShapes & ", depth: " & p_depth
        logger.addTab
    End If
    
    For i = 1 To shapeRange.count
        
        If Not logger Is Nothing Then logger.logINFO "current shape: '" & Globals.getShapeDisplayName(shapeRange(i)) & "', type: " & Globals.getShapeTypeNameByShape(shapeRange(i))
        
        If shapeRange(i).Type = cdrGroupShape Then
            If alsoGroups Then
                flattenShapeRange.add shapeRange(i)
            End If
            
            If Not logger Is Nothing Then logger.logINFO "isGroupHavingToManyShapes: " & Globals.isGroupHavingToManyShapes(shapeRange(i))
            
            If (depthLimit = -1 Or p_depth + 1 <= depthLimit) And IIf(ignoreGroupsWithToManyShapes, Not Globals.isGroupHavingToManyShapes(shapeRange(i)), True) Then
                flattenShapeRange.AddRange flattenShapeRange(shapeRange(i).shapes.All, depthLimit, alsoGroups, ignoreGroupsWithToManyShapes, logger, p_depth + 1)
            End If
            
        Else
            flattenShapeRange.add shapeRange(i)
        End If
        
'        MsgBox "For i=" & i & ", depth=" & depth
    Next i
    
    If Not logger Is Nothing Then logger.removeTab
End Function

'shapeRangeNamesToString
Public Function getShapeRangeDisplayNames(shapeRange As shapeRange, Optional depth As Integer = 0, Optional recursive As Boolean = True, Optional commaSeperated As Boolean = False) As String
    
    Dim lastShape As Boolean
    For i = 1 To shapeRange.count
'        MsgBox "" & shapeRange(i).name
        
        lastShape = (i = shapeRange.count)
        
        
        getShapeRangeDisplayNames = getShapeRangeDisplayNames & tabs(depth) & getShapeDisplayName(shapeRange(i)) & IIf(commaSeperated, IIf(lastShape, "", ", "), vbNewLine) 'IIf(i = shapeRange.count, vbNewLine, "")
        
        If Globals.isShapeReferenceValid(shapeRange(i)) Then
            If shapeRange(i).Type = cdrGroupShape And recursive Then
                getShapeRangeDisplayNames = getShapeRangeDisplayNames + getShapeRangeDisplayNames(shapeRange(i).shapes.All, depth + 1, recursive)
            End If
        End If
    Next i
    
End Function


Public Function getShapeDisplayName(shape As shape)
    If Not shape Is Nothing Then
        
        If Not Globals.isShapeReferenceValid(shape) Then
            getShapeDisplayName = "<Bezugsobjekt ungültig!!>"
        ElseIf shape.name = "" Then
            
            ' Texte werden nicht einfach nur als ihr Typ "Text" angezeigt
            If shape.Type = cdrTextShape Then
                getShapeDisplayName = "Grafiktext: " & shape.text.Story.font
            ElseIf shape.Type = cdrGroupShape Then
                getShapeDisplayName = "Gruppe von " & shape.shapes.count & " Objekten"
            Else
                getShapeDisplayName = getShapeTypeNameByShape(shape)
            End If
            
        Else
            getShapeDisplayName = shape.name
        End If
        
    Else
        getShapeDisplayName = "Nothing"
    End If
End Function



' TODO entfernen da es 'getShapeRangeDisplayNames' gibt
Public Function getShapesDisplayName(range As shapeRange, Optional flattenRange As Boolean = False) As collection
    
    Dim col As New collection
    
    If flattenRange Then
        Set range = Globals.flattenShapeRange(range)
    End If
    
    For i = 1 To range.count
        col.add getShapeDisplayName(range(i))
    Next i
    
    
    Set getShapesDisplayName = col
End Function


Public Sub TestGetShapeStructure()
    
    Globals.warnIfNoDocumentAndEnd
    
    
    MsgBox "Shapes:" & vbNewLine & Globals.shapeRangeToString(Globals.shapesToShapeRange(ActiveLayer.shapes), "," & vbNewLine)
End Sub


Public Function shapeRangeNamesToStringCollection(shapeRange As shapeRange, Optional recursive As Boolean = True, Optional collection As collection = Nothing) As collection
    
    If collection Is Nothing Then
        Set collection = New collection
    End If
    
    For i = 1 To shapeRange.count
'        MsgBox "" & shapeRange(i).name
        collection.add shapeRange(i).name
        
        If shapeRange(i).Type = cdrGroupShape And recursive Then
            Set collection = shapeRangeNamesToStringCollection(shapeRange(i).shapes.All, recursive, collection)
        End If
    Next i
    
    Set shapeRangeNamesToStringCollection = collection
    
End Function




Public Function shapeRangeToCollection(shapeRange As shapeRange, Optional nameAsKey As Boolean = False) As collection
    
    Set shapeRangeToCollection = New collection
    
    For i = 1 To shapeRange.count
        If nameAsKey Then
            shapeRangeToCollection.add shapeRange(i), shapeRange(i).name
        Else
            shapeRangeToCollection.add shapeRange(i)
        End If
    Next i
    
End Function




Public Function shapeRangeContainsShape(range As shapeRange, shape As shape) As Boolean
    shapeRangeContainsShape = range.Exists(shape)
End Function


Public Sub TestSortShapeRangeToMatchZIndex()
    MsgBox "FirstShape Name: '" & ActiveSelectionRange.firstShape.name & "' Index: " & Globals.getShapeIndexInParentGroup(ActiveSelectionRange.firstShape) & ", LI: " & Globals.getShapeIndexInParentGroup(ActiveSelectionRange.lastShape)
End Sub


Public Function sortShapeRangeToMatchZIndex(range As shapeRange) As shapeRange
    
    Set sortShapeRangeToMatchZIndex = range
    
    If range.count > 1 Then
        If Globals.getShapeIndexInParentGroup(range.firstShape) > Globals.getShapeIndexInParentGroup(range.lastShape) Then
            Set sortShapeRangeToMatchZIndex = range.ReverseRange
        End If
    End If
    
End Function



Public Function addShapeToShapeRangeIfNotNothing(shape As shape, shapeRange As shapeRange)
    If shape Is Nothing Then Exit Function
    
    If isShapeDeleted(shape) Then
        Err.Raise vbObjectError + 513, , "[Globals.addShapeToShapeRangeIfNotNothing] Referenz von 'shape' ist ungültig "
    End If
    
    shapeRange.add shape
    
End Function


Public Sub TestShapeRangeShapesAreInvisible()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    MsgBox "shapeRangeShapesAreInvisible: " & shapeRangeShapesAreInvisible(ActiveSelectionRange, True)
    
End Sub


Public Function shapeRangeShapesAreInvisible(range As shapeRange, Optional checkForNoFillAndNoOutline As Boolean = False) As Boolean
    
    For i = 1 To range.count
    
        Dim currentShape As shape
        Set currentShape = range(i)
        
        ' Gruppensichtbarkeit ist egal
        If currentShape.Type = cdrGroupShape Then
            ' Rekursiv
            If Not shapeRangeShapesAreInvisible(currentShape.shapes.All, checkForNoFillAndNoOutline) Then
                shapeRangeShapesAreInvisible = False
                Exit Function
            End If
        ElseIf Globals.isShapePowerclip(currentShape) Then
            ' Rekursiv
            If Not shapeRangeShapesAreInvisible(currentShape.powerClip.shapes.All, checkForNoFillAndNoOutline) Then
                shapeRangeShapesAreInvisible = False
                Exit Function
            End If
        Else
            If currentShape.visible Then
                
                If checkForNoFillAndNoOutline Then
                    If currentShape.CanHaveFill And currentShape.CanHaveOutline Then
                        If currentShape.fill.Type = cdrNoFill And currentShape.outline.Type = cdrNoOutline Then
                            ' Form ist zwar sichtbar aber hat keine Füllung oder Outline. Ist also quasi nicht sichtbar
                            GoTo NextI
                        End If
                    End If
                End If
                
                shapeRangeShapesAreInvisible = False
                Exit Function
            End If
            
            
        End If
NextI:
        Set currentShape = Nothing
    Next i
    
    shapeRangeShapesAreInvisible = True
    
End Function



Public Function copyShapeRange(range As shapeRange, Optional onTopOfShape As Boolean = False) As shapeRange
    Set copyShapeRange = New shapeRange
    
    For i = 1 To range.count
        copyShapeRange.add copyPasteShape(range(i), onTopOfShape)
    Next i
End Function



Public Function removeShapesOfShapeRangeThatAreNothing(ByRef range As shapeRange)
    
    For i = range.count To 1 Step -1
        If Not Globals.isShapeReferenceValid(range(i)) Then
            range.Remove (i)
            i = i - 1
        End If
    Next i
    
End Function



Public Sub TestRemoveShapesNothing()
    
    If Not ActiveDocument Is Nothing Then
        Dim textShape As shape
        Set textShape = ActiveDocument.ActiveLayer.CreateArtisticText(0, 0, "Test")
        
        Dim range As New shapeRange
        range.add textShape
        
        textShape.delete
        
        removeShapesOfShapeRangeThatAreNothing range
        
        MsgBox "Count=" & range.count & " range.FirstShape=" & IIf(isShapeReferenceValid(range.firstShape), "TextShape", "Bezugsobjekt nicht verfügbar")
        
    Else
        MsgBox "Es ist kein Dokument geöffnet"
    End If
    
End Sub


Public Sub TestShapeRangeToString()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    MsgBox "shapeRangeToString: " & shapeRangeToString(ActiveSelectionRange, recursive:=True)
    
End Sub



Public Function shapeRangeToString(shapeRange As shapeRange, Optional seperator As String = ", ", Optional arrayBrackeys As Boolean = True, Optional Prefix As String = "", Optional suffix As String = "", Optional recursive As Boolean = False) As String
    If arrayBrackeys Then shapeRangeToString = "["
    For i = 1 To shapeRange.count
        shapeRangeToString = shapeRangeToString & Prefix & shapeToString(shapeRange.shapes(i), , recursive) & IIf(i = shapeRange.count, "", seperator) & suffix
    Next i
    If arrayBrackeys Then shapeRangeToString = shapeRangeToString & "]"
End Function


' Ist rekursiv
Public Function shapeToString(shape As shape, Optional depth As Integer = 0, Optional recursive As Boolean = False) As String
    
    shapeToString = tabs(depth) & "'" & Globals.getShapeDisplayName(shape) & "'"
    
    If Globals.isShapeReferenceValid(shape) Then
        shapeToString = shapeToString & ", TYPE: '" & Globals.getShapeTypeName(shape.Type) & "', STATIC-ID: '" & shape.staticID & "', VISIBLE: '" & shape.visible & "'"    'IIf(shape.name = "", Globals.getShapeTypeNameByShape(shape), shape.name)
        
        If recursive And shape.Type = cdrGroupShape Then
            shapeToString = shapeToString & ":" & vbNewLine
            
            For i = 1 To shape.shapes.count
                shapeToString = shapeToString & shapeToString(shape.shapes(i), depth + 1, True)
            Next i
            
        Else
            If Not shapeIsRecursiveInGroup Then
                shapeToString = shapeToString & vbNewLine
            End If
        End If
    End If
    
    
End Function


Public Function documentToString(document As document) As String
    If document Is Nothing Then
        documentToString = "Nothing"
    Else
        documentToString = "name: '" & document.name & "'"
    End If
End Function


Public Function tabs(depth) As String
    'MsgBox "adding " & depth & " tabs"
    For i = 1 To depth
        tabs = tabs & vbTab
    Next i
End Function



Public Function getPlacedShapesWithJobsFromShapeRange(range As shapeRange, layer As ProductDesignLayer) As collection
    
    Dim shapes As New shapeRange
    Dim jobs As New collection
    
    For i = 1 To range.count
        
        Dim currentShape As shape
        Set currentShape = range(i)
        
        Dim job As PlaceFileJob
        Dim jobOrSubJob As Variant
        Set jobOrSubJob = PlaceFile.findSubJobOrJob(currentShape, True, True, , layer)
        
        If Not jobOrSubJob Is Nothing Then
            If TypeOf jobOrSubJob Is PlaceFileSubJob Then
                Set job = jobOrSubJob.parentJob
            Else
                Set job = jobOrSubJob
            End If
        End If
        
        If Not job Is Nothing Then
            shapes.add currentShape
            jobs.add job
        End If
        
        Set currentShape = Nothing
        Set job = Nothing
    Next i
    
    
    Set getPlacedShapesWithJobsFromShapeRange = New collection
    getPlacedShapesWithJobsFromShapeRange.add shapes
    getPlacedShapesWithJobsFromShapeRange.add jobs
    
End Function




Public Sub Test_CustomShapeTypeQuery_isAllShapesMatchingQuery()
    
    Globals.endIfNoActiveShape
    
    MsgBox "isAllShapesMatchingQuery RedOrPinkShape: " & newCustomShapeTypeQuery(ActiveSelectionRange, RedOrPinkShape).setRecursionLimit(2).isAllShapesMatchingQuery(Globals.getLogger(True))
    
End Sub


Public Sub Test_CustomShapeTypeQuery_has()
    
    Globals.endIfNoActiveShape
    
    MsgBox "has RedOrPinkShape: " & newCustomShapeTypeQuery(ActiveSelectionRange, RedOrPinkShape).setRecursionLimit(0).has(Globals.getLogger(True))
    
End Sub


Public Sub Test_CustomShapeTypeQuery_search()
    
    Globals.endIfNoActiveShape
    
    MsgBox "search count RedOrPinkShape: " & newCustomShapeTypeQuery(ActiveSelectionRange, RedOrPinkShape).setRecursionLimit(2).search.count
    
End Sub



Public Sub TestIsShapeCustomShapeType()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    MsgBox isShapeCustomShapeType(newCustomShapeTypeQuery(ActiveShape, VisualElementShapeType), ActiveShape)
End Sub


Public Function isShapeCustomShapeType(shapeQuery As CustomShapeTypeQuery, shape As shape) As Boolean
    
    ' Wird mehrfach verwendet
    Dim color As color
    Dim globalExportType As globalExportType
    Dim layer As ProductDesignLayer
    Dim excludeInvisibleShapes As Boolean
    
    Dim shapeType As customShapeType
    shapeType = shapeQuery.shapeType
    
    Select Case shapeType
        Case customShapeType.RedOrPinkShape
            isShapeCustomShapeType = isRedOrPinkShape(shape)
            
        Case redShape
            isShapeCustomShapeType = isRedShape(shape)
            
        Case customShapeType.Look
            isShapeCustomShapeType = isLook(shape)
            
        Case uploadBox
            If Not VarType(shapeQuery.argument1) = vbLong Then
                isShapeCustomShapeType = isUploadBox(shape)
            Else
                isShapeCustomShapeType = isUploadBox(shape, shapeQuery.argument1)
            End If
            
        Case motive
            isShapeCustomShapeType = isMotive(shape)
            
        Case locked
            isShapeCustomShapeType = isLocked(shape)
            
        Case textLocked
            isShapeCustomShapeType = isTextLocked(shape)
        
        Case metadataShapeType
            
            isShapeCustomShapeType = isShapeMetadata(shape)
        
        Case productID
            isShapeCustomShapeType = isProductID(shape)
            
        Case fancyCustomizationIDShapeType
            isShapeCustomShapeType = isShapeFancyCustomizationID(shape)
            
        Case mainMask
            isShapeCustomShapeType = isMainMask(shape)
            
        Case groundPlate
            isShapeCustomShapeType = isGroundplate(shape)
            
        Case viewShape
            isShapeCustomShapeType = isViewShape(shape)
            
        Case photoMask
            isShapeCustomShapeType = isPhotoMask(shape)
            
        Case StaticVariant
            isShapeCustomShapeType = isStaticVariant(shape)
            
        Case DesignElementVariantShapeType
            isShapeCustomShapeType = isDesignElementVariantShapeType(shape)
            
        Case DesignElementVariantContainerShapeType
            isShapeCustomShapeType = isDesignElementVariantContainerShapeType(shape)
            
        Case StaticVariantContainer
            isShapeCustomShapeType = isShapeStaticVariantContainer(shape)
            
        Case TransparentShape
            isShapeCustomShapeType = isShapeHavingTransparency(shape)
        
        Case FullTransparentShapeType
            isShapeCustomShapeType = isShapeFullTransparent(shape)
        
        Case ConfiUploadBoxCutForImportShapeType
            If Not VarType(shapeQuery.argument1) = vbLong Then
                isShapeCustomShapeType = isShapeUploadBoxCutShapeForConfiImportShapeType(shape)
            Else
                isShapeCustomShapeType = isShapeUploadBoxCutShapeForConfiImportShapeType(shape, shapeQuery.argument1)
            End If
            
        Case TextAny
            isShapeCustomShapeType = shape.Type = cdrTextShape
        Case ParagraphText
            isShapeCustomShapeType = isParagraphText(shape)
            
        Case qrCode
            isShapeCustomShapeType = isQRCode(shape)
            
        Case CurveWithText
            isShapeCustomShapeType = isCurveWithText(shape)
            
        Case ExportableShape
            isShapeCustomShapeType = isExportableShape(shape)
            
        Case EllipseAny
            If isVectorShape(shape) Then
                isShapeCustomShapeType = isCurveEllipse(shape.DisplayCurve)
            Else
                isShapeCustomShapeType = False
            End If
            
        Case RectangleAny
            isShapeCustomShapeType = isShapeCurveRectangle(shape)

        Case RGD_WhiteShape
            isShapeCustomShapeType = isShapeRDGWhiteShape(shape)
            
        Case putOnMaskShape
            Set layer = (shapeQuery.argument1)
            isShapeCustomShapeType = isShapeToPutOnMask(shape, layer)
            
        Case ByName
            Dim stringFind As String
            stringFind = shapeQuery.argument1
            Dim searchType As stringSearchType
            searchType = shapeQuery.argument2
            Dim ignoreCase As Boolean
            If Not IsMissing(shapeQuery.argument3) Then ignoreCase = shapeQuery.argument3
            
            isShapeCustomShapeType = stringCompare(shape.name, stringFind, searchType, ignoreCase)
            
        Case CorelDrawShape
            Dim corelDrawShapeType As cdrShapeType
            
            On Error GoTo ShapeTypeCastError
            corelDrawShapeType = shapeQuery.argument1
            On Error GoTo 0
            
            isShapeCustomShapeType = shape.Type = corelDrawShapeType
            
        Case ShapeWithFx
            If Not IsMissing(shapeQuery.argument1) Then
                Dim effectType As cdrEffectType
                
                On Error GoTo EffectTypeCastError
                effectType = shapeQuery.argument1
                On Error GoTo 0
                
                For i = 1 To shape.effects.count
                    If shape.effects.item(i) = effectType Then
                        isShapeCustomShapeType = True
                        Exit Function
                    End If
                Next i
                
            Else
                isShapeCustomShapeType = shape.effects.count > 0
            End If
        
        Case FxShapeType
            isShapeCustomShapeType = isShapeEffectShape(shape)
        
        Case allShapes
            isShapeCustomShapeType = True
            
        Case CurveAny
            isShapeCustomShapeType = Globals.isVectorShape(shape)
        
        Case CurveAnyOrText
            isShapeCustomShapeType = Globals.isVectorShape(shape) Or (shape.Type = cdrTextShape)
        
        Case designShape
            isShapeCustomShapeType = isDesignShape(shape)
            
        Case CmykBlackOutline
        
            isShapeCustomShapeType = isCMYKBlackOutlineShape(shape)
        
        Case CmykBlackFill
            isShapeCustomShapeType = isCMYKBlackFillShape(shape)
        
        Case FillColorShapeType
            On Error GoTo ColorCastError
            Set color = shapeQuery.argument1
            On Error GoTo 0
            
            isShapeCustomShapeType = isShapeHavingFillColor(shape, color)
        
        Case OutlineColorShapeType
            On Error GoTo ColorCastError
            Set color = shapeQuery.argument1
            On Error GoTo 0
            
            isShapeCustomShapeType = isShapeHavingOutlineColor(shape, color)
            
        Case InvisibleProperlyShapeType
            
            isShapeCustomShapeType = Not isShapeVisibleProperly(shape, False)
            
        Case VisibleProperlyShapeType
        
            isShapeCustomShapeType = isShapeVisibleProperly(shape, False)
        
        
        Case ConfiMaskShapeType
            isShapeCustomShapeType = isShapeConfiMask(shape)
            
        Case ConfiBackgroundShapeType
            isShapeCustomShapeType = isShapeConfiBackground(shape)
        
        Case FancyHelperShapeType
            isShapeCustomShapeType = isShapeFancyHelperShape(shape)
        
        Case ValidForGlobalExportTypeShapeType
            globalExportType = shapeQuery.argument1
            isShapeCustomShapeType = isShapeValidForExportType(shape, globalExportType)
        
        Case InvalidForGlobalExportTypeShapeType
            globalExportType = shapeQuery.argument1
            isShapeCustomShapeType = Not isShapeValidForExportType(shape, globalExportType)
        
        Case AnyVariant
            isShapeCustomShapeType = isVariant(shape)
            
        Case customShapeType.ForAmazonConfiShapeType
            isShapeCustomShapeType = Globals.isShapeForAmazonConfi(shape)
            
        Case ForProductPictureShapeType
            isShapeCustomShapeType = isForProductPicture(shape)
        
        Case ForFancyShapeType
            isShapeCustomShapeType = isShapeForFancy(shape)
        
        Case NotForAmazonConfiShapeType
            isShapeCustomShapeType = isShapeValidForExportType(shape, AmazonExportType, , True)
        
        Case NotForFancyShapeType
            isShapeCustomShapeType = isShapeValidForExportType(shape, FancyExportType, , True)
        
        Case NotForProductPictureShapeType
            isShapeCustomShapeType = isShapeValidForExportType(shape, ProductImageExportType, , True)
        
        Case GuideLineShapeType
            isShapeCustomShapeType = isShapeGuideLineShape(shape)
        
        Case YourPhotoNoteShapeType
            isShapeCustomShapeType = isShapeYourPhotoNote(shape)
            
        Case PowerClipShapeType
            
            isShapeCustomShapeType = isShapePowerclip(shape)
        
        Case ValidForAmazonConfiExportShapeType
            If Not IsEmpty(shapeQuery.argument1) Then excludeInvisibleShapes = argument1
            If Not IsEmpty(shapeQuery.argument2) Then Set layer = shapeQuery.argument2
            isShapeCustomShapeType = isShapeValidFor(shape, False, False, True, excludeInvisibleShapes, False, layer)
        
        Case ValidForFancyConfiExportShapeType
            If Not IsEmpty(shapeQuery.argument1) Then excludeInvisibleShapes = argument1
            If Not IsEmpty(shapeQuery.argument2) Then Set layer = shapeQuery.argument2
            isShapeCustomShapeType = isShapeValidFor(shape, False, True, False, excludeInvisibleShapes, False, layer)
            
        Case ValidForProductPictureExportShapeType
            If Not IsEmpty(shapeQuery.argument1) Then excludeInvisibleShapes = argument1
            If Not IsEmpty(shapeQuery.argument2) Then Set layer = shapeQuery.argument2
            isShapeCustomShapeType = isShapeValidFor(shape, True, False, False, excludeInvisibleShapes, False, layer)
            
        Case ValidForSplittingForAmazonKonfiImportShapeType
            If Not IsEmpty(shapeQuery.argument1) Then excludeInvisibleShapes = argument1
            If Not IsEmpty(shapeQuery.argument2) Then Set layer = shapeQuery.argument2
            isShapeCustomShapeType = isShapeValidFor(shape, False, False, False, excludeInvisibleShapes, True, layer)
        
        Case NotValidForAmazonConfiExportShapeType
            isShapeCustomShapeType = Not isShapeCustomShapeType(shapeQuery.clone.setShapeType(ValidForAmazonConfiExportShapeType), shape)
        
        Case NotValidForFancyConfiExportShapeType
            isShapeCustomShapeType = Not isShapeCustomShapeType(shapeQuery.clone.setShapeType(ValidForFancyConfiExportShapeType), shape)
        
        Case NotValidForProductPictureExportShapeType
            isShapeCustomShapeType = Not isShapeCustomShapeType(shapeQuery.clone.setShapeType(ValidForProductPictureExportShapeType), shape)
        
        Case NotValidForSplittingForAmazonKonfiImportShapeType
            isShapeCustomShapeType = Not isShapeCustomShapeType(shapeQuery.clone.setShapeType(ValidForSplittingForAmazonKonfiImportShapeType), shape)
        
        Case GuideElementShapeType
            isShapeCustomShapeType = isShapeGuideElement(shape)

        Case VisualElementShapeType
            isShapeCustomShapeType = isShapeVisualElement(shape)
                
        Case DesignElementShapeType
            isShapeCustomShapeType = isShapeDesignElement(shape)
        
        Case bSplineShapeType
            isShapeCustomShapeType = isShapeBSpline(shape)
        
        Case AmazonImportPreviewImageShapeType
            isShapeCustomShapeType = isShapeAmazonImportPreviewImage(shape)
        
        Case BitmapInAmazonCDRShapeType
            isShapeCustomShapeType = isShapeBitmapInAmazonCDR(shape)
        
    End Select
    
    Exit Function
EffectTypeCastError:
    Err.Raise vbObjectError + 513, , "[Globals.isShapeCustomShapeType] argument1: " & shapeQuery.argument1 & ", kann nicht zu einem cdrEffectType konvertiert werden!"
ShapeTypeCastError:
    Err.Raise vbObjectError + 513, , "[Globals.isShapeCustomShapeType] argument1: " & shapeQuery.argument1 & ", kann nicht zu einem cdrShapeType konvertiert werden!"
ColorCastError:
    Err.Raise vbObjectError + 513, , "[Globals.isShapeCustomShapeType] argument1: " & shapeQuery.argument1 & ", kann nicht zu einer Farbe konvertiert werden!"
End Function



Public Function isShapeBitmapInAmazonCDR(shape As shape) As Boolean
    isShapeBitmapInAmazonCDR = InStr(Globals.getShapeNameLong(shape), Globals.getBitmapInAmazonExportCDRKeyWord)
End Function

Public Sub TestIsShapeAmazonImportPreviewImage()
    endIfNoActiveShape
    
    MsgBox "isShapeAmazonImportPreviewImage: " & isShapeAmazonImportPreviewImage(ActiveShape)
End Sub

Public Function isShapeAmazonImportPreviewImage(shape As shape) As Boolean
    isShapeAmazonImportPreviewImage = InStr(Globals.getShapeNameLong(shape), Globals.getAmazonImportPreviewImageKeyword)
End Function

Public Function getAmazonImportPreviewImageKeyword() As String
     getAmazonImportPreviewImageKeyword = "Vorschaubild Amazon-Konfi"
End Function


Public Function isShapeGuideElement(shape As shape) As Boolean
    isShapeGuideElement = _
                isRedOrPinkShape(shape) Or _
                isViewShape(shape) Or _
                isShapeGuideLineShape(shape) Or _
                isProductID(shape) Or _
                isDesignElementVariantContainerShapeType(shape) Or _
                isShapeUploadBoxCutShapeForConfiImportShapeType(shape, , False) Or _
                isShapeFancyCustomizationID(shape) Or _
                isShapeAmazonImportPreviewImage(shape)
End Function


Public Function isShapeVisualElement(shape As shape) As Boolean
    isShapeVisualElement = _
                isLook(shape) Or _
                isShapeConfiBackground(shape) Or _
                isShapeConfiMask(shape) Or _
                isGroundplate(shape) Or _
                isMainMask(shape) Or _
                isPhotoMask(shape) Or _
                isVariantMask(shape) Or _
                isExportableShape(shape) Or _
                isShapeAmazonImportPreviewImage(shape)
End Function


Public Function isShapeFancyHelperShape(shape As shape) As Boolean
    isShapeFancyHelperShape = _
        isRedOrPinkShape(shape) Or _
        isShapeGuideLineShape(shape) Or _
        isShapeUploadBoxCutShapeForConfiImportShapeType(shape, AnyUploadBoxType, False)
End Function


Public Sub TestIsShapeDesignElement()
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    MsgBox "isShapeDesignElement: " & isShapeDesignElement(ActiveShape)
End Sub


Public Function isShapeDesignElement(shape As shape) As Boolean
    If shape.Type = cdrGroupShape Then
        ' Uploadboxen sind eine zusammengehörige Einheit und bleiben als Ganzes ein Designelement
        If isUploadBox(shape) Then
            isShapeDesignElement = True
            Exit Function
        End If
        ' Eine Gruppe gilt nur dann als Designelement, wenn ausschließlich Designelemente darin liegen.
        ' Dann hält die CustomShapeTypeQuery die Gruppe als Ganzes zusammen (z.B. reine Kurven-Gruppe -> eine SVG).
        ' Gemischte Gruppen (mit Visual- oder Guide-Elementen) sind neutral und werden von der Query in ihre Einzelteile zerlegt.
        isShapeDesignElement = newCustomShapeTypeQuery(shape.shapes.All, DesignElementShapeType).isAllShapesMatchingQuery
        Exit Function
    End If

    isShapeDesignElement = _
            Not isShapeGuideElement(shape) And _
            Not isShapeVisualElement(shape)
End Function

Public Function isShapeStaticVariantContainer(shape As shape) As Boolean
    isShapeStaticVariantContainer = Globals.startsWith(Globals.getShapeNameLong(shape), "varCont(")
End Function


Public Sub TestIsShapeBSpline()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    MsgBox "isShapeBSpline: " & isShapeBSpline(ActiveShape)
    
End Sub

Public Function isShapeBSpline(shape As shape) As Boolean
    
    If Not shape.Type = cdrCustomShape Then Exit Function ' False
    
    On Error Resume Next
    Dim bSpline As bSpline
    Set bSpline = shape.bSpline
    On Error GoTo 0
    
    If bSpline Is Nothing Then Exit Function ' False
    
    isShapeBSpline = True
    
End Function


'@Description("Gibt an, on das 'shape' vom Typ her eines der Effektshapes ist. Effektformen wie z.B. Schatten hängen sich an eine Form, an der der Schatten erzeugt wird")
Public Function isShapeEffectShape(shape As shape) As Boolean
    isShapeEffectShape = _
        (shape.Type = cdrArtisticMediaGroupShape) Or _
        (shape.Type = cdrBevelGroupShape) Or _
        (shape.Type = cdrBlendGroupShape) Or _
        (shape.Type = cdrContourGroupShape) Or _
        (shape.Type = cdrCustomEffectGroupShape) Or _
        (shape.Type = cdrDropShadowGroupShape) Or _
        (shape.Type = cdrExtrudeGroupShape)
    
End Function


'Public Sub TestIsShapeConfiMask()
'    If Not ActiveShape Is Nothing Then
'        MsgBox Globals.isShapeConfiMask(ActiveShape)
'    End If
'End Sub

Public Function isShapeYourPhotoNote(shape As shape) As Boolean
    isShapeYourPhotoNote = shape.name = "deinfoto"
End Function



'Public Sub TestIsShapeGuideLineShape()
'
'    Globals.warnIfNoDocumentAndEnd
'    Globals.warnIfNoActiveShapeAndEnd
'
'    MsgBox "isShapeGuideLineShape: " & isShapeGuideLineShape(ActiveShape)
'
'End Sub



Public Function isShapeGuideLineShape(shape As shape) As Boolean
    
    If shape.CanHaveOutline Then
        If shape.outline.Type = cdrOutline Then
            If isRDGGloss(shape.outline.color) Then
                isShapeGuideLineShape = True
                Exit Function
            End If
        End If
    End If
    
    If shape.CanHaveFill Then
        If shape.fill.Type = cdrUniformFill Then
            If isRDGGloss(shape.fill.UniformColor) Then
                isShapeGuideLineShape = True
                Exit Function
            End If
        End If
    End If
End Function


Public Function makeShapeGuideLineShape(shape As shape)
    shape.outline.Type = cdrOutline
    shape.outline.color = getRGDGloss
End Function


Public Function isShapeConfiMask(shape As shape) As Boolean
    isShapeConfiMask = InStr(shape.name, getConfiMaskKeyWord)
End Function

Public Function isShapeConfiBackground(shape As shape) As Boolean
    isShapeConfiBackground = InStr(shape.name, getConfiBackgroundKeyWord)
End Function

Public Function isShapeHavingFillColor(shape As shape, color As color) As Boolean

    If shape.CanHaveFill Then
        isShapeHavingFillColor = shape.fill.UniformColor.IsSame(color)
    End If

End Function


Public Function isShapeHavingOutlineColor(shape As shape, color As color) As Boolean
    
    If shape.CanHaveOutline Then
        isShapeHavingOutlineColor = shape.outline.color.IsSame(color)
    End If
    
End Function



Public Function isCMYKBlackOutlineShape(shape As shape) As Boolean
    
    If shape.CanHaveOutline Then
        If shape.outline.Type = cdrOutline Then
            isCMYKBlackOutlineShape = isColorCMYKBlack(shape.outline.color)
        End If
    End If
    
End Function

 
Public Function isCMYKBlackFillShape(shape As shape) As Boolean
    
    If shape.CanHaveFill Then
    
        If shape.fill.Type = cdrUniformFill Then
           isCMYKBlackFillShape = isColorCMYKBlack(shape.fill.UniformColor)
        End If
    End If
    
End Function


' Prüft, ob eine CMYK-Farbe schwarz genug ist.
' Das kann schon durch folgende Werte erreicht werden: C: 80, M: 80, Y: 80, K: 90
Public Function isColorCMYKBlack(color As color) As Boolean
    
    If Not color.IsCMYK Then
        Exit Function ' Return false
    End If
    
    If color.CMYKBlack = 100 Then
        isColorCMYKBlack = True
        Exit Function
    End If
    
    If color.CMYKBlack >= 90 Then
        
        Dim darkness As Double
        darkness = darkness + color.CMYKYellow * 0.2
        darkness = darkness + color.CMYKCyan
        darkness = darkness + color.CMYKMagenta
        
        If darkness >= 176 Then
            isColorCMYKBlack = True
        End If
    End If
    
End Function



Public Function isFancyBitmap(shape As shape) As Boolean
    If InStr(shape.name, getBitmapInFancyKeyWord) Then
        isFancyBitmap = True
    End If
End Function

Public Function isFancySVG(shape As shape) As Boolean
    If InStr(shape.name, getSVGInFancyKeyWord) Then
        isFancySVG = True
    End If
End Function


Public Function isDesignShape(shape As shape) As Boolean

    If Not shape.Type = cdrGroupShape Then
        isDesignShape = False
        Exit Function
    End If

    Dim design As New productDesign
    design.newProductDesign shape
    If design.isValidProductDesign Then
        isDesignShape = True
        Exit Function
    End If
    
    isDesignShape = False
End Function


Public Function isParagraphText(shape As shape)
    If shape.Type = cdrTextShape Then
        If shape.text.Type = cdrParagraphText Then
            isParagraphText = True
            Exit Function
        End If
    End If
    
    isParagraphText = False
End Function


Public Sub TestIsDesignElementVariantShapeType()
    If Not ActiveShape Is Nothing Then
        MsgBox "isDesignElementVariantShapeType: " & isDesignElementVariantShapeType(ActiveShape)
    End If
End Sub


Public Function isDesignElementVariantShapeType(shape As shape)
    isDesignElementVariantShapeType = startsWith(shape.name, "desVar(")
End Function


' Gibt die Nummer einer Designelementvariante zurück
' Bei 'desVar(4)' wird eine '4' zurückgegeben
Public Function getDesignElementVariantNr(shape As shape) As Integer
    getDesignElementVariantNr = CInt(subStrWithStrings(shape.name, "(", ")"))
End Function


Public Function isDesignElementVariantContainerShapeType(shape As shape)
    isDesignElementVariantContainerShapeType = startsWith(shape.name, "desVarCont(")
End Function


Public Function areVariantsOfLayersEqual(layers As collection, variantType As variantType)
    
    If layers.count < 2 Then
        Exit Function ' Return False
    End If
    
    Dim firstLayer As ProductDesignLayer
    Set firstLayer = layers(1)
    
    For i = 2 To layers.count
        
        If firstLayer.areVariantsOfLayersEqual(layers(i), variantType) Then
            areVariantsOfLayersEqual = False
            Exit Function ' Return False
        End If
        
    Next i
    
    areVariantsOfLayersEqual = True
End Function



Public Sub TestIsShapeToPutOnMask()
    
    If Not ActiveShape Is Nothing Then
        
        Dim design As productDesign
        Set design = Globals.getDesignFromShape(ActiveShape)
        
        Dim selectedShape As shape
        Set selectedShape = ActiveShape
        
        MsgBox "isShapeToPutOnMask: " & isShapeToPutOnMask(selectedShape, design.findLayerOfShape(selectedShape))
        
    End If
    
End Sub

Public Function isShapeToPutOnMask(shape As shape, layer As ProductDesignLayer) As Boolean

    Dim jobOrSubJob As Object
    Set jobOrSubJob = PlaceFile.findSubJobOrJob(shape, True, True, , layer)
    
    If jobOrSubJob Is Nothing Then Exit Function ' False
    
    Dim job As PlaceFileJob
    
    If TypeOf jobOrSubJob Is PlaceFileJob Then
        Set job = jobOrSubJob
    Else ' SubJob
        Set job = jobOrSubJob.parentJob
    End If
    
    isShapeToPutOnMask = job.isToPutAboveMainMask
    
End Function


Public Sub TestIsShapeRDGWhiteShape()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    MsgBox "isShapeRDGWhiteShape: " & isShapeRDGWhiteShape(ActiveShape)
    
End Sub


Public Function isShapeRDGWhiteShape(shape As shape) As Boolean
    If shape.CanHaveFill Then
        If shape.fill.Type = cdrUniformFill Then
            If isRDGWhite(shape.fill.UniformColor) Then
                isShapeRDGWhiteShape = True
                Exit Function
            End If
        End If
    End If
    
    If shape.CanHaveOutline Then
        If shape.outline.Type = cdrOutline Then
            If isRDGWhite(shape.outline.color) Then
                isShapeRDGWhiteShape = True
                Exit Function
            End If
        End If
    End If
    
End Function


Public Function isExportableShape(shape As shape) As Boolean
    isExportableShape = startsWith(shape.name, ">")
End Function


Public Function isCurveWithText(shape As shape) As Boolean
    
    For i = 1 To shape.effects.count
        If shape.effects(i).Type = cdrControlPath Then
            For j = 1 To shape.effects(i).ControlPath.effects.count
                If shape.effects(i).ControlPath.effects(j).Type = cdrTextOnPath Then
                    
                    isCurveWithText = True
                    Exit Function
                    'MsgBox "Found Text on Path = " & Shape.Effects(i).ControlPath.Effects(j).TextOnPath.text.text.Story.text
                End If
            Next j
        End If
    Next i
End Function


Public Sub TestAddEmptyShapeRangeToShapeRange()
    
    Dim range1 As New shapeRange
    Dim range2 As New shapeRange
    
    range1.AddRange range2
    
    MsgBox "kein Absturz"
End Sub

Public Sub TestGetEffectShapesOfShape()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    MsgBox "getEffectsShapesOfShape: " & Globals.getShapeRangeDisplayNames(getEffectsShapesOfShape(ActiveShape), , , True)
    
End Sub


Public Sub TestGetEffectShapesOfShapeSeperated()
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    Dim str As String
    
    For i = 1 To ActiveShape.effects.count
        Dim effectShapes As shapeRange
        Set effectShapes = getEffectShapes(ActiveShape.effects(i))
        str = str & Globals.getEffectTypeName(ActiveShape.effects(i).Type) & ": " & Globals.getShapeRangeDisplayNames(effectShapes) & " count: " & effectShapes.count & vbNewLine
        
        Set effectShapes = Nothing
    Next i
    
    MsgBox str
    
End Sub


Public Function getEffectsShapesOfShape(shape As shape) As shapeRange
    Set getEffectsShapesOfShape = getEffectsShapes(shape.effects)
End Function


Private Function getEffectsShapes(effects As effects) As shapeRange
    
    Dim shapes As New shapeRange
    
    For i = 1 To effects.count
        shapes.AddRange getEffectShapes(effects(i))
    Next i
    
    Set getEffectsShapes = shapes
    
End Function


Public Function getEffectShapes(fx As effect) As shapeRange
    
    Dim shapes As New shapeRange
    
    Select Case fx.Type
        Case cdrBlend
            shapes.add fx.Blend.BlendGroup
        
        Case cdrExtrude
            shapes.add fx.Extrude.ExtrudeGroup
            If fx.Extrude.UseBevel Then shapes.add fx.Extrude.BevelGroup
            'shapes.add fx.Extrude.BevelGroup
            
        Case cdrEnvelope
            ' Hat keine Form
            
        Case cdrTextOnPath
            shapes.add fx.TextOnPath.path
            
        Case cdrControlPath
            shapes.AddRange getEffectsShapes(fx.ControlPath.effects)
            
        Case cdrDropShadow
            shapes.add fx.dropShadow.ShadowGroup
            
        Case cdrContour
            shapes.add fx.Contour.ContourGroup
        
        Case cdrDistortion
            ' Hat keine Form
        
        Case cdrPerspective
            ' Hat keine Form
        
        Case cdrLens
            If fx.Lens.Frozen Then shapes.AddRange fx.Lens.shapes
            
    End Select
    
    Set getEffectShapes = shapes
    
End Function



Public Sub TestRemoveShapeEffectShapes()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    removeShapeEffectShapes ActiveShape
    
End Sub


' ACHTUNG: Der Blockshadow-Effect wird nicht entfernt. Ist leider nicht in 'cdrEffectType' vorhanden. Wird also nicht als Effekt gelistet >:(
Public Function removeShapeEffectShapes(shape As shape)
    While shape.effects.count > 0
        shape.ClearEffect shape.effects.item(1).Type
    Wend
    
'    ' Der Blockshadow-Effect ist leider nicht in 'cdrEffectType' vorhanden
'    Dim selection As shapeRange
'    Set selection = Globals.getEffectsShapesOfShape(shape)
'    shape.Separate
'    selection.delete
    
End Function



Public Function getShapesFromTo(from As Integer, tooo As Integer, shapes As shapeRange) As shapeRange
    
    Dim fromToShapes As New shapeRange
    
    For i = from To tooo
        Globals.safeAddShapeToShapeRange shapes(i), fromToShapes
    Next i
    
    Set getShapesFromTo = fromToShapes
    
End Function


Public Sub TestIsShapeHavingContourEffect()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    MsgBox "isShapeHavingContourEffect: " & isShapeHavingContourEffect(ActiveShape)
    
End Sub


Public Function isShapeHavingContourEffect(shape As shape) As Boolean
    isShapeHavingContourEffect = isShapeHavingEffect(shape, cdrContour)
End Function


Public Function isShapeHavingEffect(shape As shape, fx As cdrEffectType) As Boolean
    isShapeHavingEffect = Not getShapeEffect(shape, fx) Is Nothing
End Function


Public Function getShapeEffect(shape As shape, fx As cdrEffectType) As effect
    
    For i = 1 To shape.effects.count
        If shape.effects(i).Type = fx Then
            
            Set getShapeEffect = shape.effects(i)
            Exit Function
        End If
    Next i
    
End Function


Public Function isEffectHavingShape(fx As cdrEffectType) As Boolean
    
    Select Case fx
        Case cdrBlend, cdrExtrude, cdrEnvelope, cdrDropShadow
            isEffectHavingShape = True
    End Select
    
End Function


Public Function isQRCode(shape As shape) As Boolean
    ' Achtung: B-Splines sind auch cdrCustomShape
    If shape.Type = cdrCustomShape And Not shape.CanHaveFill And Not shape.CanHaveOutline Then
        isQRCode = True
    End If
End Function


Public Function isShapeUploadBoxCutShapeForConfiImportShapeType(shape As shape, Optional uploadBoxTypee As UploadBoxType = AnyUploadBoxType, Optional hasToBeYellow As Boolean = True) As Boolean
    
    Dim result As Boolean
    
    If shape.CanHaveOutline Then
        If shape.fill.Type = cdrNoFill And shape.outline.Type = cdrOutline Then
            If shape.outline.color.HexValue = "#FFFF00" Or Not hasToBeYellow Then ' Gelb
                
                Dim isBounded As Boolean
                isBounded = InStr(shape.name, "uploadbox_confi_true") Or InStr(shape.name, "uploadbox_amazon_true") ' amazon Bezeichnung für Rückwärtskompatibilität
                Dim isFree As Boolean
                isFree = InStr(shape.name, "uploadbox_confi_false") Or InStr(shape.name, "uploadbox_amazon_false")
                
                Select Case uploadBoxTypee
                    Case UploadBoxType.BoundedUploadBoxType
                        result = isBounded
                    Case UploadBoxType.FreeUploadBoxType
                        result = isFree
                    Case UploadBoxType.AnyUploadBoxType
                        result = isBounded Or isFree
                End Select
            End If
        End If
    End If
    
    isShapeUploadBoxCutShapeForConfiImportShapeType = result
End Function



Public Function isViewShape(shape As shape) As Boolean
    
    If shape.CanHaveOutline Then
        If shape.fill.Type = cdrNoFill And shape.outline.Type = cdrOutline Then
            If shape.outline.color.HexValue = getViewShapeColor.HexValue Then  ' Cyan
                isViewShape = True
                Exit Function
            End If
        End If
    End If
    
    isViewShape = False
End Function



Public Function getViewShapeColor() As color
    If p_viewShapeColor Is Nothing Then
        Set p_viewShapeColor = CreateColor("#00FFFF") ' CreateRGBColor(0, 255, 255) ' Cyan
    End If
    Set getViewShapeColor = p_viewShapeColor
End Function


Public Sub TestIsMainMask()
    MsgBox "Ist Hauptmaske: " & isMainMask(ActiveShape)
End Sub


Public Function getMainMaskKeyWord() As String
    getMainMaskKeyWord = "HauptMaske"
End Function

Public Function isMainMask(shape As shape) As Boolean
    isMainMask = InStr(Globals.getShapeNameLong(shape), getMainMaskKeyWord)
End Function


Public Function isMotive(shape As shape) As Boolean
    isMotive = isMotiveName(Globals.getShapeNameLong(shape))
End Function



Public Function isMotiveName(name As String) As Boolean
    isMotiveName = InStr(name, "motiv")
End Function


Public Function isShapeAmazonCustomerTextInBlanksKeyWord(shape As shape, Optional recursive As Boolean = True) As Boolean
    If shape Is Nothing Then Exit Function ' False ' Aufgrund von Rekursion kann es sein, dass es kein Parent gibt
    isShapeAmazonCustomerTextInBlanksKeyWord = InStr(Globals.getShapeNameLong(shape), Globals.getAmazonCustomerTextInBlanksKeyWord)
    If recursive Then
        isShapeAmazonCustomerTextInBlanksKeyWord = isShapeAmazonCustomerTextInBlanksKeyWord Or isShapeAmazonCustomerTextInBlanksKeyWord(Globals.getParentShapeOfShape(shape))  ' Rekursiv die Parents auch prüfen
    End If
End Function

Public Function isShapeAmazonMultiLineTextBoxKeyWord(shape As shape, Optional recursive As Boolean = True) As Boolean
    If shape Is Nothing Then Exit Function ' False ' Aufgrund von Rekursion kann es sein, dass es kein Parent gibt
    isShapeAmazonMultiLineTextBoxKeyWord = InStr(Globals.getShapeNameLong(shape), Globals.getAmazonMultiLineTextBoxKeyWord)
    If recursive Then
        isShapeAmazonMultiLineTextBoxKeyWord = isShapeAmazonMultiLineTextBoxKeyWord Or isShapeAmazonMultiLineTextBoxKeyWord(Globals.getParentShapeOfShape(shape))  ' Rekursiv die Parents auch prüfen
    End If
End Function


Public Sub TestIsShapeAmazonIgnoreCustomerColor()
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    MsgBox "isShapeAmazonIgnoreCustomerColor: '" & isShapeAmazonIgnoreCustomerColor(ActiveShape) & "'" & vbNewLine & "getShapeNameLong: '" & Globals.getShapeNameLong(ActiveShape) & "'"
    
End Sub



Public Function isShapeAmazonIgnoreCustomerColor(shape As shape) As Boolean
    isShapeAmazonIgnoreCustomerColor = InStr(Globals.getShapeNameLong(shape), Globals.getIgnoreAmazonCustomerColorKeyWord)
End Function




' Gibt den Motivnamen zurück. Dabei werden Eigenschaften die hinten dranhängen ausgelassen
' "Pusteblume4_motiv_locked" wird zu "Pusteblume4_motiv"
Public Function getMotiveName(shape As shape) As String
    Dim motiveKeyword As String: motiveKeyword = "_motiv"
    
    getMotiveName = left(shape.name, InStr(shape.name, motiveKeyword) + Len(motiveKeyword) - 1)
End Function



Public Function isLocked(shape As shape, Optional recursive As Boolean = True) As Boolean
    If shape Is Nothing Then Exit Function ' False ' Aufgrund von Rekursion kann es sein, dass es kein Parent gibt
    isLocked = InStr(Globals.getShapeNameLong(shape), Globals.getLockedKeyWord)
    If recursive Then
        isLocked = isLocked Or isLocked(Globals.getParentShapeOfShape(shape))  ' Rekursiv die Parents auch prüfen
    End If
End Function



Public Function isTextLocked(shape As shape, Optional recursive As Boolean = True) As Boolean
    If shape Is Nothing Then Exit Function ' False ' Aufgrund von Rekursion kann es sein, dass es kein Parent gibt
    isTextLocked = InStr(Globals.getShapeNameLong(shape), getTextLockedKeyWord)
    If recursive Then
        isTextLocked = isTextLocked Or isTextLocked(Globals.getParentShapeOfShape(shape))  ' Rekursiv die Parents auch prüfen
    End If
End Function



Public Function isPhotoMask(shape As shape) As Boolean
    isPhotoMask = InStr(Globals.getShapeNameLong(shape), "FotoMaske")
End Function


Public Sub TestIsVariant()
    Globals.endIfNoDocumentOpen
    Globals.endIfNoActiveShape
    MsgBox "isVariant: " & isVariant(ActiveShape)
End Sub


Public Function isVariant(shape As shape) As Boolean
    ' Natürlich könnten alle Abfragen in eine Zeile. Aber VBA würde alle Abfragen in der Zeile ausführen.
    ' Von daher ist die untere Schreibweise schneller
    
    If isGroundplate(shape) Then
        GoTo ReturnTrue
    ElseIf isStaticVariant(shape) Then
        GoTo ReturnTrue
    ElseIf isDesignElementVariantShapeType(shape) Then
        GoTo ReturnTrue
    ElseIf isPhotoMask(shape) Then
        GoTo ReturnTrue
    End If
    
    Exit Function
ReturnTrue:
    isVariant = True
End Function

Public Sub TestIsShapeStaticVariant()
    
    Globals.endIfNoDocumentOpen
    Globals.endIfNoActiveShape
    
    MsgBox "isStaticVariant: " & isStaticVariant(ActiveShape)
    
End Sub


Public Sub TestIsStaticVariant()
    MsgBox "isStaticVariant: " & isStaticVariant(ActiveShape)
End Sub


Public Function isStaticVariant(shape As shape) As Boolean
    isStaticVariant = isStaticOrLayerVariant(shape) And (shape.Type = cdrGroupShape)
End Function


Public Function isLayerVariant(shape As shape) As Boolean
    isLayerVariant = isStaticOrLayerVariant(shape) And Not shape.Type = cdrGroupShape And Globals.isRedOrPinkShape(shape)
End Function

Public Function isStaticOrLayerVariant(shape As shape) As Boolean
    isStaticOrLayerVariant = InStr(shape.name, "var_") Or InStr(Globals.getShapeNameLong(shape), "var_")
End Function


Public Function isVariantMask(shape As shape) As Boolean
    If InStr(shape.name, "HauptMaske[") Then
        isVariantMask = True
    End If
End Function


Public Sub TestShapeIsStaticVariant()
    If Not ActiveShape Is Nothing Then
        MsgBox "Static Variante: " & isStaticVariant(ActiveShape)
    End If
End Sub



Public Sub TestIsGroundPlate()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    MsgBox "Grundplatte: " & isGroundplate(ActiveShape)
    
End Sub


Public Function isGroundplate(shape As shape) As Boolean
    ' Variantengruppen (Name enthaelt 'var_') sind nie Grundplatten. Wichtig, da z.B. eine
    ' Variantengruppe 'var_edelstahl_hintergrundplatte(...)' den Teilstring 'grundplatte'
    ' (in 'hintergrundplatte') enthaelt und sonst faelschlich als Grundplatte erkannt wuerde.
    If isStaticOrLayerVariant(shape) Then Exit Function

    isGroundplate = InStr(LCase(getShapeNameLong(shape)), "grundplatte") Or InStr(LCase(shape.name), "grundplatte")
End Function



Public Function isGroundPlateTransparent(shape As shape) As Boolean
    
    ' Transparent:
    ' - Acryl Klar
    ' - Acryl satiniert
    '
    ' Nicht Transparent:
    ' - Acryl Satiniert Schwarz
    If InStr(LCase(shape.name), "acryl_klar") Or InStr(LCase(shape.name), "acryl_satiniert") And InStr(LCase(shape.name), "schwarz") = 0 Then
        isGroundPlateTransparent = True
        Exit Function
    End If
    
    isGroundPlateTransparent = False

End Function




' Die Gravurfarbe auf verschieden Gravurmaterialien (nicht UV)
' TODO besser im Job hinterlegen, welche Gravurfarbe eine Grundplatte ergibt
Public Function getGravingColorForGroundPlate(groundplateShape As shape) As color

        ' SCHIEFER
    If InStr(groundplateShape.name, "Schiefer") Then
        Set getGravingColorForGroundPlate = CreateColor("#b3b3b3") ' 40% Weiß
        
        ' ACRYL
    ElseIf InStr(groundplateShape.name, "Acryl") Then
        If InStr(groundplateShape.name, "Acryl_Klar") Or InStr(groundplateShape.name, "Acryl_Satiniert") Then
            Set getGravingColorForGroundPlate = CreateColor("#FFFFFF") ' Weiß
        Else
            Set getGravingColorForGroundPlate = CreateColor("#E6E6E6") ' 10% Weiß
        End If
        
        ' KUNSTSTOFF
    ElseIf InStr(groundplateShape.name, "Kunststoff") Then
        If InStr(groundplateShape.name, "Weiß") Or InStr(groundplateShape.name, "Gold") Or _
            InStr(groundplateShape.name, "Rose") Or InStr(groundplateShape.name, "Silber") Then
            
            Set getGravingColorForGroundPlate = CreateColor("#0e0e0e") ' Fast Schwarz
        Else
            Set getGravingColorForGroundPlate = CreateColor("#E6E6E6") ' 10% Weiß
        End If
        
        ' NUSS & KIRSCHHOLZ
    ElseIf InStr(groundplateShape.name, "Nussholz") Or InStr(groundplateShape.name, "Kirschholz") Then
        Set getGravingColorForGroundPlate = CreateColor("#120A09") ' Dunkelbraun
        
        ' PAPPEL & BUCHENHOLZ
    ElseIf InStr(groundplateShape.name, "Pappelholz") Or InStr(groundplateShape.name, "Buchenholz") Then
        Set getGravingColorForGroundPlate = CreateColor("#4D2B19") ' Hellbraun
        
        ' LEDER
    ElseIf InStr(groundplateShape.name, "Leder") Then
        Set getGravingColorForGroundPlate = CreateColor("#0F0907") ' Braun
        
    Else
        ' EDELSTAHL und andere
        Set getGravingColorForGroundPlate = CreateColor("#000000") ' Schwarz
    End If
End Function


Public Function isColorGravingColor(color As color) As Boolean
    
    If gravingColors Is Nothing Then
        Set gravingColors = New collection
        gravingColors.add CreateColor("#b3b3b3") ' 40% Weiß
        gravingColors.add CreateColor("#FFFFFF") ' Weiß
        gravingColors.add CreateColor("#E6E6E6") ' 10% Weiß
        gravingColors.add CreateColor("#0e0e0e") ' Fast Schwarz
        gravingColors.add CreateColor("#120A09") ' Dunkelbraun
        gravingColors.add CreateColor("#4D2B19") ' Hellbraun
        gravingColors.add CreateColor("#0F0907") ' Braun
        gravingColors.add CreateColor("#000000") ' Schwarz
    End If
    
    
    
    For i = 1 To gravingColors.count
        Dim currentColor As color
        Set currentColor = gravingColors(i)
        
        If currentColor.HexValue = color.HexValue Then
            isColorGravingColor = True
            Exit Function
        End If
        
        Set currentColor = Nothing
    Next i
    
End Function


Public Function isGroundPlateSatin(shape As shape) As Boolean
    isGroundPlateSatin = InStr(LCase(shape.name), "satiniert")
End Function


Public Function isLook(shape As shape) As Boolean
    isLook = InStr(shape.name, "Look")
End Function



Public Sub TestIsUploadBox()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    MsgBox "isUploadBox: " & isUploadBox(ActiveShape)
    
End Sub



Public Function isUploadBox(shape As shape, Optional uploadBoxTypee As UploadBoxType = AnyUploadBoxType) As Boolean
    
    Dim result As Boolean
    
    Select Case uploadBoxTypee
        Case UploadBoxType.AnyUploadBoxType
            result = InStr(shape.name, "uploadbox_")
        Case UploadBoxType.BoundedUploadBoxType
            result = InStr(shape.name, "uploadbox_true")
        Case UploadBoxType.FreeUploadBoxType
            result = InStr(shape.name, "uploadbox_false")
    End Select
    
    
    isUploadBox = result
End Function


Public Function createConfiUploadBoxCutForImportShapeType(uploadBoxShape As shape) As shape
    Dim result As shape
    Set result = createUploadboxBoundingShape(uploadBoxShape)
    
    ' Gelb färben
    result.fill.ApplyNoFill
    result.outline.Type = cdrOutline
    result.outline.color = CreateColor("#FFFF00")
    result.outline.width = Globals.getHairlineThickness
    
    ' Name
    If Globals.isUploadBox(uploadBoxShape, BoundedUploadBoxType) Then
        result.name = "uploadbox_confi_true"
    Else
        result.name = "uploadbox_confi_false"
    End If

    
    Set createConfiUploadBoxCutForImportShapeType = result
End Function


Public Function createUploadboxBoundingShape(boundedUploadBox As shape) As shape

    Set createUploadboxBoundingShape = ActiveLayer.CreateCurve(getUploadboxBoundingShapeCurve(boundedUploadBox)) 'photo.bitmap. ' Globals.copyPasteShape(Globals.getPhotoOfUploadBoxGroup(boundedUploadBox), True)
    
End Function


Public Function getUploadboxBoundingShapeCurve(uploadBoxShape As shape) As curve
    
    If Globals.isShapePowerclip(uploadBoxShape) Then
        Set getUploadboxBoundingShapeCurve = uploadBoxShape.DisplayCurve
    ElseIf Globals.isShapeUploadBoxCutShapeForConfiImportShapeType(uploadBoxShape, , False) Then
        Set getUploadboxBoundingShapeCurve = uploadBoxShape.curve
    Else
        Dim photo As shape
        Set photo = Globals.getPhotoOfUploadBoxGroup(uploadBoxShape)
        Set getUploadboxBoundingShapeCurve = photo.DisplayCurve
    End If
    
End Function



Public Sub TestConvertOldBoundedUploadboxToNew()
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    convertOldBoundedUploadboxToNew ActiveShape, Globals.getLogger(True)
End Sub


Public Function convertOldBoundedUploadboxToNew(uploadBox As shape, Optional logger As logger)

    If Not logger Is Nothing Then logger.addTab , "[Globals.convertOldBoundedUploadboxToNew] uploadbox: '" & Globals.getShapeDisplayName(uploadBox) & "'"
    
    If isShapePowerclip(uploadBox) Then Exit Function
    
    ' Nur Uploadboxen, die begrenzt sind sollen eine Powerclip nutzen
    If isUploadBox(uploadBox, BoundedUploadBoxType) Then Exit Function
    
    
    ' Merken wo die Uploadbox lag und welchen Parent es hatte
    ' -------------
    Dim parentShapesOfUploadbox As shapes
    Set parentShapesOfUploadbox = Globals.getParentShapes(uploadBox)
    
    Dim uploadboxIndexInParentGroup As Integer
    uploadboxIndexInParentGroup = Globals.getShapeIndexInParentGroup(uploadBox)
    
    If Not logger Is Nothing Then logger.logINFO "uploadboxIndexInParentGroup: '" & uploadboxIndexInParentGroup & "'"
    ' -------------
    
    
    
    Dim photo As shape
    Set photo = Globals.getPhotoOfUploadBoxGroup(uploadBox)
    
    ' Dein Foto Hinweis
    Dim yourPhotoNote As shape
    Set yourPhotoNote = Globals.getYourPhotoTextGroupOfUploadBoxGroup(uploadBox)
    
    uploadBox.Ungroup
    Set uploadBox = Nothing
    
    Dim powerClip As shape
    Set powerClip = createPowerClip(photo)
    
    photo.bitmap.ResetCropEnvelope
    
    
    ' Das Hinzufügen von Formen in die Powerclip funktioniert nur, wenn das Powerclip nicht in einier Gruppe ist. Danke Corel >:(
    powerClip.OrderFrontOf ActiveLayer.shapes.First
    photo.OrderFrontOf ActiveLayer.shapes.First
    yourPhotoNote.OrderFrontOf ActiveLayer.shapes.First
    
    ' Erst jetzt lassen sich die Formen hinzufügen
    photo.AddToPowerClip powerClip
    yourPhotoNote.AddToPowerClip powerClip
    
    ' Powerclip da hin sortieren, wo zuvor die Uploadbox war (Die Uploadbox wurde aufgelöst und das Foto hat dann die Position bekommen (quasi))
    Globals.orderShapeAtIndex powerClip, parentShapesOfUploadbox, uploadboxIndexInParentGroup, logger
    
    powerClip.name = "uploadbox_true"
    
    If Not logger Is Nothing Then logger.removeTab
    
End Function



Public Function convertNewUploadboxToOld(uploadBox As shape, Optional logger As logger)
    
    If Not logger Is Nothing Then logger.addTab , "[Globals.convertNewUploadboxToOld] uploadbox: '" & Globals.getShapeDisplayName(uploadBox) & "'"
    
    If Not isShapePowerclip(uploadBox) Then Exit Function
    
    Dim powerClipCurveShape As shape
    Set powerClipCurveShape = ActiveLayer.CreateCurve(uploadBox.curve.GetCopy)
    
    Dim childs As shapeRange
    Set childs = uploadBox.powerClip.ExtractShapes
    
    uploadBox.delete
    
    Set childs = Globals.intersectShapeWithShapeRange(powerClipCurveShape, childs)
    
    Dim group As shape
    Set group = childs.group
    
    group.name = "uploadbox_true"
    
    powerClipCurveShape.delete
    
    If Not logger Is Nothing Then logger.removeTab
    
End Function



Public Sub TestIsShapePowerclip()
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    MsgBox "isShapePowerclip: " & isShapePowerclip(ActiveShape)
End Sub



Public Function isShapePowerclip(shape As shape) As Boolean
    Dim a As Boolean
    
    On Error GoTo NoPowerclip
    a = shape.powerClip.ContentsLocked
    On Error GoTo 0
    
    isShapePowerclip = True
    Exit Function
NoPowerclip:
End Function



Public Function createPowerClip(shapeWithCurve As shape) As shape

    Dim powerClip As shape
    Set powerClip = loadPowerClipCDR
    
    powerClip.SetBoundingBox shapeWithCurve.boundingBox.left, shapeWithCurve.boundingBox.Bottom, shapeWithCurve.boundingBox.width, shapeWithCurve.boundingBox.height
    powerClip.OrderFrontOf shapeWithCurve
    
    Set powerClip = Globals.intersectShapes(shapeWithCurve, powerClip)
    
    Set createPowerClip = powerClip
End Function



Public Function loadPowerClipCDR() As shape
    
    Dim powerClip As shape
    
    Dim path As String
    path = Globals.getMainFolderOfServer & "\Globals\Data\Powerclip.cdr"
    
    Set powerClip = Globals.loadCDR(path)
    
    powerClip.name = "Powerclip"
    
    Set loadPowerClipCDR = powerClip
End Function


Public Function createQRCode() As shape
    Set createQRCode = loadQRCodeCDR
End Function


Public Function loadQRCodeCDR() As shape
    Dim qrCode As shape
    
    Dim path As String
    path = Globals.getMainFolderOfServer & "\Globals\Data\QR-Code.cdr"
    
    Set qrCode = Globals.loadCDR(path)
    
    qrCode.name = "QR-Code"
    
    Set loadQRCodeCDR = qrCode
End Function


Public Function getPhotoOfUploadBoxGroup(uploadBox As shape, Optional logger As logger) As shape
    
    If Not logger Is Nothing Then logger.addTab , "[Globals.getPhotoOfUploadBoxGroup]"
    
    Dim childShapes As shapes
    Set childShapes = getChildShapesOfUploadbox(uploadBox, logger)
    
    Set getPhotoOfUploadBoxGroup = childShapes.FindShape("uploadbox")
    
    ' Falls das Foto nicht anhand des Namens gefunden werden konnte, einfach die 2. Form in der Gruppe nehmen
    If getPhotoOfUploadBoxGroup Is Nothing Then
        If childShapes.count > 1 Then
            Set getPhotoOfUploadBoxGroup = childShapes(2)
        End If
    End If
    
    If Not logger Is Nothing Then logger.removeTab
End Function



Public Function TestGetYourPhotoTextGroupOfUploadBoxGroup()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    MsgBox "getYourPhotoTextGroupOfUploadBoxGroup: " & IIf(getYourPhotoTextGroupOfUploadBoxGroup(ActiveShape) Is Nothing, "Nothing", "Something")
    
End Function



Public Function getYourPhotoTextGroupOfUploadBoxGroup(uploadBox As shape) As shape
    Dim childShapes As shapes
    Set childShapes = getChildShapesOfUploadbox(uploadBox)
    Set getYourPhotoTextGroupOfUploadBoxGroup = childShapes.FindShape("deinfoto")
End Function



Public Function getChildShapesOfUploadbox(uploadBox As shape, Optional logger As logger) As shapes
    If Not logger Is Nothing Then logger.addTab , "[Globals.getChildShapesOfUploadbox]"
    
    If isShapePowerclip(uploadBox) Then
        Set getChildShapesOfUploadbox = uploadBox.powerClip.shapes
    Else
        Set getChildShapesOfUploadbox = uploadBox.shapes
    End If
    
     If Not logger Is Nothing Then logger.removeTab
End Function



Public Function isColorAble(shape As shape, Optional recursive As Boolean = True)
    If shape Is Nothing Then Exit Function ' False ' Aufgrund von Rekursion kann es sein, dass es kein Parent gibt
    isColorAble = InStr(Globals.getShapeNameLong(shape), "colorable")
    If recursive Then
        isColorAble = isColorAble Or isColorAble(Globals.getParentShapeOfShape(shape))  ' Rekursiv die Parents auch prüfen
    End If
End Function



Public Sub TestIsShapeFullTransparent()
    
    endIfNoActiveShape
    
    MsgBox "isShapeFullTransparent: " & isShapeFullTransparent(ActiveShape)
    
End Sub



Public Function isShapeFullTransparent(shape As shape) As Boolean
    
    Dim result As Boolean
    
    ' Wenn 'shape' eine Gruppe ist und eine Unterform voll transparent ist, dann sagt Corel fälschlicherweise,
    ' dass die gesamte Gruppe voll transparent ist, was falsch ist. (Kam aber bei einer Gruppe von über 4000 Shapes vor!)
    ' Deshalb werden alle Unterformen der Gruppe geprüft
    If shape.Type = cdrGroupShape Then
        result = isShapeRangeFullTransparent(shape.shapes.All)
    ElseIf Globals.isShapePowerclip(shape) Then
        result = isShapeRangeFullTransparent(shape.powerClip.shapes.All)
    Else
        If isShapeHavingTransparency(shape) Then
            If shape.transparency.Type = cdrUniformTransparency Then
                result = shape.transparency.Uniform = 100
            End If
        End If
    End If
    
    isShapeFullTransparent = result

End Function


Public Function isShapeRangeFullTransparent(range As shapeRange) As Boolean
    
    For i = 1 To range.count
        If Not isShapeFullTransparent(range(i)) Then
            GoTo ReturnFalse
        End If
    Next i
    
ReturnTrue:
    isShapeRangeFullTransparent = True
    Exit Function
ReturnFalse:
    isShapeRangeFullTransparent = False
End Function


Public Function isShapeHavingTransparency(shape As shape) As Boolean
    isShapeHavingTransparency = Not shape.transparency.Type = cdrNoTransparency
End Function


Public Function isRedOrPinkShape(shape As shape) As Boolean
    
    'If Not currentShape.Type = cdrDropShadowGroupShape And Not currentShape.Type = cdrCustomEffectGroupShape Then
    
    If shape.CanHaveFill Then
        ' Füllung gefunden. Kann keine rote oder pinke Form sein
        If Not shape.fill.Type = cdrNoFill Then Exit Function
    End If
    
    ' Muss Outline supporten
    If Not shape.CanHaveOutline Then Exit Function
    
    ' Muss Outline haben
    If Not shape.outline.Type = cdrOutline Then Exit Function
    
    ' Muss rote oder pinke Outline haben
    If Not isColorRedOrPink(shape.outline.color) Then Exit Function
    
    ' Es kann auch Uploadbox-Zuschnitts Formen geben, die rot oder pink sind !
    If Globals.isShapeUploadBoxCutShapeForConfiImportShapeType(shape, , False) Then Exit Function
    
    isRedOrPinkShape = True
End Function



Public Function isRedShape(shape As shape) As Boolean
    If shape.CanHaveFill Then
        If Not shape.fill.Type = cdrNoFill Then
            ' Füllung gefunden
            Exit Function
        End If
    End If
    
    If Not shape.CanHaveOutline Then
        Exit Function
    End If
    
    If shape.outline.Type = cdrOutline Then
        isRedShape = isColorRed(shape.outline.color)
    End If
    
End Function



Public Function isPinkShape(shape As shape) As Boolean
    If shape.CanHaveFill Then
        If Not shape.fill.Type = cdrNoFill Then
            ' Füllung gefunden
            Exit Function
        End If
    End If
    
    If Not shape.CanHaveOutline Then
        Exit Function
    End If
    
    If shape.outline.Type = cdrOutline Then
        isPinkShape = isColorPink(shape.outline.color)
    End If
    
End Function




Public Function isForProductPicture(shape As shape, Optional recursive As Boolean = True) As Boolean
    If shape Is Nothing Then Exit Function ' False ' Aufgrund von Rekursion kann es sein, dass es kein Parent gibt
    isForProductPicture = InStr(Globals.getShapeNameLong(shape), Globals.getForProductPictureKeyWord)
    If recursive Then
        isForProductPicture = isForProductPicture Or isForProductPicture(Globals.getParentShapeOfShape(shape))  ' Rekursiv die Parents auch prüfen
    End If
End Function

Public Function isShapeForAmazonConfi(shape As shape, Optional recursive As Boolean = True) As Boolean
    If shape Is Nothing Then Exit Function ' False ' Aufgrund von Rekursion kann es sein, dass es kein Parent gibt
    isShapeForAmazonConfi = InStr(Globals.getShapeNameLong(shape), Globals.getForAmazonConfiKeyWord)
    If recursive Then
        isShapeForAmazonConfi = isShapeForAmazonConfi Or isShapeForAmazonConfi(Globals.getParentShapeOfShape(shape))  ' Rekursiv die Parents auch prüfen
    End If
End Function

Public Function isShapeForFancy(shape As shape, Optional recursive As Boolean = True) As Boolean
    If shape Is Nothing Then Exit Function ' False ' Aufgrund von Rekursion kann es sein, dass es kein Parent gibt
    isShapeForFancy = InStr(Globals.getShapeNameLong(shape), Globals.getForFancyKeyWord)
    If recursive Then
        isShapeForFancy = isShapeForFancy Or isShapeForFancy(Globals.getParentShapeOfShape(shape))  ' Rekursiv die Parents auch prüfen
    End If
End Function


Public Sub TestIsShapeValidForExportType()
    
    Globals.warnIfNoActiveShapeAndEnd
    
    MsgBox "Gültig für Amazon: " & isShapeValidForExportType(ActiveShape, AmazonExportType)
    MsgBox "Ungültig für Amazon: " & isShapeValidForExportType(ActiveShape, AmazonExportType, , True)
    
End Sub

' Beim 'invalidMode' sind
Public Function isShapeValidForExportType(shape As shape, exportType As globalExportType, Optional logger As logger, Optional invalidMode As Boolean = False)
    
    If Not logger Is Nothing Then
        logger.logINFO "[Globals.isShapeValidForExportType]"
        logger.addTab
    End If
    
    
    Dim validForProductImages As Boolean
    validForProductImages = Globals.isForProductPicture(shape)
    
    Dim validForAmazonConfi As Boolean
    validForAmazonConfi = Globals.isShapeForAmazonConfi(shape)
    
    Dim validForFancy As Boolean
    validForFancy = Globals.isShapeForFancy(shape)
    
    ' Wenn kein Marker vorhanden ist, dann ist die Form für alles gültig
    If Not validForProductImages And Not validForAmazonConfi And Not validForFancy Then
        isShapeValidForExportType = Not invalidMode
        GoTo ExitFunction
    End If
    
    ' Wenn es aber einen positiv Marker gibt, dann sind ist diese Form für nicht markierte Exporte ungültig
    ' Ist die Form z.B. nur markiert als "für-produktbilder", dann ist es nur gültig für Produkt Bilder nicht aber für den Amazon-Konfi oder den Fancy
    Select Case exportType
        Case ProductImageExportType
            isShapeValidForExportType = validForProductImages = Not invalidMode
            
        Case AmazonExportType
            isShapeValidForExportType = validForAmazonConfi = Not invalidMode
        
        Case FancyExportType
            isShapeValidForExportType = validForFancy = Not invalidMode
    End Select
    
ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
End Function



Public Sub TestIsShapeValidFor()
    
    Globals.warnIfNoActiveShapeAndEnd
    
    'MsgBox "forSplittingForAmazonKonfiImport: '" & ActiveShape.name & "': " & isShapeValidFor(ActiveShape, forSplittingForAmazonKonfiImport:=True)
    MsgBox "forProductPicture: '" & ActiveShape.name & "': " & isShapeValidFor(ActiveShape, forProductPicture:=True)
    
End Sub



' TODO vllt. aufteilen. Einmal für die Sichtbarkeit und einmal, ob es sichtbar ist. WHAT ?!?
' Entscheidet, ob ein Shape sichtbar ist/übernommen wird/gültig ist für einen bestimmten (Export) Zweck
Public Function isShapeValidFor(shape As shape, Optional forProductPicture As Boolean = False, Optional forFancyKonfi As Boolean = False, Optional forAmazonKonfi As Boolean = False, _
        Optional excludeInvisibleShapes As Boolean = False, Optional forSplittingForAmazonKonfiImport As Boolean = False, Optional layer As ProductDesignLayer, _
        Optional logger As logger) As Boolean
    
    isShapeValidFor = False
    
    If Not logger Is Nothing Then
        logger.logINFO "[Globals.isShapeValidFor] shape: '" & Globals.getShapeDisplayName(shape) & "'"
        logger.addTab
    End If
    
    
    ' Unsichtbare Formen
    If excludeInvisibleShapes And Not shape.visible Then
        GoTo ReturnFalse
    End If
    
    ' Fancy Hilfsformen (Bspw.: Hautform)
    If isShapeFancyHelperShape(shape) And forFancyKonfi Then GoTo ReturnTrue
    
    ' Rote / pinke Form
    If isRedOrPinkShape(shape) Then
        If Not logger Is Nothing Then logger.logINFO "Form ist rot oder pink"
        If forSplittingForAmazonKonfiImport Then
            GoTo ReturnTrue
        End If
        
        GoTo ReturnFalse ' False
    End If
    
    ' View-Shapes
    ' werden zu keinem oben genannten Zweck benötigt
    If isViewShape(shape) Then
        GoTo ReturnFalse
    End If
    
    ' Hilfslinienformen sind nur für Amazon-Import-Daten erlaubt (Für den Fancy werden diese seperat ohne diese Abfrage exportiert)
    If isShapeGuideLineShape(shape) Then
        If Not logger Is Nothing Then logger.logINFO "Form ist Hilflinie/Druckbereich"
        If forSplittingForAmazonKonfiImport Then
            GoTo ReturnTrue
        Else
            GoTo ReturnFalse
        End If
    End If
    
    
    
    ' Prüfen, ob es vom User für einen bestimmten Zweck markiert wurde.
    ' Z.B: Nur für Produktbilder
    ' ---------------------------
    Dim exportType As globalExportType
    exportType = NoExportType
    If forProductPicture Then
        exportType = ProductImageExportType
    ElseIf forFancyKonfi Then
        exportType = FancyExportType
    ElseIf forAmazonKonfi Then
        exportType = AmazonExportType
    End If
    
    If Not exportType = NoExportType Then
        ' InvalidMode ist an. Prüft also ob invalide nicht ob valide
        If isShapeValidForExportType(shape, exportType, , True) Then
            GoTo ReturnFalse
        End If
    End If
    ' ---------------------------
    
    ' "Dein Foto" von einer Uploadbox
    If forProductPicture Then
        If Globals.isShapeYourPhotoNote(shape) Then
            GoTo ReturnFalse
        End If
    End If
    
    
    ' Vordefinierte Konfi-Maske & Hintergrund
    If Globals.isShapeConfiMask(shape) Or Globals.isShapeConfiBackground(shape) Then
        ' Nur für Konfis erlauben
        If Not (forFancyKonfi Or forAmazonKonfi) Then
            GoTo ReturnFalse
        End If
    End If
    
    
    
    If shape.Type = cdrTextShape Then
        
        If Globals.isShapeFancyCustomizationID(shape) Then
            GoTo ReturnFalse
        End If
        
        If isTextLocked(shape) Then
            ' Zulassen
        ElseIf forSplittingForAmazonKonfiImport Then
            If shape.text.IsArtisticText Then
                ' Nur Textboxen erlauben
                GoTo ReturnFalse
            End If
        ElseIf forFancyKonfi Then
            ' True
        ElseIf forAmazonKonfi Then
            GoTo ReturnFalse
        End If
        
    Else
        
        If forSplittingForAmazonKonfiImport Then
            
            If isGroundplate(shape) Then
                Dim groundPlateSubJob As PlaceFileSubJob
                Set groundPlateSubJob = PlaceFile.findSubJob(shape, layer)
                
                If Not groundPlateSubJob Is Nothing Then
                    If Not logger Is Nothing Then logger.logINFO "Subjob für Grundplatte gefunden: '" & groundPlateSubJob.name & "'"
                    
                    If Not groundPlateSubJob.isForPrint Then
                        If Not logger Is Nothing Then logger.logINFO "Grundplatte ist nicht zum drucken. Return false"
                        GoTo ReturnFalse
                    End If
                Else
                    If Not logger Is Nothing Then logger.logINFO "Kein Subjob f?r die Grundplatte gefunden. Return false"
                    GoTo ReturnFalse
                End If
                
            ' Formen dessen Name mit ">" anf?ngt
            ElseIf Globals.isExportableShape(shape) Then
                GoTo ReturnFalse
            End If
            
        End If
        
        If forAmazonKonfi Then
            If isQRCode(shape) Then
                isShapeValidFor = allowQRCodes
                GoTo ReturnFalse
            End If
            
            If isShapeFillRGDWhite(shape) Then
                GoTo ReturnFalse
            End If
        
            If isUploadBox(shape) Then
                GoTo ReturnFalse
            End If
            
            If isLook(shape) Then
                GoTo ReturnFalse
            End If
            
            ' Zu kleine Kreuze verstecken
            If AmazonExport.isCross(shape) Then
                If AmazonExport.isCrossToSmal(shape, layer) Then
                    GoTo ReturnFalse
                End If
            End If
        End If
        
    End If
    
    ' Effekte sind eigenständige Formen. Sind also genau so eine Childform von einem Layer, wie bspw. der Text auf dem sie angewendet wurden.
    ' Im Objektemanager / Ebenenfenster werden Effekte aber als Childs von der Form dargestellt auf der sie angewendet sind.
    ' Wenn Die Form nun als "nur für Produktbilder" markiert ist, gilt das natürlich auch für seinen Schatten.
    ' Deshalb darf keine Effekt-Form selbst darüber entscheiden, ob es valide für einen bestimmten Zweck ist.
    ' Stattdessen gilt: Wenn die Textform valide ist, dann gilt es auch für seine Effekte. Die Effektformen (Schatten usw.) vom Text können mit der Funktion 'Globals.getEffectShapesOfShape' abgerufen werden
    If isShapeTypeEffect(shape.Type) And Not forSplittingForAmazonKonfiImport Then
        GoTo ReturnFalse
    End If
    
ReturnTrue:
    If Not logger Is Nothing Then logger.logINFO "Form ist valide"
    isShapeValidFor = True
    GoTo ExitFunction
    
ReturnFalse:
    If Not logger Is Nothing Then logger.logINFO "Form ist NICHT valide"
    isShapeValidFor = False
    
ExitFunction:
    If Not logger Is Nothing Then
        logger.logINFO "Returne " & isShapeValidFor
        logger.removeTab
    End If
End Function


Public Function getValidShapesFor(shape As shape, Optional forProductPicture As Boolean = False, Optional forFancyKonfi As Boolean = False, Optional forAmazonKonfi As Boolean = False, Optional excludeInvisibleShapes As Boolean = False, Optional excludeGivenShape As Boolean = False, Optional forSplittingForAmazonKonfiImport As Boolean = False, Optional allowQRCodes As Boolean = False) As shapeRange
    Set getValidShapesFor = New shapeRange
    
'    Let shapeName = shape.name
'
'
    If Not excludeGivenShape And isShapeValidFor(shape, forProductPicture, forFancyKonfi, forAmazonKonfi, excludeInvisibleShapes, forSplittingForAmazonKonfiImport) Then
'        MsgBox "Adding " & Shape.name
        getValidShapesFor.add shape
        ' Wenn diese Form valide ist, dann sind auch seine Effekte valide.
        ' Wenn diese Form z.B. ein Text ist und dieser Text ist valide, dann ist auch sein Schatteneffekt valide
        getValidShapesFor.AddRange Globals.getEffectsShapesOfShape(shape)
'    Else
'        Dim tempRange As New shapeRange
'        tempRange.add Shape
'        getValidShapesFor.RemoveRange tempRange
    End If

    If shape.Type = cdrGroupShape Then
        For i = 1 To shape.shapes.count
            getValidShapesFor.AddRange getValidShapesFor(shape.shapes(i), forProductPicture, forFancyKonfi, forAmazonKonfi, excludeInvisibleShapes, , forSplittingForAmazonKonfiImport)
        Next i
    End If

'    Dim range As New shapeRange
'    range.add Shape
'
'    Set getValidShapesFor = getValidShapesForShapeRange(range, range, forProductPicture, forFancyKonfi, forAmazonKonfi, excludeInvisibleShapes, excludeGivenShape, forSplittingForAmazonKonfiImport)
End Function



'Public Function getValidShapesForShapeRange(ByRef mainShapeRange As shapeRange, shapeRangeGroup As shapeRange, Optional forProductPicture As Boolean = False, Optional forFancyKonfi As Boolean = False, Optional forAmazonKonfi As Boolean = False, Optional excludeInvisibleShapes As Boolean = False, Optional excludeGivenShape As Boolean = False, Optional forSplittingForAmazonKonfiImport As Boolean = False, Optional allowQRCodes As Boolean = False) As shapeRange
'
'    For i = 1 To shapeRangeGroup.count
'        If excludeGivenShape Or Not isShapeValidFor(shapeRangeGroup(i), forProductPicture, forFancyKonfi, forAmazonKonfi, excludeInvisibleShapes, forSplittingForAmazonKonfiImport, allowQRCodes) Then
'            Dim tempRange As New shapeRange
'            tempRange.add shapeRangeGroup(i)
'            mainShapeRange.RemoveRange tempRange
'        Else ' Wenn nicht gelöscht...
'            ' ... und ein Gruppe
'            If shapeRangeGroup(i).Type = cdrGroupShape Then
'                getValidShapesForShapeRange mainShapeRange, shapeRangeGroup(i).shapes.All, forProductPicture, forFancyKonfi, forAmazonKonfi, excludeInvisibleShapes, False, forSplittingForAmazonKonfiImport, allowQRCodes
'            End If
'        End If
'
'
'    Next i
'
'    Set getValidShapesForShapeRange = mainShapeRange
'End Function


Public Sub TestFindGroundplate()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    Dim groundPlate As shape
    Set groundPlate = findGroundPlate(ActiveShape, False)
    
    MsgBox "groundPlate: " & Globals.getShapeDisplayName(groundPlate)
    
End Sub


Public Function findGroundPlate(designShape As shape, Optional mustBeVisible As Boolean = True, Optional logger As logger) As shape
    
    If Not logger Is Nothing Then logger.addTab , "[Globals.findGroundPlate]"
    
    For i = 1 To designShape.shapes.count
        If Not logger Is Nothing Then logger.logINFO "Checking Shape '" & Globals.getShapeDisplayName(designShape.shapes(i)) & "'"
        If (Not mustBeVisible Or designShape.shapes(i).visible) And isGroundplate(designShape.shapes(i)) Then
            Set findGroundPlate = designShape.shapes(i)
            Exit Function
        End If
    Next i
    
    If Not logger Is Nothing Then logger.removeTab
    
End Function


Public Function findProductIDShape(designShape As shape) As shape
    
    Dim foundShapes As shapeRange
    Set foundShapes = newCustomShapeTypeQuery(designShape, productID).search
    
    If foundShapes.count > 0 Then
        Set findProductIDShape = foundShapes.firstShape
    End If

End Function



Public Function findUploadBoxes(designShape As shape, Optional uploadBoxTypee As UploadBoxType = AnyUploadBoxType) As shapeRange
    
    Dim uploadBoxes As New shapeRange
    
    
    For i = 1 To designShape.shapes.count
        If isUploadBox(designShape.shapes(i), uploadBoxTypee) Then
            uploadBoxes.add designShape.shapes(i)
        End If
    Next i
    
    Set findUploadBoxes = uploadBoxes

End Function




Public Sub TestGetMainShapeOfSelectedDesign()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    Dim design As New productDesign
    design.newProductDesign ActiveShape
    
    MsgBox "getMainShape: " & Globals.getShapeDisplayName(design.getLayer(1, 1).getMainShape)
End Sub



Public Function getMainShapesOfProductDesignLayers(productDesignLayers As collection) As shapeRange

    Set getMainShapesOfProductDesignLayers = New shapeRange

    For i = 1 To productDesignLayers.count
        Dim currentLayer As ProductDesignLayer
        Set currentLayer = productDesignLayers(i)
        
        getMainShapesOfProductDesignLayers.add currentLayer.getMainShape
        
        Set currentLayer = Nothing
    Next i

End Function


Public Function fontExists(fontName As String) As Boolean ', bold As Boolean, italic As Boolean)
    
    For Each font In fontList
        If StrComp(font, fontName, vbTextCompare) = 0 Then
            'MsgBox "Found font " & font & ", for " & fontName
        End If
    Next font
    

End Function



Public Function checkIfLayersMainShapesAreClosed(mainShape As shape, smallerShapes As shapeRange, Optional ignoreText As Boolean = True, Optional warnAndEndIfNot As Boolean = True)
    ' Hauptform :::
    If Not mainShape.Type = cdrTextShape Or Not ignoreText Then
        If Not mainShape.DisplayCurve.Closed Then
            MsgBox "Die Hauptform ist nicht geschlossen!", vbCritical
            Globals.endMacro
        End If
        area = Globals.getAreaOfShape(mainShape)
    End If
    
    ' ! ! ! ! ! TODO kleinere Formen werden nicht geprüft
End Function


Public Sub TestGetAreaOfShape()
    
    ActiveDocument.unit = cdrMillimeter
    
    
    If Not ActiveShape Is Nothing Then
        MsgBox "Area: " & CStr(ActiveDocument.FromUnits(getAreaOfShape(ActiveShape), cdrMillimeter))
    Else
        MsgBox "Kein Form ausgewählt!"
    End If
    
End Sub


' Gibt den Flächeninhalt der Form wieder.
' Dabei wird zunächst die Fläche der Hauptform (der größten roten/pinken Form) genommen und alle anderen Flächen der kleineren Formen abgezogen.
Public Function getAreaOfMainShapeAndSmallerShapes(mainShape As shape, smallerShapes As shapeRange, Optional ignoreText As Boolean = True, Optional quietMode As Boolean = False, Optional logger As logger) As Double
    
    If mainShape Is Nothing Then
        Err.Raise vbObjectError + 513, , "[Globals.getAreaOfMainShapeAndSmallerShapes] Es wurde keine Hauptform erkannt "
    End If
    
    Dim area As Double
    
    ' Hauptform :::
    If Not mainShape.Type = cdrTextShape Or Not ignoreText Then
        If Not mainShape.DisplayCurve.Closed Then
            If quietMode Then
                If Not logger Is Nothing Then logger.logWARN "[Globals.getAreaOfMainShapeAndSmallerShapes] Hauptform nicht geschlossen! Dokument: '" & ActiveDocument.filePath & "'"
            Else
                Globals.setViewAreaToShape mainShape
                mainShape.CreateSelection
                MsgBox "Die Hauptform ist nicht geschlossen!", vbCritical
                Globals.endMacro
            End If
        End If
        area = Globals.getAreaOfShape(mainShape)
    End If
    
    
    ' Kleinere Formen :::
    If Not smallerShapes Is Nothing Then
        For i = 1 To smallerShapes.count
            Dim smallerShape As shape
            Set smallerShape = smallerShapes.item(i)
            
            If Not smallerShape.Type = cdrTextShape Then
                If Not smallerShape.DisplayCurve.Closed Then
                    MsgBox "Die Unterform #" & i & " ist nicht geschlossen!", vbCritical
                    Globals.endMacro
                End If
                
                ' Alle anderen kleineren Formen abziehen. (Globals.getAreaOfShape gibt immer nur positive Flächeninhalte zurück)
                area = area - (Globals.getAreaOfShape(smallerShape))
            End If
            
            Set smallerShape = Nothing
        Next i
    End If
    
    getAreaOfMainShapeAndSmallerShapes = area
End Function



Public Function isCurveHavingTooManyPointsForGettingArea(curve As curve)
    If curve.Nodes.count > 500 Then
        isCurveHavingTooManyPointsForGettingArea = True
    End If
End Function



Public Function getAreaOfShape(shape As shape) As Double
    
    ' RECHTECK ::::
    If shape.Type = cdrRectangleShape Then
        getAreaOfShape = shape.DisplayCurve.area

    ' KURVE ::::
    ElseIf shape.Type = cdrCurveShape Then
        getAreaOfShape = shape.curve.area
        
    ' ELLIPSE ::::
    ElseIf shape.Type = cdrEllipseShape Then
        getAreaOfShape = getPi * shape.ellipse.HRadius * shape.ellipse.VRadius
        
        
    ' TEXT :::::
    ElseIf shape.Type = cdrTextShape Then
        
        Dim curve As curve
        Set curve = getCurveFromShape(shape, True)
        
        If curve Is Nothing Then
            Err.Raise vbObjectError + 513, , "[Globals.getAreaOfShape] Die Kurve vom Text konnte nicht erstellt werden"
        End If
        
        getAreaOfShape = curve.area
        
    ' GRUPPE ::::
    ElseIf shape.Type = cdrGroupShape Then
        MsgBox "Gruppen haben keinen Flächeninhalt", vbCritical
        Globals.endMacro
    Else
        getAreaOfShape = shape.DisplayCurve.area
        'MsgBox "[Globals.getAreaOfShape] Form wird noch nicht unterstützt !"
    End If

End Function


Public Function getPi()
    If pi = 0 Then
        pi = 4 * Atn(1)
    End If
    
    getPi = pi
End Function



Public Sub TestGetShapesRealShapeType()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    MsgBox "Echter Formname: " & Globals.getShapeTypeName(getShapesRealShapeType(ActiveShape))
     
    
End Sub




' Wenn das Shape vorher eine Ellipse war aber zu einer Kurve umgewandelt wurde, dann erkennt das diese Funktion und returnt cdrEllipseShape
' Bei einem ehemaligen Viereck wird cdrRectangleShape returnt
Public Function getShapesRealShapeType(shape As shape, Optional logger As logger) As cdrShapeType
    
    If Not logger Is Nothing Then
        logger.logINFO "[Globals.getShapesRealShapeType] shape: '" & Globals.getShapeDisplayName(shape) & "'"
        logger.addTab
    End If
    
    If shape.Type = cdrCurveShape Then
        
        If shape.curve.subPaths.count = 1 Then
            
            Dim shapeWasVisible As Boolean
            shapeWasVisible = shape.visible
            shape.visible = True ' Form muss sichtbar sein. Sonst gibt es Probleme (von Corel) in der 'isSubPathEllipse'
            
            
            If Globals.isSubPathEllipse(shape.curve.subPaths.First) Then
                getShapesRealShapeType = cdrEllipseShape
            ElseIf Globals.isSubPathRectangle(shape.curve.subPaths.First) Then
                getShapesRealShapeType = cdrRectangleShape
            End If
            
            shape.visible = shapeWasVisible
        Else
            getShapesRealShapeType = cdrCurveShape
        End If
    Else
        getShapesRealShapeType = shape.Type
    End If
    
    If Not logger Is Nothing Then logger.removeTab
    
End Function


Public Function getSubPathType(subPath As subPath) As subPathType
    
    If isSubPathRectangle(subPath) Then
        getSubPathType = RectangleSubPath
    ElseIf isSubPathEllipse(subPath) Then
        getSubPathType = EllipseSubPath
    Else
        getSubPathType = FreeSubPath
    End If
    
End Function


Public Function isShapeCurveRectangle(shape As shape) As Boolean
    
    isShapeCurveRectangle = True
    
    If isVectorShape(shape) Then
        
        If shape.Type = cdrRectangleShape Then
            If shape.rectangle.CornerLowerLeft = 0 And shape.rectangle.EqualCorners Then
                Exit Function
            End If
            
        ElseIf shape.Type = cdrCurveShape Then
            If isCurveRectangle(shape.curve) Then
                Exit Function
            End If
        End If
        
    ElseIf shape.Type = cdrBitmapShape Then
        
        If isCurveRectangle(shape.bitmap.CropEnvelope) Then
            Exit Function
        End If
        
    End If
    
    isShapeCurveRectangle = False
    
End Function


Public Function isSubPathRectangle(subPath As subPath) As Boolean
    
    If subPath.Nodes.count = 4 Then
        For i = 1 To subPath.Nodes.count
        
            Dim currentNode As Node: Set currentNode = subPath.Nodes(i)
            Dim nextNode As Node
            
            If i > subPath.Nodes.count - 1 Then
                Set nextNode = subPath.Nodes.First
            Else
                Set nextNode = subPath.Nodes(i + 1)
            End If
            
            If Not ((currentNode.positionX = nextNode.positionX) Or (currentNode.positionY = nextNode.positionY)) Then
                Exit Function
            End If
            
        Next i
    Else
        Exit Function
    End If
    
    isSubPathRectangle = True
    
End Function


Public Function isCurveRectangle(curve As curve) As Boolean
    
    If curve.subPaths.count = 1 Then
        isCurveRectangle = isSubPathRectangle(curve.subPaths.First)
    End If
    
End Function



Public Sub TestCurveRectangle()
    
    If ActiveShape.Type = cdrRectangleShape Then
        MsgBox "Ein Rechteck"
    Else
        If isVectorShape(ActiveShape) And ActiveShape.Type = cdrCurveShape Then
            If isCurveRectangle(ActiveShape.curve) Then
                MsgBox "Ein Rechteck"
            Else
                MsgBox "Kein Rechteck "
            End If
        Else
            MsgBox "Kein Rechteck "
        End If
        
    End If
    
End Sub




Public Function isSubPathEllipse(subPath As subPath, Optional onlyFourPoints As Boolean = False) As Boolean
    
    If isSubPathHavingTooManyPointsForAreaCalculation(subPath) Then
        Exit Function
    End If
    
    If onlyFourPoints Then
        If subPath.Nodes.count = 4 Then
        
            For i = 1 To 2
    
                Dim currentNode As Node: Set currentNode = subPath.Nodes(i)
                Dim oppositeNode As Node
    
                If i = 1 Then
                    Set oppositeNode = subPath.Nodes(3)
                Else
                    Set oppositeNode = subPath.Nodes(4)
                End If
    
                If Not ((currentNode.positionX = oppositeNode.positionX) Or (currentNode.positionY = oppositeNode.positionY)) Then
                    Exit Function ' Return false
                End If
    
            Next i
        Else
            ' Es sind nur 4 Punkte erlaubt. Es wurden aber nicht 4 gefunden
            Exit Function ' Return false
        End If
    End If
    
    ' Formen, die nur 2 Punkte haben, haben eine Fläche von 0.
    ' Weiter unten im Code wird mit dieser Zahl dividiert, was zu einem "Division durch 0" Fehler führt
    ' Deshalb wird hier geprüft und ggf. abgebrochen
    If subPath.area = 0 Then
        Exit Function ' Return false
    End If
        
    Dim areaDifference As Double
    areaDifference = (getPi * subPath.boundingBox.width / 2 * subPath.boundingBox.height / 2) - subPath.area
    
'        MsgBox "areaDifference=" & areaDifference & " CorArea=" & curve.area & ", calcArea=" & (getPi * curve.boundingBox.width / 2 * curve.boundingBox.height / 2)
    
    If Abs(areaDifference) / subPath.area < 0.0005 Then
        isSubPathEllipse = True
    End If
    
    
End Function


Public Function isSubPathHavingTooManyPointsForAreaCalculation(subPath As subPath) As Boolean
    isSubPathHavingTooManyPointsForAreaCalculation = subPath.Nodes.count > 200
End Function



Public Function isCurveEllipse(curve As curve) As Boolean
    
    If curve.subPaths.count = 1 Then
        isCurveEllipse = isSubPathEllipse(curve.subPaths.First)
    End If
    
End Function


Public Sub TestCurveEllipse()
    
    If ActiveShape.Type = cdrEllipseShape Then
        MsgBox "Eine Ellipse"
'        MsgBox "Ellipsetyp=" & ActiveShape.ellipse.Type
    Else
        If isVectorShape(ActiveShape) And ActiveShape.Type = cdrCurveShape Then
            If isCurveEllipse(ActiveShape.curve) Then
                MsgBox "Eine Ellipse"
            Else
                MsgBox "Keine Ellipse "
            End If
        Else
            MsgBox "Keine Ellipse "
        End If
        
    End If
    
End Sub




Public Function weldShapeRange(shapeRange As shapeRange) As shape
    
    If shapeRange.count = 1 Then
        Set weldShapeRange = shapeRange.shapes(1)
    ElseIf shapeRange.count > 1 Then
        Dim finalShape As shape
        Set finalShape = shapeRange.shapes(1)
        shapeRange.Remove (1)
        
        For i = 1 To shapeRange.count
            Set finalShape = finalShape.Weld(shapeRange.shapes(i), False, False)
        Next i
        
        Set weldShapeRange = finalShape
    End If
    
    
End Function



Public Function offsetPath(shape As shape, ByVal bleedInMM As Double, Optional ByVal endCapType As cdrContourEndCapType = cdrContourSquareCap, _
        Optional ByVal cornerType As cdrContourCornerType = cdrContourCornerRound) As shape

    Dim negativeBleed As Boolean: negativeBleed = bleedInMM < 0
    
    If negativeBleed Then
        bleedInMM = -bleedInMM
    End If
    
    ' Leider ist die Funktion "ConvertUnits" nur bei 300 DPI zuverlässig
    Dim dpiBefore As Integer
    dpiBefore = ActiveDocument.resolutionX
    ActiveDocument.resolutionX = 300
    ActiveDocument.resolutionY = 300
    
    bleedInMM = ConvertUnits(bleedInMM, cdrMillimeter, ActiveDocument.unit)
    
    Dim effect As effect
    Set effect = shape.CreateContour(IIf(negativeBleed, cdrContourInside, cdrContourOutside), bleedInMM, , , , , , , , endCapType, cornerType)
    
    ActiveDocument.resolutionX = dpiBefore
    ActiveDocument.resolutionY = dpiBefore

    
    Dim range As shapeRange
    Set range = effect.Separate
    
    ' Wenn die Range nichts ist, dann war der Abstand nach innen zu groß, so dass keine Form erstellt werden konnte
    If range Is Nothing Then
        Exit Function
    Else
        range.RemoveRange Globals.shapeToShapeRange(shape)
        range.firstShape.name = "Contour"
        Set offsetPath = range.firstShape
    End If
End Function


Public Sub TestOffsetPath()
    
    If ActiveSelectionRange.count > 0 Then
        
        For i = 1 To ActiveSelectionRange.count
            offsetPath ActiveSelectionRange(i), Globals.getDefaultBleedSizeInMM
        Next i
    End If
    
End Sub


 
Public Function getShapeRangeCurveNodeCount(range As shapeRange, Optional recursive As Boolean = True) As Long
    Dim count As Long
    Dim i As Integer
    For i = 1 To range.count
        count = count + getShapeCurveNodeCount(range(i), recursive)
    Next i
    getShapeRangeCurveNodeCount = count
End Function



Public Function getShapeCurveNodeCount(shape As shape, Optional recursive As Boolean = True) As Long
    
    Dim count As Long
    
    If shape.Type = cdrGroupShape Then
        If recursive Then
            For i = 1 To shape.shapes.count
               count = count + getShapeCurveNodeCount(shape.shapes(i))
            Next i
        End If
    Else
        If shape.Type = cdrCurveShape Then
            count = count + shape.curve.Nodes.count
        ElseIf shape.Type = cdrRectangleShape Or shape.Type = cdrEllipseShape Then
            count = count + 4
        ElseIf shape.Type = cdrBitmapShape Then
            If shape.bitmap.Cropped Then
                count = count + shape.bitmap.CropEnvelope.Nodes.count
            End If
        End If
    End If
    
    getShapeCurveNodeCount = count
End Function





' Unproptortionale Skalierung
' -------------------------------------------------------

Public Function isShapeUnproportionalScaled(shape As shape, Optional ignoreTextBoxes As Boolean = True) As Boolean
    If ignoreTextBoxes And shape.Type = cdrTextShape Then
        If Not shape.text.IsArtisticText Then
            isShapeUnproportionalScaled = False
            Exit Function
        End If
    End If
    isShapeUnproportionalScaled = shape.TransformationMatrix.IsScaled
End Function

' Achtung. Dies sollte nicht bei Textboxen gemacht werden. Denn die können nie unproportional sein. Der Text passt sich immer proportional an den Rahmen an.
' Corel denkt aber, das Textboxen unproportional sein können! Diese Funktion würde Textboxen nur kleiner machen (Der Text bleibt gleich groß und wird dann umgebrochen)
Public Function removeUnproportionalScale(shape As shape)
    Dim rotationBefore As Double
    rotationBefore = shape.RotationAngle
    shape.ClearTransformations
    shape.rotate rotationBefore
End Function


Public Sub TestRemoveUnproportionalScale()
    If Not ActiveShape Is Nothing Then
        removeUnproportionalScale ActiveShape
    End If
End Sub

' -------------------------------------------------------



Public Function bakeTransformIntoShapeRangeCurve(range As shapeRange)
    Dim i As Integer
    For i = 1 To range.count
        bakeTransformIntoShapeCurve range(i)
    Next i
End Function


Public Sub TestBakeTransformIntoCurve()
    Globals.endIfNoActiveShape
    bakeTransformIntoShapeCurve ActiveShape
End Sub


' Setzt die Skalierung auf 100% zurück. Bzw. backt bspw. 75% skalierung, sodass wieder 100% angegeben werden,
' aber das Aussehen unverändert bleibt
' Achtung: Corel backt die Outline, wenn sie eine Haarlinie ist (und scaleWithShape an ist?? JA)
Public Function bakeTransformIntoShapeCurve(ByVal shp As shape)

    If Not Globals.isVectorShape(shp) Then Exit Function
    Globals.ensureShapeHasCurve shp

    Dim mat As TransformMatrix
    Set mat = shp.TransformationMatrix.GetCopy

    If Not mat.IsScaledOrSkewedOrRotated Then Exit Function

    Dim oldCenterX As Double
    Dim oldCenterY As Double

    oldCenterX = shp.centerX
    oldCenterY = shp.centerY

    ' Nur linearen Anteil backen
    mat.TranslationX = 0
    mat.TranslationY = 0

    shp.curve.ApplyTransformMatrix mat

    ' Transformation vollständig entfernen
    shp.SetMatrix 1, 0, 0, 1, 0, 0

    ' Anschließend wieder exakt an die alte Seitenposition setzen
    shp.Move _
        oldCenterX - shp.centerX, _
        oldCenterY - shp.centerY

End Function



Public Function TestIsShapeRangeVisibleProperlyRecursive()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    MsgBox "isShapeRangeVisibleProperlyRecursive: " & isShapeRangeVisibleProperlyRecursive(ActiveSelectionRange, True)
    
End Function


' Wenn 'allShapesMustBeProperlyVisible' wahr ist, wird bei der ersten nicht sichtbaren Form False returnt
' Wenn aber 'allShapesMustBeProperlyVisible' false ist, wird bei der ersten sichtbaren Form True returnt
Public Function isShapeRangeVisibleProperlyRecursive(shapeRange As shapeRange, Optional allowFullTransparent As Boolean = False, Optional allShapesMustBeProperlyVisible As Boolean = False, Optional logger As logger) As Boolean
    If Not logger Is Nothing Then logger.addTab , "[Globals.isShapeRangeVisibleProperlyRecursive]"
    
    For i = 1 To shapeRange.count
        If shapeRange(i).Type = cdrGroupShape Then
            If Not allShapesMustBeProperlyVisible = isShapeRangeVisibleProperlyRecursive(shapeRange(i).shapes.All, allowFullTransparent, allShapesMustBeProperlyVisible, logger) Then
                isShapeRangeVisibleProperlyRecursive = Not allShapesMustBeProperlyVisible
                GoTo ExitFunction
            End If
        Else
            If Not allShapesMustBeProperlyVisible = isShapeVisibleProperly(shapeRange(i), allowFullTransparent, logger) Then
                isShapeRangeVisibleProperlyRecursive = Not allShapesMustBeProperlyVisible
                GoTo ExitFunction
            End If
        End If
    Next i
    
    isShapeRangeVisibleProperlyRecursive = allShapesMustBeProperlyVisible
    
ExitFunction:
    If Not logger Is Nothing Then
        logger.logINFO "Returne '" & isShapeRangeVisibleProperlyRecursive & "'"
        logger.removeTab
    End If
End Function


Public Sub TestIsShapeVisibleProperlyRecursive()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    MsgBox "isShapeVisibleProperlyRecursive: " & isShapeVisibleProperlyRecursive(ActiveShape)
    
End Sub


Public Function isShapeVisibleProperlyRecursive(shape As shape, Optional allowFullTransparent As Boolean = True) As Boolean
    
    isShapeVisibleProperlyRecursive = isShapeRangeVisibleProperlyRecursive(Globals.shapeToShapeRange(shape), allowFullTransparent)
    
End Function



Public Sub TestIsShapeVisibleProperly()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    MsgBox "isShapeVisibleProperly: " & isShapeVisibleProperly(ActiveShape, False)
    
End Sub


' Prüft, ob eine Form sichtbar ist.
' Eine Form kann auf sichtbar gestellt sein, aber nicht gefüllt sein und deshalb trotzem unsichtbar wirken
' ACHTUNG: Sollte nicht direkt genutzt werden. Stattdessen "isShapeVisibleProperlyRecursive" nutzen
Public Function isShapeVisibleProperly(shape As shape, Optional allowFullTransparent As Boolean = True, Optional logger As logger) As Boolean
    If Not logger Is Nothing Then logger.addTab , "[Globals.isShapeVisibleProperly] shape: " & Globals.shapeToString(shape)
    
    If shape.Type = cdrGroupShape Then
        isShapeVisibleProperly = isShapeVisibleProperlyRecursive(shape, allowFullTransparent)
        GoTo ExitFunction
    End If

    If Not shape.visible Then
        If Not logger Is Nothing Then logger.logINFO "Form ist unsichtbar"
        GoTo ExitFunction
    End If

    
    If Not allowFullTransparent Then
        If isShapeFullTransparent(shape) Then
            If Not logger Is Nothing Then logger.logINFO "Form hat eine 100% Transparenz"
            GoTo ExitFunction
        End If
    End If
    
    If Not isShapeOpaque(shape, logger) Then
        If Not logger Is Nothing Then logger.logINFO "Form hat keine Füllung oder Umriss"
        ' Shape hat weder Füllung noch Umriss
        GoTo ExitFunction
    End If
    
    ' Zu Klein. Entweder durch Skalierung oder Zuschnitt
    If shape.SizeWidth = 0 Or shape.SizeHeight = 0 Then
        If Not logger Is Nothing Then logger.logINFO "Form hat die Größe 0"
        GoTo ExitFunction
    End If
    
    'Alle Abfragen bestanden
    isShapeVisibleProperly = True
ExitFunction:
    If Not logger Is Nothing Then
        logger.logINFO "Returne '" & isShapeVisibleProperly & "'"
        logger.removeTab
    End If
End Function


Public Sub TestIsShapeVisible()
    If Not ActiveDocument.ActiveShape Is Nothing Then
        MsgBox "isShapeVisibleProperly: " & isShapeVisibleProperlyRecursive(ActiveDocument.ActiveShape)
    End If
End Sub

Public Sub TestIsShapeOpaque()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    MsgBox "Shape ist deckend: " & isShapeOpaque(ActiveShape)
    
End Sub


' Wenn eine Form keinen Umriss, keine Füllung und keine Bitmap ist,
' dann ist die Form nicht deckend/opaque ist also nicht sichtbar
' HIWEIS: Unabhängig von Sichtbarkeit an/aus
Public Function isShapeOpaque(shape As shape, Optional logger As logger) As Boolean
    If Not logger Is Nothing Then logger.addTab , "[Globals.isShapeOpaque]"
    
    If shape.Type = cdrBitmapShape Or shape.Type = cdrContourGroupShape Then
        ' TODO prüfen, ob die Bitmap wirklich deckend ist und nicht einfach nur Transparente Pixel hat. "Globals.isBitmapHavingTransparentPixels" kann helfen
        If Not logger Is Nothing Then logger.logINFO "Form ist Bitmap oder ContourGroupShape, also deckend"
        isShapeOpaque = True
        GoTo ExitFunction
    End If
    
    
    If shape.CanHaveFill Then
        If Not shape.fill.Type = cdrNoFill Then
            If Not logger Is Nothing Then logger.logINFO "Füllung vorhanden. Form ist deckend"
            ' Füllung vorhanden. Ist also deckend
            isShapeOpaque = True
            GoTo ExitFunction
        End If
    End If
    
    If shape.CanHaveOutline Then
        If Not shape.outline.Type = cdrNoOutline Then
            If Not logger Is Nothing Then logger.logINFO "Umriss vorhanden. Form ist deckend"
            ' Umriss vorhanden. Ist also deckend
            isShapeOpaque = True
            GoTo ExitFunction
        End If
    End If
    
    If Not logger Is Nothing Then logger.logINFO "Shape hat weder Füllung noch Umriss"
    ' Shape hat weder Füllung noch Umriss
    
    
ExitFunction:
    If Not logger Is Nothing Then
        logger.logINFO "Returne: '" & isShapeOpaque & "'"
        logger.removeTab
    End If
End Function


Public Sub TestGetShapeTransparency()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    Dim transparency As Integer
    
    If ActiveShape.transparency.Type = cdrUniformTransparency Then
        transparency = ActiveShape.transparency.Uniform
    End If
    
    MsgBox "Transparency: " & transparency
    
    
End Sub



Public Sub TestApplyTransparency()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    Dim selection As shapeRange
    Set selection = ActiveSelectionRange
    Set selection = Globals.flattenShapeRange(selection)
    
    For i = 1 To selection.count
        selection(i).transparency.ApplyUniformTransparency IIf(i = 1, 0, 60)
    Next i
    
End Sub


' Eine Gruppe kann unsichtbar sein. Sie kann aber auch sichtbar sein obwohl alle Childs unsichtbar sind.
' Diese Funktion returnt True, wenn die Gruppe unsichtbar ist oder wenn alle Childs unsichtbar sind
'
' Siehe auch 'isShapeVisibleProperly'
Public Function isGroupShapeOrChildsInvisible(groupShape As shape) As Boolean
    
    If Not groupShape.Type = cdrGroupShape Then
        Err.Raise vbObjectError + 513, , "[Globals.isGroupShapeOrChildsInvisible] 'groupShape' ist keine Gruppe "
    End If
    
    If Not groupShape.visible Then
        isGroupShapeOrChildsInvisible = True
        Exit Function
    End If
    
    For i = 1 To groupShape.shapes.count
        If groupShape.shapes(i).visible Then
            Exit Function ' Return false
        End If
    Next i
    isGroupShapeOrChildsInvisible = True
    
End Function


Public Sub TestIfRectHasRoundCorners()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    If ActiveShape.Type = cdrRectangleShape Then
        
        If ActiveShape.rectangle.cornerType = cdrCornerTypeRound Then
            MsgBox "Rechteck hat abgerundete Ecken"
        Else
            MsgBox "Rechteck hat KEINE abgerundete Ecken"
        End If
        
    Else
        MsgBox "Form ist kein Rechteck"
    End If
    
End Sub


Public Sub TestIsShapeExportableAsJPEG()
    MsgBox "Form exportierbar als JPEG: " & isShapeExportableAsJPEG(ActiveShape)
End Sub


' Wenn eine Form rechteckig gefüllt ist, nicht gedreht ist und keine Transparenz hat,
' ist es auch nicht schlimm diese Form als JPEG abzuspeichern.
' Wenn die Form aber eine Transparenz hat oder z.B. abgerundete Ecken wird durch das JPEG Format ein weißer Hintergrund hinzugefügt
' Bei solchen Formen wird dann False returnt, damit diese als PNG gespeichert wird
Public Function isShapeExportableAsJPEG(shape As shape, Optional logger As logger) As Boolean
    
    If Not logger Is Nothing Then logger.addTab , "[Globals.isShapeExportableAsJPEG]"
    
    If Not shape.transparency.Type = cdrNoTransparency Then GoTo ExitFunction ' False
    If Not (shape.RotationAngle Mod 90 = 0) Then GoTo ExitFunction ' False. Exportierte Bilder können nicht gedreht sein, nur als PNG. Außer in 90 Grad Schritten. Denn da sind sie wieder Rechteckig
    
    
    If shape.Type = cdrRectangleShape Then
        If Not logger Is Nothing Then logger.logINFO "Form ist Rechteck"
        
        DoEvents
        ' ACHTUNG: Coreldraw lügt hier manchmal und behauptet, dass es keine abgerundeten Ecken gibt
        ' Darf keine abgerundeten Ecken haben
        If Not (shape.rectangle.RadiusLowerLeft = 0 And _
            shape.rectangle.RadiusLowerRight = 0 And _
            shape.rectangle.RadiusUpperLeft = 0 And _
            shape.rectangle.RadiusUpperRight = 0) Then
            If Not logger Is Nothing Then logger.logINFO "Rechteck hat abgerundete Ecken !"
            GoTo ExitFunction ' False
        End If
        
        ' Form muss gefüllt sein
        If Not shape.CanHaveFill Then GoTo ExitFunction ' False
        If shape.fill.Type = cdrNoFill Then GoTo ExitFunction ' False
        
    ElseIf shape.Type = cdrBitmapShape Then
        
        ' Bitmap hat Zuschnitt?
        If shape.bitmap.CropEnvelopeModified Then
            ' Bitmap Zuschnitt muss rechteckig sein
            If Not Globals.isCurveRectangle(shape.bitmap.CropEnvelope) Then GoTo ExitFunction ' False
        End If
        
        If shape.bitmap.transparent Then GoTo ExitFunction ' False
        
    ElseIf shape.Type = cdrCurveShape Then
        
        If Not Globals.isCurveRectangle(shape.curve) Then GoTo ExitFunction ' False
        
    ElseIf Globals.isQRCode(shape) Then
        ' OK
    Else
        ' Alle anderen Formen wie z.B: Kreise gehen nicht
        GoTo ExitFunction ' False
    End If
    
    
    isShapeExportableAsJPEG = True
ExitFunction:
    If Not logger Is Nothing Then
        logger.logINFO "Returne '" & isShapeExportableAsJPEG & "'"
        logger.removeTab
    End If
End Function


Public Sub TestIsShapeRangeExportableAsJPEG()
    MsgBox "Formen exportierbar als JPEG: " & isShapeRangeExportableAsJPEG(ActiveSelectionRange)
End Sub



' Benötigen die 'shapes' keine Transparenz und können als JPEG exportiert werden?
Public Function isShapeRangeExportableAsJPEG(ByVal shapes As shapeRange, Optional logger As logger) As Boolean
    
    If Not logger Is Nothing Then logger.addTab , "[Globals.isShapeRangeExportableAsJPEG]"
    
    Set shapes = Globals.flattenShapeRange(shapes)
    
    Dim doDebugPrint As Boolean
'    doDebugPrint = True
    
    Dim rectsCombined As rect
    
    ' Boolean Collection
    Dim shapeExportableAsJPEG As New collection
    
    
    Dim currentShape As shape
    For i = 1 To shapes.count
        Set currentShape = shapes(i)
        
        If Not logger Is Nothing Then logger.logINFO "Verarbeite Form #" & i & " '" & Globals.getShapeDisplayName(currentShape) & "'"
        
        If currentShape.visible Then
            If Globals.isShapeExportableAsJPEG(currentShape, logger) Then
                
                If Not logger Is Nothing Then logger.logINFO "- Shape ist exportiertbar als JPEG"
                
                ' Erste Form kann noch nicht verglichen werden
                If rectsCombined Is Nothing Then
                    Set rectsCombined = New rect
                    rectsCombined.CopyAssign currentShape.boundingBox
                    
    '                ActiveLayer.CreateRectangleRect rectsCombined
                    shapeExportableAsJPEG.add True
                    If Not logger Is Nothing Then logger.logINFO "- Shape ist die erste Form. Kann also noch nicht mit vorherigen verglichen werden (bzw. mit rectsCombined). Wird als 'exportiertbar als JPEG' gemerkt"
                Else
                
                    Dim boundingBox As rect
                    Set boundingBox = currentShape.boundingBox
                    
                    If doRectsOutlinesFormNewRect(rectsCombined, boundingBox) Then
                        Set rectsCombined = combineRects(rectsCombined, boundingBox)
                        shapeExportableAsJPEG.add True
                        If Not logger Is Nothing Then logger.logINFO "- Shape ragt NICHT mit der Boundingbox aus der von den vorherigen raus. Wird als 'exportiertbar als JPEG' gemerkt"
                    Else
                        shapeExportableAsJPEG.add False
                        If Not logger Is Nothing Then logger.logINFO "- Shape ragt mit der Boundingbox aus der von den vorherigen raus. Wird als NICHT 'exportiertbar als JPEG' gemerkt"
                    End If
                    
                End If
                
                ' Debug
'                ActiveLayer.CreateRectangleRect rectsCombined
                
                Set boundingBox = Nothing
            Else
                shapeExportableAsJPEG.add False
                If Not logger Is Nothing Then logger.logINFO "- Shape ist NICHT exportiertbar als JPEG und wird so vermerkt"
            End If
            
        Else
            If Not logger Is Nothing Then logger.logINFO "- Form nicht sichtbar. Ignorieren..."
        End If
        
        Set currentShape = Nothing
    Next i
    
    If rectsCombined Is Nothing Then
        ' "shapes" waren nur unsichtbare Formen
        GoTo ExitFunction
    End If
    
    If doDebugPrint Then Debug.Print "Phase 2"
    
    For i = 1 To shapes.count
        If Not shapeExportableAsJPEG(i) Then
            Set currentShape = shapes(i)
            
            ' Wenn nach dem erstellen des Rechteckes 'rectsCombined' (bestehend aus alle gültigen Formen die als JPEG exportiert werden können)
            ' üngültige Formen aus diesem Rechteck rausragen, dann muss false returnt werden
            If Not doRectsOutlinesFormNewRect(rectsCombined, currentShape.boundingBox) Then
                GoTo ExitFunction ' False
            End If
            
            Set currentShape = Nothing
        End If
    Next i
    
    
    
    isShapeRangeExportableAsJPEG = True
    If Not logger Is Nothing Then logger.logINFO "Returne '" & isShapeRangeExportableAsJPEG & "'"
ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function combineRects(rectA As rect, rectB As rect) As rect
    Dim result As New rect
    
    Dim x As Double
    x = min(rectA.left, rectB.left)
    Dim y As Double
    y = min(rectA.Bottom, rectB.Bottom)
    Dim w As Double
    w = max(rectA.Right, rectB.Right) - x
    Dim h As Double
    h = max(rectA.top, rectB.top) - y
    
    result.SetRect x, y, w, h
    
    Set combineRects = result
End Function


Public Function doRectsOutlinesFormNewRect(rectA As rect, rectB As rect) As Boolean
    
    Dim debugPrint As Boolean
    debugPrint = False
    
    Dim debugDraw As Boolean
    debugDraw = False
    
    If debugDraw Then
        ActiveLayer.CreateRectangleRect rectA
        ActiveShape.name = "RectA"
        ActiveLayer.CreateRectangleRect rectB
        ActiveShape.name = "RectB"
    End If
    
    Dim bottomLeft As New Vector
    bottomLeft.x = rectA.left - rectB.left
    bottomLeft.y = rectA.Bottom - rectB.Bottom
    
    Dim topRight As New Vector
    topRight.x = rectA.Right - rectB.Right
    topRight.y = rectA.top - rectB.top

    Dim distance As New Vector
    distance.x = bottomLeft.x - topRight.x
    distance.y = bottomLeft.y - topRight.y

    If debugPrint Then Debug.Print "bottomLeft.Angle: " & bottomLeft.angle & ", topRight.Angle: " & topRight.angle & " angle difference: " & bottomLeft.angle - topRight.angle & ", distance: (" & distance.x & ", " & distance.y & ")"
    
    If bottomLeft.Length = 0 Or topRight.Length = 0 Then
        If debugPrint Then Debug.Print "    Return True, weil einer der Winkel 0 ist"
        ' True
    ElseIf bottomLeft.angle = topRight.angle And _
        bottomLeft.angle Mod 90 = 0 Then
        
        If debugPrint Then Debug.Print "    Return True, weil die Winkel gleich und modulo 90° sind"
        ' True
    ElseIf (bottomLeft.angle > 0 And bottomLeft.angle < 90 And _
            topRight.angle > 180 And topRight.angle < 270) Then
    

        If debugPrint Then Debug.Print "    Return True, weil der Winkel links unten im Bereich von 0-90 und der Winkel rechts oben 180-270 ist. RectB ist in RectA"
        ' True
    ElseIf (topRight.angle > 0 And topRight.angle < 90 And _
            bottomLeft.angle > 180 And bottomLeft.angle < 270) Then
            
        If debugPrint Then Debug.Print "    Return True, weil der Winkel rechts oben im Bereich von 0-90 und der Winkel links unten 180-270 ist. RectA ist in RectB"
        ' True
    Else
        If debugPrint Then Debug.Print "    Return False"
        Exit Function ' False
    End If
    
    doRectsOutlinesFormNewRect = True
    
End Function


' Nichts auswählen
Public Sub removeSelection()
    ActiveSelectionRange.RemoveFromSelection
End Sub



' Es wird die 'range' anhand der Größe von 'rangeForScaling'(optional, ansonsten wird 'range' genommen) in das 'rect' platziert und skaliert (propotional)
Public Function fitShapeRangeOnRect(range As shapeRange, rect As rect, Optional rangeForScaling As shapeRange)
    If rangeForScaling Is Nothing Then
        Set rangeForScaling = range
    End If
    
    
    If rangeForScaling.SizeWidth = 0 Or rangeForScaling.SizeHeight = 0 Then
        MsgBox "Fehler! Es sind rote oder pinke Formen gruppiert. Bitte löse die Gruppe auf!", vbCritical
        Globals.endMacro
    End If
    
    
    Dim rangeForScalingAspectRatio As Double
    rangeForScalingAspectRatio = rangeForScaling.SizeWidth / rangeForScaling.SizeHeight
    
    Dim rectAspectRatio As Double
    rectAspectRatio = rect.width / rect.height
    
    ' TODO Round funktion durch was besseres ersetzen. Problem:
    ' This VBA function returns something commonly referred to as bankers rounding. So be careful before using this function. For more predictable results, use Worksheet Round functions in Excel VBA.
    ' Quelle: https://docs.microsoft.com/en-us/office/vba/language/reference/user-interface-help/round-function
    If rangeForScalingAspectRatio > rectAspectRatio Then
        range.setSize round(CDbl(rect.width) * (range.SizeWidth / rangeForScaling.SizeWidth), 0)
    Else
        range.setSize , round(CDbl(rect.height) * (range.SizeHeight / rangeForScaling.SizeHeight), 0) 'Division durch 0
    End If
    
    
    range.Move -rangeForScaling.centerX + rect.centerX, -rangeForScaling.centerY + rect.centerY
End Function



Public Function placeLookOnProductDesign(productDesign As productDesign, Optional errorWhenNothingPlaced As Boolean = False, Optional logger As logger = Nothing, _
        Optional preventDuplicateLooks As Boolean = True, Optional logPlaceFileFindSubJob As Boolean = False)
    
    For i = 1 To productDesign.getPartsCount
        For j = 1 To productDesign.getPart(i).count
            placeLookOnLayer productDesign.getPart(i).item(j), errorWhenNothingPlaced, logger, preventDuplicateLooks, logPlaceFileFindSubJob
        Next j
    Next i
    
End Function



Public Sub TestPlaceLookOnLayer()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    Dim design As New productDesign
    design.newProductDesign ActiveShape
    
    placeLookOnProductDesign design, , Globals.getLogger(True), , True
    
End Sub


Public Function placeLookOnLayer(layer As ProductDesignLayer, Optional errorWhenNothingPlaced As Boolean = False, Optional logger As logger = Nothing, _
        Optional preventDuplicateLooks As Boolean = True, Optional logPlaceFileFindSubJob As Boolean = False)
    
    If Not logger Is Nothing Then logger.addTab , "[Globals.placeLookOnLayer]"
    
    PlaceFile.initIfNeeded
     
    If layer.isEmptyVariant Then
        If Not logger Is Nothing Then logger.logINFO "Dies ist eine leere Variante. Look kann hier nicht platziert werden!"
       GoTo ExitFunction
    End If
     
    Dim subJobWhoPlacedGroundPlate As PlaceFileSubJob
    Set subJobWhoPlacedGroundPlate = PlaceFile.findSubJob(layer.getGroundPlate, layer, IIf(logPlaceFileFindSubJob, logger, Nothing), False, True, True, False)
     
    Dim lookJob As PlaceFileJob

    If Not subJobWhoPlacedGroundPlate Is Nothing Then
        Set lookJob = subJobWhoPlacedGroundPlate.parentJob.getLookJob
    End If
    
    If Not lookJob Is Nothing Then
        
        If preventDuplicateLooks Then
            Dim looks As collection
            Set looks = layer.getLookShapes
            
            For i = 1 To looks.count
                Dim subJobThatPlacedLook As PlaceFileSubJob
                Set subJobThatPlacedLook = PlaceFile.findSubJob(looks(i), layer)
                
                If Not subJobThatPlacedLook Is Nothing Then
                    If subJobThatPlacedLook.parentJob Is lookJob Then
                        If Not logger Is Nothing Then logger.logINFO "Look wurde schon platziert. Wurde übersprungen: '" & lookJob.name & "'"
                        GoTo ExitFunction
                    End If
                End If
                
                Set subJobThatPlacedLook = Nothing
            Next i
            
            Set looks = Nothing
        End If
        
        
        PlaceFile.setSelectedPlaceTypeJob lookJob
        
        If lookJob.groundPlateInvalidationNeededAfterPlacing Then
            layer.invalidateGroundPlate
            layer.invalidateVariantType GroundplateVariantType, logger
        End If
    Else
        If Not logger Is Nothing Then logger.logINFO "Kein Look-Job für die Grundplatte '" & layer.getGroundPlate.name & "' gefunden!"
        GoTo ExitFunction
    End If
    
    
    PlaceFile.startFunction Globals.shapeToShapeRange(layer.layerShape), Classfactory.newPlaceFileParameters.setQuiet.setErrorWhenNothingPlaced(errorWhenNothingPlaced)
    
    If Not logger Is Nothing Then logger.logINFO "'" & lookJob.name & "' platziert"
    
ExitFunction:
     ActiveDocument.unit = cdrPixel ' PlaceFile ändert eventuell die Einstellung
     If Not logger Is Nothing Then logger.removeTab
End Function


Public Sub TestConvertRDGWhiteToRGBWhite()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    convertRDGWhiteToRGBWhite Globals.shapeToShapeRange(ActiveShape), True
    
    
End Sub


' Returnt die Formen, welche Weiß gefärbt wurden
Public Function convertRDGWhiteToRGBWhite(range As shapeRange, Optional debugMsg As Boolean = False) As shapeRange
    
    Dim rdgWhiteShapes As shapeRange
    Set rdgWhiteShapes = newCustomShapeTypeQuery(range, RGD_WhiteShape).setContinueSearchInMatchedGroups(False).search
    
    For i = 1 To rdgWhiteShapes.count
        Dim shape As shape
        Set shape = rdgWhiteShapes(i)
        
        shape.fill.ApplyUniformFill CreateRGBColor(255, 255, 255)
        
        Set shape = Nothing
    Next i
    
    If debugMsg Then
        MsgBox rdgWhiteShapes.count & " umgefärbt.", vbInformation
    End If
    
    Set convertRDGWhiteToRGBWhite = rdgWhiteShapes
    
End Function



Public Function createEmptyShapeForEmptyExportWithCoordinates(xx As Integer, yy As Integer, width As Integer, height As Integer) As shape

    Dim emptyShapeRect As rect
    emptyShapeRect.SetRect xx, yy, width, height
    
    Dim emptyShape As shape
    Set emptyShape = Globals.createEmptyShapeForEmptyExport(emptyShapeRect)
    
    Set createEmptyShapeForEmptyExportWithCoordinates = emptyShape
    
End Function



Public Function createEmptyShapeForEmptyExportFromShapeRange(range As shapeRange) As shape

    Set createEmptyShapeForEmptyExportFromShapeRange = createEmptyShapeForEmptyExport(range.boundingBox)
    
End Function



Public Function createEmptyShapeForEmptyExport(emptyShapeRect As rect) As shape
    
    Dim emptyShape As shape
    Set emptyShape = Globals.createInvisibleRectForExport(emptyShapeRect)
    emptyShape.name = "Globals.createEmptyShapeForEmptyExport.emptyShape"
    Globals.makeShapeInvisibleForExport emptyShape
    
    Set createEmptyShapeForEmptyExport = emptyShape
    
End Function

Public Function createInvisibleRectForExportFromShape(shape As shape) As shape
    Set createInvisibleRectForExportFromShape = createInvisibleRectForExport(shape.boundingBox)
End Function

Public Function createInvisibleRectForExportFromShapeRange(shapes As shapeRange) As shape
    Set createInvisibleRectForExportFromShapeRange = createInvisibleRectForExport(shapes.boundingBox)
End Function


Public Function createInvisibleRectForExportByPositionAndSize(x As Double, y As Double, w As Double, h As Double) As shape
    Dim box As New rect
    box.SetRect x, y, w, h
    Set createInvisibleRectForExportByPositionAndSize = createInvisibleRectForExport(box)
End Function

' Erstellt ein unsichtbares Rechteck, welches aber exportiert werden kann. Denn nicht alle unsichtbaren Formen lassen sich exportieren
' Eine Form, die auf nicht sichtbar gestellt ist wird Corel niemals exportieren. Außer es werden noch andere sichtbare Formen mitexportiert. Dann wird die nicht sichtbare Form evtl. die Größe des Exports beeinflussen
Public Function createInvisibleRectForExport(box As rect) As shape
    Dim unvisibleShape As shape
    Set unvisibleShape = ActiveLayer.CreateRectangleRect(box)
    unvisibleShape.name = "Globals.createInvisibleRectForExport.unvisibleShape"
    unvisibleShape.outline.Type = cdrNoOutline
    unvisibleShape.fill.ApplyUniformFill CreateColor("#FFFFFF") ' Weiß
    makeShapeInvisibleForExport unvisibleShape
    
    Set createInvisibleRectForExport = unvisibleShape
End Function

' Macht eine Form so unsichtbar, dass sie trotzdem einzelnd exportiert werden kann
Public Function makeShapeInvisibleForExport(shape As shape)
    Globals.safeApplyUniformTransparencyToShape shape, 100 ' Über die Transparenz unsichtbar machen (Auf nicht sichtbar stellen (Auge) sorgt nämlich dafür, dass diese Form einzelnd nicht exportiert werden kann)
End Function



Public Sub TestIsShapeGrayScale()
    
    If ActiveSelectionRange.count = 1 Then
        MsgBox "Is shape grayscale? ignoreNoColor: " & isShapeGrayScale(ActiveSelectionRange.firstShape, False) & ", dontIgnoreNoColor: " & isShapeGrayScale(ActiveSelectionRange.firstShape, True)
    End If
    
End Sub



' Throws Exception
Public Function isShapeGrayScale(shape As shape, defaultValueForNoColorShapes As Boolean, Optional allowGravingColors As Boolean = False) As Boolean
    
    If shape.Type = cdrBitmapShape Then
        isShapeGrayScale = isBitmapGrayscale(shape.bitmap)
    ElseIf shape.Type = cdrGroupShape Then
        Err.Raise vbObjectError + 513, , "[Globals.isShapeGrayScale] Gruppen sind nicht zulässig "
    Else
        If shape.CanHaveFill Then
            If shape.fill.Type = cdrUniformFill Then
                isShapeGrayScale = isColorGrayScale(shape.fill.UniformColor, , allowGravingColors)
            ElseIf shape.fill.Type = cdrNoFill Then
                isShapeGrayScale = defaultValueForNoColorShapes
            Else
                Err.Raise vbObjectError + 513, , "[Globals.isShapeGrayScale] Füllungstyp nicht unterstützt"
            End If
        End If
        
        If shape.CanHaveOutline Then
            If shape.outline.Type = cdrOutline Then
                isShapeGrayScale = isShapeGrayScale And isColorGrayScale(shape.outline.color, , allowGravingColors)
            ElseIf shape.outline.Type = cdrNoOutline Then
                isShapeGrayScale = defaultValueForNoColorShapes
            Else
                Err.Raise vbObjectError + 513, , "[Globals.isShapeGrayScale] Outlinetyp nicht unterstützt"
            End If
        End If
    End If
    
End Function


Public Function isColorGrayScale(ByVal color As color, Optional tolerance As Integer = 8, Optional allowGravingColors As Boolean = False) As Boolean
    Set color = color.GetCopy
    
    If allowGravingColors Then
        If isColorGravingColor(color) Then
            isColorGrayScale = True
            Exit Function
        End If
    End If
    
    color.ConvertToHSB
    
    isColorGrayScale = color.HSBSaturation < tolerance
End Function


Public Function isBitmapGrayscale(bitmap As bitmap) As Boolean
    If bitmap.image.Type = cdrGrayscaleImage Or cdrBlackAndWhiteImage Then
        isBitmapGrayscale = True
        Exit Function
    End If
    
    
    Dim sampleColors As collection
    Set sampleColors = Globals.getImageSamples(bitmap.image, 100)
    
    For i = 1 To sampleColors.count
        
        If Not isColorGrayScale(sampleColors(i)) Then
            Exit Function
        End If
    Next i
    
    isBitmapGrayscale = True
End Function


Public Sub TestIsBitmapGrayscale()
    If Not ActiveShape Is Nothing Then
        If ActiveShape.Type = cdrBitmapShape Then
            MsgBox "Grau=" & isBitmapGrayscale(ActiveShape.bitmap)
        End If
    End If
End Sub




Public Sub TestIsBitmapHavingTransparentPixels()
    If Not ActiveShape Is Nothing Then
        If ActiveShape.Type = cdrBitmapShape Then
            
            Dim shape As shape
            Set shape = ActiveShape
            
            MsgBox "isBitmaphavingTransparentPixels: " & isBitmapHavingTransparentPixels(shape.bitmap)
            
        End If
    End If
End Sub



' Die Funktion 'shape.bitmap.Transparent' gibt immer True zurück, wenn eine Bitmap eine importierte PNG ist
' Diese PNG kann aber vollflächig sein. Hat also eig. null Transparenz
Public Function isBitmapHavingTransparentPixels(bitmap As bitmap) As Boolean
    
    If bitmap.imageAlpha Is Nothing Then
        Exit Function ' Return False
    End If
    
    Dim imageAlpha As image
    Set imageAlpha = bitmap.imageAlpha.GetCopy
    
    ' Wieviele pixelproben sollen aus der Bitmap entnommen werden
    Dim samples As Long
    samples = 100
    
    Dim imageAlphaSamples As collection
    Set imageAlphaSamples = Globals.getImageSamples(imageAlpha, samples)
    
    For i = 1 To samples
    
        Dim saturation As Long
        Dim color As color
        Set color = imageAlphaSamples(i)
        
        If Not color.IsWhite Then
            isBitmapHavingTransparentPixels = True
            Exit Function
        End If
        
        Set color = Nothing
    Next i
    
    
    Set imageAlpha = Nothing
End Function



Public Function getImageSamples(image As image, ByVal totalSamples As Integer, Optional logger As logger, Optional debugDrawSamplesOnOwnImage As Boolean = False) As collection
    
    If Not logger Is Nothing Then logger.addTab , "[Globals.getImageSamples]"
    
    Dim result As New collection
    
    Dim sampleRoot As Integer
    sampleRoot = Int(Sqr(totalSamples))
    sampleRoot = max(sampleRoot, 1) ' Mindestens ein Sample nehmen
    
    Dim pixelCount As Long
    pixelCount = image.width * image.height
    
    ' Nicht mehr Pixelproben nehmen als Pixel vorhanden sind (sonst würde ein Pixel 2 mal getestet werden)
    If totalSamples > pixelCount Then
        totalSamples = pixelCount
    End If
    
    If debugDrawSamplesOnOwnImage Then Set image = image.GetCopy
    
    For x = 1 To sampleRoot
        For y = 1 To sampleRoot
            
            Dim xOnImage As Integer
            xOnImage = (x Mod sampleRoot) * (image.width / sampleRoot)
            
            Dim yOnImage As Integer
            yOnImage = (y Mod sampleRoot) * (image.height / sampleRoot)
            
            Dim sampleColor As color
            Set sampleColor = image.Pixel(xOnImage, yOnImage)
            
            ' Farbe aus dem Bild kopieren. Verhindert, dass die Farbe durch 'debugDrawSamplesOnOwnImage' übermalt wird
            ' Außderdem kann die Farbe dann auch zuverlässiger durch andere Funktionen verwendet werden, da es eine Kopie ist und nicht auf das Bild referenziert
            ' Probleme gab es nämlich bei Globals.isBitmapGrayscale wo die Farbe dann ebenfalls kopiert werden sollte. Corel stürz dabei ab. Außer man kopiert die Farbe hier schon
            Set sampleColor = sampleColor.GetCopy
            
            If debugDrawSamplesOnOwnImage Then
                image.FillArea xOnImage, yOnImage, 1, 1, Globals.getPinkColor
            End If
            
            If Not logger Is Nothing Then logger.logINFO "sampleColor.HexValue: '" & sampleColor.HexValue & "', x: '" & x & "', y:'" & y & "', xOnImage: '" & xOnImage & "', yOnImage: '" & yOnImage & "'"
            
            result.add sampleColor
            
            Set sampleColor = Nothing
        Next y
    Next x
    
    If debugDrawSamplesOnOwnImage Then
        ActiveLayer.CreateBitmap2(0, 0, 10, 10, image).name = "Globals.getImageSamples.debugDrawSamplesOnOwnImage"
    End If
    
    Set getImageSamples = result
    If Not logger Is Nothing Then logger.removeTab
End Function



Public Sub TestGetPixelPositionInDocument()
    
    Dim shape As shape
    Set shape = getActiveShape
    
    
    Dim result As collection
    Set result = getPixelPositionInDocument(86, 62, shape)
    
    Dim rectExtends As Double
    rectExtends = 1
    
    Dim rect As New rect
    rect.SetRect result(1) - rectExtends, result(2) - rectExtends, rectExtends * 2, rectExtends * 2
    ActiveLayer.CreateRectangleRect rect
'    ActiveLayer.CreateEllipse result(1) - rectExtends, result(2) + rectExtends, result(1) + rectExtends, result(2) + rectExtends
    
End Sub



Public Function getPixelPositionInDocument(pixelX As Integer, pixelY As Integer, shape As shape) As collection
    
    Dim positonn As New collection
    
    positonn.add shape.positionX  ' X
    positonn.add shape.positionY  ' Y
    
'    shape.GetMatrix
    
    
    Set getPixelPositionInDocument = positonn
End Function


Public Function getUnitNameOfActiveDoc() As String
    getUnitNameOfActiveDoc = getUnitName(ActiveDocument.unit)
End Function


Public Function getUnitName(unit As cdrUnit) As String
    
    Select Case unit
        Case cdrTenthMicron
            getUnitName = "Tenth Micron"
        Case cdrInch
            getUnitName = "Inch"
        Case cdrFoot
            getUnitName = "Foot"
        Case cdrMillimeter
            getUnitName = "Millimeter"
        Case cdrCentimeter
            getUnitName = "Centimeter"
        Case cdrPixel
            getUnitName = "Pixel"
        Case cdrMile
            getUnitName = "Mile"
        Case cdrMeter
            getUnitName = "Meter"
        Case cdrKilometer
            getUnitName = "Kilometer"
        Case cdrDidots
            getUnitName = "Didots"
        Case cdrAgate
            getUnitName = "Agate"
        Case cdrYard
            getUnitName = "Yard"
        Case cdrPica
            getUnitName = "Pica"
        Case cdrCicero
            getUnitName = "Cicero"
        Case cdrPoint
            getUnitName = "Point"
        Case cdrUnitQ
            getUnitName = "UnitQ"
        Case cdrUnitH
            getUnitName = "UnitH"
        Case Else
            getUnitName = "Unbekannt Nr.: " & unit
    End Select

End Function




Public Sub TestGetShapeTypeName()
    
    If Not ActiveShape Is Nothing Then
        
        MsgBox "Shape Typ: " & getShapeTypeNameByShape(ActiveShape)
    
    Else
        MsgBox "Keine Form ausgewählt"
    End If
    
    
End Sub


Public Function getShapeTypeNameByShape(shape As shape) As String
    getShapeTypeNameByShape = getShapeTypeName(shape.Type)
End Function



Public Function getShapeTypeName(typee As cdrShapeType) As String
        
    Dim shapeTypeName As String
    Select Case typee
        Case cdrNoShape ' 0
            shapeTypeName = "Keine Form"
            
        Case cdrRectangleShape ' 1
            shapeTypeName = "Rechteck"
            
        Case cdrEllipseShape ' 2
            shapeTypeName = "Ellipse"
            
        Case cdrCurveShape ' 3
            shapeTypeName = "Kurve"
            
        Case cdrPolygonShape ' 4
            shapeTypeName = "Polygon"
            
        Case cdrBitmapShape ' 5
            shapeTypeName = "Bitmap"
            
        Case cdrTextShape ' 6
            shapeTypeName = "Text"
            
        Case cdrGroupShape ' 7
            shapeTypeName = "Gruppe"
            
        Case cdrSelectionShape ' 8
            shapeTypeName = "Auswahl"
            
        Case cdrGuidelineShape ' 9
            shapeTypeName = "Richtlinie"
            
        Case cdrBlendGroupShape ' 10
            shapeTypeName = "BlendGroup"
        
        Case cdrExtrudeGroupShape ' 11
            shapeTypeName = "ExtrudeGroup"
        
        Case cdrOLEObjectShape ' 12
            shapeTypeName = "OLEObject"
            
        Case cdrContourGroupShape ' 13
            shapeTypeName = "ContourGroup"
            
        Case cdrLinearDimensionShape ' 14
            shapeTypeName = "LinearDimension"
            
        Case cdrBevelGroupShape ' 15
            shapeTypeName = "BevelGroup"
        
        Case cdrDropShadowGroupShape ' 16
            shapeTypeName = "Hinterlegter Schatten"
        
        Case cdr3DObjectShape ' 17
            shapeTypeName = "3DObject"
        
        Case cdrArtisticMediaGroupShape ' 18
            shapeTypeName = "ArtisticMediaGroup"
        
        Case cdrConnectorShape ' 19
            shapeTypeName = "Connector"
            
        Case cdrMeshFillShape ' 20
            shapeTypeName = "MeshFill"
            
        Case cdrCustomShape ' 21
            shapeTypeName = "Custom"
            
        Case cdrCustomEffectGroupShape ' 22
            shapeTypeName = "CustomEffectGroup"
            
        Case cdrSymbolShape ' 23
            shapeTypeName = "Symbol"
        
        Case cdrHTMLFormObjectShape ' 24
            shapeTypeName = "HTMLFormObject"
            
        Case cdrHTMLActiveObjectShape ' 25
            shapeTypeName = "HTMLActiveObject"
        
        Case cdrPerfectShape ' 26
            shapeTypeName = "Perfect"
        
        Case cdrEPSShape ' 27
            shapeTypeName = "EPS"
        
        Case Else
            Err.Raise vbObjectError + 513, , "[Globals.getShapeTypeName] Form noch nicht festgelegt!"
        
    End Select
    
    getShapeTypeName = shapeTypeName
    
End Function


Public Function isShapeTypeEffect(shapeType As cdrShapeType) As Boolean
    
    Select Case shapeType
        ' TODO unvollständig
        Case cdrExtrudeGroupShape, cdrContourGroupShape, cdrBevelGroupShape, cdrDropShadowGroupShape, cdrCustomEffectGroupShape
            isShapeTypeEffect = True
    End Select
    
End Function


Public Function getEffectTypeName(fx As cdrEffectType) As String
    
    Dim effectTypeName As String
    
    Select Case fx
        Case cdrBlend ' 0
            effectTypeName = "Überblendung"
            
        Case cdrExtrude ' 1
            effectTypeName = "Extrusionsgruppe"
        
        Case cdrEnvelope ' 2
            effectTypeName = "Hülle"
        
        Case cdrTextOnPath ' 3
            effectTypeName = "Text mit Pfad"
        
        Case cdrControlPath ' 4
            effectTypeName = "?"
        
        Case cdrDropShadow ' 5
            effectTypeName = "Hinterlegter Schatten"
        
        Case cdrContour ' 6
            effectTypeName = "Kontur"
            
        Case cdrDistortion ' 7
            effectTypeName = "Verzerrung"
        
        Case cdrPerspective ' 8
            effectTypeName = "Perspektive"
        
        Case cdrLens  ' 9
            effectTypeName = "Linse"
        
    End Select
    
    
    getEffectTypeName = effectTypeName
End Function



Public Function getNodeTypeName(nodeType As cdrNodeType) As String
    
    Dim result As String
    
    Select Case nodeType
        Case cdrCuspNode
            result = "cdrCuspNode"
        Case cdrMixedNodes
            result = "cdrMixedNodes"
        Case cdrSmoothNode
            result = "cdrSmoothNode"
        Case cdrSymmetricalNode
            result = "cdrSymmetricalNode"
    End Select
    
    getNodeTypeName = result
End Function







' F I L E S  A N D  F O L D E R S
'
'///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


' Fragt den User, ob er die Skripticons installieren will
Public Function askScriptIconsUpdateInstallation() As Boolean
    Dim result As VbMsgBoxResult
    result = MsgBox("Möchtest du die Skriptsymbole wirklich updaten?" & vbNewLine & "Das kann einige Minuten dauern. Außerdem werden alle Andockfenster geschlossen und nur die Standartpaletten angezeigt", vbYesNo Or vbQuestion, "Wirklich updaten?")
    
    If result = vbYes Then
        Globals.UpdateGravuruIcons
        askScriptIconsUpdateInstallation = True
    End If
End Function



Public Function scriptIconsOutdatedWarning()
    
    MsgBox "Dieser Skriptbutton ist nicht mehr aktuell. Die Skriptbuttons benötigen ein Update.", vbInformation
    
    Globals.askScriptIconsUpdateInstallation
    
End Function

' Startet ein Programm mit optionalen Start-Argumenten
Public Function runExecute(path As String, Optional arguments As String, Optional focusType = vbNormalFocus)
    
    Dim command As String
    
    If arguments = "" Then
        command = path
    Else
        command = """" & path & """ """ & arguments & """"
    End If
    
    shell command, focusType
    
End Function


Public Function getDesktopPath() As String
    getDesktopPath = addBackslash(Environ("UserProfile")) & "Desktop\"
End Function

Public Function getTempFolder() As String
    getTempFolder = addBackslash(Environ("Temp"))
End Function

Public Function getTempUnzipFolder() As String
    getTempUnzipFolder = Globals.getTempFolder & "CorelDraw Script Unzip\"
End Function

Public Function getTempExcelTwoStepSaveFolder(Optional create As Boolean) As String
    getTempExcelTwoStepSaveFolder = Globals.getTempFolder & "CorelDraw Excel Two Step Save\"
    If create Then Globals.createFolder getTempExcelTwoStepSaveFolder
End Function

Public Function getFilterAsString(filter As cdrFilter) As String
    
    Select Case filter
        Case cdrPNG
            getFilterAsString = "png"
            
        Case cdrJPEG
            getFilterAsString = "jpg"
            
        Case cdrSVG
            getFilterAsString = "svg"
            
        Case cdrCDR ' 1795
            getFilterAsString = "cdr"
            
        Case Else
            MsgBox "[Globals.getFilterAsString] Dateityp noch nicht implementiert", vbCritical
            Globals.endMacro
    End Select
    
End Function


Function getLinkPath(ByVal linkFilePath As String) As String
    On Error Resume Next
    With CreateObject("Wscript.Shell").CreateShortcut(linkFilePath)
        getLinkPath = .targetPath
        .Close
    End With
End Function


Public Sub TestGetLinkPath()
    MsgBox "Link: " & getLinkPath(getDesktopPath & "\Produkte.lnk")
End Sub


Public Function listFoldersInFolder(ByVal folderPath As String) As collection
    Set listFoldersInFolder = getFoldersInFolder(folderPath)
End Function



' Gibt die Ordnerpfade der Ordner im angegebenen Ordner zurück
' flatOrHierachial beschreibt, ob die zurückgegebene Collection wenn recursive true ist, alle Ordner in einer Collection haben soll, oder auch in UnterCollections (Ordner in Ordner)
' Wenn 'pathsOrFolderObjects' True ist, werden nur Pfade der Unterorner in form von Strings zurückgeliefert.
' Wenn 'pathsOrFolderObjects' False ist, werden die Unterordner in form von 'Scripting.folder' Objekten zurückgegeben
Public Function getFoldersInFolder(ByVal folderPath As String, Optional recursive As Boolean = False, Optional flatOrHierachial As Boolean, Optional pathsOrFolderObjects As Boolean = False) As collection ', Optional onlyFolderName As Boolean = True) As collection
    
    Set getFoldersInFolder = New collection
    
    If Not Globals.folderExists(folderPath) Then
        Err.Raise vbObjectError + 513, , "[Globals.getFoldersInFolder] Folgender Ordner exestiert nicht:" & vbNewLine & "'" & folderPath & "'"
    End If
    
    Dim folder As Scripting.folder
    Set folder = fileSystemObject.GetFolder(folderPath)
    
    Set subFolders = folder.subFolders

    Dim subFolder As Scripting.folder
    For Each subFolder In subFolders
        getFoldersInFolder.add IIf(pathsOrFolderObjects, subFolder.path, subFolder)
        
        If recursive Then
            Dim subSubFolders As collection
            Set subSubFolders = getFoldersInFolder(subFolder.path, True)
            
            ' Keine UnterCollections erlauben. Sondern diese auflößen
            If flatOrHierachial Then
                For i = 1 To subSubFolders.count
                    getFoldersInFolder.add subSubFolders(i)
                Next i
            Else
                getFoldersInFolder.add subSubFolders
            End If
            
            Set subSubFolders = Nothing
        End If
    Next
    
End Function



Public Sub TestGetFilesPathWithExtensionInFolder()
    MsgBox "getFilesPathWithExtensionInFolder: " & getFilesPathWithExtensionInFolder("C:\Users\GRAVURU 2\Desktop\Neuer Ordner\30x20\GT-A-30x20\Produktbilder\JPG\Weiss", "jpg").count
End Sub


Public Function getFilesPathWithExtensionInFolder(folderPath As String, extension As String, Optional limit As Integer = -1) As collection
    Set getFilesPathWithExtensionInFolder = findFilesPathWithExtensionInFolder(folderPath, extension, limit)
End Function


Public Function findFilesPathWithExtensionInFolder(folderPath As String, extension As String, Optional limit As Integer = -1) As collection
    
    Dim col As New collection
    col.add extension
    
    Set findFilesPathWithExtensionInFolder = findFilesPathWithExtensionsInFolder(folderPath, col, limit)
    
End Function

' Findet Dateien im Ordner mit 'folderPath' die die Dateiendung 'extensions' hat
' "extension" muss nicht unbedingt mit einem Punkt starten
' Wenn "limit" kleiner als 0 ist, dann ist er deaktivivert
Public Function findFilesPathWithExtensionsInFolder(folderPath As String, extensions As collection, Optional limit As Integer = -1) As collection
    
    If Not Globals.folderExists(folderPath) Then
        Err.Raise vbObjectError + 513, , "[Globals.findFilesPathWithExtensionsInFolder]" & vbNewLine & _
        "Folgender Pfad exestiert nicht '" & folderPath
    End If
    
    Set findFilesPathWithExtensionsInFolder = New collection
    
    Dim folder As Scripting.folder
    Set folder = fileSystemObject.GetFolder(folderPath)
    
    Dim files As Scripting.files
    Set files = folder.files
    
    
    For Each currentFile In files
        
        For i = 1 To extensions.count
            If endsWith(currentFile.name, extensions(i)) Then
                findFilesPathWithExtensionsInFolder.add currentFile.path
            
                If (Not limit = -1) And findFilesPathWithExtensionsInFolder.count >= limit Then Exit Function
            End If
        Next i
        
    Next currentFile
    

End Function


Public Function findFoldersWithString(parentFolderPath As String, findString As String, searchType As stringSearchType, Optional pathsOrFolderObjects As Boolean = False, Optional ignoreCase As Boolean) As collection
    
    Dim foundFolders As New collection
    
    Dim folders As collection
    Set folders = Globals.getFoldersInFolder(parentFolderPath, , , pathsOrFolderObjects)
    
    For i = 1 To folders.count
        Dim folderName As String
        folderName = Globals.getFolderName(folders(i))
        
        If stringCompare(folderName, findString, searchType, ignoreCase) Then
            foundFolders.add folders(i)
        End If
    Next i
    
    Set findFoldersWithString = foundFolders
    
End Function


Public Sub TestGetFilesInFolder()
    
    MsgBox "getFilesInFolder: " & getFilesInFolder("V:\Produkte\Blumenstecker\Herz\BST-V2A-16x38-D3\Produktbilder").count
    
End Sub


Function getFilesInFolder(ByVal path As String, Optional onlyFileNames As Boolean = True, Optional recursive As Boolean) As collection
    Set getFilesInFolder = listfiles(path, onlyFileNames, recursive:=recursive)
End Function


' Returnt eine Collection mit den Dateinamen, die in dem Ordner sind
' Throws Exception
' 'ignoreDSStoreFiles' beschreibt, ob Metadaten für Ordner, die Mac-Systeme anlegen ignoriert werden sollen. Diese Daten sind unnötig und können eigentlich immer ignoriert werden
Function listfiles(ByVal path As String, Optional onlyFileNames As Boolean = True, Optional getTargetFileOfLinkFiles As Boolean = False, Optional warnOnBrokenLinkPaths As Boolean = True, _
    Optional ignoreDSStoreFiles As Boolean = True, Optional logger As logger, Optional ignoreIfFoldersDoesNotExist As Boolean, Optional recursive As Boolean) As collection
    
    If Not logger Is Nothing Then logger.addTab , "[Globals.listfiles] path: '" & path & "'"
    
    Set listfiles = New collection
    
    If Not Globals.folderExists(path) Then
        If ignoreIfFoldersDoesNotExist Then
            GoTo ExitFunction
        End If
    End If
    
    ' DEBUG
'    Dim folderValid As Boolean
'    folderValid = folderExists(path)
    
'    If Not folderValid Then
'        MsgBox "[Globals.listfiles] Der Ordner '" & path & "' exestiert nicht!"
'    End If

    
    Dim folder As Scripting.folder
    Set folder = fileSystemObject.GetFolder(path)
    
    
    Dim files As Scripting.files
    Set files = folder.files
    
    
    On Error GoTo NoValidFolderError
    If files.count = 0 Then GoTo ExitFunction
    On Error GoTo 0


    Dim file As Scripting.file
    
    For Each file In files
    
        If getTargetFileOfLinkFiles And Globals.endsWith(file.name, ".lnk") Then
            Dim linkPath As String
            linkPath = Globals.getLinkPath(file.path)
            If Not linkPath = "" Then
                
                If Not Globals.fileExist(linkPath) Then
                    If warnOnBrokenLinkPaths Then
                        Err.Raise vbObjectError + 513, , "[Globals.listfiles] Der Pfad " & vbNewLine & linkPath & vbNewLine & " aus der Verknüpfung" & vbNewLine & file.path & vbNewLine & "ist ungültig"
                    End If
                    
                    GoTo NextFile
                Else
                    Set file = fileSystemObject.GetFile(linkPath)
                    linkPath = ""
                End If
                
                
            End If
        End If
        
        
        If ignoreDSStoreFiles Then
            Dim fileType As String
            fileType = Globals.getFileType(file.path)
            
            If LCase(Globals.getFileType(file.path)) = ".ds_store" Then
                GoTo NextFile
            End If
        End If
    
        If onlyFileNames Then
            listfiles.add file.name
        Else
            listfiles.add file.path
        End If
        
NextFile:
    Next
    
    If recursive Then
        Dim subFolders As collection
        Set subFolders = Globals.getFoldersInFolder(path, False)
        
        Dim i As Integer
        For i = 1 To subFolders.count
            listfiles.add listfiles(subFolders(i), onlyFileNames, getTargetFileOfLinkFiles, warnOnBrokenLinkPaths, ignoreDSStoreFiles, logger, ignoreIfFoldersDoesNotExist, recursive)
        Next i
    End If
    
ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
    Exit Function
NoValidFolderError:
    If Not logger Is Nothing Then logger.removeTab
    Err.Raise vbObjectError + 513, , "[Globals.listfiles] Der Pfad '" & path & "' ist ungültig"
End Function


Public Sub TestListfiles()
    
    MsgBox "Name: " & Globals.collectionToMultiLineStr(listfiles("V:\Produkte\Gedenktafeln", True))
    MsgBox "Path: " & Globals.collectionToMultiLineStr(listfiles("V:\Produkte\Gedenktafeln", False))
    
End Sub



Public Function openFolder(folderPath As String)
    shell "C:\WINDOWS\explorer.exe """ & folderPath & "", vbNormalFocus
End Function

' ACHTUNG: Bei einem Pfad dürfen keine doppelten Backslashes vorkommen \\
Public Function openFile(filePath As String)
    shell "C:\WINDOWS\explorer.exe """ & filePath & "", vbNormalFocus
End Function



' ByVal neu hinzugefügt. Könnte Probleme machen
Public Function createFolder(ByVal path As String)
    
    If path = "" Or path = "\" Or path = "\\" Then
        Err.Raise vbObjectError + 513, , "[Globals.createFolder] 'path' ist ungültig. path:" & path
    End If
    
    ' Der Pfad muss mit einem Backslash enden
    path = Globals.addBackslash(path)
    
    If isStringHavingIllegalDirectoryChars(path) Then
        Err.Raise vbObjectError + 513, , "[Globals.createFolder] 'path' enthält ein für Pfade ungültiges Zeichen. path:" & path
    End If
    
    path = normalizePath(path)

    'MsgBox "Folder '" & CStr(Dir(path)) & "'"
    
    'Wenn hier ein Fehler autritt, sollte der Ordner eventuell vorher gelöscht werden, jedoch war jemand gerade in dem Ordner.
    'Jetzt beim neu erstellen ist der Ordner noch da
    If Not folderExists(path) Then
        
        ' Rekursion: Bevor dieser Ordner erstellt wird, müssen erst die Oberordner erstellt werden.
        createFolder path & "..\"
        On Error GoTo FolderCreationError
        MkDir path
        On Error GoTo 0
        
        'SetAttr path, vbNormal
    End If
    
    Exit Function
FolderCreationError:
    
    If Err.number = 75 Then
        Dim answer As VbMsgBoxResult
        answer = MsgBox("Der Zugriff auf den Ordner '" & path & "' wurde verweigert. Stelle sicher, dass niemand auf diesen Ordner zugreift." & vbNewLine & vbNewLine & "Fehler:" & Err.Description & ", Fehlernummer:" & Err.number, vbRetryCancel Or vbExclamation)
        
        If answer = vbRetry Then
            createFolder path
            Exit Function
        Else
            Globals.endMacro
        End If
        
    Else
        Err.Raise Err.number, Err.source, Err.Description & ". Pfad: " & path, Err.HelpFile, Err.HelpContext
    End If
End Function


' Löst u.A. ..\ bei 'path' auf:
' V:\Produkte\..\ -> V:\
Public Function normalizePath(ByVal path As String) As String
    Dim parts() As String
    Dim result() As String
    Dim part As String
    
    Dim Prefix As String
    Dim Startindex As Long
    Dim resultCount As Long
    Dim i As Long
    
    Dim isUNC As Boolean
    Dim isAbsolute As Boolean
    Dim hadTrailingSlash As Boolean
    
    path = replace(path, "/", "\")
    
    If Len(path) = 0 Then
        normalizePath = ""
        Exit Function
    End If
    
    hadTrailingSlash = (Right$(path, 1) = "\")
    
    ' UNC-Pfad: \\Server\Share\...
    isUNC = (left$(path, 2) = "\\")
    
    If isUNC Then
        parts = Split(Mid$(path, 3), "\")
        
        If UBound(parts) < 1 Then
            normalizePath = path
            Exit Function
        End If
        
        Prefix = "\\" & parts(0) & "\" & parts(1)
        Startindex = 2
        isAbsolute = True
        
    ' Laufwerkspfad: C:\...
    ElseIf Len(path) >= 3 _
       And Mid$(path, 2, 2) = ":\" Then
        
        Prefix = left$(path, 2)
        parts = Split(Mid$(path, 4), "\")
        Startindex = 0
        isAbsolute = True
        
    ' Relativer Pfad
    Else
        parts = Split(path, "\")
        Prefix = ""
        Startindex = 0
        isAbsolute = False
    End If
    
    ReDim result(0 To UBound(parts))
    
    For i = Startindex To UBound(parts)
        part = parts(i)
        
        Select Case part
            Case "", "."
                ' ignorieren
                
            Case ".."
                If resultCount > 0 Then
                    resultCount = resultCount - 1
                    
                ElseIf Not isAbsolute Then
                    ' Bei relativen Pfaden führende .. erhalten
                    result(resultCount) = ".."
                    resultCount = resultCount + 1
                End If
                
            Case Else
                result(resultCount) = part
                resultCount = resultCount + 1
        End Select
    Next i
    
    If isAbsolute Then
        normalizePath = Prefix & "\"
    Else
        normalizePath = Prefix
    End If
    
    For i = 0 To resultCount - 1
        If Len(normalizePath) > 0 Then
            If Right$(normalizePath, 1) <> "\" Then
                normalizePath = normalizePath & "\"
            End If
        End If
        
        normalizePath = normalizePath & result(i)
    Next i
    
    If hadTrailingSlash _
       And Len(normalizePath) > 0 _
       And Right$(normalizePath, 1) <> "\" Then
       
        normalizePath = normalizePath & "\"
    End If
End Function


' Wenn der String ein Unicode-Zeichen entält wird true returnt
Public Function isStringHavingWideChar(str As String) As Boolean
    
    For i = 1 To Len(str)
        If isCharWide(Globals.getCharOfString(str, (i))) Then
            isStringHavingWideChar = True
            Exit Function
        End If
    Next i
    
End Function

' Wenn das Char ein Unicode ist, wird true returnt
Public Function isCharWide(char As String) As Boolean
    
    Dim charCode As Long
    charCode = getUnicodeOfChar(char)
    
    If charCode > gMaxCode Or charCode < 0 Then
        isCharWide = True
    End If
End Function


Public Sub TestIsStringHavingArabicChar()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    If ActiveShape.Type = cdrTextShape Then
        MsgBox "isStringHavingArabicChar: " & isStringHavingArabicChar(ActiveShape.text.Story)
    Else
        MsgBox "Bitte wähle eine Textform aus"
    End If
    
End Sub


Public Function isStringHavingArabicChar(str As String) As Boolean
    
    For i = 1 To Len(str)
        
        If isCharArabic(Globals.getCharOfString(str, (i))) Then
            isStringHavingArabicChar = True
            Exit Function
        End If
    Next i
    
End Function


Public Function isCharArabic(char As String) As Boolean
    
    If char = "" Then Err.Raise vbObjectError + 513, , "[Globals.isCharArabic] 'char' ist leer"
    
    Dim charCode As Long
    charCode = getUnicodeOfChar(char)
    
    ' Prüfen, ob das Zeichen im arabischen Unicode-Bereich liegt
    If (charCode >= &H600 And charCode <= &H6FF) Or _
       (charCode >= &H750 And charCode <= &H77F) Or _
       (charCode >= &H8A0 And charCode <= &H8FF) Or _
       (charCode >= &HFB50 And charCode <= &HFDFF) Or _
       (charCode >= &HFE70 And charCode <= &HFEFF) Then
        isCharArabic = True
    End If
End Function


Public Function getUnicodeOfChar(char As String) As Long
    getUnicodeOfChar = AscW(Mid(char, 1, 1))
End Function

Public Sub TestIsStringHavingWideChar()
    If ActiveShape.Type = cdrTextShape Then
        If isStringHavingWideChar(ActiveShape.text.Story.text) Then
            MsgBox "Unicode erkannt"
        Else
            MsgBox "Kein Unicode erkannt"
        End If
    End If
End Sub


Public Function warnAndEndIfFilePathHasIllegalChars(ByVal filePath As String)
    
    Dim folderAndFileName() As String
    folderAndFileName = Globals.getFolderFileAndType(filePath)
    
    If Globals.isStringHavingIllegalDirectoryChars(folderAndFileName(0)) Then
        MsgBox "Der Ordnerpfad enthält ein nicht erlaubtes Zeichen: " & folderAndFileName(0), vbCritical
        Globals.endMacro
    End If
    
    If Globals.isStringHavingIllegalFileNameChars(folderAndFileName(1)) Then
        MsgBox "Der Dateiname enthält ein nicht erlaubtes Zeichen: " & folderAndFileName(1), vbCritical
        Globals.endMacro
    End If
    
End Function


Public Function isStringPathHavingIllegalChars(filePath As String, Optional throwError As Boolean = False) As Boolean
    
    Dim folderAndFileName() As String
    folderAndFileName = Globals.getFolderFileAndType(filePath)
    
    If Globals.isStringHavingIllegalDirectoryChars(folderAndFileName(0)) Then
        Err.Raise vbObjectError + 513, , "Der Ordnerpfad enthält ein nicht erlaubtes Zeichen: " & folderAndFileName(0)
        isStringPathHavingIllegalChars = True
        Exit Function
    End If
    
    If Globals.isStringHavingIllegalFileNameChars(folderAndFileName(1)) Then
        Err.Raise vbObjectError + 513, , "Der Dateiname enthält ein nicht erlaubtes Zeichen: " & folderAndFileName(1)
        isStringPathHavingIllegalChars = True
        Exit Function
    End If
    
End Function


Public Function isStringHavingIllegalDirectoryChars(str As String) As Boolean
    
    If isStringHavingWideChar(str) Then
        isStringHavingIllegalDirectoryChars = True
        Exit Function
    End If

    
    If isStringHavingIllegalChars(str, True) Then
        isStringHavingIllegalDirectoryChars = True
        Exit Function
    End If
    
End Function


Public Function isStringHavingIllegalFileNameChars(str As String) As Boolean
    isStringHavingIllegalFileNameChars = isStringHavingIllegalChars(str)
End Function


Public Function isStringHavingIllegalChars(str As String, Optional allowDirectoryChars As Boolean = False)
    Dim illegalChars As New collection
    If Not allowDirectoryChars Then
        illegalChars.add "\"
        illegalChars.add "/"
        illegalChars.add ":"
    End If
    illegalChars.add "*"
    illegalChars.add "?"
    illegalChars.add """"
    illegalChars.add "<"
    illegalChars.add ">"
    illegalChars.add "|"
    illegalChars.add Chr(9) ' Tabulator
    
    For i = 1 To illegalChars.count
        If Globals.stringCompare(str, illegalChars(i), stringSearchType.StringInside) Then
            isStringHavingIllegalChars = True
            Exit Function
        End If
    Next i
    
    isStringHavingIllegalChars = False
End Function


Public Function TestIsStringHavingIllegalChars()
    MsgBox "Illegale Zeichen: " & isStringHavingIllegalChars("Hallo:wie gehts")
End Function

Public Sub TestIsStringHavingIllegalDirectoryChars()
    If ActiveShape.Type = cdrTextShape Then
        If isStringHavingIllegalDirectoryChars(ActiveShape.text.Story.text) Then
            MsgBox "Ungültiger Orderzeichen erkannt"
        Else
            MsgBox "Kein Ungültiger Orderzeichen erkannt"
        End If
    End If
End Sub



' Sucht von einem nicht exestierendem Pfad nach allen Oberordnern.
' Wenn einer von Ihnen exestiert, wird der Oberordner zurückgegenen
' Rekursiv
Public Function getPathsAvailableParentFolder(path As String) As String
    If folderExists(path) Then
        getPathsAvailableParentFolder = path
        Exit Function
    Else
        getPathsAvailableParentFolder = getPathsAvailableParentFolder(getParentPath(path))
    End If
    
End Function



Public Sub TestGetParentPath()
    MsgBox "TestGetParentPath: '" & getParentPath("V:\Produkte\Lineal\UV\Kinder\30cm\LNKUV-31x3,5\LNKUV-31x3,5.zip", 100) & "'" ' Sollte leer sein
End Sub


' Achtung:
' Funktioniert für Ordner
' Was ist aber mit Dateien. Kann sein, dass aus "V:\Produkte\Datei.cdr" > "V:\Produkte\" wird und nicht "V:\"
Public Function getParentPath(ByVal path As String, Optional stepsBack As Integer = 1) As String
    
    ' Mehrfach den Parent holen, wenn stepsBack größer als 1 ist
    stepsBack = stepsBack - 1
    For i = 1 To stepsBack
        path = getParentPath(path)
    Next i
    
    Dim searchStart As Integer
    searchStart = Len(path)
    
    'Letztes Backslash nicht suchen
    If Globals.endsWith(path, "\") Then
        searchStart = searchStart - 1
    End If
    
    ' Nach nächsten Backslash suchen
    For i = searchStart To 1 Step -1
        If Mid(path, i, 1) = "\" Then
            getParentPath = left(path, i)
            Exit Function
        End If
    Next i
End Function


Public Function getFileOrFolderName(folderOrFilePath As String) As String
    If Globals.isFileOrFolder(folderOrFilePath) Then
        getFileOrFolderName = Globals.getFileName(folderOrFilePath)
    Else
        getFileOrFolderName = Globals.getFolderName(folderOrFilePath)
    End If
End Function

' Gibt nur den Ordnernamen ohne Pfad zurück
Public Function getFolderName(path As String) As String
    Dim folderName As String
    folderName = Right(path, Len(path) - Len(getParentPath(path)))
    
    ' Backslash entfernen
    getFolderName = removeBackslash(folderName)
End Function

' Gibt von einem ganzen Dateipfad "C:\Users\Desktop\Bild1.jpg" nur den Dateinamen zurück "Bild1"
Public Function getFileName(filePath As String) As String
    Dim folderFileAndType() As String
    folderFileAndType = getFolderFileAndType(filePath)
    
    getFileName = folderFileAndType(1)
End Function


' Gibt von einem ganzen Dateipfad "C:\Users\Desktop\Bild1.jpg" nur den Dateinamen & die Dateiendung zurück "Bild1.jpg"
Public Function getFileNameAndType(filePath As String) As String
    Dim folderFileAndType() As String
    folderFileAndType = getFolderFileAndType(filePath)
    
    getFileNameAndType = folderFileAndType(1) & folderFileAndType(2)
End Function

' ACHTUNG: Der Dateityp wird mit einem Punkt returnt: ".pdf"
Public Function getFileType(filePath As String) As String
    Dim folderFileAndType() As String
    folderFileAndType = getFolderFileAndType(filePath)
    
    getFileType = folderFileAndType(2)
End Function

Public Function deleteFile(path) As Boolean
    On Error GoTo Error
    Kill path
    On Error GoTo 0
    
    Exit Function
Error:
    
    If Err.number = 70 Then
       Select Case MsgBox("Der Zugriff auf die Datei '" & path & "' wurde verweigert. Stelle sicher, dass niemand auf diese Datei zugreift." & vbNewLine & vbNewLine & "Fehler:" & Err.Description & ", Fehlernummer:" & Err.number, vbRetryCancel Or vbExclamation, Application.name)
            Case vbRetry
                deleteFile path
                Exit Function
            Case vbCancel
                Globals.endMacro
        End Select
        
    Else
        Err.Raise Err.number, Err.source, Err.Description, Err.HelpFile, Err.HelpContext
    End If
    
End Function



Public Function deleteFolderContents(path As String) As Boolean
    If Not folderExists(path) Then
        Exit Function
    End If

    For Each f In fileSystemObject.GetFolder(path).files
        f.delete Force = True
    Next
    
    For Each sf In fileSystemObject.GetFolder(path).subFolders
        sf.delete Force = True
    Next

End Function


' Throws Exception
Public Function deleteFolder(path As String) As Boolean
    
    If Not folderExists(path) Then
        Exit Function
    End If
    
    Dim file: Set file = fileSystemObject.GetFolder(path)
    
    On Error GoTo Error
    file.delete True ' Auch schreibgeschützte Ordner löschen
    On Error GoTo 0
    
    Exit Function
Error:
    If Err.number = 70 Then
        Select Case MsgBox("Der Zugriff auf den Ordner '" & path & "' wurde verweigert. Stelle sicher, dass niemand auf diesen Ordner zugreift." & vbNewLine & vbNewLine & "Fehler:" & Err.Description & ", Fehlernummer:" & Err.number, vbRetryCancel Or vbExclamation, Application.name)
            Case vbRetry
                deleteFolder path
                Exit Function
            Case vbCancel
                Globals.endMacro
        End Select
        
    Else
        Err.Raise Err.number, Err.source, Err.Description, Err.HelpFile, Err.HelpContext
    End If
    
End Function



Public Function deleteFilesOrFolders(paths As collection)
    
    For i = 1 To paths.count
        If Globals.isFileOrFolder(paths(i)) Then
            Globals.deleteFile paths(i)
        Else
            Globals.deleteFolder paths(i)
        End If
    Next i
    
End Function



' Fügt ein Backslash hinten an, wenn nicht schon vorhanden
Public Function addBackslash(str As String) As String
    If Not endsWith(str, "\") Then
        str = str & "\"
    End If
    
    addBackslash = str
End Function


Public Function removeBackslash(ByVal str As String) As String
    If endsWith(str, "\") Then
        str = left(str, Len(str) - 1)
    End If
    
    removeBackslash = str
End Function



Public Sub TestRemoveBackslash()
    MsgBox "" & removeBackslash("Test\")
End Sub



' Throws Exception
' Damit overWriteFiles auch für weitere Aufrufe vom User mittels Messagebox auf True gesetzt werden kann, muss man eine Variable erstellen, die jedes mal beim Aufrufen diese Funktion als 'overWriteFiles' mitgegeben wird
' Gibt den finalen 'pastePath' zurück
Public Function copyPasteFile(filePath As String, ByVal pastePath As String, Optional addFileNameAndExtensionToPastePath As Boolean = False, Optional ByRef overWriteFiles As Boolean = False, _
    Optional createPathIfNotExist As Boolean = False, Optional askWhenFileAlreadyExistAndOverWriteIsOff As Boolean = True) As String
    
    If pastePath = "" Then
        Err.Raise vbObjectError + 513, , "[Globals.copyPasteFile] 'pastePath' ist Leer "
    End If
    
    
    
    ' Wenn der "pastePath" nur der Zielordner ist, fehlt noch der Zieldateiname.
    ' Dieser wird dann einfach aus der Quelldatei "filePath" extrahiert
    If addFileNameAndExtensionToPastePath Then
        Dim folderFileAndType() As String
        folderFileAndType = getFolderFileAndType(filePath)
        
        pastePath = addBackslash(pastePath) & folderFileAndType(1) & folderFileAndType(2)
    End If
    
    If Not overWriteFiles And askWhenFileAlreadyExistAndOverWriteIsOff Then
        If Globals.fileExist(pastePath) Then
            
            Dim answer As VbMsgBoxResult
            answer = MsgBox("Folgende Datei Exestiert bereits: " & vbNewLine & vbNewLine & pastePath & vbNewLine & vbNewLine & "Möchtest du alle Dateien überschreiben", vbYesNoCancel Or vbQuestion)
            
            If answer = vbYes Then
                overWriteFiles = True
            ElseIf answer = vbNo Then
                Exit Function
            Else
                Globals.endMacro ' Alle Abbrechen
            End If
            
        End If
    End If
    
    If createPathIfNotExist Then
        Globals.createFolder Globals.getFolderFileAndType(pastePath)(0)
    End If
    
    ' Wenn hier ein Fehler auftritt und ein Pfad nicht exestiert, kann es daran liegen, dass 'createPathIfNotExist' false ist
    fileSystemObject.CopyFile filePath, pastePath, overWriteFiles
    
    copyPasteFile = pastePath
End Function


Public Function copyPasteFolder(folderPath As String, ByVal pastePath As String, Optional ByRef overWriteFiles As Boolean = False, Optional addFolderNameToPastepath As Boolean = False)

    If addFolderNameToPastepath Then
        pastePath = addBackslash(pastePath) & getFolderName(folderPath)
    End If
    
    ' Sicherstellen, dass der Pfad exestiert
    Globals.createFolder pastePath
    
    fileSystemObject.CopyFolder removeBackslash(folderPath), pastePath, overWriteFiles
    
End Function


Public Function moveFolder(folderPath As String, pastePath As String, Optional ByRef overWriteFiles As Boolean = False, Optional addFolderNameToPastepath As Boolean = False)
    
    copyPasteFolder folderPath, pastePath, overWriteFiles, addFolderNameToPastepath
    deleteFolder folderPath
    
End Function


Public Function moveFile(filePath As String, pastePath As String, Optional ByRef overWriteFiles As Boolean = False, Optional addFileNameAndExtensionToPastePath As Boolean = False, _
        Optional askWhenFileAlreadyExistAndOverWriteIsOff As Boolean = True, Optional createPathIfNotExist As Boolean = False)
    ' Funktioniert nicht ?
    'fileSystemObject.moveFile source, destination
    
    copyPasteFile filePath, pastePath, addFileNameAndExtensionToPastePath, overWriteFiles, createPathIfNotExist, askWhenFileAlreadyExistAndOverWriteIsOff
    deleteFile filePath
    
    
End Function



Public Function moveFolderFiles(folderPath As String, pastePath As String, Optional ByRef overWriteFiles As Boolean = False, Optional addFileNameAndExtensionToPastePath As Boolean = False, _
        Optional askWhenFileAlreadyExistAndOverWriteIsOff As Boolean = True, Optional createPathIfNotExist As Boolean = False)
    
    Dim files As New collection
    Set files = Globals.getFilesInFolder(folderPath, False)
    
    ' Wird gemacht, damit immer die selbe Variable übergeben wird.
    ' Denn wenn mal eine Datei überschrieben werden muss, soll nicht jedes mal beim User nachgefragt werden.
    ' Wenn er einmal ja drückt, dann wird 'overWriteFilesRemembered' auf true gesetzt
    Dim overWriteFilesRemembered As Boolean
    overWriteFilesRemembered = overWriteFiles
    
    For i = 1 To files.count
        moveFile files(i), pastePath, overWriteFilesRemembered, addFileNameAndExtensionToPastePath, askWhenFileAlreadyExistAndOverWriteIsOff, createPathIfNotExist
        overWriteFiles = overWriteFilesRemembered
    Next i
    
End Function


Public Sub TestDesignFilesConvertProductImagesToVersion()
    
    Dim sizeFolder As New FSSizeFolder
    sizeFolder.init "C:\Users\GRAVURU 2\Desktop\Struktur umräumen Test\Türschilder\"
    
    Dim designFiles As FSDesignFiles
    Set designFiles = sizeFolder.getDesignFilesByPath("C:\Users\GRAVURU 2\Desktop\Struktur umräumen Test\Türschilder\HSW-A-6x2-D0")
    
    designFiles.convertProductImagesToVersion VERSION_2
    
End Sub


Public Function fileExist(fileName As String) As Boolean

    If fileName = "" Then
        fileExist = False
        Exit Function
    End If
    
On Error GoTo Error:
    fileExist = fileSystemObject.FileExists(fileName)
    Exit Function
Error:
    On Error GoTo 0
    fileExist = False
End Function



Public Function folderExists(folderPath As String) As Boolean
    
    folderExists = fileSystemObject.folderExists(folderPath)
    
End Function


Public Function fileOrFolderExists(path As String) As Boolean
    
    If Globals.isFileOrFolder(path) Then
        fileOrFolderExists = Globals.fileExist(path)
    Else
        fileOrFolderExists = Globals.folderExists(path)
    End If
    
End Function


Public Sub TestFolderExist()

    Dim folder As String
'    folder = "C:\Users\GRAVURU 2\Desktop\" & "Konfi Größen.psd\"
    folder = "V:\Produkte\Standbilder\Gravur\Infinity Foto\Holz\20x8.5\\INFF-H-20x8.5-D0\Produktbilder\PNG\INFFUV-H-20x8.5-D0_front_trans.png\"

    MsgBox "Der Ordner '" & folder & "' exestiert" & IIf(folderExists(folder), "", " nicht")

End Sub



Public Sub TestIsFolderEmtpy()
    
    MsgBox "isFolderEmtpy: " & isFolderEmtpy("C:\Users\GRAVURU 2\Desktop\Struktur umräumen Test", True)
    
End Sub



'Optional ignoreEmptyFolders As Boolean = True
Public Function isFolderEmtpy(folderPath As String, Optional recursive As Boolean = False) As Boolean
    
    If Globals.folderExists(folderPath) Then
        Dim subFolders As collection
        Set subFolders = Globals.getFoldersInFolder(folderPath, False)
        
        isFolderEmtpy = True
        
        If Globals.getFilesInFolder(folderPath).count > 0 Then
            isFolderEmtpy = False
            Exit Function
        End If
        
        If recursive Then
            For i = 1 To subFolders.count
                If Not isFolderEmtpy(subFolders(i), recursive) Then
                    isFolderEmtpy = False
                    Exit Function
                End If
            Next i
        Else
            If subFolders.count > 0 Then
                isFolderEmtpy = False
                Exit Function
            End If
        End If
        
        Set subFolders = Nothing
    Else
        'Error
    End If
    
End Function



' Throws Exception
Public Function getFileCreationDate(filePath As String) As Date
    
    Dim file As file
    Set file = fileSystemObject.GetFile(filePath)
    
    getFileCreationDate = file.DateCreated
End Function

Public Function getFileDateLastModified(filePath As String) As Date
    Dim file As file
    Set file = fileSystemObject.GetFile(filePath)
    
    getFileDateLastModified = file.dateLastModified
End Function

Public Function getFolderCreationDate(folderPath As String) As Date
    
    Dim folder As folder
    Set folder = fileSystemObject.GetFolder(folderPath)
    
    getFolderCreationDate = folder.DateCreated
End Function





' ACHTUNG: Nutzt die angegebene Collection
' Throws Exception
Public Function sortFilesOrFoldersByCreationDate(filesOrFolders As collection)
    
    ' BubbleSort
    For i = 1 To filesOrFolders.count - 1
    
        For j = i + 1 To filesOrFolders.count
            
            Dim folderOrfileB As String
            folderOrfileB = filesOrFolders(j)
            Dim folderOrfileBCreationDate As Date
            
            If isFileOrFolder(folderOrfileB) Then
                folderOrfileBCreationDate = getFileCreationDate(folderOrfileB)
            Else
                folderOrfileBCreationDate = getFolderCreationDate(folderOrfileB)
            End If
            
            Dim folderOrfileACreationDate As Date
            If isFileOrFolder(filesOrFolders(i)) Then
                folderOrfileACreationDate = getFileCreationDate(filesOrFolders(i))
            Else
                folderOrfileACreationDate = getFolderCreationDate(filesOrFolders(i))
            End If
            
            Dim keepIndex As Boolean
            keepIndex = folderOrfileACreationDate < folderOrfileBCreationDate
             
            
            If Not keepIndex Then
                filesOrFolders.Remove j
                filesOrFolders.add folderOrfileB, , i
            End If
        Next j
    Next i
End Function


Public Function arePathsEqual(path1 As String, path2 As String) As Boolean
    
    Dim result As Boolean
    
    If Globals.isFileOrFolder(path1) Then
        result = (path1 = path2)
    Else
        result = areFolderPathsEqual(path1, path2)
    End If
    
    arePathsEqual = result
End Function

' Es kann sein, dass ein Ordnerpfad mit einem Backslash endet oder nicht
' Bspw.: "C:\Windows" oder "C:\Windows\"
' Diese Funktion fügt zu den Pfaden einen Backslash hinzu, wo noch keiner ist und vergleicht die Pfade dann
Public Function areFolderPathsEqual(folder1 As String, folder2 As String) As Boolean
    areFolderPathsEqual = Globals.addBackslash(folder1) = Globals.addBackslash(folder2)
End Function


Public Function isFileOrFolder(path As String) As Boolean
    
    On Error GoTo NoFileError
    Dim file As file
    Set file = fileSystemObject.GetFile(path)
    
    On Error GoTo 0
    
    isFileOrFolder = True
    
    Exit Function
NoFileError:
    isFileOrFolder = False
End Function



' Gibt den Ordner, den Dateinamen und die Dateiendung von einer Datei aufgesplitted in einem String-Array mit 3 Fächern
' Index 0 ist der Folder usw.
' FileType hat ein Punkt
' ACHTUNG: Es werden nur backslashes unterstützt '\' keine normalen slashes '/' für Ordner
Public Function getFolderFileAndType(ByVal path As String) As String()
    
    Dim folder As String
    folder = path
    
    Dim slashPos As Integer
    slashPos = InStrRev(folder, "\")
    
    If Not slashPos = 0 Then
        folder = left(folder, slashPos)
    Else
        folder = ""
    End If
    
    Dim fileName As String
    fileName = Right(path, Len(path) - slashPos)
    
    Dim dotPos As Integer
    dotPos = InStrRev(fileName, ".")
    
    
    Dim fileType As String
    fileType = "." & Right(fileName, Len(fileName) - dotPos)
    
    'Wenn ein Punkt gefunden wurde
    If Not dotPos = 0 Then
        fileName = left(fileName, dotPos - 1)
    End If
    
    
    
    Dim arr(3) As String
    
    arr(0) = folder
    arr(1) = fileName
    arr(2) = fileType
    
'    MsgBox "folder=" & folder & ", file=" & fileName & ", type=" & fileType
    
    
    getFolderFileAndType = arr
End Function



Public Function renameFileOrFolder(path As String, newPath As String)

    Name path As newPath

End Function



Public Function getDesignCDRs(path As String, Optional recursive As Boolean = True) As collection
    
    Dim result As New collection
    
    Dim folders As collection
    
    If recursive Then
        Set folders = getCDRFolders(path)
    Else
        Set folders = New collection
        folders.add path
    End If
    
    For i = 1 To folders.count
         
        Globals.combineCollectionToCollection getDesignCDRsInFolder(folders(i)), result
        
    Next i
    
    
    Set getDesignCDRs = result
End Function




Public Function getCDRFolders(ByVal path As String, Optional allowCDRFoldersInCDRFolder As Boolean) As collection
    
    Dim result As New collection
    
    
    If Not allowCDRFoldersInCDRFolder Then
        ' Abkürzen: Direkt zu Anfang versuchen den CDR Ordner in diesem 'path' zu finden
        ' Denn weiter unten werden zunächst die Designordner angesehen und erst spät der [CDR] Ordner.
        ' Das liegt daran, dass wir die Ordner nicht in der Reihenfolge zurückbekommen wie in Windows Explorer zu sehen
        '
        ' Die Abkürzung verhindert aber auch, dass wir weiter nach CDR Ordnern suchen, wenn einer in diesem Ordner gefunden wurde
        ' Deshalb gibt es 'allowCDRFoldersInCDRFolder'
        Dim cdrFolderPathGuess As String
        cdrFolderPathGuess = addBackslash(path) & "[CDR]"
        If Globals.folderExists(cdrFolderPathGuess) Then
            result.add cdrFolderPathGuess
            GoTo ExitFunction
        End If
    End If
    
    
    
    Dim folders As collection
    Set folders = listFoldersInFolder(path)
    
    Dim sProgress As SubProgress
    Set sProgress = ProgressBarUserForm.newSubProgress(2)
    
    Dim skipRecusion As Boolean
    
    With ProgressBarUserForm.newSubProgress(folders.count)
        
        For i = 1 To folders.count
            
            .setDisplayText Globals.getFolderName(folders(i))
            
            If endsWith(Globals.addBackslash(folders(i)), "[CDR]\") Then
                
                result.add folders(i)
                
                skipRecusion = True
                GoTo finishIt
                
                ' Archivordner überspringen
            ElseIf endsWith(Globals.addBackslash(folders(i)), "[Archiv]\") Then
                
                GoTo finishIt
            
            End If
            .setStepsProgress i
        Next i
finishIt:
        .finishProgress
    End With
    
    sProgress.setStepsProgress 1
    
    If Not skipRecusion Then
        With ProgressBarUserForm.newSubProgress(folders.count)
            ' Wenn bis hierhin nichts gefunden wurde, rekursiv suchen
            For i = 1 To folders.count
                
                .setDisplayText Globals.getFolderName(folders(i))
                
                If Not endsWith(Globals.addBackslash(folders(i)), "[Archiv]\") Then
                    ' Rekursion
                    Globals.combineCollectionToCollection getCDRFolders(folders(i)), result
                    
                End If
                .setStepsProgress i
            Next i
            .finishProgress
        End With
    End If
    
    sProgress.finishProgress
    
ExitFunction:
    Set getCDRFolders = result
End Function


Public Function getDesignCDRsInFolder(ByVal path As String) As collection
    
    Dim result As New collection
    
    Dim allCDRFiles As collection
    'Set allCDRFiles = listfiles(path, False)
    Set allCDRFiles = Globals.getFilesPathWithExtensionInFolder(path, "cdr")
    
    For j = 1 To allCDRFiles.count
        Dim fileName As String
        fileName = Globals.getFileName(allCDRFiles(j))
        
'        If InStr(fileName, "Designs") Then
            If Not stringCompare(fileName, "Sicherungskopie", StringInside) And _
                Not stringCompare(fileName, "Produktbild", StringInside) And _
                Not stringCompare(fileName, "Beschnittzugabe", StringInside) And _
                Not stringCompare(fileName, "Viewbox", StringInside) Then
                result.add allCDRFiles(j)
            End If
'        End If
    Next j
    
    
    Set getDesignCDRsInFolder = result
End Function


' Wenn 'zipNameAsMainFolder' nicht true ist, werden die Dateien in der Zip-Datei direkt zum 'exportPath' entpackt, ohne Hauptordner, der so heißt wie die ZIP
' Returnt den Exportpfad
' ACHTUNG: Der User kann das Entpacken auch abbrechen, weil ein Entpackendialog erscheint.
'          In diesem Fall erscheint kein Fehler
Public Function unzip(pathToZIP As String, exportPath As String, Optional zipNameAsMainFolder As Boolean = True, Optional cleanUpExportFolder As Boolean = False) As String
    
    
    If pathToZIP = "" Then
        Err.Raise vbObjectError + 513, , "[Globals.unzip] 'pathToZip' ist leer"
    End If
    
    If InStr(exportPath, "\\") Then
        Err.Raise vbObjectError + 513, , "[Globals.unzip] Der Exportpfad enthält doppelte Backslashes. exportPath: '" & exportPath & "'"
    End If
    
    If Globals.endsWith(pathToZIP, " .zip") Then
        Err.Raise vbObjectError + 513, , "[Globals.unzip] Der Dateiname der Zip enthält ein Leerzeichen am Ende. pathToZip: '" & pathToZIP & "'"
    End If
    
    If cleanUpExportFolder Then
        Globals.deleteFolderContents (exportPath)
    End If
    
    If Not Globals.folderExists(exportPath) Then
        Globals.createFolder exportPath
    End If
    
    Dim shell As shell
    Set shell = CreateObject("Shell.Application")
    
    Dim zipFileName As String
    zipFileName = getFolderFileAndType(pathToZIP)(1)
    
    exportPath = exportPath & IIf(zipNameAsMainFolder, zipFileName & "\", "")
    
    createFolder exportPath
    
    Dim nameSpaceThing As Shell32.folder
    Set nameSpaceThing = shell.NameSpace(exportPath)
    
    Dim zipFileItems
    Set zipFileItems = shell.NameSpace(pathToZIP).Items
    nameSpaceThing.CopyHere zipFileItems ' Wenn der 'exportPath' doppelte Backslashes hat, dann tritt hier ein Fehler auf.
    
    ' Skript wartet, bis entpackt... '
    
    unzip = exportPath
End Function



Public Function zipFolder(ByVal folderToZipPath As String, ByVal zippedFileFullName As String)

    ' Die Windows-ZIP-Shell (zipfldr.dll) ist hart auf MAX_PATH (260 Zeichen) begrenzt und
    ' ignoriert die Long-Path-Unterstützung von Windows. Beim Packen baut sie intern den
    ' virtuellen Pfad <Ziel-ZIP>\<Eintragsname> zusammen; liegt die Ziel-ZIP auf einem langen
    ' Pfad (z. B. Server), kippt diese Summe über 260 -> "Datei nicht gefunden oder keine
    ' Leseberechtigung", und die ZIP bleibt leer. Deshalb wird IMMER in einem kurzen Temp-Pfad
    ' gezippt und die fertige ZIP anschließend ans (evtl. lange) Ziel kopiert.

    Dim tempZipFolder As String
    tempZipFolder = Globals.getTempFolder & "CorelDraw Script Zip\"
    Globals.createFolder tempZipFolder

    Dim tempZipFullName As String
    tempZipFullName = tempZipFolder & Globals.getFileNameAndType(zippedFileFullName)

    ' Reste eines früheren, evtl. abgebrochenen Laufs entfernen
    If Globals.fileExist(tempZipFullName) Then Globals.deleteFile tempZipFullName

    ' Eigentliches Packen im kurzen Temp-Pfad
    zipFolder_CreateInShortPath folderToZipPath, tempZipFullName

    ' Fertige ZIP ans (evtl. lange) Ziel kopieren (verkraftet lange Pfade) und Temp aufräumen
    Dim overWriteFiles As Boolean
    overWriteFiles = True
    Globals.copyPasteFile tempZipFullName, zippedFileFullName, False, overWriteFiles, True, False
    Globals.deleteFile tempZipFullName

End Function


Private Function zipFolder_CreateInShortPath(ByVal folderToZipPath As String, ByVal zippedFileFullName As String)

    Open zippedFileFullName For Output As #1
    Print #1, Chr$(80) & Chr$(75) & Chr$(5) & Chr$(6) & String(18, 0)
    Close #1

    Dim shellApp As New Shell32.shell

    Dim zipFile As Shell32.folder
    Set zipFile = shellApp.NameSpace(zippedFileFullName)
    If zipFile Is Nothing Then
        Err.Raise vbObjectError + 513, , "[Globals.zipFolder] Der Pfad zur ZIP-Datei existiert nicht: " & zippedFileFullName
    End If

    Dim srcFolder As Shell32.folder
    Set srcFolder = shellApp.NameSpace(folderToZipPath)
    If srcFolder Is Nothing Then
        Err.Raise vbObjectError + 513, , "[Globals.zipFolder] Der Ordner zum Zippen existiert nicht: " & folderToZipPath
    End If

    Dim expected As New Dictionary
    zipFolder_CollectRelevantItemNames srcFolder, expected

    With ProgressBarUserForm.newSubProgress(srcFolder.Items.count)

        .setDisplayText "Zippen"

        zipFile.CopyHere srcFolder.Items, 20

        Dim timer As Long
        
        Do
            .setStepsProgress zipFile.Items.count
            
            If zipFolder_AllItemsExistInZip(expected, zipFile) Then
                Exit Do
            End If
            
            ' Bei 30 Sekunden abbrechen!
            If timer > 30000 Then
                Err.Raise vbObjectError + 513, , "[Globals.zipFolder] Timeout beim Erstellen der ZIP-Datei: " & zippedFileFullName
            End If

            Sleep 5
            timer = timer + 5
            Set fld = Nothing
        Loop

        .finishProgress
    End With

End Function


Private Function zipFolder_CollectRelevantItemNames(ByVal shFolder As Shell32.folder, ByVal dict As Dictionary)
    Dim itm As Shell32.FolderItem
    
    For Each itm In shFolder.Items
        ' Vorschau Datei von TrueNAS ignorieren
        If LCase$(itm.name) <> "thumbs.db" Then
            dict(LCase$(itm.name)) = True
        End If
    Next itm
End Function


Private Function zipFolder_AllItemsExistInZip(ByVal expected As Dictionary, ByVal zipFolder As Shell32.folder) As Boolean
    Dim existing As New Dictionary
    
    Dim itm As Shell32.FolderItem
    For Each itm In zipFolder.Items
        existing(LCase$(itm.name)) = True
    Next itm
    
    Dim key As Variant
    For Each key In expected.keys
        If Not existing.Exists(CStr(key)) Then
            zipFolder_AllItemsExistInZip = False
            Exit Function
        End If
    Next key
    
    zipFolder_AllItemsExistInZip = True
End Function





Public Function isCDRhavingStyles(cdrPath As String) As Boolean
    
    Dim cdrZipPath As String
    cdrZipPath = Globals.addBackslash(Globals.getTempFolder) & "CDR-ZIP.zip"
    
    Globals.copyPasteFile cdrPath, cdrZipPath, , True
    
    
    
    Dim shell As shell
    Set shell = CreateObject("Shell.Application")
    
    Dim zipFileItems As Shell32.FolderItems
    Set zipFileItems = shell.NameSpace(cdrZipPath).Items
    
    For i = 1 To zipFileItems.count
        If zipFileItems.item(i).name = "styles" Then
            
            Dim styles As Shell32.FolderItem
            Set styles = zipFileItems.item(i)
            
            Dim stylesFolder As Shell32.folder
            Set stylesFolder = shell.NameSpace(styles.GetFolder)
            
            If stylesFolder.Items.count > 1 Then
                ' Mehr als eine Datei im Styles Ordner.
                ' Eine Datei im Styles Ordner ist immer die "document.cdss", welche auch benötigt wird.
                ' Alle anderen Dateien sind .colorbitmap Dateien welche die CDR extrem verlangsamen (je nach Anzahl)
                isCDRhavingStyles = True
            End If
            
            Exit For
        End If
    Next i
    
    ' ZIP-CDR löschen
    Globals.deleteFile cdrZipPath
    
End Function




Public Function loadCDR(path As String) As shape

    Dim impopt As StructImportOptions
    Set impopt = CreateStructImportOptions
    With impopt
        .MaintainLayers = True
    End With
    Dim impflt As ImportFilter
    
    Set impflt = ActiveDocument.ActiveLayer.ImportEx(path, cdrCDR, impopt)
    impflt.finish
    
    Set loadCDR = ActiveShape
End Function




Public Function loadSVG(path As String) As shape
    Set loadSVG = load(path)
End Function



Public Sub TestLoad()
    
    Dim loadedShape As shape
    Set loadedShape = load("V:\Motive\Tiere & Pfoten\Hunde\Hund_05.svg")
    
    MsgBox "loadedShape: '" & getShapeDisplayName(loadedShape) & "'"
    
End Sub

' Achtung: Es wird in das aktuelle Dokument reingeladen, dehalb muss ein Dokument vorhanden sein
Public Function load(path As String) As shape
    
    Dim result As shape
    
    Dim impopt As StructImportOptions
    Set impopt = CreateStructImportOptions

    
    Dim impflt As ImportFilter
    ' Weil neuerdings (10.5) auch die Desktopebene genutzt wird um Shapes von den Scripten auszuschließen,
    ' ist ActiveDocument.ActiveLayer komischerweise die Desktopebene. Von der kann scheinbar nicht exportiert werden.
    ' Deshalb muss hier explizit die zweite Ebene ausgewählt werden (die Erste ist die mit den Hilfslinien)
    Set impflt = getLayer1ofDoc(ActiveDocument).ImportEx(path, , impopt)
    impflt.finish
    
    Set result = ActiveShape
    
    If Globals.endsWith(path, ".svg") Then
        ' Bei Motiv-SVG's die Gruppe und die SVG-Daten löschen
        If result.Type = cdrGroupShape Then
            If result.shapes.count > 0 Then ' Es kann sein, dass eine Gruppe die keine Shapes hat, noch kurz da ist, bevor Corel sie löscht
    
                If result.shapes(1).Type = cdrNoShape Then ' SVG-Daten
                    If result.shapes.count = 2 Then
                        result.shapes(1).locked = False
                        result.shapes(1).delete
                        result.Ungroup
                        
                        Set result = ActiveShape
                    End If
                End If
            End If
        End If
    End If
    
    Set load = result

End Function




' Lädt ein Bild in Corel rein. Ist dann abrufbar mit 'image = ActiveShape'
Public Function loadImage(path As String, Optional errorMessageWhenNotFound As Boolean = True) As shape

    If errorMessageWhenNotFound Then
        On Error GoTo Error:
    End If
    
    Dim impflt As ImportFilter
    Set impflt = ActiveLayer.ImportEx(path)
    impflt.finish
    
    Set loadImage = ActiveShape
    
    On Error GoTo 0
    Exit Function
Error:
    MsgBox "Die Datei '" & path & "' konnte nicht gefunden werden!", vbExclamation
    On Error GoTo 0
End Function




' Lädt ein Bild unter berücksichtigung der TIFF/EXIF Orientierungs-Einstellung (Drehung)
Public Function loadImageWithoutRotation(path As String) 'TODO

   loadImage path
   
End Function



'Throws Exception
Function getImageSize(imagePath As String) As Variant
 
    'Declaring the necessary variables.
    Dim imgSize(1)  As Integer
    Dim wia         As Object
 
 
    'Create the ImageFile object and check if it exists.
    On Error Resume Next
    Set wia = CreateObject("WIA.ImageFile")
    If wia Is Nothing Then Exit Function
    On Error GoTo 0
 
    'Load the ImageFile object with the specified File.
    wia.loadFile imagePath
 
    'Get the necessary properties.
    imgSize(0) = wia.width
    imgSize(1) = wia.height
 
    'Reeelease the ImageFile object.
    Set wia = Nothing
 
    'Return the array.
    getImageSize = imgSize
 
End Function


' Gibt den nächsten freien Dateipfad zurück, falls der gegebene schon exestiert.
' Das Ende des Dateinamens wird einfach hochgezählt. Z.B: Für "Datei" ist der nächstfreie Name "Datei1"
Public Function getNextFreeFileName(fileName As String, Optional withFileType As Boolean = True) As String
    
    Dim folderFileAndType() As String
    folderFileAndType = getFolderFileAndType(fileName)
    
    getNextFreeFileName = IIf(withFileType, fileName, folderFileAndType(0) & folderFileAndType(1))

    If Globals.fileExist(fileName) Then
        
        Dim fileNr As Integer
        fileNr = Globals.getNumberAtEndOfString(folderFileAndType(1))
        
        Dim noFileNr As Boolean
        If fileNr = -1 Then
            fileNr = 0
            noFileNr = True
        End If
        fileNr = fileNr + 1 ' Als erstes die nächstfreie Zahl prüfen usw
        
        Dim fileNameWithoutNumber As String
        fileNameWithoutNumber = left(folderFileAndType(1), Len(folderFileAndType(1)) - IIf(noFileNr, 0, Len(CStr(fileNr))))
        
        While Globals.fileExist(folderFileAndType(0) & fileNameWithoutNumber & CStr(fileNr) & folderFileAndType(2))
            fileNr = fileNr + 1
        Wend
        
        getNextFreeFileName = folderFileAndType(0) & fileNameWithoutNumber & CStr(fileNr) & IIf(withFileType, folderFileAndType(2), "")
    End If
End Function


Public Function getNextFreeFolderPath(folderPath As String) As String
    
    Dim parentPath As String
    parentPath = Globals.getParentPath(folderPath)
    
    Dim folderName As String
    folderName = Globals.getFolderName(folderPath)
    
    Dim counter As Integer
    counter = Globals.getLastNumberOfString(folderName)
    If counter = -1 Then
        counter = 0
    Else
        ' Zahl vom Ordnernamen entfernen
        folderName = left(folderName, Len(folderName) - Len(CStr(counter)))
    End If
    
    Dim testFolderPath As String
    
    Do
        testFolderPath = parentPath & folderName & IIf(counter > 0, CStr(counter), "")
        
        counter = counter + 1
    Loop Until Not Globals.folderExists(testFolderPath)
    
    
    getNextFreeFolderPath = testFolderPath
End Function



' Throws Exception
' ACHTUNG: Die Datei sollte nicht in UTF-8 kodiert sein. Sondern in Windows-1250
Public Function loadFileAsString(filePath As String) As String

    If Not Globals.fileExist(filePath) Then
        Err.Raise vbObjectError + 513, , "[Globals.loadFileAsString] Die Datei '" & filePath & "' exestiert nicht"
    End If

    Dim textFile As Integer
    textFile = FreeFile
    Dim fileContent As String
    
    
    'Tritt hier ein Fehler auf, wurde nicht vorher geprüft, ob der Serven online ist
    Open filePath For Input As textFile

    fileContent = Input$(LOF(textFile), textFile)
    

    Close textFile

    loadFileAsString = fileContent

End Function



' Throws Exception
Public Function loadFileAsStringFromUTFEight(filePath As String) As String
    
    If filePath = "" Or Not IIf(Globals.endsWith(filePath, "\"), Globals.folderExists(filePath), Globals.fileExist(filePath)) Then
        Err.Raise vbObjectError + 513, , "[Globals.loadFileAsStringFromUTFEight] Die Datei '" & filePath & "' exestiert nicht"
    End If
    
    Dim result As String

    Set adoStream = New ADODB.Stream ' TODO globalisieren, so dass es nur eine Instanz davon gibt
    adoStream.CharSet = "UTF-8"
    adoStream.Open
    
    On Error GoTo SomeError
    adoStream.loadFromFile filePath
    result = adoStream.ReadText
    On Error GoTo 0
    
    adoStream.Close
    loadFileAsStringFromUTFEight = result
    Exit Function
    
SomeError:
    adoStream.Close
    ' Error weiterschmeißen
    Err.Raise Err.number, Err.source, Err.Description, Err.HelpFile, Err.HelpContext
End Function


' Throws Exception
Public Function loadTextFileLines(filePath As String) As String()
   
   Dim fileContent As String
   
   ' Throws Exception
   fileContent = loadFileAsString(filePath)
    
    
    Dim tmpStr As String
    tmpStr = replace(fileContent, Chr(13), "")
    'Dim StrArr() As String
    'StrArr = Split(tmpStr, Chr(10))
    
    
    
    Dim splitted() As String
    splitted = Split(tmpStr, Chr(10))
    
'    MsgBox splitted(UBound(splitted))
    
    'Letzte Zeile löschen, wenn sie leer ist
    If splitted(UBound(splitted)) = "" Then
        ReDim Preserve splitted(UBound(splitted) - 1)
    End If
    
    loadTextFileLines = splitted
End Function





' Wenn 'addVarAsKey' true ist, wird die Variable auch als Key verwendet. Somit werden alle gleichen Variablen nur einmal hinzugefügt
Public Function loadTextFileLinesAsCollection(filePath As String, Optional addVarAsKey As Boolean) As collection
    
    Dim lines() As String

    lines = loadTextFileLines(filePath)
    
    Dim coll As New collection
    
    For i = 0 To UBound(lines)
        If addVarAsKey Then
            On Error Resume Next ' Falls der Eintrag schon vorhanden ist
            coll.add lines(i), lines(i)
            On Error GoTo 0
        Else
            coll.add lines(i)
        End If
        
    Next i
    
    Set loadTextFileLinesAsCollection = coll
End Function



' Throws Exception
Public Function saveTextFile(text, path)
    
    'Wurde der Zugriff verweigert, greift eventuell schon ein anderes Programm drauf zu
    On Error GoTo Error
    Open path For Output As #1
        Print #1, text
    Close #1
    On Error GoTo 0
    
    Exit Function
Error:
    If Err.number = 70 Then
        Select Case MsgBox("Der Zugriff auf die Datei '" & path & "' wurde verweigert. Stelle sicher, dass niemand auf diese Datei zugreift." & vbNewLine & vbNewLine & "Fehler:" & Err.Description & ", Fehlernummer:" & Err.number, vbRetryCancel Or vbExclamation, Application.name)
            Case vbRetry
                saveTextFile text, path
                Exit Function
            Case vbCancel
                Globals.endMacro
        End Select
        
    Else
        Err.Raise Err.number, Err.source, Err.Description, Err.HelpFile, Err.HelpContext
    End If
End Function


Public Function saveTextFileUTF8(text As String, path As String)
    Dim s As New ADODB.Stream
    
    Dim objStreamUTF8 As New ADODB.Stream
    Dim objStreamUTF8NoBOM As New ADODB.Stream
    
    With objStreamUTF8
      .CharSet = "UTF-8"
      .Open
      .WriteText text
      .position = 0
      .SaveToFile path, adSaveCreateOverWrite
      .Type = adTypeText
      .position = 3
    End With
    
    With objStreamUTF8NoBOM
      .Type = adTypeBinary
      .Open
      objStreamUTF8.CopyTo objStreamUTF8NoBOM
      .SaveToFile path, adSaveCreateOverWrite
    End With
    
    objStreamUTF8.Close
    objStreamUTF8NoBOM.Close
End Function



Public Function saveCSVStringIntoExcel(csvString As String, filePath As String, Optional delimiter As String = ";")
    Dim xlApp As Object
    Dim xlWB As Object
    Dim xlSheet As Object
    Dim Rows() As String
    Dim cols() As String
    Dim i As Long, j As Long

    ' Excel-Instanz starten
    Set xlApp = CreateObject("Excel.Application")
    xlApp.visible = False
    xlApp.DisplayAlerts = False

    ' Neue Arbeitsmappe und Arbeitsblatt
    Set xlWB = xlApp.Workbooks.add
    Set xlSheet = xlWB.Sheets(1)

    ' Zeilen aufteilen
    Rows = Split(csvString, vbNewLine)

    For r = 0 To UBound(Rows)
        ' Spalten aufteilen
        cols = Split(Rows(r), delimiter)
        For c = 0 To UBound(cols)
            
            ' Link einfügen
            If Globals.startsWith(cols(c), "file:///") Then
                Dim pathWithForeSlashes As String
                pathWithForeSlashes = Globals.addBackslash(cols(c))
                
                Dim pathWithoutFileMarker As String
                pathWithoutFileMarker = replace(pathWithForeSlashes, "file:///", "")
                
                xlSheet.Hyperlinks.add _
                    Anchor:=xlSheet.cells(r + 1, c + 1), _
                    Address:=pathWithForeSlashes, _
                    SubAddress:="", _
                    ScreenTip:=pathWithoutFileMarker, _
                    TextToDisplay:=pathWithoutFileMarker
                    
            ' Normaler Text einfügen
            Else
                xlSheet.cells(r + 1, c + 1).value = Trim(cols(c))
            End If
        Next c
    Next r

    ' Optional: Spaltenbreite automatisch anpassen
    xlSheet.Columns.AutoFit
    
    ' Datei speichern (als Excel-Datei!)
    saveExcelWorkbook xlWB, filePath, 51 ' 51 = xlOpenXMLWorkbook (xlsx)
    
    ' Aufräumen
    xlWB.Close SaveChanges:=False
    xlApp.DisplayAlerts = True
    xlApp.Quit
    Set xlSheet = Nothing
    Set xlWB = Nothing
    Set xlApp = Nothing
End Function


Public Function saveExcelWorkbook(wb As Object, filePath As String, Optional fileFormat As Integer = 51) ' 51 = xlOpenXMLWorkbook (xlsx)
    
    On Error GoTo ErrorHandler
    wb.SaveCopyAs filePath
    wb.Saved = True
    On Error GoTo 0
    
    Exit Function
ErrorHandler:
    If Err.number = 1004 Then
        
        Select Case MsgBox("Der Zugriff auf die Datei '" & filePath & "' wurde verweigert. Stelle sicher, dass niemand auf diese Datei zugreift." & vbNewLine & vbNewLine & "Fehler:" & Err.Description & ", Fehlernummer:" & Err.number, vbRetryCancel Or vbExclamation, Application.name)
            Case vbRetry
                Globals.saveExcelWorkbook wb, filePath, fileFormat
                Exit Function
            Case vbCancel
                wb.Close SaveChanges:=False
                Globals.endMacro
        End Select
    Else
        ' Fehler weiterschmeißen
        Err.Raise Err.number, Err.source, Err.Description, Err.HelpFile, Err.HelpContext
    End If
End Function



Public Function saveCSV(arr As Variant, path As String)
    
    Dim text As String
    
    For x = LBound(arr) To UBound(arr)
        For y = LBound(arr, 2) To UBound(arr, 2)
            text = text & arr(x, y) & IIf(y = UBound(arr, 2), "", ";")
        Next y
        
        If Not x = UBound(arr) Then
            text = text & vbNewLine
        End If
    Next x
    
    saveTextFile text, path
    
End Function





Public Function loadCSVToStringArray( _
    strName As String, _
    Optional rowDelimiter As String = vbCr, _
    Optional columnDelimiter = ";", _
    Optional removeQuotes As Boolean = False _
) As String()

    ' Load a file created by FileToArray into a 2-dimensional array
    ' The file name is specified by strName, and it is exected to exist
    ' in the user's temporary folder. This is a deliberate restriction:
    ' it's always faster to copy remote files to a local drive than to
    ' edit them across the network

    ' RemoveQuotes=TRUE strips out the double-quote marks (Char 34) that
    ' encapsulate strings in most csv files.
    
    ' Die Daten die zurückgegeben werden
    Dim arrData() As String
    
    
    ' Datei laden und in Zeilen trennen
    Dim dataLines() As String
    dataLines = loadTextFileLines(strName)
    
    
    ' Jede Zeile anhand des Trennzeichens 'columnDelimiter' trennen und jede Zeile als String-Array in 'linesSplittedByDelimiter' speichern
    ' Außerdem die maximale Spaltenanzahl finden
    Dim linesSplittedByDelimiter As New collection
    Dim maxColumns As Long
    maxColumns = 0
    Dim maxColumnsArray() As String
    For i = LBound(dataLines) To UBound(dataLines)
        maxColumnsArray = Split(dataLines(i), columnDelimiter)
        
        linesSplittedByDelimiter.add maxColumnsArray
        
        If UBound(maxColumnsArray) > maxColumns Then
            maxColumns = UBound(maxColumnsArray)
        End If
    Next i
    
    ' Rückgabe Array festlegen
    ReDim arrData(UBound(dataLines), maxColumns) As String

    Dim arrTempp2() As String

    For i = LBound(dataLines) To UBound(dataLines)
        
        If Not (dataLines(i) = "" Or dataLines(i) = vbNullString) Then

            arrTempp2 = linesSplittedByDelimiter(i - LBound(dataLines) + 1) ' Arrays sind 0 based und collections 1 based
    
            For j = 0 To UBound(arrTempp2)
                arrData(i, j) = arrTempp2(j)
                'MsgBox "Data I=" & CStr(i) & ", j=" & CStr(j) & ", Data=" & arrTempp2(j)
            Next j
            
        End If
        
       
    Next i
    
    
    Application.StatusBar = "Reading the file... (" & strName & ")"

    If Not removeQuotes Then
        ' objFSO.OpenTextFile(strName, ForReading).ReadAll
        
        'MsgBox "File=" & FileContent
        
        'arrData = Join2d(FileContent, rowDelimiter, columnDelimiter)
        
'        Application.StatusBar = "Reading the file... Done"
    Else
        ' we have to do some allocation here...
        
        Dim strTemp As String
        strTemp = fileSystemObject.OpenTextFile(strName, ForReading).ReadAll
        Application.StatusBar = "Reading the file... Done"

        Application.StatusBar = "Parsing the file..."

        strTemp = replace$(strTemp, Chr(34) & rowDelimiter, rowDelimiter)
        strTemp = replace$(strTemp, rowDelimiter & Chr(34), rowDelimiter)
        strTemp = replace$(strTemp, Chr(34) & columnDelimiter, columnDelimiter)
        strTemp = replace$(strTemp, delimiter & Chr(34), columnDelimiter)

        If Right$(strTemp, Len(strTemp)) = Chr(34) Then
            strTemp = left$(strTemp, Len(strTemp) - 1)
        End If

        If left$(strTemp, 1) = Chr(34) Then
            strTemp = Right$(strTemp, Len(strTemp) - 1)
        End If

        Application.StatusBar = "Parsing the file... Done"
        arrData = Split2d(strTemp, rowDelimiter, columnDelimiter)
        strTemp = ""
    End If

    Application.StatusBar = False

    'Set objFSO = Nothing
    loadCSVToStringArray = arrData
    Erase arrData
End Function






Public Function Split2d(ByRef strInput As String, _
    Optional rowDelimiter As String = vbCr, _
    Optional FieldDelimiter = vbTab, _
    Optional CoerceLowerBound As Long = 0 _
    ) As Variant 'String()

    ' Split up a string into a 2-dimensional array.

    ' Works like VBA.Strings.Split, for a 2-dimensional array.
    ' Check your lower bounds on return: never assume that any array in
    ' VBA is zero-based, even if you've set Option Base 0
    ' If in doubt, coerce the lower bounds to 0 or 1 by setting
    ' CoerceLowerBound
    ' Note that the default delimiters are those inserted into the
    '  string returned by ADODB.Recordset.GetString

    On Error Resume Next

    ' Coding note: we're not doing any string-handling in VBA.Strings -
    ' allocating, deallocating and (especially!) concatenating are SLOW.
    ' We're using the VBA Join & Split functions ONLY. The VBA Join,
    ' Split, & Replace functions are linked directly to fast (by VBA
    ' standards) functions in the native Windows code. Feel free to
    ' optimise further by declaring and using the Kernel string functions
    ' if you want to.

    ' ** THIS CODE IS IN THE PUBLIC DOMAIN **
    '    Nigel Heffernan   Excellerando.Blogspot.com

    Dim i   As Long
    Dim j   As Long

    Dim i_n As Long
    Dim j_n As Long

    Dim i_lBound As Long
    Dim i_uBound As Long
    Dim j_lBound As Long
    Dim j_uBound As Long

    Dim arrTemp1 As Variant
    Dim arrTemp2 As Variant

    arrTemp1 = Split(strInput, rowDelimiter)

    i_lBound = LBound(arrTemp1)
    i_uBound = UBound(arrTemp1)

    If VBA.LenB(arrTemp1(i_uBound)) <= 0 Then
        ' clip out empty last row: a common artifact in data
         'loaded from files with a terminating row delimiter
        i_uBound = i_uBound - 1
    End If

    i = i_lBound
    arrTemp2 = Split(arrTemp1(i), FieldDelimiter)

    j_lBound = LBound(arrTemp2)
    j_uBound = UBound(arrTemp2)



    If VBA.LenB(arrTemp2(j_uBound)) <= 0 Then
     ' ! potential error: first row with an empty last field...
        j_uBound = j_uBound - 1
    End If

    i_n = CoerceLowerBound - i_lBound
    j_n = CoerceLowerBound - j_lBound

    ReDim arrData(i_lBound + i_n To i_uBound + i_n, j_lBound + j_n To j_uBound + j_n)

    ' As we've got the first row already... populate it
    ' here, and start the main loop from lbound+1

    For j = j_lBound To j_uBound
        arrData(i_lBound + i_n, j + j_n) = arrTemp2(j)
    Next j

    For i = i_lBound + 1 To i_uBound Step 1

        arrTemp2 = Split(arrTemp1(i), FieldDelimiter)

        For j = j_lBound To j_uBound Step 1
            arrData(i + i_n, j + j_n) = arrTemp2(j)
        Next j

        Erase arrTemp2

    Next i

    Erase arrTemp1

    Split2d = arrData

End Function






Public Function Join2d(ByRef InputArray As Variant, _
    Optional rowDelimiter As String = vbCr, _
    Optional FieldDelimiter = vbTab, _
    Optional SkipBlankRows As Boolean = False _
    ) As String

    ' Join up a 2-dimensional array into a string. Works like the standard
    '  VBA.Strings.Join, for a 2-dimensional array.
    ' Note that the default delimiters are those inserted into the string
    '  returned by ADODB.Recordset.GetString

    On Error Resume Next

    ' Coding note: we're not doing any string-handling in VBA.Strings -
    ' allocating, deallocating and (especially!) concatenating are SLOW.
    ' We're using the VBA Join & Split functions ONLY. The VBA Join,
    ' Split, & Replace functions are linked directly to fast (by VBA
    ' standards) functions in the native Windows code. Feel free to
    ' optimise further by declaring and using the Kernel string functions
    ' if you want to.

    ' ** THIS CODE IS IN THE PUBLIC DOMAIN **
    '   Nigel Heffernan   Excellerando.Blogspot.com

    Dim i As Long
    Dim j As Long

    Dim i_lBound As Long
    Dim i_uBound As Long
    Dim j_lBound As Long
    Dim j_uBound As Long

    Dim arrTemp1() As String
    Dim arrTemp2() As String

    Dim strBlankRow As String

    i_lBound = LBound(InputArray, 1)
    i_uBound = UBound(InputArray, 1)

    j_lBound = LBound(InputArray, 2)
    j_uBound = UBound(InputArray, 2)

    ReDim arrTemp1(i_lBound To i_uBound)
    ReDim arrTemp2(j_lBound To j_uBound)

    For i = i_lBound To i_uBound

        For j = j_lBound To j_uBound
            arrTemp2(j) = InputArray(i, j)
        Next j

        arrTemp1(i) = Join(arrTemp2, FieldDelimiter)

    Next i

    If SkipBlankRows Then

        If Len(FieldDelimiter) = 1 Then
            strBlankRow = String(j_uBound - j_lBound, FieldDelimiter)
        Else
            For j = j_lBound To j_uBound
                strBlankRow = strBlankRow & FieldDelimiter
            Next j
        End If

        Join2d = replace(Join(arrTemp1, rowDelimiter), strBlankRow, rowDelimiter, "")
        i = Len(strBlankRow & rowDelimiter)

        If left(Join2d, i) = strBlankRow & rowDelimiter Then
            Mid$(Join2d, 1, i) = ""
        End If

    Else

        Join2d = Join(arrTemp1, rowDelimiter)

    End If

    Erase arrTemp1

End Function


Public Function IsProcessRunning(ByVal exeName As String) As Boolean
    Dim svc As Object, col As Object
    Set svc = GetObject("winmgmts:\\.\root\cimv2")
    Set col = svc.ExecQuery("SELECT Name FROM Win32_Process WHERE Name='" & exeName & "'")
    IsProcessRunning = (col.count > 0)
End Function


Public Function WaitForProcessId(ByVal exeName As String, ByVal timeoutSeconds As Long) As Long
    Dim t As Single
    t = timer
    
    Do
        WaitForProcessId = FindProcessIdByExeName(exeName)
        If WaitForProcessId <> 0 Then Exit Function
        
        DoEvents
        Globals.Sleep 200
    Loop While (timer - t) < timeoutSeconds
        
    WaitForProcessId = 0
End Function


Public Function ActivateWindow(ByVal titleStart As String) As Boolean
    On Error Resume Next
    AppActivate titleStart
    ActivateWindow = (Err.number = 0)
    Err.Clear
    On Error GoTo 0
End Function


Public Function ActivateWindowByPid(ByVal pid As Long, ByVal retries As Long) As Boolean
    Dim i As Long
    For i = 1 To retries
        On Error Resume Next
        AppActivate pid
        ActivateWindowByPid = (Err.number = 0)
        Err.Clear
        On Error GoTo 0

        If ActivateWindowByPid Then Exit Function
        Globals.Sleep 250
    Next i
End Function


Public Function FindProcessIdByExeName(ByVal exeName As String) As Long
    On Error GoTo Fail

    Dim svc As Object, col As Object, p As Object
    Set svc = GetObject("winmgmts:\\.\root\cimv2")
    Set col = svc.ExecQuery("SELECT ProcessId FROM Win32_Process WHERE Name='" & replace(exeName, "'", "''") & "'")

    For Each p In col
        FindProcessIdByExeName = CLng(p.ProcessId)
        Exit Function
    Next

Fail:
    FindProcessIdByExeName = 0
End Function


Public Function areLayersHavingShapes(layers As layers) As Boolean
    
    Dim i As Integer
    For i = 1 To layers.count
        Dim currLayer As layer
        Set currLayer = layers(i)
        
        If currLayer.shapes.count > 0 Then
            areLayersHavingShapes = True ' Gefunden!
            Exit Function
        End If
        
        Set currLayer = Nothing
    Next i

End Function









' G R A V U R U
'
' //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


Public Function getDefaultBleedSizeInMM() As Double
    getDefaultBleedSizeInMM = 1.5
End Function


Public Sub TestApplyPhotoGravingEffect()
    If Not ActiveShape Is Nothing Then
        If ActiveShape.Type = cdrBitmapShape Then
            applyPhotoGravingEffect ActiveShape
        End If
    End If
End Sub



' ACHTUNG: Das Bitmap-Shape "photo" kann erneut zu einer Bitmap mit 600 DPI konvertiert werden, wenn es mehr als 600 hat.
' Dadurch ist es aber eine neue Form und die Referenz geht verloren
Public Function applyPhotoGravingEffect(photo As shape) As shape
    
    ' Eine maximale Auflösung von 600 für Fotos erlauben, da sonst die Effekte an ihre Grenzen stoßen bei zu hohen DPI-Bildern
    If photo.bitmap.resolutionX > 600 Then
            
        Dim powerClip As shape
        Set powerClip = photo.powerClipParent
            
        Dim isPowerClip As Boolean
        If Not powerClip Is Nothing Then isPowerClip = True
        
        If isPowerClip Then powerClip.powerClip.EnterEditMode
        Set photo = photo.convertToBitmap(, , , , 600)
        If isPowerClip Then powerClip.powerClip.LeaveEditMode
    End If
    
    
    ' 500, 1, 0
    ' Max: 500 20 255
    Dim sharpenFactor As Double
    sharpenFactor = photo.bitmap.resolutionX / 1000
    
    Dim percentage As Integer: percentage = 500 ' 100 + CInt(400 * sharpenFactor)
    percentage = min(max(percentage, 1), 500)
    
    Dim radius As Integer: radius = CInt(20 * ((sharpenFactor - 1) * 1.2 + 1))
    radius = min(max(radius, 1), 20)
    
    Dim threshold As Integer: threshold = 4 * sharpenFactor
    threshold = min(max(threshold, 0), 255)
    
'    MsgBox "[Globals.applyPhotoGravingEffect] radius=" & radius & ", percentage=" & percentage & ", threshold=" & threshold
    
    photo.bitmap.ApplyBitmapEffect "Unsharp Mask", "UnsharpMaskEffect Radius=" & CStr(radius) & ",Percentage=" & CStr(percentage) & ",Threshold=" & CStr(threshold)
    
    
    Set applyPhotoGravingEffect = photo
End Function




Public Function convertQRCodeToRect(qrCodeShape As shape) As shape
    
    ' Problem:
    ' Nach dem Konvertieren des QR-Codes in Kurven,
    ' sind die Kurven nicht ausgewählt (wie sonst üblich)
    ' Man weiß also nicht, welche Formen jetzt neu sind.
    
    ' Lösung:
    ' Deshalb muss hier manuell geguckt werden welche Formen neu entstanden sind.
    ' Dazu wird geguckt welche Formen vorher da waren
    ' und welche nach dem Konvertieren neu dazu gekommen sind.
    
    Dim parentShapes As shapeRange
    Set parentShapes = Globals.getParentShapes(qrCodeShape).All
    
    Dim parentt As Variant
    
    If qrCodeShape.parentGroup Is Nothing Then
        Set parentt = qrCodeShape.layer
    Else
        Set parentt = qrCodeShape.parentGroup
    End If
    
    
    qrCodeShape.ConvertToCurves
    
    
    
    Dim newParentShapes As shapeRange
    Set newParentShapes = parentt.shapes.All
    
    newParentShapes.RemoveRange parentShapes
    
    
    Dim combinedShape As shape
    Set combinedShape = Globals.weldShapeRange(newParentShapes)
    combinedShape.name = "QR Code"
    
    Set convertQRCodeToRect = combinedShape
End Function



Public Sub TestConvertQRCodeToRect()
    
    If Not ActiveShape Is Nothing Then
        
        convertQRCodeToRect ActiveShape
        
    End If
    
End Sub




' Wenn die Artikelnummer kein '-D1' enthällt, ist es das Hauptprodukt (isProductIDMainDesign = True)
Public Function isProductIDMainDesign(productID As String) As Boolean
    
    ' Da ein Musterdesign auch keine D-Nummer hat, darf es nicht als Main Design gesehen werden
    If isProductIDMasterDesign(productID) Then
        Exit Function ' Return False
    End If
    
    Dim D_OccurenceIndex As Integer
    
    D_OccurenceIndex = InStr(productID, "-D")
    
    If Not D_OccurenceIndex = 0 Then
        If D_OccurenceIndex + 2 <= Len(productID) Then
            Dim designNumber As String
            designNumber = Mid(productID, D_OccurenceIndex + 2, 1)
            
            If IsNumeric(designNumber) Then
                isProductIDMainDesign = False
                Exit Function
            End If
        End If
    End If
    
    isProductIDMainDesign = True
End Function


Public Function isProductIDMasterDesign(productID As String) As Boolean
    isProductIDMasterDesign = productID = MASTER_DESIGN_PRODUCT_ID
End Function


Public Function isRDGWhite(color As color) As Boolean
    isRDGWhite = color.name = "RDG_WHITE"
End Function


Public Function isRDGGloss(color As color) As Boolean
    isRDGGloss = color.name = "RDG_GLOSS"
End Function


Public Function getRGDGloss() As color
    If p_RGD_GlossColor Is Nothing Then
        Set p_RGD_GlossColor = findColorInPalette("RDG_GLOSS", getRolandPalette)
    End If
    
    Set getRGDGloss = p_RGD_GlossColor
End Function


Public Function getRGDWhite() As color
    If p_RGD_WhiteColor Is Nothing Then
        Set p_RGD_WhiteColor = findColorInPalette("RDG_WHITE", getRolandPalette)
    End If
    
    Set getRGDWhite = p_RGD_WhiteColor
End Function


Public Function getPinkColor() As color
    If p_pinkColor Is Nothing Then
        Set p_pinkColor = findColorInPalette("CutContour", getRolandPalette)
    End If
    
    Set getPinkColor = p_pinkColor
End Function


Public Function getRichBlackColor() As color
    Set getRichBlackColor = CreateCMYKColor(60, 40, 40, 100)
End Function

Public Sub TestGetRolandPalette()
    
    Dim palette As palette
    Set palette = getRolandPalette
    
    MsgBox "Palette: " & (Not palette Is Nothing)
    
End Sub

Public Function getRolandPalette() As palette
    
    If p_rolandVersaWorksPalette Is Nothing Then
    
        On Error GoTo PaletteNotFound
        Set p_rolandVersaWorksPalette = Palettes.item("Roland VersaWorks")
        On Error GoTo 0
    End If
    
    Set getRolandPalette = p_rolandVersaWorksPalette

    Exit Function
PaletteNotFound:
    MsgBox "[Globals.getRolandPalette]" & vbNewLine & _
        "Die Palette 'Roland VersaWorks' wurde nicht gefunden. Bitte aktiviere sie im Andockfenster für Paletten. " & vbNewLine & _
        "Paletten allgemein sichtbar machen: Fenster > Andockfenster > Paletten." & vbNewLine & _
        "Roland Palette im Andockfenster: Palettenbibliotheken > Spot > Roland > Roland VersaWorks", vbCritical
    Globals.endMacro
End Function


Public Function findColorInPalette(colorName As String, palette As palette) As color
    
'    MsgBox "findColorInPalette colorName: " & colorName & ", palette: " & palette.name
    
    For i = 1 To palette.colorCount
        
'        MsgBox "Compare " & palette.Colors(i).name
        
        If palette.colors(i).name = colorName Then
            Set findColorInPalette = palette.colors(i)
        End If
        
    Next i
End Function



Public Function isShapeFillRGDWhite(shape As shape) As Boolean

    If shape.CanHaveFill Then
        If shape.fill.Type = cdrUniformFill Then
            isShapeFillRGDWhite = Globals.isRDGWhite(shape.fill.UniformColor)
        End If
    End If
End Function


Public Function createRGD_WhiteShape(shape As shape, Optional quietMode As Boolean, Optional preciseBitmap As Boolean) As shape
    
    Dim result As shape
    
    ' Bei Bitmaps eine Form anhand der Zuschnittskurve machen
    If shape.Type = cdrBitmapShape Then
        
'        Dim preciseBitmap As Boolean
'        preciseBitmap = Globals.isBitmaphavingTransparentPixels(shape.bitmap)
'        preciseBitmap = False ' TODO !!!! Deaktiviert weil 'isBitmaphavingTransparentPixels' noch nicht fertig ist
        
        If preciseBitmap Then
            
            ' Debug
'            Dim StopWatch As New StopWatch
'            StopWatch.startTimer
            
            ' Kopie der Bitmap
            Dim shapeCopy As shape
            Set shapeCopy = Globals.copyPasteShape(shape, True)
            
            ' vv Man könnte meinen, dass wenn man alle Pixel weiß einfärbt, es schneller geht, da Corel nicht für jede Farbe eigene Formen erzeugt, sondern direkt eine Form, weil alles gleichfarben ist.
            ' Das ist aber leider nicht so. Dauert doppelt so lange vv
            '
            ' Weiß einfärben
'            shapeCopy.Style.StringAssign "{""StackedBitmapEffects"":{""BCIEffect"":{""Brightness"":""100"",""Contrast"":""0"",""Intensity"":""0""},""BCIEffect_Z_Index"":""0"",""BCIEffect_Deleted"":""0""}}"
'            Dim lastHighestStaticID As Long
'            lastHighestStaticID = Globals.getHighestShapeStaticIDActiveLayer
'            shapeCopy.FlattenEffects
'            Set shapeCopy = Globals.getNewShapesSinceStaticID(lastHighestStaticID).firstShape
            
            ' Wenn die Bitmap eine zu hohe Auflösung hat, benötigt Corel sehr lange um es zu tracen. Deshalb wird die Bitmap neu gerastert.
            ' Wenn die Bitmap einen Zuschnitt hat, dass soll die BItmap gerastert werden, da Corel dann gerne Verschiebungs-Bugs hat. Außerdem werden nicht sichtbare Pixel abgeschnitten, was das ganze schneller macht
            If shapeCopy.bitmap.resolutionX > 400 Or shapeCopy.bitmap.resolutionY > 400 Or shapeCopy.bitmap.Cropped Then
                Set shapeCopy = shapeCopy.ConvertToBitmapEx(cdrGrayscaleImage, , True, IIf(shapeCopy.bitmap.resolutionX < 300, shapeCopy.bitmap.resolutionX, 300))
            Else
                shapeCopy.bitmap.ConvertTo cdrGrayscaleImage
            End If
            
            
            Dim progress As SubProgress
            Set progress = ProgressBarUserForm.newSubProgress(2)
            
            Dim mergeAdjacentObjectsYourself As Boolean
            
            progress.setDisplayText "Umrandung erstellen..."
            Dim trace As TraceSettings
restartTracing:
            
            Set trace = shapeCopy.bitmap.trace(cdrTraceLogo, 25, 67, cdrColorRGB, cdrCustom, 1, False, False, False)
            Dim tracedShapes As shapeRange
            trace.MergeAdjacentObjects = Not mergeAdjacentObjectsYourself ' Muss gemacht werden, da Corel sonst simple Bilder wie Cliparts als leeres Shape zurückgibt / traced
            Set tracedShapes = trace.finish
            progress.setStepsProgress 1
            
            
            
            'MsgBox "tracedShapes.Count: " & tracedShapes.count
            
            progress.setDisplayText "Formen zusammenfügen..."
            ' Shapes aus der Gruppe holen
            If tracedShapes.count = 1 Then
                If Not tracedShapes.firstShape Is Nothing Then
                    If tracedShapes.firstShape.Type = cdrGroupShape Then
                        Dim tracedGroup As shape
                        Set tracedGroup = tracedShapes.firstShape
                        
                        Set tracedShapes = tracedGroup.shapes.All
                        tracedGroup.Ungroup
                    End If
                End If
            End If
            
            If mergeAdjacentObjectsYourself Then
                Set result = tracedShapes.Combine
            Else
                Set result = Globals.combineShapeRange(tracedShapes, False)
                
                ' Es gibt ein Corel Bug wo nur eine Form mit einem Punkt erstellt wird. Bei simplen Cliparts passiert das
                If result.curve.Nodes.count < 2 Then
                    result.delete
                    ' Neu versuchen mit 'mergeAdjacentObjectsYourself' = True
                    ' Denn genau da schein Corel das Problem zu haben. Nach dem Tracen hat Corel mehrere Formen. Beim Zusammenfügen hat er einen Fehler. Deshalb machen wir das jetzt
                    mergeAdjacentObjectsYourself = True
                    GoTo restartTracing
                End If
            End If
            
            
            ' Kopie löschen
            shapeCopy.delete
            
'            MsgBox "Time: " & StopWatch.stopTimer
            
            progress.setStepsProgress 2
            progress.finishProgress
        Else
            Set result = ActiveLayer.CreateCurve(shape.bitmap.CropEnvelope)
            result.outline.SetNoOutline
            result.fill.ApplyUniformFill CreateRGBColor(0, 0, 0)
        End If
    ElseIf Globals.isUploadBox(shape) Then
        Set result = ActiveLayer.CreateCurve(Globals.getUploadboxBoundingShapeCurve(shape))
        result.fill.ApplyUniformFill CreateRGBColor(0, 0, 0)
        result.outline.Type = cdrNoOutline
    Else
        Set result = Globals.copyPasteShape(shape, False)
    End If


    ' QR-Code zusammen fügen, da es sich anders nicht färben lässt
    If Globals.isQRCode(shape) Then
        Set result = Globals.convertQRCodeToRect(result)
    End If
    
    If Not result Is Nothing Then
        Globals.setShapeColor result, Globals.getRGDWhite, Globals.getRGDWhite, True, True, True, True
        result.name = "RDG_White"
    Else
        If Not quietMode Then MsgBox "Eine weiße Hinterlegung konnte für die Form '" & Globals.getShapeDisplayName(shape) & "' nicht ersttellt werden", vbExclamation
    End If
    
    Set createRGD_WhiteShape = result
End Function




' Testet die unterschiedlichen Vektorisierungs_methoden von Coreldraw und misst deren Geschwindigkeit
Public Sub TestTraceMethodsSpeed()
    
    If Not ActiveShape Is Nothing Then
        
        Dim shape As shape
        Set shape = ActiveShape
        
        Dim StopWatch As New StopWatch
        Dim trace As TraceSettings ' Wird mehrfach verwendet
        
        Dim resultStr As String
        
        For i = 1 To 8
            StopWatch.startTimer
            
            Set trace = shape.bitmap.trace(i, 25, 67, cdrColorRGB, cdrCustom, 1, False, False, False)
            Dim tracedShapes As shapeRange
            Set tracedShapes = trace.finish
            Dim tracedShape As shape
            Set tracedShape = tracedShapes.group
            tracedShape.name = i
            
            resultStr = resultStr & "#" & i & " took " & StopWatch.stopTimer & vbNewLine
        Next i
        
        MsgBox resultStr
        
    End If
    
    
    ' ERGEBNISSE:
    
    'cdrTraceLineArt
    '#1 took 00:00:01:121
    '
    'cdrTraceLogo
    '#2 took 00:00:02:122
    '
    'cdrTraceDetailedLogo
    '#3 took 00:00:02:122
    '
    'cdrTraceClipart
    '#4 took 00:00:01:121
    '
    'cdrTraceLowQualityImage
    '#5 took 00:00:02:122
    '
    'cdrTraceHighQualityImage
    '#6 took 00:00:01:121
    '
    'cdrTraceTechnical
    '#7 took 00:00:04:124
    '
    'cdrTraceLineDrawing
    '#8 took 00:00:05:125
    
End Sub



' ACHTUNG: Diese Methode kann nicht in ProductDesignLayer sein. Denn wenn dort ein Error geschmissen wird, wird direkt dort gemeckert (Auch wenn weiter oben / außerhalb der Klasse Fehler abgefangen werden)
' Diese Methode darf auch nicht in einer Klasse aufgerufen werden. Sonnst passiert das selbe
Public Function warnIfGroundPlateMissing(layer As ProductDesignLayer)
     If layer.getGroundPlate Is Nothing Then
        If layer.isEmptyVariant Then
            
        Else
            Err.Raise vbObjectError + 513, , "[Globals.warnIfGroundPlateMissing] Keine Grundplatte vorhanden"
        End If
        
    End If
End Function



' Da CMYK-Schwarz beim exportieren zu RGB nicht immer 100% schwarz ergibt,
' werden CMYK-Schwarztöne hier zu RGB umgewandelt
Public Function convertCMYKBlackToRGBOfShapeRange(range As shapeRange, recursive As Boolean)
    
    For i = 1 To range.count
        
        If range(i).Type = cdrGroupShape Then
            
            If recursive Then
            
                convertCMYKBlackToRGBOfShapeRange range(i).shapes.All, recursive
            End If
        Else
            convertCMYKBlackToRGB range(i)
        End If
        
    Next i
    
End Function



Public Function convertCMYKBlackToRGB(shape As shape)
    
    If isCMYKBlackOutlineShape(shape) Then
        shape.outline.color = CreateRGBColor(0, 0, 0)
    End If
    
    
    If isCMYKBlackFillShape(shape) Then
        shape.fill.UniformColor = CreateRGBColor(0, 0, 0)
    End If
    
End Function





Public Sub TestMakeShapeBlack()
    If Not ActiveShape Is Nothing Then
        makeShapeBlack ActiveShape, True
    End If
End Sub


' Macht rekursiv alle Shapes schwarz.
' Wird für Gravurprodukte genutzt, dessen Gravurfarbe grau ist aber für die Gravurmaschine in schwarz sein sollen
' Außer rote/pinke Formen und die gelben Uploadboxen für Amazon
'
' A C H T U N G ! ! ! :
'
' Evtl. muss im ProductDesignLayer invalidiert werden, da kopiert gelöscht und ersetzt wird
Public Function makeShapeBlack(shape As shape, Optional alsoBitmaps As Boolean = False)
    
    If shape.Type = cdrGroupShape Then
        For i = 1 To shape.shapes.count
            makeShapeBlack shape.shapes(i), alsoBitmaps
        Next i
    Else
    
        If Not isRedOrPinkShape(shape) And Not isShapeUploadBoxCutShapeForConfiImportShapeType(shape) And Not isViewShape(shape) Then
            Dim shapeWasVisible As Boolean
            shapeWasVisible = shape.visible
            shape.visible = True
        
            If shape.CanHaveFill Then
                If shape.fill.Type = cdrUniformFill Then
                    shape.fill.ApplyUniformFill CreateRGBColor(0, 0, 0)
                End If
            End If
            
            If shape.CanHaveOutline Then
                If shape.outline.Type = cdrOutline Then
                    shape.outline.color = CreateRGBColor(0, 0, 0)
                End If
            End If
            
            If alsoBitmaps And shape.Type = cdrBitmapShape Then
                ' Schwarz färben
                
                ' Shape kopieren und schwarz dort anwenden, da es sich beim originalen Shape nicht rückgängig machen lässt (bei STRG Z)
                ' A C H T U N G ! ! !
                ' Wenn es eine Grundplatte war, die gelöscht wurde, muss im ProductDesignLayer invalidiert werden
                Dim shapeCopy As shape
                Set shapeCopy = Globals.copyPasteShape(shape, True)
                shape.delete
                Set shape = shapeCopy
                
                shape.Style.StringAssign "{""StackedBitmapEffects"":{""BCIEffect"":{""Brightness"":""-100"",""Contrast"":""0"",""Intensity"":""0""},""BCIEffect_Z_Index"":""0"",""BCIEffect_Deleted"":""0""}}"
                
            End If
            
            shape.visible = shapeWasVisible
        End If
    End If
End Function




Public Sub TestRemoveDesignNrFromProductID()
    
    MsgBox removeDesignNrFromProductID("GT-S-30x20-D14")
'    MsgBox removeDesignNrFromProductID("GT-S-30x20")
    
End Sub


Public Function removeDesignNrFromProductID(ByVal productID As String, Optional logger As logger) As String
    
    If Not productID = "" Then
    
        Dim startAndEnd() As Integer
        startAndEnd = searchDesignNrStartAndEndIndex(productID, logger)
        
        If Not startAndEnd(0) = -1 Then
            
            ' -1 Um das D von z.B: "D13" auch mit zu entfernen
            removeDesignNrFromProductID = left(productID, startAndEnd(0) - 2)
            removeDesignNrFromProductID = removeDesignNrFromProductID & Right(productID, Len(productID) - startAndEnd(1) + 1)

            ' Minus von dem "-D13" entfernen
            If Globals.endsWith(removeDesignNrFromProductID, "-") Then
                removeDesignNrFromProductID = left(removeDesignNrFromProductID, Len(removeDesignNrFromProductID) - 1)
            End If
        
        Else
            removeDesignNrFromProductID = productID
        End If
        
    End If
        
End Function



Public Sub TestGetDesignNrFromProductID()
    
    Dim logger As New logger
    logger.init "TestGetDesignNrFromProductID"
    
    'MsgBox "productID: 'BSUV-AD-30x20-D-1-D2-D3' == " & getDesignNrFromProductID("BSUV-AD-30x20-D-1-D2-D3", logger) & " (sollte 2 sein)"
    'MsgBox "productID: 'Design D4 - Foto freigestellt' == " & getDesignNrFromProductID("Design D4 - Foto freigestellt", logger) & " (sollte 4 sein)" ' Version 16.0.11 returnt "frei"
    MsgBox "productID: '25' == " & getDesignNrFromProductID("25", logger) & " (sollte -3 sein)"
    
End Sub


' productID kann "Hallo D32" sein. Aber auch "Hallo Design 32"
' -1 == Freies/Wunschtext Design
' -2 == Masterdesign
' -3 == Keine D-Nummer gefunden
Public Function getDesignNrFromProductID(ByVal productID As String, Optional logger As logger) As Integer
    
    If Not logger Is Nothing Then logger.addTab , "[Globals.getDesignNrFromProductID] productID: '" & productID & "'"
    
    getDesignNrFromProductID = -3
    
    If Not productID = "" Then
        
        If UCase(productID) = Globals.MASTER_DESIGN_PRODUCT_ID Then
            getDesignNrFromProductID = -2
            GoTo ExitFunction
        End If
        
        ' Zuerst versuchen die D-Nummer zu ermitteln. Nicht zuerst nach "frei" im Text suchen. Denn bei "Design D4 - Foto freigestellt" würde sonst zuerst das "frei" gefunden werden und nicht die D-Nummer
        Dim productIDForDNumber As String
        productIDForDNumber = productID
        ' Falls productID keine echte ID ist. Bspw. "Design 32" anstatt "D32", dann ersetzen wir "Design" mit einem "D"
        productIDForDNumber = replace(productIDForDNumber, "Design ", "D")
        productIDForDNumber = replace(productIDForDNumber, "Design", "D")
        
        Dim startAndEnd() As Integer
        startAndEnd = searchDesignNrStartAndEndIndex(productIDForDNumber, logger)
        
        If Not startAndEnd(0) = -1 Then
            getDesignNrFromProductID = Mid(productIDForDNumber, startAndEnd(0), startAndEnd(1) - startAndEnd(0))
        Else
            ' Prüfen, ob das Design ein freies Design ist. Also: "design frei" oder "ohne design" o.Ä.
            If InStr(LCase(productID), "frei") Or LCase(productID) = "ohne design" Or LCase(productID) = "ohne motiv" Or LCase(productID) = "kein motiv" Then
                getDesignNrFromProductID = -1 ' Freies/Wunschtext Design
            End If
        End If
    End If
    
ExitFunction:
    If Not logger Is Nothing Then
        logger.logINFO "Returne: '" & getDesignNrFromProductID & "'"
        logger.removeTab
    End If
    
End Function



Public Sub TestSearchDesignNrStartAndEndIndex()
    
    Dim startAndEnd() As Integer
    
    startAndEnd = searchDesignNrStartAndEndIndex("GT-S-30x20-D14")
    
    MsgBox "Start: " & startAndEnd(0) & ", ende: " & startAndEnd(1)
    
End Sub


Public Function searchDesignNrStartAndEndIndex(productID As String, Optional logger As logger) As Integer()
    
    If Not logger Is Nothing Then logger.addTab , "[Globals.searchDesignNrStartAndEndIndex]"
    
    Dim result() As Integer
    ReDim result(0 To 1)
    result(0) = -1
    result(1) = -1
    
    If Not productID = "" Then
        ' Falls productID eine echte ProductID ist "D32"
        Dim designNameSearchPortion As String
        designNameSearchPortion = productID
        
        ' Mehrfach durchlaufen um ein D zu finden, auf dem eine Nummer folgt: "D3"
        ' "D-3" würde nicht gehen und es würde weiter gesucht werden
        While True
            ' Die erste (linke) Position von einem D finden
            Dim dPos As Integer
            dPos = InStr(designNameSearchPortion, "D")
            
            
            ' Kein D gefunden. Also gibt es auch keine Design Nummer. Abbrechen
            If dPos = 0 Then
                ' Komischerweise kann dieser Fehler nicht abgefangen werden, deshalb wird er nicht genutzt
                'Err.Raise vbObjectError + 513, , "[Globals.getDesignNrFromProductID] Keine Designnummer gefunden! "
'                searchDesignNrStartAndEndIndex = Nothing
                
                If Not logger Is Nothing Then logger.logINFO "Keine dPos gefunden! Abbrechen"
                
                searchDesignNrStartAndEndIndex = result
                Exit Function
            End If
            
            If Not logger Is Nothing Then logger.logINFO "dPos gefunden: " & dPos
            
            ' Restlicher String nach dem D. Das D aber mit inbegriffen
            designNameSearchPortion = Right(designNameSearchPortion, Len(designNameSearchPortion) - dPos) 'dPos
            
            
            If Not logger Is Nothing Then logger.logINFO "designNameSearchPortion: " & designNameSearchPortion
            
            
            Dim numberEnd As Integer
        
            'Designnummer suchen
            numberEnd = getNumberEndIndex(designNameSearchPortion, True, True)
            
            If Not logger Is Nothing Then logger.logINFO "numberEnd: " & numberEnd
            
            If Not numberEnd = -1 Then

                ReDim result(0 To 1)
                result(0) = Len(productID) - Len(designNameSearchPortion) + 1
                result(1) = result(0) + numberEnd
                searchDesignNrStartAndEndIndex = result
                Exit Function
            End If

        Wend
    End If
    
    
    searchDesignNrStartAndEndIndex = result
    If Not logger Is Nothing Then logger.removeTab
End Function



Public Sub TestGetNumberEndIndex()
    MsgBox "Teste '456 789' firstNumber:true == " & getNumberEndIndex("456 789", True) & " (sollte 3 sein)" & vbNewLine & _
        "Teste '456 789' firstNumber:false == " & getNumberEndIndex("456 789", False) & " (sollte 7 sein)" & vbNewLine & _
        "Teste 'Hallo 123 Hallo 123 456' firstNumber:true == " & getNumberEndIndex("Hallo 123 Hallo 123 456", True) & " (sollte 9 sein)" & vbNewLine & _
        "Teste 'Hallo 123 Hallo 123 456' firstNumber:false == " & getNumberEndIndex("Hallo 123 Hallo 123 456", False) & " (sollte 23 sein)"
End Sub

' Gibt zurück, an welcher Position in 'theString' der letzte Index einer Nummer auftaucht.
' Wenn 'firstNumber' true ist, dann wird der letzte Index der ersten Nummer zurückgegeben, ansonsten der letzte Index der letzten Nummer
' Z.B:
' "456 789" und "firstNumber" = true ergibt 3
' "456 789" und "firstNumber" = false ergibt 7
Public Function getNumberEndIndex(theString As String, Optional firstNumber As Boolean = True, Optional hasToStartWithNumber = False) As Integer
    getNumberEndIndex = -1
    
    Dim wasNumeric As Boolean
    
    'Einzelne Ziffern durchgehen
    For i = 1 To Len(theString)
        If IsNumeric(Mid(theString, i, 1)) Then
            getNumberEndIndex = i
            wasNumeric = True
        Else
            If hasToStartWithNumber Then
                Exit Function
            End If
        
            If wasNumeric And firstNumber Then
                Exit Function
            End If
            
        End If
    Next i
End Function



' Gibt zurück, an welcher Position in 'theString' eine Nummer startet.
' Z.B:
' "456" = 1
' "Hallo 123 Hallo 123" = 7
Public Function getNumberStartIndex(theString As String, Optional firstNumber As Boolean = True) As Integer
    getNumberStartIndex = -1
    
    Dim wasNumeric As Boolean
    
    'Einzelne Ziffern durchgehen
    For i = 1 To Len(theString)
        If IsNumeric(Mid(theString, i, 1)) Then
            
            ' Anfang einer Zahl (bzw. Anfangsziffer einer evtl längeren Zahl, z.B. 3 von 36)
            If Not wasNumeric Then
                getNumberStartIndex = i
            End If
            wasNumeric = True
            
            If firstNumber Then
                Exit Function
            End If
        Else
            wasNumeric = False
        End If
    Next i
End Function


Public Function getNumberAtEndOfString(theString As String) As Integer
    Dim regex As RegexMatcher
    Set regex = newRegexMatcher.SetPattern("\d+$").Execute(theString)
    If Not regex.isMatchEmpty Then
        getNumberAtEndOfString = regex.getMatchAsInt
    Else
        getNumberAtEndOfString = -1
    End If
End Function

Public Sub TestgetLastNumberOfString()
    MsgBox "Teste 'Hallo 123' == " & getLastNumberOfString("Hallo 123") & vbNewLine & _
        "Teste 'Hallo 123 456 Hallo' == " & getLastNumberOfString("Hallo 123 456 Hallo")

End Sub

' Gibt die zuletzt vorkommende Zahl in 'theString' zurück
Public Function getLastNumberOfString(theString As String) As Integer
    getLastNumberOfString = -2
    
    
    Dim startt As Integer
    startt = getNumberStartIndex(theString, False)
    If startt = -1 Then
        getLastNumberOfString = -1
        Exit Function
    End If
    
    Dim endd As Integer
    endd = getNumberEndIndex(theString, False)
    If endd = -1 Then
        getLastNumberOfString = -1
        Exit Function
    End If
    
    Dim resultStr As String
    resultStr = Mid(theString, startt, endd - startt + 1)
    
'    MsgBox "resultStr: '" & resultStr & "'"
    
    On Error Resume Next
    getLastNumberOfString = CInt(resultStr)
    On Error GoTo 0
    
End Function





Public Function stringVariantArrayToString(arr As Variant) As String
    
    If Not IsArray(arr) Then
        stringVariantArrayToString = "NotArray"
        Exit Function
    End If
    
    stringVariantArrayToString = "["
    
    If Not isArrayEmpty(arr) Then
        For i = LBound(arr) To UBound(arr)
            stringVariantArrayToString = stringVariantArrayToString & IIf(i = LBound(arr), "", " ,") & arr(i)
        Next i
    End If
    stringVariantArrayToString = stringVariantArrayToString & "]"
    
End Function


Public Function isArrayEmpty(arr As Variant) As Boolean
    
    If IsEmpty(arr) Then
        isArrayEmpty = True
        Exit Function
    End If
    
    On Error GoTo SomeError
    isArrayEmpty = Not IsNumeric(UBound(arr))
    On Error GoTo 0
    
    Exit Function
SomeError:
    isArrayEmpty = True
End Function











Public Function getElementIndexIn2DArrayHeader(elementName As String, arr As Variant, Optional errorMessageWhenNotFound As String) As Integer
    
    For h = 0 To UBound(arr, 2)
        If arr(0, h) = elementName Then
            getElementIndexIn2DArrayHeader = h
            Exit Function
        End If
    Next h
    
    If Not errorMessageWhenNotFound = "" Then
        Err.Raise vbObjectError + 513, , "[Globals.getElementIndexIn2DArrayHeader] " & errorMessageWhenNotFound
    End If
    
    getElementIndexIn2DArrayHeader = -1
End Function


' 'rowIndex' ist die Spalte, also das was von oben nach unten geht
Public Function getElementIndexIn2DArrayRow(elementName As String, arr As Variant, rowIndex As Integer, Optional startColumn As Integer = 0)
    
    Dim c As Integer ' Column
    For c = startColumn To UBound(arr, 1)
        If arr(c, rowIndex) = elementName Then
            getElementIndexIn2DArrayRow = c
            Exit Function
        End If
    Next c
    
    getElementIndexIn2DArrayRow = -1
End Function



Public Function getAmazonProductLink(ASIN As String) As String
    getAmazonProductLink = "https://www.amazon.de/gp/product/" & ASIN
    ' Alternativ
'    getAmazonProductLink = "https://www.amazon.de/dp/" & ASIN
End Function

Public Function openAmazonProductWeb(ASIN As String)
    shell "explorer.exe " & getAmazonProductLink(ASIN)
End Function


Public Sub TestOpenAmazonProductWeb()
    openAmazonProductWeb "B09GS1J4HW"
End Sub


Public Function getAmazonOrderLink(orderID As String) As String
    getAmazonOrderLink = "https://sellercentral.amazon.de/orders-v3/order/" & orderID
End Function

Public Function openAmazonOrderWeb(orderID As String)
    openWebsite getAmazonOrderLink(orderID)
End Function

Public Function openWebsite(website As String)
    shell "explorer.exe " & website
End Function


Public Sub TestOpenAmazonOrderWeb()
    openAmazonOrderWeb "304-0449432-8215505"
End Sub


Public Sub TestOpenAmazonASINLink()
    openAmazonASINLink "B0B8J6K6W4"
End Sub

Public Function openAmazonASINLink(ASIN As String) As String
    shell "explorer.exe " & getAmazonASINLink(ASIN)
End Function

Public Function getAmazonASINLink(ASIN As String) As String
    getAmazonASINLink = "https://www.amazon.de/dp/" & ASIN
End Function


Function isURLValid(url As String) As Boolean
    Dim http As Object
    Dim status As Integer

    On Error Resume Next
    Set http = CreateObject("WinHttp.WinHttpRequest.5.1")

    If Not http Is Nothing Then
        http.Open "GET", url, False
        http.setRequestHeader "User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36"
        http.send
        
        status = http.status
        Set http = Nothing
        
        ' Wenn Status zwischen 200 und 399 liegt, ist die URL gültig
        If status >= 200 And status < 400 Then
            isURLValid = True
        Else
            isURLValid = False
        End If
    Else
        isURLValid = False
    End If
End Function

Sub TestIsURLValid()
    Dim url As String
    url = "https://www.google.com" ' Eine beliebige URL testen
'    url = "Blala ungültiger Link"
    
    If isURLValid(url) Then
        MsgBox "Der Link ist gültig!", vbInformation, "Linkprüfung"
    Else
        MsgBox "Der Link ist ungültig oder nicht erreichbar!", vbExclamation, "Linkprüfung"
    End If
End Sub

' HEY! Listen
Public Function isLink(link As String) As Boolean
    isLink = startsWith(link, "file:///") Or startsWith(link, "https://") Or startsWith(link, "http://")
End Function




Public Sub TestGetDefaultDesignNameFromDesignsFolder()
    MsgBox "getDefaultDesignNameFromDesignsFolder: " & getDefaultDesignNameFromDesignsFolder("V:\Produkte\Türklingel\Funkklingeln\Acryl + Edelstahl\Ausschnitt\Eckig\Blink Kabel 2K+\24x20 (24x18)", Globals.getLogger(True))
End Sub



'Throws Exception
' 'designsFolderPath' ist der Ordner, der Designordner beinhaltet
Public Function getDefaultDesignNameFromDesignsFolder(designsFolderPath As String, Optional logger As logger) As String
    
    If Not logger Is Nothing Then
        logger.logFINE "[Globals.getDefaultDesignNameFromDesignsFolder] designsFolderPath: '" & designsFolderPath & "'"
        logger.addTab
    End If
    
    If Not folderExists(designsFolderPath) Then
        Dim folderDoesNotExistErrorMsg As String
        folderDoesNotExistErrorMsg = "Der Ordner exestiert nicht:" & vbNewLine & designsFolderPath & vbNewLine & vbNewLine & "[Globals.getDefaultDesignNameFromDesignsFolder]"
        If Not logger Is Nothing Then logger.logFATAL folderDoesNotExistErrorMsg
        Err.Raise vbObjectError + 513, , folderDoesNotExistErrorMsg
    End If
    
    ' Prüfen, ob es wirklich ein Ordner mit Designordnern ist
    If Not isFolderDesignsFolder(designsFolderPath, logger) Then
        
        Dim folderIsDesignFolder As Boolean
        folderIsDesignFolder = isFolderDesignFolder(designsFolderPath)
        
        Dim folderIsNotDesignsFolderErrorMsg As String
        folderIsNotDesignsFolderErrorMsg = _
            "Der Ordner ist kein Produktordner mit Designordnern!" & _
            IIf(folderIsDesignFolder, " Er ist selbst ein Designordner.", " Eventuell fehlt noch die Größe.") & _
            vbNewLine & designsFolderPath & vbNewLine & vbNewLine & _
            "[Globals.getDefaultDesignNameFromDesignsFolder]"
            
        If Not logger Is Nothing Then logger.logFATAL folderIsNotDesignsFolderErrorMsg
        Err.Raise vbObjectError + 513, , folderIsNotDesignsFolderErrorMsg
    End If
    


    ' Standartdesign-Name herausfinden (von 'Dein Wunschtext', welches keine D-Nummer hat)
    Dim folders As collection
    Set folders = Globals.getFoldersInFolder(designsFolderPath)
    
    If Not logger Is Nothing Then logger.logFINE "Prüfe alle Unterordner von '" & designsFolderPath & "'"
    For j = 1 To folders.count
        
        Dim folderName As String: folderName = Globals.getFolderName(folders(j))
        
        If Not logger Is Nothing Then logger.logFINE "currentFolder: '" & folders(j) & "', folderName: '" & folderName & "'"
        
        ' Wenn es KEIN Ordner mit "[" ist wie z.B: "[CDR]" und auch NICHT mit dem Zeichen "_" beginnt
        ' = 0 ist das selbe wie Not
        If InStr(folderName, "[") = 0 And Not Globals.startsWith(folderName, "_") And Not folderName = Globals.MASTER_DESIGN_PRODUCT_ID Then
            
            Dim designNr As Integer: designNr = getDesignNrFromProductID(folderName)
            If Not logger Is Nothing Then logger.logFINE "designNr: '" & designNr & "'"
            
            
            If isFolderDesignFolder(folders(j), logger) Then
                Dim productID As New ProductIDObject
                productID.setProductID folderName
                productID.setMainDesign
                getDefaultDesignNameFromDesignsFolder = Globals.getParentPath(folders(j)) & productID.getProductID
                GoTo found
            End If
            
        End If
        
        folderName = ""
    Next j
    
found:
    If getDefaultDesignNameFromDesignsFolder = "" Then
        Dim errorMsg As String
        errorMsg = "Der Ordner des Standartdesigns wurde im folgenden Ordner nicht gefunden: " & designsFolderPath & vbNewLine & "Vielleicht ist noch kein Exportordner im Standartdesignordner vorhanden" & vbNewLine & vbNewLine & _
        "[Globals.getDefaultDesignNameFromDesignsFolder]"
        
        If Not logger Is Nothing Then logger.logFATAL errorMsg
        Err.Raise vbObjectError + 513, , errorMsg
    End If
    
    If Not logger Is Nothing Then logger.removeTab
End Function



Public Function TestIsFolderSizeFolder()
'    MsgBox "isFolderSizeFolder: " & isFolderSizeFolder("Hallo wie gehts dir du 31er") ' False
'    MsgBox "isFolderSizeFolder: " & isFolderSizeFolder("30x20") ' True
    MsgBox "isFolderSizeFolder: " & isFolderSizeFolder("A4") ' True
End Function



Public Function isFolderSizeFolder(folderPath As String) As Boolean
    isFolderSizeFolder = Not Globals.getSizeFromString(folderPath, False, True) = ""
End Function



Public Sub TestFindDefaultDesignFolder()
'    getDefaultDesignNameFromDesignsFolder ("V:\Produkte\Hochzeitsschilder\Oval\Kunststoff\15x8\Weiße Gravur\")
'    getDefaultDesignNameFromDesignsFolder ("V:\Produkte\Grabstecker\Herz-Doppelrahmen\Edelstahl\13x21\[Feste Designs]")
'    MsgBox "getFolderName()=" & getFolderName("V:\Produkte\Grabstecker\Herz-Doppelrahmen\Edelstahl\13x21\[Feste Designs]\GSTH2-V2A-13x21F")
'    MsgBox "getDefaultDesignNameFromDesignsFolder()=" & getDefaultDesignNameFromDesignsFolder("V:\Produkte\Standbilder\Gravur\Standbilder\Acryl\20x14")
'    MsgBox "getDefaultDesignNameFromDesignsFolder()=" & getDefaultDesignNameFromDesignsFolder("V:\Produkte\Türschilder\UV\Rechteckig\Acryl\9x6")
    MsgBox "getDefaultDesignNameFromDesignsFolder()=" & getDefaultDesignNameFromDesignsFolder("V:\Produkte\Anhänger\Tannenbaum Anhänger\UV\Acryl\8x9 - Clipart\Paar - Männer")
End Sub



' Dies Funktion sieht sich die Unterordner vom 'folderPath' an um zu sehen, ob es ein Designordner ist
Public Function isFolderDesignFolder(folderPath As String, Optional logger As logger) As Boolean
    
    If Not Globals.folderExists(folderPath) Then
        Err.Raise vbObjectError + 513, , "[Globals.isFolderDesignFolder] Folgender Ordner exestiert nicht:" & vbNewLine & "'" & folderPath & "'"
    End If
    
    If Not logger Is Nothing Then
        logger.logINFO "[Globals.isFolderDesignFolder] folderPath: '" & folderPath & "'"
        logger.addTab
    End If
    
    ' TODO prüfen, ob der Ordner mit "_" oder "[" anfängt. Denn dann ist es kein Designordner
    
    Dim subFoldersNames As New collection
    Set subFoldersNames = getSubFolderNames(folderPath)
    
    If Not logger Is Nothing Then logger.logFINE "subFoldersNames: " & vbNewLine & Globals.collectionToMultiLineStr(subFoldersNames, "'", "'")
    
    isFolderDesignFolder = _
        (stringCollectionContains(subFoldersNames, "Export", StringEquals) Or _
        stringCollectionContains(subFoldersNames, "ExportConverter", StringEquals) Or _
        stringCollectionContains(subFoldersNames, "FPD", StringEquals) Or _
        stringCollectionContains(subFoldersNames, "FPD_Amazon", StringEquals) Or _
        stringCollectionContains(subFoldersNames, "Produktbilder", StringEquals))
    
    If Not logger Is Nothing Then logger.logINFO "Return '" & isFolderDesignFolder & "'"
    
    If Not logger Is Nothing Then
        logger.removeTab
    End If
    
End Function


Public Sub TestIsFolderDesignsFolder()
    MsgBox "isFolderDesignsFolder: " & isFolderDesignsFolder("V:\Produkte\Gedenkstandbilder\Gravur\Standherzen\Acryl\NEU\26x19")
End Sub



' Gibt zurück, ob der angegebene Ordner ein Ordner mit dem [CDR] und Designordnern ist
Public Function isFolderDesignsFolder(folderPath As String, Optional logger As logger) As Boolean
    
    Dim subFoldersNames As New collection
    Set subFoldersNames = getSubFolderNames(folderPath)
    
    isFolderDesignsFolder = stringCollectionContains(subFoldersNames, "[CDR]", StringEquals)
    
    If Not isFolderDesignsFolder Then
        If stringCollectionContains(subFoldersNames, "CDR", StringInside) Then
            If Not logger Is Nothing Then
                logger.addTab , "[Globals.isFolderDesignsFolder]"
                
                logger.logWARN "Ein CDR Ordner wurde gefunden. Allerdings passen die eckigen Klammern nicht!!!!!!!!!!!!!!!!!!"
                
                logger.removeTab
            End If
        End If
    End If
    
End Function



Public Function getSubFolderNames(folderPath As String) As collection
    
    If Not Globals.folderExists(folderPath) Then
        Err.Raise vbObjectError + 513, , "[Globals.getSubFolderNames] Folgender Ordner exestiert nicht:" & vbNewLine & "'" & folderPath & "'"
    End If
    
    Dim subFolders As collection
    Set subFolders = Globals.getFoldersInFolder(folderPath)
    
    Dim subFoldersNames As New collection
    For i = 1 To subFolders.count
        subFoldersNames.add Globals.getFolderName(subFolders(i))
    Next i
    
    Set getSubFolderNames = subFoldersNames

End Function




' Korrigiert die Gravurfarbe von Texten, Motiven und Gestaltungselementen
' Die Gravurfarbe variiert je nach Grundplatte
' Wenn "color" nicht angegeben wird, wird versucht anhand der Grundplatte die Gravurfarbe zu ermitteln
Public Function correctGravingColor(shape As shape, layer As ProductDesignLayer, Optional color As color)
    
    For i = 1 To shape.shapes.count
        
        Dim currentShape As shape
        Set currentShape = shape.shapes(i)
        
        ' GRUPPE
        If currentShape.Type = cdrGroupShape And Not isGroupHavingToManyShapes(currentShape) Then
            If Globals.isUploadBox(currentShape) Then
                ' Uploadbox
                ' ---------
            Else
                correctGravingColor currentShape, layer, color
            End If
        End If
        
        If Globals.isShapeDesignElement(currentShape) Then
            correctShapeGravingColor currentShape, layer, color
        End If

        Set currentShape = Nothing
    Next i
    
End Function




'Gravurfarben für Texte, Motive & Gestaltungselemente
Public Function correctShapeGravingColor(shape As shape, layer As ProductDesignLayer, Optional color As color)

    If Not layer.getGroundPlate Is Nothing Then
        If layer.isGraving Then
            
            If color Is Nothing Then
                Set color = Globals.getGravingColorForGroundPlate(layer.getGroundPlate)
            End If
            
            If shape.Type = cdrBitmapShape Then
                
            ElseIf shape.Type = cdrTextShape Or shape.Type = cdrCurveShape Or shape.Type = cdrRectangleShape Or shape.Type = cdrEllipseShape Then
                If shape.CanHaveFill Then
                    If shape.fill.Type = cdrUniformFill Then
                        shape.fill.ApplyUniformFill color
                    End If
                End If
                
                If shape.CanHaveOutline Then
                    If shape.outline.Type = cdrOutline Then
                        shape.outline.color = color
                    End If
                End If
            End If
        End If
    End If
End Function




Public Function setShapeRangeColor(range As shapeRange, fillColor As color, outlineColor As color, Optional onlyFillWhenAlreadyFilled As Boolean = False, Optional overwriteFill As Boolean = True, _
        Optional onlySetOutlineWhenAlreadyOutlined As Boolean = False, Optional overwriteOutline As Boolean = True, Optional recursive As Boolean = False)
    
    For i = 1 To range.count
        setShapeColor range(i), fillColor, outlineColor, onlyFillWhenAlreadyFilled, overwriteFill, onlySetOutlineWhenAlreadyOutlined, overwriteOutline, recursive
    Next i
    
End Function




Public Function setShapeColor(shape As shape, Optional fillColor As color = Nothing, Optional outlineColor As color = Nothing, Optional onlyFillWhenAlreadyFilled As Boolean = False, Optional overwriteFill As Boolean = True, _
        Optional onlySetOutlineWhenAlreadyOutlined As Boolean = False, Optional overwriteOutline As Boolean = True, Optional recursive As Boolean = False)
    
    If shape.Type = cdrGroupShape Then
        If recursive Then
            For i = 1 To shape.shapes.count
                setShapeColor shape.shapes(i), fillColor, outlineColor, onlyFillWhenAlreadyFilled, overwriteFill, onlySetOutlineWhenAlreadyOutlined, overwriteOutline, recursive
            Next i
        End If
    Else
    
        ' Füllung färben
        If shape.CanHaveFill And Not fillColor Is Nothing Then
            If IIf(Not shape.fill.Type = cdrNoFill, overwriteFill, Not onlyFillWhenAlreadyFilled) Then
                shape.fill.ApplyUniformFill fillColor
            End If
        End If
        
        ' Umriss färben
        If shape.CanHaveOutline And Not outlineColor Is Nothing Then
            'MsgBox "has Outline: " & (Not Shape.Outline.Type = cdrNoOutline) & ", overwriteOutline: " & overwriteOutline & ", onlySetOutlineWhenAlreadyOutlined: " & onlySetOutlineWhenAlreadyOutlined
        
            If IIf(Not shape.outline.Type = cdrNoOutline, overwriteOutline, Not onlySetOutlineWhenAlreadyOutlined) Then
                shape.outline.color = outlineColor
            End If
        End If
        
    End If
    
End Function



Public Function setShapeOutlineThicknessToHairline(shape As shape, Optional forceOutline As Boolean = True)
    If shape.CanHaveOutline Then
        If shape.outline.Type = cdrNoOutline Then
            If forceOutline Then
                shape.outline.Type = cdrOutline
            End If
        End If
        
        If shape.outline.Type = cdrOutline Then
            shape.outline.width = Globals.getHairlineThickness
        End If
        
    End If
End Function



Public Sub TestSetShapeColor()
    
    If Not ActiveShape Is Nothing Then
        setShapeColor ActiveShape, CreateRGBColor(0, 0, 0), CreateRGBColor(0, 0, 0), True, True, True, True, True
    End If
    
End Sub




Public Sub TestShapeCanHaveFill()
    
    If Not ActiveShape Is Nothing Then
        MsgBox "CanHaveFill: " & ActiveShape.CanHaveFill
    End If
    
End Sub





Public Sub TestInvisibleShapeCanHaveFill()
    
    If Not ActiveShape Is Nothing Then
        
        MsgBox ActiveShape.name & ", CanHaveFill: " & ActiveShape.CanHaveFill
        
        If ActiveShape.Type = cdrGroupShape Then
            
        End If
        
    End If
    
    
End Sub





Public Function correctTextUnicodes(textShape As shape)
    For i = 1 To Len(textShape.text.Story.text)
        Dim char As String: char = Mid(textShape.text.Story.text, i, 1)
        
'        MsgBox "Char=" & char & ", Asc=" & Asc(char) & ", AscW=" & AscW(char)
        
        If Globals.isCharWide(char) Then
'            MsgBox "Wide Char found"
            textShape.text.range(i - 1, i).font = "Segoe UI"
        End If
        
        ' Weiß gefülltes Herz zu normales Herz
        If AscW(char) = -8947 Then
            textShape.text.range(i - 1, i).text = ChrW(9825)
        End If
    Next i
End Function


' Wenn man dem Text in einer Textbox eine Größe zuweist, muss diese in einer bestimmten Range sein, sonst mecker Corel
Public Function isTextBoxTextSizeInAllowedRange(textSize As Double)
    isTextBoxTextSizeInAllowedRange = textSize >= 0.001 And textSize <= 3000
End Function




' Gibt den Layer namens "Ebene 1" zurück
Public Function getLayer1ofDoc(doc As document) As layer
    ' Weil neuerdings (10.5) auch die Desktopebene genutzt wird um Shapes von den Scripten auszuschließen,
    ' ist ActiveDocument.ActiveLayer komischerweise die Desktopebene (Wenn da Formen drauf sind). Von der kann scheinbar nicht exportiert werden.
    ' Deshalb muss hier explizit die zweite Ebene ausgewählt werden (die Erste ist die mit den Hilfslinien)

    ' 2, weil vor "Ebene 1" noch der "Hilfslinien" Layer ist
    Set getLayer1ofDoc = doc.ActivePage.layers(2)
End Function


Public Sub TestGetMasterDesign()
    
    Dim masterDesign As productDesign
    Set masterDesign = getMasterDesign
    
    If Not masterDesign Is Nothing Then
        MsgBox "Musterdesign gefunden!"
    Else
        MsgBox "KEIN Musterdesign gefunden!"
    End If
    
End Sub




Public Sub TestTransferMasterDesignToOthers()

    Dim designs As ProductDesignRange
    Set designs = Globals.getSelectedDesignsOrAllAsRange(onlyValidDesigns:=True, ignoreMasterDesign:=True)
    
    Dim masterDesign As productDesign
    Set masterDesign = transferMasterDesignToDesignsIfFound(designs)
    
    If Not masterDesign Is Nothing Then
'        MsgBox "Kein Musterdesign gefunden!"
    Else
        If masterDesign.masterDesignIsTemporaryLoaded Then
            masterDesign.getDesignShape.delete
        End If
    End If
    
End Sub



Public Function transferMasterDesignToDesignsIfFound(designs As ProductDesignRange, Optional globalExportType As globalExportType, Optional logger As logger, Optional sizeFolder As FSSizeFolder) As productDesign
    
    If Not logger Is Nothing Then
        logger.logINFO "[Globals.transferMasterDesignToDesignsIfFound] sizeFolder: " & (Not sizeFolder Is Nothing)
        logger.addTab
    End If
    
    Dim masterDesign As productDesign
    Set masterDesign = getMasterDesign(sizeFolder)
    
    If Not masterDesign Is Nothing Then
        If Not logger Is Nothing Then logger.logFINE "Musterdesign gefunden!"
        
        For i = 1 To designs.count
            If Not designs.getDesign(i).isMasterDesign Then
                If Not logger Is Nothing Then logger.logFINE "Transferiere masterDesign '" & Globals.getShapeDisplayName(masterDesign.getDesignShape) & "' zu '" & Globals.getShapeDisplayName(designs.getDesign(i).getDesignShape) & "' '" & i & "' von '" & designs.count & "'"
                masterDesign.transferMasterDesignToDesign designs.getDesign(i), logger
            End If
        Next i
    Else
        If Not logger Is Nothing Then logger.logFINE "Kein Musterdesign gefunden!"
    End If
    
    
    If Not globalExportType = NoExportType Then
        ' Formen die nicht gültig sind für den 'globalExportType' löschen
        For i = 1 To designs.count
            Dim currentDes As productDesign
            Set currentDes = designs.getDesign(i)
            
            For j = 1 To currentDes.getLayers.count
                newCustomShapeTypeQuery(currentDes.getLayer2(j).layerShape, InvalidForGlobalExportTypeShapeType).setArgument1(globalExportType).search.delete
                currentDes.invalidateDesign
            Next j
            
            Set currentDes = Nothing
        Next i
    End If
    
    
    Set transferMasterDesignToDesignsIfFound = masterDesign
    If Not logger Is Nothing Then logger.removeTab
End Function





' Sucht nach dem Master Design. Wenn dieser nicht im Dokument gefunden wird, diese CDR aber in einem [CDR] Ordner liegt, dann wird darin nach einer
' CDR mit dem Namen 'Master' gesucht. Diese wird dann hinzugeladen
Public Function getMasterDesign(Optional sizeFolder As FSSizeFolder, Optional markAsTemporaryIfLoaded As Boolean = True) As productDesign
    
    ' Zunächst versuchen das Musterdesign in der jetzigen CDR zu finden
    ' ------------------------------------------------------------
    Dim designs As collection
    Set designs = Globals.getDesignsFromShapes(Globals.getLayer1ofDoc(ActiveDocument).shapes.All, onlyValidDesigns:=True, ignoreMasterDesign:=False)
    
    For i = 1 To designs.count
        If designs(i).isMasterDesign Then
            Set getMasterDesign = designs(i)
            Exit Function
        End If
    Next i
    ' ------------------------------------------------------------
    
    
    ' Masterdesign als CDR suchen ...
    ' ------------------------------------------------------------
    Dim masterDesignFilePath As String
    
    If Not sizeFolder Is Nothing Then
        masterDesignFilePath = sizeFolder.getMasterDesignFilePath
        
    ElseIf Globals.isCDRInsideOfCDRFolder(ActiveDocument) Then
        masterDesignFilePath = ActiveDocument.filePath & "Muster.cdr"
    End If
    
    If Not masterDesignFilePath = "" Then
        
        ' Falls es keine direkte CDR gibt, aber eine Verknüpfung dahin
        If Not Globals.fileExist(masterDesignFilePath) Then
            Dim linkMasterDesignFilePath As String
            linkMasterDesignFilePath = ActiveDocument.filePath & "Muster.lnk"
            
            ' Falls es eine Verknüpfung gibt
            If Globals.fileExist(linkMasterDesignFilePath) Then
                masterDesignFilePath = Globals.getLinkPath(linkMasterDesignFilePath)
                If Not Globals.endsWith(masterDesignFilePath, ".cdr") Then ' Datei muss mit CDR enden
                    masterDesignFilePath = "" ' Pfad Deaktivieren
                End If
            End If
        End If
        
        ' Falls es einen Pfad zur CDR oder einen Pfad von einer Verknüpfung zu einer CDR gibt
        If Globals.fileExist(masterDesignFilePath) Then
            Dim designShape As shape
            Set designShape = Globals.loadCDR(masterDesignFilePath)
            
            If designShape.Type = cdrGroupShape Then
                Dim design As New productDesign
                design.newProductDesign designShape
                
                If design.isValidProductDesign Then
                    design.masterDesignIsTemporaryLoaded = True
                    Set getMasterDesign = design
                    'GoTo Found
                Else
                    Err.Raise vbObjectError + 513, , "[Globals.getMasterDesign] Das Musterdesign ist kein gültiges Design!"
                End If
            Else
                Err.Raise vbObjectError + 513, , "[Globals.getMasterDesign] Das Musterdesign ist keine Gruppe!"
            End If
        End If
    End If
    ' ------------------------------------------------------------
    
    If markAsTemporaryIfLoaded Then
        If Not getMasterDesign Is Nothing Then
            Globals.markShapeAsTemporary getMasterDesign.getDesignShape
        End If
    End If
    
End Function




' Wenn man die CDR in einem [CDR] Ordner liegt und somit die Neue Struktur abbildet, egal ob die echte oder auf dem Desktop
Public Function isCDRInsideOfCDRFolder(doc As document) As Boolean
    isCDRInsideOfCDRFolder = Globals.endsWith(doc.filePath, "[CDR]\")
End Function



' Wenn 'includeTypes' Nothing ist, dann werden alle Varianten Typen kombiniert. Ansonsten nur die aus der Liste
Public Function getCombinedVariantsOfDesigns(designs As collection, Optional includeTypes As collection, Optional allowVariantsWithOneOption As Boolean = False) As VariantArray
    
    Dim VariantArray As New VariantArray
    
    Dim vType As variantType ' Wird mehrfach verwendet
    
    For i = 1 To designs.count
        
        Dim currentDesign As productDesign
        Set currentDesign = designs(i)
        
        ' Varianten aus den Schichten
        ' ---------------------------------
        For l = 1 To currentDesign.getLayers.count
            Dim currentLayer As ProductDesignLayer
            Set currentLayer = currentDesign.getLayers.getLayer(l)
            
            If includeTypes Is Nothing Then
                ' Alle Variantentypen durchlaufen
                For t = 0 To variantType.count - 1
                    vType = t
                    
                    If currentLayer.hasVariantsOfType(vType) Then
'                        Debug.Print "Varianten vom Typ " & vType & " sind " & currentLayer.getVariantsOfType(vType).allVariants.count
                        
                        If IIf(allowVariantsWithOneOption, True, currentLayer.getVariantsOfType(vType).allVariants.count > 1) Then
                            VariantArray.addVariants currentLayer.getVariantsOfType(vType).allVariants
                        End If
                    Else
'                        Debug.Print "Keine Varianten vom Typ " & vType
                    End If
                Next t
            Else
                For t = 1 To includeTypes.count
                    vType = includeTypes(t)
                    
                    If IIf(allowVariantsWithOneOption, True, currentLayer.getVariantsOfType(vType).allVariants.count > 1) Then
                        VariantArray.addVariants currentLayer.getVariantsOfType(vType).allVariants
                    End If
                Next t
            End If
            
            Set currentLayer = Nothing
        Next l
        ' ---------------------------------
        
        
        ' Schichtvarianten
        ' ---------------------------------
        For p = 1 To currentDesign.getPartsCount
            Dim currentPart As ProductDesignPart
            Set currentPart = currentDesign.getPart(p)
            
            VariantArray.addVariants currentPart.getVariantLayersArray.allVariants
            
            Set currentPart = Nothing
        Next p
        ' ---------------------------------
        
        Set currentDesign = Nothing
    Next i
    
    Set getCombinedVariantsOfDesigns = VariantArray
    
End Function


Public Function getCombinedVariantGroupNamesOfDesigns(designs As collection, Optional includeTypes As collection, Optional allowVariantsWithOneOption As Boolean = False) As collection
    
    Dim VariantArray As VariantArray
    Set VariantArray = getCombinedVariantsOfDesigns(designs, includeTypes)
    
    Dim groupNames As New collection
    
    For i = 1 To VariantArray.variantGroups.count
        Dim firstVariantOfGroup As variante
        Set firstVariantOfGroup = VariantArray.getVariantGroup(i).variants.item(1)
        
        groupNames.add firstVariantOfGroup.variantGroupName
        
        Set firstVariantOfGroup = Nothing
    Next i
    
    
    Set getCombinedVariantGroupNamesOfDesigns = groupNames
    
End Function













' S U B S   Z U M   T E S T E N
'
'///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////




Public Sub VisualizeNodeType()
    Globals.endIfNoActiveShape
    
    Dim selectedShape As shape
    Set selectedShape = ActiveShape
    
    Dim crv As curve
    Set crv = Globals.getCurveFromShape(selectedShape, True)
    
    Dim textShapes As New shapeRange
    
    Dim i As Integer
    For i = 1 To crv.subPaths.count
        Dim j As Integer
        For j = 1 To crv.subPaths.item(i).Nodes.count
            Dim currNode As Node
            Set currNode = crv.subPaths.item(i).Nodes.item(j)
            
            Dim textShape As shape
            Set textShape = ActiveLayer.CreateArtisticText(0, 0, "#" & j & ", Typ: " & Globals.getNodeTypeName(currNode.Type))
            textShape.setSize selectedShape.SizeWidth / 3#
            textShape.SetPositionEx cdrCenter, currNode.positionX, currNode.positionY
            
            
            textShapes.add textShape
            
            Set textShape = Nothing
            Set currNode = Nothing
        Next j
    Next i
    
    textShapes.group.name = "Globals.VisualizeNodeType"
    
End Sub




Public Sub VisualizeTextLineRects()
    If Not ActiveShape Is Nothing Then
        If ActiveShape.Type = cdrTextShape Then
            Dim shape As shape: Set shape = ActiveShape
        
            ActiveLayer.CreateRectangle shape.text.Story.TextLineRects.boundingBox.left, shape.text.Story.TextLineRects.boundingBox.top, shape.text.Story.TextLineRects.boundingBox.Right, shape.text.Story.TextLineRects.boundingBox.Bottom
            ActiveShape.name = "TextLineRects.boundingBox"
            For b = 1 To shape.text.Story.TextLineRects.subPaths.count
                ActiveLayer.CreateRectangle shape.text.Story.TextLineRects.subPaths(b).boundingBox.left, shape.text.Story.TextLineRects.subPaths(b).boundingBox.top, shape.text.Story.TextLineRects.subPaths(b).boundingBox.Right, shape.text.Story.TextLineRects.subPaths(b).boundingBox.Bottom
                ActiveShape.name = "TextLineRects.SubPaths(" & CStr(b) & ").BoundingBox"
                ActiveShape.outline.color = CreateRGBColor(200, 225, 255)
            Next b
        End If
    End If
End Sub




Public Sub VisualizeBaseline()
    If Not ActiveShape Is Nothing Then
        If ActiveShape.Type = cdrTextShape Then
            Dim shape As shape: Set shape = ActiveShape
            
            For b = 1 To shape.text.Story.Baselines.subPaths.count
                ActiveLayer.CreateLineSegment shape.text.Story.Baselines.subPaths(b).StartNode.positionX, shape.text.Story.Baselines.subPaths(b).StartNode.positionY, shape.text.Story.Baselines.subPaths(b).EndNode.positionX, shape.text.Story.Baselines.subPaths(b).EndNode.positionY
                ActiveShape.name = "Baselines.SubPaths(" & CStr(b) & ")"
                ActiveShape.outline.color = CreateRGBColor(0, 125, 255)
            Next b
        End If
    End If
End Sub




Public Sub VisualizeTextLineRectsAmazon()
    
    ' Snapshot erstellen, da sich die Asuwahl ändert
    Dim selection As New shapeRange
    Set selection = ActiveSelectionRange
    
    For i = 1 To selection.count
        If selection(i).Type = cdrTextShape Then
            Dim shape As shape: Set shape = selection(i)
            
            
            Dim yPosAndHeight() As Double
            yPosAndHeight = getAmazonTextBoxYPosAndHeight(shape)
            
            Dim amazonRect As shape
            Set amazonRect = ActiveLayer.CreateRectangle2(shape.text.Story.TextLineRects.subPaths.First.boundingBox.left, yPosAndHeight(1), shape.text.Story.TextLineRects.subPaths.First.boundingBox.width, yPosAndHeight(2))
            amazonRect.name = "Amazon TextBox"
            amazonRect.outline.color = CreateRGBColor(255, 175, 0)
            
            Set shape = Nothing
        End If
    Next i
End Sub




' Wenn eine Textbox so klein ist, dass kein Buchstabe dort mehr reinpasst, dann wird TRUE returnt
Public Function isTextboxHavingCompleteOverflow(shape As shape)

    If Not shape.Type = cdrTextShape Then Err.Raise vbObjectError + 513, , "[Globals.isTextFramehavingCompleteOverflow] Shape muss ein TextShape sein"
    If shape.text.IsArtisticText Then Err.Raise vbObjectError + 513, , "[Globals.isTextFramehavingCompleteOverflow] Shape muss eine Textbox sein"
    
    ' Wenn der Text den Rahmen sprengt, also nicht der gesammte Text gerendert werden kann
    If shape.text.Overflow Then
    
        ' Wenn die Anzahl der ungenutzten Frames dieselbe ist wie die der gesammten Frames, heißt das,
        ' dass alle Frames nicht genutzt werden, also nichts gerendert wird und dass die Frames zu klein sind.
        isTextboxHavingCompleteOverflow = shape.text.FramesInLink = shape.text.UnusedFramesInLink
    
    End If
    
End Function




' Amazon berechnet eine andere Textbox als standartmäßig vorgesehen.
' Der Standart ist, dass sich von der Baseline die Breite der Textbox ergibt.
' Die Höhe wird von der Baseline nach oben mit dem 'ascender' zusammen mit dem 'descender' unter der Baseline berechnet.
'
' Amazon macht es anders:
' Es wird der Abstand zwischen Baseline und dem Unterstrich gemessen. (Unterstrich muss erst aktiviert werden um ihn zu sehen)
' Dann wird von der Baseline der Abstand mit ca. 7.79 multipliziert um die obere Höhe zu bekommen.
' Für die Untere wird mit -2.24 multipliziert
Public Function getAmazonTextBoxYPosAndHeight(ByRef textShape As shape) As Double()
    
    ' Wenn es eine Textbox ist, prüfen ob mindestens ein Buchstabe reinpasst und gerendert wird.
    ' Wenn nicht, kann nicht auf die Baseline zugegriffen werden. Corel stürzt ab.
    If Not textShape.text.IsArtisticText Then
        If isTextboxHavingCompleteOverflow(textShape) Then
            Err.Raise vbObjectError + 513, , "[Globals.getAmazonTextBoxYPosAndHeight] Die Textbox ist zu klein. Buchstaben sind nicht sichtbar. Baseline kann nicht berechnet werden!"
        End If
    End If
    
    
    Dim originalBaseLinePos As Double
    originalBaseLinePos = textShape.text.Story.Baselines.subPaths.First.positionY
    
    
    Dim values(2) As Double
    
    If Not textShape.Type = cdrTextShape Then
        Err.Raise vbObjectError + 513, , "[Globals.getAmazonTextBoxYAndHeight] 'textShape' ist nicht vom Typ 'cdrTextShape'"
    End If
    
    Dim textShapeCopy As shape
    Set textShapeCopy = ActiveLayer.CreateArtisticText(0, 0, textShape.text.Story.range(1, 2).text)
    textShapeCopy.text.Story.copyAttributes textShape.text.Story.range(1, 2)
    textShapeCopy.text.Story.text = "A" 'Muss gemacht werden, da Kunden Texte auch mit Leerzeichen beginnen können. Sonst hätte man ein leeres TextShape welches beim Konvertieren zu Kurven weg ist
    
    
    
    Dim textShapeCopyConverted As shape
    Set textShapeCopyConverted = copyPasteShape(textShapeCopy, False)
    textShapeCopyConverted.text.Story.underline = cdrSingleThinFontLine
    textShapeCopyConverted.ConvertToCurves
    
    ' Y Position der Underline
    Dim underlinePosition As Double
    underlinePosition = textShapeCopyConverted.curve.subPaths.Last.positionY - textShapeCopyConverted.curve.subPaths.Last.SizeHeight / 2
    
    ' Y Position der Baseline
    Dim baseLinePosition As Double
    baseLinePosition = textShapeCopy.text.Story.Baselines.subPaths.First.positionY
    
    ' Differenz zwischen Baseline und Underline (Aber positiv, währe eig. negativ)
    Dim difference As Double
    difference = baseLinePosition - underlinePosition
    
    values(1) = originalBaseLinePos + (difference * -2.24)
    
    values(2) = originalBaseLinePos + (difference * 7.79) - values(1)
    
    ' DEBUG Draw
'    ActiveLayer.CreateLineSegment 0, baseLinePosition, 2, baseLinePosition
    
    textShapeCopy.delete
    textShapeCopyConverted.delete
    
    getAmazonTextBoxYPosAndHeight = values
End Function




Public Sub PrintSegmentAndSubPathCount()
    If Not ActiveShape Is Nothing Then
        If ActiveShape.Type = cdrCurveShape Then
            MsgBox "Subpaths: " & ActiveShape.curve.subPaths.count & vbNewLine & "Segments: " & ActiveShape.curve.Segments.count
        End If
    End If
End Sub

Public Sub OutlineThickness()
    
    If Not ActiveShape Is Nothing Then
        If ActiveShape.CanHaveOutline Then
            MsgBox "Thickness=" & ActiveShape.outline.width
            
        End If
    End If
    
End Sub


Public Sub TestGetEffects()
    
    If Not ActiveShape Is Nothing Then
    
        If Not ActiveShape.effects.count = 0 Then
            Dim str As String
            For i = 0 To ActiveShape.effects.count
                str = str & vbNewLine & ActiveShape.effects(i).Type & " - " & Globals.getEffectTypeName(ActiveShape.effects(i).Type)
            Next i
            MsgBox str
        Else
            MsgBox "Keine Effekte"
        End If
    
        
    End If
    
End Sub


Public Sub IsShapeCurveRectangular()
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    MsgBox "Ist rechteckig:" & isShapeCurveRectangle(ActiveShape)
End Sub


Public Sub TestAreShapesBoundingBoxesOverlapping()
    If Not ActiveSelectionRange Is Nothing Then
        If ActiveSelectionRange.count = 2 Then
            MsgBox "Überlappung:" & areRectanglesOverlapping(ActiveSelectionRange.firstShape.boundingBox, ActiveSelectionRange.lastShape.boundingBox)
        End If
    End If
End Sub

'
Sub TestIntersect()
    Dim subtractor As shape: Set subtractor = ActiveLayer.shapes.FindShape("subtractor")
    Dim shapesToSubtract As shapeRange: Set shapesToSubtract = ActiveLayer.shapes.FindShapes("shapeToSubtract")
    
    
    If shapesToSubtract.count = 1 Then
        intersectShapes subtractor, shapesToSubtract.firstShape, True, False
    Else
        intersectShapeWithShapeRange subtractor, shapesToSubtract, True, False
    End If
    
'    MsgBox "shapeToSubtract.name=" & shapeToSubtract.name
    
End Sub


Sub TestSubtract()
    Dim subtractor As shape: Set subtractor = ActiveLayer.shapes.FindShape("subtractor")
    Dim shapeToSubtract As shape: Set shapeToSubtract = ActiveLayer.shapes.FindShape("shapeToSubtract")
    
    Set shapeToSubtract = subtractShape(subtractor, shapeToSubtract, True, False)
    
    MsgBox "shapeToSubtract.name=" & shapeToSubtract.name
    
End Sub


Sub TestFontName()
    MsgBox "Font: " & ActiveShape.text.Story.font
End Sub

Sub TestZipEmptyFolder()
    createFolder (getDesktopPath & "\ZIPTEST\ZIPFOLDER\")
    
    zipFolder (getDesktopPath & "\ZIPTEST\ZIPFOLDER\"), getDesktopPath & "\ZIPTEST\zipped.zip"
End Sub


Sub TestShapeArea()
     If Not ActiveShape Is Nothing Then
            
        MsgBox "Area=" & getAreaOfShape(ActiveShape) & " mm²"
            
    End If
End Sub

' Ja funktioniert. Man kann Nothing zu einer Collection adden
Sub TestAddNothingToCollection()
    Dim col As New collection
    
    For i = 1 To 10
        col.add Nothing
    Next i
    
    col.add "Item 11"
    
End Sub


Sub TestAddSameShapeTwiceToShapeRange()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    Dim shape As shape
    Set shape = ActiveShape
    
    Dim shapeRange As New shapeRange
    shapeRange.add shape
    shapeRange.add shape
    
    ' Es wird '1' angezeigt. Es kann eine Form also nur 1x zu einer ShapeRange hinzugefügt werden
    MsgBox "shapeRange.Count: " & shapeRange.count
    
End Sub


Sub TestSelectMainShape()
    If Not ActiveShape Is Nothing Then
    
        Dim design As New productDesign
        design.newProductDesign ActiveShape
        
        design.getLayer(1, 1).getMainShape.CreateSelection
        
    End If
End Sub


Sub TestDeleteTextOnCurves()

    If Not ActiveShape Is Nothing Then
        
        Dim textOnCurves As shapeRange
        Set textOnCurves = newCustomShapeTypeQuery(ActiveShape, CurveWithText).search
        While textOnCurves.count > 0
            deleteCurveWithText textOnCurves.firstShape
            textOnCurves.Remove (1)
        Wend

    End If
End Sub




' Damit das Löschen von einer Kurve mit einem Text darauf funktioniert, müssen beide ausgewählt werden
Public Function deleteCurveWithText(curve As shape, Optional deleteCurve As Boolean = True)
    Dim curveAndText As New shapeRange
    If deleteCurve Then curveAndText.add curve

    ' Text von der Kurve finden
    ' Per Effekt
    For i = 1 To curve.effects.count
        If curve.effects(i).Type = cdrControlPath Then
            For j = 1 To curve.effects(i).ControlPath.effects.count
                If curve.effects(i).ControlPath.effects(j).Type = cdrTextOnPath Then
                    curveAndText.add curve.effects(i).ControlPath.effects(j).TextOnPath.text
                End If
            Next j
        End If
    Next i

    curveAndText.delete
End Function




Public Sub TestGetVariantNameAndGroupNameOfVariantChildName()
    Dim result() As String
    
    result = getVariantNameAndGroupNameOfVariantChildName("var_Edestahl_Hintergrundplatte(ObenUndUnten)")
'    result = getVariantNameAndGroupNameOfVariantChildName("var_Edestahl(ObenUndUnten)")
    
    MsgBox "TestGetVariantNameAndGroupNameOfVariantChildName 1:" & result(1) & ", 2:" & result(2)
End Sub


' Es wird ein auf 1 basierendes Array zurückgeliefert
' Aus z.B. 'var_edelstahl_hintergrundplatte(obenUndUnten)' wird
' variantGroupName='var_edelstahl_hintergrundplatte' und variantName='obenUndUnten'.
' Der Gruppenname DARF Unterstriche enthalten (Mehrwort-Gruppen). Keyword-Suffixe wie '_locked'
' und ' Ebenen-Name' stehen hinter der schliessenden Klammer bzw. hinter einem Leerzeichen und werden entfernt.
Public Function getVariantNameAndGroupNameOfVariantChildName(ByVal str As String) As String()
    Dim dataa(2) As String
    
    ' Der Teil vor 'var_' wird ignoriert
    Dim aa As String: aa = Right(str, Len(str) + 1 - InStr(str, "var_"))
    aa = Split(aa, " ")(0) 'Hiermit würde 'Ebenen-Name' entfernt, da es nach dem Leerzeichen kommt
    ' Alles nach der schliessenden Klammer abschneiden (dort stehen Keyword-Suffixe wie '_locked').
    ' So bleibt der Gruppenname (der selbst Unterstriche haben darf) vollstaendig erhalten.
    If InStr(aa, ")") > 0 Then aa = left(aa, InStr(aa, ")"))

    ' variantName
    dataa(1) = Mid(aa, InStr(aa, "(") + 1, InStr(aa, ")") - InStr(aa, "(") - 1) 'Wenn hier ein Fehler auftritt, dann vllt. weil kein "(" oder ")" vorhanden ist. Oder weil ein Leerzeichen dazwischen ist (verboten)
    
    ' variantGroupName (inkl. 'var_'-Praefix, kann Unterstriche enthalten)
    dataa(2) = left(aa, InStr(aa, "(") - 1)

    getVariantNameAndGroupNameOfVariantChildName = dataa
End Function



' Extrahiert aus der Variantenmaske den Teil, der zur Variante gehört
' Aus "MainMask[var_befestigung(2-Bohrloecher)]" wird "var_befestigung(2-Bohrloecher)"
Public Function getVariantMaskString(shape As shape) As String
    If Globals.isVariantMask(shape) Then

        Dim variantStr As String
        'variantStr = "var_" & Mid(Shape.name, InStr(Shape.name, "[") + 1, InStr(Shape.name, "]") - 2)
        variantStr = "var_" & Globals.subStrWithStrings(shape.name, "[", "]")
        
        getVariantMaskString = variantStr
    Else
        ' Wenn dieser Fehler auftritt, hilft es vor dem Aufrufen dieser Funktion zu prüfen, ob die Maske eine Variantenmaske ist "Globals.isVariantMask"
        Err.Raise vbObjectError + 513, , "[Globals.getVariantMask] 'Shape' ist keine Variantenmaske: " & shape.name
    End If
End Function



Public Function isShapeRangeHavingMoreThanOneColor(range As shapeRange) As Boolean

    Dim colorCount As Integer
    colorCount = UBound(range.GetColors)
    
    ' -1 Heißt, dass es keine Gruppe ist, also nur 1 Shape
    If Not (colorCount = -1) And colorCount > 1 Then
        isShapeRangeHavingMoreThanOneColor = True
    End If
    
End Function


' Wenn die Childs der Gruppe mehr als eine Farbe nutzen, wird false returnt
Public Function isGroupHavingMoreThanOneColor(group As shape) As Boolean
    
    isGroupHavingMoreThanOneColor = isShapeRangeHavingMoreThanOneColor(group.shapes.All)
    
End Function



Public Sub TestShapeColorCount()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    MsgBox "Colors Count:" & UBound(ActiveShape.shapes.All.GetColors)

End Sub

Sub TestIsGroupHavingMoreThanOneColor()
    If Not ActiveShape Is Nothing Then
        MsgBox "Mehr als eine Farbe: " & isGroupHavingMoreThanOneColor(ActiveShape)
    End If
End Sub



Sub TestFontNotInstalledAlert()

    ActiveLayer.shapes.All.CreateSelection

    Dim shapeRangeFonts As Dictionary
    Set shapeRangeFonts = getShapeRangeFonts(ActiveSelectionRange)
    
    
    Dim dummyTextShape As shape
    Set dummyTextShape = ActiveLayer.CreateArtisticText(0, 0, "DummyText")
    
    For Each key In shapeRangeFonts.keys()
        For j = 1 To fontList.count
            If fontList(j) = shapeRangeFonts(key) Then
                GoTo FoundFont
            End If
        Next j
        MsgBox "Die Schriftart " & shapeRangeFonts(key) & " ist nicht installiert"
FoundFont:
    Next
    
    
    dummyTextShape.delete
    
    MsgBox "Fonts: " & fontList.count
    
'
'    subtractDictionaries shapeRangeFonts, fontListToDictionary
'
'
'    MsgBox "Fehlende Fonts: " & dictionaryToMiltilineString(shapeRangeFonts)
    
'    MsgBox dictionaryToMultilineString(fontListToDictionary)
    
End Sub


Public Function fontListToDictionary() As Dictionary
    Set fontListToDictionary = New Dictionary
    
    
    For i = 1 To fontList.count
        fontListToDictionary.add fontList(i), fontList(i)
    Next i
End Function


Public Sub TestFontListCount()
    MsgBox fontList.count
End Sub


Public Function subtractDictionaries(source As Dictionary, subtract As Dictionary)
    For Each key In subtract.keys()
        On Error Resume Next
        source.Remove key
        On Error GoTo 0
    Next
End Function


Public Function dictionaryToMultilineString(dict As Dictionary) As String
    
    dictionaryToMultilineString = ""
    
     For Each key In dict.keys()
        dictionaryToMultilineString = dictionaryToMultilineString & dict(key) & vbNewLine
     Next
    
End Function


' Rekursive Funktion, die ein Dictionary in einen String ausgibt
Public Function dictionaryToString(ByVal dict As Object, Optional ByVal level As Long = 0) As String
    Dim key As Variant
    Dim Indent As String
    Dim result As String
    
    Indent = String(level * 2, " ")
    
    For Each key In dict.keys
        If IsObject(dict(key)) Then
            ' Rekursiv ins Dictionary
            If TypeName(dict(key)) = "Dictionary" Then
                result = result & Indent & key & " (Dictionary):" & vbCrLf
                result = result & dictionaryToString(dict(key), level + 1)
            Else
                result = result & Indent & key & " (Object: " & TypeName(dict(key)) & ")" & vbCrLf
            End If
        Else
            ' Wert-Typen prüfen
            Select Case VarType(dict(key))
                Case vbString, vbInteger, vbLong, vbSingle, vbDouble, vbCurrency, vbBoolean, vbDate
                    result = result & Indent & key & " = " & CStr(dict(key)) & vbCrLf
                Case vbNull
                    result = result & Indent & key & " = Null" & vbCrLf
                Case vbEmpty
                    result = result & Indent & key & " = Empty" & vbCrLf
                Case vbError
                    result = result & Indent & key & " = Error" & vbCrLf
                Case Else
                    result = result & Indent & key & " (Unbekannter Typ: " & VarType(dict(key)) & ", TypName: " & TypeName(dict(key)) & ")" & vbCrLf
            End Select
        End If
    Next key
    
    dictionaryToString = result
End Function


Public Function getShapeRangeFonts(shapeRange As shapeRange) As Dictionary
    Set getShapeRangeFonts = New Dictionary

    For i = 1 To shapeRange.count
        Set getShapeRangeFonts = combineDictionary(getShapeFonts(shapeRange(i)), getShapeRangeFonts)
    Next i

End Function

Public Function getShapeFonts(shape As shape, Optional fontList As Dictionary) As Dictionary

    If fontList Is Nothing Then
        Set fontList = New Dictionary
    End If

    If shape.Type = cdrGroupShape Then
        For i = 1 To shape.shapes.count
            Set fontList = combineDictionary(getShapeFonts(shape.shapes(i)), fontList)
        Next i
    ElseIf shape.Type = cdrTextShape Then

        fontList.add shape.text.Story.font, shape.text.Story.font
        
    End If

    Set getShapeFonts = fontList
End Function




Public Function combineDictionary(dict1 As Dictionary, dict2 As Dictionary) As Dictionary
    Set combineDictionary = New Dictionary
    
    For Each key In dict1.keys()
        combineDictionary.add key, dict1(key)
    Next
    
    For Each key In dict2.keys()
        On Error Resume Next ' Die zweite Liste könnte Elemente wie in der ersten enthalten. Wenn ja, überspringen (ansonsten kommt eine Fehlermeldung)
        combineDictionary.add key, dict2(key)
        On Error GoTo 0
    Next

End Function



Public Function getMainShapeAddModeName(addMode As MainShapeAddMode)
    
    Dim result As String
    
    Select Case addMode
        Case MainShapeAddMode.AddNewMainShapesToExisting
            result = "Hauptformen hinzufügen"
            
        Case MainShapeAddMode.AutoSenseNewMainShapes
            result = "Automatisch"
            
        Case MainShapeAddMode.CreateNewLayerOfNewMainShapes
            result = "Neuer Layer"
            
        Case MainShapeAddMode.DeleteNewMainShapes
            result = "Hauptformen nicht hinzufügen"
            
        Case MainShapeAddMode.OverrideNewMainShapesWithExisting
            result = "Hauptformen überschreiben"
    End Select
    
    getMainShapeAddModeName = result
End Function



Public Function getRealFontSize(textShape As shape) As Double
    getRealFontSize = getRealFontSizeOfTextRange(textShape.text.Story)
End Function

' Ermittelt die Schriftgröße einer Text-Form.
' Kompensiert den Bug, dass Corel bei Vorhanden sein mancher Sonderzeichen (Kreuz bspw.) eine Schriftgröße nahe 0 zurückgibt
' C# TODO: Direkt in CTextRange.size wrappen/übernehmen
Private Function getRealFontSizeOfTextRange(range As textRange) As Double
    
    Dim result As Double
    
    ' Optimalfall: Text-Form liefert richtige Größe
    ' Fehler: Text-Form liefert sehr kleine Zahl, nahe 0
    If Not Globals.round(range.size) = 0 Then
        result = range.size
    Else
        ' Text-Range hat vmtl. ein Sonderzeichen, was ein Bug verursacht.
        ' Deshalb wird jetzt nach einem Zeichen gesucht, welches die echte Größe ausgibt
        If Not range.Characters.count = 1 Then
            Dim i As Integer
            For i = 1 To range.Characters.count
                result = getRealFontSizeOfTextRange(range.range(i, i))
                
                ' Zeichen gefunden, welches die richtige Größe rausgibt
                ' Wenn nicht, dann sind wir vmtl. genau bei dem Sonderzeichen, welches Probleme macht
                If Not Globals.round(range.size) = 0 Then GoTo ReturnResult
            Next i
        End If
        
    End If
    
ReturnResult:
    getRealFontSizeOfTextRange = result
End Function


Public Sub TestHasEllipseSubPath()
    
    If Not ActiveShape Is Nothing Then
        
        'isSubPathEllipse
        If Not ActiveShape.DisplayCurve Is Nothing Then
            For i = 1 To ActiveShape.DisplayCurve.subPaths.count
                If isSubPathEllipse(ActiveShape.DisplayCurve.subPaths(i)) Then
                    MsgBox "Shape hat eine Ellipse als Subpath"
                    Exit Sub
                End If
            Next i
        End If
        
    End If
    
End Sub


Public Sub TestTwoShapeCurvesOverlap()

    If ActiveSelectionRange.count = 2 Then
        
        Dim shapeA As shape
        Set shapeA = ActiveSelectionRange.firstShape
        
        Dim shapeB As shape
        Set shapeB = ActiveSelectionRange.lastShape
        
        MsgBox "Überlappung: " & shapeA.DisplayCurve.IntersectsWith(shapeB.DisplayCurve)
        
        
    Else
        MsgBox "Es müssen 2 Shapes ausgewählt sein"
    End If

End Sub


Public Sub TestDocumentUnit()
    
    If Not ActiveDocument Is Nothing Then
        
        MsgBox "Unit: " & getUnitName(ActiveDocument.unit) & ", #" & ActiveDocument.unit & ", horizontale Lineal Unit: " & getUnitName(ActiveDocument.Rulers.HUnits)
        
    Else
        MsgBox "Kein Dokument geöffnet!"
    End If
    
End Sub



Public Sub TestDesignNeedsCutBevoreExport2()
    
    If Not ActiveShape Is Nothing Then
        If ActiveShape.Type = cdrGroupShape Then
            Dim design As New productDesign
            design.newProductDesign ActiveShape
            
            Dim resultString As String
            
            For i = 1 To design.getLayers.count
                resultString = resultString & vbNewLine & "Layer " & i & ": " & design.getLayers.getLayer(i).needsCutBevoreExport2
            Next i
            
            MsgBox resultString
        End If
            
        
    End If
End Sub


Public Sub TestHideShape()
    If Not ActiveShape Is Nothing Then
        ActiveShape.visible = False
    End If
End Sub


Public Sub TestGetScriptFolder()
    MsgBox "Folder: " & CorelScriptTools.GetScriptFolder
End Sub



Public Sub TestShapeRangeLogic()
    
    If ActiveDocument.name = "TestShapeRangeLogic.cdr" Then
        
        Dim group As shape
        Set group = ActiveLayer.shapes.First
        
        Dim rectangle As shape
        Set rectangle = group.shapes.FindShape("Rechteck1")
        
        Dim circlee As shape
        Set circlee = group.shapes.FindShape("Ellipse1")
        
        
        Dim range As New shapeRange
        range.add group
        range.RemoveRange Globals.shapeToShapeRange(circlee)
        
        MsgBox "Added group to range and removed circle: " & vbNewLine & Globals.getShapeRangeDisplayNames(range)
        
    Else
        MsgBox "Falsches Dokument. Benötigt wird 'TestShapeRangeLogic.cdr' nicht '" & ActiveDocument.name & "'"
    End If
    
End Sub



Public Sub TestUngroupAll()
    
    If Not ActiveShape Is Nothing Then
        
        ' Entgruppiert nur alle Gruppen innerhalb von "ActiveShape".
        ' "ActiveShape" selbst wird aber nicht entgruppiert
        ActiveShape.shapes.All.UngroupAll
        
    End If
    
End Sub



Public Sub TestEnsureShapeHasCurve()
    
    If Not ActiveShape Is Nothing Then
        
        MsgBox "" & Globals.getShapeTypeNameByShape(ActiveShape)
        
        ensureShapeHasCurve ActiveShape
        
        MsgBox "IsClockwise: " & ActiveShape.curve.IsClockwise
        
    End If
    
End Sub




Public Sub RefreshObjectManagerDocker()
    openCloseObjectManagerDocker
End Sub

Public Function openCloseObjectManagerDocker()
    
    ' GUID's lassen sich hier finden: C:\Program Files\Corel\CorelDRAW Graphics Suite 2020\Draw\UIConfig\DrawUI.xml
    ' Gefunden mit dem String "ObjectManagerDocker"
    Dim dockerID As String
    dockerID = "174b4265-e813-4427-a8ce-5eb17b327888"
    
    If Application.frameWork.IsDockerVisible(dockerID) Then
        Application.frameWork.HideDocker dockerID
        Application.frameWork.ShowDocker dockerID
    End If

End Function




Sub TestSaveUmlaute()
    
    Dim fsT As New ADODB.Stream
    fsT.Type = 2 'Specify stream type - we want To save text/string data.
    fsT.CharSet = "windows-1252" 'Specify charset For the source text data.
    fsT.Open 'Open the stream And write binary data To the object
    fsT.WriteText "Hallo ä"
    fsT.SaveToFile Globals.getDesktopPath & "\UmlauteTest.txt", 2 'Save binary data To disk
    
End Sub



Public Sub TestErrorHandling()
    
    On Error GoTo ErrorHandle
    TestErrorHandlingFunction
    On Error GoTo 0
    
    MsgBox "Kein Fehler aufgetaucht"
    Exit Sub
ErrorHandle:
    MsgBox Err.Description
End Sub


Private Function TestErrorHandlingFunction()
    
    Dim intt As Integer
    
    On Error GoTo ErrorHandle2
    intt = 1
    On Error GoTo 0
    
    
    ' ERROR
    intt = 1 / 0
    
    
    Exit Function
ErrorHandle2:
    Err.Raise Err.number, Err.source, Err.Description, Err.HelpFile, Err.HelpContext
End Function



Public Sub TestDateAndTime()
    
    MsgBox Format(Date, "yyyy-mm-dd") & "--" & Format(Time, "hh-mm-ss-ms")
    'MsgBox Date
    
End Sub


Public Sub TestSubPathBiggestPath()
    
    If Not ActiveShape Is Nothing Then
        If isVectorShape(ActiveShape) Then
            
            For i = 1 To ActiveShape.curve.subPaths.count
                MsgBox "SubPath #" & i & " Nodes: " & ActiveShape.curve.subPaths(i).Nodes.count & ", biggest: " & (getBiggestSubPathIndex(ActiveShape.curve.subPaths) = i)
            Next i
            
            
        End If
    End If

End Sub


Public Sub TestSubPathCountPrint()
    
    If Not ActiveShape Is Nothing Then
         If isVectorShape(ActiveShape) Then
            MsgBox "SubPaths: " & ActiveShape.DisplayCurve.subPaths.count
         End If
         
    End If
End Sub


Public Sub ForBug()
    
    Dim arr() As String
    ReDim arr(2 To 4)
    
    For i = 1 To 5
        Dim a As String
        ' Fehler i=1 array fängt aber bei 2 an
        a = arr(i)
        
        Dim b As String
        ' Fehler
        b = a
    Next i
    
    
End Sub


Public Sub TestCreateContour()
    
    If Not ActiveShape Is Nothing Then
        
        Dim shape As shape
        Set shape = ActiveShape
        
        Dim effect As effect
        Set effect = shape.CreateContour(cdrContourInside, ActiveDocument.ToUnits(1, cdrMillimeter))
        
        Dim range As shapeRange
        Set range = effect.Separate
        
        ' Wenn die Range nichts ist, dann war der Abstand nach innen zu groß, so dass keine Form erstellt werden konnte
        If range Is Nothing Then
            MsgBox "Offset nach innen zu groß"
        Else
            range.RemoveRange Globals.shapeToShapeRange(shape)
            range.firstShape.name = "Contour"
            MsgBox Globals.shapeRangeToString(range)
        End If
        
    End If
    
End Sub



Public Sub TestShapeFX()
    
    If Not ActiveShape Is Nothing Then
    
        For i = 1 To ActiveShape.effects.count
            MsgBox "FX #" & i & " type: " & ActiveShape.effects.item(i).Type
        Next i
    Else
        MsgBox "Keine Form ausgewählt"
    End If
    
End Sub


Public Sub TestDebugPrint()
    
    Debug.Print "Application.GMSManager.UserGMSPath: " & Application.GMSManager.UserGMSPath
    
End Sub


Public Sub TestLongTaskProgressBar()
    
    ProgressBarUserForm.Start
    
    Globals.Sleep 5000
    
    ProgressBarUserForm.setProgress 0.5
    
    Globals.Sleep 5000
    
    ProgressBarUserForm.setProgress 1
    
    ProgressBarUserForm.Hide
    
End Sub


Public Sub VisualizeCurveSubPathIndexies()
    
    Globals.warnIfNoDocumentAndEnd
    
    Globals.warnIfNoActiveShapeAndEnd
    
    If ActiveShape.Type = cdrCurveShape Then
        
        Dim shape As shape
        Set shape = ActiveShape
        
        Dim textShapes As New shapeRange
        
        For i = 1 To shape.curve.subPaths.count
            Dim boundingBox As rect
            Set boundingBox = shape.curve.subPaths(i).boundingBox
            
            If boundingBox.width = 0 Then
                boundingBox.SetRect boundingBox.x - 0.5, boundingBox.y, 1, boundingBox.height
            End If
            If boundingBox.height = 0 Then
                boundingBox.SetRect boundingBox.x, boundingBox.y - 0.5, boundingBox.width, 1
            End If
            
            Dim rotate As Boolean
            If boundingBox.height > boundingBox.width Then
                boundingBox.SetRect boundingBox.centerX - (boundingBox.height / 2), boundingBox.centerY - (boundingBox.width / 2), boundingBox.height, boundingBox.width
                rotate = True
            End If
            
            ActiveLayer.CreateParagraphText boundingBox.left, boundingBox.top, boundingBox.Right, boundingBox.Bottom, i
            Dim textShape As shape
            Set textShape = ActiveShape
            textShape.text.Frame.VerticalAlignment = cdrCenterJustify
            textShape.text.Story.alignment = cdrCenterAlignment
            textShape.text.FitTextToFrame
            
            textShape.fill.ApplyUniformFill CreateColor("#00FFFF")
            
            If rotate Then
                ActiveShape.rotate -90
            End If
            
            rotate = False
            
            textShapes.add textShape
            
            Set textShape = Nothing
        Next i
        
        Dim grouped As shape
        Set grouped = textShapes.group
        
        grouped.CreateSelection
        
        Set grouped = Nothing
    Else
        MsgBox "Bitte wähle ein Curveshape aus"
    End If
    
End Sub


Public Sub VisualizeCurveSegments()
    
    If Not ActiveShape Is Nothing Then
        
        If ActiveShape.Type = cdrCurveShape Then
        
            Dim shape As shape
            Set shape = ActiveShape
            
            For i = 1 To shape.curve.Segments.count
                Dim boundingBox As rect
                Set boundingBox = shape.curve.Segments(i).boundingBox
                
                If boundingBox.width = 0 Then
                    boundingBox.SetRect boundingBox.x - 0.5, boundingBox.y, 1, boundingBox.height
                End If
                If boundingBox.height = 0 Then
                    boundingBox.SetRect boundingBox.x, boundingBox.y - 0.5, boundingBox.width, 1
                End If
                
                Dim rotate As Boolean
                If boundingBox.height > boundingBox.width Then
                    boundingBox.SetRect boundingBox.centerX - (boundingBox.height / 2), boundingBox.centerY - (boundingBox.width / 2), boundingBox.height, boundingBox.width
                    rotate = True
                End If
                
                ActiveLayer.CreateParagraphText boundingBox.left, boundingBox.top, boundingBox.Right, boundingBox.Bottom, "Segment " & i
                ActiveShape.text.FitTextToFrame
                
                If rotate Then
                    ActiveShape.rotate -90
                End If
                
                rotate = False
            Next i
            
            
        Else
            MsgBox "Bitte wähle ein Curveshape aus"
        End If
        
    End If
    
End Sub




Public Sub makePSVisible()
    
    Dim ps As Photoshop.Application
    Set ps = startPhotoshop
    ps.visible = True
    
End Sub


' ACHTUNG: 'As Photoshop.Application' darf vv hier nicht stehen. Denn es gibt Computer in der Firma ohne Photoshop.
' Diese Funktion wird zwar nicht ausgeführt, doch beim ausführen einer anderen Funktion werden wohl alle Funktionen initialisiert.
' Wenn dann 'Photoshop.Application' ein unbekanntes Objekt ist, wird keine Funktion mehr ausgeführt. Es gibt auch keine Fehlermeldung
Public Function startPhotoshop() ' As Photoshop.Application
    
    Dim ps 'As Photoshop.Application <- Typen unverträglich Error ?!?!
    
    'Create a new instance of Photoshop application and make it visible.
    On Error GoTo PSError
    Set ps = New Photoshop.Application
    If ps Is Nothing Then
        Err.Raise vbObjectError + 513, , "[Globals.startPhotoshop] Photoshop ist 'Nothing'"
    End If
    On Error GoTo 0
    
    Set startPhotoshop = ps
    Exit Function
PSError:
    MsgBox "Photoshop konnte nicht gestartet oder erreicht werden!" & vbNewLine & _
        "Schließe Photoshop bevor du dieses Skript startest, wenn das Problem weiterhin besteht" & vbNewLine & _
        "Fehler: " & Err.Description & ", Code: " & Err.number, vbCritical
    Globals.endMacro
End Function




Public Sub TestSelectWhiteFilledShapes()
    
    Globals.warnIfNoDocumentAndEnd
    
    If ActiveShape Is Nothing Then
        MsgBox "Keine Form ausgewählt"
        Exit Sub
    End If
    
    
    
    Dim selectedShape As shape
    Set selectedShape = ActiveShape
    
    If selectedShape.Type = cdrGroupShape Then
        
        Dim whiteFillShapes As shapeRange
        Set whiteFillShapes = selectedShape.shapes.FindShapes(Query:="@fill.color.rgb[.r=255 and .g=255 and .b=255]")
        whiteFillShapes.AddRange selectedShape.shapes.FindShapes(Query:="@fill.color.cmyk[.c=0 and .m=0 and .y=0 and .k=0]")
        
        whiteFillShapes.CreateSelection
        
    End If
    
    
End Sub



Public Sub TestIfTextIsHavingMultipleColors()
    
    Globals.warnIfNoDocumentAndEnd
    
    If ActiveShape Is Nothing Then
        MsgBox "Keine Form ausgewählt"
        Exit Sub
    End If
    
    Dim selectedShape As shape
    Set selectedShape = ActiveShape
    
    If selectedShape.Type = cdrTextShape Then
        
        Dim firstColor As color
        Set firstColor = selectedShape.text.Story.range(1, 2).fill.UniformColor
        
        For i = 2 To selectedShape.text.Story.Length
            If Not firstColor.IsSame(selectedShape.text.Story.range(i, i + 1).fill.UniformColor) Then
                MsgBox "Das zeichen '" & selectedShape.text.Story.range(i, i + 1).text & "' #" & i & " weicht farblich ab!" & vbNewLine & "Farbe vom ersten Zeichen: " & firstColor.HexValue & vbNewLine & "Farbe vom jetzigen Zeichen: " & selectedShape.text.Story.range(i, i + 1).fill.UniformColor.HexValue
            End If
        Next i
        
        Set firstColor = Nothing
    End If
    
End Sub


Public Sub TestShapeFillColor()
    
    Globals.warnIfNoDocumentAndEnd
    
    If ActiveShape Is Nothing Then
        MsgBox "Keine Form ausgewählt"
        Exit Sub
    End If
    
    If ActiveShape.CanHaveFill Then
        
        MsgBox "Color: " & ActiveShape.fill.UniformColor.toString
        
    End If
    
    
End Sub


Public Sub TestShapeFillType()
    Globals.warnIfNoDocumentAndEnd
    
    If ActiveShape Is Nothing Then
        MsgBox "Keine Form ausgewählt"
        Exit Sub
    End If
    
    If ActiveShape.CanHaveFill Then
        MsgBox "Filltype: " & ActiveShape.fill.Type
    Else
        MsgBox "Keine Füllung vorhanden!"
    End If
    
End Sub


Public Sub TestIsShapeFillColorCMYKWhite()
    
    Globals.warnIfNoDocumentAndEnd
    
    If ActiveShape Is Nothing Then
        MsgBox "Keine Form ausgewählt"
        Exit Sub
    End If
    
    
    If ActiveShape.CanHaveFill Then
        
        MsgBox "IsSHapeFillColorCMYKWhite: " & ActiveShape.fill.UniformColor.IsSame(CreateCMYKColor(0, 0, 0, 0))
        
    End If
    
End Sub


Public Sub TestShapeParentGroup()
    If Not ActiveShape Is Nothing Then
        MsgBox "Parentgroup: " & (Not ActiveShape.parentGroup Is Nothing)
    End If
End Sub


Public Function TestGetFontName()
    Dim path As String
    path = CorelScriptTools.GetFileBox("TTF|*.ttf|OTF|*.otf|FON|*.fon|TTC|*.ttc", "Bitte wähle eine True-Type-Font-Datei aus", , , , Globals.getDesktopPath)
    
    If Not path = "" Then
        MsgBox "Font Name: " & getFontName(path)
    End If
    
End Function


Public Function getFontName(filePath As String) As String
 
   Dim hFile As Integer
   Dim buffer As String
   Dim fontName As String
   Dim tempFile As String
   Dim iPos As Integer
   
  'Build name for new resource file in
  'a temporary file, and call the API.
   tempFile = Globals.getTempFolder & "\~TEMP.FOT"
 
   If CreateScalableFontResource(1, _
                                 tempFile, _
                                 filePath, _
                                 vbNullString) Then
      
     'The name sits behind the text "FONTRES:"
      hFile = FreeFile
 
      Open tempFile For Binary Access Read As hFile
 
         buffer = Space(LOF(hFile))
         Get hFile, , buffer
         iPos = InStr(buffer, "FONTRES:") + 8
         fontName = Mid(buffer, iPos, _
                        InStr(iPos, buffer, vbNullChar) - iPos)
 
      Close hFile
 
      Kill tempFile
 
    End If
   
  'Return the font name
   getFontName = fontName
End Function



Public Sub TestIsTextShapeHavingFont()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    If ActiveShape.Type = cdrTextShape Then
        Dim searchFont As String
        'searchFont = "Holiday Spice"
        searchFont = "Test123"
        
        MsgBox "isTextShapeHavingFont (" & searchFont & "): " & isTextShapeHavingFont(ActiveShape, searchFont)
    Else
        MsgBox "Bitte wähle eine Textform aus"
    End If
    
End Sub



Public Function isTextShapeHavingFont(textShape As shape, fontName As String) As Boolean
    
    Dim textRange As textRange
    
    ' Durch alle Zeichenbereiche im Text gehen
    For i = 1 To textShape.text.Story.size
        Dim charRange As textRange
        
        Set charRange = textShape.text.Story.range(i, i)
        If LCase(fontName) = LCase(charRange.font) Then
            isTextShapeHavingFont = True
            Exit Function
        End If
        
        Set charRange = Nothing
    Next i
    
End Function

' Setzt die Schriftart beim Text der 'textShape'.
' Nicht aber bei den arabischen Zeichen, denn diese sollen in Arial bleiben, denn nur Arial kann arabisch darstellen
Public Function setTextShapeFont(textShape As shape, fontName As String, Optional warnIfFontNotApplied As Boolean, Optional logger As logger, Optional addASINErrorInAmazonImport As Boolean)
    
    If Not logger Is Nothing Then logger.addTab , "[Globals.setTextShapeFont]"
    
    Dim textRange As textRange
    
    Dim nonArabicCharStart As Integer
    nonArabicCharStart = -1
    
    Dim warningAlreadyShowed As Boolean
    
    Dim i As Integer
    For i = 1 To textShape.text.Story.Length
        Dim currChar As String
        currChar = Globals.getCharOfString(textShape.text.Story, i)
        
        ' Leerzeichen überspringen, damit Texte, die vollständig aus arabischen Zeichen und Leerzeichen bestehen, nur eine Schriftart haben
        If Not currChar = " " Then
        
            If Globals.isCharArabic(currChar) Then
                If Not nonArabicCharStart = -1 Then
                    Set textRange = textShape.text.Story.range(nonArabicCharStart - 1, i - 1) ' Bei .range startet der Index bei 0 wie es scheint. Deshalb -1
                     
                    warningAlreadyShowed = setTextRangeFont(textRange, fontName, warnIfFontNotApplied And Not warningAlreadyShowed, logger, addASINErrorInAmazonImport)
                    
                    warningAlreadyShowed = False ' DEBUG
                    
                    Set textRange = Nothing
                    nonArabicCharStart = -1
                End If
            ElseIf nonArabicCharStart = -1 Then
                nonArabicCharStart = i
            End If
        
        End If
        
        currChar = ""
    Next i
    
    If Not nonArabicCharStart = -1 Then
        Set textRange = textShape.text.Story.range(nonArabicCharStart - 1, i - 1) ' Bei .range startet der Index bei 0 wie es scheint. Deshalb -1
         
        setTextRangeFont textRange, fontName, warnIfFontNotApplied And Not warningAlreadyShowed, logger, addASINErrorInAmazonImport
    End If
    
    
    If Not logger Is Nothing Then logger.removeTab
End Function


' Returnt, ob eine Warnung angezeigt wurde
Private Function setTextRangeFont(textRange As textRange, fontName As String, Optional warnIfFontNotApplied As Boolean, Optional logger As logger, Optional addASINErrorInAmazonImport As Boolean) As Boolean
    
    If Not logger Is Nothing Then logger.addTab , "[Globals.setTextRangeFont] textRange: '" & textRange.text & "', fontName: '" & fontName & "'"
    
    Dim warned As Boolean
    
    If textRange.Length = 0 Then GoTo ExitFunction
    
    textRange.font = fontName
    
    If warnIfFontNotApplied Then
        If Not LCase(textRange.font) = LCase(fontName) Then
            Dim warnMsg As String
            warnMsg = "Folgende Schrift scheint nicht installiert zu sein: '" & fontName & "'. Bitte überprüfe FontBase"
            
            If addASINErrorInAmazonImport Then
                AmazonImport.addASINError warnMsg
            Else
                MsgBox warnMsg, vbCritical
            End If
            
            If Not logger Is Nothing Then logger.logWARN warnMsg & vbNewLine & "Stattdessen wurde folgende Schriftart von Corel gewählt: '" & textRange.font & "'"
            
            warned = True
        End If
    End If
    
ExitFunction:
    setTextRangeFont = warned
    If Not logger Is Nothing Then logger.removeTab
End Function



Public Sub TestBitmapBlurEffect()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    'ActiveShape.Style.StringAssign "{""GaussianBlurEffect"":{""Resampled"":""0"",""Radius"":""1989""},""GaussianBlurEffect_Deleted"":""0"",""GaussianBlurEffect_Z_Index"":""0""}"
    ActiveShape.Style.StringAssign "{""StackedBitmapEffects"":{""GaussianBlurEffect"":{""Resampled"":""0"",""Radius"":""1989""},""GaussianBlurEffect_Deleted"":""0"",""GaussianBlurEffect_Z_Index"":""0""}}"
    
End Sub



Public Sub TestGetShapeID()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    MsgBox "StaticID: " & ActiveShape.staticID
    
End Sub



Public Sub TestNewFolderWithNonExistentPath()
    
    Dim sizeFolder As New FSSizeFolder
    sizeFolder.init "E:/Martin/Corel/Muster Design/Mit Varianten"
    
    MsgBox "CDR?: " & sizeFolder.hasCDRFolder & ", Schablonenordner?: " & sizeFolder.hasDefaultTemplateFolder
    
End Sub



Public Sub TestVisibilityBug()
    
    
    
    Dim designs As collection
    Set designs = getSelectedDesignsOrAll

    If designs.count > 0 Then

        Dim design As productDesign
        Set design = designs.item(1)

        design.getLayer2(1).getBackgroundShapes Globals.getLogger(True)

    End If


End Sub


Public Sub TestVisiblityFix()
    
    Globals.warnIfNoActiveShapeAndEnd
    
    Dim shape As shape
    Set shape = ActiveSelection
    
    Globals.setShapeInvisible shape.shapes.First
    
End Sub

Public Sub setFocusToCorelDraw()
'    Application.Active
'    AppActivate Application.ActiveWindow.Caption
    
    If Application.Windows.count > 0 Then
        Application.Windows.item(1).Activate
    End If
    
    'Application.ActiveWindow.Activate
End Sub



Public Sub openPropertiesDocker()
    Dim dockerGUID As String
    dockerGUID = "102052d9-0a87-481a-af3b-00f1bce81f9f" ' Eigenschaften
    
    Application.frameWork.ShowDocker dockerGUID
End Sub


Sub SetClipboardText(text As String)
    Dim DataObj As New MSForms.DataObject
    DataObj.SetText text
    DataObj.PutInClipboard
End Sub


Public Sub TestSetQrCodeLink()
    setQrCodeLink Nothing, "Test123"
End Sub



' ACHTUNG: Der QR-Code wird neu erstellt um zu prüfen, ob er sich verändert hat. Der neue QR-Code wird returnt mit dem Boolean ob das Ändern erfolgreich war
Public Function setQrCodeLink(qrCodeShape As shape, qrCode As String) As collection
    
    Dim success As Boolean
    Dim result As New collection
    
    ' Eigenschaften Docker öffnen
    ' ------------------------------------
    Dim dockerGUID As String
    dockerGUID = "102052d9-0a87-481a-af3b-00f1bce81f9f" ' GUID für das Eigenschaften-Docker
    If Not Application.frameWork.IsDockerVisible(dockerGUID) Then
        ' Eigenschaften-Docker anzeigen
        Application.frameWork.ShowDocker dockerGUID ' Garnicht nötig
        DoEvents
    End If
    ' ------------------------------------
    
    ' Neuen QR-Code erstellen, der den Link "http:/1" hat.
    ' Wenn dann ein neuer Link eingefügt wird, sollte sich die Größe vom QR-Code ändern
    ' Wenn sich die Größe aber nicht ändert, dann weiß diese Funktion, dass das Setzen des Links nicht geklappt hat (User kann dann gewarnt werden)
    Dim newQRCode As shape
    Set newQRCode = Globals.createQRCode
    newQRCode.OrderBackOf qrCodeShape
    newQRCode.SetPositionEx cdrCenter, qrCodeShape.centerX, qrCodeShape.centerY
    Dim newQRCodeSize As Double
    newQRCodeSize = newQRCode.SizeWidth ' Größe merken
    
    ' Alten QR-Code löschen
    qrCodeShape.delete
    Set qrCodeShape = newQRCode
    DoEvents
    
    ' QR-Code auswählen
    ' damit der Eigenschaften Docker sich auf den QR-Code einstellt und seine Eigenschaften anzeigt
    qrCodeShape.CreateSelection
    DoEvents
    
    ' GUID des Textfelds (EditBox für QR-Code-Link)
    Dim itemGUID As String
    itemGUID = "c686541f-3264-ad8a-40c1-dc34f8393443"

    ' Das Textfeld zu fokussieren
    Application.frameWork.Automation.InvokeItem itemGUID
    DoEvents
    
    ' QR Code in Textfeld eingeben
    SendKeys qrCode, True
    DoEvents
    
    ' Interessanterweise muss 2x mit Enter bestätigt werden
    SendKeys "{ENTER}", True ' Bestätigen
    SendKeys "{ENTER}", True ' Bestätigen
    DoEvents
    
    success = Not (newQRCodeSize = qrCodeShape.SizeWidth) ' Wenn sich die Größe des QR-Codes geändert hat, dann war das Ändern des Links erfolgreich
    
    result.add success
    result.add qrCodeShape
    
    Set setQrCodeLink = result
    
End Function



Public Function listObjectPropertiesAndFunctions(obj As Object) As String
    
    Dim result As String
    result = TypeName(obj) & vbNewLine
    
    ' Alle möglichen Eigenschaften durchsuchen (nur bei COM-Objekten)
    On Error Resume Next
    For Each prop In obj
        result = result & " - " & TypeName(prop) & ": " & prop & vbNewLine
    Next prop
    On Error GoTo 0
    
    listObjectPropertiesAndFunctions = result
    
End Function



Public Sub TestStoreAndRestoreVisibleDockers()
    storeVisibleDockers
    restoreVisibleDockers
    MsgBox "Test fertig!"
End Sub

Public Function getDockersGUIDs() As Dictionary
    If p_dockersGUIDs Is Nothing Then
        Set p_dockersGUIDs = New Dictionary
        p_dockersGUIDs.add "Farbprüfung", "aa9dfbd3-74ae-4543-8203-84ad1a1f4d7f"
        p_dockersGUIDs.add "Hinweise", "bc1e2f70-3b58-41cd-8406-aaa550482972"
        p_dockersGUIDs.add "Effekte", "c223dfcc-5a2e-4f01-8543-d7ed4411607b"
        p_dockersGUIDs.add "Verlauf (History)", "02bdc6f4-065d-9fa6-44c2-a41ddf4d3b10"
        p_dockersGUIDs.add "Objektdaten", "799476ff-2b80-43cb-b51a-a31ac9141618"
        p_dockersGUIDs.add "Ansichten", "18d6991b-8ef8-4b48-be1a-d55f769648a9"
        p_dockersGUIDs.add "Color", "454fda4e-4634-4079-8534-17797a64dfae"
        p_dockersGUIDs.add "Paletten", "a2f385ec-72c6-4364-bead-4cd09e6dda93"
        p_dockersGUIDs.add "Suchen und ersetzen", "328c33c0-b5b9-b7b5-4952-df2535639ab0"
        p_dockersGUIDs.add "Hilfslinien", "0750d8df-2c52-43d7-9aa0-9ec2531dfe42"
        p_dockersGUIDs.add "Live-Hilfslinien", "a8b139f6-dd44-0883-49e9-8b18d2b16f38"
        p_dockersGUIDs.add "Seriendruck", "4a8feb78-844a-429e-8797-387c002a359d"
        p_dockersGUIDs.add "Projizierte Achsen", "28b4a595-af12-4199-aa2d-2d8e9a008b60"
        p_dockersGUIDs.add "Linse", "e6873daf-b5b9-4957-bb78-3335fc8c6054"
        p_dockersGUIDs.add "Extrudieren", "9452d7fb-1204-4e0f-9ff6-92b7806c199d"
        p_dockersGUIDs.add "Skripts", "5c2d914c-1b89-66a7-45d9-3e4600dcc6aa"
        p_dockersGUIDs.add "Objekte", "174b4265-e813-4427-a8ce-5eb17b327888"
        p_dockersGUIDs.add "Symbole", "30afc88c-1e67-4b21-9893-73cbb3895bd3"
        p_dockersGUIDs.add "Bitmapmaske", "7ef910da-e881-4f59-86ea-94456da7761d"
        p_dockersGUIDs.add "Vielfach duplizieren", "b3fb1964-9f5d-4650-8e4e-20b88bb9671c"
        p_dockersGUIDs.add "Quellen", "1a0af10a-c0c8-fead-4f94-fb89f4fc2db2"
        p_dockersGUIDs.add "Pointilizer", "899d052c-fc8b-93b0-43c7-bda85ca8f417"
        p_dockersGUIDs.add "Photococktail", "d38b764b-2616-7bab-437b-2233d902aec5"
        p_dockersGUIDs.add "Objekte an Strecke ausrichten", "bf87b90f-5a78-40b6-8451-d65ae17ed14b"
        p_dockersGUIDs.add "Künstlerische Medien", "e79e3cf2-c93d-4694-b463-f2f7113872e8"
        p_dockersGUIDs.add "Abschrägung", "370e97bf-651f-4431-9bfd-140035be0c7e"
        p_dockersGUIDs.add "Überblendung", "155feb2c-56dc-4a8c-9362-9ab38561b267"
        p_dockersGUIDs.add "Kommentare", "ce35466c-2377-4d42-b293-e76e290e2199"
        p_dockersGUIDs.add "Kontur", "b9fa0ab0-e60e-38a0-443d-37f0488d6aa8"
        p_dockersGUIDs.add "Hülle", "2191be05-845e-4ee1-8d61-c036f492fee8"
        p_dockersGUIDs.add "Ausrichten und verteilen", "7b49396f-f989-c087-4ed9-de2b835dcf68"
        p_dockersGUIDs.add "Koordinaten", "dbd626b4-ed44-3ca1-4ce8-71921595bd74"
        p_dockersGUIDs.add "Ändern", "9d5d7bc9-3227-1195-4c7a-fe91788e2367"
        p_dockersGUIDs.add "Eigenschaften", "102052d9-0a87-481a-af3b-00f1bce81f9f"
        p_dockersGUIDs.add "Verknüpfung und Rollover", "8151bb6c-2ec0-84b7-4d1e-a379eabd0156"
        p_dockersGUIDs.add "Ecken", "f3ab7212-445a-c7b4-47db-94a7d944ccda"
        p_dockersGUIDs.add "Kurven verbinden", "d632ed56-5e70-bca1-43f8-249a6342dbf2"
        p_dockersGUIDs.add "Form", "aed09712-12ac-d98764723-aa3167ef73ca"
        p_dockersGUIDs.add "Farbstile", "5e850daf-af40-d480-4201-10e9cf35b841"
        p_dockersGUIDs.add "Objektstile", "dbda185b-ac02-f6b4-4052-654348a46a39"
        p_dockersGUIDs.add "Text", "a3f597ca-e079-ab88-4e2f-28a3b4db6d8e"
        p_dockersGUIDs.add "Inhalt von Connect", "11b86ad8-6f3a-451c-9874-5799cd293e6b"
        p_dockersGUIDs.add "Glyphen", "76baddcc-6deb-e481-42c6-389833de8d5a"
        p_dockersGUIDs.add "Schriftensammler", "957f5aab-d8f9-35aa-4f2c-20c938c7c08b"
    End If
    
    Set getDockersGUIDs = p_dockersGUIDs
End Function


Public Function storeVisibleDockers()
    Set storedVisibleDockers = New collection
    
    Dim dockerGUID As Variant
    
    ' Prüfe die Sichtbarkeit jedes Andockfensters anhand der GUIDs
    For Each dockerGUID In getDockersGUIDs
'        MsgBox "Docker " & getDockersGUIDs(dockerGUID)
        If Application.frameWork.IsDockerVisible(dockerGUID) Then
            storedVisibleDockers.add dockerGUID
'            MsgBox "Geöffneter Docker gemerkt: " & getDockersGUIDs(dockerGUID)
        End If
        
        ' DEBUG:
'        Application.FrameWork.HideDocker dockerGUID
    Next dockerGUID
    
End Function


Public Function restoreVisibleDockers()
    If storedVisibleDockers Is Nothing Then Exit Function
    
    For i = 1 To storedVisibleDockers.count
        Application.frameWork.ShowDocker storedVisibleDockers(i)
        DoEvents
'        MsgBox "Docker sichtbar gemacht: " & getDockersGUIDs(storedVisibleDockers(i))
    Next i
End Function


Sub TestPrintVisibleDockersWithGUID()
    Dim dockerList As String
    Dim dockerGUID As Variant

    dockerList = "Sichtbare Andockfenster:" & vbCrLf
    
    ' Prüfe die Sichtbarkeit jedes Andockfensters anhand der GUIDs
    For Each dockerGUID In getDockersGUIDs.keys
        If Application.frameWork.IsDockerVisible(dockerGUID) Then
            dockerList = dockerList & "- " & getDockersGUIDs(dockerGUID) & vbCrLf
        End If
    Next dockerGUID
    
    ' Zeige die Liste der sichtbaren Andockfenster
    MsgBox dockerList, vbInformation, "Geöffnete Andockfenster"
End Sub


Public Sub UpdateGravuruIcons()
    
'    Dim StopWatch As New StopWatch
'    StopWatch.startTimer
    
'    storeVisibleDockers
    
    ' Eigentlich ruft nur die 'GlobalSettingsUserForm' diese Funktion auf.
    ' Wenn die Userform allerdings bereits modal sichtbar ist, kann 'ProgressBarUserForm' nicht auch noch modal nagezeigt werden.
    ' Deshalb wird die 'GlobalSettingsUserForm' geschlossen
    If GlobalSettingsUserForm.visible Then GlobalSettingsUserForm.Hide
    
    ProgressBarUserForm.Start False
    ProgressBarUserForm.setProgress 0.1
    
    deleteGravuruIcons
    
    ProgressBarUserForm.setProgress 0.3
    
    loadGravuruIcons
    
    DoEvents
    Sleep 100
    
    ' Da jetzt alle Docker weg sind, wenigstens das Objekte Fenster öffnen
'    MsgBox "Docker sichtbar machen: " & getDockersGUIDs("Objekte")
    Application.frameWork.ShowDocker getDockersGUIDs("Objekte")
    
'    restoreVisibleDockers
    
    ProgressBarUserForm.setProgress 1#
    ProgressBarUserForm.Hide
    
'    MsgBox "Gesammtzeit: " & StopWatch.stopTimer
    
End Sub

Public Function getGravuruBar() As commandBar
    Dim gravuruBar As commandBar
    On Error Resume Next
    Set gravuruBar = Application.CommandBars.item("Gravuru")
    On Error GoTo 0
    
    Set getGravuruBar = gravuruBar
End Function

Public Sub TestGetGravuruBarVersion()
    MsgBox "getGravuruBarVersion: " & Globals.collectionToString(getGravuruBarVersion)
End Sub

Public Function getGravuruBarVersion() As Version
    
    Dim gravuruBar As commandBar
    Set gravuruBar = getGravuruBar
    
    Dim versionString As String
    versionString = "1.0" ' Standart
    
    If Not gravuruBar Is Nothing Then
        
        Dim scriptSettingsControl As control
        Set scriptSettingsControl = Globals.getControlWithName(gravuruBar.controls, "Skript Einstellungen")
        
        If Not scriptSettingsControl Is Nothing Then
            
            Dim lines() As String
            lines = Split(scriptSettingsControl.DescriptionText, vbNewLine)
            
            For i = LBound(lines) To UBound(lines)
                If Globals.startsWith(lines(i), "Symbolleisten-Version:") Then
                    versionString = replace(lines(i), "Symbolleisten-Version: ", "")
                    Exit For
                End If
            Next i
            
        End If
        
    End If
    
    Dim vers As New Version
    vers.newFromString versionString
    
    Set getGravuruBarVersion = vers
End Function


Public Sub deleteGravuruIcons()
    Dim gravuruBar As commandBar
    Set gravuruBar = getGravuruBar
    
    If Not gravuruBar Is Nothing Then
        gravuruBar.delete
    Else
        'Err.Raise vbObjectError + 513, , "[Globals.TestDeleteGravuruCommandBar] 'gravuruBar' ist Nothing "
    End If
End Sub


Public Sub loadGravuruIcons()
    Dim path As String
    path = Globals.addBackslash(Globals.getMainFolder) & "Script Icons\Script Icons.cdws"
    Application.frameWork.ImportWorkspace path
End Sub

Public Sub TestInvoke()

    Dim frameWork As frameWork
    Set frameWork = Application.frameWork

    Dim fensterControl As control
    Set fensterControl = getControlWithName(Application.MainMenu.controls, "&Fenster")

    If Not fensterControl Is Nothing Then
        clickOnControl fensterControl

        Dim arbeitsbereichID As String
        arbeitsbereichID = frameWork.Automation.GetActiveMenuItemGuid(0)

        clickOnControlWithID arbeitsbereichID

        MsgBox "ID: " & arbeitsbereichID & ", caption: " & frameWork.Automation.GetCaptionText(arbeitsbereichID)
    End If

End Sub

Function clickOnControl(control As control)
    clickOnControlWithID control.id
End Function

Function clickOnControlWithID(id As String)
    Application.frameWork.Automation.InvokeItem id
End Function

Function getControlWithName(controls As controls, name As String) As control
    
    For i = 1 To controls.count
        Dim control As control
        Set control = controls.item(i)
        
        If control.Caption = name Then
            Set getControlWithName = control
            Exit Function
        End If
        
        Set control = Nothing
    Next i
    
End Function


Public Sub TestPrintCommandBars()
    
    Dim text As String
    
    
'    For i = 1 To Application.Workspaces.count
'        On Error Resume Next
'        text = text & vbNewLine & Application.Workspaces(i) & " - " & Application.MainMenu.Controls(i).ToolTipText
'        On Error GoTo 0
'    Next i

    

    For i = 1 To Application.CommandBars.count
        Dim commandBar As commandBar
        Set commandBar = Application.CommandBars.item(i)
        text = text & vbNewLine & commandBar.name
        
        For j = 1 To Application.CommandBars.item(i).controls.count
            On Error Resume Next
            text = text & vbNewLine & " - " & commandBar.controls(j).ToolTipText & " - " & commandBar.controls(j).DescriptionText
            On Error GoTo 0
        Next j
        
        Set commandBar = Nothing
    Next i
    
    openTextInTextEditor text, "Corel UI"
End Sub

Public Function openTextInTextEditor(text As String, textFileName As String)
    Dim path As String
    path = Globals.getTempFolder & textFileName & ".txt"
    Globals.saveTextFileUTF8 text, path
    Globals.openFile path
    Globals.Sleep 2000
    Globals.deleteFile path
End Function

Public Sub TestAddMacroButton()

    Dim commandBar As commandBar
'    Set commandBar = Application.CommandBars("Gravuru") '"Standard"
    Set commandBar = Application.CommandBars.add("Test432", cuiBarFloating, True)

    If Not commandBar Is Nothing Then

        Dim button As control
        Set button = commandBar.controls.AddCustomButton(cdrCmdCategoryMacros, "Tools.Globals.TestMsgBox", commandBar.controls.count)
        button.Caption = "Maße"
        button.DescriptionText = "Maße"
        button.ToolTipText = "Maße"
'        button.SetIcon2 "Y:\20_Martin\Corel\Tool\Form A zu B horizontal ausrichten\CenterShapeAToBHorizontal.ico"
        button.SetIcon2 Application.GMSManager.UserGMSPath & "icon.ico"
        
'        button.SetCustomIcon
        
    Else
        MsgBox "commandBar nicht gefunden"
    End If
End Sub


Public Sub TestStopwatch()
    Dim StopWatch As New StopWatch
    StopWatch.startTimer
    
    Globals.Sleep 500
    
    MsgBox StopWatch.stopTimer
    
End Sub


Public Sub TestGetSessionUserData()
    
    MsgBox "SessionUserData.count: " & Application.SessionUserData.count
    
    For i = 1 To Application.SessionUserData.count
        Debug.Print TypeName(Application.SessionUserData.ItemByIndex(i))
    Next i
    
    
End Sub


Public Sub TestDesignFilesProductImageVariantsRegex()
    
    Dim productID As String
    productID = "TBCAPUV-A-8x9-D1"
    
    Dim ignoreProductImageVariantsRegex As String
    ignoreProductImageVariantsRegex = "^" & productID & "(?!-\d).*"
    
    'Globals.openTextInTextEditor Globals.collectionToMultiLineStr(Globals.getFilesAndFoldersMatchingString("C:\Users\GRAVURU 2\Desktop\Paatr\", ignoreProductImageVariantsRegex, StringRegex)), "Regex"
    
    Globals.openTextInTextEditor Globals.collectionToMultiLineStr(Globals.getFilesAndFoldersMatchingString("C:\Users\GRAVURU 2\Desktop\Paatr\", productID, StringStartsWith, , True)), "Kein Regex"
    
End Sub



Public Sub TestIsObject()
    
    MsgBox IsObject(Nothing)
    
End Sub



Public Sub TestInStr()
    
    Dim containerName As String
    containerName = "Dropdown-Option 2"
    Dim containerLabel As String
    containerLabel = "Spar-Set"
    
    If (CBool(InStr(LCase(containerName), "spar")) And CBool(InStr(LCase(containerName), "set"))) Or _
        (CBool(InStr(LCase(containerLabel), "spar")) And CBool(InStr(LCase(containerLabel), "set"))) Then
       MsgBox "Ja"
    Else
        MsgBox "Nein"
    End If
End Sub



Public Sub TestShapeStaticIDAfterChange()

    Application.CreateDocument

    Dim shape As shape
    Set shape = ActiveLayer.CreateRectangle(0, 0, 10, 10)

    MsgBox "StaticID: " & shape.staticID

    Set shape = shape.convertToBitmap

    MsgBox "StaticID as Bitmap: " & shape.staticID

    ' Prüfen, ob shape2 jetzt die alte StaticID von shape bekommt
    Dim shape2 As shape
    Set shape2 = ActiveLayer.CreateRectangle(0, 0, 10, 10)

    MsgBox "StaticID von shape2: " & shape2.staticID
    
    ActiveDocument.AddPages 1
    
    Dim shape3 As shape
    Set shape3 = ActiveLayer.CreateRectangle(0, 0, 10, 10)
    
    MsgBox "StaticID von shape3: " & shape3.staticID
End Sub

Public Sub TestPersistentShape()

    Application.CreateDocument

    Dim pShape As PersistentShape
    Set pShape = PersistentShapeHandler.getShape(ActiveLayer.CreateRectangle(0, 0, 10, 10))

    MsgBox "StaticID: " & pShape.getStaticID

    pShape.swap pShape.getShape.convertToBitmap

    MsgBox "StaticID as Bitmap: " & pShape.getStaticID

    ' Prüfen, ob shape2 jetzt die alte StaticID von shape bekommt
    Dim shape2 As shape
    Set shape2 = ActiveLayer.CreateRectangle(0, 0, 10, 10)

    MsgBox "StaticID von shape2: " & shape2.staticID
    
    ActiveDocument.AddPages 1
    
    Dim shape3 As shape
    Set shape3 = ActiveLayer.CreateRectangle(0, 0, 10, 10)
    
    MsgBox "StaticID von shape3: " & shape3.staticID
End Sub


Public Sub TestMsgBox()
    MsgBox "MsgBox", vbInformation
End Sub



Public Sub TestShapeExportDeleteShapesToDeleteAfterExport()
    Dim filePath As String
    filePath = Globals.getDesktopPath & "Globals.TestShapeExport"
    
    Dim exportShapes As New shapeRange
    exportShapes.add ActiveLayer.CreateRectangle(0, 10, 10, 0)
    
    Dim shapeEx As New ShapeExport
    shapeEx.init exportShapes, filePath, cdrPNG
    shapeEx.addShapesToDeleteAfterExport exportShapes
    shapeEx.deleteShapesToDeleteAfterExport
End Sub


Public Sub TestShapeExportSVG()
    Globals.endIfNoDocumentOpen
    Globals.endIfNoActiveShape
    newShapeExport(ActiveSelection, Globals.getDesktopPath & "SVG", cdrSVG).export
'    OpenDocument Globals.getDesktopPath & "SVG.svg"
End Sub


Public Sub TestShapeExport()
    Globals.endIfNoDocumentOpen
    Globals.endIfNoActiveShape
    newShapeExport(ActiveSelection, Globals.getDesktopPath & "Test", cdrPNG).setExportFullyInvisibleShapeRange(True).setExportFullyInvisibleShapeRangeAs1x1(True).export
End Sub


Public Function TestLayerSortText()
    Globals.endIfNoDocumentOpen
    Globals.endIfNoActiveShape
    
    Globals.getSelectedDesignsOrAllAsRange(True).getDesign(1).getLayers.getLayer(1).sortText
    
End Function






' Wird für das Icon 'Ende' auf der Gravuru-Icon-Leiste genutzt.
' Das ist kein echtes Skript sondern ein Abstandshalter, da Corel das letzte Icon der Leiste ausblendet,
' wenn die Leiste in der ersten Zeile platziert wird
Public Sub Emptyy()
End Sub




' I N P U T  &  U S E R
'
'///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

Function isKeyPressed(key As Integer) As Boolean
    isKeyPressed = GetKeyState(key) < 0
End Function

Function isCTRLPressed() As Boolean
    isCTRLPressed = isKeyPressed(CTRL_KEY)
End Function

Public Function isUserEditingText() As Boolean
    If Not ActiveShape Is Nothing Then
        If ActiveShape.Type = cdrTextShape Then
            isUserEditingText = Not ActiveShape.text.selection.End = 0
        End If
    End If
End Function
