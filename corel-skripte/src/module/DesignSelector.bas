Attribute VB_Name = "DesignSelector"
Option Explicit

' Autor: Martin Afelt @ Gravuru
'


Public Sub StartDesignSelector()
    DesignSelectorDialog.Show
    DesignSelectorDialog.DesignsTextBox.SetFocus
    
    ' Text markieren
    DesignSelectorDialog.DesignsTextBox.SelStart = 0
    DesignSelectorDialog.DesignsTextBox.SelLength = Len(DesignSelectorDialog.DesignsTextBox.value)
End Sub


Public Function selectDesigns(designsString As String, Optional logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[DesignSelector.selectDesigns] designsString: '" & designsString & "'"
    
    Dim i As Integer
    
    Dim designNumbers As New collection
    
    For i = 1 To Len(designsString)
        If Globals.getCharOfString(designsString, (i)) = "D" Then
            Dim designNumber As Integer
            Dim stringPortion As String
            stringPortion = Mid(designsString, i + 1, 10)
            designNumber = Globals.getLeftNumber(stringPortion, False, False)
            
            If Not designNumber = -1 Then
                designNumbers.add CStr(designNumber)
            End If
        End If
    Next i
    
    If Not logger Is Nothing Then logger.logINFO "Extrahierte Designnummern: " & vbNewLine & Globals.collectionToMultiLineStr(designNumbers)
    
    Dim designs As collection
    Set designs = Globals.getAllDesigns
    
    Dim selectionRange As New shapeRange
    
    For i = 1 To designs.count
        Dim currDesing As productDesign
        Set currDesing = designs(i)
        
        Dim productIDObj As New ProductIDObject
        productIDObj.setProductID currDesing.getProductID
        
        Dim designNumberStr As String
        designNumberStr = productIDObj.getDesignNumber
        
        If Not logger Is Nothing Then logger.logINFO "designNumberStr: '" & designNumberStr & "'"
        
        If Globals.stringCollectionContains(designNumbers, designNumberStr, StringEquals) Then
            Globals.safeAddShapeToShapeRange currDesing.getDesignShape, selectionRange
        End If
        
        Set productIDObj = Nothing
        Set currDesing = Nothing
    Next i
    
    If Not selectionRange.count = 0 Then
        selectionRange.CreateSelection
        Globals.setViewToShapeRange selectionRange, 1
    End If
    
    If Not logger Is Nothing Then logger.removeTab
End Function

