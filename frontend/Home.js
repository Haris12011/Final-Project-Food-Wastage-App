import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Geolocation } from "@capacitor/geolocation";
import { supabase } from "../lib/supabase";

function Home() {
  const [listings, setListings] = useState([]);
  const [category, setCategory] = useState("All");

  const [radiusKm, setRadiusKm] = useState(10);

  const [useNearby, setUseNearby] = useState(true);

  const [userLocation, setUserLocation] = useState(null);

  const [loading, setLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    initializePage();

    const channel = supabase
      .channel("food-listings-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "food_listings",
        },
        () => {
          loadListings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [category, useNearby, userLocation, radiusKm]);

  async function initializePage() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    setCurrentUser(user);

    await autoDetectLocation();

    await loadListings();
  }

  async function autoDetectLocation() {
    try {
      const permission = await Geolocation.requestPermissions();

      if (permission.location !== "granted") return;

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
      });

      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });

      setUseNearby(true);
    } catch (error) {
      console.log("Auto location failed");
    }
  }

  async function getLocationAndSearch() {
    try {
      const permission = await Geolocation.requestPermissions();

      if (permission.location !== "granted") {
        alert("Location permission denied");
        return;
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });

      setUseNearby(true);

      alert("Nearby search enabled ✅");
    } catch (error) {
      console.error(error);
      alert("Location failed.");
    }
  }

  async function loadListings() {
    setLoading(true);

    // ---------------- NEARBY SEARCH ----------------
    if (useNearby && userLocation) {
      const { data, error } = await supabase.rpc("nearby_food", {
        user_lat: userLocation.lat,
        user_lng: userLocation.lng,
        radius_meters: Number(radiusKm) * 1000,
      });

      if (error) {
        console.error(error);
        setListings([]);
      } else {
        // ONLY SHOW AVAILABLE ITEMS
        let filtered = (data || []).filter(
          (item) => item.status === "available"
        );

        if (category !== "All") {
          filtered = filtered.filter(
            (item) => item.category === category
          );
        }

        setListings(filtered);
      }

      setLoading(false);
      return;
    }

    // ---------------- NORMAL SEARCH ----------------
    let query = supabase
      .from("food_listings")
      .select("*")
      .eq("status", "available") // ONLY AVAILABLE
      .order("created_at", { ascending: false });

    if (category !== "All") {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      setListings([]);
    } else {
      setListings(data || []);
    }

    setLoading(false);
  }

  async function reserveFood(item) {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    if (item.user_id === currentUser.id) {
      alert("You cannot reserve your own listing.");
      return;
    }

    if (item.status !== "available") {
      alert("This food is already reserved.");
      return;
    }

    const { error } = await supabase
      .from("food_listings")
      .update({
        status: "reserved",
        reserved_by: currentUser.id,
        reserved_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      alert("Reserve failed: " + error.message);
      return;
    }

    await supabase.from("notifications").insert({
      user_id: item.user_id,
      title: "Food Reserved",
      body: `${currentUser.email} reserved your listing "${item.item_name}"`,
    });

    alert("Food reserved successfully ✅");

    // REMOVE RESERVED ITEM IMMEDIATELY
    setListings((prev) =>
      prev.filter((listing) => listing.id !== item.id)
    );

    loadListings();
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
      alert(error.message);
      return;
    }

    alert("Food relisted successfully ✅");

    loadListings();
  }

  async function updateStatus(item, newStatus) {
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
      alert(error.message);
      return;
    }

    alert(`Status updated to ${newStatus}`);

    loadListings();
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
      <section className="hero">
        <div>
          <h1>Available Food Listings</h1>

          <p>
            Browse nearby food and reserve food items in real time.
          </p>

          <Link className="primary-link" to="/create">
            + Create Food Listing
          </Link>
        </div>
      </section>

      <div className="section-header">
        <h2>Community Food</h2>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option>All</option>
          <option>Fruit</option>
          <option>Vegetables</option>
          <option>Bakery</option>
          <option>Cooked Food</option>
          <option>Dairy</option>
          <option>Packaged Food</option>
          <option>Drinks</option>
          <option>Other</option>
        </select>
      </div>

      <div className="section-header">
        <div>
          <strong>Nearby Search:</strong>{" "}
          {useNearby ? "Enabled ✅" : "Disabled ❌"}

          <br />

          {userLocation && (
            <span>
              📍 Nearby within {radiusKm} km
            </span>
          )}
        </div>

        <select
          value={radiusKm}
          onChange={(e) => setRadiusKm(e.target.value)}
        >
          <option value="5">5 km</option>
          <option value="10">10 km</option>
          <option value="20">20 km</option>
          <option value="50">50 km</option>
        </select>

        <button type="button" onClick={getLocationAndSearch}>
          Refresh Location
        </button>

        <button
          type="button"
          onClick={() => {
            setUseNearby(false);
          }}
        >
          Show All
        </button>
      </div>

      {loading ? (
        <p className="message">Loading listings...</p>
      ) : listings.length === 0 ? (
        <p className="message">No food listings found.</p>
      ) : (
        <div className="grid">
          {listings.map((item) => (
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

                  <span>
                    📦 {statusLabel(item.status)}
                  </span>

                  {item.distance_meters && (
                    <span>
                      📏{" "}
                      {(item.distance_meters / 1000).toFixed(1)} km away
                    </span>
                  )}
                </div>

                <Link
                  className="details-btn"
                  to={`/listing/${item.id}`}
                >
                  View Details
                </Link>

                {currentUser &&
                  item.user_id !== currentUser.id && (
                    <>
                      <Link
                        className="details-btn"
                        to={`/chat/${item.id}/${item.user_id}`}
                      >
                        Message Owner
                      </Link>

                      <button
                        type="button"
                        className="details-btn"
                        onClick={() => reserveFood(item)}
                      >
                        Reserve Food
                      </button>
                    </>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Home;