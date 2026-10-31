// Chris, issue #48 messages 13/14 (29.10.2026): individual motifs may be
// replaced/deleted independently of movement. Apply only while authoring a NEW
// product/design revision; never when reading frozen customer/order snapshots.
export function applyNewMotifRights(object,rights,design){
 if(object.type!=='motif'||object.role==='guide'||object.technicalLocked)return rights;
 const whole=design?.wholePrintDesign===true;
 object.customerEditable=!whole;
 if(whole)object.locked=true;else delete object.locked;
 return {...rights,...(whole?{content:false,color:false,move:false,scale:false}:{}),replace:!whole,delete:!whole};
}

export function checkWholePrintDesign(design,method){
 if(design.wholePrintDesign!==undefined&&typeof design.wholePrintDesign!=='boolean')throw Error('Ganzes Druck-Design: Kennzeichnung muss true oder false sein.');
 if(design.wholePrintDesign===true&&method!=='print')throw Error('Nur ein ganzes Druck-Design darf als verkaufte Einheit gesperrt werden.');
}
