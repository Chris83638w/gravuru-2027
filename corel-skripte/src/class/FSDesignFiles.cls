Attribute VB_Name = "FSDesignFiles"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
' Diese Klasse ist die Schnittstelle zwischen Skripten die Dateien oder Ordner von Produkten erstellen oder löschen möchten und den Pfaden dahin.
' Andere Skripte wissen nicht, was die Pfade zu bestimmten Dateien oder Ordnern sind. Nur diese Klasse weiß es.
' Somit ist es leichter die Ordnerstruktur auf dem Server zu ändern. Denn dann muss man nur Pfade in dieser Klasse abändern.


' Die unterschiedlichen Versionen, die als 'version' in den Parameterlisten vorkommt
' -1 bedeutet, die Version, die auf dem Server zu diesem Design zu finden sind. Also so wie die Daten es diktieren
' 1 Ist die Version bei der
'    - Produktbilder im Designordner sind: Designordner\Produktbilder
'                                          JPEG\Weiß\Produktbild.jpg
'                                          PNG\Produktbild.png
Enum DesignFilesVersions
    VERSION_PRESENT ' 0
    VERSION_1
    VERSION_2
    VERSION_NEWEST = VERSION_2 ' Hier muss immer die neueste Version stehen
End Enum


Public sizeFolder As FSSizeFolder
Dim productID As String

' Amazon-Import-Daten
'Dim amazonImportCDRFolderPath As String
Dim amazonImportCDRFilePathWithoutExtension As String
' Design-Varianten
'Dim amazonImportDesignVariantFolders As collection


' Entweder muss man die 'productID' angeben oder den 'folderPath'
Public Function newDesignFiles(sizeFolderVar As FSSizeFolder, Optional productIDVar As String, Optional folderPath As String)
    
    If Not productIDVar = "" Then
        productID = productIDVar
    Else
        productID = Globals.getFolderName(folderPath)
    End If
    
    Set sizeFolder = sizeFolderVar
    sizeFolder.addDesignFiles Me ' Zum Parent hinzufügen
    
End Function



Public Function getProductID() As String
    getProductID = productID
End Function




' Produkt Bild ::::::::::::::::::::::::



Public Function getProductImagePathsAny(Optional searchLimit As Integer = Globals.MAXINT, Optional vers As DesignFilesVersions = VERSION_PRESENT) As ArrayList
    
    Dim searchForPresentVersion As Boolean
    searchForPresentVersion = vers = VERSION_PRESENT
    If searchForPresentVersion Then
        vers = VERSION_NEWEST ' Suche Daten zunächst in der neuesten Version
    End If
    
    Dim result As ArrayList
    Set result = New ArrayList
SearchAgain:

    Dim filesToCheck As New collection
    
    
    Select Case vers
        Case VERSION_1
            Globals.combineCollectionToCollection Globals.listfiles(getProductImagesMainFolder(VERSION_1) & "PNG\", False, ignoreIfFoldersDoesNotExist:=True), filesToCheck
            Globals.combineCollectionToCollection Globals.listfiles(getProductImagesMainFolder(VERSION_1) & "JPG\Weiss", False, ignoreIfFoldersDoesNotExist:=True), filesToCheck
        Case VERSION_2
            Globals.combineCollectionToCollection Globals.listfiles(getProductImagesMainFolder(VERSION_2) & "PNG\", False, ignoreIfFoldersDoesNotExist:=True), filesToCheck
            Globals.combineCollectionToCollection Globals.listfiles(getProductImagesMainFolder(VERSION_2) & "JPG\", False, ignoreIfFoldersDoesNotExist:=True), filesToCheck
    End Select
    
    Dim i As Integer
    For i = 1 To filesToCheck.count
        Dim currentFileName As String
        currentFileName = Globals.getFileName(filesToCheck(i))
        ' Entweder entspricht der Dateiname (ohne Dateityp) genau der Artikelnummer oder beginnt mit der Artikelnummer und geht mit Unterstrich weiter (GD-S-30x20-D1_front)
        ' Denn es muss verhindert werden, dass "GD-S-30x20-D1" auch "GD-S-30x20-D10" matched
        If (currentFileName = productID) Or Globals.startsWith(currentFileName, productID & "_") Then
            result.add filesToCheck(i)
            If result.count >= searchLimit Then
                GoTo ExitFunction
            End If
        End If
    Next i
    
    
    If searchForPresentVersion Then
        If Not Globals.fileExist(getProductImagePath) Then ' Überprüfe ob Daten in der Version vorhanden sind
            vers = vers - 1
            If vers >= 1 Then
                GoTo SearchAgain ' Suche mit niedrigerer Version nochmal
            Else
                ' Suche war erfolglos
                Set result = New ArrayList
            End If
        End If
    End If
    
ExitFunction:
    Set getProductImagePathsAny = result
End Function



Public Function getProductImagePath(Optional perspective As String = "front", Optional transparent As Boolean = False, Optional shadow As Boolean = False, Optional vers As DesignFilesVersions = VERSION_PRESENT) As String
    
    Dim searchForPresentVersion As Boolean
    searchForPresentVersion = vers = VERSION_PRESENT
    If searchForPresentVersion Then
        vers = VERSION_NEWEST ' Suche Daten zunächst in der neuesten Version
    End If
    
SearchAgain:
    
    Select Case vers
        Case VERSION_1
            getProductImagePath = getProductImagesMainFolder(VERSION_1) & IIf(transparent, "PNG", "JPG\Weiss") & "\" & productID & "_" & perspective & IIf(transparent, ".png", ".jpg")
        Case VERSION_2
            getProductImagePath = getProductImagesMainFolder(VERSION_2) & IIf(transparent, "PNG", "JPG") & "\" & _
                productID & "_" & perspective & IIf(transparent, "_trans", "") & IIf(shadow, "_sch", "") & IIf(transparent, ".png", ".jpg")
    End Select
    
    If searchForPresentVersion Then
        If Not Globals.fileExist(getProductImagePath) Then ' Überprüfe ob Daten in der Version vorhanden sind
            vers = vers - 1
            If vers >= 1 Then
                GoTo SearchAgain ' Suche mit niedrigerer Version nochmal
            Else
                ' Suche war erfolglos
                getProductImagePath = ""
            End If
        End If
    End If
    
End Function



'' Gibt die Pfade von allen gefundenen Produktbildern zu diesem Design zurück
'Public Function getProductImagesPaths(Optional version As DesignFilesVersions = VERSION_PRESENT) As collection
'
'    Dim paths As New collection
'
'
'    Dim searchForPresentVersion As Boolean
'    searchForPresentVersion = version = VERSION_PRESENT
'    If searchForPresentVersion Then
'        version = VERSION_NEWEST ' Suche Daten zunächst in der neuesten Version
'    End If
'
'SearchAgain:
'    Dim productImagesMainFolder As String
'    productImagesMainFolder = getProductImagesMainFolder(version)
'
'    If searchForPresentVersion Then
'        If Not Globals.folderExists(productImagesMainFolder) Then ' Überprüfe ob der Produktbilderordner in der Version vorhanden sind
'            version = version - 1
'            If version >= 1 Then
'                GoTo SearchAgain ' Suche mit niedrigerer Version nochmal
'            Else
'                ' Suche war erfolglos
'                Exit Function
'            End If
'        End If
'    End If
'
'
'
'End Function



' Verschiebt die Produktbilder von diesem Design so, dass sie der 'version' entsprechen
Public Function convertProductImagesToVersion(Optional vers As DesignFilesVersions = VERSION_NEWEST)
    
    If vers = VERSION_PRESENT Then
        GoTo VersionsAreSame
    End If
    
    Dim currentVersion As DesignFilesVersions
    
    If Globals.folderExists(getProductImagesMainFolder(VERSION_1)) Then
        currentVersion = VERSION_1
        
    ElseIf Globals.folderExists(getProductImagesMainFolder(VERSION_2)) Then
        currentVersion = VERSION_2
        
    End If
    
    If vers = currentVersion Then
        GoTo VersionsAreSame
    End If
    
    Select Case Version
        Case VERSION_2
            If currentVersion = VERSION_1 Then
                Dim version1Folder As String
                version1Folder = getProductImagesMainFolder(VERSION_1)
                
                If Globals.folderExists(version1Folder) Then
            
                    Dim overWriteFilesRemembered As Boolean
                    If Globals.folderExists(version1Folder & "PNG\") Then Globals.moveFolderFiles version1Folder & "PNG\", getProductImagesMainFolder(VERSION_2) & "PNG\", overWriteFilesRemembered, True, True, True
                    If Globals.folderExists(version1Folder & "JPG\Weiss\") Then Globals.moveFolderFiles version1Folder & "JPG\Weiss\", getProductImagesMainFolder(VERSION_2) & "JPG\", overWriteFilesRemembered, True, True, True
                    
                    If Globals.isFolderEmtpy(version1Folder, True) Then
                        ' Leeren Produktbilderordner löschen
                        Globals.deleteFolder version1Folder
                    Else
                        Globals.openFolder version1Folder
                        Dim answer As VbMsgBoxResult
                        answer = MsgBox("Der Produktbilderordner ist nicht leer geworden und wird aus Sicherheitsgründen nicht gelöscht: " & vbNewLine & version1Folder & vbNewLine & "Möchtest du fortfahren", vbYesNo Or vbQuestion, "Produktbilder Fehler")
                        
                        If answer = vbNo Then
                            Globals.endMacro
                        End If
                    End If
                End If
            End If
    End Select
    
    Exit Function
VersionsAreSame: ' Es macht keinen Sinn die aktuellen Daten zur aktuellen Version der Daten zu konvertieren
    'MsgBox "Versionen gleich"
End Function


Public Function getProductImagesMainFolder(Optional vers As DesignFilesVersions = VERSION_PRESENT) As String
        
    Dim result As String
        
    Select Case vers
        Case VERSION_1
            result = getFolderPath & "Produktbilder\"
        Case VERSION_2
            result = Globals.addBackslash(sizeFolder.path) & "[Produktbilder]\"
    End Select
    
    
    getProductImagesMainFolder = result
End Function


' Produkt Bild Ende ::::::::::::::::










Public Function getFolderThumbnailPath(Optional withFileType As Boolean = True) As String
    getFolderThumbnailPath = getFolderPath & "folder" & IIf(withFileType, ".jpg", "")
End Function










' Amazon Import ::::::::::::::::::::



'Public Function getAmazonImportCDRFolderPath() As String
'
'    If amazonImportCDRFolderPath = "" Then
'        amazonImportCDRFolderPath = Globals.addBackslash(sizeFolder.path) & productID & "\" & "Export"
'    End If
'
'    getAmazonImportCDRFolderPath = amazonImportCDRFolderPath
'End Function

Public Function getAmazonImportCDRsPathAny() As ArrayList
    Dim result As New ArrayList
    
    If Globals.folderExists(getAmazonImportFolderPath) Then
        result.AddRange Globals.getFilesPathWithExtensionInFolder(getAmazonImportFolderPath, "cdr")
    End If
    
    Set getAmazonImportCDRsPathAny = result
End Function

Public Function hasAmazonImportCDR()
    hasAmazonImportCDR = Globals.fileExist(getAmazonImportCDRPath)
End Function


Public Function getAmazonImportCDRPath(Optional withFileType As Boolean = True) As String
    If amazonImportCDRFilePathWithoutExtension = "" Then
        amazonImportCDRFilePathWithoutExtension = getAmazonImportFolderPath & productID
    End If

    getAmazonImportCDRPath = amazonImportCDRFilePathWithoutExtension & IIf(withFileType, ".cdr", "")
End Function


Public Function deleteAmazonImportCDR()
    If Globals.fileExist(getAmazonImportCDRPath) Then
        Globals.deleteFile getAmazonImportCDRPath
    End If
End Function


Public Function getAmazonImportFolderPath() As String
    If amazonImportCDRFolderPath = "" Then
        amazonImportCDRFolderPath = getFolderPath & "Export\"
    End If

    getAmazonImportFolderPath = amazonImportCDRFolderPath
End Function


Public Function deleteAmazonImportFiles()
    If Globals.folderExists(getAmazonImportFolderPath) Then
        Globals.deleteFolder getAmazonImportFolderPath
    End If
End Function

' Design-Varianten ---
Public Function hasAmazonImportDesignVariantGroupFolder(groupIndex As Integer) As Boolean
    hasAmazonImportDesignVariantGroupFolder = Globals.folderExists(getAmazonImportDesignVariantGroupFolderPath(groupIndex))
End Function


Public Function getAmazonImportDesignVariantGroupFolderPath(groupIndex As Integer) As String
    getAmazonImportDesignVariantGroupFolderPath = getAmazonImportFolderPath & "Design-Varianten " & groupIndex
End Function


Public Function hasAmazonImportDesignVariantCDR(groupIndex As Integer, designVariantIndex As Integer) As Boolean
    hasAmazonImportDesignVariantCDR = Globals.fileExist(getAmazonImportDesignVariantFilePath(groupIndex, designVariantIndex))
End Function


Public Function getAmazonImportDesignVariantFilePath(groupIndex As Integer, designVariantIndex As Integer, Optional addCDRExtension As Boolean = True) As String
    getAmazonImportDesignVariantFilePath = getAmazonImportDesignVariantGroupFolderPath(groupIndex) & "\" & designVariantIndex & IIf(addCDRExtension, ".cdr", "")
End Function

Public Function deleteAmazonImportDesignVariants()
    ' TODO beim AmazonExporter aufrufen
End Function
' ---


' Statische Varianten ---
Public Function getAmazonImportStaticVariantFilePath(variante As variante, layersThatHaveStaticVariantsIndex As Integer) As String
    getAmazonImportStaticVariantFilePath = getAmazonImportStaticVariantFilePath2(variante.variantGroupName, variante.variantName, layersThatHaveStaticVariantsIndex)
End Function


Public Function getAmazonImportStaticVariantFilePath2(variantGroupName As String, variantName As String, layersThatHaveStaticVariantsIndex As Integer) As String
    Dim result As String
    result = getAmazonImportFolderPath
    result = result & "Statische Varianten\" & layersThatHaveStaticVariantsIndex & "\"
'    result = result & "Teil " & variante.layer.getPart.getPartIndex & "\"
'    result = result & "Schicht " & variante.layer.getLayerIndex & "\"
    result = result & variantGroupName & "\"
    
    ' ! ! ! ! ! ! ! !!
    ' ! ! ! ! ! ! ! !!
    ' Problem ist noch, dass auf Amazon die Variante "Befestigung" -> "Bohrlöcher" heißt, aber in Corel "var_befestigung(2-Bohrloecher-Edelstahl)"
    result = result & variantName
    
    
    
    getAmazonImportStaticVariantFilePath2 = result
End Function


' ---

' Amazon Import Ende ::::::::::::::::::::







'' CDR Datei
'Public Function findAmazonImportCDRPath() As String
'
'    If hasAmazonImportCDRFolder Then
'        amazonImportCDRFilePath = getFirstCDRInFolder(getAmazonImportCDRFolderPath)
'    End If
'
'    findAmazonImportCDRPath = amazonImportCDRFilePath
'End Function
' Amazon Converter Ende ::::::::::::::::::::::::::








' AMAZON EXPORT :::::::::::::
Private Function getAmazonKonfiFolderVersion1() As String
    getAmazonKonfiFolderVersion1 = getFolderPath & "FPD_Amazon\"
End Function

Private Function getAmazonKonfiFolderVersion2() As String
    getAmazonKonfiFolderVersion2 = Globals.addBackslash(sizeFolder.path) & "[Amazon-Konfi]\"
End Function


Public Function deleteAmazonExportFilesAllVersions()
    For i = 0 To DesignFilesVersions.VERSION_NEWEST
        deleteAmazonExportFiles (i)
    Next i
End Function


Public Function deleteAmazonExportFiles(Optional vers As DesignFilesVersions = VERSION_PRESENT)
    
    Dim searchForPresentVersion As Boolean
    searchForPresentVersion = vers = VERSION_PRESENT
    If searchForPresentVersion Then
        vers = VERSION_NEWEST ' Suche Daten zunächst in der neuesten Version
    End If
    
SearchAgain:

    Dim pathsToDelete As New collection
    
    Select Case vers
        Case VERSION_1
            pathsToDelete.add getAmazonKonfiFolderVersion1

        Case VERSION_2
            If Globals.folderExists(getAmazonKonfiFolderVersion2) Then
                Set pathsToDelete = getFilesAndFoldersOfThisProductID(getAmazonKonfiFolderVersion2, False)
            End If
    End Select
    
    
    If searchForPresentVersion Then
    
        Dim filesOrFoldersOK As Boolean
        If pathsToDelete.count > 0 Then
            If Globals.fileOrFolderExists(pathsToDelete(1)) Then
                filesOrFoldersOK = True
            End If
        End If
    
        If Not filesOrFoldersOK Then
            vers = vers - 1
            If vers >= 1 Then
                GoTo SearchAgain ' Suche mit niedrigerer Version nochmal
            Else
                ' Suche war erfolglos
                Exit Function
            End If
        End If
    End If
    
    Globals.deleteFilesOrFolders pathsToDelete
    
End Function


Public Function getAmazonExportViewSortFilePath() As String
    getAmazonExportViewSortFilePath = getAmazonKonfiFolder & "viewSort.json"
End Function

Public Function loadPartToViewInstruction() As ConfiPartToViewSortInstruction
    
    Dim instruction As New ConfiPartToViewSortInstruction
    instruction.loadFromFile Me
    
    Set loadPartToViewInstruction = instruction
End Function

Public Function saveAmazonExportUploadBoxesInfoFile(uploadBoxInfo As String, viewIndex As Integer)
    Globals.saveTextFile uploadBoxInfo, getAmazonExportImagePathBeginning(viewIndex) & "Uploadboxen.txt"
End Function

Public Function getAmazonExportFilesPathAny() As ArrayList
    Dim result As New ArrayList
    
    If Globals.folderExists(getAmazonKonfiFolderVersion2) Then
        result.add Globals.getFilesInFolder(getAmazonKonfiFolderVersion2, False, recursive:=True)
    End If
    
    Set getAmazonExportFilesPathAny = result
End Function

' MaskImage Pfad
Public Function getAmazonExportMaskImagePath(viewIndex As Integer) As String
    getAmazonExportMaskImagePath = getAmazonExportImagePathBeginning(viewIndex) & "MaskImage"
End Function

' BaseImage Pfad
Public Function getAmazonExportBaseImagePath(viewIndex As Integer) As String
    getAmazonExportBaseImagePath = getAmazonExportImagePathBeginning(viewIndex) & "BaseImage"
End Function

' Design Bild Pfad
Public Function getAmazonExportDesignImagePath(viewIndex As Integer, addGroundPlateVariantIndex As Boolean, groundPlateVariantIndex As Integer) As String
    getAmazonExportDesignImagePath = getAmazonExportImagePathBeginning(viewIndex) & "Design" & IIf(addGroundPlateVariantIndex, " GP" & groundPlateVariantIndex, "")
End Function

' Design Vorschau Bild Pfad
Public Function getAmazonExportDesignPreviewImagePath(viewIndex As Integer, addGroundPlateVariantIndex As Boolean, groundPlateVariantIndex As Integer) As String
    getAmazonExportDesignPreviewImagePath = getAmazonExportImagePathBeginning(viewIndex) & "Design" & IIf(addGroundPlateVariantIndex, " GP" & groundPlateVariantIndex, "") & " Vorschau"
End Function

' Design Bild mit Foto-Masken-Inseln Pfad (Maskiert ist immer nur ein Rechteck um nichtrechteckige Uploadboxen, damit Platz für Texte bleibt und diese nicht maskiert werden)
Public Function getAmazonExportDesignImageWithPhotoIslandsPath(viewIndex As Integer, addGroundPlateVariantIndex As Boolean, groundPlateVariantIndex As Integer) As String
    getAmazonExportDesignImageWithPhotoIslandsPath = getAmazonExportImagePathBeginning(viewIndex) & "Design mit Fotomaske" & IIf(addGroundPlateVariantIndex, " GP" & groundPlateVariantIndex, "")
End Function

' Gibt den Anfang des Pfades für AmazonExport Bilder zurück
Private Function getAmazonExportImagePathBeginning(viewIndex As Integer) As String
    getAmazonExportImagePathBeginning = getAmazonKonfiFolderVersion2 & productID & " " & "View-" & viewIndex & " "
End Function


' Diese Funktion ist für alle Varianten außer Designvarianten
' Achtung: Designvarianten haben einen speziellen Pfad und nutzen die Funktion 'getAmazonExportDesignVariantPath'
Public Function getAmazonExportVariantPath(variante As variante, viewIndex As Integer) As String
    getAmazonExportVariantPath = getAmazonExportImagePathBeginning(viewIndex) & Globals.addStringWithDelimiterIfNeeded(variante.variantGroupName, variante.variantName, " ")
End Function


' Gibt den Hauptordner für eine Designvariante zurück. Bspw. "[Amazon-Konfi]\Artikelnummer Designvarianten\desVar(1)"
Private Function getAmazonExportDesignVariantFolderPath(variante As variante) As String
    Dim path As String
    ' Für Designvarianten wird ein Unterordner genutzt, da es manchmal viele Designvarianten gibt
    path = getAmazonKonfiFolderVersion2 & productID & " Designvarianten\"
    ' Unterordner für die Variantengruppe 'desVar(1)'
    path = path & "desVar(" & variante.designElementVarianteGroupNr & ")" & "\"
    
    getAmazonExportDesignVariantFolderPath = path
End Function

' Designvarianten sind Viewunabhängig, da die Designgruppennummer immer global über das gesammte Design vegeben wird
Public Function getAmazonExportDesignVariantPath(variante As variante) As String
    
    Dim path As String
    path = getAmazonExportDesignVariantFolderPath(variante)
    path = path & variante.getDesignVariantChildIndex
    
    getAmazonExportDesignVariantPath = path
End Function

Public Function getAmazonExportDesignVariantPreviewImagePath(variante As variante) As String
    getAmazonExportDesignVariantPreviewImagePath = getAmazonExportDesignVariantFolderPath(variante) & "Vorschau\" & variante.getDesignVariantChildIndex & "_vorschau"
End Function


Public Function getAmazonExportQRCodeVariantPath(viewIndex As Integer) As String
    getAmazonExportQRCodeVariantPath = getAmazonExportImagePathBeginning(viewIndex) & " QR-Code"
End Function


' AMAZON EXPORT ENDE ::::::::::::::::::::::::::









' FANCY EXPORT :::::::::::::
' Wenn man die Daten von jedem einzelnen Design vor dessen Export löscht, sollte nur einmal beim ersten Design 'globally' gelöscht werden.
' Denn ein Design kann Daten global schreiben (bspw. im übergeordneten globalen [Fancy Varianten] Ordner. Das macht aber immer nur das erste exportierte Design. Das zweite würde dann diese Daten löschen und selbst nicht schreiben)
Public Function deleteFancyExportFiles(Optional globally As Boolean = True)
    
    ' Die ganz alten Exportdaten mit der CSV und der PDFversion
    Globals.deleteFolder getFolderPath & "FPD\"
    
    ' Der Ordner mit den Varianten, die für dieses Design individuell sind
    Globals.deleteFolder getFolderPath & "Fancy Varianten\"
    
    ' Der Ordner mit den Varianten, die bei allen Designs gleich sind
    Globals.deleteFolder getFancyVariantsFolder(True) ' Designspezifischen Variantenordner löschen
    If globally Then Globals.deleteFolder getFancyVariantsFolder(False) 'Globalen Variantenordner löschen
    
    ' Zip Dateien löschen:
    ' Auf Grund von Varianten, kann es mehrere im Ordner geben
    ' ---------------------------
    Dim zipFiles As collection
    Set zipFiles = Globals.findFilesPathWithExtensionInFolder(getFolderPath, "zip")
    
    For i = 1 To zipFiles.count
        Globals.deleteFile zipFiles(i)
    Next i
    ' ---------------------------
    
End Function


' Deprecated: 'onlyForThisDesign'
Private Function getFancyVariantsFolder(Optional onlyForThisDesign As Boolean = False) As String
    Dim folderPath As String
    If onlyForThisDesign Then
        folderPath = getFolderPath & "Fancy Varianten\"
    Else
        ' Deprecated (Veraltet)
        folderPath = sizeFolder.path & "[Fancy Varianten]\"
    End If
    
    getFancyVariantsFolder = folderPath
End Function

' @Deprecated Komplett
Public Function getFancyVariantPath(variante As variante, onlyForThisDesign As Boolean) As String
    
    Dim folderPath As String
    ' Aus "var_taster" wird "taster". Das ergibt "[Fancy Varianten]\taster\"
    folderPath = getFancyVariantsFolder(onlyForThisDesign) & variante.variantGroupName & "\" & variante.variantName
    getFancyVariantPath = folderPath
End Function


Public Function getFancyZIPPath(Optional variants As collection) As String
    
    Dim result As String
    result = productID
    
    If Not variants Is Nothing Then
        For i = 1 To variants.count
            result = result & variants(i).getNameForFancyZIP
            If Not i = variants.count Then result = result & "_" ' Varianten mit Unterstrich trennen
        Next i
    End If
    
    getFancyZIPPath = getFolderPath & result & ".zip"
    
End Function

' @Deprecated Alt !!
Public Function getFancyZIPFolderPathBeforeZip() As String
    getFancyZIPFolderPathBeforeZip = sizeFolder.path & productID & "\" & "FPD_Zip\"
End Function


' Gibt alle ZIP Pfade die sich im Desginordner befinden zurück
Public Function getFancyZIPPaths() As collection
    Set getFancyZIPPaths = Globals.getFilesPathWithExtensionInFolder(getFolderPath, ".zip")
End Function
' FANCY EXPORT ENDE ::::::::::::::::::::::::::






' EXPORT 2 :::::::::::::::::::::::::::::::





' EXPORT 2 ENDE ::::::::::::::::::::::::::






Public Function getFilesAndFoldersForRename(Optional logger As logger) As collection
    
    If Not logger Is Nothing Then logger.addTab , "[DesignFiles.getFilesAndFoldersForRename]"
    
    
    Dim result As New collection
    Dim designFolderPath As String
    designFolderPath = getFolderPath ' Designordner
    
    
    If Globals.folderExists(designFolderPath) Then
        ' Inhalt vom Design Ordner
        addFilesAndFoldersForRenameCheckMainDesign Globals.getFilesAndFoldersMatchingString(designFolderPath, productID, StringInside, , , logger:=logger), result
        
        ' Designordner selbst
        result.add designFolderPath
    End If
    
    
    
    ' [Produkbilder] Ordner (VERSION_2)
    Dim productImagesPath As String
    productImagesPath = getProductImagesMainFolder(VERSION_2)
    If Globals.folderExists(productImagesPath) Then ' Wenn der [Produktbilder] Ordner vorhanden ist
        addFilesAndFoldersForRenameCheckMainDesign getFilesAndFoldersOfThisProductID(productImagesPath, logger:=logger), result
    End If
    
    ' [Amazon-Konfi] Ordner (VERSION_2)
    Dim amazonConfiPath As String
    amazonConfiPath = getAmazonKonfiFolderVersion2
    If Globals.folderExists(amazonConfiPath) Then
        addFilesAndFoldersForRenameCheckMainDesign getFilesAndFoldersOfThisProductID(amazonConfiPath, logger:=logger), result
    End If
    
    Set getFilesAndFoldersForRename = result
    
    If Not logger Is Nothing Then logger.removeTab
    
End Function


Private Function addFilesAndFoldersForRenameCheckMainDesign(filesAndFoldersToAdd As collection, ByRef addTo As collection)
    
    Dim dummyProductIDObj As New ProductIDObject
    dummyProductIDObj.setProductID productID
    
    ' Wenn das Maindesign (Wunschtext) umbenannt werden soll, dann muss extra geprüft werden, ob die gefundenen dazugehörigen Daten wie bspw. Produktbilder keine Designnummer haben
    ' Denn wenn man "GT-S-30x20" als Maindesign (Wunschtext) hat werden auch Designs wie "GT-S-30x20-D1" gefunden, weil es vom Namen her matched
    If dummyProductIDObj.isMainDesign Then
        For i = 1 To filesAndFoldersToAdd.count
            If dummyProductIDObj.setProductID(Globals.getFileOrFolderName(filesAndFoldersToAdd(i)), True).isMainDesign Then
                addTo.add filesAndFoldersToAdd(i)
            End If
        Next i
    Else
        ' Kein Maindesign (Wunschtext). Einfach hinzufügen
        Globals.combineCollectionToCollection filesAndFoldersToAdd, addTo
    End If
End Function




Public Function getFolderPath() As String
    getFolderPath = Globals.addBackslash(sizeFolder.path) & productID & "\"
End Function

' Gibt Dateien und Ordner zurück, die zu dieser Artikelnummer gehören
Private Function getFilesAndFoldersOfThisProductID(folderPath As String, Optional recursive As Boolean = True, Optional logger As logger) As collection
    Set getFilesAndFoldersOfThisProductID = Globals.getFilesAndFoldersMatchingString(folderPath, getProductIDRegex, StringRegex, recursive, True, logger)
End Function

Private Function getProductIDRegex() As String
    ' Der Regex erlaubt bei der Artikelnummer "GT-S-30x20-D1" folgendes:
    ' "GT-S-30x20-D1_persp" (Produktbilder)
    ' oder:
    ' "GT-S-30x20-D1 View-1 BaseImage" (Amazondaten)
    ' Also ein Unterstrich oder Leerzeichen nach der Artikelnummer sind die einzig zulässigen Zeichen danach
    ' Nicht erlaubt ist:
    ' "GT-S-30x20-D1-2"
    ' Auch nicht:
    ' "GT-S-30x20-D10" Denn hier ist es D10 und nicht D1
    ' Ein Test hierfür ist unter Globals.TestDesignFilesProductImageVariantsRegex
    getProductIDRegex = "^" & productID & "(?=_|$|\s)"
End Function


' Helper
Private Function getFirstCDRInFolder(folder As String) As String
    Dim result As collection
    Set result = Globals.getFilesPathWithExtensionInFolder(folder, "cdr", 1)
    
    If result.count > 0 Then
        getFirstCDRInFolder = result(1)
    End If
End Function




