import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  caption?: string;
}

interface Props {
  media: MediaItem[];
  initialIndex?: number;
  onClose: () => void;
}

export function MediaGallery({ media, initialIndex = 0, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const currentMedia = media[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
    setIsVideoPlaying(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1));
    setIsVideoPlaying(false);
  };

  const handleVideoClick = () => {
    const video = document.getElementById('gallery-video') as HTMLVideoElement;
    if (video) {
      if (isVideoPlaying) {
        video.pause();
      } else {
        video.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 z-50 flex flex-col"
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex justify-between items-center">
            <div className="text-white">
              <p className="text-sm font-medium">
                {currentIndex + 1} / {media.length}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-4 relative">
          {/* Previous Button */}
          {media.length > 1 && (
            <button
              onClick={goToPrevious}
              className="absolute left-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-colors z-10"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          {/* Media Display */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentMedia.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="max-w-full max-h-full flex items-center justify-center"
            >
              {currentMedia.type === 'image' ? (
                <img
                  src={currentMedia.url}
                  alt={currentMedia.caption || `Media ${currentIndex + 1}`}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg"
                />
              ) : (
                <div className="relative max-w-full max-h-[80vh]">
                  <video
                    id="gallery-video"
                    src={currentMedia.url}
                    className="max-w-full max-h-[80vh] object-contain rounded-lg"
                    controls={false}
                    onPlay={() => setIsVideoPlaying(true)}
                    onPause={() => setIsVideoPlaying(false)}
                    onEnded={() => setIsVideoPlaying(false)}
                  />
                  <button
                    onClick={handleVideoClick}
                    className="absolute inset-0 flex items-center justify-center group"
                  >
                    <div className={`w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all ${
                      isVideoPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
                    }`}>
                      {isVideoPlaying ? (
                        <Pause size={32} className="text-white" />
                      ) : (
                        <Play size={32} className="text-white ml-1" />
                      )}
                    </div>
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Next Button */}
          {media.length > 1 && (
            <button
              onClick={goToNext}
              className="absolute right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-colors z-10"
            >
              <ChevronRight size={28} />
            </button>
          )}
        </div>

        {/* Caption */}
        {currentMedia.caption && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-white text-center text-sm">{currentMedia.caption}</p>
          </div>
        )}

        {/* Thumbnails */}
        {media.length > 1 && (
          <div className="p-4 bg-black/50 backdrop-blur-sm overflow-x-auto">
            <div className="flex gap-2 justify-center">
              {media.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentIndex
                      ? 'border-blue-400 opacity-100'
                      : 'border-white/20 opacity-50 hover:opacity-75'
                  }`}
                >
                  {item.type === 'image' ? (
                    <img
                      src={item.url}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="relative w-full h-full">
                      <video
                        src={item.url}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play size={16} className="text-white" />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Compact Gallery Component for Posts
interface CompactGalleryProps {
  media: MediaItem[];
  className?: string;
}

export function CompactMediaGallery({ media, className = '' }: CompactGalleryProps) {
  const [showFullGallery, setShowFullGallery] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (media.length === 0) return null;

  const handleMediaClick = (index: number) => {
    setSelectedIndex(index);
    setShowFullGallery(true);
  };

  return (
    <>
      <div className={`grid gap-1 ${className}`}>
        {media.length === 1 && (
          <button
            onClick={() => handleMediaClick(0)}
            className="relative w-full aspect-square bg-black/20 overflow-hidden"
          >
            {media[0].type === 'image' ? (
              <img
                src={media[0].url}
                alt="Post media"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="relative w-full h-full">
                <video
                  src={media[0].url}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Play size={24} className="text-white ml-1" />
                  </div>
                </div>
              </div>
            )}
          </button>
        )}

        {media.length === 2 && (
          <div className="grid grid-cols-2 gap-1">
            {media.map((item, index) => (
              <button
                key={item.id}
                onClick={() => handleMediaClick(index)}
                className="relative aspect-square bg-black/20 overflow-hidden"
              >
                {item.type === 'image' ? (
                  <img
                    src={item.url}
                    alt={`Media ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="relative w-full h-full">
                    <video
                      src={item.url}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play size={20} className="text-white" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {media.length >= 3 && (
          <div className="grid grid-cols-2 gap-1">
            {media.slice(0, 4).map((item, index) => (
              <button
                key={item.id}
                onClick={() => handleMediaClick(index)}
                className="relative aspect-square bg-black/20 overflow-hidden"
              >
                {item.type === 'image' ? (
                  <img
                    src={item.url}
                    alt={`Media ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="relative w-full h-full">
                    <video
                      src={item.url}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play size={20} className="text-white" />
                    </div>
                  </div>
                )}

                {/* Show count on last image if more than 4 */}
                {index === 3 && media.length > 4 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <p className="text-white text-2xl font-bold">+{media.length - 4}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {showFullGallery && (
        <MediaGallery
          media={media}
          initialIndex={selectedIndex}
          onClose={() => setShowFullGallery(false)}
        />
      )}
    </>
  );
}
