import { createUser, getUser, updateUser } from "@/database/repositories/user.repository";
import * as UserTypes from "@shared/types/user.types";

export const createUserService = async (username: string): Promise<UserTypes.User> => {
    try {
        return await createUser(username);
    } catch (error) {
        throw new Error("Failed to create user");
    }
};

export const getUserService = async (): Promise<UserTypes.User | undefined> => {
    try {
        return await getUser();
    } catch (error) {
        throw new Error("Failed to get user");
    }
};

export const updateUserService = async (username: string): Promise<UserTypes.User | undefined> => {
    try {
        return await updateUser(username);
    } catch (error) {
        throw new Error("Failed to update user");
    }
};