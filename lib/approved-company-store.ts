// ─── TrustVox Approved-Company & Managed-User Store ────────────────────────
// Supabase-backed store for the admin company directory + user management
// (migrated in Phase 8.5 — see docs/backend/ARCHITECTURE.md §4, §6, §8).
// Companies map to the `companies` table; managed users are the `profiles`
// table read through the admin lens. All functions are async and run through
// the RLS-gated browser client.
import { createClient, nextChannelId } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { logStore } from "@/lib/debug-log";

export type CompanyStatus = "active" | "inactive";

export interface ApprovedCompany {
  id: string;
  name: string;
  category: string;
  status: CompanyStatus;
  dateAdded: string;
}

export type UserRole = "User" | "Client" | "Admin";
export type UserStatus = "Active" | "Blocked";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  feedbackSubmittedCount: number;
  joinedAt: string;
}

type CompanyRow = Tables<"companies">;
type ProfileRow = Tables<"profiles">;

const ROLE_LABEL: Record<ProfileRow["role"], UserRole> = {
  user: "User",
  client: "Client",
  admin: "Admin",
};

const STATUS_LABEL: Record<ProfileRow["status"], UserStatus> = {
  active: "Active",
  blocked: "Blocked",
};

function mapCompanyRow(row: CompanyRow): ApprovedCompany {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    status: row.status,
    dateAdded: row.date_added,
  };
}

// ── Companies (← ApprovedCompany) ───────────────────────────────────────────
export async function getApprovedCompanies(): Promise<ApprovedCompany[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("companies").select("*").order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapCompanyRow);
}

export async function getActiveApprovedCompanies(): Promise<ApprovedCompany[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("status", "active")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapCompanyRow);
}

export async function getApprovedCompanyById(id: string): Promise<ApprovedCompany | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapCompanyRow(data) : undefined;
}

export async function addApprovedCompany(input: Omit<ApprovedCompany, "id" | "dateAdded">): Promise<ApprovedCompany> {
  const supabase = createClient();
  const insertRow: TablesInsert<"companies"> = {
    name: input.name,
    category: input.category,
    status: input.status,
  };
  const { data, error } = await supabase.from("companies").insert(insertRow).select("*").single();
  if (error) throw error;
  const mapped = mapCompanyRow(data);
  logStore("company-added", { id: mapped.id, name: mapped.name });
  return mapped;
}

export async function updateApprovedCompany(id: string, updates: Partial<ApprovedCompany>): Promise<ApprovedCompany | null> {
  const supabase = createClient();
  const patch: TablesUpdate<"companies"> = {};
  if ("name" in updates) patch.name = updates.name;
  if ("category" in updates) patch.category = updates.category;
  if ("status" in updates) patch.status = updates.status;

  const { data, error } = await supabase.from("companies").update(patch).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const mapped = mapCompanyRow(data);
  logStore("company-updated", { id: mapped.id });
  return mapped;
}

export async function toggleApprovedCompanyStatus(id: string): Promise<ApprovedCompany | null> {
  const company = await getApprovedCompanyById(id);
  if (!company) return null;
  return updateApprovedCompany(id, { status: company.status === "active" ? "inactive" : "active" });
}

// ── Managed users (← ManagedUser, admin view over profiles) ────────────────
export async function getManagedUsers(): Promise<ManagedUser[]> {
  const supabase = createClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = profiles ?? [];

  // feedbackSubmittedCount is a real derived count (no fabricated demo numbers):
  // 0 for client/admin rows, and 0 for users until they actually submit.
  const { data: responseRows, error: responseError } = await supabase.from("responses").select("user_id");
  if (responseError) throw responseError;
  const countByUser = new Map<string, number>();
  for (const row of responseRows ?? []) {
    countByUser.set(row.user_id, (countByUser.get(row.user_id) ?? 0) + 1);
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.display_name || row.email || "Unknown",
    email: row.email ?? "",
    role: ROLE_LABEL[row.role],
    status: STATUS_LABEL[row.status],
    feedbackSubmittedCount: countByUser.get(row.id) ?? 0,
    joinedAt: row.created_at,
  }));
}

export async function updateManagedUserStatus(id: string, status: UserStatus): Promise<ManagedUser | null> {
  const supabase = createClient();
  const dbStatus: ProfileRow["status"] = status === "Active" ? "active" : "blocked";
  const { data, error } = await supabase
    .from("profiles")
    .update({ status: dbStatus })
    .eq("id", id)
    .select("id, email, display_name, role, status, created_at")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  logStore("user-status-updated", { id, status });
  return {
    id: data.id,
    name: data.display_name || data.email || "Unknown",
    email: data.email ?? "",
    role: ROLE_LABEL[data.role],
    status: STATUS_LABEL[data.status],
    feedbackSubmittedCount: 0,
    joinedAt: data.created_at,
  };
}

// Realtime replaces the old same-tab CustomEvent bus (Phase 8.7): any
// insert/update/delete on `companies` notifies every subscriber, across
// tabs and users. RLS already scopes reads (active-only for non-admins).
export function subscribeToApprovedCompanies(onUpdate: () => void) {
  if (typeof window === "undefined") return () => {};

  const supabase = createClient();
  const channel: RealtimeChannel = supabase
    // Unique per subscription (see nextChannelId) — never reuse a channel name.
    .channel(`approved-companies-updates-${nextChannelId()}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "companies" }, () => onUpdate())
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

// Admin-only surface: consumers of this subscription (admin dashboard, user
// management) already sit behind the admin role gate, so an unfiltered
// `profiles` subscription is fine — RLS still only lets an admin session
// actually receive rows (self-or-admin read policy, §6).
export function subscribeToManagedUsers(onUpdate: () => void) {
  if (typeof window === "undefined") return () => {};

  const supabase = createClient();
  const channel: RealtimeChannel = supabase
    // Unique per subscription (see nextChannelId) — never reuse a channel name.
    .channel(`managed-users-updates-${nextChannelId()}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => onUpdate())
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
