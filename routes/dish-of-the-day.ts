import { api } from '../api.js'
import { getDishOfTheDay } from '../repositories/dishes.js'

/**
 * Responds with the dish of the day to the client.
 */
api.get('/dish-of-the-day', (req, res) =>
{
	const url = new URL(req.url, 'http://localhost')
	const userId = url.searchParams.get('userId')
	const dish = getDishOfTheDay(userId)

	console.log('[`/get-dish-of-the-day` Endpoint]', { userId }, dish)

	res.end(JSON.stringify(dish))
})