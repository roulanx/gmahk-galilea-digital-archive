import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-server';
import { moveToTrash, isFileInManagedArchive, clearDriveCache } from '@/lib/drive';
import { logSystemEvent } from '@/lib/firestore';

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdmin(req);

    if (!authResult.authorized) {
      if (authResult.status === 'unauthenticated') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Sesi autentikasi diperlukan' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Forbidden: Hanya Admin yang dapat menghapus berkas' },
        { status: 403 }
      );
    }

    const { session } = authResult;

    const body = await req.json();
    const { fileId, fileName } = body;

    if (!fileId) {
      return NextResponse.json({ success: false, error: 'File ID is required' }, { status: 400 });
    }

    const isManaged = await isFileInManagedArchive(fileId);
    if (!isManaged) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Berkas berada di luar batas arsip yang dikelola' },
        { status: 403 }
      );
    }

    const success = await moveToTrash(fileId);

    if (success) {
      clearDriveCache();

      await logSystemEvent({
        type: 'DELETE',
        message: `Berkas ${fileName || fileId} dipindahkan ke Sampah Google Drive oleh ${session?.email}`,
        userId: session?.uid,
        metadata: { fileId, fileName },
      });

      return NextResponse.json({
        success: true,
        message: `Berkas berhasil dipindahkan ke Sampah Google Drive`,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Gagal memindahkan file ke Sampah' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API Trash error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
