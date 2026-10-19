Attribute VB_Name = "Classfactory"
Option Explicit

' Autor: Martin Afelt @ Gravuru


Public Function newFSSizeFolder(Optional sizeFolderPath As String, Optional designFolderPath As String, Optional doc As document) As FSSizeFolder
    Set newFSSizeFolder = New FSSizeFolder
    newFSSizeFolder.init sizeFolderPath, designFolderPath, doc
End Function

Public Function newFSDesignFiles(sizeFolder As FSSizeFolder, productID As String, folderPath As String) As FSDesignFiles
    Dim desFiles As New FSDesignFiles
    desFiles.newDesignFiles sizeFolder, productID, folderPath
    Set newFSDesignFiles = desFiles
End Function


Public Function newLogger(logFileName As String, Optional writeToLogFile As Boolean = True, Optional logLevelVar As logLevel = logLevel.All) As logger
    Set newLogger = New logger
    newLogger.init logFileName, writeToLogFile, logLevelVar
End Function


Public Function newArrayList() As ArrayList
    Set newArrayList = New ArrayList
End Function


Public Function newProductDesignPart(design As productDesign, partIndex As Integer) As ProductDesignPart
    Dim newPart As New ProductDesignPart
    newPart.init design, partIndex
    Set newProductDesignPart = newPart
End Function


Public Function newCustomShapeTypeQuery(shapeOrRange As Variant, shapeType As customShapeType) As CustomShapeTypeQuery
    Dim shapeQuery As New CustomShapeTypeQuery
    shapeQuery.init shapeOrRange, shapeType
    Set newCustomShapeTypeQuery = shapeQuery
End Function


Public Function newRegexMatcher() As RegexMatcher
    Set newRegexMatcher = New RegexMatcher
End Function



Public Function newShapeExport(Optional shapeOrRange As Variant, Optional path As String, Optional fileType As cdrFilter) As ShapeExport
    Set newShapeExport = New ShapeExport
    newShapeExport.init shapeOrRange, path, fileType
End Function


Public Function newPlaceFileParameters() As PlaceFileParameters
    Set newPlaceFileParameters = New PlaceFileParameters
End Function


Public Function newProductIDObject() As ProductIDObject
    Set newProductIDObject = New ProductIDObject
End Function

