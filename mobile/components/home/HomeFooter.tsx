// components/home/HomeFooter.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Music2, Instagram, Twitter, Youtube, Github } from 'lucide-react-native';
import { COLORS, TIME_GRADIENTS, getTimeOfDay } from '@/constants/design';
import Colors from '@/constants/Colors';

export const HomeFooter = React.memo(() => {
  const BRAND_PURPLE = Colors.accent;

  const links = [
    { label: 'Premium', url: '#' },
    { label: 'Privacy', url: 'https://vibra-969f.onrender.com/privacy' },
    { label: 'Terms', url: 'https://vibra-969f.onrender.com/terms' },
    { label: 'About', url: 'https://vibra-969f.onrender.com/about' },
  ];

  const socials = [
    { icon: Instagram, url: 'https://www.instagram.com/alvy_shajan/' },
    { icon: Twitter, url: 'https://x.com/ShajanAlvy?t=rYldwMv9gdxLBo1iUKyk1Q&s=09' },
    { icon: Youtube, url: 'https://youtube.com/@alvyshajan56?si=6AyTKHFBl8s3hOUd' },
    { icon: Github, url: 'https://github.com/Alvy003' },
  ];

  const handlePress = (url: string) => {
    if (url === '#') return;
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

  return (
    <View style={styles.container}>
      {/* Static Brand Line */}
      <View style={[styles.glowLine]} />

      <View style={styles.mainContent}>
        {/* Branding Section */}
        <View style={styles.brandContainer}>
          <Text style={styles.brandText}>VIBRA</Text>
          <View style={[styles.brandDot, { backgroundColor: BRAND_PURPLE }]} />
        </View>

        <Text style={styles.tagline}>The future of music is here.</Text>

        {/* Links Grid */}
        <View style={styles.linksRow}>
          {links.map((link, i) => (
            <React.Fragment key={link.label}>
              <TouchableOpacity onPress={() => handlePress(link.url)}>
                <Text style={styles.linkText}>{link.label}</Text>
              </TouchableOpacity>
              {i < links.length - 1 && <View style={styles.linkDot} />}
            </React.Fragment>
          ))}
        </View>

        {/* Social Icons */}
        <View style={styles.socialsRow}>
          {socials.map((social, i) => (
            <TouchableOpacity
              key={i}
              style={styles.socialIcon}
              onPress={() => handlePress(social.url)}
            >
              <social.icon size={20} color={COLORS.textSecondary} strokeWidth={1.5} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom Credits */}
        {/* <View style={styles.bottomSection}>
          <Text style={styles.copyright}>© 2026 Vibra Music</Text>
          <View style={styles.versionContainer}>
            <Text style={styles.versionLabel}>Version</Text>
            <Text style={styles.versionValue}>1.0.1</Text>
          </View>
        </View> */}
      </View>
    </View>
  );
});

HomeFooter.displayName = 'HomeFooter';

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingBottom: 0,
    marginTop: 30,
    alignItems: 'center',
  },
  glowLine: {
    width: '100%',
    position: 'absolute',
    top: 0,
    borderTopWidth: 2,
  },
  mainContent: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  brandText: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 4,
    opacity: 0.9,
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
    marginLeft: 4,
  },
  tagline: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 32,
    letterSpacing: 0.3,
  },
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  linkText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  linkDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.surfaceLight,
  },
  socialsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 40,
  },
  socialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  bottomSection: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 2,
  },
  copyright: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  versionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  versionLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  versionValue: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
});