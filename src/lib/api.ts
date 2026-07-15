const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080"

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

function formatErrorMessage(msg: string): string {
  if (!msg) return "An unexpected error occurred."
  
  // Specific friendly overrides for awkward backend messages
  const overrides: Record<string, string> = {
    "invalid request body": "Please check your form inputs and try again.",
    "This account is registered as a student": "This account belongs to a student. The web portal is for lecturers only.",
    "you cannot remove yourself from the course...": "You cannot remove yourself from a course you own."
  }

  if (overrides[msg]) {
    return overrides[msg]
  }

  // Generic formatting: capitalize first letter and add a period
  let formatted = msg.trim()
  formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1)
  if (!formatted.endsWith('.')) {
    formatted += '.'
  }
  
  return formatted
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem("geotas_token")
  
  const headers = new Headers(options.headers)
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }
  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let message = "An error occurred"
    try {
      const text = await response.text()
      if (text) {
        message = text.trim()
      }
    } catch {
      // Ignore errors reading the text
    }
    throw new ApiError(response.status, formatErrorMessage(message))
  }

  if (response.status === 204) {
    return {} as T
  }

  return response.json()
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body: unknown) => 
    request<T>(endpoint, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body?: unknown) => 
    request<T>(endpoint, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(endpoint: string) => 
    request<T>(endpoint, { method: "DELETE" }),
}
