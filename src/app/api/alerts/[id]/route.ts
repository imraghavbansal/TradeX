import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@/lib/better-auth/auth';
import { connectToDatabase } from '../../../../../database/mongoose';
import { AlertModel } from '../../../../../database/models/alert.model';

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const session = await auth.api.getSession({ headers: request.headers as unknown as Headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectToDatabase();
    const result = await AlertModel.findOneAndDelete({ _id: id, userId: session.user.id });

    if (!result) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Alert deleted' });
  } catch (error) {
    console.error('Delete alert error:', error);
    return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { alertName, alertType, threshold } = await request.json();

    const session = await auth.api.getSession({ headers: request.headers as unknown as Headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectToDatabase();
    const update: Record<string, unknown> = {};
    if (alertName) update.alertName = alertName;
    if (alertType === 'upper' || alertType === 'lower') update.alertType = alertType;
    if (threshold != null) update.threshold = Number(threshold);

    const result = await AlertModel.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      update,
      { new: true }
    );

    if (!result) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: String(result._id),
      symbol: result.symbol,
      company: result.company,
      alertName: result.alertName,
      alertType: result.alertType,
      threshold: result.threshold,
    });
  } catch (error) {
    console.error('Update alert error:', error);
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }
}
