'use client';

import { useState, useEffect } from 'react';

interface CountdownValues {
 days: number;
 hours: number;
 minutes: number;
 seconds: number;
 isExpired: boolean;
 isConfigured: boolean;
}

/**
 * Hook de contagem regressiva real baseada na data do evento.
 * Respeita o timezone configurado e retorna estado "não configurado"
 * quando a data ainda não foi definida (sem inventar datas fictícias).
 */
export function useCountdown(targetDate: string | null, timezone: string): CountdownValues {
 const [countdown, setCountdown] = useState<CountdownValues>({
 days: 0,
 hours: 0,
 minutes: 0,
 seconds: 0,
 isExpired: false,
 isConfigured: false,
 });

 useEffect(() => {
 if (!targetDate) {
 setCountdown(prev => ({ ...prev, isConfigured: false }));
 return;
 }

 const target = new Date(targetDate).getTime();

 const update = () => {
 const now = Date.now();
 const diff = target - now;

 if (diff <= 0) {
 setCountdown({
 days: 0,
 hours: 0,
 minutes: 0,
 seconds: 0,
 isExpired: true,
 isConfigured: true,
 });
 return;
 }

 setCountdown({
 days: Math.floor(diff / (1000 * 60 * 60 * 24)),
 hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
 minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
 seconds: Math.floor((diff % (1000 * 60)) / 1000),
 isExpired: false,
 isConfigured: true,
 });
 };

 update();
 const interval = setInterval(update, 1000);

 return () => clearInterval(interval);
 }, [targetDate, timezone]);

 return countdown;
}