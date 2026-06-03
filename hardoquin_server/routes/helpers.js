function toNumber(value) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
}

function requireFields(body, fields) {
    const missingFields = fields.filter((field) => {
        const value = body[field];
        return value === undefined || value === null || String(value).trim() === '';
    });

    if (missingFields.length > 0) {
        const error = new Error(`Faltan campos requeridos: ${missingFields.join(', ')}`);
        error.status = 400;
        throw error;
    }
}

function getRelativeTime(date) {
    const now = new Date();
    const past = new Date(date);
    const diffMs = Math.max(0, now.getTime() - past.getTime());

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSeconds < 60) return 'hace unos segundos';
    if (diffMinutes < 60) return `hace ${diffMinutes} minuto(s)`;
    if (diffHours < 24) return `hace ${diffHours} hora(s)`;
    if (diffDays < 7) return `hace ${diffDays} dia(s)`;
    if (diffWeeks < 5) return `hace ${diffWeeks} semana(s)`;
    if (diffMonths < 12) return `hace ${diffMonths} mes(es)`;
    return `hace ${diffYears} anio(s)`;
}

function handleError(res, error) {
    const status = error.status || 500;

    res.status(status).json({
        ok: false,
        message: error.message || 'Error interno del servidor'
    });
}

module.exports = {
    getRelativeTime,
    handleError,
    requireFields,
    toNumber
};
