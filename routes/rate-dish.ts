import { readJSONBody } from '@iannisz/node-api-kit'
import { api } from '../api.js'
import { DishRatingRequest, rateDish } from '../repositories/dishes.js'

/**
 * Rates the dish.
 */
api.post('/rate-dish', async (req, res) =>
{
	console.log('[`/add-dish` Endpoint]')

	try
	{
		const dishRatingRequest = await readJSONBody(req) as DishRatingRequest

		rateDish(dishRatingRequest)
		res.end()
	}
	catch (err)
	{
		res.statusCode = 400
		res.end(JSON.stringify({ error: err.message }))
	}
})