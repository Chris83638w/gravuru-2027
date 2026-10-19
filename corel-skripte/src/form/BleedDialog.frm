VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} BleedDialog 
   Caption         =   "Beschnittzugabe erstellen"
   ClientHeight    =   3130
   ClientLeft      =   30
   ClientTop       =   370
   ClientWidth     =   4050
   StartUpPosition =   1  'Fenstermitte
   TypeInfoVer     =   34
End
Attribute VB_Name = "BleedDialog"
Attribute VB_Base = "0{84DEEC6F-DD4F-459A-9153-CBAA2BAAA98A}{413CA3E5-0629-46B5-8E34-E03BD7140154}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


Private Sub UserForm_Initialize()
    
    With BleedDialog.BleedComboBox
        .AddItem CStr(Globals.getDefaultBleedSizeInMM) & " mm (UV Standart)"
        .AddItem "0 mm"
        
        If .value = "" Then
            .value = .List(0)
        End If
        
    End With
    
    
    ' Wenn das ausgewählte oder das erste Design UV ist, wird passend zu UV 0,5 mm vorgeschlagen
    ' Wenn es aber Gravur ist, dann 0 mm
    Dim productDesign As productDesign
    
    If ActiveSelectionRange.count > 0 Then
        If ActiveSelectionRange(1).Type = cdrGroupShape Then
            Set productDesign = New productDesign
            productDesign.newProductDesign ActiveSelectionRange(1)
        End If
    Else
        Dim firstGroupShape As shape
        Set firstGroupShape = ActiveLayer.shapes.FindShape(, cdrGroupShape)
        
        If Not firstGroupShape Is Nothing Then
            Set productDesign = New productDesign
            productDesign.newProductDesign ActiveLayer.shapes.FindShape(, cdrGroupShape)
        End If
    End If
    
    
    If Not productDesign Is Nothing Then
        If productDesign.isValidProductDesign Then
            If productDesign.getLayer(1, 1).isGraving Then
                BleedDialog.BleedComboBox.value = BleedDialog.BleedComboBox.List(1)
'                MsgBox "[Bleeddialog] Gravur"
            Else
                BleedDialog.BleedComboBox.value = BleedDialog.BleedComboBox.List(0)
'                MsgBox "[Bleeddialog] UV"
            End If
        End If
    End If
    
End Sub


Private Sub CancelButton_Click()
    Hide
End Sub


Private Sub OKButton_Click()

    Dim bleedInMM As Double
    
    If BleedDialog.BleedComboBox.value = CStr(Globals.getDefaultBleedSizeInMM) & " mm (UV Standart)" Then
        bleedInMM = Globals.getDefaultBleedSizeInMM
    ElseIf BleedDialog.BleedComboBox.value = "0 mm" Then
        bleedInMM = 0
    Else
    
        On Error GoTo Error
        bleedInMM = CDbl(replace(BleedDialog.BleedComboBox.value, ",", "."))
        On Error GoTo 0
        
    End If
    
    Hide
    
    Tool.createBleed bleedInMM, BleedDialog.CutDeisgnOptionButton.value, BleedDialog.CutGroundPlateCheckBox.value, BleedDialog.CutMotivesCheckBox.value, Globals.getLogger(True)
    
    Exit Sub
Error:
    MsgBox "Die Millimeterangabe passt nicht!", vbExclamation
End Sub
