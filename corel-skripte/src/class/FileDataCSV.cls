Attribute VB_Name = "FileDataCSV"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
Implements IMonitoredFileData

Dim MonitoredFile As MonitoredFile
'Dim csvData() As String
Dim csvData As New ArrayList2D

Public Function IMonitoredFileData_init(monitoredFileVar As MonitoredFile)
    Set MonitoredFile = monitoredFileVar
End Function

Public Function IMonitoredFileData_loadData()
    csvData.FromCSVFile MonitoredFile.file.path
End Function

Public Property Get IMonitoredFileData_data() As Variant
    MonitoredFile.reloadFileIfNeeded
    Set IMonitoredFileData_data = csvData
End Property


Public Function getStringArrayList2D() As ArrayList2D
    Dim dummy ' Geht nicht anders :(
    Set dummy = IMonitoredFileData_data ' Cachen
    Set getStringArrayList2D = csvData
End Function

Public Function saveCSV()
    Globals.saveCSV csvData.ToArray, MonitoredFile.file.path
End Function

Public Function IMonitoredFileData_saveData()
    saveCSV
End Function


'Public Function removeElementsFrom2DArray(ParamArray elementIndexies() As Variant)
'    Globals.removeElementsFrom2DArray csvData, elementIndexies
'End Function
