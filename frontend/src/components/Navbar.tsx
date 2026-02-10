import { Link } from "react-router-dom";
import { 
  FaHome, 
  FaUsers, 
  FaCalendarAlt, 
  FaHandshake, 
  FaCog,
  FaSignOutAlt 
} from "react-icons/fa";

export default function Navbar() {
  return (
    <nav style={styles.nav}>
      <div style={styles.brand}>
        <h2>AI Scheduler</h2>
      </div>
      
      <div style={styles.links}>
        <Link to="/" style={styles.link}>
          <FaHome /> Dashboard
        </Link>
        <Link to="/groups" style={styles.link}>
          <FaUsers /> Groups
        </Link>
        <Link to="/calendar" style={styles.link}>
          <FaCalendarAlt /> Calendar
        </Link>
        <Link to="/meetings" style={styles.link}>
          <FaHandshake /> Meetings
        </Link>
        <Link to="/settings" style={styles.link}>
          <FaCog /> Settings
        </Link>
      </div>

      <div style={styles.userSection}>
        <span style={styles.username}>User Name</span>
        <button style={styles.logoutBtn}>
          <FaSignOutAlt /> Logout
        </button>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: '#2c3e50',
    color: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  brand: {
    marginRight: '2rem',
  },
  links: {
    display: 'flex',
    gap: '1.5rem',
    flex: 1,
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'white',
    textDecoration: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  username: {
    fontSize: '0.9rem',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};