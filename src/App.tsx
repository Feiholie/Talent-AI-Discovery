/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  History,
  Heart,
  User,
  Users,
  Briefcase,
  MapPin,
  ExternalLink,
  Copy,
  RefreshCw,
  Sun,
  Moon,
  LogOut,
  Send,
  Sparkles,
  Database,
  Grid,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Mail,
  Phone,
  MessageCircle,
  ChevronRight,
  Info,
  Trash2,
} from "lucide-react";
import { CandidateResult, SearchHistoryItem, FavoriteCandidate, DashboardStats } from "./types";

export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("talentai_dark_mode");
    return saved === "true";
  });

  // Auth & Session state
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(() => {
    const saved = localStorage.getItem("talentai_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [loginEmail, setLoginEmail] = useState("steffiholiea2b@gmail.com");
  const [loginPassword, setLoginPassword] = useState("password");
  const [loginLoading, setLoginLoading] = useState(false);

  // Active Main Navigation Tab: "dashboard" | "search" | "favorites" | "history"
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Database Data States
  const [stats, setStats] = useState<DashboardStats>({
    totalSearches: 0,
    totalFavorites: 0,
    recentSearchesCount: 0,
    supportedConnectors: ["LinkedIn", "Reddit", "Twitter/X", "GitHub"],
  });
  const [historyList, setHistoryList] = useState<SearchHistoryItem[]>([]);
  const [favoritesList, setFavoritesList] = useState<FavoriteCandidate[]>([]);

  // Search Engine States
  const [searchPrompt, setSearchPrompt] = useState("");
  const [searchKeywords, setSearchKeywords] = useState<string[]>([]);
  const [searchQueries, setSearchQueries] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<CandidateResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  // UI Detail Modal
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateResult | null>(null);

  // Custom Toast State
  const [toasts, setToasts] = useState<{ id: string; message: string; type: "success" | "error" | "info" }[]>([]);

  // Show customized instructions overlay
  const [showConnectorsInfo, setShowConnectorsInfo] = useState(false);

  // Effect: Sync dark mode class
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("talentai_dark_mode", String(darkMode));
  }, [darkMode]);

  // Effect: Fetch dashboard stats, history, and favorites when user logs in
  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const addToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      // Parallel fetch
      const [statsRes, historyRes, favsRes] = await Promise.all([
        fetch(`/api/stats?userId=${user.id}`),
        fetch(`/api/history?userId=${user.id}`),
        fetch(`/api/favorites?userId=${user.id}`),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (historyRes.ok) setHistoryList(await historyRes.json());
      if (favsRes.ok) setFavoritesList(await favsRes.json());
    } catch (err) {
      console.error("Error fetching data:", err);
      addToast("Failed to refresh dashboard indicators.", "error");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        localStorage.setItem("talentai_user", JSON.stringify(data.user));
        addToast(`Welcome back, ${data.user.name}!`, "success");
        setActiveTab("dashboard");
      } else {
        addToast(data.message || "Invalid credentials.", "error");
      }
    } catch (err) {
      addToast("Connection to authentication server failed.", "error");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("talentai_user");
    addToast("Logged out successfully.", "info");
  };

  const handleSearchSubmit = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const activePrompt = customPrompt || searchPrompt;
    if (!activePrompt.trim()) {
      addToast("Please specify what candidates you want to discover.", "error");
      return;
    }

    setSearchLoading(true);
    setSearchError("");
    setSearchResults([]);
    setSearchKeywords([]);
    setSearchQueries([]);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: activePrompt, userId: user?.id }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSearchResults(data.candidates);
        setSearchKeywords(data.keywords || []);
        setSearchQueries(data.searchQueries || []);
        addToast(`Successfully discovered ${data.candidates.length} candidates.`, "success");
        
        // Refresh stats and history in background
        fetchDashboardData();
      } else {
        setSearchError(data.error || "An error occurred during candidate discovery.");
        addToast(data.error || "Candidate search failed.", "error");
      }
    } catch (err) {
      setSearchError("Network request to Search Orchestrator timed out or failed.");
      addToast("Failed to connect to AI Search engine.", "error");
    } finally {
      setSearchLoading(false);
    }
  };

  const toggleFavorite = async (candidate: CandidateResult) => {
    if (!user) return;
    const isFav = favoritesList.some((f) => f.candidateId === candidate.id);

    try {
      if (isFav) {
        const res = await fetch(`/api/favorites/${candidate.id}?userId=${user.id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setFavoritesList((prev) => prev.filter((f) => f.candidateId !== candidate.id));
          addToast("Removed from favorite candidates.", "info");
        }
      } else {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, candidate }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setFavoritesList((prev) => [...prev, data.favorite]);
            addToast("Candidate saved to favorites.", "success");
          }
        }
      }
      fetchDashboardData();
    } catch (err) {
      addToast("Failed to update favorite status.", "error");
    }
  };

  const deleteHistoryItem = async (id: string) => {
    try {
      const res = await fetch(`/api/history/${id}`, { method: "DELETE" });
      if (res.ok) {
        setHistoryList((prev) => prev.filter((h) => h.id !== id));
        addToast("Search history item deleted.", "info");
        fetchDashboardData();
      }
    } catch (err) {
      addToast("Failed to delete history item.", "error");
    }
  };

  const runHistoryQuery = (query: string) => {
    setSearchPrompt(query);
    setActiveTab("search");
    handleSearchSubmit(undefined, query);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addToast(`${label} copied to clipboard!`, "success");
  };

  const getContactDisplay = (candidate: CandidateResult) => {
    const contacts = [];
    if (candidate.email) contacts.push({ type: "Email", value: candidate.email, icon: Mail });
    if (candidate.phone) contacts.push({ type: "WhatsApp", value: candidate.phone, icon: Phone });
    if (candidate.telegram) contacts.push({ type: "Telegram", value: candidate.telegram, icon: MessageCircle });
    return contacts;
  };

  // Pre-fill search inputs for testing
  const suggestions = [
    "HR Bandung",
    "React Developer Jakarta Remote",
    "Product Manager Bandung",
    "Digital Marketing Specialist Indonesia",
  ];

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-200">
      {/* Toast Notification Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={`p-4 rounded-xl shadow-lg border flex items-start gap-3 ${
                toast.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/90 dark:border-emerald-800/50 dark:text-emerald-200"
                  : toast.type === "error"
                  ? "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/90 dark:border-rose-800/50 dark:text-rose-200"
                  : "bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-900/90 dark:border-slate-800/50 dark:text-slate-200"
              }`}
            >
              {toast.type === "success" && <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />}
              {toast.type === "error" && <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />}
              {toast.type === "info" && <Info className="h-5 w-5 shrink-0 text-slate-600 dark:text-slate-400" />}
              <span className="text-sm font-medium">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
              T
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                TalentAI Discovery <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 rounded-md font-semibold">MVP</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Public Candidate Sourcing Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              title="Toggle theme mode"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {user && (
              <div className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-800 pl-3">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">{user.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      {!user ? (
        /* LOGIN SCREEN */
        <main className="flex-1 flex items-center justify-center px-4 py-16 bg-slate-50 dark:bg-slate-950 transition-colors">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 transition-all"
          >
            <div className="text-center mb-8">
              <div className="inline-flex h-14 w-14 rounded-2xl bg-blue-100 dark:bg-blue-950/50 items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                <Sparkles className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-bold text-slate-950 dark:text-white">Recruiter Access</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Access public job-seeking postings with real-time AI sourcing
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Recruiter Email
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-950 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    placeholder="recruiter@talentai.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Security Code / Password
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-950 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-md cursor-pointer disabled:opacity-50"
              >
                {loginLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Sign In to Dashboard
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/30 text-xs text-blue-800 dark:text-blue-300 space-y-1">
              <p className="font-semibold">Demo Quick Access Credentials:</p>
              <p className="font-mono">Email: steffiholiea2b@gmail.com</p>
              <p className="font-mono">Password: password</p>
            </div>
          </motion.div>
        </main>
      ) : (
        /* SAAS PORTAL */
        <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 gap-8">
          {/* NAVIGATION SIDEBAR / RAIL */}
          <aside className="w-full md:w-64 shrink-0 flex flex-col gap-3">
            <nav className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible scrollbar-none">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex-1 md:flex-initial flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "dashboard"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-950"
                }`}
              >
                <Grid className="h-4 w-4 shrink-0" />
                Dashboard Home
              </button>

              <button
                onClick={() => setActiveTab("search")}
                className={`flex-1 md:flex-initial flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "search"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-950"
                }`}
              >
                <Search className="h-4 w-4 shrink-0" />
                AI Candidate Search
              </button>

              <button
                onClick={() => setActiveTab("favorites")}
                className={`flex-1 md:flex-initial flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "favorites"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-950"
                }`}
              >
                <Heart className="h-4 w-4 shrink-0" />
                Saved Favorites ({favoritesList.length})
              </button>

              <button
                onClick={() => setActiveTab("history")}
                className={`flex-1 md:flex-initial flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "history"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-950"
                }`}
              >
                <History className="h-4 w-4 shrink-0" />
                Sourcing History ({historyList.length})
              </button>
            </nav>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <Database className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider">Search Engine Status</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Gemini Grounding</span>
                  <span className="text-emerald-500 font-semibold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Connectors Connected</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">4 public platforms</span>
                </div>
              </div>
              <button
                onClick={() => setShowConnectorsInfo(true)}
                className="w-full text-center py-2 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Supported Public Platforms info
              </button>
            </div>
          </aside>

          {/* TAB CONTENTS VIEW */}
          <main className="flex-1 min-w-0">
            {activeTab === "dashboard" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                {/* STATS ROW */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">AI Sourced Queries</p>
                      <h3 className="text-3xl font-extrabold text-slate-950 dark:text-white mt-1">{stats.totalSearches}</h3>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Search className="h-6 w-6" />
                    </div>
                  </div>

                  <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Saved Candidates</p>
                      <h3 className="text-3xl font-extrabold text-slate-950 dark:text-white mt-1">{stats.totalFavorites}</h3>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-pink-50 dark:bg-pink-950/30 flex items-center justify-center text-pink-600 dark:text-pink-400">
                      <Heart className="h-6 w-6" />
                    </div>
                  </div>

                  <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Active Connectors</p>
                      <h3 className="text-3xl font-extrabold text-slate-950 dark:text-white mt-1">4</h3>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <Database className="h-6 w-6" />
                    </div>
                  </div>
                </div>

                {/* SEARCH INTENT HERO */}
                <div className="p-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white shadow-lg relative overflow-hidden">
                  <div className="relative z-10 max-w-lg">
                    <span className="px-2.5 py-1 bg-white/20 rounded-full text-xs font-semibold uppercase tracking-wider">Instant Discovery Engine</span>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-3">Sourcing from the Public Web with Gemini</h2>
                    <p className="text-sm text-blue-100 mt-2">
                      Enter natural language recruitment prompts like "React Developer Bandung looking for Remote" to discover publicly available CV postings on LinkedIn, Reddit, and Twitter/X instantly.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setSearchPrompt("HR Bandung");
                          setActiveTab("search");
                        }}
                        className="px-4 py-2 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-semibold text-xs transition-all cursor-pointer"
                      >
                        Try "HR Bandung"
                      </button>
                      <button
                        onClick={() => {
                          setSearchPrompt("React Developer Remote Indonesia");
                          setActiveTab("search");
                        }}
                        className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-semibold text-xs transition-all cursor-pointer"
                      >
                        Try "React Dev Jakarta"
                      </button>
                    </div>
                  </div>
                  <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-10 translate-y-10">
                    <Sparkles className="h-72 w-72" />
                  </div>
                </div>

                {/* SIDE BY SIDE PANELS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* FAVORITES PREVIEW PANEL */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Heart className="h-5 w-5 text-pink-500 fill-pink-500" />
                        Favorite Candidates
                      </h3>
                      <button
                        onClick={() => setActiveTab("favorites")}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        View All
                      </button>
                    </div>

                    {favoritesList.length === 0 ? (
                      <div className="p-8 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        <Heart className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                        <p className="text-xs text-slate-500 dark:text-slate-400">No favorite candidates saved yet.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {favoritesList.slice(0, 3).map((fav) => (
                          <div
                            key={fav.id}
                            className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-start justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                          >
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-900 dark:text-white truncate">{fav.candidateData.name}</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{fav.candidateData.jobTitle}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                  <MapPin className="h-3 w-3 text-slate-400" />
                                  {fav.candidateData.location}
                                </span>
                                <span className="text-[10px] text-slate-400">{fav.candidateData.sourceName}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => setSelectedCandidate(fav.candidateData)}
                              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg shrink-0 cursor-pointer"
                            >
                              Details
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* RECENT SEARCHES PANEL */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <History className="h-5 w-5 text-blue-600" />
                        Recent Recruiter Sourcing
                      </h3>
                      <button
                        onClick={() => setActiveTab("history")}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Full Log
                      </button>
                    </div>

                    {historyList.length === 0 ? (
                      <div className="p-8 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        <Search className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                        <p className="text-xs text-slate-500 dark:text-slate-400">Your search queries will appear here.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {historyList.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">"{item.query}"</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(item.searchedAt).toLocaleDateString()}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded font-medium">
                                  {item.candidateCount} found
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => runHistoryQuery(item.query)}
                              className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-lg cursor-pointer"
                              title="Re-run search query"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "search" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                {/* SEARCH HEADER */}
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">AI Sourcing Command Center</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Specify what roles, locations, or keywords you are discovering.</p>
                </div>

                {/* MAIN SEARCH BAR */}
                <form onSubmit={handleSearchSubmit} className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      value={searchPrompt}
                      onChange={(e) => setSearchPrompt(e.target.value)}
                      placeholder='Try typing "HR Specialist Bandung" or "React Developer Jakarta"'
                      className="w-full pl-12 pr-24 py-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-950 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    />
                    <button
                      type="submit"
                      disabled={searchLoading}
                      className="absolute right-2 top-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow disabled:opacity-50"
                    >
                      {searchLoading ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3" />
                          Discover
                        </>
                      )}
                    </button>
                  </div>

                  {/* Sourcing suggestions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Common Searches:</span>
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setSearchPrompt(s);
                          handleSearchSubmit(undefined, s);
                        }}
                        className="px-3 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs transition-colors border border-slate-200/50 dark:border-slate-700/50 cursor-pointer"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </form>

                {/* SEARCH LOADERS */}
                {searchLoading && (
                  <div className="py-16 text-center space-y-4">
                    <div className="inline-flex p-4 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 relative">
                      <RefreshCw className="h-8 w-8 animate-spin" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                      <h4 className="font-bold text-slate-950 dark:text-white">AI Search Grounding Active...</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Gemini is translating your prompt into web operators, querying LinkedIn, Twitter, and Reddit, weeding out duplicates, and parsing candidate contact information.
                      </p>
                    </div>
                  </div>
                )}

                {searchError && (
                  <div className="p-5 bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800/50 dark:text-rose-200 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold">Search Sourcing Failed</h4>
                      <p className="text-xs mt-1">{searchError}</p>
                    </div>
                  </div>
                )}

                {/* SEARCH RESULTS METADATA & LIST */}
                {!searchLoading && searchResults.length > 0 && (
                  <div className="space-y-6">
                    {/* KEYWORDS INSIGHT */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Gemini Extraction Analysis</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] font-semibold text-slate-500 px-1 py-0.5">Prompt Intent keywords:</span>
                        {searchKeywords.map((kw, i) => (
                          <span key={i} className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded font-mono font-semibold">
                            {kw}
                          </span>
                        ))}
                      </div>
                      {searchQueries.length > 0 && (
                        <div className="text-[10px] text-slate-400 font-mono space-y-1">
                          <p className="font-semibold text-slate-500">Query Grounding string sent to search engines:</p>
                          {searchQueries.map((q, idx) => (
                            <p key={idx} className="bg-slate-100 dark:bg-slate-950/80 p-1 rounded overflow-x-auto select-all">
                              {q}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* CANDIDATES LISTING */}
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 dark:text-white text-md">
                        Discovered Candidates ({searchResults.length})
                      </h3>
                      <button
                        onClick={() => handleSearchSubmit()}
                        className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Refresh Search Sourcing
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {searchResults.map((candidate) => {
                        const isFav = favoritesList.some((f) => f.candidateId === candidate.id);
                        const hasContact = candidate.email || candidate.phone || candidate.telegram;

                        return (
                          <div
                            key={candidate.id}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                          >
                            <div>
                              {/* Card Header */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h4 className="font-bold text-slate-950 dark:text-white text-base truncate">{candidate.name}</h4>
                                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate mt-0.5">
                                    {candidate.jobTitle}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => toggleFavorite(candidate)}
                                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                      isFav
                                        ? "bg-pink-50 border-pink-200 text-pink-600 dark:bg-pink-950/30 dark:border-pink-800/50 dark:text-pink-400"
                                        : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 dark:bg-slate-800/30 dark:border-slate-700 hover:border-slate-300"
                                    }`}
                                    title={isFav ? "Remove from Saved Candidates" : "Save Candidate to Favorites"}
                                  >
                                    <Heart className={`h-4 w-4 ${isFav ? "fill-pink-600 dark:fill-pink-400" : ""}`} />
                                  </button>
                                </div>
                              </div>

                              {/* Card Metadata info */}
                              <div className="flex flex-wrap items-center gap-2 mt-3">
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                  <MapPin className="h-3 w-3 text-slate-400" />
                                  {candidate.location}
                                </span>
                                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 rounded font-mono">
                                  {candidate.sourceName}
                                </span>
                              </div>

                              {/* AI summary */}
                              <p className="text-xs text-slate-600 dark:text-slate-300 mt-4 line-clamp-3">
                                {candidate.summary}
                              </p>

                              {/* Contact info panel */}
                              <div className="mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Public Contact</p>
                                {hasContact ? (
                                  <div className="space-y-1.5">
                                    {getContactDisplay(candidate).map((contact, i) => (
                                      <div key={i} className="flex items-center justify-between text-xs font-mono bg-slate-50 dark:bg-slate-950 p-1.5 rounded border border-slate-100 dark:border-slate-800/50">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <contact.icon className="h-3 w-3 text-slate-400 shrink-0" />
                                          <span className="text-slate-500 font-semibold">{contact.type}:</span>
                                          <span className="text-slate-800 dark:text-slate-200 truncate select-all">{contact.value}</span>
                                        </div>
                                        <button
                                          onClick={() => copyToClipboard(contact.value || "", contact.type)}
                                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600"
                                          title="Copy contact"
                                        >
                                          <Copy className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">No public contact available</p>
                                )}
                              </div>
                            </div>

                            {/* Card Footer actions */}
                            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
                              <span className="text-[10px] text-slate-400">
                                Posted: {new Date(candidate.postedAt).toLocaleDateString()}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setSelectedCandidate(candidate)}
                                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-800"
                                >
                                  Candidate Profile
                                </button>
                                <a
                                  href={candidate.sourceUrl}
                                  target="_blank"
                                  referrerPolicy="no-referrer"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
                                >
                                  Original Post
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SEARCH LANDING DEFAULT STATE */}
                {!searchLoading && searchResults.length === 0 && (
                  <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <Search className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-950 dark:text-white text-base">Type your prompt above to source</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                      Our system will query real-world databases of LinkedIn posts, public Reddit threads, and Twitter threads to extract candidates matching your request.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "favorites" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Saved Candidates</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Manage and contact your pinned candidates from public posts.</p>
                </div>

                {favoritesList.length === 0 ? (
                  <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <Heart className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-950 dark:text-white">Your list is empty</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Save candidates that match your target positions to keep track of their contact info.
                    </p>
                    <button
                      onClick={() => setActiveTab("search")}
                      className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Search className="h-3 w-3" /> Sourcing candidates
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {favoritesList.map((fav) => {
                      const candidate = fav.candidateData;
                      const hasContact = candidate.email || candidate.phone || candidate.telegram;

                      return (
                        <div
                          key={fav.id}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                        >
                          <div>
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h4 className="font-bold text-slate-950 dark:text-white text-base truncate">{candidate.name}</h4>
                                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate mt-0.5">
                                  {candidate.jobTitle}
                                </p>
                              </div>
                              <button
                                onClick={() => toggleFavorite(candidate)}
                                className="p-1.5 bg-pink-50 border border-pink-200 text-pink-600 dark:bg-pink-950/30 dark:border-pink-800/50 dark:text-pink-400 rounded-lg cursor-pointer"
                                title="Remove favorite"
                              >
                                <Heart className="h-4 w-4 fill-pink-600 dark:fill-pink-400" />
                              </button>
                            </div>

                            {/* Card Metadata info */}
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                <MapPin className="h-3 w-3 text-slate-400" />
                                {candidate.location}
                              </span>
                              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 rounded font-mono">
                                {candidate.sourceName}
                              </span>
                            </div>

                            {/* summary */}
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-4 line-clamp-3">
                              {candidate.summary}
                            </p>

                            {/* contact panel */}
                            <div className="mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Public Contact</p>
                              {hasContact ? (
                                <div className="space-y-1.5">
                                  {getContactDisplay(candidate).map((contact, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs font-mono bg-slate-50 dark:bg-slate-950 p-1.5 rounded border border-slate-100 dark:border-slate-800/50">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <contact.icon className="h-3 w-3 text-slate-400 shrink-0" />
                                        <span className="text-slate-500 font-semibold">{contact.type}:</span>
                                        <span className="text-slate-800 dark:text-slate-200 truncate select-all">{contact.value}</span>
                                      </div>
                                      <button
                                        onClick={() => copyToClipboard(contact.value || "", contact.type)}
                                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600"
                                        title="Copy contact"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 dark:text-slate-500 italic">No public contact available</p>
                              )}
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
                            <span className="text-[10px] text-slate-400">
                              Saved: {new Date(fav.savedAt).toLocaleDateString()}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSelectedCandidate(candidate)}
                                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-800"
                              >
                                Profile Details
                              </button>
                              <a
                                href={candidate.sourceUrl}
                                target="_blank"
                                referrerPolicy="no-referrer"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
                              >
                                Original Post
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "history" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">AI Search History Log</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Review, re-run, or clear previous candidate discovery queries.</p>
                </div>

                {historyList.length === 0 ? (
                  <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <History className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-950 dark:text-white">No history log found</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Sourcing operations and query keyword translations are tracked automatically.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {historyList.map((item) => (
                        <div
                          key={item.id}
                          className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900 dark:text-white text-sm">"{item.query}"</p>
                              <span className="text-[10px] px-2 py-0.5 bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 font-mono rounded-full">
                                {item.candidateCount} found
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 items-center">
                              <span className="text-[10px] text-slate-400">Gemini extracted keywords:</span>
                              {item.keywords?.map((kw, i) => (
                                <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.2 rounded font-medium">
                                  {kw}
                                </span>
                              ))}
                            </div>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3" />
                              {new Date(item.searchedAt).toLocaleString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                            <button
                              onClick={() => runHistoryQuery(item.query)}
                              className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <RefreshCw className="h-3.5 w-3.5" /> Re-run Discover
                            </button>
                            <button
                              onClick={() => deleteHistoryItem(item.id)}
                              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer transition-colors"
                              title="Delete log"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </main>
        </div>
      )}

      {/* FOOTER */}
      <footer className="mt-auto py-6 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 transition-colors text-center text-xs text-slate-400 font-medium">
        <p>&copy; {new Date().getFullYear()} TalentAI Discovery Platform. Built for compliant public candidates discovery.</p>
        <p className="text-[10px] text-slate-500 mt-1">Powered by Gemini 3.5 Sourcing and Google Search Grounding.</p>
      </footer>

      {/* CANDIDATE DETAIL MODAL */}
      <AnimatePresence>
        {selectedCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCandidate(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh] transition-all space-y-6"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-950 dark:text-white">{selectedCandidate.name}</h3>
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-0.5">{selectedCandidate.jobTitle}</p>
                  
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {selectedCandidate.location}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 rounded font-mono">
                      {selectedCandidate.sourceName}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                >
                  ✕
                </button>
              </div>

              {/* AI Sourced Profile details */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Candidate Summary & Intended Role</h4>
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl">
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {selectedCandidate.summary}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Public Sourced Contact Information</h4>
                  {selectedCandidate.email || selectedCandidate.phone || selectedCandidate.telegram ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedCandidate.email && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <Mail className="h-4 w-4 text-blue-600 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Public Email</p>
                              <p className="text-xs font-mono text-slate-800 dark:text-slate-200 truncate select-all">{selectedCandidate.email}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => copyToClipboard(selectedCandidate.email || "", "Email")}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 shrink-0"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {selectedCandidate.phone && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">WhatsApp / Phone</p>
                              <p className="text-xs font-mono text-slate-800 dark:text-slate-200 truncate select-all">{selectedCandidate.phone}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => copyToClipboard(selectedCandidate.phone || "", "Phone/WhatsApp")}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 shrink-0"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {selectedCandidate.telegram && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <MessageCircle className="h-4 w-4 text-blue-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Telegram Handle</p>
                              <p className="text-xs font-mono text-slate-800 dark:text-slate-200 truncate select-all">{selectedCandidate.telegram}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => copyToClipboard(selectedCandidate.telegram || "", "Telegram")}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 shrink-0"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-center">
                      <p className="text-xs text-slate-500 italic">No public contact information explicitly disclosed in source post.</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                  <div>
                    <p>Sourced Post Date: <span className="font-semibold text-slate-700 dark:text-slate-300">{new Date(selectedCandidate.postedAt).toLocaleDateString()}</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleFavorite(selectedCandidate)}
                      className="px-3 py-2 bg-pink-50 hover:bg-pink-100 text-pink-600 border border-pink-100 dark:bg-pink-950/20 dark:hover:bg-pink-950/40 dark:border-pink-900/50 dark:text-pink-400 rounded-xl font-semibold cursor-pointer transition-colors text-xs flex items-center gap-1"
                    >
                      <Heart className={`h-3.5 w-3.5 ${favoritesList.some(f => f.candidateId === selectedCandidate.id) ? "fill-pink-600 dark:fill-pink-400" : ""}`} />
                      {favoritesList.some(f => f.candidateId === selectedCandidate.id) ? "Saved in Favorites" : "Save Candidate"}
                    </button>
                    <a
                      href={selectedCandidate.sourceUrl}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer shadow"
                    >
                      Verify original post link
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONNECTORS INFO DIALOG */}
      <AnimatePresence>
        {showConnectorsInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConnectorsInfo(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 transition-all space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-950 dark:text-white flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  Sourced Public Platforms
                </h3>
                <button
                  onClick={() => setShowConnectorsInfo(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-3 leading-relaxed">
                <p>
                  TalentAI Discovery platform is designed specifically to aggregate <strong>publicly disclosed job-seeking profiles</strong>, tweets, and forums post online.
                </p>
                <div className="space-y-2 font-medium">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60">
                    <span className="font-bold text-slate-800 dark:text-slate-200">1. LinkedIn (Public Postings):</span>
                    <p className="text-slate-500 mt-0.5">Discovers public micro-posts containing hashtags like #OpenToWork or seeking job opportunities.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60">
                    <span className="font-bold text-slate-800 dark:text-slate-200">2. Reddit (Hiring Subreddits):</span>
                    <p className="text-slate-500 mt-0.5">Queries major hiring spaces such as r/forhire, r/jobbit, and local employment subreddits.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60">
                    <span className="font-bold text-slate-800 dark:text-slate-200">3. Twitter/X (Candidate tags):</span>
                    <p className="text-slate-500 mt-0.5">Sifting through publicly available developer & recruiter announcements containing contact emails.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60">
                    <span className="font-bold text-slate-800 dark:text-slate-200">4. GitHub (Public CVs):</span>
                    <p className="text-slate-500 mt-0.5">Indexes publicly shared resume Gists and portfolio readmes containing email/telegram handles.</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  Note: In compliance with DP & public terms, we ONLY extract contact info explicitly shared by candidates in their public posts. No private database profiling is conducted.
                </p>
              </div>

              <button
                onClick={() => setShowConnectorsInfo(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-semibold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Got it, close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
