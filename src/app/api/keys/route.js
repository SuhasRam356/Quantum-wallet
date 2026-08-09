import { NextResponse } from 'next/server';

export async function GET() {
  const keysData = {
    activeKeys: [
      { id: 'QK-892A', type: 'Primary Master', status: 'Active', created: '2025-10-12', algorithm: 'QKD-AES256' },
      { id: 'QK-119B', type: 'Backup Recovery', status: 'Inactive', created: '2025-10-12', algorithm: 'QKD-AES256' },
      { id: 'QK-443C', type: 'dApp Session', status: 'Active', created: '2026-08-01', algorithm: 'Kyber-1024' },
    ],
    securityStatus: {
      biometricEnabled: true,
      twoFactorEnabled: false,
      quantumProtectionLevel: 'Maximum (Kyber-1024)'
    }
  };

  return NextResponse.json(keysData);
}

export async function POST() {
  // Simulate generating a new key
  return NextResponse.json({
    success: true,
    message: 'New quantum-resistant key pair generated successfully.',
    newKey: {
      id: `QK-${Math.floor(Math.random() * 1000)}X`,
      type: 'New Session',
      status: 'Active',
      created: new Date().toISOString().split('T')[0],
      algorithm: 'Kyber-1024'
    }
  });
}
