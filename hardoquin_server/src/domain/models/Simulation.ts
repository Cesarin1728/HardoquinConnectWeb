export interface Simulation {
    id: number;

    title: string;
    createdAt: Date;
    area: number;
    rainLevel: number;
    trafficLevel: number;
    
    userId: number;
}