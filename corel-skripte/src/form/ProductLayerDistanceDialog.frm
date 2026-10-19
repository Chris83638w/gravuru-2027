VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} ProductLayerDistanceDialog 
   ClientHeight    =   3240
   ClientLeft      =   30
   ClientTop       =   370
   ClientWidth     =   5510
   StartUpPosition =   1  'Fenstermitte
   TypeInfoVer     =   36
End
Attribute VB_Name = "ProductLayerDistanceDialog"
Attribute VB_Base = "0{F91B4358-41A7-4B71-8EAA-94412C4CBB45}{9A8B9C86-7BB2-43DD-87C9-2FA6D2DE9CEE}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


Private Sub cmdClose_Click()
    Hide
End Sub

Private Sub StartCommandButton_Click()
    
    Dim xOffset As Double
    Dim yOffset As Double
    
    On Error GoTo OffsetDoubleParseError
    If ProductLayerDistanceDialog.XTextBox.value = "" Then
        xOffset = 0
    Else
        xOffset = CDbl(ProductLayerDistanceDialog.XTextBox.value)
    End If
    
    If ProductLayerDistanceDialog.YTextBox.value = "" Then
        yOffset = 0
    Else
        yOffset = CDbl(ProductLayerDistanceDialog.YTextBox.value)
    End If
    On Error GoTo 0
    
    
    Hide
    
    ProductLayerDistance.Start ProductLayerDistanceDialog.PartAComboBox.ListIndex, ProductLayerDistanceDialog.LayerAComboBox.ListIndex, _
        ProductLayerDistanceDialog.PartBComboBox.ListIndex, ProductLayerDistanceDialog.LayerBComboBox.ListIndex, _
        xOffset, yOffset, ProductLayerDistanceDialog.XCheckBox.value, ProductLayerDistanceDialog.YCheckBox.value

    Exit Sub
OffsetDoubleParseError:
    MsgBox "Bitte gib für X & Y gültige Zahlen ein!", vbExclamation
End Sub



Public Function init()
    
    
    
End Function



Private Sub UserForm_Initialize()
    
    
   initPartCombobox ProductLayerDistanceDialog.PartAComboBox
   initPartCombobox ProductLayerDistanceDialog.PartBComboBox
   
   initLayerCombobox ProductLayerDistanceDialog.LayerAComboBox
   initLayerCombobox ProductLayerDistanceDialog.LayerBComboBox, True
    
End Sub




Private Function initLayerCombobox(comboBox As comboBox, Optional isB As Boolean)

    With comboBox
        Dim j As Integer
        For enumValue = PlaceFile.LayerMode.layer1 To PlaceFile.LayerMode.allLayers
            If enumValue = PlaceFile.LayerMode.allLayers Then
                .AddItem "Alle"
            Else
                .AddItem j + 1
            End If
            
            j = j + 1
        Next enumValue
        
        .text = IIf(isB, "2", "1") 'Standartauswahl
   End With
   
End Function




Private Function initPartCombobox(comboBox As comboBox)
    
    With comboBox
        Dim i As Integer
        For enumValue = PlaceFile.PartMode.Part1 To PlaceFile.PartMode.AllParts
            If enumValue = PlaceFile.PartMode.AllParts Then
                '.AddItem "Alle" 'Alle Parts machen keinen Sinn
            Else
                .AddItem i + 1
            End If
            
            i = i + 1
        Next enumValue
        
        .text = "1" 'Standartauswahl
   End With
    
End Function
