'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { CONDITION_OPTIONS } from '@/lib/constants';

interface StockContext {
    symbol: string;
    company: string;
}

const conditionToAlertType = (condition: string): 'upper' | 'lower' => (condition === 'greater' ? 'upper' : 'lower');
const alertTypeToCondition = (alertType: 'upper' | 'lower') => (alertType === 'upper' ? 'greater' : 'less');

type AlertModalOwnProps = Omit<AlertModalProps, 'alertData'> & {
    stock?: StockContext;
    alertData?: Alert;
};

const AlertModal = ({ alertId, alertData, action = 'create', open, setOpen, stock }: AlertModalOwnProps) => {
    const isEdit = action === 'edit' && !!alertId;

    const symbol = alertData?.symbol || stock?.symbol || '';
    const company = alertData?.company || stock?.company || '';

    // Initial values are derived from props once per mount rather than synced via
    // an effect — the parent remounts this component (via a changing `key`) each
    // time it's opened for a different alert/stock, so these initializers always
    // see the right props for that instance.
    const [alertName, setAlertName] = useState(() => alertData?.alertName || (company ? `${company} Alert` : ''));
    const [condition, setCondition] = useState<'greater' | 'less'>(() =>
        alertData ? alertTypeToCondition(alertData.alertType) : 'greater'
    );
    const [threshold, setThreshold] = useState(() => (alertData?.threshold != null ? String(alertData.threshold) : ''));
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!symbol || !company) {
            toast.error('No stock selected for this alert');
            return;
        }
        if (!alertName.trim() || !threshold) {
            toast.error('Please fill in the alert name and target price');
            return;
        }

        setSubmitting(true);
        try {
            const body = {
                symbol,
                company,
                alertName: alertName.trim(),
                alertType: conditionToAlertType(condition),
                threshold: Number(threshold),
            };

            const res = await fetch(isEdit ? `/api/alerts/${alertId}` : '/api/alerts', {
                method: isEdit ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to save alert');
            }

            toast.success(isEdit ? 'Alert updated' : 'Alert created');
            window.dispatchEvent(new CustomEvent('alerts:changed'));
            setOpen(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to save alert');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="bg-gray-800 border-gray-600 text-gray-100 sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit Price Alert' : 'Create Price Alert'}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="form-label">Alert Name</Label>
                        <Input
                            value={alertName}
                            onChange={(e) => setAlertName(e.target.value)}
                            placeholder="e.g. Apple Inc Alert"
                            className="form-input"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="form-label">Stock</Label>
                        <Input value={`${symbol}${company ? ` — ${company}` : ''}`} disabled className="form-input opacity-70" />
                    </div>

                    <div className="space-y-2">
                        <Label className="form-label">Alert Type</Label>
                        <Input value="Price" disabled className="form-input opacity-70" />
                    </div>

                    <div className="space-y-2">
                        <Label className="form-label">Condition</Label>
                        <Select value={condition} onValueChange={(v) => setCondition(v as 'greater' | 'less')}>
                            <SelectTrigger className="select-trigger">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-600 text-gray-100">
                                {CONDITION_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value} className="focus:bg-gray-600 focus:text-gray-100">
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="form-label">Target Price (USD)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={threshold}
                            onChange={(e) => setThreshold(e.target.value)}
                            placeholder="e.g. 240.60"
                            className="form-input"
                        />
                    </div>

                    <Button onClick={handleSubmit} disabled={submitting} className="yellow-btn w-full">
                        {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Alert'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AlertModal;
