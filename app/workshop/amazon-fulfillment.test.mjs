import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareAmazonShipment, buildAmazonConfirmShipmentRequest } from './amazon-fulfillment.mjs';
const now = '2026-10-16T12:00:00.000Z';
const order = () => ({ orderId: '123-1234567-1234567', salesChannel: { marketplaceId: 'A1PA6795UKMFR9' },
  fulfillment: { fulfillmentStatus: 'PARTIALLY_SHIPPED', fulfilledBy: 'MERCHANT',
    shipByWindow: { latestDateTime: '2026-10-16T11:00:00Z' }, deliverByWindow: { latestDateTime: '2026-10-18T20:00:00Z' } },
  orderItems: [{ orderItemId: 'item-1', quantityOrdered: 3, fulfillment: { quantityFulfilled: 1, quantityUnfulfilled: 2 } },
    { orderItemId: 'item-2', quantityOrdered: 1, fulfillment: { quantityFulfilled: 0, quantityUnfulfilled: 1 } }] });
const parcel = { weightGrams: 400, dimensionsMm: [240, 150, 50] };
const shipment = () => ({ packageReferenceId: '2', carrierCode: 'DHL', shippingMethod: 'Paket',
  trackingNumber: 'SYNTHETIC-TRACKING', shipDate: '2026-10-16T11:30:00Z', handedToCarrier: true,
  orderItems: [{ orderItemId: 'item-1', quantity: 2 }] });

test('preparation retains remaining allocations and accurate deadlines without PII or purchases', () => {
  const source = order(); source.recipient = { deliveryAddress: { name: 'PRIVATE' } };
  source.orderItems[0].product = { customization: { customizedUrl: 'https://example.invalid/PRIVATE' } };
  const before = JSON.stringify(source);
  const result = prepareAmazonShipment({ order: source, parcel, now });
  assert.equal(result.readyForPreparation, true); assert.equal(result.shippingDeadlineStatus, 'overdue');
  assert.equal(result.deliveryDeadlineStatus, 'within_window'); assert.equal(result.canPurchaseLabel, false);
  assert.deepEqual(result.items, [{ orderItemId: 'item-1', quantity: 2 }, { orderItemId: 'item-2', quantity: 1 }]);
  assert.equal(JSON.stringify(source), before); assert.equal(JSON.stringify(result).includes('PRIVATE'), false);
});

test('unknown remaining quantities, cancellation, and missing parcel are explicit blockers', () => {
  const source = order(); delete source.orderItems[0].fulfillment;
  source.orderItems[1].cancellation = { cancellationRequest: { reason: 'buyer request' } };
  const result = prepareAmazonShipment({ order: source, now });
  assert.equal(result.readyForPreparation, false);
  assert.deepEqual(result.blockers, ['remaining_quantity_unknown', 'cancellation_requires_review', 'parcel_missing']);
  assert.equal(result.items[0].quantity, null);
});

test('selected partial items cannot exceed remaining quantity or repeat an item', () => {
  const opts = { order: order(), parcel, now };
  assert.equal(prepareAmazonShipment({ ...opts, items: [{ orderItemId: 'item-1', quantity: 1 }] }).items[0].quantity, 1);
  for (const items of [[{ orderItemId: 'item-1', quantity: 3 }], [{ orderItemId: 'unknown', quantity: 1 }],
    [{ orderItemId: 'item-1', quantity: 1 }, { orderItemId: 'item-1', quantity: 1 }]]) assert.throws(() => prepareAmazonShipment({ ...opts, items }));
  const source = order(); source.orderItems[0].fulfillment.quantityUnfulfilled = 3;
  assert.throws(() => prepareAmazonShipment({ ...opts, order: source }));
});

test('nonmerchant and cancelled orders cannot become ready; delivery is not guessed', () => {
  const source = order(); source.fulfillment.fulfilledBy = 'AMAZON'; source.fulfillment.fulfillmentStatus = 'CANCELLED';
  assert.equal(prepareAmazonShipment({ order: source, parcel, now }).readyForPreparation, false);
  source.fulfillment.fulfillmentStatus = 'SHIPPED';
  source.fulfillment.deliverByWindow.latestDateTime = '2026-10-15T12:00:00Z';
  assert.equal(prepareAmazonShipment({ order: source, parcel, now }).deliveryDeadlineStatus, 'past_due_unconfirmed');
  source.packages = [{ packageStatus: { status: 'DELIVERED' } }];
  assert.equal(prepareAmazonShipment({ order: source, parcel, now }).deliveryDeadlineStatus, 'delivered');
});

test('shipment confirmation is only a body/path draft; no carrier/address/custom field spill', () => {
  const s = shipment(); s.recipient = { name: 'PRIVATE' }; s.secret = 'PRIVATE';
  const result = buildAmazonConfirmShipmentRequest({ order: order(), shipment: s, now });
  assert.equal(result.networkEnabled, false); assert.equal(result.requiresExplicitApproval, true);
  assert.equal(result.path, '/orders/v0/orders/123-1234567-1234567/shipmentConfirmation');
  assert.deepEqual(result.body.packageDetail.orderItems, s.orderItems);
  assert.equal(result.body.packageDetail.packageReferenceId, '2');
  assert.equal(JSON.stringify(result).includes('PRIVATE'), false);
  assert.equal(Object.hasOwn(result, 'headers'), false);
});

test('confirmation requires explicit package allocations, real handover and past ship time', () => {
  const opts = { order: order(), now };
  for (const patch of [{ handedToCarrier: false }, { packageReferenceId: 'PKG-1' }, { packageReferenceId: '0' },
    { trackingNumber: '' }, { carrierCode: 'Other' }, { shipDate: '2026-10-17T10:00:00Z' },
    { shipDate: '2026-02-30T10:00:00Z' }, { orderItems: undefined },
    { orderItems: [{ orderItemId: 'item-1', quantity: 3 }] }]) {
    assert.throws(() => buildAmazonConfirmShipmentRequest({ ...opts, shipment: { ...shipment(), ...patch } }));
  }
  const source = order(); source.packages = [{ packageReferenceId: '2' }];
  assert.throws(() => buildAmazonConfirmShipmentRequest({ order: source, shipment: shipment(), now }), { code: 'amazon_confirmation_duplicate' });
});

test('unknown state, malformed dates, invalid dimensions and duplicate source lines fail safely', () => {
  const source = order(); source.fulfillment.fulfillmentStatus = 'FUTURE_STATUS';
  assert.equal(prepareAmazonShipment({ order: source, parcel, now }).readyForPreparation, false);
  assert.throws(() => prepareAmazonShipment({ order: order(), parcel: { ...parcel, weightGrams: 0 }, now }));
  assert.throws(() => prepareAmazonShipment({ order: order(), parcel, now: 'today' }));
  source.orderItems.push(source.orderItems[0]);
  assert.throws(() => prepareAmazonShipment({ order: source, parcel, now }));
});
