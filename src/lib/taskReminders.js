import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const SETTINGS_KEY = 'passTrackerTaskReminders';
const LAST_NOTIFIED_KEY = 'passTrackerTaskRemindersLastDate';
const DAILY_NOTIFICATION_ID = 42001;
const DIGEST_NOTIFICATION_ID = 42002;

export const DEFAULT_REMINDER_SETTINGS = {
  enabled: false,
  time: '08:00',
  includeOverdue: true,
  includeDueToday: true,
};

const isNativePlatform = () => Capacitor.isNativePlatform();

const notificationsAvailable = () => {
  if (isNativePlatform()) return true;
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const loadReminderSettings = () => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return { ...DEFAULT_REMINDER_SETTINGS };

    const parsed = JSON.parse(saved);
    return {
      enabled: Boolean(parsed.enabled),
      time: typeof parsed.time === 'string' && /^\d{2}:\d{2}$/.test(parsed.time)
        ? parsed.time
        : DEFAULT_REMINDER_SETTINGS.time,
      includeOverdue: parsed.includeOverdue !== false,
      includeDueToday: parsed.includeDueToday !== false,
    };
  } catch {
    return { ...DEFAULT_REMINDER_SETTINGS };
  }
};

export const saveReminderSettings = (settings) => {
  const next = {
    enabled: Boolean(settings.enabled),
    time: typeof settings.time === 'string' && /^\d{2}:\d{2}$/.test(settings.time)
      ? settings.time
      : DEFAULT_REMINDER_SETTINGS.time,
    includeOverdue: settings.includeOverdue !== false,
    includeDueToday: settings.includeDueToday !== false,
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
};

export const buildReminderCopy = ({
  overdueCount = 0,
  todayCount = 0,
  includeOverdue = true,
  includeDueToday = true,
}) => {
  const overdue = includeOverdue ? overdueCount : 0;
  const today = includeDueToday ? todayCount : 0;
  const parts = [];

  if (today > 0) {
    parts.push(`${today} due today`);
  }
  if (overdue > 0) {
    parts.push(`${overdue} overdue`);
  }

  if (parts.length === 0) {
    return {
      shouldNotify: false,
      title: 'PassTracker',
      body: 'No study tasks need attention right now.',
    };
  }

  return {
    shouldNotify: true,
    title: 'PassTracker study reminder',
    body: `You have ${parts.join(' and ')}.`,
  };
};

const parseReminderTime = (time) => {
  const [hourText, minuteText] = String(time || '08:00').split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  return {
    hour: Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : 8,
    minute: Number.isFinite(minute) ? Math.min(59, Math.max(0, minute)) : 0,
  };
};

const todayKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const hasNotifiedToday = () => localStorage.getItem(LAST_NOTIFIED_KEY) === todayKey();

const markNotifiedToday = () => {
  localStorage.setItem(LAST_NOTIFIED_KEY, todayKey());
};

const isAtOrPastReminderTime = (time, now = new Date()) => {
  const { hour, minute } = parseReminderTime(time);
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  return minutesNow >= hour * 60 + minute;
};

const msUntilReminderTime = (time, now = new Date()) => {
  const { hour, minute } = parseReminderTime(time);
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
};

export const getNotificationPermission = async () => {
  if (!notificationsAvailable()) return 'unsupported';

  if (isNativePlatform()) {
    const status = await LocalNotifications.checkPermissions();
    return status.display || 'prompt';
  }

  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return 'prompt';
};

export const requestNotificationPermission = async () => {
  if (!notificationsAvailable()) return 'unsupported';

  if (isNativePlatform()) {
    const status = await LocalNotifications.requestPermissions();
    return status.display || 'denied';
  }

  const result = await Notification.requestPermission();
  if (result === 'granted') return 'granted';
  if (result === 'denied') return 'denied';
  return 'prompt';
};

const showWebNotification = async ({ title, body }) => {
  if (!notificationsAvailable() || Notification.permission !== 'granted') return false;

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.showNotification) {
        await registration.showNotification(title, {
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: 'passtracker-daily-reminder',
          renotify: true,
        });
        return true;
      }
    }
  } catch {
    // Fall through to window Notification.
  }

  const notification = new Notification(title, {
    body,
    icon: '/icons/icon-192.png',
    tag: 'passtracker-daily-reminder',
  });
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
  return true;
};

const cancelNativeReminders = async () => {
  if (!isNativePlatform()) return;
  await LocalNotifications.cancel({
    notifications: [
      { id: DAILY_NOTIFICATION_ID },
      { id: DIGEST_NOTIFICATION_ID },
    ],
  });
};

const scheduleNativeDailyReminder = async ({ time, title, body }) => {
  const { hour, minute } = parseReminderTime(time);

  await LocalNotifications.cancel({
    notifications: [{ id: DAILY_NOTIFICATION_ID }],
  });

  await LocalNotifications.schedule({
    notifications: [
      {
        id: DAILY_NOTIFICATION_ID,
        title,
        body,
        schedule: {
          on: { hour, minute },
          allowWhileIdle: true,
        },
        extra: {
          source: 'daily-reminder',
        },
      },
    ],
  });
};

const showNativeDigest = async ({ title, body }) => {
  await LocalNotifications.cancel({
    notifications: [{ id: DIGEST_NOTIFICATION_ID }],
  });

  await LocalNotifications.schedule({
    notifications: [
      {
        id: DIGEST_NOTIFICATION_ID,
        title,
        body,
        schedule: {
          at: new Date(Date.now() + 750),
          allowWhileIdle: true,
        },
        extra: {
          source: 'daily-digest',
        },
      },
    ],
  });
};

/**
 * Keep the repeating daily reminder in sync with current settings/counts.
 * Native platforms can fire this even when the app is closed.
 * Web falls back to an in-app timer while the tab/app is open.
 */
export const syncDailyReminderSchedule = async ({
  settings,
  overdueCount = 0,
  todayCount = 0,
}) => {
  if (!settings?.enabled) {
    if (isNativePlatform()) {
      await cancelNativeReminders();
    }
    return { scheduled: false };
  }

  const permission = await getNotificationPermission();
  if (permission !== 'granted') {
    return { scheduled: false, permission };
  }

  const copy = buildReminderCopy({
    overdueCount,
    todayCount,
    includeOverdue: settings.includeOverdue,
    includeDueToday: settings.includeDueToday,
  });

  const title = 'PassTracker study reminder';
  const body = copy.shouldNotify
    ? copy.body
    : 'Open PassTracker to review Due Today and Overdue tasks.';

  if (isNativePlatform()) {
    await scheduleNativeDailyReminder({
      time: settings.time,
      title,
      body,
    });
    return { scheduled: true, permission };
  }

  return { scheduled: true, permission, webTimerMs: msUntilReminderTime(settings.time) };
};

/**
 * Fire today's digest once when appropriate (after reminder time, tasks exist).
 */
export const maybeSendDailyDigest = async ({
  settings,
  overdueCount = 0,
  todayCount = 0,
  force = false,
}) => {
  if (!settings?.enabled) return { sent: false, reason: 'disabled' };
  if (!force && hasNotifiedToday()) return { sent: false, reason: 'already-sent' };
  if (!force && !isAtOrPastReminderTime(settings.time)) {
    return { sent: false, reason: 'before-reminder-time' };
  }

  const permission = await getNotificationPermission();
  if (permission !== 'granted') return { sent: false, reason: 'permission', permission };

  const copy = buildReminderCopy({
    overdueCount,
    todayCount,
    includeOverdue: settings.includeOverdue,
    includeDueToday: settings.includeDueToday,
  });

  if (!copy.shouldNotify) return { sent: false, reason: 'no-tasks' };

  if (isNativePlatform()) {
    await showNativeDigest(copy);
  } else {
    const shown = await showWebNotification(copy);
    if (!shown) return { sent: false, reason: 'show-failed' };
  }

  markNotifiedToday();
  return { sent: true };
};

export const clearDailyReminderSchedule = async () => {
  if (isNativePlatform()) {
    await cancelNativeReminders();
  }
};

export const showImmediateReminder = async ({ title, body }) => {
  const permission = await getNotificationPermission();
  if (permission !== 'granted') {
    return { sent: false, reason: 'permission', permission };
  }

  if (isNativePlatform()) {
    await showNativeDigest({ title, body });
  } else {
    const shown = await showWebNotification({ title, body });
    if (!shown) return { sent: false, reason: 'show-failed' };
  }

  return { sent: true };
};

export const reminderPlatformLabel = () => (
  isNativePlatform()
    ? 'This device can deliver reminders even when PassTracker is closed.'
    : 'In the browser, reminders fire while PassTracker is open or installed as an app. For reliable closed-app alerts, use the iOS app.'
);
