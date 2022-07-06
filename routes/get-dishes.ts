import { api } from '../api'
import { getAllDishes } from '../repositories/dishes'

/**
 * Responds with a list of all dishes to the client.
 */
api.get('/get-dishes', (_req, res) =>
{
	res.end(JSON.stringify(getAllDishes()))
})