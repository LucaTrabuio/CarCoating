import { google } from 'googleapis';

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
}

const TYPE_LABELS: Record<string, string> = {
  visit: '来店予約',
  inquiry: 'お問い合わせ',
};

export async function createCalendarEvent(opts: {
  calendarId: string;
  title?: string;
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  locationName: string;
  type: string;
}): Promise<{ eventId: string } | null> {
  if (!opts.calendarId) return null;

  const auth = getAuth();
  const calendar = google.calendar({ version: 'v3', auth });
  const label = TYPE_LABELS[opts.type] || '予約';

  const startDateTime = `${opts.date}T${opts.time}:00+09:00`;
  const [h, m] = opts.time.split(':').map(Number);
  const endMinutes = h * 60 + m + 30;
  const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
  const endM = String(endMinutes % 60).padStart(2, '0');
  const endDateTime = `${opts.date}T${endH}:${endM}:00+09:00`;

  const description = [
    `【${label}】`,
    `お客様: ${opts.customerName} 様`,
    `電話: ${opts.customerPhone}`,
    `メール: ${opts.customerEmail}`,
    `店舗: ${opts.locationName}`,
  ].join('\n');

  try {
    const event = await calendar.events.insert({
      calendarId: opts.calendarId,
      requestBody: {
        summary: opts.title || `【${label}】${opts.customerName} 様`,
        description,
        start: { dateTime: startDateTime, timeZone: 'Asia/Tokyo' },
        end: { dateTime: endDateTime, timeZone: 'Asia/Tokyo' },
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }, { method: 'email', minutes: 60 }] },
      },
    });
    return event.data.id ? { eventId: event.data.id } : null;
  } catch (error) {
    console.error('Google Calendar event creation failed:', error);
    return null;
  }
}

export async function deleteCalendarEvent(calendarId: string, eventId: string): Promise<void> {
  const auth = getAuth();
  const calendar = google.calendar({ version: 'v3', auth });
  try {
    await calendar.events.delete({ calendarId, eventId, sendUpdates: 'all' });
  } catch (error) {
    console.error('Google Calendar event deletion failed:', error);
  }
}

export async function updateCalendarEventStatus(calendarId: string, eventId: string, status: string): Promise<void> {
  const auth = getAuth();
  const calendar = google.calendar({ version: 'v3', auth });
  const statusLabels: Record<string, string> = {
    confirmed: '【確認済】',
    completed: '【完了】',
    cancelled: '【キャンセル】',
    pending: '【予約】',
  };
  const prefix = statusLabels[status] || '';

  try {
    const existing = await calendar.events.get({ calendarId, eventId });
    const currentSummary = existing.data.summary || '';
    const cleanSummary = currentSummary.replace(/^【[^】]*】/, '');
    await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: { summary: `${prefix}${cleanSummary}` },
    });
  } catch (error) {
    console.error('Google Calendar event status update failed:', error);
  }
}
