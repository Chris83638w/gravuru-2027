import test from 'node:test';
import assert from 'node:assert/strict';
import {customerPreviewLink} from './ui/customer-preview-link.mjs';
import {parseDirectLink} from '../configurator/variant-m/design-gallery-model.mjs';

test('saved customer preview opens the selected original instead of the product default',()=>{
 const profile={defaultDesignId:'katalog-D1',designs:[{id:'katalog-D1'},{id:'katalog-GT-S-30x20-D5'}]};
 const preview=customerPreviewLink('cfg_review',7,{designId:'katalog-GT-S-30x20-D5'});
 const url=new URL(preview.href,'https://review.example');
 assert.equal(url.searchParams.get('configuration'),'cfg_review');
 assert.equal(url.searchParams.get('revision'),'7');
 assert.equal(parseDirectLink(url.searchParams,profile).designId,'katalog-GT-S-30x20-D5');
 assert.equal(profile.defaultDesignId,'katalog-D1');
 assert.equal(preview.target,'_blank');
});

test('historical and form links retain their existing routes when no design is selected',()=>{
 assert.deepEqual(customerPreviewLink('cfg_review',2),{href:'/?configuration=cfg_review&revision=2',target:'_blank'});
 assert.equal(customerPreviewLink('cfg_review',2,{formEditor:true,designId:'text & photo'}).href,'/werkstatt/formprodukt/?configuration=cfg_review&revision=2&design=text+%26+photo');
});
