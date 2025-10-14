{% if options.db_type == 'nosql' %}
import mongoose from 'mongoose';

const dbInit = async (options: Record<string, unknown> = {}): Promise<void> => {
  const mongoUrl = process.env.DATABASE_URL || 'mongodb://localhost/myDb';

  try {
    await mongoose.connect(mongoUrl, options);
    console.log(`Connected to MongoDB at ${mongoUrl}`);
  } catch (err) {
    console.error(`Error connecting to database ${mongoUrl}:`, err);
    throw err;
  }
};

export default dbInit;
{% endif %}
{% if options.db_type == 'sql' %}
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

{% if options.auth %}
const User = prisma.user;
export default User;
{% endif %}
{% endif %}