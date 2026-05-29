import { Simulation } from "../models/Simulation";

export interface SimulationRepository {
    create(simulation: Omit<Simulation, "id" | "createdAt">): Promise<Simulation>;

    getById(id: number): Promise<Simulation | null>;

    getByUserId(userId: number): Promise<Simulation[]>;

    delete(id: number): Promise<void>;

    searchByTitle(userId: number, titleQuery: string): Promise<Simulation[]>;
}