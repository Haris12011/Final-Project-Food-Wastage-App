import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function ReservedHistory() {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReservedFoods();

    const channel = supabase
      .channel("reserved-list-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "food_listings",
        },
        () => {
          loadReservedFoods();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadReservedFoods() {
    setLoading(true);

    const { data, error } = await supabase
      .from("food_listings")
      .select("*")
      .in("status", ["reserved", "picked_up", "expired", "cancelled"])
      .order("reserved_at", { ascending: false });

    if (error) {
      console.error(error);
      setFoods([]);
    } else {
      setFoods(data || []);
    }

    setLoading(false);
  }

  function statusLabel(status) {
    if (status === "reserved") return "Reserved";
    if (status === "picked_up") return "Picked Up";
    if (status === "cancelled") return "Cancelled";
    if (status === "expired") return "Expired";
    return status;
  }

  return (
    <div className="page">
      <div className="profile-card">
        <h1>Reserved List</h1>

        <p>
          View all reserved, picked up, cancelled, and expired food items from
          all users.
        </p>
      </div>

      {loading ? (
        <p className="message">Loading reserved list...</p>
      ) : foods.length === 0 ? (
        <p className="message">No reserved items found.</p>
      ) : (
        <div className="grid">
          {foods.map((item) => (
            <div className="food-card" key={item.id}>
              {item.image_url ? (
                <img src={item.image_url} alt={item.item_name} />
              ) : (
                <div className="no-image">No Image</div>
              )}

              <div className="food-card-body">
                <span className="badge">{item.category}</span>

                <h3>{item.item_name}</h3>

                <p>{item.description}</p>

                <div className="meta">
                  <span>📍 {item.location}</span>
                  <span>⏰ {item.pickup_window}</span>
                  <span>📦 Status: {statusLabel(item.status)}</span>

                  {item.reserved_at && (
                    <span>
                      🕒 Reserved on{" "}
                      {new Date(item.reserved_at).toLocaleString()}
                    </span>
                  )}
                </div>

                <Link className="details-btn" to={`/listing/${item.id}`}>
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReservedHistory;