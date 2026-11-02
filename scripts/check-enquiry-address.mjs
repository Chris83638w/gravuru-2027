import assert from 'node:assert/strict'
import {readConfigurationAddresses} from '../src/lib/customer-address.ts'
const form=new FormData()
assert.equal(readConfigurationAddresses(form,'anfrage','Testkunde',''),undefined)
assert.throws(()=>readConfigurationAddresses(form,'gestaltung','Testkunde',''),/vollständig/)
form.set('customerLine1','Teststraße 1')
assert.throws(()=>readConfigurationAddresses(form,'anfrage','Testkunde',''),/vollständig/)
form.set('customerCity','Bielefeld');form.set('customerCountry','Deutschland');form.set('customerPostalCode','33609')
for(const purpose of ['anfrage','gestaltung'])assert.equal(readConfigurationAddresses(form,purpose,'Testkunde','Testfirma').customerAddress.postalCode,'33609')
form.set('differentDelivery','on')
assert.throws(()=>readConfigurationAddresses(form,'gestaltung','Testkunde',''),/vollständig/)
form.set('deliveryRecipient','Empfänger');form.set('deliveryLine1','Testweg 2');form.set('deliveryCity','Bielefeld');form.set('deliveryCountry','Deutschland');form.set('deliveryPostalCode','33609')
assert.equal(readConfigurationAddresses(form,'gestaltung','Testkunde','').deliveryAddress.recipient,'Empfänger')
console.log('PASS: Anfrage ohne Adresse, unvollständige Adressen, Bestelladresse und abweichende Lieferung geprüft.')
