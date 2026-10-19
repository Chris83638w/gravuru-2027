VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} WeightCalculatorDialog 
   Caption         =   "Gewichts-Rechner"
   ClientHeight    =   1580
   ClientLeft      =   30
   ClientTop       =   370
   ClientWidth     =   5510
   StartUpPosition =   1  'Fenstermitte
   TypeInfoVer     =   9
End
Attribute VB_Name = "WeightCalculatorDialog"
Attribute VB_Base = "0{45EA309E-2B58-4CBF-91D4-F27B725CA6FF}{2CE338E5-CE29-4234-A434-A1EC6FAE1D10}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


Public selectedMaterialWeight As Double
Public selectedMaterialAndThickness As String



Private Sub cmdClose_Click()
    Hide
End Sub

Private Sub OkayButton_Click()
    Hide
    
    ' Ausgewähltes Material Gewicht merken
    Dim selectedMaterialWeightString As String
    selectedMaterialWeightString = Me.MaterialComboBox.List(Me.MaterialComboBox.ListIndex, 2)
    
    ' Reset
    selectedMaterialWeight = 0
    selectedMaterialAndThickness = ""
    
    
    Dim weightAsString As String
    weightAsString = replace(selectedMaterialWeightString, " gr", "")
    If weightAsString = "" Then Err.Raise vbObjectError + 513, , "Die Grammangabe fehlt wohl in der CSV für '" & Me.MaterialComboBox.List(Me.MaterialComboBox.ListIndex, 0) & "'"
    
    ' Merken
    selectedMaterialWeight = CDbl(replace(weightAsString, ".", ","))
    selectedMaterialAndThickness = Me.MaterialComboBox.List(Me.MaterialComboBox.ListIndex, 0) & " " & Me.MaterialComboBox.List(Me.MaterialComboBox.ListIndex, 1)
End Sub

Private Sub UserForm_Initialize()
    loadMaterials
End Sub

' Befüllt die MaterialComboBox aus der CSV (Spalten: Material, Dicke in mm, Gramm pro cm²; erste Zeile ist der Header)
Private Sub loadMaterials()
    Me.MaterialComboBox.Clear
    Me.MaterialComboBox.ColumnCount = 3
    
    Dim materialWeights As New ArrayList2D
    
    Globals.checkIfServerOnlineAndSelectOfflineWorkPath
    materialWeights.FromCSVFile Globals.getMainFolder & "Gravuru\MaterialWeights.csv"
    
    Dim i As Long
    Dim comboRow As Long
    For i = 2 To materialWeights.rowCount ' 1 ist der Header
        If Trim$(materialWeights.item(i, 1)) <> "" Then
            Me.MaterialComboBox.AddItem Trim$(materialWeights.item(i, 1))
            comboRow = Me.MaterialComboBox.ListCount - 1
            Me.MaterialComboBox.List(comboRow, 1) = Trim$(materialWeights.item(i, 2)) & " mm"
            Me.MaterialComboBox.List(comboRow, 2) = Trim$(materialWeights.item(i, 3)) & " gr"
        End If
    Next i
    
    ' Ersten Eintrag auswählen
    If Me.MaterialComboBox.ListCount > 0 Then Me.MaterialComboBox.ListIndex = 0
End Sub
