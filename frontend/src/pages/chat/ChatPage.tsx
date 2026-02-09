// pages/chat/ChatPage.tsx
import Topbar from "@/components/Topbar";
import { useChatStore } from "@/stores/useChatStore";
import { useUser } from "@clerk/clerk-react";
import { useEffect, useRef, useLayoutEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import UsersList from "./components/UsersList";
import ChatHeader from "./components/ChatHeader";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import MessageInput from "./components/MessageInput";
import { ChevronDown, X, ChevronsDown } from "lucide-react";
import { axiosInstance } from "@/lib/axios";
import type { Message } from "@/types";
import { MessageBubble } from "./components/MessageBubble";
import {
  DateSeparator,
  UnreadIndicator,
  TypingIndicator,
  EmptyConversation,
  NoConversationPlaceholder,
  DeleteDialog,
  MessageContextMenu,
  ImagePreviewModal,
  shouldShowDateSeparator,
  FloatingReactionBar,
} from "./components/ChatComponents";
import { useSocketReconnect } from '@/hooks/useSocketReconnect';
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice';
import { useBottomOverlayHeight } from "@/hooks/useBottomOverlayHeight";

const ChatPage = () => {
  useSocketReconnect();
  const isTouch = useIsTouchDevice();
  
  const { user } = useUser();
  const {
    selectedUser,
    fetchUsers,
    fetchMessages,
    messagesByUser,
    typingUsers,
    replyingTo,
    setReplyingTo,
    addReaction,
    removeReaction,
    currentUserId,
    markConversationRead
  } = useChatStore();

  const messages: Message[] = selectedUser ? messagesByUser[selectedUser.clerkId] || [] : [];

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);
  const hasInitialScrollRef = useRef(false);

  const bottomPadding = useBottomOverlayHeight();

  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollButtonTimeoutRef = useRef<number | null>(null);

  // Desktop right-click context menu
  const [contextMenu, setContextMenu] = useState<{
    messageId: string;
    position: { x: number; y: number };
    mine: boolean;
    hasText: boolean;
  } | null>(null);

  // Desktop reaction picker (from hover button)
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);

  const [imagePreview, setImagePreview] = useState<{
    images: string[];
    initialIndex: number;
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [hasShownUnread, setHasShownUnread] = useState(false);

  // Touch selection mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [reactionBarPosition, setReactionBarPosition] = useState<{ top: number; left: number; right: number; mine: boolean } | null>(null);

  const isUserTyping = selectedUser && typingUsers.has(selectedUser.clerkId);
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;

  useEffect(() => {
    setHasShownUnread(false);
    hasInitialScrollRef.current = false;
    prevMessagesLengthRef.current = 0;
  }, [selectedUser?.clerkId]);

  useEffect(() => {
    if (user) fetchUsers();
  }, [fetchUsers, user]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.clerkId);
    }
  }, [selectedUser, fetchMessages]);

  const handleImageClick = (images: string[], initialIndex: number = 0) => {
    setImagePreview({ images, initialIndex });
  };

  const dragCounter = useRef(0);

  useEffect(() => {
    const preventDefaults = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
  
    window.addEventListener("dragenter", preventDefaults);
    window.addEventListener("dragover", preventDefaults);
    window.addEventListener("dragleave", preventDefaults);
    window.addEventListener("drop", preventDefaults);
  
    return () => {
      window.removeEventListener("dragenter", preventDefaults);
      window.removeEventListener("dragover", preventDefaults);
      window.removeEventListener("dragleave", preventDefaults);
      window.removeEventListener("drop", preventDefaults);
    };
  }, []);
  

  useEffect(() => {
    const vp = viewportRef.current;
    const overlay = document.getElementById("chat-drag-overlay");
    if (!vp || !overlay) return;
  
    const show = () => overlay.classList.remove("opacity-0");
    const hide = () => overlay.classList.add("opacity-0");
  
    const onDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current += 1;
      show();
    };
  
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
  
    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current -= 1;
  
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        hide();
      }
    };
  
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      hide();
  
      const files = Array.from(e.dataTransfer?.files || []);
      if (!files.length) return;
  
      window.dispatchEvent(
        new CustomEvent("chat-files-dropped", {
          detail: { files },
        })
      );
    };
  
    vp.addEventListener("dragenter", onDragEnter);
    vp.addEventListener("dragover", onDragOver);
    vp.addEventListener("dragleave", onDragLeave);
    vp.addEventListener("drop", onDrop);
  
    return () => {
      vp.removeEventListener("dragenter", onDragEnter);
      vp.removeEventListener("dragover", onDragOver);
      vp.removeEventListener("dragleave", onDragLeave);
      vp.removeEventListener("drop", onDrop);
    };
  }, []);

  useEffect(() => {
    const hideOverlay = () => {
      const overlay = document.getElementById("chat-drag-overlay");
      overlay?.classList.add("opacity-0");
      dragCounter.current = 0;
    };
  
    window.addEventListener("blur", hideOverlay);
    window.addEventListener("dragend", hideOverlay);
  
    return () => {
      window.removeEventListener("blur", hideOverlay);
      window.removeEventListener("dragend", hideOverlay);
    };
  }, []);
  
  
  const forceScrollToBottom = useCallback(() => {
    const vp = viewportRef.current;
    if (vp) {
      vp.scrollTop = vp.scrollHeight;
    }
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const vp = viewportRef.current;
    if (vp) {
      if (behavior === "auto") {
        vp.scrollTop = vp.scrollHeight;
      } else {
        vp.scrollTo({ top: vp.scrollHeight, behavior });
      }
    }
  }, []);

  const isNearBottom = useCallback((vp: HTMLDivElement | null, threshold = 150) => {
    if (!vp) return true;
    const distance = vp.scrollHeight - vp.scrollTop - vp.clientHeight;
    return distance <= threshold;
  }, []);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const onScroll = () => {
      const nearBottom = isNearBottom(vp);

      if (!nearBottom && messages.length > 0) {
        setShowScrollButton(true);
        if (scrollButtonTimeoutRef.current) clearTimeout(scrollButtonTimeoutRef.current);
        // scrollButtonTimeoutRef.current = window.setTimeout(() => setShowScrollButton(false), 3000);
      } else {
        setShowScrollButton(false);
        if (scrollButtonTimeoutRef.current) clearTimeout(scrollButtonTimeoutRef.current);
      }

      if (nearBottom && selectedUser) {
        markConversationRead(selectedUser.clerkId);
        setHasShownUnread(true);
      }

      // Close selection mode on scroll
      if (selectionMode) {
        handleCancelSelection();
      }
    };

    vp.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      vp.removeEventListener("scroll", onScroll);
      if (scrollButtonTimeoutRef.current) clearTimeout(scrollButtonTimeoutRef.current);
    };
  }, [selectedUser?.clerkId, messages.length, isNearBottom, selectedUser, markConversationRead, selectionMode]);

  useLayoutEffect(() => {
    if (!selectedUser || messages.length === 0) return;
    if (!hasInitialScrollRef.current) {
      forceScrollToBottom();
      requestAnimationFrame(forceScrollToBottom);
      const timers = [50, 100, 200, 300, 500].map(t => setTimeout(forceScrollToBottom, t));
      hasInitialScrollRef.current = true;
      return () => timers.forEach(clearTimeout);
    }
  }, [selectedUser?.clerkId, messages.length, forceScrollToBottom]);

  useEffect(() => {
    if (!selectedUser || messages.length === 0) return;
    if (prevMessagesLengthRef.current > 0 && messages.length > prevMessagesLengthRef.current) {
      const last = messages[messages.length - 1];
      if (last.senderId === user?.id || isNearBottom(viewportRef.current)) {
        setTimeout(() => scrollToBottom("smooth"), 50);
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, selectedUser?.clerkId, user?.id, scrollToBottom, isNearBottom]);

  // Swipe back (touch only)
  useEffect(() => {
    if (!isTouch || !selectedUser) return;
    let startX: number | null = null, startY: number | null = null;
    const onStart = (e: TouchEvent) => {
      if (e.touches[0].clientX < 20) { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }
    };
    const onMove = (e: TouchEvent) => {
      if (startX === null || startY === null) return;
      const diffX = e.touches[0].clientX - startX, diffY = Math.abs(e.touches[0].clientY - startY);
      if (diffX > 60 && diffY < 40) { useChatStore.getState().setSelectedUser(null); startX = startY = null; }
    };
    const onEnd = () => { startX = startY = null; };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => { window.removeEventListener("touchstart", onStart); window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onEnd); };
  }, [selectedUser, isTouch]);

  // Close context menu on click
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  // Close reaction picker on click
  useEffect(() => {
    if (!reactionPickerMessageId) return;
    const handleClick = () => setReactionPickerMessageId(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [reactionPickerMessageId]);

  // Close selection mode on tap outside
  useEffect(() => {
    if (!selectionMode) return;
    const handleClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-message-bubble]') && !target.closest('[data-reaction-bar]') && !target.closest('[data-selection-header]')) {
        handleCancelSelection();
      }
    };
    document.addEventListener('click', handleClick);
    document.addEventListener('touchend', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('touchend', handleClick);
    };
  }, [selectionMode]);

  const isFirstInGroup = (idx: number) => idx === 0 || messages[idx - 1]?.senderId !== messages[idx]?.senderId;
  const isLastInGroup = (idx: number) => idx === messages.length - 1 || messages[idx + 1]?.senderId !== messages[idx]?.senderId;

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await axiosInstance.delete(`/chat/messages/${messageId}`);
      if (selectedUser) fetchMessages(selectedUser.clerkId, true);
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const openDeleteDialog = (messageId: string) => {
    setMessageToDelete(messageId);
    setDeleteDialogOpen(true);
    setContextMenu(null);
    handleCancelSelection();
  };

  // Desktop: Right-click
  const handleContextMenu = (e: React.MouseEvent, messageId: string, mine: boolean) => {
    if (isTouch) return;
    e.preventDefault();
    const message = messages.find(m => m._id === messageId);
    const hasText = !!(message?.content && message.content.length > 0);
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - 280);
    setContextMenu({ messageId, position: { x, y }, mine, hasText });
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
    setContextMenu(null);
    handleCancelSelection();
  };

  const handleReactionSelect = (messageId: string, emoji: string) => {
    const message = messages.find(m => m._id === messageId);
    if (!message) return;
    const existing = message.reactions?.find(r => r.userId === currentUserId && r.emoji === emoji);
    if (existing) removeReaction(messageId);
    else addReaction(messageId, emoji);
    setReactionPickerMessageId(null);
    handleCancelSelection();
  };

  // Touch: Long press - enter selection mode and show reaction bar
  const handleLongPress = (messageId: string, mine: boolean, element: HTMLElement) => {
    if (!isTouch) return;
    
    const rect = element.getBoundingClientRect();
    const viewportRect = viewportRef.current?.getBoundingClientRect();
    
    if (viewportRect) {
      setReactionBarPosition({
        top: rect.top - viewportRect.top - 50, // Position above message
        left: mine ? 0 : rect.left - viewportRect.left,
        right: mine ? viewportRect.right - rect.right : 0,
        mine,
      });
    }
    
    setSelectionMode(true);
    setSelectedMessageId(messageId);
    
    if ('vibrate' in navigator) navigator.vibrate(50);
  };

  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedMessageId(null);
    setReactionBarPosition(null);
  };

  const handleDeleteSelected = () => {
    if (selectedMessageId) openDeleteDialog(selectedMessageId);
  };

  const handleReplySelected = () => {
    if (selectedMessageId) {
      const message = messages.find(m => m._id === selectedMessageId);
      if (message) handleReply(message);
    }
  };

  const handleCopySelected = () => {
    if (selectedMessageId) {
      const message = messages.find(m => m._id === selectedMessageId);
      if (message?.content) navigator.clipboard.writeText(message.content);
    }
    handleCancelSelection();
  };

  const handleReactionFromBar = (emoji: string) => {
    if (selectedMessageId) {
      handleReactionSelect(selectedMessageId, emoji);
    }
  };

  const [isExiting, setIsExiting] = useState(false);
  useEffect(() => { setIsExiting(false); }, [selectedUser?.clerkId]);

  const [contentReady, setContentReady] = useState(!isTouch);
  useEffect(() => {
    if (isTouch) {
      setContentReady(false);
      const id = requestAnimationFrame(() => setContentReady(true));
      return () => cancelAnimationFrame(id);
    } else {
      setContentReady(true);
    }
  }, [selectedUser?.clerkId, isTouch]);

  const selectedMessage = selectedMessageId ? messages.find(m => m._id === selectedMessageId) : null;
  const canCopy = selectedMessage?.content && selectedMessage.content.length > 0;
  const canDelete = selectedMessage?.senderId === user?.id;

  const firstUnreadIndex = !hasShownUnread ? messages.findIndex(msg => !msg.read && msg.senderId !== user?.id) : -1;
  const unreadCount = firstUnreadIndex >= 0 ? messages.length - firstUnreadIndex : 0;

  const chatVariants = {
    initial: { x: "100%", opacity: 1 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "100%", opacity: 1 }
  };

  return (
    <main className="h-full rounded-lg overflow-hidden bg-[#121318]/85">
      <Topbar className="hidden md:flex bg-[#121318]/85" />
      <div className="grid h-[100dvh] md:h-[calc(100vh-180px)] grid-cols-1 lg:grid-cols-[300px_1fr]">
        <div className={`${selectedUser ? "hidden lg:block" : "block"} border-r border-zinc-800 bg-[#121318]/85`}>
          <Topbar className="flex md:hidden bg-[#121318]/85" />
          <UsersList />
        </div>

        <AnimatePresence mode="wait">
          {selectedUser ? (
            <motion.div
            variants={isDesktop ? undefined : chatVariants}
            initial={isDesktop ? { opacity: 1 } : "initial"}
            animate={isDesktop ? { opacity: 1 } : "animate"}
            exit={isDesktop ? undefined : "exit"}
              transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
              className="flex flex-col h-full w-full"
            >
              <div className="shrink-0 sticky top-0 z-30" data-selection-header>
                <ChatHeader
                  selectionMode={selectionMode}
                  selectedCount={selectedMessageId ? 1 : 0}
                  onCancelSelection={handleCancelSelection}
                  onDeleteSelected={handleDeleteSelected}
                  onReplySelected={handleReplySelected}
                  onCopySelected={handleCopySelected}
                  canCopy={!!canCopy}
                  canDelete={!!canDelete}
                />
              </div>

              {contentReady && !isExiting && (
                <div className="flex-1 overflow-hidden relative chat-bg-pattern">

                  {/* Drag overlay */}
                    <div
                      id="chat-drag-overlay"
                      className="
                        pointer-events-none
                        absolute inset-0 z-40
                        opacity-0 transition-opacity
                        bg-black/40 backdrop-blur-sm
                        flex items-center justify-center
                      "
                    >
                      <div className="px-5 py-3 rounded-xl bg-[#1c1c24]/90 border border-[#2a2a35] text-white text-sm shadow-xl">
                        Drop files to send
                      </div>
                    </div>

                  {/* Floating Reaction Bar for touch selection */}
                  <AnimatePresence>
                    {selectionMode && reactionBarPosition && isTouch && (
                      <FloatingReactionBar
                        position={reactionBarPosition}
                        onReaction={handleReactionFromBar}
                      />
                    )}
                  </AnimatePresence>

                    <div
                      ref={viewportRef}
                      className="absolute inset-0 overflow-y-auto chat-scroll"
                      style={{
                        WebkitOverflowScrolling: "touch",
                        paddingBottom: bottomPadding,
                      }}
                    >
                    <div className="min-h-full flex flex-col justify-end">
                      <div className="px-2 py-4">
                        {messages.length === 0 ? (
                          <EmptyConversation user={selectedUser} />
                        ) : (
                          messages.map((message: Message, idx: number) => {
                            const mine = message.senderId === user?.id;
                            const showAvatar = isFirstInGroup(idx);
                            const lastInGroup = isLastInGroup(idx);
                            const prevMessage = idx > 0 ? messages[idx - 1] : null;
                            const showDateSep = shouldShowDateSeparator(message, prevMessage);
                            const showUnreadIndicator = idx === firstUnreadIndex && firstUnreadIndex > 0;
                            const isSelected = selectedMessageId === message._id;

                            return (
                              <div key={message._id}>
                                {showDateSep && <DateSeparator date={message.createdAt} />}
                                {showUnreadIndicator && (
                                  <UnreadIndicator
                                    count={unreadCount}
                                    onClick={() => { scrollToBottom("smooth"); setHasShownUnread(true); }}
                                  />
                                )}
                                <MessageBubble
                                  message={message}
                                  mine={mine}
                                  showAvatar={showAvatar}
                                  lastInGroup={lastInGroup}
                                  selectedUser={selectedUser}
                                  currentUserId={currentUserId}
                                  messageIndex={idx}
                                  totalMessages={messages.length}
                                  isTouch={isTouch}
                                  isSelected={isSelected}
                                  onContextMenu={(e) => handleContextMenu(e, message._id, mine)}
                                  onLongPress={(element) => handleLongPress(message._id, mine, element)}
                                  onReply={() => handleReply(message)}
                                  onReactionSelect={(emoji) => handleReactionSelect(message._id, emoji)}
                                  onImageClick={handleImageClick}
                                  showReactionPicker={reactionPickerMessageId === message._id && !isTouch}
                                  onToggleReactionPicker={() => {
                                    if (!isTouch) setReactionPickerMessageId(reactionPickerMessageId === message._id ? null : message._id);
                                  }}
                                />
                              </div>
                            );
                          })
                        )}

                        <AnimatePresence>
                          {isUserTyping && selectedUser && (
                            <div className="flex items-end gap-2 py-1 justify-start px-[4%]">
                              <Avatar className="size-7 shrink-0 shadow-sm ring-1 ring-white/10">
                                <AvatarImage src={selectedUser.imageUrl} />
                              </Avatar>
                              <TypingIndicator userName={selectedUser.fullName.split(' ')[0]} />
                            </div>
                          )}
                        </AnimatePresence>
                        <div ref={bottomRef} className="h-4 shrink-0" />
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {showScrollButton && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => { scrollToBottom("smooth"); setShowScrollButton(false); }}
                        className="absolute bottom-20 right-4 z-30 bg-[#1c1c24]/90 backdrop-blur-md rounded-full border border-[#2a2a35]/60 shadow-xl text-zinc-400 p-2.5"
                      >
                        <ChevronsDown className="md:hidden h-5 w-5" />
                        <ChevronDown className="hidden md:block h-5 w-5" />
                      </motion.button>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {replyingTo && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-[60px] md:bottom-[65px] left-2 right-[60px] sm:left-3 sm:right-[62px] z-10"  
                      >
                        <div className="flex items-center gap-2 px-4 py-2 bg-[#1c1c24]/95 backdrop-blur-sm border border-[#2a2a35]/60 rounded-2xl shadow-lg">
                          <div className="w-1 h-8 bg-violet-500 rounded-full" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-violet-400 font-medium">Reply to message</p>
                            <p className="text-sm text-zinc-400 truncate">
                              {replyingTo.type === "audio" ? "🎤 Voice message" :
                              replyingTo.type === "file" ? "📎 File" :
                              replyingTo.content?.substring(0, 50) + (replyingTo.content && replyingTo.content.length > 50 ? "..." : "")}
                            </p>
                          </div>
                          <button onClick={() => setReplyingTo(null)} className="p-1.5 hover:bg-[#2a2a35] rounded-full transition-colors">
                            <X className="w-4 h-4 text-zinc-400" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="absolute bottom-0 left-0 right-0 z-20">
                    <MessageInput />
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="no-chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="hidden lg:flex flex-col flex-1 items-center justify-center p-6 bg-[#121318]/85"
            >
              <NoConversationPlaceholder />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop Context Menu */}
      <AnimatePresence>
        {contextMenu && !isTouch && (
          <MessageContextMenu
            position={contextMenu.position}
            mine={contextMenu.mine}
            hasText={contextMenu.hasText}
            onDelete={contextMenu.mine ? () => openDeleteDialog(contextMenu.messageId) : undefined}
            onReply={() => {
              const msg = messages.find(m => m._id === contextMenu.messageId);
              if (msg) handleReply(msg);
            }}
            onReaction={(emoji) => handleReactionSelect(contextMenu.messageId, emoji)}
            onCopy={contextMenu.hasText ? () => {
              const msg = messages.find(m => m._id === contextMenu.messageId);
              if (msg?.content) navigator.clipboard.writeText(msg.content);
              setContextMenu(null);
            } : undefined}
            onClose={() => setContextMenu(null)}
          />
        )}
      </AnimatePresence>

      <ImagePreviewModal
        images={imagePreview?.images || null}
        initialIndex={imagePreview?.initialIndex || 0}
        onClose={() => setImagePreview(null)}
      />

      <DeleteDialog
        isOpen={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setMessageToDelete(null); }}
        onConfirm={() => { if (messageToDelete) handleDeleteMessage(messageToDelete); setMessageToDelete(null); }}
      />
    </main>
  );
};

export default ChatPage;