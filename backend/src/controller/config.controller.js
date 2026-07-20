import { SystemConfig } from "../models/SystemConfig.model.js";
import { getCache, setCache } from "../lib/cacheService.js";

const CONFIG_CACHE_KEY = "system_config:v1";

export const getConfig = async (req, res, next) => {
  try {
    const cachedConfig = await getCache(CONFIG_CACHE_KEY);
    if (cachedConfig) {
      return res.json(cachedConfig);
    }

    let config = await SystemConfig.findOne().lean();
    if (!config) {
      // Create default if not exists
      const newDoc = await SystemConfig.create({});
      config = newDoc.toObject();
    }
    
    // Cache indefinitely
    await setCache(CONFIG_CACHE_KEY, config, 0);
    
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

    const plainConfig = config.toObject();

    // Immediately update Redis cache
    await setCache(CONFIG_CACHE_KEY, plainConfig, 0);

    res.json(plainConfig);
  } catch (error) {
    next(error);
  }
};
