import React, { useEffect, useState } from 'react';
import { getSupabase, formatMNT } from '../lib/supabase';
import { Product, ProductSale, ProductStockMovement, Employee } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import {
  Package,
  Plus,
  ShoppingCart,
  ArrowDownRight,
  ArrowUpRight,
  Edit2,
  Trash2,
  History,
  AlertCircle,
} from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const { role, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<ProductSale[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal: Add / Edit Product
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('ш');
  const [packageSize, setPackageSize] = useState('');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [initialStock, setInitialStock] = useState<number>(0);

  // Modal: Sell Product
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sellQuantity, setSellQuantity] = useState<number>(1);
  const [sellEmpId, setSellEmpId] = useState('');
  const [sellDate, setSellDate] = useState(new Date().toISOString().split('T')[0]);
  const [sellNotes, setSellNotes] = useState('');

  // Modal: Stock In / Adjustment
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockType, setStockType] = useState<'in' | 'damage' | 'adjustment'>('in');
  const [stockQty, setStockQty] = useState<number>(0);
  const [stockReason, setStockReason] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const [prodRes, saleRes, empRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase
          .from('product_sales')
          .select('*, product:products(*), employee:employees(*)')
          .order('created_at', { ascending: false }),
        supabase.from('employees').select('*').eq('is_active', true),
      ]);

      if (prodRes.data) setProducts(prodRes.data);
      if (saleRes.data) setSales(saleRes.data);
      if (empRes.data) setEmployees(empRes.data);
    } catch (err) {
      console.error('Products fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    const payload = {
      code,
      name,
      brand: brand || null,
      category,
      unit,
      package_size: packageSize || null,
      unit_price: Math.round(Number(unitPrice)), // whole MNT
      initial_stock: Number(initialStock) || 0,
      current_stock: editingProductId
        ? undefined
        : Number(initialStock) || 0,
    };

    if (editingProductId) {
      const { error } = await supabase
        .from('products')
        .update({
          code,
          name,
          brand: brand || null,
          category,
          unit,
          package_size: packageSize || null,
          unit_price: Math.round(Number(unitPrice)),
        })
        .eq('id', editingProductId);

      if (error) alert(`Алдаа: ${error.message}`);
    } else {
      const { error } = await supabase.from('products').insert([
        {
          ...payload,
          current_stock: Number(initialStock) || 0,
        },
      ]);
      if (error) alert(`Алдаа: ${error.message}`);
    }

    setIsProductModalOpen(false);
    setEditingProductId(null);
    setCode('');
    setName('');
    setBrand('');
    setCategory('');
    setUnitPrice(0);
    setInitialStock(0);
    fetchData();
  };

  const handleSellProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || sellQuantity <= 0) return;
    if (sellQuantity > selectedProduct.current_stock) {
      alert('Үлдэгдэл хүрэлцэхгүй байна!');
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    const total = Math.round(sellQuantity * Number(selectedProduct.unit_price));

    // 1. Insert product_sales
    const { error: saleErr } = await supabase.from('product_sales').insert([
      {
        product_id: selectedProduct.id,
        employee_id: sellEmpId,
        sale_date: sellDate,
        quantity: sellQuantity,
        unit_price: Number(selectedProduct.unit_price),
        total_amount: total,
        status: 'approved',
        notes: sellNotes || null,
      },
    ]);

    if (saleErr) {
      alert(`Алдаа: ${saleErr.message}`);
      return;
    }

    // 2. Decrement current_stock
    const newStock = Number(selectedProduct.current_stock) - Number(sellQuantity);
    await supabase
      .from('products')
      .update({ current_stock: newStock })
      .eq('id', selectedProduct.id);

    setIsSellModalOpen(false);
    setSelectedProduct(null);
    setSellQuantity(1);
    setSellNotes('');
    fetchData();
  };

  const handleStockMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockProduct || stockQty <= 0) return;
    const supabase = getSupabase();
    if (!supabase) return;

    let delta = stockType === 'in' ? Number(stockQty) : -Number(stockQty);
    const newStock = Math.max(0, Number(stockProduct.current_stock) + delta);

    // 1. Insert movement record
    await supabase.from('product_stock_movements').insert([
      {
        product_id: stockProduct.id,
        movement_type: stockType,
        quantity: stockQty,
        reason: stockReason || null,
        created_by: user?.id || null,
      },
    ]);

    // 2. Update product stock
    await supabase
      .from('products')
      .update({ current_stock: newStock })
      .eq('id', stockProduct.id);

    setIsStockModalOpen(false);
    setStockProduct(null);
    setStockQty(0);
    setStockReason('');
    fetchData();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Тос, нэмэлт бүтээгдэхүүн
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Бүтээгдэхүүний анхны үлдэгдэл, орлого/зарлага ба борлуулалтын тооцоо
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(role === 'admin' || role === 'manager') && (
            <button
              onClick={() => {
                setEditingProductId(null);
                setCode('');
                setName('');
                setBrand('');
                setCategory('');
                setUnitPrice(0);
                setInitialStock(0);
                setIsProductModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Шинэ бүтээгдэхүүн нэмэх</span>
            </button>
          )}
        </div>
      </div>

      {/* Products Grid / Table */}
      {products.length === 0 ? (
        <EmptyState
          title="Бүтээгдэхүүн бүртгэгдээгүй байна"
          description="ШТС дээр худалдаалагддаг тос, массла, цэвэрлэгч шингэн зэрэг бүтээгдэхүүнээ шинээр бүртгэнэ үү."
          actionText="Бүтээгдэхүүн нэмэх"
          onAction={() => setIsProductModalOpen(true)}
          icon={Package}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Код</th>
                <th className="py-3 px-4">Нэр & Брэнд</th>
                <th className="py-3 px-4">Төрөл</th>
                <th className="py-3 px-4">Нэгж үнэ</th>
                <th className="py-3 px-4">Эхний үлдэгдэл</th>
                <th className="py-3 px-4">Одоогийн үлдэгдэл</th>
                <th className="py-3 px-4 text-right">Үйлдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-400">{p.code}</td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-white block">{p.name}</span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      {p.brand || '-'} {p.package_size ? `· ${p.package_size}` : ''}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">{p.category}</td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                    {formatMNT(p.unit_price)}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">
                    {p.initial_stock} {p.unit}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-amber-300">
                    {p.current_stock} {p.unit}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedProduct(p);
                          setIsSellModalOpen(true);
                        }}
                        disabled={p.current_stock <= 0}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-40"
                      >
                        Борлуулах
                      </button>
                      <button
                        onClick={() => {
                          setStockProduct(p);
                          setIsStockModalOpen(true);
                        }}
                        className="px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                        title="Орлого/Зарлага"
                      >
                        Хөдөлгөөн
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sales Log */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Сүүлийн борлуулалтын жагсаалт
        </h3>

        {sales.length === 0 ? (
          <EmptyState
            title="Борлуулалт хийгдээгүй байна"
            description="Тос, нэмэлт бүтээгдэхүүний борлуулалтыг оруулснаар энд бодит дүнгээр нэгтгэгдэнэ."
            icon={ShoppingCart}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Огноо</th>
                  <th className="py-3 px-4">Бүтээгдэхүүн</th>
                  <th className="py-3 px-4">Тоо ширхэг</th>
                  <th className="py-3 px-4">Нэгж үнэ</th>
                  <th className="py-3 px-4">Нийт дүн</th>
                  <th className="py-3 px-4">Борлуулсан ажилтан</th>
                  <th className="py-3 px-4">Тайлбар</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-300">{s.sale_date}</td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {s.product?.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-300">
                      {s.quantity} {s.product?.unit}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {formatMNT(s.unit_price)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      {formatMNT(s.total_amount)}
                    </td>
                    <td className="py-3 px-4 text-slate-200">
                      {s.employee?.full_name || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{s.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add/Edit Product */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editingProductId ? 'Бүтээгдэхүүн засах' : 'Шинэ бүтээгдэхүүн нэмэх'}
      >
        <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Бүтээгдэхүүний код
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="OIL-001"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Брэнд / Үйлдвэрлэгч
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Жишээ: Mobil, Castrol"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Бүтээгдэхүүний нэр
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Жишээ: Mobil 1 5W-30 хөдөлгүүрийн тос"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Төрөл / Ангилал
              </label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Хөдөлгүүрийн тос"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Савлагааны хэмжээ
              </label>
              <input
                type="text"
                value={packageSize}
                onChange={(e) => setPackageSize(e.target.value)}
                placeholder="4L"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Нэгж
              </label>
              <input
                type="text"
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Нэгж үнэ (₮)
              </label>
              <input
                type="number"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(Math.round(Number(e.target.value)))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Анхны тоо
              </label>
              <input
                type="number"
                step="0.01"
                required
                disabled={Boolean(editingProductId)}
                value={initialStock}
                onChange={(e) => setInitialStock(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono disabled:opacity-50"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Бүтээгдэхүүн хадгалах
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Sell Product */}
      <Modal
        isOpen={isSellModalOpen}
        onClose={() => setIsSellModalOpen(false)}
        title={`Бүтээгдэхүүн борлуулах - ${selectedProduct?.name}`}
      >
        <form onSubmit={handleSellProduct} className="space-y-3.5 text-xs">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Нэгж үнэ:</span>
              <span className="font-bold font-mono text-emerald-400">
                {formatMNT(selectedProduct?.unit_price)}
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Бодит үлдэгдэл:</span>
              <span className="font-bold font-mono text-amber-300">
                {selectedProduct?.current_stock} {selectedProduct?.unit}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Борлуулсан огноо
              </label>
              <input
                type="date"
                required
                value={sellDate}
                onChange={(e) => setSellDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Борлуулсан тоо ({selectedProduct?.unit})
              </label>
              <input
                type="number"
                min="1"
                max={selectedProduct?.current_stock || 1}
                required
                value={sellQuantity}
                onChange={(e) => setSellQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-sm font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Борлуулсан ажилтан
            </label>
            <select
              required
              value={sellEmpId}
              onChange={(e) => setSellEmpId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            >
              <option value="">-- Ажилтан сонгох --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.employee_code})
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400">Нийт борлуулалтын дүн:</span>
            <span className="text-base font-bold font-mono text-emerald-400">
              {formatMNT(sellQuantity * (selectedProduct?.unit_price || 0))}
            </span>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Тайлбар
            </label>
            <input
              type="text"
              value={sellNotes}
              onChange={(e) => setSellNotes(e.target.value)}
              placeholder="Жишээ: Бэлнээр худалдан авав"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Борлуулалт баталгаажуулах
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Stock Movement */}
      <Modal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        title={`Үлдэгдлийн хөдөлгөөн - ${stockProduct?.name}`}
      >
        <form onSubmit={handleStockMovement} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Хөдөлгөөний төрөл
            </label>
            <select
              value={stockType}
              onChange={(e) => setStockType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            >
              <option value="in">Орлого (Татан авалт / Нэмэгдэх)</option>
              <option value="damage">Гэмтэл / Хорогдол (Хасагдах)</option>
              <option value="adjustment">Тооллогын зөрүү тохируулга</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Тоо хэмжээ ({stockProduct?.unit})
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={stockQty || ''}
              onChange={(e) => setStockQty(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Шалтгаан / Баримтын дугаар
            </label>
            <input
              type="text"
              required
              value={stockReason}
              onChange={(e) => setStockReason(e.target.value)}
              placeholder="Жишээ: Падан #402 татан авалт"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Хөдөлгөөн батлах
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
