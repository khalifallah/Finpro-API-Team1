import { PrismaClient } from '../generated/prisma-client';
import { CreateUserRequest , UpdateUserRequest, UserResponse } from '../types/user.types';
import { hashPassword } from '../libs/bcrypt';

const prisma = new PrismaClient();

export const getAllUsers = async (): Promise<UserResponse[]> => {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            storeId: true,
            createdAt: true
        },
    });
    return users;
}

export const getStoreAdmins = async (): Promise<UserResponse[]> => {
    const users = await prisma.user.findMany({
        where: {role: "STORE_ADMIN"},
        select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            storeId: true,
            createdAt: true
        },
    });
    return users;
};

export const createStoreAdmin = async (data: CreateUserRequest) : Promise<UserResponse> => {
    const hashedPassword = await hashPassword(data.password);
    const user = await prisma.user.create({
        data: {
            fullName: data.fullName,
            email: data.email,
            passwordHash: hashedPassword,
            role: "STORE_ADMIN",
            storeId: data.storeId,
        },
        select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            storeId: true,
            createdAt: true
        },
    });
    return user;
};

export const updateUser = async (id: number , data: UpdateUserRequest) => {
    const user = await prisma.user.update({
        where: {id},
        data,
        select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            storeId: true,
            createdAt: true
        },
    });
    return user;
};

export const deleteUser = async (id: number): Promise<void> => {
    await prisma.user.delete({where: {id}});
};