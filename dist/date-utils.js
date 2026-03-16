function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
function detectDateFromQuestion(question) {
    const normalized = question.toLowerCase();
    if (normalized.includes("tomorrow")) {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return formatLocalDate(d);
    }
    if (normalized.includes("today")) {
        return formatLocalDate(new Date());
    }
    const dateMatch = question.match(/\b\d{4}-\d{2}-\d{2}\b/);
    if (dateMatch) {
        return dateMatch[0];
    }
    return null;
}
function parseIsoDate(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        return null;
    }
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) {
        return null;
    }
    const date = new Date(y, m - 1, d);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    return date;
}
function nextWeekday(base, targetDay) {
    const current = base.getDay();
    const delta = (targetDay - current + 7) % 7 || 7;
    const out = new Date(base);
    out.setDate(base.getDate() + delta);
    return out;
}
function resolveWhenToDate(when, baseDate = new Date()) {
    const value = when.trim().toLowerCase();
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }
    if (value === "today") {
        return formatLocalDate(baseDate);
    }
    if (value === "tomorrow") {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + 1);
        return formatLocalDate(d);
    }
    if (value === "weekend") {
        return formatLocalDate(nextWeekday(baseDate, 6));
    }
    const weekdays = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6
    };
    if (value in weekdays) {
        return formatLocalDate(nextWeekday(baseDate, weekdays[value]));
    }
    return null;
}
export { detectDateFromQuestion, formatLocalDate, parseIsoDate, resolveWhenToDate };
