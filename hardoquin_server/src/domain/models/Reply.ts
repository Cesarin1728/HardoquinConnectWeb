export interface Reply {
    id: number;

    message: string;
    createdAt: Date;
    
    postId: number;
    userId: number;
}