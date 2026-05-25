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
  username: string | null;
  email: string;
  name: string | null;
  avatar: string | null;
  hasPassword: boolean;
  role: "user" | "admin";
  spaceId: number | null;
}

export interface Profile {
  relationshipStartDate: string | null;
  myName: string | null;
  partnerName: string | null;
}

export interface SpaceInfo {
  spaceId: number;
  inviteCode: string;
  relationshipStartDate: string | null;
  myName: string | null;
  partnerName: string | null;
  partner: { id: number; name: string | null; email: string; avatar: string | null } | null;
}

export interface AdminUser {
  id: number;
  username: string | null;
  email: string;
  name: string | null;
  role: "user" | "admin";
  disabled: boolean;
  spaceId: number | null;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  usersWithPassword: number;
  usersWithSpace: number;
  totalEvents: number;
  totalImages: number;
}

export interface SmtpConfig {
  id: number;
  host: string;
  port: number;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
  secure: boolean;
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
  albumId: number | null;
  createdAt: string;
}

export interface GalleryAlbum {
  id: number;
  name: string;
  userId: number;
  createdAt: string;
  _count?: { images: number };
}

// ---- Auth ----

export async function sendCode(email: string) {
  return api.post("/auth/send-code", { email });
}

export async function verifyCode(email: string, code: string) {
  const { data } = await api.post<{ ok: boolean }>("/auth/verify", { email, code });
  return data;
}

export async function register(username: string, password: string, email: string, code: string) {
  const { data } = await api.post<{ token: string; user: User }>(
    "/auth/register",
    { username, password, email, code }
  );
  localStorage.setItem(TOKEN_KEY, data.token);
  return data;
}

export async function login(account: string, password: string) {
  const { data } = await api.post<{ token: string; user: User }>(
    "/auth/login",
    { account, password }
  );
  localStorage.setItem(TOKEN_KEY, data.token);
  return data;
}

export async function getMe() {
  const { data } = await api.get<User>("/auth/me");
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

export async function getGallery(albumId?: number) {
  const params = albumId !== undefined ? { albumId } : {};
  const { data } = await api.get<GalleryImage[]>("/gallery", { params });
  return data;
}

export async function uploadImage(file: File, albumId?: number) {
  const form = new FormData();
  form.append("image", file);
  if (albumId !== undefined) form.append("albumId", String(albumId));
  const { data } = await api.post<GalleryImage>("/gallery", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteImage(id: number) {
  return api.delete(`/gallery/${id}`);
}

export async function moveImageToAlbum(id: number, albumId: number | null) {
  const { data } = await api.put<GalleryImage>(`/gallery/${id}/album`, { albumId });
  return data;
}

export function getImageUrl(filename: string): string {
  return `/gallery/files/${filename}`;
}

// ---- Gallery Albums ----

export async function getAlbums() {
  const { data } = await api.get<GalleryAlbum[]>("/gallery/albums");
  return data;
}

export async function createAlbum(name: string) {
  const { data } = await api.post<GalleryAlbum>("/gallery/albums", { name });
  return data;
}

export async function updateAlbum(id: number, name: string) {
  const { data } = await api.put<GalleryAlbum>(`/gallery/albums/${id}`, { name });
  return data;
}

export async function deleteAlbum(id: number) {
  return api.delete(`/gallery/albums/${id}`);
}

// ---- Space ----

export async function createSpace() {
  const { data } = await api.post<{ spaceId: number; inviteCode: string }>("/space/create");
  return data;
}

export async function joinSpace(inviteCode: string) {
  const { data } = await api.post<{ spaceId: number; partner: SpaceInfo["partner"] }>("/space/join", { inviteCode });
  return data;
}

export async function getSpaceInfo() {
  const { data } = await api.get<SpaceInfo | null>("/space/info");
  return data;
}

export async function leaveSpace() {
  return api.post("/space/leave");
}

// ---- Admin ----

export async function getAdminUsers() {
  const { data } = await api.get<AdminUser[]>("/admin/users");
  return data;
}

export async function updateAdminUser(id: number, updates: { role?: string; disabled?: boolean }) {
  const { data } = await api.patch<AdminUser>(`/admin/users/${id}`, updates);
  return data;
}

export async function getAdminStats() {
  const { data } = await api.get<AdminStats>("/admin/stats");
  return data;
}

// ---- Upload ----

export async function uploadAvatar(file: File) {
  const form = new FormData();
  form.append("avatar", file);
  const { data } = await api.post<{ avatar: string }>("/upload/avatar", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// ---- SMTP Admin ----

export async function getSmtpConfig() {
  const { data } = await api.get<SmtpConfig>("/admin/smtp");
  return data;
}

export async function updateSmtpConfig(config: Partial<SmtpConfig>) {
  const { data } = await api.put<SmtpConfig>("/admin/smtp", config);
  return data;
}

export async function testSmtp(email: string) {
  const { data } = await api.post<{ ok: boolean }>("/admin/smtp/test", { email });
  return data;
}

// ---- Notification ----

export interface NotificationConfig {
  id: number;
  userId: number;
  emailEnabled: boolean;
  barkToken: string;
  barkEnabled: boolean;
  serverChanKey: string;
  serverChanEnabled: boolean;
  webhookUrl: string;
  webhookEnabled: boolean;
  dingTalkUrl: string;
  dingTalkEnabled: boolean;
  weComUrl: string;
  weComEnabled: boolean;
  notifyOnEvent: boolean;
  notifyOnPeriod: boolean;
  notifyOnAnniversary: boolean;
  advanceDays: number;
  notifyTime: string;
}

export interface NotificationLog {
  id: number;
  userId: number;
  type: string;
  refId: string;
  channels: string;
  title: string;
  body: string;
  createdAt: string;
}

export async function getNotificationConfig() {
  const { data } = await api.get<NotificationConfig>("/notification/config");
  return data;
}

export async function updateNotificationConfig(config: Partial<NotificationConfig>) {
  const { data } = await api.put<NotificationConfig>("/notification/config", config);
  return data;
}

export async function triggerNotificationCheck() {
  const { data } = await api.post<{ sent: number }>("/notification/check");
  return data;
}

export async function getNotificationLogs() {
  const { data } = await api.get<NotificationLog[]>("/notification/logs");
  return data;
}

export async function testNotification(channel: string) {
  const { data } = await api.post<{ ok?: boolean; sent?: number; message: string }>("/notification/test", { channel });
  return data;
}
