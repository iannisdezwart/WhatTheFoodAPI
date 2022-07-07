import { readJSONBody } from '@iannisz/node-api-kit'
import { api } from '../api.js'
import { addDish, IncomingDish, validateIncomingDish } from '../repositories/dishes.js'

/**
 * Adds the dish received by the client to the database.
 */
api.post('/add-dish', async (req, res) =>
{
	console.log('[`/add-dish` Endpoint]')

	try
	{
		const dish = await readJSONBody(req) as IncomingDish

		validateIncomingDish(dish)
		await addDish(dish)
		res.end()
	}
	catch (err)
	{
		res.statusCode = 400
		res.end(JSON.stringify({ error: err.message }))
	}
})