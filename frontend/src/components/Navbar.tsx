import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { setToken } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    setToken(null);
    navigate("/login");
  }

  return (
    <nav style={styles.nav}>
      <div style={styles.brand}>
        <h2>AI Scheduler</h2>
      </div>
      <div style={styles.links}>
        <Link to="/" style={styles.link}>Dashboard</Link>
        <Link to="/groups" style={styles.link}>Groups</Link>
        <Link to="/calendar" style={styles.link}>Calendar</Link>
        <Link to="/meetings" style={styles.link}>Meetings</Link>
        <Link to="/settings" style={styles.link}>Settings</Link>
      </div>
      <button type="button" style={styles.logoutBtn} onClick={handleLogout}>
        Logout
      </button>
    </nav>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  nav: {
    display: "flex",
    alignItems: "center",
    padding: "1rem 2rem",
    backgroundColor: "#2c3e50",
    color: "white",
  },
  brand: { marginRight: "2rem" },
  links: { display: "flex", gap: "1.5rem", flex: 1 },
  link: { color: "white", textDecoration: "none", padding: "0.5rem 1rem" },
  logoutBtn: {
    padding: "0.5rem 1rem",
    backgroundColor: "#e74c3c",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
};