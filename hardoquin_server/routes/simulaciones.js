const express = require('express');
const prisma = require('../prismaClient');
const materialesRouter = require('./materiales');
const {
    calculateCostDifference,
    calculateEvaporatedWater,
    calculateLifespanByTransit,
    calculateTotalCost,
    calculateUnfilteredPercentage,
    calculateWaterData,
    calculateWaterDifference,
    round2
} = require('./simulationCalculations');
const { getRelativeTime, handleError, requireFields, toNumber } = require('./helpers');

const router = express.Router();
const { formatMaterial } = materialesRouter;

function validateSimulationData(body, requireUser = false) {
    const requiredFields = ['title', 'area', 'rainLevel', 'trafficLevel'];
    if (requireUser) requiredFields.push('userId');

    requireFields(body, requiredFields);

    const area = toNumber(body.area);
    const rainLevel = toNumber(body.rainLevel);
    const trafficLevel = toNumber(body.trafficLevel);
    const userId = toNumber(body.userId);

    if (!area || area <= 0) {
        const error = new Error('El area debe ser mayor a 0.');
        error.status = 400;
        throw error;
    }

    if (rainLevel === null || rainLevel < 0 || rainLevel > 100) {
        const error = new Error('El nivel de lluvia debe estar entre 0 y 100.');
        error.status = 400;
        throw error;
    }

    if (trafficLevel === null || trafficLevel < 0 || trafficLevel > 100) {
        const error = new Error('El nivel de transito debe estar entre 0 y 100.');
        error.status = 400;
        throw error;
    }

    if (requireUser && !userId) {
        const error = new Error('El usuario es requerido para guardar la simulacion.');
        error.status = 400;
        throw error;
    }

    return {
        title: body.title.trim(),
        area,
        rainLevel,
        trafficLevel,
        userId
    };
}

async function getMaterials() {
    const materials = await prisma.materials.findMany({
        orderBy: { id: 'asc' }
    });

    return materials.map(formatMaterial);
}

async function generateSimulationResults(data) {
    const materials = await getMaterials();

    if (materials.length === 0) {
        const error = new Error('No hay materiales disponibles para simular.');
        error.status = 400;
        throw error;
    }

    const hardoquin = materials.find((material) => material.name.toLowerCase() === 'hardoquin');

    if (!hardoquin) {
        const error = new Error('No se encontro el material Hardoquin.');
        error.status = 400;
        throw error;
    }

    const hardoquinWaterData = calculateWaterData(hardoquin.permeability, data.area, data.rainLevel);
    const hardoquinCost = calculateTotalCost(hardoquin.costPerM2, data.area);

    return materials.map((material) => {
        const waterData = calculateWaterData(material.permeability, data.area, data.rainLevel);
        const usefulLife = calculateLifespanByTransit(material.usefulLife, data.trafficLevel);
        const applicationCost = calculateTotalCost(material.costPerM2, data.area);
        const isHardoquin = material.id === hardoquin.id;

        return {
            materialId: material.id,
            materialName: material.name,
            filteredWater: waterData.filteredWater,
            unfilteredWater: waterData.unfilteredWater,
            evaporatedWater: waterData.evaporatedWater,
            finalUnfilteredWater: waterData.finalUnfilteredWater,
            usefulLife,
            applicationCost,
            ...(isHardoquin ? {} : {
                savingsVsHardoquin: calculateCostDifference(hardoquinCost, applicationCost),
                filteredWaterVsHardoquin: calculateWaterDifference(hardoquinWaterData.filteredWater, waterData.filteredWater)
            })
        };
    });
}

function formatStoredResult(result, hardoquinResult) {
    const material = formatMaterial(result.materials);
    const filteredWater = Number(result.filtered_water);
    const unfilteredWater = Number(result.unfiltered_water);
    const applicationCost = Number(result.application_cost);
    const isHardoquin = material.name.toLowerCase() === 'hardoquin';

    return {
        id: result.id,
        materialId: material.id,
        materialName: material.name,
        filteredWater,
        unfilteredWater,
        evaporatedWater: calculateEvaporatedWater(unfilteredWater),
        finalUnfilteredWater: round2(unfilteredWater - calculateEvaporatedWater(unfilteredWater)),
        usefulLife: result.useful_life,
        applicationCost,
        ...(isHardoquin || !hardoquinResult ? {} : {
            savingsVsHardoquin: calculateCostDifference(hardoquinResult.applicationCost, applicationCost),
            filteredWaterVsHardoquin: calculateWaterDifference(hardoquinResult.filteredWater, filteredWater)
        })
    };
}

async function getSimulationDetails(simulationId) {
    const simulation = await prisma.simulations.findUnique({
        where: { id: simulationId },
        include: {
            results: {
                include: { materials: true },
                orderBy: { material_id: 'asc' }
            }
        }
    });

    if (!simulation) return null;

    const hardoquinRawResult = simulation.results.find((result) => {
        return result.materials.name.toLowerCase() === 'hardoquin';
    });
    const hardoquinResult = hardoquinRawResult ? {
        filteredWater: Number(hardoquinRawResult.filtered_water),
        applicationCost: Number(hardoquinRawResult.application_cost)
    } : null;

    return {
        simulationId: simulation.id,
        simulationTitle: simulation.title,
        title: simulation.title,
        area: simulation.area,
        rainLevel: simulation.rain_level,
        trafficLevel: simulation.traffic_level,
        relativeCreatedDate: getRelativeTime(simulation.created_at),
        results: simulation.results.map((result) => formatStoredResult(result, hardoquinResult))
    };
}

async function getSimulationSummary(simulation) {
    const details = await getSimulationDetails(simulation.id);
    if (!details) return null;

    const hardoquinResult = details.results.find((result) => result.materialName.toLowerCase() === 'hardoquin');
    const asphaltResult = details.results.find((result) => result.materialName.toLowerCase() === 'asfalto');

    return {
        simulationId: details.simulationId,
        simulationTitle: details.simulationTitle,
        area: details.area,
        relativeCreatedDate: details.relativeCreatedDate,
        hardoquinUnfilteredPercentage: hardoquinResult
            ? calculateUnfilteredPercentage(hardoquinResult.unfilteredWater, hardoquinResult.filteredWater + hardoquinResult.unfilteredWater)
            : 0,
        asphaltUnfilteredPercentage: asphaltResult
            ? calculateUnfilteredPercentage(asphaltResult.unfilteredWater, asphaltResult.filteredWater + asphaltResult.unfilteredWater)
            : 0
    };
}

router.post('/simular', async (req, res) => {
    try {
        const data = validateSimulationData(req.body);
        const results = await generateSimulationResults(data);

        res.json({
            ok: true,
            simulationTitle: data.title,
            area: data.area,
            rainLevel: data.rainLevel,
            trafficLevel: data.trafficLevel,
            results
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.get('/materiales/todos', async (_req, res) => {
    try {
        res.json({
            ok: true,
            materials: await getMaterials()
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.get('/materiales', async (_req, res) => {
    try {
        res.json({
            ok: true,
            materials: await getMaterials()
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.post('/', async (req, res) => {
    try {
        const data = validateSimulationData(req.body, true);
        const results = await generateSimulationResults(data);

        const simulation = await prisma.$transaction(async (tx) => {
            const createdSimulation = await tx.simulations.create({
                data: {
                    title: data.title,
                    area: data.area,
                    rain_level: data.rainLevel,
                    traffic_level: data.trafficLevel,
                    user_id: data.userId
                }
            });

            await tx.results.createMany({
                data: results.map((result) => ({
                    filtered_water: result.filteredWater,
                    unfiltered_water: result.unfilteredWater,
                    application_cost: result.applicationCost,
                    useful_life: result.usefulLife,
                    simulation_id: createdSimulation.id,
                    material_id: result.materialId
                }))
            });

            return createdSimulation;
        });

        res.status(201).json({
            ok: true,
            simulationId: simulation.id,
            simulationTitle: simulation.title,
            area: simulation.area,
            rainLevel: simulation.rain_level,
            trafficLevel: simulation.traffic_level,
            results
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.get('/usuario/:userId', async (req, res) => {
    try {
        const userId = toNumber(req.params.userId);
        if (!userId) return res.status(400).json({ ok: false, message: 'ID de usuario invalido.' });

        const search = (req.query.search || '').toString().trim();
        const simulations = await prisma.simulations.findMany({
            where: {
                user_id: userId,
                ...(search ? { title: { contains: search, mode: 'insensitive' } } : {})
            },
            orderBy: { created_at: 'desc' }
        });
        const summaries = (await Promise.all(simulations.map(getSimulationSummary))).filter(Boolean);

        res.json({
            ok: true,
            simulations: summaries
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.get('/:id', async (req, res) => {
    try {
        const id = toNumber(req.params.id);
        if (!id) return res.status(400).json({ ok: false, message: 'ID invalido.' });

        const simulation = await getSimulationDetails(id);
        if (!simulation) return res.status(404).json({ ok: false, message: 'Simulacion no encontrada.' });

        res.json({
            ok: true,
            simulation
        });
    } catch (error) {
        handleError(res, error);
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const id = toNumber(req.params.id);
        if (!id) return res.status(400).json({ ok: false, message: 'ID invalido.' });

        const deletedSimulation = await prisma.simulations.deleteMany({ where: { id } });

        if (deletedSimulation.count === 0) {
            return res.status(404).json({
                ok: false,
                message: 'Simulacion no encontrada.'
            });
        }

        res.json({
            ok: true,
            message: 'Simulacion eliminada.'
        });
    } catch (error) {
        handleError(res, error);
    }
});

module.exports = router;
