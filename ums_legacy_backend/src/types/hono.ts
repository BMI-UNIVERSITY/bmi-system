import type { JWTPayload } from './index.js';

export interface AppEnv {
  Variables: {
    user?: JWTPayload;
  };
}






