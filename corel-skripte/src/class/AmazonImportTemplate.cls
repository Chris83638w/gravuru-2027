Attribute VB_Name = "AmazonImportTemplate"
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
' Eine geöffnete Schablone beim AmazonImport. Also das Schablonen-Dokument und die Gruppe mit den (noch freien) Designpositionen
' Jede View/Design-CDR kann seine eigene Schablone haben
'
' Variablen-Namens-Vorschlag: template

Public doc As document
Public slotsGroup As shape

' Wie viele Plätze die ausgewählten Bestellungen in dieser Schablone benötigen
Public neededSlots As Integer


' Öffnet die Schablonen-CDR
Public Function initFromFile(path As String)
    ' Dokument als Kopie öffnen. So kann es nicht aus versehen überschrieben werden
    Set doc = Application.OpenDocumentAsCopy(path)
    doc.name = Globals.getFolderFileAndType(path)(1)
    
    initDocument
End Function


' Nutzt ein bereits geöffnetes Dokument als Schablone (z.B: "Aktuelles Dokument")
Public Function initFromDocument(document_ As document)
    Set doc = document_
    
    initDocument
End Function


Private Function initDocument()
    ' Als Schablone markieren, damit eine offene Schablonen-CDR in der Schablonenauswahl beim nächsten Import vorgeschlagen wird
    doc.Metadata.Notes = "Schablone"
    
    ' Die Designs werden in Pixel geladen. Damit die Positionen beim Verschieben zwischen Dokumenten passen, auch hier Pixel nutzen
    doc.unit = cdrPixel
    
    Dim i As Integer
    
    ' Die Gruppe mit den Designvorlagen/positionen finden
    ' Wenn schon Designs in die Schablone geladen wurden, dann gibt es mehrere Gruppen
    ' -------------------------
    Dim groups As shapeRange
    Set groups = doc.ActiveLayer.FindShapes(, cdrGroupShape, False)
    For i = 1 To groups.count
        If newCustomShapeTypeQuery(groups(i), RedOrPinkShape).setRecursionLimit(1).isAllShapesMatchingQuery Then
            Set slotsGroup = groups(i)
            Exit For
        End If
    Next i
    ' -------------------------
    
    If slotsGroup Is Nothing Then
        MsgBox "Es wurde in der Schablone '" & doc.name & "' keine Gruppe mit den Designpositionen gefunden!" & vbNewLine & "[AmazonImportTemplate.initDocument]", vbCritical
        Globals.endMacro
    End If
End Function


' Sind alle Plätze belegt, wurde die Gruppe mit dem letzten Platz gelöscht
Public Function hasFreeSlot() As Boolean
    If slotsGroup Is Nothing Then Exit Function
    hasFreeSlot = Not Globals.isShapeDeleted(slotsGroup)
End Function


Public Function getFreeSlotsCount() As Integer
    If hasFreeSlot Then getFreeSlotsCount = slotsGroup.shapes.count
End Function


' Nächste freie Stelle in der Schablone
Public Function getNextFreeSlot() As shape
    Set getNextFreeSlot = slotsGroup.shapes.First
End Function
