import React from "react";
import {
  Globe,
  Shield,
  Cloud,
  Code,
  Terminal,
  CreditCard,
  Building,
  KeyRound,
  Server,
  Cpu,
  Lock,
  Layers,
  Sparkles,
} from "lucide-react";
import { CategoryId } from "../types";
import { CATEGORIES } from "../data/initialData";

interface BrandIconProps {
  brand?: string;
  categoryId: CategoryId;
  size?: number;
  className?: string;
}

export const BrandIcon: React.FC<BrandIconProps> = ({
  brand = "",
  categoryId,
  size = 20,
  className = "",
}) => {
  // Find category for low-saturation background tint
  const cat = CATEGORIES.find((c) => c.id === categoryId) || CATEGORIES[0];

  const brandLower = brand.toLowerCase();

  // Render unified, recognizable linear brand or domain icon
  const renderIcon = () => {
    if (brandLower.includes("google")) {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 1 0 10 10 10.38 10.38 0 0 0-.1-1.6H12v3.2h5.7A5.4 5.4 0 1 1 12 7.2a5.3 5.3 0 0 1 3.7 1.4l2.3-2.3A8.6 8.6 0 0 0 12 2z" />
        </svg>
      );
    }
    if (brandLower.includes("github")) {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
          <path d="M9 18c-4.51 2-5-2-7-2" />
        </svg>
      );
    }
    if (brandLower.includes("aws") || brandLower.includes("amazon")) {
      return <Server size={size} strokeWidth={2} />;
    }
    if (brandLower.includes("stripe") || brandLower.includes("bank") || brandLower.includes("payment")) {
      return <CreditCard size={size} strokeWidth={2} />;
    }
    if (brandLower.includes("binance") || brandLower.includes("crypto")) {
      return <Layers size={size} strokeWidth={2} />;
    }
    if (brandLower.includes("vercel") || brandLower.includes("next")) {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 3 10 18H2L12 3z" />
        </svg>
      );
    }
    if (brandLower.includes("cloudflare")) {
      return <Server size={size} strokeWidth={2} />;
    }
    if (brandLower.includes("discord")) {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6h0a14.5 14.5 0 0 0-4-1.25 10 10 0 0 0-.5 1A13.8 13.8 0 0 0 10.5 5.75a10 10 0 0 0-.5-1A14.5 14.5 0 0 0 6 6a15.8 15.8 0 0 0-3 11 14.5 14.5 0 0 0 4.5 2.25 10.4 10.4 0 0 0 1-1.5 9.3 9.3 0 0 1-1.5-.75l.25-.25a10.6 10.6 0 0 0 9.5 0l.25.25a9.3 9.3 0 0 1-1.5.75 10.4 10.4 0 0 0 1 1.5A14.5 14.5 0 0 0 21 17a15.8 15.8 0 0 0-3-11z" />
          <circle cx="9" cy="12" r="1" />
          <circle cx="15" cy="12" r="1" />
        </svg>
      );
    }
    if (brandLower.includes("notion")) {
      return <Code size={size} strokeWidth={2} />;
    }
    if (brandLower.includes("apple")) {
      return <Cpu size={size} strokeWidth={2} />;
    }
    if (brandLower.includes("microsoft")) {
      return <Building size={size} strokeWidth={2} />;
    }

    // Category fallbacks
    switch (categoryId) {
      case "work":
        return <Building size={size} strokeWidth={2} />;
      case "cloud":
        return <Server size={size} strokeWidth={2} />;
      case "finance":
        return <CreditCard size={size} strokeWidth={2} />;
      case "dev":
        return <Terminal size={size} strokeWidth={2} />;
      case "personal":
        return <KeyRound size={size} strokeWidth={2} />;
      default:
        return <Shield size={size} strokeWidth={2} />;
    }
  };

  return (
    <div
      className={`sa-brand-icon sa-brand-icon--${categoryId} inline-flex items-center justify-center p-2 rounded-sm shrink-0 border ${cat.bgLight} ${className}`}
    >
      {renderIcon()}
    </div>
  );
};
