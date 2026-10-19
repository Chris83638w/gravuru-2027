Attribute VB_Name = "Extractor"

' Autor: Martin Afelt GRAVURU


Dim exportAsProductWithDesigns As Boolean 'Entweder 'Product with Designs' oder 'Product with Childs'

Dim fso As fileSystemObject

Dim folder As String
Dim exportFolder As String

Dim defaultDesignFound As Boolean
Dim boundedUploadBoxFoundInView() As Boolean
Dim groundplateVariantFoundInView() As Boolean


Sub Show()

    Start
    
End Sub



Sub Start()
    
    ' Init
    ' ------------
    defaultDesignFound = False
    
    ReDim boundedUploadBoxFoundInView(0)
    ReDim groundplateVariantFoundInView(0)
    
    'TODO DEBUG
    exportAsProductWithDesigns = True
    
    If fso Is Nothing Then
        Set fso = Globals.fileSystemObject
    End If
    ' ------------
    
    
    
    'folder = "V:\Produkte\Wandbilder\Personalisiert\Acryl\20x30\"
    'folder = "C:\Users\GRAVURU 2\Desktop\Extractor Test\4"
    folder = CorelScriptTools.GetFolder(, "Produktgruppenordner finden...")
    
    If folder = "" Then
        Globals.endMacro
    End If
    
    If Not Globals.folderExists(folder & "\[CDR]\") Then
        MsgBox "Der angegebene Ordner enthält keinen [CDR] Ordner. Scheinbar ist er nicht von der neuen Struktur!", vbCritical
        Globals.endMacro
    End If
    
    exportFolder = folder & "\[Amazon]\Vorschau\" & IIf(exportAsProductWithDesigns, "Designauswahl\", "Einzeln\") 'TODO Viewordner
    
    ' Vorherige Daten löschen
    Globals.deleteFolder (exportFolder)
    Globals.createFolder exportFolder
    
    
    Dim folders As collection
    Set folders = Globals.getFoldersInFolder(folder)
    
    Dim folderName As String
    
    For i = 1 To folders.count
        folderName = fso.GetFolder(folders.item(i)).name
        
        If Not Globals.startsWith(folderName, "[") Then
            searchUploadBoxInDesignFolder folders.item(i), folderName, i
        Else
            folderWithBrackeysFound = True
        End If
    Next i
    
    
    For i = 1 To folders.count
        
        folderName = fso.GetFolder(folders.item(i)).name
        
        If Not Globals.startsWith(folderName, "[") Then
            processDesignFolder folders.item(i), folderName
        End If
        
    Next i
    
    
    If Not defaultDesignFound Then
        MsgBox "Es wurde kein Ordner für das Standartdesign gefunden. Wahrscheinlich wurde es noch nicht für den Amazonkonfigurator exportiert.", vbCritical
        Globals.endMacro
    End If
    
    
    MsgBox "Fertig", vbInformation
    
End Sub



Private Function searchUploadBoxInDesignFolder(folderPath As String, productID As String, ByVal folderIndex As Integer)
    
    Dim viewFolders As collection
    Set viewFolders = getViewFolders(folderPath)
    
    If viewFolders Is Nothing Then
        MsgBox "Das Design " & productID & " wurde noch nicht mit dem Amazonexport exportiert!", vbCritical
        Globals.endMacro
    End If

    For i = 1 To viewFolders.count
        
        ' Falls das Array von der Größe kleiner ist als die Viewfolders
        If UBound(boundedUploadBoxFoundInView) < i Then
            ReDim Preserve boundedUploadBoxFoundInView(i) As Boolean
            boundedUploadBoxFoundInView(i) = False
        End If
        '
        If UBound(groundplateVariantFoundInView) < i Then
            ReDim Preserve groundplateVariantFoundInView(i) As Boolean
            groundplateVariantFoundInView(i) = False
        End If
    
    
        If searchUploadBoxInView(viewFolders(i), productID) Then

            boundedUploadBoxFoundInView(i) = True
            
            If isArrayOnlyTrue(boundedUploadBoxFoundInView) Then
                ' In allen Views gibt es begrenzte Uploadboxen.
                ' Suche kann dann abgebrochen werden
                Exit Function
            End If
        
        End If
        
        
        ' Nur 1x im Standartdesign suchen...
        If folderIndex = 1 Then
            If searchVariableGroundPlateFolderInView(viewFolders(i)) Then
                
                groundplateVariantFoundInView(i) = True
            End If
        End If
    Next i
    
End Function

Private Function isArrayOnlyTrue(arr() As Boolean)
    
    For i = 1 To UBound(arr)
        If Not arr(i) Then
            isArrayOnlyTrue = False
            Exit Function
        End If
    Next i
    
    isArrayOnlyTrue = True
    
End Function



Private Function searchUploadBoxInView(viewFolderPath As String, productID As String) As Boolean
    
    Dim jsonPath As String
    jsonPath = viewFolderPath & "\AmazonInfo.json"
    
    If Globals.fileExist(jsonPath) Then
        
        Dim jSONOutput As Dictionary
        
        
        Dim jsonString As String
        jsonString = Globals.loadFileAsStringFromUTFEight(jsonPath)
        
        Set jSONOutput = JSON.Parse(jsonString)
        
        Dim uploadBoxes As Dictionary
        Set uploadBoxes = jSONOutput.item("uploadboxen")
        
        If uploadBoxes.count > 0 Then
            
            For i = 1 To uploadBoxes.count
                If uploadBoxes.Items(i - 1).item("bounded") Then
                    'MsgBox "UploadBox gefunden in " & productID
                    searchUploadBoxInView = True
                    Exit Function
                End If
            Next i
            
        End If
        
    End If
    
End Function


Private Function searchVariableGroundPlateFolderInView(viewFolderPath As String) As Boolean
    
    If Globals.folderExists(viewFolderPath & "\Variants\attr_color\") Then
        searchVariableGroundPlateFolderInView = True
    End If
    
End Function



Private Function getViewFolders(folderPath As String) As collection
    
    Dim FPD_AmazonFolder As String
    FPD_AmazonFolder = folderPath & IIf(Globals.endsWith(folderPath, "\"), "", "\") & "FPD_Amazon\"

    If Globals.folderExists(FPD_AmazonFolder & "\Ansicht_1") Then
        Set getViewFolders = Globals.getFoldersInFolder(FPD_AmazonFolder)
    End If
    
End Function


Private Function processDesignFolder(folderPath As String, folderName As String)
    
    Dim viewFolders As collection
    Set viewFolders = getViewFolders(folderPath)

    For i = 1 To viewFolders.count
        processDesignView viewFolders(i), folderName, i, boundedUploadBoxFoundInView(i), groundplateVariantFoundInView(i)
    Next i
    
End Function



Private Function processDesignView(viewFolderPath As String, productID As String, ByVal viewIndex As Integer, hasUploadBoxes As Boolean, hasGroundPlateVariants As Boolean)
    
    viewFolderPath = Globals.addBackslash(viewFolderPath)
    
    Dim viewExportPath As String
    viewExportPath = exportFolder & "\View_" & viewIndex & "\"
    
    Globals.createFolder viewExportPath
    Globals.createFolder viewExportPath & "Designs\"
    
    ' STANDARTDESIGN: Für das Standartdesign 'Dein Wunschtext' globale Bilder einmal kopieren
    '>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    If Globals.isProductIDMainDesign(productID) Then
        defaultDesignFound = True
        
        
        If (Not hasUploadBoxes) And hasGroundPlateVariants Then
                ' "\Variants\attr_color"
                
                ' Grundplattenauswahl (Grundplattenvariante ohne Design oder Uploadboxlöcher)
                ' --------------------------------------------------------------------------
                Dim groundPlateVariantsFolderPath As String
                groundPlateVariantsFolderPath = viewFolderPath & "Variants\attr_color\"
                
                For i = 1 To 50
                    
                    Dim groundPlateVariantsPath As String
                    groundPlateVariantsPath = groundPlateVariantsFolderPath & CStr(i)
                    Dim groundPlateVariantsPreviewPath As String
                    groundPlateVariantsPreviewPath = groundPlateVariantsPath & "_preview.jpg"
                    groundPlateVariantsPath = groundPlateVariantsPath & ".png"
                    
                    If Globals.fileExist(groundPlateVariantsPath) Then
                    
                        If Not Globals.folderExists(viewExportPath & "Grundplatten\") Then
                            Globals.createFolder (viewExportPath & "Grundplatten\")
                        End If
                        
                        fso.CopyFile groundPlateVariantsPath, viewExportPath & "Grundplatten\grundplatte_" & CStr(i) & ".png"
                        
                        If Globals.fileExist(groundPlateVariantsPreviewPath) Then
                            fso.CopyFile groundPlateVariantsPreviewPath, viewExportPath & "Grundplatten\grundplatte_" & CStr(i) & "_vorschau.jpg"
                        Else
                        
                        End If
                        
                    Else
                        i = 10000 ' Exit
                    End If
                
                Next i
                ' --------------------------------------------------------------------------
        
        End If
            
            
        ' Grundplatte (baseImage)
        ' -----------------------------------
        Dim baseImageOfViewPath As String
        baseImageOfViewPath = viewFolderPath & "baseImage.jpg"
        
        If Globals.fileExist(baseImageOfViewPath) Then
            fso.CopyFile baseImageOfViewPath, viewExportPath & "baseImage.jpg"
        Else
            MsgBox "Das baseImage wurde nicht gefunden: '" & baseImageOfViewPath & "'", vbCritical
            Globals.endMacro
        End If
        ' -----------------------------------
            
        
        ' Maske (maskImage)
        ' -----------------------------------
        Dim maskImageOfViewPath As String
        maskImageOfViewPath = viewFolderPath & "maskImage.png"
        
        If Globals.fileExist(maskImageOfViewPath) Then
            fso.CopyFile maskImageOfViewPath, viewExportPath & "maskImage.png"
        Else
            MsgBox "Das maskImage wurde nicht gefunden: '" & maskImageOfViewPath & "'", vbCritical
            Globals.endMacro
        End If
        ' -----------------------------------
        
        
        
        
        
    Else
    'DESIGNSPEZIFISCHE BILDER KOPIEREN
    '>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
        
        
        
        'Designnummer extrahieren 'WBP-A-20x30-D0' -> '0'
        Dim designNr As Integer
        
        designNr = Globals.getDesignNrFromProductID(productID)
        
        If designNr = -3 Then
            GoTo DesignNrNotFound
        End If
        
        
        If hasUploadBoxes Then
            If hasGroundPlateVariants Then ' Konstellation 4
                
                ' In dieser Konstellation sind beide Varianten gleich: 'Products with Designs' oder 'Products with Childs'
                    
                ' Designbilder (das Design auf Grundplattenvarianten mit Uploadboxlöcher)
                ' --------------------------------------------
                
                For i = 1 To 50
                
                    Dim groundPlateVariantPlusDesignPath As String
                    groundPlateVariantPlusDesignPath = viewFolderPath & "Variants\attr_color\" & CStr(i)
                    Dim groundPlateVariantPlusDesignPreviewPath As String
                    groundPlateVariantPlusDesignPreviewPath = groundPlateVariantPlusDesignPath & "_preview.jpg"
                    Dim groundPlateVariantPlusDesignWithoutTransparencyPath As String
                    groundPlateVariantPlusDesignWithoutTransparencyPath = groundPlateVariantPlusDesignPath & "_no_transparency"
                    Dim groundPlateVariantPlusDesignWithoutTransparencyPreviewPath As String
                    groundPlateVariantPlusDesignWithoutTransparencyPreviewPath = groundPlateVariantPlusDesignWithoutTransparencyPath & "_preview.jpg"
                    groundPlateVariantPlusDesignPath = groundPlateVariantPlusDesignPath & ".png"
                    groundPlateVariantPlusDesignWithoutTransparencyPath = groundPlateVariantPlusDesignWithoutTransparencyPath & ".png"
                    
                    
                    If Globals.fileExist(groundPlateVariantPlusDesignPath) Then
                        fso.CopyFile groundPlateVariantPlusDesignPath, viewExportPath & "Designs\" & designNr & "_design_u_grundplatte_" & CStr(i) & ".png"
                        
                        If Globals.fileExist(groundPlateVariantPlusDesignWithoutTransparencyPath) Then
                            fso.CopyFile groundPlateVariantPlusDesignWithoutTransparencyPath, viewExportPath & "Designs\" & designNr & "_design_u_grundplatte_" & CStr(i) & "_o_trans.png"
                        End If
                        
                        ' Vorschau ohne Transparenz
                        If Globals.fileExist(groundPlateVariantPlusDesignPreviewPath) Then
                            fso.CopyFile groundPlateVariantPlusDesignPreviewPath, viewExportPath & "Designs\" & designNr & "_design_u_grundplatte_" & CStr(i) & "_vorschau.jpg"
                        Else
                            MsgBox "Das Designvorschaubild wurde nicht gefunden: '" & groundPlateVariantPlusDesignPreviewPath & "'" & vbNewLine & "Artikelnummer: " & productID, vbCritical
                            Globals.endMacro
                        End If
                        
                        ' Vorschau ohne Transparenz
                        If Globals.fileExist(groundPlateVariantPlusDesignWithoutTransparencyPreviewPath) Then
                            fso.CopyFile groundPlateVariantPlusDesignWithoutTransparencyPreviewPath, viewExportPath & "Designs\" & designNr & "_design_u_grundplatte_" & CStr(i) & "_o_trans_vorschau.jpg"
                        Else
'                            MsgBox "Das Designvorschaubild wurde nicht gefunden: '" & groundPlateVariantPlusDesignWithoutTransparencyPreviewPath & "'" & vbNewLine & "Artikelnummer: " & productID
'                            Globals.endMacro
                        End If
                        
                    Else
                        i = 100 'Exit
                    End If
                Next i
                ' --------------------------------------------
            Else ' Konstellation 2
            
            
            
               ' Designbild (Photomaske)
                ' --------------------------------------------
                Dim photoMaskPath As String
                photoMaskPath = viewFolderPath & "Variants\attr_photo_mask\2.png"
        
                 If Globals.fileExist(photoMaskPath) Then
                    fso.CopyFile photoMaskPath, viewExportPath & "Designs\" & designNr & "_design.png"
                Else
                    MsgBox "Das Designbild wurde nicht gefunden: '" & photoMaskPath & "'" & vbNewLine & "Artikelnummer: " & productID, vbCritical
                    Globals.endMacro
                End If
                ' --------------------------------------------
                
                ' Vorschau
                Dim photoMaskPreviewPath As String
                photoMaskPreviewPath = viewFolderPath & "Variants\attr_photo_mask\2_preview.jpg"
    
                If Globals.fileExist(photoMaskPreviewPath) Then
                    fso.CopyFile photoMaskPreviewPath, viewExportPath & "Designs\" & designNr & "_design_vorschau.jpg"
                Else
                    MsgBox "Das Designvorschaubild wurde nicht gefunden: '" & photoMaskPreviewPath & "'" & vbNewLine & "Artikelnummer: " & productID, vbCritical
                    Globals.endMacro
                End If
                
                
                ' Designbild OHNE Transparenz, wenn vorhanden. Photomaske)
                ' --------------------------------------------
                Dim photoMaskWithoutTransparencyPath As String
                photoMaskWithoutTransparencyPath = viewFolderPath & "Variants\attr_photo_mask\2_no_transparency.png"
        
                 If Globals.fileExist(photoMaskWithoutTransparencyPath) Then
                    fso.CopyFile photoMaskWithoutTransparencyPath, viewExportPath & "Designs\" & designNr & "_design_ohne_transparenz.png"
                End If
                ' --------------------------------------------
                
                ' Vorschau
                Dim photoMaskWithoutTransparencyPreviewPath As String
                photoMaskWithoutTransparencyPreviewPath = viewFolderPath & "Variants\attr_photo_mask\2_no_transparency_preview.jpg"
    
                If Globals.fileExist(photoMaskWithoutTransparencyPreviewPath) Then
                    fso.CopyFile photoMaskWithoutTransparencyPreviewPath, viewExportPath & "Designs\" & designNr & "_design_ohne_transparenz_vorschau.jpg"
                Else
                    MsgBox "Das Designvorschaubild wurde nicht gefunden: '" & photoMaskWithoutTransparencyPreviewPath & "'" & vbNewLine & "Artikelnummer: " & productID, vbCritical
                    Globals.endMacro
                End If
            End If
            
            
        Else 'Konstellation 1 & 3
        
            ' Designbild (nur das Design ohne Grundplatte)
            ' --------------------------------------------
            Dim designImagePath As String
            designImagePath = viewFolderPath & "Design\design.png"
    
            If Globals.fileExist(designImagePath) Then
                fso.CopyFile designImagePath, viewExportPath & "Designs\" & designNr & "_design.png"
            Else
                MsgBox "Das Designbild wurde nicht gefunden: '" & designImagePath & "'" & vbNewLine & "Artikelnummer: " & productID, vbCritical
                Globals.endMacro
            End If
            ' --------------------------------------------
            
            ' Vorschau
            Dim designImagePreviewPath As String
            designImagePreviewPath = viewFolderPath & "Design\design_preview.jpg"
            If Globals.fileExist(designImagePreviewPath) Then
                fso.CopyFile designImagePreviewPath, viewExportPath & "Designs\" & designNr & "_design_vorschau.jpg"
            Else
                MsgBox "Das Designvorschaubild wurde nicht gefunden: '" & designImagePreviewPath & "'" & vbNewLine & "Artikelnummer: " & productID, vbCritical
                Globals.endMacro
            End If
            
            ' Designbild OHNE Transparenz, wenn vorhanden (Nur das Design ohne Grundplatte)
            ' --------------------------------------------
            Dim designWithoutTransparencyImagePath As String
            designWithoutTransparencyImagePath = viewFolderPath & "Design\design_no_transparency.png"
    
             If Globals.fileExist(designWithoutTransparencyImagePath) Then
                fso.CopyFile designWithoutTransparencyImagePath, viewExportPath & "Designs\" & designNr & "_design_ohne_transparenz.png"
            End If
            ' --------------------------------------------
            
            ' Vorschau, wenn vorhanden
            Dim designWithoutTransparencyImagePreviewPath As String
            designWithoutTransparencyImagePreviewPath = viewFolderPath & "Design\design_no_transparency_preview.jpg"
            If Globals.fileExist(designWithoutTransparencyImagePreviewPath) Then
                fso.CopyFile designWithoutTransparencyImagePreviewPath, viewExportPath & "Designs\" & designNr & "_design_ohne_transparenz_vorschau.jpg"
            End If
            
        End If
        
        
    End If
    
    Exit Function
DesignNrNotFound:
    Err.Raise vbObjectError + 513, , "[Extractor.processDesignView] Designnummer konnte nicht aus '" & productID & "' extrahiert werden"
End Function





