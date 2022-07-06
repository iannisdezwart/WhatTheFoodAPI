/**
 * Returns the average of an array of numbers.
 */
export const avg = (arr: number[]) =>
{
	if (arr.length == 0)
	{
		return 0
	}

	const sum = arr.reduce((sum, item) => sum + item, 0)
	return sum / arr.length
}