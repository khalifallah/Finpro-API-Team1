import { Request, Response } from 'express';
import * as userService from '../services/user.service';

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await userService.getAllUsers();
        res.json(users);
    } catch (err) {
        res.status(500).json({error: "Internal Server Error"});
    }
};

export const getStoreAdmins = async (req: Request, res: Response) => {
    try {
        const admins = await userService.getStoreAdmins();
        res.json(admins);
    } catch (err) {
        res.status(500).json({error: "Internal Server Error"});
    }
};

export const createStoreAdmin = async (req: Request, res: Response) => {
    try {
        const user = await userService.createStoreAdmin(req.body);
        res.status(201).json(user);
    } catch (err) {
        res.status(400).json({error: "Bad Request"});    
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        const user = await userService.updateUser(parseInt(req.params.id), req.body);
        res.json(user);
    } catch (err) {
        res.status(400).json({error: "Bad Request"});
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        await userService.deleteUser(parseInt(req.params.id));
        res.status(204).send();
    } catch (err) {
        res.status(400).json({error: "Bad Request"});
    }
};