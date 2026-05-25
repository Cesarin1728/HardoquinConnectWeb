import { formatNumberWithCommas } from "./calculations.js";

export const centerTextPlugin = {
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

export const createDoughnutChart = (canvas, permeabilidad, color, area, litrosBasePorMetro, nivelLluvia) => {
  const litrosTotales = area * litrosBasePorMetro * (nivelLluvia / 100);
  const litrosFil = Math.round(litrosTotales * permeabilidad);
  const litrosNo = litrosTotales - litrosFil;
  return new Chart(canvas, {
    type: "doughnut",
    plugins: [centerTextPlugin],
    data: { labels: ["Agua filtrada", "Agua no filtrada"], datasets: [{ data: [litrosFil, litrosNo], backgroundColor: [color, "#e5e7eb"], borderWidth: 0, hoverOffset: 5, borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: "75%", animation: { duration: 800 }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `${Math.round(context.raw)} L` } } } }
  });
};

export const createLifespanChart = (canvas, transitPercent, alternateMaterial, calculateLifespanByTransit, hardoquin) => {
  const hardoquinLife = calculateLifespanByTransit(hardoquin, transitPercent);
  const alternateLife = calculateLifespanByTransit(alternateMaterial, transitPercent);
  return new Chart(canvas, {
    type: "bar",
    data: { labels: ["Hardoquín", alternateMaterial.nombre], datasets: [{ label: "Vida útil (años)", data: [hardoquinLife, alternateLife], backgroundColor: ["#22c55e", "#3b82f6"], borderRadius: 6, maxBarThickness: 54 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { x: { grid: { display: false }, ticks: { color: "#475569", font: { size: 12 } }, title: { display: true, text: "Material", color: "#475569", font: { size: 12, weight: "500" }, padding: { top: 12 } } }, y: { beginAtZero: true, suggestedMax: 50, grid: { color: "rgba(15,23,42,0.08)" }, ticks: { color: "#475569", stepSize: 10 }, title: { display: true, text: "Durabilidad (años)", color: "#475569", font: { size: 12, weight: "500" }, padding: { bottom: 12 } } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `${context.parsed.y} años` } }, title: { display: true, text: `Nivel de tránsito ${transitPercent}%`, padding: { bottom: 12 }, color: "#334155", font: { size: 14, weight: "600" } } }
    }
  });
};

export const createWaterManagementChart = (canvas, alternateMaterial, calculateWaterData, round2, area, litrosBasePorMetro, nivelLluvia, hardoquin) => {
  const hardoquinTotal = calculateWaterData(hardoquin.permeabilidad, area, litrosBasePorMetro, nivelLluvia);
  const hardoquinFiltrada = hardoquinTotal.litrosFiltrados;
  const hardoquinNoFiltrada = hardoquinTotal.litrosNoFiltrados;
  const hardoquinEvaporada = round2(hardoquinNoFiltrada * 0.15);
  const hardoquinNoFiltradaFinal = round2(hardoquinNoFiltrada - hardoquinEvaporada);
  const alternateTotal = calculateWaterData(alternateMaterial.permeabilidad, area, litrosBasePorMetro, nivelLluvia);
  const alternateFiltrada = alternateTotal.litrosFiltrados;
  const alternateNoFiltrada = alternateTotal.litrosNoFiltrados;
  const alternateEvaporada = round2(alternateNoFiltrada * 0.15);
  const alternateNoFiltradaFinal = round2(alternateNoFiltrada - alternateEvaporada);

  return new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["Hardoquín", alternateMaterial.nombre],
      datasets: [
        { label: "Agua filtrada (L)", data: [round2(hardoquinFiltrada), round2(alternateFiltrada)], backgroundColor: "#3498DB", borderRadius: 6, maxBarThickness: 84 },
        { label: "Agua evaporada (L)", data: [hardoquinEvaporada, alternateEvaporada], backgroundColor: "#2ECC71", borderRadius: 6, maxBarThickness: 84 },
        { label: "Agua no filtrada (L)", data: [hardoquinNoFiltradaFinal, alternateNoFiltradaFinal], backgroundColor: "#E74C3C", borderRadius: 6, maxBarThickness: 84 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { x: { stacked: true, grid: { display: false }, ticks: { color: "#475569", font: { size: 12 } }, title: { display: true, text: "Material", color: "#475569", font: { size: 12, weight: "500" }, padding: { top: 12 } } }, y: { beginAtZero: true, stacked: true, suggestedMax: 4000, grid: { color: "rgba(15,23,42,0.08)" }, ticks: { color: "#475569", stepSize: 200 }, title: { display: true, text: "Litros (L)", color: "#475569", font: { size: 12, weight: "500" }, padding: { bottom: 12 } } } },
      plugins: { legend: { display: true, position: "bottom", labels: { color: "#475569", font: { size: 12 }, padding: 16 } }, tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${context.parsed.y} L` } }, title: { display: true, text: "Manejo del agua por material", padding: { bottom: 12 }, color: "#334155", font: { size: 14, weight: "600" } } }
    }
  });
};
