import { RoleValues } from '../config/roles';

export interface User {
  _id: string;
  email: string;
  name?: string;
  role?: RoleValues;
  teamIds?: string[];
  status?: 'active' | 'pending';
  createdAt: string;
  updatedAt: string;
}
