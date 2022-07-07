import { createAPI } from '@iannisz/node-api-kit'
import * as dotenv from 'dotenv'
dotenv.config()

const PORT = +process.env.PORT || 3000
export const api = createAPI(PORT)