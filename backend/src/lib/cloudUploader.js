import cloudinary from "./cloudinary.js";
import { uploadToImageKit, deleteFromImageKit, isImageKitUrl } from "./imagekit.js";

/**
 * Supported cloud providers
 */
export const CLOUD_PROVIDERS = {
  CLOUDINARY: "cloudinary",
  IMAGEKIT: "imagekit",
};

/**
 * Upload a file to the specified cloud provider
 * @param {object} file - express-fileupload file object
 * @param {string} provider - "cloudinary" | "imagekit"
 * @param {string} folder - folder path for ImageKit
 * @returns {{ url: string, provider: string }}
 */
export const uploadFile = async (file, provider = "cloudinary", folder = "/music/audio") => {
  switch (provider) {
    case CLOUD_PROVIDERS.IMAGEKIT: {
      const url = await uploadToImageKit(file, folder);
      return { url, provider: CLOUD_PROVIDERS.IMAGEKIT };
    }

    case CLOUD_PROVIDERS.CLOUDINARY:
    default: {
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        resource_type: "auto",
      });
      return { url: result.secure_url, provider: CLOUD_PROVIDERS.CLOUDINARY };
    }
  }
};

/**
 * Upload audio file to the specified provider
 */
export const uploadAudio = async (file, provider = "cloudinary") => {
  return uploadFile(file, provider, "/music/audio");
};

/**
 * Upload image file to the specified provider
 */
export const uploadImage = async (file, provider = "cloudinary") => {
  return uploadFile(file, provider, "/music/images");
};

/**
 * Delete a file from the appropriate cloud based on its URL
 * Auto-detects which cloud the file belongs to
 */
export const deleteFile = async (fileUrl) => {
  if (!fileUrl) return;

  try {
    if (isImageKitUrl(fileUrl)) {
      await deleteFromImageKit(fileUrl);
    } else if (fileUrl.includes("cloudinary")) {
      // Extract public_id from Cloudinary URL
      const parts = fileUrl.split("/");
      const filenameWithExt = parts[parts.length - 1];
      const publicId = filenameWithExt.split(".")[0];

      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
      } catch {
        try {
          await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
        } catch {
          // Silent fail - file might already be deleted
        }
      }
    }
  } catch (error) {
    console.error("Error deleting file:", error);
    // Don't throw - deletion failure shouldn't break the flow
  }
};

/**
 * Validate provider string
 */
export const isValidProvider = (provider) => {
  return Object.values(CLOUD_PROVIDERS).includes(provider);
};

/**
 * Get default provider (can be set via env)
 */
export const getDefaultProvider = () => {
  return process.env.DEFAULT_CLOUD_PROVIDER || CLOUD_PROVIDERS.CLOUDINARY;
};