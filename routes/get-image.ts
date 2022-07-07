import { fileTypeFromFile } from 'file-type'
import { createReadStream, existsSync } from 'fs'
import { api } from '../api.js'

/**
 * Responds with an image of the dish requested by the client.
 */
api.get('/get-image', async (req, res) =>
{
	const url = new URL(req.url, 'http://localhost')
	const dishFile = 'dish-images/' + url.searchParams.get('file').replace(/\.\./g, '')

	console.log('[`/get-image` Endpoint]', { dishFile })

	if (!existsSync(dishFile))
	{
		console.log('[`/get-image` Endpoint] Not found')
		res.statusCode = 404
		res.end()
		return
	}

	if (dishFile == null)
	{
		res.statusCode = 400
		res.end(JSON.stringify({ error: 'Missing dish file' }))
		return
	}

	const fileType = await fileTypeFromFile(dishFile)
	res.setHeader('Content-Type', fileType.mime)

	const fileStream = createReadStream(dishFile)
	fileStream.pipe(res)
})