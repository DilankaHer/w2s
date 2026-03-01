export interface CreateExerciseInput {
    name: string;
    bodyPartId: string;
    equipmentId: string;
    link: string;
    info: string;
}

export interface UpdateExerciseInput {
    id: string;
    name: string;
    bodyPartId: string;
    equipmentId: string;
    link: string;
    info: string;   
}