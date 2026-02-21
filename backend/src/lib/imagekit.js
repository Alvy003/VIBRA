import ImageKit from "imagekit";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import crypto from "crypto";

dotenv.config();

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

/**
 * Generate a unique filename to avoid collisions
 */
const generateFilename = (originalFilename) => {
  const ext = path.extname(originalFilename).toLowerCase();
  const safeName = path
    .basename(originalFilename, ext)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .substring(0, 50);
  const hash = crypto.randomBytes(6).toString("hex");
  const timestamp = Date.now();

  return `${timestamp}-${hash}-${safeName}${ext}`;
};

/**
 * Upload a file to ImageKit
 * @param {object} file - express-fileupload file object (has tempFilePath, name)
 * @param {string} folder - "/music/audio" | "/music/images"
 * @returns {string} public URL of the uploaded file
 */
export const uploadToImageKit = async (file, folder = "/music/audio") => {
  try {
    const fileBuffer = fs.readFileSync(file.tempFilePath);
    const fileName = generateFilename(file.name);

    const response = await imagekit.upload({
      file: fileBuffer,
      fileName: fileName,
      folder: folder,
      useUniqueFileName: false, // We already handle uniqueness
    });

    return response.url;
  } catch (error) {
    console.error("Error uploading to ImageKit:", error);
    throw new Error(`Error uploading to ImageKit: ${error.message}`);
  }
};

/**
 * Delete a file from ImageKit
 * @param {string} fileUrl - the full public URL of the file
 * @returns {boolean} success
 */
export const deleteFromImageKit = async (fileUrl) => {
  try {
    if (!fileUrl || !isImageKitUrl(fileUrl)) {
      return false;
    }

    // We need the fileId to delete from ImageKit
    // Extract the file path from URL and search for it
    const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
    const filePath = fileUrl.replace(urlEndpoint, "");

    // Search for the file by path
    const files = await imagekit.listFiles({
      searchQuery: `name = "${path.basename(filePath)}"`,
      limit: 1,
    });

    if (files.length > 0) {
      await imagekit.deleteFile(files[0].fileId);
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error deleting from ImageKit:", error);
    return false;
  }
};

/**
 * Check if a URL is an ImageKit URL
 */
export const isImageKitUrl = (url) => {
  if (!url || !process.env.IMAGEKIT_URL_ENDPOINT) return false;
  return url.startsWith(process.env.IMAGEKIT_URL_ENDPOINT) || 
         url.includes("ik.imagekit.io");
};

export default imagekit;