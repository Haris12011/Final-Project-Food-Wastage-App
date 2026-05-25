import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Profile() {
  const [email, setEmail] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [myListings, setMyListings] = useState([]);
  const [reservedFoods, setReservedFoods] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    setCurrentUser(user);
    setEmail(user.email);

    const { data: createdData } = await supabase
      .from("food_listings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setMyListings(createdData || []);

    const { data: reservedData } = await supabase
      .from("food_listings")
      .select("*")
      .eq("reserved_by", user.id)
      .order("reserved_at", { ascending: false });

    setReservedFoods(reservedData || []);
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  async function deleteListing(id) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this listing?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("food_listings")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Delete failed: " + error.message);
      return;
    }

    alert("Listing deleted successfully");
    loadProfile();
  }

  async function relistFood(item) {
    const { error } = await supabase
      .from("food_listings")
      .update({
        status: "available",
        reserved_by: null,
        reserved_at: null,
      })
      .eq("id", item.id);

    if (error) {
      alert("Relist failed: " + error.message);
      return;
    }

    alert("Food relisted successfully ✅");
    loadProfile();
  }

  async function updateStatus(item, newStatus) {
    if (!currentUser) return;

    const updateData = {
      status: newStatus,
    };

    if (newStatus === "cancelled") {
      updateData.reserved_by = null;
      updateData.reserved_at = null;
    }

    const { error } = await supabase
      .from("food_listings")
      .update(updateData)
      .eq("id", item.id);

    if (error) {
      alert("Status update failed: " + error.message);
      return;
    }

    alert(`Status updated to ${statusLabel(newStatus)} ✅`);
    loadProfile();
  }

  function statusLabel(status) {
    if (status === "available") return "Available";
    if (status === "reserved") return "Reserved";
    if (status === "picked_up") return "Picked Up";
    if (status === "cancelled") return "Cancelled";
    if (status === "expired") return "Expired";
    return status;
  }

  return (
    <div className="page">
      <div className="profile-card">
        <h1>Welcome, {email} 👋</h1>

        <p>
          Manage your created listings, reservation status, and food reserved
          from other users.
        </p>

        <button onClick={logout}>Logout</button>
      </div>

      <h2 className="my-title">My Created Listings</h2>

      {myListings.length === 0 ? (
        <p className="message">You have not created any listings yet.</p>
      ) : (
        <div className="grid">
          {myListings.map((item) => (
            <div className="food-card" key={item.id}>
              {item.image_url ? (
                <img src={item.image_url} alt={item.item_name} />
              ) : (
                <div className="no-image">No Image</div>
              )}

              <div className="food-card-body">
                <span className="badge">{item.category}</span>
                <h3>{item.item_name}</h3>
                <p>Status: {statusLabel(item.status)}</p>

                {item.reserved_by && <p>Reserved by another user</p>}

                <Link className="details-btn" to={`/listing/${item.id}`}>
                  View Details
                </Link>

                <Link className="details-btn" to={`/edit/${item.id}`}>
                  Edit Listing
                </Link>

                {item.status === "reserved" && (
                  <>
                    <button
                      className="details-btn"
                      onClick={() => updateStatus(item, "picked_up")}
                    >
                      Mark Picked Up
                    </button>

                    <button
                      className="details-btn"
                      onClick={() => updateStatus(item, "expired")}
                    >
                      Mark Expired
                    </button>
                  </>
                )}

                {(item.status === "cancelled" || item.status === "expired") && (
                  <button
                    className="details-btn"
                    onClick={() => relistFood(item)}
                  >
                    Relist Food
                  </button>
                )}

                <button
                  className="details-btn"
                  onClick={() => deleteListing(item.id)}
                >
                  Delete Listing
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="my-title">My Reserved Food</h2>

      {reservedFoods.length === 0 ? (
        <p className="message">You have not reserved any food yet.</p>
      ) : (
        <div className="grid">
          {reservedFoods.map((item) => (
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
                      🕒 {new Date(item.reserved_at).toLocaleString()}
                    </span>
                  )}
                </div>

                <Link className="details-btn" to={`/listing/${item.id}`}>
                  View Details
                </Link>

                {item.status === "reserved" && (
                  <button
                    className="details-btn"
                    onClick={() => updateStatus(item, "cancelled")}
                  >
                    Cancel Reservation
                  </button>
                )}

                {item.status === "picked_up" && (
                  <button className="details-btn" disabled>
                    Picked Up
                  </button>
                )}

                {item.status === "expired" && (
                  <button className="details-btn" disabled>
                    Expired
                  </button>
                )}

                {item.status === "cancelled" && (
                  <button className="details-btn" disabled>
                    Cancelled
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Profile;