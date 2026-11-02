import path from 'node:path'
import { mkdirSync } from 'node:fs'
import { buildConfig, Forbidden, type Access, type CollectionConfig, type Field } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { de } from '@payloadcms/translations/languages/de'
import sharp from 'sharp'
import {copyDefaults,copyLabels} from './content/siteCopy.ts'
import {nodemailerAdapter,type NodemailerAdapterArgs} from '@payloadcms/email-nodemailer'

mkdirSync(path.resolve('data'), { recursive: true })
const signedIn: Access = ({ req }) => Boolean(req.user)
const administrator: Access = ({ req }) => req.user?.role === 'admin'
const published: Access = ({ req }) => req.user ? true : { _status: { equals: 'published' } }
const editing = { create: signedIn, update: signedIn, delete: administrator, read: published }
const Users: CollectionConfig = {
 slug: 'users', labels: { singular: 'Benutzer', plural: 'Benutzer' }, auth: {cookies:{secure:process.env.SITE_PUBLIC==='true'},maxLoginAttempts:5,lockTime:600000},
 admin: { useAsTitle: 'email', group: 'Verwaltung' },
 access: { create: administrator, read: signedIn, update: administrator, delete: administrator },
 fields: [{ name: 'name', type: 'text', label: 'Name' }, { name: 'role', type: 'select', label: 'Rolle', required: true, defaultValue: 'editor', options: [{label:'Administration',value:'admin'},{label:'Redaktion',value:'editor'}], access: { update: ({req})=>req.user?.role==='admin' } }],
 hooks: { beforeChange: [async ({data,operation,req}) => { if(operation==='create'){if(process.env.SITE_PUBLIC==='true'&&req.user?.role!=='admin'&&req.context.serverProvisioning!==true)throw new Forbidden(req.t);const count=await req.payload.count({collection:'users',overrideAccess:true});if(count.totalDocs===0)data.role='admin'}return data }] }
}
const Pages: CollectionConfig = {
 slug: 'pages', labels: {singular:'Seite',plural:'Seiten'}, admin: {useAsTitle:'label',defaultColumns:['label','kind','_status'],group:'Website',preview:(doc)=>`/vorschau?slug=${encodeURIComponent(String(doc.slug))}`},
 access: editing, versions:{drafts:true,maxPerDoc:20},
 fields:[
 {name:'label',label:'Name in Übersichten',type:'text',required:true},
 {name:'slug',label:'Adresse (ohne Schrägstriche)',type:'text',required:true,unique:true,validate:(value:unknown)=>typeof value==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)||'Nur Kleinbuchstaben, Zahlen und Bindestriche verwenden.'},
 {name:'kind',label:'Seitentyp',type:'select',required:true,options:[{label:'Leistung',value:'leistung'},{label:'Zielgruppe',value:'zielgruppe'},{label:'Produktbeispiel',value:'produkt'},{label:'Weitere Seite',value:'seite'}]},
 {name:'eyebrow',label:'Kurze Einordnung',type:'text'},
 {name:'title',label:'Überschrift',type:'text',required:true},
 {name:'intro',label:'Einleitung',type:'textarea',required:true},
 {name:'body',label:'Beschreibung',type:'textarea'},
 {name:'sections',label:'Vertiefende Inhalte',type:'array',fields:[{name:'title',label:'Zwischenüberschrift',type:'text',required:true},{name:'text',label:'Absätze (mit Leerzeilen trennen)',type:'textarea',required:true}]},
 {name:'requestChecklist',label:'Angaben für diese Anfrage',type:'array',fields:[{name:'item',label:'Angabe',type:'text',required:true}]},
 {name:'image',label:'Freigegebenes Bild / gekennzeichnete Illustration',type:'upload',relationTo:'media'},
 {name:'applications',label:'Anwendungen / Abschnitte',type:'array',fields:[{name:'title',label:'Überschrift',type:'text',required:true},{name:'text',label:'Text',type:'textarea',required:true}]},
 {name:'note',label:'Wichtige Angaben zur Anfrage',type:'textarea'},
 {name:'related',label:'Verwandte Seiten',type:'relationship',relationTo:'pages',hasMany:true},
 {name:'faqs',label:'Fragen und Antworten',type:'array',fields:[{name:'question',label:'Frage',type:'text',required:true},{name:'answer',label:'Antwort',type:'textarea',required:true}]},
 {name:'seoTitle',label:'Titel für Suchmaschinen',type:'text'},
 {name:'seoDescription',label:'Beschreibung für Suchmaschinen',type:'textarea'},
 ]
}
const ConfigTemplates: CollectionConfig = {slug:'config-templates',labels:{singular:'Konfigurator-Vorlage',plural:'Konfigurator-Vorlagen'},admin:{useAsTitle:'title',group:'Konfigurator'},access:{create:signedIn,read:({req})=>req.user?true:{enabled:{equals:true},removed:{not_equals:true}},update:signedIn,delete:administrator},fields:[{name:'title',label:'Name',type:'text',required:true},{name:'material',label:'Material',type:'select',required:true,options:['edelstahl','acryl']},{name:'geometry',label:'Geometrie aus der Materialverwaltung',type:'json',required:true},{name:'sourceId',label:'Vorlagenkennung der Werkstatt',type:'text'},{name:'parentId',label:'Abgeleitet von',type:'text'},{name:'removed',label:'Entfernt (wiederherstellbar)',type:'checkbox',defaultValue:false},{name:'enabled',label:'Für Kunden freigegeben',type:'checkbox',defaultValue:false}]}
const Media: CollectionConfig = {slug:'media',labels:{singular:'Bild',plural:'Bilder'},admin:{group:'Website'},access:{create:signedIn,read:({req})=>req.user?true:{approved:{equals:true}},update:signedIn,delete:administrator},upload:{staticDir:path.resolve('media/public'),mimeTypes:['image/jpeg','image/png','image/webp'],imageSizes:[{name:'card',width:800},{name:'hero',width:1600}]},fields:[{name:'caption',label:'Bildunterschrift',type:'text'},{name:'alt',label:'Bildbeschreibung',type:'text',required:true},{name:'credit',label:'Herkunft / Freigabe',type:'text'},{name:'approved',label:'Für öffentliche Verwendung freigegeben',type:'checkbox',defaultValue:false}]}
const Attachments: CollectionConfig = {slug:'attachments',labels:{singular:'Anlage',plural:'Private Anlagen'},admin:{group:'Anfragen'},access:{create:()=>false,read:signedIn,update:()=>false,delete:administrator},upload:{staticDir:path.resolve('media/private'),mimeTypes:['application/pdf','image/jpeg','image/png']},fields:[{name:'reference',type:'text',label:'Anfragenummer'}]}
const Enquiries: CollectionConfig = {slug:'enquiries',labels:{singular:'Projektanfrage',plural:'Projektanfragen'},admin:{useAsTitle:'reference',group:'Anfragen',defaultColumns:['reference','name','service','status','createdAt']},access:{create:()=>false,read:signedIn,update:signedIn,delete:administrator},fields:[
 {name:'reference',type:'text',label:'Anfragenummer',required:true,unique:true},
 {name:'status',type:'select',label:'Bearbeitung',defaultValue:'new',options:[{label:'Neu',value:'new'},{label:'In Prüfung',value:'review'},{label:'Angebot erstellt',value:'offer'},{label:'Abgeschlossen',value:'done'}]},
 ...['name','email','company','phone','service','material','dimensions','quantity','date','supply','message'].map((name):Field=>({name,type:'textarea',label:({name:'Name',email:'E-Mail',company:'Unternehmen',phone:'Telefon',service:'Vorhaben / Leistung',material:'Material',dimensions:'Maße / Stärke',quantity:'Stückzahl',date:'Wunschtermin',supply:'Materialbereitstellung',message:'Projektbeschreibung'} as Record<string,string>)[name]})),
 {name:'attachments',label:'Private Dateien',type:'relationship',relationTo:'attachments',hasMany:true},
 {name:'configuration',label:'Konfiguration bei Anfrageeingang',type:'json',access:{update:()=>false}},
 {name:'notes',label:'Interne Notizen',type:'textarea'},
 {name:'localPreview',label:'In lokaler Vorschau erfasst',type:'checkbox',defaultValue:true},
 {name:'notificationState',label:'E-Mail-Benachrichtigung',type:'select',defaultValue:'pending',options:[{label:'Wartet auf Versand',value:'pending'},{label:'Versandt',value:'sent'},{label:'Lokale Vorschau',value:'preview'}],admin:{readOnly:true}},
 {name:'notifiedAt',label:'Benachrichtigt am',type:'date',admin:{readOnly:true}},
 ]}
const References: CollectionConfig = {slug:'references',labels:{singular:'Referenz',plural:'Referenzen'},admin:{useAsTitle:'title',group:'Website'},access:editing,versions:{drafts:true},fields:[{name:'title',label:'Projektname',type:'text',required:true},{name:'summary',label:'Aufgabe und Ergebnis',type:'textarea',required:true},{name:'material',label:'Material',type:'text'},{name:'image',label:'Freigegebenes Projektbild',type:'upload',relationTo:'media'},{name:'pages',label:'Passende Seiten',type:'relationship',relationTo:'pages',hasMany:true}]}
export default buildConfig({
 ...(process.env.MAIL_ENABLED==='true'?{email:nodemailerAdapter({defaultFromAddress:process.env.MAIL_FROM||'info@gravuru.de',defaultFromName:'Gravuru Manufaktur',skipVerify:true,transportOptions:{sendmail:true,newline:'unix',path:process.env.SENDMAIL_PATH||'/usr/sbin/sendmail'} as unknown as NodemailerAdapterArgs['transportOptions']})}:{}),
 secret:process.env.PAYLOAD_SECRET || (()=>{throw new Error('PAYLOAD_SECRET fehlt. Bitte zuerst die lokale Einrichtung ausführen.')})(),
 serverURL:process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3087',
 admin:{user:'users',meta:{titleSuffix:' · Gravuru Verwaltung'},importMap:{baseDir:path.resolve('src')},components:{beforeDashboard:['/components/AdminQuickLinks#default']}},
 i18n:{fallbackLanguage:'de',supportedLanguages:{de}},
 db:sqliteAdapter({client:{url:process.env.DATABASE_URI || 'file:./data/gravuru.db'},push:process.env.NODE_ENV!=='production'}),
 sharp, collections:[Users,Pages,Media,References,Enquiries,Attachments,ConfigTemplates],
 globals:[{slug:'workshop-material',label:'Materialoriginal – Freigabe',access:{read:signedIn,update:signedIn},fields:[{name:'approvedAt',label:'Freigegeben am',type:'date'}]},{slug:'website',label:'Website & Startseite',access:{read:()=>true,update:signedIn},fields:[
 {name:'heroImage',label:'Startseite: Großes Produktbild',type:'upload',relationTo:'media'},
 {name:'showcaseImages',label:'Startseite: Weitere Produktbeispiele',type:'upload',relationTo:'media',hasMany:true},
 {name:'brand',label:'Marke',type:'text',defaultValue:'gravuru'},
 {name:'logo',label:'Freigegebenes Logo',type:'upload',relationTo:'media'},
 {name:'headline',label:'Startseite: Überschrift',type:'textarea',defaultValue:'Zuschnitt. Gravur. Druck.\nNach Ihren Vorgaben.'},
 {name:'intro',label:'Startseite: Einleitung',type:'textarea',defaultValue:'Laserschneiden, Lasergravur und UV-Direktdruck in Bielefeld. Individuelle Teile für Haus, Garten, Handwerk und Unternehmen.'},
 {name:'street',label:'Straße',type:'text',defaultValue:'Blomestr. 22'},
 {name:'postcode',label:'Postleitzahl',type:'text'},
 {name:'city',label:'Ort',type:'text',defaultValue:'Bielefeld'},
 {name:'email',label:'Öffentliche E-Mail-Adresse',type:'email'},
 {name:'phone',label:'Öffentliche Telefonnummer',type:'text',defaultValue:'0521 / 89491076'},
 {name:'contactNote',label:'Hinweise zu Besuch / Abholung / Versand',type:'textarea'},
 {name:'about',label:'Über Gravuru',type:'textarea',defaultValue:'Gravuru verbindet Zuschnitt, Gravur, UV-Direktdruck und Acrylbiegen in Bielefeld. Wir prüfen individuelle Vorhaben von Privatkunden, Unternehmen und öffentlichen Einrichtungen und stimmen die Fertigung auf die konkrete Aufgabe ab.'},
 {name:'navigation',label:'Hauptnavigation',type:'array',fields:[{name:'label',label:'Text',type:'text',required:true},{name:'href',label:'Interne Adresse',type:'text',required:true,validate:(v:unknown)=>typeof v==='string'&&/^\/(?!\/)/.test(v)||'Interne Adresse beginnend mit / erforderlich.'}]},
 {name:'legalName',label:'Offizieller Unternehmensname',type:'text'},
 {name:'imprint',label:'Vollständiger geprüfter Impressumstext',type:'textarea'},
 {name:'privacy',label:'Vollständiger geprüfter Datenschutzhinweis',type:'textarea'},
 ]},{slug:'layout-content',label:'Seitentexte & Inhaltsblöcke',access:{read:()=>true,update:signedIn},fields:Object.entries(copyDefaults).map(([name,value]):Field=>Array.isArray(value)?{name,label:copyLabels[name],type:'array',defaultValue:value,fields:[{name:'title',label:'Überschrift',type:'text',required:true},{name:'text',label:'Beschreibung',type:'textarea',required:true},...(['finderItems','audienceItems'].includes(name)?[{name:'href',label:'Interner Link',type:'text' as const,required:true,validate:(v:unknown)=>typeof v==='string'&&/^\/(?!\/)/.test(v)||'Interne Adresse beginnend mit / erforderlich.'}]:[])]}:{name,label:copyLabels[name],type:'textarea',defaultValue:value})}],
 typescript:{outputFile:path.resolve('src/payload-types.ts')},
})

