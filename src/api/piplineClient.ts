export interface SnapshotSchema {
  outofbound: boolean;
  cycle: number;
  pc: string;
  pipeline: Record<string, any>;
  registers: Record<string, { name: string; value: string }>;
  memory: Record<string, string>;
  events: any;
}

const API_BASE = 'http://localhost:8000';

function getSessionId() {
  let sessionId = sessionStorage.getItem('pipline_session_id');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('pipline_session_id', sessionId);
  }
  return sessionId;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers = new Headers(options.headers);
  headers.set('X-Session-ID', getSessionId());
  
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }
  return response.json();
}

export const piplineClient = {
  async load_program(asm_source: string, initial_memory?: Record<string, string>, initial_registers?: Record<string, string>) {
    return request<{ success: boolean; message: string }>('/load_program', {
      method: 'POST',
      body: JSON.stringify({ asm_source, initial_memory, initial_registers })
    });
  },

  async step_cycle() {
    return request<SnapshotSchema>('/step_cycle', { method: 'POST' });
  },

  async reset() {
    return request<{ success: boolean; message: string }>('/reset', { method: 'POST' });
  }
};
