import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Plus, Play, LogIn, LogOut, Check, X, Shield, Swords, Sparkles,
  MessageSquare, Send, Crown, RefreshCw, KeyRound, Globe, Flame, Building2, Skull,
  Store, ArrowLeftRight, ShoppingBag, DollarSign, Package, CheckCircle2,
  AlertCircle, ChevronRight, Copy, CheckCheck, Trash2, ArrowUpRight, Search, Filter
} from 'lucide-react';
import {
  PlayerStats,
  Sword,
  StoredSword,
  Rune,
  SocketGem,
  TradeListing,
  TradeRoom,
  TradeOffer,
  TradeChatMessage,
  TradeItemType,
  TradePriceType,
} from '../types';
import {
  createMarketListing,
  subscribeToMarketListings,
  subscribeToMyMarketListings,
  buyMarketListing,
  cancelMarketListing,
  deleteMarketListing,
  createDirectTradeRoom,
  joinDirectTradeRoom,
  leaveDirectTradeRoom,
  updateDirectTradeOffer,
  setDirectTradeLock,
  confirmDirectTradeExchange,
  subscribeToTradeRoom,
  subscribeToPublicTradeRooms,
  sendTradeChatMessage,
  subscribeToTradeChatMessages,
  EMPTY_OFFER,
} from '../utils/firebaseTrade';
import { getOrCreatePlayerId } from '../utils/firebaseParty';
import { PixelIcon, PixelIconName } from './PixelIcon';
import { sound } from '../utils/sound';

interface TradeMarketViewProps {
  stats: PlayerStats;
  currentSword: Sword;
  onUpdateStats: (updater: (prev: PlayerStats) => PlayerStats) => void;
  addLog: (text: string, type: 'success' | 'fail' | 'destroy' | 'drop' | 'loot' | 'system' | 'boss') => void;
  onOpenVaultTab?: () => void;
}

export const TradeMarketView: React.FC<TradeMarketViewProps> = ({
  stats,
  currentSword,
  onUpdateStats,
  addLog,
  onOpenVaultTab,
}) => {
  const [activeTab, setActiveTab] = useState<'market' | 'direct_trade' | 'register' | 'my_listings'>('market');
  const myUid = getOrCreatePlayerId();
  const myName = stats.playerName || `검사_${myUid.substring(5, 9)}`;
  const myAvatar = stats.playerAvatar || '⚔️';

  // ------------------------------------------------
  // 1. Marketplace State
  // ------------------------------------------------
  const [marketListings, setMarketListings] = useState<TradeListing[]>([]);
  const [myListings, setMyListings] = useState<TradeListing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'sword' | 'currency' | 'consumable' | 'rune_gem' | 'rebirth' | 'cheat'>('all');
  const [priceSort, setPriceSort] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [isBuying, setIsBuying] = useState<string | null>(null);
  const [marketSuccessMsg, setMarketSuccessMsg] = useState<string | null>(null);
  const [marketErrorMsg, setMarketErrorMsg] = useState<string | null>(null);

  // ------------------------------------------------
  // 2. Listing Registration State
  // ------------------------------------------------
  const [regItemCategory, setRegItemCategory] = useState<TradeItemType>('gold');
  const [regAmount, setRegAmount] = useState<number>(10000);
  const [selectedVaultSwordId, setSelectedVaultSwordId] = useState<string | null>(null);
  const [selectedRuneId, setSelectedRuneId] = useState<string | null>(null);
  const [selectedGemId, setSelectedGemId] = useState<string | null>(null);
  const [regPriceType, setRegPriceType] = useState<TradePriceType>('diamonds');
  const [regPriceAmount, setRegPriceAmount] = useState<number>(100);
  const [isSubmittingListing, setIsSubmittingListing] = useState(false);

  // ------------------------------------------------
  // 3. Direct 1:1 Trade State
  // ------------------------------------------------
  const [publicTradeRooms, setPublicTradeRooms] = useState<TradeRoom[]>([]);
  const [activeTradeRoomId, setActiveTradeRoomId] = useState<string | null>(null);
  const [activeTradeRoom, setActiveTradeRoom] = useState<TradeRoom | null>(null);
  const [tradeJoinCode, setTradeJoinCode] = useState('');
  const [tradeChatMessages, setTradeChatMessages] = useState<TradeChatMessage[]>([]);
  const [tradeChatInput, setTradeChatInput] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [tradeErrorMsg, setTradeErrorMsg] = useState<string | null>(null);
  const [tradeNotice, setTradeNotice] = useState<string | null>(null);

  // My local offer in 1:1 trade room
  const [myOfferDraft, setMyOfferDraft] = useState<TradeOffer>({ ...EMPTY_OFFER });
  const [isEditingOfferModal, setIsEditingOfferModal] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Subscriptions
  useEffect(() => {
    const unsubMarket = subscribeToMarketListings((listings) => {
      setMarketListings(listings);
    });
    const unsubMyListings = subscribeToMyMarketListings(myUid, (listings) => {
      setMyListings(listings);
    });
    const unsubPublicRooms = subscribeToPublicTradeRooms((rooms) => {
      setPublicTradeRooms(rooms);
    });

    return () => {
      unsubMarket();
      unsubMyListings();
      unsubPublicRooms();
    };
  }, [myUid]);

  // Subscribe to Active Trade Room
  useEffect(() => {
    if (!activeTradeRoomId) {
      setActiveTradeRoom(null);
      return;
    }

    const unsubRoom = subscribeToTradeRoom(activeTradeRoomId, (room) => {
      if (!room || room.status === 'cancelled') {
        if (room?.cancelledReason) {
          setTradeErrorMsg(room.cancelledReason);
        }
        setActiveTradeRoomId(null);
        setActiveTradeRoom(null);
        return;
      }

      // Check if Completed
      if (room.status === 'completed' && activeTradeRoom?.status !== 'completed') {
        handleExecuteCompletedTrade(room);
      }

      setActiveTradeRoom(room);
    });

    const unsubChat = subscribeToTradeChatMessages(activeTradeRoomId, (msgs) => {
      setTradeChatMessages(msgs);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    });

    return () => {
      unsubRoom();
      unsubChat();
    };
  }, [activeTradeRoomId]);

  // Execute Local Inventory Swap on Trade Completion
  const handleExecuteCompletedTrade = (room: TradeRoom) => {
    const isHost = room.hostUid === myUid;
    const whatIGive = isHost ? room.hostOffer : room.guestOffer;
    const whatIReceive = isHost ? room.guestOffer : room.hostOffer;

    onUpdateStats((prev) => {
      // 1. Deduct what I gave
      let updatedGold = Math.max(0, prev.gold - (whatIGive.gold || 0));
      let updatedDiamonds = Math.max(0, prev.diamonds - (whatIGive.diamonds || 0));
      let updatedStones = Math.max(0, prev.enhancementStones - (whatIGive.stones || 0));
      let updatedScrolls = Math.max(0, prev.ancientScrolls - (whatIGive.scrolls || 0));
      let updatedPotions = Math.max(0, prev.luckyPotions - (whatIGive.potions || 0));
      let updatedDust = Math.max(0, (prev.spiritDust || 0) - (whatIGive.spiritDust || 0));
      let updatedShards = Math.max(0, (prev.swordShards || 0) - (whatIGive.shards || 0));
      let updatedRaidTokens = Math.max(0, (prev.worldBossRaidTokens || 0) - (whatIGive.raidTokens || 0));
      let updatedRebirths = Math.max(0, (prev.rebirthCount || 0) - (whatIGive.rebirths || 0));
      let updatedSuperRebirths = Math.max(0, (prev.superRebirthCount || 0) - (whatIGive.superRebirths || 0));
      let updatedRebirthPoints = Math.max(0, (prev.rebirthPoints || 0) - (whatIGive.rebirthPoints || 0));

      const givenSwordIds = new Set(whatIGive.storedSwords.map((s) => s.id));
      const givenRuneIds = new Set(whatIGive.runes.map((r) => r.id));
      const givenGemIds = new Set(whatIGive.gems.map((g) => g.id));

      let updatedVault = (prev.swordVault || []).filter((s) => !givenSwordIds.has(s.id));
      let updatedRunes = (prev.inventoryRunes || []).filter((r) => !givenRuneIds.has(r.id));
      let updatedGems = (prev.socketGems || []).filter((g) => !givenGemIds.has(g.id));

      // 2. Add what I receive
      updatedGold += (whatIReceive.gold || 0);
      updatedDiamonds += (whatIReceive.diamonds || 0);
      updatedStones += (whatIReceive.stones || 0);
      updatedScrolls += (whatIReceive.scrolls || 0);
      updatedPotions += (whatIReceive.potions || 0);
      updatedDust += (whatIReceive.spiritDust || 0);
      updatedShards += (whatIReceive.shards || 0);
      updatedRaidTokens += (whatIReceive.raidTokens || 0);
      updatedRebirths += (whatIReceive.rebirths || 0);
      updatedSuperRebirths += (whatIReceive.superRebirths || 0);
      updatedRebirthPoints += (whatIReceive.rebirthPoints || 0);

      let uAdmin = prev.adminUnlocked;
      let uCheat = prev.cheatUnlocked;
      let uCheatSuccess = prev.cheatSuccessRate100;
      let uCheatDmg = prev.cheatDmg1000x;

      if (whatIReceive.cheatPass) {
        uAdmin = true;
        uCheat = true;
        uCheatSuccess = true;
        uCheatDmg = true;
      }

      const receivedSwords = whatIReceive.storedSwords.map((s) => ({
        ...s,
        id: `${Date.now()}_${Math.random()}`,
        storedAt: Date.now(),
      }));

      const receivedRunes = whatIReceive.runes.map((r) => ({
        ...r,
        id: `rune_${Date.now()}_${Math.random()}`,
      }));

      const receivedGems = whatIReceive.gems.map((g) => ({
        ...g,
        id: `gem_${Date.now()}_${Math.random()}`,
      }));

      return {
        ...prev,
        gold: updatedGold,
        diamonds: updatedDiamonds,
        enhancementStones: updatedStones,
        ancientScrolls: updatedScrolls,
        luckyPotions: updatedPotions,
        spiritDust: updatedDust,
        swordShards: updatedShards,
        worldBossRaidTokens: updatedRaidTokens,
        rebirthCount: updatedRebirths,
        superRebirthCount: updatedSuperRebirths,
        rebirthPoints: updatedRebirthPoints,
        adminUnlocked: uAdmin,
        cheatUnlocked: uCheat,
        cheatSuccessRate100: uCheatSuccess,
        cheatDmg1000x: uCheatDmg,
        swordVault: [...updatedVault, ...receivedSwords],
        inventoryRunes: [...updatedRunes, ...receivedRunes],
        socketGems: [...updatedGems, ...receivedGems],
      };
    });

    sound.playSuccess(true);
    addLog(`[1:1 직거래 성공] 상대방과의 실시간 교환이 안전하게 완료되었습니다!`, 'loot');
    setTradeNotice('🎉 거래가 성공적으로 성사되었습니다! 인벤토리에 지급되었습니다.');
  };

  // ------------------------------------------------
  // Marketplace Functions
  // ------------------------------------------------

  // Filter & Search listings
  const filteredListings = marketListings.filter((l) => {
    if (categoryFilter === 'sword' && l.itemType !== 'sword') return false;
    if (categoryFilter === 'currency' && !['gold', 'diamonds', 'stones'].includes(l.itemType)) return false;
    if (categoryFilter === 'consumable' && !['scrolls', 'potions', 'spirit_dust', 'shards', 'raid_tokens'].includes(l.itemType)) return false;
    if (categoryFilter === 'rune_gem' && !['rune', 'gem'].includes(l.itemType)) return false;
    if (categoryFilter === 'rebirth' && !['rebirth', 'super_rebirth', 'rebirth_points'].includes(l.itemType)) return false;
    if (categoryFilter === 'cheat' && l.itemType !== 'cheat_menu_pass') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = l.itemTitle.toLowerCase().includes(q);
      const matchSeller = l.sellerName.toLowerCase().includes(q);
      if (!matchTitle && !matchSeller) return false;
    }
    return true;
  });

  // Sort listings
  filteredListings.sort((a, b) => {
    if (priceSort === 'price_asc') return a.priceAmount - b.priceAmount;
    if (priceSort === 'price_desc') return b.priceAmount - a.priceAmount;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  // Handle Buy Marketplace Item
  const handleBuyListing = async (listing: TradeListing) => {
    // Check if buyer has enough price currency
    let canAfford = false;
    let priceCurName = '골드';
    if (listing.priceType === 'gold') {
      canAfford = stats.gold >= listing.priceAmount;
      priceCurName = '골드';
    } else if (listing.priceType === 'diamonds') {
      canAfford = stats.diamonds >= listing.priceAmount;
      priceCurName = '다이아';
    } else if (listing.priceType === 'stones') {
      canAfford = stats.enhancementStones >= listing.priceAmount;
      priceCurName = '강화석';
    } else if (listing.priceType === 'scrolls') {
      canAfford = stats.ancientScrolls >= listing.priceAmount;
      priceCurName = '보호 주문서';
    } else if (listing.priceType === 'potions') {
      canAfford = stats.luckyPotions >= listing.priceAmount;
      priceCurName = '행운의 물약';
    } else if (listing.priceType === 'spirit_dust') {
      canAfford = (stats.spiritDust || 0) >= listing.priceAmount;
      priceCurName = '소울 가루';
    } else if (listing.priceType === 'rebirth') {
      canAfford = (stats.rebirthCount || 0) >= listing.priceAmount;
      priceCurName = '환생 횟수';
    } else if (listing.priceType === 'super_rebirth') {
      canAfford = (stats.superRebirthCount || 0) >= listing.priceAmount;
      priceCurName = '초환생 횟수';
    } else if (listing.priceType === 'rebirth_points') {
      canAfford = (stats.rebirthPoints || 0) >= listing.priceAmount;
      priceCurName = '환생 포인트 (RP)';
    }

    if (!canAfford) {
      sound.playFail();
      setMarketErrorMsg(`구매 대금 부족: ${listing.priceAmount.toLocaleString()} ${priceCurName}가 필요합니다.`);
      setTimeout(() => setMarketErrorMsg(null), 3000);
      return;
    }

    setIsBuying(listing.id);
    try {
      await buyMarketListing({
        listingId: listing.id,
        buyerUid: myUid,
        buyerName: myName,
      });

      // Deduct Price and Grant Item
      onUpdateStats((prev) => {
        let uGold = prev.gold;
        let uDia = prev.diamonds;
        let uStones = prev.enhancementStones;
        let uScrolls = prev.ancientScrolls;
        let uPotions = prev.luckyPotions;
        let uDust = prev.spiritDust || 0;
        let uShards = prev.swordShards || 0;
        let uRaidTokens = prev.worldBossRaidTokens || 0;
        let uRebirth = prev.rebirthCount || 0;
        let uSuperRebirth = prev.superRebirthCount || 0;
        let uRP = prev.rebirthPoints || 0;
        let uAdmin = prev.adminUnlocked;
        let uCheat = prev.cheatUnlocked;
        let uCheatSuccess = prev.cheatSuccessRate100;
        let uCheatDmg = prev.cheatDmg1000x;
        let uVault = [...(prev.swordVault || [])];
        let uRunes = [...(prev.inventoryRunes || [])];
        let uGems = [...(prev.socketGems || [])];

        // Deduct price
        if (listing.priceType === 'gold') uGold -= listing.priceAmount;
        if (listing.priceType === 'diamonds') uDia -= listing.priceAmount;
        if (listing.priceType === 'stones') uStones -= listing.priceAmount;
        if (listing.priceType === 'scrolls') uScrolls -= listing.priceAmount;
        if (listing.priceType === 'potions') uPotions -= listing.priceAmount;
        if (listing.priceType === 'spirit_dust') uDust -= listing.priceAmount;
        if (listing.priceType === 'rebirth') uRebirth -= listing.priceAmount;
        if (listing.priceType === 'super_rebirth') uSuperRebirth -= listing.priceAmount;
        if (listing.priceType === 'rebirth_points') uRP -= listing.priceAmount;

        // Grant item
        if (listing.itemType === 'gold') uGold += listing.itemAmount;
        else if (listing.itemType === 'diamonds') uDia += listing.itemAmount;
        else if (listing.itemType === 'stones') uStones += listing.itemAmount;
        else if (listing.itemType === 'scrolls') uScrolls += listing.itemAmount;
        else if (listing.itemType === 'potions') uPotions += listing.itemAmount;
        else if (listing.itemType === 'spirit_dust') uDust += listing.itemAmount;
        else if (listing.itemType === 'shards') uShards += listing.itemAmount;
        else if (listing.itemType === 'raid_tokens') uRaidTokens += listing.itemAmount;
        else if (listing.itemType === 'rebirth') uRebirth += listing.itemAmount;
        else if (listing.itemType === 'super_rebirth') uSuperRebirth += listing.itemAmount;
        else if (listing.itemType === 'rebirth_points') uRP += listing.itemAmount;
        else if (listing.itemType === 'cheat_menu_pass') {
          uAdmin = true;
          uCheat = true;
          uCheatSuccess = true;
          uCheatDmg = true;
          uRebirth += 100;
          uSuperRebirth += 10;
          uDia += 1_000_000;
          uScrolls += 100;
        }
        else if (listing.itemType === 'sword' && listing.itemData?.storedSword) {
          uVault.push({
            ...listing.itemData.storedSword,
            id: `${Date.now()}_${Math.random()}`,
            storedAt: Date.now(),
          });
        } else if (listing.itemType === 'rune' && listing.itemData?.rune) {
          uRunes.push({
            ...listing.itemData.rune,
            id: `rune_${Date.now()}_${Math.random()}`,
          });
        } else if (listing.itemType === 'gem' && listing.itemData?.socketGem) {
          uGems.push({
            ...listing.itemData.socketGem,
            id: `gem_${Date.now()}_${Math.random()}`,
          });
        }

        return {
          ...prev,
          gold: uGold,
          diamonds: uDia,
          enhancementStones: uStones,
          ancientScrolls: uScrolls,
          luckyPotions: uPotions,
          spiritDust: uDust,
          swordShards: uShards,
          worldBossRaidTokens: uRaidTokens,
          rebirthCount: uRebirth,
          superRebirthCount: uSuperRebirth,
          rebirthPoints: uRP,
          adminUnlocked: uAdmin,
          cheatUnlocked: uCheat,
          cheatSuccessRate100: uCheatSuccess,
          cheatDmg1000x: uCheatDmg,
          swordVault: uVault,
          inventoryRunes: uRunes,
          socketGems: uGems,
        };
      });

      sound.playSuccess(true);
      addLog(`[거래소 구매] ${listing.sellerName}님의 [${listing.itemTitle}] 구매 완료!`, 'loot');
      setMarketSuccessMsg(`🎉 [${listing.itemTitle}] 구매 완료! 인벤토리/보관함에 수령되었습니다.`);
      setTimeout(() => setMarketSuccessMsg(null), 3500);
    } catch (err: any) {
      sound.playFail();
      setMarketErrorMsg(err.message || '구매 처리에 실패했습니다.');
      setTimeout(() => setMarketErrorMsg(null), 3000);
    } finally {
      setIsBuying(null);
    }
  };

  // Handle Cancel My Listing (Returns item back)
  const handleCancelListing = async (listing: TradeListing) => {
    try {
      await cancelMarketListing(listing.id, myUid);
      // Return item back to local stats
      onUpdateStats((prev) => {
        let uGold = prev.gold;
        let uDia = prev.diamonds;
        let uStones = prev.enhancementStones;
        let uScrolls = prev.ancientScrolls;
        let uPotions = prev.luckyPotions;
        let uDust = prev.spiritDust || 0;
        let uShards = prev.swordShards || 0;
        let uRaidTokens = prev.worldBossRaidTokens || 0;
        let uRebirth = prev.rebirthCount || 0;
        let uSuperRebirth = prev.superRebirthCount || 0;
        let uRP = prev.rebirthPoints || 0;
        let uVault = [...(prev.swordVault || [])];
        let uRunes = [...(prev.inventoryRunes || [])];
        let uGems = [...(prev.socketGems || [])];

        if (listing.itemType === 'gold') uGold += listing.itemAmount;
        else if (listing.itemType === 'diamonds') uDia += listing.itemAmount;
        else if (listing.itemType === 'stones') uStones += listing.itemAmount;
        else if (listing.itemType === 'scrolls') uScrolls += listing.itemAmount;
        else if (listing.itemType === 'potions') uPotions += listing.itemAmount;
        else if (listing.itemType === 'spirit_dust') uDust += listing.itemAmount;
        else if (listing.itemType === 'shards') uShards += listing.itemAmount;
        else if (listing.itemType === 'raid_tokens') uRaidTokens += listing.itemAmount;
        else if (listing.itemType === 'rebirth') uRebirth += listing.itemAmount;
        else if (listing.itemType === 'super_rebirth') uSuperRebirth += listing.itemAmount;
        else if (listing.itemType === 'rebirth_points') uRP += listing.itemAmount;
        else if (listing.itemType === 'sword' && listing.itemData?.storedSword) {
          uVault.push(listing.itemData.storedSword);
        } else if (listing.itemType === 'rune' && listing.itemData?.rune) {
          uRunes.push(listing.itemData.rune);
        } else if (listing.itemType === 'gem' && listing.itemData?.socketGem) {
          uGems.push(listing.itemData.socketGem);
        }

        return {
          ...prev,
          gold: uGold,
          diamonds: uDia,
          enhancementStones: uStones,
          ancientScrolls: uScrolls,
          luckyPotions: uPotions,
          spiritDust: uDust,
          swordShards: uShards,
          worldBossRaidTokens: uRaidTokens,
          rebirthCount: uRebirth,
          superRebirthCount: uSuperRebirth,
          rebirthPoints: uRP,
          swordVault: uVault,
          inventoryRunes: uRunes,
          socketGems: uGems,
        };
      });

      sound.playCoin();
      addLog(`[등록 취소] [${listing.itemTitle}] 등록을 취소하고 회수했습니다.`, 'system');
    } catch (err: any) {
      alert(err.message || '등록 취소에 실패했습니다.');
    }
  };

  // Settle sold listing (Collect Payment)
  const handleSettleSoldListing = async (listing: TradeListing) => {
    try {
      onUpdateStats((prev) => {
        let uGold = prev.gold;
        let uDia = prev.diamonds;
        let uStones = prev.enhancementStones;
        let uScrolls = prev.ancientScrolls;
        let uPotions = prev.luckyPotions;
        let uDust = prev.spiritDust || 0;
        let uRebirth = prev.rebirthCount || 0;
        let uSuperRebirth = prev.superRebirthCount || 0;
        let uRP = prev.rebirthPoints || 0;

        if (listing.priceType === 'gold') uGold += listing.priceAmount;
        if (listing.priceType === 'diamonds') uDia += listing.priceAmount;
        if (listing.priceType === 'stones') uStones += listing.priceAmount;
        if (listing.priceType === 'scrolls') uScrolls += listing.priceAmount;
        if (listing.priceType === 'potions') uPotions += listing.priceAmount;
        if (listing.priceType === 'spirit_dust') uDust += listing.priceAmount;
        if (listing.priceType === 'rebirth') uRebirth += listing.priceAmount;
        if (listing.priceType === 'super_rebirth') uSuperRebirth += listing.priceAmount;
        if (listing.priceType === 'rebirth_points') uRP += listing.priceAmount;

        return {
          ...prev,
          gold: uGold,
          diamonds: uDia,
          enhancementStones: uStones,
          ancientScrolls: uScrolls,
          luckyPotions: uPotions,
          spiritDust: uDust,
          rebirthCount: uRebirth,
          superRebirthCount: uSuperRebirth,
          rebirthPoints: uRP,
        };
      });

      await deleteMarketListing(listing.id);
      sound.playSuccess();
      addLog(`[판매 대금 수령] ${listing.itemTitle} 판매 대금 +${listing.priceAmount.toLocaleString()} ${listing.priceType.toUpperCase()} 정산 완료!`, 'loot');
    } catch (err) {
      console.error(err);
    }
  };

  // Register New Marketplace Listing
  const handleCreateListing = async () => {
    if (regPriceAmount <= 0) {
      alert('판매 희망 가격을 1 이상으로 설정해주세요.');
      return;
    }

    let itemTitle = '';
    let itemData: any = {};
    let itemAmount = regAmount;

    // Validate and prepare item
    if (regItemCategory === 'sword') {
      const sword = stats.swordVault?.find((s) => s.id === selectedVaultSwordId);
      if (!sword) {
        alert('보관함에서 판매할 검을 선택해주세요.');
        return;
      }
      itemTitle = `+${sword.level} [${sword.name}] (${sword.rarity})`;
      itemData = { storedSword: sword };
      itemAmount = 1;

      // Deduct sword from vault
      onUpdateStats((prev) => ({
        ...prev,
        swordVault: (prev.swordVault || []).filter((s) => s.id !== sword.id),
      }));
    } else if (regItemCategory === 'rune') {
      const rune = stats.inventoryRunes?.find((r) => r.id === selectedRuneId);
      if (!rune) {
        alert('판매할 룬을 선택해주세요.');
        return;
      }
      itemTitle = `${rune.tier}티어 [${rune.name}] (수치 +${rune.value})`;
      itemData = { rune };
      itemAmount = 1;

      // Deduct rune
      onUpdateStats((prev) => ({
        ...prev,
        inventoryRunes: (prev.inventoryRunes || []).filter((r) => r.id !== rune.id),
      }));
    } else if (regItemCategory === 'gem') {
      const gem = stats.socketGems?.find((g) => g.id === selectedGemId);
      if (!gem) {
        alert('판매할 소켓 보석을 선택해주세요.');
        return;
      }
      itemTitle = `T${gem.tier} [${gem.name}] (${gem.statType} +${gem.statValue}%)`;
      itemData = { socketGem: gem };
      itemAmount = 1;

      // Deduct gem
      onUpdateStats((prev) => ({
        ...prev,
        socketGems: (prev.socketGems || []).filter((g) => g.id !== gem.id),
      }));
    } else if (regItemCategory === 'rebirth') {
      if ((stats.rebirthCount || 0) < regAmount && !stats.adminUnlocked) { alert('보유 환생 횟수가 부족합니다.'); return; }
      itemTitle = `${regAmount.toLocaleString()}회 환생 횟수 (🔄)`;
      onUpdateStats((prev) => ({ ...prev, rebirthCount: Math.max(0, (prev.rebirthCount || 0) - regAmount) }));
    } else if (regItemCategory === 'super_rebirth') {
      if ((stats.superRebirthCount || 0) < regAmount && !stats.adminUnlocked) { alert('보유 초환생 횟수가 부족합니다.'); return; }
      itemTitle = `${regAmount.toLocaleString()}회 초환생 횟수 (👑)`;
      onUpdateStats((prev) => ({ ...prev, superRebirthCount: Math.max(0, (prev.superRebirthCount || 0) - regAmount) }));
    } else if (regItemCategory === 'rebirth_points') {
      if ((stats.rebirthPoints || 0) < regAmount && !stats.adminUnlocked) { alert('보유 환생 포인트가 부족합니다.'); return; }
      itemTitle = `${regAmount.toLocaleString()} RP 환생 포인트 (⚡)`;
      onUpdateStats((prev) => ({ ...prev, rebirthPoints: Math.max(0, (prev.rebirthPoints || 0) - regAmount) }));
    } else if (regItemCategory === 'cheat_menu_pass') {
      if (!stats.adminUnlocked && !stats.cheatUnlocked) { alert('어드민 또는 치트 권한자만 치트 메뉴 증서를 등록할 수 있습니다.'); return; }
      itemTitle = `👑 [창조주] 어드민 치트 메뉴 권한 패스 증서`;
      itemAmount = 1;
      itemData = { isCheatPass: true };
    } else {
      // Currencies / Consumables
      if (regItemCategory === 'gold') {
        if (stats.gold < regAmount) { alert('보유 골드가 부족합니다.'); return; }
        itemTitle = `${regAmount.toLocaleString()} 골드 (G)`;
        onUpdateStats((prev) => ({ ...prev, gold: prev.gold - regAmount }));
      } else if (regItemCategory === 'diamonds') {
        if (stats.diamonds < regAmount) { alert('보유 다이아가 부족합니다.'); return; }
        itemTitle = `${regAmount.toLocaleString()} 다이아 (💎)`;
        onUpdateStats((prev) => ({ ...prev, diamonds: prev.diamonds - regAmount }));
      } else if (regItemCategory === 'stones') {
        if (stats.enhancementStones < regAmount) { alert('보유 강화석이 부족합니다.'); return; }
        itemTitle = `${regAmount.toLocaleString()}개 강화석 (🔮)`;
        onUpdateStats((prev) => ({ ...prev, enhancementStones: prev.enhancementStones - regAmount }));
      } else if (regItemCategory === 'scrolls') {
        if (stats.ancientScrolls < regAmount) { alert('보유 파괴 방지 보호서가 부족합니다.'); return; }
        itemTitle = `${regAmount.toLocaleString()}장 고대 보호 주문서 (📜)`;
        onUpdateStats((prev) => ({ ...prev, ancientScrolls: prev.ancientScrolls - regAmount }));
      } else if (regItemCategory === 'potions') {
        if (stats.luckyPotions < regAmount) { alert('보유 행운의 물약이 부족합니다.'); return; }
        itemTitle = `${regAmount.toLocaleString()}개 행운의 비약 (🧪)`;
        onUpdateStats((prev) => ({ ...prev, luckyPotions: prev.luckyPotions - regAmount }));
      } else if (regItemCategory === 'spirit_dust') {
        if ((stats.spiritDust || 0) < regAmount) { alert('보유 검령 소울 가루가 부족합니다.'); return; }
        itemTitle = `${regAmount.toLocaleString()}개 검령 소울 가루 (✨)`;
        onUpdateStats((prev) => ({ ...prev, spiritDust: (prev.spiritDust || 0) - regAmount }));
      } else if (regItemCategory === 'shards') {
        if ((stats.swordShards || 0) < regAmount) { alert('보유 검 파편이 부족합니다.'); return; }
        itemTitle = `${regAmount.toLocaleString()}개 검 파편 (⚔️)`;
        onUpdateStats((prev) => ({ ...prev, swordShards: (prev.swordShards || 0) - regAmount }));
      } else if (regItemCategory === 'raid_tokens') {
        if ((stats.worldBossRaidTokens || 0) < regAmount) { alert('보유 레이드 토큰이 부족합니다.'); return; }
        itemTitle = `${regAmount.toLocaleString()}개 레이드 토큰 (🎫)`;
        onUpdateStats((prev) => ({ ...prev, worldBossRaidTokens: (prev.worldBossRaidTokens || 0) - regAmount }));
      }
    }

    setIsSubmittingListing(true);
    try {
      await createMarketListing({
        sellerUid: myUid,
        sellerName: myName,
        sellerAvatar: myAvatar,
        itemType: regItemCategory,
        itemTitle,
        itemAmount,
        itemData,
        priceType: regPriceType,
        priceAmount: regPriceAmount,
      });

      sound.playSuccess();
      addLog(`[거래소 등록] [${itemTitle}] 거래소 등록 완료! (희망 가격: ${regPriceAmount.toLocaleString()} ${regPriceType.toUpperCase()})`, 'system');
      setActiveTab('market');
      setMarketSuccessMsg('🎉 거래소에 판매 물품이 성공적으로 등록되었습니다.');
      setTimeout(() => setMarketSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || '물품 등록에 실패했습니다.');
    } finally {
      setIsSubmittingListing(false);
    }
  };

  // ------------------------------------------------
  // Direct 1:1 Trade Functions
  // ------------------------------------------------

  // Create 1:1 Trade Room
  const handleCreateTradeRoom = async () => {
    try {
      const roomId = await createDirectTradeRoom({
        hostUid: myUid,
        hostName: myName,
        hostAvatar: myAvatar,
      });
      setActiveTradeRoomId(roomId);
      setMyOfferDraft({ ...EMPTY_OFFER });
      sound.playClick();
      addLog('[1:1 거래] 직거래 방을 생성했습니다. 코드를 공유하여 거래 상대를 초대하세요.', 'system');
    } catch (err: any) {
      alert(err.message || '거래 방 생성 실패');
    }
  };

  // Join 1:1 Trade Room
  const handleJoinTradeRoom = async (codeOrId: string) => {
    if (!codeOrId.trim()) return;
    try {
      const roomId = await joinDirectTradeRoom({
        roomIdOrCode: codeOrId.trim(),
        guestUid: myUid,
        guestName: myName,
        guestAvatar: myAvatar,
      });
      setActiveTradeRoomId(roomId);
      setMyOfferDraft({ ...EMPTY_OFFER });
      setTradeJoinCode('');
      sound.playSuccess();
      addLog('[1:1 거래] 직거래 방에 참가했습니다!', 'system');
    } catch (err: any) {
      alert(err.message || '거래 방 참가 실패');
    }
  };

  // Leave / Cancel Room
  const handleLeaveTradeRoom = async () => {
    if (!activeTradeRoomId) return;
    await leaveDirectTradeRoom(activeTradeRoomId, myUid, `${myName}님이 거래를 취소하고 나갔습니다.`);
    setActiveTradeRoomId(null);
    setActiveTradeRoom(null);
    sound.playClick();
    addLog('[1:1 거래] 직거래 방에서 퇴장했습니다.', 'system');
  };

  // Save My Local Offer Draft to Firestore
  const handleSaveOfferToRoom = async () => {
    if (!activeTradeRoomId || !activeTradeRoom) return;
    const isHost = activeTradeRoom.hostUid === myUid;
    await updateDirectTradeOffer({
      roomId: activeTradeRoomId,
      isHost,
      offer: myOfferDraft,
    });
    setIsEditingOfferModal(false);
    sound.playClick();
  };

  // Toggle Lock
  const handleToggleLock = async () => {
    if (!activeTradeRoomId || !activeTradeRoom) return;
    const isHost = activeTradeRoom.hostUid === myUid;
    const currentLocked = isHost ? activeTradeRoom.hostLocked : activeTradeRoom.guestLocked;
    await setDirectTradeLock({
      roomId: activeTradeRoomId,
      isHost,
      locked: !currentLocked,
    });
    sound.playClick();
  };

  // Final Confirm
  const handleConfirmExchange = async () => {
    if (!activeTradeRoomId || !activeTradeRoom) return;
    const isHost = activeTradeRoom.hostUid === myUid;
    try {
      await confirmDirectTradeExchange({
        roomId: activeTradeRoomId,
        isHost,
      });
      sound.playSuccess();
    } catch (err: any) {
      alert(err.message || '최종 확인 처리 실패');
    }
  };

  // Send Trade Chat
  const handleSendTradeChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tradeChatInput.trim() || !activeTradeRoomId) return;
    const text = tradeChatInput.trim();
    setTradeChatInput('');
    await sendTradeChatMessage({
      roomId: activeTradeRoomId,
      senderUid: myUid,
      senderName: myName,
      text,
    });
  };

  // Helper to format item badge icon
  const getItemIcon = (type: TradeItemType): PixelIconName => {
    switch (type) {
      case 'sword': return 'sword';
      case 'gold': return 'gold';
      case 'diamonds': return 'diamond';
      case 'stones': return 'stone';
      case 'scrolls': return 'scroll';
      case 'potions': return 'potion';
      case 'spirit_dust': return 'sparkle';
      case 'rune': return 'rune';
      case 'gem': return 'diamond';
      case 'shards': return 'shard';
      case 'raid_tokens': return 'trophy';
      case 'rebirth': return 'sparkle';
      case 'super_rebirth': return 'trophy';
      case 'rebirth_points': return 'stone';
      case 'cheat_menu_pass': return 'sword';
      default: return 'sword';
    }
  };

  // Helper for price color
  const getPriceTheme = (priceType: TradePriceType) => {
    switch (priceType) {
      case 'gold': return { color: 'text-amber-400', label: '골드 (G)', icon: 'gold' as PixelIconName };
      case 'diamonds': return { color: 'text-cyan-400', label: '다이아 (💎)', icon: 'diamond' as PixelIconName };
      case 'stones': return { color: 'text-purple-400', label: '강화석 (🔮)', icon: 'stone' as PixelIconName };
      case 'scrolls': return { color: 'text-emerald-400', label: '보호서 (📜)', icon: 'scroll' as PixelIconName };
      case 'potions': return { color: 'text-rose-400', label: '행운약 (🧪)', icon: 'potion' as PixelIconName };
      case 'spirit_dust': return { color: 'text-pink-400', label: '소울가루 (✨)', icon: 'sparkle' as PixelIconName };
      case 'rebirth': return { color: 'text-purple-400', label: '환생 (🔄)', icon: 'sparkle' as PixelIconName };
      case 'super_rebirth': return { color: 'text-amber-400', label: '초환생 (👑)', icon: 'trophy' as PixelIconName };
      case 'rebirth_points': return { color: 'text-indigo-400', label: 'RP (⚡)', icon: 'stone' as PixelIconName };
      default: return { color: 'text-neutral-300', label: '재화', icon: 'gold' as PixelIconName };
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 flex flex-col gap-4 font-pixel">
      {/* Top Banner & Header */}
      <div className="bg-neutral-900 border-4 border-neutral-800 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-neutral-950 rounded-lg border-2 border-amber-500/60 shadow-inner">
            <Store className="w-7 h-7 text-amber-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-amber-300 flex items-center gap-2">
              <span>유저 자유 거래소 & 실시간 직거래</span>
              <span className="text-xs px-2 py-0.5 bg-amber-950 text-amber-300 rounded border border-amber-600 font-mono">
                P2P Market & Direct Trade
              </span>
            </h2>
            <p className="text-xs text-neutral-400 font-sans mt-0.5">
              전체 유저와 검 보관함의 명검, 골드, 다이아, 강화석, 보호서, 룬, 보석을 자유롭게 사고팔거나 1:1 실시간 맞교환하세요!
            </p>
          </div>
        </div>

        {/* User Trade Profile Badge */}
        <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-700 text-xs font-mono">
          <span className="text-lg">{myAvatar}</span>
          <div className="flex flex-col">
            <span className="font-bold text-neutral-200">{myName}</span>
            <span className="text-[10px] text-neutral-500">ID: {myUid.substring(0, 10)}...</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b-2 border-neutral-800 pb-2">
        <button
          onClick={() => { sound.playClick(); setActiveTab('market'); }}
          className={`px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm flex items-center gap-2 border transition-all cursor-pointer ${
            activeTab === 'market'
              ? 'bg-amber-950/80 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          <Store className="w-4 h-4 text-amber-400" />
          <span>자유 거래소 ({marketListings.length})</span>
        </button>

        <button
          onClick={() => { sound.playClick(); setActiveTab('direct_trade'); }}
          className={`px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm flex items-center gap-2 border transition-all cursor-pointer ${
            activeTab === 'direct_trade'
              ? 'bg-indigo-950/80 border-indigo-400 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span>1:1 실시간 직거래 {activeTradeRoom ? '(진행 중)' : ''}</span>
        </button>

        <button
          onClick={() => { sound.playClick(); setActiveTab('register'); }}
          className={`px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm flex items-center gap-2 border transition-all cursor-pointer ${
            activeTab === 'register'
              ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>물품 판매 등록</span>
        </button>

        <button
          onClick={() => { sound.playClick(); setActiveTab('my_listings'); }}
          className={`px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm flex items-center gap-2 border transition-all cursor-pointer ${
            activeTab === 'my_listings'
              ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4 text-cyan-400" />
          <span>내 등록 관리 & 정산함 ({myListings.length})</span>
        </button>
      </div>

      {/* Notifications */}
      {marketSuccessMsg && (
        <div className="bg-emerald-950/90 border-2 border-emerald-500 text-emerald-200 px-4 py-2.5 rounded-lg text-xs font-mono flex items-center justify-between shadow-lg animate-bounce">
          <span>{marketSuccessMsg}</span>
          <button onClick={() => setMarketSuccessMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}
      {marketErrorMsg && (
        <div className="bg-rose-950/90 border-2 border-rose-500 text-rose-200 px-4 py-2.5 rounded-lg text-xs font-mono flex items-center justify-between shadow-lg">
          <span>{marketErrorMsg}</span>
          <button onClick={() => setMarketErrorMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: PUBLIC MARKETPLACE LISTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'market' && (
        <div className="flex flex-col gap-4">
          {/* Filter & Search Bar */}
          <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow">
            {/* Category Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono w-full md:w-auto">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded border transition-colors cursor-pointer ${
                  categoryFilter === 'all' ? 'bg-amber-500 text-neutral-950 font-bold border-amber-300' : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setCategoryFilter('sword')}
                className={`px-3 py-1.5 rounded border transition-colors flex items-center gap-1 cursor-pointer ${
                  categoryFilter === 'sword' ? 'bg-cyan-500 text-neutral-950 font-bold border-cyan-300' : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                }`}
              >
                <PixelIcon name="sword" size={14} />
                <span>검 보관함 검</span>
              </button>
              <button
                onClick={() => setCategoryFilter('currency')}
                className={`px-3 py-1.5 rounded border transition-colors flex items-center gap-1 cursor-pointer ${
                  categoryFilter === 'currency' ? 'bg-amber-500 text-neutral-950 font-bold border-amber-300' : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                }`}
              >
                <PixelIcon name="gold" size={14} />
                <span>골드·다이아·강화석</span>
              </button>
              <button
                onClick={() => setCategoryFilter('consumable')}
                className={`px-3 py-1.5 rounded border transition-colors flex items-center gap-1 cursor-pointer ${
                  categoryFilter === 'consumable' ? 'bg-purple-500 text-neutral-950 font-bold border-purple-300' : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                }`}
              >
                <PixelIcon name="scroll" size={14} />
                <span>보호서·물약·가루</span>
              </button>
              <button
                onClick={() => setCategoryFilter('rune_gem')}
                className={`px-3 py-1.5 rounded border transition-colors flex items-center gap-1 cursor-pointer ${
                  categoryFilter === 'rune_gem' ? 'bg-pink-500 text-neutral-950 font-bold border-pink-300' : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                }`}
              >
                <PixelIcon name="rune" size={14} />
                <span>룬·소켓 보석</span>
              </button>
              <button
                onClick={() => setCategoryFilter('rebirth')}
                className={`px-3 py-1.5 rounded border transition-colors flex items-center gap-1 cursor-pointer ${
                  categoryFilter === 'rebirth' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold border-purple-300 shadow' : 'bg-neutral-950 text-purple-400 border-neutral-800'
                }`}
              >
                <span>🔄</span>
                <span>환생·초환·RP</span>
              </button>
              <button
                onClick={() => setCategoryFilter('cheat')}
                className={`px-3 py-1.5 rounded border transition-colors flex items-center gap-1 cursor-pointer ${
                  categoryFilter === 'cheat' ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-neutral-950 font-bold border-amber-300 shadow animate-pulse' : 'bg-neutral-950 text-amber-400 border-neutral-800'
                }`}
              >
                <span>👑</span>
                <span>어드민 치트 증서</span>
              </button>
            </div>

            {/* Search Input & Price Sorter */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-60">
                <Search className="w-4 h-4 text-neutral-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="아이템 / 판매자 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-200 placeholder-neutral-600 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <select
                value={priceSort}
                onChange={(e: any) => setPriceSort(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-300 font-mono focus:outline-none"
              >
                <option value="newest">최신 등록순</option>
                <option value="price_asc">가격 낮은순</option>
                <option value="price_desc">가격 높은순</option>
              </select>
            </div>
          </div>

          {/* Listings Grid */}
          {filteredListings.length === 0 ? (
            <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-12 flex flex-col items-center justify-center gap-3 text-center text-neutral-500">
              <Store className="w-12 h-12 text-neutral-700" />
              <h4 className="font-bold text-sm text-neutral-300">현재 등록된 거래소 물품이 없습니다.</h4>
              <p className="text-xs font-mono max-w-md">
                상단의 <strong>[물품 판매 등록]</strong> 탭을 눌러 소지한 검, 골드, 다이아, 강화석 등을 거래소에 첫 번째로 올려보세요!
              </p>
              <button
                onClick={() => setActiveTab('register')}
                className="mt-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold rounded text-xs font-mono cursor-pointer"
              >
                + 첫 물품 등록하기
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredListings.map((listing) => {
                const isMine = listing.sellerUid === myUid;
                const priceTheme = getPriceTheme(listing.priceType);
                const isSword = listing.itemType === 'sword' && listing.itemData?.storedSword;
                const swordData = listing.itemData?.storedSword;

                return (
                  <div
                    key={listing.id}
                    className={`bg-neutral-900 border-2 rounded-lg p-3.5 flex flex-col justify-between gap-3 shadow transition-all hover:border-amber-500 ${
                      isMine ? 'border-cyan-800/80 bg-gradient-to-b from-neutral-900 to-cyan-950/20' : 'border-neutral-800'
                    }`}
                  >
                    {/* Header: Seller & Status */}
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{listing.sellerAvatar || '⚔️'}</span>
                        <span className="font-bold text-neutral-200">{listing.sellerName}</span>
                        {isMine && (
                          <span className="text-[10px] bg-cyan-950 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-700">
                            내 등록
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-500">
                        {new Date(listing.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Item Body */}
                    <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80 flex items-center gap-3">
                      <div className={`p-2.5 rounded border shrink-0 ${
                        listing.itemType === 'cheat_menu_pass'
                          ? 'bg-gradient-to-br from-amber-950 to-rose-950 border-amber-400 text-amber-300'
                          : listing.itemType === 'super_rebirth'
                          ? 'bg-purple-950 border-purple-400 text-purple-300'
                          : listing.itemType === 'rebirth'
                          ? 'bg-indigo-950 border-indigo-400 text-indigo-300'
                          : listing.itemType === 'rebirth_points'
                          ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
                          : 'bg-neutral-900 border-neutral-700'
                      }`}>
                        {listing.itemType === 'cheat_menu_pass' ? (
                          <span className="text-2xl">👑</span>
                        ) : listing.itemType === 'super_rebirth' ? (
                          <span className="text-2xl">⚡</span>
                        ) : listing.itemType === 'rebirth' ? (
                          <span className="text-2xl">🔄</span>
                        ) : listing.itemType === 'rebirth_points' ? (
                          <span className="text-2xl">🔮</span>
                        ) : (
                          <PixelIcon name={getItemIcon(listing.itemType)} size={28} />
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5 overflow-hidden">
                        <span className={`text-xs sm:text-sm font-bold truncate ${
                          listing.itemType === 'cheat_menu_pass'
                            ? 'text-amber-300 animate-pulse'
                            : listing.itemType === 'super_rebirth'
                            ? 'text-purple-300'
                            : listing.itemType === 'rebirth'
                            ? 'text-indigo-300'
                            : listing.itemType === 'rebirth_points'
                            ? 'text-cyan-300'
                            : 'text-amber-300'
                        }`}>
                          {listing.itemTitle}
                        </span>
                        {isSword && swordData ? (
                          <div className="text-[11px] text-neutral-400 font-mono">
                            <span className="text-cyan-300">W{swordData.worldId}</span> • {swordData.rarity} 등급 • 공격력 +{swordData.atkBonus}% • 골드 +{swordData.goldBonus}%
                          </div>
                        ) : listing.itemType === 'cheat_menu_pass' ? (
                          <span className="text-[11px] text-rose-400 font-mono font-bold">
                            치트 콘솔 영구 개방 + 100% 강화 성공 모드 부여
                          </span>
                        ) : listing.itemType === 'super_rebirth' ? (
                          <span className="text-[11px] text-purple-400 font-mono font-bold">
                            초환생 +{listing.itemAmount}회 즉시 지급 (전스탯 x3배)
                          </span>
                        ) : listing.itemType === 'rebirth' ? (
                          <span className="text-[11px] text-indigo-400 font-mono font-bold">
                            환생 +{listing.itemAmount}회 즉시 지급 (골드 배수 +100%)
                          </span>
                        ) : listing.itemType === 'rebirth_points' ? (
                          <span className="text-[11px] text-cyan-400 font-mono font-bold">
                            환생 포인트 +{listing.itemAmount.toLocaleString()} RP 즉시 충전
                          </span>
                        ) : (
                          <span className="text-[11px] text-neutral-400 font-mono">
                            수량: <strong className="text-neutral-200">{listing.itemAmount.toLocaleString()}</strong>개
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price & Action */}
                    <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-neutral-500 font-mono">희망 판매 가격</span>
                        <div className="flex items-center gap-1 font-mono">
                          <PixelIcon name={priceTheme.icon} size={16} />
                          <span className={`font-bold text-sm ${priceTheme.color}`}>
                            {listing.priceAmount.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-neutral-400">{priceTheme.label}</span>
                        </div>
                      </div>

                      {isMine ? (
                        <button
                          onClick={() => handleCancelListing(listing)}
                          className="py-1.5 px-3 bg-neutral-800 hover:bg-rose-950 text-rose-300 border border-rose-800/60 rounded text-xs font-mono cursor-pointer transition-colors"
                        >
                          등록 취소 (회수)
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBuyListing(listing)}
                          disabled={isBuying === listing.id}
                          className="py-2 px-4 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 disabled:opacity-50 text-neutral-950 font-bold rounded text-xs font-mono shadow cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                        >
                          {isBuying === listing.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ShoppingBag className="w-3.5 h-3.5" />
                          )}
                          <span>즉시 구매</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 1:1 REAL-TIME DIRECT TRADE (P2P ROOM) */}
      {/* ========================================================================= */}
      {activeTab === 'direct_trade' && (
        <div className="flex flex-col gap-4">
          {!activeTradeRoom ? (
            /* Direct Trade Lobby */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Column: Create or Join Room */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="bg-neutral-900 border-2 border-indigo-800/80 rounded-lg p-4 flex flex-col gap-4 shadow-xl">
                  <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2 border-b border-neutral-800 pb-2">
                    <ArrowLeftRight className="w-4 h-4 text-indigo-400" />
                    <span>실시간 1:1 직거래 방 개설 & 코드 참가</span>
                  </h3>

                  <p className="text-xs text-neutral-300 font-sans leading-relaxed">
                    다른 플레이어와 실시간으로 마주보고 아이템과 재화를 1:1 맞교환할 수 있는 안전 거래소입니다.
                  </p>

                  {/* Create Room Button */}
                  <button
                    onClick={handleCreateTradeRoom}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-lg text-xs sm:text-sm font-mono shadow-lg cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>새 직거래 방 생성 (방장)</span>
                  </button>

                  {/* Join By Room Code */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800">
                    <span className="text-xs font-mono text-neutral-400">거래 방 코드 (6자리) 직접 입력 참가:</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="예: TR-8924"
                        value={tradeJoinCode}
                        onChange={(e) => setTradeJoinCode(e.target.value.toUpperCase())}
                        className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-200 font-mono tracking-wider focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={() => handleJoinTradeRoom(tradeJoinCode)}
                        disabled={!tradeJoinCode.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded text-xs font-mono cursor-pointer"
                      >
                        입장
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Public Waiting Direct Trade Rooms */}
              <div className="lg:col-span-7 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-neutral-200 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span>대기 중인 1:1 직거래 방 ({publicTradeRooms.length})</span>
                  </h3>
                </div>

                {publicTradeRooms.length === 0 ? (
                  <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-10 flex flex-col items-center justify-center gap-2 text-center text-neutral-500">
                    <Users className="w-10 h-10 text-neutral-700" />
                    <span className="text-xs font-mono">현재 대기 중인 공개 직거래 방이 없습니다.</span>
                    <span className="text-[11px] text-neutral-600">왼쪽에서 새 방을 만들고 친구를 초대하세요!</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {publicTradeRooms.map((room) => {
                      const isMyRoom = room.hostUid === myUid;
                      return (
                        <div
                          key={room.id}
                          className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-3.5 flex flex-col justify-between gap-3 shadow hover:border-indigo-500 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-mono text-xs">
                              <span>{room.hostAvatar || '⚔️'}</span>
                              <span className="font-bold text-neutral-200">{room.hostName}</span>
                            </div>
                            <span className="text-xs font-mono bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800">
                              {room.roomCode}
                            </span>
                          </div>

                          <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800 text-[11px] font-mono text-neutral-400">
                            상태: <span className="text-amber-300 font-bold">{room.guestUid ? '거래 진행 중' : '상대방 대기 중'}</span>
                          </div>

                          <button
                            onClick={() => handleJoinTradeRoom(room.id)}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded text-xs font-mono cursor-pointer flex items-center justify-center gap-1"
                          >
                            <span>{isMyRoom ? '내 방 입장하기' : '거래 참가하기'}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Active 1:1 Trade Room View */
            <div className="flex flex-col gap-4">
              {/* Room Top Navigation & Status */}
              <div className="bg-neutral-900 border-2 border-indigo-600 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-neutral-950 px-3 py-1.5 rounded border border-indigo-700 font-mono">
                    <span className="text-xs text-neutral-400">방 코드:</span>
                    <span className="text-sm font-bold text-indigo-300 tracking-wider">{activeTradeRoom.roomCode}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(activeTradeRoom.roomCode);
                        setCodeCopied(true);
                        setTimeout(() => setCodeCopied(false), 2000);
                      }}
                      className="p-1 hover:text-white cursor-pointer ml-1"
                      title="코드 복사"
                    >
                      {codeCopied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
                    </button>
                  </div>

                  {/* Trade Phase Status Badge */}
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${
                      activeTradeRoom.status === 'completed'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                        : activeTradeRoom.status === 'locked'
                        ? 'bg-amber-950 text-amber-300 border-amber-500 animate-pulse'
                        : 'bg-neutral-950 text-neutral-300 border-neutral-700'
                    }`}>
                      {activeTradeRoom.status === 'waiting' && '상대방 입장 대기 중...'}
                      {activeTradeRoom.status === 'offering' && '아이템 제안 협상 중'}
                      {activeTradeRoom.status === 'locked' && '🔒 양측 거래 확정 완료! 최종 동의 대기'}
                      {activeTradeRoom.status === 'completed' && '🎉 거래 교환 완료!'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLeaveTradeRoom}
                  className="py-1.5 px-3 bg-neutral-950 hover:bg-rose-950 text-rose-300 border border-rose-800 rounded text-xs font-mono cursor-pointer flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>거래 취소 및 나가기</span>
                </button>
              </div>

              {tradeNotice && (
                <div className="bg-emerald-950/90 border-2 border-emerald-500 text-emerald-200 px-4 py-2.5 rounded-lg text-xs font-mono shadow">
                  {tradeNotice}
                </div>
              )}

              {/* Trade Exchange Split Screen */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. My Offer Box (Left) */}
                {(() => {
                  const isHost = activeTradeRoom.hostUid === myUid;
                  const myOffer = isHost ? activeTradeRoom.hostOffer : activeTradeRoom.guestOffer;
                  const isMyLocked = isHost ? activeTradeRoom.hostLocked : activeTradeRoom.guestLocked;
                  const isMyConfirmed = isHost ? activeTradeRoom.hostConfirmed : activeTradeRoom.guestConfirmed;

                  return (
                    <div className={`bg-neutral-900 border-2 rounded-lg p-4 flex flex-col justify-between gap-4 shadow-xl ${
                      isMyLocked ? 'border-amber-500/80 bg-gradient-to-b from-neutral-900 to-amber-950/20' : 'border-cyan-800/80'
                    }`}>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-xl">{myAvatar}</span>
                            <div>
                              <span className="text-xs sm:text-sm font-bold text-cyan-300">내 제안 목록 (My Offer)</span>
                              <span className="text-[10px] text-neutral-400 block">{myName}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isMyLocked && (
                              <span className="text-[10px] bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-600 font-mono font-bold flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                <span>잠금 완료</span>
                              </span>
                            )}
                            {isMyConfirmed && (
                              <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-600 font-mono font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>최종 승인</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Render My Selected Items */}
                        <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 min-h-[160px] flex flex-col gap-2">
                          {/* Currencies & Consumables Summary */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs font-mono">
                            {(myOffer.gold || 0) > 0 && (
                              <div className="bg-neutral-900 p-1.5 rounded border border-amber-800 flex items-center gap-1 text-amber-300">
                                <PixelIcon name="gold" size={14} />
                                <span>{myOffer.gold.toLocaleString()} G</span>
                              </div>
                            )}
                            {(myOffer.diamonds || 0) > 0 && (
                              <div className="bg-neutral-900 p-1.5 rounded border border-cyan-800 flex items-center gap-1 text-cyan-300">
                                <PixelIcon name="diamond" size={14} />
                                <span>{myOffer.diamonds.toLocaleString()} 💎</span>
                              </div>
                            )}
                            {(myOffer.stones || 0) > 0 && (
                              <div className="bg-neutral-900 p-1.5 rounded border border-purple-800 flex items-center gap-1 text-purple-300">
                                <PixelIcon name="stone" size={14} />
                                <span>{myOffer.stones.toLocaleString()} 🔮</span>
                              </div>
                            )}
                            {(myOffer.scrolls || 0) > 0 && (
                              <div className="bg-neutral-900 p-1.5 rounded border border-emerald-800 flex items-center gap-1 text-emerald-300">
                                <PixelIcon name="scroll" size={14} />
                                <span>{myOffer.scrolls.toLocaleString()}장 📜</span>
                              </div>
                            )}
                            {(myOffer.potions || 0) > 0 && (
                              <div className="bg-neutral-900 p-1.5 rounded border border-rose-800 flex items-center gap-1 text-rose-300">
                                <PixelIcon name="potion" size={14} />
                                <span>{myOffer.potions.toLocaleString()}개 🧪</span>
                              </div>
                            )}
                            {(myOffer.spiritDust || 0) > 0 && (
                              <div className="bg-neutral-900 p-1.5 rounded border border-pink-800 flex items-center gap-1 text-pink-300">
                                <PixelIcon name="sparkle" size={14} />
                                <span>{myOffer.spiritDust.toLocaleString()}개 ✨</span>
                              </div>
                            )}
                            {(myOffer.rebirths || 0) > 0 && (
                              <div className="bg-neutral-900 p-1.5 rounded border border-purple-800 flex items-center gap-1 text-purple-300">
                                <PixelIcon name="sparkle" size={14} />
                                <span>{myOffer.rebirths.toLocaleString()}회 환생 🔄</span>
                              </div>
                            )}
                            {(myOffer.superRebirths || 0) > 0 && (
                              <div className="bg-neutral-900 p-1.5 rounded border border-amber-800 flex items-center gap-1 text-amber-300 font-bold">
                                <PixelIcon name="trophy" size={14} />
                                <span>{myOffer.superRebirths.toLocaleString()}회 초환생 👑</span>
                              </div>
                            )}
                            {(myOffer.rebirthPoints || 0) > 0 && (
                              <div className="bg-neutral-900 p-1.5 rounded border border-indigo-800 flex items-center gap-1 text-indigo-300">
                                <PixelIcon name="stone" size={14} />
                                <span>{myOffer.rebirthPoints.toLocaleString()} RP ⚡</span>
                              </div>
                            )}
                          </div>

                          {myOffer.cheatPass && (
                            <div className="bg-gradient-to-r from-amber-950 via-purple-950 to-amber-950 border border-amber-400 p-2 rounded flex items-center gap-2 text-xs font-mono text-amber-300 font-bold shadow animate-pulse">
                              <span>👑</span>
                              <span>[창조주] 어드민 치트 메뉴 권한 패스 증서</span>
                            </div>
                          )}

                          {/* Stored Swords */}
                          {(myOffer.storedSwords || []).map((sword) => (
                            <div key={sword.id} className="bg-neutral-900 p-2 rounded border border-cyan-800 flex items-center justify-between text-xs font-mono">
                              <div className="flex items-center gap-2">
                                <PixelIcon name="sword" size={16} />
                                <span className="font-bold text-amber-300">+{sword.level} [{sword.name}]</span>
                                <span className="text-[10px] text-neutral-400">({sword.rarity})</span>
                              </div>
                              <span className="text-[10px] text-cyan-300">W{sword.worldId}</span>
                            </div>
                          ))}

                          {/* Runes */}
                          {(myOffer.runes || []).map((rune) => (
                            <div key={rune.id} className="bg-neutral-900 p-2 rounded border border-pink-800 flex items-center justify-between text-xs font-mono text-pink-300">
                              <div className="flex items-center gap-2">
                                <PixelIcon name="rune" size={16} />
                                <span>{rune.tier}티어 {rune.name} (+{rune.value})</span>
                              </div>
                            </div>
                          ))}

                          {/* Gems */}
                          {(myOffer.gems || []).map((gem) => (
                            <div key={gem.id} className="bg-neutral-900 p-2 rounded border border-blue-800 flex items-center justify-between text-xs font-mono text-cyan-300">
                              <div className="flex items-center gap-2">
                                <PixelIcon name="diamond" size={16} />
                                <span>T{gem.tier} {gem.name} (+{gem.statValue}%)</span>
                              </div>
                            </div>
                          ))}

                          {/* Empty Offer State */}
                          {Object.values(myOffer).every((v) => (typeof v === 'number' ? v === 0 : Array.isArray(v) && v.length === 0)) && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center text-neutral-600 text-xs py-6">
                              <span>등록된 제안 물품이 없습니다.</span>
                              <span className="text-[11px] text-neutral-500">아래의 [제안 물품 추가/수정] 버튼을 눌러보세요.</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Offer Control Actions */}
                      <div className="flex flex-col gap-2">
                        {activeTradeRoom.status !== 'completed' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setMyOfferDraft({ ...myOffer });
                                setIsEditingOfferModal(true);
                              }}
                              disabled={isMyLocked}
                              className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-200 font-bold rounded text-xs font-mono border border-neutral-600 cursor-pointer"
                            >
                              제안 물품 추가/수정
                            </button>

                            <button
                              onClick={handleToggleLock}
                              className={`flex-1 py-2 font-bold rounded text-xs font-mono border cursor-pointer transition-colors ${
                                isMyLocked
                                  ? 'bg-amber-950 text-amber-300 border-amber-500 hover:bg-amber-900'
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400'
                              }`}
                            >
                              {isMyLocked ? '🔓 잠금 해제 (수정)' : '🔒 거래 내용 확정 잠금'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Opponent's Offer Box (Right) */}
                {(() => {
                  const isHost = activeTradeRoom.hostUid === myUid;
                  const oppName = isHost ? (activeTradeRoom.guestName || '상대방 대기 중') : activeTradeRoom.hostName;
                  const oppAvatar = isHost ? (activeTradeRoom.guestAvatar || '🛡️') : activeTradeRoom.hostAvatar;
                  const oppOffer = isHost ? activeTradeRoom.guestOffer : activeTradeRoom.hostOffer;
                  const isOppLocked = isHost ? activeTradeRoom.guestLocked : activeTradeRoom.hostLocked;
                  const isOppConfirmed = isHost ? activeTradeRoom.guestConfirmed : activeTradeRoom.hostConfirmed;

                  return (
                    <div className={`bg-neutral-900 border-2 rounded-lg p-4 flex flex-col justify-between gap-4 shadow-xl ${
                      isOppLocked ? 'border-amber-500/80 bg-gradient-to-b from-neutral-900 to-amber-950/20' : 'border-neutral-800'
                    }`}>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-xl">{oppAvatar}</span>
                            <div>
                              <span className="text-xs sm:text-sm font-bold text-amber-300">상대방 제안 목록 (Opponent's Offer)</span>
                              <span className="text-[10px] text-neutral-400 block">{oppName}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isOppLocked && (
                              <span className="text-[10px] bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-600 font-mono font-bold flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                <span>잠금 완료</span>
                              </span>
                            )}
                            {isOppConfirmed && (
                              <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-600 font-mono font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>최종 승인</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Render Opponent Selected Items */}
                        <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 min-h-[160px] flex flex-col gap-2">
                          {!activeTradeRoom.guestUid && isHost ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center text-neutral-500 text-xs py-8 gap-2">
                              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                              <span>거래 상대방의 입장을 기다리고 있습니다...</span>
                              <span className="text-[11px] text-indigo-300 font-mono font-bold">방 코드: {activeTradeRoom.roomCode}</span>
                            </div>
                          ) : (
                            <>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs font-mono">
                                {(oppOffer?.gold || 0) > 0 && (
                                  <div className="bg-neutral-900 p-1.5 rounded border border-amber-800 flex items-center gap-1 text-amber-300">
                                    <PixelIcon name="gold" size={14} />
                                    <span>{oppOffer.gold.toLocaleString()} G</span>
                                  </div>
                                )}
                                {(oppOffer?.diamonds || 0) > 0 && (
                                  <div className="bg-neutral-900 p-1.5 rounded border border-cyan-800 flex items-center gap-1 text-cyan-300">
                                    <PixelIcon name="diamond" size={14} />
                                    <span>{oppOffer.diamonds.toLocaleString()} 💎</span>
                                  </div>
                                )}
                                {(oppOffer?.stones || 0) > 0 && (
                                  <div className="bg-neutral-900 p-1.5 rounded border border-purple-800 flex items-center gap-1 text-purple-300">
                                    <PixelIcon name="stone" size={14} />
                                    <span>{oppOffer.stones.toLocaleString()} 🔮</span>
                                  </div>
                                )}
                                {(oppOffer?.scrolls || 0) > 0 && (
                                  <div className="bg-neutral-900 p-1.5 rounded border border-emerald-800 flex items-center gap-1 text-emerald-300">
                                    <PixelIcon name="scroll" size={14} />
                                    <span>{oppOffer.scrolls.toLocaleString()}장 📜</span>
                                  </div>
                                )}
                                {(oppOffer?.potions || 0) > 0 && (
                                  <div className="bg-neutral-900 p-1.5 rounded border border-rose-800 flex items-center gap-1 text-rose-300">
                                    <PixelIcon name="potion" size={14} />
                                    <span>{oppOffer.potions.toLocaleString()}개 🧪</span>
                                  </div>
                                )}
                                {(oppOffer?.spiritDust || 0) > 0 && (
                                  <div className="bg-neutral-900 p-1.5 rounded border border-pink-800 flex items-center gap-1 text-pink-300">
                                    <PixelIcon name="sparkle" size={14} />
                                    <span>{oppOffer.spiritDust.toLocaleString()}개 ✨</span>
                                  </div>
                                )}
                                {(oppOffer?.rebirths || 0) > 0 && (
                                  <div className="bg-neutral-900 p-1.5 rounded border border-purple-800 flex items-center gap-1 text-purple-300">
                                    <PixelIcon name="sparkle" size={14} />
                                    <span>{oppOffer.rebirths.toLocaleString()}회 환생 🔄</span>
                                  </div>
                                )}
                                {(oppOffer?.superRebirths || 0) > 0 && (
                                  <div className="bg-neutral-900 p-1.5 rounded border border-amber-800 flex items-center gap-1 text-amber-300 font-bold">
                                    <PixelIcon name="trophy" size={14} />
                                    <span>{oppOffer.superRebirths.toLocaleString()}회 초환생 👑</span>
                                  </div>
                                )}
                                {(oppOffer?.rebirthPoints || 0) > 0 && (
                                  <div className="bg-neutral-900 p-1.5 rounded border border-indigo-800 flex items-center gap-1 text-indigo-300">
                                    <PixelIcon name="stone" size={14} />
                                    <span>{oppOffer.rebirthPoints.toLocaleString()} RP ⚡</span>
                                  </div>
                                )}
                              </div>

                              {oppOffer?.cheatPass && (
                                <div className="bg-gradient-to-r from-amber-950 via-purple-950 to-amber-950 border border-amber-400 p-2 rounded flex items-center gap-2 text-xs font-mono text-amber-300 font-bold shadow animate-pulse">
                                  <span>👑</span>
                                  <span>[창조주] 어드민 치트 메뉴 권한 패스 증서</span>
                                </div>
                              )}

                              {(oppOffer?.storedSwords || []).map((sword) => (
                                <div key={sword.id} className="bg-neutral-900 p-2 rounded border border-amber-800 flex items-center justify-between text-xs font-mono">
                                  <div className="flex items-center gap-2">
                                    <PixelIcon name="sword" size={16} />
                                    <span className="font-bold text-amber-300">+{sword.level} [{sword.name}]</span>
                                    <span className="text-[10px] text-neutral-400">({sword.rarity})</span>
                                  </div>
                                  <span className="text-[10px] text-cyan-300">W{sword.worldId}</span>
                                </div>
                              ))}

                              {(oppOffer?.runes || []).map((rune) => (
                                <div key={rune.id} className="bg-neutral-900 p-2 rounded border border-pink-800 flex items-center justify-between text-xs font-mono text-pink-300">
                                  <div className="flex items-center gap-2">
                                    <PixelIcon name="rune" size={16} />
                                    <span>{rune.tier}티어 {rune.name} (+{rune.value})</span>
                                  </div>
                                </div>
                              ))}

                              {(oppOffer?.gems || []).map((gem) => (
                                <div key={gem.id} className="bg-neutral-900 p-2 rounded border border-blue-800 flex items-center justify-between text-xs font-mono text-cyan-300">
                                  <div className="flex items-center gap-2">
                                    <PixelIcon name="diamond" size={16} />
                                    <span>T{gem.tier} {gem.name} (+{gem.statValue}%)</span>
                                  </div>
                                </div>
                              ))}

                              {oppOffer && Object.values(oppOffer).every((v) => (typeof v === 'number' ? v === 0 : Array.isArray(v) && v.length === 0)) && (
                                <div className="flex-1 flex flex-col items-center justify-center text-center text-neutral-600 text-xs py-6">
                                  <span>상대방이 아직 물품을 올리지 않았습니다.</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Opponent Status Indicator */}
                      <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800 text-xs font-mono text-center">
                        {isOppLocked ? (
                          <span className="text-amber-300 font-bold">🔒 상대방이 거래 내용을 잠금 확정했습니다.</span>
                        ) : (
                          <span className="text-neutral-500">상대방이 제안 내용을 작성/수정 중입니다...</span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Bottom Final Exchange Action Bar */}
              {activeTradeRoom.status !== 'completed' && activeTradeRoom.hostLocked && activeTradeRoom.guestLocked && (
                <div className="bg-gradient-to-r from-emerald-950 via-neutral-900 to-emerald-950 border-2 border-emerald-500 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl animate-pulse">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>양측 제안 잠금 완료! 최종 교환을 승인하세요.</span>
                    </span>
                    <span className="text-xs text-neutral-300 font-sans">
                      양측 플레이어 모두 [최종 교환 확인] 버튼을 누르면 거래가 안전하게 즉시 성사됩니다.
                    </span>
                  </div>

                  <button
                    onClick={handleConfirmExchange}
                    className="py-3 px-6 bg-gradient-to-r from-emerald-500 to-green-400 hover:from-emerald-400 hover:to-green-300 text-neutral-950 font-bold text-sm font-mono rounded-lg shadow-xl cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                  >
                    🤝 최종 교환 확인 (Confirm Trade)
                  </button>
                </div>
              )}

              {/* Real-time 1:1 Trade Chat */}
              <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-3.5 flex flex-col gap-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 border-b border-neutral-800 pb-2">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <span>1:1 실시간 거래 채팅</span>
                </div>

                <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800 h-32 overflow-y-auto flex flex-col gap-1.5 text-xs font-mono">
                  {tradeChatMessages.length === 0 ? (
                    <span className="text-neutral-600 text-center py-6">대화 내용이 없습니다. 채팅을 시작해보세요!</span>
                  ) : (
                    tradeChatMessages.map((msg) => {
                      const isMe = msg.senderUid === myUid;
                      return (
                        <div
                          key={msg.id}
                          className={`flex items-start gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isMe && <span className="text-neutral-500 font-bold">[{msg.senderName}]:</span>}
                          <span className={`px-2 py-1 rounded max-w-[80%] ${
                            isMe ? 'bg-indigo-900/60 text-indigo-200 border border-indigo-700' : 'bg-neutral-900 text-neutral-300 border border-neutral-800'
                          }`}>
                            {msg.text}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendTradeChat} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="거래 메시지 입력..."
                    value={tradeChatInput}
                    onChange={(e) => setTradeChatInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded text-xs font-mono cursor-pointer flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>전송</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REGISTER NEW MARKETPLACE LISTING */}
      {/* ========================================================================= */}
      {activeTab === 'register' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="bg-neutral-900 border-2 border-emerald-800/80 rounded-lg p-4 flex flex-col gap-4 shadow-xl">
              <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2 border-b border-neutral-800 pb-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>거래소 판매 물품 등록하기 (Register Item)</span>
              </h3>

              {/* 1. Item Category Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-neutral-400">1. 판매할 물품 종류 선택:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setRegItemCategory('sword')}
                    className={`p-2.5 rounded border transition-colors flex items-center gap-2 cursor-pointer ${
                      regItemCategory === 'sword' ? 'bg-cyan-950 border-cyan-400 text-cyan-300 font-bold' : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <PixelIcon name="sword" size={16} />
                    <span>검 보관함 검</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegItemCategory('gold')}
                    className={`p-2.5 rounded border transition-colors flex items-center gap-2 cursor-pointer ${
                      regItemCategory === 'gold' ? 'bg-amber-950 border-amber-400 text-amber-300 font-bold' : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <PixelIcon name="gold" size={16} />
                    <span>골드 (G)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegItemCategory('diamonds')}
                    className={`p-2.5 rounded border transition-colors flex items-center gap-2 cursor-pointer ${
                      regItemCategory === 'diamonds' ? 'bg-cyan-950 border-cyan-400 text-cyan-300 font-bold' : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <PixelIcon name="diamond" size={16} />
                    <span>다이아 (💎)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegItemCategory('stones')}
                    className={`p-2.5 rounded border transition-colors flex items-center gap-2 cursor-pointer ${
                      regItemCategory === 'stones' ? 'bg-purple-950 border-purple-400 text-purple-300 font-bold' : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <PixelIcon name="stone" size={16} />
                    <span>강화석 (🔮)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegItemCategory('scrolls')}
                    className={`p-2.5 rounded border transition-colors flex items-center gap-2 cursor-pointer ${
                      regItemCategory === 'scrolls' ? 'bg-emerald-950 border-emerald-400 text-emerald-300 font-bold' : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <PixelIcon name="scroll" size={16} />
                    <span>고대 보호서</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegItemCategory('potions')}
                    className={`p-2.5 rounded border transition-colors flex items-center gap-2 cursor-pointer ${
                      regItemCategory === 'potions' ? 'bg-rose-950 border-rose-400 text-rose-300 font-bold' : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <PixelIcon name="potion" size={16} />
                    <span>행운의 물약</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegItemCategory('spirit_dust')}
                    className={`p-2.5 rounded border transition-colors flex items-center gap-2 cursor-pointer ${
                      regItemCategory === 'spirit_dust' ? 'bg-pink-950 border-pink-400 text-pink-300 font-bold' : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <PixelIcon name="sparkle" size={16} />
                    <span>검령 소울 가루</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegItemCategory('rune')}
                    className={`p-2.5 rounded border transition-colors flex items-center gap-2 cursor-pointer ${
                      regItemCategory === 'rune' ? 'bg-pink-950 border-pink-400 text-pink-300 font-bold' : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <PixelIcon name="rune" size={16} />
                    <span>인벤토리 룬</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegItemCategory('rebirth')}
                    className={`p-2.5 rounded border transition-colors flex items-center gap-2 cursor-pointer ${
                      regItemCategory === 'rebirth' ? 'bg-purple-950 border-purple-400 text-purple-300 font-bold' : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <PixelIcon name="sparkle" size={16} />
                    <span>환생 횟수 (🔄)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegItemCategory('super_rebirth')}
                    className={`p-2.5 rounded border transition-colors flex items-center gap-2 cursor-pointer ${
                      regItemCategory === 'super_rebirth' ? 'bg-amber-950 border-amber-400 text-amber-300 font-bold' : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <PixelIcon name="trophy" size={16} />
                    <span>초환생 횟수 (👑)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegItemCategory('rebirth_points')}
                    className={`p-2.5 rounded border transition-colors flex items-center gap-2 cursor-pointer ${
                      regItemCategory === 'rebirth_points' ? 'bg-indigo-950 border-indigo-400 text-indigo-300 font-bold' : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <PixelIcon name="stone" size={16} />
                    <span>환생 포인트 (⚡)</span>
                  </button>

                  {(stats.adminUnlocked || stats.cheatUnlocked) && (
                    <button
                      type="button"
                      onClick={() => setRegItemCategory('cheat_menu_pass')}
                      className={`p-2.5 rounded border transition-colors flex items-center gap-2 cursor-pointer ${
                        regItemCategory === 'cheat_menu_pass' ? 'bg-gradient-to-r from-amber-950 to-purple-950 border-amber-400 text-amber-300 font-bold animate-pulse' : 'bg-neutral-950 border-amber-800 text-amber-400'
                      }`}
                    >
                      <span>👑</span>
                      <span>어드민 치트 증서</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Cheat Pass Notice */}
              {regItemCategory === 'cheat_menu_pass' && (
                <div className="bg-amber-950/40 border border-amber-500/80 p-3 rounded text-xs font-mono text-amber-200">
                  👑 <strong>창조주 어드민 권한 패스 증서 등록</strong>: 이 아이템을 구매한 플레이어는 어드민/치트 메뉴 권한과 100만 다이아, 100 환생, 10 초환생 혜택이 즉시 영구 해금됩니다.
                </div>
              )}

              {/* 2. Specific Item Picking UI */}
              {regItemCategory === 'sword' && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono text-neutral-400">보관함에서 판매할 검 선택:</label>
                    {onOpenVaultTab && (
                      <button
                        onClick={onOpenVaultTab}
                        className="text-[11px] text-cyan-400 hover:underline font-mono"
                      >
                        검 보관함 바로가기 →
                      </button>
                    )}
                  </div>

                  {(stats.swordVault?.length || 0) === 0 ? (
                    <div className="bg-neutral-950 p-6 rounded border border-neutral-800 text-center text-xs font-mono text-neutral-500">
                      보관함에 저장된 검이 없습니다. 먼저 [환생/차원 - 검 보관함]에서 검을 등록하세요!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {(stats.swordVault || []).map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedVaultSwordId(s.id)}
                          className={`p-2.5 rounded border text-left flex items-center justify-between font-mono cursor-pointer transition-colors ${
                            selectedVaultSwordId === s.id
                              ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <PixelIcon name="sword" size={16} />
                            <div>
                              <div className="text-xs font-bold">+{s.level} {s.name}</div>
                              <div className="text-[10px] text-neutral-400">{s.rarity} 등급 (W{s.worldId})</div>
                            </div>
                          </div>
                          {selectedVaultSwordId === s.id && <Check className="w-4 h-4 text-cyan-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {regItemCategory === 'rune' && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-mono text-neutral-400">판매할 인벤토리 룬 선택:</label>
                  {(stats.inventoryRunes?.length || 0) === 0 ? (
                    <div className="bg-neutral-950 p-6 rounded border border-neutral-800 text-center text-xs font-mono text-neutral-500">
                      인벤토리에 보유 중인 미장착 룬이 없습니다.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {(stats.inventoryRunes || []).map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setSelectedRuneId(r.id)}
                          className={`p-2.5 rounded border text-left flex items-center justify-between font-mono cursor-pointer transition-colors ${
                            selectedRuneId === r.id
                              ? 'bg-pink-950 border-pink-400 text-pink-300'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <PixelIcon name="rune" size={16} />
                            <div>
                              <div className="text-xs font-bold">{r.tier}티어 {r.name}</div>
                              <div className="text-[10px] text-neutral-400">수치: +{r.value}</div>
                            </div>
                          </div>
                          {selectedRuneId === r.id && <Check className="w-4 h-4 text-pink-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Currency Amount Input */}
              {!['sword', 'rune', 'gem', 'cheat_menu_pass'].includes(regItemCategory) && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-neutral-400">판매 수량 입력:</span>
                    <span className="text-neutral-500">
                      보유: {
                        regItemCategory === 'gold' ? `${stats.gold.toLocaleString()} G` :
                        regItemCategory === 'diamonds' ? `${stats.diamonds.toLocaleString()} 💎` :
                        regItemCategory === 'stones' ? `${stats.enhancementStones.toLocaleString()} 🔮` :
                        regItemCategory === 'scrolls' ? `${stats.ancientScrolls.toLocaleString()}장 📜` :
                        regItemCategory === 'potions' ? `${stats.luckyPotions.toLocaleString()}개 🧪` :
                        regItemCategory === 'spirit_dust' ? `${(stats.spiritDust || 0).toLocaleString()}개 ✨` :
                        regItemCategory === 'rebirth' ? `${(stats.rebirthCount || 0).toLocaleString()}회 🔄` :
                        regItemCategory === 'super_rebirth' ? `${(stats.superRebirthCount || 0).toLocaleString()}회 👑` :
                        regItemCategory === 'rebirth_points' ? `${(stats.rebirthPoints || 0).toLocaleString()} RP ⚡` :
                        regItemCategory === 'shards' ? `${(stats.swordShards || 0).toLocaleString()}개 ⚔️` :
                        `${(stats.worldBossRaidTokens || 0).toLocaleString()}개 🎫`
                      }
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      value={regAmount}
                      onChange={(e) => setRegAmount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-200 font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (regItemCategory === 'gold') setRegAmount(stats.gold);
                        if (regItemCategory === 'diamonds') setRegAmount(stats.diamonds);
                        if (regItemCategory === 'stones') setRegAmount(stats.enhancementStones);
                        if (regItemCategory === 'scrolls') setRegAmount(stats.ancientScrolls);
                        if (regItemCategory === 'potions') setRegAmount(stats.luckyPotions);
                        if (regItemCategory === 'spirit_dust') setRegAmount(stats.spiritDust || 0);
                        if (regItemCategory === 'rebirth') setRegAmount(stats.adminUnlocked ? 100 : (stats.rebirthCount || 0));
                        if (regItemCategory === 'super_rebirth') setRegAmount(stats.adminUnlocked ? 10 : (stats.superRebirthCount || 0));
                        if (regItemCategory === 'rebirth_points') setRegAmount(stats.adminUnlocked ? 100000 : (stats.rebirthPoints || 0));
                      }}
                      className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono rounded cursor-pointer"
                    >
                      최대 (MAX)
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Desired Price Configuration */}
              <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800">
                <label className="text-xs font-mono text-neutral-400">2. 받고 싶은 판매 대가 (희망 가격):</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  {(['gold', 'diamonds', 'stones', 'scrolls', 'rebirth', 'super_rebirth', 'rebirth_points'] as TradePriceType[]).map((pType) => {
                    const pTheme = getPriceTheme(pType);
                    return (
                      <button
                        key={pType}
                        type="button"
                        onClick={() => setRegPriceType(pType)}
                        className={`p-2 rounded border flex items-center gap-1.5 cursor-pointer ${
                          regPriceType === pType ? 'bg-amber-950 border-amber-400 text-amber-300 font-bold' : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                        }`}
                      >
                        <PixelIcon name={pTheme.icon} size={14} />
                        <span>{pTheme.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono text-neutral-400">희망 수량:</span>
                  <input
                    type="number"
                    min={1}
                    value={regPriceAmount}
                    onChange={(e) => setRegPriceAmount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleCreateListing}
                disabled={isSubmittingListing}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs sm:text-sm font-mono shadow-lg cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
              >
                {isSubmittingListing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Store className="w-4 h-4" />
                )}
                <span>거래소에 판매 물품 공식 등록하기</span>
              </button>
            </div>
          </div>

          {/* Right Info Box */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-4 flex flex-col gap-2.5 text-xs font-mono text-neutral-400 leading-relaxed shadow">
              <h4 className="font-bold text-neutral-200 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>거래소 등록 안내</span>
              </h4>
              <ul className="list-disc pl-4 flex flex-col gap-1.5 text-[11px] text-neutral-400">
                <li>거래소에 등록된 검은 보관함에서 위탁 상태로 전환됩니다.</li>
                <li>판매가 완료되기 전까지는 언제든지 [내 등록 관리]에서 취소하고 회수할 수 있습니다.</li>
                <li>다른 플레이어가 구매 시 실시간으로 [정산함]에 판매 대금이 입금됩니다.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MY LISTINGS & SETTLEMENTS */}
      {/* ========================================================================= */}
      {activeTab === 'my_listings' && (
        <div className="flex flex-col gap-4">
          <div className="bg-neutral-900 border-2 border-cyan-800/80 rounded-lg p-4 flex flex-col gap-4 shadow-xl">
            <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2 border-b border-neutral-800 pb-2">
              <Package className="w-4 h-4 text-cyan-400" />
              <span>내 등록 물품 관리 및 판매 대금 정산함</span>
            </h3>

            {myListings.length === 0 ? (
              <div className="bg-neutral-950 p-12 rounded border border-neutral-800 text-center text-xs font-mono text-neutral-500">
                내가 등록한 물품 내역이 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {myListings.map((listing) => {
                  const priceTheme = getPriceTheme(listing.priceType);
                  return (
                    <div
                      key={listing.id}
                      className={`bg-neutral-950 border-2 rounded-lg p-3.5 flex flex-col justify-between gap-3 ${
                        listing.status === 'sold'
                          ? 'border-emerald-500 bg-gradient-to-b from-neutral-950 to-emerald-950/20'
                          : listing.status === 'cancelled'
                          ? 'border-neutral-800 opacity-60'
                          : 'border-cyan-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          listing.status === 'sold'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                            : listing.status === 'cancelled'
                            ? 'bg-neutral-900 text-neutral-500 border-neutral-800'
                            : 'bg-cyan-950 text-cyan-300 border-cyan-600'
                        }`}>
                          {listing.status === 'sold' ? '🎉 판매 완료!' : listing.status === 'cancelled' ? '등록 취소됨' : '판매 진행 중'}
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          {new Date(listing.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 bg-neutral-900 p-2.5 rounded border border-neutral-800">
                        <PixelIcon name={getItemIcon(listing.itemType)} size={24} />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-neutral-100">{listing.itemTitle}</span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            가격: {listing.priceAmount.toLocaleString()} {priceTheme.label}
                          </span>
                        </div>
                      </div>

                      {/* Action based on status */}
                      {listing.status === 'sold' ? (
                        <button
                          onClick={() => handleSettleSoldListing(listing)}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold rounded text-xs font-mono shadow cursor-pointer flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>판매 대금 수령 (+{listing.priceAmount.toLocaleString()} {listing.priceType.toUpperCase()})</span>
                        </button>
                      ) : listing.status === 'active' ? (
                        <button
                          onClick={() => handleCancelListing(listing)}
                          className="w-full py-1.5 bg-neutral-900 hover:bg-rose-950 text-rose-300 border border-rose-800/60 rounded text-xs font-mono cursor-pointer"
                        >
                          등록 취소 (아이템 회수)
                        </button>
                      ) : (
                        <button
                          onClick={() => deleteMarketListing(listing.id)}
                          className="w-full py-1 bg-neutral-900 text-neutral-500 rounded text-[10px] font-mono cursor-pointer"
                        >
                          내역 삭제
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1:1 DIRECT TRADE OFFER EDITING MODAL */}
      {/* ========================================================================= */}
      {isEditingOfferModal && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border-4 border-indigo-600 rounded-lg p-5 max-w-2xl w-full flex flex-col gap-4 shadow-2xl font-pixel max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-indigo-400" />
                <span>1:1 맞교환 제안 물품 구성</span>
              </h3>
              <button onClick={() => setIsEditingOfferModal(false)} className="text-neutral-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Currencies Sliders / Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              {/* Gold */}
              <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800 flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-amber-300 font-bold flex items-center gap-1"><PixelIcon name="gold" size={14} /> 골드</span>
                  <span className="text-neutral-400">보유: {stats.gold.toLocaleString()} G</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={stats.gold}
                  value={myOfferDraft.gold || ''}
                  onChange={(e) => setMyOfferDraft({ ...myOfferDraft, gold: Math.min(stats.gold, Math.max(0, parseInt(e.target.value) || 0)) })}
                  placeholder="0"
                  className="px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-neutral-200"
                />
              </div>

              {/* Diamonds */}
              <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800 flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-cyan-300 font-bold flex items-center gap-1"><PixelIcon name="diamond" size={14} /> 다이아</span>
                  <span className="text-neutral-400">보유: {stats.diamonds.toLocaleString()} 💎</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={stats.diamonds}
                  value={myOfferDraft.diamonds || ''}
                  onChange={(e) => setMyOfferDraft({ ...myOfferDraft, diamonds: Math.min(stats.diamonds, Math.max(0, parseInt(e.target.value) || 0)) })}
                  placeholder="0"
                  className="px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-neutral-200"
                />
              </div>

              {/* Enhancement Stones */}
              <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800 flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-purple-300 font-bold flex items-center gap-1"><PixelIcon name="stone" size={14} /> 강화석</span>
                  <span className="text-neutral-400">보유: {stats.enhancementStones.toLocaleString()} 🔮</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={stats.enhancementStones}
                  value={myOfferDraft.stones || ''}
                  onChange={(e) => setMyOfferDraft({ ...myOfferDraft, stones: Math.min(stats.enhancementStones, Math.max(0, parseInt(e.target.value) || 0)) })}
                  placeholder="0"
                  className="px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-neutral-200"
                />
              </div>

              {/* Protection Scrolls */}
              <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800 flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-emerald-300 font-bold flex items-center gap-1"><PixelIcon name="scroll" size={14} /> 보호 주문서</span>
                  <span className="text-neutral-400">보유: {stats.ancientScrolls}장</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={stats.ancientScrolls}
                  value={myOfferDraft.scrolls || ''}
                  onChange={(e) => setMyOfferDraft({ ...myOfferDraft, scrolls: Math.min(stats.ancientScrolls, Math.max(0, parseInt(e.target.value) || 0)) })}
                  placeholder="0"
                  className="px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-neutral-200"
                />
              </div>

              {/* Lucky Potions */}
              <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800 flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-rose-300 font-bold flex items-center gap-1"><PixelIcon name="potion" size={14} /> 행운의 물약</span>
                  <span className="text-neutral-400">보유: {stats.luckyPotions}개</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={stats.luckyPotions}
                  value={myOfferDraft.potions || ''}
                  onChange={(e) => setMyOfferDraft({ ...myOfferDraft, potions: Math.min(stats.luckyPotions, Math.max(0, parseInt(e.target.value) || 0)) })}
                  placeholder="0"
                  className="px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-neutral-200"
                />
              </div>

              {/* Spirit Dust */}
              <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800 flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-pink-300 font-bold flex items-center gap-1"><PixelIcon name="sparkle" size={14} /> 검령 소울 가루</span>
                  <span className="text-neutral-400">보유: {stats.spiritDust || 0}개</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={stats.spiritDust || 0}
                  value={myOfferDraft.spiritDust || ''}
                  onChange={(e) => setMyOfferDraft({ ...myOfferDraft, spiritDust: Math.min(stats.spiritDust || 0, Math.max(0, parseInt(e.target.value) || 0)) })}
                  placeholder="0"
                  className="px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-neutral-200"
                />
              </div>

              {/* Rebirth Count */}
              <div className="bg-neutral-950 p-2.5 rounded border border-purple-900 flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-purple-300 font-bold flex items-center gap-1"><PixelIcon name="sparkle" size={14} /> 환생 횟수 (Rebirths)</span>
                  <span className="text-neutral-400">보유: {stats.rebirthCount || 0}회</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={stats.adminUnlocked ? 999999 : (stats.rebirthCount || 0)}
                  value={myOfferDraft.rebirths || ''}
                  onChange={(e) => setMyOfferDraft({ ...myOfferDraft, rebirths: Math.max(0, parseInt(e.target.value) || 0) })}
                  placeholder="0"
                  className="px-2 py-1 bg-neutral-900 border border-purple-800 rounded text-purple-200 font-mono"
                />
              </div>

              {/* Super Rebirth Count */}
              <div className="bg-neutral-950 p-2.5 rounded border border-amber-900 flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-amber-300 font-bold flex items-center gap-1"><PixelIcon name="trophy" size={14} /> 초환생 횟수 (Super)</span>
                  <span className="text-neutral-400">보유: {stats.superRebirthCount || 0}회</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={stats.adminUnlocked ? 999999 : (stats.superRebirthCount || 0)}
                  value={myOfferDraft.superRebirths || ''}
                  onChange={(e) => setMyOfferDraft({ ...myOfferDraft, superRebirths: Math.max(0, parseInt(e.target.value) || 0) })}
                  placeholder="0"
                  className="px-2 py-1 bg-neutral-900 border border-amber-800 rounded text-amber-200 font-mono"
                />
              </div>

              {/* Rebirth Points */}
              <div className="bg-neutral-950 p-2.5 rounded border border-indigo-900 flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-indigo-300 font-bold flex items-center gap-1"><PixelIcon name="stone" size={14} /> 환생 포인트 (RP)</span>
                  <span className="text-neutral-400">보유: {stats.rebirthPoints || 0} RP</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={stats.adminUnlocked ? 999999999 : (stats.rebirthPoints || 0)}
                  value={myOfferDraft.rebirthPoints || ''}
                  onChange={(e) => setMyOfferDraft({ ...myOfferDraft, rebirthPoints: Math.max(0, parseInt(e.target.value) || 0) })}
                  placeholder="0"
                  className="px-2 py-1 bg-neutral-900 border border-indigo-800 rounded text-indigo-200 font-mono"
                />
              </div>

              {/* Cheat Menu Pass (Admin Only) */}
              {(stats.adminUnlocked || stats.cheatUnlocked) && (
                <div className="bg-gradient-to-r from-amber-950/60 to-purple-950/60 p-2.5 rounded border-2 border-amber-500 flex items-center justify-between col-span-1 sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👑</span>
                    <div>
                      <div className="text-xs font-bold text-amber-300">[어드민 전용] 치트 메뉴 권한 패스 증서</div>
                      <div className="text-[10px] text-neutral-400">교환 시 상대방의 어드민 및 치트 메뉴가 영구 해금됩니다.</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMyOfferDraft({ ...myOfferDraft, cheatPass: !myOfferDraft.cheatPass })}
                    className={`px-3 py-1.5 rounded text-xs font-bold font-mono border cursor-pointer ${
                      myOfferDraft.cheatPass
                        ? 'bg-amber-500 text-neutral-950 border-amber-300'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-700'
                    }`}
                  >
                    {myOfferDraft.cheatPass ? '✓ 증서 포함됨' : '+ 증서 추가'}
                  </button>
                </div>
              )}
            </div>

            {/* Select Swords from Vault */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-mono text-cyan-300 font-bold">검 보관함에서 거래할 검 선택:</span>
              {(stats.swordVault?.length || 0) === 0 ? (
                <div className="bg-neutral-950 p-3 rounded text-center text-xs font-mono text-neutral-500">
                  보관함에 검이 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                  {(stats.swordVault || []).map((sword) => {
                    const isSelected = myOfferDraft.storedSwords.some((s) => s.id === sword.id);
                    return (
                      <button
                        key={sword.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setMyOfferDraft({
                              ...myOfferDraft,
                              storedSwords: myOfferDraft.storedSwords.filter((s) => s.id !== sword.id),
                            });
                          } else {
                            setMyOfferDraft({
                              ...myOfferDraft,
                              storedSwords: [...myOfferDraft.storedSwords, sword],
                            });
                          }
                        }}
                        className={`p-2 rounded border text-left flex items-center justify-between text-xs font-mono cursor-pointer ${
                          isSelected ? 'bg-cyan-950 border-cyan-400 text-cyan-300' : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                        }`}
                      >
                        <span>+{sword.level} [{sword.name}] ({sword.rarity})</span>
                        {isSelected ? <Check className="w-4 h-4 text-cyan-400" /> : <Plus className="w-4 h-4 text-neutral-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2 border-t border-neutral-800">
              <button
                onClick={handleSaveOfferToRoom}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded text-xs font-mono cursor-pointer"
              >
                제안 확정 및 방에 반영
              </button>
              <button
                onClick={() => setIsEditingOfferModal(false)}
                className="py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono rounded cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
