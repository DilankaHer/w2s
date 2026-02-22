import { createSession, deleteSession, getSessionById, getSessions, updateSession } from "@/database/repositories/sessions.repository";
import type * as SessionTypes from "@shared/types/sessions.types";

export const getSessionsService = async (): Promise<SessionTypes.Session[]> => {
    try {
        return await getSessions();
    } catch (error) {
        throw new Error("Failed to get sessions");
    }
};

export const getSessionByIdService = async (id: string): Promise<SessionTypes.SessionWithExercises | undefined> => {
    try {
        return await getSessionById(id);
    } catch (error) {
        throw new Error("Failed to get session");
    }
};

export const createSessionService = async (sessionId: string, workoutId: string): Promise<SessionTypes.SessionWithExercises | undefined> => {
    try {
        return await createSession(sessionId, workoutId);
    } catch (error) {
        console.error(error);
        throw new Error("Failed to create session");
    }
};

export const updateSessionService = async (session: SessionTypes.SessionWithExercises): Promise<SessionTypes.SessionWithExercises | undefined> => {
    try {
        return await updateSession(session);
    } catch (error) {
        throw new Error("Failed to update session");
    }
};

export const deleteSessionService = async (id: string): Promise<void> => {
    try {
        await deleteSession(id);
    } catch (error) {
        throw new Error("Failed to delete session");
    }
};