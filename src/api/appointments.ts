import { api } from './client';

export interface Appointment {
  id: number;
  titulo: string;
  descricao: string | null;
  data_evento: string;
  hora_evento: string | null;
  localizacao: string | null;
}

// null = limpar o campo na edição (a API aceita null nesses campos).
export interface AppointmentPayload {
  titulo: string;
  descricao?: string | null;
  data_evento: string;
  hora_evento?: string | null;
  localizacao?: string | null;
}

export function listAppointments(start: string, end: string) {
  return api.get<Appointment[]>(`/appointments?start=${start}&end=${end}`);
}

export function createAppointment(payload: AppointmentPayload) {
  return api.post<Appointment>('/appointments', payload);
}

export function updateAppointment(id: number, payload: Partial<AppointmentPayload>) {
  return api.patch<Appointment>(`/appointments/${id}`, payload);
}

export function deleteAppointment(id: number) {
  return api.delete<void>(`/appointments/${id}`);
}
