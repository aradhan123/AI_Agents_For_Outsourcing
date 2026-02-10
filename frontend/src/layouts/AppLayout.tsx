import { Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <div className="app-layout">
      <nav style={{ padding: "1rem", background: "#333", color: "white" }}>
        <h2>AI Agents Dashboard</h2>
      </nav>
      <main style={{ padding: "2rem" }}>
        <Outlet />
      </main>
    </div>
  );
}