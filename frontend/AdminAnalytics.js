import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function AdminAnalytics() {
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    reserved: 0,
    pickedUp: 0,
    cancelled: 0,
    expired: 0,
    users: 0,
    messages: 0,
    notifications: 0,
    successRate: 0,
  });

  const [categoryStats, setCategoryStats] = useState([]);
  const [statusStats, setStatusStats] = useState([]);

  useEffect(() => {
    loadStats();

    const channel = supabase
      .channel("analytics-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "food_listings",
        },
        loadStats
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadStats() {
    const { data: listings } = await supabase.from("food_listings").select("*");
    const { data: messages } = await supabase.from("messages").select("*");
    const { data: notifications } = await supabase
      .from("notifications")
      .select("*");

    const rows = listings || [];

    const available = rows.filter((x) => x.status === "available").length;
    const reserved = rows.filter((x) => x.status === "reserved").length;
    const pickedUp = rows.filter((x) => x.status === "picked_up").length;
    const cancelled = rows.filter((x) => x.status === "cancelled").length;
    const expired = rows.filter((x) => x.status === "expired").length;

    const categories = {};
    rows.forEach((item) => {
      const name = item.category || "Other";
      categories[name] = (categories[name] || 0) + 1;
    });

    setCategoryStats(
      Object.entries(categories).map(([name, count]) => ({
        name,
        count,
      }))
    );

    setStatusStats([
      { name: "Available", count: available },
      { name: "Reserved", count: reserved },
      { name: "Picked Up", count: pickedUp },
      { name: "Cancelled", count: cancelled },
      { name: "Expired", count: expired },
    ]);

    const uniqueUsers = new Set(rows.map((x) => x.user_id).filter(Boolean));

    const completedTotal = pickedUp + cancelled + expired;

    setStats({
      total: rows.length,
      available,
      reserved,
      pickedUp,
      cancelled,
      expired,
      users: uniqueUsers.size,
      messages: messages?.length || 0,
      notifications: notifications?.length || 0,
      successRate:
        completedTotal > 0
          ? Math.round((pickedUp / completedTotal) * 100)
          : 0,
    });
  }

  function StatCard({ title, value, icon }) {
    return (
      <div className="profile-card">
        <h2 style={{ fontSize: "34px" }}>
          {icon} {value}
        </h2>
        <p>{title}</p>
      </div>
    );
  }

  function ProgressBar({ name, count }) {
    return (
      <div style={{ marginBottom: "14px" }}>
        <strong>
          {name}: {count}
        </strong>

        <div
          style={{
            height: "14px",
            background: "#dcfce7",
            borderRadius: "999px",
            marginTop: "6px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min(
                (count / Math.max(stats.total, 1)) * 100,
                100
              )}%`,
              background: "linear-gradient(90deg, #16a34a, #047857)",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="profile-card">
        <h1>Admin Analytics Dashboard</h1>

        <p>
          Visual overview of listings, reservation status, pickup success,
          messages, notifications, and platform activity.
        </p>

        <button onClick={loadStats}>Refresh Analytics</button>
      </div>

      <div className="grid">
        <StatCard icon="📦" value={stats.total} title="Total Listings" />
        <StatCard icon="✅" value={stats.available} title="Available Food" />
        <StatCard icon="🔒" value={stats.reserved} title="Reserved Food" />
        <StatCard icon="📤" value={stats.pickedUp} title="Picked Up" />
        <StatCard icon="❌" value={stats.cancelled} title="Cancelled" />
        <StatCard icon="⏰" value={stats.expired} title="Expired" />
        <StatCard icon="📈" value={`${stats.successRate}%`} title="Pickup Success Rate" />
        <StatCard icon="👥" value={stats.users} title="Active Donors" />
        <StatCard icon="💬" value={stats.messages} title="Chat Messages" />
        <StatCard icon="🔔" value={stats.notifications} title="Notifications" />
      </div>

      <h2 className="my-title">Reservation Status Breakdown</h2>

      <div className="profile-card">
        {statusStats.map((item) => (
          <ProgressBar key={item.name} name={item.name} count={item.count} />
        ))}
      </div>

      <h2 className="my-title">Category Breakdown</h2>

      <div className="profile-card">
        {categoryStats.length === 0 ? (
          <p>No category data found.</p>
        ) : (
          categoryStats.map((item) => (
            <ProgressBar key={item.name} name={item.name} count={item.count} />
          ))
        )}
      </div>
    </div>
  );
}

export default AdminAnalytics;