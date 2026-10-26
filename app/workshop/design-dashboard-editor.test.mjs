import test from 'node:test';
import assert from 'node:assert/strict';
import {installDashboardEditor,installCatalogueEditorBridge,catalogueOverlayIdentity,catalogueEditorMessage} from './ui/design-dashboard-editor.mjs';
import {createMerchantRequest} from './ui/merchant-request.mjs';
import {createShopifyAdminHost} from './shopify-admin-host.mjs';

const channel='12345678-abcd-4321-abcd-123456789012';
const origin='https://merchant.example.test';
const identity={channel,reihe:'edelstahl-oval',id:'TO-D8'};
const href=origin+'/werkstatt/designs/bearbeiten/?'+new URLSearchParams({katalogOverlay:channel,katalogReihe:identity.reihe,katalogDesign:identity.id});
function events(target={}){
 const listeners=new Map();
 return Object.assign(target,{addEventListener(type,fn){const list=listeners.get(type)||[];list.push(fn);listeners.set(type,list);},emit(type,event={}){for(const fn of listeners.get(type)||[])fn(event);}});
}
function fixture(){
 class Node{
  constructor(tag){events(this);this.tag=tag;this.children=[];this.style={};this.attributes={};this.open=false;if(tag==='iframe')this.contentWindow={messages:[],postMessage(data,targetOrigin){this.messages.push({data,targetOrigin});}};}
  append(...nodes){this.children.push(...nodes);for(const node of nodes)node.parent=this;}
  remove(){this.parent.children=this.parent.children.filter(node=>node!==this);}
  setAttribute(key,value){this.attributes[key]=value;}
  showModal(){this.open=true;}
  close(){this.open=false;}
 }
 const body=new Node('body');body.style.overflow='auto';
 const document={body,createElement:tag=>new Node(tag)};
 const window=events({location:{origin,href:origin+'/werkstatt/designs/?linie=steel&host=public&shop=fixture.myshopify.com&embedded=1&id_token=secret'},crypto:{randomUUID:()=>channel},scrollX:12,scrollY:740,scrolls:[],scrollTo(x,y){this.scrolls.push([x,y]);}});
 const history={state:{catalogPage:2},stack:[],backs:0,pushState(state,title,url){this.stack.push(this.state);this.state=state;this.url=url;},back(){this.backs++;this.state=this.stack.pop()??null;window.emit('popstate',{state:this.state});}};
 window.history=history;
 return {window,document,history,get dialog(){return body.children[0];},get frame(){return body.children[0]?.children.find(x=>x.tag==='iframe');}};
}
test('overlay identity requires the exact editor route, a channel and both catalogue identifiers',()=>{
 assert.deepEqual(catalogueOverlayIdentity(href),identity);
 assert.equal(catalogueOverlayIdentity(href.replace('/bearbeiten/','/')),null);
 assert.equal(catalogueOverlayIdentity(href.replace(channel,'fake')),null);
 assert.equal(catalogueOverlayIdentity(href.replace('katalogDesign','missing')),null);
});
test('messages require the exact origin, frame, channel, series and design',()=>{
 const peer={},good={origin,source:peer,data:{...identity,type:'saved'}};
 assert.equal(catalogueEditorMessage(good,peer,identity,origin),true);
 for(const bad of [{...good,origin:'https://evil.test'},{...good,source:{}},...['channel','reihe','id'].map(key=>({...good,data:{...good.data,[key]:'wrong'}}))]){
  assert.equal(catalogueEditorMessage(bad,peer,identity,origin),false);
 }
});
test('overlay keeps the dashboard, relays fresh session tokens and restores scroll and focus only after approved close',async()=>{
 const h=fixture(),saved=[],closed=[],requests=[],focused=[];let token='first';
 const request=createMerchantRequest({required:()=>true,bridge:()=>({idToken:async()=>token}),fetchImpl:async(path,options)=>{requests.push({path,token:options.headers.get('Authorization')});return {ok:true,status:200};}});
 const prior=()=>{},trigger={focus:options=>focused.push(options)};h.window.GravuruMerchantRequest=prior;
 const ui=installDashboardEditor({request,onSaved:value=>saved.push(value),onClosed:value=>closed.push(value),windowImpl:h.window,documentImpl:h.document});
 assert.equal(ui.open({reihe:identity.reihe,id:identity.id,linie:'steel',trigger}),true);
 const frame=h.frame,peer=frame.contentWindow,url=new URL(frame.src);
 assert.equal(url.searchParams.get('host'),'public');assert.equal(url.searchParams.get('embedded'),'1');assert.equal(url.searchParams.has('id_token'),false);
 assert.equal(h.history.state.catalogPage,2);assert.equal(h.history.state.gravuruKatalogOverlay,channel);assert.equal(h.document.body.style.overflow,'hidden');
 await h.window.GravuruMerchantRequest('/api/workshop/session');token='second';await h.window.GravuruMerchantRequest('/api/workshop/designs');
 assert.deepEqual(requests.map(x=>x.token),['Bearer first','Bearer second']);
 const message=(type,extra={})=>h.window.emit('message',{origin,source:peer,data:{...identity,type,...extra}});
 message('gravuru-katalog-editor-ready');ui.requestClose();assert.equal(ui.isOpen,true);
 assert.equal(peer.messages.at(-1).data.type,'gravuru-katalog-editor-request-close');
 h.window.emit('message',{origin,source:{},data:{...identity,type:'gravuru-katalog-editor-closed'}});assert.equal(ui.isOpen,true);
 message('gravuru-katalog-editor-saved',{changed:false,checksum:'same'});assert.equal(saved.length,0);
 message('gravuru-katalog-editor-saved',{changed:true,checksum:'updated'});assert.deepEqual(saved,[{reihe:identity.reihe,id:identity.id,checksum:'updated'}]);
 message('gravuru-katalog-editor-closed');assert.equal(ui.isOpen,false);assert.equal(h.dialog.open,false);assert.equal(h.history.backs,1);assert.equal(closed.length,1);
 assert.equal(h.window.GravuruMerchantRequest,prior);assert.equal(h.document.body.style.overflow,'auto');assert.deepEqual(h.window.scrolls,[[12,740]]);assert.deepEqual(focused,[{preventScroll:true}]);
 assert.equal(requests.length,2,'closing never reloads dashboard data');
});
test('browser Back asks the editor before closing and cancelled discard restores the overlay history',()=>{
 const h=fixture(),ui=installDashboardEditor({request:()=>{},windowImpl:h.window,documentImpl:h.document});ui.open(identity);
 const peer=h.frame.contentWindow,message=(type,extra={})=>h.window.emit('message',{origin,source:peer,data:{...identity,type,...extra}});
 message('gravuru-katalog-editor-ready');message('gravuru-katalog-editor-state',{dirty:true,busy:false});
 let prevented=false;h.window.emit('beforeunload',{preventDefault(){prevented=true;}});assert.equal(prevented,true);
 h.history.back();assert.equal(ui.isOpen,true);assert.equal(peer.messages.at(-1).data.type,'gravuru-katalog-editor-request-close');
 message('gravuru-katalog-editor-close-cancelled');assert.equal(ui.isOpen,true);assert.equal(h.history.state.gravuruKatalogOverlay,channel);
 h.history.back();message('gravuru-katalog-editor-closed');assert.equal(ui.isOpen,false);assert.equal(h.history.backs,2,'accepted browser Back does not traverse again');
});
test('an editor that has not started can close without losing draft data and Escape uses the handshake',()=>{
 const h=fixture(),ui=installDashboardEditor({request:()=>{},windowImpl:h.window,documentImpl:h.document});ui.open(identity);
 let prevented=false;h.dialog.emit('cancel',{preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(ui.isOpen,false);
 ui.open(identity);const peer=h.frame.contentWindow;
 h.window.emit('message',{origin,source:peer,data:{...identity,type:'gravuru-katalog-editor-ready'}});
 h.dialog.emit('cancel',{preventDefault(){}});assert.equal(ui.isOpen,true);assert.equal(peer.messages.at(-1).data.type,'gravuru-katalog-editor-request-close');
});
test('editor bridge validates parent messages, reports only state changes and leaves discard decisions to the editor',()=>{
 const messages=[],parent={location:{origin},postMessage(data,targetOrigin){messages.push({data,targetOrigin});}};
 let leaves=0,openDialog=false;
 const window=events({parent,location:{origin,href},document:{querySelector:()=>openDialog?{}:null}});
 const state={katalogEditor:{id:identity.id,reihe:identity.reihe},dirty:false,busy:false};
 const bridge=installCatalogueEditorBridge({state,leave:()=>{leaves++;},windowImpl:window});
 assert.equal(messages[0].data.type,'gravuru-katalog-editor-ready');bridge.sync();bridge.sync();assert.equal(messages.length,2);
 state.dirty=true;bridge.sync();assert.equal(messages.at(-1).data.dirty,true);
 window.emit('message',{origin:'https://evil.test',source:parent,data:{...identity,type:'gravuru-katalog-editor-request-close'}});assert.equal(leaves,0);
 window.emit('message',{origin,source:parent,data:{...identity,type:'gravuru-katalog-editor-request-close'}});assert.equal(leaves,1);
 window.emit('keydown',{key:'Escape',preventDefault(){}});assert.equal(leaves,2);
 openDialog=true;window.emit('keydown',{key:'Escape',preventDefault(){throw Error('existing dialog owns Escape');}});assert.equal(leaves,2);
 bridge.saved({changed:true,checksum:'new'});assert.equal(messages.at(-1).data.checksum,'new');
 bridge.cancel();assert.equal(messages.at(-1).data.type,'gravuru-katalog-editor-close-cancelled');
 bridge.close();assert.equal(messages.at(-1).data.type,'gravuru-katalog-editor-closed');
 assert.ok(messages.every(x=>x.targetOrigin===origin));
});
test('direct, mismatched and cross-origin editor windows never install an overlay bridge',()=>{
 const state={katalogEditor:identity};
 const direct={location:{origin,href}};direct.parent=direct;
 assert.equal(installCatalogueEditorBridge({state,windowImpl:direct}),null);
 assert.equal(installCatalogueEditorBridge({state,windowImpl:{location:{origin,href},parent:{location:{origin:'https://evil.test'}}}}),null);
 assert.equal(installCatalogueEditorBridge({state:{katalogEditor:{id:'other',reihe:identity.reihe}},windowImpl:{location:{origin,href},parent:{location:{origin}}}}),null);
});
test('only the catalogue editor permits the extra same-origin frame and overlay mode never bootstraps App Bridge twice',()=>{
 const shopDomain='fixture.myshopify.com',clientId='public-key';
 const host=createShopifyAdminHost({origin,shopDomain,clientId,mode:'embedded-test'},{mode:'test-only',shopDomain,clientId});
 const page=Buffer.from('<html><head></head><body></body></html>'),path='/werkstatt/designs/bearbeiten/',search='?katalogOverlay='+channel;
 assert.match(host.cspFor(path),/frame-ancestors 'self' https:\/\/fixture\.myshopify\.com https:\/\/admin\.shopify\.com/);
 assert.doesNotMatch(host.cspFor('/werkstatt/designs/'),/frame-ancestors 'self'/);
 assert.doesNotMatch(host.cspFor(path),/unsafe-eval/);
 const overlay=host.html(page,path,search).toString();assert.match(overlay,/gravuru-merchant-auth/);assert.doesNotMatch(overlay,/app-bridge\.js/);
 assert.match(host.html(page,path).toString(),/app-bridge\.js/);
 assert.match(host.html(page,path,'?katalogOverlay=bad').toString(),/app-bridge\.js/);
 assert.match(host.html(page,'/werkstatt/',search).toString(),/app-bridge\.js/);
 assert.equal(host.authorize({method:'GET',headers:{host:'merchant.example.test',origin:'https://evil.test'}},'/api/workshop/designs'),false);
});

test('parent return stays usable after the frame navigates away from its editor channel',()=>{
 const h=fixture(),ui=installDashboardEditor({request:()=>{},windowImpl:h.window,documentImpl:h.document});ui.open(identity);
 const frame=h.frame,peer=frame.contentWindow,message=(type,extra={})=>h.window.emit('message',{origin,source:peer,data:{...identity,type,...extra}});
 peer.location={href};
 message('gravuru-katalog-editor-ready');message('gravuru-katalog-editor-state',{dirty:true,busy:true});frame.emit('load');
 ui.requestClose();assert.equal(ui.isOpen,true,'the matching editor keeps its discard handshake');
 assert.equal(peer.messages.at(-1).data.type,'gravuru-katalog-editor-request-close');
 peer.location={href:origin+'/werkstatt/'};frame.emit('load');
 let warned=false;h.window.emit('beforeunload',{preventDefault(){warned=true;}});assert.equal(warned,false,'a departed editor has no remaining draft');
 assert.equal(h.dialog.children[0].children[0].disabled,false);
 ui.requestClose();assert.equal(ui.isOpen,false);assert.equal(h.history.backs,1);
 ui.open(identity);const inaccessible=h.frame;
 h.window.emit('message',{origin,source:inaccessible.contentWindow,data:{...identity,type:'gravuru-katalog-editor-ready'}});
 ui.requestClose();assert.equal(ui.isOpen,true);
 Object.defineProperty(inaccessible.contentWindow,'location',{get(){throw Error('cross origin');}});inaccessible.emit('load');
 ui.requestClose();assert.equal(ui.isOpen,false,'parent return also works when frame location cannot be read');
});
