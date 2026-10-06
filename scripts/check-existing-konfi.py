"""Verify dashboard -> saved revision -> existing acrylic editor. Synthetic only."""
import argparse,json,os,subprocess,tempfile,time
from datetime import datetime,timezone
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=ROOT/'.test-output/existing-konfi');parser.add_argument('--chromium',default='/usr/bin/chromium');args=parser.parse_args();out=args.output.resolve();out.mkdir(parents=True,exist_ok=True)
    report={'startedAt':datetime.now(timezone.utc).isoformat(),'data':'synthetic product, existing acrylic configurator','result':'RUNNING','published':False}
    with tempfile.TemporaryDirectory(prefix='g27-existing-konfi-') as temporary:
        folder=Path(temporary);(folder/'synthetic-konfi-only').touch();env=dict(os.environ);env['PYTHONPATH']=str(ROOT/'.local-data/python')+os.pathsep+env.get('PYTHONPATH','');log=(folder/'server.log').open('w');server=subprocess.Popen(['node',str(ROOT/'scripts/fixtures/existing-konfi.mjs'),str(folder)],cwd=ROOT,env=env,stdout=log,stderr=log)
        try:
            deadline=time.monotonic()+40
            while not (folder/'ready.json').exists():
                if server.poll() is not None or time.monotonic()>deadline:raise RuntimeError('Synthetic fixture startup failed.')
                time.sleep(.1)
            m=json.loads((folder/'ready.json').read_text());base=m['url'];report['build']=m['built'];errors=[]
            with sync_playwright() as pw:
                browser=pw.chromium.launch(executable_path=args.chromium,args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1050});page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'/werkstatt/?configuration='+m['id']);page.wait_for_selector('#editor-section:not([hidden])');page.locator('[data-editor-object="'+m['objectId']+'"]').click();field=page.locator('[data-editor-prop="text"]');field.fill('Unser Test');assert page.locator('#customer-view').is_hidden();assert page.locator('#preview-link').is_hidden();page.click('#save-product');page.wait_for_function("document.querySelector('#save-indicator').textContent==='Alle Änderungen gespeichert'");href=page.locator('#customer-view').get_attribute('href');assert 'revision=2' in href and '/konfigurator/form' not in href
                with page.expect_popup() as popup:page.click('#customer-view')
                customer=popup.value;customer.on('pageerror',lambda e:errors.append(str(e)));customer.wait_for_selector('iframe');frame=customer.frames[1];expect(frame.locator('[data-fk-total]')).to_contain_text('€')
                model=customer.evaluate('window.UniversalConfig');assert model['profile']['revision']==m['id']+':2';design=next(d for d in model['profile']['designs'] if d['id']==m['designId']);assert next(o for o in design['objects'] if o['id']==m['objectId'])['text']=='Unser Test';assert frame.locator('[data-fk-total]').is_visible()
                # A newer saved backend revision must not alter the already supplied URL.
                field.fill('Neuer Stand');page.click('#save-product');page.wait_for_function("document.querySelector('#save-indicator').textContent==='Alle Änderungen gespeichert'");assert 'revision=3' in page.locator('#customer-view').get_attribute('href');customer.reload();customer.wait_for_selector('iframe');frame=customer.frames[1];expect(frame.locator('[data-fk-total]')).to_contain_text('€');old=customer.evaluate('window.UniversalConfig');assert old['profile']['revision']==m['id']+':2';assert next(o for d in old['profile']['designs'] if d['id']==m['designId'] for o in d['objects'] if o['id']==m['objectId'])['text']=='Unser Test'
                customer.screenshot(path=str(out/'existing-konfi-desktop.png'),full_page=True)
                for width in [390,768]:
                    customer.set_viewport_size({'width':width,'height':1000});assert customer.evaluate('document.documentElement.scrollWidth<=innerWidth');assert frame.evaluate('document.documentElement.scrollWidth<=innerWidth')
                    if width==390:customer.screenshot(path=str(out/'existing-konfi-mobile.png'),full_page=True)
                assert not errors,errors;report.update(result='PASS',savedRevision=2,laterRevision=3,oldLinkKeepsRevision=True,unsavedPreviewHidden=True,existingIframeEditor=True,viewports=[1440,390,768],javascriptErrors=errors);browser.close()
        except Exception as e:report.update(result='FAIL',error=str(e));raise
        finally:
            report['finishedAt']=datetime.now(timezone.utc).isoformat();(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');server.terminate()
            try:server.wait(timeout=10)
            except subprocess.TimeoutExpired:server.kill();server.wait()
            log.close()
    print(json.dumps(report,indent=2))
if __name__=='__main__':main()
