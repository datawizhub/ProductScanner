export function binLabel(storeId: string, locationId: string) {
  return 'warehouse-bin:' + storeId + ':' + locationId;
}
export function resolveBin<T extends { id: string; code: string }>(value: string, storeId: string, locations: T[]): T {
  const prefix = 'warehouse-bin:' + storeId + ':';
  const match = value.startsWith(prefix)
    ? locations.find(location => location.id === value.slice(prefix.length))
    : locations.find(location => location.code === value.trim());
  if (!match) throw new Error('This is not a bin in your store. Scan its bin QR label or select a location.');
  return match;
}
export function stockQuantity(text: string, allowZero = false): number {
  if (!/^\d+$/.test(text.trim())) throw new Error('Enter a whole-number quantity.');
  const number = Number(text);
  if (!Number.isSafeInteger(number) || number < (allowZero ? 0 : 1)) {
    throw new Error(allowZero ? 'Enter a count of 0 or more.' : 'Enter a quantity greater than 0.');
  }
  return number;
}
export function validBarcode(text: string): string {
  const value = text.trim();
  if (!value || value.length > 500 || value.startsWith('warehouse-bin:')) {
    throw new Error('Enter a product barcode, not a bin label.');
  }
  return value;
}
// A message alone cannot establish whether the server committed a stock movement.
// Only known SQL/auth rejection codes in a 4xx response prove it was rejected.
export function definitiveStockRejection(status: number, code: string): boolean {
  return status >= 400 && status < 500 && /^(22|23|28|42|P0|PGRST)[A-Z0-9]*$/i.test(code);
}
export function mayDiscardReceipt(wasPending: boolean, attempted: boolean, definitive: boolean): boolean {
  // A later rejected attempt cannot tell us whether an earlier attempt committed.
  return !wasPending && (!attempted || definitive);
}
