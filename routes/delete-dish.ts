import { readJSONBody } from '@iannisz/node-api-kit'
import { api } from '../api.js'
import { deleteDish, DishDeleteRequest } from '../repositories/dishes.js'

/**
* Deletes the dish with the name received by the client from the database.
 */
api.post('/delete-dish', async (req, res) =>
{
	console.log('[`/delete-dish` Endpoint]')

	try
	{
		const deleteRequest = await readJSONBody(req) as DishDeleteRequest

		deleteDish(deleteRequest)
		res.end()
	}
	catch (err)
	{
		res.statusCode = 400
		res.end(JSON.stringify({ error: err.message }))
	}
})