import mongoose, { Document, Schema } from 'mongoose';
import { isPasswordHash } from '../utils/password';
import { randomUUID } from 'crypto';
import { ROLES } from 'shared';

export interface IUser extends Document {
  email: string;
  password: string;
  createdAt: Date;
  lastLoginAt: Date;
  isActive: boolean;
  role: string;
  refreshToken: string;
}

const schema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    index: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    validate: { validator: isPasswordHash, message: 'Invalid password hash' },
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
  lastLoginAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  role: {
    type: String,
    enum: [ROLES.ADMIN, ROLES.USER],
    default: ROLES.USER,
  },
  refreshToken: {
    type: String,
    unique: true,
    index: true,
    default: () => randomUUID(),
  },
}, {
  versionKey: false,
});

schema.set('toJSON', {
  transform: (doc: Document, ret: Record<string, unknown>) => {
    delete ret.password;
    return ret;
  },
});

const User = mongoose.model<IUser>('User', schema);

export default User;
