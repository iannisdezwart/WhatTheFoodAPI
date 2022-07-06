import { randomUUID } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { avg } from '../util/arrays'

const DATABASE_FILE = 'databases/dishes.json'

export interface DishRating
{
	/**
	 * The user that rated the dish.
	 */
	userId: number

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
	 * Base-64 data URL encoded image of the dish.
	 */
	image: string

	/**
	 * Average rating for the dish.
	 */
	rating: number
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
export const getAllDishes = (): DishTransport[] =>
{
	return read().map(dish => ({
		name: dish.name,
		image: readFileSync(dish.imageFilePath, 'utf-8'),
		rating: avg(dish.ratings.map(rating => rating.rating))
	}))
}

/**
 * Adds a dish to the database.
 */
export const addDish = (dish: IncomingDish) =>
{
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

	// Save the image to the disk.

	const imageFilePath = `dish-images/${ randomUUID() }`
	writeFileSync(imageFilePath, Buffer.from(dish.image, 'utf-8'))

	// Add the dish to the database.

	dishes.push({
		name: dish.name,
		imageFilePath: imageFilePath,
		ratings: []
	})

	write(dishes)
}