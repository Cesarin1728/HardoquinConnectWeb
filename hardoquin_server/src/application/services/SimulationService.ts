import { MaterialRepository } from "../../domain/ports/MaterialRepository";
import { ResultRepository } from "../../domain/ports/ResultRepository";
import { SimulationRepository } from "../../domain/ports/SimulationRepository";

import {
    CreateSimulationDTO,
    CreateSimulationResponseDTO,
    SimulationResultDTO,
    SimulationSummaryDTO
} from "../dtos/SimulationDTOs";

import {
    calculateCostDifference,
    calculateLifespanByTransit,
    calculateTotalCost,
    calculateWaterData,
    calculateWaterDifference,
    calculateEvaporatedWater,
    calculateUnfilterdPercentage,
    getRelativeTime
} from "./calculations";

export class SimulationService {
    constructor(
        private simulationRepository: SimulationRepository,
        private resultRepository: ResultRepository,
        private materialRepository: MaterialRepository
    ) {}

    // Simulate WITHOUT saving
    async simulate(data: CreateSimulationDTO): Promise<CreateSimulationResponseDTO> {
        this.validateSimulationData(data);

        const results = await this.generateSimulationResults(data);

        return {
            simulationTitle: data.title,
            area: data.area,
            rainLevel: data.rainLevel,
            trafficLevel: data.trafficLevel,
            results
        };
    }

    // Simulate AND save
    async saveSimulation(data: CreateSimulationDTO): Promise<CreateSimulationResponseDTO> {
        this.validateSimulationData(data);
        if (!data.userId) {
            throw new Error("User ID is required to save simulations");
        }
        const results = await this.generateSimulationResults(data);

        const simulation = await this.simulationRepository.create({
            title: data.title,
            area: data.area,
            rainLevel: data.rainLevel,
            trafficLevel: data.trafficLevel,
            userId: data.userId
        });

        for(const result of results) {

            await this.resultRepository.create({
                simulationId: simulation.id,
                materialId: result.materialId,
                filteredWater: result.filteredWater,
                unfilteredWater: result.unfilteredWater,
                usefulLife: result.usefulLife,
                applicationCost: result.applicationCost
            });
        }

        return {
            simulationTitle: simulation.title,
            area: simulation.area,
            rainLevel: simulation.rainLevel,
            trafficLevel: simulation.trafficLevel,
            results
        };
    }

    async getSimulationsByUser(userId: number): Promise<SimulationSummaryDTO[]> {
        const simulations = await this.simulationRepository.getByUserId(userId);

        const summaries: SimulationSummaryDTO[] = [];

        for (const sim of simulations) {
            const summary = await this.generateSimulationSummary(sim.id);
            summaries.push(summary);
        }
        return summaries;        
    }

    async deleteSimulation(simulationId: number): Promise<void> {
        await this.simulationRepository.delete(simulationId);
    }

    async searchSimulationsByTitle(userId: number, titleQuery: string): Promise<SimulationSummaryDTO[]> {
        const simulations = await this.simulationRepository.searchByTitle(userId, titleQuery);

        const summaries: SimulationSummaryDTO[] = [];

        for (const sim of simulations) {
            const summary = await this.generateSimulationSummary(sim.id);
            summaries.push(summary);
        }
        return summaries;
    }

    async getSimulationDetails(simulationId: number): Promise<CreateSimulationResponseDTO> {
            const simulation = await this.simulationRepository.getById(simulationId);

        if (!simulation) {
            throw new Error("Simulation not found");
        }

        const resultsData = await this.resultRepository.getBySimulationId(simulationId);
        const materials = await this.materialRepository.getAll();

        const results: SimulationResultDTO[] = [];

        const hardoquinResult = resultsData.find(r => {
            const m = materials.find(m => m.id === r.materialId);
            return m?.name.toLowerCase() === "hardoquin";
        });
        const hardoquinMaterial = materials.find(m => m.name.toLowerCase() === "hardoquin");
        if (!hardoquinResult || !hardoquinMaterial) {
            throw new Error("Hardoquin baseline not found");
        }
        const hardoquinCost = hardoquinResult.applicationCost;
        const hardoquinWater = hardoquinResult.filteredWater;

        for (const result of resultsData) {
            const material = materials.find(m => m.id === result.materialId);
            if (!material) {
                throw new Error(`Material with ID ${result.materialId} not found`);
            }

            this.validateMaterial(material);
            const isHardoquin = material.name.toLowerCase() === "hardoquin";

            results.push({
                materialId: result.materialId,
                materialName: material.name,
                filteredWater: result.filteredWater,
                unfilteredWater: result.unfilteredWater,
                evaporatedWater: calculateEvaporatedWater(result.unfilteredWater),
                finalUnfilteredWater: result.unfilteredWater - calculateEvaporatedWater(result.unfilteredWater),
                usefulLife: result.usefulLife,
                applicationCost: result.applicationCost,
                // solo para no-hardoquin
                ...(isHardoquin
                    ? {}
                    : {
                        savingsVsHardoquin: calculateCostDifference(
                            hardoquinCost,
                            result.applicationCost
                        ),
                        filteredWaterVsHardoquin: calculateWaterDifference(
                            hardoquinWater,
                            result.filteredWater
                        )
                    })
            });
        }
        return {
            simulationTitle: simulation.title,
            area: simulation.area,
            rainLevel: simulation.rainLevel,
            trafficLevel: simulation.trafficLevel,
            results
        };
    }

    private validateSimulationData(data: CreateSimulationDTO): void {
        if (!data.title.trim()) {
            throw new Error("Title is required");
        }
        if (data.area <= 0) {
            throw new Error("Area must be greater than 0");
        }
        if (data.rainLevel < 0 || data.rainLevel > 100) {
            throw new Error("Rain level must be between 0 and 100");
        }
        if (data.trafficLevel < 0 || data.trafficLevel > 100) {
            throw new Error("Traffic level must be between 0 and 100");
        }
    }

    private validateMaterial(material: {usefulLife: number; costPerM2: number; permeability: number; id: number;}): void {
        if (material.usefulLife <= 0) {
            throw new Error(`Invalid useful life for material ${material.id}`);
        }
        if (material.costPerM2 <= 0) {
            throw new Error(`Invalid cost for material ${material.id}`);
        }
        if (material.permeability < 0 || material.permeability > 1) {
            throw new Error(`Invalid permeability for material ${material.id}`);
        }
    }

    private async generateSimulationResults(data: CreateSimulationDTO): Promise<SimulationResultDTO[]> {

        const materials = await this.materialRepository.getAll();

        if (materials.length === 0) {
            throw new Error("No materials available for simulation");
        }

        const hardoquin = materials.find(material => material.name.toLowerCase() === "hardoquin");

        if (!hardoquin) {
            throw new Error("Hardoquin material not found");
        }

        this.validateMaterial(hardoquin);
        // Hardoquin base calculations
        const hardoquinWaterData = calculateWaterData(hardoquin.permeability, data.area, data.rainLevel);
        const hardoquinEvaporated = calculateEvaporatedWater(hardoquinWaterData.unfilteredWater);
        const hardoquinUsefulLife = calculateLifespanByTransit(hardoquin.usefulLife, data.trafficLevel);
        const hardoquinCost = calculateTotalCost(hardoquin.costPerM2, data.area);

        const simulationResults: SimulationResultDTO[] = [];

        // Add Hardoquin first
        simulationResults.push({
            materialId: hardoquin.id,
            materialName: hardoquin.name,
            filteredWater: hardoquinWaterData.filteredWater,
            unfilteredWater: hardoquinWaterData.unfilteredWater,
            evaporatedWater: hardoquinWaterData.evaporatedWater,
            finalUnfilteredWater: hardoquinWaterData.finalUnfilteredWater,
            usefulLife: hardoquinUsefulLife,
            applicationCost: hardoquinCost
        });

        // Process remaining materials
        for (const material of materials) {

            if (material.id === hardoquin.id) {
                continue;
            }

            this.validateMaterial(material);
            const waterData = calculateWaterData(material.permeability, data.area, data.rainLevel);
            const usefulLife = calculateLifespanByTransit(material.usefulLife, data.trafficLevel);
            const totalCost = calculateTotalCost( material.costPerM2, data.area);

            simulationResults.push({
                materialId: material.id,
                materialName: material.name,
                filteredWater: waterData.filteredWater,
                unfilteredWater: waterData.unfilteredWater,
                evaporatedWater: waterData.evaporatedWater,
                finalUnfilteredWater: waterData.finalUnfilteredWater,
                usefulLife:usefulLife,
                applicationCost: totalCost,
                savingsVsHardoquin: calculateCostDifference( hardoquinCost, totalCost),
                filteredWaterVsHardoquin: calculateWaterDifference(hardoquinWaterData.filteredWater, waterData.filteredWater)
            });
        }

        return simulationResults;
    }

    private async generateSimulationSummary(simulationId: number): Promise<SimulationSummaryDTO> {
        const simulation = await this.simulationRepository.getById(simulationId);
        if (!simulation) {
            throw new Error("Simulation not found");
        }

        const materials = await this.materialRepository.getAll();

        const hardoquin = materials.find(material => material.name.toLowerCase() === "hardoquin");
        const asphalt = materials.find(material => material.name.toLowerCase() === "asfalto");

        if (!hardoquin || !asphalt) {
            throw new Error("No se encontraron los materiales hardoquin y asfalto");
        }

        const results = await this.resultRepository.getBySimulationId(simulation.id);
        const hardoquinResult = results.find(result => result.materialId === hardoquin.id);
        const asphaltResult = results.find(result => result.materialId === asphalt.id);

        if (!hardoquinResult || !asphaltResult) {
            throw new Error("No se encontraron resultados para hardoquin o asfalto en esta simulación");
        }

        const hardoquinTotalWater = hardoquinResult.filteredWater + hardoquinResult.unfilteredWater;
        const asphaltTotalWater = asphaltResult.filteredWater + asphaltResult.unfilteredWater;
        const hardoquinUnfilteredPercentage = calculateUnfilterdPercentage(hardoquinResult.unfilteredWater, hardoquinTotalWater);
        const asphaltUnfilteredPercentage = calculateUnfilterdPercentage(asphaltResult.unfilteredWater, asphaltTotalWater);

        return {
            simulationId: simulation.id,
            simulationTitle: simulation.title,
            area: simulation.area,
            relativeCreatedDate: getRelativeTime(simulation.createdAt),
            hardoquinUnfilteredPercentage,
            asphaltUnfilteredPercentage
        }
    }
    
}
