Attribute VB_Name = "AmazonASINConnector"

' Autor:  Martin Afelt @ GRAVURU
'
' Sammelt Informationen zu einer bestimmten ASIN,
' indem mittels InternetExplorer der Konfi zur ASIN ausgelesen wird.


Public Sub AmazonExcelCheckerGetKonfiInfoTest()
    Dim ie As New SHDocVw.InternetExplorer
'    ie.visible = False
    ie.visible = True
    
    Dim inputResult As String
    inputResult = InputBox("ASIN eingeben: ", "ASIN", "B09M8ZNR6W")
    
    ProgressBarUserForm.Start
    
    ProgressBarUserForm.setProgress 0
    
    If Not inputResult = "" Then
    
        Dim result As collection
        Set result = amazonExcelCheckerGetKonfiInfo(inputResult, ie)
        'Set result = amazonExcelCheckerGetKonfiInfo("B0B51VDWGD", ie) ' Beste Freundinnen Bild aus Acryl Glas im Clipart
        
    End If
    
    ProgressBarUserForm.setProgress 1
    
    
    ie.Quit
    
    Globals.openTextInTextEditor Globals.collectionToString(result), "IEOutput"
    
    ProgressBarUserForm.Hide
End Sub



Private Function amazonExcelCheckerGetKonfiInfo(ASIN As String, ie As SHDocVw.InternetExplorer) As collection
    
    ie.Navigate Globals.getAmazonProductLink(ASIN)
    
    ProgressBarUserForm.setProgress 0.25
    
    Do
        DoEvents
    Loop Until ie.ReadyState = READYSTATE_COMPLETE
    
    ProgressBarUserForm.setProgress 0.5
    

    Dim doc As HTMLDocument ' https://developer.mozilla.org/en-US/docs/Web/API/Document
    Set doc = ie.document
    
    Dim customizeButton As Object
    Set customizeButton = doc.getElementById("gestalt-popover-button-announce")
    
    ' Wait while IE re-loading...
    While ie.Busy
        DoEvents
    Wend
    
    ' Vor dem Klicken auf den "Jetzt Anpassen" Button muss noch 1 Sek. gewartet werden
    ' Ansonsten wird der Konfi geöffnet und der Artikel zum Warenkorb hinzugefügt. Außerdem laden dann die Optionen rechts nicht mehr...
'    Globals.Sleep 1000
    If customizeButton Is Nothing Then GoTo customizeButtonHidden
    customizeButton.Click
    
LoadPage:

    ' Wait while IE re-loading...
    While ie.Busy
        DoEvents
    Wend
    
    
    Dim confiCustomizationPage As Object
    Set confiCustomizationPage = doc.getElementById("gc-custom-form")
    
    If confiCustomizationPage Is Nothing Then
        GoTo LoadPage
    End If
    
    Dim flatContainersChilds As Object
    Set flatContainersChilds = confiCustomizationPage.getElementsByClassName("gc-flat-container-child")
    
    ' Aufbau:
    '
    ' Option 1
    ' - Größe
    ' -- 15x20
    ' Option 2
    ' - Farbe
    ' -- Anthrazit
    ' -- Schwarz
    Dim optionsColl As New collection
    
    ' JavaScript-Style For-Schleife
    For i = 0 To flatContainersChilds.Length - 1
        Dim currentFlatContainer As Object
        Set currentFlatContainer = flatContainersChilds.item(i)
        
        Dim currentOptionColl As New collection
        Dim currentOptionOptionsColl As New collection
        
        ' TITEL
        Dim titleElement As Object
        Set titleElement = currentFlatContainer.getElementsByClassName("gc-component-label")(0)
        '
        Dim title As String
        title = replace(titleElement.innerText, "* ", "")
        title = Trim(title)
        
        currentOptionColl.add title
        currentOptionColl.add currentOptionOptionsColl
        optionsColl.add currentOptionColl
        
        ' OPTIONEN
        ' Es gibt verschiedenen Arten zur Auswahl:
        '
        ' --- Buttonliste ohne Bilder:
        Dim swatchElements As Object
        Set swatchElements = currentFlatContainer.getElementsByClassName("gc-option-swatch-list-item")
        If swatchElements.Length = 0 Then Set swatchElements = Nothing
        '
        If Not swatchElements Is Nothing Then
        
'            MsgBox "swatchElements found for " & title
        
            For j = 0 To swatchElements.Length - 1
                Dim currentSwatchElement As Object
                Set currentSwatchElement = swatchElements.item(j)
                
                Dim currentSwatchElementOptionLabel As Object
                Set currentSwatchElementOptionLabel = currentSwatchElement.getElementsByClassName("gc-option-label")(0)
                
                Dim currentSwatchElementText As String
                currentSwatchElementText = replace(Trim(currentSwatchElementOptionLabel.innerText), vbNewLine, "")
                
                ' Wenn die Auswahlmöglichkeit "Keine" vorhanden ist, dann ist es kein Pflichtfeld
'                If Not currentSwatchElementText = "Keine" Then
                currentOptionOptionsColl.add currentSwatchElementText
'                End If

'                MsgBox currentOptionOptionsColl.item(currentOptionOptionsColl.count), , title
                    
                Set currentSwatchElement = Nothing
                Set currentSwatchElementOptionLabel = Nothing
            Next j
        End If
            
        ' --- Dropdownfeld:
        '
        Dim dropDownElement As Object
        Set dropDownElement = currentFlatContainer.getElementsByClassName("a-native-dropdown")(0)
        '
        If Not dropDownElement Is Nothing Then
            
'            MsgBox "dropDownElement found for " & title
        
            ' Die erste Option ignorieren. Diese heißt nämlich "Auswählen". Deshalb j = 1
            For j = 1 To dropDownElement.Length - 1
                Dim dropDownOption As Object
                Set dropDownOption = dropDownElement.item(j)
                
                currentOptionOptionsColl.add Trim(dropDownOption.text)
                
'                    MsgBox currentOptionOptionsColl.item(currentOptionOptionsColl.count), , title
    
                Set dropDownOption = Nothing
            Next j
        End If
            
        'MsgBox swatchElements
        Set dropDownElement = Nothing
        
        
        Set currentFlatContainer = Nothing
        Set titleElement = Nothing
        Set swatchElements = Nothing
        Set currentOptionColl = Nothing
        Set currentOptionOptionsColl = Nothing
    Next i
    
    ProgressBarUserForm.setProgress 0.75
    
    
    
'    MsgBox flatContainersChild
    
    Set amazonExcelCheckerGetKonfiInfo = optionsColl
    Exit Function
customizeButtonHidden:
    MsgBox "Der 'Personalisieren' Button ist nicht da. Wahrscheinlich kann der Artikel zurzeit nicht gekauft werden", vbExclamation
End Function
