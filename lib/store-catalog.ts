// ─── TrustVox Store Catalog ────────────────────────────────────────────────
// Supabase-backed reward catalog. Costs live in the DB so the server is
// authoritative on price; the browser
// only displays it. The redeem trusted path (redeem_reward) re-reads the cost
// from this table and ignores any client-supplied number.
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";

export type StoreCategory = "vouchers" | "subscriptions" | "merch";

export interface StoreItem {
  id: string;
  title: string;
  description: string;
  cost: number;
  badge: string;
  category: StoreCategory;
}

function mapItem(row: Tables<"store_items">): StoreItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    cost: row.cost,
    badge: row.badge,
    category: row.category,
  };
}

export async function getStoreItems(): Promise<StoreItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("store_items")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapItem);
}
