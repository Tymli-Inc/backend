import { v2 as cloudinary } from 'cloudinary';
import { createCanvas } from 'canvas';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary
 * @param {string} imageUrl - URL of the image to upload
 * @param {string} publicId - Public ID for the uploaded image
 * @returns {Promise<string>} - Cloudinary URL of uploaded image
 */
export const uploadImageToCloudinary = async (imageUrl, publicId) => {
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      public_id: publicId,
      folder: 'hourglass-auth/profile-pictures',
      transformation: [
        { width: 200, height: 200, crop: 'fill' },
        { quality: 'auto' }
      ]
    });
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

/**
 * Generate a fallback avatar image with user's initial
 * @param {string} name - User's name
 * @param {string} userId - User's ID for unique public_id
 * @returns {Promise<string>} - Cloudinary URL of generated avatar
 */
export const generateFallbackAvatar = async (name, userId) => {
  try {
    // Get the first letter of the name
    const initial = name.charAt(0).toUpperCase();
    
    // Create canvas
    const canvas = createCanvas(200, 200);
    const ctx = canvas.getContext('2d');
    
    // Generate a consistent color based on the name
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
      '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
      '#686de0', '#4834d4', '#dda0dd', '#98d8c8', '#f7b731'
    ];
    const colorIndex = name.charCodeAt(0) % colors.length;
    const backgroundColor = colors[colorIndex];
    
    // Draw background circle
    ctx.fillStyle = backgroundColor;
    ctx.beginPath();
    ctx.arc(100, 100, 100, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw initial
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initial, 100, 100);
    
    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png');
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(
      `data:image/png;base64,${buffer.toString('base64')}`,
      {
        public_id: `avatar_${userId}`,
        folder: 'hourglass-auth/generated-avatars',
        transformation: [
          { width: 200, height: 200, crop: 'fill' },
          { quality: 'auto' }
        ]
      }
    );
    
    return result.secure_url;
  } catch (error) {
    console.error('Error generating fallback avatar:', error);
    throw error;
  }
};


/**
 * Process user profile image
 * @param {string|null} profileImageUrl - Google profile image URL
 * @param {string} name - User's name
 * @param {string} userId - User's ID
 * @returns {Promise<string>} - Final image URL
 */
export const processUserImage = async (profileImageUrl, name, userId) => {
  try {
    if (profileImageUrl) {
      // Upload Google profile image to Cloudinary
      return await uploadImageToCloudinary(profileImageUrl, `profile_${userId}`);
    } else {
      // Generate fallback avatar
      return await generateFallbackAvatar(name, userId);
    }  } catch (error) {
    console.error('Error processing user image:', error);
    // Return a fallback avatar URL if everything fails
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=200`;
  }
};