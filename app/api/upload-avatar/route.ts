import { type NextRequest, NextResponse } from 'next/server'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const CLOUDINARY_CLOUD_NAME = "dfrtk7d4k"
const CLOUDINARY_UPLOAD_PRESET = "skl_app_upload"

export async function POST(request: NextRequest) {
  try {
    console.log('[v0] Avatar upload request received');

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    console.log('[v0] File:', file?.name, 'Size:', file?.size, 'Type:', file?.type);
    console.log('[v0] User ID:', userId);

    if (!file) {
      console.log('[v0] No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!userId) {
      console.log('[v0] No user ID provided');
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      console.log('[v0] File size exceeds limit:', file.size, '>', MAX_FILE_SIZE);
      return NextResponse.json(
        { error: 'File size exceeds 20MB limit' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      console.log('[v0] Invalid file type:', file.type);
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    console.log('[v0] File converted to buffer, size:', bytes.byteLength);

    // Upload to Cloudinary
    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append('file', new Blob([bytes], { type: file.type }));
    cloudinaryFormData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    cloudinaryFormData.append('folder', 'skl_app_avatars');
    cloudinaryFormData.append('public_id', `${userId}-${Date.now()}`);

    console.log('[v0] Uploading to Cloudinary...');

    const cloudinaryResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: cloudinaryFormData,
      }
    );

    console.log('[v0] Cloudinary response status:', cloudinaryResponse.status);

    if (!cloudinaryResponse.ok) {
      let errorMessage = 'Cloudinary upload failed';
      try {
        const errorData = await cloudinaryResponse.json();
        errorMessage = errorData.error?.message || errorMessage;
      } catch {
        errorMessage = `Cloudinary error: ${cloudinaryResponse.statusText}`;
      }
      console.error('[v0] Cloudinary error:', errorMessage);
      throw new Error(errorMessage);
    }

    const cloudinaryData = await cloudinaryResponse.json();
    console.log('[v0] Cloudinary upload successful:', cloudinaryData.secure_url);

    return NextResponse.json({
      url: cloudinaryData.secure_url,
      filename: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error('[v0] Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
