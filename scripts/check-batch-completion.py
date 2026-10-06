"""Real XLSX partial import, correction, download and conflict UI; fresh synthetic DB only."""
import argparse,json,os,subprocess,tempfile,time
from datetime import datetime,timezone
from pathlib import Path
from openpyxl import Workbook,load_workbook
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1]

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=ROOT/'.test-output/batch-completion');args=parser.parse_args();out=args.output.resolve();out.mkdir(parents=True,exist_ok=True)
    report={'startedAt':datetime.now(timezone.utc).isoformat(),'data':'fresh synthetic fixtures only','published':False,'result':'RUNNING'}
    with tempfile.TemporaryDirectory(prefix='g27-batch-completion-') as temp:
        folder=Path(temp);(folder/'synthetic-flow-only').touch();env=dict(os.environ);env['PYTHONPATH']=str(ROOT/'.local-data/python')+os.pathsep+env.get('PYTHONPATH','')
        log=(folder/'server.log').open('w');server=subprocess.Popen(['node',str(ROOT/'scripts/fixtures/excel-customer-flow.mjs'),str(folder)],cwd=ROOT,env=env,stdout=log,stderr=log)
        try:
            deadline=time.monotonic()+45
            while not (folder/'ready.json').exists():
                if server.poll() is not None or time.monotonic()>deadline:raise RuntimeError('Fresh synthetic fixture failed to start')
                time.sleep(.1)
            fixture=json.loads((folder/'ready.json').read_text());base=fixture['url'];master=fixture['masters'][0];report['build']=fixture['built']
            workbook=Workbook();sheet=workbook.active;sheet.title='Produkte';sheet.append(['import_key','name','master_id','master_revision','price_eur','date'])
            for i in range(100):sheet.append(['completion-'+str(i),'Synthetisches Produkt '+str(i),master['id'],1,'14,99',''])
            sheet.cell(2,6,46301);sheet.cell(3,5,'falscher Preis');sheet.cell(4,2).value='';workbook.save(folder/'Mit-Fehlern.xlsx')
            with sync_playwright() as pw:
                browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1050});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                page.goto(base+'/werkstatt/serien/');page.wait_for_selector('#master option',state='attached')
                def get(route):
                    response=page.request.get(base+route);assert response.ok,(route,response.status);return response.json()
                def products():return {p['id']:p for p in get('/api/workshop/products')['products'] if p['kind']=='product'}
                def check(file):
                    page.locator('#file').set_input_files(str(file));page.click('#check');page.wait_for_function("!document.querySelector('#check').disabled");expect(page.locator('#review')).to_be_visible()
                def apply():
                    page.click('#import');page.wait_for_function("!document.querySelector('#check').disabled");expect(page.locator('#result')).to_be_visible()
                check(folder/'Mit-Fehlern.xlsx');expect(page.locator('#summary')).to_contain_text('100 Produkte · 3 Fehler');expect(page.locator('#rows')).to_contain_text('Datumsspalte als Text');expect(page.locator('#import')).to_be_disabled();assert not products()
                page.locator('#skip-errors').check();apply();expect(page.locator('#status')).to_contain_text('97 neue Konfigurationen');first=products();assert len(first)==97;expect(page.locator('#export-products input')).to_have_count(97)
                # A selected export product must survive later list refreshes.
                page.locator('.design-export summary').click();selected=next(iter(first));page.locator('#export-products input[value="'+selected+'"]').check();page.locator('.design-export summary').click()
                for width in [1440,390,768]:
                    page.set_viewport_size({'width':width,'height':1050});page.locator('#review').scroll_into_view_if_needed();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/('stapel-'+str(width)+'.png')))
                page.set_viewport_size({'width':1440,'height':1050})
                sheet.cell(2,6).value='';sheet.cell(3,5,'14,99');sheet.cell(4,2,'Synthetisches Produkt 2');workbook.save(folder/'Korrigiert.xlsx')
                check(folder/'Korrigiert.xlsx');expect(page.locator('#summary')).to_contain_text('0 Fehler · 97 bereits ausgeführt');apply();expect(page.locator('#status')).to_contain_text('3 neue Konfigurationen');complete=products();assert len(complete)==100 and all(complete[id]==record for id,record in first.items());expect(page.locator('#export-products input')).to_have_count(100);expect(page.locator('#export-products input[value="'+selected+'"]')).to_be_checked()
                check(folder/'Korrigiert.xlsx');apply();expect(page.locator('#status')).to_contain_text('0 neue Konfigurationen');assert products()==complete
                # Download the now complete selection without reloading the page.
                page.locator('.design-export summary').click();page.click('#export-select-all')
                with page.expect_download() as pending:page.click('#export-designs')
                pending.value.save_as(str(folder/'Bestand.xlsx'));exported=load_workbook(folder/'Bestand.xlsx');heads=[c.value for c in exported['Produkte'][1]];rows=[dict(zip(heads,r)) for r in exported['Produkte'].iter_rows(min_row=2,values_only=True)];assert len(rows)==100;assert {r['product_id'] for r in rows}==set(complete);assert all(r['expected_revision']==1 for r in rows);assert len(list(exported['Designs'].iter_rows(min_row=2)))==100
                report.update(xlsxRows=100,initialErrors=3,firstCreated=97,correctedCreated=3,repeatedCreated=0,stableProductIds=True,selectionRetained=True,downloadedProducts=100,downloadedDesigns=100)
                # Parallel edit after dry run is rejected; no partial update is silently applied.
                target=rows[0]['product_id'];exported['Produkte'].cell(2,heads.index('name')+1,'Tabellenänderung');exported.save(folder/'Aktualisierung.xlsx');page.locator('.design-export summary').click();check(folder/'Aktualisierung.xlsx');expect(page.locator('#summary')).to_contain_text('0 Fehler')
                csrf=get('/api/workshop/session')['csrfToken'];original=get('/api/workshop/products/'+target);changed=json.loads(json.dumps(original['document']));changed['name']='Zwischenzeitlich manuell geändert';response=page.request.patch(base+'/api/workshop/products/'+target,headers={'X-Gravuru-CSRF':csrf},data={'document':changed,'expectedRevision':1});assert response.ok
                page.click('#import');page.wait_for_function("!document.querySelector('#check').disabled");expect(page.locator('#status')).to_contain_text('Fehler');assert get('/api/workshop/products/'+target)['document']['name']==changed['name'];assert get('/api/workshop/products/'+target)['revision']==2;assert all(p['revision']==1 for id,p in products().items() if id!=target);expect(page.locator('#result')).not_to_be_visible()
                # Review again to expose the specific stale revision instead of retrying blindly.
                page.click('#check');page.wait_for_function("!document.querySelector('#check').disabled");expect(page.locator('#rows')).to_contain_text('zwischenzeitlich geändert');expect(page.locator('#import')).to_be_disabled()
                report.update(parallelEditPreserved=True,otherProductsUnchanged=True,viewports=[1440,390,768],javascriptErrors=errors);assert not errors,errors;browser.close();report['result']='PASS'
        except Exception as error:report.update(result='FAIL',error=str(error));raise
        finally:
            report['finishedAt']=datetime.now(timezone.utc).isoformat();(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');server.terminate()
            try:server.wait(timeout=10)
            except subprocess.TimeoutExpired:server.kill();server.wait()
            log.close()
    print(json.dumps(report,indent=2))

if __name__=='__main__':main()
