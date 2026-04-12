import React, { useState, useEffect, useMemo, useCallback, useReducer, useRef } from 'react';
import {
    Camera, Copy, X, ChevronUp, ChevronDown, Check, Sparkles,
    Moon, Sun, MonitorPlay, Palette,
    Loader2, Volume2, Box, Layers, Activity, Film,
    MoveHorizontal, Cpu, User, TreePine, Image as LucideImage,
    Info, List, Maximize,
    FileCode, Play, Lightbulb, GripVertical,
    Wand2, AlertTriangle, AlertCircle, RefreshCw, Gauge, Edit2,
    Aperture, TerminalSquare, Plus, ImageIcon, LayoutPanelLeft, Megaphone, Save,
    Target, History, Paintbrush, SwatchBook, CloudRain, Grid, UserCheck, Settings, ShieldAlert, Heart, Eye, TrendingUp, BarChart, Users,
    Focus, LayoutTemplate
} from 'lucide-react';

/**
 * =============================================================================
 * CONSTANTS & CONFIGURATION
 * =============================================================================
 */

const API_URL = "https://script.google.com/macros/s/AKfycbwNjk0nkv_X6ASnwrxmc2Plj24bjMcd6pegp11dKCxzWgfK3AixfvfAALn89uh2xbSO/exec";

const A = {
    SET_STATE: 'SET_STATE',
    UPDATE_INPUT: 'UPDATE_INPUT',
    SET_FORMAT: 'SET_FORMAT',
    SET_CATEGORY_TAB: 'SET_CATEGORY_TAB',
    SET_SELECTION: 'SET_SELECTION',
    TOGGLE_CARD: 'TOGGLE_CARD',
    SET_MANUAL_INPUT: 'SET_MANUAL_INPUT',
    MOVE_CATEGORY: 'MOVE_CATEGORY',
    SET_COMPILED_RESULT: 'SET_COMPILED_RESULT',
    SET_FOOTER_TAB: 'SET_FOOTER_TAB',
    SET_ERROR: 'SET_ERROR',
    CLEAR_ERROR: 'CLEAR_ERROR',
    INITIALIZE: 'INITIALIZE',
    ADD_NOTIFICATION: 'ADD_NOTIFICATION',
    REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION'
};

const IDEAL_ORDER = [
    'purpose', 'awareness_level', 'marketing_angle', 'concept_area',
    'role', 'context', 'task', 'target_model',
    'environment', 'light_setup',
    'camera', 'lens', 'aperture', 'shutter_iso',
    'shot_type', 'camera_angle', 'perspective',
    'art_render', 'film_emulation', 'color_science', 'material',
    'camera_motion', 'video_sfx',
    'aspect_ratio', 'weather_condition', 'composition_rule', 'subject_details', 'technical_params', 'negative_prompt',
    'brand_voice', 'target_persona', 'emotional_trigger', 'visual_hook'
];

const iconMap = {
    Camera, Sun, Palette, MonitorPlay, Sparkles,
    Activity, MoveHorizontal, Layers, Film, Volume2, Box, User, TreePine,
    Cpu, Maximize, Lightbulb, Play, LucideImage, List, FileCode,
    Wand2, Copy, AlertCircle, AlertTriangle, RefreshCw, Gauge, Edit2,
    Aperture, TerminalSquare, Plus, ImageIcon, LayoutPanelLeft, Megaphone, Save,
    Target, History, Paintbrush, SwatchBook, CloudRain, Grid, UserCheck, Settings,
    ShieldAlert, Heart, Eye, TrendingUp, BarChart, Users,
    Focus, Layout: LayoutTemplate, ChevronDown, ChevronUp, Moon, Info
};

const CONFLICT_RULES = [
    "If an Art & Render Engine is selected, remove real-world Camera Body brands.",
    "If lens specific format conflicts with a separate explicit Aperture setting, prioritize the explicit aperture.",
    "If Film Emulation is used, avoid conflicting digital ISO 'noise-free' parameters.",
    "If Shutter speed implies fast motion, remove conflicting motion blur parameters.",
    "Ensure depth of field logically matches the chosen aperture."
];

const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";
const makeGeminiEndpoint = (key) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

const DATA_CONFIG = {
    FORMATS: [
        { id: 'image', label: 'Resim', promptWord: 'Image', iconName: 'LucideImage' },
        { id: 'video', label: 'Video', promptWord: 'Video', iconName: 'MonitorPlay' },
        { id: 'img2vid', label: 'R-to-V', promptWord: 'Image-to-Video', iconName: 'Layers' }
    ]
};

/**
 * =============================================================================
 * CENTRALIZED UI STYLES
 * =============================================================================
 */
const UI_STYLES = {
    toggle: {
        base: "w-9 h-5 rounded-full relative transition-all duration-300 flex-shrink-0 outline-none border-2 shadow-sm",
        active: "bg-indigo-600 border-indigo-600",
        inactive: "bg-slate-300 dark:bg-slate-600 border-slate-400 dark:border-slate-500",
        thumbBase: "absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-md transition-all duration-300",
        thumbActive: "left-5",
        thumbInactive: "left-0.5"
    },
    categoryCard: {
        base: "w-full flex flex-col rounded-3xl border text-left transition-all relative group cursor-pointer overflow-hidden",
        active: "bg-indigo-50 border-indigo-400 dark:bg-indigo-500/10 shadow-md ring-2 ring-indigo-500/20 scale-[1.01]",
        inactive: "bg-white/60 dark:bg-neutral-800/50 border-slate-200 dark:border-white/10 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500/50"
    },
    switcher: {
        container: "flex rounded-full p-1 border",
        containerDark: "bg-white/5 border-white/5",
        containerLightMd: "bg-slate-100 border-transparent shadow-inner",
        containerLightSm: "bg-slate-200/50 border-transparent shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]",
        btnBase: "rounded-full transition-all flex items-center justify-center font-black",
        btnActive: "bg-white dark:bg-slate-700/80 text-indigo-600 dark:text-indigo-300 shadow-sm",
        btnInactive: "bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
    }
};

/**
 * =============================================================================
 * API DATA TRANSFORMER
 * =============================================================================
 */

const transformApiData = (categoriesTable, itemsTable) => {
    if (!Array.isArray(categoriesTable)) return [];
    const toBool = (val) => val === true || val === 1 || String(val).toLowerCase() === "true" || String(val) === "1";

    const getOrder = (val1, val2) => {
        if (val1 !== undefined && val1 !== null && String(val1).trim() !== '') return Number(val1);
        if (val2 !== undefined && val2 !== null && String(val2).trim() !== '') return Number(val2);
        return 999;
    };

    return categoriesTable.map(cat => {
        const catIdLower = String(cat.Category_id || '').toLowerCase();

        let rawItems = Array.isArray(cat.Items) ? cat.Items : [];

        const catItems = rawItems.map(item => ({
            id: String(item.Item_id || ''),
            badge: String(item.Badge_tr || ''),
            label: String(item.Label_tr || item.Label_en || ''),
            trigger: String(item.Trigger_text || ''),
            meaning: String(item.Tr_meaning || ''),
            image: item.Image && item.Image !== '[URL]' ? String(item.Image) : null,
            video: item.Video && item.Video !== '[URL]' ? String(item.Video) : null,
            isDefault: toBool(item.Is_default),
            sortPriority: getOrder(item.Prompt_Order_Index, item.Sort_priority)
        })).sort((a, b) => a.sortPriority - b.sortPriority);

        let rawIcon = String(cat.Icon_name || 'Sparkles');
        let safeIcon = rawIcon.replace(/-./g, x => x[1].toUpperCase());
        safeIcon = safeIcon.charAt(0).toUpperCase() + safeIcon.slice(1);

        return {
            id: catIdLower,
            targetOutput: String(cat.Target_Output || 'Visual'),
            groupName: String(cat.Group_Name_tr || ''),
            title: String(cat.Title_tr || ''),
            iconName: safeIcon,
            showFor: cat.Show_for ? String(cat.Show_for).split(',').map(s => s.trim().toLowerCase()) : ['image', 'video', 'img2vid'],
            isMeta: toBool(cat.Is_meta),
            defaultEnabled: cat.Default_enabled !== undefined ? toBool(cat.Default_enabled) : true,
            orderIndex: getOrder(cat.Prompt_Order_Index, cat.Order_index),
            description: String(cat.Description_tr || ''),
            manualTip: String(cat.Manual_tip_tr || ''),
            example: String(cat.Example_tr || ''),
            items: catItems
        };
    }).sort((a, b) => a.orderIndex - b.orderIndex);
};

/**
 * =============================================================================
 * REDUCER AND INITIAL STATE 
 * =============================================================================
 */

function promptReducer(state, action) {
    if (typeof action === 'function') {
        action = action(state);
    }
    switch (action.type) {
        case A.INITIALIZE:
            return { ...state, ...action.payload, isDataLoaded: true };
        case A.SET_STATE:
            return { ...state, [action.key]: action.value };
        case A.UPDATE_INPUT:
            return { ...state, [action.field]: action.value, hasCompiled: false };
        case A.SET_FORMAT:
            return { ...state, activeFormat: action.payload, hasCompiled: false };
        case A.SET_CATEGORY_TAB:
            return { ...state, activeCategoryTab: action.payload };
        case A.SET_SELECTION: {
            const { categoryId, itemId } = action;
            let newSelection = itemId;

            if (categoryId === 'negative_prompt') {
                const currentSel = state.selections[state.activeFormat]?.[categoryId];
                let currentArray = Array.isArray(currentSel) ? currentSel : (currentSel ? [currentSel] : []);

                if (itemId === 'manual') {
                    newSelection = 'manual';
                } else if (currentArray.includes(itemId)) {
                    newSelection = currentArray.filter(id => id !== itemId);
                    if (newSelection.length === 0) newSelection = null;
                } else {
                    newSelection = currentArray.filter(id => id !== 'manual').concat(itemId);
                }
            }

            return {
                ...state,
                selections: {
                    ...state.selections,
                    [state.activeFormat]: { ...(state.selections[state.activeFormat] || {}), [categoryId]: newSelection }
                },
                activeCards: {
                    ...state.activeCards,
                    [state.activeFormat]: { ...(state.activeCards[state.activeFormat] || {}), [categoryId]: true }
                },
                hasCompiled: false
            };
        }
        case A.TOGGLE_CARD:
            return {
                ...state,
                activeCards: {
                    ...state.activeCards,
                    [state.activeFormat]: {
                        ...(state.activeCards[state.activeFormat] || {}),
                        [action.categoryId]: !(state.activeCards[state.activeFormat] || {})[action.categoryId]
                    }
                },
                hasCompiled: false
            };
        case A.SET_MANUAL_INPUT:
            return {
                ...state,
                manualInputs: {
                    ...state.manualInputs,
                    [action.categoryId]: { desc: action.desc, title: action.title, createdAt: Date.now() }
                },
                hasCompiled: false
            };
        case A.MOVE_CATEGORY: {
            const index = state.categoryOrder.indexOf(action.categoryId);
            if (index === -1) return state;
            const newOrder = [...state.categoryOrder];
            const newIndex = action.direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= newOrder.length) return state;
            [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
            return { ...state, categoryOrder: newOrder, hasCompiled: false };
        }
        case A.SET_COMPILED_RESULT:
            return {
                ...state,
                compiledResult: { ...state.compiledResult, ...action.payload },
                hasCompiled: true,
                footerTab: action.tab || state.footerTab
            };
        case A.SET_FOOTER_TAB:
            return { ...state, footerTab: action.payload };
        case A.SET_ERROR:
            return { ...state, error: { message: typeof action.message === 'string' ? action.message : (action.message?.message || JSON.stringify(action.message)), context: action.context ? String(action.context) : '' } };
        case A.CLEAR_ERROR:
            return { ...state, error: null };
        case A.ADD_NOTIFICATION:
            return { ...state, notifications: [action.payload, ...(state.notifications || [])].slice(0, 5) };
        case A.REMOVE_NOTIFICATION:
            return { ...state, notifications: (state.notifications || []).filter(n => n.id !== action.payload) };
        default:
            return state;
    }
}

/**
 * =============================================================================
 * HELPERS & UTILS
 * =============================================================================
 */

const handleCopyGlobal = (text, successCallback) => {
    if (!text) return;
    // Modern Clipboard API önce denenir, fallback olarak execCommand kullanılır
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            if (successCallback) successCallback();
        }).catch(() => {
            _execCommandCopy(text, successCallback);
        });
    } else {
        _execCommandCopy(text, successCallback);
    }
};

const _execCommandCopy = (text, successCallback) => {
    try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successCallback) successCallback();
    } catch (err) {
        console.error("Kopyalama Hatası:", err);
    }
};

/**
 * =============================================================================
 * SUB-COMPONENTS
 * =============================================================================
 */

const Toggle = ({ checked, onChange, className = '' }) => (
    <button
        role="switch"
        aria-checked={checked}
        onClick={(e) => {
            e.stopPropagation();
            onChange(e);
        }}
        className={`${UI_STYLES.toggle.base} ${checked ? UI_STYLES.toggle.active : UI_STYLES.toggle.inactive} ${className}`}
    >
        <div className={`${UI_STYLES.toggle.thumbBase} ${checked ? UI_STYLES.toggle.thumbActive : UI_STYLES.toggle.thumbInactive}`} />
    </button>
);

const MasterAiButton = ({ onClick, disabled, loading, text, icon: Icon = Sparkles, className = "" }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`relative overflow-hidden group flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-yellow-300 shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:shadow-[0_0_25px_rgba(99,102,241,0.6)] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 border border-indigo-400/30 ${className}`}
    >
        <div className="absolute inset-0 w-[200%] -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
        {loading ? <Loader2 size={14} className="animate-spin text-yellow-300" /> : <Icon size={14} className="text-yellow-300 drop-shadow-md" />}
        {text && <span className="relative z-10 text-white drop-shadow-md">{text}</span>}
    </button>
);

const PromptHealthGauge = ({ length, onOpenModal }) => {
    // Hesaplama memoize edildi — length değişmediği sürece yeniden hesaplanmaz
    const gauge = useMemo(() => {
        if (length <= 0) return { width: '10%', color: 'bg-slate-300 dark:bg-slate-600', textColor: 'text-slate-300 dark:text-slate-600', label: 'BEKLEMEDE' };
        if (length < 300)  return { width: '25%', color: 'bg-slate-400',  textColor: 'text-slate-400',  label: 'ÇOK KISA' };
        if (length < 1000) return { width: '50%', color: 'bg-emerald-500', textColor: 'text-emerald-500', label: 'OPTİMAL' };
        if (length < 1500) return { width: '75%', color: 'bg-amber-500',  textColor: 'text-amber-500',  label: 'UZUN' };
        return { width: '100%', color: 'bg-red-500', textColor: 'text-red-500', label: 'RİSKLİ (ÇOK UZUN)' };
    }, [length]);

    return (
        <div className="flex items-center gap-3 w-full lg:w-auto">
            <button onClick={onOpenModal} className="flex items-center gap-2 outline-none hover:opacity-80 transition-all z-10" title="Prompt Rehberi">
                <Gauge size={14} className={gauge.textColor} />
                <div className="w-24 h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden flex shadow-inner">
                    <div className={`h-full ${gauge.color} transition-all duration-500`} style={{ width: gauge.width }} />
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest ${gauge.textColor}`}>{gauge.label}</span>
            </button>
        </div>
    );
};

const DynamicIcon = ({ name, size = 16, className = "" }) => {
    const IconComponent = iconMap[name] || Sparkles;
    return <IconComponent size={size} className={className} />;
};

// renderInline bileşen dışında tanımlandı — her render'da closure yeniden oluşmaz
const _renderInline = (str) => {
    const parts = str.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={j} className="font-bold text-indigo-700 dark:text-indigo-400">{part.slice(2, -2)}</strong>;
        if (part.startsWith('*') && part.endsWith('*')) return <em key={j} className="text-slate-600 dark:text-slate-300 italic">{part.slice(1, -1)}</em>;
        return part;
    });
};

const RenderMarkdown = ({ text }) => {
    if (!text) return null;
    return (
        <div className="space-y-4">
            {String(text).split('\n').map((line, i) => {
                let trimmedLine = line.trim();
                if (!trimmedLine) return null;

                let isHeader = false;
                let isList = false;

                if (trimmedLine.startsWith('### ')) { isHeader = true; trimmedLine = trimmedLine.slice(4); }
                else if (trimmedLine.startsWith('## ')) { isHeader = true; trimmedLine = trimmedLine.slice(3); }
                else if (trimmedLine.startsWith('# ')) { isHeader = true; trimmedLine = trimmedLine.slice(2); }
                else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
                    isList = true;
                    trimmedLine = trimmedLine.replace(/^[*-]\s+/, '');
                }

                if (isHeader) return <h4 key={i} className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mt-2">{_renderInline(trimmedLine)}</h4>;
                if (isList) return <li key={i} className="ml-5 list-disc text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{_renderInline(trimmedLine)}</li>;
                return <p key={i} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{_renderInline(trimmedLine)}</p>;
            })}
        </div>
    );
};

// Teknik terim regex'i sabit — her render'da yeniden compile edilmez
const _TECHNICAL_REGEX = /(\b\d+mm\b|\b\d+MP\b|\bf\/\d+\.?\d*\b|\bISO\s\d+\b|\b\d+\/\d+s\b|\b\d+s\b|\b8k\b|\b4k\b|--\w+)/gi;
const _TECHNICAL_REGEX_TEST = /(\b\d+mm\b|\b\d+MP\b|\bf\/\d+\.?\d*\b|\bISO\s\d+\b|\b\d+\/\d+s\b|\b\d+s\b|\b8k\b|\b4k\b|--\w+)/i;

const ArtisticPromptView = ({ breakdown, rawArray, isDark, footerTab, isOptimized }) => {
    if (footerTab === 'ai' && !isOptimized) {
        return (
            <div className="flex flex-col items-center justify-center py-10 space-y-6 animate-in fade-in">
                <Loader2 size={32} className="text-indigo-500 animate-spin" />
                <p className="text-sm font-medium tracking-wide text-center px-4 max-w-sm text-slate-500">AI Optimizasyonu Bekleniyor...</p>
            </div>
        );
    }

    if (breakdown && breakdown.length > 0) {
        return (
            <div className="space-y-6">
                {breakdown.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-4 group animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="flex flex-col items-center mt-1">
                            <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-500 text-[10px] flex items-center justify-center font-black border border-indigo-500/20 shadow-sm">{idx + 1}</span>
                        </div>
                        <div className="flex flex-col flex-1 pb-4 border-b border-slate-100 dark:border-white/5 last:border-0">
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{String(item.label)}</span>
                            <span className="text-[14px] font-mono leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                                {String(item.val).split(_TECHNICAL_REGEX).map((p, j) =>
                                    _TECHNICAL_REGEX_TEST.test(p)
                                        ? <em key={j} className="text-indigo-700 dark:text-indigo-400 font-bold not-italic px-1 bg-indigo-100 dark:bg-indigo-500/10 rounded">{p}</em>
                                        : p
                                )}
                            </span>
                            {item.meaning && item.meaning !== item.val && (
                                <span className="text-[11px] italic font-medium text-slate-500 dark:text-slate-400 block mt-1.5 bg-slate-50 dark:bg-white/5 px-2 py-1 rounded-md w-fit">
                                    {String(item.meaning)}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!rawArray || rawArray.length === 0) return null;

    return (
        <ul className="space-y-4">
            {rawArray.map((seg, idx) => (
                <li key={idx} className={`flex items-start gap-4 pb-4 border-b last:border-0 transition-all animate-in fade-in slide-in-from-left-2 ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                    <span className="text-indigo-500/50 mt-1 flex-shrink-0 text-lg leading-none">•</span>
                    <span className="text-[14px] font-mono leading-relaxed text-slate-800 dark:text-slate-300 whitespace-pre-wrap">{String(seg).trim()}</span>
                </li>
            ))}
        </ul>
    );
};

const Modal = ({ open, onClose, title, subtitle, icon: Icon, maxW = 'max-w-2xl', isDark, children }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[300] bg-slate-900/80 dark:bg-black/90 backdrop-blur-md animate-in fade-in flex items-center justify-center p-6"
            onClick={onClose}>
            <div className={`w-full ${maxW} rounded-3xl shadow-2xl p-8 flex flex-col gap-6 max-h-[85vh] ${isDark ? 'bg-neutral-900 border border-white/10 text-white' : 'bg-white border border-slate-200'}`}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/10 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg">
                            {Icon && <Icon size={24} />}
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-indigo-500">{String(title)}</h3>
                            {subtitle && <p className="text-[10px] text-slate-400 uppercase font-bold">{String(subtitle)}</p>}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X size={20} /></button>
                </div>
                <div className="overflow-y-auto custom-scrollbar flex-1 pr-2">{children}</div>
            </div>
        </div>
    );
};

const SectionWrapper = ({ title, colorTheme, isDark, outerClassName = '', containerClassName = '', customBg = '', innerRef, children }) => {
    const themes = {
        indigo: { badge: 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800', border: 'border-t-indigo-500', bg: isDark ? 'bg-neutral-900/60 ring-white/10' : 'bg-indigo-50/10 ring-slate-900/5' },
        emerald: { badge: 'bg-emerald-50 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', border: 'border-t-emerald-500', bg: isDark ? 'bg-neutral-900/60 ring-white/10' : 'bg-indigo-50/10 ring-slate-900/5' },
        amber: { badge: 'bg-amber-50 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-800', border: 'border-t-amber-500', bg: isDark ? 'bg-neutral-900/60 ring-white/10' : 'bg-indigo-50/10 ring-slate-900/5' },
        rose: { badge: 'bg-rose-50 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800', border: 'border-t-rose-500', bg: customBg }
    };
    const theme = themes[colorTheme] || themes.indigo;
    return (
        <div ref={innerRef} className={`relative flex-shrink-0 ${outerClassName}`}>
            <span className={`absolute -top-3 left-6 z-20 px-3 py-0.5 text-[10px] font-bold tracking-widest rounded-full border shadow-sm ${theme.badge}`}>{String(title)}</span>
            <div className={`backdrop-blur-xl ring-1 shadow-sm border-t-4 ${theme.border} ${theme.bg} ${containerClassName}`}>{children}</div>
        </div>
    );
};

const CategoryItemCard = ({ item, isSelected, isMultiSelect, isDark, onSelect, onEditManual }) => {
    const [imgError, setImgError] = useState(false);

    const wordCount = React.useMemo(() => {
        if (!item.trigger) return 0;
        return String(item.trigger).split(/\s+/).filter(Boolean).length;
    }, [item.trigger]);

    const badgeNorm = String(item.badge || '').toLowerCase().trim();
    const labelNorm = String(item.label || '').toLowerCase().trim();

    // Akıllı Badge Gizleme: Eğer badge boş değilse VE birbirlerini içeriyorlarsa gizle.
    const showBadge = badgeNorm !== '' &&
        badgeNorm !== 'undefined' &&
        badgeNorm !== 'null' &&
        !labelNorm.includes(badgeNorm) &&
        !badgeNorm.includes(labelNorm);

    return (
        <div
            role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className={`${UI_STYLES.categoryCard.base} ${isSelected ? UI_STYLES.categoryCard.active : UI_STYLES.categoryCard.inactive}`}
        >
            {(item.image || item.video) && !imgError && (
                <div className="w-full h-28 bg-slate-200 dark:bg-slate-700 border-b border-slate-200/50 relative overflow-hidden flex items-center justify-center">
                    {item.image 
                        ? <img src={item.image} alt={String(item.label)} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" onError={() => setImgError(true)} /> 
                        : <div className="text-slate-400"><ImageIcon size={24} /></div>
                    }
                </div>
            )}
            <div className="p-5 flex flex-col h-full">
                <div className="flex flex-col items-start w-full mb-3 pr-6">
                    {showBadge && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-400/30 mb-1.5">
                            {String(item.badge)}
                        </span>
                    )}
                    <span className={`text-[15px] font-black leading-tight ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>{String(item.label)}</span>
                </div>
                <div className="space-y-2.5 w-full pr-2 flex-1 flex flex-col">
                    {item.meaning && <span className="text-[12px] italic font-medium block leading-relaxed text-slate-500">{String(item.meaning)}</span>}
                    {item.trigger && (
                        <div className={`mt-auto p-2.5 rounded-xl border w-full transition-all ${isSelected ? 'bg-indigo-100/50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-500/30' : 'bg-slate-50 border-slate-200 dark:bg-white/5 dark:border-white/10'}`}>
                            <div className="flex items-center justify-between mb-1 opacity-60">
                                <span className="text-[8px] font-black uppercase tracking-widest">Trigger</span>
                                <span className="text-[9px] font-bold">({wordCount} kelime)</span>
                            </div>
                            <span className={`text-[11px] font-mono leading-relaxed block break-words ${isSelected ? 'text-indigo-800 dark:text-indigo-200 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                                {String(item.trigger)}
                            </span>
                        </div>
                    )}
                </div>
            </div>
            {isSelected && <div className="absolute top-5 right-5"><Check size={18} className="text-indigo-500" strokeWidth={3} /></div>}
            {!isMultiSelect && <button onClick={(e) => { e.stopPropagation(); onEditManual(); }} className={`absolute bottom-4 right-4 p-2.5 rounded-xl shadow-sm border opacity-0 group-hover:opacity-100 transition-all ${isDark ? 'bg-neutral-800 border-white/10 text-white hover:text-indigo-400' : 'bg-white border-slate-200 text-slate-500 hover:text-indigo-600'}`}><Edit2 size={14} /></button>}
        </div>
    );
};

const CategorySidebar = ({
    isDark, isReorderMode, onToggleReorder, isDataLoaded,
    categoryOrder, availableCategories, activeFormat,
    activeCards, activeCategoryTab, selections, manualInputs,
    onSelectTab, onToggleCard, getCharCount
}) => {
    // availableCategories değiştiğinde grupları hesapla — O(n) Map yapısı kullanılıyor
    const groupedCategories = useMemo(() => {
        const groups = [];
        const groupMap = new Map();
        // availableCategories zaten sıralı geldiği için ayrıca find() döngüsüne gerek yok
        availableCategories.forEach(cat => {
            const groupKey = cat.groupName || 'DİĞER';
            if (!groupMap.has(groupKey)) {
                const newGroup = { key: groupKey, name: groupKey, cats: [] };
                groups.push(newGroup);
                groupMap.set(groupKey, newGroup);
            }
            groupMap.get(groupKey).cats.push(cat);
        });
        return groups;
    }, [availableCategories]);

    return (
        <div className={`lg:w-[320px] lg:h-full min-h-[180px] max-h-[300px] lg:max-h-none flex-shrink-0 flex flex-col border-b lg:border-b-0 border-r border-slate-200/50 dark:border-white/10 pt-4 relative z-30 ${isDark ? 'bg-black/20' : 'bg-slate-50/50'}`}>
            <div className="flex items-center min-h-[3.5rem] px-4 lg:px-8 border-b border-slate-200/50 dark:border-white/5 justify-between flex-shrink-0 bg-transparent backdrop-blur-md">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">SEÇİM MODU</span>
                    <span className="text-[9px] font-bold text-slate-400">({availableCategories.filter(c => activeCards[activeFormat]?.[c.id]).length}/{availableCategories.length})</span>
                </div>
                <button
                    onClick={onToggleReorder}
                    title="Gruplu Görünüm"
                    className={`p-2 rounded-xl transition-all shadow-sm ${!isReorderMode ? 'bg-indigo-500 text-white shadow-indigo-500/30' : (isDark ? 'bg-white/10 text-slate-300 hover:bg-white/20' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 text-slate-600')}`}
                >
                    {!isReorderMode ? <Layers size={16} /> : <List size={16} />}
                </button>
            </div>

            <div className="p-4 lg:p-6 overflow-y-auto custom-scrollbar flex-1">
                {!isDataLoaded ? (
                    <div className="flex flex-col items-center justify-center py-12 opacity-50">
                        <Loader2 size={24} className="animate-spin text-indigo-500 mb-3" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Yükleniyor...</span>
                    </div>
                ) : !isReorderMode ? (
                    <div className="space-y-8 pb-4">
                        {groupedCategories.map(group => {
                            if (group.cats.length === 0) return null;
                            const activeCount = group.cats.filter(c => activeCards[activeFormat]?.[c.id]).length;

                            return (
                                <div key={group.key} className="flex flex-col">
                                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2 flex justify-between">
                                        <span>{String(group.name)}</span>
                                        <span>({activeCount}/{group.cats.length})</span>
                                    </h3>
                                    <div className="flex flex-col gap-2.5">
                                        {group.cats.map(cat => {
                                            const isActive = activeCategoryTab === cat.id;
                                            const isEnabled = activeCards[activeFormat]?.[cat.id];
                                            const selectedId = selections[activeFormat]?.[cat.id];
                                            const isMultiSelect = cat.id === 'negative_prompt';
                                            const charLen = getCharCount(cat.id);

                                            let selectedLabel = '';
                                            if (isMultiSelect && Array.isArray(selectedId)) {
                                                if (selectedId.length > 0) selectedLabel = `${selectedId.length} Seçim`;
                                            } else if (selectedId === 'manual') {
                                                selectedLabel = manualInputs[cat.id]?.title || 'Özel';
                                            } else {
                                                selectedLabel = cat.items?.find(i => i.id === selectedId)?.label || '';
                                            }

                                            return (
                                                <div key={cat.id} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isActive ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 shadow-sm' : 'border-transparent hover:bg-slate-100 dark:hover:bg-white/5'} ${!isEnabled ? 'opacity-50 grayscale' : ''}`}>
                                                    <button onClick={() => onSelectTab(cat.id)} className="flex flex-1 items-center gap-3 overflow-hidden text-left">
                                                        <DynamicIcon name={cat.iconName} size={18} className={isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'} />
                                                        <div className="flex flex-col min-w-0">
                                                            <span className={`flex items-center text-[11px] font-bold uppercase truncate ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                                                {String(cat.title)}
                                                                {isMultiSelect && <Layers size={10} className="ml-1 text-indigo-400" title="Çoklu Seçim" />}
                                                            </span>
                                                            <span className={`text-xs font-semibold truncate mt-0.5 ${isActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                                {String(selectedLabel)} {charLen > 0 && <span className="ml-1 text-[10px] text-slate-400 opacity-80">({charLen})</span>}
                                                            </span>
                                                        </div>
                                                    </button>
                                                    {!cat.isMeta && (
                                                        <Toggle checked={isEnabled} onChange={(e) => { e.stopPropagation(); onToggleCard(cat.id); }} className="ml-2 focus-visible:ring-2 focus:ring-indigo-500" />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 pb-4">
                        {availableCategories.map((cat, index) => {
                            const isActive = activeCategoryTab === cat.id;
                            const isEnabled = activeCards[activeFormat]?.[cat.id];
                            return (
                                <div key={cat.id} className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-400 w-4">{index + 1}.</span>
                                    <div className={`flex-1 flex items-center justify-between p-3 rounded-2xl border transition-all ${isActive ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 shadow-sm' : 'border-transparent hover:bg-slate-100 dark:hover:bg-white/5'} ${!isEnabled ? 'opacity-50 grayscale' : ''}`}>
                                        <button onClick={() => onSelectTab(cat.id)} className="flex flex-1 items-center gap-3 overflow-hidden text-left">
                                            <DynamicIcon name={cat.iconName} size={18} className={isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                                            <div className="flex flex-col min-w-0">
                                                <span className={`text-[11px] font-bold uppercase truncate ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300'}`}>{String(cat.title)}</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

const FormatSwitcher = ({ formats, activeFormat, onChange, isDark }) => (
    <div className={`${UI_STYLES.switcher.container} hidden lg:flex ${isDark ? UI_STYLES.switcher.containerDark : UI_STYLES.switcher.containerLightMd}`}>
        {formats.map(f => (
            <button key={f.id} onClick={() => onChange(f.id)} className={`${UI_STYLES.switcher.btnBase} px-5 py-1.5 text-[11px] tracking-wide ${activeFormat === f.id ? UI_STYLES.switcher.btnActive : UI_STYLES.switcher.btnInactive}`}>
                <DynamicIcon name={f.iconName} size={14} /> <span className="hidden sm:inline">{String(f.label)}</span>
            </button>
        ))}
    </div>
);

const SceneTextarea = ({ isDark, value, onChange, onEnhance, isEnhancing }) => {
    return (
        <div className="flex flex-col gap-4 w-full mt-1">
            <div className={`relative w-full overflow-hidden p-3 rounded-2xl transition-all border-none shadow-none focus-within:ring-0 ${isDark ? 'bg-neutral-800/40' : 'bg-white/40'}`}>
                <textarea
                    value={value} onChange={onChange} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEnhance(); } }}
                    className={`w-full p-2 pr-12 text-sm font-semibold resize-none h-24 outline-none bg-transparent custom-scrollbar focus:ring-0 ${isDark ? 'text-white' : 'text-slate-900'}`} placeholder="Sahneyi betimleyin..."
                />
                <button onClick={onEnhance} disabled={isEnhancing || !value?.trim()} className={`absolute bottom-3 right-3 p-2 rounded-xl transition-all disabled:opacity-30 shadow-sm ${isDark ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-500 hover:text-white'}`} title="AI ile Geliştir">
                    {isEnhancing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                </button>
            </div>
        </div>
    );
};

const ManualInputArea = ({ isDark, value, onChange, onTranslate, isTranslating }) => {
    return (
        <div className="flex flex-col gap-4 w-full">
            <div className="relative w-full shadow-sm rounded-xl overflow-hidden bg-white dark:bg-neutral-800">
                <div className="bg-slate-50 dark:bg-neutral-900 border-b px-3 py-1.5 flex justify-between items-center dark:border-white/10">
                    <span className="text-[10px] font-black text-slate-500">Özel Değer (Türkçe Yazın)</span>
                    <button onClick={onTranslate} disabled={isTranslating || !value?.trim()} className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 hover:bg-indigo-100 disabled:opacity-50 transition-all`} title="Çevir ve Ekle">
                        {isTranslating ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />} ÇEVİR VE EKLE
                    </button>
                </div>
                <textarea
                    value={value} onChange={onChange} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onTranslate(); } }}
                    className="w-full p-4 text-sm font-medium resize-none h-24 outline-none bg-transparent custom-scrollbar" placeholder="Fikriniz..."
                />
            </div>
        </div>
    );
};

// Z-index hiyerarşisi (küçükten büyüğe):
// header: z-50 | SectionWrapper badge: z-20 | CategorySidebar: z-30
// ExpandSceneModal: z-[250] | Modal (ortak baz): z-[300] | ErrorBanner: z-[350] | DebugPayloadModal: z-[400]
// Notifications: z-[400] — pointer-events-none olduğu için tıklamayı engellemez
const ExpandSceneModal = ({ open, onClose, isDark, product, description, isEnhancingScene, onProductChange, onDescriptionChange, onEnhance }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[250] bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in flex items-center justify-center p-6" onClick={onClose}>
            <div className={`w-full max-w-4xl rounded-[2rem] shadow-2xl p-8 flex flex-col gap-6 ${isDark ? 'bg-neutral-900 border border-white/10 text-white' : 'bg-white border border-slate-200'}`} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest text-indigo-500">Gelişmiş Düzenleyici</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all"><X size={20} /></button>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ÜRÜN / KONU TANIMI</label>
                    <input
                        value={product}
                        onChange={e => onProductChange(e.target.value)}
                        className={`w-full p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-neutral-800/50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}
                    />
                </div>
                <div className="space-y-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SAHNE VE DETAYLAR</label>
                    <SceneTextarea isDark={isDark} value={description} onChange={onDescriptionChange} onEnhance={onEnhance} isEnhancing={isEnhancingScene} />
                </div>
                <button onClick={onClose} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest mt-2">BİTTİ</button>
            </div>
        </div>
    );
};

const DebugPayloadModal = ({ open, onClose, debugPayload }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[400] bg-slate-900/80 dark:bg-black/90 backdrop-blur-md animate-in fade-in flex items-center justify-center p-6" onClick={onClose}>
            <div className="w-full max-w-3xl bg-gray-900 text-green-400 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
                    <div className="flex items-center gap-3 text-white"><TerminalSquare size={18} className="text-green-500" /><h3 className="text-xs font-bold uppercase tracking-widest">AI Payload Debugger</h3></div>
                    <div className="flex items-center gap-3"><button onClick={() => handleCopyGlobal(JSON.stringify(debugPayload, null, 2))} className="text-gray-400 hover:text-white" title="Kopyala"><Copy size={16} /></button><button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button></div>
                </div>
                <div className="p-6 overflow-auto custom-scrollbar flex-1 font-mono text-[11px]">{debugPayload ? <pre>{JSON.stringify(debugPayload, null, 2)}</pre> : <div className="text-gray-500 italic">No AI requests have been sent yet in this session.</div>}</div>
            </div>
        </div>
    );
};

/**
 * =============================================================================
 * CUSTOM HOOK: usePromptManager
 * =============================================================================
 */
const usePromptManager = () => {
    const [categories, setCategories] = useState([]);
    const apiKey = ""; // Çevresel anahtar sistem tarafından sağlanır

    const [state, dispatch] = useReducer(promptReducer, {
        isDataLoaded: false, product: '', description: '', isDark: false, isReorderMode: false, isReorderVertical: false, showInactiveInReorder: false, itemSortMode: 'group', isManualOpen: {}, autoCompile: true, activeFormat: 'image', activeCategoryTab: '', footerTab: 'raw', showDetailsList: false, customInput: "", isOptimizing: false, isEnhancingScene: false, isGeneratingTrigger: false, isAnalyzing: false, analysisResult: null, categoryOrder: [], selections: {}, activeCards: {}, manualInputs: {},
        compiledResult: { visualRawEN: "", visualRawTR: "", visualRawArrayEN: [], visualBreakdown: [], textRawTR: "", textRawArrayTR: [], textBreakdown: [], aiEN: "", aiTR: "", noteShort: "", noteLong: "", conflicts_found: [] },
        error: null, debugPayload: null, showGaugeModal: false, showAnalyzeModal: false, showDebugModal: false, showAiNoteModal: false, showAdminModal: false,
        products: [], tableHeaders: null, appMode: 'visual', marketingHeaders: [], marketingData: [], productForm: {}, notifications: [], selectedProductId: '',
        isGeneratingMagic: false, isGeneratingVariations: false, variations: [], showVariationsModal: false
    });

    const footerRef = useRef(null);
    const prevAutoCompileTriggerState = useRef("");
    const syncTimeoutRef = useRef(null);

    const syncToDatabase = useCallback((action, table, payload) => {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = setTimeout(async () => {
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    // CORS Preflight (OPTIONS) hatasını aşmak için application/json yerine text/plain kullanıyoruz
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action, table, payload })
                });
                const result = await response.json().catch(() => null);
                if (result?.status === 'success') {
                    const notifId = Date.now();
                    dispatch({ type: A.ADD_NOTIFICATION, payload: { id: notifId, message: `✓ ${table} kaydedildi` } });
                    setTimeout(() => dispatch({ type: A.REMOVE_NOTIFICATION, payload: notifId }), 10000);
                }
            } catch (err) {
                console.error('Sync error:', err);
            }
        }, 1500);
    }, []);

    const callGemini = async (payload, loadingKey) => {
        // API Key doğrulaması kaldırıldı, sistem çalışma anında sağlar
        dispatch({ type: A.SET_STATE, key: loadingKey, value: true });
        dispatch({ type: A.CLEAR_ERROR });
        dispatch({ type: A.SET_STATE, key: 'debugPayload', value: payload });
        try {
            const res = await fetch(makeGeminiEndpoint(apiKey), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            const raw = (() => {
                const r = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!r) throw new Error('Boş API yanıtı');
                return r;
            })();
            return JSON.parse(raw);
        } catch (err) {
            dispatch({ type: A.SET_ERROR, message: String(err.message), context: String(err) });
            return null;
        } finally {
            dispatch({ type: A.SET_STATE, key: loadingKey, value: false });
        }
    };

    useEffect(() => {
        const fetchApiData = async () => {
            try {
                const response = await fetch(API_URL);
                if (!response.ok) throw new Error("API erişim hatası.");
                const rawData = await response.json().catch(() => null);
                if (!rawData) throw new Error("JSON parse hatası");

                const catsData = rawData.categories?.data || [];
                const itemsData = rawData.items?.data || [];
                const prodsData = rawData.products?.data || [];

                if (!Array.isArray(catsData) || catsData.length === 0) {
                    dispatch({ type: A.SET_ERROR, message: "Kategoriler yüklenemedi" });
                    return;
                }

                const headers = {
                    categories: rawData.categories?.headers || [],
                    items: rawData.items?.headers || [],
                    products: rawData.products?.headers || [],
                    marketing: rawData.marketing?.headers || []
                };

                const updatedCategories = transformApiData(catsData, itemsData);
                const META_COLS = ['ID', 'Product_ID', 'Creator', 'Create_Time', 'Update_Time', 'Version', 'Format', 'Title'];
                const mktHeaders = (headers.marketing || []).filter(h => !META_COLS.includes(h));
                const mktData = rawData.marketing?.data || [];

                const selections = {}; const activeCards = {}; const formats = ['image', 'video', 'img2vid'];
                formats.forEach(f => {
                    selections[f] = {}; activeCards[f] = {};

                    updatedCategories.forEach(cat => {
                        if (cat.id === 'negative_prompt') {
                            const defaultItems = cat.items.filter(i => i.isDefault).map(i => i.id);
                            selections[f][cat.id] = defaultItems.length > 0 ? defaultItems : null;
                        } else {
                            const defaultItem = cat.items.find(i => i.isDefault) || cat.items[0];
                            selections[f][cat.id] = defaultItem ? defaultItem.id : 'manual';
                        }
                        activeCards[f][cat.id] = cat.defaultEnabled;
                    });

                    mktHeaders.forEach(h => {
                        const hId = String(h).toLowerCase();
                        selections[f][hId] = null;
                        activeCards[f][hId] = true;
                    });
                });

                setCategories(updatedCategories);

                const configTable = rawData.find ? rawData.find(t => t.table === "Config" || t.table === "Settings")?.data || [] : [];
                const getConf = (key) => configTable.find(c => c.key === key)?.value || "";

                dispatch({
                    type: A.INITIALIZE,
                    payload: {
                        selections,
                        activeCards,
                        categoryOrder: updatedCategories.map(c => c.id),
                        activeCategoryTab: updatedCategories[0]?.id || '',
                        products: prodsData,
                        tableHeaders: headers,
                        marketingHeaders: mktHeaders,
                        marketingData: mktData,
                        product: getConf('default_product') || 'Premium Saat',
                        description: getConf('default_description_tr') || 'Koyu mermer yüzeyde ortalanmış, minimalist ürün çekimi.'
                    }
                });
            } catch (err) {
                console.error("Data load failed:", err);
                dispatch({ type: A.SET_ERROR, message: 'Veriler çekilemedi. API bağlantınızı kontrol edin.', context: String(err) });
            }
        };
        fetchApiData();
    }, []);

    const availableCategories = useMemo(() => {
        if (state.appMode === 'marketing') {
            if (!state.marketingHeaders || !Array.isArray(state.marketingHeaders)) return [];
            return state.marketingHeaders.map(header => {
                const hId = String(header).toLowerCase();
                const uniqueItems = state.marketingData && Array.isArray(state.marketingData)
                    ? [...new Set(state.marketingData.map(row => row[header]).filter(Boolean))]
                    : [];

                return {
                    id: hId,
                    title: String(header),
                    groupName: 'Pazarlama',
                    iconName: 'Target',
                    showFor: ['image', 'video', 'img2vid'],
                    isMeta: false,
                    targetOutput: 'Text',
                    // 3B: Pazarlama kategorileri için daha akıllı açıklamalar
                    description: uniqueItems.length > 0
                        ? `${String(header)} için ${uniqueItems.length} seçenek mevcut.`
                        : `${String(header)} için henüz veri yok — manuel giriş yapabilirsiniz.`,
                    manualTip: `${String(header)} değerini Türkçe yazın, AI İngilizceye çevirecek.`,
                    items: uniqueItems.map((val, idx) => ({
                        id: `mkt_${hId}_${idx}`,
                        label: String(val),
                        trigger: String(val),
                        meaning: String(val),
                        isDefault: idx === 0,
                        sortPriority: idx
                    }))
                };
            });
        }

        return categories.filter(cat => {
            if (!cat.showFor.includes(state.activeFormat)) return false;
            const target = cat.targetOutput || 'Visual';
            return target === 'Visual' || target === 'Both';
        });
    }, [categories, state.activeFormat, state.appMode, state.marketingHeaders, state.marketingData]);

    useEffect(() => {
        if (state.isDataLoaded && availableCategories.length > 0 && !availableCategories.find(c => c.id === state.activeCategoryTab)) {
            dispatch({ type: A.SET_CATEGORY_TAB, payload: availableCategories[0].id });
        }
    }, [state.activeFormat, availableCategories, state.activeCategoryTab, state.isDataLoaded, state.appMode]);

    useEffect(() => {
        if (!state.isDataLoaded || !state.activeCategoryTab) return;
        const currentSelId = state.selections[state.activeFormat]?.[state.activeCategoryTab];
        if (state.activeCategoryTab === 'negative_prompt') {
            if (currentSelId === 'manual' || (Array.isArray(currentSelId) && currentSelId.includes('manual'))) {
                dispatch({ type: A.SET_STATE, key: 'customInput', value: state.manualInputs[state.activeCategoryTab]?.title || "" });
                dispatch((s) => ({ type: A.SET_STATE, key: 'isManualOpen', value: { ...s.isManualOpen, [s.activeCategoryTab]: true } }));
            } else {
                dispatch({ type: A.SET_STATE, key: 'customInput', value: "" });
            }
            return;
        }
        if (currentSelId === 'manual') {
            dispatch({ type: A.SET_STATE, key: 'customInput', value: state.manualInputs[state.activeCategoryTab]?.title || "" });
            dispatch((s) => ({ type: A.SET_STATE, key: 'isManualOpen', value: { ...s.isManualOpen, [s.activeCategoryTab]: true } }));
        } else {
            dispatch({ type: A.SET_STATE, key: 'customInput', value: "" });
        }
    }, [state.activeCategoryTab, state.selections, state.activeFormat, state.manualInputs, state.isDataLoaded]);

    const handleSelection = useCallback((categoryId, itemId) => {
        dispatch({ type: A.SET_SELECTION, categoryId, itemId });
    }, [dispatch]);

    const handleGenerateCustomTrigger = async () => {
        const sourceText = state.customInput;
        if (!sourceText?.trim()) return;

        const payload = {
            contents: [{ parts: [{ text: `Convert user's idea: "${sourceText}" into a professional English prompt format. Return ONLY valid JSON: { "translated_en": "..." }` }] }],
            systemInstruction: { parts: [{ text: "Master Prompt Translator. Return ONLY valid JSON format." }] },
            generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
        };
        const result = await callGemini(payload, 'isGeneratingTrigger');
        if (!result) return;

        const enVal = result.translated_en;
        const trVal = sourceText;
        const catId = state.activeCategoryTab;

        dispatch({ type: A.SET_STATE, key: 'customInput', value: trVal });
        if (catId === 'negative_prompt') {
            const currentSel = state.selections[state.activeFormat]?.[catId];
            let currentArray = Array.isArray(currentSel) ? currentSel : (currentSel ? [currentSel] : []);
            if (!currentArray.includes('manual')) dispatch({ type: A.SET_SELECTION, categoryId: catId, itemId: 'manual' });
        } else {
            if (state.selections[state.activeFormat]?.[catId] !== 'manual') dispatch({ type: A.SET_SELECTION, categoryId: catId, itemId: 'manual' });
        }
        dispatch({ type: A.SET_MANUAL_INPUT, categoryId: catId, desc: String(enVal).trim(), title: String(trVal).trim() });
    };

    const handleEnhanceScene = async () => {
        const sourceText = state.description;
        if (!sourceText?.trim()) return;
        const payload = {
            contents: [{ parts: [{ text: `Original input: "${sourceText}". Task: Enhance this scene description to be more professional, detailed, and cinematic.` }] }],
            systemInstruction: { parts: [{ text: "Master Prompt Engineer. NEVER summarize. Expand details cinematically in Turkish language. Output JSON format exactly: { \"enhanced_tr\": \"Geliştirilmiş Türkçe Sahne Tasviri\" }" }] },
            generationConfig: { responseMimeType: "application/json", temperature: 0.4 }
        };
        const result = await callGemini(payload, 'isEnhancingScene');
        if (!result) return;
        if (result.enhanced_tr) dispatch({ type: A.UPDATE_INPUT, field: 'description', value: String(result.enhanced_tr).trim() });
    };

    const handleCompile = useCallback(() => {
        if (!state.isDataLoaded || !state.activeCategoryTab) return;

        const formatNameEN = DATA_CONFIG.FORMATS.find(f => f.id === state.activeFormat)?.promptWord || "Image";

        let baseTextEN = '', baseTextTR = '';

        if (state.appMode === 'marketing') {
            baseTextEN = `Marketing Strategy for: ${state.product}.`;
            baseTextTR = `Pazarlama Stratejisi: ${state.product}.`;
        } else {
            const purposeId = state.selections[state.activeFormat]?.['purpose'];
            let purposeTriggerEN = '', purposeTriggerTR = '';
            if (purposeId === 'manual') {
                purposeTriggerEN = state.manualInputs['purpose']?.desc || '';
                purposeTriggerTR = state.manualInputs['purpose']?.title || '';
            } else {
                const item = categories.find(c => c.id === 'purpose')?.items?.find(i => i.id === purposeId);
                purposeTriggerEN = item?.trigger || '';
                purposeTriggerTR = item?.label || purposeTriggerEN;
            }
            baseTextEN = purposeTriggerEN ? `Professional ${formatNameEN} for ${purposeTriggerEN}: ${state.product}.` : `Professional ${formatNameEN}: ${state.product}.`;
            baseTextTR = purposeTriggerTR ? `Profesyonel ${formatNameEN} (${purposeTriggerTR}): ${state.product}.` : `Profesyonel ${formatNameEN}: ${state.product}.`;
        }

        let visualBreakdown = [{ label: 'Özne & Başlık', val: baseTextEN, meaning: baseTextTR }];
        let textBreakdown = [{ label: 'Ürün/Konu', val: state.product, meaning: state.product }];

        if (state.description) {
            visualBreakdown.push({ label: 'Sahne Detayları', val: state.description, meaning: state.description });
            textBreakdown.push({ label: 'Detaylar', val: state.description, meaning: state.description });
        }

        let visualRawArrayEN = [baseTextEN];
        let visualRawArrayTR = [baseTextTR];
        let textRawArrayTR = [`Ürün: ${state.product}`];

        if (state.description) {
            visualRawArrayEN.push(state.description);
            visualRawArrayTR.push(state.description);
            textRawArrayTR.push(`Detaylar: ${state.description}`);
        }

        const iterationList = state.appMode === 'marketing' ? availableCategories.map(c => c.id) : state.categoryOrder;

        iterationList.forEach(catId => {
            const cat = availableCategories.find(c => c.id === catId);
            if (!cat || cat.isMeta || !state.activeCards[state.activeFormat]?.[catId]) return;
            const selectedId = state.selections[state.activeFormat]?.[catId];
            if (!selectedId || (Array.isArray(selectedId) && selectedId.length === 0)) return;

            let trigger = '', meaning = '';
            if (Array.isArray(selectedId)) {
                const items = selectedId.map(id => cat.items?.find(i => i.id === id)).filter(Boolean);
                trigger = items.map(i => i.trigger).filter(Boolean).join(", ");
                meaning = items.map(i => i.meaning || i.label).join(", ");
                if (selectedId.includes('manual') && state.manualInputs[catId]?.desc) {
                    trigger = trigger ? `${trigger}, ${state.manualInputs[catId].desc}` : state.manualInputs[catId].desc;
                    meaning = meaning ? `${meaning}, ${state.manualInputs[catId].title}` : state.manualInputs[catId].title;
                }
            } else {
                if (selectedId === 'manual') {
                    const manual = state.manualInputs[catId];
                    if (manual?.desc) { trigger = manual.desc; meaning = manual.title || manual.desc; }
                } else {
                    const item = cat.items?.find(i => i.id === selectedId);
                    if (item) { trigger = item.trigger || item.label; meaning = item.meaning || item.label; }
                }
            }

            if (trigger || meaning) {
                const target = cat.targetOutput || 'Visual';
                if (target === 'Visual' || target === 'Both') {
                    if (trigger) {
                        visualRawArrayEN.push(trigger);
                        visualBreakdown.push({ label: String(cat.title), val: trigger, meaning: meaning });
                    }
                    if (meaning) visualRawArrayTR.push(meaning);
                }
                if (target === 'Text' || target === 'Marketing' || target === 'Both') {
                    if (meaning || trigger) {
                        textRawArrayTR.push(`${cat.title}: ${meaning || trigger}`);
                        textBreakdown.push({ label: String(cat.title), val: trigger, meaning: meaning || trigger });
                    }
                }
            }
        });

        dispatch({
            type: A.SET_COMPILED_RESULT, payload: {
                visualRawEN: visualRawArrayEN.join(", "),
                visualRawTR: visualRawArrayTR.join(", "),
                visualRawArrayEN, visualBreakdown,
                textRawTR: textRawArrayTR.join("\n"),
                textRawArrayTR, textBreakdown
            }, tab: 'raw'
        });
    }, [state.activeFormat, state.product, state.description, state.selections, state.activeCards, state.manualInputs, state.categoryOrder, categories, availableCategories, state.isDataLoaded, state.activeCategoryTab, state.appMode]);

    useEffect(() => {
        if (state.autoCompile && state.isDataLoaded) {
            const currentTriggerState = JSON.stringify({ selections: state.selections, product: state.product, description: state.description, activeFormat: state.activeFormat, categoryOrder: state.categoryOrder, appMode: state.appMode });
            if (prevAutoCompileTriggerState.current !== currentTriggerState) { handleCompile(); prevAutoCompileTriggerState.current = currentTriggerState; }
        }
    }, [state.autoCompile, state.selections, state.product, state.description, state.activeFormat, state.isDataLoaded, state.categoryOrder, state.appMode, handleCompile]);

    const handleAnalyzePrompt = async () => {
        dispatch({ type: A.SET_STATE, key: 'showAnalyzeModal', value: true });

        const iterationList = state.appMode === 'marketing' ? availableCategories.map(c => c.id) : state.categoryOrder;
        const activeOrderWithChars = iterationList.filter(id => state.activeCards[state.activeFormat]?.[id]).map(id => {
            const catName = availableCategories.find(c => c.id === id)?.title;
            const charCount = getCharCount(id);
            return charCount > 0 ? `${catName} (${charCount} chars)` : null;
        }).filter(Boolean).join(" -> ");

        const payloadText = state.appMode === 'marketing' ? state.compiledResult.textRawTR : state.compiledResult.visualRawEN;

        const payload = {
            contents: [{ parts: [{ text: `Current Prompt/Strategy: "${payloadText}"\nLength: ${payloadText?.length} chars\nCurrent Structure Order: ${activeOrderWithChars}` }] }],
            systemInstruction: { parts: [{ text: `You are an expert AI Prompt Engineer and Marketing Analyst. Analyze the user's current configuration. Provide 3 short, highly actionable tips in Turkish on how they can improve this specific setup for better AI generation or better marketing resonance. Output JSON: { "analysis_title": "...", "tips": [ { "summary": "Yönetici Özeti", "detail": "Detaylı açıklama..." } ], "overall_score_1_to_10": 8 }` }] },
            generationConfig: { responseMimeType: "application/json", temperature: 0.3 }
        };
        const result = await callGemini(payload, 'isAnalyzing');
        if (!result) { dispatch({ type: A.SET_STATE, key: 'showAnalyzeModal', value: false }); return; }
        dispatch({ type: A.SET_STATE, key: 'analysisResult', value: result });
    };

    const handleAiOptimize = async () => {
        if (!state.hasCompiled) handleCompile();
        dispatch({ type: A.SET_FOOTER_TAB, payload: 'ai' });

        let payloadText = "";
        let sysInstruction = "";

        if (state.appMode === 'marketing') {
            const marketingSelections = availableCategories
                .filter(cat => state.activeCards[state.activeFormat]?.[cat.id])
                .map(cat => {
                    const selectedId = state.selections[state.activeFormat]?.[cat.id];
                    if (!selectedId || (Array.isArray(selectedId) && selectedId.length === 0)) return "";

                    let meaning = '';
                    if (Array.isArray(selectedId)) {
                        meaning = selectedId.map(id => id === 'manual' ? (state.manualInputs[cat.id]?.title || "") : cat.items?.find(i => i.id === id)?.meaning || "").filter(Boolean).join(", ");
                    } else {
                        meaning = selectedId === 'manual' ? (state.manualInputs[cat.id]?.title || "") : cat.items?.find(i => i.id === selectedId)?.meaning || "";
                    }
                    return meaning ? `[${cat.title}]: ${meaning}` : "";
                }).filter(t => t !== "").join("\n");

            sysInstruction = `Sen usta bir Reklam Yazarı ve Pazarlama Stratejistisin. Görevin, kullanıcının seçtiği pazarlama stratejisi parametrelerini kullanarak, belirtilen ürün/konu için yüksek dönüşümlü, etkileyici bir reklam metni veya video senaryosu oluşturmaktır.
Hedef Kitle, Pazarlama Açısı, Duygusal Tetikleyici ve Görsel Çengel (Hook) öğelerini metne doğal ve ikna edici bir şekilde yedir. Ürün ve vizyon detaylarını yaratıcı bir hikayeye dönüştür.
Output JSON format exactly: { "optimized_prompt_tr": "Türkçe Reklam Metni / Senaryosu", "ai_note": "Strateji analizi ve tavsiyeler (Türkçe, markdown bullet list)" }`;

            payloadText = `Ürün: ${state.product}.\nDetaylar: ${state.description}.\nPazarlama Parametreleri:\n${marketingSelections}`;

        } else {
            const technicalSelections = state.categoryOrder
                .filter(catId => state.activeCards[state.activeFormat]?.[catId])
                .map(catId => {
                    const cat = categories.find(c => c.id === catId);
                    if (!cat || cat.isMeta || (cat.targetOutput && cat.targetOutput !== 'Visual' && cat.targetOutput !== 'Both')) return "";

                    const selectedId = state.selections[state.activeFormat]?.[cat.id];
                    if (!selectedId || (Array.isArray(selectedId) && selectedId.length === 0)) return "";

                    if (Array.isArray(selectedId)) {
                        const triggers = selectedId.map(id => id === 'manual' ? (state.manualInputs[cat.id]?.desc || "") : cat.items?.find(i => i.id === id)?.trigger || "").filter(Boolean).join(", ");
                        return triggers ? `[${cat.title}]: ${triggers}` : "";
                    } else {
                        const val = selectedId === 'manual' ? (state.manualInputs[cat.id]?.desc || "") : cat.items?.find(i => i.id === selectedId)?.trigger || "";
                        return val ? `[${cat.title}]: ${val}` : "";
                    }
                }).filter(t => t !== "").join("\n");

            const targetModelId = state.selections[state.activeFormat]?.['target_model'];
            let targetModelLabel = 'General';

            if (targetModelId === 'manual') {
                targetModelLabel = state.manualInputs['target_model']?.desc || 'General';
            } else {
                const targetCat = categories.find(c => c.id === 'target_model');
                targetModelLabel = targetCat?.items?.find(i => i.id === targetModelId)?.trigger || 'General';
            }

            sysInstruction = `You are a Master Prompt Engineer. Your task is to ENHANCE, EXPAND and BLEND the user's base scene with the technical selections. 
RULE 1: NEVER summarize or remove any technical details. The output must be AT LEAST as long as the original input. 
RULE 2: Apply these CONFLICT RESOLUTION RULES strictly:
${CONFLICT_RULES.map(r => "- " + r).join("\n")}
RULE 3: Provide explanations for any resolved conflicts in Turkish.
STRICT LIMIT: Keep response concise, under 800 characters. No fluff.

Structure the optimized_prompt_en exactly in this strict order:
1. Subject description and key visual details
2. Surface, environment, composition
3. Lighting setup
4. Camera body and lens
5. Technical quality parameters (ISO, resolution, etc.)

Output JSON format exactly: { "optimized_prompt_en": "string", "optimized_prompt_tr": "Turkish translation string", "ai_note": "Markdown bulleted list summary in Turkish with emojis", "conflicts_found": ["array of strings describing resolved conflicts in Turkish", or empty array] }`;

            payloadText = `Subject: ${state.product}.\nDetails: ${state.description}.\nTechnical Parameters:\n${technicalSelections}\n\nOptimize for: ${targetModelLabel}`;
        }

        const payload = {
            contents: [{ parts: [{ text: payloadText }] }],
            systemInstruction: { parts: [{ text: sysInstruction }] },
            generationConfig: { responseMimeType: "application/json", temperature: 0.3 }
        };

        const result = await callGemini(payload, 'isOptimizing');
        if (!result) return;

        let note = result.ai_note || "";
        note = String(note).replace(/^(?:Geliştirme|Optimizasyon|AI)?\s*(?:Notları|Notu|Özeti)?\s*[:\-]*\s*/i, '').trim();

        // 3C: Pazarlama modunda çıktı eşleşmesini düzeltme (aiEN alanına marketing modunda Türkçe gelir)
        const finalAiEN = state.appMode === 'marketing'
            ? (result.optimized_prompt_tr || result.optimized_prompt || "")
            : (result.optimized_prompt_en || result.optimized_prompt || "");
        const finalAiTR = result.optimized_prompt_tr || "";

        dispatch({
            type: A.SET_COMPILED_RESULT,
            payload: {
                aiEN: finalAiEN,
                aiTR: finalAiTR,
                noteShort: note.split('\n')[0].substring(0, 60) + "...",
                noteLong: note,
                conflicts_found: result.conflicts_found || []
            },
            tab: 'ai'
        });
        setTimeout(() => footerRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const handleMagicIdea = async () => {
        const payload = {
            contents: [{ parts: [{ text: "Sen vizyoner bir sanat yönetmenisin. Bana tek bir görsel üretim projesi için inanılmaz yaratıcı, daha önce düşünülmemiş bir ürün konsepti ve bu ürünün içinde bulunduğu sinematik, büyüleyici bir sahne tasviri yarat. Lütfen Türkçe yaz. JSON formatında dön: { \"product\": \"Kısa ürün adı\", \"scene\": \"Detaylı ve etkileyici sahne tasviri\" }" }] }],
            systemInstruction: { parts: [{ text: "Master Prompt Creator. Return ONLY valid JSON format." }] },
            generationConfig: { responseMimeType: "application/json", temperature: 0.9 }
        };
        const result = await callGemini(payload, 'isGeneratingMagic');
        if (result) {
            dispatch({ type: A.UPDATE_INPUT, field: 'product', value: result.product });
            dispatch({ type: A.UPDATE_INPUT, field: 'description', value: result.scene });
            dispatch({ type: A.SET_STATE, key: 'productForm', value: { ...state.productForm, Product_Name_TR: result.product, Scene_Desc_TR: result.scene } });
        }
    };

    const handleGenerateVariations = async () => {
        const basePrompt = state.footerTab === 'ai' ? (state.appMode === 'marketing' ? state.compiledResult.aiTR : state.compiledResult.aiEN) : (state.appMode === 'marketing' ? state.compiledResult.textRawTR : state.compiledResult.visualRawEN);
        if (!basePrompt) return;

        const payload = {
            contents: [{ parts: [{ text: `Original Prompt/Strategy: "${basePrompt}".\nTask: Generate 3 highly distinct creative variations of this prompt by dramatically changing the style, mood, lighting or angle. Maintain the core subject. Return JSON: { "variations": [ { "style_name": "...", "prompt": "..." } ] }` }] }],
            systemInstruction: { parts: [{ text: "Expert AI Creator. Return ONLY valid JSON." }] },
            generationConfig: { responseMimeType: "application/json", temperature: 0.8 }
        };
        const result = await callGemini(payload, 'isGeneratingVariations');
        if (result && result.variations) {
            dispatch({ type: A.SET_STATE, key: 'variations', value: result.variations });
            dispatch({ type: A.SET_STATE, key: 'showVariationsModal', value: true });
        }
    };

    const getCharCount = (catId) => {
        const selectedId = state.selections[state.activeFormat]?.[catId];
        if (!selectedId) return 0;
        const targetCat = availableCategories.find(c => c.id === catId);
        if (Array.isArray(selectedId)) {
            return selectedId.map(id => {
                if (id === 'manual') return String(state.manualInputs[catId]?.desc || "").length;
                const item = targetCat?.items?.find(i => i.id === id);
                return String(item?.trigger || item?.label || "").length;
            }).reduce((a, b) => a + b, 0);
        }
        if (selectedId === 'manual') return String(state.manualInputs[catId]?.desc || "").length;
        const item = targetCat?.items?.find(i => i.id === selectedId);
        return String(item?.trigger || item?.label || "").length;
    };

    return { categories, availableCategories, handleSelection, state, dispatch, footerRef, handleCompile, handleAiOptimize, handleEnhanceScene, handleGenerateCustomTrigger, handleAnalyzePrompt, syncToDatabase, getCharCount, handleMagicIdea, handleGenerateVariations };
};

/**
 * =============================================================================
 * MAIN APPLICATION
 * =============================================================================
 */
const App = () => {
    const {
        categories, availableCategories, handleSelection, state, dispatch, footerRef,
        handleEnhanceScene, handleGenerateCustomTrigger,
        handleCompile, handleAnalyzePrompt, handleAiOptimize, getCharCount, syncToDatabase,
        handleMagicIdea, handleGenerateVariations
    } = usePromptManager();

    const [showExpandModal, setShowExpandModal] = useState(false);
    const [draggedCat, setDraggedCat] = useState(null);
    const draggedCatRef = useRef(null);
    const [copiedVisual, setCopiedVisual] = useState(false);

    const sceneTextareaRef = useRef(null);

    useEffect(() => {
        if (sceneTextareaRef.current) {
            sceneTextareaRef.current.style.height = 'auto';
            sceneTextareaRef.current.style.height = sceneTextareaRef.current.scrollHeight + 'px';
        }
    }, [state.description]);

    const showToast = useCallback((msg) => {
        const id = Date.now();
        dispatch({ type: A.ADD_NOTIFICATION, payload: { id, message: msg } });
        setTimeout(() => dispatch({ type: A.REMOVE_NOTIFICATION, payload: id }), 4000);
    }, [dispatch]);

    // Modal açıkken scroll'u kilitle — tüm modal state'lerini tek boolean'a indir
    const anyModalOpen = state.showAiNoteModal || showExpandModal || state.showGaugeModal || state.showAnalyzeModal || state.showDebugModal || state.showAdminModal;
    useEffect(() => {
        document.body.style.overflow = anyModalOpen ? 'hidden' : 'auto';
        return () => { document.body.style.overflow = 'auto'; };
    }, [anyModalOpen]);

    const currentActiveLength = state.footerTab === 'ai'
        ? String(state.compiledResult.aiTR || state.compiledResult.aiEN || "").length
        : String(state.appMode === 'marketing' ? state.compiledResult.textRawTR : state.compiledResult.visualRawEN || "").length;

    let dynBg = state.isDark ? 'bg-black/20 border-white/5' : 'bg-white border-slate-200';
    if (currentActiveLength > 1500) {
        dynBg = state.isDark ? 'bg-red-900/20 border-red-500/30' : 'bg-red-50 border-red-200';
    } else if (currentActiveLength > 1000) {
        dynBg = state.isDark ? 'bg-amber-900/20 border-amber-500/30' : 'bg-amber-50 border-amber-200';
    }

    const handleDragStart = useCallback((e, id) => {
        setDraggedCat(id);
        draggedCatRef.current = id;
        e.dataTransfer.effectAllowed = "move";
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    }, []);

    const handleDrop = useCallback((e, dropTargetId) => {
        e.preventDefault();
        const currentDragged = draggedCatRef.current;
        if (!currentDragged || currentDragged === dropTargetId) return;

        const cat1 = availableCategories.find(c => c.id === currentDragged);
        const cat2 = availableCategories.find(c => c.id === dropTargetId);

        // 3A: Pazarlama modunda grup kısıtlamasını devre dışı bırak
        if (state.appMode !== 'marketing' && cat1 && cat2 && cat1.groupName !== cat2.groupName) {
            dispatch({ type: A.SET_ERROR, message: `İşlem iptal edildi: Sadece aynı grup içerisine sürüklenebilir.` });
            setDraggedCat(null);
            draggedCatRef.current = null;
            return;
        }

        const newOrder = [...state.categoryOrder];
        const dragIndex = newOrder.indexOf(currentDragged);
        const dropIndex = newOrder.indexOf(dropTargetId);
        newOrder.splice(dragIndex, 1);
        newOrder.splice(dropIndex, 0, currentDragged);

        dispatch({ type: A.SET_STATE, key: 'categoryOrder', value: newOrder });
        setDraggedCat(null);
        draggedCatRef.current = null;

        // Toplu Update_Row gönderimi
        if (state.appMode !== 'marketing') {
            const payloadItems = newOrder.map((id, idx) => ({ Category_id: id, Prompt_Order_Index: idx, Order_index: idx }));
            syncToDatabase('update_row', 'Categories', payloadItems);
        }
    }, [availableCategories, state.appMode, state.categoryOrder, dispatch, syncToDatabase]);

    const handleDragEnd = useCallback(() => {
        setDraggedCat(null);
        draggedCatRef.current = null;
    }, []);

    const handleProductSelect = (val) => {
        dispatch({ type: A.SET_STATE, key: 'selectedProductId', value: val });
        if (val) {
            const prod = state.products.find(p => String(p.Product_Id || p.Product_Name_TR) === String(val));
            if (prod) {
                dispatch({ type: A.SET_STATE, key: 'productForm', value: prod });
                dispatch({ type: A.UPDATE_INPUT, field: 'product', value: prod.Product_Name_TR || '' });
                dispatch({ type: A.UPDATE_INPUT, field: 'description', value: prod.Scene_Desc_TR || '' });
            }
        } else {
            dispatch({ type: A.SET_STATE, key: 'productForm', value: {} });
            dispatch({ type: A.UPDATE_INPUT, field: 'product', value: '' });
            dispatch({ type: A.UPDATE_INPUT, field: 'description', value: '' });
        }
    };

    // 1D: prodHeaders güvenli fallback ve meta kolon filtreleme
    const META_PROD_COLS = ['Is_Active', 'Create_Time', 'Update_Time'];
    const prodHeaders = (state.tableHeaders?.products?.length > 0
        ? state.tableHeaders.products
        : ['Product_Name_TR', 'Scene_Desc_TR', 'Product_URL', 'Image_URL']
    ).filter(h => !META_PROD_COLS.includes(h));

    return (
        <div className={`min-h-screen w-full flex flex-col relative bg-slate-50 overflow-y-auto ${state.isDark ? 'bg-neutral-950 text-white' : 'bg-slate-50 text-slate-900'} font-sans transition-colors duration-500`}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');
        body { font-family: 'Montserrat', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${state.isDark ? '#334155' : '#cbd5e1'}; border-radius: 10px; }
        .mask-fade-right { mask-image: linear-gradient(to right, black 80%, transparent 100%); -webkit-mask-image: linear-gradient(to right, black 80%, transparent 100%); }
        .bg-mesh {
            background-color: ${state.isDark ? '#0a0a0a' : '#f8fafc'};
            background-image: 
                radial-gradient(at 0% 0%, ${state.isDark ? 'rgba(79, 70, 229, 0.15)' : 'rgba(79, 70, 229, 0.08)'} 0px, transparent 50%),
                radial-gradient(at 100% 0%, ${state.isDark ? 'rgba(236, 72, 153, 0.15)' : 'rgba(236, 72, 153, 0.08)'} 0px, transparent 50%);
            background-size: 100% 100%;
            background-repeat: no-repeat;
            background-attachment: fixed;
        }
      `}</style>
            <div className="fixed inset-0 pointer-events-none bg-mesh z-0"></div>

            {state.notifications && state.notifications.length > 0 && (
                <div className="fixed top-4 right-4 z-[400] flex flex-col gap-2 pointer-events-none">
                    {state.notifications.slice(0, 5).map(notif => (
                        <div
                            key={notif.id}
                            className="bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-8 duration-300 pointer-events-auto border border-emerald-400/50 max-w-xs"
                        >
                            <Check size={16} className="flex-shrink-0" />
                            <span className="text-xs font-bold flex-1">{String(notif.message)}</span>
                            <button
                                onClick={() => dispatch({ type: A.REMOVE_NOTIFICATION, payload: notif.id })}
                                className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {state.error && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[350] bg-red-500/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 border border-red-400/50 max-w-[90vw]">
                    <AlertCircle size={18} />
                    <span className="text-sm font-bold">
                        {state.error && typeof state.error === 'object'
                            ? (state.error.message || JSON.stringify(state.error))
                            : String(state.error || '')}
                        {state.error && typeof state.error === 'object' && state.error.context ? <span className="opacity-70 text-xs font-normal ml-1">({String(state.error.context)})</span> : null}
                    </span>
                    <button onClick={() => dispatch({ type: A.CLEAR_ERROR })} className="ml-2 hover:bg-white/20 p-1 rounded-full transition-all"><X size={16} /></button>
                </div>
            )}

            <header className={`border-b shadow-[0_4px_30px_rgb(0,0,0,0.05)] backdrop-blur-xl px-6 py-3 sticky top-0 z-50 flex-shrink-0 relative ${state.isDark ? 'bg-neutral-950/70 border-white/10' : 'bg-white/80 border-slate-200'}`}>
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <DynamicIcon name="Sparkles" size={24} className="text-indigo-500 drop-shadow-sm" />
                        <h1 className="text-[15px] font-semibold tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hidden md:block font-['Montserrat']">PROMPT STUDIO</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <FormatSwitcher formats={DATA_CONFIG.FORMATS} activeFormat={state.activeFormat} onChange={(formatId) => dispatch({ type: A.SET_FORMAT, payload: formatId })} isDark={state.isDark} />
                        <div className="w-px h-5 bg-slate-300 dark:bg-white/10 hidden md:block" />
                        <button onClick={() => dispatch({ type: A.SET_STATE, key: 'showAdminModal', value: true })} className={`p-2.5 rounded-full transition-all text-slate-400 hover:text-indigo-500`} title="Veritabanı Yönetimi"><Settings size={16} /></button>
                        <button onClick={() => dispatch({ type: A.SET_STATE, key: 'showDebugModal', value: true })} className={`p-2.5 rounded-full transition-all text-slate-400 hover:text-indigo-500`} title="Dev Payload Viewer"><TerminalSquare size={16} /></button>
                        <button role="switch" aria-checked={state.isDark} onClick={() => dispatch({ type: A.SET_STATE, key: 'isDark', value: !state.isDark })} className={`p-2.5 rounded-full border transition-all shadow-sm ${state.isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                            {state.isDark ? <Sun size={16} /> : <Moon size={16} />}
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:px-8 lg:py-8 flex flex-col gap-6 relative z-10 min-h-0">

                {/* KURAL 2A: SectionWrapper "ÜRÜN VE SAHNE" içindeki dinamik form grid'e alındı */}
                <SectionWrapper title="ÜRÜN VE SAHNE" colorTheme="indigo" isDark={state.isDark} containerClassName="flex flex-col gap-6 p-6 lg:p-8 rounded-[2.5rem]">
                    {/* Sağ üst köşe butonları */}
                    <div className="flex items-center justify-between w-full mb-6">
                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                            {state.selectedProductId ? 'Şablon Düzenleniyor' : 'Yeni Ürün'}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleMagicIdea}
                                disabled={state.isGeneratingMagic}
                                className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 px-3 py-1.5 rounded-full transition-all active:scale-95"
                            >
                                {state.isGeneratingMagic ? <Loader2 size={12} className="animate-spin" /> : '✨'} İlham Ver
                            </button>
                            <button
                                onClick={() => {
                                    const newId = `prod_${Date.now()}`;
                                    syncToDatabase('CREATE_RECORD', 'products', {
                                        ...state.productForm,
                                        Product_Id: newId,
                                        Product_Name_TR: state.product,
                                        Scene_Desc_TR: state.description
                                    });
                                }}
                                className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-full transition-all active:scale-95"
                            >
                                <Save size={12} /> Kaydet
                            </button>
                        </div>
                    </div>

                    {/* Şablon Seçici — sadece ürün listesi, minimal */}
                    {state.products.length > 0 && (
                        <select
                            className={`w-full max-w-xs mb-6 p-2 rounded-xl outline-none text-xs font-semibold bg-transparent border border-slate-200 dark:border-white/10 ${state.isDark ? 'text-white' : 'text-slate-600'}`}
                            value={state.selectedProductId}
                            onChange={(e) => handleProductSelect(e.target.value)}
                        >
                            <option value="">— Şablon seç veya kendin yaz —</option>
                            {state.products.map((p, i) => (
                                <option key={i} value={String(p.Product_Id || p.Product_Name_TR)}>
                                    {String(p.Product_Name_TR)}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Dinamik Form Alanları */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                        {prodHeaders.map(header => {
                            if (header === 'Create_Time' || header === 'Update_Time') return null;
                            const isScene = header === 'Scene_Desc_TR';
                            const currentVal = header === 'Product_Name_TR' ? state.product : (state.productForm?.[header] || '');
                            const isDirty = currentVal !== '' && currentVal !== (state.products.find(p => String(p.Product_Id || p.Product_Name_TR) === state.selectedProductId)?.[header] || '');

                            return (
                                <div key={header} className={isScene ? 'col-span-1 md:col-span-2' : 'col-span-1'}>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1 mb-2 block">
                                        {header === 'Product_Name_TR' ? 'ÜRÜN / KONU' : header === 'Scene_Desc_TR' ? 'SAHNE DETAYLARI' : String(header)}
                                    </label>
                                    {isScene ? (
                                        <div className="relative">
                                            <textarea
                                                ref={sceneTextareaRef}
                                                value={state.description}
                                                rows={1}
                                                onChange={e => {
                                                    e.target.style.height = 'auto';
                                                    e.target.style.height = e.target.scrollHeight + 'px';
                                                    dispatch({ type: A.UPDATE_INPUT, field: 'description', value: e.target.value });
                                                    dispatch({ type: A.SET_STATE, key: 'productForm', value: { ...state.productForm, [header]: e.target.value } });
                                                }}
                                                placeholder="Sahneyi betimleyin..."
                                                className={`w-full bg-transparent outline-none resize-none text-sm font-semibold border-b-2 pb-2 pr-10 transition-all overflow-hidden
                            ${isDirty ? 'border-orange-400' : 'border-slate-200 dark:border-white/10'}
                            ${state.isDark ? 'text-white placeholder-slate-600' : 'text-slate-900 placeholder-slate-400'}`}
                                                style={{ minHeight: '2rem' }}
                                            />
                                            <button
                                                onClick={handleEnhanceScene}
                                                disabled={state.isEnhancingScene || !state.description?.trim()}
                                                className="absolute bottom-3 right-0 p-1.5 rounded-lg transition-all disabled:opacity-30 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/20"
                                                title="AI ile Geliştir"
                                            >
                                                {state.isEnhancingScene ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                            </button>
                                        </div>
                                    ) : (
                                        <input
                                            value={currentVal}
                                            onChange={e => {
                                                const v = e.target.value;
                                                dispatch({ type: A.SET_STATE, key: 'productForm', value: { ...state.productForm, [header]: v } });
                                                if (header === 'Product_Name_TR') dispatch({ type: A.UPDATE_INPUT, field: 'product', value: v });
                                            }}
                                            placeholder={header === 'Product_Name_TR' ? 'Örn: Parıltılı Altın Saat' : `${String(header)}...`}
                                            className={`w-full bg-transparent outline-none text-sm font-semibold border-b-2 pb-2 transition-all
                          ${isDirty ? 'border-orange-400' : 'border-slate-200 dark:border-white/10'}
                          ${state.isDark ? 'text-white placeholder-slate-600' : 'text-slate-900 placeholder-slate-400'}`}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </SectionWrapper>

                <div className="w-full flex justify-center py-4 animate-in fade-in slide-in-from-bottom-2 relative z-30">
                    <div className={`flex p-2 rounded-[2.5rem] w-full max-w-4xl border shadow-xl transition-all ${state.isDark ? 'bg-black/40 border-white/10 backdrop-blur-md' : 'bg-white/80 border-slate-200 backdrop-blur-md'}`}>
                        <button
                            onClick={() => dispatch({ type: A.SET_STATE, key: 'appMode', value: 'visual' })}
                            className={`flex-1 py-4 text-[11px] lg:text-xs font-black uppercase tracking-[0.2em] rounded-[2rem] transition-all flex items-center justify-center gap-3 ${state.appMode === 'visual' ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/30 scale-[1.02]' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                        >
                            <Camera size={18} /> <span className="hidden sm:inline">GÖRSEL ÜRETİMİ</span><span className="sm:hidden">GÖRSEL</span>
                        </button>
                        <button
                            onClick={() => dispatch({ type: A.SET_STATE, key: 'appMode', value: 'marketing' })}
                            className={`flex-1 py-4 text-[11px] lg:text-xs font-black uppercase tracking-[0.2em] rounded-[2rem] transition-all flex items-center justify-center gap-3 ${state.appMode === 'marketing' ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-[1.02]' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                        >
                            <Target size={18} /> <span className="hidden sm:inline">PAZARLAMA STRATEJİSİ</span><span className="sm:hidden">STRATEJİ</span>
                        </button>
                    </div>
                </div>

                <SectionWrapper
                    title={state.appMode === 'visual' ? "GÖRSEL ÜRETİMİ PARAMETRELERİ" : "PAZARLAMA STRATEJİSİ PARAMETRELERİ"}
                    colorTheme="emerald" isDark={state.isDark} containerClassName="flex flex-col lg:flex-row rounded-[2.5rem] overflow-hidden lg:h-[700px] h-auto min-h-[800px] relative z-10">
                    <CategorySidebar
                        isDark={state.isDark} isReorderMode={state.isReorderMode} onToggleReorder={() => dispatch({ type: A.SET_STATE, key: 'isReorderMode', value: !state.isReorderMode })}
                        isDataLoaded={state.isDataLoaded} categoryOrder={state.categoryOrder} availableCategories={availableCategories}
                        activeFormat={state.activeFormat} activeCards={state.activeCards} activeCategoryTab={state.activeCategoryTab} selections={state.selections} manualInputs={state.manualInputs}
                        onSelectTab={(id) => dispatch({ type: A.SET_CATEGORY_TAB, payload: id })}
                        onToggleCard={(id) => {
                            const isActive = !state.activeCards[state.activeFormat]?.[id];
                            dispatch({ type: A.TOGGLE_CARD, categoryId: id });
                            syncToDatabase('update_row', 'Categories', [{ Category_id: id, Is_Active: isActive }]);
                        }}
                        getCharCount={getCharCount}
                    />
                    <div className="flex-1 flex flex-col bg-transparent relative overflow-visible lg:overflow-hidden min-h-[550px] lg:min-h-0 lg:h-full pt-4 z-20">
                        <div className={`h-16 px-8 border-b flex items-center justify-between flex-shrink-0 z-10 sticky top-0 backdrop-blur-xl ${state.isDark ? 'border-white/5 bg-neutral-900/60' : 'border-slate-200/50 bg-white/60'}`}>
                            <div className="flex items-center gap-3">
                                {availableCategories.find(c => c.id === state.activeCategoryTab) ? (
                                    <><DynamicIcon name={availableCategories.find(c => c.id === state.activeCategoryTab).iconName} size={24} className="text-indigo-600 dark:text-indigo-400" /><h2 className="text-base font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">{String(availableCategories.find(c => c.id === state.activeCategoryTab)?.title || '')}</h2></>
                                ) : (<div className="h-6 w-40 bg-slate-200 dark:bg-white/10 rounded animate-pulse"></div>)}
                            </div>
                            <div className="flex items-center gap-4">
                                {availableCategories.find(c => c.id === state.activeCategoryTab) && (
                                    <div className={`${UI_STYLES.switcher.container} ${state.isDark ? UI_STYLES.switcher.containerDark : UI_STYLES.switcher.containerLightMd}`}>
                                        <button onClick={() => dispatch({ type: A.SET_STATE, key: 'itemSortMode', value: 'group' })} className={`${UI_STYLES.switcher.btnBase} px-3 py-1 text-[10px] gap-1 ${state.itemSortMode === 'group' ? UI_STYLES.switcher.btnActive : UI_STYLES.switcher.btnInactive}`}><Layers size={12} /> Gruplu</button>
                                        <button onClick={() => dispatch({ type: A.SET_STATE, key: 'itemSortMode', value: 'az' })} className={`${UI_STYLES.switcher.btnBase} px-3 py-1 text-[10px] gap-1 ${state.itemSortMode === 'az' ? UI_STYLES.switcher.btnActive : UI_STYLES.switcher.btnInactive}`}><List size={12} /> A-Z</button>
                                    </div>
                                )}
                                {availableCategories.find(c => c.id === state.activeCategoryTab) && (
                                    <button
                                        onClick={() => dispatch((s) => ({ type: A.SET_STATE, key: 'isManualOpen', value: { ...s.isManualOpen, [state.activeCategoryTab]: !s.isManualOpen[state.activeCategoryTab] } }))}
                                        className={`flex items-center gap-1 p-2 rounded-xl border transition-all shadow-sm ${state.isManualOpen[state.activeCategoryTab] ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : (state.isDark ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-500')}`}
                                    >
                                        {state.isManualOpen[state.activeCategoryTab] ? <X size={14} /> : <Plus size={14} />} <span className="text-[10px] font-bold uppercase hidden md:inline">Ekle</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 space-y-8 min-h-0 relative z-0">
                            {!state.isDataLoaded ? (
                                <div className="flex flex-col items-center justify-center py-32 opacity-50"><Loader2 size={40} className="animate-spin text-indigo-500 mb-6" /><span className="text-sm font-black uppercase tracking-widest text-slate-400">Bekleniyor...</span></div>
                            ) : availableCategories.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-32 opacity-50"><AlertCircle size={40} className="text-red-400 mb-6" /><span className="text-sm font-black uppercase tracking-widest text-slate-400">Bulunamadı</span></div>
                            ) : (
                                <>
                                    {availableCategories.find(c => c.id === state.activeCategoryTab) && availableCategories.find(c => c.id === state.activeCategoryTab).description && (
                                        <div className={`p-4 rounded-2xl border flex flex-col gap-2 ${state.isDark ? 'bg-indigo-900/10 border-indigo-800/30' : 'bg-indigo-50/50 border-indigo-100'}`}>
                                            <div className="flex items-start gap-3">
                                                <Info size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                                                <div className="flex flex-col gap-1.5">
                                                    <p className={`text-xs font-medium leading-relaxed ${state.isDark ? 'text-indigo-200' : 'text-indigo-800'}`}>{String(availableCategories.find(c => c.id === state.activeCategoryTab).description)}</p>
                                                    {availableCategories.find(c => c.id === state.activeCategoryTab).example && <p className={`text-[10px] italic font-medium opacity-80 ${state.isDark ? 'text-indigo-300' : 'text-indigo-700'}`}><span className="font-bold not-italic mr-1">Örnek:</span>"{String(availableCategories.find(c => c.id === state.activeCategoryTab).example)}"</p>}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {availableCategories.find(c => c.id === state.activeCategoryTab) && state.isManualOpen[state.activeCategoryTab] && (
                                        <div className={`p-6 rounded-[2.5rem] border transition-all relative group animate-in fade-in slide-in-from-top-4 ${state.selections[state.activeFormat]?.[state.activeCategoryTab] === 'manual' ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-500/10 ring-2 ring-indigo-500/20 shadow-sm' : 'border-slate-200 dark:border-white/10 shadow-sm bg-white/60 dark:bg-neutral-800/50 hover:border-indigo-300'}`}>
                                            <div className="flex items-center gap-2 mb-1"><DynamicIcon name="Sparkles" size={14} className="text-indigo-500" /><span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">AKILLI MANUEL GİRİŞ</span></div>
                                            <p className="text-[10px] text-slate-400 mb-4 italic">{String(availableCategories.find(c => c.id === state.activeCategoryTab)?.manualTip || "Kendi özel parametrenizi yazın.")}</p>
                                            <ManualInputArea isDark={state.isDark} value={state.customInput} onChange={e => { dispatch({ type: A.SET_STATE, key: 'customInput', value: e.target.value }); }} onTranslate={handleGenerateCustomTrigger} isTranslating={state.isGeneratingTrigger} />
                                        </div>
                                    )}

                                    <div className="flex flex-col pb-6">
                                        {(() => {
                                            const activeCat = availableCategories.find(c => c.id === state.activeCategoryTab);
                                            if (!activeCat?.items) return [];
                                            const groups = [];
                                            let itemsToGroup = [...activeCat.items];

                                            if (state.itemSortMode === 'az') {
                                                itemsToGroup.sort((a, b) => String(a.label).localeCompare(String(b.label)));
                                                groups.push({ key: 'az', name: 'TÜM SEÇENEKLER (A-Z)', cats: itemsToGroup });
                                            } else {
                                                const groupMap = new Map();
                                                itemsToGroup.forEach(item => {
                                                    const groupKey = item.badge || 'DİĞER';
                                                    if (!groupMap.has(groupKey)) {
                                                        const newGroup = { key: groupKey, name: groupKey, cats: [] };
                                                        groups.push(newGroup);
                                                        groupMap.set(groupKey, newGroup);
                                                    }
                                                    groupMap.get(groupKey).cats.push(item);
                                                });
                                            }
                                            return groups;
                                        })().map((group) => {
                                            // ÇİFT BAŞLIK FİXİ: Eğer grubun adı "DİĞER" ise veya grubun altındaki tek öğenin adı (label) grup adıyla aynıysa/içeriyorsa başlığı gösterme.
                                            const groupNameNorm = String(group.name).toLowerCase().trim();
                                            const firstLabelNorm = String(group.cats[0].label).toLowerCase().trim();
                                            const shouldShowGroupHeader = group.key !== 'DİĞER' && !(group.cats.length === 1 && (firstLabelNorm.includes(groupNameNorm) || groupNameNorm.includes(firstLabelNorm)));

                                            return (
                                                <div key={group.key} className="mb-8 last:mb-0">
                                                    {/* Koşullu Başlık Render'ı */}
                                                    {shouldShowGroupHeader && (
                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200/50 dark:border-white/10 pb-1 mb-4 mt-2">{String(group.name)}</h4>
                                                    )}
                                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                                        {group.cats.map(item => {
                                                            const currentSel = state.selections[state.activeFormat]?.[state.activeCategoryTab];
                                                            const isMultiSelect = state.activeCategoryTab === 'negative_prompt';
                                                            const isSelected = isMultiSelect ? Array.isArray(currentSel) && currentSel.includes(item.id) : currentSel === item.id;
                                                            return <CategoryItemCard key={item.id} item={item} isSelected={isSelected} isMultiSelect={isMultiSelect} isDark={state.isDark} onSelect={() => handleSelection(state.activeCategoryTab, item.id)} onEditManual={() => { dispatch({ type: A.SET_STATE, key: 'customInput', value: item.meaning || item.label }); dispatch((s) => ({ type: A.SET_STATE, key: 'isManualOpen', value: { ...s.isManualOpen, [state.activeCategoryTab]: true } })); }} />;
                                                        })}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </SectionWrapper>

                <SectionWrapper title="SIRALAMA VE ANALİZ" colorTheme="amber" isDark={state.isDark} containerClassName="relative flex flex-col p-5 px-6 rounded-2xl gap-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/50 dark:border-white/10 pb-4 pt-2">
                        <div className="flex items-center gap-4">
                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Sıralama Modu</span>
                            <div className="flex items-center bg-slate-200/50 dark:bg-white/5 rounded-lg p-0.5">
                                <button onClick={() => dispatch({ type: A.SET_STATE, key: 'isReorderVertical', value: false })} className={`p-1.5 rounded-md transition-all ${!state.isReorderVertical ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}><MoveHorizontal size={14} /></button>
                                <button onClick={() => dispatch({ type: A.SET_STATE, key: 'isReorderVertical', value: true })} className={`p-1.5 rounded-md transition-all ${state.isReorderVertical ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}><List size={14} /></button>
                            </div>
                            <label className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all border cursor-pointer ${state.showInactiveInReorder ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-400' : 'bg-transparent border-slate-200 text-slate-500 dark:border-white/10 dark:text-slate-400'}`}>
                                <Toggle checked={state.showInactiveInReorder} onChange={() => dispatch({ type: A.SET_STATE, key: 'showInactiveInReorder', value: !state.showInactiveInReorder })} className="scale-[0.8] origin-left" />
                                Pasifleri Göster
                            </label>
                        </div>
                        <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto justify-between lg:justify-end">
                            <PromptHealthGauge length={currentActiveLength} onOpenModal={() => dispatch({ type: A.SET_STATE, key: 'showGaugeModal', value: true })} />
                            <div className="w-px h-5 bg-slate-200 dark:bg-white/10"></div>
                            <MasterAiButton onClick={handleAnalyzePrompt} disabled={state.isAnalyzing || currentActiveLength === 0} loading={state.isAnalyzing} icon={Activity} text="Analiz Et" className="px-3 py-1.5 text-[10px] rounded-full" />
                            <MasterAiButton onClick={() => { const newOrder = []; IDEAL_ORDER.forEach(id => { if (availableCategories.find(c => c.id === id)) newOrder.push(id); }); availableCategories.forEach(c => { if (!newOrder.includes(c.id)) newOrder.push(c.id); }); dispatch({ type: A.SET_STATE, key: 'categoryOrder', value: newOrder }); }} icon={Wand2} text="AI Sırala" className="px-3 py-1.5 text-[10px] rounded-full" />
                        </div>
                    </div>
                    <div className={`flex ${state.isReorderVertical ? 'flex-col gap-2' : 'items-center gap-1.5 overflow-x-auto custom-scrollbar pb-2 pt-1 mask-fade-right'}`}>
                        {(state.appMode === 'marketing' ? availableCategories.map(c => c.id) : state.categoryOrder).filter(id => availableCategories.find(c => c.id === id) && (state.showInactiveInReorder || state.activeCards[state.activeFormat]?.[id])).map((id, index) => {
                            const cat = availableCategories.find(c => c.id === id);
                            if (!cat) return null;
                            const isActive = state.activeCards[state.activeFormat]?.[id];

                            return (
                                <div key={id} draggable onDragStart={(e) => handleDragStart(e, id)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, id)} onDragEnd={handleDragEnd} className={`flex items-center gap-2 cursor-grab px-3 py-2 rounded-xl border transition-all ${isActive ? (state.isDark ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-700 shadow-sm') : (state.isDark ? 'bg-transparent border-white/5 text-slate-500 border-dashed opacity-40 grayscale' : 'bg-slate-100 border-slate-300 text-slate-400 border-dashed opacity-40 grayscale')} ${draggedCat === id ? 'opacity-30 scale-95 border-indigo-500' : ''}`}>
                                    <GripVertical size={14} className="opacity-30" />
                                    <span className="text-[10px] font-bold">{String(cat.title)}</span>
                                </div>
                            );
                        })}
                    </div>
                </SectionWrapper>

                <SectionWrapper title="ÇIKTI VE OPTİMİZASYON" colorTheme="rose" isDark={state.isDark} innerRef={footerRef} outerClassName="mt-1" customBg={dynBg} containerClassName="flex flex-col rounded-[2.5rem] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] overflow-hidden transition-colors duration-500">
                    {state.compiledResult.conflicts_found && state.compiledResult.conflicts_found.length > 0 && state.footerTab === 'ai' && (
                        <button onClick={() => dispatch({ type: A.SET_STATE, key: 'showAiNoteModal', value: true })} className="w-full bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20 px-6 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all text-left mt-6">
                            <AlertTriangle size={16} className="text-amber-600 dark:text-amber-500 flex-shrink-0" />
                            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest flex-1">{`UYARI: ${state.compiledResult.conflicts_found.length} ADET ÇELİŞKİ TESPİT EDİLDİ VE ÇÖZÜLDÜ.`}</span>
                            <ChevronUp size={14} className="text-amber-600 dark:text-amber-500" />
                        </button>
                    )}
                    {state.compiledResult.noteShort && state.footerTab === 'ai' && (
                        <div onClick={() => dispatch({ type: A.SET_STATE, key: 'showAiNoteModal', value: true })} className="flex items-center justify-between bg-indigo-600/90 backdrop-blur-md text-white px-6 py-3 cursor-pointer hover:bg-indigo-700 transition-all border-b border-indigo-500 mt-4">
                            <div className="flex items-center gap-3"><DynamicIcon name="Info" size={16} /><span className="text-[13px] font-bold uppercase tracking-wide">AI Optimizasyon Notu: <span className="opacity-90 ml-1 font-medium italic">{String(state.compiledResult.noteShort)}</span></span></div>
                            <div className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest opacity-80">Detayları İncele <ChevronUp size={16} /></div>
                        </div>
                    )}
                    <div className={`flex flex-col md:flex-row items-center justify-between px-6 pt-5 border-b dark:border-white/5 bg-slate-50/50 dark:bg-black/20 ${(!state.compiledResult.noteShort || state.footerTab !== 'ai') ? 'mt-4' : ''}`}>
                        <div className="flex gap-4 w-full md:w-auto items-center">
                            <div className="flex items-center gap-6 border-r border-slate-200 dark:border-white/10 pr-6 overflow-x-auto custom-scrollbar">
                                {['raw', 'ai'].filter(tab => tab === 'raw' || state.compiledResult.aiTR || state.compiledResult.aiEN || state.isOptimizing).map(tab => {
                                    const tabName = { raw: state.appMode === 'marketing' ? 'STRATEJİ ÖZETİ' : 'HAM PROMPT', ai: state.appMode === 'marketing' ? 'REKLAM METNİ' : 'AI OPTİMİZE' }[tab];
                                    const val = tab === 'ai' ? (state.appMode === 'marketing' ? state.compiledResult.aiTR : state.compiledResult.aiEN) : (state.appMode === 'marketing' ? state.compiledResult.textRawTR : state.compiledResult.visualRawEN);
                                    const charCount = (val || "").length;
                                    return (
                                        <button key={tab} onClick={() => dispatch({ type: A.SET_FOOTER_TAB, payload: tab })} className={`pb-3 text-xs font-bold tracking-widest border-b-2 transition-all whitespace-nowrap outline-none focus-visible:ring-2 ring-indigo-500 rounded-sm flex items-center gap-2 ${state.footerTab === tab ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                                            {String(tabName)}<span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${state.footerTab === tab ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400'}`}>{charCount}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex items-center gap-2 mb-3 flex-shrink-0 relative">
                                <button role="switch" aria-checked={state.showDetailsList} onClick={() => dispatch({ type: A.SET_STATE, key: 'showDetailsList', value: !state.showDetailsList })} className={`p-1.5 rounded-lg transition-all outline-none focus-visible:ring-2 ring-indigo-500 ${state.showDetailsList ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-200/50' : 'bg-transparent text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5'}`}><List size={16} /></button>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 pb-3">
                            <div className={`flex items-center p-1 rounded-xl border shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] ${state.isDark ? 'bg-neutral-900/80 border-white/10' : 'bg-white/80 border-slate-200'}`}>
                                <button onClick={handleCompile} className={`p-2 rounded-lg transition-all ${state.isDark ? 'hover:bg-white/5 text-indigo-400' : 'hover:bg-slate-200 text-indigo-600'} hover:scale-105 active:scale-95`} title="Seçimleri birleştirip promptu oluştur (Manuel Derleme)"><DynamicIcon name="Play" size={16} className="fill-current" /></button>
                                <div className="w-px h-4 bg-slate-300 dark:bg-white/10 mx-1" />
                                <label title="Seçim yapıldığında veya sıralama değiştiğinde anında derle" className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer outline-none focus-visible:ring-2 ring-indigo-500/50 ${state.autoCompile ? 'text-amber-500 font-bold' : 'text-slate-500'}`}>
                                    <Toggle checked={state.autoCompile} onChange={() => dispatch({ type: A.SET_STATE, key: 'autoCompile', value: !state.autoCompile })} className="scale-[0.85] origin-left" />
                                    <span className="text-[9px] uppercase tracking-wider">AUTO</span>
                                </label>
                            </div>
                            <MasterAiButton onClick={handleGenerateVariations} disabled={!state.hasCompiled || state.isGeneratingVariations} loading={state.isGeneratingVariations} text="✨ VARYASYON ÜRET" className="px-6 py-3 text-[11px] shadow-xl rounded-full bg-gradient-to-r from-pink-600 via-rose-500 to-red-500 hover:shadow-[0_0_25px_rgba(225,29,72,0.6)]" />
                            <MasterAiButton onClick={handleAiOptimize} disabled={!state.hasCompiled || state.isOptimizing} loading={state.isOptimizing} text={state.appMode === 'marketing' ? 'STRATEJİYİ METNE DÖK' : 'AI OPTİMİZE'} className="px-8 py-3 text-[11px] shadow-xl rounded-full" />
                        </div>
                    </div>
                    <div className="p-6 flex items-stretch relative">
                        <div className="w-full">
                            <button onClick={() => handleCopyGlobal(state.footerTab === 'ai' ? (state.appMode === 'marketing' ? state.compiledResult.aiTR : state.compiledResult.aiEN) : (state.appMode === 'marketing' ? state.compiledResult.textRawTR : state.compiledResult.visualRawEN), () => { setCopiedVisual(true); showToast("Panoya kopyalandı!"); setTimeout(() => setCopiedVisual(false), 2000); })} className={`absolute top-4 right-4 p-2 rounded-xl shadow-lg transition-all z-20 ${copiedVisual ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-white/80 dark:bg-neutral-800/80 hover:bg-indigo-500 hover:text-white text-slate-500 dark:text-slate-300 backdrop-blur-sm border border-slate-200 dark:border-white/10 active:scale-95'}`}>
                                {copiedVisual ? <Check size={16} strokeWidth={3} /> : <Copy size={16} />}
                            </button>
                            <div className="w-full h-full min-h-[120px] max-h-[350px] overflow-y-auto custom-scrollbar break-words pt-2">
                                <ArtisticPromptView
                                    footerTab={state.footerTab}
                                    isOptimized={!!state.compiledResult.aiEN || !!state.compiledResult.aiTR}
                                    isDark={state.isDark}
                                    breakdown={state.footerTab === 'raw' && state.showDetailsList ? (state.appMode === 'marketing' ? state.compiledResult.textBreakdown : state.compiledResult.visualBreakdown) : null}
                                    rawArray={state.footerTab === 'ai' ? (state.appMode === 'marketing' && state.compiledResult.aiTR ? [state.compiledResult.aiTR] : [state.compiledResult.aiEN]) : (state.appMode === 'marketing' ? state.compiledResult.textRawArrayTR : state.compiledResult.visualRawArrayEN)}
                                />
                            </div>
                        </div>
                    </div>
                </SectionWrapper>
            </main>

            <AnalyzePromptModal open={state.showAnalyzeModal} onClose={() => dispatch({ type: A.SET_STATE, key: 'showAnalyzeModal', value: false })} isDark={state.isDark} isAnalyzing={state.isAnalyzing} analysisResult={state.analysisResult} />
            <AiNoteModal open={state.showAiNoteModal} onClose={() => dispatch({ type: A.SET_STATE, key: 'showAiNoteModal', value: false })} isDark={state.isDark} compiledResult={state.compiledResult} />
            <ExpandSceneModal open={showExpandModal} onClose={() => setShowExpandModal(false)} isDark={state.isDark} product={state.product} description={state.description} onProductChange={v => dispatch({ type: A.UPDATE_INPUT, field: 'product', value: v })} onDescriptionChange={e => { dispatch({ type: A.UPDATE_INPUT, field: 'description', value: e.target.value }); }} onEnhance={() => handleEnhanceScene()} isEnhancingScene={state.isEnhancingScene} />
            <DebugPayloadModal open={state.showDebugModal} onClose={() => dispatch({ type: A.SET_STATE, key: 'showDebugModal', value: false })} debugPayload={state.debugPayload} />
            <AdminModal open={state.showAdminModal && !!state.tableHeaders} onClose={() => dispatch({ type: A.SET_STATE, key: 'showAdminModal', value: false })} isDark={state.isDark} tableHeaders={state.tableHeaders} onSave={syncToDatabase} />
            <VariationsModal open={state.showVariationsModal} onClose={() => dispatch({ type: A.SET_STATE, key: 'showVariationsModal', value: false })} isDark={state.isDark} variations={state.variations} onCopy={(txt) => handleCopyGlobal(txt, () => showToast("Varyasyon panoya kopyalandı!"))} />
        </div>
    );
};

/**
 * MODAL ALT BİLEŞENLERİ
 */
const AnalyzePromptModal = ({ open, onClose, isDark, isAnalyzing, analysisResult }) => (
    <Modal open={open} onClose={onClose} title="Prompt Analizi" subtitle="Yapay Zeka Gözünden" icon={Activity} isDark={isDark}>
        {isAnalyzing ? <div className="flex flex-col items-center py-20"><Loader2 size={32} className="animate-spin text-indigo-500 mb-4" /><p className="text-sm font-bold uppercase">Analiz Ediliyor...</p></div> : analysisResult ? <div className="space-y-6"><div className="flex items-center gap-4"><div className="text-4xl font-black text-indigo-500">{String(analysisResult.overall_score_1_to_10)}<span className="text-xl text-slate-300">/10</span></div><div className="flex-1"><h4 className="text-sm font-bold mb-1">{String(analysisResult.analysis_title)}</h4><div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-rose-500 to-emerald-500" style={{ width: `${Number(analysisResult.overall_score_1_to_10) * 10}%` }}></div></div></div></div><div className="space-y-3">{analysisResult.tips?.map((tip, idx) => <div key={idx} className="p-4 rounded-2xl border bg-slate-50 dark:bg-white/5"><Lightbulb size={16} className="text-amber-500 mb-1" /><span className="text-xs font-bold block">{String(tip.summary)}</span><p className="text-xs text-slate-500">{String(tip.detail)}</p></div>)}</div></div> : null}
    </Modal>
);

const AiNoteModal = ({ open, onClose, isDark, compiledResult }) => (
    <Modal open={open} onClose={onClose} title="AI Optimizasyon Notu" icon={Sparkles} isDark={isDark}>
        <div className="space-y-6">{compiledResult.conflicts_found?.length > 0 && <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 rounded-2xl text-xs font-bold flex flex-col gap-2"><div className="flex items-center gap-2"><AlertTriangle size={16} /> <span className="uppercase">Çözülen Çelişkiler</span></div><ul className="list-disc ml-6 space-y-1">{compiledResult.conflicts_found.map((c, i) => <li key={i}>{String(c)}</li>)}</ul></div>}<div className="p-5 rounded-2xl border bg-slate-50 dark:bg-white/5"><RenderMarkdown text={compiledResult.noteLong} /></div></div>
    </Modal>
);

const AdminModal = ({ open, onClose, isDark, tableHeaders, onSave }) => {
    const [selectedTable, setSelectedTable] = useState('items');
    const [formData, setFormData] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    if (!open) return null;

    const META_COLS = ['Create_Time', 'Update_Time', 'Item_id', 'Category_id', 'Product_Id'];
    const currentHeaders = (tableHeaders?.[selectedTable] || []).filter(h => !META_COLS.includes(h));

    const generateId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const handleSave = async () => {
        setIsSaving(true);
        const idMap = { items: 'Item_id', categories: 'Category_id', products: 'Product_Id' };
        const autoIdKey = idMap[selectedTable];
        const finalData = autoIdKey
            ? { ...formData, [autoIdKey]: generateId(selectedTable) }
            : { ...formData };

        await onSave('CREATE_RECORD', selectedTable, finalData);
        setTimeout(() => {
            setIsSaving(false);
            setFormData({});
            onClose();
        }, 600);
    };

    return (
        <Modal open={open} onClose={onClose} title="Veritabanı Kayıt Yöneticisi" icon={Settings} maxW="max-w-4xl" isDark={isDark}>
            <div className="space-y-6">
                <div className="flex items-center gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tablo:</label>
                    <select
                        value={selectedTable}
                        onChange={e => { setSelectedTable(e.target.value); setFormData({}); }}
                        className={`p-2 rounded-xl border outline-none text-sm font-semibold transition-all ${isDark ? 'bg-neutral-800 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    >
                        {tableHeaders
                            ? Object.keys(tableHeaders).map(k => <option key={k} value={String(k)}>{String(k).toUpperCase()}</option>)
                            : <option disabled>Yükleniyor...</option>}
                    </select>
                    <span className="text-[9px] text-slate-400 italic">ID otomatik oluşturulur</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentHeaders.map(header => (
                        <div key={header} className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{String(header)}</label>
                            <input
                                value={formData[header] || ''}
                                onChange={e => setFormData({ ...formData, [header]: e.target.value })}
                                placeholder={`${String(header)} girin...`}
                                className={`w-full p-3 rounded-xl border outline-none text-sm transition-all focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-neutral-800/50 border-white/10 text-white' : 'bg-white/50 border-slate-200 text-slate-900'}`}
                            />
                        </div>
                    ))}
                </div>

                <div className="pt-4 flex justify-end border-t border-slate-200 dark:border-white/10">
                    <button
                        onClick={handleSave}
                        disabled={isSaving || Object.keys(formData).length === 0}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        KAYDET
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const VariationsModal = ({ open, onClose, isDark, variations, onCopy }) => {
    if (!open) return null;
    return (
        <Modal open={open} onClose={onClose} title="✨ Yapay Zeka Varyasyonları" icon={Layers} maxW="max-w-4xl" isDark={isDark}>
            <div className="space-y-4">
                {variations?.map((v, idx) => (
                    <div key={idx} className={`p-5 rounded-2xl border flex flex-col gap-3 ${isDark ? 'bg-neutral-800/50 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-widest text-indigo-500">{String(v.style_name)}</span>
                            <button onClick={() => onCopy(v.prompt)} className="text-slate-400 hover:text-indigo-500 transition-colors p-1" title="Kopyala"><Copy size={14} /></button>
                        </div>
                        <p className={`text-sm font-mono leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{String(v.prompt)}</p>
                    </div>
                ))}
            </div>
        </Modal>
    );
};

export default App;