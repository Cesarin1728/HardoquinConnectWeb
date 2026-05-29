import { User } from "../models/User";

export interface UserRepository {
    create(user: Omit<User, "id">): Promise<User>;

    getById(id: number): Promise<User | null>;

    getByEmail(email: string): Promise<User | null>;

    getByUsername(username: string): Promise<User | null>;

    delete(id: number): Promise<void>;
}