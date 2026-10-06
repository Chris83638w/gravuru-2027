"""Real XLSX -> operator browser -> variant picker -> customer draft integration.
Runs only against a fresh loopback fixture, never accepts a live URL or database.
"""
import argparse,json,os,subprocess,tempfile,time
from datetime import datetime,timezone
from pathlib import Path
from openpyxl import Workbook,load_workbook
from playwright.sync_api import sync_playwright,expect
import pymupdf
ROOT=Path(__file__).resolve().parents[1]

def table(file,products,designs):
    w=Workbook();s=w.active;s.title='Produkte'
    columns=['import_key','name','master_id','master_revision','price_eur','action','product_id','expected_revision'];s.append(columns)
    for row in products:s.append([row.get(c,'') for c in columns])
    s=w.create_sheet('Designs');columns=['import_key','design_id','design_name','design_file','design_page','design_fit','default_design'];s.append(columns)
    for row in designs:s.append([row.get(c,'') for c in columns])
    w.save(file)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=ROOT/'.test-output/excel-customer-flow');parser.add_argument('--chromium',default='/usr/bin/chromium');args=parser.parse_args();output=args.output.resolve();output.mkdir(parents=True,exist_ok=True)
    report={'startedAt':datetime.now(timezone.utc).isoformat(),'data':'fresh synthetic fixtures only','published':False,'checks':{},'result':'RUNNING'}
    def save(): (output/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    save()
    with tempfile.TemporaryDirectory(prefix='g27-excel-customer-flow-') as temp:
        folder=Path(temp);(folder/'synthetic-flow-only').touch();env=dict(os.environ);env['PYTHONPATH']=str(ROOT/'.local-data/python')+os.pathsep+env.get('PYTHONPATH','')
        log=(folder/'server.log').open('w');server=subprocess.Popen(['node',str(ROOT/'scripts/fixtures/excel-customer-flow.mjs'),str(folder)],cwd=ROOT,env=env,stdout=log,stderr=log)
        try:
            deadline=time.monotonic()+40
            while not (folder/'ready.json').exists():
                if server.poll() is not None or time.monotonic()>deadline:raise RuntimeError('Synthetic fixture failed to start; no live environment was used.')
                time.sleep(.1)
            fixture=json.loads((folder/'ready.json').read_text());base=fixture['url'];masters=fixture['masters'];report['build']=fixture['built'];errors=[]
            svg=folder/'Zusatz.svg';svg.write_text('<svg xmlns="http://www.w3.org/2000/svg" width="120mm" height="80mm" viewBox="0 0 120 80"><circle cx="60" cy="40" r="25" fill="#eab676"/><path d="M40 40H80" stroke="#333" stroke-width="2"/></svg>')
            pdf=folder/'Zusatz.pdf';doc=pymupdf.open();p=doc.new_page(width=160*72/25.4,height=100*72/25.4);p.draw_rect(pymupdf.Rect(30,30,380,230),color=(0,0,0),width=2);doc.save(pdf);doc.close()
            prices=[1499,1999,2499];master_indices=[0,0,1]
            products=[{'import_key':'flow-'+str(i),'name':['Acryl · Klein','Acryl · Geschenk','Eiche · Groß'][i],'master_id':masters[m]['id'],'master_revision':1,'price_eur':str(price//100)+','+str(price%100).zfill(2)} for i,(m,price) in enumerate(zip(master_indices,prices))]
            designs=[{'import_key':'flow-'+str(i),'design_id':'extra','design_name':'Zusatzdesign','design_file':'Zusatz.pdf' if i==2 else 'Zusatz.svg','design_page':1,'design_fit':'original','default_design':1} for i in range(3)]
            table(folder/'Anlage.xlsx',products,designs)
            with sync_playwright() as pw:
                browser=pw.chromium.launch(executable_path=args.chromium,args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1050});page.on('pageerror',lambda e:errors.append(str(e)))
                def goto(route):page.goto(base+route)
                def get(route):
                    r=page.request.get(base+route);assert r.ok,(route,r.status);return r.json()
                def batch_check(file):
                    page.locator('#file').set_input_files(str(file));page.click('#check');page.wait_for_function("!document.querySelector('#check').disabled");assert '0 Fehler' in page.inner_text('#summary'),page.inner_text('#rows')
                def download(button,destination):
                    with page.expect_download() as dl:page.click(button)
                    dl.value.save_as(str(destination))
                goto('/werkstatt/serien/');page.locator('#design-files').set_input_files([str(svg),str(pdf)]);batch_check(folder/'Anlage.xlsx');assert '3 Produkte' in page.inner_text('#summary');page.click('#import');page.wait_for_selector('#result:not([hidden])');assert '3 neue Konfigurationen' in page.inner_text('#status')
                all_products=get('/api/workshop/products')['products'];records=sorted([r for r in all_products if r['kind']=='product'],key=lambda r:r['name']);ids=[next(r['id'] for r in records if r['name']==p['name']) for p in products]
                for i,id in enumerate(ids):
                    r=get('/api/workshop/products/'+id);d=r['document'];assert r['revision']==1 and d['basePriceCents']==prices[i];assert len(d['designs'])==2 and d['defaultDesignId']=='extra';assert d['form']['geometry']['widthMm']==masters[master_indices[i]]['width'];assert d['designs'][0]['fields'][0]['text']=='Mustername'
                batch_check(folder/'Anlage.xlsx');page.click('#import');page.wait_for_selector('#result:not([hidden])');assert '0 neue Konfigurationen' in page.inner_text('#status');assert len([r for r in get('/api/workshop/products')['products'] if r['kind']=='product'])==3
                report['checks']['realXlsxSvgPdfCreationAndRepeat']={'created':3,'repeatCreated':0,'designsPerProduct':2};save()
                # Download existing designs, edit the inherited design name/default, and reimport.
                goto('/werkstatt/serien/');page.wait_for_selector('#export-products input',state='attached');page.locator('.design-export summary').click();page.click('#export-select-all');download('#export-designs',folder/'Designs.xlsx');w=load_workbook(folder/'Designs.xlsx')
                for row in w['Designs'].iter_rows(min_row=2):
                    if row[1].value=='home':row[2].value='Persönliches Zuhause';row[6].value=1
                    else:row[6].value=0
                w.save(folder/'Designs-bearbeitet.xlsx');batch_check(folder/'Designs-bearbeitet.xlsx');page.click('#import');page.wait_for_selector('#result:not([hidden])');assert '3 Aktualisierungen' in page.inner_text('#status')
                before=[get('/api/workshop/products/'+id) for id in ids];assert all(r['revision']==2 and r['document']['defaultDesignId']=='home' for r in before);report['checks']['designUpdate']={'updated':3,'productRevision':2,'originalFieldRetained':True}
                # Use exported reference catalog to compose a group, then upload through the real UI.
                goto('/werkstatt/ausfuehrungen-import/');page.wait_for_function("!document.querySelector('#export').disabled");download('#export',folder/'Ausfuehrungen.xlsx');w=load_workbook(folder/'Ausfuehrungen.xlsx');catalog=list(w['Produktliste'].values);refs={r[0]:r[1] for r in catalog[1:]};assert all(refs[id]==2 for id in ids)
                for c,v in enumerate(['flow-group','Unser Zuhause · Materialauswahl','create','',''],1):w['Gruppen'].cell(2,c,v)
                for i,id in enumerate(ids):
                    for c,v in enumerate(['flow-group','v'+str(i),products[i]['name'],id,refs[id],1 if i==0 else 0],1):w['Varianten'].cell(i+2,c,v)
                w.save(folder/'Auswahl.xlsx');page.locator('#file').set_input_files(str(folder/'Auswahl.xlsx'));page.click('#check');page.wait_for_function("!document.querySelector('#check').disabled");assert '0 Fehler' in page.inner_text('#summary');page.click('#apply');page.wait_for_selector('#result:not([hidden])');assert '1 neue Gruppen' in page.inner_text('#notice');group=page.locator('#results a').first.get_attribute('href').split('group=')[1]
                options=get('/api/workshop/variants/'+group+'/options?revision=1');assert [v['productRevision'] for v in options['variants']]==[2,2,2];assert [v['basePriceCents'] for v in options['variants']]==prices;report['checks']['groupFromExportedCatalog']={'groups':1,'variants':3,'productRevisions':[2,2,2]};save()
                picker='/konfigurator/ausfuehrungen/?group='+group+'&revision=1'
                for i,id in enumerate(ids):
                    goto(picker);page.wait_for_selector('[data-variant]');page.click('[data-variant="v'+str(i)+'"]');page.click('#continue');page.wait_for_selector('iframe');customer=page.frame_locator('iframe');expect(customer.locator('#customer-workspace')).to_be_visible()
                    assert 'configuration='+id in page.url and 'revision=2' in page.url;assert customer.locator('#customer-design').input_value()=='home';assert customer.locator('#customer-design option').count()==2
                    assert str(prices[i]//100)+','+str(prices[i]%100).zfill(2) in customer.locator('#customer-price').inner_text();assert str(masters[master_indices[i]]['width']) in customer.locator('#product-size').inner_text()
                    customer.locator('#konfi-tab-text').click();customer.locator('#customer-fields button').first.click();customer.locator('#field-controls textarea').fill('Probe '+str(i));expect(customer.locator('#save-draft')).to_be_enabled();customer.locator('#save-draft').click();expect(customer.locator('#save-state')).to_have_text('Entwurf gespeichert')
                    page.reload();expect(customer.locator('#customer-workspace')).to_be_visible();customer.locator('#konfi-tab-text').click();customer.locator('#customer-fields button').first.click();assert customer.locator('#field-controls textarea').input_value()=='Probe '+str(i)
                    customer.locator('#konfi-tab-design').click();customer.locator('[data-design="extra"]').click();expect(customer.locator('#customer-design')).to_have_value('extra');customer.locator('[data-design="home"]').click();expect(customer.locator('#customer-design')).to_have_value('home');customer.locator('#konfi-tab-text').click();customer.locator('#customer-fields button').first.click();assert customer.locator('#field-controls textarea').input_value()=='Probe '+str(i)
                    assert get('/api/workshop/products/'+id)==before[i]
                report['checks']['customerHandoff']={'openedVariants':3,'correctPricesAndDimensions':True,'editableFieldsSavedAndReloaded':True,'designSwitchRetainsOwnDraft':True,'productTemplatesUnchanged':True};save()
                # Later backend changes cannot silently change a pinned group or old customer URL.
                csrf=get('/api/workshop/session')['csrfToken'];changed=json.loads(json.dumps(before[0]['document']));changed['basePriceCents']=9999;changed['designs'][0]['name']='Späterer Name';r=page.request.patch(base+'/api/workshop/products/'+ids[0],headers={'X-Gravuru-CSRF':csrf},data={'document':changed,'expectedRevision':2});assert r.ok;assert r.json()['revision']==3
                old=get('/api/workshop/variants/'+group+'/options?revision=1');assert old['variants'][0]['productRevision']==2 and old['variants'][0]['currentRevision']==3 and old['variants'][0]['basePriceCents']==1499
                goto(picker);page.wait_for_selector('[data-variant]');page.click('[data-variant="v0"]');page.click('#continue');page.wait_for_selector('iframe');customer=page.frame_locator('iframe');expect(customer.locator('#customer-workspace')).to_be_visible();assert '14,99' in customer.locator('#customer-price').inner_text();assert 'Persönliches Zuhause' in customer.locator('#customer-design').inner_text()
                report['checks']['laterBackendEditKeepsPinnedCustomerVersion']=True
                page.screenshot(path=str(output/'customer-desktop.png'),full_page=True)
                goto(picker);page.wait_for_selector('[data-variant]');page.screenshot(path=str(output/'variants-desktop.png'),full_page=True)
                for width in [390,768]:
                    page.set_viewport_size({'width':width,'height':1050});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                    if width==390:page.screenshot(path=str(output/'variants-mobile.png'),full_page=True)
                    page.click('[data-variant="v1"]');page.click('#continue');page.wait_for_selector('iframe');expect(page.frame_locator('iframe').locator('#customer-workspace')).to_be_visible();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');goto(picker);page.wait_for_selector('[data-variant]')
                report['viewports']=[1440,390,768];report['javascriptErrors']=errors;assert not errors,errors;browser.close()
            report['result']='PASS'
        except Exception as error:
            report['result']='FAIL';report['error']=str(error);raise
        finally:
            report['finishedAt']=datetime.now(timezone.utc).isoformat();save();server.terminate()
            try:server.wait(timeout=10)
            except subprocess.TimeoutExpired:server.kill();server.wait()
            log.close()
    print(json.dumps(report,indent=2))
if __name__=='__main__':main()
