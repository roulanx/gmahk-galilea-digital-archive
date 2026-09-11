import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-server';
import { runArchiveAutomation } from '@/lib/automation';
import { getAutomationStatus } from '@/lib/firestore';

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAdmin(req);

    if (!authResult.authorized) {
      if (authResult.status === 'unauthenticated') {
        const unauthMsg = 'Unauthorized: Sesi autentikasi diperlukan. Silakan masuk terlebih dahulu.';
        return NextResponse.json(
          {
            success: false,
            message: unauthMsg,
            error: unauthMsg,
          },
          { status: 401 }
        );
      }
      const forbiddenMsg = 'Forbidden: Hanya Admin yang dapat melihat status otomasi.';
      return NextResponse.json(
        {
          success: false,
          message: forbiddenMsg,
          error: forbiddenMsg,
        },
        { status: 403 }
      );
    }

    const status = await getAutomationStatus();
    return NextResponse.json({ success: true, data: status });
  } catch (error) {
    console.error('API get automation status error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        message: `Gagal membaca status otomasi: ${errMsg}`,
        error: errMsg,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdmin(req);

    if (!authResult.authorized) {
      if (authResult.status === 'unauthenticated') {
        const unauthMsg = 'Unauthorized: Sesi autentikasi diperlukan. Silakan masuk terlebih dahulu.';
        return NextResponse.json(
          {
            success: false,
            message: unauthMsg,
            error: unauthMsg,
            data: {
              status: 'FAILED',
              details: unauthMsg,
              logs: ['[AUTH_ERROR] Request tidak menyertakan Authorization token valid.'],
            },
          },
          { status: 401 }
        );
      }
      const forbiddenMsg = 'Forbidden: Hanya Admin yang dapat menjalankan otomasi.';
      return NextResponse.json(
        {
          success: false,
          message: forbiddenMsg,
          error: forbiddenMsg,
          data: {
            status: 'FAILED',
            details: forbiddenMsg,
            logs: ['[PERMISSION_ERROR] Akun pengguna bukan administrator.'],
          },
        },
        { status: 403 }
      );
    }

    const result = await runArchiveAutomation();

    if (result.status !== 'SUCCESS') {
      const failureReason = result.details || result.error || 'Otomasi Google Drive gagal dijalankan.';
      return NextResponse.json({
        success: false,
        message: failureReason,
        error: failureReason,
        data: {
          status: 'FAILED',
          details: failureReason,
          createdFoldersCount: result.createdFoldersCount || 0,
          logs: result.logs || [],
          error: result.error || failureReason,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: result.details,
      data: result,
    });
  } catch (error) {
    console.error('API trigger automation error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    const failReason = `Otomasi gagal pada server: ${errMsg}`;
    return NextResponse.json(
      {
        success: false,
        message: failReason,
        error: failReason,
        data: {
          status: 'FAILED',
          details: failReason,
          logs: [`[FATAL_ERROR] ${errMsg}`],
          error: errMsg,
        },
      },
      { status: 500 }
    );
  }
}
