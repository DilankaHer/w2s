import { createUser, getUser, updateUser } from "@/database/repositories/user.repository";
import type * as dbTypes from "@/database/database.types";

export const createUserService = async (username: string): Promise<dbTypes.UserCreated> => {
    try {
        return await createUser(username);
    } catch (error) {
        throw new Error("Failed to create user");
    }
};

export const getUserService = async (): Promise<dbTypes.User> => {
    try {
        return await getUser();
    } catch (error) {
        throw new Error("Failed to get user");
    }
};

export const updateUserService = async (username: string): Promise<dbTypes.UserUpdated> => {
    try {
        return await updateUser(username);
    } catch (error) {
        throw new Error("Failed to update user");
    }
};