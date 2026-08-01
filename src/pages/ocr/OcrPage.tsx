import { useState, useRef } from "react";
import {
  Folder,
  Clock,
  CheckCircle,
  Eye,
  Download,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  UploadCloud,
  FileSpreadsheet,
  Search,
  ArrowLeft,
  Edit,
  Plus,
  FileCheck,
  Info,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────────
interface InvoiceItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  total: number;
}

interface InboxDocument {
  id: string;
  filename: string;
  uploadDate: string;
  status: "processing" | "ready";
  progress?: number;
  thumbnailUrl?: string;
  defaultData?: {
    merchant: string;
    date: string;
    reference: string;
    currency: string;
    category: string;
    items: InvoiceItem[];
  };
}

interface ArchiveDocument {
  id: string;
  date: string;
  merchant: string;
  reference: string;
  category: string;
  total: number;
  status: "Selesai" | "Perlu Review" | "Gagal";
  items?: InvoiceItem[];
}

// ── Initial Mock Data ────────────────────────────────────────────────────────
const initialInboxDocuments: InboxDocument[] = [
  {
    id: "doc-001",
    filename: "INV-7721-GAS-LPG.pdf",
    uploadDate: "12 Okt 2023",
    status: "processing",
    progress: 85,
  },
  {
    id: "doc-002",
    filename: "Struk_Pangkalan_Makmur.jpg",
    uploadDate: "12 Okt 2023",
    status: "ready",
    thumbnailUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDlHFMQeksTt7s7UV0XFoU_dU8wFPINQbugFWXq9TO0Zz7-YkuRZyGNfWOaZcK1M7lQ2w2_r3fjm5VT2pufV59uEX3PnG7nNgbd5GIbJHRtR3lMXkpmNcle3NxSlwcU6C-sveGJ2sdZPGP5OZy0lJUR-gEPBB-tZLZF4106xCeg3TlukJAccCaW-d231dcx61yrLT5-08ZhEsVadHLAKN7OWPE4vasXjjqXd5KVu-_QORKjflKoJPbpUCEBzM0gNwRZTCW0g4snERI",
    defaultData: {
      merchant: "Pangkalan Makmur",
      date: "2023-10-12",
      reference: "STRK-PM-8812",
      currency: "IDR",
      category: "LPG 3kg",
      items: [
        {
          id: "item-1",
          name: "LPG 3kg (Subsidized)",
          qty: 80,
          price: 12750,
          total: 1020000,
        },
        {
          id: "item-2",
          name: "LPG 12kg (Bright Gas)",
          qty: 10,
          price: 165000,
          total: 1650000,
        },
      ],
    },
  },
  {
    id: "doc-003",
    filename: "Invoice_S-881.png",
    uploadDate: "11 Okt 2023",
    status: "ready",
    thumbnailUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCUxpeD-pTHlU-AXW92FP7tfI6gVN1DNzTw6ZP4nx-1SVR6FWg0jp1A57aSp81UR8hLmZf9rsHeZ72meVsCq1IO3YeZzc7_15zrVSrbIjoB5KYDL5E-4E-F5qHujHJZ0Q6Ed9UPXZrTLRveCCW8cEDz9uc598lSg_GS3kwT_QZibQuzVHvwayC9SzfgRcRfBJORiRDlOehISEOWu5WcRLlb3DJ6EQ584wg6tQAO_FjwTTSNDAZOm6XeX0DbmWz1MjhRvQTkGrcsXsc",
    defaultData: {
      merchant: "Agen Berkah LPG",
      date: "2023-10-11",
      reference: "INV-AB-2291",
      currency: "IDR",
      category: "LPG 12kg",
      items: [
        {
          id: "item-1",
          name: "LPG 12kg (Bright Gas)",
          qty: 30,
          price: 165000,
          total: 4950000,
        },
      ],
    },
  },
  {
    id: "doc-004",
    filename: "Logistik_Jabar_R5.pdf",
    uploadDate: "11 Okt 2023",
    status: "ready",
    get defaultData() {
      return {
        merchant: "SPBE Jakarta Utara",
        date: "2026-04-17",
        reference: "INV-99281-X",
        currency: "IDR",
        category: "LPG 3kg",
        items: [
          {
            id: "1",
            name: "LPG 3kg (Subsidized)",
            qty: 150,
            price: 12750,
            total: 1912500,
          },
          {
            id: "2",
            name: "LPG 12kg (Bright Gas)",
            qty: 25,
            price: 165000,
            total: 4125000,
          },
          {
            id: "3",
            name: "LPG 50kg (Industrial)",
            qty: 5,
            price: 720000,
            total: 3600000,
          },
        ],
      };
    },
  },
];

const initialArchiveDocuments: ArchiveDocument[] = [
  {
    id: "arc-001",
    date: "24 Okt 2023",
    merchant: "Agen Berkah LPG",
    reference: "KW-00892/BDG",
    category: "LPG 3kg",
    total: 4500000,
    status: "Selesai",
    items: [
      {
        id: "1",
        name: "LPG 3kg (Subsidized)",
        qty: 352,
        price: 12750,
        total: 4500000,
      },
    ],
  },
  {
    id: "arc-002",
    date: "23 Okt 2023",
    merchant: "Pangkalan Maju Jaya",
    reference: "KW-00891/BDG",
    category: "LPG 12kg",
    total: 12240000,
    status: "Perlu Review",
    items: [
      {
        id: "1",
        name: "LPG 12kg (Bright Gas)",
        qty: 74,
        price: 165000,
        total: 12210000,
      },
    ],
  },
  {
    id: "arc-003",
    date: "23 Okt 2023",
    merchant: "Toko Sinar Terang",
    reference: "KW-00890/BDG",
    category: "Bright Gas",
    total: 8120000,
    status: "Selesai",
    items: [
      {
        id: "1",
        name: "LPG 5.5kg (Bright Gas)",
        qty: 90,
        price: 90000,
        total: 8120000,
      },
    ],
  },
  {
    id: "arc-004",
    date: "22 Okt 2023",
    merchant: "Agen Berkah LPG",
    reference: "KW-00889/BDG",
    category: "LPG 3kg",
    total: 3800000,
    status: "Selesai",
  },
  {
    id: "arc-005",
    date: "22 Okt 2023",
    merchant: "Mitra LPG Cimahi",
    reference: "KW-00888/BDG",
    category: "LPG 3kg",
    total: 5250000,
    status: "Perlu Review",
  },
  {
    id: "arc-006",
    date: "21 Okt 2023",
    merchant: "IndoGas Utama",
    reference: "KW-00887/BDG",
    category: "LPG 12kg",
    total: 15600000,
    status: "Selesai",
  },
  {
    id: "arc-007",
    date: "21 Okt 2023",
    merchant: "Agen Berkah LPG",
    reference: "KW-00886/BDG",
    category: "LPG 3kg",
    total: 4200000,
    status: "Selesai",
  },
  {
    id: "arc-008",
    date: "20 Okt 2023",
    merchant: "Warung Gas Abadi",
    reference: "KW-00885/BDG",
    category: "LPG 3kg",
    total: 2100000,
    status: "Selesai",
  },
];

export function OcrPage() {
  const [activeTab, setActiveTab] = useState<"inbox" | "verify" | "history">(
    "inbox",
  );
  const [inboxDocs, setInboxDocs] = useState<InboxDocument[]>(
    initialInboxDocuments,
  );
  const [archiveDocs, setArchiveDocs] = useState<ArchiveDocument[]>(
    initialArchiveDocuments,
  );

  // Stats calculation
  const totalInbox = inboxDocs.length;
  const needsVerification =
    archiveDocs.filter((d) => d.status === "Perlu Review").length +
    inboxDocs.filter((d) => d.status === "ready").length;
  const processedSuccessfully = archiveDocs.filter(
    (d) => d.status === "Selesai",
  ).length;

  // ── Tab 1: Inbox Selection & State ────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "info";
  } | null>(null);

  const triggerNotification = (
    message: string,
    type: "success" | "info" = "success",
  ) => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const newDoc: InboxDocument = {
      id: `doc-${Date.now()}`,
      filename: file.name,
      uploadDate: "30 Mei 2026",
      status: "processing",
      progress: 0,
    };

    setInboxDocs((prev) => [newDoc, ...prev]);
    triggerNotification(
      `Berhasil mengunggah ${file.name}. Menginisialisasi pemindaian...`,
      "info",
    );

    // Simulate extraction loading progress
    let prog = 0;
    const interval = setInterval(() => {
      prog += 20;
      setInboxDocs((prev) =>
        prev.map((d) => {
          if (d.id === newDoc.id) {
            if (prog >= 100) {
              clearInterval(interval);
              return {
                ...d,
                status: "ready",
                progress: 100,
                defaultData: {
                  merchant: "Toko Gas Baru Mandiri",
                  date: "2026-05-30",
                  reference: `INV-DR-${Math.floor(1000 + Math.random() * 9000)}`,
                  currency: "IDR",
                  category: "LPG 3kg",
                  items: [
                    {
                      id: "it-1",
                      name: "LPG 3kg (Subsidized)",
                      qty: 50,
                      price: 12750,
                      total: 637500,
                    },
                    {
                      id: "it-2",
                      name: "LPG 12kg (Bright Gas)",
                      qty: 5,
                      price: 165000,
                      total: 825000,
                    },
                  ],
                },
              };
            }
            return { ...d, progress: prog };
          }
          return d;
        }),
      );
    }, 600);
  };

  // ── Tab 2: Verifikasi AI Form State ────────────────────────────────────────
  const [selectedDoc, setSelectedDoc] = useState<InboxDocument | null>(null);
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState("");
  const [reference, setReference] = useState("");
  const [currency, setCurrency] = useState("IDR");
  const [category, setCategory] = useState("LPG 3kg");
  const [items, setItems] = useState<InvoiceItem[]>([]);

  // Interactive Receipt Viewer Tools
  const [zoomScale, setZoomScale] = useState(1);
  const [rotateDeg, setRotateCw] = useState(0);
  const [showOverlays, setShowOverlays] = useState(true);

  const startVerification = (doc: InboxDocument) => {
    if (doc.status !== "ready") return;
    const defaultData = doc.defaultData || {
      merchant: "SPBE Jakarta Utara",
      date: "2026-04-17",
      reference: "INV-99281-X",
      currency: "IDR",
      category: "LPG 3kg",
      items: [
        {
          id: "1",
          name: "LPG 3kg (Subsidized)",
          qty: 150,
          price: 12750,
          total: 1912500,
        },
        {
          id: "2",
          name: "LPG 12kg (Bright Gas)",
          qty: 25,
          price: 165000,
          total: 4125000,
        },
        {
          id: "3",
          name: "LPG 50kg (Industrial)",
          qty: 5,
          price: 720000,
          total: 3600000,
        },
      ],
    };

    setSelectedDoc(doc);
    setMerchant(defaultData.merchant);
    setDate(defaultData.date);
    setReference(defaultData.reference);
    setCurrency(defaultData.currency);
    setCategory(defaultData.category || "LPG 3kg");
    setItems(JSON.parse(JSON.stringify(defaultData.items))); // Deep clone
    setZoomScale(1);
    setRotateCw(0);
    setActiveTab("verify");
  };

  const handleUpdateItem = (
    itemId: string,
    field: "name" | "qty" | "price",
    value: string | number,
  ) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          if (field === "qty" || field === "price") {
            updatedItem.total =
              Number(updatedItem.qty) * Number(updatedItem.price);
          }
          return updatedItem;
        }
        return item;
      }),
    );
  };

  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: `it-add-${Date.now()}`,
      name: "Produk Baru",
      qty: 1,
      price: 0,
      total: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleDeleteItem = (itemId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  // Math recalculations
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const ppnPercent = 0.11; // 11% PPN in Indonesia
  const ppnAmount = subtotal * ppnPercent;
  const grandTotal = subtotal + ppnAmount;

  const saveToDatabase = () => {
    if (!selectedDoc) return;
    const newArchiveItem: ArchiveDocument = {
      id: `arc-${Date.now()}`,
      merchant: merchant,
      date: date ? formatDate(new Date(date)) : "30 Mei 2026",
      reference: reference || "KW-MOCK-999",
      category: category,
      total: grandTotal,
      status: "Selesai",
      items: items,
    };

    setArchiveDocs((prev) => [newArchiveItem, ...prev]);
    setInboxDocs((prev) => prev.filter((d) => d.id !== selectedDoc.id));
    triggerNotification(
      `Dokumen ${selectedDoc.filename} berhasil diverifikasi dan disimpan ke basis data logistik!`,
      "success",
    );
    setSelectedDoc(null);
    setActiveTab("history");

    // Integrate with money reporting by logging cash/reconciliation
    console.log("Integrating transaction to reports...", newArchiveItem);
  };

  // ── Tab 3: History Table Filters ───────────────────────────────────────────
  const [historySearch, setHistorySearch] = useState("");
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState("Semua");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("Semua");
  const [selectedArchiveView, setSelectedArchiveView] =
    useState<ArchiveDocument | null>(null);

  const filteredArchive = archiveDocs.filter((doc) => {
    const matchesSearch =
      doc.merchant.toLowerCase().includes(historySearch.toLowerCase()) ||
      doc.reference.toLowerCase().includes(historySearch.toLowerCase());
    const matchesCategory =
      historyCategoryFilter === "Semua" ||
      doc.category === historyCategoryFilter;
    const matchesStatus =
      historyStatusFilter === "Semua" || doc.status === historyStatusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleDeleteArchive = (id: string, refText: string) => {
    if (
      confirm(
        `Apakah Anda yakin ingin menghapus arsip ${refText} dari riwayat digital?`,
      )
    ) {
      setArchiveDocs((prev) => prev.filter((d) => d.id !== id));
      triggerNotification(`Arsip ${refText} successfully deleted.`, "info");
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Toast / Status Notification Alert */}
      {notification && (
        <div
          className={`fixed top-20 right-6 z-[2000] p-4 rounded-xl border shadow-2xl flex items-start gap-3 max-w-md animate-in slide-in-from-top-6 ${
            notification.type === "success"
              ? "border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-950/20 text-green-800 dark:text-green-300"
              : "border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle className="w-5 h-5 shrink-0 text-green-600 dark:text-green-400" />
          ) : (
            <FileSpreadsheet className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400 animate-pulse" />
          )}
          <div className="flex-1">
            <p className="font-bold text-sm leading-tight">
              {notification.type === "success"
                ? "Berhasil"
                : "Proses Verifikasi"}
            </p>
            <p className="text-xs mt-0.5 opacity-90">{notification.message}</p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-current opacity-70 hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header layout according to Stitch design with inline tabs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 dark:border-dark-700 pb-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            OCR Kwitansi &amp; Inbox
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Kelola, ekstraksi, dan verifikasi otomatis dokumen logistik kwitansi
            transaksi agen LPG.
          </p>
        </div>

        {/* Navigation Switch Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-dark-900 rounded-xl w-fit shrink-0 self-start md:self-center">
          <button
            onClick={() => setActiveTab("inbox")}
            className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all ${
              activeTab === "inbox"
                ? "bg-white dark:bg-dark-800 text-[#1565C0] dark:text-blue-300 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Inbox &amp; Upload
          </button>
          <button
            onClick={() => {
              setActiveTab("verify");
            }}
            className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "verify"
                ? "bg-white dark:bg-dark-800 text-[#1565C0] dark:text-blue-300 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Verifikasi Ekstraksi
            {selectedDoc && (
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all ${
              activeTab === "history"
                ? "bg-white dark:bg-dark-800 text-[#1565C0] dark:text-blue-300 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Arsip Digital (Histori)
          </button>
        </div>
      </div>

      {/* KPI Row */}
      {activeTab !== "verify" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white dark:bg-dark-800 p-5 rounded-xl border border-gray-200 dark:border-dark-700 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Folder className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                Total Dokumen
              </p>
              <p className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
                {totalInbox + archiveDocs.length}
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-dark-800 p-5 rounded-xl border border-gray-200 dark:border-dark-700 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                Perlu Verifikasi
              </p>
              <p className="text-2xl font-black text-orange-600 leading-tight">
                {needsVerification}
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-dark-800 p-5 rounded-xl border border-gray-200 dark:border-dark-700 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                Selesai Diproses
              </p>
              <p className="text-2xl font-black text-emerald-600 leading-tight">
                {processedSuccessfully}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── TAB 1: INBOX & UPLOAD ─────────────────────────── */}
      {activeTab === "inbox" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Inbox Files (70%) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                Inbox Dokumen Belum Diproses
              </h3>
              <p className="text-xs font-medium text-[#1565C0] dark:text-blue-300">
                Pilih berkas di bawah untuk memulai verifikasi
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {inboxDocs.map((doc) => (
                <Card
                  key={doc.id}
                  className={`border overflow-hidden transition-all duration-200 hover:shadow-md ${
                    doc.status === "processing"
                      ? "border-blue-300 dark:border-blue-900/40 bg-blue-50/10 dark:bg-blue-950/5 relative"
                      : "border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800"
                  }`}
                >
                  <CardContent className="p-4 flex gap-4">
                    {/* File Thumbnail or Icon representation */}
                    <div className="w-16 h-20 bg-gray-100 dark:bg-dark-900 rounded flex items-center justify-center overflow-hidden shrink-0 border border-gray-100 dark:border-dark-950">
                      {doc.thumbnailUrl ? (
                        <img
                          src={doc.thumbnailUrl}
                          alt={doc.filename}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : doc.status === "processing" ? (
                        <FileSpreadsheet className="w-8 h-8 text-blue-500 animate-pulse" />
                      ) : (
                        <FileSpreadsheet className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h4
                          className="font-bold text-gray-900 dark:text-white text-sm truncate pr-2"
                          title={doc.filename}
                        >
                          {doc.filename}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Diunggah: {doc.uploadDate}
                        </p>
                      </div>

                      {doc.status === "processing" ? (
                        <div className="space-y-1.5 mt-2">
                          <div className="flex items-center justify-between text-[10px] font-black uppercase text-blue-600 dark:text-blue-400">
                            <span>Memproses berkas...</span>
                            <span>{doc.progress}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-200 dark:bg-dark-900 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#1565C0] rounded-full transition-all duration-300"
                              style={{ width: `${doc.progress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => startVerification(doc)}
                          className="w-full mt-3 py-1.5 border border-[#1565C0] text-[#1565C0] dark:border-blue-400 dark:text-blue-300 text-xs font-bold rounded-lg hover:bg-[#1565C0] hover:text-white dark:hover:bg-blue-400 dark:hover:text-dark-900 transition-all uppercase tracking-wider"
                        >
                          Verifikasi
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Storage Display according to layout */}
            <div className="bg-gray-100/50 dark:bg-dark-850 p-5 rounded-xl border border-gray-200 dark:border-dark-700 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mt-6">
              <div className="space-y-1 flex-1">
                <p className="text-xs text-[#1565C0] dark:text-blue-300 font-bold uppercase tracking-wider">
                  Penyimpanan Dokumen
                </p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Kapasitas berkas kwitansi dan hasil ekstraksi OCR saat ini.
                </p>
              </div>
              <div className="w-full sm:w-56 shrink-0 space-y-2">
                <div className="h-2 w-full bg-gray-200 dark:bg-dark-900 rounded-full overflow-hidden">
                  <div className="h-full bg-[#1565C0] w-3/4 rounded-full" />
                </div>
                <p className="text-right text-xs font-bold text-gray-600 dark:text-gray-400">
                  7.5 GB dari 10 GB digunakan (75%)
                </p>
              </div>
            </div>
          </div>

          {/* Upload Zone (30%) */}
          <div className="lg:col-span-4 space-y-5">
            <h3 className="text-lg font-black text-gray-900 dark:text-white">
              Zona Drop File
            </h3>

            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg"
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFileUpload(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl h-80 flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-[#1565C0] bg-[#1565C0]/5 dark:bg-blue-500/5"
                  : "border-gray-300 dark:border-dark-700 hover:border-[#1565C0] hover:bg-gray-50/50 dark:hover:bg-dark-800/40"
              }`}
            >
              <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-500/5 flex items-center justify-center mb-4 text-[#1565C0] dark:text-blue-400">
                <UploadCloud className="w-7 h-7" />
              </div>
              <p className="font-bold text-gray-800 dark:text-white text-base">
                Tarik foto struk atau PDF invoice ke sini
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 max-w-[220px]">
                Atau klik untuk menelusuri berkas dari perangkat Anda
              </p>
              <div className="flex gap-2 text-gray-400 dark:text-gray-600 mt-6">
                <FileSpreadsheet className="w-5 h-5" />
                <Folder className="w-5 h-5" />
              </div>
            </div>

            {/* Tips Column Card */}
            <div className="bg-blue-50/40 dark:bg-blue-500/5 p-5 rounded-xl border border-blue-100 dark:border-blue-900/20">
              <div className="flex items-center gap-2 mb-3 text-[#1565C0] dark:text-blue-400">
                <Info className="w-4 h-4 shrink-0" />
                <p className="text-xs font-black uppercase tracking-wider">
                  Informasi Pemindaian
                </p>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-650 dark:text-gray-400 leading-normal">
                    Gunakan format{" "}
                    <span className="font-bold text-gray-900 dark:text-white">
                      JPG, PNG, atau PDF
                    </span>{" "}
                    dengan resolusi minimal 300dpi untuk hasil maksimal.
                  </p>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-650 dark:text-gray-400 leading-normal">
                    Tingkat akurasi pemindaian mencapai{" "}
                    <span className="font-bold text-gray-900 dark:text-white">
                      98.4%
                    </span>{" "}
                    untuk data tanggal, nominal, dan nomor referensi.
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── TAB 2: VERIFIKASI EKSTRAKSI ────────────────────── */}
      {activeTab === "verify" && !selectedDoc && (
        <div className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 rounded-2xl p-8 text-center max-w-xl mx-auto space-y-6 shadow-sm my-8">
          <div className="w-16 h-16 bg-[#1565C0]/5 dark:bg-blue-500/5 rounded-2xl text-[#1565C0] dark:text-blue-300 flex items-center justify-center mx-auto border border-[#1565C0]/15">
            <FileCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Pilih Berkas Untuk Diverifikasi
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Silakan pilih kwitansi dari inbox yang sudah siap di bawah untuk
              memulai proses verifikasi hasil ekstraksi data.
            </p>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {inboxDocs
              .filter((d) => d.status === "ready")
              .map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border border-gray-100 dark:border-dark-700/60 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-900/40 transition-all text-left gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-gray-100 dark:bg-dark-900 rounded-lg shrink-0 text-gray-500 dark:text-gray-400">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="text-sm font-bold text-gray-900 dark:text-white block truncate max-w-[200px] md:max-w-[280px]"
                        title={doc.filename}
                      >
                        {doc.filename}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 block">
                        Diunggah: {doc.uploadDate}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => startVerification(doc)}
                    className="px-4 py-2 bg-[#1565C0] text-white text-xs font-bold rounded-lg hover:bg-[#1255A0] shadow-sm uppercase tracking-wider shrink-0"
                  >
                    Mulai Verifikasi
                  </button>
                </div>
              ))}
            {inboxDocs.filter((d) => d.status === "ready").length === 0 && (
              <div className="py-6 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Tidak ada berkas yang siap melakukan verifikasi di inbox.
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Silakan unggah berkas kwitansi baru terlebih dahulu.
                </p>
              </div>
            )}
          </div>
          <div className="pt-4 border-t dark:border-dark-750">
            <button
              onClick={() => setActiveTab("inbox")}
              className="text-xs font-bold text-[#1565C0] dark:text-blue-300 uppercase tracking-widest hover:underline"
            >
              Unduh atau Unggah Berkas Baru di Inbox
            </button>
          </div>
        </div>
      )}

      {activeTab === "verify" && selectedDoc && (
        <div className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 rounded-2xl overflow-hidden flex flex-col min-h-[600px] shadow-sm">
          {/* Header Action Bar inside Layout */}
          <div className="bg-gray-55/60 dark:bg-dark-900/60 p-4 border-b border-gray-200 dark:border-dark-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedDoc(null);
                  setActiveTab("inbox");
                }}
                className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="Kembali ke Inbox"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="h-4 w-px bg-gray-300 dark:bg-dark-800 mx-1" />
              <h2 className="text-base font-black text-gray-900 dark:text-white">
                Verifikasi Hasil Ekstraksi
              </h2>
              <Badge
                variant="outline"
                className="text-[11px] font-mono font-medium text-gray-600 dark:text-gray-400"
              >
                Batch: OCR-2026-0530
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                Akurasi Pemindaian:
              </span>
              <Badge className="bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 font-bold">
                98% Confidence
              </Badge>
            </div>
          </div>

          <div className="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-dark-700 overflow-hidden">
            {/* Left Panel: Image Viewer with controls (50%) */}
            <div className="md:w-1/2 p-6 bg-gray-50/50 dark:bg-dark-900/30 flex flex-col items-center justify-center relative min-h-[400px]">
              {/* Image Controls toolbar */}
              <div className="absolute top-4 z-10 flex items-center gap-1.5 p-1.5 bg-white dark:bg-dark-800 shadow-lg rounded-xl border border-gray-100 dark:border-dark-700">
                <button
                  onClick={() =>
                    setZoomScale((prev) => Math.min(prev + 0.15, 2.5))
                  }
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-dark-900 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    setZoomScale((prev) => Math.max(prev - 0.15, 0.65))
                  }
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-dark-900 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-gray-200 dark:bg-dark-700 mx-1" />
                <button
                  onClick={() => setRotateCw((prev) => (prev + 90) % 360)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-dark-900 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
                  title="Rotate Right"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-gray-200 dark:bg-dark-700 mx-1" />
                <button
                  onClick={() => setShowOverlays((prev) => !prev)}
                  className={`p-1.5 rounded-lg transition-colors text-xs font-bold ${
                    showOverlays
                      ? "bg-[#1565C0]/10 text-[#1565C0]"
                      : "text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-900"
                  }`}
                  title="Tampilkan Wilayah Pemindaian"
                >
                  Overlay Highlight
                </button>
              </div>

              {/* Scanned Image viewport container */}
              <div className="w-full flex-1 flex items-center justify-center overflow-hidden p-6 mt-4">
                <div
                  className="relative bg-white shadow-2xl p-4 border border-gray-100 dark:border-dark-950 max-w-sm rounded duration-300 shadow-blue-900/5 transition-transform"
                  style={{
                    transform: `scale(${zoomScale}) rotate(${rotateDeg}deg)`,
                  }}
                >
                  <img
                    src={
                      selectedDoc.thumbnailUrl ||
                      "https://lh3.googleusercontent.com/aida-public/AB6AXuAMBU8wMzqE9Zox3H38Yl-I8afuo80fNtDZPwpVwvYFXaL5XlrYKoR3vjafYtLobmnZFBERQOcIQRRh8hMGSN6EUT7cJfse7in_WVDgdFEmzLryUtYuca6Sj310tACKICj7KiqnBFcaSCvynrWZ8X-ZIsg1CqmybeZ1KuszcrMc3d4kGcJA8R8W3RtUBYGZ8ckIpXxQmXtwB7r4sGbIeLYmUyk0-ekNnLDw34hRO2WZ3hUt-jQosD0sRJ1RBwbobSdb2qEI-Biv5I0"
                    }
                    alt="Receipt source document"
                    className="max-h-[380px] w-auto border-2 border-dashed border-primary/20 pointer-events-none"
                  />

                  {/* Highlighting boxes simulating OCR coordinates bounding boxes */}
                  {showOverlays && (
                    <>
                      <div className="absolute top-[8%] left-[10%] w-[80%] h-[11%] border-2 border-blue-500 bg-blue-500/10 rounded-sm pointer-events-none" />
                      <div className="absolute top-[25%] left-[10%] w-[38%] h-[5%] border-2 border-green-500 bg-green-500/10 rounded-sm pointer-events-none" />
                      <div className="absolute top-[32%] left-[10%] w-[42%] h-[6%] border-2 border-amber-500 bg-amber-500/10 rounded-sm pointer-events-none" />
                      <div className="absolute bottom-[10%] right-[10%] w-[35%] h-[8%] border-2 border-red-500 bg-red-500/10 rounded-sm pointer-events-none" />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel: Extracted Editable Fields form (50%) */}
            <div className="md:w-1/2 p-6 space-y-6 flex flex-col justify-between bg-white dark:bg-dark-800">
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b pb-2 dark:border-dark-750">
                  <h3 className="font-extrabold text-[#1565C0] dark:text-blue-300 text-sm tracking-wide uppercase flex items-center gap-1.5">
                    Hasil Ekstraksi Transaksi
                  </h3>
                  <span className="text-[11px] font-medium text-gray-500">
                    {selectedDoc.filename}
                  </span>
                </div>

                {/* Form fields in grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-[11px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
                      Toko / Merchant
                    </Label>
                    <div className="relative">
                      <Input
                        value={merchant}
                        onChange={(e) => setMerchant(e.target.value)}
                        className="bg-gray-50 dark:bg-dark-900 border-gray-200 dark:border-dark-700 focus-visible:ring-[#1565C0] pr-8"
                      />
                      <Edit className="w-4 h-4 text-gray-450 dark:text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
                      Tanggal
                    </Label>
                    <div className="relative">
                      <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-gray-50 dark:bg-dark-900 border-gray-200 dark:border-dark-700 focus-visible:ring-[#1565C0]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
                      No. Referensi / Surat Jalan
                    </Label>
                    <Input
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="bg-gray-50 dark:bg-dark-900 border-gray-200 dark:border-dark-700 focus-visible:ring-[#1565C0]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
                      Kategori LPG Utama
                    </Label>
                    <Select
                      value={category}
                      onValueChange={(v) => setCategory(v)}
                    >
                      <SelectTrigger className="bg-gray-50 dark:bg-dark-900 border-gray-200 dark:border-dark-700">
                        <SelectValue placeholder="Pilih Kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LPG 3kg">LPG 3kg</SelectItem>
                        <SelectItem value="LPG 12kg">LPG 12kg</SelectItem>
                        <SelectItem value="Bright Gas">Bright Gas</SelectItem>
                        <SelectItem value="LPG 50kg">LPG 50kg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
                      Mata Uang
                    </Label>
                    <Input
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="bg-gray-50 dark:bg-dark-900 border-gray-200 dark:border-dark-700 focus-visible:ring-[#1565C0] font-bold"
                      readOnly
                    />
                  </div>
                </div>

                {/* Extracted items checklist/table details */}
                <div className="space-y-3 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider font-black text-gray-500 dark:text-gray-400">
                      Detail Barang
                    </span>
                    <button
                      onClick={handleAddItem}
                      className="flex items-center gap-1 text-xs text-[#1565C0] hover:text-[#1255A0] dark:text-blue-300 font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Item
                    </button>
                  </div>

                  <div className="border border-gray-150 dark:border-dark-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-gray-50 dark:bg-dark-900">
                        <TableRow>
                          <TableHead className="text-xs h-9 py-1 px-3">
                            Nama
                          </TableHead>
                          <TableHead className="text-xs text-right h-9 py-1 px-3 w-[70px]">
                            Qty
                          </TableHead>
                          <TableHead className="text-xs text-right h-9 py-1 px-3">
                            Satuan
                          </TableHead>
                          <TableHead className="text-xs text-right h-9 py-1 px-3">
                            Jumlah
                          </TableHead>
                          <TableHead className="text-xs h-9 py-1 px-2 text-center w-8"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow
                            key={item.id}
                            className="h-10 hover:bg-gray-50/50 dark:hover:bg-dark-850/40"
                          >
                            <TableCell className="py-1 px-3">
                              <input
                                value={item.name}
                                onChange={(e) =>
                                  handleUpdateItem(
                                    item.id,
                                    "name",
                                    e.target.value,
                                  )
                                }
                                className="w-full bg-transparent border-0 focus:ring-0 p-0 text-xs font-bold text-gray-900 dark:text-white"
                              />
                            </TableCell>
                            <TableCell className="py-1 px-3 text-right">
                              <input
                                type="number"
                                value={item.qty}
                                onChange={(e) =>
                                  handleUpdateItem(
                                    item.id,
                                    "qty",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                className="w-full bg-transparent border-0 focus:ring-0 p-0 text-xs text-right text-gray-900 dark:text-white font-bold"
                              />
                            </TableCell>
                            <TableCell className="py-1 px-3 text-right">
                              <input
                                type="number"
                                value={item.price}
                                onChange={(e) =>
                                  handleUpdateItem(
                                    item.id,
                                    "price",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                className="w-full bg-transparent border-0 focus:ring-0 p-0 text-xs text-right text-gray-900 dark:text-white"
                              />
                            </TableCell>
                            <TableCell className="py-1 px-3 text-right text-xs font-bold text-gray-900 dark:text-white">
                              {formatCurrency(item.total)}
                            </TableCell>
                            <TableCell className="py-1 px-[2px] text-center">
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 p-1 rounded-lg"
                                title="Hapus baris"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Subtotals calculating of taxes PPN 11% */}
                <div className="border-t border-gray-100 dark:border-dark-750 pt-3 flex flex-col items-end space-y-2.5">
                  <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 w-56">
                    <span>Subtotal</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 w-56">
                    <span>PPN (11%)</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(ppnAmount)}
                    </span>
                  </div>
                  <div className="h-px bg-gray-200 dark:bg-dark-700 w-56 my-0.5" />
                  <div className="flex justify-between items-center w-56">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      Total Transaksi
                    </span>
                    <span className="text-lg font-black text-[#1565C0] dark:text-blue-300 tabular-nums">
                      {formatCurrency(grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Verification Action Bar */}
              <div className="border-t border-gray-150 dark:border-dark-700 pt-5 flex items-center justify-between gap-4 mt-6">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 max-w-[220px]">
                  <CustomInfoIcon className="w-4 h-4 shrink-0 text-amber-500" />
                  <p>
                    Harap konfirmasi nominal kwitansi dan pajak sesuai sebelum
                    menyimpan.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedDoc(null);
                      setActiveTab("inbox");
                    }}
                    className="px-4 py-2 border border-gray-200 dark:border-dark-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-dark-900 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    onClick={saveToDatabase}
                    className="px-5 py-2.5 bg-[#1565C0] text-white hover:bg-[#1255A0] text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/10 active:scale-[0.98] flex items-center gap-1"
                  >
                    <FileCheck className="w-3.5 h-3.5" /> Simpan ke Database
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── TAB 3: HISTORY ARSIP DIGITAL ──────────────────── */}
      {activeTab === "history" && (
        <Card className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 shadow-sm">
          <CardContent className="p-0">
            {/* Filter Section Bar */}
            <div className="p-4 bg-gray-50/50 dark:bg-dark-900/10 border-b border-gray-200 dark:border-dark-700 flex flex-wrap items-center justify-between gap-3.5">
              <div className="flex flex-1 items-center bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-700 rounded-xl px-3 py-1.5 max-w-sm group focus-within:ring-2 focus-within:ring-[#1565C0]/20 dark:focus-within:ring-blue-500/20 transition-all">
                <Search className="w-4 h-4 text-gray-450 mr-2" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Cari merchant atau no. surat jalan..."
                  className="w-full bg-transparent border-0 p-0 text-sm focus:ring-0 focus:outline-none dark:text-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Category selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest hidden sm:inline">
                    Kategori:
                  </span>
                  <Select
                    value={historyCategoryFilter}
                    onValueChange={(v) => setHistoryCategoryFilter(v)}
                  >
                    <SelectTrigger className="w-[140px] bg-white dark:bg-dark-900 border-gray-200 dark:border-dark-700 h-9 py-1 px-3 rounded-lg text-xs font-medium">
                      <SelectValue placeholder="Pilih Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Semua">Semua Kategori</SelectItem>
                      <SelectItem value="LPG 3kg">LPG 3kg</SelectItem>
                      <SelectItem value="LPG 12kg">LPG 12kg</SelectItem>
                      <SelectItem value="Bright Gas">Bright Gas</SelectItem>
                      <SelectItem value="LPG 50kg">LPG 50kg</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest hidden sm:inline">
                    Status:
                  </span>
                  <Select
                    value={historyStatusFilter}
                    onValueChange={(v) => setHistoryStatusFilter(v)}
                  >
                    <SelectTrigger className="w-[140px] bg-white dark:bg-dark-900 border-gray-200 dark:border-dark-700 h-9 py-1 px-3 rounded-lg text-xs font-medium">
                      <SelectValue placeholder="Pilih Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Semua">Semua Status</SelectItem>
                      <SelectItem value="Selesai">Selesai</SelectItem>
                      <SelectItem value="Perlu Review">Perlu Review</SelectItem>
                      <SelectItem value="Gagal">Gagal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Main Table for history list */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-dark-900">
                  <TableRow>
                    <TableHead className="px-6 py-4 uppercase font-bold text-xs tracking-wider">
                      Preview
                    </TableHead>
                    <TableHead className="px-6 py-4 uppercase font-bold text-xs tracking-wider">
                      Tanggal
                    </TableHead>
                    <TableHead className="px-6 py-4 uppercase font-bold text-xs tracking-wider">
                      Merchant
                    </TableHead>
                    <TableHead className="px-6 py-4 uppercase font-bold text-xs tracking-wider">
                      No. Dokumen
                    </TableHead>
                    <TableHead className="px-6 py-4 uppercase font-bold text-xs tracking-wider">
                      Kategori Utama
                    </TableHead>
                    <TableHead className="px-6 py-4 uppercase font-bold text-xs tracking-wider text-right">
                      Total Transaksi
                    </TableHead>
                    <TableHead className="px-6 py-4 uppercase font-bold text-xs tracking-wider text-center">
                      Status
                    </TableHead>
                    <TableHead className="px-6 py-4 uppercase font-bold text-xs tracking-wider text-center">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArchive.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-10 text-gray-500 text-sm"
                      >
                        Tidak ada arsip kwitansi yang sesuai dengan kriteria
                        filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredArchive.map((doc, idx) => (
                      <TableRow
                        key={doc.id}
                        className={`hover:bg-gray-50/50 dark:hover:bg-dark-850/40 h-14 ${
                          idx % 2 === 1
                            ? "bg-gray-50/20 dark:bg-dark-900/10"
                            : "bg-white dark:bg-dark-800"
                        }`}
                      >
                        <TableCell className="px-6 py-2">
                          <div className="w-10 h-10 rounded bg-gray-100 dark:bg-dark-900 border border-gray-150 dark:border-dark-950 flex items-center justify-center text-gray-400 dark:text-gray-500 shrink-0 select-none">
                            <Folder className="w-5 h-5 text-gray-400" />
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-xs font-semibold text-gray-800 dark:text-gray-300">
                          {doc.date}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                          {doc.merchant}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-xs font-mono font-medium text-gray-600 dark:text-gray-400">
                          {doc.reference}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-xs font-semibold text-gray-700 dark:text-gray-400">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold px-2 py-0.2"
                          >
                            {doc.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm font-bold text-right text-gray-905 dark:text-gray-200 font-mono">
                          {formatCurrency(doc.total)}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-center">
                          <Badge
                            className={`font-black text-[10px] uppercase px-2.5 py-0.5 ${
                              doc.status === "Selesai"
                                ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                                : doc.status === "Perlu Review"
                                  ? "bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                                  : "bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                            }`}
                          >
                            {doc.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-center">
                          <div className="flex justify-center items-center gap-1.5">
                            <button
                              onClick={() => setSelectedArchiveView(doc)}
                              className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-900 rounded-lg transition-colors"
                              title="Tampilkan Detail"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                triggerNotification(
                                  `Mendownload salinan digital arsip...`,
                                  "success",
                                )
                              }
                              className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-900 rounded-lg transition-colors"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteArchive(doc.id, doc.reference)
                              }
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-55/10 rounded-lg transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Archive Viewer Modal Dialog */}
      <Dialog
        open={selectedArchiveView !== null}
        onOpenChange={() => setSelectedArchiveView(null)}
      >
        {selectedArchiveView && (
          <DialogContent className="max-w-2xl bg-white dark:bg-dark-800 border dark:border-dark-750">
            <DialogHeader className="border-b pb-3 dark:border-dark-700">
              <DialogTitle className="text-lg font-black text-gray-900 dark:text-white flex items-center justify-between">
                <span>Arsip Kwitansi: {selectedArchiveView.reference}</span>
                <Badge
                  className={`font-black text-[10px] uppercase px-2.5 py-0.5 ${
                    selectedArchiveView.status === "Selesai"
                      ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                      : "bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                  }`}
                >
                  {selectedArchiveView.status}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50/50 dark:bg-dark-900/40 p-4 rounded-xl">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                    Merchant / Supplier
                  </p>
                  <p className="font-bold text-gray-950 dark:text-white mt-1">
                    {selectedArchiveView.merchant}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                    Tanggal Dokumen
                  </p>
                  <p className="font-medium text-gray-950 dark:text-white mt-1">
                    {selectedArchiveView.date}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                    No. Referensi
                  </p>
                  <p className="font-mono text-gray-950 dark:text-white mt-1">
                    {selectedArchiveView.reference}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                    Kategori LPG Utama
                  </p>
                  <p className="font-bold text-gray-950 dark:text-white mt-1">
                    {selectedArchiveView.category}
                  </p>
                </div>
              </div>

              {selectedArchiveView.items && (
                <div className="space-y-2">
                  <p className="text-[11px] font-black uppercase text-gray-500 tracking-wider">
                    Daftar Barang
                  </p>
                  <div className="border border-gray-150 dark:border-dark-700 rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50 dark:bg-dark-900">
                        <TableRow>
                          <TableHead className="text-xs h-9 py-1 px-3">
                            Nama LPG
                          </TableHead>
                          <TableHead className="text-xs text-right h-9 py-1 px-3">
                            Qty
                          </TableHead>
                          <TableHead className="text-xs text-right h-9 py-1 px-3">
                            Harga Satuan
                          </TableHead>
                          <TableHead className="text-xs text-right h-9 py-1 px-3">
                            Subtotal
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedArchiveView.items.map((item) => (
                          <TableRow
                            key={item.id}
                            className="hover:bg-gray-55/40"
                          >
                            <TableCell className="py-2.5 px-3 font-semibold text-xs text-gray-800 dark:text-gray-300">
                              {item.name}
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-right font-medium text-xs text-gray-805 dark:text-gray-300 tabular-nums">
                              {item.qty}
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-right text-xs text-gray-600 dark:text-gray-400 tabular-nums">
                              {formatCurrency(item.price)}
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-right font-bold text-xs text-gray-950 dark:text-white tabular-nums">
                              {formatCurrency(item.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="flex flex-col items-end pt-2 border-t dark:border-dark-700 space-y-1.5">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 w-52">
                  <span>Subtotal</span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(selectedArchiveView.total / 1.11)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 w-52">
                  <span>PPN (11%)</span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(
                      selectedArchiveView.total -
                        selectedArchiveView.total / 1.11,
                    )}
                  </span>
                </div>
                <div className="h-px bg-gray-200 dark:bg-dark-700 w-52 my-1" />
                <div className="flex justify-between items-center w-52">
                  <span className="text-xs font-bold text-gray-900 dark:text-white animate-pulse">
                    Total Invoice
                  </span>
                  <span className="text-base font-black text-[#1565C0] dark:text-blue-300 tabular-nums">
                    {formatCurrency(selectedArchiveView.total)}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4 gap-2 border-t pt-3 dark:border-dark-700">
              <button
                onClick={() =>
                  triggerNotification(
                    `Mendownload tanda terima arsip digital...`,
                  )
                }
                className="px-4 py-2 border border-gray-200 dark:border-dark-700 text-gray-750 dark:text-gray-300 text-xs font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-dark-900 flex items-center gap-1"
                title="Download PDF"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </button>
              <button
                onClick={() => setSelectedArchiveView(null)}
                className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold rounded-lg hover:opacity-90"
              >
                Tutup
              </button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

// ── Custom Info Icons to avoid direct HTML usages ───────────────────────────────
function CustomInfoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}
