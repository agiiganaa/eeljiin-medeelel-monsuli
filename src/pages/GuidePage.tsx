import React, { useState } from 'react';
import {
  BookOpen,
  Copy,
  Check,
  Database,
  ShieldCheck,
  Fuel,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  Settings,
  Layers,
  HelpCircle,
} from 'lucide-react';

export const GuidePage: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopySql = () => {
    fetch('/supabase_schema.sql')
      .then((res) => res.text())
      .then((text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      })
      .catch(() => {
        // Fallback schema text
        navigator.clipboard.writeText(`-- ШТС Supabase PostgreSQL Schema\n-- supabase_schema.sql файлын агуулга`);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Title */}
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-amber-400" />
          <span>Системийн гарын авлага & Ашиглалтын заавар</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Монгол Улсын ШТС-ийн үйл ажиллагааг удирдах алхамчилсан практик зааварчилгаа
        </p>
      </div>

      {/* Section 1: Supabase setup and migration */}
      <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">
              Алхам 1: Supabase өгөгдлийн санг холбох & SQL Схем үүсгэх
            </h3>
          </div>
          <button
            onClick={handleCopySql}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'SQL Хуулагдлаа!' : 'SQL Схем хуулах'}</span>
          </button>
        </div>

        <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
          <p>
            1. <strong>Supabase төсөл үүсгэх:</strong>{' '}
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 underline"
            >
              supabase.com
            </a>{' '}
            хаягаар орж шинэ төсөл үүсгэнэ.
          </p>
          <p>
            2. <strong>SQL ажиллуулах:</strong> Supabase Dashboard-ын зүүн цэснээс{' '}
            <strong>SQL Editor</strong>-ийг сонгоод, дээрх <strong>"SQL Схем хуулах"</strong>{' '}
            товчоор авсан бүх кодыг буулган <strong>Run</strong> дарна. Энэ нь 28 хүснэгт, RLS бодлогууд, индексүүдийг үүсгэнэ.
          </p>
          <p>
            3. <strong>Холболт тохируулах:</strong> Системийн дээд самбарын{' '}
            <strong>"Supabase тохируулах"</strong> товч эсвэл <strong>"17. Админ тохиргоо"</strong>{' '}
            цэс рүү орж өөрийн Project URL болон Anon Key-г оруулаад "Хадгалах & Шалгах" дарна.
          </p>
        </div>
      </div>

      {/* Section 2: Initial Station Setup */}
      <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-sky-400" />
          <h3 className="text-sm font-bold text-white">
            Алхам 2: Анхны тохиргоо ба суурь мэдээлэл бүртгэх
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="font-bold text-white block mb-1">1. Шатахууны төрөл & Үнэ</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              "Админ тохиргоо" болон "Шатахууны борлуулалт" цэснээс А-92, А-95, ДТ зэрэг төрлүүдийг нэмж, тухайн өдрийн хүчинтэй литрийн үнийг (бүхэл төгрөгөөр) бүртгэнэ.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="font-bold text-white block mb-1">2. Сав & Хошуу бүртгэх</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              "Савны бүртгэл" цэснээс газар доорх нөөцийн сав, аюулгүйн босго литрийг тохируулж, "Шатахууны борлуулалт" хэсгээс түгээх хошуунуудыг эхний миллийн заалттай нь холбоно.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="font-bold text-white block mb-1">3. Ажилтнууд & Ээлжийн загвар</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              "Ажилтнууд" цэснээс түгээгч, эрхлэгч нарыг нэмж цагийн хөлсийг тохируулна. "Ээлжийн хуваарь" цэснээс 24 цагийн (09:00–09:00) эсвэл 12 цагийн ээлжийн загвар сонгон ажилтнаа томилно.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="font-bold text-white block mb-1">4. POS төхөөрөмж & Данс</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              "POS төхөөрөмжийн тооцоо" болон "Банкны дансны тооцоо" цэснээс банкны данс, карт уншигч POS төхөөрөмжүүдээ TID дугаартай нь бүртгэнэ.
            </p>
          </div>
        </div>
      </div>

      {/* Section 3: Daily Shift Workflow */}
      <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5">
          <Fuel className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">
            Алхам 3: Өдөр тутмын ээлжийн үйл ажиллагааны дараалал
          </h3>
        </div>

        <div className="space-y-3 text-xs text-slate-300">
          <div className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
              1
            </span>
            <div>
              <strong className="text-white">Ирэхэд:</strong> "3. Цагийн бүртгэл" цэсээр бодит ирсэн цагаа бүртгүүлнэ. Савны түвшинг шалгаж "7. Мастшапын хэмжилт"-ээр шугамын өндрийг оруулна.
            </div>
          </div>

          <div className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
              2
            </span>
            <div>
              <strong className="text-white">Ээлжийн дундуур:</strong> Тос, массла худалдвал "8. Тос, нэмэлт бүтээгдэхүүн" цэсээр борлуулсан тоог бүртгэнэ. Үлдэгдэл шууд хасагдана.
            </div>
          </div>

          <div className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
              3
            </span>
            <div>
              <strong className="text-white">Ээлж дуусахад:</strong> "5. Шатахууны борлуулалт" цэснээс хошуу бүрийн эцсийн миллийг оруулахад зарагдсан литр ба борлуулалтын дүн шууд бодогдоно.
            </div>
          </div>

          <div className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
              4
            </span>
            <div>
              <strong className="text-white">Төлбөрийн тулгалт:</strong> "9. POS тооцоо" (карт), "10. Банкны тооцоо" (QPay/Данс), "11. Бэлэн мөнгөний тооцоо" (касс тоолох)-оор тус тус зөрүүг шалгана.
            </div>
          </div>

          <div className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
              5
            </span>
            <div>
              <strong className="text-white">Хүлээлцэх & Эрхлэгчид тушаах:</strong> "12. Ээлж хүлээлцэх" ба "13. Эрхлэгчид мөнгө өгөх" цэсүүдээр орлогоо хүлээлгэн өгч хоёр талын баталгаажуулалт хийнэ.
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Payroll and Reporting Rules */}
      <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5">
          <Banknote className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-bold text-white">
            Алхам 4: Цалин бодолт ба Тайлангийн дүрэм
          </h3>
        </div>

        <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
          <p>
            • <strong>Баталгаажсан цаг:</strong> Зөвхөн эрхлэгч/админы баталсан "approved" төлөвтэй цагийн бүртгэлийг систем цалин бодохдоо нэгтгэнэ.
          </p>
          <p>
            • <strong>Цалингийн мөчлөг:</strong> Сар бүрийн 18-нд тооцоог тасалж, 25-нд үндсэн олголт, дараа сарын 10-нд үлдэгдлийг олгоно (тохиргооноос өөрчлөх боломжтой).
          </p>
          <p>
            • <strong>CSV экспорт ба хэвлэх:</strong> "14. Тайлан" цэснээс хүссэн хугацааны борлуулалт, кассын зөрүү, ээлж хүлээлцэлтийн баримтыг CSV форматаар татаж авч эсвэл шууд хэвлэх боломжтой.
          </p>
        </div>
      </div>
    </div>
  );
};
