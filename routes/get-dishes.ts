import { api } from '../api.js'
import { getAllDishes } from '../repositories/dishes.js'

/**
 * Responds with a list of all dishes to the client.
 */
api.get('/get-dishes', (req, res) =>
{
	const url = new URL(req.url, 'http://localhost')
	const userId = url.searchParams.get('userId')

	const dishes = getAllDishes(userId)

	console.log('[`/get-dishes` Endpoint]', dishes)

	res.end(JSON.stringify(dishes))
})