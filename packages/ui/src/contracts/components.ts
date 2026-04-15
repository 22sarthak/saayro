import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import type { ConfidenceLabel, ConnectedAccount, ConnectedTravelItem, ExportPack, ItineraryStop, RoutePreview } from "@saayro/types";
import type { SurfaceTone } from "../utils/styles.js";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive-light";
export type BadgeVariant = "status" | "confidence" | "connected" | "premium";
export type CardVariant = "trip" | "travel" | "export" | "connected";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  tone?: SurfaceTone;
  confidence?: ConfidenceLabel;
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  surface?: SurfaceTone;
}

export interface SectionHeaderProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionSlot?: ReactNode;
}

export interface ChipOption {
  id: string;
  label: string;
  active?: boolean;
}

export interface TimelineItemProps {
  stop: ItineraryStop;
}

export interface RoutePreviewProps {
  route: RoutePreview;
  ctaLabel?: string;
}

export interface ExportTileProps {
  pack: ExportPack;
}

export interface ConnectedSourceTileProps {
  account: ConnectedAccount;
  itemCount?: number;
}

export interface ConnectedTravelCardProps {
  item: ConnectedTravelItem;
}

