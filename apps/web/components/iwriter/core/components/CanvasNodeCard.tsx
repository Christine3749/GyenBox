import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { CardData } from './CanvasCardData';
import { CanvasCardSolid } from './CanvasCardSolid';

export type { CardData } from './CanvasCardData';

export const CanvasNodeCard = memo(({ id, data, selected }: NodeProps) => {
  const d = data as CardData;
  return <CanvasCardSolid id={id} data={{ ...d, cardType: 'solid' }} selected={selected ?? false} />;
});

CanvasNodeCard.displayName = 'CanvasNodeCard';