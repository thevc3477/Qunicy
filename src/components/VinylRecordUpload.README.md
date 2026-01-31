# Vinyl Record Upload Component

## Files Created

### 1. Helper Function
**Location:** `src/lib/vinylRecordUpload.js`

Contains two helper functions:
- `uploadVinylRecord()` - Uploads image to Storage and creates database record
- `getVinylRecordImageUrl()` - Gets signed URL for displaying images

### 2. React Component
**Location:** `src/components/VinylRecordUpload.jsx`

A complete upload form component with:
- Artist and album name inputs
- Image file picker with preview
- Upload progress state
- Success display with uploaded image
- Error handling

## Usage

### Basic Usage

Import and use the component in any page:

```jsx
import VinylRecordUpload from '../components/VinylRecordUpload'

export default function MyPage() {
  // Generate or get eventId (UUID)
  const eventId = 'your-event-uuid-here'

  return (
    <div>
      <h1>Upload Your Vinyl</h1>
      <VinylRecordUpload eventId={eventId} />
    </div>
  )
}
```

### Example Integration in Records Page

```jsx
// src/pages/Records.jsx
import { useState } from 'react'
import VinylRecordUpload from '../components/VinylRecordUpload'

export default function Records() {
  const [showUpload, setShowUpload] = useState(false)

  // Use a real event ID from your app
  const currentEventId = '123e4567-e89b-12d3-a456-426614174000'

  return (
    <div style={{ padding: 20 }}>
      <h1>Vinyl Records</h1>

      <button onClick={() => setShowUpload(!showUpload)}>
        {showUpload ? 'Cancel Upload' : 'Upload New Record'}
      </button>

      {showUpload && <VinylRecordUpload eventId={currentEventId} />}

      {/* Your existing records list */}
    </div>
  )
}
```

## Helper Function API

### uploadVinylRecord()

```javascript
import { uploadVinylRecord } from '../lib/vinylRecordUpload'

const result = await uploadVinylRecord({
  imageFile: file,           // File object from input
  eventId: 'uuid',          // Event UUID
  userId: 'uuid',           // User UUID
  typedArtist: 'Miles Davis',
  typedAlbum: 'Kind of Blue'
})

// Returns:
{
  success: true,
  record: {
    id: 'uuid',
    event_id: 'uuid',
    user_id: 'uuid',
    image_path: 'event_id/user_id/record_id.jpg',
    typed_artist: 'Miles Davis',
    typed_album: 'Kind of Blue'
  },
  error: null
}
```

### getVinylRecordImageUrl()

```javascript
import { getVinylRecordImageUrl } from '../lib/vinylRecordUpload'

const { url, error } = await getVinylRecordImageUrl(
  'event_id/user_id/record_id.jpg',
  3600 // expires in 1 hour (optional)
)

// Use the signed URL
<img src={url} alt="Vinyl record" />
```

## Storage Path Format

Images are stored in the `records` bucket with this structure:
```
records/
  └── event_id/
      └── user_id/
          └── record_id.jpg
```

Example:
```
records/123e4567-e89b-12d3-a456-426614174000/987fcdeb-51a2-43f7-8e9b-123456789abc/a1b2c3d4-5678-90ef-ghij-klmnopqrstuv.jpg
```

## Error Handling

The upload process includes automatic cleanup:

1. **If storage upload fails:** Database record is deleted
2. **If database update fails:** Both storage file and database record are deleted

This ensures no orphaned files or incomplete records.

## Security

- Uses Supabase RLS policies (already configured)
- Storage bucket is PRIVATE (signed URLs required)
- User must be authenticated
- User ID comes from authenticated session

## Dependencies

Required packages (already installed):
- `@supabase/supabase-js`

## Testing Checklist

- [ ] User is logged in
- [ ] eventId is a valid UUID
- [ ] Image uploads successfully
- [ ] Database record is created
- [ ] Signed URL displays the image
- [ ] Error handling works (try uploading without login)
- [ ] Storage path follows pattern: `event_id/user_id/record_id.ext`
