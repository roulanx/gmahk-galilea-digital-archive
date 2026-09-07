import { SabbathInfo, QuarterInfo } from './types';

export const TIMEZONE = 'Asia/Makassar';

export const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const QUARTER_TITLES = [
  'Triwulan I',
  'Triwulan II',
  'Triwulan III',
  'Triwulan IV',
];

/**
 * Returns current timestamp parts in WITA timezone (Asia/Makassar, UTC+8)
 */
export function getWitaDateParts(baseDate: Date = new Date()): {
  year: number;
  month: number; // 1-12
  day: number;
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  hours: number;
  minutes: number;
  dateStr: string; // YYYY-MM-DD
} {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(baseDate);
  const partMap: Record<string, string> = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }

  const year = parseInt(partMap.year, 10);
  const month = parseInt(partMap.month, 10);
  const day = parseInt(partMap.day, 10);
  const hours = parseInt(partMap.hour, 10);
  const minutes = parseInt(partMap.minute, 10);

  // Determine weekday using UTC representation of the WITA date
  const witaMidnight = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = witaMidnight.getUTCDay();

  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const dateStr = `${year}-${mm}-${dd}`;

  return { year, month, day, dayOfWeek, hours, minutes, dateStr };
}

/**
 * Formats a YYYY-MM-DD string into 'DD Month YYYY' Indonesian format (e.g. '12 September 2026')
 */
export function formatSabbathTitle(dateStr: string): string {
  const [yStr, mStr, dStr] = dateStr.split('-');
  const day = parseInt(dStr, 10);
  const monthIdx = parseInt(mStr, 10) - 1;
  const year = parseInt(yStr, 10);
  const monthName = MONTH_NAMES_ID[monthIdx] || mStr;
  return `${day} ${monthName} ${year}`;
}

/**
 * Determines the quarter (1..4) from a 1-based month index
 */
export function getQuarterFromMonth(month: number): number {
  return Math.floor((month - 1) / 3) + 1;
}

/**
 * Returns quarter title string (e.g. 'Triwulan III')
 */
export function getQuarterTitle(quarter: number): string {
  return QUARTER_TITLES[quarter - 1] || `Triwulan ${quarter}`;
}

/**
 * Generates all Sabbaths (Saturdays) for a given year and quarter
 */
export function getSabbathsInQuarter(year: number, quarter: number): SabbathInfo[] {
  const startMonth = (quarter - 1) * 3; // 0-based
  const endMonth = startMonth + 2;

  const currentWita = getWitaDateParts();
  const todayStr = currentWita.dateStr;

  const sabbaths: SabbathInfo[] = [];

  // Iterate through all days of the 3 months in the quarter
  const iterDate = new Date(Date.UTC(year, startMonth, 1));
  const endDate = new Date(Date.UTC(year, endMonth + 1, 0)); // last day of quarter

  while (iterDate <= endDate) {
    if (iterDate.getUTCDay() === 6) {
      // 6 is Saturday (Sabbath)
      const y = iterDate.getUTCFullYear();
      const m = iterDate.getUTCMonth() + 1;
      const d = iterDate.getUTCDate();
      const mm = String(m).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${y}-${mm}-${dd}`;

      sabbaths.push({
        date: dateStr,
        formattedTitle: formatSabbathTitle(dateStr),
        year: y,
        quarter,
        quarterTitle: getQuarterTitle(quarter),
        isPast: dateStr < todayStr,
        isToday: dateStr === todayStr,
        isUpcoming: dateStr >= todayStr,
      });
    }
    iterDate.setUTCDate(iterDate.getUTCDate() + 1);
  }

  return sabbaths;
}

/**
 * Returns current quarter details with all its Sabbaths
 */
export function getCurrentQuarterInfo(baseDate: Date = new Date()): QuarterInfo {
  const { year, month } = getWitaDateParts(baseDate);
  const quarter = getQuarterFromMonth(month);
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;

  const startMonthStr = String(startMonth).padStart(2, '0');
  const endMonthStr = String(endMonth).padStart(2, '0');
  const lastDay = new Date(Date.UTC(year, endMonth, 0)).getUTCDate();

  return {
    year,
    quarter,
    title: getQuarterTitle(quarter),
    startDate: `${year}-${startMonthStr}-01`,
    endDate: `${year}-${endMonthStr}-${lastDay}`,
    sabbaths: getSabbathsInQuarter(year, quarter),
  };
}

/**
 * Returns the next upcoming Sabbath information
 */
export function getNextSabbath(baseDate: Date = new Date()): SabbathInfo {
  const { year, month, day, dayOfWeek, hours, minutes, dateStr } = getWitaDateParts(baseDate);

  let daysUntilNextSabbath: number;

  if (dayOfWeek === 6) {
    // Today is Sabbath (Saturday)
    // If before sunset (approx 18:30 WITA), today is still current Sabbath
    if (hours < 18 || (hours === 18 && minutes < 30)) {
      daysUntilNextSabbath = 0;
    } else {
      // Past sunset on Sabbath -> next Sabbath is in 7 days
      daysUntilNextSabbath = 7;
    }
  } else {
    // Days until next Saturday (dayOfWeek: Sunday=0..Friday=5)
    daysUntilNextSabbath = 6 - dayOfWeek;
  }

  const targetUtc = new Date(Date.UTC(year, month - 1, day + daysUntilNextSabbath));
  const tYear = targetUtc.getUTCFullYear();
  const tMonth = targetUtc.getUTCMonth() + 1;
  const tDay = targetUtc.getUTCDate();
  const mm = String(tMonth).padStart(2, '0');
  const dd = String(tDay).padStart(2, '0');
  const targetDateStr = `${tYear}-${mm}-${dd}`;
  const tQuarter = getQuarterFromMonth(tMonth);

  return {
    date: targetDateStr,
    formattedTitle: formatSabbathTitle(targetDateStr),
    year: tYear,
    quarter: tQuarter,
    quarterTitle: getQuarterTitle(tQuarter),
    isPast: false,
    isToday: targetDateStr === dateStr,
    isUpcoming: true,
  };
}

/**
 * Returns previous Sabbath information
 */
export function getPreviousSabbath(baseDate: Date = new Date()): SabbathInfo {
  const { year, month, day, dayOfWeek } = getWitaDateParts(baseDate);

  // How many days ago was the last Saturday?
  const daysAgo = dayOfWeek === 6 ? 7 : (dayOfWeek + 1);

  const targetUtc = new Date(Date.UTC(year, month - 1, day - daysAgo));
  const tYear = targetUtc.getUTCFullYear();
  const tMonth = targetUtc.getUTCMonth() + 1;
  const tDay = targetUtc.getUTCDate();
  const mm = String(tMonth).padStart(2, '0');
  const dd = String(tDay).padStart(2, '0');
  const targetDateStr = `${tYear}-${mm}-${dd}`;
  const tQuarter = getQuarterFromMonth(tMonth);

  return {
    date: targetDateStr,
    formattedTitle: formatSabbathTitle(targetDateStr),
    year: tYear,
    quarter: tQuarter,
    quarterTitle: getQuarterTitle(tQuarter),
    isPast: true,
    isToday: false,
    isUpcoming: false,
  };
}

/**
 * Returns the default upload Sabbath target according to system rules
 */
export function getDefaultUploadSabbath(): SabbathInfo {
  return getNextSabbath();
}
