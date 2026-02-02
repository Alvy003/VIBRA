// lib/clerk-theme.ts
import { dark } from "@clerk/themes";

export const clerkAppearance = {
  baseTheme: dark,
  elements: {
    rootBox: { zIndex: 40 },
    card: {
      backgroundColor: "#18181b",
      border: "1px solid #27272a",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
    },
    userButtonBox: { 
      padding: "0",
    },
    // ✅ Clean avatar - no border
    avatarBox: {
      width: "2rem",
      height: "2rem",
      border: "none",
    },
    userButtonOuterIdentifier: { color: "#ffffff", fontWeight: "600" },
    userButtonInnerIdentifier: { color: "#a1a1aa", fontSize: "0.875rem" },
    userPreviewMainIdentifier: { color: "#ffffff", fontWeight: "600" },
    userPreviewSecondaryIdentifier: { color: "#a1a1aa" },
    userButtonPopoverCard: {
      backgroundColor: "#18181b",
      border: "1px solid #27272a",
    },
    userButtonPopoverActionButton: {
      color: "#d4d4d8",
      backgroundColor: "transparent",
      "&:hover": {
        backgroundColor: "#27272a",
        color: "#ffffff",
      },
    },
    userButtonPopoverActionButtonIcon: { color: "#a1a1aa" },
    userButtonPopoverActionButtonText: { color: "#d4d4d8" },
    userButtonPopoverFooter: {
      backgroundColor: "#09090b",
      borderTop: "1px solid #27272a",
      padding: "0.75rem 1rem",
    },
    divider: { backgroundColor: "#27272a" },
    badge: { backgroundColor: "#7c3aed", color: "#ffffff" },
    menuItem: {
      color: "#d4d4d8",
      "&:hover": { backgroundColor: "#27272a", color: "#ffffff" },
    },
    menuItemButton: { "&:hover": { backgroundColor: "#27272a" } },
    profileSection: { borderBottom: "1px solid #27272a" },
    profileSectionPrimaryButton: {
      color: "#7c3aed",
      "&:hover": { color: "#8b5cf6" },
    },
    formFieldInput: {
      backgroundColor: "#27272a",
      borderColor: "#3f3f46",
      color: "#ffffff",
      "&:focus": {
        borderColor: "#7c3aed",
        boxShadow: "0 0 0 1px #7c3aed",
      },
    },
    formFieldLabel: { color: "#d4d4d8" },
    formButtonPrimary: {
      backgroundColor: "#7c3aed",
      color: "#ffffff",
      "&:hover": { backgroundColor: "#8b5cf6" },
    },
    formButtonReset: {
      color: "#d4d4d8",
      "&:hover": { backgroundColor: "#27272a" },
    },
    page: { backgroundColor: "#09090b" },
    navbar: {
      backgroundColor: "#18181b",
      borderBottom: "1px solid #27272a",
    },
    navbarButton: {
      color: "#d4d4d8",
      "&:hover": { backgroundColor: "#27272a" },
    },
    scrollBox: {
      "&::-webkit-scrollbar": { width: "6px" },
      "&::-webkit-scrollbar-track": { backgroundColor: "#18181b" },
      "&::-webkit-scrollbar-thumb": {
        backgroundColor: "#3f3f46",
        borderRadius: "3px",
      },
      "&::-webkit-scrollbar-thumb:hover": { backgroundColor: "#52525b" },
    },
  },
};