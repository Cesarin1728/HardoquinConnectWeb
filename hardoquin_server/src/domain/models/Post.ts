export interface Post {
    id: number;

    title: string | null;
    category: string;
    createdAt: Date;
    message: string;
    
    userId: number;
}