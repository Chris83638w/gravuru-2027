Attribute VB_Name = "StringWord"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
' Wird genutzt um arabischen Text beim AmazonImport zu tauschen

Public begin As Integer
Public ending As Integer
Public parentString As String

Public Property Get text() As String
    text = Globals.subStr(parentString, begin, ending)
End Property
