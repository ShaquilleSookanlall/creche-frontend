const BASE = import.meta.env.VITE_API_BASE_URL ?? ''; // e.g. http://localhost:8086

async function request<T = any>(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    ...init,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export type ParentSummary = {
  id: number; firstName: string; lastName: string; email: string; cellNumber?: string;
};

export type ChildRegistrationRequest = {
  firstName: string; lastName: string; dateOfBirth?: string;
  gender?: string; classGroup?: string; allergies?: string; medicalNotes?: string;
};

export type ParentRegistrationRequest = {
  firstName: string; lastName: string; idNumber?: string;
  cellNumber?: string; email: string; address?: string;
  children: ChildRegistrationRequest[];
};

export const listParents  = () => request<ParentSummary[]>('/api/parents');
export const registerParent = (payload: ParentRegistrationRequest) =>
  request('/api/registration/parent', { method: 'POST', body: JSON.stringify(payload) });

export const addChild = (parentId: number, payload: ChildRegistrationRequest) =>
  request(`/api/parents/${parentId}/children`, { method: 'POST', body: JSON.stringify(payload) });
