Attribute VB_Name = "ThisMacroStorage"
Attribute VB_Base = "0{F3150046-2C6D-4630-B100-8F6EE502AF96}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = True

' Autor:  Martin Afelt GRAVURU
'

Option Explicit

Private WithEvents CurDoc As document
Attribute CurDoc.VB_VarHelpID = -1

Private lastSelectedShape As shape
'Private lastPastedShape As shape




' Diese Funktion kann hier ausgeführt werden, wenn noch keine Symbole von den Skripten vorhanden sind.
' Dann benötigt man das Fenster mit den globalen Einstellungen um die Symbole zu installieren.
' Dazu muss man nur die Funktion anklicken (Curser wird dann dort platziert) und F5 drücken
Public Sub ShowGlobalSettings()
    GlobalSettingsUserForm.init
    GlobalSettingsUserForm.Show vbModal
End Sub


Private Sub GlobalMacroStorage_Start()
    GMSManager.RunMacro "Tools", "Globals.Startup"
End Sub


Private Sub GlobalMacroStorage_WindowActivate(ByVal doc As document, ByVal Window As Window)
'    MsgBox "WindowActivate"
    Set CurDoc = doc
End Sub


Private Sub GlobalMacroStorage_WindowDeactivate(ByVal doc As document, ByVal Window As Window)
    Set CurDoc = Nothing
End Sub



Private Sub CurDoc_ShapeCreate(ByVal shape As shape)
'    MsgBox "CurDoc_ShapeCreate"


    ' Eingefügte Form über zuletzt ausgewählte Form setzen
    '
    'Nicht bei laufenden Scripten anweden. Erzeugt Fehler und ist langsamer
    If Not isMacroRunning() Then
'        MsgBox "macro not Running"

        If doOrder() Then

            ' Wenn eine Form erstellt oder eingefügt wird, wird sie immer über das aktuell (zuletzt) ausgewählte Shape eingefügt
            If Not lastSelectedShape Is Nothing And Not shape Is Nothing Then
    '            MsgBox "Name " & lastSelectedShape.name

                If isShapeReferenceValid(shape) Then

                    Dim orderOK As Boolean
                    orderOK = True

                    If shape.Type = cdrGroupShape Then
                           If shapesContainShape(shape.shapes, lastSelectedShape) Then

                                ' Wenn zuvor Formen ausgewählt waren und jetzt gruppiert werden und deshalb dieses Event aufgerufen wird,
                                ' darf die Gruppe nicht über das zuletzt gewählte Shape einsortiert werden.
                                ' Denn das zuletzt gewählte Shape ist jetz in der Gruppe und die Gruppe soll also über eines seiner Childs einsortiert werden? UNMÖGLICH
                                ' Deshalb würde Corel auch einfrieren wenn man das versucht!!!!!!!!!!!!!!!!!!!!
                                orderOK = False
                           End If
                    End If

                    ' Prüfen, ob beide Formen im selben Dokument sind
                    If Not shape.layer Is lastSelectedShape.layer Then
                        orderOK = False
                    End If

                    If orderOK Then
            '            MsgBox "Order"
                        shape.OrderFrontOf lastSelectedShape
                    End If
                End If

            End If
        End If
    End If
    On Error GoTo 0


    ' Bei Motiv-SVG's die Gruppe und die SVG-Daten löschen
    If shape.Type = cdrGroupShape Then
        If shape.shapes.count > 0 Then ' Es kann sein, dass eine Gruppe die keine Shapes hat, noch kurz da ist, bevor Corel sie löscht

            If shape.shapes(1).Type = cdrNoShape Then ' SVG-Daten
                If shape.shapes.count = 2 Then

                    shape.shapes(1).locked = False
                    shape.shapes(1).delete
                    shape.Ungroup
                End If
            End If
        End If
    End If

'    MsgBox "Shape created: " & Globals.getShapeTypeName(shape.Type) & ", #" & shape.Type

End Sub




Private Sub CurDoc_SelectionChange()
    If Not CurDoc.ActiveShape Is Nothing Then
        On Error Resume Next
        
        ' Wenn mehrere Formen eingefügt werden, darf sich nicht die 'lastPastedShape' ändern
        Dim ok As Boolean
        ok = True
        
        If ok Then Set lastSelectedShape = CurDoc.ActiveShape
        
        On Error GoTo 0
    End If
End Sub




Public Function shapesContainShape(shapes As shapes, shape As shape) As Boolean
    Dim i As Integer
    For i = 1 To shapes.count
        If shapes.item(i) Is shape Then
            shapesContainShape = True
            Exit Function
        End If
    Next i
    
End Function



Public Function isMacroRunning() As Boolean
    Dim macroRunning() As Variant
    ReDim macroRunning(0)
    GMSManager.RunMacro "Tools", "Globals.isMacroRunning", macroRunning
    isMacroRunning = macroRunning(0)
End Function



Public Function doOrder() As Boolean
    Dim resultt() As Variant
    ReDim resultt(0)
    GMSManager.RunMacro "Tools", "Globals.GetSetting_OrderPastedShapeAboveLastSelectedSub", resultt
'    MsgBox "result: " & CBool(resultt(0))
    doOrder = CBool(resultt(0))
End Function



Function isShapeReferenceValid(shape As shape) As Boolean
    On Error GoTo ReferenceError
    If shape.visible Then
        
    End If
    On Error GoTo 0
    
    isShapeReferenceValid = True
    Exit Function
ReferenceError:
    isShapeReferenceValid = False
End Function
