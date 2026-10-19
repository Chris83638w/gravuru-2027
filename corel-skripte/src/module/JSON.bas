Attribute VB_Name = "JSON"
' VBA JSON parser, Backus-Naur form JSON parser based on RegEx v1.7.21
' Copyright (C) 2015-2020 omegastripes
' omegastripes@yandex.ru
' https://github.com/omegastripes/VBA-JSON-parser
'
' This program is free software: you can redistribute it and/or modify
' it under the terms of the GNU General Public License as published by
' the Free Software Foundation, either version 3 of the License, or
' (at your option) any later version.
'
' This program is distributed in the hope that it will be useful,
' but WITHOUT ANY WARRANTY; without even the implied warranty of
' MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
' GNU General Public License for more details.
'
' You should have received a copy of the GNU General Public License
' along with this program.  If not, see <http://www.gnu.org/licenses/>.

'Option Explicit

' Need to include a reference to "Microsoft Scripting Runtime".

Private sBuffer As String
Private oTokens As Dictionary
Private oRegEx As Object
Private bMatch As Boolean
Private oChunks As Dictionary
Private oHeader As Dictionary
Private aData() As Variant
Private i As Long
Private sDelim As String
Private sTabChar As String
Private sLfChar As String
Private sSpcChar As String


Function Parse(ByVal sSample As String, Optional ByRef sState As String = "") As Dictionary
    
    ' Input:
    ' sSample - source JSON string
    ' Output:
    ' vJson - created object or array to be returned as result
    ' sState - string Object|Array|Error depending on result
    Dim vJSON As Dictionary
    
    sBuffer = sSample
    Set oTokens = New Dictionary
    Set oRegEx = CreateObject("VBScript.RegExp")
    With oRegEx ' Patterns based on specification http://www.json.org/
        .Global = True
        .MultiLine = True
        .ignoreCase = True ' Unspecified True, False, Null accepted
        .Pattern = "(?:'[^']*'|""(?:\\""|[^""])*"")(?=\s*[,\:\]\}])" ' Double-quoted string, unspecified quoted string
        Tokenize "s"
        .Pattern = "[+-]?(?:\d+\.\d*|\.\d+|\d+)(?:e[+-]?\d+)?(?=\s*[,\]\}])" ' Number, E notation number
        Tokenize "d"
        .Pattern = "\b(?:true|false|null)(?=\s*[,\]\}])" ' Constants true, false, null
        Tokenize "c"
        .Pattern = "\b[A-Za-z_]\w*(?=\s*\:)" ' Unspecified non-double-quoted property name accepted
        Tokenize "n"
        .Pattern = "\s+"
        sBuffer = .replace(sBuffer, "") ' Remove unnecessary spaces
        .MultiLine = False
        Do
            bMatch = False
            .Pattern = "<\d+(?:[sn])>\:<\d+[codas]>" ' Object property structure
            Tokenize "p"
            .Pattern = "\{(?:<\d+p>(?:,<\d+p>)*)?,?\}" ' Object structure
            Tokenize "o"
            .Pattern = "\[(?:<\d+[codas]>(?:,<\d+[codas]>)*)?,?\]" ' Array structure
            Tokenize "a"
        Loop While bMatch
        .Pattern = "^<\d+[oa]>$" ' Top level object structure, unspecified array accepted
        If .Test(sBuffer) And oTokens.Exists(sBuffer) Then
            sDelim = Mid(1 / 2, 2, 1)
            Retrieve sBuffer, vJSON
            sState = IIf(IsObject(vJSON), "Object", "Array")
        Else
            Set vJSON = Nothing
            sState = "Error"
        End If
    End With
    Set oTokens = Nothing
    Set oRegEx = Nothing
    
    Set Parse = vJSON
End Function

Private Sub Tokenize(sType)
    
    Dim aContent() As String
    Dim lCopyIndex As Long
    Dim i As Long
    Dim sKey As String
    
    With oRegEx.Execute(sBuffer)
        If .count = 0 Then Exit Sub
        ReDim aContent(0 To .count - 1)
        lCopyIndex = 1
        For i = 0 To .count - 1
            With .item(i)
                sKey = "<" & oTokens.count & sType & ">"
                oTokens(sKey) = .value
                aContent(i) = Mid(sBuffer, lCopyIndex, .FirstIndex - lCopyIndex + 1) & sKey
                lCopyIndex = .FirstIndex + .Length + 1
            End With
        Next
    End With
    sBuffer = Join(aContent, "") & Mid(sBuffer, lCopyIndex, Len(sBuffer) - lCopyIndex + 1)
    bMatch = True
    
End Sub

Private Sub Retrieve(sTokenKey, vTransfer)
    
    Dim sTokenValue As String
    Dim sName As Variant
    Dim vValue As Variant
    Dim aTokens() As String
    Dim i As Long
    
    sTokenValue = oTokens(sTokenKey)
    With oRegEx
        .Global = True
        Select Case left(Right(sTokenKey, 2), 1)
            Case "o"
                Set vTransfer = New Dictionary
                aTokens = Split(sTokenValue, "<")
                For i = 1 To UBound(aTokens)
                    Retrieve "<" & Split(aTokens(i), ">", 2)(0) & ">", vTransfer
                Next
            Case "p"
                aTokens = Split(sTokenValue, "<", 4)
                Retrieve "<" & Split(aTokens(1), ">", 2)(0) & ">", sName
                Retrieve "<" & Split(aTokens(2), ">", 2)(0) & ">", vValue
                If IsObject(vValue) Then
                    Set vTransfer(sName) = vValue
                Else
                    vTransfer(sName) = vValue
                End If
            Case "a"
                aTokens = Split(sTokenValue, "<")
                If UBound(aTokens) = 0 Then
                    vTransfer = Array()
                Else
                    ReDim vTransfer(0 To UBound(aTokens) - 1)
                    For i = 1 To UBound(aTokens)
                        Retrieve "<" & Split(aTokens(i), ">", 2)(0) & ">", vValue
                        If IsObject(vValue) Then
                            Set vTransfer(i - 1) = vValue
                        Else
                            vTransfer(i - 1) = vValue
                        End If
                    Next
                End If
            Case "n"
                vTransfer = sTokenValue
            Case "s"
                vTransfer = replace(replace(replace(replace(replace(replace(replace(replace( _
                    Mid(sTokenValue, 2, Len(sTokenValue) - 2), _
                    "\""", """"), _
                    "\\", "\" & vbNullChar), _
                    "\/", "/"), _
                    "\b", Chr(8)), _
                    "\f", Chr(12)), _
                    "\n", vbLf), _
                    "\r", vbCr), _
                    "\t", vbTab)
                .Global = False
                .Pattern = "\\u[0-9a-fA-F]{4}"
                Do While .Test(vTransfer)
                    vTransfer = .replace(vTransfer, ChrW(("&H" & Right(.Execute(vTransfer)(0).value, 4)) * 1))
                Loop
                vTransfer = replace(vTransfer, "\" & vbNullChar, "\")
            Case "d"
                vTransfer = CDbl(replace(sTokenValue, ".", sDelim))
            Case "c"
                Select Case LCase(sTokenValue)
                    Case "true"
                        vTransfer = True
                    Case "false"
                        vTransfer = False
                    Case "null"
                        vTransfer = Null
                End Select
        End Select
    End With
    
End Sub

Function Serialize(vJSON As Variant, Optional sTab As String = vbTab) As String
    
    If sTab = "" Then
        sTabChar = ""
        sLfChar = ""
        sSpcChar = ""
    Else
        sTabChar = sTab
        sLfChar = vbCrLf
        sSpcChar = " "
    End If
    Set oChunks = New Dictionary
    SerializeElement vJSON, ""
    Serialize = Join(oChunks.Items(), "")
    Set oChunks = Nothing
    
End Function

Private Sub SerializeElement(vElement As Variant, ByVal sIndent As String)
    
    Dim aKeys() As Variant
    Dim i As Long
    
    With oChunks
        Select Case VarType(vElement)
            Case vbObject
                If Not TypeOf vElement Is Dictionary Then
                    .item(.count) = "{}"
                ElseIf vElement.count = 0 Then
                    .item(.count) = "{}"
                Else
                    .item(.count) = "{" & sLfChar
                    aKeys = vElement.keys
                    For i = 0 To UBound(aKeys)
                        .item(.count) = sIndent & sTabChar & """" & EscapeJsonString(aKeys(i)) & """" & ":" & sSpcChar
                        SerializeElement vElement(aKeys(i)), sIndent & sTabChar
                        If Not (i = UBound(aKeys)) Then .item(.count) = ","
                        .item(.count) = sLfChar
                    Next
                    .item(.count) = sIndent & "}"
                End If
            Case Is >= vbArray
                If UBound(vElement) = -1 Then
                    .item(.count) = "[]"
                Else
                    .item(.count) = "[" & sLfChar
                    For i = 0 To UBound(vElement)
                        .item(.count) = sIndent & sTabChar
                        SerializeElement vElement(i), sIndent & sTabChar
                        If Not (i = UBound(vElement)) Then .item(.count) = "," 'sResult = sResult & ","
                        .item(.count) = sLfChar
                    Next
                    .item(.count) = sIndent & "]"
                End If
            Case vbInteger, vbLong
                .item(.count) = vElement
            Case vbSingle, vbDouble
                .item(.count) = replace(vElement, ",", ".")
            Case vbNull, vbError
                .item(.count) = "null"
            Case vbBoolean
                .item(.count) = IIf(vElement, "true", "false")
            Case Else
                .item(.count) = """" & EscapeJsonString(vElement) & """"
        End Select
    End With
    
End Sub



Private Function EscapeJsonString(ByVal s As String) As String
    ' Escaped Anführungszeichen, Backslashes und Steuerzeichen nach JSON-Standard
    Dim i As Long, ch As String, code As Integer, out As String
    For i = 1 To Len(s)
        ch = Mid$(s, i, 1)
        code = AscW(ch)
        Select Case ch
            Case "\":
                out = out & "\\"
            Case """":
                out = out & "\"""
            Case "/":
                out = out & "/"          ' optional
            Case vbBack:               ' \b
                out = out & "\b"
            Case vbFormFeed:           ' \f
                out = out & "\f"
            Case vbLf:                 ' \n
                out = out & "\n"
            Case vbCr:                 ' \r
                out = out & "\r"
            Case vbTab:                ' \t
                out = out & "\t"
            Case Else
                If code < 32 Or code = &H2028 Or code = &H2029 Then
                    out = out & "\u" & Right$("000" & hex$(code), 4)
                Else
                    out = out & ch
                End If
        End Select
    Next i
    EscapeJsonString = out
End Function








Function ToYaml(vJSON As Variant) As String
    
    Select Case VarType(vJSON)
        Case vbObject, Is >= vbArray
            Set oChunks = New Dictionary
            ToYamlElement vJSON, ""
            oChunks.Remove 0
            ToYaml = Join(oChunks.Items(), "")
            Set oChunks = Nothing
        Case vbNull, vbError
            ToYaml = "Null"
        Case vbBoolean
            ToYaml = IIf(vJSON, "True", "False")
        Case Else
            ToYaml = CStr(vJSON)
    End Select
    
End Function

Private Sub ToYamlElement(vElement As Variant, ByVal sIndent As String)
    
    Dim aKeys() As Variant
    Dim i As Long
    
    With oChunks
        Select Case VarType(vElement)
            Case vbObject
                If Not TypeOf vElement Is Dictionary Then
                    .item(.count) = "''"
                ElseIf vElement.count = 0 Then
                    .item(.count) = "''"
                Else
                    .item(.count) = vbCrLf
                    aKeys = vElement.keys
                    For i = 0 To UBound(aKeys)
                        .item(.count) = sIndent & aKeys(i) & ": "
                        ToYamlElement vElement(aKeys(i)), sIndent & "    "
                        If Not (i = UBound(aKeys)) Then .item(.count) = vbCrLf
                    Next
                End If
            Case Is >= vbArray
                If UBound(vElement) = -1 Then
                    .item(.count) = "''"
                Else
                    .item(.count) = vbCrLf
                    For i = 0 To UBound(vElement)
                        .item(.count) = sIndent & i & ": "
                        ToYamlElement vElement(i), sIndent & "    "
                        If Not (i = UBound(vElement)) Then .item(.count) = vbCrLf
                    Next
                End If
            Case vbNull, vbError
                .item(.count) = "Null"
            Case vbBoolean
                .item(.count) = IIf(vElement, "True", "False")
            Case Else
                .item(.count) = CStr(vElement)
        End Select
    End With
    
End Sub

Sub ToArray(vJSON As Variant, aRows() As Variant, aHeader() As Variant)
    
    ' Input:
    ' vJSON - Array or Object which contains rows data
    ' Output:
    ' aRows - 2d array representing JSON data
    ' aHeader - 1d array of property names
    
    Dim sName As Variant
    
    Set oHeader = New Dictionary
    Select Case VarType(vJSON)
        Case vbObject
            If vJSON.count > 0 Then
                ReDim aData(0 To vJSON.count - 1, 0 To 0)
                oHeader("#") = 0
                i = 0
                For Each sName In vJSON.keys
                    aData(i, 0) = sName
                    ToArrayElement vJSON(sName), ""
                    i = i + 1
                Next
            Else
                ReDim aData(0 To 0, 0 To 0)
            End If
        Case Is >= vbArray
            If UBound(vJSON) >= 0 Then
                ReDim aData(0 To UBound(vJSON), 0 To 0)
                For i = 0 To UBound(vJSON)
                    ToArrayElement vJSON(i), ""
                Next
            Else
                ReDim aData(0 To 0, 0 To 0)
            End If
        Case Else
            ReDim aData(0 To 0, 0 To 0)
            aData(0, 0) = vJSON
    End Select
    aHeader = oHeader.keys()
    Set oHeader = Nothing
    aRows = aData
    Erase aData
    
End Sub

Private Sub ToArrayElement(vElement As Variant, sFieldName As String)
    
    Dim sName As Variant
    Dim j As Long
    
    Select Case VarType(vElement)
        Case vbObject ' Collection of objects
            For Each sName In vElement.keys
                ToArrayElement vElement(sName), sFieldName & IIf(sFieldName = "", "", ".") & sName
            Next
        Case Is >= vbArray  ' Collection of arrays
            For j = 0 To UBound(vElement)
                ToArrayElement vElement(j), sFieldName & "[" & j & "]"
            Next
        Case Else
            If Not oHeader.Exists(sFieldName) Then
                oHeader(sFieldName) = oHeader.count
                If UBound(aData, 2) < oHeader.count - 1 Then ReDim Preserve aData(0 To UBound(aData, 1), 0 To oHeader.count - 1)
            End If
            j = oHeader(sFieldName)
            aData(i, j) = vElement
    End Select
    
End Sub

Sub flatten(vJSON As Variant, vResult As Variant)
    
    ' Input:
    ' vJSON - Array or Object which contains JSON data
    ' Output:
    ' oResult - Flatten JSON data object
    
    Set oChunks = New Dictionary
    FlattenElement vJSON, ""
    Set vResult = oChunks
    Set oChunks = Nothing
    
End Sub

Private Sub FlattenElement(vElement As Variant, sProperty As String)
    
    Dim vKey
    Dim i As Long
    
    Select Case True
        Case TypeOf vElement Is Dictionary
            If vElement.count > 0 Then
                For Each vKey In vElement.keys
                    FlattenElement vElement(vKey), IIf(sProperty <> "", sProperty & "." & vKey, vKey)
                Next
            End If
        Case IsObject(vElement)
        Case IsArray(vElement)
            For i = 0 To UBound(vElement)
                FlattenElement vElement(i), sProperty & "[" & i & "]"
            Next
        Case Else
            oChunks(sProperty) = vElement
    End Select
    
End Sub

Sub Unflatten(oFlatten, vJSON, bSuccess)
    
    ' Input:
    ' oFlatten - source dictionary containing JSON data
    ' Output:
    ' vJSON - created object or array to be returned as result
    ' bSuccess - boolean indicating successful completion
    
    Dim sPath
    Dim vValue
    Dim aQualifiers
    Dim lNextLevel
    
    bSuccess = TypeOf oFlatten Is Dictionary
    If Not bSuccess Then Exit Sub
    For Each sPath In oFlatten.keys
        If IsObject(oFlatten(sPath)) Then
            Set vValue = oFlatten(sPath)
        Else
            vValue = oFlatten(sPath)
        End If
        If left(sPath, 1) <> "[" And left(sPath, 1) <> "." Then
            sPath = "." & sPath
        End If
        aQualifiers = Split(replace(replace(sPath, ".", vbNullChar), "[", vbNullChar), vbNullChar)
        lNextLevel = 1
        UnflattenElement vJSON, lNextLevel, aQualifiers, vValue, bSuccess
        If Not bSuccess Then Exit Sub
    Next
    
End Sub

Private Sub UnflattenElement(vParent, lNextLevel, aQualifiers, vValue, bSuccess)
    
    Dim vNextQualifier
    Dim sNum
    Dim vChild
    
    bSuccess = False
    If lNextLevel > UBound(aQualifiers) Then
        If IsObject(vValue) Then
            Set vParent = vValue
        Else
            vParent = vValue
        End If
        bSuccess = True
        Exit Sub
    End If
    vNextQualifier = aQualifiers(lNextLevel)
    If Right(vNextQualifier, 1) = "]" Then
        sNum = left(vNextQualifier, Len(vNextQualifier) - 1)
        If IsNumeric(sNum) Then
            vNextQualifier = CLng(sNum)
        End If
    End If
    If VarType(vNextQualifier) = vbLong Then
        If VarType(vParent) = vbEmpty Then
            vParent = Array()
        ElseIf Not IsArray(vParent) Then
            Exit Sub
        End If
        If UBound(vParent) < vNextQualifier Then
            ReDim Preserve vParent(vNextQualifier)
        End If
    Else
        If VarType(vParent) = vbEmpty Then
            Set vParent = New Dictionary
        ElseIf Not IsObject(vParent) Then
            Exit Sub
        ElseIf Not TypeOf vParent Is Dictionary Then
            Exit Sub
        End If
    End If
    If IsObject(vParent(vNextQualifier)) Then
        Set vChild = vParent(vNextQualifier)
    Else
        vChild = vParent(vNextQualifier)
    End If
    UnflattenElement vChild, lNextLevel + 1, aQualifiers, vValue, bSuccess
    If Not bSuccess Then
        Exit Sub
    End If
    If IsObject(vChild) Then
        Set vParent(vNextQualifier) = vChild
    Else
        vParent(vNextQualifier) = vChild
    End If
    bSuccess = True
    
End Sub


'Sucht in "json" (rekursiv) nach dem Item dessen Key "itemKey" entspricht und gibt es zurück
Public Function findJSONItem(ByVal jsonItem As Dictionary, itemKey As String) As Variant ' results As Collection

    

    Dim itemFound As Dictionary
    
    If jsonItem.Exists(itemKey) Then
        Set itemFound = jsonItem.item(itemKey)
    End If

    
    If Not itemFound Is Nothing Then
    
        Set findJSONItem = itemFound
        
    Else

    
        For j = 0 To jsonItem.count - 1
            Dim currentItem As Variant
            
            
            
            If TypeOf jsonItem.Items(j) Is Dictionary Then
                Set currentItem = jsonItem.Items(j) 'Gibt für einfache Key:Value Felder einen String für das Item oder eine Dictionary für Key:Array zurück
                'MsgBox "currentItem is Dictioary"
            Else
                currentItem = jsonItem.Items(j)
                If IsArray(currentItem) Then
                    'MsgBox "currentItem is Array"
                Else
                    'MsgBox "currentItem=" & CStr(currentItem)
                End If
                
                
                
            End If
            
            
     
            
            If TypeOf currentItem Is Dictionary Then 'Prüfen ob es ein Key:Dictionary Item war ("customizationData" : { )
            
                Dim itemFoundRecursive As Dictionary
                Set itemFoundRecursive = findJSONItem(currentItem, itemKey)
    
                If Not itemFoundRecursive Is Nothing Then
                    Set findJSONItem = itemFoundRecursive
                    'MsgBox "Item found in Dictionary"
                    Exit Function
                End If
                
            ElseIf IsArray(currentItem) Then 'Prüfen, ob es ein Key:Array Item war ("children" : [ { )
                
                'MsgBox "currentItem is still Array"
                
                For k = 0 To UBound(currentItem)
                    
                    Dim itemFoundRecursiveInArray As Dictionary
                    Set itemFoundRecursiveInArray = findJSONItem(currentItem(k), itemKey)
                    
                    'MsgBox "j=" & CStr(j)
                    
                    If Not itemFoundRecursiveInArray Is Nothing Then
                        Set findJSONItem = itemFoundRecursiveInArray
                        'MsgBox "Item Found in Array"
                        Exit Function
                    End If
                    
                Next k
                
                
            End If
            
            
        Next j
    End If
End Function




Public Function findJSONItems(ByVal jsonItem As Dictionary, itemKey As String)
    
    Dim results As collection
    Set results = New collection
    
    findJSONItemsRecursive jsonItem, itemKey, results
    
    'MsgBox "Done"
    
    Set findJSONItems = results
End Function


Private Function findJSONItemsRecursive(ByVal jsonItem As Dictionary, itemKey As String, ByRef results As collection)
    Dim itemFound As Variant

    If jsonItem.Exists(itemKey) Then
        If TypeOf jsonItem.item(itemKey) Is Dictionary Then ' Key:Dictionary
            Set itemFound = jsonItem.item(itemKey)
            results.add itemFound
            'MsgBox "Found item Dict"
        Else
            itemFound = jsonItem.item(itemKey) 'Key:Array oder Key:Value
            results.add itemFound
            
            
            If IsArray(itemFound) Then
                'MsgBox "Found item Array"
            Else
                'MsgBox "Found item " & CStr(itemFound)
            End If
            
        End If
        
    End If



        For j = 0 To jsonItem.count - 1
            Dim currentItem As Variant



            If TypeOf jsonItem.Items(j) Is Dictionary Then
                Set currentItem = jsonItem.Items(j) 'Gibt für einfache Key:Value Felder einen String für das Item oder eine Dictionary für Key:Array zurück
                'MsgBox "currentItem is Dictioary " & jsonItem.Keys(k)
            Else
                currentItem = jsonItem.Items(j)
                If IsArray(currentItem) Then
                    'MsgBox "currentItem is Array " & jsonItem.Keys(k)
                Else
                    'MsgBox "currentItem=" & CStr(currentItem)
                End If

            End If




            If TypeOf currentItem Is Dictionary Then 'Prüfen ob es ein Key:Dictionary Item war ("customizationData" : { )

                findJSONItemsRecursive currentItem, itemKey, results


            ElseIf IsArray(currentItem) Then 'Prüfen, ob es ein Key:Array Item war ("children" : [ { )

                'MsgBox "currentItem is still Array"

                For k = 0 To UBound(currentItem)
                        
                    findJSONItemsRecursive currentItem(k), itemKey, results

                Next k


            End If


        Next j
        
    'MsgBox "End"

End Function









Public Function findJSONItemsParents(ByVal jsonItem As Dictionary, itemKey As String) As collection
    
    Dim results As collection
    Set results = New collection
    
    findJSONItemsParentsRecursive jsonItem, itemKey, results
    
    'MsgBox "Done"
    
    Set findJSONItemsParents = results
End Function


Private Function findJSONItemsParentsRecursive(ByVal jsonItem As Dictionary, itemKey As String, ByRef results As collection)
    'Dim itemFound As Variant

    If jsonItem.Exists(itemKey) Then
        results.add jsonItem
    End If



        For j = 0 To jsonItem.count - 1
            Dim currentItem As Variant



            If TypeOf jsonItem.Items(j) Is Dictionary Then
                Set currentItem = jsonItem.Items(j) 'Gibt für einfache Key:Value Felder einen String für das Item oder eine Dictionary für Key:Array zurück
                'MsgBox "currentItem is Dictioary " & jsonItem.Keys(k)
            Else
                currentItem = jsonItem.Items(j)
'                If IsArray(currentItem) Then
'                    'MsgBox "currentItem is Array " & jsonItem.Keys(k)
'                Else
'                    'MsgBox "currentItem=" & CStr(currentItem)
'                End If

            End If




            If TypeOf currentItem Is Dictionary Then 'Prüfen ob es ein Key:Dictionary Item war ("customizationData" : { )

                findJSONItemsParentsRecursive currentItem, itemKey, results


            ElseIf IsArray(currentItem) Then 'Prüfen, ob es ein Key:Array Item war ("children" : [ { )

                'MsgBox "currentItem is still Array"

                For k = 0 To UBound(currentItem)
                        
                    findJSONItemsParentsRecursive currentItem(k), itemKey, results

                Next k


            End If


        Next j
        
    'MsgBox "End"

End Function





'Sucht in "json" (rekursiv) nach dem Item dessen Value "itemValue" entspricht und gibt dann den Parent / die Dictionary in dem es gefunden wurd zurück
Public Function findJSONItemParentByValue(ByVal jsonItem As Dictionary, itemValue As String) As Dictionary ' results As Collection

    

    Dim dictFound As Dictionary
    
    
    If Globals.dictionaryValueExists(jsonItem, itemValue) Then
        'MsgBox "Found DIct"
        Set dictFound = jsonItem
    End If
    
    
    

    
    If Not dictFound Is Nothing Then
    
        Set findJSONItemParentByValue = dictFound
        
    Else

    
        For j = 0 To jsonItem.count - 1
            Dim currentItem As Variant
            
            
            
            If TypeOf jsonItem.Items(j) Is Dictionary Then
                Set currentItem = jsonItem.Items(j) 'Gibt für einfache Key:Value Felder einen String für das Item oder eine Dictionary für Key:Array zurück
                'MsgBox "currentItem is Dictioary"
            Else
                currentItem = jsonItem.Items(j)
                If IsArray(currentItem) Then
                    'MsgBox "currentItem is Array"
                Else
                    'MsgBox "currentItem=" & CStr(currentItem)
                End If
                
                
                
            End If
            
            
     
            
            If TypeOf currentItem Is Dictionary Then 'Prüfen ob es ein Key:Dictionary Item war ("customizationData" : { )
                
                'MsgBox "currentItem"
                
                Dim itemFoundRecursive As Dictionary
                Set itemFoundRecursive = findJSONItemParentByValue(currentItem, itemValue)
    
                If Not itemFoundRecursive Is Nothing Then
                    Set findJSONItemParentByValue = itemFoundRecursive
                    'MsgBox "Item found in Dictionary"
                    Exit Function
                End If
                
            ElseIf IsArray(currentItem) Then 'Prüfen, ob es ein Key:Array Item war ("children" : [ { )
                
                'MsgBox "currentItem is Array"
                
                For k = 0 To UBound(currentItem)
                    
                    Dim itemFoundRecursiveInArray As Dictionary
                    Set itemFoundRecursiveInArray = findJSONItemParentByValue(currentItem(k), itemValue)
                    
                    'MsgBox "j=" & CStr(j)
                    
                    If Not itemFoundRecursiveInArray Is Nothing Then
                        Set findJSONItemParentByValue = itemFoundRecursiveInArray
                        'MsgBox "Item Found in Array"
                        Exit Function
                    End If
                    
                Next k
                
                
            End If
            
            
        Next j
    End If
End Function



Public Sub JSONOutputTest()
    
'    Dim Json As New JSONOutput
'
'    With Json.object
'        Json.element "name", "test"
'        Json.element "integer", 15
'        Json.element "double", 1.23
'
'        With .object("dimension")
'            .element "width", 30
'        End With
'        Json.pop
'
'    End With
'    Json.pop
'
'    Json.save Globals.getDesktopPath & "test"
    
    
    Dim dict As New Dictionary
    dict.add "dimension", New Dictionary
    
    dict.item("dimension").add "widht", 10
    dict.item("dimension").add "height", 20
    
    dict.add "test", New Dictionary
    
'    dict.item("dimension").add New Dictionary, ""
    
    Globals.saveTextFile toJSON(dict), Globals.getDesktopPath & "test.json"
    
End Sub



Sub TestJSONArray()

'    Dim arr() As Variant
'    ReDim Preserve arr(1)
'    Set arr(0) = New Dictionary
'
'    arr(0).add "hallo", "HALLO123"
'
'    Dim b() As Variant
'    b = arr


'    Dim f2JsonDict As Dictionary
'    Set f2JsonDict = New Dictionary
''    f2JsonDict.add "title", "Gedenktafel 30x20 Schiefer Foto mit Blumen 3 Tier"
'    f2JsonDict.add "thumbnail", "bild.jpg"
'
'    Dim jsonOptionsArray() As Variant
'    ReDim jsonOptionsArray(0)
'    Set jsonOptionsArray(0) = New Dictionary
'    jsonOptionsArray(0).add "test", "Test123"
'
''    f2JsonDict.add "options", jsonOptionsArray
'
''    f2JsonDict.add "last", "true"
'
''    Dim testDict As New Dictionary
''    testDict.add "2", "zwei"
''    f2JsonDict.add "options", testDict
'
'
'
'
'    Dim coll As New collection
'
'
'
'    f2JsonDict.add "options", coll
'
'        coll.add ("Hello")
'    coll.add ("World")
'
'    MsgBox "" & ToJson(f2JsonDict)
    
    
    
    
    
    
'    Dim mainJSON As New Dictionary
'    mainJSON.add "title", "Gedenktafel 30x20 Schiefer Foto mit Blumen 3 Tier"
'    mainJSON.add "thumbnail", "GT-S-30x20-D138_front.jpg"
'    mainJSON.add "options", New collection
'
'    Dim viewsColl As New collection
'    mainJSON.add "views", viewsColl
'
'    Dim view As New Dictionary
'    viewsColl.add view
'    view.add "title", "Gedenktafel 30x20 Schiefer Foto mit Blumen 3 Tier"
'    view.add "thumbnail", "GT-S-30x20-D138_front.jpg"
'    Dim elements As New collection
'    view.add "elements", elements
'
'    Dim imageElement As New Dictionary
'    elements.add imageElement
'    imageElement.add "title", "30x20cmbox"
'    imageElement.add "source", "Grundplatte.png"
'
'    MsgBox "" & ToJson(mainJSON)
    
    
'    Dim dict As New Dictionary
'    dict.add "Hi", "Was"
'
'    Dim arr(0) As Variant
'    arr(0) = dict(dict.Keys(0))
    
    
    Dim dict As New Dictionary
    dict.add "test", 200
    
    
    MsgBox dict("test")
    
    
End Sub






Public Function toJSON(ByVal v As Variant, Optional ByVal depth As Long = 0) As String
    Dim res As String

    If IsObject(v) Then
        res = ObjectToJSON(v, depth)
    ElseIf IsArray(v) Then
        res = ArrayToJSON(v, depth)
    Else
        res = ScalarToJSON(v)
    End If

    toJSON = res
End Function

'======================
' Helfer: Arrays
'======================
Private Function ArrayToJSON(ByVal arr As Variant, ByVal depth As Long) As String
    Dim lb As Long, ub As Long, i As Long
    Dim parts As String, piece As String

    If Not IsArrayAllocated(arr) Then
        ArrayToJSON = "[]"
        Exit Function
    End If

'    If ArrayDimensions(arr) <> 1 Then
'        ' Für 2D/mehrdim. Arrays – hier simple Fallback-Darstellung
'        ' (Optional: zu einer Liste von Listen serialisieren)
'        ArrayToJSON = "[]"
'        Exit Function
'    End If

    lb = LBound(arr): ub = UBound(arr)

    parts = "["
    For i = lb To ub
        If Len(parts) > 1 Then parts = parts & ","
        parts = parts & vbCrLf & Indent(depth + 1) & toJSON(arr(i), depth + 1)
    Next i

    If ub >= lb Then parts = parts & vbCrLf & Indent(depth)
    parts = parts & "]"

    ArrayToJSON = parts
End Function

Private Function IsArrayAllocated(ByVal arr As Variant) As Boolean
    On Error GoTo EH
    If IsArray(arr) Then
        Dim lb As Long, ub As Long
        lb = LBound(arr)
        ub = UBound(arr)
        IsArrayAllocated = (ub - lb + 1) >= 0
    End If
    Exit Function
EH:
    IsArrayAllocated = False
End Function

Private Function ArrayDimensions(ByVal arr As Variant) As Long
    ' Ermittelt die Anzahl Dimensionen eines Arrays
    Dim n As Long
    On Error GoTo Done
    Do
        n = n + 1
        Dim lb As Long
        lb = LBound(arr, n)
    Loop
Done:
    ArrayDimensions = n - IIf(n > 0, 0, 0)
End Function

'======================
' Helfer: Objekte
'======================
Private Function ObjectToJSON(ByVal obj As Object, ByVal depth As Long) As String
    Dim t As String
    t = TypeName(obj)

    Select Case t
        Case "Dictionary"
            ObjectToJSON = DictionaryToJSON(obj, depth)
        Case "Collection"
            ObjectToJSON = CollectionToJSON(obj, depth)
        Case Else
            ' Unbekanntes Objekt ? als String ausgeben
            ObjectToJSON = """" & EscapeJsonString(t) & """"
    End Select
End Function

Private Function DictionaryToJSON(ByVal dict As Object, ByVal depth As Long) As String
    Dim keys As Variant, i As Long, parts As String
    Dim k As Variant

    On Error GoTo SafeKeys
    keys = dict.keys
    GoTo HaveKeys

SafeKeys:
    ' Falls ein exotisches Dictionary keine .Keys liefert
    DictionaryToJSON = "{}"
    Exit Function

HaveKeys:
    parts = "{"
    For i = LBound(keys) To UBound(keys)
        k = keys(i)
        If Len(parts) > 1 Then parts = parts & ","
        parts = parts & vbCrLf & Indent(depth + 1) & """" & EscapeJsonString(CStr(k)) & """: " & toJSON(dict(k), depth + 1)
    Next i

    If (UBound(keys) - LBound(keys) + 1) > 0 Then parts = parts & vbCrLf & Indent(depth)
    parts = parts & "}"

    DictionaryToJSON = parts
End Function

Private Function CollectionToJSON(ByVal col As collection, ByVal depth As Long) As String
    Dim i As Long, parts As String
    parts = "["
    For i = 1 To col.count
        If Len(parts) > 1 Then parts = parts & ","
        parts = parts & vbCrLf & Indent(depth + 1) & toJSON(col.item(i), depth + 1)
    Next i

    If col.count > 0 Then parts = parts & vbCrLf & Indent(depth)
    parts = parts & "]"

    CollectionToJSON = parts
End Function

'======================
' Helfer: Skalare
'======================
Private Function ScalarToJSON(ByVal v As Variant) As String
    Dim vt As VbVarType
    vt = VarType(v)

    Select Case vt
        Case vbString
            ScalarToJSON = """" & EscapeJsonString(CStr(v)) & """"

        Case vbByte, vbInteger, vbLong, vbLongLong, vbSingle, vbDouble, vbDecimal, vbCurrency
            ' Dezimaltrennzeichen vereinheitlichen (Locale ? ".")
            ScalarToJSON = replace$(CStr(v), ",", ".") ' funktioniert in de-DE/AT/CH zuverlässig

        Case vbBoolean
            ScalarToJSON = IIf(CBool(v), "true", "false")

        Case vbDate
            ' Datum als ISO-String ausgeben
            ScalarToJSON = """" & Format$(CDate(v), "yyyy-mm-dd\THH:NN:SS") & """"

        Case vbNull, vbEmpty, vbError
            ScalarToJSON = "null"

        Case Else
            ' Fallback: als String
            On Error Resume Next
            ScalarToJSON = """" & EscapeJsonString(CStr(v)) & """"
            On Error GoTo 0
    End Select
End Function

Private Function Indent(ByVal depth As Long) As String
    Indent = String$(depth * 2, " ")
End Function








