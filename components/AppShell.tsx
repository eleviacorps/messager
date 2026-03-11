"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Room = {
  id: string;
  name: string;
  createdAt: string;
};

type Media = {
  id: string;
  url: string;
  type: string;
  mime: string;
  name: string;
  size: number;
};

type Reaction = {
  id: string;
  userId: string;
  emoji: string;
};

type MessageRef = {
  id: string;
  text: string | null;
  user: { id: string; name: string };
  media: Media[];
};

type Message = {
  id: string;
  roomId: string;
  text: string | null;
  createdAt: string;
  isEdited?: boolean;
  replyTo?: MessageRef | null;
  forwardedFrom?: MessageRef | null;
  user: { id: string; name: string };
  media: Media[];
  reactions: Reaction[];
};

type Member = {
  id: string;
  name: string;
  role: string;
};

export default function AppShell() {
  const reactionOptions = ["👍", "😂", "❤️", "🔥", "🎉", "😮"];
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [roomName, setRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [forwardTargetRoomId, setForwardTargetRoomId] = useState<string>("");
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeRoom = useMemo(
    () => rooms.find((room) => room.id === activeRoomId) || null,
    [rooms, activeRoomId]
  );

  useEffect(() => {
    const loadMe = async () => {
      const res = await fetch("/api/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        await loadRooms();
      }
      setLoading(false);
    };

    loadMe();
  }, []);

  useEffect(() => {
    if (!activeRoomId) return;
    setReplyTo(null);
    setEditingMessageId(null);
    setForwardingMessage(null);
    setForwardTargetRoomId("");
    loadMessages(activeRoomId);
    loadMembers(activeRoomId);

    const source = new EventSource(`/api/rooms/${activeRoomId}/stream`);
    source.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.type === "message") {
          appendMessage(payload.message);
        } else if (payload?.type === "message:update") {
          updateMessage(payload.message);
        } else if (payload?.type === "reaction:update") {
          updateReactions(payload.messageId, payload.reactions || []);
        }
      } catch {
        // ignore
      }
    });

    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
    };
  }, [activeRoomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      setNotifyEnabled(true);
    }
  }, []);

  const loadRooms = async () => {
    const res = await fetch("/api/rooms");
    if (!res.ok) return;
    const data = await res.json();
    setRooms(data.rooms);

    const hashRoom = window.location.hash.match(/room=([^&]+)/)?.[1];
    const hashMatch = data.rooms?.find((room: Room) => room.id === hashRoom)?.id;
    const initial = hashMatch || data.rooms?.[0]?.id || null;
    setActiveRoomId(initial || null);
  };

  const loadMessages = async (roomId: string) => {
    const res = await fetch(`/api/rooms/${roomId}/messages`);
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data.messages || []);
  };

  const loadMembers = async (roomId: string) => {
    const res = await fetch(`/api/rooms/${roomId}/members`);
    if (!res.ok) return;
    const data = await res.json();
    setMembers(data.members || []);
  };

  const appendMessage = (message: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) {
        return prev.map((m) => (m.id === message.id ? message : m));
      }
      return [...prev, message];
    });

    if (
      message.user.id !== user?.id &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted" &&
      document.hidden
    ) {
      const preview =
        message.text || (message.media[0]?.type ? `[${message.media[0].type}]` : "New message");
      const n = new Notification(message.user.name, {
        body: preview,
        data: { url: `/#room=${message.roomId}` }
      });
      n.onclick = () => {
        window.focus();
        window.location.hash = `room=${message.roomId}`;
      };
    }
  };

  const updateMessage = (message: Message) => {
    setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
  };

  const updateReactions = (messageId: string, reactions: Reaction[]) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
    );
  };

  const handleLogin = async () => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: loginName, password: loginPassword })
    });

    if (!res.ok) {
      alert("Login failed");
      return;
    }

    const data = await res.json();
    setUser(data.user);
    await loadRooms();
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setRooms([]);
    setActiveRoomId(null);
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) return;
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: roomName })
    });
    if (!res.ok) return;
    const data = await res.json();
    setRooms((prev) => [data.room, ...prev]);
    setRoomName("");
    setActiveRoomId(data.room.id);
  };

  const handleJoinInvite = () => {
    if (!joinCode.trim()) return;
    window.location.href = `/invite/${joinCode.trim()}`;
  };

  const handleCreateInvite = async () => {
    if (!activeRoomId) return;
    const res = await fetch(`/api/rooms/${activeRoomId}/invite`, { method: "POST" });
    if (!res.ok) return;
    const data = await res.json();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    setInviteLink(`${baseUrl}/invite/${data.invite.code}`);
  };

  const handleFiles = async (files: FileList | File[]) => {
    if (!activeRoomId) return;
    setUploading(true);

    const mediaIds: string[] = [];
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) continue;
      const data = await res.json();
      mediaIds.push(data.media.id);
    }

    if (mediaIds.length) {
      await sendMessage("", mediaIds);
    }

    setUploading(false);
  };

  const sendMessage = async (overrideText?: string, mediaIds: string[] = []) => {
    if (!activeRoomId) return;
    const content = (overrideText ?? text).trim();
    if (!content && mediaIds.length === 0) return;
    if (editingMessageId) {
      const res = await fetch(`/api/messages/${editingMessageId}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content })
      });
      if (!res.ok) return;
      const data = await res.json();
      updateMessage(data.message);
      setEditingMessageId(null);
      setText("");
      return;
    }

    const payload = {
      text: content,
      mediaIds,
      replyToMessageId: replyTo?.id || null
    };

    const res = await fetch(`/api/rooms/${activeRoomId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) return;
    const data = await res.json();
    appendMessage(data.message);
    setText("");
    setReplyTo(null);
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    await fetch(`/api/messages/${messageId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji })
    });
  };

  const startReply = (message: Message) => {
    setReplyTo(message);
    setEditingMessageId(null);
  };

  const startEdit = (message: Message) => {
    if (message.user.id !== user?.id) return;
    setEditingMessageId(message.id);
    setReplyTo(null);
    setText(message.text || "");
  };

  const forwardMessage = async (message: Message, targetRoomId: string) => {
    await fetch(`/api/messages/${message.id}/forward`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetRoomId })
    });
    setForwardingMessage(null);
    setForwardTargetRoomId("");
  };

  const enableNotifications = async () => {
    if (typeof Notification === "undefined") return;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;
    setNotifyEnabled(true);

    if ("serviceWorker" in navigator && "PushManager" in window) {
      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub)
      });
    }
  };

  const getReactionSummary = (message: Message) => {
    const summary = new Map<string, { count: number; me: boolean }>();
    message.reactions?.forEach((reaction) => {
      const current = summary.get(reaction.emoji) || { count: 0, me: false };
      summary.set(reaction.emoji, {
        count: current.count + 1,
        me: current.me || reaction.userId === user?.id
      });
    });
    return Array.from(summary.entries()).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      me: data.me
    }));
  };

  const scrollToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-1", "ring-accent");
      setTimeout(() => el.classList.remove("ring-1", "ring-accent"), 1200);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-white/70">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-6">
        <div className="bg-panel w-full max-w-md rounded-xl shadow-glow p-8">
          <h1 className="text-3xl font-semibold mb-2">EVText</h1>
          <p className="text-white/70 mb-6">Private messenger for small friend groups.</p>
          <div className="space-y-4">
            <input
              className="input-dark w-full rounded-lg px-4 py-3"
              placeholder="Display name"
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
            />
            <input
              className="input-dark w-full rounded-lg px-4 py-3"
              placeholder="Shared password"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
            <button
              className="w-full rounded-lg bg-accent px-4 py-3 font-semibold text-black"
              onClick={handleLogin}
            >
              Enter
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg flex">
      <aside className="w-72 bg-panel border-r border-white/5 flex flex-col">
        <div className="p-5 border-b border-white/5">
          <div className="text-xl font-semibold">EVText</div>
          <div className="text-white/60 text-sm">Signed in as {user.name}</div>
          <div className="mt-3 flex gap-2">
            <button
              className="rounded-lg px-3 py-1 text-sm bg-white/10"
              onClick={handleLogout}
            >
              Logout
            </button>
            <button
              className="rounded-lg px-3 py-1 text-sm bg-accent text-black"
              onClick={enableNotifications}
              disabled={notifyEnabled}
            >
              {notifyEnabled ? "Notifications on" : "Enable notifications"}
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="text-xs uppercase tracking-widest text-white/50">Rooms</div>
          <div className="space-y-2">
            {rooms.map((room) => (
              <button
                key={room.id}
                className={`w-full text-left px-3 py-2 rounded-lg transition ${
                  activeRoomId === room.id ? "bg-accent text-black" : "bg-white/5"
                }`}
                onClick={() => {
                  setActiveRoomId(room.id);
                  window.location.hash = `room=${room.id}`;
                }}
              >
                {room.name}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 space-y-3 border-t border-white/5 mt-auto">
          <input
            className="input-dark w-full rounded-lg px-3 py-2"
            placeholder="New room name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
          <button className="w-full rounded-lg bg-white/10 px-3 py-2" onClick={handleCreateRoom}>
            Create room
          </button>
          <div className="flex gap-2">
            <input
              className="input-dark w-full rounded-lg px-3 py-2"
              placeholder="Invite code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
            />
            <button className="rounded-lg bg-white/10 px-3 py-2" onClick={handleJoinInvite}>
              Join
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="border-b border-white/5 bg-panel/90 backdrop-blur px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">{activeRoom?.name || "Select a room"}</div>
            <div className="text-white/50 text-sm">{members.length} members</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-wrap gap-2">
              {members.map((member) => (
                <span key={member.id} className="badge px-2 py-1 rounded-full text-xs">
                  {member.name}
                </span>
              ))}
            </div>
            <button
              className="rounded-lg bg-white/10 px-3 py-2 text-sm"
              onClick={handleCreateInvite}
            >
              Create invite
            </button>
          </div>
        </header>

        <section
          className="flex-1 overflow-y-auto scrollbar px-6 py-6 space-y-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
          }}
        >
          {messages.map((message) => {
            const isMine = message.user.id === user?.id;
            const reactions = getReactionSummary(message);
            return (
              <div
                key={message.id}
                id={`msg-${message.id}`}
                className={`group flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex items-end gap-3 ${isMine ? "flex-row-reverse" : ""}`}>
                  <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-sm">
                    {message.user.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="max-w-[72%]">
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        isMine ? "bg-neutral-800" : "bg-neutral-700/70"
                      }`}
                      onClick={() =>
                        setReactionPickerFor(
                          reactionPickerFor === message.id ? null : message.id
                        )
                      }
                    >
                      {!isMine ? (
                        <div className="text-xs text-white/60 mb-1">{message.user.name}</div>
                      ) : null}
                      {message.forwardedFrom ? (
                        <div className="text-[11px] text-white/50 mb-2">Forwarded message</div>
                      ) : null}
                      {message.replyTo ? (
                        <button
                          className="w-full text-left border-l-2 border-accent/50 pl-2 mb-2 text-xs text-white/70"
                          onClick={(e) => {
                            e.stopPropagation();
                            scrollToMessage(message.replyTo!.id);
                          }}
                        >
                          <div className="font-semibold">{message.replyTo.user.name}</div>
                          <div className="truncate">
                            {message.replyTo.text ||
                              (message.replyTo.media?.[0]
                                ? `[${message.replyTo.media[0].type}]`
                                : "Attachment")}
                          </div>
                        </button>
                      ) : null}
                      {message.text ? (
                        <p className="text-white/90 whitespace-pre-wrap">{message.text}</p>
                      ) : null}
                      {message.media?.length ? (
                        <div className="mt-3 grid gap-3">
                          {message.media.map((media) => (
                            <MediaPreview key={media.id} media={media} />
                          ))}
                        </div>
                      ) : null}
                      <div className="text-[10px] text-white/50 mt-2 text-right">
                        {new Date(message.createdAt).toLocaleTimeString()}
                        {message.isEdited ? " (edited)" : ""}
                      </div>
                    </div>
                    {reactionPickerFor === message.id ? (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {reactionOptions.map((emoji) => (
                          <button
                            key={emoji}
                            className="px-2 py-1 rounded-full bg-white/10 text-sm"
                            onClick={() => {
                              toggleReaction(message.id, emoji);
                              setReactionPickerFor(null);
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {reactions.length ? (
                      <div className={`mt-2 flex gap-2 flex-wrap ${isMine ? "justify-end" : ""}`}>
                        {reactions.map((reaction) => (
                          <button
                            key={reaction.emoji}
                            className={`px-2 py-1 rounded-full text-xs ${
                              reaction.me ? "bg-accent text-black" : "bg-white/10 text-white/70"
                            }`}
                            onClick={() => toggleReaction(message.id, reaction.emoji)}
                          >
                            {reaction.emoji} {reaction.count}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div
                      className={`mt-2 flex gap-2 opacity-0 group-hover:opacity-100 transition ${
                        isMine ? "justify-end" : ""
                      }`}
                    >
                      <button
                        className="text-xs text-white/70"
                        onClick={() =>
                          setReactionPickerFor(
                            reactionPickerFor === message.id ? null : message.id
                          )
                        }
                      >
                        React
                      </button>
                      <button className="text-xs text-white/70" onClick={() => startReply(message)}>
                        Reply
                      </button>
                      {isMine ? (
                        <button className="text-xs text-white/70" onClick={() => startEdit(message)}>
                          Edit
                        </button>
                      ) : null}
                      <button
                        className="text-xs text-white/70"
                        onClick={() => setForwardingMessage(message)}
                      >
                        Forward
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </section>

        <div className="border-t border-white/5 bg-panel px-6 py-4">
          {replyTo && !editingMessageId ? (
            <div className="mb-3 flex items-center justify-between rounded-lg bg-white/10 px-3 py-2 text-sm">
              <div>
                <div className="text-white/60 text-xs">Replying to {replyTo.user.name}</div>
                <div className="text-white/80">
                  {replyTo.text ||
                    (replyTo.media?.[0] ? `[${replyTo.media[0].type}]` : "Attachment")}
                </div>
              </div>
              <button className="text-white/60" onClick={() => setReplyTo(null)}>
                x
              </button>
            </div>
          ) : null}
          {editingMessageId ? (
            <div className="mb-3 flex items-center justify-between rounded-lg bg-white/10 px-3 py-2 text-sm">
              <div>
                <div className="text-white/60 text-xs">Editing message</div>
                <div className="text-white/80 truncate">{text}</div>
              </div>
              <button
                className="text-white/60"
                onClick={() => {
                  setEditingMessageId(null);
                  setText("");
                }}
              >
                x
              </button>
            </div>
          ) : null}
          {forwardingMessage ? (
            <div className="mb-3 rounded-lg bg-white/10 px-3 py-2 text-sm space-y-2">
              <div className="text-white/60 text-xs">Forward to:</div>
              <div className="flex gap-2 items-center">
                <select
                  className="input-dark rounded-lg px-3 py-2 flex-1"
                  value={forwardTargetRoomId}
                  onChange={(e) => setForwardTargetRoomId(e.target.value)}
                >
                  <option value="">Select a room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
                <button
                  className="rounded-lg bg-accent text-black px-3 py-2"
                  disabled={!forwardTargetRoomId}
                  onClick={() => forwardMessage(forwardingMessage, forwardTargetRoomId)}
                >
                  Send
                </button>
                <button
                  className="rounded-lg bg-white/10 px-3 py-2"
                  onClick={() => setForwardingMessage(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
          <div className="flex items-center gap-3">
            <input
              className="input-dark flex-1 rounded-lg px-4 py-3"
              placeholder={
                uploading
                  ? "Uploading..."
                  : editingMessageId
                    ? "Edit message"
                    : "Type a message"
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <label className="rounded-lg bg-white/10 px-3 py-2 cursor-pointer">
              Upload
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) handleFiles(e.target.files);
                }}
              />
            </label>
            <button className="rounded-lg bg-accent text-black px-4 py-2" onClick={() => sendMessage()}>
              Send
            </button>
          </div>
          {inviteLink ? (
            <div className="mt-3 text-sm text-white/70">
              Invite link: <span className="text-accent">{inviteLink}</span>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function MediaPreview({ media }: { media: Media }) {
  if (media.type === "image") {
    return <img src={media.url} alt={media.name} className="rounded-lg max-h-72" />;
  }

  if (media.type === "video") {
    return (
      <video controls className="rounded-lg max-h-72">
        <source src={media.url} type={media.mime} />
      </video>
    );
  }

  if (media.type === "audio") {
    return (
      <audio controls className="w-full">
        <source src={media.url} type={media.mime} />
      </audio>
    );
  }

  return (
    <a href={media.url} className="text-accent underline">
      {media.name}
    </a>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
