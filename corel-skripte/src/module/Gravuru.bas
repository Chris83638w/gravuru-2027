Attribute VB_Name = "Gravuru"
Option Explicit

' Autor: Martin Afelt @ Gravuru
'
'


Public Enum MaterialType
    mtUnknown = 0
    mtAcrylicClear
    mtAcrylicSatin
    mtAcrylicAnthrazit
    mtAcrylicBlack
    mtAcrylicBlackSatin
    
    All ' Zum Iterieren in einer For-Schleife
End Enum

Public Function MaterialTypeToString(ByVal value As MaterialType) As String
    Dim result As String
    Select Case value
        Case mtAcrylicClear: result = "Klares Acryl"
        Case mtAcrylicSatin: result = "Satiniertes Acryl"
        Case mtAcrylicAnthrazit: result = "Anthrazit Acryl"
        Case mtAcrylicBlack: result = "Schwarzes Acryl"
        Case mtAcrylicBlackSatin: result = "Schwarzes Acryl satiniert"
        Case Else: result = "Unknown"
    End Select
    MaterialTypeToString = result
End Function
