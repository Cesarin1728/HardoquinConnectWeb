import { initNavbar } from "./navbar.js";
import { activeTab } from "./navbar.js";

const materiales = [
    { id: 1, nombre: "Adoquín tradicional", vidaUtil: 25, costoM2: 520, permeabilidad: 0.35 },
    { id: 2, nombre: "Concreto", vidaUtil: 30, costoM2: 450, permeabilidad: 0.08 },
    { id: 3, nombre: "Asfalto", vidaUtil: 18, costoM2: 320, permeabilidad: 0.03 },
    { id: 4, nombre: "Hardoquín", vidaUtil: 40, costoM2: 280, permeabilidad: 0.82 }
];

document.addEventListener("DOMContentLoaded", async () => {
    await initNavbar();
    activeTab("simulaciones");

    const area = 50, nivelLluvia = 55, litrosBasePorMetro = 120, transitLevel = 45;
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
    
    const hardoquin = materiales.find(m => m.id === 4);
    const initialAlternate = materiales.find(m => m.id === 1);

    const calculateWaterData = (permeabilidad) => {
        const litrosTotales = area * litrosBasePorMetro * (nivelLluvia / 100);
        const litrosFiltrados = Math.round(litrosTotales * permeabilidad);
        return { litrosFiltrados, litrosNoFiltrados: litrosTotales - litrosFiltrados };
    };

    const calculateLifespanByTransit = (material, transitPercent) => {
        const normalizedTransit = Math.min(Math.max(transitPercent, 0), 100) / 100;
        const desgasteMaximo = 0.55;
        const factorDesgaste = normalizedTransit * desgasteMaximo;
        const vidaUtilFinal = material.vidaUtil * (1 - factorDesgaste);
        return Math.max(1, Math.round(vidaUtilFinal));
    };

    const calculateTotalCost = (material) => {
        const costoTotal = material.costoM2 * area;
        return costoTotal;
    };

    const round2 = (value) => Math.round(value * 100) / 100;

    const calculateCostDifference = (harodoquinValue, alternateValue) => {
        return round2(alternateValue - harodoquinValue);
    };

    const calculateWaterDifference = (hardoquinValue, alternateValue) => {
        return round2(hardoquinValue - alternateValue);
    };

    const formatNumberWithCommas = (number) => {
        return Math.round(number).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    const centerTextPlugin = {
        id: "centerText",
        beforeDraw(chart) {
            const { ctx, chartArea } = chart;
            const meta = chart.getDatasetMeta(0); if (!meta.data.length) return;
            const x = meta.data[0].x, y = meta.data[0].y;
            const litros = Math.round(chart.data.datasets[0].data[0]);
            const baseSize = Math.min(chartArea.width, chartArea.height);
            const labelFontSize = Math.max(14, Math.min(34, Math.round(baseSize * 0.18)));
            const sublabelFontSize = Math.max(10, Math.min(16, Math.round(baseSize * 0.09)));
            const lineGap = Math.round(labelFontSize * 0.45);
            ctx.save(); 
            ctx.font = `700 ${labelFontSize}px Poppins`; 
            ctx.fillStyle = "#111827"; 
            ctx.textAlign = "center"; 
            ctx.textBaseline = "middle";
            ctx.fillText(`${formatNumberWithCommas(litros)} L`, x, y - lineGap); 
            ctx.font = `${sublabelFontSize}px Poppins`; 
            ctx.fillStyle = "#6b7280"; 
            ctx.fillText("permeabilizados", x, y + lineGap); 
            ctx.restore();
        }
    };

    const { litrosFiltrados: litrosFiltradosAlternate, litrosNoFiltrados: litrosNoFiltradosAlternate } = calculateWaterData(initialAlternate.permeabilidad);
    const { litrosFiltrados: litrosFiltradosHardoquin, litrosNoFiltrados: litrosNoFiltradosHardoquin } = calculateWaterData(hardoquin.permeabilidad);
    const litrosFiltradosDiff = calculateWaterDifference(litrosFiltradosHardoquin, litrosFiltradosAlternate);

    comparisonText.textContent = `Hardoquin permeabiliza aproximadamente ${formatNumberWithCommas(litrosFiltradosDiff)} L más que ${initialAlternate.nombre} bajo las mismas condiciones de lluvia y tránsito`;
    comparisonHighlight.textContent = `+${formatNumberWithCommas(litrosFiltradosDiff)}L`;

    const createDoughnutChart = (canvas, permeabilidad, color) => {
        const { litrosFiltrados, litrosNoFiltrados } = calculateWaterData(permeabilidad);
        return new Chart(canvas, {
            type: "doughnut",
            plugins: [centerTextPlugin],
            data: { 
                labels: ["Agua filtrada", "Agua no filtrada"], 
                datasets: [{
                    data: [litrosFiltrados, litrosNoFiltrados], 
                    backgroundColor: [color, "#e5e7eb"], 
                    borderWidth: 0, hoverOffset: 5, 
                    borderRadius: 6 
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                cutout: "75%", 
                animation: { 
                    duration: 800 
                }, 
                plugins: { 
                    legend: { 
                        display: false 
                    }, 
                    tooltip: { 
                        callbacks: { 
                            label: (context) => `${Math.round(context.raw)} L` 
                        } 
                    } 
                } 
            }
        });
    };

    const createLifespanChart = (canvas, transitPercent, alternateMaterial) => {
        const hardoquinLife = calculateLifespanByTransit(hardoquin, transitPercent);
        const alternateLife = calculateLifespanByTransit(alternateMaterial, transitPercent);
        return new Chart(canvas, {
            type: "bar",
            data: { 
                labels: ["Hardoquín", alternateMaterial.nombre], 
                datasets: [{ 
                    label: "Vida útil (años)", 
                    data: [hardoquinLife, alternateLife], 
                    backgroundColor: ["#22c55e", "#3b82f6"], 
                    borderRadius: 6, 
                    maxBarThickness: 54 
                }] 
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { 
                        grid: { display: false }, 
                        ticks: { color: "#475569", 
                            font: { size: 12 } }, 
                            title: { 
                                display: true, 
                                text: "Material", 
                                color: "#475569", 
                                font: { size: 12, weight: "500" }, 
                                padding: { top: 12 }
                            } 
                        },
                    y: { 
                        beginAtZero: true, 
                        suggestedMax: 50, 
                        grid: { color: "rgba(15,23,42,0.08)" }, 
                        ticks: { color: "#475569", stepSize: 10 }, 
                        title: { 
                            display: true, 
                            text: "Durabilidad (años)", 
                            color: "#475569", 
                            font: { 
                                size: 12, 
                                weight: "500" 
                            }, 
                            padding: { bottom: 12 } 
                        } 
                    }
                },
                plugins: { 
                    legend: { 
                        display: false 
                    }, 
                    tooltip: { 
                        callbacks: { 
                            label: (context) => `${context.parsed.y} años` 
                        } 
                    }, 
                    title: { 
                        display: true, 
                        text: `Nivel de tránsito ${transitPercent}%`, 
                        padding: { bottom: 12 }, 
                        color: "#334155", 
                        font: { size: 14, weight: "600" } 
                    } 
                }
            }
        });
    };

    const createWaterManagementChart = (canvas, alternateMaterial) => {
        const hardoquinTotal = calculateWaterData(hardoquin.permeabilidad);
        const hardoquinFiltrada = hardoquinTotal.litrosFiltrados;
        const hardoquinNoFiltrada = hardoquinTotal.litrosNoFiltrados;
        const hardoquinEvaporada = round2(hardoquinNoFiltrada * 0.15);
        const hardoquinNoFiltradaFinal = round2(hardoquinNoFiltrada - hardoquinEvaporada);
        const alternateTotal = calculateWaterData(alternateMaterial.permeabilidad);
        const alternateFiltrada = alternateTotal.litrosFiltrados;
        const alternateNoFiltrada = alternateTotal.litrosNoFiltrados;
        const alternateEvaporada = round2(alternateNoFiltrada * 0.15);
        const alternateNoFiltradaFinal = round2(alternateNoFiltrada - alternateEvaporada);

        return new Chart(canvas, {
            type: "bar",
            data: {
                labels: ["Hardoquín", alternateMaterial.nombre],
                datasets: [
                    {
                        label: "Agua filtrada (L)",
                        data: [round2(hardoquinFiltrada), round2(alternateFiltrada)],
                        backgroundColor: "#3498DB",
                        borderRadius: 6,
                        maxBarThickness: 84
                    },
                    {
                        label: "Agua evaporada (L)",
                        data: [hardoquinEvaporada, alternateEvaporada],
                        backgroundColor: "#2ECC71",
                        borderRadius: 6,
                        maxBarThickness: 84
                    },
                    {
                        label: "Agua no filtrada (L)",
                        data: [hardoquinNoFiltradaFinal, alternateNoFiltradaFinal],
                        backgroundColor: "#E74C3C",
                        borderRadius: 6,
                        maxBarThickness: 84
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false },
                        ticks: { 
                            color: "#475569", 
                            font: { size: 12 } 
                        },
                        title: { 
                            display: true, 
                            text: "Material", 
                            color: "#475569", 
                            font: { 
                                size: 12, 
                                weight: "500" 
                            }, 
                            padding: { top: 12 } 
                        }
                    },
                    y: {
                        beginAtZero: true,
                        stacked: true,
                        suggestedMax: 4000,
                        grid: { color: "rgba(15,23,42,0.08)" },
                        ticks: { 
                            color: "#475569", 
                            stepSize: 200 
                        },
                        title: { 
                            display: true, 
                            text: "Litros (L)", 
                            color: "#475569", 
                            font: { 
                                size: 12, 
                                weight: "500" 
                            }, 
                            padding: { bottom: 12 } 
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: "bottom",
                        labels: { color: "#475569", font: { size: 12 }, padding: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.dataset.label}: ${context.parsed.y} L`
                        }
                    },
                    title: {
                        display: true,
                        text: "Manejo del agua por material",
                        padding: { bottom: 12 },
                        color: "#334155",
                        font: { size: 14, weight: "600" }
                    }
                }
            }
        });
    };


    const alternateChart = createDoughnutChart(alternateCanvas, initialAlternate.permeabilidad, "#3b82f6");
    createDoughnutChart(hardoquinCanvas, hardoquin.permeabilidad, "#22c55e");
    const lifespanChart = createLifespanChart(lifespanCanvas, transitLevel, initialAlternate);
    const waterManagementChart = createWaterManagementChart(waterManagementCanvas, initialAlternate);

    const formatMaterialLabel = (value) => { 
        const normalized = value.trim().toLowerCase().replace(/-/g, " "); 
        return normalized.charAt(0).toUpperCase() + normalized.slice(1); 
    };

    const hardoquinCost = calculateTotalCost(hardoquin);
    const alternateCost = calculateTotalCost(initialAlternate);

    hardoquinCostElement.textContent = `$${formatNumberWithCommas(hardoquinCost)}`;
    alternateCostElement.textContent = `$${formatNumberWithCommas(alternateCost)}`;
    hardoquinCostDetails.textContent = `${area}m² • $${hardoquin.costoM2}/m²`;
    alternateCostDetails.textContent = `${area}m² • $${initialAlternate.costoM2}/m²`;

    savingsAmountElement.textContent = `$${formatNumberWithCommas(calculateCostDifference(hardoquinCost, alternateCost))}`;
    savingsContextElement.textContent = `vs ${initialAlternate.nombre} en ${area}m²`;


    selectMaterial.addEventListener("change", () => {
        const materialId = Number(selectMaterial.value);
        const material = materiales.find(m => m.id === materialId);
        if (!material) return;
        alternateMaterialLabel.textContent = material.nombre;
        alternateCostMaterial.textContent = `${material.nombre} - instalación inicial`;
        const { litrosFiltrados, litrosNoFiltrados } = calculateWaterData(material.permeabilidad);
        alternateChart.data.datasets[0].data = [litrosFiltrados, litrosNoFiltrados];
        alternateChart.update();
        lifespanChart.data.labels[1] = material.nombre;
        lifespanChart.data.datasets[0].data = [calculateLifespanByTransit(hardoquin, transitLevel), calculateLifespanByTransit(material, transitLevel)];
        lifespanChart.update();
        const hardoquinTotal = calculateWaterData(hardoquin.permeabilidad);
        const hardoquinFiltrada = round2(hardoquinTotal.litrosFiltrados);
        const hardoquinNoFiltrada = hardoquinTotal.litrosNoFiltrados;
        const hardoquinEvaporada = round2(hardoquinNoFiltrada * 0.15);
        const hardoquinNoFiltradaFinal = round2(hardoquinNoFiltrada - hardoquinEvaporada);
        const litrosEvaporados = round2(litrosNoFiltrados * 0.15);
        const litrosNoFiltradosFinal = round2(litrosNoFiltrados - litrosEvaporados);
        
        const harodquinCost = calculateTotalCost(hardoquin);
        const materialCost = calculateTotalCost(material);

        comparisonText.textContent = `Hardoquin permeabiliza aproximadamente ${formatNumberWithCommas(calculateWaterDifference(hardoquinFiltrada, litrosFiltrados))} L más que ${material.nombre} bajo las mismas condiciones de lluvia y tránsito`;
        comparisonHighlight.textContent = `+${formatNumberWithCommas(calculateWaterDifference(hardoquinFiltrada, litrosFiltrados))}L`;

        hardoquinCostElement.textContent = `$${formatNumberWithCommas(harodquinCost)}`;
        alternateCostElement.textContent = `$${formatNumberWithCommas(materialCost)}`;
        hardoquinCostDetails.textContent = `${area}m² • $${hardoquin.costoM2}/m²`;
        alternateCostDetails.textContent = `${area}m² • $${material.costoM2}/m²`;

        savingsAmountElement.textContent = `$${formatNumberWithCommas(calculateCostDifference(hardoquinCost, materialCost))}`;
        savingsContextElement.textContent = `vs ${material.nombre} en ${area}m²`;

        waterManagementChart.data.labels[1] = material.nombre;
        waterManagementChart.data.datasets[0].data = [
            hardoquinFiltrada,
            round2(litrosFiltrados)
        ];
        waterManagementChart.data.datasets[1].data = [
            hardoquinEvaporada,
            litrosEvaporados
        ];
        waterManagementChart.data.datasets[2].data = [
            hardoquinNoFiltradaFinal,
            litrosNoFiltradosFinal
        ];
        waterManagementChart.update();
    });
});