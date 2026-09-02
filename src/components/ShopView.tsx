import React from 'react';
import { Shield, Sparkles, Box, Layers } from 'lucide-react';
import { PlayerStats } from '../types';
import { PixelIcon } from './PixelIcon';
import { sound } from '../utils/sound';

interface ShopViewProps {
  stats: PlayerStats;
  onBuyItem: (type: 'stones_10' | 'stones_100' | 'stones_1000' | 'scroll' | 'scroll_gold' | 'potion' | 'potion_gold' | 'rune_box') => void;
  onCraftShards: (type: 'stones' | 'scroll' | 'diamonds') => void;
}

export const ShopView: React.FC<ShopViewProps> = ({
  stats,
  onBuyItem,
  onCraftShards,
}) => {
  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 flex flex-col gap-4 font-pixel">
      {/* Banner */}
      <div className="bg-neutral-900 border-4 border-neutral-800 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neutral-950 rounded border border-neutral-700">
            <PixelIcon name="shop" size={28} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-amber-300">
              대장장이 암시장 상점 (Black Market)
            </h2>
            <p className="text-xs text-neutral-400 font-sans">
              골드와 다이아몬드로 강화석, 보호서, 영약, 룬 상자를 구매하거나 검 파편을 교환하세요.
            </p>
          </div>
        </div>

        {/* Currency summary */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="bg-neutral-950 px-3 py-1.5 rounded border border-amber-600/60 flex items-center gap-1.5">
            <PixelIcon name="gold" size={14} />
            <span className="text-amber-300 font-bold">{stats.gold.toLocaleString()} G</span>
          </div>
          <div className="bg-neutral-950 px-3 py-1.5 rounded border border-cyan-600/60 flex items-center gap-1.5">
            <PixelIcon name="diamond" size={14} />
            <span className="text-cyan-300 font-bold">{stats.diamonds.toLocaleString()} D</span>
          </div>
        </div>
      </div>

      {/* 1. SHOP PRODUCTS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Stones 10 */}
        <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-3.5 flex flex-col justify-between gap-3 shadow">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-neutral-950 rounded border border-neutral-800">
              <PixelIcon name="stone" size={22} />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-neutral-100">강화석 10개 묶음</h3>
              <span className="text-[10px] text-neutral-400 font-mono">기본 제련 재료</span>
            </div>
          </div>
          <p className="text-xs text-neutral-300 font-sans">
            도검 강화를 시도할 때 사용되는 필수 강화석 10개입니다.
          </p>
          <button
            onClick={() => {
              sound.playClick();
              onBuyItem('stones_10');
            }}
            disabled={stats.gold < 1000}
            className={`w-full py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-neutral-950 rounded text-xs font-bold font-mono border border-amber-400 shadow cursor-pointer flex items-center justify-center gap-1.5 ${
              stats.tutorialActive && stats.tutorialStep === 2 ? 'ring-2 ring-yellow-400 animate-pulse' : ''
            }`}
          >
            <PixelIcon name="gold" size={14} />
            <span>1,000 골드 {stats.tutorialActive && stats.tutorialStep === 2 ? '👉 [미션]' : ''}</span>
          </button>
        </div>

        {/* Stones 100 */}
        <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-3.5 flex flex-col justify-between gap-3 shadow">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-neutral-950 rounded border border-neutral-800">
              <PixelIcon name="stone" size={22} />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-neutral-100">강화석 100개 상자</h3>
              <span className="text-[10px] text-emerald-400 font-mono">10% 할인 특가</span>
            </div>
          </div>
          <p className="text-xs text-neutral-300 font-sans">
            대량 강화를 위한 가성비 높은 강화석 100개 번들입니다.
          </p>
          <button
            onClick={() => {
              sound.playClick();
              onBuyItem('stones_100');
            }}
            disabled={stats.gold < 9000}
            className="w-full py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-neutral-950 rounded text-xs font-bold font-mono border border-amber-400 shadow cursor-pointer flex items-center justify-center gap-1.5"
          >
            <PixelIcon name="gold" size={14} />
            <span>9,000 골드</span>
          </button>
        </div>

        {/* Stones 1000 */}
        <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-3.5 flex flex-col justify-between gap-3 shadow">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-neutral-950 rounded border border-neutral-800">
              <PixelIcon name="stone" size={22} />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-neutral-100">강화석 1,000개 벌크</h3>
              <span className="text-[10px] text-purple-400 font-mono">20% 대량 할인</span>
            </div>
          </div>
          <p className="text-xs text-neutral-300 font-sans">
            초월 및 신화 도검 강화를 위한 대용량 강화석 1,000개 팩입니다.
          </p>
          <button
            onClick={() => {
              sound.playClick();
              onBuyItem('stones_1000');
            }}
            disabled={stats.gold < 80000}
            className="w-full py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-neutral-950 rounded text-xs font-bold font-mono border border-amber-400 shadow cursor-pointer flex items-center justify-center gap-1.5"
          >
            <PixelIcon name="gold" size={14} />
            <span>80,000 골드</span>
          </button>
        </div>

        {/* Protection Scroll */}
        <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-3.5 flex flex-col justify-between gap-3 shadow">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-neutral-950 rounded border border-neutral-800">
              <PixelIcon name="scroll" size={22} />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-emerald-300">파괴 방지 주문서</h3>
              <span className="text-[10px] text-neutral-400 font-mono">1회 소모성</span>
            </div>
          </div>
          <p className="text-xs text-neutral-300 font-sans">
            강화 실패 시 검이 파괴되는 것을 100% 완벽하게 막아줍니다.
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                sound.playClick();
                onBuyItem('scroll');
              }}
              disabled={stats.diamonds < 300}
              className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-neutral-950 rounded text-xs font-bold font-mono border border-cyan-300 shadow cursor-pointer flex items-center justify-center gap-1"
            >
              <span>300</span>
              <PixelIcon name="diamond" size={12} />
            </button>
            <button
              onClick={() => {
                sound.playClick();
                onBuyItem('scroll_gold');
              }}
              disabled={stats.gold < 500000}
              className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-neutral-950 rounded text-xs font-bold font-mono border border-amber-300 shadow cursor-pointer flex items-center justify-center gap-1"
            >
              <span>50만</span>
              <PixelIcon name="gold" size={12} />
            </button>
          </div>
        </div>

        {/* Lucky Potion */}
        <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-3.5 flex flex-col justify-between gap-3 shadow">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-neutral-950 rounded border border-neutral-800">
              <PixelIcon name="potion" size={22} />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-rose-300">행운의 비약</h3>
              <span className="text-[10px] text-neutral-400 font-mono">+10% 확률 증가</span>
            </div>
          </div>
          <p className="text-xs text-neutral-300 font-sans">
            다음 1회 강화 시 성공 확률을 즉시 +10% 추가해줍니다.
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                sound.playClick();
                onBuyItem('potion');
              }}
              disabled={stats.diamonds < 100}
              className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-neutral-950 rounded text-xs font-bold font-mono border border-cyan-300 shadow cursor-pointer flex items-center justify-center gap-1"
            >
              <span>100</span>
              <PixelIcon name="diamond" size={12} />
            </button>
            <button
              onClick={() => {
                sound.playClick();
                onBuyItem('potion_gold');
              }}
              disabled={stats.gold < 150000}
              className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-neutral-950 rounded text-xs font-bold font-mono border border-amber-300 shadow cursor-pointer flex items-center justify-center gap-1"
            >
              <span>15만</span>
              <PixelIcon name="gold" size={12} />
            </button>
          </div>
        </div>

        {/* Mystery Rune Chest */}
        <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-3.5 flex flex-col justify-between gap-3 shadow">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-neutral-950 rounded border border-neutral-800">
              <PixelIcon name="rune" size={22} />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-purple-300">신비한 룬 상자</h3>
              <span className="text-[10px] text-neutral-400 font-mono">무작위 룬 뽑기</span>
            </div>
          </div>
          <p className="text-xs text-neutral-300 font-sans">
            루비, 사파이어, 에메랄드, 자수정, 토파즈 중 무작위 룬 1개를 획득합니다.
          </p>
          <button
            onClick={() => {
              sound.playClick();
              onBuyItem('rune_box');
            }}
            disabled={stats.diamonds < 250}
            className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-neutral-950 rounded text-xs font-bold font-mono border border-cyan-300 shadow cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>250</span>
            <PixelIcon name="diamond" size={14} />
            <span>뽑기</span>
          </button>
        </div>
      </div>

      {/* 2. SWORD SHARDS RECYCLING & ALCHEMY */}
      <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-4 flex flex-col gap-3 shadow mt-2">
        <h3 className="text-sm font-bold text-slate-300 flex items-center justify-between border-b border-neutral-800 pb-2">
          <span className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-slate-400" /> 검 파편 연금술 교환소 (Shards Alchemy)
          </span>
          <span className="text-xs text-slate-400 font-mono">
            보유 파편: {stats.swordShards}개
          </span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-neutral-950 p-3 rounded border border-neutral-800 flex flex-col justify-between gap-2 text-xs">
            <div>
              <h4 className="font-bold text-purple-300">강화석 20개 연성</h4>
              <p className="text-[11px] text-neutral-400 font-sans mt-0.5">파편 10개를 모아 강화석 20개로 변환합니다.</p>
            </div>
            <button
              onClick={() => {
                sound.playClick();
                onCraftShards('stones');
              }}
              disabled={stats.swordShards < 10}
              className="py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-200 border border-neutral-700 rounded font-bold cursor-pointer"
            >
              파편 10개 교환
            </button>
          </div>

          <div className="bg-neutral-950 p-3 rounded border border-neutral-800 flex flex-col justify-between gap-2 text-xs">
            <div>
              <h4 className="font-bold text-emerald-300">파괴 방지 주문서 1장</h4>
              <p className="text-[11px] text-neutral-400 font-sans mt-0.5">파편 50개를 모아 안전 보호서 1장으로 변환합니다.</p>
            </div>
            <button
              onClick={() => {
                sound.playClick();
                onCraftShards('scroll');
              }}
              disabled={stats.swordShards < 50}
              className="py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-200 border border-neutral-700 rounded font-bold cursor-pointer"
            >
              파편 50개 교환
            </button>
          </div>

          <div className="bg-neutral-950 p-3 rounded border border-neutral-800 flex flex-col justify-between gap-2 text-xs">
            <div>
              <h4 className="font-bold text-cyan-300">다이아 500개 환전</h4>
              <p className="text-[11px] text-neutral-400 font-sans mt-0.5">파편 100개를 모아 다이아몬드 500개로 환전합니다.</p>
            </div>
            <button
              onClick={() => {
                sound.playClick();
                onCraftShards('diamonds');
              }}
              disabled={stats.swordShards < 100}
              className="py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-200 border border-neutral-700 rounded font-bold cursor-pointer"
            >
              파편 100개 교환
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
