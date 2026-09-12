import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Archive,
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
type Page = "dashboard" | "library" | "calendar" | "insights";

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
};

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
  const syncMutation = trpc.tracker.sync.useMutation({ onSuccess: (serverItems) => { setItems(serverItems.map(fromServerItem)); toast.success("Library synced to your account"); } });
  const refreshAllMutation = trpc.tracker.refreshAll.useMutation({ onSuccess: (serverItems) => { setItems(serverItems.map(fromServerItem)); toast.success("Metadata refreshed"); } });
  const updateMutation = trpc.tracker.update.useMutation();
  const [metadataQuery, setMetadataQuery] = useState({ query: "__disabled__", type: "Game" as MediaType });
  const metadataSearch = trpc.tracker.search.useQuery(metadataQuery, { enabled: false, retry: false });
  const [page, setPage] = useState<Page>("dashboard");
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
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [newItem, setNewItem] = useState<NewItem>({ title: "", type: "Game", status: "Want to play", genre: "Adventure", platform: "" });
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isAuthenticated && syncedLibrary.data && syncedLibrary.data.length > 0) setItems(syncedLibrary.data.map(fromServerItem));
  }, [isAuthenticated, syncedLibrary.data]);

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

  const updateItem = (id: number, patch: Partial<MediaItem>) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
    if (isAuthenticated && id < 1000000000000) {
      const serverPatch: Record<string, unknown> = {};
      ["title", "type", "status", "genre", "platform", "progress", "rating", "favorite", "hours", "detail", "image", "metadataJson"].forEach((key) => {
        if (key in patch) serverPatch[key] = key === "rating" ? Math.round(Number(patch[key as keyof MediaItem]) * 10) : patch[key as keyof MediaItem];
      });
      updateMutation.mutate({ id, patch: serverPatch as any });
    }
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
    updateItem(item.id, { status: next, progress: next === "Completed" ? 100 : Math.max(item.progress, 12) });
    toast.success(`${item.title} moved to ${next.toLowerCase()}`);
  };

  const toggleFavorite = (item: MediaItem) => {
    updateItem(item.id, { favorite: !item.favorite });
    toast(item.favorite ? "Removed from favorites" : "Added to favorites", { icon: item.favorite ? <Heart size={15} /> : <Heart size={15} fill="currentColor" /> });
  };

  const addItem = () => {
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

  const monthDate = new Date(2025, 5 + monthOffset, 1);
  const monthName = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const calendarCells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstDay + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });

  const pageTitle = page === "dashboard" ? "Overview" : page === "library" ? "My library" : page === "calendar" ? "Calendar" : "Insights";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-orbit"><Sparkles size={16} /></div><div><strong>luma</strong><span>entertainment tracker</span></div></div>
        <div className="profile-card"><div className="avatar">{user?.name?.[0] ?? "S"}</div><div className="profile-copy"><strong>{user?.name ?? "Sam's space"}</strong><span>{isAuthenticated ? "Synced account" : "Personal library"}</span></div><MoreHorizontal size={16} className="muted-icon" /></div>
        <div className="sidebar-label">Workspace</div>
        <nav className="nav-list">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${page === id ? "active" : ""}`} onClick={() => setPage(id)}><Icon size={17} /><span>{label}</span>{id === "library" && <em>{items.length}</em>}</button>)}</nav>
        <div className="sidebar-label sidebar-label-spaced">Collections</div>
        <nav className="nav-list"><button className="nav-item" onClick={() => { setPage("library"); setActiveType("Game"); }}><Gamepad2 size={17} /><span>Games</span><em>{items.filter((item) => item.type === "Game").length}</em></button><button className="nav-item" onClick={() => { setPage("library"); setActiveType("Series"); }}><Clapperboard size={17} /><span>Series</span><em>{items.filter((item) => item.type === "Series").length}</em></button><button className="nav-item" onClick={() => { setPage("library"); setSearch("favorites"); }}><Heart size={17} /><span>Favorites</span></button></nav>
        <div className="sidebar-bottom"><div className="mini-goal"><div className="mini-goal-head"><span>June goal</span><strong>7 / 10</strong></div><ProgressBar value={70} color="#e3a6c8" /><span className="mini-goal-caption">3 more completions to go</span></div><button className="nav-item"><Settings2 size={17} /><span>Settings</span></button><div className="made-with"><span className="made-dot" /> Made for slow media days</div></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div><span className="eyebrow">{formatDate()}</span><h1>{pageTitle}</h1></div><div className="topbar-actions"><button className="icon-button" aria-label="Notifications"><Bell size={18} /><i /></button><div className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your library" /><kbd><Command size={11} /> K</kbd></div><button className="primary-button" onClick={() => setShowAdd(true)}><Plus size={17} /> Add item</button></div></header>

        {page === "dashboard" && <Dashboard stats={stats} items={items} setPage={setPage} activeType={activeType} setActiveType={setActiveType} advanceItem={advanceItem} toggleFavorite={toggleFavorite} setSelectedItem={setSelectedItem} />}
        {page === "library" && <Library items={filteredItems} activeType={activeType} setActiveType={setActiveType} search={search} setSearch={setSearch} advanceItem={advanceItem} toggleFavorite={toggleFavorite} setSelectedItem={setSelectedItem} onRefreshMetadata={refreshAllMetadata} refreshing={refreshing} />}
        {page === "calendar" && <CalendarPage monthName={monthName} monthOffset={monthOffset} setMonthOffset={setMonthOffset} calendarCells={calendarCells} items={items} setSelectedItem={setSelectedItem} />}
        {page === "insights" && <Insights stats={stats} items={items} />}
      </main>

      {showAdd && <AddModal value={newItem} setValue={setNewItem} onClose={() => setShowAdd(false)} onAdd={addItem} metadataResults={(metadataSearch.data as MetadataResult[] | undefined) ?? []} metadataLoading={metadataSearch.isFetching} onSearchMetadata={(query, type) => setMetadataQuery({ query, type })} onSelectMetadata={(result: MetadataResult) => { setNewItem({ ...newItem, title: result.title, type: result.type, status: result.status, genre: result.genre, platform: result.platform, externalId: result.externalId, image: result.image, detail: result.detail, metadataJson: result.metadataJson }); }} />}
      {selectedItem && <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} onAdvance={() => { advanceItem(selectedItem); setSelectedItem(null); }} onFavorite={() => toggleFavorite(selectedItem)} isAuthenticated={isAuthenticated} onPlaytimeLogged={(minutes) => updateItem(selectedItem.id, { hours: selectedItem.hours + Math.round(minutes / 60), detail: `${selectedItem.hours + Math.round(minutes / 60)}h logged` })} />}
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

function Library({ items, activeType, setActiveType, search, setSearch, advanceItem, toggleFavorite, setSelectedItem, onRefreshMetadata, refreshing }: { items: MediaItem[]; activeType: "All" | MediaType; setActiveType: (type: "All" | MediaType) => void; search: string; setSearch: (value: string) => void; advanceItem: (item: MediaItem) => void; toggleFavorite: (item: MediaItem) => void; setSelectedItem: (item: MediaItem) => void; onRefreshMetadata: () => void; refreshing: boolean }) {
  const [status, setStatus] = useState<"All" | Status>("All");
  const visible = items.filter((item) => status === "All" || item.status === status);
  return <div className="page-stack"><section className="library-intro"><div><span className="eyebrow accent-eyebrow"><Archive size={13} /> The whole story</span><h2>Your library, <em>your way.</em></h2><p>Browse everything you are playing, watching, saving, and loving.</p></div><div className="library-summary"><button className="small-action refresh-action" onClick={onRefreshMetadata} disabled={refreshing}><RefreshCw size={13} className={refreshing ? "spin" : ""} /> {refreshing ? "Refreshing…" : "Refresh metadata"}</button><strong>{items.length}</strong><span>items shown</span><div className="type-pills"><button className={activeType === "All" ? "selected" : ""} onClick={() => setActiveType("All")}>All</button><button className={activeType === "Game" ? "selected" : ""} onClick={() => setActiveType("Game")}><Gamepad2 size={13} /> Games</button><button className={activeType === "Series" ? "selected" : ""} onClick={() => setActiveType("Series")}><Tv size={13} /> Series</button></div></div></section><div className="library-toolbar"><div className="filter-tabs">{["All", "Playing", "Watching", "Want to play", "Want to watch", "Completed", "Paused"].map((tab) => <button key={tab} className={status === tab ? "selected" : ""} onClick={() => setStatus(tab as "All" | Status)}>{tab}</button>)}</div><div className="toolbar-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title or genre" /></div></div>{visible.length ? <section className="library-grid">{visible.map((item) => <article className="library-card" key={item.id} onClick={() => setSelectedItem(item)}><div className="library-cover-wrap"><Cover item={item} large /><span className={`status-badge ${item.status.toLowerCase().replaceAll(" ", "-")}`}>{item.status}</span><button className={`card-heart ${item.favorite ? "liked" : ""}`} onClick={(event) => { event.stopPropagation(); toggleFavorite(item); }}><Heart size={15} fill={item.favorite ? "currentColor" : "none"} /></button></div><div className="library-card-copy"><div className="card-overline"><span>{item.genre}</span><span>{item.platform}</span></div><h3>{item.title}</h3><p>{item.detail}</p>{item.progress > 0 && <div className="progress-line"><ProgressBar value={item.progress} color={item.type === "Game" ? "#7358e8" : "#d986b3"} /><strong>{item.progress}%</strong></div>}<button className="small-action" onClick={(event) => { event.stopPropagation(); advanceItem(item); }}>{item.status === "Completed" ? "Revisit status" : "Update progress"} <ArrowUpRight size={13} /></button></div></article>)}</section> : <div className="empty-state"><Compass size={28} /><h3>No stories found</h3><p>Try a different search or filter.</p></div>}</div>;
}

function CalendarPage({ monthName, monthOffset, setMonthOffset, calendarCells, items, setSelectedItem }: { monthName: string; monthOffset: number; setMonthOffset: (value: number) => void; calendarCells: (number | null)[]; items: MediaItem[]; setSelectedItem: (item: MediaItem) => void }) {
  const events = [{ day: 3, label: "The Last of Us", type: "series", item: items[1] }, { day: 7, label: "Silksong session", type: "game", item: items[0] }, { day: 12, label: "Andor", type: "series", item: items[5] }, { day: 18, label: "Hades II", type: "game", item: items[4] }, { day: 24, label: "The Bear", type: "series", item: items[6] }];
  return <div className="page-stack"><section className="calendar-intro"><div><span className="eyebrow accent-eyebrow"><CalendarDays size={13} /> A soft plan</span><h2>Make time for <em>good stories.</em></h2><p>See what you started, finished, and saved across the month.</p></div><div className="calendar-legend"><span><i className="dot dot-purple" /> Playing</span><span><i className="dot dot-pink" /> Watching</span><span><i className="dot dot-yellow" /> Planned</span></div></section><section className="calendar-layout"><div className="calendar-card"><div className="calendar-head"><button className="icon-button subtle" onClick={() => setMonthOffset(monthOffset - 1)}><ChevronLeft size={17} /></button><div><strong>{monthName}</strong><span>2025 · your media timeline</span></div><button className="icon-button subtle" onClick={() => setMonthOffset(monthOffset + 1)}><ChevronRight size={17} /></button></div><div className="weekday-row">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{calendarCells.map((day, index) => { const event = events.find((entry) => entry.day === day); return <div className={`calendar-day ${day === new Date().getDate() && monthOffset === 0 ? "today" : ""} ${!day ? "blank" : ""}`} key={`${day}-${index}`}>{day && <><span className="day-number">{day}</span>{event && <button className={`calendar-event ${event.type}`} onClick={() => setSelectedItem(event.item)}><i />{event.label}</button>}</>}</div>; })}</div></div><aside className="calendar-aside"><div className="aside-title"><span className="eyebrow">This month</span><strong>5 moments to remember</strong></div>{events.map((event) => <button className="event-row" key={event.day} onClick={() => setSelectedItem(event.item)}><div className={`event-day ${event.type}`}><strong>{event.day}</strong><span>JUN</span></div><div><strong>{event.label}</strong><span>{event.item.type} · {event.item.platform}</span></div><ChevronRight size={15} className="muted-icon" /></button>)}<button className="add-calendar-button"><CirclePlus size={15} /> Add a moment</button></aside></section></div>;
}

function Insights({ stats, items }: { stats: TrackerStats; items: MediaItem[] }) {
  const genres = [{ name: "Adventure", value: 86, color: "#7358e8" }, { name: "Drama", value: 71, color: "#d986b3" }, { name: "RPG", value: 58, color: "#7dc8bf" }, { name: "Comedy", value: 43, color: "#e5b566" }];
  const months = [{ name: "Jan", value: 25 }, { name: "Feb", value: 39 }, { name: "Mar", value: 31 }, { name: "Apr", value: 64 }, { name: "May", value: 48 }, { name: "Jun", value: 78 }];
  return <div className="page-stack"><section className="insights-intro"><div><span className="eyebrow accent-eyebrow"><BarChart3 size={13} /> Your year in stories</span><h2>Patterns worth <em>noticing.</em></h2><p>Small snapshots of how you spend your favorite hours.</p></div><div className="streak-badge"><Trophy size={20} /><div><strong>12 day</strong><span>tracking streak</span></div></div></section><section className="insights-grid"><div className="insight-card wide"><div className="insight-head"><div><span className="eyebrow">Monthly activity</span><h3>Your media rhythm</h3></div><span className="period-pill">This year <ChevronRight size={13} /></span></div><div className="bar-chart">{months.map((month) => <div className="bar-column" key={month.name}><div className="bar-value">{month.value}</div><div className="bar"><span style={{ height: `${month.value}%` }} /></div><small>{month.name}</small></div>)}</div><div className="chart-note"><span className="dot dot-purple" /> Items completed <strong>+24% from last year</strong></div></div><div className="insight-card"><div className="insight-head"><div><span className="eyebrow">Completion</span><h3>At a glance</h3></div><div className="ring-chart" style={{ background: `conic-gradient(#7358e8 ${stats.completion * 3.6}deg, #edeaf3 0)` }}><div><strong>{stats.completion}%</strong><span>complete</span></div></div></div><div className="completion-rows"><div><span><i className="dot dot-purple" /> Games</span><strong>{items.filter((item) => item.type === "Game" && item.status === "Completed").length} done</strong></div><div><span><i className="dot dot-pink" /> Series</span><strong>{items.filter((item) => item.type === "Series" && item.status === "Completed").length} done</strong></div></div></div><div className="insight-card"><div className="insight-head"><div><span className="eyebrow">Your taste</span><h3>Favorite genres</h3></div><Tag size={18} className="muted-icon" /></div><div className="genre-list">{genres.map((genre) => <div className="genre-row" key={genre.name}><div><span>{genre.name}</span><strong>{genre.value}%</strong></div><ProgressBar value={genre.value} color={genre.color} /></div>)}</div></div><div className="insight-card wide split-card"><div><span className="eyebrow">Time well spent</span><h3>You logged <em>{stats.hours} hours</em><br />with your stories.</h3><p>Your completed titles are getting more ambitious — nice.</p><button className="small-action">See activity <ArrowUpRight size={13} /></button></div><div className="insight-illustration"><Clock3 size={38} /><span>hours<br />logged</span></div></div></section></div>;
}

function AddModal({ value, setValue, onClose, onAdd, metadataResults, metadataLoading, onSearchMetadata, onSelectMetadata }: { value: { title: string; type: MediaType; status: Status; genre: string; platform: string }; setValue: (value: { title: string; type: MediaType; status: Status; genre: string; platform: string }) => void; onClose: () => void; onAdd: () => void; metadataResults: MetadataResult[]; metadataLoading: boolean; onSearchMetadata: (query: string, type: MediaType) => void; onSelectMetadata: (result: MetadataResult) => void }) {
  const [lookup, setLookup] = useState(value.title);
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal-card modal-card-wide" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow accent-eyebrow"><CirclePlus size={13} /> New addition</span><h2>Add to your library</h2></div><button className="icon-button subtle" onClick={onClose}><X size={17} /></button></div><div className="metadata-search"><label>Find a title<input autoFocus value={lookup} onChange={(event) => { setLookup(event.target.value); setValue({ ...value, title: event.target.value }); }} onKeyDown={(event) => { if (event.key === "Enter" && lookup.trim().length > 1) onSearchMetadata(lookup.trim(), value.type); }} placeholder="Search a game, series, or movie" /></label><button className="small-search-button" disabled={metadataLoading || lookup.trim().length < 2} onClick={() => onSearchMetadata(lookup.trim(), value.type)}>{metadataLoading ? <Loader2 size={14} className="spin" /> : <Search size={14} />} Find</button></div>{metadataResults.length > 0 && <div className="metadata-results"><span className="eyebrow">Catalog matches</span>{metadataResults.map((result) => <button className="metadata-result" key={result.externalId} onClick={() => { onSelectMetadata(result); setLookup(result.title); }}><div className="metadata-thumb">{result.image ? <img src={result.image} alt="" /> : <Compass size={15} />}</div><span><strong>{result.title}</strong><small>{result.type} · {result.genre} · {result.platform}</small></span><ChevronRight size={14} className="muted-icon" /></button>)}</div>}<div className="form-two"><label>Type<select value={value.type} onChange={(event) => { const nextType = event.target.value as MediaType; setValue({ ...value, type: nextType, status: nextType === "Game" ? "Want to play" : "Want to watch" }); }}>{["Game", "Series", "Movie"].map((type) => <option key={type}>{type}</option>)}</select></label><label>Status<select value={value.status} onChange={(event) => setValue({ ...value, status: event.target.value as Status })}>{statusOptions.map((status) => <option key={status}>{status}</option>)}</select></label></div><div className="form-two"><label>Genre<input value={value.genre} onChange={(event) => setValue({ ...value, genre: event.target.value })} placeholder="Adventure" /></label><label>Platform<input value={value.platform} onChange={(event) => setValue({ ...value, platform: event.target.value })} placeholder={value.type === "Game" ? "PC, Switch..." : "Netflix, Max..."} /></label></div><div className="modal-actions"><button className="text-button" onClick={onClose}>Cancel</button><button className="dark-button" onClick={onAdd}>Add item <ArrowUpRight size={16} /></button></div></div></div>;
}

function DetailModal({ item, onClose, onAdvance, onFavorite, isAuthenticated, onPlaytimeLogged }: { item: MediaItem; onClose: () => void; onAdvance: () => void; onFavorite: () => void; isAuthenticated: boolean; onPlaytimeLogged: (minutes: number) => void }) {
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
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="detail-modal detail-modal-tall" onMouseDown={(event) => event.stopPropagation()}><div className="detail-hero"><Cover item={item} large /><div className="detail-hero-content"><div className="card-overline"><span>{item.type} · {item.genre}</span><button className={`heart-button ${item.favorite ? "liked" : ""}`} onClick={onFavorite}><Heart size={16} fill={item.favorite ? "currentColor" : "none"} /></button></div><h2>{item.title}</h2><p>{item.platform} <span>·</span> {item.lastActive}</p><div className="detail-rating">{item.rating > 0 ? <><Star size={15} fill="currentColor" /> {item.rating} personal rating</> : "Not rated yet"}</div></div><button className="detail-close" onClick={onClose}><X size={18} /></button></div><div className="detail-body"><div className="detail-stat"><span>Status</span><strong>{item.status}</strong></div><div className="detail-stat"><span>Progress</span><strong>{item.progress}%</strong></div><div className="detail-stat"><span>Time logged</span><strong>{item.hours} hours</strong></div><div className="detail-progress"><div className="progress-line"><ProgressBar value={item.progress} color={item.type === "Game" ? "#7358e8" : "#d986b3"} /><strong>{item.progress}%</strong></div><small>{item.detail}</small></div></div>{richMetadata && <section className="metadata-detail"><div className="metadata-detail-head"><span className="eyebrow"><Sparkles size={13} /> Enriched metadata</span>{richMetadata.source && <small>via {richMetadata.source}</small>}</div><div className="metadata-detail-grid">{richMetadata.released && <span><strong>Released</strong><small>{richMetadata.released}</small></span>}{richMetadata.metacritic && <span><strong>Metacritic</strong><small>{richMetadata.metacritic}/100</small></span>}{richMetadata.platforms?.length ? <span><strong>Platforms</strong><small>{richMetadata.platforms.join(", ")}</small></span> : null}{richMetadata.stores?.length ? <span><strong>Stores</strong><small>{richMetadata.stores.join(", ")}</small></span> : null}</div>{richMetadata.tags?.length ? <div className="metadata-tags">{richMetadata.tags.slice(0, 6).map((tag) => <span key={tag}>{tag}</span>)}</div> : null}</section>}{richMetadata && <section className="metadata-extras">{richMetadata.overview && <p className="metadata-overview">{richMetadata.overview}</p>}{richMetadata.cast?.length ? <div className="cast-row"><span className="eyebrow">Cast</span><div>{richMetadata.cast.slice(0, 6).map((person) => <span className="cast-chip" key={`${person.name}-${person.character}`}><strong>{person.name}</strong><small>{person.character}</small></span>)}</div></div> : null}{richMetadata.screenshots?.length ? <div className="screenshot-strip"><span className="eyebrow">Screenshots</span><div>{richMetadata.screenshots.slice(0, 6).map((source) => <img key={source} src={source} alt="" />)}</div></div> : null}{richMetadata.trailers?.length ? <div className="trailer-links"><span className="eyebrow">Trailers</span><div>{richMetadata.trailers.slice(0, 3).map((trailer) => <a key={trailer.key} href={`https://www.youtube.com/watch?v=${trailer.key}`} target="_blank" rel="noreferrer"><Play size={12} /> {trailer.name}</a>)}</div></div> : null}</section>}{item.type === "Series" ? <section className="episode-panel"><div className="season-nav">{richMetadata?.seasons?.length ? <><span className="eyebrow"><ListChecks size={13} /> Season</span><select value={selectedSeason ?? richMetadata.seasons[0].seasonNumber} onChange={(event) => setSelectedSeason(Number(event.target.value))}>{richMetadata.seasons.map((season) => <option key={season.seasonNumber} value={season.seasonNumber}>{season.name || `Season ${season.seasonNumber}`} · {season.episodeCount} eps</option>)}</select></> : null}</div><div className="episode-panel-head"><div><span className="eyebrow"><ListChecks size={13} /> Episode tracker</span><strong>{episodeRows.length ? `Season ${episodeRows[0].seasonNumber}` : "Episodes"}</strong></div><span>{watchedEpisodes.length} / {episodeRows.length} watched</span></div><div className="episode-list">{episodeRows.map((episode) => { const key = `${episode.seasonNumber}:${episode.episodeNumber}`; return <button className={`episode-row ${watchedEpisodes.includes(key) ? "watched" : ""}`} key={key} onClick={() => toggleEpisode(episode.seasonNumber, episode.episodeNumber, episode.title)}><span className="episode-check">{watchedEpisodes.includes(key) && <Check size={12} />}</span><span><strong>{episode.title}</strong><small>S{episode.seasonNumber} · E{episode.episodeNumber}{episode.airDate ? ` · ${episode.airDate}` : ""}</small></span><ChevronRight size={14} className="muted-icon" /></button>; })}</div></section> : <section className="playtime-panel"><div><span className="eyebrow"><Timer size={13} /> Playtime log</span><strong>Capture a session</strong></div><div className="playtime-form"><label>Minutes<input type="number" min="1" max="1440" value={minutes} onChange={(event) => setMinutes(event.target.value)} /></label><label>Note<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note" /></label><button className="small-search-button" onClick={logPlaytime} disabled={playMutation.isPending}>{playMutation.isPending ? <Loader2 size={14} className="spin" /> : <Clock3 size={14} />} Log session</button></div></section>}<div className="detail-actions"><button className="text-button" onClick={onClose}>Close</button>{item.id < 1000000000000 && item.externalId && <button className="small-action" onClick={() => refreshMutation.mutate({ id: item.id })} disabled={refreshMutation.isPending}><RefreshCw size={13} className={refreshMutation.isPending ? "spin" : ""} /> Refresh</button>}<button className="dark-button" onClick={onAdvance}>{item.status === "Completed" ? "Move back to active" : "Update status"} <Check size={15} /></button></div></div></div>;
}
