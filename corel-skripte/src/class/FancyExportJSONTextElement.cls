Attribute VB_Name = "FancyExportJSONTextElement"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
Option Explicit

Public imageElement As FancyExportJSONImageElement

Public fontFamily As String
Public FontSize As Double

Public isUnderline As Boolean ' Stellvertretend für 'textDecoration'
Public isBold As Boolean ' Stellvertretend für fontWeight
Public isItalic As Boolean ' Stellvertretend für fontStyle

Public alignment As cdrAlignment ' Stellvertretend für textAlign
Public width As Double

Public editable As Boolean

Public textLinkGroup As String ' Name des Textfeldes, der genutzt wird um beim Layout/Customizationswitch den Kundentext mitzunehmen

Public minFontSize As Integer
Public maxFontSize As Integer

Public Function init(textSplit As FancyExportTextSplit, locked As Boolean)
    
    Dim customShapeName As String
    customShapeName = Globals.getKeyWordContent(textSplit.shape, Globals.getNamingKeyWord)
    
    ' Name für das Textfeld als 'textLinkGroup' speichern, denn damit werden Texte bei Layoutwechsel rübergenommen
    ' Z.B: "Sterbedatum"
    If Not customShapeName = "" Then textLinkGroup = customShapeName
    
    ' Falls die Textform keine benennung hat "name(Sterbedatum)"
    ' bekommt dieses Element den Titel "Text"
    If customShapeName = "" Then customShapeName = "Text"
    
    If Not imageElement.initialized Then imageElement.initInTextElement textSplit.shape, textSplit.text, customShapeName
    
    imageElement.setPositionToTextSplit textSplit
    
    ' Origin aus Textausrichtung ableiten
    Select Case textSplit.shape.text.Story.alignment
        Case cdrLeftAlignment
            imageElement.originX = LeftFOrigin
        Case cdrCenterAlignment
            imageElement.originX = CenterFOrigin
        Case cdrRightAlignment
            imageElement.originX = RightFOrigin
    End Select
    
    
    
    imageElement.angle = textSplit.angle
    
    fontFamily = textSplit.font
    FontSize = textSplit.size
    
    isUnderline = textSplit.underline
    isBold = textSplit.bold
    isItalic = textSplit.italic
    
    alignment = textSplit.alignment
    
    width = textSplit.width
    
    imageElement.color = textSplit.color
    
    Dim isTextLocked As Boolean: isTextLocked = Globals.isTextLocked(textSplit.shape)
    imageElement.locked = isTextLocked Or locked ' Entweder ist der Text locked (normales locken, was für alle Elemente möglich ist) oder er ist textLocked
    imageElement.adminLocked = isTextLocked Or locked ' Entweder ist der Text locked (normales locken, was für alle Elemente möglich ist) oder er ist textLocked
    editable = Not isTextLocked
    
    ' Falls der Kunde neuen Text hinzufügt, bekommt dieser die selben minimal und maximalen Schriftgrößen Grenzen
    minFontSize = imageElement.view.getMinimumGravableFontSizeInFancyFontUnit
    maxFontSize = imageElement.view.getMaximumFontSizeInFancyFontUnit
    
End Function


Public Function toJSONObj() As Dictionary
    
    Dim textElement As New Dictionary
    textElement.add "title", imageElement.title
    textElement.add "source", imageElement.source
    textElement.add "type", "text"
    
    
    textElement.add "parameters", getParametersJSON
    
    Set toJSONObj = textElement
End Function


Public Function addToMainJSON(Optional atEnd As Boolean = False)
    imageElement.view.addElementToJSON Me, atEnd
End Function


' Baut die JSON Struktur aus den Werten dieses ImageElements.
' Die Funktions-Bezeichnung 'parameters' ist die selbe, die auch in der JSON vorkommt
Public Function getParametersJSON() As Dictionary
    
    Dim parameters As Dictionary
    Set parameters = imageElement.getParametersJSON
    
    If Not textLinkGroup = "" Then parameters.add "textLinkGroup", textLinkGroup
    
    parameters.add "fontFamily", fontFamily
    
    ' Der Fancy zeigt für die Schriftgröße nur ganze Zahlen an arbeitet intern scheinbar doch mit Kommazahlen. Oder rundet unsere Angebe hier passend hoch oder runter
    Dim roundedFontSize As Integer
    roundedFontSize = Globals.round(FontSize)
    parameters.add "fontSize", roundedFontSize
    
    ' TODO gucken ob bei False (z.B: isUnderline == false) das "normal" gespiechert werden muss
    parameters.add "textDecoration", IIf(isUnderline, "underline", "normal")
    parameters.add "fontWeight", IIf(isBold, "bold", "normal")
    parameters.add "fontStyle", IIf(isItalic, "italic", "normal")
    
    parameters.add "textAlign", getTextAlignmentName
    
    parameters.add "width", width
    
    ' editable ist normalerweise True. Deshalb nur false exportieren, wenn es auftaucht
    If Not editable Then parameters.add "editable", editable
    
    ' Min Font Size
    If Not minFontSize = 0 Then parameters.add "minFontSize", minFontSize
    ' Max Font Size
    parameters.add "maxFontSize", max(maxFontSize, roundedFontSize)
    
    Set getParametersJSON = parameters
End Function


Private Function getTextAlignmentName() As String
    Select Case alignment
        Case cdrNoAlignment, cdrLeftAlignment
            getTextAlignmentName = "left"
        Case cdrCenterAlignment
            getTextAlignmentName = "center"
        Case cdrRightAlignment
            getTextAlignmentName = "right"
        Case cdrFullJustifyAlignment
            getTextAlignmentName = "justify"
        Case cdrForceJustifyAlignment
            MsgBox "Die Textausrichtung 'Blocksatz erzwingen' wird nicht vom Fancy unterstützt!", vbCritical
            
            imageElement.getShapeRange.CreateSelection
            Globals.setViewToShapeRange imageElement.getShapeRange
            
            Globals.endMacro
    End Select
End Function
