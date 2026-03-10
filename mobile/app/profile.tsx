import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Platform } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser, useClerk } from '@clerk/clerk-expo';
import {
    ChevronLeft,
    ChevronRight,
    User,
    Settings,
    Shield,
    Globe,
    MessageSquare,
    HardDrive,
    LogOut,
    Bell,
    HelpCircle,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
    const { user } = useUser();
    const { signOut } = useClerk();
    const router = useRouter();

    const handleSignOut = async () => {
        try {
            await signOut();
            router.replace('/(auth)/login' as any);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    if (!user) return null;

    const SettingItem = ({ icon: Icon, label, description, onPress, color = "#9333ea", showChevron = true }: any) => (
        <TouchableOpacity
            onPress={onPress}
            className="flex-row items-center px-4 py-4 rounded-2xl bg-zinc-900/40 mb-3 border border-white/5 active:bg-zinc-800/60"
        >
            <View className="w-10 h-10 rounded-xl items-center justify-center mr-4" style={{ backgroundColor: `${color}15` }}>
                <Icon size={20} color={color} />
            </View>
            <View className="flex-1">
                <Text className="text-white font-semibold text-base">{label}</Text>
                {description && <Text className="text-zinc-500 text-xs mt-0.5">{description}</Text>}
            </View>
            {showChevron && <ChevronRight size={18} color="#71717a" />}
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 bg-zinc-950">
            {/* Background Gradients */}
            <LinearGradient
                colors={['#1e1b4b', '#09090b']}
                className="absolute inset-0"
                style={{ opacity: 0.4 }}
            />

            <SafeAreaView className="flex-1">
                {/* Header */}
                <View className="flex-row items-center justify-between px-6 py-4">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 items-center justify-center rounded-full bg-white/5 border border-white/10"
                    >
                        <ChevronLeft size={24} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white text-lg font-bold">Settings</Text>
                    <View className="w-10" />
                </View>

                <ScrollView
                    className="flex-1 px-4"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40 }}
                >
                    {/* Profile Header */}
                    <View className="items-center py-8">
                        <View className="relative">
                            <Image
                                source={user.imageUrl}
                                className="w-24 h-24 rounded-full border-4 border-purple-500/20 shadow-2xl"
                                contentFit="cover"
                                transition={200}
                            />
                            <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-purple-600 border-4 border-zinc-950 items-center justify-center">
                                <User size={14} color="white" fill="white" />
                            </View>
                        </View>
                        <Text className="text-white text-2xl font-bold mt-4">{user.fullName || "User"}</Text>
                        <Text className="text-zinc-500 text-sm mt-1">{user.primaryEmailAddress?.emailAddress}</Text>
                    </View>

                    {/* Account Section */}
                    <View className="mb-8">
                        <Text className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4 px-2">Account</Text>
                        <SettingItem
                            icon={Settings}
                            label="Manage Account"
                            description="Update your profile and details"
                            color="#9333ea"
                        />
                        <SettingItem
                            icon={Shield}
                            label="Security & Privacy"
                            description="Manage your security settings"
                            color="#3b82f6"
                        />
                    </View>

                    {/* Preferences & App */}
                    <View className="mb-8">
                        <Text className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4 px-2">App & Preferences</Text>
                        <SettingItem
                            icon={Globe}
                            label="Music Languages"
                            description="Hindi, English, Punjabi..."
                            color="#f59e0b"
                        />
                        <SettingItem
                            icon={HardDrive}
                            label="Storage & Cache"
                            description="Manage downloads and cache"
                            color="#10b981"
                        />
                        <SettingItem
                            icon={Bell}
                            label="Notifications"
                            description="Manage app notifications"
                            color="#ef4444"
                        />
                    </View>

                    {/* Support & Legal */}
                    <View className="mb-10">
                        <Text className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4 px-2">Support</Text>
                        <SettingItem
                            icon={HelpCircle}
                            label="Help & FAQ"
                            color="#a78bfa"
                        />
                        <SettingItem
                            icon={MessageSquare}
                            label="Contact Support"
                            color="#a78bfa"
                        />
                    </View>

                    {/* Logout Button */}
                    <TouchableOpacity
                        onPress={handleSignOut}
                        className="flex-row items-center justify-center p-4 rounded-2xl bg-red-500/10 border border-red-500/20 active:bg-red-500/20"
                    >
                        <LogOut size={20} color="#ef4444" />
                        <Text className="text-red-500 font-bold ml-3">Sign Out</Text>
                    </TouchableOpacity>

                    {/* Version Info */}
                    <View className="mt-10 items-center">
                        <Text className="text-zinc-600 text-xs font-medium">Vibra Mobile v1.0.0</Text>
                        <Text className="text-zinc-700 text-[10px] mt-1">Inspired by Vibra Web Experience</Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
