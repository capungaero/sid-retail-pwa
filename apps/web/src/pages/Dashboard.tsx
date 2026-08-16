import { ArrowRight, CircleDollarSign, PackageCheck, ReceiptText, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { money, number } from '../lib/money';

export function Dashboard() {
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">Sabtu, 15 Agustus 2026</p><h1>Ringkasan operasional</h1><p>Pantau aktivitas toko hari ini.</p></div><Link className="button primary" to="/pos">Buka kasir <ArrowRight /></Link></div>
    <section className="metric-grid" aria-label="Metrik hari ini">
      <article className="metric"><span className="metric-icon blue"><CircleDollarSign /></span><div><span>Penjualan hari ini</span><strong>{money.format(4287500)}</strong><small>124 transaksi</small></div></article>
      <article className="metric"><span className="metric-icon green"><ReceiptText /></span><div><span>Rata-rata transaksi</span><strong>{money.format(34577)}</strong><small>Naik 4,8% dari kemarin</small></div></article>
      <article className="metric"><span className="metric-icon amber"><TriangleAlert /></span><div><span>Stok perlu perhatian</span><strong>{number.format(17)} barang</strong><small>3 stok negatif</small></div></article>
      <article className="metric"><span className="metric-icon purple"><PackageCheck /></span><div><span>Pembelian tertunda</span><strong>4 PO</strong><small>2 jatuh tempo minggu ini</small></div></article>
    </section>
    <div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><h2>Aktivitas penjualan</h2><p>Per jam, hari ini</p></div><span className="status success">Aktif</span></div><div className="bar-chart" role="img" aria-label="Grafik transaksi per jam"><div style={{height:'22%'}}><span>08</span></div><div style={{height:'44%'}}><span>09</span></div><div style={{height:'68%'}}><span>10</span></div><div style={{height:'52%'}}><span>11</span></div><div style={{height:'82%'}}><span>12</span></div><div style={{height:'62%'}}><span>13</span></div><div style={{height:'92%'}}><span>14</span></div><div style={{height:'56%'}}><span>15</span></div></div></section>
      <section className="panel"><div className="panel-heading"><div><h2>Perlu tindakan</h2><p>Pengecualian operasional</p></div></div><ul className="action-list"><li><span className="dot red"/><div><strong>3 stok negatif</strong><span>Lakukan rekonsiliasi stok</span></div></li><li><span className="dot amber"/><div><strong>14 barang di bawah minimum</strong><span>Siapkan usulan pembelian</span></div></li><li><span className="dot blue"/><div><strong>2 piutang jatuh tempo</strong><span>Total {money.format(1250000)}</span></div></li></ul></section></div>
  </div>;
}
