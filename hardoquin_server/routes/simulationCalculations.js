function round2(value) {
    return Math.round(Number(value) * 100) / 100;
}

function calculateWaterData(permeability, area, rainLevel) {
    const baseLitersPerSquareMeter = 120;
    const totalWater = area * baseLitersPerSquareMeter * (rainLevel / 100);
    const filteredWater = totalWater * permeability;
    const unfilteredWater = totalWater - filteredWater;
    const evaporatedWater = calculateEvaporatedWater(unfilteredWater);
    const finalUnfilteredWater = unfilteredWater - evaporatedWater;

    return {
        filteredWater: round2(filteredWater),
        unfilteredWater: round2(unfilteredWater),
        evaporatedWater: round2(evaporatedWater),
        finalUnfilteredWater: round2(finalUnfilteredWater)
    };
}

function calculateEvaporatedWater(unfilteredWater) {
    return round2(unfilteredWater * 0.15);
}

function calculateLifespanByTransit(usefulLife, trafficLevel) {
    const normalizedTransit = Math.min(Math.max(trafficLevel, 0), 100) / 100;
    const maxDegradation = 0.55;
    const degradationFactor = normalizedTransit * maxDegradation;
    const finalUsefulLife = usefulLife * (1 - degradationFactor);

    return Math.max(1, Math.round(finalUsefulLife));
}

function calculateTotalCost(costPerM2, area) {
    return round2(costPerM2 * area);
}

function calculateCostDifference(hardoquinValue, alternateValue) {
    return round2(alternateValue - hardoquinValue);
}

function calculateWaterDifference(hardoquinValue, alternateValue) {
    return round2(hardoquinValue - alternateValue);
}

function calculateUnfilteredPercentage(unfilteredWater, totalWater) {
    if (totalWater === 0) return 0;
    return round2((unfilteredWater / totalWater) * 100);
}

module.exports = {
    calculateCostDifference,
    calculateEvaporatedWater,
    calculateLifespanByTransit,
    calculateTotalCost,
    calculateUnfilteredPercentage,
    calculateWaterData,
    calculateWaterDifference,
    round2
};
