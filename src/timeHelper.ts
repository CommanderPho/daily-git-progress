import * as path from 'path';

export interface TimeRange {
    name: string;
    icon: string;
    startHour: number;
    endHour: number;
}

export const TIME_RANGES: TimeRange[] = [
    { name: 'Early Morning', icon: 'sunrise.svg', startHour: 7, endHour: 9 },
    { name: 'Morning', icon: 'morning.svg', startHour: 9, endHour: 11 },
    { name: 'Noon', icon: 'noon.svg', startHour: 11, endHour: 13 },
    { name: 'Lunch', icon: 'lunch.svg', startHour: 13, endHour: 14 },
    { name: 'Afternoon', icon: 'afternoon.svg', startHour: 14, endHour: 16 },
    { name: 'Evening', icon: 'evening.svg', startHour: 16, endHour: 18 },
    { name: 'Sunset', icon: 'sunset.svg', startHour: 18, endHour: 20 },
    { name: 'Night', icon: 'night.svg', startHour: 20, endHour: 7 }
];

export function getTimeRange(hour: number): TimeRange {
    // Handle night time (8pm to 7am)
    if (hour >= 20 || hour < 7) {
        return TIME_RANGES[7]; // Night
    }

    // Find matching time range
    for (const range of TIME_RANGES) {
        if (hour >= range.startHour && hour < range.endHour) {
            return range;
        }
    }

    // Default to night if no match
    return TIME_RANGES[7];
}

export function getTimeIconPath(hour: number, asAbsolutePath: (relativePath: string) => string): string {
    const range = getTimeRange(hour);
    return asAbsolutePath(path.join('resources', 'time-icons', range.icon));
}

export function formatTimeInterval(range: TimeRange): string {
    const formatHour = (hour: number): string => {
        if (hour === 0) return '12am';
        if (hour < 12) return `${hour}am`;
        if (hour === 12) return '12pm';
        return `${hour - 12}pm`;
    };

    // Special case for night (wraps around midnight)
    if (range.startHour > range.endHour) {
        return `${formatHour(range.startHour)}-${formatHour(range.endHour)}`;
    }

    return `${formatHour(range.startHour)}-${formatHour(range.endHour)}`;
}

export interface CommitDisplayInfo {
    label: string;
    tooltip: string;
    iconPath: string;
}

export function createCommitDisplayInfo(
    commit: { timestamp: number; message: string; author: string; hash: string },
    asAbsolutePath: (relativePath: string) => string
): CommitDisplayInfo {
    const time = new Date(commit.timestamp * 1000);
    const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
    const label = `[${timeStr}] ${commit.message} (${commit.hash.substring(0, 7)})`;
    const tooltip = `${commit.message}\n\nAuthor: ${commit.author}\nHash: ${commit.hash}`;
    const iconPath = getTimeIconPath(time.getHours(), asAbsolutePath);

    return { label, tooltip, iconPath };
}
