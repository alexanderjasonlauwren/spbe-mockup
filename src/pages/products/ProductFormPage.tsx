import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, Upload, X } from "lucide-react";

const productSchema = z.object({
  name: z.string().min(1, "Nama produk harus diisi"),
  sku: z.string().min(1, "SKU harus diisi"),
  category: z.string().min(1, "Kategori harus dipilih"),
  price: z.number().min(0, "Harga harus lebih dari 0"),
  stock: z.number().int().min(0, "Stok tidak boleh negatif"),
  description: z.string().optional(),
  status: z.enum(["active", "draft", "archived"]),
});

type ProductFormData = z.infer<typeof productSchema>;

export function ProductFormPage() {
  const navigate = useNavigate();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      status: "active",
      stock: 0,
      price: 0,
    },
  });

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    try {
      // TODO: Replace with actual API call
      console.log("Product data:", data);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

      // Show success message (you can use toast here)
      alert("Produk berhasil ditambahkan!");
      navigate("/products");
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Gagal menyimpan produk");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStatusChange = (value: string) => {
    if (value === "active" || value === "draft" || value === "archived") {
      setValue("status", value);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Tambah Produk Baru"
        description="Isi formulir di bawah untuk menambahkan produk baru ke inventori."
        actions={
          <Button
            variant="outline"
            onClick={() => navigate("/products")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card className="dark:bg-gray-800/50 dark:border-gray-700">
          <CardHeader className="border-b dark:border-gray-700">
            <CardTitle className="dark:text-white">Informasi Dasar</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="dark:text-gray-200">
                  Nama Produk <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="Contoh: Sepatu Sneakers"
                  className="dark:bg-gray-900 dark:border-gray-600"
                />
                {errors.name && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku" className="dark:text-gray-200">
                  SKU <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sku"
                  {...register("sku")}
                  placeholder="Contoh: SNK-001"
                  className="dark:bg-gray-900 dark:border-gray-600"
                />
                {errors.sku && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errors.sku.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="dark:text-gray-200">
                Deskripsi
              </Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Deskripsi produk..."
                rows={4}
                className="dark:bg-gray-900 dark:border-gray-600"
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Inventory */}
        <Card className="dark:bg-gray-800/50 dark:border-gray-700">
          <CardHeader className="border-b dark:border-gray-700">
            <CardTitle className="dark:text-white">Harga & Inventori</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price" className="dark:text-gray-200">
                  Harga (Rp) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  {...register("price", { valueAsNumber: true })}
                  placeholder="100000"
                  className="dark:bg-gray-900 dark:border-gray-600"
                />
                {errors.price && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errors.price.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock" className="dark:text-gray-200">
                  Stok <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="stock"
                  type="number"
                  {...register("stock", { valueAsNumber: true })}
                  placeholder="50"
                  className="dark:bg-gray-900 dark:border-gray-600"
                />
                {errors.stock && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errors.stock.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="dark:text-gray-200">
                  Kategori <span className="text-red-500">*</span>
                </Label>
                <Select onValueChange={(value) => setValue("category", value)}>
                  <SelectTrigger className="dark:bg-gray-900 dark:border-gray-600">
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="fashion">Fashion</SelectItem>
                    <SelectItem value="home">Home</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="books">Books</SelectItem>
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errors.category.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="dark:text-gray-200">
                Status
              </Label>
              <Select defaultValue="active" onValueChange={handleStatusChange}>
                <SelectTrigger className="dark:bg-gray-900 dark:border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Product Image */}
        <Card className="dark:bg-gray-800/50 dark:border-gray-700">
          <CardHeader className="border-b dark:border-gray-700">
            <CardTitle className="dark:text-white">Gambar Produk</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {imagePreview ? (
                <div className="relative w-full h-64 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => setImagePreview(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-10 h-10 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">Klik untuk upload</span>{" "}
                      atau drag and drop
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      PNG, JPG atau JPEG (MAX. 2MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/products")}
          >
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            <Save className="h-4 w-4" />
            {isSubmitting ? "Menyimpan..." : "Simpan Produk"}
          </Button>
        </div>
      </form>
    </div>
  );
}
