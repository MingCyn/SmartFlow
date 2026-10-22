import { Link } from 'react-router-dom'
import { Droplet, AlertTriangle, ShieldCheck, ExternalLink, Clock, Calendar } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { AdviceCard } from '../components/AdviceCard'
import { useT } from '../i18n'
import { useSettings } from '../store/settings'

export default function WaterOutagePage() {
  const t = useT()
  const lang = useSettings((s) => s.lang)

  // --- MOCK SCHEDULED OUTAGE DATA (Real-world style notice) ---
  const scheduledOutage = {
    company: 'Pengurusan Air Selangor / Local Operator',
    title: lang === 'ms' ? 'Penyelenggaraan & Pembaikan Injap Berjadual' : 'Scheduled Valve Maintenance & Pipe Upgrades',
    startTime: '20 October 2026, 07:00 AM',
    endTime: '22 October 2026, 03:00 PM',
    status: 'active', // 'upcoming' | 'active' | 'resolved'
    affectedZones: ['Zone A1', 'Zone B2', 'Zone C1'],
    reason: lang === 'ms' 
      ? 'Kerja-kerja penggantian injap utama di loji agihan daerah serta pembersihan tangki simpanan komuniti.' 
      : 'Replacement of primary district distribution valves and routine community storage tank cleaning.',
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={lang === 'ms' ? 'Pengurusan & Bekalan Air' : 'Water Supply & Outage Management'}
        subtitle={lang === 'ms' ? 'Notifikasi rasmi gangguan berjadual dan pemantauan takungan.' : 'Official scheduled disruption notices and reservoir tracking.'}
      />

      {/* --- SCHEDULED OUTAGE NOTIFICATION BANNER (Real-world Style) --- */}
      <section className="rounded-2xl border-2 border-amber-300 bg-amber-50/70 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle aria-hidden className="size-7 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-200/60 px-2.5 py-1 rounded-full">
                {lang === 'ms' ? 'Notis Rasmi Syarikat Air' : 'Official Utility Notice'}
              </span>
              <span className="text-xs font-mono font-semibold text-amber-900">
                {scheduledOutage.company}
              </span>
            </div>

            <h2 className="mt-2 text-lg font-bold text-amber-950">
              {scheduledOutage.title}
            </h2>

            <p className="mt-1 text-sm text-amber-900 leading-relaxed">
              {scheduledOutage.reason}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 rounded-xl bg-white/80 p-3 border border-amber-200">
              <div className="flex items-center gap-2">
                <Calendar aria-hidden className="size-4 text-amber-700 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 font-medium">{lang === 'ms' ? 'Tempoh Gangguan' : 'Outage Window'}</p>
                  <p className="text-xs font-bold text-slate-900">
                    {scheduledOutage.startTime} <br />➔ {scheduledOutage.endTime}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock aria-hidden className="size-4 text-amber-700 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 font-medium">{lang === 'ms' ? 'Kawasan Terjejas' : 'Affected Zones'}</p>
                  <p className="text-xs font-bold text-slate-900">
                    {scheduledOutage.affectedZones.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community Backup Reserves Status */}
      <div className="grid gap-4 browser:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <ShieldCheck aria-hidden className="size-5 text-primary-700" />
            {lang === 'ms' ? 'Takungan Komuniti Semasa' : 'Current Community Buffer'}
          </h3>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            74% <span className="text-sm font-normal text-slate-600">({lang === 'ms' ? 'Menampung Paip Utama' : 'Bridging Main Line'})</span>
          </p>
          <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-amber-600 rounded-full" style={{ width: '74%' }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {lang === 'ms' ? 'Sistem beralih ke tangki takungan sandaran komuniti secara automatik.' : 'System automatically routing from secondary community backup tanks.'}
          </p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold text-blue-950">
              <Droplet aria-hidden className="size-5 text-blue-700" />
              {lang === 'ms' ? 'Anggaran Pemulihan Penuh' : 'Estimated Full Restoration'}
            </h3>
            <p className="mt-2 text-2xl font-extrabold text-blue-900">
              22 Oct, 3:00 PM
            </p>
          </div>
          <p className="mt-2 text-xs text-blue-900">
            {lang === 'ms' 
              ? 'Tekanan air berperingkat akan pulih 1 jam selepas jadual tamat.' 
              : 'Staged water pressure restoration begins 1 hour post-schedule.'}
          </p>
        </div>
      </div>

      {/* Emergency Action Plan */}
      <AdviceCard labelledBy="outage-action">
        <h3 id="outage-action" className="text-xl font-bold text-slate-900 mb-3">
          {lang === 'ms' ? 'Tindakan Penduduk Sepanjang Tempoh Notis' : 'Resident Action Checklist During Notice Period'}
        </h3>
        <ol className="list-decimal pl-5 space-y-2 text-slate-800">
          <li><strong>{lang === 'ms' ? 'Simpan bekalan awal:' : 'Store early buffer:'}</strong> {lang === 'ms' ? 'Isi bekas simpanan sebelum 20 Oktober jam 7:00 pagi.' : 'Fill storage containers before October 20 at 7:00 AM.'}</li>
          <li><strong>{lang === 'ms' ? 'Minima pembaziran:' : 'Minimize non-essential use:'}</strong> {lang === 'ms' ? 'Elakkan mencuci kenderaan atau menggunakan hos air luar.' : 'Avoid vehicle washing or running outdoor garden hoses.'}</li>
          <li><strong>{lang === 'ms' ? 'Tutup paip utama:' : 'Keep main taps closed:'}</strong> {lang === 'ms' ? 'Pastikan pili ditutup ketat untuk mengelakkan pembaziran apabila bekalan masuk semula.' : 'Ensure taps remain closed to prevent overflow when lines reactivate.'}</li>
        </ol>

        <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-sm text-slate-600">
            {lang === 'ms' ? 'Portal Rasmi Aduan & Semakan:' : 'Official Portal & Support:'}
          </span>
          <a
            href="https://www.airselangor.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-primary-700 hover:underline"
          >
            Air Selangor / Portal Negeri <ExternalLink aria-hidden className="size-4" />
          </a>
        </div>
      </AdviceCard>
    </div>
  )
}