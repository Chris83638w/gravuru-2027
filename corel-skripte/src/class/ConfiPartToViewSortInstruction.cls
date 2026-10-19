Attribute VB_Name = "ConfiPartToViewSortInstruction"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False

Dim views As New collection

Public Function initilizeWithDefaultValues()
    For i = 1 To 4
        ensureViewIndex i
        getView(i).add i
    Next i
End Function

Public Function addPartToView(partIndex As Integer, viewIndex As Integer)
    Dim view As collection
    ensureViewIndex viewIndex
    Set view = getView(viewIndex)
    
    view.add partIndex
End Function

Public Function getView(ByVal index As Integer) As collection
    Set getView = views(index)
End Function

Private Function ensureViewIndex(ByVal index As Integer)
    While views.count < index
        views.add New collection
    Wend
End Function

Public Function getViewsCount() As Integer
    getViewsCount = views.count
End Function

Public Function isViewHavingParts(ByVal viewIndex As Integer) As Boolean
    isViewHavingParts = views(viewIndex).count > 0
End Function

Public Function saveInstructionForAmazonImport(files As FSDesignFiles)
    
    ' Speichern nicht nötig, denn es werden Standartwerte genutzt.
    ' Diese werden beim Laden, wenn die JSON nicht gefunden wird dann gesetzt durch 'initilizeWithDefaultValues'
    If isDefaultValues Then
        Exit Function
    End If
    
    Dim jsonDict As New Dictionary
    jsonDict.add "Views", views
    Globals.saveTextFileUTF8 JSON.toJSON(jsonDict), files.getAmazonExportViewSortFilePath
End Function

Public Function isDefaultValues() As Boolean
    
    For i = 1 To views.count
        Dim view As collection
        Set view = views(i)
        
        ' Jede View muss ein Part haben
        If Not view.count = 1 Then
            Exit Function ' False
        End If
        
        ' Das part muss den selben Index haben wie die View
        If Not view(1) = i Then
            Exit Function ' False
        End If
            
        
        Set view = Nothing
    Next i
    
    isDefaultValues = True
End Function

Public Function loadFromFile(files As FSDesignFiles)
    
    If Not Globals.fileExist(files.getAmazonExportViewSortFilePath) Then
        initilizeWithDefaultValues
        Exit Function
    End If
    
    Dim jsonString As String
    jsonString = Globals.loadFileAsStringFromUTFEight(files.getAmazonExportViewSortFilePath)
    
    Dim jsonDict As Dictionary
    Set jsonDict = JSON.Parse(jsonString)
    
    Dim viewsArray() As Variant
    viewsArray = jsonDict.item("Views")
    
    For i = LBound(viewsArray) To UBound(viewsArray)
        
        Dim parts() As Variant
        parts = viewsArray(i)
        
        For j = LBound(parts) To UBound(parts)
            ensureViewIndex i + 1
            getView(i + 1).add (parts(j) + 1) ' +1 weil das Array 0 basiert ist und die Views bzw. die Collections 1 basiert
        Next j
    Next i
    
End Function
