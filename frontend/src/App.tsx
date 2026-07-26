import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import TraceViewer from "./pages/TraceViewer";
import ExecutionTimeline from "./pages/ExecutionTimeline";
import GraphViewer from "./pages/GraphViewer";
import Metrics from "./pages/Metrics";
import Logs from "./pages/Logs";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/traces" element={<TraceViewer />} />
        <Route path="/traces/:traceId/timeline" element={<ExecutionTimeline />} />
        <Route path="/traces/:traceId/graph" element={<GraphViewer />} />
        <Route path="/metrics" element={<Metrics />} />
        <Route path="/logs" element={<Logs />} />
      </Route>
    </Routes>
  );
}
