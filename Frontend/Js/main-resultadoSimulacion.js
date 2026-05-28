import { initNavbar, activeTab } from "./navbar.js";
import { calculateWaterData, calculateLifespanByTransit, calculateTotalCost, calculateCostDifference, calculateWaterDifference, round2, formatNumberWithCommas, formatMaterialLabel } from "./simulaciones/calculations.js";
import { centerTextPlugin, createDoughnutChart, createLifespanChart, createWaterManagementChart } from "./simulaciones/charts.js";

document.addEventListener("DOMContentLoaded", async () => {
    await initNavbar();
    activeTab("simulaciones");

    const area = 50, nivelLluvia = 55, litrosBasePorMetro = 120, transitLevel = 45;

  // DOM
    const selectMaterial = document.getElementById("select-material");
    const alternateMaterialLabel = document.querySelector(".comparison__label--alternate");
    const alternateCostMaterial = document.querySelector(".cost__material--alternate");
    const hardoquinCanvas = document.getElementById("chart-hardoquin-permeability");
    const alternateCanvas = document.getElementById("chart-alternate-permeability");
    const lifespanCanvas = document.getElementById("chart-lifespan");
    const waterManagementCanvas = document.getElementById("chart-water-managed");
    const hardoquinCostElement = document.getElementById("cost-hardoquin");
    const alternateCostElement = document.getElementById("cost-alternate");
    const hardoquinCostDetails = document.getElementById("cost-hardoquin-details");
    const alternateCostDetails = document.getElementById("cost-alternate-details");
    const areaElement = document.querySelector(".results__data-value--area");
    const rainfallElement = document.querySelector(".results__data-value--rainfall");
    const transitElement = document.querySelector(".results__data-value--traffic");
    const savingsAmountElement = document.getElementById("savings-amount");
    const savingsContextElement = document.getElementById("savings-context");
    const comparisonText = document.getElementById("comparison-text");
    const comparisonHighlight = document.getElementById("comparison-difference");

    areaElement.textContent = `${area} m²`;
    rainfallElement.textContent = `${nivelLluvia}%`;
    transitElement.textContent = `${transitLevel}%`;

    const materiales = [
        { id: 1, nombre: "Adoquín tradicional", vidaUtil: 25, costoM2: 520, permeabilidad: 0.35 },
        { id: 2, nombre: "Concreto", vidaUtil: 30, costoM2: 450, permeabilidad: 0.08 },
        { id: 3, nombre: "Asfalto", vidaUtil: 18, costoM2: 320, permeabilidad: 0.03 },
        { id: 4, nombre: "Hardoquín", vidaUtil: 40, costoM2: 280, permeabilidad: 0.82 }
    ];

    const hardoquin = materiales.find(m => m.id === 4);
    const initialAlternate = materiales.find(m => m.id === 1);

    const hardoquinChart = createDoughnutChart(hardoquinCanvas, hardoquin.permeabilidad, "#22c55e", area, litrosBasePorMetro, nivelLluvia);
    const alternateChart = createDoughnutChart(alternateCanvas, initialAlternate.permeabilidad, "#3b82f6", area, litrosBasePorMetro, nivelLluvia);
    const lifespanChart = createLifespanChart(lifespanCanvas, transitLevel, initialAlternate, calculateLifespanByTransit, hardoquin);
    const waterManagementChart = createWaterManagementChart(waterManagementCanvas, initialAlternate, calculateWaterData, round2, area, litrosBasePorMetro, nivelLluvia, hardoquin);

    // Costs
    const hardoquinCost = calculateTotalCost(hardoquin, area);
    const alternateCost = calculateTotalCost(initialAlternate, area);
    hardoquinCostElement.textContent = `$${formatNumberWithCommas(hardoquinCost)}`;
    alternateCostElement.textContent = `$${formatNumberWithCommas(alternateCost)}`;
    hardoquinCostDetails.textContent = `${area}m² • $${hardoquin.costoM2}/m²`;
    alternateCostDetails.textContent = `${area}m² • $${initialAlternate.costoM2}/m²`;
    const savingsAmount = calculateCostDifference(hardoquinCost, alternateCost);
    savingsAmountElement.textContent = `$${formatNumberWithCommas(savingsAmount)}`;
    savingsContextElement.textContent = `vs ${initialAlternate.nombre} en ${area}m²`;

    // Comparison text
    const { litrosFiltrados: litrosFiltradosAlternate } = calculateWaterData(initialAlternate.permeabilidad, area, litrosBasePorMetro, nivelLluvia);
    const { litrosFiltrados: litrosFiltradosHardoquin } = calculateWaterData(hardoquin.permeabilidad, area, litrosBasePorMetro, nivelLluvia);
    const litrosFiltradosDiff = calculateWaterDifference(litrosFiltradosHardoquin, litrosFiltradosAlternate);
    comparisonText.textContent = `Hardoquin permeabiliza aproximadamente ${formatNumberWithCommas(litrosFiltradosDiff)} L más que el ${initialAlternate.nombre.toLowerCase()} bajo las mismas condiciones de lluvia y tráfico.`;
    comparisonHighlight.textContent = `+${formatNumberWithCommas(litrosFiltradosDiff)}L`;

    // Select listener
    selectMaterial.addEventListener("change", () => {
        const materialId = Number(selectMaterial.value);
        const material = materiales.find(m => m.id === materialId);
        if (!material) return;
        alternateMaterialLabel.textContent = material.nombre;
        alternateCostMaterial.textContent = `${material.nombre} - instalación inicial`;

        const { litrosFiltrados, litrosNoFiltrados } = calculateWaterData(material.permeabilidad, area, litrosBasePorMetro, nivelLluvia);
        alternateChart.data.datasets[0].data = [litrosFiltrados, litrosNoFiltrados];
        alternateChart.update();
        const litrosFiltradosHardoquin = calculateWaterData(hardoquin.permeabilidad, area, litrosBasePorMetro, nivelLluvia).litrosFiltrados;

        const litrosFiltradosDiff = calculateWaterDifference(litrosFiltradosHardoquin, litrosFiltrados);
        comparisonText.textContent = `Hardoquin permeabiliza aproximadamente ${formatNumberWithCommas(litrosFiltradosDiff)} L más que el ${material.nombre.toLowerCase()} bajo las mismas condiciones de lluvia y tráfico.`;
        comparisonHighlight.textContent = `+${formatNumberWithCommas(litrosFiltradosDiff)}L`;

        lifespanChart.data.labels[1] = material.nombre;
        lifespanChart.data.datasets[0].data = [calculateLifespanByTransit(hardoquin, transitLevel), calculateLifespanByTransit(material, transitLevel)];
        lifespanChart.update();

        // costs update
        const hardoquinCostNow = calculateTotalCost(hardoquin, area);
        const materialCostNow = calculateTotalCost(material, area);
        hardoquinCostElement.textContent = `$${formatNumberWithCommas(hardoquinCostNow)}`;
        alternateCostElement.textContent = `$${formatNumberWithCommas(materialCostNow)}`;
        hardoquinCostDetails.textContent = `${area}m² • $${hardoquin.costoM2}/m²`;
        alternateCostDetails.textContent = `${area}m² • $${material.costoM2}/m²`;
        savingsAmountElement.textContent = `$${formatNumberWithCommas(calculateCostDifference(hardoquinCostNow, materialCostNow))}`;
        savingsContextElement.textContent = `vs ${material.nombre} en ${area}m²`;

        // water management update
        const hardoquinTotal = calculateWaterData(hardoquin.permeabilidad, area, litrosBasePorMetro, nivelLluvia);
        const hardoquinFiltrada = round2(hardoquinTotal.litrosFiltrados);
        const hardoquinNoFiltrada = hardoquinTotal.litrosNoFiltrados;
        const hardoquinEvaporada = round2(hardoquinNoFiltrada * 0.15);
        const hardoquinNoFiltradaFinal = round2(hardoquinNoFiltrada - hardoquinEvaporada);

        const litrosEvaporados = round2(litrosNoFiltrados * 0.15);
        const litrosNoFiltradosFinal = round2(litrosNoFiltrados - litrosEvaporados);

        waterManagementChart.data.labels[1] = material.nombre;
        waterManagementChart.data.datasets[0].data = [hardoquinFiltrada, round2(litrosFiltrados)];
        waterManagementChart.data.datasets[1].data = [hardoquinEvaporada, litrosEvaporados];
        waterManagementChart.data.datasets[2].data = [hardoquinNoFiltradaFinal, litrosNoFiltradosFinal];
        waterManagementChart.update();
    });
    });
