import { SystemConfig } from "../models/SystemConfig.model.js";

export const getConfig = async (req, res, next) => {
  try {
    let config = await SystemConfig.findOne();
    if (!config) {
      // Create default if not exists
      config = await SystemConfig.create({});
    }
    res.json(config);
  } catch (error) {
    next(error);
  }
};

export const updateConfig = async (req, res, next) => {
  try {
    const { apkLink, currentVersion, maintenanceMode, forceUpdate } = req.body;
    
    let config = await SystemConfig.findOne();
    if (!config) {
      config = new SystemConfig();
    }

    if (apkLink !== undefined) config.apkLink = apkLink;
    if (currentVersion !== undefined) config.currentVersion = currentVersion;
    if (maintenanceMode !== undefined) config.maintenanceMode = maintenanceMode;
    if (forceUpdate !== undefined) config.forceUpdate = forceUpdate;
    
    config.updatedBy = req.auth?.userId || "Admin";

    await config.save();
    res.json(config);
  } catch (error) {
    next(error);
  }
};
