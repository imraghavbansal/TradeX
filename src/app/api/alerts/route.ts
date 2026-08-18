import { NextResponse } from 'next/server';
import { auth } from '@/lib/better-auth/auth';
import { connectToDatabase } from '../../../../database/mongoose';
import { AlertModel } from '../../../../database/models/alert.model';

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers as unknown as Headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectToDatabase();
    const alerts = await AlertModel.find({ userId: session.user.id }).sort({ createdAt: -1 }).lean();

    return NextResponse.json(
      alerts.map((a) => ({
        id: String(a._id),
        symbol: a.symbol,
        company: a.company,
        alertName: a.alertName,
        alertType: a.alertType,
        threshold: a.threshold,
      }))
    );
  } catch (error) {
    console.error('Get alerts error:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { symbol, company, alertName, alertType, threshold } = await request.json();

    if (!symbol || !company || !alertName || !alertType || threshold == null) {
      return NextResponse.json({ error: 'Missing required alert fields' }, { status: 400 });
    }
    if (alertType !== 'upper' && alertType !== 'lower') {
      return NextResponse.json({ error: 'Invalid alert type' }, { status: 400 });
    }

    const session = await auth.api.getSession({ headers: request.headers as unknown as Headers });
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectToDatabase();

    const alert = await AlertModel.create({
      userId: session.user.id,
      email: session.user.email,
      symbol: symbol.toUpperCase(),
      company,
      alertName,
      alertType,
      threshold: Number(threshold),
    });

    return NextResponse.json({
      id: String(alert._id),
      symbol: alert.symbol,
      company: alert.company,
      alertName: alert.alertName,
      alertType: alert.alertType,
      threshold: alert.threshold,
    });
  } catch (error) {
    console.error('Create alert error:', error);
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
  }
}
