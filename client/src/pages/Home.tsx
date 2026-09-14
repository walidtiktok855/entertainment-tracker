import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Archive,
  Camera,
  ArrowDown,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Clapperboard,
  Clock3,
  Command,
  Compass,
  Gamepad2,
  Heart,
  Link2,
  ListChecks,
  Loader2,
  LayoutDashboard,
  ListFilter,
  MoreHorizontal,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Star,
  Timer,
  Tag,
  Trophy,
  Tv,
  X,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";

type MediaType = "Game" | "Series" | "Movie";
type Status = "Playing" | "Watching" | "Want to play" | "Want to watch" | "Completed" | "Paused";
type Page = "dashboard" | "library" | "cemetery" | "calendar" | "insights";
type CemeteryCategory = "Movie" | "Game" | "Software" | "Study" | "Other";

type MediaItem = {
  id: number;
  title: string;
  type: MediaType;
  status: Status;
  genre: string;
  platform: string;
  progress: number;
  detail: string;
  image: string;
  color: string;
  rating: number;
  favorite: boolean;
  lastActive: string;
  hours: number;
  externalId?: string;
  metadataJson?: string;
  scheduledDate?: string | null;
  completedAt?: string | null;
};

type CemeteryItem = { id: number; title: string; category: CemeteryCategory | null; note: string | null; sourceLink: string | null; createdAt?: string; stage?: "inbox" | "library" };

type MetadataResult = { externalId: string; title: string; type: MediaType; genre: string; platform: string; image: string; detail: string; status: Status; metadataJson?: string };
type NewItem = { title: string; type: MediaType; status: Status; genre: string; platform: string; externalId?: string; image?: string; detail?: string; metadataJson?: string };

const initialItems: MediaItem[] = [
  {
    id: 1,
    title: "Hollow Knight: Silksong",
    type: "Game",
    status: "Playing",
    genre: "Adventure",
    platform: "Switch",
    progress: 82,
    detail: "24h played",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=85",
    color: "#c8e8e4",
    rating: 4.8,
    favorite: true,
    lastActive: "Today",
    hours: 24,
  },
  {
    id: 2,
    title: "The Last of Us",
    type: "Series",
    status: "Watching",
    genre: "Drama",
    platform: "Max",
    progress: 68,
    detail: "S2 · E4 of 7",
    image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=85",
    color: "#ead8ef",
    rating: 4.7,
    favorite: true,
    lastActive: "Yesterday",
    hours: 9,
  },
  {
    id: 3,
    title: "Clair Obscur: Expedition 33",
    type: "Game",
    status: "Want to play",
    genre: "RPG",
    platform: "PlayStation",
    progress: 0,
    detail: "Added 2 days ago",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=85",
    color: "#f5dfc5",
    rating: 0,
    favorite: false,
    lastActive: "2 days ago",
    hours: 0,
  },
  {
    id: 4,
    title: "Severance",
    type: "Series",
    status: "Completed",
    genre: "Mystery",
    platform: "Apple TV+",
    progress: 100,
    detail: "2 seasons completed",
    image: "https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&w=900&q=85",
    color: "#dfe8f6",
    rating: 4.9,
    favorite: true,
    lastActive: "May 24",
    hours: 16,
  },
  {
    id: 5,
    title: "Hades II",
    type: "Game",
    status: "Completed",
    genre: "Roguelike",
    platform: "PC",
    progress: 100,
    detail: "38h played",
    image: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=900&q=85",
    color: "#f4c8d7",
    rating: 4.6,
    favorite: false,
    lastActive: "May 18",
    hours: 38,
  },
  {
    id: 6,
    title: "Andor",
    type: "Series",
    status: "Want to watch",
    genre: "Sci-fi",
    platform: "Disney+",
    progress: 0,
    detail: "2 seasons · 24 eps",
    image: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=900&q=85",
    color: "#d1e7ee",
    rating: 0,
    favorite: false,
    lastActive: "May 12",
    hours: 0,
  },
  {
    id: 7,
    title: "The Bear",
    type: "Series",
    status: "Paused",
    genre: "Comedy",
    platform: "Hulu",
    progress: 42,
    detail: "S3 · E2 of 10",
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85",
    color: "#f5ead0",
    rating: 4.2,
    favorite: false,
    lastActive: "Apr 28",
    hours: 7,
  },
  {
    id: 8,
    title: "Balatro",
    type: "Game",
    status: "Want to play",
    genre: "Strategy",
    platform: "Steam Deck",
    progress: 0,
    detail: "Added Apr 19",
    image: "https://images.unsplash.com/photo-1611996575749-79a3a250f948?auto=format&fit=crop&w=900&q=85",
    color: "#e4d8f5",
    rating: 4.5,
    favorite: false,
    lastActive: "Apr 19",
    hours: 0,
  },
];

const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "library", label: "My library", icon: Archive },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "insights", label: "Insights", icon: BarChart3 },
];

const statusOptions: Status[] = ["Playing", "Watching", "Want to play", "Want to watch", "Completed", "Paused"];

function itemColor(item: { type: MediaType; genre?: string | null }) {
  if (item.type === "Game") return item.genre === "RPG" ? "#f5dfc5" : "#d8e9f4";
  if (item.type === "Movie") return "#f5dce7";
  return "#ead8ef";
}

function fromServerItem(item: any): MediaItem {
  return {
    id: item.id,
    title: item.title,
    type: item.type,
    status: item.status,
    genre: item.genre ?? "Uncategorized",
    platform: item.platform ?? "My library",
    progress: item.progress ?? 0,
    detail: item.detail ?? "Just added",
    image: item.image ?? "",
    color: itemColor(item),
    rating: (item.rating ?? 0) / 10,
    favorite: Boolean(item.favorite),
    lastActive: "Synced just now",
    hours: item.hours ?? 0,
    externalId: item.externalId ?? undefined,
    metadataJson: item.metadataJson ?? undefined,
    scheduledDate: item.scheduledDate ? new Date(item.scheduledDate).toISOString().slice(0, 10) : null,
    completedAt: item.completedAt ? new Date(item.completedAt).toISOString() : null,
  };
}

function toSyncItem(item: MediaItem) {
  return {
    externalId: item.externalId,
    title: item.title,
    type: item.type,
    status: item.status,
    genre: item.genre,
    platform: item.platform,
    progress: item.progress,
    rating: Math.round(item.rating * 10),
    favorite: item.favorite,
    hours: item.hours,
    detail: item.detail,
    image: item.image,
    metadataJson: item.metadataJson,
    scheduledDate: item.scheduledDate ? new Date(`${item.scheduledDate}T00:00:00`).getTime() : null,
    completedAt: item.completedAt ? new Date(item.completedAt).getTime() : null,
  };
}

function parseMetadata(value?: string) {
  if (!value) return null;
  try { return JSON.parse(value) as { source?: string; released?: string; releaseDate?: string; firstAirDate?: string; metacritic?: number; voteAverage?: number; overview?: string; originalLanguage?: string; runtime?: number | null; numberOfSeasons?: number; numberOfEpisodes?: number; seasons?: { seasonNumber: number; name: string; episodeCount: number; airDate?: string | null; image?: string }[]; cast?: { name: string; character?: string; image?: string }[]; trailers?: { name: string; key: string; type?: string }[]; screenshots?: string[]; trailer?: string; tags?: string[]; stores?: string[]; platforms?: string[]; developers?: string[]; publishers?: string[] }; } catch { return null; }
}

function formatDate() {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
}

function getNextStatus(item: MediaItem): Status {
  if (item.status === "Completed") return item.type === "Game" ? "Playing" : "Watching";
  if (item.type === "Game" && item.status === "Want to play") return "Playing";
  if (item.type === "Series" && item.status === "Want to watch") return "Watching";
  return "Completed";
}

function Cover({ item, large = false }: { item: MediaItem; large?: boolean }) {
  return (
    <div className={`cover ${large ? "cover-large" : ""}`} style={{ backgroundColor: item.color }}>
      <img src={item.image} alt="" />
      <div className="cover-shade" />
      <div className="cover-type"><span>{item.type === "Game" ? <Gamepad2 size={12} /> : <Tv size={12} />}</span>{item.type}</div>
      <div className="cover-mark">{item.type === "Game" ? "PLAY" : "WATCH"}</div>
    </div>
  );
}

function ProgressBar({ value, color = "#7358e8" }: { value: number; color?: string }) {
  return <div className="progress-track"><span style={{ width: `${value}%`, background: color }} /></div>;
}

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const utils = trpc.useUtils();
  const syncedLibrary = trpc.tracker.list.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const cemeteryQuery = trpc.tracker.cemetery.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const cemeteryDefaultQuery = trpc.tracker.cemeteryDefault.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const monthlyGoalQuery = trpc.tracker.monthlyGoal.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const syncMutation = trpc.tracker.sync.useMutation({ onSuccess: (serverItems) => { setItems(serverItems.map(fromServerItem)); toast.success("Library synced to your account"); } });
  const refreshAllMutation = trpc.tracker.refreshAll.useMutation({ onSuccess: (serverItems) => { setItems(serverItems.map(fromServerItem)); toast.success("Metadata refreshed"); } });
  const updateMutation = trpc.tracker.update.useMutation();
  const scheduleMutation = trpc.tracker.schedule.useMutation();
  const quickAddMutation = trpc.tracker.quickAdd.useMutation({ onSuccess: () => { cemeteryQuery.refetch(); toast.success("Saved to Screenshot Cemetery"); } });
  const promoteMutation = trpc.tracker.promote.useMutation({ onSuccess: async () => { await Promise.all([cemeteryQuery.refetch(), syncedLibrary.refetch()]); toast.success("Added to your library"); } });
  const defaultCategoryMutation = trpc.tracker.setCemeteryDefault.useMutation();
  const setMonthlyGoalMutation = trpc.tracker.setMonthlyGoal.useMutation({ onSuccess: (goal) => { setMonthlyGoal(goal); toast.success("Monthly goal updated"); } });
  const [metadataQuery, setMetadataQuery] = useState({ query: "__disabled__", type: "Game" as MediaType });
  const metadataSearch = trpc.tracker.search.useQuery(metadataQuery, { enabled: false, retry: false });
  const [page, setPage] = useState<Page>(() => window.location.pathname === "/quick-add" ? "cemetery" : "dashboard");
  const [items, setItems] = useState<MediaItem[]>(() => {
    try {
      const saved = localStorage.getItem("luma-entertainment-items");
      return saved ? JSON.parse(saved) as MediaItem[] : initialItems;
    } catch {
      return initialItems;
    }
  });
  const [activeType, setActiveType] = useState<"All" | MediaType>("All");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [promotingItem, setPromotingItem] = useState<CemeteryItem | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(() => window.location.pathname === "/quick-add");
  const [shareLink, setShareLink] = useState(() => { const params = new URLSearchParams(window.location.search); return params.get("url") ?? params.get("text") ?? ""; });
  const [cemeteryCategory, setCemeteryCategory] = useState<CemeteryCategory | null>(null);
  const [cemeteryDefault, setCemeteryDefault] = useState<CemeteryCategory | null>(null);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [newItem, setNewItem] = useState<NewItem>({ title: "", type: "Game", status: "Want to play", genre: "Adventure", platform: "" });
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [monthlyGoal, setMonthlyGoal] = useState(10);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (isAuthenticated && syncedLibrary.data && syncedLibrary.data.length > 0) setItems(syncedLibrary.data.map(fromServerItem));
  }, [isAuthenticated, syncedLibrary.data]);

  useEffect(() => {
    if (cemeteryDefaultQuery.data !== undefined) { setCemeteryDefault((cemeteryDefaultQuery.data as CemeteryCategory | null)); setCemeteryCategory((cemeteryDefaultQuery.data as CemeteryCategory | null)); }
  }, [cemeteryDefaultQuery.data]);

  useEffect(() => { if (typeof monthlyGoalQuery.data === "number") setMonthlyGoal(monthlyGoalQuery.data); }, [monthlyGoalQuery.data]);

  useEffect(() => {
    if (window.location.pathname === "/quick-add") setShowQuickAdd(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("luma-entertainment-items", JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (metadataQuery.query !== "__disabled__") metadataSearch.refetch();
  }, [metadataQuery]);

  const filteredItems = useMemo(() => items.filter((item) => {
    const matchesType = activeType === "All" || item.type === activeType;
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || item.genre.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  }), [items, activeType, search]);

  const stats = useMemo(() => {
    const completed = items.filter((item) => item.status === "Completed").length;
    const active = items.filter((item) => ["Playing", "Watching"].includes(item.status)).length;
    const rated = items.filter((item) => item.rating > 0);
    return { total: items.length, completed, active, completion: Math.round((completed / items.length) * 100), hours: items.reduce((sum, item) => sum + item.hours, 0), rating: rated.length ? (rated.reduce((sum, item) => sum + item.rating, 0) / rated.length).toFixed(1) : "—" };
  }, [items]);
  const completedThisMonth = useMemo(() => { const now = new Date(); return items.filter((item) => item.status === "Completed" && item.completedAt && new Date(item.completedAt).getFullYear() === now.getFullYear() && new Date(item.completedAt).getMonth() === now.getMonth()).length; }, [items]);

  const updateItem = (id: number, patch: Partial<MediaItem>) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
    if (isAuthenticated && id < 1000000000000) {
      const serverPatch: Record<string, unknown> = {};
      ["title", "type", "status", "genre", "platform", "progress", "rating", "favorite", "hours", "detail", "image", "metadataJson", "completedAt"].forEach((key) => {
        if (key in patch) serverPatch[key] = key === "rating" ? Math.round(Number(patch[key as keyof MediaItem]) * 10) : key === "completedAt" && patch[key as keyof MediaItem] ? new Date(String(patch[key as keyof MediaItem])).getTime() : patch[key as keyof MediaItem];
      });
      updateMutation.mutate({ id, patch: serverPatch as any });
    }
  };

  const scheduleItem = (item: MediaItem, value: string) => {
    const scheduledDate = value || null;
    updateItem(item.id, { scheduledDate });
    if (isAuthenticated && item.id < 1000000000000) scheduleMutation.mutate({ id: item.id, scheduledDate: scheduledDate ? new Date(`${scheduledDate}T00:00:00`).getTime() : null });
    toast.success(scheduledDate ? `${item.title} scheduled for ${new Date(`${scheduledDate}T00:00:00`).toLocaleDateString()}` : `${item.title} removed from the calendar`);
  };

  const syncLibrary = async () => {
    if (!isAuthenticated) { startLogin(); return; }
    setSyncing(true);
    try { await syncMutation.mutateAsync({ items: items.map(toSyncItem) }); } finally { setSyncing(false); }
  };

  const refreshAllMetadata = async () => {
    if (!isAuthenticated) { startLogin(); return; }
    setRefreshing(true);
    try { await refreshAllMutation.mutateAsync(); } finally { setRefreshing(false); }
  };

  const advanceItem = (item: MediaItem) => {
    const next = getNextStatus(item);
    updateItem(item.id, { status: next, progress: next === "Completed" ? 100 : Math.max(item.progress, 12), completedAt: next === "Completed" ? new Date().toISOString() : null });
    toast.success(`${item.title} moved to ${next.toLowerCase()}`);
  };

  const toggleFavorite = (item: MediaItem) => {
    updateItem(item.id, { favorite: !item.favorite });
    toast(item.favorite ? "Removed from favorites" : "Added to favorites", { icon: item.favorite ? <Heart size={15} /> : <Heart size={15} fill="currentColor" /> });
  };

  const addItem = () => {
    if (promotingItem) {
      promoteMutation.mutate({ id: promotingItem.id, item: { ...newItem, title: newItem.title.trim() || promotingItem.title || "Untitled", favorite: false } });
      setShowAdd(false);
      setPromotingItem(null);
      return;
    }
    if (!newItem.title.trim()) {
      toast.error("Give your item a title first");
      return;
    }
    const item: MediaItem = {
      id: Date.now(),
      title: newItem.title.trim(),
      type: newItem.type,
      status: newItem.status,
      genre: newItem.genre,
      platform: newItem.platform || (newItem.type === "Game" ? "My library" : "Watchlist"),
      progress: 0,
      detail: newItem.detail || "Just added",
      image: newItem.image || (newItem.type === "Game" ? "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=900&q=85" : "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=85"),
      color: newItem.type === "Game" ? "#d8e9f4" : "#eed8eb",
      rating: 0,
      favorite: false,
      lastActive: "Just now",
      hours: 0,
      externalId: newItem.externalId,
      metadataJson: newItem.metadataJson,
    };
    const nextItems = [item, ...items];
    setItems(nextItems);
    if (isAuthenticated) syncMutation.mutate({ items: nextItems.map(toSyncItem) });
    setShowAdd(false);
    setNewItem({ title: "", type: "Game", status: "Want to play", genre: "Adventure", platform: "" });
    toast.success(`${item.title} added to your library`);
  };

  const monthDate = new Date(new Date().getFullYear(), new Date().getMonth() + monthOffset, 1);
  const monthName = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const calendarCells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstDay + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });

  const pageTitle = page === "dashboard" ? "Overview" : page === "library" ? "My library" : page === "cemetery" ? "Screenshot Cemetery" : page === "calendar" ? "Calendar" : "Insights";

  const cemeteryItems = ((cemeteryQuery.data ?? []) as any[]).map((item) => ({ id: item.id, title: item.title ?? "", category: item.category ?? null, note: item.note ?? null, sourceLink: item.sourceLink ?? null, createdAt: item.createdAt, stage: item.stage } as CemeteryItem));
  const saveQuickAdd = async (payload: { title: string; category: CemeteryCategory | null; note: string; sourceLink: string }) => {
    if (!isAuthenticated) { startLogin(); return; }
    await quickAddMutation.mutateAsync(payload);
    setShowQuickAdd(false);
    setPage("cemetery");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-orbit"><Sparkles size={16} /></div><div><strong>luma</strong><span>entertainment tracker</span></div></div>
        <div className="profile-card"><div className="avatar">{user?.name?.[0] ?? "S"}</div><div className="profile-copy"><strong>{user?.name ?? "Sam's space"}</strong><span>{isAuthenticated ? "Synced account" : "Personal library"}</span></div><MoreHorizontal size={16} className="muted-icon" /></div>
        <div className="sidebar-label">Workspace</div>
        <nav className="nav-list">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${page === id ? "active" : ""}`} onClick={() => setPage(id)}><Icon size={17} /><span>{label}</span>{id === "library" && <em>{items.length}</em>}</button>)}</nav>
        <div className="sidebar-label sidebar-label-spaced">Collections</div>
        <nav className="nav-list"><button className="nav-item" onClick={() => { setPage("library"); setActiveType("Game"); }}><Gamepad2 size={17} /><span>Games</span><em>{items.filter((item) => item.type === "Game").length}</em></button><button className="nav-item" onClick={() => { setPage("library"); setActiveType("Series"); }}><Clapperboard size={17} /><span>Series</span><em>{items.filter((item) => item.type === "Series").length}</em></button><button className={`nav-item ${page === "cemetery" ? "active" : ""}`} onClick={() => setPage("cemetery")}><Camera size={17} /><span>Screenshot Cemetery</span><em>{cemeteryItems.length}</em></button><button className="nav-item" onClick={() => { setPage("library"); setSearch("favorites"); }}><Heart size={17} /><span>Favorites</span></button></nav>
        <div className="sidebar-bottom"><div className="mini-goal"><div className="mini-goal-head"><span>{new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date())} goal</span><strong>{completedThisMonth} / {monthlyGoal}</strong></div><ProgressBar value={Math.min(100, Math.round((completedThisMonth / monthlyGoal) * 100))} color="#e3a6c8" /><span className="mini-goal-caption">{Math.max(0, monthlyGoal - completedThisMonth)} more completion{Math.max(0, monthlyGoal - completedThisMonth) === 1 ? "" : "s"} to go</span></div><button className="nav-item" onClick={() => setShowSettings(true)}><Settings2 size={17} /><span>Settings</span></button><div className="made-with"><span className="made-dot" /> Made for slow media days</div></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div><span className="eyebrow">{formatDate()}</span><h1>{pageTitle}</h1></div><div className="topbar-actions"><button className="icon-button" aria-label="Notifications"><Bell size={18} /><i /></button><div className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your library" /><kbd><Command size={11} /> K</kbd></div>{page !== "cemetery" && <><button className="secondary-button" onClick={() => setShowQuickAdd(true)}><Camera size={16} /> Quick Add</button><button className="primary-button" onClick={() => setShowAdd(true)}><Plus size={17} /> Add item</button></>}</div></header>

        {page === "dashboard" && <Dashboard stats={stats} items={items} setPage={setPage} activeType={activeType} setActiveType={setActiveType} advanceItem={advanceItem} toggleFavorite={toggleFavorite} setSelectedItem={setSelectedItem} />}
        {page === "library" && <Library items={filteredItems} activeType={activeType} setActiveType={setActiveType} search={search} setSearch={setSearch} advanceItem={advanceItem} toggleFavorite={toggleFavorite} setSelectedItem={setSelectedItem} onRefreshMetadata={refreshAllMetadata} refreshing={refreshing} onSchedule={scheduleItem} />}
        {page === "cemetery" && <Cemetery items={cemeteryItems} onQuickAdd={() => setShowQuickAdd(true)} onPromote={(item) => { const type = item.category === "Game" ? "Game" : item.category === "Movie" ? "Movie" : "Game"; setPromotingItem(item); setNewItem({ title: item.title, type, status: type === "Game" ? "Want to play" : "Want to watch", genre: item.category ?? "Adventure", platform: "", externalId: undefined, image: undefined, detail: item.note ?? undefined, metadataJson: undefined }); if (item.title.trim().length > 1 && (item.category === "Game" || item.category === "Movie")) setMetadataQuery({ query: item.title.trim(), type }); setShowAdd(true); }} />}
        {page === "calendar" && <CalendarPage monthName={monthName} monthDate={monthDate} monthOffset={monthOffset} setMonthOffset={setMonthOffset} calendarCells={calendarCells} items={items} setSelectedItem={setSelectedItem} onAddMoment={() => { setPage("library"); setActiveType("All"); }} />}
        {page === "insights" && <Insights stats={stats} items={items} />}
      </main>

      {showAdd && <AddModal value={newItem} setValue={setNewItem} onClose={() => { setShowAdd(false); setPromotingItem(null); }} onAdd={addItem} metadataResults={(metadataSearch.data as MetadataResult[] | undefined) ?? []} metadataLoading={metadataSearch.isFetching} onSearchMetadata={(query, type) => setMetadataQuery({ query, type })} onSelectMetadata={(result: MetadataResult) => { setNewItem({ ...newItem, title: result.title, type: result.type, status: result.status, genre: result.genre, platform: result.platform, externalId: result.externalId, image: result.image, detail: result.detail, metadataJson: result.metadataJson }); }} />}
      {showQuickAdd && <QuickAddModal link={shareLink} defaultCategory={cemeteryCategory} onClose={() => setShowQuickAdd(false)} onSave={saveQuickAdd} onSetDefault={(category) => { setCemeteryCategory(category); setCemeteryDefault(category); if (isAuthenticated) defaultCategoryMutation.mutate({ category }); }} saving={quickAddMutation.isPending} />}
      {showSettings && <SettingsModal goal={monthlyGoal} completed={completedThisMonth} onClose={() => setShowSettings(false)} onSave={(goal: number) => { if (!isAuthenticated) { startLogin(); return; } setMonthlyGoalMutation.mutate({ goal }); }} saving={setMonthlyGoalMutation.isPending} />}
      {selectedItem && <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} onAdvance={() => { advanceItem(selectedItem); setSelectedItem(null); }} onFavorite={() => toggleFavorite(selectedItem)} onSchedule={(value) => scheduleItem(selectedItem, value)} isAuthenticated={isAuthenticated} onPlaytimeLogged={(minutes) => updateItem(selectedItem.id, { hours: selectedItem.hours + Math.round(minutes / 60), detail: `${selectedItem.hours + Math.round(minutes / 60)}h logged` })} />}
      {!isAuthenticated && <button className="account-pill" onClick={startLogin}><span className="account-dot" /> Sign in to sync</button>}
      {isAuthenticated && <><button className="account-pill" onClick={syncLibrary} title="Sync your library"><span className={`account-dot live ${syncing ? "pulse" : ""}`} /> {syncing ? "Syncing…" : "Sync library"}</button><button className="account-logout" onClick={() => logout()}>Sign out</button></>}
    </div>
  );
}

type TrackerStats = { total: number; completed: number; active: number; completion: number; hours: number; rating: string };

function Dashboard({ stats, items, setPage, activeType, setActiveType, advanceItem, toggleFavorite, setSelectedItem }: { stats: TrackerStats; items: MediaItem[]; setPage: (page: Page) => void; activeType: "All" | MediaType; setActiveType: (type: "All" | MediaType) => void; advanceItem: (item: MediaItem) => void; toggleFavorite: (item: MediaItem) => void; setSelectedItem: (item: MediaItem) => void }) {
  const statItems = [{ label: "In your library", value: stats.total, icon: Archive, tint: "lavender" }, { label: "Completed", value: stats.completed, icon: Check, tint: "mint" }, { label: "Hours logged", value: `${stats.hours}h`, icon: Clock3, tint: "peach" }, { label: "Average rating", value: stats.rating, icon: Star, tint: "pink" }];
  const active = items.filter((item) => ["Playing", "Watching"].includes(item.status));
  const next = items.filter((item) => ["Want to play", "Want to watch"].includes(item.status)).slice(0, 3);
  const favorites = items.filter((item) => item.favorite).slice(0, 4);
  return <div className="page-stack">
    <section className="welcome-panel"><div className="welcome-copy"><span className="eyebrow accent-eyebrow"><Sparkles size={13} /> Your personal media rhythm</span><h2>Make room for stories<br /><em>worth your time.</em></h2><p>Keep the games you play and the series you watch in one calm, colorful place.</p><div className="welcome-actions"><button className="dark-button" onClick={() => setPage("library")}>Explore library <ArrowUpRight size={16} /></button><button className="text-button" onClick={() => setPage("calendar")}><CalendarDays size={15} /> Open calendar</button></div></div><div className="welcome-art"><div className="sun-shape" /><div className="art-card art-card-back"><Gamepad2 size={24} /><span>play next</span></div><div className="art-card art-card-front"><div className="art-poster" /><div><strong>slow evenings</strong><small>4 items in your queue</small></div></div><div className="art-spark spark-one">✦</div><div className="art-spark spark-two">✦</div></div></section>
    <section className="stat-grid">{statItems.map(({ label, value, icon: Icon, tint }) => <div className={`stat-card ${tint}`} key={label}><div className="stat-icon"><Icon size={16} /></div><span>{label}</span><strong>{value}</strong><small>{label === "Completed" ? `${stats.completion}% of your library` : label === "Hours logged" ? "this year so far" : label === "Average rating" ? "from your rated titles" : "across games & series"}</small></div>)}</section>
    <section className="section-heading"><div><span className="eyebrow">Keep the momentum</span><h2>Continue where you left off</h2></div><button className="link-button" onClick={() => setPage("library")}>View all <ArrowUpRight size={15} /></button></section>
    <section className="active-grid">{active.map((item) => <article className="active-card" key={item.id} onClick={() => setSelectedItem(item)}><Cover item={item} /><div className="active-card-body"><div className="card-overline"><span>{item.type}</span><button className={`heart-button ${item.favorite ? "liked" : ""}`} onClick={(event) => { event.stopPropagation(); toggleFavorite(item); }}><Heart size={15} fill={item.favorite ? "currentColor" : "none"} /></button></div><h3>{item.title}</h3><p>{item.detail} <span>·</span> {item.platform}</p><div className="progress-line"><ProgressBar value={item.progress} color={item.type === "Game" ? "#7358e8" : "#d986b3"} /><strong>{item.progress}%</strong></div><button className="continue-button" onClick={(event) => { event.stopPropagation(); advanceItem(item); }}>{item.progress === 100 ? "Mark as active" : <><Play size={13} fill="currentColor" /> Continue</>}</button></div></article>)}</section>
    <section className="lower-grid"><div className="section-block"><div className="section-heading compact"><div><span className="eyebrow">Your queue</span><h2>Up next</h2></div><button className="icon-button subtle" onClick={() => setPage("library")}><ArrowUpRight size={16} /></button></div><div className="queue-list">{next.map((item, index) => <button className="queue-row" key={item.id} onClick={() => setSelectedItem(item)}><span className="queue-number">0{index + 1}</span><Cover item={item} /><span className="queue-info"><strong>{item.title}</strong><small>{item.type} · {item.genre}</small></span><ChevronRight size={16} className="muted-icon" /></button>)}</div></div><div className="section-block favorites-block"><div className="section-heading compact"><div><span className="eyebrow">A little love</span><h2>Favorites</h2></div><button className="filter-chip" onClick={() => setActiveType(activeType === "All" ? "Game" : "All")}><ListFilter size={13} /> {activeType === "All" ? "All types" : activeType}</button></div><div className="favorite-grid">{favorites.map((item) => <button className="favorite-tile" key={item.id} onClick={() => setSelectedItem(item)}><Cover item={item} /><div><strong>{item.title}</strong><span><Star size={12} fill="currentColor" /> {item.rating}</span></div></button>)}</div></div></section>
  </div>;
}

function Library({ items, activeType, setActiveType, search, setSearch, advanceItem, toggleFavorite, setSelectedItem, onRefreshMetadata, refreshing, onSchedule }: { items: MediaItem[]; activeType: "All" | MediaType; setActiveType: (type: "All" | MediaType) => void; search: string; setSearch: (value: string) => void; advanceItem: (item: MediaItem) => void; toggleFavorite: (item: MediaItem) => void; setSelectedItem: (item: MediaItem) => void; onRefreshMetadata: () => void; refreshing: boolean; onSchedule: (item: MediaItem, value: string) => void }) {
  const [status, setStatus] = useState<"All" | Status>("All");
  const visible = items.filter((item) => status === "All" || item.status === status);
  return <div className="page-stack"><section className="library-intro"><div><span className="eyebrow accent-eyebrow"><Archive size={13} /> The whole story</span><h2>Your library, <em>your way.</em></h2><p>Browse everything you are playing, watching, saving, and loving.</p></div><div className="library-summary"><button className="small-action refresh-action" onClick={onRefreshMetadata} disabled={refreshing}><RefreshCw size={13} className={refreshing ? "spin" : ""} /> {refreshing ? "Refreshing…" : "Refresh metadata"}</button><strong>{items.length}</strong><span>items shown</span><div className="type-pills"><button className={activeType === "All" ? "selected" : ""} onClick={() => setActiveType("All")}>All</button><button className={activeType === "Game" ? "selected" : ""} onClick={() => setActiveType("Game")}><Gamepad2 size={13} /> Games</button><button className={activeType === "Series" ? "selected" : ""} onClick={() => setActiveType("Series")}><Tv size={13} /> Series</button></div></div></section><div className="library-toolbar"><div className="filter-tabs">{["All", "Playing", "Watching", "Want to play", "Want to watch", "Completed", "Paused"].map((tab) => <button key={tab} className={status === tab ? "selected" : ""} onClick={() => setStatus(tab as "All" | Status)}>{tab}</button>)}</div><div className="toolbar-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title or genre" /></div></div>{visible.length ? <section className="library-grid">{visible.map((item) => <article className="library-card" key={item.id} onClick={() => setSelectedItem(item)}><div className="library-cover-wrap"><Cover item={item} large /><span className={`status-badge ${item.status.toLowerCase().replaceAll(" ", "-")}`}>{item.status}</span><button className={`card-heart ${item.favorite ? "liked" : ""}`} onClick={(event) => { event.stopPropagation(); toggleFavorite(item); }}><Heart size={15} fill={item.favorite ? "currentColor" : "none"} /></button></div><div className="library-card-copy"><div className="card-overline"><span>{item.genre}</span><span>{item.platform}</span></div><h3>{item.title}</h3><p>{item.detail}</p><label className="schedule-field" onClick={(event) => event.stopPropagation()}><CalendarDays size={12} /><span>{item.scheduledDate ? "Scheduled" : "Schedule"}</span><input type="date" value={item.scheduledDate ?? ""} onChange={(event) => onSchedule(item, event.target.value)} /></label>{item.progress > 0 && <div className="progress-line"><ProgressBar value={item.progress} color={item.type === "Game" ? "#7358e8" : "#d986b3"} /><strong>{item.progress}%</strong></div>}<button className="small-action" onClick={(event) => { event.stopPropagation(); advanceItem(item); }}>{item.status === "Completed" ? "Revisit status" : "Update progress"} <ArrowUpRight size={13} /></button></div></article>)}</section> : <div className="empty-state"><Compass size={28} /><h3>No stories found</h3><p>Try a different search or filter.</p></div>}</div>;
}

function CalendarPage({ monthName, monthDate, monthOffset, setMonthOffset, calendarCells, items, setSelectedItem, onAddMoment }: { monthName: string; monthDate: Date; monthOffset: number; setMonthOffset: (value: number) => void; calendarCells: (number | null)[]; items: MediaItem[]; setSelectedItem: (item: MediaItem) => void; onAddMoment: () => void }) {
  const todayKey = new Date().toISOString().slice(0, 10); const events = items.filter((item) => item.scheduledDate).map((item) => { const date = new Date(`${item.scheduledDate}T00:00:00`); const state = item.status === "Completed" ? "completed" : item.scheduledDate! < todayKey ? "overdue" : "planned"; return { day: date.getDate(), date, label: item.title, type: item.type === "Game" ? "game" : "series", state, item }; }).filter((event) => event.date.getFullYear() === monthDate.getFullYear() && event.date.getMonth() === monthDate.getMonth());
  const monthLabel = monthDate.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  return <div className="page-stack"><section className="calendar-intro"><div><span className="eyebrow accent-eyebrow"><CalendarDays size={13} /> A soft plan</span><h2>Make time for <em>good stories.</em></h2><p>See the library items you have scheduled, all in one place.</p></div><div className="calendar-legend"><span><i className="dot dot-purple" /> Planned</span><span><i className="dot dot-pink" /> Completed</span><span><i className="dot dot-yellow" /> Overdue</span></div></section><section className="calendar-layout"><div className="calendar-card"><div className="calendar-head"><button className="icon-button subtle" onClick={() => setMonthOffset(monthOffset - 1)}><ChevronLeft size={17} /></button><div><strong>{monthName}</strong><span>{monthDate.getFullYear()} · your scheduled items</span></div><button className="icon-button subtle" onClick={() => setMonthOffset(monthOffset + 1)}><ChevronRight size={17} /></button></div><div className="weekday-row">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{calendarCells.map((day, index) => { const dayEvents = events.filter((entry) => entry.day === day); return <div className={`calendar-day ${day === new Date().getDate() && monthOffset === 0 ? "today" : ""} ${!day ? "blank" : ""}`} key={`${day}-${index}`}>{day && <><span className="day-number">{day}</span>{dayEvents.map((event) => <button key={event.item.id} className={`calendar-event ${event.type} ${event.state}`} onClick={() => setSelectedItem(event.item)}><i />{event.label}</button>)}</>}</div>; })}</div></div><aside className="calendar-aside"><div className="aside-title"><span className="eyebrow">This month</span><strong>{events.length ? `${events.length} ${events.length === 1 ? "moment" : "moments"} this month` : "Nothing scheduled yet"}</strong></div>{events.map((event) => <button className="event-row" key={event.item.id} onClick={() => setSelectedItem(event.item)}><div className={`event-day ${event.type}`}><strong>{event.day}</strong><span>{monthLabel}</span></div><div><strong>{event.label}</strong><span>{event.state === "overdue" ? "Overdue" : event.state === "completed" ? "Completed" : "Planned"} · {event.item.type}</span></div><ChevronRight size={15} className="muted-icon" /></button>)}<button className="add-calendar-button" onClick={onAddMoment}><CirclePlus size={15} /> Schedule from library</button></aside></section></div>;
}
function Insights({ stats, items }: { stats: TrackerStats; items: MediaItem[] }) {
  const genres = [{ name: "Adventure", value: 86, color: "#7358e8" }, { name: "Drama", value: 71, color: "#d986b3" }, { name: "RPG", value: 58, color: "#7dc8bf" }, { name: "Comedy", value: 43, color: "#e5b566" }];
  const months = [{ name: "Jan", value: 25 }, { name: "Feb", value: 39 }, { name: "Mar", value: 31 }, { name: "Apr", value: 64 }, { name: "May", value: 48 }, { name: "Jun", value: 78 }];
  return <div className="page-stack"><section className="insights-intro"><div><span className="eyebrow accent-eyebrow"><BarChart3 size={13} /> Your year in stories</span><h2>Patterns worth <em>noticing.</em></h2><p>Small snapshots of how you spend your favorite hours.</p></div><div className="streak-badge"><Trophy size={20} /><div><strong>12 day</strong><span>tracking streak</span></div></div></section><section className="insights-grid"><div className="insight-card wide"><div className="insight-head"><div><span className="eyebrow">Monthly activity</span><h3>Your media rhythm</h3></div><span className="period-pill">This year <ChevronRight size={13} /></span></div><div className="bar-chart">{months.map((month) => <div className="bar-column" key={month.name}><div className="bar-value">{month.value}</div><div className="bar"><span style={{ height: `${month.value}%` }} /></div><small>{month.name}</small></div>)}</div><div className="chart-note"><span className="dot dot-purple" /> Items completed <strong>+24% from last year</strong></div></div><div className="insight-card"><div className="insight-head"><div><span className="eyebrow">Completion</span><h3>At a glance</h3></div><div className="ring-chart" style={{ background: `conic-gradient(#7358e8 ${stats.completion * 3.6}deg, #edeaf3 0)` }}><div><strong>{stats.completion}%</strong><span>complete</span></div></div></div><div className="completion-rows"><div><span><i className="dot dot-purple" /> Games</span><strong>{items.filter((item) => item.type === "Game" && item.status === "Completed").length} done</strong></div><div><span><i className="dot dot-pink" /> Series</span><strong>{items.filter((item) => item.type === "Series" && item.status === "Completed").length} done</strong></div></div></div><div className="insight-card"><div className="insight-head"><div><span className="eyebrow">Your taste</span><h3>Favorite genres</h3></div><Tag size={18} className="muted-icon" /></div><div className="genre-list">{genres.map((genre) => <div className="genre-row" key={genre.name}><div><span>{genre.name}</span><strong>{genre.value}%</strong></div><ProgressBar value={genre.value} color={genre.color} /></div>)}</div></div><div className="insight-card wide split-card"><div><span className="eyebrow">Time well spent</span><h3>You logged <em>{stats.hours} hours</em><br />with your stories.</h3><p>Your completed titles are getting more ambitious — nice.</p><button className="small-action">See activity <ArrowUpRight size={13} /></button></div><div className="insight-illustration"><Clock3 size={38} /><span>hours<br />logged</span></div></div></section></div>;
}

function Cemetery({ items, onQuickAdd, onPromote }: { items: CemeteryItem[]; onQuickAdd: () => void; onPromote: (item: CemeteryItem) => void }) {
  const [category, setCategory] = useState<"All" | CemeteryCategory>("All");
  const visible = items.filter((item) => category === "All" || item.category === category);
  const tabs: ("All" | CemeteryCategory)[] = ["All", "Movie", "Game", "Software", "Study", "Other"];
  return <div className="page-stack"><section className="cemetery-intro"><div><span className="eyebrow accent-eyebrow"><Camera size={13} /> A soft place to keep the unknown</span><h2>Screenshot <em>Cemetery.</em></h2><p>Save anything that caught your eye. No title, category, calendar, or commitment required.</p></div><button className="primary-button" onClick={onQuickAdd}><Camera size={16} /> Quick Add</button></section><div className="library-toolbar"><div className="filter-tabs cemetery-tabs">{tabs.map((tab) => <button key={tab} className={category === tab ? "selected" : ""} onClick={() => setCategory(tab)}>{tab}</button>)}</div><span className="cemetery-count">{visible.length} saved</span></div>{visible.length ? <section className="cemetery-grid">{visible.map((item) => <article className="cemetery-card" key={item.id}><div className="cemetery-card-head"><span className="cemetery-pin"><Camera size={15} /></span><span className="cemetery-date">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Just now"}</span></div><h3>{item.title || "Untitled"}</h3>{item.note && <p>{item.note}</p>}{item.sourceLink && <a href={item.sourceLink} target="_blank" rel="noreferrer"><Link2 size={13} /> Open source</a>}<div className="cemetery-card-foot"><span className={`category-tag ${item.category?.toLowerCase() ?? "uncategorized"}`}>{item.category ?? "Uncategorized"}</span><button className="small-action" onClick={() => onPromote(item)}>Add as item <ArrowUpRight size={13} /></button></div></article>)}</section> : <div className="empty-state"><Camera size={28} /><h3>Your cemetery is quiet</h3><p>Use Quick Add to save a link or screenshot moment without deciding what it is yet.</p><button className="dark-button" onClick={onQuickAdd}><Plus size={15} /> Save something</button></div>}</div>;
}

function SettingsModal({ goal, completed, onClose, onSave, saving }: { goal: number; completed: number; onClose: () => void; onSave: (goal: number) => void; saving: boolean }) {
  const [value, setValue] = useState(String(goal));
  const parsed = Math.max(1, Math.min(100, Number(value) || 1));
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal-card settings-card" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow accent-eyebrow"><Settings2 size={13} /> Personal settings</span><h2>Shape your rhythm.</h2></div><button className="icon-button subtle" onClick={onClose}><X size={17} /></button></div><p className="quick-add-copy">Choose how many titles you want to complete each month. Progress counts items marked Completed with a completion date in the current month.</p><label className="quick-field"><span>Monthly completion goal</span><input type="number" min="1" max="100" value={value} onChange={(event) => setValue(event.target.value)} /></label><div className="settings-goal-preview"><strong>{completed} / {parsed}</strong><span>{Math.min(100, Math.round((completed / parsed) * 100))}% of this month’s goal</span></div><div className="quick-add-actions"><button className="text-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={saving} onClick={() => onSave(parsed)}>{saving ? <Loader2 size={15} className="spin" /> : <Check size={15} />} Save goal</button></div></div></div>;
}

function QuickAddModal({ link, defaultCategory, onClose, onSave, onSetDefault, saving }: { link: string; defaultCategory: CemeteryCategory | null; onClose: () => void; onSave: (payload: { title: string; category: CemeteryCategory | null; note: string; sourceLink: string }) => void; onSetDefault: (category: CemeteryCategory | null) => void; saving: boolean }) {
  const [sourceLink, setSourceLink] = useState(link);
  const [note, setNote] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CemeteryCategory | null>(defaultCategory);
  const cats: { value: CemeteryCategory; icon: typeof Gamepad2; tint: string }[] = [{ value: "Movie", icon: Clapperboard, tint: "movie" }, { value: "Game", icon: Gamepad2, tint: "game" }, { value: "Software", icon: Command, tint: "software" }, { value: "Study", icon: BookOpen, tint: "study" }, { value: "Other", icon: Tag, tint: "other" }];
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal-card quick-add-card" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow accent-eyebrow"><Camera size={13} /> Screenshot Cemetery</span><h2>Save without deciding.</h2></div><button className="icon-button subtle" onClick={onClose}><X size={17} /></button></div><p className="quick-add-copy">Keep a link or thought here now. You can identify and promote it later — or leave it here forever.</p><label className="quick-field"><span>Shared link or text</span><input autoFocus value={sourceLink} onChange={(event) => setSourceLink(event.target.value)} placeholder="Paste a TikTok, Reel, or any link" /></label><label className="quick-field"><span>Optional note</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="What caught your eye?" rows={3} /></label><label className="quick-field"><span>Optional title</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Leave blank for Untitled" /></label><div className="quick-category-label"><span>Category, if you know it</span><small>Tap ★ to make a personal default</small></div><div className="quick-category-grid">{cats.map(({ value, icon: Icon, tint }) => <div className={`quick-category ${tint} ${category === value ? "selected" : ""}`} key={value}><button onClick={() => setCategory(category === value ? null : value)}><Icon size={17} /><span>{value}</span></button><button className="default-star" aria-label={`Set ${value} as default`} onClick={() => { const next = defaultCategory === value ? null : value; onSetDefault(next); setCategory(next); }}><Star size={13} fill={defaultCategory === value ? "currentColor" : "none"} /></button></div>)}</div><div className="quick-add-actions"><button className="text-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={saving} onClick={() => onSave({ title, category, note, sourceLink })}>{saving ? <Loader2 size={15} className="spin" /> : <Camera size={15} />} Save to Cemetery</button></div></div></div>;
}

function AddModal({ value, setValue, onClose, onAdd, metadataResults, metadataLoading, onSearchMetadata, onSelectMetadata }: { value: { title: string; type: MediaType; status: Status; genre: string; platform: string }; setValue: (value: { title: string; type: MediaType; status: Status; genre: string; platform: string }) => void; onClose: () => void; onAdd: () => void; metadataResults: MetadataResult[]; metadataLoading: boolean; onSearchMetadata: (query: string, type: MediaType) => void; onSelectMetadata: (result: MetadataResult) => void }) {
  const [lookup, setLookup] = useState(value.title);
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal-card modal-card-wide" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow accent-eyebrow"><CirclePlus size={13} /> New addition</span><h2>Add to your library</h2></div><button className="icon-button subtle" onClick={onClose}><X size={17} /></button></div><div className="metadata-search"><label>Find a title<input autoFocus value={lookup} onChange={(event) => { setLookup(event.target.value); setValue({ ...value, title: event.target.value }); }} onKeyDown={(event) => { if (event.key === "Enter" && lookup.trim().length > 1) onSearchMetadata(lookup.trim(), value.type); }} placeholder="Search a game, series, or movie" /></label><button className="small-search-button" disabled={metadataLoading || lookup.trim().length < 2} onClick={() => onSearchMetadata(lookup.trim(), value.type)}>{metadataLoading ? <Loader2 size={14} className="spin" /> : <Search size={14} />} Find</button></div>{metadataResults.length > 0 && <div className="metadata-results"><span className="eyebrow">Catalog matches</span>{metadataResults.map((result) => <button className="metadata-result" key={result.externalId} onClick={() => { onSelectMetadata(result); setLookup(result.title); }}><div className="metadata-thumb">{result.image ? <img src={result.image} alt="" /> : <Compass size={15} />}</div><span><strong>{result.title}</strong><small>{result.type} · {result.genre} · {result.platform}</small></span><ChevronRight size={14} className="muted-icon" /></button>)}</div>}<div className="form-two"><label>Type<select value={value.type} onChange={(event) => { const nextType = event.target.value as MediaType; setValue({ ...value, type: nextType, status: nextType === "Game" ? "Want to play" : "Want to watch" }); }}>{["Game", "Series", "Movie"].map((type) => <option key={type}>{type}</option>)}</select></label><label>Status<select value={value.status} onChange={(event) => setValue({ ...value, status: event.target.value as Status })}>{statusOptions.map((status) => <option key={status}>{status}</option>)}</select></label></div><div className="form-two"><label>Genre<input value={value.genre} onChange={(event) => setValue({ ...value, genre: event.target.value })} placeholder="Adventure" /></label><label>Platform<input value={value.platform} onChange={(event) => setValue({ ...value, platform: event.target.value })} placeholder={value.type === "Game" ? "PC, Switch..." : "Netflix, Max..."} /></label></div><div className="modal-actions"><button className="text-button" onClick={onClose}>Cancel</button><button className="dark-button" onClick={onAdd}>Add item <ArrowUpRight size={16} /></button></div></div></div>;
}

function DetailModal({ item, onClose, onAdvance, onFavorite, onSchedule, isAuthenticated, onPlaytimeLogged }: { item: MediaItem; onClose: () => void; onAdvance: () => void; onFavorite: () => void; onSchedule: (value: string) => void; isAuthenticated: boolean; onPlaytimeLogged: (minutes: number) => void }) {
  const metadataDetailQuery = trpc.tracker.detail.useQuery({ externalId: item.externalId ?? "" }, { enabled: Boolean(item.externalId?.startsWith("rawg:") || item.externalId?.startsWith("tmdb:")), retry: false });
  const detailMetadata = parseMetadata(metadataDetailQuery.data?.metadataJson);
  const richMetadata = detailMetadata ?? parseMetadata(item.metadataJson);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const seasonEpisodes = trpc.tracker.seasonEpisodes.useQuery({ externalId: item.externalId ?? "tmdb:tv:0", seasonNumber: selectedSeason ?? 1 }, { enabled: item.type === "Series" && Boolean(selectedSeason) && Boolean(item.externalId?.startsWith("tmdb:tv:")), retry: false });
  const episodeQuery = trpc.tracker.episodes.useQuery({ mediaItemId: item.id }, { enabled: isAuthenticated && item.type === "Series" && item.id < 1000000000000, retry: false });
  const episodeMutation = trpc.tracker.toggleEpisode.useMutation();
  const playMutation = trpc.tracker.logPlaytime.useMutation({ onSuccess: () => toast.success("Play session saved to your account") });
  const [watchedEpisodes, setWatchedEpisodes] = useState<string[]>([]);
  const [minutes, setMinutes] = useState("60");
  const [note, setNote] = useState("");
  const refreshMutation = trpc.tracker.refresh.useMutation({ onSuccess: () => toast.success("Item metadata refreshed") });
  useEffect(() => { if (episodeQuery.data) setWatchedEpisodes(episodeQuery.data.filter((episode) => Boolean(episode.watched)).map((episode) => `${episode.seasonNumber}:${episode.episodeNumber}`)); }, [episodeQuery.data]);
  useEffect(() => { if (selectedSeason === null && richMetadata?.seasons?.length) setSelectedSeason(richMetadata.seasons[0].seasonNumber); }, [selectedSeason, richMetadata?.seasons]);
  const episodeRows: Array<{ seasonNumber: number; episodeNumber: number; title: string; airDate: string | null; runtime: number | null; overview: string; image: string }> = seasonEpisodes.data?.length ? seasonEpisodes.data : Array.from({ length: 8 }, (_, index) => ({ seasonNumber: selectedSeason ?? 2, episodeNumber: index + 1, title: `Episode ${index + 1}`, airDate: null, runtime: null, overview: "", image: "" }));
  const toggleEpisode = (seasonNumber: number, episodeNumber: number, title: string) => {
    const key = `${seasonNumber}:${episodeNumber}`;
    const watched = !watchedEpisodes.includes(key);
    setWatchedEpisodes((current) => watched ? [...current, key] : current.filter((value) => value !== key));
    if (isAuthenticated && item.id < 1000000000000) episodeMutation.mutate({ mediaItemId: item.id, seasonNumber, episodeNumber, title, watched });
  };
  const logPlaytime = () => {
    const parsed = Math.max(1, Math.min(1440, Number(minutes) || 0));
    if (!parsed) return;
    onPlaytimeLogged(parsed);
    if (isAuthenticated && item.id < 1000000000000) playMutation.mutate({ mediaItemId: item.id, startedAt: Date.now() - parsed * 60000, endedAt: Date.now(), minutes: parsed, note: note.trim() || undefined });
    else toast.success("Play session added to this device");
    setNote("");
  };
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="detail-modal detail-modal-tall" onMouseDown={(event) => event.stopPropagation()}><div className="detail-hero"><Cover item={item} large /><div className="detail-hero-content"><div className="card-overline"><span>{item.type} · {item.genre}</span><button className={`heart-button ${item.favorite ? "liked" : ""}`} onClick={onFavorite}><Heart size={16} fill={item.favorite ? "currentColor" : "none"} /></button></div><h2>{item.title}</h2><p>{item.platform} <span>·</span> {item.lastActive}</p><div className="detail-rating">{item.rating > 0 ? <><Star size={15} fill="currentColor" /> {item.rating} personal rating</> : "Not rated yet"}</div></div><button className="detail-close" onClick={onClose}><X size={18} /></button></div><div className="detail-body"><div className="detail-stat"><span>Status</span><strong>{item.status}</strong></div><div className="detail-stat"><span>Progress</span><strong>{item.progress}%</strong></div><div className="detail-stat"><span>Time logged</span><strong>{item.hours} hours</strong></div><div className="detail-progress"><div className="progress-line"><ProgressBar value={item.progress} color={item.type === "Game" ? "#7358e8" : "#d986b3"} /><strong>{item.progress}%</strong></div><small>{item.detail}</small></div></div><label className="detail-schedule"><span><CalendarDays size={13} /> Scheduled date</span><input type="date" value={item.scheduledDate ?? ""} onChange={(event) => onSchedule(event.target.value)} /><small>{item.status === "Completed" ? "Completed item" : item.scheduledDate ? "Update or clear this date" : "Not scheduled yet"}</small></label>{richMetadata && <section className="metadata-detail"><div className="metadata-detail-head"><span className="eyebrow"><Sparkles size={13} /> Enriched metadata</span>{richMetadata.source && <small>via {richMetadata.source}</small>}</div><div className="metadata-detail-grid">{richMetadata.released && <span><strong>Released</strong><small>{richMetadata.released}</small></span>}{richMetadata.runtime ? <span><strong>Runtime</strong><small>{richMetadata.runtime} min</small></span> : null}{richMetadata.metacritic && <span><strong>Metacritic</strong><small>{richMetadata.metacritic}/100</small></span>}{richMetadata.platforms?.length ? <span><strong>Platforms</strong><small>{richMetadata.platforms.join(", ")}</small></span> : null}{richMetadata.stores?.length ? <span><strong>Stores</strong><small>{richMetadata.stores.join(", ")}</small></span> : null}</div>{richMetadata.tags?.length ? <div className="metadata-tags">{richMetadata.tags.slice(0, 6).map((tag) => <span key={tag}>{tag}</span>)}</div> : null}</section>}{richMetadata && <section className="metadata-extras">{richMetadata.overview && <p className="metadata-overview">{richMetadata.overview}</p>}{richMetadata.cast?.length ? <div className="cast-row"><span className="eyebrow">Cast</span><div>{richMetadata.cast.slice(0, 6).map((person) => <span className="cast-chip" key={`${person.name}-${person.character}`}><strong>{person.name}</strong><small>{person.character}</small></span>)}</div></div> : null}{richMetadata.screenshots?.length ? <div className="screenshot-strip"><span className="eyebrow">Screenshots</span><div>{richMetadata.screenshots.slice(0, 6).map((source) => <img key={source} src={source} alt="" />)}</div></div> : null}{richMetadata.trailers?.length ? <div className="trailer-links"><span className="eyebrow">Trailers</span><div>{richMetadata.trailers.slice(0, 3).map((trailer) => <a key={trailer.key} href={`https://www.youtube.com/watch?v=${trailer.key}`} target="_blank" rel="noreferrer"><Play size={12} /> {trailer.name}</a>)}</div></div> : null}</section>}{item.type === "Series" ? <section className="episode-panel"><div className="season-nav">{richMetadata?.seasons?.length ? <><span className="eyebrow"><ListChecks size={13} /> Season</span><select value={selectedSeason ?? richMetadata.seasons[0].seasonNumber} onChange={(event) => setSelectedSeason(Number(event.target.value))}>{richMetadata.seasons.map((season) => <option key={season.seasonNumber} value={season.seasonNumber}>{season.name || `Season ${season.seasonNumber}`} · {season.episodeCount} eps</option>)}</select></> : null}</div><div className="episode-panel-head"><div><span className="eyebrow"><ListChecks size={13} /> Episode tracker</span><strong>{episodeRows.length ? `Season ${episodeRows[0].seasonNumber}` : "Episodes"}</strong></div><span>{watchedEpisodes.length} / {episodeRows.length} watched</span></div><div className="episode-list">{episodeRows.map((episode) => { const key = `${episode.seasonNumber}:${episode.episodeNumber}`; return <button className={`episode-row ${watchedEpisodes.includes(key) ? "watched" : ""}`} key={key} onClick={() => toggleEpisode(episode.seasonNumber, episode.episodeNumber, episode.title)}><span className="episode-check">{watchedEpisodes.includes(key) && <Check size={12} />}</span><span><strong>{episode.title}</strong><small>S{episode.seasonNumber} · E{episode.episodeNumber}{episode.airDate ? ` · ${episode.airDate}` : ""}</small></span><ChevronRight size={14} className="muted-icon" /></button>; })}</div></section> : <section className="playtime-panel"><div><span className="eyebrow"><Timer size={13} /> Playtime log</span><strong>Capture a session</strong></div><div className="playtime-form"><label>Minutes<input type="number" min="1" max="1440" value={minutes} onChange={(event) => setMinutes(event.target.value)} /></label><label>Note<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note" /></label><button className="small-search-button" onClick={logPlaytime} disabled={playMutation.isPending}>{playMutation.isPending ? <Loader2 size={14} className="spin" /> : <Clock3 size={14} />} Log session</button></div></section>}<div className="detail-actions"><button className="text-button" onClick={onClose}>Close</button>{item.id < 1000000000000 && item.externalId && <button className="small-action" onClick={() => refreshMutation.mutate({ id: item.id })} disabled={refreshMutation.isPending}><RefreshCw size={13} className={refreshMutation.isPending ? "spin" : ""} /> Refresh</button>}<button className="dark-button" onClick={onAdvance}>{item.status === "Completed" ? "Move back to active" : "Update status"} <Check size={15} /></button></div></div></div>;
}
