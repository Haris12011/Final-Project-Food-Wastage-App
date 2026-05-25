import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { supabase } from "../lib/supabase";
import { analyzeFoodImage } from "../lib/gemini";

function CreateListing() {
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");

  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [pickupWindow, setPickupWindow] = useState("");
  const [location, setLocation] = useState("");

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function getCurrentLocation() {
    try {
      const platform = Capacitor.getPlatform();

      if (platform === "web") {
        if (!navigator.geolocation) {
          alert("Geolocation is not supported by this browser.");
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLatitude(position.coords.latitude);
            setLongitude(position.coords.longitude);
            alert("Food creation location added ✅");
          },
          (error) => {
            console.error("Browser location error:", error);
            alert("Location failed. Please allow browser location permission.");
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          }
        );

        return;
      }

      const permission = await Geolocation.requestPermissions();

      if (permission.location !== "granted") {
        alert("Location permission denied.");
        return;
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
      });

      setLatitude(position.coords.latitude);
      setLongitude(position.coords.longitude);

      alert("Food creation location added ✅");
    } catch (error) {
      console.error("Location error:", error);
      alert("Location failed. Please check location permission.");
    }
  }

  async function handleAI() {
    if (!imageFile) {
      alert("Please choose an image first.");
      return;
    }

    setAiLoading(true);

    try {
      const base64 = await fileToBase64(imageFile);
      const result = await analyzeFoodImage(base64);

      setItemName(result.item_name || "");
      setCategory(result.category || "Other");
      setDescription(result.description || "");

      alert("AI analysis successful ✅");
    } catch (error) {
      console.error(error);
      alert("AI failed: " + error.message);
    }

    setAiLoading(false);
  }

  function validateForm() {
    if (!itemName.trim()) {
      alert("Food name is required.");
      return false;
    }

    if (!category.trim()) {
      alert("Category is required.");
      return false;
    }

    if (!description.trim()) {
      alert("Description is required.");
      return false;
    }

    if (!pickupWindow.trim()) {
      alert("Pickup window is required.");
      return false;
    }

    if (!location.trim()) {
      alert("Pickup area is required.");
      return false;
    }

    if (!latitude || !longitude) {
      alert("Please click 'Use My Current Location' before creating listing.");
      return false;
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      alert("Invalid latitude or longitude.");
      return false;
    }

    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!validateForm()) return;

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please login first.");
      navigate("/login");
      setSaving(false);
      return;
    }

    let imageUrl = "";

    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("food-images")
        .upload(fileName, imageFile);

      if (uploadError) {
        alert(uploadError.message);
        setSaving(false);
        return;
      }

      const { data } = supabase.storage
        .from("food-images")
        .getPublicUrl(fileName);

      imageUrl = data.publicUrl;
    }

    const { error } = await supabase.from("food_listings").insert({
      user_id: user.id,
      item_name: itemName.trim(),
      category,
      description: description.trim(),
      expiry_date: expiryDate || null,
      pickup_window: pickupWindow.trim(),
      location: location.trim(),
      image_url: imageUrl,

      latitude: Number(latitude),
      longitude: Number(longitude),

      status: "available",
      reserved_by: null,
      reserved_at: null,
    });

    if (error) {
      alert("Save failed: " + error.message);
      setSaving(false);
      return;
    }

    alert("Listing created successfully ✅");
    navigate("/home");

    setSaving(false);
  }

  return (
    <div className="page">
      <div className="form-container">
        <h1>Create Food Listing</h1>

        <form onSubmit={handleSubmit}>
          <label>Food Image</label>

          <input type="file" accept="image/*" onChange={handleImageChange} />

          {preview && (
            <img src={preview} alt="preview" className="preview-img" />
          )}

          <button
            type="button"
            className="ai-btn"
            onClick={handleAI}
            disabled={aiLoading || saving}
          >
            {aiLoading ? "Analyzing..." : "Use Gemini AI"}
          </button>

          <label>Food Name</label>
          <input
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="Example: Rice, bread, apples"
            required
          />

          <label>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            <option value="">Select</option>
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
            placeholder="Write food quantity, condition, and pickup details"
            required
          />

          <label>Expiry Date</label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />

          <label>Pickup Window</label>
          <input
            value={pickupWindow}
            onChange={(e) => setPickupWindow(e.target.value)}
            placeholder="Example: Today 6 PM - 8 PM"
            required
          />

          <label>Pickup Area</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Example: Main market, Islamabad"
            required
          />

          <label>Latitude</label>
          <input
            type="number"
            value={latitude}
            readOnly
            placeholder="Click Use My Current Location"
          />

          <label>Longitude</label>
          <input
            type="number"
            value={longitude}
            readOnly
            placeholder="Click Use My Current Location"
          />

          <button type="button" onClick={getCurrentLocation} disabled={saving}>
            Use My Current Location
          </button>

          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Create Listing"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateListing;