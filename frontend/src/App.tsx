import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const TraceViewer = lazy(() => import("./pages/TraceViewer"));
const ExecutionTimeline = lazy(() => import("./pages/ExecutionTimeline"));
const GraphViewer = lazy(() => import("./pages/GraphViewer"));
const Metrics = lazy(() => import("./pages/Metrics"));
const Logs = lazy(() => import("./pages/Logs"));
const ProjectOverview = lazy(() => import("./pages/ProjectOverview"));

function PageFallback() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-6 w-40 animate-pulse rounded bg-hairline dark:bg-hairline-dark" />
      <div className="h-32 animate-pulse rounded-lg bg-hairline/60 dark:bg-hairline-dark/60" />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route
          path="/"
          element={
            <Suspense fallback={<PageFallback />}>
              <ProjectOverview />
            </Suspense>
          }
        />
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<PageFallback />}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route
          path="/traces"
          element={
            <Suspense fallback={<PageFallback />}>
              <TraceViewer />
            </Suspense>
          }
        />
        <Route
          path="/traces/:traceId/timeline"
          element={
            <Suspense fallback={<PageFallback />}>
              <ExecutionTimeline />
            </Suspense>
          }
        />
        <Route
          path="/traces/:traceId/graph"
          element={
            <Suspense fallback={<PageFallback />}>
              <GraphViewer />
            </Suspense>
          }
        />
        <Route
          path="/metrics"
          element={
            <Suspense fallback={<PageFallback />}>
              <Metrics />
            </Suspense>
          }
        />
        <Route
          path="/logs"
          element={
            <Suspense fallback={<PageFallback />}>
              <Logs />
            </Suspense>
          }
        />
        <Route path="/overview" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
