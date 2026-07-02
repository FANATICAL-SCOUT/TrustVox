export type CompanyStatus = "active" | "inactive";

export interface ApprovedCompany {
  id: string;
  name: string;
  category: string;
  status: CompanyStatus;
  dateAdded: string;
  baselineActiveCampaigns: number;
  baselineTotalCampaigns: number;
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
  lastActiveAt: string;
}

const COMPANIES_KEY = "trustvox_approved_companies";
const USERS_KEY = "trustvox_managed_users";
const COMPANIES_UPDATED_EVENT = "trustvox:companies-updated";
const USERS_UPDATED_EVENT = "trustvox:users-updated";

const COMPANY_DATA: Array<{ category: string; names: string[] }> = [
  { category: "Software", names: ["Microsoft", "Google", "Apple", "Adobe", "Salesforce", "Oracle", "SAP", "IBM", "Atlassian", "Zoom"] },
  { category: "Service", names: ["Accenture", "Deloitte", "Tata Consultancy Services (TCS)", "Infosys", "Wipro", "Capgemini", "Cognizant", "HCL Technologies", "PwC", "EY"] },
  { category: "Mobile App", names: ["Meta", "Snap Inc.", "ByteDance", "Spotify", "Uber", "Airbnb", "Netflix", "Amazon", "LinkedIn", "Discord"] },
  { category: "Hardware", names: ["Intel", "AMD", "NVIDIA", "Samsung", "Sony", "HP", "Dell", "Lenovo", "Asus", "Cisco"] },
  { category: "E-Commerce", names: ["Amazon", "eBay", "Alibaba", "Flipkart", "Shopify", "Walmart", "Etsy", "Rakuten", "Target", "Best Buy"] },
  { category: "Food & Beverage", names: ["Nestlé", "Coca-Cola", "PepsiCo", "Starbucks", "McDonald's", "Unilever", "Danone", "Mondelez", "Kraft Heinz", "Red Bull"] },
  { category: "Healthcare", names: ["Pfizer", "Johnson & Johnson", "Roche", "Novartis", "Merck", "Abbott", "GSK", "Bayer", "Moderna", "Sanofi"] },
  { category: "Education", names: ["Coursera", "Udemy", "BYJU’S", "Khan Academy", "edX", "Duolingo", "Skillshare", "Chegg", "Unacademy", "FutureLearn"] },
  { category: "Finance", names: ["JPMorgan Chase", "Goldman Sachs", "Morgan Stanley", "HSBC", "Citi", "Bank of America", "PayPal", "Visa", "Mastercard", "American Express"] },
];

const SEED_COMPANIES: ApprovedCompany[] = COMPANY_DATA.flatMap((group, groupIndex) =>
  group.names.map((name, index) => ({
    id: `co-${group.category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index + 1}`,
    name,
    category: group.category,
    status: "active",
    dateAdded: new Date(Date.UTC(2025, Math.min(groupIndex, 11), Math.max(1, index + 1))).toISOString(),
    baselineActiveCampaigns: (index + groupIndex) % 4,
    baselineTotalCampaigns: 8 + index + groupIndex,
  }))
);

const SEED_USERS: ManagedUser[] = [
  { id: "u-1", name: "Aarav Sharma", email: "aarav@trustvox.com", role: "Admin", status: "Active", feedbackSubmittedCount: 0, lastActiveAt: new Date().toISOString() },
  { id: "u-2", name: "Priya Nair", email: "priya.nair@msft.com", role: "Client", status: "Active", feedbackSubmittedCount: 14, lastActiveAt: new Date().toISOString() },
  { id: "u-3", name: "Daniel Chen", email: "dchen@gmail.com", role: "User", status: "Active", feedbackSubmittedCount: 27, lastActiveAt: new Date().toISOString() },
  { id: "u-4", name: "Sophia Williams", email: "sophia@adobe.com", role: "Client", status: "Blocked", feedbackSubmittedCount: 6, lastActiveAt: new Date().toISOString() },
  { id: "u-5", name: "Miguel Ortiz", email: "miguel.ortiz@yahoo.com", role: "User", status: "Active", feedbackSubmittedCount: 41, lastActiveAt: new Date().toISOString() },
];

function logStore(step: string, payload?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (payload) console.debug(`[TrustVoxAdmin] ${step}`, payload);
  else console.debug(`[TrustVoxAdmin] ${step}`);
}

function readCompanies(): ApprovedCompany[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COMPANIES_KEY);
    if (!raw) {
      localStorage.setItem(COMPANIES_KEY, JSON.stringify(SEED_COMPANIES));
      return SEED_COMPANIES;
    }
    return JSON.parse(raw) as ApprovedCompany[];
  } catch {
    return SEED_COMPANIES;
  }
}

function writeCompanies(companies: ApprovedCompany[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(COMPANIES_KEY, JSON.stringify(companies));
  window.dispatchEvent(new CustomEvent(COMPANIES_UPDATED_EVENT));
  logStore("companies-updated", { count: companies.length });
}

function readUsers(): ManagedUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
      return SEED_USERS;
    }
    return JSON.parse(raw) as ManagedUser[];
  } catch {
    return SEED_USERS;
  }
}

function writeUsers(users: ManagedUser[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  window.dispatchEvent(new CustomEvent(USERS_UPDATED_EVENT));
  logStore("users-updated", { count: users.length });
}

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

export function getApprovedCompanies(): ApprovedCompany[] {
  return readCompanies();
}

export function getActiveApprovedCompanies(): ApprovedCompany[] {
  return readCompanies().filter((company) => company.status === "active");
}

export function getApprovedCompanyById(id: string): ApprovedCompany | undefined {
  return readCompanies().find((company) => company.id === id);
}

export function addApprovedCompany(input: Omit<ApprovedCompany, "id" | "dateAdded" | "baselineActiveCampaigns" | "baselineTotalCampaigns">) {
  const companies = readCompanies();
  const newCompany: ApprovedCompany = {
    id: `co-custom-${Date.now()}`,
    name: input.name,
    category: input.category,
    status: input.status,
    dateAdded: new Date().toISOString(),
    baselineActiveCampaigns: 0,
    baselineTotalCampaigns: 0,
  };
  writeCompanies([...companies, newCompany]);
  return newCompany;
}

export function updateApprovedCompany(id: string, updates: Partial<ApprovedCompany>) {
  const companies = readCompanies();
  const index = companies.findIndex((company) => company.id === id);
  if (index === -1) return null;
  companies[index] = { ...companies[index], ...updates };
  writeCompanies(companies);
  return companies[index];
}

export function toggleApprovedCompanyStatus(id: string) {
  const company = getApprovedCompanyById(id);
  if (!company) return null;
  return updateApprovedCompany(id, { status: company.status === "active" ? "inactive" : "active" });
}

export function getManagedUsers(): ManagedUser[] {
  return readUsers();
}

export function updateManagedUserStatus(id: string, status: UserStatus) {
  const users = readUsers();
  const index = users.findIndex((user) => user.id === id);
  if (index === -1) return null;
  users[index] = { ...users[index], status, lastActiveAt: new Date().toISOString() };
  writeUsers(users);
  return users[index];
}

export function upsertManagedUserFromRegistration(input: {
  name: string;
  email: string;
  role: Exclude<UserRole, "Admin">;
}) {
  const normalizedEmail = normalizeValue(input.email);
  if (!normalizedEmail) return null;

  const users = readUsers();
  const existingIndex = users.findIndex((user) => normalizeValue(user.email) === normalizedEmail);

  if (existingIndex >= 0) {
    const existing = users[existingIndex];
    const updated: ManagedUser = {
      ...existing,
      name: input.name.trim() || existing.name,
      role: input.role,
      lastActiveAt: new Date().toISOString(),
    };
    users[existingIndex] = updated;
    writeUsers(users);
    return updated;
  }

  const created: ManagedUser = {
    id: `u-reg-${Date.now()}`,
    name: input.name.trim() || "New User",
    email: normalizedEmail,
    role: input.role,
    status: "Active",
    feedbackSubmittedCount: 0,
    lastActiveAt: new Date().toISOString(),
  };

  writeUsers([created, ...users]);
  return created;
}

export function upsertApprovedCompanyFromRegistration(input: {
  companyName: string;
  category?: string;
}) {
  const normalizedName = normalizeValue(input.companyName);
  if (!normalizedName) return null;

  const companies = readCompanies();
  const existing = companies.find((company) => normalizeValue(company.name) === normalizedName);
  if (existing) {
    return existing;
  }

  const created: ApprovedCompany = {
    id: `co-reg-${Date.now()}`,
    name: input.companyName.trim(),
    category: input.category?.trim() || "Service",
    status: "active",
    dateAdded: new Date().toISOString(),
    baselineActiveCampaigns: 0,
    baselineTotalCampaigns: 0,
  };

  writeCompanies([created, ...companies]);
  return created;
}

export function subscribeToApprovedCompanies(onUpdate: () => void) {
  if (typeof window === "undefined") return () => {};
  const handle = () => onUpdate();
  const handleStorage = (event: StorageEvent) => {
    if (event.key === COMPANIES_KEY) onUpdate();
  };
  window.addEventListener(COMPANIES_UPDATED_EVENT, handle);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(COMPANIES_UPDATED_EVENT, handle);
    window.removeEventListener("storage", handleStorage);
  };
}

export function subscribeToManagedUsers(onUpdate: () => void) {
  if (typeof window === "undefined") return () => {};
  const handle = () => onUpdate();
  const handleStorage = (event: StorageEvent) => {
    if (event.key === USERS_KEY) onUpdate();
  };
  window.addEventListener(USERS_UPDATED_EVENT, handle);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(USERS_UPDATED_EVENT, handle);
    window.removeEventListener("storage", handleStorage);
  };
}
