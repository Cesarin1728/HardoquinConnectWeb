/* Utility and calculation functions for simulaciones */
export const round2 = (value) => Math.round(value * 100) / 100;

export const formatNumberWithCommas = (number) => {
    return Math.round(number).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export const formatMaterialLabel = (value) => {
    const normalized = value.trim().toLowerCase().replace(/-/g, " ");
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

export const calculateWaterData = (permeabilidad, area, litrosBasePorMetro, nivelLluvia) => {
    const litrosTotales = area * litrosBasePorMetro * (nivelLluvia / 100);
    const litrosFiltrados = Math.round(litrosTotales * permeabilidad);
    return { litrosFiltrados, litrosNoFiltrados: litrosTotales - litrosFiltrados };
};

export const calculateLifespanByTransit = (material, transitPercent) => {
    const normalizedTransit = Math.min(Math.max(transitPercent, 0), 100) / 100;
    const desgasteMaximo = 0.55;
    const factorDesgaste = normalizedTransit * desgasteMaximo;
    const vidaUtilFinal = material.vidaUtil * (1 - factorDesgaste);
    return Math.max(1, Math.round(vidaUtilFinal));
};

export const calculateTotalCost = (material, area) => {
    return material.costoM2 * area;
};

export const calculateCostDifference = (hardoquinValue, alternateValue) => {
    return round2(alternateValue - hardoquinValue);
};

export const calculateWaterDifference = (hardoquinValue, alternateValue) => {
    return round2(hardoquinValue - alternateValue);
}
