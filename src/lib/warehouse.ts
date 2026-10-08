import type { Database, Tables } from '@/types/database.types';
import { getSupabase } from './supabase';
import { definitiveStockRejection } from './validation';
export { binLabel, resolveBin, stockQuantity, validBarcode, mayDiscardReceipt } from './validation';

export type StoreAccess = { storeId: string; storeName: string; role: 'staff' | 'manager' };
export type Location = Tables<'locations'>;
export type CatalogItem = Tables<'items'>;
export type Movement = Database['public']['Functions']['item_movement_history']['Returns'][number];
export type StockAction = 'receive' | 'move' | 'adjust' | 'pick';
export class StockRpcError extends Error {
  constructor(message: string, public readonly definitive: boolean) { super(message); this.name = 'StockRpcError'; }
}

export function errorMessage(error: unknown): string {
  const message = error && typeof error === 'object' && 'message' in error
    ? String(error.message) : String(error);
  if (/duplicate key/i.test(message)) return 'That SKU, barcode or location code is already in use.';
  if (/foreign key/i.test(message)) return 'This record is used by stock or movement history and cannot be deleted.';
  if (/Failed to fetch|Network request failed/i.test(message)) return 'Could not connect. Check your connection and retry.';
  return message || 'Something went wrong. Please retry.';
}

export async function getStoreAccess(userId: string): Promise<StoreAccess | null> {
  const client = getSupabase();
  const { data: store, error } = await client.from('stores').select('id,name').eq('code', 'prototype-store').maybeSingle();
  if (error) throw error;
  if (!store) return null;
  const { data: member, error: memberError } = await client.from('store_memberships')
    .select('role').eq('store_id', store.id).eq('user_id', userId).maybeSingle();
  if (memberError) throw memberError;
  if (!member || (member.role !== 'staff' && member.role !== 'manager')) return null;
  return { storeId: store.id, storeName: store.name, role: member.role };
}

export async function listCatalog(storeId: string, search = '', offset = 0): Promise<CatalogItem[]> {
  const { data, error } = await getSupabase().rpc('search_catalog', {
    p_store_id: storeId, p_search: search.trim(), p_offset: offset,
  });
  if (error) throw error;
  return data ?? [];
}

export async function listLocations(storeId: string): Promise<Location[]> {
  const { data, error } = await getSupabase().from('locations').select('*')
    .eq('store_id', storeId).order('code');
  if (error) throw error;
  return data ?? [];
}

export async function saveLocation(storeId: string, fields: Pick<Location, 'code' | 'aisle' | 'rack' | 'bin'>, id?: string) {
  const client = getSupabase();
  const values = { ...fields, updated_at: new Date().toISOString() };
  const query = id ? client.from('locations').update(values).eq('store_id', storeId).eq('id', id)
    : client.from('locations').insert({ ...values, store_id: storeId });
  const { data, error } = await query.select('id').single();
  if (error) throw error;
  return data.id;
}

export async function deleteLocation(storeId: string, id: string) {
  const { data, error } = await getSupabase().from('locations').delete()
    .eq('store_id', storeId).eq('id', id).select('id').single();
  if (error) throw error;
  return data.id;
}

export type CatalogFields = { name: string; sku: string; price: number; unit: string; description: string };
export async function saveCatalogItem(storeId: string, fields: CatalogFields, id?: string, barcode?: string) {
  const { data, error } = await getSupabase().rpc('save_catalog_item', {
    p_store_id: storeId, p_name: fields.name, p_sku: fields.sku,
    p_price: fields.price, p_unit: fields.unit, p_description: fields.description,
    ...(id ? { p_item_id: id } : {}), ...(barcode ? { p_barcode: barcode } : {}),
  });
  if (error) throw error;
  return data;
}

export async function listBarcodes(storeId: string, itemId: string) {
  const { data, error } = await getSupabase().from('item_barcodes').select('barcode')
    .eq('store_id', storeId).eq('item_id', itemId).order('barcode');
  if (error) throw error;
  return (data ?? []).map(row => row.barcode);
}
export async function attachBarcode(storeId: string, itemId: string, barcode: string) {
  const { error } = await getSupabase().from('item_barcodes')
    .insert({ store_id: storeId, item_id: itemId, barcode: barcode.trim() });
  if (error) throw error;
}
export async function removeBarcode(storeId: string, itemId: string, barcode: string) {
  const { error } = await getSupabase().from('item_barcodes').delete()
    .eq('store_id', storeId).eq('item_id', itemId).eq('barcode', barcode);
  if (error) throw error;
}

export async function stockMovement(storeId: string, itemId: string, action: StockAction, quantity: number,
  locationId: string, requestId: string, toLocationId?: string, note?: string) {
  const { error, status } = await getSupabase().rpc('apply_stock_movement', {
    p_store_id: storeId, p_item_id: itemId, p_action: action, p_quantity: quantity,
    p_location_id: locationId, p_request_id: requestId,
    ...(toLocationId ? { p_to_location_id: toLocationId } : {}), p_note: note ?? '',
  });
  if (error) throw new StockRpcError(errorMessage(error), definitiveStockRejection(status, error.code));
}
export async function cancelStockReceipt(storeId: string, itemId: string, action: StockAction, quantity: number,
  locationId: string, requestId: string, toLocationId?: string, note?: string): Promise<'applied' | 'cancelled'> {
  const { data, error } = await getSupabase().rpc('cancel_stock_receipt', {
    p_store_id: storeId, p_item_id: itemId, p_action: action, p_quantity: quantity,
    p_location_id: locationId, p_request_id: requestId,
    ...(toLocationId ? { p_to_location_id: toLocationId } : {}), p_note: note ?? '',
  });
  if (error) throw error;
  if (data !== 'applied' && data !== 'cancelled') throw new Error('Could not confirm this pending action. Retry.');
  return data;
}
export async function movementHistory(storeId: string, itemId: string, offset = 0): Promise<Movement[]> {
  const { data, error } = await getSupabase().rpc('item_movement_history', {
    p_store_id: storeId, p_item_id: itemId, p_offset: offset,
  });
  if (error) throw error;
  return data ?? [];
}
