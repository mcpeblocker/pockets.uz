'use client';

import { useEffect } from 'react';

interface TelegramLoginWidgetProps {
  botName: string;
  onAuth?: (user: any) => void;
}

export default function TelegramLoginWidget({ botName, onAuth }: TelegramLoginWidgetProps) {
  useEffect(() => {
    // Dynamically load Telegram widget script
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-auth-url', `${window.location.origin}/api/auth/telegram`);
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    const container = document.getElementById('telegram-login-container');
    if (container) {
      container.innerHTML = '';
      container.appendChild(script);
    }

    // If onAuth callback is provided, set up window callback
    if (onAuth) {
      (window as any).onTelegramAuth = onAuth;
    }

    return () => {
      if (container) {
        container.innerHTML = '';
      }
      if ((window as any).onTelegramAuth) {
        delete (window as any).onTelegramAuth;
      }
    };
  }, [botName, onAuth]);

  return (
    <div id="telegram-login-container" className="flex justify-center">
      {/* Telegram widget will be inserted here */}
    </div>
  );
}
