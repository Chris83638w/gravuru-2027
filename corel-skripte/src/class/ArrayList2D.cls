Attribute VB_Name = "ArrayList2D"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
Option Explicit

' Design: m ist selbst eine ArrayList, deren Elemente wiederum ArrayList-Objekte sind (eine ArrayList pro Zeile).
' Dadurch lassen sich fast alle Zeilen-Operationen direkt an m bzw. an die jeweilige Zeilen-ArrayList delegieren.
Private m As ArrayList

Private Sub Class_Initialize()
    Set m = New ArrayList
End Sub


' Setzt die Größe auf rowCount x colCount und füllt alle Zellen mit defaultValue (Default: Empty).
' Achtung: Ist defaultValue ein Objekt, landet in jeder Zelle dieselbe Instanz (keine Kopien).
Public Function init(ByVal rowCount As Long, ByVal colCount As Long, Optional ByVal defaultValue As Variant) As ArrayList2D
    Clear

    Dim i As Long, j As Long
    For i = 1 To rowCount
        Dim newRow As New ArrayList
        For j = 1 To colCount
            newRow.add defaultValue
        Next j
        m.add newRow
        Set newRow = Nothing
    Next i

    Set init = Me
End Function


' ===== Basics =====
Public Property Get rowCount() As Long
    rowCount = m.count
End Property

Public Property Get colCount(Optional ByVal row As Long = 1) As Long
    If m.count = 0 Then
        colCount = 0
    Else
        colCount = itemRow(row).count
    End If
End Property

Public Function IsEmpty() As Boolean
    IsEmpty = m.IsEmpty
End Function

Public Sub Clear()
    Set m = New ArrayList
End Sub

' ===== Item (1-based) =====
Public Function item(ByVal row As Long, ByVal col As Long) As Variant
    If IsObject(itemRow(row).item(col)) Then
        Set item = itemRow(row).item(col)
    Else
        item = itemRow(row).item(col)
    End If
End Function

Public Sub SetItem(ByVal row As Long, ByVal col As Long, ByVal value As Variant)
    itemRow(row).SetItem col, value
End Sub

Public Function itemRow(ByVal row As Long) As ArrayList
    Set itemRow = m.itemArrayList(row)
End Function

Public Function itemColumn(ByVal col As Long) As ArrayList
    Dim result As New ArrayList
    Dim i As Long
    For i = 1 To m.count
        result.add itemRow(i).item(col)
    Next i
    Set itemColumn = result
End Function

' ===== Add / Insert Rows =====
Public Function AddRow(ByVal values As Variant, Optional allowDuplicates As Boolean = True, Optional deepSearch As Boolean) As ArrayList2D
    ' values darf folgendes sein: VBA array, ArrayList, Collection, ParamArray
    Dim newRow As New ArrayList
    newRow.AddRange values, allowDuplicates, deepSearch
    m.add newRow
    Set AddRow = Me
End Function

Public Function AddRowParamArray(ParamArray values() As Variant) As ArrayList2D
    AddRow values
    Set AddRowParamArray = Me
End Function

Public Sub InsertRow(ByVal index As Long, ByVal values As Variant)
    Dim newRow As New ArrayList
    newRow.AddRange values
    m.Insert index, newRow
End Sub

' ===== Add / Insert Columns =====
Public Function AddColumn(ByVal values As Variant) As ArrayList2D
    Dim tmp As New ArrayList
    tmp.AddRange values

    Dim i As Long
    If m.count = 0 Then
        ' Noch keine Zeilen vorhanden -> jeder Wert wird zur ersten Zelle einer neuen Zeile
        For i = 1 To tmp.count
            AddRow Array(tmp.item(i))
        Next i
    Else
        If tmp.count <> m.count Then Err.Raise 5, , "AddColumn: Anzahl Werte muss RowCount (" & m.count & ") entsprechen."
        For i = 1 To m.count
            itemRow(i).add tmp.item(i)
        Next i
    End If

    Set AddColumn = Me
End Function

Public Sub InsertColumn(ByVal index As Long, ByVal values As Variant)
    Dim tmp As New ArrayList
    tmp.AddRange values
    If tmp.count <> m.count Then Err.Raise 5, , "InsertColumn: Anzahl Werte muss RowCount (" & m.count & ") entsprechen."

    Dim i As Long
    For i = 1 To m.count
        itemRow(i).Insert index, tmp.item(i)
    Next i
End Sub

' ===== Remove =====
Public Sub RemoveRowAt(ByVal index As Long)
    m.RemoveAt index
End Sub

Public Sub RemoveColumnAt(ByVal index As Long)
    Dim i As Long
    For i = 1 To m.count
        itemRow(i).RemoveAt index
    Next i
End Sub

Public Function RemoveAllRows() As ArrayList2D
    m.RemoveAll
    Set RemoveAllRows = Me
End Function

' ===== Search =====
Public Function Contains(ByVal value As Variant, Optional deepSearch As Boolean) As Boolean
    Dim i As Long
    For i = 1 To m.count
        If itemRow(i).Contains(value, deepSearch) Then
            Contains = True
            Exit Function
        End If
    Next i
End Function

' Gibt Array(row, col) zurück (1-based), oder Array(-1, -1) wenn nicht gefunden
Public Function IndexOf(ByVal value As Variant, Optional deepSearch As Boolean) As Variant
    Dim i As Long, colIdx As Long
    For i = 1 To m.count
        colIdx = itemRow(i).IndexOf(value, , deepSearch)
        If colIdx > 0 Then
            IndexOf = Array(i, colIdx)
            Exit Function
        End If
    Next i
    IndexOf = Array(-1, -1)
End Function

' Sucht searchValue in den angegebenen Spalten (1-based) und gibt die erste Zeile zurück, in der es vorkommt, oder -1.
' columnsIndexies leer/Nothing = alle Spalten, sonst die ArrayList mit den zu durchsuchenden Spaltennummern.
Public Function IndexOfStringInColumns(ByVal searchValue As String, ByVal searchType As stringSearchType, Optional ByVal ignoreCase As Boolean = False, Optional columnsIndexies As ArrayList) As Long
    IndexOfStringInColumns = -1

    Dim allColumns As Boolean
    allColumns = (columnsIndexies Is Nothing)
    If Not allColumns Then allColumns = columnsIndexies.IsEmpty

    Dim startt As Long, endd As Long
    If allColumns Then
        startt = 1
        endd = colCount()
    Else
        startt = 1
        endd = columnsIndexies.count
    End If

    Dim i As Long, col As Long, rowIdx As Long
    For i = startt To endd
    
        If allColumns Then
            col = CLng(i)
        Else
            col = CLng(columnsIndexies.item(i))
        End If
        
        rowIdx = IndexOfStringInColumn(searchValue, searchType, ignoreCase, col)
        If rowIdx <> -1 Then
            IndexOfStringInColumns = rowIdx
            Exit Function
        End If
    Next i
End Function

Public Function IndexOfStringInColumn(ByVal searchValue As String, ByVal searchType As stringSearchType, ByVal ignoreCase As Boolean, ByVal col As Long) As Long
    Dim i As Long
    For i = 1 To m.count
        If Globals.stringCompare(CStr(item(i, col)), searchValue, searchType, ignoreCase) Then
            IndexOfStringInColumn = i
            Exit Function
        End If
    Next i
    IndexOfStringInColumn = -1
End Function

' Sucht searchValue in den angegebenen Zeilen (1-based) und gibt die erste Spalte zurück, in der es vorkommt, oder -1.
' rowsIndexies leer/Nothing = alle Zeilen, sonst die ArrayList mit den zu durchsuchenden Zeilennummern.
Public Function IndexOfStringInRows(ByVal searchValue As String, ByVal searchType As stringSearchType, Optional ByVal ignoreCase As Boolean = False, Optional rowsIndexies As ArrayList) As Long
    IndexOfStringInRows = -1
    Dim allRows As Boolean
    allRows = (rowsIndexies Is Nothing)
    If Not allRows Then allRows = rowsIndexies.IsEmpty
    Dim startt As Long, endd As Long
    If allRows Then
        startt = 1
        endd = rowCount
    Else
        startt = 1
        endd = rowsIndexies.count
    End If
    Dim i As Long, row As Long, colIdx As Long
    For i = startt To endd
        
        If allRows Then
            row = CLng(i)
        Else
            row = CLng(rowsIndexies.item(i))
        End If
        
        
        colIdx = IndexOfStringInRow(searchValue, searchType, ignoreCase, row)
        If colIdx <> -1 Then
            IndexOfStringInRows = colIdx
            Exit Function
        End If
    Next i
End Function

Public Function IndexOfStringInRow(ByVal searchValue As String, ByVal searchType As stringSearchType, ByVal ignoreCase As Boolean, ByVal row As Long) As Long
    Dim j As Long
    For j = 1 To colCount(row)
        If Globals.stringCompare(CStr(item(row, j)), searchValue, searchType, ignoreCase) Then
            IndexOfStringInRow = j
            Exit Function
        End If
    Next j
    IndexOfStringInRow = -1
End Function

Public Function moveRowTo(ByVal fromIndex As Long, ByVal toIndex As Long)
    m.moveTo fromIndex, toIndex
End Function

Public Sub reverseRows()
    m.reverse
End Sub

' ===== Sort =====
' Sortiert die Zeilen alphabetisch anhand des Werts in Spalte 'col' (StrComp, case-insensitive)
' startIndex: erste zu sortierende Zeile (1-based) - Zeilen davor bleiben unverändert, z.B. um eine CSV-Headerzeile auszusparen
Public Function Sort(Optional ByVal col As Long = 1, Optional descending As Boolean = False, Optional ByVal Startindex As Long = 1) As ArrayList2D
    Dim n As Long
    n = m.count
    If Startindex < 1 Or Startindex > n + 1 Then Err.Raise 9, , "Index out of range."

    Dim rangeCount As Long
    rangeCount = n - Startindex + 1
    If rangeCount <= 1 Then
        Set Sort = Me
        Exit Function
    End If

    Dim rowsArr() As ArrayList
    ReDim rowsArr(1 To rangeCount)
    Dim i As Long, j As Long
    For i = 1 To rangeCount
        Set rowsArr(i) = itemRow(Startindex + i - 1)
    Next i

    Dim keyRow As ArrayList
    For i = 2 To rangeCount
        Set keyRow = rowsArr(i)
        j = i - 1
        Do While j >= 1
            If Not CompareRowsForSort(rowsArr(j), keyRow, col, descending) Then Exit Do
        
            Set rowsArr(j + 1) = rowsArr(j)
            j = j - 1
        Loop
        Set rowsArr(j + 1) = keyRow
        Set keyRow = Nothing
    Next i

    Dim newM As New ArrayList
    For i = 1 To Startindex - 1
        newM.add itemRow(i)
    Next i
    For i = 1 To rangeCount
        newM.add rowsArr(i)
    Next i
    Set m = newM

    Set Sort = Me
End Function

Private Function CompareRowsForSort(ByVal rowA As ArrayList, ByVal rowB As ArrayList, ByVal col As Long, ByVal descending As Boolean) As Boolean
    Dim result As Long
    result = StrComp(CStr(rowA.item(col)), CStr(rowB.item(col)), vbTextCompare)
    If descending Then
        CompareRowsForSort = (result < 0)
    Else
        CompareRowsForSort = (result > 0)
    End If
End Function

' ===== Clone / Transform =====
Public Function clone() As ArrayList2D
    Dim result As New ArrayList2D
    Dim i As Long
    For i = 1 To m.count
        result.AddRow itemRow(i).clone()
    Next i
    Set clone = result
End Function

Public Function Transpose() As ArrayList2D
    Dim result As New ArrayList2D
    Dim i As Long, j As Long
    For j = 1 To colCount()
        Dim newCol As New ArrayList
        For i = 1 To m.count
            newCol.add itemRow(i).item(j)
        Next i
        result.AddRow newCol
    Next j
    Set Transpose = result
End Function

' ===== Rows / Columns as ArrayList =====
Public Function Rows() As ArrayList
    Set Rows = m
End Function

Public Function Columns() As ArrayList
    Dim result As New ArrayList
    Dim j As Long
    For j = 1 To colCount()
        result.add itemColumn(j)
    Next j
    Set Columns = result
End Function

' ===== Array Interop =====
Public Function ToArray() As Variant
    ' Ragged Zeilen werden mit Empty aufgefüllt (Breite = längste Zeile)
    Dim maxCols As Long, i As Long, j As Long
    Dim arr() As Variant

    If m.count = 0 Then
        ToArray = Array()
        Exit Function
    End If

    For i = 1 To m.count
        If itemRow(i).count > maxCols Then maxCols = itemRow(i).count
    Next i

    ReDim arr(1 To m.count, 1 To maxCols)
    For i = 1 To m.count
        Dim rowList As ArrayList
        Set rowList = itemRow(i)
        For j = 1 To rowList.count
            If IsObject(rowList.item(j)) Then
                Set arr(i, j) = rowList.item(j)
            Else
                arr(i, j) = rowList.item(j)
            End If
        Next j
        Set rowList = Nothing
    Next i

    ToArray = arr
End Function

Public Function FromArray(ByVal arr As Variant) As ArrayList2D
    If Not IsArray(arr) Then Err.Raise 5, , "FromArray: erwartet ein 2D-Array."
    Clear

    Dim i As Long, j As Long
    Dim newRow As ArrayList
    For i = LBound(arr, 1) To UBound(arr, 1)
        Set newRow = New ArrayList
        For j = LBound(arr, 2) To UBound(arr, 2)
            newRow.add arr(i, j)
        Next j
        m.add newRow
        Set newRow = Nothing
    Next i

    Set FromArray = Me
End Function

Public Function FromCSVFile(filePath As String) As ArrayList2D
    Set FromCSVFile = FromArray(Globals.loadCSVToStringArray(filePath))
End Function

' ===== String =====
Public Function toString(Optional rowDelimiter As String = vbCrLf, Optional colDelimiter As String = ", ") As String
    Dim i As Long
    For i = 1 To m.count
        toString = toString & itemRow(i).toString(colDelimiter) & IIf(i < m.count, rowDelimiter, "")
    Next i
End Function

