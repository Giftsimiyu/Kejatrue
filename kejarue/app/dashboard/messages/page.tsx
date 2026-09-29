"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../backend/supabase/client";

type MessageRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  property_id: string | null;
  message: string;
  created_at: string;
};

type PropertyForMessage = {
  id: string;
  title: string | null;
  owner_id: string | null;
  agent_id: string | null;
  slug: string | null;
};

type Conversation = {
  key: string;
  propertyId: string | null;
  otherUserId: string;
  messages: MessageRow[];
};

function formatMessageDate(value: string) {
  try {
    return new Date(value).toLocaleString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function getConversationKey(
  userId: string,
  otherUserId: string,
  propertyId: string | null,
) {
  const pair = [userId, otherUserId].sort();
  return `${propertyId ?? "all"}::${pair[0]}::${pair[1]}`;
}

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const propertyId = searchParams.get("property");
  const requestedTo = searchParams.get("to");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [property, setProperty] = useState<PropertyForMessage | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        if (!cancelled) {
          router.replace(
            `/auth?mode=sign-in&next=${encodeURIComponent("/dashboard/messages")}`,
          );
        }
        return;
      }

      if (cancelled) return;

      setCurrentUserId(user.id);

      let propertyData: PropertyForMessage | null = null;

      if (propertyId) {
        const { data: foundProperty } = await supabase
          .from("properties")
          .select("id,title,owner_id,agent_id,slug")
          .eq("id", propertyId)
          .maybeSingle();

        propertyData = (foundProperty as PropertyForMessage | null) ?? null;
        if (!cancelled) {
          setProperty(propertyData);
        }
      }

      const { data: rows, error: messagesError } = await supabase
        .from("messages")
        .select("id,sender_id,receiver_id,property_id,message,created_at")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (messagesError) {
        setError(`Could not load messages: ${messagesError.message}`);
      }

      const conversationsMap = new Map<string, Conversation>();

      for (const row of rows ?? []) {
        if (!row) continue;

        const otherUserId =
          row.sender_id === user.id ? row.receiver_id : row.sender_id;
        const key = getConversationKey(
          user.id,
          otherUserId,
          row.property_id ?? "all",
        );

        const existing = conversationsMap.get(key);

        if (existing) {
          existing.messages.push(row as MessageRow);
        } else {
          conversationsMap.set(key, {
            key,
            propertyId: row.property_id,
            otherUserId,
            messages: [row as MessageRow],
          });
        }
      }

      const ordered = Array.from(conversationsMap.values()).sort((a, b) => {
        const aLast = a.messages[a.messages.length - 1]?.created_at ?? "";
        const bLast = b.messages[b.messages.length - 1]?.created_at ?? "";
        return new Date(bLast).getTime() - new Date(aLast).getTime();
      });

      setConversations(ordered);

      const initialMatch = propertyId
        ? ordered.find(
            (conversation) =>
              conversation.propertyId === propertyId &&
              (!requestedTo || conversation.otherUserId === requestedTo),
          )
        : requestedTo
          ? ordered.find(
              (conversation) => conversation.otherUserId === requestedTo,
            )
          : ordered[0];

      setSelectedKey(initialMatch?.key ?? ordered[0]?.key ?? null);
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [propertyId, requestedTo, router, supabase]);

  const selectedConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation.key === selectedKey) ??
      null,
    [conversations, selectedKey],
  );

  const activeMessages = selectedConversation?.messages ?? [];
  const activeRecipientId =
    selectedConversation?.otherUserId ?? requestedTo ?? null;

  const fallbackRecipientId =
    property && property.owner_id === currentUserId
      ? property.agent_id
      : (property?.owner_id ?? null);

  const canStartNewConversation =
    !selectedConversation && Boolean(requestedTo || fallbackRecipientId);

  const conversationTitle =
    selectedConversation && selectedConversation.propertyId
      ? (property?.title ?? "Property conversation")
      : selectedConversation
        ? `Chat with ${selectedConversation.otherUserId.slice(0, 8)}`
        : "No conversation selected";

  const headerTitle = selectedConversation
    ? conversationTitle
    : property?.title
      ? `Start a conversation about ${property.title}`
      : "Start a new conversation";

  const hasConversations = conversations.length > 0;

  async function refreshMessages() {
    if (!currentUserId) return;

    const { data: rows, error: messagesError } = await supabase
      .from("messages")
      .select("id,sender_id,receiver_id,property_id,message,created_at")
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .order("created_at", { ascending: true });

    if (messagesError) {
      setError(`Could not refresh messages: ${messagesError.message}`);
      return;
    }

    const map = new Map<string, Conversation>();

    for (const row of rows ?? []) {
      if (!row) continue;

      const otherUserId =
        row.sender_id === currentUserId ? row.receiver_id : row.sender_id;
      const key = getConversationKey(
        currentUserId,
        otherUserId,
        row.property_id ?? "all",
      );

      if (map.has(key)) {
        map.get(key)?.messages.push(row as MessageRow);
      } else {
        map.set(key, {
          key,
          propertyId: row.property_id,
          otherUserId,
          messages: [row as MessageRow],
        });
      }
    }

    const ordered = Array.from(map.values()).sort((a, b) => {
      const aLast = a.messages[a.messages.length - 1]?.created_at ?? "";
      const bLast = b.messages[b.messages.length - 1]?.created_at ?? "";
      return new Date(bLast).getTime() - new Date(aLast).getTime();
    });

    setConversations(ordered);

    if (!selectedKey && ordered[0]) {
      setSelectedKey(ordered[0].key);
    }
  }

  async function sendMessage() {
    if (!currentUserId) {
      router.push(
        `/auth?mode=sign-in&next=${encodeURIComponent("/dashboard/messages")}`,
      );
      return;
    }

    const recipientId =
      activeRecipientId || fallbackRecipientId || requestedTo || null;

    if (!recipientId || recipientId === currentUserId) {
      setError("No valid recipient is available for this conversation.");
      return;
    }

    if (!draft.trim()) {
      setError("Please type a message before sending.");
      return;
    }

    setSending(true);
    setError("");

    const { error: insertError } = await supabase.from("messages").insert({
      sender_id: currentUserId,
      receiver_id: recipientId,
      property_id: selectedConversation?.propertyId ?? propertyId,
      message: draft.trim(),
    });

    setSending(false);

    if (insertError) {
      setError(insertError.message || "We could not send the message.");
      return;
    }

    setDraft("");
    await refreshMessages();

    const nextKey = getConversationKey(
      currentUserId,
      recipientId,
      selectedConversation?.propertyId ?? propertyId ?? "all",
    );
    setSelectedKey(nextKey);
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: "36px 24px 60px",
          background: "#e7e0d9",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            background: "#f3f0ee",
            border: "1px solid #d5d0cb",
            borderRadius: 18,
            padding: "28px 24px",
            color: "#334155",
          }}
        >
          Loading your inbox...
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#e7e0d9",
        padding: "28px 24px 54px",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            marginBottom: 18,
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                fontSize: 12,
                color: "#0f766e",
                fontWeight: 800,
              }}
            >
              Messages
            </p>
            <h1
              style={{
                margin: "8px 0 0",
                fontSize: "3rem",
                lineHeight: 1.05,
                fontWeight: 800,
                letterSpacing: "-0.06em",
                color: "#0f172a",
              }}
            >
              Inbox
            </h1>
          </div>

          <Link
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: "#0f172a",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            ← Back to dashboard
          </Link>
        </div>

        {error && (
          <div
            style={{
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#9f1239",
              borderRadius: 12,
              padding: "12px 14px",
              marginBottom: 18,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        <section
          style={{
            background: "#f2f1ef",
            border: "1px solid #d8d2ce",
            borderRadius: 18,
            overflow: "hidden",
            display: "grid",
            gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)",
            minHeight: 720,
            boxShadow: "0 18px 35px rgba(15, 23, 42, 0.06)",
          }}
        >
          <aside
            style={{
              background: "#eceae7",
              borderRight: "1px solid #d8d2ce",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "18px 22px",
                borderBottom: "1px solid #d8d2ce",
                fontWeight: 800,
                fontSize: 18,
                color: "#0f172a",
              }}
            >
              Conversations
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {!hasConversations ? (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 28,
                    color: "#475569",
                    textAlign: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      No conversations yet.
                    </div>
                    <div
                      style={{ marginTop: 10, fontSize: 14, lineHeight: 1.6 }}
                    >
                      Start a chat from a property page or a saved listing.
                    </div>
                    <Link
                      href="/listings"
                      style={{
                        display: "inline-flex",
                        marginTop: 16,
                        background: "#0f766e",
                        color: "#ffffff",
                        textDecoration: "none",
                        padding: "10px 16px",
                        borderRadius: 10,
                        fontWeight: 700,
                      }}
                    >
                      Browse listings
                    </Link>
                  </div>
                </div>
              ) : (
                conversations.map((conversation) => {
                  const lastMessage =
                    conversation.messages[conversation.messages.length - 1];
                  const isSelected = conversation.key === selectedKey;
                  const conversationName =
                    conversation.otherUserId === currentUserId
                      ? "You"
                      : conversation.otherUserId.slice(0, 8);

                  return (
                    <button
                      key={conversation.key}
                      type="button"
                      onClick={() => setSelectedKey(conversation.key)}
                      style={{
                        textAlign: "left",
                        padding: "16px 18px",
                        border: "none",
                        borderBottom: "1px solid #d8d2ce",
                        background: isSelected ? "#edf7f7" : "transparent",
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <strong style={{ fontSize: 15, color: "#0f172a" }}>
                          {conversationName}
                        </strong>

                        <span style={{ fontSize: 11, color: "#64748b" }}>
                          {
                            formatMessageDate(lastMessage.created_at).split(
                              ",",
                            )[0]
                          }
                        </span>
                      </div>

                      <div
                        style={{
                          marginTop: 7,
                          fontSize: 12,
                          color: "#475569",
                          letterSpacing: 0.4,
                          textTransform: "uppercase",
                          fontWeight: 700,
                        }}
                      >
                        {conversation.propertyId
                          ? "Property thread"
                          : "Direct message"}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          color: "#334155",
                          fontSize: 14,
                          lineHeight: 1.5,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {lastMessage.message}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              background: "#f5f5f4",
            }}
          >
            {selectedConversation || canStartNewConversation ? (
              <>
                <div
                  style={{
                    borderBottom: "1px solid #d8d2ce",
                    padding: "18px 22px 14px",
                    background: "#faf9f8",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: 1.2,
                      color: "#0f766e",
                      fontWeight: 800,
                    }}
                  >
                    {selectedConversation?.propertyId || propertyId
                      ? "Property conversation"
                      : "Direct message"}
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      fontWeight: 800,
                      fontSize: 20,
                      color: "#0f172a",
                    }}
                  >
                    {headerTitle}
                  </div>

                  {property?.slug && (
                    <Link
                      href={`/property/${encodeURIComponent(property.slug)}`}
                      style={{
                        display: "inline-block",
                        marginTop: 8,
                        color: "#0f766e",
                        textDecoration: "none",
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      View property ↗
                    </Link>
                  )}
                </div>

                <div
                  style={{
                    flex: 1,
                    padding: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    overflowY: "auto",
                    background: "#f7f5f3",
                  }}
                >
                  {activeMessages.length === 0 ? (
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#64748b",
                        fontSize: 18,
                        textAlign: "center",
                      }}
                    >
                      {selectedConversation
                        ? "No messages in this conversation yet."
                        : "No messages yet — send the first message to start the chat."}
                    </div>
                  ) : (
                    activeMessages.map((message) => {
                      const isMine = message.sender_id === currentUserId;

                      return (
                        <div
                          key={message.id}
                          style={{
                            alignSelf: isMine ? "flex-end" : "flex-start",
                            maxWidth: "74%",
                            background: isMine ? "#0f766e" : "#ffffff",
                            color: isMine ? "#ffffff" : "#0f172a",
                            border: `1px solid ${isMine ? "#0f766e" : "#dfe7eb"}`,
                            borderRadius: 16,
                            padding: "12px 14px",
                            boxShadow: "0 4px 10px rgba(15, 23, 42, 0.04)",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 12,
                              marginBottom: 6,
                              opacity: 0.85,
                            }}
                          >
                            {isMine ? "You" : "Other party"}
                          </div>

                          <div
                            style={{
                              whiteSpace: "pre-wrap",
                              lineHeight: 1.6,
                              fontSize: 15,
                            }}
                          >
                            {message.message}
                          </div>

                          <div
                            style={{
                              fontSize: 11,
                              marginTop: 8,
                              opacity: 0.8,
                            }}
                          >
                            {formatMessageDate(message.created_at)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div
                  style={{
                    borderTop: "1px solid #d8d2ce",
                    padding: 18,
                    background: "#faf9f8",
                  }}
                >
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={4}
                    style={{
                      width: "100%",
                      border: "1px solid #cbd5e1",
                      borderRadius: 12,
                      padding: "12px 14px",
                      resize: "vertical",
                      font: "inherit",
                      background: "#ffffff",
                      color: "#0f172a",
                      boxSizing: "border-box",
                    }}
                    placeholder="Write a message..."
                  />

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginTop: 12,
                    }}
                  >
                    <button
                      type="button"
                      onClick={sendMessage}
                      disabled={sending}
                      style={{
                        background: "#0f766e",
                        color: "white",
                        border: "none",
                        borderRadius: 10,
                        padding: "10px 18px",
                        fontWeight: 800,
                        cursor: sending ? "wait" : "pointer",
                      }}
                    >
                      {sending ? "Sending..." : "Send message"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "#64748b",
                  fontSize: 18,
                  textAlign: "center",
                  padding: 24,
                }}
              >
                <div>
                  <div
                    style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}
                  >
                    No conversation selected.
                  </div>
                  <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.6 }}>
                    Pick a thread from the left to continue the discussion.
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
