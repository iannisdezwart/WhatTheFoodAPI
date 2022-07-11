import { createHash, createHmac, randomBytes, randomUUID } from 'crypto'
import { fileTypeFromBuffer } from 'file-type'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { avg } from '../util/arrays.js'
import graphicsMagick from 'gm'

const imageMagick = graphicsMagick.subClass({ imageMagick: true })
const DATABASE_FILE = 'databases/dishes.json'

export interface DishRating
{
	/**
	 * The user that rated the dish.
	 */
	userId: string

	/**
	 * The rating given by the user.
	 */
	rating: number
}

/**
 * The dish entities as they are stored in the database.
 */
export interface DishEntity
{
	/**
	 * Name of the dish.
	 */
	name: string

	/**
	 * File path of the image.
	 */
	imageFilePath: string

	/**
	 * Description of the dish.
	 */
	description: any[]

	/**
	 * List of all user ratings for this dish.
	 */
	ratings: DishRating[]
}

/**
 * The dish entities as they are returned by the API.
 */
export interface DishTransport
{
	/**
	 * The name of the dish.
	 */
	name: string

	/**
	 * File path of the image.
	 */
	imageFilePath: string

	/**
	 * Description of the dish.
	 */
	description: any[]

	/**
	 * Average rating for the dish.
	 */
	rating: number

	/**
	 * The rating of the user that requested the resource.
	 */
	yourRating?: number
}

/**
 * Dishes as they are received from the client.
 */
export interface IncomingDish
{
	/**
	 * The name of the dish.
	 */
	name: string

	/**
	 * Base-64 data URL encoded image of the dish.
	 */
	image: string

	/**
	 * Description of the dish.
	 */
	description?: any[]
}

/**
 * Request for deletion of a dish.
 */
export interface DishDeleteRequest
{
	/**
	 * The name of the dish.
	 */
	dishName: string
}

/**
 * Request for editing a dish.
 */
export interface DishEditRequest
{
	/**
	 * The name of the dish to edit.
	 */
	dishName: string

	/**
	 * The updated dish content.
	 */
	updatedDish: IncomingDish
}

/**
 * Request for rating a dish.
 */
export interface DishRatingRequest
{
	/**
	 * The name of the dish.
	 */
	dishName: string

	/**
	 * The rating for the dish.
	 */
	rating: DishRating
}

/**
 * Validates an incoming dish.
 */
export const validateIncomingDish = (dish: IncomingDish) =>
{
	if (dish.name == null || dish.name.length == 0)
	{
		throw new Error('Missing dish name')
	}

	if (dish.image == null)
	{
		throw new Error('Missing dish image')
	}
}

/**
 * Reads the dishes from the database.
 */
export const read = () =>
{
	if (!existsSync(DATABASE_FILE))
	{
		writeFileSync(DATABASE_FILE, '[]')
	}

	return JSON.parse(readFileSync(DATABASE_FILE, 'utf-8')) as DishEntity[]
}

/**
 * Writes the dishes to the database.
 */
export const write = (dishes: DishEntity[]) =>
{
	writeFileSync(DATABASE_FILE, JSON.stringify(dishes, null, '\t'))
}

/**
 * Reads the dishes from the database and transforms them to the API format.s
 */
export const getAllDishes = (userId: string): DishTransport[] =>
{
	return read().map(dish => ({
		name: dish.name,
		imageFilePath: dish.imageFilePath,
		description: dish.description,
		rating: avg(dish.ratings.map(rating => rating.rating)),
		yourRating: dish.ratings.find(rating => rating.userId == userId)?.rating
	}))
}

/**
 * Selects a dish of the day from the database.
 */
export const getDishOfTheDay = (userId: string): DishTransport =>
{
	const dishes = read()

	if (dishes.length == 0)
	{
		return {
			name: '<empty>',
			imageFilePath: 'placeholder.jpg',
			description: [],
			rating: 0
		}
	}

	const date = new Date()
	const yyyymmdd = date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate()
	const hash = createHash('sha256').update(yyyymmdd).digest('hex')
	let numericHash = 0

	for (let i = 0; i < 8; i++)
	{
		numericHash ^= parseInt(hash.substring(i * 8, i * 8 + 8), 16)
	}

	const dishOfTheDay = dishes[Math.abs(numericHash % dishes.length)]
	return {
		name: dishOfTheDay.name,
		imageFilePath: dishOfTheDay.imageFilePath,
		description: dishOfTheDay.description,
		rating: avg(dishOfTheDay.ratings.map(rating => rating.rating)),
		yourRating: dishOfTheDay.ratings.find(rating => rating.userId == userId)?.rating
	}
}

/**
 * Adds a dish to the database.
 */
export const addDish = (dish: IncomingDish) => new Promise<void>(async (resolve, reject) =>
{
	console.log('[Dish repository] Adding dish', dish.name)

	const dishes = read()

	if (!existsSync('dish-images'))
	{
		mkdirSync('dish-images')
	}

	// If a dish with this name already exists, throw an error.

	if (dishes.find(d => d.name == dish.name))
	{
		reject(Error('Dish already exists'))
		return
	}

	// Save the image to the disk.

	const fileBuffer = Buffer.from(dish.image, 'base64')
	const fileType = await fileTypeFromBuffer(fileBuffer)
	const imageFilePath = `${ randomBytes(8).toString('hex') }.${ fileType.ext }`

	imageMagick(fileBuffer)
		.resize(1000, 1000, '>')
		.quality(0.7)
		.strip()
		.interlace('Plane')
		.colorspace('RGB')
		.samplingFactor(4, 2)
		.write('dish-images/' + imageFilePath, () =>
		{
			console.log(`Saved compressed image to dish-images/${ imageFilePath }`)

			// Add the dish to the database.

			dishes.push({
				name: dish.name.trim(),
				imageFilePath: imageFilePath,
				description: dish.description || [],
				ratings: []
			})

			write(dishes)
			resolve()
		})
})

/**
 * Deletes a dish from the database.
 */
export const deleteDish = (request: DishDeleteRequest) =>
{
	console.log('[Dish repository] Deleting dish', request.dishName)

	const dishes = read()
	const dish = dishes.find(d => d.name == request.dishName)

	if (dish == null)
	{
		throw new Error('Dish does not exist')
	}

	// Delete the dish image from the disk.

	if (existsSync('dish-images/' + dish.imageFilePath))
	{
		unlinkSync('dish-images/' + dish.imageFilePath)
	}

	// Delete the dish from the database.

	dishes.splice(dishes.indexOf(dish), 1)

	write(dishes)
}

/**
 * Edits a dish in the database.
 */
export const editDish = async (request: DishEditRequest) =>
{
	// When the image is new, simply delete the old dish and add a new one.

	if (request.updatedDish.image != '')
	{
		deleteDish({ dishName: request.dishName })
		await addDish(request.updatedDish)
		return
	}

	// When the image was not changed, simply update the dish in the database.

	const dishes = read()
	const dish = dishes.find(d => d.name == request.dishName)

	if (dish == null)
	{
		throw new Error('Dish does not exist')
	}

	dish.name = request.updatedDish.name.trim()
	dish.description = request.updatedDish.description || []

	write(dishes)
}

/**
 * Rates the dish.
 */
export const rateDish = (request: DishRatingRequest) =>
{
	console.log('[Dish repository] Rating dish', request)

	const dishes = read()
	const dish = dishes.find(d => d.name == request.dishName)

	if (dish == null)
	{
		throw new Error('Dish does not exist')
	}

	const prevRating = dish.ratings.find(r => r.userId == request.rating.userId)

	// Update the previous rating if the user has already rated the dish.

	if (prevRating != null)
	{
		prevRating.rating = request.rating.rating
	}

	// Add the rating to the dish.

	else
	{
		dish.ratings.push({
			rating: request.rating.rating,
			userId: request.rating.userId
		})
	}

	write(dishes)

	// Return the new dish rating.

	return {
		newRating: avg(dish.ratings.map(rating => rating.rating))
	}
}