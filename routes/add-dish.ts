import { readJSONBody } from '@iannisz/node-api-kit'
import { api } from '../api'
import { addDish, IncomingDish, validateIncomingDish } from '../repositories/dishes'

/**
 * Adds the dish received by the client to the database.
 */
api.post('/add-dish', async (req, res) =>
{
	const dish = await readJSONBody(req) as IncomingDish

	try
	{
		validateIncomingDish(dish)
		addDish(dish)
		res.end()
	}
	catch (err)
	{
		res.statusCode = 400
		res.end(JSON.stringify({ error: err.message }))
	}
})