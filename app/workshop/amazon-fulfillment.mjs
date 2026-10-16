// Pure preparation only: no credentials, transport, label purchase or order write.
// Input order follows Orders API v2026-01-01; confirmation follows ordersV0.
const fail = (code = 'amazon_fulfillment') => {
  throw Object.assign(new Error('Versanddaten unvollständig oder widersprüchlich.'), { status: 422, code });
};
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, max = 120) => typeof value === 'string' && value.length > 0 && value.length <= max && value === value.trim() && !/[\u0000-\u001f\u007f]/u.test(value);
const quantity = value => Number.isSafeInteger(value) && value >= 0 && value <= 100000;
const timestamp = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) fail('amazon_fulfillment_time');
  const n = Date.parse(value);
  if (!Number.isFinite(n) || new Date(n).toISOString().slice(0, 19) !== value.slice(0, 19)) fail('amazon_fulfillment_time');
  return n;
};
const optionalTime = value => value == null ? null : timestamp(value);

function orderView(order) {
  if (!object(order) || !/^\d{3}-\d{7}-\d{7}$/.test(order.orderId ?? '') ||
      typeof order.orderId !== 'string' || !/^[A-Z0-9]{5,20}$/.test(order.salesChannel?.marketplaceId ?? '') ||
      !object(order.fulfillment) || !Array.isArray(order.orderItems) || !order.orderItems.length || order.orderItems.length > 1000) fail();
  const seen = new Set();
  const items = order.orderItems.map(item => {
    if (!object(item) || !text(item.orderItemId) || seen.has(item.orderItemId) || !quantity(item.quantityOrdered) || !item.quantityOrdered) fail();
    seen.add(item.orderItemId);
    const fulfilled = item.fulfillment?.quantityFulfilled, unfulfilled = item.fulfillment?.quantityUnfulfilled;
    if ((fulfilled != null && !quantity(fulfilled)) || (unfulfilled != null && !quantity(unfulfilled))) fail();
    if (fulfilled > item.quantityOrdered || unfulfilled > item.quantityOrdered ||
        (fulfilled != null && unfulfilled != null && fulfilled + unfulfilled !== item.quantityOrdered)) fail();
    const remaining = unfulfilled ?? (fulfilled == null ? null : item.quantityOrdered - fulfilled);
    return { orderItemId: item.orderItemId, quantityOrdered: item.quantityOrdered, remainingQuantity: remaining,
      cancellationPresent: Boolean(item.cancellation?.cancellationRequest || item.cancellation?.cancellationExecution) };
  });
  return { orderId: order.orderId, marketplaceId: order.salesChannel.marketplaceId,
    status: order.fulfillment.fulfillmentStatus, fulfilledBy: order.fulfillment.fulfilledBy, items };
}

function selectedItems(view, selected) {
  if (selected == null) return view.items.filter(i => i.remainingQuantity !== 0).map(i => ({ orderItemId: i.orderItemId, quantity: i.remainingQuantity }));
  if (!Array.isArray(selected) || !selected.length || selected.length > view.items.length) fail();
  const seen = new Set();
  return selected.map(item => {
    if (!object(item) || !text(item.orderItemId) || seen.has(item.orderItemId) || !quantity(item.quantity) || !item.quantity) fail();
    seen.add(item.orderItemId);
    const source = view.items.find(i => i.orderItemId === item.orderItemId);
    if (!source || (source.remainingQuantity !== null && item.quantity > source.remainingQuantity)) fail('amazon_fulfillment_quantity');
    return { orderItemId: item.orderItemId, quantity: item.quantity };
  });
}

/** No recipient/custom fields are copied. Shipping readiness does not authorize purchase. */
export function prepareAmazonShipment({ order, items, parcel, now } = {}) {
  const current = timestamp(now), view = orderView(order), selected = selectedItems(view, items);
  const blockers = [];
  if (view.fulfilledBy !== 'MERCHANT') blockers.push('merchant_fulfillment_required');
  if (!['UNSHIPPED', 'PARTIALLY_SHIPPED'].includes(view.status)) blockers.push('order_not_shippable');
  if (!selected.length) blockers.push('no_remaining_items');
  if (selected.some(i => view.items.find(s => s.orderItemId === i.orderItemId).remainingQuantity === null)) blockers.push('remaining_quantity_unknown');
  if (selected.some(i => view.items.find(s => s.orderItemId === i.orderItemId).cancellationPresent)) blockers.push('cancellation_requires_review');
  let packageData = null;
  if (parcel == null) blockers.push('parcel_missing');
  else {
    if (!object(parcel) || !Number.isSafeInteger(parcel.weightGrams) || parcel.weightGrams < 1 || parcel.weightGrams > 1000000 ||
        !Array.isArray(parcel.dimensionsMm) || parcel.dimensionsMm.length !== 3 ||
        parcel.dimensionsMm.some(n => !Number.isSafeInteger(n) || n < 1 || n > 10000)) fail('amazon_fulfillment_parcel');
    packageData = { weightGrams: parcel.weightGrams, dimensionsMm: [...parcel.dimensionsMm] };
  }
  const shipBy = optionalTime(order.fulfillment.shipByWindow?.latestDateTime);
  const deliverBy = optionalTime(order.fulfillment.deliverByWindow?.latestDateTime);
  const delivered = view.status === 'SHIPPED' && Array.isArray(order.packages) && order.packages.length > 0 &&
    order.packages.every(p => p?.packageStatus?.status === 'DELIVERED');
  return {
    schema: 'gravuru-amazon-shipment-draft/v1', mode: 'draft', networkEnabled: false, canPurchaseLabel: false,
    orderId: view.orderId, marketplaceId: view.marketplaceId, items: selected, parcel: packageData,
    readyForPreparation: blockers.length === 0, blockers,
    shippingDeadlineStatus: view.status === 'SHIPPED' ? 'shipped' : shipBy === null ? 'unknown' : current > shipBy ? 'overdue' : 'within_window',
    deliveryDeadlineStatus: delivered ? 'delivered' : deliverBy === null ? 'unknown' : current > deliverBy ? 'past_due_unconfirmed' : 'within_window',
    shipByAt: shipBy === null ? null : new Date(shipBy).toISOString(),
    deliverByAt: deliverBy === null ? null : new Date(deliverBy).toISOString(),
  };
}

/** Builds a reviewable request, never sends it. Caller must independently authorize any future transport. */
export function buildAmazonConfirmShipmentRequest({ order, shipment, now } = {}) {
  const current = timestamp(now), view = orderView(order);
  if (!object(shipment) || !Array.isArray(shipment.orderItems) || shipment.handedToCarrier !== true || view.fulfilledBy !== 'MERCHANT' ||
      !['UNSHIPPED', 'PARTIALLY_SHIPPED'].includes(view.status)) fail('amazon_confirmation_not_ready');
  const selected = selectedItems(view, shipment.orderItems);
  if (!selected.length || selected.some(i => !quantity(i.quantity) || !i.quantity ||
      view.items.find(s => s.orderItemId === i.orderItemId).remainingQuantity === null ||
      view.items.find(s => s.orderItemId === i.orderItemId).cancellationPresent)) fail('amazon_confirmation_not_ready');
  if (typeof shipment.packageReferenceId !== 'string' || !/^[1-9]\d{0,19}$/.test(shipment.packageReferenceId) ||
      !text(shipment.carrierCode, 50) || !text(shipment.trackingNumber, 100) ||
      (shipment.carrierCode === 'Other' && !text(shipment.carrierName))) fail();
  if (timestamp(shipment.shipDate) > current) fail('amazon_confirmation_future');
  // Existing package IDs are not reused for an accidental second confirmation.
  if (Array.isArray(order.packages) && order.packages.some(p => p?.packageReferenceId === shipment.packageReferenceId)) fail('amazon_confirmation_duplicate');
  const packageDetail = { packageReferenceId: shipment.packageReferenceId, carrierCode: shipment.carrierCode,
    trackingNumber: shipment.trackingNumber, shipDate: shipment.shipDate, orderItems: selected };
  for (const key of ['carrierName', 'shippingMethod', 'shipFromSupplySourceId']) {
    if (shipment[key] != null) { if (!text(shipment[key])) fail(); packageDetail[key] = shipment[key]; }
  }
  return { mode: 'draft', operation: 'confirmShipment', networkEnabled: false, requiresExplicitApproval: true,
    method: 'POST', path: `/orders/v0/orders/${view.orderId}/shipmentConfirmation`,
    body: { marketplaceId: view.marketplaceId, packageDetail } };
}
