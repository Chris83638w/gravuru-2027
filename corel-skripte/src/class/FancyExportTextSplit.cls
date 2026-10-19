Attribute VB_Name = "FancyExportTextSplit"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
Public shape As shape
Public text As String

Public x As Double
Public y As Double
Public width As Double
Public height As Double
Public size As Double
Public angle As Double

Public color As String
Public font As String
Public alignment As cdrAlignment ' Die Ausrichtung: Linksbündig, Mittig, Rechtsbündig, Blocksatz
Public rangeKerning As Double ' Die Laufweite (Abstand zwischen einzelnen Buchstaben)

Public italic As Boolean
Public bold As Boolean
Public underline As Boolean

