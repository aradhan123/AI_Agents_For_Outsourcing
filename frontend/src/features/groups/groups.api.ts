const API_URL = "http://127.0.0.1:8000";

function getToken() {
  return localStorage.getItem("access_token") || "";
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

async function parseError(response: Response, fallback: string) {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") return data.detail;
  } catch {
    // Fall back to a generic message when backend doesn't return JSON.
  }
  return fallback;
}

export interface CreateGroupPayload {
  name: string;
  description?: string;
}

export interface JoinGroupPayload {
  inviteCode?: string;
  groupId?: number;
}

export interface GroupMember {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface GroupDetail {
  id: number;
  name: string;
  description: string | null;
  role: string;
  memberCount: number;
  members: GroupMember[];
}

export interface GroupAvailabilitySlot {
  memberId: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface GroupAvailability {
  groupId: number;
  groupName: string;
  slots: GroupAvailabilitySlot[];
}

export interface TransferOwnershipPayload {
  newOwnerId: number;
}

export async function getGroups() {
  const res = await fetch(`${API_URL}/groups/`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to fetch groups"));
  }

  return res.json();
}

export async function getGroup(groupId: number) {
  const res = await fetch(`${API_URL}/groups/${groupId}`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to fetch group details"));
  }

  return res.json() as Promise<GroupDetail>;
}

export async function getGroupAvailability(groupId: number) {
  const res = await fetch(`${API_URL}/groups/${groupId}/availability`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to fetch group availability"));
  }

  return res.json() as Promise<GroupAvailability>;
}

export async function createGroup(payload: CreateGroupPayload) {
  const res = await fetch(`${API_URL}/groups/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to create group"));
  }

  return res.json();
}

export async function joinGroup(payload: JoinGroupPayload) {
  const res = await fetch(`${API_URL}/groups/join`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to join group"));
  }

  return res.json();
}

export async function transferGroupOwnership(groupId: number, payload: TransferOwnershipPayload) {
  const res = await fetch(`${API_URL}/groups/${groupId}/transfer-ownership`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, 'Failed to transfer ownership'));
  }

  return res.json() as Promise<{ detail: string }>;
}

export async function removeGroupMember(groupId: number, memberId: number) {
  const res = await fetch(`${API_URL}/groups/${groupId}/members/${memberId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, 'Failed to remove member'));
  }

  return res.json() as Promise<{ detail: string }>;
}
