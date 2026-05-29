export interface CreateSimulationDTO {
    title: string;
    area: number;
    rainLevel: number;
    trafficLevel: number;
    userId: number;
}

export interface CreateSimulationResponseDTO {
    simulationTitle: string;
    area: number;
    rainLevel: number;
    trafficLevel: number;
    results: SimulationResultDTO[];
}

export interface SimulationResultDTO {
    materialId: number;
    materialName: string;
    filteredWater: number;
    unfilteredWater: number;
    evaporatedWater: number;
    finalUnfilteredWater: number;
    usefulLife: number;
    applicationCost: number;
    savingsVsHardoquin?: number;
    filteredWaterVsHardoquin?: number;
}

export interface SimulationSummaryDTO {
    simulationId: number;
    simulationTitle: string;
    area: number;
    relativeCreatedDate: string;
    hardoquinUnfilteredPercentage: number;
    asphaltUnfilteredPercentage: number;
}
