'use server';

import { connectToDatabase } from '../../../database/mongoose';
import { AlertModel } from '../../../database/models/alert.model';

export type ActiveAlert = {
  id: string;
  userId: string;
  email: string;
  symbol: string;
  company: string;
  alertName: string;
  alertType: 'upper' | 'lower';
  threshold: number;
};

export async function getAllActiveAlerts(): Promise<ActiveAlert[]> {
  try {
    await connectToDatabase();
    const items = await AlertModel.find().lean();
    return items.map((i) => ({
      id: String(i._id),
      userId: i.userId,
      email: i.email,
      symbol: i.symbol,
      company: i.company,
      alertName: i.alertName,
      alertType: i.alertType,
      threshold: i.threshold,
    }));
  } catch (err) {
    console.error('getAllActiveAlerts error:', err);
    return [];
  }
}

export async function deleteAlertById(id: string): Promise<void> {
  await connectToDatabase();
  await AlertModel.findByIdAndDelete(id);
}
