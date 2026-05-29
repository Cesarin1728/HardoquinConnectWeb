import { Result } from "../models/Result";

export interface ResultRepository {
    create(result: Omit<Result, "id">): Promise<Result>;

    getBySimulationId(simulationId: number): Promise<Result[]>;

    getBySimulationIdAndMaterialId(simulationId: number, materialId: number): Promise<Result | null>;
}