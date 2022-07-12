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
 * Holds a yyyy-mm-dd formatted date string.
 * Used for determining whether the current dish of the day is still valid.
 */
let currentDay: string

/**
 * Returns a yyyy-mm-dd formatted date string of today.
 */
export const getCurrentDay = () =>
{
	const date = new Date()
	return date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate()
}

/**
 * The dish of the day. Updated whenever it is null or `currentDay` is
 * out of date.
 */
let dishOfTheDay: DishEntity

/**
 * The nonce for the dish of the day picking algorithm.
 * Changing this nonce will result in a new dish of the day.
 * Useful when skipping the dish of the day.
 */
let nonce = 0

export const skipDishOfTheDay = () =>
{
	nonce++
	selectDishOfTheDay()
}

/**
 * Selects a random dish to be chosen to be the dish of the day.
 */
export const selectDishOfTheDay = () =>
{
	currentDay = getCurrentDay()

	const dishes = read()

	if (dishes.length == 0)
	{
		dishOfTheDay = {
			name: '<empty>',
			imageFilePath: 'placeholder.jpg',
			description: [],
			ratings: []
		}

		return
	}

	const hash = createHash('sha256').update(currentDay + nonce).digest('hex')
	let numericHash = 0

	for (let i = 0; i < 8; i++)
	{
		numericHash ^= parseInt(hash.substring(i * 8, i * 8 + 8), 16)
	}

	dishOfTheDay = dishes[Math.abs(numericHash % dishes.length)]
}

/**
 * Selects a dish of the day from the database.
 */
export const getDishOfTheDay = (userId: string): DishTransport =>
{
	if (currentDay == null || dishOfTheDay == null || currentDay != getCurrentDay())
	{
		selectDishOfTheDay()
	}

	return {
		name: dishOfTheDay.name,
		imageFilePath: dishOfTheDay.imageFilePath,
		description: dishOfTheDay.description,
		rating: avg(dishOfTheDay.ratings.map(rating => rating.rating)),
		yourRating: dishOfTheDay.ratings.find(rating => rating.userId == userId)?.rating
	}
}

/**
 * Processes the image of a new dish.
 */
const processDishImage = (dish: IncomingDish) => new Promise<string>(async resolve =>
{
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
			resolve(imageFilePath)
		})
})

/**
 * Adds a dish to the database.
 */
export const addDish = async (dish: IncomingDish) =>
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
		throw new Error('Dish already exists')
	}

	// Add the dish to the database.

	dishes.push({
		name: dish.name.trim(),
		imageFilePath: await processDishImage(dish),
		description: dish.description || [],
		ratings: []
	})

	write(dishes)
}

/**
 * Deletes the image of an old dish.
 */
const deleteDishImage = (dish: DishEntity) =>
{
	if (existsSync('dish-images/' + dish.imageFilePath))
	{
		unlinkSync('dish-images/' + dish.imageFilePath)
	}
}

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

	deleteDishImage(dish)

	// Delete the dish from the database.

	dishes.splice(dishes.indexOf(dish), 1)

	write(dishes)
}

/**
 * Edits a dish in the database.
 */
export const editDish = async (request: DishEditRequest) =>
{
	const dishes = read()
	const dish = dishes.find(d => d.name == request.dishName)

	if (dish == null)
	{
		throw new Error('Dish does not exist')
	}

	// Update fields.

	dish.name = request.updatedDish.name.trim()
	dish.description = request.updatedDish.description || []

	// Update image if needed.

	if (request.updatedDish.image != '')
	{
		deleteDishImage(dish)
		dish.imageFilePath = await processDishImage(request.updatedDish)
	}

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