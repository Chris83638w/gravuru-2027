Attribute VB_Name = "ConfiExport"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
Option Explicit

' Autor: Martin Afelt @ Gravuru
'
' Beschreibt einen Konfigurator mit Views (ConfiView)
'
' Variablen-Namens-Vorschlag: cExport


Public productID As String

Public variante As variante
Public varianteIndex As Integer
Public allVariants As VariantRange

' Die ViewSettings bestimmen wie der ConfiHelper die Views hier einfügt
Public viewSettings As ConfiPartToViewSortInstruction
Public partsSortedInViews As collection

Public exportIndex As Integer

Public views As New ConfiViewRange

' Sagt aus, ob die Layer noch für den Export vorbereitet werden müssen: Grunplattenvarianten platzieren, Maske erstellen usw.
Public prepareForExport As Boolean

Private Sub Class_Initialize()
    prepareForExport = True
End Sub

Public Function addView(view As ConfiView)
    Set view.confiEx = Me
    views.add view
End Function

Public Function removeView(ByVal index As Integer)
    views.RemoveAt index
    
    Dim i As Integer
    For i = 1 To views.count
        views.getView(i).index = i
    Next i
End Function

Public Function getView(ByVal index As Integer) As ConfiView
    Set getView = views.getView(index)
End Function

Public Function getViewCount() As Integer
    getViewCount = views.count
End Function
