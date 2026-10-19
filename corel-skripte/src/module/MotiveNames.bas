Attribute VB_Name = "MotiveNames"

' Autor:  Martin Afelt GRAVURU
'

' TODO evtl. löschen, da das Skript nie genutzt wurde

Dim csvString As String

Sub createMotiveNames()
    
    Globals.checkIfServerOnlineAndSelectOfflineWorkPath
    Globals.checkVersion
    
    If Not ActiveDocument.name = "Alle Motive.cdr" Then
        MsgBox "Das ist in dieser Datei nicht möglich nur in der 'Alle Motive'-Datei", vbExclamation
        Globals.endMacro
    End If
    allShapesOrAllMotives = (ActiveDocument.name = "Alle Formen.cdr")
    
    Dim previousUnit As Integer
    previousUnit = ActiveDocument.unit
    ActiveDocument.unit = cdrMillimeter
    
    csvString = "name;width;height;area"
    
    For i = 1 To ActiveDocument.Pages.count
            For j = 1 To ActiveDocument.Pages(i).shapes.count
                If ActiveDocument.Pages(i).shapes(j).Type = cdrGroupShape Then
                    MsgBox "Gruppen sind nicht erlaubt!", vbCritical
                    ActiveDocument.Pages(i).shapes(j).CreateSelection
                    Globals.endMacro
                End If
                processMotive ActiveDocument.Pages(i).shapes(j)
            Next j
    Next i
    
    
    Globals.saveTextFile csvString, Globals.getMainFolder & "\Fancyexport\Alle Motive\Alle Motive.csv"  'Globals.getDesktopPath & "\Produktgrößennamen.csv"
    
    ActiveDocument.unit = previousUnit
    
    MsgBox "Fertig", vbInformation
End Sub

Private Function processMotive(motive As shape)
    
    Dim name As String
    name = motive.name
    
    Dim area As Double
    area = Globals.getAreaOfShape(motive)
    
    csvString = csvString & vbNewLine & name & ";" & motive.SizeWidth & ";" & motive.SizeHeight & ";" & area
    
End Function

