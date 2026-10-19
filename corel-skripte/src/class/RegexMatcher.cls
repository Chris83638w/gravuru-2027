Attribute VB_Name = "RegexMatcher"
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
' Kapselt ein RegExp Objekt
' Erlaubt es leichter an gematchte Ergebnisse zu kommen ohne selber casten zu müssen
' Erlaubt es chaining zu nutzen um in einer Zeile bequemer zu matchen

Dim regexx As New RegExp
Dim matches As MatchCollection

Public Function SetIgnoreCase(ignoreCase As String) As RegexMatcher
    regexx.ignoreCase = ignoreCase
    Set SetIgnoreCase = Me
End Function


Public Function SetPattern(pattern_ As String) As RegexMatcher
    regexx.Pattern = pattern_
    Set SetPattern = Me
End Function


Public Function setMultiline(multiline_ As Boolean) As RegexMatcher
    regexx.MultiLine = multiline_
    Set setMultiline = Me
End Function


Public Function setGlobal(global_ As Boolean) As RegexMatcher
    regexx.Global = global_
    Set setGlobal = Me
End Function


Public Function Test(sourceString As String) As Boolean
    Test = regexx.Test(sourceString)
End Function


Public Function Execute(sourceString As String) As RegexMatcher
    Set matches = regexx.Execute(sourceString)
    Set Execute = Me
End Function


Public Function replace(sourceString As String, replaceVar As String) As String
    replace = regexx.replace(sourceString, replaceVar)
End Function


' ACHTUNG matchNumber ist 1-basiert
Public Function getMatchAsInt(Optional defaultValue As Integer = 0, Optional matchNumber As Integer = 1) As Integer
    Dim result As Integer
    
    Dim resultStr As String
    resultStr = getMatchValue(matchNumber)
    On Error GoTo CastingError
    result = CInt(resultStr)
    On Error GoTo 0
    
    If resultStr = "" Then result = defaultValue

    getMatchAsInt = result
    Exit Function
CastingError:
    Err.Raise vbObjectError + 513, , resultStr & " konnte nicht zu einem Int gecastet werden"
End Function


' ACHTUNG matchNumber ist 1-basiert
Public Function getMatchAsString(Optional defaultValue As String = "", Optional matchNumber As Integer = 1) As String
    Dim result As String
    result = getMatchValue(matchNumber)
    If result = "" Then result = defaultValue
    
    getMatchAsString = result
End Function


Public Function getMatchGroupAsString(Optional defaultValue As String = "", Optional matchNumber As Integer = 1, Optional groupNumber As Integer = 1)
    
    Dim result As String
    
    result = getMatchGroup(matchNumber, groupNumber)
    
    If result = "" Then
        result = defaultValue
    End If
    
    getMatchGroupAsString = result
End Function


Public Function getMatchGroupAsInt(Optional defaultValue As Integer = 0, Optional matchNumber As Integer = 1, Optional groupNumber As Integer = 1)
    Dim result As Integer
    
    Dim resultStr As String
    resultStr = getMatchGroup(matchNumber, groupNumber)
    
    If resultStr = "" Then
        result = defaultValue
    Else
        On Error GoTo CastingError
        result = CInt(resultStr)
        On Error GoTo 0
    End If
    
    getMatchGroupAsInt = result
    Exit Function
CastingError:
    Err.Raise vbObjectError + 513, , resultStr & " konnte nicht zu einem Int gecastet werden"
End Function


Private Function getMatchValue(matchNumber As Integer) As String
    Dim match As IMatch2
    Set match = getMatch(matchNumber)
    
    If match Is Nothing Then Exit Function
    
    getMatchValue = match.value
End Function


Private Function getMatchGroup(matchNumber As Integer, ByVal groupNumber As Integer) As String
    Dim match As IMatch2
    Set match = getMatch(matchNumber)
    
    If match Is Nothing Then Exit Function
    
    ' Von 1 basierend auf 0 basierend
    groupNumber = groupNumber - 1
    
    Dim subMatchees As ISubMatches
    Set subMatchees = match.subMatches
    
    getMatchGroup = subMatchees.item(groupNumber)
End Function


Private Function getMatch(ByVal matchNumber As Integer) As IMatch
    If matches Is Nothing Then Exit Function

    ' Von 1 basierend auf 0 basierend
    matchNumber = matchNumber - 1
    
    If matchNumber < matches.count And matchNumber >= 0 Then
        Set getMatch = matches.item(matchNumber)
    End If
End Function


Public Function isMatchEmpty(Optional matchNumber As Integer = 1) As Boolean
    isMatchEmpty = getMatchValue(matchNumber) = ""
End Function
