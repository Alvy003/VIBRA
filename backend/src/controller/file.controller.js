// controller/file.controller.js - Alternative without uuid package
import path from "path";
import fs from "fs";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "files");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Generate unique ID without uuid package
const generateUniqueId = () => crypto.randomUUID();

// Allowed file types
const ALLOWED_TYPES = {
  // Images
  'image/jpeg': { ext: '.jpg', category: 'image' },
  'image/png': { ext: '.png', category: 'image' },
  'image/gif': { ext: '.gif', category: 'image' },
  'image/webp': { ext: '.webp', category: 'image' },
  // Documents
  'application/pdf': { ext: '.pdf', category: 'document' },
  'application/msword': { ext: '.doc', category: 'document' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: '.docx', category: 'document' },
  'application/vnd.ms-excel': { ext: '.xls', category: 'document' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: '.xlsx', category: 'document' },
  'text/plain': { ext: '.txt', category: 'document' },
  // Audio
  'audio/mpeg': { ext: '.mp3', category: 'audio' },
  'audio/wav': { ext: '.wav', category: 'audio' },
  'audio/ogg': { ext: '.ogg', category: 'audio' },
  'audio/webm': { ext: '.webm', category: 'audio' },
  // Video
  'video/mp4': { ext: '.mp4', category: 'video' },
  'video/webm': { ext: '.webm', category: 'video' },
  'video/quicktime': { ext: '.mov', category: 'video' },
};

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

export const uploadFiles = async (req, res) => {
  try {
    if (!req.files || !req.files.files) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    let files = req.files.files;
    if (!Array.isArray(files)) {
      files = [files];
    }

    if (files.length > MAX_FILES) {
      return res.status(400).json({ error: `Maximum ${MAX_FILES} files allowed` });
    }

    const uploadedFiles = [];
    const errors = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large (max 10MB)`);
        continue;
      }

      const typeInfo = ALLOWED_TYPES[file.mimetype];
      if (!typeInfo) {
        errors.push(`${file.name}: File type not allowed`);
        continue;
      }

      // Use crypto.randomUUID() instead of uuid
      const uniqueName = `${generateUniqueId()}${typeInfo.ext}`;
      const filePath = path.join(UPLOAD_DIR, uniqueName);

      try {
        await file.mv(filePath);

        uploadedFiles.push({
          url: `/uploads/files/${uniqueName}`,
          filename: file.name,
          mimetype: file.mimetype,
          size: file.size,
          category: typeInfo.category,
        });
      } catch (moveError) {
        console.error(`Failed to move file ${file.name}:`, moveError);
        errors.push(`${file.name}: Upload failed`);
      }
    }

    if (uploadedFiles.length === 0) {
      return res.status(400).json({ 
        error: "No files were uploaded successfully",
        details: errors 
      });
    }

    res.status(200).json({ 
      files: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({ error: "Failed to upload files" });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const { filename } = req.params;
    
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: "Invalid filename" });
    }

    const filePath = path.join(UPLOAD_DIR, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.status(200).json({ message: "File deleted" });
    } else {
      res.status(404).json({ error: "File not found" });
    }
  } catch (error) {
    console.error("File delete error:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
};