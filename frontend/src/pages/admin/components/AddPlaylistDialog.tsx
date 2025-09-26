import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { axiosInstance } from "@/lib/axios";
import { Plus, Upload } from "lucide-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";

const AddPlaylistDialog = () => {
  const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newPlaylist, setNewPlaylist] = useState({
    name: "",
    description: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      if (!newPlaylist.name.trim()) {
        return toast.error("Playlist name is required");
      }

      const formData = new FormData();
      formData.append("name", newPlaylist.name);
      if (newPlaylist.description) {
        formData.append("description", newPlaylist.description);
      }
      if (imageFile) {
        formData.append("imageFile", imageFile);
      }

      await axiosInstance.post("/admin/playlists", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setNewPlaylist({ name: "", description: "" });
      setImageFile(null);
      setPlaylistDialogOpen(false);
      toast.success("Playlist created successfully");
    } catch (error: any) {
      toast.error("Failed to create playlist: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={playlistDialogOpen} onOpenChange={setPlaylistDialogOpen}>
      <DialogTrigger asChild>
        <Button className="bg-violet-500 hover:bg-violet-600 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Add Playlist
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-700">
        <DialogHeader>
          <DialogTitle>Add New Playlist</DialogTitle>
          <DialogDescription>
            Create a new playlist and optionally upload cover art
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />

          {/* Image upload box */}
          <div
            className="flex items-center justify-center p-6 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-center">
              <div className="p-3 bg-zinc-800 rounded-full inline-block mb-2">
                <Upload className="h-6 w-6 text-zinc-400" />
              </div>
              <div className="text-sm text-zinc-400 mb-2">
                {imageFile ? imageFile.name : "Upload playlist cover"}
              </div>
              <Button variant="outline" size="sm" className="text-xs">
                Choose File
              </Button>
            </div>
          </div>

          {/* Playlist name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Playlist Name</label>
            <Input
              value={newPlaylist.name}
              onChange={(e) =>
                setNewPlaylist({ ...newPlaylist, name: e.target.value })
              }
              className="bg-zinc-800 border-zinc-700"
              placeholder="Enter playlist name"
            />
          </div>

          {/* Playlist description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input
              value={newPlaylist.description}
              onChange={(e) =>
                setNewPlaylist({ ...newPlaylist, description: e.target.value })
              }
              className="bg-zinc-800 border-zinc-700"
              placeholder="Enter description (optional)"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setPlaylistDialogOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-violet-500 hover:bg-violet-600"
            disabled={isLoading || !newPlaylist.name}
          >
            {isLoading ? "Creating..." : "Add Playlist"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddPlaylistDialog;
