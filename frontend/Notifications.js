import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();

    const channel = supabase
      .channel("notifications-realtime")
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
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadNotifications() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert("Failed to load notifications.");
      setNotifications([]);
    } else {
      setNotifications(data || []);
    }

    setLoading(false);
  }

  async function markRead(id) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);

    if (!error) {
      loadNotifications();
    }
  }

  async function markAllRead() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id);

    loadNotifications();
  }

  async function deleteNotification(id) {
    const confirmDelete = window.confirm("Delete this notification?");

    if (!confirmDelete) return;

    await supabase.from("notifications").delete().eq("id", id);

    loadNotifications();
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="page">
      <div className="profile-card">
        <h1>Notifications</h1>

        <p>
          You have <strong>{unreadCount}</strong> unread notifications.
        </p>

        {notifications.length > 0 && (
          <button onClick={markAllRead}>Mark All Read</button>
        )}
      </div>

      {loading ? (
        <p className="message">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <p className="message">No notifications yet.</p>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {notifications.map((n) => (
            <div
              className="profile-card"
              key={n.id}
              style={{
                borderLeft: n.read
                  ? "5px solid #94a3b8"
                  : "5px solid #16a34a",
                opacity: n.read ? 0.8 : 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div>
                  <h3>{n.title}</h3>

                  <p>{n.body}</p>

                  <small>{new Date(n.created_at).toLocaleString()}</small>

                  <div
                    style={{
                      marginTop: "10px",
                    }}
                  >
                    <strong>Status:</strong> {n.read ? "Read" : "Unread"}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {!n.read && (
                    <button onClick={() => markRead(n.id)}>Mark Read</button>
                  )}

                  <button onClick={() => deleteNotification(n.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notifications;