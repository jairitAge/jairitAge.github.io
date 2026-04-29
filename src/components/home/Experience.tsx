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
      <h2 className="text-2xl font-serif font-bold text-primary mb-4">{title}</h2>
      <ul className="space-y-6">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-4">
            {item.logo && (
              <div className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-white flex items-center justify-center">
                <Image
                  src={item.logo}
                  alt={item.school}
                  width={64}
                  height={64}
                  className="object-contain w-full h-full"
                />
              </div>
            )}
            <div className="text-neutral-700 dark:text-neutral-600 leading-relaxed">
              <div className="font-semibold text-primary">
                {item.school}
                {item.location && (
                  <span className="font-normal text-neutral-500 dark:text-neutral-400">
                    {' · '}
                    {item.location}
                  </span>
                )}
              </div>
              {item.date && <div className="text-sm text-neutral-500 dark:text-neutral-400">{item.date}</div>}
              {item.role && <div>{item.role}</div>}
              {item.major && (
                <div className="text-sm text-neutral-600 dark:text-neutral-500">{item.major}</div>
              )}
              {item.advisor && (
                <div className="text-sm text-neutral-600 dark:text-neutral-500">{item.advisor}</div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}
