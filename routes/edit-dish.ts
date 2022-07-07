import { readJSONBody } from '@iannisz/node-api-kit'
import { api } from '../api.js'
import { DishEditRequest, editDish, validateIncomingDish } from '../repositories/dishes.js'

/**
 * Adds the dish received by the client to the database.
 */
api.post('/edit-dish', async (req, res) =>
{
	console.log('[`/edit-dish` Endpoint]')

	try
	{
		const dishEditRequest = await readJSONBody(req) as DishEditRequest

		validateIncomingDish(dishEditRequest.updatedDish)
		await editDish(dishEditRequest)
		res.end()
	}
	catch (err)
	{
		res.statusCode = 400
		res.end(JSON.stringify({ error: err.message }))
	}
})