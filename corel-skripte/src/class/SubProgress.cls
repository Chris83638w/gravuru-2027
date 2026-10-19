Attribute VB_Name = "SubProgress"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


Public childProgress As SubProgress

Dim steps As Integer
Dim stepsProgress As Integer

Dim progress As Double ' Dezimal. 1 ist 100%

Dim displayText As String

Public Function setSteps(stepsVar As Integer)
    steps = stepsVar
End Function

Public Function getSteps() As Integer
    getSteps = steps
End Function


Public Function setStepsProgress(ByVal stepsProgressVar As Integer)
    stepsProgress = stepsProgressVar
    setProgress CDbl(stepsProgress) / CDbl(steps)
End Function


Public Function setProgress(progressVar As Double)
    progress = progressVar
    
    ProgressBarUserForm.refreshSubProgressesText
    ProgressBarUserForm.refreshSubProgressesProgress
    
End Function


Public Function getProgress() As Double
    getProgress = progress
End Function


Public Function setDisplayText(displayTextVar As String)
    displayText = displayTextVar
    ProgressBarUserForm.refreshSubProgressesText
End Function


Public Function getDisplayText() As String
    getDisplayText = displayText
End Function


Public Function finishProgress()
    
    setProgress 1
    
    ProgressBarUserForm.removeSubProgress Me
    
End Function
