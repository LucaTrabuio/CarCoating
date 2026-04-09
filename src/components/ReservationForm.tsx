'use client';

import { useState, useEffect, useCallback } from 'react';
import type { V3StoreData } from '@/lib/v3-types';
import type { ReservationChoice, SlotAvailability } from '@/lib/reservation-types';
import { coatingTiers } from '@/data/coating-tiers';
import { trackEvent } from '@/lib/track';

const DEFAULT_OPTIONS = [
  { id: 'hydrophilic-wheel', name: 'ホイール親水ガラスコーティング' },
  { id: 'iron-remover', name: 'アイアンバスター' },
  { id: 'polymer-wheel', name: 'ポリマーホイールコーティング' },
  { id: 'under-coat', name: '下廻りコーティング' },
  { id: 'wheel-clean', name: 'ホイールクリーニング' },
  { id: 'disinfect', name: '車内除菌抗菌' },
];

interface Props {
  store: V3StoreData;
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export default function ReservationForm({ store }: Props) {
  const storeId = store.store_id;
  const [step, setStep] = useState<'dates' | 'info' | 'done'>('dates');
  const [choices, setChoices] = useState<(ReservationChoice | null)[]>([null, null, null]);
  const [currentChoice, setCurrentChoice] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<SlotAvailability[]>([]);
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Selected services
  const [coatings, setCoatings] = useState<string[]>(['']);
  const [options, setOptions] = useState<string[]>([]);

  // Fetch available dates for the month
  const fetchDates = useCallback(async () => {
    setLoadingDates(true);
    try {
      const monthStr = `${calMonth.year}-${String(calMonth.month).padStart(2, '0')}`;
      const res = await fetch(`/api/slots?store=${storeId}&month=${monthStr}`);
      const data = await res.json();
      setAvailableDates(data.dates || []);
    } catch { setAvailableDates([]); }
    setLoadingDates(false);
  }, [storeId, calMonth]);

  useEffect(() => { fetchDates(); }, [fetchDates]);

  // Fetch slots for selected date
  useEffect(() => {
    if (!selectedDate) { setAvailableSlots([]); return; }
    setLoadingSlots(true);
    fetch(`/api/slots?store=${storeId}&date=${selectedDate}`)
      .then(r => r.json())
      .then(data => setAvailableSlots(data.slots || []))
      .catch(() => setAvailableSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [storeId, selectedDate]);

  function selectSlot(time: string) {
    if (!selectedDate) return;
    const newChoices = [...choices];
    newChoices[currentChoice] = { date: selectedDate, time };
    setChoices(newChoices);

    if (currentChoice < 2) {
      setCurrentChoice(currentChoice + 1);
      setSelectedDate(null);
    }
  }

  function allChoicesComplete() {
    return choices.every(c => c !== null);
  }

  function formatChoice(c: ReservationChoice | null) {
    if (!c) return '未選択';
    const d = new Date(c.date + 'T00:00:00+09:00');
    return `${c.date}（${DAY_LABELS[d.getDay()]}）${c.time}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allChoicesComplete()) return;
    setSubmitting(true);
    setError('');

    // Build service summary to include in notes
    const selectedCoatings = coatings.filter(Boolean).map(id => {
      const t = coatingTiers.find(t => t.id === id);
      return t ? t.name : id;
    });
    const selectedOptions = options.map(id => {
      const o = DEFAULT_OPTIONS.find(o => o.id === id);
      return o ? o.name : id;
    });
    const serviceSummary = [
      selectedCoatings.length > 0 ? `【コース】${selectedCoatings.join(', ')}` : '',
      selectedOptions.length > 0 ? `【オプション】${selectedOptions.join(', ')}` : '',
    ].filter(Boolean).join('\n');
    const fullNotes = [serviceSummary, notes].filter(Boolean).join('\n\n');

    try {
      const res = await fetch('/api/reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'visit',
          storeId,
          choices: choices.filter(Boolean),
          name, phone, email,
          notes: fullNotes,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      trackEvent(storeId, 'booking');
      setStep('done');
    } catch {
      setError('予約の送信に失敗しました。もう一度お試しください。');
    }
    setSubmitting(false);
  }

  // Calendar rendering
  const daysInMonth = new Date(calMonth.year, calMonth.month, 0).getDate();
  const firstDay = new Date(calMonth.year, calMonth.month - 1, 1).getDay();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${calMonth.year}-${String(calMonth.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { day, dateStr, available: availableDates.includes(dateStr) };
  });

  function prevMonth() {
    setCalMonth(prev => prev.month === 1 ? { year: prev.year - 1, month: 12 } : { year: prev.year, month: prev.month - 1 });
    setSelectedDate(null);
  }
  function nextMonth() {
    setCalMonth(prev => prev.month === 12 ? { year: prev.year + 1, month: 1 } : { year: prev.year, month: prev.month + 1 });
    setSelectedDate(null);
  }

  if (step === 'done') {
    return (
      <div className="py-20 px-5 text-center">
        <div className="max-w-[500px] mx-auto">
          <div className="text-5xl mb-4">&#10003;</div>
          <h2 className="text-2xl font-bold text-[#0f1c2e] mb-2">ご予約を受け付けました</h2>
          <p className="text-sm text-gray-500 mb-4">確認メールをお送りしました。店舗より折り返しご連絡いたします。</p>
          <div className="bg-gray-50 rounded-xl p-4 text-left text-sm space-y-1">
            {choices.map((c, i) => (
              <div key={i}>第{i + 1}希望: {formatChoice(c)}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-5">
      <div className="max-w-[800px] mx-auto">
        {/* Choice summary */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {choices.map((c, i) => (
            <button
              key={i}
              onClick={() => { setCurrentChoice(i); setSelectedDate(null); }}
              className={`p-3 rounded-lg border text-center text-xs cursor-pointer transition-all ${
                currentChoice === i ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200' :
                c ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="font-bold text-[#0f1c2e] mb-1">第{i + 1}希望</div>
              <div className={c ? 'text-green-700' : 'text-gray-400'}>{formatChoice(c)}</div>
            </button>
          ))}
        </div>

        {step === 'dates' && (
          <>
            {/* Calendar */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="text-gray-400 hover:text-gray-700 px-2 py-1 cursor-pointer">&lt;</button>
                <h3 className="font-bold text-[#0f1c2e]">{calMonth.year}年{calMonth.month}月</h3>
                <button onClick={nextMonth} className="text-gray-400 hover:text-gray-700 px-2 py-1 cursor-pointer">&gt;</button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                {DAY_LABELS.map(d => <div key={d} className="font-bold text-gray-400 py-1">{d}</div>)}
              </div>
              {loadingDates ? (
                <div className="text-center py-8 text-gray-400 text-sm">読み込み中...</div>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                  {calendarDays.map(({ day, dateStr, available }) => (
                    <button
                      key={day}
                      onClick={() => available && setSelectedDate(dateStr)}
                      disabled={!available}
                      className={`py-2 rounded text-sm cursor-pointer transition-colors ${
                        selectedDate === dateStr ? 'bg-amber-500 text-white font-bold' :
                        available ? 'bg-green-50 text-green-700 hover:bg-green-100' :
                        'text-gray-300'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Time slots */}
            {selectedDate && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
                <h3 className="font-bold text-[#0f1c2e] text-sm mb-3">
                  {selectedDate} の空き時間（第{currentChoice + 1}希望）
                </h3>
                {loadingSlots ? (
                  <div className="text-center py-4 text-gray-400 text-sm">読み込み中...</div>
                ) : availableSlots.length === 0 ? (
                  <p className="text-sm text-gray-400">この日は空きがありません</p>
                ) : (
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                    {availableSlots.map(slot => (
                      <button
                        key={slot.time}
                        onClick={() => selectSlot(slot.time)}
                        className="py-2 px-1 border border-gray-200 rounded-lg text-sm hover:border-amber-500 hover:bg-amber-50 transition-colors cursor-pointer"
                      >
                        <div className="font-bold">{slot.time}</div>
                        {slot.remaining <= 2 && (
                          <div className="text-[10px] text-red-500">残{slot.remaining}枠</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Next button */}
            {allChoicesComplete() && (
              <button
                onClick={() => setStep('info')}
                className="w-full py-3 bg-gradient-to-br from-amber-600 via-amber-500 to-amber-700 text-white font-bold rounded-lg text-sm cursor-pointer hover:opacity-90 transition-opacity"
              >
                お客様情報の入力へ →
              </button>
            )}
          </>
        )}

        {step === 'info' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Service selection */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
              <h2 className="text-lg font-bold text-[#0f1c2e]" style={{ fontFamily: '"Noto Serif JP", serif' }}>ご希望のサービス</h2>

              {/* Coatings */}
              <div>
                <label className="block text-xs text-gray-500 mb-2">コーティングコース</label>
                <div className="space-y-2">
                  {coatings.map((coatingId, i) => (
                    <div key={i} className="flex gap-2">
                      <select
                        value={coatingId}
                        onChange={e => setCoatings(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                      >
                        <option value="">-- コースを選択 --</option>
                        {coatingTiers.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      {coatings.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setCoatings(prev => prev.filter((_, idx) => idx !== i))}
                          className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm cursor-pointer"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCoatings(prev => [...prev, ''])}
                    className="text-xs text-amber-600 hover:text-amber-700 font-semibold cursor-pointer"
                  >
                    + コースを追加
                  </button>
                </div>
              </div>

              {/* Options */}
              <div>
                <label className="block text-xs text-gray-500 mb-2">オプション（複数選択可）</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DEFAULT_OPTIONS.map(opt => (
                    <label key={opt.id} className="flex items-center gap-2 text-sm cursor-pointer px-2 py-1.5 border border-gray-200 rounded-lg hover:border-amber-300">
                      <input
                        type="checkbox"
                        checked={options.includes(opt.id)}
                        onChange={e => {
                          if (e.target.checked) setOptions(prev => [...prev, opt.id]);
                          else setOptions(prev => prev.filter(o => o !== opt.id));
                        }}
                        className="rounded"
                      />
                      <span className="text-gray-700">{opt.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <h2 className="text-lg font-bold text-[#0f1c2e]" style={{ fontFamily: '"Noto Serif JP", serif' }}>お客様情報</h2>
            <div>
              <label className="block text-xs text-gray-500 mb-1">お名前 *</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">電話番号 *</label>
              <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">メールアドレス *</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">備考・ご要望</label>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep('dates')}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold cursor-pointer hover:bg-gray-200">
                ← 日時選択に戻る
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 py-3 bg-gradient-to-br from-amber-600 via-amber-500 to-amber-700 text-white font-bold rounded-lg text-sm cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50">
                {submitting ? '送信中...' : '予約を確定する'}
              </button>
            </div>
          </form>
        )}

        {/* Phone CTA */}
        {store.tel && (
          <div className="mt-8 p-6 bg-gray-50 rounded-xl text-center">
            <p className="text-sm text-gray-500 mb-3">お電話でもお気軽にどうぞ</p>
            <a href={`tel:${store.tel}`} onClick={() => trackEvent(storeId, 'phone_call')} className="text-2xl font-bold text-amber-600">{store.tel}</a>
            {store.business_hours && <p className="text-xs text-gray-400 mt-1">{store.business_hours}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
