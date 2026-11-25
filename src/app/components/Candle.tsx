import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  size?: number;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Candle({ size = 24, active = false, onClick, className = '' }: Props) {
  const [isLit, setIsLit] = useState(active);

  useEffect(() => {
    setIsLit(active);
  }, [active]);

  const handleClick = (e: React.MouseEvent) => {
    // Allow event to bubble so parent buttons can handle the click too
    if (onClick) onClick();
    if (!active) setIsLit(true); 
  };

  return (
    <div 
      onClick={handleClick}
      className={`relative flex flex-col items-center justify-end ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: size, height: size * 1.5 }}
      role="img"
      aria-label="Candle"
    >
      <div className="w-full h-2/3 bg-stone-300 rounded-sm relative shadow-sm overflow-hidden bg-gradient-to-r from-stone-200 via-stone-100 to-stone-300">
         {/* Wax drip detail */}
         <div className="absolute top-0 right-1 w-1/4 h-1/2 bg-stone-100 rounded-b-full opacity-50"></div>
      </div>
      
      {/* Wick */}
      <div className="absolute top-[30%] w-[2px] h-[4px] bg-stone-800"></div>

      {/* Flame */}
      <AnimatePresence>
        {isLit && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute top-[-10%] w-[60%] h-[50%]"
          >
            <motion.div 
              animate={{ 
                scale: [1, 1.1, 1, 0.95, 1],
                rotate: [-2, 2, -1, 1, -2],
              }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-full h-full bg-orange-400 rounded-full blur-[1px] shadow-[0_0_10px_2px_rgba(251,146,60,0.6)]"
              style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }}
            >
              <div className="absolute inset-1 bg-yellow-200 rounded-full blur-[1px]"></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
