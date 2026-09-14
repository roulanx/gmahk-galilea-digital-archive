import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-server';
import { getDefaultUploadSabbath, isValidSabbathDate } from '@/lib/sabbath';
import {
  uploadFileToDrive,
  resolveSabbathDestinationFolder,
  getNonCollidingFileName,
  classifyDriveError,
  determineFileType,
  clearDriveCache,
} from '@/lib/drive';
import { indexFile, logSystemEvent } from '@/lib/firestore';
import { ArchiveCategory, FileItem } from '@/lib/types';
import { Readable } from 'stream';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1]?.trim() : undefined;

    const session = await authenticateRequest(req);

    // Both viewer and admin can upload according to system rules
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const rawCategory = formData.get('category') as string;
    const category: ArchiveCategory = rawCategory === 'worship' ? 'worship' : 'documentation';
    let targetSabbathDate = (formData.get('sabbathDate') as string | null)?.trim() || null;

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: 'Pilih minimal satu berkas untuk diunggah.' }, { status: 400 });
    }

    // 1. Determine or validate Sabbath destination
    if (!targetSabbathDate) {
      const defaultSabbath = getDefaultUploadSabbath();
      targetSabbathDate = defaultSabbath.date;
    } else if (!isValidSabbathDate(targetSabbathDate)) {
      return NextResponse.json(
        {
          success: false,
          error: `Tanggal '${targetSabbathDate}' bukan hari Sabat yang valid. Format yang diharapkan adalah YYYY-MM-DD (hari Sabtu).`,
        },
        { status: 400 }
      );
    }

    // 2. Resolve destination folder inside managed Google Drive archive boundary
    let destination;
    try {
      destination = await resolveSabbathDestinationFolder(category, targetSabbathDate);
    } catch (destErr) {
      const classified = classifyDriveError(destErr);
      console.error('[Upload] Destination folder resolution error:', classified.message);
      return NextResponse.json(
        {
          success: false,
          error: `Gagal menyiapkan folder tujuan di Google Drive [${classified.kind}]: ${classified.message}`,
        },
        { status: 500 }
      );
    }

    const uploadedResults: FileItem[] = [];

    // 3. Process each file with duplicate collision avoidance
    for (const file of files) {
      const safeFileName = await getNonCollidingFileName(destination.folderId, file.name);
      const buffer = Buffer.from(await file.arrayBuffer());
      const stream = Readable.from(buffer);
      const mimeType = file.type || 'application/octet-stream';
      const fileType = determineFileType(mimeType, safeFileName);

      let driveRes;
      try {
        driveRes = await uploadFileToDrive({
          folderId: destination.folderId,
          name: safeFileName,
          mimeType,
          stream,
        });
      } catch (uploadErr) {
        const classified = classifyDriveError(uploadErr);
        console.error(`[Upload] Drive upload failed for '${safeFileName}':`, classified.message);
        return NextResponse.json(
          {
            success: false,
            error: `Gagal mengunggah berkas '${safeFileName}' ke Google Drive [${classified.kind}]: ${classified.message}`,
          },
          { status: 500 }
        );
      }

      const fileItem: FileItem = {
        id: driveRes.id,
        name: safeFileName,
        mimeType,
        size: file.size,
        category,
        fileType,
        sabbathDate: targetSabbathDate,
        sabbathTitle: destination.sabbathTitle,
        year: destination.year,
        quarter: destination.quarter,
        folderId: destination.folderId,
        webViewLink: driveRes.webViewLink,
        webContentLink: driveRes.webContentLink,
        uploadedBy: session?.email || 'jemaat@gmahk-galilea.org',
        uploadedAt: new Date().toISOString(),
        isRandomEligible: fileType === 'photo' || fileType === 'video',
      };

      await indexFile(fileItem, token);
      uploadedResults.push(fileItem);
    }

    await logSystemEvent({
      type: 'UPLOAD',
      message: `${uploadedResults.length} berkas diunggah ke ${destination.folderPath}`,
      userId: session?.uid,
      metadata: {
        count: uploadedResults.length,
        category,
        sabbathDate: targetSabbathDate,
        folderPath: destination.folderPath,
      },
    });

    clearDriveCache();

    return NextResponse.json({
      success: true,
      message: `${uploadedResults.length} berkas berhasil diunggah ke Sabat ${destination.sabbathTitle}`,
      destination: {
        path: destination.folderPath,
        sabbathTitle: destination.sabbathTitle,
        sabbathDate: targetSabbathDate,
        category,
      },
      data: uploadedResults,
    });
  } catch (error) {
    console.error('API Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
