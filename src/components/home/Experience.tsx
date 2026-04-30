'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

export interface ExperienceItem {
  logo?: string;
  school: string;
  location?: string;
  date?: string;
  role?: string;
  major?: string;
  advisor?: string;
}

interface ExperienceProps {
  items: ExperienceItem[];
  title?: string;
}

export default function Experience({ items, title = 'Experience' }: ExperienceProps) {
  if (!items || items.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <h2 className="text-2xl font-serif font-bold text-primary mb-6">{title}</h2>
      <ul className="divide-y divide-neutral-200/60 dark:divide-neutral-700/40">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-center gap-8 sm:gap-12 py-5 sm:py-6">
            {item.logo && (
              <div className="flex-shrink-0 w-20 sm:w-28 flex items-center justify-center">
                <Image
                  src={item.logo}
                  alt={item.school}
                  width={112}
                  height={112}
                  className="object-contain max-h-16 sm:max-h-24 w-auto h-auto drop-shadow-sm"
                />
              </div>
            )}
            <div className="flex-1 min-w-0 text-neutral-700 dark:text-neutral-600 leading-relaxed">
              <h3 className="text-lg sm:text-xl font-bold text-primary mb-1">{item.school}</h3>
              {(item.location || item.date) && (
                <div className="flex justify-between items-baseline gap-3 text-sm text-neutral-500 dark:text-neutral-400 mb-2">
                  <span>{item.location}</span>
                  <span className="whitespace-nowrap">{item.date}</span>
                </div>
              )}
              {item.role && <p className="font-semibold mt-1">{item.role}</p>}
              {item.major && <p className="mt-1">{item.major}</p>}
              {item.advisor && <p className="mt-1">{item.advisor}</p>}
            </div>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}
