import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadCloud } from 'lucide-react';

interface DragOverlayProps {
  isDragging: boolean;
}

export default function DragOverlay({ isDragging }: DragOverlayProps) {
  return (
    <AnimatePresence>
      {isDragging && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 bg-[#07070E]/80 backdrop-blur-[2px] border-2 border-dashed border-[#7C6AF7] rounded-xl flex flex-col items-center justify-center gap-4 z-50 pointer-events-none select-none"
          id="drag-overlay"
        >
          {/* Animated bouncing upload icon */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            className="text-[#7C6AF7]"
          >
            <UploadCloud className="w-14 h-14" />
          </motion.div>

          <div className="text-center">
            <h3 className="font-sans font-bold text-[20px] text-[#EEEEF8]">
              Drop files anywhere
            </h3>
            <p className="font-sans text-[14px] text-[#8A8AA8] mt-1">
              or folders — we preserve the structure
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
