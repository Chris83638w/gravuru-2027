// Die vier Einstiege in den Konfigurator – identisch auf Website und Konfigurator-Startseite.
export const configuratorServices=[
 {key:'gravur',icon:'gravur',title:'Gravur gestalten',text:'Texte, Motive oder ein Logo auf Edelstahl oder Acrylglas.',href:'/konfigurator?bearbeitung=gravur'},
 {key:'druck',icon:'druck',title:'Farbdruck gestalten',text:'Fotos und farbige Designs auf Acrylglas, auf Wunsch mit Edelstahlrückwand.',href:'/konfigurator?bearbeitung=druck'},
 {key:'zuschnitt',icon:'zuschnitt',title:'Zuschnitt planen',text:'Form, Maße und Bohrungen festlegen – auch ohne Gestaltung.',href:'/konfigurator?bearbeitung=zuschnitt'},
 {key:'sonder',icon:'sonder',title:'Sonderanfertigung gestalten',text:'Anderes Material, eigener Gegenstand oder besondere Form – selbst gestalten und unverbindlich anfragen.',href:'/konfigurator?bearbeitung=sonder'},
] as const
