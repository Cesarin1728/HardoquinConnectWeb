import { Reply } from "../models/Reply";

export interface ReplyRepository {
    create(reply: Omit<Reply, "id" | "createdAt">): Promise<Reply>;

    getByPostId(postId: number): Promise<Reply[]>;

    getById(id: number): Promise<Reply | null>;

    delete(id: number): Promise<void>;
}