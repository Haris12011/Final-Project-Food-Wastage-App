import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

function EditListing() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [pickupWindow, setPickupWindow] = useState("");
  const [location, setLocation] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    loadListing();
  }, []);

  async function loadListing() {
    const { data, error } = await supabase
      .from("food_listings")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      alert(error.message);
      navigate("/home");
      return;
    }

    setItemName(data.item_name || "");
    setCategory(data.category || "");
    setDescription(data.description || "");
    setPickupWindow(data.pickup_window || "");
    setLocation(data.location || "");
    setExpiryDate(data.expiry_date || "");

    setLoading(false);
  }

  async function handleUpdate(e) {
    e.preventDefault();

    setSaving(true);

    const { error } = await supabase
      .from("food_listings")
      .update({
        item_name: itemName,
        category,
        description,
        pickup_window: pickupWindow,
        location,
        expiry_date: expiryDate,
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
    } else {
      alert("Listing updated successfully ✅");
      navigate("/profile");
    }

    setSaving(false);
  }

  if (loading) {
    return <p className="message">Loading listing...</p>;
  }

  return (
    <div className="page">
      <div className="form-container">
        <h1>Edit Listing</h1>

        <form onSubmit={handleUpdate}>
          <label>Food Name</label>
          <input
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            required
          />

          <label>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            <option>Fruit</option>
            <option>Vegetables</option>
            <option>Bakery</option>
            <option>Cooked Food</option>
            <option>Dairy</option>
            <option>Packaged Food</option>
            <option>Drinks</option>
            <option>Other</option>
          </select>

          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <label>Pickup Window</label>
          <input
            value={pickupWindow}
            onChange={(e) => setPickupWindow(e.target.value)}
          />

          <label>Location</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          <label>Expiry Date</label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />

          <button type="submit">
            {saving ? "Updating..." : "Update Listing"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default EditListing;