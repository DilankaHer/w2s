import { createSession, deleteSession, getSessionById, getSessions, updateSession } from "@/database/repositories/sessions.repository";
import type * as dbTypes from "@/database/database.types";
import { UpdateSessionInput } from "@/database/interfaces/session.interfaces";

export const getSessionsService = async (): Promise<dbTypes.Sessions> => {
    try {
        return await getSessions();
    } catch (error) {
        throw new Error("Failed to get sessions");
    }
};

export const getSessionByIdService = async (id: string): Promise<dbTypes.SessionById> => {
    try {
        return await getSessionById(id);
    } catch (error) {
        throw new Error("Failed to get session");
    }
};

export const createSessionService = async (sessionId: string, workoutId: string): Promise<dbTypes.SessionCreated> => {
    try {
        return await createSession(sessionId, workoutId);
    } catch (error) {
        console.error(error);
        throw new Error("Failed to create session");
    }
};

export const updateSessionService = async (session: UpdateSessionInput): Promise<dbTypes.SessionUpdated> => {
    try {
        return await updateSession(session);
    } catch (error) {
        throw new Error("Failed to update session");
    }
};

export const deleteSessionService = async (id: string): Promise<string> => {
    try {
        await deleteSession(id);
        return "Session deleted successfully";
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to delete session");
    }
};