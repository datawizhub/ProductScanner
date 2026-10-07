import type { Tables } from '@/types/database.types';

import { getSupabase } from './supabase';

export type StockAtLocation = {
  quantity: number;
  location: Pick<Tables<'locations'>, 'id' | 'code' | 'aisle' | 'rack' | 'bin'>;
};

export type BarcodeLookup = {
  item: Pick<Tables<'items'>, 'id' | 'sku' | 'name' | 'description' | 'price' | 'unit'>;
  stock: StockAtLocation[];
  totalQuantity: number;
};

export async function getPrototypeStoreId(): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from('stores')
    .select('id')
    .eq('code', 'prototype-store')
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

export async function lookupBarcode(storeId: string, barcode: string): Promise<BarcodeLookup | null> {
  const supabase = getSupabase();
  const { data: match, error: barcodeError } = await supabase
    .from('item_barcodes')
    .select('item_id')
    .eq('store_id', storeId)
    .eq('barcode', barcode)
    .maybeSingle();

  if (barcodeError) throw barcodeError;
  if (!match) return null;

  const [itemResult, stockResult] = await Promise.all([
    supabase
      .from('items')
      .select('id, sku, name, description, price, unit')
      .eq('store_id', storeId)
      .eq('id', match.item_id)
      .single(),
    supabase
      .from('stock')
      .select('location_id, quantity')
      .eq('store_id', storeId)
      .eq('item_id', match.item_id),
  ]);

  if (itemResult.error) throw itemResult.error;
  if (stockResult.error) throw stockResult.error;

  const stockRows = stockResult.data ?? [];
  const locationIds = stockRows.map((row) => row.location_id);
  if (locationIds.length === 0) {
    return { item: itemResult.data, stock: [], totalQuantity: 0 };
  }

  const { data: locations, error: locationsError } = await supabase
    .from('locations')
    .select('id, code, aisle, rack, bin')
    .eq('store_id', storeId)
    .in('id', locationIds);

  if (locationsError) throw locationsError;
  const byId = new Map((locations ?? []).map((location) => [location.id, location]));
  const stock = stockRows.flatMap((row) => {
    const location = byId.get(row.location_id);
    return location ? [{ quantity: row.quantity, location }] : [];
  });
  stock.sort((a, b) => a.location.code.localeCompare(b.location.code));

  return {
    item: itemResult.data,
    stock,
    totalQuantity: stock.reduce((sum, row) => sum + row.quantity, 0),
  };
}
