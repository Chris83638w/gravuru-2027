Attribute VB_Name = "PlaceFileParameters"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
Option Explicit

' Autor: Martin Afelt @ Gravuru

' Parameter für 'PlaceFile.Start' und 'PlaceFile.startFunction'
' Erstellen mit 'Classfactory.newPlaceFileParameters'. Die 'set...'-Funktionen geben das Objekt selbst zurück und können so verkettet werden:
'   PlaceFile.startFunction shapes, Classfactory.newPlaceFileParameters.setParts(Part1, layer1).setQuiet

' Achtung: Die Namen der Felder dürfen nicht genauso heißen wie die Enum-Typen (PartMode, LayerMode, MainShapeAddMode)
Public partModeVar As PartMode
Public layerModeVar As LayerMode
Public useOffsetForCDR As Boolean
Public groupsAsDesigns As Boolean
Public deleteMode As Boolean
Public mainShapeAddModeVar As MainShapeAddMode
Public quietMode As Boolean
Public errorWhenNothingPlaced As Boolean
Public filePathForFilePlacement As String
Public shapeNameToPlaceOn As String
Public logger As logger


Private Sub Class_Initialize()
    partModeVar = AllParts
    layerModeVar = allLayers
    mainShapeAddModeVar = AutoSenseNewMainShapes
End Sub


Public Function setParts(part As PartMode, layer As LayerMode) As PlaceFileParameters
    partModeVar = part
    layerModeVar = layer
    Set setParts = Me
End Function

Public Function setUseOffsetForCDR(Optional value As Boolean = True) As PlaceFileParameters
    useOffsetForCDR = value
    Set setUseOffsetForCDR = Me
End Function

Public Function setGroupsAsDesigns(Optional value As Boolean = True) As PlaceFileParameters
    groupsAsDesigns = value
    Set setGroupsAsDesigns = Me
End Function

Public Function setDeleteMode(Optional value As Boolean = True) As PlaceFileParameters
    deleteMode = value
    Set setDeleteMode = Me
End Function

Public Function setMainShapeAddMode(mode As MainShapeAddMode) As PlaceFileParameters
    mainShapeAddModeVar = mode
    Set setMainShapeAddMode = Me
End Function

Public Function setQuiet(Optional value As Boolean = True) As PlaceFileParameters
    quietMode = value
    Set setQuiet = Me
End Function

Public Function setErrorWhenNothingPlaced(Optional value As Boolean = True) As PlaceFileParameters
    errorWhenNothingPlaced = value
    Set setErrorWhenNothingPlaced = Me
End Function

Public Function setFilePath(path As String) As PlaceFileParameters
    filePathForFilePlacement = path
    Set setFilePath = Me
End Function

Public Function setShapeNameToPlaceOn(shapeName As String) As PlaceFileParameters
    shapeNameToPlaceOn = shapeName
    Set setShapeNameToPlaceOn = Me
End Function

Public Function setLogger(loggerVar As logger) As PlaceFileParameters
    Set logger = loggerVar
    Set setLogger = Me
End Function
