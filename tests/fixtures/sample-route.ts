import { z } from 'zod';

export const usersRouter = {
  profile: {
    method: 'query',
    input: z.object({}),
    output: z.object({ id: z.string(), name: z.string() }),
  },
  update: {
    method: 'mutation',
    input: z.object({ name: z.string() }),
    output: z.object({ id: z.string(), name: z.string() }),
  },
};
