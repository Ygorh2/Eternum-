import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, ChevronRight, Sparkles, Users, Star } from 'lucide-react';

interface Props {
  onFinish: () => void;
}

export function Onboarding({ onFinish }: Props) {
  const [currentScreen, setCurrentScreen] = useState(0);

  const screens = [
    {
      id: 0,
      title: "Memórias que vivem para sempre",
      subtitle: "Um lugar sagrado onde lembranças se tornam eternas",
      illustration: "stars"
    },
    {
      id: 1,
      title: "Crie memoriais para quem você ama",
      subtitle: "Preserve histórias, fotos e momentos especiais",
      illustration: "memorials"
    },
    {
      id: 2,
      title: "Compartilhe homenagens com família e amigos",
      subtitle: "Conecte-se com quem também guarda essas memórias no coração",
      illustration: "community"
    }
  ];

  const handleNext = () => {
    if (currentScreen < screens.length - 1) {
      setCurrentScreen(currentScreen + 1);
    } else {
      onFinish();
    }
  };

  const handleDotClick = (index: number) => {
    setCurrentScreen(index);
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden text-white bg-gradient-to-b from-[#0F172A] via-[#1E1B4B] to-[#312e81]">
      {/* Animated Background Stars */}
      <div className="absolute inset-0 z-0 opacity-40">
         {[...Array(50)].map((_, i) => (
           <motion.div 
             key={i}
             className="absolute bg-white rounded-full"
             initial={{ opacity: 0 }}
             animate={{ 
               opacity: [0.2, 0.8, 0.2],
               scale: [1, 1.2, 1]
             }}
             transition={{
               duration: 3 + Math.random() * 2,
               repeat: Infinity,
               delay: Math.random() * 3
             }}
             style={{
               top: `${Math.random() * 100}%`,
               left: `${Math.random() * 100}%`,
               width: `${1 + Math.random() * 2}px`,
               height: `${1 + Math.random() * 2}px`,
             }}
           />
         ))}
      </div>

      {/* Header - Fixed at top */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-12 pb-6 px-8 z-10 flex flex-col items-center"
      >
        <h1 className="text-3xl font-serif font-medium text-white tracking-widest">ETERNUM</h1>
      </motion.div>

      {/* Content Area - Swipeable */}
      <div className="flex-1 relative z-10 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="h-full flex flex-col items-center justify-center px-8 text-center"
          >
            {/* Illustration */}
            <div className="mb-8">
              {screens[currentScreen].illustration === "stars" && (
                <StarsIllustration />
              )}
              {screens[currentScreen].illustration === "memorials" && (
                <MemorialsIllustration />
              )}
              {screens[currentScreen].illustration === "community" && (
                <CommunityIllustration />
              )}
            </div>

            {/* Title & Subtitle */}
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-serif font-medium text-white mb-4 leading-tight max-w-sm"
            >
              {screens[currentScreen].title}
            </motion.h2>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-blue-100/60 text-base leading-relaxed max-w-xs font-light"
            >
              {screens[currentScreen].subtitle}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Dots */}
      <div className="z-10 flex justify-center gap-2 pb-6">
        {screens.map((screen, index) => (
          <button
            key={screen.id}
            onClick={() => handleDotClick(index)}
            className="group"
          >
            <div className={`h-2 rounded-full transition-all duration-300 ${
              index === currentScreen 
                ? 'w-8 bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.6)]' 
                : 'w-2 bg-white/30 group-hover:bg-white/50'
            }`} />
          </button>
        ))}
      </div>

      {/* Action Button */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="p-8 z-10"
      >
        <button 
          onClick={handleNext}
          className="w-full py-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-md border border-blue-400/30 hover:from-blue-500/30 hover:to-purple-500/30 text-white rounded-2xl font-medium transition-all shadow-[0_0_30px_rgba(96,165,250,0.2)] hover:shadow-[0_0_40px_rgba(96,165,250,0.4)] flex items-center justify-center gap-2 group"
        >
          <span className="text-lg">
            {currentScreen === screens.length - 1 ? 'Começar' : 'Próximo'}
          </span>
          {currentScreen === screens.length - 1 ? (
            <Heart size={20} className="text-pink-300 group-hover:scale-110 transition-transform" />
          ) : (
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          )}
        </button>

        {currentScreen < screens.length - 1 && (
          <button 
            onClick={onFinish}
            className="w-full mt-3 py-2 text-white/40 hover:text-white/60 text-sm font-light transition-colors"
          >
            Pular
          </button>
        )}
      </motion.div>
    </div>
  );
}

// Illustration Components

function StarsIllustration() {
  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Outer glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-transparent rounded-full blur-3xl"></div>
      
      {/* Stars constellation */}
      <div className="relative w-48 h-48">
        {/* Large center star */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          animate={{ 
            rotate: 360,
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            rotate: { duration: 20, repeat: Infinity, ease: "linear" },
            scale: { duration: 2, repeat: Infinity }
          }}
        >
          <Star size={48} className="text-amber-300 fill-amber-300 drop-shadow-[0_0_20px_rgba(252,211,77,0.8)]" />
        </motion.div>

        {/* Surrounding stars */}
        {[...Array(8)].map((_, i) => {
          const angle = (i * 360) / 8;
          const radius = 60;
          const x = Math.cos((angle * Math.PI) / 180) * radius;
          const y = Math.sin((angle * Math.PI) / 180) * radius;
          
          return (
            <motion.div
              key={i}
              className="absolute top-1/2 left-1/2"
              style={{
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
              }}
              animate={{ 
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1.2, 0.8]
              }}
              transition={{ 
                duration: 2 + (i * 0.2),
                repeat: Infinity,
                delay: i * 0.2
              }}
            >
              <Star 
                size={12 + (i % 3) * 4} 
                className="text-blue-200 fill-blue-200 drop-shadow-[0_0_8px_rgba(191,219,254,0.6)]" 
              />
            </motion.div>
          );
        })}

        {/* Shooting stars */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={`shooting-${i}`}
            className="absolute w-1 h-1 bg-white rounded-full"
            initial={{ 
              top: `${20 + i * 20}%`,
              left: '-10%',
              opacity: 0
            }}
            animate={{ 
              left: '110%',
              opacity: [0, 1, 0]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              delay: i * 2,
              repeatDelay: 4
            }}
            style={{
              boxShadow: '0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(255, 255, 255, 0.4)'
            }}
          />
        ))}
      </div>

      {/* Soft particles floating */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute w-2 h-2 bg-purple-300/40 rounded-full blur-sm"
          animate={{
            y: [0, -100, 0],
            x: [0, Math.random() * 40 - 20, 0],
            opacity: [0, 0.6, 0]
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            delay: i * 0.8
          }}
          style={{
            bottom: '0%',
            left: `${20 + i * 10}%`
          }}
        />
      ))}
    </div>
  );
}

function MemorialsIllustration() {
  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-pink-500/20 to-transparent rounded-full blur-3xl"></div>
      
      {/* Memorial cards stack */}
      <div className="relative">
        {/* Back card */}
        <motion.div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-52 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl"
          initial={{ rotate: -8, y: 20, scale: 0.9 }}
          animate={{ rotate: -8, y: 20, scale: 0.9 }}
        >
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-blue-400/30 to-purple-400/30 border-2 border-white/30"></div>
        </motion.div>

        {/* Middle card */}
        <motion.div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-52 bg-gradient-to-br from-white/15 to-white/8 backdrop-blur-md border border-white/30 rounded-2xl shadow-2xl"
          initial={{ rotate: 4, y: 10, scale: 0.95 }}
          animate={{ rotate: 4, y: 10, scale: 0.95 }}
        >
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-pink-400/30 to-orange-400/30 border-2 border-white/30"></div>
        </motion.div>

        {/* Front card - Animated */}
        <motion.div
          className="relative w-40 h-52 bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-md border border-white/40 rounded-2xl shadow-2xl overflow-hidden"
          animate={{ 
            y: [0, -8, 0],
            rotate: [0, 2, 0]
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {/* Avatar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-4 border-white/40 shadow-lg flex items-center justify-center">
            <Heart size={24} className="text-white fill-white" />
          </div>

          {/* Name placeholder */}
          <div className="absolute top-24 left-1/2 -translate-x-1/2 w-24 h-3 bg-white/30 rounded-full"></div>
          <div className="absolute top-28 left-1/2 -translate-x-1/2 w-16 h-2 bg-white/20 rounded-full"></div>

          {/* Decorative lines */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-28 space-y-2">
            <div className="h-2 bg-white/20 rounded-full"></div>
            <div className="h-2 bg-white/15 rounded-full w-20 mx-auto"></div>
          </div>

          {/* Sparkles */}
          <motion.div
            className="absolute top-6 right-6"
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles size={16} className="text-amber-300" />
          </motion.div>
        </motion.div>
      </div>

      {/* Floating photos around */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-12 h-12 rounded-lg bg-white/10 border border-white/20 backdrop-blur-sm"
          animate={{
            y: [0, -15, 0],
            rotate: [0, 10, 0]
          }}
          transition={{
            duration: 2.5 + i * 0.3,
            repeat: Infinity,
            delay: i * 0.5
          }}
          style={{
            top: `${30 + (i % 2) * 40}%`,
            left: i < 2 ? '5%' : 'auto',
            right: i >= 2 ? '5%' : 'auto'
          }}
        >
          <div className="w-full h-full rounded-lg bg-gradient-to-br from-blue-300/20 to-purple-300/20"></div>
        </motion.div>
      ))}
    </div>
  );
}

function CommunityIllustration() {
  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-blue-500/20 to-transparent rounded-full blur-3xl"></div>
      
      {/* Center heart */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
        animate={{ 
          scale: [1, 1.1, 1],
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
        }}
      >
        <div className="relative">
          <div className="absolute inset-0 bg-pink-500/30 rounded-full blur-2xl"></div>
          <Heart size={48} className="text-pink-400 fill-pink-400 drop-shadow-[0_0_20px_rgba(244,114,182,0.8)] relative z-10" />
        </div>
      </motion.div>

      {/* User avatars in circle */}
      {[...Array(6)].map((_, i) => {
        const angle = (i * 360) / 6;
        const radius = 70;
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius;
        
        return (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2"
            style={{
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: 1,
              opacity: 1,
            }}
            transition={{ 
              delay: i * 0.15,
              duration: 0.5,
              type: "spring"
            }}
          >
            <motion.div
              animate={{ 
                y: [0, -8, 0],
              }}
              transition={{ 
                duration: 2 + (i * 0.2),
                repeat: Infinity,
                delay: i * 0.3
              }}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400/40 to-purple-400/40 border-2 border-white/40 backdrop-blur-sm shadow-lg flex items-center justify-center"
            >
              <Users size={20} className="text-white" />
            </motion.div>
          </motion.div>
        );
      })}

      {/* Connection lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: 'scale(0.9)' }}>
        {[...Array(6)].map((_, i) => {
          const angle1 = (i * 360) / 6;
          const angle2 = ((i + 1) * 360) / 6;
          const radius = 70;
          
          const x1 = 128 + Math.cos((angle1 * Math.PI) / 180) * radius;
          const y1 = 128 + Math.sin((angle1 * Math.PI) / 180) * radius;
          const x2 = 128 + Math.cos((angle2 * Math.PI) / 180) * radius;
          const y2 = 128 + Math.sin((angle2 * Math.PI) / 180) * radius;
          
          return (
            <motion.line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth="1"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.3 }}
              transition={{ delay: 0.8 + (i * 0.1), duration: 0.5 }}
            />
          );
        })}
      </svg>

      {/* Floating hearts */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={`heart-${i}`}
          className="absolute"
          initial={{ 
            bottom: '10%',
            left: `${20 + i * 15}%`,
            opacity: 0,
            scale: 0
          }}
          animate={{ 
            y: [-200],
            opacity: [0, 1, 0],
            scale: [0, 1, 0.8]
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            delay: i * 0.6,
            repeatDelay: 1
          }}
        >
          <Heart size={12 + (i % 3) * 4} className="text-pink-300 fill-pink-300" />
        </motion.div>
      ))}

      {/* Sparkles */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={`sparkle-${i}`}
          className="absolute"
          style={{
            top: `${20 + i * 20}%`,
            left: i % 2 === 0 ? '10%' : '80%'
          }}
          animate={{ 
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
            rotate: [0, 180, 360]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            delay: i * 0.5
          }}
        >
          <Sparkles size={14} className="text-blue-300" />
        </motion.div>
      ))}
    </div>
  );
}