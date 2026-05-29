import { Like } from "../models/Like";

export interface LikeRepository {
    create(like: Omit<Like, "id">): Promise<Like>;

    getByPostIdAndUserId(postId: number, userId: number): Promise<Like | null>;

    getPostLikesCount(postId: number): Promise<number>;

    delete(postId: number, userId: number): Promise<void>;
}