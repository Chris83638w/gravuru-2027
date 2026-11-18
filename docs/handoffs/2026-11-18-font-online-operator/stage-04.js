const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const folder='/var/www/vhosts/gravuru-designwerkstatt.de/private/font-online-tool-20261118-01';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const ok=(v,c)=>{if(!v)throw Error(c)};
const canonical=p=>{for(let a=p;;a=path.dirname(a)){if(fs.existsSync(a))ok(!fs.lstatSync(a).isSymbolicLink()&&fs.realpathSync(a)===a,'path');ok(!fs.existsSync(path.join(a,'.git')),'git');if(path.dirname(a)===a)break;}};
const privatePath=p=>{canonical(p);const s=fs.statSync(p);ok(s.uid===process.getuid()&&!(s.mode&0o077),'private');};
const write=(p,b)=>{const f=fs.openSync(p,'wx',0o600);try{fs.writeFileSync(f,b);fs.fsyncSync(f);}finally{fs.closeSync(f);}ok(sha(fs.readFileSync(p))===sha(b),'written');};
const syncDir=()=>{const f=fs.openSync(folder,'r');try{fs.fsyncSync(f);}finally{fs.closeSync(f);}};
const zlib=require("node:zlib");privatePath(folder);privatePath(folder+"/transfer-manifest.json");const raw=fs.readFileSync(folder+"/transfer-manifest.json");ok(sha(raw)==="ff27f787b4635a462b9ddd85d89309678a47b40b2080cffff4a24cb41f6cabf4","manifest");const m=JSON.parse(raw);
const parts=m.parts.map(p=>{const f=folder+'/'+p.name;privatePath(f);const b=fs.readFileSync(f);ok(b.length===p.bytes&&sha(b)===p.sha256,'part');return b;});
const b=Buffer.concat(parts);ok(b.length===m.payloadBytes&&sha(b)===m.payloadSha256,'payload');
const p=JSON.parse(zlib.gunzipSync(b,{maxOutputLength:128*1024}));ok(p.reviewCodeCommit===m.code,'code');
ok(p.files.length===2&&p.files.map(f=>f.name).join(',')==='snapshot-native-online.py,capture.json','files');
for(let i=0;i<p.files.length;i++){const f=p.files[i];ok(f.name===m.files[i].name&&f.sha256===m.files[i].sha256&&Buffer.byteLength(f.text)===m.files[i].bytes&&sha(Buffer.from(f.text))===f.sha256,'file_hash');ok(!fs.existsSync(folder+'/'+f.name),'already_staged');}
const c=JSON.parse(p.files[1].text);
for(const [n,h] of Object.entries(c.expectedHashes))ok(sha(fs.readFileSync(c.files[n]))===h,'entry_changed');
for(const [n,h] of Object.entries(c.expectedHashOnly))ok(sha(fs.readFileSync(c.hashOnly[n]))===h,'configuration_changed');
for(const f of p.files)write(folder+'/'+f.name,f.text);syncDir();
console.log(JSON.stringify({audit:'font-online-tool-staged',at:new Date().toISOString(),folder,code:m.code,files:m.files,applicationChanged:false,databasesOpened:0,transferPartsRetained:true}));
