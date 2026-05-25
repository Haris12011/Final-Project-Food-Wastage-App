import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function AdminRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("admin_users")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();

    if (error) {
      console.error("Admin check failed:", error.message);
      setIsAdmin(false);
    } else {
      setIsAdmin(!!data);
    }

    setLoading(false);
  }

  if (loading) {
    return <p className="message">Checking admin access...</p>;
  }

  if (!isAdmin) {
    return <Navigate to="/home" replace />;
  }

  return children;
}

export default AdminRoute;