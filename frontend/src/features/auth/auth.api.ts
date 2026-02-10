import { LoginRequest, SignupRequest, AuthResponse } from "./auth.types";

const API_URL = "http://127.0.0.1:8000";

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Login failed");
  }

  return res.json();
}

export async function signup(data: SignupRequest): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Signup failed");
  }

  return res.json();
}