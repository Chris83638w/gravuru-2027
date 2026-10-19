Attribute VB_Name = "Version"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
Option Explicit

' Autor Martin Afelt @ Gravuru
' Implementiert die Semantic Versioning 2.0.0
' Zwingt einen aber nicht dazu diese zu nutzen. Es können also auch Versionen wie 4.3.2.1 mit 1.2.3 erstellt und verglichen werden

Private p_versionString As String

' 1 2 3
Private p_comparisonNumberList As ArrayList
' beta 2
Private p_comparisonPhaseAndIterationList As ArrayList

Enum VersionPhase
    DevelopmentVersionPhase = 1
    BetaVersionPhase
    AlphaVersionPhase
    ReleaseCandidateVersionPhase
    FinalVersionPhase
    
    count
End Enum

' Eine neue Version nach dem Semantic Versioning 2.0.0
Public Function newVersion(major As Integer, minor As Integer, patch As Integer, Optional phase As VersionPhase = FinalVersionPhase, Optional iteration As Integer = 0)
    newFromString major & "." & minor & "." & patch & IIf(phase = FinalVersionPhase, "", "-" & getPhaseName(phase) & "." & iteration)
End Function

Public Function getPhaseName(ByVal phase As VersionPhase) As String
    Select Case phase
        Case FinalVersionPhase
            getPhaseName = "" ' Finale Version ist immer ohne Bezeichnung
        Case AlphaVersionPhase
            getPhaseName = "alpha"
        Case BetaVersionPhase
            getPhaseName = "beta"
        Case ReleaseCandidateVersionPhase
            getPhaseName = "rc"
        Case DevelopmentVersionPhase
            getPhaseName = "dev"
    End Select
End Function

Public Function getPhaseFromName(phaseName As String) As VersionPhase
    If phaseName = "alpha" Then
        getPhaseFromName = AlphaVersionPhase
    ElseIf phaseName = "beta" Then
        getPhaseFromName = BetaVersionPhase
    ElseIf phaseName = "rc" Then
        getPhaseFromName = ReleaseCandidateVersionPhase
    ElseIf phaseName = "dev" Then
        getPhaseFromName = DevelopmentVersionPhase
    End If
End Function

Public Function newFromString(versionString_ As String)
    p_versionString = versionString_
    setComparisonListsFromString p_versionString
End Function

Public Function newFromTextFile(path As String)
    newFromString loadFileAsString(path)
End Function


Public Property Get versionString() As String
    versionString = p_versionString
End Property


Public Property Get comparisonNumberList() As ArrayList
    If p_comparisonNumberList Is Nothing Then
        initComparisonLists ' Immer beide Listen gleichzeitig initialisieren
    End If
    
    Set comparisonNumberList = p_comparisonNumberList
End Property

Public Property Get comparisonPhaseAndIterationList() As ArrayList
    If p_comparisonPhaseAndIterationList Is Nothing Then
        initComparisonLists ' Immer beide Listen gleichzeitig initialisieren
    End If
    
    Set comparisonPhaseAndIterationList = p_comparisonPhaseAndIterationList
End Property


Private Function initComparisonLists()
    setComparisonListsFromString p_versionString
End Function

Public Function setComparisonListsFromString(ByVal versionString_ As String)
    
    If InStr(versionString_, "-") Then
        Dim versionAndPhaseSplitted() As String
        versionAndPhaseSplitted = Split(versionString_, "-")
        
        setComparisonNumberListFromString versionAndPhaseSplitted(0)
        setComparisonPhaseAndInterationListFromString versionAndPhaseSplitted(1)
    Else
        setComparisonNumberListFromString versionString_
        setComparisonPhaseAndInterationListFromString ""
    End If
    
End Function


Private Function setComparisonNumberListFromString(numberString As String)
    Set p_comparisonNumberList = New ArrayList
    p_comparisonNumberList.AddRange Split(numberString, ".")
    p_comparisonNumberList.CIntAll
End Function

Private Function setComparisonPhaseAndInterationListFromString(ByVal phaseAndInterationString As String)
    
    Dim i As Integer
    For i = 1 To VersionPhase.count
        phaseAndInterationString = replace(phaseAndInterationString, getPhaseName(i), CStr(i))
    Next i
    
    Set p_comparisonPhaseAndIterationList = New ArrayList
    p_comparisonPhaseAndIterationList.AddRange Split(phaseAndInterationString, ".")
    p_comparisonPhaseAndIterationList.CIntAll
End Function


Public Function isVersionSameOrNewerThen(ByVal versionB As Version) As Boolean
    Dim result As Integer
    result = isVersionOlderOrSameOrNewerThen(versionB)
    isVersionSameOrNewerThen = result >= 0
End Function


Public Function isVersionLowerThen(versionB As Version) As Boolean
    isVersionLowerThen = isVersionOlderOrSameOrNewerThen(versionB) < 0
End Function


' Prüft, ob 'versionA' genau so oder höher ist als 'versionB'
' isVersionSameOrNewer(1.1, 1.0) = 1
' isVersionSameOrNewer(1.0, 1.0) = 0
' isVersionSameOrNewer(0.9, 1.0) = -1
Public Function isVersionOlderOrSameOrNewerThen(ByVal versionB As Version) As Integer
    
    ' NUMMERN
    Dim versionAArr As ArrayList
    Set versionAArr = comparisonNumberList.clone
    Dim versionBArr As ArrayList
    Set versionBArr = versionB.comparisonNumberList.clone
    
    fillUpArrayListsToMatchSizes versionAArr, versionBArr
    
    
    ' PHASE & ITERATION
    ' -beta.1 hinzufügen. Was in Zahlen -2, 1 wäre
    Dim phaseAndIterationA As ArrayList
    Set phaseAndIterationA = comparisonPhaseAndIterationList.clone
    
    Dim phaseAndIterationB As ArrayList
    Set phaseAndIterationB = versionB.comparisonPhaseAndIterationList.clone
    
    fillUpArrayListsToMatchSizes phaseAndIterationA, phaseAndIterationB
    
    ' Hinzufügen, damit alles verglichen wird. Nummern und Phase und Iteration
    versionAArr.AddRange phaseAndIterationA
    versionBArr.AddRange phaseAndIterationB
    
    Dim i As Integer
    For i = 1 To versionAArr.count
        If versionAArr.item(i) > versionBArr.item(i) Then
            isVersionOlderOrSameOrNewerThen = 0
            Exit Function
        ElseIf versionAArr.item(i) < versionBArr.item(i) Then
            isVersionOlderOrSameOrNewerThen = -1
            Exit Function
        End If
    Next i
    
    isVersionOlderOrSameOrNewerThen = 1
End Function


Private Function fillUpArrayListsToMatchSizes(ByRef listA As ArrayList, ByRef listB As ArrayList)
    
    ' Auffüllen
    ' Wenn listA folgendes ist: [1, 0]
    ' und listB folgendes ist: [1, 0, 2]
    ' dann wird aus listA folgendes: [0, 1, 0]
    ' damit beide verglichen werden können
    ' ----------------------------
    While listA.count < listB.count
        listA.add 0
    Wend
    
    While listB.count < listA.count
        listB.add 0
    Wend
    ' ----------------------------
    
End Function


