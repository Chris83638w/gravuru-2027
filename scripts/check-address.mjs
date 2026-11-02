import assert from 'node:assert/strict';
import {readCustomerAddresses} from '../src/lib/customer-address.ts';
const f=new FormData();for(const [k,v] of Object.entries({customerLine1:'Testweg 12',customerCity:'Bielefeld',customerCountry:'Deutschland',customerPostalCode:'33609'}))f.set(k,v);
assert.equal(readCustomerAddresses(f,'Test Kunde','Firma').deliveryAddress.city,'Bielefeld');f.set('differentDelivery','on');assert.throws(()=>readCustomerAddresses(f,'Test Kunde','Firma'));for(const [k,v] of Object.entries({deliveryRecipient:'Other Recipient',deliveryCompany:'Example Ltd',deliveryLine1:'12 Example Road',deliveryCity:'Dublin',deliveryCountry:'Irland',deliveryRegion:'Dublin'}))f.set(k,v);
const a=readCustomerAddresses(f,'Test Kunde','Firma');assert.equal(a.deliveryAddress.country,'Irland');assert.equal(a.customerAddress.country,'Deutschland');assert.equal(a.deliveryAddress.company,'Example Ltd');f.set('customerPostalCode','');assert.throws(()=>readCustomerAddresses(f,'Test Kunde','Firma'));
console.log('PASS: Required address, separate overseas recipient/company, international address without postal code, German postcode validation.');
