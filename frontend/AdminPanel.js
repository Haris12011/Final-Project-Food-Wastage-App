import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function AdminPanel() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadListings();
  }, []);

  async function loadListings() {
    setLoading(true);

    const { data, error } = await supabase
      .from("food_listings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
    } else {
      setListings(data || []);
    }

    setLoading(false);
  }

  async function deleteListing(id) {
    const confirmDelete = window.confirm(
      "Delete this food listing?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("food_listings")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
    } else {
      alert("Listing deleted");
      loadListings();
    }
  }

  async function markUnavailable(id) {
    const { error } = await supabase
      .from("food_listings")
      .update({
        status: "unavailable",
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
    } else {
      alert("Marked unavailable");
      loadListings();
    }
  }

  async function markAvailable(id) {
    const { error } = await supabase
      .from("food_listings")
      .update({
        status: "available",
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
    } else {
      alert("Marked available");
      loadListings();
    }
  }

  async function flagListing(id, currentFlag) {
    const { error } = await supabase
      .from("food_listings")
      .update({
        flagged: !currentFlag,
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
    } else {
      loadListings();
    }
  }

  return (
    <div className="page">
      <div className="profile-card">
        <h1>Admin Panel</h1>

        <p>
          Manage all food listings, moderate content,
          and control listing availability.
        </p>
      </div>

      {loading ? (
        <p className="message">Loading admin panel...</p>
      ) : listings.length === 0 ? (
        <p className="message">No listings found.</p>
      ) : (
        <div className="grid">
          {listings.map((item) => (
            <div className="food-card" key={item.id}>
              {item.image_url ? (
                <img src={item.image_url} alt={item.item_name} />
              ) : (
                <div className="no-image">
                  No Image
                </div>
              )}

              <div className="food-card-body">
                <span className="badge">
                  {item.category}
                </span>

                <h3>{item.item_name}</h3>

                <p>{item.description}</p>

                <div className="meta">
                  <span>
                    📍 {item.location}
                  </span>

                  <span>
                    📦 Status: {item.status}
                  </span>

                  <span>
                    🚩 Flagged:{" "}
                    {item.flagged ? "Yes" : "No"}
                  </span>
                </div>

                <button
                  onClick={() =>
                    flagListing(
                      item.id,
                      item.flagged
                    )
                  }
                >
                  {item.flagged
                    ? "Remove Flag"
                    : "Flag Listing"}
                </button>

                {item.status ===
                "available" ? (
                  <button
                    onClick={() =>
                      markUnavailable(
                        item.id
                      )
                    }
                  >
                    Mark Unavailable
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      markAvailable(
                        item.id
                      )
                    }
                  >
                    Mark Available
                  </button>
                )}

                <button
                  onClick={() =>
                    deleteListing(item.id)
                  }
                >
                  Delete Listing
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminPanel;