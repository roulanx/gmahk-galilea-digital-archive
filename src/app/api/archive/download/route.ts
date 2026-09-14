import { NextRequest, NextResponse } from 'next/server';
import { getGoogleDriveClient, isFileInManagedArchive } from '@/lib/drive';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return new NextResponse('Missing fileId', { status: 400 });
    }

    const isManaged = await isFileInManagedArchive(fileId);
    if (!isManaged) {
      return new NextResponse('File not found in managed archive boundary', { status: 403 });
    }

    const drive = getGoogleDriveClient();
    if (!drive) {
      return new NextResponse('Drive client not authenticated', { status: 500 });
    }

    const fileMeta = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size',
    });

    const { name, mimeType, size } = fileMeta.data;

    let responseStream;
    let finalName = name || 'download';
    let finalMimeType = mimeType || 'application/octet-stream';
    let finalSize = size;
    
    if (mimeType?.includes('application/vnd.google-apps')) {
      const exportMap: Record<string, { mimeType: string; ext: string }> = {
        'application/vnd.google-apps.document': { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: '.docx' },
        'application/vnd.google-apps.spreadsheet': { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: '.xlsx' },
        'application/vnd.google-apps.presentation': { mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', ext: '.pptx' },
      };

      const exp = exportMap[mimeType];
      if (!exp) {
        // Fallback for unsupported workspace files
        const pdfRes = await drive.files.export({
          fileId,
          mimeType: 'application/pdf',
        }, { responseType: 'stream' });
        responseStream = pdfRes.data;
        finalName = `${name}.pdf`;
        finalMimeType = 'application/pdf';
        finalSize = undefined; // Export API does not return content-length immediately
      } else {
        const res = await drive.files.export({
          fileId,
          mimeType: exp.mimeType,
        }, { responseType: 'stream' });
        responseStream = res.data;
        finalName = `${name}${exp.ext}`;
        finalMimeType = exp.mimeType;
        finalSize = undefined;
      }
    } else {
      const res = await drive.files.get({
        fileId,
        alt: 'media',
      }, { responseType: 'stream' });
      responseStream = res.data;
    }

    const headers = new Headers();
    // Use encodeURIComponent for filenames with spaces/special characters
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(finalName)}`);
    headers.set('Content-Type', finalMimeType);
    if (finalSize) {
      headers.set('Content-Length', finalSize);
    }

    const readable = new ReadableStream({
      start(controller) {
        responseStream.on('data', (chunk: Buffer) => {
          controller.enqueue(chunk);
        });
        responseStream.on('end', () => {
          controller.close();
        });
        responseStream.on('error', (err: Error) => {
          controller.error(err);
        });
      },
    });

    return new NextResponse(readable, { headers });
  } catch (error: unknown) {
    console.error('Download API error:', error);
    return new NextResponse((error as Error).message || 'Internal server error', { status: 500 });
  }
}
