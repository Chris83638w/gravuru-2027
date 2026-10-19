Attribute VB_Name = "Extractor2"
Option Explicit

' Autor: Martin Afelt @ GRAVURU


Dim sourcePath As String
Dim targetPath As String
Dim extractType As FolderExtractType
Dim regexText As String

Dim overWrite As Boolean
Dim keepFolderStructure As Boolean

Dim extractProductImages As Boolean
Dim extractAmazonKonfiData As Boolean
Dim extractFancyData As Boolean
Dim extractAmazonImportData As Boolean
Dim extractCDRData As Boolean

Dim logger As New logger

Dim CDRFolderFound As Boolean

Public Enum FolderExtractType
    copyFolderType
    cutFolderType
    deleteFolderType
End Enum

Public Sub Show()
    
    Extractor2Dialog.Show vbModal
    
End Sub


Public Function Start(sourcePathVar As String, targetPathVar As String, extractTypeVar As FolderExtractType, regexText_ As String, extractProductImagesVar As Boolean, extractAmazonKonfiDataVar As Boolean, _
        extractFancyDataVar As Boolean, extractAmazonImportDataVar As Boolean, extractCDRDataVar As Boolean, overWriteVar As Boolean, keepFolderStructure_ As Boolean)
    
    
    If sourcePathVar = targetPathVar Then
        MsgBox "Quell und Zielordner dürfen nicht die selben sein !", vbExclamation
        End
    End If
    
    sourcePath = sourcePathVar
    targetPath = targetPathVar
    extractType = extractTypeVar
    regexText = regexText_
    extractProductImages = extractProductImagesVar
    extractAmazonKonfiData = extractAmazonKonfiDataVar
    extractFancyData = extractFancyDataVar
    extractAmazonImportData = extractAmazonImportDataVar
    extractCDRData = extractCDRDataVar
    overWrite = overWriteVar
    keepFolderStructure = keepFolderStructure_
    
    
    logger.init "Extractor2"
    logger.logINFO "[Extractor2.start]"
    logger.logINFO "sourcePath: " & sourcePath
    logger.logINFO "targetPath: " & targetPath
    logger.logINFO "extractType: " & CStr(extractType)
    logger.logINFO "extractProductImages: " & CStr(extractProductImages)
    logger.logINFO "extractAmazonKonfiData: " & CStr(extractAmazonKonfiData)
    logger.logINFO "extractFancyData: " & CStr(extractFancyData)
    logger.logINFO "extractAmazonImportData: " & CStr(extractAmazonImportData)
    logger.logINFO "extractCDRData: " & CStr(extractCDRData)
    logger.logINFO "overWrite: " & CStr(overWrite)
    logger.logINFO "keepFolderStructure: " & CStr(keepFolderStructure)
    logger.logINFO ""
    
    processFolder sourcePathVar
    
    If Not CDRFolderFound Then
        MsgBox "Es wurde kein [CDR] Ordner gefunden. Dieser wird benötigt", vbExclamation
    End If
    
End Function



Private Function processFolder(ByVal folderPath As String)
    
    Dim i As Integer
    
    ' Produktordner gefunden (Innerhalb von Produktorndern wird nicht nach weiteren Produktordnern gesucht)
    If Globals.isFolderDesignsFolder(folderPath) Then
    
        CDRFolderFound = True
        
        processDesignsFolder folderPath
    
    ' Rekursiv weitersuchen nach Produktordnern
    Else
        Dim folders As collection
        Set folders = Globals.getFoldersInFolder(folderPath)
    
        With ProgressBarUserForm.newSubProgress(folders.count)
            For i = 1 To folders.count
                processFolder folders(i)
                .setStepsProgress i
            Next i
            .finishProgress
        End With
    End If
    
End Function



' Der Ordner, wo alle Designordner und der [CDR] Ordner liegen
Private Function processDesignsFolder(ByVal folderPath As String)
    
    logger.addTab , "[Extractor2.processDesignFolder]. folderPath: " & folderPath
    
    Dim sizeFolder As New FSSizeFolder
    sizeFolder.init folderPath
    
    Dim i As Integer
    
    If extractCDRData Then
        Dim cdrFolderPath As String
        cdrFolderPath = sizeFolder.getCDRFolderPath
        If Globals.folderExists(cdrFolderPath) Then
            extractFiles newArrayList.AddRange(Globals.getDesignCDRsInFolder(cdrFolderPath))
        End If
    End If
    
    
    If extractFancyData Then
        If Globals.folderExists(sizeFolder.getFancyExportFolder) Then
            Dim exportFolders As ArrayList
            Set exportFolders = sizeFolder.getFancyCustomizationPathAny
            
            For i = 1 To exportFolders.count
                extractFiles newArrayList.AddRange(Globals.getFilesPathWithExtensionInFolder(exportFolders.item(i), "zip"))
            Next i
        End If
    End If
    
    
    sizeFolder.searchDesignsFiles
    With ProgressBarUserForm.newSubProgress(sizeFolder.getDesignFilesSize)
        For i = 1 To sizeFolder.getDesignFilesSize
            .setDisplayText sizeFolder.getDesignFiles(i).getProductID
            processDesignFiles sizeFolder.getDesignFiles(i)
            .setStepsProgress i
        Next i
        .finishProgress
    End With
    
ExitFunction:
    logger.removeTab
End Function



Private Function processDesignFiles(designFiles As FSDesignFiles)
    
    logger.addTab , "[Extractor2.processDesignFiles]. designFiles: '" & designFiles.getProductID & "'"
    
    
    If extractProductImages Then
        extractFiles designFiles.getProductImagePathsAny
    End If
    
    If extractAmazonKonfiData Then
        extractFiles designFiles.getAmazonExportFilesPathAny
    End If
    
    If extractAmazonImportData Then
        extractFiles designFiles.getAmazonImportCDRsPathAny
    End If
    
ExitFunction:
    logger.removeTab
End Function




Private Function getDestinationFileOrFolderPath(fileOrFolderPath As String) As String

    Dim result As String

    ' Wenn der zu kopierende Ordner in C:\Source\OrdnerDavor\Design-D1\Bild1.png liegt und 'sourcePath' "C:\Source" ist,
    ' dann soll nicht nur der "Design-D1" Ordner kopiert werden, sondern auch der "OrdnerDavor"
    ' Extrahiert also von "C:\Source\OrdnerDavor\Design-D1\Bild1.png" -> "OrdnerDavor\Design-D1\Bild1.png"
    Dim pathAfterSourceFolder As String
    If keepFolderStructure Then
        pathAfterSourceFolder = (Right(fileOrFolderPath, Len(fileOrFolderPath) - Len(sourcePath)))
        
    Else
        If Globals.isFileOrFolder(fileOrFolderPath) Then
            ' Bei Dateien nur den "\Bild1.png" Teil nutzen
            pathAfterSourceFolder = "\" & Globals.getFileNameAndType(fileOrFolderPath)
        End If
    End If
    result = targetPath & pathAfterSourceFolder
    
    If Not Globals.isFileOrFolder(fileOrFolderPath) Then result = Globals.addBackslash(result)
    
    logger.logINFO "fileOrfolderPath: '" & fileOrFolderPath & "', getFolderPath: '" & getFolderPath(result) & "', pathAfterSourceFolder: '" & pathAfterSourceFolder & "'"
    
    getDestinationFileOrFolderPath = result
End Function


Private Function createDestinationFolderOrFileParentFolder(fileOrFolderDestinationPath As String)
    If Not extractType = deleteFolderType Then
        ' Überordner von der Datei oder dem Ordner erstellen, denn erst dann kann dort hin kopiert oder ausgeschnitten werden
        Globals.createFolder Globals.getParentPath(getFolderPath(fileOrFolderDestinationPath))
    End If
End Function



Private Function getFolderPath(ByVal fileOrFolderPath As String) As String
    getFolderPath = IIf(Globals.isFileOrFolder(fileOrFolderPath), Globals.getFolderFileAndType(fileOrFolderPath)(0), fileOrFolderPath)
End Function


Private Function extractFiles(files As ArrayList)
    Dim i As Integer
    For i = 1 To files.count
        extractFile files.item(i)
    Next i
End Function



Private Function extractFile(ByVal filePath As String, Optional ByVal fileDestinationFolderPath As String)
    logger.addTab , "[Extractor2.extractFile] filePath: '" & filePath & "'"
    
    If Not regexText = "" Then
        Dim fileName As String
        fileName = Globals.getFileName(filePath)
        
        If Not newRegexMatcher.SetPattern(regexText).Test(fileName) Then
            GoTo ExitFunction
        End If
    End If
    
    If fileDestinationFolderPath = "" Then
        fileDestinationFolderPath = getDestinationFileOrFolderPath(filePath)
    End If
    
    createDestinationFolderOrFileParentFolder fileDestinationFolderPath
    
    If Globals.fileExist(filePath) Then
        
        Select Case extractType
        Case copyFolderType
            Globals.copyPasteFile filePath, fileDestinationFolderPath, False, overWrite
        Case cutFolderType
            Globals.moveFile filePath, fileDestinationFolderPath, overWrite, False
        Case deleteFolderType
            Globals.deleteFile filePath
        End Select
    End If
    
ExitFunction:
    logger.removeTab
End Function


