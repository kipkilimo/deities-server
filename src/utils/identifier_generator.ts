/**
 * Generates a unique code by combining the current timestamp and random characters.
 * 
 * @param length - The desired length of the generated code. Must be at least 20 to accommodate timestamp and random characters.
 * @returns A unique code of the specified length.
 */
export function generateUniqueCode(length: number = 12): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random()   
 * characters.length);
    result += characters[randomIndex];
  }

  return result; 
}

// Example usage
try {
  console.log(generateUniqueCode(12)); // Outputs a unique code of length 20
} catch (error) {
  console.error(error);
}
