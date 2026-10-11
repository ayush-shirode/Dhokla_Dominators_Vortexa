import { Router, Request, Response } from 'express';
import { User, createSuccessResponse } from '@repo/shared';

export const userRouter = Router();

const sampleUsers: User[] = [
  {
    id: '1',
    name: 'Ayush Shirode',
    email: 'ayush@example.com',
    role: 'admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Team Member',
    email: 'dhokla.dominators@example.com',
    role: 'user',
    createdAt: new Date().toISOString(),
  },
];

userRouter.get('/', (_req: Request, res: Response) => {
  res.json(createSuccessResponse(sampleUsers, 'Users fetched successfully'));
});
