import { CheckCircle2, Construction } from 'lucide-react';
export function ModuleOverview({ title, description, items }: { title: string; description: string; items: string[] }) {
  return <div className="page"><div className="page-heading"><div><p className="eyebrow">Modul lanjutan</p><h1>{title}</h1><p>{description}</p></div></div><section className="panel roadmap"><Construction aria-hidden="true"/><h2>Dalam tahap implementasi</h2><p>Struktur navigasi sudah tersedia. Operasi tulis belum diaktifkan agar tidak memberi kesan fitur siap sebelum alur data dan audit selesai.</p><ul>{items.map(item => <li key={item}><CheckCircle2 aria-hidden="true"/>{item}</li>)}</ul></section></div>;
}
