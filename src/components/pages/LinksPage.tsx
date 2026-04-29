'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { LinksPageConfig } from '@/types/page';

function initialsFor(name: string) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('');
}

export default function LinksPage({ config, embedded = false }: { config: LinksPageConfig; embedded?: boolean }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
        >
            <div className={embedded ? 'mb-4' : 'mb-8'}>
                <h1 className={`${embedded ? 'text-2xl' : 'text-4xl'} font-serif font-bold text-primary mb-4`}>{config.title}</h1>
                {config.description && (
                    <p className={`${embedded ? 'text-base' : 'text-lg'} text-neutral-600 dark:text-neutral-500 max-w-2xl leading-relaxed`}>
                        {config.description}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {config.items.map((item, idx) => (
                    <motion.a
                        key={idx}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.05 * idx }}
                        className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
                    >
                        <div className="flex-shrink-0 w-14 h-14 rounded-full overflow-hidden bg-accent/10 flex items-center justify-center">
                            {item.avatar ? (
                                <Image
                                    src={item.avatar}
                                    alt={item.name}
                                    width={56}
                                    height={56}
                                    className="object-cover w-full h-full"
                                />
                            ) : (
                                <span className="text-accent font-semibold text-lg">
                                    {initialsFor(item.name)}
                                </span>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="font-semibold text-primary truncate">{item.name}</div>
                            {item.affiliation && (
                                <div className="text-sm text-neutral-600 dark:text-neutral-500 truncate">{item.affiliation}</div>
                            )}
                            <div className="text-xs text-accent truncate">{item.url.replace(/^https?:\/\//, '')}</div>
                        </div>
                    </motion.a>
                ))}
            </div>
        </motion.div>
    );
}
