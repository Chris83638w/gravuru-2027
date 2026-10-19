Attribute VB_Name = "SVGColorizer"


Public Sub Test()
    Start "C:\Users\GRAVURU 2\Desktop\SVGTest\", "C:\Users\GRAVURU 2\Desktop\SVGTest\Grau", 200, CreateRGBColor(125, 125, 125)
End Sub

Public Sub Show()

    SVGColorizerDialog.Show vbModal
    
End Sub

Public Sub Start(folderPath As String, exportPath As String, size As Integer, color As color, Optional quietMode As Boolean)
    
    If Not Globals.debugHistory Then
        CorelScriptTools.BeginWaitCursor
        If Not Globals.debugErrors Then On Error GoTo MacroError
    End If
     
    startFunction folderPath, exportPath, size, color, quietMode
    
    
    Exit Sub
MacroError:     'Alle Fehler hier abfangen und die CommandGruppe beenden, damit man mit einem Schritt zurück gehen kann (STRG + Z)
    ProgressBarUserForm.Hide
    MsgBox Err.Description & ", " & Err.number, vbCritical
End Sub



Public Function startFunction(folderPath As String, exportPath As String, size As Integer, color As color, Optional quietMode As Boolean)
    
    If folderPath = "" Then
        If Not quietMode Then MsgBox "folderPath ist leer!", vbExclamation
        Exit Function
    End If
    
    Dim svgFiles As collection
    Set svgFiles = Globals.getFilesPathWithExtensionInFolder(folderPath, "svg", -1)
    
    With ProgressBarUserForm.newSubProgress(svgFiles.count)
             
        For i = 1 To svgFiles.count
            .setDisplayText svgFiles(i)
        
            processSVG svgFiles(i), exportPath, size, color
            
            .setStepsProgress i
        Next i
        
        .finishProgress
    End With
    
End Function



Private Function processSVG(filePath As String, exportFolderPath As String, size As Integer, color As color)
    
    If Not Globals.endsWith(exportFolderPath, "\") Then
        exportFolderPath = exportFolderPath & "\"
    End If
    
    Dim fileName As String
    fileName = Globals.getFolderFileAndType(filePath)(1)
    
    
    Dim createopt As StructCreateOptions
    Set createopt = CreateStructCreateOptions
    With createopt
        .name = fileName
        .resolution = 300#
        .ColorContext = CreateColorContext2("sRGB IEC61966-2.1,ISO Coated v2 (ECI),Dot Gain 15%", BlendingColorModel:=clrColorModelCMYK)
    End With
    CreateDocumentEx createopt
    ActiveDocument.Rulers.HUnits = cdrPixel
    ActiveDocument.Rulers.VUnits = cdrPixel
    
    ActiveDocument.unit = cdrPixel
    With ActiveDocument.MasterPage
        .SizeWidth = size
        .SizeHeight = size
    End With
    


    
    
    Dim motiveShape As shape
    Set motiveShape = Globals.loadSVG(filePath)
    ActiveDocument.Dirty = False
    
    If ActiveDocument.ActiveLayer.shapes.First.locked Then
        ActiveDocument.ActiveLayer.shapes.First.locked = False
        ActiveDocument.ActiveLayer.shapes.First.delete
    End If
    
    Set motiveShape = ActiveDocument.ActiveLayer.shapes.First
    motiveShape.locked = False
    
    Dim newW As Double
    Dim newH As Double

    If motiveShape.SizeWidth > motiveShape.SizeHeight Then
        newW = size
        newH = newW * (motiveShape.SizeHeight / motiveShape.SizeWidth)
    Else
        newH = size
        newW = newH * (motiveShape.SizeWidth / motiveShape.SizeHeight)
    End If

    motiveShape.SetBoundingBox motiveShape.centerX - newW / 2, motiveShape.centerY - newH / 2, newW, newH, False, cdrCenter
    
    
    
'    If motiveShape.CanHaveFill Then
        If motiveShape.fill.Type = cdrUniformFill Then
            motiveShape.fill.ApplyUniformFill color
        End If
'    End If
    
    
'    If motiveShape.CanHaveOutline Then
        If motiveShape.outline.Type = cdrOutline Then
            motiveShape.outline.color = color
        End If
'    End If
    
    Dim exportFilePath As String
    exportFilePath = exportFolderPath & fileName & ".svg"
    Globals.createFolder Globals.getParentPath(exportFilePath)
    

    ' Als .SVG speichern
    Dim expopt As StructExportOptions
    Set expopt = CreateStructExportOptions
    expopt.useColorProfile = False
    Dim expFlt As ExportFilter
    Set expFlt = ActiveDocument.ExportEx(exportFilePath, cdrSVG, cdrAllPages, expopt)
    With expFlt
        .Version = 1 ' FilterSVGLib.svgVer11
        .Encoding = 0 ' FilterSVGLib.svgUTF8
        .Styling = 0 ' FilterSVGLib.svgInternalStyleSheet
        .EmbedJavaScript = True
        .width = size
        .height = size
        .Units = 3 ' FilterSVGLib.svgPixels
        .DrawingPrecision = 0 ' FilterSVGLib.svg_1to1
        .FountainSteps = 255
        .TextAsCurves = True
        .EmbedFont = True
        .CharacterSubsetting = 0 ' FilterSVGLib.svgUsedOnly
        .GiveEmbededFontPriority = True
        .BmpExportType = 2 ' FilterSVGLib.svgPng
        .EmbedImages = True
        .UseDecimalPrecision = True
        .finish
    End With

    Set motiveShape = Nothing

    ActiveDocument.Close
    
End Function
