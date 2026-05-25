import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useEffect, useState } from "react";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isAdmin, setIsAdmin] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    initializeNavbar();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      initializeNavbar();
    });

    const notificationChannel = supabase
      .channel("navbar-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(notificationChannel);
    };
  }, [location.pathname]);

  async function initializeNavbar() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setEmail("");
      setUserId(null);
      setIsAdmin(false);
      setNotificationCount(0);
      return;
    }

    setEmail(user.email || "");
    setUserId(user.id);

    await checkAdmin(user);
    await loadNotifications(user);
  }

  async function checkAdmin(user) {
    const { data, error } = await supabase
      .from("admin_users")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();

    if (error) {
      console.error("Admin check failed:", error.message);
      setIsAdmin(false);
      return;
    }

    setIsAdmin(!!data);
  }

  async function loadNotifications(existingUser) {
    const user =
      existingUser ||
      (
        await supabase.auth.getUser()
      ).data.user;

    if (!user) {
      setNotificationCount(0);
      return;
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", user.id)
      .eq("read", false);

    if (error) {
      console.error("Notification load failed:", error.message);
      setNotificationCount(0);
      return;
    }

    setNotificationCount(data?.length || 0);
  }

  async function logout() {
    await supabase.auth.signOut();

    setEmail("");
    setUserId(null);
    setIsAdmin(false);
    setNotificationCount(0);

    navigate("/login");
  }

  function isActive(path) {
    return location.pathname === path;
  }

  function hideNavbar() {
    return (
      location.pathname === "/login" ||
      location.pathname === "/register"
    );
  }

  if (hideNavbar()) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="logo">
        <span>🥗</span>

        <div>
          <h2>Food Waste Reducer</h2>

          {email && (
            <small
              style={{
                color: "#d1fae5",
                fontSize: "12px",
              }}
            >
              Welcome, {email}
            </small>
          )}
        </div>
      </div>

      <div className="nav-links">
        <Link
          to="/home"
          className={isActive("/home") ? "active-link" : ""}
        >
          Home
        </Link>

        <Link
          to="/create"
          className={isActive("/create") ? "active-link" : ""}
        >
          Create
        </Link>

        <Link
          to="/profile"
          className={isActive("/profile") ? "active-link" : ""}
        >
          Profile
        </Link>

        <Link
          to="/history"
          className={isActive("/history") ? "active-link" : ""}
        >
          Reserved List
        </Link>

        <Link
          to="/map"
          className={isActive("/map") ? "active-link" : ""}
        >
          Food Map
        </Link>

        <Link
          to="/notifications"
          className={isActive("/notifications") ? "active-link" : ""}
        >
          Notifications

          {notificationCount > 0 && (
            <span
              style={{
                marginLeft: "6px",
                background: "red",
                color: "white",
                borderRadius: "50%",
                padding: "2px 7px",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              {notificationCount}
            </span>
          )}
        </Link>

        {isAdmin && (
          <>
            <Link
              to="/admin"
              className={isActive("/admin") ? "active-link" : ""}
            >
              Admin
            </Link>

            <Link
              to="/analytics"
              className={isActive("/analytics") ? "active-link" : ""}
            >
              Analytics
            </Link>

            <Link
              to="/performance"
              className={isActive("/performance") ? "active-link" : ""}
            >
              Performance
            </Link>
          </>
        )}

        {userId && (
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}

export default Navbar;