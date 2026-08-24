import React from 'react';

export type PixelIconName =
  | 'sword'
  | 'anvil'
  | 'hammer'
  | 'dungeon'
  | 'skull'
  | 'rune'
  | 'blacksmith'
  | 'codex'
  | 'shop'
  | 'trophy'
  | 'gold'
  | 'diamond'
  | 'stone'
  | 'scroll'
  | 'potion'
  | 'shard'
  | 'fire'
  | 'ice'
  | 'lightning'
  | 'holy'
  | 'dark'
  | 'none'
  | 'shield'
  | 'crown'
  | 'heart'
  | 'sparkle'
  | 'check'
  | 'cross'
  | 'arrowUp'
  | 'arrowDown'
  | 'lock'
  | 'knight'
  | 'box';

interface PixelIconProps {
  name: PixelIconName;
  size?: number;
  className?: string;
}

export const PixelIcon: React.FC<PixelIconProps> = ({ name, size = 16, className = '' }) => {
  const renderIcon = () => {
    switch (name) {
      case 'sword':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            {/* Blade */}
            <rect x="12" y="1" width="2" height="2" fill="#e2e8f0" />
            <rect x="13" y="2" width="2" height="2" fill="#ffffff" />
            <rect x="11" y="2" width="2" height="2" fill="#94a3b8" />
            <rect x="10" y="3" width="2" height="2" fill="#cbd5e1" />
            <rect x="9" y="4" width="2" height="2" fill="#ffffff" />
            <rect x="8" y="5" width="2" height="2" fill="#cbd5e1" />
            <rect x="7" y="6" width="2" height="2" fill="#94a3b8" />
            <rect x="6" y="7" width="2" height="2" fill="#ffffff" />
            <rect x="5" y="8" width="2" height="2" fill="#cbd5e1" />
            {/* Guard */}
            <rect x="3" y="8" width="2" height="2" fill="#f59e0b" />
            <rect x="4" y="9" width="3" height="2" fill="#d97706" />
            <rect x="7" y="10" width="2" height="2" fill="#f59e0b" />
            {/* Hilt */}
            <rect x="3" y="10" width="2" height="2" fill="#78350f" />
            <rect x="2" y="11" width="2" height="2" fill="#451a03" />
            {/* Pommel */}
            <rect x="1" y="12" width="2" height="2" fill="#f59e0b" />
          </svg>
        );

      case 'anvil':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            <rect x="2" y="4" width="12" height="3" fill="#64748b" />
            <rect x="2" y="4" width="10" height="1" fill="#94a3b8" />
            <rect x="1" y="4" width="2" height="2" fill="#cbd5e1" />
            <rect x="13" y="4" width="2" height="1" fill="#475569" />
            <rect x="5" y="7" width="6" height="3" fill="#475569" />
            <rect x="3" y="10" width="10" height="3" fill="#334155" />
            <rect x="2" y="12" width="12" height="2" fill="#1e293b" />
            <rect x="4" y="10" width="8" height="1" fill="#64748b" />
          </svg>
        );

      case 'hammer':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            {/* Head */}
            <rect x="9" y="2" width="5" height="4" fill="#94a3b8" />
            <rect x="8" y="1" width="2" height="6" fill="#cbd5e1" />
            <rect x="13" y="1" width="2" height="6" fill="#475569" />
            <rect x="9" y="2" width="4" height="1" fill="#ffffff" />
            {/* Handle */}
            <rect x="7" y="6" width="3" height="2" fill="#b45309" />
            <rect x="5" y="8" width="3" height="2" fill="#92400e" />
            <rect x="3" y="10" width="3" height="2" fill="#b45309" />
            <rect x="1" y="12" width="3" height="3" fill="#78350f" />
          </svg>
        );

      case 'dungeon':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            <rect x="1" y="2" width="14" height="12" fill="#334155" />
            <rect x="2" y="1" width="12" height="2" fill="#475569" />
            <rect x="1" y="1" width="2" height="2" fill="#64748b" />
            <rect x="13" y="1" width="2" height="2" fill="#64748b" />
            {/* Archway gate */}
            <rect x="4" y="5" width="8" height="9" fill="#0f172a" />
            <rect x="5" y="4" width="6" height="2" fill="#0f172a" />
            {/* Iron Bars */}
            <rect x="5" y="6" width="1" height="8" fill="#94a3b8" />
            <rect x="7" y="6" width="1" height="8" fill="#94a3b8" />
            <rect x="9" y="6" width="1" height="8" fill="#94a3b8" />
            <rect x="11" y="6" width="1" height="8" fill="#94a3b8" />
            {/* Torch glow */}
            <rect x="2" y="6" width="1" height="2" fill="#f97316" />
            <rect x="13" y="6" width="1" height="2" fill="#f97316" />
          </svg>
        );

      case 'skull':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            <rect x="4" y="2" width="8" height="7" fill="#f1f5f9" />
            <rect x="3" y="3" width="10" height="5" fill="#f1f5f9" />
            {/* Eyes */}
            <rect x="4" y="5" width="2" height="2" fill="#0f172a" />
            <rect x="10" y="5" width="2" height="2" fill="#0f172a" />
            {/* Nose */}
            <rect x="7" y="7" width="2" height="2" fill="#334155" />
            {/* Teeth / Jaw */}
            <rect x="5" y="10" width="6" height="3" fill="#e2e8f0" />
            <rect x="6" y="11" width="1" height="2" fill="#0f172a" />
            <rect x="8" y="11" width="1" height="2" fill="#0f172a" />
            <rect x="10" y="11" width="1" height="2" fill="#0f172a" />
          </svg>
        );

      case 'rune':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            <rect x="4" y="2" width="8" height="12" fill="#06b6d4" />
            <rect x="2" y="4" width="12" height="8" fill="#0891b2" />
            <rect x="5" y="1" width="6" height="14" fill="#22d3ee" />
            {/* Rune Sigil inside */}
            <rect x="7" y="4" width="2" height="8" fill="#ecfeff" />
            <rect x="5" y="6" width="6" height="2" fill="#ecfeff" />
            <rect x="5" y="9" width="6" height="2" fill="#ecfeff" />
          </svg>
        );

      case 'blacksmith':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            {/* Furnace Fire */}
            <rect x="2" y="2" width="12" height="12" fill="#451a03" />
            <rect x="3" y="3" width="10" height="10" fill="#78350f" />
            <rect x="4" y="5" width="8" height="7" fill="#1c1917" />
            <rect x="6" y="7" width="4" height="4" fill="#ea580c" />
            <rect x="7" y="8" width="2" height="3" fill="#facc15" />
            {/* Chimney */}
            <rect x="5" y="0" width="6" height="2" fill="#78350f" />
          </svg>
        );

      case 'codex':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            <rect x="2" y="2" width="11" height="12" fill="#854d0e" />
            <rect x="3" y="1" width="11" height="12" fill="#a16207" />
            <rect x="4" y="2" width="9" height="10" fill="#fef08a" />
            {/* Spine */}
            <rect x="2" y="1" width="2" height="13" fill="#713f12" />
            {/* Bookmark ribbon */}
            <rect x="8" y="2" width="2" height="11" fill="#ef4444" />
            <rect x="7" y="12" width="4" height="1" fill="#dc2626" />
          </svg>
        );

      case 'shop':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            {/* Awning stripes */}
            <rect x="1" y="2" width="3" height="4" fill="#dc2626" />
            <rect x="4" y="2" width="3" height="4" fill="#f8fafc" />
            <rect x="7" y="2" width="3" height="4" fill="#dc2626" />
            <rect x="10" y="2" width="3" height="4" fill="#f8fafc" />
            <rect x="13" y="2" width="2" height="4" fill="#dc2626" />
            {/* Counter */}
            <rect x="2" y="7" width="12" height="7" fill="#78350f" />
            <rect x="3" y="8" width="10" height="2" fill="#b45309" />
            {/* Coin on counter */}
            <rect x="7" y="9" width="2" height="2" fill="#facc15" />
          </svg>
        );

      case 'trophy':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            {/* Cup */}
            <rect x="4" y="2" width="8" height="6" fill="#facc15" />
            <rect x="5" y="3" width="6" height="4" fill="#fef08a" />
            {/* Handles */}
            <rect x="2" y="3" width="2" height="4" fill="#eab308" />
            <rect x="12" y="3" width="2" height="4" fill="#eab308" />
            {/* Stem & Base */}
            <rect x="7" y="8" width="2" height="3" fill="#ca8a04" />
            <rect x="4" y="11" width="8" height="3" fill="#a16207" />
            <rect x="3" y="13" width="10" height="2" fill="#713f12" />
          </svg>
        );

      case 'gold':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            <rect x="4" y="2" width="8" height="12" fill="#ca8a04" />
            <rect x="2" y="4" width="12" height="8" fill="#ca8a04" />
            <rect x="3" y="3" width="10" height="10" fill="#eab308" />
            <rect x="4" y="4" width="8" height="8" fill="#facc15" />
            <rect x="5" y="5" width="2" height="2" fill="#fef08a" />
            <rect x="7" y="6" width="2" height="4" fill="#a16207" />
          </svg>
        );

      case 'diamond':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            <rect x="4" y="2" width="8" height="4" fill="#38bdf8" />
            <rect x="2" y="5" width="12" height="3" fill="#0284c7" />
            <rect x="4" y="8" width="8" height="3" fill="#0369a1" />
            <rect x="6" y="11" width="4" height="3" fill="#075985" />
            {/* Highlights */}
            <rect x="6" y="3" width="4" height="2" fill="#e0f2fe" />
            <rect x="4" y="5" width="2" height="2" fill="#bae6fd" />
          </svg>
        );

      case 'stone':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            <rect x="4" y="2" width="8" height="12" fill="#7e22ce" />
            <rect x="2" y="4" width="12" height="8" fill="#9333ea" />
            <rect x="5" y="3" width="6" height="10" fill="#a855f7" />
            <rect x="6" y="4" width="4" height="4" fill="#e9d5ff" />
            <rect x="7" y="5" width="2" height="2" fill="#ffffff" />
          </svg>
        );

      case 'scroll':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            <rect x="3" y="2" width="10" height="12" fill="#fef08a" />
            <rect x="2" y="2" width="1" height="12" fill="#ca8a04" />
            <rect x="13" y="2" width="1" height="12" fill="#ca8a04" />
            {/* Seal / text lines */}
            <rect x="5" y="4" width="6" height="1" fill="#a16207" />
            <rect x="5" y="6" width="6" height="1" fill="#a16207" />
            <rect x="5" y="8" width="6" height="1" fill="#a16207" />
            <rect x="7" y="10" width="2" height="2" fill="#dc2626" />
          </svg>
        );

      case 'potion':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            {/* Cork */}
            <rect x="6" y="1" width="4" height="2" fill="#b45309" />
            {/* Neck */}
            <rect x="7" y="3" width="2" height="2" fill="#cbd5e1" />
            {/* Flask Body */}
            <rect x="4" y="5" width="8" height="9" fill="#94a3b8" />
            <rect x="3" y="7" width="10" height="6" fill="#94a3b8" />
            {/* Liquid */}
            <rect x="4" y="7" width="8" height="6" fill="#f43f5e" />
            <rect x="5" y="6" width="6" height="2" fill="#fb7185" />
            {/* Bubble */}
            <rect x="6" y="9" width="2" height="2" fill="#ffe4e6" />
          </svg>
        );

      case 'shard':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            <rect x="7" y="2" width="3" height="3" fill="#cbd5e1" />
            <rect x="5" y="5" width="4" height="4" fill="#94a3b8" />
            <rect x="4" y="9" width="4" height="3" fill="#64748b" />
            <rect x="8" y="7" width="4" height="4" fill="#cbd5e1" />
            <rect x="9" y="11" width="3" height="3" fill="#475569" />
            <rect x="7" y="4" width="2" height="2" fill="#ffffff" />
          </svg>
        );

      case 'fire':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            <rect x="6" y="1" width="4" height="4" fill="#f97316" />
            <rect x="4" y="4" width="8" height="6" fill="#ea580c" />
            <rect x="3" y="7" width="10" height="7" fill="#dc2626" />
            {/* Yellow Core */}
            <rect x="6" y="6" width="4" height="6" fill="#facc15" />
            <rect x="7" y="8" width="2" height="3" fill="#fef08a" />
          </svg>
        );

      case 'ice':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            <rect x="7" y="1" width="2" height="14" fill="#38bdf8" />
            <rect x="1" y="7" width="14" height="2" fill="#38bdf8" />
            <rect x="4" y="4" width="2" height="2" fill="#7dd3fc" />
            <rect x="10" y="4" width="2" height="2" fill="#7dd3fc" />
            <rect x="4" y="10" width="2" height="2" fill="#7dd3fc" />
            <rect x="10" y="10" width="2" height="2" fill="#7dd3fc" />
            <rect x="6" y="6" width="4" height="4" fill="#ffffff" />
          </svg>
        );

      case 'lightning':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            <rect x="8" y="1" width="3" height="4" fill="#facc15" />
            <rect x="6" y="4" width="4" height="3" fill="#fde047" />
            <rect x="4" y="6" width="8" height="2" fill="#fef08a" />
            <rect x="6" y="8" width="4" height="3" fill="#fde047" />
            <rect x="5" y="11" width="3" height="4" fill="#facc15" />
          </svg>
        );

      case 'holy':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            <rect x="7" y="1" width="2" height="14" fill="#fde047" />
            <rect x="1" y="7" width="14" height="2" fill="#fde047" />
            <rect x="4" y="4" width="2" height="2" fill="#fef08a" />
            <rect x="10" y="4" width="2" height="2" fill="#fef08a" />
            <rect x="4" y="10" width="2" height="2" fill="#fef08a" />
            <rect x="10" y="10" width="2" height="2" fill="#fef08a" />
            <rect x="6" y="6" width="4" height="4" fill="#ffffff" />
          </svg>
        );

      case 'dark':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            <rect x="4" y="2" width="8" height="12" fill="#3b0764" />
            <rect x="2" y="4" width="12" height="8" fill="#581c87" />
            <rect x="5" y="4" width="6" height="8" fill="#7e22ce" />
            <rect x="7" y="6" width="2" height="4" fill="#a855f7" />
            <rect x="6" y="7" width="4" height="2" fill="#d8b4fe" />
          </svg>
        );

      case 'none':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            <rect x="2" y="2" width="12" height="12" fill="#475569" />
            <rect x="3" y="3" width="10" height="10" fill="#64748b" />
            <rect x="4" y="4" width="8" height="8" fill="#94a3b8" />
          </svg>
        );

      case 'shield':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            <rect x="2" y="2" width="12" height="6" fill="#10b981" />
            <rect x="3" y="8" width="10" height="3" fill="#059669" />
            <rect x="5" y="11" width="6" height="3" fill="#047857" />
            <rect x="7" y="14" width="2" height="1" fill="#065f46" />
            <rect x="7" y="3" width="2" height="8" fill="#d1fae5" />
            <rect x="4" y="5" width="8" height="2" fill="#d1fae5" />
          </svg>
        );

      case 'crown':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            <rect x="2" y="4" width="2" height="7" fill="#facc15" />
            <rect x="7" y="2" width="2" height="9" fill="#facc15" />
            <rect x="12" y="4" width="2" height="7" fill="#facc15" />
            <rect x="4" y="8" width="8" height="4" fill="#eab308" />
            <rect x="2" y="11" width="12" height="3" fill="#ca8a04" />
            {/* Jewels */}
            <rect x="7" y="9" width="2" height="2" fill="#ef4444" />
            <rect x="3" y="12" width="2" height="1" fill="#3b82f6" />
            <rect x="11" y="12" width="2" height="1" fill="#10b981" />
          </svg>
        );

      case 'heart':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            <rect x="3" y="3" width="4" height="4" fill="#ef4444" />
            <rect x="9" y="3" width="4" height="4" fill="#ef4444" />
            <rect x="2" y="5" width="12" height="4" fill="#dc2626" />
            <rect x="3" y="9" width="10" height="2" fill="#b91c1c" />
            <rect x="5" y="11" width="6" height="2" fill="#991b1b" />
            <rect x="7" y="13" width="2" height="2" fill="#7f1d1d" />
            <rect x="4" y="4" width="2" height="2" fill="#fecaca" />
          </svg>
        );

      case 'sparkle':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            <rect x="7" y="1" width="2" height="14" fill="#facc15" />
            <rect x="1" y="7" width="14" height="2" fill="#facc15" />
            <rect x="4" y="4" width="2" height="2" fill="#fde047" />
            <rect x="10" y="4" width="2" height="2" fill="#fde047" />
            <rect x="4" y="10" width="2" height="2" fill="#fde047" />
            <rect x="10" y="10" width="2" height="2" fill="#fde047" />
            <rect x="6" y="6" width="4" height="4" fill="#ffffff" />
          </svg>
        );

      case 'check':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            <rect x="11" y="3" width="3" height="3" fill="#22c55e" />
            <rect x="9" y="6" width="3" height="3" fill="#22c55e" />
            <rect x="7" y="9" width="3" height="3" fill="#22c55e" />
            <rect x="5" y="7" width="3" height="3" fill="#22c55e" />
            <rect x="3" y="5" width="3" height="3" fill="#22c55e" />
          </svg>
        );

      case 'cross':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            <rect x="3" y="3" width="3" height="3" fill="#ef4444" />
            <rect x="10" y="3" width="3" height="3" fill="#ef4444" />
            <rect x="5" y="5" width="6" height="6" fill="#ef4444" />
            <rect x="3" y="10" width="3" height="3" fill="#ef4444" />
            <rect x="10" y="10" width="3" height="3" fill="#ef4444" />
          </svg>
        );

      case 'arrowUp':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            <rect x="7" y="2" width="2" height="2" fill="#22c55e" />
            <rect x="5" y="4" width="6" height="2" fill="#22c55e" />
            <rect x="3" y="6" width="10" height="2" fill="#22c55e" />
            <rect x="6" y="8" width="4" height="6" fill="#22c55e" />
          </svg>
        );

      case 'arrowDown':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            <rect x="6" y="2" width="4" height="6" fill="#ef4444" />
            <rect x="3" y="8" width="10" height="2" fill="#ef4444" />
            <rect x="5" y="10" width="6" height="2" fill="#ef4444" />
            <rect x="7" y="12" width="2" height="2" fill="#ef4444" />
          </svg>
        );

      case 'lock':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            {/* Shackle */}
            <rect x="5" y="2" width="6" height="5" fill="#cbd5e1" />
            <rect x="7" y="4" width="2" height="3" fill="#0f172a" />
            {/* Body */}
            <rect x="3" y="6" width="10" height="8" fill="#eab308" />
            <rect x="4" y="7" width="8" height="6" fill="#facc15" />
            {/* Keyhole */}
            <rect x="7" y="8" width="2" height="2" fill="#713f12" />
            <rect x="7" y="10" width="2" height="2" fill="#713f12" />
          </svg>
        );

      case 'knight':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            {/* Plume */}
            <rect x="7" y="1" width="2" height="3" fill="#ef4444" />
            {/* Helmet */}
            <rect x="4" y="3" width="8" height="8" fill="#94a3b8" />
            <rect x="5" y="4" width="6" height="2" fill="#cbd5e1" />
            {/* Visor slit */}
            <rect x="5" y="6" width="6" height="2" fill="#0f172a" />
            {/* Body Armor */}
            <rect x="3" y="10" width="10" height="5" fill="#475569" />
            <rect x="5" y="11" width="6" height="4" fill="#64748b" />
          </svg>
        );

      case 'box':
        return (
          <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={className}>
            {/* Chest Lid */}
            <rect x="2" y="3" width="12" height="5" fill="#92400e" />
            <rect x="3" y="4" width="10" height="3" fill="#b45309" />
            <rect x="2" y="3" width="12" height="1" fill="#facc15" />
            {/* Chest Base */}
            <rect x="2" y="7" width="12" height="7" fill="#78350f" />
            <rect x="3" y="8" width="10" height="5" fill="#92400e" />
            {/* Golden lock */}
            <rect x="7" y="6" width="2" height="3" fill="#facc15" />
          </svg>
        );

      default:
        return null;
    }
  };

  return <span className="inline-flex items-center justify-center shrink-0">{renderIcon()}</span>;
};
