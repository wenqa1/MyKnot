import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import AuthGuard from "./components/AuthGuard";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastProvider } from "./components/Toast";
import { ThemeProvider } from "./context/ThemeContext";
import { NavProvider } from "./context/NavContext";
import LoadingSpinner from "./components/LoadingSpinner";

const Login = lazy(() => import("./pages/Login"));
const Home = lazy(() => import("./pages/Home"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Schedule = lazy(() => import("./pages/Schedule"));
const Settings = lazy(() => import("./pages/Settings"));
const AppSettings = lazy(() => import("./pages/AppSettings"));
const Admin = lazy(() => import("./pages/Admin"));

function PageLoading() {
  return <div className="py-20"><LoadingSpinner /></div>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <NavProvider>
          <ToastProvider>
        <Routes>
          <Route path="/login" element={
            <Suspense fallback={<PageLoading />}>
              <Login />
            </Suspense>
          } />
          <Route element={<AuthGuard />}>
            <Route path="admin" element={
              <Suspense fallback={<PageLoading />}>
                <Admin />
              </Suspense>
            } />
            <Route element={<Layout />}>
              <Route index element={
                <Suspense fallback={<PageLoading />}>
                  <Home />
                </Suspense>
              } />
              <Route path="gallery" element={
                <Suspense fallback={<PageLoading />}>
                  <Gallery />
                </Suspense>
              } />
              <Route path="calendar" element={
                <Suspense fallback={<PageLoading />}>
                  <Calendar />
                </Suspense>
              } />
              <Route path="schedule" element={
                <Suspense fallback={<PageLoading />}>
                  <Schedule />
                </Suspense>
              } />
              <Route path="settings" element={
                <Suspense fallback={<PageLoading />}>
                  <Settings />
                </Suspense>
              } />
              <Route path="preferences" element={
                <Suspense fallback={<PageLoading />}>
                  <AppSettings />
                </Suspense>
              } />
            </Route>
          </Route>
        </Routes>
          </ToastProvider>
        </NavProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
