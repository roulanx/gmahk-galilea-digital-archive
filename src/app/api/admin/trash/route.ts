import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-server';
import { moveToTrash } from '@/lib/drive';
import { logSystemEvent } from '@/lib/firestore';



export async function POST(req: NextRequest) {
  try {
    const { authorized, session } = await requireAdmin(req);

    if (!authorized) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Hanya Admin yang dapat menghapus berkas' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { fileId, fileName } = body;

    if (!fileId) {
      return NextResponse.json({ success: false, error: 'File ID is required' }, { status: 400 });
    }

    const success = await moveToTrash(fileId);

    if (success) {
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
