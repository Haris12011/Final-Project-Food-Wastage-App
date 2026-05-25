import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

function ListingDetails() {
  const { id } = useParams();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadListing();
  }, []);

  async function loadListing() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setCurrentUser(user);

    const { data, error } = await supabase
      .from("food_listings")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      alert(error.message);
    } else {
      setListing(data);
    }

    setLoading(false);
  }

  async function claimFood() {
    if (!currentUser) {
      alert("Please login first.");
      return;
    }

    if (listing.user_id === currentUser.id) {
      alert("You cannot reserve your own listing.");
      return;
    }

    if (listing.status !== "available") {
      alert("This food is not available.");
      return;
    }

    const { data, error } = await supabase
      .from("food_listings")
      .update({
        status: "reserved",
        reserved_by: currentUser.id,
        reserved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "available")
      .select()
      .single();

    if (error || !data) {
      alert("Reserve failed. This food may already be reserved.");
      loadListing();
      return;
    }

    await supabase.from("notifications").insert({
      user_id: listing.user_id,
      title: "Food Reserved",
      body: `${currentUser.email} reserved your listing "${listing.item_name}"`,
      read: false,
    });

    alert("Food reserved successfully ✅");
    loadListing();
  }

  async function updateStatus(newStatus) {
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
      .eq("id", listing.id);

    if (error) {
      alert("Status update failed: " + error.message);
      return;
    }

    alert(`Status updated to ${statusLabel(newStatus)} ✅`);
    loadListing();
  }

  async function relistFood() {
    const { error } = await supabase
      .from("food_listings")
      .update({
        status: "available",
        reserved_by: null,
        reserved_at: null,
      })
      .eq("id", listing.id);

    if (error) {
      alert("Relist failed: " + error.message);
      return;
    }

    alert("Food relisted successfully ✅");
    loadListing();
  }

  function statusLabel(status) {
    if (status === "available") return "Available";
    if (status === "reserved") return "Reserved";
    if (status === "picked_up") return "Picked Up";
    if (status === "cancelled") return "Cancelled";
    if (status === "expired") return "Expired";
    return status;
  }

  if (loading) {
    return <p className="message">Loading listing...</p>;
  }

  if (!listing) {
    return <p className="message">Listing not found.</p>;
  }

  const isOwner = currentUser && listing.user_id === currentUser.id;
  const isReservedByMe = currentUser && listing.reserved_by === currentUser.id;

  return (
    <div className="page">
      <div className="details-card">
        {listing.image_url && (
          <img
            className="details-image"
            src={listing.image_url}
            alt={listing.item_name}
          />
        )}

        <div className="details-content">
          <span className="badge">{listing.category}</span>

          <h1>{listing.item_name}</h1>

          <p>{listing.description}</p>

          <div className="details-info">
            <p>
              <strong>Expiry:</strong> {listing.expiry_date || "Not provided"}
            </p>

            <p>
              <strong>Pickup Window:</strong> {listing.pickup_window}
            </p>

            <p>
              <strong>Pickup Area:</strong> {listing.location}
            </p>

            <p>
              <strong>Status:</strong> {statusLabel(listing.status)}
            </p>

            {listing.reserved_at && (
              <p>
                <strong>Reserved At:</strong>{" "}
                {new Date(listing.reserved_at).toLocaleString()}
              </p>
            )}

            {listing.latitude && listing.longitude && (
              <p>
                <strong>Food Location:</strong> Saved at listing creation time.
              </p>
            )}
          </div>

          {isOwner ? (
            <>
              <button disabled>Your Listing</button>

              <Link className="details-btn" to={`/edit/${listing.id}`}>
                Edit Listing
              </Link>

              {listing.status === "reserved" && (
                <>
                  <button onClick={() => updateStatus("picked_up")}>
                    Mark Picked Up
                  </button>

                  <button onClick={() => updateStatus("expired")}>
                    Mark Expired
                  </button>
                </>
              )}

              {(listing.status === "cancelled" ||
                listing.status === "expired") && (
                <button onClick={relistFood}>Relist Food</button>
              )}
            </>
          ) : (
            <>
              <Link
                className="details-btn"
                to={`/chat/${listing.id}/${listing.user_id}`}
              >
                Message Owner
              </Link>

              {listing.status === "available" && (
                <button onClick={claimFood}>Claim / Reserve Food</button>
              )}

              {listing.status === "reserved" && isReservedByMe && (
                <button onClick={() => updateStatus("cancelled")}>
                  Cancel Reservation
                </button>
              )}

              {listing.status === "reserved" && !isReservedByMe && (
                <button disabled>Already Reserved</button>
              )}

              {listing.status === "picked_up" && <button disabled>Picked Up</button>}

              {listing.status === "expired" && <button disabled>Expired</button>}

              {listing.status === "cancelled" && <button disabled>Cancelled</button>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ListingDetails;