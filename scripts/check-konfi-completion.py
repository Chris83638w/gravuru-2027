"""Unified entry -> editable draft -> immutable proof -> PDF/ZIP -> synthetic paid order.
Only creates a disposable loopback fixture. No real shop credentials or customer data.
"""
import argparse,base64,hashlib,hmac,io,json,os,subprocess,tempfile,time,zipfile
from datetime import datetime,timezone
from pathlib import Path
from PIL import Image,ImageDraw
import pymupdf
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
def inspect_pdf(data,profile='roland'):
    doc=pymupdf.open(stream=data,filetype='pdf');page=doc[0]
    objects='\n'.join(doc.xref_object(i) for i in range(1,doc.xref_length()))
    assert abs(page.rect.width*25.4/72-120)<.001
    assert abs(page.rect.height*25.4/72-80)<.001
    assert '/DeviceCMYK' in objects and '/Separation /CutContour' in objects
    assert ('/Separation /RDG_WHITE' in objects)==(profile=='roland')
    layers=doc.get_ocgs();white=[i for i,v in layers.items() if v['name'] in ['RDG_WHITE','Weissersatz Vektor']];assert white
    doc.set_layer(-1,on=white,off=[i for i in layers if i not in white]);only=pymupdf.open(stream=doc.tobytes(),filetype='pdf');pix=only[0].get_pixmap(matrix=pymupdf.Matrix(2,2),alpha=True);k=144/25.4
    sample=lambda x,y:list(pix.pixel(round(x*k),round(y*k)))
    assert sample(5,5)[3]==0 and sample(8,40)[3]==0
    assert sample(30,10)[3]>240 and sample(60,52)[3]>240
    return {'widthMm':120,'heightMm':80,'cmyk':True,'cutContour':True,'whiteUnderInkOnly':True,'profile':profile}
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=ROOT/'.test-output/konfi-completion');args=parser.parse_args();out=args.output.resolve();out.mkdir(parents=True,exist_ok=True)
    report={'startedAt':datetime.now(timezone.utc).isoformat(),'result':'RUNNING','data':'synthetic only','published':False,'realShopifyOrder':False,'machineApproval':False,'checks':{}}
    with tempfile.TemporaryDirectory(prefix='g27-completion-') as temporary:
        folder=Path(temporary);(folder/'synthetic-completion-only').touch();env=dict(os.environ);env['PYTHONPATH']=str(ROOT/'.local-data/python')+os.pathsep+env.get('PYTHONPATH','');log=(folder/'server.log').open('w');server=subprocess.Popen(['node',str(ROOT/'scripts/fixtures/konfi-completion.mjs'),str(folder)],cwd=ROOT,env=env,stdout=log,stderr=log)
        page=None
        try:
            deadline=time.monotonic()+60
            while not (folder/'ready.json').exists():
                if server.poll() is not None or time.monotonic()>deadline:raise RuntimeError('Synthetic fixture startup failed: '+(folder/'server.log').read_text()[-1500:])
                time.sleep(.1)
            f=json.loads((folder/'ready.json').read_text());base=f['url'];report['build']=f['built'];errors=[]
            image=Image.new('RGB',(900,600),'#2561a1');draw=ImageDraw.Draw(image);draw.rectangle((0,0,450,600),fill='#e8b34b');photo=folder/'synthetic-photo.png';image.save(photo)
            with sync_playwright() as pw:
                browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context(viewport={'width':1440,'height':1050});page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
                def get(route):
                    r=page.request.get(base+route);assert r.ok,(route,r.status);return r.json()
                csrf=get('/api/workshop/session')['csrfToken']
                def post(route,data):
                    r=page.request.post(base+route,headers={'X-Gravuru-CSRF':csrf},data=data);assert r.ok,(route,r.status,r.text()[:300]);return r
                route='/?group='+f['group']['id']+'&groupRevision=1';page.goto(base+route);page.wait_for_selector('iframe');frame=page.frame_locator('iframe');expect(frame.locator('#customer-workspace')).to_be_visible();expect(frame.locator('#konfi-variant')).to_have_value('acryl')
                frame.locator('#konfi-back').click();expect(page.locator('#intro')).to_be_visible();expect(page.locator('#intro h1')).to_have_text('Acryl · Zuhause');page.locator('#open').click();expect(frame.locator('#customer-workspace')).to_be_visible();assert '1499' not in frame.locator('#customer-price').inner_text();expect(frame.locator('#customer-price')).to_contain_text('14,99')
                frame.locator('#konfi-tab-text').click();frame.locator('[data-select="name"]').click();field=frame.locator('[data-value="text"]');field.fill('Familie Winter');expect(frame.locator('#save-draft')).to_be_enabled();frame.locator('#save-draft').click();expect(frame.locator('#save-state')).to_have_text('Entwurf gespeichert')
                frame.locator('#konfi-tab-photo').click();frame.locator('[data-select="photo"]').click();frame.locator('#customer-photo-input').set_input_files(str(photo));expect(frame.locator('[data-photo="clear"]')).to_be_visible();expect(frame.locator('#save-draft')).to_be_enabled()
                frame.locator('[data-photo="edit"]').click();expect(frame.locator('#direct-editor')).to_be_visible();frame.locator('[data-value="tone"]').select_option('grayscale');frame.locator('[data-crop="zoom"]').fill('1.4');frame.locator('[data-crop="zoom"]').dispatch_event('input');expect(frame.locator('#apply-direct')).to_be_enabled();frame.locator('#apply-direct').click();frame.locator('#save-draft').click();expect(frame.locator('#save-state')).to_have_text('Entwurf gespeichert')
                frame.locator('#konfi-tab-options').click();frame.locator('#konfi-variant').select_option('oak');expect(frame.locator('#customer-price')).to_contain_text('24,99');expect(frame.locator('#konfi-tab-photo')).to_be_hidden();expect(frame.locator('#konfi-tab-design')).to_be_hidden();frame.locator('#konfi-variant').select_option('acryl');expect(frame.locator('#customer-price')).to_contain_text('14,99');frame.locator('#konfi-tab-text').click();frame.locator('[data-select="name"]').click();expect(frame.locator('[data-value="text"]')).to_have_value('Familie Winter')
                frame.locator('#konfi-tab-design').click();frame.locator('[data-design="plain"]').click();expect(frame.locator('#konfi-tab-photo')).to_be_hidden();frame.locator('[data-design="memory"]').click();expect(frame.locator('#konfi-tab-photo')).to_be_visible();frame.locator('#konfi-tab-text').click();frame.locator('[data-select="name"]').click();expect(frame.locator('[data-value="text"]')).to_have_value('Familie Winter')
                page.reload();page.wait_for_selector('iframe');expect(frame.locator('#customer-workspace')).to_be_visible();frame.locator('#konfi-tab-photo').click();frame.locator('[data-select="photo"]').click();expect(frame.locator('[data-value="tone"]')).to_have_value('grayscale');expect(frame.locator('[data-crop="zoom"]')).to_have_value('1.4')
                page.screenshot(path=str(out/'konfi-desktop.png'),full_page=True)
                for width in [390,768]:
                    page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert frame.locator('body').evaluate('()=>document.documentElement.scrollWidth<=innerWidth')
                    if width==390:page.screenshot(path=str(out/'konfi-mobile.png'),full_page=True)
                page.set_viewport_size({'width':1440,'height':1050})
                # Finishing saves the last validated edit automatically.
                frame.locator('#konfi-tab-text').click();frame.locator('[data-select="name"]').click();frame.locator('[data-value="text"]').fill('Familie Winter');expect(frame.locator('#capture-review')).to_be_enabled();frame.locator('#capture-review').click();expect(frame.locator('#review-receipt')).to_contain_text('gesichert',timeout=30000)
                proof=get('/api/workshop/review-snapshots')['snapshots'][0];snapshot=proof['id'];detail=get('/api/workshop/review-snapshots/'+snapshot);manifest=detail['manifest'];assert manifest['product']['revision']==1 and len(manifest['photos'])==1
                assert not manifest['productionReady'];report['checks']['konfi']={'groupSwitch':True,'designSwitch':True,'textAndPhotoRetainedOnReload':True,'singleDesignTabHidden':True,'noPhotoTabWithoutPhoto':True,'viewports':[1440,390,768]}
                operator=context.new_page();operator.on('pageerror',lambda e:errors.append(str(e)));operator.goto(base+'/werkstatt/pruefstaende/?snapshot='+snapshot);expect(operator.locator('#review-detail')).to_be_visible()
                def download(selector,name):
                    with operator.expect_download(timeout=90000) as dl:operator.locator(selector).click()
                    target=out/name;dl.value.save_as(str(target));return target.read_bytes()
                assert operator.locator('#print-form [name="format"]').input_value()=='pdf';assert operator.locator('#print-form [name="dpi"]').input_value()=='300';assert operator.locator('#print-form [name="white"]').input_value()=='motif';assert operator.locator('#print-form [name="bleedMm"]').input_value()=='0'
                pdf=download('#print-form [type="submit"]','roland.pdf');report['checks']['roland']=inspect_pdf(pdf)
                operator.locator('#print-form [name="profile"]').select_option('mimaki');operator.locator('#print-form [name="format"]').select_option('zip');archive=download('#print-form [type="submit"]','mimaki.zip')
                with zipfile.ZipFile(io.BytesIO(archive)) as z:
                    report['checks']['mimaki']=inspect_pdf(z.read('technische-druckpruefung.pdf'),'mimaki');metadata=json.loads(z.read('druckpruefung.json'));assert metadata['settings']['dpi']==300 and metadata['settings']['white']=='motif' and metadata['settings']['bleedMm']==0
                    m=json.loads(z.read('manifest.json'));assert all(hashlib.sha256(z.read(a['path'])).hexdigest()==a['sha256'] for a in m['files']);assert z.read(m['photos'][0]['path'])==photo.read_bytes();saved=json.loads(z.read('produkt-und-gestaltung.json'));assert saved['customer']['fields'][0]['text']=='Familie Winter'
                separate=download('[data-download="photos"]','originalfotos.zip')
                with zipfile.ZipFile(io.BytesIO(separate)) as z:assert len(z.namelist())==1 and z.read(z.namelist()[0])==photo.read_bytes()
                # The snapshot and downloaded production bytes stay fixed after later edits.
                frame.locator('#konfi-tab-text').click();frame.locator('[data-select="name"]').click();frame.locator('[data-value="text"]').fill('Spätere Änderung');expect(frame.locator('#save-draft')).to_be_enabled();frame.locator('#save-draft').click();expect(frame.locator('#save-state')).to_have_text('Entwurf gespeichert');assert get('/api/workshop/review-snapshots/'+snapshot)==detail
                # Exercise a local signed TEST order, never the real Shopify service.
                binding=post('/api/workshop/order-bindings',{'shopDomain':f['webhook']['shopDomain'],'variantId':'301','productId':f['products'][0]['id'],'productRevision':1}).json()
                offer=post('/api/workshop/order-offers',{'bindingId':binding['id'],'snapshotId':snapshot,'quantity':1}).json()
                payload={'id':101,'test':True,'financial_status':'paid','currency':'EUR','cancelled_at':None,'line_items':[{'id':201,'variant_id':301,'quantity':1,'price':'14.99','properties':[offer['property']]}]};raw=json.dumps(payload,separators=(',',':')).encode();headers={'Content-Type':'application/json','x-shopify-hmac-sha256':base64.b64encode(hmac.new(f['webhook']['secret'].encode(),raw,hashlib.sha256).digest()).decode(),'x-shopify-shop-domain':f['webhook']['shopDomain'],'x-shopify-api-version':f['webhook']['apiVersion'],'x-shopify-topic':'orders/paid','x-shopify-webhook-id':'synthetic-completion-1'}
                r=page.request.post(base+'/api/workshop/order-webhook',headers=headers,data=raw);assert r.ok,r.text();received=r.json();assert received['lines'][0]['product']['revision']==1 and received['lines'][0]['totalCents']==1499;assert not received['lines'][0]['customerDownloadAllowed'];r=page.request.post(base+'/api/workshop/order-webhook',headers=headers,data=raw);assert r.json()['duplicate']
                line=received['lines'][0];input={'name':'Neuer Produktentwurf aus Testgestaltung','textMode':'template'}
                plan=post('/api/workshop/orders/'+line['id']+'/product-draft/preview',input).json()
                copied=post('/api/workshop/orders/'+line['id']+'/product-draft/apply',{**input,'token':plan['token']}).json();assert copied['created']
                assert copied['product']['document']['designs'][0]['fields'][0]['text']=='Unser Zuhause'
                assert 'mediaId' not in json.dumps(copied['product']['document'])
                assert not post('/api/workshop/orders/'+line['id']+'/product-draft/apply',{**input,'token':plan['token']}).json()['created']
                assert get('/api/workshop/review-snapshots/'+snapshot)==detail
                operator.locator('#print-form [name="profile"]').select_option('roland');operator.locator('#print-form [name="format"]').select_option('pdf');assert download('#print-form [type="submit"]','roland-repeat.pdf')==pdf
                report['checks'].update(orderToProductWithoutPrivatePhoto=True,repeatCreatesNoProductDuplicate=True,repeatPdfByteIdentical=True)
                operator.screenshot(path=str(out/'werkstatt-export.png'),full_page=True);assert not errors,errors
                report['checks'].update(snapshotImmutableAfterLaterEdit=True,zipHashesAndOriginalPhoto=True,syntheticPaidOrderAndDuplicate=True,javascriptErrors=errors);report['result']='PASS';browser.close()
        except Exception as e:
            report.update(result='FAIL',error=str(e))
            if page:
                try:page.screenshot(path=str(out/'failure.png'),full_page=True)
                except Exception:pass
            raise
        finally:
            report['finishedAt']=datetime.now(timezone.utc).isoformat();(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');server.terminate()
            try:server.wait(timeout=10)
            except subprocess.TimeoutExpired:server.kill();server.wait()
            log.close()
    print(json.dumps(report,indent=2))
if __name__=='__main__':main()
