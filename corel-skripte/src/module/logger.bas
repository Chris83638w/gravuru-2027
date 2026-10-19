Attribute VB_Name = "Logger"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
Option Explicit

' Autoren: Christian Bolterauer & Martin Afelt

Private levelLimit As logLevel

' Wohin soll gelogged werden
Public bConsole As Boolean ' MsgBox
Public doWriteToLogFile As Boolean ' .log Datei
Public doWriteToImmediateWindow As Boolean ' In die Konsole

Public logFilePath As String

Dim tabs As String
Dim tabsCount As Integer

Dim adoDBStream As ADODB.Stream

Public Enum logLevel
  disabled = 0
  BASIC = 1
  FATAL = 2
  WARN = 3
  INFO = 4
  FINE = 5
  FINER = 6
  FINEST = 7
  All = 8
End Enum

Public Function init(logFileName As String, Optional writeToLogFile As Boolean = True, Optional logLevelVar As logLevel = logLevel.All)
    
    If Globals.isReleaseVersion Then
        levelLimit = disabled
        Exit Function
    End If
    
    ' logFilePath ermitteln
    Dim localpath As String
    On Error GoTo vbProjectFolderError:
    localpath = Application.GMSManager.UserGMSPath
    On Error GoTo 0
    logFilePath = localpath & "\" & logFileName & ".log"
    
    levelLimit = logLevelVar
    doWriteToLogFile = writeToLogFile
    
    reset
    
    
    Exit Function
ErrHandler:
    MsgBox "Error in Logger.init" & "; " & Err.number & "; " & Err.Description, vbCritical
    Exit Function
vbProjectFolderError:
    MsgBox "Error in Logger.init: Application.VBE.ActiveVBProject.fileName" & "; " & Err.number & "; " & Err.Description, vbCritical
    Exit Function
End Function





Public Function logBASIC(ByVal sLogText As String, Optional slogpoint As String)
   log sLogText, logLevel.BASIC, slogpoint
End Function

Public Function logINFO(ByVal sLogText As String, Optional slogpoint As String)
   log sLogText, logLevel.INFO, slogpoint
End Function
Public Function logWARN(ByVal sLogText As String, Optional slogpoint As String)
   log sLogText, logLevel.WARN, slogpoint
End Function

Public Function logFATAL(ByVal sLogText As String, Optional slogpoint As String)
   log sLogText, logLevel.FATAL, slogpoint
End Function

Public Function logFINE(ByVal sLogText As String, Optional slogpoint As String)
   log sLogText, logLevel.FINE, slogpoint
End Function

Public Function logFINER(ByVal sLogText As String, Optional slogpoint As String)
   log sLogText, logLevel.FINER, slogpoint
End Function

Public Function logFINEST(ByVal sLogText As String, Optional slogpoint As String)
   log sLogText, logLevel.FINEST, slogpoint
End Function

'The main log procedure
Public Function log(ByVal sLogText As String, level As logLevel, Optional slogpoint As String)
    
    If Globals.isReleaseVersion Then
'        Debug.Print "[Logger.log] Release ist aus. Logging wird abgebrochen!"
        Exit Function
    End If
    
    If isLogLevelAllowed(level) Then
        If IsMissing(slogpoint) Then
            WriteLog sLogText, level, ""
        Else
            WriteLog sLogText, level, slogpoint
        End If
    Else
        
    End If
End Function


Private Function isLogLevelAllowed(level As logLevel)
    isLogLevelAllowed = (level <= levelLimit)
End Function


Private Function WriteLog(sLogText, level As logLevel, slogpoint As String)

  Dim logMessage As String
  Dim sDateTime As String
  Dim sLogPrefix As String
  
  sLogPrefix = getLogPrefix(level, slogpoint)
  
  ' Wandelt Zeilen so um, dass am Anfang immer der Log-Prefix steht (z.B: "(20.06.2024 14:48:02)-INFO:"). Allerdings nur ab Zeile 2
  sLogText = replace(sLogText, Chr(13) & Chr(10), vbNewLine & sLogPrefix & tabs)
  
  logMessage = getLogPrefix(level, slogpoint) & tabs & sLogText

  ' write to console
  If bConsole Then MsgBox (logMessage)
  ' write to file
  If doWriteToLogFile Then writeToLogFile (logMessage)
  
  If doWriteToImmediateWindow Then Debug.Print logMessage

End Function


Public Function addTab(Optional level As logLevel = logLevel.INFO, Optional logText As String = "")
    If isLogLevelAllowed(level) Then
        If Not logText = "" Then log logText, level ' Loggen
        tabs = tabs & Globals.tabs(1)
        tabsCount = tabsCount + 1
    End If
End Function

Public Function addTabBASIC(Optional logText As String = "")
    addTab BASIC, logText
End Function

Public Function addTabINFO(Optional logText As String = "")
    addTab INFO, logText
End Function

Public Function addTabWARN(Optional logText As String = "")
    addTab WARN, logText
End Function

Public Function addTabFATAL(Optional logText As String = "")
    addTab FATAL, logText
End Function

Public Function addTabFINE(Optional logText As String = "")
    addTab FINE, logText
End Function

Public Function addTabFINER(Optional logText As String = "")
    addTab FINER, logText
End Function

Public Function addTabFINEST(Optional logText As String = "")
    addTab FINEST, logText
End Function



Public Function removeTab(Optional level As logLevel = logLevel.INFO)
    If isLogLevelAllowed(level) Then
        If Len(tabs) > 1 Then
            tabs = left(tabs, Len(tabs) - 1)
        ElseIf Len(tabs) > 0 Then
            tabs = ""
        End If
        
        tabsCount = tabsCount - 1
        If tabsCount < 0 Then tabsCount = 0
    End If
End Function

Public Function removeTabBASIC()
    removeTab BASIC
End Function

Public Function removeTabINFO()
    removeTab INFO
End Function

Public Function removeTabWARN()
    removeTab WARN
End Function

Public Function removeTabFATAL()
    removeTab FATAL
End Function

Public Function removeTabFINE()
    removeTab FINE
End Function

Public Function removeTabFINER()
    removeTab FINER
End Function

Public Function removeTabFINEST()
    removeTab FINEST
End Function

Public Function removeTabsAll()
    tabs = ""
    tabsCount = 0
End Function

Public Function setWriteToLogFile(bool As Boolean)
    If Not Globals.isReleaseVersion Then
        doWriteToLogFile = bool
    End If
End Function


Public Function getLogLevelName(level As logLevel)
    Dim myLevelName As String

    Select Case level
    Case logLevel.disabled:
       myLevelName = "DISABLED"
    Case logLevel.BASIC:
       myLevelName = "BASIC"
    Case logLevel.INFO:
       myLevelName = "INFO:"
    Case logLevel.WARN:
       myLevelName = "WARN:"
    Case logLevel.FATAL:
       myLevelName = "FATAL:"
    Case logLevel.FINE:
       myLevelName = "FINE:"
    Case logLevel.FINER:
       myLevelName = "FINER:"
    Case logLevel.FINEST:
       myLevelName = "FINEST:"
    Case logLevel.All:
       myLevelName = "ALL:"

    Case Else
       myLevelName = "Level is not defined:" & CStr(level)
  End Select

  getLogLevelName = myLevelName

End Function

Private Function getLogPrefix(level As logLevel, logpoint As String) As String
    Dim dateTime As String
    Dim myLevelPrefix As String
    Dim ms As Long

    myLevelPrefix = getLogLevelName(level)
    
    ms = CLng((timer - Int(timer)) * 1000)
    dateTime = Format$(Now, "dd.mm.yyyy hh:nn:ss") & "." & Format$(ms, "000")

    getLogPrefix = "(" & dateTime & ")-" & myLevelPrefix & "  "
End Function



Private Function getAdoDBStream() As ADODB.Stream
    If adoDBStream Is Nothing Then
        Set adoDBStream = New ADODB.Stream ' CreateObject("ADODB.Stream")
        
        ' ADODB.Stream für Text öffnen
        adoDBStream.Type = 2 ' adTypeText
        adoDBStream.CharSet = "utf-8" ' Setzt UTF-8 als Encoding
'        adoDBStream.Open
    End If
    
    Set getAdoDBStream = adoDBStream
End Function




Private Function writeToLogFile(logmsg As String)
'    On Error GoTo Errhandler:
    If Len(Me.logFilePath) = 0 Then
'       MsgBox "Error: Log file path is empty."
       Exit Function
    End If

    getAdoDBStream
    adoDBStream.Open
    
    If Globals.fileExist(Me.logFilePath) Then
        adoDBStream.loadFromFile Me.logFilePath
    End If
    
    adoDBStream.position = adoDBStream.size ' Setze den Cursor ans Ende der Datei
    adoDBStream.WriteText logmsg & vbNewLine
    adoDBStream.Flush
    
    Const maxRetries As Integer = 5 ' Anzahl der Versuche
    ' Datei speichern mit Wiederholungsmechanismus
    Dim retryCount As Integer
    retryCount = 0
    On Error Resume Next
    Do While retryCount < maxRetries
        adoDBStream.SaveToFile Me.logFilePath, 2
        If Err.number = 0 Then Exit Do
        Err.Clear
        retryCount = retryCount + 1
        Globals.Sleep (5)
    Loop
    On Error GoTo 0
    
    ' Schließe den Stream
    adoDBStream.Close
End Function


Public Function reset()
    emptyLogFile
    tabs = ""
    tabsCount = 0
End Function


'delete log file currently set
Public Function deleteLogFile()
  On Error GoTo ErrHandler:
  If (Globals.fileExist(logFilePath)) Then
     Kill (logFilePath)
  End If
Exit Function

ErrHandler:
  MsgBox "Error deleting Logfile " & Me.logFilePath & " " & Err.number & " " & Err.Description, vbCritical

End Function


Public Function emptyLogFile()
    If logFilePath = "" Then Exit Function ' Logger wurde noch nicht initialisiert
    ' Öffnet die Datei im Output-Modus, wodurch sie geleert wird
    Open logFilePath For Output As #1
    Close #1
End Function


Public Function setLogLevel(level As logLevel)
    ' Wenn das Script beim Endnutzer ausgeführt wird, soll logging aus sein
    ' Deshalb nur erlauben, wenn nicht releeased
    If Not Globals.isReleaseVersion Then
        levelLimit = level
    End If
End Function


Public Function getTabCount() As Integer
    getTabCount = tabsCount
End Function


