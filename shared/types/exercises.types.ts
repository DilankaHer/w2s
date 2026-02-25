export interface Exercise {
    id: string;
    name: string;
    link?: string | null;
    info?: string | null;
    imageName?: string | null;
    bodyPart: BodyPart | null;
    equipment: Equipment | null;
    isDefaultExercise: boolean;
    isSynced?: boolean;
}

export interface BodyPart {
    id: string;
    name: string;
}

export interface Equipment {
    id: string;
    name: string;
}