"""Changed Excel/profile/customer controls only; fresh synthetic loopback data."""
import json, os, runpy, subprocess, tempfile, time
from pathlib import Path
from datetime import datetime, timezone
from openpyxl import load_workbook
from playwright.sync_api import sync_playwright, expect
ROOT = Path(__file__).resolve().parents[1]
workbook = runpy.run_path(str(ROOT/'scripts/check-saved-excel-resume.py'))['workbook']
OUT = ROOT/'.test-output/excel-profiles'
OUT.mkdir(parents=True, exist_ok=True)
report = {'startedAt': datetime.now(timezone.utc).isoformat(), 'scope':'synthetic local changed flows only', 'checks':{}, 'serverAcceptance':False, 'physicalPrintAcceptance':False}
with tempfile.TemporaryDirectory(prefix='g27-profile-browser-') as tmp:
    folder=Path(tmp);(folder/'synthetic-flow-only').touch()
    env=dict(os.environ);env['PYTHONPATH']=str(ROOT/'.local-data/python')+os.pathsep+env.get('PYTHONPATH','')
    with (folder/'server.log').open('w') as log:
        server=subprocess.Popen(['node',str(ROOT/'scripts/fixtures/excel-customer-flow.mjs'),str(folder)],cwd=ROOT,env=env,stdout=log,stderr=log)
        try:
            end=time.monotonic()+45
            while not (folder/'ready.json').exists():
                if server.poll() is not None or time.monotonic()>end:raise RuntimeError('Fixture failed to start')
                time.sleep(.1)
            fixture=json.loads((folder/'ready.json').read_text());base=fixture['url']
            with sync_playwright() as pw:
                browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
                page=browser.new_page(viewport={'width':1440,'height':1050});errors=[]
                page.on('pageerror',lambda error:errors.append(str(error)))
                def get(path):
                    r=page.request.get(base+'/api/workshop/'+path);assert r.ok,(path,r.status);return r.json()
                csrf=get('session')['csrfToken']
                def send(path,data,method='POST'):
                    r=page.request.fetch(base+'/api/workshop/'+path,method=method,headers={'X-Gravuru-CSRF':csrf},data=data);assert r.ok,(path,r.status,r.text());return r.json()
                fonts=get('form-fonts')['fonts'];motifs=get('form-motifs')['motifs']
                font=send('profiles',{'name':'Synthetische Schriftwahl','type':'fonts','items':[fonts[2]['id']]})
                motif=send('profiles',{'name':'Synthetische Motivwahl','type':'motifs','items':[motifs[0]['key']]})
                master=get('products/'+fixture['masters'][0]['id']);master['document']['designs'][0]['additions']={'text':True,'motifs':True,'maxElements':8}
                master=send('products/'+master['id'],{'expectedRevision':master['revision'],'document':master['document']},'PATCH')
                rows=[{'import_key':key,'name':name,'master_id':master['id'],'master_revision':master['revision'],'font_profile':fp,'motif_profile':mp} for key,name,fp,mp in [('own','Profilprodukt',font['id'],motif['id']),('empty','Leere Auswahl','empty','empty'),('bad','Profil korrigieren',motif['id'],motif['id'])]]
                file=folder/'Profile.xlsx';workbook(file,{'Produkte':rows})
                page.goto(base+'/werkstatt/serien/');page.locator('#file').set_input_files(str(file));page.click('#check');expect(page.locator('#summary')).to_contain_text('1 Fehler')
                expect(page.locator('.profile-binding')).to_have_count(2)
                page.locator('.profile-binding').first.locator('summary').click();expect(page.locator('.profile-binding').first).to_contain_text(font['id'])
                page.locator('#job-name').fill('Profilzuordnung wiederaufnehmen');page.click('#save-job');expect(page.locator('#save-job')).to_be_enabled();job=page.locator('#saved-jobs').input_value();assert job
                with page.expect_download() as dl:page.click('#download-errors')
                correction=folder/'Korrektur.xlsx';dl.value.save_as(correction);b=load_workbook(correction);assert b['Produkte']['X1'].value=='font_profile';assert b['Produkte']['X2'].value==motif['id'];b['Produkte']['X2']=font['id'];b.save(correction)
                page.check('#skip-errors');page.click('#import');expect(page.locator('#result')).to_be_visible()
                items=get('products')['products'];products={p['name']:get('products/'+p['id']) for p in items if p['kind']=='product'};assert len(products)==2
                own=products['Profilprodukt'];empty=products['Leere Auswahl'];assert own['metadata']['profiles']['sources']['fonts']['profileRevision']==1
                page.reload();page.select_option('#saved-jobs',job);page.click('#open-job');expect(page.locator('#summary')).to_contain_text('2 bereits ausgeführt')
                page.locator('#file').set_input_files(str(correction));page.click('#check');expect(page.locator('#summary')).to_contain_text('0 Fehler');page.click('#import');expect(page.locator('#result')).to_be_visible();assert len([p for p in get('products')['products'] if p['kind']=='product'])==3
                assert get('products/'+own['id'])==own
                report['checks']['xlsxAssignmentsCorrectionAndSavedResume']=True
                template=page.request.get(base+'/api/workshop/import-template');(folder/'Vorlage.xlsx').write_bytes(template.body());b=load_workbook(folder/'Vorlage.xlsx');assert [b['Produkte'].cell(1,i).value for i in range(24,28)]==['font_profile','motif_profile','production_profile_id','production_profile_revision']
                page.locator('#file').set_input_files(str(folder/'Vorlage.xlsx'));native=next(p for p in get('products')['products'] if p['kind']=='master' and not p.get('overview',{}).get('formProduct'));page.select_option('#master',native['id']);page.click('#check');expect(page.locator('#summary')).to_contain_text('0 Fehler')
                report['checks']['shippedTemplateParsesWithFourNewColumns']=True
                page.goto(base+'/werkstatt/formprodukt/?configuration='+own['id']);expect(page.locator('#choice-profiles-enabled')).to_be_checked();expect(page.locator('[data-choice-profile=fonts]')).to_have_value(font['id'])
                page.locator('[data-choice-profile=motifs]').select_option('empty');page.click('#save');expect(page.locator('#revision')).to_contain_text('Stand 2');assert get('products/'+own['id'])['document']['profileAssignments']['motifs']['mode']=='empty'
                for width in [1440,390,768]:
                    page.set_viewport_size({'width':width,'height':1050});assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),('merchant',width)
                page.set_viewport_size({'width':1440,'height':1050});page.screenshot(path=str(OUT/'form-profile-controls.png'),full_page=True)
                report['checks']['merchantAssignmentsSaveAndReopen']=True
                page.goto(base+'/konfigurator/form/?configuration='+own['id']+'&revision=1');expect(page.locator('#customer-workspace')).to_be_visible();expect(page.locator('#motif-grid button')).to_have_count(1)
                page.click('#konfi-tab-text');page.locator('[data-select=name]').click();options=page.locator('[data-value=font] option').evaluate_all('(els)=>els.map(e=>e.value)');assert options==[fonts[2]['id'],own['document']['designs'][0]['fields'][0]['font']]
                page.select_option('[data-value=font]',fonts[2]['id']);expect(page.locator('#save-draft')).to_be_enabled();page.click('#save-draft');expect(page.locator('#save-state')).to_have_text('Entwurf gespeichert')
                send('profiles/'+font['id'],{'document':{'name':font['name'],'type':'fonts','items':[fonts[3]['id']]},'expectedRevision':1},'PATCH')
                page.reload();expect(page.locator('#customer-workspace')).to_be_visible();page.click('#konfi-tab-text');page.locator('[data-select=name]').click();expect(page.locator('[data-value=font]')).to_have_value(fonts[2]['id']);assert fonts[3]['id'] not in page.locator('[data-value=font] option').evaluate_all('(els)=>els.map(e=>e.value)')
                page.click('#konfi-tab-motif');page.locator('#motif-grid button').click();expect(page.locator('#customer-status')).to_contain_text('Motiv in einer freien Fläche eingefügt');page.click('#save-draft');expect(page.locator('#save-state')).to_have_text('Entwurf gespeichert')
                for width in [1440,390,768]:
                    page.set_viewport_size({'width':width,'height':1050});assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),('customer',width)
                page.set_viewport_size({'width':390,'height':1050});page.screenshot(path=str(OUT/'customer-profile-choice-mobile.png'),full_page=True)
                report['checks']['customerFrozenSelectionAfterProfileChange']=True
                page.goto(base+'/konfigurator/form/?configuration='+empty['id']+'&revision=1');expect(page.locator('#customer-workspace')).to_be_visible();page.click('#konfi-tab-text');expect(page.locator('#add-own-text')).to_be_disabled();expect(page.locator('#motif-grid button')).to_have_count(0);page.click('#konfi-tab-text');page.locator('[data-select=name]').click();expect(page.locator('[data-value=font] option')).to_have_count(1)
                report['checks']['explicitEmptyKeepsOriginalFieldsAndBlocksNewChoices']=True
                assert errors==[],errors;report['javascriptErrors']=errors;report['result']='PASS';browser.close()
        finally:
            server.terminate();server.wait(timeout=20)
(OUT/'report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
print(json.dumps({'result':report['result'],'checks':len(report['checks'])}))
