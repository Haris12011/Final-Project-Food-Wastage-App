import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Chat() {
  const { listingId, receiverId } = useParams();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [user, setUser] = useState(null);
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    initChat();

    const channel = supabase
      .channel(`chat-${listingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `listing_id=eq.${listingId}`,
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [listingId]);

  async function initChat() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    setUser(user);

    await loadListing();
    await loadMessages();

    setLoading(false);
  }

  async function loadListing() {
    const { data, error } = await supabase
      .from("food_listings")
      .select("*")
      .eq("id", listingId)
      .single();

    if (!error) {
      setListing(data);
    }
  }

  async function loadMessages() {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("listing_id", listingId)
      .order("created_at", { ascending: true });

    if (!error) {
      setMessages(data || []);
    }
  }

  async function sendMessage(e) {
    e.preventDefault();

    if (!text.trim()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    const cleanText = text.trim();

    const { error } = await supabase.from("messages").insert({
      listing_id: listingId,
      sender_id: user.id,
      receiver_id: receiverId,
      message: cleanText,
    });

    if (error) {
      alert("Message failed: " + error.message);
      return;
    }

    await supabase.from("notifications").insert({
      user_id: receiverId,
      title: "New Message",
      body: cleanText,
    });

    setText("");
    loadMessages();
  }

  if (loading) {
    return <p className="message">Loading chat...</p>;
  }

  return (
    <div className="page">
      <div className="form-container">
        <h1>Chat</h1>

        {listing && (
          <div className="profile-card">
            <h3>{listing.item_name}</h3>
            <p>{listing.description}</p>

            <Link className="details-btn" to={`/listing/${listing.id}`}>
              View Listing
            </Link>
          </div>
        )}

        <div
          style={{
            marginTop: "18px",
            marginBottom: "18px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {messages.length === 0 ? (
            <p className="message">No messages yet. Start conversation.</p>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === user?.id;

              return (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: isMine ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                    background: isMine ? "#16a34a" : "#f1f5f9",
                    color: isMine ? "white" : "#0f172a",
                    padding: "10px 14px",
                    borderRadius: "16px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                >
                  <p style={{ margin: 0 }}>{msg.message}</p>

                  <small
                    style={{
                      display: "block",
                      marginTop: "6px",
                      fontSize: "11px",
                      opacity: 0.8,
                    }}
                  >
                    {new Date(msg.created_at).toLocaleString()}
                  </small>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={sendMessage}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type message..."
          />

          <button type="submit">Send Message</button>
        </form>
      </div>
    </div>
  );
}

export default Chat;