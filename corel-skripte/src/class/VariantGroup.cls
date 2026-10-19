Attribute VB_Name = "VariantGroup"
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
' Eine Variantengruppe ist bspw. eine DesignElementVarianten Gruppe. Z.B. die Gruppe 1. desVar(1) also


' Ein parent muss nicht zwingend da sein. Somit kann man auch losgelößt mit dieser Gruppe arbeiten
Dim parent As VariantArray


Public variants As New VariantRange



Public Function newVariantGroup(Optional parent_ As VariantArray)
    Set parent = parent_
End Function



Public Function addVariante(varia As variante, Optional addToParent As Boolean, Optional setVariantParent As Boolean = True)
    
    ' Prüfen, ob 'varia' vom sleben Typ ist wie die anderen Varianten
    ' Denn eine Gruppe kann nur aus
    If variants.count > 0 Then
        If Not varia.typee = variants.item(1).typee Then
            Err.Raise vbObjectError + 513, , "[VariantGroup.addVariante] Der Varianten-Typ der hinzugefügten Variante passt nicht zu den restlichen aus der Liste. varia.typee:'" & varia.typee & "' , variants.item(1).typee: '" & variants.item(1).typee & "'"
        End If
    End If

    variants.add varia
    
    ' Parent setzen
    If setVariantParent Then Set varia.parent = Me
    
    If addToParent And Not parent Is Nothing Then
        parent.addVariant varia
    End If
    ' TODO zum parent hinzufügen
End Function


Public Function activateVariantByIndex(index As Integer)
    activateVariant getVariant(index)
End Function


Public Function activateVariant(varia As variante)
    
    Dim i As Integer
    For i = 1 To variants.count
        Dim currVar As variante
        Set currVar = variants.item(i)
        
        currVar.setActive currVar Is varia
        
        Set currVar = Nothing
    Next i
End Function


Public Function getVariant(ByVal index As Integer) As variante
    Set getVariant = variants.item(index)
End Function


Public Function removeVariantByIndex(index As Integer, Optional removeGroupFromParentIfEmpty As Boolean, Optional logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[VariantGroup.removeVariantByIndex]"
    If Not logger Is Nothing Then logger.logINFO "index: '" & index & "'"
    
    removeVariant getVariant(index), removeGroupFromParentIfEmpty, logger
    
    If Not logger Is Nothing Then logger.removeTab
End Function

Public Function removeVariant(varia As variante, Optional removeGroupFromParentIfEmpty As Boolean, Optional logger As logger)
    If Not logger Is Nothing Then logger.addTab , "[VariantGroup.RemoveVariant]"
    
    If Not logger Is Nothing Then logger.logINFO "varia: '" & varia.toString & "'"
    
    variants.removeVariant varia
    
    ' Wenn die Gruppe nach dem löschen der Variante leer ist, dann wird sie aufgelößt
    If variants.count = 0 And removeGroupFromParentIfEmpty And Not parent Is Nothing Then
        parent.removeVariantGroup Me, logger
    End If
    
    If Not logger Is Nothing Then logger.removeTab
End Function


Public Function removeEqualVariants() As VariantGroup
    variants.removeEqualVariants
    Set removeEqualVariants = Me
End Function


Public Function clone(Optional addToSameParent As Boolean) As VariantGroup
    
    Dim result As New VariantGroup
    If addToSameParent Then result.newVariantGroup parent
    
    Dim i As Integer
    For i = 1 To variants.count
        result.addVariante variants.item(i), False, False
    Next i
    
    Set clone = result
End Function


' Gibt zurück, ob es nur eine Variante in dieser Gruppe gibt. Das würde in einigen Fällen dann nicht als wirkliche Variantengruppe gesehen werden
' Im FancyExport z.B. würde eine Grundplatte erst als Variante exportiert werden, wenn es noch eine Zweite geben würde
Public Function isSingleVariant(Optional logger As logger) As Boolean
    If Not logger Is Nothing Then logger.addTab , "[VariantGroup.isSingleVariant] Me: " & toString
    isSingleVariant = variants.count = 1
    
    If Not logger Is Nothing Then
        logger.logINFO "Returne: '" & isSingleVariant & "'"
        logger.removeTab
    End If
End Function

Public Function getGroupName() As String
    If variants.count > 0 Then getGroupName = variants.item(1).variantGroupName
End Function

Public Function getGroupNameForFancy() As String
    If variants.count > 0 Then getGroupNameForFancy = variants.item(1).variantGroupNameForFancy
End Function

Public Function getVariantTypeOfFirstVariant() As variantType
    getVariantTypeOfFirstVariant = NoVariantType
    If variants.count > 0 Then getVariantTypeOfFirstVariant = variants.item(1).typee
End Function

Public Function toString() As String
    toString = "VariantGroup: [" & variants.toString() & "]"
End Function

