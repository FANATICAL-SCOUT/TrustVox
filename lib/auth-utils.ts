// Auth utilities for managing session, password history, and user authentication

export interface ClientUser {
  contactName: string
  position: string
  companyName: string
  industry: string
  companySize: string
  website: string
  description: string
  address: string
  city: string
  country: string
  phone: string
  contactEmail: string
  password: string
}

export interface AdminUser {
  name: string
  email: string
  password: string
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

// Get stored client data
export const getStoredClientData = (): ClientUser | null => {
  if (typeof window !== "undefined") {
    const data = localStorage.getItem("currentClient")
    return safeParse<ClientUser | null>(data, null)
  }
  return null
}

// Store client data
export const storeClientData = (data: ClientUser) => {
  localStorage.setItem("currentClient", JSON.stringify(data))
}

// Get stored admin data
export const getStoredAdminData = (): AdminUser | null => {
  if (typeof window !== "undefined") {
    const data = localStorage.getItem("currentAdmin")
    return safeParse<AdminUser | null>(data, null)
  }
  return null
}

// Store admin data
export const storeAdminData = (data: AdminUser) => {
  localStorage.setItem("currentAdmin", JSON.stringify(data))
}

// Set user as logged in (for admin/user)
export const setUserLoggedIn = (type: "admin" | "user", email: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("isLoggedIn", "true")
    localStorage.setItem("userType", type)
    localStorage.setItem("userEmail", email)
  }
}

// Set client as logged in
export const setClientLoggedIn = (data: { email: string; companyName: string; role: string }) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("isLoggedIn", "true")
    localStorage.setItem("userType", "client")
    localStorage.setItem("userEmail", data.email)
    localStorage.setItem("currentClient", JSON.stringify(data))
  }
}

// Clear user session
export const clearUserSession = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("userType")
    localStorage.removeItem("userEmail")
    localStorage.removeItem("currentUser")
    localStorage.removeItem("currentClient")
    localStorage.removeItem("currentAdmin")
  }
}

// Check if user is logged in
export const isUserLoggedIn = (): boolean => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("isLoggedIn") === "true"
  }
  return false
}

// Get logged in user info
export const getLoggedInUserInfo = () => {
  if (typeof window !== "undefined") {
    return {
      isLoggedIn: localStorage.getItem("isLoggedIn") === "true",
      userType: (localStorage.getItem("userType") as "client" | "admin" | "user" | null) || null,
      userEmail: localStorage.getItem("userEmail"),
    }
  }
  return { isLoggedIn: false, userType: null, userEmail: null }
}
