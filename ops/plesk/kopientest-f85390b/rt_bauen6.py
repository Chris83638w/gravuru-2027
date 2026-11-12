import subprocess,hashlib,json,gzip,sys,os,struct
repo,rev,live,out=sys.argv[1:5]
def tree(r,paths):
    o=subprocess.run(['git','-C',repo,'ls-tree','-r',r,'--',*paths],capture_output=True,text=True,check=True).stdout
    return {l.split('\t')[1]:l.split()[2] for l in o.splitlines()}
new=tree(rev,['app','scripts','ops','package.json']);old=tree(live,['app','scripts','ops','package.json'])
head=[];body=bytearray();mit=0
for p,blob in sorted(new.items()):
    d=subprocess.run(['git','-C',repo,'cat-file','blob',blob],capture_output=True,check=True).stdout
    inc=old.get(p)!=blob
    head.append([p,len(d),hashlib.sha256(d).hexdigest(),1 if inc else 0])
    if inc: body+=d;mit+=1
h=json.dumps({'schema':'gravuru-rt-paket/v2','rev':rev,'files':head},separators=(',',':')).encode()
gz=gzip.compress(struct.pack('>I',len(h))+h+bytes(body),9,mtime=0)
PART=3_400_000;names=[]
for i in range(0,len(gz),PART):
    n='rt-%s-e.teil%02d'%(rev[:8],i//PART+1);open(os.path.join(out,n),'wb').write(gz[i:i+PART]);names.append([n,len(gz[i:i+PART]),hashlib.sha256(gz[i:i+PART]).hexdigest()])
baum=hashlib.sha256('\n'.join(a+' '+c for a,b,c,_ in head).encode()).hexdigest()
json.dump({'rev':rev,'dateien':len(head),'imPaket':mit,'gzBytes':len(gz),'gzSha256':hashlib.sha256(gz).hexdigest(),'baumSha256':baum,'teile':names},open(os.path.join(out,'rt-%s-e.json'%rev[:8]),'w'),indent=1)
print(len(head),'Dateien, davon im Paket',mit,'| roh',len(body),'gz',len(gz),'Teile',len(names),'Baum',baum[:16])
