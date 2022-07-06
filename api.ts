import { createAPI } from '@iannisz/node-api-kit'

const PORT = +process.env.PORT || 3000
export const api = createAPI(PORT)