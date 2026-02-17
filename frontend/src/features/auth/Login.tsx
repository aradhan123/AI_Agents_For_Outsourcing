import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const { setToken } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleLogin() {
    setToken("fake-token");
    navigate("/");
  }

  return (
    <div style={{ maxWidth: "400px", margin: "4rem auto", padding: "2rem", backgroundColor: "white", borderRadius: "8px" }}>
      <h1>Login</h1>
      <input placeholder="Email" onChange={e => setEmail(e.target.value)} style={{ display: "block", width: "100%", marginBottom: "1rem", padding: "0.5rem" }} />
      <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} style={{ display: "block", width: "100%", marginBottom: "1rem", padding: "0.5rem" }} />
      <button type="button" onClick={handleLogin} style={{ width: "100%", padding: "0.75rem", backgroundColor: "#2c3e50", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
        Login
      </button>
      <p>Don't have an account? <Link to="/signup">Sign Up</Link></p>
    </div>
  );
}