Attribute VB_Name = "MySQLConnection"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False

' Autor: Martin Afelt GRAVURU
' und Andere
'

Public connection As ADODB.connection


Public Enum Servers
    localServer
End Enum

Dim serverIP As String
Dim database As String
Dim user As String
Dim password As String


Public Enum Databases
    admin
    martin
End Enum

Public Enum Tables
    products
End Enum


Public Function connect(server As Servers, databaseVar As Databases)

    Select Case server
        Case localServer
            serverIP = "192.168.178.252"
    End Select
    
    If databaseVar = martin Then
        user = "martin"
        password = "<ENTFERNT – Zugangsdaten nicht im Repository>"
        database = "martin"
    ElseIf databaseVar = admin Then
        user = "gravuru"
        password = "<ENTFERNT – Zugangsdaten nicht im Repository>"
        database = "admin"
'        MsgBox "Sicher?"
        End
    End If
    



    Set connection = CreateObject("ADODB.Connection")

    With connection
        .ConnectionString = "DRIVER={MySQL ODBC 8.0 Unicode Driver};" & "SERVER=" & serverIP & ";" & " DATABASE=" & database & ";" & "UID=" & user & ";" & "PWD=" & password & "; OPTION=3; PORT=3306; Connect Timeout=5;"
        On Error GoTo AnError
        .Open
        On Error GoTo 0
    End With
    
    
    
    Exit Function
AnError:

    Dim errorNr As Long
    errorNr = Err.number
    If errorNr = -2147467259 Then

        MsgBox "Es ist ein Fehler aufgetreten:" & vbNewLine & vbNewLine & Err.Description & vbNewLine & vbNewLine & _
            "Es kann sein, dass ein Treiber noch installiert werden muss." & vbNewLine & _
            "Drücke OK. Danach öffnet sich ein neues Fenster. Führe bitte die darin enthaltene Datei aus um den fehlenden Treiber zu installieren und probiere es danach noch einmal aus." & vbNewLine & _
            "Wenn der Fehler weiterhin auftaucht, bitte melden.", vbCritical
        checkIfServerOnlineAndSelectOfflineWorkPath
        Globals.openFolder Globals.getMainFolder & "MySQL\"
        Globals.endMacro
    Else
        Err.Raise Err.number, Err.source, Err.Description, Err.HelpFile, Err.HelpContext
    End If
    
End Function


Public Function closeConnection()
    connection.Close
End Function
