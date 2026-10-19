Attribute VB_Name = "MySQL"




Public Sub TestGetCDRPathFromAsin()

    Dim path As String

   path = getCDRPathFromAsin("B0979Y664L", "D72")
'   path = getCDRPathFromAsin("B0979WWV4Y")

    MsgBox "Öffne: " & path

    OpenDocument path
End Sub


Public Function getCDRPathFromAsin(ASIN As String, Optional designNumber As String = "") As String
    
    Dim connection As New MySQLConnection
    connection.connect localServer, martin
    
    
'    Dim designNumber As String
'    designNumber = "D72"
    
    Dim serverRoot As String
    serverRoot = "V:\\Produkte"
    
    Set rs = CreateObject("ADODB.Recordset")
    rs.CursorLocation = adUseServer
    
    
    designNumber = replace(designNumber, "Design ", "")
    
    On Error GoTo ErrorOrEnd
    
    If designNumber = "Frei" Then
        
        rs.Open "SELECT ain.amz_import_group, ain.product_group_id, ain.product_id, pg.product_sku, pg.product_main_folder, pg.product_sub_folder, m.name AS material, s.name AS Size, CONCAT_WS ('\\','" & serverRoot & "',pg.product_main_folder,pg.product_sub_folder,m.name,REPLACE(REPLACE(s.name,' ',''),',','.'),CONCAT_WS('-',pg.product_sku),'Export',CONCAT(CONCAT_WS('-',pg.product_sku),'.cdr')) AS ProductGroupFolder FROM amazon_item_names AS ain LEFT JOIN products_groups AS pg ON ain.product_group_id = pg.product_group_id LEFT JOIN properties_materials AS m ON m.property_material_id = pg.property_material LEFT JOIN properties_sizes AS s ON s.property_size_id = pg.property_size WHERE asin = '" & ASIN & "' LIMIT 1", connection.connection
        
    ElseIf Not designNumber = "" Then
        ' Produkt mit Designs (PWD)
        ' Designauswahl im Gestalter
        
        rs.Open "SELECT ain.amz_import_group, ain.product_group_id, ain.product_id, pg.product_sku, pg.product_main_folder, pg.product_sub_folder, m.name AS material, s.name AS Size, CONCAT_WS ('\\','" & serverRoot & "',pg.product_main_folder,pg.product_sub_folder,m.name,REPLACE(REPLACE(s.name,' ',''),',','.'),CONCAT_WS('-',pg.product_sku,'" & designNumber & "'),'Export',CONCAT(CONCAT_WS('-',pg.product_sku,'" & designNumber & "'),'.cdr')) AS ProductGroupFolder FROM amazon_item_names AS ain LEFT JOIN products_groups AS pg ON ain.product_group_id = pg.product_group_id LEFT JOIN properties_materials AS m ON m.property_material_id = pg.property_material LEFT JOIN properties_sizes AS s ON s.property_size_id = pg.property_size WHERE asin = '" & ASIN & "' LIMIT 1", connection.connection
    Else
        ' Produkt mit Childs (PWC)
        ' Designauswahl vor dem Gestalter
        
        rs.Open "SELECT ain.amz_import_group, ain.product_group_id, ain.product_id, pg.product_sku,p.product_sku, pg.product_main_folder, pg.product_sub_folder, m.name AS material, s.name AS Size, " & _
                "CONCAT_WS ('\\','V:\\Produkte',pg.product_main_folder,pg.product_sub_folder,m.name,REPLACE(REPLACE(s.name,' ',''),',','.'),CONCAT_WS('-',p.product_sku),'Export', " _
                & "CONCAT(p.product_sku,'.cdr')) AS ProductGroupFolder " _
                & "FROM amazon_item_names AS ain " _
                & "LEFT JOIN products_groups AS pg ON ain.product_group_id = pg.product_group_id " _
                & "LEFT JOIN products AS p ON ain.product_id = p.product_id " _
                & "LEFT JOIN properties_materials AS m ON m.property_material_id = pg.property_material " _
                & "LEFT JOIN properties_sizes AS s ON s.property_size_id = pg.property_size " _
                & "WHERE asin = '" & ASIN & "' LIMIT 1" _
                , connection.connection
    End If
    
    
    rs.MoveFirst
    
'    If rs.Fields("amz_import_group").value = "PWD" And designNumber = "" Then
'        MsgBox "Designnummer "
'    End If
    
    
    For Each fld In rs.Fields
'        MsgBox fld.name & "-" & fld.value
        If fld.name = "ProductGroupFolder" Then
            getCDRPathFromAsin = fld.value
            'MsgBox "Pfad: " & getCDRPathFromAsin & vbNewLine & "ASIN: " & asin & vbNewLine & "Designnummer: " & designNumber
        End If
    Next
    
    
'    Do Until rs.EOF
'        For Each fld In rs.Fields
'            MsgBox fld.value
'        Next
'        rs.MoveNext
'    Loop

    rs.Close
ErrorOrEnd: 'Muss bei Fehlern und am Ende ausgeführt werden
    On Error GoTo 0
    
    If getCDRPathFromAsin = "" Or Not Globals.endsWith(getCDRPathFromAsin, ".cdr") Then
    
        Err.Raise vbObjectError + 513, , "[MySQL.getCDRPathFromAsin] Beim abfragen nach der CDR-Datei des Designs ist ein Fehler aufgetreten. ASIN: " & ASIN & ", Design: " & designNumber
        
        'MsgBox "[MySQL.getCDRPathFromAsin] Beim abfragen nach der CDR-Datei des Designs ist ein Fehler aufgetreten. ASIN: " & asin & ", Design: " & designNumber
        
        'Debug
'        getCDRPathFromAsin = "V:\Produkte\Gedenktafeln\Schiefer\30x20\GT-S-30x20\Export\GT-S-30x20.cdr" ' TODO DEBUG
'        getCDRPathFromAsin = "V:\Produkte\Gedenktafeln\Schiefer\30x20\GT-S-30x20-D1\Export\GT-S-30x20-D1.cdr" ' TODO DEBUG
        Globals.endMacro
    End If
    
    connection.closeConnection
End Function


Public Function getAmazonFontNameForCorel(fontName As String) As String
    
    Dim connection As New MySQLConnection
    connection.connect localServer, martin
    Set rs = New ADODB.Recordset
    rs.CursorLocation = adUseServer
    rs.Open "SELECT name FROM fpd_fonts WHERE full_name = '" & fontName & "' LIMIT 1", connection.connection
    On Error GoTo EmptyData
    rs.MoveFirst
    
    getAmazonFontNameForCorel = rs.Fields(0).value
    
    rs.Close
    connection.closeConnection
    
EmptyData:
    On Error GoTo 0
    Exit Function
End Function


Public Function isProducGroupInDB(productGroup As String) As Boolean
    
    Dim connection As New MySQLConnection
    connection.connect localServer, martin
    Set rs = New ADODB.Recordset
    rs.CursorLocation = adUseServer
    rs.Open "SELECT product_sku FROM products_groups WHERE product_sku = '" & productGroup & "' LIMIT 1", connection.connection
    On Error GoTo EmptyData
    rs.MoveFirst
    
    isProducGroupInDB = Not rs.Fields(0).value = ""
    
    rs.Close
    connection.closeConnection
    
EmptyData:
    On Error GoTo 0
    Exit Function
End Function


Public Function updateProductDesignInfoInDB(design_sku As String, process As String, uploadBoxes As Integer, uploadBoxesBounded As Integer)
    
    Dim connection As New MySQLConnection
    connection.connect localServer, martin
    
    On Error GoTo Error
    connection.connection.Execute ("UPDATE products SET `property_prozess` = '" & process & "', `product_design_uploadboxes` = '" & uploadBoxes & "', `product_design_uploadboxes_bounded` = '" & uploadBoxesBounded & "' WHERE `product_sku` = '" & design_sku & "' LIMIT 1")
    
    connection.closeConnection
    
    Exit Function
Error:
    MsgBox "Fehler beim updaten der Artikeldaten in die DB. Artikelnummer: " & design_sku
End Function
