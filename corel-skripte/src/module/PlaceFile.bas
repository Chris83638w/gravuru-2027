Attribute VB_Name = "PlaceFile"


' Autor:  Martin Afelt @ GRAVURU
'
' TODO:
' - Wenn Texturen zu Bitmaps gerastert werden (um die perfekte Auflösung zu haben und die minimalste Datengröße) muss der Zuschnittpfad (eig. immer die der Hauptform) erhalten bleiben
'
' C# TODO:
' - Sowohl PlaceFileSubJob als auch ProductRecognizer als auch CustomShapeTypeQuery versuchen Formen zu erkennen. Das kann man evtl. in eine Baseclass zusammenfassen, damit alle voneinander profitieren


Private logger As logger

' 0 Basierend
Public Enum PartMode
    Part1 = 0
    Part2
    Part3
    AllParts
End Enum
Dim partModeVar As PartMode

' 0 Basierend
Public Enum LayerMode
    layer1
    layer2
    Layer3
    allLayers
End Enum
Dim layerModeVar As LayerMode


Public groundPlateVariantGroups As collection
Public jobsToPutAboveMainMask As collection
Public staticVariantJobs As collection


Public jobFunkklingelModelle As PlaceFileJob

Public jobsAcrylSchwarzUndAnthrazit As collection
Public jobAcrylLook As PlaceFileJob
Public jobAcrylSatinLook As PlaceFileJob
Public jobGraniteLook As PlaceFileJob
Public jobPremiumSlate As PlaceFileJob 'Premiumschiefer
Public jobPremiumSlateLook As PlaceFileJob 'Premiumschiefer Look
Public jobSlateClearCut ' Raues Schiefer mit glatten geschnittenen Kanten

Public jobsZAcrylSchwarzUndAnthrazit As collection

Public job2Abstandshalter As PlaceFileJob
Public job2Abstandshalter1cm As PlaceFileJob
Public job2Abstandshalter1_5cm As PlaceFileJob
Public job4Abstandshalter As PlaceFileJob
Public job4Abstandshalter1cm As PlaceFileJob
Public job4Abstandshalter1_5cm As PlaceFileJob
Public jobAbstandshalterPNG As PlaceFileJob
Public jobAbstandshalterSchwarzPNG As PlaceFileJob
Public jobAbstandshalterGoldPNG As PlaceFileJob
Public jobAbstandshalterRosePNG As PlaceFileJob
Public jobAbstandshalterWeißPNG As PlaceFileJob

Public jobAcrylKlar As PlaceFileJob
Public jobAcrylSatiniert As PlaceFileJob
Public jobAcrylSchwarz As PlaceFileJob
Public jobAcrylSchwarzSatiniert As PlaceFileJob

Public jobBuchenholz As PlaceFileJob
Public jobPappelholz As PlaceFileJob
Public jobCanvasLook As PlaceFileJob
Public jobHolzUVStandart As PlaceFileJob
Public jobsWandbilderHolzUV As collection
Public jobHolzLook As PlaceFileJob
Public jobCDR As PlaceFileJob
Public jobSVG As PlaceFileJob
Public jobShapeReplace As PlaceFileJob
Public jobRoterRahmenPlusEinCM As PlaceFileJob
Public jobRoterRahmen As PlaceFileJob

Public job2Bohrlöcher_4mm As PlaceFileJob
Public job2Bohrlöcher_5mm As PlaceFileJob
Public job2Bohrlöcher_6mm As PlaceFileJob
Public job2Bohrlöcher_8mm As PlaceFileJob
Public job2Bohrlöcher_1cm As PlaceFileJob
Public job2Bohrlöcher_1_5cm As PlaceFileJob
Public job2Bohrlöcher_2cm As PlaceFileJob
Public jobs2Bohrlöcher As collection

Public job2Bohrlöcher_4mm_Edelstahl As PlaceFileJob
Public job2Bohrlöcher_6mm_Edelstahl As PlaceFileJob
Public job2Bohrlöcher_8mm_Edelstahl As PlaceFileJob
Public job2Bohrlöcher_1cm_Edelstahl As PlaceFileJob
Public job2Bohrlöcher_1_5cm_Edelstahl As PlaceFileJob
Public job2Bohrlöcher_2cm_Edelstahl As PlaceFileJob
Public job2BohrlöcherEdelstahl As PlaceFileJob

Public job4Bohrlöcher_5mm As PlaceFileJob
Public jobVarianteBefestigungBohrlöcher4x5mm As PlaceFileJob
Public jobVarianteBefestigungBohrlöcher4x5mmMitSchrauben As PlaceFileJob
Public job4Bohrlöcher_6mm As PlaceFileJob
Public job4Bohrlöcher_8mm As PlaceFileJob
Public job4Bohrlöcher_1cm As PlaceFileJob
Public jobVarianteBefestigungBohrlöcher4x1cm As PlaceFileJob
Public job4Bohrlöcher_1_5cm As PlaceFileJob
Public job4Bohrlöcher_2cm As PlaceFileJob
Public job4BohrlöcherEdelstahl As PlaceFileJob
Public jobs4Bohrlöcher As collection

Public jobBohrlöcherSchraubenPNG As PlaceFileJob

Public jobEdelstahl As PlaceFileJob
Public jobViewShapeDeletion As PlaceFileJob
Public jobsStandbilderHolzUV As collection
Public jobsStandbilderAcrylUV As collection
Public jobsNussUndKirsch As collection

Public jobKlingelTasterBlau As PlaceFileJob
Public jobKlingelTasterGelb As PlaceFileJob
Public jobKlingelTasterGruen As PlaceFileJob
Public jobKlingelTasterNormal As PlaceFileJob
Public jobKlingelTasterRot As PlaceFileJob
Public jobKlingelTasterWeiss As PlaceFileJob

Public jobKlingelTasterVarianteAlle As PlaceFileJob

Public jobVarianteBefestigungOhne As PlaceFileJob
Public jobVarianteBefestigungSelbstklebendGlatteFlächen As PlaceFileJob
Public jobVarianteBefestigungSelbstklebendRaueFlächen As PlaceFileJob
Public jobVarianteBefestigungSelbstklebend As PlaceFileJob
Public jobVarianteBefestigungSilikonkleber As PlaceFileJob
Public jobVarianteBefestigungBolzen As PlaceFileJob

Public jobsKunststoffGravurSchwarz As collection
Public jobsKunststoffGravurWeiss As collection

Public jobsAcrylAlleFarben As collection

Public jobsKordelAlleFarben As collection
Public jobsKordelAlleFarben1cm As collection
Public jobsKordelAlleFarben1_5cm As collection
Public jobKordelloecher1cm As PlaceFileJob
Public jobKordelloecher1_5cm As PlaceFileJob
Public jobsKordelloecher As collection

' TODO FK-SHOPIFY-QUICK
Dim jobVarianteFunkklingelnFakeRahmen As PlaceFileJob
Dim jobVarianteFunkklingelFakeEcken As PlaceFileJob
Public jobFunkklingelnFakedJobs As PlaceFileJob



Public placedShapes As shapeRange
Dim placedShapesByCurrentSubJob As shapeRange

Dim lastPlacedShapeParent As shape
Dim nameOfExportShapeToGroup As String

Dim selectedJob As PlaceFileJob
Public jobList As New PlaceFileJobList

Public initialized As Boolean
Dim errorWhenNothingPlaced As Boolean
Dim somethingWasPlaced As Boolean
Dim useOffsetForCDR As Boolean
Dim deleteMode As Boolean
Dim groupsAsDesigns As Boolean
Dim shapeCache As New PlaceFileShapeCache

Dim shapesToDeleteAtEnd As New shapeRange

' Verhindert, dass platzierte Bilder gerastert werden. Bilder werden normalerweise auf 300 DPI gerastert um speicher (in der CDR) zu sparen
Private Function debugDontRasterBitmap() As Boolean
    ' Am besten anlassen, damit Texturen die maximale Schärfe haben
    debugDontRasterBitmap = True
End Function


Sub PlaceFile()
    
    Globals.showWarnings
    
    If Not initialized Then
        'Logger.logINFO "Noch nicht initialisiert. Initialisierung wird aufgerufen."
         init
    End If
    
    With PlaceFileDialog.PlaceTypeComboBox
        For Each PlaceFileJob In jobList.jobs
            .AddItem PlaceFileJob.name
        Next
    End With
    
    If Not logger Is Nothing Then logger.logINFO "Dialogfenster initialisieren"
    PlaceFileDialog.init
    If Not logger Is Nothing Then logger.logINFO "Dialogfenster anzeigen"
    PlaceFileDialog.Show vbModal
    
    
End Sub



Public Function getMainFolder()
    getMainFolder = Globals.getMainFolder & "Platzierbare Bilddateien\"
End Function



Public Function initIfNeeded()
    If Not initialized Then init
End Function


Public Function createLogger() As logger
    ' In der Release-Version ist der Logger Nothing. Dadurch läuft das Script deutlich schneller.
    ' Auch schneller, als wenn der Logger einfach nur auf DISABLED stehen würde
    If Not Globals.isReleaseVersion Then
'       Für RELEASE deaktiviert vvv
'        Set createLogger = New logger
'        createLogger.init "Bildplatzierer"
    End If
End Function


Public Function init()
    
    If Not logger Is Nothing Then logger.logINFO "Initialisierung gestartet"
    
    Dim i As Integer
    
    ProductRecognizer.init
    
    While PlaceFileDialog.PlaceTypeComboBox.ListCount > 0
        PlaceFileDialog.PlaceTypeComboBox.removeItem (0)
    Wend
    
    Unload PlaceFileDialog
    
    PlaceFileDialog.PlaceTypeComboBox.Clear
    PlaceFileDialog.PlaceTypeComboBox.value = ""
    
    ' Wird mehrfach verwendet
    Dim currentJob As PlaceFileJob
    Dim currentSubJob As PlaceFileSubJob
    
    Set jobsToPutAboveMainMask = New collection
    Set staticVariantJobs = New collection
    
    
    Set jobList.jobs = New collection


    ' TEST: Boolesche Operation gegen die vom vorherigen SubJob platzierte Form
    ' SubJob 1 platziert eine Grundplatte, SubJob 2 schneidet als Ellipse durch diese hindurch
    ' Nur im Nicht-Release-Modus verfügbar
    If Not Globals.isReleaseVersion Then
        With jobList.newJob
            .name = "TEST Durchschnitt"

            ' SubJob 1: Grundplatte auf der Hauptform
            With .newSubJob
                .placeOnMainRedShape = True
                .orderShapeAllBehind = True
                .setWidthToShapeToPlaceOn
                .setHeightToShapeToPlaceOn
                .shapeName = "TEST_Grundplatte"
                .setShapeColor 200, 200, 200
            End With

            ' SubJob 2: Ellipse, die durch die zuvor platzierte Grundplatte schneidet
            With .newSubJob
                .placeOnMainRedShape = True
                .shapeType = cdrEllipseShape
                .setWidth 40
                .setHeight 40

                .setBooleanOperationWithPreviousSubJob subtractOperation ' leaveSource=False (Standard)
            End With
        End With
    End If


    ' Graue 1x1 cm Quadrate in allen 4 Ecken der Hauptform.
    ' In der jeweils inneren Ecke jedes Quadrats wird ein Kreis (Radius 1 cm) herausgeschnitten.
    If Not Globals.isReleaseVersion Then
        With jobList.newJob
            .name = "TEST Eckquadrate rund"

            ' 4 Ecken: unten-links, unten-rechts, oben-links, oben-rechts
            ' alignXTarget/alignYTarget: 0 = Mitte, -1 = links/unten, +1 = rechts/oben
            Dim cornerX(1 To 4) As Integer
            Dim cornerY(1 To 4) As Integer
            cornerX(1) = -1: cornerY(1) = -1
            cornerX(2) = 1:  cornerY(2) = -1
            cornerX(3) = -1: cornerY(3) = 1
            cornerX(4) = 1:  cornerY(4) = 1

            Dim c As Integer
            For c = 1 To 4

                ' SubJob A: graues 1x1 cm Quadrat, bündig in der Ecke der Hauptform
                With .newSubJob
                    .placeOnMainRedShape = True
                    .shapeType = cdrRectangleShape
                    .setWidth 10
                    .setHeight 10
                    .setShapeColor 200, 200, 200
                    .shapeName = "Eckquadrat_" & c

                    ' Die passende Ecke des Quadrats an die passende Ecke der Hauptform ausrichten
                    .alignXTarget = cornerX(c)
                    .alignYTarget = cornerY(c)
                    .alignX = cornerX(c)
                    .alignY = cornerY(c)
                End With

                ' SubJob B: Kreis (Radius 1 cm) mit Mittelpunkt in der inneren Ecke des Quadrats,
                ' schneidet das zuvor platzierte Quadrat zu
                With .newSubJob
                    .placeOnMainRedShape = True
                    .shapeType = cdrEllipseShape
                    .setWidth 20  ' Durchmesser = 2 * Radius (1 cm)
                    .setHeight 20
                    .shapeName = "Eckkreis_" & c

                    ' Mittelpunkt (alignX/alignY = 0) auf die Ecke der Hauptform + 1 cm nach innen.
                    ' Weil das Quadrat 1 cm groß und bündig in der Ecke sitzt, ist das genau seine innere Ecke.
                    .alignXTarget = cornerX(c)
                    .alignYTarget = cornerY(c)
                    .alignX = 0
                    .alignY = 0
                    .alignXOffset = cornerX(c) * 10
                    .alignYOffset = cornerY(c) * 10

                    .setBooleanOperationWithPreviousSubJob subtractOperation ' leaveSource=False (Standard)
                End With

            Next c
        End With
    End If
    
    
    
    
    
    
    
    
    
    
    With jobList.newJob
        .name = "Edelstahl"
        With .newSubJob
            .name = "Edelstahl"

            .setMinMaxSize2 20, 2000, 20, 2000 ' 150.001

            .orderShapeAllBehind = True
            .placeOnMainRedShape = True
            .subtractSmallerShapes = True
            
            .setWidthToShapeToPlaceOn
            .setHeightProportional
            
            .isDarkGraving = True

            .setImagePath "Texturen\Edelstahl_Grundplatte.png"
            '.cutToShape = True
            .fillShape = True
        End With
        
        Set jobEdelstahl = .mee
    End With



    With jobList.newJob
        .name = "Schiefer"
        
        .placeMaximumCount = 1

        ' Herz
         With .newSubJob
            .placeOnMainRedShape = True
            
            .setImagePath "Schiefer\Kordel_Schieferherz_Grundplatte.cdr"
            .setWidthToShapeToPlaceOn
            .setHeightProportional
            .orderShapeAllBehind = True
            
            .alignXOffset = 0.503
            .alignYOffset = 0.293
            
            Set .productShapeToPlaceOn = ProductRecognizer.getProductShapeInfoFromString("KS Herz")
        End With
        
        ' Herz 10x10
         With .newSubJob
            .placeOnMainRedShape = True

            .setImagePath "Schiefer\Schieferherz_10x10_Grundplatte.cdr"
            .setWidthToShapeToPlaceOn
            .setHeightProportional
            .orderShapeAllBehind = True
            
            Set .productShapeToPlaceOn = ProductRecognizer.getProductShapeInfoFromString("Schiefer Herz 10x10")
        End With
        
        ' Herz 20x20
         With .newSubJob
            .placeOnMainRedShape = True

            .setImagePath "Schiefer\Schieferherz_22x22_Grundplatte.cdr"
            .setWidthToShapeToPlaceOn
            .setHeightProportional
            .orderShapeAllBehind = True
            .alignY = -0.016
            
            
            Set .productShapeToPlaceOn = ProductRecognizer.getProductShapeInfoFromString("Schiefer Herz 20x20")
        End With
        
        ' Herz 22x22
         With .newSubJob
            .placeOnMainRedShape = True

            .setImagePath "Schiefer\Schieferherz_22x22_Grundplatte.cdr"
            .setWidthToShapeToPlaceOn
            .setHeightProportional
            .orderShapeAllBehind = True
            .alignY = -0.016
            
            
            Set .productShapeToPlaceOn = ProductRecognizer.getProductShapeInfoFromString("Schiefer Herz 22x22")
        End With
        
        ' Herz 25x25
         With .newSubJob
            .placeOnMainRedShape = True

            .setImagePath "Schiefer\Schieferherz_22x22_Grundplatte.cdr"
            .setWidthToShapeToPlaceOn
            .setHeightProportional
            .orderShapeAllBehind = True
            .alignY = -0.016
            
            
            Set .productShapeToPlaceOn = ProductRecognizer.getProductShapeInfoFromString("Schiefer Herz 25x25")
        End With
        

        ' Herz klein
         With .newSubJob
            .placeOnMainRedShape = True

            .setImagePath "Schiefer\Kordel_Schieferherz_klein_Grundplatte.cdr"
            .setWidthToImage
            .setHeightProportional
            .alignYTarget = -0.009
            .orderShapeAllBehind = True
            
            Set .productShapeToPlaceOn = ProductRecognizer.getProductShapeInfoFromString("KS Herz 15x15")
        End With
        
        
        ' Kreisförmig
        With .newSubJob

            .placeOnMainRedShape = True
            .subPathImageIntersectWithWholeShape = True

            .setMinMaxSize2 50, 5000, 50, 5000

            .addShapeTypeToPutOnCustom EllipseAny
            .addSubPathTypeToPutOn EllipseSubPath

            .subtractSmallerShapes = True
            .setWidthToShapeToPlaceOn
            .setHeightToShapeToPlaceOn

            .setImagePath "Schiefer\Schiefer_Kreis_Grundplatte.cdr"
            .orderShapeAllBehind = True
        End With
        
        ' Viereckig
        With .newSubJob
            .placeOnMainRedShape = True
            .subPathImageIntersectWithWholeShape = True

            .addShapeTypeToPutOnCustom RectangleAny

            .addSubPathTypeToPutOn RectangleSubPath

            .subtractSmallerShapes = True

            .setWidthToShapeToPlaceOn
            .setHeightToShapeToPlaceOn

            .orderShapeAllBehind = True

            .setImagePath "Texturen\Schiefer_Grundplatte.cdr"

            With .clone
                .placeOnHorizontalShapes = False
                .imageName = replace(.imageName, "Schiefer", "Schiefer_V")
                .shapeName = replace(.shapeName, "Schiefer", "Schiefer_V")
            End With

            .placeOnVerticalShapes = False
        End With
    End With
    
    
    With jobList.newJob
        .name = "Z Schiefer"
        
        .placeMaximumCount = 1
        
        
        ' Herz
         With .newSubJob
            .placeOnMainRedShape = True

            .setImagePath "Z\Z_Schiefer_Herz_Grundplatte.cdr"
            .setWidthToShapeToPlaceOn
            .setHeightProportional
            .orderShapeAllBehind = True
            
            
            Set .productShapeToPlaceOn = ProductRecognizer.getProductShapeInfoFromString("Schiefer Herz 10x10")
            
            Set .clone().productShapeToPlaceOn = ProductRecognizer.getProductShapeInfoFromString("Schiefer Herz 20x20")
            Set .clone().productShapeToPlaceOn = ProductRecognizer.getProductShapeInfoFromString("Schiefer Herz 22x22")
            Set .clone().productShapeToPlaceOn = ProductRecognizer.getProductShapeInfoFromString("Schiefer Herz 25x25")
        End With
        
        ' Viereckig
        With .newSubJob
            .placeOnMainRedShape = True
            .subPathImageIntersectWithWholeShape = True

            .addShapeTypeToPutOnCustom RectangleAny

            .addSubPathTypeToPutOn RectangleSubPath

            .subtractSmallerShapes = True

            .setWidthToShapeToPlaceOn
            .setHeightToShapeToPlaceOn

            .orderShapeAllBehind = True

            .setImagePath "Z\Z_Schiefer_Grundplatte.cdr"

            With .clone
                .placeOnHorizontalShapes = False
                .imageName = replace(.imageName, "Schiefer", "Schiefer_V")
                .shapeName = replace(.shapeName, "Schiefer", "Schiefer_V")
            End With

            .placeOnVerticalShapes = False
        End With
        
    End With
    
    
    With jobList.newJob
        .name = "Z Schiefer geschnitten"
        With .newSubJob
            .addShapeTypeToPutOn (cdrCurveShape)
            .addShapeTypeToPutOn (cdrRectangleShape)
            .setMinMaxSize 1001, 1001, 1000
            
            .setWidthToShapeToPlaceOn
            .setHeightToShapeToPlaceOn
            
            .setImagePath "Z\Z_Schiefer_geschnitten_Grundplatte.png"
            
            .orderShapeAllBehind = True
            .placeOnMainRedShape = True
            .subtractSmallerShapes = True
            .cutToShape = True
        End With
    End With
    
    
    With jobList.newJob
        .name = "Schiefer geschnitten"
        With .newSubJob
            .addShapeTypeToPutOn (cdrCurveShape)
            .addShapeTypeToPutOn (cdrRectangleShape)
            .setMinMaxSize 1001, 1001, 1000

            .setWidth 169.333 ' Echte Breite / 2 in mm
            .setHeightProportional
            
            .setImagePath "Texturen\Schiefer_geschnitten_Grundplatte.png"
            
            .fillShape = True
            
            .orderShapeAllBehind = True
            .placeOnMainRedShape = True
            .subtractSmallerShapes = True
        End With
    End With
    
    
    With jobList.newJob
    
        .name = "Schiefer geschnitten rau"
        With .newSubJob
            .addShapeTypeToPutOn (cdrCurveShape)
            .addShapeTypeToPutOn (cdrRectangleShape)
            .setMinMaxSize 1001, 1001, 1000
            
            .setWidthToShapeToPlaceOn
            .setHeightToShapeToPlaceOn
            
            .setImagePath "Texturen\Schiefer_geschnitten_rau_Grundplatte.png"
            .shapeName = "Schiefer_geschnitten_rau_Grundplatte"
            
            .fillShape = True
            
            .orderShapeAllBehind = True
            .placeOnMainRedShape = True
            .subtractSmallerShapes = True
            
            With .clone
                .placeOnHorizontalShapes = False
                .imageName = replace(.imageName, "Schiefer", "Schiefer_V")
            End With

            .placeOnVerticalShapes = False
        End With
        
        Set jobSlateClearCut = .mee
    End With


    ' Premiumschiefer
    ' ////////////////////////////////////
    
    
    With jobList.newJob
        .name = "Premiumschiefer"
        With .newSubJob
            .addShapeTypeToPutOn (cdrCurveShape)
            .addShapeTypeToPutOn (cdrRectangleShape)
            
            .cutToShape = True
            
            .setMinMaxSize 1001, 1001, 1000

            .setWidthToShapeToPlaceOn
            .setHeightToShapeToPlaceOn

            .orderShapeAllBehind = True

            .setImagePath "Texturen\PremiumSchiefer_Grundplatte.png"
        End With
        
        .setLookJob jobPremiumSlateLook
        
        Set jobPremiumSlate = .mee
    End With

    With jobList.newJob
        .name = "Premiumschiefer Look"

         With .newSubJob
            .placeOnMainRedShape = True
            .orderShapeAllBehind = False
            
            .setWidthToShapeToPlaceOn
            .setHeightToShapeToPlaceOn

            .imageFolder = "/Premiumschiefer/Look/"
            .imageType = ".png"

            .imageName = "_Premiumschiefer_Look"

            For i = 1 To UBound(ProductRecognizer.productShapesInfo)
                With .clone
                    .imageName = ProductRecognizer.productShapesInfo(i).name & .imageName
                    '.setMinMaxSize ProductRecognizer.productShapesInfo(i).width, ProductRecognizer.productShapesInfo(i).height, , ProductRecognizer.productShapesInfo(i).area, 1
                    .setMinMaxSizeByProductShapeInfo ProductRecognizer.productShapesInfo(i)
                End With
            Next i

            .delete ' Weil dies nur eine Vorlage ist. Die echten werden in der For-Loop erstellt
        End With
        
        Set jobPremiumSlateLook = .mee
    End With






    ' GRANIT
    ' ///////////////////////////////////////


    With jobList.newJob
        .name = "Granit"
        With .newSubJob
            .addShapeTypeToPutOn (cdrCurveShape)
            .addShapeTypeToPutOn (cdrRectangleShape)
            
            .setMinMaxSize2 70, 10000, 70, 10000
            
            .setWidth 150 ' mm
            .setHeightProportional
            
            .fillShape = True
            .setImagePath "Texturen\Granit_Grundplatte.jpg"
            .orderShapeAllBehind = True
            .placeOnMainRedShape = True
            .subtractSmallerShapes = True
        End With
        
        .setLookJob jobGraniteLook
    End With
    
    With jobList.newJob
        .name = "Granit Look"

         With .newSubJob
            .placeOnMainRedShape = True
            .orderShapeAllBehind = False
            
            .setWidthToShapeToPlaceOn
            .setHeightToShapeToPlaceOn

            .imageFolder = "/Granit/Look/"
            .imageType = ".png"

            .imageName = "_Granit_Look"

            For i = 1 To UBound(ProductRecognizer.productShapesInfo)
                With .clone
                    .imageName = ProductRecognizer.productShapesInfo(i).name & .imageName
                    '.setMinMaxSize ProductRecognizer.productShapesInfo(i).width, ProductRecognizer.productShapesInfo(i).height, , ProductRecognizer.productShapesInfo(i).area, 1
                    .setMinMaxSizeByProductShapeInfo ProductRecognizer.productShapesInfo(i)
                End With
            Next i

            .delete ' Weil dies nur eine Vorlage ist. Die echten werden in der For-Loop erstellt
        End With
        
        Set jobGraniteLook = .mee
    End With
    
    
    
    With jobList.newJob
        .name = "Marmor Weiß"

         With .newSubJob
            .placeOnMainRedShape = True
            .orderShapeAllBehind = True
            
            .setWidth 200
            .setHeightProportional
            
            .fillShape = True
            .subtractSmallerShapes = True
            
            .imageFolder = "/Marmor weiß/"
            .imageName = "Marmor_Grundplatte"
            .imageType = ".png"
            .shapeName = "Marmor_Grundplatte"
        End With
    End With
    



    With jobList.newJob
        .name = "Marmor Bianco Carrara"

         With .newSubJob
            .placeOnMainRedShape = True
            .orderShapeAllBehind = True
            
            .setWidthToShapeToPlaceOn
            .setHeightToShapeToPlaceOn

            .imageFolder = "/Marmor Bianco Carrara/"
            .imageType = ".png"

            .imageName = "_Grundplatte"

            For i = 1 To UBound(ProductRecognizer.productShapesInfo)
                With .clone
                    .imageName = ProductRecognizer.productShapesInfo(i).name & .imageName
                    '.setMinMaxSize ProductRecognizer.productShapesInfo(i).width, ProductRecognizer.productShapesInfo(i).height, , ProductRecognizer.productShapesInfo(i).area, 1
                    .setMinMaxSizeByProductShapeInfo ProductRecognizer.productShapesInfo(i)
                End With
            Next i

            .delete ' Weil dies nur eine Vorlage ist. Die echten werden in der For-Loop erstellt
        End With
    End With



    ' LEINWAND
    '///////////////////////////////////////////////////////////////////////////
    
    
    With jobList.newJob
        .name = "Leinwand"
        With .newSubJob
            .placeOnMainRedShape = True
            '.subtractSmallerShapes = True
            .orderShapeAllBehind = True
            .shapeName = "Leinwand_Grundplatte"
            .setShapeColor 255, 255, 255
            .roundCornersInMM = 3
        End With
        
        .setLookJob jobCanvasLook
    End With
    
    
    With jobList.newJob
        .name = "Leinwand Look"

         With .newSubJob
            .placeOnMainRedShape = True
            .orderShapeAllBehind = False
            
            .imageType = ".png"
            .imageFolder = "/Leinwand/"
            .imageName = "Leinwand_Look"
            .roundCornersInMM = 3
            .setWidth 375
            .setHeightProportional
            .cutToShape = True
            .subtractSmallerShapes = True
            
        End With
        
        Set jobCanvasLook = .mee
    End With
    



    With jobList.newJob
        .name = "Alu-Dibond"
        With .newSubJob
            .placeOnMainRedShape = True
            .subtractSmallerShapes = True
            .orderShapeAllBehind = True
            .shapeName = "Alu-Dibond_Grundplatte"
            .setShapeColor 255, 255, 255
        End With
    End With




    ' ACRYL
    '///////////////////////////////////////////////////////////////////////////
    
    
    ' ACRYL LOOK
    Dim jobAcrylLook As PlaceFileJob
    
    With jobList.newJob(False)
    
        Set jobAcrylLook = .mee
        .name = "Acryl Look (nicht nutzen)"
        
        .placeMaximumCount = 1
        
         With .newSubJob
            .placeOnMainRedShape = True
            .orderShapeAllBehind = False

            .imageFolder = "/Acryl/Look/"
            .imageType = ".png"

            .imageName = "_Acryl_Look"
            

            For i = 1 To UBound(ProductRecognizer.productShapesInfo)
                
                With .clone
                    .imageName = ProductRecognizer.productShapesInfo(i).name & .imageName
                    .name = ProductRecognizer.productShapesInfo(i).name
                    Set .productShapeToPlaceOn = ProductRecognizer.productShapesInfo(i)
                End With
                
            Next i

            .delete ' Weil dies nur eine Vorlage ist. Die echten werden in der For-Loop erstellt
        End With
        
        
        ' ACRYL LOOK SATINIERT
        With .clone
            .name = "Acryl Look satiniert (nicht nutzen)"
            
            .groundPlateInvalidationNeededAfterPlacing = True
            
            .replImageFolder "/Acryl/Look/", "/Acryl/Look/Satiniert/"
            
            .placeMaximumCount = 2
            
            Dim subJobLenght As Integer
            subJobLenght = .subJobs.count
            For i = 1 To subJobLenght
                
                .getSubJob(i).imageName = "Satiniert_" & .getSubJob(i).imageName
                
                With .getSubJob(i).clone(True)
                    .orderShapeAllBehind = True
                    
                    .imageName = replace(.imageName, "Satiniert_", "Satiniert_BG_")
                    .merge = True
                    .mergeWithShapeWithName = ">Acryl_Satiniert_Grundplatte"
                End With
            Next i
            
            Set jobAcrylSatinLook = .mee
        End With
    End With
    
    Set jobsAcrylSchwarzUndAnthrazit = New collection
    Set jobsAcrylAlleFarben = New collection

    With jobList.newJob
        .name = "Acryl Schwarz"
        
        .setLookJob jobAcrylLook
        
        .variantNameBeautiful = replace(.name, "Acryl", "Acrylglas")
        .getOrCreateVariante.confiThumbnailFileName = "Grundplatte\Acrylglas Schwarz"
        .getOrCreateVariante.confiThumbnailFileTypeForFancy = cdrJPEG
        
        With .newSubJob
            .setGroundPlateMaterialName "Acryl"
            .placeOnMainRedShape = True
            .subtractSmallerShapes = True
            .orderShapeAllBehind = True
            .shapeName = "Acryl_Schwarz_Grundplatte"
            .setShapeColor 13, 13, 13
        End With
        jobsAcrylSchwarzUndAnthrazit.add .mee()
        jobsAcrylAlleFarben.add .mee()
        
        Set jobAcrylSchwarz = .mee

        With .clone
           .name = "Acryl Anthrazit"
           
           .variantNameBeautiful = replace(.name, "Acryl", "Acrylglas")
           .getOrCreateVariante.confiThumbnailFileName = "Grundplatte\Acrylglas Anthrazit"
           
           With .getSubJob(1)
                .shapeName = "Acryl_Anthrazit_Grundplatte"
                .setShapeColor 43, 47, 50
           End With
           
           jobsAcrylSchwarzUndAnthrazit.add .mee()
           jobsAcrylAlleFarben.add .mee()
        End With

        With .clone
           .name = "Acryl Grau"
           
           .variantNameBeautiful = replace(.name, "Acryl", "Acrylglas")
           .removeVariante ' TODO Workaround, da es sonst weiterhin die Variante vom schwarzen Acryl wäre
           .getOrCreateVariante.confiThumbnailFileName = "" ' reset, da dies ein Klon ist
           
           With .getSubJob(1)
                .shapeName = "Acryl_Grau_Grundplatte"
                .setShapeColor 141, 145, 146
           End With
           jobsAcrylAlleFarben.add .mee()
        End With

        With .clone
           .name = "Acryl Weiß"
           
           .variantNameBeautiful = replace(.name, "Acryl", "Acrylglas")
           
           With .getSubJob(1)
                .shapeName = "Acryl_Weiß_Grundplatte"
                .setShapeColor 242, 242, 242
           End With
        End With

        With .clone
           .name = "Acryl Rosa"
           
           .variantNameBeautiful = replace(.name, "Acryl", "Acrylglas")
           
           With .getSubJob(1)
                .shapeName = "Acryl_Rosa_Grundplatte"
                .setShapeColor 227, 160, 172
           End With
           jobsAcrylAlleFarben.add .mee()
        End With

        With .clone
           .name = "Acryl Rot"
           
           .variantNameBeautiful = replace(.name, "Acryl", "Acrylglas")
           
           With .getSubJob(1)
                .shapeName = "Acryl_Rot_Grundplatte"
                .setShapeColor 153, 20, 36
           End With
           jobsAcrylAlleFarben.add .mee()
        End With

        With .clone
           .name = "Acryl Blau"
           
           .variantNameBeautiful = replace(.name, "Acryl", "Acrylglas")
           
           With .getSubJob(1)
                .shapeName = "Acryl_Blau_Grundplatte"
                .setShapeColor 99, 145, 176
           End With
           jobsAcrylAlleFarben.add .mee()
        End With

        With .clone
           .name = "Acryl Beige"
           
           .variantNameBeautiful = replace(.name, "Acryl", "Acrylglas")
           
           With .getSubJob(1)
                .shapeName = "Acryl_Beige_Grundplatte"
                .setShapeColor 229, 223, 204
           End With
           jobsAcrylAlleFarben.add .mee()
        End With

        With .clone
           .name = "Acryl Klar"
           
           .variantNameBeautiful = replace(.name, "Acryl", "Acrylglas")
           
           With .getSubJob(1)
                .name = "Acryl Klar SubJob"
                .shapeName = "Acryl_Klar_Grundplatte"
                .setShapeColor 191, 191, 191
                .transparency = 60
           End With
        End With
        Set jobAcrylKlar = jobList.jobs.item(jobList.jobs.count)

        With .clone
           .name = "Acryl Satiniert"
           
           .variantNameBeautiful = replace(.name, "Acryl", "Acrylglas")
           
           .setLookJob jobAcrylSatinLook
           
           With .getSubJob(1)
                .name = "Acryl Satiniert SubJob"
                .shapeName = "Acryl_Satiniert_Grundplatte"
                .setShapeColor 191, 191, 191
                .transparency = 60
           End With
           
            Set jobAcrylSatiniert = .mee
        End With
        
        
        With .clone
            .name = "Acryl Satiniert Schwarz"
            
            .variantNameBeautiful = replace(.name, "Acryl", "Acrylglas")
            
            .setLookJob Nothing
            
            With .getSubJob(1)
                .name = "Acryl satiniert schwarz für gravur"
                .shapeName = "Acryl_Satiniert_Schwarz_Grundplatte"
                .setShapeColor 22, 22, 22
                
                .placeOnPrintLayers = False
                
                With .clone
                    .name = "Acryl satiniert schwarz für UV"
                    .placeOnGravingLayers = False
                    .placeOnPrintLayers = True
                    
                    .setPlaceOnMainRedShapeBleed
                    .isForPrint = True
                    .amazonImportGroundPlateNameInConfi = "Schwarz satiniertes Acryl"
                End With
            End With
            
            Set jobAcrylSchwarzSatiniert = .mee
            
        End With

    End With
    
    
    With jobList.newJob
        .name = "Acryl alle Farben"
        
        For i = 1 To jobsAcrylAlleFarben.count
            .cloneAndAddSubJobsFrom jobsAcrylAlleFarben(i), True
        Next i
        
    End With
    
    
    jobAcrylLook.setParentJobListAndAdd jobList
    jobAcrylSatinLook.setParentJobListAndAdd jobList
    





    ' HOLZ
    '///////////////////////////////////////////////////////////////////////////

    
    With jobList.newJob
        .name = "Holz Look"
        With .newSubJob
            .placeOnMainRedShape = True
            .orderShapeAllBehind = False
            
            .cutToShape = True
            .subtractSmallerShapes = True
            
            .setWidth 600
            .setHeightProportional
            
            .imageFolder = "/Holz/"
            .imageType = ".png"

            .imageName = "Holz_Look"
            
        End With
        Set jobHolzLook = .mee()
    End With
    
    
    
    With jobList.newJob
        .name = "Buchenholz"
        
        .setLookJob jobHolzLook
        .placeMaximumCount = 1
        
        With .newSubJob
            .name = "Buchenholz Grundplatte gravur (bis 169x112mm)"
            .addShapeTypeToPutOn (cdrCurveShape)
            .addShapeTypeToPutOn (cdrRectangleShape)
            
            .setWidthToImage
            .setHeightToImage
            
            .placeOnPrintLayers = False
            
            .setMinMaxSize2 0, 169, 0, 112

            .setImagePath "Texturen\Buchenholz_Grundplatte.png"
            
            .shapeName = "Buchenholz_Grundplatte"
            .orderShapeAllBehind = True
            .cutToShape = True
            .subtractSmallerShapes = True
            
            .isDarkGraving = True
            
            ' Für größere Größen wird die Textur skaliert um die Größe abzudecken
            With .clone
                .name = "Buchenholz Grundplatte gravur (ab 169x112mm)"
                .setMinMaxSize2 0, 10000, 0, 10000
                .setWidthFillProportional
               .setHeigthFillProportional
            End With
            
            With .clone
                .name = "Buchenholz Grundplatte UV (bis 169x112mm)"
                .placeOnPrintLayers = True
                .placeOnGravingLayers = False
                
                .isForPrint = False
                
                .setPlaceOnMainRedShapeBleed
                
                With .clone
                    .name = "Buchenholz Grundplatte UV (ab 169x112mm)"
                    .setMinMaxSize2 0, 10000, 0, 10000
                    .setWidthFillProportional
                    .setHeigthFillProportional
                End With
                
            End With
            
        End With
    End With
    Set jobBuchenholz = jobList.jobs.item(jobList.jobs.count)
    
    
    
    With jobList.newJob
        
        .name = "Pappelholz"
        
        .setLookJob jobHolzLook
        .placeMaximumCount = 1
        
        With .newSubJob
            .name = "Pappelholz Grundplatte (bis 169x112mm)"
            .addShapeTypeToPutOn (cdrCurveShape)
            .addShapeTypeToPutOn (cdrRectangleShape)
            
            .setWidthToImage
            .setHeightToImage
            
            .setMinMaxSize2 0, 169, 0, 112

            .setImagePath "Texturen\Pappelholz_Grundplatte.png"
            
            .shapeName = "Pappelholz_Grundplatte"
            .orderShapeAllBehind = True
            .cutToShape = True
            .subtractSmallerShapes = True
            
            .isDarkGraving = True
            
            ' Für größere Größen wird die Textur skaliert um die Größe abzudecken
            With .clone
                .name = "Pappelholz Grundplatte (ab 169x112mm)"
                .setMinMaxSize2 0, 10000, 0, 10000
                .setWidthFillProportional
               .setHeigthFillProportional
            End With
            
        End With
        
        Set jobPappelholz = .mee
    End With
    

    
    
    Set jobsNussUndKirsch = New collection
    With jobList.newJob
        .name = "Nussholz"
        .placeMaximumCount = 1
        
        With .newSubJob
            .name = "Nussholz horizontal bis 100mm"
            .setMinMaxSize2 0, 100, 0, 100
            
            .setWidth 100
            .setHeightProportional
            
            '.fillShape = True
            .setImagePath "Texturen\Nussholz_Grundplatte Neu.jpg"
            .shapeName = "Nussholz_Grundplatte"
            .orderShapeAllBehind = True
            .placeOnMainRedShape = True
            .subtractSmallerShapes = True
            .cutToShape = True
            
            .placeOnVerticalShapes = False
            .placeOnHorizontalShapes = True
            
            .isDarkGraving = True
            
            ' Horizontal über 100 mm
            With .clone
                .name = "Nussholz horizontal"
                .setMinMaxSize2 0, 10000, 0, 100000
                .setWidthToShapeToPlaceOn
                .setHeightProportional
            End With


            ' Vertikal über 100mm
            With .clone
                .name = "Nussholz vertikal bis 100mm"
                .placeOnVerticalShapes = True
                .placeOnHorizontalShapes = False
                .imageName = "Nussholz_Grundplatte Neu vertikal"

                ' Vertikal über 100mm
                With .clone
                    .name = "Nussholz vertikal"
                    .setMinMaxSize2 0, 10000, 0, 100000
                    .setHeightToShapeToPlaceOn
                    .setWidthProportional
                End With

            End With

        End With
        
        jobsNussUndKirsch.add .mee
        
        With .clone
            .name = "Kirschholz"

            With .getSubJob(1)
                .imageName = "Kirschholz_Grundplatte_Neu"
                .shapeName = "Kirschholz_Grundplatte"
                .productIDSuffix = "KI"
            End With

             With .getSubJob(2)
                .imageName = "Kirschholz_Grundplatte_Neu"
                .shapeName = "Kirschholz_Grundplatte"
                .productIDSuffix = "KI"
             End With

            With .getSubJob(3)
                .imageName = "Kirschholz_Grundplatte_Neu vertikal"
                .shapeName = "Kirschholz_Grundplatte"
                .productIDSuffix = "KI"
             End With

             With .getSubJob(4)
                .imageName = "Kirschholz_Grundplatte_Neu vertikal"
                .shapeName = "Kirschholz_Grundplatte"
                .productIDSuffix = "KI"
             End With

            jobsNussUndKirsch.add .mee
        End With
        
    End With
    
    
    
    With jobList.newJob
        .name = "Bambusholz"
        
        With .newSubJob
            .setImagePath "Texturen\Bambus Textur.png"
            .shapeName = "Bambusholz_Grundplatte"
            
            .orderShapeAllBehind = True
            
            .setWidth 170
            .setHeightProportional
            
            .isDarkGraving = True
            
            .fillShape = True
            
        End With
        
    End With
    
    
    With jobList.newJob
        .name = "Holzlineal"
        
        .placeMaximumCount = 1
        
        With .newSubJob
            .placeOnMainRedShape = True
            .orderShapeAllBehind = True
            .subtractSmallerShapes = True
            .cutToShape = True
            .setWidthToShapeToPlaceOn
            .setHeightToShapeToPlaceOn
            
            .setImagePath "/Holz/Holz_Lineal_Grundplatte.png"
            .shapeName = "Holz_Lineal_Grundplatte"
            
            .setWidthToShapeToPlaceOn
            .setHeightToShapeToPlaceOn
            
            .isDarkGraving = True
            
            .setMinMaxSize2 0, 200, 0, 10000
            
            With .clone
                
                .setMinMaxSize2 0, 10000, 0, 10000
                .setImagePath "/Holz/Holz_Lineal_30cm_Grundplatte.png"
                .shapeName = "Holz_Lineal_30cm_Grundplatte"
                
            End With
            
        End With
    End With
    
    
    With jobList.newJob
        .name = "Holzkreuz"
        With .newSubJob
            .placeOnMainRedShape = True
            .orderShapeAllBehind = True
            .subtractSmallerShapes = False
            .subtractMainShape = False
            .fillShape = False
            
            .setImagePath "/Holz/Holz_Kreuz_Grundplatte.png"
            .shapeName = "Holz_Kreuz_Grundplatte"
            
            .setWidthToShapeToPlaceOn
            .setHeightToShapeToPlaceOn
            
            .isDarkGraving = True
            
        End With
    End With
    
    
    With jobList.newJob
        .name = "Stiftebox"
        With .newSubJob
            .placeOnMainRedShape = True
            .orderShapeAllBehind = True
            .subtractSmallerShapes = False
            .subtractMainShape = False
            .fillShape = False
            
            .addShapeTypeToPutOnCustom RectangleAny
            
'            .setMinMaxSize 9.7, 10, 1
            
            .setImagePath "/Holz/Stiftebox_Grundplatte.png"
            .shapeName = "Stiftebox_Grundplatte"
            
            .setWidthToShapeToPlaceOn
            .setHeightToShapeToPlaceOn
            
            .isDarkGraving = True
            
        End With
    End With
    
    
    With jobList.newJob
        .name = "Erinnerungskiste"
        With .newSubJob
            .placeOnMainRedShape = True
            .orderShapeAllBehind = True
            .subtractSmallerShapes = False
            .subtractMainShape = False
            .fillShape = False
            
            .addShapeTypeToPutOnCustom allShapes
            
            .setImagePath "/Holz/Erinnerungskiste_Grundplatte.png"
            .shapeName = "Erinnerungskiste_Grundplatte"
            
            .setWidthToShapeToPlaceOn
            .setHeightToShapeToPlaceOn
            
            .isDarkGraving = True
            
        End With
    End With
    


    ' LEDER
    '///////////////////////////////////////////////////////////////////////////


    With jobList.newJob
        .name = "Leder Cognac"
        With .newSubJob
            .setMinMaxSize2 30, 10000, 30, 10000


            .setImagePath "Texturen\Leder_Cognac_Grundplatte.png"
            
            .isDarkGraving = True

            .fillShape = True
            .orderShapeAllBehind = True
            .placeOnMainRedShape = True
            .subtractSmallerShapes = True
        End With
    End With
    
    
    With jobList.newJob
    ' Lederband mit Halterung und Eisenring
        .name = "Lederband mit Halterung und Eisenring Grundplatte"
        With .newSubJob
            .addShapeTypeToPutOn (cdrRectangleShape)
            .addShapeTypeToPutOn (cdrCurveShape)
            
            .setImagePath "Anhänger\Lederband mit Halterung und Eisenring\Lederband_mit_Halterung_und_Eisenring_Grundplatte.png"
            
            .shapeName = "Lederband_mit_Halterung_und_Eisenring_Grundplatte"

            .setMinMaxSize 50, 20, 0.1
            
            .alignXTarget = 0.9
            .alignYTarget = -0.02
            
            
            '.widthToPutOnFoundShapesMax = 250
            '.heightToPutOnFoundShapesMax = 10000
            
            .setWidth (126.577)
            .setHeightProportional
            
            .orderShapeAllBehind = True

        End With
    End With

    
    
    ' RADIERGUMMIES
    ' ////////////////////////////////////////////////////////////////////////
    
    With jobList.newJob
        .name = "Radiergummi"
        With .newSubJob
            .name = "Radiergummi Rechteckig 5,3 x 2,6"
            
            .placeOnMainRedShape = True
            .orderShapeAllBehind = True
            .subtractSmallerShapes = False
            .subtractMainShape = False
            .fillShape = False
            
            .addShapeTypeToPutOnCustom RectangleAny
            
            .setImagePath "/Radiergummi/Radiergummi_Rechteckig_Grundplatte.png"
            .shapeName = "Radiergummi_Rechteckig_Grundplatte"
            
            .setWidthToShapeToPlaceOn
            .setHeightToShapeToPlaceOn
        End With
        
        With .newSubJob
            .name = "Radiergummi Rund 3,5"
            
            .placeOnMainRedShape = True
            .orderShapeAllBehind = True
            .subtractSmallerShapes = False
            .subtractMainShape = False
            .fillShape = False
            
            .addShapeTypeToPutOnCustom EllipseAny
            
            .setImagePath "/Radiergummi/Radiergummi_Rund_Grundplatte.png"
            .shapeName = "Radiergummi_Rund_Grundplatte"
            
            .setWidthToShapeToPlaceOn
            .setHeightToShapeToPlaceOn
        End With
    End With
    
    
    
    ' FLACHMÄNNER
    ' ////////////////////////////////////////////////////////////////////////
    
    With jobList.newJob
        .name = "Flachmann Edelstahl"
        
        With .newSubJob
            .placeOnMainRedShape = True
            .orderShapeAllBehind = True
            
            .setMinMaxSize 60, 65
            .setImagePath "Flachmänner\Flachmann 9.5x8.5_Grundplatte.png"
            .setWidth 95.565
            .setHeightProportional
            .alignYOffset = -7.441
            
            .isDarkGraving = True
            
            .maskType = 1 ' Nicht 0
        End With
        
       
        
        With .newSubJob
            .placeOnMainRedShape = True
            .orderShapeAllBehind = True
            
            .setMinMaxSize 80, 85.714
            .setImagePath "Flachmänner\Flachmann 9.5x12_Grundplatte.png"
            .setWidth 93.905
            .setHeightProportional
            .alignYOffset = -8.069
            
            .isDarkGraving = True
            
            .maskType = 1 ' Nicht 0
        End With
    End With
    
    With jobList.newJob
        .name = "Flachmann Edelstahl mit Holz"
        
         With .newSubJob
            .placeOnMainRedShape = True
            .orderShapeAllBehind = True
            
            .setMinMaxSize 80, 85.714
            .setImagePath "Flachmänner\Flachmann 9.5x10.5_Grundplatte.png"
            .setWidth 100.504
            .setHeightProportional
            .alignYOffset = -10.23
            
            .isDarkGraving = True
            
            .maskType = 1 ' Nicht 0
        End With
    End With
    
    
    
    ' BIERHAMMER
    ' ////////////////////////////////////////////////////////////////////////
    
    With jobList.newJob
        .name = "Bierhammer"
        
         With .newSubJob
            .placeOnMainRedShape = True
            .orderShapeAllBehind = True
            
            .setMinMaxSize 15, 15
            .setImagePath "Bierhammer\Bierhammer_Grundplatte.png"
            .setWidth 32
            .setHeightProportional

            .isDarkGraving = True
            
            .maskType = 1 ' Nicht 0
        End With
    End With
    
    
    
    
    ' KUNSTSTOFF
    ' ///////////////////////////////////////////////////////////////////////////
    
    Dim allPlasticJobs As New collection
    Set jobsKunststoffGravurSchwarz = New collection
    Set jobsKunststoffGravurWeiss = New collection
    
    With jobList.newJob
        .name = "Kunststoff Rot (Weiß)"
        With .newSubJob
            .placeOnMainRedShape = True
            .subtractSmallerShapes = True
            .orderShapeAllBehind = True
            
            .setShapeColor 179, 1, 17
            .shapeName = "Kunststoff_Rot_Grundplatte"
        End With
        
        allPlasticJobs.add .mee
        jobsKunststoffGravurWeiss.add .mee
        
        With .clone
            .name = "Kunststoff Blau (Weiß)"
            With .getSubJob(1)
                .setShapeColor 9, 66, 95
                .shapeName = "Kunststoff_Blau_Grundplatte"
            End With
            allPlasticJobs.add .mee
            jobsKunststoffGravurWeiss.add .mee
        End With
        
        With .clone
            .name = "Kunststoff Grün (Weiß)"
            With .getSubJob(1)
                .setShapeColor 6, 120, 48
                .shapeName = "Kunststoff_Grün_Grundplatte"
            End With
            allPlasticJobs.add .mee
            jobsKunststoffGravurWeiss.add .mee
        End With
        
        With .clone
            .name = "Kunststoff Schwarz (Weiß)"
            With .getSubJob(1)
                .setShapeColor 8, 8, 8
                .shapeName = "Kunststoff_Schwarz_Grundplatte"
            End With
            allPlasticJobs.add .mee
            jobsKunststoffGravurWeiss.add .mee
        End With
        
        With .clone
            .name = "Kunststoff Grau (Weiß)"
            With .getSubJob(1)
                .setShapeColor 46, 47, 48
                .shapeName = "Kunststoff_Grau_Grundplatte"
            End With
            allPlasticJobs.add .mee
            jobsKunststoffGravurWeiss.add .mee
        End With
        
        With .clone
            .name = "Kunststoff Weiß (Schwarz)"
            With .getSubJob(1)
                .setShapeColor 226, 226, 226
                .shapeName = "Kunststoff_Weiß_Grundplatte"
                .isDarkGraving = True
            End With
            allPlasticJobs.add .mee
            jobsKunststoffGravurSchwarz.add .mee
        End With
        
        With .clone
            .name = "Kunststoff Pink (Weiß)"
            With .getSubJob(1)
                .setShapeColor 211, 73, 139
                .shapeName = "Kunststoff_Pink_Grundplatte"
            End With
            allPlasticJobs.add .mee
            jobsKunststoffGravurWeiss.add .mee
        End With
    End With
    
    With jobList.newJob
            .name = "Kunststoff Silber (Schwarz)"
            
            With .newSubJob
                .fillShape = True
                .orderShapeAllBehind = True
                .placeOnMainRedShape = True
                .subtractSmallerShapes = True
                
                .setWidth 190.5
                .setHeightProportional
                .isDarkGraving = True
                
                .setImagePath "Kunststoff\Kunststoff_Silber_Grundplatte.jpg"
            End With
            
            allPlasticJobs.add .mee
            jobsKunststoffGravurSchwarz.add .mee
            
            With .clone
                .name = "Kunststoff Gold (Schwarz)"
                
                With .getSubJob(1)
                    .setImagePath "Kunststoff\Kunststoff_Gold_Grundplatte.jpg"
                End With
                allPlasticJobs.add .mee
                jobsKunststoffGravurSchwarz.add .mee
            End With
            
            With .clone
                .name = "Kunststoff Rose (Schwarz)"
                
                With .getSubJob(1)
                    .setImagePath "Kunststoff\Kunststoff_Rose_Grundplatte.jpg"
                    .setGroundPlateTextureColorForText CreateColor("#b48571")
                End With
                allPlasticJobs.add .mee
                jobsKunststoffGravurSchwarz.add .mee
            End With
            
    End With
    
    With jobList.newJob
        .name = "Kunststoff Holz (Weiß)"
        
        With .newSubJob
            .fillShape = True
            .orderShapeAllBehind = True
            .placeOnMainRedShape = True
            .subtractSmallerShapes = True
            
            .setWidth 254
            .setHeightProportional
            
            .setImagePath "Kunststoff\Kunststoff_Holz_Grundplatte.jpg"
        End With
        allPlasticJobs.add .mee
        jobsKunststoffGravurWeiss.add .mee
    End With
    
    
    
    With jobList.newJob
        .name = "Kunststoff Alle"
        For i = 1 To allPlasticJobs.count
            .cloneAndAddSubJobsFrom allPlasticJobs(i)
        Next i
    End With
    
    
    
    
    ' ROTE FORMEN
    ' //////////////////////////////////////////////////////////////////////////

    
    With jobList.newJob
        .name = "Abstandshalter Löcher 2x 1cm"
        .setPutAboveMainMask
        
        With .newSubJob
            .shapeName = "AH Loch 1cm"
            .exportable = False
            .shapeType = cdrEllipseShape
            .placeOnMainRedShape = True
            .alignXOffset = 10
            .alignXTarget = 1
            .setWidth 8
            .setHeight 8
            .productIDSuffix = "-2AH"
            
            .cutDesign = True
            
            .setShapeColorIsAutoRedOrPink True
            
            With .clone
                .alignXTarget = -1
                .alignXOffset = -10
            End With

        End With
        Set job2Abstandshalter1cm = .mee
        
        
        With .clone
            .name = "Abstandshalter Löcher 2x 1,5cm"
            
            For i = 1 To .subJobs.count
                With .getSubJob(i)
                    .shapeName = "AH Loch 1,5cm"
                    .setAlignOffsetScale 15 ' mm
                End With
            Next i
            
            Set job2Abstandshalter1_5cm = .mee
        End With
        
            
        With .clone
            .name = "Abstandshalter Löcher 2x 2cm"
            
            For i = 1 To .subJobs.count
                With .getSubJob(i)
                    .shapeName = "AH Loch 2cm"
                    .setAlignOffsetScale 20 ' mm
                End With
            Next i
            
            Set job2Abstandshalter = .mee
        End With
        
        
        
    End With
    
    
    
    With jobList.newJob
        .name = "Abstandshalter Löcher 4x 1cm"
        .setPutAboveMainMask
        With .newSubJob
            .productIDSuffix = "-4AH"
            
            .shapeName = "AH Loch 1cm"
            .exportable = False
            .shapeType = cdrEllipseShape
            .placeOnMainRedShape = True
            .alignXOffset = 10
            .alignYOffset = 10
            .alignXTarget = 1
            .alignYTarget = 1
            .setWidth 8
            .setHeight 8
            
            .cutDesign = True
            
            .setShapeColorIsAutoRedOrPink True

            With .clone
                .alignXTarget = -1
                .alignXOffset = -.alignXOffset

                With .clone
                    .alignYTarget = -1
                    .alignXTarget = 1
                    
                    .alignXOffset = -.alignXOffset
                    .alignYOffset = -.alignYOffset

                    With .clone
                        .alignXTarget = -1
                        .alignXOffset = -.alignXOffset
                    End With
                End With
            End With
        End With
        Set job4Abstandshalter1cm = .mee
        
        
        
        With .clone
            .name = "Abstandshalter Löcher 4x 1,5cm"
            
            For i = 1 To .subJobs.count
                With .getSubJob(i)
                    .shapeName = "AH Loch 1,5cm"
                    .setAlignOffsetScale 15 ' mm
                End With
            Next i
            
            Set job4Abstandshalter1_5cm = .mee
        End With
        
        
        
        With .clone
            .name = "Abstandshalter Löcher 4x 2cm"
            
            For i = 1 To .subJobs.count
                With .getSubJob(i)
                    .shapeName = "AH Loch 2cm"
                    .setAlignOffsetScale 20 ' mm
                End With
            Next i
            
            Set job4Abstandshalter = .mee
            
        End With
    End With
    
    
        
    With jobList.newJob
        .name = "Abstandshalter PNG"
        .setPutAboveMainMask
        
        With .newSubJob
            .addShapeTypeToPutOn (cdrEllipseShape)
            .addShapeTypeToPutOn (cdrCurveShape)
            
            .addSubPathTypeToPutOn EllipseSubPath
            
            .addGroupChildCountToGroupName = True
            .setImagePath "Abstandshalter\AH.png"
            
            .groupPlacedShapes = True

            .setMinMaxSize 7, 7, 2.1
            
            .setWidth 10
            .setHeight 10

        End With
        Set jobAbstandshalterPNG = .mee
    End With
    
    With jobAbstandshalterPNG.clone
        .name = "Abstandshalter Schwarz PNG"
        
        With .getSubJob(1)
            .setImagePath "Abstandshalter\AH schwarz.png"
            
            .setWidth 10
            .setHeight 10
        End With
        
        Set jobAbstandshalterSchwarzPNG = .mee
    End With
    
    
    With jobAbstandshalterPNG.clone
        .name = "Abstandshalter Schwarz PNG"
        
        With .getSubJob(1)
            .setImagePath "Abstandshalter\AH schwarz.png"
            
            .setWidth 10
            .setHeight 10
        End With
        
        Set jobAbstandshalterSchwarzPNG = .mee
    End With
    
    With jobAbstandshalterPNG.clone
        .name = "Abstandshalter Gold PNG"
        
        With .getSubJob(1)
            .setImagePath "Abstandshalter\AH gold.png"
            
            .setWidth 10
            .setHeight 10
        End With
        
        Set jobAbstandshalterGoldPNG = .mee
    End With
    
    With jobAbstandshalterPNG.clone
        .name = "Abstandshalter Rose PNG"
        
        With .getSubJob(1)
            .setImagePath "Abstandshalter\AH rose.png"
            
            .setWidth 10
            .setHeight 10
        End With
        
        Set jobAbstandshalterRosePNG = .mee
    End With
    
    With jobAbstandshalterPNG.clone
        .name = "Abstandshalter Weiß PNG"
        
        With .getSubJob(1)
            .setImagePath "Abstandshalter\AH weiß.png"
            
            .setWidth 10
            .setHeight 10
        End With
        
        Set jobAbstandshalterWeissPNG = .mee
    End With
    
    
    
    
    
    Set jobs2Bohrlöcher = New collection
    With jobList.newJob
        .name = "Bohrlöcher 2x 4mm"
        With .newSubJob
            .productIDSuffix = "-2B"
            
            .shapeName = "Bohrloch 4mm"
            .exportable = False
            .shapeType = cdrEllipseShape
            .placeOnMainRedShape = True
            .alignXOffset = 4
            .alignXTarget = 1
            .setWidth 4
            .setHeight 4
            
            .setShapeColorIsAutoRedOrPink True
            
            .cutDesign = True
            
            With .clone
                .alignXTarget = -1
                .alignXOffset = -4
            End With
            
        End With
        Set job2Bohrlöcher_4mm = .mee
        jobs2Bohrlöcher.add .mee
        
        With .clone
            .name = "Bohrlöcher 2x 5mm"
            
            For i = 1 To .subJobs.count
                With .getSubJob(i)
                    .shapeName = "Bohrloch 5mm"
                    .setAlignOffsetScale 5 ' mm
                End With
            Next i
            
            Set job2Bohrlöcher_5mm = .mee
            jobs2Bohrlöcher.add .mee
        End With
        
        With .clone
            .name = "Bohrlöcher 2x 6mm"
            
            For i = 1 To .subJobs.count
                With .getSubJob(i)
                    .shapeName = "Bohrloch 6mm"
                    .setAlignOffsetScale 6 ' mm
                End With
            Next i
            
            Set job2Bohrlöcher_6mm = .mee
            jobs2Bohrlöcher.add .mee
        End With
        
        With .clone
            .name = "Bohrlöcher 2x 8mm"
            
            For i = 1 To .subJobs.count
                With .getSubJob(i)
                    .shapeName = "Bohrloch 8mm"
                    .setAlignOffsetScale 8 ' mm
                End With
            Next i
            
            Set job2Bohrlöcher_8mm = .mee
            jobs2Bohrlöcher.add .mee
        End With
        
        With .clone
            .name = "Bohrlöcher 2x 1cm"
            
            For i = 1 To .subJobs.count
                With .getSubJob(i)
                    .shapeName = "Bohrloch 1cm"
                    .setAlignOffsetScale 10 ' mm
                End With
            Next i
            
            Set job2Bohrlöcher_1cm = .mee
            jobs2Bohrlöcher.add .mee
        End With
        
        
        With .clone
            .name = "Bohrlöcher 2x 1,5cm"
            
            For i = 1 To .subJobs.count
                With .getSubJob(i)
                    .shapeName = "Bohrloch 1,5cm"
                    .setAlignOffsetScale 15 ' mm
                End With
            Next i
            
            Set job2Bohrlöcher_1_5cm = .mee
            jobs2Bohrlöcher.add .mee
        End With
        

        With .clone
            .name = "Bohrlöcher 2x 2cm"
            
            For i = 1 To .subJobs.count
                With .getSubJob(i)
                    .shapeName = "Bohrloch 2cm"
                    .setAlignOffsetScale 20 ' mm
                End With
            Next i
            
            Set job2Bohrlöcher_2cm = .mee
            jobs2Bohrlöcher.add .mee
        End With
        
        
        
        
        With jobList.newJob
            .name = "Bohrlöcher 2x Edelstahl"
            
            .jobsPlacingMaximumCount = 1
            
            For i = 1 To jobs2Bohrlöcher.count
                Set currentJob = jobs2Bohrlöcher(i)
                Set currentJob = currentJob.clone(False)
                .addJob currentJob
                
                currentJob.addProductShapeInfoToAvoid ProductRecognizer.getProductShapeInfoFromString("Retro 2 12x8")
                currentJob.addProductShapeInfoToAvoid ProductRecognizer.getProductShapeInfoFromString("Retro 2 9x6")
                
                ' currentJob ist ein Klon. Deshalb wird jobs2Bohrlöcher(i) verglichen
                If currentJob.wasClonedFrom(job2Bohrlöcher_4mm) Then
                    currentJob.setMinMaxSize2 0, 80, 0, 34.99999
                    Set job2Bohrlöcher_4mm_Edelstahl = .mee
                ElseIf currentJob.wasClonedFrom(job2Bohrlöcher_6mm) Then
                    currentJob.setMinMaxSize2 0, 200, 0, 200
                    Set job2Bohrlöcher_6mm_Edelstahl = .mee
                ElseIf currentJob.wasClonedFrom(job2Bohrlöcher_8mm) Then
                    ' Bis unendlich
                    currentJob.setMinMaxSize2 0, 10000, 0, 10000
                    currentJob.removeProductShapeInfoToAvoid ProductRecognizer.getProductShapeInfoFromString("Retro 2 9x6")
                    Set job2Bohrlöcher_8mm_Edelstahl = .mee
                ElseIf currentJob.wasClonedFrom(job2Bohrlöcher_1cm) Then
                    ' Bis unendlich
                    currentJob.setMinMaxSize2 0, 10000, 0, 10000
                    ' Bisher wird 10mm nur auf Retro 2 12x8 platziert
                    currentJob.removeProductShapeInfoToAvoid ProductRecognizer.getProductShapeInfoFromString("Retro 2 12x8")
                    Set job2Bohrlöcher_1cm_Edelstahl = .mee
                ElseIf currentJob.wasClonedFrom(job2Bohrlöcher_1_5cm) Then
                    Set job2Bohrlöcher_1_5cm_Edelstahl = .mee
                ElseIf currentJob.wasClonedFrom(job2Bohrlöcher_2cm) Then
                    Set job2Bohrlöcher_2cm_Edelstahl = .mee
                End If
                Set currentJob = Nothing
            Next i
    
            Set job2BohrlöcherEdelstahl = .mee
        End With
        
        
        
        
        Set jobs4Bohrlöcher = New collection
        With .clone
            .name = "Bohrlöcher 4x 5mm"
            
            For i = 1 To .subJobs.count
                With .getSubJob(i)
                    .productIDSuffix = "-4B"
                    .shapeName = "Bohrloch 5mm"
                    .alignYTarget = 1
                    .alignYOffset = 5
                    .setAlignOffsetScale 5 ' mm
                End With
            Next i
            
            ' Unten
            With .getSubJob(1).clone
                .alignYTarget = -1
                .alignYOffset = -5

                ' Unten links
                With .clone
                    .alignXTarget = -1
                    .alignXOffset = -5
                End With
            End With
            Set job4Bohrlöcher_5mm = .mee
            jobs4Bohrlöcher.add .mee
            
             With .clone
                .name = "Bohrlöcher 4x 6mm"
                
                For i = 1 To .subJobs.count
                    .getSubJob(i).shapeName = "Bohrloch 6mm"
                    .getSubJob(i).setAlignOffsetScale 6 ' mm
                Next i
                
                Set job4Bohrlöcher_6mm = .mee
                jobs4Bohrlöcher.add .mee
            End With
            
             With .clone
                .name = "Bohrlöcher 4x 8mm"
                
                For i = 1 To .subJobs.count
                    .getSubJob(i).shapeName = "Bohrloch 8mm"
                    .getSubJob(i).setAlignOffsetScale 8 ' mm
                Next i
                
                Set job4Bohrlöcher_8mm = .mee
                jobs4Bohrlöcher.add .mee
            End With
            
            
            With .clone
                .name = "Bohrlöcher 4x 1cm"
                
                For i = 1 To .subJobs.count
                    .getSubJob(i).shapeName = "Bohrloch 1cm"
                    .getSubJob(i).setAlignOffsetScale 10 ' mm
                Next i
                
                Set job4Bohrlöcher_1cm = .mee
                jobs4Bohrlöcher.add .mee
            End With
            
            
            With .clone
                .name = "Bohrlöcher 4x 1,5cm"
                
                For i = 1 To .subJobs.count
                    .getSubJob(i).shapeName = "Bohrloch 1,5cm"
                    .getSubJob(i).setAlignOffsetScale 15 ' mm
                Next i
                
                Set job4Bohrlöcher_1_5cm = .mee
                jobs4Bohrlöcher.add .mee
            End With
            
            
            With .clone
                .name = "Bohrlöcher 4x 2cm"
                
                For i = 1 To .subJobs.count
                    .getSubJob(i).shapeName = "Bohrloch 2cm"
                    .getSubJob(i).setAlignOffsetScale 20 ' mm
                Next i
                
                Set job4Bohrlöcher_2cm = .mee
                jobs4Bohrlöcher.add .mee
            End With
            
        End With
    End With
    
    
    
    With jobList.newJob
        .name = "Bohrlöcher 4x Edelstahl"
        
        .jobsPlacingMaximumCount = 1
        
        For i = 1 To jobs4Bohrlöcher.count
            Set currentJob = jobs4Bohrlöcher(i)
            Set currentJob = currentJob.clone(False)
            .addJob currentJob
            
            
            ' currentJob ist ein Klon. Deshalb wird jobs2Bohrlöcher(i) verglichen
            If currentJob.wasClonedFrom(job4Bohrlöcher_6mm) Then
                currentJob.setMinMaxSize2 0, 200, 0, 200
            ElseIf currentJob.wasClonedFrom(job4Bohrlöcher_8mm) Then
                currentJob.setMinMaxSize2 0, 10000, 0, 10000
            End If
            Set currentJob = Nothing
        Next i
    
        Set job4BohrlöcherEdelstahl = .mee
    End With
    
    
    With jobList.newJob
        .name = "Bohrlöcher Schrauben PNG"
        .setGroupName "Schrauben"
        .groupPlacedShapesBySubJob = True
        With .newSubJob
            .addShapeTypeToPutOn (cdrEllipseShape)
            .addShapeTypeToPutOn (cdrCurveShape)
            
            .addSubPathTypeToPutOn EllipseSubPath

            .setImagePath "Schrauben\Schraube hinten.png"

            .groupPlacedShapes = True
            
            .setMinMaxSize 4, 4, 0.1
            
            .setWidth 7
            .setHeightProportional
            
            With .clone
                .setImagePath "Schrauben\Schraube vorne.png"
            End With
            
        End With
        Set jobBohrlöcherSchraubenPNG = .mee
    End With


    With jobList.newJob
        .name = "Roter Rahmen"
        With .newSubJob
            .placeOnMainRedShape = True
            .setShapeColorOutline 255, 0, 0
            .subtractSmallerShapes = True
            
            .emtpyShapeName = True
            
            .mainShapeAddModee = CreateNewLayerOfNewMainShapes
            
            .orderShapeAllBehind = True
            
        End With
        
        With .clone
            .name = "Pinker Rahmen"
            
            With .getSubJob(1)
                Set .shapeColorOutline = Globals.getPinkColor
            End With
        End With
    End With
    
    
    With jobList.newJob
        .name = "Roter Rahmen + 1cm"
        With .newSubJob
            
            .placeOnMainRedShape = True
            .setShapeColorOutline 255, 0, 0
            .pathOffset = 10
            .pathOffsetCornerType = cdrContourCornerMiteredBevel ' Eckig
            .subtractSmallerShapes = True
            
            .mainShapeAddModee = CreateNewLayerOfNewMainShapes
            
            .orderShapeAllBehind = True
            
        End With
        
        Set jobRoterRahmenPlusEinCM = .mee
        
        With .clone
            .name = "Pinker Rahmen + 1cm"
            
            With .getSubJob(1)
                Set .shapeColorOutline = Globals.getPinkColor
            End With
        End With
    End With
    
    
    With jobList.newJob
        .name = "Roter Rahmen bündig"
        
        With .newSubJob
            .placeOnMainRedShape = True
            .setShapeColorOutline 255, 0, 0
            
            .mainShapeAddModee = CreateNewLayerOfNewMainShapes
            .orderShapeAllBehind = True
            
        End With
        
        
        With .clone
            .name = "Pinker Rahmen bündig"
            
            With .getSubJob(1)
                Set .shapeColorOutline = Globals.getPinkColor
            End With
        End With
        
        Set jobRoterRahmen = .mee
    End With



    ' DATEI
    ' ////////////////////////////////////////////////////////////////////////

    With jobList.newJob
        .name = "CDR"
        
        .groupPlacedShapesBySubJob = False
        
        With .newSubJob
            .setMinMaxSize2 0, 2000, 0, 2000
            .placeOnMainRedShape = True
            .orderShapeAllBehind = False ' TODO RELEASE
            
            .setWidthToImage
            .setHeightToImage
            
            .imagePathRelativeToPlaceableImageFiles = False
            
            .groupPlacedShapes = False
        End With

        With .clone
            .name = "SVG"
            Set jobSVG = .mee
        End With
        Set jobCDR = .mee()
    End With
    
    
    With jobList.newJob
        .name = "Motiv ersetzen"
        
        .groupPlacedShapesBySubJob = False
        
        With .newSubJob
            .name = "Motiv ersetzen"
            .setMinMaxSize2 0, 2000, 0, 2000
            
            .setWidthToShapeToPlaceOn
            .setHeightProportional
            
            .imagePathRelativeToPlaceableImageFiles = False
            
            .deleteShapeToPlaceOnAtEnd = True ' Ersetzen
            
            .groupPlacedShapes = False
            
            .exportable = False
        End With
        
        Set jobShapeReplace = .mee
    End With
    
    
    
    
    ' VARIANTEN
    ' ////////////////////////////////////////////////////////////////////////



    ' TASTER ::::::::::::::::

    With jobList.newJob(False)
        ' Enthält 3 Größen
        .name = "Variante Taster Blau"

        .groupPlacedShapesBySubJob = True
        .setGroupName "var_taster(Blau)"
        
        .setPutAboveMainMask
        
        With .newSubJob
            .name = "KH Größe S (Standart)"
            .addShapeTypeToPutOn (cdrEllipseShape)
            .addShapeTypeToPutOn (cdrCurveShape)
            
            .addSubPathTypeToPutOn EllipseSubPath
            
            .setImagePath "Türklingel\Klingelknopf\3D\kH.png"
            .setMinMaxSize 20, 20, 9
            .setWidthToImage
            .setHeightToImage
            
            .groupPlacedShapes = True
            
            With .clone
                .name = "BK Größe S (Standart)"
                .setImagePath "Türklingel\Klingelknopf\3D\bK.png"
            End With
            
            ' Größe M
            With .clone
                .name = "KH Größe M"
                .setMinMaxSize 30, 30, 4
                .setImagePath "Türklingel\Klingelknopf\3D\M\kH.png"

                With .clone
                    .name = "BK Größe M"
                    .imageName = "bK"
                    .shapeName = .imageName
                End With
            End With
            
            ' Größe L
            With .clone
                .name = "KH Größe L"
                .setMinMaxSize 40, 40, 4
                .setImagePath "Türklingel\Klingelknopf\3D\L\kH.png"

                With .clone
                    .name = "BK Größe L"
                    .imageName = "bK"
                    .shapeName = .imageName
                End With
            End With
        End With
        
        Set jobKlingelTasterBlau = .mee
            
            
        With .clone
            .name = "Variante Taster Gelb"
            .setGroupName "var_taster(Gelb)"
            .repl "bK", "gK", True, False, True
            Set jobKlingelTasterGelb = .mee
        End With
        
        With .clone
            .name = "Variante Taster Grün"
            .setGroupName "var_taster(Grün)"
            .repl "bK", "grK", True, False, True
            Set jobKlingelTasterGruen = .mee
        End With
        
        With .clone
            .name = "Variante Taster Normal"
            .setGroupName "var_taster(Normal)"
            .repl "bK", "nK", True, False, True
            Set jobKlingelTasterNormal = .mee
        End With
        
        With .clone
            .name = "Variante Taster Rot"
            .setGroupName "var_taster(Rot)"
            .repl "bK", "rK", True, False, True
            Set jobKlingelTasterRot = .mee
        End With
        
        With .clone
            .name = "Variante Taster Weiß"
            .setGroupName "var_taster(Weiß)"
            .repl "bK", "wK", True, False, True
            Set jobKlingelTasterWeiss = .mee
        End With
        
        ' Erst am Ende machen, damit nur Blau die Eigenschaft hat
        .isDefaultInVariantGroup = True
    End With
    
    
    
    With jobList.newJob
        .name = "Variante Taster Alle"
        
        .addJob jobKlingelTasterBlau
        .addJob jobKlingelTasterGelb
        .addJob jobKlingelTasterGruen
        .addJob jobKlingelTasterNormal
        .addJob jobKlingelTasterRot
        .addJob jobKlingelTasterWeiss
        
        Set jobKlingelTasterVarianteAlle = .mee
    End With
    
    ' Jobs erst später zur Liste hinzufügen, damit "Variante Taster Alle" zuerst kommt
    jobList.addJob jobKlingelTasterBlau
    jobList.addJob jobKlingelTasterGelb
    jobList.addJob jobKlingelTasterGruen
    jobList.addJob jobKlingelTasterNormal
    jobList.addJob jobKlingelTasterRot
    jobList.addJob jobKlingelTasterWeiss
    
    
    ' Klingel-Taster
    With jobKlingelTasterVarianteAlle.clone
        .name = "Z Variante Taster Alle"
        
        For i = 1 To .jobs.count
            With .jobs(i)
                .replImageFolder "3D", "Z\3D"
                .addImageName "z_", True
            End With
        Next i
    End With
    



    ' BEFESTIGUNG :::::::::::
    With jobList.newJob
        .name = "Variante Befestigung Keine"
'        .isGeneratingOwnMask = True
        .setPutAboveMainMask
        
        With .newSubJob
            
            .placeOnMainRedShape = True
            .setShapeColor 255, 255, 255
            .transparency = 100
            .subtractSmallerShapes = False
            
            .orderShapeAllBehind = False
            
            .emtpyShapeName = True
            .exportable = False
        End With
        
        .getOrCreateVariante.confiThumbnailFileName = "Ohne"
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType
        .variantNameBeautiful = "Ohne Befestigung"
        .staticVariantNameAliasseForAmazonImport.add "ohne Befestigung"
        .staticVariantNameAliasseForAmazonImport.add "keine Befestigung"
        
        Set jobVarianteBefestigungOhne = .mee
    End With
    
    
    With jobList.newJob
        .name = "Variante Befestigung selbstklebend glatte Flächen"
        
        ' Shop Infos
        .getOrCreateVariante.price = 2.69
        .variantNameBeautiful = "Selbstklebend glatte Flächen"
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Klebend_glatt"
        
        .setPutAboveMainMask
        
        With .newSubJob
            
            .placeOnMainRedShape = True
            .setShapeColor 255, 255, 255
            .transparency = 100
            .subtractSmallerShapes = False
            
            .orderShapeAllBehind = False
            
            .emtpyShapeName = True
            .exportable = False
        End With
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "Selbstklebend-glatt"
        .staticVariantNameAliasseForAmazonImport.add "Selbstklebend glatte Flächen"
        
        Set jobVarianteBefestigungSelbstklebendGlatteFlächen = .mee
    End With
    
    
    With jobList.newJob
        .name = "Variante Befestigung selbstklebend raue Flächen"
        
        ' Shop Infos
        .getOrCreateVariante.price = 3.99
        .variantNameBeautiful = "Selbstklebend raue Flächen"
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Klebend_rau"
        
        .setPutAboveMainMask
        
        With .newSubJob
            
            .placeOnMainRedShape = True
            .setShapeColor 255, 255, 255
            .transparency = 100
            .subtractSmallerShapes = False
            .emtpyShapeName = True
            
            .orderShapeAllBehind = False
            
            .exportable = False
        End With
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "Selbstklebend-rau"
        .staticVariantNameAliasseForAmazonImport.add "Selbstklebend raue Flächen"
        .staticVariantNameAliasseForAmazonImport.add "Klebend für leicht raue Untergründe"
        
        Set jobVarianteBefestigungSelbstklebendRaueFlächen = .mee
    End With
    
    ' Wenn es keine Auswahl zwischen rau oder glatt gibt, dann wird nur diese Variante angeboten
    With jobList.newJob
        .name = "Variante Befestigung selbstklebend"
        
        ' Shop Infos
        .getOrCreateVariante.price = 3.99
        .variantNameBeautiful = "Selbstklebend"
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Klebend"
        
        .setPutAboveMainMask
        
        With .newSubJob
            
            .placeOnMainRedShape = True
            .setShapeColor 255, 255, 255
            .transparency = 100
            .subtractSmallerShapes = False
            
            .orderShapeAllBehind = False
            
            .exportable = False
        End With
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "Selbstklebend"
        .staticVariantNameAliasseForAmazonImport.add "Selbstklebend"
        
        Set jobVarianteBefestigungSelbstklebend = .mee
    End With
    
    
    With jobList.newJob
        .name = "Variante Befestigung Silikonkleber"
        
        ' Shop Infos
        .getOrCreateVariante.price = 4.99
        .variantNameBeautiful = "Silikonkleber"
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Silikonkleber"
        
        .setPutAboveMainMask
        
        With .newSubJob
            
            .placeOnMainRedShape = True
            .setShapeColor 255, 255, 255
            .transparency = 100
            .subtractSmallerShapes = False
            
            .orderShapeAllBehind = False
            
            .exportable = False
        End With
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "Silikonkleber"
        .staticVariantNameAliasseForAmazonImport.add "Silikonkleber"
        
        Set jobVarianteBefestigungSilikonkleber = .mee
    End With
    
    
    With jobList.newJob
        .name = "Variante Befestigung Bolzen"
        
        ' Shop Infos
        .getOrCreateVariante.price = 6.99
        .variantNameBeautiful = "2 Metallstifte & Dübel (M10)"
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bolzen"
        
        .setPutAboveMainMask
        
        With .newSubJob
            
            .placeOnMainRedShape = True
            .setShapeColor 255, 255, 255
            .transparency = 100
            .subtractSmallerShapes = False
            
            .orderShapeAllBehind = False
            
            .exportable = False
        End With
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "Bolzen"
        .staticVariantNameAliasseForAmazonImport.add "Bolzen"
        .staticVariantNameAliasseForAmazonImport.add "2 Metallstifte & Dübel (M10)"
        
        Set jobVarianteBefestigungBolzen = .mee
        
    End With
    
    
    
    
    
    
    ' ABSTANDSHALTER
    ' --------------------
    With jobList.newJob
        .name = "Variante Befestigung Abstandshalter 2x 1cm"
        .setPutAboveMainMask
        
        .cloneAndAddSubJobsFrom job2Abstandshalter1cm, True
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .cloneAndAddSubJobsFrom jobAbstandshalterPNG
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "2-Abstandshalter-1cm"
        
        ' Shop Infos
        .getOrCreateVariante.price = 4.99
        .variantNameBeautiful = "2 Abstandshalter"
    End With
    
    
    With jobList.newJob
        .name = "Variante Befestigung Abstandshalter 2x 1,5cm"
        .setPutAboveMainMask
        
        .cloneAndAddSubJobsFrom job2Abstandshalter1_5cm, True
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .cloneAndAddSubJobsFrom jobAbstandshalterPNG
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "2-Abstandshalter-1,5cm"
        
        ' Shop Infos
        .getOrCreateVariante.price = 4.99
        .variantNameBeautiful = "2 Abstandshalter"
    End With
    
    
    With jobList.newJob
        .name = "Variante Befestigung Abstandshalter 2x 2cm"
        .setPutAboveMainMask
        
        .cloneAndAddSubJobsFrom job2Abstandshalter, True
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .cloneAndAddSubJobsFrom jobAbstandshalterPNG
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "2-Abstandshalter-2cm"
        
        ' Shop Infos
        .getOrCreateVariante.price = 4.99
        .variantNameBeautiful = "2 Abstandshalter"
    End With
    
    
    ' 4x -----------
    With jobList.newJob
        .name = "Variante Befestigung Abstandshalter 4x 1cm"
        .setPutAboveMainMask
        
        .cloneAndAddSubJobsFrom job4Abstandshalter1cm, True
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .cloneAndAddSubJobsFrom jobAbstandshalterPNG
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "4-Abstandshalter-1cm"
        
        ' Shop Infos
        .getOrCreateVariante.price = 6.99
        .variantNameBeautiful = "4 Abstandshalter"
    End With
    
    
    With jobList.newJob
        .name = "Variante Befestigung Abstandshalter 4x 1,5cm"
        .setPutAboveMainMask
        
        .cloneAndAddSubJobsFrom job4Abstandshalter1_5cm, True
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .cloneAndAddSubJobsFrom jobAbstandshalterPNG
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "4-Abstandshalter-1,5cm"
        
        ' Shop Infos
        .getOrCreateVariante.price = 6.99
        .variantNameBeautiful = "4 Abstandshalter"
    End With
    
    With jobList.newJob
        .name = "Variante Befestigung Abstandshalter 4x 2cm"
        .setPutAboveMainMask
        
        .cloneAndAddSubJobsFrom job4Abstandshalter, True
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .cloneAndAddSubJobsFrom jobAbstandshalterPNG
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "4-Abstandshalter-2cm"
        
        ' Shop Infos
        .getOrCreateVariante.price = 6.99
        .variantNameBeautiful = "4 Abstandshalter"
    End With
    
    
    
    ' ABSTANDSHALTER SCHWARZ
    ' ------------------------------
    With jobList.newJob
        .name = "Variante Befestigung Abstandshalter Schwarz 2x 1cm"
        .setPutAboveMainMask
        
        .cloneAndAddSubJobsFrom job2Abstandshalter1cm, True
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .cloneAndAddSubJobsFrom jobAbstandshalterSchwarzPNG
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "2-Abstandshalter-Schwarz-1cm"
        
        ' Shop Infos
        .getOrCreateVariante.price = 5.69
        .variantNameBeautiful = "mit 2 Abstandshaltern Schwarz"
    End With
    
    With jobList.newJob
        .name = "Variante Befestigung Abstandshalter Schwarz 2x 1,5cm"
        .setPutAboveMainMask
        
        .cloneAndAddSubJobsFrom job2Abstandshalter1_5cm, True
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .cloneAndAddSubJobsFrom jobAbstandshalterSchwarzPNG
        
        .variantNameBeautiful = "2 Abstandshalter schwarz"
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "2-Abstandshalter-Schwarz-1,5cm"
        
        ' Shop Infos
        .getOrCreateVariante.price = 5.69
        .variantNameBeautiful = "mit 2 Abstandshaltern Schwarz"
    End With
    
    
    With jobList.newJob
        .name = "Variante Befestigung Abstandshalter Schwarz 2x 2cm"
        .setPutAboveMainMask
        
        .cloneAndAddSubJobsFrom job2Abstandshalter, True
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .cloneAndAddSubJobsFrom jobAbstandshalterSchwarzPNG
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "2-Abstandshalter-Schwarz-2cm"
        
        ' Shop Infos
        .getOrCreateVariante.price = 5.69
        .variantNameBeautiful = "mit 2 Abstandshaltern Schwarz"
    End With
    
    ' 4x -------------
    With jobList.newJob
        .name = "Variante Befestigung Abstandshalter Schwarz 4x 1cm"
        .setPutAboveMainMask
        
        .cloneAndAddSubJobsFrom job4Abstandshalter1cm, True
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .cloneAndAddSubJobsFrom jobAbstandshalterSchwarzPNG
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "4-Abstandshalter-Schwarz-1cm"
        
        ' Shop Infos
        .getOrCreateVariante.price = 7.89
        .variantNameBeautiful = "mit 4 Abstandshaltern Schwarz"
    End With
    
    
    With jobList.newJob
        .name = "Variante Befestigung Abstandshalter Schwarz 4x 1,5cm"
        .setPutAboveMainMask
        
        .cloneAndAddSubJobsFrom job4Abstandshalter1_5cm, True
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .cloneAndAddSubJobsFrom jobAbstandshalterSchwarzPNG
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "4-Abstandshalter-Schwarz-1,5cm"
        
        ' Shop Infos
        .getOrCreateVariante.price = 7.89
        .variantNameBeautiful = "mit 4 Abstandshaltern Schwarz"
    End With
    
    With jobList.newJob
        .name = "Variante Befestigung Abstandshalter Schwarz 4x 2cm"
        .setPutAboveMainMask
        
        .cloneAndAddSubJobsFrom job4Abstandshalter, True
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .cloneAndAddSubJobsFrom jobAbstandshalterSchwarzPNG
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "4-Abstandshalter-Schwarz-2cm"
        
        ' Shop Infos
        .getOrCreateVariante.price = 7.89
        .variantNameBeautiful = "mit 4 Abstandshaltern Schwarz"
    End With
    
    
    
    ' ABSTANDSHALTER BOHRLÖCHER (nur Löcher, 8 mm / 10 mm eingerückt)
    ' --------------------
    With jobList.newJob
        .name = "Variante Befestigung Abstandshalter Bohrlöcher 2x 1cm"
        .setPutAboveMainMask

        .cloneAndAddSubJobsFrom job2Abstandshalter1cm, True
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden

        .isGeneratingOwnMask = True
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "2-Abstandshalter-Bohrloecher-1cm"
        .staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern für Abstandshalter"
        .staticVariantNameAliasseForAmazonImport.add "2 Bohrlöcher Abstandshalter"

        ' Shop Infos
        .variantNameBeautiful = "mit 2 Bohrlöchern (Ø 8 mm) für Abstandshalter"
        .getOrCreateVariante.price = 2.79
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_2x"
    End With

    With jobList.newJob
        .name = "Variante Befestigung Abstandshalter Bohrlöcher 4x 1cm"
        .setPutAboveMainMask

        .cloneAndAddSubJobsFrom job4Abstandshalter1cm, True
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden

        .isGeneratingOwnMask = True
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "4-Abstandshalter-Bohrloecher-1cm"
        .staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern für Abstandshalter"
        .staticVariantNameAliasseForAmazonImport.add "4 Bohrlöcher Abstandshalter"

        ' Shop Infos
        .variantNameBeautiful = "mit 4 Bohrlöchern (Ø 8 mm) für Abstandshalter"
        .getOrCreateVariante.price = 2.99
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_4x"
    End With



    ' BEFESTIGUNG BOHRLÖCHER
    ' Alle Materialien außer Acryl
    ' ---------------------------------------------
    Dim bohrlochVarianten As New collection
    Dim bohrlochVarianten2x As New collection
    
    With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 2x 4mm"
        .cloneAndAddSubJobsFrom job2Bohrlöcher_4mm, True
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .setPutAboveMainMask
        
        .isGeneratingOwnMask = True
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "2-Bohrloecher-4mm"
        bohrlochVarianten.add .mee
        bohrlochVarianten2x.add .mee
        .staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern"
        .staticVariantNameAliasseForAmazonImport.add "2 Bohrlöcher"
        
        ' Shop Infos
        .variantNameBeautiful = "mit 2 Bohrlöchern (Ø 4 mm)"
        .getOrCreateVariante.price = 2.79
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_2x"
    End With
    
    With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 2x 5mm"
        .cloneAndAddSubJobsFrom job2Bohrlöcher_5mm, True
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .setPutAboveMainMask
        
        .isGeneratingOwnMask = True
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "2-Bohrloecher-5mm"
        bohrlochVarianten.add .mee
        bohrlochVarianten2x.add .mee
        .staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern"
        .staticVariantNameAliasseForAmazonImport.add "2 Bohrlöcher"
        
        ' Shop Infos
        .variantNameBeautiful = "mit 2 Bohrlöchern (Ø 4 mm)"
        .getOrCreateVariante.price = 2.79
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_2x"
    End With
    
    With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 2x 6mm"
        .cloneAndAddSubJobsFrom job2Bohrlöcher_6mm, True
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .setPutAboveMainMask
        
        .isGeneratingOwnMask = True
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "2-Bohrloecher-6mm"
        bohrlochVarianten.add .mee
        bohrlochVarianten2x.add .mee
        .staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern"
        .staticVariantNameAliasseForAmazonImport.add "2 Bohrlöcher"
        
        ' Shop Infos
        .variantNameBeautiful = "mit 2 Bohrlöchern (Ø 4 mm)"
        .getOrCreateVariante.price = 2.79
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_2x"
    End With
    
    With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 2x 8mm"
        .cloneAndAddSubJobsFrom job2Bohrlöcher_8mm, True
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .setPutAboveMainMask
        
        .isGeneratingOwnMask = True
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "2-Bohrloecher-8mm"
        bohrlochVarianten.add .mee
        bohrlochVarianten2x.add .mee
        .staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern"
        .staticVariantNameAliasseForAmazonImport.add "2 Bohrlöcher"
        
        ' Shop Infos
        .variantNameBeautiful = "mit 2 Bohrlöchern (Ø 4 mm)"
        .getOrCreateVariante.price = 2.79
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_2x"
    End With
    
    With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 2x 1cm"
        ' vv Muss oben stehen, da das "True" Eigenschaften zu diesem Job kopiert
        ' Diese werden weiter unten aber überschrieben. Andersherum währe das nicht möglich
        .cloneAndAddSubJobsFrom job2Bohrlöcher_1cm, True
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .setPutAboveMainMask
        
        .isGeneratingOwnMask = True
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "2-Bohrloecher-1cm"
        bohrlochVarianten.add .mee
        bohrlochVarianten2x.add .mee
        .staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern"
        .staticVariantNameAliasseForAmazonImport.add "2 Bohrlöcher"
        
        ' Shop Infos
        .variantNameBeautiful = "mit 2 Bohrlöchern (Ø 4 mm)"
        .getOrCreateVariante.price = 2.79
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_2x"
    End With
    
    
    With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 2x 1,5cm"
        .cloneAndAddSubJobsFrom job2Bohrlöcher_1_5cm, True
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .setPutAboveMainMask
        
        .isGeneratingOwnMask = True
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "2-Bohrloecher-1,5cm"
        bohrlochVarianten.add .mee
        bohrlochVarianten2x.add .mee
        .staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern"
        .staticVariantNameAliasseForAmazonImport.add "2 Bohrlöcher"
        
        ' Shop Infos
        .variantNameBeautiful = "mit 2 Bohrlöchern (Ø 4 mm)"
        .getOrCreateVariante.price = 2.79
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_2x"
    End With
    
    With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 2x 2cm"
        .cloneAndAddSubJobsFrom job2Bohrlöcher_2cm, True
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .setPutAboveMainMask
        
        .isGeneratingOwnMask = True
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "2-Bohrloecher-2cm"
        bohrlochVarianten.add .mee
        bohrlochVarianten2x.add .mee
        .staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern"
        .staticVariantNameAliasseForAmazonImport.add "2 Bohrlöcher"
        
        ' Shop Infos
        .variantNameBeautiful = "mit 2 Bohrlöchern (Ø 4 mm)"
        .getOrCreateVariante.price = 2.79
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_2x"
    End With
    
    
    With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 2x Edelstahl"
        
        .jobsPlacingMaximumCount = 1
        
        For i = 1 To bohrlochVarianten2x.count
            .addJob bohrlochVarianten2x(i).clone(False)
        Next i
        
    End With
    
    
    
    
    
    
'    ' BOHRLÖCHER 2x
'    ' Nur Acryl
'    ' -----------------------------------------------------
'    With jobList.newJob
'        .name = "Variante Befestigung Bohrlöcher 2x 4mm Acryl"
'        .cloneAndAddSubJobsFrom job2Bohrlöcher_4mm, True
'        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
'        .setPutAboveMainMask
'
'        .isGeneratingOwnMask = True
'
'        .groupPlacedShapesBySubJob = True
'        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "2-Bohrloecher-4mm-Acryl"
'        .staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern"
'        .staticVariantNameAliasseForAmazonImport.add "2 Bohrlöcher"
'
'        ' Shop Infos
'        .variantNameBeautiful = "mit 2 Bohrlöchern (Ø 4 mm)"
'        .getOrCreateVariante.price = 1.99
'        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_2x"
'    End With
'
'    With jobList.newJob
'        .name = "Variante Befestigung Bohrlöcher 2x 6mm Acryl"
'        .cloneAndAddSubJobsFrom job2Bohrlöcher_6mm, True
'        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
'        .setPutAboveMainMask
'
'        .isGeneratingOwnMask = True
'
'        .groupPlacedShapesBySubJob = True
'        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "2-Bohrloecher-6mm-Acryl"
'        .staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern"
'        .staticVariantNameAliasseForAmazonImport.add "2 Bohrlöcher"
'
'        ' Shop Infos
'        .variantNameBeautiful = "mit 2 Bohrlöchern (Ø 4 mm)"
'        .getOrCreateVariante.price = 1.99
'        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_2x"
'    End With
'
'    With jobList.newJob
'        .name = "Variante Befestigung Bohrlöcher 2x 8mm Acryl"
'        .cloneAndAddSubJobsFrom job2Bohrlöcher_8mm, True
'        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
'        .setPutAboveMainMask
'
'        .isGeneratingOwnMask = True
'
'        .groupPlacedShapesBySubJob = True
'        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "2-Bohrloecher-8mm-Acryl"
'        .staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern"
'        .staticVariantNameAliasseForAmazonImport.add "2 Bohrlöcher"
'
'        ' Shop Infos
'        .variantNameBeautiful = "mit 2 Bohrlöchern (Ø 4 mm)"
'        .getOrCreateVariante.price = 1.99
'        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_2x"
'    End With
'
'    With jobList.newJob
'        .name = "Variante Befestigung Bohrlöcher 2x 1cm Acryl"
'        ' vv Muss oben stehen, da das "True" Eigenschaften zu diesem Job kopiert
'        ' Diese werden weiter unten aber überschrieben. Andersherum währe das nicht möglich
'        .cloneAndAddSubJobsFrom job2Bohrlöcher_1cm, True
'        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
'        .setPutAboveMainMask
'
'        .isGeneratingOwnMask = True
'
'        .groupPlacedShapesBySubJob = True
'        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "2-Bohrloecher-1cm-Acryl"
'        .staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern"
'        .staticVariantNameAliasseForAmazonImport.add "2 Bohrlöcher"
'
'        ' Shop Infos
'        .variantNameBeautiful = "mit 2 Bohrlöchern (Ø 4 mm)"
'        .getOrCreateVariante.price = 1.99
'        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_2x"
'    End With
'
'    With jobList.newJob
'        .name = "Variante Befestigung Bohrlöcher 2x 1,5cm Acryl"
'        .cloneAndAddSubJobsFrom job2Bohrlöcher_1_5cm, True
'        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
'        .setPutAboveMainMask
'
'        .isGeneratingOwnMask = True
'
'        .groupPlacedShapesBySubJob = True
'        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "2-Bohrloecher-1,5cm-Acryl"
'        .staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern"
'        .staticVariantNameAliasseForAmazonImport.add "2 Bohrlöcher"
'
'        ' Shop Infos
'        .variantNameBeautiful = "mit 2 Bohrlöchern (Ø 4 mm)"
'        .getOrCreateVariante.price = 1.99
'        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_2x"
'    End With
'
'    With jobList.newJob
'        .name = "Variante Befestigung Bohrlöcher 2x 2cm Acryl"
'        .cloneAndAddSubJobsFrom job2Bohrlöcher_2cm, True
'        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
'        .setPutAboveMainMask
'
'        .isGeneratingOwnMask = True
'
'        .groupPlacedShapesBySubJob = True
'        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "2-Bohrloecher-2cm-Acryl"
'        .staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern"
'        .staticVariantNameAliasseForAmazonImport.add "2 Bohrlöcher"
'
'        ' Shop Infos
'        .variantNameBeautiful = "mit 2 Bohrlöchern (Ø 4 mm)"
'        .getOrCreateVariante.price = 1.99
'        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_2x"
'    End With




    
    
    
    
    
    
    
    ' BOHRLÖCHER 2x MIT SCHRAUBEN
    ' Alle Materialien außer Acryl
    ' ------------------------
    
    With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 2x 6mm mit Schrauben"
        .cloneAndAddSubJobsFrom job2Bohrlöcher_6mm, True
        .cloneAndAddSubJobsFrom jobBohrlöcherSchraubenPNG
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .setPutAboveMainMask
        
        .variantNameBeautiful = "2 Bohrlöcher 6 mm Abstand + Schrauben"
        .isGeneratingOwnMask = True
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_2x"
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "2-Bohrloecher-6mm-Schrauben"
        
        ' Shop Infos
        .variantNameBeautiful = "mit 2 Bohrlöchern & Schrauben"
        .getOrCreateVariante.price = 3.49
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrlöcher_&_Schrauben_2x"
        
        bohrlochVarianten.add .mee
    End With
    
    With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 2x 8mm mit Schrauben"
        .cloneAndAddSubJobsFrom job2Bohrlöcher_8mm, True
        .cloneAndAddSubJobsFrom jobBohrlöcherSchraubenPNG
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .setPutAboveMainMask
        
        .isGeneratingOwnMask = True
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "2-Bohrloecher-8mm-Schrauben"
        
        ' Shop Infos
        .variantNameBeautiful = "mit 2 Bohrlöchern & Schrauben"
        .getOrCreateVariante.price = 3.49
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrlöcher_&_Schrauben_2x"
        
        bohrlochVarianten.add .mee
    End With
    
    With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 2x 1cm mit Schrauben"
        .cloneAndAddSubJobsFrom job2Bohrlöcher_1cm, True
        .cloneAndAddSubJobsFrom jobBohrlöcherSchraubenPNG
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .setPutAboveMainMask
        
        .isGeneratingOwnMask = True
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "2-Bohrloecher-1cm-Schrauben"
        
        ' Shop Infos
        .variantNameBeautiful = "mit 2 Bohrlöchern & Schrauben"
        .getOrCreateVariante.price = 3.49
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrlöcher_&_Schrauben_2x"
        
        bohrlochVarianten.add .mee
    End With
    
    
    With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 2x 1,5cm mit Schrauben"
        .cloneAndAddSubJobsFrom job2Bohrlöcher_1cm, True
        .cloneAndAddSubJobsFrom jobBohrlöcherSchraubenPNG
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .setPutAboveMainMask
        
        .isGeneratingOwnMask = True
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "2-Bohrloecher-1,5cm-Schrauben"
        
        ' Shop Infos
        .variantNameBeautiful = "mit 2 Bohrlöchern & Schrauben"
        .getOrCreateVariante.price = 3.49
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrlöcher_&_Schrauben_2x"
        
        bohrlochVarianten.add .mee
    End With
    
    
    With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 2x 2cm mit Schrauben"
        .cloneAndAddSubJobsFrom job2Bohrlöcher_1cm, True
        .cloneAndAddSubJobsFrom jobBohrlöcherSchraubenPNG
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .setPutAboveMainMask
        
        .isGeneratingOwnMask = True
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "2-Bohrloecher-2cm-Schrauben"
        
        ' Shop Infos
        .variantNameBeautiful = "mit 2 Bohrlöchern & Schrauben"
        .getOrCreateVariante.price = 3.49
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrlöcher_&_Schrauben_2x"
        
        bohrlochVarianten.add .mee
    End With
    
    
    With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 2x Edelstahl mit Schrauben"
        .cloneAndAddSubJobsFrom job2BohrlöcherEdelstahl, True
        .cloneAndAddSubJobsFrom jobBohrlöcherSchraubenPNG
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .setPutAboveMainMask
        
        .isGeneratingOwnMask = True
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "2-Bohrloecher-Edelstahl-Schrauben"
        
        ' Shop Infos
        .variantNameBeautiful = "mit 2 Bohrlöchern & Schrauben"
        .getOrCreateVariante.price = 3.49
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrlöcher_&_Schrauben_2x"
        
        bohrlochVarianten.add .mee
    End With
    
    
    
    
    
    
    
    
    ' BOHRLÖCHER 4x
    ' Alle Materialien außer Acryl
    ' ---------------------
    Dim bohrlochVarianten4x As New collection
     With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 4x 5mm"
        .cloneAndAddSubJobsFrom job4Bohrlöcher_5mm
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .setPutAboveMainMask
        
        .variantNameBeautiful = "4 Bohrlöcher 5 mm"
        .isGeneratingOwnMask = True
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_4x"
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "4-Bohrloecher-5mm"
        bohrlochVarianten.add .mee
        bohrlochVarianten4x.add .mee
        .staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern"
        .staticVariantNameAliasseForAmazonImport.add "4 Bohrlöcher"
        
        ' Shop Infos
        .variantNameBeautiful = "mit 4 Bohrlöchern (Ø 4 mm)"
        .getOrCreateVariante.price = 3.89
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_4x"
        
        Set jobVarianteBefestigungBohrlöcher4x5mm = .mee
    End With
    
    With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 4x 6mm"
        .cloneAndAddSubJobsFrom job4Bohrlöcher_6mm
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .setPutAboveMainMask
        
        .isGeneratingOwnMask = True
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "4-Bohrloecher-6mm"
        bohrlochVarianten.add .mee
        bohrlochVarianten4x.add .mee
        .staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern"
        .staticVariantNameAliasseForAmazonImport.add "4 Bohrlöcher"
        
        ' Shop Infos
        .variantNameBeautiful = "mit 4 Bohrlöchern (Ø 4 mm)"
        .getOrCreateVariante.price = 3.89
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_4x"
    End With
    
    With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 4x 8mm"
        .cloneAndAddSubJobsFrom job4Bohrlöcher_8mm
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .setPutAboveMainMask
        
        .isGeneratingOwnMask = True
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "4-Bohrloecher-8mm"
        bohrlochVarianten.add .mee
        bohrlochVarianten4x.add .mee
        .staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern"
        .staticVariantNameAliasseForAmazonImport.add "4 Bohrlöcher"
        
        ' Shop Infos
        .variantNameBeautiful = "mit 4 Bohrlöchern (Ø 4 mm)"
        .getOrCreateVariante.price = 3.89
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_4x"
    End With
    
    With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 4x 1cm"
        .cloneAndAddSubJobsFrom job4Bohrlöcher_1cm
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .setPutAboveMainMask
        
        .isGeneratingOwnMask = True
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "4-Bohrloecher-1cm"
        bohrlochVarianten.add .mee
        bohrlochVarianten4x.add .mee
        .staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern"
        .staticVariantNameAliasseForAmazonImport.add "4 Bohrlöcher"
        
        ' Shop Infos
        .variantNameBeautiful = "mit 4 Bohrlöchern (Ø 4 mm)"
        .getOrCreateVariante.price = 3.89
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_4x"
        
        Set jobVarianteBefestigungBohrlöcher4x1cm = .mee
    End With
    
    With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 4x 1,5cm"
        .cloneAndAddSubJobsFrom job4Bohrlöcher_1_5cm
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .setPutAboveMainMask
        
        .isGeneratingOwnMask = True
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "4-Bohrloecher-1,5cm"
        bohrlochVarianten.add .mee
        bohrlochVarianten4x.add .mee
        .staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern"
        .staticVariantNameAliasseForAmazonImport.add "4 Bohrlöcher"
        
        ' Shop Infos
        .variantNameBeautiful = "mit 4 Bohrlöchern (Ø 4 mm)"
        .getOrCreateVariante.price = 3.89
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_4x"
    End With
    
    With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 4x 2cm"
        .cloneAndAddSubJobsFrom job4Bohrlöcher_2cm
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .setPutAboveMainMask
        
        .isGeneratingOwnMask = True
        
        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "4-Bohrloecher-2cm"
        bohrlochVarianten.add .mee
        bohrlochVarianten4x.add .mee
        .staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern"
        .staticVariantNameAliasseForAmazonImport.add "4 Bohrlöcher"
        
        ' Shop Infos
        .variantNameBeautiful = "mit 4 Bohrlöchern (Ø 4 mm)"
        .getOrCreateVariante.price = 3.89
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_4x"
    End With
    
    
    With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 4x Edelstahl"
        
        .jobsPlacingMaximumCount = 1
        
        For i = 1 To bohrlochVarianten4x.count
            .addJob bohrlochVarianten4x(i).clone(False)
        Next i
        
    End With
    
    
    
    
'    ' BOHRLÖCHER 4x
'    ' Nur Acryl
'    ' -------------------------------
'     With jobList.newJob
'        .name = "Variante Befestigung Bohrlöcher 4x 5mm Acryl"
'        .cloneAndAddSubJobsFrom job4Bohrlöcher_5mm
'        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
'        .setPutAboveMainMask
'
'        .variantNameBeautiful = "4 Bohrlöcher 5 mm"
'        .isGeneratingOwnMask = True
'        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_4x"
'
'        .groupPlacedShapesBySubJob = True
'        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "4-Bohrloecher-5mm-Acryl"
'        .staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern"
'        .staticVariantNameAliasseForAmazonImport.add "4 Bohrlöcher"
'
'        ' Shop Infos
'        .variantNameBeautiful = "mit 4 Bohrlöchern (Ø 4 mm)"
'        .getOrCreateVariante.price = 2.29
'        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_4x"
'
'        Set jobVarianteBefestigungBohrlöcher4x5mm = .mee
'    End With
'
'    With jobList.newJob
'        .name = "Variante Befestigung Bohrlöcher 4x 6mm Acryl"
'        .cloneAndAddSubJobsFrom job4Bohrlöcher_6mm
'        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
'        .setPutAboveMainMask
'
'        .isGeneratingOwnMask = True
'
'        .groupPlacedShapesBySubJob = True
'        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "4-Bohrloecher-6mm-Acryl"
'        .staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern"
'        .staticVariantNameAliasseForAmazonImport.add "4 Bohrlöcher"
'
'        ' Shop Infos
'        .variantNameBeautiful = "mit 4 Bohrlöchern (Ø 4 mm)"
'        .getOrCreateVariante.price = 2.29
'        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_4x"
'    End With
'
'    With jobList.newJob
'        .name = "Variante Befestigung Bohrlöcher 4x 8mm Acryl"
'        .cloneAndAddSubJobsFrom job4Bohrlöcher_8mm
'        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
'        .setPutAboveMainMask
'
'        .isGeneratingOwnMask = True
'
'        .groupPlacedShapesBySubJob = True
'        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "4-Bohrloecher-8mm-Acryl"
'        .staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern"
'        .staticVariantNameAliasseForAmazonImport.add "4 Bohrlöcher"
'
'        ' Shop Infos
'        .variantNameBeautiful = "mit 4 Bohrlöchern (Ø 4 mm)"
'        .getOrCreateVariante.price = 2.29
'        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_4x"
'    End With
'
'    With jobList.newJob
'        .name = "Variante Befestigung Bohrlöcher 4x 1cm Acryl"
'        .cloneAndAddSubJobsFrom job4Bohrlöcher_1cm
'        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
'        .setPutAboveMainMask
'
'        .isGeneratingOwnMask = True
'
'        .groupPlacedShapesBySubJob = True
'        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "4-Bohrloecher-1cm-Acryl"
'        .staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern"
'        .staticVariantNameAliasseForAmazonImport.add "4 Bohrlöcher"
'
'        ' Shop Infos
'        .variantNameBeautiful = "mit 4 Bohrlöchern (Ø 4 mm)"
'        .getOrCreateVariante.price = 2.29
'        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_4x"
'
'        Set jobVarianteBefestigungBohrlöcher4x1cm = .mee
'    End With
'
'    With jobList.newJob
'        .name = "Variante Befestigung Bohrlöcher 4x 1,5cm Acryl"
'        .cloneAndAddSubJobsFrom job4Bohrlöcher_1_5cm
'        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
'        .setPutAboveMainMask
'
'        .isGeneratingOwnMask = True
'
'        .groupPlacedShapesBySubJob = True
'        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "4-Bohrloecher-1,5cm-Acryl"
'        .staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern"
'        .staticVariantNameAliasseForAmazonImport.add "4 Bohrlöcher"
'
'        ' Shop Infos
'        .variantNameBeautiful = "mit 4 Bohrlöchern (Ø 4 mm)"
'        .getOrCreateVariante.price = 2.29
'        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_4x"
'    End With
'
'    With jobList.newJob
'        .name = "Variante Befestigung Bohrlöcher 4x 2cm Acryl"
'        .cloneAndAddSubJobsFrom job4Bohrlöcher_2cm
'        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
'        .setPutAboveMainMask
'
'        .isGeneratingOwnMask = True
'
'        .groupPlacedShapesBySubJob = True
'        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "4-Bohrloecher-2cm-Acryl"
'        .staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern"
'        .staticVariantNameAliasseForAmazonImport.add "4 Bohrlöcher"
'
'        ' Shop Infos
'        .variantNameBeautiful = "mit 4 Bohrlöchern (Ø 4 mm)"
'        .getOrCreateVariante.price = 2.29
'        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_4x"
'    End With
        
    
    
    
    
    
    
    
    
    
    
    ' BOHRLÖCHER 4x MIT SCHRAUBEN
    ' Alle Materialien außer Acryl
    With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 4x 5mm mit Schrauben"
        .cloneAndAddSubJobsFrom job4Bohrlöcher_5mm
        .cloneAndAddSubJobsFrom jobBohrlöcherSchraubenPNG
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .setPutAboveMainMask
        
        .isGeneratingOwnMask = True

        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "4-Bohrloecher-Schrauben-5mm"
        
        ' Shop Infos
        .variantNameBeautiful = "mit 4 Bohrlöchern & Schrauben"
        .getOrCreateVariante.price = 3.69
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_und_Schrauben_4x"
        
        Set jobVarianteBefestigungBohrlöcher4x5mmMitSchrauben = .mee
        bohrlochVarianten.add .mee
    End With
    
    With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 4x 6mm mit Schrauben"
        .cloneAndAddSubJobsFrom job4Bohrlöcher_6mm
        .cloneAndAddSubJobsFrom jobBohrlöcherSchraubenPNG
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .setPutAboveMainMask
        
        .isGeneratingOwnMask = True

        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "4-Bohrloecher-Schrauben-6mm"
        
        ' Shop Infos
        .variantNameBeautiful = "mit 4 Bohrlöchern & Schrauben"
        .getOrCreateVariante.price = 3.99
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_und_Schrauben_4x"
        
        bohrlochVarianten.add .mee
    End With
    
    
    With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 4x 8mm mit Schrauben"
        .cloneAndAddSubJobsFrom job4Bohrlöcher_8mm
        .cloneAndAddSubJobsFrom jobBohrlöcherSchraubenPNG
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .setPutAboveMainMask
        
        .variantNameBeautiful = "4 Bohrlöcher 8 mm + Schrauben"
        .isGeneratingOwnMask = True
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_4x"

        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "4-Bohrloecher-Schrauben-8mm"
        
        ' Shop Infos
        .variantNameBeautiful = "mit 4 Bohrlöchern & Schrauben"
        .getOrCreateVariante.price = 3.99
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_und_Schrauben_4x"
        
        bohrlochVarianten.add .mee
    End With
    
    With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 4x 1cm mit Schrauben"
        .cloneAndAddSubJobsFrom job4Bohrlöcher_1cm
        .cloneAndAddSubJobsFrom jobBohrlöcherSchraubenPNG
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .setPutAboveMainMask
        
        .isGeneratingOwnMask = True

        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "4-Bohrloecher-Schrauben-1cm"
        
        ' Shop Infos
        .variantNameBeautiful = "mit 4 Bohrlöchern & Schrauben"
        .getOrCreateVariante.price = 3.99
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_und_Schrauben_4x"
        
        bohrlochVarianten.add .mee
    End With
    
    With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 4x 1,5cm mit Schrauben"
        .cloneAndAddSubJobsFrom job4Bohrlöcher_1_5cm
        .cloneAndAddSubJobsFrom jobBohrlöcherSchraubenPNG
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .setPutAboveMainMask
        
        .isGeneratingOwnMask = True

        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "4-Bohrloecher-Schrauben-1,5cm"
        
        ' Shop Infos
        .variantNameBeautiful = "mit 4 Bohrlöchern & Schrauben"
        .getOrCreateVariante.price = 3.99
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_und_Schrauben_4x"
        
        bohrlochVarianten.add .mee
    End With
    
    
    With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 4x 2cm mit Schrauben"
        .cloneAndAddSubJobsFrom job4Bohrlöcher_2cm
        .cloneAndAddSubJobsFrom jobBohrlöcherSchraubenPNG
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .setPutAboveMainMask
        
        .isGeneratingOwnMask = True

        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "4-Bohrloecher-Schrauben-2cm"
        
        ' Shop Infos
        .variantNameBeautiful = "mit 4 Bohrlöchern & Schrauben"
        .getOrCreateVariante.price = 3.99
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_und_Schrauben_4x"
        
        bohrlochVarianten.add .mee
    End With
    
    With jobList.newJob
        .name = "Variante Befestigung Bohrlöcher 4x Edelstahl mit Schrauben"
        .cloneAndAddSubJobsFrom job4BohrlöcherEdelstahl
        .cloneAndAddSubJobsFrom jobBohrlöcherSchraubenPNG
        .setSubJobsCutDesign False ' Weil es eine Variante ist, nicht das Design zuschneiden
        .setPutAboveMainMask
        
        .isGeneratingOwnMask = True

        .groupPlacedShapesBySubJob = True
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName BefestigungStaticVariantGroupType, "4-Bohrloecher-Edelstahl-Schrauben"
        
        ' Shop Infos
        .variantNameBeautiful = "mit 4 Bohrlöchern & Schrauben"
        .getOrCreateVariante.price = 3.99
        .getOrCreateVariante.confiThumbnailFileName = "Befestigung\Bohrloecher_und_Schrauben_4x"
        
        bohrlochVarianten.add .mee
    End With
    
    For i = 1 To bohrlochVarianten.count
        Set currentJob = bohrlochVarianten(i)
        currentJob.staticVariantNameAliasseForAmazonImport.add "mit Bohrlöchern"
        Set currentJob = Nothing
    Next i
    ' ---------------------------------------------
    
    


    
    
    
    
    ' KORDELN ::::::::::::::::::::::
    
    Set jobsKordelAlleFarben = New collection
    
    With jobList.newJob(False)
        
        .name = "Kordel Beige"
        
        .setPutAboveMainMask
        
        
        
        ' Kordelband
        With .newSubJob
            .name = "Kordelband"
        
            .addShapeTypeToPutOn (cdrEllipseShape)
            .addShapeTypeToPutOn (cdrCurveShape)
            .addSubPathTypeToPutOn EllipseSubPath
            
            .minimumShapesToFind = 2
            .placeMaximumCount = 1
            
            .subtractVisualMainShape = True
            .removeBitmapCutForExport2 = True
            
            .setImagePath "Kordel\Kordel Band\M_Kordel_Band_Beige.png"
            
            .shapeName = "Kordel_Band_Beige"
                
            .setMinMaxSize2 3.9, 8.1, 3.9, 8.1   ' Kordellochgröße
            
            .alignY = -1
            
            .widthToPutOnFoundShapesMin = 0
            .widthToPutOnFoundShapesMax = 250
            .heightToPutOnFoundShapesMin = 0
            .heightToPutOnFoundShapesMax = 10000
            
            .setWidthToShapeToPlaceOn
            .setHeightProportional
            
            
            With .clone
                .widthToPutOnFoundShapesMin = 250.00001
                .widthToPutOnFoundShapesMax = 300
                .imageName = "L_Kordel_Band_Beige"
            End With
            
            
            With .clone
                .widthToPutOnFoundShapesMin = 300.00001
                .widthToPutOnFoundShapesMax = 1000
                .imageName = "XL_Kordel_Band_Beige"
            End With
            
        End With
        
        
        
        ' Kordelknoten
        With .newSubJob
            .name = "Kordelknoten"
            
            .addShapeTypeToPutOn (cdrEllipseShape)
            .addShapeTypeToPutOn (cdrCurveShape)
            .addSubPathTypeToPutOn EllipseSubPath
            
            .placeMaximumCount = 2
            
            .groupPlacedShapes = True
            .addGroupChildCountToGroupName = False
            
            .setImagePath "Kordel\Kordel Knoten Beige.png"
            
            .setMinMaxSize2 3.9, 8.1, 3.9, 8.1

            .setWidth 10
            .setHeightProportional
        End With
        
        jobsKordelAlleFarben.add .mee
       
       
       With .clone
            .name = "Kordel Rosa"
            .replImageName "Beige", "Rosa"
            .replShapeName "Beige", "Rosa"
            jobsKordelAlleFarben.add .mee
       End With
       
       With .clone
            .name = "Kordel Schwarz"
            .replImageName "Beige", "Schwarz"
            .replShapeName "Beige", "Schwarz"
            jobsKordelAlleFarben.add .mee
       End With
       
       With .clone
            .name = "Kordel Blau"
            .replImageName "Beige", "Blau"
            .replShapeName "Beige", "Blau"
            jobsKordelAlleFarben.add .mee
       End With
    End With
    

    
    
    With jobList.newJob
        .name = "Kordellöcher 1cm"
        With .newSubJob
            .name = "Kordelloch 1cm"
            .shapeName = "Kordelloch 1cm"
            .exportable = False
            .shapeType = cdrEllipseShape
            .placeOnMainRedShape = True
            .alignYOffset = 10
            .alignXOffset = 10
            .alignXTarget = 1
            .alignYTarget = 1
            .setWidth 5
            .setHeight 5
            '.setShapeColorOutline 255, 0, 0
            
            .setShapeColorIsAutoRedOrPink True
            
            With .clone
                .alignXTarget = -1
                .alignXOffset = -.alignXOffset
            End With
            
        End With
        
        Set jobKordelloecher1cm = .mee
        
        
        With .clone
            .name = replace(.name, "1", "1,5") ' Kordelloch 1,5cm
            
            Dim selfff As PlaceFileJob
            Set selfff = .mee
            
            For i = 1 To .subJobs.count
                .getSubJob(i).name = replace(.getSubJob(i).name, "1", "1,5")
                .getSubJob(i).setAlignOffsetScale 15
                .getSubJob(i).shapeName = replace(.getSubJob(i).shapeName, "1", "1,5")
            Next i
            
            Set jobKordelloecher1_5cm = .mee
        End With
    End With
    
    Set jobsKordelloecher = New collection
    jobsKordelloecher.add jobKordelloecher1cm
    jobsKordelloecher.add jobKordelloecher1_5cm
    
    
    
    
    ' Variante Kordelfarbe INIT
    Dim jobsKordelFarbeVariante As New collection
    For i = 1 To jobsKordelAlleFarben.count
        With jobList.newJob(False)
            .name = "Variante Kordelfarbe " & replace(jobsKordelAlleFarben(i).name, "Kordel ", "")
            
            
            .groupPlacedShapesBySubJob = True
            .setPutAboveMainMask
            .isGeneratingOwnMask = True
            .cloneAndAddSubJobsFrom jobsKordelAlleFarben(i)
            
            '.setGroupName "var_kordelfarbe(Kordelfarbe-" & replace(jobsKordelAlleFarben(i).name, "Kordel ", "") & ")"
            .setGroupName "var_kordelfarbe(" & replace(jobsKordelAlleFarben(i).name, "Kordel ", "") & ")"
            
            jobsKordelFarbeVariante.add .mee
        End With
    Next i
    
    ' Variante Kordelfarbe Alle
    With jobList.newJob
        .name = "Variante Kordelfarbe Alle"
        
        For i = jobsKordelFarbeVariante.count To 1 Step -1
            .addJob jobsKordelFarbeVariante.item(i)
        Next i
    End With
    
    
    
    ' Variante Kordelfarbe ADD
    For i = 1 To jobsKordelFarbeVariante.count
        jobList.addJob jobsKordelFarbeVariante(i)
    Next i
    
    
    Set jobsKordelAlleFarben1cm = New collection
    Set jobsKordelAlleFarben1_5cm = New collection
    
    For j = 1 To jobsKordelloecher.count
        For i = 1 To jobsKordelAlleFarben.count
            With jobList.newJob(False)
                
                Dim zentimeterName As String
                zentimeterName = replace(jobsKordelloecher(j).name, "Kordellöcher ", "") '"Kordellöcher 1cm" wird zu "1cm"
                
                .name = "Variante Befestigung Kordel " & replace(jobsKordelAlleFarben(i).name, "Kordel ", "") & " " & zentimeterName
                
                
                .groupPlacedShapesBySubJob = True
                .setPutAboveMainMask
                .isGeneratingOwnMask = True
                .cloneAndAddSubJobsFrom jobsKordelloecher(j)
                .cloneAndAddSubJobsFrom jobsKordelAlleFarben(i)
                
                .setGroupName "var_befestigung(Kordel-" & replace(jobsKordelAlleFarben(i).name, "Kordel ", "") & "-" & zentimeterName & ")"
                
                If j = 1 Then
                    jobsKordelAlleFarben1cm.add .mee
                ElseIf j = 2 Then
                    jobsKordelAlleFarben1_5cm.add .mee
                End If
                         
            End With
        Next i
    Next j
    
    
    
    ' Alle Farben zusammen 1cm
    With jobList.newJob
        For i = jobsKordelAlleFarben1cm.count To 1 Step -1 ' Rückwärts laufen, da sonst die letzte Kordel sich beim Platzieren nach oben ordert
            .addJob jobsKordelAlleFarben1cm(i).clone
        Next i
        .name = "Variante Befestigung Kordel alle Farben 1cm"
    End With
    
    ' Farben einzeln 1cm
    For i = 1 To jobsKordelAlleFarben.count
        jobList.addJob jobsKordelAlleFarben1cm(i)
    Next i
    
    ' Alle Farben zusammen 1,5cm
    With jobList.newJob
        For i = jobsKordelAlleFarben1_5cm.count To 1 Step -1
            .addJob jobsKordelAlleFarben1_5cm(i).clone
        Next i
        .name = "Variante Befestigung Kordel alle Farben 1,5cm"
    End With
    
    ' Farben einzeln 1,5cm
    For i = 1 To jobsKordelAlleFarben.count
        jobList.addJob jobsKordelAlleFarben1_5cm(i)
    Next i
    
    
    
    
    
    
    
    
    
    ' Bändchen
    
    ' ------------------------------------
    
    Dim ribonColorNames As New collection
    ribonColorNames.add "Beige"
    ribonColorNames.add "Blau"
    ribonColorNames.add "Dunkelbraun"
    ribonColorNames.add "Flieder"
    ribonColorNames.add "Gold-Beige"
    ribonColorNames.add "Grün"
    ribonColorNames.add "Hellblau"
    ribonColorNames.add "Hellgrün"
    ribonColorNames.add "Rosa"
    ribonColorNames.add "Rot"
    ribonColorNames.add "Schwarz"
    ribonColorNames.add "Silber-Grau"
    ribonColorNames.add "Weiß"
    
    Dim ribonJobs As New collection
    
    For i = 1 To ribonColorNames.count
        With jobList.newJob '(False)
            .name = "Bändchen " & ribonColorNames(i)
            
            With .newSubJob
                .exportable = False
                
                .addShapeTypeToPutOn (cdrEllipseShape)
                .addShapeTypeToPutOn (cdrCurveShape)
                .addSubPathTypeToPutOn EllipseSubPath
                
                .minimumShapesToFind = 1
                .placeMaximumCount = 1
                
                .setImagePath "Bändchen\" & ribonColorNames(i) & ".png"
                    
                .setMinMaxSize2 3.9, 8.1, 3.9, 8.1   ' Lochgröße
                
                ' Position
                .alignY = -1
                .alignXOffset = 0.678
                
                ' Größe
                .setWidth 11.687 'mm
                .setHeightProportional
                
                .widthToPutOnFoundShapesMin = 0
                .widthToPutOnFoundShapesMax = 250
                .heightToPutOnFoundShapesMin = 0
                .heightToPutOnFoundShapesMax = 10000
                
            End With
            
            ribonJobs.add .mee
        End With
    Next i
    
    Dim ribonVariantJobs As New collection
    
    For i = 1 To ribonJobs.count
        With jobList.newJob(False)
            .name = "Variante Bändchen " & ribonColorNames(i)
    
            .setPutAboveMainMask
            .isGeneratingOwnMask = True
            .cloneAndAddSubJobsFrom ribonJobs(i)
            
            With .getSubJob(1)
                .groupPlacedShapes = True
                .groupName = "var_bändchen(" & ribonColorNames(i) & ")"
            End With
            
            ribonVariantJobs.add .mee
        End With
    Next i
    
    With jobList.newJob
        .name = "Variante Bändchen Alle"
        For i = 1 To ribonVariantJobs.count
            .addJob ribonVariantJobs(i).clone(False)
        Next i
    End With
    
    ' Bändchen Jobs nach der "alle Bändchen" hinzufügen
    For i = 1 To ribonVariantJobs.count
        jobList.addJob ribonVariantJobs(i)
    Next i
    
    ' ------------------------------------
    
    
    
    
    
    
    
    With jobList.newJob
        .name = "Variante Rahmen rot +1cm"
        
        
        .cloneAndAddSubJobsFrom jobRoterRahmenPlusEinCM
        Dim roterRahmen As PlaceFileSubJob
        Set roterRahmen = .subJobs.item(1)
        roterRahmen.shapeName = "var_rahmen(1cm)"
        roterRahmen.exportable = False
        Set roterRahmen = Nothing
        
    End With
    
    
    With jobList.newJob
        .name = "Variante Rahmen rot bündig"
        
        .cloneAndAddSubJobsFrom jobRoterRahmen
        Dim roterRahmen2 As PlaceFileSubJob
        Set roterRahmen2 = .subJobs.item(1)
        roterRahmen2.shapeName = "var_rahmen(Buendig)"
        roterRahmen2.exportable = False
        Set roterRahmen2 = Nothing
        
    End With
    
    With jobList.newJob
        .name = "Variante Rahmen rot Ohne"
        
        With .newSubJob
            .placeOnMainRedShape = True
            .setShapeColorOutline 255, 0, 0
            
            .shapeName = "var_rahmen(Ohne)"
            
            .exportable = False
            
            .mainShapeAddModee = CreateNewLayerOfNewMainShapes
            .orderShapeAllBehind = True
        End With
    End With
    
    
    
    
    
    
    
    
    
    
    
    
    
    ' // FUNKKLINGELN FAKED
    ' //////////////////////////////////////////////////////////////////////////
    
    
    
    
    With jobList.newJob
        .name = "Funkklingel Modelle"
        
        Dim doorBellFiles As collection
        Set doorBellFiles = Globals.getFilesPathWithExtensionInFolder(Globals.getMainFolder & "Platzierbare Bilddateien\Funkklingeln\", "cdr")
        
        For i = 1 To doorBellFiles.count
            With .newSubJob
                .name = Globals.getFileName(doorBellFiles(i))
                .placeOnShapeWithName = True
                .shapeNameToPlaceOn = .name
                
                .placeOnBlueShape = True
                
                .setWidthToImage
                .setHeightToImage
                
                .setImagePath "Funkklingeln\" & .name & ".cdr"
            End With
            .placeMaximumCount = 300
        Next i
        
        ' Kundentexte im Fancy sollen unter der Klingel verschwinden
        .setPutAboveMainMask
        
        Set jobFunkklingelModelle = .mee
    End With
    
    
    
    ' Rahmenvarianten für Funkklingeln
    ' ABER nur provisorisch für einen schnellen Upload in den Shopify Shop
    ' Die 4 Varianten-Jobs zuerst OHNE Hinzufügen zur Liste bauen (newJob(False)), damit weiter unten
    ' ein zusammenfassender Job DAVOR eingefügt werden kann (alle 4 auf einmal platzieren), und die 4
    ' danach einzeln in die Liste kommen.
    Dim jobRahmenAussen As PlaceFileJob
    Dim jobRahmenLinksRechts As PlaceFileJob
    Dim jobRahmenObenUnten As PlaceFileJob
    Dim jobRahmenBuendig As PlaceFileJob
    With jobList.newJob(False)
        .name = "Variante Funkklingel Fake Rahmen Außen"
        
        .groupPlacedShapesBySubJob = True
        .isGeneratingOwnMask = False
        .isGeneratingVariantMask = False
        
        .variantNameBeautiful = "Rundherum"

        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName FakeFKEdelstahlHintergrundplatteVariantGroupType, "Außen" ' TODO FK-SHOPIFY-QUICK
        .getOrCreateVariante.fancyExportExportOtherLayersGroundplatesInThumbnail = True
        Set jobRahmenAussen = .mee

        ' 1 cm dicker roter Rahmen an ALLEN 4 Seiten, von der (rechteckigen) Aussenkante
        ' nach innen. Achtung: KEIN pathOffset auf der Hauptform - diese hat neben der
        ' Rechteckform Aussparungen fuer Befestigung/Kabel, die dabei mit versetzt wuerden.
        ' Der Rahmen entsteht aus 4 roten Rechteck-Bändern (je 1 cm) an den Aussenkanten.
        ' Die Bänder 2-4 werden per combineOperation (= Weld) mit dem ersten verschmolzen,
        ' sodass EINE zusammenhaengende Rahmenform "Rahmen" entsteht.

        ' Linkes Band (Basis)
        With .newSubJob
            .shapeType = cdrRectangleShape
            .placeOnMainRedShape = True
            .setShapeColorOutline 255, 0, 0
            .setWidth 10
            .setHeightToShapeToPlaceOn
            .alignXTarget = -1
            .alignX = -1
            .alignYTarget = 0
            .alignY = 0
            .shapeName = "Rahmen Außen"
            .exportable = False
        End With
        ' Rechtes Band -> mit dem bisherigen Rahmen verschmelzen
        With .newSubJob
            .shapeType = cdrRectangleShape
            .placeOnMainRedShape = True
            .setShapeColorOutline 255, 0, 0
            .setWidth 10
            .setHeightToShapeToPlaceOn
            .alignXTarget = 1
            .alignX = 1
            .alignYTarget = 0
            .alignY = 0
            .shapeName = "Rahmen Außen"
            .exportable = False
            .setBooleanOperationWithPreviousSubJob combineOperation
        End With
        ' Oberes Band -> verschmelzen
        With .newSubJob
            .shapeType = cdrRectangleShape
            .placeOnMainRedShape = True
            .setShapeColorOutline 255, 0, 0
            .setWidthToShapeToPlaceOn
            .setHeight 10
            .alignXTarget = 0
            .alignX = 0
            .alignYTarget = 1
            .alignY = 1
            .shapeName = "Rahmen Außen"
            .exportable = False
            .setBooleanOperationWithPreviousSubJob combineOperation
        End With
        ' Unteres Band -> verschmelzen
        With .newSubJob
            .shapeType = cdrRectangleShape
            .placeOnMainRedShape = True
            .setShapeColorOutline 255, 0, 0
            .setWidthToShapeToPlaceOn
            .setHeight 10
            .alignXTarget = 0
            .alignX = 0
            .alignYTarget = -1
            .alignY = -1
            .shapeName = "Rahmen Außen"
            .exportable = False
            .setBooleanOperationWithPreviousSubJob combineOperation
        End With
        ' Edelstahl-Grundplatte auf die (verschmolzene) rote Rahmenform (nur Textur, nicht exportierbar)
        With .newSubJob
            .placeOnShapeWithName = True
            .shapeNameToPlaceOn = "Rahmen Außen"
            .fillShape = True
            .setImagePath "Texturen\Edelstahl_Grundplatte.png"
            .setWidthToShapeToPlaceOn
            .setHeightProportional
            .isDarkGraving = True
            .shapeName = "Edelstahl"
            .exportable = False
        End With

    End With
    
    With jobList.newJob(False)
        .name = "Variante Funkklingel Fake Rahmen Links & Rechts"
        
        .groupPlacedShapesBySubJob = True
        .isGeneratingOwnMask = False
        .isGeneratingVariantMask = False
        
        .variantNameBeautiful = "Links & Rechts"

        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName FakeFKEdelstahlHintergrundplatteVariantGroupType, "Links-und-Rechts" ' TODO FK-SHOPIFY-QUICK
        .getOrCreateVariante.fancyExportExportOtherLayersGroundplatesInThumbnail = True
        Set jobRahmenLinksRechts = .mee

        ' 2x 1 cm dicker roter Streifen (links und rechts), von der Aussenkante nach innen.
        ' Beide Baender werden per combineOperation (= Weld) zu EINER Rahmenform "Rahmen"
        ' verbunden. (Kein pathOffset auf der Hauptform wegen der Aussparungen.)
        ' Linkes Band (Basis)
        With .newSubJob
            .shapeType = cdrRectangleShape
            .placeOnMainRedShape = True
            .setShapeColorOutline 255, 0, 0
            .setWidth 10
            .setHeightToShapeToPlaceOn
            .alignXTarget = -1
            .alignX = -1
            .alignYTarget = 0
            .alignY = 0
            .shapeName = "Rahmen Links und Rechts"
            .exportable = False
        End With
        ' Rechtes Band -> mit dem linken verbinden
        With .newSubJob
            .shapeType = cdrRectangleShape
            .placeOnMainRedShape = True
            .setShapeColorOutline 255, 0, 0
            .setWidth 10
            .setHeightToShapeToPlaceOn
            .alignXTarget = 1
            .alignX = 1
            .alignYTarget = 0
            .alignY = 0
            .shapeName = "Rahmen Links und Rechts"
            .exportable = False
            .setBooleanOperationWithPreviousSubJob combineOperation
        End With
        ' Edelstahl-Grundplatte auf die (verbundene) rote Rahmenform (nur Textur, nicht exportierbar)
        With .newSubJob
            .placeOnShapeWithName = True
            .shapeNameToPlaceOn = "Rahmen Links und Rechts"
            .fillShape = True
            .setImagePath "Texturen\Edelstahl_Grundplatte.png"
            .setWidthToShapeToPlaceOn
            .setHeightProportional
            .isDarkGraving = True
            .orderShapeAllBehind = True
            .shapeName = "Edelstahl"
            .exportable = False
        End With

    End With
    
    With jobList.newJob(False)
        .name = "Variante Funkklingel Fake Rahmen Oben & Unten"
        
        .groupPlacedShapesBySubJob = True
        .isGeneratingOwnMask = False
        .isGeneratingVariantMask = False
        
        .variantNameBeautiful = "Oben & Unten"

        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName FakeFKEdelstahlHintergrundplatteVariantGroupType, "Oben-und-Unten" ' TODO FK-SHOPIFY-QUICK
        .getOrCreateVariante.fancyExportExportOtherLayersGroundplatesInThumbnail = True
        Set jobRahmenObenUnten = .mee

        ' 2x 1 cm dicker roter Streifen (oben und unten), von der Aussenkante nach innen.
        ' Beide Baender werden per combineOperation (= Weld) zu EINER Rahmenform "Rahmen"
        ' verbunden. (Kein pathOffset auf der Hauptform wegen der Aussparungen.)
        ' Oberes Band (Basis)
        With .newSubJob
            .shapeType = cdrRectangleShape
            .placeOnMainRedShape = True
            .setShapeColorOutline 255, 0, 0
            .setWidthToShapeToPlaceOn
            .setHeight 10
            .alignXTarget = 0
            .alignX = 0
            .alignYTarget = 1
            .alignY = 1
            .shapeName = "Rahmen Oben und Unten"
            .exportable = False
        End With
        ' Unteres Band -> mit dem oberen verbinden
        With .newSubJob
            .shapeType = cdrRectangleShape
            .placeOnMainRedShape = True
            .setShapeColorOutline 255, 0, 0
            .setWidthToShapeToPlaceOn
            .setHeight 10
            .alignXTarget = 0
            .alignX = 0
            .alignYTarget = -1
            .alignY = -1
            .shapeName = "Rahmen Oben und Unten"
            .exportable = False
            .setBooleanOperationWithPreviousSubJob combineOperation
        End With
        ' Edelstahl-Grundplatte auf die (verbundene) rote Rahmenform (nur Textur, nicht exportierbar)
        With .newSubJob
            .placeOnShapeWithName = True
            .shapeNameToPlaceOn = "Rahmen Oben und Unten"
            .fillShape = True
            .setImagePath "Texturen\Edelstahl_Grundplatte.png"
            .setWidthToShapeToPlaceOn
            .setHeightProportional
            .isDarkGraving = True
            .shapeName = "Edelstahl"
            .exportable = False
        End With

    End With
    
    With jobList.newJob(False)
        .name = "Variante Funkklingel Fake Rahmen Bündig"
        
        .groupPlacedShapesBySubJob = True
        .isGeneratingOwnMask = False
        .isGeneratingVariantMask = False
        
        .variantNameBeautiful = "Bündig"

        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName FakeFKEdelstahlHintergrundplatteVariantGroupType, "Bündig" ' TODO FK-SHOPIFY-QUICK
        .getOrCreateVariante.fancyExportExportOtherLayersGroundplatesInThumbnail = True
        Set jobRahmenBuendig = .mee

        ' Bündig = kein Rahmen. Nur eine unsichtbare Platzhalter-Form (kein Rot, kein Edelstahl),
        ' analog zur Variante "Ecken Ohne".
        With .newSubJob
            .placeOnMainRedShape = True
            .setShapeColor 255, 255, 255
            .transparency = 100
            .subtractSmallerShapes = False
            .orderShapeAllBehind = False
            .emtpyShapeName = True
            .exportable = False
        End With

    End With

    ' Zusammenfassender Job: platziert ALLE 4 Rahmen-Varianten auf einmal (Subjobs der 4 geklont).
    ' Wird ZUERST zur Liste hinzugefügt, damit er in der Liste direkt ÜBER den 4 Einzeljobs steht.
    ' Hinweis: platziert alle 4 Varianten überlappend in EINER Gruppe (bewusst, zum schnellen Aufbau).
    With jobList.newJob
        .name = "Variante Funkklingel Fake Rahmen (Alle)"
        
        .addJob jobRahmenLinksRechts
        .addJob jobRahmenObenUnten
        .addJob jobRahmenAussen
        .addJob jobRahmenBuendig
        
        Set jobVarianteFunkklingelnFakeRahmen = .mee
    End With

    ' Danach die 4 Einzeljobs in die Liste (bleiben einzeln auswählbar, stehen unter dem Sammel-Job)
    jobList.addJob jobRahmenAussen
    jobList.addJob jobRahmenLinksRechts
    jobList.addJob jobRahmenObenUnten
    jobList.addJob jobRahmenBuendig


    
    
    
    
    
    
    

    ' Eckenvarianten für Funkklingeln
    ' ABER nur provisorisch für einen schnellen Upload in den Shopify Shop
    
    Dim jobFKEckenEckig As PlaceFileJob
    Dim jobFKEckenAbgerundet As PlaceFileJob
    
    ' -- Ohne (keine abgerundeten Ecken; platziert nichts) --
    With jobList.newJob(False)
        .name = "Variante Funkklingel Fake Ecken Eckig"
        
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName FakeFKEckenVariantGroupType, "Eckig" ' TODO FK-SHOPIFY-QUICK
        .variantNameBeautiful = "Eckig"
        .getOrCreateVariante.confiThumbnailFileName = "Funkklingel Fake Ecken\Eckig"
        .getOrCreateVariante.confiThumbnailFileTypeForFancy = cdrJPEG ' TODO FK-SHOPIFY-QUICK
        
        .groupPlacedShapesBySubJob = True
        .isGeneratingOwnMask = False
        .isGeneratingVariantMask = False
        .setPutAboveMainMask   ' ganz oben, überdeckt zwar nichts. Ist aber sonst immer unter den abgerundeten Ecken, die auch immer ganz oben sind
        
        With .newSubJob
            .placeOnMainRedShape = True
            .setShapeColor 255, 255, 255
            .transparency = 100
            .subtractSmallerShapes = False
            
            .orderShapeAllBehind = False
            
            .emtpyShapeName = True
            .exportable = False
        End With
        
        Set jobFKEckenEckig = .mee
    End With

    ' -- Abgerundete Ecken (gefaked: Eck-PNGs mit Außenschatten in die 4 Ecken) --
    With jobList.newJob(False)
        .name = "Variante Funkklingel Fake Ecken Abgerundet"
        
        .getOrCreateVariante.newStaticVariantFromGroupTypeAndName FakeFKEckenVariantGroupType, "Abgerundet" ' TODO FK-SHOPIFY-QUICK
        .variantNameBeautiful = "Abgerundet"
        .getOrCreateVariante.confiThumbnailFileName = "Funkklingel Fake Ecken\Abgerundet"
        .getOrCreateVariante.confiThumbnailFileTypeForFancy = cdrJPEG ' TODO FK-SHOPIFY-QUICK
        
        .groupPlacedShapesBySubJob = True
        .isGeneratingOwnMask = False
        .isGeneratingVariantMask = False
        .setPutAboveMainMask   ' ganz oben, überdeckt die eckige Ecke der Hauptform

        Dim eckeX(1 To 4) As Integer
        Dim eckeY(1 To 4) As Integer
        Dim eckeDatei(1 To 4) As String
        eckeX(1) = -1: eckeY(1) = 1:  eckeDatei(1) = "LO"   ' oben-links
        eckeX(2) = 1:  eckeY(2) = 1:  eckeDatei(2) = "RO"   ' oben-rechts
        eckeX(3) = -1: eckeY(3) = -1: eckeDatei(3) = "LU"   ' unten-links
        eckeX(4) = 1:  eckeY(4) = -1: eckeDatei(4) = "RU"   ' unten-rechts

        Const ECKE_GROESSE_MM As Double = 13.333

        Dim ecke As Integer
        For ecke = 1 To 4
            With .newSubJob
                .placeOnMainRedShape = True
                .setImagePath "Funkklingeln\Abgerundete Ecken faked\" & eckeDatei(ecke) & ".png"
                .setWidth ECKE_GROESSE_MM
                .setHeight ECKE_GROESSE_MM
                .shapeName = "Ecke_" & eckeDatei(ecke)
                .orderShapeAllBehind = False   ' ganz oben in der Gruppe

                .alignXTarget = eckeX(ecke)
                .alignYTarget = eckeY(ecke)
                .alignX = eckeX(ecke)
                .alignY = eckeY(ecke)

                ' Offset setzt Martin nachträglich (Ecke + Außenschatten).
                ' Positiv * Vorzeichen der Ecke = nach außen.
                .alignXOffset = 3.3 * -eckeX(ecke)
                .alignYOffset = 3.3 * -eckeY(ecke)
            End With
        Next ecke
        
        Set jobFKEckenAbgerundet = .mee
    End With
    
    With jobList.newJob
        .name = "Variante Funkklingel Fake Ecken (Alle)"
        .addJob jobFKEckenAbgerundet
        .addJob jobFKEckenEckig
        
        Set jobVarianteFunkklingelFakeEcken = .mee
    End With
    
    
    jobList.addJob jobFKEckenEckig
    jobList.addJob jobFKEckenAbgerundet
    
    
    
    With jobList.newJob
        .name = "Funkklingeln Faked Jobs"
        
        .addJob jobFunkklingelModelle
        
        .addJob jobVarianteFunkklingelnFakeRahmen
        .addJob jobVarianteFunkklingelFakeEcken
        
        .addJob jobVarianteBefestigungBohrlöcher4x5mmMitSchrauben
        .addJob jobVarianteBefestigungSilikonkleber
        .addJob jobVarianteBefestigungBolzen
        .addJob jobVarianteBefestigungSelbstklebend
        .addJob jobVarianteBefestigungOhne
        
        Set jobFunkklingelnFakedJobs = .mee
    End With
    
    
    
    
    
    
    
    
    
    
    
    
    
    '// ViewBox entfernen
    With jobList.newJob
        .name = "ViewBox entfernen"
        .isOnlyForRemoving = True
        
        With .newSubJob
            .shapeType = cdrRectangleShape
            .setShapeColorOutline 0, 255, 255
            .exportable = False
            
            .setMinMaxSize2 0, 10000, 0, 10000
            
            .subtractSmallerShapes = False
        End With
        
        Set jobViewShapeDeletion = .mee
    End With
    
    
    
    ' ZZZZZZZZZZZZZZZZZZZZZZZZ
    
    With jobList.newJob
        .name = "Z Edelstahl"
        With .newSubJob
            .name = "Z Edelstahl"
            .setMinMaxSize2 20, 2000, 20, 2000

            .orderShapeAllBehind = True
            .placeOnMainRedShape = True
            .subtractSmallerShapes = True
            
            .setWidthToShapeToPlaceOn
            .setHeightProportional
            
            .isDarkGraving = True

            .setImagePath "Z\Edelstahl_Grundplatte.png"
            .shapeName = "Z-Edelstahl_Grundplatte"
            .fillShape = True
        End With
    End With
    
    Set jobsZAcrylSchwarzUndAnthrazit = New collection
    With jobList.newJob
        .name = "Z Acryl Schwarz"
        
        .setLookJob jobAcrylLook
        
        With .newSubJob
            .setGroundPlateMaterialName "Acryl"
            .placeOnMainRedShape = True
            .subtractSmallerShapes = True
            .orderShapeAllBehind = True
            .shapeName = "Z-Acryl_Schwarz_Grundplatte"
            .setShapeColor 18, 18, 18
        End With
        jobsZAcrylSchwarzUndAnthrazit.add .mee()
        jobsAcrylAlleFarben.add .mee()

        With .clone
           .name = "Z Acryl Anthrazit"
           With .getSubJob(1)
                .shapeName = "Z-Acryl_Anthrazit_Grundplatte"
                .setShapeColor 46, 51, 53
           End With
           
           jobsZAcrylSchwarzUndAnthrazit.add .mee()
           jobsAcrylAlleFarben.add .mee()
        End With
    End With
    
    
    ' ALLE AUTOMATISCHEN GRUNDPLATTEN-VARIANTEN GRUPPEN
    ' ////////////////////////////////////////////////////////////////////////
    Set groundPlateVariantGroups = New collection
    groundPlateVariantGroups.add jobsAcrylSchwarzUndAnthrazit
    groundPlateVariantGroups.add jobsZAcrylSchwarzUndAnthrazit ' ZZZZZZZ
    groundPlateVariantGroups.add jobsNussUndKirsch
    groundPlateVariantGroups.add jobsKunststoffGravurSchwarz
    groundPlateVariantGroups.add jobsKunststoffGravurWeiss
    
    initialized = True
    If Not logger Is Nothing Then logger.logINFO "Initialisierung von " & jobList.jobs.count & " Jobs abgeschlossen"
    
End Function






Public Function getSelectedPlaceFileJob() As PlaceFileJob
    Set getSelectedPlaceFileJob = selectedJob
End Function

Public Function setSelectedPlaceTypeJob(job As PlaceFileJob, Optional alsoSelectInUI As Boolean = False)
    
    initIfNeeded
    
    p_setSelectedJob job, alsoSelectInUI
End Function





Public Function setSelectedPlaceType(index)
    
    initIfNeeded
    
    If Not index = 0 Then
        p_setSelectedJob jobList.jobs.item(index)
    Else
        p_setSelectedJob Nothing
    End If
    
End Function



Private Function p_setSelectedJob(job As PlaceFileJob, Optional alsoSelectInUI As Boolean = False)
    Set selectedJob = job
    
    If Not logger Is Nothing Then
        logger.logINFO "[PlaceFile.p_setSelectedJob] job: '" & Globals.objectToStringUsingName(job) & "'"
        logger.addTab
    End If
    
    If alsoSelectInUI Then
        If Globals.isUserformLoaded("PlaceFileDialog") Then
            If selectedJob Is Nothing Then
                PlaceFileDialog.PlaceTypeComboBox.text = ""
            Else
                PlaceFileDialog.PlaceTypeComboBox.text = selectedJob.name
            End If
        End If
    End If
    
    
    If Not logger Is Nothing Then logger.removeTab
End Function




Public Function Start(params As PlaceFileParameters)

    Dim quietMode As Boolean
    quietMode = params.quietMode

    If Not quietMode Then
        Globals.startMacro
    End If
    
    
   
    
    If Not Globals.debugHistory And Not quietMode Then
        CorelScriptTools.BeginWaitCursor
        ActiveDocument.BeginCommandGroup "PlaceFile"
        If Not Globals.debugErrors Then On Error GoTo MacroError
    End If
    
    
    
    
    If Not quietMode Then
        Globals.storeSelection
    End If
    
    
     
    If params.logger Is Nothing Then Set params.logger = createLogger
    startFunction Globals.getSelectedShapesOrAll, params
    
    
    
    ' Vorherige Auswahl wieder herstellen
    ' -----------------------------------
    If Not quietMode Then
        Globals.restoreSelection
    End If
    ' -----------------------------------
    
    
    ' (Globals.endMacro) True muss hier stehen, da sonst das Macro absichtlich beendet wird. Dadurch gehen Variablenwerte verloren.
    ' Somit ist 'initialized' auch false und die GUI wird immer zurückgesetzt
    If Not Globals.debugHistory And Not quietMode Then Globals.endMacro True
    Exit Function
MacroError: 'Alle Fehler hier abfangen und die CommandGruppe beenden, damit man mit einem Schritt zurück gehen kann (STRG + Z)
    MsgBox Err.Description & ", " & Err.number, vbCritical
    shapeCache.cleanUp logger
    cleanUp
    If Not quietMode Then Globals.endMacro True
End Function




Public Function startFunction(shapeOrRange As Variant, params As PlaceFileParameters)

    Set logger = params.logger

    Dim quietMode As Boolean
    quietMode = params.quietMode
    Dim filePathForFilePlacement As String
    filePathForFilePlacement = params.filePathForFilePlacement
    Dim shapeNameToPlaceOn As String
    shapeNameToPlaceOn = params.shapeNameToPlaceOn

    Dim selection As shapeRange
    Set selection = Globals.ensureShapeRange(shapeOrRange)
    
    
    If Not ActiveDocument Is Nothing Then
        ActiveDocument.unit = cdrMillimeter
        ActiveDocument.Rulers.HUnits = cdrMillimeter
        ActiveDocument.Rulers.VUnits = cdrMillimeter
    End If
    
    Application.ActiveDocument.unit = cdrMillimeter ' TODO: Kommt doppelt vor
    partModeVar = params.partModeVar
    layerModeVar = params.layerModeVar
    errorWhenNothingPlaced = params.errorWhenNothingPlaced
    somethingWasPlaced = False
    useOffsetForCDR = params.useOffsetForCDR
    deleteMode = params.deleteMode
    groupsAsDesigns = params.groupsAsDesigns
    
    If Not quietMode And Not selectedJob Is Nothing Then
        If selectedJob Is jobCDR Or selectedJob Is jobSVG Or selectedJob Is jobShapeReplace Then
            Dim filter As String
            If selectedJob Is jobCDR Then
                filter = "CorelDraw Dateien|*.cdr"
            Else
                filter = "SVG Dateien|*.svg"
            End If
            
        
            Dim firstSubJob As PlaceFileSubJob
            Set firstSubJob = selectedJob.subJobs.item(1)
            
            firstSubJob.mainShapeAddModee = params.mainShapeAddModeVar
            
            Dim selectedFilepath As String
            ' Wenn schon standartmäßig ein Pfad mitgegeben wurde, wird der User nicht mehr gefragt
            If Not filePathForFilePlacement = "" Then
                selectedFilepath = filePathForFilePlacement
            
            Else
            
                ' Wenn vorher schonmal eine Datei ausgewählt wurde
                ' ---------------------------------------------------
                Dim previousFolder As String
                Dim previousFile As String
                Dim previousFileExtension As String
                
                If Not firstSubJob.getImagePath = "" Then
                    Dim folderFileExtension() As String
                    folderFileExtension = Globals.getFolderFileAndType(firstSubJob.getImagePath)
                    previousFolder = folderFileExtension(0)
                    previousFile = folderFileExtension(1)
                    previousFileExtension = folderFileExtension(2)
                End If
                ' ---------------------------------------------------
                
                selectedFilepath = CorelScriptTools.GetFileBox(filter, "Wähle eine " & selectedJob.name & "-Datei aus", , previousFile, previousFileExtension, previousFolder)
            End If
            
            
            If Not selectedFilepath = "" Then
                firstSubJob.setImagePath selectedFilepath
            Else
                End
            End If
            
            If selectedJob Is jobShapeReplace Then
                
                Dim motiveName As String
                If Not shapeNameToPlaceOn = "" Then
                    motiveName = shapeNameToPlaceOn
                Else
                    motiveName = InputBox("Bitte gebe den Namen des zu ersetzenden Motivs ein", "Motivname")
                End If
                If motiveName = "" Then Exit Function ' User bricht ab oder hat nichts eingegeben
                jobShapeReplace.getSubJob(1).shapeNameToPlaceOn = motiveName
                
                If endsWith(selectedFilepath, "svg") Then
                    ' Interner Name aus der SVG soll genutzt werden
                    jobShapeReplace.getSubJob(1).shapeName = ""
                Else
                    jobShapeReplace.getSubJob(1).shapeName = Globals.getFileName(selectedFilepath)
                End If
                
            End If
        End If
    End If
    
    
    
    Dim processPossible As Boolean
    ' Wenn der Löschmodus nicht an ist muss ein Job aktiv sein
    If deleteMode = False Then
        processPossible = Not (selectedJob Is Nothing)
    Else
        processPossible = True ' Der Löschmodus ist auch möglich ohne ein Job
    End If
        
        
    
    ' Process
    ' -----------------------
    If processPossible Then
        If Not selection.count = 0 Then
            For i = selection.count To 1 Step -1
                processShape selection(i)
            Next i
        End If
    End If
    ' -----------------------
    
    
    
    ' Warnen wenn nichts platziert wurde und angegeben wurde, dass unbedingt was platziert werden muss
    ' ----------------------------------------------------------------------------------------------------------------
    If errorWhenNothingPlaced And Not somethingWasPlaced Then
        Dim errMsg As String
        If selectedJob Is Nothing Then
            errMsg = "[PlaceFile.Start] 'selectedJob' ist Nothing. Trotzdem wurde erwartet, dass etwas platziert wird. Was nicht eingetroffen ist!"
            If Not logger Is Nothing Then logger.logFATAL errMsg
            Err.Raise vbObjectError + 513, , errMsg
        Else
            errMsg = selectedJob.name & " konnte nicht platziert werden!" & vbNewLine & "Die Form wurde nicht erkannt. Vielleicht weicht sie nur ein wenig von der echten Form ab." & vbNewLine & "Oder die Größe/Form ist noch nicht in der 'Alle Formen'-Datei auf der Neuen-Struktur im Ordner Definition. Oder aber " & selectedJob.name & " war bereits vorher platziert."
            If Not logger Is Nothing Then logger.logFATAL errMsg
            MsgBox errMsg, vbCritical
        End If
        Globals.endMacro
    End If
    ' ----------------------------------------------------------------------------------------------------------------
    
    
    
    
    
    shapeCache.cleanUp logger
    cleanUp
        
End Function




Private Function cleanUp()
    Globals.removeTemporaryShapesFromActiveDocument
    
    Globals.removeShapesOfShapeRangeThatAreNothing shapesToDeleteAtEnd
    shapesToDeleteAtEnd.delete
End Function



' Returnt, ob das letzte Shape aus der Gruppe gelöscht wurde
Private Function removeImagesOnLayer(shape As shape, layer As ProductDesignLayer, subJob As PlaceFileSubJob) As Boolean
    
    If Not logger Is Nothing Then
        logger.logINFO "[PlaceFile.removeImagesOnLayer] layerIndex: " & layer.getLayerIndex
        logger.addTab
        If Not subJob Is Nothing Then logger.logINFO "subJob: '" & subJob.getSubJobInfosForLogging & "'"
    End If
    
    
    Dim i As Integer
    i = 1
    While i <= shape.shapes.count
        
        Dim currShape As shape
        Set currShape = shape.shapes(i)
        Let currShapeName = currShape.name
        
        Dim lastItem As Boolean
        lastItem = shape.shapes.count = 1
        
        If subJob Is Nothing Then ' OHNE JOB
        
            ' Es werden alle Shape, die mit dem Zeichen '>' beginnen gelöscht
            If Globals.startsWith(shape.shapes(i).name, ">") Then
                
                shape.shapes(i).delete
                
                If lastItem Then
                    removeImagesOnLayer = True
                    GoTo ExitFunction
                End If
                
                i = i - 1
                GoTo RemovedItem
            End If
            
        Else ' MIT JOB
            
            Dim deleteShape As Boolean
            deleteShape = False
            
            ' Platzierte Formen werden vom ParentJob gruppiert und benannt
            If Not subJob.parentJob.getGroupName = "" Then
                deleteShape = Globals.endsWith(shape.shapes(i).name, subJob.parentJob.getGroupName)
            ElseIf subJob.groupPlacedShapes Then
                ' Muss nicht zwangsläufig eine Gruppe sein. Denn wenn nur eine Form platziert wurde, wird nicht gruppiert
                Dim groupName As String
                
                groupName = subJob.getNameForGroupingPlacedShapes(currShape)
                
                If Not groupName = "" Then
                    deleteShape = currShapeName = groupName
                End If
            Else
                deleteShape = IIf(subJob.shapeName = "", False, Globals.endsWith(shape.shapes(i).name, subJob.shapeName)) Or _
                    IIf(subJob.imageName = "", False, Globals.endsWith(shape.shapes(i).name, subJob.imageName)) Or _
                    isShapePlacedBySubJob(currShape, layer, subJob)
            End If
            
            ' Es werden alle Shapes, die den selben Namen haben, wie der Gruppenname im Job oder der Shapename im SubJob, gelöscht
            ' Oder auch, wenn ein Shape von einem job platziert wurde. Also isShapePlacedBySubJob True zurück gibt
            If deleteShape Then

                
                removeShapeOnLayer currShape, layer, subJob
                
                If lastItem Then
                    removeImagesOnLayer = True
                    GoTo ExitFunction
                End If
                
                i = i - 1
                GoTo RemovedItem
            End If
            
            deleteShape = False
        End If
        
        If shape.shapes(i).Type = cdrGroupShape And Not Globals.isGroupHavingToManyShapes(shape.shapes(i)) Then
            If removeImagesOnLayer(shape.shapes(i), layer, subJob) And lastItem Then
                removeImagesOnLayer = True
                GoTo ExitFunction
            End If
        End If
        
        
RemovedItem:
        Set currShape = Nothing
        i = i + 1
    Wend
    
ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
End Function



Private Function removeShapeOnLayer(shape As shape, layer As ProductDesignLayer, subJob As PlaceFileSubJob)
    
    If Not logger Is Nothing Then
        logger.logINFO "[PlaceFile.removeShapeOnLayer] shape: " & Globals.getShapeDisplayName(shape)
        logger.addTab
        If Not subJob Is Nothing Then logger.logINFO "subJob: '" & subJob.getSubJobInfosForLogging & "'"
    End If
    
    If subJob.cutDesign Then
        
        ' TODO löschen wenn GLobals.subtractShape funktioniert:
        ' Weil die GLobals.subtractShape noch fehlerhaft ist und die Grundplatte bei Zuschneiden nach oben ordert, wird das Shape einfach aus dem Design genommen.
        ' Dann wird die Grundplatte beim Zuschneiden auch aus dem Design genommen, hin zum 'shape' und danach wieder zurückgeordert
        shape.OrderFrontOf ActiveLayer.shapes.First
        
        ' preventDoubleCut ist aus, weil wir genau das wollen: Doppelt ausschneiden.
        ' Also da wo schon ein Loch ist, noch eins reinschneiden. Dadurch wird das Loch gestopft
        cutSubJobsShapeFromDesign shape, subJob, layer, False
        
    End If
    
    shape.delete
    If Not logger Is Nothing Then logger.removeTab
End Function



Public Sub TestIsShapePlacedBySubJob()
    
    Dim logger As logger
    Set logger = Globals.getLogger
    logger.reset
    logger.addTab , "[PlaceFile.TestIsShapePlacedBySubJob]"
    
    
    If ActiveShape Is Nothing Then
        MsgBox "Es ist keine Form ausgewählt!"
        Exit Sub
    End If
    
    Dim selectedShape As shape
    Set selectedShape = ActiveShape
    
    Dim subJobName As String
    subJobName = InputBox("Gib den zu suchenden SubJob-Namen ein...")
    
    If subJobName = "" Then
        Exit Sub
    End If
    
    initIfNeeded
    
    Dim foundSubJob As PlaceFileSubJob
    
    Dim currentJob As PlaceFileJob
    Dim currentSubJob As PlaceFileSubJob
    
    For j = 1 To jobList.jobs.count
        Set currentJob = jobList.jobs(j)
        
        For s = 1 To currentJob.subJobs.count
            Set currentSubJob = currentJob.subJobs(s)
            
            If currentSubJob.name = subJobName Then
                Set foundSubJob = currentSubJob
                GoTo SubJobFound
            End If
            
            Set currentSubJob = Nothing
        Next s
        
        
        Set currentJob = Nothing
    Next j
SubJobFound:
    
    
    If foundSubJob Is Nothing Then
        MsgBox "Der SubJob '" & subJobName & "' konnte nicht gefunden werden", vbCritical
        Exit Sub
    End If
    
    
    If Not Globals.hasParentGroup(selectedShape) Then
        MsgBox "Die ausgewählte Form ist nicht in einer Gruppe(Design)", vbExclamation
        Exit Sub
    End If
    
    Dim topMostGroup As shape
    Set topMostGroup = getLastParent(selectedShape)
    
    Dim design As New productDesign
    design.newProductDesign topMostGroup
    
    Dim layerOfSelectedShape As ProductDesignLayer
    
    For i = 1 To design.getLayers.count
        If design.getLayer2(i).layerShape Is selectedShape.parentGroup Then
            Set layerOfSelectedShape = design.getLayer2(i)
        End If
    Next i
    
    MsgBox "Die Form '" & Globals.getShapeDisplayName(selectedShape) & "' wurde " & IIf(isShapePlacedBySubJob(selectedShape, layerOfSelectedShape, foundSubJob, , , , , , , logger), "", "nicht ") & " vom SubJob '" & foundSubJob.name & "' platziert"
    
    logger.removeTab
    
End Sub



Private Function isShapePlacedBySubJob(shape As shape, layer As ProductDesignLayer, subJob As PlaceFileSubJob, Optional ignoreShapeName As Boolean = False, Optional ignoreShapeFillColor As Boolean = False, _
        Optional ignoreShapeOutlineColor As Boolean = False, Optional ignoreLayerGravingOrPrint As Boolean = False, Optional ignoreShapeSize As Boolean = False, Optional ignoreOriantation As Boolean = False, _
        Optional logger As logger) As Boolean
    
    If Not logger Is Nothing Then
        logger.logINFO "[PlaceFile.isShapePlacedBySubJob] shape name: '" & Globals.getShapeDisplayName(shape) & "', layerIndex: " & layer.getLayerIndex & ", Job: " & subJob.parentJob.name
        logger.addTab
    End If
    
    
    ' Wenn der subJob eine Form erstellen soll,
    ' prüfen, ob shape den selben Formtypen hat
    If Not subJob.shapeType = 0 Then ' Wenn der subJob eine Form erstellen/platzieren soll, dann ist diese nicht 0
        If Not subJob.shapeType = Globals.getShapesRealShapeType(shape) Then
            If Not logger Is Nothing Then logger.logFINER "Der Formtyp vom subjob(" & Globals.getShapeTypeName(subJob.shapeType) & ") ist nicht der selbe wie der vom shape(" & Globals.getShapeTypeName(Globals.getShapesRealShapeType(shape)) & ")"
            GoTo ExitFunction ' Return False
        End If
    End If
    
    
    ' Formname prüfen
    ' ------------------------------
    If Not ignoreShapeName Then
        Dim regex As New RegExp
    
        If subJob.groupPlacedShapes And subJob.addGroupChildCountToGroupName Then
            
            regex.Pattern = subJob.getRegexPatternForGroupedShapesWithNumber()
            If Not logger Is Nothing Then logger.logFINER "Vergleiche SubJob Regex " & regex.Pattern & " mit " & placedShapeName & ""
            
            If Not regex.Test(placedShapeName) Then
                If Not logger Is Nothing Then logger.logFINER "Name passt nicht"
                GoTo ExitFunction
            Else
                If Not logger Is Nothing Then logger.logFINER "Name passt"
            End If
            
        Else
            Dim currentSubJobShapeName As String
            currentSubJobShapeName = subJob.getNameForPlacedShape
        
            If Not logger Is Nothing Then logger.logFINER "Vergleiche SubJob Name '" & currentSubJobShapeName & "' mit '" & shape.name & "'"
        
            If Not (currentSubJobShapeName = Globals.removeKeywordsFromName(shape.name) Or currentSubJobShapeName = Globals.removeKeywordsFromName(Globals.getShapeNameLong(shape))) Then
                If Not logger Is Nothing Then logger.logFINER "Name passt nicht"
                GoTo ExitFunction
            Else
                If Not logger Is Nothing Then logger.logFINER "Name passt"
            End If
            
        End If
    End If
    ' ------------------------------


    
    ' Farben prüfen
    ' -------------------------------------------
    
    If subJob.isShapeColorIsAutoRedOrPink Then
        
        ' Betrifft eig. auch die Füllfarbe. Aber wenn eine Form rot/pink ist hat sie nie eine Füllfarbe. Deshalb kann das ignoriert werden
        If Not ignoreShapeOutlineColor Then
            If Not Globals.isRedOrPinkShape(shape) Then
                If Not logger Is Nothing Then logger.logFINER "Der SubJob färbt seine platzierte Form automatisch in rot oder pink ein. Die angegebene Form ist aber nicht rot oder pink"
                GoTo ExitFunction ' Return False
            End If
        End If
        
    Else
        
        If Not ignoreShapeFillColor Then
            ' Job hat Füllung
            If Not subJob.shapeColor Is Nothing Then
                
                If shape.CanHaveFill Then
                    If Not shape.fill.Type = cdrUniformFill Then
                        If Not logger Is Nothing Then logger.logFINER "Der SubJob hat eine Füllung. Die Form hat aber keine Füllung! Exit"
                        GoTo ExitFunction ' Return False. Shape hat keine (passende) Füllung
                    End If
                Else
                    If Not logger Is Nothing Then logger.logFINER "Der SubJob hat eine Füllung. Der Form-Typ kann keine Füllung haben! Exit"
                    GoTo ExitFunction ' Return False. Shape hat keine Füllung
                End If
                
            Else ' Job hat keine Füllung
                
                If shape.CanHaveFill Then
                    If shape.fill.Type = cdrUniformFill Then
                        If Not logger Is Nothing Then logger.logFINER "Der SubJob hat keine Füllung. Die Form ist aber gefüllt! Exit"
                        GoTo ExitFunction ' Return False. Shape hat eine (passende) Füllung
                    End If
                End If
            End If
        End If
        
        
        If Not ignoreShapeOutlineColor Then
            ' Job hat Outline
            If Not subJob.shapeColorOutline Is Nothing Then
                
                If shape.CanHaveOutline Then
                    If Not shape.outline.Type = cdrOutline Then
                        If Not logger Is Nothing Then logger.logFINER "Der SubJob hat eine Outline. Die Form hat aber keine Outline! Exit"
                        GoTo ExitFunction ' Return False. Shape hat keine (passende) Outline
                    End If
                Else
                    If Not logger Is Nothing Then logger.logFINER "Der SubJob hat eine Outline. Der Form-Typ kann keine Outline haben! Exit"
                    GoTo ExitFunction ' Return False. Shape hat keine Outline
                End If
            
            Else ' Job hat keine Outline
                If shape.CanHaveOutline Then
                    If shape.outline.Type = cdrOutline Then
                        If Not logger Is Nothing Then logger.logFINER "Der SubJob hat keine Outline. Die Form hat aber eine Outline! Exit"
                        GoTo ExitFunction ' Return False. Shape hat eine (passende) Outline
                    End If
                End If
            
            End If
        End If
        
    End If
    ' -------------------------------------------
    
    
    ' Prüfen, ob der SubJob auf gravur und oder uv platzieren würde
    ' ------------------------------------------
    If Not ignoreLayerGravingOrPrint Then
        If layer.isGraving Then
            If Not subJob.placeOnGravingLayers Then
                If Not logger Is Nothing Then logger.logFINER "Der Layer ist ein Gravur-Layer. Der Job lässt sich aber nicht auf Gravur-Layern platzieren"
                GoTo ExitFunction ' Return False
            End If
        Else
            If Not subJob.placeOnPrintLayers Then
                If Not logger Is Nothing Then logger.logFINER "Der Layer ist ein UV-Layer. Der Job lässt sich aber nicht auf UV-Layern platzieren"
                GoTo ExitFunction ' Return False
            End If
        End If
    End If
    ' ------------------------------------------
    
    
    ' Größe prüfen
    ' -------------------------------
    If Not ignoreShapeSize Then
        If Not (subJob.widthToPutOnMax = 0 Or subJob.heightToPutOnMax = 0) Then
            
            Dim doc As document
            Set doc = shape.page.parent.parent
            
            If Not logger Is Nothing Then logger.logFINER "Vergleiche Größen - minWidth: " & subJob.widthToPutOnMin & ", shapeWidth: " & doc.FromUnits(shape.SizeWidth, cdrMillimeter) & ", maxWidth: " & subJob.widthToPutOnMax & _
                ", minHeight: " & subJob.heightToPutOnFoundShapesMin & ", shapeHeight: " & doc.FromUnits(shape.SizeHeight, cdrMillimeter) & ", maxHeight: " & subJob.heightToPutOnMax
            
            If Not (doc.FromUnits(shape.SizeWidth, cdrMillimeter) >= subJob.widthToPutOnMin And doc.FromUnits(shape.SizeWidth, cdrMillimeter) <= subJob.widthToPutOnMax _
                    And doc.FromUnits(shape.SizeHeight, cdrMillimeter) >= subJob.heightToPutOnFoundShapesMin And doc.FromUnits(shape.SizeHeight, cdrMillimeter) <= subJob.heightToPutOnMax) Then
                GoTo ExitFunction ' Return False
            End If
        Else
            If Not logger Is Nothing Then logger.logFINER "Größen müssen nicht verglichen werden. Denn die maximale Breite oder Höhe hat den Wert 0. Die Größe ist also egal"
        End If
    End If
    ' -------------------------------
    
    
    ' Orientierung (Horizontal oder Vertikal)
    ' -------------------------------
    If Not ignoreOriantation Then
        If Not isOrientationValid(shape.boundingBox, subJob) Then
            If Not logger Is Nothing Then logger.logFINER "Die Orientierung ist falsch"
            GoTo ExitFunction ' Return False
        End If
    End If
    ' -------------------------------
    
    ' Wenn alle Checks bis hier hin positiv waren, dann ist das 'shape' durch den 'subJob' platziert worden
    isShapePlacedBySubJob = True
    

ExitFunction:
    If Not logger Is Nothing Then
        logger.logFINER "Return " & isShapePlacedBySubJob
        logger.removeTab
    End If
End Function



Private Function processShape(shape As shape)
    
    If Not logger Is Nothing Then
        logger.logINFO "[PlaceFile.processShape] shape: '" & Globals.getShapeDisplayName(shape) & "'"
        logger.addTab
    End If
    
    Dim currentDesign As shape
    Set currentDesign = shape
    
    If currentDesign.Type = cdrGroupShape Then
        
        ' Design Init
        ' ---------------------------
        Dim productDesign As New productDesign
        productDesign.newProductDesign currentDesign
        
        Set placedShapes = New shapeRange
        ' ---------------------------
        
        If productDesign.isRedDesignToIgnore Then GoTo ExitFunction ' Design ignorieren
        
        
        ' Wenn ein Job ausgewählt wurde
        ' :::::::::::::::::::::::::::::
        If Not selectedJob Is Nothing Then
            
            For i = 1 To productDesign.getLayers.count
                refreshTopLevelPlacedShapes productDesign.getLayers.getLayer(i)
            Next i
            

            processJobOnDesign selectedJob, productDesign
            
            
            ' Wenn zu einem Produkt eine neue Schicht hinzugefügt wurde, kann es sein, dass die neue Schicht links ist (somit ist es ein neues Part).
            ' Neue Schichten kommen aber immer nach hinten. Deshalb neu sortieren
            If selectedJob.name = "CDR" And selectedJob.subJobs.count > 0 Then
                If selectedJob.subJobs.item(1).mainShapeAddModee = CreateNewLayerOfNewMainShapes Then
                    productDesign.invalidateLayers ' Sicherheitshalbar
                    productDesign.sortParts
                End If
            End If
            
            
        ' Wenn kein Job ausgewählt wurde
        ' :::::::::::::::::::::::::::::
        Else
        
            ' Entfernen Modus
            processSubJobOnDesign Nothing, productDesign, 0
        End If
    End If
    
ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
End Function


Private Function processJobOnDesign(job As PlaceFileJob, productDesign As productDesign) As shapeRange
    
    If Not logger Is Nothing Then
        logger.logINFO "[PlaceFile.processJobOnDesign] job: '" & job.name & "', productID: '" & productDesign.getProductID & "'"
        logger.addTab
    End If
    
    job.jobsPlacingCounter = 0
    
    For i = 1 To job.jobs.count
        processJobOnDesign job.jobs(i), productDesign
    Next i
    
    If Not job.parent Is Nothing Then
        If job.parent.jobsPlacingCounter >= job.parent.jobsPlacingMaximumCount Then
            If Not logger Is Nothing Then logger.logINFO "Parentjob erlaubt keine weiteren Platzierungen für Child Jobs. Counter: '" & job.parent.jobsPlacingCounter & "', Maximum: '" & job.parent.jobsPlacingMaximumCount & "'"
            GoTo ExitFunction:
        End If
    End If
    
    
    job.resetPlaceMaximumCountCounters productDesign
            
    Dim placedShapesByCurrentSubJobOfJob As New shapeRange
    
    For k = 1 To job.subJobs.count
        
        ' Wenn der Modus 'Gruppen sind Designs' an ist, soll beim Modus CDR nicht auf die rote Form platziert werden, sondern auf die Boundingbox der Gruppe
        ' Das ist gut, wenn Designgruppen noch keine roten/pinken Formen haben
        ' -------------------------------------------------------
        If job.subJobs.item(k).parentJob.name = "CDR" Then
            If groupsAsDesigns Then
                job.subJobs.item(k).placeOnGroupBoundingBox = True
                job.subJobs.item(k).placeOnMainRedShape = False
            Else
                job.subJobs.item(k).placeOnGroupBoundingBox = False
                job.subJobs.item(k).placeOnMainRedShape = True
            End If
        End If
        ' -------------------------------------------------------
        
        
        placedShapesByCurrentSubJobOfJob.AddRange processSubJobOnDesign(job.subJobs.item(k), productDesign, (k))
        
    Next k
    
    
    ' Gruppieren der platzierten Dateien eines Jobs, also alles von seinen SubJobs
    ' A C H T U N G : Nicht zu verwechseln mit der Gruppierung, die Subjobs vornehmen
    If Not logger Is Nothing Then logger.logINFO "Job will platzierte SubJob Formen gruppieren: '" & job.groupPlacedShapesBySubJob & "'"
     If job.groupPlacedShapesBySubJob And Not placedShapesByCurrentSubJobOfJob.count = 0 Then

        Dim group As shape
        ' Ungueltige (durch boolesche Operationen ersetzte/geloeschte) Referenzen entfernen,
        ' sonst schlaegt das Gruppieren fehl (shapes.group => Nothing)
        Globals.removeDeletedShapeFromShapeRange placedShapesByCurrentSubJobOfJob
        Set group = Globals.groupShapes(placedShapesByCurrentSubJobOfJob)

        ' Schutz: Nur weiterverarbeiten, wenn das Gruppieren tatsaechlich eine Gruppe ergab
        If Not group Is Nothing Then

            If Not job.getGroupName = "" Then
                group.name = job.getGroupName
            End If


            ' Merken welche Formen platziert wurden (Ignoriert aber Childs von platzierten Gruppen)
            ' ----------------------------------------
            For i = 1 To productDesign.getLayers.count
                ' Herausfinden, in welchem Layer des Designs die soeben erstellte Gruppe 'group' drinsteckt.
                ' Denn die platzierten Formen der Subjobs des aktuellen Jobs können überall sein, somit auch die soeben erstellte Gruppe 'group'
                If Globals.isShapeChildOfGroup(group.parentGroup, productDesign.getLayer2(i).layerShape) Then
                    productDesign.getLayer2(i).topLevelPlacedShapes.add group
                    productDesign.getLayer2(i).topLevelPlacedShapesNames.add group.name
                    Exit For
                End If
            Next i
            ' ----------------------------------------
        End If

        
    End If
    
    If Not job.parent Is Nothing Then
        ' Prüfen, ob der Job (bzw. seine SubJobs) was platziert haben
        If placedShapesByCurrentSubJobOfJob.count > 0 Then
            job.parent.jobsPlacingCounter = job.parent.jobsPlacingCounter + 1
        End If
    End If
    Set placedShapesByCurrentSubJobOfJob = Nothing
    
ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
End Function


Private Function processSubJobOnDesign(subJob As PlaceFileSubJob, productDesign As productDesign, subJobIndex As Integer) As shapeRange
    
    Set processSubJobOnDesign = New shapeRange
    
    
    
    Dim i As Integer
    Dim iLimit As Integer
    If partModeVar = AllParts Then
        i = 1
        iLimit = productDesign.getPartsCount
    Else
        i = CInt(partModeVar) + 1
        iLimit = i
    End If
    
    
    ' I steht für die Parts
    While i <= iLimit
    
        If i > productDesign.getPartsCount Then
            MsgBox "Das Design enthält nur " & productDesign.getPartsCount & " Teile. Es kann nicht auf Teil " & i & " platziert werden!", vbCritical
            Globals.endMacro
        End If
    
        Dim j As Integer
        Dim jLimit As Integer
        If layerModeVar = allLayers Then
            j = 1
            jLimit = productDesign.getPart(i).count
        Else
            j = CInt(layerModeVar) + 1
            jLimit = j
        End If
    
        ' J steht für die Schichten
        While j <= jLimit
        
            If j > productDesign.getPart(i).count Then
                MsgBox "Das Teil Nr. " & i & " enthält nur " & productDesign.getPart(i).count & " Schichten. Es kann nicht auf Schicht " & j & " platziert werden!", vbCritical
                Globals.endMacro
            End If
            
            If deleteMode Then
                removeImagesOnLayer productDesign.getLayer(i, j).layerShape, productDesign.getLayer(i, j), subJob
            Else
                
                processSubJobOnDesign.AddRange placeImagesOnLayer(subJob, productDesign.getLayer(i, j), productDesign)
            End If
            
            j = j + 1
        Wend
        
        i = i + 1
    Wend
    
    If productDesign.getPartsCount = 0 Then
        'Kein echtes Produktdesign
        
        'Geht auch nicht, wenn man gerade erst die roten Formen platzieren will
    End If
    
End Function




Public Function refreshTopLevelPlacedShapes(layer As ProductDesignLayer)
    Set layer.topLevelPlacedShapesNames = New collection
    Set layer.topLevelPlacedShapes = layer.newCustomShapeTypeQuery(ExportableShape).setContinueSearchInMatchedGroups(False).search
    layer.topLevelPlacedShapes.AddRange layer.newCustomShapeTypeQuery(ByName).setContinueSearchInMatchedGroups(False).setArgument1("var_").setArgument2(StringStartsWith).search
    Globals.removeGroupChildShapesOfShapeRange layer.topLevelPlacedShapes
    
    Set layer.topLevelPlacedShapesNames = Globals.shapeRangeNamesToStringCollection(layer.topLevelPlacedShapes, False)
End Function




Public Function placeImagesOnLayer(subJob As PlaceFileSubJob, layer As ProductDesignLayer, productDesign As productDesign) As shapeRange
    Set placeImagesOnLayer = New shapeRange
    
    If Not logger Is Nothing Then
        logger.logINFO "[PlaceFile.placeImagesOnLayer] subJob: '" & subJob.getSubJobInfosForLogging & "'"
        logger.addTab
    End If
    
    
    ' Verhindern, dass etwas doppelt platziert wird
    ' ---------------------------------------------
'    If Not logger Is Nothing logger.logINFO "    Gucken, ob der Job '" & subJob.parentJob.name & "' schon platziert wurde:"
'    If Not logger Is Nothing logger.logINFO "        Vergleiche '" & Globals.collectionToString(layer.topLevelPlacedShapesNames) & "' mit '" & subJob.getTopLevelName & "'"
    If Globals.stringCollectionContains(layer.topLevelPlacedShapesNames, subJob.getTopLevelName, StringEquals) Then
        If Not logger Is Nothing Then logger.logFINE "Der Job '" & subJob.getTopLevelName & "' wurde schon platziert. Abbruch!"
        GoTo ExitFunction
    End If
    ' ---------------------------------------------
    
    
    ' Wenn das Limit zum Platzieren von Dateien erreicht ist
    If isJobPlaceMaximumReached(subJob, layer) Then GoTo ExitFunction

    ' Init
    Set placedShapesByCurrentSubJob = New shapeRange
    Set subJob.foundShapesToPlaceOn = New shapeRange  ' Alle vorher gefunden Formen löschen. Jetzt wird neu gesucht
    Set subJob.subtractFromFoundShapesToPlaceOn = New collection
    
    
    ' Abbrechen wenn der jetzige Layer eine Hauptform hat, auf die der SubJob nicht platzieren soll
    ' ------------------------------------------------------------------------
    If Not logger Is Nothing Then logger.logFINE "subJob.getProductShapeInfoToAvoid.count: " & subJob.getProductShapeInfoToAvoid.count
    For i = 1 To subJob.getProductShapeInfoToAvoid.count
        If Not logger Is Nothing Then logger.logFINER "Vergleiche: '" & subJob.getProductShapeInfoToAvoid(i).name & "' mit '" & ProductRecognizer.recognizeProductLayerName(layer) & "'"
        If ProductRecognizer.isLayerProduct(layer, subJob.getProductShapeInfoToAvoid(i)) Then
            If Not logger Is Nothing Then logger.logINFO "Der Job platziert nicht auf der Form " & subJob.getProductShapeInfoToAvoid(i).name & ". Abbruch!"
            GoTo ExitFunction
        End If
    Next i
    ' ------------------------------------------------------------------------
    
    
    ' Gucken ob der Layer der eines Produktes ist (layer vergleichen mit ProductShapeInfo)
    ' ::::::::::::::::::::::::::::
    If Not subJob.productShapeToPlaceOn Is Nothing Then
'        If Not logger Is Nothing Then logger.logINFO "    Bild soll anhand von ProductShapeInfo platziert werden. Gucken ob einer der Layer mit der ProductShapeInfo übereinstimmt"
        
        If ProductRecognizer.isLayerProduct(layer, subJob.productShapeToPlaceOn) Then
            
            If subJob.placeOnMainRedShape Then
                Dim shapeCopy As shape
                Set shapeCopy = Globals.copyPasteShape(layer.getMainShape, False)
                shapeCopy.name = "PlaceFile Hauptform_" & Globals.getTemporaryKeyWord ' Umbenennen, damit beim Fehlschlagen des Scriptes (Falls Acryllook oder so nicht gefunden wird) die Form in der 'cleanUp' gelöscht wird
                addFoundShape shapeCopy, subJob, layer.layerShape, layer, productDesign
            Else
                MsgBox "[PlaceFile.placeImagesOnLayer] Typ noch nicht unterstützt!", vbCritical
            End If
        End If
    
    
    ' Auf Hauptform platzieren
    ' ::::::::::::::::::::::::::::
    ElseIf subJob.placeOnMainRedShape Then
        If Not logger Is Nothing Then logger.logINFO "Bild soll auf Hauptform platziert werden"
        
        ' Wenn eine CDR platziert werden soll, ist es egal ob das Mainshape in ordnung ist
        ' Es kann sogar sein, dass ein kaputtes Mainshape dadurch ausgetauscht werden soll.
        ' Wenn aber "checkMainShape" ausgeführt wird, kommt eine Warnmeldung bei nicht geschlossenen Formen
        If Not subJob.parentJob.name = "CDR" Then
            checkMainShape layer
        End If
        
        If layer.getMainShape Is Nothing Then
            MsgBox "[PlaceFile.placeImagesOnLayer] Es wurde keine Hauptform erkannt!", vbCritical
            Globals.setViewAreaToShape layer.layerShape
            layer.layerShape.CreateSelection
            Globals.endMacro
        End If
        
        ' Es wird nur die Hauptform geprüft, da nur darauf platziert werden soll
        checkShapeAndPlaceImage layer.layerShape, layer.getMainShape, subJob, layer, productDesign, True, logger
        
        
    ' Auf der Beschnittzugabe der Hauptform platzieren
    ' ::::::::::::::::::::::::::::
    ElseIf subJob.p_placeOnMainRedShapeBleed Then
        If Not logger Is Nothing Then logger.logINFO "Bild soll auf der Beschnittzugabe der Hauptform platziert werden"
        
        checkMainShape layer
        
        Dim bleedSize As Double
        bleedSize = subJob.p_mainRedShapeBleedSizeInMM
        If bleedSize = -1 Then
            bleedSize = Globals.getDefaultBleedSizeInMM
        End If
        
        Dim bleedShape As shape
        Set bleedShape = Tool.createBleedForDesignLayer(layer, bleedSize, , , , False)
        
        checkShapeAndPlaceImage layer.layerShape, bleedShape, subJob, layer, productDesign, True
        
        bleedShape.delete
        Set bleedShape = Nothing
        
    ' Auf der Boundingbox platzieren
    ' (Wird eig. nur beim platzieren von CDRs genutzt, wenn die Option 'Gruppen sind Designs' an ist. Denn es gibt selten mal alte Designs ohne rote/pinke Formen. Da wird dann auf die Boundingbox platziert)
    ' ::::::::::::::::::::::::::::
    ElseIf subJob.placeOnGroupBoundingBox Then
        If Not logger Is Nothing Then logger.logINFO "Bild soll auf der Boundingbox platziert werden"
    
        If productDesign.getDesignShape.Type = cdrGroupShape Then
            
            
            Dim boundingBoxShapes As shapeRange
            Set boundingBoxShapes = productDesign.getDesignShape.shapes.All
            
            ' Artikelnummer ausschließen (TODO eig. alles was nicht zum Design gehört ausschließen)
            boundingBoxShapes.RemoveRange newCustomShapeTypeQuery(boundingBoxShapes, Globals.customShapeType.productID).search
            
            Dim boundingBoxShape As shape
            Set boundingBoxShape = ActiveLayer.CreateRectangleRect(boundingBoxShapes.boundingBox)
            Set boundingBoxShapes = Nothing
            
            subJob.foundShapesToPlaceOn.add boundingBoxShape
            checkPlacingAndPlaceImage productDesign.getDesignShape, boundingBoxShape, subJob, layer, productDesign
            
            boundingBoxShape.delete
            Set boundingBoxShape = Nothing
        End If
    
    
    ' Auf Hilfslinien-Form platzieren
    ' (Ist übergangsweise für Funkklingelmodelle. Soll in C# verbessert werden) ' TODO FK-SHOPIFY-QUICK
    ' ::::::::::::::::::::::::
    ElseIf subJob.placeOnBlueShape Then
        
        Dim blueShapes As shapeRange
        Set blueShapes = layer.newCustomShapeTypeQuery(GuideLineShapeType).search
        
        If Not subJob.shapeNameToPlaceOn = "" Then Set blueShapes = blueShapes.shapes.FindShapes(subJob.shapeNameToPlaceOn)
        
        Dim blueShape As shape
        For Each blueShape In blueShapes
            checkShapeAndPlaceImage layer.layerShape, blueShape, subJob, layer, productDesign, True
            
            If subJob.deleteShapeToPlaceOnAtEnd Then
                shapesToDeleteAtEnd.add blueShape
            End If
        Next blueShape
    
    
    ' Auf Form mit speziellen Namen platzieren
    ' ::::::::::::::::::::::::::::
    ElseIf Not subJob.shapeNameToPlaceOn = "" Then
        
        Dim shapesWithName As shapeRange
        Set shapesWithName = layer.layerShape.shapes.FindShapes(subJob.shapeNameToPlaceOn)
        
        Dim shapeWithName As shape
        For Each shapeWithName In shapesWithName
            checkShapeAndPlaceImage layer.layerShape, shapeWithName, subJob, layer, productDesign, True
            
            If subJob.deleteShapeToPlaceOnAtEnd Then
                shapesToDeleteAtEnd.add shapeWithName
            End If
        Next shapeWithName
        
    ' Formen suchen, auf der platziert werden soll (Kann mehrfach platziert werden)
    ' ::::::::::::::::::::::::::::
    Else
        If Not logger Is Nothing Then logger.logINFO "Bild soll auf keine spezielle Form platziert werden. Alle Formen ansehen..."
        
        ' Weil keine spezielle Form, auf der platziert werden soll (wie z.B: die Hauptform), wird zuerst jetzt nach einer passenden Form gesucht
        searchSpotsToPlaceImage layer.layerShape, subJob, productDesign, layer
    End If
    
    
    
    
    ' Platzierte Formen Ordern und Gruppieren
    ' -------------------------------------------------
    'Wenn es als neue Schicht hinzugefügt wurde, ist ordern und gruppieren nicht nötig
    If subJob.mainShapeAddModee <> CreateNewLayerOfNewMainShapes Then
        
        
        Dim group As shape
        If placedShapesByCurrentSubJob.count > 0 And subJob.groupPlacedShapes And placedShapesByCurrentSubJob.count >= subJob.groupPlacedShapesMinimumAmount Then
            'Hinzugefügte Formen gruppieren
                
            If Not logger Is Nothing Then logger.logFINE "Gruppiere Formen ... " & Globals.shapeRangeToString(placedShapesByCurrentSubJob)
                
            Set group = Globals.groupShapes(placedShapesByCurrentSubJob)
            placedShapesByCurrentSubJob.RemoveAll
            Globals.safeAddShapeToShapeRange group, placedShapesByCurrentSubJob
            
            If Not logger Is Nothing Then logger.logFINE "Fertig mit dem Gruppieren von Formen"
            
        End If

        If Not group Is Nothing Then
            placeImagesOnLayer.add group

            group.name = subJob.getNameForGroupingPlacedShapes(group)
            If Not logger Is Nothing Then logger.logINFO "Gruppe benannt zu '" & group.name & "'"
            
        Else
            placeImagesOnLayer.AddRange placedShapesByCurrentSubJob ' Auch einzelne (ungruppierte Formen) sollen evtl. vom parentJob gruppiert werden
        End If
        
        ' Ordern
        Dim shapeToPlace As shape
        If subJob.orderShapeAllBehind Then
            'Wenn hier ein Fehler auftritt, dann nur weil das 'layerShape' nur eine Form hatte: Die Hauptform, die gelöscht wurde, damit die neu hinzugeladene an ihre stelle tritt. Natürlich ist dann die gruppe 'layerShape' weg, weil das einzige Child gelöscht wurde
            Set shapeToPlace = layer.layerShape.shapes.Last ' Das letzte Shape in dem jetzigen Layer
        Else
            Set shapeToPlace = layer.layerShape.shapes.First ' Das erste Shape in dem jetzigen Layer
        End If
        '
        If Not placedShapesByCurrentSubJob.count = 0 Then
            If subJob.orderShapeAllBehind Then
                placedShapesByCurrentSubJob.OrderBackOf shapeToPlace
            Else
                placedShapesByCurrentSubJob.OrderFrontOf shapeToPlace
            End If

        End If

    End If
    ' -------------------------------------------------


    ' Boolesche Operation gegen die Formen des vorherigen SubJobs anwenden
    ' -------------------------------------------------
    applyBooleanOperationWithPreviousSubJob subJob, layer

    ' Falls eine boolesche Operation lief, wurden die Quellformen durch Ergebnisformen ersetzt
    ' (applyBooleanOperationWithPreviousSubJob hat placedShapesByCurrentSubJob aktualisiert).
    ' Die Rueckgabe fuer die Gruppierung durch den parentJob entsprechend nachziehen.
    If subJob.booleanOperationWithPreviousSubJob <> noOperation And subJob.mainShapeAddModee <> CreateNewLayerOfNewMainShapes And group Is Nothing Then
        placeImagesOnLayer.RemoveAll
        placeImagesOnLayer.AddRange placedShapesByCurrentSubJob
    End If

    ' Aktuelle Formen als Referenz für den nächsten SubJob merken
    Globals.removeDeletedShapeFromShapeRange placedShapesByCurrentSubJob
    Set layer.previousSubJobPlacedShapes = New shapeRange
    layer.previousSubJobPlacedShapes.AddRange placedShapesByCurrentSubJob
    ' -------------------------------------------------

ExitFunction:
    If Not logger Is Nothing Then logger.logINFO "Ende"
    If Not logger Is Nothing Then logger.removeTab
End Function


Private Function checkMainShape(layer As ProductDesignLayer)
    
    If layer.getMainShape Is Nothing Then
        MsgBox "Design wurde nicht erkannt! Wahrscheinlich ist keine rote oder pinke Form vorhanden oder es ist ein falscher Farbton.", vbCritical
        Globals.endMacro
    End If
    
    ' Texte ignorieren, denn diese haben nicht das Problem, dass der Pfad nicht geschlossen ist
    If Not layer.getMainShape.Type = cdrTextShape Then
    
        If Not layer.getMainShape.DisplayCurve.Closed Then
            Globals.setViewAreaToShape layer.getMainShape
            layer.getMainShape.CreateSelection
            MsgBox "Die rote/pinke Form ist nicht geschlossen!.", vbCritical
            Globals.endMacro
        End If
        
    End If
    
End Function



' Alle 'shapes' von 'Shape' werden (rekursiv) zur überprüfung and 'checkShapeAndPlaceImage' weitergeben
Public Function searchSpotsToPlaceImage(shape As shape, subJob As PlaceFileSubJob, productDesign As productDesign, layer As ProductDesignLayer)
    If Not logger Is Nothing Then
        logger.logINFO "[PlaceFile.searchSpotsToPlaceImage] shape: " & Globals.getShapeDisplayName(shape) & ", subJob: " & subJob.shapeName
        logger.addTab
    End If
    
    If subJob Is Nothing Then
        Err.Raise vbObjectError + 513, , "[PlaceFile.searchSpotsToPlaceImage] subJob ist Nothing"
    End If
    
    
    ' Speichert die Formen des Designs, bevor Formen platziert werden und alles durcheinander bringen (Ist nötig wegen rekursion)
    Dim allShapesExceptNewlyPlaced As shapeRange
    Set allShapesExceptNewlyPlaced = shape.shapes.All
    
    For i = 1 To allShapesExceptNewlyPlaced.count
        

'        MsgBox subJob.parentJob.name & ", " & subJob.shapeName & ", i=" & i & ", name=" & allShapesExceptNewlyPlaced(i).name
        
        If isJobPlaceMaximumReached(subJob, layer) Then GoTo ExitFunction
        
        ' Rekursiv weiter in den Childs der Gruppe suchen
        If allShapesExceptNewlyPlaced(i).Type = cdrGroupShape Then
            '                                                                       Nicht auf Varianten platzieren
            If Not isGroupHavingToManyShapes(allShapesExceptNewlyPlaced(i)) And Not Globals.isStaticVariant(allShapesExceptNewlyPlaced(i)) Then
                searchSpotsToPlaceImage allShapesExceptNewlyPlaced(i), subJob, productDesign, layer  ' Rekursion
            End If
        Else
            checkShapeAndPlaceImage layer.layerShape, allShapesExceptNewlyPlaced(i), subJob, layer, productDesign
        End If
        
    Next i
    
ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
End Function



'Überprüft, ob das gegebene "shape" zum subJob passt und platziert dann ein Bild oder eine Form darauf
Public Function checkShapeAndPlaceImage(layerShape As shape, shape As shape, subJob As PlaceFileSubJob, layer As ProductDesignLayer, productDesign As productDesign, Optional isShapeRedShape As Boolean = False, Optional logger As logger)
    
    If Not logger Is Nothing Then
        logger.logINFO "[PlaceFile.checkShapeAndPlaceImage] shape: '" & Globals.getShapeDisplayName(shape) & "'"
        logger.addTab
    End If
    
    ' Pinke und rote Farbe akzeptieren
    If Not (isShapeRedShape Or Globals.isOutlineColorRedOrPink(shape)) Then
        If Not logger Is Nothing Then logger.logINFO "Die Form 'shape' ist weder rot noch pink. Abbruch!"
        GoTo ExitFunction
    End If
    
    ' Prüfen, ob der Layer gravur oder uv ist und ob der Subjob das erlaubt
    If layer.isGraving Then
        If Not subJob.placeOnGravingLayers Then
            If Not logger Is Nothing Then logger.logFINE "Der Layer is ein gravur Layer aber der Job erlaubt keine Platzierung auf gravur Layern. Abbruch!"
            GoTo ExitFunction
        End If
    Else
        If Not subJob.placeOnPrintLayers Then
            If Not logger Is Nothing Then logger.logFINE "Der Layer is ein UV Layer aber der Job erlaubt keine Platzierung auf UV Layern. Abbruch!"
            GoTo ExitFunction
        End If
    End If
    
    If isJobPlaceMaximumReached(subJob, layer) Then
        If Not logger Is Nothing Then logger.logFINE "Die Maximalmenge an zu platzierenden Formen für den Job ist erreicht. Abbruch!"
        GoTo ExitFunction
    End If
    
    
    ' Area
    Dim area As Double
    
    ' Wenn die Haupform kein Text ist. Bei Text lässt sich nicht der Flächeninhalt messen
    If Not layer.getMainShape.Type = cdrTextShape Then
        
        If subJob.placeOnMainRedShape Then
            area = layer.getArea(True)
        Else
            area = Globals.getAreaOfShape(shape)
        End If
        If area = 0 Then
            If Not subJob.parentJob.name = "CDR" Then
                shape.CreateSelection
                MsgBox "Der Pfad ist nicht geschlossen oder doppelt vorhanden!", vbCritical
                Globals.endMacro
            End If
        End If
    End If
    
    
    Dim shapeCopy As shape
    
    
    If isShapeValid(shape, subJob, area, isShapeRedShape) Then
        ' Passende Form kopieren, denn alle gesammelten Formen werden am Ende gelöscht
        Set shapeCopy = Globals.copyPasteShape(shape, True)
        shapeCopy.name = "PlaceFile_" & subJob.parentJob.name & "_" & subJob.shapeName & "_" & Globals.getTemporaryKeyWord
        addFoundShape shapeCopy, subJob, layerShape, layer, productDesign
        
        Set shapeCopy = Nothing
        
        If Not logger Is Nothing Then logger.logFINE "Form zum Draufplatzieren gefunden. Nicht noch subPath untersuchen. Sonst doppelt. Abbruch!"
        
        ' Wenn schon was platziert wurde, sollte nicht nochmal der SubPath untersucht werden.
        ' Ansonsten würde der Klingelknopf auf der Form und dem SubPath platziert werden
        GoTo ExitFunction
    End If
    
    
    Dim alsoPlaceOnSubPaths As Boolean
    alsoPlaceOnSubPaths = subJob.subPathTypesToPutOn.count > 0
    
    
    If alsoPlaceOnSubPaths Then
        If shape.Type = cdrCurveShape Then
                For i = 1 To shape.curve.subPaths.count
                    
                    If isJobPlaceMaximumReached(subJob, layer) Then GoTo ExitFunction
                    
                    If isSubPathValid(shape.curve.subPaths(i).boundingBox, shape.curve.subPaths(i).area, subJob) And subJob.isSubPathOkToPlaceOn(shape.curve.subPaths(i)) Then
                        
                        Set shapeCopy = ActiveLayer.CreateCurve(shape.curve.subPaths(i).GetCopy)
                        shapeCopy.name = "PlaceFile_" & subJob.parentJob.name & "_" & Globals.getTemporaryKeyWord
                        addFoundShape shapeCopy, subJob, layerShape, layer, productDesign, IIf(subJob.subPathImageIntersectWithWholeShape, shape, Nothing)
    
                        Set shapeCopy = Nothing
                    End If
                    
                Next i
        
        ' Textformen haben keine 'DisplayCurve'. Deshalb werden diese erstmal ignoriert.
        ' Bisher soll ja nichts auf Textformen platziert werden.
        ' Man könnte aber eine Kopie der Textform zu Kurven umwandeln.
        ElseIf Not shape.Type = cdrTextShape Then
            For i = 1 To shape.DisplayCurve.subPaths.count
            
                If isJobPlaceMaximumReached(subJob, layer) Then GoTo ExitFunction
                
                ' Alle anderen Formen, außer Curve, haben noch keine echten Kurven, sondern nur die 'DisplayCurve'
                If isSubPathValid(shape.DisplayCurve.boundingBox, shape.DisplayCurve.area, subJob) And subJob.isSubPathOkToPlaceOn(shape.DisplayCurve.subPaths(i)) Then
                    Set shapeCopy = Globals.copyPasteShape(shape, True)
                    shapeCopy.name = "PlaceFile_" & subJob.parentJob.name & "_" & Globals.getTemporaryKeyWord
                    addFoundShape shapeCopy, subJob, layerShape, layer, productDesign, IIf(subJob.subPathImageIntersectWithWholeShape, shape, Nothing)
                    
                    Set shapeCopy = Nothing
                End If
            Next i
        End If

    End If
    
    
ExitFunction:
    If Not logger Is Nothing Then logger.removeTab
End Function



' Fügt eine passende Form zum Subjob hinzu.
' Wenn das Subjob dann genügend Formen zum Platzieren hat, wird auch platziert
Private Function addFoundShape(shapeCopy As shape, subJob As PlaceFileSubJob, layerShape As shape, layer As ProductDesignLayer, productDesign As productDesign, Optional subtractShape As shape = Nothing)
    
    If Not logger Is Nothing Then
        logger.logINFO "[PlaceFile.addFoundShape] shapeCopy: " & Globals.shapeToString(shapeCopy)
        logger.addTab
    End If
    
    ' Gefundene Form erstmal merken ...
    subJob.foundShapesToPlaceOn.add shapeCopy
    subJob.subtractFromFoundShapesToPlaceOn.add subtractShape
    
    ' ... wenn genügend Formen gefunden wurden zu platzieren, dann erst platzieren
    If subJob.foundShapesToPlaceOn.count >= subJob.minimumShapesToFind Then
    
        If isSizeOfShapesToPutOnValid(subJob) Then
            checkPlacingAndPlaceImage layerShape, shapeCopy, subJob, layer, productDesign
        End If
        
        
         ' Es kann vorkommen, dass in der ShapeRange "foundShapesToPlaceOn" Formen enthalten sind, die schon gelöscht wurden
        ' Z.B: Wenn
        Globals.removeDeletedShapeFromShapeRange subJob.foundShapesToPlaceOn
        
        ' Alle vorher gefunden Formen löschen. Denn die passende Anzahl wurde erfüllt. Jetzt wird (neu) weitergesucht
        subJob.foundShapesToPlaceOn.delete
        
        Set subJob.foundShapesToPlaceOn = New shapeRange
    End If
    
    If Not logger Is Nothing Then logger.removeTab
End Function



Private Function isShapeValid(shape As shape, subJob As PlaceFileSubJob, _
    area As Double, isShapeRedShape As Boolean)
    
    If Not (subJob.isShapeOkToPlaceOn(shape)) Then ' B
        Exit Function
    End If
    
    If Not isSizeValid(shape.boundingBox, subJob) Then
        Exit Function
    End If
    
    If Not isOrientationValid(shape.boundingBox, subJob) Then
        Exit Function
    End If
    
    If Not isAreaValid(area, subJob) Then
        Exit Function
    End If
    
    isShapeValid = True
End Function



Private Function isSubPathValid(boundingBox As rect, area As Double, subJob As PlaceFileSubJob)

    If Not isSizeValid(boundingBox, subJob) Then
        Exit Function
    End If
    
    If Not isOrientationValid(boundingBox, subJob) Then
        Exit Function
    End If
    
    If Not isAreaValid(area, subJob) Then
        Exit Function
    End If
    
    isSubPathValid = True
End Function



Private Function isSizeOfShapesToPutOnValid(subJob As PlaceFileSubJob)
    If Not logger Is Nothing Then logger.addTab , "[PlaceFile.isSizeOfShapesToPutOnValid]"
    
    ' TODO Die Größe der foundShapesToPlaceOn ist nicht Unitabhängig (Bei 'isSizeValid' schon)
    
    ' Prüfen, ob die Größe für meherere gefundene Formen passt. Wenn keine maximale Größe angeben wurde, wird diese Option ignoriert
    If (subJob.widthToPutOnFoundShapesMax = 0 And subJob.heightToPutOnFoundShapesMax = 0) Or _
        (subJob.foundShapesToPlaceOn.SizeWidth >= subJob.widthToPutOnFoundShapesMin And subJob.foundShapesToPlaceOn.SizeWidth <= subJob.widthToPutOnFoundShapesMax And _
        subJob.foundShapesToPlaceOn.SizeHeight >= subJob.heightToPutOnFoundShapesMin And subJob.foundShapesToPlaceOn.SizeHeight <= subJob.heightToPutOnFoundShapesMax) Then
        
        isSizeOfShapesToPutOnValid = True
    End If
    
    If Not logger Is Nothing Then
        logger.logINFO "Returne '" & isSizeOfShapesToPutOnValid & "'"
        logger.removeTab
    End If
End Function

' Vergleicht die Größe eines Shapes einer Curve oder eines SubPaths mit der Einstellung des SubJobs
Private Function isSizeValid(boundingBox As rect, subJob As PlaceFileSubJob) As Boolean
    If Not logger Is Nothing Then logger.addTab , "[PlaceFile.isSizeValid]"
    
    ' Wenn es der Größe entspricht oder wenn keine angeben wurde
    Let realWidth = ActiveDocument.FromUnits(boundingBox.width, cdrMillimeter)
    Let realHeight = ActiveDocument.FromUnits(boundingBox.height, cdrMillimeter)
    
    If Not logger Is Nothing Then logger.logINFO "widthToPutOnMin: '" & subJob.widthToPutOnMin & "', widthToPutOnMax: '" & subJob.widthToPutOnMax & "', heightToPutOnMin: '" & subJob.heightToPutOnMin & "', heightToPutOnMax: '" & subJob.heightToPutOnMax & "', boundingBoxWidth: '" & realWidth & "', boundingBoxHeight: '" & realHeight & "'"
    
    If (subJob.widthToPutOnMax = 0 Or subJob.heightToPutOnMax = 0) Or _
        (realWidth >= subJob.widthToPutOnMin And realWidth <= subJob.widthToPutOnMax _
        And realHeight >= subJob.heightToPutOnMin And realHeight <= subJob.heightToPutOnMax) Then
        
        isSizeValid = True
    End If
    
    If Not logger Is Nothing Then
        logger.logINFO "Returne " & isSizeValid
        logger.removeTab
    End If
End Function


' Vergleicht die Orientierung (Horizontal oder Vertikal) eines Shapes einer Curve oder eines SubPaths mit der Einstellung des SubJobs
Private Function isOrientationValid(boundingBox As rect, subJob As PlaceFileSubJob)
    
    ' Horizontal oder Vertikal
    If subJob.placeOnHorizontalShapes And subJob.placeOnVerticalShapes Or (Not subJob.placeOnHorizontalShapes And Not subJob.placeOnVerticalShapes) Then
        isOrientationValid = True
        
    ' Horizontal
    ElseIf subJob.placeOnHorizontalShapes Then
        If (boundingBox.width - boundingBox.height) >= -(boundingBox.width * subJob.placeOnHorizontalShapesTollerancePercent) Then
            isOrientationValid = True
        End If
    
    ' Vertikal
    ElseIf subJob.placeOnVerticalShapes Then
        If boundingBox.height > boundingBox.width Then
            isOrientationValid = True
        End If
    End If
End Function


Private Function isAreaValid(area As Double, subJob As PlaceFileSubJob)
        
    If subJob.areaToPutOnMin = 0 Then
        isAreaValid = True
    Else
    
        isAreaValid = area >= subJob.areaToPutOnMin And area <= subJob.areaToPutOnMax
    End If
End Function





' Prüft, wie und was auf dem gegebenen "shape" platziert werden soll. Z.B: Eine Bilddatei (CDR oder PNG z.B.) oder eine neue Form (Kreis etc.)
' Das 'Shape' muss ByValue angegben werden da hier das Shape nochmal neu gesetzt wird, wenn eine Kopie davon erstellt wird. Weiter oben im Code ist die Referez dann aber auch mit der Kopie überschrieben
Private Function checkPlacingAndPlaceImage(designShape As shape, ByVal shape As shape, subJob As PlaceFileSubJob, layer As ProductDesignLayer, productDesign As productDesign)
    
    If Not logger Is Nothing Then
        logger.logINFO "[PlaceFile.checkPlacingAndPlaceImage] shape: " & Globals.shapeToString(shape)
        logger.addTab
    End If
    
    If subJob.fillShape Then
        fillImage shape, subJob, designShape, layer
    ElseIf Not subJob.shapeType = 0 Then
        placeShapeAt designShape, subJob.foundShapesToPlaceOn, subJob, layer
        'placeShapeAt designShape, Globals.shapeToShapeRange(Shape), subJob, layer ' TODO muss bei Roter Rahmen genutzt werden
    
    'Wenn eine 'shapeColor' oder 'shapeColorOutline' vorhanden ist, heißt das, dass eine Form erstellt werden soll
    ElseIf Not subJob.shapeColor Is Nothing Or Not subJob.shapeColorOutline Is Nothing Then
    
        placeShapeClone designShape, shape, subJob, layer, productDesign
        
    Else
        'MsgBox "PlaceImageAt"
        If subJob.foundShapesToPlaceOn.count = 0 Then
            Dim mainShapeToPlaceOn As New shapeRange
            mainShapeToPlaceOn.add layer.getMainShape
            placeImageAt designShape, mainShapeToPlaceOn, subJob, layer, productDesign
        Else
            placeImageAt designShape, subJob.foundShapesToPlaceOn, subJob, layer, productDesign
        End If
        
    End If
    
    
    If Not logger Is Nothing Then logger.removeTab
End Function



Private Function isJobPlaceMaximumReached(subJob As PlaceFileSubJob, layer As ProductDesignLayer) As Boolean
    
    If Not logger Is Nothing Then
        logger.logINFO "[PlaceFile.isJobPlaceMaximumReached] job: '" & subJob.parentJob.name & "'"
        logger.addTab
    End If
    
    
    If Not logger Is Nothing Then logger.logFINE "Job-Counter: '" & subJob.parentJob.getPlaceMaximumCountCountersValueByLayer(layer) & "', Job-Limit: '" & subJob.parentJob.placeMaximumCount & _
        "', SubJob-Counter: '" & subJob.getPlaceMaximumCountCountersValueByLayer(layer) & "', SubJob-Limit: '" & subJob.placeMaximumCount & "'"
    isJobPlaceMaximumReached = subJob.parentJob.getPlaceMaximumCountCountersValueByLayer(layer) >= subJob.parentJob.placeMaximumCount Or subJob.getPlaceMaximumCountCountersValueByLayer(layer) >= subJob.placeMaximumCount
    
    
    
    If Not logger Is Nothing Then
        logger.logFINE "Return: " & isJobPlaceMaximumReached
        logger.removeTab
    End If
End Function



' Kopiert das MainShape? (oder auch andere?) und färbt es, ändert die Transparenz, verschiebt den Pfad, etc.
Private Function placeShapeClone(designShape As shape, shape As shape, subJob As PlaceFileSubJob, layer As ProductDesignLayer, productDesign As productDesign)
    
    If Not logger Is Nothing Then
        logger.addTab , "[PlaceFile.placeShapeClone] shape: " & Globals.shapeToString(shape)
    End If
    
    If shape Is Nothing Then Err.Raise vbObjectError + 513, , "[Globals.getParentShapes] 'shape' ist Nothing "
    
    Dim originalShape As shape
    Set originalShape = shape
    
   
    
    'TODO pathOffset oder das Erstellen einer Beschittzugabe für das mainShape entfernen. Nur eines sollte genutzt werden
    
    If Not subJob.pathOffset = 0 Then
        If Not logger Is Nothing Then logger.logFINE "Erstelle Offset von Form. Offset: " & subJob.pathOffset
        Set shape = Globals.offsetPath(shape, subJob.pathOffset, , subJob.pathOffsetCornerType)
    Else
        If Not logger Is Nothing Then logger.logFINE "Erstelle Kopie von Form"
        Set shape = Globals.copyPasteShape(shape, False)
    End If
    If Not logger Is Nothing Then logger.logFINE "Shape ist jetzt: " & Globals.shapeToString(shape)
    
    
    nameShape shape, subJob
    
    If subJob.subtractSmallerShapes Then
        Set shape = subtractSmallerRedOrPinkShapes(layer, shape, subJob)
    End If
    
    
    If subJob.orderShapeAllBehind Then
        shape.OrderBackOf designShape.shapes.Last
    Else
        shape.OrderFrontOf originalShape
    End If
    
    
    ' Platzierte Datei als neue Schicht hinzufügen
    If subJob.mainShapeAddModee = CreateNewLayerOfNewMainShapes Then
        Set shape = Tools.createGroupFunction(shape)
        layer.addShape shape, subJob.mainShapeAddModee
    End If
      
    
    If Not subJob.transparency = 0 Then
        shape.transparency.ApplyUniformTransparency subJob.transparency
    End If
    
    
    roundCornersIfNeeded shape, subJob
    colorizeShape shape, subJob, layer
    
    
    addPlacedShape shape, subJob, layer
    
    If Not logger Is Nothing Then logger.removeTab
End Function



Private Function placeShapeAt(designShape As shape, shapesToCenter As shapeRange, subJob As PlaceFileSubJob, layer As ProductDesignLayer)
    
    If Not logger Is Nothing Then
        logger.logINFO "[PlaceFile.placeShapeAt]"
        logger.addTab
    End If
    
    If subJob.shapeType = cdrRectangleShape Then
        placeRectangleAt designShape, shapesToCenter, subJob, layer
    ElseIf subJob.shapeType = cdrEllipseShape Then
        placeCircleAt shapesToCenter, subJob, layer
    End If
    
    
    If Not logger Is Nothing Then logger.removeTab
End Function





Private Function placeRectangleAt(designShape As shape, shapesToCenter As shapeRange, subJob As PlaceFileSubJob, layer As ProductDesignLayer)
    
    If Not logger Is Nothing Then
        logger.logINFO "[PlaceFile.placeRectangleAt]"
        logger.addTab
    End If
    
    
    Dim rect As shape
    ' Größe über getWidth/getHeight (wie bei placeCircleAt). Bei der Standard-Größenart
    ' (shapeToPutOnSizeType) ergibt das die Größe der Form, auf der platziert wird -> unverändertes Verhalten.
    ' Mit setWidth/setHeight lässt sich eine konkrete Größe (z.B. 10x10 mm) setzen.
    Set rect = ActiveLayer.CreateRectangle(0, 0, subJob.getWidth(shapesToCenter, Nothing), subJob.getHeight(shapesToCenter, Nothing))
    
    positionShape rect, shapesToCenter, subJob
    roundCornersIfNeeded rect, subJob
  
    If subJob.subtractSmallerShapes Then
        Set rect = subtractSmallerRedOrPinkShapes(layer, rect, subJob)
    End If
    
    colorizeShape rect, subJob, layer
    nameShape rect, subJob
    
    
    
    addPlacedShape rect, subJob, layer
    
    If Not logger Is Nothing Then logger.removeTab
End Function





Private Function placeCircleAt(shapesToCenter As shapeRange, subJob As PlaceFileSubJob, layer As ProductDesignLayer)

    If Not logger Is Nothing Then
        logger.logINFO "[PlaceFile.placeCircleAt]"
        logger.addTab
    End If
    
    Dim ellipse As shape
    Set ellipse = ActiveLayer.CreateEllipse(0, 0, subJob.getWidth(shapesToCenter, Nothing), subJob.getHeight(shapesToCenter, Nothing))

    positionShape ellipse, shapesToCenter, subJob
    
    colorizeShape ellipse, subJob, layer
    nameShape ellipse, subJob

    addPlacedShape ellipse, subJob, layer

    If Not logger Is Nothing Then logger.removeTab
End Function





Private Function roundCornersIfNeeded(shape As shape, subJob As PlaceFileSubJob)
    
    If Not subJob.roundCornersInMM = 0 Then
        shape.Fillet subJob.roundCornersInMM
    End If
    
End Function




Public Function colorizeShape(shape As shape, subJob As PlaceFileSubJob, layer As ProductDesignLayer)
    
    
    
    Dim outlineColor As color: Set outlineColor = subJob.shapeColorOutline
    
    'Herausfinden, ob die Form rot/pink sein soll
    If subJob.isShapeColorIsAutoRedOrPink Then
        
        Dim mainShape As shape: Set mainShape = layer.getMainShape
        
        If Not mainShape Is Nothing Then
            Set outlineColor = mainShape.outline.color
        Else
            Set outlineColor = CreateRGBColor(255, 0, 0) 'Wenn kein Mainshape vorhanden ist, einfach rot nehmen
        End If
        
    End If


    If subJob.shapeColor Is Nothing Then
        shape.fill.ApplyNoFill
    Else
        shape.fill.ApplyUniformFill subJob.shapeColor
    End If
    
    If outlineColor Is Nothing Then
        shape.outline.SetNoOutline
    Else ' TODO Globals.getHairlineThickness ist falsch, wahrscheinlich wegen der Unit umrechnung
        shape.outline.SetPropertiesEx Globals.getHairlineThickness, OutlineStyles(0), outlineColor, ArrowHeads(0), ArrowHeads(0), cdrFalse, cdrFalse, cdrOutlineButtLineCaps, cdrOutlineMiterLineJoin, 0#, 100, MiterLimit:=5#, Justification:=cdrOutlineJustificationMiddle
    End If
End Function




Public Function nameShape(shape As shape, subJob As PlaceFileSubJob)
    If Not logger Is Nothing Then
        logger.logINFO "[PlaceFile.nameShape] shape: '" & Globals.getShapeDisplayName(shape) & "'"
        logger.addTab
    End If
    
    
    If subJob.emtpyShapeName Then
        shape.name = ""
    ElseIf Not subJob.shapeName = vbNullString Then
        
        shape.name = subJob.getNameForPlacedShape  'TODO geht nicht. Name bleibt leer bei 'Variante Rahmen'
        
        If Not logger Is Nothing Then logger.logFINE "Shape umbenannt zu '" & shape.name & "'"
    Else
        ' Name soll bleiben. Deshalb muss aber unbedingt der tmp Marker weg, da sonst die Form gelöscht wird
        Globals.markShape shape, Globals.getTemporaryKeyWord, True, False
    End If
    
    If Not logger Is Nothing Then logger.removeTab
End Function


Private Function sizeShape(shape As shape, shapesToCenter, subJob As PlaceFileSubJob)
    
    Dim shapesToCenterRange As New shapeRange
    
    If shapesToCenter Is shape Then
        shapesToCenterRange.add shapesToCenter
    Else ' ShapeRange
        shapesToCenterRange.AddRange shapesToCenter
    End If
    
    shape.SetBoundingBox shape.LeftX, shape.TopY, subJob.getWidth(shapesToCenterRange, shape), subJob.getHeight(shapesToCenterRange, shape), False, cdrCenter
End Function


Private Function positionShape(shape As shape, shapesToCenter, subJob As PlaceFileSubJob)
    If Not logger Is Nothing Then logger.addTab , "[PlaceFile.positionShape]"
'    MsgBox "shapeToCenter=" & shapeToCenter.name

    Dim shapesToCenterRange As New shapeRange
    
    If shapesToCenter Is shape Then
        shapesToCenterRange.add shapesToCenter
    Else ' ShapeRange
        If shapesToCenter.count = 0 Then
            Err.Raise vbObjectError + 513, , "[PlaceFile.positionShape] shapesToCenter ist leer"
        End If
        shapesToCenterRange.AddRange shapesToCenter
    End If
    
     shape.Move _
        (shapesToCenterRange.centerX + ((shapesToCenterRange.SizeWidth / 2 * subJob.alignXTarget))) - (shape.centerX + (shape.SizeWidth / 2# * subJob.alignX) + (ConvertUnits(subJob.alignXOffset, cdrMillimeter, ActiveDocument.unit))), _
        (shapesToCenterRange.centerY + ((shapesToCenterRange.SizeHeight / 2 * subJob.alignYTarget))) - (shape.centerY + (shape.SizeHeight / 2# * subJob.alignY) + (ConvertUnits(subJob.alignYOffset, cdrMillimeter, ActiveDocument.unit)))
    
    If Not logger Is Nothing Then logger.removeTab
End Function


' Subtrahiert die kleineren roten Formen (Bohrlöcher etc. die im "designShape" stecken) vom gegebenen "shapeToSubtract"
' Rote Formen von Varianten (wie Bohrlöcher) werden ignoriert
Public Function subtractSmallerRedOrPinkShapes(layer As ProductDesignLayer, shapeToSubtract As shape, subJob As PlaceFileSubJob) As shape
    
    Dim smallerRedOrPinkShapes As shapeRange
    Set smallerRedOrPinkShapes = layer.getSmalerRedOrPinkShapes
    
    smallerRedOrPinkShapes.RemoveRange subJob.foundShapesToPlaceOn
    
    If Not smallerRedOrPinkShapes Is Nothing Then
        For i = 1 To smallerRedOrPinkShapes.count
            On Error GoTo SubtractError:
            Set shapeToSubtract = Globals.subtractShape(smallerRedOrPinkShapes.item(i), shapeToSubtract)
            On Error GoTo 0
            
        Next i
    End If
    
    Set subtractSmallerRedOrPinkShapes = shapeToSubtract
    Exit Function
    
SubtractError:
    MsgBox "Ein Fehler ist beim subtrahieren von 2 Formen aufgetreten! Es kann sein, dass die Hauptform(rot/pink) 2 mal vorhanden ist!" & vbNewLine & "Fehler: " & Err.Description, vbCritical
    Globals.endMacro
End Function



' Verrechnet die vom aktuellen SubJob platzierten Formen ('placedShapesByCurrentSubJob') mit den Formen,
' die der vorherige SubJob auf derselben Schicht platziert hat ('layer.previousSubJobPlacedShapes').
' Die aktuellen Formen sind die Quelle (z.B. das schneidende Werkzeug), die vorherigen die Ziele.
Private Function applyBooleanOperationWithPreviousSubJob(subJob As PlaceFileSubJob, layer As ProductDesignLayer)

    If subJob.booleanOperationWithPreviousSubJob = noOperation Then Exit Function
    If layer.previousSubJobPlacedShapes Is Nothing Then Exit Function
    If layer.previousSubJobPlacedShapes.count = 0 Then Exit Function
    If placedShapesByCurrentSubJob.count = 0 Then Exit Function

    If Not logger Is Nothing Then
        logger.logINFO "[PlaceFile.applyBooleanOperationWithPreviousSubJob] operation: " & subJob.booleanOperationWithPreviousSubJob
        logger.addTab
    End If

    Globals.removeDeletedShapeFromShapeRange layer.previousSubJobPlacedShapes

    Dim targets As New shapeRange
    targets.AddRange layer.previousSubJobPlacedShapes

    Dim s As Integer, t As Integer
    For s = 1 To placedShapesByCurrentSubJob.count
        Dim sourceShape As shape
        Set sourceShape = placedShapesByCurrentSubJob(s)

        ' 'leaveSource' wird hier bewusst True gehalten, damit die Quelle mehrere Ziele bearbeiten kann,
        ' ohne dazwischen ungültig zu werden. Am Ende wird sie ggf. selbst gelöscht.
        Dim newTargets As New shapeRange
        For t = 1 To targets.count
            Dim targetShape As shape
            Set targetShape = Nothing

            Select Case subJob.booleanOperationWithPreviousSubJob
                Case subtractOperation
                    Set targetShape = Globals.subtractShape(sourceShape, targets(t), True, subJob.booleanOperationLeaveTarget, logger)
                Case intersectOperation
                    Set targetShape = Globals.intersectShapes(sourceShape, targets(t), True, subJob.booleanOperationLeaveTarget, , logger)
                Case combineOperation
                    Set targetShape = Globals.combineShapes(sourceShape, targets(t), True, subJob.booleanOperationLeaveTarget)
            End Select

            If Not targetShape Is Nothing Then newTargets.add targetShape
        Next t
        Set targets = newTargets

        ' Quelle (aktuelle Form) nach Bearbeitung aller Ziele entfernen, wenn gewünscht
        If Not subJob.booleanOperationLeaveSource Then
            If Not Globals.isShapeDeleted(sourceShape) Then sourceShape.delete
        End If
    Next s

    ' Ergebnisformen der Operation als aktuelle Formen dieses SubJobs uebernehmen, damit sie
    ' (a) gemaess subJob benannt werden (z.B. "Rahmen", damit ein spaeterer SubJob sie per Name
    ' findet - Weld/Combine erhaelt den Namen sonst nicht), (b) beim Gruppieren erfasst werden und
    ' (c) an den naechsten SubJob als 'previousSubJobPlacedShapes' weitergereicht werden.
    ' Zuvor gingen die Ergebnisse verloren, da nur die (geloeschten) Quellformen getrackt waren.
    Dim r As Integer
    For r = 1 To targets.count
        nameShape targets(r), subJob
    Next r

    placedShapesByCurrentSubJob.RemoveAll
    placedShapesByCurrentSubJob.AddRange targets

    If Not logger Is Nothing Then logger.removeTab
End Function



Private Function renameProductID(layer As ProductDesignLayer, subJob As PlaceFileSubJob)
    
    If layer.productDesign.getProductIDShape Is Nothing Then
        Exit Function
    End If
    
    If subJob.useProductIDSuffix And Not Globals.endsWith(layer.productDesign.getProductIDShape.text.Story.text, "-" & subJob.productIDSuffix) Then
        layer.productDesign.getProductIDShape.text.Story.text = Globals.removeLineBreaks(layer.productDesign.getProductIDShape.text.Story.text) & "-" & subJob.productIDSuffix
    End If
        
End Function



Public Function placeImageAt(designShape As shape, shapesToCenter As shapeRange, subJob As PlaceFileSubJob, layer As ProductDesignLayer, productDesign As productDesign)
    

    Dim imagePath As String
    imagePath = subJob.getImagePath()
    If subJob.imagePathRelativeToPlaceableImageFiles Then
        imagePath = getMainFolder & imagePath
    End If

    Dim xOffset As Double
    Dim yOffset As Double
    
    Dim isCDR As Boolean
    isCDR = Globals.endsWith(imagePath, ".cdr")
    
    Dim isCDRPlaceJob As Boolean
    isCDRPlaceJob = subJob.parentJob Is jobCDR
    
    Dim imageShape As shape
    Set imageShape = shapeCache.getFileShape(imagePath, logger:=logger)
    
    
    If useOffsetForCDR And isCDRPlaceJob Then
        Dim pageCenterX As Double
        Dim pageCenterY As Double
        ActiveDocument.Pages.First.GetCenterPosition pageCenterX, pageCenterY
        
        xOffset = imageShape.centerX - pageCenterX
        yOffset = imageShape.centerY - pageCenterY
    End If
    
    'Größe
    sizeShape imageShape, shapesToCenter, subJob
    
    'Position
    positionShape imageShape, shapesToCenter, subJob
    
    
    'Offset (nur CDR)
    If Not (xOffset = 0 And yOffset = 0) Then
        imageShape.Move xOffset, yOffset
    End If
    
    
    
    If subJob.cutToShape Then
        For i = 1 To shapesToCenter.count
            Set imageShape = shapesToCenter(i).Intersect(imageShape, True, False)
        Next i
    End If
    
    ' Wenn der Job CDR oder SVG genutzt wurde, sind es wahrscheinlich Shapes vom Designer und keine Grundplatten.
    ' Deshalb bekommen sie kein ">" vorgehängt
    If isCDRPlaceJob Or subJob.parentJob Is jobSVG Or subJob.parentJob Is jobShapeReplace Then
        
    Else
        ' TODO eigentlich bestimmt "subJob.exportable" ob das Zeichen > da hin soll
        ' > hinzufügen und .png beim Namen entfernen
        imageShape.name = ">" & left(imageShape.name, Len(imageShape.name) - 4)
        
    End If
    
    ' Mit der Hauptform intersecten
    If Not subJob.subtractFromFoundShapesToPlaceOn Is Nothing Then
        For i = 1 To subJob.subtractFromFoundShapesToPlaceOn.count
            If Not subJob.subtractFromFoundShapesToPlaceOn(i) Is Nothing Then
                Set imageShape = Globals.intersectShapes(subJob.subtractFromFoundShapesToPlaceOn(i), imageShape, True, False)
                If imageShape Is Nothing Then
                    Err.Raise vbObjectError + 513, , "[PlaceFile.placeImageAt] 'imageShape' ist Nothing "
                End If
            End If
        Next i
    End If
    
    
    If subJob.subtractMainShape Then
        imageShape.OrderBackOf layer.getMainShape
        Set imageShape = layer.getMainShape.Trim(imageShape, True, False)
    End If
    
    If subJob.subtractVisualMainShape Then
        Dim visualMainShape As shape
        Set visualMainShape = layer.getMainShapesCombinedCopyForMask
        imageShape.OrderBackOf visualMainShape
        Set imageShape = visualMainShape.Trim(imageShape, True, False)
        
        visualMainShape.delete
    End If
    
    If subJob.subtractSmallerShapes Then
        Set imageShape = subtractSmallerRedOrPinkShapes(layer, imageShape, subJob)
    End If
    
    ' Fügt das Bild/die Datei mit einem anderen Bild (Merge) zusammen (wenn im Job gewollt)
    Dim merged As Boolean
    If subJob.merge Then
    
        Dim mergeShape As shape
        Set mergeShape = layer.layerShape.shapes.FindShape(subJob.mergeWithShapeWithName, subJob.mergeWithShapeWithType, , subJob.mergeWithShapeRecursive, subJob.mergeWithShapeWithQuery)
        
        
        If Not mergeShape Is Nothing Then
            
            
            ' Vorher merken was für ein Typ das Shape war.
            ' Da es gemerged wird, müssen evtl. nachher Shapes in dem Layer invalidiert werden
            ' --------------------------------------
            Dim mergeShapeIsExportable As Boolean
            mergeShapeIsExportable = Globals.isExportableShape(mergeShape)
            
            Dim mergeShapeIsGroundPlate As Boolean
            mergeShapeIsExportable = Globals.isGroundplate(mergeShape)
            ' --------------------------------------
                
            
            If Not imageShape.parentGroup Is mergeShape.parentGroup Then
                imageShape.OrderFrontOf mergeShape
            End If
        
            If mergeShape.Type = cdrBitmapShape Or imageShape.Type = cdrBitmapShape Then
                Dim range As New shapeRange
                range.add mergeShape
                range.add imageShape
                
                range.ConvertToBitmapEx cdrRGBColorImage, , True, 300
                
            Else
                imageShape.Weld mergeShape, False, True
            End If
            
            Set imageShape = Nothing ' ImageShape wurde zusammengefügt und ist nicht mehr verfügbar
            
            
            ' Invalidieren
            ' --------------------------------------
            If mergeShapeIsExportable Then
                layer.invalidateExportableShapes
            End If
            If mergeShapeIsGroundPlate Then
                layer.invalidateGroundPlate
            End If
            ' --------------------------------------
            
            merged = True
        End If
            
    End If
    ' ACHTUNG !!! wenn gemerged wurde, ist 'imageShape' nicht mehr verfügbar
    
    
    
    
    Dim fileToPlaceHasRedShape As Boolean
    If Not imageShape Is Nothing Then
        fileToPlaceHasRedShape = newCustomShapeTypeQuery(imageShape, RedOrPinkShape).has
        layer.addShapeRange Globals.shapeToShapeRange(imageShape), subJob.mainShapeAddModee, logger ' TODO 'Or True' entfernen
    End If
    
    
    If Not merged Then
        
        If Not isCDRPlaceJob Then
            nameShape imageShape, subJob
            addPlacedShape imageShape, subJob, layer
        ElseIf subJob.mainShapeAddModee <> CreateNewLayerOfNewMainShapes Then
            
            If imageShape.Type = cdrGroupShape Then ' wenn es eine Gruppe ist
                
                Dim range2 As shapeRange: Set range2 = imageShape.UngroupEx
                Set imageShape = Nothing
                For i = 1 To range2.count
                    addPlacedShape range2.item(i), subJob, layer
                Next i
            Else
                addPlacedShape imageShape, subJob, layer
            End If
        End If
        
    End If
    
    renameProductID layer, subJob
    
    
    
    Exit Function
Error:
    MsgBox "Die Datei '" & imagePath & "' konnte nicht gefunden werden! Wahrscheinlich muss Sie noch für die Größe/Form des Produkts erstellt werden." & vbNewLine & "Error: " & Err.Description, vbCritical
    Globals.endMacro
End Function






Public Function fillImage(shapeToFill As shape, subJob As PlaceFileSubJob, designShape As shape, layer As ProductDesignLayer)
    
    If Not logger Is Nothing Then
        logger.logINFO "[PlaceFile.fillImage] shapeToFill: '" & Globals.getShapeDisplayName(shapeToFill) & "'"
        logger.addTab
    End If
    
    
    Dim imagePath As String
    imagePath = getMainFolder & subJob.getImagePath()
    
    If Not logger Is Nothing Then logger.logFINE "imagePath: " & imagePath
    
    Dim filledShape As shape
    Set filledShape = shapeCache.getFileShape(imagePath, True, shapeToFill, subJob, logger:=logger)
    
    ' Da das filledShape gerade erst aus dem Shape-Chache gekommen ist, ist die Position noch nicht richtig
    filledShape.positionX = shapeToFill.positionX
    filledShape.positionY = shapeToFill.positionY
    
    
    Set filledShape = Globals.intersectShapes(shapeToFill, filledShape, , False)
    
    
    ' Kleinere Formen subtrahieren
    If subJob.subtractSmallerShapes Then
        Set filledShape = subtractSmallerRedOrPinkShapes(layer, filledShape, subJob)
    End If
    
    nameShape filledShape, subJob

    addPlacedShape filledShape, subJob, layer
    renameProductID layer, subJob
    
    If Not logger Is Nothing Then logger.removeTab
    Exit Function
FileNotFound:
    Dim errorMsg As String
    errorMsg = "Die Datei '" & imagePath & "' konnte nicht gefunden werden"
    If Not logger Is Nothing Then logger.logFATAL errorMsg
    MsgBox errorMsg, vbCritical
    Globals.endMacro
End Function



Public Function addPlacedShape(shape As shape, subJob As PlaceFileSubJob, layer As ProductDesignLayer)
    
    If Not logger Is Nothing Then
        logger.logFINE "[PlaceFile.addPlacedShape] shape: '" & Globals.getShapeDisplayName(shape) & "', subJob.parentJob: '" & subJob.parentJob.name & "'"
        logger.addTab
    End If
    
    
    
    If subJob.cutDesign Then
        cutSubJobsShapeFromDesign shape, subJob, layer
    End If
    
    ' Counter für die Anzahl der platzierten Shapes erhöhen
    ' ------------------------------------------------------
    ' JOB
    subJob.parentJob.setPlaceMaximumCountCountersValueByLayer layer, _
        subJob.parentJob.getPlaceMaximumCountCountersValueByLayer(layer) + 1
    ' SUBJOB
    subJob.setPlaceMaximumCountCountersValueByLayer layer, _
        subJob.getPlaceMaximumCountCountersValueByLayer(layer) + 1
    ' ------------------------------------------------------
    
    
    If Not logger Is Nothing Then logger.logFINE "Platzierungs-Counter erhöht von Layer aus dem Part #" & layer.getPartIndex & ", Layer #" & layer.getLayerIndex & _
        ". Job-Counter: " & subJob.parentJob.getPlaceMaximumCountCountersValueByLayer(layer) & ", Job-Limit: " & subJob.parentJob.placeMaximumCount & _
        ". SubJob-Counter: " & subJob.getPlaceMaximumCountCountersValueByLayer(layer) & ", SubJob-Limit: " & subJob.placeMaximumCount
    
    placedShapes.add shape
    placedShapesByCurrentSubJob.add shape
    
    
    If subJob.exportable Then
        layer.invalidateExportableShapes
        If Not logger Is Nothing Then logger.logFINE "    invalidateExportableShapes"
    End If
    
    somethingWasPlaced = True
    
    If Not logger Is Nothing Then logger.removeTab
End Function



Public Function cutSubJobsShapeFromDesign(shape As shape, subJob As PlaceFileSubJob, layer As ProductDesignLayer, Optional preventDoubleCut As Boolean = True)
    
    If Not logger Is Nothing Then
        logger.logFINE "[PlaceFile.cutSubJobsShapeFromDesign] shape: '" & Globals.getShapeDisplayName(shape) & "', subJob.parentJob: '" & subJob.parentJob.name & "'"
        logger.addTab
    End If
    
    If Globals.isRedOrPinkShape(shape) Then
        
        If Not layer.getGroundPlate Is Nothing Then
            
            Dim bleedShape As shape
            Dim shapeToSubtract As shape
            Set shapeToSubtract = shape
            
            ' UV Beschnittzugabe
            If Not layer.isGraving Then
                
                Dim bleedSizeInMM As Double
                bleedSizeInMM = layer.getBleedSizeInMM
                
                If Not bleedSizeInMM = 0 Then
                    Set bleedShape = Globals.offsetPath(shape, -bleedSizeInMM)
                    Set shapeToSubtract = bleedShape
                End If
            End If
            
            

            Dim shapesToCut As shapeRange
            Set shapesToCut = layer.getBackgroundShapes
            shapesToCut.add layer.getGroundPlate
            
            ' Wenn 'shapeToSubtract' das 'bleedShape' ist, kann es sein,
            ' dass bei einer Beschnittzugabe die Form 'shape' zu klein ist
            ' und deshalb garnichts zugeschnitten werden muss
            If Not shapeToSubtract Is Nothing Then
                For i = 1 To shapesToCut.count
                    Globals.subtractShape shapeToSubtract, shapesToCut(i), , , logger, preventDoubleCut

                Next i
                
                If shapesToCut.count > 0 Then
                    ' Wenn etwas zugeschnitten wurde invalidieren, da die Grundplatte und evtl. auch Hintergründe zugeschnitten wurden
                    layer.invalidateBackgroundShapes
                    layer.invalidateGroundPlate
                    layer.invalidateExportableShapes ' Platzierte Formen invalidieren (Formen die mit ">" anfangen) 'placedShapesByCurrentSubJob' wird nämlich noch wo anders im Script benutzt
                End If
            End If
            
            If Not bleedShape Is Nothing Then bleedShape.delete
        End If
        
    End If
    
    If Not logger Is Nothing Then logger.removeTab
End Function



' Sucht in den Variantengruppen (Array mit allen Grundplattenvarianten) anhand des Namens der gegegebenen Grundplatte nach gleiche Namen.
' Ist der Grundplattenname der selbe wie der erste Subjob eines Jobs eines der Gruppen, ist die Gruppe gefunden
Public Function getGroundplateVariantGroup(groundPlate As shape) As collection
    
    initIfNeeded
    
    For i = 1 To groundPlateVariantGroups.count
        For j = 1 To groundPlateVariantGroups(i).count
            Dim currentJob As PlaceFileJob: Set currentJob = groundPlateVariantGroups(i).item(j)
'            MsgBox "Compare " & groundPlate.name & " with " & currentJob.subJobs(1).shapeName
            
            ' ACHTUNG: Fehleranfällig, weil kein direkter Stringableich erfolgt. Nur ein InStr
            If InStr(groundPlate.name, currentJob.subJobs(1).shapeName) Then
                Set getGroundplateVariantGroup = groundPlateVariantGroups(i)
'               MsgBox "Found GroundplateJob for " & groundPlate.name & ", Jobname=" & currentJob.name & ", JobshapeName=" & currentJob.subJobs(1).shapeName & ", JobProductID=" & currentJob.subJobs(1).productIDSuffix
                Exit Function
            End If
        Next j
    Next i
    
End Function




' Findet den passenden SubJob, der die Grundplatte platziert hatte.
' Der SubJob hat dann den Namen des Materials für die Grundplatte
Public Function getGroundPlateMaterialName(groundPlate As shape, layer As ProductDesignLayer) As String
    
    Dim subJob As PlaceFileSubJob
    Set subJob = findSubJob(groundPlate, layer)
    
    If Not subJob Is Nothing Then
        getGroundPlateMaterialName = subJob.getGroundPlateMaterialName
    End If

End Function

 
Public Function getVariantNameBeautiful(groundPlateName As String) As String
    Dim subJob As PlaceFileSubJob
    Set subJob = findGroundPlateSubJob(groundPlateName)
    
    If Not subJob Is Nothing Then
        getVariantNameBeautiful = subJob.parentJob.variantNameBeautiful
    End If
End Function


Public Function findGroundPlateSubJob(groundPlateName As String)
    ' TODO
End Function

Public Sub TestFindJobOrSubJobByShape()

    If Not ActiveShape Is Nothing Then
        Dim jobOrSubJob As Object
        Set jobOrSubJob = findSubJobOrJob(ActiveShape, True, True)



        If jobOrSubJob Is Nothing Then
            MsgBox "Kein Subjob oder Job gefunden für " & Globals.getShapeDisplayName(ActiveShape)
        Else
            Dim job As PlaceFileJob

            If TypeOf jobOrSubJob Is PlaceFileSubJob Then
                Set job = jobOrSubJob.parentJob
            Else
                Set job = jobOrSubJob
            End If

            MsgBox "SubJob ParentJob: " & job.name & ", isToPutAboveMainMask: " & job.isToPutAboveMainMask
        End If
    End If

End Sub

Public Sub TestFindSubJobByShape()
    
    Globals.warnIfNoDocumentAndEnd
    Globals.warnIfNoActiveShapeAndEnd
    
    Dim design As New productDesign
    design.newProductDesign ActiveShape
    
    Dim layer As ProductDesignLayer
    Set layer = design.getLayer2(1)
    
    Dim subJob As PlaceFileSubJob
    
    Set subJob = findSubJobByShape(layer.getGroundPlate, layer)
    
    If subJob Is Nothing Then
        MsgBox "subJob ist Nothing"
    Else
        MsgBox "subJob: " & subJob.name
    End If
    
End Sub

Public Function findSubJobByShape(shape As shape, layer As ProductDesignLayer, Optional ignoreShapeName As Boolean = False, Optional ignoreShapeFillColor As Boolean = False, _
        Optional ignoreShapeOutlineColor As Boolean = False, Optional ignoreLayerGravingOrPrint As Boolean = False, Optional ignoreShapeSize As Boolean = False, Optional ignoreOriantation As Boolean = False, _
        Optional logger As logger) As PlaceFileSubJob
        
    Set findSubJobByShape = findSubJobOrJob(shape, True, False, logger, layer, ignoreShapeName, ignoreShapeFillColor, ignoreShapeOutlineColor, ignoreLayerGravingOrPrint, ignoreShapeSize, ignoreOriantation)
End Function


Public Function findSubJob(placedShape As shape, layer As ProductDesignLayer, Optional logger As logger, Optional ignoreShapeName As Boolean = False, Optional ignoreShapeFillColor As Boolean = False, _
        Optional ignoreShapeOutlineColor As Boolean = False, Optional ignoreLayerGravingOrPrint As Boolean = False, Optional ignoreShapeSize As Boolean = False, Optional ignoreOriantation As Boolean = False) As PlaceFileSubJob
    
    Set findSubJob = findSubJobOrJob(placedShape, True, False, logger, layer, ignoreShapeName, ignoreShapeFillColor, ignoreShapeOutlineColor, ignoreLayerGravingOrPrint, ignoreShapeSize, ignoreOriantation)
End Function


Public Function findVarianteJob(variante As variante, layer As ProductDesignLayer, Optional logger As logger) As PlaceFileJob
    Set findVarianteJob = findVarianteJobByShape(variante.shape, logger, layer)
End Function

Public Function findVarianteJobByShape(variantShape As shape, Optional logger As logger, Optional layer As ProductDesignLayer) As Object
    
    Dim jobOrSubJob As Object
    ' Ein Variantenjob kann den Kürzel "var_" auch bei einem normalen Shape haben. Also nicht nur bei einer Gruppe
    Set jobOrSubJob = findSubJobOrJob(variantShape, True, True, logger, layer)
    
    If Not jobOrSubJob Is Nothing Then
        If TypeOf jobOrSubJob Is PlaceFileJob Then
            Set findVarianteJobByShape = jobOrSubJob ' Job
        Else
            Set findVarianteJobByShape = jobOrSubJob.parentJob ' Subjob
        End If
    End If
    
End Function


' TODO ein 2D Dictionary für Variantengruppen und Varianten nutzen für ultraschnelle Jobsuche. Denn... vv
' Varianten Jobs sollte man immer per Name suchen. Es ist zum Einen schneller und zum Anderen wird dann nur der Name verglichen.
'Public Function findVarianteJobByShapeName(variantShapeName As String, Optional logger As logger) As PlaceFileJob
''
''    Dim jobOrSubJob As Object
''    ' Ein Variantenjob kann den Kürzel "var_" auch bei einem normalen Shape haben. Also nicht nur bei einer Gruppe
''    Set jobOrSubJob = findSubJobOrJob(variantShapeName, True, True, logger) ' TODO falsche Parameter
''
''    findSubJobByVariantGroupNameAndName (variantShapeName)
'
'
'End Function




' Findet den passenden Job und/oder SubJob, der das Bild/die Form/die Gruppe mit dem Namen "placedShapeName" platziert hatte.
Public Function findSubJobOrJob(placedShape As shape, findSubJob As Boolean, findJob As Boolean, Optional logger As logger, Optional layer As ProductDesignLayer, _
        Optional ignoreShapeName As Boolean = False, Optional ignoreShapeFillColor As Boolean = False, _
        Optional ignoreShapeOutlineColor As Boolean = False, Optional ignoreLayerGravingOrPrint As Boolean = False, Optional ignoreShapeSize As Boolean = False, Optional ignoreOriantation As Boolean = False) As Object
    
    If Not logger Is Nothing Then
        logger.addTabFINE "[PlaceFile.findSubJobOrJob] placedShape: '" & Globals.getShapeDisplayName(placedShape) & "' findSubJob: " & findSubJob & ", findJob: " & findJob
    End If
    
    ' Formen ohne Namen und Uploadboxen überspringen (spart Zeit)
    If placedShape.name = "" Or placedShape.name = "uploadbox_false" Or placedShape.name = "uploadbox_true" Then
        If Not logger Is Nothing Then logger.logFINE "placedShapeName ist leer oder eine Uploadbox. Suche beenden!"
        
        Exit Function
    End If
    
    
    initIfNeeded
    
    Dim currentSubJob As PlaceFileSubJob
    
    For i = 1 To jobList.jobs.count
        Dim currentJob As PlaceFileJob
        Set currentJob = jobList.jobs(i)
        
        If findJob Then
            If Not logger Is Nothing Then logger.logFINER "Vergleiche Job '" & currentJob.name & "' Gruppierungsname: '" & currentJob.getGroupName & "' mit '" & placedShape.name & "'"
            If currentJob.getGroupName = placedShape.name Then
                Set findSubJobOrJob = currentJob
                If Not logger Is Nothing Then logger.logFINE "Gefunden!"
                GoTo ExitFunction
            End If
            
        End If
        
        If findSubJob Then
            For j = 1 To currentJob.subJobs.count
            
                
                Set currentSubJob = currentJob.subJobs(j)
                
                If isShapePlacedBySubJob(placedShape, layer, currentSubJob, ignoreShapeName, ignoreShapeFillColor, ignoreShapeOutlineColor, ignoreLayerGravingOrPrint, ignoreShapeSize, ignoreOriantation, logger) Then
                    Set findSubJobOrJob = currentSubJob
                    If Not logger Is Nothing Then logger.logFINE "Gefunden!"
                    GoTo ExitFunction
                End If
                
                Set currentSubJob = Nothing
            Next j
        End If
        
        Set currentJob = Nothing
    Next i
    
ExitFunction:
    If Not logger Is Nothing Then logger.removeTabFINE
End Function


Public Function isGroundPlateSubJobGivenJob(groundPlate As shape, job As PlaceFileJob, layer As ProductDesignLayer, Optional logger As logger) As Boolean
    
    If job Is Nothing Then
        Err.Raise vbObjectError + 513, , "[PlaceFile.isGroundPlateSubJobGivenSubJob] 'subJob' ist Nothing "
    End If
    
    Dim groundPlateSubJob As PlaceFileSubJob
    Set groundPlateSubJob = findSubJobByShape(groundPlate, layer, , , , , , , logger)
    
    If Not groundPlateSubJob Is Nothing Then
        If groundPlateSubJob.parentJob Is job Then
            isGroundPlateSubJobGivenJob = True
        End If
    End If
    
End Function


Public Sub TestFindSubJobByVariantGroupNameAndName()
    
'    initIfNeeded
'
'    Dim searchForJob As String
''    searchForJob = "var_befestigung(4-Abstandshalter)"
''    searchForJob = "var_frame(1cm)"
''    searchForJob = "var_befestigung(2-Bohrloecher-8mm-Schrauben)"
'    searchForJob = "var_befestigung(2-Bohrloecher-8mm)"
'
'    Dim job As placeFileSubJob
'    Set job = findVarianteJobByShapeName(searchForJob)
'
'    If job Is Nothing Then
'        MsgBox "SubJob nicht gefunden: " & searchForJob
'    Else
'        MsgBox "SubJob gefunden: " & searchForJob & vbNewLine & "isGeneratingOwnMask: " & job.parentJob.isGeneratingOwnMask & vbNewLine & "name: " & job.parentJob.name & vbNewLine & "groupName: " & job.parentJob.getGroupName
'    End If
        
    
    
End Sub



Public Function findJobByVariantGroupNameAndName(variantGroupNameAndName As String) As PlaceFileJob
    
    initIfNeeded
    
    For i = 1 To jobList.jobs.count
        Dim currentJob As PlaceFileJob
        Set currentJob = jobList.jobs(i)
        
        ' TODO evtl auch 'currentJob.jobs' untersuchen
        
        ' Wenn es eine Kind-Variante einer Schicht ist
        If currentJob.getGroupName = variantGroupNameAndName Then
            Set findJobByVariantGroupNameAndName = currentJob
            Exit Function
        End If
        
        For j = 1 To currentJob.subJobs.count
            Dim currentSubJob As PlaceFileSubJob
            Set currentSubJob = currentJob.subJobs(j)
            
            If currentSubJob.groupName = variantGroupNameAndName Then
                Set findJobByVariantGroupNameAndName = currentJob
                Exit Function
            End If
            
            ' Wenn es eine Schichtvariante ist (Da wo der Variantenname auf der Hauptform der Schicht steht)
            If currentSubJob.shapeName = variantGroupNameAndName Then
                Set findJobByVariantGroupNameAndName = currentJob
                Exit Function
            End If
            
            Set currentSubJob = Nothing
        Next j
        
        
        Set currentJob = Nothing
    Next i
    
End Function



Public Function findSubJobByAmazonImportGroundPlateName(groundPlateName As String) As PlaceFileJob
    
     For i = 1 To jobList.jobs.count
        Dim currentJob As PlaceFileJob
        Set currentJob = jobList.jobs(i)
        
        For j = 1 To currentJob.subJobs.count
            Dim currentSubJob As PlaceFileSubJob
            Set currentSubJob = currentJob.subJobs(j)
            
            
            If currentSubJob.amazonImportGroundPlateNameInConfi = groundPlateName Then
                Set findSubJobByAmazonImportGroundPlateName = currentJob
                Exit Function
            End If
            
            Set currentSubJob = Nothing
        Next j
        
        Set currentJob = Nothing
    Next i
    
End Function



Public Function findStaticVariantJobs(groupName As String, name As String) As collection
    
    initIfNeeded
    
    Dim result As New collection
    
    For i = 1 To staticVariantJobs.count
        Dim currentJob As PlaceFileJob
        Set currentJob = staticVariantJobs(i)
        
        Dim currentJobGroupName As String
        currentJobGroupName = currentJob.getGroupName
        
        ' 'currentJob.getGroupName' ist bspw. 'var_befestigung(Bohrloecher-3mm)' und 'groupName' ist 'var_befestigung'
        If startsWith(currentJobGroupName, groupName) And _
            Globals.stringCompareStringCollectionToString(currentJob.staticVariantNameAliasseForAmazonImport, name, StringInside, True) Then
            
            result.add currentJob
            
        End If
        
        Set currentJob = Nothing
    Next i
    
    Set findStaticVariantJobs = result
    
End Function




Private Function addSubjobToPutAboveMainMask(subJob As PlaceFileSubJob)
    
    subJob.getNameForPlacedShape
    
End Function



Public Function placeJobOnProductDesignLayer(layer As ProductDesignLayer, job As PlaceFileJob)
    
    Dim unitsBefore As cdrUnit
    unitsBefore = ActiveDocument.unit
    
    setSelectedPlaceTypeJob job
    startFunction Globals.shapeToShapeRange(layer.layerShape), Classfactory.newPlaceFileParameters.setQuiet.setErrorWhenNothingPlaced
    
    ActiveDocument.unit = unitsBefore ' SEHR WICHTIG
    
End Function



Public Function replaceShape(shapeName As String, pathToNewShape As String, Optional logger As logger)
    
    initIfNeeded
    
    p_setSelectedJob jobShapeReplace
    
    startFunction Globals.getSelectedShapesOrAll, Classfactory.newPlaceFileParameters.setParts(Part1, layer1).setFilePath(pathToNewShape).setShapeNameToPlaceOn(shapeName).setLogger(logger)
    
End Function





' TODO
Public Sub Unittest()
    
    initIfNeeded
    
    ' TODO alle Jobs durchlaufen und einen Unittest mit den Vorgaben vom Job durchführen
    For i = 1 To jobList.jobs.count
        
        'ActiveDocument.Undo
    Next i
    
    
    Application.CreateDocument
    
    setSelectedPlaceTypeJob jobAcrylKlar
    Start newPlaceFileParameters.setParts(Part2, layer1).setUseOffsetForCDR
    
    
    ActiveDocument.ClearSelection
    
    setSelectedPlaceTypeJob job2Abstandshalter
    Start newPlaceFileParameters.setParts(Part1, layer1).setUseOffsetForCDR
    
    ActiveDocument.ClearSelection
    
    setSelectedPlaceTypeJob jobBuchenholz
    Start newPlaceFileParameters.setParts(Part1, layer1).setUseOffsetForCDR
    
End Sub







