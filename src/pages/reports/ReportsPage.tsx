import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatsCard } from "@/components/common/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Users,
  Download,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Filter,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// Mock data
const summaryStats = [
  {
    title: "Total Revenue",
    value: formatCurrency(124582500),
    change: "+18.2%",
    changeType: "positive" as const,
    icon: DollarSign,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-500/10",
  },
  {
    title: "Total Orders",
    value: "3,482",
    change: "+12.4%",
    changeType: "positive" as const,
    icon: ShoppingCart,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-500/10",
  },
  {
    title: "Avg Order Value",
    value: formatCurrency(357800),
    change: "+5.1%",
    changeType: "positive" as const,
    icon: TrendingUp,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-500/10",
  },
  {
    title: "New Customers",
    value: "487",
    change: "-3.2%",
    changeType: "negative" as const,
    icon: Users,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-500/10",
  },
];

type SaleData = {
  id: string;
  date: string;
  product: string;
  customer: string;
  quantity: number;
  amount: number;
  status: "completed" | "pending" | "refunded";
  paymentMethod: string;
  category: string;
};

const salesData: SaleData[] = [
  {
    id: "TXN-001",
    date: "2026-02-22",
    product: "Wireless Headphones",
    customer: "John Doe",
    quantity: 2,
    amount: 2999800,
    status: "completed",
    paymentMethod: "Credit Card",
    category: "Electronics",
  },
  {
    id: "TXN-002",
    date: "2026-02-22",
    product: "Smart Watch",
    customer: "Jane Smith",
    quantity: 1,
    amount: 3999900,
    status: "completed",
    paymentMethod: "PayPal",
    category: "Electronics",
  },
  {
    id: "TXN-003",
    date: "2026-02-21",
    product: "Laptop Stand",
    customer: "Bob Johnson",
    quantity: 3,
    amount: 1499700,
    status: "pending",
    paymentMethod: "Credit Card",
    category: "Accessories",
  },
  {
    id: "TXN-004",
    date: "2026-02-21",
    product: "USB-C Cable",
    customer: "Alice Brown",
    quantity: 5,
    amount: 999500,
    status: "completed",
    paymentMethod: "Debit Card",
    category: "Accessories",
  },
  {
    id: "TXN-005",
    date: "2026-02-21",
    product: "Phone Case",
    customer: "Charlie Wilson",
    quantity: 1,
    amount: 249900,
    status: "completed",
    paymentMethod: "Credit Card",
    category: "Accessories",
  },
  {
    id: "TXN-006",
    date: "2026-02-20",
    product: "Bluetooth Speaker",
    customer: "Diana Prince",
    quantity: 2,
    amount: 1799800,
    status: "refunded",
    paymentMethod: "PayPal",
    category: "Electronics",
  },
  {
    id: "TXN-007",
    date: "2026-02-20",
    product: "Wireless Mouse",
    customer: "Ethan Hunt",
    quantity: 4,
    amount: 1599600,
    status: "completed",
    paymentMethod: "Credit Card",
    category: "Accessories",
  },
  {
    id: "TXN-008",
    date: "2026-02-20",
    product: "Keyboard",
    customer: "Fiona Green",
    quantity: 1,
    amount: 1299900,
    status: "completed",
    paymentMethod: "Debit Card",
    category: "Accessories",
  },
  {
    id: "TXN-009",
    date: "2026-02-19",
    product: "Monitor",
    customer: "George Martin",
    quantity: 1,
    amount: 3499900,
    status: "completed",
    paymentMethod: "Credit Card",
    category: "Electronics",
  },
  {
    id: "TXN-010",
    date: "2026-02-19",
    product: "Webcam",
    customer: "Hannah Lee",
    quantity: 2,
    amount: 1999800,
    status: "pending",
    paymentMethod: "PayPal",
    category: "Electronics",
  },
];

type SortField = keyof SaleData;
type SortOrder = "asc" | "desc";

interface SortIconProps {
  field: SortField;
  sortField: SortField;
  sortOrder: SortOrder;
}

const SortIcon = ({ field, sortField, sortOrder }: SortIconProps) => {
  if (sortField !== field)
    return <ArrowUpDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />;
  return sortOrder === "asc" ? (
    <ArrowUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
  ) : (
    <ArrowDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
  );
};

export function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Filter and sort data
  const filteredData = salesData
    .filter((item) => {
      const matchesSearch =
        item.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed:
        "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30",
      pending:
        "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/30",
      refunded:
        "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30",
    };

    return (
      <Badge
        variant="outline"
        className={`font-medium capitalize ${
          variants[status as keyof typeof variants]
        }`}
      >
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header - FIXED */}
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive sales reports and business insights."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2 border-gray-300 dark:border-dark-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-800"
            >
              <Calendar className="h-4 w-4" />
              <span>Date Range</span>
            </Button>
            <Button className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white">
              <Download className="h-4 w-4" />
              <span>Export Report</span>
            </Button>
          </div>
        }
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryStats.map((stat) => (
          <StatsCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            changeType={stat.changeType}
            icon={stat.icon}
            iconColor={stat.color}
            iconBgColor={stat.bgColor}
          />
        ))}
      </div>

      {/* Sales Data Table - COMPLETELY FIXED */}
      <Card className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 shadow-xl">
        <CardHeader className="p-0 border-b border-gray-100 dark:border-dark-700 bg-gray-50 dark:bg-dark-850">
          <div className="px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                  Sales Transactions
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Showing {filteredData.length} of {salesData.length}{" "}
                  transactions
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 dark:border-dark-700">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <Input
                  type="search"
                  placeholder="Search by product, customer, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40 bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600 text-gray-900 dark:text-white">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <SelectValue placeholder="Status" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-dark-800 border-gray-200 dark:border-dark-700">
                  <SelectItem
                    value="all"
                    className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-700"
                  >
                    All Status
                  </SelectItem>
                  <SelectItem
                    value="completed"
                    className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-700"
                  >
                    Completed
                  </SelectItem>
                  <SelectItem
                    value="pending"
                    className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-700"
                  >
                    Pending
                  </SelectItem>
                  <SelectItem
                    value="refunded"
                    className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-700"
                  >
                    Refunded
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-40 bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600 text-gray-900 dark:text-white">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <SelectValue placeholder="Category" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-dark-800 border-gray-200 dark:border-dark-700">
                  <SelectItem
                    value="all"
                    className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-700"
                  >
                    All Categories
                  </SelectItem>
                  <SelectItem
                    value="Electronics"
                    className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-700"
                  >
                    Electronics
                  </SelectItem>
                  <SelectItem
                    value="Accessories"
                    className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-700"
                  >
                    Accessories
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-dark-850 hover:bg-gray-50 dark:hover:bg-dark-850 border-b border-gray-200 dark:border-dark-700">
                  <TableHead className="h-12 px-4">
                    <div
                      className="flex items-center gap-2 cursor-pointer select-none"
                      onClick={() => handleSort("id")}
                    >
                      <span className="text-gray-900 dark:text-white font-semibold text-sm">
                        Transaction ID
                      </span>
                      <SortIcon
                        field="id"
                        sortField={sortField}
                        sortOrder={sortOrder}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="h-12 px-4">
                    <div
                      className="flex items-center gap-2 cursor-pointer select-none"
                      onClick={() => handleSort("date")}
                    >
                      <span className="text-gray-900 dark:text-white font-semibold text-sm">
                        Date
                      </span>
                      <SortIcon
                        field="date"
                        sortField={sortField}
                        sortOrder={sortOrder}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="h-12 px-4">
                    <div
                      className="flex items-center gap-2 cursor-pointer select-none"
                      onClick={() => handleSort("product")}
                    >
                      <span className="text-gray-900 dark:text-white font-semibold text-sm">
                        Product
                      </span>
                      <SortIcon
                        field="product"
                        sortField={sortField}
                        sortOrder={sortOrder}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="h-12 px-4">
                    <div
                      className="flex items-center gap-2 cursor-pointer select-none"
                      onClick={() => handleSort("customer")}
                    >
                      <span className="text-gray-900 dark:text-white font-semibold text-sm">
                        Customer
                      </span>
                      <SortIcon
                        field="customer"
                        sortField={sortField}
                        sortOrder={sortOrder}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="h-12 px-4 text-right">
                    <div
                      className="flex items-center gap-2 cursor-pointer select-none justify-end"
                      onClick={() => handleSort("quantity")}
                    >
                      <span className="text-gray-900 dark:text-white font-semibold text-sm">
                        Qty
                      </span>
                      <SortIcon
                        field="quantity"
                        sortField={sortField}
                        sortOrder={sortOrder}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="h-12 px-4 text-right">
                    <div
                      className="flex items-center gap-2 cursor-pointer select-none justify-end"
                      onClick={() => handleSort("amount")}
                    >
                      <span className="text-gray-900 dark:text-white font-semibold text-sm">
                        Amount
                      </span>
                      <SortIcon
                        field="amount"
                        sortField={sortField}
                        sortOrder={sortOrder}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="h-12 px-4">
                    <span className="text-gray-900 dark:text-white font-semibold text-sm">
                      Status
                    </span>
                  </TableHead>
                  <TableHead className="h-12 px-4">
                    <span className="text-gray-900 dark:text-white font-semibold text-sm">
                      Payment
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-32 text-center text-gray-500 dark:text-gray-400"
                    >
                      No transactions found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((sale) => (
                    <TableRow
                      key={sale.id}
                      className="border-b border-gray-100 dark:border-dark-700 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-colors"
                    >
                      <TableCell className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400 px-4 py-4">
                        {sale.id}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700 dark:text-gray-300 px-4 py-4">
                        {new Date(sale.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {sale.product}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {sale.category}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-700 dark:text-gray-300 px-4 py-4">
                        {sale.customer}
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-900 dark:text-white px-4 py-4">
                        {sale.quantity}
                      </TableCell>
                      <TableCell className="text-right font-bold text-gray-900 dark:text-white px-4 py-4">
                        {formatCurrency(sale.amount)}
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        {getStatusBadge(sale.status)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700 dark:text-gray-300 px-4 py-4">
                        {sale.paymentMethod}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
