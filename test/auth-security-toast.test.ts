import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { authenticateRequest, requireAdmin } from '../src/lib/auth-server';
import { classifyDriveError, DriveError } from '../src/lib/drive';

describe('GMAHK Galilea - Security & Authorization Guardrails', () => {
  it('harus menolak request tanpa header Authorization (401 unauthenticated)', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/trash', {
      method: 'POST',
      body: JSON.stringify({ fileId: '123' }),
    });

    const session = await authenticateRequest(req);
    assert.equal(session, null);

    const result = await requireAdmin(req);
    assert.equal(result.authorized, false);
    assert.equal(result.status, 'unauthenticated');
    assert.equal(result.session, undefined);
  });

  it('harus menolak request dengan Authorization header yang tidak valid', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/trash', {
      method: 'POST',
      headers: {
        Authorization: 'Basic invalid_token_format',
      },
    });

    const session = await authenticateRequest(req);
    assert.equal(session, null);

    const result = await requireAdmin(req);
    assert.equal(result.authorized, false);
    assert.equal(result.status, 'unauthenticated');
  });

  it('harus menolak manipulasi header x-dev-role (tidak ada client-side privilege escalation)', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/trash', {
      method: 'POST',
      headers: {
        'x-dev-role': 'admin',
      },
    });

    // Server-side auth must ignore x-dev-role completely
    const session = await authenticateRequest(req);
    assert.equal(session, null);

    const result = await requireAdmin(req);
    assert.equal(result.authorized, false);
    assert.equal(result.status, 'unauthenticated');
  });
});

describe('GMAHK Galilea - Google Drive Error Classification', () => {
  it('harus mengklasifikasikan error 401 dan invalid_grant sebagai AUTH_ERROR', () => {
    const err401 = { status: 401, message: 'invalid_grant: Bad credentials' };
    const classified401 = classifyDriveError(err401);
    assert.ok(classified401 instanceof DriveError);
    assert.equal(classified401.kind, 'AUTH_ERROR');
    assert.equal(classified401.statusCode, 401);

    const errNoCreds = new Error('Could not load the default credentials');
    const classifiedNoCreds = classifyDriveError(errNoCreds);
    assert.equal(classifiedNoCreds.kind, 'AUTH_ERROR');
  });

  it('harus mengklasifikasikan error 403 dan insufficientFilePermissions sebagai PERMISSION_ERROR', () => {
    const err403 = { status: 403, message: 'The caller does not have permission' };
    const classified = classifyDriveError(err403);
    assert.equal(classified.kind, 'PERMISSION_ERROR');
    assert.equal(classified.statusCode, 403);

    const reasonErr = { errors: [{ reason: 'insufficientFilePermissions' }] };
    const classifiedReason = classifyDriveError(reasonErr);
    assert.equal(classifiedReason.kind, 'PERMISSION_ERROR');
  });

  it('harus mengklasifikasikan error 404 dan File not found sebagai NOT_FOUND', () => {
    const err404 = { status: 404, message: 'File not found: 12345' };
    const classified = classifyDriveError(err404);
    assert.equal(classified.kind, 'NOT_FOUND');
    assert.equal(classified.statusCode, 404);
  });

  it('harus mengklasifikasikan error lainnya sebagai API_ERROR', () => {
    const err500 = { status: 500, message: 'Internal Drive Server Error' };
    const classified = classifyDriveError(err500);
    assert.equal(classified.kind, 'API_ERROR');
    assert.equal(classified.statusCode, 500);
  });
});

describe('GMAHK Galilea - Toast Deduplication & Sliding Window Logic', () => {
  interface ToastStateItem {
    id: string;
    message: string;
    description?: string;
  }

  function simulateToastAddition(
    current: ToastStateItem[],
    newItem: { message: string; description?: string }
  ): ToastStateItem[] {
    const isDuplicate = current.some(
      (t) => t.message === newItem.message && t.description === newItem.description
    );
    if (isDuplicate) {
      return current;
    }
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const next = [...current, { id, ...newItem }];
    return next.slice(-3); // Sliding window max 3
  }

  it('harus mencegah duplikasi toast yang identik', () => {
    let state: ToastStateItem[] = [];

    state = simulateToastAddition(state, {
      message: 'Akses Terbatas',
      description: 'Hanya admin yang dapat melakukan aksi ini',
    });
    assert.equal(state.length, 1);

    // Add identical toast again
    state = simulateToastAddition(state, {
      message: 'Akses Terbatas',
      description: 'Hanya admin yang dapat melakukan aksi ini',
    });
    // Length must still be 1 (no duplicate)
    assert.equal(state.length, 1);
  });

  it('harus membatasi maksimal 3 toast dengan mekanisme sliding window', () => {
    let state: ToastStateItem[] = [];

    state = simulateToastAddition(state, { message: 'Pesan 1' });
    state = simulateToastAddition(state, { message: 'Pesan 2' });
    state = simulateToastAddition(state, { message: 'Pesan 3' });
    assert.equal(state.length, 3);
    assert.equal(state[0].message, 'Pesan 1');

    // Add 4th toast
    state = simulateToastAddition(state, { message: 'Pesan 4' });
    assert.equal(state.length, 3);
    assert.equal(state[0].message, 'Pesan 2');
    assert.equal(state[1].message, 'Pesan 3');
    assert.equal(state[2].message, 'Pesan 4');
  });
});

describe('GMAHK Galilea - Automation Detailed Error Propagation', () => {
  function extractFailureReason(json: {
    message?: string;
    error?: string;
    data?: {
      details?: string;
      error?: string;
      logs?: string[];
    };
  }): string {
    const lastLog =
      Array.isArray(json.data?.logs) && json.data.logs.length > 0
        ? json.data.logs.find((l: string) => l.startsWith('[ERROR]')) || json.data.logs[json.data.logs.length - 1]
        : undefined;

    return (
      json.error ||
      json.data?.error ||
      json.data?.details ||
      json.message ||
      lastLog ||
      'Terjadi kegagalan saat menjalankan otomasi Google Drive.'
    );
  }

  it('harus mengekstrak json.error spesifik dan tidak pernah fallback ke string generik', () => {
    const response = {
      success: false,
      error: 'Pengujian koneksi Google Drive gagal [AUTH_ERROR] (Status 401): invalid_grant',
      data: {
        status: 'FAILED',
        details: 'Pengujian koneksi Google Drive gagal [AUTH_ERROR] (Status 401): invalid_grant',
      },
    };

    const reason = extractFailureReason(response);
    assert.equal(
      reason,
      'Pengujian koneksi Google Drive gagal [AUTH_ERROR] (Status 401): invalid_grant'
    );
    assert.notEqual(reason, 'Sebagian tahap gagal.');
  });

  it('harus mengekstrak json.data.details jika json.error kosong', () => {
    const response = {
      success: false,
      data: {
        status: 'FAILED',
        details: '[QUARTER] Gagal memproses folder Triwulan III: Permission Denied',
      },
    };

    const reason = extractFailureReason(response);
    assert.equal(reason, '[QUARTER] Gagal memproses folder Triwulan III: Permission Denied');
  });

  it('harus mengekstrak log [ERROR] jika response hanya memiliki logs array', () => {
    const response = {
      success: false,
      data: {
        logs: [
          '[AUTH_TEST] Mulai pengujian...',
          '[ERROR] Gagal membuat root folder GMAHK Galilea (HTTP 403): Insufficient permissions',
        ],
      },
    };

    const reason = extractFailureReason(response);
    assert.equal(
      reason,
      '[ERROR] Gagal membuat root folder GMAHK Galilea (HTTP 403): Insufficient permissions'
    );
  });
});

