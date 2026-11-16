// Built-in thumbnails use the original PNG bytes and content-addressed URLs.
export const OPTION_STANDARD_IMAGES=Object.freeze({
  'OHNE':'/_runtime/images/option-ohne.cf7765a9fd743fbe.png',
  'B02':'/_runtime/images/option-b02.1a8f639bc4f34feb.png',
  'B04':'/_runtime/images/option-b04.62e3872108e21bca.png',
  'AH2-silver':'/_runtime/images/option-ah2-silver.620d6e945d4437b8.png',
  'AH2-black':'/_runtime/images/option-ah2-black.fa55c817f00dcaf8.png',
  'AH2-rose-gold':'/_runtime/images/option-ah2-rose-gold.fe7a2f4d8f14dceb.png',
  'AH2-bronze':'/_runtime/images/option-ah2-bronze.acefa70ae34a668a.png',
  'AH2-white':'/_runtime/images/option-ah2-white.0dfc5c9d9ad16db7.png',
  'AH4-silver':'/_runtime/images/option-ah4-silver.b33fd6917df2e3d8.png',
  'AH4-black':'/_runtime/images/option-ah4-black.288f75393e8e0210.png',
  'AH4-rose-gold':'/_runtime/images/option-ah4-rose-gold.2cb59faa9df9d82f.png',
  'AH4-bronze':'/_runtime/images/option-ah4-bronze.f93110eb56838c7e.png',
  'AH4-white':'/_runtime/images/option-ah4-white.150d4df2263efc57.png',
  'STKLAR':'/_runtime/images/option-stklar.8755b5e7816066ba.png',
  'STSCHWARZ':'/_runtime/images/option-stschwarz.74a098b424648431.png',
  'SILIKON':'/_runtime/images/option-silikon.66d7910b48aa28a3.png'
});
const optionImages=new Set(Object.values(OPTION_STANDARD_IMAGES));
export const isStandardOptionImage=url=>optionImages.has(url);
