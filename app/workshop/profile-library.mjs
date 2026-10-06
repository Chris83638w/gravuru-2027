import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';

export const PROFILE_TYPES=Object.freeze(['fonts','motifs','colors','bestsellers']);
const failure=(status,code,message)=>Object.assign(new Error(message),{status,code});
const fail=(code,message)=>{throw failure(422,code,message);};
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
const validReference=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const itemId=value=>typeof value==='string'&&value.trim()===value&&value.length>0&&value.length<=256&&!/[\u0000-\u001f\u007f]/.test(value);
const inherit=()=>({mode:'inherit',profileId:null});
const emptyAssignments=()=>Object.fromEntries(PROFILE_TYPES.map(type=>[type,inherit()]));
function typeValue(value){if(!PROFILE_TYPES.includes(value))fail('invalid_profile_type','Profilart muss Schriften, Motive, Farben oder Bestseller sein.');return value;}
function exactKeys(value,keys,label){if(!record(value)||Object.keys(value).length!==keys.length||keys.some(key=>!Object.hasOwn(value,key)))fail('invalid_profile',label+': Felder fehlen oder sind unbekannt.');}
function positiveRevision(value){if(!Number.isSafeInteger(value)||value<1)fail('invalid_revision','Eine gültige erwartete Revision ist erforderlich.');}
function checkExpected(actual,expected){
  positiveRevision(expected);
  if(actual!==expected)throw Object.assign(failure(409,'revision_conflict','Das Profil oder seine Zuordnung wurde zwischenzeitlich geändert. Bitte neu laden.'),{expectedRevision:expected,actualRevision:actual});
}
function assignmentValue(value){
  exactKeys(value,['mode','profileId'],'Profilzuordnung');
  if(!['inherit','empty','override'].includes(value.mode)||(value.mode==='override'?!validReference(value.profileId):value.profileId!==null))fail('invalid_assignment','Profilzuordnung muss Vererben, ausdrücklich leer oder eine Profil-ID enthalten.');
  return structuredClone(value);
}
function readCatalog(catalog){
  if(!record(catalog)||!Array.isArray(catalog.fonts)||!Array.isArray(catalog.motifs))fail('invalid_catalog','Schrift- und Motivkatalog sind erforderlich.');
  return Object.fromEntries(['fonts','motifs'].map(type=>{
    const rows=catalog[type].map(value=>{
      const id=typeof value==='string'?value:value?.id,name=typeof value==='string'?value:value?.name??id;
      if(!itemId(id)||typeof name!=='string'||!name.trim()||name.length>256)fail('invalid_catalog','Ungültiger Katalogeintrag für '+type+'.');
      return {id,name};
    });
    if(new Set(rows.map(row=>row.id)).size!==rows.length)fail('invalid_catalog','Katalog-IDs müssen pro Art eindeutig sein.');
    return [type,rows];
  }));
}

/** Persistent choice lists. The catalog contains IDs/labels, never glyph paths
 * or image data; filtering choices must not delete production font resources. */
export function createProfileLibrary({filename,catalog}){
  if(typeof filename!=='string'||!filename)throw new TypeError('Ein Dateiname für die Profilbibliothek ist erforderlich.');
  const catalogRows=readCatalog(catalog),catalogIds=Object.fromEntries(Object.entries(catalogRows).map(([type,rows])=>[type,new Set(rows.map(row=>row.id))]));
  if(filename!==':memory:')mkdirSync(dirname(filename),{recursive:true});
  const db=new DatabaseSync(filename);
  const transaction=(work,{readOnly=false}={})=>{
    db.exec(readOnly?'BEGIN':'BEGIN IMMEDIATE');
    try{const result=work();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}
  };
  try{
    db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;');
    transaction(()=>{
      const version=db.prepare('PRAGMA user_version').get().user_version;
      if(version>1)throw failure(422,'unsupported_database_version','Die Profilbibliothek benötigt eine neuere Anwendung.');
      if(version===0){
        if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' LIMIT 1").get())throw failure(422,'wrong_database','Die Profilbibliothek benötigt eine eigene Datenbankdatei.');
        db.exec(`CREATE TABLE profiles (
          id TEXT PRIMARY KEY, revision INTEGER NOT NULL CHECK(revision>=1),
          name TEXT NOT NULL, type TEXT NOT NULL CHECK(type IN ('fonts','motifs','colors','bestsellers')),
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
          FOREIGN KEY(id,revision) REFERENCES profile_revisions(profile_id,revision) DEFERRABLE INITIALLY DEFERRED
        );
        CREATE TABLE profile_revisions (
          profile_id TEXT NOT NULL REFERENCES profiles(id), revision INTEGER NOT NULL CHECK(revision>=1),
          document TEXT NOT NULL CHECK(json_valid(document)), created_at TEXT NOT NULL,
          PRIMARY KEY(profile_id,revision)
        );
        CREATE TABLE profile_library_settings (
          id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL CHECK(revision>=1),
          document TEXT NOT NULL CHECK(json_valid(document)),updated_at TEXT NOT NULL
        );
        CREATE TABLE profile_settings_revisions (
          revision INTEGER PRIMARY KEY CHECK(revision>=1),document TEXT NOT NULL CHECK(json_valid(document)),created_at TEXT NOT NULL
        );
        CREATE TRIGGER immutable_profile_update BEFORE UPDATE ON profile_revisions BEGIN SELECT RAISE(ABORT,'Profile revisions are immutable'); END;
        CREATE TRIGGER immutable_profile_delete BEFORE DELETE ON profile_revisions BEGIN SELECT RAISE(ABORT,'Profile revisions are immutable'); END;
        CREATE TRIGGER immutable_settings_update BEFORE UPDATE ON profile_settings_revisions BEGIN SELECT RAISE(ABORT,'Settings revisions are immutable'); END;
        CREATE TRIGGER immutable_settings_delete BEFORE DELETE ON profile_settings_revisions BEGIN SELECT RAISE(ABORT,'Settings revisions are immutable'); END;
        PRAGMA user_version=1;`);
        const document=JSON.stringify({defaults:emptyAssignments(),categories:{}}),now=new Date().toISOString();
        db.prepare('INSERT INTO profile_library_settings(id,revision,document,updated_at) VALUES (1,1,?,?)').run(document,now);
        db.prepare('INSERT INTO profile_settings_revisions(revision,document,created_at) VALUES(1,?,?)').run(document,now);
      }else{
        for(const table of ['profiles','profile_revisions','profile_library_settings','profile_settings_revisions'])if(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table))throw failure(422,'wrong_database','Diese Datei ist keine Profilbibliothek.');
      }
    });
  }catch(error){db.close();throw error;}

  function profileData(input){
    exactKeys(input,['name','type','items'],'Profil');
    const type=typeValue(input.type);
    if(typeof input.name!=='string'||!input.name.trim()||input.name.length>200)fail('invalid_profile','Ein Profilname mit höchstens 200 Zeichen ist erforderlich.');
    if(!Array.isArray(input.items)||input.items.length>2000)fail('invalid_profile_items','Ein Profil benötigt eine Liste mit höchstens 2000 Einträgen.');
    const items=input.items.map(value=>{
      if(type==='colors'){
        if(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value))fail('invalid_profile_color','Profilfarben müssen als #RRGGBB angegeben werden.');
        return value.toLowerCase();
      }
      if(!itemId(value)||!catalogIds[type==='bestsellers'?'motifs':type].has(value))fail('unknown_catalog_item','Profil enthält eine unbekannte '+(type==='fonts'?'Schrift':'Motiv-ID')+'.');
      return value;
    });
    if(new Set(items).size!==items.length)fail('duplicate_profile_item','Ein Profil darf keine doppelten Einträge enthalten.');
    return {name:input.name.trim(),type,items};
  }
  function profileRow(id){
    const row=typeof id==='string'?db.prepare('SELECT * FROM profiles WHERE id=?').get(id):null;
    if(!row)throw failure(404,'profile_not_found','Profil nicht gefunden.');
    return row;
  }
  function profileRecord(row,revision=row.revision){
    const saved=db.prepare('SELECT document,created_at FROM profile_revisions WHERE profile_id=? AND revision=?').get(row.id,revision);
    if(!saved)throw failure(404,'profile_revision_not_found','Profilversion nicht gefunden.');
    return {id:row.id,revision,...JSON.parse(saved.document),createdAt:row.created_at,updatedAt:saved.created_at};
  }
  function appendProfile(row,document){
    db.prepare('INSERT INTO profile_revisions(profile_id,revision,document,created_at) VALUES(?,?,?,?)').run(row.id,row.revision,JSON.stringify(document),row.updated_at);
    return profileRecord(row);
  }
  function settings({revision}={}){
    if(revision!==undefined)positiveRevision(revision);
    const row=revision===undefined?db.prepare('SELECT revision,document,updated_at FROM profile_library_settings WHERE id=1').get():db.prepare('SELECT revision,document,created_at AS updated_at FROM profile_settings_revisions WHERE revision=?').get(revision);
    if(!row)throw failure(404,'settings_revision_not_found','Version der Profilzuordnungen nicht gefunden.');
    return {revision:row.revision,...JSON.parse(row.document),updatedAt:row.updated_at};
  }
  function assignmentReference(type,input,previewProfileId=null){
    const assignment=assignmentValue(input);
    if(assignment.mode==='override'){
      const row=profileRow(assignment.profileId);
      if(row.type!==type)fail('profile_type_mismatch','Das gewählte Profil gehört zu einer anderen Art.');
      const saved=profileRecord(row);
      // A correction preview must be able to show the old, unavailable item.
      // Only the edited profile is exempt here; the proposed items are validated.
      if(row.id!==previewProfileId)profileData({name:saved.name,type:saved.type,items:saved.items});
    }
    return assignment;
  }
  function proposedAssignment(categoryId,type,input,expectedRevision){
    typeValue(type);
    if(categoryId!==null&&!validReference(categoryId))fail('invalid_category','Ungültige Kategorie-ID.');
    const current=settings();checkExpected(current.revision,expectedRevision);
    const assignment=assignmentReference(type,input);
    if(categoryId===null)current.defaults[type]=assignment;
    else{
      if(!Object.hasOwn(current.categories,categoryId))Object.defineProperty(current.categories,categoryId,{value:emptyAssignments(),enumerable:true,writable:true,configurable:true});
      current.categories[categoryId][type]=assignment;
    }
    return current;
  }
  function setAssignment(categoryId,type,input,expectedRevision){
    return transaction(()=>{
      const current=proposedAssignment(categoryId,type,input,expectedRevision);
      const document=JSON.stringify({defaults:current.defaults,categories:current.categories}),revision=current.revision+1,now=new Date().toISOString();
      db.prepare('UPDATE profile_library_settings SET revision=?,document=?,updated_at=? WHERE id=1').run(revision,document,now);
      db.prepare('INSERT INTO profile_settings_revisions(revision,document,created_at) VALUES(?,?,?)').run(revision,document,now);
      return settings();
    });
  }
  function resolve(document,profileOverride=null,previewProfileId=null,settingsOverride=null){
    if(!record(document)||!Array.isArray(document.categoryIds)||document.categoryIds.length>100||document.categoryIds.some(id=>!validReference(id))||new Set(document.categoryIds).size!==document.categoryIds.length)fail('invalid_categories','Produktkategorien müssen als geordnete Liste eindeutiger IDs vorliegen.');
    exactKeys(document.profileAssignments,PROFILE_TYPES,'Produkt-Profilzuordnungen');
    const current=settingsOverride||settings(),selections={},sources={},warnings=[];
    for(const type of PROFILE_TYPES){
      selections[type]=null;sources[type]={level:'unbound',categoryId:null,mode:'inherit',profileId:null,profileRevision:null};
      const apply=(raw,level,categoryId=null)=>{
        const assignment=assignmentReference(type,raw,previewProfileId);
        if(assignment.mode==='inherit')return;
        const profile=assignment.mode==='override'?(profileOverride?.id===assignment.profileId?profileOverride:profileRecord(profileRow(assignment.profileId))):null;
        selections[type]=profile?[...profile.items]:[];
        sources[type]={level,categoryId,mode:assignment.mode,profileId:profile?.id??null,profileRevision:profile?.revision??null};
      };
      apply(current.defaults[type],'default');
      // Priority is explicit and stable: the last non-inheriting category in
      // document.categoryIds wins. Product assignments then have final priority.
      for(const categoryId of document.categoryIds)if(Object.hasOwn(current.categories,categoryId))apply(current.categories[categoryId][type],'category',categoryId);
      apply(document.profileAssignments[type],'product');
    }
    if(selections.motifs!==null&&selections.bestsellers!==null){
      const allowed=new Set(selections.motifs),excluded=selections.bestsellers.filter(id=>!allowed.has(id));
      if(excluded.length){selections.bestsellers=selections.bestsellers.filter(id=>allowed.has(id));warnings.push({code:'bestsellers_filtered',items:excluded,message:'Bestseller außerhalb der freigegebenen Motivauswahl werden ausgeblendet.'});}
    }
    return {selections,sources,settingsRevision:current.revision,categoryPriority:'last-non-inherit-wins',warnings};
  }

  return {
    catalog:()=>structuredClone(catalogRows),settings,
    list({type,query=''}={}){
      if(type!==undefined)typeValue(type);
      if(typeof query!=='string'||query.length>256)fail('invalid_query','Ungültige Profilsuche.');
      const term=query.trim().toLowerCase();
      return db.prepare('SELECT * FROM profiles ORDER BY type,name COLLATE NOCASE,id').all().filter(row=>(type===undefined||row.type===type)&&(!term||row.name.toLowerCase().includes(term)||row.id.includes(term))).map(row=>profileRecord(row));
    },
    get(id,{revision}={}){if(revision!==undefined)positiveRevision(revision);const row=profileRow(id);return profileRecord(row,revision??row.revision);},
    create(input){
      const document=profileData(input);
      return transaction(()=>{
        const id='prf_'+randomUUID(),now=new Date().toISOString();
        db.prepare('INSERT INTO profiles(id,revision,name,type,created_at,updated_at) VALUES(?,1,?,?,?,?)').run(id,document.name,document.type,now,now);
        return appendProfile(profileRow(id),document);
      });
    },
    save(id,input,expectedRevision){
      return transaction(()=>{
        const row=profileRow(id);checkExpected(row.revision,expectedRevision);
        const document=profileData(input);
        if(document.type!==row.type)fail('profile_type_change','Die Profilart bleibt unverändert. Für eine andere Art bitte ein neues Profil anlegen.');
        db.prepare('UPDATE profiles SET revision=?,name=?,updated_at=? WHERE id=?').run(row.revision+1,document.name,new Date().toISOString(),id);
        return appendProfile(profileRow(id),document);
      });
    },
    previewSave(id,input,expectedRevision,documents){
      return transaction(()=>{
        const row=profileRow(id);checkExpected(row.revision,expectedRevision);
        const document=profileData(input);
        if(document.type!==row.type)fail('profile_type_change','Die Profilart bleibt unverändert. Für eine andere Art bitte ein neues Profil anlegen.');
        const proposed={id,revision:row.revision+1,...document};
        return {profile:{id,type:row.type,name:document.name,fromRevision:row.revision,toRevision:proposed.revision},settingsRevision:settings().revision,comparisons:documents.map(product=>({before:resolve(product,null,id),after:resolve(product,proposed,id)}))};
      },{readOnly:true});
    },
    previewAssignment(categoryId,type,input,expectedRevision,documents){
      return transaction(()=>{
        const proposed=proposedAssignment(categoryId,type,input,expectedRevision);
        return {settingsRevision:proposed.revision,type,categoryId,comparisons:documents.map(document=>({before:resolve(document),after:resolve(document,null,null,proposed)}))};
      },{readOnly:true});
    },
    setDefault:(type,assignment,expectedRevision)=>setAssignment(null,type,assignment,expectedRevision),
    setCategory:(categoryId,type,assignment,expectedRevision)=>setAssignment(categoryId,type,assignment,expectedRevision),
    resolve:document=>transaction(()=>resolve(document),{readOnly:true}),close:()=>db.close()
  };
}
