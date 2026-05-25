import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { analyzeFoodImage } from "../lib/gemini";

function PerformanceMetrics() {
  const [metrics, setMetrics] = useState({
    pageLoadTime: 0,
    apiHitTime: 0,
    geminiTime: 0,
    reservationTime: 0,
    notificationTime: 0,
    chatInsertTime: 0,
    imageUploadTime: 0,
    pickupSuccessRate: 0,
    expiredFoodRate: 0,
    listingsCount: 0,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    measurePageLoad();
    calculateSystemRates();
  }, []);

  function measurePageLoad() {
    setTimeout(() => {
      const nav = performance.getEntriesByType("navigation")[0];

      if (nav) {
        setMetrics((prev) => ({
          ...prev,
          pageLoadTime: Math.round(nav.loadEventEnd - nav.startTime),
        }));
      }
    }, 500);
  }

  async function testApiHitTime() {
    setLoading(true);

    const start = performance.now();

    const { data, error } = await supabase.from("food_listings").select("*");

    const end = performance.now();

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setMetrics((prev) => ({
      ...prev,
      apiHitTime: Math.round(end - start),
      listingsCount: data?.length || 0,
    }));

    setLoading(false);
  }

  async function testGeminiTime() {
    const input = document.getElementById("gemini-test-image");

    if (!input.files[0]) {
      alert("Please select image first.");
      return;
    }

    setLoading(true);

    const base64 = await fileToBase64(input.files[0]);

    const start = performance.now();

    try {
      await analyzeFoodImage(base64);

      const end = performance.now();

      setMetrics((prev) => ({
        ...prev,
        geminiTime: Math.round(end - start),
      }));
    } catch (error) {
      alert(error.message);
    }

    setLoading(false);
  }

  async function testReservationTime() {
    setLoading(true);

    const { data: availableListing } = await supabase
      .from("food_listings")
      .select("*")
      .eq("status", "available")
      .limit(1)
      .maybeSingle();

    if (!availableListing) {
      alert("No available listing found for test.");
      setLoading(false);
      return;
    }

    const start = performance.now();

    const { error } = await supabase
      .from("food_listings")
      .update({
        status: "reserved",
        reserved_at: new Date().toISOString(),
      })
      .eq("id", availableListing.id);

    const end = performance.now();

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setMetrics((prev) => ({
      ...prev,
      reservationTime: Math.round(end - start),
    }));

    alert("Reservation test completed.");
    setLoading(false);
  }

  async function testNotificationTime() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Login first.");
      setLoading(false);
      return;
    }

    const start = performance.now();

    const { error } = await supabase.from("notifications").insert({
      user_id: user.id,
      title: "Performance Test",
      body: "Notification response time test",
      read: false,
    });

    const end = performance.now();

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setMetrics((prev) => ({
      ...prev,
      notificationTime: Math.round(end - start),
    }));

    setLoading(false);
  }

  async function testChatInsertTime() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Login first.");
      setLoading(false);
      return;
    }

    const start = performance.now();

    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: user.id,
      listing_id: null,
      message: "Performance test message",
    });

    const end = performance.now();

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setMetrics((prev) => ({
      ...prev,
      chatInsertTime: Math.round(end - start),
    }));

    setLoading(false);
  }

  async function testImageUploadTime() {
    const input = document.getElementById("upload-test-image");

    if (!input.files[0]) {
      alert("Please select image first.");
      return;
    }

    setLoading(true);

    const file = input.files[0];
    const fileName = `performance-${Date.now()}-${file.name}`;

    const start = performance.now();

    const { error } = await supabase.storage
      .from("food-images")
      .upload(fileName, file);

    const end = performance.now();

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setMetrics((prev) => ({
      ...prev,
      imageUploadTime: Math.round(end - start),
    }));

    setLoading(false);
  }

  async function calculateSystemRates() {
    const { data, error } = await supabase.from("food_listings").select("*");

    if (error) return;

    const rows = data || [];

    const totalReservedRelated = rows.filter((x) =>
      ["reserved", "picked_up", "cancelled", "expired"].includes(x.status)
    ).length;

    const pickedUp = rows.filter((x) => x.status === "picked_up").length;
    const expired = rows.filter((x) => x.status === "expired").length;

    setMetrics((prev) => ({
      ...prev,
      pickupSuccessRate:
        totalReservedRelated > 0
          ? Math.round((pickedUp / totalReservedRelated) * 100)
          : 0,
      expiredFoodRate:
        rows.length > 0 ? Math.round((expired / rows.length) * 100) : 0,
    }));
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve(reader.result.split(",")[1]);
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function MetricCard({ title, value, unit }) {
    return (
      <div className="profile-card">
        <h2 style={{ fontSize: "34px" }}>
          {value} {unit}
        </h2>
        <p>{title}</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="profile-card">
        <h1>Web Performance Evaluation</h1>

        <p>
          Evaluate load time, Supabase API speed, Gemini AI response, upload
          time, chat delay, and reservation processing.
        </p>

        <button onClick={testApiHitTime} disabled={loading}>
          Test API Time
        </button>

        <button onClick={testReservationTime} disabled={loading}>
          Test Reservation Time
        </button>

        <button onClick={testNotificationTime} disabled={loading}>
          Test Notification Time
        </button>

        <button onClick={testChatInsertTime} disabled={loading}>
          Test Chat Insert Time
        </button>

        <br />
        <br />

        <label>Gemini Test Image</label>
        <input id="gemini-test-image" type="file" accept="image/*" />
        <button onClick={testGeminiTime} disabled={loading}>
          Test Gemini Time
        </button>

        <br />
        <br />

        <label>Upload Test Image</label>
        <input id="upload-test-image" type="file" accept="image/*" />
        <button onClick={testImageUploadTime} disabled={loading}>
          Test Image Upload Time
        </button>
      </div>

      <div className="grid">
        <MetricCard title="Page Load Time" value={metrics.pageLoadTime} unit="ms" />
        <MetricCard title="Supabase API Time" value={metrics.apiHitTime} unit="ms" />
        <MetricCard title="Gemini AI Time" value={metrics.geminiTime} unit="ms" />
        <MetricCard title="Reservation Time" value={metrics.reservationTime} unit="ms" />
        <MetricCard title="Notification Insert Time" value={metrics.notificationTime} unit="ms" />
        <MetricCard title="Chat Insert Time" value={metrics.chatInsertTime} unit="ms" />
        <MetricCard title="Image Upload Time" value={metrics.imageUploadTime} unit="ms" />
        <MetricCard title="Pickup Success Rate" value={metrics.pickupSuccessRate} unit="%" />
        <MetricCard title="Expired Food Rate" value={metrics.expiredFoodRate} unit="%" />
        <MetricCard title="Listings Returned" value={metrics.listingsCount} unit="" />
      </div>
    </div>
  );
}

export default PerformanceMetrics;