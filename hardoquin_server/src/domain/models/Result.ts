export interface Result {
    id: number;

    filteredWater: number;
    unfilteredWater: number;
    applicationCost: number;
    usefulLife: number;
    
    simulationId: number;
    materialId: number;
}