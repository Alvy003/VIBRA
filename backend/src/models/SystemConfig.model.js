import mongoose from "mongoose";

const systemConfigSchema = new mongoose.Schema(
  {
    apkLink: {
      type: String,
      default: "https://github.com/Alvy003/VIBRA/releases/download/v-1.0.0/com.vibra.mobile.apk",
    },
    currentVersion: {
      type: String,
      default: "1.0.0",
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    forceUpdate: {
      type: Boolean,
      default: false,
    },
    updatedBy: {
      type: String,
      default: "System",
    },
  },
  { timestamps: true }
);

export const SystemConfig = mongoose.model("SystemConfig", systemConfigSchema);
