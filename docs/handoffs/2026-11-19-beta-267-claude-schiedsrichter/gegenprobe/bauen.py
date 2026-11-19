# Baut die Gegenprobe für einen Stand: python3 bauen.py <Arbeitskopie> <Zieldatei>
import re,sys,pathlib
root=pathlib.Path(sys.argv[1]).resolve(); ziel=pathlib.Path(sys.argv[2])
quelle=root/'app/workshop/theme-cart-flow.test.mjs'
src=quelle.read_text(encoding='utf-8')
def absolut(m):
    p=(quelle.parent/m.group(2)).resolve()
    return m.group(1)+'file://'+str(p)+m.group(3)
src,n=re.subn(r"(from\s+')(\.{1,2}/[^']+)(')",absolut,src)
src,n2=re.subn(r"(import\(')(\.{1,2}/[^']+)('\))",absolut,src)
marke=" now+=31*60*1000;assert.deepEqual((await request(customerImagePath)).body,storedCustomerPng"
assert src.count(marke)==1, src.count(marke)
einschub=(pathlib.Path(__file__).parent/'einschub.mjs.txt').read_text(encoding='utf-8').replace('__ROOT__','file://'+str(root))
src=src.replace(marke,einschub+marke)
src,n3=re.subn(r"new URL\('(\.{1,2}/[^']+)',\s*import\.meta\.url\)",lambda m:"new URL('file://"+str((quelle.parent/m.group(1)).resolve())+"')",src)
rest=n3
ziel.write_text(src,encoding='utf-8')
print('Importe umgeschrieben:',n,n2,'| URL-Bezüge umgeschrieben:',rest)
