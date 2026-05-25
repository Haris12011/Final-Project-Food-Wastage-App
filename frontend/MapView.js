import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "../lib/supabase";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapView() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");

  useEffect(() => {
    loadListings();

    const channel = supabase
      .channel("map-food-listings")
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
  }, [category]);

  async function loadListings() {
    setLoading(true);

    let query = supabase
      .from("food_listings")
      .select("*")
      .eq("status", "available")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .order("created_at", { ascending: false });

    if (category !== "All") {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      setListings([]);
    } else {
      const validListings = (data || []).filter((item) => {
        const lat = Number(item.latitude);
        const lng = Number(item.longitude);

        return (
          Number.isFinite(lat) &&
          Number.isFinite(lng) &&
          lat >= -90 &&
          lat <= 90 &&
          lng >= -180 &&
          lng <= 180
        );
      });

      setListings(validListings);
    }

    setLoading(false);
  }

  function markerPosition(item) {
    return [Number(item.latitude), Number(item.longitude)];
  }

  return (
    <div className="page">
      <div className="profile-card">
        <h1>Food Map</h1>

        <p>
          This map shows only available food items. Reserved, picked up,
          cancelled, and expired food items are automatically removed from the
          public map.
        </p>
      </div>

      <div className="section-header">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
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

        <button type="button" onClick={loadListings}>
          Refresh Map
        </button>
      </div>

      {loading ? (
        <p className="message">Loading map...</p>
      ) : listings.length === 0 ? (
        <p className="message">No available food found on map.</p>
      ) : (
        <MapContainer
          center={[33.6844, 73.0479]}
          zoom={12}
          style={{
            height: "600px",
            width: "100%",
            borderRadius: "20px",
          }}
        >
          <TileLayer
            attribution="OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {listings.map((item) => (
            <Marker key={item.id} position={markerPosition(item)}>
              <Popup>
                <div style={{ minWidth: "230px" }}>
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.item_name}
                      style={{
                        width: "100%",
                        height: "120px",
                        objectFit: "cover",
                        borderRadius: "10px",
                        marginBottom: "10px",
                      }}
                    />
                  )}

                  <h3>{item.item_name}</h3>

                  <p>🍽️ {item.category}</p>

                  <p>📍 {item.location}</p>

                  <p>⏰ {item.pickup_window}</p>

                  <p
                    style={{
                      color: "#16a34a",
                      fontWeight: "bold",
                    }}
                  >
                    📦 Available
                  </p>

                  <Link className="details-btn" to={`/listing/${item.id}`}>
                    View Details / Claim Food
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </div>
  );
}

export default MapView;