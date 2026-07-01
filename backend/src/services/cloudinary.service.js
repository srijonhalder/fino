const cloudinary = require('../config/cloudinary');

/**
 * Delete an image from Cloudinary by its public ID
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<object>}
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`✅ Cloudinary image deleted: ${publicId}`);
    return result;
  } catch (error) {
    console.error('❌ Cloudinary delete failed:', error.message);
    throw new Error(`Image deletion failed: ${error.message}`);
  }
};

/**
 * Delete multiple images from Cloudinary
 * @param {string[]} publicIds - Array of Cloudinary public IDs
 * @returns {Promise<object>}
 */
const deleteMultipleImages = async (publicIds) => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds);
    console.log(`✅ Deleted ${publicIds.length} images from Cloudinary`);
    return result;
  } catch (error) {
    console.error('❌ Cloudinary bulk delete failed:', error.message);
    throw new Error(`Bulk image deletion failed: ${error.message}`);
  }
};

module.exports = {
  deleteImage,
  deleteMultipleImages,
};
