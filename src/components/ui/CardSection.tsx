import React from 'react';
import Card from './Card';

type CardSectionProps = {
  title: string;
  description?: string;
  rightAction?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export default function CardSection({
  title,
  description,
  rightAction,
  footer,
  children,
  className = '',
  contentClassName = '',
}: CardSectionProps) {
  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-6">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {rightAction ? <div className="shrink-0">{rightAction}</div> : null}
      </div>

      <div className={`mt-4 ${contentClassName}`}>{children}</div>

      {footer ? <div className="mt-4">{footer}</div> : null}
    </Card>
  );
}
