VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} ProgressBarUserForm 
   Caption         =   "In Bearbeitung..."
   ClientHeight    =   1740
   ClientLeft      =   30
   ClientTop       =   370
   ClientWidth     =   7220
   StartUpPosition =   1  'Fenstermitte
   TypeInfoVer     =   22
End
Attribute VB_Name = "ProgressBarUserForm"
Attribute VB_Base = "0{3103FFE0-41DD-41AC-B517-C5DF72EF9D44}{3F28F293-CC06-4585-90CD-D47777348E7F}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False


Option Explicit

Private Declare PtrSafe Function FindWindow Lib "user32" Alias "FindWindowA" (ByVal lpClassName As String, ByVal lpWindowName As String) As Long
Private Declare PtrSafe Function UpdateWindow Lib "user32" (ByVal hWnd As Long) As Long
Private Declare PtrSafe Sub Sleep Lib "kernel32" (ByVal dwMilliseconds As Long)

Dim startTime As Single
Dim endTime As Single
Dim timeRunning As Single

Dim quitOnUserRequest As Boolean
Public quitRequest As Boolean


Dim topSubProgress As SubProgress

Dim logger As logger


Public Function Start(Optional quitOnUserRequestVar As Boolean = True)
    startTime = timer
    ProgressBarUserForm.Show vbModeless
    
    setProgressText "" ' Zurücksetzten, damit Text aus einem anderen Skript nicht angezeigt wird
    
    quitRequest = False
    quitOnUserRequest = quitOnUserRequestVar
    
    setProgress 0
End Function


Public Sub UserForm_QueryClose(Cancel As Integer, CloseMode As Integer)
    If quitOnUserRequest Then
        Me.Hide
        Globals.endMacro
    Else
        quitRequest = True
    End If
End Sub


Public Function getLogger() As logger
    If logger Is Nothing Then
        Set logger = New logger
        logger.init "ProgressBar"
    End If
    Set getLogger = logger
End Function



Public Function setProgress(ByVal progress As Double)
    If Not logger Is Nothing Then logger.addTab , "setProgress"
    
    If Not logger Is Nothing Then logger.logINFO "progress: '" & progress & "'"
    
    BarFrontTextBox.text = CStr(CInt(min(progress, 1) * 100)) & "%"
    progress = min(progress, 1#)
    BarTextBox.width = BarFrontTextBox.width * progress
    
    endTime = timer
    timeRunning = endTime - startTime
    If progress = 0 Then
        TimeLabel.Caption = "Berechne Zeit ..."
    Else
        TimeLabel.Caption = "Noch ca. " & secondsToHoursSecondsMinutes(timeRunning / progress * (1 - progress))
    End If
   
    
    LowLevelRepaint
    If Not logger Is Nothing Then logger.removeTab
End Function


Private Sub LowLevelRepaint()
    Dim hWnd As Long
    
    hWnd = FindWindow("ThunderDFrame", Me.Caption)
    If hWnd > 0 Then
        UpdateWindow hWnd
    End If
End Sub

Public Function secondsToHoursSecondsMinutes(ByVal seconds As Double) As String
    Dim hours As Long
    hours = CLng(seconds / 3600#)
    seconds = seconds Mod 3600
    
    Dim minutes As Integer
    minutes = Int(seconds / 60#)
    
    seconds = seconds Mod 60
    
    If hours > 0 Then
        secondsToHoursSecondsMinutes = hours & IIf(hours = 1, " Stunde, ", " Stunden, ")
    End If
    
    If minutes > 0 Then
        secondsToHoursSecondsMinutes = secondsToHoursSecondsMinutes & minutes & IIf(minutes = 1, " Minute, ", " Minuten, ")
    End If
    
    secondsToHoursSecondsMinutes = secondsToHoursSecondsMinutes & seconds & IIf(seconds = 1, " Sekunde", " Sekunden")
End Function


Public Function setProgressText(text As String)
    ProgressBarUserForm.SubProcessesLabel.Caption = text
    
    LowLevelRepaint
End Function



Public Function newSubProgress(steps As Integer) As SubProgress
    
    ' Diese Zeile zu deaktivieren, deaktiviert den Logger
    getLogger.addTab , "newSubProgress"
    
    Dim progress As New SubProgress
    progress.setSteps steps
    
    Dim lowestProgress As SubProgress
    Set lowestProgress = getLowestProgress
    
    If lowestProgress Is Nothing Then
        Set topSubProgress = progress
        ProgressBarUserForm.Start
    Else
        Set lowestProgress.childProgress = progress
    End If
    
    
    Set newSubProgress = progress
    
    If Not logger Is Nothing Then logger.removeTab
    
End Function


Public Function refreshSubProgressesText()
    
    Dim text As String
    
    Dim currProgress As SubProgress
    Set currProgress = topSubProgress
    
    
    While Not currProgress Is Nothing
        text = text & IIf(text = "", "", " > ") & currProgress.getDisplayText
        
        Set currProgress = currProgress.childProgress
    Wend
    
    setProgressText text
    
End Function


Public Function refreshSubProgressesProgress()
    
    If Not logger Is Nothing Then logger.addTab , "refreshSubProgressesProgress"
    
    Dim totalProgress As Double
    
    Dim currProgress As SubProgress
    Set currProgress = topSubProgress
    
    Dim stepsOfParent As Integer
    stepsOfParent = 1 ' Default für 'topSubProgress' der keinen Parent hat
    
    Dim divider As Double
    divider = 1
    
    While Not currProgress Is Nothing
        
        totalProgress = totalProgress + (CDbl(currProgress.getProgress) / CDbl(divider))
        
        If Not logger Is Nothing Then logger.logINFO "totalProgress: '" & totalProgress & "', divider: '" & Globals.round(divider, 2) & "', subProgress Progress:'" & currProgress.getProgress & "', stepsOfParent:'" & stepsOfParent & "', subProgress:'" & currProgress.getDisplayText & "'"
        
        stepsOfParent = currProgress.getSteps
        divider = divider * stepsOfParent ' Da sich SubProgresse immer weiter verschachteln, wird deren absoluter Fortschritt immer geringer. Abhängig davon wie groß die Schritte vom Parent sind
        Set currProgress = currProgress.childProgress
    Wend
    
    If Not logger Is Nothing Then
        logger.logINFO ""
        logger.logINFO "totalProgress at End: '" & totalProgress & "'"
        logger.logINFO ""
    End If
    
    setProgress totalProgress
    
    If Not logger Is Nothing Then logger.removeTab
End Function



Public Function getLowestProgress() As SubProgress
    
    Dim progress As SubProgress
    Set progress = topSubProgress
    
    If Not progress Is Nothing Then
        While Not progress.childProgress Is Nothing
            Set progress = progress.childProgress
        Wend
    End If
    
    Set getLowestProgress = progress
    
End Function


Public Function removeSubProgress(progress As SubProgress)
    
    If Not logger Is Nothing Then logger.addTab , "removeSubProgress '" & progress.getDisplayText & "'"
    
    Dim lastParent As SubProgress
    
    Dim currProgress As SubProgress
    Set currProgress = topSubProgress
    
    Do While Not currProgress Is Nothing
        If progress Is currProgress Then
            
            ' Wenn der 'lastParent' nicht exestiert, dann ist 'currProgress' der 'topSubProgress'
            If lastParent Is Nothing Then
                Set topSubProgress = Nothing
                Hide ' Keine Prozesse mehr
                If Not logger Is Nothing Then logger.logINFO "Keine Prozesse mehr vorhanden. Mache Ladebalken-Fenster unsichtbar"
            Else
                Set lastParent.childProgress = Nothing
            End If
            
            Exit Do
        End If
        
        Set lastParent = currProgress
        Set currProgress = currProgress.childProgress
    Loop
    
    If Not logger Is Nothing Then logger.removeTab
    
End Function







