Attribute VB_Name = "StopWatch"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
Dim myTime As Double

Public Sub startTimer()
    myTime = timer
End Sub

Public Function stopTimer() As String
    Dim diff As Double
    
    diff = timer - myTime
    
    stopTimer = Format$(diff, "0.000") & " s"
End Function
