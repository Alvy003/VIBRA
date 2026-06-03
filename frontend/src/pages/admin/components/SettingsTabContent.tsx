import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useConfigStore } from "@/stores/useConfigStore";
import { useEffect, useState } from "react";
import { Save, Loader2, Download } from "lucide-react";
import { toast } from "react-hot-toast";

const SettingsTabContent = () => {
  const { config, fetchConfig, updateConfig, isLoading } = useConfigStore();
  const [apkLink, setApkLink] = useState("");
  const [currentVersion, setCurrentVersion] = useState("");
  const [forceUpdate, setForceUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (config) {
      setApkLink(config.apkLink);
      setCurrentVersion(config.currentVersion);
      setForceUpdate(config.forceUpdate);
    }
  }, [config]);

  const handleSave = async () => {
    if (!apkLink.trim()) {
      toast.error("APK Link cannot be empty");
      return;
    }
    if (!currentVersion.trim()) {
      toast.error("Current Version cannot be empty");
      return;
    }

    setIsUpdating(true);
    try {
      await updateConfig({ 
        apkLink, 
        currentVersion, 
        forceUpdate 
      });
      toast.success("System configuration updated!");
    } catch (error) {
      toast.error("Failed to update configuration");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-800/40 border-zinc-700/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download className="size-5 text-violet-500" />
              <CardTitle>App Distribution & Updates</CardTitle>
            </div>
            <Button 
                onClick={handleSave} 
                disabled={isUpdating || isLoading}
                className="bg-violet-600 hover:bg-violet-700 text-black font-semibold min-w-[100px]"
              >
                {isUpdating ? <Loader2 className="size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                Save Changes
            </Button>
          </div>
          <CardDescription className="text-zinc-400">
            Configure how Android users receive updates and download the APK.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="apk-link" className="text-sm font-medium text-zinc-300">Android APK Link</label>
              <Input
                id="apk-link"
                placeholder="https://github.com/..."
                value={apkLink}
                onChange={(e) => setApkLink(e.target.value)}
                className="bg-zinc-900/50 border-zinc-700 focus:ring-violet-500/50 transition-all font-mono text-sm"
              />
              <p className="text-[10px] text-zinc-500">Direct link to the latest .apk file or release page.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="current-version" className="text-sm font-medium text-zinc-300">Latest App Version</label>
              <Input
                id="current-version"
                placeholder="1.0.0"
                value={currentVersion}
                onChange={(e) => setCurrentVersion(e.target.value)}
                className="bg-zinc-900/50 border-zinc-700 focus:ring-violet-500/50 transition-all font-mono text-sm"
              />
              <p className="text-[10px] text-zinc-500">Should match the 'version' in mobile/app.json (e.g. 1.0.5).</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/30 border border-zinc-700/50">
            <div className="space-y-0.5">
              <h4 className="text-sm font-semibold text-zinc-200">Force Update</h4>
              <p className="text-xs text-zinc-500">Enable this to prevent users from using the app until they update.</p>
            </div>
            <button
                onClick={() => setForceUpdate(!forceUpdate)}
                className={`w-12 h-6 rounded-full transition-colors relative ${forceUpdate ? 'bg-violet-600' : 'bg-zinc-700'}`}
            >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${forceUpdate ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="p-4 rounded-lg bg-violet-500/5 border border-violet-500/10">
            <h4 className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-1">Mobile Behavior</h4>
            <p className="text-sm text-zinc-400">
              {forceUpdate 
                ? "Active: Users will see a non-dismissible full-screen overlay if their version is outdated."
                : "Active: Users will see a subtle top banner if a new update is available."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsTabContent;
