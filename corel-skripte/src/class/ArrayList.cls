Attribute VB_Name = "ArrayList"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
Option Explicit

Private m As collection

Private Sub Class_Initialize()
    Set m = New collection
End Sub

' ===== Basics =====
Public Property Get count() As Long
    count = m.count
End Property

Public Function IsEmpty() As Boolean
    IsEmpty = (m.count = 0)
End Function

Public Sub Clear()
    Set m = New collection
End Sub

' ===== Item (1-based) =====
Public Function item(ByVal index As Long) As Variant
    If index < 1 Or index > m.count Then Err.Raise 9, , "Index out of range."
    If IsObject(m(index)) Then
        Set item = m(index)
    Else
        item = m(index)
    End If
End Function


Public Function itemArrayList(ByVal index As Long) As ArrayList
    Set itemArrayList = item(index)
End Function


Public Function subArrayList(from As Integer, Optional too As Integer = -1) As ArrayList
    If too = -1 Then too = m.count
    If from < 1 Or from > m.count Then Err.Raise 9, , "'from' out of range."
    If too < 1 Or too > m.count Then Err.Raise 9, , "'too' out of range."
    
    Dim result As New ArrayList
    Dim i As Integer
    For i = from To too
        result.add item(i)
    Next i
    
    Set subArrayList = result
End Function

Public Sub SetItem(ByVal index As Long, ByVal value As Variant)
    If index < 1 Or index > m.count Then Err.Raise 9, , "Index out of range."
    ReplaceAt index, value
End Sub

' ===== Add / Insert =====
Public Function add(ByVal value As Variant, Optional allowDuplicates As Boolean = True, Optional deepSearch As Boolean) As ArrayList
    If Not allowDuplicates Then
        If Not Contains(value, deepSearch) Then
            m.add value
        End If
    Else
        m.add value
    End If
    
    Set add = Me
End Function


Public Function AddParamArray(ParamArray values() As Variant) As ArrayList
    AddRange values
    Set AddParamArray = Me
End Function


Public Function AddRange(ByVal values As Variant, Optional allowDuplicates As Boolean = True, Optional deepSearch As Boolean) As ArrayList
    ' values darf folgendes sein:
    '  - VBA array
    '  - another ArrayList instance
    '  - ParamArray
    '  - Collection
    Dim i As Long
    
    If IsObject(values) Then
        If TypeOf values Is ArrayList Or _
            TypeOf values Is collection Then
            For i = 1 To values.count
                add values.item(i), allowDuplicates, deepSearch
            Next i
            GoTo ExitFunction
        End If
        Err.Raise 5, , "AddRange: Unsupported object type: " & TypeName(values)
    End If

    If IsArray(values) Then
        For i = LBound(values) To UBound(values)
            add values(i), allowDuplicates, deepSearch
        Next i
        GoTo ExitFunction
    End If

    Err.Raise 5, , "AddRange: Provide a VBA array or ArrayList."
ExitFunction:
    Set AddRange = Me
End Function

Public Sub Insert(ByVal index As Long, ByVal value As Variant)
    ' Insert at position index (1..Count+1). If index = Count+1 => append.
    If index < 1 Or index > m.count + 1 Then Err.Raise 9, , "Index out of range."

    If index = m.count + 1 Then
        m.add value
        Exit Sub
    End If

    Dim newCol As New collection
    Dim i As Long

    For i = 1 To m.count
        If i = index Then newCol.add value
        newCol.add m(i)
    Next i

    Set m = newCol
End Sub



Public Function clone() As ArrayList
    Dim result As New ArrayList
    Dim i As Long

    For i = 1 To m.count
        result.add m(i)
    Next i

    Set clone = result
End Function




' ===== Remove =====
Public Sub RemoveAt(ByVal index As Long)
    If index < 1 Or index > m.count Then Err.Raise 9, , "Index out of range."
    m.Remove index
End Sub

' Löscht das erste aufkommen von 'value'. 'value' kann nämlich mehrfach in der Collection vorkommen
Public Function RemoveFirst(ByVal value As Variant) As Boolean
    Dim idx As Long
    idx = IndexOf(value)
    If idx > 0 Then
        m.Remove idx
        RemoveFirst = True
    End If
End Function


Public Function RemoveAll() As ArrayList
    Dim i As Long

    ' Backwards so indices stay valid
    For i = m.count To 1 Step -1
        m.Remove i
    Next i
    
    Set RemoveAll = Me
End Function


Public Function RemoveDuplicates()
    If m.count <= 1 Then Exit Function

    Dim seen As New Dictionary
    
    Dim newCol As New collection
    Dim i As Long
    Dim v As Variant
    Dim key As String

    For i = 1 To m.count
        v = m(i)
        
        ' Schlüssel für Vergleich erzeugen
        If IsObject(v) Then
            key = "OBJ:" & ObjPtr(v)
        Else
            key = "VAL:" & TypeName(v) & ":" & CStr(v)
        End If
        
        If Not seen.Exists(key) Then
            seen.add key, True
            newCol.add v
        End If
        Set v = Nothing
    Next i

    Set m = newCol
End Function

' ===== Search =====
Public Function Contains(ByVal value As Variant, Optional deepSearch As Boolean) As Boolean
    Contains = (IndexOf(value, , deepSearch) > 0)
End Function


Public Function ContainsArrayListItem(arrList As ArrayList, Optional deepSearch As Boolean) As Boolean
    Dim i As Long
    For i = 1 To arrList.count
        If Contains(arrList.item(i), deepSearch) Then
            ContainsArrayListItem = True
            Exit Function
        End If
    Next i
End Function


'
Public Function IndexOf(ByVal value As Variant, Optional ByVal Startindex As Long = 1, Optional deepSearch As Boolean) As Long
    Dim i As Long

    If Startindex < 1 Then Startindex = 1
    If Startindex > m.count Then
        IndexOf = 0
        Exit Function
    End If

    For i = Startindex To m.count
        If TypeOf m(i) Is ArrayList And deepSearch Then
            Dim innerArrayList As ArrayList
            Set innerArrayList = m(i)
            Dim innerIndexOf As Long
            innerIndexOf = innerArrayList.IndexOf(value, , True)
            If Not innerIndexOf = 0 Then
                IndexOf = innerIndexOf
                Exit Function
            End If
            Set innerArrayList = Nothing
        ElseIf ValuesEqual(m(i), value) Then
            IndexOf = i   ' 1-based
            Exit Function
        End If
    Next i

    IndexOf = -1 ' not found
End Function


Public Function isLast(ByVal value As Variant) As Boolean
    isLast = IndexOf(value) = count
End Function


Public Function moveTo(fromIndex As Long, toIndex As Long)
    If fromIndex < 1 Or fromIndex > m.count Then Err.Raise 9, , "Index out of range."
    
    Dim temp As Variant
    If IsObject(item(fromIndex)) Then
        Set temp = item(fromIndex)
    Else
        temp = item(fromIndex)
    End If
    
    RemoveAt fromIndex
    Insert toIndex, temp
End Function



' ===== Internals =====
Private Sub ReplaceAt(ByVal index As Long, ByVal value As Variant)
    Dim newCol As New collection
    Dim i As Long

    For i = 1 To m.count
        If i = index Then
            newCol.add value
        Else
            newCol.add m(i)
        End If
    Next i

    Set m = newCol
End Sub

Private Function ValuesEqual(ByVal a As Variant, ByVal b As Variant) As Boolean
    ' Handles objects safely; for primitives uses "=" when possible
    If IsObject(a) Or IsObject(b) Then
        If (Not IsObject(a)) Or (Not IsObject(b)) Then Exit Function
        ValuesEqual = (a Is b)
    Else
        On Error GoTo Nope
        ValuesEqual = (a = b)
        Exit Function
Nope:
        ValuesEqual = False
    End If
End Function


Public Function reverse()
    
    'Letztes Element muss nicht nach hinten gesetzt werden, nur alle vor ihm, um umgekehrt werden
    Dim i As Long
    For i = m.count - 1 To 1 Step -1
        Dim temp
        If IsObject(item(i)) Then
            Set temp = item(i)
        Else
            temp = item(i)
        End If
        RemoveAt i
        add temp
        Set temp = Nothing
    Next i
    
End Function



' ===== Sort =====
' Alphabetischer Sort (StrComp, case-insensitive) per Insertion Sort - Items müssen CStr-fähig sein
' startIndex: erstes zu sortierendes Element (1-based) - alles davor bleibt unverändert, z.B. um eine CSV-Headerzeile auszusparen
Public Function Sort(Optional descending As Boolean = False, Optional ByVal Startindex As Long = 1) As ArrayList
    Dim n As Long
    n = m.count
    If Startindex < 1 Or Startindex > n + 1 Then Err.Raise 9, , "Index out of range."

    Dim rangeCount As Long
    rangeCount = n - Startindex + 1
    If rangeCount <= 1 Then
        Set Sort = Me
        Exit Function
    End If

    Dim arr() As Variant
    ReDim arr(1 To rangeCount)
    Dim i As Long, j As Long
    For i = 1 To rangeCount
        If IsObject(m(Startindex + i - 1)) Then Set arr(i) = m(Startindex + i - 1) Else arr(i) = m(Startindex + i - 1)
    Next i

    Dim key As Variant
    For i = 2 To rangeCount
        If IsObject(arr(i)) Then Set key = arr(i) Else key = arr(i)
        j = i - 1
        Do While j >= 1 And CompareForSort(arr(j), key, descending)
            If IsObject(arr(j)) Then Set arr(j + 1) = arr(j) Else arr(j + 1) = arr(j)
            j = j - 1
        Loop
        If IsObject(key) Then Set arr(j + 1) = key Else arr(j + 1) = key
        Set key = Nothing
    Next i

    Dim newCol As New collection
    For i = 1 To Startindex - 1
        newCol.add m(i)
    Next i
    For i = 1 To rangeCount
        newCol.add arr(i)
    Next i
    Set m = newCol

    Set Sort = Me
End Function

Private Function CompareForSort(ByVal a As Variant, ByVal b As Variant, ByVal descending As Boolean) As Boolean
    Dim result As Long
    result = StrComp(CStr(a), CStr(b), vbTextCompare)
    If descending Then
        CompareForSort = (result < 0)
    Else
        CompareForSort = (result > 0)
    End If
End Function


' ============================
' Casting Functions (1-based)
' ============================

' ---------- String ----------
Public Sub CStrAll()
    Dim newCol As New collection, i As Long
    For i = 1 To m.count
        newCol.add CStr(m(i))
    Next i
    Set m = newCol
End Sub

Public Function ToStrList() As ArrayList
    Dim res As New ArrayList, i As Long
    For i = 1 To m.count
        res.add CStr(m(i))
    Next i
    Set ToStrList = res
End Function


' ---------- Integer ----------
Public Sub CIntAll()
    Dim newCol As New collection, i As Long
    For i = 1 To m.count
        newCol.add CInt(m(i))
    Next i
    Set m = newCol
End Sub

Public Function ToIntList() As ArrayList
    Dim res As New ArrayList, i As Long
    For i = 1 To m.count
        res.add CInt(m(i))
    Next i
    Set ToIntList = res
End Function


' ---------- Long ----------
Public Sub CLngAll()
    Dim newCol As New collection, i As Long
    For i = 1 To m.count
        newCol.add CLng(m(i))
    Next i
    Set m = newCol
End Sub

Public Function ToLngList() As ArrayList
    Dim res As New ArrayList, i As Long
    For i = 1 To m.count
        res.add CLng(m(i))
    Next i
    Set ToLngList = res
End Function


' ---------- Double ----------
Public Sub CDblAll()
    Dim newCol As New collection, i As Long
    For i = 1 To m.count
        newCol.add CDbl(m(i))
    Next i
    Set m = newCol
End Sub

Public Function ToDblList() As ArrayList
    Dim res As New ArrayList, i As Long
    For i = 1 To m.count
        res.add CDbl(m(i))
    Next i
    Set ToDblList = res
End Function


' ---------- Boolean ----------
Public Sub CBoolAll()
    Dim newCol As New collection, i As Long
    For i = 1 To m.count
        newCol.add CBool(m(i))
    Next i
    Set m = newCol
End Sub

Public Function ToBoolList() As ArrayList
    Dim res As New ArrayList, i As Long
    For i = 1 To m.count
        res.add CBool(m(i))
    Next i
    Set ToBoolList = res
End Function


' ---------- Date ----------
Public Sub CDateAll()
    Dim newCol As New collection, i As Long
    For i = 1 To m.count
        newCol.add CDate(m(i))
    Next i
    Set m = newCol
End Sub

Public Function ToDateList() As ArrayList
    Dim res As New ArrayList, i As Long
    For i = 1 To m.count
        res.add CDate(m(i))
    Next i
    Set ToDateList = res
End Function


' ---------- Filename ----------
Public Sub CFileNameAll()
    Dim newCol As New collection, i As Long
    For i = 1 To m.count
        newCol.add Globals.getFileName(m(i))
    Next i
    Set m = newCol
End Sub

Public Function ToFileNameList() As ArrayList
    Dim res As New ArrayList, i As Long
    For i = 1 To m.count
        res.add Globals.getFileName(m(i))
    Next i
    Set ToFileNameList = res
End Function


' ---------- Foldername ----------
Public Sub CFolderNameAll()
    Dim newCol As New collection, i As Long
    For i = 1 To m.count
        newCol.add Globals.getFolderName(m(i))
    Next i
    Set m = newCol
End Sub

Public Function ToFolderNameList() As ArrayList
    Dim res As New ArrayList, i As Long
    For i = 1 To m.count
        res.add Globals.getFolderName(m(i))
    Next i
    Set ToFolderNameList = res
End Function


' ---------- Collection ----------
Public Function ToCollection() As collection
    Set ToCollection = m
End Function


' ---------- Array ----------
Public Function ToArray() As Variant
    Dim arr() As Variant
    Dim i As Long

    If m.count = 0 Then
        ToArray = Array()
        Exit Function
    End If

    ReDim arr(1 To m.count)
    For i = 1 To m.count
        arr(i) = m(i)
    Next i

    ToArray = arr
End Function


' ---------- Design ----------
Public Function ToDesignShapes() As ArrayList
    Dim res As New ArrayList, i As Long
    
    For i = 1 To m.count
        Dim design As productDesign
        Set design = item(i)
        
        res.add design.getDesignShape
        
        Set design = Nothing
    Next i
    
    Set ToDesignShapes = res
End Function



' ============================
' String Functions
' ============================

Public Function removeStringsMatchingComparison(find As String, searchType As stringSearchType, Optional ignoreCase As Boolean)
    Dim i As Long
    ' Rückwärts löschen um Indexverschiebungen auszuweichen
    For i = m.count To 1 Step -1
        If Globals.stringCompare(item(i), find, searchType, ignoreCase) Then
            RemoveAt i
        End If
    Next i
End Function



Public Function keepStringsMatchingComparison(find As String, searchType As stringSearchType, Optional ignoreCase As Boolean)
    Dim stringsToKeep As ArrayList
    Set stringsToKeep = getStringsMatchingComparison(find, searchType, ignoreCase)
    
    RemoveAll
    
    AddRange stringsToKeep
End Function



Public Function getStringsMatchingComparison(find As String, searchType As stringSearchType, Optional ignoreCase As Boolean) As ArrayList
    Dim result As New ArrayList
    Dim i As Long
    ' Rückwärts löschen um Indexverschiebungen auszuweichen
    For i = m.count To 1 Step -1
        If Globals.stringCompare(item(i), find, searchType, ignoreCase) Then
            result.add item(i)
        End If
    Next i
    
    Set getStringsMatchingComparison = result
End Function




Public Function toString(Optional delimiter = ", ") As String
    Dim i As Long
    For i = 1 To m.count
        toString = toString & m(i) & IIf(i < m.count, delimiter, "")
    Next i
End Function

