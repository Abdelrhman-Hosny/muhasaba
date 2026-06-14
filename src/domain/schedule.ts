import { ar } from '@/i18n/ar';

export function getScheduleLabel(schedule: string): string {
  if (!schedule || schedule === 'daily') return ar.settings.deeds.scheduleDaily;
  if (schedule === 'weekly_anytime') return ar.settings.deeds.scheduleWeekly;
  if (schedule === 'weekdays') return ar.settings.deeds.scheduleWeekdays;

  const activeDays = schedule.split(',').map(Number);
  if (activeDays.length === 7) return ar.settings.deeds.scheduleDaily;

  const names = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  const shortDays = activeDays.map((d) => names[d]);
  return `مخصص: ${shortDays.join('، ')}`;
}

export function getNextActiveDate(schedule: string): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // midnight

  if (!schedule || schedule === 'daily') {
    return today;
  }

  let activeDays: number[] = [];
  if (schedule === 'weekdays') {
    activeDays = [1, 2, 3, 4, 5]; // Mon to Fri
  } else if (schedule === 'weekly_anytime') {
    return today;
  } else {
    activeDays = schedule.split(',').map(Number);
  }

  // Loop up to 7 days in the future to find the first active day
  for (let i = 0; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayOfWeek = d.getDay(); // 0 = Sun, 1 = Mon ...
    if (activeDays.includes(dayOfWeek)) {
      return d;
    }
  }

  return today;
}

export function formatArabicDate(d: Date): string {
  const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  
  const dayName = dayNames[d.getDay()];
  const dayOfMonth = d.getDate();
  const monthName = monthNames[d.getMonth()];
  
  return `${dayName}، ${dayOfMonth} ${monthName}`;
}

export function getPresetSectionId(presetId: string): string {
  if (['fajr', 'sunnah_fajr', 'adhkar_morning'].includes(presetId)) return 'sec_morning';
  if (['dhuhr', 'duha'].includes(presetId)) return 'sec_dhuhr';
  if (['asr'].includes(presetId)) return 'sec_asr';
  if (['maghrib', 'adhkar_evening'].includes(presetId)) return 'sec_maghrib';
  if (['isha', 'witr'].includes(presetId)) return 'sec_isha_night';
  if (['quran_reading'].includes(presetId)) return 'sec_quran';
  return 'sec_morning';
}
