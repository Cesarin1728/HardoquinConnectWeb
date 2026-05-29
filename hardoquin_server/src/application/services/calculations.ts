export const round2 = (value: number) : number => Math.round(value * 100) / 100;

export const calculateWaterData = (permeability: number, area: number, rainLevel: number) : { filteredWater: number; unfilteredWater: number, evaporatedWater: number, finalUnfilteredWater: number } => {
    const baseLitersPerSquareMeter = 120;
    const totalWater = area * baseLitersPerSquareMeter * (rainLevel / 100);
    const filteredWater= totalWater * permeability;
    const unfilteredWater = totalWater - filteredWater;
    const evaporatedWater = calculateEvaporatedWater(unfilteredWater);
    const finalUnfilteredWater = unfilteredWater - evaporatedWater;
    return { filteredWater: round2(filteredWater), unfilteredWater: round2(unfilteredWater), evaporatedWater: round2(evaporatedWater), finalUnfilteredWater: round2(finalUnfilteredWater) };
};

export const calculateEvaporatedWater = (unfilteredWater: number) : number => {
    return round2(unfilteredWater * 0.15);
};

export const calculateLifespanByTransit = (usefulLife: number, transitPercent: number) : number=> {
    const normalizedTransit = Math.min(Math.max(transitPercent, 0), 100) / 100;
    const maxDegradation = 0.55;
    const factorDegradation = normalizedTransit * maxDegradation;
    const finalUsefulLife = usefulLife * (1 - factorDegradation);
    return Math.max(1, Math.round(finalUsefulLife));
};

export const calculateTotalCost = (costPerM2: number, area: number) : number => {
    return round2(costPerM2 * area);
};

export const calculateCostDifference = (hardoquinValue: number, alternateValue: number) : number => {
    return round2(alternateValue - hardoquinValue);
};

export const calculateWaterDifference = (hardoquinValue: number, alternateValue: number) : number => {
    return round2(hardoquinValue - alternateValue);
};

export const calculateUnfilterdPercentage = (unfilteredWater: number, totalWater: number) : number => {
    if (totalWater === 0) return 0;
    return round2(unfilteredWater / totalWater * 100);
};

export const getRelativeTime = (date: Date | string): string => {
    const now = new Date();
    const past = new Date(date);

    const diffMs = now.getTime() - past.getTime();

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSeconds < 60) return "hace unos segundos";
    if (diffMinutes < 60) return `hace ${diffMinutes} minuto(s)`;
    if (diffHours < 24) return `hace ${diffHours} hora(s)`;
    if (diffDays < 7) return `hace ${diffDays} día(s)`;
    if (diffWeeks < 5) return `hace ${diffWeeks} semana(s)`;
    if (diffMonths < 12) return `hace ${diffMonths} mes(es)`;
    return `hace ${diffYears} año(s)`;
};
