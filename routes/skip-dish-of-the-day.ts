import { readJSONBody } from '@iannisz/node-api-kit'
import { api } from '../api.js'
import { getDishOfTheDay, skipDishOfTheDay } from '../repositories/dishes.js'

/**
 * Responds with the dish of the day to the client.
 */
api.post('/skip-dish-of-the-day', async (req, res) =>
{
	const { userId } = await readJSONBody(req) as { userId: string }
	skipDishOfTheDay()

	const dish = getDishOfTheDay(userId)

	console.log('[`/skip-dish-of-the-day` Endpoint]', dish)

	res.end(JSON.stringify(dish))
})