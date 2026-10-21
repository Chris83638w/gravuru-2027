// Preserve old acrylic snapshots. New non-acrylic native products use their own
// schema; form-product snapshots keep their separate geometry/content contract.
export const NATIVE_REVIEW='gravuru-native-review/v1';
export const NATIVE_REVIEW_SCHEMAS=['gravuru-acrylic-review/v1',NATIVE_REVIEW];
export const isNativeReviewSchema=schema=>NATIVE_REVIEW_SCHEMAS.includes(schema);
