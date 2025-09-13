// @ts-nocheck
import React, { useMemo, useState } from "react";
import { fmtMoney, VAT_RATES } from "./../utils";

type Invoice = {
  id: string;
  series?: string;
  number?: number;
  date: string;            // "YYYY-MM-DD"
  state?: string;          // "emitida", "borrador"...
  isExempt?: boolean;
  customerId?: string;
  customer?: { id: string; name?: string; };
  lines: Array<{
    qty: number;
    price: number;
    dtopct?: number;
    vat?: string;          // p.ej. "iva21"
    irpfpct?: number;      // p.ej. 15 (-> 15%)
  }>;
};

function parseRateFromCode(code?: string): number {
  if (!code) return 0;
  const v = (VAT_RATES && (VAT_RATES as any)[code]);
  if (typeof v === "number") return v;                 // p.ej. 0.21
  if (v && typeof v === "object" && typeof v.rate === "number") return v.rate;
  const n = Number(String(code).replace(/[^\d.]/g, "")); // "iva21" -> 21
  return isFinite(n) ? n / 100 : 0;
}

function ym(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }
function toDate(s: string) { return new Date(s); }
function quarterOf(d: Date) { return Math.floor(d.getMonth() / 3) + 1; }
function quarterRange(year: number, q: number) {
  const start = new Date(year, (q-1)*3, 1);
  const end = new Date(year, (q-1)*3 + 3, 1); // exclusivo
  return { start, end };
}

function calcInvoiceTaxes(inv: Invoice) {
  let base = 0, iva = 0, irpf = 0;
  const byVat: Record<string, { base:number; iva:number; rate:number }> = {};
  const exempt = !!inv.isExempt;

  for (const ln of inv.lines || []) {
    const qty = Number(ln.qty || 0);
    const price = Number(ln.price || 0);
    const dto = Number(ln.dtopct || 0) / 100;
    const b = qty * price * (1 - dto);
    base += b;

    const rate = exempt ? 0 : parseRateFromCode(ln.vat);
    const ivaLine = b * rate;
    iva += ivaLine;

    const irpfLine = b * (Number(ln.irpfpct || 0) / 100);
    irpf += irpfLine;

    const key = exempt ? "exento" : (ln.vat || "iva0");
    if (!byVat[key]) byVat[key] = { base: 0, iva: 0, rate };
    byVat[key].base += b; byVat[key].iva += ivaLine;
  }

  const total = base + iva - irpf; // IRPF es retención
  return { base, iva, irpf, total, byVat };
}

export default function ResumenFiscal({
  invoices,
  customers,
}: {
  invoices: Invoice[];
  customers: Array<{ id: string; name?: string }>;
}) {
  const years = useMemo(() => {
    const ys = new Set<number>();
    (invoices || []).forEach(i => { if (i?.date) ys.add(new Date(i.date).getFullYear()); });
    return Array.from(ys).sort((a,b)=>a-b);
  }, [invoices]);

  const currentYear = (years[years.length-1] || new Date().getFullYear());
  const [year, setYear] = useState<number>(currentYear);
  const [quarter, setQuarter] = useState<0|1|2|3|4>(0); // 0 = anual
  const [customerId, setCustomerId] = useState<string>("");

  const filtered = useMemo(() => {
    const src = (invoices || []).filter(i => i?.state !== "borrador"); // solo no-borrador
    const { start, end } = quarter ? quarterRange(year, quarter) : { start: new Date(year,0,1), end: new Date(year+1,0,1) };
    return src.filter(i => {
      const d = toDate(i.date);
      return d >= start && d < end && (!customerId || customerId === (i.customerId || i.customer?.id));
    });
  }, [invoices, year, quarter, customerId]);

  const computed = useMemo(() => {
    const months = new Map<string, { base:number; iva:number; irpf:number; total:number; count:number }>();
    const byClient = new Map<string, { name:string; base:number; iva:number; irpf:number; total:number; count:number }>();
    const byVatAgg: Record<string, { base:number; iva:number; rate:number }> = {};

    let S = { base:0, iva:0, irpf:0, total:0, count:0 };

    for (const inv of filtered) {
      const d = toDate(inv.date);
      const m = ym(d);
      const { base, iva, irpf, total, byVat } = calcInvoiceTaxes(inv);

      // global
      S.base += base; S.iva += iva; S.irpf += irpf; S.total += total; S.count++;

      // por mes
      if (!months.has(m)) months.set(m, { base:0, iva:0, irpf:0, total:0, count:0 });
      const mm = months.get(m)!; mm.base+=base; mm.iva+=iva; mm.irpf+=irpf; mm.total+=total; mm.count++;

      // por cliente
      const cid = inv.customerId || inv.customer?.id || "NC";
      const cname = customers.find(c => c.id===cid)?.name || "Sin nombre";
      if (!byClient.has(cid)) byClient.set(cid, { name:cname, base:0, iva:0, irpf:0, total:0, count:0 });
      const bc = byClient.get(cid)!; bc.base+=base; bc.iva+=iva; bc.irpf+=irpf; bc.total+=total; bc.count++;

      // por tipo de IVA
      for (const [k,v] of Object.entries(byVat)) {
        if (!byVatAgg[k]) byVatAgg[k] = { base:0, iva:0, rate:v.rate };
        byVatAgg[k].base += v.base; byVatAgg[k].iva += v.iva;
      }
    }

    // ordenar meses
    const monthsSorted = Array.from(months.entries()).sort((a,b)=> a[0]<b[0] ? -1:1);

    return { summary:S, months:monthsSorted, byClient, byVatAgg };
  }, [filtered, customers]);

  function exportCSV() {
    const rows = [
      ["Fecha", "Serie-Número", "Cliente", "Base", "IVA", "IRPF", "Total"],
    ];
    for (const inv of filtered) {
      const { base, iva, irpf, total } = calcInvoiceTaxes(inv);
      const d = inv.date;
      const num = `${inv.series || ""}-${inv.number ?? ""}`;
      const cid = inv.customerId || inv.customer?.id;
      const cname = customers.find(c=>c.id===cid)?.name || "";
      rows.push([d, num, cname, base.toFixed(2), iva.toFixed(2), irpf.toFixed(2), total.toFixed(2)]);
    }
    const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `resumen_fiscal_${year}${quarter?`_Q${quarter}`:""}.csv`;
    a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 1000);
  }

  const { summary, months, byClient, byVatAgg } = computed;

  return (
    <div className="p-3 space-y-4">
      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <label>Año</label>
        <select value={year} onChange={e=>setYear(Number(e.target.value))} className="border px-2 py-1 rounded">
          {[...new Set([ ...years, new Date().getFullYear() ])].sort().map(y=>(
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <label>Periodo</label>
        <select value={quarter} onChange={e=>setQuarter(Number(e.target.value) as any)} className="border px-2 py-1 rounded">
          <option value={0}>Año completo</option>
          <option value={1}>Trimestre 1 (Ene–Mar)</option>
          <option value={2}>Trimestre 2 (Abr–Jun)</option>
          <option value={3}>Trimestre 3 (Jul–Sep)</option>
          <option value={4}>Trimestre 4 (Oct–Dic)</option>
        </select>

        <label>Cliente</label>
        <select value={customerId} onChange={e=>setCustomerId(e.target.value)} className="border px-2 py-1 rounded">
          <option value="">Todos</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name || c.id}</option>)}
        </select>

        <button onClick={exportCSV} className="ml-auto px-3 py-1 border rounded">Exportar CSV</button>
      </div>

      {/* Resumen periodo */}
      <div className="border rounded p-3">
        <div className="font-semibold mb-2">Resumen del periodo</div>
        <div className="grid grid-cols-5 gap-4">
          <div><div className="text-sm text-gray-600">Facturas</div><div className="text-lg">{summary.count}</div></div>
          <div><div className="text-sm text-gray-600">Base imponible</div><div className="text-lg">{fmtMoney(summary.base)}</div></div>
          <div><div className="text-sm text-gray-600">IVA</div><div className="text-lg">{fmtMoney(summary.iva)}</div></div>
          <div><div className="text-sm text-gray-600">IRPF</div><div className="text-lg">-{fmtMoney(summary.irpf)}</div></div>
          <div><div className="text-sm text-gray-600">TOTAL</div><div className="text-lg">{fmtMoney(summary.total)}</div></div>
        </div>
      </div>

      {/* Por tipo de IVA */}
      <div className="border rounded p-3">
        <div className="font-semibold mb-2">Detalle por tipo de IVA</div>
        <table className="w-full border-collapse">
          <thead><tr><th className="text-left border-b p-1">Tipo</th><th className="text-right border-b p-1">Base</th><th className="text-right border-b p-1">IVA</th></tr></thead>
          <tbody>
            {Object.entries(byVatAgg).map(([k,v])=>(
              <tr key={k}>
                <td className="p-1">{k === "exento" ? "Exento" : `${Math.round(v.rate*100)}% (${k})`}</td>
                <td className="p-1 text-right">{fmtMoney(v.base)}</td>
                <td className="p-1 text-right">{fmtMoney(v.iva)}</td>
              </tr>
            ))}
            {Object.keys(byVatAgg).length === 0 && <tr><td colSpan={3} className="p-2 text-center text-sm text-gray-500">Sin IVA en el periodo</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Por mes */}
      <div className="border rounded p-3">
        <div className="font-semibold mb-2">Acumulado por mes</div>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left border-b p-1">Mes</th>
              <th className="text-right border-b p-1">Facturas</th>
              <th className="text-right border-b p-1">Base</th>
              <th className="text-right border-b p-1">IVA</th>
              <th className="text-right border-b p-1">IRPF</th>
              <th className="text-right border-b p-1">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {months.map(([m, v])=>(
              <tr key={m}>
                <td className="p-1">{m}</td>
                <td className="p-1 text-right">{v.count}</td>
                <td className="p-1 text-right">{fmtMoney(v.base)}</td>
                <td className="p-1 text-right">{fmtMoney(v.iva)}</td>
                <td className="p-1 text-right">-{fmtMoney(v.irpf)}</td>
                <td className="p-1 text-right">{fmtMoney(v.total)}</td>
              </tr>
            ))}
            {months.length === 0 && <tr><td colSpan={6} className="p-2 text-center text-sm text-gray-500">No hay datos</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Por cliente */}
      <div className="border rounded p-3">
        <div className="font-semibold mb-2">Acumulado por cliente</div>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left border-b p-1">Cliente</th>
              <th className="text-right border-b p-1">Facturas</th>
              <th className="text-right border-b p-1">Base</th>
              <th className="text-right border-b p-1">IVA</th>
              <th className="text-right border-b p-1">IRPF</th>
              <th className="text-right border-b p-1">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(byClient.entries()).map(([cid, v])=>(
              <tr key={cid}>
                <td className="p-1">{v.name}</td>
                <td className="p-1 text-right">{v.count}</td>
                <td className="p-1 text-right">{fmtMoney(v.base)}</td>
                <td className="p-1 text-right">{fmtMoney(v.iva)}</td>
                <td className="p-1 text-right">-{fmtMoney(v.irpf)}</td>
                <td className="p-1 text-right">{fmtMoney(v.total)}</td>
              </tr>
            ))}
            {byClient.size === 0 && <tr><td colSpan={6} className="p-2 text-center text-sm text-gray-500">No hay datos</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
