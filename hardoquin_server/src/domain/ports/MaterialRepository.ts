import { Material } from "../models/Material";

export interface MaterialRepository {
    getAll(): Promise<Material[]>;

    getById(id: number): Promise<Material | null>;
}