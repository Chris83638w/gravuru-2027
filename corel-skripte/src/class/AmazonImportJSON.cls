Attribute VB_Name = "AmazonImportJSON"
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
' Dies ist eine Schnittstelle für Informationen aus einer Amazon JSON.
' Informationen werden aus der JSON geparsed

Private jsonFilePath As String

Private jsonString As String
Private jsonDict As Dictionary
    Private p_asin As String
    Private p_orderID As String
    Private p_quantity As Integer
    Private p_customizationData As Dictionary
        Private p_customizationDataChilds() As Variant ' Die Views werden hieraus entnommen
        
    Private p_customizationInfo As Dictionary
        Private p_versionString As String
        Private p_version As Version
    
Private p_isFromASIN As Boolean ' Die JSON wurde nicht aus einer Datei geladen, sondern nur aus einer ASIN im Speicher erzeugt



Public Function init(jsonFilePath_ As String)
    jsonFilePath = jsonFilePath_
    
    loadJSON
    checkJSONValidity
End Function


' Erzeugt eine minimale Amazon-JSON im Speicher, nur anhand einer ASIN (ohne ZIP/JSON-Datei)
' Wird für Produkte ohne Anpassungen genutzt. Die Views haben deshalb keine Texte, Bilder oder Optionen
' 'viewCount': Anzahl der leeren Views, die erzeugt werden sollen
Public Function initFromASIN(ASIN_ As String, ByVal viewCount As Integer)
    p_isFromASIN = True
    
    If viewCount < 1 Then viewCount = 1
    
    Set jsonDict = New Dictionary
    jsonDict.add "asin", ASIN_
    jsonDict.add "orderId", ""
    jsonDict.add "quantity", 1
    
    ' Versions-Key z.B: "version3.0" (siehe 'versionString')
    Dim customizationInfoDict As New Dictionary
    customizationInfoDict.add "version" & AmazonImport.AMAZON_JSON_VERSION_SUPPORTED, New Dictionary
    jsonDict.add "customizationInfo", customizationInfoDict
    
    Dim views() As Variant
    ReDim views(viewCount - 1)
    
    Dim i As Integer
    For i = 0 To viewCount - 1
        Dim flatContainerDict As Dictionary
        Set flatContainerDict = New Dictionary
        flatContainerDict.add "type", "FlatContainerCustomization"
        flatContainerDict.add "children", Array()
        
        Dim snapShotDict As Dictionary
        Set snapShotDict = New Dictionary
        snapShotDict.add "imageName", ""
        
        Dim viewDict As Dictionary
        Set viewDict = New Dictionary
        viewDict.add "name", "View " & (i + 1)
        viewDict.add "snapshot", snapShotDict
        viewDict.add "children", Array(flatContainerDict)
        
        Set views(i) = viewDict
        
        Set flatContainerDict = Nothing
        Set snapShotDict = Nothing
        Set viewDict = Nothing
    Next i
    
    Dim customizationDataDict As New Dictionary
    customizationDataDict.add "children", views
    jsonDict.add "customizationData", customizationDataDict
End Function


Public Property Get isFromASIN() As Boolean
    isFromASIN = p_isFromASIN
End Property


Private Function loadJSON()
    jsonString = Globals.loadFileAsStringFromUTFEight(jsonFilePath)
    Set jsonDict = JSON.Parse(jsonString)
End Function


Private Function checkJSONValidity()
    ' Prüfen, ob die JSON eine gültige Amazon-JSON ist
    If Not jsonDict.Exists("customizationInfo") Then
        Err.Raise vbObjectError + 513, , "Die JSON ist keine gültige Amazon-Bestellungs-JSON. Pfad: '" & jsonFilePath & "'"
    End If
    
    
    ' Versionsüberprüfung
    ' -------------------------
    If AmazonImport.getAmazonJSONVersionSupported.isVersionLowerThen(Version) Then
        Dim answer As VbMsgBoxResult
        
        ' Wenn Version nicht supportet, User fragen ob weitergemacht werden soll
        answer = MsgBox("Die Amazon Daten nutzen eine neuere Version. Das Skript braucht eventuell ein Update! Trotzdem fortfahren?", vbYesNo Or vbExclamation)
        
        If answer = vbNo Then
            Globals.endMacro
        End If
    End If
    ' --------------------------
End Function


Public Property Get ASIN() As String
    If p_asin = "" Then
        p_asin = jsonDict.item("asin")
    End If
    
    ASIN = p_asin
End Property


Public Property Get orderID() As String
    If p_orderID = "" Then
        p_orderID = jsonDict.item("orderId")
    End If
    
    orderID = p_orderID
End Property


' Wie viele Exemplare hat der Kunde bestellt (Nicht zu verwechseln mit der Auswahl der Anzahl im Konfi (meist Spar-Set) (Nicht bei allen Produkten))
Public Property Get quantity() As Integer
    If p_quantity = 0 Then
        p_quantity = jsonDict.item("quantity")
    End If
    quantity = p_quantity
End Property


Private Property Get customizationData()
    If p_customizationData Is Nothing Then
        Set p_customizationData = jsonDict.item("customizationData")
    End If
    
    Set customizationData = p_customizationData
End Property


Private Property Get customizationDataChilds() As Variant()
    If Not Globals.isArrayDimensionised(p_customizationDataChilds) Then
        p_customizationDataChilds = customizationData.item("children")
    End If
    
    customizationDataChilds = p_customizationDataChilds
End Property


Public Function getViewJsonDict(viewIndex As Integer) As Dictionary
    Set getViewJsonDict = customizationDataChilds()(viewIndex)
End Function


Public Function getViewCount() As Integer
    getViewCount = UBound(customizationDataChilds)
End Function






Private Property Get customizationInfo() As Dictionary
    If p_customizationInfo Is Nothing Then
        Set p_customizationInfo = jsonDict.item("customizationInfo")
    End If
    
    Set customizationInfo = p_customizationInfo
End Property


Private Property Get versionString() As String
    If p_versionString = "" Then
        p_versionString = Mid(customizationInfo.keys(0), 8)
    End If
    
    versionString = p_versionString
End Property


Public Property Get Version() As Version
    If p_version Is Nothing Then
        Set p_version = New Version
        p_version.newFromString versionString
    End If
    
    Set Version = p_version
End Property
