Attribute VB_Name = "ProductIDObject"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
Option Explicit

' Diese Klasse bildet eine Artikelnummer ab.
'
' Damit lassen sich Informationen aus einer Artikelnummer einfach entnehmen
' Bspw. welche Designnummer die Artikelnummer hat.
' Das Parsen übernimmt diese Klasse
'
' Andersherum funktioniert es auch. Man kann bspw. die Designnummer ändern und dann die zusammengesetzte Artikelnummer bekommen
' Diese Klasse stellt also sicher, dass das Parsen in beide Richtungen immer den selben Regeln folgt.


Public Enum productIDType
    NormalProductID
    IgnoreProductID
    ProductImageVariantProductID
    Keep ' Beibehalten. Wird in der GUI ProductIDDialog genutzt
End Enum


Dim productIDStr As String

' Eigenschaften
Dim productLine As String ' GD
Dim material As String ' V2A
Dim size As String ' 30x20(28x18)
Dim designNumber As Integer ' 1
Dim masterDesign As Boolean
Dim productImageVariantNumber As Integer


Public Function setProductIDMasterDesign(Optional cutOffSuffix As Boolean = False) As ProductIDObject
    Set setProductIDMasterDesign = setProductID(Globals.MASTER_DESIGN_PRODUCT_ID, cutOffSuffix)
End Function


' Achtung: Wirft einen Fehler, wenn 'id' einen Unterstrich oder Leerzeichen hat
' Ist 'cutOffSuffix' werden beide Zeichen und alles danach abgeschnitten:
' "GT-S-30x20_persp" -> "GT-S-30x20"
' "GT-S-30x20 persp" -> "GT-S-30x20"
Public Function setProductID(id As String, Optional cutOffSuffix As Boolean = False) As ProductIDObject

    If Globals.stringCompare(id, "_", StringInside) Or Globals.stringCompare(id, " ", StringInside) Then
        ' Unterstriche sind nicht erlaubt, da eine Artikelnummer dort endet, wo ein Unterstrich anfängt: "GT-A-30x20-D1_anthrazit.jpg"
        ' Nur so kann man zum einen alle Dateien einer bestimmten Artikelnummer finden. Der Anfang der Datei muss die Artikelnummer sein, allerdings sind auch alle Anhängsel erlaub wie "_anthrazit.jpg"
        ' Das Problem ist, dass eine "0" auch als Anhängsel gesehen werden könnte. Somit würde die Datei "GT-A-30x20-D10_anthrazit.jpg" zur Artikelnummer "GT-A-30x20-D1" gehören, was ja falsch währe.
        ' Deshalb wird alles nach dem Unterstrich hinter einer Artikelnummer ignoriert und als Anhängsel gesehen. Damit lassen sich Daten von unterschiedlichen Artikelnummern auseinanderhalten wie "A-30x20-D1_anthrazit.jpg" und "A-30x20-D10_anthrazit.jpg"
        ' Gleiches gilt für Leerzeichen
        
        If cutOffSuffix Then
            ' Unterstrich entfernen
            If Globals.stringCompare(id, "_", StringInside) Then
                id = Split(id, "_")(0)
            End If
            
            If Globals.stringCompare(id, " ", StringInside) Then
                id = Split(id, " ")(0)
            End If
            
        Else
            Err.Raise vbObjectError + 513, , "[ProductIDObject.setProductID] Die Artikelnummer darf keine Unterstriche oder Leerzeichen haben: '" & id & "'"
        End If
        
    End If
    productIDStr = id
    
    If productIDStr = Globals.MASTER_DESIGN_PRODUCT_ID Then
        setDefaultValues
        masterDesign = True
        Exit Function
    End If
    
    If productIDStr = "" Then
        setDefaultValues
        Exit Function
    End If
    
    
    Dim partsArray() As String
    partsArray = Split(productIDStr, "-")
    
    Dim parts As collection
    Set parts = Globals.stringArrayToCollection(partsArray)
    
    ' Größe
    size = ""
    Dim i As Integer
    For i = 1 To parts.count
        Dim sizeResult As String
        sizeResult = Globals.getSizeFromString(parts(i), , True)
        
        ' Nur wenn das Ergebnis (bspw. "A3") so lang ist wie der Abschnitt, aus dem es extrahiert wurde (abzüglich Leerzeichen) (bspw.: "GSTKA3" ein Grabstecker),
        ' nur dann war der Abschnitt wirklich für die Größe
        If Not sizeResult = "" And Len(sizeResult) = Len(Trim(parts(i))) Then
            size = sizeResult
            parts.Remove i
            Exit For
        End If
    Next i
    
    ' Design Nummer
    designNumber = -3 ' Keine gültige Designnummer. Entnommen von der Globals.getDesignNrFromProductID
    For i = 1 To parts.count
        ' 'Globals.getDesignNrFromProductID' prüft nicht, ob die Designnummer mit einem D beginnt. Deshalb wird es hier gemacht.
        If startsWith(UCase(parts(i)), "D") Then
            Dim designNumberResult As Integer
            designNumberResult = Globals.getDesignNrFromProductID(UCase(parts(i)))
            If Not designNumberResult = -3 Then
                designNumber = designNumberResult
                parts.Remove i
                Exit For
            End If
        End If
    Next i
    
    ' Produktlinie
    productLine = ""
    If parts.count > 0 Then
        productLine = parts(1)
        parts.Remove 1
    End If
    
    ' Material
    material = ""
    If parts.count > 0 Then
        material = parts(1)
        parts.Remove 1
    End If
    
    
    ' Design-Varianten-Nummer
    productImageVariantNumber = 0
    For i = parts.count To 1 Step -1 ' Rückwärst suchen, da die Variantennummer ganz hinten sein sollte
        ' Designvariantennummern kommen ohne kürzell oder irgendwas. Ist also nur eine Zahl:
        ' GT-S-30x20-D1-2
        ' "2" ist hier die Designvariantennummer
        If IsNumeric(parts(i)) Then
            productImageVariantNumber = CInt(parts(i))
            parts.Remove i
            Exit For
        End If
    Next i
    
    ' Notlösung für Ostereier die keine Breitenangabe haben: 'OAA-A-10-D1'
    If size = "" Then
        For i = 1 To parts.count
            If IsNumeric(parts(i)) Then
                size = parts(i)
            End If
        Next i
    End If

    
    Set setProductID = Me
End Function


Public Function setDefaultValues()
    productLine = ""
    material = ""
    size = ""
    designNumber = -3 ' Keine gültige Designnummer. Entnommen von der Globals.getDesignNrFromProductID
    masterDesign = False
    productImageVariantNumber = 0
End Function


Public Function removeDesignNumber(Optional refresh As Boolean = True) As ProductIDObject
    designNumber = -3 ' Keine gültige Designnummer. Entnommen von der Globals.getDesignNrFromProductID
    If refresh Then refreshProductID
    Set removeDesignNumber = Me
End Function


' Die Setter geben das Objekt zurück um chaining zu vereinfachen
Public Function setProductLine(value As String, Optional refresh As Boolean = True) As ProductIDObject
    productLine = value
    If refresh Then refreshProductID
    Set setProductLine = Me
End Function

Public Function getProductLine() As String
    getProductLine = productLine
End Function

Public Function getProductLineFullName() As String
    getProductLineFullName = productID.getProductLineFullName(getProductLine)
End Function



Public Function setMaterial(value As String, Optional refresh As Boolean = True) As ProductIDObject
    material = value
    If refresh Then refreshProductID
    Set setMaterial = Me
End Function

Public Function getMaterial() As String
    getMaterial = material
End Function

Public Function getMaterialFullName() As String
    getMaterialFullName = productID.getMaterialFullName(getMaterial)
End Function

Public Function setSize(value As String, Optional refresh As Boolean = True) As ProductIDObject
    size = value
    If refresh Then refreshProductID
    Set setSize = Me
End Function

Public Function getSize(Optional normalOrInBrackeysOrBoth = 3) As String
    
    ' Normal '30x20'
    If normalOrInBrackeysOrBoth = 1 Then
        If Not InStr(size, "(") = 0 Then
            getSize = Trim(left(size, Len(size) - InStr(size, "(") - 1)) ' Aus 30x20 (28x18) wird 30x20
        Else
            getSize = size
        End If
    
    ' Die Größe aus den Klammern (bei 30x20(28x18) -> '28x18')
    ElseIf normalOrInBrackeysOrBoth = 2 Then
        If Not InStr(size, "(") = 0 Then
            getSize = Trim(Globals.getStringBetweenStrings(size, "(", ")"))
        Else
            getSize = size
        End If
    Else
        getSize = size
    End If

End Function


Public Function replaceSizeDotWithComma()
    size = replace(size, ".", ",")
End Function



Public Function setDesignNumber(value As String, Optional refresh As Boolean = True) As ProductIDObject
    If value = "" Then
        designNumber = 0
    Else
        designNumber = value
    End If
    
    If refresh Then refreshProductID
    Set setDesignNumber = Me
End Function

Public Function getDesignNumber() As String
    getDesignNumber = designNumber
End Function

Public Function getDesignNumberBeautiful(Optional withD As Boolean = True) As String
    If getDesignNumber = -3 Then
        getDesignNumberBeautiful = "Freies Design"
    Else
        getDesignNumberBeautiful = IIf(withD, "D", "") & getDesignNumber
    End If
End Function

Public Function hasDesignNumber() As Boolean
    hasDesignNumber = designNumber > 0
End Function



Public Function setNoProductImageVariantNumber(Optional refresh As Boolean = True) As ProductIDObject
    setProductImageVariantNumber 0, refresh
    Set setNoProductImageVariantNumber = Me
End Function

Public Function setProductImageVariantNumber(value As Integer, Optional refresh As Boolean = True) As ProductIDObject
    productImageVariantNumber = value
    If refresh Then refreshProductID
    Set setProductImageVariantNumber = Me
End Function

Public Function getProductImageVariantNumber() As String
    getProductImageVariantNumber = productImageVariantNumber
End Function

Public Function hasProductImageVariantNumber() As Boolean
    hasProductImageVariantNumber = productImageVariantNumber > 0
End Function


Public Function isMasterDesign() As Boolean
    isMasterDesign = masterDesign
End Function

' Gibt an, ob es das Wunschtext Design ist
Public Function isMainDesign() As Boolean
    isMainDesign = Not hasDesignNumber
End Function


' Stellt die Artikelnummer so um, das es wie ein Standartdesign ohne Designummer o.Ä ist (Wunschtext-Design)
Public Function setMainDesign()
    setDesignNumber ""
    setNoProductImageVariantNumber
End Function

Public Function refreshProductID()
    
    If masterDesign Then
        productIDStr = Globals.MASTER_DESIGN_PRODUCT_ID
        Exit Function
    End If
    
    ' Produktlinie
    productIDStr = productLine
    
    ' Material
    addPropertyToProductID material
    
    ' Größe
    addPropertyToProductID size
    
    ' Design-Nummer
    If hasDesignNumber Then
        addPropertyToProductID "D" & designNumber
    End If
    
    ' Produktbild-Varianten-Nummer
    If hasProductImageVariantNumber Then
        addPropertyToProductID CStr(productImageVariantNumber)
    End If
    
End Function


Private Function addPropertyToProductID(property As String)
    If Not property = "" Then
        addLineToStringIfNotEmpty productIDStr ' Trennstrich, wenn nötig
        productIDStr = productIDStr & property
    End If
End Function


Private Function addLineToStringIfNotEmpty(ByRef str As String)
    If Not str = "" Then
        str = str & "-"
    End If
End Function


Public Function getProductID(Optional refresh As Boolean = False)
    If refresh Then refreshProductID
    getProductID = productIDStr
End Function



Public Function clone() As ProductIDObject
    Dim obj As New ProductIDObject
    obj.setProductID Me.getProductID
    Set clone = obj
End Function



