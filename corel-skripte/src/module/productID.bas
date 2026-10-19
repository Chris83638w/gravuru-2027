Attribute VB_Name = "ProductID"
Option Explicit

' Autor:  Martin Afelt @ Gravuru
'



Private logger As New logger

Dim sizeFolder As FSSizeFolder
Dim productIDObj As New ProductIDObject
Dim renameDesignFolder As Boolean
Dim backwards As Boolean

Dim p_materialShortToFullNameCSVFile As MonitoredFile
Dim p_productLineShortToFullNameCSVFile As MonitoredFile


Enum ProductIDCountType
    DesignNumberCountType
    ImageVariantNumberCountType
    KeepCountType
End Enum

Dim countType As ProductIDCountType

Public Sub ShowProductIDDialog()
    Globals.showWarnings
    
    ProductIdDialog.init
    ProductIdDialog.Show vbModal
End Sub


Public Function createLogger() As logger
    Set createLogger = New logger
    createLogger.init "ProductID"
End Function


Public Function createProductID(productIDRawName As String, renameDesignFolder_ As Boolean, _
        Prefix As String, suffix As String, search As String, replacee As String, _
        Optional backwards_ As Boolean = False, Optional sortDesignsBefore As Boolean = False, _
        Optional productIDType As productIDType = NormalProductID, Optional renameRelatedProductImageVariants As Boolean = False, _
        Optional countType_ As ProductIDCountType)
    
    
    If Not Globals.debugHistory Then
        CorelScriptTools.BeginWaitCursor
        ActiveDocument.BeginCommandGroup "ProductID"
        If Not Globals.debugErrors Then On Error GoTo MacroError
    End If
    
    Globals.storeSelection
    
    
    startFunction productIDRawName, renameDesignFolder_, Prefix, suffix, search, replacee, createLogger, backwards_, sortDesignsBefore, productIDType, renameRelatedProductImageVariants, countType_
    
    
    Globals.restoreSelection
    
    If Not Globals.debugHistory Then Globals.endMacro True
    Exit Function
MacroError:     'Alle Fehler hier abfangen und die CommandGruppe beenden, damit man mit einem Schritt zurück gehen kann (STRG + Z)
    MsgBox Err.Description & ", " & Err.number, vbCritical
    Globals.endMacro True
End Function




Public Function startFunction(productIDRawName As String, renameDesignFolder_ As Boolean, _
        Prefix As String, suffix As String, search As String, replacee As String, logger_ As logger, _
        Optional backwards_ As Boolean = False, Optional sortDesignsBefore As Boolean = False, _
        Optional productIDType As productIDType = NormalProductID, Optional renameRelatedProductImageVariants As Boolean = False, _
        Optional countType_ As ProductIDCountType)
    
   
    
    startFunction_ProcessDesigns getSelectedDesigns, productIDRawName, renameDesignFolder_, Prefix, suffix, search, replacee, logger_, backwards_, sortDesignsBefore, productIDType, renameRelatedProductImageVariants, countType_
    
End Function


Private Function getSelectedDesigns() As ProductDesignRange
    Dim result As New ProductDesignRange
    result.AddRange Globals.getSelectedDesignsOrAll(ignoreMasterDesign:=False, ignoreMasterDesignIfNotExplicitlySelected:=True, ignoreRedDesignsToIgnore:=False, ignoreProductImageVariantDesigns:=False)
    
    Set getSelectedDesigns = result
End Function



Public Function startFunction_ProcessDesigns(designs As ProductDesignRange, productIDRawName As String, renameDesignFolder_ As Boolean, _
        Prefix As String, suffix As String, search As String, replacee As String, logger_ As logger, _
        Optional backwards_ As Boolean = False, Optional sortDesignsBefore As Boolean = False, _
        Optional productIDType As productIDType = NormalProductID, Optional renameRelatedProductImageVariants As Boolean = False, _
        Optional countType_ As ProductIDCountType)
    
    Set logger = logger_
    backwards = backwards_
    renameDesignFolder = renameDesignFolder_
    countType = countType_
    
    logger.logINFO "[ProductID.startFunction] productIDRawName: '" & productIDRawName & "', renameDesignFolder: '" & renameDesignFolder & _
        "', prefix: '" & Prefix & "', suffix: '" & suffix & "', search: '" & search & "', replacee: '" & replacee & _
        "', backwards: '" & backwards & "', sortDesignsBefore: '" & sortDesignsBefore & "', productIDType: '" & productIDType & "', renameRelatedProductImageVariants: '" & renameRelatedProductImageVariants & _
        "', countType: '" & countType & "'"
    
    
    If renameDesignFolder Then
        If Not Globals.isCDRInsideOfCDRFolder(ActiveDocument) Then
            logger.logINFO "Die aktuelle CDR ist nicht in einem [CDR]-Ordner. Deshalb können die Designordner nicht umbenannt werden. renameDesignFolder = False"
            renameDesignFolder = False
        Else
            Set sizeFolder = New FSSizeFolder
            sizeFolder.init Globals.getParentPath(ActiveDocument.filePath)
        End If
    End If
    
    
    
    
    Dim i, j As Integer
    
    
    ' Entweder möchte man den Designs eine neue Artikelnummer geben: "GD-S-30x20-D1"
    ' Oder man möchte, dass die vorhandene Artikelnummer verändert wird.
    ' Entweder mit search & replace oder auch prefix und suffix.
    ' Denn diese beiden Optionen sind in 2 Registerkarten aufgeteilt und nur eine Option kann gestartet werden
    Dim giveNewNameOrRenameGivenName As Boolean
    giveNewNameOrRenameGivenName = Not productIDRawName = ""
    
    productIDObj.setProductID productIDRawName
    
    
    
    ' Auswahl
    ' --------------------------------------
    logger.logINFO "Designs: '" & designs.count & "'"
    ' Rückwärts
    If backwards Then designs.reverse
    ' --------------------------------------
    
    
    If giveNewNameOrRenameGivenName Then
        ' Auswahl in Leserichtung sortieren
        ' ---------------------------------------
        ' Nur sortieren, wenn 'giveNewNameOrRenameGivenName' True ist,
        ' weil es die Option nur auf dem Reiter/Tab 'Erstellen' der GUI gibt
        If sortDesignsBefore Then
            logger.logINFO "Sortiere Auswahl in Leserichtung (Designs werden danach neu gesucht)"
            
            Dim designShapes As shapeRange
            Set designShapes = Globals.collectionToShapeRange(arrange.arrangeFunction(True, designs.ToDesignShapes.ToCollection))
            
            ' Achtung: Hier werden die Designs erneut gesucht  ! ! !
            Set designs = New ProductDesignRange
            designs.AddRange Globals.getDesignsFromShapes(designShapes, ignoreMasterDesign:=False, ignoreRedDesignsToIgnore:=False, ignoreProductImageVariantDesigns:=False)
            
        End If
        ' ---------------------------------------
    End If
    
    
    
    
    
    
    ' Neue Artikelnummern vormerken
    ' --------------------------------
    Dim newDesignNames As New collection
    Dim currentDesign As productDesign ' Wird mehrfach verwendet
    
    For i = 1 To designs.count
        
        Set currentDesign = designs.getDesign(i)
        
        ' Design-Name
        Dim currentDesignProductIDName As String
        
        
        If giveNewNameOrRenameGivenName Then ' Artikelnummer neu erstellen
            
            If productIDObj.getDesignNumber = -1 Then ' Keine Designnummer
                currentDesignProductIDName = productIDObj.getProductID
            Else
                Dim clone As ProductIDObject
                Set clone = productIDObj.clone
                
                
                Select Case countType
                    ' Die Designnummer soll fortlaufend erhöht werden
                    Case DesignNumberCountType
                        clone.setDesignNumber clone.getDesignNumber + newDesignNames.count
                    
                    ' Die Nummer der Produktbildvariante soll fortlaufend erhöht werden
                    Case ImageVariantNumberCountType
                        clone.setProductImageVariantNumber clone.getProductImageVariantNumber + newDesignNames.count
                        
                    ' Die Designnummer und die Nummer der Produktbildvariante soll gleich bleiben
                    Case KeepCountType
                        clone.setDesignNumber currentDesign.getProductIDObject.getDesignNumber
                        clone.setProductImageVariantNumber currentDesign.getProductIDObject.getProductImageVariantNumber
                        
                        ' Produktbildvarianten Nummer entfernen
                        If productIDType = NormalProductID Or productIDType = IgnoreProductID Then
                            clone.setNoProductImageVariantNumber
                        End If
                        
                End Select
                
                currentDesignProductIDName = clone.getProductID
            End If
            
            newDesignNames.add currentDesignProductIDName
            
        Else ' Vorhandene Artikelnummer umbenennen
            
            ' Wenn keine Artikelnummer beim aktuellen Design vorhanden ist, Design überspringen
            If Not currentDesign.getProductIDShape Is Nothing Then
                
                
                currentDesignProductIDName = currentDesign.getProductID
                
                ' Wenn search & replace durchgeführt werden soll
                If Not search = "" Then ' replacee darf ruhig leer sein
                    currentDesignProductIDName = replace(currentDesignProductIDName, search, replacee)
                End If
                currentDesignProductIDName = Prefix & currentDesignProductIDName & suffix
                
                If Not currentDesignProductIDName = "" Then
                    newDesignNames.add currentDesignProductIDName
                Else
                    designs.RemoveAt i ' Design entfernen !!
                    i = i - 1
                    logger.logINFO "- Design mit Artikelnummer '" & currentDesign.getProductID & "' wurde ignoriert," & _
                        " da die neue Artikelnummer leer währe: '" & currentDesignProductIDName & _
                        "'. Liegt vmtl. an search & replace, welche den ganzen Namen replaced haben. Search: '" & search & "', replace: '" & replacee & "'"
                End If
            End If
        End If
    
        Set currentDesign = Nothing
    Next i
    
    ' ZUGEHÖRIGE PRODUKBILDVARIANTEN MIT UMBENENNEN:
    ' ::::::::::::::::::::::::
    ' Wenn von Artikelnummern auch die dazugehörigen Produktbildvarianten umbenannt werden sollen.
    ' Z.B. soll "GT-S-30x20-D1" zu "GT-S-30x20-D2" umbenannt werden.
    ' Wenn es dann ein Design mit der Artikelnummer "GT-S-30x20-D1-3" gibt, dann soll es zu "GT-S-30x20-D2-3" umbenannt werden
    If renameRelatedProductImageVariants Then
        Dim designsSnapShot As collection ' Weil die Größe von 'designs' sich ändern könnte
        Set designsSnapShot = Globals.cloneCollection(designs.getArrayList.ToCollection)
        
        ' Achtung: Hier geht es nicht wirklich um nichtausgewählte Designs. Dies sind nur die restlichen Designs, aus dem Dokument, welche nicht verarbeitet werden sollen.
        ' Das kann natürlich auch dadurch entstehen, dass sie nicht ausgewählt wurden
        Dim unselectedProductImageVariantDesigns As ProductDesignRange
        Set unselectedProductImageVariantDesigns = getUnselectedProductImageVariantDesigns(designs)
        
        logger.logINFO "Nichtbeachtete Produktbildvarianten-Designs: '" & unselectedProductImageVariantDesigns.count & "'"
        
        Dim dummyProductIDObj As New ProductIDObject
        For i = 1 To designsSnapShot.count
            Set currentDesign = designsSnapShot(i)
            
            ' Nur wenn ein Design selbst keine Produktbildvariante ist, kann es dazugehörige Produkblidvarianten haben
            If Not currentDesign.isProductImageVariant Then
                Dim currentUnselectedDesign As productDesign
                For j = 1 To unselectedProductImageVariantDesigns.count
                    Set currentUnselectedDesign = unselectedProductImageVariantDesigns.getDesign(j)
                    If currentUnselectedDesign.isProductImageVariant And Not Globals.isDesignCollectionHavingProductID(designsSnapShot, currentUnselectedDesign.getProductID) Then
                        ' Wenn die Artikelnummer von einem der ausgewählten Designs (z.B: "GT-S-30x20-D1") die selbe ist wie die von einem der nichtausgewählten Designs OHNE Design-Element-Varianten-Nummer (z.B: "GT-S-30x20-D1-2" -> "GT-S-30x20-D1")
                        If currentDesign.getProductID = dummyProductIDObj.setProductID(currentUnselectedDesign.getProductID).setNoProductImageVariantNumber.getProductID Then
                            dummyProductIDObj.setProductID newDesignNames(i)
                            dummyProductIDObj.setProductImageVariantNumber dummyProductIDObj.clone.setProductID(currentUnselectedDesign.getProductID).getProductImageVariantNumber
                            newDesignNames.add dummyProductIDObj.getProductID
                            designs.add currentUnselectedDesign
                            logger.logINFO "Produktbildvariante von '" & currentDesign.getProductID & "' hinzugefügt: '" & currentUnselectedDesign.getProductID & "'. Neuer Name: '" & newDesignNames(newDesignNames.count) & "'"
                        End If
                    End If
                    Set currentUnselectedDesign = Nothing
                Next j
            End If
            
            Set currentDesign = Nothing
        Next i
    End If
    
    logger.logINFO ""
    ' --------------------------------

    
    
    If designs.count = 0 Then
        logger.logFATAL "- Keine Designs gefunden. Abbruch!"
        Globals.endMacro
    End If
    
    
    ' Prüfen, ob eine der neuen Artikelnummernamen bereits im Dokument vorhanden ist
    ' Natürlich nur bei den Designs prüfen, die nichtbrachtet/nicht ausgewählt wurden und Ihren Namen behalten sollen
    ' --------------------------------
    Dim unselectedDesigns As ProductDesignRange
    Set unselectedDesigns = getUnselectedDesigns(designs)
    
    For i = 1 To newDesignNames.count
        If Globals.isDesignCollectionHavingProductID(unselectedDesigns.getArrayList.ToCollection, newDesignNames(i)) Then
            MsgBox "Die Artikelnummer '" & newDesignNames(i) & "' ist bereits im Dokument bei einem Design vorhanden!", vbExclamation
            Globals.endMacro
        End If
    Next i
    ' --------------------------------
    
    ' Umbenennen der Daten
    If renameDesignFolder Then
        sizeFolder.renameDesigns designs.getArrayList.ToCollection, newDesignNames  ', logger:=logger  ' Loggen kann das Skript hier stark verlangsamen
    End If
    
    ' Umbenennen in der CDR die gerade geöffnet ist
    With ProgressBarUserForm.newSubProgress(designs.count)
        .setDisplayText "Design "
        
        For i = 1 To designs.count
            processDesign designs.getDesign(i), newDesignNames(i), productIDType
        Next i
    
        .finishProgress
    End With
    
End Function




Private Function getUnselectedDesigns(selectedDesigns As ProductDesignRange) As ProductDesignRange
    Dim unselectedDesigns As New ProductDesignRange
    unselectedDesigns.AddRange Globals.getAllDesigns(ignoreMasterDesign:=False, ignoreRedDesignsToIgnore:=False, ignoreProductImageVariantDesigns:=False)
    
    ' Ausgewählte Designs von 'unselectedDesigns' subtrahieren, damit dort alle nichtausgewählten Designs drin sind
    Dim i As Integer
    For i = unselectedDesigns.count To 1 Step -1
        If Globals.isDesignCollectionHavingProductID(selectedDesigns.getArrayList.ToCollection, unselectedDesigns.getDesign(i).getProductID) Then
            unselectedDesigns.RemoveAt i
        End If
    Next i
    
    Set getUnselectedDesigns = unselectedDesigns
End Function


Private Function getUnselectedProductImageVariantDesigns(selectedDesigns As ProductDesignRange) As ProductDesignRange
    
    Dim unselectedDesigns As New ProductDesignRange
    unselectedDesigns.AddRange Globals.getAllDesigns(ignoreMasterDesign:=True, ignoreNormalDesigns:=True, ignoreRedDesignsToIgnore:=True, ignoreProductImageVariantDesigns:=False)
    
    ' Ausgewählte Designs von 'unselectedDesigns' subtrahieren, damit dort alle nichtausgewählten Designs drin sind
    Dim i As Integer
    For i = unselectedDesigns.count To 1 Step -1
        If Globals.isDesignCollectionHavingProductID(selectedDesigns.getArrayList.ToCollection, unselectedDesigns.getDesign(i).getProductID) Then
            unselectedDesigns.RemoveAt i
        End If
    Next i
    
    Set getUnselectedProductImageVariantDesigns = unselectedDesigns
End Function




Private Function processDesign(design As productDesign, newDesignName As String, ByVal productIDType As productIDType)
    
    logger.addTab , "[ProductID.processDesign] design: '" & design.getProductID & "', newDesignName: '" & newDesignName & "'"
    
    If newDesignName = "" Then
        Err.Raise vbObjectError + 513, , "[ProductID.processDesign] 'newDesignName' darf nicht leer sein "
    End If
    
    Dim oldProductID As String
    oldProductID = design.getProductID
    
    If Not design.getProductID = "" Then
        If productIDType = Keep Then
            If design.isNormalDesign Then
                productIDType = NormalProductID
            ElseIf design.isRedDesignToIgnore Then
                productIDType = IgnoreProductID
            Else
                productIDType = ProductImageVariantProductID
            End If
        End If
        
        design.getProductIDShape.delete
        design.invalidateProductIDShape
    
    ElseIf productIDType = Keep Then
        ' Wenn noch keine Artikelnummer vorhanden ist und in der GUI angegeben wurde, dass der Typ beibehalten werden soll.
        productIDType = NormalProductID
    End If
    
    ' Es kann sein, dass 'productIDType' = NormalProductID ist aber auch die dazugehörigen Produktbilder-Varianten umbenannt werden sollen
    ' Dann kann es sein, dass 'productIDType' zwar NormalProductID ist, aber die Artikelnummer 'GT-S-30x20-D1-2' ist und blau sein muss
    Dim dummyProductIDObj As New ProductIDObject
    dummyProductIDObj.setProductID newDesignName
    If dummyProductIDObj.hasProductImageVariantNumber Then
        productIDType = ProductImageVariantProductID
    End If
    
    ' Artikelnummer erstellen und positionieren
    design.getProductIDShape True, productIDType, dummyProductIDObj.getProductID
    design.positionMetadataShapes
    
    
    logger.removeTab
End Function









Public Function removeItemID()

    Dim selection As shapeRange
    Set selection = ActiveSelectionRange
    
    Dim i, j As Integer
    
    If Not selection Is Nothing And Not selection.count = 0 Then
        For i = 1 To selection.count
            processDesignShapeForRemoving selection(i)
        Next i
    Else
        For i = 1 To ActiveDocument.Pages.count
           
            For j = 1 To ActiveDocument.Pages(i).shapes.count
                 processDesignShapeForRemoving ActiveDocument.Pages(i).shapes(j)
            Next j
            
        Next i
    End If
End Function



Private Function processDesignShapeForRemoving(designShape As shape)
    
    If Not designShape.Type = cdrGroupShape Then
        Exit Function
    End If
    
    Dim productIDText As shape
    Set productIDText = Globals.findProductIDShape(designShape)
    
    If Not productIDText Is Nothing Then
        productIDText.delete
    End If
    

End Function


Public Function getMaterialShortToFullNameCSVFile() As MonitoredFile
    If p_materialShortToFullNameCSVFile Is Nothing Then
        Set p_materialShortToFullNameCSVFile = New MonitoredFile
        p_materialShortToFullNameCSVFile.newMonitoredFile (getMaterialShortToFullNameCSVFilePath)
    End If
    Set getMaterialShortToFullNameCSVFile = p_materialShortToFullNameCSVFile
End Function

Public Function getProductLineShortToFullNameCSVFile() As MonitoredFile
    If p_productLineShortToFullNameCSVFile Is Nothing Then
        Set p_productLineShortToFullNameCSVFile = New MonitoredFile
        p_productLineShortToFullNameCSVFile.newMonitoredFile (getProductLineShortToFullNameCSVFilePath)
    End If
    Set getProductLineShortToFullNameCSVFile = p_productLineShortToFullNameCSVFile
End Function

Public Function getProductLineShortToFullNameCSVFilePath() As String
    getProductLineShortToFullNameCSVFilePath = getCSVDataFilePath("ProductLineNames")
End Function

Public Function getMaterialShortToFullNameCSVFilePath() As String
    getMaterialShortToFullNameCSVFilePath = getCSVDataFilePath("MaterialNames")
End Function

Private Function getCSVDataFilePath(csvFileName As String) As String
    getCSVDataFilePath = ProductIdDialog.getDataFolder() & csvFileName & ".csv"
End Function


Public Function getMaterialFullName(materialShort As String) As String
    getMaterialFullName = getSiblingCellInOtherRow(getMaterialShortToFullNameCSVFile.getDataCSV.getStringArrayList2D, materialShort, 1, 0)
End Function

Public Function getMaterialShortName(materialName As String) As String
    getMaterialShortName = getSiblingCellInOtherRow(getMaterialShortToFullNameCSVFile.getDataCSV.getStringArrayList2D, materialName, 0, 1)
End Function

Public Function getProductLineFullName(productLineShort As String) As String
    getProductLineFullName = getSiblingCellInOtherRow(getProductLineShortToFullNameCSVFile.getDataCSV.getStringArrayList2D, productLineShort, 1, 0)
End Function

Private Function getSiblingCellInOtherRow(csvData As ArrayList2D, cellNameToFind As String, cellColumn As Integer, siblingCellColumn As Integer) As String
    Dim index As Long
    index = csvData.IndexOfStringInColumns(cellNameToFind, StringEquals, False, newArrayList.add(cellColumn))
    
    If Not index = -1 Then
        getSiblingCellInOtherRow = csvData.item(index, siblingCellColumn)
    End If
End Function



