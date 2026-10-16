// Deterministic synthetic data. Never customer data or proof of a live import.
export const AMAZON_TEST_MARKETPLACE='A1PA6795UKMFR9';
export function amazonTestOrders({cancelled=false}={}) {
  return [{orderId:'TEST-GRAVURU-AMAZON-001',createdTime:'2026-10-15T10:00:00Z',lastUpdatedTime:cancelled?'2026-10-16T11:00:00Z':'2026-10-16T10:00:00Z',
    salesChannel:{marketplaceId:AMAZON_TEST_MARKETPLACE,channelName:'AMAZON'},
    fulfillment:{fulfillmentStatus:cancelled?'CANCELLED':'UNSHIPPED',fulfilledBy:'MERCHANT',shipByWindow:{latestDateTime:'2026-10-17T16:00:00Z'}},
    orderItems:[{orderItemId:'TEST-LINE-001',quantityOrdered:2,product:{sellerSku:'TEST-GRAVURU-SCHIEFER',asin:'B000000001',price:{unitPrice:{amount:'24.90',currencyCode:'EUR'}}},fulfillment:{quantityFulfilled:0,quantityUnfulfilled:2}},
      {orderItemId:'TEST-LINE-002',quantityOrdered:1,product:{sellerSku:'TEST-GRAVURU-EDELSTAHL',asin:'B000000002',price:{unitPrice:{amount:'39.90',currencyCode:'EUR'}}},fulfillment:{quantityFulfilled:0,quantityUnfulfilled:1}}]}];
}
