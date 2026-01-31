import { supabase } from './supabase'

/**
 * Upload a vinyl record image and create a database record
 *
 * @param {Object} params
 * @param {File} params.imageFile - The image file to upload
 * @param {string} params.eventId - UUID of the event
 * @param {string} params.userId - UUID of the user
 * @param {string} params.typedArtist - Artist name entered by user
 * @param {string} params.typedAlbum - Album name entered by user
 * @returns {Promise<Object>} { success, record, error }
 */
export async function uploadVinylRecord({
  imageFile,
  eventId,
  userId,
  typedArtist,
  typedAlbum
}) {
  try {
    // Generate a unique record ID
    const recordId = crypto.randomUUID()

    // Determine file extension
    const fileExt = imageFile.name.split('.').pop()

    // Create storage path: event_id/user_id/record_id.ext
    const storagePath = `${eventId}/${userId}/${recordId}.${fileExt}`

    // Step 1: Insert database record first (without image_path)
    const { data: record, error: insertError } = await supabase
      .from('vinyl_records')
      .insert({
        id: recordId,
        event_id: eventId,
        user_id: userId,
        typed_artist: typedArtist,
        typed_album: typedAlbum,
        image_path: null // Will update after upload
      })
      .select()
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      return { success: false, error: insertError.message }
    }

    // Step 2: Upload image to Storage
    const { error: uploadError } = await supabase.storage
      .from('records')
      .upload(storagePath, imageFile, {
        contentType: imageFile.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)

      // Cleanup: Delete the database record if upload fails
      await supabase
        .from('vinyl_records')
        .delete()
        .eq('id', recordId)

      return { success: false, error: uploadError.message }
    }

    // Step 3: Update database record with image_path
    const { data: updatedRecord, error: updateError } = await supabase
      .from('vinyl_records')
      .update({ image_path: storagePath })
      .eq('id', recordId)
      .select()
      .single()

    if (updateError) {
      console.error('Database update error:', updateError)

      // Cleanup: Delete the uploaded file and database record
      await supabase.storage.from('records').remove([storagePath])
      await supabase.from('vinyl_records').delete().eq('id', recordId)

      return { success: false, error: updateError.message }
    }

    return {
      success: true,
      record: updatedRecord,
      error: null
    }

  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get a signed URL for a vinyl record image
 *
 * @param {string} imagePath - The storage path of the image
 * @param {number} expiresIn - Expiry time in seconds (default: 3600 = 1 hour)
 * @returns {Promise<Object>} { url, error }
 */
export async function getVinylRecordImageUrl(imagePath, expiresIn = 3600) {
  try {
    const { data, error } = await supabase.storage
      .from('records')
      .createSignedUrl(imagePath, expiresIn)

    if (error) {
      console.error('Signed URL error:', error)
      return { url: null, error: error.message }
    }

    return { url: data.signedUrl, error: null }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { url: null, error: error.message }
  }
}
