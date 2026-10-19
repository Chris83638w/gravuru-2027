VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} PlaceFileDialog 
   Caption         =   "Bild einfügen"
   ClientHeight    =   4910
   ClientLeft      =   30
   ClientTop       =   370
   ClientWidth     =   4680
   StartUpPosition =   1  'Fenstermitte
   TypeInfoVer     =   72
End
Attribute VB_Name = "PlaceFileDialog"
Attribute VB_Base = "0{E5AEF57D-530A-4588-AFEF-910B90A1B8A5}{0B3D8D52-227D-4BEF-9DF5-102AB857A34B}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


Dim selectedDesign As productDesign
Dim currentDesignJobLayerIndex As Integer
Dim ignoreSelectDesignJobSpinButtonChange As Boolean


Private Sub DeleteButton_Click()
    Start True
End Sub


Private Sub SelectDesignJobSpinButton_Change()
    
    If ignoreSelectDesignJobSpinButtonChange Then
        ignoreSelectDesignJobSpinButtonChange = False
        
    Else
                
        ' Design holen, wenn bisher noch keins gefunden wurde
        ' -----------------------------------------------------
        Dim designInvalid As Boolean

        If selectedDesign Is Nothing Then
            designInvalid = True
        ElseIf Not Globals.isShapeReferenceValid(selectedDesign.getDesignShape) Then
            designInvalid = True
        End If

        If designInvalid Then
            ' Erstes Design aus der Auswahl holen
            Dim selectionRange As shapeRange
            Set selectionRange = Globals.getSelectedShapesOrAll

            Set selectedDesign = Globals.getFirstDesignFromShapes(selectionRange, onlyValidDesigns:=True, ignoreMasterDesign:=False)
        End If
        ' -----------------------------------------------------
        
        
        If Not selectedDesign Is Nothing Then
                
            ' Mit dem jetzigen Design wurde zum ersten mal auf den Button gedrückt
            ' Wenn man dabei auch rechts geklickt hat wird der Wert im 1 erhöht. Man ist dann also nicht beim ersten Job
            ' Das wird hier kompensiert
            If Not selectedDesign.getLayer2(1).isPlacedShapesAndJobsInitialized Then
                selectedDesign.getLayer2(1).getPlacedShapesAndJobs ' Init
                SelectDesignJobSpinButton.value = 0
            Else
                
                Dim jobIndexToSelect As Integer
                jobIndexToSelect = SelectDesignJobSpinButton.value + 1
                jobIndexToSelect = max(jobIndexToSelect, 1)
                Dim jobCounter As Integer
                
                For i = 1 To selectedDesign.getLayers.count
                    Dim currentLayer As ProductDesignLayer
                    Set currentLayer = selectedDesign.getLayer2(i)
                    
'                    Debug.Print "Der aktuelle Layer #" & i & " hat " & currentLayer.getPlacedShapesJobsWithoutDoubles.count & " platzierte Jobs"
                    
                    If jobCounter + currentLayer.getPlacedShapesJobsWithoutDoubles.count >= jobIndexToSelect Then
                        Dim jobIndexRelativeToCurrentLayers As Integer
                        jobIndexRelativeToCurrentLayers = jobIndexToSelect - jobCounter
                        
                        PlaceFile.setSelectedPlaceTypeJob currentLayer.getPlacedShapesJobsWithoutDoubles(jobIndexRelativeToCurrentLayers), True
                        
'                        Debug.Print "Job " & currentLayer.getPlacedShapesJobsWithoutDoubles(jobIndexRelativeToCurrentLayers).name & " ausgewählt! jobCounter: " & jobCounter & ", jobIndexRelativeToCurrentLayers: " & jobIndexRelativeToCurrentLayers
                        
                        GoTo FoundJob
                    Else
                        ' Wenn das nicht der letzte Layer ist (bei dem der Index noch nicht passt), weitermachen
                        If Not selectedDesign.getLayers.count = i Then
                            jobCounter = jobCounter + currentLayer.getPlacedShapesJobsWithoutDoubles.count
                        Else
                            ignoreSelectDesignJobSpinButtonChange = True ' Endlose Rekursion verhindern
                            
'                            Debug.Print "jobCounter: " & jobCounter
                            
                            SelectDesignJobSpinButton.value = jobCounter
                            
                        End If
                        
                    End If
                    
                    Set currentLayer = Nothing
                Next i
                
                
            End If
        Else
            ignoreSelectDesignJobSpinButtonChange = True ' Endlose Rekursion verhindern
            SelectDesignJobSpinButton.value = 0
        End If
    
    
    End If
    
FoundJob:
End Sub


Private Sub UserForm_Initialize()
   
   
   
   With PlaceFileDialog.PartComboBox
        Dim i As Integer
        For enumValue = PlaceFile.PartMode.Part1 To PlaceFile.PartMode.AllParts
            If enumValue = PlaceFile.PartMode.AllParts Then
                .AddItem "Alle"
            Else
                .AddItem i + 1
            End If
            
            i = i + 1
        Next enumValue
        
        .text = "Alle" 'Standartauswahl
   End With
   
   With PlaceFileDialog.LayerComboBox
        Dim j As Integer
        For enumValue = PlaceFile.LayerMode.layer1 To PlaceFile.LayerMode.allLayers
            If enumValue = PlaceFile.LayerMode.allLayers Then
                .AddItem "Alle"
            Else
                .AddItem j + 1
            End If
            
            j = j + 1
        Next enumValue
        
        .text = "1" 'Standartauswahl
   End With
   
End Sub




Private Sub Image1_Click()
    ' TEST
    Image1.BorderColor = RGB(0, 0, 255)
End Sub



Private Sub PlaceTypeComboBox_Change()

    ' Wenn beim eintippen eines Buchstaben noch kein Eintrag gefunden wurde. Z.B: wenn man "Z" eingibt. Es gibt keinen Job/Eintrag mit Z
    If PlaceTypeComboBox.ListIndex = -1 And Not PlaceTypeComboBox.value = "" Then
        For i = 0 To PlaceTypeComboBox.ListCount - 1
            Dim currentItem As String
            currentItem = PlaceTypeComboBox.List(i, 0)
            
'            Debug.Print "Compare " & PlaceTypeComboBox.value & " with " & currentItem
            If Globals.stringCompare(currentItem, PlaceTypeComboBox.value, StringInside) Then
                PlaceTypeComboBox.value = currentItem
                Exit For
            End If
            
        Next i
        
        Exit Sub
    End If
    
    PlaceFile.setSelectedPlaceType PlaceTypeComboBox.ListIndex + 1
    
    Dim isCDRMode As Boolean
    
    If Not PlaceTypeComboBox.ListIndex = -1 Then
        isCDRMode = PlaceTypeComboBox.List(PlaceTypeComboBox.ListIndex) = "CDR"
    End If
    
    PlaceFileDialog.GroupsAsDesignsCheckBox.Enabled = isCDRMode
    PlaceFileDialog.MainShapesBehaviourComboBox.Enabled = isCDRMode
    PlaceFileDialog.MainShapesBehaviourLabel.Enabled = isCDRMode
    PlaceFileDialog.useOffsetCheckBox.Enabled = isCDRMode
    
    Dim startPossible As Boolean
    If Not PlaceFile.getSelectedPlaceFileJob Is Nothing Then
        startPossible = Not PlaceFile.getSelectedPlaceFileJob.isOnlyForRemoving
    End If
    
    ' DEBUG PRINT
'    Debug.Print "Index " & PlaceTypeComboBox.ListIndex & ", value: " & PlaceTypeComboBox.value
'    If Not PlaceTypeComboBox.ListIndex = -1 Then Debug.Print "item: " & PlaceTypeComboBox.List(PlaceTypeComboBox.ListIndex, 0)
    
    PlaceFileDialog.StartPlacing.Enabled = startPossible And Not PlaceTypeComboBox.ListIndex = -1

End Sub

Private Sub StartPlacing_Click()
    Start False
End Sub

Private Sub cmdClose_Click()
    hideProperly
End Sub

Private Function Start(deleteMode As Boolean)
    
    hideProperly
    
    Dim params As PlaceFileParameters
    Set params = Classfactory.newPlaceFileParameters
    params.setParts(PlaceFileDialog.PartComboBox.ListIndex, PlaceFileDialog.LayerComboBox.ListIndex) _
        .setUseOffsetForCDR(useOffsetCheckBox.value) _
        .setGroupsAsDesigns(PlaceFileDialog.GroupsAsDesignsCheckBox.value) _
        .setDeleteMode(deleteMode) _
        .setMainShapeAddMode PlaceFileDialog.MainShapesBehaviourComboBox.ListIndex

    PlaceFile.Start params
End Function

Public Function init()
    PlaceFileDialog.PlaceTypeComboBox.SetFocus
    
    ' Gesamten Text auswählen. So kann man nämlich schnell etwas anderes eingeben, ohne noch was auswählen zu müssen
    PlaceFileDialog.PlaceTypeComboBox.SelStart = 0
    PlaceFileDialog.PlaceTypeComboBox.SelLength = PlaceFileDialog.PlaceTypeComboBox.TextLength
    
    
    
    ' Wenn in der UI noch ein Job von vorher ausgewählt ist, dann soll der Job auch bei 'PlaceFile' ausgewählt sein.
    ' Denn es kann sein, dass andere Scripte wie z.B. AmazonExport einen Acryllook platziert haben
    ' und der Acryllook jetzt der aktive Job bei 'PlaceFile' ist, aber nicht hier in der UI
    ' Außerdem erwartet man als Nutzer den Job wieder in der UI ausgewählt zu sehen, den man selbst zuletzt genutzt hat und nicht den Job, den ein anderes Script genutzt hat
    ' --------------------------------------------------------
    If Not PlaceFileDialog.PlaceTypeComboBox.value = "" Then
        
        PlaceFile.createLogger
        
        ' Alle Jobnamen in eine Collection packen
        PlaceFile.initIfNeeded
        Dim jobsAsString As New collection
        For i = 1 To PlaceFile.jobList.jobs.count
            jobsAsString.add PlaceFile.jobList.jobs(i).name
        Next i
        
        ' Gucken welcher Jobname zu dem passt, der noch in der ui ausgewählt ist
        Dim uiSelectedJobIndex As Integer
        uiSelectedJobIndex = Globals.getStringIndexInCollection(jobsAsString, PlaceFileDialog.PlaceTypeComboBox.value, StringEquals)
        
        ' Job auswählen
        If Not uiSelectedJobIndex = -1 Then
            PlaceFile.setSelectedPlaceType uiSelectedJobIndex
        End If
        
    End If
    ' --------------------------------------------------------
    
    
    ' Hauptform Verhalten Dropdown
    ' --------------------------------------------------------
    MainShapesBehaviourComboBox.Clear
    For i = 0 To MainShapeAddMode.count - 1
        MainShapesBehaviourComboBox.AddItem Globals.getMainShapeAddModeName((i))
    Next i
    ' Erstes Element auswählen
    If MainShapesBehaviourComboBox.ListCount > 0 Then MainShapesBehaviourComboBox.ListIndex = 0
    ' --------------------------------------------------------
    
End Function


Public Function hideProperly()
    
    PlaceFileDialog.Hide
    Set selectedDesign = Nothing
    
End Function
