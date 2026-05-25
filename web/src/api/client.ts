import axios from "axios";

const TOKEN_KEY = "knot_token";

export const api = axios.create({
  baseURL: "/api",
  timeout: 15000,
});

// Attach token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-redirect on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// ---- Types ----

export interface User {
  id: number;
  email: string;
  name: string | null;
  avatar: string | null;
  hasPassword: boolean;
}

export interface Profile {
  relationshipStartDate: string | null;
  myName: string | null;
  partnerName: string | null;
}

export interface CalendarEvent {
  id: number;
  userId: number;
  name: string;
  date: string;
  calendarType: "solar" | "lunar";
  lunarMonth: number | null;
  lunarDay: number | null;
  lunarIsLeapMonth: boolean;
  time: string | null;
  startTime: string | null;
  endTime: string | null;
  recurrence: "none" | "yearly";
  icon: string;
  description: string;
  color: string;
  tag: string;
  sortOrder: number;
}

export interface ScheduleData {
  days: string[];
  times: string[];
  items: ScheduleItem[];
}

export interface ScheduleItem {
  id: number;
  userId: number;
  dayIndex: number;
  timeIndex: number;
  subject: string;
  person: "her" | "him" | "both";
  duration: number;
}

export type ScheduleItemInput = Omit<ScheduleItem, "id" | "userId">;

export interface PeriodData {
  config: PeriodConfig;
  records: PeriodRecord[];
  prediction: PeriodPrediction | null;
}

export interface PeriodConfig {
  cycleDays: number;
  periodDays: number;
}

export interface PeriodRecord {
  id: number;
  userId: number;
  startDate: string;
  endDate: string | null;
  note: string | null;
  symptoms: string;
  createdAt: string;
}

export interface PeriodPrediction {
  nextStartDate: string;
  daysUntilNext: number;
  ovulationDate: string | null;
  ovulationWindowStart: string | null;
  ovulationWindowEnd: string | null;
  currentPhase: string | null;
  currentPhaseLabel: string | null;
  currentPhaseTip: string | null;
  dayInCycle: number;
}

export interface GalleryImage {
  id: number;
  userId: number;
  filename: string;
  originalName: string;
  mimeType: string;
  width: number;
  height: number;
  size: number;
  createdAt: string;
}

// ---- Auth ----

export async function sendCode(email: string) {
  return api.post("/auth/send-code", { email });
}

export async function verifyCode(email: string, code: string) {
  const { data } = await api.post<{ token: string; user: User }>(
    "/auth/verify",
    { email, code }
  );
  localStorage.setItem(TOKEN_KEY, data.token);
  return data;
}

export async function getMe() {
  const { data } = await api.get<User>("/auth/me");
  return data;
}

export async function loginWithPassword(email: string, password: string) {
  const { data } = await api.post<{ token: string; user: User }>(
    "/auth/login",
    { email, password }
  );
  localStorage.setItem(TOKEN_KEY, data.token);
  return data;
}

export async function setPassword(password: string) {
  return api.put("/auth/set-password", { password });
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ---- Profile ----

export async function getProfile() {
  const { data } = await api.get<Profile>("/profile");
  return data;
}

export async function saveProfile(profile: Profile) {
  const { data } = await api.put<Profile>("/profile", profile);
  return data;
}

// ---- Events ----

export async function getEvents() {
  const { data } = await api.get<CalendarEvent[]>("/events");
  return data;
}

export async function createEvent(event: Partial<CalendarEvent>) {
  const { data } = await api.post<CalendarEvent>("/events", event);
  return data;
}

export async function updateEvent(id: number, event: Partial<CalendarEvent>) {
  const { data } = await api.put<CalendarEvent>(`/events/${id}`, event);
  return data;
}

export async function deleteEvent(id: number) {
  return api.delete(`/events/${id}`);
}

// ---- Schedule ----

export async function getSchedule() {
  const { data } = await api.get<ScheduleData>("/schedule");
  return data;
}

export async function saveSchedule(schedule: {
  days: string[];
  times: string[];
  items: ScheduleItemInput[];
}) {
  const { data } = await api.put<ScheduleData>("/schedule", schedule);
  return data;
}

// ---- Period ----

export async function getPeriod() {
  const { data } = await api.get<PeriodData>("/period");
  return data;
}

export async function savePeriodConfig(config: PeriodConfig) {
  const { data } = await api.put<PeriodConfig>("/period/config", config);
  return data;
}

export async function createPeriodRecord(record: {
  startDate: string;
  endDate?: string;
  note?: string;
  symptoms?: string[];
}) {
  const { data } = await api.post<PeriodRecord>("/period/records", record);
  return data;
}

export async function updatePeriodRecord(
  id: number,
  record: Partial<PeriodRecord>
) {
  const { data } = await api.put<PeriodRecord>(`/period/records/${id}`, record);
  return data;
}

export async function deletePeriodRecord(id: number) {
  return api.delete(`/period/records/${id}`);
}

// ---- Gallery ----

export async function getGallery() {
  const { data } = await api.get<GalleryImage[]>("/gallery");
  return data;
}

export async function uploadImage(file: File) {
  const form = new FormData();
  form.append("image", file);
  const { data } = await api.post<GalleryImage>("/gallery", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteImage(id: number) {
  return api.delete(`/gallery/${id}`);
}

export function getImageUrl(filename: string): string {
  return `/gallery/files/${filename}`;
}
