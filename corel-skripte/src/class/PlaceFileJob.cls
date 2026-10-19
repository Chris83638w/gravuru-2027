Attribute VB_Name = "PlaceFileJob"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False

'Option Explicit

Public name As String

' Wenn true. dann ist beim Auswählen des Jobs der Starbutton deaktiviert und nur der Löschenbutton klickbar
Public isOnlyForRemoving As Boolean

' Wenn true, dann werden die 'jobs' nicht alle auf einmal auf jede Form angewendet, sondern nacheinander.
' Ist nützlich wenn man bei 2 Kordellöchern 2 verschiedene Kordelknoten haben will
Public processJobsInSequence As Boolean ' TODO implementieren

Public parentJobList As PlaceFileJobList
Public subJobs As New collection
Public jobs As New collection ' Unterjobs
Public parent As PlaceFileJob
Public cloneHistory As New collection ' Die Jobs von dem dieser Job geklont wurde (Verweist erstmal auf sich selbst)
Public variante As variante

Public groupPlacedShapesBySubJob As Boolean
Private p_groupName As String ' Wenn dieser Job eine Variante hat, dann regelt die Variante über getGroupName den Namen. Deshalb Private

' Limitiert wieviele Jobs aus 'jobs' anhand ihrer SubJobs Formen platzieren dürfen
' Also nehmen wir mal an es gäbe folgenden Job:
'
' Job (Bohrlöcher)
'    Job (Bohrlöcher 2x 6mm)
'       Subjob (Bohrloch 6mm)
'       Subjob (Bohrloch 6mm)
'    Job (Bohrlöcher 2x 8mm)
'       Subjob (Bohrloch 8mm)
'       Subjob (Bohrloch 8mm)
'
' Würde dann der Job 'Bohrlöcher' ein maximum von 1 haben, dürfen nur 2 Bohrlöcher platziert werden. Entweder von 'Bohrlöcher 2x 6mm' oder 'Bohrlöcher 2x 8mm'
Public jobsPlacingMaximumCount As Integer
Public jobsPlacingCounter As Integer

' Limitiert die Formen, die die von 'subJobs' platziert werden dürfen
Public placeMaximumCount As Integer ' Achtung: Gibt es auch bei den SubJobs
Dim placeMaximumCountCounters() As Variant ' Achtung: Gibt es auch bei den SubJobs. Zählt für jede einzelne Schicht. Aufbau Part > Schicht (2 dimensionales Array) ' Kann leider nicht Public sein :( VBAAAAA

' Weitere Infos (Werden von anderen Scripten genutzt)
Public variantNameBeautiful As String
Public isGeneratingOwnMask As Boolean
Public isGeneratingVariantMask As Boolean ' Steuert, ob eine Variantenmaske für die roten/pinken Formen (bspw. Bohrlöcher als Variante) erstellt werden soll beim ConfiExport
Private lookJob As PlaceFileJob ' Welches ist der Lookjob für diesen Job. Z.B: Wenn dieser Job "Acryl klar" ist, dann ist "Acryl Look" sein lookJob
Private lookJobForJobs As New collection ' Für welche Jobs ist dieser Job der Look. Z.B: Wenn dieser Job "Acryl Look" ist, dann ist "Acryl klar" in lookJobForJobs
Public groundPlateInvalidationNeededAfterPlacing As Boolean
Public isDefaultInVariantGroup As Boolean ' Bei Klingeltastern ist der Blaue der Standart. Der Blaue wird dann beim Fancyexport in die ZIP gepackt, die anderen Farben nicht. Die müssen manuell als Variante hochgeladen werden
Dim putAboveMainMask As Boolean

' Wenn auf Amazon eine statische Variante z.B. "mit Bohrlöcher" heißt, dieser Job aber "var_befestigung(2-Bohrloecher)", dann kann mithilfe des Amazon-Namens und 'staticVariantNameAliasseForAmazonImport' dieser Job gefunden werden
Public staticVariantNameAliasseForAmazonImport As New collection

Public Function init(parentJobListVar As PlaceFileJobList, addJobToJobList As Boolean, Optional isClone As Boolean)
    If addJobToJobList Then
        setParentJobListAndAdd parentJobListVar
    End If
    
    placeMaximumCount = 20 ' Standartwert (wenn placeMaximumCount noch nicht verändert wurde, also 0 ist)
    jobsPlacingMaximumCount = 20
    isGeneratingVariantMask = True ' Standart
    
    If Not isClone Then
        cloneHistory.add Me
    End If
End Function


Public Function setParentJobListAndAdd(parentJobListVar As PlaceFileJobList)
    Set parentJobList = parentJobListVar
    
    If Not parentJobList Is Nothing Then
        parentJobList.jobs.add Me
    End If
End Function


Public Function mee() As PlaceFileJob
    Set mee = Me
End Function

Public Function newSubJob() As PlaceFileSubJob
    
    Dim subJob As New PlaceFileSubJob
    
    subJob.init Me
    
    subJobs.add subJob
    
    Set newSubJob = subJob

End Function

Public Function addSubJob(subJob As PlaceFileSubJob)
    subJobs.add subJob
    subJob.init Me, True
End Function


Public Function addJob(job As PlaceFileJob)
    jobs.add job
    Set job.parent = Me
End Function


Public Function newJob() As PlaceFileJob
    Set newJob = New PlaceFileJob
    addJob newJob
End Function


' Wenn "copyJobSettings" wahr ist, dann werden auch Eigenschaften wie "placeMaximumCount" vom "job" zu diesem Job kopiert. Außer der Name
Public Function cloneAndAddSubJobsFrom(job As PlaceFileJob, Optional copyJobSettings As Boolean = False)
    
    For i = 1 To job.subJobs.count
        Dim currentSubJob As PlaceFileSubJob
        Set currentSubJob = job.subJobs(i)
        addSubJob currentSubJob.clone(False)
        Set currentSubJob = Nothing
    Next i
    
    If copyJobSettings Then
        groupPlacedShapesBySubJob = job.groupPlacedShapesBySubJob
        p_groupName = job.getGroupName
        placeMaximumCount = job.placeMaximumCount
        variantNameBeautiful = job.variantNameBeautiful
        isGeneratingOwnMask = job.isGeneratingOwnMask
        setLookJob job.getLookJob
        groundPlateInvalidationNeededAfterPlacing = job.groundPlateInvalidationNeededAfterPlacing
        isDefaultInVariantGroup = job.isDefaultInVariantGroup
    End If
    
End Function




Public Function clone(Optional addToGlobalJobList As Boolean = True) As PlaceFileJob
    
    Dim job As New PlaceFileJob
    
    job.name = name
    
    ' Subjobs
    For i = 1 To subJobs.count
        job.subJobs.add subJobs.item(i).clone(False)
        job.getSubJob(i).init job, True
    Next i
    
    ' Jobs
    For i = 1 To jobs.count
        job.addJob getJob(i).clone(False) ' False, weil die Jobs Unterjobs von diesem Job sind, weshalb sie nicht in die Globale Jobliste sollen
    Next i
    
    
    job.init parentJobList, addToGlobalJobList, False
    job.cloneHistory.add Me
    
    job.groupPlacedShapesBySubJob = groupPlacedShapesBySubJob
    job.setGroupName p_groupName
    job.placeMaximumCount = placeMaximumCount
    job.variantNameBeautiful = variantNameBeautiful
    job.isGeneratingOwnMask = isGeneratingOwnMask
    job.isGeneratingVariantMask = isGeneratingVariantMask
    job.setLookJob getLookJob
    job.groundPlateInvalidationNeededAfterPlacing = groundPlateInvalidationNeededAfterPlacing
    job.isDefaultInVariantGroup = isDefaultInVariantGroup
    If Not variante Is Nothing Then
        Set job.variante = variante.clone
        If variante.hasJob Then
            job.variante.setJob variante.getJob
        End If
    End If
    If putAboveMainMask Then job.setPutAboveMainMask
    
    Set clone = job
    
End Function


Public Function wasClonedFrom(job As PlaceFileJob) As Boolean
    wasClonedFrom = Globals.collectionContainsOBJ(cloneHistory, job)
End Function


Public Function setLookJob(job As PlaceFileJob)
    
    ' Falls dieser Job schon vorher bei einem Lookjob registriert war, löschen
    If Not lookJob Is Nothing Then
        For i = 1 To lookJob.getLookJobForJobs.count
            If lookJob.getLookJobForJobs(i) Is Me Then
                lookJob.getLookJobForJobs.Remove i
            End If
        Next i
    End If


    Set lookJob = job
    If Not job Is Nothing Then
        job.getLookJobForJobs.add Me
    End If
End Function

Public Function getLookJob() As PlaceFileJob
    Set getLookJob = lookJob
End Function

Public Function getLookJobForJobs() As collection
    Set getLookJobForJobs = lookJobForJobs
End Function

Public Function getPlaceMaximumCountCounters() As Variant()
    getPlaceMaximumCountCounters = placeMaximumCountCounters
End Function

Public Function getPlaceMaximumCountCountersValueByLayer(layer As ProductDesignLayer) As Integer
    getPlaceMaximumCountCountersValueByLayer = getPlaceMaximumCountCountersValue(layer.getPartIndex, layer.getLayerIndex)
End Function

Public Function getPlaceMaximumCountCountersValue(partIndex As Integer, layerIndex As Integer) As Integer
    getPlaceMaximumCountCountersValue = placeMaximumCountCounters(partIndex)(layerIndex)
End Function

Public Function setPlaceMaximumCountCountersValueByLayer(layer As ProductDesignLayer, value As Integer)
    setPlaceMaximumCountCountersValue layer.getPartIndex, layer.getLayerIndex, value
End Function

Public Function setPlaceMaximumCountCountersValue(partIndex As Integer, layerIndex As Integer, value As Integer)
     placeMaximumCountCounters(partIndex)(layerIndex) = value
End Function


Public Function resetPlaceMaximumCountCounters(design As productDesign, Optional alsoSubJobs As Boolean = True)
    ReDim placeMaximumCountCounters(1 To design.getPartsCount)
    
    For i = 1 To design.getPartsCount
    
        Dim arr() As Integer
        ReDim arr(1 To design.getPart(i).count)
        
        placeMaximumCountCounters(i) = arr
    Next i
    
    If alsoSubJobs Then
        For i = 1 To subJobs.count
            getSubJob(i).resetPlaceMaximumCountCounters design
        Next i
    End If
    
End Function


Public Function repl(find As String, replace As String, Optional imageName As Boolean = False, Optional imageFolder As Boolean = False, Optional shapeName As Boolean = False, Optional subJobNames As Boolean = False)
    
    If imageName Then
        replImageName find, replace
    End If
    
    If imageFolder Then
        replImageFolder find, replace
    End If
    
    If shapeName Then
        replShapeName find, replace
    End If
    
    If subJobNames Then
        replSubJobsNames find, replace
    End If
    
End Function



Public Function replImageFolder(find As String, replace As String)

    For i = 1 To subJobs.count
        
        getSubJob(i).imageFolder = Globals.Replace2(getSubJob(i).imageFolder, find, replace)
        
    Next i
    
End Function


Public Function replImageName(find, replace)

    For i = 1 To subJobs.count
        getSubJob(i).imageName = Globals.Replace2(getSubJob(i).imageName, find, replace)
    Next i

End Function

Public Function addImageName(addString As String, toBeginningOrEnd As Boolean)
    
     For i = 1 To subJobs.count
        getSubJob(i).imageName = IIf(toBeginningOrEnd, addString, "") & getSubJob(i).imageName & IIf(toBeginningOrEnd, "", addString)
    Next i
    
End Function

Public Function setImageType(imageType As String)
    
    For i = 1 To subJobs.count
        getSubJob(i).imageType = imageType
    Next i

End Function

Public Function replShapeName(find, replace)

    For i = 1 To subJobs.count
        getSubJob(i).shapeName = Globals.Replace2(getSubJob(i).imageName, find, replace)
    Next i

End Function


Public Function replSubJobsNames(find, replace)
    For i = 1 To subJobs.count
        getSubJob(i).name = Globals.Replace2(getSubJob(i).name, find, replace)
    Next i
End Function


Public Function removeItem(item)

    For i = 1 To subJobs.count
        If subJobs.item(i) Is item Then
            subJobs.Remove i
            Exit Function
        End If
    Next i
    
End Function


Public Function getSubJob(ByVal index As Integer) As PlaceFileSubJob
    Set getSubJob = subJobs(index)
End Function

Public Function getJob(ByVal index As Integer) As PlaceFileJob
    Set getJob = jobs(index)
End Function


Public Function isNameTopLevel() As Boolean
    If Not parent Is Nothing Then
        isNameTopLevel = parent.isNameTopLevel
    Else
        isNameTopLevel = Not groupName = ""
    End If
End Function


Public Function getTopLevelName() As String
    If Not parent Is Nothing Then
        getTopLevelName = parent.getTopLevelName
    End If
    
    If getTopLevelName = "" Then
        If groupPlacedShapesBySubJob Then
            getTopLevelName = groupName
        End If
    End If
    
End Function


Public Function setSubJobsCutDesign(cut As Boolean)
    For i = 1 To subJobs.count
        subJobs(i).cutDesign = cut
    Next i
End Function


Public Function setPutAboveMainMask()
    putAboveMainMask = True
    ' Cachen
    PlaceFile.jobsToPutAboveMainMask.add Me ' TODO UNNÖTIG ! ! ! ! ! ! ! ! ! ! ! ! ! ! !
End Function

Public Function isToPutAboveMainMask() As Boolean
    isToPutAboveMainMask = putAboveMainMask
End Function

Public Function getOrCreateVariante() As variante
    If variante Is Nothing Then
        Set variante = New variante
        variante.setJob Me
    End If
    Set getOrCreateVariante = variante
End Function

Public Function removeVariante()
    Set variante = Nothing
End Function

Public Function setGroupName(groupName As String)
    p_groupName = groupName
End Function

Public Function getGroupName() As String
    If Not variante Is Nothing Then
        getGroupName = variante.getNameForGroupingJobShapes
    Else
        getGroupName = p_groupName
    End If
End Function

' 'onChildJobDepth' beschreibt, in welcher rekursiven Tiefe der ChildJobs 'jobs' die Subjobs angesprochen werden sollen
Public Function setMinMaxSize2(minWidth As Double, maxWidth As Double, minHeight As Double, maxHeight As Double, Optional minArea As Double = -1, Optional maxArea As Double = -1, Optional ByVal onChildJobDepth As Integer = -10000)
    ' Entweder sind wir hier auf der richtigen rekursiven Ebene '= 0' oder es wurde angegeben, dass auf allen Ebenen
    If onChildJobDepth = 0 Or onChildJobDepth = -10000 Then
        For i = 1 To subJobs.count
            getSubJob(i).setMinMaxSize2 minWidth, maxWidth, minHeight, maxHeight, minArea, maxArea
        Next i
    End If
    
    ' Wenn das hier nicht die richtige rekursive Ebene war, weitersuchen. Bzw. wenn alle Ebenen angesprochen werden sollen, acu weitersuchen
    If Not onChildJobDepth = 0 Then
        For i = 1 To jobs.count
            getJob(i).setMinMaxSize2 minWidth, maxWidth, minHeight, maxHeight, minArea, maxArea, onChildJobDepth - 1
        Next i
    End If
End Function


Public Function addProductShapeInfoToAvoid(shapeInfo As ProductShapeInfo, Optional ByVal onChildJobDepth As Integer = -10000)
    ' Entweder sind wir hier auf der richtigen rekursiven Ebene '= 0' oder es wurde angegeben, dass auf allen Ebenen
    If onChildJobDepth = 0 Or onChildJobDepth = -10000 Then
        For i = 1 To subJobs.count
            getSubJob(i).addProductShapeInfoToAvoid shapeInfo
        Next i
    End If
    
    ' Wenn das hier nicht die richtige rekursive Ebene war, weitersuchen. Bzw. wenn alle Ebenen angesprochen werden sollen, acu weitersuchen
    If Not onChildJobDepth = 0 Then
        For i = 1 To jobs.count
            getJob(i).addProductShapeInfoToAvoid shapeInfo, onChildJobDepth - 1
        Next i
    End If
End Function

Public Function removeProductShapeInfoToAvoid(shapeInfo As ProductShapeInfo, Optional ByVal onChildJobDepth As Integer = -10000)
    ' Entweder sind wir hier auf der richtigen rekursiven Ebene '= 0' oder es wurde angegeben, dass auf allen Ebenen
    If onChildJobDepth = 0 Or onChildJobDepth = -10000 Then
        For i = 1 To subJobs.count
            getSubJob(i).removeProductShapeInfoToAvoid shapeInfo
        Next i
    End If
    
    ' Wenn das hier nicht die richtige rekursive Ebene war, weitersuchen. Bzw. wenn alle Ebenen angesprochen werden sollen, acu weitersuchen
    If Not onChildJobDepth = 0 Then
        For i = 1 To jobs.count
            getJob(i).removeProductShapeInfoToAvoid shapeInfo, onChildJobDepth - 1
        Next i
    End If
End Function
