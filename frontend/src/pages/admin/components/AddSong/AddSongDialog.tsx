import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import {
  Plus, Upload, Music, Image as ImageIcon, Loader2, Clock,
  Search, RefreshCw, FolderOpen, ChevronLeft, ChevronRight,
  SkipForward, Zap, Globe, Check, Undo2, CheckCircle2,
  XCircle, Ban, Languages, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { axiosInstance } from "@/lib/axios";
import { useMusicStore } from "@/stores/useMusicStore";

import {
  MAX_AUDIO_SIZE_BYTES, MAX_IMAGE_SIZE_BYTES, SONGS_PER_PAGE,
  GENRE_OPTIONS, MOOD_OPTIONS, LANGUAGE_OPTIONS,
} from "./constants";
import type { QueuedSong, NewSong, CloudProviderId, UndoAction } from "./constants";

import {
  formatDuration, generateId, getAudioDuration,
  normalizeText, isSimilar, isGenericArtist,
  parseFilename, matchFilesFromFolder,
  fetchTrackTags, getAlbumSuggestions,
  getRecentAlbums, addRecentAlbum, searchTrackMetadata,
} from "./utils";

import {
  MobileBlockScreen, AudioPlayer, CloudProviderSelector,
  AlbumSuggestionChips, DropZone, QueueItem, DuplicateWarning,
  KeyboardShortcutsHelp, ConfidenceBadge, WarningBadge, SourceBadge,
} from "./SubComponents";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AddSongDialog = () => {
  const { albums, songs, fetchSongs, fetchAlbums } = useMusicStore();
  const [songDialogOpen, setSongDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSearchingMetadata, setIsSearchingMetadata] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedCloud, setSelectedCloud] = useState<CloudProviderId>("imagekit");

  // Queue management
  const [queue, setQueue] = useState<QueuedSong[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });

  // Album state
  const [selectedAlbum, setSelectedAlbum] = useState("");
  const [recentAlbumIds, setRecentAlbumIds] = useState<string[]>([]);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const currentSong = queue[currentIndex] || null;

  // ========================================================================
  // EFFECTS
  // ========================================================================

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load recent albums
  useEffect(() => {
    setRecentAlbumIds(getRecentAlbums());
  }, [songDialogOpen]);

  const recentAlbums = albums.filter((a) => recentAlbumIds.includes(a._id));

  // Clean up audio URLs when component unmounts
  useEffect(() => {
    return () => {
      queue.forEach((item) => {
        if (item.audioUrl) URL.revokeObjectURL(item.audioUrl);
      });
    };
  }, []);

  // ========================================================================
  // HELPERS
  // ========================================================================

  const checkDuplicate = useCallback(
    (title: string, artist: string): {
      isDuplicate: boolean;
      duplicateInfo?: { title: string; artist: string; id: string };
    } => {
      if (!title) return { isDuplicate: false };

      const normalizedTitle = normalizeText(title);
      const normalizedArtist = normalizeText(artist);

      for (const song of songs) {
        const songTitle = normalizeText(song.title);
        const songArtist = normalizeText(song.artist);

        if (isSimilar(normalizedTitle, songTitle, 0.85)) {
          if (!normalizedArtist || !songArtist || isSimilar(normalizedArtist, songArtist, 0.7)) {
            return {
              isDuplicate: true,
              duplicateInfo: { title: song.title, artist: song.artist, id: song._id },
            };
          }
        }
      }

      return { isDuplicate: false };
    },
    [songs]
  );

  const findMatchingAlbum = useCallback(
    (albumName: string): string | null => {
      if (!albumName) return null;
      const normalizedSearch = albumName.toLowerCase().trim();

      const exactMatch = albums.find((a) => a.title.toLowerCase().trim() === normalizedSearch);
      if (exactMatch) return exactMatch._id;

      const partialMatch = albums.find(
        (a) =>
          a.title.toLowerCase().includes(normalizedSearch) ||
          normalizedSearch.includes(a.title.toLowerCase())
      );
      if (partialMatch) return partialMatch._id;

      return null;
    },
    [albums]
  );

  // ========================================================================
  // PROCESSING
  // ========================================================================

  const processAudioFile = async (
    audioFile: File,
    imageFile: File | null
  ): Promise<QueuedSong> => {
    const id = generateId();
    const parsedFromFilename = parseFilename(audioFile.name);
    const audioUrl = URL.createObjectURL(audioFile);

    let duration = 0;
    try {
      duration = await getAudioDuration(audioFile);
    } catch (e) {
      console.error("Failed to get duration:", e);
    }

    const searchQuery = parsedFromFilename.artist
      ? `${parsedFromFilename.title} ${parsedFromFilename.artist}`
      : parsedFromFilename.title;

    let metadataResults: any[] = [];
    let selectedMetadataIndex: number | null = null;
    let finalTitle = parsedFromFilename.title;
    let finalArtist = parsedFromFilename.artist;
    let albumId = selectedAlbum;

    try {
      metadataResults = await searchTrackMetadata(searchQuery, parsedFromFilename);

      const bestResult = metadataResults.find(
        (r) =>
          r.confidence >= 0.7 &&
          r.language === "latin" &&
          r.matchesFilename &&
          !r.isSoundtrack &&
          !isGenericArtist(r.artist)
      );

      if (bestResult) {
        selectedMetadataIndex = metadataResults.indexOf(bestResult);
        finalTitle = bestResult.title;
        finalArtist = bestResult.artist;
        if (bestResult.album) {
          const matchingAlbumId = findMatchingAlbum(bestResult.album);
          if (matchingAlbumId) albumId = matchingAlbumId;
        }
      } else if (metadataResults.length > 0) {
        const latinResult = metadataResults.find(
          (r) => r.language === "latin" && !isGenericArtist(r.artist)
        );
        if (latinResult && latinResult.confidence >= 0.5) {
          selectedMetadataIndex = metadataResults.indexOf(latinResult);
          finalTitle = latinResult.title;
          finalArtist = latinResult.artist;
        }
      }
    } catch (e) {
      console.error("Metadata search failed:", e);
    }

    const { isDuplicate, duplicateInfo } = checkDuplicate(finalTitle, finalArtist);

    let imagePreview: string | null = null;
    if (imageFile) {
      imagePreview = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(imageFile);
      });
    }

    // Fetch genre/mood/language from Last.fm via backend
    let autoGenre = "";
    let autoMood = "";
    let autoLanguage = "";

    try {
      const tags = await fetchTrackTags(finalTitle, finalArtist);
      autoGenre = tags.genre;
      autoMood = tags.mood;
      autoLanguage = tags.language;
    } catch (e) {
      console.error("Tag detection failed:", e);
    }

      const albumSuggestions = getAlbumSuggestions(
        finalTitle,
        finalArtist,
        albums,
        autoGenre,
        autoMood,
        autoLanguage,
        selectedMetadataIndex !== null ? metadataResults[selectedMetadataIndex]?.album : undefined
      );

    // Auto-select best album if confidence is good
    if (!albumId || albumId === "none" || albumId === "") {
      if (albumSuggestions.length > 0 && albumSuggestions[0].confidence >= 0.5) {
        albumId = albumSuggestions[0].albumId;
      }
    }

    return {
      id,
      audioFile,
      imageFile,
      originalFilename: audioFile.name,
      metadata: {
        title: finalTitle,
        artist: finalArtist,
        album: albumId,
        duration,
        genre: autoGenre,
        mood: autoMood,
        language: autoLanguage,
      },
      parsedFromFilename,
      metadataResults,
      selectedMetadataIndex,
      albumSuggestions,
      imagePreview,
      audioUrl,
      status: "pending",
      isDuplicate,
      duplicateInfo,
      manuallyEdited: false,
      uploadProgress: 0,
      cloud: selectedCloud,
    };
  };

  const processFilePairs = async (pairs: { audio: File; image: File | null }[]) => {
    if (pairs.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: pairs.length });

    const newQueueItems: QueuedSong[] = [];
    const batchSize = 5;

    for (let i = 0; i < pairs.length; i += batchSize) {
      const batch = pairs.slice(i, i + batchSize);

      const batchPromises = batch.map(async (pair, batchIndex) => {
        const globalIndex = i + batchIndex;
        try {
          const queueItem = await processAudioFile(pair.audio, pair.image);
          setProcessingProgress((prev) => ({ ...prev, current: globalIndex + 1 }));
          return queueItem;
        } catch (error) {
          console.error("Error processing:", pair.audio.name, error);
          setProcessingProgress((prev) => ({ ...prev, current: globalIndex + 1 }));
          return null;
        }
      });

      const results = await Promise.all(batchPromises);
      newQueueItems.push(...results.filter((item): item is QueuedSong => item !== null));
      toast.loading(`Processing ${Math.min(i + batchSize, pairs.length)}/${pairs.length}...`, { id: "processing" });
    }

    toast.dismiss("processing");

    if (newQueueItems.length > 0) {
      setQueue((prev) => [...prev, ...newQueueItems]);
      toast.success(`Added ${newQueueItems.length} song(s) to queue`);
    }

    setProcessingProgress({ current: 0, total: 0 });
    setIsProcessing(false);
  };

  // ========================================================================
  // FILE HANDLERS
  // ========================================================================

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const pairs = matchFilesFromFolder(files);
    if (pairs.length === 0) {
      toast.error("No valid audio files found");
      return;
    }

    await processFilePairs(pairs);
    e.target.value = "";
  };

  const handleAudioDrop = async (file: File) => {
    setIsProcessing(true);
    try {
      const queueItem = await processAudioFile(file, currentSong?.imageFile || null);

      if (currentSong && currentSong.status === "pending") {
        if (currentSong.audioUrl) URL.revokeObjectURL(currentSong.audioUrl);
        setQueue((prev) =>
          prev.map((item, idx) =>
            idx === currentIndex
              ? { ...queueItem, imageFile: item.imageFile, imagePreview: item.imagePreview }
              : item
          )
        );
      } else {
        setQueue((prev) => [...prev, queueItem]);
        setCurrentIndex(queue.length);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageDrop = async (file: File) => {
    const imagePreview = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });

    if (!currentSong) {
      toast.error("Please add an audio file first");
      return;
    }

    setQueue((prev) =>
      prev.map((item, idx) =>
        idx === currentIndex ? { ...item, imageFile: file, imagePreview } : item
      )
    );
  };

  const clearAudio = () => {
    if (currentSong) {
      if (currentSong.audioUrl) URL.revokeObjectURL(currentSong.audioUrl);
      pushUndo({ type: "remove", item: currentSong, index: currentIndex });
      removeFromQueue(currentSong.id);
    }
  };

  const clearImage = () => {
    if (currentSong) {
      setQueue((prev) =>
        prev.map((item, idx) =>
          idx === currentIndex ? { ...item, imageFile: null, imagePreview: null } : item
        )
      );
    }
  };

  // ========================================================================
  // METADATA HANDLERS
  // ========================================================================

  const updateMetadata = (field: keyof NewSong, value: string | number) => {
    if (!currentSong) return;

    setQueue((prev) =>
      prev.map((item, idx) => {
        if (idx !== currentIndex) return item;

        const newMetadata = { ...item.metadata, [field]: value };
        let isDuplicate = item.isDuplicate;
        let duplicateInfo = item.duplicateInfo;

        if (field === "title" || field === "artist") {
          const result = checkDuplicate(
            field === "title" ? (value as string) : newMetadata.title,
            field === "artist" ? (value as string) : newMetadata.artist
          );
          isDuplicate = result.isDuplicate;
          duplicateInfo = result.duplicateInfo;
        }
        const albumSuggestions = getAlbumSuggestions(
          newMetadata.title,
          newMetadata.artist,
          albums,
          newMetadata.genre,
          newMetadata.mood,
          newMetadata.language
        );

        return { ...item, metadata: newMetadata, isDuplicate, duplicateInfo, manuallyEdited: true, albumSuggestions };
      })
    );
  };

  const selectMetadataResult = (index: number) => {
    if (!currentSong || !currentSong.metadataResults[index]) return;

    const result = currentSong.metadataResults[index];

    setQueue((prev) =>
      prev.map((item, idx) => {
        if (idx !== currentIndex) return item;

        const { isDuplicate, duplicateInfo } = checkDuplicate(result.title, result.artist);

        let albumToSet = item.metadata.album;
        if (result.album) {
          const matchingAlbumId = findMatchingAlbum(result.album);
          if (matchingAlbumId) albumToSet = matchingAlbumId;
        }

        return {
          ...item,
          selectedMetadataIndex: index,
          metadata: {
            ...item.metadata,
            title: result.title,
            artist: result.artist,
            album: albumToSet,
          },
          isDuplicate,
          duplicateInfo,
          manuallyEdited: false,
        };
      })
    );
  };

  const swapArtistTitle = () => {
    if (!currentSong) return;

    setQueue((prev) =>
      prev.map((item, idx) => {
        if (idx !== currentIndex) return item;

        const newTitle = item.metadata.artist;
        const newArtist = item.metadata.title;
        const { isDuplicate, duplicateInfo } = checkDuplicate(newTitle, newArtist);

        return {
          ...item,
          metadata: { ...item.metadata, title: newTitle, artist: newArtist },
          isDuplicate,
          duplicateInfo,
          manuallyEdited: true,
        };
      })
    );
  };

  const handleManualSearch = async () => {
    if (!currentSong) return;

    const query = `${currentSong.metadata.title} ${currentSong.metadata.artist}`.trim();
    if (!query) return;

    setIsSearchingMetadata(true);
    try {
      const results = await searchTrackMetadata(query, currentSong.parsedFromFilename);
      setQueue((prev) =>
        prev.map((item, idx) =>
          idx === currentIndex
            ? { ...item, metadataResults: results, selectedMetadataIndex: null }
            : item
        )
      );
    } finally {
      setIsSearchingMetadata(false);
    }
  };

  // ========================================================================
  // QUEUE NAVIGATION
  // ========================================================================

  const removeFromQueue = (id: string) => {
    const idx = queue.findIndex((q) => q.id === id);
    const item = queue.find((q) => q.id === id);

    if (item?.audioUrl) URL.revokeObjectURL(item.audioUrl);

    setQueue((prev) => prev.filter((q) => q.id !== id));

    if (idx <= currentIndex && currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < queue.length - 1) setCurrentIndex((prev) => prev + 1);
  };

  const goToPrev = () => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  };

  const goToNextPending = () => {
    const nextIdx = queue.findIndex((item, idx) => idx > currentIndex && item.status === "pending");

    if (nextIdx !== -1) {
      setCurrentIndex(nextIdx);
      const newPage = Math.floor(nextIdx / SONGS_PER_PAGE);
      if (newPage !== currentPage) setCurrentPage(newPage);
    } else {
      const firstPending = queue.findIndex((item) => item.status === "pending");
      if (firstPending !== -1) {
        setCurrentIndex(firstPending);
        const newPage = Math.floor(firstPending / SONGS_PER_PAGE);
        if (newPage !== currentPage) setCurrentPage(newPage);
      }
    }
  };

  const skipCurrent = () => {
    if (!currentSong) return;

    pushUndo({ type: "skip", item: { ...currentSong }, index: currentIndex });

    setQueue((prev) =>
      prev.map((item, idx) =>
        idx === currentIndex ? { ...item, status: "skipped" } : item
      )
    );

    goToNextPending();
  };

  const ignoreDuplicate = () => {
    if (!currentSong) return;
    setQueue((prev) =>
      prev.map((item, idx) =>
        idx === currentIndex ? { ...item, isDuplicate: false } : item
      )
    );
  };

  // ========================================================================
  // UNDO
  // ========================================================================

  const pushUndo = (action: UndoAction) => {
    setUndoStack((prev) => [...prev.slice(-9), action]);
  };

  const undo = () => {
    const action = undoStack[undoStack.length - 1];
    if (!action) return;

    setUndoStack((prev) => prev.slice(0, -1));

    if (action.type === "remove" || action.type === "skip") {
      setQueue((prev) => {
        const newQueue = [...prev];
        newQueue.splice(action.index, 0, { ...action.item, status: "pending" });
        return newQueue;
      });
      setCurrentIndex(action.index);
    }
  };

  // ========================================================================
  // BATCH OPERATIONS
  // ========================================================================

  const skipAllDuplicates = () => {
    const duplicateIds = queue
      .filter((item) => item.isDuplicate && item.status === "pending")
      .map((item) => item.id);

    setQueue((prev) =>
      prev.map((item) =>
        duplicateIds.includes(item.id) ? { ...item, status: "skipped" } : item
      )
    );

    toast.success(`Skipped ${duplicateIds.length} duplicate(s)`);
    goToNextPending();
  };

  const createFormData = (item: QueuedSong): FormData => {
    const formData = new FormData();
    formData.append("title", item.metadata.title.trim());
    formData.append("artist", item.metadata.artist.trim());
    formData.append("duration", String(item.metadata.duration));
    formData.append("cloud", item.cloud);

    if (item.metadata.genre) formData.append("genre", item.metadata.genre);
    if (item.metadata.mood) formData.append("mood", item.metadata.mood);
    if (item.metadata.language) formData.append("language", item.metadata.language);

    const albumToUse = item.metadata.album || selectedAlbum;
    if (albumToUse && albumToUse !== "none") {
      formData.append("albumId", albumToUse);
      addRecentAlbum(albumToUse);
    }

    formData.append("audioFile", item.audioFile);
    formData.append("imageFile", item.imageFile!);
    return formData;
  };

  const getUploadableItems = (items: QueuedSong[]) =>
    items.filter(
      (item) =>
        item.status === "pending" &&
        item.audioFile &&
        item.imageFile &&
        item.metadata.title &&
        item.metadata.artist &&
        !item.isDuplicate
    );

  const uploadBatch = async (items: QueuedSong[]) => {
    let successCount = 0;
    let errorCount = 0;

    for (const item of items) {
      const idx = queue.findIndex((q) => q.id === item.id);
      setCurrentIndex(idx);

      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: "uploading" } : q))
      );

      try {
        const formData = createFormData(item);
        await axiosInstance.post("/admin/songs", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: "success" } : q))
        );
        successCount++;
      } catch (error: any) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: "error", error: error.response?.data?.message || error.message }
              : q
          )
        );
        errorCount++;
      }
    }

    return { successCount, errorCount };
  };

  const uploadAll = async () => {
    const pendingItems = getUploadableItems(queue);
    if (pendingItems.length === 0) {
      toast.error("No valid songs to upload");
      return;
    }

    setIsLoading(true);
    const { successCount, errorCount } = await uploadBatch(pendingItems);
    setIsLoading(false);
    fetchSongs();
    fetchAlbums();

    if (successCount > 0) {
      toast.success(`Uploaded ${successCount} song(s)${errorCount > 0 ? `, ${errorCount} failed` : ""}`);
    } else if (errorCount > 0) {
      toast.error(`Failed to upload ${errorCount} song(s)`);
    }
  };

  const uploadPage = async (pageNum: number) => {
    const start = pageNum * SONGS_PER_PAGE;
    const end = start + SONGS_PER_PAGE;
    const pageItems = getUploadableItems(queue.slice(start, end));

    if (pageItems.length === 0) {
      toast.error("No valid songs to upload on this page");
      return;
    }

    setIsLoading(true);
    const { successCount, errorCount } = await uploadBatch(pageItems);
    setIsLoading(false);
    fetchSongs();
    fetchAlbums();

    if (successCount > 0) {
      toast.success(`Page ${pageNum + 1}: Uploaded ${successCount}${errorCount > 0 ? `, ${errorCount} failed` : ""}`);
    }
  };

  const handleSubmit = async () => {
    if (!currentSong || !currentSong.audioFile || !currentSong.imageFile) {
      toast.error("Please upload both audio and image files");
      return;
    }
    if (!currentSong.metadata.title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!currentSong.metadata.artist.trim()) {
      toast.error("Please enter an artist");
      return;
    }

    setQueue((prev) =>
      prev.map((item, idx) =>
        idx === currentIndex ? { ...item, status: "uploading" } : item
      )
    );
    setIsLoading(true);

    try {
      const formData = createFormData(currentSong);
      const albumToUse = currentSong.metadata.album || selectedAlbum;
      if (albumToUse && albumToUse !== "none") setSelectedAlbum(albumToUse);

      await axiosInstance.post("/admin/songs", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setQueue((prev) =>
        prev.map((item, idx) =>
          idx === currentIndex ? { ...item, status: "success" } : item
        )
      );

      toast.success("Song added successfully!");
      goToNextPending();
      fetchSongs();
      fetchAlbums();
    } catch (error: any) {
      setQueue((prev) =>
        prev.map((item, idx) =>
          idx === currentIndex
            ? { ...item, status: "error", error: error.response?.data?.message || error.message }
            : item
        )
      );
      toast.error("Failed to add song");
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================================================
  // KEYBOARD SHORTCUTS
  // ========================================================================

  useEffect(() => {
    if (!songDialogOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          if (isFormValid && !isLoading) handleSubmit();
        }
        return;
      }

      switch (e.key) {
        case "Enter":
          if (isFormValid && !isLoading) handleSubmit();
          break;
        case "ArrowLeft":
          goToPrev();
          break;
        case "ArrowRight":
          goToNext();
          break;
        case "s":
        case "S":
          if (!e.ctrlKey && !e.metaKey) skipCurrent();
          break;
        case "z":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            undo();
          }
          break;
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
          const idx = parseInt(e.key) - 1;
          if (currentSong?.metadataResults[idx]) {
            selectMetadataResult(idx);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [songDialogOpen, currentSong, isLoading]);

  // ========================================================================
  // DIALOG OPEN/CLOSE
  // ========================================================================

  const handleOpenChange = (open: boolean) => {
    setSongDialogOpen(open);
    if (!open) {
      queue.forEach((item) => {
        if (item.audioUrl) URL.revokeObjectURL(item.audioUrl);
      });
      setQueue([]);
      setCurrentIndex(0);
      setSelectedAlbum("");
      setUndoStack([]);
      setCurrentPage(0);
      setSelectedCloud("imagekit");
    }
  };

  // ========================================================================
  // COMPUTED
  // ========================================================================

  const stats = useMemo(
    () => ({
      pending: queue.filter((q) => q.status === "pending").length,
      success: queue.filter((q) => q.status === "success").length,
      error: queue.filter((q) => q.status === "error").length,
      skipped: queue.filter((q) => q.status === "skipped").length,
      duplicates: queue.filter((q) => q.isDuplicate && q.status === "pending").length,
    }),
    [queue]
  );

  const totalPages = Math.ceil(queue.length / SONGS_PER_PAGE);

  const paginatedQueue = useMemo(() => {
    const start = currentPage * SONGS_PER_PAGE;
    return queue.slice(start, start + SONGS_PER_PAGE);
  }, [queue, currentPage]);

  const currentPageStats = useMemo(
    () => ({
      start: currentPage * SONGS_PER_PAGE + 1,
      end: Math.min((currentPage + 1) * SONGS_PER_PAGE, queue.length),
      pending: paginatedQueue.filter((q) => q.status === "pending").length,
      success: paginatedQueue.filter((q) => q.status === "success").length,
    }),
    [paginatedQueue, currentPage, queue.length]
  );

  const getGlobalIndex = (localIndex: number) => currentPage * SONGS_PER_PAGE + localIndex;

  const isFormValid =
    currentSong &&
    currentSong.audioFile &&
    currentSong.imageFile &&
    currentSong.metadata.title &&
    currentSong.metadata.artist &&
    currentSong.status === "pending" &&
    !currentSong.isDuplicate;

  const progressPercent =
    queue.length > 0 ? ((stats.success + stats.skipped) / queue.length) * 100 : 0;

  // ========================================================================
  // RENDER - MOBILE BLOCK
  // ========================================================================

  if (isMobile && songDialogOpen) {
    return (
      <Dialog open={songDialogOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button className="bg-violet-500 hover:bg-violet-600 text-white font-medium">
            <Plus className="mr-2 h-4 w-4" />
            Add Song
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-zinc-900 border-zinc-800 p-0 w-[95vw] max-w-md">
          <MobileBlockScreen />
        </DialogContent>
      </Dialog>
    );
  }

  // ========================================================================
  // RENDER - MAIN
  // ========================================================================

  return (
    <Dialog open={songDialogOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-violet-500 hover:bg-violet-600 text-white font-medium">
          <Plus className="mr-2 h-4 w-4" />
          Add Song
        </Button>
      </DialogTrigger>

      <DialogContent
        ref={dialogRef}
        className={cn(
          "bg-zinc-900 border-zinc-800 overflow-hidden flex flex-col p-0",
          "w-[95vw] max-w-4xl max-h-[90vh]",
          "sm:w-full"
        )}
      >
        {/* ============================================================ */}
        {/* HEADER */}
        {/* ============================================================ */}
        <div className="p-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div>
              <DialogTitle className="text-white text-lg">Add Songs</DialogTitle>
              <DialogDescription className="text-zinc-400 text-sm">
                Select folder or drop files
              </DialogDescription>
            </div>

            {isProcessing && processingProgress.total > 0 && (
              <div className="space-y-1 flex-1 mx-4">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Processing files...
                  </span>
                  <span>{processingProgress.current}/{processingProgress.total}</span>
                </div>
                <Progress value={(processingProgress.current / processingProgress.total) * 100} className="h-1" />
              </div>
            )}

            <div className="flex items-center gap-2">
              <KeyboardShortcutsHelp />
              <input
                ref={folderInputRef}
                type="file"
                // @ts-ignore
                webkitdirectory="true"
                directory="true"
                multiple
                className="hidden"
                onChange={handleFolderSelect}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => folderInputRef.current?.click()}
                disabled={isProcessing}
                className="border-zinc-700 mt-6 hover:bg-zinc-800"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FolderOpen className="w-4 h-4 mr-2" />
                )}
                Folder
              </Button>
            </div>
          </div>

          {/* Progress & Stats */}
          {queue.length > 0 && (
            <div className="space-y-2">
              <Progress value={progressPercent} className="h-1" />
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-zinc-400">
                  <span>{stats.pending} pending</span>
                  {stats.success > 0 && <span className="text-green-400">{stats.success} done</span>}
                  {stats.duplicates > 0 && <span className="text-amber-400">{stats.duplicates} duplicates</span>}
                  {stats.error > 0 && <span className="text-red-400">{stats.error} errors</span>}
                </div>

                <div className="flex items-center gap-2">
                  {undoStack.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={undo} className="h-6 px-2 text-xs text-zinc-400">
                      <Undo2 className="w-3 h-3 mr-1" />
                      Undo
                    </Button>
                  )}

                  {queue.length > 1 && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={goToPrev} disabled={currentIndex === 0}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-zinc-300 min-w-[50px] text-center">
                        {currentIndex + 1} / {queue.length}
                      </span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={goToNext} disabled={currentIndex === queue.length - 1}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* CONTENT */}
        {/* ============================================================ */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          {/* Queue Sidebar */}
          {queue.length > 1 && (
            <div className="shrink-0 border-r border-zinc-800 flex flex-col w-52">
              {totalPages > 1 && (
                <div className="p-2 border-b border-zinc-800 shrink-0">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                    <span>Page {currentPage + 1}/{totalPages}</span>
                    <span>{currentPageStats.start}-{currentPageStats.end} of {queue.length}</span>
                  </div>

                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0} className="flex-1 h-7 text-xs border-zinc-700">
                      <ChevronLeft className="w-3 h-3" /> Prev
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))} disabled={currentPage === totalPages - 1} className="flex-1 h-7 text-xs border-zinc-700">
                      Next <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>

                  {currentPageStats.pending > 0 && (
                    <Button size="sm" onClick={() => uploadPage(currentPage)} disabled={isLoading} className="w-full mt-2 h-7 text-xs bg-violet-600 hover:bg-violet-700">
                      <Upload className="w-3 h-3 mr-1" /> Upload Page ({currentPageStats.pending})
                    </Button>
                  )}
                </div>
              )}

              <ScrollArea className="flex-1 p-2">
                <div className="space-y-1">
                  {paginatedQueue.map((item, localIdx) => {
                    const globalIdx = getGlobalIndex(localIdx);
                    return (
                      <QueueItem
                        key={item.id}
                        item={item}
                        isActive={globalIdx === currentIndex}
                        onClick={() => setCurrentIndex(globalIdx)}
                        onRemove={() => removeFromQueue(item.id)}
                      />
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Main Form */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 max-w-2xl mx-auto">
              {/* Drop Zones */}
              <div className="grid grid-cols-2 gap-3">
                <DropZone
                  onFileDrop={handleAudioDrop}
                  accept="audio/*"
                  file={currentSong?.audioFile || null}
                  onClear={clearAudio}
                  icon={Music}
                  label="Audio"
                  sublabel="MP3, WAV, FLAC"
                  isLoading={isProcessing}
                  maxSize={MAX_AUDIO_SIZE_BYTES}
                />
                <DropZone
                  onFileDrop={handleImageDrop}
                  accept="image/*"
                  file={currentSong?.imageFile || null}
                  onClear={clearImage}
                  icon={ImageIcon}
                  label="Cover"
                  sublabel="JPG, PNG"
                  preview={currentSong?.imagePreview}
                  maxSize={MAX_IMAGE_SIZE_BYTES}
                />
              </div>

              {/* Cloud Provider */}
              <CloudProviderSelector
                selected={currentSong?.cloud || selectedCloud}
                onChange={(provider) => {
                  setSelectedCloud(provider);
                  if (currentSong) {
                    setQueue((prev) =>
                      prev.map((item, idx) =>
                        idx === currentIndex ? { ...item, cloud: provider } : item
                      )
                    );
                  }
                }}
              />

              {/* Audio Preview */}
              {currentSong && (
                <AudioPlayer
                  audioUrl={currentSong.audioUrl}
                  title={currentSong.metadata.title}
                  artist={currentSong.metadata.artist}
                  imageUrl={currentSong.imagePreview}
                />
              )}

              {/* Duplicate Warning */}
              {currentSong?.isDuplicate && currentSong.duplicateInfo && (
                <DuplicateWarning
                  duplicateInfo={currentSong.duplicateInfo}
                  onIgnore={ignoreDuplicate}
                  onSkip={skipCurrent}
                />
              )}

              {/* Duration */}
              {currentSong && currentSong.metadata.duration > 0 && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-zinc-800/50 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-xs text-zinc-300">{formatDuration(currentSong.metadata.duration)}</span>
                  <span className="text-xs text-zinc-500">•</span>
                  <span className="text-[10px] text-zinc-500 line-clamp-1 flex-1">{currentSong.originalFilename}</span>
                </div>
              )}

              {/* Searching Metadata */}
              {isSearchingMetadata && (
                <div className="flex items-center gap-2 p-2.5 bg-zinc-800/30 rounded-lg">
                  <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                  <span className="text-sm text-zinc-400">Searching music databases...</span>
                </div>
              )}

              {/* Metadata Results */}
              {currentSong && currentSong.metadataResults.length > 0 && !isSearchingMetadata && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      Results ({currentSong.metadataResults.length})
                    </p>
                    <span className="text-[10px] text-zinc-600">Click to select • Keys 1-5</span>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                    {currentSong.metadataResults.slice(0, 6).map((result, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => selectMetadataResult(index)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border transition-all",
                          currentSong.selectedMetadataIndex === index
                            ? "border-violet-500 bg-violet-500/10"
                            : result.warnings.length > 0 && result.confidence < 0.5
                            ? "border-red-500/30 bg-red-500/5 hover:bg-red-500/10"
                            : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                            currentSong.selectedMetadataIndex === index
                              ? "border-violet-500 bg-violet-500"
                              : "border-zinc-600"
                          )}>
                            {currentSong.selectedMetadataIndex === index && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-[10px] text-zinc-500 font-mono">#{index + 1}</span>
                              <ConfidenceBadge confidence={result.confidence} />
                              <SourceBadge source={result.source} />
                              {result.matchesFilename && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/20 text-green-400 shrink-0">
                                  <Check className="w-3 h-3" />
                                  Matches
                                </span>
                              )}
                            </div>

                            <p className="font-medium text-sm text-white line-clamp-1">{result.title}</p>
                            <p className="text-xs text-zinc-400 line-clamp-1">{result.artist}</p>

                            {result.originalArtist && (
                              <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">
                                Original: {result.originalArtist}
                              </p>
                            )}

                            {result.album && (
                              <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">
                                Album: {result.album}
                              </p>
                            )}

                            {result.warnings.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {result.warnings.map((warning, wIdx) => (
                                  <WarningBadge key={wIdx} warning={warning} />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Title Input */}
              {currentSong && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-300">Title</label>
                    {currentSong.metadata.title && currentSong.metadata.artist && (
                      <button type="button" onClick={swapArtistTitle} className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" />
                        Swap
                      </button>
                    )}
                  </div>
                  <Input
                    value={currentSong.metadata.title}
                    onChange={(e) => updateMetadata("title", e.target.value)}
                    placeholder="Song title"
                    className="h-9 bg-zinc-800 border-zinc-700 focus:border-violet-500 text-sm"
                  />
                </div>
              )}

              {/* Artist Input */}
              {currentSong && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-300">Artist</label>
                    <button
                      type="button"
                      onClick={handleManualSearch}
                      disabled={isSearchingMetadata || (!currentSong.metadata.title && !currentSong.metadata.artist)}
                      className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1 disabled:opacity-50"
                    >
                      {isSearchingMetadata ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                      Search
                    </button>
                  </div>
                  <Input
                    value={currentSong.metadata.artist}
                    onChange={(e) => updateMetadata("artist", e.target.value)}
                    placeholder="Artist name"
                    className="h-9 bg-zinc-800 border-zinc-700 focus:border-violet-500 text-sm"
                  />
                </div>
              )}

              {/* Genre, Mood & Language */}
              {currentSong && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300 flex items-center gap-1">
                      <Music className="w-3 h-3 text-violet-400" />
                      Genre
                    </label>
                    <Select value={currentSong.metadata.genre || "none"} onValueChange={(value) => updateMetadata("genre", value === "none" ? "" : value)}>
                      <SelectTrigger className="h-8 bg-zinc-800 border-zinc-700 text-xs">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 max-h-[200px]">
                        <SelectItem value="none"><span className="text-zinc-400">None</span></SelectItem>
                        {GENRE_OPTIONS.map((genre) => (
                          <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      Mood
                    </label>
                    <Select value={currentSong.metadata.mood || "none"} onValueChange={(value) => updateMetadata("mood", value === "none" ? "" : value)}>
                      <SelectTrigger className="h-8 bg-zinc-800 border-zinc-700 text-xs">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 max-h-[200px]">
                        <SelectItem value="none"><span className="text-zinc-400">None</span></SelectItem>
                        {MOOD_OPTIONS.map((mood) => (
                          <SelectItem key={mood} value={mood}>{mood}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300 flex items-center gap-1">
                      <Languages className="w-3 h-3 text-cyan-400" />
                      Language
                    </label>
                    <Select value={currentSong.metadata.language || "none"} onValueChange={(value) => updateMetadata("language", value === "none" ? "" : value)}>
                      <SelectTrigger className="h-8 bg-zinc-800 border-zinc-700 text-xs">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 max-h-[200px]">
                        <SelectItem value="none"><span className="text-zinc-400">None</span></SelectItem>
                        {LANGUAGE_OPTIONS.map((lang) => (
                          <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Album Selection */}
              <div className="space-y-1.5">
              {currentSong && currentSong.albumSuggestions.length > 0 && (
                <AlbumSuggestionChips
                  suggestions={currentSong.albumSuggestions}
                  selectedAlbum={currentSong.metadata.album || selectedAlbum}
                  onSelectAlbum={(albumId) => {
                    updateMetadata("album", albumId);
                    setSelectedAlbum(albumId);
                  }}
                />
              )}

                <label className="text-xs font-medium text-zinc-300">
                  Album <span className="text-zinc-500 font-normal">(Optional)</span>
                </label>

                {/* Recent Albums */}
                {recentAlbums.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {recentAlbums.map((album) => (
                      <button
                        key={album._id}
                        type="button"
                        onClick={() => {
                          if (currentSong) {
                            updateMetadata("album", currentSong.metadata.album === album._id ? "" : album._id);
                          }
                          setSelectedAlbum(album._id);
                        }}
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all",
                          currentSong?.metadata.album === album._id
                            ? "bg-violet-500 text-white"
                            : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                        )}
                      >
                        {album.imageUrl ? (
                          <img src={album.imageUrl} alt="" className="w-3.5 h-3.5 rounded object-cover" />
                        ) : (
                          <Music className="w-3 h-3" />
                        )}
                        <span className="line-clamp-1">{album.title}</span>
                        {currentSong?.metadata.album === album._id && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                )}

                {/* Album Dropdown */}
                <Select
                  value={currentSong?.metadata.album || selectedAlbum}
                  onValueChange={(value) => {
                    if (currentSong) updateMetadata("album", value);
                    setSelectedAlbum(value);
                  }}
                >
                  <SelectTrigger className="h-9 bg-zinc-800 border-zinc-700 text-sm">
                    <SelectValue placeholder="Select album" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 max-h-[180px]">
                    <SelectItem value="none">
                      <span className="text-zinc-400">No Album (Single)</span>
                    </SelectItem>
                    {albums.map((album) => (
                      <SelectItem key={album._id} value={album._id}>
                        <div className="flex items-center gap-2">
                          {album.imageUrl && (
                            <img src={album.imageUrl} alt="" className="w-4 h-4 rounded object-cover" />
                          )}
                          <span className="line-clamp-1">{album.title}</span>
                          <span className="text-zinc-500 text-xs line-clamp-1">• {album.artist}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Error Display */}
              {currentSong?.status === "error" && currentSong.error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2.5">
                  <p className="text-xs text-red-400 flex items-center gap-2">
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="line-clamp-2">{currentSong.error}</span>
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setQueue((prev) =>
                        prev.map((item, idx) =>
                          idx === currentIndex ? { ...item, status: "pending", error: undefined } : item
                        )
                      );
                    }}
                    className="mt-2 h-7 text-xs border-red-500/50 text-red-400 hover:bg-red-500/20"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                </div>
              )}

              {/* Success Display */}
              {currentSong?.status === "success" && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-300">Song Added!</p>
                  <p className="text-xs text-green-400/70 mt-1 line-clamp-1">
                    {currentSong.metadata.title} by {currentSong.metadata.artist}
                  </p>
                </div>
              )}

              {/* Skipped Display */}
              {currentSong?.status === "skipped" && (
                <div className="bg-zinc-700/30 border border-zinc-700/50 rounded-lg p-3 text-center">
                  <Ban className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-zinc-400">Skipped</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setQueue((prev) =>
                        prev.map((item, idx) =>
                          idx === currentIndex ? { ...item, status: "pending" } : item
                        )
                      );
                    }}
                    className="mt-2 h-7 text-xs border-zinc-600 text-zinc-400 hover:bg-zinc-700"
                  >
                    <Undo2 className="w-3 h-3 mr-1" />
                    Restore
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* ============================================================ */}
        {/* FOOTER */}
        {/* ============================================================ */}
        <DialogFooter className="p-4 border-t border-zinc-800 shrink-0 gap-2 flex-wrap">
          {stats.duplicates > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={skipAllDuplicates}
              className="mr-auto border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
            >
              <SkipForward className="w-4 h-4 mr-1" />
              Skip All Duplicates ({stats.duplicates})
            </Button>
          )}

          {stats.pending > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={uploadAll}
              disabled={isLoading}
              className="border-violet-500/50 text-violet-400 hover:bg-violet-500/20"
            >
              <Zap className="w-4 h-4 mr-1" />
              Upload All ({stats.pending - stats.duplicates})
            </Button>
          )}

          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
              className="border-zinc-700 hover:bg-zinc-800"
            >
              {stats.pending === 0 ? "Close" : "Cancel"}
            </Button>

            {currentSong && currentSong.status === "pending" && (
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !isFormValid}
                className={cn(
                  "min-w-[100px]",
                  isFormValid ? "bg-violet-500 hover:bg-violet-600" : "bg-zinc-700 text-zinc-400"
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Add
                    {stats.pending > 1 && (
                      <span className="ml-1 text-xs opacity-70">({stats.pending} left)</span>
                    )}
                  </>
                )}
              </Button>
            )}

            {currentSong && currentSong.status === "success" && stats.pending > 0 && (
              <Button onClick={goToNextPending} className="bg-green-600 hover:bg-green-700">
                <ChevronRight className="w-4 h-4 mr-1" />
                Next
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddSongDialog;