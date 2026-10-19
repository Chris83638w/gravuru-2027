Attribute VB_Name = "FancyExportPackage"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
Option Explicit

' Autor: Martin Afelt @ Gravuru
'
' C# TODO in eine Baseklasse und zwei erbenden Klassen die FancyExportPackageType darstellen umsetzen
' Damit lassen sich dann auch die IDs besser trennen


Dim logger As logger

Enum FancyExportPackageType
    CustomizationPackage
    LayoutPackage
End Enum

Public packageType As FancyExportPackageType
Private confiEx As ConfiExport

Private folderPath As String
Private zipTargetPath As String
Private packageName As String ' Der Name für den Ordner in der zunächst die Dateien kommen, der Name der JSON und der ZIP
Private internalName As String
Private variaType As variantType

' ID
' Setzt sich aus folgenden Zahlenketten zusammen. Bspw. 11111-2-33-44
' 11111 die Nummer der Customization
' 2: Die Nummer der Customization-View
' 33: Die Nummer des Layouts
' 44: Die Nummer der Layout-View
'
Public shortID As Long ' Customizations: 1 - 99999, Layouts: 1 - 99
Public id As Long ' Customizations: 9999900000, Layouts: 9999900100
Private layoutIDCounter As Integer ' Nutzt nur Customization für Child Layouts: 1 - 99
Private viewIDCounter As Integer ' Customizations: 1-9, Layouts: 1-99

' JSON
Public jsonDict As New Dictionary ' TODO umbenennen zu jsonMain
    Public jsonConfiOptions As New Dictionary
        Private jsonLayoutIds As collection ' Gibt es nur bei Customizations
        Private jsonLayoutViewDependencies As New Dictionary
    Public jsonViews As New collection


Private views As New ArrayList ' Beinhaltet FancyExportViews


Private Sub Class_Initialize()
    layoutIDCounter = 1
    viewIDCounter = 1
End Sub


Private Function addDefaultHeader()
     ' Default Header
    With jsonDict
        If Not internalName = "" Then .add "internal_name", internalName
        .add "options", jsonConfiOptions
        With jsonConfiOptions
            .add "layoutViewDependencies", jsonLayoutViewDependencies
        End With
        .add "categories", New collection
        .add "fancyExportVersion", Globals.getVersion.versionString
        .add "views", jsonViews
    End With
End Function



Public Function initAsCustomization(title As String, packageName_ As String, longID As Long, confiEx_ As ConfiExport, exportName As String, Optional internalName_ As String, Optional logger_ As logger)
    Set logger = logger_
    
    shortID = CInt(longID / 100000) ' Von Long zu Short. Von 100.000 zu 1
    If shortID < 1 Then Err.Raise vbObjectError + 513, , "[FancyExportPackage.initAsCustomization] 'shortID' darf nicht unter 1 sein!"
    If shortID > 99999 Then Err.Raise vbObjectError + 513, , "[FancyExportPackage.initAsCustomization] 'shortID' darf nicht über 99999 sein!"
    id = shortID * 100000
    
    packageType = CustomizationPackage
    Set confiEx = confiEx_
    internalName = internalName_
    setPackageName packageName_
    
    init Me, exportName
    
    With jsonDict
        .add "title", title
        .add "thumbnail", createCustomizationThumbnailAndGetFileNameWithType
        .add "type", "catalog" ' Catalog bedeutet Customization (nicht Layout oder so)
        .add CUSTOMIZATION_ID_KEY_NAME, id
        
        addDefaultHeader
        
        With jsonConfiOptions
            Set jsonLayoutIds = New collection ' Nur hier initialisieren, da es in Layouts nicht genutzt wird. Nur in Customizations
            .add "layout_ids", jsonLayoutIds
        End With
    End With
    
    
End Function


Public Function initAsLayout(title As String, packageName_ As String, customization As FancyExportPackage, exportName As String, Optional internalName_ As String, Optional variaType_ As variantType, Optional logger_ As logger)
    Set logger = logger_
    
    shortID = customization.getNextLayoutID
    If shortID < 1 Then Err.Raise vbObjectError + 513, , "[FancyExportPackage.initAsCustomization] 'shortID' darf nicht unter 1 sein!"
    If shortID > 99 Then Err.Raise vbObjectError + 513, , "[FancyExportPackage.initAsCustomization] 'shortID' darf nicht über 99 sein!"
    id = customization.id + shortID * 100
    
    packageType = LayoutPackage
    internalName = internalName_
    setPackageName packageName_
    variaType = variaType_
    
    init customization, exportName
    
    customization.linkLayoutPackage Me
    
    With jsonDict
        .add "title", title
        ' Thumbnail wird von der ersten Child View gesetzt. Bspw. Design 1 oder Befestigung ohne
        .add "type", "layout"
        .add CUSTOMIZATION_ID_KEY_NAME, id
        
        addDefaultHeader
        
        
    End With
End Function


Private Function init(customization As FancyExportPackage, exportName As String)
    
    Dim zipTempPath As String
    ' TODO Globalen Zustand 'ConfiHelper.designFiles' lieber in die confiEx_ speichern
    zipTempPath = ConfiHelper.designFiles.sizeFolder.getFancyCustomizationZIPTempPath(customization.id, exportName)
    
    folderPath = zipTempPath & packageName & "\"
    zipTargetPath = ConfiHelper.designFiles.sizeFolder.getFancyCustomizationPath(customization.id, exportName) & packageName & ".zip"
    
    ' TODO DEBUG RELEASE !!!!!!!!!!!!!!!!!!!!! Das muss eig der ConfiHelper machen unter ".deleteOldConfiData"
    Globals.deleteFolderContents folderPath
End Function


Public Function setPackageName(packageName_ As String)
    If packageName_ = "" Then Err.Raise vbObjectError + 513, , "[FancyExportPackage.initAsCustomization] 'packageName_' darf nicht leer sein!"
    packageName = id & " " & packageName_
End Function


Public Function setThumbnailFile(fileNameWithType As String)
    Globals.addToDictionaryAtIndex jsonDict, "thumbnail", fileNameWithType, 2 ' 2 weil nach dem Titel
End Function


Public Function getNextLayoutID()
    If Not packageType = CustomizationPackage Then Err.Raise vbObjectError + 513, , "[FancyExportPackage.getNextLayoutID] Dies ist kein CustomizationPackage"
    If layoutIDCounter > 99 Then Err.Raise vbObjectError + 513, , "[FancyExportPackage.getNextLayoutID] 'layoutIDCounter' ist größer als 99"
    getNextLayoutID = layoutIDCounter
    layoutIDCounter = layoutIDCounter + 1
End Function


Public Function getNextViewID()
    
    Select Case packageType
        Case CustomizationPackage
            ' Limitieren auf 9 Views
            If viewIDCounter > 9 Then Err.Raise vbObjectError + 513, , "[FancyExportPackage.getNextViewID] 'viewIDCounter' ist größer als 9"
        Case LayoutPackage
            ' Limitieren auf 99 Designs (o.Ä)
            If viewIDCounter > 99 Then Err.Raise vbObjectError + 513, , "[FancyExportPackage.getNextViewID] 'viewIDCounter' ist größer als 99"
    End Select
    
    
    getNextViewID = viewIDCounter
    viewIDCounter = viewIDCounter + 1
End Function


Public Function getFolderPath() As String
    getFolderPath = folderPath
End Function

Public Function linkLayoutPackage(package As FancyExportPackage)
    If Not package.packageType = LayoutPackage Then
        Err.Raise vbObjectError + 513, , "[FancyExportPackage.linkLayoutPackage] 'package' ist kein LayoutPackage"
    End If
    
    jsonLayoutIds.add package.id
End Function


' Die 'triggerView' schaltet beim auswählen im Fancy die 'availableView' frei
' Bspw.: Edelstahlrahmen Auswahl schaltet Designs mit Rahmen frei (welche kleiner sind wegen dem Rahmen)
' triggerView.getViewID = 111
' availableView.getLayoutID = 55
' availableView.getViewID = 125
' JSON:
'"layoutViewDependencies": {
'   "111": {
'       "55": [
'           125
'       ]
'   }
'}
'
' 'addEmptyDependencyForSiblingViews' gibt an, ob alle anderen Geschwister-Views (bspw. alle Designs) eine leere Viewdependecie bekommen. Denn ohne ViewDependecy hätte die anderen Designs die 'availableView' automatisch.
' Beispiel:
' Designs:
' - D1
' - D2
' Befestigung:
' - 2 Bohrlöcher (Nur bei D1)
'
' Wenn 'addEmptyDependencyForSiblingViews' aus ist und wir D1 sagen, dass wenn du ausgewählt bist, dass dann 2 Bohrlöcher verfügbar sind, dann sagen wir bei D2 garnichts, weshalb dort alle Befestigungen verfügbar wären
' 'addEmptyDependencyForSiblingViews' = True löst genau das Problem
Public Function addLayoutViewDependency(triggerView As FancyExportView, availableView As FancyExportView, Optional addEmptyDependencyForSiblingViews As Boolean = True)
    If Not logger Is Nothing Then logger.addTab , "[FancyExportPackage.addLayoutViewDependency]"
    
    If Not logger Is Nothing Then logger.logINFO "triggerView: '" & triggerView.getTitle & "', ID: '" & triggerView.getViewID & "', availableView: '" & availableView.getTitle & "', ID: '" & availableView.getViewID & "'"
        
    Dim avaiableViewContainer As collection
    Set avaiableViewContainer = getAvailableViewContainer(triggerView, availableView)
    
    If addEmptyDependencyForSiblingViews Then
        Dim i As Integer
        ' 'triggerView' ist eine View aus diesen 'views'
        For i = 1 To getViewCount
            ' Cachen
            getAvailableViewContainer getView(i), availableView
        Next i
    End If
    
    avaiableViewContainer.add availableView.getViewID
    
    If Not logger Is Nothing Then logger.removeTab
End Function


' Gibt den Container für die 'availableView' zurück.
' Also alles in "55"
Private Function getAvailableViewContainer(triggerView As FancyExportView, availableView As FancyExportView) As collection
    Dim triggerViewContainer As Dictionary
    Set triggerViewContainer = getTriggerViewContainer(triggerView)
    
    Dim layoutID As Long
    layoutID = availableView.getLayoutID
    
    If Not triggerViewContainer.Exists(layoutID) Then triggerViewContainer.add layoutID, New collection
    
    Set getAvailableViewContainer = triggerViewContainer.item(layoutID)
End Function


' Gibt den Container für die 'triggerView' zurück.
' Also alles in "111"
Private Function getTriggerViewContainer(triggerView As FancyExportView) As Dictionary
    If Not logger Is Nothing Then logger.addTab , "[FancyExportPackage.getTriggerViewContainer]"
    If Not views.Contains(triggerView) Then Err.Raise vbObjectError + 513, , "[FancyExportPackage.addLayoutViewDependency] 'triggerView' ist keine view dieses Packages"
    
    Dim viewID As Long
    viewID = triggerView.getViewID
    
    ' Sicherstellen, dass ein Dictionary für viewID vorhanden ist
    If Not jsonLayoutViewDependencies.Exists(viewID) Then
        jsonLayoutViewDependencies.add viewID, New Dictionary
        If Not logger Is Nothing Then logger.logINFO "Neue Dictionary für '" & triggerView.getTitle & "' hinzugefügt!"
    End If
    
    Set getTriggerViewContainer = jsonLayoutViewDependencies(viewID)
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function addView(view As FancyExportView)
    views.add view
    jsonViews.add view.getJson
End Function


Public Function getView(viewIndex As Integer) As FancyExportView
    Set getView = views.item(viewIndex)
End Function

Public Function getViewCount() As Integer
    getViewCount = views.count
End Function


Public Function getVariantType() As variantType
    getVariantType = variaType
End Function


Public Function getPackageName() As String
    getPackageName = packageName
End Function


Private Function createCustomizationThumbnailAndGetFileNameWithType() As String
    
    ' Exportformen finden:
    ' Alle Layer aus allen Views
    ' --------------
    Dim shapesToExport As New shapeRange
    shapesToExport.AddRange confiEx.views.layersFlattened.newCustomShapeTypeQuery(DesignElementShapeType).search
    shapesToExport.AddRange confiEx.views.layersFlattened.newCustomShapeTypeQuery(VisualElementShapeType).search
    ' --------------
    
    ' Muss kopiert werden, denn wenn man die Shapes neben ihren Siblings kopiert, berechnet Corel die BoundingBox falsch :(
    Set shapesToExport = Globals.copyPasteShapeRange(shapesToExport)
    Globals.setShapeRangeName shapesToExport, "FancyExportPackage.createCustomizationThumbnailAndGetFileNameWithType.shapesToExport"
    
    createCustomizationThumbnailAndGetFileNameWithType = newShapeExportInZIPFolder(shapesToExport, "thumbnail", cdrPNG).addShapesToDeleteAfterExport(shapesToExport).setPreferredWidth(150).setPreferredHeight(150).export(logger).finalExportFileNameWithType
End Function


Private Function newShapeExportInZIPFolder(shapeOrRange As Variant, fileName As String, fileType As cdrFilter) As ShapeExport
    Set newShapeExportInZIPFolder = newShapeExport(shapeOrRange, getFolderPath & fileName, fileType).setPreventFileOverride(True)
End Function



Private Function createJson()
    Globals.saveTextFileUTF8 JSON.toJSON(jsonDict), folderPath & packageName & ".json"
End Function



Private Function createZIP()
    
'    logger.logINFO "Zippe Quellordner: '" & zipSourceFolder & "' in den Ordner: '" & Globals.getParentPath(zipFilePath) & "' als '" & Globals.getFolderName(zipFilePath) & "'"
    
    If Not FancyExport.debug_zipping_off Then
        Globals.zipFolder folderPath, zipTargetPath  ' Ordner-Zip kann nicht im Ordner selbst erstellt werden. Deshalb wird der Überordner genommen ...
        If Not logger Is Nothing Then logger.logINFO "Lösche nach dem zippen : '" & folderPath & "'"
        Globals.deleteFolder folderPath
    End If
End Function


Public Function finish()
    createJson
    createZIP
End Function



