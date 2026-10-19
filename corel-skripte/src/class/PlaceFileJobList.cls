Attribute VB_Name = "PlaceFileJobList"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
Public jobs As New collection


Public Function newJob(Optional addJobToJobList As Boolean = True) As PlaceFileJob
    Dim job As New PlaceFileJob
    
    job.init Me, addJobToJobList
    Set newJob = job

End Function


Public Function addJob(job As PlaceFileJob)
    job.setParentJobListAndAdd Me
End Function

