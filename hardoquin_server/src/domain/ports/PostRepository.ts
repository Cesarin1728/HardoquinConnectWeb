import { Post } from "../models/Post";

export interface PostRepository {
    create(post: Omit<Post, "id" | "createdAt">): Promise<Post>;

    getById(id: number): Promise<Post | null>;

    getByCategory(category: string): Promise<Post[]>;

    getAll(): Promise<Post[]>;

    delete(id: number): Promise<void>;

    search(query: string): Promise<Post[]>;
}