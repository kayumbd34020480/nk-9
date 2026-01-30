"use client";

import { useCallback } from "react"

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Send,
  ImageIcon,
  Video,
  Search,
  Check,
  CheckCheck,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MessengerMediaUpload } from "@/components/messenger-media-upload";

interface UserData {
  uid: string;
  displayName: string;
  email: string;
  role: "admin" | "user";
  avatarUrl?: string;
  isOnline?: boolean;
  lastSeen?: Date;
}

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text?: string;
  mediaUrls?: { url: string; type: "image" | "video" }[];
  createdAt: Date;
  read: boolean;
}

interface Chat {
  id: string;
  participants: string[];
  participantNames: { [key: string]: string };
  participantAvatars: { [key: string]: string };
  lastMessage?: string;
  lastMessageTime?: Date;
  lastSenderId?: string;
  unreadCount: { [key: string]: number };
}

export default function AdminMessengerPage() {
  const { user, userProfile } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{ url: string; type: "image" | "video" }[]>([]);
  const [view, setView] = useState<"list" | "chat">("list");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch all users (both admins and regular users)
  useEffect(() => {
    if (!user) return;

    const usersRef = collection(db, "users");
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const usersData: UserData[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (doc.id !== user.uid) {
          usersData.push({
            uid: doc.id,
            displayName: data.displayName || "Unknown User",
            email: data.email,
            role: data.role || "user",
            avatarUrl: data.avatarUrl,
            isOnline: data.isOnline || false,
            lastSeen: data.lastSeen?.toDate(),
          });
        }
      });
      // Sort: admins first, then alphabetically by name
      usersData.sort((a, b) => {
        if (a.role === "admin" && b.role !== "admin") return -1;
        if (a.role !== "admin" && b.role === "admin") return 1;
        return a.displayName.localeCompare(b.displayName);
      });
      setUsers(usersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch user's chats - using simple query without orderBy to avoid index requirement
  useEffect(() => {
    if (!user) return;

    const chatsRef = collection(db, "chats");
    const q = query(
      chatsRef,
      where("participants", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const chatsData: Chat[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          chatsData.push({
            id: docSnap.id,
            participants: data.participants,
            participantNames: data.participantNames || {},
            participantAvatars: data.participantAvatars || {},
            lastMessage: data.lastMessage,
            lastMessageTime: data.lastMessageTime?.toDate(),
            lastSenderId: data.lastSenderId,
            unreadCount: data.unreadCount || {},
          });
        });
        // Sort by lastMessageTime client-side (descending - newest first)
        chatsData.sort((a, b) => {
          const timeA = a.lastMessageTime?.getTime() || 0;
          const timeB = b.lastMessageTime?.getTime() || 0;
          return timeB - timeA;
        });
        setChats(chatsData);
      },
      (error) => {
        console.error("[v0] Error fetching chats:", error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Fetch messages for selected chat
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    const messagesRef = collection(db, "chats", selectedChat.id, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        messagesData.push({
          id: doc.id,
          chatId: selectedChat.id,
          senderId: data.senderId,
          senderName: data.senderName,
          text: data.text,
          mediaUrls: data.mediaUrls,
          createdAt: data.createdAt?.toDate() || new Date(),
          read: data.read || false,
        });
      });
      setMessages(messagesData);

      // Mark messages as read
      if (user) {
        messagesData.forEach(async (msg) => {
          if (msg.senderId !== user.uid && !msg.read) {
            const msgRef = doc(db, "chats", selectedChat.id, "messages", msg.id);
            await updateDoc(msgRef, { read: true });
          }
        });

        // Reset unread count for current user
        const chatRef = doc(db, "chats", selectedChat.id);
        updateDoc(chatRef, {
          [`unreadCount.${user.uid}`]: 0,
        });
      }
    });

    return () => unsubscribe();
  }, [selectedChat, user]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat is selected
  useEffect(() => {
    if (view === "chat") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [view, selectedChat]);

  const getOrCreateChat = async (otherUser: UserData): Promise<Chat> => {
    if (!user || !userProfile) throw new Error("Not authenticated");

    // Check if chat already exists
    const existingChat = chats.find(
      (chat) =>
        chat.participants.includes(user.uid) &&
        chat.participants.includes(otherUser.uid) &&
        chat.participants.length === 2
    );

    if (existingChat) {
      return existingChat;
    }

    // Create new chat
    const chatData = {
      participants: [user.uid, otherUser.uid],
      participantNames: {
        [user.uid]: userProfile.displayName,
        [otherUser.uid]: otherUser.displayName,
      },
      participantAvatars: {
        [user.uid]: userProfile.avatarUrl || "",
        [otherUser.uid]: otherUser.avatarUrl || "",
      },
      lastMessage: "",
      lastMessageTime: serverTimestamp(),
      lastSenderId: "",
      unreadCount: {
        [user.uid]: 0,
        [otherUser.uid]: 0,
      },
      createdAt: serverTimestamp(),
    };

    const chatRef = await addDoc(collection(db, "chats"), chatData);

    return {
      id: chatRef.id,
      participants: chatData.participants,
      participantNames: chatData.participantNames,
      participantAvatars: chatData.participantAvatars,
      lastMessage: "",
      lastMessageTime: new Date(),
      lastSenderId: "",
      unreadCount: chatData.unreadCount,
    };
  };

  const handleSelectUser = async (selectedUserData: UserData) => {
    try {
      const chat = await getOrCreateChat(selectedUserData);
      setSelectedChat(chat);
      setSelectedUser(selectedUserData);
      setView("chat");
    } catch (error) {
      console.error("Error creating/getting chat:", error);
    }
  };

  const handleSelectChat = (chat: Chat) => {
    if (!user) return;
    const otherUserId = chat.participants.find((p) => p !== user.uid);
    const otherUser = users.find((u) => u.uid === otherUserId);

    setSelectedChat(chat);
    setSelectedUser(
      otherUser || {
        uid: otherUserId || "",
        displayName: chat.participantNames[otherUserId || ""] || "Unknown",
        email: "",
        role: "user",
        avatarUrl: chat.participantAvatars[otherUserId || ""],
      }
    );
    setView("chat");
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && pendingMedia.length === 0) || !selectedChat || !user || !userProfile) return;

    setSending(true);
    try {
      const messageData: any = {
        senderId: user.uid,
        senderName: userProfile.displayName,
        createdAt: serverTimestamp(),
        read: false,
      };

      if (newMessage.trim()) {
        messageData.text = newMessage.trim();
      }

      if (pendingMedia.length > 0) {
        messageData.mediaUrls = pendingMedia;
      }

      // Add message to subcollection
      await addDoc(collection(db, "chats", selectedChat.id, "messages"), messageData);

      // Update chat with last message info
      const otherUserId = selectedChat.participants.find((p) => p !== user.uid);
      const chatRef = doc(db, "chats", selectedChat.id);

      let lastMessagePreview = newMessage.trim();
      if (!lastMessagePreview && pendingMedia.length > 0) {
        const imageCount = pendingMedia.filter((m) => m.type === "image").length;
        const videoCount = pendingMedia.filter((m) => m.type === "video").length;
        const parts = [];
        if (imageCount > 0) parts.push(`${imageCount} image${imageCount > 1 ? "s" : ""}`);
        if (videoCount > 0) parts.push(`${videoCount} video${videoCount > 1 ? "s" : ""}`);
        lastMessagePreview = `Sent ${parts.join(" and ")}`;
      }

      await updateDoc(chatRef, {
        lastMessage: lastMessagePreview,
        lastMessageTime: serverTimestamp(),
        lastSenderId: user.uid,
        [`unreadCount.${otherUserId}`]: (selectedChat.unreadCount[otherUserId || ""] || 0) + 1,
      });

      setNewMessage("");
      setPendingMedia([]);
      setShowMediaUpload(false);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleMediaUpload = (media: { url: string; type: "image" | "video" }[]) => {
    setPendingMedia(media);
    setShowMediaUpload(false);
  };

  const handleBack = () => {
    setSelectedChat(null);
    setSelectedUser(null);
    setView("list");
    setPendingMedia([]);
    setShowMediaUpload(false);
  };

  // Helper functions - defined first to avoid hoisting issues
  const getOtherParticipantName = useCallback((chat: Chat) => {
    if (!user) return "Unknown";
    const otherUserId = chat.participants.find((p) => p !== user.uid);
    return chat.participantNames[otherUserId || ""] || "Unknown";
  }, [user]);

  const getOtherParticipantAvatar = useCallback((chat: Chat) => {
    if (!user) return "";
    const otherUserId = chat.participants.find((p) => p !== user.uid);
    return chat.participantAvatars[otherUserId || ""] || "";
  }, [user]);

  const getOtherParticipantRole = useCallback((chat: Chat) => {
    if (!user) return "user";
    const otherUserId = chat.participants.find((p) => p !== user.uid);
    const otherUser = users.find((u) => u.uid === otherUserId);
    return otherUser?.role || "user";
  }, [user, users]);

  // Create a deduplicated combined list of chats and users
  const getCombinedList = useCallback(() => {
    if (!user) return { chatsWithUsers: [], usersWithoutChats: [] };

    // First, deduplicate chats by other participant (keep the one with latest message)
    const chatsByOtherUser = new Map<string, Chat>();
    for (const chat of chats) {
      const otherUserId = chat.participants.find((p) => p !== user.uid);
      if (otherUserId) {
        const existing = chatsByOtherUser.get(otherUserId);
        if (!existing || (chat.lastMessageTime && existing.lastMessageTime && chat.lastMessageTime > existing.lastMessageTime)) {
          chatsByOtherUser.set(otherUserId, chat);
        } else if (!existing) {
          chatsByOtherUser.set(otherUserId, chat);
        }
      }
    }

    const deduplicatedChats = Array.from(chatsByOtherUser.values());
    
    // Sort chats by last message time (newest first)
    deduplicatedChats.sort((a, b) => {
      const timeA = a.lastMessageTime?.getTime() || 0;
      const timeB = b.lastMessageTime?.getTime() || 0;
      return timeB - timeA;
    });

    // Get user IDs that already have chats
    const userIdsWithChats = new Set(chatsByOtherUser.keys());

    // Filter users that don't have existing chats
    const usersWithoutChats = users.filter((u) => !userIdsWithChats.has(u.uid));

    return { chatsWithUsers: deduplicatedChats, usersWithoutChats };
  }, [user, chats, users]);

  const { chatsWithUsers, usersWithoutChats } = getCombinedList();

  const filteredUsers = usersWithoutChats.filter(
    (u) =>
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredChats = chatsWithUsers.filter((chat) => {
    const otherName = getOtherParticipantName(chat);
    return otherName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatTime = (date: Date | undefined) => {
    if (!date) return "";
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-white flex flex-col">
      {/* Chat List View */}
      {view === "list" && (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-4 py-3 border-b bg-white sticky top-0 z-10">
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Admin Chats</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Active Chats */}
          <ScrollArea className="flex-1">
            {/* Recent Chats Section */}
            {filteredChats.length > 0 && (
              <div className="py-2">
                {filteredChats.map((chat) => {
                  const unreadCount = chat.unreadCount[user?.uid || ""] || 0;
                  const isOwnLastMessage = chat.lastSenderId === user?.uid;

                  return (
                    <button
                      key={chat.id}
                      onClick={() => handleSelectChat(chat)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={getOtherParticipantAvatar(chat) || "/placeholder.svg"} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium text-sm">
                            {getOtherParticipantName(chat).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {getOtherParticipantRole(chat) === "admin" && (
                          <span className="absolute -bottom-0.5 -right-0.5 bg-blue-500 text-white text-[6px] font-bold px-1 py-0.5 rounded-full leading-none">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn("text-sm font-semibold text-gray-900 truncate", unreadCount > 0 && "text-black")}>
                            {getOtherParticipantName(chat)}
                          </span>
                          <span className={cn("text-[11px] flex-shrink-0", unreadCount > 0 ? "text-blue-500 font-semibold" : "text-gray-400")}>
                            {formatTime(chat.lastMessageTime)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {isOwnLastMessage && (
                            <CheckCheck className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                          )}
                          <p
                            className={cn(
                              "text-xs truncate",
                              unreadCount > 0 ? "text-gray-800 font-medium" : "text-gray-500"
                            )}
                          >
                            {chat.lastMessage || "Start a conversation"}
                          </p>
                        </div>
                      </div>
                      {unreadCount > 0 && (
                        <span className="bg-blue-500 text-white text-[10px] font-bold h-4 min-w-4 flex items-center justify-center rounded-full px-1 flex-shrink-0">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* All Users Section - Only users without existing chats */}
            {filteredUsers.length > 0 && (
              <div className="py-1">
                {searchQuery && (
                  <div className="px-3 py-1.5">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Users
                    </h3>
                  </div>
                )}
                {!searchQuery && filteredChats.length > 0 && (
                  <div className="px-3 py-1.5">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Suggested
                    </h3>
                  </div>
                )}
                {filteredUsers.map((userData) => (
                  <button
                    key={userData.uid}
                    onClick={() => handleSelectUser(userData)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={userData.avatarUrl || "/placeholder.svg"} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium text-sm">
                          {userData.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {userData.role === "admin" && (
                        <span className="absolute -bottom-0.5 -right-0.5 bg-blue-500 text-white text-[6px] font-bold px-1 py-0.5 rounded-full leading-none">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <span className="text-sm font-semibold text-gray-900 block truncate">
                        {userData.displayName}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">{userData.role}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {filteredUsers.length === 0 && filteredChats.length === 0 && searchQuery && (
              <div className="px-4 py-8 text-center text-gray-500">
                No users found matching "{searchQuery}"
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* Chat View */}
      {view === "chat" && selectedChat && selectedUser && (
        <div className="flex flex-col h-full bg-white">
          {/* Chat Header */}
          <div className="flex items-center gap-3 px-2 py-2 border-b bg-white sticky top-0 z-10">
            <Button variant="ghost" size="icon" onClick={handleBack} className="h-10 w-10 rounded-full">
              <ArrowLeft className="h-6 w-6 text-blue-500" />
            </Button>
            <Avatar className="h-10 w-10">
              <AvatarImage src={selectedUser.avatarUrl || "/placeholder.svg"} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                {selectedUser.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 truncate">{selectedUser.displayName}</span>
                {selectedUser.role === "admin" && (
                  <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    ADMIN
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500">Active now</span>
            </div>

          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 px-3 py-4">
            <div className="space-y-2">
              {messages.map((message, index) => {
                const isOwn = message.senderId === user?.uid;
                const showAvatar =
                  !isOwn &&
                  (index === 0 || messages[index - 1].senderId !== message.senderId);
                const isLastInGroup =
                  index === messages.length - 1 ||
                  messages[index + 1].senderId !== message.senderId;

                return (
                  <div
                    key={message.id}
                    className={cn("flex items-end gap-2", isOwn ? "justify-end" : "justify-start")}
                  >
                    {!isOwn && (
                      <div className="w-7">
                        {showAvatar && (
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={selectedUser.avatarUrl || "/placeholder.svg"} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                              {message.senderName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[75%] flex flex-col",
                        isOwn ? "items-end" : "items-start"
                      )}
                    >
                      {/* Media */}
                      {message.mediaUrls && message.mediaUrls.length > 0 && (
                        <div
                          className={cn(
                            "grid gap-1 mb-1",
                            message.mediaUrls.length === 1
                              ? "grid-cols-1"
                              : message.mediaUrls.length === 2
                              ? "grid-cols-2"
                              : "grid-cols-2"
                          )}
                        >
                          {message.mediaUrls.map((media, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                "relative rounded-2xl overflow-hidden",
                                message.mediaUrls!.length === 1 ? "max-w-xs" : "max-w-[150px]"
                              )}
                            >
                              {media.type === "image" ? (
                                <img
                                  src={media.url || "/placeholder.svg"}
                                  alt="Shared image"
                                  className="w-full h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => window.open(media.url, "_blank")}
                                />
                              ) : (
                                <video
                                  src={media.url}
                                  controls
                                  className="w-full h-auto rounded-2xl"
                                  preload="metadata"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Text */}
                      {message.text && (
                        <div
                          className={cn(
                            "px-4 py-2 rounded-3xl break-words",
                            isOwn
                              ? "bg-blue-500 text-white rounded-br-md"
                              : "bg-gray-100 text-gray-900 rounded-bl-md"
                          )}
                        >
                          <p className="text-[15px] whitespace-pre-wrap">{message.text}</p>
                        </div>
                      )}
                      {/* Time & Read Status */}
                      {isLastInGroup && (
                        <div className="flex items-center gap-1 mt-0.5 px-2">
                          <span className="text-[10px] text-gray-400">
                            {formatTime(message.createdAt)}
                          </span>
                          {isOwn && (
                            message.read ? (
                              <CheckCheck className="h-3 w-3 text-blue-500" />
                            ) : (
                              <Check className="h-3 w-3 text-gray-400" />
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Pending Media Preview */}
          {pendingMedia.length > 0 && (
            <div className="px-3 py-2 border-t bg-gray-50">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {pendingMedia.map((media, index) => (
                  <div key={index} className="relative flex-shrink-0">
                    {media.type === "image" ? (
                      <img
                        src={media.url || "/placeholder.svg"}
                        alt={`Preview ${index + 1}`}
                        className="h-16 w-16 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="h-16 w-16 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Video className="h-6 w-6 text-gray-500" />
                      </div>
                    )}
                    <button
                      onClick={() => setPendingMedia((prev) => prev.filter((_, i) => i !== index))}
                      className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Media Upload Modal */}
          {showMediaUpload && (
            <MessengerMediaUpload
              onUpload={handleMediaUpload}
              onClose={() => setShowMediaUpload(false)}
            />
          )}

          {/* Message Input */}
          <div className="px-3 py-2 border-t bg-white sticky bottom-0">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMediaUpload(true)}
                className="h-10 w-10 rounded-full text-blue-500 hover:bg-blue-50 flex-shrink-0"
              >
                <ImageIcon className="h-6 w-6" />
              </Button>
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  placeholder="Aa"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="pr-4 bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Button
                size="icon"
                onClick={handleSendMessage}
                disabled={sending || (!newMessage.trim() && pendingMedia.length === 0)}
                className="h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex-shrink-0 disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
